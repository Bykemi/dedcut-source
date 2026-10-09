// Voix chantée (v4.65) : correcteur de justesse et chœurs automatiques, calculés sur ce PC (rien n'est envoyé).
// 1. Hauteur de la voix 100 fois par seconde : YIN sur un son réduit (rapide), puis affinée sur le vrai son (précision de
//    quelques centièmes de demi-ton, il en faut pour corriger une note).
// 2. Note visée : la note de la gamme du morceau la plus proche du centre de la note chantée (le vibrato est gardé
//    en mode « Naturel ») ; « Fort » aplatit la moitié du vibrato ; « Robot » colle exactement à la note (effet à la mode).
// 3. Changement de hauteur sans changer la durée ni le timbre : PSOLA (des « grains » d'une période de voix, recollés
//    plus serrés ou plus écartés, calés sur les battements de la voix) ; les sons sans note (s, ch, souffle) restent tels quels.
// Les chœurs utilisent le même moteur : tierce / quinte au-dessus, octave en dessous, toujours dans la gamme du morceau.
import { SCALES } from './model';
import type { Chans } from './dsp';

const HOP = .01;
export interface Pitch { f0: Float32Array; hop: number; sr: number }

const monoOf = (ch: Chans) => { if (ch.length === 1) return ch[0]; const o = new Float32Array(ch[0].length); for (const c of ch) for (let i = 0; i < c.length; i++) o[i] += c[i] / ch.length; return o; };

/** hauteur (Hz, 0 = pas de note) toutes les 10 ms */
export function trackPitch(ch: Chans, sr: number): Pitch {
  const x = monoOf(ch), n = Math.floor(x.length / (sr * HOP)), f0 = new Float32Array(n);
  // son réduit vers ~12 kHz (moyenne de k échantillons : filtre simple contre le repliement)
  const k = Math.max(1, Math.round(sr / 12000)), sr2 = sr / k, y = new Float32Array(Math.floor(x.length / k));
  for (let i = 0; i < y.length; i++) { let s = 0; for (let j = 0; j < k; j++) s += x[i * k + j]; y[i] = s / k; }
  const fmin = 70, fmax = 1100, tmin = Math.floor(sr2 / fmax), tmax = Math.ceil(sr2 / fmin), W = tmax, d = new Float32Array(tmax + 1);
  // seuil d'énergie : 8 % du niveau habituel des passages forts
  const en = new Float32Array(n); for (let f = 0; f < n; f++) { const a = Math.floor(f * sr * HOP); let s = 0; for (let i = a; i < a + 512 && i < x.length; i++) s += x[i] * x[i]; en[f] = Math.sqrt(s / 512); }
  const sorted = Array.from(en).sort((a, b) => a - b), loud = sorted[Math.floor(sorted.length * .9)] || .1, thr = Math.max(.004, loud * .08);
  for (let f = 0; f < n; f++) {
    if (en[f] < thr) continue;
    const a = Math.floor(f * HOP * sr2); if (a + W + tmax >= y.length) break;
    for (let tau = 1; tau <= tmax; tau++) { let s = 0; for (let i = 0; i < W; i++) { const v = y[a + i] - y[a + i + tau]; s += v * v; } d[tau] = s; }
    let run = 0; for (let tau = 1; tau <= tmax; tau++) { run += d[tau]; d[tau] = d[tau] * tau / (run || 1); }
    let best = 0; for (let tau = tmin; tau < tmax; tau++) if (d[tau] < .15) { while (tau + 1 < tmax && d[tau + 1] < d[tau]) tau++; best = tau; break; }
    if (!best) continue;
    // affinage sur le vrai son : lag exact autour de best*k, puis parabole
    const L0 = best * k, a0 = Math.floor(f * HOP * sr), Wf = Math.min(L0 * 2, 2048), dd = (L: number) => { let s = 0; for (let i = 0; i < Wf; i++) { const v = x[a0 + i] - x[a0 + i + L]; s += v * v; } return s; };
    if (a0 + Wf + L0 + k + 2 >= x.length) continue;
    let bl = L0, bv = dd(L0); for (let L = L0 - k - 1; L <= L0 + k + 1; L++) { if (L < 2) continue; const v = dd(L); if (v < bv) { bv = v; bl = L; } }
    const l = dd(bl - 1), r = dd(bl + 1), den = l + r - 2 * bv, off = den > 0 ? Math.max(-.5, Math.min(.5, .5 * (l - r) / den)) : 0;
    f0[f] = sr / (bl + off);
  }
  // nettoyage : médiane sur 5 points (sauts d'octave isolés) ; notes de moins de 40 ms retirées
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (!f0[i]) continue; const w: number[] = []; for (let j = i - 2; j <= i + 2; j++) if (j >= 0 && j < n && f0[j]) w.push(f0[j]); w.sort((a, b) => a - b); m[i] = w[w.length >> 1]; }
  for (let i = 0; i < n;) { if (!m[i]) { i++; continue; } let j = i; while (j < n && m[j]) j++; if (j - i < 4) for (let q = i; q < j; q++) m[q] = 0; i = j; }
  return { f0: m, hop: HOP, sr };
}

const midiOf = (f: number) => 69 + 12 * Math.log2(f / 440);
/** note de la gamme la plus proche (key 0-11, scale = nom de SCALES) */
function snap(m: number, key: number, scale: string) {
  const sc = SCALES[scale] || SCALES.major; let best = Math.round(m), bd = 99;
  for (let o = -1; o <= 1; o++) for (const s of sc) { const base = Math.floor((m - key) / 12) * 12 + key + s + o * 12, dd = Math.abs(base - m); if (dd < bd) { bd = dd; best = base; } }
  return best;
}
/** note de la gamme `steps` degrés plus haut (ou plus bas si négatif) */
function scaleStep(note: number, steps: number, key: number, scale: string) {
  const sc = SCALES[scale] || SCALES.major, rel = ((note - key) % 12 + 12) % 12, oct = Math.floor((note - key) / 12);
  let idx = sc.indexOf(rel); if (idx < 0) idx = sc.findIndex(s => s > rel) - 1;
  const j = idx + steps, o2 = Math.floor(j / sc.length), r2 = ((j % sc.length) + sc.length) % sc.length;
  return key + (oct + o2) * 12 + sc[r2];
}
const avg = (a: Float32Array, w: number, mask?: Float32Array) => { const n = a.length, o = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) if (!mask || mask[j]) { s += a[j]; c++; } o[i] = c ? s / c : a[i]; } return o; };

/** demi-tons à ajouter à chaque instant (10 ms) pour corriger la justesse */
export function tuneCurve(P: Pitch, key: number, scale: string, style: 'natural' | 'strong' | 'robot'): Float32Array {
  const n = P.f0.length, m = new Float32Array(n), voiced = new Float32Array(n);
  for (let i = 0; i < n; i++) if (P.f0[i]) { m[i] = midiOf(P.f0[i]); voiced[i] = 1; }
  const center = avg(m, 8, voiced), sh = new Float32Array(n);
  const corr = style === 'natural' ? .85 : 1, flat = style === 'natural' ? 0 : style === 'strong' ? .5 : 1;
  let held = 0;
  for (let i = 0; i < n; i++) {
    if (!voiced[i]) { held = 0; continue; }
    // note visée, avec un peu d'hésitation pour ne pas sauter d'une note à l'autre entre deux notes
    const c = center[i], t = snap(c, key, scale);
    if (!held || Math.abs(c - held) > .65) held = t;
    sh[i] = corr * (held - c) + flat * (c - m[i]);
  }
  // transitions douces (sauf robot : les sauts nets font l'effet)
  return style === 'robot' ? sh : avg(sh, 3, voiced);
}
/** demi-tons à ajouter pour une voix de chœur (degrés de la gamme au-dessus / en dessous de la note chantée) */
export function harmonyCurve(P: Pitch, key: number, scale: string, steps: number, octave = 0): Float32Array {
  const n = P.f0.length, m = new Float32Array(n), voiced = new Float32Array(n), sh = new Float32Array(n);
  for (let i = 0; i < n; i++) if (P.f0[i]) { m[i] = midiOf(P.f0[i]); voiced[i] = 1; }
  const center = avg(m, 8, voiced);
  for (let i = 0; i < n; i++) if (voiced[i]) { const base = snap(center[i], key, scale); sh[i] = scaleStep(base, steps, key, scale) - base + octave * 12; }
  return avg(sh, 4, voiced);
}

/** change la hauteur (demi-tons, courbe toutes les 10 ms) sans changer la durée : PSOLA calé sur les battements de la voix */
export function psola(ch: Chans, sr: number, P: Pitch, shift: Float32Array, cents = 0): Chans {
  const n = ch[0].length, hopS = sr * P.hop, nf = P.f0.length;
  const fAt = (s: number) => P.f0[Math.min(nf - 1, Math.max(0, Math.floor(s / hopS)))];
  const rAt = (s: number) => Math.pow(2, (shift[Math.min(nf - 1, Math.max(0, Math.floor(s / hopS)))] + cents / 100) / 12);
  const x = monoOf(ch);
  // repères d'analyse : un par période dans la voix (au plus fort de chaque période), tous les 5 ms ailleurs
  const marks: number[] = [], per: number[] = [];
  let s = 0;
  while (s < n) {
    const f = fAt(s);
    if (f) {
      // début d'un passage chanté : premier repère sur le plus haut point de la période ; ensuite, exactement une période
      // plus loin à chaque fois (la hauteur mesurée est précise : les repères restent au même endroit de chaque vague)
      const T = sr / f, prevVoiced = per.length && per[per.length - 1] > 0;
      let best = s;
      if (!prevVoiced) { let bv = -Infinity; for (let i = Math.floor(s); i < Math.min(n, s + T); i++) if (x[i] > bv) { bv = x[i]; best = i; } }
      marks.push(best); per.push(T); s = best + T;
    } else { marks.push(s); per.push(0); s += sr * .005; }
  }
  const out = ch.map(() => new Float32Array(n)), ws = new Float32Array(n);
  // repères de synthèse : écart = période / rapport ; chacun reprend le grain du repère d'analyse le plus proche
  let ts = marks[0] || 0, k = 0;
  while (ts < n) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ts) <= Math.abs(marks[k] - ts)) k++;
    const ta = marks[k], T = per[k], voicedHere = T > 0, r = voicedHere ? rAt(ta) : 1, half = voicedHere ? Math.round(T) : Math.round(sr * .005);
    for (let j = -half; j <= half; j++) {
      const io = Math.round(ta) + j, oo = Math.round(ts) + j; if (io < 0 || io >= n || oo < 0 || oo >= n) continue;
      const w = .5 + .5 * Math.cos(Math.PI * j / (half + 1));
      for (let c = 0; c < ch.length; c++) out[c][oo] += ch[c][io] * w;
      ws[oo] += w;
    }
    ts += voicedHere ? T / r : sr * .005;
  }
  for (let c = 0; c < out.length; c++) { const o = out[c]; for (let i = 0; i < n; i++) o[i] = o[i] / Math.max(ws[i], 1); }
  return out;
}
/** décalage (en échantillons) et léger fondu : la voix de chœur arrive un poil après, comme une vraie personne */
export function delayCh(ch: Chans, samples: number): Chans {
  return ch.map(c => { const o = new Float32Array(c.length); o.set(c.subarray(0, c.length - samples), samples); return o; });
}
/** part de la voix chantée (pour dire à l'utilisateur si l'outil a trouvé des notes) */
export const voicedShare = (P: Pitch) => { let v = 0; for (const f of P.f0) if (f) v++; return P.f0.length ? v / P.f0.length : 0; };

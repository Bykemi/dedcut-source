// DedCut Musique — sons d'origine DedCut, fabriqués par le programme (aucun fichier extérieur, aucune licence tierce) :
// kits de batterie, instruments multi-échantillons, boucles. Le même identifiant redonne toujours le même son.
import type { Asset, Pad, Zone } from './model';
import { rng } from './model';

export const GEN_ORIGIN = 'DedCut';
export const GEN_LICENCE = 'original';
type Mono = Float32Array;

/* ---------- petits outils de synthèse hors temps réel ---------- */
function biq(x: Mono, sr: number, type: 'lp' | 'hp' | 'bp', f: number, q = .707): Mono {
  const w = 2 * Math.PI * Math.min(f, sr * .45) / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w); let b0 = 0, b1 = 0, b2 = 0;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al, o = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; o[i] = y; }
  return o;
}
const norm = (x: Mono, to = .89) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= to / m; return x; };
const sat = (x: Mono, k: number) => { for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * k) / Math.tanh(k); return x; };
const fadeEnd = (x: Mono, sr: number, ms = 4) => { const n = Math.min(x.length, Math.floor(sr * ms / 1000)); for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n; return x; };
const noise = (n: number, seed: number) => { const r = rng(seed), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = r() * 2 - 1; return o; };
function crush(x: Mono, bits: number, down: number) { const q = Math.pow(2, bits - 1); let h = 0; for (let i = 0; i < x.length; i++) { if (i % down === 0) h = Math.round(x[i] * q) / q; x[i] = h; } return x; }

/* ---------- sons de batterie ---------- */
function drum(kind: string, sr: number, P: Record<string, number>, seed: number): Mono {
  const g = (k: string, d: number) => P[k] ?? d;
  switch (kind) {
    case 'kick': case 'bass808': {
      const len = g('len', kind === 'kick' ? .45 : 1.4), n = Math.floor(sr * len), o = new Float32Array(n), f0 = g('f0', 160), f1 = g('f1', kind === 'kick' ? 48 : 45), sw = g('sweep', .045), dec = g('dec', kind === 'kick' ? .28 : 1);
      let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = f1 + (f0 - f1) * Math.exp(-t / sw); ph += 2 * Math.PI * f / sr; o[i] = Math.sin(ph) * Math.exp(-t / dec); }
      const cl = g('click', .5); if (cl > 0) { const c = biq(noise(Math.floor(sr * .006), seed), sr, 'hp', 2500); for (let i = 0; i < c.length; i++) o[i] += c[i] * cl * (1 - i / c.length); }
      return fadeEnd(norm(sat(o, g('drive', 1.4))), sr);
    }
    case 'snare': case 'snap': {
      const n = Math.floor(sr * g('len', .32)), o = new Float32Array(n), nz = biq(biq(noise(n, seed), sr, 'hp', g('nhp', 1200)), sr, 'lp', g('nlp', 9000)), tone = g('tone', 190), tn = g('tmix', kind === 'snap' ? .1 : .55);
      let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (tone * (1 + .4 * Math.exp(-t / .01))) / sr; o[i] = Math.sin(ph) * Math.exp(-t / .045) * tn + nz[i] * Math.exp(-t / g('ndec', kind === 'snap' ? .05 : .11)) * (1 - tn * .4); }
      return fadeEnd(norm(sat(o, g('drive', 1.2))), sr);
    }
    case 'clap': {
      const n = Math.floor(sr * .5), o = new Float32Array(n), nz = biq(noise(n, seed), sr, 'bp', g('bp', 1300), 1.4), offs = [0, .011, .022, .031];
      for (let i = 0; i < n; i++) { const t = i / sr; let e = 0; for (const s of offs) if (t >= s) e += Math.exp(-(t - s) / (s === offs[offs.length - 1] ? g('dec', .14) : .008)); o[i] = nz[i] * e; }
      return fadeEnd(norm(o), sr);
    }
    case 'hatC': case 'hatO': case 'ride': case 'crash': {
      // son métallique : six ondes carrées à des rapports non harmoniques, filtrées
      const len = kind === 'hatC' ? .12 : kind === 'hatO' ? .6 : kind === 'ride' ? 1.8 : 2.4, n = Math.floor(sr * len), o = new Float32Array(n), base = g('base', kind === 'ride' ? 330 : 400);
      const R = [1, 1.483, 1.932, 2.546, 2.630, 3.897], ph = R.map(() => 0), nz = noise(n, seed), nm = kind === 'crash' ? .6 : kind === 'ride' ? .15 : .3;
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < 6; j++) { ph[j] += base * R[j] / sr; s += (ph[j] % 1) < .5 ? 1 : -1; } o[i] = s / 6 * (1 - nm) + nz[i] * nm; }
      let f = biq(biq(o, sr, 'hp', g('hp', kind === 'ride' ? 5000 : 7000)), sr, 'bp', g('bp', kind === 'ride' ? 8000 : 10000), .6);
      const dec = g('dec', kind === 'hatC' ? .035 : kind === 'hatO' ? .25 : kind === 'ride' ? .6 : .9);
      for (let i = 0; i < n; i++) f[i] *= Math.exp(-i / sr / dec) * (kind === 'ride' ? 1 + .6 * Math.exp(-i / sr / .01) : 1);
      f = norm(f); return fadeEnd(f, sr);
    }
    case 'tomL': case 'tomM': case 'tomH': {
      const f1 = g('f', kind === 'tomL' ? 95 : kind === 'tomM' ? 140 : 200), n = Math.floor(sr * .6), o = new Float32Array(n), nz = biq(noise(n, seed), sr, 'lp', 3000);
      let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * f1 * (1 + .6 * Math.exp(-t / .04)) / sr; o[i] = Math.sin(ph) * Math.exp(-t / g('dec', .22)) + nz[i] * Math.exp(-t / .02) * .25; }
      return fadeEnd(norm(sat(o, 1.3)), sr);
    }
    case 'rim': {
      const n = Math.floor(sr * .08), o = new Float32Array(n); let a = 0, b = 0;
      for (let i = 0; i < n; i++) { const t = i / sr; a += 2 * Math.PI * 1700 / sr; b += 2 * Math.PI * 480 / sr; o[i] = (Math.sin(a) * .6 + Math.sin(b)) * Math.exp(-t / .012); }
      return fadeEnd(norm(biq(o, sr, 'hp', 300)), sr);
    }
    case 'shaker': {
      const n = Math.floor(sr * .16), nz = biq(noise(n, seed), sr, 'hp', 5000);
      for (let i = 0; i < n; i++) { const t = i / sr; nz[i] *= Math.min(1, t / .02) * Math.exp(-t / .04); }
      return fadeEnd(norm(nz, .6), sr);
    }
    case 'cowbell': {
      const n = Math.floor(sr * .5), o = new Float32Array(n); let a = 0, b = 0;
      for (let i = 0; i < n; i++) { const t = i / sr; a += 545 / sr; b += 815 / sr; o[i] = ((a % 1 < .5 ? 1 : -1) + (b % 1 < .5 ? 1 : -1)) * (Math.exp(-t / .03) * .7 + Math.exp(-t / .18) * .3); }
      return fadeEnd(norm(biq(o, sr, 'bp', 900, 1.2)), sr);
    }
    default: { // perc : petit son FM
      const n = Math.floor(sr * .25), o = new Float32Array(n), f = g('f', 620); let c = 0, m = 0;
      for (let i = 0; i < n; i++) { const t = i / sr; m += 2 * Math.PI * f * 1.41 / sr; c += 2 * Math.PI * f / sr + Math.sin(m) * 2.5 * Math.exp(-t / .03) * 2 * Math.PI * f / sr; o[i] = Math.sin(c) * Math.exp(-t / .07); }
      return fadeEnd(norm(o), sr);
    }
  }
}
export const PAD_KINDS = ['kick', 'snare', 'clap', 'hatC', 'hatO', 'tomL', 'tomM', 'tomH', 'rim', 'crash', 'ride', 'shaker', 'cowbell', 'perc', 'bass808', 'snap'];
/** kits : chaque kit règle différemment les mêmes recettes */
export const KITS: Record<string, { tags: string[]; v: Record<string, Record<string, number>>; post?: { bits: number; down: number } }> = {
  studio: { tags: ['acoustic', 'pop', 'rock'], v: { kick: { f0: 120, f1: 55, click: .7, dec: .22, drive: 1.1 }, snare: { tone: 200, tmix: .5, ndec: .14 }, hatC: { base: 430 }, tomL: { f: 100 }, tomM: { f: 150 }, tomH: { f: 210 } } },
  machine: { tags: ['hiphop', 'trap', 'electro'], v: { kick: { f0: 150, f1: 46, click: .2, dec: .4, drive: 1.6, len: .7 }, snare: { tone: 230, tmix: .35, ndec: .09 }, clap: { bp: 1150, dec: .18 }, bass808: { f0: 110, f1: 43, dec: 1.4, drive: 2.2, len: 1.8 } } },
  lofi: { tags: ['lofi', 'chill', 'boombap'], v: { kick: { f0: 110, f1: 50, click: .3, dec: .25, drive: 1.8 }, snare: { tone: 180, tmix: .45, ndec: .12, nlp: 5000 }, hatC: { base: 360, dec: .045 } }, post: { bits: 10, down: 2 } },
  electro: { tags: ['house', 'techno', 'edm'], v: { kick: { f0: 180, f1: 50, click: .9, dec: .3, drive: 2.4, sweep: .03 }, snare: { tone: 210, tmix: .3, ndec: .1, nhp: 1800 }, clap: { bp: 1500, dec: .2 }, hatC: { base: 470, dec: .03, hp: 8000 }, hatO: { base: 470 } } }
};
export const KIT_IDS = Object.keys(KITS);
const PAD_TAG: Record<string, string> = { kick: 'kick', bass808: 'bass', snare: 'snare', snap: 'snare', clap: 'clap', hatC: 'hat', hatO: 'hat', ride: 'cymbal', crash: 'cymbal', tomL: 'tom', tomM: 'tom', tomH: 'tom', rim: 'perc', shaker: 'perc', cowbell: 'perc', perc: 'perc' };

/* ---------- instruments multi-échantillons ---------- */
// piano électrique (FM 2 opérateurs) et corde pincée (Karplus-Strong), deux couches de vélocité
function msNote(kind: string, sr: number, p: number, hard: boolean, seed: number): Mono {
  const f = 440 * Math.pow(2, (p - 69) / 12);
  if (kind === 'epiano') {
    const len = Math.min(4, 2.6 + (60 - p) * .03), n = Math.floor(sr * len), o = new Float32Array(n), idx = hard ? 3.2 : 1.6; let c = 0, m = 0, t2 = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; m += 2 * Math.PI * f / sr; t2 += 2 * Math.PI * f * 14 / sr; const env = Math.exp(-t / (1.1 - Math.min(.6, (p - 48) * .01))); c += 2 * Math.PI * f / sr; o[i] = Math.sin(c + Math.sin(m) * idx * Math.exp(-t / .6)) * env + Math.sin(t2) * .08 * Math.exp(-t / .03) * (hard ? 1.6 : .7); }
    return fadeEnd(norm(o, hard ? .9 : .55), sr, 20);
  }
  if (kind === 'pad') {
    const len = 3, n = Math.floor(sr * len), o = new Float32Array(n), r = rng(seed), det = [-.11, -.04, .03, .09, .14], ph = det.map(() => r());
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < det.length; j++) { ph[j] += f * Math.pow(2, det[j] / 12) / sr; s += 2 * (ph[j] % 1) - 1; } o[i] = s / det.length; }
    const lp = biq(biq(o, sr, 'lp', Math.min(8000, f * (hard ? 10 : 6))), sr, 'lp', Math.min(9000, f * (hard ? 12 : 7)));
    return fadeEnd(norm(lp, hard ? .8 : .55), sr, 40);
  }
  // corde pincée : Karplus-Strong (algorithme du domaine public), longueur selon la note
  const len = Math.min(5, 2.2 + (60 - p) * .04), n = Math.floor(sr * len), o = new Float32Array(n), N = Math.max(2, Math.round(sr / f)), buf = noise(N, seed), damp = hard ? .996 : .993;
  const ex = biq(buf, sr, 'lp', hard ? 7000 : 3000); for (let i = 0; i < N; i++) buf[i] = ex[i];
  let k = 0; for (let i = 0; i < n; i++) { const a = buf[k], b = buf[(k + 1) % N]; o[i] = a; buf[k] = (a + b) * .5 * damp; k = (k + 1) % N; }
  return fadeEnd(norm(o, hard ? .85 : .55), sr, 30);
}
export const MULTIS: Record<string, { roots: number[]; tags: string[]; loop: boolean }> = {
  epiano: { roots: [36, 48, 60, 72, 84], tags: ['keys'], loop: false },
  pluck: { roots: [40, 52, 64, 76], tags: ['guitar', 'pluck'], loop: false },
  pad: { roots: [36, 48, 60, 72], tags: ['pad'], loop: true }
};
/** zones d'un instrument multi-échantillons généré */
export function multiZones(kind: string, sr: number): Zone[] {
  const m = MULTIS[kind]; if (!m) return []; const z: Zone[] = [];
  m.roots.forEach((root, i) => {
    const lo = i === 0 ? 0 : Math.ceil((m.roots[i - 1] + root) / 2), hi = i === m.roots.length - 1 ? 127 : Math.ceil((root + m.roots[i + 1]) / 2) - 1;
    for (const hard of [false, true]) z.push({ asset: `gen:ms/${kind}/${root}/${hard ? 'h' : 's'}`, root, lo, hi, vlo: hard ? 90 : 0, vhi: hard ? 127 : 89, tune: 0, gain: 0, loop: m.loop, ls: m.loop ? .5 : 0, le: m.loop ? 2.5 : 0, xf: m.loop ? .25 : 0 });
  });
  void sr; return z;
}

/* ---------- boucles (rendues à partir des kits) ---------- */
type LoopDef = { kit: string; bpm: number; bars: number; tags: string[]; hits: [string, number[]][] };
const S = (s: string) => s.split('').map((c, i) => c === 'x' ? i : -1).filter(i => i >= 0);
export const LOOPS: Record<string, LoopDef> = {
  'pop-120': { kit: 'studio', bpm: 120, bars: 1, tags: ['pop', 'drums'], hits: [['kick', S('x.......x.x.....')], ['snare', S('....x.......x...')], ['hatC', S('x.x.x.x.x.x.x.x.')]] },
  'trap-140': { kit: 'machine', bpm: 140, bars: 1, tags: ['trap', 'drums'], hits: [['kick', S('x......x..x.....')], ['clap', S('........x.......')], ['hatC', S('xxxxxxxxxxxxxxxx')], ['bass808', S('x......x..x.....')]] },
  'lofi-85': { kit: 'lofi', bpm: 85, bars: 1, tags: ['lofi', 'drums'], hits: [['kick', S('x.....x...x.....')], ['snare', S('....x.......x...')], ['hatC', S('x.x.x.x.x.x.x.x.')], ['shaker', S('..x...x...x...x.')]] },
  'house-124': { kit: 'electro', bpm: 124, bars: 1, tags: ['house', 'drums'], hits: [['kick', S('x...x...x...x...')], ['clap', S('....x.......x...')], ['hatO', S('..x...x...x...x.')], ['hatC', S('x.x.x.x.x.x.x.x.')]] }
};

/* ---------- catalogue et fabrication ---------- */
/** liste des sons d'origine DedCut (pour le navigateur et les projets) */
export function genCatalog(sr: number): Asset[] {
  const out: Asset[] = [], mk = (id: string, name: string, tags: string[], len: number, bpm = 0): Asset => ({ id, name, path: null, sr, ch: 1, len, hash: id, origin: GEN_ORIGIN, licence: GEN_LICENCE, tags, bpm, key: '' });
  for (const k of KIT_IDS) for (const pk of PAD_KINDS) out.push(mk(`gen:kit/${k}/${pk}`, `${k} ${pk}`, ['oneshot', 'drum', k, PAD_TAG[pk], ...KITS[k].tags], 0));
  for (const [id, l] of Object.entries(LOOPS)) out.push(mk(`gen:loop/${id}`, id, ['loop', ...l.tags], l.bars * 4 * 60 / l.bpm, l.bpm));
  return out;
}
const memo = new Map<string, Float32Array[]>();
/** fabrique le son d'un identifiant « gen:… » (mono ou stéréo) ; null si inconnu */
export function genSound(id: string, sr: number): Float32Array[] | null {
  const key = sr + '|' + id, c = memo.get(key); if (c) return c;
  const parts = id.split('/'); let out: Float32Array[] | null = null; const seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  if (parts[0] === 'gen:kit' && KITS[parts[1]] && PAD_KINDS.includes(parts[2])) {
    const kit = KITS[parts[1]]; let x = drum(parts[2], sr, kit.v[parts[2]] || {}, seed); if (kit.post) x = norm(crush(x, kit.post.bits, kit.post.down)); out = [x];
  } else if (parts[0] === 'gen:ms' && MULTIS[parts[1]]) {
    out = [msNote(parts[1], sr, +parts[2], parts[3] === 'h', seed)];
  } else if (parts[0] === 'gen:loop' && LOOPS[parts[1]]) {
    const L = LOOPS[parts[1]], step = 60 / L.bpm / 4, n = Math.floor(sr * L.bars * 4 * 60 / L.bpm), o = new Float32Array(n);
    for (const [pad, steps] of L.hits) { const s = genSound(`gen:kit/${L.kit}/${pad}`, sr)![0]; for (let b = 0; b < L.bars; b++) for (const st of steps) { const at = Math.floor((b * 16 + st) * step * sr), v = pad === 'hatC' && st % 4 ? .55 : .9; for (let i = 0; i < s.length && at + i < n; i++) o[at + i] += s[i] * v; } }
    out = [norm(o, .8)];
  }
  if (out) { if (memo.size > 400) memo.clear(); memo.set(key, out); }
  return out;
}
/** pads d'un kit (choke : charleston fermé / ouvert ensemble) */
export function kitPads(kit: string): Pad[] {
  return PAD_KINDS.map(k => ({ name: k, asset: `gen:kit/${kit}/${k}`, vol: k === 'bass808' ? -4 : k.startsWith('hat') || k === 'shaker' ? -6 : 0, pan: k === 'hatC' || k === 'hatO' ? .15 : k === 'tomL' ? -.25 : k === 'tomH' ? .25 : 0, tune: 0, choke: k === 'hatC' || k === 'hatO' ? 1 : 0, out: 0, decay: 0 }));
}

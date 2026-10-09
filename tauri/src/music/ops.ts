// DedCut Musique — opérations d'édition (sans toucher aux sons d'origine) : clips, notes, prises, sections, temps,
// découpe en tranches, groove, accords, idées générées. Toutes modifient le projet ; l'appelant enregistre l'historique.
import type { AudioClip, Clip, Groove, MidiClip, MidiData, Note, Pattern, PatternClip, Project, Track } from './model';
import { CHORDS, SCALES, b2s, clamp, clipEnd, clipLen, deepClone, midiOf, newMidi, newPattern, nid, rng, s2b } from './model';
import { transients, peak, type Chans } from './dsp';

/* ---------- clips ---------- */
export function findClip(p: Project, id: number): { t: Track; c: Clip } | null { for (const t of p.tracks) { const c = t.clips.find(x => x.id === id); if (c) return { t, c }; } return null; }
/** coupe un clip à la position b (temps) ; renvoie la partie droite */
export function splitClip(p: Project, t: Track, c: Clip, b: number): Clip | null {
  const end = clipEnd(p, c); if (b <= c.t + 1e-4 || b >= end - 1e-4) return null;
  if (c.kind === 'audio') {
    const rate = c.dur / Math.max(1e-6, b2s(p, end) - b2s(p, c.t)), cutSec = (b2s(p, b) - b2s(p, c.t)) * rate, r = deepClone(c);
    r.id = nid(p); r.t = b; // à l'envers : la gauche joue la fin du son
    if (c.rev) { r.dur = c.dur - cutSec; c.off = c.off + (c.dur - cutSec); c.dur = cutSec; } else { r.off = c.off + cutSec; r.dur = c.dur - cutSec; c.dur = cutSec; }
    c.fout = { len: .005, curve: 'lin' }; r.fin = { len: .005, curve: 'lin' }; t.clips.push(r); return r;
  }
  if (c.kind === 'pattern') { const r = deepClone(c); r.id = nid(p); r.t = b; r.len = end - b; r.off = (c.off || 0) + (b - c.t); c.len = b - c.t; t.clips.push(r); return r; }
  // MIDI : les deux parties deviennent indépendantes ; une note coupée est raccourcie à gauche et reprise à droite
  const md = midiOf(p, c.data); if (!md) return null; const rel = b - c.t + (c.off || 0);
  const left: Note[] = [], right: Note[] = [];
  for (const n of md.notes) { if (n.t < rel) { left.push({ ...n, d: Math.min(n.d, rel - n.t) }); if (n.t + n.d > rel + 1e-6) right.push({ ...n, id: nid(p), t: 0, d: n.t + n.d - rel }); } else right.push({ ...n, id: nid(p), t: n.t - rel }); }
  const lm = c.loop ? md : newMidi(p, left); if (!c.loop) { lm.cc = deepClone(md.cc); c.data = lm.id; }
  const rm = newMidi(p, c.loop ? deepClone(md.notes) : right); rm.cc = deepClone(md.cc);
  const r: MidiClip = { ...deepClone(c), id: nid(p), t: b, len: end - b, data: rm.id, off: c.loop ? ((c.off || 0) + (b - c.t)) : 0 }; c.len = b - c.t; t.clips.push(r); return r;
}
/** copie d'un clip à la position b ; linked = le contenu MIDI reste partagé (modifier l'un modifie l'autre) */
export function duplicateClip(p: Project, t: Track, c: Clip, b: number, linked = false): Clip {
  const x = deepClone(c); x.id = nid(p); x.t = b; if (x.kind !== 'pattern') x.take = undefined;
  if (x.kind === 'midi' && !linked) { const md = midiOf(p, c.kind === 'midi' ? c.data : -1); if (md) { const m = newMidi(p, md.notes.map(n => ({ ...n, id: nid(p) }))); m.cc = deepClone(md.cc); m.program = md.program; m.bank = md.bank; m.ch = md.ch; x.data = m.id; } }
  t.clips.push(x); return x;
}
/** nombre de clips qui partagent le même contenu MIDI */
export const linkCount = (p: Project, c: Clip) => c.kind !== 'midi' ? 1 : p.tracks.reduce((a, t) => a + t.clips.filter(x => x.kind === 'midi' && x.data === c.data).length + (t.pool || []).filter(x => x.kind === 'midi' && x.data === c.data).length, 0);
/** rend un clip lié indépendant */
export function unlinkClip(p: Project, c: MidiClip) { const md = midiOf(p, c.data); if (!md) return; const m = newMidi(p, md.notes.map(n => ({ ...n, id: nid(p) }))); m.cc = deepClone(md.cc); c.data = m.id; }
export function deleteClips(p: Project, ids: number[]) { const s = new Set(ids); for (const t of p.tracks) t.clips = t.clips.filter(c => !s.has(c.id)); gcMidi(p); }
/** supprime les contenus MIDI qui ne servent plus */
export function gcMidi(p: Project) { const used = new Set<number>(); for (const t of p.tracks) for (const c of [...t.clips, ...(t.pool || [])]) if (c.kind === 'midi') used.add(c.data); p.midi = p.midi.filter(m => used.has(m.id)); }
/** rogne le début d'un clip (le son ou les notes restent en place) */
export function trimStart(p: Project, c: Clip, b: number) {
  const end = clipEnd(p, c); b = Math.min(b, end - 1 / 64);
  if (c.kind === 'audio') { const rate = c.dur / Math.max(1e-6, b2s(p, end) - b2s(p, c.t)); let d = (b2s(p, b) - b2s(p, c.t)) * rate; d = Math.max(-c.off, Math.min(d, c.dur - .01)); if (!c.rev) c.off += d; c.dur -= d; c.t = c.warp ? c.t + d * (c.srcBpm || p.bpm) / 60 : s2b(p, b2s(p, c.t) + d / rate); return; }
  const d = b - c.t; c.off = Math.max(0, (c.off || 0) + d); c.t = b; c.len = Math.max(1 / 64, c.len - d);
}
/** rogne la fin d'un clip ; pour un son : jusqu'à la fin du fichier au maximum */
export function trimEnd(p: Project, c: Clip, b: number, srcLen?: number) {
  if (c.kind !== 'audio') { c.len = Math.max(1 / 64, b - c.t); return; }
  const end = clipEnd(p, c), rate = c.dur / Math.max(1e-6, b2s(p, end) - b2s(p, c.t)); let dur = (b2s(p, b) - b2s(p, c.t)) * rate;
  if (srcLen != null) dur = Math.min(dur, c.rev ? c.off + c.dur : srcLen - c.off);
  const old = c.dur; c.dur = Math.max(.01, dur); if (c.rev) c.off = Math.max(0, c.off + old - c.dur); // à l'envers : la fin du clip est le début du son
}
/** fondu enchaîné automatique entre clips audio qui se chevauchent sur une piste */
export function autoCrossfades(p: Project, t: Track) {
  const L = t.clips.filter((c): c is AudioClip => c.kind === 'audio' && !c.mute).sort((a, b) => a.t - b.t);
  for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1], ov = b2s(p, clipEnd(p, a)) - b2s(p, b.t); if (ov > .002) { a.fout = { len: ov, curve: 'scurve' }; b.fin = { len: ov, curve: 'scurve' }; } }
}
/** gain de clip pour que le pic atteigne target dB (normalisation non destructive) */
export function normalizeGain(ch: Chans, sr: number, c: AudioClip, target = -1): number {
  const a = Math.floor(c.off * sr), n = Math.floor(c.dur * sr), pk = peak(ch.map(x => x.subarray(a, a + n)));
  return pk > 1e-6 ? clamp(target - 20 * Math.log10(pk), -24, 48) : 0;
}
/** découpe un clip audio en ne gardant que les passages sonores (suppression des silences) */
export function stripSilence(p: Project, t: Track, c: AudioClip, regions: [number, number][]): AudioClip[] {
  const out: AudioClip[] = [], rate = c.dur / Math.max(1e-6, b2s(p, clipEnd(p, c)) - b2s(p, c.t));
  for (const [a, b] of regions) {
    const sa = Math.max(c.off, a), sb = Math.min(c.off + c.dur, b); if (sb - sa < .02) continue;
    const x: AudioClip = { ...deepClone(c), id: nid(p), off: sa, dur: sb - sa, t: s2b(p, b2s(p, c.t) + (sa - c.off) / rate), fin: { len: .005, curve: 'lin' }, fout: { len: .02, curve: 'lin' } };
    if (c.warp) x.t = c.t + (sa - c.off) * (c.srcBpm || p.bpm) / 60; out.push(x);
  }
  t.clips = t.clips.filter(x => x.id !== c.id).concat(out); return out;
}

/* ---------- comping : choisir quelle prise joue sur une plage ---------- */
export function compSelect(p: Project, t: Track, takeId: number, a: number, b: number) {
  for (const c of [...t.clips]) if (c.kind === 'audio' && c.take && c.t < b && clipEnd(p, c) > a) { const r = splitClip(p, t, c, b); void r; const m = splitClip(p, t, c, a); void m; }
  for (const c of t.clips) if (c.kind === 'audio' && c.take) { const mid = (c.t + clipEnd(p, c)) / 2; if (mid > a && mid < b) c.mute = c.take !== takeId; }
  // les morceaux d'une même prise découpés gardent leur numéro de prise ; fondus courts aux jonctions
  for (const c of t.clips) if (c.kind === 'audio' && c.take && !c.mute && c.t < b && clipEnd(p, c) > a) { c.fin = { len: .01, curve: 'scurve' }; c.fout = { len: .01, curve: 'scurve' }; }
}

/* ---------- notes ---------- */
export interface QOpts { grid: number; strength: number; swing: number; ends: boolean }
/** quantification : rapproche les notes de la grille (force 0..1, swing sur les temps pairs) ; l'original est gardé */
export function quantize(md: MidiData, sel: Set<number> | null, o: QOpts) {
  if (!md.orig) md.orig = deepClone(md.notes);
  for (const n of md.notes) {
    if (sel && !sel.has(n.id)) continue; const k = Math.round(n.t / o.grid), target = k * o.grid + (k % 2 ? o.swing * o.grid * .5 : 0);
    const nt = n.t + (target - n.t) * o.strength; if (o.ends) { const e = n.t + n.d, ke = Math.max(k + 1, Math.round(e / o.grid)) * o.grid; n.d = Math.max(o.grid / 4, (e + (ke - e) * o.strength) - nt); } n.t = Math.max(0, nt);
  }
}
/** humanisation reproductible (même graine = même résultat) ; l'original est gardé */
export function humanize(md: MidiData, sel: Set<number> | null, timing: number, vel: number, seed: number) {
  if (!md.orig) md.orig = deepClone(md.notes); const r = rng(seed);
  for (const n of md.notes) { if (sel && !sel.has(n.id)) continue; const a = (r() * 2 - 1) * timing, b = (r() * 2 - 1) * vel; n.t = Math.max(0, n.t + a); n.v = clamp(Math.round(n.v + b), 1, 127); }
}
export function restoreOriginal(md: MidiData) { if (md.orig) { md.notes = deepClone(md.orig); md.orig = null; } }
export function transpose(md: MidiData, sel: Set<number> | null, semi: number) { for (const n of md.notes) if (!sel || sel.has(n.id)) n.p = clamp(n.p + semi, 0, 127); }
/** ramène les notes dans la gamme du projet (la plus proche) */
export function toScale(p: Project, md: MidiData, sel: Set<number> | null) {
  const sc = SCALES[p.scale] || SCALES.major;
  for (const n of md.notes) { if (sel && !sel.has(n.id)) continue; for (let d = 0; d < 6; d++) { if (sc.includes(((n.p - p.key + d) % 12 + 12) % 12)) { n.p += d; break; } if (sc.includes(((n.p - p.key - d) % 12 + 12) % 12)) { n.p -= d; break; } } }
}
/** renversement d'accord : la note la plus grave monte d'une octave (ou la plus aiguë descend) */
export function invert(md: MidiData, sel: Set<number>, up = true) {
  const ns = md.notes.filter(n => sel.has(n.id)); if (ns.length < 2) return; ns.sort((a, b) => a.p - b.p); if (up) ns[0].p += 12; else ns[ns.length - 1].p -= 12;
}
export function legato(md: MidiData, sel: Set<number> | null) { const ns = md.notes.filter(n => !sel || sel.has(n.id)).sort((a, b) => a.t - b.t); for (let i = 0; i < ns.length; i++) { const nx = ns.slice(i + 1).find(x => x.t > ns[i].t + 1e-6); if (nx) ns[i].d = nx.t - ns[i].t; } }
export function velocity(md: MidiData, sel: Set<number> | null, f: (n: Note, i: number, all: Note[]) => number) { const ns = md.notes.filter(n => !sel || sel.has(n.id)).sort((a, b) => a.t - b.t); ns.forEach((n, i) => { n.v = clamp(Math.round(f(n, i, ns)), 1, 127); }); }
/** ajoute un accord (nom explicite : Do majeur, La mineur 7…) */
export function addChord(p: Project, md: MidiData, root: number, q: string, t: number, d: number, v = 96, inv = 0): Note[] {
  const iv = CHORDS[q] || CHORDS.maj, ps = iv.map(x => root + x); for (let i = 0; i < inv; i++) { ps.sort((a, b) => a - b); ps.push(ps.shift()! + 12); }
  const ns = ps.map(pp => ({ id: nid(p), p: clamp(pp, 0, 127), t, d, v })); md.notes.push(...ns); return ns;
}

/* ---------- temps et sections ---------- */
/** insère (len > 0) ou retire (len < 0) du temps à partir de la position b : clips, repères, tempo, accords, automation suivent */
export function shiftTime(p: Project, b: number, len: number) {
  const mv = (x: number) => (x >= b - 1e-9 ? x + len : x);
  // insertion au milieu d'un clip : il est coupé à cet endroit, sa seconde moitié part avec la suite
  if (len > 0) for (const t of p.tracks) for (const c of [...t.clips]) if (c.t < b - 1e-9 && clipEnd(p, c) > b + 1e-9) splitClip(p, t, c, b);
  // retrait : les clips qui commencent dans l'espace retiré disparaissent AVANT le décalage
  // (après, on aurait effacé ceux qu'on vient de ramener dans cet espace : le refrain qui suivait une section supprimée)
  if (len < 0) {
    const a = b + len, out = (x: number) => x >= a - 1e-9 && x < b - 1e-9;
    for (const t of p.tracks) { t.clips = t.clips.filter(c => !out(c.t)); for (const l of t.auto) l.pts = l.pts.filter(pt => !out(pt.t)); }
    for (const l of p.master.auto || []) l.pts = l.pts.filter(pt => !out(pt.t)); p.tempo = p.tempo.filter(tp => tp.t === 0 || !out(tp.t));
  }
  for (const t of p.tracks) { for (const c of t.clips) if (c.t >= b - 1e-9) c.t = Math.max(0, c.t + len); for (const l of t.auto) for (const pt of l.pts) pt.t = mv(pt.t); }
  for (const m of p.markers) m.t = mv(m.t); for (const ch of p.chords) ch.t = mv(ch.t); for (const tp of p.tempo) if (tp.t > 0) tp.t = mv(tp.t);
  for (const l of p.master.auto || []) for (const pt of l.pts) pt.t = mv(pt.t);
}
/** copie de tout ce qui commence dans [a, b) vers la position dest (les clips qui dépassent sont coupés) ; insère la place si insert */
export function copyRange(p: Project, a: number, b: number, dest: number, insert = true) {
  const len = b - a; const items: { t: Track; c: Clip }[] = [];
  for (const t of p.tracks) for (const c of t.clips) if (c.t < b && clipEnd(p, c) > a) items.push({ t, c });
  const marks = p.markers.filter(m => m.t >= a && m.t < b).map(m => deepClone(m)), chords = p.chords.filter(c => c.t >= a && c.t < b).map(c => deepClone(c));
  const autos = p.tracks.map(t => t.auto.map(l => l.pts.filter(pt => pt.t >= a && pt.t < b).map(pt => ({ ...pt }))));
  // les copies sont préparées AVANT de faire de la place : sinon, quand la destination est avant la section,
  // le décalage déplaçait aussi les originaux et la copie était rognée à presque rien
  const made = items.map(({ t, c }) => {
    const x = duplicateClip(p, t, c, c.t, c.kind === 'midi'); // contenu partagé : la section copiée reste liée
    t.clips = t.clips.filter(y => y !== x);
    if (x.t < a) trimStart(p, x, a); if (clipEnd(p, x) > b) trimEnd(p, x, b);
    if (x.kind === 'audio' && x.mute && c.kind === 'audio' && !c.mute) x.mute = false;
    return { t, x };
  });
  if (insert) shiftTime(p, dest, len);
  for (const { t, x } of made) { x.t = x.t - a + dest; t.clips.push(x); }
  for (const m of marks) p.markers.push({ ...m, id: nid(p), t: m.t - a + dest }); for (const c of chords) p.chords.push({ ...c, t: c.t - a + dest });
  p.tracks.forEach((t, i) => t.auto.forEach((l, j) => { for (const pt of autos[i][j]) l.pts.push({ t: pt.t - a + dest, v: pt.v }); l.pts.sort((x, y) => x.t - y.t); }));
}
/** déplace une section complète (tout ce qu'elle contient) vers dest */
export function moveRange(p: Project, a: number, b: number, dest: number) {
  if (dest >= a && dest <= b) return; const len = b - a; copyRange(p, a, b, dest, true);
  const na = dest < a ? a + len : a, nb = na + len; deleteRange(p, na, nb);
}
/** supprime une section et resserre la suite */
export function deleteRange(p: Project, a: number, b: number) {
  for (const t of p.tracks) { for (const c of [...t.clips]) { if (c.t < b && clipEnd(p, c) > a) { if (c.t >= a && clipEnd(p, c) <= b) t.clips = t.clips.filter(x => x !== c); else { if (c.t < a) { const r = splitClip(p, t, c, a); if (r && clipEnd(p, r) > b) { const r2 = splitClip(p, t, r, b); void r2; t.clips = t.clips.filter(x => x !== r); } else if (r) t.clips = t.clips.filter(x => x !== r); } else { const r = splitClip(p, t, c, b); void r; t.clips = t.clips.filter(x => x !== c); } } } } for (const l of t.auto) l.pts = l.pts.filter(pt => pt.t < a || pt.t >= b); }
  p.markers = p.markers.filter(m => m.t < a || m.t >= b); p.chords = p.chords.filter(c => c.t < a || c.t >= b); shiftTime(p, b, -(b - a)); gcMidi(p);
}
/** plages des sections (repères de type section) */
export function sections(p: Project, end: number): { name: string; a: number; b: number; id: number; color: string }[] {
  const S = p.markers.filter(m => m.kind === 'section').sort((x, y) => x.t - y.t); return S.map((m, i) => ({ name: m.name, a: m.t, b: S[i + 1]?.t ?? Math.max(end, m.t + 4), id: m.id, color: m.color }));
}
/** fin du morceau (dernier clip) */
export function songEnd(p: Project): number { let e = 0; for (const t of p.tracks) for (const c of t.clips) if (!c.mute) e = Math.max(e, clipEnd(p, c)); return e; }

/* ---------- accroche (aimant) ---------- */
export function snapTo(p: Project, b: number, grid: number, extra: number[] = []): number {
  let best = Math.round(b / grid) * grid, bd = Math.abs(best - b);
  for (const x of [...p.markers.map(m => m.t), ...extra]) { const d = Math.abs(x - b); if (d < bd && d < grid * .5) { best = x; bd = d; } }
  return Math.max(0, best);
}

/* ---------- boucles : tranches et groove ---------- */
/** tranches d'une boucle aux attaques : [début, fin] en secondes */
export function sliceRegions(ch: Chans, sr: number, sens: number): [number, number][] {
  const n = ch[0].length / sr, cuts = [0, ...transients(ch, sr, sens).filter(t => t > .03 && t < n - .03), n]; const out: [number, number][] = [];
  for (let i = 0; i < cuts.length - 1; i++) if (cuts[i + 1] - cuts[i] > .03) out.push([cuts[i], cuts[i + 1]]); return out.slice(0, 64);
}
/** groove d'une boucle : écart de chaque attaque à la double croche la plus proche, et son niveau relatif */
export function extractGroove(ch: Chans, sr: number, bpm: number, steps = 16, name = 'groove'): Groove {
  const sl = 60 / bpm / 4, on = transients(ch, sr, .55), off = new Array(steps).fill(0), vel = new Array(steps).fill(1), cnt = new Array(steps).fill(0), lv = new Array(steps).fill(0);
  const m = ch[0]; let mx = 1e-9;
  for (const t of on) { const k = Math.round(t / sl), i = ((k % steps) + steps) % steps, d = (t - k * sl) / sl; if (Math.abs(d) > .45) continue; off[i] += d; cnt[i]++; let pk = 0; for (let j = Math.floor(t * sr); j < Math.min(m.length, Math.floor((t + .03) * sr)); j++) pk = Math.max(pk, Math.abs(m[j])); lv[i] += pk; mx = Math.max(mx, pk); }
  for (let i = 0; i < steps; i++) if (cnt[i]) { off[i] = +(off[i] / cnt[i]).toFixed(3); vel[i] = +clamp(lv[i] / cnt[i] / mx * 1.2, .3, 1.2).toFixed(2); }
  return { name, off, vel };
}
export const GROOVES: Groove[] = [
  { name: 'straight', off: new Array(16).fill(0), vel: new Array(16).fill(1) },
  { name: 'shuffle', off: Array.from({ length: 16 }, (_, i) => i % 2 ? .33 : 0), vel: Array.from({ length: 16 }, (_, i) => i % 2 ? .8 : 1) },
  { name: 'laidback', off: Array.from({ length: 16 }, (_, i) => i % 4 === 2 ? .12 : i % 2 ? .2 : 0), vel: Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 1.1 : i % 2 ? .75 : .9) },
  { name: 'push', off: Array.from({ length: 16 }, (_, i) => i % 2 ? -.08 : 0), vel: Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 1.1 : .9) }
];

/* ---------- harmonie : accords de la tonalité, suggestions (règles musicales simples, rien d'aléatoire caché) ---------- */
export function diatonic(key: number, scale: string): { root: number; q: string; deg: string }[] {
  const sc = SCALES[scale] || SCALES.major; if (sc.length !== 7) return [];
  const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  return sc.map((iv, i) => { const third = (sc[(i + 2) % 7] - iv + 12) % 12, fifth = (sc[(i + 4) % 7] - iv + 12) % 12, q = third === 4 ? (fifth === 8 ? 'aug' : 'maj') : (fifth === 6 ? 'dim' : 'min'); return { root: (key + iv) % 12, q, deg: q === 'maj' || q === 'aug' ? R[i] : R[i].toLowerCase() + (q === 'dim' ? '°' : '') }; });
}
export const PROGRESSIONS: Record<string, number[]> = { pop: [0, 4, 5, 3], ballad: [0, 5, 3, 4], doowop: [0, 5, 3, 4], minorPop: [5, 3, 0, 4], jazz: [1, 4, 0, 0], epic: [5, 3, 0, 4], blues: [0, 0, 3, 0, 4, 3, 0, 4], canon: [0, 4, 5, 2, 3, 0, 3, 4], sad: [5, 4, 3, 4] };
/** accords suivants possibles après un accord (degrés) : enchaînements fréquents */
export function nextChords(deg: number): number[] { const M: Record<number, number[]> = { 0: [3, 4, 5, 1], 1: [4, 6], 2: [5, 3], 3: [4, 0, 1], 4: [0, 5], 5: [3, 1, 4], 6: [0, 2] }; return M[deg] || [0]; }

/* ---------- idées générées par règles (algorithmes de DedCut, graine reproductible ; pas d'apprentissage, pas d'envoi) ---------- */
export function genDrumPattern(p: Project, style: string, seed: number, pads = 16): Pattern {
  const pat = newPattern(p, style, pads, 16), r = rng(seed), on = (row: number, steps: number[], v = 100) => { for (const s of steps) { const c = pat.rows[row]?.cells[s]; if (c) { c.on = true; c.v = v; } } };
  if (style === 'trap') { on(0, [0, 7, 10]); on(2, [8]); on(3, Array.from({ length: 16 }, (_, i) => i), 80); for (let i = 0; i < 16; i++) if (r() < .25) pat.rows[3].cells[i].rat = 2 + (r() < .3 ? 1 : 0); }
  else if (style === 'house') { on(0, [0, 4, 8, 12]); on(2, [4, 12]); on(4, [2, 6, 10, 14], 90); on(3, [0, 2, 4, 6, 8, 10, 12, 14], 70); }
  else if (style === 'boombap') { on(0, [0, 7, 10]); on(1, [4, 12]); on(3, [0, 2, 4, 6, 8, 10, 12, 14], 75); pat.swing = .35; }
  else if (style === 'rock') { on(0, [0, 8, 10]); on(1, [4, 12], 110); on(3, [0, 2, 4, 6, 8, 10, 12, 14], 85); }
  else { on(0, [0, 8]); on(1, [4, 12]); on(3, [0, 2, 4, 6, 8, 10, 12, 14], 80); }
  // variations : quelques coups en plus, avec probabilité (même graine = même pattern)
  for (let i = 0; i < 3; i++) { const s = Math.floor(r() * 16), row = [0, 3, 11][i]; const c = pat.rows[row]?.cells[s]; if (c && !c.on) { c.on = true; c.v = 60 + Math.floor(r() * 30); c.prob = .5; } }
  pat.seed = seed; return pat;
}
export function genChordNotes(p: Project, prog: number[], bars: number, oct = 4, seed = 1): Note[] {
  const dia = diatonic(p.key, p.scale), out: Note[] = []; if (!dia.length) return out; const r = rng(seed); const per = bars * 4 / prog.length;
  prog.forEach((d, i) => { const ch = dia[d % 7], root = 12 * (oct + 1) + ch.root, inv = Math.floor(r() * 2); const iv = (CHORDS[ch.q] || CHORDS.maj).map(x => root + x); for (let k = 0; k < inv; k++) { iv.sort((a, b) => a - b); iv.push(iv.shift()! + 12); } for (const pp of iv) out.push({ id: nid(p), p: pp, t: i * per, d: per * .95, v: 80 }); });
  return out;
}
export function genBass(p: Project, prog: number[], bars: number, seed = 1): Note[] {
  const dia = diatonic(p.key, p.scale), out: Note[] = [], r = rng(seed), per = bars * 4 / prog.length; if (!dia.length) return out;
  prog.forEach((d, i) => { const root = 36 + dia[d % 7].root; for (let b = 0; b < per; b += .5) { if (b > 0 && r() < .35) continue; const oct = r() < .15 ? 12 : 0, fifth = r() < .15 ? 7 : 0; out.push({ id: nid(p), p: root + oct + fifth, t: i * per + b, d: .45, v: b % 1 === 0 ? 100 : 80 }); } });
  return out;
}
export function genMelody(p: Project, prog: number[], bars: number, seed = 1): Note[] {
  const sc = SCALES[p.scale] || SCALES.major, dia = diatonic(p.key, p.scale), r = rng(seed), out: Note[] = [], per = bars * 4 / prog.length; if (!dia.length) return out;
  const pitches: number[] = []; for (let o = 5; o <= 6; o++) for (const iv of sc) pitches.push(12 * (o + 1) + p.key + iv - 12);
  let idx = Math.floor(pitches.length / 2), t = 0;
  while (t < bars * 4) {
    const chord = dia[prog[Math.min(prog.length - 1, Math.floor(t / per))] % 7], tones = (CHORDS[chord.q] || CHORDS.maj).map(x => (chord.root + x) % 12);
    const d = [.5, .5, 1, .25, .75, 1.5][Math.floor(r() * 6)], step = Math.round((r() - .5) * 4); idx = clamp(idx + step, 0, pitches.length - 1);
    // sur un temps fort, on préfère une note de l'accord
    if (t % 1 === 0) for (let k = 0; k < 3 && !tones.includes(pitches[idx] % 12); k++) idx = clamp(idx + (r() < .5 ? 1 : -1), 0, pitches.length - 1);
    if (r() > .12) out.push({ id: nid(p), p: pitches[idx], t, d: d * .9, v: 70 + Math.floor(r() * 40) }); t += d;
  }
  return out;
}
/** clip MIDI à partir de notes */
export function midiClipFrom(p: Project, t: Track, notes: Note[], at: number, len: number, name: string): MidiClip { const md = newMidi(p, notes); const c: MidiClip = { kind: 'midi', id: nid(p), name, t: at, len, data: md.id, color: '', loop: false }; t.clips.push(c); return c; }
export function patternClip(p: Project, t: Track, pat: Pattern, at: number, len: number): PatternClip { const c: PatternClip = { kind: 'pattern', id: nid(p), name: pat.name, t: at, len, pat: pat.id, color: '' }; t.clips.push(c); return c; }
export { clipLen };

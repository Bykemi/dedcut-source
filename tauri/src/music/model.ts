// DedCut Musique — modèle du projet : pistes, clips audio et MIDI, motifs de batterie, tempo, automation, mixage.
// Le temps de l'arrangement est compté en temps (noires) ; les durées audio en secondes. Données simples (JSON),
// les sons (AudioBuffer) sont rangés à part dans les « ressources » du projet et retrouvés par leur identifiant.

export type TrackKind = 'audio' | 'inst' | 'drum' | 'bus';
export interface Note { id: number; p: number; t: number; d: number; v: number; mute?: boolean }
export interface CCPt { t: number; v: number }
/** contenu MIDI partagé : plusieurs clips peuvent pointer vers le même contenu (clips liés) */
export interface MidiData { id: number; notes: Note[]; cc: Record<string, CCPt[]>; orig: Note[] | null; program: number; bank: number; ch: number }
/** off : début du contenu (temps) ; loopLen : longueur du motif répété quand loop est actif */
export interface MidiClip { kind: 'midi'; id: number; name: string; t: number; len: number; data: number; color: string; loop: boolean; take?: number; off?: number; loopLen?: number; mute?: boolean }
export interface Fade { len: number; curve: 'lin' | 'exp' | 'scurve' }
export interface AudioClip {
  kind: 'audio'; id: number; name: string; t: number; asset: string; off: number; dur: number;
  gain: number; fin: Fade; fout: Fade; rev: boolean; warp: boolean; srcBpm: number; ratio: number; pitch: number; mode: 'repitch' | 'stretch' | 'slices';
  color: string; take?: number; mute?: boolean;
}
export interface PatternClip { kind: 'pattern'; id: number; name: string; t: number; len: number; pat: number; color: string; off?: number; mute?: boolean }
export type Clip = MidiClip | AudioClip | PatternClip;

export interface StepCell { on: boolean; v: number; prob: number; flam: boolean; rat: number; len?: number }
export interface StepRow { pad: number; len: number; cells: StepCell[]; accent?: boolean }
/** groove : décalage (fraction de pas) et vélocité (facteur) par pas, extraits d'un son ou dessinés */
export interface Groove { name: string; off: number[]; vel: number[] }
export interface Pattern { id: number; name: string; steps: number; div: number; swing: number; rows: StepRow[]; seed: number; groove?: Groove | null }

export interface Env { a: number; d: number; s: number; r: number }
export interface Osc { wave: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'; oct: number; semi: number; fine: number; lvl: number }
export interface Zone { asset: string; root: number; lo: number; hi: number; vlo: number; vhi: number; tune: number; gain: number; loop: boolean; ls: number; le: number; xf: number }
export interface Pad { name: string; asset: string; vol: number; pan: number; tune: number; choke: number; out: number; decay: number } // out : 0 = sortie de la piste, sinon identifiant d'une piste bus (sortie séparée)
export interface Arp { on: boolean; mode: 'up' | 'down' | 'updown' | 'random' | 'order' | 'chord'; rate: number; oct: number; gate: number; latch: boolean; swing: number }
export interface Inst {
  type: 'synth' | 'fm' | 'wave' | 'sampler' | 'drums' | 'none'; preset: string;
  o1: Osc; o2: Osc; noise: number; uni: number; det: number;
  flt: { type: BiquadFilterType; cut: number; res: number; env: number; key: number }; fenv: Env; aenv: Env;
  lfo: { wave: OscillatorType; rate: number; sync: boolean; dest: 'pitch' | 'cut' | 'amp' | 'pan'; amt: number };
  fm: { ratio: number; index: number; fb: number; env: Env; ratio2: number; index2: number };
  wave: { table: string; pos: number; env: number };
  glide: number; poly: number; vol: number; bend: number;
  zones: Zone[]; pads: Pad[]; patterns: Pattern[]; arp: Arp; map: Record<string, string>;
}
export interface Fx { id: number; type: string; on: boolean; p: Record<string, number>; side?: number; name?: string }
export interface Send { bus: number; db: number; pre: boolean; on: boolean }
export interface AutoPt { t: number; v: number }
export interface AutoLane { param: string; pts: AutoPt[]; mode: 'read' | 'write' | 'touch' | 'latch' | 'off'; show: boolean }
export interface Take { id: number; name: string; clips: number[] }
export interface CompSeg { take: number; a: number; b: number }
export interface Track {
  id: number; name: string; kind: TrackKind; color: string; mute: boolean; solo: boolean; arm: boolean; mon: boolean; lock: boolean;
  vol: number; pan: number; out: number; sends: Send[]; fx: Fx[]; inst: Inst | null; clips: Clip[]; auto: AutoLane[];
  h: number; group: number; input: { dev: string; ch: number; stereo: boolean }; frozen: string | null; phase: boolean;
  takes: Take[]; comp: CompSeg[]; slots: (number | null)[];
  /** clips de la vue session (hors timeline) et sortie MIDI vers un appareil extérieur */
  pool?: Clip[]; midiOut?: string;
}
export interface Marker { id: number; t: number; name: string; color: string; kind: 'marker' | 'section' }
export interface TempoPt { t: number; bpm: number; ramp: boolean }
export interface SigPt { bar: number; num: number; den: number }
export interface ChordPt { t: number; root: number; q: string; len: number }
/** son du projet ; rel : chemin relatif au dossier du projet ; missing : fichier introuvable à l'ouverture */
export interface Asset { id: string; name: string; path: string | null; sr: number; ch: number; len: number; hash: string; origin: string; licence: string; tags: string[]; bpm: number; key: string; rel?: string; missing?: boolean; fav?: boolean }
export interface MixScene { name: string; data: string }
export interface Comment { id: number; t: number; text: string; at: number; done: boolean }
export interface Project {
  format: 'dedcut-music'; version: number; id: string; name: string; sr: number; bpm: number; num: number; den: number; key: number; scale: string;
  tempo: TempoPt[]; sigs: SigPt[]; markers: Marker[]; chords: ChordPt[]; tracks: Track[]; midi: MidiData[];
  master: { vol: number; fx: Fx[]; protect: boolean; ceiling: number; bypass?: boolean; auto?: AutoLane[] };
  loop: { on: boolean; a: number; b: number }; punch: { on: boolean; a: number; b: number };
  metro: { on: boolean; countIn: number; vol: number; accent: boolean; rec: boolean };
  assets: Record<string, Asset>; scenes: { id: number; name: string }[]; mix: MixScene[]; mixAB: number;
  comments: Comment[]; versions: { name: string; at: number; data: string }[]; video: { path: string; off: number; show: boolean } | null;
  grid: number; snap: boolean; follow: boolean; uid: number; created: number; path: string | null; dirty: boolean;
}

/* ---------- identifiants ---------- */
export const nid = (p: Project) => ++p.uid;
export const COLORS = ['#a78bfa', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#fb923c', '#c084fc', '#4ade80'];
export const env = (a: number, d: number, s: number, r: number): Env => ({ a, d, s, r });
export const osc = (wave: Osc['wave'], lvl = 1, oct = 0, semi = 0, fine = 0): Osc => ({ wave, oct, semi, fine, lvl });
export function defInst(type: Inst['type']): Inst {
  return {
    type, preset: '', o1: osc('sawtooth', .8), o2: osc('square', .4, 0, 0, 7), noise: 0, uni: 1, det: 12,
    flt: { type: 'lowpass', cut: 2400, res: 2, env: 2400, key: .3 }, fenv: env(.005, .3, .3, .3), aenv: env(.005, .2, .7, .25),
    lfo: { wave: 'sine', rate: 5, sync: false, dest: 'pitch', amt: 0 },
    fm: { ratio: 2, index: 3, fb: 0, env: env(.005, .4, .2, .3), ratio2: 1, index2: 0 }, wave: { table: 'warm', pos: .3, env: 0 },
    glide: 0, poly: 16, vol: 0, bend: 2, zones: [], pads: [], patterns: [], arp: { on: false, mode: 'up', rate: 4, oct: 1, gate: .8, latch: false, swing: 0 }, map: {}
  };
}
export function newTrack(p: Project, kind: TrackKind, name: string): Track {
  const id = nid(p);
  return {
    id, name, kind, color: COLORS[(p.tracks.length) % COLORS.length], mute: false, solo: false, arm: false, mon: false, lock: false,
    vol: 0, pan: 0, out: 0, sends: [], fx: [], inst: kind === 'inst' ? defInst('synth') : kind === 'drum' ? defInst('drums') : null, clips: [], auto: [],
    h: kind === 'bus' ? 46 : 64, group: 0, input: { dev: 'default', ch: 0, stereo: false }, frozen: null, phase: false, takes: [], comp: [], slots: []
  };
}
export function newProject(name: string, bpm = 120, sr = 48000): Project {
  return {
    format: 'dedcut-music', version: 1, id: 'm' + Date.now().toString(36), name, sr, bpm, num: 4, den: 4, key: 0, scale: 'major',
    tempo: [{ t: 0, bpm, ramp: false }], sigs: [{ bar: 0, num: 4, den: 4 }], markers: [], chords: [], tracks: [], midi: [],
    master: { vol: 0, fx: [], protect: true, ceiling: -0.3 }, loop: { on: false, a: 0, b: 16 }, punch: { on: false, a: 4, b: 8 },
    metro: { on: false, countIn: 1, vol: .6, accent: true, rec: true }, assets: {}, scenes: [], mix: [], mixAB: 0, comments: [], versions: [], video: null,
    grid: .25, snap: true, follow: true, uid: 0, created: Date.now(), path: null, dirty: false
  };
}
export function newMidi(p: Project, notes: Note[] = []): MidiData { const m: MidiData = { id: nid(p), notes, cc: {}, orig: null, program: 0, bank: 0, ch: 0 }; p.midi.push(m); return m; }
export const midiOf = (p: Project, id: number) => p.midi.find(m => m.id === id) || null;
export function newAudioClip(p: Project, a: Asset, t: number): AudioClip {
  return { kind: 'audio', id: nid(p), name: a.name.replace(/\.[^.]+$/, ''), t, asset: a.id, off: 0, dur: a.len, gain: 0, fin: { len: 0.005, curve: 'lin' }, fout: { len: 0.01, curve: 'lin' }, rev: false, warp: false, srcBpm: a.bpm || p.bpm, ratio: 1, pitch: 0, mode: 'stretch', color: '' };
}
export function newPattern(p: Project, name: string, pads: number, steps = 16): Pattern {
  const cell = (): StepCell => ({ on: false, v: 100, prob: 1, flam: false, rat: 1 });
  return { id: nid(p), name, steps, div: 4, swing: 0, seed: 1 + Math.floor(Math.random() * 9999), rows: Array.from({ length: pads }, (_, i) => ({ pad: i, len: steps, cells: Array.from({ length: steps }, cell) })) };
}
export const trackOf = (p: Project, id: number) => p.tracks.find(t => t.id === id) || null;
/** vitesse de lecture d'un clip audio non calé sur le tempo (1 = normal) */
export const clipRate = (c: AudioClip) => c.mode === 'repitch' ? Math.pow(2, c.pitch / 12) : (c.ratio || 1);
export const clipEnd = (p: Project, c: Clip) => c.t + clipLen(p, c);
/** longueur d'un clip en temps (pour un clip audio : selon le tempo, sauf s'il suit le tempo) */
export function clipLen(p: Project, c: Clip): number {
  if (c.kind !== 'audio') return c.len;
  // calé sur le tempo (warp) : la durée en temps du son d'origine ; sinon selon la vitesse de lecture
  if (c.warp) return c.dur * (c.srcBpm || p.bpm) / 60;
  return s2b(p, b2s(p, c.t) + c.dur / clipRate(c)) - c.t;
}

/* ---------- tempo : temps (noires) ↔ secondes, avec changements de tempo (en escalier ou progressifs) ---------- */
export function b2s(p: Project, b: number): number {
  const T = p.tempo.length ? p.tempo : [{ t: 0, bpm: p.bpm, ramp: false }]; let s = 0;
  for (let i = 0; i < T.length; i++) {
    const a = T[i], nx = T[i + 1], end = nx ? Math.min(b, nx.t) : b; if (end <= a.t) break;
    const db = end - a.t;
    if (a.ramp && nx) { const k = (nx.bpm - a.bpm) / (nx.t - a.t), bpmEnd = a.bpm + k * db; s += Math.abs(k) < 1e-9 ? db * 60 / a.bpm : 60 / k * Math.log(bpmEnd / a.bpm); }
    else s += db * 60 / a.bpm;
    if (!nx || b <= nx.t) break;
  }
  return s;
}
export function s2b(p: Project, s: number): number {
  const T = p.tempo.length ? p.tempo : [{ t: 0, bpm: p.bpm, ramp: false }]; let acc = 0;
  for (let i = 0; i < T.length; i++) {
    const a = T[i], nx = T[i + 1], segS = nx ? b2s(p, nx.t) - b2s(p, a.t) : Infinity;
    if (s - acc <= segS || !nx) {
      const rest = s - acc;
      if (a.ramp && nx) { const k = (nx.bpm - a.bpm) / (nx.t - a.t); if (Math.abs(k) < 1e-9) return a.t + rest * a.bpm / 60; return a.t + (a.bpm * (Math.exp(rest * k / 60) - 1)) / k; }
      return a.t + rest * a.bpm / 60;
    }
    acc += segS;
  }
  return 0;
}
export const bpmAt = (p: Project, b: number) => { let r = p.tempo[0]?.bpm || p.bpm; for (const x of p.tempo) if (x.t <= b) r = x.bpm; return r; };
/** mesures : temps de début de chaque mesure jusqu'à b (avec changements de métrique) */
export function barOf(p: Project, b: number): { bar: number; beat: number; num: number; den: number } {
  const S = p.sigs.length ? p.sigs : [{ bar: 0, num: p.num, den: p.den }]; let t = 0, bar = 0;
  for (let i = 0; i < S.length; i++) {
    const s = S[i], nx = S[i + 1], blen = s.num * 4 / s.den, bars = nx ? nx.bar - s.bar : Infinity;
    if (b < t + bars * blen || !nx) { const k = Math.floor((b - t) / blen); return { bar: s.bar + k, beat: b - t - k * blen, num: s.num, den: s.den }; }
    t += bars * blen; bar = nx.bar;
  }
  return { bar, beat: 0, num: p.num, den: p.den };
}
export function barStart(p: Project, bar: number): number {
  const S = p.sigs.length ? p.sigs : [{ bar: 0, num: p.num, den: p.den }]; let t = 0;
  for (let i = 0; i < S.length; i++) {
    const s = S[i], nx = S[i + 1], blen = s.num * 4 / s.den;
    if (!nx || bar < nx.bar) return t + (bar - s.bar) * blen;
    t += (nx.bar - s.bar) * blen;
  }
  return t;
}
export const fmtPos = (p: Project, b: number) => { const x = barOf(p, b), bl = 4 / x.den, beat = Math.floor(x.beat / bl), tick = Math.floor((x.beat / bl - beat) * 100); return `${x.bar + 1}.${beat + 1}.${String(tick).padStart(2, '0')}`; };
export const fmtTime = (s: number) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`; };

/* ---------- notes, gammes, accords ---------- */
export const NOTE_N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const noteName = (p: number, fr = false) => (fr ? NOTE_FR : NOTE_N)[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentaMaj: [0, 2, 4, 7, 9], pentaMin: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};
export const inScale = (p: Project, pitch: number) => (SCALES[p.scale] || SCALES.major).includes(((pitch - p.key) % 12 + 12) % 12);
export const CHORDS: Record<string, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], add9: [0, 4, 7, 14], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '9': [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14], power: [0, 7]
};
export const chordName = (root: number, q: string) => NOTE_N[((root % 12) + 12) % 12] + (q === 'maj' ? '' : q === 'min' ? 'm' : q);

/* ---------- petits outils ---------- */
export const dbToGain = (db: number) => db <= -96 ? 0 : Math.pow(10, db / 20);
export const gainToDb = (g: number) => g <= 1e-6 ? -120 : 20 * Math.log10(g);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** générateur pseudo-aléatoire reproductible (même graine = même résultat) */
export function rng(seed: number) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }
export const deepClone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

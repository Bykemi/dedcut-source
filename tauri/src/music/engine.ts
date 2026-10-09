// DedCut Musique — moteur : sons du projet, tranches de console (effets, volume, panoramique, envois, bus, master),
// lecture avec planification en avance (boucle, tempo variable, métronome, décompte), automation (lecture et écriture),
// enregistrement audio (plusieurs entrées, prises, écriture sur le disque au fil de l'eau) et MIDI, rendu hors ligne.
import type { AudioClip, AutoLane, Fx, MidiClip, Note, PatternClip, Project, Track } from './model';
import { b2s, barOf, bpmAt, clamp, clipEnd, clipLen, clipRate, dbToGain, midiOf, nid, s2b, trackOf } from './model';
import { applyParams, buildFx, setP, type FxNode } from './fx';
import { Player, arpNotes, type BufStore, type Held } from './instruments';
import { loadWorklets } from './worklets';
import { buildExt, loadUsed } from './ext';
import { genSound } from './kits';
import { pitchShift, reverse as revCh, sliceStretch, stretch, type Chans } from './dsp';

export const LOOKAHEAD = .15, TICK_MS = 25;

/* ---------- sons : fichiers décodés, sons d'origine DedCut, versions traitées (inversées, étirées) ---------- */
export class Store implements BufStore {
  map = new Map<string, AudioBuffer>(); private proc = new Map<string, AudioBuffer>();
  constructor(public sr: number) { }
  get(id: string): AudioBuffer | null {
    let b = this.map.get(id);
    if (!b && id.startsWith('gen:')) { const ch = genSound(id, this.sr); if (ch) { b = toBuffer(ch, this.sr); this.map.set(id, b); } }
    return b || null;
  }
  set(id: string, b: AudioBuffer) { this.map.set(id, b); for (const k of [...this.proc.keys()]) if (k.startsWith(id + '|')) this.proc.delete(k); }
  has(id: string) { return this.map.has(id) || (id.startsWith('gen:') && !!this.get(id)); }
  /** son à jouer pour un clip : tampon, position de départ (s) et vitesse ; r = rapport d'étirement voulu */
  clipSource(c: AudioClip, r: number): { buf: AudioBuffer; start: number; rate: number } | null {
    const src = this.get(c.asset); if (!src) return null;
    if (c.mode === 'repitch') {
      const rate = c.warp ? r * Math.pow(2, c.pitch / 12) : clipRate(c);
      return c.rev ? { buf: this.region(src, c, true, 1, 0), start: 0, rate } : { buf: src, start: c.off, rate };
    }
    if (Math.abs(r - 1) < 1e-4 && !c.pitch) return c.rev ? { buf: this.region(src, c, true, 1, 0), start: 0, rate: 1 } : { buf: src, start: c.off, rate: 1 };
    return { buf: this.region(src, c, c.rev, r, c.pitch), start: 0, rate: 1 };
  }
  /** morceau du son, éventuellement inversé, étiré (sans changer la hauteur) et transposé (sans changer la durée) */
  region(src: AudioBuffer, c: AudioClip, rev: boolean, r: number, semi: number): AudioBuffer {
    const key = [c.asset, c.off.toFixed(4), c.dur.toFixed(4), rev ? 1 : 0, r.toFixed(4), semi.toFixed(2), c.mode].join('|'), had = this.proc.get(key); if (had) return had;
    const sr = src.sampleRate, a = Math.floor(c.off * sr), n = Math.max(1, Math.min(src.length - a, Math.floor(c.dur * sr)));
    let ch: Chans = Array.from({ length: src.numberOfChannels }, (_, i) => src.getChannelData(i).slice(a, a + n));
    if (rev) ch = revCh(ch);
    // r = vitesse (2 = deux fois plus court)
    if (Math.abs(r - 1) > 1e-4) ch = c.mode === 'slices' ? sliceStretch(ch, sr, 1 / r) : stretch(ch, sr, 1 / r);
    if (semi) ch = pitchShift(ch, sr, semi);
    const b = toBuffer(ch, sr); if (this.proc.size > 60) this.proc.delete(this.proc.keys().next().value!); this.proc.set(key, b); return b;
  }
}
export function toBuffer(ch: Chans, sr: number): AudioBuffer {
  const b = new AudioBuffer({ length: Math.max(1, ch[0]?.length || 1), numberOfChannels: Math.max(1, ch.length), sampleRate: sr });
  ch.forEach((c, i) => b.copyToChannel(c as Float32Array<ArrayBuffer>, i)); return b;
}

/* ---------- routage : cycles interdits (sortie, envois, sidechain) ---------- */
function edges(p: Project, id: number): number[] {
  const t = trackOf(p, id); if (!t) return []; const e: number[] = [];
  if (t.out) e.push(t.out); for (const s of t.sends) if (s.on) e.push(s.bus);
  for (const x of p.tracks) for (const f of x.fx) if (f.side === id) e.push(x.id); // le son de la piste sert de déclencheur à un effet de x
  return e;
}
/** relier from → to créerait-il une boucle ? */
export function wouldCycle(p: Project, from: number, to: number): boolean {
  if (from === to) return true; const seen = new Set<number>(), st = [to];
  while (st.length) { const n = st.pop()!; if (n === from) return true; if (seen.has(n)) continue; seen.add(n); st.push(...edges(p, n)); }
  return false;
}

/* ---------- valeurs d'automation ---------- */
export function laneValue(l: AutoLane, b: number, def: number): number {
  const P = l.pts; if (!P.length) return def; if (b <= P[0].t) return P[0].v; if (b >= P[P.length - 1].t) return P[P.length - 1].v;
  let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].t <= b) lo = m; else hi = m; }
  const a = P[lo], c = P[hi]; return c.t === a.t ? c.v : a.v + (c.v - a.v) * (b - a.t) / (c.t - a.t);
}
export const PARAM_RANGE: Record<string, [number, number, number]> = { vol: [-60, 12, 0], pan: [-1, 1, 0], mute: [0, 1, 0], send: [-60, 12, -12], cut: [30, 18000, 2400] };
const fadeCurve = (type: string, x: number) => type === 'exp' ? x * x : type === 'scurve' ? Math.sin(x * Math.PI / 2) : x;
function curveArr(type: string, from: number, to: number, g: number, fadeIn: boolean): Float32Array {
  const n = 64, o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = from + (to - from) * i / (n - 1); o[i] = g * fadeCurve(type, fadeIn ? x : 1 - x); } return o;
}
/** fin effective d'une note quand la pédale de sustain (CC 64) est enfoncée à ce moment */
function sustainEnd(md: { cc: Record<string, { t: number; v: number }[]> }, rel: number): number {
  const L = md.cc['64']; if (!L || !L.length) return rel; let down = false;
  for (const p of L) { if (p.t > rel) { if (!down) return rel; if (p.v < .5) return p.t; continue; } down = p.v >= .5; }
  return rel;
}

export interface Strip {
  id: number; sig: string; inp: GainNode; post: GainNode; phase: GainNode; vol: GainNode; pan: StereoPannerNode; mute: GainNode; am: GainNode; pdc: DelayNode; out: GainNode;
  an: AnalyserNode; fx: { f: Fx; n: FxNode }[]; sends: Map<number, GainNode>; player: Player | null; latency: number; buf: Float32Array<ArrayBuffer>; peak: number; hold: number; clip: boolean;
}
interface Active { src: AudioScheduledSourceNode; end: number; track: number }
interface RecTake { track: number; rec: AudioWorkletNode; sel: AudioNode; chunks: Float32Array[][]; frame0: number; ch: number; file: string; disk: boolean; lost: boolean; ended: Promise<void>; done: () => void }
export interface MeterVals { peak: number; rms: number; hold: number; clip: boolean }
export interface MasterVals { mom: number; sh: number; integ: number; corr: number; peak: number }

export class Engine {
  ctx: BaseAudioContext; p: Project; store: Store; offline: boolean;
  strips = new Map<number, Strip>(); master!: { inp: GainNode; fx: { f: Fx; n: FxNode }[]; post: GainNode; vol: GainNode; lim: FxNode | null; out: GainNode; an: AnalyserNode; spec: AnalyserNode; meter: AudioWorkletNode | null; trim: GainNode; sig: string; latency: number };
  mv: MasterVals = { mom: -70, sh: -70, integ: -70, corr: 1, peak: -120 };
  playing = false; pos = 0; segCtx = 0; segBeat = 0; segSec = 0; schedUntil = 0; loops = 0; private timer = 0; private active: Active[] = []; private started = new Set<number>(); private primed = new Set<string>();
  late = 0; metroGain: GainNode | null = null; private clicks: AudioBuffer[] = [];
  latComp = 0; // compensation d'entrée mesurée (s)
  recording = false; takes: RecTake[] = []; inputs = new Map<string, { stream: MediaStream; node: MediaStreamAudioSourceNode }>(); private recStart = 0; recWarn: ((k: string) => void) | null = null;
  midiRec: { track: number; on: Map<number, { t: number; v: number }>; notes: Note[] }[] = [];
  touching = new Map<string, { v: number; last: number; latch: boolean }>();
  /** vue session : clips lancés (provisoires, hors projet) qui remplacent la timeline de leur piste pendant la lecture */
  session: Map<number, import('./model').Clip[]> | null = null;
  clipsOf(t: Track) { return this.session?.get(t.id) ?? t.clips; }
  onTick: (() => void) | null = null; onEnd: (() => void) | null = null;
  /** extension coupée (erreur) : l'interface prévient et reconstruit */
  extErr = (id: string, why: string) => { this.onExtErr?.(id, why); }; onExtErr: ((id: string, why: string) => void) | null = null;
  /** charge les extensions utilisées (à appeler avant sync quand le projet change d'effets) */
  async loadExts(): Promise<string[]> { return loadUsed(this.ctx, [...this.p.tracks.flatMap(t => t.fx.map(f => f.type)), ...this.p.master.fx.map(f => f.type)]); }
  constructor(ctx: BaseAudioContext, p: Project, store: Store, offline = false) { this.ctx = ctx; this.p = p; this.store = store; this.offline = offline; }
  async init() {
    await loadWorklets(this.ctx); const c = this.ctx;
    const inp = c.createGain(), post = c.createGain(), vol = c.createGain(), out = c.createGain(), trim = c.createGain(), an = c.createAnalyser(), spec = c.createAnalyser();
    an.fftSize = 2048; spec.fftSize = 8192; spec.smoothingTimeConstant = .75;
    this.master = { inp, fx: [], post, vol, lim: null, out, an, spec, meter: null, trim, sig: '', latency: 0 };
    post.connect(trim); trim.connect(vol); out.connect(c.destination); out.connect(an); out.connect(spec);
    if (!this.offline) { const m = new AudioWorkletNode(c, 'mu-meter', { numberOfInputs: 1, numberOfOutputs: 0 }); out.connect(m); m.port.onmessage = e => { this.mv = e.data; }; this.master.meter = m; }
    this.metroGain = c.createGain(); this.metroGain.connect(c.destination);
    this.clicks = [1600, 1000].map(f => { const n = Math.floor(c.sampleRate * .03), d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * f * i / c.sampleRate) * Math.exp(-i / (c.sampleRate * .006)); return toBuffer([d], c.sampleRate); });
    this.sync();
  }
  get sr() { return this.ctx.sampleRate; }
  outLatency() { const c = this.ctx as AudioContext; return this.offline ? 0 : (c.outputLatency || 0) + (c.baseLatency || 0); }

  /* ---------- console : construit ou met à jour les tranches selon le projet ---------- */
  private stripSig(t: Track) { return JSON.stringify([t.kind, t.frozen, t.fx.map(f => [f.id, f.type, f.on, f.side || 0]), t.inst?.type, t.inst?.zones.length, Math.round(bpmAt(this.p, 0))]); }
  sync() {
    const c = this.ctx, p = this.p;
    for (const [id, s] of this.strips) if (!trackOf(p, id)) { this.disposeStrip(s); this.strips.delete(id); }
    for (const t of p.tracks) {
      let s = this.strips.get(t.id); const sig = this.stripSig(t);
      if (!s || s.sig !== sig) { if (s) this.disposeStrip(s); s = this.buildStrip(t, sig); this.strips.set(t.id, s); }
      else { for (const x of s.fx) applyParams(x.n, x.f); if (s.player && t.inst) { s.player.bpm = bpmAt(p, this.pos); s.player.update(t.inst); } }
    }
    // master
    const msig = JSON.stringify([p.master.fx.map(f => [f.id, f.type, f.on]), p.master.bypass, p.master.protect, Math.round(bpmAt(p, 0))]);
    if (msig !== this.master.sig) this.buildMaster(msig); else for (const x of this.master.fx) applyParams(x.n, x.f);
    if (this.master.lim) { const P = this.master.lim.params; setP(P.ceil, p.master.ceiling, this.ctx.currentTime); }
    this.mixParams(); this.route();
    void c;
  }
  private buildStrip(t: Track, sig: string): Strip {
    const c = this.ctx, g = () => c.createGain();
    const s: Strip = { id: t.id, sig, inp: g(), post: g(), phase: g(), vol: g(), pan: c.createStereoPanner(), mute: g(), am: g(), pdc: c.createDelay(2), out: g(), an: c.createAnalyser(), fx: [], sends: new Map(), player: null, latency: 0, buf: new Float32Array(2048), peak: 0, hold: -120, clip: false };
    s.an.fftSize = 2048; let prev: AudioNode = s.inp;
    if (!t.frozen) for (const f of t.fx) { if (!f.on) continue; try { const n = f.type.startsWith('ext:') ? buildExt(c, f, this.extErr) : buildFx(c, f, bpmAt(this.p, 0)); applyParams(n, f); prev.connect(n.inp); prev = n.out; s.latency += n.latency; s.fx.push({ f, n }); } catch (e) { console.warn('effet', f.type, e); } }
    prev.connect(s.post); s.post.connect(s.phase); s.phase.connect(s.vol); s.vol.connect(s.pan); s.pan.connect(s.mute); s.mute.connect(s.am); s.am.connect(s.pdc); s.pdc.connect(s.out); s.out.connect(s.an);
    if (t.inst && !t.frozen && (t.kind === 'inst' || t.kind === 'drum')) { s.player = new Player(c, t.inst, s.inp, this.store, pad => this.strips.get(pad.out)?.inp || s.inp); s.player.bpm = bpmAt(this.p, 0); }
    return s;
  }
  private disposeStrip(s: Strip) {
    s.player?.dispose(); for (const x of s.fx) x.n.dispose();
    for (const n of [s.inp, s.post, s.phase, s.vol, s.pan, s.mute, s.am, s.pdc, s.out, ...s.sends.values()]) try { n.disconnect(); } catch { /* rien */ }
    for (const a of this.active) if (a.track === s.id) try { a.src.stop(); } catch { /* rien */ }
  }
  private buildMaster(sig: string) {
    const c = this.ctx, M = this.master; for (const x of M.fx) x.n.dispose(); M.fx = []; if (M.lim) M.lim.dispose(); M.lim = null;
    try { M.inp.disconnect(); M.vol.disconnect(); } catch { /* rien */ }
    let prev: AudioNode = M.inp; M.latency = 0;
    if (!this.p.master.bypass) for (const f of this.p.master.fx) { if (!f.on) continue; try { const n = f.type.startsWith('ext:') ? buildExt(c, f, this.extErr) : buildFx(c, f, bpmAt(this.p, 0)); applyParams(n, f); prev.connect(n.inp); prev = n.out; M.latency += n.latency; M.fx.push({ f, n }); } catch (e) { console.warn('effet', f.type, e); } }
    prev.connect(M.post);
    // protection : limiteur de sécurité tout au bout (évite la saturation et les sauts de volume)
    if (this.p.master.protect) { const l = buildFx(c, { id: 0, type: 'limit', on: true, p: { ceil: this.p.master.ceiling, gain: 0, rel: .08 } }); M.vol.connect(l.inp); l.out.connect(M.out); M.lim = l; } else M.vol.connect(M.out);
    M.sig = sig;
  }
  /** volumes, panoramiques, mute / solo, phase, envois (sans reconstruire) */
  mixParams() {
    const p = this.p, now = this.ctx.currentTime, solo = p.tracks.filter(t => t.solo).map(t => t.id), audible = this.audible(solo);
    for (const t of p.tracks) {
      const s = this.strips.get(t.id); if (!s) continue;
      if (!this.hasAuto(t, 'vol')) s.vol.gain.setTargetAtTime(dbToGain(t.vol), now, .015);
      if (!this.hasAuto(t, 'pan')) s.pan.pan.setTargetAtTime(clamp(t.pan, -1, 1), now, .015);
      s.phase.gain.setValueAtTime(t.phase ? -1 : 1, now);
      s.mute.gain.setTargetAtTime(t.mute || !audible.has(t.id) ? 0 : 1, now, .008);
    }
    this.master.vol.gain.setTargetAtTime(dbToGain(p.master.vol), now, .015);
  }
  /** pistes audibles selon les solos : la piste, ce qui l'alimente et les bus où elle va */
  audible(solo: number[]): Set<number> {
    const p = this.p; if (!solo.length) return new Set(p.tracks.map(t => t.id));
    const ok = new Set<number>(solo), down = [...solo];
    while (down.length) { const t = trackOf(p, down.pop()!); if (!t) continue; for (const n of [t.out, ...t.sends.filter(s => s.on).map(s => s.bus)]) if (n && !ok.has(n)) { ok.add(n); down.push(n); } }
    let grew = true; while (grew) { grew = false; for (const t of p.tracks) if (!ok.has(t.id) && t.out && ok.has(t.out) && solo.includes(t.out)) { ok.add(t.id); grew = true; } }
    return ok;
  }
  private hasAuto(t: Track, param: string) { return this.playing && t.auto.some(l => l.param === param && l.mode !== 'off' && l.pts.length > 0); }
  /** sorties, envois, sidechain, compensation des latences d'effets */
  route() {
    const p = this.p, c = this.ctx, now = c.currentTime;
    const pathLat = (t: Track, depth = 0): number => { const s = this.strips.get(t.id); let l = s?.latency || 0; const b = t.out ? trackOf(p, t.out) : null; if (b && depth < 16) l += pathLat(b, depth + 1); return l; };
    const maxL = Math.max(0, ...p.tracks.filter(t => t.kind !== 'bus').map(t => pathLat(t)));
    for (const t of p.tracks) {
      const s = this.strips.get(t.id); if (!s) continue;
      try { s.out.disconnect(); } catch { /* rien */ } s.out.connect(s.an);
      const bus = t.out && trackOf(p, t.out)?.kind === 'bus' && !wouldCycle(p, t.id, t.out) ? this.strips.get(t.out) : null;
      s.out.connect(bus ? bus.inp : this.master.inp);
      // compensation : les pistes sans effets lents attendent les autres (bus compris)
      const own = t.kind === 'bus' ? 0 : maxL - pathLat(t); s.pdc.delayTime.setValueAtTime(clamp(own / this.sr, 0, 1.9), now);
      // envois pré / post fader
      for (const [, gn] of s.sends) try { gn.disconnect(); } catch { /* rien */ }
      const keep = new Map<number, GainNode>();
      for (const snd of t.sends) {
        const dst = this.strips.get(snd.bus); if (!dst || !snd.on || wouldCycle(p, t.id, snd.bus)) continue;
        const gn = s.sends.get(snd.bus) || c.createGain(); try { s.phase.disconnect(gn); } catch { /* rien */ } try { s.am.disconnect(gn); } catch { /* rien */ }
        (snd.pre ? s.phase : s.am).connect(gn); gn.connect(dst.inp); if (!this.hasAuto(t, 'send:' + snd.bus)) gn.gain.setTargetAtTime(dbToGain(snd.db), now, .015); keep.set(snd.bus, gn);
      }
      for (const [b, gn] of s.sends) if (!keep.has(b)) try { gn.disconnect(); s.phase.disconnect(gn); } catch { /* rien */ }
      s.sends = keep;
      // sidechain : le son d'une autre piste pilote le compresseur
      for (const x of s.fx) if (x.f.side && x.n.side) { const src = this.strips.get(x.f.side); if (src && !wouldCycle(p, x.f.side, t.id)) try { src.am.connect(x.n.side, 0, 1); } catch { /* rien */ } }
      s.player?.inst && t.inst && t.inst.pads.forEach((_, i) => s.player!.reroutePad(i));
    }
  }

  /* ---------- transport ---------- */
  beatAt(t: number) { return s2b(this.p, this.segSec + (t - this.segCtx)); }
  ctxAt(b: number) { return this.segCtx + b2s(this.p, b) - this.segSec; }
  /** position affichée (ce qu'on entend en ce moment) */
  now(): number { if (!this.playing) return this.pos; const t = this.ctx.currentTime - this.outLatency(); return t < this.segCtx ? Math.max(0, this.segBeat - (this.segCtx - t) * bpmAt(this.p, this.segBeat) / 60) : this.beatAt(t); }
  async play(from = this.pos, countIn = 0) {
    if (this.playing) return; const c = this.ctx as AudioContext; if (c.state !== 'running') await c.resume();
    this.sync(); this.prepare();
    const bpm = bpmAt(this.p, from), bar = barOf(this.p, from), beats = countIn * bar.num * 4 / bar.den, pre = beats * 60 / bpm;
    this.segBeat = from; this.segSec = b2s(this.p, from); this.segCtx = c.currentTime + .08 + pre; this.schedUntil = this.segCtx; this.started.clear(); this.primed.clear(); this.loops = 0; this.late = 0;
    for (let i = 0; i < beats; i++) this.click(this.segCtx - (beats - i) * 60 / bpm, i % Math.max(1, Math.round(bar.num * 4 / bar.den)) === 0);
    this.playing = true; this.mixParams(); this.tick(); this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }
  stop() {
    if (!this.playing) return; const t = this.ctx.currentTime; this.pos = Math.max(0, this.now());
    this.playing = false; clearInterval(this.timer); this.timer = 0;
    for (const a of this.active) try { a.src.stop(t + .02); } catch { /* rien */ } this.active = [];
    for (const s of this.strips.values()) s.player?.allOff(t, false);
    this.touching.clear(); this.mixParams();
    for (const s of this.strips.values()) for (const x of s.fx) applyParams(x.n, x.f);
  }
  /** reprend la lecture à la position actuelle (après une modification pendant la lecture) */
  resync() { if (!this.playing) { this.sync(); return; } const b = this.now(); this.restartAt(b); }
  seek(b: number) { b = Math.max(0, b); if (!this.playing) { this.pos = b; return; } this.restartAt(b); }
  private restartAt(b: number) {
    const t = this.ctx.currentTime; for (const a of this.active) try { a.src.stop(t + .01); } catch { /* rien */ } this.active = [];
    for (const s of this.strips.values()) s.player?.allOff(t, true);
    this.sync(); this.prepare(); this.segBeat = b; this.segSec = b2s(this.p, b); this.segCtx = t + .04; this.schedUntil = this.segCtx; this.started.clear(); this.primed.clear();
  }
  private newSegment(t: number, beat: number) {
    for (const a of this.active) if (a.end > t) try { a.src.stop(t); } catch { /* rien */ }
    for (const s of this.strips.values()) s.player?.allOff(t, false);
    this.segCtx = t; this.segBeat = beat; this.segSec = b2s(this.p, beat); this.started.clear(); this.primed.clear(); this.loops++;
  }
  private tick() {
    if (!this.playing) return; const now = this.ctx.currentTime;
    if (now > this.schedUntil + .02) { this.late++; if (now > this.schedUntil + .5) this.schedUntil = now; }
    const ahead = now + LOOKAHEAD; let guard = 0;
    while (this.schedUntil < ahead && guard++ < 40) {
      const t0 = this.schedUntil, t1 = Math.min(ahead, t0 + .06), b0 = this.beatAt(t0), b1 = this.beatAt(t1), L = this.p.loop;
      if (L.on && L.b > L.a && b0 < L.b && b1 >= L.b) { const tl = this.ctxAt(L.b); this.scheduleRange(b0, L.b); this.newSegment(tl, L.a); this.schedUntil = tl; continue; }
      this.scheduleRange(b0, b1); this.schedUntil = t1;
    }
    this.active = this.active.filter(a => a.end > now);
    this.autoWrite(); this.onTick?.();
  }
  /** planifie tout ce qui commence entre deux positions (en temps) */
  scheduleRange(b0: number, b1: number) {
    if (b1 <= b0) return; const p = this.p;
    for (const t of p.tracks) {
      const s = this.strips.get(t.id); if (!s) continue;
      if (t.frozen) this.schedFrozen(t, s, b0);
      else if (t.kind !== 'bus') for (const c of this.clipsOf(t)) {
        if (c.mute) continue;
        if (c.kind === 'audio') { const e = clipEnd(p, c); if (e > b0 && c.t < b1 && !this.started.has(c.id)) this.startAudio(t, s, c, Math.max(b0, c.t)); }
        else if (c.kind === 'midi') this.schedMidi(t, s, c, b0, b1);
        else this.schedPattern(t, s, c, b0, b1);
      }
      this.schedAuto(t, s, b0, b1);
    }
    this.schedMasterAuto(b0, b1);
    if (!this.offline && (p.metro.on || (this.recording && p.metro.rec))) for (let b = Math.ceil(b0 - 1e-9); b < b1; b++) { const x = barOf(p, b); this.click(this.ctxAt(b), x.beat < 1e-6); }
  }
  private click(t: number, accent: boolean) {
    if (!this.metroGain || t < this.ctx.currentTime) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = this.clicks[accent && this.p.metro.accent ? 0 : 1];
    g.gain.value = this.p.metro.vol * (accent ? 1 : .7); s.connect(g); g.connect(this.metroGain); s.start(t);
  }
  /** rapport d'étirement d'un clip calé sur le tempo */
  warpRatio(c: AudioClip) { const len = clipLen(this.p, c); const out = b2s(this.p, c.t + len) - b2s(this.p, c.t); return out > 0 ? c.dur / out : 1; }
  /** calcule à l'avance les sons étirés / inversés (avant la lecture) */
  prepare() { for (const t of this.p.tracks) for (const c of this.clipsOf(t)) if (c.kind === 'audio' && !c.mute) this.store.clipSource(c, c.warp ? this.warpRatio(c) : clipRate(c)); }
  private startAudio(t: Track, s: Strip, c: AudioClip, fb: number) {
    const r = c.warp ? this.warpRatio(c) : clipRate(c), src = this.store.clipSource(c, r); this.started.add(c.id); if (!src) return;
    const end = clipEnd(this.p, c), L = b2s(this.p, end) - b2s(this.p, c.t); let when = this.ctxAt(fb), el = b2s(this.p, fb) - b2s(this.p, c.t);
    const now = this.ctx.currentTime; if (when < now) { el += now - when; when = now; } if (el >= L - .002) return;
    const n = this.ctx.createBufferSource(), g = this.ctx.createGain(); n.buffer = src.buf; n.playbackRate.value = src.rate;
    const G = dbToGain(c.gain), fi = Math.min(c.fin.len, L / 2), fo = Math.min(c.fout.len, L / 2);
    g.gain.setValueAtTime(el < fi ? G * fadeCurve(c.fin.curve, el / fi) : G, when);
    if (el < fi) g.gain.setValueCurveAtTime(curveArr(c.fin.curve, el / fi, 1, G, true), when, fi - el);
    const foAt = L - fo; if (fo > 0) { if (el < foAt) g.gain.setValueCurveAtTime(curveArr(c.fout.curve, 0, 1, G, false), when + foAt - el, fo); else g.gain.setValueCurveAtTime(curveArr(c.fout.curve, (el - foAt) / fo, 1, G, false), when, L - el); }
    n.connect(g); g.connect(s.inp);
    const off = src.start + el * (src.rate === 1 && src.start === 0 ? 1 : src.rate);
    n.start(when, Math.max(0, off)); const stopAt = when + (L - el); n.stop(stopAt);
    n.onended = () => { try { g.disconnect(); } catch { /* rien */ } };
    this.active.push({ src: n, end: stopAt, track: t.id });
  }
  private schedFrozen(t: Track, s: Strip, b0: number) {
    const key = -t.id; if (this.started.has(key)) return; this.started.add(key);
    const b = this.store.get(t.frozen!); if (!b) return; const n = this.ctx.createBufferSource(); n.buffer = b;
    let when = this.ctxAt(b0), off = b2s(this.p, b0); const now = this.ctx.currentTime; if (when < now) { off += now - when; when = now; }
    if (off >= b.duration) return; n.connect(s.post); n.start(when, off); this.active.push({ src: n, end: when + b.duration - off, track: t.id });
  }
  private schedMidi(t: Track, s: Strip, c: MidiClip, b0: number, b1: number) {
    const md = midiOf(this.p, c.data), pl = s.player; if (!md || !pl || !t.inst) return;
    const end = c.t + c.len, a = Math.max(b0, c.t), b = Math.min(b1, end); if (a >= b) return;
    const off = c.off || 0, per = c.loop ? Math.max(.25, c.loopLen || c.len) : Infinity;
    const at = (rel: number) => c.t - off + rel; // position d'un instant du contenu
    const reps = (rel: number) => { const out: number[] = []; if (per === Infinity) { const x = at(rel); if (x >= a && x < b) out.push(x); return out; } let k = Math.ceil((a - at(rel)) / per - 1e-9); for (; at(rel) + k * per < b; k++) { const x = at(rel) + k * per; if (x >= a && x >= c.t) out.push(x); } return out; };
    if (t.inst.arp.on && t.inst.type !== 'drums') {
      // arpégiateur : notes tenues à chaque pas
      const ar = t.inst.arp, step = 1 / Math.max(.25, ar.rate);
      for (let k = Math.ceil(a / step - 1e-9); k * step < b; k++) {
        const x = k * step, rel = per === Infinity ? x - c.t + off : ((x - c.t + off) % per + per) % per;
        const held: Held[] = md.notes.filter(n => !n.mute && n.t <= rel + 1e-6 && n.t + n.d > rel + 1e-6).map(n => ({ p: n.p, v: n.v, at: n.t }));
        for (const e of arpNotes(held, ar, x, x + step * .999, md.id)) { const tt = this.ctxAt(e.t); pl.noteOn(e.p, e.v, tt, b2s(this.p, e.t + e.d) - b2s(this.p, e.t)); }
      }
    } else for (const n of md.notes) {
      if (n.mute) continue;
      for (const x of reps(n.t)) { if (x >= end) continue; const rel = Math.min(x + n.d, end), fin = Math.min(end, sustainEnd(md, n.t + n.d) - n.t + x); pl.noteOn(n.p, n.v, this.ctxAt(x), b2s(this.p, Math.max(rel, fin)) - b2s(this.p, x)); }
    }
    for (const [k, pts] of Object.entries(md.cc)) {
      if (k === '64') continue;
      for (const pt of pts) for (const x of reps(pt.t)) { if (x >= end) continue; const tt = this.ctxAt(x); if (k === 'pb') pl.pitchBend((pt.v - .5) * 2, tt); else pl.cc(+k, Math.round(pt.v * 127), tt); }
    }
  }
  private schedPattern(t: Track, s: Strip, c: PatternClip, b0: number, b1: number) {
    const pl = s.player, pat = t.inst?.patterns.find(x => x.id === c.pat); if (!pl || !pat) return;
    const end = c.t + c.len, a = Math.max(b0, c.t), b = Math.min(b1, end); if (a >= b) return;
    const sl = 1 / Math.max(1, pat.div), off = c.off || 0, base0 = c.t - off;
    for (let gi = Math.ceil((a - base0) / sl - 1e-9); base0 + gi * sl < b; gi++) {
      const at = base0 + gi * sl; if (at < a || at < c.t) continue;
      pat.rows.forEach((row, ri) => {
        const len = Math.max(1, row.len || pat.steps), idx = ((gi % len) + len) % len, cell = row.cells[idx]; if (!cell || !cell.on) return;
        if (cell.prob < 1) { const h = Math.sin((pat.seed * 131 + ri * 977 + gi * 31) * 12.9898) * 43758.5453; if ((h - Math.floor(h)) >= cell.prob) return; }
        const gv = pat.groove?.vel[idx % (pat.groove.vel.length || 1)] ?? 1, go = pat.groove?.off[idx % (pat.groove.off.length || 1)] ?? 0;
        const sw = gi % 2 === 1 ? pat.swing * sl * .5 : 0, x = at + sw + go * sl, v = clamp(Math.round(cell.v * gv), 1, 127), rat = Math.max(1, Math.round(cell.rat || 1));
        for (let j = 0; j < rat; j++) {
          const tt = this.ctxAt(x + j * sl / rat), vv = j ? Math.max(1, Math.round(v * (.8 - .1 * j))) : v, dur = b2s(this.p, x + (cell.len || 1) * sl / rat) - b2s(this.p, x);
          if (t.kind === 'drum') { if (cell.flam && j === 0) pl.hit(row.pad, Math.round(v * .55), tt - .022); pl.hit(row.pad, vv, tt); }
          else { if (cell.flam && j === 0) pl.noteOn(row.pad, Math.round(v * .55), tt - .022, .02); pl.noteOn(row.pad, vv, tt, dur * .95); }
        }
      });
    }
  }

  /* ---------- automation ---------- */
  /** où va une automation : paramètre audio (planifié précisément) ou fonction (appliquée à chaque passage) */
  target(t: Track | null, s: Strip | null, param: string): { prm?: AudioParam; fn?: (v: number) => void; map: (v: number) => number } | null {
    if (!t) { if (param === 'vol') return { prm: this.master.vol.gain, map: dbToGain }; const [, id, k] = param.split(':'); const x = this.master.fx.find(y => y.f.id === +id); const q = x?.n.params[k]; return q ? (typeof q === 'function' ? { fn: q, map: v => v } : { prm: q, map: v => v }) : null; }
    if (!s) return null;
    if (param === 'vol') return { prm: s.vol.gain, map: dbToGain };
    if (param === 'pan') return { prm: s.pan.pan, map: v => clamp(v, -1, 1) };
    if (param === 'mute') return { prm: s.am.gain, map: v => v >= .5 ? 0 : 1 };
    if (param.startsWith('send:')) { const g = s.sends.get(+param.slice(5)); return g ? { prm: g.gain, map: dbToGain } : null; }
    if (param.startsWith('fx:')) { const [, id, k] = param.split(':'); const x = s.fx.find(y => y.f.id === +id); const q = x?.n.params[k]; if (!q) return null; return typeof q === 'function' ? { fn: q, map: v => v } : { prm: q, map: v => v }; }
    if (param === 'inst:vol' && s.player) return { prm: s.player.out.gain, map: dbToGain };
    if (param === 'inst:cut' && t.inst) return { fn: v => { t.inst!.flt.cut = v; }, map: v => v };
    return null;
  }
  private schedLane(id: string, l: AutoLane, T: ReturnType<Engine['target']>, b0: number, b1: number, def: number) {
    if (!T || l.mode === 'off' || !l.pts.length) return; const key = id + '|' + l.param; if (this.touching.has(key)) return;
    const t0 = this.ctxAt(b0), t1 = this.ctxAt(b1), now = this.ctx.currentTime;
    if (T.fn) { T.fn(laneValue(l, b0, def)); return; }
    const P = T.prm!;
    if (!this.primed.has(key)) { this.primed.add(key); P.cancelScheduledValues(Math.max(now, t0)); P.setValueAtTime(T.map(laneValue(l, b0, def)), Math.max(now, t0)); }
    for (let ts = t0 + .02; ts <= t1 + 1e-6; ts += .02) if (ts > now) P.linearRampToValueAtTime(T.map(laneValue(l, this.beatAt(ts), def)), ts);
  }
  private schedAuto(t: Track, s: Strip, b0: number, b1: number) { for (const l of t.auto) this.schedLane(String(t.id), l, this.target(t, s, l.param), b0, b1, this.defOf(t, l.param)); }
  private schedMasterAuto(b0: number, b1: number) { for (const l of this.p.master.auto || []) this.schedLane('m', l, this.target(null, null, l.param), b0, b1, l.param === 'vol' ? this.p.master.vol : 0); }
  defOf(t: Track, param: string): number {
    if (param === 'vol') return t.vol; if (param === 'pan') return t.pan; if (param === 'mute') return t.mute ? 1 : 0;
    if (param.startsWith('send:')) return t.sends.find(x => x.bus === +param.slice(5))?.db ?? -12;
    if (param.startsWith('fx:')) { const [, id, k] = param.split(':'); return t.fx.find(f => f.id === +id)?.p[k] ?? 0; }
    if (param === 'inst:vol') return t.inst?.vol ?? 0; if (param === 'inst:cut') return t.inst?.flt.cut ?? 2400; return 0;
  }
  /** l'utilisateur bouge un réglage : appliqué tout de suite, et écrit dans l'automation selon le mode (write / touch / latch) */
  autoInput(trackId: number, param: string, v: number) {
    const t = trackOf(this.p, trackId), s = t ? this.strips.get(trackId) : null, T = this.target(t, s || null, param);
    if (T?.prm) T.prm.setTargetAtTime(T.map(v), this.ctx.currentTime, .01); else T?.fn?.(T.map(v));
    if (!this.playing || !t) return; const l = t.auto.find(x => x.param === param); if (!l || !['write', 'touch', 'latch'].includes(l.mode)) return;
    const key = trackId + '|' + param, b = this.now(), was = this.touching.get(key);
    this.touching.set(key, { v, last: was ? was.last : b, latch: l.mode === 'latch' }); this.writePoint(l, was ? was.last : b, b, v); this.touching.get(key)!.last = b;
  }
  /** fin du geste : en mode touch, l'automation reprend la main */
  autoRelease(trackId: number, param: string) { const k = trackId + '|' + param, x = this.touching.get(k); if (x && !x.latch) { this.touching.delete(k); this.primed.delete(k); } }
  private writePoint(l: AutoLane, from: number, to: number, v: number) {
    l.pts = l.pts.filter(p => p.t < from - 1e-6 || p.t > to + 1e-6); l.pts.push({ t: to, v }); if (from < to - 1e-6 && !l.pts.some(p => Math.abs(p.t - from) < 1e-6)) l.pts.push({ t: from, v });
    l.pts.sort((a, b) => a.t - b.t); this.p.dirty = true;
  }
  /** pendant la lecture : mode write = écrit la valeur actuelle en continu ; latch = continue après le geste */
  private autoWrite() {
    const b = this.now();
    for (const t of this.p.tracks) for (const l of t.auto) {
      const key = t.id + '|' + l.param, x = this.touching.get(key);
      if (l.mode === 'write' && !x) { const v = this.defOf(t, l.param); this.touching.set(key, { v, last: b, latch: true }); }
      const y = this.touching.get(key); if (!y || (l.mode !== 'write' && l.mode !== 'latch' && !x)) continue;
      if (b > y.last) { this.writePoint(l, y.last, b, y.v); y.last = b; }
    }
  }

  /* ---------- mesures ---------- */
  meter(id: number): MeterVals {
    const s = this.strips.get(id); if (!s) return { peak: -120, rms: -120, hold: -120, clip: false };
    s.an.getFloatTimeDomainData(s.buf); let pk = 0, sq = 0; for (const v of s.buf) { const a = Math.abs(v); if (a > pk) pk = a; sq += v * v; }
    const db = pk > 1e-6 ? 20 * Math.log10(pk) : -120, now = performance.now(); if (db > s.hold || now - s.peak > 1500) { s.hold = db; s.peak = now; } if (pk >= .999) s.clip = true;
    return { peak: db, rms: sq > 0 ? 10 * Math.log10(sq / s.buf.length) : -120, hold: s.hold, clip: s.clip };
  }
  stats() { let voices = 0; for (const s of this.strips.values()) voices += s.player?.activeVoices() || 0; const c = this.ctx as AudioContext; return { voices, sources: this.active.length, late: this.late, tracks: this.p.tracks.length, sr: this.sr, base: c.baseLatency || 0, out: c.outputLatency || 0, fx: [...this.strips.values()].reduce((a, s) => a + s.fx.length, 0) + (this.master?.fx.length || 0) }; }

  /* ---------- jeu en direct (clavier MIDI, clavier de l'ordinateur) ---------- */
  liveOn(trackId: number, p: number, v: number) { const s = this.strips.get(trackId); s?.player?.noteOn(p, v, this.ctx.currentTime); this.midiRecOn(trackId, p, v); }
  liveOff(trackId: number, p: number) { const s = this.strips.get(trackId); s?.player?.noteOff(p, this.ctx.currentTime); this.midiRecOff(trackId, p); }
  liveCC(trackId: number, num: number, val: number) { this.strips.get(trackId)?.player?.cc(num, val); }
  liveBend(trackId: number, v: number) { this.strips.get(trackId)?.player?.pitchBend(v); }
  private midiRecOn(trackId: number, p: number, v: number) { const r = this.midiRec.find(x => x.track === trackId); if (r && this.recording) r.on.set(p, { t: this.now(), v }); }
  private midiRecOff(trackId: number, p: number) { const r = this.midiRec.find(x => x.track === trackId); const o = r?.on.get(p); if (!r || !o) return; r.on.delete(p); r.notes.push({ id: nid(this.p), p, t: o.t, d: Math.max(1 / 64, this.now() - o.t), v: o.v }); }

  /* ---------- entrées audio, écoute de contrôle, enregistrement ---------- */
  async openInput(dev: string): Promise<{ stream: MediaStream; node: MediaStreamAudioSourceNode }> {
    const had = this.inputs.get(dev); if (had && had.stream.active) return had;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: dev && dev !== 'default' ? { exact: dev } : undefined, channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const node = (this.ctx as AudioContext).createMediaStreamSource(stream), x = { stream, node }; this.inputs.set(dev, x);
    for (const tr of stream.getAudioTracks()) tr.addEventListener('ended', () => { this.inputs.delete(dev); this.recWarn?.('mu.rec.unplugged'); this.dropTakesFor(dev); });
    return x;
  }
  /** canal choisi (1 ou 2 canaux) d'une entrée */
  private select(node: AudioNode, ch: number, stereo: boolean): AudioNode {
    const c = this.ctx, sp = c.createChannelSplitter(2), mg = c.createChannelMerger(2); node.connect(sp);
    if (stereo) { sp.connect(mg, 0, 0); sp.connect(mg, 1, 1); } else { sp.connect(mg, Math.min(1, ch), 0); sp.connect(mg, Math.min(1, ch), 1); }
    return mg;
  }
  private monitors = new Map<number, AudioNode>();
  /** écoute de contrôle logicielle : l'entrée passe par les effets de la piste (latence = entrée + sortie) */
  async monitor(t: Track, on: boolean) {
    const old = this.monitors.get(t.id); if (old) { try { old.disconnect(); } catch { /* rien */ } this.monitors.delete(t.id); }
    if (!on) return; const s = this.strips.get(t.id); if (!s) return;
    const inp = await this.openInput(t.input.dev), sel = this.select(inp.node, t.input.ch, t.input.stereo); sel.connect(s.inp); this.monitors.set(t.id, sel);
  }
  private dropTakesFor(dev: string) { for (const k of this.takes) { const t = trackOf(this.p, k.track); if (t && t.input.dev === dev) { k.lost = true; } } }
  /** démarre l'enregistrement des pistes armées ; disk = écriture au fil de l'eau (récupération après plantage) */
  async record(from: number, countIn: number, disk: { open(id: string, meta: string): Promise<number>; append(id: string, b: Uint8Array): Promise<number> } | null) {
    if (this.playing) this.stop();
    const armed = this.p.tracks.filter(t => t.arm && !t.lock);
    if (!armed.length) throw new Error('mu.rec.noArm');
    this.takes = []; this.midiRec = [];
    for (const t of armed) {
      if (t.kind === 'audio') {
        const inp = await this.openInput(t.input.dev), sel = this.select(inp.node, t.input.ch, t.input.stereo), ch = t.input.stereo ? 2 : 1;
        const rec = new AudioWorkletNode(this.ctx, 'mu-rec', { numberOfInputs: 1, numberOfOutputs: 0, processorOptions: { ch } });
        sel.connect(rec); let done = () => { /* rien */ }; const ended = new Promise<void>(r => { done = r; });
        const k: RecTake = { track: t.id, rec, sel, chunks: [], frame0: -1, ch, file: 'r' + Date.now().toString(36) + t.id, disk: !!disk, lost: false, ended, done };
        rec.port.onmessage = e => {
          const d = e.data; if (d.end) { k.done(); return; } if (k.frame0 < 0) k.frame0 = d.frame; k.chunks.push(d.ch);
          if (k.disk && disk) { const n = d.ch[0].length, il = new Float32Array(n * k.ch); for (let i = 0; i < n; i++) for (let c = 0; c < k.ch; c++) il[i * k.ch + c] = d.ch[c][i]; disk.append(k.file, new Uint8Array(il.buffer)).catch(() => { k.disk = false; this.recWarn?.('mu.rec.diskFull'); }); }
        };
        if (disk) { try { const free = await disk.open(k.file, JSON.stringify({ sr: this.sr, ch, project: this.p.id, name: this.p.name, track: t.name, at: Date.now() })); if (free && free < 200e6) this.recWarn?.('mu.rec.diskLow'); } catch { k.disk = false; this.recWarn?.('mu.rec.diskFail'); } }
        this.takes.push(k);
      } else if (t.kind === 'inst' || t.kind === 'drum') this.midiRec.push({ track: t.id, on: new Map(), notes: [] });
    }
    await this.play(from, countIn); this.recording = true; this.recStart = from; this.recCtx = this.segCtx;
    const startFrame = Math.round(this.segCtx * this.sr); for (const k of this.takes) k.rec.port.postMessage({ start: startFrame });
  }
  /** fin de l'enregistrement : clips créés (prises gardées), sons rendus au projet ; renvoie les nouveaux sons à enregistrer */
  async stopRecord(): Promise<{ assets: { id: string; ch: Chans; track: number; file: string }[]; clips: number }> {
    if (!this.recording) { this.stop(); return { assets: [], clips: 0 }; }
    for (const k of this.takes) k.rec.port.postMessage('stop');
    await Promise.all(this.takes.map(k => Promise.race([k.ended, new Promise<void>(r => setTimeout(r, 1500))])));
    this.recording = false; this.stop();
    const out: { id: string; ch: Chans; track: number; file: string }[] = []; let clips = 0; const p = this.p, L = p.loop, P = p.punch;
    for (const k of this.takes) {
      try { k.sel.disconnect(); } catch { /* rien */ }
      const t = trackOf(p, k.track); if (!t || !k.chunks.length) continue;
      const n = k.chunks.reduce((a, c) => a + c[0].length, 0), ch: Chans = Array.from({ length: k.ch }, () => new Float32Array(n));
      let o = 0; for (const c of k.chunks) { for (let i = 0; i < k.ch; i++) ch[i].set(c[i], o); o += c[0].length; }
      // position : instant du premier échantillon moins la latence d'entrée / sortie
      const t0 = k.frame0 / this.sr - this.latComp - this.outLatency();
      const startBeat = s2b(p, b2s(p, this.recStart) + (t0 - this.recCtx)), total = n / this.sr;
      const id = 'rec:' + k.file; out.push({ id, ch, track: t.id, file: k.file });
      // passes de boucle (en secondes du son enregistré) : une prise par passage, chacune posée au début de la boucle
      const passes: [number, number][] = [], first = b2s(p, L.b) - b2s(p, startBeat), lsec = b2s(p, L.b) - b2s(p, L.a);
      if (L.on && L.b > L.a && startBeat < L.b && total > first + .05) { passes.push([0, first]); for (let x = first; x < total - .05; x += lsec) passes.push([x, Math.min(total, x + lsec)]); }
      else passes.push([0, total]);
      passes.forEach(([secA, secB], i) => {
        let off = Math.max(0, secA), dur = Math.max(0, secB - secA), at = i === 0 ? startBeat : L.a;
        // punch : seulement entre les repères
        if (P.on && P.b > P.a) { const ca = Math.max(at, P.a), cb = Math.min(at + (s2b(p, b2s(p, at) + dur) - at), P.b); if (cb <= ca) return; const dA = b2s(p, ca) - b2s(p, at); off += dA; dur = b2s(p, cb) - b2s(p, ca); at = ca; }
        if (dur < .02) return;
        const c: AudioClip = { kind: 'audio', id: nid(p), name: t.name + ' ' + (t.takes.length + 1), t: at, asset: id, off, dur, gain: 0, fin: { len: .005, curve: 'lin' }, fout: { len: .01, curve: 'lin' }, rev: false, warp: false, srcBpm: bpmAt(p, at), ratio: 1, pitch: 0, mode: 'stretch', color: '' };
        // prises : les clips recouverts restent, coupés du son
        for (const x of t.clips) if (x.kind === 'audio' && !x.mute && x.t < clipEnd(p, c) && clipEnd(p, x) > c.t) x.mute = true;
        c.take = nid(p); t.clips.push(c); t.takes.push({ id: c.take, name: c.name, clips: [c.id] }); clips++;
      });
      if (k.lost) this.recWarn?.('mu.rec.partial');
    }
    for (const r of this.midiRec) {
      const t = trackOf(p, r.track); if (!t) continue; for (const [pp] of r.on) this.midiRecOff(r.track, pp); if (!r.notes.length) continue;
      const a = Math.floor(Math.min(...r.notes.map(x => x.t))), b = Math.ceil(Math.max(...r.notes.map(x => x.t + x.d)));
      let notes = r.notes.map(x => ({ ...x, t: x.t - a })), len = Math.max(1, b - a), at = a;
      if (L.on && L.b > L.a && b - a > L.b - L.a) { at = L.a; len = L.b - L.a; notes = r.notes.map(x => ({ ...x, t: (((x.t - L.a) % len) + len) % len })); }
      const md = { id: nid(p), notes, cc: {}, orig: null, program: 0, bank: 0, ch: 0 }; p.midi.push(md);
      t.clips.push({ kind: 'midi', id: nid(p), name: t.name, t: at, len, data: md.id, color: '', loop: false }); clips++;
    }
    this.takes = []; this.midiRec = []; p.dirty = true; return { assets: out, clips };
  }
  private recCtx = 0; // instant (horloge audio) où la lecture atteint le début de l'enregistrement
  dispose() { this.stop(); for (const s of this.strips.values()) this.disposeStrip(s); this.strips.clear(); for (const x of this.inputs.values()) x.stream.getTracks().forEach(t => t.stop()); this.inputs.clear(); }
}

/* ---------- rendu hors ligne (export, stems, gel de piste, rendu d'instrument) ---------- */
export interface RenderOpts { a: number; b: number; tail: number; sr: number; ch: 1 | 2; only?: number[] | null; master: boolean; bypassMaster?: boolean; pre?: boolean; onProgress?: (x: number) => void; cancel?: { stop: boolean } }
export async function renderProject(p0: Project, store: Store, o: RenderOpts): Promise<AudioBuffer | null> {
  const p: Project = JSON.parse(JSON.stringify(p0)); p.loop.on = false;
  if (o.only) { const keep = new Set(o.only); for (const t of p.tracks) { const routedIn = (id: number, d = 0): boolean => { if (keep.has(id)) return true; const x = trackOf(p, id); return !!x && d < 16 && !!x.out && routedIn(x.out, d + 1); }; t.solo = false; if (t.kind !== 'bus' && !routedIn(t.id)) { t.mute = true; t.clips = []; t.auto = []; t.frozen = null; } } } // vidée : ses envois pré-fader n'alimentent plus les bus
  if (!o.master || o.bypassMaster) { p.master.bypass = true; }
  if (!o.master) p.master.protect = false;
  const len = Math.ceil((b2s(p, o.b) - b2s(p, o.a) + o.tail) * o.sr); if (len <= 0) return null;
  const ctx = new OfflineAudioContext(o.ch, len, o.sr), e = new Engine(ctx, p, store, true); await loadWorklets(ctx); await e.loadExts(); await e.init();
  e.segCtx = 0; e.segBeat = o.a; e.segSec = b2s(p, o.a); e.playing = true; e.prepare(); e.scheduleRange(o.a, o.b);
  // progression et annulation : pause régulière du rendu
  // 20 pauses au plus pour la progression : chaque pause attend la page (lent si la fenêtre est réduite pendant l'export)
  const dur = len / o.sr, steps = Math.max(1, Math.min(20, Math.floor(dur / 2)));
  for (let i = 1; i < steps; i++) { const at = dur * i / steps; ctx.suspend(at).then(() => { o.onProgress?.(i / steps); if (!o.cancel?.stop) ctx.resume(); }).catch(() => { /* fin */ }); }
  const r = await Promise.race([ctx.startRendering(), new Promise<null>(res => { const iv = setInterval(() => { if (o.cancel?.stop) { clearInterval(iv); res(null); } }, 100); ctx.addEventListener('complete', () => clearInterval(iv)); })]);
  o.onProgress?.(1); return r;
}
export type { Chans };

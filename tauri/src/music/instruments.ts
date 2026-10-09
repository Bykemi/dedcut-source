// DedCut Musique — instruments : synthé soustractif, FM, table d'ondes, sampler (zones, vélocité, boucles avec fondu)
// et boîte à rythmes (pads, kits, groupes d'étouffement, sorties séparées). Fonctionne en direct et en rendu hors ligne.
import type { Arp, Env, Inst, Osc, Pad, Zone } from './model';
import { dbToGain } from './model';
import { SYNC_NOTES } from './fx';

export interface BufStore { get(id: string): AudioBuffer | null }
interface Voice { p: number; t0: number; end: number; off: number; nodes: AudioScheduledSourceNode[]; amp: GainNode; flt: BiquadFilterNode | null; rel: Env; choke: number; pad: number; released: boolean; legato?: (p: number, t: number) => void }
const velGain = (v: number) => Math.pow(Math.max(1, Math.min(127, v)) / 127, 1.6);
const hz = (p: number) => 440 * Math.pow(2, (p - 69) / 12);

/* ---------- tables d'ondes d'origine DedCut (harmoniques calculées) ---------- */
export const TABLES: Record<string, (h: number, f: number) => number> = {
  // f : position dans la table (0 → 1), h : rang de l'harmonique
  warm: (h, f) => (h === 1 ? 1 : (1 / (h * h)) * (1 + f * 3) * (h % 2 ? 1 : f)),
  bright: (h, f) => 1 / Math.pow(h, 1.6 - f * .9),
  hollow: (h, f) => (h % 2 ? 1 / h : f * .6 / h),
  vocal: (h, f) => { const f1 = 3 + f * 6, f2 = 9 + f * 10; return Math.exp(-Math.pow(h - f1, 2) / 4) + .6 * Math.exp(-Math.pow(h - f2, 2) / 8) + (h === 1 ? .5 : 0); },
  glass: (h, f) => ([1, 3, 6, 10, 15, 21].includes(h) ? 1 / Math.sqrt(h) * (h > 6 ? f : 1) : 0),
  digital: (h, f) => ((h * 7 + Math.round(f * 8)) % 5 === 0 ? 1 / h : (h === 1 ? 1 : 0))
};
export const TABLE_IDS = Object.keys(TABLES);
const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
function tableWave(ctx: BaseAudioContext, table: string, pos: number): PeriodicWave {
  let m = waveCache.get(ctx); if (!m) { m = new Map(); waveCache.set(ctx, m); }
  const key = table + '|' + pos.toFixed(2), c = m.get(key); if (c) return c;
  const N = 64, re = new Float32Array(N), im = new Float32Array(N), fn = TABLES[table] || TABLES.warm;
  for (let h = 1; h < N; h++) im[h] = fn(h, pos);
  const w = ctx.createPeriodicWave(re, im); m.set(key, w); return w;
}
/** onde d'un modulateur FM avec rétroaction (approchée par une onde plus riche) */
function fbWave(ctx: BaseAudioContext, fb: number): PeriodicWave {
  let m = waveCache.get(ctx); if (!m) { m = new Map(); waveCache.set(ctx, m); }
  const key = 'fb|' + fb.toFixed(2), c = m.get(key); if (c) return c;
  const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let h = 1; h < N; h++) im[h] = h === 1 ? 1 : Math.pow(fb, h - 1) / h;
  const w = ctx.createPeriodicWave(re, im); m.set(key, w); return w;
}
const noiseBufs = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuf(ctx: BaseAudioContext) { let b = noiseBufs.get(ctx); if (!b) { b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = b.getChannelData(0); let s = 22222; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; } noiseBufs.set(ctx, b); } return b; }
/** boucle avec fondu enchaîné : la fin de la boucle est mélangée au son qui précède le début (pas de clic au retour) */
const loopCache = new WeakMap<AudioBuffer, Map<string, AudioBuffer>>();
function loopBuffer(ctx: BaseAudioContext, b: AudioBuffer, ls: number, le: number, xf: number): AudioBuffer {
  const sr = b.sampleRate, a = Math.floor(ls * sr), e = Math.min(b.length, Math.floor(le * sr)), n = Math.min(Math.floor(xf * sr), a, e - a - 1);
  if (n < 16) return b;
  let m = loopCache.get(b); if (!m) { m = new Map(); loopCache.set(b, m); } const key = [a, e, n].join('|'), c = m.get(key); if (c) return c;
  const o = ctx.createBuffer(b.numberOfChannels, b.length, sr);
  for (let ch = 0; ch < b.numberOfChannels; ch++) { const s = b.getChannelData(ch), d = o.getChannelData(ch); d.set(s); for (let i = 0; i < n; i++) { const k = i / n, g1 = Math.sqrt(1 - k), g2 = Math.sqrt(k); d[e - n + i] = s[e - n + i] * g1 + s[a - n + i] * g2; } }
  m.set(key, o); return o;
}
const unlink = (links: [AudioNode, AudioParam][]) => { for (const [a, prm] of links) try { a.disconnect(prm); } catch { /* déjà débranché */ } };
function adsr(prm: AudioParam, t: number, e: Env, base: number, peak: number) {
  const sus = base + (peak - base) * e.s; prm.cancelScheduledValues(t); prm.setValueAtTime(base, t); prm.linearRampToValueAtTime(peak, t + Math.max(.001, e.a)); prm.setTargetAtTime(sus, t + Math.max(.001, e.a), Math.max(.002, e.d) / 3);
}
function releaseAt(prm: AudioParam, t: number, e: Env, base: number) { prm.cancelAndHoldAtTime(t); prm.setTargetAtTime(base, t, Math.max(.002, e.r) / 4); }

export class Player {
  readonly ctx: BaseAudioContext; inst: Inst; out: GainNode; voices: Voice[] = []; bufs: BufStore;
  bend: ConstantSourceNode; lfo: OscillatorNode; lfoAmt: GainNode; mod = 0; sustain = false; sustained = new Set<number>(); bpm = 120;
  padDest: (pad: Pad) => AudioNode; private padNodes = new Map<number, { g: GainNode; pan: StereoPannerNode }>(); private lastP = -1; private lfoSrcGain: GainNode;
  peakVoices = 0;
  constructor(ctx: BaseAudioContext, inst: Inst, dest: AudioNode, bufs: BufStore, padDest?: (pad: Pad) => AudioNode) {
    this.ctx = ctx; this.inst = inst; this.bufs = bufs; this.out = ctx.createGain(); this.out.connect(dest); this.padDest = padDest || (() => this.out);
    this.bend = ctx.createConstantSource(); this.bend.offset.value = 0; this.bend.start();
    this.lfo = ctx.createOscillator(); this.lfoSrcGain = ctx.createGain(); this.lfoAmt = ctx.createGain(); this.lfo.connect(this.lfoSrcGain); this.lfoSrcGain.connect(this.lfoAmt); this.lfo.start();
    this.update(inst);
  }
  /** réglages changés : volume, LFO */
  update(inst: Inst) {
    this.inst = inst; const t = this.ctx.currentTime; this.out.gain.setTargetAtTime(dbToGain(inst.vol), t, .01);
    this.lfo.type = inst.lfo.wave === 'custom' ? 'sine' : inst.lfo.wave;
    const rate = inst.lfo.sync ? (this.bpm / 60) / SYNC_NOTES[Math.max(0, Math.min(SYNC_NOTES.length - 1, Math.round(inst.lfo.rate) - 1))] : inst.lfo.rate;
    this.lfo.frequency.setTargetAtTime(Math.max(.01, rate), t, .01);
    const depth = Math.min(1, inst.lfo.amt + this.mod), d = inst.lfo.dest;
    this.lfoAmt.gain.setTargetAtTime(d === 'pitch' ? depth * 100 : d === 'cut' ? depth * 2400 : d === 'amp' ? depth * .5 : depth, t, .01);
    for (const [i, n] of this.padNodes) { const pd = inst.pads[i]; if (pd) { n.g.gain.setTargetAtTime(dbToGain(pd.vol), t, .01); n.pan.pan.setTargetAtTime(pd.pan, t, .01); } }
  }
  /** pitch bend de −1 à 1 (plage réglée sur l'instrument) */
  pitchBend(v: number, t = this.ctx.currentTime) { this.bend.offset.setTargetAtTime(v * this.inst.bend * 100, t, .005); }
  modWheel(v: number) { this.mod = v; this.update(this.inst); }
  cc(num: number, val: number, t = this.ctx.currentTime) {
    if (num === 1) this.modWheel(val / 127);
    else if (num === 64) { this.sustain = val >= 64; if (!this.sustain) { for (const p of this.sustained) this.noteOff(p, t, true); this.sustained.clear(); } }
    else if (num === 7) this.out.gain.setTargetAtTime(dbToGain(this.inst.vol) * val / 127, t, .01);
    else if (num === 120 || num === 123) this.allOff(t, num === 120);
  }
  activeVoices() { const t = this.ctx.currentTime; this.voices = this.voices.filter(v => v.end > t); return this.voices.length; }
  /** joue une note (instruments) ou un pad (batterie : note 36 = pad 1) */
  noteOn(p: number, v: number, t: number, dur?: number) {
    const I = this.inst; t = Math.max(t, this.ctx.currentTime);
    if (I.type === 'none') return;
    if (I.type === 'drums') { this.hit(p - 36, v, t, dur); return; }
    const poly = Math.max(1, I.poly);
    if (poly === 1 && I.glide > 0) { const cur = this.voices.find(x => !x.released && x.end > t && x.legato); if (cur) { cur.legato!(p, t); cur.p = p; this.lastP = p; if (dur != null) this.noteOff(p, t + dur); return; } }
    const live = this.voices.filter(x => x.end > t && x.off > t);
    if (live.length >= poly) { live.sort((a, b) => a.t0 - b.t0); for (const x of live.slice(0, live.length - poly + 1)) this.kill(x, t); }
    const vc = I.type === 'sampler' ? this.sampleVoice(p, v, t) : this.synthVoice(p, v, t);
    if (!vc) return; this.voices.push(vc); this.lastP = p; this.peakVoices = Math.max(this.peakVoices, this.voices.length);
    if (dur != null) this.release(vc, t + Math.max(.01, dur));
  }
  noteOff(p: number, t = this.ctx.currentTime, force = false) {
    if (this.inst.type === 'drums') return;
    if (this.sustain && !force) { this.sustained.add(p); return; }
    for (const v of this.voices) if (v.p === p && !v.released && v.t0 <= t + 1e-6) { this.release(v, Math.max(t, v.t0 + .005)); }
  }
  allOff(t = this.ctx.currentTime, hard = false) { for (const v of this.voices) if (hard) this.kill(v, t); else if (!v.released) this.release(v, t); this.sustained.clear(); }
  dispose() { this.allOff(this.ctx.currentTime, true); try { this.bend.stop(); this.lfo.stop(); this.out.disconnect(); } catch { /* déjà arrêté */ } for (const n of this.padNodes.values()) { try { n.g.disconnect(); n.pan.disconnect(); } catch { /* rien */ } } }
  private release(v: Voice, t: number) {
    v.released = true; v.off = t; releaseAt(v.amp.gain, t, v.rel, 0); v.end = t + Math.max(.01, v.rel.r) * 1.4 + .05;
    for (const n of v.nodes) try { n.stop(v.end); } catch { /* déjà programmé */ }
  }
  private kill(v: Voice, t: number) { v.released = true; v.off = t; v.amp.gain.cancelAndHoldAtTime(t); v.amp.gain.setTargetAtTime(0, t, .004); v.end = t + .03; for (const n of v.nodes) try { n.stop(v.end); } catch { /* rien */ } }

  private synthVoice(p: number, v: number, t: number): Voice {
    const links: [AudioNode, AudioParam][] = [], L = (a: AudioNode, prm: AudioParam) => { a.connect(prm); links.push([a, prm]); };
    const I = this.inst, ctx = this.ctx, amp = ctx.createGain(), trem = ctx.createGain(), pan = ctx.createStereoPanner(), mix = ctx.createGain(), nodes: AudioScheduledSourceNode[] = [];
    amp.gain.value = 0; trem.gain.value = 1;
    const flt = ctx.createBiquadFilter(); flt.type = I.flt.type; flt.Q.value = I.flt.res;
    const cut = Math.min(20000, I.flt.cut * Math.pow(2, (p - 60) / 12 * I.flt.key)), vg = velGain(v);
    flt.frequency.cancelScheduledValues(t); adsr(flt.frequency, t, I.fenv, cut, Math.min(20000, Math.max(20, cut + I.flt.env * (.4 + .6 * vg))));
    mix.connect(flt); flt.connect(amp); amp.connect(trem); trem.connect(pan); pan.connect(this.out);
    const startF = I.glide > 0 && this.lastP >= 0 ? hz(this.lastP) : hz(p), oscs: OscillatorNode[] = [];
    const glideTo = (osc: OscillatorNode, mult: number, to: number, at: number) => { osc.frequency.cancelScheduledValues(at); osc.frequency.setValueAtTime(osc.frequency.value, at); osc.frequency.setTargetAtTime(hz(to) * mult, at, Math.max(.001, I.glide) / 3); };
    if (I.type === 'fm') {
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(); car.type = 'sine'; mod.setPeriodicWave(fbWave(ctx, I.fm.fb));
      car.frequency.setValueAtTime(startF, t); mod.frequency.setValueAtTime(startF * I.fm.ratio, t); if (startF !== hz(p)) { glideTo(car, 1, p, t); glideTo(mod, I.fm.ratio, p, t); }
      const idx = I.fm.index * hz(p) * (.3 + .7 * vg); adsr(mg.gain, t, I.fm.env, 0, idx); mod.connect(mg); mg.connect(car.frequency);
      if (I.fm.index2 > 0) { const m2 = ctx.createOscillator(), g2 = ctx.createGain(); m2.frequency.setValueAtTime(hz(p) * I.fm.ratio2, t); g2.gain.value = I.fm.index2 * hz(p) * I.fm.ratio; m2.connect(g2); g2.connect(mod.frequency); L(this.bend, m2.detune); m2.start(t); nodes.push(m2); }
      car.connect(mix); for (const o of [car, mod]) { L(this.bend, o.detune); o.start(t); nodes.push(o); oscs.push(o); }
      if (I.lfo.dest === 'pitch') { L(this.lfoAmt, car.detune); L(this.lfoAmt, mod.detune); }
    } else {
      const add = (o: Osc, wave?: PeriodicWave, extraGain?: GainNode) => {
        if (o.lvl <= 0) return; const uni = Math.max(1, Math.min(7, Math.round(I.uni))), g = ctx.createGain(); g.gain.value = o.lvl / Math.sqrt(uni); (extraGain || g).connect(mix); if (extraGain) g.connect(extraGain);
        for (let u = 0; u < uni; u++) {
          const osc = ctx.createOscillator(), spread = uni > 1 ? (u / (uni - 1) - .5) * 2 * I.det : 0, mult = Math.pow(2, o.oct + o.semi / 12);
          if (wave) osc.setPeriodicWave(wave); else if (o.wave !== 'noise') osc.type = o.wave;
          osc.frequency.setValueAtTime(startF * mult, t); if (startF !== hz(p)) glideTo(osc, mult, p, t);
          osc.detune.value = o.fine + spread; L(this.bend, osc.detune); if (I.lfo.dest === 'pitch') L(this.lfoAmt, osc.detune);
          osc.connect(g); osc.start(t); nodes.push(osc); oscs.push(osc); (osc as OscillatorNode & { mult?: number }).mult = mult;
        }
      };
      if (I.type === 'wave') {
        // table d'ondes : deux positions mélangées, l'enveloppe déplace le mélange
        const a = Math.max(0, Math.min(1, I.wave.pos)), b = Math.max(0, Math.min(1, I.wave.pos + I.wave.env)), ga = ctx.createGain(), gb = ctx.createGain();
        add({ ...I.o1, wave: 'sine' }, tableWave(ctx, I.wave.table, a), ga); add({ ...I.o1, wave: 'sine' }, tableWave(ctx, I.wave.table, b), gb);
        ga.gain.setValueAtTime(1, t); gb.gain.setValueAtTime(0, t); if (b !== a) { ga.gain.setTargetAtTime(0, t, Math.max(.01, I.fenv.d) / 2); gb.gain.setTargetAtTime(1, t, Math.max(.01, I.fenv.d) / 2); }
        if (I.o2.lvl > 0) add(I.o2);
      } else { if (I.o1.wave !== 'noise') add(I.o1); if (I.o2.wave !== 'noise') add(I.o2); }
      const nz = I.noise + (I.o1.wave === 'noise' ? I.o1.lvl : 0) + (I.o2.wave === 'noise' ? I.o2.lvl : 0);
      if (nz > 0) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = noiseBuf(ctx); s.loop = true; g.gain.value = nz * .5; s.connect(g); g.connect(mix); s.start(t, Math.random()); nodes.push(s); }
    }
    if (I.lfo.dest === 'cut') L(this.lfoAmt, flt.detune); else if (I.lfo.dest === 'amp') L(this.lfoAmt, trem.gain); else if (I.lfo.dest === 'pan') L(this.lfoAmt, pan.pan);
    adsr(amp.gain, t, I.aenv, 0, vg * .5);
    const vc: Voice = { p, t0: t, end: Infinity, off: Infinity, nodes, amp, flt, rel: I.aenv, choke: 0, pad: -1, released: false };
    vc.legato = (np, at) => { for (const o of oscs) { const m = (o as OscillatorNode & { mult?: number }).mult ?? (o === oscs[1] && I.type === 'fm' ? I.fm.ratio : 1); glideTo(o, m, np, at); } };
    nodes[0]?.addEventListener('ended', () => { unlink(links); try { amp.disconnect(); trem.disconnect(); pan.disconnect(); mix.disconnect(); flt.disconnect(); } catch { /* rien */ } });
    return vc;
  }
  private zoneFor(p: number, v: number): Zone[] { return this.inst.zones.filter(z => p >= z.lo && p <= z.hi && v >= z.vlo && v <= z.vhi); }
  private sampleVoice(p: number, v: number, t: number): Voice | null {
    const I = this.inst, ctx = this.ctx, zs = this.zoneFor(p, v); if (!zs.length) return null;
    const links: [AudioNode, AudioParam][] = [], L = (a: AudioNode, prm: AudioParam) => { a.connect(prm); links.push([a, prm]); };
    const amp = ctx.createGain(), flt = ctx.createBiquadFilter(), nodes: AudioScheduledSourceNode[] = [], vg = velGain(v); amp.gain.value = 0;
    flt.type = I.flt.type; flt.Q.value = I.flt.res; const cut = Math.min(20000, I.flt.cut * Math.pow(2, (p - 60) / 12 * I.flt.key)); adsr(flt.frequency, t, I.fenv, cut, Math.min(20000, Math.max(20, cut + I.flt.env * vg)));
    flt.connect(amp); amp.connect(this.out);
    for (const z of zs) {
      const b0 = this.bufs.get(z.asset); if (!b0) continue; const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = z.loop && z.le > z.ls ? loopBuffer(ctx, b0, z.ls, z.le, z.xf) : b0; s.playbackRate.value = Math.pow(2, (p - z.root + z.tune / 100) / 12);
      if (z.loop && z.le > z.ls) { s.loop = true; s.loopStart = z.ls; s.loopEnd = Math.min(z.le, b0.duration); }
      L(this.bend, s.detune); if (I.lfo.dest === 'pitch') L(this.lfoAmt, s.detune);
      g.gain.value = dbToGain(z.gain); s.connect(g); g.connect(flt); s.start(t); nodes.push(s);
    }
    if (!nodes.length) return null;
    adsr(amp.gain, t, I.aenv, 0, vg * .9);
    nodes[0].addEventListener('ended', () => { unlink(links); try { amp.disconnect(); flt.disconnect(); } catch { /* rien */ } });
    const vc: Voice = { p, t0: t, end: Infinity, off: Infinity, nodes, amp, flt, rel: I.aenv, choke: 0, pad: -1, released: false };
    if (!zs.some(z => z.loop)) { const longest = Math.max(...nodes.map(n => ((n as AudioBufferSourceNode).buffer?.duration || 0) / (n as AudioBufferSourceNode).playbackRate.value)); vc.end = t + longest + .05; }
    return vc;
  }
  private padOut(i: number, pd: Pad) {
    let n = this.padNodes.get(i); if (n) return n;
    n = { g: this.ctx.createGain(), pan: this.ctx.createStereoPanner() }; n.g.gain.value = dbToGain(pd.vol); n.pan.pan.value = pd.pan; n.g.connect(n.pan); n.pan.connect(pd.out ? this.padDest(pd) : this.out);
    this.padNodes.set(i, n); return n;
  }
  /** change la sortie d'un pad (sortie séparée vers un bus) */
  reroutePad(i: number) { const n = this.padNodes.get(i), pd = this.inst.pads[i]; if (!n || !pd) return; try { n.pan.disconnect(); } catch { /* rien */ } n.pan.connect(pd.out ? this.padDest(pd) : this.out); }
  /** frappe un pad de la boîte à rythmes */
  hit(i: number, v: number, t: number, len?: number) {
    const pd = this.inst.pads[i]; if (!pd) return; const b = this.bufs.get(pd.asset); if (!b) return; const ctx = this.ctx;
    const links: [AudioNode, AudioParam][] = [], L = (a: AudioNode, prm: AudioParam) => { a.connect(prm); links.push([a, prm]); };
    if (pd.choke) for (const x of this.voices) if (x.choke === pd.choke && x.end > t && x.pad !== i) this.kill(x, t);
    const s = ctx.createBufferSource(), amp = ctx.createGain(); s.buffer = b; s.playbackRate.value = Math.pow(2, pd.tune / 12); L(this.bend, s.detune);
    const vg = velGain(v); amp.gain.setValueAtTime(vg, t);
    const full = b.duration / s.playbackRate.value, dec = pd.decay > 0 ? Math.min(full, pd.decay) : full;
    if (pd.decay > 0) amp.gain.setTargetAtTime(0, t + dec * .6, dec * .15);
    s.connect(amp); amp.connect(this.padOut(i, pd).g); s.start(t); const end = t + dec + .02; s.stop(end + .2);
    s.addEventListener('ended', () => { unlink(links); try { amp.disconnect(); } catch { /* rien */ } });
    this.voices.push({ p: 36 + i, t0: t, end: end + .2, off: end, nodes: [s], amp, flt: null, rel: { a: 0, d: 0, s: 1, r: .01 }, choke: pd.choke, pad: i, released: true });
    void len;
  }
}

/* ---------- arpégiateur : à partir des notes tenues, produit les notes d'une fenêtre de temps (en temps) ---------- */
export interface Held { p: number; v: number; at: number }
export function arpOrder(held: Held[], a: Arp): Held[] {
  const base = a.mode === 'order' ? [...held].sort((x, y) => x.at - y.at) : [...held].sort((x, y) => x.p - y.p), seq: Held[] = [];
  for (let o = 0; o < Math.max(1, a.oct); o++) for (const h of base) seq.push({ ...h, p: h.p + 12 * o });
  if (a.mode === 'down') seq.reverse();
  if (a.mode === 'updown' && seq.length > 2) return [...seq, ...seq.slice(1, -1).reverse()];
  return seq;
}
/** notes d'arpège entre deux positions (temps) : rate = nombre de notes par temps */
export function arpNotes(held: Held[], a: Arp, from: number, to: number, seed = 1): { p: number; v: number; t: number; d: number }[] {
  if (!held.length) return []; const step = 1 / Math.max(.25, a.rate), out: { p: number; v: number; t: number; d: number }[] = [], seq = arpOrder(held, a);
  let k = Math.ceil(from / step - 1e-9);
  for (; k * step < to; k++) {
    const t = k * step + (k % 2 ? a.swing * step * .5 : 0); if (t < from || t >= to) continue;
    if (a.mode === 'chord') { for (const h of held) out.push({ p: h.p, v: h.v, t, d: step * a.gate }); continue; }
    const i = a.mode === 'random' ? Math.floor(((Math.sin((k + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1 * seq.length) : ((k % seq.length) + seq.length) % seq.length;
    const h = seq[i]; out.push({ p: h.p, v: h.v, t, d: step * a.gate });
  }
  return out;
}

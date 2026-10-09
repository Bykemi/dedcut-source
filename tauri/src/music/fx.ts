// DedCut Musique — effets audio. Chaque effet est un petit graphe Web Audio (nœuds natifs, ou traitements AudioWorklet)
// avec une entrée, une sortie et des réglages décrits (pour l'interface, l'automation et les préréglages).
import type { Fx } from './model';
import { dbToGain } from './model';

export interface ParamDef { k: string; min: number; max: number; step: number; def: number; unit?: string; log?: boolean; sync?: boolean }
export const FX_DEFS: Record<string, { cat: string; params: ParamDef[] }> = {
  eq: { cat: 'eq', params: [
    { k: 'hp', min: 20, max: 1000, step: 1, def: 20, unit: 'Hz', log: true }, { k: 'lf', min: 40, max: 500, step: 1, def: 120, unit: 'Hz', log: true }, { k: 'lg', min: -18, max: 18, step: .1, def: 0, unit: 'dB' },
    { k: 'm1f', min: 150, max: 4000, step: 1, def: 500, unit: 'Hz', log: true }, { k: 'm1g', min: -18, max: 18, step: .1, def: 0, unit: 'dB' }, { k: 'm1q', min: .3, max: 8, step: .05, def: 1 },
    { k: 'm2f', min: 600, max: 12000, step: 1, def: 2500, unit: 'Hz', log: true }, { k: 'm2g', min: -18, max: 18, step: .1, def: 0, unit: 'dB' }, { k: 'm2q', min: .3, max: 8, step: .05, def: 1 },
    { k: 'hf', min: 2000, max: 16000, step: 1, def: 8000, unit: 'Hz', log: true }, { k: 'hg', min: -18, max: 18, step: .1, def: 0, unit: 'dB' }, { k: 'lp', min: 1000, max: 20000, step: 1, def: 20000, unit: 'Hz', log: true }] },
  comp: { cat: 'dyn', params: [{ k: 'thr', min: -60, max: 0, step: .5, def: -18, unit: 'dB' }, { k: 'ratio', min: 1, max: 20, step: .1, def: 4 }, { k: 'att', min: .0005, max: .2, step: .0005, def: .01, unit: 's' }, { k: 'rel', min: .02, max: 1.5, step: .01, def: .15, unit: 's' }, { k: 'knee', min: 0, max: 18, step: .5, def: 6, unit: 'dB' }, { k: 'makeup', min: 0, max: 24, step: .1, def: 0, unit: 'dB' }] },
  limit: { cat: 'dyn', params: [{ k: 'ceil', min: -12, max: 0, step: .1, def: -1, unit: 'dB' }, { k: 'gain', min: 0, max: 24, step: .1, def: 0, unit: 'dB' }, { k: 'rel', min: .01, max: .5, step: .005, def: .08, unit: 's' }] },
  gate: { cat: 'dyn', params: [{ k: 'thr', min: -80, max: 0, step: .5, def: -45, unit: 'dB' }, { k: 'range', min: -80, max: 0, step: .5, def: -60, unit: 'dB' }, { k: 'ratio', min: 0, max: 6, step: .1, def: 0 }, { k: 'att', min: .0005, max: .05, step: .0005, def: .002, unit: 's' }, { k: 'hold', min: 0, max: .5, step: .005, def: .05, unit: 's' }, { k: 'rel', min: .01, max: 1, step: .01, def: .12, unit: 's' }] },
  deess: { cat: 'dyn', params: [{ k: 'freq', min: 3000, max: 12000, step: 10, def: 6500, unit: 'Hz', log: true }, { k: 'thr', min: -50, max: 0, step: .5, def: -28, unit: 'dB' }, { k: 'range', min: -24, max: 0, step: .5, def: -10, unit: 'dB' }] },
  mbcomp: { cat: 'dyn', params: [{ k: 'x1', min: 60, max: 600, step: 1, def: 200, unit: 'Hz', log: true }, { k: 'x2', min: 800, max: 8000, step: 10, def: 3000, unit: 'Hz', log: true }, { k: 'thr', min: -40, max: 0, step: .5, def: -18, unit: 'dB' }, { k: 'ratio', min: 1, max: 10, step: .1, def: 3 }, { k: 'lo', min: -12, max: 12, step: .1, def: 0, unit: 'dB' }, { k: 'mid', min: -12, max: 12, step: .1, def: 0, unit: 'dB' }, { k: 'hi', min: -12, max: 12, step: .1, def: 0, unit: 'dB' }] },
  dyneq: { cat: 'dyn', params: [{ k: 'freq', min: 100, max: 12000, step: 1, def: 3000, unit: 'Hz', log: true }, { k: 'q', min: .3, max: 6, step: .05, def: 1.5 }, { k: 'thr', min: -50, max: 0, step: .5, def: -24, unit: 'dB' }, { k: 'range', min: -18, max: 0, step: .5, def: -8, unit: 'dB' }] },
  reverb: { cat: 'space', params: [{ k: 'size', min: .2, max: 8, step: .05, def: 2.2, unit: 's' }, { k: 'pre', min: 0, max: .2, step: .002, def: .02, unit: 's' }, { k: 'damp', min: 1000, max: 16000, step: 50, def: 6000, unit: 'Hz', log: true }, { k: 'width', min: 0, max: 1, step: .01, def: 1 }, { k: 'mix', min: 0, max: 1, step: .01, def: .25 }] },
  delay: { cat: 'space', params: [{ k: 'time', min: .01, max: 2, step: .001, def: .375, unit: 's' }, { k: 'sync', min: 0, max: 8, step: 1, def: 3, sync: true }, { k: 'fb', min: 0, max: .95, step: .01, def: .35 }, { k: 'tone', min: 800, max: 16000, step: 50, def: 5000, unit: 'Hz', log: true }, { k: 'ping', min: 0, max: 1, step: 1, def: 0 }, { k: 'mix', min: 0, max: 1, step: .01, def: .25 }] },
  chorus: { cat: 'mod', params: [{ k: 'rate', min: .05, max: 5, step: .01, def: .8, unit: 'Hz' }, { k: 'depth', min: 0, max: .01, step: .0001, def: .003, unit: 's' }, { k: 'delay', min: .005, max: .04, step: .0005, def: .015, unit: 's' }, { k: 'mix', min: 0, max: 1, step: .01, def: .4 }] },
  flanger: { cat: 'mod', params: [{ k: 'rate', min: .05, max: 3, step: .01, def: .25, unit: 'Hz' }, { k: 'depth', min: 0, max: .005, step: .0001, def: .002, unit: 's' }, { k: 'fb', min: -.95, max: .95, step: .01, def: .5 }, { k: 'mix', min: 0, max: 1, step: .01, def: .5 }] },
  phaser: { cat: 'mod', params: [{ k: 'rate', min: .05, max: 4, step: .01, def: .4, unit: 'Hz' }, { k: 'base', min: 200, max: 2000, step: 10, def: 600, unit: 'Hz', log: true }, { k: 'depth', min: 0, max: 3000, step: 10, def: 1200, unit: 'Hz' }, { k: 'stages', min: 2, max: 8, step: 2, def: 4 }, { k: 'mix', min: 0, max: 1, step: .01, def: .5 }] },
  trem: { cat: 'mod', params: [{ k: 'rate', min: .1, max: 16, step: .1, def: 5, unit: 'Hz' }, { k: 'depth', min: 0, max: 1, step: .01, def: .5 }, { k: 'pan', min: 0, max: 1, step: 1, def: 0 }] },
  sat: { cat: 'color', params: [{ k: 'drive', min: 0, max: 40, step: .5, def: 8, unit: 'dB' }, { k: 'type', min: 0, max: 3, step: 1, def: 0 }, { k: 'tone', min: 1000, max: 18000, step: 50, def: 9000, unit: 'Hz', log: true }, { k: 'out', min: -24, max: 6, step: .1, def: -4, unit: 'dB' }, { k: 'mix', min: 0, max: 1, step: .01, def: 1 }] },
  amp: { cat: 'color', params: [{ k: 'gain', min: 0, max: 48, step: .5, def: 20, unit: 'dB' }, { k: 'bass', min: -12, max: 12, step: .1, def: 2, unit: 'dB' }, { k: 'mid', min: -12, max: 12, step: .1, def: 0, unit: 'dB' }, { k: 'treble', min: -12, max: 12, step: .1, def: 1, unit: 'dB' }, { k: 'cab', min: 0, max: 2, step: 1, def: 1 }, { k: 'out', min: -36, max: 6, step: .1, def: -10, unit: 'dB' }] },
  crush: { cat: 'color', params: [{ k: 'bits', min: 2, max: 16, step: 1, def: 8 }, { k: 'down', min: 1, max: 32, step: 1, def: 4 }, { k: 'mix', min: 0, max: 1, step: .01, def: 1 }] },
  pitch: { cat: 'creative', params: [{ k: 'semi', min: -12, max: 12, step: .1, def: 0 }, { k: 'mix', min: 0, max: 1, step: .01, def: 1 }] },
  denoise: { cat: 'repair', params: [{ k: 'amount', min: 0, max: 1, step: .01, def: .8 }] },
  dehum: { cat: 'repair', params: [{ k: 'freq', min: 50, max: 60, step: 10, def: 50, unit: 'Hz' }, { k: 'harm', min: 1, max: 6, step: 1, def: 4 }, { k: 'q', min: 5, max: 60, step: 1, def: 30 }] },
  declick: { cat: 'repair', params: [{ k: 'sens', min: 0, max: 1, step: .01, def: .5 }] },
  util: { cat: 'util', params: [{ k: 'gain', min: -36, max: 24, step: .1, def: 0, unit: 'dB' }, { k: 'width', min: 0, max: 2, step: .01, def: 1 }, { k: 'mono', min: 0, max: 1, step: 1, def: 0 }, { k: 'phaseL', min: 0, max: 1, step: 1, def: 0 }, { k: 'phaseR', min: 0, max: 1, step: 1, def: 0 }] }
};
export const FX_TYPES = Object.keys(FX_DEFS);
export const SYNC_NOTES = [1 / 16, 1 / 8, 3 / 16, 1 / 4, 3 / 8, 1 / 2, 3 / 4, 1, 2]; // en temps (noires) : 1/64 … 2 temps
export function newFx(id: number, type: string): Fx { const p: Record<string, number> = {}; for (const d of FX_DEFS[type]?.params || []) p[d.k] = d.def; return { id, type, on: true, p }; }

/* ---------- réponse impulsionnelle de réverbération, calculée (originale) ---------- */
const irCache = new Map<string, AudioBuffer>();
export function impulse(ctx: BaseAudioContext, size: number, damp: number, width: number): AudioBuffer {
  const key = [ctx.sampleRate, size.toFixed(2), Math.round(damp), width.toFixed(2)].join('|'); const c = irCache.get(key); if (c && c.sampleRate === ctx.sampleRate) return c;
  const sr = ctx.sampleRate, n = Math.max(1, Math.floor(sr * size)), b = ctx.createBuffer(2, n, sr);
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  const L = b.getChannelData(0), R = b.getChannelData(1), a = Math.exp(-2 * Math.PI * damp / sr); let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, dec = Math.pow(1 - i / n, 2) * Math.exp(-3 * t / size), x = rnd(), y = rnd() * width + x * (1 - width);
    // amortissement des aigus qui augmente avec le temps (pièce réelle)
    const k = a + (1 - a) * Math.min(1, t / size); lp1 = lp1 * k + x * (1 - k); lp2 = lp2 * k + y * (1 - k);
    L[i] = lp1 * dec * (i < sr * .003 ? i / (sr * .003) : 1); R[i] = lp2 * dec * (i < sr * .003 ? i / (sr * .003) : 1);
  }
  irCache.set(key, b); return b;
}
function cabinet(ctx: BaseAudioContext, kind: number): AudioBuffer {
  // enceinte : bande passante 80 Hz – 5 kHz avec résonances, réponse courte calculée
  const sr = ctx.sampleRate, n = Math.floor(sr * .02), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  const peaks = kind === 0 ? [[110, .6], [1800, .5], [3800, .35]] : kind === 1 ? [[95, .7], [1200, .45], [2600, .5]] : [[140, .5], [2200, .6], [4200, .3]];
  for (let i = 0; i < n; i++) { const t = i / sr, e = Math.exp(-t * 380); let s = 0; for (const [f, g] of peaks) s += Math.sin(2 * Math.PI * f * t) * g; d[i] = s * e * (1 - i / n); }
  // aucune fréquence n'est amplifiée (gain maximal 0 dB) : avant, les résonances montaient le son de +20 dB
  let top = 0;
  for (let k = 0; k < 160; k++) { const f = 40 * Math.pow(12000 / 40, k / 159), w = 2 * Math.PI * f / sr; let re = 0, im = 0; for (let i = 0; i < n; i++) { re += d[i] * Math.cos(w * i); im += d[i] * Math.sin(w * i); } top = Math.max(top, Math.hypot(re, im)); }
  if (top > 0) for (let i = 0; i < n; i++) d[i] /= top; return b;
}
const curves = new Map<string, Float32Array>();
function shaper(type: number, drive: number): Float32Array {
  const key = type + '|' + drive.toFixed(1); const c = curves.get(key); if (c) return c;
  const n = 2048, k = Math.pow(10, drive / 20), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1) * 2 - 1, y = x * k;
    o[i] = type === 0 ? Math.tanh(y) : type === 1 ? Math.max(-1, Math.min(1, y)) : type === 2 ? (y >= 0 ? Math.tanh(y) : Math.tanh(y * .6) * .9) : Math.sign(y) * (1 - Math.exp(-Math.abs(y * 1.5)));
  }
  curves.set(key, o); return o;
}

export interface FxNode { inp: AudioNode; out: AudioNode; params: Record<string, AudioParam | ((v: number) => void)>; latency: number; dispose(): void; now: () => number; port?: MessagePort; side?: AudioNode; filters?: BiquadFilterNode[]; missing?: boolean }
const setP = (p: AudioParam | ((v: number) => void), v: number, now: number) => { if (typeof p === 'function') p(v); else p.setTargetAtTime(v, now, .01); };
export function applyParams(n: FxNode, fx: Fx) { const t = n.now(); for (const [k, v] of Object.entries(fx.p)) { const p = n.params[k]; if (p) setP(p, v, t); } }
/** construit un effet ; bpm sert aux délais synchronisés au tempo */
export function buildFx(ctx: BaseAudioContext, fx: Fx, bpm = 120): FxNode {
  const g = () => ctx.createGain(), bq = (type: BiquadFilterType, f: number, q = .707, gain = 0) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; return b; };
  const wk = (name: string, opts: AudioWorkletNodeOptions = {}) => new AudioWorkletNode(ctx, name, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], ...opts });
  const p = fx.p, nodes: AudioNode[] = [];
  const done = (inp: AudioNode, out: AudioNode, params: FxNode['params'], latency = 0, extra: Partial<FxNode> = {}): FxNode => ({ inp, out, params, latency, ...extra, now: () => ctx.currentTime, dispose: () => { for (const x of [inp, out, ...nodes]) try { x.disconnect(); } catch { /* rien */ } } });
  const wetDry = (wet: AudioNode, dry: AudioNode, mix: number) => { const o = g(), w = g(), d = g(); wet.connect(w); dry.connect(d); w.connect(o); d.connect(o); w.gain.value = mix; d.gain.value = 1 - mix; nodes.push(w, d); return { o, setMix: (v: number) => { w.gain.setTargetAtTime(v, ctx.currentTime, .01); d.gain.setTargetAtTime(1 - v, ctx.currentTime, .01); } }; };
  switch (fx.type) {
    case 'eq': {
      const hp = bq('highpass', p.hp), ls = bq('lowshelf', p.lf, .707, p.lg), m1 = bq('peaking', p.m1f, p.m1q, p.m1g), m2 = bq('peaking', p.m2f, p.m2q, p.m2g), hs = bq('highshelf', p.hf, .707, p.hg), lp = bq('lowpass', p.lp);
      hp.connect(ls); ls.connect(m1); m1.connect(m2); m2.connect(hs); hs.connect(lp); nodes.push(ls, m1, m2, hs);
      return done(hp, lp, { hp: hp.frequency, lf: ls.frequency, lg: ls.gain, m1f: m1.frequency, m1g: m1.gain, m1q: m1.Q, m2f: m2.frequency, m2g: m2.gain, m2q: m2.Q, hf: hs.frequency, hg: hs.gain, lp: lp.frequency }, 0, { filters: [hp, ls, m1, m2, hs, lp] });
    }
    case 'comp': {
      const c = wk('mu-comp', { numberOfInputs: 2 }), P = (k: string) => c.parameters.get(k)!;
      const inp = g(); inp.connect(c, 0, 0); if (!fx.side) inp.connect(c, 0, 1);
      return done(inp, c, { thr: P('thr'), ratio: P('ratio'), att: P('att'), rel: P('rel'), knee: P('knee'), makeup: P('makeup') }, 0, { port: c.port, side: fx.side ? c : undefined });
    }
    case 'limit': { const l = wk('mu-limit'), P = (k: string) => l.parameters.get(k)!; return done(l, l, { ceil: P('ceil'), gain: P('gain'), rel: P('rel') }, Math.round(ctx.sampleRate * .0015), { port: l.port }); }
    case 'gate': { const n = wk('mu-gate'), P = (k: string) => n.parameters.get(k)!; return done(n, n, { thr: P('thr'), range: P('range'), ratio: P('ratio'), att: P('att'), hold: P('hold'), rel: P('rel') }); }
    case 'deess': { const n = wk('mu-deess'), P = (k: string) => n.parameters.get(k)!; return done(n, n, { freq: P('freq'), thr: P('thr'), range: P('range') }); }
    case 'mbcomp': {
      // 3 bandes (filtres Linkwitz-Riley 4e ordre), un compresseur par bande, puis somme
      const inp = g(), out = g(), lr = (type: BiquadFilterType, f: number) => { const a = bq(type, f), b = bq(type, f); a.connect(b); nodes.push(a, b); return [a, b]; };
      const [l1, l2] = lr('lowpass', p.x1), [h1, h2] = lr('highpass', p.x1), [m1, m2] = lr('lowpass', p.x2), [t1, t2] = lr('highpass', p.x2);
      inp.connect(l1); inp.connect(h1); h2.connect(m1); h2.connect(t1);
      const bands = [l2, m2, t2].map((src, i) => { const c = ctx.createDynamicsCompressor(); c.threshold.value = p.thr; c.ratio.value = p.ratio; c.attack.value = .01; c.release.value = .15; const gg = g(); gg.gain.value = dbToGain([p.lo, p.mid, p.hi][i]); src.connect(c); c.connect(gg); gg.connect(out); nodes.push(c, gg); return { c, gg }; });
      return done(inp, out, {
        x1: v => { l1.frequency.value = l2.frequency.value = h1.frequency.value = h2.frequency.value = v; }, x2: v => { m1.frequency.value = m2.frequency.value = t1.frequency.value = t2.frequency.value = v; },
        thr: v => bands.forEach(b => b.c.threshold.value = v), ratio: v => bands.forEach(b => b.c.ratio.value = v), lo: v => bands[0].gg.gain.value = dbToGain(v), mid: v => bands[1].gg.gain.value = dbToGain(v), hi: v => bands[2].gg.gain.value = dbToGain(v)
      });
    }
    case 'dyneq': {
      // l'enveloppe de la bande (traitement dans le fil audio) pilote directement le gain d'un filtre en cloche
      const inp = g(), f = bq('peaking', p.freq, p.q, 0), det = wk('mu-dynband', { outputChannelCount: [1] }), P = (k: string) => det.parameters.get(k)!;
      inp.connect(f); inp.connect(det); det.connect(f.gain); nodes.push(det);
      return done(inp, f, { freq: v => { f.frequency.value = v; P('freq').value = v; }, q: v => { f.Q.value = v; P('q').value = v; }, thr: P('thr'), range: P('range') });
    }
    case 'reverb': {
      const inp = g(), pre = ctx.createDelay(1), cv = ctx.createConvolver(); pre.delayTime.value = p.pre; cv.buffer = impulse(ctx, p.size, p.damp, p.width);
      inp.connect(pre); pre.connect(cv); nodes.push(pre, cv); const m = wetDry(cv, inp, p.mix);
      const rebuild = () => { cv.buffer = impulse(ctx, fx.p.size, fx.p.damp, fx.p.width); };
      return done(inp, m.o, { pre: pre.delayTime, mix: m.setMix, size: rebuild, damp: rebuild, width: rebuild });
    }
    case 'delay': {
      const inp = g(), dl = ctx.createDelay(4), dr = ctx.createDelay(4), fb = g(), tone = bq('lowpass', p.tone), merger = ctx.createChannelMerger(2), split = ctx.createChannelSplitter(2);
      const time = () => fx.p.sync > 0 ? SYNC_NOTES[Math.min(SYNC_NOTES.length - 1, Math.round(fx.p.sync) - 1)] * 60 / bpm : fx.p.time;
      dl.delayTime.value = dr.delayTime.value = time(); fb.gain.value = p.fb;
      // ping-pong : la répétition passe d'un côté à l'autre
      inp.connect(dl); dl.connect(tone); tone.connect(split);
      const route = () => { for (const f of [() => split.disconnect(), () => dr.disconnect(), () => tone.disconnect(fb)]) try { f(); } catch { /* pas branché */ } if (fx.p.ping) { split.connect(merger, 0, 0); split.connect(dr, 0); dr.connect(merger, 0, 1); dr.connect(fb); } else { split.connect(merger, 0, 0); split.connect(merger, 0, 1); tone.connect(fb); } };
      route(); fb.connect(dl); nodes.push(dl, dr, fb, tone, merger, split); const m = wetDry(merger, inp, p.mix);
      return done(inp, m.o, { time: () => { dl.delayTime.value = dr.delayTime.value = time(); }, sync: () => { dl.delayTime.value = dr.delayTime.value = time(); }, fb: fb.gain, tone: tone.frequency, ping: route, mix: m.setMix });
    }
    case 'chorus': case 'flanger': {
      const inp = g(), d = ctx.createDelay(.1), lfo = ctx.createOscillator(), lg = g(), fb = g(); d.delayTime.value = fx.type === 'chorus' ? p.delay : .004; lfo.frequency.value = p.rate; lg.gain.value = p.depth;
      lfo.connect(lg); lg.connect(d.delayTime); lfo.start(); inp.connect(d); if (fx.type === 'flanger') { fb.gain.value = p.fb; d.connect(fb); fb.connect(d); }
      nodes.push(d, lfo, lg, fb); const m = wetDry(d, inp, p.mix);
      return done(inp, m.o, { rate: lfo.frequency, depth: lg.gain, delay: d.delayTime, fb: fb.gain, mix: m.setMix });
    }
    case 'phaser': {
      const inp = g(), lfo = ctx.createOscillator(), lg = g(), aps: BiquadFilterNode[] = []; lfo.frequency.value = p.rate; lg.gain.value = p.depth; lfo.connect(lg);
      let prev: AudioNode = inp; for (let i = 0; i < Math.max(2, Math.min(8, Math.round(p.stages))); i++) { const a = bq('allpass', p.base * (1 + i * .3), .7); lg.connect(a.frequency); prev.connect(a); prev = a; aps.push(a); }
      lfo.start(); nodes.push(lfo, lg, ...aps); const m = wetDry(prev, inp, p.mix);
      return done(inp, m.o, { rate: lfo.frequency, depth: lg.gain, base: v => aps.forEach((a, i) => a.frequency.value = v * (1 + i * .3)), mix: m.setMix });
    }
    case 'trem': {
      const inp = g(), split = ctx.createChannelSplitter(2), gl = g(), gr = g(), merge = ctx.createChannelMerger(2), lfo = ctx.createOscillator(), depth = g(), inv = g();
      lfo.frequency.value = p.rate; depth.gain.value = p.depth / 2; inv.gain.value = p.pan ? -1 : 1; gl.gain.value = gr.gain.value = 1 - p.depth / 2;
      inp.connect(split); split.connect(gl, 0); split.connect(gr, 1); gl.connect(merge, 0, 0); gr.connect(merge, 0, 1);
      lfo.connect(depth); depth.connect(gl.gain); depth.connect(inv); inv.connect(gr.gain); lfo.start(); nodes.push(split, gl, gr, lfo, depth, inv);
      return done(inp, merge, { rate: lfo.frequency, depth: v => { depth.gain.value = v / 2; gl.gain.value = gr.gain.value = 1 - v / 2; }, pan: v => { inv.gain.value = v ? -1 : 1; } });
    }
    case 'sat': {
      const inp = g(), ws = ctx.createWaveShaper(), tone = bq('lowpass', p.tone), out = g(); ws.curve = shaper(p.type, p.drive) as Float32Array<ArrayBuffer>; ws.oversample = '4x'; out.gain.value = dbToGain(p.out);
      inp.connect(ws); ws.connect(tone); tone.connect(out); nodes.push(ws, tone); const m = wetDry(out, inp, p.mix);
      const re = () => { ws.curve = shaper(Math.round(fx.p.type), fx.p.drive) as Float32Array<ArrayBuffer>; };
      return done(inp, m.o, { drive: re, type: re, tone: tone.frequency, out: v => out.gain.value = dbToGain(v), mix: m.setMix });
    }
    case 'amp': {
      // simulation d'ampli originale : préampli saturé, correcteur grave / médium / aigu, enceinte
      const inp = g(), pre = g(), ws = ctx.createWaveShaper(), b = bq('lowshelf', 120, .7, p.bass), m = bq('peaking', 700, .8, p.mid), t = bq('highshelf', 3200, .7, p.treble), cab = ctx.createConvolver(), out = g();
      pre.gain.value = dbToGain(p.gain); ws.curve = shaper(2, 6) as Float32Array<ArrayBuffer>; ws.oversample = '4x'; cab.normalize = false; cab.buffer = cabinet(ctx, Math.round(p.cab)); out.gain.value = dbToGain(p.out);
      inp.connect(pre); pre.connect(ws); ws.connect(b); b.connect(m); m.connect(t); t.connect(cab); cab.connect(out); nodes.push(pre, ws, b, m, t, cab);
      return done(inp, out, { gain: v => pre.gain.value = dbToGain(v), bass: b.gain, mid: m.gain, treble: t.gain, cab: v => { cab.buffer = cabinet(ctx, Math.round(v)); }, out: v => out.gain.value = dbToGain(v) });
    }
    case 'crush': { const n = wk('mu-crush'), P = (k: string) => n.parameters.get(k)!; return done(n, n, { bits: P('bits'), down: P('down'), mix: P('mix') }); }
    case 'pitch': { const n = wk('mu-pitch'), P = (k: string) => n.parameters.get(k)!; return done(n, n, { semi: P('semi'), mix: P('mix') }, Math.round(ctx.sampleRate * .025)); }
    case 'declick': { const n = wk('mu-declick'), P = (k: string) => n.parameters.get(k)!; return done(n, n, { sens: P('sens') }); }
    case 'dehum': {
      const inp = g(); let prev: AudioNode = inp; const ns: BiquadFilterNode[] = [];
      for (let h = 1; h <= 6; h++) { const n = bq('notch', p.freq * h, p.q); n.frequency.value = h <= p.harm ? p.freq * h : 22000 * .45; prev.connect(n); prev = n; ns.push(n); }
      nodes.push(...ns); const re = () => ns.forEach((n, i) => { n.frequency.value = i + 1 <= fx.p.harm ? fx.p.freq * (i + 1) : ctx.sampleRate * .45; n.Q.value = fx.p.q; });
      return done(inp, prev, { freq: re, harm: re, q: re });
    }
    case 'denoise': {
      // réduction du bruit de fond : porte douce multibande simple (le RNNoise de DedCut est réservé aux voix à 48 kHz, voir engine)
      const inp = g(), n = wk('mu-gate'), P = (k: string) => n.parameters.get(k)!; P('thr').value = -58 + 18 * p.amount; P('range').value = -6 - 20 * p.amount; P('ratio').value = 2; P('rel').value = .2;
      inp.connect(n); nodes.push(n);
      return done(inp, n, { amount: v => { P('thr').value = -58 + 18 * v; P('range').value = -6 - 20 * v; } });
    }
    default: { // util : gain, largeur stéréo, mono, inversion de phase
      const inp = g(), split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2), gl = g(), gr = g(), mid = g(), side = g(), sl = g(), sr = g(), out = g();
      // M = (L+R)/2, S = (L-R)/2 ; L' = M + w·S, R' = M − w·S
      inp.connect(split); split.connect(gl, 0); split.connect(gr, 1);
      const wl = g(), wr = g(); gl.connect(mid); gr.connect(mid); mid.gain.value = .5; gl.connect(side); gr.connect(sr); sr.gain.value = -1; sr.connect(side); side.gain.value = .5 * p.width;
      mid.connect(wl); mid.connect(wr); side.connect(wl); side.connect(sl); sl.gain.value = -1; sl.connect(wr); wl.connect(merge, 0, 0); wr.connect(merge, 0, 1); merge.connect(out); out.gain.value = dbToGain(p.gain);
      const pl = g(), pr = g(); nodes.push(split, merge, gl, gr, mid, side, sl, sr, wl, wr, pl, pr);
      const upd = () => { side.gain.value = fx.p.mono ? 0 : .5 * fx.p.width; gl.gain.value = fx.p.phaseL ? -1 : 1; gr.gain.value = fx.p.phaseR ? -1 : 1; };
      upd(); return done(inp, out, { gain: v => out.gain.value = dbToGain(v), width: upd, mono: upd, phaseL: upd, phaseR: upd });
    }
  }
}
/** courbe d'un égaliseur (dB) aux fréquences données, pour l'affichage */
export function eqCurve(ctx: BaseAudioContext, fx: Fx, freqs: Float32Array): Float32Array {
  const n = buildFx(ctx, fx), out = new Float32Array(freqs.length), mag = new Float32Array(freqs.length), ph = new Float32Array(freqs.length);
  for (const f of n.filters || []) { f.getFrequencyResponse(freqs as Float32Array<ArrayBuffer>, mag as Float32Array<ArrayBuffer>, ph as Float32Array<ArrayBuffer>); for (let i = 0; i < freqs.length; i++) out[i] += 20 * Math.log10(mag[i] || 1e-9); }
  n.dispose(); return out;
}
export { setP };

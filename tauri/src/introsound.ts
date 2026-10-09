// Son de l'animation de lancement (v4.58) : fabriqué ici avec Web Audio — aucun fichier son, rien de repris ailleurs.
// Calé sur l'animation d'index.html (#dcIntro) :
//   0 s        le logo apparaît : « whoomp » grave et souffle d'air
//   0,12-0,7 s souffle qui monte jusqu'à la coupe
//   0,44-0,7 s la lame fend l'air de droite à gauche (le son la suit d'un haut-parleur à l'autre)
//   0,70 s     la coupe : « tch » net, « tchiing » métallique, coup sourd
//   0,72-1,3 s les étincelles crépitent ; vers 1,3 s les deux morceaux se recollent (« tock » discret)
//   1 s        « DedCut » apparaît : petite note claire + accord doux en Ré (comme le D du logo), qui s'éteint avec l'animation
// La carte son est libérée (AudioContext fermé) dès la fin : rien ne reste ouvert.
const KEY = 'dedcut-intro-son';
export const introSoundOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export const setIntroSoundOn = (v: boolean) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* rien */ } };

// hasard fixe : le même son à chaque lancement
const rand = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/** Programme tout le son sur `ctx`, vers `out`. `t0` = instant de la carte son où l'animation en est à `at` secondes.
 *  Ce qui est déjà passé n'est pas joué (le son reste calé sur l'image). `short` = version courte (animations réduites). */
export function buildIntroSound(ctx: BaseAudioContext, out: AudioNode, t0: number, at: number, short: boolean) {
  const r = rand(20261008), sr = ctx.sampleRate;
  const noise = ctx.createBuffer(1, sr * 2, sr);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  // petite salle pour la réverbération
  const ir = ctx.createBuffer(2, Math.floor(sr * 1.5), sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) { const x = i / sr; d[i] = x < 0.011 ? 0 : (r() * 2 - 1) * Math.exp(-x * 4.4) * 0.5; } }
  const rev = ctx.createConvolver(); rev.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.5; rev.connect(wet).connect(out);

  const gain = (to: AudioNode, v = 0) => { const g = ctx.createGain(); g.gain.value = v; g.connect(to); return g; };
  const pan = (to: AudioNode, v: number) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(to); return p; };
  const filt = (to: AudioNode, type: BiquadFilterType, f: number, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const hiss = (to: AudioNode, t: number, dur: number, off = 0) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.connect(to); s.start(t, off); s.stop(t + dur); };
  const osc = (to: AudioNode, type: OscillatorType, f: number, t: number, dur: number) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(to); o.start(t); o.stop(t + dur); return o; };
  const send = (n: AudioNode, v: number) => { const g = ctx.createGain(); g.gain.value = v; n.connect(g).connect(rev); };
  // enveloppe : 0 → pic en `a` s → presque rien `d` s plus tard
  const env = (p: AudioParam, t: number, a: number, peak: number, d: number) => { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); };
  // instant de la carte son pour le temps `x` de l'animation ; -1 = déjà passé (plus de `late` secondes de retard)
  const when = (x: number, late = 0.03) => (x - at < -late ? -1 : Math.max(t0 + x - at, t0));

  // note claire « ti-ting » + accord doux en Ré, qui s'éteint en `end`
  const chime = (x: number, end: number) => {
    const t = when(x, 0.35); if (t < 0) return;
    const te = t0 + end - at, gc = gain(out, 1); send(gc, 0.6);
    const lp = filt(gc, 'lowpass', 2600, 0.5);
    [146.83, 220, 293.66, 369.99, 440, 659.25].forEach((f, i) => {
      const s = t + i * 0.03, v = 0.05 - i * 0.004, g = gain(pan(lp, (i % 2 ? 0.3 : -0.3) * i / 5));
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.08); g.gain.exponentialRampToValueAtTime(v * 0.45, Math.max(s + 0.2, te - 0.45)); g.gain.linearRampToValueAtTime(0, te);
      for (const k of [-1, 1]) osc(g, i < 2 ? 'triangle' : 'sine', f * (1 + k * 0.0016), s, te - s + 0.05);
    });
    [[1174.66, 0], [1760, 0.07]].forEach(([f, d]) => {
      const s = t + d, g = gain(out); env(g.gain, s, 0.003, 0.085, 1.1); send(g, 0.7);
      osc(g, 'sine', f, s, 1.2); const g2 = gain(g, 0.25); osc(g2, 'sine', f * 2.01, s, 0.5);
    });
  };
  if (short) { chime(0, 1.25); return 1.3; }

  // le logo apparaît
  { const t = when(0, 0.2); if (t >= 0) {
    const g = gain(out); env(g.gain, t, 0.02, 0.32, 0.36); send(g, 0.15);
    const o = osc(g, 'sine', 70, t, 0.5); o.frequency.exponentialRampToValueAtTime(190, t + 0.15); o.frequency.exponentialRampToValueAtTime(140, t + 0.42);
    const ga = gain(out); env(ga.gain, t, 0.06, 0.05, 0.3);
    const f = filt(ga, 'bandpass', 500, 0.9); f.frequency.exponentialRampToValueAtTime(1900, t + 0.3); hiss(f, t, 0.45, 0.3);
  } }
  // souffle qui monte jusqu'à la coupe
  if (0.7 - at > 0.2) {
    const t = when(0.12, 1), tb = t0 + 0.7 - at;
    const g = gain(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, tb - 0.015); g.gain.linearRampToValueAtTime(0, tb + 0.008);
    const hp = filt(g, 'highpass', 900, 0.6); hp.frequency.setValueAtTime(900, t); hp.frequency.exponentialRampToValueAtTime(4800, tb);
    hiss(pan(hp, -0.5), t, tb - t + 0.02, 0.1); hiss(pan(hp, 0.5), t, tb - t + 0.02, 0.9);
    const gs = gain(out); gs.gain.setValueAtTime(0.0001, t); gs.gain.exponentialRampToValueAtTime(0.09, tb - 0.02); gs.gain.linearRampToValueAtTime(0, tb + 0.008);
    const o = osc(gs, 'sine', 46, t, tb - t + 0.05); o.frequency.exponentialRampToValueAtTime(66, tb);
  }
  // la lame : de droite à gauche, de plus en plus aiguë
  { const t = when(0.44, 0.05); if (t >= 0) {
    const te = t0 + 0.7 - at, g = gain(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, te - 0.025); g.gain.exponentialRampToValueAtTime(0.0001, te + 0.06);
    const p = pan(g, 0.8); p.pan.setValueAtTime(0.8, t); p.pan.linearRampToValueAtTime(-0.8, te); send(p, 0.15);
    const bp = filt(p, 'bandpass', 1100, 1.6); bp.frequency.setValueAtTime(1100, t); bp.frequency.exponentialRampToValueAtTime(6500, te); hiss(bp, t, te - t + 0.08, 0.55);
    const gw = gain(p); gw.gain.setValueAtTime(0.0001, t); gw.gain.exponentialRampToValueAtTime(0.06, te - 0.02); gw.gain.exponentialRampToValueAtTime(0.0001, te + 0.05);
    const o = osc(gw, 'sine', 2600, t, te - t + 0.08); o.frequency.exponentialRampToValueAtTime(5200, te);
  } }
  // la coupe
  { const t = when(0.7, 0.04); if (t >= 0) {
    const gc = gain(out); env(gc.gain, t, 0.001, 0.7, 0.035); hiss(filt(gc, 'highpass', 2800), t, 0.06, 1.2);
    const gm = gain(out, 1); send(gm, 0.55);
    [[1975, 0.065, 1.1], [2963, 0.05, 0.85], [4186, 0.04, 0.7], [5588, 0.03, 0.5], [7459, 0.02, 0.35]].forEach(([f, v, d], i) => {
      for (const k of [-1, 1]) { const g = gain(pan(gm, k * 0.35)); env(g.gain, t, 0.002, v, d); osc(g, 'sine', f + k * (2 + i), t, d + 0.1); }
    });
    const gb = gain(out); env(gb.gain, t, 0.003, 0.55, 0.5); send(gb, 0.12);
    const ob = osc(gb, 'sine', 150, t, 0.6); ob.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const gn = gain(out); env(gn.gain, t, 0.002, 0.28, 0.18); hiss(filt(gn, 'lowpass', 380, 0.8), t, 0.25, 0.7);
  } }
  // les étincelles
  { const gs = gain(out, 1); send(gs, 0.35);
    for (let i = 0; i < 18; i++) {
      const x = 0.72 + Math.pow(r(), 1.7) * 0.6, v = (0.2 - (x - 0.72) * 0.22) * (0.5 + r() * 0.5), p = r() * 1.6 - 0.8, d = 0.02 + r() * 0.04, f = r();
      const t = when(x, 0); if (t < 0) continue;
      const g = gain(pan(gs, p)); env(g.gain, t, 0.0015, v, d);
      if (i % 3) hiss(filt(g, 'bandpass', 3000 + f * 6000, 5), t, d + 0.03, f * 1.5); else osc(g, 'sine', 5200 + f * 3600, t, d + 0.03);
    } }
  // les deux morceaux se recollent
  { const t = when(1.3, 0.05); if (t >= 0) {
    const g = gain(out); env(g.gain, t, 0.002, 0.12, 0.09); send(g, 0.3);
    const o = osc(g, 'sine', 820, t, 0.12); o.frequency.exponentialRampToValueAtTime(560, t + 0.04);
    const gk = gain(out); env(gk.gain, t, 0.001, 0.08, 0.02); hiss(filt(gk, 'bandpass', 2200, 1.5), t, 0.04, 0.4);
  } }
  // « DedCut » apparaît
  chime(1, 2.3);
  return 2.4;
}

/** Prépare la carte son tout de suite (elle met un petit moment à démarrer), si le réglage le permet.
 *  `play(at)` programme tout le son d'un coup quand l'animation a vraiment démarré (`at` = où elle en est, en secondes) :
 *  au démarrage, DedCut charge beaucoup de choses, donc rien n'attend après des minuteries.
 *  `hush()` le coupe en douceur (animation passée). Null si pas de son. */
export function introSoundPrepare(short: boolean): { play: (at: number) => void; hush: () => void } | null {
  if (!introSoundOn() || typeof AudioContext !== 'function') return null;
  let ctx: AudioContext;
  try { ctx = new AudioContext({ latencyHint: 'interactive' }); } catch { return null; }
  let closed = false, master: GainNode | null = null;
  const close = () => { if (closed) return; closed = true; ctx.close().catch(() => { /* rien */ }); };
  const life = setTimeout(close, 4000); // filet : jamais de carte son laissée ouverte
  const schedule = (at: number, born: number) => {
    if (closed || master) return;
    const out = ctx.createGain(); out.gain.value = 0.42;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -9; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.12;
    out.connect(lim).connect(ctx.destination); master = out;
    // instant de la carte son qu'on entend en ce moment : le son met un peu de temps à sortir des haut-parleurs
    // (horodatage de sortie quand il est fiable, sinon au moins 40 ms)
    const pn = performance.now(), ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    const heard = ts && (ts.contextTime || 0) > 0.05 && ts.performanceTime ? (ts.contextTime || 0) + (pn - ts.performanceTime) / 1000 : ctx.currentTime - Math.max(ctx.outputLatency || 0, 0.04);
    // l'image aussi met environ deux images à s'afficher : à t0 on entend le son de l'instant a0 de l'animation
    let t0 = heard + 0.03, a0 = at + (pn - born) / 1000;
    const soon = ctx.currentTime + 0.005;
    if (t0 < soon) { a0 += soon - t0; t0 = soon; }
    const end = buildIntroSound(ctx, out, t0, a0, short);
    clearTimeout(life);
    setTimeout(close, Math.max(0, t0 - ctx.currentTime + end - a0) * 1000 + 300);
  };
  return {
    play: at => {
      const born = performance.now();
      if (ctx.state === 'running') schedule(at, born);
      // lecture pas encore permise : ce qui sera passé ne sera pas joué (jamais de son décalé)
      else ctx.resume().then(() => schedule(at, born), close);
    },
    hush: () => {
      if (closed) return;
      if (master) { const g = master.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.15); }
      setTimeout(close, 220);
    },
  };
}

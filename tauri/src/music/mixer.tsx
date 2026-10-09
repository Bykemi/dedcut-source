// DedCut Musique — console de mixage : une tranche par piste (volume, panoramique, mute / solo, mesures crête / RMS,
// effets d'insert, envois pré / post vers les bus, sortie, groupe), bus, master (protection, sonie LUFS, crête, corrélation,
// spectre), scènes de mixage et comparaison A/B à niveau égal.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, askText } from './state';
import type { Fx, Project, Track } from './model';
import { clamp, deepClone, nid, trackOf } from './model';
import { wouldCycle } from './engine';
import { FX_TYPES, newFx } from './fx';
import { list as extList } from './ext';
import { loudness } from './dsp';
import { Ico } from './icons';

const fmtDb = (v: number) => v <= -60 ? '−∞' : (v > 0 ? '+' : '') + v.toFixed(1);
export const TARGETS: [string, number][] = [['stream', -14], ['podcast', -16], ['video', -14], ['broadcast', -23], ['club', -9]];

export function Mixer() {
  useMu(); const p = mu.p;
  const meters = useRef(new Map<number, { pk: HTMLDivElement | null; rms: HTMLDivElement | null; clip: HTMLButtonElement | null; db: HTMLSpanElement | null }>());
  useEffect(() => {
    let raf = 0, last = 0; const loop = (now: number) => {
      raf = requestAnimationFrame(loop); if (mu.set.lowPC && now - last < 100) return; last = now; const e = mu.eng; if (!e) return;
      for (const [id, m] of meters.current) { if (id < 0) continue; const v = e.meter(id); if (m.pk) m.pk.style.height = clamp((v.peak + 60) / 66 * 100, 0, 100) + '%'; if (m.rms) m.rms.style.height = clamp((v.rms + 60) / 66 * 100, 0, 100) + '%'; if (m.clip) m.clip.classList.toggle('on', v.clip); if (m.db) m.db.textContent = v.hold > -100 ? v.hold.toFixed(1) : '−∞'; }
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  const reg = (id: number) => (k: 'pk' | 'rms' | 'clip' | 'db') => (el: HTMLElement | null) => { const m = meters.current.get(id) || { pk: null, rms: null, clip: null, db: null }; (m as Record<string, unknown>)[k] = el; meters.current.set(id, m); };
  return <div className="mu-mixer">
    <div className="mu-strips">
      {p.tracks.map(tr => <Strip key={tr.id} tr={tr} reg={reg(tr.id)} />)}
      <button className="mu-addstrip" title={t('mu.trk.addBus')} onClick={() => mu.addTrack('bus')}><Ico n="plus" s={14} /><span>{t('mu.trk.addBus')}</span></button>
    </div>
    <Master />
  </div>;
}

/** déplacer un fader déplace aussi ceux du même groupe (même écart) */
function setVol(tr: Track, v: number) {
  const d = v - tr.vol; tr.vol = v; mu.eng?.autoInput(tr.id, 'vol', v);
  if (tr.group) for (const x of mu.p.tracks) if (x !== tr && x.group === tr.group) { x.vol = clamp(x.vol + d, -60, 12); mu.eng?.autoInput(x.id, 'vol', x.vol); }
  mu.p.dirty = true; mu.emit();
}
function Fader({ v, set, done, label }: { v: number; set: (v: number) => void; done: () => void; label: string }) {
  // échelle : 0 dB aux trois quarts, −60 dB en bas, +12 dB en haut
  const toPos = (db: number) => db >= 0 ? .75 + db / 12 * .25 : .75 * Math.pow((db + 60) / 60, 1.6), toDb = (x: number) => x >= .75 ? (x - .75) / .25 * 12 : 60 * Math.pow(x / .75, 1 / 1.6) - 60;
  const down = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement, rc = el.getBoundingClientRect(); el.setPointerCapture(e.pointerId);
    if (e.detail === 2) { set(0); done(); return; }
    const y0 = e.clientY, p0 = toPos(v), fine = e.shiftKey;
    const mv = (ev: PointerEvent) => { const x = clamp(p0 + (y0 - ev.clientY) / rc.height * (fine ? .2 : 1), 0, 1); set(Math.round(toDb(x) * 10) / 10); };
    const u = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', u); done(); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', u);
  };
  return <div className="mu-fader" role="slider" aria-label={label} aria-valuemin={-60} aria-valuemax={12} aria-valuenow={v} tabIndex={0} onPointerDown={down}
    onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); set(clamp(v + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? .1 : 1), -60, 12)); done(); } }}
    title={label + ' · ' + t('mu.mix.faderTip')}>
    <i className="mu-f0" style={{ bottom: '75%' }} /><b style={{ bottom: `calc(${toPos(v) * 100}% - 7px)` }} />
  </div>;
}
function Meter({ reg, id }: { reg: (k: 'pk' | 'rms' | 'clip' | 'db') => (el: HTMLElement | null) => void; id: number }) {
  return <div className="mu-meter"><div className="mu-mbar"><div className="rms" ref={reg('rms')} /><div className="pk" ref={reg('pk')} /></div>
    <button className="mu-clipled" ref={reg('clip') as (el: HTMLButtonElement | null) => void} title={t('mu.mix.clipReset')} onClick={() => { const s = mu.eng?.strips.get(id); if (s) { s.clip = false; s.hold = -120; } }} /></div>;
}
function Strip({ tr, reg }: { tr: Track; reg: (k: 'pk' | 'rms' | 'clip' | 'db') => (el: HTMLElement | null) => void }) {
  const p = mu.p, buses = p.tracks.filter(x => x.kind === 'bus' && x.id !== tr.id), sel = mu.sel.track === tr.id;
  const tog = (k: 'mute' | 'solo' | 'arm' | 'phase', label: string) => () => mu.act(label, q => { const x = trackOf(q, tr.id); if (x) x[k] = !x[k]; });
  const route = (out: number) => { if (out && wouldCycle(p, tr.id, out)) { toast(t('mu.mix.cycle')); return; } mu.act('mu.h.route', () => { tr.out = out; }); };
  return <div className={'mu-strip' + (sel ? ' sel' : '') + (tr.kind === 'bus' ? ' bus' : '')} style={{ ['--tc' as string]: tr.color }} onPointerDown={() => { if (mu.sel.track !== tr.id) mu.selectTrack(tr.id); }}>
    <div className="mu-sname" title={tr.name}><i />{tr.name}</div>
    <div className="mu-inserts">
      {tr.fx.map(f => <div key={f.id} className={'mu-ins' + (f.on ? '' : ' off')} title={t('mu.mix.insTip')}>
        <button className="mu-ib" title={t('mu.fx.bypass')} onClick={e => { e.stopPropagation(); mu.act('mu.h.fxOn', () => { f.on = !f.on; }); }}><i className={f.on ? 'on' : ''} /></button>
        <span onClick={() => { mu.selectTrack(tr.id); mu.view.tab = 'fx'; mu.fxSel = { master: false, id: f.id }; mu.emit(); }}>{fxName(f)}</span></div>)}
      <AddFx tr={tr} />
    </div>
    {tr.kind !== 'bus' && buses.length > 0 && <div className="mu-sends">
      {tr.sends.map((s, i) => { const b = trackOf(p, s.bus); return <div key={i} className="mu-send" title={t('mu.mix.sendTip')}>
        <button className={'mu-tb' + (s.on ? ' on' : '')} onClick={() => mu.act('mu.h.send', () => { s.on = !s.on; })}>{(b?.name || '?').slice(0, 6)}</button>
        <input type="range" min={-60} max={6} step={.5} value={s.db} aria-label={t('mu.mix.send')} onChange={e => { s.db = +e.target.value; mu.eng?.autoInput(tr.id, 'send:' + s.bus, s.db); mu.emit(); }} onPointerUp={() => mu.act('mu.h.send', () => { /* appliqué */ })} />
        <button className={'mu-tb' + (s.pre ? ' on' : '')} title={t('mu.mix.preTip')} onClick={() => mu.act('mu.h.send', () => { s.pre = !s.pre; })}>{s.pre ? t('mu.mix.pre') : t('mu.mix.post')}</button>
      </div>; })}
      <select value="" title={t('mu.mix.addSend')} onChange={e => { const b = +e.target.value; if (!b) return; if (wouldCycle(p, tr.id, b)) { toast(t('mu.mix.cycle')); return; } mu.act('mu.h.send', () => { if (!tr.sends.some(s => s.bus === b)) tr.sends.push({ bus: b, db: -12, pre: false, on: true }); }); }}>
        <option value="">+ {t('mu.mix.send')}</option>{buses.filter(b => !tr.sends.some(s => s.bus === b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
    </div>}
    <div className="mu-pan"><input type="range" min={-1} max={1} step={.01} value={tr.pan} aria-label={t('mu.mix.pan')} title={t('mu.mix.pan') + ' ' + (tr.pan === 0 ? 'C' : (tr.pan < 0 ? 'G ' : 'D ') + Math.round(Math.abs(tr.pan) * 100))}
      onChange={e => { tr.pan = +e.target.value; mu.eng?.autoInput(tr.id, 'pan', tr.pan); mu.emit(); }} onPointerUp={() => { mu.eng?.autoRelease(tr.id, 'pan'); mu.act('mu.h.pan', () => { /* appliqué */ }); }} onDoubleClick={() => mu.act('mu.h.pan', () => { tr.pan = 0; })} /></div>
    <div className="mu-fz">
      <Fader v={tr.vol} label={t('mu.mix.vol') + ' ' + tr.name} set={v => setVol(tr, v)} done={() => { mu.eng?.autoRelease(tr.id, 'vol'); mu.act('mu.h.vol', () => { /* appliqué */ }); }} />
      <Meter reg={reg} id={tr.id} />
    </div>
    <div className="mu-sdb"><span>{fmtDb(tr.vol)}</span><span ref={reg('db')} className="mu-hold">−∞</span></div>
    <div className="mu-sbtn">
      <button className={'mu-tb' + (tr.mute ? ' on m' : '')} aria-pressed={tr.mute} title={t('mu.trk.mute')} onClick={tog('mute', 'mu.h.mute')}>M</button>
      <button className={'mu-tb' + (tr.solo ? ' on s' : '')} aria-pressed={tr.solo} title={t('mu.trk.solo')} onClick={tog('solo', 'mu.h.solo')}>S</button>
      {tr.kind !== 'bus' && <button className={'mu-tb' + (tr.arm ? ' on r' : '')} aria-pressed={tr.arm} title={t('mu.trk.arm')} onClick={tog('arm', 'mu.h.arm')}><Ico n="arm" s={11} /></button>}
      <button className={'mu-tb' + (tr.phase ? ' on' : '')} aria-pressed={tr.phase} title={t('mu.mix.phase')} onClick={tog('phase', 'mu.h.phase')}>Ø</button>
    </div>
    <select className="mu-out" value={tr.out} title={t('mu.mix.out')} onChange={e => route(+e.target.value)}><option value={0}>{t('mu.mix.master')}</option>{buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
    <select className="mu-grp" value={tr.group} title={t('mu.mix.groupTip')} onChange={e => mu.act('mu.h.group', () => { tr.group = +e.target.value; })}>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g => <option key={g} value={g}>{g ? t('mu.mix.groupN', { n: String(g) }) : t('mu.mix.noGroup')}</option>)}</select>
  </div>;
}
export const fxName = (f: Fx) => f.type.startsWith('ext:') ? (extList().find(e => e.id === f.type.slice(4))?.name || f.type.slice(4)) : t('mu.fx.' + f.type);
export function AddFx({ tr, master }: { tr?: Track; master?: boolean }) {
  const exts = extList().filter(e => e.on && !e.quarantine);
  return <select className="mu-addfx" value="" title={t('mu.fx.add')} onChange={e => {
    const type = e.target.value; if (!type) return;
    mu.act('mu.h.fxAdd', p => { const f = type.startsWith('ext:') ? (() => { const x = exts.find(y => y.id === type.slice(4))!; const q: Fx = { id: nid(p), type, on: true, p: {} }; for (const pp of x.params) q.p[pp.k] = pp.def; return q; })() : newFx(nid(p), type); if (master) p.master.fx.push(f); else trackOf(p, tr!.id)?.fx.push(f); });
    if (type.startsWith('ext:')) void mu.eng?.loadExts().then(() => { mu.sync(); mu.emit(); });
  }}>
    <option value="">+ {t('mu.fx.add')}</option>
    {['eq', 'dyn', 'space', 'mod', 'color', 'creative', 'repair', 'util'].map(cat => <optgroup key={cat} label={t('mu.fxc.' + cat)}>{FX_TYPES.filter(x => FXCAT[x] === cat).map(x => <option key={x} value={x}>{t('mu.fx.' + x)}</option>)}</optgroup>)}
    {exts.length > 0 && <optgroup label={t('mu.ext.title')}>{exts.map(x => <option key={x.id} value={'ext:' + x.id}>{x.name}</option>)}</optgroup>}
  </select>;
}
const FXCAT: Record<string, string> = { eq: 'eq', comp: 'dyn', limit: 'dyn', gate: 'dyn', deess: 'dyn', mbcomp: 'dyn', dyneq: 'dyn', reverb: 'space', delay: 'space', chorus: 'mod', flanger: 'mod', phaser: 'mod', trem: 'mod', sat: 'color', amp: 'color', crush: 'color', pitch: 'creative', denoise: 'repair', dehum: 'repair', declick: 'repair', util: 'util' };

/* ---------- master : protection, sonie, crête, corrélation, spectre, A/B ---------- */
function Master() {
  const p = mu.p, M = p.master, spec = useRef<HTMLCanvasElement>(null), vals = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState(() => localStorage.getItem('dedcut-mu-target') || 'stream');
  const [ab, setAb] = useState<{ on: 'A' | 'B'; trim: number } | null>(null);
  useEffect(() => {
    let raf = 0, last = 0, tgt = TARGETS.find(x => x[0] === target)?.[1] ?? -14;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop); if (now - last < (mu.set.lowPC ? 200 : 60)) return; last = now; const e = mu.eng; if (!e) return;
      const v = e.mv, el = vals.current;
      if (el) el.innerHTML = `<span title="${t('mu.mix.momTip')}">${t('mu.mix.mom')} <b>${v.mom > -69 ? v.mom.toFixed(1) : '—'}</b></span><span title="${t('mu.mix.shTip')}">${t('mu.mix.sh')} <b>${v.sh > -69 ? v.sh.toFixed(1) : '—'}</b></span><span title="${t('mu.mix.integTip')}">${t('mu.mix.integ')} <b class="${v.integ > -69 && Math.abs(v.integ - tgt) > 1.5 ? 'warn' : ''}">${v.integ > -69 ? v.integ.toFixed(1) : '—'}</b> LUFS</span><span title="${t('mu.mix.tpTip')}">${t('mu.mix.tp')} <b class="${v.peak > -1 ? 'bad' : ''}">${v.peak > -100 ? v.peak.toFixed(1) : '—'}</b> dB</span><span title="${t('mu.mix.corrTip')}">${t('mu.mix.corr')} <b class="${v.corr < 0 ? 'bad' : ''}">${v.corr.toFixed(2)}</b></span>`;
      const c = spec.current; if (c && !mu.set.lowPC) {
        const an = e.master.spec, n = an.frequencyBinCount, d = new Float32Array(n); an.getFloatFrequencyData(d);
        const W = c.clientWidth || 260, H = c.clientHeight || 70, dpr = devicePixelRatio || 1; if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
        const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.strokeStyle = '#22d3ee'; g.lineWidth = 1.2; g.beginPath();
        const sr = e.sr; for (let x = 0; x < W; x++) { const f = 20 * Math.pow(1000, x / W), i = Math.min(n - 1, Math.round(f / (sr / 2) * n)), y = H - clamp((d[i] + 100) / 90, 0, 1) * H; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '9px Bahnschrift, Segoe UI, sans-serif'; for (const f of [100, 1000, 10000]) { const x = Math.log(f / 20) / Math.log(1000) * W; g.fillRect(x, H - 4, 1, 4); g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x + 2, H - 2); }
      }
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [target]);
  /** A/B : compare le mix avec et sans la chaîne du master, au même niveau perçu (sonie mesurée sur la boucle ou les 30 premières secondes) */
  const toggleAB = async () => {
    const e = mu.eng; if (!e) return;
    if (ab) { const next = ab.on === 'A' ? 'B' : 'A'; mu.act('mu.h.masterAB', () => { M.bypass = next === 'B'; }); e.master.trim.gain.setTargetAtTime(next === 'B' ? Math.pow(10, ab.trim / 20) : 1, e.ctx.currentTime, .02); setAb({ ...ab, on: next }); return; }
    mu.busy = t('mu.mix.abMeasure'); mu.emit();
    try {
      const a = p.loop.on ? p.loop.a : 0, b = p.loop.on ? p.loop.b : Math.min(Math.max(4, (await import('./ops')).songEnd(p)), a + 30 * p.bpm / 60);
      const r1 = await mu.render({ a, b, tail: 0, sr: 44100, ch: 2, master: true }); const q = deepClone(p) as Project; q.master.bypass = true;
      const { renderProject } = await import('./engine'); const r2 = await renderProject(q, mu.store, { a, b, tail: 0, sr: 44100, ch: 2, master: true });
      if (!r1 || !r2) return; const L1 = loudness([r1.getChannelData(0), r1.getChannelData(1)], 44100).integrated, L2 = loudness([r2.getChannelData(0), r2.getChannelData(1)], 44100).integrated;
      const trim = isFinite(L1 - L2) ? clamp(L1 - L2, -24, 24) : 0; setAb({ on: 'A', trim }); toast(t('mu.mix.abReady', { db: trim.toFixed(1) }));
    } catch (x) { toast(String(x)); } finally { mu.busy = ''; mu.emit(); }
  };
  const scenes = p.mix;
  const saveScene = async () => { const n = await askText(t('mu.mix.sceneName'), t('mu.mix.sceneN', { n: String(scenes.length + 1) })); if (!n) return; const data = JSON.stringify({ tracks: p.tracks.map(x => ({ id: x.id, vol: x.vol, pan: x.pan, mute: x.mute, solo: x.solo, sends: x.sends, fx: x.fx.map(f => ({ id: f.id, on: f.on, p: f.p })) })), master: { vol: M.vol, fx: M.fx.map(f => ({ id: f.id, on: f.on, p: f.p })) } }); mu.act('mu.h.scene', () => { p.mix.push({ name: n.slice(0, 30), data }); }); };
  const loadScene = (i: number) => { const s = scenes[i]; if (!s) return; const o = JSON.parse(s.data) as { tracks: { id: number; vol: number; pan: number; mute: boolean; solo: boolean; sends: Track['sends']; fx: { id: number; on: boolean; p: Record<string, number> }[] }[]; master: { vol: number; fx: { id: number; on: boolean; p: Record<string, number> }[] } };
    mu.act('mu.h.sceneLoad', q => { for (const x of o.tracks) { const tr = trackOf(q, x.id); if (!tr) continue; Object.assign(tr, { vol: x.vol, pan: x.pan, mute: x.mute, solo: x.solo, sends: deepClone(x.sends) }); for (const f of x.fx) { const ff = tr.fx.find(y => y.id === f.id); if (ff) { ff.on = f.on; ff.p = { ...f.p }; } } } q.master.vol = o.master.vol; for (const f of o.master.fx) { const ff = q.master.fx.find(y => y.id === f.id); if (ff) { ff.on = f.on; ff.p = { ...f.p }; } } });
    toast(t('mu.mix.sceneLoaded', { name: s.name })); };
  return <div className="mu-master">
    <div className="mu-sname"><i style={{ background: '#fff' }} />{t('mu.mix.master')}</div>
    <div className="mu-inserts">
      {M.fx.map(f => <div key={f.id} className={'mu-ins' + (f.on && !M.bypass ? '' : ' off')}>
        <button className="mu-ib" title={t('mu.fx.bypass')} onClick={() => mu.act('mu.h.fxOn', () => { f.on = !f.on; })}><i className={f.on ? 'on' : ''} /></button>
        <span onClick={() => { mu.view.tab = 'fx'; mu.fxSel = { master: true, id: f.id }; mu.emit(); }}>{fxName(f)}</span></div>)}
      <AddFx master />
    </div>
    <label className="mu-chk" title={t('mu.mix.bypassTip')}><input type="checkbox" checked={!!M.bypass} onChange={e => mu.act('mu.h.masterAB', () => { M.bypass = e.target.checked; })} />{t('mu.mix.bypass')}</label>
    <label className="mu-chk" title={t('mu.mix.protectTip')}><input type="checkbox" checked={M.protect} onChange={e => mu.act('mu.h.protect', () => { M.protect = e.target.checked; })} /><Ico n="shield" s={12} />{t('mu.mix.protect')}</label>
    {M.protect && <label title={t('mu.mix.ceilTip')}>{t('mu.mix.ceil')}<input type="number" min={-6} max={0} step={.1} value={M.ceiling} onChange={e => mu.act('mu.h.protect', () => { M.ceiling = clamp(+e.target.value || -0.3, -6, 0); })} /> dB</label>}
    <div className="mu-fz"><Fader v={M.vol} label={t('mu.mix.masterVol')} set={v => { M.vol = v; mu.eng?.autoInput(-1, 'vol', v); mu.sync(); mu.emit(); }} done={() => mu.act('mu.h.vol', () => { /* appliqué */ })} /><MasterMeter /></div>
    <div className="mu-sdb"><span>{fmtDb(M.vol)}</span></div>
    <div className="mu-lufs" ref={vals} aria-live="off" />
    <label title={t('mu.mix.targetTip')}>{t('mu.mix.target')}<select value={target} onChange={e => { setTarget(e.target.value); try { localStorage.setItem('dedcut-mu-target', e.target.value); } catch { /* rien */ } }}>{TARGETS.map(([k, v]) => <option key={k} value={k}>{t('mu.tg.' + k)} ({v})</option>)}</select></label>
    <canvas ref={spec} className="mu-spec" aria-label={t('mu.mix.spectrum')} />
    <div className="mu-row"><button className={ab ? 'on' : ''} title={t('mu.mix.abTip')} onClick={() => void toggleAB()}><Ico n="ab" s={13} />{ab ? t('mu.mix.abOn', { which: ab.on }) : t('mu.mix.ab')}</button>{ab && <button className="mu-ib" title={t('mu.mix.abStop')} onClick={() => { mu.eng?.master.trim.gain.setTargetAtTime(1, mu.ctx!.currentTime, .02); mu.act('mu.h.masterAB', () => { M.bypass = false; }); setAb(null); }}><Ico n="close" s={12} /></button>}</div>
    <div className="mu-scenes"><b>{t('mu.mix.scenes')}</b>{scenes.map((s, i) => <span key={i}><button onClick={() => loadScene(i)} title={t('mu.mix.sceneLoad')}>{s.name}</button><button className="mu-ib" title={t('mu.mix.sceneDel')} onClick={() => mu.act('mu.h.scene', () => { p.mix.splice(i, 1); })}><Ico n="close" s={10} /></button></span>)}<button className="mu-ib" title={t('mu.mix.sceneSave')} onClick={saveScene}><Ico n="plus" s={12} /></button></div>
  </div>;
}
function MasterMeter() {
  const pk = useRef<HTMLDivElement>(null);
  useEffect(() => { let raf = 0; const f = () => { raf = requestAnimationFrame(f); const e = mu.eng; if (!e || !pk.current) return; const a = e.master.an, d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let m = 0; for (const x of d) m = Math.max(m, Math.abs(x)); const db = m > 1e-6 ? 20 * Math.log10(m) : -120; pk.current.style.height = clamp((db + 60) / 66 * 100, 0, 100) + '%'; pk.current.classList.toggle('hot', db > -1); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, []);
  return <div className="mu-meter"><div className="mu-mbar"><div className="pk" ref={pk} /></div></div>;
}

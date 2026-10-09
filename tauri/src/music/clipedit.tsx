// DedCut Musique — éditeur de clip audio (toujours non destructif : le son d'origine n'est jamais modifié) :
// gain, normalisation, fondus, inversion, composante continue, calage sur le tempo, hauteur, silences, attaques,
// découpe en tranches vers un sampler, correction manuelle du placement, prises et comping.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, askText } from './state';
import type { Asset, AudioClip, Fade, Track } from './model';
import { b2s, clamp, clipEnd, newMidi, newTrack, nid, s2b, trackOf, defInst } from './model';
import { autoCrossfades, compSelect, normalizeGain, sliceRegions, snapTo, splitClip, stripSilence } from './ops';
import { detectBpm, detectKey, removeDC, soundRegions, transients, type Chans } from './dsp';
import * as IO from './io';
import { NOTE_N } from './model';
import { Ico } from './icons';

const chansOf = (c: AudioClip): Chans | null => { const b = mu.store.get(c.asset); if (!b) return null; const a = Math.floor(c.off * b.sampleRate), n = Math.floor(c.dur * b.sampleRate); return Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).subarray(a, a + n)); };

export function ClipEditor() {
  useMu(); const f = mu.clip;
  if (!f || f.c.kind !== 'audio') return <div className="mu-empty"><Ico n="wave" s={28} /><p>{t('mu.ce.none')}</p><button onClick={() => void mu.importAudio()}><Ico n="open" s={13} />{t('mu.f.importAudio')}</button></div>;
  return <Editor tr={f.t} c={f.c} />;
}
function Editor({ tr, c }: { tr: Track; c: AudioClip }) {
  const p = mu.p, a = p.assets[c.asset], buf = mu.store.get(c.asset), wave = useRef<HTMLCanvasElement>(null);
  const [sil, setSil] = useState({ thr: -45, min: .25 }), [sens, setSens] = useState(.5), [marks, setMarks] = useState<number[]>([]), [nudge, setNudge] = useState(70);
  const op = (label: string, fn: () => void, re = true) => { if (tr.lock) { toast(t('mu.trk.locked')); return; } mu.act(label, fn, re); };
  useEffect(() => {
    const cv = wave.current; if (!cv || !buf) return; const W = cv.clientWidth || 600, H = cv.clientHeight || 120, dpr = devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0c0a12'; g.fillRect(0, 0, W, H); const d = buf.getChannelData(0), sr = buf.sampleRate, N = buf.length, x2i = (x: number) => Math.floor(x / W * N);
    const a0 = c.off / buf.duration * W, a1 = (c.off + c.dur) / buf.duration * W; g.fillStyle = 'rgba(167,139,250,.12)'; g.fillRect(a0, 0, a1 - a0, H);
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = 0; x < W; x++) { let lo = 0, hi = 0; for (let i = x2i(x), e = Math.min(N, x2i(x + 1)); i < e; i += 4) { const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; } g.fillRect(x, H / 2 - hi * H / 2, 1, Math.max(1, (hi - lo) * H / 2)); }
    g.fillStyle = '#fbbf24'; for (const m of marks) { const x = (c.off + m) / buf.duration * W; g.fillRect(x, 0, 1, H); }
    g.strokeStyle = '#a78bfa'; g.lineWidth = 2; g.strokeRect(a0, 1, a1 - a0, H - 2); void sr;
  });
  if (!buf) return <div className="mu-empty"><Ico n="warn" s={24} /><p>{a?.missing ? t('mu.f.missingShort') : t('mu.f.notLoaded')}</p>{a?.missing && <button onClick={() => void mu.relink(a)}>{t('mu.f.relink')}</button>}</div>;
  const fade = (k: 'fin' | 'fout', v: Partial<Fade>) => op('mu.h.fade', () => { c[k] = { ...c[k], ...v }; });
  /* nouveau son à partir d'un traitement : l'original reste dans le projet */
  const derive = async (label: string, ch: Chans, suffix: string, extra: (x: AudioClip) => void = () => { /* rien */ }) => {
    const A: Asset = { id: 'drv' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: (a?.name || c.name).replace(/\.[^.]+$/, '') + ' (' + suffix + ')', path: null, sr: buf.sampleRate, ch: ch.length, len: ch[0].length / buf.sampleRate, hash: '', origin: 'render', licence: a?.licence || 'user', tags: a?.tags || [], bpm: a?.bpm || 0, key: a?.key || '' };
    await IO.persistSound(p, mu.store, A, ch.map(x => new Float32Array(x)), 'Rendus');
    op(label, () => { c.asset = A.id; c.off = 0; c.dur = A.len; extra(c); }); toast(t('mu.ce.derived'));
  };
  const takes = tr.takes.filter(k => tr.clips.some(x => x.kind === 'audio' && x.take === k.id));
  return <div className="mu-dev mu-ce">
    <div className="mu-prbar"><Ico n="wave" s={15} /><b>{c.name}</b><span className="mu-dim">{a ? `${a.sr / 1000} kHz · ${a.ch === 1 ? t('mu.ce.mono') : t('mu.ce.stereo')} · ${a.len.toFixed(2)} s · ${t('mu.org.' + (a.origin || 'import'))}` : ''}</span>
      <span className="mu-sp" /><button className="mu-ib" title={t('mu.ce.rename')} onClick={async () => { const n = await askText(t('mu.ce.rename'), c.name); if (n) op('mu.h.rename', () => { c.name = n.slice(0, 40); }, false); }}><Ico n="pen" s={13} /></button></div>
    <canvas ref={wave} className="mu-cewave" aria-label={t('mu.ce.wave')} />
    <div className="mu-devbody">
      <fieldset className="mu-fs"><legend>{t('mu.ce.level')}</legend>
        <label className="mu-par"><span>{t('mu.ce.gain')}</span><input type="range" min={-36} max={24} step={.1} value={c.gain} onChange={e => { c.gain = +e.target.value; mu.emit(); }} onPointerUp={() => op('mu.h.clipGain', () => { /* appliqué */ }, false)} /><em>{c.gain.toFixed(1)} dB</em></label>
        <div className="mu-row"><button onClick={() => { const ch = chansOf(c); if (!ch) return; const g = normalizeGain(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), buf.sampleRate, c, -1); op('mu.h.normalize', () => { c.gain = +g.toFixed(2); }, false); toast(t('mu.ce.normalized', { db: g.toFixed(1) })); }} title={t('mu.ce.normTip')}><Ico n="meter" s={13} />{t('mu.ce.normalize')}</button>
          <button className={c.rev ? 'on' : ''} onClick={() => op('mu.h.reverse', () => { c.rev = !c.rev; })}><Ico n="undo" s={13} />{t('mu.ce.reverse')}</button>
          <button title={t('mu.ce.dcTip')} onClick={() => { const ch = chansOf(c); if (ch) void derive('mu.h.dc', removeDC(ch.map(x => new Float32Array(x))), t('mu.ce.dcShort')); }}>{t('mu.ce.dc')}</button></div>
      </fieldset>
      <fieldset className="mu-fs"><legend>{t('mu.ce.fades')}</legend>
        {(['fin', 'fout'] as const).map(k => <div key={k} className="mu-row"><span>{t('mu.ce.' + k)}</span><input type="number" min={0} max={30} step={.01} value={+c[k].len.toFixed(3)} onChange={e => fade(k, { len: clamp(+e.target.value || 0, 0, 30) })} aria-label={t('mu.ce.' + k)} />s
          <select value={c[k].curve} onChange={e => fade(k, { curve: e.target.value as Fade['curve'] })}>{['lin', 'exp', 'scurve'].map(x => <option key={x} value={x}>{t('mu.fc.' + x)}</option>)}</select></div>)}
        <button onClick={() => op('mu.h.fade', () => autoCrossfades(p, tr))} title={t('mu.ce.xfTip')}>{t('mu.ce.xf')}</button>
      </fieldset>
      <fieldset className="mu-fs"><legend>{t('mu.ce.time')}</legend>
        <label className="mu-par"><span>{t('mu.ce.warp')}</span><input type="checkbox" checked={c.warp} onChange={e => op('mu.h.warp', () => { c.warp = e.target.checked; if (!c.srcBpm) c.srcBpm = p.bpm; })} /><small>{t('mu.ce.warpTip')}</small></label>
        {c.warp && <label className="mu-par"><span>{t('mu.ce.srcBpm')}</span><input type="number" min={30} max={300} step={.01} value={+c.srcBpm.toFixed(2)} onChange={e => op('mu.h.warp', () => { c.srcBpm = clamp(+e.target.value || p.bpm, 30, 300); })} />
          <button title={t('mu.ce.detectTip')} onClick={() => { const ch = chansOf(c); if (!ch) return; const bpm = detectBpm(ch, buf.sampleRate); if (bpm > 0) { op('mu.h.warp', () => { c.srcBpm = +bpm.toFixed(2); if (a) a.bpm = c.srcBpm; }); toast(t('mu.ce.bpmFound', { bpm: bpm.toFixed(1) })); } else toast(t('mu.ce.bpmNone')); }}><Ico n="tempo" s={12} />{t('mu.ce.detect')}</button></label>}
        <label className="mu-par"><span>{t('mu.ce.algo')}</span><select value={c.mode} onChange={e => op('mu.h.warp', () => { c.mode = e.target.value as AudioClip['mode']; })}>{['stretch', 'repitch', 'slices'].map(m => <option key={m} value={m}>{t('mu.al.' + m)}</option>)}</select></label>
        {!c.warp && c.mode !== 'repitch' && <label className="mu-par"><span>{t('mu.ce.speed')}</span><input type="number" min={.25} max={4} step={.01} value={c.ratio} onChange={e => op('mu.h.speed', () => { c.ratio = clamp(+e.target.value || 1, .25, 4); })} />×</label>}
        <label className="mu-par"><span>{t('mu.ce.pitch')}</span><input type="number" min={-24} max={24} step={.1} value={c.pitch} onChange={e => op('mu.h.pitch', () => { c.pitch = clamp(+e.target.value || 0, -24, 24); })} />{t('mu.ce.semi')}</label>
        <small>{t(c.mode === 'repitch' ? 'mu.ce.repitchHint' : 'mu.ce.formantHint')}</small>
      </fieldset>
      <fieldset className="mu-fs"><legend>{t('mu.ce.silences')}</legend>
        <label className="mu-par"><span>{t('mu.ce.thr')}</span><input type="range" min={-80} max={-10} value={sil.thr} onChange={e => setSil({ ...sil, thr: +e.target.value })} /><em>{sil.thr} dB</em></label>
        <label className="mu-par"><span>{t('mu.ce.minLen')}</span><input type="range" min={.05} max={2} step={.05} value={sil.min} onChange={e => setSil({ ...sil, min: +e.target.value })} /><em>{sil.min.toFixed(2)} s</em></label>
        <button onClick={() => { const b = buf; const all = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i)), rg = soundRegions(all, b.sampleRate, sil.thr, sil.min); if (!rg.length) { toast(t('mu.ce.allSilent')); return; } op('mu.h.strip', () => { stripSilence(p, tr, c, rg); }); toast(t('mu.ce.stripped')); }}><Ico n="scissors" s={13} />{t('mu.ce.strip')}</button>
      </fieldset>
      <fieldset className="mu-fs"><legend>{t('mu.ce.attacks')}</legend>
        <label className="mu-par"><span>{t('mu.ce.sens')}</span><input type="range" min={.05} max={.95} step={.05} value={sens} onChange={e => setSens(+e.target.value)} /><em>{Math.round(sens * 100)} %</em></label>
        <div className="mu-row"><button onClick={() => { const ch = chansOf(c); if (!ch) return; const m = transients(ch, buf.sampleRate, sens); setMarks(m); toast(t('mu.ce.found', { n: String(m.length) })); }}><Ico n="target" s={13} />{t('mu.ce.show')}</button>
          <button disabled={!marks.length} onClick={() => op('mu.h.split', () => { const rate = c.dur / Math.max(1e-6, b2s(p, clipEnd(p, c)) - b2s(p, c.t)); let cur: AudioClip = c; for (const m of marks) { const at = s2b(p, b2s(p, c.t) + m / rate); const r = splitClip(p, tr, cur, at); if (r && r.kind === 'audio') cur = r; } setMarks([]); })}><Ico n="scissors" s={13} />{t('mu.ce.splitAt')}</button></div>
        <div className="mu-row"><label title={t('mu.ce.nudgeTip')}>{t('mu.ce.nudge')}<input type="range" min={0} max={100} value={nudge} onChange={e => setNudge(+e.target.value)} /><em>{nudge} %</em></label>
          <button title={t('mu.ce.timingTip')} onClick={() => { const sel = tr.clips.filter((x): x is AudioClip => x.kind === 'audio' && mu.sel.clips.has(x.id)); if (sel.length < 2) { toast(t('mu.ce.selSlices')); return; } op('mu.h.timing', () => { for (const x of sel) { const tgt = snapTo(p, x.t, mu.view.grid); x.t = x.t + (tgt - x.t) * nudge / 100; } }); }}><Ico n="quant" s={13} />{t('mu.ce.timing')}</button></div>
        <button title={t('mu.ce.slicesTip')} onClick={() => void toSampler(tr, c, sens)}><Ico n="piano" s={13} />{t('mu.ce.slices')}</button>
      </fieldset>
      <fieldset className="mu-fs"><legend>{t('mu.ce.analysis')}</legend>
        <button onClick={() => { const ch = chansOf(c); if (!ch) return; const k = detectKey(ch, buf.sampleRate); const name = NOTE_N[k.key] + (k.minor ? 'm' : ''); if (a) mu.act('mu.h.tags', () => { a.key = name; }, false); toast(t('mu.ce.keyFound', { key: name, conf: String(Math.round(k.conf * 100)) })); }}><Ico n="note" s={13} />{t('mu.ce.key')}</button>
        {a && <div className="mu-row"><span>{t('mu.br.tags')}</span><input value={a.tags.join(', ')} onChange={e => { a.tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12); mu.p.dirty = true; mu.emit(); }} /></div>}
        {a && <small>{t('mu.ce.rights', { origin: t('mu.org.' + (a.origin || 'import')), licence: a.licence })}</small>}
      </fieldset>
      {takes.length > 0 && <fieldset className="mu-fs mu-wide"><legend>{t('mu.ce.takes')}</legend>
        <p className="mu-hint">{t('mu.ce.compHint')}</p>
        {takes.map(k => { const parts = tr.clips.filter((x): x is AudioClip => x.kind === 'audio' && x.take === k.id), on = parts.some(x => !x.mute); return <div key={k.id} className="mu-row">
          <b className={on ? '' : 'mu-dim'}>{k.name}</b>
          <button disabled={!mu.sel.range} title={t('mu.ce.useForRange')} onClick={() => { const r = mu.sel.range!; op('mu.h.comp', () => compSelect(p, tr, k.id, r.a, r.b)); }}>{t('mu.ce.useRange')}</button>
          <button title={t('mu.ce.useAllTip')} onClick={() => op('mu.h.comp', () => { for (const x of tr.clips) if (x.kind === 'audio' && x.take) x.mute = x.take !== k.id; })}>{t('mu.ce.useAll')}</button>
        </div>; })}
      </fieldset>}
    </div>
  </div>;
}
/** boucle découpée aux attaques : chaque tranche devient un son du sampler (do1, do#1…), un clip MIDI rejoue la boucle */
async function toSampler(tr: Track, c: AudioClip, sens: number) {
  const b = mu.store.get(c.asset); if (!b) return; const p = mu.p, sr = b.sampleRate, a0 = Math.floor(c.off * sr), n = Math.floor(c.dur * sr);
  const ch = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).subarray(a0, a0 + n)), rg = sliceRegions(ch, sr, sens);
  if (rg.length < 2) { toast(t('mu.ce.noSlices')); return; }
  const ids: string[] = [];
  for (let i = 0; i < rg.length; i++) { const [s, e] = rg[i], A: Asset = { id: 'slc' + Date.now().toString(36) + i, name: c.name + ' ' + (i + 1), path: null, sr, ch: ch.length, len: e - s, hash: '', origin: 'render', licence: p.assets[c.asset]?.licence || 'user', tags: ['slice'], bpm: 0, key: '' }; await IO.persistSound(p, mu.store, A, ch.map(x => new Float32Array(x.subarray(Math.floor(s * sr), Math.floor(e * sr)))), 'Rendus'); ids.push(A.id); }
  const rate = c.dur / Math.max(1e-6, b2s(p, clipEnd(p, c)) - b2s(p, c.t));
  mu.act('mu.h.slices', q => {
    const T = newTrack(q, 'inst', c.name + ' ' + t('mu.ce.slicedName')); const I = defInst('sampler'); I.aenv = { a: .001, d: .1, s: 1, r: .05 }; I.flt.cut = 18000; I.flt.env = 0; I.flt.key = 0; I.poly = 16;
    I.zones = ids.map((id, i) => ({ asset: id, root: 36 + i, lo: 36 + i, hi: 36 + i, vlo: 0, vhi: 127, tune: 0, gain: 0, loop: false, ls: 0, le: 0, xf: .01 })); T.inst = I;
    const md = newMidi(q, rg.map(([s, e], i) => ({ id: nid(q), p: 36 + i, t: s2b(q, b2s(q, c.t) + s / rate) - c.t, d: Math.max(1 / 16, s2b(q, b2s(q, c.t) + e / rate) - s2b(q, b2s(q, c.t) + s / rate)), v: 100 })));
    T.clips.push({ kind: 'midi', id: nid(q), name: T.name, t: c.t, len: clipEnd(q, c) - c.t, data: md.id, color: '', loop: false });
    q.tracks.splice(q.tracks.findIndex(x => x.id === tr.id) + 1, 0, T); const src = trackOf(q, tr.id)?.clips.find(x => x.id === c.id); if (src) src.mute = true;
  }, true);
  toast(t('mu.ce.slicesDone', { n: String(rg.length) }));
}

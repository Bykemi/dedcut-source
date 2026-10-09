// DedCut Musique — appareils : éditeur d'instrument (synthé soustractif, FM, table d'ondes, sampler à zones, arpégiateur,
// préréglages), clavier à l'écran, et éditeur d'effets (chaîne d'inserts, réglages, courbe d'égaliseur, sidechain).
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, askText, getPath, setPath, downloadBlob } from './state';
import type { Fx, Inst, Track, Zone } from './model';
import { clamp, deepClone, nid, trackOf } from './model';
import { FX_DEFS, SYNC_NOTES, eqCurve, type ParamDef } from './fx';
import { TABLE_IDS } from './instruments';
import { CHAINS, INST_PRESETS, chainFx, deletePreset, exportPresets, importPresets, instPreset, savePreset, searchPresets, updatePreset, type UserPreset } from './presets';
import { paramDefs, list as extList } from './ext';
import { wouldCycle } from './engine';
import * as IO from './io';
import { yin } from './dsp';
import { nName } from './pianoroll';
import { fxName, AddFx } from './mixer';
import { Ico } from './icons';

/* ---------- réglage générique : curseur, valeur, double-clic = valeur d'origine, clic droit = automation / MIDI ---------- */
export function Param({ label, v, min, max, step = .01, log, unit, def, set, done, auto, learn }: { label: string; v: number; min: number; max: number; step?: number; log?: boolean; unit?: string; def?: number; set: (v: number) => void; done: () => void; auto?: () => void; learn?: string }) {
  const toS = (x: number) => log ? Math.log(Math.max(min, x) / min) / Math.log(max / min) * 1000 : (x - min) / (max - min) * 1000, fromS = (s: number) => { const r = log ? min * Math.pow(max / min, s / 1000) : min + (max - min) * s / 1000; return step >= 1 ? Math.round(r) : Math.round(r / step) * step; };
  const [menu, setMenu] = useState(false), shown = Math.abs(v) >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + 'k' : Math.abs(v) < 10 && step < 1 ? (+v.toFixed(3)).toString() : (+v.toFixed(1)).toString();
  return <label className="mu-par" onContextMenu={e => { if (auto || learn) { e.preventDefault(); setMenu(!menu); } }} onDoubleClick={() => { if (def != null) { set(def); done(); } }}>
    <span title={label}>{label}</span>
    <input type="range" min={0} max={1000} step={1} value={toS(v)} aria-label={label} aria-valuetext={shown + (unit ? ' ' + unit : '')} onChange={e => set(fromS(+e.target.value))} onPointerUp={done} onKeyUp={done} />
    <em>{shown}{unit ? ' ' + unit : ''}</em>
    {menu && <div className="mu-parmenu" onMouseLeave={() => setMenu(false)}>
      {auto && <button onClick={() => { auto(); setMenu(false); }}><Ico n="human" s={12} />{t('mu.auto.add')}</button>}
      {learn && <button onClick={() => { mu.learn(learn); setMenu(false); }}><Ico n="midi" s={12} />{t('mu.midi.learn')}</button>}
      {learn && mu.maps.some(m => m.target === learn) && <button onClick={() => { mu.maps = mu.maps.filter(m => m.target !== learn); import('./midi').then(M => M.saveMaps(mu.maps)); setMenu(false); mu.emit(); }}><Ico n="close" s={12} />{t('mu.midi.unlearn')}</button>}
    </div>}
  </label>;
}
/** ajoute (ou montre) une ligne d'automation pour un réglage */
export function addLane(trackId: number | null, param: string) {
  mu.act('mu.h.autoAdd', p => { const L = trackId == null ? (p.master.auto ||= []) : trackOf(p, trackId)?.auto; if (!L) return; const l = L.find(x => x.param === param); if (l) l.show = true; else L.push({ param, pts: [], mode: 'read', show: true }); });
  toast(t('mu.auto.added'));
}

/* ---------- instrument ---------- */
const FAVK = 'dedcut-mu-favs';
const favs = (): string[] => { try { return JSON.parse(localStorage.getItem(FAVK) || '[]'); } catch { return []; } };
export function InstEditor() {
  useMu(); const tr = mu.track;
  if (!tr || !tr.inst || (tr.kind !== 'inst' && tr.kind !== 'drum')) return <div className="mu-empty"><Ico n="inst" s={28} /><p>{t('mu.in.none')}</p><button className="pri" onClick={() => mu.addTrack('inst', 'keys')}><Ico n="plus" s={13} />{t('mu.trk.addInst')}</button></div>;
  return <Inst tr={tr} I={tr.inst} />;
}
function Inst({ tr, I }: { tr: Track; I: Inst }) {
  const [q, setQ] = useState(''), [, force] = useState(0), live = () => { mu.sync(); mu.emit(); }, done = () => mu.act('mu.h.inst', () => { /* appliqué */ });
  const P = (label: string, path: string, min: number, max: number, o: { step?: number; log?: boolean; unit?: string; def?: number } = {}) =>
    <Param key={path} label={label} v={getPath(I, path)} min={min} max={max} {...o} set={v => { setPath(I, path, v); live(); }} done={done} learn={`ip:${tr.id}:${path}:${min}:${max}:${o.log ? 1 : 0}`}
      auto={path === 'vol' ? () => addLane(tr.id, 'inst:vol') : path === 'flt.cut' ? () => addLane(tr.id, 'inst:cut') : undefined} />;
  const ADSR = (title: string, base: string) => { return <fieldset className="mu-fs"><legend>{title}</legend>{P(t('mu.in.a'), base + '.a', .001, 4, { log: true, unit: 's' })}{P(t('mu.in.d'), base + '.d', .001, 6, { log: true, unit: 's' })}{P(t('mu.in.s'), base + '.s', 0, 1)}{P(t('mu.in.r'), base + '.r', .005, 8, { log: true, unit: 's' })}</fieldset>; };
  const OSC = (k: 'o1' | 'o2') => <fieldset className="mu-fs"><legend>{t('mu.in.' + k)}</legend>
    <label className="mu-par"><span>{t('mu.in.wave')}</span><select value={I[k].wave} onChange={e => mu.act('mu.h.inst', () => { I[k].wave = e.target.value as Inst['o1']['wave']; })}>{['sine', 'triangle', 'sawtooth', 'square', 'noise'].map(w => <option key={w} value={w}>{t('mu.wv.' + w)}</option>)}</select></label>
    {P(t('mu.in.oct'), k + '.oct', -3, 3, { step: 1 })}{P(t('mu.in.semi'), k + '.semi', -12, 12, { step: 1 })}{P(t('mu.in.fine'), k + '.fine', -100, 100, { step: 1, unit: 'ct' })}{P(t('mu.in.lvl'), k + '.lvl', 0, 1)}</fieldset>;
  const userList = searchPresets(q, 'inst'), fv = favs(), builtins = INST_PRESETS.filter(x => (tr.kind === 'drum') === (x.cat === 'drums') && (!q || (x.id + ' ' + t('mu.pre.' + x.id) + ' ' + x.tags.join(' ')).toLowerCase().includes(q.toLowerCase())));
  const loadPreset = (id: string) => { const n = instPreset(id); if (!n) return; mu.act('mu.h.preset', () => { if (tr.kind === 'drum') { n.patterns = I.patterns; } tr.inst = n; }); };
  const st = mu.eng?.stats();
  return <div className="mu-dev">
    <div className="mu-prbar">
      <Ico n={tr.kind === 'drum' ? 'drum' : 'piano'} s={15} /><b>{tr.name}</b>
      <select value={I.preset} title={t('mu.in.preset')} onChange={e => { const v = e.target.value; if (v.startsWith('u:')) { const u = searchPresets('', 'inst').find(x => x.id === v.slice(2)); if (u) mu.act('mu.h.preset', () => { const n = deepClone(u.data as Inst); if (tr.kind === 'drum') n.patterns = I.patterns; n.preset = u.id; tr.inst = n; }); } else loadPreset(v); }}>
        <option value="">{t('mu.in.custom')}</option>
        <optgroup label={t('mu.in.dedcutPresets')}>{builtins.map(x => <option key={x.id} value={x.id}>{fv.includes(x.id) ? '★ ' : ''}{t('mu.pre.' + x.id)}</option>)}</optgroup>
        {userList.length > 0 && <optgroup label={t('mu.in.myPresets')}>{userList.map(x => <option key={x.id} value={'u:' + x.id}>{x.fav ? '★ ' : ''}{x.name}</option>)}</optgroup>}
      </select>
      <input className="mu-search" placeholder={t('mu.in.search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('mu.in.search')} />
      <button className="mu-ib" title={t('mu.in.fav')} onClick={() => { const id = I.preset; if (!id) return; if (id.startsWith('u')) { const u = searchPresets('', 'inst').find(x => x.id === id); if (u) updatePreset(id, { fav: !u.fav }); } else { const f = favs(); localStorage.setItem(FAVK, JSON.stringify(f.includes(id) ? f.filter(x => x !== id) : [...f, id])); } force(x => x + 1); }}><Ico n="star" s={14} fill={fv.includes(I.preset) || searchPresets('', 'inst').some(x => x.id === I.preset && x.fav)} /></button>
      <button className="mu-ib" title={t('mu.in.save')} onClick={async () => { const n = await askText(t('mu.in.saveName'), tr.name); if (!n) return; const tags = ((await askText(t('mu.in.saveTags'), '')) || '').split(',').map(s => s.trim()).filter(Boolean); const u = savePreset('inst', n, I, tags); mu.act('mu.h.preset', () => { I.preset = u.id; }); toast(t('mu.in.saved')); }}><Ico n="save" s={14} /></button>
      <PresetFiles kind="inst" />
      <span className="mu-sp" />
      {tr.kind === 'inst' && <label>{t('mu.in.type')}<select value={I.type} onChange={e => mu.act('mu.h.inst', () => { I.type = e.target.value as Inst['type']; })}>{(['synth', 'fm', 'wave', 'sampler'] as const).map(x => <option key={x} value={x}>{t('mu.it.' + x)}</option>)}</select></label>}
      {st && <span className="mu-dim" title={t('mu.in.voicesTip')}><Ico n="cpu" s={12} /> {t('mu.in.voices', { n: String(st.voices) })}</span>}
    </div>
    {tr.kind === 'drum' ? <div className="mu-devbody"><p className="mu-hint">{t('mu.in.drumHint')}</p><button onClick={() => { mu.view.tab = 'steps'; mu.emit(); }}><Ico n="steps" s={13} />{t('mu.tab.steps')}</button></div> :
      <div className="mu-devbody">
        {(I.type === 'synth') && <>{OSC('o1')}{OSC('o2')}<fieldset className="mu-fs"><legend>{t('mu.in.mix')}</legend>{P(t('mu.in.noise'), 'noise', 0, 1)}{P(t('mu.in.uni'), 'uni', 1, 7, { step: 1 })}{P(t('mu.in.det'), 'det', 0, 50, { step: 1, unit: 'ct' })}</fieldset></>}
        {I.type === 'fm' && <fieldset className="mu-fs"><legend>{t('mu.it.fm')}</legend>{P(t('mu.in.ratio'), 'fm.ratio', .5, 16, { step: .5 })}{P(t('mu.in.index'), 'fm.index', 0, 12)}{P(t('mu.in.fb'), 'fm.fb', 0, .95)}{P(t('mu.in.ratio2'), 'fm.ratio2', .5, 16, { step: .5 })}{P(t('mu.in.index2'), 'fm.index2', 0, 4)}</fieldset>}
        {I.type === 'fm' && ADSR(t('mu.in.fmEnv'), 'fm.env')}
        {I.type === 'wave' && <fieldset className="mu-fs"><legend>{t('mu.it.wave')}</legend><label className="mu-par"><span>{t('mu.in.table')}</span><select value={I.wave.table} onChange={e => mu.act('mu.h.inst', () => { I.wave.table = e.target.value; })}>{TABLE_IDS.map(x => <option key={x} value={x}>{t('mu.tb.' + x)}</option>)}</select></label>{P(t('mu.in.pos'), 'wave.pos', 0, 1)}{P(t('mu.in.wenv'), 'wave.env', -1, 1)}{P(t('mu.in.lvl'), 'o1.lvl', 0, 1)}</fieldset>}
        {I.type === 'sampler' && <Zones I={I} />}
        <fieldset className="mu-fs"><legend>{t('mu.in.filter')}</legend>
          <label className="mu-par"><span>{t('mu.in.ftype')}</span><select value={I.flt.type} onChange={e => mu.act('mu.h.inst', () => { I.flt.type = e.target.value as BiquadFilterType; })}>{['lowpass', 'highpass', 'bandpass', 'notch'].map(x => <option key={x} value={x}>{t('mu.ft.' + x)}</option>)}</select></label>
          {P(t('mu.in.cut'), 'flt.cut', 30, 18000, { log: true, unit: 'Hz', def: 2400 })}{P(t('mu.in.res'), 'flt.res', .1, 20)}{P(t('mu.in.fenvAmt'), 'flt.env', -6000, 8000, { step: 10, unit: 'Hz' })}{P(t('mu.in.key'), 'flt.key', 0, 1)}</fieldset>
        {ADSR(t('mu.in.fenv'), 'fenv')}{ADSR(t('mu.in.aenv'), 'aenv')}
        <fieldset className="mu-fs"><legend>{t('mu.in.lfo')}</legend>
          <label className="mu-par"><span>{t('mu.in.wave')}</span><select value={I.lfo.wave} onChange={e => mu.act('mu.h.inst', () => { I.lfo.wave = e.target.value as OscillatorType; })}>{['sine', 'triangle', 'square', 'sawtooth'].map(w => <option key={w} value={w}>{t('mu.wv.' + w)}</option>)}</select></label>
          <label className="mu-par"><span>{t('mu.in.sync')}</span><input type="checkbox" checked={I.lfo.sync} onChange={e => mu.act('mu.h.inst', () => { I.lfo.sync = e.target.checked; I.lfo.rate = e.target.checked ? 4 : 5; })} /></label>
          {I.lfo.sync ? <label className="mu-par"><span>{t('mu.in.rate')}</span><select value={Math.round(I.lfo.rate)} onChange={e => mu.act('mu.h.inst', () => { I.lfo.rate = +e.target.value; })}>{SYNC_NOTES.map((n, i) => <option key={i} value={i + 1}>{noteLenName(n)}</option>)}</select></label> : P(t('mu.in.rate'), 'lfo.rate', .05, 20, { log: true, unit: 'Hz' })}
          <label className="mu-par"><span>{t('mu.in.dest')}</span><select value={I.lfo.dest} onChange={e => mu.act('mu.h.inst', () => { I.lfo.dest = e.target.value as Inst['lfo']['dest']; })}>{['pitch', 'cut', 'amp', 'pan'].map(d => <option key={d} value={d}>{t('mu.ld.' + d)}</option>)}</select></label>
          {P(t('mu.in.amt'), 'lfo.amt', 0, 1)}</fieldset>
        <fieldset className="mu-fs"><legend>{t('mu.in.play')}</legend>{P(t('mu.in.glide'), 'glide', 0, 1, { unit: 's' })}{P(t('mu.in.poly'), 'poly', 1, 32, { step: 1 })}{P(t('mu.in.bend'), 'bend', 0, 24, { step: 1, unit: 'st' })}{P(t('mu.in.vol'), 'vol', -40, 12, { step: .5, unit: 'dB', def: 0 })}</fieldset>
        <fieldset className="mu-fs"><legend>{t('mu.in.arp')}</legend>
          <label className="mu-par"><span>{t('mu.in.arpOn')}</span><input type="checkbox" checked={I.arp.on} onChange={e => mu.act('mu.h.inst', () => { I.arp.on = e.target.checked; })} /></label>
          <label className="mu-par"><span>{t('mu.in.arpMode')}</span><select value={I.arp.mode} onChange={e => mu.act('mu.h.inst', () => { I.arp.mode = e.target.value as Inst['arp']['mode']; })}>{['up', 'down', 'updown', 'random', 'order', 'chord'].map(m => <option key={m} value={m}>{t('mu.am.' + m)}</option>)}</select></label>
          <label className="mu-par"><span>{t('mu.in.arpRate')}</span><select value={I.arp.rate} onChange={e => mu.act('mu.h.inst', () => { I.arp.rate = +e.target.value; })}>{[1, 2, 3, 4, 6, 8].map(r => <option key={r} value={r}>{t('mu.ar.' + r)}</option>)}</select></label>
          {P(t('mu.in.arpOct'), 'arp.oct', 1, 4, { step: 1 })}{P(t('mu.in.arpGate'), 'arp.gate', .1, 1)}{P(t('mu.pr.swing'), 'arp.swing', 0, .75)}
          <label className="mu-par" title={t('mu.in.latchTip')}><span>{t('mu.in.latch')}</span><input type="checkbox" checked={I.arp.latch} onChange={e => mu.act('mu.h.inst', () => { I.arp.latch = e.target.checked; })} /></label>
          <small>{t('mu.in.arpHint')}</small></fieldset>
      </div>}
    <Keyboard />
  </div>;
}
const noteLenName = (beats: number) => { const m: Record<string, string> = { '0.0625': '1/64', '0.125': '1/32', '0.1875': '1/32.', '0.25': '1/16', '0.375': '1/16.', '0.5': '1/8', '0.75': '1/8.', '1': '1/4', '2': '1/2' }; return m[String(beats)] || String(beats); };
function PresetFiles({ kind }: { kind: UserPreset['kind'] }) {
  return <details className="mu-pop"><summary title={t('mu.in.presetFiles')}><Ico n="folder" s={14} /></summary><div className="mu-col">
    <button onClick={async () => { const l = searchPresets('', kind); if (!l.length) { toast(t('mu.in.noUser')); return; } const b = exportPresets(l), F = IO.fs(); if (F) { const path = await F.saveDialog('presets DedCut', t('mu.in.presetFile'), 'dcpreset'); if (path) { await F.write(path, b); toast(t('mu.in.exported', { n: String(l.length) })); } } else downloadBlob(b, 'presets.dcpreset'); }}><Ico n="export" s={13} />{t('mu.in.exportP')}</button>
    <button onClick={async () => { const F = IO.fs(); let txt = ''; if (F) { const [f] = await F.open(t('mu.in.presetFile'), ['dcpreset', 'json'], false).catch(() => []); if (f) txt = await (await fetch(F.url(f.path))).text(); } else { const i = document.createElement('input'); i.type = 'file'; i.accept = '.dcpreset,.json'; txt = await new Promise<string>(ok => { i.onchange = async () => ok(i.files?.[0] ? await i.files[0].text() : ''); i.click(); }); } if (!txt) return; try { toast(t('mu.in.imported', { n: String(importPresets(txt)) })); mu.emit(); } catch { toast(t('mu.in.badPreset')); } }}><Ico n="open" s={13} />{t('mu.in.importP')}</button>
    {searchPresets('', kind).map(u => <div key={u.id} className="mu-row"><span className="mu-dim">{u.fav ? '★ ' : ''}{u.name}</span><button className="mu-ib" title={t('mu.in.delP')} onClick={() => { deletePreset(u.id); mu.emit(); }}><Ico n="trash" s={12} /></button></div>)}
    <small>{t('mu.in.presetFmt')}</small>
  </div></details>;
}
/** zones du sampler : chaque son couvre une plage de notes et de vélocités */
function Zones({ I }: { I: Inst }) {
  const add = async (auto: boolean) => {
    await mu.init(); const F = IO.fs(); let files: { path?: string; file?: File }[] = [];
    if (F) files = (await F.open(t('mu.f.sound'), IO.AUDIO_EXT, true).catch(() => [])).map(f => ({ path: f.path }));
    else files = await new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'audio/*'; i.onchange = () => ok([...(i.files || [])].map(file => ({ file }))); i.click(); });
    const got: { id: string; root: number }[] = [];
    for (const f of files) { try { const r = await IO.importSound(mu.p, mu.store, mu.ctx!, f); const b = mu.store.get(r.a.id)!; let root = 60; if (auto) { const m = (r.a.name.match(/([A-G]#?)(-?\d)/i)); if (m) { const k = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(m[1].toUpperCase()); if (k >= 0) root = (+m[2] + 1) * 12 + k; } else { const d = b.getChannelData(0), a0 = Math.floor(b.length * .1), hz = yin(d.subarray(a0, a0 + Math.min(8192, b.length - a0)), b.sampleRate); if (hz > 0) root = Math.round(69 + 12 * Math.log2(hz / 440)); } } got.push({ id: r.a.id, root: clamp(root, 0, 127) }); } catch (e) { toast(String(e)); } }
    if (!got.length) return; got.sort((a, b) => a.root - b.root);
    mu.act('mu.h.zones', () => { got.forEach((g, i) => { const lo = auto ? (i === 0 ? 0 : Math.ceil((got[i - 1].root + g.root) / 2)) : 0, hi = auto ? (i === got.length - 1 ? 127 : Math.ceil((g.root + got[i + 1].root) / 2) - 1) : 127; I.zones.push({ asset: g.id, root: g.root, lo, hi, vlo: 0, vhi: 127, tune: 0, gain: 0, loop: false, ls: 0, le: 0, xf: .02 }); }); });
    toast(t('mu.in.zonesAdded', { n: String(got.length) }));
  };
  const Z = (z: Zone, k: keyof Zone, min: number, max: number, step = 1) => <input type="number" min={min} max={max} step={step} value={z[k] as number} onChange={e => mu.act('mu.h.zones', () => { (z as unknown as Record<string, number>)[k] = clamp(+e.target.value || 0, min, max); })} aria-label={t('mu.zn.' + k)} />;
  return <fieldset className="mu-fs mu-wide"><legend>{t('mu.in.zones')}</legend>
    <div className="mu-row"><button onClick={() => void add(false)}><Ico n="plus" s={13} />{t('mu.in.addZone')}</button><button onClick={() => void add(true)} title={t('mu.in.autoMapTip')}><Ico n="spark" s={13} />{t('mu.in.autoMap')}</button></div>
    {!I.zones.length ? <p className="mu-hint">{t('mu.in.noZones')}</p> : <table className="mu-tbl"><thead><tr>{['sound', 'root', 'lo', 'hi', 'vlo', 'vhi', 'tune', 'gain', 'loop', 'ls', 'le', 'xf', ''].map(k => <th key={k}>{k ? t('mu.zn.' + k) : ''}</th>)}</tr></thead><tbody>
      {I.zones.map((z, i) => { const a = mu.p.assets[z.asset]; return <tr key={i}>
        <td title={a ? (a.origin + ' · ' + a.licence) : z.asset}>{a?.name || z.asset.replace(/^gen:ms\//, '')}</td><td>{Z(z, 'root', 0, 127)}<small>{nName(z.root)}</small></td><td>{Z(z, 'lo', 0, 127)}</td><td>{Z(z, 'hi', 0, 127)}</td><td>{Z(z, 'vlo', 0, 127)}</td><td>{Z(z, 'vhi', 0, 127)}</td><td>{Z(z, 'tune', -100, 100)}</td><td>{Z(z, 'gain', -24, 12, .5)}</td>
        <td><input type="checkbox" checked={z.loop} onChange={e => mu.act('mu.h.zones', () => { z.loop = e.target.checked; if (z.loop && z.le <= z.ls) { const b = mu.store.get(z.asset); z.ls = b ? b.duration * .3 : 0; z.le = b ? b.duration * .9 : 1; } })} aria-label={t('mu.zn.loop')} /></td>
        <td>{Z(z, 'ls', 0, 600, .001)}</td><td>{Z(z, 'le', 0, 600, .001)}</td><td>{Z(z, 'xf', 0, 2, .005)}</td>
        <td><button className="mu-ib" onClick={() => void mu.noteOn(z.root, 100).then(() => setTimeout(() => mu.noteOff(z.root), 600))} title={t('mu.in.listen')}><Ico n="play" s={11} /></button><button className="mu-ib" onClick={() => mu.act('mu.h.zones', () => { I.zones.splice(i, 1); })} title={t('mu.in.delZone')}><Ico n="trash" s={11} /></button></td>
      </tr>; })}</tbody></table>}
    <small>{t('mu.in.zonesHint')}</small>
  </fieldset>;
}

/* ---------- clavier à l'écran et clavier de l'ordinateur ---------- */
/** touches du clavier de l'ordinateur par position (le même endroit en AZERTY et en QWERTY) : rangée du milieu = touches blanches */
export const KB_ROW = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP'];
export function Keyboard() {
  useMu(); const lo = mu.set.oct * 12 + 12 - 12, n = 36;
  return <div className="mu-kb" role="group" aria-label={t('mu.kb.title')}>
    <div className="mu-kbbar"><button className="mu-ib" title={t('mu.kb.down')} onClick={() => { mu.set.oct = clamp(mu.set.oct - 1, 1, 7); mu.saveSettings(); mu.emit(); }}><Ico n="chevL" s={12} /></button><span>{t('mu.kb.oct', { n: String(mu.set.oct) })}</span><button className="mu-ib" title={t('mu.kb.up')} onClick={() => { mu.set.oct = clamp(mu.set.oct + 1, 1, 7); mu.saveSettings(); mu.emit(); }}><Ico n="chevR" s={12} /></button><small>{t('mu.kb.hint')}</small><button className="mu-ib" title={t('mu.midi.panic')} onClick={() => mu.panic()}><Ico n="warn" s={12} /></button></div>
    <div className="mu-keysrow">{Array.from({ length: n }, (_, i) => { const p = lo + i, black = [1, 3, 6, 8, 10].includes(p % 12); return <button key={p} className={'mu-k' + (black ? ' b' : '') + (mu.held.has(p) ? ' on' : '')} aria-label={nName(p)}
      onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); void mu.noteOn(p, Math.round(50 + 77 * clamp((e.nativeEvent.offsetY) / ((e.currentTarget as HTMLElement).clientHeight || 1), 0, 1))); mu.emit(); }}
      onPointerUp={() => { mu.noteOff(p); mu.emit(); }} onPointerCancel={() => { mu.noteOff(p); mu.emit(); }}>{p % 12 === 0 ? <small>{nName(p)}</small> : null}</button>; })}</div>
  </div>;
}

/* ---------- effets ---------- */
export function FxEditor() {
  useMu(); const master = mu.fxSel.master, tr = master ? null : mu.track, list = master ? mu.p.master.fx : tr?.fx;
  if (!list) return <div className="mu-empty"><Ico n="fx" s={28} /><p>{t('mu.fx.none')}</p></div>;
  const others = mu.p.tracks.filter(x => !master && tr && x.id !== tr.id);
  const move = (i: number, d: number) => mu.act('mu.h.fxMove', () => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; });
  const chainsFor = CHAINS.filter(c => master ? c.cat === 'master' : c.cat !== 'master');
  return <div className="mu-dev">
    <div className="mu-prbar">
      <Ico n="fx" s={15} /><b>{master ? t('mu.mix.master') : tr!.name}</b>
      <button className={master ? '' : 'on'} onClick={() => { mu.fxSel = { master: false, id: 0 }; mu.emit(); }} disabled={!mu.track}>{t('mu.fx.track')}</button>
      <button className={master ? 'on' : ''} onClick={() => { mu.fxSel = { master: true, id: 0 }; mu.emit(); }}>{t('mu.mix.master')}</button>
      <span className="mu-sep" />
      <AddFx tr={tr || undefined} master={master} />
      <select value="" title={t('mu.fx.chainTip')} onChange={e => { const c = CHAINS.find(x => x.id === e.target.value); if (!c) return; mu.act('mu.h.chain', p => { const fx = chainFx(c, () => nid(p)); if (master) p.master.fx = fx; else trackOf(p, tr!.id)!.fx.push(...fx); }); }}>
        <option value="">{t('mu.fx.chains')}</option>{chainsFor.map(c => <option key={c.id} value={c.id}>{t('mu.pre.' + c.id)}</option>)}
        {searchPresets('', 'chain').map(u => <option key={u.id} value={'u:' + u.id} disabled>{u.name}</option>)}</select>
      <select value="" title={t('mu.fx.myChains')} onChange={e => { const u = searchPresets('', 'chain').find(x => x.id === e.target.value); if (!u) return; mu.act('mu.h.chain', p => { const fx = (deepClone(u.data) as Fx[]).map(f => ({ ...f, id: nid(p) })); if (master) p.master.fx = fx; else trackOf(p, tr!.id)!.fx.push(...fx); }); }}>
        <option value="">{t('mu.fx.myChains')}</option>{searchPresets('', 'chain').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <button className="mu-ib" title={t('mu.fx.saveChain')} disabled={!list.length} onClick={async () => { const n = await askText(t('mu.fx.chainName')); if (n) { savePreset('chain', n, list); toast(t('mu.in.saved')); mu.emit(); } }}><Ico n="save" s={14} /></button>
      <PresetFiles kind="chain" />
    </div>
    {!list.length ? <p className="mu-hint mu-devbody">{t('mu.fx.empty')}</p> :
      <div className="mu-fxrack">{list.map((f, i) => <FxCard key={f.id} f={f} i={i} n={list.length} tr={tr} others={others} move={move} remove={() => mu.act('mu.h.fxDel', () => { list.splice(i, 1); })} />)}</div>}
  </div>;
}
function FxCard({ f, i, n, tr, others, move, remove }: { f: Fx; i: number; n: number; tr: Track | null; others: Track[]; move: (i: number, d: number) => void; remove: () => void }) {
  const ext = f.type.startsWith('ext:') ? extList().find(e => e.id === f.type.slice(4)) : null, defs: ParamDef[] = ext ? paramDefs(ext) : FX_DEFS[f.type]?.params || [];
  const live = (k: string, v: number) => { f.p[k] = v; if (tr) mu.eng?.autoInput(tr.id, 'fx:' + f.id + ':' + k, v); else mu.sync(); mu.emit(); };
  const done = () => { if (tr) for (const d of defs) mu.eng?.autoRelease(tr.id, 'fx:' + f.id + ':' + d.k); mu.act('mu.h.fxParam', () => { /* appliqué */ }); };
  const focus = mu.fxSel.id === f.id;
  return <div className={'mu-fxcard' + (f.on ? '' : ' off') + (focus ? ' focus' : '')}>
    <div className="mu-fxhead">
      <button className={'mu-tb' + (f.on ? ' on' : '')} title={t('mu.fx.bypass')} aria-pressed={f.on} onClick={() => mu.act('mu.h.fxOn', () => { f.on = !f.on; })}><Ico n="check" s={11} /></button>
      <b>{fxName(f)}</b>{ext && <small className="mu-dim" title={ext.licence + ' · ' + ext.author}>{t('mu.ext.short')}</small>}{ext === undefined && f.type.startsWith('ext:') && <small className="bad">{t('mu.ext.absent')}</small>}
      <span className="mu-sp" />
      <button className="mu-ib" disabled={i === 0} title={t('mu.fx.left')} onClick={() => move(i, -1)}><Ico n="chevL" s={12} /></button>
      <button className="mu-ib" disabled={i === n - 1} title={t('mu.fx.right')} onClick={() => move(i, 1)}><Ico n="chevR" s={12} /></button>
      <button className="mu-ib" title={t('mu.fx.savePreset')} onClick={async () => { const nm = await askText(t('mu.in.saveName'), fxName(f)); if (nm) { savePreset('fx', nm, f); toast(t('mu.in.saved')); } }}><Ico n="save" s={12} /></button>
      <button className="mu-ib" title={t('mu.fx.del')} onClick={remove}><Ico n="trash" s={12} /></button>
    </div>
    {f.type === 'eq' && <EqCurve f={f} />}
    {f.type === 'comp' && tr && <label className="mu-par" title={t('mu.fx.sideTip')}><span>{t('mu.fx.side')}</span><select value={f.side || 0} onChange={e => { const s = +e.target.value; if (s && wouldCycle(mu.p, s, tr.id)) { toast(t('mu.mix.cycle')); return; } mu.act('mu.h.side', () => { f.side = s || undefined; }); }}><option value={0}>{t('mu.fx.noSide')}</option>{others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
    <div className="mu-fxpars">{defs.map(d => <Param key={d.k} label={ext ? (ext.params.find(q => q.k === d.k)?.label || d.k) : t('mu.fp.' + d.k)} v={f.p[d.k] ?? d.def} min={d.min} max={d.max} step={d.step} log={d.log} unit={d.unit} def={d.def}
      set={v => live(d.k, v)} done={done} auto={() => addLane(tr ? tr.id : null, 'fx:' + f.id + ':' + d.k)} learn={tr ? `fx:${tr.id}:${f.id}:${d.k}` : `mfx:${f.id}:${d.k}`} />)}</div>
    {(f.type === 'denoise') && <small className="mu-hint">{t('mu.fx.denoiseHint')}</small>}
  </div>;
}
function EqCurve({ f }: { f: Fx }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = mu.ctx; if (!c || !ctx) return; const W = c.clientWidth || 300, H = 70, dpr = devicePixelRatio || 1; c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fr = new Float32Array(W); for (let x = 0; x < W; x++) fr[x] = 20 * Math.pow(1000, x / W); const db = eqCurve(ctx, f, fr);
    g.fillStyle = '#0c0a12'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, H / 2, W, 1); for (const fq of [100, 1000, 10000]) g.fillRect(Math.log(fq / 20) / Math.log(1000) * W, 0, 1, H);
    g.strokeStyle = '#a78bfa'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < W; x++) { const y = H / 2 - clamp(db[x], -24, 24) / 24 * (H / 2 - 4); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  });
  return <canvas ref={ref} className="mu-eqc" aria-label={t('mu.fx.curve')} />;
}

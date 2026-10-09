// DedCut Musique — menus et fenêtres (suite) : menus de piste et de clip, chaînes d'effets, tempo et métrique, repères,
// accords et aide harmonique, idées et analyses (locales), commentaires et versions, extensions et plugins, vidéo de référence, routage.
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, ask, askText } from './state';
import type { Asset, AudioClip, Clip, Track } from './model';
import { CHORDS, COLORS, SCALES, b2s, barOf, barStart, chordName, clamp, clipEnd, deepClone, midiOf, newMidi, newTrack, nid, s2b, trackOf } from './model';
import { Modal, close, keyNames } from './dialogs';
import { CHAINS, chainFx, instPreset } from './presets';
import { copyRange, deleteRange, diatonic, duplicateClip, findClip, genBass, genChordNotes, genDrumPattern, genMelody, midiClipFrom, moveRange, nextChords, PROGRESSIONS, patternClip, sections, shiftTime, songEnd, splitClip, unlinkClip } from './ops';
import { detectBpm, detectChords, detectKey, transcribe, type Chans } from './dsp';
import { wouldCycle } from './engine';
import { paramName } from './arrange';
import { EXAMPLES, SDK_DOC, install, list as extList, remove as extRemove, revoke, setOn, validate } from './ext';
import * as IO from './io';
import { Ico } from './icons';
import { TunerDlg } from './tuner';
import { delayCh, harmonyCurve, psola, trackPitch, tuneCurve, voicedShare } from './vocal';

export function MoreDialogs({ d }: { d: string }) {
  switch (d) {
    case 'trackMenu': return <TrackMenu />;
    case 'clipMenu': return <ClipMenu />;
    case 'applyChain': return <ApplyChain />;
    case 'tempo': return <TempoDlg />;
    case 'marker': return <MarkerDlg />;
    case 'chords': return <ChordsDlg />;
    case 'ideas': return <IdeasDlg />;
    case 'tuner': return <TunerDlg />;
    case 'notes': return <NotesDlg />;
    case 'ext': return <ExtDlg />;
    case 'video': return <VideoDlg />;
    case 'routing': return <RoutingDlg />;
    default: return null;
  }
}

/* ---------- menu contextuel (petite liste près du clic, jamais sur l'en-tête de DedCut) ---------- */
function Menu({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  const top = Math.max(y, (document.getElementById('muApp')?.getBoundingClientRect().top || 60) + 4), left = Math.min(x, innerWidth - 250);
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);
  return <div className="mu-menuback" onPointerDown={e => { if (e.target === e.currentTarget) close(); }} onContextMenu={e => { e.preventDefault(); close(); }}><div className="mu-menu" role="menu" style={{ left, top: Math.min(top, innerHeight - 360) }}>{children}</div></div>;
}
const Item = ({ ico, label, on, disabled }: { ico: string; label: string; on: () => void; disabled?: boolean }) => <button role="menuitem" disabled={disabled} onClick={() => { close(); on(); }}><Ico n={ico} s={13} />{label}</button>;

function TrackMenu() {
  useMu(); const a = mu.dialogArg as { id: number; x: number; y: number }, tr = trackOf(mu.p, a.id); const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => { navigator.mediaDevices?.enumerateDevices().then(l => setInputs(l.filter(x => x.kind === 'audioinput'))).catch(() => { /* rien */ }); }, []);
  if (!tr) return null; const i = mu.p.tracks.indexOf(tr);
  const params = ['vol', 'pan', 'mute', ...tr.sends.map(s => 'send:' + s.bus), ...(tr.inst ? ['inst:vol', 'inst:cut'] : []), ...tr.fx.flatMap(f => Object.keys(f.p).map(k => 'fx:' + f.id + ':' + k))];
  return <Menu x={a.x} y={a.y}>
    <Item ico="pen" label={t('mu.tm.rename')} on={async () => { const n = await askText(t('mu.tm.rename'), tr.name); if (n) mu.act('mu.h.rename', () => { tr.name = n.slice(0, 40); }); }} />
    <div className="mu-colors">{COLORS.map(c => <button key={c} style={{ background: c }} aria-label={c} onClick={() => mu.act('mu.h.color', () => { tr.color = c; })} />)}</div>
    <Item ico="dup" label={t('mu.tm.dup')} on={() => mu.duplicateTrack(tr.id)} />
    <Item ico="chevU" label={t('mu.tm.up')} disabled={i === 0} on={() => mu.moveTrack(tr.id, i - 1)} />
    <Item ico="chevD" label={t('mu.tm.down')} disabled={i === mu.p.tracks.length - 1} on={() => mu.moveTrack(tr.id, i + 1)} />
    {tr.kind !== 'bus' && (tr.frozen ? <Item ico="snow" label={t('mu.tm.unfreeze')} on={() => mu.unfreeze(tr.id)} /> : <Item ico="snow" label={t('mu.tm.freeze')} on={() => void mu.freeze(tr.id)} />)}
    {(tr.kind === 'inst' || tr.kind === 'drum') && <Item ico="bounce" label={t('mu.tm.bounce')} on={() => void mu.bounce(tr.id)} />}
    <div className="mu-msub"><Ico n="human" s={13} /><select value="" onChange={e => { const v = e.target.value; if (!v) return; close(); mu.act('mu.h.autoAdd', () => { const l = tr.auto.find(x => x.param === v); if (l) l.show = true; else tr.auto.push({ param: v, pts: [], mode: 'read', show: true }); }); }}><option value="">{t('mu.tm.auto')}</option>{params.map(pr => <option key={pr} value={pr}>{paramName(tr, pr)}</option>)}</select></div>
    {tr.auto.length > 0 && <Item ico="list" label={t('mu.tm.showAll')} on={() => mu.act('mu.h.autoShow', () => { const all = tr.auto.every(l => l.show); for (const l of tr.auto) l.show = !all; })} />}
    {tr.kind === 'audio' && <div className="mu-msub"><Ico n="mic" s={13} /><select value={tr.input.dev} title={t('mu.tm.input')} onChange={e => mu.act('mu.h.input', () => { tr.input.dev = e.target.value; })}><option value="default">{t('mu.dev.default')}</option>{inputs.filter(d => d.deviceId && d.deviceId !== 'default').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || t('mu.dev.unnamed')}</option>)}</select>
      <select value={tr.input.stereo ? 's' : String(tr.input.ch)} title={t('mu.tm.chan')} onChange={e => mu.act('mu.h.input', () => { if (e.target.value === 's') tr.input.stereo = true; else { tr.input.stereo = false; tr.input.ch = +e.target.value; } })}><option value="0">{t('mu.tm.ch1')}</option><option value="1">{t('mu.tm.ch2')}</option><option value="s">{t('mu.tm.stereo')}</option></select></div>}
    <Item ico="trash" label={t('mu.tm.del')} on={() => void mu.deleteTrack(tr.id)} />
  </Menu>;
}
function ClipMenu() {
  useMu(); const a = mu.dialogArg as { x: number; y: number; b: number }, f = mu.clip; if (!f) return null; const { t: tr, c } = f, p = mu.p;
  const at = Math.max(c.t, Math.min(clipEnd(p, c), Math.round(a.b / mu.view.grid) * mu.view.grid));
  return <Menu x={a.x} y={a.y}>
    <Item ico="scissors" label={t('mu.cm.split')} on={() => mu.act('mu.h.split', q => { const x = findClip(q, c.id); if (x) splitClip(q, x.t, x.c, at); }, true)} />
    <Item ico="dup" label={t('mu.cm.dup')} on={() => mu.act('mu.h.dupClip', q => { const x = findClip(q, c.id); if (x) duplicateClip(q, x.t, x.c, clipEnd(q, x.c)); }, true)} />
    {c.kind === 'midi' && <Item ico="link" label={t('mu.cm.dupLinked')} on={() => mu.act('mu.h.dupLinked', q => { const x = findClip(q, c.id); if (x) duplicateClip(q, x.t, x.c, clipEnd(q, x.c), true); }, true)} />}
    {c.kind === 'midi' && <Item ico="link" label={t('mu.cm.unlink')} on={() => mu.act('mu.h.unlink', q => { const x = findClip(q, c.id); if (x && x.c.kind === 'midi') unlinkClip(q, x.c); })} />}
    <Item ico="mute" label={t(c.mute ? 'mu.cm.unmute' : 'mu.cm.mute')} on={() => mu.act('mu.h.mute', () => { c.mute = !c.mute; }, true)} />
    <Item ico="pen" label={t('mu.cm.rename')} on={async () => { const n = await askText(t('mu.cm.rename'), c.name); if (n) mu.act('mu.h.rename', () => { c.name = n.slice(0, 40); }); }} />
    <div className="mu-colors">{COLORS.map(col => <button key={col} style={{ background: col }} aria-label={col} onClick={() => mu.act('mu.h.color', () => { c.color = col; })} />)}<button aria-label={t('mu.cm.trackColor')} onClick={() => mu.act('mu.h.color', () => { c.color = ''; })}><Ico n="close" s={10} /></button></div>
    <Item ico="loop" label={t('mu.cm.loopHere')} on={() => mu.act('mu.h.loop', q => { q.loop = { on: true, a: c.t, b: clipEnd(q, c) }; }, true)} />
    {c.kind === 'audio' && <Item ico="undo" label={t('mu.ce.reverse')} on={() => mu.act('mu.h.reverse', () => { c.rev = !c.rev; }, true)} />}
    {mu.p.scenes.length > 0 && <div className="mu-msub"><Ico n="session" s={13} /><select value="" onChange={e => { const i = +e.target.value; if (e.target.value === '') return; close(); mu.act('mu.h.slot', q => { const T = trackOf(q, tr.id)!; const x = deepClone(c) as Clip; x.id = nid(q); x.t = 0; if (x.kind === 'midi') { const md = midiOf(q, x.data); if (md) { const m = newMidi(q, md.notes.map(n => ({ ...n, id: nid(q) }))); m.cc = deepClone(md.cc); x.data = m.id; } } (T.pool ||= []).push(x); while (T.slots.length <= i) T.slots.push(null); T.slots[i] = x.id; }); }}><option value="">{t('mu.cm.toScene')}</option>{mu.p.scenes.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}</select></div>}
    <Item ico="trash" label={t('mu.cm.del')} on={() => mu.deleteSelected()} />
  </Menu>;
}
function ApplyChain() {
  useMu(); const a = mu.dialogArg as { chain: string; track: number }, c = CHAINS.find(x => x.id === a.chain); const [tid, setTid] = useState<number>(c?.cat === 'master' ? -1 : a.track || mu.p.tracks[0]?.id || -1), [mode, setMode] = useState<'add' | 'replace'>('add');
  if (!c) return null;
  return <Modal title={t('mu.ac.title', { name: t('mu.pre.' + c.id) })}>
    <p className="mu-hint">{c.fx.map(([ty]) => t('mu.fx.' + ty)).join(' → ')}</p>
    <div className="mu-form"><label>{t('mu.ac.where')}<select value={tid} onChange={e => setTid(+e.target.value)}><option value={-1}>{t('mu.mix.master')}</option>{mu.p.tracks.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>{t('mu.ac.mode')}<select value={mode} onChange={e => setMode(e.target.value as 'add' | 'replace')}><option value="add">{t('mu.ac.add')}</option><option value="replace">{t('mu.ac.replace')}</option></select></label></div>
    <div className="mu-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={() => { mu.act('mu.h.chain', q => { const fx = chainFx(c, () => nid(q)), L = tid === -1 ? q.master.fx : trackOf(q, tid)?.fx; if (!L) return; if (mode === 'replace') L.splice(0, L.length); L.push(...fx); }); close(); }}>{t('mu.ac.apply')}</button></div>
  </Modal>;
}

/* ---------- tempo, métrique, tonalité, temps et sections ---------- */
function TempoDlg() {
  useMu(); const p = mu.p, pos = mu.pos(), bar = barOf(p, pos).bar, end = songEnd(p), secs = sections(p, end);
  const [ins, setIns] = useState(1);
  return <Modal title={t('mu.tp.title')} wide>
    <div className="mu-form">
      <label>{t('mu.new.bpm')}<input type="number" min={30} max={300} step={.01} value={p.tempo[0]?.bpm ?? p.bpm} onChange={e => { const v = clamp(+e.target.value || 120, 30, 300); mu.act('mu.h.tempo', q => { q.bpm = v; if (q.tempo[0]) q.tempo[0].bpm = v; else q.tempo = [{ t: 0, bpm: v, ramp: false }]; }, true); }} /></label>
      <label>{t('mu.tp.sig')}<input type="number" min={1} max={32} value={p.sigs[0]?.num ?? p.num} onChange={e => mu.act('mu.h.sig', q => { const n = clamp(+e.target.value || 4, 1, 32); q.num = n; if (q.sigs[0]) q.sigs[0].num = n; }, true)} />/<select value={p.sigs[0]?.den ?? p.den} onChange={e => mu.act('mu.h.sig', q => { const d = +e.target.value; q.den = d; if (q.sigs[0]) q.sigs[0].den = d; }, true)}>{[2, 4, 8, 16].map(d => <option key={d} value={d}>{d}</option>)}</select></label>
      <label>{t('mu.new.key')}<select value={p.key} onChange={e => mu.act('mu.h.key', q => { q.key = +e.target.value; })}>{keyNames().map((n, i) => <option key={i} value={i}>{n}</option>)}</select><select value={p.scale} onChange={e => mu.act('mu.h.key', q => { q.scale = e.target.value; })}>{Object.keys(SCALES).map(s => <option key={s} value={s}>{t('mu.sc.' + s)}</option>)}</select></label>
    </div>
    <h4>{t('mu.tp.changes')}</h4>
    <table className="mu-tbl"><thead><tr><th>{t('mu.tp.bar')}</th><th>BPM</th><th title={t('mu.tp.rampTip')}>{t('mu.tp.ramp')}</th><th /></tr></thead><tbody>
      {p.tempo.map((x, i) => <tr key={i}><td>{barOf(p, x.t).bar + 1}</td><td><input type="number" min={30} max={300} step={.01} value={x.bpm} onChange={e => mu.act('mu.h.tempo', () => { x.bpm = clamp(+e.target.value || 120, 30, 300); if (i === 0) p.bpm = x.bpm; }, true)} /></td>
        <td><input type="checkbox" checked={x.ramp} disabled={i === p.tempo.length - 1} onChange={e => mu.act('mu.h.tempo', () => { x.ramp = e.target.checked; }, true)} /></td><td>{i > 0 && <button className="mu-ib" onClick={() => mu.act('mu.h.tempo', q => { q.tempo.splice(i, 1); }, true)}><Ico n="trash" s={12} /></button>}</td></tr>)}</tbody></table>
    <button onClick={() => { const b = barStart(p, bar + (barStart(p, bar) < pos - 1e-6 ? 1 : 0)); if (p.tempo.some(x => Math.abs(x.t - b) < 1e-6)) return; mu.act('mu.h.tempo', q => { q.tempo.push({ t: b, bpm: Math.round(q.bpm), ramp: false }); q.tempo.sort((x, y) => x.t - y.t); }, true); }}><Ico n="plus" s={13} />{t('mu.tp.addTempo', { bar: String(bar + 1) })}</button>
    <h4>{t('mu.tp.sigs')}</h4>
    <table className="mu-tbl"><tbody>{p.sigs.map((s, i) => <tr key={i}><td>{t('mu.tp.fromBar', { bar: String(s.bar + 1) })}</td><td>{s.num}/{s.den}</td><td>{i > 0 && <button className="mu-ib" onClick={() => mu.act('mu.h.sig', q => { q.sigs.splice(i, 1); }, true)}><Ico n="trash" s={12} /></button>}</td></tr>)}</tbody></table>
        <button onClick={async () => { const nb = bar + 1; if (p.sigs.some(s => s.bar === nb)) return; const num = clamp(+((await askText(t('mu.tp.sigNum'), '3')) || 0), 0, 32); if (!num) return; const den = +((await askText(t('mu.tp.sigDen'), '4')) || 4); mu.act('mu.h.sig', q => { q.sigs.push({ bar: nb, num, den: [2, 4, 8, 16].includes(den) ? den : 4 }); q.sigs.sort((x, y) => x.bar - y.bar); }, true); }}><Ico n="plus" s={13} />{t('mu.tp.addSig', { bar: String(bar + 2) })}</button>
    <h4>{t('mu.tp.time')}</h4>
    <div className="mu-row"><input type="number" min={1} max={64} value={ins} onChange={e => setIns(clamp(+e.target.value || 1, 1, 64))} />{t('mu.tp.bars')}
      <button onClick={() => mu.act('mu.h.insTime', q => shiftTime(q, barStart(q, bar), ins * q.num * 4 / q.den), true)}>{t('mu.tp.insert', { bar: String(bar + 1) })}</button>
      <button onClick={() => mu.act('mu.h.delTime', q => { const a = barStart(q, bar), b = a + ins * q.num * 4 / q.den; deleteRange(q, a, b); /* deleteRange resserre déjà la suite */ }, true)}>{t('mu.tp.remove')}</button></div>
    {secs.length > 0 && <><h4>{t('mu.tp.sections')}</h4><table className="mu-tbl"><tbody>{secs.map(s => <tr key={s.id}><td><i className="mu-dot" style={{ background: s.color }} />{s.name}</td><td>{t('mu.tp.barsN', { a: String(barOf(p, s.a).bar + 1), b: String(barOf(p, s.b).bar + 1) })}</td>
      <td><button title={t('mu.tp.dupSecTip')} onClick={() => mu.act('mu.h.section', q => { copyRange(q, s.a, s.b, s.b, true); /* le repère de la section est recopié avec elle */ }, true)}><Ico n="dup" s={12} />{t('mu.tp.dupSec')}</button>
        <button title={t('mu.tp.moveSecTip')} onClick={async () => { const to = +((await askText(t('mu.tp.moveTo'), String(barOf(p, end).bar + 1))) || 0); if (to > 0) mu.act('mu.h.section', q => moveRange(q, s.a, s.b, barStart(q, to - 1)), true); }}><Ico n="chevR" s={12} />{t('mu.tp.moveSec')}</button>
        <button title={t('mu.tp.delSecTip')} onClick={() => mu.act('mu.h.section', q => { deleteRange(q, s.a, s.b); /* resserre aussi la suite */ }, true)}><Ico n="trash" s={12} /></button></td></tr>)}</tbody></table></>}
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}
function MarkerDlg() {
  useMu(); const m = mu.p.markers.find(x => x.id === mu.dialogArg); if (!m) return null;
  return <Modal title={t('mu.mk.title')}>
    <div className="mu-form"><label>{t('mu.mk.name')}<input value={m.name} onChange={e => { m.name = e.target.value.slice(0, 30); mu.emit(); }} onBlur={() => mu.act('mu.h.marker', () => { /* appliqué */ })} autoFocus /></label>
      <label>{t('mu.mk.kind')}<select value={m.kind} onChange={e => mu.act('mu.h.marker', () => { m.kind = e.target.value as 'marker' | 'section'; })}><option value="marker">{t('mu.mk.marker')}</option><option value="section">{t('mu.mk.section')}</option></select></label>
      <div className="mu-colors">{COLORS.map(c => <button key={c} className={m.color === c ? 'on' : ''} style={{ background: c }} aria-label={c} onClick={() => mu.act('mu.h.marker', () => { m.color = c; })} />)}</div>
      <div className="mu-row">{['intro', 'verse', 'chorus', 'bridge', 'drop', 'outro'].map(k => <button key={k} onClick={() => mu.act('mu.h.marker', () => { m.name = t('mu.tpl.n.' + k); m.kind = 'section'; })}>{t('mu.tpl.n.' + k)}</button>)}</div></div>
    <div className="mu-btns"><button onClick={() => { mu.act('mu.h.marker', q => { q.markers = q.markers.filter(x => x.id !== m.id); }); close(); }}><Ico n="trash" s={13} />{t('mu.mk.del')}</button><button onClick={() => { mu.seek(m.t); close(); }}>{t('mu.mk.go')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- accords : piste d'accords, aide harmonique facultative ---------- */
function ChordsDlg() {
  useMu(); const p = mu.p, at = typeof mu.dialogArg === 'number' ? mu.dialogArg as number : Math.floor(mu.pos()), names = keyNames();
  const [root, setRoot] = useState(p.key), [q, setQ] = useState('maj'), [len, setLen] = useState(4), [prog, setProg] = useState('pop'), [bars, setBars] = useState(4);
  const dia = diatonic(p.key, p.scale), prev = [...p.chords].filter(c => c.t < at).sort((a, b) => b.t - a.t)[0], prevDeg = prev ? dia.findIndex(d => d.root === ((prev.root % 12) + 12) % 12 && d.q === prev.q) : -1;
  const add = (r: number, qq: string, tt = at, l = len) => mu.act('mu.h.chord', x => { x.chords = x.chords.filter(c => c.t + c.len <= tt || c.t >= tt + l); x.chords.push({ t: tt, root: r, q: qq, len: l }); x.chords.sort((a, b) => a.t - b.t); });
  const cname = (r: number, qq: string) => names[((r % 12) + 12) % 12] + ' ' + t('mu.ch.' + qq);
  return <Modal title={t('mu.cd.title')} wide>
    <p className="mu-hint">{t('mu.cd.hint')}</p>
    <div className="mu-row"><span>{t('mu.cd.at', { bar: String(barOf(p, at).bar + 1) })}</span><select value={root} onChange={e => setRoot(+e.target.value)}>{names.map((n, i) => <option key={i} value={i}>{n}</option>)}</select><select value={q} onChange={e => setQ(e.target.value)}>{Object.keys(CHORDS).map(k => <option key={k} value={k}>{t('mu.ch.' + k)}</option>)}</select>
      <label>{t('mu.cd.len')}<select value={len} onChange={e => setLen(+e.target.value)}>{[1, 2, 4, 8].map(l => <option key={l} value={l}>{t('mu.cd.beats', { n: String(l) })}</option>)}</select></label><button className="pri" onClick={() => add(root, q)}><Ico n="plus" s={13} />{t('mu.cd.add')}</button></div>
    {dia.length > 0 && <><h4>{t('mu.cd.inKey', { key: names[p.key] + ' ' + t('mu.sc.' + p.scale) })}</h4><div className="mu-row">{dia.map((d, i) => <button key={i} className={prevDeg >= 0 && nextChords(prevDeg).includes(i) ? 'sugg' : ''} title={cname(d.root, d.q)} onClick={() => add(d.root, d.q)}><b>{d.deg}</b> {chordName(d.root, d.q)}</button>)}</div>
      {prevDeg >= 0 && <small className="mu-hint">{t('mu.cd.next', { chord: cname(prev!.root, prev!.q) })}</small>}</>}
    <h4>{t('mu.cd.progs')}</h4>
    <div className="mu-row"><select value={prog} onChange={e => setProg(e.target.value)}>{Object.keys(PROGRESSIONS).map(k => <option key={k} value={k}>{t('mu.pg.' + k)}</option>)}</select><label><input type="number" min={1} max={32} value={bars} onChange={e => setBars(clamp(+e.target.value || 4, 1, 32))} />{t('mu.tp.bars')}</label>
      <button disabled={!dia.length} onClick={() => mu.act('mu.h.chord', x => { const pr = PROGRESSIONS[prog], per = bars * x.num * 4 / x.den / pr.length; pr.forEach((dg, i) => { const d = dia[dg % 7]; const tt = at + i * per; x.chords = x.chords.filter(c => c.t + c.len <= tt || c.t >= tt + per); x.chords.push({ t: tt, root: d.root, q: d.q, len: per }); }); x.chords.sort((a, b) => a.t - b.t); })}>{t('mu.cd.applyProg')}</button></div>
    <h4>{t('mu.cd.list')}</h4>
    {p.chords.length ? <div className="mu-row mu-wrap">{p.chords.map((c, i) => <span key={i} className="mu-chip">{t('mu.cd.barN', { n: String(barOf(p, c.t).bar + 1) })} · {cname(c.root, c.q)}<button className="mu-ib" onClick={() => mu.act('mu.h.chord', x => { x.chords.splice(i, 1); })}><Ico n="close" s={10} /></button></span>)}</div> : <p className="mu-dim">{t('mu.cd.empty')}</p>}
    <div className="mu-btns"><button disabled={!p.chords.length} title={t('mu.cd.toNotesTip')} onClick={() => { mu.act('mu.h.ideas', x => { const T = newTrack(x, 'inst', t('mu.tpl.n.chords')); T.inst = instPreset('keys'); const notes = x.chords.flatMap(c => (CHORDS[c.q] || CHORDS.maj).map(iv => ({ id: nid(x), p: 60 + ((c.root % 12) + 12) % 12 + iv - (((c.root % 12) + 12) % 12 > 6 ? 12 : 0), t: c.t, d: c.len * .95, v: 90 }))); const a0 = Math.min(...x.chords.map(c => c.t)), e = Math.max(...x.chords.map(c => c.t + c.len)); midiClipFrom(x, T, notes.map(n => ({ ...n, t: n.t - a0 })), a0, e - a0, T.name); x.tracks.push(T); }, true); close(); }}><Ico n="piano" s={13} />{t('mu.cd.toNotes')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- idées et analyses (calculées sur le PC ; rien n'est envoyé) ---------- */
function IdeasDlg() {
  useMu(); const p = mu.p, f = mu.clip, audio = f && f.c.kind === 'audio' ? f as { t: Track; c: AudioClip } : null;
  const [vx, setVx] = useState({ key: mu.p.key, scale: mu.p.scale, style: 'natural' as 'natural' | 'strong' | 'robot', third: true, fifth: true, low: false }), [vxBusy, setVxBusy] = useState(false);
  const [o, setO] = useState({ style: 'basic', prog: 'pop', bars: 4, seed: 1 }), [res, setRes] = useState(''), [voices, setVoices] = useState<{ name: string; lang: string }[]>([]), [tts, setTts] = useState({ text: '', voice: '', rate: 0 });
  const FS = (window as unknown as { dedcutFS?: { ttsVoices(): Promise<{ name: string; lang: string; gender: string }[]>; ttsMake(text: string, voice: string, rate: number, name: string): Promise<{ path: string }> } }).dedcutFS;
  useEffect(() => { FS?.ttsVoices().then(v => { setVoices(v); setTts(x => ({ ...x, voice: v[0]?.name || '' })); }).catch(() => { /* rien */ }); }, []);
  const chOf = (): Chans | null => { if (!audio) return null; const b = mu.store.get(audio.c.asset); if (!b) return null; const a = Math.floor(audio.c.off * b.sampleRate), n = Math.floor(audio.c.dur * b.sampleRate); return Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).subarray(a, a + n)); };
  const sr = audio ? mu.store.get(audio.c.asset)?.sampleRate || 48000 : 48000, at = Math.floor(mu.pos());
  const idea = (kind: 'drums' | 'chords' | 'bass' | 'melody') => mu.act('mu.h.ideas', x => {
    const pr = PROGRESSIONS[o.prog], len = o.bars * x.num * 4 / x.den, name = t('mu.id.ideaName', { what: t('mu.id.' + kind) });
    if (kind === 'drums') { const T = newTrack(x, 'drum', name); T.inst = instPreset('kit-studio'); const pat = genDrumPattern(x, o.style, o.seed); T.inst!.patterns.push(pat); patternClip(x, T, pat, at, len); x.tracks.push(T); return; }
    const T = newTrack(x, 'inst', name); T.inst = instPreset(kind === 'bass' ? 'subBass' : kind === 'chords' ? 'keys' : 'pluck'); x.tracks.push(T);
    const notes = kind === 'chords' ? genChordNotes(x, pr, o.bars, 4, o.seed) : kind === 'bass' ? genBass(x, pr, o.bars, o.seed) : genMelody(x, pr, o.bars, o.seed); midiClipFrom(x, T, notes, at, len, name);
  }, true);
  return <Modal title={t('mu.id.title')} wide>
    <div className="mu-info"><Ico n="shield" s={16} /><div><b>{t('mu.id.localTitle')}</b><p>{t('mu.id.local')}</p></div></div>
    <h4>{t('mu.id.gen')}</h4>
    <div className="mu-form"><label>{t('mu.st.style')}<select value={o.style} onChange={e => setO({ ...o, style: e.target.value })}>{['basic', 'rock', 'house', 'trap', 'boombap'].map(s => <option key={s} value={s}>{t('mu.sty.' + s)}</option>)}</select></label>
      <label>{t('mu.cd.progs')}<select value={o.prog} onChange={e => setO({ ...o, prog: e.target.value })}>{Object.keys(PROGRESSIONS).map(k => <option key={k} value={k}>{t('mu.pg.' + k)}</option>)}</select></label>
      <label>{t('mu.tp.bars')}<input type="number" min={1} max={16} value={o.bars} onChange={e => setO({ ...o, bars: clamp(+e.target.value || 4, 1, 16) })} /></label>
      <label title={t('mu.pr.seedHint')}>{t('mu.pr.seed')}<input type="number" min={1} max={99999} value={o.seed} onChange={e => setO({ ...o, seed: clamp(+e.target.value || 1, 1, 99999) })} /><button className="mu-ib" onClick={() => setO({ ...o, seed: 1 + Math.floor(Math.random() * 99998) })}><Ico n="dice" s={13} /></button></label></div>
    <div className="mu-row">{(['drums', 'chords', 'bass', 'melody'] as const).map(k => <button key={k} onClick={() => idea(k)}><Ico n={k === 'drums' ? 'drum' : 'piano'} s={13} />{t('mu.id.' + k)}</button>)}</div>
    <small className="mu-hint">{t('mu.id.genHint')}</small>
    <h4>{t('mu.id.analyze')}</h4>
    {!audio ? <p className="mu-dim">{t('mu.id.pickAudio')}</p> : <>
      <div className="mu-row">
        <button onClick={async () => { const ch = chOf(); if (!ch) return; const bpm = detectBpm(ch, sr); setRes(bpm > 0 ? t('mu.id.bpm', { bpm: bpm.toFixed(1) }) : t('mu.ce.bpmNone')); if (bpm > 0 && await ask(t('mu.id.useBpm', { bpm: bpm.toFixed(1) }))) mu.act('mu.h.tempo', x => { x.bpm = Math.round(bpm * 100) / 100; if (x.tempo[0]) x.tempo[0].bpm = x.bpm; }, true); }}><Ico n="tempo" s={13} />{t('mu.id.tempo')}</button>
        <button onClick={() => { const ch = chOf(); if (!ch) return; const k = detectKey(ch, sr); setRes(t('mu.id.key', { key: keyNames()[k.key] + ' ' + t(k.minor ? 'mu.sc.minor' : 'mu.sc.major'), conf: String(Math.round(k.conf * 100)) })); }}><Ico n="note" s={13} />{t('mu.id.keyBtn')}</button>
        <button title={t('mu.id.chordsTip')} onClick={() => { const ch = chOf(); if (!ch) return; const L = detectChords(ch, sr, 60 / p.bpm * 2).filter(c => c.conf > .35); if (!L.length) { setRes(t('mu.id.noChords')); return; } const c0 = audio.c; mu.act('mu.h.chord', x => { for (const c of L) { const tb = s2b(x, b2s(x, c0.t) + c.t); x.chords = x.chords.filter(k => Math.abs(k.t - tb) > 1e-3); x.chords.push({ t: tb, root: c.root, q: c.q, len: 2 }); } x.chords.sort((a, b) => a.t - b.t); }); setRes(t('mu.id.chordsDone', { n: String(L.length) })); }}><Ico n="chord" s={13} />{t('mu.id.chords')}</button>
        <button title={t('mu.id.transTip')} onClick={() => { const ch = chOf(); if (!ch) return; const notes = transcribe(ch, sr); if (!notes.length) { setRes(t('mu.id.noNotes')); return; } const c0 = audio.c; mu.act('mu.h.ideas', x => { const T = newTrack(x, 'inst', c0.name + ' · ' + t('mu.id.transName')); T.inst = instPreset('basic'); x.tracks.push(T); const ns = notes.map(n => { const a = s2b(x, b2s(x, c0.t) + n.t) - c0.t; return { id: nid(x), p: n.p, t: a, d: Math.max(1 / 16, s2b(x, b2s(x, c0.t) + n.t + n.d) - c0.t - a), v: n.v }; }); midiClipFrom(x, T, ns, c0.t, clipEnd(x, c0) - c0.t, T.name); }, true); setRes(t('mu.id.transDone', { n: String(notes.length) })); }}><Ico n="piano" s={13} />{t('mu.id.trans')}</button>
      </div>
      <div className="mu-row">
        <button title={t('mu.id.centerTip')} onClick={() => void centerSplit(audio, true)}>{t('mu.id.center')}</button>
        <button title={t('mu.id.centerTip')} onClick={() => void centerSplit(audio, false)}>{t('mu.id.karaoke')}</button>
        <button title={t('mu.id.cleanTip')} onClick={() => { const c = CHAINS.find(x => x.id === 'voiceRepair')!; mu.act('mu.h.chain', x => { const T = trackOf(x, audio.t.id)!; T.fx.unshift(...chainFx(c, () => nid(x))); }); setRes(t('mu.id.cleanDone')); }}>{t('mu.id.clean')}</button>
      </div>
      {res && <p className="mu-res">{res}</p>}
      <small className="mu-hint">{t('mu.id.stemsHint')}</small>
    </>}
    <h4>{t('mu.vx.title')}</h4>
    {!audio ? <p className="mu-dim">{t('mu.id.pickAudio')}</p> : <>
      <div className="mu-form"><label>{t('mu.vx.key')}<select value={vx.key} onChange={e => setVx({ ...vx, key: +e.target.value })}>{keyNames().map((n, i) => <option key={i} value={i}>{n}</option>)}</select><select value={vx.scale} aria-label={t('mu.vx.key')} onChange={e => setVx({ ...vx, scale: e.target.value })}>{Object.keys(SCALES).filter(k => k !== 'chromatic').map(k => <option key={k} value={k}>{t('mu.sc.' + k)}</option>)}</select></label>
        <button title={t('mu.vx.findKeyTip')} onClick={() => { const ch = chOf(); if (!ch) return; const k = detectKey(ch, sr); setVx({ ...vx, key: k.key, scale: k.minor ? 'minor' : 'major' }); setRes(t('mu.id.key', { key: keyNames()[k.key] + ' ' + t(k.minor ? 'mu.sc.minor' : 'mu.sc.major'), conf: String(Math.round(k.conf * 100)) })); }}><Ico n="note" s={13} />{t('mu.id.keyBtn')}</button></div>
      <div className="mu-form"><label>{t('mu.st.style')}<select value={vx.style} onChange={e => setVx({ ...vx, style: e.target.value as 'natural' | 'strong' | 'robot' })}>{(['natural', 'strong', 'robot'] as const).map(k => <option key={k} value={k}>{t('mu.vx.st.' + k)}</option>)}</select></label>
        <button className="pri" disabled={vxBusy} title={t('mu.vx.tuneTip')} onClick={async () => { setVxBusy(true); await vocalTune(audio, vx.key, vx.scale, vx.style, setRes); setVxBusy(false); }}><Ico n="note" s={13} />{t('mu.vx.tune')}</button></div>
      <div className="mu-row"><label className="mu-chk"><input type="checkbox" checked={vx.third} onChange={e => setVx({ ...vx, third: e.target.checked })} />{t('mu.vx.third')}</label>
        <label className="mu-chk"><input type="checkbox" checked={vx.fifth} onChange={e => setVx({ ...vx, fifth: e.target.checked })} />{t('mu.vx.fifth')}</label>
        <label className="mu-chk"><input type="checkbox" checked={vx.low} onChange={e => setVx({ ...vx, low: e.target.checked })} />{t('mu.vx.low')}</label>
        <button disabled={vxBusy || !(vx.third || vx.fifth || vx.low)} title={t('mu.vx.choirTip')} onClick={async () => { setVxBusy(true); await vocalChoir(audio, vx.key, vx.scale, vx, setRes); setVxBusy(false); }}><Ico n="mic" s={13} />{t('mu.vx.choir')}</button></div>
      <small className="mu-hint">{t('mu.vx.hint')}</small>
    </>}
    <h4>{t('mu.id.voice')}</h4>
    {!FS ? <p className="mu-dim">{t('mu.id.voiceApp')}</p> : <div className="mu-col">
      <textarea rows={2} value={tts.text} maxLength={600} placeholder={t('mu.id.voicePh')} onChange={e => setTts({ ...tts, text: e.target.value })} />
      <div className="mu-row"><select value={tts.voice} onChange={e => setTts({ ...tts, voice: e.target.value })}>{voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select><label>{t('mu.id.rate')}<input type="range" min={-5} max={5} value={tts.rate} onChange={e => setTts({ ...tts, rate: +e.target.value })} /></label>
        <button disabled={!tts.text.trim() || !tts.voice} onClick={async () => { try { const fl = await FS.ttsMake(tts.text.trim(), tts.voice, tts.rate, 'voix ' + Date.now().toString(36)); await mu.importAudio([{ path: fl.path }], Math.floor(mu.pos())); setRes(t('mu.id.voiceDone')); } catch (e) { toast(String(e)); } }}><Ico n="mic" s={13} />{t('mu.id.voiceGo')}</button></div>
      <small className="mu-hint">{t('mu.id.voiceHint')}</small></div>}
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}
/* ---------- voix chantée : justesse et chœurs (src/music/vocal.ts), une nouvelle piste par résultat ---------- */
const clipChans = (b: AudioBuffer, c: AudioClip): Chans => { const a = Math.floor(c.off * b.sampleRate), n = Math.floor(c.dur * b.sampleRate); return Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).slice(a, a + n)); };
const vxTick = () => new Promise(r => setTimeout(r, 20));
async function vocalSave(f: { t: Track; c: AudioClip }, b: AudioBuffer, out: Chans, label: string, after: number, set?: (T: Track) => void) {
  const A: Asset = { id: 'drv' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: f.c.name + ' (' + label + ')', path: null, sr: b.sampleRate, ch: out.length, len: out[0].length / b.sampleRate, hash: '', origin: 'render', licence: mu.p.assets[f.c.asset]?.licence || 'user', tags: [], bpm: 0, key: '' };
  await IO.persistSound(mu.p, mu.store, A, out, 'Rendus');
  return { add: (x: typeof mu.p) => { const T = newTrack(x, 'audio', A.name); x.tracks.splice(Math.min(x.tracks.length, x.tracks.findIndex(y => y.id === f.t.id) + 1 + after), 0, T); T.clips.push({ ...deepClone(f.c), id: nid(x), asset: A.id, off: 0, take: undefined }); if (set) set(T); return T; } };
}
async function vocalTune(f: { t: Track; c: AudioClip }, key: number, scale: string, style: 'natural' | 'strong' | 'robot', say: (s: string) => void) {
  const b = mu.store.get(f.c.asset); if (!b) return;
  say(t('mu.vx.working')); await vxTick();
  const ch = clipChans(b, f.c), P = trackPitch(ch, b.sampleRate);
  if (voicedShare(P) < .04) { say(t('mu.vx.noVoice')); return; }
  const out = psola(ch, b.sampleRate, P, tuneCurve(P, key, scale, style));
  const r = await vocalSave(f, b, out, t('mu.vx.n.' + style), 0);
  // la voix d'origine est gardée, coupée : on peut comparer en la réactivant
  mu.act('mu.h.ideas', x => { r.add(x); const O = trackOf(x, f.t.id); if (O) O.mute = true; }, true);
  say(t('mu.vx.tuneDone'));
}
async function vocalChoir(f: { t: Track; c: AudioClip }, key: number, scale: string, o: { third: boolean; fifth: boolean; low: boolean }, say: (s: string) => void) {
  const b = mu.store.get(f.c.asset); if (!b) return;
  say(t('mu.vx.working')); await vxTick();
  const ch = clipChans(b, f.c), sr = b.sampleRate, P = trackPitch(ch, sr);
  if (voicedShare(P) < .04) { say(t('mu.vx.noVoice')); return; }
  // chaque voix : un peu décalée, un peu désaccordée, d'un côté différent (comme de vrais choristes)
  const all = [o.third ? { steps: 2, oct: 0, pan: -.45, delay: .018, cents: 6, label: t('mu.vx.third') } : null, o.fifth ? { steps: 4, oct: 0, pan: .45, delay: .027, cents: -6, label: t('mu.vx.fifth') } : null, o.low ? { steps: 0, oct: -1, pan: 0, delay: .012, cents: 0, label: t('mu.vx.low') } : null];
  const parts = all.filter((v): v is NonNullable<typeof v> => !!v);
  const made: { add: (x: typeof mu.p) => Track }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const v = parts[i]; say(t('mu.vx.choirWorking', { n: String(i + 1), total: String(parts.length) })); await vxTick();
    const out = delayCh(psola(ch, sr, P, harmonyCurve(P, key, scale, v.steps, v.oct), v.cents), Math.round(v.delay * sr));
    made.push(await vocalSave(f, b, out, v.label, i, T => { T.vol = -7; T.pan = v.pan; }));
  }
  mu.act('mu.h.ideas', x => { for (const m of made) m.add(x); }, true);
  say(t('mu.vx.choirDone', { n: String(parts.length) }));
}
/** séparation simple d'un son stéréo : centre (souvent la voix) ou côtés (sans le centre) — ce n'est PAS une séparation par IA */
async function centerSplit(f: { t: Track; c: AudioClip }, center: boolean) {
  const b = mu.store.get(f.c.asset); if (!b || b.numberOfChannels < 2) { toast(t('mu.id.needStereo')); return; }
  const L = b.getChannelData(0), R = b.getChannelData(1), n = b.length, o = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) / 2, s = (L[i] - R[i]) / 2; if (center) { o[0][i] = o[1][i] = m; } else { o[0][i] = s; o[1][i] = -s; } }
  const A: Asset = { id: 'drv' + Date.now().toString(36), name: f.c.name + ' (' + t(center ? 'mu.id.centerShort' : 'mu.id.sidesShort') + ')', path: null, sr: b.sampleRate, ch: 2, len: b.duration, hash: '', origin: 'render', licence: mu.p.assets[f.c.asset]?.licence || 'user', tags: [], bpm: 0, key: '' };
  await IO.persistSound(mu.p, mu.store, A, o, 'Rendus');
  mu.act('mu.h.ideas', x => { const T = newTrack(x, 'audio', A.name); x.tracks.splice(x.tracks.findIndex(y => y.id === f.t.id) + 1, 0, T); T.clips.push({ ...deepClone(f.c), id: nid(x), asset: A.id, take: undefined }); }, true);
  toast(t('mu.id.splitDone'));
}

/* ---------- commentaires et versions ---------- */
function NotesDlg() {
  useMu(); const p = mu.p; const [txt, setTxt] = useState(''), [vname, setVname] = useState('');
  return <Modal title={t('mu.nt.title')} wide>
    <h4>{t('mu.nt.comments')}</h4>
    <div className="mu-row"><input value={txt} placeholder={t('mu.nt.ph')} onChange={e => setTxt(e.target.value.slice(0, 300))} onKeyDown={e => { if (e.key === 'Enter' && txt.trim()) { mu.act('mu.h.comment', q => { q.comments.push({ id: nid(q), t: mu.pos(), text: txt.trim(), at: Date.now(), done: false }); }); setTxt(''); } e.stopPropagation(); }} /><button disabled={!txt.trim()} onClick={() => { mu.act('mu.h.comment', q => { q.comments.push({ id: nid(q), t: mu.pos(), text: txt.trim(), at: Date.now(), done: false }); }); setTxt(''); }}>{t('mu.nt.add')}</button></div>
    <ul className="mu-list">{[...p.comments].sort((a, b) => a.t - b.t).map(c => <li key={c.id} className={c.done ? 'mu-dim' : ''}><input type="checkbox" checked={c.done} onChange={e => mu.act('mu.h.comment', () => { c.done = e.target.checked; })} aria-label={t('mu.nt.done')} />
      <button className="mu-link" onClick={() => mu.seek(c.t)}>{t('mu.cd.barN', { n: String(barOf(p, c.t).bar + 1) })}</button><span>{c.text}</span><small>{new Date(c.at).toLocaleString()}</small><span className="mu-sp" /><button className="mu-ib" onClick={() => mu.act('mu.h.comment', q => { q.comments = q.comments.filter(x => x.id !== c.id); })}><Ico n="trash" s={12} /></button></li>)}</ul>
    {!p.comments.length && <p className="mu-dim">{t('mu.nt.none')}</p>}
    <h4>{t('mu.nt.versions')}</h4>
    <p className="mu-hint">{t('mu.nt.versionsHint')}</p>
    <div className="mu-row"><input value={vname} placeholder={t('mu.nt.vph')} onChange={e => setVname(e.target.value)} onKeyDown={e => e.stopPropagation()} /><button onClick={() => { mu.saveVersion(vname.trim() || new Date().toLocaleString()); setVname(''); }}><Ico n="save" s={13} />{t('mu.nt.saveVer')}</button></div>
    <ul className="mu-list">{p.versions.map((v, i) => <li key={i}><Ico n="clock" s={12} /><b>{v.name}</b><small>{new Date(v.at).toLocaleString()}</small><span className="mu-sp" /><button onClick={() => mu.restoreVersion(i)}>{t('mu.nt.restore')}</button><button className="mu-ib" onClick={() => { p.versions.splice(i, 1); p.dirty = true; mu.emit(); }}><Ico n="trash" s={12} /></button></li>)}</ul>
    <p className="mu-hint">{t('mu.nt.collab')}</p>
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- extensions (DedCut) et plugins (VST3 / CLAP : inventaire seulement) ---------- */
function ExtDlg() {
  useMu(); const [tab, setTab] = useState<'ext' | 'native' | 'sdk'>('ext'), [plugs, setPlugs] = useState<{ format: string; name: string; vendor: string; version: string; path: string; x64: boolean; size: number }[] | null>(null);
  const L = extList();
  const installText = async (txt: string) => {
    let m: unknown; try { m = JSON.parse(txt); } catch { toast(t('mu.ext.bad.format')); return; }
    const why = validate(m); if (why) { toast(t('mu.ext.bad.' + why)); return; }
    const x = m as { name: string; author: string; licence: string; ver: string; source: string; id: string; description: string };
    const had = L.find(e => e.id === x.id);
    if (!(await ask(t(had ? 'mu.ext.confirmUpd' : 'mu.ext.confirm', { name: x.name, author: x.author, licence: x.licence, ver: x.ver, source: x.source || '—', old: had?.ver || '' })))) return;
    try { const r = await install(txt); toast(t(r.updated ? 'mu.ext.updated' : 'mu.ext.installed', { name: r.rec.name })); await mu.eng?.loadExts(); mu.sync(); mu.emit(); } catch (e) { toast(String((e as Error).message).startsWith('mu.') ? t(String((e as Error).message)) : String(e)); }
  };
  const pick = async () => { const F = IO.fs(); let txt = ''; if (F) { const [f] = await F.open(t('mu.ext.file'), ['json', 'dcmusext'], false).catch(() => []); if (f) txt = await (await fetch(F.url(f.path))).text(); } else { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,.dcmusext'; txt = await new Promise<string>(ok => { i.onchange = async () => ok(i.files?.[0] ? await i.files[0].text() : ''); i.click(); }); } if (txt) await installText(txt); };
  return <Modal title={t('mu.ext.title')} wide>
    <div className="mu-seg">{(['ext', 'native', 'sdk'] as const).map(k => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t('mu.ext.tab_' + k)}</button>)}</div>
    {tab === 'ext' && <>
      <div className="mu-info"><Ico n="shield" s={16} /><p>{t('mu.ext.safety')}</p></div>
      <div className="mu-row"><button className="pri" onClick={() => void pick()}><Ico n="open" s={13} />{t('mu.ext.install')}</button>
        <label title={t('mu.pref.safeTip')}><input type="checkbox" checked={mu.set.safeExt} onChange={e => { mu.set.safeExt = e.target.checked; mu.saveSettings(); void mu.rebuild(); }} />{t('mu.pref.safe')}</label></div>
      <table className="mu-tbl"><thead><tr><th>{t('mu.ext.name')}</th><th>{t('mu.ext.author')}</th><th>{t('mu.ext.licence')}</th><th>{t('mu.ext.fingerprint')}</th><th>{t('mu.ext.state')}</th><th /></tr></thead><tbody>
        {L.map(e => <tr key={e.id}><td title={e.description}><b>{e.name}</b> <small>{e.ver}</small></td><td>{e.author}<br /><small>{e.source}</small></td><td>{e.licence}</td><td><code>{e.hash.slice(0, 12)}</code></td>
          <td>{e.quarantine ? <span className="bad" title={e.quarantine === 'stuck' ? t('mu.ext.stuckWhy') : e.quarantine}>{t('mu.ext.quar')}</span> : e.on ? t('mu.ext.on') : t('mu.ext.off')}</td>
          <td><button onClick={() => { setOn(e.id, !e.on || !!e.quarantine); void mu.rebuild(); }}>{e.on && !e.quarantine ? t('mu.ext.disable') : t('mu.ext.enable')}</button>
            <button title={t('mu.ext.revokeTip')} onClick={async () => { if (await ask(t('mu.ext.revokeQ', { name: e.name }))) { revoke(e.id); void mu.rebuild(); } }}>{t('mu.ext.revoke')}</button>
            <button className="mu-ib" title={t('mu.ext.remove')} onClick={() => { extRemove(e.id); void mu.rebuild(); }}><Ico n="trash" s={12} /></button></td></tr>)}</tbody></table>
      {!L.length && <p className="mu-dim">{t('mu.ext.none')}</p>}
      <h4>{t('mu.ext.examples')}</h4>
      <div className="mu-row">{EXAMPLES.map(x => <button key={x.id} onClick={() => void installText(JSON.stringify(x))}><Ico n="plus" s={12} />{x.name}</button>)}</div>
      <p className="mu-hint">{t('mu.ext.missingHint')}</p>
    </>}
    {tab === 'native' && <>
      <div className="mu-info"><Ico n="warn" s={16} /><p>{t('mu.ext.nativeText')}</p></div>
      <button disabled={!IO.fs()} onClick={async () => { const F = IO.fs(); if (!F) return; setPlugs(null); try { setPlugs(await F.plugins()); } catch (e) { toast(String(e)); setPlugs([]); } }}><Ico n="search" s={13} />{t('mu.ext.scan')}</button>
      {!IO.fs() && <p className="mu-dim">{t('mu.id.voiceApp')}</p>}
      {plugs && (plugs.length ? <table className="mu-tbl"><thead><tr><th>{t('mu.ext.name')}</th><th>{t('mu.ext.format')}</th><th>{t('mu.ext.vendor')}</th><th>{t('mu.ext.version')}</th><th>64 bits</th><th>{t('mu.ext.path')}</th></tr></thead><tbody>{plugs.map(x => <tr key={x.path}><td>{x.name}</td><td>{x.format}</td><td>{x.vendor || '—'}</td><td>{x.version || '—'}</td><td>{x.x64 ? '✓' : '—'}</td><td title={x.path}><small>{x.path}</small></td></tr>)}</tbody></table> : <p className="mu-dim">{t('mu.ext.noPlugs')}</p>)}
    </>}
    {tab === 'sdk' && <><p className="mu-hint">{t('mu.ext.sdkIntro')}</p><pre className="mu-log">{SDK_DOC}</pre><pre className="mu-log">{JSON.stringify(EXAMPLES[0], null, 1)}</pre></>}
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- vidéo de référence (lecture seule, synchronisée) ---------- */
function VideoDlg() {
  useMu(); const v = mu.p.video, F = IO.fs();
  const pick = async () => { if (!F) { toast(t('mu.id.voiceApp')); return; } const [f] = await F.open(t('mu.vd.file'), ['mp4', 'webm', 'mov', 'mkv', 'm4v'], false).catch(() => []); if (f) mu.act('mu.h.video', q => { q.video = { path: f.path, off: 0, show: true }; }); };
  const [vids, setVids] = useState<{ name: string; path: string }[] | null>(null);
  const fromMontage = () => { try { const m = (new Function('return typeof media!=="undefined"?media:[]')() as { type: string; path?: string; name: string }[]).filter(x => x.type === 'video' && x.path).map(x => ({ name: x.name, path: x.path! })); if (!m.length) { toast(t('mu.vd.noneMontage')); return; } setVids(m); } catch { toast(t('mu.vd.noneMontage')); } };
  return <Modal title={t('mu.vd.title')}>
    <p className="mu-hint">{t('mu.vd.hint')}</p>
    <div className="mu-row"><button onClick={() => void pick()}><Ico n="video" s={13} />{t('mu.vd.pick')}</button><button onClick={fromMontage}><Ico n="link" s={13} />{t('mu.vd.montage')}</button></div>
    {vids && <ul className="mu-list">{vids.map(x => <li key={x.path}><Ico n="video" s={12} />{x.name}<span className="mu-sp" /><button onClick={() => { mu.act('mu.h.video', q => { q.video = { path: x.path, off: 0, show: true }; }); setVids(null); }}>{t('mu.vd.use')}</button></li>)}</ul>}
    {v && <div className="mu-form"><span className="mu-dim" title={v.path}>{v.path.replace(/^.*[\\/]/, '')}</span>
      <label>{t('mu.vd.off')}<input type="number" step={.01} value={v.off} onChange={e => mu.act('mu.h.video', () => { v.off = +e.target.value || 0; })} />s</label>
      <label><input type="checkbox" checked={v.show} onChange={e => mu.act('mu.h.video', () => { v.show = e.target.checked; })} />{t('mu.vd.show')}</label>
      <button onClick={() => mu.act('mu.h.video', q => { q.video = null; })}><Ico n="trash" s={13} />{t('mu.vd.remove')}</button></div>}
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- routage : sorties et envois, boucles interdites ---------- */
function RoutingDlg() {
  useMu(); const p = mu.p, buses = p.tracks.filter(x => x.kind === 'bus');
  const setOut = (tr: Track, id: number) => { if (id && wouldCycle(p, tr.id, id)) { toast(t('mu.mix.cycle')); return; } mu.act('mu.h.route', () => { tr.out = id; }); };
  const toggleSend = (tr: Track, b: Track) => { const s = tr.sends.find(x => x.bus === b.id); if (!s && wouldCycle(p, tr.id, b.id)) { toast(t('mu.mix.cycle')); return; } mu.act('mu.h.send', () => { if (s) tr.sends = tr.sends.filter(x => x !== s); else tr.sends.push({ bus: b.id, db: -12, pre: false, on: true }); }); };
  return <Modal title={t('mu.rt.title')} wide>
    <p className="mu-hint">{t('mu.rt.hint')}</p>
    <table className="mu-tbl mu-matrix"><thead><tr><th>{t('mu.rt.source')}</th><th>{t('mu.mix.master')}</th>{buses.map(b => <th key={b.id}>{b.name}</th>)}</tr></thead><tbody>
      {p.tracks.map(tr => <tr key={tr.id}><td><i className="mu-dot" style={{ background: tr.color }} />{tr.name}</td>
        <td><input type="radio" name={'o' + tr.id} checked={!tr.out} onChange={() => setOut(tr, 0)} aria-label={t('mu.rt.toMaster')} /></td>
        {buses.map(b => b.id === tr.id ? <td key={b.id}>—</td> : <td key={b.id}><input type="radio" name={'o' + tr.id} checked={tr.out === b.id} onChange={() => setOut(tr, b.id)} title={t('mu.rt.out')} /><input type="checkbox" checked={tr.sends.some(s => s.bus === b.id)} onChange={() => toggleSend(tr, b)} title={t('mu.rt.send')} disabled={tr.kind === 'bus' && false} /></td>)}</tr>)}</tbody></table>
    <p className="mu-hint">{t('mu.rt.legend')}</p>
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}
export { songEnd };

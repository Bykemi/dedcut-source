// DedCut Musique — fenêtres : nouveau projet (modèles), export (master, stems, versions, contrôle du fichier),
// son (sorties, fréquence, tampon, latence, écoute de contrôle), MIDI, récupération, sons manquants, aide, raccourcis, préférences.
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, downloadBlob, DEF_KEYS, ask } from './state';
import { NOTE_FR, NOTE_N, SCALES, b2s, clamp } from './model';
import { TEMPLATES, type TemplateId } from './templates';
import * as IO from './io';
import { songEnd } from './ops';
import { Ico } from './icons';
import { MoreDialogs } from './dialogs2';

export function Modal({ title, children, wide, onClose = close }: { title: string; children: React.ReactNode; wide?: boolean; onClose?: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [onClose]);
  return <div className="mu-modal" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={'mu-mbox' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}><h3>{title}<button className="mu-ib" onClick={onClose} aria-label={t('common.close')}><Ico n="close" s={14} /></button></h3>{children}</div></div>;
}
export const close = () => { mu.dialog = null; mu.dialogArg = null; mu.emit(); };
const fr = () => (document.documentElement.lang || 'fr').startsWith('fr');
export const keyNames = () => fr() ? NOTE_FR : NOTE_N;

export function Dialogs() {
  useMu(); const d = mu.dialog; if (!d) return null;
  switch (d) {
    case 'new': return <NewDlg />;
    case 'export': return <ExportDlg />;
    case 'audio': return <AudioDlg />;
    case 'midi': return <MidiDlg />;
    case 'recover': return <RecoverDlg />;
    case 'missing': return <MissingDlg />;
    case 'help': return <HelpDlg />;
    case 'keys': return <KeysDlg />;
    case 'prefs': return <PrefsDlg />;
    default: return <MoreDialogs d={d} />;
  }
}

/* ---------- nouveau projet ---------- */
function NewDlg() {
  const [o, setO] = useState({ tpl: 'beat' as TemplateId, name: '', bpm: 120, key: 0, scale: 'major', sr: 48000 });
  const set = (k: Partial<typeof o>) => setO({ ...o, ...k });
  return <Modal title={t('mu.new.title')} wide>
    <div className="mu-tpls">{TEMPLATES.map(id => <button key={id} className={o.tpl === id ? 'on' : ''} onClick={() => set({ tpl: id, bpm: id === 'beat' ? 140 : id === 'voice' ? 100 : id === 'video' ? 90 : 120 })}>
      <Ico n={id === 'beat' ? 'drum' : id === 'voice' ? 'mic' : id === 'video' ? 'video' : id === 'empty' ? 'file' : id === 'song' ? 'note' : 'piano'} s={22} /><b>{t('mu.tpl.' + id)}</b><small>{t('mu.tpl.' + id + 'D')}</small></button>)}</div>
    <div className="mu-form">
      <label>{t('mu.new.name')}<input value={o.name} placeholder={t('mu.untitled')} onChange={e => set({ name: e.target.value.slice(0, 60) })} autoFocus /></label>
      <label>{t('mu.new.bpm')}<input type="number" min={30} max={300} value={o.bpm} onChange={e => set({ bpm: clamp(+e.target.value || 120, 30, 300) })} /></label>
      <label>{t('mu.new.key')}<select value={o.key} onChange={e => set({ key: +e.target.value })}>{keyNames().map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
        <select value={o.scale} onChange={e => set({ scale: e.target.value })}>{Object.keys(SCALES).map(s => <option key={s} value={s}>{t('mu.sc.' + s)}</option>)}</select></label>
      <label title={t('mu.new.srTip')}>{t('mu.new.sr')}<select value={o.sr} onChange={e => set({ sr: +e.target.value })}>{[44100, 48000, 96000].map(s => <option key={s} value={s}>{s / 1000} kHz</option>)}</select></label>
    </div>
    <div className="mu-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={() => void mu.newFrom(o.tpl, o.name, o.bpm, o.key, o.scale, o.sr)}><Ico n="plus" s={13} />{t('mu.new.create')}</button></div>
  </Modal>;
}

/* ---------- export ---------- */
type Job = { name: string; only: number[] | null; fmt: IO.ExpFmt };
type Report = { name: string; dur: number; expected: number; durOk: boolean; ch: number; clip: number; truePeak: number; lufs: number; size: number; where: string };
function ExportDlg() {
  const p = mu.p, end = Math.max(1, songEnd(p));
  const [o, setO] = useState({ range: 'song' as 'song' | 'loop' | 'sel', what: 'master' as 'master' | 'stems' | 'both', fmts: ['wav24'] as IO.ExpFmt[], sr: p.sr, ch: 2 as 1 | 2, tail: 2, trim: false, padA: 0, padB: 0, fadeIn: 0, fadeOut: 0, kbps: 192, master: true, montage: false });
  const [busy, setBusy] = useState<{ i: number; n: number; x: number; name: string } | null>(null), [reports, setReports] = useState<Report[]>([]), [cancel] = useState({ stop: false });
  const set = (k: Partial<typeof o>) => setO({ ...o, ...k });
  const rng = o.range === 'loop' && p.loop.b > p.loop.a ? { a: p.loop.a, b: p.loop.b } : o.range === 'sel' && mu.sel.range ? mu.sel.range : { a: 0, b: end };
  const seconds = (secOf(rng.b) - secOf(rng.a)) + o.tail;
  const tracks = p.tracks.filter(x => x.kind !== 'bus' && x.clips.length);
  const go = async () => {
    const F = IO.fs(), jobs: Job[] = [];
    for (const fmt of o.fmts) { if (o.what !== 'stems') jobs.push({ name: IO.safeName(p.name) + (o.fmts.length > 1 ? ' (' + fmt + ')' : ''), only: null, fmt }); if (o.what !== 'master') for (const tr of tracks) jobs.push({ name: IO.safeName(p.name) + ' - ' + IO.safeName(tr.name) + (o.fmts.length > 1 ? ' (' + fmt + ')' : ''), only: [tr.id], fmt }); }
    if (!jobs.length) { toast(t('mu.x.nothing')); return; }
    let dir: string | null = null, single: string | null = null;
    if (F) { if (jobs.length === 1) { single = await F.saveDialog(jobs[0].name, t('mu.x.audioFile'), IO.extOf(jobs[0].fmt)); if (!single) return; } else { dir = await F.pickDir(t('mu.x.pickDir')); if (!dir) return; } }
    cancel.stop = false; const out: Report[] = [];
    for (let i = 0; i < jobs.length && !cancel.stop; i++) {
      const j = jobs[i]; setBusy({ i, n: jobs.length, x: 0, name: j.name });
      try {
        const b = await mu.render({ a: rng.a, b: rng.b, tail: o.tail, sr: o.sr, ch: o.ch, only: j.only, master: j.only ? false : o.master, onProgress: x => setBusy(s => s && { ...s, x }), cancel });
        if (!b || cancel.stop) break;
        const ch = IO.finish(IO.chOf(b).map(c => new Float32Array(c)), o.sr, { trim: o.trim && !j.only, padA: o.padA, padB: o.padB, fadeIn: o.fadeIn, fadeOut: o.fadeOut });
        const chk = IO.check(ch, o.sr, o.trim && !j.only ? ch[0].length / o.sr : seconds + o.padA + o.padB);
        const blob = await IO.encodeAudio(ch, o.sr, j.fmt, o.kbps), name = j.name + '.' + IO.extOf(j.fmt);
        let where = '';
        if (F) { const path = single || (dir!.replace(/[\\/]$/, '') + '\\' + name); await F.write(path, blob); where = path; } else { downloadBlob(blob, name); where = t('mu.x.downloaded'); }
        if (o.montage && !j.only) { try { if (await IO.sendToLibrary(blob, name)) toast(t('mu.x.sentMontage')); } catch { toast(t('mu.x.montageFail')); } }
        out.push({ name, dur: chk.dur, expected: chk.expected, durOk: chk.durOk, ch: chk.ch, clip: chk.clip, truePeak: chk.truePeak, lufs: chk.lufs, size: blob.size, where });
      } catch (e) { toast(String((e as Error).message || e).startsWith('mu.') ? t(String((e as Error).message)) : String(e)); mu.logEv('exportFail'); break; }
    }
    setBusy(null); setReports(out); if (cancel.stop) toast(t('mu.x.cancelled')); else if (out.length) { toast(t('mu.x.done', { n: String(out.length) })); mu.logEv('export'); }
  };
  const fmtList: IO.ExpFmt[] = ['wav16', 'wav24', 'wav32', 'flac16', 'flac24', 'm4a'];
  return <Modal title={t('mu.x.title')} wide onClose={() => { cancel.stop = true; close(); }}>
    {reports.length > 0 ? <div className="mu-report">
      <h4>{t('mu.x.report')}</h4>
      <table className="mu-tbl"><thead><tr><th>{t('mu.x.file')}</th><th>{t('mu.x.dur')}</th><th>{t('mu.x.chans')}</th><th>{t('mu.x.clips')}</th><th>{t('mu.x.tp')}</th><th>LUFS</th><th>{t('mu.x.size')}</th></tr></thead><tbody>
        {reports.map((r, i) => <tr key={i}><td title={r.where}>{r.name}</td><td className={r.durOk ? '' : 'bad'}>{r.dur.toFixed(2)} s{r.durOk ? '' : ' ≠ ' + r.expected.toFixed(2)}</td><td>{r.ch}</td><td className={r.clip ? 'bad' : ''}>{r.clip}</td><td className={r.truePeak > -1 ? 'warn' : ''}>{r.truePeak.toFixed(1)} dBTP</td><td>{r.lufs > -70 ? r.lufs.toFixed(1) : '—'}</td><td>{(r.size / 1048576).toFixed(1)} Mo</td></tr>)}</tbody></table>
      <p className="mu-hint">{t('mu.x.reportHint')}</p>
      <div className="mu-btns"><button onClick={() => setReports([])}>{t('mu.x.again')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
    </div> : <>
      <div className="mu-form">
        <label>{t('mu.x.range')}<select value={o.range} onChange={e => set({ range: e.target.value as typeof o.range })}><option value="song">{t('mu.x.song', { s: (secOf(end)).toFixed(1) })}</option><option value="loop" disabled={!(p.loop.b > p.loop.a)}>{t('mu.x.loop')}</option><option value="sel" disabled={!mu.sel.range}>{t('mu.x.sel')}</option></select></label>
        <label>{t('mu.x.what')}<select value={o.what} onChange={e => set({ what: e.target.value as typeof o.what })}><option value="master">{t('mu.x.master')}</option><option value="stems">{t('mu.x.stems', { n: String(tracks.length) })}</option><option value="both">{t('mu.x.both')}</option></select></label>
        <div className="mu-fmts"><span>{t('mu.x.formats')}</span>{fmtList.map(f => <label key={f}><input type="checkbox" checked={o.fmts.includes(f)} onChange={e => set({ fmts: e.target.checked ? [...o.fmts, f] : o.fmts.filter(x => x !== f) })} />{t('mu.fmt.' + f)}</label>)}</div>
        <label>{t('mu.x.sr')}<select value={o.sr} onChange={e => set({ sr: +e.target.value })}>{[44100, 48000, 88200, 96000].map(s => <option key={s} value={s}>{s / 1000} kHz</option>)}</select></label>
        <label>{t('mu.x.chans')}<select value={o.ch} onChange={e => set({ ch: +e.target.value as 1 | 2 })}><option value={2}>{t('mu.ce.stereo')}</option><option value={1}>{t('mu.ce.mono')}</option></select></label>
        {o.fmts.includes('m4a') && <label>{t('mu.x.kbps')}<select value={o.kbps} onChange={e => set({ kbps: +e.target.value })}>{[96, 128, 160, 192].map(k => <option key={k} value={k}>{k} kbit/s</option>)}</select></label>}
        <label title={t('mu.x.tailTip')}>{t('mu.x.tail')}<input type="number" min={0} max={20} step={.5} value={o.tail} onChange={e => set({ tail: clamp(+e.target.value || 0, 0, 20) })} />s</label>
        <label><input type="checkbox" checked={o.trim} onChange={e => set({ trim: e.target.checked })} />{t('mu.x.trim')}</label>
        <label>{t('mu.x.padA')}<input type="number" min={0} max={10} step={.1} value={o.padA} onChange={e => set({ padA: clamp(+e.target.value || 0, 0, 10) })} />s</label>
        <label>{t('mu.x.padB')}<input type="number" min={0} max={10} step={.1} value={o.padB} onChange={e => set({ padB: clamp(+e.target.value || 0, 0, 10) })} />s</label>
        <label>{t('mu.x.fadeIn')}<input type="number" min={0} max={20} step={.1} value={o.fadeIn} onChange={e => set({ fadeIn: clamp(+e.target.value || 0, 0, 20) })} />s</label>
        <label>{t('mu.x.fadeOut')}<input type="number" min={0} max={30} step={.1} value={o.fadeOut} onChange={e => set({ fadeOut: clamp(+e.target.value || 0, 0, 30) })} />s</label>
        <label title={t('mu.x.masterTip')}><input type="checkbox" checked={o.master} onChange={e => set({ master: e.target.checked })} />{t('mu.x.withMaster')}</label>
        <label title={t('mu.x.montageTip')}><input type="checkbox" checked={o.montage} onChange={e => set({ montage: e.target.checked })} />{t('mu.x.montage')}</label>
      </div>
      <p className="mu-hint">{t('mu.x.precision')} {o.fmts.some(f => f === 'wav16' || f === 'flac16') ? t('mu.x.dither') : ''} {o.what !== 'master' ? t('mu.x.stemsHint') : ''}</p>
      <div className="mu-row"><button onClick={() => void mu.exportMidi()}><Ico n="midi" s={13} />{t('mu.x.midi')}</button><span className="mu-dim">{t('mu.x.midiHint')}</span></div>
      {busy ? <div className="mu-prog"><span>{t('mu.x.busy', { i: String(busy.i + 1), n: String(busy.n), name: busy.name })}</span><progress value={busy.x} max={1} /><button onClick={() => { cancel.stop = true; }}>{t('common.cancel')}</button></div>
        : <div className="mu-btns"><span className="mu-dim">{t('mu.x.length', { s: seconds.toFixed(1) })}</span><button onClick={close}>{t('common.cancel')}</button><button className="pri" disabled={!o.fmts.length} onClick={() => void go()}><Ico n="export" s={13} />{t('mu.x.go')}</button></div>}
    </>}
  </Modal>;
}
const secOf = (b: number) => b2s(mu.p, b);

/* ---------- son : sortie, fréquence, tampon, latence, écoute de contrôle ---------- */
function AudioDlg() {
  useMu(); const [devs, setDevs] = useState<{ out: MediaDeviceInfo[]; inp: MediaDeviceInfo[] }>({ out: [], inp: [] }), [meas, setMeas] = useState<string>(''), [dev, setDev] = useState('default');
  const S = mu.set, c = mu.ctx, st = mu.eng?.stats();
  const load = async () => { try { const l = await navigator.mediaDevices.enumerateDevices(); setDevs({ out: l.filter(d => d.kind === 'audiooutput'), inp: l.filter(d => d.kind === 'audioinput') }); } catch { /* rien */ } };
  useEffect(() => { void load(); const f = () => void load(); navigator.mediaDevices?.addEventListener?.('devicechange', f); const iv = setInterval(() => mu.emit(), 1000); return () => { navigator.mediaDevices?.removeEventListener?.('devicechange', f); clearInterval(iv); }; }, []);
  const apply = async (k: Partial<typeof S>) => { Object.assign(S, k); mu.saveSettings(); await mu.rebuild(); toast(t('mu.dev.applied')); };
  const playout = (c as AudioContext & { playoutStats?: { fallbackFramesEvents?: number; fallbackFramesDuration?: number } } | null)?.playoutStats;
  return <Modal title={t('mu.dev.title')} wide>
    <div className="mu-form">
      <label>{t('mu.dev.out')}<select value={S.out} onChange={e => void apply({ out: e.target.value })}><option value="">{t('mu.dev.default')}</option>{devs.out.filter(d => d.deviceId && d.deviceId !== 'default').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || t('mu.dev.unnamed')}</option>)}</select></label>
      <label title={t('mu.dev.srTip')}>{t('mu.dev.sr')}<select value={mu.p.sr} onChange={e => { const v = +e.target.value; mu.act('mu.h.sr', p => { p.sr = v; }); void mu.rebuild(); }}>{[44100, 48000, 96000].map(s => <option key={s} value={s}>{s / 1000} kHz</option>)}</select>{c && Math.abs(c.sampleRate - mu.p.sr) > 1 && <small className="warn">{t('mu.dev.srMismatch', { sr: String(c.sampleRate) })}</small>}</label>
      <label title={t('mu.dev.bufTip')}>{t('mu.dev.buf')}<select value={S.lat} onChange={e => void apply({ lat: e.target.value as typeof S.lat })}>{['interactive', 'balanced', 'playback', 'custom'].map(x => <option key={x} value={x}>{t('mu.lat.' + x)}</option>)}</select>
        {S.lat === 'custom' && <><input type="number" min={3} max={500} value={Math.round(S.latSec * 1000)} onChange={e => { S.latSec = clamp(+e.target.value || 20, 3, 500) / 1000; mu.saveSettings(); }} />ms<button onClick={() => void apply({})}>{t('mu.dev.apply')}</button></>}</label>
    </div>
    <div className="mu-stats">
      <span>{t('mu.dev.state', { s: t('mu.cs.' + (c?.state || 'closed')) })}</span>
      <span>{t('mu.dev.rate', { sr: String(c?.sampleRate || '—') })}</span>
      <span title={t('mu.dev.baseTip')}>{t('mu.dev.base', { ms: ((c?.baseLatency || 0) * 1000).toFixed(1) })}</span>
      <span title={t('mu.dev.outLatTip')}>{t('mu.dev.outLat', { ms: ((c?.outputLatency || 0) * 1000).toFixed(1) })}</span>
      {st && <span>{t('mu.dev.voices', { n: String(st.voices), s: String(st.sources), fx: String(st.fx) })}</span>}
      {st && <span className={st.late ? 'warn' : ''} title={t('mu.dev.lateTip')}>{t('mu.dev.late', { n: String(st.late) })}</span>}
      {playout && <span className={playout.fallbackFramesEvents ? 'warn' : ''} title={t('mu.dev.underTip')}>{t('mu.dev.under', { n: String(playout.fallbackFramesEvents || 0) })}</span>}
    </div>
    <h4>{t('mu.dev.inputs')}</h4>
    <p className="mu-hint">{t('mu.dev.inputsHint')}</p>
    <ul className="mu-list">{devs.inp.length ? devs.inp.map(d => <li key={d.deviceId}><Ico n="mic" s={12} />{d.label || t('mu.dev.unnamed')}</li>) : <li className="mu-dim">{t('mu.dev.noInputs')}</li>}</ul>
    <button onClick={async () => { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(x => x.stop()); await load(); } catch { toast(t('mu.dev.micDenied')); } }}><Ico n="mic" s={13} />{t('mu.dev.allowMic')}</button>
    <h4>{t('mu.dev.latency')}</h4>
    <p className="mu-hint">{t('mu.dev.latencyHint')}</p>
    <div className="mu-row"><select value={dev} onChange={e => setDev(e.target.value)}><option value="default">{t('mu.dev.default')}</option>{devs.inp.filter(d => d.deviceId && d.deviceId !== 'default').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || t('mu.dev.unnamed')}</option>)}</select>
      <button onClick={async () => { setMeas(t('mu.dev.measuring')); try { const rt = await mu.measureLatency(dev); if (rt == null) { setMeas(t('mu.dev.notHeard')); return; } const comp = Math.max(0, rt - (mu.ctx?.outputLatency || 0) - (mu.ctx?.baseLatency || 0)); S.latCompMs = Math.round(comp * 1000 * 10) / 10; mu.saveSettings(); if (mu.eng) mu.eng.latComp = comp; setMeas(t('mu.dev.measured', { rt: (rt * 1000).toFixed(1), comp: S.latCompMs.toFixed(1) })); } catch (e) { setMeas(String(e)); } }}><Ico n="target" s={13} />{t('mu.dev.measure')}</button>
      <span className="mu-dim">{meas}</span></div>
    <label className="mu-row">{t('mu.dev.comp')}<input type="number" min={0} max={500} step={.1} value={S.latCompMs} onChange={e => { S.latCompMs = clamp(+e.target.value || 0, 0, 500); mu.saveSettings(); if (mu.eng) mu.eng.latComp = S.latCompMs / 1000; mu.emit(); }} />ms</label>
    <h4>{t('mu.dev.monTitle')}</h4>
    <p className="mu-hint">{t('mu.dev.monText')}</p>
    <h4>{t('mu.dev.safeTitle')}</h4>
    <p className="mu-hint">{t('mu.dev.safeText')}</p>
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- MIDI ---------- */
function MidiDlg() {
  useMu(); const M = mu.midi, tr = mu.track;
  return <Modal title={t('mu.midi.title')} wide>
    {!M.access ? <><p className="mu-hint">{t('mu.midi.intro')}</p><button className="pri" onClick={() => void mu.startMidi()}><Ico n="midi" s={13} />{t('mu.midi.enable')}</button>{M.error && <p className="warn">{t('mu.midi.fail')}</p>}</> : <>
      <div className="mu-cols">
        <div><h4>{t('mu.midi.ins')}</h4><ul className="mu-list">{M.inputs().length ? M.inputs().map(d => <li key={d.id}><Ico n="midi" s={12} />{d.name}<small>{d.maker}</small><small className={d.state === 'connected' ? '' : 'warn'}>{t('mu.midi.st_' + d.state)}</small></li>) : <li className="mu-dim">{t('mu.midi.noIns')}</li>}</ul></div>
        <div><h4>{t('mu.midi.outs')}</h4><ul className="mu-list">{M.outputs().length ? M.outputs().map(d => <li key={d.id}><Ico n="midi" s={12} />{d.name}<small>{d.maker}</small></li>) : <li className="mu-dim">{t('mu.midi.noOuts')}</li>}</ul></div>
      </div>
      {tr && (tr.kind === 'inst' || tr.kind === 'drum') && <label className="mu-row">{t('mu.midi.trackOut', { name: tr.name })}<select value={tr.midiOut || ''} onChange={e => mu.act('mu.h.midiOut', () => { tr.midiOut = e.target.value || undefined; })}><option value="">{t('mu.midi.internal')}</option>{M.outputs().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      <p className="mu-hint">{t('mu.midi.playHint')}</p>
    </>}
    <h4>{t('mu.midi.maps')}</h4>
    {mu.maps.length ? <table className="mu-tbl"><tbody>{mu.maps.map(m => <tr key={m.key}><td>{t('mu.midi.cc', { cc: m.key.split(':')[1], ch: String(+m.key.split(':')[0] + 1) })}</td><td>{m.target}</td><td><button className="mu-ib" onClick={() => { mu.maps = mu.maps.filter(x => x !== m); import('./midi').then(X => X.saveMaps(mu.maps)); mu.emit(); }}><Ico n="trash" s={12} /></button></td></tr>)}</tbody></table> : <p className="mu-dim">{t('mu.midi.noMaps')}</p>}
    <p className="mu-hint">{t('mu.midi.learnHint')}</p>
    <div className="mu-btns"><button onClick={() => mu.panic()}><Ico n="warn" s={13} />{t('mu.midi.panic')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- récupération après plantage ---------- */
function RecoverDlg() {
  useMu(); const R = mu.recover, when = (ms: number) => new Date(ms).toLocaleString();
  return <Modal title={t('mu.rec.title')} wide>
    <p className="mu-hint">{t('mu.rec.intro')}</p>
    {R.autos.length > 0 && <><h4>{t('mu.rec.autos')}</h4><ul className="mu-list">{R.autos.map(a => <li key={a.id}><Ico n="file" s={12} /><b>{a.name}</b><small>{when(a.time)}</small><span className="mu-sp" /><button className="pri" onClick={() => void mu.restoreAuto(a.id).then(() => { void mu.dropAuto(a.id); close(); })}>{t('mu.rec.reopen')}</button><button onClick={() => void mu.dropAuto(a.id)}>{t('mu.rec.drop')}</button></li>)}</ul></>}
    {R.orphans.length > 0 && <><h4>{t('mu.rec.takes')}</h4><ul className="mu-list">{R.orphans.map(o => { let m: { track?: string; name?: string; at?: number } = {}; try { m = JSON.parse(o.meta); } catch { /* rien */ } return <li key={o.id}><Ico n="mic" s={12} /><b>{m.track || '?'}</b><small>{m.name || ''} · {m.at ? when(m.at) : ''} · {(o.size / 1048576).toFixed(1)} Mo</small><span className="mu-sp" /><button className="pri" onClick={() => void mu.restoreOrphan(o)}>{t('mu.rec.addTake')}</button><button onClick={() => void mu.dropOrphan(o.id)}>{t('mu.rec.drop')}</button></li>; })}</ul></>}
    {!R.autos.length && !R.orphans.length && <p>{t('mu.rec.nothing')}</p>}
    <div className="mu-btns">{R.autos.length + R.orphans.length > 1 && <button onClick={async () => { if (!(await ask(t('mu.rec.dropAllQ', { n: String(R.autos.length + R.orphans.length) })))) return; for (const a of [...R.autos]) await mu.dropAuto(a.id); for (const o of [...R.orphans]) await mu.dropOrphan(o.id); close(); }}><Ico n="trash" s={13} />{t('mu.rec.dropAll')}</button>}<span className="mu-sp" /><button className="pri" onClick={close}>{t('mu.rec.later')}</button></div>
  </Modal>;
}
function MissingDlg() {
  useMu();
  return <Modal title={t('mu.miss.title')} wide>
    <p className="mu-hint">{t('mu.miss.intro')}</p>
    <ul className="mu-list">{mu.missing.map(a => <li key={a.id}><Ico n="warn" s={12} /><b>{a.name}</b><small title={a.path || ''}>{a.path || a.rel || ''}</small><span className="mu-sp" />{IO.fs() && <button onClick={() => void mu.relink(a)}>{t('mu.f.relink')}</button>}</li>)}</ul>
    {!mu.missing.length && <p>{t('mu.miss.allOk')}</p>}
    <div className="mu-btns"><button className="pri" onClick={close}>{t('mu.miss.continue')}</button></div>
  </Modal>;
}

/* ---------- aide : premiers pas ---------- */
function HelpDlg() {
  const [g, setG] = useState<'beat' | 'voice' | 'export' | 'keys'>('beat');
  return <Modal title={t('mu.help.title')} wide>
    <div className="mu-seg">{(['beat', 'voice', 'export', 'keys'] as const).map(k => <button key={k} className={g === k ? 'on' : ''} onClick={() => setG(k)}>{t('mu.help.' + k)}</button>)}</div>
    <ol className="mu-steps-help">{Array.from({ length: 7 }, (_, i) => t('mu.help.' + g + (i + 1))).filter(s => !s.startsWith('mu.help.')).map((s, i) => <li key={i}>{s}</li>)}</ol>
    <p className="mu-hint">{t('mu.help.more')}</p>
    <div className="mu-btns"><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- raccourcis ---------- */
export function keyName(e: KeyboardEvent | React.KeyboardEvent): string { const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); return (e.ctrlKey || e.metaKey ? 'ctrl+' : '') + (e.shiftKey && k.length > 1 ? 'shift+' : e.shiftKey && /[a-z]/.test(k) ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + k; }
function KeysDlg() {
  useMu(); const [wait, setWait] = useState(''), K = mu.set.keys;
  useEffect(() => { if (!wait) return; const f = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') { setWait(''); return; } if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return; const n = keyName(e); for (const k of Object.keys(K)) if (K[k] === n && k !== wait) K[k] = ''; K[wait] = n; mu.saveSettings(); setWait(''); mu.emit(); }; window.addEventListener('keydown', f, true); return () => window.removeEventListener('keydown', f, true); }, [wait]);
  return <Modal title={t('mu.keys.title')} wide>
    <p className="mu-hint">{t('mu.keys.hint')}</p>
    <div className="mu-keylist">{Object.keys(DEF_KEYS).map(k => <div key={k} className="mu-row"><span>{t('mu.cmd.' + k)}</span><span className="mu-sp" /><button className={wait === k ? 'on' : ''} onClick={() => setWait(k)}>{wait === k ? t('mu.keys.press') : (K[k] || '—')}</button></div>)}</div>
    <div className="mu-btns"><button onClick={() => { mu.set.keys = { ...DEF_KEYS }; mu.saveSettings(); mu.emit(); }}>{t('mu.keys.reset')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

/* ---------- préférences ---------- */
function PrefsDlg() {
  useMu(); const S = mu.set, save = (k: Partial<typeof S>) => { Object.assign(S, k); mu.saveSettings(); mu.emit(); };
  const logTxt = mu.log.map(l => new Date(l.at).toISOString().slice(11, 19) + ' ' + l.k + ' ×' + l.n).join('\n');
  return <Modal title={t('mu.pref.title')} wide>
    <div className="mu-form">
      <label>{t('mu.pref.autosave')}<select value={S.autosaveSec} onChange={e => save({ autosaveSec: +e.target.value })}>{[10, 30, 60, 120, 300].map(s => <option key={s} value={s}>{s < 60 ? s + ' s' : s / 60 + ' min'}</option>)}</select></label>
      <label><input type="checkbox" checked={S.follow} onChange={e => save({ follow: e.target.checked })} />{t('mu.pref.follow')}</label>
      <label title={t('mu.pref.lowTip')}><input type="checkbox" checked={S.lowPC} onChange={e => { save({ lowPC: e.target.checked }); void mu.rebuild(); }} />{t('mu.pref.low')}</label>
      <label title={t('mu.pref.safeTip')}><input type="checkbox" checked={S.safeExt} onChange={e => { save({ safeExt: e.target.checked }); void mu.rebuild(); }} />{t('mu.pref.safe')}</label>
    </div>
    <p className="mu-hint">{t('mu.pref.lowHint')}</p>
    <h4>{t('mu.pref.log')}</h4>
    <p className="mu-hint">{t('mu.pref.logHint')}</p>
    <pre className="mu-log">{logTxt || t('mu.pref.logEmpty')}</pre>
    <div className="mu-btns"><button onClick={() => { void navigator.clipboard?.writeText(logTxt); toast(t('mu.pref.copied')); }}>{t('mu.pref.copy')}</button><button onClick={() => { mu.dialog = 'keys'; mu.emit(); }}><Ico n="keys" s={13} />{t('mu.keys.title')}</button><button className="pri" onClick={close}>{t('common.ok')}</button></div>
  </Modal>;
}

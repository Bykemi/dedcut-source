// DedCut Musique — vue session (lancer des clips et des scènes en boucle, calés sur la mesure ; distincte du module Live)
// et partition simple (portée dessinée, export MusicXML).
import { t } from '../i18n';
import { mu, useMu, toast, downloadBlob } from './state';
import type { Clip, Note, Track } from './model';
import { deepClone, midiOf, newMidi, nid, trackOf } from './model';
import { musicXml, scoreSvg } from './score';
import * as IO from './io';
import { Ico } from './icons';
import { clipColor } from './arrange';

export function Session() {
  useMu(); const p = mu.p, tracks = p.tracks.filter(x => x.kind !== 'bus'), scenes = p.scenes;
  const addScene = () => mu.act('mu.h.scene', q => { q.scenes.push({ id: nid(q), name: t('mu.ss.sceneN', { n: String(q.scenes.length + 1) }) }); });
  const fill = (tr: Track, i: number) => {
    const sel = mu.clip;
    mu.act('mu.h.slot', q => {
      const T = trackOf(q, tr.id)!; T.pool ||= []; let c: Clip | null = null;
      if (sel && sel.t.id === tr.id) { c = deepClone(sel.c); c.id = nid(q); c.t = 0; if (c.kind === 'midi') { const md = midiOf(q, sel.c.kind === 'midi' ? sel.c.data : -1); if (md) { const m = newMidi(q, md.notes.map(n => ({ ...n, id: nid(q) }))); m.cc = deepClone(md.cc); c.data = m.id; } } }
      else if (T.kind === 'inst') { const md = newMidi(q, []); c = { kind: 'midi', id: nid(q), name: T.name + ' ' + (i + 1), t: 0, len: 4, data: md.id, color: '', loop: false }; }
      else if (T.kind === 'drum' && T.inst?.patterns[0]) { const pt = T.inst.patterns[0]; c = { kind: 'pattern', id: nid(q), name: pt.name, t: 0, len: pt.steps / pt.div, pat: pt.id, color: '' }; }
      if (!c) return; T.pool.push(c); while (T.slots.length <= i) T.slots.push(null); T.slots[i] = c.id;
    });
    if (!sel || sel.t.id !== tr.id) { if (tr.kind === 'audio') toast(t('mu.ss.pickAudio')); }
  };
  return <div className="mu-session">
    <div className="mu-prbar"><Ico n="session" s={15} /><b>{t('mu.tab.session')}</b><span className="mu-dim">{t('mu.ss.hint')}</span><span className="mu-sp" />
      <button onClick={addScene}><Ico n="plus" s={13} />{t('mu.ss.addScene')}</button>
      <button disabled={!mu.slots.size} onClick={() => mu.stopSession()} title={t('mu.ss.backTip')}><Ico n="stop" s={13} />{t('mu.ss.back')}</button></div>
    {!scenes.length ? <div className="mu-empty"><p>{t('mu.ss.none')}</p><button className="pri" onClick={addScene}><Ico n="plus" s={13} />{t('mu.ss.addScene')}</button></div> :
      <div className="mu-ssgrid" style={{ gridTemplateColumns: `150px repeat(${tracks.length}, minmax(110px, 1fr))` }}>
        <div className="mu-ssh" />
        {tracks.map(tr => <div key={tr.id} className="mu-ssh" style={{ ['--tc' as string]: tr.color }}><i />{tr.name}<button className="mu-ib" title={t('mu.ss.stopTrack')} onClick={() => mu.launch(tr.id, null)}><Ico n="stop" s={11} /></button></div>)}
        {scenes.map((sc, i) => <div key={sc.id} className="mu-ssrow" style={{ display: 'contents' }}>
          <div className="mu-sscene"><button className="mu-ib" title={t('mu.ss.launchScene')} onClick={() => mu.launchScene(i)}><Ico n="play" s={12} /></button>
            <input value={sc.name} aria-label={t('mu.ss.sceneName')} onChange={e => { sc.name = e.target.value.slice(0, 24); mu.emit(); }} onBlur={() => mu.act('mu.h.scene', () => { /* appliqué */ })} />
            <button className="mu-ib" title={t('mu.ss.delScene')} onClick={() => mu.act('mu.h.scene', q => { q.scenes.splice(i, 1); for (const x of q.tracks) x.slots.splice(i, 1); })}><Ico n="trash" s={11} /></button></div>
          {tracks.map(tr => { const id = tr.slots[i], c = id != null ? (tr.pool || []).find(x => x.id === id) : null, playing = mu.slots.get(tr.id) === i;
            return c ? <div key={tr.id} className={'mu-slot full' + (playing ? ' play' : '')} style={{ ['--tc' as string]: clipColor(tr, c) }}>
              <button className="mu-ib" onClick={() => mu.launch(tr.id, i)} title={t('mu.ss.launch')}><Ico n={playing ? 'loop' : 'play'} s={12} /></button>
              <span onClick={() => { mu.sel.clip = c.id; mu.sel.track = tr.id; mu.view.tab = c.kind === 'pattern' ? 'steps' : c.kind === 'audio' ? 'clip' : 'piano'; mu.emit(); }} title={t('mu.ss.edit')}>{c.name}</span>
              <button className="mu-ib" title={t('mu.ss.clear')} onClick={() => mu.act('mu.h.slot', q => { const T = trackOf(q, tr.id)!; T.slots[i] = null; T.pool = (T.pool || []).filter(x => x.id !== c.id); })}><Ico n="close" s={10} /></button>
            </div> : <button key={tr.id} className="mu-slot" onClick={() => fill(tr, i)} title={t('mu.ss.fill')}><Ico n="plus" s={12} /></button>; })}
        </div>)}
      </div>}
    <small className="mu-hint">{t('mu.ss.note')}</small>
  </div>;
}

/* ---------- partition ---------- */
export function ScoreView() {
  useMu(); const f = mu.clip, p = mu.p;
  if (!f || f.c.kind !== 'midi') return <div className="mu-empty"><Ico n="score" s={28} /><p>{t('mu.sc2.none')}</p></div>;
  const mc = f.c, md = midiOf(p, mc.data); if (!md) return null;
  const notes: Note[] = md.notes.filter(n => !n.mute).map(n => ({ ...n, t: n.t - (mc.off || 0) })).filter(n => n.t >= 0 && n.t < mc.len);
  const bars = Math.max(1, Math.ceil(mc.len / (p.num * 4 / p.den)));
  const svg = scoreSvg(p, notes, Math.min(bars, 32), 1100);
  const exportXml = async (all: boolean) => {
    const parts = all ? p.tracks.filter(x => x.kind === 'inst').map(x => ({ name: x.name, notes: x.clips.flatMap(c => { if (c.kind !== 'midi') return []; const m = midiOf(p, c.data); return (m?.notes || []).filter(n => !n.mute).map(n => ({ ...n, t: c.t + n.t - (c.off || 0) })).filter(n => n.t >= c.t && n.t < c.t + c.len); }) })).filter(x => x.notes.length) : [{ name: f.t.name, notes }];
    if (!parts.length) { toast(t('mu.f.noMidi')); return; }
    const end = Math.max(...parts.flatMap(x => x.notes.map(n => n.t + n.d))), nb = Math.max(1, Math.ceil(end / (p.num * 4 / p.den)));
    const xml = musicXml(p, parts, nb), blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' }), F = IO.fs();
    if (F) { const path = await F.saveDialog(IO.safeName(p.name), 'MusicXML', 'musicxml'); if (path) { await F.write(path, blob); toast(t('mu.sc2.exported')); } } else downloadBlob(blob, IO.safeName(p.name) + '.musicxml');
  };
  return <div className="mu-score">
    <div className="mu-prbar"><Ico n="score" s={15} /><b>{f.t.name} · {f.c.name}</b><span className="mu-dim">{t('mu.sc2.hint')}</span><span className="mu-sp" />
      <button onClick={() => void exportXml(false)}><Ico n="export" s={13} />{t('mu.sc2.exportClip')}</button><button onClick={() => void exportXml(true)}><Ico n="export" s={13} />{t('mu.sc2.exportAll')}</button></div>
    <div className="mu-scoresvg" dangerouslySetInnerHTML={{ __html: svg }} />
  </div>;
}

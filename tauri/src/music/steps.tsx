// DedCut Musique — séquenceur pas à pas (boîte à rythmes) : motifs, pas, vélocité, probabilité, flam, répétitions,
// longueur par ligne (polyrythmie), swing, groove, variations à graine reproductible, sons des pads et sorties séparées.
import { useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, askText } from './state';
import type { Pattern, StepCell, Track } from './model';
import { clamp, deepClone, nid, trackOf } from './model';
import { GROOVES, extractGroove, genDrumPattern, patternClip } from './ops';
import { KIT_IDS, PAD_KINDS, kitPads } from './kits';
import { Ico } from './icons';

type Mode = 'on' | 'vel' | 'prob' | 'flam' | 'rat' | 'len';
const STYLES = ['basic', 'rock', 'house', 'trap', 'boombap'];
const cell0 = (): StepCell => ({ on: false, v: 100, prob: 1, flam: false, rat: 1 });

export function Steps() {
  useMu(); const tr = mu.track, f = mu.clip;
  if (!tr || tr.kind !== 'drum' || !tr.inst) return <div className="mu-empty"><Ico n="steps" s={28} /><p>{t('mu.st.none')}</p><button className="pri" onClick={() => mu.addTrack('drum', 'kit-studio')}><Ico n="plus" s={13} />{t('mu.trk.addDrum')}</button></div>;
  const pats = tr.inst.patterns, selPat = f && f.c.kind === 'pattern' && f.t.id === tr.id ? f.c.pat : (mu.dialogArg as { pat?: number } | null)?.pat;
  const pat = pats.find(x => x.id === selPat) || pats[0];
  if (!pat) return <div className="mu-empty"><Ico n="steps" s={28} /><p>{t('mu.st.noPattern')}</p><button className="pri" onClick={() => newPat(tr)}><Ico n="plus" s={13} />{t('mu.st.new')}</button></div>;
  return <Grid tr={tr} pat={pat} />;
}
function newPat(tr: Track, from?: Pattern) {
  let id = 0;
  mu.act('mu.h.pattern', p => { const T = trackOf(p, tr.id)!; const x: Pattern = from ? { ...deepClone(from), id: nid(p), name: from.name + ' 2' } : { id: nid(p), name: t('mu.steps.pattern') + ' ' + (T.inst!.patterns.length + 1), steps: 16, div: 4, swing: 0, seed: 1 + Math.floor(Math.random() * 9999), rows: T.inst!.pads.map((_, i) => ({ pad: i, len: 16, cells: Array.from({ length: 16 }, cell0) })) }; T.inst!.patterns.push(x); id = x.id; });
  mu.dialogArg = { pat: id }; mu.sel.clip = 0; mu.emit();
}

function Grid({ tr, pat }: { tr: Track; pat: Pattern }) {
  const [mode, setMode] = useState<Mode>('on'), [pad, setPad] = useState(0), [style, setStyle] = useState('basic');
  const inst = tr.inst!, p = mu.p, playing = mu.previewing?.pat === pat.id;
  const op = (label: string, fn: () => void) => { if (tr.lock) { toast(t('mu.trk.locked')); return; } mu.act(label, fn); };
  const cellDown = (ri: number, ci: number, e: React.PointerEvent) => {
    e.preventDefault(); if (tr.lock) { toast(t('mu.trk.locked')); return; }
    const row = pat.rows[ri], c = row.cells[ci]; if (!c) return;
    if (mode === 'on') {
      const val = !c.on; c.on = val; if (val) { void mu.init().then(() => { const pl = mu.eng?.strips.get(tr.id)?.player; pl?.hit(row.pad, c.v, mu.ctx!.currentTime); }); }
      // glisser pour peindre plusieurs pas
      const over = (ev: PointerEvent) => { const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null, r = el?.dataset.r, k = el?.dataset.c; if (r == null || k == null) return; const cc = pat.rows[+r]?.cells[+k]; if (cc && cc.on !== val) { cc.on = val; mu.emit(); } };
      const upf = () => { removeEventListener('pointermove', over); removeEventListener('pointerup', upf); op('mu.h.steps', () => { /* appliqué */ }); };
      addEventListener('pointermove', over); addEventListener('pointerup', upf); mu.emit(); return;
    }
    if (mode === 'flam') { op('mu.h.steps', () => { c.flam = !c.flam; c.on = true; }); return; }
    if (mode === 'rat') { op('mu.h.steps', () => { c.rat = c.rat >= 4 ? 1 : (c.rat || 1) + 1; c.on = true; }); return; }
    if (mode === 'len') { op('mu.h.steps', () => { c.len = (c.len || 1) >= 4 ? 1 : (c.len || 1) + 1; c.on = true; }); return; }
    // vélocité ou probabilité : glisser vers le haut / le bas dans la case
    const el = e.currentTarget as HTMLElement, rc = el.getBoundingClientRect();
    const set = (cy: number) => { const v = clamp(1 - (cy - rc.top) / rc.height, 0, 1); if (mode === 'vel') { c.v = Math.max(1, Math.round(v * 127)); } else c.prob = Math.round(v * 20) / 20; c.on = true; mu.emit(); };
    set(e.clientY); const mv = (ev: PointerEvent) => set(ev.clientY), u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); op('mu.h.steps', () => { /* appliqué */ }); };
    addEventListener('pointermove', mv); addEventListener('pointerup', u);
  };
  const setSteps = (n: number) => op('mu.h.steps', () => { const old = pat.steps; pat.steps = n; for (const r of pat.rows) { while (r.cells.length < n) r.cells.push(cell0()); r.len = !r.len || r.len >= old ? n : Math.min(r.len, n); } });
  const ensureRows = () => { for (let i = 0; i < inst.pads.length; i++) if (!pat.rows.some(r => r.pad === i)) pat.rows.push({ pad: i, len: pat.steps, cells: Array.from({ length: pat.steps }, cell0) }); };
  ensureRows();
  const pd = inst.pads[pad], buses = p.tracks.filter(x => x.kind === 'bus');
  const extract = () => {
    const f = mu.p.tracks.flatMap(x => x.clips.filter(c => mu.sel.clips.has(c.id) && c.kind === 'audio')).at(0); if (!f || f.kind !== 'audio') { toast(t('mu.st.pickAudio')); return; }
    const b = mu.store.get(f.asset); if (!b) return; const ch = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i).subarray(Math.floor(f.off * b.sampleRate), Math.floor((f.off + f.dur) * b.sampleRate)));
    const g = extractGroove(ch, b.sampleRate, f.srcBpm || p.bpm, 16, f.name); op('mu.h.groove', () => { pat.groove = g; }); toast(t('mu.st.grooveDone'));
  };
  return <div className="mu-steps">
    <div className="mu-prbar">
      <select value={pat.id} title={t('mu.st.pattern')} onChange={e => { mu.dialogArg = { pat: +e.target.value }; mu.sel.clip = 0; mu.emit(); }}>{inst.patterns.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <button className="mu-ib" title={t('mu.st.new')} onClick={() => newPat(tr)}><Ico n="plus" s={14} /></button>
      <button className="mu-ib" title={t('mu.st.dup')} onClick={() => newPat(tr, pat)}><Ico n="dup" s={14} /></button>
      <button className="mu-ib" title={t('mu.st.rename')} onClick={async () => { const n = await askText(t('mu.st.rename'), pat.name); if (n) op('mu.h.pattern', () => { pat.name = n.slice(0, 30); }); }}><Ico n="pen" s={14} /></button>
      <button className="mu-ib" title={t('mu.st.del')} disabled={inst.patterns.length < 2 || tr.clips.some(c => c.kind === 'pattern' && c.pat === pat.id)} onClick={() => op('mu.h.pattern', () => { inst.patterns = inst.patterns.filter(x => x.id !== pat.id); })}><Ico n="trash" s={14} /></button>
      <span className="mu-sep" />
      <button className={'pri' + (playing ? ' on' : '')} title={t('mu.st.previewTip')} onClick={() => void mu.previewPattern(tr.id, pat.id)}><Ico n={playing ? 'stop' : 'play'} s={13} />{t(playing ? 'mu.st.stop' : 'mu.st.preview')}</button>
      <button title={t('mu.st.insertTip')} onClick={() => op('mu.h.newClip', () => { const at = Math.floor(mu.pos()); patternClip(p, tr, pat, at, pat.steps / pat.div); })}><Ico n="plus" s={13} />{t('mu.st.insert')}</button>
      <span className="mu-sep" />
      <label>{t('mu.st.steps')}<select value={pat.steps} onChange={e => setSteps(+e.target.value)}>{[8, 12, 16, 24, 32, 48, 64].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label title={t('mu.st.divTip')}>{t('mu.st.div')}<select value={pat.div} onChange={e => op('mu.h.steps', () => { pat.div = +e.target.value; })}>{[2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{t('mu.st.div' + n)}</option>)}</select></label>
      <label title={t('mu.st.swingTip')}>{t('mu.pr.swing')}<input type="range" min={0} max={75} value={Math.round(pat.swing * 100)} onChange={e => { pat.swing = +e.target.value / 100; mu.emit(); }} onPointerUp={() => op('mu.h.steps', () => { /* appliqué */ })} /><em>{Math.round(pat.swing * 100)} %</em></label>
      <label title={t('mu.st.grooveTip')}>{t('mu.st.groove')}<select value={pat.groove?.name || ''} onChange={e => op('mu.h.groove', () => { pat.groove = GROOVES.find(g => g.name === e.target.value) ? deepClone(GROOVES.find(g => g.name === e.target.value)!) : null; })}>
        <option value="">{t('mu.st.noGroove')}</option>{GROOVES.map(g => <option key={g.name} value={g.name}>{t('mu.gr.' + g.name)}</option>)}{pat.groove && !GROOVES.some(g => g.name === pat.groove!.name) && <option value={pat.groove.name}>{pat.groove.name}</option>}</select></label>
      <button className="mu-ib" title={t('mu.st.extractTip')} onClick={extract}><Ico n="wave" s={14} /></button>
      <span className="mu-sp" />
      <label title={t('mu.st.seedTip')}><Ico n="dice" s={13} /><input type="number" min={1} max={99999} value={pat.seed} onChange={e => op('mu.h.steps', () => { pat.seed = clamp(+e.target.value || 1, 1, 99999); })} /></label>
      <select value={style} onChange={e => setStyle(e.target.value)} title={t('mu.st.style')}>{STYLES.map(s => <option key={s} value={s}>{t('mu.sty.' + s)}</option>)}</select>
      <button title={t('mu.st.genTip')} onClick={() => op('mu.h.pattern', () => { const g = genDrumPattern(p, style, pat.seed, inst.pads.length); pat.rows = g.rows.map(r => ({ ...r, len: pat.steps, cells: Array.from({ length: pat.steps }, (_, i) => r.cells[i % 16] ? { ...r.cells[i % 16] } : cell0()) })); pat.swing = g.swing; })}><Ico n="spark" s={13} />{t('mu.st.gen')}</button>
    </div>
    <div className="mu-prbar mu-stmodes" role="radiogroup" aria-label={t('mu.st.mode')}>
      {(['on', 'vel', 'prob', 'flam', 'rat', 'len'] as Mode[]).map(m => <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)} title={t('mu.st.m_' + m + 'Tip')}>{t('mu.st.m_' + m)}</button>)}
      <span className="mu-sp" />
      <label>{t('mu.st.kit')}<select value="" onChange={e => { const k = e.target.value; if (k) op('mu.h.kit', () => { const np = kitPads(k); inst.pads = np.map((x, i) => ({ ...x, out: inst.pads[i]?.out || 0, choke: x.choke })); inst.preset = 'kit-' + k; }); }}><option value="">{t('mu.st.kitPick')}</option>{KIT_IDS.map(k => <option key={k} value={k}>{t('mu.kit.' + k)}</option>)}</select></label>
    </div>
    <div className="mu-stgrid" style={{ ['--n' as string]: pat.steps }}>
      {pat.rows.map((row, ri) => { const pdx = inst.pads[row.pad]; if (!pdx) return null; const L = Math.max(1, Math.min(pat.steps, row.len || pat.steps));
        return <div key={ri} className={'mu-strow' + (pad === row.pad ? ' sel' : '')}>
          <button className="mu-stpad" onClick={() => { setPad(row.pad); void mu.init().then(() => mu.eng?.strips.get(tr.id)?.player?.hit(row.pad, 110, mu.ctx!.currentTime)); }} title={t('mu.st.padTip')}>{t('mu.pad.' + pdx.name)}</button>
          <input className="mu-stlen" type="number" min={1} max={pat.steps} value={L} title={t('mu.st.rowLenTip')} onChange={e => op('mu.h.steps', () => { row.len = clamp(+e.target.value || pat.steps, 1, pat.steps); while (row.cells.length < pat.steps) row.cells.push(cell0()); })} />
          <div className="mu-stcells">{Array.from({ length: pat.steps }, (_, ci) => { const c = row.cells[ci] || cell0(), out = ci >= L;
            return <span key={ci} data-r={ri} data-c={ci} role="checkbox" aria-checked={c.on} aria-label={t('mu.st.cellAria', { pad: pdx.name, n: String(ci + 1) })}
              className={'mu-cell' + (c.on ? ' on' : '') + (ci % pat.div === 0 ? ' beat' : '') + (out ? ' out' : '')}
              style={c.on ? { ['--v' as string]: (c.v / 127).toFixed(2), ['--pr' as string]: c.prob.toFixed(2) } : undefined} onPointerDown={e => cellDown(ri, ci, e)}>
              {c.on && (c.prob < 1 ? <i className="pr">{Math.round(c.prob * 100)}</i> : null)}{c.on && c.flam && <i className="fl">f</i>}{c.on && c.rat > 1 && <i className="rt">×{c.rat}</i>}{c.on && (c.len || 1) > 1 && <i className="ln">{c.len}</i>}
            </span>; })}</div>
        </div>; })}
    </div>
    {pd && <div className="mu-padset">
      <b>{t('mu.st.padSet')} · {t('mu.pad.' + pd.name)}</b>
      <label>{t('mu.st.sound')}<select value={pd.asset} onChange={e => op('mu.h.pad', () => { pd.asset = e.target.value; })}>
        {KIT_IDS.map(k => <optgroup key={k} label={t('mu.kit.' + k)}>{PAD_KINDS.map(pk => <option key={pk} value={`gen:kit/${k}/${pk}`}>{pk}</option>)}</optgroup>)}
        <optgroup label={t('mu.br.project')}>{Object.values(p.assets).filter(a => !a.id.startsWith('gen:') && a.len < 10).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup></select></label>
      <label>{t('mu.mix.vol')}<input type="range" min={-40} max={12} step={.5} value={pd.vol} onChange={e => { pd.vol = +e.target.value; mu.sync(); mu.emit(); }} onPointerUp={() => op('mu.h.pad', () => { /* appliqué */ })} /><em>{pd.vol.toFixed(1)} dB</em></label>
      <label>{t('mu.mix.pan')}<input type="range" min={-1} max={1} step={.05} value={pd.pan} onChange={e => { pd.pan = +e.target.value; mu.sync(); mu.emit(); }} onPointerUp={() => op('mu.h.pad', () => { /* appliqué */ })} /></label>
      <label>{t('mu.st.tune')}<input type="number" min={-24} max={24} step={.5} value={pd.tune} onChange={e => op('mu.h.pad', () => { pd.tune = clamp(+e.target.value || 0, -24, 24); })} /></label>
      <label>{t('mu.st.decay')}<input type="number" min={0} max={4} step={.05} value={pd.decay} onChange={e => op('mu.h.pad', () => { pd.decay = clamp(+e.target.value || 0, 0, 4); })} /></label>
      <label title={t('mu.st.chokeTip')}>{t('mu.st.choke')}<select value={pd.choke} onChange={e => op('mu.h.pad', () => { pd.choke = +e.target.value; })}>{[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n ? t('mu.st.chokeN', { n: String(n) }) : t('mu.st.noChoke')}</option>)}</select></label>
      <label title={t('mu.st.outTip')}>{t('mu.st.out')}<select value={pd.out} onChange={e => { const v = +e.target.value; if (v) { const b = trackOf(p, v); if (b && b.out === tr.id) { toast(t('mu.mix.cycle')); return; } } op('mu.h.route', () => { pd.out = v; }); }}><option value={0}>{t('mu.st.outTrack')}</option>{buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      {!buses.length && <small>{t('mu.st.outHint')}</small>}
    </div>}
  </div>;
}

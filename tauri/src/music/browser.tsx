// DedCut Musique — navigateur : sons d'origine DedCut (kits, boucles), instruments, chaînes d'effets, sons du projet
// (étiquettes, tempo, tonalité, origine et licence), médiathèque DedCut du Montage (lecture seule). Aperçu calé sur le tempo.
import { useMemo, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, assetLabel } from './state';
import type { Asset } from './model';
import { genCatalog } from './kits';
import { CHAINS, INST_PRESETS } from './presets';
import * as IO from './io';
import { Ico } from './icons';
import { startDrag } from './pdrag';

type Tab = 'sounds' | 'inst' | 'chains' | 'project' | 'library';
const SFAV = 'dedcut-mu-sfav';
const sfavs = (): string[] => { try { return JSON.parse(localStorage.getItem(SFAV) || '[]'); } catch { return []; } };
let pv: { src: AudioBufferSourceNode; id: string } | null = null;
/** aperçu : un son court tel quel, une boucle à la vitesse du tempo du projet (et calée sur le prochain temps si la lecture tourne) */
async function preview(a: Asset) {
  await mu.init(); const ctx = mu.ctx!; if (ctx.state !== 'running') await ctx.resume();
  if (pv) { try { pv.src.stop(); } catch { /* rien */ } const same = pv.id === a.id; pv = null; if (same) { mu.emit(); return; } }
  const b = mu.store.get(a.id); if (!b) { toast(t('mu.f.notLoaded')); return; }
  const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; g.gain.value = .7; src.connect(g); g.connect(ctx.destination);
  let when = ctx.currentTime + .02;
  if (a.bpm) { src.playbackRate.value = mu.p.bpm / a.bpm; src.loop = true; const e = mu.eng; if (e?.playing) { const now = e.now(), next = Math.ceil(now); when = Math.max(ctx.currentTime + .01, e.ctxAt(next)); } }
  src.start(when); if (!a.bpm) src.onended = () => { if (pv?.src === src) { pv = null; mu.emit(); } };
  pv = { src, id: a.id }; mu.emit();
}

export function Browser() {
  useMu(); const [tab, setTab] = useState<Tab>('sounds'), [q, setQ] = useState(''), [onlyFav, setOnlyFav] = useState(false), [tag, setTag] = useState('');
  const cat = useMemo(() => genCatalog(mu.store.sr), []), fav = sfavs(), s = q.trim().toLowerCase();
  const match = (a: Asset) => (!s || (a.name + ' ' + a.tags.join(' ') + ' ' + a.key).toLowerCase().includes(s)) && (!onlyFav || fav.includes(a.id)) && (!tag || a.tags.includes(tag));
  const toggleFav = (id: string) => { const f = sfavs(); try { localStorage.setItem(SFAV, JSON.stringify(f.includes(id) ? f.filter(x => x !== id) : [...f, id])); } catch { /* rien */ } mu.emit(); };
  const row = (a: Asset, extra?: React.ReactNode) => <div key={a.id} className={'mu-brow' + (a.missing ? ' bad' : '')} onPointerDown={e => { if (!a.missing) startDrag(e, { kind: 'asset', id: a.id }, prettyName(a)); }} title={t('mu.br.dragTip')}>
    <button className="mu-ib" onClick={() => void preview(a)} title={t('mu.br.preview')} aria-label={t('mu.br.preview') + ' ' + a.name}><Ico n={pv?.id === a.id ? 'stop' : 'play'} s={11} /></button>
    <span className="mu-bn">{prettyName(a)}</span>
    {a.bpm > 0 && <small title={t('mu.br.bpm')}>{Math.round(a.bpm)}</small>}{a.key && <small title={t('mu.br.key')}>{a.key}</small>}
    {extra}
    <button className="mu-ib" onClick={() => toggleFav(a.id)} title={t('mu.br.fav')}><Ico n="star" s={11} fill={fav.includes(a.id)} /></button>
    <button className="mu-ib" title={t('mu.br.add')} onClick={() => void import('./arrange').then(m => m.dropItem({ kind: 'asset', id: a.id }, Math.floor(mu.pos()), mu.track))}><Ico n="plus" s={11} /></button>
  </div>;
  const tagsOf = (L: Asset[]) => [...new Set(L.flatMap(a => a.tags))].sort().slice(0, 40);
  const projAssets = Object.values(mu.p.assets);
  const lib = libraryMedia();
  return <div className="mu-browser" aria-label={t('mu.br.title')}>
    <div className="mu-btabs" role="tablist">{(['sounds', 'inst', 'chains', 'project', 'library'] as Tab[]).map(k => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setTag(''); }} title={t('mu.br.' + k)}><Ico n={k === 'sounds' ? 'drum' : k === 'inst' ? 'piano' : k === 'chains' ? 'fx' : k === 'project' ? 'folder' : 'link'} s={14} /></button>)}</div>
    <b className="mu-btitle">{t('mu.br.' + tab)}</b>
    <div className="mu-bsearch"><Ico n="search" s={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('mu.br.search')} aria-label={t('mu.br.search')} /><button className={'mu-ib' + (onlyFav ? ' on' : '')} title={t('mu.br.onlyFav')} onClick={() => setOnlyFav(!onlyFav)}><Ico n="star" s={12} fill={onlyFav} /></button></div>
    {(tab === 'sounds' || tab === 'project') && <div className="mu-tags">{tagsOf(tab === 'sounds' ? cat : projAssets).map(x => <button key={x} className={tag === x ? 'on' : ''} onClick={() => setTag(tag === x ? '' : x)}>{t('mu.tag.' + x) !== 'mu.tag.' + x ? t('mu.tag.' + x) : x}</button>)}</div>}
    <div className="mu-blist">
      {tab === 'sounds' && <>
        <small className="mu-hint">{t('mu.br.soundsHint')}</small>
        <div className="mu-bgroup">{t('mu.br.loops')}</div>{cat.filter(a => a.tags.includes('loop') && match(a)).map(a => row(a))}
        <div className="mu-bgroup">{t('mu.br.oneshots')}</div>{cat.filter(a => !a.tags.includes('loop') && match(a)).map(a => row(a))}
      </>}
      {tab === 'inst' && INST_PRESETS.filter(x => !s || (t('mu.pre.' + x.id) + ' ' + x.tags.join(' ')).toLowerCase().includes(s)).map(x => <div key={x.id} className="mu-brow" onPointerDown={e => startDrag(e, { kind: 'inst', preset: x.id }, t('mu.pre.' + x.id))} title={t('mu.br.dragTip')}>
        <Ico n={x.cat === 'drums' ? 'drum' : 'piano'} s={12} /><span className="mu-bn">{t('mu.pre.' + x.id)}</span><small>{t('mu.pc.' + x.cat)}</small>
        <button className="mu-ib" title={t('mu.br.newTrack')} onClick={() => mu.addTrack(x.cat === 'drums' ? 'drum' : 'inst', x.id)}><Ico n="plus" s={11} /></button></div>)}
      {tab === 'chains' && CHAINS.filter(c => !s || t('mu.pre.' + c.id).toLowerCase().includes(s)).map(c => <div key={c.id} className="mu-brow" onPointerDown={e => startDrag(e, { kind: 'chain', id: c.id }, t('mu.pre.' + c.id))} title={t('mu.br.dragTip')}>
        <Ico n="fx" s={12} /><span className="mu-bn">{t('mu.pre.' + c.id)}</span><small>{t('mu.cc2.' + c.cat)}</small>
        <button className="mu-ib" title={t('mu.br.applyChain')} onClick={() => { mu.dialog = 'applyChain'; mu.dialogArg = { chain: c.id, track: mu.sel.track }; mu.emit(); }}><Ico n="plus" s={11} /></button></div>)}
      {tab === 'project' && <>
        <div className="mu-row"><button onClick={() => void mu.importAudio()}><Ico n="open" s={13} />{t('mu.f.importAudio')}</button></div>
        {projAssets.filter(match).map(a => row(a, <small className={IO.rightsOf(a).share ? '' : 'warn'} title={t('mu.br.rightsTip', { origin: t('mu.org.' + (a.origin || 'import')), licence: a.licence })}>{a.id.startsWith('gen:') ? 'DedCut' : t('mu.org.' + (a.origin || 'import'))}</small>))}
        {!projAssets.length && <p className="mu-hint">{t('mu.br.noProject')}</p>}
      </>}
      {tab === 'library' && <>
        <small className="mu-hint">{t('mu.br.libraryHint')}</small>
        {lib.filter(m => !s || m.name.toLowerCase().includes(s)).map(m => <div key={m.id} className="mu-brow"><Ico n="wave" s={12} /><span className="mu-bn">{m.name}</span>
          <button className="mu-ib" title={t('mu.br.add')} disabled={!m.path} onClick={() => { if (m.path) void mu.importAudio([{ path: m.path }]); else toast(t('mu.br.libNoPath')); }}><Ico n="plus" s={11} /></button></div>)}
        {!lib.length && <p className="mu-hint">{t('mu.br.libEmpty')}</p>}
      </>}
    </div>
  </div>;
}
/** sons de la médiathèque du Montage (lus, jamais modifiés) */
function libraryMedia(): { id: number; name: string; path?: string }[] {
  try { const m = new Function('return typeof media!=="undefined"?media:[]')() as { id: number; name: string; type: string; path?: string; missing?: boolean }[]; return (m || []).filter(x => x.type === 'audio' && !x.missing).map(x => ({ id: x.id, name: x.name, path: x.path })); } catch { return []; }
}
const prettyName = (a: Asset) => a.id.startsWith('gen:') ? assetLabel(a) : a.name;

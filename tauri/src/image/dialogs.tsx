// DedCut Image — fenêtres : nouveau document, exporter, taille de l'image / du canevas, raccourcis, préférences,
// reprise après un plantage, améliorer les contours, plage de couleurs, sélections enregistrées.
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { t, fmt } from '../i18n';
import { ed, ui, useEd, newDocument, exportDoc, recover, restoreAuto, dropAuto, toast } from './state';
import { Ico } from './icons';
import { DEF_KEYS, defPen } from './editor';
import { exportBlob, lostItems, ExpFormat, ExpOpts, FORMAT_INFO } from './io';
import type { Resample } from './pixels';
import { fmtKey } from './ImageApp';
import { selAct } from './commands';
import * as S from './select';
import { hexToRgb } from './doc';
import type { Tools } from './tools';
import { ProDialogs } from './pro';
import { ORDER_DEF, ICON } from './panels';
import { popPanel, dockPanel } from './popout';
import { penLive, notePen, pressureOf, penEraser, penBarrel } from './stylus';

/** modèles originaux de DedCut (tailles courantes des réseaux et de l'impression) */
export const PRESETS: { id: string; w: number; h: number; dpi?: number }[] = [
  { id: 'thumb', w: 1280, h: 720 }, { id: 'post', w: 1080, h: 1080 }, { id: 'portrait', w: 1080, h: 1350 }, { id: 'story', w: 1080, h: 1920 },
  { id: 'banner', w: 2560, h: 1440 }, { id: 'header', w: 1500, h: 500 }, { id: 'poster', w: 2480, h: 3508, dpi: 300 }, { id: 'flyer', w: 1748, h: 2480, dpi: 300 },
  { id: 'hd', w: 1920, h: 1080 }, { id: 'uhd', w: 3840, h: 2160 }, { id: 'icon', w: 512, h: 512 }, { id: 'card', w: 1004, h: 650, dpi: 300 }
];
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [onClose]);
  return <div className="im-modal" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={'im-mbox' + (wide ? ' wide' : '')}><h3>{title}<button onClick={onClose} title={t('common.cancel')}><Ico n="close" s={14} /></button></h3>{children}</div></div>;
}
const close = () => { ui.dialog = null; ed.emit(); };
export function Dialogs({ tools }: { tools: MutableRefObject<Tools | null> }) {
  useEd(); const k = ui.dialog as string | null;
  if (k === 'new') return <NewDlg />; if (k === 'export') return <ExportDlg />; if (k === 'imgsize') return <SizeDlg />; if (k === 'canvas') return <CanvasDlg />;
  if (k === 'keys') return <KeysDlg />; if (k === 'prefs') return <PrefsDlg />; if (k === 'tablet') return <TabletDlg />; if (k === 'recover') return <RecoverDlg />;
  if (k === 'layout') return <LayoutDlg />;
  if (k === 'refine') return <RefineDlg tools={tools} />; if (k === 'range') return <RangeDlg />; if (k === 'loadsel') return <LoadSelDlg />;
  return <ProDialogs />;
}

/* ---------- disposition des panneaux (comme dans le Montage) : côté, panneaux affichés, fenêtres à part ---------- */
function LayoutDlg() {
  useEd(); const s = ed.settings, out = s.out || {}, save = () => { ed.saveSettings(); ed.emit(); };
  return <Modal title={t('img.c.layout')} onClose={close}>
    <div className="im-lay">
      <h5>{t('il.side')}</h5>
      <div className="im-seg">{(['left', 'right'] as const).map(v => <button key={v} className={s.side === v ? 'on' : ''} onClick={() => { s.side = v; save(); }}>{t('sl.' + v)}</button>)}</div>
      <h5>{t('sl.shown')}</h5>
      <div className="im-laychips">{ORDER_DEF.map(k => <button key={k} className={s.panels[k] ? 'on' : ''} disabled={!!out[k]} onClick={() => { s.panels[k] = !s.panels[k]; save(); }}><Ico n={s.panels[k] ? 'eye' : 'eyeoff'} s={13} /><span>{t('img.p.' + k)}</span></button>)}</div>
      <h5>{t('detach.section')}</h5>
      <div className="im-layout">{ORDER_DEF.map(k => <button key={k} className={out[k] ? 'on' : ''} onClick={() => out[k] ? dockPanel(k) : popPanel(k)}><Ico n={out[k] ? 'popin' : 'popout'} s={14} /><Ico n={ICON[k]} s={14} /><span>{t('img.p.' + k)}</span></button>)}</div>
      <p className="im-hint">{t('detach.hint')}</p>
      <p className="im-hint">{t('il.hint')}</p>
    </div>
    <div className="im-btns"><button onClick={() => { for (const k of Object.keys(out)) if (out[k]) dockPanel(k); s.side = 'right'; s.right = 290; s.order = [...ORDER_DEF]; s.panels = { color: true, layers: true, props: true, history: true, info: false, brushes: false }; ui.full = false; save(); }}>{t('layout.reset')}</button><button className="pri" onClick={close}>{t('common.close')}</button></div>
  </Modal>;
}

/* ---------- nouveau document ---------- */
function NewDlg() {
  const [p, setP] = useState(() => { try { return JSON.parse(localStorage.getItem('dedcut-image-new') || 'null') || { w: 1920, h: 1080, dpi: 72, bg: 'white', color: '#1e1b4b', name: '', space: 'srgb', lock: false }; } catch { return { w: 1920, h: 1080, dpi: 72, bg: 'white', color: '#1e1b4b', name: '', space: 'srgb', lock: false }; } });
  const set = (o: Partial<typeof p>) => setP({ ...p, ...o });
  const go = () => { localStorage.setItem('dedcut-image-new', JSON.stringify(p)); const bg = p.bg === 'white' ? '#ffffff' : p.bg === 'black' ? '#000000' : p.bg === 'color' ? p.color : null;
    if (p.w < 1 || p.h < 1 || p.w > 30000 || p.h > 30000 || p.w * p.h > 400e6) { toast(t('img.err.toobig')); return; } newDocument(p.name, p.w, p.h, bg, p.dpi, p.space); close(); };
  const setW = (w: number) => set(p.lock ? { w, h: Math.round(w * p.h / p.w) } : { w }), setH = (h: number) => set(p.lock ? { h, w: Math.round(h * p.w / p.h) } : { h });
  return <Modal title={t('img.c.new')} onClose={close} wide>
    <div className="im-presets">{PRESETS.map(x => <button key={x.id} className={p.w === x.w && p.h === x.h ? 'on' : ''} onClick={() => set({ w: x.w, h: x.h, dpi: x.dpi || 72, name: t('img.pr.' + x.id) })}>
      <i style={{ aspectRatio: `${x.w}/${x.h}` }} /><b>{t('img.pr.' + x.id)}</b><small>{x.w} × {x.h}{x.dpi ? ' · ' + x.dpi + ' ppp' : ''}</small></button>)}</div>
    <div className="im-form">
      <label><span>{t('img.n.name')}</span><input value={p.name} placeholder={t('img.untitled')} onChange={e => set({ name: e.target.value })} /></label>
      <div className="im-row"><label><span>{t('img.g.w')}</span><input type="number" min={1} max={30000} value={p.w} onChange={e => setW(+e.target.value)} /></label>
        <button className={'im-ib' + (p.lock ? ' on' : '')} title={t('img.n.lock')} onClick={() => set({ lock: !p.lock })}><Ico n="link" s={15} /></button>
        <label><span>{t('img.g.h')}</span><input type="number" min={1} max={30000} value={p.h} onChange={e => setH(+e.target.value)} /></label>
        <button className="im-ib" title={t('img.n.swap')} onClick={() => set({ w: p.h, h: p.w })}><Ico n="swap" s={15} /></button></div>
      <label><span>{t('img.n.dpi')}</span><input type="number" min={10} max={1200} value={p.dpi} onChange={e => set({ dpi: +e.target.value })} /><small>{(p.w / p.dpi * 2.54).toFixed(1)} × {(p.h / p.dpi * 2.54).toFixed(1)} cm</small></label>
      <label><span>{t('img.n.bg')}</span><select value={p.bg} onChange={e => set({ bg: e.target.value })}>{['white', 'black', 'transparent', 'color'].map(k => <option key={k} value={k}>{t('img.n.bg_' + k)}</option>)}</select>{p.bg === 'color' && <input type="color" value={p.color} onChange={e => set({ color: e.target.value })} />}</label>
      <label><span>{t('img.n.space')}</span><select value={p.space} onChange={e => set({ space: e.target.value })}><option value="srgb">sRGB ({t('img.n.web')})</option><option value="display-p3">Display P3</option></select></label>
      <p className="im-hint">{t('img.n.mem', { size: fmt.bytes(p.w * p.h * 4) })}</p>
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={go}>{t('img.n.create')}</button></div>
  </Modal>;
}

/* ---------- exporter ---------- */
function ExportDlg() {
  const doc = ed.doc!; const [o, setO] = useState<ExpOpts & { sizes: string; all: boolean }>(() => {
    let s: Partial<ExpOpts & { sizes: string }> = {}; try { s = JSON.parse(localStorage.getItem('dedcut-image-export') || '{}'); } catch { /* rien */ }
    return { format: 'png', quality: .9, scale: 1, bg: '#ffffff', meta: 'basic', artist: '', copyright: '', ...s, w: undefined, h: undefined, sizes: s.sizes || '1', all: false };
  });
  const set = (x: Partial<typeof o>) => setO({ ...o, ...x });
  const [prev, setPrev] = useState<{ url: string; size: number } | null>(null), [busy, setBusy] = useState(false);
  const W = o.w || Math.round(doc.w * o.scale), H = o.h || Math.round(doc.h * o.scale), info = FORMAT_INFO[o.format], lost = useMemo(() => lostItems(doc, o.format), [doc, o.format]);
  useEffect(() => {
    let dead = false; const tm = setTimeout(async () => {
      if (o.format === 'psd' || o.format === 'svg' || o.format === 'tiff') { setPrev(null); return; }
      const k = Math.min(1, 480 / Math.max(W, H)); try { const b = await exportBlob(doc, { ...o, scale: o.scale * k, w: o.w ? o.w * k : undefined, h: o.h ? o.h * k : undefined, meta: 'none' }); if (!dead) { setPrev(p => { if (p) URL.revokeObjectURL(p.url); return { url: URL.createObjectURL(b), size: b.size / (k * k) }; }); } } catch { /* aperçu impossible */ }
    }, 250); return () => { dead = true; clearTimeout(tm); };
  }, [o.format, o.quality, o.scale, o.w, o.h, o.bg]); // eslint-disable-line
  const go = async () => {
    localStorage.setItem('dedcut-image-export', JSON.stringify({ ...o, w: undefined, h: undefined })); setBusy(true);
    const sizes = o.sizes.split(/[,; ]+/).map(Number).filter(x => x > 0 && x <= 8);
    const docs = o.all ? ed.docs.map(d => d.doc) : [doc]; let n = 0;
    for (const d of docs) n += await exportDoc(d, o, sizes.length ? sizes : [1]);
    setBusy(false); if (n) close();
  };
  return <Modal title={t('img.c.export')} onClose={close} wide>
    <div className="im-exp">
      <div className="im-form">
        <label><span>{t('img.x.format')}</span><select value={o.format} onChange={e => set({ format: e.target.value as ExpFormat })}>{(Object.keys(FORMAT_INFO) as ExpFormat[]).map(f => <option key={f} value={f}>{t('img.x.f_' + f)}</option>)}</select></label>
        {info.quality && <label><span>{t('img.x.quality')}</span><input type="range" min={.1} max={1} step={.01} value={o.quality} onChange={e => set({ quality: +e.target.value })} /><b>{Math.round(o.quality * 100)}</b></label>}
        <div className="im-row"><label><span>{t('img.x.scale')}</span><select value={o.w ? 'custom' : String(o.scale)} onChange={e => e.target.value === 'custom' ? set({ w: W, h: H }) : set({ scale: +e.target.value, w: undefined, h: undefined })}>{['.25', '.5', '1', '2', '3'].map(s => <option key={s} value={String(+s)}>{+s * 100} %</option>)}<option value="custom">{t('img.x.custom')}</option></select></label>
          {o.w != null && <><label><span>{t('img.g.w')}</span><input type="number" value={o.w} onChange={e => { const w = Math.max(1, +e.target.value); set({ w, h: Math.round(w * doc.h / doc.w) }); }} /></label><label><span>{t('img.g.h')}</span><input type="number" value={o.h} onChange={e => { const h = Math.max(1, +e.target.value); set({ h, w: Math.round(h * doc.w / doc.h) }); }} /></label></>}</div>
        <p className="im-hint">{W} × {H} px{prev ? ' · ≈ ' + fmt.bytes(prev.size) : ''}</p>
        {o.format === 'jpeg' && <label><span>{t('img.x.bg')}</span><input type="color" value={o.bg} onChange={e => set({ bg: e.target.value })} /><small>{t('img.x.bgHint')}</small></label>}
        <label><span>{t('img.x.sizes')}</span><input value={o.sizes} onChange={e => set({ sizes: e.target.value })} placeholder="1, 2, 0.5" /><small>{t('img.x.sizesHint')}</small></label>
        {o.format !== 'svg' && o.format !== 'psd' && <>
          <label><span>{t('img.x.meta')}</span><select value={o.meta} onChange={e => set({ meta: e.target.value as ExpOpts['meta'] })}><option value="none">{t('img.x.m_none')}</option><option value="basic">{t('img.x.m_basic')}</option><option value="keep">{t('img.x.m_keep')}</option></select></label>
          {o.meta === 'basic' && <div className="im-row"><label><span>{t('img.x.artist')}</span><input value={o.artist} onChange={e => set({ artist: e.target.value })} /></label><label><span>{t('img.x.copyright')}</span><input value={o.copyright} onChange={e => set({ copyright: e.target.value })} /></label></div>}
          {o.meta === 'keep' && doc.meta.exif?.gps && <p className="im-warn"><Ico n="warn" s={13} />{t('img.x.gpsWarn')}</p>}
        </>}
        {ed.docs.length > 1 && <label className="im-chk"><input type="checkbox" checked={o.all} onChange={e => set({ all: e.target.checked })} /><span>{t('img.x.allDocs', { n: ed.docs.length })}</span></label>}
        {lost.length > 0 && <div className="im-warn"><Ico n="warn" s={13} /><div><b>{t('img.x.lostTitle')}</b><ul>{lost.map(x => <li key={x}>{t('img.x.lost_' + x)}</li>)}</ul></div></div>}
      </div>
      <div className="im-preview">{prev ? <img src={prev.url} alt="" /> : <p className="im-hint">{t('img.x.noPreview')}</p>}<small>{t('img.x.previewHint')}</small></div>
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" disabled={busy} onClick={go}><Ico n="export" s={14} />{busy ? t('img.x.busy') : t('img.x.go')}</button></div>
  </Modal>;
}

/* ---------- taille de l'image / du canevas ---------- */
function SizeDlg() {
  const d = ed.doc!; const [w, setW] = useState(d.w), [h, setH] = useState(d.h), [lock, setLock] = useState(true), [mode, setMode] = useState<Resample>('smooth'), [dpi, setDpi] = useState(d.dpi), [unit, setUnit] = useState<'px' | '%' | 'cm'>('px');
  const toU = (v: number, base: number) => unit === '%' ? +(v / base * 100).toFixed(1) : unit === 'cm' ? +(v / dpi * 2.54).toFixed(2) : v;
  const fromU = (v: number, base: number) => Math.round(unit === '%' ? v / 100 * base : unit === 'cm' ? v / 2.54 * dpi : v);
  return <Modal title={t('img.c.imgSize')} onClose={close}>
    <div className="im-form">
      <div className="im-row"><label><span>{t('img.g.w')}</span><input type="number" value={toU(w, d.w)} onChange={e => { const nw = fromU(+e.target.value, d.w); setW(nw); if (lock) setH(Math.round(nw * d.h / d.w)); }} /></label>
        <button className={'im-ib' + (lock ? ' on' : '')} onClick={() => setLock(!lock)} title={t('img.n.lock')}><Ico n="link" s={15} /></button>
        <label><span>{t('img.g.h')}</span><input type="number" value={toU(h, d.h)} onChange={e => { const nh = fromU(+e.target.value, d.h); setH(nh); if (lock) setW(Math.round(nh * d.w / d.h)); }} /></label>
        <select value={unit} onChange={e => setUnit(e.target.value as 'px')}><option value="px">px</option><option value="%">%</option><option value="cm">cm</option></select></div>
      <label><span>{t('img.n.dpi')}</span><input type="number" value={dpi} onChange={e => setDpi(Math.max(10, +e.target.value))} /></label>
      <label><span>{t('img.o.resample')}</span><select value={mode} onChange={e => setMode(e.target.value as Resample)}>{(['smooth', 'bilinear', 'lanczos', 'nearest'] as const).map(k => <option key={k} value={k}>{t('img.o.rs_' + k)}</option>)}</select></label>
      <p className="im-hint">{t('img.s.hint', { a: `${d.w} × ${d.h}`, b: `${w} × ${h}`, size: fmt.bytes(w * h * 4) })}</p>
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={() => { if (w * h > 400e6 || w > 30000 || h > 30000) { toast(t('img.err.toobig')); return; } ed.resizeImage(w, h, mode, dpi); close(); }}>{t('img.o.apply')}</button></div>
  </Modal>;
}
function CanvasDlg() {
  const d = ed.doc!; const [w, setW] = useState(d.w), [h, setH] = useState(d.h), [ax, setAx] = useState(.5), [ay, setAy] = useState(.5), [fill, setFill] = useState<'none' | 'bg' | 'fg'>('none');
  return <Modal title={t('img.c.canvasSize')} onClose={close}>
    <div className="im-form">
      <div className="im-row"><label><span>{t('img.g.w')}</span><input type="number" value={w} onChange={e => setW(Math.max(1, +e.target.value))} /></label><label><span>{t('img.g.h')}</span><input type="number" value={h} onChange={e => setH(Math.max(1, +e.target.value))} /></label></div>
      <label><span>{t('img.cv.anchor')}</span><div className="im-anchor">{[0, .5, 1].map(y => [0, .5, 1].map(x => <button key={x + '-' + y} className={ax === x && ay === y ? 'on' : ''} onClick={() => { setAx(x); setAy(y); }} />))}</div></label>
      <label><span>{t('img.cv.fill')}</span><select value={fill} onChange={e => setFill(e.target.value as 'none')}><option value="none">{t('img.n.bg_transparent')}</option><option value="bg">{t('img.bg')}</option><option value="fg">{t('img.fg')}</option></select></label>
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={() => { ed.resizeCanvas(w, h, ax, ay, fill === 'none' ? null : fill === 'bg' ? ed.bg : ed.fg); close(); }}>{t('img.o.apply')}</button></div>
  </Modal>;
}

/* ---------- raccourcis clavier modifiables ---------- */
function KeysDlg() {
  const [wait, setWait] = useState(''), [q, setQ] = useState(''); const keys = ed.settings.keys;
  useEffect(() => {
    if (!wait) return; const k = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      if (e.key === 'Escape') { setWait(''); return; } const name = (e.ctrlKey ? 'ctrl+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + (e.key === ' ' ? 'space' : e.key.toLowerCase());
      const other = Object.keys(keys).find(c => keys[c] === name && c !== wait); if (other) keys[other] = ''; keys[wait] = name; ed.saveSettings(); setWait(''); ed.emit(); };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  }, [wait]); // eslint-disable-line
  const label = (id: string) => t('img.tool.' + id) !== 'img.tool.' + id ? t('img.tool.' + id) : t('img.c.' + id);
  const ids = Object.keys(DEF_KEYS).filter(id => !q || label(id).toLowerCase().includes(q.toLowerCase()));
  return <Modal title={t('img.c.keys')} onClose={close} wide>
    <input className="im-search" placeholder={t('img.p.search')} value={q} onChange={e => setQ(e.target.value)} />
    <div className="im-keys">{ids.map(id => <div key={id} className="im-krow"><span>{label(id)}</span>
      <button className={wait === id ? 'wait' : ''} onClick={() => setWait(id)}>{wait === id ? t('img.k.press') : fmtKey(keys[id]) || '—'}</button>
      {keys[id] !== DEF_KEYS[id] && <button className="im-ib" title={t('img.k.reset')} onClick={() => { keys[id] = DEF_KEYS[id]; ed.saveSettings(); ed.emit(); }}><Ico n="undo" s={13} /></button>}</div>)}</div>
    <div className="im-btns"><button onClick={() => { ed.settings.keys = { ...DEF_KEYS }; ed.saveSettings(); ed.emit(); }}>{t('img.k.resetAll')}</button><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}

/* ---------- préférences ---------- */
function PrefsDlg() {
  const s = ed.settings, set = (fn: () => void) => { fn(); ed.saveSettings(); ed.emit(); };
  return <Modal title={t('img.c.prefs')} onClose={close}>
    <div className="im-form">
      <label className="im-chk"><input type="checkbox" checked={s.lowPC} onChange={e => set(() => { s.lowPC = e.target.checked; })} /><span>{t('img.pf.lowPC')}</span></label>
      <p className="im-hint">{t('img.pf.lowPCHint')}</p>
      <label><span>{t('img.pf.auto')}</span><select value={s.autoMin} onChange={e => set(() => { s.autoMin = +e.target.value; })}>{[1, 2, 5, 10].map(m => <option key={m} value={m}>{t('img.pf.min', { n: m })}</option>)}</select></label>
      <label><span>{t('img.pf.grid')}</span><input type="number" min={2} max={1000} value={s.gridSize} onChange={e => set(() => { s.gridSize = Math.max(2, +e.target.value); })} /></label>
      <p className="im-hint">{t('img.pf.memHint')}</p>
    </div>
    <div className="im-btns"><button onClick={() => { ui.dialog = 'tablet'; ed.emit(); }}>{t('img.c.tablet')}</button><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}

/* ---------- stylet et tablette graphique ---------- */
const CURVES: [string, number][] = [['soft', .6], ['normal', 1], ['firm', 1.6]];
function TabletDlg() {
  const p = ed.settings.pen, set = (fn: () => void) => { fn(); ed.saveSettings(); ed.emit(); };
  const cur = CURVES.reduce((a, c) => Math.abs(c[1] - p.curve) < Math.abs(a[1] - p.curve) ? c : a);
  // courbe de pression : de l'appui le plus léger (à gauche) au plus fort (à droite)
  const pts = Array.from({ length: 21 }, (_, i) => { const x = i / 20, y = p.min + (1 - p.min) * Math.pow(x, p.curve); return (4 + x * 52).toFixed(1) + ',' + (56 - y * 52).toFixed(1); }).join(' ');
  return <Modal title={t('img.tb.title')} onClose={close} wide>
    <p className="im-hint im-tb-intro">{t('img.tb.intro')}</p>
    <div className="im-tb">
      <div className="im-form">
        <label><span>{t('img.tb.curve')}</span><select value={cur[0]} onChange={e => set(() => { p.curve = CURVES.find(c => c[0] === e.target.value)![1]; })}>{CURVES.map(c => <option key={c[0]} value={c[0]}>{t('img.tb.' + c[0])}</option>)}</select>
          <svg className="im-tb-curve" width="60" height="60" viewBox="0 0 60 60" aria-hidden="true"><path d="M4 4V56H56" /><polyline points={pts} /></svg></label>
        <label><span>{t('img.tb.min')}</span><input type="range" min={0} max={50} value={Math.round(p.min * 100)} onChange={e => set(() => { p.min = +e.target.value / 100; })} /><b>{Math.round(p.min * 100)} %</b></label>
        <label><span>{t('img.tb.barrel')}</span><select value={p.barrel} onChange={e => set(() => { p.barrel = e.target.value as typeof p.barrel; })}>
          <option value="picker">{t('img.tb.bPicker')}</option><option value="pan">{t('img.tb.bPan')}</option><option value="menu">{t('img.tb.bMenu')}</option></select></label>
        <label className="im-chk"><input type="checkbox" checked={p.eraser} onChange={e => set(() => { p.eraser = e.target.checked; })} /><span>{t('img.tb.eraser')}</span></label>
        <label className="im-chk"><input type="checkbox" checked={p.tilt} onChange={e => set(() => { p.tilt = e.target.checked; })} /><span>{t('img.tb.tilt')}</span></label>
        <p className="im-hint">{t('img.tb.brushHint')}</p>
      </div>
      <PenTest />
    </div>
    <p className="im-hint">{t('img.tb.tips')}</p>
    <div className="im-btns"><button onClick={() => set(() => { ed.settings.pen = defPen(); })}>{t('img.k.resetAll')}</button><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}
/** zone d'essai : on dessine avec le stylet et on voit ce que Windows transmet (appareil, pression, inclinaison, bout gomme) */
function PenTest() {
  const cv = useRef<HTMLCanvasElement>(null), last = useRef<{ x: number; y: number; w: number } | null>(null), [, tick] = useState(0);
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    notePen(e.nativeEvent); tick(n => n + 1);
    const c = cv.current, er = penEraser(e.nativeEvent) && ed.settings.pen.eraser;
    if (!c || !(e.buttons & 1 || er) || penBarrel(e.nativeEvent)) { last.current = null; return; }
    const r = c.getBoundingClientRect(), k = c.width / r.width, g = c.getContext('2d')!;
    const [cr, cg, cb] = hexToRgb(ed.fg), ink = cr * .3 + cg * .59 + cb * .11 > 215 ? '#222' : ed.fg; // couleur trop claire : invisible sur le fond blanc
    g.globalCompositeOperation = er ? 'destination-out' : 'source-over'; g.strokeStyle = g.fillStyle = ink; g.lineCap = 'round';
    const evs = e.nativeEvent.getCoalescedEvents?.() || [];
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const x = (ev.clientX - r.left) * k, y = (ev.clientY - r.top) * k, w = Math.max(1, (er ? 30 : 16) * pressureOf(ev) * k), L = last.current;
      if (L) { g.lineWidth = (L.w + w) / 2; g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(x, y); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, w / 2, 0, Math.PI * 2); g.fill(); }
      last.current = { x, y, w };
    }
  };
  const P = penLive, pen = P.type === 'pen';
  const msg = !P.type ? 'wait' : P.type === 'mouse' ? 'asMouse' : P.type === 'touch' ? 'asTouch' : P.pressureSeen ? 'ok' : 'noPress';
  return <div className="im-tb-test">
    <div className="im-tb-head"><b>{t('img.tb.test')}</b><button className="im-ib" title={t('img.tb.clear')} onClick={() => { const c = cv.current; c?.getContext('2d')!.clearRect(0, 0, c.width, c.height); }}><Ico n="eraser" s={13} /></button></div>
    <canvas ref={cv} width={760} height={300} className="im-tb-cv"
      onPointerDown={e => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ } last.current = null; draw(e); }} onPointerMove={draw}
      onPointerUp={e => { last.current = null; notePen(e.nativeEvent); tick(n => n + 1); }} onPointerCancel={() => { last.current = null; }}
      onContextMenu={e => e.preventDefault()} />
    <div className="im-tb-live">
      <span>{t('img.tb.dev')} <b>{P.type ? t('img.tb.' + (pen ? 'pen' : P.type === 'touch' ? 'touch' : 'mouse')) : '—'}</b></span>
      <span>{t('img.tb.press')} <b>{pen ? Math.round(P.pressure * 100) + ' %' : '—'}</b></span>
      <span>{t('img.tb.tiltV')} <b>{pen ? P.tiltX + '° / ' + P.tiltY + '°' : '—'}</b></span>
      <span>{t('img.tb.end')} <b>{pen ? t(P.eraser ? 'img.tb.eEraser' : P.barrel ? 'img.tb.eBarrel' : 'img.tb.eTip') : '—'}</b></span>
    </div>
    <p className={'im-tb-msg ' + (msg === 'ok' ? 'ok' : msg === 'wait' ? '' : 'warn')}>{t('img.tb.' + msg)}</p>
  </div>;
}

/* ---------- reprise après un plantage ---------- */
function RecoverDlg() {
  return <Modal title={t('img.r.title')} onClose={close}>
    <p>{t('img.r.text')}</p>
    <div className="im-recover">{recover.list.map(e => <div key={e.key} className="im-rrow">
      {e.thumb ? <img src={URL.createObjectURL(e.thumb)} alt="" /> : <Ico n="image" s={30} />}
      <div><b>{e.name}</b><small>{e.w} × {e.h} · {fmt.relative(e.t)}</small></div>
      <button className="pri" onClick={() => restoreAuto(e)}>{t('img.r.restore')}</button><button onClick={() => dropAuto(e)}>{t('img.r.drop')}</button></div>)}</div>
    <div className="im-btns"><button onClick={close}>{t('img.r.later')}</button></div>
  </Modal>;
}

/* ---------- améliorer les contours (cheveux) ---------- */
function RefineDlg({ tools }: { tools: MutableRefObject<Tools | null> }) {
  const d = ed.doc!, base = useRef(S.getSel(d)); const [o, setO] = useState({ radius: 6, smooth: 1, feather: 1, contrast: 10, shift: 0, hair: true }), [view, setView] = useState(true);
  useEffect(() => {
    if (!base.current) return; const tm = setTimeout(() => {
      ed.ds!.comp.update(); const res = S.refineSel(base.current!, ed.ds!.comp.cv, o);
      (d as typeof d & { selMask: HTMLCanvasElement | null }).selMask = res; S.showSel(d); if (tools.current) tools.current.vp.need = true;
    }, 120); return () => clearTimeout(tm);
  }, [o]); // eslint-disable-line
  const cancel = () => { (d as typeof d & { selMask: HTMLCanvasElement | null }).selMask = base.current; S.showSel(d); close(); };
  const ok = () => { const res = S.getSel(d); (d as typeof d & { selMask: HTMLCanvasElement | null }).selMask = base.current; selAct('img.h.refine', () => res); close(); };
  void view; void setView;
  const N = (k: keyof typeof o, min: number, max: number, unit = 'px') => <label className="im-num"><span>{t('img.rf.' + k)}</span><input type="range" min={min} max={max} value={o[k] as number} onChange={e => setO({ ...o, [k]: +e.target.value })} /><b>{o[k] as number}{unit}</b></label>;
  return <Modal title={t('img.c.refine')} onClose={cancel}>
    <div className="im-form">
      <label className="im-chk"><input type="checkbox" checked={o.hair} onChange={e => setO({ ...o, hair: e.target.checked })} /><span>{t('img.rf.hair')}</span></label>
      {N('radius', 0, 60)}{N('smooth', 0, 20)}{N('feather', 0, 40)}{N('contrast', 0, 100, '%')}{N('shift', -40, 40)}
      <p className="im-hint">{t('img.rf.hint')}</p>
    </div>
    <div className="im-btns"><button onClick={cancel}>{t('common.cancel')}</button><button className="pri" onClick={ok}>{t('img.o.apply')}</button></div>
  </Modal>;
}
/* ---------- plage de couleurs ---------- */
function RangeDlg() {
  const d = ed.doc!; const [c, setC] = useState(ed.fg), [tol, setTol] = useState(40);
  const ok = () => { ed.ds!.comp.update(); const m = S.colorRange(d, ed.ds!.comp.cv, hexToRgb(c), tol); selAct('img.h.sel', doc => S.combine(doc, m)); close(); };
  return <Modal title={t('img.c.colorRange')} onClose={close}>
    <div className="im-form"><label><span>{t('img.o.color')}</span><input type="color" value={c} onChange={e => setC(e.target.value)} /><small>{t('img.rg.hint')}</small></label>
      <label className="im-num"><span>{t('img.o.tol')}</span><input type="range" min={1} max={200} value={tol} onChange={e => setTol(+e.target.value)} /><b>{tol}</b></label></div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" onClick={ok}>{t('img.o.apply')}</button></div>
  </Modal>;
}
function LoadSelDlg() {
  const d = ed.doc!; const list = S.savedSels(d);
  return <Modal title={t('img.c.loadSel')} onClose={close}>
    <div className="im-recover">{list.map((s, i) => <div key={i} className="im-rrow"><b>{s.name}</b><span className="im-sp" />
      <button className="pri" onClick={() => { selAct('img.h.sel', doc => S.combine(doc, s.cv)); close(); }}>{t('img.ls.load')}</button>
      <button onClick={() => ed.act('img.h.selSave', (_tx, doc) => { (doc as typeof doc & { selSaved: unknown[] }).selSaved = list.filter((_, k) => k !== i); })}>{t('img.del')}</button></div>)}</div>
    <div className="im-btns"><button onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}

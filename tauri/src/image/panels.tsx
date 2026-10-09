// DedCut Image — panneaux de droite : Couleur, Pinceaux, Propriétés, Calques, Historique, Infos.
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { t, fmt } from '../i18n';
import { ed, ui, useEd, toast, askText, lastDoc } from './state';
import { Ico } from './icons';
import { runCmd } from './commands';
import { Layer, BLENDS, walk, findLayer, layerBounds, localSize, mkCanvas, ctx2d, hexToRgb, rgbToHex, Fx, FilterDef, Paint, TextLayer } from './doc';
import { renderRect } from './render';
import { Num, Chk, Sel, FontSel, cssGrad } from './options';
import { tips, tipCanvas, addTipFromImage, readGbr, BUILTIN_TIPS } from './brush';
import { ADJ_KINDS, defFilter } from './filters';
import { FILTERS, FilterEdit, saveChain, chains, applyChain, fxStyles, saveFxStyle } from './fxlib';
import { GRAD_PRESETS, PATTERNS } from './paint';
import { Tools } from './tools';
import { readMeta } from './meta';
import { openCtx } from './ctxmenu';
import * as PRO from './pro';

export const ORDER_DEF = ['color', 'brushes', 'props', 'layers', 'history', 'info'];
/** glisser à la souris : le glisser-déposer HTML (draggable) ne marche pas dans l'app Windows (Tauri garde le dépôt pour les fichiers
 *  de l'Explorateur). Marche aussi dans une fenêtre à part (document du panneau). Renvoie vrai si on a vraiment glissé (pour ignorer le clic). */
function mouseDrag(e: React.PointerEvent, o: { start(): void; move(under: HTMLElement | null, x: number, y: number): void; drop(): void; cancel(): void }) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button, input, select, canvas, textarea')) return;
  const el = e.currentTarget as HTMLElement, doc = el.ownerDocument, x0 = e.clientX, y0 = e.clientY, id = e.pointerId; let on = false;
  const mv = (ev: PointerEvent) => {
    if (!on) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return; on = true; try { el.setPointerCapture(id); } catch { /* rien */ } o.start(); }
    o.move(doc.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null, ev.clientX, ev.clientY);
  };
  const end = (ok: boolean) => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); if (on) { el.dataset.dragged = '1'; setTimeout(() => { delete el.dataset.dragged; }, 0); if (ok) o.drop(); else o.cancel(); } };
  const up = () => end(true), cancel = () => end(false);
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
}
export const ICON: Record<string, string> = { color: 'palette', brushes: 'brushes', props: 'gear', layers: 'layers', history: 'history', info: 'info' };
/** contenu d'un panneau (dans la colonne ou dans une fenêtre à part) */
export function PanelBody({ k, tools }: { k: string; tools: MutableRefObject<Tools | null> }) {
  return k === 'color' ? <ColorPanel /> : k === 'brushes' ? <BrushPanel /> : k === 'props' ? <PropsPanel /> : k === 'layers' ? <LayersPanel /> : k === 'history' ? <HistoryPanel /> : <InfoPanel tools={tools} />;
}
export function Panels({ tools }: { tools: MutableRefObject<Tools | null> }) {
  useEd(); const s = ed.settings; const order = s.order.length ? s.order : ORDER_DEF;
  const [drag, setDrag] = useState<string | null>(null);
  const startResize = (e: React.PointerEvent) => {
    // la colonne peut être à gauche ou à droite : le bord se tire dans les deux sens
    const x0 = e.clientX, w0 = s.right, dir = s.side === 'left' ? 1 : -1; const mv = (ev: PointerEvent) => { s.right = Math.max(220, Math.min(560, w0 + dir * (ev.clientX - x0))); ed.emit(); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); ed.saveSettings(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const out = (k: string) => !!s.out?.[k];
  const popOut = (k: string) => { s.out = { ...s.out, [k]: true }; s.panels[k] = true; ed.saveSettings(); ed.emit(); };
  return <aside className="im-panels" style={{ width: s.right }}>
    <div className="im-resize" onPointerDown={startResize} onDoubleClick={() => { s.right = 290; ed.saveSettings(); ed.emit(); }} title={t('img.p.resize')} />
    <div className="im-pbar">{order.map(k => <button key={k} className={out(k) ? 'out' : s.panels[k] ? 'on' : ''} title={t('img.p.' + k) + (out(k) ? ' — ' + t('il.isOut') : '')}
      onClick={() => { if (out(k)) { window.dispatchEvent(new CustomEvent('dedcut-img-focus', { detail: k })); return; } s.panels[k] = !s.panels[k]; ed.saveSettings(); ed.emit(); }}><Ico n={ICON[k]} s={16} /></button>)}</div>
    <div className="im-pscroll">
      {order.filter(k => s.panels[k] && !out(k)).map(k => <section key={k} className={'im-panel im-p-' + k + (drag === k ? ' drag' : '')}
        data-pk={k}>
        <h4 title={t('img.p.dragTip')} onPointerDown={e => { let to: string | null = null; mouseDrag(e, {
          start: () => setDrag(k), cancel: () => setDrag(null),
          move: u => { to = (u?.closest('[data-pk]') as HTMLElement | null)?.dataset.pk || null; },
          drop: () => { setDrag(null); if (!to || to === k) return; const o = order.filter(x => x !== k); o.splice(o.indexOf(to), 0, k); s.order = o; ed.saveSettings(); ed.emit(); } }); }}><Ico n={ICON[k]} s={14} />{t('img.p.' + k)}<button className="im-pout" title={t('detach.out')} onClick={() => popOut(k)}><Ico n="popout" s={12} /></button><button title={t('common.close')} onClick={() => { s.panels[k] = false; ed.saveSettings(); ed.emit(); }}><Ico n="close" s={12} /></button></h4>
        <PanelBody k={k} tools={tools} /></section>)}
    </div>
  </aside>;
}

/* ---------- Couleur : sélecteur, valeurs, favoris, récentes ---------- */
function hsv(hex: string): [number, number, number] { const [r, g, b] = hexToRgb(hex).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; }
function fromHsv(h: number, s: number, v: number) { const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255); }
function ColorPanel() {
  const [h, s, v] = hsv(ed.fg), [hue, setHue] = useState(h), sq = useRef<HTMLDivElement>(null);
  useEffect(() => { if (s > .02 && v > .02) setHue(h); }, [ed.fg]); // eslint-disable-line
  const pickSV = (e: React.PointerEvent) => { const r = sq.current!.getBoundingClientRect(); const go = (x: number, y: number) => ed.setFg(fromHsv(hue, Math.max(0, Math.min(1, (x - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (y - r.top) / r.height)))); go(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => go(ev.clientX, ev.clientY), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
  const [r, g, b] = hexToRgb(ed.fg);
  return <div className="im-color">
    <div className="im-sv" ref={sq} style={{ background: `hsl(${hue},100%,50%)` }} onPointerDown={pickSV}><i style={{ left: s * 100 + '%', top: (1 - v) * 100 + '%' }} /></div>
    <input type="range" className="im-hue" min={0} max={359} value={Math.round(hue)} onChange={e => { const nh = +e.target.value; setHue(nh); ed.setFg(fromHsv(nh, s || 1, v || 1)); }} />
    <div className="im-crow">
      <input type="color" value={ed.fg} onChange={e => ed.setFg(e.target.value)} title={t('img.fg')} />
      <input className="im-hex" value={ed.fg} onChange={e => { const x = e.target.value.trim(); if (/^#[0-9a-f]{6}$/i.test(x)) ed.setFg(x.toLowerCase()); }} spellCheck={false} />
      {[r, g, b].map((c, i) => <input key={i} type="number" min={0} max={255} value={c} title={'RGB'[i]} onChange={e => { const a = [r, g, b]; a[i] = Math.max(0, Math.min(255, +e.target.value || 0)); ed.setFg(rgbToHex(a[0], a[1], a[2])); }} />)}
    </div>
    <div className="im-favs"><small>{t('img.favs')}</small>{ed.favs.map((c, i) => <button key={i} style={{ background: c }} title={c} onClick={() => ed.setFg(c)} onContextMenu={e => { e.preventDefault(); ed.favs.splice(i, 1); ed.saveColors(); ed.emit(); }} />)}
      <button className="im-add" title={t('img.favAdd')} onClick={() => { if (!ed.favs.includes(ed.fg)) { ed.favs.push(ed.fg); ed.saveColors(); ed.emit(); } }}><Ico n="plus" s={12} /></button></div>
    {ed.recent.length > 0 && <div className="im-favs"><small>{t('img.recent')}</small>{ed.recent.slice(0, 12).map((c, i) => <button key={i} style={{ background: c }} title={c} onClick={() => ed.setFg(c)} />)}</div>}
  </div>;
}

/* ---------- Pinceaux : bibliothèque avec aperçu, import ---------- */
function tipPreview(id: string): string {
  const c = mkCanvas(120, 36), g = ctx2d(c), tip = tipCanvas(id); g.fillStyle = '#e4e4e7';
  for (let i = 0; i < 9; i++) { const x = 12 + i * 12, y = 18 + Math.sin(i / 1.5) * 8, s = 14 + Math.sin(i / 2) * 4; if (tip) g.drawImage(tip, x - s / 2, y - s / 2, s, s); else { g.beginPath(); g.arc(x, y, s / 2.4, 0, 7); g.fill(); } }
  if (tip) { g.globalCompositeOperation = 'source-in'; g.fillRect(0, 0, 120, 36); }
  return c.toDataURL();
}
function BrushPanel() {
  const b = ['pencil', 'eraser', 'smudge'].includes(ed.tool) ? (ed as unknown as Record<string, typeof ed.brush>)[ed.tool] : ed.brush;
  const imp = () => { const i = lastDoc.d.createElement('input'); i.type = 'file'; i.accept = '.png,.jpg,.jpeg,.webp,.gbr'; i.multiple = true; i.onchange = async () => {
    for (const f of [...(i.files || [])]) { try {
      if (/\.gbr$/i.test(f.name)) { const r = readGbr(await f.arrayBuffer()); if (!r) throw new Error('gbr'); const id = addTipFromImage(r.name, r.cv); b.tip = id; }
      else { const bmp = await createImageBitmap(f); const id = addTipFromImage(f.name.replace(/\.[^.]+$/, ''), bmp); bmp.close(); b.tip = id; }
    } catch { toast(t('img.t.badBrush', { name: f.name })); } } saveTips(); ed.emit(); }; i.click(); };
  return <div className="im-brushes">
    <div className="im-tips">{[...tips.values()].map(tp => <button key={tp.id} className={b.tip === tp.id ? 'on' : ''} title={tp.builtin ? t('img.tip.' + tp.id) : tp.name} onClick={() => { b.tip = tp.id; ed.emit(); }}>
      <img src={tipPreview(tp.id)} alt="" /><span>{tp.builtin ? t('img.tip.' + tp.id) : tp.name}</span>
      {!tp.builtin && <i title={t('img.del')} onClick={e => { e.stopPropagation(); tips.delete(tp.id); if (b.tip === tp.id) b.tip = 'round'; saveTips(); ed.emit(); }}><Ico n="close" s={11} /></i>}</button>)}</div>
    <button onClick={imp}><Ico n="plus" s={14} />{t('img.tip.import')}</button>
    <div className="im-grid2">
      <Num label={t('img.o.spacing')} v={Math.round(b.spacing * 100)} min={2} max={300} set={v => b.spacing = v / 100} unit="%" w={70} />
      <Num label={t('img.o.angle')} v={b.angle} min={-180} max={180} set={v => b.angle = v} unit="°" w={70} />
      <Num label={t('img.o.round')} v={Math.round(b.round * 100)} min={5} max={100} set={v => b.round = v / 100} unit="%" w={70} />
      <Num label={t('img.o.scatter')} v={Math.round(b.scatter * 100)} min={0} max={300} set={v => b.scatter = v / 100} unit="%" w={70} />
      <Num label={t('img.o.jitter')} v={Math.round(b.jitter * 100)} min={0} max={100} set={v => b.jitter = v / 100} unit="%" w={70} />
    </div>
  </div>;
}
/** formes de pinceau importées : gardées dans le profil (PNG) */
function saveTips() { try { const u = [...tips.values()].filter(x => !x.builtin && x.cv).map(x => ({ id: x.id, name: x.name, png: x.cv!.toDataURL() })); localStorage.setItem('dedcut-image-tips', JSON.stringify(u)); } catch { /* stockage plein */ } }
(function loadTips() { try { const u = JSON.parse(localStorage.getItem('dedcut-image-tips') || '[]') as { id: string; name: string; png: string }[]; for (const x of u) { const im = new Image(); im.onload = () => { const c = mkCanvas(im.width, im.height); ctx2d(c).drawImage(im, 0, 0); tips.set(x.id, { id: x.id, name: x.name, cv: c, builtin: false }); }; im.src = x.png; } } catch { /* rien */ } })();
void BUILTIN_TIPS;

/* ---------- Propriétés du calque actif ---------- */
/** modifie une valeur du calque en direct pendant un glisser (une seule étape d'historique) */
function live<T>(l: Layer, fn: (v: T) => void) {
  return { start: () => ed.begin('img.h.prop'), set: (v: T) => { if (!ed.busy) ed.begin('img.h.prop'); fn(v); ed.ds?.comp.all(); ed.emit(); }, end: () => ed.end() };
}
function LNum({ label, v, min, max, step = 1, unit = '', set, w = 80 }: { label: string; v: number; min: number; max: number; step?: number; unit?: string; set: (v: number) => void; w?: number }) {
  return <label className="im-num" onPointerDown={() => ed.begin('img.h.prop')} onPointerUp={() => ed.end()} onBlur={() => ed.busy && ed.end()}><span>{label}</span>
    <input type="range" min={min} max={max} step={step} value={v} style={{ width: w }} onChange={e => { if (!ed.busy) ed.begin('img.h.prop'); set(+e.target.value); ed.ds?.comp.all(); ed.emit(); }} />
    <input type="number" min={min} max={max} step={step} value={+v.toFixed(2)} onChange={e => { const n = +e.target.value; if (isFinite(n)) { ed.act('img.h.prop', () => set(Math.max(min, Math.min(max, n))), 'all'); } }} />{unit && <em>{unit}</em>}</label>;
}
function PaintEdit({ p, set }: { p: Paint; set: (p: Paint) => void }) {
  return <div className="im-paint">
    <Sel v={p.kind} opts={[['color', t('img.paint.color')], ['gradient', t('img.paint.gradient')], ['pattern', t('img.paint.pattern')]]} set={k => ed.act('img.h.prop', () => set({ ...p, kind: k, grad: p.grad || structuredClone(GRAD_PRESETS[2]), pattern: p.pattern || 'dots' }), 'all')} />
    {p.kind === 'color' && <input type="color" value={p.color} onChange={e => ed.act('img.h.prop', () => set({ ...p, color: e.target.value }), 'all')} />}
    {p.kind === 'gradient' && <div className="im-grads">{GRAD_PRESETS.map((g, i) => <button key={i} style={{ background: cssGrad(g) }} onClick={() => ed.act('img.h.prop', () => set({ ...p, grad: structuredClone(g) }), 'all')} />)}</div>}
    {p.kind === 'gradient' && p.grad && <LNum label={t('img.o.angle')} v={p.grad.angle} min={0} max={360} unit="°" set={v => { p.grad!.angle = v; set({ ...p }); }} />}
    {p.kind === 'pattern' && <Sel v={p.pattern || 'dots'} opts={Object.keys(PATTERNS).map(k => [k, t('img.pat.' + k)] as [string, string])} set={v => ed.act('img.h.prop', () => set({ ...p, pattern: v }), 'all')} />}
  </div>;
}
const TEXT_STYLES_KEY = 'dedcut-image-textstyles';
function PropsPanel() {
  useEd(); const l = ed.layer, d = ed.doc;
  if (!l || !d) return <p className="im-empty">{t('img.p.noLayer')}</p>;
  const b = layerBounds(l, d), tfL = l.type === 'smart' || l.type === 'text' || l.type === 'shape' ? l : null;
  const geo = (k: 'x' | 'y' | 'w' | 'h' | 'rot', v: number) => ed.setGeometry(l, { [k]: v });
  return <div className="im-props">
    {l.type !== 'adjust' && <div className="im-geo">
      {(['x', 'y', 'w', 'h'] as const).map(k => <label key={k}><span>{t('img.g.' + k)}</span><input type="number" value={Math.round(b[k])} disabled={l.locked || (l.type === 'group' && (k === 'w' || k === 'h'))} onChange={e => geo(k, +e.target.value)} /></label>)}
      {tfL && <label><span>{t('img.g.rot')}</span><input type="number" value={Math.round(tfL.tf.rot)} onChange={e => geo('rot', +e.target.value)} /></label>}
      <button className="im-ib" title={t('img.c.flipH')} onClick={() => runCmd('flipH')}><Ico n="fliph" s={15} /></button>
      <button className="im-ib" title={t('img.c.flipV')} onClick={() => runCmd('flipV')}><Ico n="flipv" s={15} /></button>
    </div>}
    {l.type === 'text' && <TextProps l={l} />}
    {l.type === 'shape' && <>
      <h5>{t('img.p.fill')}</h5>
      <Chk label={t('img.o.fill')} v={!!l.fill} set={v => ed.act('img.h.prop', () => { l.fill = v ? { kind: 'color', color: ed.fg } : null; }, 'all')} />
      {l.fill && <PaintEdit p={l.fill} set={p => { l.fill = p; }} />}
      <h5>{t('img.p.stroke')}</h5>
      <Chk label={t('img.o.stroke')} v={!!l.stroke?.on} set={v => ed.act('img.h.prop', () => { l.stroke = { ...(l.stroke || { paint: { kind: 'color', color: ed.fg }, width: 4, dash: 0, join: 'round' }), on: v }; }, 'all')} />
      {l.stroke?.on && <><PaintEdit p={l.stroke.paint} set={p => { l.stroke!.paint = p; }} />
        <LNum label={t('img.o.strokeW')} v={l.stroke.width} min={0} max={200} unit="px" set={v => { l.stroke!.width = v; }} />
        <LNum label={t('img.o.dash')} v={l.stroke.dash} min={0} max={10} step={.5} set={v => { l.stroke!.dash = v; }} /></>}
      {l.items[0] && (l.items[0].kind === 'rect') && <LNum label={t('img.o.radius')} v={l.items[0].r} min={0} max={Math.min(l.items[0].w, l.items[0].h) / 2} unit="px" set={v => { l.items[0].r = v; }} />}
      {l.items[0] && (l.items[0].kind === 'polygon' || l.items[0].kind === 'star') && <LNum label={t('img.o.sides')} v={l.items[0].sides} min={3} max={40} set={v => { l.items[0].sides = Math.round(v); }} />}
      {l.items[0]?.kind === 'star' && <LNum label={t('img.o.inner')} v={l.items[0].inner * 100} min={5} max={95} unit="%" set={v => { l.items[0].inner = v / 100; }} />}
      {l.items.length > 1 && <div className="im-items">{l.items.map((it, i) => <Sel key={i} v={it.op} opts={(['add', 'sub', 'int', 'xor'] as const).map(k => [k, t('img.o.cmb_' + k)])} set={v => ed.act('img.h.prop', () => { it.op = v; }, 'all')} />)}</div>}
    </>}
    {l.type === 'smart' && <>
      <p className="im-src"><Ico n="smart" s={14} />{l.srcName} · {l.sw} × {l.sh}{l.link && <span title={l.link}> · {t('img.p.linked')}</span>}</p>
      <div className="im-row"><button onClick={() => runCmd('replace')}>{t('img.c.replace')}</button>{l.quad && <button onClick={() => ed.act('img.h.prop', () => { l.quad = null; }, 'all')}>{t('img.p.resetPersp')}</button>}</div>
      <FilterList list={l.filters} />
    </>}
    {l.type === 'adjust' && <FilterList list={l.adj} adjust />}
    {l.type === 'raster' && <div className="im-row"><button onClick={() => runCmd('toSmart')}><Ico n="smart" s={14} />{t('img.c.toSmart')}</button><small className="im-hint">{t('img.p.smartHint')}</small></div>}
    {l.type !== 'adjust' && <FxList l={l} />}
  </div>;
}
function TextProps({ l }: { l: TextLayer }) {
  const s = l.st, styles = (() => { try { return JSON.parse(localStorage.getItem(TEXT_STYLES_KEY) || '[]') as { n: string; st: TextLayer['st'] }[]; } catch { return []; } })();
  const set = (fn: () => void) => ed.act('img.h.text', fn, 'all');
  return <div className="im-textp">
    <textarea value={l.text} rows={3} onFocus={() => ed.begin('img.h.textEdit')} onBlur={() => ed.end()} onChange={e => { if (!ed.busy) ed.begin('img.h.textEdit'); l.text = e.target.value; l.name = e.target.value.slice(0, 30) || t('img.layer.text'); ed.ds?.comp.all(); ed.emit(); }} />
    <FontSel v={s.font} set={f => set(() => { s.font = f; })} />
    <div className="im-grid2">
      <LNum label={t('img.o.size')} v={s.size} min={4} max={1000} unit="px" set={v => { s.size = v; }} />
      <Sel v={String(s.weight)} opts={[['100', '100'], ['300', t('img.o.w300')], ['400', t('img.o.w400')], ['600', t('img.o.w600')], ['700', t('img.o.w700')], ['900', t('img.o.w900')]]} set={v => set(() => { s.weight = +v; })} />
      <LNum label={t('img.o.lh')} v={s.lh} min={.5} max={3} step={.05} set={v => { s.lh = v; }} />
      <LNum label={t('img.o.ls')} v={s.ls} min={-20} max={100} step={.5} unit="px" set={v => { s.ls = v; }} />
      <LNum label={t('img.o.curve')} v={s.curve} min={-100} max={100} set={v => { s.curve = v; }} />
      <LNum label={t('img.o.boxW')} v={l.boxW} min={0} max={4000} unit="px" set={v => { l.boxW = v; }} />
    </div>
    <div className="im-row">
      <div className="im-seg">{(['left', 'center', 'right'] as const).map(a => <button key={a} className={s.align === a ? 'on' : ''} title={t('img.o.al_' + a)} onClick={() => set(() => { s.align = a; })}><Ico n={a === 'left' ? 'alignl' : a === 'center' ? 'alignc' : 'alignr'} s={14} /></button>)}</div>
      <Chk label={t('img.o.italic')} v={s.italic} set={v => set(() => { s.italic = v; })} /><Chk label={t('img.o.underline')} v={s.underline} set={v => set(() => { s.underline = v; })} /><Chk label={t('img.o.caps')} v={s.caps} set={v => set(() => { s.caps = v; })} />
      <Chk label={t('img.o.rtl')} v={s.dir === 'rtl'} set={v => set(() => { s.dir = v ? 'rtl' : 'ltr'; })} />
    </div>
    <h5>{t('img.p.fill')}</h5><PaintEdit p={s.fill} set={p => { s.fill = p; }} />
    <h5>{t('img.p.outline')}</h5>
    <div className="im-row"><Chk label={t('img.o.stroke')} v={s.stroke.on} set={v => set(() => { s.stroke.on = v; })} />{s.stroke.on && <input type="color" value={s.stroke.color} onChange={e => set(() => { s.stroke.color = e.target.value; })} />}</div>
    {s.stroke.on && <LNum label={t('img.o.strokeW')} v={s.stroke.width} min={1} max={60} unit="px" set={v => { s.stroke.width = v; }} />}
    <div className="im-row">
      <button onClick={() => { if (l.onPath) set(() => { l.onPath = null; }); else { const w = localSize(l)[0]; set(() => { l.onPath = { closed: false, pts: [{ x: -w / 2, y: 0, ix: 0, iy: 0, ox: w / 3, oy: -w / 3, smooth: true }, { x: w / 2, y: 0, ix: -w / 3, iy: -w / 3, ox: 0, oy: 0, smooth: true }] }; }); toast(t('img.t.onPathHint')); } }}>{t(l.onPath ? 'img.p.offPath' : 'img.p.onPath')}</button>
      <button onClick={() => import('./textshape').then(m => m.textToShape(l))}>{t('img.p.toShape')}</button>
    </div>
    <h5>{t('img.p.titleStyles')}</h5>
    <div className="im-styles">{styles.map((x, i) => <button key={i} onClick={() => set(() => { l.st = structuredClone(x.st); })} onContextMenu={e => { e.preventDefault(); styles.splice(i, 1); localStorage.setItem(TEXT_STYLES_KEY, JSON.stringify(styles)); ed.emit(); }} style={{ fontFamily: `"${x.st.font}"`, fontWeight: x.st.weight }}>{x.n}</button>)}
      <button className="im-add" title={t('img.p.saveStyle')} onClick={() => { const st = structuredClone(l.st); void askText(t('img.q.styleName'), l.text.slice(0, 20)).then(n => { if (!n) return; styles.push({ n: n.slice(0, 30), st }); localStorage.setItem(TEXT_STYLES_KEY, JSON.stringify(styles)); ed.emit(); }); }}><Ico n="plus" s={12} /></button></div>
  </div>;
}
/** filtres d'un calque intelligent ou réglages d'un calque de réglage (modifiables, l'original reste intact) */
function FilterList({ list, adjust }: { list: FilterDef[]; adjust?: boolean }) {
  const [add, setAdd] = useState('');
  const kinds = adjust ? ADJ_KINDS.concat(Object.keys(FILTERS).filter(k => FILTERS[k].adjust && !ADJ_KINDS.includes(k))) : Object.keys(FILTERS);
  return <div className="im-filters">
    <h5>{t(adjust ? 'img.p.adjusts' : 'img.p.filters')}</h5>
    {list.map((f, i) => <div key={i} className={'im-filter' + (ui.focusFilter === i ? ' focus' : '')}>
      <div className="im-fhead"><input type="checkbox" checked={f.on} onChange={e => ed.act('img.h.filter', () => { f.on = e.target.checked; }, 'all')} title={t('img.p.filterOn')} />
        <b>{t('img.fl.' + f.kind)}</b>
        <button className="im-ib" title={t('img.up')} disabled={!i} onClick={() => ed.act('img.h.filter', () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); }, 'all')}><Ico n="up" s={12} /></button>
        <button className="im-ib" title={t('img.del')} onClick={() => ed.act('img.h.filter', () => { list.splice(i, 1); }, 'all')}><Ico n="trash" s={12} /></button></div>
      <FilterEdit f={f} />
    </div>)}
    <div className="im-row">
      <select value={add} onChange={e => { const k = e.target.value; setAdd(''); if (k) ed.act('img.h.filter', () => { list.push(FILTERS[k] ? FILTERS[k].make() : defFilter(k)); }, 'all'); }}>
        <option value="">{t(adjust ? 'img.p.addAdjust' : 'img.p.addFilter')}</option>
        {kinds.map(k => <option key={k} value={k}>{t('img.fl.' + k)}</option>)}
      </select>
      {!adjust && list.length > 0 && <button title={t('img.p.saveChain')} onClick={() => { void askText(t('img.q.chainName')).then(n => { if (n) saveChain(n, list); ed.emit(); }); }}><Ico n="save" s={13} /></button>}
      {!adjust && chains().length > 0 && <select value="" onChange={e => { const c = chains()[+e.target.value]; if (c) ed.act('img.h.filter', () => { applyChain(list, c); }, 'all'); }}><option value="">{t('img.p.chains')}</option>{chains().map((c, i) => <option key={i} value={i}>{c.n}</option>)}</select>}
    </div>
  </div>;
}
const FX_KINDS: Fx['kind'][] = ['shadow', 'glow', 'stroke', 'overlay', 'gradover', 'patover', 'inner', 'bevel'];
function FxList({ l }: { l: Layer }) {
  const def = (k: Fx['kind']): Fx => ({ kind: k, on: true, color: k === 'glow' ? '#fde047' : k === 'stroke' ? '#ffffff' : k === 'overlay' ? '#a78bfa' : '#000000', opacity: k === 'overlay' ? .6 : k === 'patover' ? .5 : .7, size: k === 'stroke' ? 4 : 12, dist: k === 'shadow' ? 10 : 4, angle: 45, grad: k === 'gradover' ? structuredClone(GRAD_PRESETS[3]) : undefined, ...(k === 'patover' ? { pattern: 'paper', scale: 1 } : {}) });
  const st = fxStyles();
  return <div className="im-fx">
    <h5>{t('img.p.fx')}</h5>
    {l.fx.map((f, i) => <div key={i} className="im-filter">
      <div className="im-fhead"><input type="checkbox" checked={f.on} onChange={e => ed.act('img.h.fx', () => { f.on = e.target.checked; }, 'all')} /><b>{t('img.fx.' + f.kind)}</b>
        {f.kind !== 'gradover' && f.kind !== 'patover' && <input type="color" value={f.color} onChange={e => ed.act('img.h.fx', () => { f.color = e.target.value; }, 'all')} />}
        <button className="im-ib" title={t('img.del')} onClick={() => ed.act('img.h.fx', () => { l.fx.splice(i, 1); }, 'all')}><Ico n="trash" s={12} /></button></div>
      <LNum label={t('img.o.opacity')} v={Math.round(f.opacity * 100)} min={0} max={100} unit="%" set={v => { f.opacity = v / 100; }} />
      {f.kind !== 'overlay' && f.kind !== 'gradover' && f.kind !== 'patover' && <LNum label={t('img.o.size')} v={f.size} min={0} max={120} unit="px" set={v => { f.size = v; }} />}
      {(f.kind === 'shadow' || f.kind === 'inner' || f.kind === 'bevel') && <><LNum label={t('img.o.dist')} v={f.dist} min={0} max={200} unit="px" set={v => { f.dist = v; }} /><LNum label={t('img.o.angle')} v={f.angle} min={0} max={360} unit="°" set={v => { f.angle = v; }} /></>}
      {f.kind === 'patover' && <><Sel label={t('img.fx.pat')} v={f.pattern || 'paper'} opts={Object.keys(PATTERNS).map(k => [k, t('img.pat.' + k)] as [string, string])} set={v => ed.act('img.h.fx', () => { f.pattern = v; }, 'all')} /><LNum label={t('img.fx.patScale')} v={Math.round((f.scale || 1) * 100)} min={10} max={800} unit="%" set={v => { f.scale = v / 100; }} /></>}
      {f.kind === 'gradover' && f.grad && <div className="im-grads">{GRAD_PRESETS.map((g, k) => <button key={k} style={{ background: cssGrad(g) }} onClick={() => ed.act('img.h.fx', () => { f.grad = structuredClone(g); }, 'all')} />)}</div>}
    </div>)}
    <div className="im-row">
      <select value="" onChange={e => { const k = e.target.value as Fx['kind']; if (k) ed.act('img.h.fx', () => { l.fx.push(def(k)); }, 'all'); }}><option value="">{t('img.p.addFx')}</option>{FX_KINDS.map(k => <option key={k} value={k}>{t('img.fx.' + k)}</option>)}</select>
      {l.fx.length > 0 && <button title={t('img.p.saveFx')} onClick={() => { const fx = l.fx; void askText(t('img.q.styleName')).then(n => { if (n) saveFxStyle(n, fx); ed.emit(); }); }}><Ico n="save" s={13} /></button>}
      {st.length > 0 && <select value="" onChange={e => { const s = st[+e.target.value]; if (s) ed.act('img.h.fx', () => { l.fx = structuredClone(s.fx); }, 'all'); }}><option value="">{t('img.p.fxStyles')}</option>{st.map((s, i) => <option key={i} value={i}>{s.n}</option>)}</select>}
    </div>
  </div>;
}

/* ---------- Calques ---------- */
const TAGS = ['', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
const thumbCache = new WeakMap<Layer, { v: number; url: string }>();
function thumb(l: Layer): string {
  const d = ed.doc!, c = thumbCache.get(l); if (c && c.v === ed.ds!.hist.i + ed.v * 0) return c.url;
  const k = 40 / Math.max(d.w, d.h), cv = renderRect({ ...d, bg: null, layers: [{ ...l, visible: true, opacity: 1, blend: 'source-over', clip: false } as Layer] }, { x: 0, y: 0, w: d.w, h: d.h }, k, undefined, { bg: false });
  const url = cv.toDataURL(); thumbCache.set(l, { v: ed.ds!.hist.i, url }); return url;
}
function LayersPanel() {
  useEd(); const d = ed.doc; const [q, setQ] = useState(''), [tag, setTag] = useState(''), [ren, setRen] = useState(0), [dragId, setDragId] = useState(0), [over, setOver] = useState<{ id: number; where: 'above' | 'below' | 'into' } | null>(null);
  if (!d) return <p className="im-empty">{t('img.noDoc')}</p>;
  const l = ed.layer, rows: { l: Layer; depth: number }[] = [];
  const add = (list: Layer[], depth: number) => { for (let i = list.length - 1; i >= 0; i--) { const x = list[i]; rows.push({ l: x, depth }); if (x.type === 'group' && x.open) add(x.children, depth + 1); } };
  add(d.layers, 0);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const vis = rows.filter(r => (!q || norm(r.l.name).includes(norm(q))) && (!tag || r.l.tag === tag));
  return <div className="im-layers">
    {l && <div className="im-lhead">
      <select value={l.blend} title={t('img.p.blend')} onChange={e => ed.setProp(l, 'blend', e.target.value as typeof l.blend, 'img.h.blend')}>{BLENDS.map(bm => <option key={bm} value={bm}>{t('img.blend.' + bm)}</option>)}</select>
      <LNum label={t('img.o.opacity')} v={Math.round(l.opacity * 100)} min={0} max={100} unit="%" w={70} set={v => { l.opacity = v / 100; }} />
    </div>}
    {l && l.type === 'group' && <Chk label={t('img.p.passThrough')} v={l.pass} set={v => ed.act('img.h.prop', () => { l.pass = v; }, 'all')} />}
    <div className="im-lsearch"><Ico n="search" s={13} /><input placeholder={t('img.p.search')} value={q} onChange={e => setQ(e.target.value)} />
      <div className="im-tagf">{TAGS.map(c => <button key={c} className={tag === c ? 'on' : ''} style={{ background: c || 'transparent' }} title={c ? t('img.p.tagFilter') : t('img.p.allTags')} onClick={() => setTag(c)} />)}</div></div>
    <div className="im-llist">
      {vis.map(({ l: x, depth }) => {
        const on = d.sel.includes(x.id), maskOn = on && ed.ds!.maskEdit && x.mask;
        return <div key={x.id} className={'im-lrow' + (on ? ' on' : '') + (x.clip ? ' clip' : '') + (over?.id === x.id ? ' ov-' + over.where : '') + (dragId === x.id ? ' dragging' : '')} style={{ paddingLeft: 4 + depth * 14 }}
          data-lid={x.id} data-grp={x.type === 'group' ? '1' : ''}
          onPointerDown={e => { let tgt: { id: number; where: 'above' | 'below' | 'into' } | null = null; mouseDrag(e, {
            start: () => setDragId(x.id), cancel: () => { setDragId(0); setOver(null); },
            move: (u, _x, y) => { const r = u?.closest('[data-lid]') as HTMLElement | null, oid = r ? +r.dataset.lid! : 0; if (!r || oid === x.id) { tgt = null; setOver(null); return; }
              const b = r.getBoundingClientRect(), f = (y - b.top) / b.height; tgt = { id: oid, where: r.dataset.grp && f > .3 && f < .7 ? 'into' : f < .5 ? 'above' : 'below' }; setOver(tgt); },
            drop: () => { if (tgt) ed.moveLayer(x.id, tgt.id, tgt.where); setDragId(0); setOver(null); } }); }}
          onClick={e => { if ((e.currentTarget as HTMLElement).dataset.dragged) return; ed.select(x.id, e.ctrlKey, e.shiftKey); }} onDoubleClick={() => setRen(x.id)}
          onContextMenu={e => { if (!d.sel.includes(x.id)) ed.select(x.id); openCtx(e, [
            { label: 'img.cx.sendLayer', icon: 'export', run: () => PRO.sendToMontage(x), off: x.type === 'adjust' },
            { label: 'img.cx.sendImage', run: () => PRO.sendToMontage() },
            { label: 'img.c.dupLayer', icon: 'dup', run: () => runCmd('dupLayer'), sep: true },
            { label: 'img.c.mergeDown', run: () => runCmd('mergeDown') },
            { label: 'img.c.rasterize', run: () => runCmd('rasterize'), off: x.type === 'raster' || x.type === 'adjust' },
            { label: 'img.c.delLayer', run: () => runCmd('delLayer'), danger: true, sep: true }]); }}>
          {x.tag && <i className="im-tag" style={{ background: x.tag }} />}
          <button className="im-ib" title={t('img.p.visible')} onClick={e => { e.stopPropagation(); ed.setProp(x, 'visible', !x.visible, 'img.h.visible'); }}><Ico n={x.visible ? 'eye' : 'eyeoff'} s={14} /></button>
          {x.type === 'group' ? <button className="im-ib" onClick={e => { e.stopPropagation(); x.open = !x.open; ed.emit(); }}><Ico n={x.open ? 'down' : 'more'} s={12} /></button> : x.clip ? <Ico n="clip" s={12} /> : null}
          <img className={'im-th' + (on && !maskOn ? ' act' : '')} src={x.type === 'group' ? undefined : thumb(x)} alt="" onClick={() => { if (ed.ds) ed.ds.maskEdit = false; }} />
          {x.mask && <canvas className={'im-th im-mth' + (maskOn ? ' act' : '') + (x.mask.on ? '' : ' off')} width={28} height={28} ref={c => { if (c) { const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 28, 28); g.drawImage(x.mask!.cv, 0, 0, 28, 28); } }}
            title={t('img.p.maskTip')} onClick={e => { e.stopPropagation(); ed.select(x.id); if (e.shiftKey) ed.act('img.h.mask', () => { x.mask!.on = !x.mask!.on; }, 'all'); else if (ed.ds) { ed.ds.maskEdit = true; ed.emit(); } }} />}
          {ren === x.id ? <input autoFocus defaultValue={x.name} onBlur={e => { ed.rename(x, e.target.value); setRen(0); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRen(0); }} onClick={e => e.stopPropagation()} />
            : <span className="im-lname" title={x.name}>{x.type === 'group' && <Ico n="folder" s={12} />}{x.type === 'text' && <Ico n="text" s={12} />}{x.type === 'adjust' && <Ico n="adjust" s={12} />}{x.type === 'smart' && <Ico n="smart" s={12} />}{x.type === 'shape' && <Ico n="shape" s={12} />}{x.name}</span>}
          {x.fx.some(f => f.on) && <i className="im-badge" title={t('img.p.fx')}>fx</i>}
          <button className="im-ib" title={t('img.p.lock')} onClick={e => { e.stopPropagation(); ed.setProp(x, 'locked', !x.locked, 'img.h.lock'); }}><Ico n={x.locked ? 'lock' : 'unlock'} s={13} /></button>
          <TagPick l={x} />
        </div>;
      })}
    </div>
    <div className="im-lbtns">
      <button title={t('img.c.newLayer')} onClick={() => runCmd('newLayer')}><Ico n="plus" s={15} /></button>
      <button title={t('img.c.newGroup')} onClick={() => runCmd('newGroup')}><Ico n="folder" s={15} /></button>
      <select className="im-adjsel" value="" title={t('img.p.addAdjust')} onChange={e => { if (e.target.value) ed.addLayer('adjust', e.target.value); }}><option value="">◐</option>{ADJ_KINDS.concat(Object.keys(FILTERS).filter(k => FILTERS[k].adjust && !ADJ_KINDS.includes(k))).map(k => <option key={k} value={k}>{t('img.fl.' + k)}</option>)}</select>
      <button title={t('img.c.addMask')} onClick={() => runCmd(l?.mask ? 'delMask' : 'addMask')}><Ico n="mask" s={15} /></button>
      <button title={t('img.c.clip')} onClick={() => runCmd('clip')}><Ico n="clip" s={15} /></button>
      <button title={t('img.c.dupLayer')} onClick={() => runCmd('dupLayer')}><Ico n="dup" s={15} /></button>
      <button title={t('img.c.mergeDown')} onClick={() => runCmd('mergeDown')}><Ico n="merge" s={15} /></button>
      <button title={t('img.c.delLayer')} onClick={() => ed.deleteSel()}><Ico n="trash" s={15} /></button>
    </div>
  </div>;
}
function TagPick({ l }: { l: Layer }) {
  const [o, setO] = useState(false);
  return <span className="im-tagpick" onClick={e => e.stopPropagation()}><button className="im-ib" title={t('img.p.tag')} onClick={() => setO(!o)}><i style={{ background: l.tag || 'transparent' }} /></button>
    {o && <span className="im-tagmenu">{TAGS.map(c => <button key={c} style={{ background: c || 'transparent' }} onClick={() => { ed.act('img.h.tag', () => { l.tag = c; }); setO(false); }} />)}</span>}</span>;
}

/* ---------- Historique ---------- */
function HistoryPanel() {
  useEd(); const ds = ed.ds; if (!ds) return <p className="im-empty">{t('img.noDoc')}</p>;
  const h = ds.hist;
  return <div className="im-history">
    <button className={'im-hrow' + (h.i === 0 ? ' on' : '')} onClick={() => { h.goto(0); ds.comp.all(); ed.afterRestore?.(); ed.emit(); }}><Ico n="image" s={13} />{t('img.h.open')}</button>
    {h.items.map((e, i) => <button key={i} className={'im-hrow' + (i + 1 === h.i ? ' on' : '') + (i + 1 > h.i ? ' undone' : '')} onClick={() => { h.goto(i + 1); ds.comp.all(); ed.afterRestore?.(); ed.emit(); }}>
      <Ico n="history" s={13} />{t(e.label)}<small>{new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></button>)}
    <p className="im-hint">{t('img.p.histInfo', { n: h.items.length, size: fmt.bytes(h.bytes) })}</p>
  </div>;
}

/* ---------- Infos : position, couleur, document, métadonnées, histogramme ---------- */
function InfoPanel({ tools }: { tools: MutableRefObject<Tools | null> }) {
  useEd(); const d = ed.doc, ds = ed.ds; const hc = useRef<HTMLCanvasElement>(null), [clip, setClip] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    if (!ds || !hc.current) return; ds.comp.update(); const src = ds.comp.cv, k = Math.min(1, 512 / Math.max(src.width, src.height)), c = mkCanvas(src.width * k, src.height * k); ctx2d(c).drawImage(src, 0, 0, c.width, c.height);
    const px = ctx2d(c, true).getImageData(0, 0, c.width, c.height).data, H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]; let lo = 0, hi = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) { if (!px[i + 3]) continue; n++; const y = Math.round(.299 * px[i] + .587 * px[i + 1] + .114 * px[i + 2]); H[0][px[i]]++; H[1][px[i + 1]]++; H[2][px[i + 2]]++; H[3][y]++; if (y <= 2) lo++; if (y >= 253) hi++; }
    setClip([n ? lo / n : 0, n ? hi / n : 0]);
    const g = hc.current.getContext('2d')!, W = 256, Hh = 70; g.clearRect(0, 0, W, Hh); const mx = Math.max(1, ...H.map(a => Math.max(...a)));
    (['rgba(239,68,68,.55)', 'rgba(34,197,94,.55)', 'rgba(59,130,246,.55)', 'rgba(228,228,231,.9)'] as const).forEach((col, ci) => { g.strokeStyle = col; g.beginPath(); for (let x = 0; x < 256; x++) { const y = Hh - Math.sqrt(H[ci][x] / mx) * Hh; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); });
  }, [ds?.hist.i, ed.cur, d?.w]); // eslint-disable-line
  if (!d || !ds) return <p className="im-empty">{t('img.noDoc')}</p>;
  const h = tools.current ? null : null; void h;
  const exif = d.meta.exif || {}, keys = Object.keys(exif).filter(k => exif[k] && k !== 'orientation');
  return <div className="im-info">
    <canvas ref={hc} width={256} height={70} className="im-histo" />
    {(clip[0] > .01 || clip[1] > .01) && <p className="im-warn"><Ico n="warn" s={13} />{t('img.p.clipped', { lo: fmt.percent(clip[0]), hi: fmt.percent(clip[1]) })}</p>}
    <dl>
      <dt>{t('img.p.size')}</dt><dd>{d.w} × {d.h} px</dd>
      <dt>{t('img.p.print')}</dt><dd>{(d.w / d.dpi * 2.54).toFixed(1)} × {(d.h / d.dpi * 2.54).toFixed(1)} cm · {d.dpi} ppp</dd>
      <dt>{t('img.p.space')}</dt><dd>{d.space === 'display-p3' ? 'Display P3' : 'sRGB'}{d.meta.icc ? ' · ICC : ' + d.meta.icc : ''}</dd>
      <dt>{t('img.p.layers')}</dt><dd>{[...walk(d.layers)].length}</dd>
      {d.meta.srcName && <><dt>{t('img.p.source')}</dt><dd>{d.meta.srcName}</dd></>}
      {keys.map(k => <><dt key={k + 'k'}>{t('img.exif.' + k)}</dt><dd key={k + 'v'}>{exif[k]}</dd></>)}
      {exif.gps && <><dt>GPS</dt><dd>{t('img.p.gpsWarn')}</dd></>}
    </dl>
    <p className="im-hint">{t('img.p.metaHint')}</p>
  </div>;
}
void readMeta; void findLayer;

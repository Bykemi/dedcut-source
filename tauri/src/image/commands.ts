// DedCut Image — toutes les commandes (menus, raccourcis clavier modifiables, palette de commandes).
import { t } from '../i18n';
import { ed, ui, toast, askText, openDialog, pickAndOpen, saveDoc, closeDoc, copyMerged, pasteImage, replaceSmart, checkRecover } from './state';
import { selLayers, findLayer, ctx2d, newRaster, Layer } from './doc';
import * as S from './select';
import type { ToolId } from './editor';
import * as PRO from './pro';

export interface Cmd { id: string; menu: string; icon?: string; run: () => void; on?: () => boolean; check?: () => boolean; sep?: boolean }
const hasDoc = () => !!ed.doc, hasLayer = () => !!ed.layer, hasSel = () => !!S.getSel(ed.doc);
const tools: { current: { vp: { fit(): void; actual(): void; zoomAt(z: number): void; need: boolean } } | null } = { current: null };
export const setViewRef = (v: typeof tools.current) => { tools.current = v; };
const vp = () => tools.current?.vp;

/** modifie la sélection (annulable) */
export function selAct(label: string, fn: (d: NonNullable<typeof ed.doc>) => HTMLCanvasElement | null) {
  const d = ed.doc; if (!d) return;
  ed.act(label, (_tx, doc) => { S.setSel(doc, fn(doc)); });
  S.showSel(ed.doc); ed.emit();
}
/** QR code (src/qr.ts) : nouveau calque avec le QR code au milieu de l'image (lien demandé à l'utilisateur) */
async function qrLayer() {
  const d = ed.doc; if (!d) return;
  const txt = await askText(t('img.q.qr'), 'https://'); if (!txt || !txt.trim() || ed.doc !== d) return;
  const Q = window.dedcutQR; if (!Q) return;
  const r = newRaster(t('img.qrLayer'), d.w, d.h), side = Math.round(Math.min(d.w, d.h) * .4);
  if (!Q.draw(ctx2d(r.cv), txt.trim(), Math.round((d.w - side) / 2), Math.round((d.h - side) / 2), side, { light: '#ffffff', dark: '#111111' })) { toast(t('qr.tooLong')); return; }
  ed.act('img.h.newLayer', (_tx, dd) => { ed.insert(dd, r); }, 'all');
}
const num = async (msg: string, def: number) => { const v = await askText(msg, String(def)); if (v == null) return null; const n = parseFloat(v.replace(',', '.')); return isFinite(n) ? n : null; };

/** contenu sélectionné d'un calque effacé ou rempli */
function clearSel(fill: string | null) {
  const d = ed.doc, l = ed.layer, sel = S.getSel(d); if (!d || !l || !sel) return;
  if (l.type !== 'raster') { toast(t('img.t.needPixels')); return; }
  ed.act(fill ? 'img.h.fill' : 'img.h.clear', tx => {
    ed.coverDoc(l, tx); tx.touch(l.cv); const g = ctx2d(l.cv); g.save();
    if (fill) { const c = document.createElement('canvas'); c.width = l.cv.width; c.height = l.cv.height; const cg = ctx2d(c); cg.fillStyle = fill; cg.fillRect(0, 0, c.width, c.height); cg.globalCompositeOperation = 'destination-in'; cg.drawImage(sel, -l.x, -l.y); g.drawImage(c, 0, 0); }
    else { g.globalCompositeOperation = 'destination-out'; g.drawImage(sel, -l.x, -l.y); }
    g.restore();
  }, 'all');
}
/** masque du calque → sélection */
function maskToSel() { const d = ed.doc, l = ed.layer; if (!d || !l || !l.mask) return; selAct('img.h.sel', doc => { const c = S.blank(doc); ctx2d(c).drawImage(l.mask!.cv, l.mask!.x, l.mask!.y); return S.combine(doc, c); }); }
/** opacité d'un calque → sélection */
function layerToSel(l: Layer) {
  const d = ed.doc; if (!d) return;
  import('./render').then(({ renderRect }) => selAct('img.h.sel', doc => { const c = renderRect({ ...doc, bg: null, layers: [{ ...l, opacity: 1, visible: true } as Layer] }, { x: 0, y: 0, w: doc.w, h: doc.h }, 1, undefined, { bg: false }); const g = ctx2d(c); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return S.combine(doc, c); }));
}
/** sélection → tracé (calque de forme modifiable) */
function selToPathLayer() {
  const d = ed.doc, sel = S.getSel(d); if (!d || !sel) return; const paths = S.selToPath(sel); if (!paths.length) return;
  import('./doc').then(({ newShape, shapeItem }) => {
    const it = { ...shapeItem('path', d.w, d.h), paths: paths.map(sp => ({ ...sp, pts: sp.pts.map(p => ({ ...p, x: p.x - d.w / 2, y: p.y - d.h / 2 })) })) };
    const l = newShape(t('img.shape.path'), it, d.w / 2, d.h / 2, ed.fg); l.fill = null; if (l.stroke) { l.stroke.on = true; l.stroke.width = 2; }
    ed.act('img.h.path', (_tx, doc) => { ed.insert(doc, l); }, 'all');
  });
}
/** tracé du calque de forme actif → sélection */
function pathToSel() {
  const l = ed.layer, d = ed.doc; if (!d || !l || l.type !== 'shape') return;
  import('./doc').then(({ tfMatrix }) => {
    const items = l.items.filter(i => i.kind === 'path' && i.paths); if (!items.length) return;
    selAct('img.h.sel', doc => { let c = S.blank(doc); for (const it of items) c = S.combine(doc, S.pathMask(doc, it.paths!, tfMatrix(l.tf).translate(it.ox, it.oy)), 'add'); return S.combine(doc, c); });
  });
}

export const CMDS: Cmd[] = [
  /* Fichier */
  { id: 'new', menu: 'file', icon: 'newdoc', run: () => openDialog('new') },
  { id: 'open', menu: 'file', icon: 'open', run: () => pickAndOpen(false) },
  { id: 'importLayer', menu: 'file', icon: 'image', run: () => pickAndOpen(true), on: hasDoc },
  { id: 'save', menu: 'file', icon: 'save', run: () => saveDoc(false), on: hasDoc, sep: true },
  { id: 'saveAs', menu: 'file', run: () => saveDoc(true), on: hasDoc },
  { id: 'export', menu: 'file', icon: 'export', run: () => openDialog('export'), on: hasDoc },
  { id: 'kits', menu: 'file', icon: 'kit', run: () => openDialog('kits'), sep: true },
  { id: 'saveTemplate', menu: 'file', run: () => PRO.saveTemplate(), on: hasDoc },
  { id: 'library', menu: 'file', icon: 'image', run: () => openDialog('library') },
  { id: 'sendMontage', menu: 'file', icon: 'export', run: () => PRO.sendToMontage(), on: hasDoc },
  { id: 'thumbTemplates', menu: 'file', icon: 'image', run: () => openDialog('kits') },
  { id: 'thumbMontage', menu: 'file', icon: 'ai', run: () => (window as unknown as { thumbOpen?: () => void }).thumbOpen?.() },
  { id: 'assemble', menu: 'file', icon: 'grid', run: () => openDialog('collage') },
  { id: 'batch', menu: 'file', icon: 'batch', run: () => openDialog('batch') },
  { id: 'recover', menu: 'file', run: () => checkRecover(), sep: true },
  { id: 'close', menu: 'file', icon: 'close', run: () => closeDoc(ed.cur), on: hasDoc },
  /* Édition */
  { id: 'undo', menu: 'edit', icon: 'undo', run: () => ed.undo(), on: () => !!ed.ds?.hist.canUndo },
  { id: 'redo', menu: 'edit', icon: 'redo', run: () => ed.redo(), on: () => !!ed.ds?.hist.canRedo },
  { id: 'redo2', menu: '', run: () => ed.redo() },
  { id: 'copy', menu: 'edit', run: () => copyMerged(), on: hasDoc, sep: true },
  { id: 'paste', menu: 'edit', run: () => pasteImage() },
  { id: 'copyToLayer', menu: 'edit', run: () => { const d = ed.doc, l = ed.layer; if (d && l) ed.act('img.h.copyLayer', (_tx, doc) => { if (!S.selToLayer(doc, l, false, t('img.layer.copy', { name: l.name }))) toast(t('img.t.needPixelsSel')); }, 'all'); }, on: hasSel },
  { id: 'cutToLayer', menu: 'edit', run: () => { const d = ed.doc, l = ed.layer; if (d && l) ed.act('img.h.cutLayer', (tx, doc) => { if (l.type === 'raster') tx.touch(l.cv); if (!S.selToLayer(doc, l, true, l.name)) toast(t('img.t.needPixelsSel')); }, 'all'); }, on: hasSel },
  { id: 'removeObj', menu: 'edit', icon: 'ai', run: () => import('./ai').then(m => m.removeObject()), on: hasSel, sep: true },
  { id: 'fillFg', menu: 'edit', run: () => clearSel(ed.fg), on: hasSel, sep: true },
  { id: 'fillBg', menu: 'edit', run: () => clearSel(ed.bg), on: hasSel },
  { id: 'clear', menu: 'edit', run: () => clearSel(null), on: hasSel },
  { id: 'macroRec', menu: 'edit', icon: 'macro', run: () => PRO.recToggle(), check: () => PRO.rec.on, sep: true },
  { id: 'macros', menu: 'edit', run: () => openDialog('macros') },
  { id: 'prefs', menu: 'edit', icon: 'gear', run: () => openDialog('prefs'), sep: true },
  { id: 'keys', menu: 'edit', run: () => openDialog('keys') },
  { id: 'tablet', menu: 'edit', icon: 'brush', run: () => openDialog('tablet') },
  /* Image */
  { id: 'imgSize', menu: 'image', run: () => openDialog('imgsize'), on: hasDoc },
  { id: 'canvasSize', menu: 'image', run: () => openDialog('canvas'), on: hasDoc },
  { id: 'rot90', menu: 'image', icon: 'rotr', run: () => ed.rotateImage('90'), on: hasDoc, sep: true },
  { id: 'rot-90', menu: 'image', icon: 'rotl', run: () => ed.rotateImage('-90'), on: hasDoc },
  { id: 'rot180', menu: 'image', run: () => ed.rotateImage('180'), on: hasDoc },
  { id: 'flipImgH', menu: 'image', icon: 'fliph', run: () => ed.rotateImage('fh'), on: hasDoc },
  { id: 'flipImgV', menu: 'image', icon: 'flipv', run: () => ed.rotateImage('fv'), on: hasDoc },
  { id: 'autoEnhance', menu: 'image', icon: 'ai', run: () => import('./ai').then(m => m.autoEnhance()), on: hasLayer, sep: true },
  { id: 'upscale', menu: 'image', icon: 'ai', run: () => import('./ai').then(m => m.upscale(2)), on: hasDoc },
  { id: 'colorize', menu: 'image', icon: 'ai', run: () => import('./ai').then(m => m.colorize()), on: hasLayer },
  { id: 'extend', menu: 'image', icon: 'ai', run: () => { void num(t('img.q.pixels'), 100).then(n => { if (n) import('./ai').then(m => m.extendImage(Math.round(Math.abs(n)))); }); }, on: () => ed.layer?.type === 'raster' },
  { id: 'generate', menu: 'image', icon: 'ai', run: () => openDialog('gen') },
  { id: 'sky', menu: 'image', icon: 'image', run: () => PRO.replaceSky(), on: hasDoc },
  { id: 'cropSel', menu: 'image', icon: 'crop', run: () => { const r = S.getSel(ed.doc) && S.selBounds(S.getSel(ed.doc)!); if (r) ed.cropTo(r, 0, ed.crop.del); vp()?.fit(); }, on: hasSel, sep: true },
  { id: 'trim', menu: 'image', run: () => { ed.trim(); vp()?.fit(); }, on: hasDoc },
  /* Calque */
  { id: 'newLayer', menu: 'layer', icon: 'plus', run: () => ed.addLayer('raster'), on: hasDoc },
  { id: 'newGroup', menu: 'layer', icon: 'folder', run: () => ed.addLayer('group'), on: hasDoc },
  { id: 'dupLayer', menu: 'layer', icon: 'dup', run: () => ed.duplicate(), on: hasLayer },
  { id: 'qrCode', menu: 'layer', icon: 'grid', run: () => qrLayer(), on: hasDoc },
  { id: 'delLayer', menu: 'layer', icon: 'trash', run: () => { if (hasSel() && ed.layer?.type === 'raster') clearSel(null); else ed.deleteSel(); }, on: hasLayer },
  { id: 'group', menu: 'layer', icon: 'group', run: () => ed.group(), on: hasLayer, sep: true },
  { id: 'ungroup', menu: 'layer', run: () => ed.ungroup(), on: () => ed.layer?.type === 'group' },
  { id: 'layerUp', menu: 'layer', icon: 'up', run: () => ed.step(1), on: hasLayer },
  { id: 'layerDown', menu: 'layer', icon: 'down', run: () => ed.step(-1), on: hasLayer },
  { id: 'mergeDown', menu: 'layer', icon: 'merge', run: () => ed.mergeDown(), on: hasLayer, sep: true },
  { id: 'mergeSel', menu: 'layer', run: () => ed.mergeSelected(), on: () => (ed.doc?.sel.length || 0) > 1 },
  { id: 'stamp', menu: 'layer', run: () => ed.stampVisible(), on: hasDoc },
  { id: 'flatten', menu: 'layer', run: () => ed.flatten(), on: hasDoc },
  { id: 'rasterize', menu: 'layer', run: () => { const l = ed.layer; if (l) ed.rasterize(l); }, on: () => !!ed.layer && ed.layer.type !== 'raster' && ed.layer.type !== 'adjust', sep: true },
  { id: 'toSmart', menu: 'layer', icon: 'smart', run: () => { const l = ed.layer; if (l && l.type === 'raster') ed.toSmart(l); }, on: () => ed.layer?.type === 'raster' },
  { id: 'replace', menu: 'layer', run: () => replaceSmart(), on: () => ed.layer?.type === 'smart' },
  { id: 'relink', menu: 'layer', icon: 'link', run: () => PRO.relinkSmart(), on: () => ed.layer?.type === 'smart' && !!ed.layer.link },
  { id: 'vmask', menu: 'layer', icon: 'mask', run: () => PRO.vmaskFromAbove(), on: hasLayer },
  { id: 'vmaskDel', menu: 'layer', run: () => { const l = ed.layer; if (l) ed.act('img.h.vmask', () => { l.vmask = null; }, 'all'); }, on: () => !!ed.layer?.vmask },
  { id: 'removeBg', menu: 'layer', icon: 'ai', run: () => import('./ai').then(m => m.removeBackground()), on: hasLayer, sep: true },
  { id: 'addMask', menu: 'layer', icon: 'mask', run: () => { const l = ed.layer; if (l) ed.addMask(l, false, S.getSel(ed.doc) || undefined); }, on: () => !!ed.layer && !ed.layer.mask, sep: true },
  { id: 'hideMask', menu: 'layer', run: () => { const l = ed.layer; if (l) ed.addMask(l, true); }, on: () => !!ed.layer && !ed.layer.mask },
  { id: 'applyMask', menu: 'layer', run: () => { const l = ed.layer; if (l) ed.applyMask(l); }, on: () => !!ed.layer?.mask },
  { id: 'delMask', menu: 'layer', run: () => { const l = ed.layer; if (l) ed.act('img.h.maskDel', () => { l.mask = null; }, 'all'); if (ed.ds) ed.ds.maskEdit = false; }, on: () => !!ed.layer?.mask },
  { id: 'clip', menu: 'layer', icon: 'clip', run: () => { const l = ed.layer; if (l) ed.setProp(l, 'clip', !l.clip, 'img.h.clip'); }, on: hasLayer, check: () => !!ed.layer?.clip },
  { id: 'flipH', menu: 'layer', icon: 'fliph', run: () => ed.flipLayer('h'), on: hasLayer, sep: true },
  { id: 'flipV', menu: 'layer', icon: 'flipv', run: () => ed.flipLayer('v'), on: hasLayer },
  { id: 'alignL', menu: 'layer', icon: 'alignl', run: () => ed.align('l'), on: hasLayer, sep: true },
  { id: 'alignCx', menu: 'layer', icon: 'alignc', run: () => ed.align('cx'), on: hasLayer },
  { id: 'alignR', menu: 'layer', icon: 'alignr', run: () => ed.align('r'), on: hasLayer },
  { id: 'alignT', menu: 'layer', icon: 'alignt', run: () => ed.align('t'), on: hasLayer },
  { id: 'alignCy', menu: 'layer', icon: 'alignm', run: () => ed.align('cy'), on: hasLayer },
  { id: 'alignB', menu: 'layer', icon: 'alignb', run: () => ed.align('b'), on: hasLayer },
  { id: 'distH', menu: 'layer', icon: 'disth', run: () => ed.align('dh'), on: () => (ed.doc?.sel.length || 0) > 2 },
  { id: 'distV', menu: 'layer', icon: 'distv', run: () => ed.align('dv'), on: () => (ed.doc?.sel.length || 0) > 2 },
  /* Sélection */
  { id: 'subject', menu: 'select', icon: 'ai', run: () => import('./ai').then(m => m.selectSubject()), on: hasDoc },
  { id: 'selAll', menu: 'select', run: () => selAct('img.h.sel', d => S.allSel(d)), on: hasDoc },
  { id: 'deselect', menu: 'select', run: () => selAct('img.h.desel', () => null), on: hasSel },
  { id: 'reselect', menu: 'select', run: () => { const d = ed.doc; if (!d) return; const last = S.lastSel(d); if (last) selAct('img.h.sel', () => last); }, on: hasDoc },
  { id: 'invert', menu: 'select', run: () => selAct('img.h.sel', d => S.invertSel(d)), on: hasDoc },
  { id: 'layerSel', menu: 'select', run: () => { const l = ed.layer; if (l) layerToSel(l); }, on: hasLayer, sep: true },
  { id: 'maskSel', menu: 'select', run: () => maskToSel(), on: () => !!ed.layer?.mask },
  { id: 'grow', menu: 'select', run: () => { void num(t('img.q.pixels'), 4).then(n => { if (n && S.getSel(ed.doc)) selAct('img.h.sel', d => S.growSel(S.getSel(d)!, Math.abs(n))); }); }, on: hasSel, sep: true },
  { id: 'shrink', menu: 'select', run: () => { void num(t('img.q.pixels'), 4).then(n => { if (n && S.getSel(ed.doc)) selAct('img.h.sel', d => S.growSel(S.getSel(d)!, -Math.abs(n))); }); }, on: hasSel },
  { id: 'feather', menu: 'select', run: () => { void num(t('img.q.pixels'), 8).then(n => { if (n && S.getSel(ed.doc)) selAct('img.h.sel', d => S.featherSel(S.getSel(d)!, Math.abs(n))); }); }, on: hasSel },
  { id: 'smoothSel', menu: 'select', run: () => { void num(t('img.q.pixels'), 4).then(n => { if (n && S.getSel(ed.doc)) selAct('img.h.sel', d => S.smoothSel(S.getSel(d)!, Math.abs(n))); }); }, on: hasSel },
  { id: 'refine', menu: 'select', run: () => openDialog('refine' as never), on: hasSel },
  { id: 'colorRange', menu: 'select', run: () => openDialog('range' as never), on: hasDoc },
  { id: 'saveSel', menu: 'select', run: () => { const d = ed.doc, sel = S.getSel(d); if (!d || !sel) return; void askText(t('img.q.selName'), t('img.selN', { n: S.savedSels(d).length + 1 })).then(n => { if (n && ed.doc === d) ed.act('img.h.selSave', (_tx, doc) => { (doc as typeof doc & { selSaved: { name: string; cv: HTMLCanvasElement }[] }).selSaved = [...S.savedSels(doc), { name: n.slice(0, 40), cv: sel }]; }); }); }, on: hasSel, sep: true },
  { id: 'loadSel', menu: 'select', run: () => openDialog('loadsel' as never), on: () => !!ed.doc && S.savedSels(ed.doc).length > 0 },
  { id: 'selToMask', menu: 'select', run: () => { const l = ed.layer, sel = S.getSel(ed.doc); if (l && sel) { if (l.mask) ed.act('img.h.mask', () => { l.mask = { cv: sel, x: 0, y: 0, on: true }; }, 'all'); else ed.addMask(l, false, sel); } }, on: () => hasSel() && hasLayer() },
  { id: 'selToPath', menu: 'select', run: () => selToPathLayer(), on: hasSel },
  { id: 'pathToSel', menu: 'select', run: () => pathToSel(), on: () => ed.layer?.type === 'shape' },
  /* Affichage */
  { id: 'zoomIn', menu: 'view', run: () => { const v = vp(); if (v && ed.ds) v.zoomAt(ed.ds.view.zoom * 1.25); }, on: hasDoc },
  { id: 'zoomOut', menu: 'view', run: () => { const v = vp(); if (v && ed.ds) v.zoomAt(ed.ds.view.zoom / 1.25); }, on: hasDoc },
  { id: 'fit', menu: 'view', icon: 'fit', run: () => vp()?.fit(), on: hasDoc },
  { id: 'actual', menu: 'view', run: () => vp()?.actual(), on: hasDoc },
  { id: 'rotViewL', menu: 'view', icon: 'rotl', run: () => { if (ed.ds) { ed.ds.view.rot = (ed.ds.view.rot - 15) % 360; ed.emit(); } }, on: hasDoc, sep: true },
  { id: 'rotViewR', menu: 'view', icon: 'rotr', run: () => { if (ed.ds) { ed.ds.view.rot = (ed.ds.view.rot + 15) % 360; ed.emit(); } }, on: hasDoc },
  { id: 'rotView0', menu: 'view', run: () => { if (ed.ds) { ed.ds.view.rot = 0; ed.emit(); } }, on: () => !!ed.ds?.view.rot },
  { id: 'rulers', menu: 'view', icon: 'ruler', run: () => { ed.settings.rulers = !ed.settings.rulers; ed.saveSettings(); ed.emit(); }, check: () => ed.settings.rulers, sep: true },
  { id: 'grid', menu: 'view', icon: 'grid', run: () => { ed.settings.grid = !ed.settings.grid; ed.saveSettings(); ed.emit(); }, check: () => ed.settings.grid },
  { id: 'guides', menu: 'view', run: () => { ed.settings.guides = !ed.settings.guides; ed.saveSettings(); ed.emit(); }, check: () => ed.settings.guides },
  { id: 'snap', menu: 'view', icon: 'magnet', run: () => { ed.settings.snap = !ed.settings.snap; ed.saveSettings(); ed.emit(); }, check: () => ed.settings.snap },
  { id: 'addGuides', menu: 'view', run: () => { const d = ed.doc; if (d) ed.act('img.h.guide', (_tx, doc) => { doc.guides.push({ o: 'v', p: Math.round(doc.w / 2) }, { o: 'h', p: Math.round(doc.h / 2) }); }); }, on: hasDoc },
  { id: 'clearGuides', menu: 'view', run: () => { if (ed.doc?.guides.length) ed.act('img.h.guide', (_tx, d) => { d.guides = []; }); }, on: () => !!ed.doc?.guides.length },
  { id: 'panels', menu: 'view', icon: 'layers', run: () => { ui.full = false; const p = ed.settings.panels, any = Object.values(p).some(Boolean); for (const k of Object.keys(p)) p[k] = !any; if (!any) Object.assign(p, { color: true, layers: true, props: true, history: true }); ed.saveSettings(); ed.emit(); }, sep: true },
  { id: 'full', menu: 'view', icon: 'full', run: () => { ui.full = !ui.full; ed.emit(); }, check: () => ui.full },
  { id: 'panelsLeft', menu: 'view', icon: 'sides', run: () => { ed.settings.side = ed.settings.side === 'left' ? 'right' : 'left'; ed.saveSettings(); ed.emit(); }, check: () => ed.settings.side === 'left' },
  { id: 'layout', menu: 'view', icon: 'layout', run: () => openDialog('layout') },
  { id: 'palette', menu: 'view', icon: 'search', run: () => { ui.palette = true; ed.emit(); } },
  { id: 'compare', menu: 'view', icon: 'compare', run: () => PRO.toggleCompare(), check: () => ui.compare, on: hasDoc },
  { id: 'extensions', menu: 'filter', icon: 'ext', run: () => openDialog('ext') },
  /* couleurs et outils (raccourcis) */
  { id: 'swap', menu: '', run: () => { [ed.fg, ed.bg] = [ed.bg, ed.fg]; ed.saveColors(); ed.emit(); } },
  { id: 'defColors', menu: '', run: () => { ed.fg = '#000000'; ed.bg = '#ffffff'; ed.saveColors(); ed.emit(); } },
  { id: 'sizeUp', menu: '', run: () => sizeBy(1.2) }, { id: 'sizeDown', menu: '', run: () => sizeBy(1 / 1.2) },
  { id: 'free', menu: '', run: () => setTool('move') }, { id: 'help', menu: '', run: () => openDialog('keys') }
];
function sizeBy(k: number) { const b = ed.tool === 'pencil' ? ed.pencil : ed.tool === 'eraser' ? ed.eraser : ed.tool === 'smudge' ? ed.smudge : ['clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'liquify', 'selbrush'].includes(ed.tool) ? ed.retouch : ed.brush; b.size = Math.max(1, Math.min(2000, Math.round(b.size * k))); ed.emit(); }
export function setTool(id: ToolId) { ed.tool = id; ed.emit(); }
export const TOOL_IDS: ToolId[] = ['move', 'select', 'lasso', 'wand', 'selbrush', 'crop', 'brush', 'pencil', 'eraser', 'smudge', 'fill', 'gradient', 'picker', 'clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'redeye', 'liquify', 'text', 'shape', 'pen', 'direct', 'hand', 'zoom'];
export const cmd = (id: string) => CMDS.find(c => c.id === id);
export function runCmd(id: string) { const c = cmd(id); if (c && (!c.on || c.on())) { PRO.recordCmd(id); c.run(); } }
/** touche → texte « ctrl+shift+s » */
export function keyName(e: KeyboardEvent): string {
  let k = e.key.toLowerCase(); if (k === ' ') k = 'space'; if (k === '+') k = '='; if (k === 'add') k = '=';
  return (e.ctrlKey || e.metaKey ? 'ctrl+' : '') + (e.shiftKey && k.length > 1 || e.shiftKey && /[a-z0-9=\-[\]]/.test(k) ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + (k === '?' ? 'shift+?' : k);
}
export { findLayer, newRaster, selLayers };

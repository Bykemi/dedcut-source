// DedCut Image — l'éditeur : documents ouverts, outils actifs, et toutes les opérations (annulables) sur les calques et l'image.
import {
  Doc, Layer, RasterLayer, SmartLayer, GroupLayer, TextLayer, ShapeLayer, Rect, Guide, newDoc, newRaster, newGroup, newAdjust, newText, newShape, shapeItem,
  findLayer, walk, curLayer, selLayers, mkCanvas, ctx2d, cloneCanvas, layerBounds, tfMatrix, localSize, defStyle, newId, rectUnion, boundsOf, layerCorners, TextStyle
} from './doc';
import { History, Tx } from './history';
import { Composite, renderDoc, renderRect, drawContent } from './render';
import { BrushOpts, defBrush } from './brush';
import { GRAD_PRESETS } from './paint';
import type { Gradient } from './doc';
import { resample, Resample } from './pixels';
import { defFilter } from './filters';
import { autoSave, autoDrop } from './io';

export type ToolId = 'move' | 'crop' | 'brush' | 'pencil' | 'eraser' | 'smudge' | 'fill' | 'gradient' | 'picker' | 'text' | 'shape' | 'pen' | 'direct' | 'hand' | 'zoom'
  | 'select' | 'lasso' | 'wand' | 'selbrush' | 'clone' | 'heal' | 'dodge' | 'burn' | 'blurb' | 'sharpen' | 'redeye' | 'liquify';
export interface View { zoom: number; ox: number; oy: number; rot: number }
export interface DocState { doc: Doc; hist: History; comp: Composite; view: View; key: string; maskEdit: boolean; autoAt: number; savedHist: number }
export interface ShapeOpts { kind: 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'custom'; r: number; sides: number; inner: number; fill: boolean; stroke: boolean; strokeW: number; combine: 'new' | 'add' | 'sub' | 'int' | 'xor'; custom: string; arrow: boolean }
/** stylet de tablette graphique : courbe de pression (exposant), taille minimale, bouton latéral, bout gomme, inclinaison */
export interface PenSettings { curve: number; min: number; barrel: 'picker' | 'pan' | 'menu'; eraser: boolean; tilt: boolean }
export const defPen = (): PenSettings => ({ curve: 1, min: .05, barrel: 'picker', eraser: true, tilt: true });
export interface Settings { grid: boolean; gridSize: number; rulers: boolean; guides: boolean; snap: boolean; panels: Record<string, boolean>; order: string[]; right: number; side: 'right' | 'left'; out: Record<string, boolean>; outPos: Record<string, { x: number; y: number; w: number; h: number }>; keys: Record<string, string>; lowPC: boolean; autoMin: number; pen: PenSettings }
const SET_KEY = 'dedcut-image-settings';
export const DEF_KEYS: Record<string, string> = {
  move: 'v', crop: 'c', brush: 'b', pencil: 'n', eraser: 'e', smudge: 'r', fill: 'g', gradient: 'shift+g', picker: 'i', text: 't', shape: 'u', pen: 'p', direct: 'a', hand: 'h', zoom: 'z',
  undo: 'ctrl+z', redo: 'ctrl+shift+z', redo2: 'ctrl+y', new: 'ctrl+n', open: 'ctrl+o', save: 'ctrl+s', saveAs: 'ctrl+shift+s', export: 'ctrl+shift+e',
  dupLayer: 'ctrl+j', group: 'ctrl+g', ungroup: 'ctrl+shift+g', mergeDown: 'ctrl+e', newLayer: 'ctrl+shift+n', delLayer: 'delete',
  fit: 'ctrl+0', actual: 'ctrl+1', zoomIn: 'ctrl+=', zoomOut: 'ctrl+-', grid: "ctrl+'", rulers: 'ctrl+r', panels: 'tab', full: 'f', swap: 'x', defColors: 'd',
  sizeUp: ']', sizeDown: '[', flipH: 'ctrl+shift+h', free: 'ctrl+t', help: 'shift+?', palette: 'ctrl+k', compare: 'y', selAll: 'ctrl+a', deselect: 'ctrl+d', invert: 'ctrl+shift+i', macroRec: 'ctrl+alt+r'
};

const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export class Editor {
  docs: DocState[] = []; cur = -1; tool: ToolId = 'move'; v = 0;
  // noir sur blanc au départ : le premier trait se voit sur une image blanche
  fg = '#000000'; bg = '#ffffff'; recent: string[] = []; favs: string[] = ['#ffffff', '#000000', '#a78bfa', '#22d3ee', '#f43f5e', '#fbbf24', '#22c55e', '#f97316'];
  brush: BrushOpts = defBrush(); pencil: BrushOpts = { ...defBrush(), size: 4, hard: 1, smooth: 0, spacing: .1 }; eraser: BrushOpts = { ...defBrush(), size: 40, hard: .6 };
  smudge: BrushOpts = { ...defBrush(), size: 40, hard: .3, strength: .6, spacing: .08 };
  fill = { tol: 32, contiguous: true, all: false, pattern: '', soft: true };
  grad: { g: Gradient; reverse: boolean; opacity: number } = { g: structuredClone(GRAD_PRESETS[0]), reverse: false, opacity: 1 };
  text: TextStyle = defStyle();
  shape: ShapeOpts = { kind: 'rect', r: 0, sides: 6, inner: .5, fill: true, stroke: false, strokeW: 6, combine: 'new', custom: 'heart', arrow: true };
  crop = { ratio: 'free', del: false, angle: 0 };
  move = { auto: true, lock: false, resample: 'smooth' as Resample, handles: true };
  picker = { size: 1, all: true };
  /** outils de retouche (lot 2) */
  retouch = { size: 60, hard: .5, strength: .5, range: 'mid' as 'shadow' | 'mid' | 'high', aligned: true, sample: 'all' as 'layer' | 'all', liq: 'push' as 'push' | 'grow' | 'shrink' | 'twirl' | 'restore' };
  /** forme de la sélection en cours (rectangle, ellipse ; lasso libre ou polygonal) */
  selShape: 'rect' | 'ellipse' = 'rect'; lassoKind: 'free' | 'poly' = 'free';
  afterRestore: (() => void) | null = null;
  settings: Settings;
  listeners = new Set<() => void>(); toastFn: ((t: string, n?: Record<string, string | number>) => void) | null = null;
  constructor() {
    let s: Partial<Settings> = {}; try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch { /* réglages abîmés : valeurs d'origine */ }
    this.settings = {
      grid: false, gridSize: 50, rulers: true, guides: true, snap: true, right: 290, side: 'right', out: {}, outPos: {}, lowPC: false, autoMin: 2,
      panels: { color: true, layers: true, props: true, history: true, info: false, brushes: false }, order: ['color', 'brushes', 'props', 'layers', 'history', 'info'], ...s,
      keys: { ...DEF_KEYS, ...(s.keys || {}) }, pen: { ...defPen(), ...(s.pen || {}) }
    };
    try { const c = JSON.parse(localStorage.getItem('dedcut-image-colors') || 'null'); if (c) { this.favs = c.favs || this.favs; this.recent = c.recent || []; this.fg = c.fg || this.fg; this.bg = c.bg || this.bg; } } catch { /* rien */ }
  }
  saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch { /* stockage plein */ } }
  saveColors() { try { localStorage.setItem('dedcut-image-colors', JSON.stringify({ favs: this.favs, recent: this.recent.slice(0, 16), fg: this.fg, bg: this.bg })); } catch { /* rien */ } }
  on(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  emit() { this.v++; for (const f of this.listeners) f(); }
  toast(t: string, n?: Record<string, string | number>) { this.toastFn?.(t, n); }
  get ds(): DocState | null { return this.docs[this.cur] || null; }
  get doc(): Doc | null { return this.ds?.doc || null; }
  get layer(): Layer | null { return this.doc ? curLayer(this.doc) : null; }

  /* ---------- documents ---------- */
  add(doc: Doc, vw = 1200, vh = 800): DocState {
    const ds: DocState = { doc, hist: new History(doc, this.settings.lowPC ? 40 : 100, this.settings.lowPC ? 250e6 : 700e6), comp: new Composite(doc), view: { zoom: 1, ox: 0, oy: 0, rot: 0 }, key: 'd' + Date.now().toString(36) + doc.id, maskEdit: false, autoAt: 0, savedHist: 0 };
    ds.hist.onChange = () => { doc.dirty = ds.hist.i !== ds.savedHist; this.emit(); };
    if (!doc.sel.length && doc.layers.length) doc.sel = [doc.layers[doc.layers.length - 1].id];
    this.docs.push(ds); this.cur = this.docs.length - 1; this.fit(vw, vh); this.emit(); return ds;
  }
  newDocument(name: string, w: number, h: number, bg: string | null, dpi = 72, space: 'srgb' | 'display-p3' = 'srgb') {
    const d = newDoc(name, w, h, null, dpi); d.space = space;
    if (bg) { const r = newRaster(this.tr('img.layer.bg'), w, h); const g = ctx2d(r.cv); g.fillStyle = bg; g.fillRect(0, 0, w, h); r.name = this.tr('img.layer.bg'); d.layers.push(r); }
    else d.layers.push(newRaster(this.tr('img.layer.n', { n: 1 }), w, h));
    return this.add(d);
  }
  tr: (k: string, n?: Record<string, string | number>) => string = k => k;
  close(i: number) {
    const ds = this.docs[i]; if (!ds) return; autoDrop(ds.key);
    this.docs.splice(i, 1); if (this.cur >= this.docs.length) this.cur = this.docs.length - 1; this.emit();
  }
  fit(vw: number, vh: number) {
    const ds = this.ds; if (!ds) return; const d = ds.doc, z = Math.min(1, (vw - 60) / d.w, (vh - 60) / d.h);
    ds.view = { zoom: z > 0 ? z : 1, ox: (vw - d.w * z) / 2, oy: (vh - d.h * z) / 2, rot: 0 };
  }
  markSaved() { const ds = this.ds; if (!ds) return; ds.savedHist = ds.hist.i; ds.doc.dirty = false; ds.doc.savedAt = Date.now(); autoDrop(ds.key); this.emit(); }
  /** sauvegarde automatique (toutes les N minutes si le document a changé) */
  async autoTick() {
    const now = Date.now();
    for (const ds of this.docs) if (ds.doc.dirty && now - ds.autoAt > this.settings.autoMin * 60000) { ds.autoAt = now; try { await autoSave(ds.doc, ds.key); } catch { /* disque plein : on réessaiera */ } }
  }

  /* ---------- historique ---------- */
  /** fait une action annulable ; fn renvoie false pour l'annuler (rien n'est gardé) */
  act(label: string, fn: (tx: Tx, doc: Doc) => boolean | void, rect?: Rect | 'all'): boolean {
    const ds = this.ds; if (!ds) return false;
    const tx = ds.hist.begin(label), ok = fn(tx, ds.doc) !== false;
    if (!ok) return false;
    const changed = tx.end(); if (rect === 'all' || !rect) ds.comp.all(); else ds.comp.add(rect);
    if (changed) ds.doc.dirty = true; this.emit(); return changed;
  }
  /** action faite à la souris (glisser, pinceau…) : une seule étape d'historique du début à la fin */
  private liveTx: Tx | null = null;
  begin(label: string): Tx | null { const ds = this.ds; if (!ds) return null; if (this.liveTx) this.end(); this.liveTx = ds.hist.begin(label); return this.liveTx; }
  get busy() { return !!this.liveTx; }
  end(): boolean {
    const tx = this.liveTx, ds = this.ds; this.liveTx = null; if (!tx || !ds) return false;
    const changed = tx.end(); ds.comp.all(); if (changed) ds.doc.dirty = true; this.emit(); return changed;
  }
  /** Échap pendant un glisser : on remet tout comme avant */
  cancel() { const ds = this.ds; if (!this.end() || !ds) return; ds.hist.undo(); ds.hist.items.splice(ds.hist.i); ds.comp.all(); this.emit(); }
  undo() { const ds = this.ds; if (!ds || !ds.hist.canUndo || this.liveTx) return; const e = ds.hist.undo(); ds.comp.all(); this.afterRestore?.(); if (e) this.toast('img.undone', { what: this.tr(e.label) }); this.emit(); }
  redo() { const ds = this.ds; if (!ds || !ds.hist.canRedo || this.liveTx) return; ds.hist.redo(); ds.comp.all(); this.afterRestore?.(); this.emit(); }

  /* ---------- calques ---------- */
  private parentList(doc: Doc, l: Layer): Layer[] { const f = findLayer(doc, l.id); return f ? f.list : doc.layers; }
  select(id: number, add = false, range = false) {
    const d = this.doc; if (!d) return;
    if (range && d.sel.length) {
      const all = [...walk(d.layers)].map(x => x.l.id), a = all.indexOf(d.sel[d.sel.length - 1]), b = all.indexOf(id);
      d.sel = all.slice(Math.min(a, b), Math.max(a, b) + 1);
    } else if (add) d.sel = d.sel.includes(id) ? d.sel.filter(x => x !== id) : [...d.sel, id];
    else d.sel = [id];
    if (this.ds) this.ds.maskEdit = false; this.emit();
  }
  /** insère un calque au-dessus du calque actif (dans le même groupe) */
  insert(doc: Doc, l: Layer, above: Layer | null = curLayer(doc)) {
    if (above && above.type === 'group' && above.open) { above.children.push(l); }
    else if (above) { const list = this.parentList(doc, above); list.splice(list.indexOf(above) + 1, 0, l); }
    else doc.layers.push(l);
    doc.sel = [l.id];
  }
  addLayer(kind: 'raster' | 'group' | 'adjust', adj?: string) {
    this.act('img.h.newLayer', (_tx, d) => {
      const n = [...walk(d.layers)].length + 1;
      const l = kind === 'raster' ? newRaster(this.tr('img.layer.n', { n }), d.w, d.h) : kind === 'group' ? newGroup(this.tr('img.layer.group', { n }), []) : newAdjust(this.tr('img.fl.' + adj), [defFilter(adj || 'brightness')]);
      this.insert(d, l);
    }, kind === 'adjust' ? 'all' : undefined);
  }
  deleteSel() {
    const d = this.doc; if (!d || !d.sel.length) return;
    this.act('img.h.delete', (_tx, doc) => {
      for (const id of [...doc.sel]) { const f = findLayer(doc, id); if (f) f.list.splice(f.list.indexOf(f.l), 1); }
      const all = [...walk(doc.layers)]; doc.sel = all.length ? [all[all.length - 1].l.id] : [];
    }, 'all');
  }
  duplicate() {
    this.act('img.h.dup', (_tx, doc) => {
      const out: number[] = [];
      for (const l of selLayers(doc)) { const c = this.cloneLayer(l, true); const list = this.parentList(doc, l); list.splice(list.indexOf(l) + 1, 0, c); out.push(c.id); }
      doc.sel = out;
    }, 'all');
  }
  cloneLayer(l: Layer, rename: boolean): Layer {
    const c: Layer = structuredCloneLayer(l);
    if (rename) c.name = this.tr('img.layer.copy', { name: l.name }); return c;
  }
  rename(l: Layer, name: string) { const n = name.trim().slice(0, 80); if (!n || n === l.name) return; this.act('img.h.rename', () => { l.name = n; }); }
  setProp<K extends keyof Layer>(l: Layer, k: K, v: Layer[K], label = 'img.h.prop') {
    if (l[k] === v) return; const ds = this.ds; if (!ds) return;
    this.act(label, () => { (l as Layer)[k] = v; }, 'all');
  }
  /** réordonne : déplace le calque à côté d'un autre (avant / après) ou dans un groupe */
  moveLayer(id: number, targetId: number, where: 'above' | 'below' | 'into') {
    this.act('img.h.order', (_tx, d) => {
      const f = findLayer(d, id), t = findLayer(d, targetId); if (!f || !t || id === targetId) return false;
      if (f.l.type === 'group' && [...walk([f.l])].some(x => x.l.id === targetId)) return false;
      f.list.splice(f.list.indexOf(f.l), 1);
      if (where === 'into' && t.l.type === 'group') { t.l.children.push(f.l); t.l.open = true; }
      else { const list = t.list, i = list.indexOf(t.l); list.splice(where === 'above' ? i + 1 : i, 0, f.l); }
    }, 'all');
  }
  step(dir: 1 | -1) {
    const l = this.layer, d = this.doc; if (!l || !d) return; const list = this.parentList(d, l), i = list.indexOf(l), j = i + dir;
    if (j < 0 || j >= list.length) return;
    this.act('img.h.order', () => { list.splice(i, 1); list.splice(j, 0, l); }, 'all');
  }
  group() {
    const d = this.doc; if (!d || !d.sel.length) return;
    this.act('img.h.group', (_tx, doc) => {
      const ls = selLayers(doc); const first = findLayer(doc, ls[0].id)!; const list = first.list, at = list.indexOf(first.l);
      for (const l of ls) { const f = findLayer(doc, l.id)!; f.list.splice(f.list.indexOf(l), 1); }
      const g = newGroup(this.tr('img.layer.group', { n: [...walk(doc.layers)].filter(x => x.l.type === 'group').length + 1 }), ls);
      list.splice(Math.min(at, list.length), 0, g); doc.sel = [g.id];
    }, 'all');
  }
  ungroup() {
    const l = this.layer, d = this.doc; if (!d || !l || l.type !== 'group') return;
    this.act('img.h.ungroup', (_tx, doc) => { const f = findLayer(doc, l.id)!; const i = f.list.indexOf(l); f.list.splice(i, 1, ...l.children); doc.sel = l.children.map(c => c.id); }, 'all');
  }
  /** fusionne le calque actif avec celui du dessous (résultat : calque de pixels, rendu exactement comme avant) */
  mergeDown() {
    const d = this.doc, l = this.layer; if (!d || !l) return;
    const list = this.parentList(d, l), i = list.indexOf(l); if (i <= 0) { this.toast('img.t.noBelow'); return; }
    this.mergeLayers([list[i - 1], l], 'img.h.merge');
  }
  mergeSelected() { const d = this.doc; if (!d || d.sel.length < 2) return; this.mergeLayers(selLayers(d), 'img.h.merge'); }
  mergeLayers(ls: Layer[], label: string) {
    this.act(label, (_tx, doc) => {
      const f = findLayer(doc, ls[0].id)!, list = f.list;
      const order = [...walk(doc.layers)].map(x => x.l).filter(l => ls.includes(l));
      const tmpDoc: Doc = { ...doc, bg: null, layers: order.map(l => ({ ...l, clip: false }) as Layer) };
      const r = newRaster(order[order.length - 1].name, doc.w, doc.h); ctx2d(r.cv).drawImage(renderRect(tmpDoc, { x: 0, y: 0, w: doc.w, h: doc.h }, 1, undefined, { bg: false }), 0, 0);
      const at = list.indexOf(order[0]);
      for (const l of order) { const x = findLayer(doc, l.id); if (x) x.list.splice(x.list.indexOf(l), 1); }
      list.splice(Math.max(0, Math.min(at, list.length)), 0, r); doc.sel = [r.id];
    }, 'all');
  }
  /** aplatir une copie : un nouveau calque avec l'image visible, les calques restent intacts */
  stampVisible() {
    this.act('img.h.stamp', (_tx, d) => {
      const r = newRaster(this.tr('img.layer.stamp'), d.w, d.h); ctx2d(r.cv).drawImage(renderRect(d, { x: 0, y: 0, w: d.w, h: d.h }, 1, undefined, { bg: true }), 0, 0);
      d.layers.push(r); d.sel = [r.id];
    }, 'all');
  }
  flatten() {
    this.act('img.h.flatten', (_tx, d) => { const r = newRaster(this.tr('img.layer.bg'), d.w, d.h); ctx2d(r.cv).drawImage(renderDoc(d, 1, true), 0, 0); d.layers = [r]; d.sel = [r.id]; d.bg = null; }, 'all');
  }
  /** convertit un calque (texte, forme, intelligent, groupe) en pixels */
  rasterize(l: Layer, quiet = false): RasterLayer | null {
    const d = this.doc; if (!d || l.type === 'raster' || l.type === 'adjust') return l.type === 'raster' ? l : null;
    let out: RasterLayer | null = null;
    this.act('img.h.rasterize', (_tx, doc) => {
      const r = newRaster(l.name, doc.w, doc.h);
      const one = { ...l, opacity: 1, blend: 'source-over', mask: null, vmask: null, fx: [], clip: false, visible: true } as Layer;
      ctx2d(r.cv).drawImage(renderRect({ ...doc, bg: null, layers: [one] }, { x: 0, y: 0, w: doc.w, h: doc.h }, 1, undefined, { bg: false }), 0, 0);
      Object.assign(r, { opacity: l.opacity, blend: l.blend, visible: l.visible, mask: l.mask, vmask: l.vmask, fx: l.fx, clip: l.clip, tag: l.tag, id: newId() });
      const f = findLayer(doc, l.id)!; f.list.splice(f.list.indexOf(l), 1, r); doc.sel = [r.id]; out = r;
    }, 'all');
    if (out && !quiet) this.toast('img.t.rasterized');
    return out;
  }
  /** calque de pixels → calque intelligent (transformations sans perte) */
  toSmart(l: RasterLayer): SmartLayer | null {
    let out: SmartLayer | null = null;
    this.act('img.h.smart', (_tx, doc) => {
      const b = trimBounds(l.cv); if (!b) return false;
      const src = mkCanvas(b.w, b.h); ctx2d(src).drawImage(l.cv, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      const s: SmartLayer = { ...l, type: 'smart', src, blob: null, mime: 'image/png', srcName: l.name, link: null, sw: b.w, sh: b.h, tf: { x: l.x + b.x + b.w / 2, y: l.y + b.y + b.h / 2, sx: 1, sy: 1, rot: 0, skx: 0 }, quad: null, filters: [] } as unknown as SmartLayer;
      delete (s as unknown as Record<string, unknown>).cv; delete (s as unknown as Record<string, unknown>).x; delete (s as unknown as Record<string, unknown>).y;
      const f = findLayer(doc, l.id)!; f.list.splice(f.list.indexOf(l), 1, s); out = s;
    }, 'all');
    return out;
  }

  /* ---------- masques de calque ---------- */
  addMask(l: Layer, hide = false, from?: HTMLCanvasElement) {
    const d = this.doc; if (!d || l.type === 'adjust' && false) return;
    this.act('img.h.mask', () => {
      const cv = mkCanvas(d.w, d.h), g = ctx2d(cv);
      if (from) g.drawImage(from, 0, 0); else if (!hide) { g.fillStyle = '#fff'; g.fillRect(0, 0, d.w, d.h); }
      l.mask = { cv, x: 0, y: 0, on: true };
    }, 'all');
    if (this.ds) this.ds.maskEdit = true; this.emit();
  }
  applyMask(l: Layer) {
    if (!l.mask) return; const m = l.mask;
    if (l.type !== 'raster') { const r = this.rasterize(l, true); if (r) this.applyMask(r); return; }
    this.act('img.h.maskApply', tx => { tx.touch(l.cv); const g = ctx2d(l.cv); g.globalCompositeOperation = m.inv ? 'destination-out' : 'destination-in'; g.drawImage(m.cv, m.x - l.x, m.y - l.y); g.globalCompositeOperation = 'source-over'; l.mask = null; }, 'all');
  }

  /* ---------- déplacer / transformer ---------- */
  /** déplace des calques (pixels, transformations, masques, groupes) */
  translate(ls: Layer[], dx: number, dy: number) {
    const mv = (l: Layer) => {
      if (l.type === 'raster') { l.x += dx; l.y += dy; }
      else if (l.type === 'smart') { l.tf.x += dx; l.tf.y += dy; if (l.quad) l.quad = l.quad.map(p => [p[0] + dx, p[1] + dy]); }
      else if (l.type === 'text' || l.type === 'shape') { l.tf.x += dx; l.tf.y += dy; }
      else if (l.type === 'group') l.children.forEach(mv);
      if (l.mask) { l.mask.x += dx; l.mask.y += dy; }
      if (l.vmask) for (const sp of l.vmask) for (const p of sp.pts) { p.x += dx; p.y += dy; }
    };
    ls.forEach(mv);
  }
  /** retourne ou tourne d'un quart de tour le calque actif */
  flipLayer(axis: 'h' | 'v') {
    const ls = this.doc ? selLayers(this.doc) : []; if (!ls.length) return;
    this.act('img.h.flip', () => {
      for (const l of ls) {
        if (l.type === 'raster') { const c = mkCanvas(l.cv.width, l.cv.height), g = ctx2d(c); g.translate(axis === 'h' ? c.width : 0, axis === 'v' ? c.height : 0); g.scale(axis === 'h' ? -1 : 1, axis === 'v' ? -1 : 1); g.drawImage(l.cv, 0, 0); l.cv = c; }
        else if (l.type === 'smart' || l.type === 'text' || l.type === 'shape') { if (axis === 'h') l.tf.sx = -l.tf.sx; else l.tf.sy = -l.tf.sy; if (l.type === 'smart' && l.quad) l.quad = axis === 'h' ? [l.quad[1], l.quad[0], l.quad[3], l.quad[2]] : [l.quad[3], l.quad[2], l.quad[1], l.quad[0]]; }
      }
    }, 'all');
  }
  /** tourne / retourne toute l'image (calques compris) */
  rotateImage(kind: '90' | '-90' | '180' | 'fh' | 'fv') {
    this.act('img.h.rotImage', (_tx, d) => {
      const W = d.w, H = d.h, swap = kind === '90' || kind === '-90';
      const map = (x: number, y: number): [number, number] => kind === '90' ? [H - y, x] : kind === '-90' ? [y, W - x] : kind === '180' ? [W - x, H - y] : kind === 'fh' ? [W - x, y] : [x, H - y];
      const rotCanvas = (c: HTMLCanvasElement, x: number, y: number) => {
        const n = mkCanvas(swap ? c.height : c.width, swap ? c.width : c.height), g = ctx2d(n);
        if (kind === '90') { g.translate(n.width, 0); g.rotate(Math.PI / 2); } else if (kind === '-90') { g.translate(0, n.height); g.rotate(-Math.PI / 2); }
        else if (kind === '180') { g.translate(n.width, n.height); g.rotate(Math.PI); } else if (kind === 'fh') { g.translate(n.width, 0); g.scale(-1, 1); } else { g.translate(0, n.height); g.scale(1, -1); }
        g.drawImage(c, 0, 0);
        const corners = [map(x, y), map(x + c.width, y + c.height)]; return { cv: n, x: Math.min(corners[0][0], corners[1][0]), y: Math.min(corners[0][1], corners[1][1]) };
      };
      const ang = kind === '90' ? 90 : kind === '-90' ? -90 : kind === '180' ? 180 : 0;
      const fix = (l: Layer) => {
        if (l.type === 'raster') { const r = rotCanvas(l.cv, l.x, l.y); l.cv = r.cv; l.x = r.x; l.y = r.y; }
        else if (l.type === 'smart' || l.type === 'text' || l.type === 'shape') {
          const [x, y] = map(l.tf.x, l.tf.y); l.tf.x = x; l.tf.y = y;
          if (ang) l.tf.rot += ang; else if (kind === 'fh') { l.tf.sx = -l.tf.sx; l.tf.rot = -l.tf.rot; } else { l.tf.sy = -l.tf.sy; l.tf.rot = -l.tf.rot; }
          if (l.type === 'smart' && l.quad) l.quad = l.quad.map(p => map(p[0], p[1]));
        } else if (l.type === 'group') l.children.forEach(fix);
        if (l.mask) { const r = rotCanvas(l.mask.cv, l.mask.x, l.mask.y); l.mask = { ...l.mask, cv: r.cv, x: r.x, y: r.y }; }
      };
      d.layers.forEach(fix); if (swap) { d.w = H; d.h = W; }
      d.guides = d.guides.map(g => swap ? { o: g.o === 'h' ? 'v' : 'h', p: g.o === 'h' ? (kind === '90' ? H - g.p : g.p) : (kind === '-90' ? W - g.p : g.p) } as Guide : g);
    }, 'all');
  }
  /** taille de l'image : tout est redimensionné (méthode de rééchantillonnage au choix) */
  resizeImage(w: number, h: number, mode: Resample, dpi?: number) {
    w = Math.round(w); h = Math.round(h); const d = this.doc; if (!d || w < 1 || h < 1) return;
    this.act('img.h.resize', (_tx, doc) => {
      const kx = w / doc.w, ky = h / doc.h;
      const fix = (l: Layer) => {
        if (l.type === 'raster') { const nw = Math.max(1, Math.round(l.cv.width * kx)), nh = Math.max(1, Math.round(l.cv.height * ky)); l.cv = resample(l.cv, nw, nh, mode); l.x = Math.round(l.x * kx); l.y = Math.round(l.y * ky); }
        else if (l.type === 'smart' || l.type === 'text' || l.type === 'shape') {
          l.tf.x *= kx; l.tf.y *= ky; l.tf.sx *= kx; l.tf.sy *= ky;
          if (l.type === 'smart' && l.quad) l.quad = l.quad.map(p => [p[0] * kx, p[1] * ky]);
        } else if (l.type === 'group') l.children.forEach(fix);
        if (l.mask) l.mask = { ...l.mask, cv: resample(l.mask.cv, l.mask.cv.width * kx, l.mask.cv.height * ky, mode === 'nearest' ? 'nearest' : 'smooth'), x: l.mask.x * kx, y: l.mask.y * ky };
        if (l.vmask) for (const sp of l.vmask) for (const p of sp.pts) { p.x *= kx; p.y *= ky; p.ix *= kx; p.iy *= ky; p.ox *= kx; p.oy *= ky; }
      };
      doc.layers.forEach(fix); doc.w = w; doc.h = h; if (dpi) doc.dpi = dpi;
      doc.guides = doc.guides.map(g => ({ ...g, p: g.p * (g.o === 'v' ? kx : ky) }));
    }, 'all');
  }
  /** taille du canevas : ajoute ou retire de la place autour (point d'ancrage), sans toucher aux pixels */
  resizeCanvas(w: number, h: number, ax: number, ay: number, fill: string | null) {
    w = Math.round(w); h = Math.round(h); const d = this.doc; if (!d || w < 1 || h < 1) return;
    this.act('img.h.canvas', (_tx, doc) => {
      const dx = Math.round((w - doc.w) * ax), dy = Math.round((h - doc.h) * ay);
      this.translate(doc.layers, dx, dy); doc.guides = doc.guides.map(g => ({ ...g, p: g.p + (g.o === 'v' ? dx : dy) }));
      if (fill && (w > doc.w || h > doc.h)) { const r = newRaster(this.tr('img.layer.fill'), w, h); const g = ctx2d(r.cv); g.fillStyle = fill; g.fillRect(0, 0, w, h); doc.layers.unshift(r); }
      doc.w = w; doc.h = h;
    }, 'all');
  }
  /** recadrer : sans perte par défaut (les pixels hors du cadre restent dans les calques), avec redressement */
  cropTo(r: Rect, angle: number, del: boolean) {
    const W = Math.max(1, Math.round(r.w)), H = Math.max(1, Math.round(r.h));
    this.act('img.h.crop', (_tx, doc) => {
      if (angle) {
        // redresser : chaque calque tourne autour du centre du cadre
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const rot = (l: Layer) => {
          if (l.type === 'raster') { const s = this.toSmartRaw(l); const f = findLayer(doc, l.id); if (f && s) { f.list.splice(f.list.indexOf(l), 1, s); rot(s); } return; }
          if (l.type === 'smart' || l.type === 'text' || l.type === 'shape') {
            const a = -angle * Math.PI / 180, x = l.tf.x - cx, y = l.tf.y - cy; l.tf.x = cx + x * Math.cos(a) - y * Math.sin(a); l.tf.y = cy + x * Math.sin(a) + y * Math.cos(a); l.tf.rot -= angle;
          } else if (l.type === 'group') l.children.forEach(rot);
        };
        [...doc.layers].forEach(rot);
      }
      this.translate(doc.layers, -Math.round(r.x), -Math.round(r.y));
      doc.guides = doc.guides.map(g => ({ ...g, p: g.p - (g.o === 'v' ? Math.round(r.x) : Math.round(r.y)) })).filter(g => g.p >= 0 && g.p <= (g.o === 'v' ? W : H));
      doc.w = W; doc.h = H;
      if (del) for (const { l } of walk(doc.layers)) if (l.type === 'raster') {
        const c = mkCanvas(W, H); ctx2d(c).drawImage(l.cv, l.x, l.y); l.cv = c; l.x = 0; l.y = 0;
      }
    }, 'all');
  }
  private toSmartRaw(l: RasterLayer): SmartLayer | null {
    const b = trimBounds(l.cv); if (!b) return null; const src = mkCanvas(b.w, b.h); ctx2d(src).drawImage(l.cv, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    return { ...l, type: 'smart', src, blob: null, mime: 'image/png', srcName: l.name, link: null, sw: b.w, sh: b.h, tf: { x: l.x + b.x + b.w / 2, y: l.y + b.y + b.h / 2, sx: 1, sy: 1, rot: 0, skx: 0 }, quad: null, filters: [] } as unknown as SmartLayer;
  }
  /** rognage automatique au contenu visible */
  trim() {
    const d = this.doc; if (!d) return; const b = trimBounds(renderDoc(d, 1, false)); if (!b) return; this.cropTo(b, 0, false);
  }
  /** aligner et répartir (sur la sélection de calques, ou sur le document s'il n'y a qu'un calque) */
  align(how: 'l' | 'cx' | 'r' | 't' | 'cy' | 'b' | 'dh' | 'dv') {
    const d = this.doc; if (!d) return; const ls = selLayers(d).filter(l => l.type !== 'adjust'); if (!ls.length) return;
    const bs = ls.map(l => layerBounds(l, d)), all = ls.length > 1 ? bs.reduce<Rect | null>((a, b) => rectUnion(a, b), null)! : { x: 0, y: 0, w: d.w, h: d.h };
    this.act('img.h.align', () => {
      if (how === 'dh' || how === 'dv') {
        if (ls.length < 3) return false;
        const k = how === 'dh' ? 'x' : 'y', s = how === 'dh' ? 'w' : 'h', idx = ls.map((_, i) => i).sort((a, b) => bs[a][k] - bs[b][k]);
        const first = bs[idx[0]], last = bs[idx[idx.length - 1]], total = idx.reduce((n, i) => n + bs[i][s], 0), gap = (last[k] + last[s] - first[k] - total) / (idx.length - 1);
        let pos = first[k] + first[s] + gap;
        for (const i of idx.slice(1, -1)) { const dlt = pos - bs[i][k]; this.translate([ls[i]], how === 'dh' ? dlt : 0, how === 'dv' ? dlt : 0); pos += bs[i][s] + gap; }
        return;
      }
      ls.forEach((l, i) => {
        const b = bs[i]; let dx = 0, dy = 0;
        if (how === 'l') dx = all.x - b.x; if (how === 'r') dx = all.x + all.w - b.x - b.w; if (how === 'cx') dx = all.x + all.w / 2 - b.x - b.w / 2;
        if (how === 't') dy = all.y - b.y; if (how === 'b') dy = all.y + all.h - b.y - b.h; if (how === 'cy') dy = all.y + all.h / 2 - b.y - b.h / 2;
        this.translate([l], Math.round(dx), Math.round(dy));
      });
    }, 'all');
  }
  /** position et taille exactes (panneau Propriétés) */
  setGeometry(l: Layer, g: { x?: number; y?: number; w?: number; h?: number; rot?: number }) {
    const d = this.doc; if (!d) return; const b = layerBounds(l, d);
    this.act('img.h.geom', () => {
      if (g.x != null || g.y != null) this.translate([l], g.x != null ? g.x - b.x : 0, g.y != null ? g.y - b.y : 0);
      if ((g.w != null || g.h != null || g.rot != null) && (l.type === 'smart' || l.type === 'text' || l.type === 'shape')) {
        const [lw, lh] = localSize(l);
        if (g.w != null && g.w > 0) l.tf.sx = Math.sign(l.tf.sx || 1) * g.w / lw;
        if (g.h != null && g.h > 0) l.tf.sy = Math.sign(l.tf.sy || 1) * g.h / lh;
        if (g.rot != null) l.tf.rot = g.rot;
      } else if ((g.w != null || g.h != null) && l.type === 'raster') {
        const w = Math.max(1, Math.round(g.w ?? l.cv.width)), h = Math.max(1, Math.round(g.h ?? l.cv.height)); l.cv = resample(l.cv, w, h, this.move.resample);
      }
    }, 'all');
  }

  /* ---------- textes et formes ---------- */
  addText(x: number, y: number, text: string, boxW = 0): TextLayer {
    const l = newText(text, x, y, structuredClone(this.text)); l.boxW = boxW;
    this.act('img.h.text', (_tx, d) => { this.insert(d, l); }, 'all'); return l;
  }
  addShape(kind: ShapeOpts['kind'], r: Rect, color: string): ShapeLayer {
    const o = this.shape, it = shapeItem(kind === 'custom' ? 'custom' : kind, Math.max(1, r.w), Math.max(1, r.h));
    it.r = o.r; it.sides = o.sides; it.inner = o.inner; it.custom = o.custom; if (kind === 'line') it.arrow = [false, o.arrow];
    const l = newShape(this.tr('img.shape.' + kind), it, r.x + r.w / 2, r.y + r.h / 2, color);
    if (!o.fill && kind !== 'line') l.fill = null; if (l.stroke) { l.stroke.on = o.stroke || kind === 'line' || !o.fill; l.stroke.width = o.strokeW; l.stroke.paint = { kind: 'color', color: kind === 'line' || !o.fill ? color : this.bg }; }
    this.act('img.h.shape', (_tx, d) => { this.insert(d, l); }, 'all'); return l;
  }

  /** calque visible le plus haut sous un point du document (pixels transparents ignorés) */
  hitTest(x: number, y: number): Layer | null {
    const d = this.doc; if (!d) return null;
    const test = (list: Layer[]): Layer | null => {
      for (let i = list.length - 1; i >= 0; i--) {
        const l = list[i]; if (!l.visible || l.locked) continue;
        if (l.type === 'group') { const h = test(l.children); if (h) return l.open ? h : l; continue; }
        if (l.type === 'adjust') continue;
        if (l.type === 'raster') { const px = Math.floor(x - l.x), py = Math.floor(y - l.y); if (px < 0 || py < 0 || px >= l.cv.width || py >= l.cv.height) continue; if (ctx2d(l.cv, true).getImageData(px, py, 1, 1).data[3] > 8) return l; continue; }
        if (l.type === 'smart' && l.quad) { const b = boundsOf(l.quad); if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) return l; continue; }
        const m = tfMatrix((l as SmartLayer).tf).inverse(), p = m.transformPoint({ x, y }), [w, h] = localSize(l);
        if (Math.abs(p.x) > w / 2 || Math.abs(p.y) > h / 2) continue;
        if (l.type === 'smart') { const sx = Math.floor(p.x + l.sw / 2), sy = Math.floor(p.y + l.sh / 2); if (ctx2d(l.src, true).getImageData(Math.min(l.sw - 1, sx), Math.min(l.sh - 1, sy), 1, 1).data[3] <= 8) continue; }
        return l;
      }
      return null;
    };
    return test(d.layers);
  }
  /** calque de pixels qui couvre tout le document (agrandi si besoin) pour peindre partout */
  coverDoc(l: RasterLayer, tx: Tx) {
    const d = this.doc!; const x0 = Math.min(0, l.x), y0 = Math.min(0, l.y), x1 = Math.max(d.w, l.x + l.cv.width), y1 = Math.max(d.h, l.y + l.cv.height);
    if (x0 === l.x && y0 === l.y && x1 - x0 === l.cv.width && y1 - y0 === l.cv.height) return;
    void tx; const c = mkCanvas(x1 - x0, y1 - y0); ctx2d(c).drawImage(l.cv, l.x - x0, l.y - y0); l.cv = c; l.x = x0; l.y = y0;
  }

  /* ---------- couleurs ---------- */
  setFg(c: string) { this.fg = c; this.recent = [c, ...this.recent.filter(x => x !== c)].slice(0, 16); this.saveColors(); this.emit(); }
}

/** copie complète d'un calque (nouvel identifiant, canvas copiés) */
export function structuredCloneLayer(l: Layer): Layer {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(l)) {
    if (k === 'cv' || k === 'src') o[k] = cloneCanvas(v as HTMLCanvasElement);
    else if (k === 'blob') o[k] = v;
    else if (k === 'children') o[k] = (v as Layer[]).map(structuredCloneLayer);
    else if (k === 'mask') o[k] = v ? { ...(v as object), cv: cloneCanvas((v as { cv: HTMLCanvasElement }).cv) } : null;
    else o[k] = v && typeof v === 'object' ? structuredClone(v) : v;
  }
  o.id = newId(); return o as unknown as Layer;
}
/** zone non transparente d'un canvas */
export function trimBounds(c: HTMLCanvasElement): Rect | null {
  const w = c.width, h = c.height, d = ctx2d(c, true).getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
export { boundsOf, layerCorners, tfMatrix, localSize, drawContent, cloneCanvas, clampN };

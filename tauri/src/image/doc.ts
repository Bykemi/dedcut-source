// DedCut Image — modèle du document : calques, transformations, styles.
// Tout est en coordonnées du document (pixels). Les canvas des calques ne sont jamais partagés entre deux documents.

export type LType = 'raster' | 'smart' | 'text' | 'shape' | 'group' | 'adjust';
export type Blend = GlobalCompositeOperation;
export const BLENDS: Blend[] = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];

/** transformation d'un calque vectoriel ou intelligent : position du centre, échelle, rotation (degrés), inclinaison */
export interface TF { x: number; y: number; sx: number; sy: number; rot: number; skx: number }
/** 4 coins (document) quand le calque est déformé en perspective (haut-gauche, haut-droite, bas-droite, bas-gauche) */
export type Quad = [number, number][];

export interface GradStop { o: number; c: string; a: number }
export interface Gradient { kind: 'linear' | 'radial' | 'conic'; angle: number; stops: GradStop[] }
/** peinture d'un remplissage : couleur unie, dégradé ou motif */
export interface Paint { kind: 'color' | 'gradient' | 'pattern'; color: string; grad?: Gradient; pattern?: string; scale?: number }

export interface Fx {
  kind: 'shadow' | 'glow' | 'stroke' | 'overlay' | 'gradover' | 'patover' | 'inner' | 'bevel';
  on: boolean; color: string; opacity: number; size: number; dist: number; angle: number;
  grad?: Gradient; blend?: Blend; pattern?: string; scale?: number;
}
export interface Mask { cv: HTMLCanvasElement; x: number; y: number; on: boolean; inv?: boolean }

export interface TextStyle {
  font: string; size: number; weight: number; italic: boolean; underline: boolean; caps: boolean;
  align: 'left' | 'center' | 'right'; lh: number; ls: number;
  fill: Paint; stroke: { on: boolean; color: string; width: number }; curve: number; dir: 'ltr' | 'rtl';
}
export interface PathPt { x: number; y: number; ix: number; iy: number; ox: number; oy: number; smooth: boolean }
export interface SubPath { pts: PathPt[]; closed: boolean }
export type ShapeKind = 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path' | 'custom';
export interface ShapeItem {
  kind: ShapeKind; op: 'add' | 'sub' | 'int' | 'xor';
  w: number; h: number; r: number; sides: number; inner: number; arrow: [boolean, boolean];
  paths?: SubPath[]; custom?: string; ox: number; oy: number;
}

export interface LayerBase {
  id: number; name: string; type: LType; visible: boolean; locked: boolean; opacity: number; blend: Blend;
  tag: string; clip: boolean; mask: Mask | null; vmask: SubPath[] | null; fx: Fx[];
}
export interface RasterLayer extends LayerBase { type: 'raster'; cv: HTMLCanvasElement; x: number; y: number }
export interface SmartLayer extends LayerBase {
  type: 'smart'; src: HTMLCanvasElement; blob: Blob | null; mime: string; srcName: string; link: string | null;
  sw: number; sh: number; tf: TF; quad: Quad | null; filters: FilterDef[];
}
export interface TextLayer extends LayerBase { type: 'text'; text: string; st: TextStyle; boxW: number; tf: TF; onPath: SubPath | null }
export interface ShapeLayer extends LayerBase {
  type: 'shape'; items: ShapeItem[]; fill: Paint | null;
  stroke: { on: boolean; paint: Paint; width: number; dash: number; join: CanvasLineJoin } | null; tf: TF;
}
export interface GroupLayer extends LayerBase { type: 'group'; children: Layer[]; open: boolean; pass: boolean }
// p : réglages en plus de certains filtres (courbes, niveaux, LUT, dégradé…)
export interface FilterDef { kind: string; v: number; v2?: number; on: boolean; p?: Record<string, any> } // eslint-disable-line
export interface AdjustLayer extends LayerBase { type: 'adjust'; adj: FilterDef[] }
export type Layer = RasterLayer | SmartLayer | TextLayer | ShapeLayer | GroupLayer | AdjustLayer;

export interface Guide { o: 'h' | 'v'; p: number }
export interface Doc {
  id: number; name: string; w: number; h: number; dpi: number; bg: string | null;
  layers: Layer[]; sel: number[]; guides: Guide[]; path: string | null; dirty: boolean;
  meta: { exif?: Record<string, string>; icc?: string; srcName?: string; app1?: Uint8Array | null };
  savedAt: number; uid: number; space: 'srgb' | 'display-p3';
}

let uid = 1;
export const newId = () => uid++;
export const bumpId = (n: number) => { if (n >= uid) uid = n + 1; };

export function mkCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
export const ctx2d = (c: HTMLCanvasElement, read = false) => c.getContext('2d', read ? { willReadFrequently: true } : undefined)!;
export function cloneCanvas(c: HTMLCanvasElement): HTMLCanvasElement {
  const n = mkCanvas(c.width, c.height); ctx2d(n).drawImage(c, 0, 0); return n;
}

export const tf0 = (x: number, y: number): TF => ({ x, y, sx: 1, sy: 1, rot: 0, skx: 0 });
function base(type: LType, name: string): LayerBase {
  return { id: newId(), name, type, visible: true, locked: false, opacity: 1, blend: 'source-over', tag: '', clip: false, mask: null, vmask: null, fx: [] };
}
export function newRaster(name: string, w: number, h: number, x = 0, y = 0): RasterLayer {
  return { ...base('raster', name), type: 'raster', cv: mkCanvas(w, h), x, y };
}
export function newSmart(name: string, src: HTMLCanvasElement, blob: Blob | null, mime: string, cx: number, cy: number): SmartLayer {
  return { ...base('smart', name), type: 'smart', src, blob, mime, srcName: name, link: null, sw: src.width, sh: src.height, tf: tf0(cx, cy), quad: null, filters: [] };
}
export const defStyle = (): TextStyle => ({
  font: 'Bahnschrift', size: 72, weight: 700, italic: false, underline: false, caps: false, align: 'left', lh: 1.2, ls: 0,
  fill: { kind: 'color', color: '#ffffff' }, stroke: { on: false, color: '#000000', width: 4 }, curve: 0, dir: 'ltr'
});
export function newText(text: string, x: number, y: number, st?: Partial<TextStyle>): TextLayer {
  return { ...base('text', text.slice(0, 30) || 'Texte'), type: 'text', text, st: { ...defStyle(), ...st }, boxW: 0, tf: tf0(x, y), onPath: null };
}
export function shapeItem(kind: ShapeKind, w: number, h: number): ShapeItem {
  return { kind, op: 'add', w, h, r: 0, sides: kind === 'star' ? 5 : 6, inner: 0.5, arrow: [false, false], ox: 0, oy: 0 };
}
export function newShape(name: string, item: ShapeItem, x: number, y: number, color: string): ShapeLayer {
  return {
    ...base('shape', name), type: 'shape', items: [item], fill: item.kind === 'line' ? null : { kind: 'color', color },
    stroke: { on: item.kind === 'line', paint: { kind: 'color', color }, width: item.kind === 'line' ? 8 : 4, dash: 0, join: 'round' }, tf: tf0(x, y)
  };
}
export function newGroup(name: string, children: Layer[]): GroupLayer {
  return { ...base('group', name), type: 'group', children, open: true, pass: false };
}
export function newAdjust(name: string, adj: FilterDef[]): AdjustLayer {
  return { ...base('adjust', name), type: 'adjust', adj };
}

let docN = 1;
export function newDoc(name: string, w: number, h: number, bg: string | null, dpi = 72): Doc {
  return { id: docN++, name, w: Math.round(w), h: Math.round(h), dpi, bg, layers: [], sel: [], guides: [], path: null, dirty: false, meta: {}, savedAt: 0, uid: 0, space: 'srgb' };
}

/* ---------- parcours de l'arbre des calques ---------- */
export function* walk(list: Layer[], parent: GroupLayer | null = null): Generator<{ l: Layer; parent: GroupLayer | null; list: Layer[] }> {
  for (const l of list) { yield { l, parent, list }; if (l.type === 'group') yield* walk(l.children, l); }
}
export function findLayer(doc: Doc, id: number) { for (const x of walk(doc.layers)) if (x.l.id === id) return x; return null; }
export const allLayers = (doc: Doc) => [...walk(doc.layers)].map(x => x.l);
export const selLayers = (doc: Doc) => doc.sel.map(id => findLayer(doc, id)?.l).filter(Boolean) as Layer[];
export const curLayer = (doc: Doc): Layer | null => { const id = doc.sel[doc.sel.length - 1]; return id == null ? null : findLayer(doc, id)?.l || null; };

/* ---------- matrices ---------- */
export function tfMatrix(t: TF): DOMMatrix {
  const m = new DOMMatrix();
  m.translateSelf(t.x, t.y); m.rotateSelf(t.rot); if (t.skx) m.skewXSelf(t.skx); m.scaleSelf(t.sx, t.sy);
  return m;
}
/** taille locale (avant transformation) d'un calque vectoriel ou intelligent */
export function localSize(l: Layer): [number, number] {
  if (l.type === 'smart') return [l.sw, l.sh];
  if (l.type === 'shape') { let w = 1, h = 1; for (const it of l.items) { w = Math.max(w, it.w + Math.abs(it.ox) * 2); h = Math.max(h, it.h + Math.abs(it.oy) * 2); } return [w, h]; }
  if (l.type === 'text') return textBox(l);
  return [1, 1];
}
/** boîte d'un texte (mesurée par text.ts, gardée ici pour éviter une dépendance circulaire) */
export const textMeasure: { fn: ((l: TextLayer) => [number, number]) | null } = { fn: null };
export const textBox = (l: TextLayer): [number, number] => textMeasure.fn ? textMeasure.fn(l) : [l.st.size * Math.max(1, l.text.length) * 0.6, l.st.size * l.st.lh];

/** coins d'un calque dans le document (pour la boîte de transformation et l'alignement) */
export function layerCorners(l: Layer, doc: Doc): [number, number][] {
  if (l.type === 'raster') return [[l.x, l.y], [l.x + l.cv.width, l.y], [l.x + l.cv.width, l.y + l.cv.height], [l.x, l.y + l.cv.height]];
  if (l.type === 'smart' && l.quad) return l.quad.map(p => [p[0], p[1]]);
  if (l.type === 'group') {
    const b = groupBounds(l, doc); if (!b) return [[0, 0], [0, 0], [0, 0], [0, 0]];
    return [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  }
  if (l.type === 'adjust') return [[0, 0], [doc.w, 0], [doc.w, doc.h], [0, doc.h]];
  const [w, h] = localSize(l), m = tfMatrix(l.tf);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => { const p = m.transformPoint({ x, y }); return [p.x, p.y]; });
}
export interface Rect { x: number; y: number; w: number; h: number }
export function boundsOf(pts: [number, number][]): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export function groupBounds(g: GroupLayer, doc: Doc): Rect | null {
  const pts: [number, number][] = [];
  for (const c of g.children) if (c.type !== 'adjust') pts.push(...layerCorners(c, doc));
  return pts.length ? boundsOf(pts) : null;
}
export const layerBounds = (l: Layer, doc: Doc) => boundsOf(layerCorners(l, doc));
export const rectUnion = (a: Rect | null, b: Rect): Rect => !a ? { ...b } : boundsOf([[a.x, a.y], [a.x + a.w, a.y + a.h], [b.x, b.y], [b.x + b.w, b.y + b.h]]);
export const rectInt = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x && y1 > y ? { x, y, w: x1 - x, h: y1 - y } : null;
};
export const rectGrow = (r: Rect, n: number): Rect => ({ x: r.x - n, y: r.y - n, w: r.w + 2 * n, h: r.h + 2 * n });
export const rectRound = (r: Rect): Rect => { const x = Math.floor(r.x), y = Math.floor(r.y); return { x, y, w: Math.ceil(r.x + r.w) - x, h: Math.ceil(r.y + r.h) - y }; };

/* ---------- couleurs ---------- */
export function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', ''); const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const rgba = (h: string, a: number) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };

// DedCut Image — historique : annuler / rétablir.
// Chaque action garde l'état d'avant et d'après : l'arbre des calques, leurs réglages, et les pixels modifiés
// (seulement la zone touchée). Les canvas remplacés sont gardés par référence, jamais recopiés.
import { Doc, Layer, Guide, Rect, walk, cloneCanvas, ctx2d, rectInt } from './doc';

const KEEP = new Set(['cv', 'src', 'blob', 'children']);
function cloneProps(l: Layer): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(l)) {
    if (KEEP.has(k)) o[k] = k === 'children' ? [...(v as Layer[])] : v;
    else if (k === 'mask') o[k] = v ? { ...(v as object) } : null;
    else o[k] = v && typeof v === 'object' ? structuredClone(v) : v;
  }
  return o;
}
interface Snap { layers: Layer[]; props: Map<Layer, Record<string, unknown>>; doc: { w: number; h: number; bg: string | null; dpi: number; name: string; guides: Guide[]; sel: number[] }; selMask: HTMLCanvasElement | null; saved: unknown[] }
type DocX = Doc & { selMask?: HTMLCanvasElement | null; selSaved?: unknown[] };
function snapshot(doc: Doc): Snap {
  const props = new Map<Layer, Record<string, unknown>>();
  for (const { l } of walk(doc.layers)) props.set(l, cloneProps(l));
  // la sélection n'est jamais modifiée sur place : garder la référence suffit
  return { layers: [...doc.layers], props, doc: { w: doc.w, h: doc.h, bg: doc.bg, dpi: doc.dpi, name: doc.name, guides: structuredClone(doc.guides), sel: [...doc.sel] }, selMask: (doc as DocX).selMask || null, saved: [...((doc as DocX).selSaved || [])] };
}
function restore(doc: Doc, s: Snap) {
  for (const [l, p] of s.props) {
    for (const k of Object.keys(l)) if (!(k in p)) delete (l as unknown as Record<string, unknown>)[k];
    Object.assign(l, p, p.children ? { children: [...(p.children as Layer[])] } : {}, p.mask ? { mask: { ...(p.mask as object) } } : {});
    for (const k of ['tf', 'st', 'fx', 'items', 'fill', 'stroke', 'filters', 'adj', 'quad', 'vmask', 'onPath']) if (p[k] && typeof p[k] === 'object') (l as unknown as Record<string, unknown>)[k] = structuredClone(p[k]);
  }
  doc.layers = [...s.layers]; Object.assign(doc, { ...s.doc, guides: structuredClone(s.doc.guides), sel: [...s.doc.sel] });
  (doc as DocX).selMask = s.selMask; (doc as DocX).selSaved = [...s.saved];
}
const sizeOf = (c: HTMLCanvasElement | null | undefined) => c ? c.width * c.height * 4 : 0;
function snapBytes(a: Snap, b: Snap) {
  let n = 0;
  for (const [l, p] of a.props) { const q = b.props.get(l); if (!q || q.cv !== p.cv) n += sizeOf(p.cv as HTMLCanvasElement); }
  return n;
}
function same(a: Snap, b: Snap) {
  if (a.layers.length !== b.layers.length || a.layers.some((l, i) => l !== b.layers[i])) return false;
  if (a.selMask !== b.selMask || a.saved.length !== b.saved.length) return false;
  if (JSON.stringify(a.doc) !== JSON.stringify(b.doc) || a.props.size !== b.props.size) return false;
  for (const [l, p] of a.props) {
    const q = b.props.get(l); if (!q) return false;
    for (const k of Object.keys(p)) {
      if (KEEP.has(k)) { if (k === 'children' ? JSON.stringify((p[k] as Layer[]).map(x => x.id)) !== JSON.stringify((q[k] as Layer[]).map(x => x.id)) : p[k] !== q[k]) return false; }
      else if (k === 'mask') { const m1 = p[k] as { cv?: unknown } | null, m2 = q[k] as { cv?: unknown } | null; if (!!m1 !== !!m2 || (m1 && m2 && (m1.cv !== m2.cv || JSON.stringify({ ...m1, cv: 0 }) !== JSON.stringify({ ...m2, cv: 0 })))) return false; }
      else if (JSON.stringify(p[k]) !== JSON.stringify(q[k])) return false;
    }
  }
  return true;
}
interface Patch { cv: HTMLCanvasElement; r: Rect; before: ImageData; after: ImageData }
export interface Entry { label: string; before: Snap; after: Snap; pix: Patch[]; bytes: number; t: number }

export class Tx {
  private before: Snap; private copies = new Map<HTMLCanvasElement, HTMLCanvasElement>(); private rects = new Map<HTMLCanvasElement, Rect | null>();
  constructor(private h: History, private doc: Doc, public label: string) { this.before = snapshot(doc); }
  /** à appeler avant de modifier les pixels d'un canvas sur place (pinceau, remplissage, filtre…) */
  touch(cv: HTMLCanvasElement, r: Rect | null = null) {
    if (!this.copies.has(cv)) { this.copies.set(cv, cloneCanvas(cv)); this.rects.set(cv, r); }
    else { const o = this.rects.get(cv); this.rects.set(cv, !r || !o ? null : { x: Math.min(o.x, r.x), y: Math.min(o.y, r.y), w: Math.max(o.x + o.w, r.x + r.w) - Math.min(o.x, r.x), h: Math.max(o.y + o.h, r.y + r.h) - Math.min(o.y, r.y) }); }
  }
  /** zone réellement modifiée d'un canvas touché (sinon tout le canvas est gardé) */
  area(cv: HTMLCanvasElement, r: Rect) { if (this.copies.has(cv)) { const o = this.rects.get(cv); this.rects.set(cv, o ? { x: Math.min(o.x, r.x), y: Math.min(o.y, r.y), w: Math.max(o.x + o.w, r.x + r.w) - Math.min(o.x, r.x), h: Math.max(o.y + o.h, r.y + r.h) - Math.min(o.y, r.y) } : r); } }
  end(): boolean {
    const after = snapshot(this.doc), pix: Patch[] = [];
    for (const [cv, copy] of this.copies) {
      const full = { x: 0, y: 0, w: cv.width, h: cv.height }, r0 = this.rects.get(cv), r = r0 ? rectInt(r0, full) : full;
      if (!r || copy.width !== cv.width || copy.height !== cv.height) continue;
      const R = { x: Math.floor(r.x), y: Math.floor(r.y), w: Math.ceil(r.w) + 1, h: Math.ceil(r.h) + 1 }, Rr = rectInt(R, full)!;
      pix.push({ cv, r: Rr, before: ctx2d(copy, true).getImageData(Rr.x, Rr.y, Rr.w, Rr.h), after: ctx2d(cv, true).getImageData(Rr.x, Rr.y, Rr.w, Rr.h) });
    }
    this.copies.clear();
    if (!pix.length && same(this.before, after)) return false;
    const bytes = pix.reduce((n, p) => n + p.before.data.length * 2, 0) + snapBytes(this.before, after) + 2000;
    this.h.push({ label: this.label, before: this.before, after, pix, bytes, t: Date.now() });
    return true;
  }
}
export class History {
  items: Entry[] = []; i = 0; bytes = 0; onChange: (() => void) | null = null;
  constructor(public doc: Doc, public max = 100, public budget = 700e6) { }
  begin(label: string) { return new Tx(this, this.doc, label); }
  push(e: Entry) {
    for (const x of this.items.splice(this.i)) this.bytes -= x.bytes;
    this.items.push(e); this.i = this.items.length; this.bytes += e.bytes;
    while (this.items.length > 1 && (this.items.length > this.max || this.bytes > this.budget)) { const x = this.items.shift()!; this.bytes -= x.bytes; this.i--; }
    this.onChange?.();
  }
  get canUndo() { return this.i > 0; }
  get canRedo() { return this.i < this.items.length; }
  undo(): Entry | null {
    if (!this.canUndo) return null; const e = this.items[--this.i];
    for (const p of [...e.pix].reverse()) ctx2d(p.cv).putImageData(p.before, p.r.x, p.r.y);
    restore(this.doc, e.before); this.onChange?.(); return e;
  }
  redo(): Entry | null {
    if (!this.canRedo) return null; const e = this.items[this.i++];
    for (const p of e.pix) ctx2d(p.cv).putImageData(p.after, p.r.x, p.r.y);
    restore(this.doc, e.after); this.onChange?.(); return e;
  }
  /** revenir à un point précis de l'historique */
  goto(n: number) { while (this.i > n && this.canUndo) this.undo(); while (this.i < n && this.canRedo) this.redo(); }
}

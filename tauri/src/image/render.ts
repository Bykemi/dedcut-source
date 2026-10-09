// DedCut Image — rendu : assemble les calques (modes de fusion, opacité, masques, écrêtage, effets, réglages).
// Une « cible » est un canvas qui couvre une zone du document à une échelle donnée.
import {
  Doc, Layer, Rect, Fx, SmartLayer, ShapeLayer, Quad, mkCanvas, ctx2d, tfMatrix, localSize, rgba, rectGrow, rectInt, layerBounds
} from './doc';
import { drawText } from './text';
import { itemPath, paintStyle, arrowHeads, gradientFill, subPathsToPath, patternCanvas } from './paint';
import { cssFilter, pixelPass } from './filters';
import type { Stroke } from './brush';

/** trait de pinceau en cours (aperçu en direct, avant d'être posé sur le calque) */
/** fast : un réglage est en train de bouger (les grands calques intelligents sont alors calculés en réduit) */
export const live: { layer: Layer | null; mask: boolean; stroke: Stroke | null; fast: boolean } = { layer: null, mask: false, stroke: null, fast: false };

export interface Target { g: CanvasRenderingContext2D; ox: number; oy: number; s: number }
const setT = (t: Target) => t.g.setTransform(t.s, 0, 0, t.s, -t.ox * t.s, -t.oy * t.s);

/* ---------- canvas temporaires réutilisés ---------- */
const pool: HTMLCanvasElement[] = [];
function tmp(w: number, h: number): HTMLCanvasElement {
  const i = pool.findIndex(c => c.width >= w && c.height >= h && c.width <= w * 1.5 + 64 && c.height <= h * 1.5 + 64);
  const c = i >= 0 ? pool.splice(i, 1)[0] : mkCanvas(w, h);
  const g = ctx2d(c); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.shadowColor = 'transparent'; g.clearRect(0, 0, c.width, c.height); return c;
}
const free = (c: HTMLCanvasElement) => { if (pool.length < 12) pool.push(c); };
export const freeAll = () => { pool.length = 0; };

/* ---------- contenu d'un calque (sans opacité, ni masque, ni effet) ---------- */
const filterCache = new WeakMap<SmartLayer, { key: string; cv: HTMLCanvasElement; fast?: boolean }>();
const FAST_SIDE = 1600, FAST_PX = 3e6;
function smartSource(l: SmartLayer): HTMLCanvasElement {
  const key = JSON.stringify(l.filters.filter(f => f.on)), fast = live.fast && l.src.width * l.src.height > FAST_PX;
  const c = filterCache.get(l); if (c && c.key === key && (fast || !c.fast)) return c.cv;
  if (fast) {
    // aperçu pendant le réglage : même calcul sur une copie réduite (les rayons en pixels sont réduits pareil)
    const k = FAST_SIDE / Math.max(l.src.width, l.src.height), s = mkCanvas(Math.max(1, Math.round(l.src.width * k)), Math.max(1, Math.round(l.src.height * k)));
    const sg = ctx2d(s); sg.imageSmoothingQuality = 'high'; sg.drawImage(l.src, 0, 0, s.width, s.height);
    const px = pixelPass(s, l.filters, s.width / l.src.width); if (!px) return l.src; filterCache.set(l, { key, cv: px, fast: true }); return px;
  }
  const cv = pixelPass(l.src, l.filters) || l.src; filterCache.set(l, { key, cv }); return cv;
}
export function drawContent(g: CanvasRenderingContext2D, l: Layer, scale: number) {
  if (l.type === 'raster') {
    if (live.stroke && live.layer === l && !live.mask) { const c = tmp(l.cv.width, l.cv.height); live.stroke.preview(ctx2d(c)); g.drawImage(c, 0, 0, l.cv.width, l.cv.height, l.x, l.y, l.cv.width, l.cv.height); free(c); return; }
    g.drawImage(l.cv, l.x, l.y); return;
  }
  if (l.type === 'smart') {
    const src = smartSource(l), f = cssFilter(l.filters, scale);
    if (f) g.filter = f;
    if (l.quad) drawQuad(g, src, l.quad); else { g.save(); g.transform(...m6(tfMatrix(l.tf))); g.drawImage(src, -l.sw / 2, -l.sh / 2, l.sw, l.sh); g.restore(); }
    g.filter = 'none'; return;
  }
  if (l.type === 'text') { g.save(); g.transform(...m6(tfMatrix(l.tf))); drawText(g, l); g.restore(); return; }
  if (l.type === 'shape') { g.save(); g.transform(...m6(tfMatrix(l.tf))); drawShape(g, l); g.restore(); }
}
const m6 = (m: DOMMatrix): [number, number, number, number, number, number] => [m.a, m.b, m.c, m.d, m.e, m.f];
function drawShape(g: CanvasRenderingContext2D, l: ShapeLayer) {
  const [w, h] = localSize(l), simple = l.items.length === 1 || l.items.every(i => i.op === 'add');
  const fill = l.fill ? paintStyle(g, l.fill, -w / 2, -h / 2, w, h) : null, st = l.stroke && l.stroke.on ? l.stroke : null;
  const stroke = (p: Path2D) => {
    if (!st) return; g.lineWidth = st.width; g.lineJoin = st.join; g.lineCap = 'round'; g.setLineDash(st.dash > 0 ? [st.dash * st.width, st.dash * st.width] : []);
    g.strokeStyle = paintStyle(g, st.paint, -w / 2, -h / 2, w, h); g.stroke(p); g.setLineDash([]);
  };
  if (simple) {
    for (const it of l.items) {
      const p = itemPath(it);
      if (fill && it.kind !== 'line') { g.fillStyle = fill; g.fill(p, 'evenodd'); }
      stroke(p);
      if (it.kind === 'line' && st) { g.fillStyle = paintStyle(g, st.paint, -w / 2, -h / 2, w, h); arrowHeads(g, it, st.width); }
    }
    return;
  }
  // union, soustraction, intersection, exclusion : combinées dans un calque à part, la forme reste modifiable
  const tr = g.getTransform(), c = tmp(g.canvas.width, g.canvas.height), cg = ctx2d(c); cg.setTransform(tr);
  if (fill) l.items.forEach((it, i) => {
    cg.globalCompositeOperation = i === 0 || it.op === 'add' ? 'source-over' : it.op === 'sub' ? 'destination-out' : it.op === 'int' ? 'destination-in' : 'xor';
    cg.fillStyle = fill; cg.fill(itemPath(it), 'evenodd');
  });
  if (st) {
    cg.globalCompositeOperation = 'source-over';
    for (const it of l.items) { cg.lineWidth = st.width; cg.lineJoin = st.join; cg.strokeStyle = paintStyle(cg, st.paint, -w / 2, -h / 2, w, h); cg.stroke(itemPath(it)); }
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore(); free(c);
}

/* ---------- perspective : image posée sur 4 coins (maillage de triangles, homographie) ---------- */
function homography(q: Quad, w: number, h: number) {
  // carré unité → quadrilatère
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g7 = (sx * dy2 - dx2 * sy) / den, h8 = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g7 * x1, b = x3 - x0 + h8 * x3, c = x0, d = y1 - y0 + g7 * y1, e = y3 - y0 + h8 * y3, f = y0;
  return (u: number, v: number): [number, number] => { const z = g7 * u / w + h8 * v / h + 1; return [(a * u / w + b * v / h + c) / z, (d * u / w + e * v / h + f) / z]; };
}
export function drawQuad(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, q: Quad) {
  const w = img.width, h = img.height, H = homography(q, w, h), N = 14;
  const P: [number, number][][] = [];
  for (let j = 0; j <= N; j++) { P.push([]); for (let i = 0; i <= N; i++) P[j].push(H(i * w / N, j * h / N)); }
  const tri = (s0: [number, number], s1: [number, number], s2: [number, number], d0: [number, number], d1: [number, number], d2: [number, number]) => {
    // agrandit un peu le triangle de destination pour éviter les fines lignes entre triangles
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, k = 1.012;
    const e = (p: [number, number]): [number, number] => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k];
    const [D0, D1, D2] = [e(d0), e(d1), e(d2)];
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (!den) return;
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    g.save(); g.beginPath(); g.moveTo(D0[0], D0[1]); g.lineTo(D1[0], D1[1]); g.lineTo(D2[0], D2[1]); g.closePath(); g.clip();
    g.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]); g.drawImage(img, 0, 0); g.restore();
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const s00: [number, number] = [i * w / N, j * h / N], s10: [number, number] = [(i + 1) * w / N, j * h / N], s01: [number, number] = [i * w / N, (j + 1) * h / N], s11: [number, number] = [(i + 1) * w / N, (j + 1) * h / N];
    tri(s00, s10, s11, P[j][i], P[j][i + 1], P[j + 1][i + 1]); tri(s00, s11, s01, P[j][i], P[j + 1][i + 1], P[j + 1][i]);
  }
}

/* ---------- effets de calque (styles) ---------- */
export const fxMargin = (fx: Fx[]) => fx.filter(f => f.on).reduce((m, f) => Math.max(m, f.size * 2 + f.dist + 4), 0);
/** ox, oy : coin du document dans ce rendu (le motif de texture reste accroché au document, même aperçu qu'à l'export) */
function applyFx(src: HTMLCanvasElement, fx: Fx[], s: number, ox = 0, oy = 0): HTMLCanvasElement {
  const list = fx.filter(f => f.on); if (!list.length) return src;
  const W = src.width, H = src.height, out = tmp(W, H), g = ctx2d(out), OFF = W + H + 100;
  const behind = (f: Fx) => {
    const a = f.angle * Math.PI / 180, dx = f.kind === 'shadow' ? Math.cos(a) * f.dist * s : 0, dy = f.kind === 'shadow' ? Math.sin(a) * f.dist * s : 0;
    g.save(); g.shadowColor = rgba(f.color, f.opacity); g.shadowBlur = Math.max(0, f.size * s); g.shadowOffsetX = dx + OFF; g.shadowOffsetY = dy;
    const n = f.kind === 'glow' ? 2 : 1; for (let i = 0; i < n; i++) g.drawImage(src, -OFF, 0); g.restore();
  };
  for (const f of list) if (f.kind === 'shadow' || f.kind === 'glow') behind(f);
  for (const f of list) if (f.kind === 'stroke' && f.size > 0) {
    const c = tmp(W, H), cg = ctx2d(c), r = f.size * s, n = Math.max(12, Math.min(48, Math.round(r * 2)));
    for (const k of r > 6 ? [r, r * .66, r * .33] : [r]) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; cg.drawImage(src, Math.cos(a) * k, Math.sin(a) * k); }
    cg.drawImage(src, 0, 0); cg.globalCompositeOperation = 'source-in'; cg.fillStyle = rgba(f.color, f.opacity); cg.fillRect(0, 0, W, H);
    g.drawImage(c, 0, 0); free(c);
  }
  g.drawImage(src, 0, 0);
  for (const f of list) {
    if (f.kind === 'overlay' || f.kind === 'gradover' || f.kind === 'patover') {
      const c = tmp(W, H), cg = ctx2d(c); cg.drawImage(src, 0, 0); cg.globalCompositeOperation = 'source-in';
      let fill: string | CanvasGradient | CanvasPattern = f.color;
      if (f.kind === 'gradover' && f.grad) fill = gradientFill(cg, f.grad, 0, 0, W, H);
      else if (f.kind === 'patover') { const pc = patternCanvas(f.pattern || 'paper'), pat = pc && cg.createPattern(pc, 'repeat'); if (pat) { const k = s * (f.scale || 1); pat.setTransform(new DOMMatrix().translateSelf(-ox * s, -oy * s).scaleSelf(k, k)); fill = pat; } }
      cg.fillStyle = fill; cg.globalAlpha = f.opacity; cg.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = 'source-atop'; g.drawImage(c, 0, 0); g.restore(); free(c);
    } else if (f.kind === 'inner' || f.kind === 'bevel') {
      // ombre intérieure, ou relief (lumière d'un côté, ombre de l'autre)
      const pass = (color: string, op: number, dx: number, dy: number, blur: number) => {
        const inv = tmp(W, H), ig = ctx2d(inv); ig.fillStyle = '#000'; ig.fillRect(0, 0, W, H); ig.globalCompositeOperation = 'destination-out'; ig.drawImage(src, 0, 0);
        const c = tmp(W, H), cg = ctx2d(c); cg.shadowColor = rgba(color, op); cg.shadowBlur = blur; cg.shadowOffsetX = dx + OFF; cg.shadowOffsetY = dy; cg.drawImage(inv, -OFF, 0);
        g.save(); g.globalCompositeOperation = 'source-atop'; g.drawImage(c, 0, 0); g.restore(); free(c); free(inv);
      };
      const a = f.angle * Math.PI / 180, dx = Math.cos(a) * Math.max(1, f.dist) * s, dy = Math.sin(a) * Math.max(1, f.dist) * s;
      if (f.kind === 'inner') pass(f.color, f.opacity, dx, dy, f.size * s);
      else { pass('#ffffff', f.opacity * .8, dx, dy, f.size * s); pass('#000000', f.opacity * .8, -dx, -dy, f.size * s); }
    }
  }
  return out;
}

/* ---------- assemblage ---------- */
const simple = (l: Layer) => !l.mask?.on && !l.vmask && !l.fx.some(f => f.on) && l.type !== 'group' && l.type !== 'adjust';
/** dessine un calque complet (contenu, masques, effets) dans un canvas qui couvre la zone r de la cible */
function layerCanvas(l: Layer, doc: Doc, t: Target, w: number, h: number): HTMLCanvasElement {
  const c = tmp(w, h), g = ctx2d(c), lt: Target = { g, ox: t.ox, oy: t.oy, s: t.s }; setT(lt);
  if (l.type === 'group') compList(l.children, doc, lt, w, h);
  else drawContent(g, l, t.s);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (l.vmask && l.vmask.length) { setT(lt); g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.fill(subPathsToPath(l.vmask), 'evenodd'); g.setTransform(1, 0, 0, 1, 0, 0); }
  if (l.mask && l.mask.on) {
    let mc = l.mask.cv, mt: HTMLCanvasElement | null = null;
    if (live.stroke && live.layer === l && live.mask) { mt = tmp(mc.width, mc.height); live.stroke.preview(ctx2d(mt)); mc = mt; }
    setT(lt); g.globalCompositeOperation = l.mask.inv ? 'destination-out' : 'destination-in'; g.drawImage(mc, 0, 0, l.mask.cv.width, l.mask.cv.height, l.mask.x, l.mask.y, l.mask.cv.width, l.mask.cv.height); if (mt) free(mt);
    if (!l.mask.inv) {
      // hors du masque (canvas du masque plus petit que la zone) : caché
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      const m = l.mask, big = 1e6; g.beginPath(); g.rect(-big, -big, 3 * big, 3 * big); g.rect(m.x, m.y, m.cv.width, m.cv.height); g.fill('evenodd');
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  g.globalCompositeOperation = 'source-over';
  const fx = applyFx(c, l.fx, t.s, t.ox, t.oy); if (fx !== c) { free(c); return fx; }
  return c;
}
/** assemble une liste de calques (du bas vers le haut) sur la cible, sur toute la largeur w × h de son canvas */
export function compList(list: Layer[], doc: Doc, t: Target, w: number, h: number) {
  const g = t.g;
  for (let i = 0; i < list.length; i++) {
    const l = list[i]; let j = i + 1; const clipped: Layer[] = [];
    while (j < list.length && list[j].clip && list[j].type !== 'adjust') clipped.push(list[j++]);
    if (!l.visible || l.opacity <= 0) { i = j - 1; continue; }
    if (l.type === 'adjust') { applyAdjust(l, doc, t, w, h); continue; }
    if (l.type === 'group' && l.pass && !l.mask?.on && !l.vmask && !l.fx.some(x => x.on) && !clipped.length) {
      // groupe « transparent » : ses calques se mélangent directement avec ce qui est dessous
      if (l.opacity >= 1) { compList(l.children, doc, t, w, h); continue; }
    }
    if (simple(l) && !clipped.some(c => c.visible)) {
      setT(t); g.globalAlpha = l.opacity; g.globalCompositeOperation = l.blend; drawContent(g, l, t.s);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setTransform(1, 0, 0, 1, 0, 0);
      i = j - 1; continue;
    }
    let c = layerCanvas(l, doc, t, w, h);
    const vis = clipped.filter(x => x.visible && x.opacity > 0);
    if (vis.length) {
      // masque d'écrêtage : les calques du dessus ne se voient que là où ce calque existe
      const alpha = tmp(w, h); ctx2d(alpha).drawImage(c, 0, 0);
      const cg = ctx2d(c);
      for (const x of vis) {
        const xc = layerCanvas(x, doc, t, w, h);
        cg.globalAlpha = x.opacity; cg.globalCompositeOperation = x.blend; cg.drawImage(xc, 0, 0); free(xc);
      }
      cg.globalAlpha = 1; cg.globalCompositeOperation = 'destination-in'; cg.drawImage(alpha, 0, 0); cg.globalCompositeOperation = 'source-over'; free(alpha);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = l.opacity; g.globalCompositeOperation = l.blend; g.drawImage(c, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; free(c); c = null as unknown as HTMLCanvasElement;
    i = j - 1;
  }
}
/** calque de réglage : modifie tout ce qui est déjà dessiné dessous (dans son groupe) */
function applyAdjust(l: Layer & { type: 'adjust' }, _doc: Doc, t: Target, w: number, h: number) {
  const g = t.g, src = tmp(w, h), sg = ctx2d(src); sg.drawImage(g.canvas, 0, 0);
  const css = cssFilter(l.adj, t.s); let res = src;
  if (css) { const c = tmp(w, h), cg = ctx2d(c); cg.filter = css; cg.drawImage(src, 0, 0); cg.filter = 'none'; res = c; }
  const px = pixelPass(res, l.adj, 1, Math.min(_doc.w, _doc.h) * t.s); if (px) { if (res !== src) free(res); res = px; }
  if (res === src) { free(src); return; }
  // masque du réglage : il ne s'applique qu'à certains endroits
  if ((l.mask && l.mask.on) || (l.vmask && l.vmask.length)) {
    const rg = ctx2d(res), lt: Target = { g: rg, ox: t.ox, oy: t.oy, s: t.s };
    if (l.mask && l.mask.on) { setT(lt); rg.globalCompositeOperation = l.mask.inv ? 'destination-out' : 'destination-in'; rg.drawImage(l.mask.cv, l.mask.x, l.mask.y); }
    if (l.vmask && l.vmask.length) { setT(lt); rg.globalCompositeOperation = 'destination-in'; rg.fill(subPathsToPath(l.vmask), 'evenodd'); }
    rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over';
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = l.opacity; g.globalCompositeOperation = l.blend === 'source-over' ? 'source-over' : l.blend;
  if (!((l.mask && l.mask.on) || l.vmask)) { g.globalCompositeOperation = 'copy'; g.globalAlpha = 1; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = l.opacity; }
  g.drawImage(res, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (res !== src) free(res); free(src);
}

/** rendu d'une zone du document (fond compris) dans un canvas de la taille voulue */
export function renderRect(doc: Doc, r: Rect, scale: number, out?: HTMLCanvasElement, opts: { bg?: boolean; hide?: number } = {}): HTMLCanvasElement {
  const w = Math.max(1, Math.round(r.w * scale)), h = Math.max(1, Math.round(r.h * scale));
  const c = out || mkCanvas(w, h); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = ctx2d(c); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
  if (doc.bg && opts.bg !== false) { g.fillStyle = doc.bg; g.fillRect(0, 0, w, h); }
  const layers = opts.hide ? hideLayer(doc.layers, opts.hide) : doc.layers;
  compList(layers, doc, { g, ox: r.x, oy: r.y, s: scale }, w, h);
  return c;
}
const hideLayer = (list: Layer[], id: number): Layer[] => list.map(l => l.id === id ? { ...l, visible: false } as Layer : l.type === 'group' ? { ...l, children: hideLayer(l.children, id) } : l);
/** image complète du document (export, aperçu) */
export const renderDoc = (doc: Doc, scale = 1, bg = true) => renderRect(doc, { x: 0, y: 0, w: doc.w, h: doc.h }, scale, undefined, { bg });

/* ---------- image composée du document, mise à jour par zones (affichage) ---------- */
export class Composite {
  cv: HTMLCanvasElement; dirty: Rect | null = null;
  constructor(public doc: Doc) { this.cv = mkCanvas(doc.w, doc.h); this.all(); }
  all() { this.dirty = { x: 0, y: 0, w: this.doc.w, h: this.doc.h }; }
  add(r: Rect) { const d = this.dirty; this.dirty = d ? { x: Math.min(d.x, r.x), y: Math.min(d.y, r.y), w: Math.max(d.x + d.w, r.x + r.w) - Math.min(d.x, r.x), h: Math.max(d.y + d.h, r.y + r.h) - Math.min(d.y, r.y) } : { ...r }; }
  /** zone d'un calque (avec ses effets) à redessiner */
  layer(l: Layer) { const m = fxMargin(l.fx) + (l.type === 'text' || l.type === 'shape' ? 8 : 2); this.add(rectGrow(layerBounds(l, this.doc), m)); }
  update(): Rect | null {
    const doc = this.doc;
    if (this.cv.width !== doc.w || this.cv.height !== doc.h) { this.cv.width = doc.w; this.cv.height = doc.h; this.all(); }
    if (!this.dirty) return null;
    const r0 = rectInt(this.dirty, { x: 0, y: 0, w: doc.w, h: doc.h }); this.dirty = null; if (!r0) return null;
    const r = { x: Math.floor(r0.x), y: Math.floor(r0.y), w: Math.ceil(r0.x + r0.w) - Math.floor(r0.x), h: Math.ceil(r0.y + r0.h) - Math.floor(r0.y) };
    const part = renderRect(doc, r, 1, tmp(r.w, r.h));
    const g = ctx2d(this.cv); g.clearRect(r.x, r.y, r.w, r.h); g.drawImage(part, 0, 0, r.w, r.h, r.x, r.y, r.w, r.h); free(part);
    return r;
  }
}

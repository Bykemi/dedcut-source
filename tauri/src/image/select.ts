// DedCut Image — sélections : masque de sélection du document (canvas de la taille de l'image, alpha = sélectionné).
// Chaque opération crée un NOUVEAU canvas (jamais modifié sur place) : l'historique garde simplement l'ancien.
import { Doc, Rect, mkCanvas, ctx2d, SubPath, Layer, newRaster, findLayer } from './doc';
import { floodMask, maskToCanvas } from './pixels';
import { subPathsToPath } from './paint';
import { over } from './view';

export type SelOp = 'new' | 'add' | 'sub' | 'int';
export const selection = { op: 'new' as SelOp, feather: 0, aa: true, tol: 32, contiguous: true, all: true };
type DocSel = Doc & { selMask?: HTMLCanvasElement | null; selLast?: HTMLCanvasElement | null; selSaved?: { name: string; cv: HTMLCanvasElement }[] };
const D = (d: Doc) => d as DocSel;
export const getSel = (d: Doc | null) => (d ? D(d).selMask || null : null);

/** zone occupée par la sélection (null = rien de sélectionné) */
export function selBounds(cv: HTMLCanvasElement): Rect | null {
  const w = cv.width, h = cv.height, a = ctx2d(cv, true).getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
/** contour de la sélection (pointillés noirs et blancs) pour l'affichage */
function edgeOf(cv: HTMLCanvasElement): HTMLCanvasElement {
  const w = cv.width, h = cv.height, a = ctx2d(cv, true).getImageData(0, 0, w, h).data, out = mkCanvas(w, h), g = ctx2d(out), img = g.createImageData(w, h), o = img.data;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] >= 128;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = inside(x, y); if (!i) continue;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { const k = (y * w + x) * 4, wv = ((x + y) >> 2) & 1 ? 255 : 0; o[k] = o[k + 1] = o[k + 2] = wv; o[k + 3] = 255; }
  }
  g.putImageData(img, 0, 0); return out;
}
/** met à jour l'affichage de la sélection */
export function showSel(d: Doc | null) {
  const cv = getSel(d); over.sel = cv ? edgeOf(cv) : null; over.selRect = cv ? (selBounds(cv) || null) : null;
  if (cv && !over.selRect) { over.sel = null; }
}
/** remplace la sélection (le masque ne change jamais sur place : l'historique garde l'ancien) */
export function setSel(d: Doc, cv: HTMLCanvasElement | null) {
  const s = D(d); if (s.selMask) s.selLast = s.selMask;
  s.selMask = cv && selBounds(cv) ? cv : null; showSel(d);
}
export const blank = (d: Doc) => mkCanvas(d.w, d.h);
/** combine une nouvelle forme avec la sélection actuelle (nouvelle, ajouter, soustraire, intersection) */
export function combine(d: Doc, add: HTMLCanvasElement, op: SelOp = selection.op): HTMLCanvasElement {
  const cur = getSel(d); if (op === 'new' || !cur) return op === 'sub' || op === 'int' ? (cur ? merge(cur, add, op) : blank(d)) : add;
  return merge(cur, add, op);
}
function merge(cur: HTMLCanvasElement, add: HTMLCanvasElement, op: SelOp) {
  const c = mkCanvas(cur.width, cur.height), g = ctx2d(c); g.drawImage(cur, 0, 0);
  g.globalCompositeOperation = op === 'add' ? 'source-over' : op === 'sub' ? 'destination-out' : 'destination-in'; g.drawImage(add, 0, 0); return c;
}
const feathered = (cv: HTMLCanvasElement, f: number) => { if (f <= 0) return cv; const c = mkCanvas(cv.width, cv.height), g = ctx2d(c); g.filter = `blur(${f}px)`; g.drawImage(cv, 0, 0); return c; };
export function shapeMask(d: Doc, kind: 'rect' | 'ellipse', r: Rect, feather = selection.feather): HTMLCanvasElement {
  const c = blank(d), g = ctx2d(c); g.fillStyle = '#fff'; g.imageSmoothingEnabled = selection.aa;
  if (kind === 'rect') g.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)); else { g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.abs(r.w / 2), Math.abs(r.h / 2), 0, 0, Math.PI * 2); g.fill(); }
  return feathered(c, feather);
}
export function polyMask(d: Doc, pts: [number, number][], feather = selection.feather): HTMLCanvasElement {
  const c = blank(d), g = ctx2d(c); g.fillStyle = '#fff'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill('evenodd');
  return feathered(c, feather);
}
export function pathMask(d: Doc, paths: SubPath[], m: DOMMatrix): HTMLCanvasElement {
  const c = blank(d), g = ctx2d(c); g.fillStyle = '#fff'; g.setTransform(m); g.fill(subPathsToPath(paths), 'evenodd'); return c;
}
/** baguette magique / plage de couleurs */
export function wandMask(d: Doc, src: HTMLCanvasElement, ox: number, oy: number, x: number, y: number, tol: number, contiguous: boolean): HTMLCanvasElement {
  const img = ctx2d(src, true).getImageData(0, 0, src.width, src.height), m = floodMask(img, Math.floor(x - ox), Math.floor(y - oy), tol, contiguous);
  const mc = maskToCanvas(m, src.width, src.height, selection.aa ? .5 : 0), c = blank(d); ctx2d(c).drawImage(mc, ox, oy); return feathered(c, selection.feather);
}
export function colorRange(d: Doc, src: HTMLCanvasElement, color: [number, number, number], tol: number, fuzzy = true): HTMLCanvasElement {
  const w = src.width, h = src.height, s = ctx2d(src, true).getImageData(0, 0, w, h).data, c = blank(d), g = ctx2d(c), img = g.createImageData(w, h), o = img.data;
  for (let i = 0; i < w * h; i++) {
    const dr = s[i * 4] - color[0], dg = s[i * 4 + 1] - color[1], db = s[i * 4 + 2] - color[2], dist = Math.sqrt(dr * dr + dg * dg + db * db) / 1.732;
    const a = fuzzy ? Math.max(0, Math.min(1, 1 - (dist - tol * .6) / (tol * .8 + 1))) : dist <= tol ? 1 : 0;
    if (a > 0) { o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = 255; o[i * 4 + 3] = Math.round(a * 255 * s[i * 4 + 3] / 255); }
  }
  g.putImageData(img, 0, 0); return c;
}
/* ---------- modifier la sélection ---------- */
export function invertSel(d: Doc): HTMLCanvasElement { const c = blank(d), g = ctx2d(c); g.fillStyle = '#fff'; g.fillRect(0, 0, d.w, d.h); const cur = getSel(d); if (cur) { g.globalCompositeOperation = 'destination-out'; g.drawImage(cur, 0, 0); } return c; }
export function allSel(d: Doc): HTMLCanvasElement { const c = blank(d), g = ctx2d(c); g.fillStyle = '#fff'; g.fillRect(0, 0, d.w, d.h); return c; }
/** agrandir (n > 0) ou réduire (n < 0) de n pixels : flou puis seuil */
export function growSel(cv: HTMLCanvasElement, n: number): HTMLCanvasElement {
  const w = cv.width, h = cv.height, b = mkCanvas(w, h), g = ctx2d(b, true); g.filter = `blur(${Math.abs(n) / 1.6}px)`; g.drawImage(cv, 0, 0);
  const img = g.getImageData(0, 0, w, h), a = img.data, thr = n > 0 ? 18 : 238;
  for (let i = 3; i < a.length; i += 4) { const v = a[i] >= thr ? 255 : 0; a[i - 3] = a[i - 2] = a[i - 1] = 255; a[i] = v; }
  const c = mkCanvas(w, h); ctx2d(c).putImageData(img, 0, 0); return c;
}
export function featherSel(cv: HTMLCanvasElement, f: number) { return feathered(cv, f); }
/** lisser les bords (arrondit les angles et les petits trous) */
export function smoothSel(cv: HTMLCanvasElement, r: number) { return growSel(growSel(cv, r), -r); }
/**
 * Améliorer les contours : dans une bande autour du bord, l'opacité suit l'image (couleur du sujet / couleur du fond),
 * ce qui garde les cheveux et les détails fins. Puis douceur, contraste et décalage du bord.
 */
export function refineSel(cv: HTMLCanvasElement, img: HTMLCanvasElement, o: { radius: number; smooth: number; feather: number; contrast: number; shift: number; hair: boolean }): HTMLCanvasElement {
  const w = cv.width, h = cv.height; let m = cv;
  if (o.smooth > 0) m = smoothSel(m, o.smooth);
  if (o.shift) m = growSel(m, o.shift);
  if (o.hair && o.radius > 0) {
    const inner = growSel(m, -o.radius), outer = growSel(m, o.radius);
    const A = ctx2d(m, true).getImageData(0, 0, w, h).data, I = ctx2d(inner, true).getImageData(0, 0, w, h).data, Ou = ctx2d(outer, true).getImageData(0, 0, w, h).data;
    const src = mkCanvas(w, h); ctx2d(src).drawImage(img, 0, 0); const P = ctx2d(src, true).getImageData(0, 0, w, h).data;
    // couleurs moyennes du sujet (dans inner) et du fond (hors outer), par blocs de 32 px pour suivre les variations
    const B = 32, bw = Math.ceil(w / B), bh = Math.ceil(h / B), fg = new Float32Array(bw * bh * 4), bg = new Float32Array(bw * bh * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, b = (Math.floor(y / B) * bw + Math.floor(x / B)) * 4;
      if (I[i + 3] > 128) { fg[b] += P[i]; fg[b + 1] += P[i + 1]; fg[b + 2] += P[i + 2]; fg[b + 3]++; }
      else if (Ou[i + 3] < 128) { bg[b] += P[i]; bg[b + 1] += P[i + 1]; bg[b + 2] += P[i + 2]; bg[b + 3]++; }
    }
    const avg = (arr: Float32Array, bx: number, by: number): [number, number, number] | null => {
      for (let r = 0; r < 4; r++) { let s0 = 0, s1 = 0, s2 = 0, n = 0; for (let yy = by - r; yy <= by + r; yy++) for (let xx = bx - r; xx <= bx + r; xx++) { if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue; const k = (yy * bw + xx) * 4; s0 += arr[k]; s1 += arr[k + 1]; s2 += arr[k + 2]; n += arr[k + 3]; } if (n > 20) return [s0 / n, s1 / n, s2 / n]; }
      return null;
    };
    const out = mkCanvas(w, h), og = ctx2d(out), res = og.createImageData(w, h), R = res.data;
    const cache = new Map<number, [[number, number, number] | null, [number, number, number] | null]>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; let a = A[i + 3];
      if (I[i + 3] <= 128 && Ou[i + 3] >= 128) {
        const bi = Math.floor(y / B) * bw + Math.floor(x / B); let pair = cache.get(bi); if (!pair) { pair = [avg(fg, bi % bw, Math.floor(bi / bw)), avg(bg, bi % bw, Math.floor(bi / bw))]; cache.set(bi, pair); }
        const [F, G] = pair;
        if (F && G) { const fx = F[0] - G[0], fy = F[1] - G[1], fz = F[2] - G[2], den = fx * fx + fy * fy + fz * fz; if (den > 300) { const tt = ((P[i] - G[0]) * fx + (P[i + 1] - G[1]) * fy + (P[i + 2] - G[2]) * fz) / den; a = Math.max(0, Math.min(255, tt * 255)); } }
      }
      R[i] = R[i + 1] = R[i + 2] = 255; R[i + 3] = a;
    }
    og.putImageData(res, 0, 0); m = out;
  }
  if (o.feather > 0) m = feathered(m, o.feather);
  if (o.contrast > 0) {
    const g = ctx2d(m, true), d = g.getImageData(0, 0, w, h), a = d.data, k = 1 + o.contrast / 25;
    for (let i = 3; i < a.length; i += 4) a[i] = Math.max(0, Math.min(255, (a[i] - 128) * k + 128));
    const c = mkCanvas(w, h); ctx2d(c).putImageData(d, 0, 0); m = c;
  }
  return m;
}
/** sélection → découpe du calque dans une copie (pour la poser dans un nouveau calque) */
export function selClip(ox: number, oy: number, w: number, h: number): HTMLCanvasElement | null {
  const cv = getSel(curDoc()); if (!cv) return null; const c = mkCanvas(w, h); ctx2d(c).drawImage(cv, -ox, -oy); return c;
}
let docRef: () => Doc | null = () => null;
export const setDocRef = (f: () => Doc | null) => { docRef = f; };
const curDoc = () => docRef();
/** copie (ou coupe) la partie sélectionnée d'un calque de pixels dans un nouveau calque */
export function selToLayer(d: Doc, l: Layer, cut: boolean, name: string): Layer | null {
  if (l.type !== 'raster') return null; const sel = getSel(d); if (!sel) return null;
  const r = newRaster(name, d.w, d.h), g = ctx2d(r.cv); g.drawImage(l.cv, l.x, l.y); g.globalCompositeOperation = 'destination-in'; g.drawImage(sel, 0, 0);
  if (cut) { const lg = ctx2d(l.cv); lg.save(); lg.globalCompositeOperation = 'destination-out'; lg.drawImage(sel, -l.x, -l.y); lg.restore(); }
  const f = findLayer(d, l.id); if (f) f.list.splice(f.list.indexOf(l) + 1, 0, r); d.sel = [r.id]; return r;
}
/** contour d'une sélection → tracé (points du bord simplifiés) */
export function selToPath(cv: HTMLCanvasElement): SubPath[] {
  const w = cv.width, h = cv.height, a = ctx2d(cv, true).getImageData(0, 0, w, h).data, on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] >= 128;
  const seen = new Set<number>(), out: SubPath[] = [];
  for (let y = 0; y < h && out.length < 64; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y) || on(x - 1, y) || seen.has(y * w + x)) continue;
    // suivi du bord (Moore), puis simplification
    const pts: [number, number][] = []; let cx = x, cy = y, dir = 0, guard = 0; const dx = [1, 1, 0, -1, -1, -1, 0, 1], dy = [0, 1, 1, 1, 0, -1, -1, -1];
    do {
      pts.push([cx, cy]); seen.add(cy * w + cx);
      let found = false; for (let k = 0; k < 8; k++) { const nd = (dir + 6 + k) % 8, nx = cx + dx[nd], ny = cy + dy[nd]; if (on(nx, ny)) { cx = nx; cy = ny; dir = nd; found = true; break; } }
      if (!found) break;
    } while ((cx !== x || cy !== y) && ++guard < w * h);
    if (pts.length < 8) continue;
    const simp = rdp(pts, 1.2);
    out.push({ closed: true, pts: simp.map(([px, py]) => ({ x: px + .5, y: py + .5, ix: 0, iy: 0, ox: 0, oy: 0, smooth: false })) });
  }
  return out;
}
function rdp(p: [number, number][], eps: number): [number, number][] {
  if (p.length < 3) return p; const [x0, y0] = p[0], [x1, y1] = p[p.length - 1]; let dm = 0, idx = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = Math.abs((y1 - y0) * p[i][0] - (x1 - x0) * p[i][1] + x1 * y0 - y1 * x0) / (Math.hypot(x1 - x0, y1 - y0) || 1); if (d > dm) { dm = d; idx = i; } }
  return dm > eps ? [...rdp(p.slice(0, idx + 1), eps).slice(0, -1), ...rdp(p.slice(idx), eps)] : [p[0], p[p.length - 1]];
}
export const savedSels = (d: Doc) => D(d).selSaved || (D(d).selSaved = []);
export const lastSel = (d: Doc) => D(d).selLast || null;

// DedCut Image — outils de sélection à la souris (rectangle, ellipse, lasso, baguette, pinceau de sélection)
// et outils de retouche (tampon, correcteur, densité −/+, flou / netteté au pinceau, yeux rouges, fluidité).
import { t } from '../i18n';
import { ed, toast } from './state';
import { Tools } from './tools';
import { over } from './view';
import { selAct } from './commands';
import * as S from './select';
import { mkCanvas, ctx2d, RasterLayer, Rect } from './doc';
import { Stroke } from './brush';

type P = { x: number; y: number };
type T = Tools & Record<string, unknown>;
const opOf = (e: PointerEvent): S.SelOp => e.shiftKey && e.altKey ? 'int' : e.shiftKey ? 'add' : e.altKey ? 'sub' : S.selection.op;
const inSel = (p: P) => { const c = S.getSel(ed.doc); if (!c || p.x < 0 || p.y < 0 || p.x >= c.width || p.y >= c.height) return false; return ctx2d(c, true).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data[3] > 128; };

Tools.extend({
  /* ---------- rectangle / ellipse ---------- */
  d_select(this: T, e: PointerEvent, p: P) {
    if (!e.shiftKey && !e.altKey && inSel(p)) { this.drag = { kind: 'selmove', p0: p, base: S.getSel(ed.doc) }; return; }
    this.drag = { kind: 'sel', p0: p, op: opOf(e) };
  },
  m_sel(this: T, e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P }; let w = p.x - D.p0.x, h = p.y - D.p0.y;
    if (e.shiftKey && !(this.drag as { op?: string }).op?.match(/add/)) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
    over.marquee = { kind: ed.selShape, r: { x: Math.min(D.p0.x, D.p0.x + w), y: Math.min(D.p0.y, D.p0.y + h), w: Math.abs(w), h: Math.abs(h) } }; this.redraw();
  },
  u_sel(this: T) {
    const D = this.drag as unknown as { op: S.SelOp }, M = over.marquee; over.marquee = null;
    if (!M || M.kind === 'lasso' || M.r.w < 2 || M.r.h < 2) { if (D.op === 'new' && S.getSel(ed.doc)) selAct('img.h.desel', () => null); return; }
    selAct('img.h.sel', d => S.combine(d, S.shapeMask(d, M.kind as 'rect' | 'ellipse', M.r), D.op));
  },
  m_selmove(this: T, _e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P; base: HTMLCanvasElement }, d = ed.doc!; const c = S.blank(d); ctx2d(c).drawImage(D.base, Math.round(p.x - D.p0.x), Math.round(p.y - D.p0.y));
    (d as typeof d & { selMask: HTMLCanvasElement }).selMask = c; S.showSel(d); this.redraw();
  },
  u_selmove(this: T) { const D = this.drag as unknown as { base: HTMLCanvasElement }, d = ed.doc!, moved = S.getSel(d); (d as typeof d & { selMask: HTMLCanvasElement }).selMask = D.base; selAct('img.h.selMove', () => moved); },
  /* ---------- lasso libre et polygonal ---------- */
  d_lasso(this: T, e: PointerEvent, p: P) {
    if (ed.lassoKind === 'poly') {
      const cur = over.marquee && over.marquee.kind === 'lasso' ? over.marquee.pts : null, z = ed.ds!.view.zoom;
      if (cur && cur.length > 2 && Math.hypot(cur[0][0] - p.x, cur[0][1] - p.y) < 8 / z) { (this as unknown as { polyFinish(): void }).polyFinish(); return; }
      if (!cur) { over.marquee = { kind: 'lasso', pts: [[p.x, p.y], [p.x, p.y]] }; (this as Record<string, unknown>).polyOp = opOf(e); } else cur.splice(cur.length - 1, 0, [p.x, p.y]);
      this.redraw(); return;
    }
    over.marquee = { kind: 'lasso', pts: [[p.x, p.y]] }; this.drag = { kind: 'lasso', op: opOf(e) };
  },
  m_lasso(this: T, _e: PointerEvent, p: P) { const m = over.marquee; if (m && m.kind === 'lasso') { m.pts.push([p.x, p.y]); this.redraw(); } },
  u_lasso(this: T) { const D = this.drag as unknown as { op: S.SelOp }, m = over.marquee; over.marquee = null; if (m && m.kind === 'lasso' && m.pts.length > 2) selAct('img.h.sel', d => S.combine(d, S.polyMask(d, m.pts), D.op)); },
  polyFinish(this: T) { const m = over.marquee; over.marquee = null; if (m && m.kind === 'lasso' && m.pts.length > 3) { const pts = m.pts.slice(0, -1), op = ((this as Record<string, unknown>).polyOp || 'new') as S.SelOp; selAct('img.h.sel', d => S.combine(d, S.polyMask(d, pts), op)); } this.redraw(); },
  /* ---------- baguette magique ---------- */
  d_wand(this: T, e: PointerEvent, p: P) {
    const d = ed.doc!, ds = ed.ds!, l = ed.layer; let src: HTMLCanvasElement, ox = 0, oy = 0;
    if (S.selection.all || !l || l.type !== 'raster') { ds.comp.update(); src = ds.comp.cv; } else { src = l.cv; ox = l.x; oy = l.y; }
    const op = opOf(e); selAct('img.h.sel', dd => S.combine(dd, S.wandMask(dd, src, ox, oy, p.x, p.y, S.selection.tol, S.selection.contiguous), op)); void d;
  },
  /* ---------- pinceau de sélection ---------- */
  d_selbrush(this: T, e: PointerEvent, p: P) {
    const d = ed.doc!, base = S.getSel(d), work = S.blank(d); if (base) ctx2d(work).drawImage(base, 0, 0);
    const sub = opOf(e) === 'sub', st = new Stroke(work, { ...ed.brush, size: ed.retouch.size, hard: .85, opacity: 1, flow: 1, color: '#ffffff', tip: 'round', sym: 'none' }, sub ? 'erase' : 'paint', { cx: 0, cy: 0 });
    st.add(p.x, p.y, 1); this.drag = { kind: 'selbr', st, work, base }; (this as unknown as { showBrushSel(): void }).showBrushSel();
  },
  showBrushSel(this: T) { const D = this.drag as unknown as { st: Stroke; work: HTMLCanvasElement }, d = ed.doc!, c = S.blank(d); D.st.preview(ctx2d(c)); (d as typeof d & { selMask: HTMLCanvasElement }).selMask = c; S.showSel(d); this.redraw(); },
  m_selbr(this: T, _e: PointerEvent, p: P) { const D = this.drag as unknown as { st: Stroke }; D.st.add(p.x, p.y, 1); (this as unknown as { showBrushSel(): void }).showBrushSel(); },
  u_selbr(this: T) { const D = this.drag as unknown as { st: Stroke; work: HTMLCanvasElement; base: HTMLCanvasElement | null }, d = ed.doc!; D.st.commit(); const res = D.work; (d as typeof d & { selMask: HTMLCanvasElement | null }).selMask = D.base; selAct('img.h.sel', () => res); },

  /* ---------- retouche ---------- */
  d_clone(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); }, d_heal(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); },
  d_dodge(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); }, d_burn(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); },
  d_blurb(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); }, d_sharpen(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); },
  d_liquify(this: T, e: PointerEvent, p: P) { retouchStart(this, e, p); },
  m_retouch(this: T, _e: PointerEvent, p: P) { retouchMove(this, p); },
  u_retouch(this: T) { const D = this.drag as unknown as { l: RasterLayer }; void D; ed.end(); },
  d_redeye(this: T, _e: PointerEvent, p: P) {
    const l = rasterOrWarn(); if (!l) return; const r = ed.retouch.size / 2, k = ed.retouch.strength;
    ed.act('img.h.redeye', tx => {
      tx.touch(l.cv); const x0 = Math.max(0, Math.floor(p.x - l.x - r)), y0 = Math.max(0, Math.floor(p.y - l.y - r)), w = Math.min(l.cv.width - x0, Math.ceil(r * 2)), h = Math.min(l.cv.height - y0, Math.ceil(r * 2)); if (w < 1 || h < 1) return false;
      const g = ctx2d(l.cv, true), img = g.getImageData(x0, y0, w, h), a = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dd = Math.hypot(x + x0 - (p.x - l.x), y + y0 - (p.y - l.y)); if (dd > r) continue; const i = (y * w + x) * 4, R = a[i], G = a[i + 1], B = a[i + 2];
        if (R > 60 && R > G * 1.4 && R > B * 1.4) { const f = Math.min(1, (R - Math.max(G, B)) / 80) * k * Math.min(1, (r - dd) / (r * .25 + 1)), m = (G + B) / 2; a[i] = R + (m * .9 - R) * f; } }
      g.putImageData(img, x0, y0);
    }, 'all');
  }
});
function rasterOrWarn(): RasterLayer | null {
  const l = ed.layer; if (!l) return null; if (l.locked) { toast(t('img.t.locked')); return null; }
  if (l.type !== 'raster') { toast(t('img.t.needPixels')); return null; } return l;
}
/* ---------- tampon / correcteur : point source (Alt + clic) ---------- */
const src = { set: false, x: 0, y: 0, dx: 0, dy: 0, aligned: false };
function retouchStart(tl: T, e: PointerEvent, p: P) {
  const tool = ed.tool;
  if ((tool === 'clone' || tool === 'heal') && e.altKey) { src.set = true; src.x = p.x; src.y = p.y; src.aligned = false; toast(t('img.t.cloneSrc')); return; }
  if (tool === 'clone' && !src.set) { toast(t('img.t.cloneNeedSrc')); return; }
  const l = rasterOrWarn(); if (!l) return;
  const tx = ed.begin('img.h.' + tool)!; ed.coverDoc(l, tx); tx.touch(l.cv);
  if ((tool === 'clone' || tool === 'heal') && src.set && (!ed.retouch.aligned || !src.aligned)) { src.dx = src.x - p.x; src.dy = src.y - p.y; src.aligned = true; }
  // image source figée au début du trait (on ne recopie pas ce qu'on vient de peindre)
  let sample: HTMLCanvasElement; const ds = ed.ds!;
  if (ed.retouch.sample === 'all' && (tool === 'clone' || tool === 'heal')) { ds.comp.update(); sample = mkCanvas(l.cv.width, l.cv.height); ctx2d(sample).drawImage(ds.comp.cv, -l.x, -l.y); }
  else { sample = mkCanvas(l.cv.width, l.cv.height); ctx2d(sample).drawImage(l.cv, 0, 0); }
  tl.drag = { kind: 'retouch', l, sample, last: null as P | null, orig: tool === 'liquify' ? (() => { const c = mkCanvas(l.cv.width, l.cv.height); ctx2d(c).drawImage(l.cv, 0, 0); return c; })() : null };
  retouchMove(tl, p);
}
function retouchMove(tl: T, p: P) {
  const D = tl.drag as unknown as { l: RasterLayer; sample: HTMLCanvasElement; last: P | null; orig: HTMLCanvasElement | null }; if (!D) return;
  const size = ed.retouch.size, step = Math.max(1, size * (ed.tool === 'liquify' ? .08 : .18)), last = D.last;
  const pts: P[] = []; if (!last) pts.push(p); else { const dd = Math.hypot(p.x - last.x, p.y - last.y); for (let k = step; k <= dd; k += step) pts.push({ x: last.x + (p.x - last.x) * k / dd, y: last.y + (p.y - last.y) * k / dd }); }
  for (const q of pts) { const r = dab(D, q, last || q); if (r) ed.ds!.comp.add({ x: r.x + D.l.x, y: r.y + D.l.y, w: r.w, h: r.h }); D.last = q; }
  if (!last && !pts.length) D.last = p; tl.redraw();
}
/** masque doux du pinceau (1 octet par pixel) */
function softMask(n: number, hard: number): Float32Array { const m = new Float32Array(n * n), r = n / 2; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = Math.hypot(x + .5 - r, y + .5 - r) / r; m[y * n + x] = d >= 1 ? 0 : d <= hard ? 1 : 1 - (d - hard) / (1 - hard); } return m; }
let maskCache: { n: number; h: number; m: Float32Array } | null = null;
function dab(D: { l: RasterLayer; sample: HTMLCanvasElement; orig: HTMLCanvasElement | null }, p: P, prev: P): Rect | null {
  const l = D.l, n = Math.max(2, Math.round(ed.retouch.size)), x0 = Math.round(p.x - l.x - n / 2), y0 = Math.round(p.y - l.y - n / 2);
  const W = l.cv.width, H = l.cv.height; if (x0 + n < 0 || y0 + n < 0 || x0 >= W || y0 >= H) return null;
  if (!maskCache || maskCache.n !== n || maskCache.h !== ed.retouch.hard) maskCache = { n, h: ed.retouch.hard, m: softMask(n, Math.min(.98, ed.retouch.hard)) };
  const M = maskCache.m, k = ed.retouch.strength, g = ctx2d(l.cv, true), dst = g.getImageData(x0, y0, n, n), d = dst.data, tool = ed.tool;
  const sel = S.getSel(ed.doc); let selA: Uint8ClampedArray | null = null;
  if (sel) selA = ctx2d(sel, true).getImageData(x0 + l.x, y0 + l.y, n, n).data;
  const out = new Uint8ClampedArray(d);
  if (tool === 'clone' || tool === 'heal') {
    const sx = Math.round(x0 + (src.set ? src.dx : 0)), sy = Math.round(y0 + (src.set ? src.dy : 0));
    let s: Uint8ClampedArray;
    if (tool === 'heal' && !src.set) s = inpaint(d, n, M); // correcteur sans source : réparation à partir du tour
    else s = ctx2d(D.sample, true).getImageData(sx, sy, n, n).data;
    if (tool === 'heal' && src.set) s = matchTone(s, d, n);
    for (let i = 0; i < n * n; i++) { const a = M[i] * (tool === 'clone' ? k : 1) * (selA ? selA[i * 4 + 3] / 255 : 1); if (!a) continue; for (let c = 0; c < 4; c++) out[i * 4 + c] = d[i * 4 + c] + (s[i * 4 + c] - d[i * 4 + c]) * a; }
  } else if (tool === 'dodge' || tool === 'burn') {
    const sign = tool === 'dodge' ? 1 : -1, rg = ed.retouch.range;
    for (let i = 0; i < n * n; i++) { const a = M[i] * k * .25 * (selA ? selA[i * 4 + 3] / 255 : 1); if (!a) continue; const L = (.299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]) / 255;
      const wgt = rg === 'shadow' ? Math.max(0, 1 - L * 2) : rg === 'high' ? Math.max(0, L * 2 - 1) : 1 - Math.abs(L - .5) * 2;
      for (let c = 0; c < 3; c++) { const v = d[i * 4 + c]; out[i * 4 + c] = sign > 0 ? v + (255 - v) * a * wgt : v - v * a * wgt; } }
  } else if (tool === 'blurb' || tool === 'sharpen') {
    const bl = blurPatch(d, n, Math.max(1, n / 16));
    for (let i = 0; i < n * n; i++) { const a = M[i] * k * (selA ? selA[i * 4 + 3] / 255 : 1); if (!a) continue; for (let c = 0; c < 4; c++) { const v = d[i * 4 + c], b = bl[i * 4 + c]; out[i * 4 + c] = tool === 'blurb' ? v + (b - v) * a : v + (v - b) * a * 1.5; } }
  } else if (tool === 'liquify') {
    const mode = ed.retouch.liq, vx = p.x - prev.x, vy = p.y - prev.y, all = ctx2d(l.cv, true).getImageData(Math.max(0, x0 - n), Math.max(0, y0 - n), Math.min(W, n * 3), Math.min(H, n * 3)), ax = Math.max(0, x0 - n), ay = Math.max(0, y0 - n), aw = all.width, ah = all.height, A = all.data;
    const O = mode === 'restore' && D.orig ? ctx2d(D.orig, true).getImageData(x0, y0, n, n).data : null;
    const read = (x: number, y: number, c: number) => { x = Math.max(0, Math.min(aw - 1, x - ax)); y = Math.max(0, Math.min(ah - 1, y - ay)); const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, x1 = Math.min(aw - 1, xi + 1), y1 = Math.min(ah - 1, yi + 1); return (A[(yi * aw + xi) * 4 + c] * (1 - fx) + A[(yi * aw + x1) * 4 + c] * fx) * (1 - fy) + (A[(y1 * aw + xi) * 4 + c] * (1 - fx) + A[(y1 * aw + x1) * 4 + c] * fx) * fy; };
    const cx = n / 2, cy = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, a = M[i] * k * (selA ? selA[i * 4 + 3] / 255 : 1); if (!a) continue; const X = x0 + x, Y = y0 + y; let sx = X, sy = Y;
      if (mode === 'push') { sx = X - vx * a * 1.2; sy = Y - vy * a * 1.2; }
      else if (mode === 'grow' || mode === 'shrink') { const s = (mode === 'grow' ? -1 : 1) * a * .12; sx = X + (x - cx) * s; sy = Y + (y - cy) * s; }
      else if (mode === 'twirl') { const ang = a * .12, dx = x - cx, dy = y - cy; sx = x0 + cx + dx * Math.cos(ang) - dy * Math.sin(ang); sy = y0 + cy + dx * Math.sin(ang) + dy * Math.cos(ang); }
      for (let c = 0; c < 4; c++) out[i * 4 + c] = mode === 'restore' && O ? d[i * 4 + c] + (O[i * 4 + c] - d[i * 4 + c]) * a * .5 : read(sx, sy, c);
    }
  }
  const img = new ImageData(out, n, n); g.putImageData(img, x0, y0); return { x: x0, y: y0, w: n, h: n };
}
function blurPatch(d: Uint8ClampedArray, n: number, r: number): Float32Array {
  const a = new Float32Array(d), b = new Float32Array(d.length), R = Math.max(1, Math.round(r));
  for (let pass = 0; pass < 2; pass++) for (const horiz of [true, false]) { const inp = pass === 0 && horiz ? a : horiz ? a : b, out = horiz ? b : a;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) { let s = 0, k = 0; for (let o = -R; o <= R; o++) { const ii = Math.min(n - 1, Math.max(0, i + o)); s += inp[(horiz ? j * n + ii : ii * n + j) * 4 + c]; k++; } out[(horiz ? j * n + i : i * n + j) * 4 + c] = s / k; } }
  return a;
}
/** correcteur : garde les détails de la source, prend la lumière et la couleur de l'endroit corrigé */
function matchTone(s: Uint8ClampedArray, d: Uint8ClampedArray, n: number): Uint8ClampedArray {
  const r = Math.max(2, n / 6), sl = blurPatch(s, n, r), dl = blurPatch(d, n, r), o = new Uint8ClampedArray(s);
  for (let i = 0; i < s.length; i++) o[i] = (i & 3) === 3 ? s[i] : s[i] - sl[i] + dl[i];
  return o;
}
/** réparation automatique d'une petite zone (poussière, bouton) : remplie à partir du tour, plus un peu de grain voisin */
function inpaint(d: Uint8ClampedArray, n: number, M: Float32Array): Uint8ClampedArray {
  const o = new Float32Array(d), known = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) known[i] = M[i] < .05 ? 1 : 0;
  for (let it = 0; it < n * 1.5; it++) for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const i = y * n + x; if (known[i]) continue;
    for (let c = 0; c < 4; c++) o[i * 4 + c] = (o[(i - 1) * 4 + c] + o[(i + 1) * 4 + c] + o[(i - n) * 4 + c] + o[(i + n) * 4 + c]) / 4;
  }
  const out = new Uint8ClampedArray(o), off = Math.max(2, Math.round(n * .6));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (known[i]) continue; const j = (y * n + Math.min(n - 1, (x + off) % n)), ref = M[j] < .05 ? j : i; for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, o[i * 4 + c] + (d[ref * 4 + c] - o[ref * 4 + c]) * .5)); }
  return out;
}

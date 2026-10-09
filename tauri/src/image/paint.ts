// DedCut Image — peintures (couleur, dégradé, motif), motifs fournis (dessinés par le code, originaux) et formes.
import { Gradient, Paint, PathPt, ShapeItem, SubPath, mkCanvas, ctx2d, rgba } from './doc';

/* ---------- dégradés ---------- */
export const GRAD_PRESETS: Gradient[] = [
  { kind: 'linear', angle: 90, stops: [{ o: 0, c: '#000000', a: 1 }, { o: 1, c: '#ffffff', a: 1 }] },
  { kind: 'linear', angle: 90, stops: [{ o: 0, c: '#ffffff', a: 1 }, { o: 1, c: '#ffffff', a: 0 }] },
  { kind: 'linear', angle: 135, stops: [{ o: 0, c: '#a78bfa', a: 1 }, { o: 1, c: '#22d3ee', a: 1 }] },
  { kind: 'linear', angle: 90, stops: [{ o: 0, c: '#f97316', a: 1 }, { o: .5, c: '#ec4899', a: 1 }, { o: 1, c: '#8b5cf6', a: 1 }] },
  { kind: 'linear', angle: 0, stops: [{ o: 0, c: '#ef4444', a: 1 }, { o: .17, c: '#f59e0b', a: 1 }, { o: .34, c: '#eab308', a: 1 }, { o: .5, c: '#22c55e', a: 1 }, { o: .67, c: '#06b6d4', a: 1 }, { o: .84, c: '#6366f1', a: 1 }, { o: 1, c: '#d946ef', a: 1 }] },
  { kind: 'radial', angle: 0, stops: [{ o: 0, c: '#fde68a', a: 1 }, { o: 1, c: '#b45309', a: 1 }] },
  { kind: 'linear', angle: 90, stops: [{ o: 0, c: '#0f172a', a: 1 }, { o: 1, c: '#38bdf8', a: 1 }] },
  { kind: 'linear', angle: 45, stops: [{ o: 0, c: '#fbbf24', a: 1 }, { o: .5, c: '#fef3c7', a: 1 }, { o: 1, c: '#b45309', a: 1 }] }
];
/** dégradé posé sur un rectangle (x, y, w, h) : l'angle part du centre, comme dans les logiciels d'image */
export function gradientFill(g: CanvasRenderingContext2D, gr: Gradient, x: number, y: number, w: number, h: number): CanvasGradient {
  const cx = x + w / 2, cy = y + h / 2, a = gr.angle * Math.PI / 180;
  let G: CanvasGradient;
  if (gr.kind === 'radial') G = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2);
  else if (gr.kind === 'conic') G = g.createConicGradient(a, cx, cy);
  else { const r = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2; G = g.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  for (const s of [...gr.stops].sort((p, q) => p.o - q.o)) G.addColorStop(Math.max(0, Math.min(1, s.o)), rgba(s.c, s.a));
  return G;
}
/** dégradé entre deux points (outil Dégradé) */
export function gradientBetween(g: CanvasRenderingContext2D, gr: Gradient, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const r = Math.hypot(x1 - x0, y1 - y0) || 1;
  const G = gr.kind === 'radial' ? g.createRadialGradient(x0, y0, 0, x0, y0, r) : gr.kind === 'conic' ? g.createConicGradient(Math.atan2(y1 - y0, x1 - x0), x0, y0) : g.createLinearGradient(x0, y0, x1, y1);
  for (const s of [...gr.stops].sort((p, q) => p.o - q.o)) G.addColorStop(Math.max(0, Math.min(1, s.o)), rgba(s.c, s.a));
  return G;
}

/* ---------- motifs (dessinés ici : aucun fichier extérieur) ---------- */
type PatFn = (g: CanvasRenderingContext2D, s: number) => void;
const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
export const PATTERNS: Record<string, { s: number; fn: PatFn }> = {
  checker: { s: 32, fn: (g, s) => { g.fillStyle = '#d4d4d8'; g.fillRect(0, 0, s, s); g.fillStyle = '#71717a'; g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); } },
  stripes: { s: 24, fn: (g, s) => { g.fillStyle = '#e5e7eb'; g.fillRect(0, 0, s, s); g.strokeStyle = '#6366f1'; g.lineWidth = s / 4; for (let i = -1; i < 3; i++) { g.beginPath(); g.moveTo(i * s / 2 - s, s); g.lineTo(i * s / 2 + s, -s + s); g.stroke(); } } },
  dots: { s: 20, fn: (g, s) => { g.fillStyle = '#fef3c7'; g.fillRect(0, 0, s, s); g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(s / 2, s / 2, s / 5, 0, 7); g.fill(); } },
  grid: { s: 24, fn: (g, s) => { g.fillStyle = '#f8fafc'; g.fillRect(0, 0, s, s); g.strokeStyle = '#94a3b8'; g.lineWidth = 1; g.strokeRect(.5, .5, s, s); } },
  noise: { s: 64, fn: (g, s) => { const d = g.createImageData(s, s); for (let i = 0; i < s * s; i++) { const v = 90 + rnd(i) * 120; d.data.set([v, v, v, 255], i * 4); } g.putImageData(d, 0, 0); } },
  paper: { s: 96, fn: (g, s) => { const d = g.createImageData(s, s); for (let i = 0; i < s * s; i++) { const v = 228 + (rnd(i) + rnd(i * 7 + 3)) * 12 - 12; d.data.set([v, v - 3, v - 10, 255], i * 4); } g.putImageData(d, 0, 0); } },
  bricks: { s: 48, fn: (g, s) => { g.fillStyle = '#b45309'; g.fillRect(0, 0, s, s); g.strokeStyle = '#fde68a'; g.lineWidth = 2; for (let r = 0; r < 4; r++) { const y = r * s / 4; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); const o = r % 2 ? s / 4 : 0; for (let x = o; x < s; x += s / 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s / 4); g.stroke(); } } } },
  waves: { s: 40, fn: (g, s) => { g.fillStyle = '#ecfeff'; g.fillRect(0, 0, s, s); g.strokeStyle = '#06b6d4'; g.lineWidth = 3; for (const y of [s / 4, 3 * s / 4]) { g.beginPath(); for (let x = 0; x <= s; x++) g.lineTo(x, y + Math.sin(x / s * Math.PI * 2) * s / 8); g.stroke(); } } },
  hearts: { s: 36, fn: (g, s) => { g.fillStyle = '#fdf2f8'; g.fillRect(0, 0, s, s); g.fillStyle = '#ec4899'; const c = s / 2, k = s / 5; g.beginPath(); g.moveTo(c, c + k); g.bezierCurveTo(c - 2 * k, c - k / 2, c - k, c - 2 * k, c, c - k); g.bezierCurveTo(c + k, c - 2 * k, c + 2 * k, c - k / 2, c, c + k); g.fill(); } },
  wood: { s: 128, fn: (g, s) => { const d = g.createImageData(s, s); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const v = Math.sin((x + Math.sin(y / 9) * 6) / 3.2) * .5 + .5, k = 0.75 + v * .25; d.data.set([166 * k, 112 * k, 64 * k, 255], (y * s + x) * 4); } g.putImageData(d, 0, 0); } }
};
const patCache = new Map<string, HTMLCanvasElement>();
export const userPatterns = new Map<string, HTMLCanvasElement>();
export function patternCanvas(name: string): HTMLCanvasElement | null {
  if (userPatterns.has(name)) return userPatterns.get(name)!;
  if (patCache.has(name)) return patCache.get(name)!;
  const p = PATTERNS[name]; if (!p) return null;
  const c = mkCanvas(p.s, p.s); p.fn(ctx2d(c, true), p.s); patCache.set(name, c); return c;
}
export function paintStyle(g: CanvasRenderingContext2D, p: Paint, x: number, y: number, w: number, h: number): string | CanvasGradient | CanvasPattern {
  if (p.kind === 'gradient' && p.grad) return gradientFill(g, p.grad, x, y, w, h);
  if (p.kind === 'pattern' && p.pattern) {
    const c = patternCanvas(p.pattern); const pat = c && g.createPattern(c, 'repeat');
    if (pat) { const s = p.scale || 1; pat.setTransform(new DOMMatrix().translateSelf(x, y).scaleSelf(s, s)); return pat; }
  }
  return p.color;
}

/* ---------- formes ---------- */
// formes personnalisées originales de DedCut, dessinées dans un carré 100 × 100
export const CUSTOM_SHAPES: Record<string, string> = {
  heart: 'M50 88C20 66 6 50 6 32C6 18 17 8 30 8C39 8 46 13 50 20C54 13 61 8 70 8C83 8 94 18 94 32C94 50 80 66 50 88Z',
  arrow: 'M6 38H58V14L94 50L58 86V62H6Z',
  bubble: 'M14 10H86C92 10 96 14 96 20V62C96 68 92 72 86 72H44L22 92V72H14C8 72 4 68 4 62V20C4 14 8 10 14 10Z',
  badge: 'M50 4L61 16L77 12L80 28L95 35L88 50L95 65L80 72L77 88L61 84L50 96L39 84L23 88L20 72L5 65L12 50L5 35L20 28L23 12L39 16Z',
  bolt: 'M58 4L18 56H46L38 96L82 40H54Z',
  cloud: 'M26 78C12 78 4 68 4 58C4 47 13 39 24 40C26 26 37 18 50 18C64 18 74 28 76 40C88 40 96 48 96 59C96 70 87 78 76 78Z',
  ribbon: 'M2 30H20V22H80V30H98L88 50L98 70H80V78H20V70H2L12 50Z',
  shield: 'M50 4L90 18V46C90 70 72 88 50 96C28 88 10 70 10 46V18Z',
  tag: 'M8 8H54L94 48L50 92L8 50ZM28 22A7 7 0 1 0 28 36A7 7 0 1 0 28 22Z',
  cross: 'M36 6H64V36H94V64H64V94H36V64H6V36H36Z',
  drop: 'M50 4C50 4 16 46 16 64C16 83 31 96 50 96C69 96 84 83 84 64C84 46 50 4 50 4Z',
  moon: 'M64 6C40 10 24 30 24 52C24 76 44 94 68 94C78 94 87 91 94 85C86 88 78 89 70 87C48 82 36 62 40 40C43 24 52 12 64 6Z',
  frame: 'M4 4H96V96H4ZM16 16V84H84V16Z',
  burst: 'M50 2L57 30L80 10L68 37L98 34L72 50L98 66L68 63L80 90L57 70L50 98L43 70L20 90L32 63L2 66L28 50L2 34L32 37L20 10L43 30Z',
  play: 'M22 8L90 50L22 92Z',
  chat2: 'M50 8C76 8 96 24 96 44C96 64 76 80 50 80C44 80 38 79 33 77L10 90L16 69C8 62 4 54 4 44C4 24 24 8 50 8Z'
};
const customCache = new Map<string, Path2D>();
function polyPath(p: Path2D, pts: [number, number][]) { pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); }
/** chemin Bézier (outil Plume) */
export function subPathsToPath(sps: SubPath[], p = new Path2D()): Path2D {
  for (const sp of sps) {
    const P = sp.pts; if (!P.length) continue;
    p.moveTo(P[0].x, P[0].y);
    const seg = (a: PathPt, b: PathPt) => p.bezierCurveTo(a.x + a.ox, a.y + a.oy, b.x + b.ix, b.y + b.iy, b.x, b.y);
    for (let i = 1; i < P.length; i++) seg(P[i - 1], P[i]);
    if (sp.closed && P.length > 1) { seg(P[P.length - 1], P[0]); p.closePath(); }
  }
  return p;
}
/** chemin d'une forme, centré sur 0 (coordonnées locales du calque) */
export function itemPath(it: ShapeItem): Path2D {
  const w = it.w, h = it.h, x = -w / 2 + it.ox, y = -h / 2 + it.oy, p = new Path2D();
  if (it.kind === 'rect') { const r = Math.min(it.r, w / 2, h / 2); if (r > 0) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h); }
  else if (it.kind === 'ellipse') p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (it.kind === 'polygon' || it.kind === 'star') {
    const n = Math.max(3, Math.round(it.sides)), pts: [number, number][] = [], star = it.kind === 'star';
    for (let i = 0; i < n * (star ? 2 : 1); i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / (n * (star ? 2 : 1)), k = star && i % 2 ? it.inner : 1;
      pts.push([x + w / 2 + Math.cos(a) * w / 2 * k, y + h / 2 + Math.sin(a) * h / 2 * k]);
    }
    polyPath(p, pts);
  } else if (it.kind === 'line') { p.moveTo(x, y + h / 2); p.lineTo(x + w, y + h / 2); }
  else if (it.kind === 'path' && it.paths) subPathsToPath(it.paths, p);
  else if (it.kind === 'custom' && it.custom && CUSTOM_SHAPES[it.custom]) {
    let src = customCache.get(it.custom); if (!src) { src = new Path2D(CUSTOM_SHAPES[it.custom]); customCache.set(it.custom, src); }
    p.addPath(src, new DOMMatrix().translateSelf(x, y).scaleSelf(w / 100, h / 100));
  }
  return p;
}
/** pointes de flèche d'une ligne */
export function arrowHeads(g: CanvasRenderingContext2D, it: ShapeItem, width: number) {
  const x0 = -it.w / 2 + it.ox, x1 = it.w / 2 + it.ox, y = it.oy, s = Math.max(10, width * 3.2);
  const head = (x: number, d: number) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - d * s, y - s * .6); g.lineTo(x - d * s, y + s * .6); g.closePath(); g.fill(); };
  if (it.arrow[1]) head(x1, 1); if (it.arrow[0]) head(x0, -1);
}

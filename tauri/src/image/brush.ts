// DedCut Image — moteur de peinture : touches (« tampons ») posées le long du trait dans un calque tampon,
// puis fusionnées avec l'opacité du trait (le trait ne dépasse jamais son opacité, comme sur papier).
import { mkCanvas, ctx2d, hexToRgb, Rect } from './doc';

export interface Tip { id: string; name: string; cv: HTMLCanvasElement | null; builtin: boolean }
export interface BrushOpts {
  size: number; hard: number; opacity: number; flow: number; spacing: number; color: string;
  tip: string; angle: number; round: number; scatter: number; jitter: number;
  pSize: boolean; pOpacity: boolean; smooth: number; sym: 'none' | 'v' | 'h' | 'vh' | 'radial'; symN: number; strength: number;
}
export const defBrush = (): BrushOpts => ({ size: 24, hard: .8, opacity: 1, flow: 1, spacing: .12, color: '#ffffff', tip: 'round', angle: 0, round: 1, scatter: 0, jitter: 0, pSize: true, pOpacity: false, smooth: .3, sym: 'none', symN: 6, strength: .6 });

/* ---------- formes de pinceau (dessinées ici) ---------- */
const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
function genTip(id: string): HTMLCanvasElement | null {
  const S = 128, c = mkCanvas(S, S), g = ctx2d(c, true), m = S / 2;
  if (id === 'square') { g.fillStyle = '#fff'; g.fillRect(8, 8, S - 16, S - 16); }
  else if (id === 'chalk') {
    const d = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const r = Math.hypot(x - m, y - m) / m, n = rnd(x * 131 + y * 7); const a = r < 1 ? (n > .35 + r * .5 ? 255 * (1 - r * .3) : 0) : 0; d.data.set([255, 255, 255, a], (y * S + x) * 4); }
    g.putImageData(d, 0, 0);
  } else if (id === 'spray') { g.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { const a = rnd(i) * 7, r = Math.sqrt(rnd(i + 99)) * m * .95; g.beginPath(); g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 1 + rnd(i + 7) * 2.2, 0, 7); g.fill(); } }
  else if (id === 'charcoal') {
    const d = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const r = Math.hypot((x - m) / .55, y - m) / m, n = rnd(Math.floor(y / 3) * 17 + x * .01) * .6 + rnd(x * 3 + y * 13) * .4; d.data.set([255, 255, 255, r < 1 ? Math.max(0, n - r * .4) * 255 : 0], (y * S + x) * 4); }
    g.putImageData(d, 0, 0);
  } else if (id === 'star') { g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? m * .42 : m * .95; g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); } g.fill(); }
  else if (id === 'leaf') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(m, m, m * .95, m * .38, -.6, 0, 7); g.fill(); }
  else if (id === 'flat') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(m, m, m * .95, m * .2, 0, 0, 7); g.fill(); }
  else if (id === 'hatch') { g.strokeStyle = '#fff'; g.lineWidth = 6; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 26, S); g.lineTo(i * 26 + S, 0); g.stroke(); } g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(m, m, m * .95, 0, 7); g.fill(); }
  else return null;
  return c;
}
export const BUILTIN_TIPS = ['round', 'square', 'flat', 'chalk', 'charcoal', 'spray', 'star', 'leaf', 'hatch'];
export const tips = new Map<string, Tip>(BUILTIN_TIPS.map(id => [id, { id, name: id, cv: null, builtin: true }]));
export function tipCanvas(id: string): HTMLCanvasElement | null {
  const t = tips.get(id); if (!t || id === 'round') return null;
  if (!t.cv) t.cv = genTip(id); return t.cv;
}
/** ajoute une forme de pinceau à partir d'une image (le gris devient l'opacité : noir = peint) */
export function addTipFromImage(name: string, img: CanvasImageSource & { width: number; height: number }): string {
  const S = Math.min(512, Math.max(img.width, img.height)), k = S / Math.max(img.width, img.height), c = mkCanvas(S, S), g = ctx2d(c, true);
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.drawImage(img, (S - img.width * k) / 2, (S - img.height * k) / 2, img.width * k, img.height * k);
  const d = g.getImageData(0, 0, S, S);
  for (let i = 0; i < d.data.length; i += 4) { const y = .299 * d.data[i] + .587 * d.data[i + 1] + .114 * d.data[i + 2], a = (255 - y) * d.data[i + 3] / 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; }
  g.putImageData(d, 0, 0);
  const id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4); tips.set(id, { id, name: name.slice(0, 40), cv: c, builtin: false }); return id;
}
/** pinceau GIMP (.gbr, format documenté et libre) */
export function readGbr(buf: ArrayBuffer): { name: string; cv: HTMLCanvasElement } | null {
  const v = new DataView(buf); if (buf.byteLength < 28) return null;
  const hs = v.getUint32(0), w = v.getUint32(8), h = v.getUint32(12), bpp = v.getUint32(16);
  if (hs < 28 || hs > 2048 || !w || !h || w > 4096 || h > 4096 || (bpp !== 1 && bpp !== 4) || hs + w * h * bpp > buf.byteLength) return null;
  const name = new TextDecoder().decode(new Uint8Array(buf, 28, Math.max(0, hs - 29))).replace(/\0+$/, '') || 'GIMP';
  const c = mkCanvas(w, h), g = ctx2d(c, true), d = g.createImageData(w, h), src = new Uint8Array(buf, hs);
  for (let i = 0; i < w * h; i++) { if (bpp === 1) d.data.set([0, 0, 0, src[i]], i * 4); else d.data.set([src[i * 4], src[i * 4 + 1], src[i * 4 + 2], src[i * 4 + 3]], i * 4); }
  g.putImageData(d, 0, 0); return { name, cv: c };
}

/* ---------- tampon coloré (mis en cache selon la taille, la dureté et la couleur) ---------- */
const stampCache = new Map<string, HTMLCanvasElement>();
function stamp(o: BrushOpts, size: number, pencil: boolean): HTMLCanvasElement {
  const s = Math.max(1, Math.round(size)), key = [o.tip, s, o.hard.toFixed(2), o.color, pencil, o.round.toFixed(2)].join('|');
  let c = stampCache.get(key); if (c) return c;
  if (stampCache.size > 60) stampCache.clear();
  c = mkCanvas(s, s); const g = ctx2d(c), r = s / 2, [R, G, B] = hexToRgb(o.color), tip = tipCanvas(o.tip);
  if (tip) {
    g.drawImage(tip, 0, 0, s, s * (o.round || 1)); g.globalCompositeOperation = 'source-in'; g.fillStyle = o.color; g.fillRect(0, 0, s, s);
  } else if (pencil || o.hard >= .999) {
    g.fillStyle = o.color; if (s <= 2) g.fillRect(0, 0, s, s); else { g.beginPath(); g.ellipse(r, r, r, r * (o.round || 1), 0, 0, 7); g.fill(); }
    if (pencil) { const d = g.getImageData(0, 0, s, s); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0; g.putImageData(d, 0, 0); }
  } else {
    const gr = g.createRadialGradient(r, r, 0, r, r, r), h = Math.max(0, Math.min(.98, o.hard));
    gr.addColorStop(0, `rgba(${R},${G},${B},1)`); gr.addColorStop(h, `rgba(${R},${G},${B},1)`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = gr; g.save(); g.translate(r, r); g.scale(1, o.round || 1); g.translate(-r, -r); g.beginPath(); g.arc(r, r, r, 0, 7); g.fill(); g.restore();
  }
  stampCache.set(key, c); return c;
}

export type StrokeMode = 'paint' | 'erase' | 'pencil' | 'smudge' | 'mask-add' | 'mask-sub';
/** un trait en cours sur un canvas de calque (coordonnées du canvas : le décalage du calque est déjà retiré) */
export class Stroke {
  buf: HTMLCanvasElement; bg: CanvasRenderingContext2D; dirty: Rect | null = null;
  private last: [number, number, number] | null = null; private dist = 0; private sm: [number, number] | null = null; private n = 0;
  private carry: HTMLCanvasElement | null = null;
  /** direction du stylet (degrés, tablette graphique) : oriente les formes de pinceau non rondes */
  private tilt: number | null = null;
  /** sélection (taille du canvas) : le trait ne sort pas de la zone sélectionnée */
  clip: HTMLCanvasElement | null = null;
  constructor(public cv: HTMLCanvasElement, public o: BrushOpts, public mode: StrokeMode, public sym: { cx: number; cy: number }) {
    this.buf = mkCanvas(cv.width, cv.height); this.bg = ctx2d(this.buf);
  }
  private mark(x: number, y: number, s: number) {
    const r = { x: x - s, y: y - s, w: 2 * s, h: 2 * s }, d = this.dirty;
    this.dirty = d ? { x: Math.min(d.x, r.x), y: Math.min(d.y, r.y), w: Math.max(d.x + d.w, r.x + r.w) - Math.min(d.x, r.x), h: Math.max(d.y + d.h, r.y + r.h) - Math.min(d.y, r.y) } : r;
  }
  private points(x: number, y: number): [number, number, number][] {
    const o = this.o, { cx, cy } = this.sym, out: [number, number, number][] = [[x, y, 0]];
    if (o.sym === 'v' || o.sym === 'vh') out.push([2 * cx - x, y, 0]);
    if (o.sym === 'h' || o.sym === 'vh') out.push([x, 2 * cy - y, 0]);
    if (o.sym === 'vh') out.push([2 * cx - x, 2 * cy - y, 0]);
    if (o.sym === 'radial') { const n = Math.max(2, o.symN), a0 = Math.atan2(y - cy, x - cx), r = Math.hypot(x - cx, y - cy); for (let i = 1; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, i * 360 / n]); } }
    return out;
  }
  private dab(x: number, y: number, p: number) {
    const o = this.o, pencil = this.mode === 'pencil', size = Math.max(1, o.size * (o.pSize ? Math.max(.08, p) : 1));
    const alpha = o.flow * (o.pOpacity ? p : 1), st = stamp(o, size, pencil), k = this.n++;
    for (const [px, py, rot] of this.points(x, y)) {
      let X = px, Y = py;
      if (o.scatter > 0) { X += (rnd(k * 3 + 1) - .5) * size * o.scatter * 2; Y += (rnd(k * 5 + 2) - .5) * size * o.scatter * 2; }
      const ang = (o.angle + rot + (this.tilt ?? 0) + (o.jitter > 0 ? (rnd(k * 7 + 3) - .5) * 360 * o.jitter : 0)) * Math.PI / 180;
      if (this.mode === 'smudge') { this.smudge(X, Y, size); continue; }
      const g = this.bg; g.save(); g.globalAlpha = Math.min(1, alpha);
      if (pencil) { g.imageSmoothingEnabled = false; X = Math.round(X - size / 2) + size / 2; Y = Math.round(Y - size / 2) + size / 2; }
      g.translate(X, Y); if (ang) g.rotate(ang); g.drawImage(st, -size / 2, -size / 2, size, size); g.restore();
      this.mark(X, Y, size);
    }
  }
  /** estompe : emporte la couleur sous le pinceau et la dépose un peu plus loin */
  private smudge(x: number, y: number, size: number) {
    const s = Math.max(2, Math.round(size)), g = ctx2d(this.cv);
    if (!this.carry) { this.carry = mkCanvas(s, s); ctx2d(this.carry).drawImage(this.cv, x - s / 2, y - s / 2, s, s, 0, 0, s, s); return; }
    if (this.carry.width !== s) { const c = mkCanvas(s, s); ctx2d(c).drawImage(this.carry, 0, 0, s, s); this.carry = c; }
    const m = mkCanvas(s, s), mg = ctx2d(m); mg.drawImage(this.carry, 0, 0);
    const sh = stamp({ ...this.o, color: '#000000', tip: 'round' }, s, false); mg.globalCompositeOperation = 'destination-in'; mg.drawImage(sh, 0, 0, s, s);
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, this.o.strength)); g.drawImage(m, x - s / 2, y - s / 2); g.restore();
    const cg = ctx2d(this.carry); cg.globalAlpha = 1 - this.o.strength * .9; cg.drawImage(this.cv, x - s / 2, y - s / 2, s, s, 0, 0, s, s); cg.globalAlpha = 1;
    this.mark(x, y, s);
  }
  /** nouveau point du trait (pression 0..1, inclinaison en degrés ou null) ; les touches sont espacées selon le réglage « espacement » */
  add(x: number, y: number, p: number, end = false, tilt: number | null = null) {
    this.tilt = tilt; const o = this.o, k = end ? 0 : Math.max(0, Math.min(.95, o.smooth)) * .92;
    if (!this.sm) this.sm = [x, y]; else { this.sm = [this.sm[0] + (x - this.sm[0]) * (1 - k), this.sm[1] + (y - this.sm[1]) * (1 - k)]; }
    const [sx, sy] = this.sm;
    if (!this.last) { this.dab(sx, sy, p); this.last = [sx, sy, p]; return; }
    const [lx, ly, lp] = this.last, d = Math.hypot(sx - lx, sy - ly), step = Math.max(.5, o.size * (o.pSize ? Math.max(.08, p) : 1) * Math.max(.02, o.spacing));
    let t = step - this.dist;
    while (t <= d) { const u = t / d; this.dab(lx + (sx - lx) * u, ly + (sy - ly) * u, lp + (p - lp) * u); t += step; }
    this.dist = d - (t - step); this.last = [sx, sy, p];
  }
  /** fin du trait : le tampon est posé sur le calque avec l'opacité du trait */
  commit() {
    if (this.mode === 'smudge') return;
    if (this.clip) { this.bg.save(); this.bg.globalCompositeOperation = 'destination-in'; this.bg.drawImage(this.clip, 0, 0); this.bg.restore(); }
    const g = ctx2d(this.cv); g.save(); g.globalAlpha = this.o.opacity;
    g.globalCompositeOperation = this.mode === 'erase' || this.mode === 'mask-sub' ? 'destination-out' : 'source-over';
    g.drawImage(this.buf, 0, 0); g.restore();
  }
  /** aperçu pendant le trait : le canvas du calque avec le trait en cours */
  preview(out: CanvasRenderingContext2D) {
    if (this.mode === 'smudge') { out.drawImage(this.cv, 0, 0); return; }
    out.drawImage(this.cv, 0, 0); out.save(); out.globalAlpha = this.o.opacity;
    out.globalCompositeOperation = this.mode === 'erase' || this.mode === 'mask-sub' ? 'destination-out' : 'source-over';
    if (this.clip) { const c = mkCanvas(this.buf.width, this.buf.height), g = ctx2d(c); g.drawImage(this.buf, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(this.clip, 0, 0); out.drawImage(c, 0, 0); } else out.drawImage(this.buf, 0, 0);
    out.restore();
  }
}

// DedCut Image — bibliothèque des filtres et réglages (lot 2). Tous sont « non destructifs » : posés sur un calque
// intelligent (l'image d'origine est gardée) ou dans un calque de réglage, modifiables et désactivables à tout moment.
import { useRef, useEffect } from 'react';
import { t } from '../i18n';
import { ed, ui, toast } from './state';
import { FilterDef, mkCanvas, ctx2d, hexToRgb, Fx } from './doc';
import { PIXEL, SPATIAL, defFilter } from './filters';
import { live } from './render';

type Fn = (d: Uint8ClampedArray, w: number, h: number, f: FilterDef, ref?: number) => void;
export interface Param { k: string; min: number; max: number; step?: number; unit?: string }
export interface FDef { group: string; adjust?: boolean; params: Param[]; make: () => FilterDef; special?: 'curves' | 'levels' | 'gradmap' | 'lut' | 'balance' | 'hsl' | 'bw' | 'duo' }
const P = (k: string, min: number, max: number, step = 1, unit = ''): Param => ({ k, min, max, step, unit });
const mk = (kind: string, v: number, v2?: number, p?: Record<string, unknown>) => (): FilterDef => ({ kind, v, v2, on: true, ...(p ? { p: structuredClone(p) } : {}) } as FilterDef);
const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;
const lum = (r: number, g: number, b: number) => .299 * r + .587 * g + .114 * b;
const pp = (f: FilterDef) => ((f as FilterDef & { p?: Record<string, unknown> }).p || {}) as Record<string, any>; // eslint-disable-line

/* ---------- outils de calcul ---------- */
/** flou gaussien rapide (3 passes de flou en boîte) sur un tableau RGBA */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  if (r < 1) return new Uint8ClampedArray(src);
  const R = Math.max(1, Math.round(r / 1.7)), inv = 1 / (2 * R + 1), W4 = w * 4, a = new Uint8ClampedArray(src), b = new Uint8ClampedArray(src.length);
  // fenêtre glissante : chaque ligne (puis toutes les colonnes ensemble, ligne par ligne) est lue une seule fois
  const passH = (inp: Uint8ClampedArray, out: Uint8ClampedArray) => {
    for (let y = 0; y < h; y++) {
      const row = y * W4; let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      for (let i = -R; i <= R; i++) { const k = row + (i < 0 ? 0 : i >= w ? w - 1 : i) * 4; s0 += inp[k]; s1 += inp[k + 1]; s2 += inp[k + 2]; s3 += inp[k + 3]; }
      for (let x = 0; x < w; x++) {
        const o = row + x * 4; out[o] = s0 * inv; out[o + 1] = s1 * inv; out[o + 2] = s2 * inv; out[o + 3] = s3 * inv;
        const xa = x + R + 1, xr = x - R, ka = row + (xa >= w ? w - 1 : xa) * 4, kr = row + (xr < 0 ? 0 : xr) * 4;
        s0 += inp[ka] - inp[kr]; s1 += inp[ka + 1] - inp[kr + 1]; s2 += inp[ka + 2] - inp[kr + 2]; s3 += inp[ka + 3] - inp[kr + 3];
      }
    }
  };
  const acc = new Uint32Array(W4);
  const passV = (inp: Uint8ClampedArray, out: Uint8ClampedArray) => {
    acc.fill(0);
    for (let i = -R; i <= R; i++) { const row = (i < 0 ? 0 : i >= h ? h - 1 : i) * W4; for (let j = 0; j < W4; j++) acc[j] += inp[row + j]; }
    for (let y = 0; y < h; y++) {
      const row = y * W4; for (let j = 0; j < W4; j++) out[row + j] = acc[j] * inv;
      const ya = y + R + 1, yr = y - R, ra = (ya >= h ? h - 1 : ya) * W4, rr = (yr < 0 ? 0 : yr) * W4;
      for (let j = 0; j < W4; j++) acc[j] += inp[ra + j] - inp[rr + j];
    }
  };
  for (let k = 0; k < 3; k++) { passH(a, b); passV(b, a); }
  return a;
}
/** lecture bilinéaire (pour les déformations) */
function sampler(s: Uint8ClampedArray, w: number, h: number) {
  return (x: number, y: number, o: Uint8ClampedArray, i: number) => {
    if (x < 0 || y < 0 || x > w - 1 || y > h - 1) { o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0; return; }
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
    for (let c = 0; c < 4; c++) { const a = s[(y0 * w + x0) * 4 + c], b = s[(y0 * w + x1) * 4 + c], cc = s[(y1 * w + x0) * 4 + c], d = s[(y1 * w + x1) * 4 + c]; o[i + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy; }
  };
}
/** déformation : pour chaque pixel de sortie, d'où lire dans l'image d'origine */
function warp(d: Uint8ClampedArray, w: number, h: number, map: (x: number, y: number) => [number, number]) {
  const s = new Uint8ClampedArray(d), get = sampler(s, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [sx, sy] = map(x, y); get(sx, sy, d, (y * w + x) * 4); }
}
/** courbe → table de 256 valeurs (interpolation douce entre les points) */
export function curveLUT(pts: [number, number][]): Uint8Array {
  const p = [...pts].sort((a, b) => a[0] - b[0]), out = new Uint8Array(256), n = p.length;
  const m: number[] = []; for (let i = 0; i < n; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)]; m.push((b[1] - a[1]) / ((b[0] - a[0]) || 1)); }
  for (let x = 0; x < 256; x++) {
    if (x <= p[0][0]) { out[x] = clamp(p[0][1]); continue; } if (x >= p[n - 1][0]) { out[x] = clamp(p[n - 1][1]); continue; }
    let i = 0; while (p[i + 1][0] < x) i++; const [x0, y0] = p[i], [x1, y1] = p[i + 1], hh = x1 - x0, tt = (x - x0) / hh, t2 = tt * tt, t3 = t2 * tt;
    out[x] = clamp((2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + tt) * hh * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * hh * m[i + 1]);
  }
  return out;
}
const HUES: Record<string, number> = { reds: 0, yellows: 60, greens: 120, cyans: 180, blues: 240, magentas: 300 };
function rgb2hsl(r: number, g: number, b: number): [number, number, number] { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, s, l]; }
function hsl2rgb(h: number, s: number, l: number): [number, number, number] { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }

/* ---------- filtres calculés sur les pixels ---------- */
const NEW: Record<string, Fn> = {
  levels: (d, _w, _h, f) => { const p = pp(f), inB = p.inB ?? 0, inW = p.inW ?? 255, g = p.gamma ?? 1, oB = p.outB ?? 0, oW = p.outW ?? 255, L = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { const v = Math.max(0, Math.min(1, (i - inB) / ((inW - inB) || 1))); L[i] = clamp(oB + Math.pow(v, 1 / g) * (oW - oB)); }
    for (let i = 0; i < d.length; i += 4) { d[i] = L[d[i]]; d[i + 1] = L[d[i + 1]]; d[i + 2] = L[d[i + 2]]; } },
  curves: (d, _w, _h, f) => { const p = pp(f), all = curveLUT(p.rgb || [[0, 0], [255, 255]]), R = curveLUT(p.r || [[0, 0], [255, 255]]), G = curveLUT(p.g || [[0, 0], [255, 255]]), B = curveLUT(p.b || [[0, 0], [255, 255]]);
    for (let i = 0; i < d.length; i += 4) { d[i] = R[all[d[i]]]; d[i + 1] = G[all[d[i + 1]]]; d[i + 2] = B[all[d[i + 2]]]; } },
  balance: (d, _w, _h, f) => { const p = pp(f), S = p.sh || [0, 0, 0], M = p.mid || [0, 0, 0], H = p.hi || [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { const l = lum(d[i], d[i + 1], d[i + 2]) / 255, ws = Math.max(0, 1 - l * 3), wh = Math.max(0, l * 3 - 2), wm = 1 - ws - wh;
      for (let c = 0; c < 3; c++) d[i + c] = clamp(d[i + c] + (S[c] * ws + M[c] * wm + H[c] * wh) * 1.2); } },
  hsl: (d, _w, _h, f) => { const p = pp(f), range = p.range || 'all', dh = p.h || 0, ds = (p.s || 0) / 100, dl = (p.l || 0) / 100, c0 = HUES[range];
    for (let i = 0; i < d.length; i += 4) { let [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); let k = 1;
      if (range !== 'all') { const dd = Math.min(Math.abs(h - c0), 360 - Math.abs(h - c0)); k = dd < 30 ? 1 : dd < 60 ? (60 - dd) / 30 : 0; k *= Math.min(1, s * 4); if (!k) continue; }
      h = (h + dh * k + 360) % 360; s = Math.max(0, Math.min(1, s + ds * k * (ds > 0 ? 1 - s : s))); l = Math.max(0, Math.min(1, l + dl * k * (dl > 0 ? 1 - l : l)));
      const [r, g, b] = hsl2rgb(h, s, l); d[i] = r; d[i + 1] = g; d[i + 2] = b; } },
  bw: (d, _w, _h, f) => { const p = pp(f), wr = (p.r ?? 40) / 100, wg = (p.g ?? 40) / 100, wb = (p.b ?? 20) / 100, tint = p.tint as string | undefined, ta = (p.ta ?? 0) / 100, [tr, tg, tb] = tint ? hexToRgb(tint) : [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { const v = clamp(d[i] * wr + d[i + 1] * wg + d[i + 2] * wb); d[i] = v + (tr * v / 255 - v) * ta; d[i + 1] = v + (tg * v / 255 - v) * ta; d[i + 2] = v + (tb * v / 255 - v) * ta; } },
  gradmap: (d, _w, _h, f) => { const st = ((pp(f).stops || [{ o: 0, c: '#000000' }, { o: 1, c: '#ffffff' }]) as { o: number; c: string }[]).slice().sort((a, b) => a.o - b.o), L: number[][] = [];
    for (let i = 0; i < 256; i++) { const x = i / 255; let k = 0; while (k < st.length - 2 && st[k + 1].o < x) k++; const a = st[k], b = st[Math.min(st.length - 1, k + 1)], tt = b.o > a.o ? Math.max(0, Math.min(1, (x - a.o) / (b.o - a.o))) : 0, A = hexToRgb(a.c), B = hexToRgb(b.c); L.push([A[0] + (B[0] - A[0]) * tt, A[1] + (B[1] - A[1]) * tt, A[2] + (B[2] - A[2]) * tt]); }
    const mix = f.v / 100; for (let i = 0; i < d.length; i += 4) { const c = L[Math.round(lum(d[i], d[i + 1], d[i + 2]))]; d[i] += (c[0] - d[i]) * mix; d[i + 1] += (c[1] - d[i + 1]) * mix; d[i + 2] += (c[2] - d[i + 2]) * mix; } },
  lut: (d, _w, _h, f) => { const p = pp(f), N = p.size as number, T = p.data as number[]; if (!N || !T || T.length < N * N * N * 3) return; const mix = f.v / 100, s = (N - 1) / 255;
    const at = (r: number, g: number, b: number, c: number) => T[((b * N + g) * N + r) * 3 + c];
    for (let i = 0; i < d.length; i += 4) { const r = d[i] * s, g = d[i + 1] * s, b = d[i + 2] * s, r0 = Math.floor(r), g0 = Math.floor(g), b0 = Math.floor(b), r1 = Math.min(N - 1, r0 + 1), g1 = Math.min(N - 1, g0 + 1), b1 = Math.min(N - 1, b0 + 1), fr = r - r0, fg = g - g0, fb = b - b0;
      for (let c = 0; c < 3; c++) { const v = ((at(r0, g0, b0, c) * (1 - fr) + at(r1, g0, b0, c) * fr) * (1 - fg) + (at(r0, g1, b0, c) * (1 - fr) + at(r1, g1, b0, c) * fr) * fg) * (1 - fb) + ((at(r0, g0, b1, c) * (1 - fr) + at(r1, g0, b1, c) * fr) * (1 - fg) + (at(r0, g1, b1, c) * (1 - fr) + at(r1, g1, b1, c) * fr) * fg) * fb; d[i + c] += (clamp(v * 255) - d[i + c]) * mix; } } },
  duo: (d, _w, _h, f) => { const p = pp(f), A = hexToRgb(p.a || '#1e1b4b'), B = hexToRgb(p.b || '#fbbf24'); for (let i = 0; i < d.length; i += 4) { const x = lum(d[i], d[i + 1], d[i + 2]) / 255; d[i] = A[0] + (B[0] - A[0]) * x; d[i + 1] = A[1] + (B[1] - A[1]) * x; d[i + 2] = A[2] + (B[2] - A[2]) * x; } },
  shadows: (d, w, h, f, ref) => { const bl = boxBlur(d, w, h, Math.max(4, (ref ?? Math.min(w, h)) / 40)), sh = f.v / 100, hi = (f.v2 || 0) / 100;
    for (let i = 0; i < d.length; i += 4) { const l = lum(bl[i], bl[i + 1], bl[i + 2]) / 255, k = 1 + sh * Math.max(0, 1 - l * 2.2) * 1.2 - hi * Math.max(0, l * 2.2 - 1.2) * .6; d[i] = clamp(d[i] * k); d[i + 1] = clamp(d[i + 1] * k); d[i + 2] = clamp(d[i + 2] * k); } },
  clarity: (d, w, h, f) => { const bl = boxBlur(d, w, h, Math.max(6, Math.min(w, h) / 50)), k = f.v / 100; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = clamp(d[i + c] + (d[i + c] - bl[i + c]) * k); },
  sharpen: (d, w, h, f) => { const bl = boxBlur(d, w, h, f.v2 || 1.5), k = f.v / 100, thr = pp(f).thr || 0; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const df = d[i + c] - bl[i + c]; if (Math.abs(df) >= thr) d[i + c] = clamp(d[i + c] + df * k); } },
  denoise: (d, w, h, f) => { const r = Math.max(1, Math.round(f.v / 25)), s = new Uint8ClampedArray(d), sig = 6 + f.v * .6;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; let wr = 0, ar = 0, ag = 0, ab = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy)), j = (yy * w + xx) * 4, dl = Math.abs(s[j] - s[i]) + Math.abs(s[j + 1] - s[i + 1]) + Math.abs(s[j + 2] - s[i + 2]), wt = Math.exp(-dl * dl / (2 * sig * sig)); wr += wt; ar += s[j] * wt; ag += s[j + 1] * wt; ab += s[j + 2] * wt; }
      d[i] = ar / wr; d[i + 1] = ag / wr; d[i + 2] = ab / wr; } },
  // médiane par histogramme glissant : on ne recompte que la colonne qui entre et celle qui sort
  median: (d, w, h, f) => { const r = Math.max(1, Math.round(f.v)), s = new Uint8ClampedArray(d), thr = f.v2 || 0, half = ((2 * r + 1) ** 2) >> 1, hist = new Int32Array(256);
    const cx = (v: number) => v < 0 ? 0 : v >= w ? w - 1 : v, cy = (v: number) => v < 0 ? 0 : v >= h ? h - 1 : v;
    for (let c = 0; c < 3; c++) for (let y = 0; y < h; y++) {
      hist.fill(0); for (let dy = -r; dy <= r; dy++) { const row = cy(y + dy) * w; for (let dx = -r; dx <= r; dx++) hist[s[(row + cx(dx)) * 4 + c]]++; }
      let m = 0, lt = 0; while (lt + hist[m] <= half) { lt += hist[m]; m++; }
      for (let x = 0; x < w; x++) {
        if (x > 0) { const xo = cx(x - r - 1), xi = cx(x + r);
          for (let dy = -r; dy <= r; dy++) { const row = cy(y + dy) * w, a = s[(row + xo) * 4 + c], b = s[(row + xi) * 4 + c]; hist[a]--; if (a < m) lt--; hist[b]++; if (b < m) lt++; }
          while (lt > half) { m--; lt -= hist[m]; } while (lt + hist[m] <= half) { lt += hist[m]; m++; } }
        const i = (y * w + x) * 4 + c; if (Math.abs(s[i] - m) > thr) d[i] = m;
      } } },
  grain: (d, w, _h, f) => { const k = f.v * 1.2, sz = Math.max(1, Math.round(f.v2 || 1)); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const cells = new Float32Array(Math.ceil(w / sz) * Math.ceil(d.length / 4 / w / sz) + 2);
    for (let i = 0; i < cells.length; i++) cells[i] = (rnd() - .5) * k; const cw = Math.ceil(w / sz);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) { const x = p % w, y = (p / w) | 0, n = cells[((y / sz) | 0) * cw + ((x / sz) | 0)]; d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n); } },
  mosaic: (d, w, h, f) => { const s = Math.max(2, Math.round(f.v)); for (let by = 0; by < h; by += s) for (let bx = 0; bx < w; bx += s) { let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; n++; }
    for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const i = (y * w + x) * 4; d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; d[i + 3] = a / n; } } },
  // flou de mouvement : décalages précalculés, lecture bilinéaire sans appel de fonction par échantillon
  motion: (d, w, h, f) => { const n = Math.max(2, Math.round(f.v)), a = (f.v2 || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), s = new Uint8ClampedArray(d), inv = 1 / n;
    const OX = new Int32Array(n), OY = new Int32Array(n), FX = new Float32Array(n), FY = new Float32Array(n);
    for (let k = 0; k < n; k++) { const o = k - n / 2, ox = dx * o, oy = dy * o; OX[k] = Math.floor(ox); OY[k] = Math.floor(oy); FX[k] = ox - OX[k]; FY[k] = oy - OY[k]; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0, al = 0;
      for (let k = 0; k < n; k++) {
        let x0 = x + OX[k], fx = FX[k], y0 = y + OY[k], fy = FY[k];
        if (x0 < 0) { x0 = 0; fx = 0; } else if (x0 > w - 1 || (x0 === w - 1 && fx > 0)) { x0 = w - 1; fx = 0; }
        if (y0 < 0) { y0 = 0; fy = 0; } else if (y0 > h - 1 || (y0 === h - 1 && fy > 0)) { y0 = h - 1; fy = 0; }
        const i00 = (y0 * w + x0) * 4, i10 = fx > 0 ? i00 + 4 : i00, i01 = fy > 0 ? i00 + w * 4 : i00, i11 = fy > 0 ? i10 + w * 4 : i10;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        r += s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11; g += s[i00 + 1] * w00 + s[i10 + 1] * w10 + s[i01 + 1] * w01 + s[i11 + 1] * w11;
        b += s[i00 + 2] * w00 + s[i10 + 2] * w10 + s[i01 + 2] * w01 + s[i11 + 2] * w11; al += s[i00 + 3] * w00 + s[i10 + 3] * w10 + s[i01 + 3] * w01 + s[i11 + 3] * w11;
      }
      const i = (y * w + x) * 4; d[i] = r * inv; d[i + 1] = g * inv; d[i + 2] = b * inv; d[i + 3] = al * inv; } },
  zoomblur: (d, w, h, f) => { const n = 14, k = f.v / 100 * .35, cx = w * ((pp(f).cx ?? 50) / 100), cy = h * ((pp(f).cy ?? 50) / 100), spin = (f.v2 || 0) * Math.PI / 180, s = new Uint8ClampedArray(d), get = sampler(s, w, h), tmp = new Uint8ClampedArray(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0, al = 0; for (let i = 0; i < n; i++) { const tt = i / (n - 1), sc = 1 - k * tt, a = spin * tt; const X = cx + ((x - cx) * Math.cos(a) - (y - cy) * Math.sin(a)) * sc, Y = cy + ((x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)) * sc; get(Math.max(0, Math.min(w - 1, X)), Math.max(0, Math.min(h - 1, Y)), tmp, 0); r += tmp[0]; g += tmp[1]; b += tmp[2]; al += tmp[3]; } const j = (y * w + x) * 4; d[j] = r / n; d[j + 1] = g / n; d[j + 2] = b / n; d[j + 3] = al / n; } },
  tiltshift: (d, w, h, f) => { const bl = boxBlur(d, w, h, f.v), c = h * ((f.v2 ?? 50) / 100), band = h * ((pp(f).band ?? 20) / 100), fall = h * .25;
    for (let y = 0; y < h; y++) { const dd = Math.max(0, Math.abs(y - c) - band / 2), k = Math.min(1, dd / fall); if (!k) continue; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; for (let ch = 0; ch < 4; ch++) d[i + ch] += (bl[i + ch] - d[i + ch]) * k; } } },
  vignette: (d, w, h, f) => { const k = f.v / 100, sz = (f.v2 ?? 50) / 100, cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = Math.hypot(x - cx, y - cy) / R, v = Math.max(0, (r - sz) / (1 - sz + 1e-6)), m = 1 - k * v * v; const i = (y * w + x) * 4; if (k >= 0) { d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; } else { const u = -k * v * v; d[i] += (255 - d[i]) * u; d[i + 1] += (255 - d[i + 1]) * u; d[i + 2] += (255 - d[i + 2]) * u; } } },
  twirl: (d, w, h, f) => { const a = f.v * Math.PI / 180, cx = w / 2, cy = h / 2, R = Math.min(cx, cy); warp(d, w, h, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R) return [x, y]; const t = a * (1 - r / R) * (1 - r / R), c = Math.cos(t), s = Math.sin(t); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; }); },
  wave: (d, w, h, f) => { const A = f.v, L = Math.max(4, f.v2 || 60); warp(d, w, h, (x, y) => [x + Math.sin(y / L * Math.PI * 2) * A, y + Math.sin(x / L * Math.PI * 2) * A * .5]); },
  pinch: (d, w, h, f) => { const k = f.v / 100, cx = w / 2, cy = h / 2, R = Math.min(cx, cy); warp(d, w, h, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R; if (r >= 1 || !r) return [x, y]; const nr = k > 0 ? Math.pow(r, 1 + k) : Math.pow(r, 1 / (1 - k)); return [cx + dx / r * nr, cy + dy / r * nr]; }); },
  lenscorr: (d, w, h, f) => { const k = f.v / 100, ca = (f.v2 || 0) / 100, cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy), s = new Uint8ClampedArray(d), get = sampler(s, w, h), tmp = new Uint8ClampedArray(4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) { const m = 1 + k * r2 + (c - 1) * ca * .02; get(cx + dx * m * R, cy + dy * m * R, tmp, 0); d[i + c] = tmp[c]; if (c === 1) d[i + 3] = tmp[3]; } } },
  persp: (d, w, h, f) => { const v = f.v / 100, hz = (f.v2 || 0) / 100; warp(d, w, h, (x, y) => { const ny = y / h, nx = x / w, sx = 1 + v * (ny - .5) * -1, sy = 1 + hz * (nx - .5) * -1; return [w / 2 + (x - w / 2) * sx, h / 2 + (y - h / 2) * sy]; }); },
  chroma: (d, w, h, f) => { const o = Math.round(f.v), s = new Uint8ClampedArray(d); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, l = (y * w + Math.max(0, x - o)) * 4, r = (y * w + Math.min(w - 1, x + o)) * 4; d[i] = s[l]; d[i + 2] = s[r + 2]; } },
  scanlines: (d, w, h, f) => { const k = f.v / 100, sp = Math.max(2, Math.round(f.v2 || 3)); for (let y = 0; y < h; y++) if (y % sp === 0) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] *= 1 - k; d[i + 1] *= 1 - k; d[i + 2] *= 1 - k; } },
  halftone: (d, w, h, f) => { const s = Math.max(3, Math.round(f.v)), src = new Uint8ClampedArray(d); for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; }
    for (let by = 0; by < h; by += s) for (let bx = 0; bx < w; bx += s) { let l = 0, n = 0; for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const i = (y * w + x) * 4; l += lum(src[i], src[i + 1], src[i + 2]); n++; }
      const r = s / 2 * Math.sqrt(1 - l / n / 255) * 1.3, cx = bx + s / 2, cy = by + s / 2; for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const dd = Math.hypot(x + .5 - cx, y + .5 - cy), a = Math.max(0, Math.min(1, r - dd + .5)); if (a) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255 * (1 - a); } } } },
  emboss: (d, w, h, f) => { const s = new Uint8ClampedArray(d), k = f.v / 100; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = (y * w + x) * 4, a = ((y - 1) * w + x - 1) * 4, b = ((y + 1) * w + x + 1) * 4; for (let c = 0; c < 3; c++) d[i + c] = clamp(128 + (s[b + c] - s[a + c]) * 2 * k + (s[i + c] - 128) * (1 - k)); } },
  edges: (d, w, h) => { const s = new Uint8ClampedArray(d), L = (i: number) => lum(s[i], s[i + 1], s[i + 2]); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = (y * w + x) * 4, gx = L(i + 4) - L(i - 4), gy = L(i + w * 4) - L(i - w * 4), v = clamp(Math.hypot(gx, gy) * 2); d[i] = d[i + 1] = d[i + 2] = v; } },
  skin: (d, w, h, f) => { const bl = boxBlur(d, w, h, Math.max(2, Math.min(w, h) / 120 * (1 + f.v / 50))), k = f.v / 100;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], y = .299 * r + .587 * g + .114 * b, cb = 128 - .169 * r - .331 * g + .5 * b, cr = 128 + .5 * r - .419 * g - .081 * b;
      const skin = cr > 133 && cr < 180 && cb > 77 && cb < 130 && y > 40 ? 1 : 0; if (!skin) continue; const keep = Math.abs(d[i] - bl[i]) > 40 ? .3 : 1; for (let c = 0; c < 3; c++) d[i + c] += (bl[i + c] - d[i + c]) * k * keep * .85; } },
  dehaze: (d, _w, _h, f) => { const k = f.v / 100; let mn = 255; for (let i = 0; i < d.length; i += 16) mn = Math.min(mn, d[i], d[i + 1], d[i + 2]); const A = 240; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const v = d[i + c], tt = 1 - k * .7 * (Math.min(d[i], d[i + 1], d[i + 2]) - mn) / (A - mn + 1); d[i + c] = clamp((v - A) / Math.max(.25, tt) + A); } }
};
Object.entries(NEW).forEach(([k, fn]) => { PIXEL[k] = { n: k === 'curves' || k === 'levels' || k === 'balance' || k === 'hsl' || k === 'bw' || k === 'gradmap' || k === 'lut' || k === 'duo' ? -99999 : 0, fn }; });

/* ---------- liste des filtres et réglages (menu, panneau Propriétés) ---------- */
export const FILTERS: Record<string, FDef> = {
  brightness: { group: 'color', adjust: true, params: [P('v', 0, 200, 1, '%')], make: () => defFilter('brightness') },
  contrast: { group: 'color', adjust: true, params: [P('v', 0, 200, 1, '%')], make: () => defFilter('contrast') },
  exposure: { group: 'color', adjust: true, params: [P('v', -3, 3, .05, 'IL')], make: () => defFilter('exposure') },
  levels: { group: 'color', adjust: true, special: 'levels', params: [], make: mk('levels', 1, 0, { inB: 0, gamma: 1, inW: 255, outB: 0, outW: 255 }) },
  curves: { group: 'color', adjust: true, special: 'curves', params: [], make: mk('curves', 1, 0, { rgb: [[0, 0], [64, 58], [192, 200], [255, 255]], ch: 'rgb' }) },
  temp: { group: 'color', adjust: true, params: [P('v', -100, 100), P('v2', -100, 100)], make: () => defFilter('temp') },
  saturate: { group: 'color', adjust: true, params: [P('v', 0, 300, 1, '%')], make: () => defFilter('saturate') },
  vibrance: { group: 'color', adjust: true, params: [P('v', -100, 100)], make: () => defFilter('vibrance') },
  hue: { group: 'color', adjust: true, params: [P('v', -180, 180, 1, '°')], make: () => defFilter('hue') },
  hsl: { group: 'color', adjust: true, special: 'hsl', params: [], make: mk('hsl', 1, 0, { range: 'all', h: 0, s: 0, l: 0 }) },
  balance: { group: 'color', adjust: true, special: 'balance', params: [], make: mk('balance', 1, 0, { sh: [0, 0, 0], mid: [0, 0, 0], hi: [0, 0, 0] }) },
  shadows: { group: 'color', adjust: true, params: [P('v', 0, 100), P('v2', 0, 100)], make: mk('shadows', 40, 0) },
  bw: { group: 'color', adjust: true, special: 'bw', params: [], make: mk('bw', 1, 0, { r: 40, g: 40, b: 20, tint: '#d6a85b', ta: 0 }) },
  grayscale: { group: 'color', adjust: true, params: [P('v', 0, 100, 1, '%')], make: () => defFilter('grayscale') },
  sepia: { group: 'color', adjust: true, params: [P('v', 0, 100, 1, '%')], make: () => defFilter('sepia') },
  invert: { group: 'color', adjust: true, params: [P('v', 0, 100, 1, '%')], make: () => defFilter('invert') },
  posterize: { group: 'color', adjust: true, params: [P('v', 2, 32)], make: () => defFilter('posterize') },
  threshold: { group: 'color', adjust: true, params: [P('v', 0, 255)], make: () => defFilter('threshold') },
  gradmap: { group: 'color', adjust: true, special: 'gradmap', params: [P('v', 0, 100, 1, '%')], make: mk('gradmap', 100, 0, { stops: [{ o: 0, c: '#1e1b4b' }, { o: .5, c: '#db2777' }, { o: 1, c: '#fde68a' }] }) },
  duo: { group: 'color', adjust: true, special: 'duo', params: [], make: mk('duo', 1, 0, { a: '#1e1b4b', b: '#fbbf24' }) },
  lut: { group: 'color', adjust: true, special: 'lut', params: [P('v', 0, 100, 1, '%')], make: mk('lut', 100, 0, { name: '', size: 0, data: [] }) },
  blur: { group: 'blur', params: [P('v', 0, 60, .5, 'px')], make: () => ({ kind: 'blur', v: 6, on: true }) },
  motion: { group: 'blur', params: [P('v', 2, 120, 1, 'px'), P('v2', -180, 180, 1, '°')], make: mk('motion', 20, 0) },
  zoomblur: { group: 'blur', params: [P('v', 0, 100, 1, '%'), P('v2', -90, 90, 1, '°')], make: mk('zoomblur', 30, 0, { cx: 50, cy: 50 }) },
  tiltshift: { group: 'blur', params: [P('v', 1, 40, 1, 'px'), P('v2', 0, 100, 1, '%')], make: mk('tiltshift', 10, 50, { band: 20 }) },
  sharpen: { group: 'sharp', params: [P('v', 0, 300, 1, '%'), P('v2', .5, 10, .5, 'px')], make: mk('sharpen', 80, 1.5, { thr: 2 }) },
  clarity: { group: 'sharp', params: [P('v', -100, 100)], make: mk('clarity', 30) },
  denoise: { group: 'noise', params: [P('v', 1, 100)], make: mk('denoise', 35) },
  median: { group: 'noise', params: [P('v', 1, 6), P('v2', 0, 120)], make: mk('median', 1, 20) },
  grain: { group: 'noise', params: [P('v', 1, 100), P('v2', 1, 6)], make: mk('grain', 25, 1) },
  dehaze: { group: 'photo', params: [P('v', 0, 100)], make: mk('dehaze', 40) },
  skin: { group: 'photo', params: [P('v', 0, 100, 1, '%')], make: mk('skin', 40) },
  lenscorr: { group: 'photo', params: [P('v', -50, 50), P('v2', -100, 100)], make: mk('lenscorr', 0, 0) },
  persp: { group: 'photo', params: [P('v', -60, 60), P('v2', -60, 60)], make: mk('persp', 0, 0) },
  vignette: { group: 'photo', params: [P('v', -100, 100), P('v2', 0, 90)], make: mk('vignette', 50, 45) },
  twirl: { group: 'distort', params: [P('v', -720, 720, 1, '°')], make: mk('twirl', 180) },
  wave: { group: 'distort', params: [P('v', 0, 80, 1, 'px'), P('v2', 4, 400, 1, 'px')], make: mk('wave', 10, 80) },
  pinch: { group: 'distort', params: [P('v', -100, 100)], make: mk('pinch', 40) },
  mosaic: { group: 'stylize', params: [P('v', 2, 120, 1, 'px')], make: mk('mosaic', 16) },
  emboss: { group: 'stylize', params: [P('v', 0, 100, 1, '%')], make: mk('emboss', 100) },
  edges: { group: 'stylize', params: [], make: mk('edges', 1) },
  halftone: { group: 'retro', params: [P('v', 3, 40, 1, 'px')], make: mk('halftone', 8) },
  chroma: { group: 'retro', params: [P('v', 1, 40, 1, 'px')], make: mk('chroma', 4) },
  scanlines: { group: 'retro', params: [P('v', 0, 100, 1, '%'), P('v2', 2, 12, 1, 'px')], make: mk('scanlines', 35, 3) }
};
// réglages en pixels : réduits avec l'aperçu rapide
for (const [k, F] of Object.entries(FILTERS)) { const sp = F.params.filter(q => q.unit === 'px').map(q => q.k); if (sp.length && k !== 'blur') SPATIAL[k] = sp; }
export const FILTER_MENU = Object.entries(FILTERS).map(([id, f]) => ({ id, group: f.group }));

/** filtre choisi dans le menu : posé sur le calque actif (converti en calque intelligent si besoin, l'original reste intact) */
export async function openFilter(id: string) {
  const l = ed.layer, d = ed.doc; if (!l || !d) return; const F = FILTERS[id]; if (!F) return;
  if (l.type === 'adjust') { const def = F.make(); ed.act('img.h.filter', () => { l.adj.push(def); }, 'all'); ui.focusFilter = l.adj.length - 1; (await import('./pro')).recordFilter(id, def); }
  else if (l.type === 'group') { toast(t('img.t.groupFilter')); return; }
  else {
    let s = l;
    if (s.type === 'text' || s.type === 'shape') {
      const ask = (window as unknown as { askYes?: (m: string) => Promise<boolean> }).askYes;
      if (!(await (ask ? ask(t('img.q.rasterForFilter')) : Promise.resolve(window.confirm(t('img.q.rasterForFilter')))))) return;
      const r = ed.rasterize(s, true); if (!r) return; s = r;
    }
    if (s.type === 'raster') { const sm = ed.toSmart(s); if (!sm) { toast(t('img.t.emptyLayer')); return; } s = sm; }
    if (s.type !== 'smart') return; const sm = s;
    if (bigLayer(sm)) { toast(t('img.ai.working')); await new Promise(r => setTimeout(r, 60)); }
    const def = F.make(); ed.act('img.h.filter', () => { sm.filters.push(def); }, 'all'); ui.focusFilter = sm.filters.length - 1; (await import('./pro')).recordFilter(id, def);
  }
  ed.settings.panels.props = true; ed.emit();
}

/* ---------- réglages d'un filtre (panneau Propriétés) ---------- */
/** fin d'un réglage : on recalcule en pleine taille (l'aperçu réduit ne sert que pendant le mouvement) */
const bigLayer = (l: unknown) => { const s = l as { type?: string; src?: HTMLCanvasElement }; return s?.type === 'smart' && !!s.src && s.src.width * s.src.height > 3e6; };
const fullRes = () => { if (!live.fast) return; live.fast = false; const go = () => { ed.ds?.comp.all(); ed.emit(); }; if (bigLayer(ed.layer)) { toast(t('img.ai.working')); setTimeout(go, 60); } else go(); };
function LiveRange({ label, v, p, set }: { label: string; v: number; p: Param; set: (v: number) => void }) {
  return <label className="im-num" onPointerDown={() => { live.fast = true; ed.begin('img.h.filter'); }} onPointerUp={() => { ed.end(); fullRes(); }} onPointerCancel={fullRes}><span>{label}</span>
    <input type="range" min={p.min} max={p.max} step={p.step || 1} value={v} onChange={e => { if (!ed.busy) ed.begin('img.h.filter'); set(+e.target.value); ed.ds?.comp.all(); ed.emit(); }} />
    <input type="number" min={p.min} max={p.max} step={p.step || 1} value={+(+v).toFixed(2)} onChange={e => { const n = +e.target.value; if (isFinite(n)) ed.act('img.h.filter', () => set(Math.max(p.min, Math.min(p.max, n))), 'all'); }} />{p.unit && <em>{p.unit}</em>}</label>;
}
export function FilterEdit({ f }: { f: FilterDef }) {
  const F = FILTERS[f.kind], p = pp(f);
  if (!F) return null;
  const setP = (k: string, v: unknown) => { (f as FilterDef & { p: Record<string, unknown> }).p = { ...p, [k]: v }; };
  return <div className="im-fedit">
    {F.params.map(q => <LiveRange key={q.k} label={t('img.fp.' + f.kind + '.' + q.k)} v={(f as unknown as Record<string, number>)[q.k] ?? 0} p={q} set={v => { (f as unknown as Record<string, number>)[q.k] = v; }} />)}
    {F.special === 'levels' && <>{(['inB', 'gamma', 'inW', 'outB', 'outW'] as const).map(k => <LiveRange key={k} label={t('img.fp.levels.' + k)} v={p[k] ?? (k === 'gamma' ? 1 : k.endsWith('W') ? 255 : 0)} p={k === 'gamma' ? P(k, .1, 4, .01) : P(k, 0, 255)} set={v => setP(k, v)} />)}
      <button onClick={() => import('./autofix').then(m => m.autoLevels(f))}>{t('img.fp.auto')}</button></>}
    {F.special === 'curves' && <CurveEdit f={f} />}
    {F.special === 'balance' && (['sh', 'mid', 'hi'] as const).map(r => <div key={r}><small>{t('img.fp.balance.' + r)}</small>{[0, 1, 2].map(c => <LiveRange key={c} label={t('img.fp.balance.c' + c)} v={(p[r] || [0, 0, 0])[c]} p={P('c', -100, 100)} set={v => { const a = [...(p[r] || [0, 0, 0])]; a[c] = v; setP(r, a); }} />)}</div>)}
    {F.special === 'hsl' && <>
      <select value={p.range || 'all'} onChange={e => ed.act('img.h.filter', () => setP('range', e.target.value), 'all')}>{['all', ...Object.keys(HUES)].map(k => <option key={k} value={k}>{t('img.fp.hsl.' + k)}</option>)}</select>
      <LiveRange label={t('img.fp.hsl.h')} v={p.h || 0} p={P('h', -180, 180, 1, '°')} set={v => setP('h', v)} />
      <LiveRange label={t('img.fp.hsl.s')} v={p.s || 0} p={P('s', -100, 100)} set={v => setP('s', v)} />
      <LiveRange label={t('img.fp.hsl.l')} v={p.l || 0} p={P('l', -100, 100)} set={v => setP('l', v)} /></>}
    {F.special === 'bw' && <>{(['r', 'g', 'b'] as const).map(k => <LiveRange key={k} label={t('img.fp.bw.' + k)} v={p[k] ?? 33} p={P(k, -50, 150, 1, '%')} set={v => setP(k, v)} />)}
      <div className="im-row"><input type="color" value={p.tint || '#d6a85b'} onChange={e => ed.act('img.h.filter', () => setP('tint', e.target.value), 'all')} /><LiveRange label={t('img.fp.bw.ta')} v={p.ta || 0} p={P('ta', 0, 100, 1, '%')} set={v => setP('ta', v)} /></div></>}
    {F.special === 'duo' && <div className="im-row">{(['a', 'b'] as const).map(k => <input key={k} type="color" value={p[k] || '#000000'} onChange={e => ed.act('img.h.filter', () => setP(k, e.target.value), 'all')} />)}</div>}
    {F.special === 'gradmap' && <div className="im-row">{(p.stops as { o: number; c: string }[] || []).map((s, i) => <input key={i} type="color" value={s.c} title={Math.round(s.o * 100) + ' %'} onChange={e => ed.act('img.h.filter', () => { const st = [...(p.stops || [])]; st[i] = { ...st[i], c: e.target.value }; setP('stops', st); }, 'all')} />)}</div>}
    {F.special === 'lut' && <div className="im-row"><button onClick={() => loadCube(f)}>{t('img.fp.lut.load')}</button><small>{p.name || t('img.fp.lut.none')}</small></div>}
  </div>;
}
/** éditeur de courbe : cliquer pour ajouter un point, glisser pour le déplacer, double-clic pour l'enlever */
function CurveEdit({ f }: { f: FilterDef }) {
  const cv = useRef<HTMLCanvasElement>(null), p = pp(f), ch: string = p.ch || 'rgb', pts: [number, number][] = (p[ch] || [[0, 0], [255, 255]]);
  useEffect(() => {
    const c = cv.current; if (!c) return; const g = c.getContext('2d')!, S = c.width; g.clearRect(0, 0, S, S); g.fillStyle = '#111118'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#2a2a36'; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4, S); g.moveTo(0, i * S / 4); g.lineTo(S, i * S / 4); } g.stroke();
    const L = curveLUT(pts); g.strokeStyle = ch === 'r' ? '#ef4444' : ch === 'g' ? '#22c55e' : ch === 'b' ? '#3b82f6' : '#e4e4e7'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < 256; x++) { const X = x / 255 * S, Y = S - L[x] / 255 * S; if (x) g.lineTo(X, Y); else g.moveTo(X, Y); } g.stroke();
    g.fillStyle = '#fff'; for (const [x, y] of pts) { g.beginPath(); g.arc(x / 255 * S, S - y / 255 * S, 4, 0, 7); g.fill(); }
  });
  const toV = (e: React.PointerEvent | PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(255, (e.clientX - r.left) / r.width * 255))), Math.round(Math.max(0, Math.min(255, (1 - (e.clientY - r.top) / r.height) * 255)))] as [number, number]; };
  const setPts = (n: [number, number][]) => { (f as FilterDef & { p: Record<string, unknown> }).p = { ...p, [ch]: n }; ed.ds?.comp.all(); ed.emit(); };
  const down = (e: React.PointerEvent) => {
    const [x, y] = toV(e); let i = pts.findIndex(q => Math.abs(q[0] - x) < 10 && Math.abs(q[1] - y) < 14); ed.begin('img.h.filter');
    let list = pts.map(q => [...q] as [number, number]); if (i < 0) { list.push([x, y]); list.sort((a, b) => a[0] - b[0]); i = list.findIndex(q => q[0] === x && q[1] === y); setPts(list); }
    live.fast = true;
    const mv = (ev: PointerEvent) => { const [nx, ny] = toV(ev); list = list.map(q => [...q] as [number, number]); list[i] = [i === 0 ? 0 : i === list.length - 1 ? 255 : Math.max(list[i - 1][0] + 1, Math.min(list[i + 1][0] - 1, nx)), ny]; setPts(list); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); ed.end(); fullRes(); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const dbl = (e: React.MouseEvent) => { const r = cv.current!.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 255, i = pts.findIndex(q => Math.abs(q[0] - x) < 10); if (i > 0 && i < pts.length - 1) ed.act('img.h.filter', () => { (f as FilterDef & { p: Record<string, unknown> }).p = { ...p, [ch]: pts.filter((_, k) => k !== i) }; }, 'all'); };
  return <div className="im-curve">
    <div className="im-seg">{['rgb', 'r', 'g', 'b'].map(c => <button key={c} className={ch === c ? 'on' : ''} onClick={() => { (f as FilterDef & { p: Record<string, unknown> }).p = { ...p, ch: c }; ed.emit(); }}>{c.toUpperCase()}</button>)}</div>
    <canvas ref={cv} width={220} height={220} onPointerDown={down} onDoubleClick={dbl} />
  </div>;
}
/** fichier LUT .cube (format texte documenté) */
function loadCube(f: FilterDef) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.cube'; i.onchange = async () => {
    const file = i.files?.[0]; if (!file) return; const txt = await file.text(); let size = 0; const data: number[] = [];
    for (const line of txt.split(/\r?\n/)) { const s = line.trim(); if (!s || s.startsWith('#')) continue; const m = s.match(/^LUT_3D_SIZE\s+(\d+)/i); if (m) { size = +m[1]; continue; } if (/^[A-Z_]/i.test(s)) continue; const v = s.split(/\s+/).map(Number); if (v.length === 3 && v.every(isFinite)) data.push(...v); }
    if (!size || size > 65 || data.length < size * size * size * 3) { toast(t('img.t.badLut')); return; }
    ed.act('img.h.filter', () => { (f as FilterDef & { p: Record<string, unknown> }).p = { name: file.name, size, data: data.slice(0, size * size * size * 3).map(v => Math.round(v * 1000) / 1000) }; }, 'all');
  }; i.click();
}

/* ---------- chaînes de filtres et styles de calques réutilisables ---------- */
const CH = 'dedcut-image-chains', ST = 'dedcut-image-fxstyles';
const read = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
export const chains = () => read<{ n: string; list: FilterDef[] }>(CH);
export function saveChain(n: string, list: FilterDef[]) { const a = chains(); a.push({ n: n.slice(0, 40), list: structuredClone(list) }); try { localStorage.setItem(CH, JSON.stringify(a)); } catch { toast(t('img.t.storageFull')); } }
export function applyChain(list: FilterDef[], c: { list: FilterDef[] }) { list.push(...structuredClone(c.list)); }
export const fxStyles = () => read<{ n: string; fx: Fx[] }>(ST);
export function saveFxStyle(n: string, fx: Fx[]) { const a = fxStyles(); a.push({ n: n.slice(0, 40), fx: structuredClone(fx) }); try { localStorage.setItem(ST, JSON.stringify(a)); } catch { toast(t('img.t.storageFull')); } }
export { mkCanvas, ctx2d };

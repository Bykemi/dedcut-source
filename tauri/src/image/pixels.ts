// DedCut Image — opérations sur les pixels : remplissage (pot de peinture), rééchantillonnage, pipette.
import { mkCanvas, ctx2d } from './doc';

/** zone à remplir : pixels proches de la couleur du point (tolérance 0..255), voisins seulement ou dans toute l'image.
 *  Renvoie un masque (1 octet par pixel, 255 = dans la zone). */
export function floodMask(img: ImageData, x: number, y: number, tol: number, contiguous: boolean): Uint8Array {
  const { width: W, height: H, data: d } = img, out = new Uint8Array(W * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return out;
  const i0 = (y * W + x) * 4, r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3], t = tol * tol * 3;
  const near = (i: number) => { const p = i * 4, dr = d[p] - r0, dg = d[p + 1] - g0, db = d[p + 2] - b0, da = d[p + 3] - a0; return dr * dr + dg * dg + db * db + da * da * 1.2 <= t + 1; };
  if (!contiguous) { for (let i = 0; i < W * H; i++) if (near(i)) out[i] = 255; return out; }
  // remplissage par lignes (rapide, sans récursion)
  const stack = [x, y];
  while (stack.length) {
    const sy = stack.pop()!, sx = stack.pop()!; let lx = sx;
    while (lx >= 0 && !out[sy * W + lx] && near(sy * W + lx)) lx--;
    lx++; let up = false, dn = false;
    for (let cx = lx; cx < W && !out[sy * W + cx] && near(sy * W + cx); cx++) {
      out[sy * W + cx] = 255;
      if (sy > 0) { const n = near((sy - 1) * W + cx) && !out[(sy - 1) * W + cx]; if (n && !up) { stack.push(cx, sy - 1); up = true; } else if (!n) up = false; }
      if (sy < H - 1) { const n = near((sy + 1) * W + cx) && !out[(sy + 1) * W + cx]; if (n && !dn) { stack.push(cx, sy + 1); dn = true; } else if (!n) dn = false; }
    }
  }
  return out;
}
/** masque (octets) → canvas alpha, avec un léger adoucissement des bords */
export function maskToCanvas(m: Uint8Array, W: number, H: number, soft = 0): HTMLCanvasElement {
  const c = mkCanvas(W, H), g = ctx2d(c, true), img = g.createImageData(W, H);
  for (let i = 0; i < m.length; i++) if (m[i]) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = m[i]; }
  g.putImageData(img, 0, 0);
  if (soft > 0) { const s = mkCanvas(W, H), sg = ctx2d(s); sg.filter = `blur(${soft}px)`; sg.drawImage(c, 0, 0); return s; }
  return c;
}

/* ---------- rééchantillonnage ---------- */
export type Resample = 'nearest' | 'bilinear' | 'smooth' | 'lanczos';
/** redimensionne un canvas (plus proche voisin, bilinéaire, lissé, Lanczos 3 pour les agrandissements nets) */
export function resample(src: HTMLCanvasElement, w: number, h: number, mode: Resample): HTMLCanvasElement {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (mode === 'lanczos' && src.width * src.height <= 36e6 && w * h <= 64e6) return lanczos(src, w, h);
  const c = mkCanvas(w, h), g = ctx2d(c);
  if (mode === 'nearest') { g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, w, h); return c; }
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = mode === 'bilinear' ? 'low' : 'high';
  // réduction forte : par moitiés successives (évite le crénelage)
  let cur: HTMLCanvasElement = src;
  if (mode === 'smooth') while (cur.width / 2 > w && cur.height / 2 > h) { const n = mkCanvas(cur.width / 2, cur.height / 2), ng = ctx2d(n); ng.imageSmoothingQuality = 'high'; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n; }
  g.drawImage(cur, 0, 0, w, h); return c;
}
function lanczos(src: HTMLCanvasElement, W: number, H: number): HTMLCanvasElement {
  const sw = src.width, sh = src.height, s = ctx2d(src, true).getImageData(0, 0, sw, sh).data;
  const a = 3, L = (x: number) => x === 0 ? 1 : Math.abs(x) >= a ? 0 : a * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / a) / (Math.PI * Math.PI * x * x);
  // passe horizontale puis verticale (prémultiplié par l'alpha pour ne pas assombrir les bords transparents)
  const pass = (inp: Float32Array, iw: number, ih: number, ow: number, horiz: boolean): Float32Array => {
    const oh = horiz ? ih : H, n = horiz ? iw : ih, on = horiz ? ow : oh, k = n / on, sup = Math.max(1, k) * a;
    const out = new Float32Array((horiz ? ow : iw) * oh * 4), weights: { i0: number; w: Float32Array }[] = [];
    for (let o = 0; o < on; o++) {
      const c = (o + .5) * k - .5, i0 = Math.floor(c - sup) + 1, i1 = Math.floor(c + sup), w = new Float32Array(i1 - i0 + 1); let sum = 0;
      for (let i = i0; i <= i1; i++) { const v = L((i - c) / Math.max(1, k)); w[i - i0] = v; sum += v; }
      for (let i = 0; i < w.length; i++) w[i] /= sum || 1; weights.push({ i0, w });
    }
    const OW = horiz ? ow : iw;
    for (let y = 0; y < (horiz ? ih : on); y++) for (let x = 0; x < (horiz ? on : iw); x++) {
      const { i0, w } = weights[horiz ? x : y]; let r = 0, g = 0, b = 0, al = 0;
      for (let t = 0; t < w.length; t++) {
        const i = Math.min(n - 1, Math.max(0, i0 + t)), p = (horiz ? y * iw + i : i * iw + x) * 4, wt = w[t];
        r += inp[p] * wt; g += inp[p + 1] * wt; b += inp[p + 2] * wt; al += inp[p + 3] * wt;
      }
      const q = (y * OW + x) * 4; out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = al;
    }
    return out;
  };
  const f = new Float32Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) { const al = s[i * 4 + 3] / 255; f[i * 4] = s[i * 4] * al; f[i * 4 + 1] = s[i * 4 + 1] * al; f[i * 4 + 2] = s[i * 4 + 2] * al; f[i * 4 + 3] = s[i * 4 + 3]; }
  const hpass = pass(f, sw, sh, W, true), vpass = pass(hpass, W, sh, H, false);
  const c = mkCanvas(W, H), g = ctx2d(c), img = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const al = Math.max(0, Math.min(255, vpass[i * 4 + 3])), k = al > 0 ? 255 / al : 0;
    img.data[i * 4] = vpass[i * 4] * k; img.data[i * 4 + 1] = vpass[i * 4 + 1] * k; img.data[i * 4 + 2] = vpass[i * 4 + 2] * k; img.data[i * 4 + 3] = al;
  }
  g.putImageData(img, 0, 0); return c;
}

/** couleur d'un point (moyenne d'un carré de n pixels si n > 1) */
export function pick(c: HTMLCanvasElement, x: number, y: number, n = 1): [number, number, number, number] {
  const r = Math.floor(n / 2), d = ctx2d(c, true).getImageData(Math.round(x) - r, Math.round(y) - r, n, n).data;
  let R = 0, G = 0, B = 0, A = 0, k = 0;
  for (let i = 0; i < d.length; i += 4) { R += d[i] * d[i + 3]; G += d[i + 1] * d[i + 3]; B += d[i + 2] * d[i + 3]; A += d[i + 3]; k++; }
  return A ? [R / A, G / A, B / A, A / k] : [0, 0, 0, 0];
}

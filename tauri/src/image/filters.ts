// DedCut Image — filtres et réglages. Ceux que le navigateur sait faire passent par ctx.filter (carte graphique),
// les autres sont calculés pixel par pixel (registre PIXEL, complété par le lot 2).
import { FilterDef, mkCanvas, ctx2d } from './doc';

/** réglages pris en charge par ctx.filter : [nom CSS, unité, valeur neutre] */
const CSS: Record<string, [string, string, number]> = {
  brightness: ['brightness', '%', 100], contrast: ['contrast', '%', 100], saturate: ['saturate', '%', 100],
  hue: ['hue-rotate', 'deg', 0], grayscale: ['grayscale', '%', 0], sepia: ['sepia', '%', 0], invert: ['invert', '%', 0], blur: ['blur', 'px', 0]
};
export const isCss = (k: string) => k in CSS;
export const neutral = (k: string) => CSS[k]?.[2] ?? PIXEL[k]?.n ?? 0;
export function cssFilter(defs: FilterDef[], scale = 1): string {
  const out: string[] = [];
  for (const d of defs) {
    if (!d.on || !(d.kind in CSS)) continue;
    const [n, u, z] = CSS[d.kind]; if (d.v === z) continue;
    out.push(`${n}(${d.kind === 'blur' ? d.v * scale : d.v}${u})`);
  }
  return out.join(' ');
}

/** filtre calculé sur les pixels : modifie les données RGBA en place */
/** ref : taille de référence (plus petit côté du document, en pixels de l'image calculée) pour les filtres dont le rayon dépend de l'image */
export interface PixelFilter { n: number; fn: (d: Uint8ClampedArray, w: number, h: number, f: FilterDef, ref?: number) => void }
/** réglages exprimés en pixels (agrandis ou réduits avec l'image calculée), rempli par la bibliothèque des filtres */
export const SPATIAL: Record<string, string[]> = {};
export const PIXEL: Record<string, PixelFilter> = {
  // exposition en IL : multiplie la lumière (2^v)
  exposure: { n: 0, fn: (d, _w, _h, f) => { const k = Math.pow(2, f.v); for (let i = 0; i < d.length; i += 4) { d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } } },
  // vibrance : sature davantage les couleurs ternes
  vibrance: {
    n: 0, fn: (d, _w, _h, f) => {
      const v = f.v / 100;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), avg = (r + g + b) / 3, amt = (1 - (mx - Math.min(r, g, b)) / 255) * v;
        d[i] = r + (r - avg) * amt; d[i + 1] = g + (g - avg) * amt; d[i + 2] = b + (b - avg) * amt;
      }
    }
  },
  // température (bleu ↔ jaune) et teinte (vert ↔ magenta)
  temp: { n: 0, fn: (d, _w, _h, f) => { const t = f.v / 100 * 40, m = (f.v2 || 0) / 100 * 30; for (let i = 0; i < d.length; i += 4) { d[i] += t + m * .5; d[i + 1] -= m; d[i + 2] -= t - m * .5; } } },
  threshold: { n: -1, fn: (d, _w, _h, f) => { for (let i = 0; i < d.length; i += 4) { const y = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2], v = y >= f.v ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; } } },
  posterize: { n: 0, fn: (d, _w, _h, f) => { const n = Math.max(2, Math.round(f.v)), s = 255 / (n - 1); for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / s) * s; } }
};
export const isPixel = (k: string) => k in PIXEL;
/** applique les filtres « pixels » à une copie du canvas (null si aucun) */
/** k : échelle de l'image calculée par rapport à l'original (aperçu réduit pendant un réglage) */
export function pixelPass(src: HTMLCanvasElement, defs: FilterDef[], k = 1, ref?: number): HTMLCanvasElement | null {
  const list = defs.filter(d => d.on && d.kind in PIXEL && d.v !== PIXEL[d.kind].n);
  if (!list.length) return null;
  const c = mkCanvas(src.width, src.height), g = ctx2d(c, true); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  for (const f of list) { let d = f; const sp = SPATIAL[f.kind]; if (k !== 1 && sp) { d = { ...f }; for (const p of sp) (d as unknown as Record<string, number>)[p] = ((f as unknown as Record<string, number>)[p] || 0) * k; } PIXEL[f.kind].fn(img.data, c.width, c.height, d, ref); }
  g.putImageData(img, 0, 0); return c;
}
export const ADJ_KINDS = ['brightness', 'contrast', 'saturate', 'hue', 'exposure', 'vibrance', 'temp', 'grayscale', 'sepia', 'invert', 'blur', 'posterize', 'threshold'];
export const ADJ_RANGE: Record<string, [number, number, number]> = {
  brightness: [0, 200, 1], contrast: [0, 200, 1], saturate: [0, 300, 1], hue: [-180, 180, 1], exposure: [-3, 3, .05], vibrance: [-100, 100, 1],
  temp: [-100, 100, 1], grayscale: [0, 100, 1], sepia: [0, 100, 1], invert: [0, 100, 1], blur: [0, 60, .5], posterize: [2, 32, 1], threshold: [0, 255, 1]
};
// valeur de départ d'un nouveau réglage (neutre, sauf ceux qui n'ont de sens qu'activés)
const START: Record<string, number> = { grayscale: 100, invert: 100, sepia: 100, posterize: 6, threshold: 128 };
export const defFilter = (kind: string): FilterDef => ({ kind, v: START[kind] ?? neutral(kind), on: true });

// DedCut Image — corrections automatiques (niveaux, couleurs) calculées sur l'histogramme du calque.
import { t } from '../i18n';
import { ed, toast } from './state';
import { FilterDef, Layer, mkCanvas, ctx2d } from './doc';
import { openFilter } from './fxlib';

function layerPixels(l: Layer | null): Uint8ClampedArray | null {
  const d = ed.doc, ds = ed.ds; if (!d || !ds) return null; let src: CanvasImageSource; let w: number, h: number;
  if (l && l.type === 'smart') { src = l.src; w = l.sw; h = l.sh; } else if (l && l.type === 'raster') { src = l.cv; w = l.cv.width; h = l.cv.height; } else { ds.comp.update(); src = ds.comp.cv; w = d.w; h = d.h; }
  const k = Math.min(1, 400 / Math.max(w, h)), c = mkCanvas(w * k, h * k); ctx2d(c).drawImage(src, 0, 0, c.width, c.height); return ctx2d(c, true).getImageData(0, 0, c.width, c.height).data;
}
/** niveaux automatiques : 0,5 % des pixels les plus sombres / clairs deviennent noir / blanc */
export function autoLevels(f: FilterDef) {
  const px = layerPixels(ed.layer); if (!px) return; const H = new Uint32Array(256); let n = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8) { H[Math.round(.299 * px[i] + .587 * px[i + 1] + .114 * px[i + 2])]++; n++; }
  let a = 0, lo = 0, hi = 255; for (let i = 0; i < 256; i++) { a += H[i]; if (a > n * .005) { lo = i; break; } }
  a = 0; for (let i = 255; i >= 0; i--) { a += H[i]; if (a > n * .005) { hi = i; break; } }
  ed.act('img.h.filter', () => { (f as FilterDef & { p: Record<string, number> }).p = { inB: lo, gamma: 1, inW: Math.max(lo + 1, hi), outB: 0, outW: 255 }; }, 'all');
}
/** amélioration automatique : niveaux + équilibre des couleurs + vibrance, posés comme filtres modifiables */
export async function autoEnhance() {
  const l = ed.layer; if (!l) return; const px = layerPixels(l); if (!px) return;
  let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
  if (!n) return; r /= n; g /= n; b /= n; const m = (r + g + b) / 3;
  await openFilter('levels'); const L = ed.layer!, list = L.type === 'smart' ? L.filters : L.type === 'adjust' ? L.adj : null; if (!list) return;
  autoLevels(list[list.length - 1]);
  await openFilter('balance'); const bal = list[list.length - 1] as FilterDef & { p: Record<string, number[]> };
  ed.act('img.h.filter', () => { const c = [(m - r) * .5, (m - g) * .5, (m - b) * .5].map(v => Math.max(-40, Math.min(40, v))); bal.p = { sh: [0, 0, 0], mid: c, hi: [0, 0, 0] }; }, 'all');
  await openFilter('vibrance'); const vib = list[list.length - 1]; ed.act('img.h.filter', () => { vib.v = 25; }, 'all');
  toast(t('img.ai.enhanceDone'));
}

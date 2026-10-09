// DedCut Image — fonctions « IA » facultatives, 100 % locales (rien n'est envoyé sur internet, aucun coût) :
// - sélection du sujet / suppression du fond : modèle « selfie segmenter » de MediaPipe (Apache-2.0, déjà livré avec DedCut)
//   pour les personnes, sinon séparation sujet / fond d'après les couleurs des bords de l'image ;
// - suppression d'objets et extension d'image : remplissage à partir des zones voisines (synthèse de texture) ;
// - amélioration, agrandissement, débruitage, colorisation proposée (réglable ensuite).
import { t } from '../i18n';
import { ed, toast } from './state';
import { selAct } from './commands';
import { ui } from './state';
function aiOnce() { if (!localStorage.getItem('dedcut-image-aiinfo')) { ui.dialog = 'aiinfo'; ed.emit(); } }
import * as S from './select';
import { Doc, mkCanvas, ctx2d, RasterLayer, findLayer, newRaster } from './doc';

type Seg = { segment(img: HTMLCanvasElement): { confidenceMasks?: { width: number; height: number; getAsFloat32Array(): Float32Array }[] } };
let segP: Promise<Seg | null> | null = null;
function segmenter(): Promise<Seg | null> {
  if (!segP) segP = (async () => {
    try {
      const base = new URL('vendor/mediapipe/', document.baseURI).href, mod = await import(/* @vite-ignore */ base + 'vision_bundle.mjs'), fs = await mod.FilesetResolver.forVisionTasks(base.replace(/\/$/, ''));
      return await mod.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: base + 'selfie_segmenter.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false }) as Seg;
    } catch { return null; }
  })();
  return segP;
}
/** image visible du document (tous les calques) */
function visible(d: Doc): HTMLCanvasElement { const ds = ed.ds!; ds.comp.update(); const c = mkCanvas(d.w, d.h); ctx2d(c).drawImage(ds.comp.cv, 0, 0); return c; }
/** masque du sujet (canvas de la taille du document) */
export async function subjectMask(d: Doc, personOnly = false): Promise<HTMLCanvasElement | null> {
  const img = visible(d), seg = await segmenter();
  let person: HTMLCanvasElement | null = null, cover = 0;
  if (seg) {
    const s = 512 / Math.max(d.w, d.h), small = mkCanvas(Math.max(16, d.w * s), Math.max(16, d.h * s)); ctx2d(small).drawImage(img, 0, 0, small.width, small.height);
    try {
      const r = seg.segment(small), cm = r.confidenceMasks; if (cm && cm.length) {
        const m = cm[cm.length - 1], v = m.getAsFloat32Array(), mc = mkCanvas(m.width, m.height), g = ctx2d(mc), id = g.createImageData(m.width, m.height);
        for (let i = 0; i < v.length; i++) { const q = Math.min(1, Math.max(0, (v[i] - .3) / .4)); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = q * 255; if (q > .5) cover++; }
        g.putImageData(id, 0, 0); cover /= v.length;
        person = mkCanvas(d.w, d.h); const pg = ctx2d(person); pg.imageSmoothingQuality = 'high'; pg.drawImage(mc, 0, 0, d.w, d.h);
      }
    } catch { person = null; }
  }
  // une personne bien visible : on garde ce masque, affiné sur les détails (cheveux)
  if (person && cover > .03) return S.refineSel(person, img, { radius: Math.max(3, Math.round(Math.max(d.w, d.h) / 300)), smooth: 0, feather: 0, contrast: 15, shift: 0, hair: true });
  return personOnly ? null : borderModel(img); // personOnly : seulement une vraie personne (miniature), sinon rien
}
/** sujet / fond d'après les couleurs des bords (photos de produits, fonds unis ou peu chargés) */
function borderModel(img: HTMLCanvasElement): HTMLCanvasElement {
  const k = Math.min(1, 640 / Math.max(img.width, img.height)), w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
  const sm = mkCanvas(w, h), g = ctx2d(sm, true); g.drawImage(img, 0, 0, w, h); const p = g.getImageData(0, 0, w, h).data;
  // couleurs du fond : échantillons sur les bords, regroupés (16 groupes au plus)
  const cl: [number, number, number, number][] = [];
  const addC = (i: number) => { const r = p[i], gg = p[i + 1], b = p[i + 2]; for (const c of cl) if (Math.abs(c[0] / c[3] - r) + Math.abs(c[1] / c[3] - gg) + Math.abs(c[2] / c[3] - b) < 48) { c[0] += r; c[1] += gg; c[2] += b; c[3]++; return; } if (cl.length < 16) cl.push([r, gg, b, 1]); };
  for (let x = 0; x < w; x++) { addC(x * 4); addC(((h - 1) * w + x) * 4); } for (let y = 0; y < h; y++) { addC(y * w * 4); addC((y * w + w - 1) * 4); }
  const bg = cl.filter(c => c[3] > (w + h) * .02).map(c => [c[0] / c[3], c[1] / c[3], c[2] / c[3]]);
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { let m = 1e9; for (const c of bg) { const d = Math.abs(p[i * 4] - c[0]) + Math.abs(p[i * 4 + 1] - c[1]) + Math.abs(p[i * 4 + 2] - c[2]); if (d < m) m = d; } dist[i] = m; }
  // le fond = zones proches des couleurs du bord ET reliées au bord
  const bgMask = new Uint8Array(w * h), thr = 42, st: number[] = [];
  for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) { const i = st.pop()!; if (bgMask[i] || dist[i] > thr) continue; bgMask[i] = 1; const x = i % w, y = (i / w) | 0; if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w); }
  const out = mkCanvas(w, h), og = ctx2d(out), id = og.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const a = bgMask[i] ? Math.max(0, Math.min(1, (dist[i] - thr * .5) / thr)) : 1; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a * 255; }
  og.putImageData(id, 0, 0);
  const big = mkCanvas(img.width, img.height), bg2 = ctx2d(big); bg2.imageSmoothingQuality = 'high'; bg2.filter = 'blur(.6px)'; bg2.drawImage(out, 0, 0, img.width, img.height);
  return S.refineSel(big, img, { radius: 3, smooth: 1, feather: 0, contrast: 10, shift: 0, hair: true });
}
export async function selectSubject() { aiOnce();
  const d = ed.doc; if (!d) return; toast(t('img.ai.working'));
  const m = await subjectMask(d); if (!m || !S.selBounds(m)) { toast(t('img.ai.noSubject')); return; }
  selAct('img.h.subject', doc => S.combine(doc, m)); toast(t('img.ai.subjectDone'));
}
/** supprimer le fond : un masque de calque cache le fond (rien n'est effacé, on peut retoucher le masque) */
export async function removeBackground() { aiOnce();
  const d = ed.doc, l = ed.layer; if (!d || !l) return; toast(t('img.ai.working'));
  const m = await subjectMask(d); if (!m || !S.selBounds(m)) { toast(t('img.ai.noSubject')); return; }
  ed.act('img.h.removeBg', () => { l.mask = { cv: m, x: 0, y: 0, on: true }; }, 'all'); toast(t('img.ai.bgDone'));
}

/* ---------- remplissage selon le contenu (suppression d'objets, extension) ---------- */
/**
 * Remplit la zone du masque à partir des pixels voisins : recherche de petits morceaux semblables autour
 * (synthèse de texture, du plus grossier au plus fin) puis fondu des raccords. Tout se fait sur l'ordinateur.
 */
export function contentFill(src: HTMLCanvasElement, hole: HTMLCanvasElement): HTMLCanvasElement {
  const W = src.width, H = src.height, out = mkCanvas(W, H), og = ctx2d(out, true); og.drawImage(src, 0, 0);
  const hb = S.selBounds(hole); if (!hb) return out;
  // zone de travail : le trou plus une marge où chercher des morceaux
  const m = Math.max(24, Math.round(Math.max(hb.w, hb.h) * 1.2)), x0 = Math.max(0, hb.x - m), y0 = Math.max(0, hb.y - m), x1 = Math.min(W, hb.x + hb.w + m), y1 = Math.min(H, hb.y + hb.h + m);
  const w = x1 - x0, h = y1 - y0, scale = Math.min(1, 360 / Math.max(w, h));
  const sw = Math.max(8, Math.round(w * scale)), sh = Math.max(8, Math.round(h * scale));
  const sc = mkCanvas(sw, sh), sg = ctx2d(sc, true); sg.drawImage(src, x0, y0, w, h, 0, 0, sw, sh);
  const mc = mkCanvas(sw, sh), mg = ctx2d(mc, true); mg.drawImage(hole, x0, y0, w, h, 0, 0, sw, sh);
  const P = sg.getImageData(0, 0, sw, sh), d = P.data, Ma = mg.getImageData(0, 0, sw, sh).data, miss = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) miss[i] = Ma[i * 4 + 3] > 20 ? 1 : 0;
  const R = 3; // morceaux de 7 × 7
  const known = (i: number) => !miss[i];
  // ordre : du bord du trou vers le centre (pelures d'oignon)
  let frontier: number[] = [], iter = 0;
  const isFront = (i: number) => { if (!miss[i]) return false; const x = i % sw, y = (i / sw) | 0; return (x > 0 && known(i - 1)) || (x < sw - 1 && known(i + 1)) || (y > 0 && known(i - sw)) || (y < sh - 1 && known(i + sw)); };
  const cand: number[] = []; for (let y = R; y < sh - R; y += 2) for (let x = R; x < sw - R; x += 2) { let ok = true; for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R; dx++) if (miss[(y + dy) * sw + x + dx]) { ok = false; break; } if (ok) cand.push(y * sw + x); }
  if (!cand.length) return out;
  do {
    frontier = []; for (let i = 0; i < sw * sh; i++) if (isFront(i)) frontier.push(i);
    for (const i of frontier) {
      const x = i % sw, y = (i / sw) | 0; let best = -1, bd = Infinity;
      const tries = Math.min(cand.length, 220);
      for (let k = 0; k < tries; k++) {
        const c = cand[(Math.random() * cand.length) | 0], cx = c % sw, cy = (c / sw) | 0; let sum = 0, n = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) continue; const j = yy * sw + xx; if (miss[j]) continue; const q = (cy + dy) * sw + cx + dx; for (let ch = 0; ch < 3; ch++) { const df = d[j * 4 + ch] - d[q * 4 + ch]; sum += df * df; } n++; }
        if (n && sum / n < bd) { bd = sum / n; best = c; }
      }
      if (best >= 0) { for (let ch = 0; ch < 4; ch++) d[i * 4 + ch] = d[best * 4 + ch]; }
    }
    for (const i of frontier) miss[i] = 0;
  } while (frontier.length && ++iter < 2000);
  sg.putImageData(P, 0, 0);
  // remise à la taille d'origine, seulement dans le trou (bords adoucis)
  const up = mkCanvas(w, h), ug = ctx2d(up); ug.imageSmoothingQuality = 'high'; ug.drawImage(sc, 0, 0, w, h);
  ug.globalCompositeOperation = 'destination-in'; const soft = mkCanvas(w, h), sfg = ctx2d(soft); sfg.filter = 'blur(1.5px)'; sfg.drawImage(hole, x0, y0, w, h, 0, 0, w, h); ug.drawImage(soft, 0, 0);
  og.drawImage(up, x0, y0);
  // un peu de grain de l'image pour ne pas avoir une zone trop lisse quand on a réduit
  if (scale < 1) { const pg = ctx2d(out, true), im = pg.getImageData(hb.x, hb.y, hb.w, hb.h), a = im.data, hm = ctx2d(hole, true).getImageData(hb.x, hb.y, hb.w, hb.h).data, ref = ctx2d(src, true).getImageData(Math.max(0, hb.x - hb.w), hb.y, hb.w, hb.h).data;
    for (let i = 0; i < a.length; i += 4) if (hm[i + 3] > 20) { const n = (ref[i] - ref[(i + 4) % ref.length]) * .35; a[i] += n; a[i + 1] += n; a[i + 2] += n; } pg.putImageData(im, hb.x, hb.y); }
  return out;
}
/** supprimer l'objet sélectionné (calque de pixels) */
export function removeObject() { aiOnce();
  const d = ed.doc, l = ed.layer, sel = S.getSel(d); if (!d || !l || !sel) { toast(t('img.ai.needSel')); return; }
  if (l.type !== 'raster') { toast(t('img.t.needPixels')); return; }
  toast(t('img.ai.working'));
  setTimeout(() => {
    const hole = S.growSel(sel, 3), src = mkCanvas(d.w, d.h); ctx2d(src).drawImage(l.cv, l.x, l.y);
    const res = contentFill(src, hole);
    ed.act('img.h.removeObj', tx => { ed.coverDoc(l, tx); tx.touch(l.cv); const g = ctx2d(l.cv); g.clearRect(0, 0, l.cv.width, l.cv.height); g.drawImage(res, -l.x, -l.y); }, 'all');
    toast(t('img.ai.objDone'));
  }, 30);
}
/** agrandir le canevas et remplir les nouveaux bords à partir de l'image (extension) */
export function extendImage(px: number) { aiOnce();
  const d = ed.doc, l = ed.layer; if (!d || !l || l.type !== 'raster') { toast(t('img.t.needPixels')); return; }
  ed.resizeCanvas(d.w + px * 2, d.h + px * 2, .5, .5, null);
  const lay = findLayer(ed.doc!, l.id)?.l as RasterLayer; if (!lay) return;
  setTimeout(() => {
    const D = ed.doc!, src = mkCanvas(D.w, D.h), g = ctx2d(src); g.drawImage(lay.cv, lay.x, lay.y);
    // bords recopiés en miroir d'abord (bonne base), puis remplis par la synthèse
    const hole = mkCanvas(D.w, D.h), hg = ctx2d(hole); hg.fillStyle = '#fff'; hg.fillRect(0, 0, D.w, D.h); hg.globalCompositeOperation = 'destination-out'; hg.drawImage(lay.cv, lay.x, lay.y);
    const res = contentFill(src, hole);
    ed.act('img.h.extend', tx => { ed.coverDoc(lay, tx); tx.touch(lay.cv); const lg = ctx2d(lay.cv); lg.drawImage(res, -lay.x, -lay.y); }, 'all');
    toast(t('img.ai.extendDone'));
  }, 30);
}
/** colorisation proposée : dégradé de couleurs naturel posé sur la lumière de l'image (réglable ensuite) */
export async function colorize() { aiOnce();
  const l = ed.layer; if (!l) return;
  const { FILTERS, openFilter } = await import('./fxlib'); await openFilter('gradmap'); void FILTERS;
  const L = ed.layer; const list = L && (L.type === 'smart' ? L.filters : L.type === 'adjust' ? L.adj : null); if (!list) return;
  const f = list[list.length - 1] as typeof list[number] & { p: Record<string, unknown> };
  ed.act('img.h.filter', () => { f.v = 70; f.p = { stops: [{ o: 0, c: '#1b1a2e' }, { o: .35, c: '#6b4f3a' }, { o: .6, c: '#c99a74' }, { o: .82, c: '#e8d3b8' }, { o: 1, c: '#f7fbff' }] }; }, 'all');
  toast(t('img.ai.colorizeDone'));
}
/** amélioration automatique (niveaux, couleurs, netteté) posée comme réglages modifiables */
export async function autoEnhance() { const m = await import('./autofix'); await m.autoEnhance(); }
/** agrandir l'image (×2) avec un rééchantillonnage net, puis renforcer les détails */
export async function upscale(k = 2) { aiOnce();
  const d = ed.doc; if (!d) return; if (d.w * k * d.h * k > 400e6) { toast(t('img.err.toobig')); return; }
  ed.resizeImage(d.w * k, d.h * k, 'lanczos'); toast(t('img.ai.upscaleDone', { k }));
}
export function newLayerFrom(name: string, c: HTMLCanvasElement) { const d = ed.doc!; const r = newRaster(name, d.w, d.h); ctx2d(r.cv).drawImage(c, 0, 0); ed.act('img.h.newLayer', (_tx, dd) => { ed.insert(dd, r); }, 'all'); }

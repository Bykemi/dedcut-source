// DedCut Image — lot 3 : productivité (macros, traitement par lots, kits de marque, modèles, bibliothèque DedCut,
// envoi au Montage), compositions (assemblage, fusion d'expositions, panorama, remplacement du ciel, masques vectoriels),
// génération d'images avec l'IA locale de DedCut, et extensions isolées (permissions limitées).
import { THUMB_TPLS, thumbTemplate } from './thumbtpl';
import { useEffect, useRef, useState } from 'react';
import { t, fmt } from '../i18n';
import { ed, ui, useEd, toast, askText, errText, importLayers, openFiles } from './state';
import { Ico } from './icons';
import { Doc, Layer, ShapeLayer, SmartLayer, SubPath, PathPt, FilterDef, mkCanvas, ctx2d, newDoc, newSmart, newRaster, newText, newShape, shapeItem, tfMatrix, localSize, findLayer, walk } from './doc';
import { decode, readPath, bridge, IMG_EXT, exportBlob, ExpOpts, FORMAT_INFO, serialize, deserialize, thumb } from './io';
import { renderDoc, renderRect } from './render';
import * as S from './select';

const close = () => { ui.dialog = null; ed.emit(); };
type DK = typeof ui.dialog;
const open = (k: string) => { ui.dialog = k as DK; ed.emit(); };
const askFiles = async (label: string, multi = true): Promise<{ name: string; blob: Blob; path?: string }[]> => {
  const b = bridge();
  if (b) { const l = await b.open(label, IMG_EXT, multi).catch(() => []); const out = []; for (const f of l) { try { out.push({ name: f.name, blob: await readPath(f.path), path: f.path }); } catch (e) { toast(f.name + ' : ' + errText(e)); } } return out; }
  return new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.multiple = multi; i.accept = IMG_EXT.map(e => '.' + e).join(','); i.onchange = () => ok([...(i.files || [])].map(f => ({ name: f.name, blob: f as Blob }))); i.click(); });
};
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="im-modal" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={'im-mbox' + (wide ? ' wide' : '')}><h3>{title}<button onClick={onClose}><Ico n="close" s={14} /></button></h3>{children}</div></div>;
}

/* ---------- comparaison avant / après (I073) : l'image telle qu'elle était à l'ouverture ---------- */
export function snapshotOrig() { const ds = ed.ds; if (ds) (ds as typeof ds & { orig?: HTMLCanvasElement }).orig = renderDoc(ds.doc, 1, true); }
export function toggleCompare() { const ds = ed.ds as (typeof ed.ds & { orig?: HTMLCanvasElement }) | null; if (!ds) return; if (!ds.orig) snapshotOrig(); ui.compare = !ui.compare; ed.emit(); }

/* ---------- contenu lié (I030) : relire le fichier d'origine ---------- */
export async function relinkSmart() {
  const l = ed.layer; if (!l || l.type !== 'smart' || !l.link) { toast(t('img.t.noLink')); return; }
  try { const blob = await readPath(l.link), d = await decode(blob, l.link); const w = l.sw * l.tf.sx, h = l.sh * l.tf.sy;
    ed.act('img.h.replace', () => { l.src = d.cv; l.blob = blob; l.sw = d.cv.width; l.sh = d.cv.height; l.tf.sx = w / l.sw; l.tf.sy = h / l.sh; }, 'all'); toast(t('img.t.relinked'));
  } catch (e) { toast(errText(e)); }
}

/* ---------- masques vectoriels (I102) : la forme du calque au-dessus devient le masque du calque actif ---------- */
const K = .5523;
function pt(x: number, y: number, ix = 0, iy = 0, ox = 0, oy = 0): PathPt { return { x, y, ix, iy, ox, oy, smooth: !!(ix || iy) }; }
export function shapeToPaths(l: ShapeLayer): SubPath[] {
  const m = tfMatrix(l.tf), out: SubPath[] = [];
  for (const it of l.items) {
    if (it.op === 'sub' || it.op === 'int') continue; let sps: SubPath[] = [];
    const x = -it.w / 2 + it.ox, y = -it.h / 2 + it.oy, w = it.w, h = it.h;
    if (it.kind === 'rect') sps = [{ closed: true, pts: [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)] }];
    else if (it.kind === 'ellipse') { const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2; sps = [{ closed: true, pts: [pt(cx, cy - ry, -rx * K, 0, rx * K, 0), pt(cx + rx, cy, 0, -ry * K, 0, ry * K), pt(cx, cy + ry, rx * K, 0, -rx * K, 0), pt(cx - rx, cy, 0, ry * K, 0, -ry * K)] }]; }
    else if (it.kind === 'polygon' || it.kind === 'star') { const n = Math.max(3, Math.round(it.sides)), N = n * (it.kind === 'star' ? 2 : 1); sps = [{ closed: true, pts: Array.from({ length: N }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / N, k = it.kind === 'star' && i % 2 ? it.inner : 1; return pt(x + w / 2 + Math.cos(a) * w / 2 * k, y + h / 2 + Math.sin(a) * h / 2 * k); }) }]; }
    else if (it.kind === 'path' && it.paths) sps = it.paths.map(sp => ({ closed: true, pts: sp.pts.map(p => ({ ...p, x: p.x + it.ox, y: p.y + it.oy })) }));
    // vers le repère du document (les poignées suivent la transformation)
    for (const sp of sps) out.push({ closed: sp.closed, pts: sp.pts.map(p => { const a = m.transformPoint({ x: p.x, y: p.y }), i = m.transformPoint({ x: p.x + p.ix, y: p.y + p.iy }), o = m.transformPoint({ x: p.x + p.ox, y: p.y + p.oy }); return { x: a.x, y: a.y, ix: i.x - a.x, iy: i.y - a.y, ox: o.x - a.x, oy: o.y - a.y, smooth: p.smooth }; }) });
  }
  return out;
}
export function vmaskFromAbove() {
  const d = ed.doc, l = ed.layer; if (!d || !l) return; const f = findLayer(d, l.id); if (!f) return;
  const above = f.list[f.list.indexOf(l) + 1]; if (!above || above.type !== 'shape') { toast(t('img.t.needShapeAbove')); return; }
  const paths = shapeToPaths(above); if (!paths.length) { toast(t('img.t.needShapeAbove')); return; }
  ed.act('img.h.vmask', () => { l.vmask = paths; above.visible = false; }, 'all'); toast(t('img.t.vmaskDone'));
}

/* ---------- remplacement du ciel (I110) ---------- */
function skyMask(d: Doc): HTMLCanvasElement {
  const ds = ed.ds!; ds.comp.update(); const k = Math.min(1, 480 / Math.max(d.w, d.h)), w = Math.max(8, Math.round(d.w * k)), h = Math.max(8, Math.round(d.h * k));
  const c = mkCanvas(w, h), g = ctx2d(c, true); g.drawImage(ds.comp.cv, 0, 0, w, h); const p = g.getImageData(0, 0, w, h).data;
  const sky = (i: number) => { const r = p[i * 4], gg = p[i * 4 + 1], b = p[i * 4 + 2], l = (r + gg + b) / 3; return (b >= r && b > 95 && l > 90) || l > 215; };
  const m = new Uint8Array(w * h), st: number[] = []; for (let x = 0; x < w; x++) st.push(x);
  while (st.length) { const i = st.pop()!; if (m[i] || !sky(i)) continue; m[i] = 1; const x = i % w, y = (i / w) | 0; if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w); }
  const o = mkCanvas(w, h), og = ctx2d(o), id = og.createImageData(w, h); for (let i = 0; i < w * h; i++) if (m[i]) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = 255; } og.putImageData(id, 0, 0);
  const big = mkCanvas(d.w, d.h), bg = ctx2d(big); bg.filter = 'blur(2px)'; bg.drawImage(o, 0, 0, d.w, d.h); return big;
}
export async function replaceSky() {
  const d = ed.doc; if (!d) return; const [f] = await askFiles(t('img.f.sky'), false); if (!f) return;
  try {
    const m = skyMask(d); if (!S.selBounds(m)) { toast(t('img.t.noSky')); return; }
    const dec = await decode(f.blob, f.name), s = newSmart(t('img.layer.sky'), dec.cv, f.blob, dec.mime, d.w / 2, d.h / 2); const k = Math.max(d.w / dec.cv.width, d.h / dec.cv.height); s.tf.sx = s.tf.sy = k; s.mask = { cv: m, x: 0, y: 0, on: true };
    ed.act('img.h.sky', (_tx, dd) => { dd.layers.push(s); dd.sel = [s.id]; }, 'all'); toast(t('img.t.skyDone'));
  } catch (e) { toast(errText(e)); }
}

/* ---------- assemblage de plusieurs images (I111) ---------- */
const rectPath = (x: number, y: number, w: number, h: number): SubPath[] => [{ closed: true, pts: [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)] }];
export async function makeCollage(files: { name: string; blob: Blob; path?: string }[], cols: number, W: number, H: number, gap: number, bg: string) {
  if (!files.length) return; const rows = Math.ceil(files.length / cols), d = newDoc(t('img.collage'), W, H, null);
  const b = newRaster(t('img.layer.bg'), W, H); const g = ctx2d(b.cv); g.fillStyle = bg; g.fillRect(0, 0, W, H); d.layers.push(b);
  const cw = (W - gap * (cols + 1)) / cols, ch = (H - gap * (rows + 1)) / rows;
  for (let i = 0; i < files.length; i++) {
    try { const dec = await decode(files[i].blob, files[i].name), x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + gap);
      const s = newSmart(files[i].name.replace(/\.[^.]+$/, ''), dec.cv, files[i].blob, dec.mime, x + cw / 2, y + ch / 2), k = Math.max(cw / dec.cv.width, ch / dec.cv.height); s.tf.sx = s.tf.sy = k;
      s.vmask = rectPath(x, y, cw, ch); if (files[i].path) s.link = files[i].path!; d.layers.push(s);
    } catch (e) { toast(files[i].name + ' : ' + errText(e)); }
  }
  ed.add(d, ui.vw, ui.vh); toast(t('img.t.collageDone'));
}

/* ---------- fusion d'expositions et panorama (I112) ---------- */
type Im = { d: Float32Array; w: number; h: number; c: number };
const K5 = [1, 4, 6, 4, 1];
/** flou 5 points puis moitié de taille */
function pdown(a: Im): Im {
  const { w, h, c, d } = a, tmp = new Float32Array(w * h * c), W = (w + 1) >> 1, H = (h + 1) >> 1, o = new Float32Array(W * H * c);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < c; ch++) { let s = 0; for (let j = -2; j <= 2; j++) s += K5[j + 2] * d[(y * w + Math.min(w - 1, Math.max(0, x + j))) * c + ch]; tmp[(y * w + x) * c + ch] = s / 16; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let ch = 0; ch < c; ch++) { let s = 0; for (let j = -2; j <= 2; j++) s += K5[j + 2] * tmp[(Math.min(h - 1, Math.max(0, 2 * y + j)) * w + Math.min(w - 1, 2 * x)) * c + ch]; o[(y * W + x) * c + ch] = s / 16; }
  return { d: o, w: W, h: H, c };
}
/** agrandissement bilinéaire vers w × h */
function pup(a: Im, w: number, h: number): Im {
  const c = a.c, o = new Float32Array(w * h * c);
  for (let y = 0; y < h; y++) { const sy = Math.min(a.h - 1, Math.max(0, (y + .5) / 2 - .5)), y0 = Math.floor(sy), y1 = Math.min(a.h - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < w; x++) { const sx = Math.min(a.w - 1, Math.max(0, (x + .5) / 2 - .5)), x0 = Math.floor(sx), x1 = Math.min(a.w - 1, x0 + 1), fx = sx - x0;
      for (let ch = 0; ch < c; ch++) { const v = (a.d[(y0 * a.w + x0) * c + ch] * (1 - fx) + a.d[(y0 * a.w + x1) * c + ch] * fx) * (1 - fy) + (a.d[(y1 * a.w + x0) * c + ch] * (1 - fx) + a.d[(y1 * a.w + x1) * c + ch] * fx) * fy; o[(y * w + x) * c + ch] = v; } } }
  return { d: o, w, h, c };
}
/** pyramide des détails : chaque niveau = image − version floue agrandie ; le dernier garde l'image floue */
function lapPyr(a: Im, lv: number): Im[] {
  const g = [a]; for (let l = 1; l < lv; l++) g.push(pdown(g[l - 1]));
  return g.map((G, l) => { if (l === lv - 1) return G; const u = pup(g[l + 1], G.w, G.h); for (let i = 0; i < u.d.length; i++) u.d[i] = G.d[i] - u.d[i]; return u; });
}
async function loadAll(files: { name: string; blob: Blob }[]) { const out: HTMLCanvasElement[] = []; for (const f of files) { try { out.push((await decode(f.blob, f.name)).cv); } catch (e) { toast(f.name + ' : ' + errText(e)); } } return out; }
/** fusion de photos prises à différentes expositions : chaque pixel prend surtout les images bien exposées, nettes et colorées */
export async function exposureFusion(files: { name: string; blob: Blob }[]) {
  const imgs = await loadAll(files); if (imgs.length < 2) { toast(t('img.t.need2')); return; }
  const W = imgs[0].width, H = imgs[0].height; if (imgs.some(c => c.width !== W || c.height !== H)) { toast(t('img.t.sameSize')); return; }
  toast(t('img.ai.working')); await new Promise(r => setTimeout(r, 30));
  const data = imgs.map(c => ctx2d(c, true).getImageData(0, 0, W, H).data), n = W * H;
  // poids : contraste local, saturation, bonne exposition (normalisés pixel par pixel)
  const weights = data.map(p => { const wgt = new Float32Array(n); for (let i = 0; i < n; i++) { const r = p[i * 4] / 255, g = p[i * 4 + 1] / 255, b = p[i * 4 + 2] / 255, m = (r + g + b) / 3, sat = Math.sqrt(((r - m) ** 2 + (g - m) ** 2 + (b - m) ** 2) / 3), we = Math.exp(-((r - .5) ** 2 + (g - .5) ** 2 + (b - .5) ** 2) / (2 * .04)); let ct = 0; const x = i % W; if (x > 0 && x < W - 1 && i >= W && i < n - W) ct = Math.abs(4 * m - (p[(i - 1) * 4] + p[(i + 1) * 4] + p[(i - W) * 4] + p[(i + W) * 4]) / 255); wgt[i] = (ct + .05) * (sat + .05) * (we + 1e-3); } return wgt; });
  for (let i = 0; i < n; i++) { let s = 1e-12; for (const w of weights) s += w[i]; for (const w of weights) w[i] /= s; }
  // fusion sur plusieurs niveaux de détail (pyramides) : garde le contraste général sans raccords visibles
  const lv = Math.max(1, Math.min(8, Math.floor(Math.log2(Math.min(W, H))) - 2));
  let acc: Im[] | null = null;
  for (let k = 0; k < data.length; k++) {
    const p = data[k], im = new Float32Array(n * 3); for (let i = 0; i < n; i++) { im[i * 3] = p[i * 4]; im[i * 3 + 1] = p[i * 4 + 1]; im[i * 3 + 2] = p[i * 4 + 2]; }
    const lap = lapPyr({ d: im, w: W, h: H, c: 3 }, lv), gw: Im[] = [{ d: weights[k], w: W, h: H, c: 1 }]; for (let l = 1; l < lv; l++) gw.push(pdown(gw[l - 1]));
    if (!acc) acc = lap.map(L => ({ ...L, d: new Float32Array(L.d.length) }));
    for (let l = 0; l < lv; l++) { const A = acc[l].d, L = lap[l].d, G = gw[l].d; for (let i = 0; i < G.length; i++) { A[i * 3] += L[i * 3] * G[i]; A[i * 3 + 1] += L[i * 3 + 1] * G[i]; A[i * 3 + 2] += L[i * 3 + 2] * G[i]; } }
    await new Promise(r => setTimeout(r, 0));
  }
  let rec = acc![lv - 1]; for (let l = lv - 2; l >= 0; l--) { const u = pup(rec, acc![l].w, acc![l].h); for (let i = 0; i < u.d.length; i++) u.d[i] += acc![l].d[i]; rec = u; }
  const out = mkCanvas(W, H), og = ctx2d(out), id = og.createImageData(W, H); for (let i = 0; i < n; i++) { id.data[i * 4] = rec.d[i * 3]; id.data[i * 4 + 1] = rec.d[i * 3 + 1]; id.data[i * 4 + 2] = rec.d[i * 3 + 2]; id.data[i * 4 + 3] = 255; } og.putImageData(id, 0, 0);
  const d = newDoc(t('img.hdr'), W, H, null), r = newRaster(t('img.hdr'), W, H); ctx2d(r.cv).drawImage(out, 0, 0); d.layers.push(r); ed.add(d, ui.vw, ui.vh); toast(t('img.t.hdrDone'));
}
/** panorama : images côte à côte, recouvrement trouvé automatiquement, fondu dans la zone commune (calques ajustables ensuite) */
export async function panorama(files: { name: string; blob: Blob; path?: string }[]) {
  const imgs = await loadAll(files); if (imgs.length < 2) { toast(t('img.t.need2')); return; }
  toast(t('img.ai.working')); await new Promise(r => setTimeout(r, 30));
  const H = Math.min(...imgs.map(c => c.height)), sc = imgs.map(c => H / c.height), ws = imgs.map((c, i) => Math.round(c.width * sc[i]));
  const small = (c: HTMLCanvasElement, w: number) => { const k = 160 / H, s = mkCanvas(Math.max(4, w * k), 160); ctx2d(s).drawImage(c, 0, 0, s.width, s.height); const p = ctx2d(s, true).getImageData(0, 0, s.width, s.height).data, g = new Float32Array(s.width * s.height); for (let i = 0; i < g.length; i++) g[i] = p[i * 4] * .3 + p[i * 4 + 1] * .59 + p[i * 4 + 2] * .11; return { g, w: s.width, h: s.height, k }; };
  const xs = [0], ys = [0];
  for (let i = 1; i < imgs.length; i++) {
    const A = small(imgs[i - 1], ws[i - 1]), B = small(imgs[i], ws[i]); let best = Infinity, bo = Math.round(A.w * .25), bdy = 0;
    for (let ov = Math.round(Math.min(A.w, B.w) * .08); ov <= Math.min(A.w, B.w) * .7; ov++) for (let dy = -8; dy <= 8; dy += 2) {
      let s = 0, n = 0; for (let y = Math.max(0, dy); y < Math.min(A.h, B.h + dy); y += 2) for (let x = 0; x < ov; x += 2) { const a = A.g[y * A.w + (A.w - ov + x)], b = B.g[(y - dy) * B.w + x]; s += (a - b) * (a - b); n++; }
      if (n && s / n < best) { best = s / n; bo = ov; bdy = dy; }
    }
    xs.push(xs[i - 1] + ws[i - 1] - bo / A.k); ys.push(ys[i - 1] + bdy / A.k);
  }
  const W = Math.round(xs[xs.length - 1] + ws[ws.length - 1]), y0 = Math.min(...ys), Ht = Math.round(H + Math.max(...ys) - y0), d = newDoc(t('img.pano'), W, Ht, null);
  imgs.forEach((c, i) => {
    const s = newSmart(files[i].name.replace(/\.[^.]+$/, ''), c, files[i].blob, 'image/png', xs[i] + ws[i] / 2, ys[i] - y0 + H / 2); s.tf.sx = s.tf.sy = sc[i];
    if (i > 0) { const ov = xs[i - 1] + ws[i - 1] - xs[i], m = mkCanvas(W, Ht), g = ctx2d(m), gr = g.createLinearGradient(xs[i], 0, xs[i] + Math.max(2, ov), 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(xs[i], 0, Math.max(2, ov), Ht); g.fillStyle = '#fff'; g.fillRect(xs[i] + Math.max(2, ov), 0, W, Ht); s.mask = { cv: m, x: 0, y: 0, on: true }; }
    d.layers.push(s);
  });
  ed.add(d, ui.vw, ui.vh); toast(t('img.t.panoDone'));
}

/* ---------- macros (I124) : on enregistre les commandes et les filtres, puis on les rejoue ---------- */
interface Step { k: 'cmd' | 'filter'; id: string; def?: FilterDef }
interface Macro { n: string; steps: Step[] }
const MK = 'dedcut-image-macros';
export const macros = (): Macro[] => { try { return JSON.parse(localStorage.getItem(MK) || '[]'); } catch { return []; } };
const saveMacros = (m: Macro[]) => { try { localStorage.setItem(MK, JSON.stringify(m)); } catch { toast(t('img.t.storageFull')); } };
export const rec = { on: false, steps: [] as (Step & { live?: FilterDef })[] };
export function recordCmd(id: string) { if (rec.on && !['undo', 'redo', 'redo2', 'macroRec', 'palette', 'help', 'keys', 'prefs', 'tablet'].includes(id)) rec.steps.push({ k: 'cmd', id }); }
export function recordFilter(id: string, def: FilterDef) { if (rec.on) rec.steps.push({ k: 'filter', id, live: def }); }
export async function recToggle() {
  if (!rec.on) { rec.on = true; rec.steps = []; toast(t('img.t.recOn')); ed.emit(); return; }
  rec.on = false; ed.emit(); if (!rec.steps.length) { toast(t('img.t.recEmpty')); return; }
  const n = await askText(t('img.q.macroName'), t('img.macroN', { n: macros().length + 1 })); if (!n) return;
  const steps = rec.steps.map(s => ({ k: s.k, id: s.id, def: s.live ? structuredClone(s.live) : undefined })); const m = macros(); m.push({ n: n.slice(0, 40), steps }); saveMacros(m); toast(t('img.t.macroSaved'));
}
export async function playMacro(m: Macro) {
  const { runCmd } = await import('./commands'), { openFilter } = await import('./fxlib');
  for (const s of m.steps) {
    if (s.k === 'cmd') runCmd(s.id);
    else { await openFilter(s.id); const L = ed.layer, list = L && (L.type === 'smart' ? L.filters : L.type === 'adjust' ? L.adj : null); if (list && s.def) { const last = list[list.length - 1]; ed.act('img.h.filter', () => { Object.assign(last, structuredClone(s.def!)); }, 'all'); } }
  }
}

/* ---------- traitement par lots (I125, I126) ---------- */
interface BatchOpts { macro: number; maxW: number; maxH: number; format: 'png' | 'jpeg' | 'webp' | 'tiff'; quality: number; pattern: string; meta: 'none' | 'basic' }
export async function runBatch(files: { name: string; blob: Blob }[], o: BatchOpts, dir: string | null, onProg: (i: number, n: number) => void): Promise<number> {
  const b = bridge(), m = o.macro >= 0 ? macros()[o.macro] : null; let n = 0; const cur = ed.cur;
  for (let i = 0; i < files.length; i++) {
    onProg(i, files.length);
    try {
      const dec = await decode(files[i].blob, files[i].name); const { docFromImage } = await import('./io'); const doc = docFromImage(dec, files[i].name, files[i].blob);
      ed.add(doc, ui.vw, ui.vh); if (m) await playMacro(m);
      const k = Math.min(1, o.maxW > 0 ? o.maxW / ed.doc!.w : 1, o.maxH > 0 ? o.maxH / ed.doc!.h : 1);
      const blob = await exportBlob(ed.doc!, { format: o.format, quality: o.quality, scale: k, bg: '#ffffff', meta: o.meta, artist: '', copyright: '' } as ExpOpts);
      const base = files[i].name.replace(/\.[^.]+$/, ''), name = (o.pattern || '{name}').replace(/\{name\}/g, base).replace(/\{n\}/g, String(i + 1).padStart(3, '0')).replace(/[\\/:*?"<>|]/g, '_') + '.' + FORMAT_INFO[o.format].ext;
      if (b && dir) await b.write(dir.replace(/[\\/]$/, '') + '\\' + name, blob); else { const { writeFile } = await import('./io'); await writeFile(blob, name, null); }
      n++;
    } catch (e) { toast(files[i].name + ' : ' + errText(e)); }
    finally { const j = ed.docs.length - 1; if (j >= 0 && j !== cur) ed.close(j); }
  }
  ed.cur = Math.min(cur, ed.docs.length - 1); onProg(files.length, files.length); ed.emit(); return n;
}

/* ---------- kits de marque et modèles (I127) ---------- */
interface Kit { n: string; colors: string[]; fonts: string[]; logos: string[] }
const KK = 'dedcut-image-kits';
export const kits = (): Kit[] => { try { return JSON.parse(localStorage.getItem(KK) || '[]'); } catch { return []; } };
const saveKits = (k: Kit[]) => { try { localStorage.setItem(KK, JSON.stringify(k)); } catch { toast(t('img.t.storageFull')); } };
const tdb = (): Promise<IDBDatabase> => new Promise((ok, ko) => { const r = indexedDB.open('dedcut-image-templates', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
export async function saveTemplate() {
  const d = ed.doc; if (!d) return; const n = await askText(t('img.q.templateName'), d.name); if (!n) return;
  const data = await serialize(d), th = await new Promise<Blob | null>(r => thumb(d, 120).toBlob(r, 'image/png'));
  const db = await tdb(); await new Promise<void>(ok => { const tx = db.transaction('t', 'readwrite'); tx.objectStore('t').put({ n: n.slice(0, 40), data, th, w: d.w, h: d.h, t: Date.now() }, 'u' + Date.now()); tx.oncomplete = () => ok(); tx.onerror = () => ok(); }); db.close(); toast(t('img.t.templateSaved'));
}
async function listTemplates(): Promise<{ key: string; n: string; data: Blob; th: Blob | null; w: number; h: number }[]> {
  try { const db = await tdb(); const r = await new Promise<{ key: string; n: string; data: Blob; th: Blob | null; w: number; h: number }[]>(ok => { const out: { key: string; n: string; data: Blob; th: Blob | null; w: number; h: number }[] = []; const c = db.transaction('t').objectStore('t').openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { out.push({ key: String(cu.key), ...cu.value }); cu.continue(); } else ok(out); }; c.onerror = () => ok(out); }); db.close(); return r; } catch { return []; }
}
/** modèles originaux de DedCut (dessinés ici) */
function builtinTemplate(id: string): Doc {
  const mk = (w: number, h: number) => newDoc(t('img.tpl.' + id), w, h, null);
  if (id === 'yt') { const d = mk(1280, 720), b = newRaster(t('img.layer.bg'), 1280, 720), g = ctx2d(b.cv), gr = g.createLinearGradient(0, 0, 1280, 720); gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#7c3aed'); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720); d.layers.push(b);
    const s = newShape(t('img.shape.rect'), { ...shapeItem('rect', 640, 120), r: 24 }, 380, 520, '#fbbf24'); d.layers.push(s);
    const tl = newText(t('img.tpl.ytTitle'), 380, 300, { size: 110, weight: 900, font: 'Anton', fill: { kind: 'color', color: '#ffffff' }, stroke: { on: true, color: '#000000', width: 6 } }); d.layers.push(tl);
    const st = newText(t('img.tpl.ytSub'), 380, 520, { size: 54, weight: 800, font: 'Bahnschrift', fill: { kind: 'color', color: '#111827' } }); d.layers.push(st); return d; }
  if (id === 'post') { const d = mk(1080, 1080), b = newRaster(t('img.layer.bg'), 1080, 1080), g = ctx2d(b.cv); g.fillStyle = '#fdf2f8'; g.fillRect(0, 0, 1080, 1080); d.layers.push(b);
    const c = newShape(t('img.shape.ellipse'), shapeItem('ellipse', 760, 760), 540, 540, '#f472b6'); c.opacity = .35; d.layers.push(c);
    d.layers.push(newText(t('img.tpl.postTitle'), 540, 480, { size: 120, weight: 900, font: 'Poppins', align: 'center', fill: { kind: 'color', color: '#831843' } }));
    d.layers.push(newText(t('img.tpl.postSub'), 540, 640, { size: 48, weight: 600, font: 'Poppins', align: 'center', fill: { kind: 'color', color: '#9d174d' } })); return d; }
  if (id === 'poster') { const d = mk(2480, 3508), b = newRaster(t('img.layer.bg'), 2480, 3508), g = ctx2d(b.cv); g.fillStyle = '#0f172a'; g.fillRect(0, 0, 2480, 3508); d.layers.push(b); d.dpi = 300;
    const band = newShape(t('img.shape.rect'), shapeItem('rect', 2480, 900), 1240, 2900, '#22d3ee'); d.layers.push(band);
    d.layers.push(newText(t('img.tpl.posterTitle'), 1240, 1300, { size: 300, weight: 900, font: 'Bebas Neue', align: 'center', fill: { kind: 'color', color: '#f8fafc' } }));
    d.layers.push(newText(t('img.tpl.posterDate'), 1240, 2900, { size: 150, weight: 800, font: 'Bahnschrift', align: 'center', fill: { kind: 'color', color: '#0f172a' } })); return d; }
  const d = mk(1080, 1920), b = newRaster(t('img.layer.bg'), 1080, 1920), g = ctx2d(b.cv), gr = g.createLinearGradient(0, 0, 0, 1920); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(1, '#22c55e'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); d.layers.push(b);
  d.layers.push(newText(t('img.tpl.storyTitle'), 540, 860, { size: 130, weight: 900, font: 'Luckiest Guy', align: 'center', fill: { kind: 'color', color: '#ffffff' } })); return d;
}

/* ---------- bibliothèque DedCut (I128) et envoi au Montage (I129) ---------- */
type Med = { id: number; name: string; type: string; path?: string; url?: string };
const montageMedia = (): Med[] => { try { return (new Function('return typeof media!=="undefined"?media:[]')() as Med[]) || []; } catch { return []; } };
/** envoie l'image (ou un seul calque, sur fond transparent) au Montage : ajoutée aux médias et posée sur la timeline,
 *  à la tête de lecture (un calque seul va par-dessus la vidéo). Le Montage s'ouvre ensuite. */
export async function sendToMontage(layer?: Layer) {
  const d = ed.doc; if (!d) return; const FS = (window as unknown as { dedcutFS?: { saveMedia(b: Blob, n: string): Promise<{ path: string; name: string; size: number; exists: boolean }> } }).dedcutFS;
  let blob: Blob, name = d.name;
  if (layer) {
    const c = renderRect({ ...d, bg: null, layers: [{ ...layer, visible: true } as Layer] }, { x: 0, y: 0, w: d.w, h: d.h }, 1, undefined, { bg: false });
    blob = await new Promise<Blob>((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error('png')), 'image/png')); name = d.name + ' - ' + layer.name;
  } else blob = await exportBlob(d, { format: 'png', quality: 1, scale: 1, bg: '#ffffff', meta: 'none', artist: '', copyright: '' });
  name = name.replace(/[\\/:*?"<>|]+/g, '').slice(0, 80);
  const W = window as unknown as { addPaths?: (l: unknown[]) => unknown; addFiles?: (l: File[]) => unknown; ibToMontage?: (id: number, over: boolean) => void };
  try {
    let list: unknown = null;
    if (FS && W.addPaths) { const f = await FS.saveMedia(blob, name + '.png'); list = await W.addPaths([f]); }
    else if (W.addFiles) list = await W.addFiles([new File([blob], name + '.png', { type: 'image/png' })]);
    const m = Array.isArray(list) ? list[0] as { id: number } | undefined : undefined;
    if (m && W.ibToMontage) { W.ibToMontage(m.id, !!layer); toast(t(layer ? 'img.t.sentLayer' : 'img.t.sentTimeline')); }
    else toast(t('img.t.sentMontage'));
  } catch (e) { toast(errText(e)); }
}

/* ---------- génération d'image avec l'IA locale de DedCut (I121, I122, I123) ---------- */
type AiApi = { status(): Promise<{ models: { id: string; ready: boolean }[]; busy: boolean }>; generate(p: Record<string, unknown>): Promise<{ path: string | null }>; cancel(): Promise<void> };
const aiApi = () => (window as unknown as { dedcutAI?: AiApi }).dedcutAI || null;

/* ---------- extensions isolées (I130, I131) ---------- */
interface ExtParam { k: string; label: string; min: number; max: number; step?: number; def: number }
interface ExtFilter { id: string; name: string; params: ExtParam[] }
interface Ext { id: string; name: string; version: string; author: string; description: string; permissions: string[]; filters: ExtFilter[]; code: string; sha: string; from: string; at: number; on: boolean }
const EK = 'dedcut-image-ext', SAFE = 'dedcut-image-ext-safe';
export const exts = (): Ext[] => { try { return JSON.parse(localStorage.getItem(EK) || '[]'); } catch { return []; } };
const saveExts = (e: Ext[]) => { try { localStorage.setItem(EK, JSON.stringify(e)); } catch { toast(t('img.t.storageFull')); } };
export const safeMode = () => localStorage.getItem(SAFE) === '1';
const ALLOWED = ['filter'];
async function sha256(s: string) { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); return Array.from(d, b => b.toString(16).padStart(2, '0')).join(''); }
/** installe une extension (.dcext) : manifeste vérifié, permissions affichées, empreinte du code gardée */
export async function installExt(file: File) {
  let j: Partial<Ext>; try { j = JSON.parse(await file.text()); } catch { toast(t('img.ext.bad')); return; }
  if (!j.id || !j.name || typeof j.code !== 'string' || !Array.isArray(j.filters) || !Array.isArray(j.permissions) || j.code.length > 300000) { toast(t('img.ext.bad')); return; }
  const bad = j.permissions.filter(p => !ALLOWED.includes(p)); if (bad.length) { toast(t('img.ext.perm', { list: bad.join(', ') })); return; }
  const sha = await sha256(j.code), list = exts(), old = list.find(e => e.id === j.id);
  const msg = t(old ? 'img.ext.update' : 'img.ext.install', { name: String(j.name), author: String(j.author || '?'), version: String(j.version || '?'), perms: j.permissions.map(p => t('img.ext.p_' + p)).join(', '), sha: sha.slice(0, 16) });
  const ask = (window as unknown as { askYes?: (m: string) => Promise<boolean> }).askYes; if (!(ask ? await ask(msg) : window.confirm(msg))) return;
  const e: Ext = { id: String(j.id).slice(0, 60), name: String(j.name).slice(0, 60), version: String(j.version || '1').slice(0, 20), author: String(j.author || '').slice(0, 60), description: String(j.description || '').slice(0, 300), permissions: j.permissions, filters: (j.filters as ExtFilter[]).slice(0, 20), code: j.code, sha, from: file.name, at: Date.now(), on: true };
  saveExts([...list.filter(x => x.id !== e.id), e]); toast(t('img.ext.installed', { name: e.name })); ed.emit();
}
/** lanceur du cadre isolé : texte FIXE (le code de l'extension arrive par message), autorisé par son empreinte sha256
 *  dans la CSP de src-tauri/tauri.conf.json. S'il change, recalculer l'empreinte : `npm run verifier` la contrôle. */
export const EXT_BOOT = "(function(){var w=null;addEventListener('message',function(e){if(e.source!==parent)return;var d=e.data;if(!w){if(!d||typeof d.dcCode!=='string')return;w=new Worker(URL.createObjectURL(new Blob([d.dcCode],{type:'text/javascript'})));w.onmessage=function(r){parent.postMessage(r.data,'*',r.data&&r.data.buf?[r.data.buf]:[])};w.onerror=function(x){parent.postMessage({ok:false,err:String(x.message||'error')},'*')};return}w.postMessage(d,[d.buf])})})()";
/** exécution dans un cadre isolé (aucun accès à DedCut, aux fichiers, au réseau, ni au bouton « Soutenir DedCut ») */
function runIsolated(ext: Ext, fid: string, img: ImageData, params: Record<string, number>): Promise<ImageData> {
  return new Promise((ok, ko) => {
    const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts'); f.style.display = 'none';
    // le code de l'extension tourne dans un « worker » créé dans le cadre isolé : même s'il boucle sans fin, DedCut reste fluide
    const work = `"use strict";var exports={};${ext.code}\n;onmessage=function(e){try{var d=e.data,img=new ImageData(new Uint8ClampedArray(d.buf),d.w,d.h);var r=(exports.filter||self.filter)(d.fid,img,d.params);postMessage({ok:true,buf:r.data.buffer,w:r.width,h:r.height},[r.data.buffer])}catch(err){postMessage({ok:false,err:String(err)})}}`;
    const runtime = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:"><script>${EXT_BOOT}</script>`;
    f.srcdoc = runtime; const tm = setTimeout(() => { done(); ko(new Error(t('img.ext.timeout'))); }, 15000);
    const onMsg = (e: MessageEvent) => { if (e.source !== f.contentWindow) return; done(); if (e.data && e.data.ok && e.data.w === img.width && e.data.h === img.height) ok(new ImageData(new Uint8ClampedArray(e.data.buf), e.data.w, e.data.h)); else ko(new Error(String(e.data && e.data.err || t('img.ext.badResult')))); };
    const done = () => { clearTimeout(tm); window.removeEventListener('message', onMsg); f.remove(); };
    window.addEventListener('message', onMsg); f.onload = () => { const buf = img.data.slice().buffer, cw = f.contentWindow!; cw.postMessage({ dcCode: work }, '*'); cw.postMessage({ fid, buf, w: img.width, h: img.height, params }, '*', [buf]); };
    document.body.appendChild(f);
  });
}
export async function applyExtFilter(ext: Ext, ef: ExtFilter, params: Record<string, number>) {
  const l = ed.layer; if (!l || l.type !== 'raster') { toast(t('img.t.needPixels')); return; }
  if ((await sha256(ext.code)) !== ext.sha) { toast(t('img.ext.tampered')); return; }
  try { const g = ctx2d(l.cv, true), img = g.getImageData(0, 0, l.cv.width, l.cv.height), res = await runIsolated(ext, ef.id, img, params);
    ed.act('img.h.ext', tx => { tx.touch(l.cv); g.putImageData(res, 0, 0); }, 'all'); toast(t('img.ext.applied', { name: ef.name }));
  } catch (e) { toast(t('img.ext.fail', { error: String((e as Error).message).slice(0, 100) })); }
}

/* ---------- fenêtres du lot 3 ---------- */
export function ProDialogs() {
  useEd(); const k = ui.dialog as string | null;
  if (k === 'macros') return <MacrosDlg />; if (k === 'batch') return <BatchDlg />; if (k === 'kits') return <KitsDlg />; if (k === 'library') return <LibraryDlg />;
  if (k === 'collage') return <CollageDlg />; if (k === 'gen') return <GenDlg />; if (k === 'ext') return <ExtDlg />; if (k === 'aiinfo') return <AiInfoDlg />;
  return null;
}
function MacrosDlg() {
  const list = macros();
  return <Modal title={t('img.c.macros')} onClose={close}>
    <p className="im-hint">{t('img.mc.hint')}</p>
    <div className="im-row"><button className={rec.on ? 'pri' : ''} onClick={() => { recToggle(); }}><Ico n="macro" s={14} />{t(rec.on ? 'img.mc.stop' : 'img.mc.start')}</button>{rec.on && <span className="im-hint">{t('img.mc.steps', { n: rec.steps.length })}</span>}</div>
    <div className="im-recover">{list.map((m, i) => <div key={i} className="im-rrow"><div><b>{m.n}</b><small>{t('img.mc.steps', { n: m.steps.length })}</small></div>
      <button className="pri" disabled={!ed.doc} onClick={() => { close(); playMacro(m); }}>{t('img.mc.play')}</button>
      <button onClick={() => { const l = macros(); l.splice(i, 1); saveMacros(l); ed.emit(); }}>{t('img.del')}</button></div>)}</div>
    <div className="im-btns"><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}
function BatchDlg() {
  const [files, setFiles] = useState<{ name: string; blob: Blob }[]>([]), [dir, setDir] = useState<string | null>(null), [prog, setProg] = useState<[number, number] | null>(null);
  const [o, setO] = useState<BatchOpts>({ macro: -1, maxW: 1920, maxH: 1920, format: 'jpeg', quality: .88, pattern: '{name}', meta: 'none' });
  const b = bridge() as (ReturnType<typeof bridge> & { pickDir?: (t: string) => Promise<string | null> }) | null;
  return <Modal title={t('img.c.batch')} onClose={close} wide>
    <div className="im-form">
      <div className="im-row"><button onClick={async () => setFiles(await askFiles(t('img.f.open')))}><Ico n="open" s={14} />{t('img.b.pick')}</button><span className="im-hint">{t('img.b.count', { n: files.length })}</span></div>
      <label><span>{t('img.b.macro')}</span><select value={o.macro} onChange={e => setO({ ...o, macro: +e.target.value })}><option value={-1}>{t('img.b.noMacro')}</option>{macros().map((m, i) => <option key={i} value={i}>{m.n}</option>)}</select></label>
      <div className="im-row"><label><span>{t('img.b.maxW')}</span><input type="number" value={o.maxW} onChange={e => setO({ ...o, maxW: Math.max(0, +e.target.value) })} /></label><label><span>{t('img.b.maxH')}</span><input type="number" value={o.maxH} onChange={e => setO({ ...o, maxH: Math.max(0, +e.target.value) })} /></label></div>
      <p className="im-hint">{t('img.b.maxHint')}</p>
      <label><span>{t('img.x.format')}</span><select value={o.format} onChange={e => setO({ ...o, format: e.target.value as BatchOpts['format'] })}>{(['jpeg', 'png', 'webp', 'tiff'] as const).map(f => <option key={f} value={f}>{t('img.x.f_' + f)}</option>)}</select></label>
      {(o.format === 'jpeg' || o.format === 'webp') && <label><span>{t('img.x.quality')}</span><input type="range" min={.3} max={1} step={.01} value={o.quality} onChange={e => setO({ ...o, quality: +e.target.value })} /><b>{Math.round(o.quality * 100)}</b></label>}
      <label><span>{t('img.b.pattern')}</span><input value={o.pattern} onChange={e => setO({ ...o, pattern: e.target.value })} /><small>{t('img.b.patternHint')}</small></label>
      <label><span>{t('img.x.meta')}</span><select value={o.meta} onChange={e => setO({ ...o, meta: e.target.value as 'none' })}><option value="none">{t('img.x.m_none')}</option><option value="basic">{t('img.x.m_basic')}</option></select></label>
      {b && <div className="im-row"><button onClick={async () => setDir(await b.pickDir!(t('img.b.dir')))}><Ico n="folder" s={14} />{t('img.b.dir')}</button><span className="im-hint">{dir || t('img.b.noDir')}</span></div>}
      {prog && <p className="im-hint">{t('img.b.prog', { i: prog[0], n: prog[1] })}</p>}
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" disabled={!files.length || (!!b && !dir) || !!prog} onClick={async () => { const n = await runBatch(files, o, dir, (i, n2) => setProg([i, n2])); setProg(null); toast(t('img.t.exported', { count: n })); close(); }}>{t('img.b.go')}</button></div>
  </Modal>;
}
function KitsDlg() {
  useEd(); const [list, setList] = useState(kits()), [i, setI] = useState(0), [tpls, setTpls] = useState<Awaited<ReturnType<typeof listTemplates>>>([]);
  const [bth, setBth] = useState<Record<string, string>>({});
  useEffect(() => { listTemplates().then(setTpls); const o: Record<string, string> = {}; for (const id of ['yt', 'post', 'story', 'poster']) { try { o[id] = thumb(builtinTemplate(id), 96).toDataURL('image/png'); } catch { /* aperçu facultatif */ } }
    for (const id of THUMB_TPLS) { try { o[id] = thumb(thumbTemplate(id), 160).toDataURL('image/png'); } catch { /* aperçu facultatif */ } } setBth(o); }, []);
  const kit = list[i], upd = (k: Kit[]) => { setList(k); saveKits(k); };
  const addLogo = async () => { const [f] = await askFiles(t('img.k2.logo'), false); if (!f || !kit) return; const dec = await decode(f.blob, f.name), k = Math.min(1, 512 / Math.max(dec.cv.width, dec.cv.height)), c = mkCanvas(dec.cv.width * k, dec.cv.height * k); ctx2d(c).drawImage(dec.cv, 0, 0, c.width, c.height); kit.logos.push(c.toDataURL('image/png')); upd([...list]); };
  return <Modal title={t('img.c.kits')} onClose={close} wide>
    <h5>{t('img.tpl.thumbs')}</h5>
    <div className="im-presets im-thtpl">{THUMB_TPLS.map(id => <button key={id} onClick={() => { ed.add(thumbTemplate(id), ui.vw, ui.vh); close(); }}>{bth[id] ? <img src={bth[id]} alt="" /> : <i />}<b>{t('img.tpl.' + id)}</b><small>1280 × 720</small></button>)}</div>
    <p className="im-hint">{t('img.tpl.thumbsHint')}</p>
    <h5>{t('img.k2.templates')}</h5>
    <div className="im-presets">{['yt', 'post', 'story', 'poster'].map(id => <button key={id} onClick={() => { ed.add(builtinTemplate(id), ui.vw, ui.vh); close(); }}>{bth[id] ? <img src={bth[id]} alt="" style={{ height: 40 }} /> : <i style={{ aspectRatio: id === 'yt' ? '16/9' : id === 'post' ? '1' : id === 'story' ? '9/16' : '0.707' }} />}<b>{t('img.tpl.' + id)}</b><small>DedCut</small></button>)}
      {tpls.map(tp => <button key={tp.key} onClick={async () => { try { const d = await deserialize(tp.data); ed.add(d, ui.vw, ui.vh); close(); } catch (e) { toast(errText(e)); } }} onContextMenu={async e => { e.preventDefault(); const db = await tdb(); db.transaction('t', 'readwrite').objectStore('t').delete(tp.key); db.close(); setTpls(await listTemplates()); }}>
        {tp.th ? <img src={URL.createObjectURL(tp.th)} alt="" style={{ height: 40 }} /> : <i />}<b>{tp.n}</b><small>{tp.w} × {tp.h}</small></button>)}</div>
    <div className="im-row"><button disabled={!ed.doc} onClick={async () => { await saveTemplate(); setTpls(await listTemplates()); }}><Ico n="save" s={14} />{t('img.k2.saveTpl')}</button><span className="im-hint">{t('img.k2.tplHint')}</span></div>
    <h5>{t('img.k2.kits')}</h5>
    <div className="im-row">{list.map((k, j) => <button key={j} className={j === i ? 'on' : ''} onClick={() => setI(j)}>{k.n}</button>)}
      <button onClick={() => { void askText(t('img.q.kitName'), t('img.k2.kitN', { n: list.length + 1 })).then(n => { if (n) { upd([...list, { n: n.slice(0, 40), colors: [], fonts: [], logos: [] }]); setI(list.length); } }); }}><Ico n="plus" s={13} />{t('img.k2.newKit')}</button></div>
    {kit && <div className="im-form">
      <div className="im-favs"><small>{t('img.k2.colors')}</small>{kit.colors.map((c, j) => <button key={j} style={{ background: c }} title={c} onClick={() => ed.setFg(c)} onContextMenu={e => { e.preventDefault(); kit.colors.splice(j, 1); upd([...list]); }} />)}<button className="im-add" title={t('img.k2.addColor')} onClick={() => { kit.colors.push(ed.fg); upd([...list]); }}><Ico n="plus" s={12} /></button></div>
      <div className="im-row"><small>{t('img.k2.fonts')}</small>{kit.fonts.map((f, j) => <button key={j} style={{ fontFamily: `"${f}"` }} onClick={() => { ed.text.font = f; const l = ed.layer; if (l && l.type === 'text') ed.act('img.h.text', () => { l.st.font = f; }, 'all'); ed.emit(); }} onContextMenu={e => { e.preventDefault(); kit.fonts.splice(j, 1); upd([...list]); }}>{f}</button>)}
        <button title={t('img.k2.addFont')} onClick={() => { const f = ed.layer && ed.layer.type === 'text' ? ed.layer.st.font : ed.text.font; if (!kit.fonts.includes(f)) { kit.fonts.push(f); upd([...list]); } }}><Ico n="plus" s={12} /></button></div>
      <div className="im-row"><small>{t('img.k2.logos')}</small>{kit.logos.map((u, j) => <button key={j} onClick={async () => { const blob = await (await fetch(u)).blob(); await importLayers([{ name: 'logo.png', blob }]); close(); }} onContextMenu={e => { e.preventDefault(); kit.logos.splice(j, 1); upd([...list]); }}><img src={u} alt="" style={{ height: 32 }} /></button>)}
        <button onClick={addLogo}><Ico n="plus" s={12} />{t('img.k2.logo')}</button></div>
      <p className="im-hint">{t('img.k2.hint')}</p>
      <button onClick={() => { upd(list.filter((_, j) => j !== i)); setI(0); }}>{t('img.del')}</button>
    </div>}
    <div className="im-btns"><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}
function LibraryDlg() {
  const list = montageMedia().filter(m => m.type === 'image' && (m.url || m.path)), FS = (window as unknown as { dedcutFS?: { fileUrl(p: string): string } }).dedcutFS;
  return <Modal title={t('img.c.library')} onClose={close} wide>
    <p className="im-hint">{t('img.lib.hint')}</p>
    <div className="im-presets">{list.map(m => <button key={m.id} onClick={async () => { try { const blob = m.path ? await readPath(m.path) : await (await fetch(m.url!)).blob(); if (ed.doc) await importLayers([{ name: m.name, blob, path: m.path }]); else await openFiles([{ name: m.name, blob }]); close(); } catch (e) { toast(errText(e)); } }}>
      <img src={m.url || (FS && m.path ? FS.fileUrl(m.path) : '')} alt="" style={{ height: 60, objectFit: 'contain' }} /><small>{m.name}</small></button>)}
      {!list.length && <p className="im-hint">{t('img.lib.empty')}</p>}</div>
    <div className="im-btns"><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}
function CollageDlg() {
  const [files, setFiles] = useState<{ name: string; blob: Blob; path?: string }[]>([]), [cols, setCols] = useState(2), [size, setSize] = useState('1080x1080'), [gap, setGap] = useState(16), [bg, setBg] = useState('#ffffff'), [mode, setMode] = useState<'grid' | 'hdr' | 'pano'>('grid');
  const [w, h] = size.split('x').map(Number);
  return <Modal title={t('img.c.assemble')} onClose={close}>
    <div className="im-seg">{(['grid', 'hdr', 'pano'] as const).map(m => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t('img.as.' + m)}</button>)}</div>
    <p className="im-hint">{t('img.as.' + mode + 'Hint')}</p>
    <div className="im-form">
      <div className="im-row"><button onClick={async () => setFiles(await askFiles(t('img.f.open')))}><Ico n="open" s={14} />{t('img.b.pick')}</button><span className="im-hint">{t('img.b.count', { n: files.length })}</span></div>
      {mode === 'grid' && <>
        <label><span>{t('img.as.cols')}</span><input type="number" min={1} max={8} value={cols} onChange={e => setCols(Math.max(1, Math.min(8, +e.target.value)))} /></label>
        <label><span>{t('img.x.scale')}</span><select value={size} onChange={e => setSize(e.target.value)}>{['1080x1080', '1080x1350', '1920x1080', '1080x1920', '2480x3508'].map(s => <option key={s} value={s}>{s.replace('x', ' × ')}</option>)}</select></label>
        <label><span>{t('img.as.gap')}</span><input type="number" min={0} max={200} value={gap} onChange={e => setGap(Math.max(0, +e.target.value))} /></label>
        <label><span>{t('img.n.bg')}</span><input type="color" value={bg} onChange={e => setBg(e.target.value)} /></label></>}
    </div>
    <div className="im-btns"><button onClick={close}>{t('common.cancel')}</button><button className="pri" disabled={files.length < (mode === 'grid' ? 1 : 2)} onClick={async () => { close(); if (mode === 'grid') await makeCollage(files, cols, w, h, gap, bg); else if (mode === 'hdr') await exposureFusion(files); else await panorama(files); }}>{t('img.as.go')}</button></div>
  </Modal>;
}
function GenDlg() {
  const api = aiApi(); const [models, setModels] = useState<{ id: string; ready: boolean }[]>([]), [p, setP] = useState(''), [m, setM] = useState(''), [size, setSize] = useState('832x480'), [busy, setBusy] = useState(false);
  useEffect(() => { api?.status().then(s => { const r = s.models.filter(x => x.ready); setModels(r); if (r[0]) setM(r[0].id); }).catch(() => {}); }, []); // eslint-disable-line
  const go = async () => {
    if (!api || !m || !p.trim()) return; setBusy(true); const [w, h] = size.split('x').map(Number);
    try {
      const r = await api.generate({ prompt: p.trim(), negative: '', width: w, height: h, frames: 5, fps: 16, steps: 8, seed: -1, cfg: 1, name: 'dedcut-image', model: m, image: false, enhance: false });
      if (!r.path) throw new Error('no output');
      const FS = (window as unknown as { dedcutFS: { fileUrl(p: string): string } }).dedcutFS, v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.src = FS.fileUrl(r.path);
      await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = ko; }); v.currentTime = Math.min(.15, (v.duration || 1) / 2); await new Promise(ok => { v.onseeked = ok; });
      const c = mkCanvas(v.videoWidth, v.videoHeight); ctx2d(c).drawImage(v, 0, 0); const blob = await new Promise<Blob | null>(rr => c.toBlob(rr, 'image/png'));
      if (blob) { if (ed.doc) await importLayers([{ name: p.slice(0, 30) + '.png', blob }]); else await openFiles([{ name: p.slice(0, 30) + '.png', blob }]); }
      close();
    } catch (e) { toast(t('img.gen.fail', { error: String((e as Error)?.message || e).slice(0, 100) })); }
    setBusy(false);
  };
  return <Modal title={t('img.c.generate')} onClose={() => { if (busy) api?.cancel(); close(); }}>
    <p className="im-hint">{t('img.gen.hint')}</p>
    {!api ? <p className="im-warn"><Ico n="warn" s={13} />{t('img.gen.noApp')}</p> : !models.length ? <p className="im-warn"><Ico n="warn" s={13} />{t('img.gen.noModel')}</p> : <div className="im-form">
      <label><span>{t('img.gen.model')}</span><select value={m} onChange={e => setM(e.target.value)}>{models.map(x => <option key={x.id} value={x.id}>{x.id}</option>)}</select></label>
      <label><span>{t('img.gen.prompt')}</span><textarea rows={3} value={p} onChange={e => setP(e.target.value)} placeholder={t('img.gen.ph')} /></label>
      <label><span>{t('img.x.scale')}</span><select value={size} onChange={e => setSize(e.target.value)}>{['832x480', '480x832', '640x640'].map(s => <option key={s} value={s}>{s.replace('x', ' × ')}</option>)}</select></label>
    </div>}
    <div className="im-btns"><button onClick={() => { if (busy) api?.cancel(); close(); }}>{t('common.cancel')}</button><button className="pri" disabled={!api || !m || !p.trim() || busy} onClick={go}>{busy ? t('img.gen.busy') : t('img.gen.go')}</button></div>
  </Modal>;
}
function AiInfoDlg() {
  return <Modal title={t('img.ai.infoTitle')} onClose={close}>
    <p>{t('img.ai.info1')}</p><p>{t('img.ai.info2')}</p><p className="im-hint">{t('img.ai.info3')}</p>
    <div className="im-btns"><button className="pri" onClick={() => { localStorage.setItem('dedcut-image-aiinfo', '1'); close(); }}>{t('img.ok')}</button></div>
  </Modal>;
}
function ExtDlg() {
  useEd(); const list = exts(), inp = useRef<HTMLInputElement>(null), [run, setRun] = useState<{ e: Ext; f: ExtFilter; p: Record<string, number> } | null>(null);
  return <Modal title={t('img.c.extensions')} onClose={close} wide>
    <p className="im-hint">{t('img.ext.hint')}</p>
    <label className="im-chk"><input type="checkbox" checked={safeMode()} onChange={e => { localStorage.setItem(SAFE, e.target.checked ? '1' : '0'); ed.emit(); }} /><span>{t('img.ext.safe')}</span></label>
    <div className="im-recover">{list.map(e => <div key={e.id} className="im-rrow"><div><b>{e.name} <small>{e.version}</small></b><small>{t('img.ext.meta', { author: e.author || '?', from: e.from, date: fmt.date(e.at), sha: e.sha.slice(0, 12) })}</small><small>{e.description}</small><small>{t('img.ext.perms', { list: e.permissions.map(p => t('img.ext.p_' + p)).join(', ') })}</small></div>
      <label className="im-chk"><input type="checkbox" checked={e.on} onChange={ev => { saveExts(exts().map(x => x.id === e.id ? { ...x, on: ev.target.checked } : x)); ed.emit(); }} /><span>{t('img.ext.on')}</span></label>
      <button onClick={() => { saveExts(exts().filter(x => x.id !== e.id)); ed.emit(); }}>{t('img.ext.remove')}</button></div>)}
      {!list.length && <p className="im-hint">{t('img.ext.none')}</p>}</div>
    {!safeMode() && list.filter(e => e.on).flatMap(e => e.filters.map(f => <div key={e.id + f.id} className="im-row"><b>{f.name}</b><button disabled={ed.layer?.type !== 'raster'} onClick={() => setRun({ e, f, p: Object.fromEntries(f.params.map(q => [q.k, q.def])) })}>{t('img.ext.use')}</button></div>))}
    {run && <div className="im-filter"><b>{run.f.name}</b>{run.f.params.map(q => <label key={q.k} className="im-num"><span>{q.label}</span><input type="range" min={q.min} max={q.max} step={q.step || 1} value={run.p[q.k]} onChange={ev => setRun({ ...run, p: { ...run.p, [q.k]: +ev.target.value } })} /><b>{run.p[q.k]}</b></label>)}
      <button className="pri" onClick={async () => { await applyExtFilter(run.e, run.f, run.p); setRun(null); }}>{t('img.o.apply')}</button></div>}
    <input ref={inp} type="file" accept=".dcext,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) installExt(f); e.target.value = ''; }} />
    <div className="im-btns"><button onClick={() => inp.current?.click()}><Ico n="plus" s={14} />{t('img.ext.add')}</button><button className="pri" onClick={close}>{t('img.ok')}</button></div>
  </Modal>;
}
export { open as openPro, localSize, walk };
export type { Layer, SmartLayer };

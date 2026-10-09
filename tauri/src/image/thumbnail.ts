// DedCut Image — miniature faite par DedCut (v4.50), à partir d'une image de la vidéo (choisie dans le Montage, 15f-thumb.js)
// ou d'une image donnée. Le résultat est un document en calques modifiables : image améliorée, personne détourée avec un
// contour, gros titre lisible. Tout se fait sur ce PC (détourage : modèle « selfie segmenter » déjà livré).
// Styles : gaming (titre jaune épais, fond assombri), vlog (titre blanc doux), tuto (titre sur un bandeau), clean (sans détourage).
import { ed, ui, snapOrig, toast } from './state';
import { t } from '../i18n';
import { newDoc, newRaster, newText, newShape, shapeItem, mkCanvas, ctx2d, type Fx, type TextLayer, type Layer } from './doc';
import { subjectMask } from './ai';
import { loadFont, layout } from './text';

export interface ThumbJob {
  blob: Blob; title: string; style: 'gaming' | 'vlog' | 'tuto' | 'clean'; fmt: 'yt' | 'vertical' | 'square';
  /** visage dans l'image d'origine (0 à 1), pour cadrer dessus */
  face?: { x: number; y: number; w: number; h: number } | null; name?: string;
}
const SIZES = { yt: [1280, 720], vertical: [1080, 1920], square: [1080, 1080] } as const;
const fx = (kind: Fx['kind'], o: Partial<Fx>): Fx => ({ kind, on: true, color: '#000000', opacity: .6, size: 10, dist: 0, angle: 120, ...o });

/** coupe le titre en 1 à 3 lignes à peu près égales */
function wrap(title: string, maxChars: number): string {
  const words = title.trim().split(/\s+/).filter(Boolean); if (!words.length) return '';
  const n = Math.min(3, Math.max(1, Math.ceil(title.length / maxChars))); if (n === 1) return words.join(' ');
  const target = title.length / n, lines: string[] = []; let cur = '';
  for (const w of words) { if (cur && (cur + ' ' + w).length > target * 1.15 && lines.length < n - 1) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  lines.push(cur); return lines.join('\n');
}
/** taille de police pour que le texte tienne dans maxW × maxH */
function fit(l: TextLayer, maxW: number, maxH: number) {
  for (let i = 0; i < 4; i++) { const L = layout(l), k = Math.min(maxW / Math.max(1, L.w), maxH / Math.max(1, L.h)); l.st.size = Math.max(16, Math.min(l.st.size * k, 420)); if (Math.abs(k - 1) < .02) break; }
  if (l.st.stroke.on) l.st.stroke.width = Math.round(l.st.size * .11);
}

export async function makeThumbnail(job: ThumbJob) {
  const [W, H] = SIZES[job.fmt] || SIZES.yt;
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(job.blob); } catch { toast(t('th.fail')); return; }
  // cadrage : on remplit le format, centré sur le visage (ou le centre de l'image)
  const vw = bmp.width, vh = bmp.height, A = W / H, f = job.face;
  let cw = vw, ch = vh, cx = vw / 2, cy = vh / 2;
  if (f) { cx = (f.x + f.w / 2) * vw; cy = (f.y + f.h * .65) * vh; }
  if (vw / vh > A) { cw = vh * A; } else { ch = vw / A; }
  const sx = Math.min(vw - cw, Math.max(0, cx - cw / 2)), sy = Math.min(vh - ch, Math.max(0, cy - ch * .45));
  const base = mkCanvas(W, H), bg = ctx2d(base); bg.imageSmoothingQuality = 'high'; bg.drawImage(bmp, sx, sy, cw, ch, 0, 0, W, H); bmp.close();

  const doc = newDoc(t('th.docName', { name: (job.name || 'DedCut').slice(0, 40) }), W, H, null);
  const imgL = newRaster(t('th.layerImage'), W, H); ctx2d(imgL.cv).drawImage(base, 0, 0); doc.layers.push(imgL);
  ed.add(doc, ui.vw, ui.vh);
  // personne détourée (sauf style « clean ») : le masque est cherché sur l'image d'origine, avant les retouches
  let mask: HTMLCanvasElement | null = null;
  if (job.style !== 'clean') { try { mask = await subjectMask(doc, true); } catch { mask = null; } }
  let mcx = f ? ((f.x + f.w / 2) * vw - sx) / cw : .5, cover = 0;
  if (mask) {
    const k = 64 / Math.max(W, H), sw = Math.max(4, Math.round(W * k)), sh = Math.max(4, Math.round(H * k)), sm = mkCanvas(sw, sh), g = ctx2d(sm, true);
    g.drawImage(mask, 0, 0, sw, sh); const d = g.getImageData(0, 0, sw, sh).data; let n = 0, sxm = 0;
    for (let i = 0; i < sw * sh; i++) if (d[i * 4 + 3] > 128) { n++; sxm += i % sw; }
    cover = n / (sw * sh); if (n) mcx = sxm / n / sw;
    if (cover < .03 || cover > .75) mask = null; // pas de personne nette : pas de détourage
  }
  // fond retouché selon le style
  const look: Record<ThumbJob['style'], string> = {
    gaming: mask ? 'blur(3px) brightness(.68) saturate(1.35) contrast(1.1)' : 'saturate(1.35) contrast(1.12) brightness(1.02)',
    vlog: mask ? 'blur(1.5px) saturate(1.15) contrast(1.04) brightness(1.04)' : 'saturate(1.15) contrast(1.05) brightness(1.04)',
    tuto: 'saturate(1.1) contrast(1.06)', clean: 'saturate(1.12) contrast(1.05)'
  };
  { const g = ctx2d(imgL.cv); g.clearRect(0, 0, W, H); g.filter = look[job.style]; g.drawImage(base, -4, -4, W + 8, H + 8); g.filter = 'none';
    if (job.style === 'vlog') { g.fillStyle = 'rgba(255,170,90,.07)'; g.fillRect(0, 0, W, H); }
    // assombrissement des bords (le centre ressort)
    const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, job.style === 'gaming' ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.28)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  const add = (l: Layer) => { doc.layers.push(l); };
  if (mask) {
    const p = newRaster(t('th.layerPerson'), W, H), g = ctx2d(p.cv);
    g.filter = job.style === 'gaming' ? 'saturate(1.2) contrast(1.08) brightness(1.06)' : 'saturate(1.1) brightness(1.03)'; g.drawImage(base, 0, 0); g.filter = 'none';
    g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-over';
    const s = Math.max(W, H) / 1280;
    p.fx = job.style === 'gaming' ? [fx('stroke', { color: '#ffffff', opacity: 1, size: Math.round(12 * s) }), fx('glow', { color: '#22d3ee', opacity: .7, size: Math.round(34 * s) })]
      : job.style === 'tuto' ? [fx('stroke', { color: '#ffffff', opacity: 1, size: Math.round(9 * s) }), fx('shadow', { opacity: .45, size: Math.round(22 * s), dist: Math.round(8 * s) })]
        : [fx('stroke', { color: '#ffffff', opacity: .95, size: Math.round(7 * s) }), fx('shadow', { opacity: .4, size: Math.round(26 * s), dist: Math.round(6 * s) })];
    add(p);
  }
  // titre : du côté libre de l'image (en face de la personne) ; en haut pour le vertical
  const title = job.title.trim();
  if (title) {
    const vert = job.fmt === 'vertical', sq = job.fmt === 'square', left = mcx > .5;
    const font = { gaming: 'Luckiest Guy', vlog: 'Lilita One', tuto: 'Archivo Black', clean: 'Montserrat' }[job.style];
    await loadFont(font);
    const wide = vert || sq || job.style === 'clean' || !mask;
    const maxW = W * (wide ? .86 : job.style === 'tuto' ? .42 : .5), maxH = H * (vert ? .2 : wide ? .3 : .55);
    const cxT = wide ? W / 2 : left ? W * .28 : W * .72;
    const cyT = vert ? H * .16 : job.style === 'clean' || job.style === 'vlog' ? H * (sq ? .82 : .8) : sq ? H * .2 : H * .5;
    const txt = newText(wrap(job.style === 'gaming' || job.style === 'tuto' ? title.toUpperCase() : title, wide ? 18 : 12), cxT, cyT, {
      font, size: 120, weight: job.style === 'clean' ? 800 : 400, align: 'center', lh: 1.02,
      fill: { kind: 'color', color: job.style === 'gaming' ? '#ffe11a' : '#ffffff' },
      stroke: { on: job.style === 'gaming', color: '#000000', width: 12 }
    });
    fit(txt, maxW, maxH);
    const s = Math.max(W, H) / 1280;
    txt.fx = job.style === 'gaming' ? [fx('shadow', { opacity: .95, size: 0, dist: Math.round(txt.st.size * .07), angle: 120 })]
      : job.style === 'tuto' ? [fx('shadow', { opacity: .35, size: Math.round(8 * s), dist: Math.round(4 * s) })]
        : [fx('shadow', { opacity: .6, size: Math.round(22 * s), dist: Math.round(5 * s) })];
    if (job.style === 'gaming' && !wide) txt.tf.rot = -4;
    if (job.style === 'tuto') { // bandeau violet de DedCut derrière le titre
      const L = layout(txt), band = newShape(t('th.layerBand'), Object.assign(shapeItem('rect', L.w + txt.st.size * .9, L.h + txt.st.size * .5), { r: Math.round(txt.st.size * .22) }), cxT, cyT, '#7c3aed');
      if (band.stroke) band.stroke.on = false; band.fx = [fx('shadow', { opacity: .4, size: Math.round(18 * s), dist: Math.round(6 * s) })]; add(band);
    }
    if (job.style === 'clean') { // dégradé sombre sous le titre
      const sh = newRaster(t('th.layerShade'), W, H), g = ctx2d(sh.cv), gr = g.createLinearGradient(0, H * .55, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.62)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); add(sh);
    }
    add(txt); doc.sel = [txt.id];
  }
  doc.dirty = true;
  ed.ds?.comp.all(); snapOrig(); ed.emit();
  toast(t('th.ready'));
}

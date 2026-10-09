// DedCut Image — modèles de miniatures prêts à remplir (v4.54), dessinés ici (formes, dégradés, polices libres déjà livrées).
// Chaque emplacement « Ta photo » est un calque intelligent : Calque > Remplacer le contenu y met ta photo (taille et place gardées).
import { t } from '../i18n';
import { newDoc, newRaster, newSmart, newText, newShape, shapeItem, mkCanvas, ctx2d, type Doc, type Fx, type TextStyle } from './doc';

export const THUMB_TPLS = ['thGaming', 'thReact', 'thTuto', 'thVs', 'thTop', 'thVlog'] as const;
const fx = (kind: Fx['kind'], o: Partial<Fx>): Fx => ({ kind, on: true, color: '#000000', opacity: .6, size: 10, dist: 0, angle: 120, ...o });
/** emplacement de photo : rayures grises, icône d'image et consigne */
function slot(w: number, h: number, cx: number, cy: number) {
  const c = mkCanvas(w, h), g = ctx2d(c);
  g.fillStyle = '#2a2638'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 18; for (let x = -h; x < w; x += 44) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
  const s = Math.min(w, h) * .22, x0 = w / 2 - s / 2, y0 = h / 2 - s * .8;
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(3, s * .06); g.lineJoin = 'round';
  g.strokeRect(x0, y0, s, s * .78); g.beginPath(); g.arc(x0 + s * .32, y0 + s * .28, s * .09, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(x0 + s * .05, y0 + s * .7); g.lineTo(x0 + s * .4, y0 + s * .4); g.lineTo(x0 + s * .62, y0 + s * .58); g.lineTo(x0 + s * .78, y0 + s * .46); g.lineTo(x0 + s * .95, y0 + s * .62); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'center'; g.font = `700 ${Math.round(Math.min(w, h) * .075)}px Bahnschrift, sans-serif`; g.fillText(t('img.tpl.ph'), w / 2, y0 + s * 1.15);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `500 ${Math.round(Math.min(w, h) * .05)}px Bahnschrift, sans-serif`; g.fillText(t('img.tpl.phHint'), w / 2, y0 + s * 1.15 + Math.min(w, h) * .085);
  return newSmart(t('img.tpl.ph'), c, null, 'image/png', cx, cy);
}
function bg(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) { const b = newRaster(t('img.layer.bg'), w, h); paint(ctx2d(b.cv)); return b; }
const grad = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: string[]) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const txt = (s: string, x: number, y: number, st: Partial<TextStyle>, f: Fx[] = []) => { const l = newText(s, x, y, { align: 'center', lh: 1, ...st }); l.fx = f; return l; };
const box = (name: string, w: number, h: number, x: number, y: number, color: string, r = 0) => { const s = newShape(name, { ...shapeItem('rect', w, h), r }, x, y, color); if (s.stroke) s.stroke.on = false; return s; };

export function thumbTemplate(id: typeof THUMB_TPLS[number]): Doc {
  const W = 1280, H = 720, d = newDoc(t('img.tpl.' + id), W, H, null), L = d.layers;
  if (id === 'thGaming') {
    L.push(bg(W, H, g => { g.fillStyle = grad(g, 0, 0, W, H, ['#1e0b3a', '#5b0f2e', '#b91c1c']); g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 6; for (let i = 0; i < 40; i++) { const a = -0.35, x = (i * 97) % (W + 400) - 200; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + Math.tan(a) * -H, H); g.stroke(); } }));
    const p = slot(520, 640, 960, 380); p.fx = [fx('stroke', { color: '#ffffff', opacity: 1, size: 10 }), fx('glow', { color: '#facc15', opacity: .6, size: 30 })]; L.push(p);
    L.push(txt(t('img.tpl.gTitle'), 400, 300, { font: 'Luckiest Guy', size: 118, caps: true, fill: { kind: 'color', color: '#ffe11a' }, stroke: { on: true, color: '#000000', width: 13 } }, [fx('shadow', { opacity: .95, size: 0, dist: 9 })]));
    L.push(box(t('img.tpl.badge'), 300, 74, 300, 520, '#ef4444', 14));
    L.push(txt(t('img.tpl.gBadge'), 300, 520, { font: 'Archivo Black', size: 40, caps: true, fill: { kind: 'color', color: '#ffffff' } }));
  } else if (id === 'thReact') {
    L.push(bg(W, H, g => { g.fillStyle = grad(g, 0, 0, W, H, ['#fde047', '#fb923c']); g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(W * .3, H * .55); const a = i / 18 * Math.PI * 2; g.lineTo(W * .3 + Math.cos(a) * 1600, H * .55 + Math.sin(a) * 1600); g.lineTo(W * .3 + Math.cos(a + .12) * 1600, H * .55 + Math.sin(a + .12) * 1600); g.closePath(); g.fill(); } }));
    const v = slot(700, 440, 400, 410); v.fx = [fx('stroke', { color: '#ffffff', opacity: 1, size: 12 }), fx('shadow', { opacity: .45, size: 24, dist: 10 })]; v.tf.rot = -3; L.push(v);
    const f = slot(380, 460, 1050, 440); f.fx = [fx('stroke', { color: '#ffffff', opacity: 1, size: 12 })]; L.push(f);
    const ar = newShape(t('img.tpl.arrow'), { ...shapeItem('line', 190, 0), arrow: [false, true] }, 790, 300, '#ef4444'); if (ar.stroke) ar.stroke.width = 18; ar.tf.rot = 160; L.push(ar);
    L.push(txt(t('img.tpl.rTitle'), 640, 110, { font: 'Anton', size: 104, caps: true, fill: { kind: 'color', color: '#ffffff' }, stroke: { on: true, color: '#111111', width: 12 } }));
  } else if (id === 'thTuto') {
    L.push(bg(W, H, g => { g.fillStyle = grad(g, 0, 0, 0, H, ['#e0f2fe', '#f5f3ff']); g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(124,58,237,.08)'; for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); } }));
    const s = slot(640, 420, 380, 400); s.fx = [fx('stroke', { color: '#ffffff', opacity: 1, size: 10 }), fx('shadow', { opacity: .3, size: 30, dist: 12 })]; L.push(s);
    const c = newShape(t('img.tpl.num'), shapeItem('ellipse', 120, 120), 110, 150, '#22d3ee'); if (c.stroke) c.stroke.on = false; L.push(c);
    L.push(txt('1', 110, 150, { font: 'Archivo Black', size: 72, fill: { kind: 'color', color: '#ffffff' } }));
    L.push(txt(t('img.tpl.tTitle'), 970, 300, { font: 'Archivo Black', size: 70, caps: true, fill: { kind: 'color', color: '#1e1b4b' } }));
    L.push(box(t('img.tpl.badge'), 380, 70, 970, 470, '#7c3aed', 35));
    L.push(txt(t('img.tpl.tBadge'), 970, 470, { font: 'Bahnschrift', size: 36, weight: 700, fill: { kind: 'color', color: '#ffffff' } }));
  } else if (id === 'thVs') {
    L.push(bg(W, H, g => { g.fillStyle = '#0f172a'; g.fillRect(0, 0, W, H); }));
    L.push(slot(620, 720, 315, 360)); L.push(slot(620, 720, 965, 360));
    L.push(box(t('img.tpl.badge'), 260, 70, 200, 640, '#ef4444', 10)); L.push(txt(t('img.tpl.before'), 200, 640, { font: 'Archivo Black', size: 40, caps: true, fill: { kind: 'color', color: '#ffffff' } }));
    L.push(box(t('img.tpl.badge'), 260, 70, 1080, 640, '#22c55e', 10)); L.push(txt(t('img.tpl.after'), 1080, 640, { font: 'Archivo Black', size: 40, caps: true, fill: { kind: 'color', color: '#ffffff' } }));
    const v = newShape('VS', shapeItem('ellipse', 170, 170), 640, 360, '#facc15'); if (v.stroke) { v.stroke.on = true; v.stroke.width = 10; v.stroke.paint = { kind: 'color', color: '#0f172a' }; } L.push(v);
    L.push(txt('VS', 640, 362, { font: 'Luckiest Guy', size: 76, fill: { kind: 'color', color: '#0f172a' } }));
  } else if (id === 'thTop') {
    L.push(bg(W, H, g => { g.fillStyle = grad(g, 0, 0, W, H, ['#0c4a6e', '#1e1b4b', '#4c1d95']); g.fillRect(0, 0, W, H); }));
    const s = slot(560, 560, 900, 380); s.fx = [fx('stroke', { color: '#ffffff', opacity: 1, size: 10 }), fx('glow', { color: '#22d3ee', opacity: .55, size: 28 })]; s.tf.rot = 3; L.push(s);
    L.push(txt('TOP', 300, 190, { font: 'Bebas Neue', size: 150, fill: { kind: 'color', color: '#ffffff' } }));
    L.push(txt('5', 300, 400, { font: 'Bebas Neue', size: 330, fill: { kind: 'gradient', color: '#22d3ee', grad: { kind: 'linear', angle: 90, stops: [{ o: 0, c: '#22d3ee', a: 1 }, { o: 1, c: '#a78bfa', a: 1 }] } } }, [fx('shadow', { opacity: .5, size: 20, dist: 8 })]));
    L.push(txt(t('img.tpl.topTitle'), 300, 610, { font: 'Archivo Black', size: 46, caps: true, fill: { kind: 'color', color: '#fde047' } }));
  } else { // thVlog
    const p = slot(W, H, W / 2, H / 2); L.push(p);
    L.push(bg(W, H, g => { const gr = g.createLinearGradient(0, H * .45, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }));
    L[L.length - 1].name = t('th.layerShade');
    L.push(txt(t('img.tpl.vTitle'), 640, 560, { font: 'Lilita One', size: 110, fill: { kind: 'color', color: '#ffffff' } }, [fx('shadow', { opacity: .6, size: 22, dist: 5 })]));
    L.push(box(t('img.tpl.badge'), 300, 58, 640, 660, 'rgba(255,255,255,.9)', 29));
    L.push(txt(t('img.tpl.vPlace'), 640, 660, { font: 'Bahnschrift', size: 32, weight: 700, fill: { kind: 'color', color: '#111827' } }));
  }
  return d;
}

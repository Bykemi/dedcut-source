// DedCut Image — affichage du document : zoom, déplacement et rotation de la vue, damier de transparence,
// règles, grille, repères, cadre de transformation, aperçus des outils (recadrage, plume, sélection…).
import { ed, ui } from './state';
import { layerCorners, selLayers, Rect, SubPath, mkCanvas, ctx2d } from './doc';
import { subPathsToPath } from './paint';

export const RULER = 18;
/** ce que les outils veulent voir dessiné par-dessus l'image (coordonnées du document) */
export const over = {
  cursor: null as null | { x: number; y: number; r: number },
  crop: null as null | Rect, cropAngle: 0,
  pen: null as null | { paths: SubPath[]; hover: { x: number; y: number } | null },
  marquee: null as null | { kind: 'rect' | 'ellipse'; r: Rect } | { kind: 'lasso'; pts: [number, number][] },
  line: null as null | [number, number, number, number],
  guide: null as null | { o: 'h' | 'v'; p: number },
  text: null as null | Rect,
  sel: null as null | HTMLCanvasElement, selRect: null as null | Rect, ants: 0,
  hover: null as null | { x: number; y: number }
};

let checker: CanvasPattern | null = null;
function checkerPat(g: CanvasRenderingContext2D) {
  if (checker) return checker; const c = mkCanvas(16, 16), x = ctx2d(c);
  x.fillStyle = '#e4e4e7'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c4c4cc'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  checker = g.createPattern(c, 'repeat'); return checker!;
}

export class Viewport {
  g: CanvasRenderingContext2D; w = 100; h = 100; dpr = 1; need = true; raf = 0; alive = true; idleT = 0;
  constructor(public cv: HTMLCanvasElement) { this.g = cv.getContext('2d')!; this.loop(); }
  destroy() { this.alive = false; cancelAnimationFrame(this.raf); clearTimeout(this.idleT); }
  resize(w: number, h: number) {
    this.w = Math.max(10, w); this.h = Math.max(10, h); this.dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px'; ui.vw = this.w; ui.vh = this.h; this.need = true;
  }
  /** document → écran (pixels CSS) */
  matrix(): DOMMatrix {
    const v = ed.ds?.view; const m = new DOMMatrix(); if (!v) return m;
    if (v.rot) { m.translateSelf(this.w / 2, this.h / 2); m.rotateSelf(v.rot); m.translateSelf(-this.w / 2, -this.h / 2); }
    m.translateSelf(v.ox, v.oy); m.scaleSelf(v.zoom, v.zoom); return m;
  }
  toDoc(sx: number, sy: number) { const p = this.matrix().inverse().transformPoint({ x: sx, y: sy }); return { x: p.x, y: p.y }; }
  toScreen(x: number, y: number) { const p = this.matrix().transformPoint({ x, y }); return { x: p.x, y: p.y }; }
  /** zoom autour d'un point de l'écran */
  zoomAt(z: number, sx = this.w / 2, sy = this.h / 2) {
    const ds = ed.ds; if (!ds) return; z = Math.max(0.02, Math.min(64, z));
    const p = this.toDoc(sx, sy), v = ds.view; v.zoom = z;
    const q = this.toScreen(p.x, p.y); v.ox += sx - q.x; v.oy += sy - q.y; this.need = true; ed.emit();
  }
  fit() { ed.fit(this.w, this.h); this.need = true; ed.emit(); }
  actual() { this.zoomAt(1); }
  // espace Image caché (autre espace affiché) : pas de dessin à chaque image de l'écran ; on regarde 2 fois par seconde s'il revient
  loop = () => { if (!this.alive) return; if (!this.cv.getClientRects().length) { this.need = true; this.idleT = window.setTimeout(this.loop, 500); return; } this.raf = requestAnimationFrame(this.loop); if (over.sel) { over.ants = (over.ants + .35) % 16; this.need = true; } if (this.need) { this.need = false; this.draw(); } };

  draw() {
    const g = this.g, ds = ed.ds; g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    if (!ds) return;
    ds.comp.update();
    const d = ds.doc, m = this.matrix(), z = ds.view.zoom, M = new DOMMatrix([this.dpr, 0, 0, this.dpr, 0, 0]).multiply(m);
    // fond : damier (transparence) puis l'image
    g.save(); g.setTransform(M);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18 / z; g.fillStyle = '#fff'; g.fillRect(0, 0, d.w, d.h); g.shadowBlur = 0;
    g.save(); g.scale(1 / z, 1 / z); g.fillStyle = checkerPat(g); g.fillRect(0, 0, d.w * z, d.h * z); g.restore();
    g.imageSmoothingEnabled = z < 2; g.imageSmoothingQuality = 'high'; g.drawImage(ds.comp.cv, 0, 0);
    const orig = (ds as typeof ds & { orig?: HTMLCanvasElement }).orig;
    if (ui.compare && orig) { const cx = d.w * ui.cmpX; g.save(); g.beginPath(); g.rect(0, 0, cx, d.h); g.clip(); g.fillStyle = '#fff'; g.fillRect(0, 0, cx, d.h); g.drawImage(orig, 0, 0, d.w, d.h); g.restore(); g.fillStyle = '#a78bfa'; g.fillRect(cx - 1 / z, 0, 2 / z, d.h); }
    g.restore();
    const S = (x: number, y: number) => this.toScreen(x, y);
    g.lineWidth = 1;
    // grille
    if (ed.settings.grid && ed.settings.gridSize * z >= 5) {
      g.save(); g.strokeStyle = 'rgba(167,139,250,.28)'; g.beginPath(); const gs = ed.settings.gridSize;
      for (let x = gs; x < d.w; x += gs) { const a = S(x, 0), b = S(x, d.h); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
      for (let y = gs; y < d.h; y += gs) { const a = S(0, y), b = S(d.w, y); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
      g.stroke(); g.restore();
    }
    // repères
    if (ed.settings.guides) {
      g.save(); g.strokeStyle = '#22d3ee'; g.beginPath();
      for (const gd of [...d.guides, ...(over.guide ? [over.guide] : [])]) { const a = gd.o === 'v' ? S(gd.p, -1e5) : S(-1e5, gd.p), b = gd.o === 'v' ? S(gd.p, 1e5) : S(1e5, gd.p); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
      g.stroke(); g.restore();
    }
    // sélection (fourmis)
    if (over.selRect) {
      const r = over.selRect, pts = [S(r.x, r.y), S(r.x + r.w, r.y), S(r.x + r.w, r.y + r.h), S(r.x, r.y + r.h)];
      if (over.sel) { g.save(); g.setTransform(M); g.globalAlpha = .9; g.drawImage(over.sel, 0, 0); g.restore(); }
      else { g.save(); g.setLineDash([5, 4]); g.lineDashOffset = -over.ants; g.strokeStyle = '#fff'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke(); g.strokeStyle = '#000'; g.lineDashOffset = -over.ants + 4.5; g.stroke(); g.restore(); }
    }
    // cadre de transformation du / des calques sélectionnés (outil Déplacer)
    if (ed.tool === 'move' && ed.move.handles && !ed.busy) {
      for (const l of selLayers(d)) {
        if (l.type === 'adjust' || !l.visible) continue;
        const c = layerCorners(l, d).map(([x, y]) => S(x, y));
        g.save(); g.strokeStyle = '#a78bfa'; g.lineWidth = 1.3; g.beginPath(); c.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke();
        if (selLayers(d).length === 1 && !l.locked) {
          const hs = handles(c); g.fillStyle = '#fff'; g.strokeStyle = '#7c3aed';
          for (const [, p] of hs) { g.beginPath(); if (p.round) g.arc(p.x, p.y, 4.5, 0, 7); else g.rect(p.x - 4, p.y - 4, 8, 8); g.fill(); g.stroke(); }
          const top = hs.find(h => h[0] === 'n')![1], rot = hs.find(h => h[0] === 'rot')![1]; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(rot.x, rot.y); g.stroke();
        }
        g.restore();
      }
    }
    // recadrage
    if (over.crop) {
      const r = over.crop; g.save(); g.fillStyle = 'rgba(0,0,0,.55)';
      const outer = [S(-1e4, -1e4), S(d.w + 1e4, -1e4), S(d.w + 1e4, d.h + 1e4), S(-1e4, d.h + 1e4)], cx = r.x + r.w / 2, cy = r.y + r.h / 2, a = over.cropAngle * Math.PI / 180;
      const rp = (x: number, y: number) => S(cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a));
      const inner = [rp(r.x, r.y), rp(r.x + r.w, r.y), rp(r.x + r.w, r.y + r.h), rp(r.x, r.y + r.h)];
      g.beginPath(); outer.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); inner.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill('evenodd');
      g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); inner.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke();
      // règle des tiers
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath();
      for (const k of [1 / 3, 2 / 3]) { const p1 = rp(r.x + r.w * k, r.y), p2 = rp(r.x + r.w * k, r.y + r.h), p3 = rp(r.x, r.y + r.h * k), p4 = rp(r.x + r.w, r.y + r.h * k); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.moveTo(p3.x, p3.y); g.lineTo(p4.x, p4.y); }
      g.stroke(); g.fillStyle = '#fff'; for (const p of inner) g.fillRect(p.x - 4, p.y - 4, 8, 8); g.restore();
    }
    // rectangle / ellipse / lasso en cours, ligne du dégradé
    if (over.marquee) {
      g.save(); g.setLineDash([5, 4]); g.strokeStyle = '#fff'; g.beginPath(); const mq = over.marquee;
      if (mq.kind === 'lasso') mq.pts.forEach(([x, y], i) => { const p = S(x, y); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); });
      else if (mq.kind === 'rect') { const r = mq.r; [S(r.x, r.y), S(r.x + r.w, r.y), S(r.x + r.w, r.y + r.h), S(r.x, r.y + r.h)].forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); }
      else { const r = mq.r; g.save(); g.setTransform(M); g.ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.abs(r.w / 2), Math.abs(r.h / 2), 0, 0, 7); g.restore(); }
      g.stroke(); g.strokeStyle = '#000'; g.lineDashOffset = 4.5; g.stroke(); g.restore();
    }
    if (over.line) { const [x0, y0, x1, y1] = over.line, a = S(x0, y0), b = S(x1, y1); g.save(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.shadowColor = '#000'; g.shadowBlur = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.beginPath(); g.arc(a.x, a.y, 4, 0, 7); g.arc(b.x, b.y, 4, 0, 7); g.fillStyle = '#fff'; g.fill(); g.restore(); }
    // tracé de la plume
    if (over.pen) {
      g.save(); g.setTransform(M); g.lineWidth = 1.5 / z; g.strokeStyle = '#22d3ee'; g.stroke(subPathsToPath(over.pen.paths)); g.restore();
      g.save(); for (const sp of over.pen.paths) for (const p of sp.pts) {
        const s = S(p.x, p.y), i = S(p.x + p.ix, p.y + p.iy), o = S(p.x + p.ox, p.y + p.oy);
        g.strokeStyle = '#22d3ee'; g.beginPath(); g.moveTo(i.x, i.y); g.lineTo(s.x, s.y); g.lineTo(o.x, o.y); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(s.x - 3.5, s.y - 3.5, 7, 7); g.strokeRect(s.x - 3.5, s.y - 3.5, 7, 7);
        g.beginPath(); g.arc(i.x, i.y, 3, 0, 7); g.arc(o.x, o.y, 3, 0, 7); g.fillStyle = '#22d3ee'; g.fill();
      } g.restore();
    }
    // cadre du texte en cours de saisie
    if (over.text) { const r = over.text, a = S(r.x, r.y), b = S(r.x + r.w, r.y + r.h); g.save(); g.setLineDash([4, 3]); g.strokeStyle = '#a78bfa'; g.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g.restore(); }
    // rond du pinceau
    if (over.cursor) { const c = S(over.cursor.x, over.cursor.y), r = Math.max(1, over.cursor.r * z); g.save(); g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.arc(c.x, c.y, r + .5, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(c.x, c.y, r - .5 > 0 ? r - .5 : r, 0, 7); g.stroke(); g.restore(); }
    // règles (seulement quand la vue n'est pas tournée)
    if (ed.settings.rulers && !ds.view.rot) this.rulers(g, d.w, d.h);
  }
  rulers(g: CanvasRenderingContext2D, dw: number, dh: number) {
    const z = ed.ds!.view.zoom, v = ed.ds!.view; g.save();
    g.fillStyle = '#16161d'; g.fillRect(0, 0, this.w, RULER); g.fillRect(0, 0, RULER, this.h);
    g.strokeStyle = '#3f3f50'; g.fillStyle = '#a1a1aa'; g.font = '9px Segoe UI, sans-serif'; g.lineWidth = 1;
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; const step = steps.find(s => s * z >= 60) || 5000;
    g.beginPath();
    for (let x = Math.floor(-v.ox / z / step) * step; x <= (this.w - v.ox) / z; x += step / 5) {
      const sx = Math.round(v.ox + x * z) + .5, big = Math.abs(x % step) < 1e-6; g.moveTo(sx, RULER); g.lineTo(sx, big ? 4 : 13);
      if (big) g.fillText(String(Math.round(x)), sx + 2, 9);
    }
    for (let y = Math.floor(-v.oy / z / step) * step; y <= (this.h - v.oy) / z; y += step / 5) {
      const sy = Math.round(v.oy + y * z) + .5, big = Math.abs(y % step) < 1e-6; g.moveTo(RULER, sy); g.lineTo(big ? 4 : 13, sy);
      if (big) { g.save(); g.translate(9, sy + 2); g.rotate(-Math.PI / 2); g.fillText(String(Math.round(y)), 0, 0); g.restore(); }
    }
    g.stroke();
    // position de la souris sur les règles
    if (over.hover) { const s = this.toScreen(over.hover.x, over.hover.y); g.strokeStyle = '#a78bfa'; g.beginPath(); g.moveTo(s.x + .5, 0); g.lineTo(s.x + .5, RULER); g.moveTo(0, s.y + .5); g.lineTo(RULER, s.y + .5); g.stroke(); }
    // zone du document
    g.fillStyle = 'rgba(167,139,250,.18)'; g.fillRect(v.ox, RULER - 3, dw * z, 3); g.fillRect(RULER - 3, v.oy, 3, dh * z);
    g.fillStyle = '#16161d'; g.fillRect(0, 0, RULER, RULER); g.restore();
  }
}

/** poignées du cadre de transformation (écran) : coins, milieux des côtés, rotation */
export function handles(c: { x: number; y: number }[]): [string, { x: number; y: number; round?: boolean }][] {
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const n = mid(c[0], c[1]), cx = (c[0].x + c[2].x) / 2, cy = (c[0].y + c[2].y) / 2, dx = n.x - cx, dy = n.y - cy, L = Math.hypot(dx, dy) || 1;
  return [['nw', c[0]], ['ne', c[1]], ['se', c[2]], ['sw', c[3]], ['n', n], ['e', mid(c[1], c[2])], ['s', mid(c[2], c[3])], ['w', mid(c[3], c[0])],
    ['rot', { x: n.x + dx / L * 26, y: n.y + dy / L * 26, round: true }]];
}

// DedCut Image — outils à la souris / au stylet sur l'image.
import { t } from '../i18n';
import { ed, toast, ui } from './state';
import { Viewport, over, handles, RULER } from './view';
import { Stroke, StrokeMode } from './brush';
import { live } from './render';
import { Layer, RasterLayer, SmartLayer, ShapeLayer, TextLayer, Rect, PathPt, SubPath, newRaster, ctx2d, mkCanvas, layerCorners, layerBounds, localSize, tfMatrix, selLayers, boundsOf, rectUnion, hexToRgb, rgbToHex, newShape, shapeItem, findLayer } from './doc';
import { floodMask, maskToCanvas, pick } from './pixels';
import { gradientBetween, patternCanvas } from './paint';
import { selection, selClip } from './select';
import { blockMenu, notePen, penBarrel, penEraser, penStrokeDone, pressureOf, tiltAngle } from './stylus';

type P = { x: number; y: number };
const HANDLE_SIGN: Record<string, [number, number]> = { nw: [-1, -1], ne: [1, -1], se: [1, 1], sw: [-1, 1], n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const RATIOS: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '3:2': 1.5, '16:9': 16 / 9, '9:16': 9 / 16, '4:5': .8, '3:1': 3 };

export class Tools {
  drag: Record<string, unknown> & { kind: string } | null = null;
  space = false; lastPaint: P | null = null; textEl: HTMLTextAreaElement | null = null;
  /** outil à remettre quand on repose le bout gomme du stylet */
  toolBack: typeof ed.tool | null = null;
  pen: SubPath[] = []; penDraft: SubPath | null = null;
  constructor(public vp: Viewport, public host: HTMLElement) { }
  pos(e: { clientX: number; clientY: number }) { const r = this.vp.cv.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
  redraw() { this.vp.need = true; }
  private lockMsg(l: Layer | null) { if (l && l.locked) { toast(t('img.t.locked')); return true; } return false; }

  /* ---------- curseur ---------- */
  cursor(): string {
    if (this.space || this.drag?.kind === 'pan') return this.drag ? 'grabbing' : 'grab';
    return ({ move: 'default', crop: 'crosshair', brush: 'none', pencil: 'none', eraser: 'none', smudge: 'none', fill: 'cell', gradient: 'crosshair', picker: 'copy', text: 'text', shape: 'crosshair', pen: 'crosshair', direct: 'default', hand: 'grab', zoom: 'zoom-in', select: 'crosshair', lasso: 'crosshair', wand: 'crosshair', selbrush: 'none', clone: 'none', heal: 'none', dodge: 'none', burn: 'none', blurb: 'none', sharpen: 'none', redeye: 'crosshair', liquify: 'none' } as Record<string, string>)[ed.tool] || 'default';
  }
  brushOf() { return ed.tool === 'pencil' ? ed.pencil : ed.tool === 'eraser' ? ed.eraser : ed.tool === 'smudge' ? ed.smudge : ed.brush; }

  /* ---------- souris ---------- */
  down(e: PointerEvent) {
    notePen(e);
    const ds = ed.ds; if (!ds) return; const { sx, sy } = this.pos(e), p = this.vp.toDoc(sx, sy), d = ds.doc;
    // bouton latéral du stylet : pipette ou déplacement de la vue (le menu du clic droit seulement si on le choisit)
    if (penBarrel(e) && ed.settings.pen.barrel !== 'menu') {
      blockMenu();
      if (ed.settings.pen.barrel === 'pan') { this.drag = { kind: 'pan', sx, sy, ox: ds.view.ox, oy: ds.view.oy }; return; }
      this.pickAt(e, p); this.drag = { kind: 'pick', alt: e.altKey }; return;
    }
    // bout gomme du stylet : la gomme le temps du trait, puis l'outil d'avant revient
    if (penEraser(e) && ed.settings.pen.eraser && !this.textEl) { this.toolBack = ed.tool; ed.tool = 'eraser'; ed.emit(); }
    if (this.textEl && e.target !== this.textEl) this.textCommit();
    // bouton du milieu, espace ou outil Main : déplacer la vue
    if (e.button === 1 || this.space || ed.tool === 'hand') { this.drag = { kind: 'pan', sx, sy, ox: ds.view.ox, oy: ds.view.oy }; return; }
    if (e.button !== 0 && !penEraser(e)) return;
    // glisser depuis une règle : nouveau repère
    if (ed.settings.rulers && !ds.view.rot && (sx < RULER || sy < RULER)) { this.drag = { kind: 'guide', o: sy < RULER ? 'h' : 'v' }; over.guide = { o: sy < RULER ? 'h' : 'v', p: sy < RULER ? p.y : p.x }; this.redraw(); return; }
    // déplacer un repère existant
    if (ed.tool === 'move' && ed.settings.guides) {
      const tol = 5 / ds.view.zoom, gi = d.guides.findIndex(g => Math.abs((g.o === 'v' ? p.x : p.y) - g.p) < tol);
      if (gi >= 0) { const g = d.guides[gi]; ed.begin('img.h.guide'); this.drag = { kind: 'guide', o: g.o, move: gi }; return; }
    }
    const fn = (this as unknown as Record<string, (e: PointerEvent, p: P, sx: number, sy: number) => void>)['d_' + ed.tool];
    if (fn) fn.call(this, e, p, sx, sy);
  }
  move(e: PointerEvent) {
    notePen(e);
    const ds = ed.ds; if (!ds) return; const { sx, sy } = this.pos(e), p = this.vp.toDoc(sx, sy);
    over.hover = p; if (ui.compare && ed.doc) { ui.cmpX = Math.max(0, Math.min(1, p.x / ed.doc.w)); this.vp.need = true; }
    const br = ['brush', 'pencil', 'eraser', 'smudge', 'selbrush', 'clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'liquify'].includes(ed.tool);
    over.cursor = br ? { x: p.x, y: p.y, r: (ed.tool === 'selbrush' || ['clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'liquify'].includes(ed.tool) ? ed.retouch.size : this.brushOf().size) / 2 } : null;
    const D = this.drag;
    if (!D) { this.redraw(); return; }
    if (D.kind === 'pan') {
      let dx = sx - (D.sx as number), dy = sy - (D.sy as number); const a = -ds.view.rot * Math.PI / 180;
      if (ds.view.rot) [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
      ds.view.ox = (D.ox as number) + dx; ds.view.oy = (D.oy as number) + dy; this.redraw(); return;
    }
    if (D.kind === 'guide') { const o = D.o as 'h' | 'v', v = o === 'h' ? p.y : p.x; if (D.move != null) ds.doc.guides[D.move as number].p = Math.round(v); else over.guide = { o, p: Math.round(v) }; this.redraw(); return; }
    const fn = (this as unknown as Record<string, (e: PointerEvent, p: P, sx: number, sy: number) => void>)['m_' + D.kind];
    if (fn) fn.call(this, e, p, sx, sy);
  }
  up(e: PointerEvent) {
    if (e.pointerType === 'pen') { blockMenu(500); if (this.drag?.kind === 'paint' && penStrokeDone(e)) toast(t('img.tb.toast')); } // appui long du stylet : pas de menu du clic droit en fin de trait
    try { this.up2(e); } finally { if (this.toolBack) { ed.tool = this.toolBack; this.toolBack = null; ed.emit(); } }
  }
  private up2(e: PointerEvent) {
    const ds = ed.ds, D = this.drag; this.drag = null; if (!ds || !D) return;
    const { sx, sy } = this.pos(e), p = this.vp.toDoc(sx, sy);
    if (D.kind === 'pan') return;
    if (D.kind === 'guide') {
      const o = D.o as 'h' | 'v', onRuler = o === 'h' ? sy < RULER : sx < RULER, v = Math.round(o === 'h' ? p.y : p.x);
      if (D.move != null) { if (onRuler) ds.doc.guides.splice(D.move as number, 1); ed.end(); }
      else { over.guide = null; if (!onRuler) ed.act('img.h.guide', (_tx, d) => { d.guides.push({ o, p: v }); }); }
      this.redraw(); return;
    }
    this.drag = D; const fn = (this as unknown as Record<string, (e: PointerEvent, p: P) => void>)['u_' + D.kind];
    try { if (fn) fn.call(this, e, p); } finally { this.drag = null; }
    this.redraw();
  }
  wheel(e: WheelEvent) {
    const ds = ed.ds; if (!ds) return; e.preventDefault(); const { sx, sy } = this.pos(e);
    if (e.ctrlKey || e.altKey || !e.shiftKey && Math.abs(e.deltaX) < 1 && !(e.deltaMode === 0 && Math.abs(e.deltaY) < 40 && !Number.isInteger(e.deltaY))) {
      if (e.shiftKey && !e.ctrlKey) { ds.view.ox -= e.deltaY; this.redraw(); return; }
      this.vp.zoomAt(ds.view.zoom * Math.pow(1.0018, -e.deltaY), sx, sy); return;
    }
    ds.view.ox -= e.shiftKey ? e.deltaY : e.deltaX; ds.view.oy -= e.shiftKey ? 0 : e.deltaY; this.redraw();
  }

  /* ---------- Déplacer / transformer ---------- */
  d_move(e: PointerEvent, p: P, sx: number, sy: number) {
    const d = ed.doc!, sel = selLayers(d);
    // poignées du calque actif
    if (sel.length === 1 && ed.move.handles && !sel[0].locked && sel[0].type !== 'adjust') {
      const l = sel[0], c = layerCorners(l, d).map(([x, y]) => this.vp.toScreen(x, y));
      const h = handles(c).find(([, q]) => Math.hypot(q.x - sx, q.y - sy) < 9);
      if (h) return this.startTransform(e, l, h[0], p);
    }
    if (ed.move.auto) {
      const hit = ed.hitTest(p.x, p.y);
      if (hit && !d.sel.includes(hit.id)) ed.select(hit.id, e.shiftKey);
      else if (hit && e.shiftKey) { /* garde la sélection */ }
    }
    const ls = selLayers(ed.doc!).filter(l => !l.locked); if (!ls.length) return;
    if (e.altKey) ed.duplicate();
    const moving = selLayers(ed.doc!).filter(l => !l.locked);
    const b0 = moving.reduce<Rect | null>((a, l) => rectUnion(a, layerBounds(l, d)), null);
    ed.begin('img.h.move'); this.drag = { kind: 'move', p0: p, ls: moving, b0, dx: 0, dy: 0 };
  }
  m_move(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P; ls: Layer[]; b0: Rect | null; dx: number; dy: number };
    let dx = p.x - D.p0.x, dy = p.y - D.p0.y;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    if (D.b0 && ed.settings.snap) [dx, dy] = this.snap(D.b0, dx, dy);
    dx = Math.round(dx); dy = Math.round(dy);
    ed.translate(D.ls, dx - D.dx, dy - D.dy); D.dx = dx; D.dy = dy; ed.ds!.comp.all(); this.redraw();
  }
  u_move() { ed.end(); }
  /** accroche aux bords et au centre du document, aux repères et à la grille */
  snap(b: Rect, dx: number, dy: number): [number, number] {
    const d = ed.doc!, tol = 7 / ed.ds!.view.zoom, xs = [0, d.w / 2, d.w], ys = [0, d.h / 2, d.h];
    for (const g of d.guides) (g.o === 'v' ? xs : ys).push(g.p);
    const best = (vals: number[], lines: number[]) => { let m = Infinity, off = 0; for (const v of vals) for (const L of lines) { const k = L - v; if (Math.abs(k) < Math.abs(m)) { m = k; off = k; } } return Math.abs(m) <= tol ? off : null; };
    const bx = [b.x + dx, b.x + b.w / 2 + dx, b.x + b.w + dx], by = [b.y + dy, b.y + b.h / 2 + dy, b.y + b.h + dy];
    let ox = best(bx, xs), oy = best(by, ys);
    if (ed.settings.grid) { const gs = ed.settings.gridSize, gx = Math.round(bx[0] / gs) * gs - bx[0], gy = Math.round(by[0] / gs) * gs - by[0]; if (ox == null && Math.abs(gx) <= tol) ox = gx; if (oy == null && Math.abs(gy) <= tol) oy = gy; }
    return [dx + (ox || 0), dy + (oy || 0)];
  }
  startTransform(e: PointerEvent, l0: Layer, h: string, p: P) {
    let l = l0;
    if (l.type === 'group' && h !== 'rot') { toast(t('img.t.groupScale')); }
    if (l.type === 'raster') { const s = ed.toSmart(l); if (!s) return; l = s; }
    if (l.type !== 'smart' && l.type !== 'text' && l.type !== 'shape') { ed.begin('img.h.move'); this.drag = { kind: 'move', p0: p, ls: [l], b0: layerBounds(l, ed.doc!), dx: 0, dy: 0 }; return; }
    const L = l as SmartLayer | TextLayer | ShapeLayer;
    // Ctrl + coin : perspective / déformation libre (calques image) ; Ctrl+Maj + côté : inclinaison
    if (e.ctrlKey && L.type === 'smart' && HANDLE_SIGN[h] && Math.abs(HANDLE_SIGN[h][0] * HANDLE_SIGN[h][1]) === 1) {
      ed.begin('img.h.distort'); if (!L.quad) L.quad = layerCorners(L, ed.doc!) as [number, number][];
      this.drag = { kind: 'quad', l: L, i: ['nw', 'ne', 'se', 'sw'].indexOf(h) }; return;
    }
    ed.begin(h === 'rot' ? 'img.h.rotate' : 'img.h.scale');
    if (L.type === 'smart' && L.quad && h !== 'rot') L.quad = null;
    const [w, hh] = localSize(L);
    this.drag = { kind: h === 'rot' ? 'rot' : e.ctrlKey && e.shiftKey && (h === 'n' || h === 's' || h === 'e' || h === 'w') ? 'skew' : 'scale', l: L, h, tf0: { ...L.tf }, w, hh, p0: p };
  }
  m_rot(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { l: SmartLayer; tf0: SmartLayer['tf']; p0: P };
    const c = D.tf0, a0 = Math.atan2(D.p0.y - c.y, D.p0.x - c.x), a = Math.atan2(p.y - c.y, p.x - c.x);
    let rot = c.rot + (a - a0) * 180 / Math.PI; if (e.shiftKey) rot = Math.round(rot / 15) * 15;
    D.l.tf.rot = ((rot % 360) + 540) % 360 - 180; ed.ds!.comp.all(); this.redraw();
  }
  m_scale(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { l: SmartLayer; h: string; tf0: SmartLayer['tf']; w: number; hh: number };
    const t0 = D.tf0, [hx, hy] = HANDLE_SIGN[D.h], a = t0.rot * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    // pointeur dans le repère du calque (tourné, centré sur l'ancien centre)
    const rx = p.x - t0.x, ry = p.y - t0.y, P = { x: rx * cos + ry * sin, y: -rx * sin + ry * cos };
    const center = e.altKey, A = center ? { x: 0, y: 0 } : { x: -hx * D.w * t0.sx / 2, y: -hy * D.hh * t0.sy / 2 };
    const k = center ? 2 : 1;
    let sx = hx ? k * (P.x - A.x) / (hx * D.w) : t0.sx, sy = hy ? k * (P.y - A.y) / (hy * D.hh) : t0.sy;
    // coins : proportions gardées (Maj = libre, ou l'inverse si « proportions verrouillées » est décoché)
    const keep = hx && hy && (ed.move.lock ? !e.shiftKey : e.shiftKey === false);
    if (keep) { const H0 = { x: hx * D.w * t0.sx / 2 - A.x, y: hy * D.hh * t0.sy / 2 - A.y }, v = { x: P.x - A.x, y: P.y - A.y }; const kk = (v.x * H0.x + v.y * H0.y) / ((H0.x * H0.x + H0.y * H0.y) || 1); sx = t0.sx * kk; sy = t0.sy * kk; }
    if (Math.abs(sx) < 1e-3) sx = 1e-3 * Math.sign(sx || 1); if (Math.abs(sy) < 1e-3) sy = 1e-3 * Math.sign(sy || 1);
    const cx = center ? 0 : (hx ? A.x + hx * D.w * sx / 2 : 0), cy = center ? 0 : (hy ? A.y + hy * D.hh * sy / 2 : 0);
    D.l.tf.sx = sx; D.l.tf.sy = sy; D.l.tf.x = t0.x + cx * cos - cy * sin; D.l.tf.y = t0.y + cx * sin + cy * cos;
    ed.ds!.comp.all(); this.redraw();
  }
  m_skew(_e: PointerEvent, p: P) {
    const D = this.drag as unknown as { l: SmartLayer; h: string; tf0: SmartLayer['tf']; hh: number; p0: P };
    const dx = p.x - D.p0.x, s = D.h === 's' ? 1 : D.h === 'n' ? -1 : 0;
    if (s) D.l.tf.skx = Math.max(-75, Math.min(75, D.tf0.skx + Math.atan2(dx * s, D.hh * Math.abs(D.tf0.sy)) * 180 / Math.PI));
    ed.ds!.comp.all(); this.redraw();
  }
  m_quad(_e: PointerEvent, p: P) { const D = this.drag as unknown as { l: SmartLayer; i: number }; D.l.quad![D.i] = [p.x, p.y]; ed.ds!.comp.all(); this.redraw(); }
  u_rot() { ed.end(); } u_scale() { ed.end(); } u_skew() { ed.end(); } u_quad() { ed.end(); }

  /* ---------- Recadrer ---------- */
  cropReset() { const d = ed.doc; over.crop = d ? { x: 0, y: 0, w: d.w, h: d.h } : null; over.cropAngle = ed.crop.angle = 0; this.redraw(); }
  d_crop(_e: PointerEvent, p: P, sx: number, sy: number) {
    if (!over.crop) this.cropReset(); const r = over.crop!, z = ed.ds!.view.zoom, tol = 9 / z;
    const near = (a: number, b: number) => Math.abs(a - b) < tol;
    const hx = near(p.x, r.x) ? -1 : near(p.x, r.x + r.w) ? 1 : 0, hy = near(p.y, r.y) ? -1 : near(p.y, r.y + r.h) ? 1 : 0;
    const d = ed.doc!, untouched = r.x === 0 && r.y === 0 && r.w === d.w && r.h === d.h;
    // cadre encore entier : glisser dessine un nouveau cadre (sinon on déplace le cadre)
    const inside = !untouched && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
    void sx; void sy;
    this.drag = { kind: 'crop', mode: hx || hy ? 'size' : inside ? 'move' : 'new', hx, hy, r0: { ...r }, p0: p };
  }
  m_crop(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { mode: string; hx: number; hy: number; r0: Rect; p0: P }, r0 = D.r0;
    const ratio = ed.crop.ratio === 'orig' ? ed.doc!.w / ed.doc!.h : RATIOS[ed.crop.ratio] || 0;
    let r: Rect;
    if (D.mode === 'move') r = { ...r0, x: r0.x + p.x - D.p0.x, y: r0.y + p.y - D.p0.y };
    else if (D.mode === 'new') { r = { x: Math.min(D.p0.x, p.x), y: Math.min(D.p0.y, p.y), w: Math.abs(p.x - D.p0.x), h: Math.abs(p.y - D.p0.y) }; if (ratio || e.shiftKey) { const k = ratio || 1; if (r.w / r.h > k) r.h = r.w / k; else r.w = r.h * k; if (p.x < D.p0.x) r.x = D.p0.x - r.w; if (p.y < D.p0.y) r.y = D.p0.y - r.h; } }
    else {
      let x0 = r0.x, y0 = r0.y, x1 = r0.x + r0.w, y1 = r0.y + r0.h;
      if (D.hx < 0) x0 = p.x; if (D.hx > 0) x1 = p.x; if (D.hy < 0) y0 = p.y; if (D.hy > 0) y1 = p.y;
      r = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      if (ratio) { if (D.hx && !D.hy) r.h = r.w / ratio; else r.w = r.h * ratio; if (D.hx < 0) r.x = r0.x + r0.w - r.w; if (D.hy < 0) r.y = r0.y + r0.h - r.h; }
    }
    over.crop = { x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) }; this.redraw();
  }
  cropApply() { if (!over.crop) return; ed.cropTo(over.crop, over.cropAngle, ed.crop.del); this.cropReset(); this.vp.fit(); }

  /* ---------- Pinceau, crayon, gomme, estompe (et pinceau du masque) ---------- */
  d_brush(e: PointerEvent, p: P) { this.paintStart(e, p, ed.tool === 'eraser' ? 'erase' : ed.tool === 'pencil' ? 'pencil' : ed.tool === 'smudge' ? 'smudge' : 'paint'); }
  d_pencil(e: PointerEvent, p: P) { this.d_brush(e, p); } d_eraser(e: PointerEvent, p: P) { this.d_brush(e, p); } d_smudge(e: PointerEvent, p: P) { this.d_brush(e, p); }
  /** calque où peindre : le calque de pixels actif, sinon un nouveau calque juste au-dessus */
  paintTarget(): RasterLayer | null {
    let l = ed.layer; const d = ed.doc!;
    if (this.lockMsg(l)) return null;
    if (!l || l.type !== 'raster') {
      if (l && l.type !== 'group' && l.type !== 'adjust' && ed.ds!.maskEdit) return null;
      const r = newRaster(t('img.layer.n', { n: d.layers.length + 1 }), d.w, d.h); ed.act('img.h.newLayer', (_tx, dd) => { ed.insert(dd, r); }); l = r;
      toast(t('img.t.newPaintLayer'));
    }
    return l as RasterLayer;
  }
  paintStart(e: PointerEvent, p: P, mode0: StrokeMode) {
    const ds = ed.ds!, cur = ed.layer, maskMode = ds.maskEdit && cur && cur.mask;
    let target: HTMLCanvasElement, ox = 0, oy = 0, mode = mode0, layer: Layer;
    const o = { ...this.brushOf(), color: ed.tool === 'eraser' ? '#000000' : ed.fg };
    if (maskMode) {
      if (this.lockMsg(cur)) return; layer = cur!; const m = cur!.mask!;
      const lum = (() => { const [r, g, b] = hexToRgb(ed.fg); return .299 * r + .587 * g + .114 * b; })();
      mode = ed.tool === 'eraser' || lum < 128 ? 'mask-sub' : 'mask-add'; o.color = '#ffffff';
      ed.begin('img.h.maskPaint'); target = m.cv; ox = m.x; oy = m.y;
      if (ed.tool === 'smudge') mode = 'smudge';
    } else {
      const l = this.paintTarget(); if (!l) return; layer = l;
      const tx = ed.begin(mode0 === 'erase' ? 'img.h.erase' : mode0 === 'smudge' ? 'img.h.smudge' : 'img.h.paint')!;
      ed.coverDoc(l, tx); target = l.cv; ox = l.x; oy = l.y;
    }
    const tx = (ed as unknown as { liveTx: { touch(c: HTMLCanvasElement): void } }).liveTx; tx.touch(target);
    const st = new Stroke(target, o, mode, { cx: ed.doc!.w / 2 - ox, cy: ed.doc!.h / 2 - oy });
    // la sélection limite le trait (lot 2)
    st.clip = selClip(ox, oy, target.width, target.height);
    live.layer = layer; live.mask = !!maskMode; live.stroke = st;
    const pr = pressureOf(e), tl = tiltAngle(e);
    // Maj + clic : ligne droite depuis le dernier point peint
    if (e.shiftKey && this.lastPaint) { st.add(this.lastPaint.x - ox, this.lastPaint.y - oy, pr, false, tl); st.add(p.x - ox, p.y - oy, pr, true, tl); }
    else st.add(p.x - ox, p.y - oy, pr, false, tl);
    this.drag = { kind: 'paint', st, ox, oy, layer }; this.markPaint();
  }
  markPaint() { const D = this.drag as unknown as { st: Stroke; ox: number; oy: number }; if (D.st.dirty) { const r = D.st.dirty; ed.ds!.comp.add({ x: r.x + D.ox - 2, y: r.y + D.oy - 2, w: r.w + 4, h: r.h + 4 }); } this.redraw(); }
  m_paint(e: PointerEvent) {
    const D = this.drag as unknown as { st: Stroke; ox: number; oy: number };
    const evs = (e.getCoalescedEvents?.() || []).length ? e.getCoalescedEvents() : [e];
    for (const ev of evs) { const { sx, sy } = this.pos(ev), q = this.vp.toDoc(sx, sy); D.st.add(q.x - D.ox, q.y - D.oy, pressureOf(ev), false, tiltAngle(ev)); }
    D.st.dirty = D.st.dirty || null; this.markPaint();
  }
  u_paint(_e: PointerEvent, p: P) {
    const D = this.drag as unknown as { st: Stroke };
    D.st.commit(); live.stroke = null; live.layer = null; this.lastPaint = p; ed.end();
  }

  /* ---------- Pot de peinture ---------- */
  d_fill(_e: PointerEvent, p: P) {
    const l = this.paintTarget(); if (!l) return; const ds = ed.ds!;
    ed.act('img.h.fill', tx => {
      ed.coverDoc(l, tx); tx.touch(l.cv);
      const src = ed.fill.all ? (ds.comp.update(), (() => { const c = mkCanvas(l.cv.width, l.cv.height); ctx2d(c).drawImage(ds.comp.cv, -l.x, -l.y); return c; })()) : l.cv;
      const img = ctx2d(src, true).getImageData(0, 0, src.width, src.height);
      const m = floodMask(img, Math.floor(p.x - l.x), Math.floor(p.y - l.y), ed.fill.tol, ed.fill.contiguous);
      const mc = maskToCanvas(m, src.width, src.height, ed.fill.soft ? .6 : 0), fc = mkCanvas(src.width, src.height), fg = ctx2d(fc);
      const pat = ed.fill.pattern && patternCanvas(ed.fill.pattern); fg.fillStyle = pat ? fg.createPattern(pat, 'repeat')! : ed.fg; fg.fillRect(0, 0, fc.width, fc.height);
      fg.globalCompositeOperation = 'destination-in'; fg.drawImage(mc, 0, 0);
      const clip = selClip(l.x, l.y, fc.width, fc.height); if (clip) { fg.globalCompositeOperation = 'destination-in'; fg.drawImage(clip, 0, 0); }
      ctx2d(l.cv).drawImage(fc, 0, 0);
    }, 'all');
  }

  /* ---------- Dégradé ---------- */
  d_gradient(_e: PointerEvent, p: P) { this.drag = { kind: 'grad', p0: p }; over.line = [p.x, p.y, p.x, p.y]; }
  m_grad(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P }; let q = p;
    if (e.shiftKey) { const a = Math.round(Math.atan2(p.y - D.p0.y, p.x - D.p0.x) / (Math.PI / 4)) * Math.PI / 4, r = Math.hypot(p.x - D.p0.x, p.y - D.p0.y); q = { x: D.p0.x + Math.cos(a) * r, y: D.p0.y + Math.sin(a) * r }; }
    over.line = [D.p0.x, D.p0.y, q.x, q.y]; this.redraw();
  }
  u_grad() {
    const L = over.line; over.line = null; if (!L || Math.hypot(L[2] - L[0], L[3] - L[1]) < 2) return;
    const l = this.paintTarget(); if (!l) return;
    ed.act('img.h.gradient', tx => {
      ed.coverDoc(l, tx); tx.touch(l.cv); const g = ctx2d(l.cv), gr = structuredClone(ed.grad.g);
      if (ed.grad.reverse) gr.stops = gr.stops.map(s => ({ ...s, o: 1 - s.o }));
      const c = mkCanvas(l.cv.width, l.cv.height), cg = ctx2d(c); cg.fillStyle = gradientBetween(cg, gr, L[0] - l.x, L[1] - l.y, L[2] - l.x, L[3] - l.y); cg.fillRect(0, 0, c.width, c.height);
      const clip = selClip(l.x, l.y, c.width, c.height); if (clip) { cg.globalCompositeOperation = 'destination-in'; cg.drawImage(clip, 0, 0); }
      g.save(); g.globalAlpha = ed.grad.opacity; g.drawImage(c, 0, 0); g.restore();
    }, 'all');
  }

  /* ---------- Pipette ---------- */
  d_picker(e: PointerEvent, p: P) { this.pickAt(e, p); this.drag = { kind: 'pick', alt: e.altKey }; }
  m_pick(e: PointerEvent, p: P) { this.pickAt(e, p); }
  pickAt(e: PointerEvent, p: P) {
    const ds = ed.ds!; let c: HTMLCanvasElement, x = p.x, y = p.y;
    if (ed.picker.all) { ds.comp.update(); c = ds.comp.cv; }
    else { const l = ed.layer; if (!l || l.type !== 'raster') { ds.comp.update(); c = ds.comp.cv; } else { c = l.cv; x -= l.x; y -= l.y; } }
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
    const [r, g, b, a] = pick(c, x, y, ed.picker.size); if (!a) return;
    const hex = rgbToHex(r, g, b); if (e.altKey) { ed.bg = hex; ed.saveColors(); ed.emit(); } else ed.setFg(hex);
  }

  /* ---------- Texte ---------- */
  d_text(_e: PointerEvent, p: P) {
    const hit = ed.hitTest(p.x, p.y);
    if (hit && hit.type === 'text') { ed.select(hit.id); this.textEdit(hit); return; }
    this.drag = { kind: 'textbox', p0: p };
  }
  m_textbox(_e: PointerEvent, p: P) { const D = this.drag as unknown as { p0: P }; over.text = { x: Math.min(D.p0.x, p.x), y: Math.min(D.p0.y, p.y), w: Math.abs(p.x - D.p0.x), h: Math.abs(p.y - D.p0.y) }; this.redraw(); }
  u_textbox(_e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P } | null, box = over.text; over.text = null;
    const p0 = D?.p0 || p, boxW = box && box.w > 20 ? box.w : 0;
    const l = ed.addText(boxW ? box!.x + box!.w / 2 : p0.x, boxW ? box!.y + ed.text.size * ed.text.lh / 2 : p0.y, t('img.textDef'), boxW);
    if (!boxW) { const [w] = localSize(l); l.tf.x += w / 2; }
    this.textEdit(l, true);
  }
  /** saisie du texte directement sur l'image */
  textEdit(l: TextLayer, fresh = false) {
    this.textCommit(); const host = this.host, el = document.createElement('textarea'); el.className = 'im-txtedit'; el.value = fresh ? '' : l.text; el.spellcheck = false;
    el.placeholder = t('img.textPh');
    const place = () => {
      const c = layerCorners(l, ed.doc!).map(([x, y]) => this.vp.toScreen(x, y)), b = boundsOf(c.map(q => [q.x, q.y]));
      const r = this.vp.cv.getBoundingClientRect(), hr = host.getBoundingClientRect();
      Object.assign(el.style, { left: (b.x + r.left - hr.left) + 'px', top: (b.y + b.h + r.top - hr.top + 6) + 'px', minWidth: Math.max(160, b.w) + 'px' });
    };
    ed.begin('img.h.textEdit'); this.textEl = el; (el as unknown as { layer: TextLayer; fresh: boolean }).layer = l; (el as unknown as { fresh: boolean }).fresh = fresh;
    el.oninput = () => { l.text = el.value || (fresh ? '' : ' '); l.name = (el.value || t('img.layer.text')).slice(0, 30); ed.ds!.comp.all(); this.redraw(); place(); };
    el.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Escape' || (ev.key === 'Enter' && ev.ctrlKey)) { ev.preventDefault(); this.textCommit(); } };
    host.appendChild(el); place(); setTimeout(() => el.focus(), 0);
  }
  textCommit() {
    const el = this.textEl; if (!el) return; this.textEl = null; const l = (el as unknown as { layer: TextLayer }).layer; el.remove();
    if (!l.text.trim()) { const d = ed.doc; if (d) { const f = findLayer(d, l.id); if (f) f.list.splice(f.list.indexOf(f.l), 1); } }
    ed.end();
  }

  /* ---------- Formes ---------- */
  d_shape(_e: PointerEvent, p: P) { this.drag = { kind: 'shape', p0: p }; }
  m_shape(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { p0: P };
    if (ed.shape.kind === 'line') { over.line = [D.p0.x, D.p0.y, p.x, p.y]; this.redraw(); return; }
    let w = p.x - D.p0.x, h = p.y - D.p0.y; if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
    const x = e.altKey ? D.p0.x - Math.abs(w) : Math.min(D.p0.x, D.p0.x + w), y = e.altKey ? D.p0.y - Math.abs(h) : Math.min(D.p0.y, D.p0.y + h);
    over.marquee = { kind: ed.shape.kind === 'ellipse' ? 'ellipse' : 'rect', r: { x, y, w: Math.abs(w) * (e.altKey ? 2 : 1), h: Math.abs(h) * (e.altKey ? 2 : 1) } }; this.redraw();
  }
  u_shape() {
    const L = over.line, M = over.marquee; over.line = null; over.marquee = null;
    if (ed.shape.kind === 'line' && L) {
      const len = Math.hypot(L[2] - L[0], L[3] - L[1]); if (len < 3) return;
      const l = ed.addShape('line', { x: (L[0] + L[2]) / 2 - len / 2, y: (L[1] + L[3]) / 2 - 1, w: len, h: 2 }, ed.fg);
      ed.act('img.h.shape', () => { l.tf.rot = Math.atan2(L[3] - L[1], L[2] - L[0]) * 180 / Math.PI; }, 'all'); return;
    }
    if (!M || M.kind === 'lasso' || M.r.w < 3 || M.r.h < 3) return;
    const l = ed.addShape(ed.shape.kind, M.r, ed.fg);
    if (ed.shape.combine !== 'new') this.combineShape(l);
  }
  /** forme ajoutée à la forme active : union, soustraction, intersection, exclusion */
  combineShape(l: ShapeLayer) {
    const d = ed.doc!, f = findLayer(d, l.id); if (!f) return; const i = f.list.indexOf(l), prev = f.list[i - 1];
    if (!prev || prev.type !== 'shape') return;
    ed.act('img.h.combine', () => {
      const inv = tfMatrix(prev.tf).inverse(), c = inv.transformPoint({ x: l.tf.x, y: l.tf.y });
      const it = { ...l.items[0], op: ed.shape.combine as 'add' | 'sub' | 'int' | 'xor', ox: c.x, oy: c.y, w: l.items[0].w * l.tf.sx / prev.tf.sx, h: l.items[0].h * l.tf.sy / prev.tf.sy };
      prev.items.push(it); f.list.splice(i, 1); d.sel = [prev.id];
    }, 'all');
  }

  /* ---------- Plume (courbes de Bézier) et sélection directe ---------- */
  d_pen(e: PointerEvent, p: P) {
    const z = ed.ds!.view.zoom;
    if (this.penDraft && this.penDraft.pts.length > 2 && Math.hypot(p.x - this.penDraft.pts[0].x, p.y - this.penDraft.pts[0].y) < 8 / z) { this.penDraft.closed = true; this.penFinish(); return; }
    if (!this.penDraft) { this.penDraft = { pts: [], closed: false }; }
    const pt: PathPt = { x: p.x, y: p.y, ix: 0, iy: 0, ox: 0, oy: 0, smooth: false }; this.penDraft.pts.push(pt);
    over.pen = { paths: [this.penDraft], hover: null }; this.drag = { kind: 'penh', pt, alt: e.altKey }; this.redraw();
  }
  m_penh(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { pt: PathPt }; const dx = p.x - D.pt.x, dy = p.y - D.pt.y;
    D.pt.ox = dx; D.pt.oy = dy; if (!e.altKey) { D.pt.ix = -dx; D.pt.iy = -dy; } D.pt.smooth = !e.altKey; this.redraw();
  }
  u_penh() { /* point posé */ }
  /** fin du tracé : il devient un calque de forme (modifiable avec la Sélection directe) */
  penFinish() {
    const sp = this.penDraft; this.penDraft = null; over.pen = null; if (!sp || sp.pts.length < 2) { this.redraw(); return; }
    const xs = sp.pts.map(q => q.x), ys = sp.pts.map(q => q.y), b = boundsOf(xs.map((x, i) => [x, ys[i]] as [number, number])), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const local: SubPath = { closed: sp.closed, pts: sp.pts.map(q => ({ ...q, x: q.x - cx, y: q.y - cy })) };
    const it = { ...shapeItem('path', Math.max(1, b.w), Math.max(1, b.h)), paths: [local] };
    const l = newShape(t('img.shape.path'), it, cx, cy, ed.fg); l.fill = sp.closed && ed.shape.fill ? { kind: 'color', color: ed.fg } : null;
    l.stroke = { on: !sp.closed || !ed.shape.fill || ed.shape.stroke, paint: { kind: 'color', color: sp.closed && ed.shape.fill ? ed.bg : ed.fg }, width: ed.shape.strokeW, dash: 0, join: 'round' };
    ed.act('img.h.path', (_tx, d) => { ed.insert(d, l); }, 'all'); this.redraw();
  }
  penCancel() { this.penDraft = null; over.pen = null; this.redraw(); }
  /** points du tracé du calque actif (repère du document) */
  directPts(): { l: ShapeLayer; m: DOMMatrix; pts: PathPt[] } | null {
    const l = ed.layer; if (!l || l.type !== 'shape') return null; const it = l.items.find(i => i.kind === 'path' && i.paths); if (!it) return null;
    return { l, m: tfMatrix(l.tf).translate(it.ox, it.oy), pts: it.paths!.flatMap(sp => sp.pts) };
  }
  d_direct(_e: PointerEvent, p: P) {
    const dp = this.directPts(); if (!dp) { const hit = ed.hitTest(p.x, p.y); if (hit) ed.select(hit.id); return; }
    const z = ed.ds!.view.zoom, inv = dp.m.inverse(), lp = inv.transformPoint(p);
    for (const pt of dp.pts) for (const [k, hx, hy] of [['a', 0, 0], ['i', pt.ix, pt.iy], ['o', pt.ox, pt.oy]] as [string, number, number][]) {
      const q = dp.m.transformPoint({ x: pt.x + hx, y: pt.y + hy });
      if (Math.hypot(q.x - p.x, q.y - p.y) < 8 / z) { ed.begin('img.h.pathEdit'); this.drag = { kind: 'direct', pt, k, inv, last: lp }; return; }
    }
  }
  m_direct(e: PointerEvent, p: P) {
    const D = this.drag as unknown as { pt: PathPt; k: string; inv: DOMMatrix; last: DOMPoint }, lp = D.inv.transformPoint(p), dx = lp.x - D.last.x, dy = lp.y - D.last.y; D.last = lp;
    if (D.k === 'a') { D.pt.x += dx; D.pt.y += dy; }
    else if (D.k === 'o') { D.pt.ox += dx; D.pt.oy += dy; if (D.pt.smooth && !e.altKey) { D.pt.ix = -D.pt.ox; D.pt.iy = -D.pt.oy; } }
    else { D.pt.ix += dx; D.pt.iy += dy; if (D.pt.smooth && !e.altKey) { D.pt.ox = -D.pt.ix; D.pt.oy = -D.pt.iy; } }
    ed.ds!.comp.all(); this.redraw();
  }
  u_direct() { ed.end(); }

  /* ---------- Loupe ---------- */
  d_zoom(e: PointerEvent, _p: P, sx: number, sy: number) { this.drag = { kind: 'zoomd', sx, sy, z0: ed.ds!.view.zoom, moved: false, alt: e.altKey }; }
  m_zoomd(_e: PointerEvent, _p: P, sx: number) { const D = this.drag as unknown as { sx: number; sy: number; z0: number; moved: boolean }; if (Math.abs(sx - D.sx) > 3) D.moved = true; if (D.moved) this.vp.zoomAt(D.z0 * Math.pow(1.01, sx - D.sx), D.sx, D.sy); }
  u_zoomd(e: PointerEvent) { const D = this.drag as unknown as { moved: boolean }; if (!D.moved) this.zoomClick(e); }
  zoomClick(e: PointerEvent) { const { sx, sy } = this.pos(e); this.vp.zoomAt(ed.ds!.view.zoom * (e.altKey ? 1 / 1.6 : 1.6), sx, sy); }

  /** sélection d'outils de la retouche et des sélections (lot 2) : branchés par select.ts / retouch.ts */
  static extend(fns: Record<string, unknown>) { Object.assign(Tools.prototype, fns); }
}
export { selection };

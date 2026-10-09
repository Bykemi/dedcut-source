// DedCut Image — transformer un texte en formes (tracés modifiables).
// Polices livrées avec DedCut : contours exacts lus dans le fichier de police (opentype.js, MIT).
// Polices de Windows (fichier non lisible depuis la page) : contour retrouvé à partir du texte dessiné.
import { t } from '../i18n';
import { ed, toast } from './state';
import { TextLayer, SubPath, PathPt, newShape, shapeItem, findLayer, mkCanvas, ctx2d, localSize } from './doc';
import { fontFile, layout } from './text';
import { selToPath } from './select';

type OtPath = { commands: { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[] };
interface OtFont { getPath(text: string, x: number, y: number, size: number, o?: object): OtPath; unitsPerEm: number; ascender: number }
const cache = new Map<string, Promise<OtFont | null>>();
function loadOt(name: string): Promise<OtFont | null> {
  const f = fontFile(name); if (!f) return Promise.resolve(null);
  if (!cache.has(name)) cache.set(name, (async () => { try { const ot = await import('opentype.js'); const buf = await (await fetch(new URL('fonts/' + f + '.ttf', document.baseURI).href)).arrayBuffer(); return (ot.parse || ot.default.parse)(buf) as OtFont; } catch { return null; } })());
  return cache.get(name)!;
}
/** commandes d'un tracé opentype → sous-tracés Bézier de DedCut */
function toSub(p: OtPath): SubPath[] {
  const out: SubPath[] = []; let cur: SubPath | null = null; let lx = 0, ly = 0;
  const pt = (x: number, y: number): PathPt => ({ x, y, ix: 0, iy: 0, ox: 0, oy: 0, smooth: false });
  for (const c of p.commands) {
    if (c.type === 'M') { cur = { pts: [pt(c.x!, c.y!)], closed: false }; out.push(cur); lx = c.x!; ly = c.y!; }
    else if (c.type === 'L' && cur) { cur.pts.push(pt(c.x!, c.y!)); lx = c.x!; ly = c.y!; }
    else if (c.type === 'C' && cur) { const prev = cur.pts[cur.pts.length - 1]; prev.ox = c.x1! - prev.x; prev.oy = c.y1! - prev.y; const n = pt(c.x!, c.y!); n.ix = c.x2! - c.x!; n.iy = c.y2! - c.y!; cur.pts.push(n); lx = c.x!; ly = c.y!; }
    else if (c.type === 'Q' && cur) { // quadratique → cubique
      const prev = cur.pts[cur.pts.length - 1], qx = c.x1!, qy = c.y1!; prev.ox = 2 / 3 * (qx - lx); prev.oy = 2 / 3 * (qy - ly);
      const n = pt(c.x!, c.y!); n.ix = 2 / 3 * (qx - c.x!); n.iy = 2 / 3 * (qy - c.y!); cur.pts.push(n); lx = c.x!; ly = c.y!;
    } else if (c.type === 'Z' && cur) {
      // dernier point = premier point : on le fusionne
      const a = cur.pts[0], b = cur.pts[cur.pts.length - 1]; if (cur.pts.length > 1 && Math.abs(a.x - b.x) < .01 && Math.abs(a.y - b.y) < .01) { a.ix = b.ix; a.iy = b.iy; cur.pts.pop(); }
      cur.closed = true;
    }
  }
  return out.filter(s => s.pts.length > 1);
}
export async function textToShape(l: TextLayer) {
  const d = ed.doc; if (!d) return;
  if (l.st.curve || l.onPath) { toast(t('img.t.shapeCurve')); }
  let paths: SubPath[] = []; const [w, h] = localSize(l), L = layout(l);
  const font = await loadOt(l.st.font);
  if (font && !l.st.curve && !l.onPath) {
    const lh = l.st.size * l.st.lh;
    L.lines.forEach((ln, i) => {
      const txt = ln.t; if (!txt) return; const x = l.st.align === 'left' ? -w / 2 : l.st.align === 'right' ? w / 2 - ln.w : -ln.w / 2;
      paths.push(...toSub(font.getPath(txt, x, -L.h / 2 + L.asc + i * lh, l.st.size, { letterSpacing: l.st.ls / l.st.size })));
    });
  } else {
    // contour retrouvé : texte dessiné en grand, puis suivi du bord
    const k = 2, c = mkCanvas(Math.ceil(w * k) + 8, Math.ceil(h * k) + 8), g = ctx2d(c); g.translate(c.width / 2, c.height / 2); g.scale(k, k);
    const { drawText } = await import('./text'); drawText(g, { ...l, st: { ...l.st, stroke: { ...l.st.stroke, on: false }, fill: { kind: 'color', color: '#000' } } });
    paths = selToPath(c).map(sp => ({ ...sp, pts: sp.pts.map(p => ({ ...p, x: (p.x - c.width / 2) / k, y: (p.y - c.height / 2) / k })) }));
  }
  if (!paths.length) { toast(t('img.t.shapeFail')); return; }
  const it = { ...shapeItem('path', w, h), paths };
  const s = newShape(l.name, it, l.tf.x, l.tf.y, l.st.fill.color);
  s.fill = structuredClone(l.st.fill); s.tf = { ...l.tf }; s.fx = structuredClone(l.fx); s.opacity = l.opacity; s.blend = l.blend;
  s.stroke = { on: l.st.stroke.on, paint: { kind: 'color', color: l.st.stroke.color }, width: l.st.stroke.width * 2, dash: 0, join: 'round' };
  ed.act('img.h.toShape', (_tx, doc) => { const f = findLayer(doc, l.id); if (f) { f.list.splice(f.list.indexOf(l), 1, s); doc.sel = [s.id]; } }, 'all');
  toast(t('img.t.toShape'));
}

// DedCut Image — texte : polices (bibliothèque DedCut + Windows), mise en page, texte courbé ou sur un tracé, polices manquantes.
import { TextLayer, SubPath, textMeasure, mkCanvas, ctx2d } from './doc';
import { FONT_FILES } from './fonts';
import { paintStyle } from './paint';

export const SYS_FONTS = ['Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
  'Courier New', 'Franklin Gothic Medium', 'Gabriola', 'Georgia', 'Impact', 'Ink Free', 'Lucida Console', 'Palatino Linotype', 'Segoe Print',
  'Segoe Script', 'Segoe UI', 'Segoe UI Black', 'Sitka Text', 'Sylfaen', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Yu Gothic', 'Malgun Gothic', 'Microsoft YaHei'];
const LIB = new Map(FONT_FILES.map(([n, f, c]) => [n, { f, c, face: null as FontFace | null, ok: false }]));
export const libFonts = () => FONT_FILES.map(([n, , c]) => ({ name: n, cat: c }));
export const fontFile = (name: string) => LIB.get(name)?.f || null;

let onLoaded: (() => void) | null = null;
export const setFontLoaded = (fn: () => void) => { onLoaded = fn; };
/** charge une police de la bibliothèque (les polices de Windows sont déjà là) */
export function loadFont(name: string): Promise<boolean> {
  const e = LIB.get(name); if (!e) return Promise.resolve(true);
  if (e.ok) return Promise.resolve(true);
  if (!e.face) {
    e.face = new FontFace(name, `url(${new URL('fonts/' + e.f + '.ttf', document.baseURI).href})`, { weight: '100 900', display: 'swap' });
    document.fonts.add(e.face);
    e.face.load().then(() => { e.ok = true; onLoaded?.(); }, () => { /* fichier absent : police de secours */ });
  }
  return e.face.loaded.then(() => true, () => false);
}
/** une police est-elle vraiment disponible ? (mesure comparée aux polices de secours) */
const probe = mkCanvas(8, 8).getContext('2d')!;
export function fontAvailable(name: string): boolean {
  if (LIB.has(name)) return true;
  const s = 'mmmmmmmmmmlliWWQ@#', w = (f: string) => { probe.font = `72px ${f}`; return probe.measureText(s).width; };
  for (const fb of ['monospace', 'serif', 'sans-serif']) if (w(`"${name}", ${fb}`) !== w(fb)) return true;
  return false;
}
export const fontCss = (l: TextLayer, scale = 1) =>
  `${l.st.italic ? 'italic ' : ''}${l.st.weight} ${Math.max(1, l.st.size * scale)}px "${l.st.font}", "Segoe UI", sans-serif`;

interface Line { t: string; w: number }
const mctx = mkCanvas(8, 8).getContext('2d')!;
function prep(g: CanvasRenderingContext2D, l: TextLayer) {
  g.font = fontCss(l); g.textBaseline = 'alphabetic'; g.direction = l.st.dir;
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.st.ls}px`;
}
const show = (l: TextLayer, t: string) => l.st.caps ? t.toLocaleUpperCase() : t;
/** lignes du texte (retour à la ligne automatique si une largeur de bloc est donnée) */
export function layout(l: TextLayer): { lines: Line[]; w: number; h: number; asc: number } {
  prep(mctx, l); const out: Line[] = [];
  for (const para of l.text.split('\n')) {
    const p = show(l, para);
    if (l.boxW > 0) {
      let cur = '';
      for (const word of p.split(/(\s+)/)) {
        const next = cur + word;
        if (cur && mctx.measureText(next.trimEnd()).width > l.boxW) { out.push({ t: cur.trimEnd(), w: 0 }); cur = word.trimStart(); }
        else cur = next;
      }
      out.push({ t: cur, w: 0 });
    } else out.push({ t: p, w: 0 });
  }
  let w = 0; for (const ln of out) { ln.w = mctx.measureText(ln.t).width; w = Math.max(w, ln.w); }
  const m = mctx.measureText('ÉgjpqyÀ'), asc = Math.max(l.st.size * .8, m.actualBoundingBoxAscent || 0);
  if (l.boxW > 0) w = l.boxW;
  const lh = l.st.size * l.st.lh, h = Math.max(lh, (out.length - 1) * lh + l.st.size * 1.15);
  return { lines: out, w: Math.max(1, w), h, asc };
}
textMeasure.fn = (l: TextLayer) => {
  if (l.onPath) return pathBox([l.onPath], l);
  if (l.st.curve && !l.text.includes('\n')) { const L = layout(l), b = curveGeom(l, L.w); return [Math.max(L.w * .4, b.w), b.h]; }
  const L = layout(l); return [L.w + (l.st.stroke.on ? l.st.stroke.width : 0), L.h];
};

/* ---------- texte courbé (arc) ---------- */
function curveGeom(l: TextLayer, tw: number) {
  const th = Math.max(-1, Math.min(1, l.st.curve / 100)) * Math.PI, R = Math.abs(th) > .01 ? tw / Math.abs(th) : 1e9;
  const sz = l.st.size, chord = 2 * R * Math.sin(Math.abs(th) / 2), sag = R * (1 - Math.cos(Math.abs(th) / 2));
  return { th, R, w: Math.abs(th) > Math.PI * .99 ? 2 * R + sz : chord + sz, h: sag + sz * 1.4 };
}
/* ---------- texte sur un tracé ---------- */
function flatten(sp: SubPath): [number, number][] {
  const out: [number, number][] = [], P = sp.pts; if (!P.length) return out;
  out.push([P[0].x, P[0].y]);
  const n = sp.closed ? P.length : P.length - 1;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    for (let k = 1; k <= 16; k++) {
      const t = k / 16, u = 1 - t, c1x = a.x + a.ox, c1y = a.y + a.oy, c2x = b.x + b.ix, c2y = b.y + b.iy;
      out.push([u * u * u * a.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * b.x, u * u * u * a.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * b.y]);
    }
  }
  return out;
}
function pathBox(sps: SubPath[], l: TextLayer): [number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const sp of sps) for (const [x, y] of flatten(sp)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const m = l.st.size * 1.2; return [Math.max(1, x1 - x0) + m * 2, Math.max(1, y1 - y0) + m * 2];
}

/** dessine le texte dans le repère local du calque (centre de la boîte en 0, 0) */
export function drawText(g: CanvasRenderingContext2D, l: TextLayer) {
  loadFont(l.st.font);
  const st = l.st, L = layout(l);
  g.save(); prep(g, l);
  const sw = st.stroke.on ? st.stroke.width : 0;
  const fillStyle = paintStyle(g, st.fill, -L.w / 2, -L.h / 2, L.w, L.h);
  const put = (t: string, x: number, y: number) => {
    if (sw > 0) { g.lineJoin = 'round'; g.miterLimit = 2; g.lineWidth = sw * 2; g.strokeStyle = st.stroke.color; g.strokeText(t, x, y); }
    g.fillStyle = fillStyle; g.fillText(t, x, y);
  };
  if (l.onPath && l.onPath.pts.length) {
    // lettre par lettre le long du tracé (le tracé est en coordonnées locales, déjà centré)
    const pts = flatten(l.onPath); let acc = 0; const seg: number[] = [0];
    for (let i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(acc); }
    const txt = show(l, l.text.replace(/\n/g, ' ')), tw = g.measureText(txt).width;
    let d = st.align === 'center' ? (acc - tw) / 2 : st.align === 'right' ? acc - tw : 0;
    for (const ch of txt) {
      const cw = g.measureText(ch).width, mid = d + cw / 2;
      if (mid >= 0 && mid <= acc) {
        let i = 1; while (i < seg.length - 1 && seg[i] < mid) i++;
        const t = (mid - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]), x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
        g.save(); g.translate(x, y); g.rotate(Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])); g.textAlign = 'center'; put(ch, 0, 0); g.restore();
      }
      d += cw + st.ls;
    }
  } else if (st.curve && L.lines.length === 1) {
    const txt = L.lines[0].t, cg = curveGeom(l, L.w), up = cg.th > 0, R = cg.R;
    const cy = up ? -L.h / 2 + st.size + R - cg.h + st.size : L.h / 2 - R;
    let a = -Math.abs(cg.th) / 2;
    g.textAlign = 'center';
    for (const ch of txt) {
      const cw = g.measureText(ch).width + st.ls, da = cw / R; a += da / 2;
      g.save();
      if (up) { g.translate(0, cy); g.rotate(a); g.translate(0, -R); }
      else { g.translate(0, cy); g.rotate(-a); g.translate(0, R); }
      put(ch, 0, up ? 0 : st.size * .75); g.restore(); a += da / 2;
    }
  } else {
    const lh = st.size * st.lh;
    g.textAlign = st.align;
    const ax = st.align === 'left' ? -L.w / 2 : st.align === 'right' ? L.w / 2 : 0;
    L.lines.forEach((ln, i) => {
      const y = -L.h / 2 + L.asc + i * lh; put(ln.t, ax, y);
      if (st.underline && ln.t) {
        const x0 = st.align === 'left' ? ax : st.align === 'right' ? ax - ln.w : -ln.w / 2;
        g.fillStyle = fillStyle; g.fillRect(x0, y + st.size * .1, ln.w, Math.max(1, st.size / 14));
      }
    });
  }
  g.restore();
}

/** polices utilisées par le document qui ne sont pas disponibles sur ce PC */
export function missingFonts(fonts: string[]): string[] {
  return [...new Set(fonts)].filter(f => !fontAvailable(f));
}
export const textCanvas = () => ctx2d(mkCanvas(4, 4));

// DedCut Image — fichiers : ouvrir (images, séquences, TIFF, PSD, SVG, projets .dcimg), enregistrer sans corruption,
// exporter (PNG, JPEG, WebP, TIFF, SVG, PSD) et sauvegarde automatique pour la reprise après un plantage.
import {
  Doc, Layer, RasterLayer, SmartLayer, mkCanvas, ctx2d, newDoc, newRaster, newSmart, newGroup, bumpId, walk, tfMatrix, localSize, Blend, BLENDS, ShapeItem
} from './doc';
import { renderDoc, renderRect, drawContent } from './render';
import { readMeta, withMeta, buildExif, patchOrientation, Meta } from './meta';
import { CUSTOM_SHAPES } from './paint';

/* ---------- pont vers Windows (absent dans un navigateur : téléchargements et sélecteur de fichiers) ---------- */
interface FileInfo { path: string; name: string; size: number; exists: boolean }
interface ImgBridge { open(label: string, exts: string[], multi: boolean): Promise<FileInfo[]>; saveDialog(name: string, label: string, ext: string): Promise<string | null>; write(path: string, data: Blob): Promise<FileInfo>; url(path: string): string }
export const bridge = (): ImgBridge | null => (window as unknown as { dedcutImg?: ImgBridge }).dedcutImg || null;

export const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg', 'tif', 'tiff', 'psd', 'ico'];
export const OPEN_EXT = [...IMG_EXT, 'dcimg'];
export const MAX_SIDE = 30000, MAX_PX = 400e6;

export class ImgError extends Error { constructor(public code: string, msg?: string) { super(msg || code); } }

/** octets d'un fichier choisi dans Windows */
export async function readPath(path: string): Promise<Blob> {
  const b = bridge(); if (!b) throw new ImgError('nofile');
  const r = await fetch(b.url(path)); if (!r.ok) throw new ImgError('missing', path); return r.blob();
}
const extOf = (n: string) => (n.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
const mimeOf = (n: string, b: Blob) => b.type || ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon' } as Record<string, string>)[extOf(n)] || 'application/octet-stream';

export interface Decoded { cv: HTMLCanvasElement; frames?: HTMLCanvasElement[]; meta: Meta; mime: string; svg?: string; psd?: Doc }
/** décode un fichier image (orientation de l'appareil photo appliquée, profil couleur converti vers l'écran) */
export async function decode(blob: Blob, name: string): Promise<Decoded> {
  const ext = extOf(name), head = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer()), mime = mimeOf(name, blob);
  if (blob.size > 2e9) throw new ImgError('toobig');
  const meta = readMeta(head);
  if (ext === 'psd' || (head[0] === 0x38 && head[1] === 0x42 && head[2] === 0x50 && head[3] === 0x53)) return { cv: mkCanvas(1, 1), meta, mime, psd: await readPsdDoc(blob, name) };
  if (ext === 'tif' || ext === 'tiff' || (head[0] === 0x49 && head[1] === 0x49 && head[2] === 42) || (head[0] === 0x4d && head[1] === 0x4d && head[3] === 42)) {
    const UTIF = (await import('utif2')).default as unknown as UtifLib;
    const buf = await blob.arrayBuffer(), ifds = UTIF.decode(buf); if (!ifds.length) throw new ImgError('format');
    const frames: HTMLCanvasElement[] = [];
    for (const ifd of ifds.slice(0, 64)) {
      UTIF.decodeImage(buf, ifd); const w = ifd.width, h = ifd.height; if (!w || !h) continue; check(w, h);
      const c = mkCanvas(w, h), g = ctx2d(c); const img = g.createImageData(w, h); img.data.set(UTIF.toRGBA8(ifd)); g.putImageData(img, 0, 0); frames.push(c);
    }
    if (!frames.length) throw new ImgError('format');
    return { cv: frames[0], frames: frames.length > 1 ? frames : undefined, meta: { ...meta, kind: 'tiff' }, mime: 'image/tiff' };
  }
  if (ext === 'svg' || mime === 'image/svg+xml') {
    const text = await blob.text(); if (!/<svg[\s>]/i.test(text)) throw new ImgError('format');
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    try {
      const im = new Image(); im.src = url; await im.decode();
      let w = im.naturalWidth || 800, h = im.naturalHeight || 600; const k = Math.min(1, 4096 / Math.max(w, h)); w *= k; h *= k;
      const c = mkCanvas(w, h); ctx2d(c).drawImage(im, 0, 0, w, h); return { cv: c, meta, mime, svg: text };
    } finally { URL.revokeObjectURL(url); }
  }
  if (ext === 'gif' && 'ImageDecoder' in window) {
    // GIF animé : chaque image devient un calque (séquence)
    try {
      const D = (window as unknown as { ImageDecoder: new (o: object) => { tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } }; decode(o: object): Promise<{ image: VideoFrame }>; close(): void } }).ImageDecoder;
      const dec = new D({ data: await blob.arrayBuffer(), type: 'image/gif' }); await dec.tracks.ready;
      const n = Math.min(120, dec.tracks.selectedTrack?.frameCount || 1), frames: HTMLCanvasElement[] = [];
      for (let i = 0; i < n; i++) { const { image } = await dec.decode({ frameIndex: i }); const c = mkCanvas(image.displayWidth, image.displayHeight); ctx2d(c).drawImage(image, 0, 0); image.close(); frames.push(c); }
      dec.close(); if (frames.length) return { cv: frames[0], frames: frames.length > 1 ? frames : undefined, meta, mime };
    } catch { /* image fixe */ }
  }
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'default', colorSpaceConversion: 'default' }); }
  catch { throw new ImgError(/heic|heif/i.test(ext) ? 'heic' : 'format'); }
  check(bmp.width, bmp.height);
  const c = mkCanvas(bmp.width, bmp.height); ctx2d(c).drawImage(bmp, 0, 0); bmp.close();
  return { cv: c, meta, mime };
}
function check(w: number, h: number) { if (!(w > 0 && h > 0) || w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PX) throw new ImgError('toobig'); }
interface UtifIfd { width: number; height: number }
interface UtifLib { decode(b: ArrayBuffer): UtifIfd[]; decodeImage(b: ArrayBuffer, ifd: UtifIfd): void; toRGBA8(ifd: UtifIfd): Uint8Array; encodeImage(rgba: Uint8Array, w: number, h: number): ArrayBuffer }

/* ---------- fichiers Photoshop (ag-psd, MIT) ---------- */
const PSD_BLEND: Record<string, Blend> = { normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten', 'color dodge': 'color-dodge', 'color burn': 'color-burn', 'hard light': 'hard-light', 'soft light': 'soft-light', difference: 'difference', exclusion: 'exclusion', hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity' };
interface PsdLayer { name?: string; canvas?: HTMLCanvasElement; left?: number; top?: number; opacity?: number; hidden?: boolean; blendMode?: string; children?: PsdLayer[]; clipping?: boolean; text?: unknown; mask?: { canvas?: HTMLCanvasElement; left?: number; top?: number; disabled?: boolean } }
async function readPsdDoc(blob: Blob, name: string): Promise<Doc> {
  const { readPsd } = await import('ag-psd');
  const psd = readPsd(await blob.arrayBuffer(), { skipThumbnail: true }) as unknown as { width: number; height: number; children?: PsdLayer[]; canvas?: HTMLCanvasElement };
  check(psd.width, psd.height);
  const doc = newDoc(name.replace(/\.[^.]+$/, ''), psd.width, psd.height, null);
  const conv = (list: PsdLayer[]): Layer[] => list.map(p => {
    let l: Layer;
    if (p.children) l = newGroup(p.name || 'Groupe', conv(p.children));
    else { const r = newRaster(p.name || 'Calque', p.canvas?.width || 1, p.canvas?.height || 1, p.left || 0, p.top || 0); if (p.canvas) ctx2d(r.cv).drawImage(p.canvas, 0, 0); l = r; }
    l.opacity = p.opacity ?? 1; l.visible = !p.hidden; l.blend = PSD_BLEND[p.blendMode || 'normal'] || 'source-over'; l.clip = !!p.clipping;
    if (p.mask?.canvas) l.mask = { cv: p.mask.canvas, x: p.mask.left || 0, y: p.mask.top || 0, on: !p.mask.disabled };
    return l;
  });
  doc.layers = psd.children?.length ? conv(psd.children) : [];
  if (!doc.layers.length && psd.canvas) { const r = newRaster('Image', psd.width, psd.height); ctx2d(r.cv).drawImage(psd.canvas, 0, 0); doc.layers = [r]; }
  return doc;
}

/* ---------- document à partir d'une image ---------- */
export function docFromImage(d: Decoded, name: string, blob: Blob | null): Doc {
  if (d.psd) return d.psd;
  const doc = newDoc(name.replace(/\.[^.]+$/, ''), d.cv.width, d.cv.height, null);
  doc.meta = { exif: d.meta.exif, icc: d.meta.icc || undefined, srcName: name, app1: d.meta.app1 };
  const frames = d.frames || [d.cv];
  doc.layers = frames.map((f, i) => { const r = newRaster(frames.length > 1 ? `${name} ${i + 1}` : name.replace(/\.[^.]+$/, ''), f.width, f.height); ctx2d(r.cv).drawImage(f, 0, 0); if (i > 0) r.visible = false; return r; });
  void blob; return doc;
}
/** image importée dans un document ouvert : calque intelligent (l'original est gardé, transformations sans perte) */
export function smartFromImage(d: Decoded, name: string, blob: Blob | null, doc: Doc): SmartLayer {
  const s = newSmart(name.replace(/\.[^.]+$/, ''), d.cv, blob, d.mime, doc.w / 2, doc.h / 2);
  // l'image tient dans le document
  const k = Math.min(1, doc.w / d.cv.width, doc.h / d.cv.height); s.tf.sx = s.tf.sy = k; return s;
}

/* ---------- projet .dcimg (JSON : réglages + images en PNG / fichier d'origine) ---------- */
async function b64(blob: Blob): Promise<string> {
  const u = new Uint8Array(await blob.arrayBuffer()); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000) as unknown as number[]);
  return btoa(s);
}
const unb64 = (s: string, type: string) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
const pngOf = (c: HTMLCanvasElement) => new Promise<Blob>((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new ImgError('mem')), 'image/png'));
type Ser = Record<string, unknown>;
async function serLayer(l: Layer): Promise<Ser> {
  const o: Ser = {};
  for (const [k, v] of Object.entries(l)) if (!['cv', 'src', 'blob', 'children', 'mask'].includes(k)) o[k] = v;
  if (l.mask) o.mask = { x: l.mask.x, y: l.mask.y, on: l.mask.on, inv: !!l.mask.inv, png: await b64(await pngOf(l.mask.cv)) };
  if (l.type === 'raster') o.png = await b64(await pngOf(l.cv));
  if (l.type === 'smart') { o.data = await b64(l.blob || await pngOf(l.src)); o.mime = l.blob ? l.mime : 'image/png'; }
  if (l.type === 'group') o.children = await Promise.all(l.children.map(serLayer));
  return o;
}
export async function serialize(doc: Doc): Promise<Blob> {
  const json = {
    format: 'dedcut-image', version: 1, app: 'DedCut', name: doc.name, w: doc.w, h: doc.h, dpi: doc.dpi, bg: doc.bg, space: doc.space, guides: doc.guides,
    meta: { exif: doc.meta.exif || {}, icc: doc.meta.icc || null, srcName: doc.meta.srcName || null, app1: doc.meta.app1 ? await b64(new Blob([doc.meta.app1 as BlobPart])) : null },
    layers: await Promise.all(doc.layers.map(serLayer))
  };
  return new Blob([JSON.stringify(json)], { type: 'application/json' });
}
async function canvasFrom(blob: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob); const c = mkCanvas(bmp.width, bmp.height); ctx2d(c).drawImage(bmp, 0, 0); bmp.close(); return c;
}
async function deLayer(o: Ser): Promise<Layer> {
  const type = o.type as string;
  if (!['raster', 'smart', 'text', 'shape', 'group', 'adjust'].includes(type)) throw new ImgError('format');
  const l = { ...o } as unknown as Layer & Record<string, unknown>;
  if (typeof l.id === 'number') bumpId(l.id);
  l.blend = BLENDS.includes(l.blend) ? l.blend : 'source-over'; l.opacity = Math.max(0, Math.min(1, +l.opacity || 0)); l.fx = Array.isArray(l.fx) ? l.fx : [];
  const m = o.mask as Ser | undefined;
  l.mask = m ? { cv: await canvasFrom(unb64(String(m.png), 'image/png')), x: +(m.x as number) || 0, y: +(m.y as number) || 0, on: !!m.on, inv: !!m.inv } : null;
  if (type === 'raster') { (l as RasterLayer).cv = await canvasFrom(unb64(String(o.png), 'image/png')); delete l.png; }
  if (type === 'smart') { const b = unb64(String(o.data), String(o.mime || 'image/png')), d = await decode(b, 'x.' + (String(o.mime).split('/')[1] || 'png').replace('svg+xml', 'svg')); const s = l as SmartLayer; s.src = d.cv; s.blob = o.mime === 'image/png' && !o.srcName ? null : b; delete l.data; }
  if (type === 'group') (l as Layer & { children: Layer[] }).children = await Promise.all(((o.children as Ser[]) || []).map(deLayer));
  return l;
}
/** ouvre un projet .dcimg (vérifié : un fichier abîmé est refusé sans rien casser) */
export async function deserialize(blob: Blob): Promise<Doc> {
  let j: Ser;
  try { j = JSON.parse(await blob.text()); } catch { throw new ImgError('corrupt'); }
  if (j.format !== 'dedcut-image' || typeof j.w !== 'number' || typeof j.h !== 'number' || !Array.isArray(j.layers)) throw new ImgError('corrupt');
  check(j.w as number, j.h as number);
  const doc = newDoc(String(j.name || 'Image'), j.w as number, j.h as number, (j.bg as string) ?? null, +(j.dpi as number) || 72);
  doc.guides = Array.isArray(j.guides) ? j.guides as Doc['guides'] : []; doc.space = j.space === 'display-p3' ? 'display-p3' : 'srgb';
  const meta = (j.meta || {}) as Ser;
  doc.meta = { exif: (meta.exif as Record<string, string>) || {}, icc: (meta.icc as string) || undefined, srcName: (meta.srcName as string) || undefined, app1: meta.app1 ? new Uint8Array(await unb64(String(meta.app1), 'application/octet-stream').arrayBuffer()) : null };
  try { doc.layers = await Promise.all((j.layers as Ser[]).map(deLayer)); } catch (e) { throw e instanceof ImgError ? e : new ImgError('corrupt'); }
  return doc;
}

/* ---------- enregistrer ---------- */
/** écrit un fichier : dans DedCut, sur le disque (écriture sûre) ; dans un navigateur, en téléchargement */
export async function writeFile(blob: Blob, name: string, path: string | null): Promise<string | null> {
  const b = bridge();
  if (b && path) { await b.write(path, blob); return path; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); return null;
}

/* ---------- exporter ---------- */
export type ExpFormat = 'png' | 'jpeg' | 'webp' | 'tiff' | 'svg' | 'psd';
export interface ExpOpts { format: ExpFormat; quality: number; scale: number; w?: number; h?: number; bg: string; meta: 'none' | 'basic' | 'keep'; artist: string; copyright: string }
export const FORMAT_INFO: Record<ExpFormat, { ext: string; alpha: boolean; layers: boolean; quality: boolean }> = {
  png: { ext: 'png', alpha: true, layers: false, quality: false }, jpeg: { ext: 'jpg', alpha: false, layers: false, quality: true },
  webp: { ext: 'webp', alpha: true, layers: false, quality: true }, tiff: { ext: 'tif', alpha: true, layers: false, quality: false },
  svg: { ext: 'svg', alpha: true, layers: true, quality: false }, psd: { ext: 'psd', alpha: true, layers: true, quality: false }
};
/** l'image a-t-elle des zones transparentes ? (vérifié sur une petite copie) */
function hasAlpha(doc: Doc): boolean {
  if (doc.bg) return false; const k = Math.min(1, 200 / Math.max(doc.w, doc.h)), c = renderDoc(doc, k, true), d = ctx2d(c, true).getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true; return false;
}
/** ce qui ne sera pas gardé tel quel dans le format choisi (prévenu avant l'export) */
export function lostItems(doc: Doc, f: ExpFormat): string[] {
  const out = new Set<string>(); const ls = [...walk(doc.layers)].map(x => x.l);
  if (f === 'jpeg') { if (hasAlpha(doc)) out.add('alpha'); if (ls.length > 1) out.add('layers'); }
  if (f === 'png' || f === 'webp' || f === 'tiff') if (ls.length > 1) out.add('layers');
  if (f === 'webp' || f === 'tiff') out.add('meta');
  if (f === 'psd') {
    if (ls.some(l => l.type === 'text')) out.add('text'); if (ls.some(l => l.type === 'shape')) out.add('shapes');
    if (ls.some(l => l.fx.some(x => x.on))) out.add('fx'); if (ls.some(l => l.type === 'adjust')) out.add('adjust'); if (ls.some(l => l.type === 'smart')) out.add('smart');
  }
  if (f === 'svg') {
    if (ls.some(l => l.type === 'raster' || l.type === 'smart')) out.add('raster'); if (ls.some(l => l.fx.some(x => x.on) || l.mask)) out.add('fx');
    if (ls.some(l => l.type === 'adjust' || l.blend !== 'source-over')) out.add('adjust');
  }
  return [...out];
}
const canvasBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new ImgError('mem')), type, q));
export async function exportBlob(doc: Doc, o: ExpOpts): Promise<Blob> {
  const W = Math.max(1, Math.round(o.w || doc.w * o.scale)), H = Math.max(1, Math.round(o.h || doc.h * o.scale)), s = W / doc.w;
  if (o.format === 'svg') return new Blob([await toSvg(doc, s)], { type: 'image/svg+xml' });
  if (o.format === 'psd') return toPsd(doc);
  let c = renderRect(doc, { x: 0, y: 0, w: doc.w, h: doc.h }, s, undefined, { bg: true });
  if (c.width !== W || c.height !== H) { const n = mkCanvas(W, H); ctx2d(n).drawImage(c, 0, 0, W, H); c = n; }
  if (o.format === 'jpeg') { const n = mkCanvas(W, H), g = ctx2d(n); g.fillStyle = doc.bg || o.bg || '#ffffff'; g.fillRect(0, 0, W, H); g.drawImage(c, 0, 0); c = n; }
  if (o.format === 'tiff') {
    const UTIF = (await import('utif2')).default as unknown as UtifLib;
    const d = ctx2d(c, true).getImageData(0, 0, W, H).data; return new Blob([UTIF.encodeImage(new Uint8Array(d.buffer), W, H)], { type: 'image/tiff' });
  }
  const type = o.format === 'png' ? 'image/png' : o.format === 'jpeg' ? 'image/jpeg' : 'image/webp';
  let blob = await canvasBlob(c, type, o.format === 'png' ? undefined : o.quality);
  if (o.format !== 'webp' && o.meta !== 'none') {
    const text: Record<string, string> = o.meta === 'basic' ? { Author: o.artist, Copyright: o.copyright, Software: 'DedCut' } : {};
    const tiff = o.meta === 'keep' && doc.meta.app1 ? patchOrientation(doc.meta.app1) : o.meta === 'basic' && o.format === 'jpeg' ? buildExif({ artist: o.artist, copyright: o.copyright, software: 'DedCut' }) : null;
    blob = await withMeta(blob, tiff, o.format === 'png' ? text : {});
  }
  return blob;
}
async function toPsd(doc: Doc): Promise<Blob> {
  const { writePsd } = await import('ag-psd');
  const blendName = (b: Blend) => Object.entries(PSD_BLEND).find(([, v]) => v === b)?.[0] || 'normal';
  // chaque calque est rendu tel qu'il apparaît (effets compris) ; les groupes restent des groupes
  const conv = (list: Layer[]): PsdLayer[] => list.filter(l => l.type !== 'adjust').map(l => {
    const base = { name: l.name, opacity: l.opacity, hidden: !l.visible, blendMode: blendName(l.blend), clipping: l.clip } as PsdLayer;
    if (l.type === 'group') return { ...base, children: conv(l.children) };
    const one = renderRect({ ...doc, bg: null, layers: [{ ...l, opacity: 1, blend: 'source-over', clip: false, visible: true } as Layer] }, { x: 0, y: 0, w: doc.w, h: doc.h }, 1, undefined, { bg: false });
    return { ...base, canvas: one, left: 0, top: 0 };
  });
  const comp = renderDoc(doc, 1, true);
  const buf = writePsd({ width: doc.w, height: doc.h, children: conv(doc.layers) as never, canvas: comp } as never, { generateThumbnail: false });
  return new Blob([buf], { type: 'image/vnd.adobe.photoshop' });
}
const esc = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
function itemD(it: ShapeItem): string | null {
  const w = it.w, h = it.h, x = -w / 2 + it.ox, y = -h / 2 + it.oy;
  if (it.kind === 'rect') { const r = Math.min(it.r, w / 2, h / 2); return r > 0 ? `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
  if (it.kind === 'ellipse') return `M${x} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x + w} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x} ${y + h / 2}Z`;
  if (it.kind === 'line') return `M${x} ${y + h / 2}H${x + w}`;
  if (it.kind === 'polygon' || it.kind === 'star') {
    const n = Math.max(3, Math.round(it.sides)), star = it.kind === 'star', N = n * (star ? 2 : 1); let d = '';
    for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / N, k = star && i % 2 ? it.inner : 1; d += (i ? 'L' : 'M') + (x + w / 2 + Math.cos(a) * w / 2 * k).toFixed(2) + ' ' + (y + h / 2 + Math.sin(a) * h / 2 * k).toFixed(2); }
    return d + 'Z';
  }
  if (it.kind === 'custom' && it.custom && CUSTOM_SHAPES[it.custom]) return null;
  if (it.kind === 'path' && it.paths) {
    let d = '';
    for (const sp of it.paths) {
      const P = sp.pts; if (!P.length) continue; d += `M${P[0].x} ${P[0].y}`;
      const seg = (a: typeof P[0], b: typeof P[0]) => { d += `C${a.x + a.ox} ${a.y + a.oy} ${b.x + b.ix} ${b.y + b.iy} ${b.x} ${b.y}`; };
      for (let i = 1; i < P.length; i++) seg(P[i - 1], P[i]); if (sp.closed && P.length > 1) { seg(P[P.length - 1], P[0]); d += 'Z'; }
    }
    return d;
  }
  return null;
}
/** SVG : textes et formes restent vectoriels, le reste est intégré en image */
async function toSvg(doc: Doc, s: number): Promise<string> {
  const parts: string[] = []; let gid = 0;
  const paint = (p: { kind: string; color: string; grad?: { stops: { o: number; c: string; a: number }[]; angle: number; kind: string } } | null) => {
    if (!p) return 'none';
    if (p.kind === 'gradient' && p.grad) {
      const id = 'g' + (++gid), a = p.grad.angle * Math.PI / 180, x = Math.cos(a) / 2, y = Math.sin(a) / 2;
      const stops = p.grad.stops.map(st => `<stop offset="${st.o}" stop-color="${st.c}" stop-opacity="${st.a}"/>`).join('');
      parts.push(p.grad.kind === 'radial' ? `<defs><radialGradient id="${id}">${stops}</radialGradient></defs>` : `<defs><linearGradient id="${id}" x1="${.5 - x}" y1="${.5 - y}" x2="${.5 + x}" y2="${.5 + y}">${stops}</linearGradient></defs>`);
      return `url(#${id})`;
    }
    return p.kind === 'color' ? p.color : '#888888';
  };
  const out = async (list: Layer[]) => {
    for (const l of list) {
      if (!l.visible || l.type === 'adjust') continue;
      const op = l.opacity < 1 ? ` opacity="${l.opacity}"` : '';
      if (l.type === 'group') { parts.push(`<g${op}>`); await out(l.children); parts.push('</g>'); continue; }
      const vec = (l.type === 'text' || l.type === 'shape') && !l.fx.some(f => f.on) && !l.mask;
      if (vec && l.type === 'shape' && l.items.every(it => itemD(it) !== null) && l.items.every(it => it.op === 'add')) {
        const m = tfMatrix(l.tf), fill = paint(l.fill), st = l.stroke && l.stroke.on ? ` stroke="${paint(l.stroke.paint)}" stroke-width="${l.stroke.width}" stroke-linejoin="${l.stroke.join}"` : '';
        parts.push(`<g transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})"${op}>${l.items.map(it => `<path d="${itemD(it)}" fill="${it.kind === 'line' ? 'none' : fill}" fill-rule="evenodd"${st}/>`).join('')}</g>`);
        continue;
      }
      if (vec && l.type === 'text' && !l.st.curve && !l.onPath) {
        const m = tfMatrix(l.tf), [w, h] = localSize(l), lines = l.text.split('\n'), anchor = l.st.align === 'center' ? 'middle' : l.st.align === 'right' ? 'end' : 'start';
        const ax = l.st.align === 'left' ? -w / 2 : l.st.align === 'right' ? w / 2 : 0;
        const st = l.st.stroke.on ? ` stroke="${l.st.stroke.color}" stroke-width="${l.st.stroke.width * 2}" paint-order="stroke" stroke-linejoin="round"` : '';
        parts.push(`<g transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})"${op}><text font-family="${esc(l.st.font)}" font-size="${l.st.size}" font-weight="${l.st.weight}"${l.st.italic ? ' font-style="italic"' : ''} letter-spacing="${l.st.ls}" text-anchor="${anchor}" fill="${paint(l.st.fill)}"${st}${l.st.underline ? ' text-decoration="underline"' : ''}>` +
          lines.map((t, i) => `<tspan x="${ax}" y="${-h / 2 + l.st.size * .9 + i * l.st.size * l.st.lh}">${esc(l.st.caps ? t.toUpperCase() : t)}</tspan>`).join('') + '</text></g>');
        continue;
      }
      // tout le reste : image PNG du calque rendu
      const c = renderRect({ ...doc, bg: null, layers: [{ ...l, opacity: 1 } as Layer] }, { x: 0, y: 0, w: doc.w, h: doc.h }, s, undefined, { bg: false });
      parts.push(`<image x="0" y="0" width="${doc.w}" height="${doc.h}"${op} href="data:image/png;base64,${await b64(await pngOf(c))}"/>`);
    }
  };
  if (doc.bg) parts.push(`<rect width="${doc.w}" height="${doc.h}" fill="${doc.bg}"/>`);
  await out(doc.layers);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(doc.w * s)}" height="${Math.round(doc.h * s)}" viewBox="0 0 ${doc.w} ${doc.h}">\n${parts.join('\n')}\n</svg>\n`;
}
/** vignette d'un document (onglets, reprise) */
export function thumb(doc: Doc, max = 160): HTMLCanvasElement { const k = Math.min(1, max / Math.max(doc.w, doc.h)); return renderDoc(doc, k, true); }
export { drawContent };

/* ---------- sauvegarde automatique (IndexedDB, dans le profil de DedCut) ---------- */
const DB = 'dedcut-image', ST = 'autosave';
function idb(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
}
export interface AutoEntry { key: string; name: string; t: number; w: number; h: number; data: Blob; thumb: Blob | null; path: string | null }
export async function autoSave(doc: Doc, key: string) {
  const data = await serialize(doc), th = await pngOf(thumb(doc, 96)).catch(() => null);
  const db = await idb(); await new Promise<void>((ok, ko) => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).put({ key, name: doc.name, t: Date.now(), w: doc.w, h: doc.h, data, thumb: th, path: doc.path } as AutoEntry, key); tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error); }); db.close();
}
export async function autoList(): Promise<AutoEntry[]> {
  try { const db = await idb(); const r = await new Promise<AutoEntry[]>((ok, ko) => { const q = db.transaction(ST).objectStore(ST).getAll(); q.onsuccess = () => ok(q.result as AutoEntry[]); q.onerror = () => ko(q.error); }); db.close(); return r.sort((a, b) => b.t - a.t); } catch { return []; }
}
export async function autoDrop(key: string) {
  try { const db = await idb(); await new Promise<void>(ok => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).delete(key); tx.oncomplete = () => ok(); tx.onerror = () => ok(); }); db.close(); } catch { /* rien */ }
}

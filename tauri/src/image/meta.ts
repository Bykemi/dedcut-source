// DedCut Image — métadonnées : lecture EXIF / profil couleur (JPEG, PNG, WebP) et écriture choisie à l'export.
// Écrit à la main (formats documentés) : aucune dépendance.

const ASCII = (b: Uint8Array) => new TextDecoder('latin1').decode(b).replace(/\0+$/, '').trim();
const TAGS: Record<number, string> = {
  0x010f: 'make', 0x0110: 'model', 0x0112: 'orientation', 0x0131: 'software', 0x0132: 'date', 0x013b: 'artist', 0x8298: 'copyright', 0x010e: 'description',
  0x9003: 'taken', 0x829a: 'exposure', 0x829d: 'fnumber', 0x8827: 'iso', 0x920a: 'focal', 0xa434: 'lens', 0xa002: 'pxw', 0xa003: 'pxh'
};
/** lit le bloc TIFF d'un EXIF (IFD0, sous-IFD Exif, présence GPS) */
export function parseTiff(t: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {}; if (t.length < 8) return out;
  const le = t[0] === 0x49, v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const u16 = (o: number) => v.getUint16(o, le), u32 = (o: number) => v.getUint32(o, le);
  const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
  const ifd = (off: number, depth: number) => {
    if (off <= 0 || off + 2 > t.length || depth > 2) return; const n = u16(off);
    for (let i = 0; i < n && off + 2 + i * 12 + 12 <= t.length; i++) {
      const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), sz = (sizes[type] || 1) * cnt, vo = sz > 4 ? u32(e + 8) : e + 8;
      if (vo + sz > t.length) continue;
      if (tag === 0x8769) { ifd(u32(e + 8), depth + 1); continue; }
      if (tag === 0x8825) { out.gps = '1'; continue; }
      const name = TAGS[tag]; if (!name) continue;
      if (type === 2) out[name] = ASCII(t.subarray(vo, vo + cnt));
      else if (type === 3) out[name] = String(u16(vo));
      else if (type === 4) out[name] = String(u32(vo));
      else if (type === 5) { const a = u32(vo), b = u32(vo + 4) || 1; out[name] = name === 'exposure' && a < b ? `1/${Math.round(b / a)}` : String(+(a / b).toFixed(2)); }
    }
  };
  ifd(u32(4), 0); return out;
}
function iccName(p: Uint8Array): string {
  // balise « desc » du profil ICC
  try {
    const v = new DataView(p.buffer, p.byteOffset, p.byteLength), n = v.getUint32(128);
    for (let i = 0; i < n; i++) {
      const o = 132 + i * 12, sig = ASCII(p.subarray(o, o + 4)), off = v.getUint32(o + 4), len = v.getUint32(o + 8);
      if (sig !== 'desc') continue;
      const type = ASCII(p.subarray(off, off + 4));
      if (type === 'desc') return ASCII(p.subarray(off + 12, off + 12 + Math.max(0, v.getUint32(off + 8) - 1)));
      if (type === 'mluc') { const so = v.getUint32(off + 20), sl = v.getUint32(off + 16); return new TextDecoder('utf-16be').decode(p.subarray(off + so, off + so + sl)).replace(/\0/g, ''); }
      return ASCII(p.subarray(off + 8, off + len));
    }
  } catch { /* profil illisible */ }
  return 'ICC';
}
export interface Meta { exif: Record<string, string>; icc: string | null; app1: Uint8Array | null; kind: string }
/** métadonnées d'un fichier image (octets) */
export function readMeta(b: Uint8Array): Meta {
  const m: Meta = { exif: {}, icc: null, app1: null, kind: '' };
  try {
    if (b[0] === 0xff && b[1] === 0xd8) {
      m.kind = 'jpeg'; let o = 2; const icc: Uint8Array[] = [];
      while (o + 4 < b.length && b[o] === 0xff) {
        const mk = b[o + 1], len = (b[o + 2] << 8) | b[o + 3]; if (mk === 0xda || len < 2) break;
        const seg = b.subarray(o + 4, o + 2 + len);
        if (mk === 0xe1 && ASCII(seg.subarray(0, 4)) === 'Exif') { m.app1 = seg.slice(6); m.exif = parseTiff(m.app1); }
        if (mk === 0xe2 && ASCII(seg.subarray(0, 11)) === 'ICC_PROFILE') icc.push(seg.subarray(14));
        o += 2 + len;
      }
      if (icc.length) { const t = new Uint8Array(icc.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of icc) { t.set(x, p); p += x.length; } m.icc = iccName(t); }
    } else if (b[0] === 0x89 && b[1] === 0x50) {
      m.kind = 'png'; let o = 8; const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
      while (o + 8 <= b.length) {
        const len = v.getUint32(o), type = ASCII(b.subarray(o + 4, o + 8)), data = b.subarray(o + 8, o + 8 + len);
        if (type === 'eXIf') { m.app1 = data.slice(); m.exif = parseTiff(m.app1); }
        if (type === 'iCCP') m.icc = ASCII(data.subarray(0, data.indexOf(0)));
        if (type === 'sRGB') m.icc = m.icc || 'sRGB';
        if (type === 'tEXt') { const z = data.indexOf(0); const k = ASCII(data.subarray(0, z)).toLowerCase(), val = ASCII(data.subarray(z + 1)); if (['author', 'copyright', 'description', 'software'].includes(k)) m.exif[k === 'author' ? 'artist' : k] = val; }
        if (type === 'IEND') break; o += 12 + len;
      }
    } else if (ASCII(b.subarray(0, 4)) === 'RIFF' && ASCII(b.subarray(8, 12)) === 'WEBP') {
      m.kind = 'webp'; let o = 12; const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
      while (o + 8 <= b.length) {
        const type = ASCII(b.subarray(o, o + 4)), len = v.getUint32(o + 4, true), data = b.subarray(o + 8, o + 8 + len);
        if (type === 'EXIF') { const d = ASCII(data.subarray(0, 4)) === 'Exif' ? data.slice(6) : data.slice(); m.app1 = d; m.exif = parseTiff(d); }
        if (type === 'ICCP') m.icc = iccName(data);
        o += 8 + len + (len & 1);
      }
    }
  } catch { /* fichier inhabituel : pas de métadonnées */ }
  return m;
}

/* ---------- écriture ---------- */
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length), v = new DataView(out.buffer); v.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4); out.set(data, 8); v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
}
/** EXIF minimal (TIFF, petit-boutiste) : auteur, copyright, logiciel, description */
export function buildExif(f: { artist?: string; copyright?: string; software?: string; description?: string }): Uint8Array {
  const ent = ([[0x010e, f.description], [0x0131, f.software], [0x013b, f.artist], [0x8298, f.copyright]] as [number, string | undefined][]).filter(e => e[1]) as [number, string][];
  const enc = (s: string) => { const b = new TextEncoder().encode(s); const o = new Uint8Array(b.length + 1); o.set(b); return o; };
  const vals = ent.map(e => enc(e[1])), start = 8 + 2 + ent.length * 12 + 4; let total = start; for (const v of vals) total += v.length > 4 ? v.length + (v.length & 1) : 0;
  const t = new Uint8Array(total), dv = new DataView(t.buffer); t.set([0x49, 0x49, 42, 0]); dv.setUint32(4, 8, true); dv.setUint16(8, ent.length, true);
  let data = start;
  ent.forEach((e, i) => {
    const o = 10 + i * 12, v = vals[i]; dv.setUint16(o, e[0], true); dv.setUint16(o + 2, 2, true); dv.setUint32(o + 4, v.length, true);
    if (v.length <= 4) t.set(v, o + 8); else { dv.setUint32(o + 8, data, true); t.set(v, data); data += v.length + (v.length & 1); }
  });
  return t;
}
/** EXIF d'origine avec l'orientation remise à « normale » (l'image exportée est déjà tournée) */
export function patchOrientation(tiff: Uint8Array): Uint8Array {
  const t = tiff.slice(), le = t[0] === 0x49, v = new DataView(t.buffer);
  try { const off = v.getUint32(4, le), n = v.getUint16(off, le); for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; if (v.getUint16(e, le) === 0x0112) v.setUint16(e + 8, 1, le); } } catch { /* rien */ }
  return t;
}
/** ajoute les métadonnées choisies à un fichier PNG ou JPEG exporté */
export async function withMeta(blob: Blob, tiff: Uint8Array | null, text: Record<string, string>): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] === 0x89 && b[1] === 0x50) {
    const parts: Uint8Array[] = [b.subarray(0, 33)];
    for (const [k, val] of Object.entries(text)) if (val) parts.push(pngChunk('tEXt', new TextEncoder().encode(k + '\0' + val.replace(/[^\x20-\xff]/g, '?'))));
    if (tiff) parts.push(pngChunk('eXIf', tiff));
    parts.push(b.subarray(33)); return new Blob(parts as BlobPart[], { type: 'image/png' });
  }
  if (b[0] === 0xff && b[1] === 0xd8 && tiff) {
    const head = new TextEncoder().encode('Exif\0\0'), len = 2 + head.length + tiff.length; if (len > 65535) return blob;
    const seg = new Uint8Array(4 + head.length + tiff.length); seg.set([0xff, 0xe1, len >> 8, len & 255]); seg.set(head, 4); seg.set(tiff, 4 + head.length);
    return new Blob([b.subarray(0, 2), seg, b.subarray(2)] as BlobPart[], { type: 'image/jpeg' });
  }
  return blob;
}

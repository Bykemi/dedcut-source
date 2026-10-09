// DedCut Musique — fichiers : projet .dcmus (JSON lisible, versionné), sons (import, doublons, sons manquants),
// exports (WAV, FLAC, M4A), contrôle du fichier produit, archive ZIP (projet + sons + registre des droits), envoi au Montage.
import type { Asset, Project } from './model';
import { deepClone } from './model';
import { decodeAiff, decodeWav, encodeFlac, encodeWav, inspect, loudness, truePeakDb, type Chans } from './dsp';
import type { Store } from './engine';
import { toBuffer } from './engine';

export const FORMAT = 'dedcut-music', VERSION = 1;
interface FileInfo { path: string; name: string; size: number; exists: boolean }
export interface MusFS {
  open(label: string, exts: string[], multi: boolean): Promise<FileInfo[]>; allow(project: string, paths: string[]): Promise<FileInfo[]>;
  saveDialog(name: string, label: string, ext: string): Promise<string | null>; pickDir(title: string): Promise<string | null>;
  write(path: string, data: Blob | Uint8Array): Promise<FileInfo>; copy(src: string, dst: string): Promise<FileInfo>; dir(): Promise<{ path: string; free: number }>; free(path: string): Promise<number>; url(path: string): string;
  autosave(id: string, text: string): Promise<unknown>; autosaves(): Promise<{ id: string; time: number; size: number }[]>; autosaveRead(id: string): Promise<string>; autosaveDel(id: string): Promise<unknown>;
  recOpen(id: string, meta: string): Promise<number>; recAppend(id: string, b: Uint8Array): Promise<number>; recClose(id: string): Promise<unknown>; recOrphans(): Promise<{ id: string; path: string; meta: string; size: number }[]>; recDrop(id: string): Promise<unknown>;
  plugins(): Promise<{ format: string; name: string; vendor: string; version: string; path: string; x64: boolean; size: number; modified: number; category: string }[]>;
}
export const fs = (): MusFS | null => (window as unknown as { dedcutMus?: MusFS }).dedcutMus || null;
export const AUDIO_EXT = ['wav', 'flac', 'aif', 'aiff', 'mp3', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'webm', 'wma'];
const dirOf = (p: string) => p.replace(/[\\/][^\\/]*$/, ''), baseOf = (p: string) => p.replace(/^.*[\\/]/, ''), stemOf = (p: string) => baseOf(p).replace(/\.[^.]+$/, '');
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'musique';

/* ---------- projet ---------- */
export function serialize(p: Project): string {
  const o = deepClone(p) as Project & { saved?: number }; o.dirty = false; o.saved = Date.now();
  for (const a of Object.values(o.assets)) delete a.missing;
  return JSON.stringify(o);
}
/** lit et vérifie un projet ; migration vers la version actuelle (l'appelant garde une copie de l'ancien fichier) */
export function parse(text: string): { p: Project; migrated: boolean } {
  const o = JSON.parse(text) as Project; if (!o || o.format !== FORMAT) throw new Error('mu.err.notProject');
  if (typeof o.version !== 'number' || o.version > VERSION) throw new Error('mu.err.newer');
  let migrated = false;
  if (o.version < VERSION) { migrated = true; o.version = VERSION; }
  // champs ajoutés depuis la version 1 : valeurs par défaut
  o.tracks ||= []; o.midi ||= []; o.markers ||= []; o.chords ||= []; o.assets ||= {}; o.comments ||= []; o.versions ||= []; o.scenes ||= []; o.mix ||= [];
  o.master ||= { vol: 0, fx: [], protect: true, ceiling: -.3 }; o.master.auto ||= [];
  for (const t of o.tracks) { t.auto ||= []; t.takes ||= []; t.comp ||= []; t.slots ||= []; t.pool ||= []; t.sends ||= []; t.fx ||= []; }
  o.dirty = false; return { p: o, migrated };
}
export const soundsDir = (projectPath: string) => projectPath.replace(/\.dcmus$/i, '') + ' - Sons';
const usedAssets = (p: Project): Set<string> => {
  const s = new Set<string>();
  for (const t of p.tracks) { for (const c of [...t.clips, ...(t.pool || [])]) if (c.kind === 'audio') s.add(c.asset); if (t.frozen) s.add(t.frozen); for (const z of t.inst?.zones || []) s.add(z.asset); for (const pd of t.inst?.pads || []) s.add(pd.asset); }
  return s;
};
/** enregistre le projet ; collect = copier aussi les sons extérieurs dans le dossier du projet (projet transportable) */
export async function saveProject(p: Project, store: Store, path: string, collect: boolean, onStep?: (k: string, i: number, n: number) => void): Promise<void> {
  const F = fs(); if (!F) throw new Error('mu.err.noFs');
  const sd = soundsDir(path), used = usedAssets(p), list = [...used].map(id => p.assets[id]).filter(Boolean); let i = 0;
  for (const a of list) {
    onStep?.('sound', ++i, list.length); if (a.id.startsWith('gen:')) continue;
    if (!a.path) { const b = store.get(a.id); if (!b) continue; const f = await F.write(sd + '\\' + safeName(a.name) + ' ' + a.id.replace(/[^a-z0-9]/gi, '').slice(-10) + '.wav', encodeWav(chOf(b), b.sampleRate, 24, false)); a.path = f.path; }
    else if (collect && !a.path.toLowerCase().startsWith(sd.toLowerCase() + '\\')) { try { const f = await F.copy(a.path, sd + '\\' + baseOf(a.path)); a.path = f.path; } catch { /* fichier extérieur introuvable : on garde la référence */ } }
    a.rel = a.path.toLowerCase().startsWith(dirOf(path).toLowerCase() + '\\') ? a.path.slice(dirOf(path).length + 1) : undefined;
  }
  p.path = path; await F.write(path, new Blob([serialize(p)], { type: 'application/json' })); p.dirty = false;
  try { await F.autosaveDel(p.id); } catch { /* rien */ }
}
export const chOf = (b: AudioBuffer): Chans => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
/** ouvre un projet : renvoie aussi la liste des sons introuvables (les clips restent, muets, en attendant) */
export async function loadProject(path: string, text: string, store: Store, ctx: BaseAudioContext, onStep?: (i: number, n: number) => void): Promise<{ p: Project; missing: Asset[]; migrated: boolean }> {
  const { p, migrated } = parse(text); p.path = path; const F = fs(), used = usedAssets(p), missing: Asset[] = [];
  const list = Object.values(p.assets).filter(a => used.has(a.id) && !a.id.startsWith('gen:')); let i = 0;
  const cands = (a: Asset) => [a.rel ? dirOf(path) + '\\' + a.rel : '', a.path || ''].filter(Boolean);
  const infos = F ? await F.allow(path, list.flatMap(cands)) : [];
  for (const a of list) {
    onStep?.(++i, list.length);
    const ok = infos.find(x => x.exists && cands(a).some(c => c.toLowerCase() === x.path.toLowerCase()));
    if (!ok || !F) { a.missing = true; missing.push(a); continue; }
    try { const b = await decodeFile(ctx, await (await fetch(F.url(ok.path))).arrayBuffer(), a.name); store.set(a.id, b); a.path = ok.path; a.missing = false; } catch { a.missing = true; missing.push(a); }
  }
  return { p, missing, migrated };
}
/** décode un son : WAV / AIFF par DedCut (24 bits, flottant), le reste par le navigateur (MP3, FLAC, OGG, M4A…) */
export async function decodeFile(ctx: BaseAudioContext, ab: ArrayBuffer, name = ''): Promise<AudioBuffer> {
  const w = decodeWav(ab) || (/\.aiff?$/i.test(name) || new TextDecoder().decode(new Uint8Array(ab, 0, 4)) === 'FORM' ? decodeAiff(ab) : null);
  if (w) return toBuffer(w.ch, w.sr);
  return await ctx.decodeAudioData(ab.slice(0));
}
/** empreinte d'un fichier (doublons) : SHA-256 du premier Mo + taille */
export async function hashOf(ab: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', ab.slice(0, 1 << 20)); return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('') + ':' + ab.byteLength;
}
/** importe un son (fichier choisi ou glissé) ; si le même fichier est déjà dans le projet, on le réutilise */
export async function importSound(p: Project, store: Store, ctx: BaseAudioContext, src: { path?: string; file?: File }): Promise<{ a: Asset; dup: boolean }> {
  const F = fs(); const ab = src.file ? await src.file.arrayBuffer() : await (await fetch(F!.url(src.path!))).arrayBuffer();
  const hash = await hashOf(ab), had = Object.values(p.assets).find(x => x.hash === hash && !x.missing); if (had && store.has(had.id)) return { a: had, dup: true };
  const name = src.file ? src.file.name : baseOf(src.path!), b = await decodeFile(ctx, ab, name);
  const a: Asset = { id: 'snd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name, path: src.path || null, sr: b.sampleRate, ch: b.numberOfChannels, len: b.duration, hash, origin: 'import', licence: 'user', tags: [], bpm: 0, key: '' };
  store.set(a.id, b); p.assets[a.id] = a; return { a, dup: false };
}
/** son créé par DedCut (prise, rendu, gel, traitement) : rangé tout de suite sur le disque (rien ne se perd en cas de plantage) */
export async function persistSound(p: Project, store: Store, a: Asset, ch: Chans, folder: 'Prises' | 'Rendus'): Promise<void> {
  const F = fs(); store.set(a.id, toBuffer(ch, a.sr)); p.assets[a.id] = a; if (!F) return;
  try { const d = await F.dir(); const f = await F.write(d.path + '\\' + folder + '\\' + safeName(p.name) + ' - ' + safeName(a.name) + ' ' + a.id.slice(-6) + '.wav', encodeWav(ch, a.sr, 24, false)); a.path = f.path; } catch { /* disque plein : le son reste en mémoire, il sera écrit à l'enregistrement du projet */ }
}

/* ---------- exports ---------- */
export type ExpFmt = 'wav16' | 'wav24' | 'wav32' | 'flac16' | 'flac24' | 'm4a';
export async function encodeAudio(ch: Chans, sr: number, fmt: ExpFmt, kbps = 192): Promise<Blob> {
  if (fmt === 'wav16') return encodeWav(ch, sr, 16, true); // tramage : seulement en réduisant à 16 bits
  if (fmt === 'wav24') return encodeWav(ch, sr, 24, false);
  if (fmt === 'wav32') return encodeWav(ch, sr, 32, false);
  if (fmt === 'flac16' || fmt === 'flac24') { const bits = fmt === 'flac16' ? 16 : 24; return encodeFlac(bits === 16 ? dither16(ch) : ch, sr, bits); }
  return encodeM4a(ch, sr, kbps);
}
function dither16(ch: Chans): Chans { const l = 1 / 32768; return ch.map(c => { const o = new Float32Array(c.length); for (let i = 0; i < c.length; i++) o[i] = c[i] + (Math.random() - Math.random()) * l; return o; }); }
async function resample(ch: Chans, from: number, to: number): Promise<Chans> {
  const n = ch[0].length, oc = new OfflineAudioContext(ch.length, Math.max(1, Math.round(n * to / from)), to), b = oc.createBuffer(ch.length, n, from);
  ch.forEach((c, i) => b.copyToChannel(new Float32Array(c), i)); const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
  const r = await oc.startRendering(); return Array.from({ length: r.numberOfChannels }, (_, i) => r.getChannelData(i));
}
/** AAC dans un M4A : encodeur du système (WebCodecs) + mp4-muxer déjà livré avec DedCut */
async function encodeM4a(ch: Chans, sr: number, kbps: number): Promise<Blob> {
  const W = window as unknown as { Mp4Muxer?: { ArrayBufferTarget: new () => { buffer: ArrayBuffer }; Muxer: new (o: unknown) => { addAudioChunk(c: EncodedAudioChunk, m?: EncodedAudioChunkMetadata): void; finalize(): void } } };
  const nc = Math.min(2, ch.length), rate = [44100, 48000].includes(sr) ? sr : 48000;
  // l'AAC de Windows n'accepte que 44,1 ou 48 kHz : on convertit vraiment la fréquence (sinon le son jouerait trop lent ou trop vite)
  if (rate !== sr) ch = await resample(ch.slice(0, nc), sr, rate);
  if (!window.AudioEncoder || !W.Mp4Muxer) throw new Error('mu.err.aac');
  // l'encodeur de Windows plafonne à 192 kbit/s : on prend le débit demandé, sinon le plus haut accepté
  let cfg: AudioEncoderConfig | null = null;
  for (const k of [kbps, 192, 160, 128, 96].filter(k => k <= kbps || k === 96)) { const c = { codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: nc, bitrate: k * 1000 }; if ((await AudioEncoder.isConfigSupported(c).catch(() => ({ supported: false }))).supported) { cfg = c; break; } }
  if (!cfg) throw new Error('mu.err.aac');
  const target = new W.Mp4Muxer.ArrayBufferTarget(), mux = new W.Mp4Muxer.Muxer({ target, audio: { codec: 'aac', numberOfChannels: nc, sampleRate: rate }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err: unknown = null; const enc = new AudioEncoder({ output: (c, m) => mux.addAudioChunk(c, m), error: e => { err = e; } }); enc.configure(cfg);
  const n = ch[0].length;
  for (let i = 0, B = 4800; i < n; i += B) {
    const k = Math.min(B, n - i), d = new Float32Array(k * nc); for (let c = 0; c < nc; c++) d.set(ch[c].subarray(i, i + k), c * k);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: k, numberOfChannels: nc, timestamp: Math.round(i * 1e6 / rate), data: d }); enc.encode(ad); ad.close();
    if (enc.encodeQueueSize > 16) await new Promise(r => { enc.addEventListener('dequeue', r, { once: true }); setTimeout(r, 1000); });
  }
  await enc.flush(); enc.close(); if (err) throw err; mux.finalize(); return new Blob([target.buffer], { type: 'audio/mp4' });
}
export const extOf = (f: ExpFmt) => f.startsWith('wav') ? 'wav' : f.startsWith('flac') ? 'flac' : 'm4a';
/** silence au début / à la fin (s), fondu d'entrée / de sortie (s) */
export function finish(ch: Chans, sr: number, o: { trim: boolean; padA: number; padB: number; fadeIn: number; fadeOut: number }): Chans {
  let a = 0, b = ch[0].length; if (o.trim) { const thr = Math.pow(10, -70 / 20), loud = (i: number) => ch.some(c => Math.abs(c[i]) > thr); while (a < b && !loud(a)) a++; while (b > a && !loud(b - 1)) b--; }
  const pa = Math.round(o.padA * sr), pb = Math.round(o.padB * sr), n = b - a + pa + pb;
  return ch.map(c => { const x = new Float32Array(Math.max(1, n)); x.set(c.subarray(a, b), pa); const fi = Math.round(o.fadeIn * sr), fo = Math.round(o.fadeOut * sr); for (let i = 0; i < fi && i < n; i++) x[pa + i] *= i / fi; for (let i = 0; i < fo && i < n; i++) x[pa + (b - a) - 1 - i] *= i / fo; return x; });
}
/** contrôle du fichier produit (durée, canaux, saturation, crête vraie, sonie) ; expected = durée attendue (s) */
export function check(ch: Chans, sr: number, expected: number) {
  const i = inspect(ch, sr), l = loudness(ch, sr); return { ...i, expected, durOk: Math.abs(i.dur - expected) < 1 / sr * 4 + .001, truePeak: truePeakDb(ch), lufs: l.integrated, lra: l.lra };
}

/* ---------- ZIP (rangement simple, sans compression) ---------- */
const crcT = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = (d: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: Uint8Array[] = [], cen: Uint8Array[] = []; let off = 0; const te = new TextEncoder(), now = new Date();
  const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff, dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const f of files) {
    const nm = te.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + f.data.length;
    if (off > 0xffffffff) throw new Error('mu.err.zipBig');
  }
  const cs = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)] as BlobPart[], { type: 'application/zip' });
}
/** registre des droits d'un projet : d'où vient chaque son, et ce qu'on peut redistribuer */
export function rightsOf(a: Asset): { origin: string; licence: string; share: boolean } {
  if (a.id.startsWith('gen:')) return { origin: 'DedCut', licence: 'original', share: true };
  if (a.origin === 'record' || a.origin === 'render') return { origin: a.origin, licence: 'user', share: true };
  if (a.origin === 'cc0') return { origin: a.origin, licence: 'CC0 1.0', share: true };
  return { origin: a.origin || 'import', licence: a.licence || 'unknown', share: false };
}
/** archive : projet, sons utilisés, registre des droits, état des extensions */
export async function archive(p: Project, store: Store, extState: unknown): Promise<{ blob: Blob; notShared: Asset[] }> {
  const files: { name: string; data: Uint8Array }[] = [], q = deepClone(p), te = new TextEncoder(), used = usedAssets(p), notShared: Asset[] = [], reg: unknown[] = [];
  for (const id of used) {
    const a = q.assets[id]; if (!a) continue; const r = rightsOf(a); reg.push({ id, name: a.name, ...r, path: a.path });
    if (!r.share) notShared.push(a); if (id.startsWith('gen:')) continue;
    const b = store.get(id); if (!b) continue; const nm = 'Sons/' + safeName(a.name).replace(/\.[^.]+$/, '') + ' ' + id.replace(/[^a-z0-9]/gi, '').slice(-8) + '.wav';
    files.push({ name: nm, data: new Uint8Array(await encodeWav(chOf(b), b.sampleRate, 24, false).arrayBuffer()) }); a.rel = nm.replace('/', '\\'); a.path = null;
  }
  files.unshift({ name: safeName(p.name) + '.dcmus', data: te.encode(serialize(q)) });
  files.push({ name: 'DROITS.json', data: te.encode(JSON.stringify({ project: p.name, at: new Date().toISOString(), sounds: reg, extensions: extState, nativePlugins: [] }, null, 1)) });
  return { blob: zip(files), notShared };
}
/** envoie un son terminé dans les médias de DedCut (interface existante du Montage, sans le modifier) */
export async function sendToLibrary(blob: Blob, name: string): Promise<boolean> {
  const W = window as unknown as { dedcutFS?: { saveMedia(b: Blob, n: string): Promise<FileInfo> }; addPaths?: (l: unknown[]) => unknown; addFiles?: (l: File[]) => unknown };
  if (W.dedcutFS && W.addPaths) { const f = await W.dedcutFS.saveMedia(blob, name); await W.addPaths([f]); return true; }
  if (W.addFiles) { await W.addFiles([new File([blob], name, { type: blob.type })]); return true; }
  return false;
}
export { stemOf, dirOf, baseOf };

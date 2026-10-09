// DedCut Musique — MIDI : appareils branchés (Web MIDI, sans accès « sysex »), apprentissage des contrôleurs,
// sortie vers un appareil extérieur, lecture et écriture des fichiers MIDI standard (.mid, formats 0 et 1).
import type { MidiData, Note, Project, SigPt, TempoPt } from './model';
import { b2s, nid } from './model';

export interface MidiDev { id: string; name: string; maker: string; state: string }
export type MidiMsg = { kind: 'on' | 'off'; ch: number; p: number; v: number } | { kind: 'cc'; ch: number; num: number; val: number } | { kind: 'pb'; ch: number; v: number } | { kind: 'pc'; ch: number; prog: number } | { kind: 'at'; ch: number; v: number };
export function parseMsg(d: Uint8Array): MidiMsg | null {
  const st = d[0] & 0xf0, ch = d[0] & 0x0f;
  if (st === 0x90 && d[2] > 0) return { kind: 'on', ch, p: d[1], v: d[2] };
  if (st === 0x80 || (st === 0x90 && d[2] === 0)) return { kind: 'off', ch, p: d[1], v: d[2] };
  if (st === 0xb0) return { kind: 'cc', ch, num: d[1], val: d[2] };
  if (st === 0xe0) return { kind: 'pb', ch, v: ((d[2] << 7 | d[1]) - 8192) / 8192 };
  if (st === 0xc0) return { kind: 'pc', ch, prog: d[1] };
  if (st === 0xd0) return { kind: 'at', ch, v: d[1] };
  return null;
}
export class Midi {
  access: MIDIAccess | null = null; error = ''; onMsg: ((m: MidiMsg, dev: string) => void) | null = null; onChange: (() => void) | null = null;
  learn: ((m: MidiMsg) => void) | null = null;
  async start() {
    if (this.access) return true;
    if (!navigator.requestMIDIAccess) { this.error = 'unsupported'; return false; }
    try { this.access = await navigator.requestMIDIAccess({ sysex: false }); } catch (e) { this.error = String(e); return false; }
    const hook = () => { for (const i of this.access!.inputs.values()) i.onmidimessage = e => { const d = e.data; if (!d) return; const m = parseMsg(d); if (!m) return; if (this.learn && m.kind === 'cc') { const f = this.learn; this.learn = null; f(m); return; } this.onMsg?.(m, i.id); }; };
    hook(); this.access.onstatechange = () => { hook(); this.onChange?.(); };
    return true;
  }
  inputs(): MidiDev[] { return this.access ? [...this.access.inputs.values()].map(i => ({ id: i.id, name: i.name || i.id, maker: i.manufacturer || '', state: i.state })) : []; }
  outputs(): MidiDev[] { return this.access ? [...this.access.outputs.values()].map(o => ({ id: o.id, name: o.name || o.id, maker: o.manufacturer || '', state: o.state })) : []; }
  out(id: string) { return this.access?.outputs.get(id) || null; }
  /** envoie vers un appareil extérieur ; t = instant de l'horloge audio, ctx = contexte pour la conversion */
  send(id: string, data: number[], t?: number, ctx?: AudioContext) {
    const o = this.out(id); if (!o) return; let ts: number | undefined;
    if (t != null && ctx) { const s = ctx.getOutputTimestamp(); ts = (s.performanceTime ?? performance.now()) + (t - (s.contextTime ?? ctx.currentTime)) * 1000; }
    try { o.send(data, ts); } catch { /* appareil retiré */ }
  }
  /** notes bloquées : « tout couper » sur les 16 canaux de chaque sortie */
  panic() { for (const o of this.outputs()) for (let ch = 0; ch < 16; ch++) { this.send(o.id, [0xb0 | ch, 123, 0]); this.send(o.id, [0xb0 | ch, 120, 0]); this.send(o.id, [0xb0 | ch, 64, 0]); } }
}
/** liaison d'un contrôleur à un réglage (« ch:cc » → paramètre) */
export interface MidiMap { key: string; target: string; min: number; max: number }
const MAPKEY = 'dedcut-mus-midimap';
export function loadMaps(): MidiMap[] { try { const a = JSON.parse(localStorage.getItem(MAPKEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
export function saveMaps(m: MidiMap[]) { try { localStorage.setItem(MAPKEY, JSON.stringify(m)); } catch { /* rien */ } }

/* ---------- fichiers MIDI standard ---------- */
const vlq = (n: number) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255], u16 = (n: number) => [(n >>> 8) & 255, n & 255];
const chunk = (id: string, data: number[]) => [...[...id].map(c => c.charCodeAt(0)), ...u32(data.length), ...data];
export interface SmfTrack { name: string; ch: number; program: number; notes: Note[]; cc: Record<string, { t: number; v: number }[]> }
/** écrit un fichier MIDI format 1 (480 divisions par noire) : piste de tempo / métrique, puis une piste par instrument */
export function writeSmf(p: Project, tracks: SmfTrack[]): Uint8Array {
  const PPQ = 480, tick = (b: number) => Math.max(0, Math.round(b * PPQ));
  const nm = [...new TextEncoder().encode(p.name.slice(0, 100))], meta: [number, number[]][] = [[0, [0xff, 0x03, ...vlq(nm.length), ...nm]]];
  for (const tp of p.tempo) { const us = Math.round(60e6 / tp.bpm); meta.push([tick(tp.t), [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255]]); }
  let barT = 0; const S = p.sigs.length ? p.sigs : [{ bar: 0, num: p.num, den: p.den }];
  S.forEach((s, i) => { meta.push([tick(barT), [0xff, 0x58, 4, s.num, Math.round(Math.log2(s.den)), 24, 8]]); const nx = S[i + 1]; if (nx) barT += (nx.bar - s.bar) * s.num * 4 / s.den; });
  const sharps = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5][p.key % 12]; meta.push([0, [0xff, 0x59, 2, sharps & 255, p.scale === 'minor' ? 1 : 0]]);
  const enc = (ev: [number, number[]][]) => { ev.sort((a, b) => a[0] - b[0]); const out: number[] = []; let last = 0; for (const [t, d] of ev) { out.push(...vlq(t - last), ...d); last = t; } out.push(0, 0xff, 0x2f, 0); return out; };
  const chunks = [chunk('MTrk', enc(meta))];
  for (const tr of tracks) {
    const ch = tr.ch & 15, ev: [number, number[]][] = [[0, [0xff, 0x03, ...vlq(new TextEncoder().encode(tr.name).length), ...new TextEncoder().encode(tr.name)]], [0, [0xc0 | ch, tr.program & 127]]];
    for (const n of tr.notes) { if (n.mute) continue; ev.push([tick(n.t), [0x90 | ch, n.p & 127, Math.max(1, Math.min(127, n.v))]]); ev.push([tick(n.t + n.d) - 0, [0x80 | ch, n.p & 127, 64]]); }
    for (const [k, pts] of Object.entries(tr.cc)) for (const pt of pts) { if (k === 'pb') { const v = Math.max(0, Math.min(16383, Math.round(pt.v * 16383))); ev.push([tick(pt.t), [0xe0 | ch, v & 127, v >> 7]]); } else ev.push([tick(pt.t), [0xb0 | ch, +k & 127, Math.round(pt.v * 127)]]); }
    // à instant égal : fin de note avant début de note
    ev.sort((a, b) => a[0] - b[0] || ((a[1][0] & 0xf0) === 0x80 ? -1 : 0) - ((b[1][0] & 0xf0) === 0x80 ? -1 : 0));
    chunks.push(chunk('MTrk', enc(ev)));
  }
  const head = chunk('MThd', [...u16(1), ...u16(chunks.length), ...u16(PPQ)]);
  return new Uint8Array([...head, ...chunks.flat()]);
}
/** lit un fichier MIDI : tempo, métrique, pistes (notes, contrôleurs, pitch bend, programme) ; positions en temps (noires) */
export function readSmf(buf: ArrayBuffer): { tempo: TempoPt[]; sigs: SigPt[]; tracks: SmfTrack[]; name: string } {
  const d = new DataView(buf); let o = 0; const str = (n: number) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(o + i)); return s; };
  if (str(4) !== 'MThd') throw new Error('MThd'); const hl = d.getUint32(4); const ntr = d.getUint16(10), div = d.getUint16(12); if (div & 0x8000) throw new Error('smpte'); o = 8 + hl;
  const tempo: TempoPt[] = [], sigs: SigPt[] = [], tracks: SmfTrack[] = []; let name = '';
  const sigRaw: { t: number; num: number; den: number }[] = [];
  for (let k = 0; k < ntr && o < d.byteLength - 8; k++) {
    const id = str(4), len = d.getUint32(o + 4); o += 8; const end = Math.min(d.byteLength, o + len); if (id !== 'MTrk') { o = end; continue; }
    let t = 0, run = 0; const tr: SmfTrack = { name: '', ch: 0, program: 0, notes: [], cc: {} }, open = new Map<number, { t: number; v: number }[]>();
    const rd = () => { let v = 0, b = 0; do { b = d.getUint8(o++); v = (v << 7) | (b & 0x7f); } while (b & 0x80 && o < end); return v; };
    while (o < end) {
      t += rd(); let st = d.getUint8(o); if (st & 0x80) { o++; if (st < 0xf0) run = st; } else st = run; const b = t / div;
      if (st === 0xff) { const ty = d.getUint8(o++), l = rd(), at = o; if (ty === 0x51 && l === 3) tempo.push({ t: b, bpm: Math.round(60e6 / ((d.getUint8(at) << 16) | (d.getUint8(at + 1) << 8) | d.getUint8(at + 2)) * 1000) / 1000, ramp: false }); else if (ty === 0x58) sigRaw.push({ t: b, num: d.getUint8(at), den: 1 << d.getUint8(at + 1) }); else if (ty === 0x03) { const s = new TextDecoder().decode(new Uint8Array(buf, at, l)); if (k === 0 && !name) name = s; tr.name = s; } o = at + l; continue; }
      if (st === 0xf0 || st === 0xf7) { const l = rd(); o += l; continue; }
      const ty = st & 0xf0, ch = st & 15, a = d.getUint8(o++), c2 = ty === 0xc0 || ty === 0xd0 ? 0 : d.getUint8(o++); tr.ch = ch;
      if (ty === 0x90 && c2 > 0) { const l = open.get(a) || []; l.push({ t: b, v: c2 }); open.set(a, l); }
      else if (ty === 0x80 || (ty === 0x90 && c2 === 0)) { const l = open.get(a); const s = l?.shift(); if (s) tr.notes.push({ id: 0, p: a, t: s.t, d: Math.max(1 / 64, b - s.t), v: s.v }); }
      else if (ty === 0xb0) (tr.cc[String(a)] ||= []).push({ t: b, v: c2 / 127 });
      else if (ty === 0xe0) (tr.cc.pb ||= []).push({ t: b, v: ((c2 << 7) | a) / 16383 });
      else if (ty === 0xc0) tr.program = a;
    }
    for (const [pp, l] of open) for (const s of l) tr.notes.push({ id: 0, p: pp, t: s.t, d: Math.max(1 / 4, t / div - s.t), v: s.v }); // notes jamais relâchées
    if (tr.notes.length || Object.keys(tr.cc).length) tracks.push(tr); o = end;
  }
  // métrique : position en temps → numéro de mesure
  let bar = 0, lastT = 0, cur = { num: 4, den: 4 };
  for (const s of sigRaw.sort((a, b) => a.t - b.t)) { bar += Math.round((s.t - lastT) / (cur.num * 4 / cur.den)); if (sigs.length && sigs[sigs.length - 1].bar === bar) sigs.pop(); sigs.push({ bar, num: s.num, den: s.den }); lastT = s.t; cur = s; }
  if (!tempo.length) tempo.push({ t: 0, bpm: 120, ramp: false }); if (tempo[0].t > 0) tempo.unshift({ t: 0, bpm: tempo[0].bpm, ramp: false });
  if (!sigs.length || sigs[0].bar > 0) sigs.unshift({ bar: 0, num: 4, den: 4 });
  return { tempo, sigs, tracks, name };
}
export function smfToMidi(p: Project, tr: SmfTrack): MidiData { return { id: nid(p), notes: tr.notes.map(n => ({ ...n, id: nid(p) })), cc: tr.cc, orig: null, program: tr.program, bank: 0, ch: tr.ch }; }
export { b2s };

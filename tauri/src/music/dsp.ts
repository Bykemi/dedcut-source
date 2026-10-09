// DedCut Musique — traitement du son hors temps réel : formats (WAV, AIFF, FLAC), normaliser, inverser, composante continue,
// silences, attaques, tempo, tonalité, accords, étirement (WSOLA), hauteur, transcription (YIN), sonie (LUFS) et crête vraie.
// Écrit pour DedCut : formats documentés, algorithmes publiés (WSOLA, YIN, ITU-R BS.1770, profils de Krumhansl).

export type Chans = Float32Array[];
export const bufChans = (b: AudioBuffer): Chans => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
export function makeBuffer(ctx: BaseAudioContext, ch: Chans, sr: number): AudioBuffer {
  const b = ctx.createBuffer(Math.max(1, ch.length), Math.max(1, ch[0]?.length || 1), sr);
  ch.forEach((d, i) => b.copyToChannel(d as Float32Array<ArrayBuffer>, i)); return b;
}

/* ---------- WAV ---------- */
/** WAV PCM 16 / 24 bits ou flottant 32 bits ; en 16 bits, tramage TPDF (seulement quand on réduit la profondeur) */
export function encodeWav(ch: Chans, sr: number, bits: 16 | 24 | 32, dither = true): Blob {
  const n = ch[0]?.length || 0, nc = ch.length, bps = bits / 8, data = n * nc * bps, buf = new ArrayBuffer(44 + data), v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + data, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, bits === 32 ? 3 : 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nc * bps, true);
  v.setUint16(32, nc * bps, true); v.setUint16(34, bits, true); str(36, 'data'); v.setUint32(40, data, true);
  let o = 44; const lsb16 = 1 / 32768;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    let s = ch[c][i];
    if (bits === 32) { v.setFloat32(o, s, true); o += 4; continue; }
    if (bits === 16 && dither) s += (Math.random() - Math.random()) * lsb16;
    s = Math.max(-1, Math.min(1, s));
    if (bits === 16) { v.setInt16(o, Math.round(s < 0 ? s * 32768 : s * 32767), true); o += 2; }
    else { const x = Math.round(s < 0 ? s * 8388608 : s * 8388607); v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255); o += 3; }
  }
  return new Blob([buf], { type: 'audio/wav' });
}
/** lit un WAV (PCM 8/16/24/32, flottant 32/64) ; sert aussi à réparer un enregistrement interrompu (taille absente) */
export function decodeWav(ab: ArrayBuffer): { ch: Chans; sr: number } | null {
  const v = new DataView(ab), tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (ab.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let o = 12, fmt = 1, nc = 2, sr = 44100, bits = 16, dataOff = -1, dataLen = 0;
  while (o + 8 <= ab.byteLength) {
    const id = tag(o), len = v.getUint32(o + 4, true);
    if (id === 'fmt ') { fmt = v.getUint16(o + 8, true); nc = v.getUint16(o + 10, true); sr = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true); if (fmt === 0xfffe && len >= 26) fmt = v.getUint16(o + 32, true); }
    if (id === 'data') { dataOff = o + 8; dataLen = len === 0 || o + 8 + len > ab.byteLength ? ab.byteLength - o - 8 : len; break; }
    o += 8 + len + (len & 1);
  }
  if (dataOff < 0 || !nc || nc > 32 || !sr) return null;
  const bps = bits / 8, n = Math.floor(dataLen / (bps * nc)), ch: Chans = Array.from({ length: nc }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const p = dataOff + (i * nc + c) * bps; let s = 0;
    if (fmt === 3) s = bits === 64 ? v.getFloat64(p, true) : v.getFloat32(p, true);
    else if (bits === 8) s = (v.getUint8(p) - 128) / 128;
    else if (bits === 16) s = v.getInt16(p, true) / 32768;
    else if (bits === 24) { const x = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16); s = x / 8388608; }
    else if (bits === 32) s = v.getInt32(p, true) / 2147483648;
    ch[c][i] = s;
  }
  return { ch, sr };
}
/** AIFF / AIFF-C non compressé (le navigateur ne sait pas les lire) */
export function decodeAiff(ab: ArrayBuffer): { ch: Chans; sr: number } | null {
  const v = new DataView(ab), tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (ab.byteLength < 54 || tag(0) !== 'FORM' || !/AIF[FC]/.test(tag(8))) return null;
  let o = 12, nc = 0, n = 0, bits = 16, sr = 44100, ssnd = -1, comp = 'NONE';
  while (o + 8 <= ab.byteLength) {
    const id = tag(o), len = v.getUint32(o + 4);
    if (id === 'COMM') {
      nc = v.getInt16(o + 8); n = v.getUint32(o + 10); bits = v.getInt16(o + 14);
      const e = v.getUint16(o + 16) & 0x7fff, hi = v.getUint32(o + 18); sr = Math.round(hi * Math.pow(2, e - 16383 - 31));
      if (tag(8) === 'AIFC' && len >= 22) comp = tag(o + 26);
    }
    if (id === 'SSND') ssnd = o + 16 + v.getUint32(o + 8);
    o += 8 + len + (len & 1);
  }
  if (ssnd < 0 || !nc || !['NONE', 'twos', 'sowt'].includes(comp)) return null;
  const le = comp === 'sowt', bps = Math.ceil(bits / 8), ch: Chans = Array.from({ length: nc }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const p = ssnd + (i * nc + c) * bps; if (p + bps > ab.byteLength) break;
    let s = 0;
    if (bps === 1) s = v.getInt8(p) / 128; else if (bps === 2) s = v.getInt16(p, le) / 32768;
    else if (bps === 3) { const x = le ? (v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) : ((v.getInt8(p) << 16) | (v.getUint8(p + 1) << 8) | v.getUint8(p + 2)); s = x / 8388608; }
    else s = v.getInt32(p, le) / 2147483648;
    ch[c][i] = s;
  }
  return { ch, sr };
}

/* ---------- FLAC (sans perte) : prédicteurs fixes + codage de Rice, écrit à la main (format libre et documenté) ---------- */
class BitW {
  buf = new Uint8Array(1 << 20); n = 0; acc = 0; bits = 0;
  private grow() { if (this.n + 16 > this.buf.length) { const b = new Uint8Array(this.buf.length * 2); b.set(this.buf); this.buf = b; } }
  put(v: number, k: number) { for (let i = k - 1; i >= 0; i--) { this.acc = (this.acc << 1) | ((v / Math.pow(2, i)) & 1); this.bits++; if (this.bits === 8) { this.grow(); this.buf[this.n++] = this.acc & 255; this.acc = 0; this.bits = 0; } } }
  unary(q: number) { for (let i = 0; i < q; i++) this.put(0, 1); this.put(1, 1); }
  align() { if (this.bits) this.put(0, 8 - this.bits); }
  bytes() { return this.buf.slice(0, this.n); }
}
const crc8t = (() => { const t = new Uint8Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 255 : (c << 1) & 255; t[i] = c; } return t; })();
const crc16t = (() => { const t = new Uint16Array(256); for (let i = 0; i < 256; i++) { let c = i << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x8005) & 0xffff : (c << 1) & 0xffff; t[i] = c; } return t; })();
export function encodeFlac(ch: Chans, sr: number, bits: 16 | 24): Blob {
  const nc = ch.length, n = ch[0]?.length || 0, BS = 4096, scale = bits === 16 ? 32767 : 8388607;
  const ints = ch.map(c => { const o = new Int32Array(c.length); for (let i = 0; i < c.length; i++) o[i] = Math.round(Math.max(-1, Math.min(1, c[i])) * scale); return o; });
  const out: Uint8Array[] = [];
  // en-tête et STREAMINFO
  const si = new BitW(); si.put(0x664c6143, 32); si.put(1, 1); si.put(0, 7); si.put(34, 24);
  si.put(BS, 16); si.put(BS, 16); si.put(0, 24); si.put(0, 24); si.put(sr, 20); si.put(nc - 1, 3); si.put(bits - 1, 5);
  si.put(Math.floor(n / 4294967296), 4); si.put(n % 4294967296, 32); for (let i = 0; i < 16; i++) si.put(0, 8); out.push(si.bytes());
  for (let f = 0, s0 = 0; s0 < n; f++, s0 += BS) {
    const len = Math.min(BS, n - s0), w = new BitW();
    w.put(0x3ffe, 14); w.put(0, 1); w.put(0, 1); w.put(7, 4); w.put(0, 4); w.put(nc - 1, 4); w.put(bits === 16 ? 4 : 6, 3); w.put(0, 1);
    // numéro de trame en UTF-8
    if (f < 0x80) w.put(f, 8); else if (f < 0x800) { w.put(0xc0 | (f >> 6), 8); w.put(0x80 | (f & 63), 8); } else if (f < 0x10000) { w.put(0xe0 | (f >> 12), 8); w.put(0x80 | ((f >> 6) & 63), 8); w.put(0x80 | (f & 63), 8); }
    else { w.put(0xf0 | (f >> 18), 8); w.put(0x80 | ((f >> 12) & 63), 8); w.put(0x80 | ((f >> 6) & 63), 8); w.put(0x80 | (f & 63), 8); }
    w.put(len - 1, 16);
    { const hb = w.bytes(); let c = 0; for (const b of hb) c = crc8t[c ^ b]; w.put(c, 8); }
    for (let c = 0; c < nc; c++) {
      const x = ints[c].subarray(s0, s0 + len);
      // meilleur prédicteur fixe (ordre 0 à 2)
      let best = 0, bestSum = Infinity;
      for (let o = 0; o <= 2 && o < len; o++) { let sum = 0; for (let i = o; i < len; i++) { const r = o === 0 ? x[i] : o === 1 ? x[i] - x[i - 1] : x[i] - 2 * x[i - 1] + x[i - 2]; sum += Math.abs(r); } if (sum < bestSum) { bestSum = sum; best = o; } }
      w.put(0, 1); w.put(8 | best, 6); w.put(0, 1);
      for (let i = 0; i < best; i++) w.put(x[i] < 0 ? x[i] + Math.pow(2, bits) : x[i], bits);
      const nr = len - best, mean = bestSum / Math.max(1, nr), k = Math.max(0, Math.min(14, Math.floor(Math.log2(Math.max(1, mean)))));
      w.put(0, 2); w.put(0, 4); w.put(k, 4);
      for (let i = best; i < len; i++) {
        const r = best === 0 ? x[i] : best === 1 ? x[i] - x[i - 1] : x[i] - 2 * x[i - 1] + x[i - 2], u = r >= 0 ? r * 2 : -r * 2 - 1;
        w.unary(Math.floor(u / Math.pow(2, k))); if (k) w.put(u % Math.pow(2, k), k);
      }
    }
    w.align(); const fb = w.bytes(); let crc = 0; for (const b of fb) crc = ((crc << 8) ^ crc16t[((crc >> 8) ^ b) & 255]) & 0xffff;
    const fr = new Uint8Array(fb.length + 2); fr.set(fb); fr[fb.length] = crc >> 8; fr[fb.length + 1] = crc & 255; out.push(fr);
  }
  return new Blob(out as BlobPart[], { type: 'audio/flac' });
}

/* ---------- opérations sur un son ---------- */
export const peak = (ch: Chans) => { let m = 0; for (const c of ch) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > m) m = a; } return m; };
export const rms = (ch: Chans) => { let s = 0, n = 0; for (const c of ch) { for (let i = 0; i < c.length; i++) s += c[i] * c[i]; n += c.length; } return Math.sqrt(s / Math.max(1, n)); };
export const reverse = (ch: Chans): Chans => ch.map(c => c.slice().reverse());
export function removeDC(ch: Chans): Chans { return ch.map(c => { let y = 0, x1 = 0; const o = new Float32Array(c.length), R = .9995; for (let i = 0; i < c.length; i++) { y = c[i] - x1 + R * y; x1 = c[i]; o[i] = y; } return o; }); }
const mono = (ch: Chans) => { if (ch.length === 1) return ch[0]; const o = new Float32Array(ch[0].length); for (const c of ch) for (let i = 0; i < c.length; i++) o[i] += c[i] / ch.length; return o; };
/** zones de silence (sous un seuil en dB pendant au moins minLen secondes) → zones sonores [début, fin] en secondes */
export function soundRegions(ch: Chans, sr: number, thrDb: number, minLen: number): [number, number][] {
  const m = mono(ch), hop = Math.floor(sr * .01), thr = Math.pow(10, thrDb / 20), out: [number, number][] = []; let start = -1, quiet = 0;
  for (let i = 0; i < m.length; i += hop) {
    let pk = 0; for (let j = i; j < Math.min(m.length, i + hop); j++) pk = Math.max(pk, Math.abs(m[j]));
    if (pk >= thr) { if (start < 0) start = i; quiet = 0; } else if (start >= 0) { quiet += hop; if (quiet >= minLen * sr) { out.push([start / sr, (i - quiet + hop) / sr]); start = -1; quiet = 0; } }
  }
  if (start >= 0) out.push([start / sr, m.length / sr]); return out;
}
/** attaques (transitoires) : flux d'énergie au-dessus d'un seuil de sensibilité 0..1 → instants en secondes */
export function transients(ch: Chans, sr: number, sens = .5): number[] {
  const env = onsetEnv(mono(ch), sr), hop = 512, out: number[] = []; if (!env.length) return out;
  const sorted = Float32Array.from(env).sort(), med = sorted[Math.floor(sorted.length * .5)], hi = sorted[Math.floor(sorted.length * .98)] || 1;
  const thr = med + (hi - med) * (1 - sens) * .9 + 1e-6; let last = -1e9;
  for (let i = 1; i < env.length - 1; i++) if (env[i] > thr && env[i] >= env[i - 1] && env[i] >= env[i + 1] && i - last > 4) { out.push(i * hop / sr); last = i; }
  return out;
}
function onsetEnv(m: Float32Array, _sr: number): Float32Array {
  const hop = 512, win = 1024, n = Math.floor((m.length - win) / hop); if (n < 4) return new Float32Array(0);
  const out = new Float32Array(n); let prev = 0;
  for (let k = 0; k < n; k++) { let e = 0; const o = k * hop; for (let i = 0; i < win; i++) { const x = m[o + i]; e += x * x; } e = Math.log(1 + 100 * e); out[k] = Math.max(0, e - prev); prev = e; }
  return out;
}
/** tempo estimé (autocorrélation des attaques), entre 70 et 180 BPM */
export function detectBpm(ch: Chans, sr: number): number {
  const env = onsetEnv(mono(ch), sr), hop = 512; if (env.length < 64) return 0;
  const lagOf = (bpm: number) => 60 / bpm * sr / hop; let best = 0, bestV = -1;
  for (let bpm = 70; bpm <= 180; bpm += .5) {
    const L = lagOf(bpm); let s = 0;
    for (let i = 0; i + 2 * L < env.length; i++) { const a = Math.floor(i + L), b = Math.floor(i + 2 * L); s += env[i] * (env[a] + .5 * env[b]); }
    if (s > bestV) { bestV = s; best = bpm; }
  }
  return Math.round(best * 2) / 2;
}
/* ---------- FFT (radix 2) ---------- */
export function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
/** profil chromatique (12 notes) du son */
export function chroma(ch: Chans, sr: number, a = 0, b = Infinity): Float32Array {
  const m = mono(ch), N = 8192, out = new Float32Array(12), s0 = Math.floor(a * sr), s1 = Math.min(m.length, Math.floor(b * sr)), win = new Float32Array(N).map((_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / N));
  for (let o = s0; o + N <= s1; o += N / 2) {
    const re = new Float32Array(N), im = new Float32Array(N); for (let i = 0; i < N; i++) re[i] = m[o + i] * win[i]; fft(re, im);
    for (let k = 2; k < N / 2; k++) { const f = k * sr / N; if (f < 55 || f > 2000) continue; const p = Math.round(12 * Math.log2(f / 440)) + 69; out[((p % 12) + 12) % 12] += Math.hypot(re[k], im[k]); }
  }
  return out;
}
const KMAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], KMIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const corr = (a: ArrayLike<number>, b: number[], r: number) => { let ma = 0, mb = 0; for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12; let s = 0, sa = 0, sb = 0; for (let i = 0; i < 12; i++) { const x = a[(i + r) % 12] - ma, y = b[i] - mb; s += x * y; sa += x * x; sb += y * y; } return s / Math.sqrt(sa * sb || 1); };
/** tonalité estimée (profils de Krumhansl) : note de base et mode, avec un indice de confiance */
export function detectKey(ch: Chans, sr: number): { key: number; minor: boolean; conf: number } {
  const c = chroma(ch, sr); let best = { key: 0, minor: false, conf: -2 };
  for (let k = 0; k < 12; k++) { const a = corr(c, KMAJ, k), b = corr(c, KMIN, k); if (a > best.conf) best = { key: k, minor: false, conf: a }; if (b > best.conf) best = { key: k, minor: true, conf: b }; }
  return best;
}
/** accords estimés par tranches (gabarits majeur / mineur) */
export function detectChords(ch: Chans, sr: number, step: number): { t: number; root: number; q: string; conf: number }[] {
  const dur = ch[0].length / sr, out: { t: number; root: number; q: string; conf: number }[] = [];
  for (let t = 0; t < dur; t += step) {
    const c = chroma(ch, sr, t, t + step); let best = { root: 0, q: 'maj', conf: -1 };
    for (let r = 0; r < 12; r++) for (const [q, iv] of [['maj', [0, 4, 7]], ['min', [0, 3, 7]]] as [string, number[]][]) {
      let s = 0, tot = 0; for (let i = 0; i < 12; i++) tot += c[i]; for (const k of iv) s += c[(r + k) % 12];
      const conf = tot ? s / tot : 0; if (conf > best.conf) best = { root: r, q, conf };
    }
    out.push({ t, ...best });
  }
  return out;
}

/* ---------- étirement temporel (WSOLA) et changement de hauteur ---------- */
/** change la durée sans changer la hauteur (ratio > 1 : plus long) */
export function stretch(ch: Chans, sr: number, ratio: number): Chans {
  if (Math.abs(ratio - 1) < 1e-4) return ch.map(c => c.slice());
  const W = Math.round(sr * .04), H = Math.round(W / 2), tol = Math.round(sr * .012), n = ch[0].length, outLen = Math.round(n * ratio);
  const win = new Float32Array(W).map((_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / W)), m = mono(ch);
  const out = ch.map(() => new Float32Array(outLen + W)), norm = new Float32Array(outLen + W);
  let prev = 0;
  for (let o = 0; o < outLen; o += H) {
    const ideal = Math.round(o / ratio); let best = ideal;
    if (o > 0) {
      // cherche la position qui continue le mieux le morceau déjà posé
      let bv = -Infinity; const ref = prev + H;
      for (let d = -tol; d <= tol; d += 2) { const p = ideal + d; if (p < 0 || p + W >= n) continue; let s = 0; for (let i = 0; i < W; i += 4) s += m[p + i] * (m[ref + i] || 0); if (s > bv) { bv = s; best = p; } }
    }
    best = Math.max(0, Math.min(n - W - 1, best));
    for (let c = 0; c < ch.length; c++) { const src = ch[c], dst = out[c]; for (let i = 0; i < W; i++) dst[o + i] += src[best + i] * win[i]; }
    for (let i = 0; i < W; i++) norm[o + i] += win[i];
    prev = best;
  }
  return out.map(c => { const r = new Float32Array(outLen); for (let i = 0; i < outLen; i++) r[i] = norm[i] > 1e-3 ? c[i] / norm[i] : c[i]; return r; });
}
/** étirement par tranches (batterie, percussions) : chaque attaque est recalée au bon endroit, le son de chaque tranche
 *  n'est pas transformé ; factor > 1 : plus long (silences entre les coups), < 1 : plus court (fin des tranches coupée en fondu) */
export function sliceStretch(ch: Chans, sr: number, factor: number, sens = .5): Chans {
  const n = ch[0].length, outLen = Math.max(1, Math.round(n * factor)), fade = Math.round(sr * .004);
  const cuts = [0, ...transients(ch, sr, sens).map(t => Math.round(t * sr)).filter(x => x > 0 && x < n), n];
  const out = ch.map(() => new Float32Array(outLen));
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1], dst = Math.round(a * factor), room = Math.max(0, Math.min(b - a, outLen - dst, Math.round((b - a) * factor) + (factor > 1 ? 0 : 0)));
    const cut = room < b - a;
    for (let c = 0; c < ch.length; c++) for (let k = 0; k < room; k++) { const g = cut && k > room - fade ? (room - k) / fade : 1; out[c][dst + k] += ch[c][a + k] * g; }
  }
  return out;
}
/** rééchantillonnage linéaire (changement de vitesse = hauteur et durée) */
export function resampleCh(ch: Chans, factor: number): Chans {
  return ch.map(c => { const n = Math.max(1, Math.floor(c.length / factor)), o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * factor, k = Math.floor(x), f = x - k; o[i] = (c[k] || 0) * (1 - f) + (c[k + 1] || 0) * f; } return o; });
}
/** hauteur en demi-tons sans changer la durée (étirement puis rééchantillonnage) */
export function pitchShift(ch: Chans, sr: number, semi: number): Chans {
  if (!semi) return ch.map(c => c.slice());
  const f = Math.pow(2, semi / 12); return resampleCh(stretch(ch, sr, f), f);
}

/* ---------- hauteur d'une voix ou d'un instrument seul (YIN) → notes MIDI ---------- */
export function yin(x: Float32Array, sr: number, fmin = 60, fmax = 1200): number {
  const W = Math.min(x.length >> 1, Math.floor(sr / fmin) * 2), tmin = Math.floor(sr / fmax), tmax = Math.min(W, Math.floor(sr / fmin)), d = new Float32Array(tmax + 1);
  for (let tau = 1; tau <= tmax; tau++) { let s = 0; for (let i = 0; i < W; i++) { const v = x[i] - x[i + tau]; s += v * v; } d[tau] = s; }
  let run = 0; for (let tau = 1; tau <= tmax; tau++) { run += d[tau]; d[tau] = d[tau] * tau / (run || 1); }
  for (let tau = tmin; tau < tmax; tau++) if (d[tau] < .12) { while (tau + 1 < tmax && d[tau + 1] < d[tau]) tau++; return sr / tau; }
  return 0;
}
export function transcribe(ch: Chans, sr: number): { p: number; t: number; d: number; v: number }[] {
  const m = mono(ch), hop = Math.floor(sr * .01), W = 2048, out: { p: number; t: number; d: number; v: number }[] = [];
  let cur: { p: number; t: number; d: number; v: number } | null = null;
  for (let i = 0; i + W * 2 < m.length; i += hop) {
    const seg = m.subarray(i, i + W * 2); let e = 0; for (let j = 0; j < W; j++) e += seg[j] * seg[j]; e = Math.sqrt(e / W);
    const f = e > .01 ? yin(seg, sr) : 0, p = f ? Math.round(69 + 12 * Math.log2(f / 440)) : 0, t = i / sr;
    if (cur && (p !== cur.p)) { cur.d = t - cur.t; if (cur.d > .06) out.push(cur); cur = null; }
    if (p && !cur) cur = { p, t, d: 0, v: Math.min(127, Math.round(40 + e * 400)) };
  }
  if (cur) { cur.d = m.length / sr - cur.t; if (cur.d > .06) out.push(cur); }
  return out;
}

/* ---------- sonie (LUFS, ITU-R BS.1770) et crête vraie (suréchantillonnage x4) ---------- */
function biquad(x: Float32Array, b0: number, b1: number, b2: number, a1: number, a2: number) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
function kWeight(x: Float32Array, sr: number) {
  // filtres de la norme, recalculés pour la fréquence d'échantillonnage
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = .7071752369554196, K = Math.tan(Math.PI * f0 / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, .4996667741545416);
  let a0 = 1 + K / Q + K * K; const s1 = biquad(x, (Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
  f0 = 38.13547087602444; Q = .5003270373238773; K = Math.tan(Math.PI * f0 / sr); a0 = 1 + K / Q + K * K;
  return biquad(s1, 1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
}
export function loudness(ch: Chans, sr: number): { integrated: number; shortMax: number; lra: number; truePeak: number } {
  const k = ch.slice(0, 2).map(c => kWeight(c, sr)), n = k[0].length, blk = Math.floor(sr * .4), hop = Math.floor(sr * .1), ms: number[] = [];
  for (let o = 0; o + blk <= n; o += hop) { let s = 0; for (const c of k) for (let i = o; i < o + blk; i++) s += c[i] * c[i]; ms.push(s / blk); }
  const L = (z: number) => -0.691 + 10 * Math.log10(z || 1e-12);
  const abs = ms.filter(z => L(z) > -70), rel = abs.length ? L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10 : -70, gated = abs.filter(z => L(z) > rel);
  const integrated = gated.length ? L(gated.reduce((a, b) => a + b, 0) / gated.length) : -70;
  // sonie à court terme (3 s) et plage de sonie
  const st: number[] = []; const sb = Math.floor(sr * 3);
  for (let o = 0; o + sb <= n; o += Math.floor(sr)) { let s = 0; for (const c of k) for (let i = o; i < o + sb; i++) s += c[i] * c[i]; st.push(L(s / sb)); }
  const stg = st.filter(v => v > -70).sort((a, b) => a - b), lra = stg.length > 2 ? stg[Math.floor(stg.length * .95)] - stg[Math.floor(stg.length * .1)] : 0;
  return { integrated, shortMax: st.length ? Math.max(...st) : integrated, lra, truePeak: truePeakDb(ch) };
}
export function truePeakDb(ch: Chans): number {
  // interpolation x4 par un filtre sinc fenêtré (12 coefficients par phase)
  const taps = 12, ph = 4, h: number[][] = [];
  for (let p = 0; p < ph; p++) { const row: number[] = []; for (let t = -taps / 2; t < taps / 2; t++) { const x = t - p / ph; const s = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); row.push(s * (.54 + .46 * Math.cos(Math.PI * x / (taps / 2)))); } h.push(row); }
  let m = 0;
  for (const c of ch) for (let i = taps; i < c.length - taps; i++) {
    const a = Math.abs(c[i]); if (a > m) m = a; if (a < m * .5) continue;
    for (let p = 1; p < ph; p++) { let s = 0; const row = h[p]; for (let t = 0; t < taps; t++) s += row[t] * c[i - taps / 2 + t + 1]; s = Math.abs(s); if (s > m) m = s; }
  }
  return 20 * Math.log10(m || 1e-9);
}
/** corrélation de phase stéréo (+1 : mono, 0 : large, -1 : opposition de phase) */
export function correlation(ch: Chans): number {
  if (ch.length < 2) return 1; const [l, r] = ch; let s = 0, a = 0, b = 0;
  for (let i = 0; i < l.length; i++) { s += l[i] * r[i]; a += l[i] * l[i]; b += r[i] * r[i]; }
  return a && b ? s / Math.sqrt(a * b) : 1;
}
/** contrôle d'un fichier rendu : durée, canaux, écrêtage */
export function inspect(ch: Chans, sr: number) { let clip = 0; for (const c of ch) for (let i = 0; i < c.length; i++) if (Math.abs(c[i]) >= .9999) clip++; return { dur: (ch[0]?.length || 0) / sr, ch: ch.length, clip, peakDb: 20 * Math.log10(peak(ch) || 1e-9) }; }

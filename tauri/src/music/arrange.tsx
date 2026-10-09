// DedCut Musique — arrangement : pistes (audio, instrument, batterie, bus), clips, règle des mesures, boucle et punch,
// repères et sections, pistes d'accords, lignes d'automation. Dessin sur canvas, édition à la souris et au clavier.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast, assetLabel } from './state';
import type { AutoLane, Clip, Project, Track } from './model';
import { barOf, barStart, b2s, chordName, clamp, clipEnd, clipLen, midiOf, newTrack, nid, trackOf } from './model';
import { PARAM_RANGE, laneValue } from './engine';
import { FX_DEFS } from './fx';
import { duplicateClip, findClip, snapTo, songEnd, splitClip, trimEnd, trimStart } from './ops';
import { Ico } from './icons';
import { startDrag, useDrop } from './pdrag';

export const HEAD_W = 230, RULER_H = 44, LANE_H = 52;
type Row = { k: 'track'; t: Track; y: number; h: number } | { k: 'lane'; t: Track | null; l: AutoLane; y: number; h: number } | { k: 'master'; y: number; h: number };
export function layout(p: Project): { rows: Row[]; h: number } {
  const rows: Row[] = []; let y = 0;
  for (const tr of p.tracks) { rows.push({ k: 'track', t: tr, y, h: tr.h }); y += tr.h; for (const l of tr.auto) if (l.show) { rows.push({ k: 'lane', t: tr, l, y, h: LANE_H }); y += LANE_H; } }
  if ((p.master.auto || []).some(l => l.show)) { rows.push({ k: 'master', y, h: 30 }); y += 30; for (const l of p.master.auto || []) if (l.show) { rows.push({ k: 'lane', t: null, l, y, h: LANE_H }); y += LANE_H; } }
  return { rows, h: y };
}
/** plage d'un réglage automatisable : [min, max, défaut, logarithmique] */
export function paramRange(tr: Track | null, param: string): [number, number, number, boolean] {
  if (param.startsWith('fx:')) { const [, id, k] = param.split(':'); const f = (tr ? tr.fx : mu.p.master.fx).find(x => x.id === +id); const d = f && FX_DEFS[f.type]?.params.find(q => q.k === k); if (d) return [d.min, d.max, d.def, !!d.log]; return [0, 1, 0, false]; }
  if (param.startsWith('send:')) return [-60, 12, -12, false];
  if (param === 'inst:vol') return [-60, 12, 0, false]; if (param === 'inst:cut') return [30, 18000, 2400, true];
  const r = PARAM_RANGE[param] || [0, 1, 0]; return [r[0], r[1], r[2], false];
}
export function paramName(tr: Track | null, param: string): string {
  if (param.startsWith('fx:')) { const [, id, k] = param.split(':'); const f = (tr ? tr.fx : mu.p.master.fx).find(x => x.id === +id); return (f ? t('mu.fx.' + f.type) : '?') + ' · ' + t('mu.fp.' + k); }
  if (param.startsWith('send:')) { const b = trackOf(mu.p, +param.slice(5)); return t('mu.mix.send') + ' → ' + (b?.name || '?'); }
  return t('mu.par.' + param.replace(':', '_'));
}
const v2y = (v: number, r: [number, number, number, boolean], h: number) => { const x = r[3] ? Math.log(v / r[0]) / Math.log(r[1] / r[0]) : (v - r[0]) / (r[1] - r[0]); return h - 6 - clamp(x, 0, 1) * (h - 12); };
const y2v = (y: number, r: [number, number, number, boolean], h: number) => { const x = clamp((h - 6 - y) / (h - 12), 0, 1); return r[3] ? r[0] * Math.pow(r[1] / r[0], x) : r[0] + x * (r[1] - r[0]); };

/* ---------- formes d'onde (aperçu) ---------- */
const peaksCache = new Map<string, Float32Array>();
function peaks(id: string): Float32Array | null {
  const c = peaksCache.get(id); if (c) return c; const b = mu.store.get(id); if (!b) return null;
  const n = Math.ceil(b.length / 256), o = new Float32Array(n * 2), chs = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
  for (let i = 0; i < n; i++) { let lo = 0, hi = 0; for (const d of chs) for (let k = i * 256, e = Math.min(d.length, k + 256); k < e; k++) { const v = d[k]; if (v < lo) lo = v; if (v > hi) hi = v; } o[i * 2] = lo; o[i * 2 + 1] = hi; }
  peaksCache.set(id, o); return o;
}
export const clipColor = (tr: Track, c: Clip) => c.color || tr.color;

/* ---------- dessin ---------- */
function drawGrid(g: CanvasRenderingContext2D, p: Project, W: number, H: number, sx: number, z: number) {
  const b0 = Math.max(0, sx), b1 = sx + W / z; let bar = barOf(p, b0).bar;
  for (let guard = 0; guard < 2000; guard++, bar++) {
    const bs = barStart(p, bar); if (bs > b1) break; const info = barOf(p, bs + 1e-6), blen = info.num * 4 / info.den, x = (bs - sx) * z;
    g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(Math.round(x), 0, 1, H);
    const beat = 4 / info.den; if (z * beat > 14) for (let k = 1; k < info.num; k++) { const xb = (bs + k * beat - sx) * z; g.fillStyle = 'rgba(255,255,255,.045)'; g.fillRect(Math.round(xb), 0, 1, H); }
    if (z * beat > 70) for (let s = mu.view.grid; s < blen - 1e-9; s += mu.view.grid) { if (Math.abs(s / beat - Math.round(s / beat)) < 1e-6) continue; const xs = (bs + s - sx) * z; g.fillStyle = 'rgba(255,255,255,.022)'; g.fillRect(Math.round(xs), 0, 1, H); }
  }
}
function drawClip(g: CanvasRenderingContext2D, p: Project, tr: Track, c: Clip, x: number, y: number, w: number, h: number, sel: boolean, mutedTrack: boolean) {
  const col = clipColor(tr, c), muted = c.mute || mutedTrack;
  g.save(); g.beginPath(); g.roundRect(x + .5, y + 2.5, Math.max(2, w - 1), h - 5, 5); g.clip();
  g.fillStyle = col + (muted ? '22' : '40'); g.fillRect(x, y, w, h);
  g.fillStyle = col + (muted ? '55' : 'cc'); g.fillRect(x, y + 2, w, 14);
  g.fillStyle = '#0b0a12'; g.font = '600 10.5px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'middle';
  const lnk = c.kind === 'midi' && p.tracks.reduce((a, x2) => a + x2.clips.filter(k => k.kind === 'midi' && k.data === c.data).length, 0) > 1;
  g.fillText((lnk ? '∞ ' : '') + (c.kind === 'audio' && c.take ? '◆ ' : '') + c.name, x + 5, y + 9.5);
  const iy = y + 17, ih = h - 22;
  if (c.kind === 'audio') {
    const pk = peaks(c.asset), a = mu.p.assets[c.asset];
    if (a?.missing) { g.fillStyle = '#f87171'; g.fillText(t('mu.f.missingShort'), x + 6, iy + ih / 2); }
    else if (pk) {
      const sr = mu.store.get(c.asset)!.sampleRate, L = b2s(p, clipEnd(p, c)) - b2s(p, c.t), mid = iy + ih / 2, G = Math.pow(10, c.gain / 20);
      g.fillStyle = muted ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.75)';
      for (let px = 0; px < w; px++) {
        const fr = px / w, sec = c.rev ? c.off + c.dur * (1 - fr) : c.off + c.dur * fr, i = Math.floor(sec * sr / 256); if (i < 0 || i * 2 >= pk.length) continue;
        const lo = pk[i * 2] * G, hi = pk[i * 2 + 1] * G; g.fillRect(x + px, mid - Math.min(1, hi) * ih / 2, 1, Math.max(1, (Math.min(1, hi) - Math.max(-1, lo)) * ih / 2));
      }
      // fondus
      const fi = c.fin.len / L * w, fo = c.fout.len / L * w; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
      if (fi > 2) { g.beginPath(); g.moveTo(x, y + h - 3); g.lineTo(x + fi, y + 17); g.stroke(); }
      if (fo > 2) { g.beginPath(); g.moveTo(x + w - fo, y + 17); g.lineTo(x + w, y + h - 3); g.stroke(); }
      if (c.warp) { g.fillStyle = '#fbbf24'; g.fillText('♩', x + w - 14, y + 9.5); }
    }
  } else if (c.kind === 'midi') {
    const md = midiOf(p, c.data); if (md && md.notes.length) {
      let lo = 127, hi = 0; for (const n of md.notes) { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); } const span = Math.max(12, hi - lo + 1), nh = Math.max(1.5, ih / span);
      const per = c.loop ? (c.loopLen || c.len) : Infinity, off = c.off || 0, z = w / c.len;
      g.fillStyle = muted ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.85)';
      for (let r = 0; r < (per === Infinity ? 1 : Math.ceil((c.len + off) / per)); r++) for (const n of md.notes) {
        const at = n.t - off + (per === Infinity ? 0 : r * per); if (at + n.d < 0 || at >= c.len) continue;
        g.fillRect(x + Math.max(0, at) * z, iy + ih - (n.p - lo + 1) * (ih / span), Math.max(1, Math.min(n.d, c.len - at) * z - 1), nh);
      }
    }
  } else {
    const pat = tr.inst?.patterns.find(q => q.id === c.pat); if (pat) {
      const sl = 1 / pat.div, z = w / c.len, rows = pat.rows.filter(r => r.cells.some(x2 => x2.on)), rh = Math.max(1.5, ih / Math.max(4, rows.length));
      g.fillStyle = muted ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.85)';
      rows.forEach((row, ri) => { const L = Math.max(1, row.len || pat.steps); for (let s = 0; s * sl < c.len; s++) { const k = (s + Math.round((c.off || 0) / sl)) % L; if (row.cells[k]?.on) g.fillRect(x + s * sl * z, iy + ri * rh, Math.max(1.5, sl * z - 1), rh - .5); } });
    }
  }
  g.restore();
  if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x + 1, y + 3, Math.max(2, w - 2), h - 6, 5); g.stroke(); }
}

/* ---------- glisser à la souris ---------- */
type Drag = { kind: 'move' | 'trimL' | 'trimR' | 'fadeIn' | 'fadeOut' | 'band' | 'draw' | 'lane' | 'loop' | 'punch' | 'seek' | 'section'; x0: number; y0: number; b0: number; data?: unknown; moved?: boolean };

export function Arrange() {
  useMu(); const p = mu.p, V = mu.view;
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), ov = useRef<HTMLCanvasElement>(null), rul = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 400 }), drag = useRef<Drag | null>(null), band = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const { rows, h: contentH } = layout(p);
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth - HEAD_W, h: el.clientHeight - RULER_H })); ro.observe(el); return () => ro.disconnect(); }, []);
  V.sy = clamp(V.sy, 0, Math.max(0, contentH - size.h + 40));
  const b2x = (b: number) => (b - V.sx) * V.zoom, x2b = (x: number) => x / V.zoom + V.sx;
  const rowAt = (y: number) => rows.find(r => y + V.sy >= r.y && y + V.sy < r.y + r.h) || null;
  const snap = (b: number, ev?: { altKey: boolean }) => (!p.snap || ev?.altKey) ? Math.max(0, b) : Math.max(0, snapTo(p, b, V.grid, p.markers.map(m => m.t)));
  // la piste choisie (ou tout juste créée) reste visible : la vue défile jusqu'à elle
  const selRow = rows.find(r => r.k === 'track' && r.t.id === mu.sel.track);
  useEffect(() => { if (!selRow) return; const vis = size.h - 8; if (selRow.y < V.sy) { V.sy = selRow.y; mu.emit(); } else if (selRow.y + selRow.h > V.sy + vis) { V.sy = Math.max(0, selRow.y + selRow.h - vis); mu.emit(); } }, [mu.sel.track, rows.length]);
  // dépôt à la souris : sons, instruments et chaînes du navigateur, fichiers lâchés depuis l'Explorateur
  useDrop(cv, d => {
    if (d.data.kind === 'track' || !cv.current) return; const rc = cv.current.getBoundingClientRect(), r = rowAt(d.y - rc.top), at = snap(x2b(d.x - rc.left)); d.done = true;
    if (d.data.kind === 'files') { void mu.importAudio(d.data.paths.map(path => ({ path })), at, r?.k === 'track' && r.t.kind === 'audio' ? r.t.id : undefined); return; }
    void dropItem(d.data, at, r?.k === 'track' ? r.t : null);
  });

  /* dessin principal */
  useEffect(() => {
    const c = cv.current; if (!c) return; const dpr = devicePixelRatio || 1, W = Math.max(10, size.w), H = Math.max(10, size.h);
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    for (const r of rows) { const y = r.y - V.sy; if (y > H || y + r.h < 0) continue; g.fillStyle = r.k === 'track' ? (r.t.id === mu.sel.track ? 'rgba(167,139,250,.07)' : 'rgba(255,255,255,.015)') : 'rgba(0,0,0,.18)'; g.fillRect(0, y, W, r.h); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y + r.h - 1, W, 1); }
    drawGrid(g, p, W, H, V.sx, V.zoom);
    // sections en fond
    for (const m of p.markers) if (m.kind === 'section') { const x = b2x(m.t); g.fillStyle = m.color + '55'; g.fillRect(Math.round(x), 0, 1.5, H); }
    if (p.loop.on) { g.fillStyle = 'rgba(167,139,250,.06)'; g.fillRect(b2x(p.loop.a), 0, (p.loop.b - p.loop.a) * V.zoom, H); }
    if (mu.sel.range) { g.fillStyle = 'rgba(34,211,238,.10)'; g.fillRect(b2x(mu.sel.range.a), 0, (mu.sel.range.b - mu.sel.range.a) * V.zoom, H); }
    const anySolo = p.tracks.some(x => x.solo);
    for (const r of rows) {
      const y = r.y - V.sy; if (y > H || y + r.h < 0) continue;
      if (r.k === 'track') {
        const clips = [...r.t.clips].sort((a, b) => (a.mute ? 0 : 1) - (b.mute ? 0 : 1));
        if (r.t.frozen) { g.fillStyle = 'rgba(96,165,250,.10)'; g.fillRect(0, y, W, r.h); }
        for (const c of clips) { const x = b2x(c.t), w = clipLen(p, c) * V.zoom; if (x > W || x + w < 0) continue; drawClip(g, p, r.t, c, x, y, w, r.h, mu.sel.clips.has(c.id), r.t.mute || (anySolo && !r.t.solo)); }
      } else if (r.k === 'lane') {
        const rg = paramRange(r.t, r.l.param), def = r.t ? (mu.eng?.defOf(r.t, r.l.param) ?? rg[2]) : (r.l.param === 'vol' ? p.master.vol : rg[2]);
        g.strokeStyle = r.l.mode === 'off' ? 'rgba(255,255,255,.25)' : '#a78bfa'; g.lineWidth = 1.5; g.beginPath();
        const pts = r.l.pts; if (!pts.length) { const yy = y + v2y(def, rg, r.h); g.setLineDash([4, 4]); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); g.setLineDash([]); }
        else { g.moveTo(0, y + v2y(laneValue(r.l, x2b(0), def), rg, r.h)); for (const q of pts) g.lineTo(b2x(q.t), y + v2y(q.v, rg, r.h)); g.lineTo(W, y + v2y(laneValue(r.l, x2b(W), def), rg, r.h)); g.stroke();
          g.fillStyle = '#e9d5ff'; for (const q of pts) { const x = b2x(q.t); if (x < -4 || x > W + 4) continue; g.beginPath(); g.arc(x, y + v2y(q.v, rg, r.h), 3.2, 0, 7); g.fill(); } }
        g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '10px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'top'; g.fillText(paramName(r.t, r.l.param) + ' · ' + t('mu.auto.m_' + r.l.mode), 6, y + 4);
      } else { g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '600 11px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'middle'; g.fillText(t('mu.mix.master'), 8, y + 15); }
    }
    if (band.current) { const b = band.current; g.strokeStyle = '#22d3ee'; g.fillStyle = 'rgba(34,211,238,.08)'; g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x + .5, b.y + .5, b.w, b.h); }
  });
  /* règle : mesures, boucle, punch, repères, accords */
  useEffect(() => {
    const c = rul.current; if (!c) return; const dpr = devicePixelRatio || 1, W = Math.max(10, size.w);
    c.width = W * dpr; c.height = RULER_H * dpr; c.style.width = W + 'px'; const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#121019'; g.fillRect(0, 0, W, RULER_H);
    if (p.loop.b > p.loop.a) { g.fillStyle = p.loop.on ? 'rgba(167,139,250,.55)' : 'rgba(167,139,250,.18)'; g.fillRect(b2x(p.loop.a), 0, (p.loop.b - p.loop.a) * V.zoom, 6); }
    if (p.punch.on) { g.fillStyle = 'rgba(248,113,113,.55)'; g.fillRect(b2x(p.punch.a), 6, (p.punch.b - p.punch.a) * V.zoom, 4); }
    g.font = '10.5px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'top';
    let bar = barOf(p, Math.max(0, V.sx)).bar; const step = V.zoom * 4 < 26 ? (V.zoom * 4 < 8 ? 8 : 4) : 1;
    for (let k = 0; k < 2000; k++, bar++) { const bs = barStart(p, bar), x = b2x(bs); if (x > W) break; if (bar % step) continue; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(Math.round(x), 12, 1, 9); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(String(bar + 1), x + 3, 11); }
    // repères et sections
    for (const m of p.markers) { const x = b2x(m.t); if (x < -100 || x > W) continue; g.fillStyle = m.color; if (m.kind === 'section') { const w = Math.min(160, g.measureText(m.name).width + 10); g.beginPath(); g.roundRect(x, 23, w, 12, 3); g.fill(); g.fillStyle = '#0b0a12'; g.fillText(m.name, x + 4, 24); } else { g.beginPath(); g.moveTo(x, 23); g.lineTo(x + 7, 27); g.lineTo(x, 31); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(m.name, x + 9, 23); } }
    // accords
    for (const ch of p.chords) { const x = b2x(ch.t); if (x > W || x + ch.len * V.zoom < 0) continue; g.fillStyle = 'rgba(52,211,153,.18)'; g.fillRect(x, 35, ch.len * V.zoom - 1, 9); g.fillStyle = '#6ee7b7'; g.fillText(chordName(ch.root, ch.q), x + 3, 34.5); }
    // tempo changeant
    if (p.tempo.length > 1) for (const tp of p.tempo) { const x = b2x(tp.t); if (x < 0 || x > W) continue; g.fillStyle = '#fbbf24'; g.fillText('♩' + Math.round(tp.bpm), x + 2, 0); }
  });
  /* tête de lecture : redessinée à chaque image pendant la lecture */
  useEffect(() => {
    let raf = 0; const draw = () => {
      const c = ov.current; if (!c) return; const dpr = devicePixelRatio || 1, W = Math.max(10, size.w), H = Math.max(10, size.h) + RULER_H;
      if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; }
      const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const pos = mu.pos(), x = b2x(pos);
      // la vue suit la tête de lecture ; on ne redessine l'interface que si le défilement change vraiment
      // (au départ, avec une sortie audio lente, la position est un instant avant le début : sinon boucle sans fin → écran noir)
      if (mu.eng?.playing && mu.set.follow && !drag.current && (x > W - 40 || x < 0)) { const sx = Math.max(0, pos - 2); if (Math.abs(sx - V.sx) > 1e-6) { V.sx = sx; mu.emit(); } }
      g.fillStyle = mu.recState.on ? '#f87171' : '#fff'; g.fillRect(Math.round(x), 0, 1.5, H); g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x + 6, 0); g.lineTo(x + .75, 7); g.fill();
      if (mu.eng?.playing) raf = requestAnimationFrame(draw);
    };
    draw(); const off = mu.onPos(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    return () => { cancelAnimationFrame(raf); off(); };
  });

  /* ---------- souris sur la règle ---------- */
  const rulerDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, b = x2b(x);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sec = p.markers.find(m => { const mx = b2x(m.t); return y >= 22 && y < 36 && x >= mx - 3 && x <= mx + (m.kind === 'section' ? 120 : 40); });
    if (sec && e.button === 0) { drag.current = { kind: 'section', x0: x, y0: y, b0: sec.t, data: sec.id }; return; }
    if (y < 11) drag.current = { kind: e.shiftKey ? 'punch' : 'loop', x0: x, y0: y, b0: snap(b, e) };
    else { drag.current = { kind: 'seek', x0: x, y0: y, b0: b }; mu.seek(snap(b, e)); }
  };
  const rulerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), b = snap(x2b(e.clientX - r.left), e);
    if (d.kind === 'loop' || d.kind === 'punch') { const a = Math.min(d.b0, b), z = Math.max(d.b0, b); if (z - a >= V.grid) { const k = d.kind; p[k].a = a; p[k].b = z; p[k].on = true; d.moved = true; mu.emit(); } }
    else if (d.kind === 'seek') mu.seek(b);
    else if (d.kind === 'section') { const m = p.markers.find(q => q.id === d.data); if (m) { m.t = b; d.moved = true; mu.emit(); } }
  };
  const rulerUp = () => { const d = drag.current; drag.current = null; if (d?.moved) mu.act(d.kind === 'section' ? 'mu.h.marker' : 'mu.h.loop', () => { /* déjà appliqué */ }, true); };
  const rulerDbl = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), b = snap(x2b(e.clientX - r.left)); const y = e.clientY - r.top; if (y > 34) { mu.dialog = 'chords'; mu.dialogArg = b; mu.emit(); return; } mu.act('mu.h.marker', q => { q.markers.push({ id: nid(q), t: b, name: t('mu.mk.n', { n: String(q.markers.length + 1) }), color: '#fbbf24', kind: 'marker' }); }); };
  const rulerCtx = (e: React.MouseEvent) => { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - r.left; const m = p.markers.find(q => Math.abs(b2x(q.t) - x) < 8); if (m) { mu.dialog = 'marker'; mu.dialogArg = m.id; mu.emit(); } };

  /* ---------- souris sur les pistes ---------- */
  const hitClip = (x: number, y: number): { tr: Track; c: Clip; edge: '' | 'L' | 'R' | 'fi' | 'fo' } | null => {
    const r = rowAt(y); if (!r || r.k !== 'track') return null; const b = x2b(x);
    for (const c of [...r.t.clips].reverse()) { const e = clipEnd(p, c); if (b >= c.t && b < e) { const x0 = b2x(c.t), x1 = b2x(e), yy = y + V.sy - r.y; let edge: '' | 'L' | 'R' | 'fi' | 'fo' = ''; if (c.kind === 'audio' && yy < 16 && x - x0 < 12) edge = 'fi'; else if (c.kind === 'audio' && yy < 16 && x1 - x < 12) edge = 'fo'; else if (x - x0 < 6) edge = 'L'; else if (x1 - x < 6) edge = 'R'; return { tr: r.t, c, edge }; } }
    return null;
  };
  const lanePoint = (r: Row & { k: 'lane' }, x: number, y: number) => r.l.pts.findIndex(q => Math.abs(b2x(q.t) - x) < 6 && Math.abs(r.y - V.sy + v2y(q.v, paramRange(r.t, r.l.param), r.h) - y) < 6);
  const down = (e: React.PointerEvent) => {
    if (e.button === 2) return; const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, b = x2b(x);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); const r = rowAt(y);
    if (r?.k === 'lane') {
      const i = lanePoint(r, x, y), rg = paramRange(r.t, r.l.param);
      if (i < 0) { const v = y2v(y - (r.y - V.sy), rg, r.h); r.l.pts.push({ t: snap(b, e), v }); r.l.pts.sort((a, c) => a.t - c.t); if (r.l.mode === 'off') r.l.mode = 'read'; }
      const idx = i >= 0 ? i : r.l.pts.findIndex(q => Math.abs(q.t - snap(b, e)) < 1e-6);
      drag.current = { kind: 'lane', x0: x, y0: y, b0: b, data: { r, idx }, moved: i < 0 }; mu.sync(); mu.emit(); return;
    }
    if (r?.k === 'track') mu.sel.track = r.t.id;
    const h = hitClip(x, y), tool = e.ctrlKey && e.shiftKey ? 'split' : mu.view.tool;
    if (tool === 'erase' && h) { mu.act('mu.h.delClips', q => { const tr = trackOf(q, h.tr.id); if (tr) tr.clips = tr.clips.filter(c => c.id !== h.c.id); }, true); return; }
    if (tool === 'split' && h) { const at = snap(b, e); mu.act('mu.h.split', q => { const f = findClip(q, h.c.id); if (f) splitClip(q, f.t, f.c, at); }, true); return; }
    if (h) {
      if (!mu.sel.clips.has(h.c.id) || e.shiftKey) mu.selectClip(h.c.id, e.shiftKey); else { mu.sel.clip = h.c.id; mu.emit(); }
      if (h.tr.lock) { toast(t('mu.trk.locked')); return; }
      const kind = h.edge === 'L' ? 'trimL' : h.edge === 'R' ? 'trimR' : h.edge === 'fi' ? 'fadeIn' : h.edge === 'fo' ? 'fadeOut' : 'move';
      // Alt + glisser : copie (Ctrl en plus pour un clip MIDI lié)
      let data: unknown = { orig: [...mu.sel.clips].map(id => { const f = findClip(p, id)!; return { id, t: f.c.t, track: f.t.id, snap: JSON.stringify(f.c) }; }), copy: e.altKey && kind === 'move', linked: e.altKey && e.ctrlKey };
      drag.current = { kind, x0: x, y0: y, b0: b, data }; void data; return;
    }
    if (r?.k === 'track' && (tool === 'draw' || e.detail === 2)) {
      if (r.t.kind === 'inst') { drag.current = { kind: 'draw', x0: x, y0: y, b0: snap(b, e), data: r.t.id }; return; }
      if (r.t.kind === 'drum') { mu.newPatternClip(r.t, Math.floor(snap(b, e))); return; }
    }
    mu.selectClip(0); band.current = { x, y, w: 0, h: 0 }; drag.current = { kind: 'band', x0: x, y0: y, b0: b };
  };
  const move = (e: React.PointerEvent) => {
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, d = drag.current;
    if (!d) { const h = hitClip(x, y); (e.currentTarget as HTMLElement).style.cursor = mu.view.tool === 'split' ? 'col-resize' : mu.view.tool === 'draw' ? 'crosshair' : mu.view.tool === 'erase' ? 'not-allowed' : h ? (h.edge === 'L' || h.edge === 'R' ? 'ew-resize' : h.edge ? 'nesw-resize' : 'grab') : 'default'; return; }
    if (Math.abs(x - d.x0) + Math.abs(y - d.y0) > 3) d.moved = true; if (!d.moved) return;
    const db = (x - d.x0) / V.zoom;
    if (d.kind === 'band') { band.current = { x: Math.min(d.x0, x), y: Math.min(d.y0, y), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) }; const a = x2b(band.current.x), z = x2b(band.current.x + band.current.w); mu.sel.clips.clear(); for (const r of rows) if (r.k === 'track' && r.y - V.sy < band.current.y + band.current.h && r.y + r.h - V.sy > band.current.y) for (const c of r.t.clips) if (c.t < z && clipEnd(p, c) > a) mu.sel.clips.add(c.id); mu.sel.range = { a: snap(a), b: snap(z) }; mu.emit(); return; }
    if (d.kind === 'lane') { const { r, idx } = d.data as { r: Row & { k: 'lane' }; idx: number }; const q = r.l.pts[idx]; if (!q) return; q.t = snap(x2b(x), e); q.v = y2v(y - (r.y - V.sy), paramRange(r.t, r.l.param), r.h); r.l.pts.sort((a, c) => a.t - c.t); (d.data as { idx: number }).idx = r.l.pts.indexOf(q); mu.sync(); mu.emit(); return; }
    if (d.kind === 'draw') { band.current = { x: b2x(d.b0), y: d.y0 - 6, w: Math.max(4, snap(x2b(x), e) - d.b0) * V.zoom, h: 12 }; mu.emit(); return; }
    const o = d.data as { orig: { id: number; t: number; track: number; snap: string }[]; copy: boolean; linked: boolean };
    if (d.kind === 'move') {
      const first = o.orig[0]; if (!first) return; const nb = snap(first.t + db, e), shift = nb - first.t, r = rowAt(y), tgt = r?.k === 'track' ? r.t : null;
      for (const it of o.orig) { const f = findClip(p, it.id); if (!f) continue; f.c.t = Math.max(0, it.t + shift); if (tgt && o.orig.length === 1 && tgt.id !== f.t.id && (tgt.kind === 'audio') === (f.c.kind === 'audio') && (f.c.kind !== 'pattern' || tgt.kind === 'drum') && !tgt.lock) { f.t.clips = f.t.clips.filter(c => c.id !== f.c.id); tgt.clips.push(f.c); } }
    } else for (const it of o.orig) {
      const f = findClip(p, it.id); if (!f) continue; const c0 = JSON.parse(it.snap) as Clip; Object.assign(f.c, c0);
      if (d.kind === 'trimL') trimStart(p, f.c, snap(c0.t + db, e));
      else if (d.kind === 'trimR') trimEnd(p, f.c, snap(clipEnd(p, c0) + db, e), f.c.kind === 'audio' ? mu.store.get(f.c.asset)?.duration : undefined);
      else if (f.c.kind === 'audio') { const L = b2s(p, clipEnd(p, f.c)) - b2s(p, f.c.t), sec = (b2s(p, x2b(x)) - b2s(p, f.c.t)); if (d.kind === 'fadeIn') f.c.fin.len = clamp(sec, 0, L / 2); else f.c.fout.len = clamp(L - sec, 0, L / 2); }
    }
    mu.emit();
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; const was = band.current; band.current = null; if (!d) return;
    if (d.kind === 'band') { if (!d.moved) { mu.sel.range = null; const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(); mu.seek(snap(x2b(e.clientX - rc.left), e)); } mu.emit(); return; }
    if (d.kind === 'lane') { if (d.moved) mu.act('mu.h.autoEdit', () => { /* déjà appliqué */ }); return; }
    if (d.kind === 'draw') { const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), end = snap(x2b(e.clientX - rc.left), e), tr = trackOf(p, d.data as number); if (tr) mu.newMidiClip(tr, d.b0, Math.max(V.grid * 4 >= 1 ? 1 : V.grid, d.moved ? end - d.b0 : 4)); void was; return; }
    if (!d.moved) { if (e.detail === 2) { const f = findClip(p, mu.sel.clip); if (f) mu.view.tab = f.c.kind === 'audio' ? 'clip' : f.c.kind === 'pattern' ? 'steps' : 'piano'; } mu.emit(); return; }
    const o = d.data as { orig: { id: number; t: number; track: number; snap: string }[]; copy: boolean; linked: boolean };
    if (d.kind === 'move' && o.copy) {
      // copie : les originaux reviennent à leur place, des copies sont posées à la nouvelle
      const moved = o.orig.map(it => { const f = findClip(p, it.id)!; return { tr: f.t, c: f.c, t: f.c.t, it }; }), made: number[] = [];
      for (const m of moved) { m.c.t = m.it.t; if (m.tr.id !== m.it.track) { m.tr.clips = m.tr.clips.filter(c => c.id !== m.c.id); trackOf(p, m.it.track)?.clips.push(m.c); } }
      mu.act(o.linked ? 'mu.h.dupLinked' : 'mu.h.dupClip', q => { for (const m of moved) { const tr = trackOf(q, m.tr.id); const src = findClip(q, m.c.id); if (tr && src) made.push(duplicateClip(q, tr, src.c, m.t, o.linked).id); } }, true);
      mu.sel.clips = new Set(made); mu.emit(); return;
    }
    mu.act(d.kind === 'move' ? 'mu.h.moveClip' : d.kind.startsWith('fade') ? 'mu.h.fade' : 'mu.h.trim', () => { /* déjà appliqué pendant le geste */ }, true);
  };
  const dbl = (e: React.MouseEvent) => {
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, r = rowAt(y);
    if (r?.k === 'lane') { const i = lanePoint(r, x, y); if (i >= 0) { const l = r.l; mu.act('mu.h.autoEdit', () => { l.pts.splice(i, 1); }); } }
    // double-clic dans le vide d'une piste instrument ou batterie : un clip d'une mesure y est créé et s'ouvre
    else if (r?.k === 'track' && !hitClip(x, y) && !r.t.lock && (r.t.kind === 'inst' || r.t.kind === 'drum')) {
      const at = barStart(p, barOf(p, Math.max(0, x2b(x))).bar), bar = barOf(p, at), len = bar.num * 4 / bar.den;
      if (r.t.kind === 'inst') { if (mu.newMidiClip(r.t, at, len)) { mu.view.tab = 'piano'; mu.emit(); } }
      else { mu.newPatternClip(r.t, at); mu.view.tab = 'steps'; mu.emit(); }
    }
  };
  const wheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, b = x2b(x); V.zoom = clamp(V.zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18), 2, 600); V.sx = Math.max(0, b - x / V.zoom); }
    else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) V.sx = Math.max(0, V.sx + (e.deltaX || e.deltaY) / V.zoom);
    else V.sy = clamp(V.sy + e.deltaY, 0, Math.max(0, contentH - size.h + 40));
    mu.emit();
  };
  const ctxMenu = (e: React.MouseEvent) => { e.preventDefault(); const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), h = hitClip(e.clientX - rc.left, e.clientY - rc.top); if (h) { if (!mu.sel.clips.has(h.c.id)) mu.selectClip(h.c.id); mu.dialog = 'clipMenu'; mu.dialogArg = { x: e.clientX, y: e.clientY, b: x2b(e.clientX - rc.left) }; mu.emit(); } };
  /* glisser depuis le navigateur de sons */
  const dragOver = (e: React.DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
  const dropIn = (e: React.DragEvent) => {
    e.preventDefault(); const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, r = rowAt(y), at = snap(x2b(x));
    const files = [...e.dataTransfer.files]; if (files.length) { if (files.some(f => /\.midi?$/i.test(f.name))) toast(t('mu.f.useMidiImport')); void mu.importAudio(files.filter(f => !/\.midi?$/i.test(f.name)).map(file => ({ file })), at, r?.k === 'track' && r.t.kind === 'audio' ? r.t.id : undefined); }
  };

  const songLen = Math.max(songEnd(p), p.loop.b, 32) + 16;
  return <div className="mu-arr" ref={wrap}>
    <div className="mu-arr-top">
      <div className="mu-corner" style={{ width: HEAD_W }}>
        <button className="mu-ib" title={t('mu.trk.addAudio')} onClick={() => mu.addTrack('audio')}><Ico n="mic" s={14} /></button>
        <button className="mu-ib" title={t('mu.trk.addInst')} onClick={() => mu.addTrack('inst', 'keys')}><Ico n="piano" s={14} /></button>
        <button className="mu-ib" title={t('mu.trk.addDrum')} onClick={() => mu.addTrack('drum', 'kit-studio')}><Ico n="drum" s={14} /></button>
        <button className="mu-ib" title={t('mu.trk.addBus')} onClick={() => mu.addTrack('bus')}><Ico n="bus" s={14} /></button>
        <span className="mu-sp" />
        <button className={'mu-ib' + (p.snap ? ' on' : '')} title={t('mu.snap')} onClick={() => { p.snap = !p.snap; mu.emit(); }}><Ico n="magnet" s={14} /></button>
        <select className="mu-grid" value={mu.view.grid} title={t('mu.gridLen')} onChange={e => { mu.view.grid = +e.target.value; mu.emit(); }}>{GRIDS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select>
      </div>
      <canvas ref={rul} className="mu-ruler" onPointerDown={rulerDown} onPointerMove={rulerMove} onPointerUp={rulerUp} onDoubleClick={rulerDbl} onContextMenu={rulerCtx} aria-label={t('mu.ruler')} />
    </div>
    <div className="mu-arr-body" onWheel={wheel}>
      <div className="mu-heads" style={{ width: HEAD_W, transform: `translateY(${-V.sy}px)` }}>
        {rows.map((r, i) => r.k === 'track' ? <TrackHead key={'t' + r.t.id} tr={r.t} /> : r.k === 'lane' ? <LaneHead key={'l' + i} tr={r.t} l={r.l} /> : <div key="m" className="mu-mhead" style={{ height: r.h }}>{t('mu.mix.master')}</div>)}
        <div className="mu-addrow"><button onClick={() => mu.addTrack('audio')}><Ico n="plus" s={12} />{t('mu.trk.add')}</button></div>
      </div>
      <canvas ref={cv} className="mu-tl" data-mudrop="" tabIndex={0} aria-label={t('mu.arrange')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={dbl} onContextMenu={ctxMenu} onDragOver={dragOver} onDrop={dropIn} />
    </div>
    <canvas ref={ov} className="mu-ov" />
    <div className="mu-overview" onPointerDown={e => { const rc = e.currentTarget.getBoundingClientRect(); const go = (cx: number) => { V.sx = Math.max(0, (cx - rc.left) / rc.width * songLen - size.w / V.zoom / 2); mu.emit(); }; go(e.clientX); const mv = (ev: PointerEvent) => go(ev.clientX), u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); }; addEventListener('pointermove', mv); addEventListener('pointerup', u); }}>
      <i style={{ left: (V.sx / songLen * 100) + '%', width: Math.min(100, size.w / V.zoom / songLen * 100) + '%' }} />
    </div>
  </div>;
}
export const GRIDS: [number, string][] = [[4, '1/1'], [2, '1/2'], [1, '1/4'], [.5, '1/8'], [1 / 3, '1/8 T'], [.25, '1/16'], [1 / 6, '1/16 T'], [.125, '1/32']];

/* ---------- entête de piste ---------- */
function TrackHead({ tr }: { tr: Track }) {
  const [edit, setEdit] = useState(false), sel = mu.sel.track === tr.id;
  const tog = (k: 'mute' | 'solo' | 'arm' | 'lock' | 'mon', label: string) => () => {
    if (k === 'mon') { const on = !tr.mon; if (on && !localStorage.getItem('dedcut-mu-mon-ok')) { toast(t('mu.safe.monWarn')); try { localStorage.setItem('dedcut-mu-mon-ok', '1'); } catch { /* rien */ } } tr.mon = on; void mu.init().then(() => mu.eng?.monitor(tr, on).catch(err => toast(String(err)))); mu.emit(); return; }
    if (k === 'arm' && tr.kind === 'bus') return;
    mu.act(label, p => { const x = trackOf(p, tr.id); if (x) x[k] = !x[k]; });
  };
  const resize = (e: React.PointerEvent) => { e.stopPropagation(); const y0 = e.clientY, h0 = tr.h; const mv = (ev: PointerEvent) => { tr.h = clamp(h0 + ev.clientY - y0, 34, 220); mu.emit(); }, u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); }; addEventListener('pointermove', mv); addEventListener('pointerup', u); };
  const head = useRef<HTMLDivElement>(null);
  useDrop(head, d => {
    d.done = true;
    if (d.data.kind === 'track') { if (d.data.id !== tr.id) mu.moveTrack(d.data.id, mu.p.tracks.findIndex(x => x.id === tr.id)); return; }
    if (d.data.kind === 'files') { void mu.importAudio(d.data.paths.map(path => ({ path })), Math.floor(mu.pos()), tr.kind === 'audio' ? tr.id : undefined); return; }
    void dropItem(d.data, Math.floor(mu.pos()), tr);
  });
  return <div className={'mu-th' + (sel ? ' sel' : '') + (tr.kind === 'bus' ? ' bus' : '')} style={{ height: tr.h, ['--tc' as string]: tr.color }} onPointerDown={() => mu.selectTrack(tr.id)} ref={head} data-mudrop="">
    <span className="mu-tcol" onPointerDown={e => startDrag(e, { kind: 'track', id: tr.id }, tr.name)} title={t('mu.trk.dragOrder')}><Ico n="grip" s={12} /></span>
    <div className="mu-thmain">
      <div className="mu-throw">
        <span className="mu-tk"><Ico n={tr.kind === 'audio' ? 'mic' : tr.kind === 'drum' ? 'drum' : tr.kind === 'bus' ? 'bus' : 'piano'} s={12} /></span>
        {edit ? <input autoFocus defaultValue={tr.name} onBlur={e => { setEdit(false); const v = e.target.value.trim().slice(0, 40); if (v && v !== tr.name) mu.act('mu.h.rename', p => { const x = trackOf(p, tr.id); if (x) x.name = v; }); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEdit(false); e.stopPropagation(); }} />
          : <b onDoubleClick={() => setEdit(true)} title={tr.name}>{tr.name}</b>}
        {tr.frozen && <span className="mu-badge" title={t('mu.r.frozenTip')}><Ico n="snow" s={11} /></span>}
        <button className="mu-ib" title={t('mu.trk.menu')} onClick={e => { mu.selectTrack(tr.id); mu.dialog = 'trackMenu'; mu.dialogArg = { id: tr.id, x: e.clientX, y: e.clientY }; mu.emit(); }}><Ico n="dots" s={13} /></button>
      </div>
      <div className="mu-throw">
        <button className={'mu-tb' + (tr.mute ? ' on m' : '')} title={t('mu.trk.mute')} aria-pressed={tr.mute} onClick={tog('mute', 'mu.h.mute')}>M</button>
        <button className={'mu-tb' + (tr.solo ? ' on s' : '')} title={t('mu.trk.solo')} aria-pressed={tr.solo} onClick={tog('solo', 'mu.h.solo')}>S</button>
        {tr.kind !== 'bus' && <button className={'mu-tb' + (tr.arm ? ' on r' : '')} title={t('mu.trk.arm')} aria-pressed={tr.arm} onClick={tog('arm', 'mu.h.arm')}><Ico n="arm" s={11} /></button>}
        {tr.kind === 'audio' && <button className={'mu-tb' + (tr.mon ? ' on' : '')} title={t('mu.trk.mon')} aria-pressed={tr.mon} onClick={tog('mon', 'mu.h.mon')}><Ico n="mon" s={11} /></button>}
        <button className={'mu-tb' + (tr.lock ? ' on' : '')} title={t('mu.trk.lock')} aria-pressed={tr.lock} onClick={tog('lock', 'mu.h.lock')}><Ico n="lock" s={11} /></button>
        <input className="mu-thvol" type="range" min={-60} max={12} step={.5} value={tr.vol} title={t('mu.mix.vol') + ' ' + tr.vol.toFixed(1) + ' dB'} aria-label={t('mu.mix.vol')}
          onChange={e => { tr.vol = +e.target.value; mu.eng?.autoInput(tr.id, 'vol', tr.vol); mu.p.dirty = true; mu.emit(); }} onPointerUp={() => { mu.eng?.autoRelease(tr.id, 'vol'); mu.act('mu.h.vol', () => { /* appliqué */ }); }} />
      </div>
      {tr.h >= 60 && <MiniMeter id={tr.id} />}
    </div>
    <span className="mu-thrz" onPointerDown={resize} />
  </div>;
}
function MiniMeter({ id }: { id: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { let raf = 0; const f = () => { const e = mu.eng, el = ref.current; if (el && e) { const m = e.meter(id); el.style.width = clamp((m.peak + 60) / 60 * 100, 0, 100) + '%'; el.classList.toggle('clip', m.clip); } raf = requestAnimationFrame(f); }; if (!mu.set.lowPC) raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [id]);
  return <div className="mu-mini"><div ref={ref} /></div>;
}
function LaneHead({ tr, l }: { tr: Track | null; l: AutoLane }) {
  return <div className="mu-lh" style={{ height: LANE_H }}>
    <small title={paramName(tr, l.param)}>{paramName(tr, l.param)}</small>
    <div className="mu-throw">
      <select value={l.mode} title={t('mu.auto.mode')} onChange={e => { const m = e.target.value as AutoLane['mode']; mu.act('mu.h.autoMode', () => { l.mode = m; }); if (m === 'write' && l.pts.length) toast(t('mu.auto.writeWarn')); }}>
        {(['read', 'touch', 'latch', 'write', 'off'] as const).map(m => <option key={m} value={m}>{t('mu.auto.m_' + m)}</option>)}</select>
      <button className="mu-ib" title={t('mu.auto.clear')} onClick={() => mu.act('mu.h.autoEdit', () => { l.pts = []; })}><Ico n="eraser" s={12} /></button>
      <button className="mu-ib" title={t('mu.auto.hide')} onClick={() => { l.show = false; mu.emit(); }}><Ico n="close" s={12} /></button>
    </div>
  </div>;
}

/* ---------- dépôt d'un son ou d'un préréglage depuis le navigateur ---------- */
export type DropItem = { kind: 'asset'; id: string } | { kind: 'inst'; preset: string } | { kind: 'chain'; id: string };
export async function dropItem(it: DropItem, at: number, tr: Track | null) {
  await mu.init(); const p = mu.p;
  if (it.kind === 'inst') { const id = mu.addTrack(it.preset.startsWith('kit-') ? 'drum' : 'inst', it.preset); mu.selectTrack(id); return; }
  if (it.kind === 'chain') { mu.dialog = 'applyChain'; mu.dialogArg = { chain: it.id, track: tr?.id ?? mu.sel.track }; mu.emit(); return; }
  const a = p.assets[it.id] || (it.id.startsWith('gen:') ? (await import('./kits')).genCatalog(mu.store.sr).find(x => x.id === it.id) : null);
  if (!a) return; if (!mu.store.get(a.id)) { toast(t('mu.f.notLoaded')); return; }
  const { IOclip } = await import('./state');
  mu.act('mu.h.import', q => {
    q.assets[a.id] ||= { ...a, len: mu.store.get(a.id)!.duration };
    let T = tr ? trackOf(q, tr.id) : null; if (!T || T.kind !== 'audio') { T = (q.tracks.find(x => x.kind === 'audio' && x.id === mu.sel.track) || null); }
    if (!T) { T = newTrack(q, 'audio', assetLabel(a).slice(0, 30)); q.tracks.push(T); }
    const c = IOclip(q, q.assets[a.id], at); if (a.bpm) { c.warp = true; c.srcBpm = a.bpm; } T.clips.push(c); mu.sel.track = T.id;
  }, true);
}

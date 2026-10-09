// DedCut Musique — piano roll : notes d'un clip MIDI (dessiner, déplacer, couper, dupliquer, redimensionner, couper le son,
// écouter), grille, gammes et accords, quantification, humanisation, vélocité et contrôleurs (modulation, sustain, pitch bend…).
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast } from './state';
import type { MidiClip, MidiData, Note, Track } from './model';
import { CHORDS, NOTE_FR, NOTE_N, SCALES, clamp, inScale, midiOf, nid, noteName, trackOf } from './model';
import { addChord, humanize, invert, legato, linkCount, quantize, restoreOriginal, toScale, transpose, unlinkClip, velocity } from './ops';
import { GRIDS } from './arrange';
import { Ico } from './icons';

const KEY_W = 54, LANE = 64;
const fr = () => (document.documentElement.lang || 'fr').startsWith('fr');
export const nName = (p: number) => (fr() ? NOTE_FR : NOTE_N)[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
const CC_LANES = ['vel', '1', '64', 'pb', '11', '7', '74', '10'];

export function PianoRoll() {
  useMu(); const f = mu.clip;
  if (!f || f.c.kind !== 'midi') {
    const tr = mu.track;
    return <div className="mu-empty"><Ico n="piano" s={28} /><p>{t('mu.pr.none')}</p>
      {tr && tr.kind === 'inst' && <button className="pri" onClick={() => mu.newMidiClip(tr, Math.floor(mu.pos()), 4)}><Ico n="plus" s={13} />{t('mu.pr.newClip')}</button>}</div>;
  }
  const md = midiOf(mu.p, f.c.data); if (!md) return null;
  return <Roll tr={f.t} c={f.c} md={md} />;
}

type RDrag = { kind: 'move' | 'resR' | 'resL' | 'band' | 'draw' | 'vel' | 'cc'; x0: number; y0: number; snap: { id: number; t: number; d: number; p: number; v: number }[]; copy?: boolean; moved?: boolean; at?: number; p0?: number };

function Roll({ tr, c, md }: { tr: Track; c: MidiClip; md: MidiData }) {
  const p = mu.p, V = mu.view, sel = mu.sel.notes;
  const wrap = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), lane = useRef<HTMLCanvasElement>(null), keys = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 600, h: 300 }), [rz, setRz] = useState(48), [rsx, setRsx] = useState(0), [noteLen, setNoteLen] = useState(.5), [chord, setChord] = useState(''), [q, setQ] = useState({ strength: 100, swing: 0, ends: false }), [hz, setHz] = useState({ timing: 2, vel: 8, seed: 1 });
  const drag = useRef<RDrag | null>(null), band = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => { const el = body.current; if (!el) return; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth - KEY_W, h: el.clientHeight })); ro.observe(el); return () => ro.disconnect(); }, []);
  const PZ = V.pz, maxY = 128 * PZ - size.h; V.py = clamp(V.py, 0, Math.max(0, maxY));
  const t2x = (b: number) => (b - rsx) * rz, x2t = (x: number) => x / rz + rsx, p2y = (n: number) => (127 - n) * PZ - V.py, y2p = (y: number) => clamp(127 - Math.floor((y + V.py) / PZ), 0, 127);
  const g0 = V.grid, snapT = (b: number, alt = false) => alt ? Math.max(0, b) : Math.max(0, Math.round(b / g0) * g0);
  const contentLen = c.loop ? (c.loopLen || c.len) : c.len + (c.off || 0);
  const hit = (x: number, y: number): { n: Note; edge: '' | 'L' | 'R' } | null => { const b = x2t(x), pp = y2p(y); for (const n of [...md.notes].reverse()) if (n.p === pp && b >= n.t && b < n.t + n.d) { const x0 = t2x(n.t), x1 = t2x(n.t + n.d); return { n, edge: x1 - x < 6 && x1 - x0 > 10 ? 'R' : x - x0 < 4 && x1 - x0 > 10 ? 'L' : '' }; } return null; };
  const audition = (pp: number, v = 100) => { void mu.noteOn(pp, v); setTimeout(() => mu.noteOff(pp), 220); };
  const commit = (label: string) => mu.act(label, () => { /* appliqué pendant le geste */ });

  /* dessin des notes */
  useEffect(() => {
    const el = cv.current; if (!el) return; const dpr = devicePixelRatio || 1, W = Math.max(10, size.w), H = Math.max(10, size.h);
    el.width = W * dpr; el.height = H * dpr; el.style.width = W + 'px'; el.style.height = H + 'px'; const g = el.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0f0d16'; g.fillRect(0, 0, W, H);
    for (let n = 0; n < 128; n++) { const y = p2y(n); if (y > H || y + PZ < 0) continue; const black = [1, 3, 6, 8, 10].includes(n % 12); g.fillStyle = !inScale(p, n) ? 'rgba(0,0,0,.28)' : black ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)'; g.fillRect(0, y, W, PZ - 1); if (n % 12 === 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + PZ - 1, W, 1); } }
    for (let b = Math.floor(rsx / g0) * g0; t2x(b) < W; b += g0) { const x = t2x(b); g.fillStyle = Math.abs(b % 4) < 1e-6 ? 'rgba(255,255,255,.16)' : Math.abs(b % 1) < 1e-6 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)'; g.fillRect(Math.round(x), 0, 1, H); }
    // zone du clip et répétitions (boucle)
    g.fillStyle = 'rgba(0,0,0,.35)'; const end = t2x(contentLen); if (end < W) g.fillRect(end, 0, W - end, H); const st = t2x(c.off || 0); if (st > 0 && !c.loop) g.fillRect(0, 0, st, H);
    const col = c.color || tr.color;
    if (c.loop) for (let r = 1; t2x(r * contentLen) < W; r++) for (const n of md.notes) { const x = t2x(n.t + r * contentLen); g.fillStyle = col + '30'; g.fillRect(x, p2y(n.p) + 1, Math.max(2, n.d * rz - 1), PZ - 2); }
    for (const n of md.notes) {
      const x = t2x(n.t), y = p2y(n.p), w = Math.max(3, n.d * rz - 1); if (x > W || x + w < 0 || y > H || y + PZ < 0) continue;
      const s = sel.has(n.id), a = .35 + .65 * n.v / 127;
      g.fillStyle = n.mute ? 'rgba(160,160,170,.35)' : s ? '#fff' : col; g.globalAlpha = n.mute ? 1 : a; g.beginPath(); g.roundRect(x, y + 1, w, PZ - 2, 2.5); g.fill(); g.globalAlpha = 1;
      if (s) { g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); }
      if (PZ >= 11 && w > 26) { g.fillStyle = s ? '#0b0a12' : 'rgba(10,8,16,.85)'; g.font = '9.5px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'middle'; g.fillText(nName(n.p), x + 3, y + PZ / 2); }
    }
    if (band.current) { const b = band.current; g.strokeStyle = '#22d3ee'; g.fillStyle = 'rgba(34,211,238,.1)'; g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x + .5, b.y + .5, b.w, b.h); }
    // tête de lecture (position dans le clip)
    const pos = mu.pos(); if (pos >= c.t && pos < c.t + c.len) { let rel = pos - c.t + (c.off || 0); if (c.loop) rel %= contentLen; g.fillStyle = '#fff'; g.fillRect(Math.round(t2x(rel)), 0, 1.5, H); }
  });
  /* clavier */
  useEffect(() => {
    const el = keys.current; if (!el) return; const dpr = devicePixelRatio || 1, H = Math.max(10, size.h); el.width = KEY_W * dpr; el.height = H * dpr; el.style.height = H + 'px'; const g = el.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let n = 0; n < 128; n++) { const y = p2y(n); if (y > H || y + PZ < 0) continue; const black = [1, 3, 6, 8, 10].includes(n % 12); g.fillStyle = black ? '#1b1826' : '#d9d6e3'; g.fillRect(0, y, KEY_W, PZ - .5); if (mu.held.has(n)) { g.fillStyle = '#a78bfa'; g.fillRect(0, y, KEY_W, PZ - .5); }
      if (n % 12 === 0 || PZ >= 14) { g.fillStyle = black ? '#c4c0d4' : '#2a2635'; g.font = (n % 12 === 0 ? '600 ' : '') + '9.5px Bahnschrift, Segoe UI, sans-serif'; g.textBaseline = 'middle'; g.fillText(nName(n), 4, y + PZ / 2); } }
  });
  /* ligne de vélocité / contrôleur */
  const laneK = V.laneCC;
  useEffect(() => {
    const el = lane.current; if (!el) return; const dpr = devicePixelRatio || 1, W = Math.max(10, size.w); el.width = W * dpr; el.height = LANE * dpr; el.style.width = W + 'px'; const g = el.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0c0a12'; g.fillRect(0, 0, W, LANE); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, LANE / 2, W, 1);
    const col = c.color || tr.color;
    if (laneK === 'vel') { for (const n of md.notes) { const x = t2x(n.t); if (x < -4 || x > W) continue; const h = (LANE - 8) * n.v / 127; g.fillStyle = sel.has(n.id) ? '#fff' : col; g.fillRect(x, LANE - 4 - h, 3, h); g.beginPath(); g.arc(x + 1.5, LANE - 4 - h, 3, 0, 7); g.fill(); } }
    else { const pts = md.cc[laneK] || []; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); let first = true; const def = laneK === 'pb' ? .5 : 0; let last = def;
      for (const pt of pts) { const x = t2x(pt.t), y = LANE - 4 - pt.v * (LANE - 8); if (first) { g.moveTo(0, LANE - 4 - (laneK === 'pb' ? .5 : pt.v) * (LANE - 8)); first = false; } if (laneK === '64') { g.lineTo(x, LANE - 4 - last * (LANE - 8)); } g.lineTo(x, y); last = pt.v; } if (!first) g.lineTo(W, LANE - 4 - last * (LANE - 8)); g.stroke();
      g.fillStyle = '#fff'; for (const pt of pts) { const x = t2x(pt.t); g.beginPath(); g.arc(x, LANE - 4 - pt.v * (LANE - 8), 3, 0, 7); g.fill(); } }
  });
  // la tête de lecture avance pendant la lecture
  const [, force] = useState(0);
  useEffect(() => mu.onPos(() => force(x => x + 1)), []);
  // à l'ouverture d'un clip : toutes ses notes tiennent à l'écran (hauteur des lignes adaptée) et sont centrées
  useEffect(() => {
    const el = body.current, h = el ? el.clientHeight : size.h, ps = md.notes.map(n => n.p);
    const lo = ps.length ? Math.min(...ps) : 54, hi = ps.length ? Math.max(...ps) : 66, mid = (lo + hi) / 2;
    V.pz = clamp(Math.floor(h / (hi - lo + 5)), 7, 16);
    V.py = Math.max(0, (127 - mid) * V.pz - h / 2); setRsx(c.loop ? 0 : Math.max(0, Math.floor(c.off || 0))); force(x => x + 1);
  }, [c.id]);

  /* souris : notes */
  const down = (e: React.PointerEvent) => {
    wrap.current?.focus({ preventScroll: true }); // le clavier (Suppr, flèches, Ctrl+A…) agit alors sur les notes
    if (tr.lock) { toast(t('mu.trk.locked')); return; }
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const h = hit(x, y);
    if (e.button === 2) { if (h) { mu.act('mu.h.noteDel', () => { md.notes = md.notes.filter(n => n.id !== h.n.id); }); sel.delete(h.n.id); } return; }
    if (h) {
      if (!sel.has(h.n.id)) { if (!e.shiftKey) sel.clear(); sel.add(h.n.id); } else if (e.shiftKey) { sel.delete(h.n.id); mu.emit(); return; }
      audition(h.n.p, h.n.v);
      drag.current = { kind: h.edge === 'R' ? 'resR' : h.edge === 'L' ? 'resL' : 'move', x0: x, y0: y, copy: e.altKey, snap: md.notes.filter(n => sel.has(n.id)).map(n => ({ id: n.id, t: n.t, d: n.d, p: n.p, v: n.v })), p0: h.n.p };
      mu.emit(); return;
    }
    if (mu.view.prTool === 'draw' || e.detail === 2 || e.ctrlKey) {
      const at = snapT(x2t(x), e.altKey), pp = y2p(y); sel.clear();
      const ns = chord ? addChord(p, md, pp, chord, at, noteLen, mu.set.vel) : [(() => { const n: Note = { id: nid(p), p: pp, t: at, d: noteLen, v: mu.set.vel }; md.notes.push(n); return n; })()];
      for (const n of ns) sel.add(n.id); audition(pp, mu.set.vel); if (at + noteLen > contentLen && !c.loop) c.len = Math.max(c.len, Math.ceil(at + noteLen - (c.off || 0)));
      drag.current = { kind: 'draw', x0: x, y0: y, snap: ns.map(n => ({ id: n.id, t: n.t, d: n.d, p: n.p, v: n.v })), at }; mu.sync(); mu.emit(); return;
    }
    if (!e.shiftKey) sel.clear(); drag.current = { kind: 'band', x0: x, y0: y, snap: [] }; band.current = { x, y, w: 0, h: 0 }; mu.emit();
  };
  const move = (e: React.PointerEvent) => {
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, d = drag.current;
    if (!d) { const h = hit(x, y); (e.currentTarget as HTMLElement).style.cursor = h ? (h.edge ? 'ew-resize' : 'grab') : mu.view.prTool === 'draw' ? 'crosshair' : 'default'; return; }
    if (Math.abs(x - d.x0) + Math.abs(y - d.y0) > 2) d.moved = true; if (!d.moved) return;
    const dt = (x - d.x0) / rz, dp = Math.round((d.y0 - y) / PZ);
    if (d.kind === 'band') { band.current = { x: Math.min(d.x0, x), y: Math.min(d.y0, y), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) }; const a = x2t(band.current.x), b = x2t(band.current.x + band.current.w), p1 = y2p(band.current.y), p0 = y2p(band.current.y + band.current.h); for (const n of md.notes) if (n.t < b && n.t + n.d > a && n.p >= p0 && n.p <= p1) sel.add(n.id); else if (!e.shiftKey) sel.delete(n.id); mu.emit(); return; }
    for (const s of d.snap) {
      const n = md.notes.find(k => k.id === s.id); if (!n) continue;
      if (d.kind === 'move') { const base = d.snap[0], nt = snapT(base.t + dt, e.altKey && !d.copy) - base.t; n.t = Math.max(0, s.t + nt); n.p = clamp(s.p + dp, 0, 127); }
      else if (d.kind === 'resR' || d.kind === 'draw') { const end = snapT(s.t + s.d + dt, e.altKey); n.d = Math.max(g0 / 4, end - s.t); }
      else if (d.kind === 'resL') { const st = Math.min(snapT(s.t + dt, e.altKey), s.t + s.d - g0 / 4); n.d = s.t + s.d - st; n.t = Math.max(0, st); }
    }
    if (d.kind === 'move' && dp !== 0 && d.snap[0] && d.p0 != null) { const np = clamp(d.p0 + dp, 0, 127); if (np !== (drag.current as RDrag & { last?: number }).last) { (drag.current as RDrag & { last?: number }).last = np; audition(np); } }
    mu.emit();
  };
  const up = () => {
    const d = drag.current; drag.current = null; band.current = null; if (!d) return;
    if (d.kind === 'band') { mu.emit(); return; }
    if (d.kind === 'move' && d.copy && d.moved) {
      // Alt + glisser : les notes d'origine restent, des copies sont posées
      const moved = md.notes.filter(n => d.snap.some(s => s.id === n.id)).map(n => ({ ...n })); for (const s of d.snap) { const n = md.notes.find(k => k.id === s.id); if (n) { n.t = s.t; n.p = s.p; } }
      sel.clear(); mu.act('mu.h.noteCopy', () => { for (const n of moved) { const x = { ...n, id: nid(p) }; md.notes.push(x); sel.add(x.id); } }); return;
    }
    if (d.kind === 'draw') { commit('mu.h.noteAdd'); return; }
    if (d.moved) commit(d.kind === 'move' ? 'mu.h.noteMove' : 'mu.h.noteLen'); else mu.emit();
  };
  const wheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, b = x2t(x), nz = clamp(rz * (e.deltaY < 0 ? 1.18 : 1 / 1.18), 6, 600); setRz(nz); setRsx(Math.max(0, b - x / nz)); }
    else if (e.altKey) { V.pz = clamp(V.pz + (e.deltaY < 0 ? 1 : -1), 6, 26); mu.emit(); }
    else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) setRsx(Math.max(0, rsx + (e.deltaX || e.deltaY) / rz));
    else { V.py = clamp(V.py + e.deltaY, 0, Math.max(0, maxY)); mu.emit(); }
  };
  /* souris : vélocité et contrôleurs */
  const laneDown = (e: React.PointerEvent) => {
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const apply = (cx: number, cy: number) => {
      const x = cx - rc.left, y = cy - rc.top, v = clamp((LANE - 4 - y) / (LANE - 8), 0, 1);
      if (laneK === 'vel') { const tgt = md.notes.filter(n => Math.abs(t2x(n.t) - x) < 5 && (!sel.size || sel.has(n.id))); for (const n of tgt) n.v = clamp(Math.round(v * 127), 1, 127); }
      else { const L = (md.cc[laneK] ||= []), b = snapT(x2t(x), e.altKey), i = L.findIndex(pt => Math.abs(pt.t - b) < 1e-6); const vv = laneK === '64' ? (v >= .5 ? 1 : 0) : v; if (i >= 0) L[i].v = vv; else { L.push({ t: b, v: vv }); L.sort((a, k) => a.t - k.t); } }
      mu.sync(); mu.emit();
    };
    apply(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => apply(ev.clientX, ev.clientY), u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); commit(laneK === 'vel' ? 'mu.h.vel' : 'mu.h.cc'); };
    addEventListener('pointermove', mv); addEventListener('pointerup', u);
  };
  const laneDbl = (e: React.MouseEvent) => { if (laneK === 'vel') return; const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - rc.left, L = md.cc[laneK] || []; const i = L.findIndex(pt => Math.abs(t2x(pt.t) - x) < 6); if (i >= 0) mu.act('mu.h.cc', () => { L.splice(i, 1); }); };
  const keyDown = (e: React.PointerEvent) => { const rc = (e.currentTarget as HTMLElement).getBoundingClientRect(), pp = y2p(e.clientY - rc.top); void mu.noteOn(pp, Math.round(40 + 87 * clamp((e.clientX - rc.left) / KEY_W, 0, 1))); const u = () => { mu.noteOff(pp); removeEventListener('pointerup', u); }; addEventListener('pointerup', u); };

  /* actions de la barre d'outils */
  const S = () => sel.size ? sel : null;
  const op = (label: string, f: () => void) => { if (tr.lock) { toast(t('mu.trk.locked')); return; } mu.act(label, f); };
  const links = linkCount(p, c);
  return <div className="mu-pr" ref={wrap} tabIndex={0} onKeyDown={e => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); if (!sel.size) return; op('mu.h.noteDel', () => { md.notes = md.notes.filter(n => !sel.has(n.id)); }); sel.clear(); }
    else if (e.key === 'a' && e.ctrlKey) { e.preventDefault(); e.stopPropagation(); for (const n of md.notes) sel.add(n.id); mu.emit(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); op('mu.h.transpose', () => transpose(md, S(), (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1))); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); op('mu.h.noteMove', () => { for (const n of md.notes) if (sel.has(n.id)) n.t = Math.max(0, n.t + (e.key === 'ArrowRight' ? g0 : -g0)); }); }
    else if (e.key.toLowerCase() === 'm' && !e.ctrlKey) { e.stopPropagation(); op('mu.h.noteMute', () => { for (const n of md.notes) if (sel.has(n.id)) n.mute = !n.mute; }); }
    else if (e.key === 'd' && e.ctrlKey) { e.preventDefault(); e.stopPropagation(); const ns = md.notes.filter(n => sel.has(n.id)); if (!ns.length) return; const span = Math.max(...ns.map(n => n.t + n.d)) - Math.min(...ns.map(n => n.t)); sel.clear(); op('mu.h.noteCopy', () => { for (const n of ns) { const x = { ...n, id: nid(p), t: n.t + span }; md.notes.push(x); sel.add(x.id); } }); }
  }}>
    <div className="mu-prbar">
      <button className={'mu-ib' + (mu.view.prTool !== 'draw' ? ' on' : '')} title={t('mu.tool.select')} onClick={() => { mu.view.prTool = 'select'; mu.emit(); }}><Ico n="cursor" s={14} /></button>
      <button className={'mu-ib' + (mu.view.prTool === 'draw' ? ' on' : '')} title={t('mu.tool.draw')} onClick={() => { mu.view.prTool = 'draw'; mu.emit(); }}><Ico n="pen" s={14} /></button>
      <label title={t('mu.gridLen')}><Ico n="magnet" s={13} /><select value={g0} onChange={e => { mu.view.grid = +e.target.value; mu.emit(); }}>{GRIDS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select></label>
      <label title={t('mu.pr.len')}><Ico n="note" s={13} /><select value={noteLen} onChange={e => setNoteLen(+e.target.value)}>{GRIDS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select></label>
      <label title={t('mu.pr.vel')}>v<input type="number" min={1} max={127} value={mu.set.vel} onChange={e => { mu.set.vel = clamp(+e.target.value || 100, 1, 127); mu.saveSettings(); mu.emit(); }} /></label>
      <label title={t('mu.pr.chordTool')}><Ico n="chord" s={13} /><select value={chord} onChange={e => setChord(e.target.value)}><option value="">{t('mu.pr.single')}</option>{Object.keys(CHORDS).map(k => <option key={k} value={k}>{t('mu.ch.' + k)}</option>)}</select></label>
      <span className="mu-sep" />
      <details className="mu-pop"><summary title={t('mu.pr.quantize')}><Ico n="quant" s={14} />{t('mu.pr.quantize')}</summary><div>
        <label>{t('mu.pr.strength')}<input type="range" min={0} max={100} value={q.strength} onChange={e => setQ({ ...q, strength: +e.target.value })} /><em>{q.strength} %</em></label>
        <label>{t('mu.pr.swing')}<input type="range" min={0} max={100} value={q.swing} onChange={e => setQ({ ...q, swing: +e.target.value })} /><em>{q.swing} %</em></label>
        <label><input type="checkbox" checked={q.ends} onChange={e => setQ({ ...q, ends: e.target.checked })} />{t('mu.pr.ends')}</label>
        <button className="pri" onClick={() => op('mu.h.quantize', () => quantize(md, S(), { grid: g0, strength: q.strength / 100, swing: q.swing / 100, ends: q.ends }))}>{t('mu.pr.apply')}</button></div></details>
      <details className="mu-pop"><summary title={t('mu.pr.humanize')}><Ico n="human" s={14} />{t('mu.pr.humanize')}</summary><div>
        <label>{t('mu.pr.timing')}<input type="range" min={0} max={20} value={hz.timing} onChange={e => setHz({ ...hz, timing: +e.target.value })} /><em>{hz.timing} %</em></label>
        <label>{t('mu.pr.velRand')}<input type="range" min={0} max={40} value={hz.vel} onChange={e => setHz({ ...hz, vel: +e.target.value })} /><em>±{hz.vel}</em></label>
        <label>{t('mu.pr.seed')}<input type="number" min={1} max={99999} value={hz.seed} onChange={e => setHz({ ...hz, seed: +e.target.value || 1 })} /></label>
        <button className="pri" onClick={() => op('mu.h.humanize', () => humanize(md, S(), hz.timing / 100 * g0 * 2, hz.vel, hz.seed))}>{t('mu.pr.apply')}</button>
        <small>{t('mu.pr.seedHint')}</small></div></details>
      {md.orig && <button title={t('mu.pr.origTip')} onClick={() => op('mu.h.restore', () => restoreOriginal(md))}><Ico n="undo" s={13} />{t('mu.pr.orig')}</button>}
      <details className="mu-pop"><summary title={t('mu.pr.more')}><Ico n="dots" s={14} /></summary><div className="mu-col">
        <div className="mu-row"><button onClick={() => op('mu.h.transpose', () => transpose(md, S(), -12))}>−12</button><button onClick={() => op('mu.h.transpose', () => transpose(md, S(), -1))}>−1</button><button onClick={() => op('mu.h.transpose', () => transpose(md, S(), 1))}>+1</button><button onClick={() => op('mu.h.transpose', () => transpose(md, S(), 12))}>+12</button></div>
        <button onClick={() => op('mu.h.toScale', () => toScale(p, md, S()))}>{t('mu.pr.toScale', { scale: noteName(p.key, fr()).replace(/-?\d+$/, '') + ' ' + t('mu.sc.' + p.scale) })}</button>
        <div className="mu-row"><button disabled={sel.size < 2} onClick={() => op('mu.h.invert', () => invert(md, sel, true))}>{t('mu.pr.invUp')}</button><button disabled={sel.size < 2} onClick={() => op('mu.h.invert', () => invert(md, sel, false))}>{t('mu.pr.invDown')}</button></div>
        <button onClick={() => op('mu.h.legato', () => legato(md, S()))}>{t('mu.pr.legato')}</button>
        <div className="mu-row"><button onClick={() => op('mu.h.vel', () => velocity(md, S(), (_n, i, all) => 40 + 87 * i / Math.max(1, all.length - 1)))}>{t('mu.pr.crescendo')}</button><button onClick={() => op('mu.h.vel', () => velocity(md, S(), (_n, i, all) => 127 - 87 * i / Math.max(1, all.length - 1)))}>{t('mu.pr.decrescendo')}</button></div>
        <button onClick={() => op('mu.h.noteMute', () => { for (const n of md.notes) if (!sel.size || sel.has(n.id)) n.mute = !n.mute; })}>{t('mu.pr.muteNotes')}</button>
        <hr />
        <label><input type="checkbox" checked={c.loop} onChange={e => op('mu.h.clipLoop', () => { c.loop = e.target.checked; c.loopLen = c.loopLen || Math.max(1, Math.ceil(Math.max(1, ...md.notes.map(n => n.t + n.d)))); })} />{t('mu.pr.loop')}</label>
        {c.loop && <label>{t('mu.pr.loopLen')}<input type="number" min={.25} step={.25} value={c.loopLen || c.len} onChange={e => op('mu.h.clipLoop', () => { c.loopLen = Math.max(.25, +e.target.value || 1); })} /></label>}
        <label>{t('mu.pr.channel')}<input type="number" min={1} max={16} value={md.ch + 1} onChange={e => op('mu.h.midiCh', () => { md.ch = clamp((+e.target.value || 1) - 1, 0, 15); })} /></label>
        <label>{t('mu.pr.program')}<input type="number" min={1} max={128} value={md.program + 1} onChange={e => op('mu.h.midiCh', () => { md.program = clamp((+e.target.value || 1) - 1, 0, 127); })} /></label>
        <label>{t('mu.pr.bank')}<input type="number" min={0} max={16383} value={md.bank} onChange={e => op('mu.h.midiCh', () => { md.bank = clamp(+e.target.value || 0, 0, 16383); })} /></label>
        <small>{t('mu.pr.chHint')}</small>
        <button onClick={() => void mu.exportMidi(true)}><Ico n="export" s={13} />{t('mu.pr.exportClip')}</button>
      </div></details>
      <span className="mu-sp" />
      {links > 1 && <button title={t('mu.pr.linkedTip', { n: String(links) })} onClick={() => op('mu.h.unlink', () => unlinkClip(p, c))}><Ico n="link" s={13} />{t('mu.pr.linked', { n: String(links) })}</button>}
      <span className="mu-dim">{tr.name} · {c.name} · {t('mu.pr.notes', { n: String(md.notes.length) })}{sel.size ? ' · ' + t('mu.pr.selN', { n: String(sel.size) }) : ''}</span>
      <select value={laneK} title={t('mu.pr.lane')} onChange={e => { V.laneCC = e.target.value; mu.emit(); }}>{CC_LANES.map(k => <option key={k} value={k}>{t('mu.cc.' + k)}</option>)}</select>
    </div>
    <div className="mu-prbody" ref={body}>
      <canvas ref={keys} className="mu-keys" style={{ width: KEY_W }} onPointerDown={keyDown} aria-label={t('mu.pr.keyboard')} />
      {!md.notes.length && <div className="mu-prhint" style={{ left: KEY_W }}>{t('mu.pr.emptyHint')}</div>}
      <canvas ref={cv} className="mu-prgrid" onPointerDown={down} onPointerMove={move} onPointerUp={up} onWheel={wheel} onContextMenu={e => e.preventDefault()} aria-label={t('mu.pr.grid')} />
    </div>
    <div className="mu-prlane"><span style={{ width: KEY_W }}>{t('mu.cc.' + laneK)}</span><canvas ref={lane} onPointerDown={laneDown} onDoubleClick={laneDbl} aria-label={t('mu.pr.lane')} /></div>
  </div>;
}
export { trackOf, SCALES };

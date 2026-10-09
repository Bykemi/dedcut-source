// DedCut Musique — partition simple : notes arrondies à la double croche, mesures, liaisons, silences ;
// export MusicXML 3.1 (format ouvert, lisible par les logiciels de partition) et dessin SVG d'une portée.
import type { Note, Project } from './model';
import { NOTE_N } from './model';

interface Ev { t: number; d: number; ps: number[]; tie0: boolean; tie1: boolean }
const Q = .25; // double croche
/** découpe les notes en événements par mesure (accords = notes qui commencent ensemble) */
export function measures(notes: Note[], num: number, den: number, bars: number): Ev[][] {
  const bl = num * 4 / den, out: Ev[][] = Array.from({ length: bars }, () => []);
  const qn = notes.filter(n => !n.mute).map(n => ({ p: n.p, t: Math.round(n.t / Q) * Q, d: Math.max(Q, Math.round(n.d / Q) * Q) })).sort((a, b) => a.t - b.t || a.p - b.p);
  // regroupe les notes de même début ; la durée de l'accord = la plus courte (partition à une voix)
  const groups: { t: number; d: number; ps: number[] }[] = [];
  for (const n of qn) { const g = groups.find(x => Math.abs(x.t - n.t) < 1e-6); if (g) { g.ps.push(n.p); g.d = Math.min(g.d, n.d); } else groups.push({ t: n.t, d: n.d, ps: [n.p] }); }
  for (let i = 0; i < groups.length - 1; i++) groups[i].d = Math.min(groups[i].d, groups[i + 1].t - groups[i].t);
  for (const g of groups) {
    let t = g.t, left = g.d, first = true;
    while (left > 1e-6) { const bar = Math.floor(t / bl + 1e-9); if (bar >= bars) break; const room = (bar + 1) * bl - t, d = Math.min(left, room); out[bar].push({ t: t - bar * bl, d, ps: g.ps, tie0: !first, tie1: left - d > 1e-6 }); t += d; left -= d; first = false; }
  }
  return out;
}
const TYPES: [number, string, boolean][] = [[4, 'whole', false], [3, 'half', true], [2, 'half', false], [1.5, 'quarter', true], [1, 'quarter', false], [.75, 'eighth', true], [.5, 'eighth', false], [.25, '16th', false]];
/** découpe une durée en valeurs écrivables (ronde, blanche pointée…) */
function parts(d: number): [number, string, boolean][] { const out: [number, string, boolean][] = []; let left = d; for (const x of TYPES) while (left >= x[0] - 1e-6) { out.push(x); left -= x[0]; } return out; }
const step = (p: number) => { const n = NOTE_N[((p % 12) + 12) % 12]; return { step: n[0], alter: n.length > 1 ? 1 : 0, octave: Math.floor(p / 12) - 1 }; };
const esc = (s: string) => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
/** MusicXML (partwise) : une partie par piste */
export function musicXml(p: Project, parts_: { name: string; notes: Note[] }[], bars: number): string {
  const div = 4, bl = p.num * 4 / p.den, fifths = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5][p.key % 12];
  let x = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1"><work><work-title>${esc(p.name)}</work-title></work><identification><encoding><software>DedCut</software></encoding></identification><part-list>`;
  parts_.forEach((pt, i) => { x += `<score-part id="P${i + 1}"><part-name>${esc(pt.name)}</part-name></score-part>`; });
  x += '</part-list>';
  parts_.forEach((pt, i) => {
    const avg = pt.notes.length ? pt.notes.reduce((a, n) => a + n.p, 0) / pt.notes.length : 60, bass = avg < 55; x += `<part id="P${i + 1}">`;
    measures(pt.notes, p.num, p.den, bars).forEach((evs, m) => {
      x += `<measure number="${m + 1}">`;
      if (m === 0) x += `<attributes><divisions>${div}</divisions><key><fifths>${fifths}</fifths><mode>${p.scale === 'minor' ? 'minor' : 'major'}</mode></key><time><beats>${p.num}</beats><beat-type>${p.den}</beat-type></time><clef><sign>${bass ? 'F' : 'G'}</sign><line>${bass ? 4 : 2}</line></clef></attributes>`;
      if (m === 0) x += `<direction placement="above"><sound tempo="${Math.round(p.bpm)}"/></direction>`;
      let t = 0; const rest = (d: number) => { for (const [dd, ty, dot] of parts(d)) x += `<note><rest/><duration>${Math.round(dd * div)}</duration><type>${ty}</type>${dot ? '<dot/>' : ''}</note>`; };
      for (const e of evs) {
        if (e.t > t + 1e-6) rest(e.t - t);
        const ps = parts(e.d); ps.forEach(([dd, ty, dot], k) => e.ps.forEach((pp, j) => {
          const s = step(pp), tieStart = e.tie1 || k < ps.length - 1, tieStop = e.tie0 || k > 0;
          x += `<note>${j ? '<chord/>' : ''}<pitch><step>${s.step}</step>${s.alter ? `<alter>${s.alter}</alter>` : ''}<octave>${s.octave}</octave></pitch><duration>${Math.round(dd * div)}</duration>${tieStop ? '<tie type="stop"/>' : ''}${tieStart ? '<tie type="start"/>' : ''}<type>${ty}</type>${dot ? '<dot/>' : ''}${s.alter ? '<accidental>sharp</accidental>' : ''}${tieStop || tieStart ? `<notations>${tieStop ? '<tied type="stop"/>' : ''}${tieStart ? '<tied type="start"/>' : ''}</notations>` : ''}</note>`;
        }));
        t = e.t + e.d;
      }
      if (t < bl - 1e-6) rest(bl - t);
      x += '</measure>';
    });
    x += '</part>';
  });
  return x + '</score-partwise>';
}
/** portée en SVG (affichage dans DedCut) ; couleur = variable CSS du thème */
export function scoreSvg(p: Project, notes: Note[], bars: number, width: number): string {
  const ms = measures(notes, p.num, p.den, bars), avg = notes.length ? notes.reduce((a, n) => a + n.p, 0) / notes.length : 60, bass = avg < 55;
  const perRow = Math.max(1, Math.floor(width / 220)), rows = Math.ceil(bars / perRow), H = 90, mw = (width - 40) / perRow, bl = p.num * 4 / p.den;
  // position verticale : degrés diatoniques depuis la ligne du bas (Mi4 en clé de sol, Sol2 en clé de fa)
  const dia = (pp: number) => { const o = Math.floor(pp / 12), n = ((pp % 12) + 12) % 12, idx = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][n]; return o * 7 + idx; }, bottom = bass ? dia(43) : dia(64);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${rows * H + 10}" width="${width}" height="${rows * H + 10}" fill="none" stroke="currentColor" font-family="serif">`;
  for (let r = 0; r < rows; r++) {
    const y0 = r * H + 30; for (let l = 0; l < 5; l++) s += `<line x1="10" x2="${width - 10}" y1="${y0 + l * 8}" y2="${y0 + l * 8}" stroke-width=".8"/>`;
    s += `<text x="12" y="${y0 + (bass ? 14 : 30)}" font-size="${bass ? 26 : 40}" fill="currentColor" stroke="none">${bass ? '𝄢' : '𝄞'}</text>`;
    for (let m = 0; m < perRow && r * perRow + m < bars; m++) {
      const bi = r * perRow + m, x0 = 40 + m * mw; s += `<line x1="${x0 + mw}" x2="${x0 + mw}" y1="${y0}" y2="${y0 + 32}" stroke-width="1"/><text x="${x0 + 2}" y="${y0 - 6}" font-size="9" fill="currentColor" stroke="none">${bi + 1}</text>`;
      for (const e of ms[bi]) {
        const x = x0 + 10 + e.t / bl * (mw - 20), filled = e.d < 2, stem = e.d < 4;
        for (const pp of e.ps) {
          const k = dia(pp) - bottom, y = y0 + 32 - k * 4, sharp = NOTE_N[((pp % 12) + 12) % 12].length > 1;
          for (let lk = k <= -2 ? -2 : 10; k <= -2 ? lk >= k : lk <= k; lk += k <= -2 ? -2 : 2) s += `<line x1="${x - 7}" x2="${x + 7}" y1="${y0 + 32 - lk * 4}" y2="${y0 + 32 - lk * 4}" stroke-width=".8"/>`;
          s += `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.4" transform="rotate(-20 ${x} ${y})" ${filled ? 'fill="currentColor"' : 'stroke-width="1.3"'}/>`;
          if (sharp) s += `<text x="${x - 13}" y="${y + 4}" font-size="11" fill="currentColor" stroke="none">♯</text>`;
          if (stem) s += `<line x1="${x + 4.2}" x2="${x + 4.2}" y1="${y}" y2="${y - 24}" stroke-width="1.1"/>`;
          if (e.d === .5 || e.d === .75) s += `<path d="M${x + 4.2} ${y - 24} q7 6 3 14" stroke-width="1.2"/>`; else if (e.d === .25) s += `<path d="M${x + 4.2} ${y - 24} q7 6 3 14 M${x + 4.2} ${y - 18} q7 6 3 14" stroke-width="1.2"/>`;
          if ([3, 1.5, .75].includes(e.d)) s += `<circle cx="${x + 8}" cy="${y}" r="1.3" fill="currentColor"/>`;
          if (e.tie1) s += `<path d="M${x + 4} ${y + 5} q10 7 20 0" stroke-width="1"/>`;
        }
      }
    }
  }
  return s + '</svg>';
}

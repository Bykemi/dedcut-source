// DedCut Musique — modèles de projet d'origine DedCut : vide, beat, chanson, voix, instrumental, musique de vidéo.
import type { MidiClip, Note, Project, Track } from './model';
import { newProject, newTrack, nid } from './model';
import { CHAINS, chainFx, instPreset } from './presets';
import { genBass, genChordNotes, genDrumPattern, genMelody, midiClipFrom, patternClip, PROGRESSIONS } from './ops';

export const TEMPLATES = ['empty', 'beat', 'song', 'voice', 'instrumental', 'video'] as const;
export type TemplateId = typeof TEMPLATES[number];
const chain = (p: Project, id: string) => { const c = CHAINS.find(x => x.id === id); return c ? chainFx(c, () => nid(p)) : []; };
function reverbBus(p: Project): Track { const b = newTrack(p, 'bus', 'Réverbération'); b.fx.push({ id: nid(p), type: 'reverb', on: true, p: { size: 2.4, pre: .02, damp: 6000, width: 1, mix: 1 } }); p.tracks.push(b); return b; }
/** nouveau projet selon un modèle ; names = noms des pistes dans la langue de l'interface */
export function fromTemplate(id: TemplateId, name: string, bpm: number, key: number, scale: string, names: Record<string, string>): Project {
  const p = newProject(name, bpm); p.key = key; p.scale = scale; const N = (k: string) => names[k] || k;
  const sec = (t: number, k: string, color: string) => p.markers.push({ id: nid(p), t, name: N(k), color, kind: 'section' });
  if (id === 'empty') { const t = newTrack(p, 'inst', N('synth')); t.inst = instPreset('keys'); p.tracks.push(t); return p; }
  const rev = id === 'voice' ? null : reverbBus(p);
  const drums = () => { const t = newTrack(p, 'drum', N('drums')); t.inst = instPreset(id === 'beat' ? 'kit-machine' : 'kit-studio'); t.fx = chain(p, 'drumBus'); p.tracks.push(t); return t; };
  if (id === 'beat') {
    const d = drums(), pat = genDrumPattern(p, 'trap', 7); d.inst!.patterns.push(pat); patternClip(p, d, pat, 0, 16);
    const b = newTrack(p, 'inst', N('bass')); b.inst = instPreset('subBass'); p.tracks.push(b); midiClipFrom(p, b, genBass(p, PROGRESSIONS.minorPop, 4, 3), 0, 16, N('bass'));
    const k = newTrack(p, 'inst', N('keys')); k.inst = instPreset('fmEPiano'); p.tracks.push(k); midiClipFrom(p, k, genChordNotes(p, PROGRESSIONS.minorPop, 4, 4, 2), 0, 16, N('chords'));
    if (rev) k.sends.push({ bus: rev.id, db: -10, pre: false, on: true });
    const v = newTrack(p, 'audio', N('voice')); v.fx = chain(p, 'voiceRap'); p.tracks.push(v);
    p.loop = { on: true, a: 0, b: 16 }; sec(0, 'loop', '#a78bfa');
  } else if (id === 'song' || id === 'instrumental') {
    const d = drums(), pat = genDrumPattern(p, 'rock', 5); d.inst!.patterns.push(pat);
    const b = newTrack(p, 'inst', N('bass')); b.inst = instPreset('fmBass'); p.tracks.push(b);
    const k = newTrack(p, 'inst', N('keys')); k.inst = instPreset('keys'); p.tracks.push(k); if (rev) k.sends.push({ bus: rev.id, db: -12, pre: false, on: true });
    const s = newTrack(p, 'inst', N('pad')); s.inst = instPreset('warmPad'); p.tracks.push(s); if (rev) s.sends.push({ bus: rev.id, db: -8, pre: false, on: true });
    const l = id === 'instrumental' ? newTrack(p, 'inst', N('lead')) : null; if (l) { l.inst = instPreset('leadSaw'); p.tracks.push(l); if (rev) l.sends.push({ bus: rev.id, db: -14, pre: false, on: true }); }
    // un motif de 4 mesures par partie ; ses copies sont des clips liés (changer un refrain change tous les refrains)
    const PV = PROGRESSIONS.pop, PC = PROGRESSIONS.ballad, PB = PROGRESSIONS.sad;
    const part = (tr: Track, notes: Note[], name: string) => { const c = midiClipFrom(p, tr, notes, 0, 16, name); tr.clips.pop(); return c; };
    const put = (tr: Track | null, src: MidiClip | null, at: number, len: number) => { if (tr && src) tr.clips.push({ ...src, id: nid(p), t: at, len, loop: true, loopLen: 16 }); };
    const P = {
      intro: { pad: part(s, genChordNotes(p, PV, 4, 3, 10), N('intro')), keys: part(k, genChordNotes(p, PV, 4, 4, 1), N('intro')), bass: null, lead: null },
      verse: { keys: part(k, genChordNotes(p, PV, 4, 4, 1), N('verse')), bass: part(b, genBass(p, PV, 4, 2), N('verse')), pad: null, lead: null },
      chorus: { keys: part(k, genChordNotes(p, PC, 4, 4, 3), N('chorus')), bass: part(b, genBass(p, PC, 4, 4), N('chorus')), pad: part(s, genChordNotes(p, PC, 4, 3, 5), N('chorus')), lead: l && part(l, genMelody(p, PC, 4, 6), N('chorus')) },
      bridge: { keys: part(k, genChordNotes(p, PB, 4, 4, 7), N('bridge')), bass: part(b, genBass(p, PB, 4, 9), N('bridge')), pad: part(s, genChordNotes(p, PB, 4, 3, 8), N('bridge')), lead: null }
    };
    // structure (en mesures) : intro, couplet, refrain, couplet, refrain, pont, refrain, fin
    const plan: [string, number, string][] = [['intro', 4, '#60a5fa'], ['verse', 8, '#34d399'], ['chorus', 8, '#f472b6'], ['verse', 8, '#34d399'], ['chorus', 8, '#f472b6'], ['bridge', 4, '#fbbf24'], ['chorus', 8, '#f472b6'], ['outro', 4, '#60a5fa']];
    let t = 0;
    for (const [k2, bars, col] of plan) {
      const L = bars * 4; sec(t, k2, col);
      if (k2 === 'intro' || k2 === 'outro') { put(s, P.intro.pad, t, L); put(k, P.intro.keys, t, L); }
      else { const q = P[k2 as 'verse' | 'chorus' | 'bridge']; patternClip(p, d, pat, t, L); put(k, q.keys, t, L); put(b, q.bass, t, L); put(s, q.pad, t, L); put(l, q.lead, t, L); }
      t += L;
    }
    if (id === 'song') { const v = newTrack(p, 'audio', N('voice')); v.fx = chain(p, 'voiceClean'); if (rev) v.sends.push({ bus: rev.id, db: -14, pre: false, on: true }); p.tracks.push(v); const c = newTrack(p, 'audio', N('choirs')); c.fx = chain(p, 'voiceClean'); p.tracks.push(c); }
  } else if (id === 'voice') {
    for (const k2 of ['voice', 'voice2']) { const v = newTrack(p, 'audio', N(k2)); v.fx = chain(p, 'voiceClean'); p.tracks.push(v); }
    p.master.fx = chain(p, 'masterPodcast'); p.metro.on = false;
  } else if (id === 'video') {
    const s = newTrack(p, 'inst', N('pad')); s.inst = instPreset('strings'); p.tracks.push(s); if (rev) s.sends.push({ bus: rev.id, db: -6, pre: false, on: true });
    const k = newTrack(p, 'inst', N('keys')); k.inst = instPreset('fmBell'); p.tracks.push(k); if (rev) k.sends.push({ bus: rev.id, db: -8, pre: false, on: true });
    const d = drums(); d.vol = -6; const sfx = newTrack(p, 'audio', N('sfx')); p.tracks.push(sfx);
    // nappe sur tout le morceau, mélodie de cloches et batterie légère pendant le thème
    const PV = PROGRESSIONS.epic, pad = midiClipFrom(p, s, genChordNotes(p, PV, 4, 3, 11), 0, 64, N('pad')); pad.loop = true; pad.loopLen = 16;
    const mel = midiClipFrom(p, k, genMelody(p, PV, 4, 12), 16, 32, N('theme')); mel.loop = true; mel.loopLen = 16;
    const pat = genDrumPattern(p, 'pop', 13); d.inst!.patterns.push(pat); patternClip(p, d, pat, 16, 32);
    sec(0, 'intro', '#60a5fa'); sec(16, 'theme', '#f472b6'); sec(48, 'outro', '#60a5fa');
  }
  if (id !== 'voice') p.master.fx = chain(p, 'masterGentle');
  return p;
}

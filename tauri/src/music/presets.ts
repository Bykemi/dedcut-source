// DedCut Musique — préréglages d'origine DedCut (instruments, chaînes d'effets, mastering) et préréglages de l'utilisateur
// (sauvegarde, recherche, favoris, export / import dans un format versionné : « dedcut-music-preset », version 1).
import type { Fx, Inst } from './model';
import { defInst, deepClone, env, osc } from './model';
import { newFx } from './fx';
import { kitPads, multiZones } from './kits';

export interface InstPreset { id: string; cat: string; tags: string[]; make: () => Inst }
const S = (patch: (i: Inst) => void, type: Inst['type'] = 'synth') => () => { const i = defInst(type); patch(i); return i; };
export const INST_PRESETS: InstPreset[] = [
  { id: 'basic', cat: 'synth', tags: ['simple'], make: S(i => { i.o1 = osc('triangle', .8); i.o2 = osc('sine', 0); i.flt.cut = 8000; i.flt.env = 0; i.aenv = env(.005, .2, .8, .2); }) },
  { id: 'warmPad', cat: 'pad', tags: ['pad', 'chill'], make: S(i => { i.o1 = osc('sawtooth', .6); i.o2 = osc('sawtooth', .6, 0, 0, 9); i.uni = 3; i.det = 14; i.flt.cut = 1200; i.flt.env = 900; i.flt.res = 1; i.fenv = env(.8, 1.5, .5, 1.2); i.aenv = env(.9, 1, .85, 1.6); i.lfo = { wave: 'sine', rate: .3, sync: false, dest: 'cut', amt: .15 }; }) },
  { id: 'subBass', cat: 'bass', tags: ['bass', 'trap'], make: S(i => { i.o1 = osc('sine', 1); i.o2 = osc('triangle', .3, 1); i.flt.cut = 600; i.flt.env = 200; i.aenv = env(.004, .3, .9, .12); i.poly = 1; i.glide = .04; }) },
  { id: 'reeseBass', cat: 'bass', tags: ['bass', 'dnb'], make: S(i => { i.o1 = osc('sawtooth', .7, -1); i.o2 = osc('sawtooth', .7, -1, 0, 16); i.flt.cut = 500; i.flt.env = 1400; i.flt.res = 3; i.fenv = env(.01, .4, .2, .2); i.poly = 1; i.glide = .03; }) },
  { id: 'acidBass', cat: 'bass', tags: ['bass', 'acid'], make: S(i => { i.o1 = osc('sawtooth', .9); i.o2 = osc('square', 0); i.flt.cut = 300; i.flt.env = 3200; i.flt.res = 14; i.fenv = env(.002, .18, 0, .1); i.aenv = env(.002, .2, .8, .08); i.poly = 1; i.glide = .06; }) },
  { id: 'leadSaw', cat: 'lead', tags: ['lead', 'edm'], make: S(i => { i.o1 = osc('sawtooth', .7); i.o2 = osc('sawtooth', .5, 1, 0, -6); i.uni = 5; i.det = 18; i.flt.cut = 3500; i.flt.env = 2500; i.fenv = env(.005, .25, .5, .2); i.lfo = { wave: 'sine', rate: 5.5, sync: false, dest: 'pitch', amt: .04 }; }) },
  { id: 'squareLead', cat: 'lead', tags: ['lead', 'retro'], make: S(i => { i.o1 = osc('square', .7); i.o2 = osc('square', .3, 1); i.flt.cut = 4000; i.flt.env = 800; i.poly = 1; i.glide = .05; }) },
  { id: 'pluck', cat: 'pluck', tags: ['pluck', 'house'], make: S(i => { i.o1 = osc('sawtooth', .8); i.o2 = osc('square', .4, 1); i.flt.cut = 500; i.flt.env = 5000; i.fenv = env(.001, .16, 0, .1); i.aenv = env(.001, .35, 0, .25); }) },
  { id: 'keys', cat: 'keys', tags: ['keys'], make: S(i => { i.o1 = osc('triangle', .8); i.o2 = osc('sine', .5, 1); i.flt.cut = 3000; i.flt.env = 1500; i.fenv = env(.002, .6, .3, .4); i.aenv = env(.003, 1.4, .4, .5); }) },
  { id: 'organ', cat: 'keys', tags: ['keys', 'gospel'], make: S(i => { i.o1 = osc('sine', .7); i.o2 = osc('sine', .5, 1); i.noise = 0; i.flt.cut = 9000; i.flt.env = 0; i.aenv = env(.004, .05, 1, .06); i.lfo = { wave: 'sine', rate: 6, sync: false, dest: 'amp', amt: .15 }; }) },
  { id: 'strings', cat: 'pad', tags: ['strings', 'cinematic'], make: S(i => { i.o1 = osc('sawtooth', .6); i.o2 = osc('sawtooth', .5, 0, 0, -8); i.uni = 4; i.det = 10; i.flt.cut = 2600; i.flt.env = 400; i.aenv = env(.35, .5, .9, .7); i.lfo = { wave: 'sine', rate: 5, sync: false, dest: 'pitch', amt: .03 }; }) },
  { id: 'brass', cat: 'lead', tags: ['brass'], make: S(i => { i.o1 = osc('sawtooth', .8); i.o2 = osc('sawtooth', .5, 0, 0, 5); i.flt.cut = 700; i.flt.env = 2800; i.fenv = env(.06, .3, .5, .2); i.aenv = env(.05, .2, .85, .2); }) },
  { id: 'fmBell', cat: 'keys', tags: ['bell', 'fm'], make: S(i => { i.fm = { ratio: 3.5, index: 4, fb: 0, env: env(.001, 1.2, .1, .8), ratio2: 1, index2: 0 }; i.aenv = env(.001, 2, 0, 1.2); i.flt.cut = 12000; i.flt.env = 0; }, 'fm') },
  { id: 'fmEPiano', cat: 'keys', tags: ['keys', 'fm'], make: S(i => { i.fm = { ratio: 1, index: 2.2, fb: .2, env: env(.001, .8, .2, .4), ratio2: 14, index2: .1 }; i.aenv = env(.002, 1.5, .3, .5); i.flt.cut = 9000; i.flt.env = 0; }, 'fm') },
  { id: 'fmBass', cat: 'bass', tags: ['bass', 'fm'], make: S(i => { i.fm = { ratio: 1, index: 3, fb: .5, env: env(.001, .25, .1, .1), ratio2: 1, index2: 0 }; i.aenv = env(.002, .3, .8, .1); i.poly = 1; i.flt.cut = 3000; i.flt.env = 0; }, 'fm') },
  { id: 'waveGlass', cat: 'pad', tags: ['pad', 'wavetable'], make: S(i => { i.wave = { table: 'glass', pos: .1, env: .7 }; i.o2 = osc('sine', 0); i.uni = 2; i.det = 8; i.fenv = env(.01, 2, .5, 1); i.aenv = env(.4, 1, .8, 1.4); i.flt.cut = 6000; i.flt.env = 0; }, 'wave') },
  { id: 'waveVocal', cat: 'lead', tags: ['vocal', 'wavetable'], make: S(i => { i.wave = { table: 'vocal', pos: 0, env: 1 }; i.o2 = osc('sine', 0); i.fenv = env(.01, .8, .5, .5); i.aenv = env(.02, .4, .8, .4); i.flt.cut = 7000; i.flt.env = 0; }, 'wave') },
  { id: 'epianoMS', cat: 'keys', tags: ['keys', 'multisample'], make: S(i => { i.zones = multiZones('epiano', 0); i.aenv = env(.001, .1, 1, .4); i.flt.cut = 18000; i.flt.env = 0; i.flt.key = 0; }, 'sampler') },
  { id: 'pluckMS', cat: 'pluck', tags: ['guitar', 'multisample'], make: S(i => { i.zones = multiZones('pluck', 0); i.aenv = env(.001, .1, 1, .3); i.flt.cut = 18000; i.flt.env = 0; i.flt.key = 0; }, 'sampler') },
  { id: 'padMS', cat: 'pad', tags: ['pad', 'multisample'], make: S(i => { i.zones = multiZones('pad', 0); i.aenv = env(.3, .1, 1, 1.2); i.flt.cut = 18000; i.flt.env = 0; i.flt.key = 0; }, 'sampler') },
  ...['studio', 'machine', 'lofi', 'electro'].map(k => ({ id: 'kit-' + k, cat: 'drums', tags: ['drums', k], make: S(i => { i.pads = kitPads(k); }, 'drums') }))
];
export const instPreset = (id: string) => { const p = INST_PRESETS.find(x => x.id === id); if (!p) return null; const i = p.make(); i.preset = id; return i; };

/* ---------- chaînes d'effets et de mastering ---------- */
export interface ChainPreset { id: string; cat: 'voice' | 'inst' | 'drums' | 'bus' | 'master'; fx: [string, Record<string, number>][] }
export const CHAINS: ChainPreset[] = [
  { id: 'voiceClean', cat: 'voice', fx: [['eq', { hp: 90, m1f: 300, m1g: -2, m2f: 3500, m2g: 2, hf: 10000, hg: 2 }], ['deess', {}], ['comp', { thr: -20, ratio: 3, att: .005, rel: .12, makeup: 4 }], ['reverb', { size: 1.4, mix: .12 }]] },
  { id: 'voiceRap', cat: 'voice', fx: [['gate', { thr: -50 }], ['eq', { hp: 110, m1f: 250, m1g: -3, m2f: 4000, m2g: 3 }], ['comp', { thr: -24, ratio: 5, att: .003, rel: .08, makeup: 7 }], ['deess', { thr: -30 }], ['sat', { drive: 4, mix: .3, out: -2 }], ['delay', { sync: 5, fb: .2, mix: .1 }]] },
  { id: 'voiceRadio', cat: 'voice', fx: [['eq', { hp: 400, lp: 4000, m2f: 1800, m2g: 6 }], ['sat', { drive: 14, type: 1, out: -8 }], ['comp', { thr: -18, ratio: 6, makeup: 4 }]] },
  { id: 'voiceRepair', cat: 'voice', fx: [['dehum', {}], ['denoise', { amount: .6 }], ['declick', { sens: .4 }], ['eq', { hp: 80 }]] },
  { id: 'guitarAmp', cat: 'inst', fx: [['gate', { thr: -55 }], ['amp', { out: -4 }], ['eq', { hp: 80, m2f: 2500, m2g: 1 }], ['reverb', { size: 1.2, mix: .15 }]] },
  { id: 'drumBus', cat: 'drums', fx: [['comp', { thr: -14, ratio: 4, att: .02, rel: .1, makeup: 3 }], ['sat', { drive: 5, mix: .4, out: -2 }], ['eq', { lf: 80, lg: 2, hf: 9000, hg: 1.5 }]] },
  { id: 'lofiBus', cat: 'bus', fx: [['crush', { bits: 11, down: 2, mix: .5 }], ['eq', { hp: 60, lp: 7000 }], ['sat', { drive: 6, type: 2, mix: .5, out: -3 }], ['trem', { rate: .5, depth: .08 }]] },
  { id: 'masterGentle', cat: 'master', fx: [['eq', { hp: 25, lf: 90, lg: .5, hf: 11000, hg: 1 }], ['comp', { thr: -16, ratio: 1.8, att: .03, rel: .25, knee: 10, makeup: 1.5 }], ['limit', { ceil: -1, gain: 3 }]] },
  { id: 'masterLoud', cat: 'master', fx: [['eq', { hp: 30, lf: 80, lg: 1, hf: 10000, hg: 1.5 }], ['mbcomp', { thr: -20, ratio: 2.5 }], ['sat', { drive: 3, mix: .25, out: -1 }], ['limit', { ceil: -1, gain: 6 }]] },
  { id: 'masterPodcast', cat: 'master', fx: [['eq', { hp: 70 }], ['comp', { thr: -20, ratio: 3, makeup: 3 }], ['limit', { ceil: -1.5, gain: 4 }]] }
];
export function chainFx(c: ChainPreset, nextId: () => number): Fx[] { return c.fx.map(([t, p]) => { const f = newFx(nextId(), t); Object.assign(f.p, p); return f; }); }

/* ---------- préréglages de l'utilisateur ---------- */
export interface UserPreset { format: 'dedcut-music-preset'; version: 1; id: string; kind: 'inst' | 'fx' | 'chain'; name: string; tags: string[]; fav: boolean; at: number; data: Inst | Fx | Fx[] }
const KEY = 'dedcut-mus-presets';
export function userPresets(): UserPreset[] { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(validPreset) : []; } catch { return []; } }
function store(l: UserPreset[]) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* stockage plein ou bloqué */ } }
export function savePreset(kind: UserPreset['kind'], name: string, data: UserPreset['data'], tags: string[] = []): UserPreset {
  const p: UserPreset = { format: 'dedcut-music-preset', version: 1, id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), kind, name: name.slice(0, 80), tags, fav: false, at: Date.now(), data: deepClone(data) };
  store([...userPresets(), p]); return p;
}
export function updatePreset(id: string, patch: Partial<Pick<UserPreset, 'name' | 'tags' | 'fav'>>) { store(userPresets().map(p => p.id === id ? { ...p, ...patch } : p)); }
export function deletePreset(id: string) { store(userPresets().filter(p => p.id !== id)); }
export function searchPresets(q: string, kind?: UserPreset['kind']) { const s = q.trim().toLowerCase(); return userPresets().filter(p => (!kind || p.kind === kind) && (!s || p.name.toLowerCase().includes(s) || p.tags.some(t => t.toLowerCase().includes(s)))).sort((a, b) => +b.fav - +a.fav || b.at - a.at); }
export function validPreset(p: unknown): p is UserPreset {
  const o = p as UserPreset; return !!o && o.format === 'dedcut-music-preset' && typeof o.version === 'number' && o.version <= 1 && ['inst', 'fx', 'chain'].includes(o.kind) && typeof o.name === 'string' && !!o.data;
}
/** fichier .dcpreset : un ou plusieurs préréglages */
export const exportPresets = (l: UserPreset[]) => new Blob([JSON.stringify({ format: 'dedcut-music-presets', version: 1, presets: l }, null, 1)], { type: 'application/json' });
export function importPresets(text: string): number {
  const o = JSON.parse(text); const l: unknown[] = Array.isArray(o?.presets) ? o.presets : [o]; const ok = l.filter(validPreset).map(p => ({ ...p, id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e6) }));
  if (!ok.length) throw new Error('format'); store([...userPresets(), ...ok]); return ok.length;
}

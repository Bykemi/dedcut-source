// DedCut Musique — extensions d'effets (format « dedcut-music-ext », version 1).
// Une extension est un petit traitement du son en JavaScript, exécuté dans le fil audio (AudioWorklet) :
// - elle ne voit que les échantillons et ses réglages : pas d'interface, pas de réseau, pas de fichiers, pas de secrets ;
// - elle ne peut ni recouvrir ni modifier l'interface de DedCut (donc ni la zone « Soutenir DedCut ») ;
// - une erreur la coupe (le son passe sans elle) et la met en quarantaine ;
// - garde-fous : son code est lu (acorn) et chaque boucle / fonction vérifie le temps passé ; au-delà de 50 ms par bloc,
//   elle s'arrête. Sans cela, une boucle sans fin dans le fil audio gèlerait toute la page (vérifié), pas seulement le son.
// Elle partage le fil audio de l'espace Musique : ce n'est PAS une isolation de processus (voir MUSIQUE_EXTENSIONS.md).
import type { ParamDef } from './fx';

export interface ExtParam { k: string; label: string; min: number; max: number; def: number; step?: number; unit?: string }
export interface ExtManifest { format: 'dedcut-music-ext'; version: 1; id: string; name: string; author: string; ver: string; description: string; licence: string; source: string; params: ExtParam[]; init?: string; code: string }
export interface ExtRec extends ExtManifest { hash: string; on: boolean; quarantine: string; installed: number }
const KEY = 'dedcut-mus-ext', REVOKE = 'dedcut-mus-ext-revoked';
export const procName = (e: { id: string; hash: string }) => 'ext-' + e.id.replace(/[^a-z0-9-]/gi, '') + '-' + e.hash.slice(0, 10);
export async function sha256(s: string) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
export function list(): ExtRec[] { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
function store(l: ExtRec[]) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* rien */ } }
export const revoked = (): string[] => { try { return JSON.parse(localStorage.getItem(REVOKE) || '[]'); } catch { return []; } };
/** le code doit être un corps de fonction complet : il ne peut pas sortir de la fonction où DedCut le place (ici il est seulement compilé, jamais exécuté) */
const isBody = (code: string, args: string[]) => { try { new Function(...args, '"use strict";\n' + code + '\n'); return true; } catch { return false; } };
const isNum = (x: unknown) => typeof x === 'number' && isFinite(x);
/** vérifie le format ; renvoie la raison du refus ou '' */
export function validate(m: unknown): string {
  const o = m as ExtManifest; if (!o || o.format !== 'dedcut-music-ext') return 'format'; if (o.version !== 1) return 'version';
  if (typeof o.id !== 'string' || !/^[a-z0-9-]{2,40}$/i.test(o.id)) return 'id';
  if (typeof o.code !== 'string' || o.code.length > 60000 || (o.init != null && (typeof o.init !== 'string' || o.init.length > 20000))) return 'code';
  if (!Array.isArray(o.params) || o.params.length > 16 || o.params.some(p => !p || typeof p.k !== 'string' || !/^[a-z][a-z0-9]{0,15}$/i.test(p.k) || !isNum(p.min) || !isNum(p.max) || !isNum(p.def) || !(p.max > p.min) || typeof p.label !== 'string' || p.label.length > 40)) return 'params';
  if (![o.name, o.author, o.licence].every(x => typeof x === 'string' && x.trim() && x.length <= 80)) return 'meta';
  if (!isBody(o.code, ['inputs', 'outputs', 'params', 'state', 'sampleRate']) || !isBody(o.init || '', ['state', 'sampleRate'])) return 'code';
  return '';
}
/** installe ou met à jour (même identifiant : la version précédente est remplacée) */
export async function install(text: string): Promise<{ rec: ExtRec; updated: boolean }> {
  const m = JSON.parse(text) as ExtManifest, why = validate(m); if (why) throw new Error('mu.ext.bad.' + why);
  await guarded(m);
  const hash = await sha256(m.code + '\n' + (m.init || '') + '\n' + JSON.stringify(m.params)); if (revoked().includes(hash)) throw new Error('mu.ext.revoked');
  const l = list(), had = l.find(x => x.id === m.id), rec: ExtRec = { ...m, hash, on: true, quarantine: '', installed: Date.now() };
  store([...l.filter(x => x.id !== m.id), rec]); return { rec, updated: !!had };
}
export function setOn(id: string, on: boolean) { store(list().map(x => x.id === id ? { ...x, on, quarantine: on ? '' : x.quarantine } : x)); }
export function quarantine(id: string, why: string) { store(list().map(x => x.id === id ? { ...x, on: false, quarantine: why.slice(0, 200) } : x)); }
export function remove(id: string) { store(list().filter(x => x.id !== id)); }
/** retire et interdit cette version précise (empreinte) */
export function revoke(id: string) { const x = list().find(e => e.id === id); if (!x) return; try { localStorage.setItem(REVOKE, JSON.stringify([...new Set([...revoked(), x.hash])])); } catch { /* rien */ } remove(id); }
export const paramDefs = (e: ExtManifest): ParamDef[] => e.params.map(p => ({ k: p.k, min: p.min, max: p.max, step: p.step ?? (p.max - p.min) / 100, def: p.def, unit: p.unit }));

/** code chargé dans le fil audio : la fonction de l'extension reçoit seulement (entrées, sorties, réglages, état, fréquence) */
function moduleSource(e: ExtRec, g: { code: string; init: string }): string {
  const P = JSON.stringify(e.params.map(p => ({ name: p.k, defaultValue: p.def, minValue: p.min, maxValue: p.max, automationRate: 'k-rate' })));
  return `(() => { "use strict";
let __dcT = 0, __dcN = 0, __dcL = 50;
const __dcG = () => { if ((++__dcN & 255) === 0 && Date.now() - __dcT > __dcL) throw new Error('timeout'); };
const USER = (function () { "use strict"; const registerProcessor = undefined, globalThis = undefined, self = undefined, port = undefined; return function (inputs, outputs, params, state, sampleRate) {\n${g.code}\n}; })();
const INIT = (function () { "use strict"; const registerProcessor = undefined, globalThis = undefined, self = undefined; return function (state, sampleRate) {\n${g.init}\n}; })();
registerProcessor(${JSON.stringify(procName(e))}, class extends AudioWorkletProcessor {
  static get parameterDescriptors() { return ${P}; }
  constructor() { super(); this.s = {}; this.dead = false; try { __dcT = Date.now(); __dcN = 0; __dcL = 500; INIT(this.s, sampleRate); } catch (x) { this.dead = true; this.port.postMessage({ err: 'init: ' + (x && x.message || x) }); } }
  process(i, o, p) {
    const a = i[0], b = o[0];
    if (!this.dead) { try { __dcT = Date.now(); __dcN = 0; __dcL = 50; USER(a, b, p, this.s, sampleRate); for (const c of b) for (let k = 0; k < c.length; k++) { const v = c[k]; if (v !== v || v > 8 || v < -8) { this.dead = true; this.port.postMessage({ err: 'signal' }); break; } } } catch (x) { this.dead = true; this.port.postMessage({ err: String(x && x.message || x) }); } }
    if (this.dead) for (let c = 0; c < b.length; c++) { const s = a && a[Math.min(c, a.length - 1)]; if (s) b[c].set(s); else b[c].fill(0); }
    return true;
  }
}); })();`;
}
const loaded = new WeakMap<BaseAudioContext, Set<string>>();
/** protège le fil audio avant de charger du code extérieur : plus de fabrication de code (eval, Function, WebAssembly),
 *  plus d'expressions régulières (calculs sans fin possibles), plus d'attente bloquante (Atomics), objets de base gelés */
const FREEZE = `(() => {
  const protos = [function () {}, async function () {}, function* () {}, async function* () {}].map(f => Object.getPrototypeOf(f));
  for (const p of protos) Object.defineProperty(p, 'constructor', { value: undefined });
  for (const k of ['eval', 'Function', 'WebAssembly', 'Atomics', 'RegExp', 'SharedArrayBuffer', 'Promise', 'queueMicrotask']) { try { Object.defineProperty(globalThis, k, { value: undefined }); } catch (x) { /* rien */ } }
  for (const k of ['match', 'matchAll', 'search', 'replace', 'replaceAll', 'split']) Object.defineProperty(String.prototype, k, { value: undefined });
  for (const o of [Math, Object.prototype, Array.prototype, ...protos, Float32Array.prototype, Float64Array.prototype, Int32Array.prototype, Uint8Array.prototype, JSON, Number.prototype, String.prototype, Object, Array, Date, Reflect]) Object.freeze(o);
})();`;
/* garde-fous : chaque boucle et chaque fonction de l'extension appelle __dcG(), qui l'arrête (erreur → quarantaine)
   si elle dépasse 50 ms dans un même bloc de son. Sans cela, une boucle sans fin gèlerait tout DedCut, pas seulement le son. */
type AstNode = { type: string; start: number; end: number; body?: AstNode; name?: string; regex?: unknown; [k: string]: unknown };
let acornP: Promise<typeof import('acorn')> | null = null;
export async function guardCode(code: string, args: string[]): Promise<string> {
  const { parse } = await (acornP ||= import('acorn'));
  let ast: AstNode; try { ast = parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }) as unknown as AstNode; } catch { throw new Error('mu.ext.bad.code'); }
  const G = '__dcG();', ed: { at: number; txt: string; k: number }[] = [];
  const open = (at: number, txt: string, from: number) => ed.push({ at, txt, k: 1e9 + from }), close = (at: number, txt: string, from: number) => ed.push({ at, txt, k: -from });
  const stmt = (b: AstNode) => { if (b.type === 'BlockStatement') open(b.start + 1, G, b.start); else { open(b.start, '{' + G, b.start); close(b.end, '}', b.start); } };
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    if (!n || typeof n !== 'object' || typeof (n as AstNode).type !== 'string') return;
    const a = n as AstNode;
    if (a.type === 'Identifier' && /^__dc/i.test(a.name || '')) throw new Error('mu.ext.bad.code');
    if (a.type === 'Literal' && a.regex) throw new Error('mu.ext.bad.code');
    // pas d'asynchrone : la suite tournerait après le bloc de son, hors de la surveillance
    if (a.async === true || a.type === 'AwaitExpression') throw new Error('mu.ext.bad.code');
    if (/^(While|DoWhile|For|ForIn|ForOf)Statement$/.test(a.type) && a.body) stmt(a.body);
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(a.type) && a.body) { const b = a.body; if (b.type === 'BlockStatement') open(b.start + 1, G, b.start); else { open(b.start, '(__dcG(), ', b.start); close(b.end, ')', b.start); } }
    for (const k in a) if (k !== 'type' && k !== 'start' && k !== 'end') walk(a[k]);
  };
  walk(ast);
  // appliquées de la fin vers le début ; à une même position, le texte final donne d'abord les fermetures (la plus intérieure en premier), puis les ouvertures
  ed.sort((x, y) => y.at - x.at || y.k - x.k);
  let out = code; for (const e of ed) out = out.slice(0, e.at) + e.txt + out.slice(e.at);
  if (!isBody(out, args)) throw new Error('mu.ext.bad.code');
  return out;
}
const guarded = async (e: ExtManifest) => ({ code: await guardCode(e.code, ['inputs', 'outputs', 'params', 'state', 'sampleRate']), init: await guardCode(e.init || '', ['state', 'sampleRate']) });
export async function loadExt(ctx: BaseAudioContext, e: ExtRec): Promise<void> {
  let s = loaded.get(ctx); if (!s) { s = new Set(); loaded.set(ctx, s); const u = URL.createObjectURL(new Blob([FREEZE], { type: 'application/javascript' })); try { await ctx.audioWorklet.addModule(u); } finally { URL.revokeObjectURL(u); } }
  const n = procName(e); if (s.has(n)) return; if (validate(e)) throw new Error('mu.ext.bad.code');
  const u = URL.createObjectURL(new Blob([moduleSource(e, await guarded(e))], { type: 'application/javascript' })); try { await ctx.audioWorklet.addModule(u); s.add(n); } finally { URL.revokeObjectURL(u); }
}
/** exemples d'origine DedCut (servent aussi de documentation du kit de développement) */
export const EXAMPLES: ExtManifest[] = [
  { format: 'dedcut-music-ext', version: 1, id: 'exemple-tremolo', name: 'Trémolo (exemple)', author: 'DedCut', ver: '1.0.0', description: 'Volume qui ondule.', licence: 'MIT', source: 'DedCut', params: [{ k: 'rate', label: 'Vitesse (Hz)', min: .1, max: 15, def: 4 }, { k: 'depth', label: 'Profondeur', min: 0, max: 1, def: .5 }],
    init: 'state.ph = 0;', code: 'const r = params.rate[0], d = params.depth[0];\nfor (let k = 0; k < outputs[0].length; k++) {\n  state.ph += r / sampleRate; const g = 1 - d * (0.5 + 0.5 * Math.sin(2 * Math.PI * state.ph));\n  for (let c = 0; c < outputs.length; c++) { const x = inputs && inputs[Math.min(c, inputs.length - 1)]; outputs[c][k] = x ? x[k] * g : 0; }\n}' },
  { format: 'dedcut-music-ext', version: 1, id: 'exemple-fold', name: 'Repli d\'onde (exemple)', author: 'DedCut', ver: '1.0.0', description: 'Distorsion par repli du signal.', licence: 'MIT', source: 'DedCut', params: [{ k: 'drive', label: 'Attaque', min: 1, max: 10, def: 3 }, { k: 'mix', label: 'Mélange', min: 0, max: 1, def: .7 }],
    code: 'const g = params.drive[0], m = params.mix[0];\nfor (let c = 0; c < outputs.length; c++) { const x = inputs && inputs[Math.min(c, inputs.length - 1)], y = outputs[c]; if (!x) { y.fill(0); continue; }\n  for (let k = 0; k < y.length; k++) { const v = Math.sin(x[k] * g * 1.5); y[k] = x[k] * (1 - m) + v * m * 0.7; } }' }
];
/** documentation du kit (affichée dans DedCut et écrite dans MUSIQUE_EXTENSIONS.md) */
export const SDK_DOC = `Format : JSON { format: "dedcut-music-ext", version: 1, id, name, author, ver, description, licence, source, params: [{ k, label, min, max, def }], init?, code }.
code : corps d'une fonction (inputs, outputs, params, state, sampleRate) appelée pour chaque bloc de 128 échantillons. inputs / outputs : un tableau par canal.
params.<k>[0] : valeur du réglage. state : objet gardé entre deux appels (préparé par init). Rien d'autre n'est accessible.
Refusé : expressions régulières, async / await, noms commençant par __dc. Plus de 50 ms dans un bloc (500 ms pour init) : l'extension est arrêtée et mise en quarantaine.`;
/** effet « ext:<id> » d'une piste : l'extension si elle est installée et active, sinon le son passe tel quel (réglages gardés) */
export function buildExt(ctx: BaseAudioContext, f: { type: string; p: Record<string, number> }, onErr: (id: string, why: string) => void): import('./fx').FxNode {
  const id = f.type.slice(4), e = list().find(x => x.id === id && x.on && !x.quarantine), sets = loaded.get(ctx);
  if (!e || !sets?.has(procName(e))) { const g = ctx.createGain(); return { inp: g, out: g, params: {}, latency: 0, now: () => ctx.currentTime, dispose: () => { try { g.disconnect(); } catch { /* rien */ } }, missing: true } as import('./fx').FxNode; }
  const n = new AudioWorkletNode(ctx, procName(e), { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] }), params: Record<string, AudioParam> = {};
  for (const p of e.params) { const a = n.parameters.get(p.k); if (a) { params[p.k] = a; a.value = f.p[p.k] ?? p.def; } }
  n.port.onmessage = ev => { if (ev.data?.err) { quarantine(e.id, ev.data.err); onErr(e.id, ev.data.err); } };
  n.onprocessorerror = () => { quarantine(e.id, 'processorerror'); onErr(e.id, 'processorerror'); };
  return { inp: n, out: n, params, latency: 0, now: () => ctx.currentTime, dispose: () => { try { n.disconnect(); } catch { /* rien */ } } };
}
/** charge dans un contexte toutes les extensions utilisées par un projet */
export async function loadUsed(ctx: BaseAudioContext, types: string[]): Promise<string[]> {
  const bad: string[] = [];
  for (const t of new Set(types.filter(x => x.startsWith('ext:')))) { const e = list().find(x => x.id === t.slice(4) && x.on && !x.quarantine); if (!e) { bad.push(t.slice(4)); continue; } try { await loadExt(ctx, e); } catch (x) { quarantine(e.id, String(x)); bad.push(e.id); } }
  return bad;
}

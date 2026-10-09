// DedCut Musique — chef d'orchestre de l'espace : projet, moteur audio, historique, fichiers, sauvegarde automatique,
// enregistrement, MIDI, sécurité (protection du volume, larsen, extension qui bloque le son), réglages et vue.
import { useSyncExternalStore } from 'react';
import { t } from '../i18n';
import type { Asset, AudioClip, Clip, MidiClip, Note, PatternClip, Project, Track, TrackKind } from './model';
import { barOf, barStart, b2s, bpmAt, clipEnd, deepClone, midiOf, newMidi, newProject, newTrack, nid, s2b, trackOf } from './model';
import { Engine, Store, renderProject, type RenderOpts } from './engine';
import { History } from './history';
import { Midi, loadMaps, readSmf, saveMaps, smfToMidi, writeSmf, type MidiMap, type MidiMsg } from './midi';
import * as IO from './io';
import { fromTemplate, type TemplateId } from './templates';
import { list as extList, quarantine } from './ext';
import { deleteClips, findClip, songEnd } from './ops';
import { decodeWav, type Chans } from './dsp';
import { instPreset } from './presets';
import { genCatalog } from './kits';
import { FX_DEFS } from './fx';

/* ---------- réglages de l'utilisateur (gardés sur ce PC) ---------- */
export interface Settings {
  lat: 'interactive' | 'balanced' | 'playback' | 'custom'; latSec: number; out: string; lowPC: boolean; safeExt: boolean;
  keys: Record<string, string>; autosaveSec: number; latCompMs: number; follow: boolean; editorH: number; browser: boolean; vel: number; oct: number;
}
export const DEF_KEYS: Record<string, string> = {
  play: 'space', record: 'r', loop: 'l', metro: 'm', home: 'home', undo: 'ctrl+z', redo: 'ctrl+y', save: 'ctrl+s', open: 'ctrl+o', new: 'ctrl+n',
  dup: 'ctrl+d', del: 'delete', split: 's', selAll: 'ctrl+a', copy: 'ctrl+c', paste: 'ctrl+v', zoomIn: '+', zoomOut: '-', tabPiano: '1', tabSteps: '2', tabClip: '3',
  tabInst: '4', tabFx: '5', tabMixer: '6', tabSession: '7', export: 'ctrl+e', panic: 'ctrl+shift+p', quantize: 'q', addMarker: 'ctrl+m', toolDraw: 'b', toolSelect: 'v'
};
const SKEY = 'dedcut-music-settings';
function loadSettings(): Settings {
  const d: Settings = { lat: 'interactive', latSec: .02, out: '', lowPC: false, safeExt: false, keys: { ...DEF_KEYS }, autosaveSec: 30, latCompMs: 0, follow: true, editorH: Math.max(240, Math.round((typeof innerHeight === 'number' ? innerHeight : 900) * .4)), browser: true, vel: 100, oct: 4 };
  try { const o = JSON.parse(localStorage.getItem(SKEY) || '{}'); return { ...d, ...o, keys: { ...DEF_KEYS, ...(o.keys || {}) } }; } catch { return d; }
}

/* ---------- petits messages ---------- */
export function toast(msg: string) {
  const w = window as unknown as { toast?: (m: string) => void };
  if (w.toast) { w.toast(msg); return; }
  let el = document.getElementById('muToast'); if (!el) { el = document.createElement('div'); el.id = 'muToast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on'); clearTimeout((el as HTMLElement & { _t?: number })._t); (el as HTMLElement & { _t?: number })._t = window.setTimeout(() => el!.classList.remove('on'), 2800);
}
/** texte d'une erreur : clé de traduction « mu.… » ou message brut */
export function errText(e: unknown): string { const m = String((e as Error)?.message || e || ''); return m.startsWith('mu.') ? t(m) : t('mu.err.other', { error: m.slice(0, 140) }); }
/** question oui / non (fenêtre de DedCut) */
export const ask = async (msg: string) => { const a = (window as unknown as { askYes?: (m: string) => Promise<boolean> }).askYes; return a ? a(msg) : window.confirm(msg); };
/** petite fenêtre de saisie dans l'espace Musique (les boîtes de Windows ne bloquent pas dans le logiciel) */
export function askText(label: string, def = ''): Promise<string | null> {
  return new Promise(done => {
    const host = document.getElementById('muApp') || document.body, m = document.createElement('div'); m.className = 'mu-modal';
    m.innerHTML = '<div class="mu-mbox" role="dialog" aria-modal="true"><h3></h3><input class="mu-asktxt" maxlength="120"><div class="mu-btns"><button class="no"></button><button class="pri ok"></button></div></div>';
    const h = m.querySelector('h3')!, inp = m.querySelector('input')!, no = m.querySelector('.no') as HTMLButtonElement, ok = m.querySelector('.ok') as HTMLButtonElement;
    h.textContent = label; inp.value = def; inp.setAttribute('aria-label', label); no.textContent = t('common.cancel'); ok.textContent = t('common.ok');
    const fin = (v: string | null) => { m.remove(); done(v); };
    ok.onclick = () => fin(inp.value.trim() || null); no.onclick = () => fin(null); m.onpointerdown = e => { if (e.target === m) fin(null); };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') fin(inp.value.trim() || null); if (e.key === 'Escape') fin(null); };
    host.appendChild(m); inp.focus(); inp.select();
  });
}

export type Tab = 'piano' | 'steps' | 'clip' | 'inst' | 'fx' | 'mixer' | 'session' | 'score';
export type Tool = 'select' | 'draw' | 'split' | 'erase';
/** journal : seulement des évènements techniques (jamais de nom de fichier, de chemin ni de contenu) */
export interface LogEntry { at: number; k: string; n: number }

class MusicState {
  p: Project = newProject(t('mu.untitled'));
  ctx: AudioContext | null = null; eng: Engine | null = null; store = new Store(48000); hist = new History(); midi = new Midi();
  set: Settings = loadSettings(); maps: MidiMap[] = loadMaps();
  v = 0; private subs = new Set<() => void>();
  view = { zoom: 28, sx: 0, sy: 0, tab: 'piano' as Tab, tool: 'select' as Tool, prTool: 'draw' as 'select' | 'draw', pz: 12, py: 60 * 12 - 300, grid: .25, laneCC: 'vel' };
  sel = { track: 0, clips: new Set<number>(), clip: 0, notes: new Set<number>(), range: null as { a: number; b: number } | null };
  dialog: string | null = null; dialogArg: unknown = null;
  /** effet affiché dans l'onglet Effets (piste choisie ou master) */
  fxSel = { master: false, id: 0 };
  clipboard: { clips: { track: number; c: Clip; notes?: Note[] }[]; at: number } | null = null;
  recState = { on: false, armed: 0 }; log: LogEntry[] = []; busy = ''; missing: Asset[] = []; ready = false;
  private autoT = 0; private wd = 0; private lastCT = -1; private stuck = 0; private hot = 0; held = new Map<number, number>();
  learnTarget: string | null = null; slots = new Map<number, number>(); // vue session : piste → index de case lancée

  /* ---------- abonnement de l'interface ---------- */
  on(f: () => void) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  emit() { this.v++; for (const f of this.subs) f(); }
  logEv(k: string) { const l = this.log.find(x => x.k === k); if (l) { l.n++; l.at = Date.now(); } else this.log.push({ at: Date.now(), k, n: 1 }); if (this.log.length > 60) this.log.shift(); }
  saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(this.set)); } catch { /* rien */ } }

  /* ---------- moteur ---------- */
  latencyHint(): AudioContextLatencyCategory | number { return this.set.lat === 'custom' ? Math.max(.003, Math.min(.5, this.set.latSec)) : this.set.lowPC && this.set.lat === 'interactive' ? 'balanced' : this.set.lat; }
  /** (re)crée le contexte audio et le moteur (fréquence, taille du tampon ou sortie changées, ou son bloqué) */
  async rebuild(): Promise<void> {
    const wasPlaying = !!this.eng?.playing, pos = this.eng ? this.eng.now() : 0;
    if (this.eng) { this.eng.dispose(); this.eng = null; }
    if (this.ctx) { try { await this.ctx.close(); } catch { /* rien */ } this.ctx = null; }
    let ctx: AudioContext;
    try { ctx = new AudioContext({ sampleRate: this.p.sr, latencyHint: this.latencyHint() }); }
    catch { ctx = new AudioContext({ latencyHint: this.latencyHint() }); this.logEv('srFallback'); toast(t('mu.dev.srFallback', { sr: String(ctx.sampleRate) })); }
    this.ctx = ctx;
    const sink = (ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> }).setSinkId;
    if (this.set.out && sink) { try { await sink.call(ctx, this.set.out); } catch { this.logEv('sinkFail'); toast(t('mu.dev.outGone')); this.set.out = ''; this.saveSettings(); } }
    if (this.store.sr !== ctx.sampleRate) { const old = this.store; this.store = new Store(ctx.sampleRate); for (const [k, b] of old.map) if (!k.startsWith('gen:')) this.store.map.set(k, b); }
    // le nouveau moteur n'est rendu visible (this.eng) qu'une fois prêt : avant, l'interface pouvait l'interroger à moitié construit
    const e = new Engine(ctx, this.p, this.store);
    e.latComp = this.set.latCompMs / 1000;
    e.recWarn = k => { this.logEv(k); toast(t(k)); };
    e.onExtErr = (id, why) => { this.logEv('extErr'); toast(t('mu.ext.stopped', { name: id, why: why.slice(0, 80) })); this.eng?.sync(); this.emit(); };
    e.onTick = () => this.onTick();
    if (!this.set.safeExt) { const bad = await e.loadExts(); if (bad.length) toast(t('mu.ext.missing', { list: bad.join(', ') })); }
    await e.init(); this.eng = e;
    ctx.onstatechange = () => this.emit();
    if (wasPlaying) { e.pos = pos; void e.play(pos); }
    this.ready = true; this.emit();
  }
  /** une seule initialisation : les appels simultanés attendent la même (le moteur est prêt quand elle se termine) */
  private initP: Promise<void> | null = null;
  init(): Promise<void> {
    if (!this.initP) this.initP = this.initOnce().catch(e => { this.initP = null; throw e; });
    return this.initP;
  }
  private async initOnce() {
    await this.rebuild(); this.hist.reset(this.p);
    // sécurité : son bloqué (extension en boucle sans fin), larsen ; sauvegarde automatique
    clearInterval(this.wd); this.wd = window.setInterval(() => this.watch(), 500);
    navigator.mediaDevices?.addEventListener?.('devicechange', () => { this.logEv('devChange'); toast(t('mu.dev.changed')); this.emit(); });
    await this.checkRecover();
  }
  private watch() {
    const c = this.ctx, e = this.eng; if (!c || !e) return;
    // l'horloge du son n'avance plus alors que le son tourne (3 s) : une extension bloque le fil audio → quarantaine et relance (une fois) ;
    // sans extension, c'est la sortie audio qui ne démarre pas (casque Bluetooth qui se réveille, sortie débranchée) : on prévient, sans relancer
    if (c.state === 'running' && e.playing) {
      if (c.currentTime === this.lastCT) {
        if (++this.stuck >= 6) {
          this.stuck = 0;
          if (this.usedExts().length && !this.stuckDone) { this.stuckDone = true; void this.audioStuck(); }
          else if (!this.silentWarned) { this.silentWarned = true; this.logEv('silentOut'); toast(t('mu.dev.silent')); }
        }
      } else this.stuck = 0;
      this.lastCT = c.currentTime;
    } else { this.stuck = 0; this.stuckDone = false; this.silentWarned = false; }
    // larsen : écoute de contrôle active et sortie au maximum plusieurs fois de suite → écoute coupée
    const mon = this.p.tracks.some(x => x.mon);
    if (mon && e.mv.peak > -0.8) { if (++this.hot >= 3) { this.hot = 0; for (const x of this.p.tracks) if (x.mon) { x.mon = false; void e.monitor(x, false); } this.logEv('feedback'); toast(t('mu.safe.feedback')); this.emit(); } } else this.hot = 0;
    if (e.late > 0 && e.playing) this.logEv('late');
  }
  private stuckDone = false; private silentWarned = false;
  /** extensions utilisées par le projet (seul code extérieur qui tourne dans le fil audio) */
  private usedExts(): string[] { return [...new Set([...this.p.tracks.flatMap(x => x.fx.map(f => f.type)), ...this.p.master.fx.map(f => f.type)].filter(x => x.startsWith('ext:')).map(x => x.slice(4)))]; }
  private async audioStuck() {
    const used = this.usedExts();
    for (const id of used) quarantine(id, 'stuck');
    this.logEv('stuck'); toast(t('mu.ext.stuck', { list: used.join(', ') || '—' }));
    await this.rebuild();
  }
  private lastTick = 0;
  private onTick() {
    // pendant la lecture : l'interface suit la tête de lecture ~10 fois par seconde (les vues dessinent elles-mêmes à chaque image)
    const now = performance.now(); if (now - this.lastTick > 100) { this.lastTick = now; for (const f of this.posSubs) f(); }
    const e = this.eng; if (e?.playing && !this.p.loop.on && !e.recording && !e.session && e.now() > Math.max(songEnd(this.p), 4) + 8) { this.stop(); }
  }
  posSubs = new Set<() => void>();
  onPos(f: () => void) { this.posSubs.add(f); return () => { this.posSubs.delete(f); }; }
  pos() { return this.eng ? this.eng.now() : 0; }

  /* ---------- modifications (toujours annulables) ---------- */
  /** applique une modification du projet, l'ajoute à l'historique, met le son à jour ; resched = replanifier la lecture */
  act(label: string, fn: (p: Project) => void, resched = false) {
    if (this.recState.on) { toast(t('mu.rec.busy')); return; }
    fn(this.p);
    if (this.hist.commit(this.p, label)) { this.p.dirty = true; this.scheduleAutosave(); }
    this.sync(resched); this.emit();
  }
  sync(resched = false) { const e = this.eng; if (!e) return; e.p = this.p; if (resched && e.playing) e.resync(); else e.sync(); }
  undo() { if (this.recState.on) return; const np = this.hist.undo(this.p); if (!np) { toast(t('mu.h.nothing')); return; } const lbl = this.hist.redoLabel(); this.p = np; this.fixSel(); this.sync(true); this.scheduleAutosave(); toast(t('mu.h.undone', { what: t(lbl) })); this.emit(); }
  redo() { if (this.recState.on) return; const np = this.hist.redo(this.p); if (!np) return; this.p = np; this.fixSel(); this.sync(true); this.scheduleAutosave(); toast(t('mu.h.redone', { what: t(this.hist.undoLabel()) })); this.emit(); }
  private fixSel() { if (!trackOf(this.p, this.sel.track)) this.sel.track = this.p.tracks[0]?.id || 0; const ids = new Set(this.p.tracks.flatMap(x => [...x.clips, ...(x.pool || [])].map(c => c.id))); for (const id of [...this.sel.clips]) if (!ids.has(id)) this.sel.clips.delete(id); if (!ids.has(this.sel.clip)) this.sel.clip = 0; }

  /* ---------- sélection ---------- */
  get track(): Track | null { return trackOf(this.p, this.sel.track) || null; }
  get clip(): { t: Track; c: Clip } | null { if (!this.sel.clip) return null; const f = findClip(this.p, this.sel.clip); if (f) return f; for (const tr of this.p.tracks) { const c = (tr.pool || []).find(x => x.id === this.sel.clip); if (c) return { t: tr, c }; } return null; }
  selectTrack(id: number) { this.sel.track = id; this.emit(); }
  selectClip(id: number, add = false) {
    if (!add) this.sel.clips.clear(); if (id) { if (add && this.sel.clips.has(id)) this.sel.clips.delete(id); else this.sel.clips.add(id); }
    const f = id ? findClip(this.p, id) : null; if (f) { this.sel.clip = id; this.sel.track = f.t.id; this.sel.notes.clear(); if (!add) this.view.tab = f.c.kind === 'audio' ? 'clip' : f.c.kind === 'pattern' ? 'steps' : this.view.tab === 'steps' || this.view.tab === 'clip' ? 'piano' : this.view.tab; }
    this.emit();
  }

  /* ---------- transport ---------- */
  async play(from?: number) {
    await this.init(); const e = this.eng!; if (e.playing) return;
    try { await e.play(from ?? e.pos, 0); } catch (x) { toast(errText(x)); }
    this.emit();
  }
  stop() {
    const e = this.eng; if (!e) return;
    if (this.recState.on) { void this.stopRecord(); return; }
    const wrote = this.p.tracks.some(x => x.auto.some(l => l.mode === 'write' || l.mode === 'touch' || l.mode === 'latch'));
    e.stop(); e.session = null; this.slots.clear(); this.previewing = null;
    // écriture d'automation pendant la lecture : une seule étape d'historique, annulable (protection contre l'écrasement)
    if (wrote && this.hist.commit(this.p, 'mu.h.autoWrite')) { this.scheduleAutosave(); toast(t('mu.auto.written')); }
    this.emit();
  }
  toggle() { if (this.eng?.playing) this.stop(); else void this.play(); }
  seek(b: number) { const e = this.eng; if (!e) { return; } e.seek(Math.max(0, b)); this.emit(); for (const f of this.posSubs) f(); }
  home() { this.seek(this.p.loop.on ? this.p.loop.a : 0); }
  /** arrête toutes les notes (notes bloquées) : instruments, clavier, appareils MIDI extérieurs */
  panic() { const e = this.eng; if (e && this.ctx) for (const s of e.strips.values()) s.player?.allOff(this.ctx.currentTime, true); this.midi.panic(); this.held.clear(); this.logEv('panic'); toast(t('mu.midi.panicDone')); }

  /* ---------- enregistrement ---------- */
  async record() {
    await this.init(); const e = this.eng!;
    if (this.recState.on) { await this.stopRecord(); return; }
    const armed = this.p.tracks.filter(x => x.arm && !x.lock); if (!armed.length) { toast(t('mu.rec.noArm')); return; }
    const F = IO.fs();
    // place libre : prévenir avant de commencer
    if (F) { try { const d = await F.dir(); if (d.free && d.free < 300e6) toast(t('mu.rec.diskLow')); } catch { /* rien */ } }
    const disk = F ? { open: (id: string, meta: string) => F.recOpen(id, meta), append: (id: string, b: Uint8Array) => F.recAppend(id, b) } : null;
    try { await e.record(e.pos, this.p.metro.countIn, disk); this.recState = { on: true, armed: armed.length }; this.logEv('record'); }
    catch (x) { toast(errText(x)); this.logEv('recFail'); }
    this.emit();
  }
  async stopRecord() {
    const e = this.eng; if (!e) return; const F = IO.fs();
    const res = await e.stopRecord(); this.recState = { on: false, armed: 0 };
    for (const r of res.assets) {
      const tr = trackOf(this.p, r.track), a: Asset = { id: r.id, name: (tr?.name || 'prise') + ' ' + new Date().toLocaleTimeString().slice(0, 5), path: null, sr: e.sr, ch: r.ch.length, len: r.ch[0].length / e.sr, hash: r.id, origin: 'record', licence: 'user', tags: ['take'], bpm: 0, key: '' };
      await IO.persistSound(this.p, this.store, a, r.ch, 'Prises');
      // la prise est maintenant un vrai fichier WAV : le brouillon écrit au fil de l'eau peut partir
      if (F) { try { await F.recClose(r.file); if (a.path) await F.recDrop(r.file); } catch { /* rien */ } }
    }
    if (res.clips) { this.hist.commit(this.p, 'mu.h.record'); this.scheduleAutosave(); toast(t('mu.rec.done', { n: String(res.clips) })); }
    this.sync(); this.emit();
  }

  /* ---------- jeu en direct : clavier de l'ordinateur, clavier MIDI ---------- */
  playTrack(): Track | null { const a = this.p.tracks.find(x => x.arm && (x.kind === 'inst' || x.kind === 'drum')); const s = this.track; return a || (s && (s.kind === 'inst' || s.kind === 'drum') ? s : null); }
  async noteOn(p: number, v = this.set.vel) { await this.init(); const tr = this.playTrack(); if (!tr || !this.eng) return; if (this.ctx!.state !== 'running') await this.ctx!.resume(); this.held.set(p, tr.id); this.eng.liveOn(tr.id, p, v); this.midiOutLive(tr, [0x90, p, v]); }
  noteOff(p: number) { const id = this.held.get(p); if (id == null || !this.eng) return; this.held.delete(p); this.eng.liveOff(id, p); const tr = trackOf(this.p, id); if (tr) this.midiOutLive(tr, [0x80, p, 0]); }
  private midiOutLive(tr: Track, data: number[]) { if (tr.midiOut) this.midi.send(tr.midiOut, data); }
  async startMidi(): Promise<boolean> {
    const ok = await this.midi.start(); if (!ok) { toast(t('mu.midi.fail')); return false; }
    this.midi.onMsg = (m, dev) => this.onMidi(m, dev); this.midi.onChange = () => { this.logEv('midiChange'); this.emit(); };
    this.emit(); return true;
  }
  private onMidi(m: MidiMsg, _dev: string) {
    void _dev;
    if (m.kind === 'on') { void this.noteOn(m.p, m.v); return; }
    if (m.kind === 'off') { this.noteOff(m.p); return; }
    const tr = this.playTrack();
    if (m.kind === 'cc') {
      const map = this.maps.find(x => x.key === m.ch + ':' + m.num); if (map) { this.applyMap(map, m.val / 127); return; }
      if (tr && this.eng) this.eng.liveCC(tr.id, m.num, m.val);
    } else if (m.kind === 'pb' && tr && this.eng) this.eng.liveBend(tr.id, m.v);
  }
  /** apprentissage : le prochain bouton tourné sur le contrôleur pilotera ce réglage */
  learn(target: string) {
    if (!this.midi.access) { void this.startMidi().then(ok => { if (ok) this.learn(target); }); return; }
    this.learnTarget = target; toast(t('mu.midi.learning'));
    this.midi.learn = m => { if (m.kind !== 'cc') return; const key = m.ch + ':' + m.num; this.maps = [...this.maps.filter(x => x.key !== key && x.target !== target), { key, target, min: 0, max: 1 }]; saveMaps(this.maps); this.learnTarget = null; toast(t('mu.midi.learned', { cc: String(m.num) })); this.emit(); };
    this.emit();
  }
  /** réglage piloté : « t:<piste>:vol », « t:<piste>:pan », « m:vol », « fx:<piste>:<effet>:<réglage> », « i:<piste>:cut » */
  applyMap(map: MidiMap, x: number) {
    const [k, a, b, c] = map.target.split(':'), p = this.p, tr = a ? trackOf(p, +a) : null, lerp = (lo: number, hi: number) => lo + (hi - lo) * x;
    if (k === 'm') { p.master.vol = lerp(-60, 6); }
    else if (k === 't' && tr) { if (b === 'vol') { tr.vol = lerp(-60, 6); this.eng?.autoInput(tr.id, 'vol', tr.vol); } else if (b === 'pan') { tr.pan = lerp(-1, 1); this.eng?.autoInput(tr.id, 'pan', tr.pan); } }
    else if (k === 'fx' && tr) { const f = tr.fx.find(y => y.id === +b); const d = f && (FX_DEFS[f.type]?.params.find(q => q.k === c)); if (f && d) { f.p[c] = d.log ? d.min * Math.pow(d.max / d.min, x) : lerp(d.min, d.max); this.eng?.autoInput(tr.id, 'fx:' + b + ':' + c, f.p[c]); } }
    else if (k === 'i' && tr?.inst) { if (b === 'cut') tr.inst.flt.cut = 30 * Math.pow(18000 / 30, x); if (b === 'res') tr.inst.flt.res = lerp(.1, 20); }
    // réglage d'instrument : « ip:<piste>:<chemin>:<min>:<max>:<log> » (ex. ip:3:flt.cut:30:18000:1)
    else if (k === 'ip' && tr?.inst) { const q = map.target.split(':'), lo = +q[3], hi = +q[4], v = q[5] === '1' ? lo * Math.pow(hi / lo, x) : lerp(lo, hi); setPath(tr.inst, q[2], v); }
    else if (k === 'mfx') { const f = p.master.fx.find(y => y.id === +a); const d = f && FX_DEFS[f.type]?.params.find(q => q.k === b); if (f && d) f.p[b] = d.log ? d.min * Math.pow(d.max / d.min, x) : lerp(d.min, d.max); }
    p.dirty = true; this.sync(); this.emit();
  }

  /* ---------- pistes ---------- */
  addTrack(kind: TrackKind, preset?: string) {
    let id = 0;
    this.act('mu.h.addTrack', p => {
      const n = p.tracks.filter(x => x.kind === kind).length + 1, name = t('mu.kind.' + kind) + ' ' + n, tr = newTrack(p, kind, name);
      if (kind === 'inst' && preset) tr.inst = instPreset(preset) || tr.inst; if (kind === 'drum') tr.inst = instPreset(preset || 'kit-studio') || tr.inst;
      const i = p.tracks.findIndex(x => x.id === this.sel.track); p.tracks.splice(i >= 0 ? i + 1 : p.tracks.length, 0, tr); id = tr.id;
    });
    this.sel.track = id; this.emit(); return id;
  }
  async deleteTrack(id: number) {
    const tr = trackOf(this.p, id); if (!tr) return; if (tr.clips.length && !(await ask(t('mu.q.delTrack', { name: tr.name })))) return;
    this.act('mu.h.delTrack', p => { p.tracks = p.tracks.filter(x => x.id !== id); for (const x of p.tracks) { if (x.out === id) x.out = 0; x.sends = x.sends.filter(s => s.bus !== id); for (const f of x.fx) if (f.side === id) f.side = undefined; for (const pd of x.inst?.pads || []) if (pd.out === id) pd.out = 0; } deleteClips(p, []); }, true);
  }
  duplicateTrack(id: number) {
    this.act('mu.h.dupTrack', p => {
      const tr = trackOf(p, id); if (!tr) return; const x = deepClone(tr); x.id = nid(p); x.name = tr.name + ' 2'; x.arm = false; x.solo = false;
      for (const c of x.clips) { c.id = nid(p); if (c.kind === 'midi') { const md = midiOf(p, c.data); if (md) { const m = newMidi(p, md.notes.map(n => ({ ...n, id: nid(p) }))); m.cc = deepClone(md.cc); c.data = m.id; } } }
      x.takes = []; x.pool = (x.pool || []).map(c => ({ ...c, id: nid(p) })); x.slots = x.slots.map(() => null);
      for (const f of x.fx) f.id = nid(p); p.tracks.splice(p.tracks.indexOf(tr) + 1, 0, x);
    });
  }
  moveTrack(id: number, to: number) { this.act('mu.h.moveTrack', p => { const i = p.tracks.findIndex(x => x.id === id); if (i < 0) return; const [x] = p.tracks.splice(i, 1); p.tracks.splice(Math.max(0, Math.min(p.tracks.length, to)), 0, x); }); }

  /* ---------- clips ---------- */
  /** nouveau clip MIDI vide (dessin) sur une piste instrument */
  newMidiClip(tr: Track, at: number, len = 4): MidiClip | null {
    let made: MidiClip | null = null;
    this.act('mu.h.newClip', p => { const md = newMidi(p, []); const c: MidiClip = { kind: 'midi', id: nid(p), name: tr.name, t: at, len, data: md.id, color: '', loop: false }; trackOf(p, tr.id)?.clips.push(c); made = c; });
    if (made) this.selectClip((made as MidiClip).id); return made;
  }
  newPatternClip(tr: Track, at: number) {
    const inst = tr.inst; if (!inst) return;
    this.act('mu.h.newClip', p => {
      const T = trackOf(p, tr.id)!; let pat = T.inst!.patterns[0];
      if (!pat) { pat = { id: nid(p), name: t('mu.steps.pattern') + ' 1', steps: 16, div: 4, swing: 0, seed: 1 + Math.floor(Math.random() * 9999), rows: T.inst!.pads.map((_, i) => ({ pad: i, len: 16, cells: Array.from({ length: 16 }, () => ({ on: false, v: 100, prob: 1, flam: false, rat: 1 })) })) }; T.inst!.patterns.push(pat); }
      const c: PatternClip = { kind: 'pattern', id: nid(p), name: pat.name, t: at, len: pat.steps / pat.div, pat: pat.id, color: '' }; T.clips.push(c); this.sel.clip = c.id;
    });
    this.selectClip(this.sel.clip);
  }
  deleteSelected() {
    if (this.sel.clips.size) { const ids = [...this.sel.clips]; this.act('mu.h.delClips', p => deleteClips(p, ids), true); this.sel.clips.clear(); this.sel.clip = 0; this.emit(); }
  }
  copy() {
    const L = [...this.sel.clips].map(id => findClip(this.p, id)).filter(Boolean) as { t: Track; c: Clip }[]; if (!L.length) return;
    const at = Math.min(...L.map(x => x.c.t));
    this.clipboard = { at, clips: L.map(x => ({ track: x.t.id, c: deepClone(x.c), notes: x.c.kind === 'midi' ? deepClone(midiOf(this.p, x.c.data)?.notes || []) : undefined })) };
    toast(t('mu.clip.copied', { n: String(L.length) }));
  }
  paste(at = this.pos()) {
    const cb = this.clipboard; if (!cb) return; const ids: number[] = [];
    this.act('mu.h.paste', p => {
      for (const x of cb.clips) {
        const tr = trackOf(p, x.track) || trackOf(p, this.sel.track); if (!tr) continue; const c = deepClone(x.c); c.id = nid(p); c.t = at + (x.c.t - cb.at);
        if (c.kind === 'midi') { const md = newMidi(p, (x.notes || []).map(n => ({ ...n, id: nid(p) }))); c.data = md.id; }
        if ((c.kind === 'audio') !== (tr.kind === 'audio')) continue; tr.clips.push(c); ids.push(c.id);
      }
    });
    this.sel.clips = new Set(ids); this.emit();
  }

  /* ---------- sauvegarde automatique et récupération ---------- */
  scheduleAutosave() { clearTimeout(this.autoT); this.autoT = window.setTimeout(() => void this.autosave(), Math.max(5, this.set.autosaveSec) * 1000); }
  async autosave() {
    if (!this.p.dirty) return; const text = IO.serialize(this.p), F = IO.fs();
    try { if (F) await F.autosave(this.p.id, text); else await idbPut(this.p.id, text); } catch { this.logEv('autosaveFail'); }
  }
  recover: { autos: { id: string; time: number; size: number; name: string }[]; orphans: { id: string; path: string; meta: string; size: number }[] } = { autos: [], orphans: [] };
  async checkRecover() {
    const F = IO.fs(); let autos: { id: string; time: number; size: number; name: string }[] = [], orphans: typeof this.recover.orphans = [];
    try {
      const L = F ? await F.autosaves() : await idbList();
      for (const a of L) { let name = a.id; try { const txt = F ? await F.autosaveRead(a.id) : await idbGet(a.id); name = (JSON.parse(txt) as Project).name || a.id; } catch { /* illisible */ } autos.push({ ...a, name }); }
      if (F) orphans = await F.recOrphans();
    } catch { /* rien */ }
    // les sauvegardes de plus de 30 jours sont effacées ; les plus récentes d'abord
    const old = autos.filter(a => a.time && Date.now() - a.time > 30 * 864e5); for (const a of old) try { if (F) await F.autosaveDel(a.id); else await idbDel(a.id); } catch { /* rien */ }
    autos = autos.filter(a => a.id !== this.p.id && !old.includes(a)).sort((a, b) => b.time - a.time);
    this.recover = { autos, orphans }; if (autos.length || orphans.length) { this.dialog = 'recover'; this.emit(); }
  }
  async restoreAuto(id: string) {
    const F = IO.fs(); const txt = F ? await F.autosaveRead(id) : await idbGet(id);
    const { p } = IO.parse(txt); p.dirty = true; await this.loadInto(p, p.path, true); toast(t('mu.rec.restored'));
  }
  async dropAuto(id: string) { const F = IO.fs(); try { if (F) await F.autosaveDel(id); else await idbDel(id); } catch { /* rien */ } this.recover.autos = this.recover.autos.filter(a => a.id !== id); this.emit(); }
  /** prise interrompue par un plantage : relue depuis le disque et ajoutée au projet ouvert, sur une nouvelle piste */
  async restoreOrphan(o: { id: string; path: string; meta: string; size: number }) {
    await this.init(); const F = IO.fs(); if (!F) return;
    let meta: { sr?: number; ch?: number; track?: string } = {}; try { meta = JSON.parse(o.meta); } catch { /* rien */ }
    const sr = meta.sr || 48000, nc = Math.max(1, Math.min(2, meta.ch || 1)), buf = await (await fetch(F.url(o.path))).arrayBuffer(), il = new Float32Array(buf, 0, Math.floor(buf.byteLength / 4 / nc) * nc), n = il.length / nc;
    const ch: Chans = Array.from({ length: nc }, (_, c) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = il[i * nc + c]; return x; });
    const a: Asset = { id: 'rec:' + o.id, name: (meta.track || 'prise') + ' (récupérée)', path: null, sr, ch: nc, len: n / sr, hash: 'rec:' + o.id, origin: 'record', licence: 'user', tags: ['take'], bpm: 0, key: '' };
    await IO.persistSound(this.p, this.store, a, ch, 'Prises');
    this.act('mu.h.recover', p => { const tr = newTrack(p, 'audio', a.name); p.tracks.push(tr); tr.clips.push({ ...IOclip(p, a, 0) }); });
    if (a.path) { try { await F.recDrop(o.id); } catch { /* rien */ } }
    this.recover.orphans = this.recover.orphans.filter(x => x.id !== o.id); toast(t('mu.rec.recovered')); this.emit();
  }
  async dropOrphan(id: string) { const F = IO.fs(); if (F) try { await F.recDrop(id); } catch { /* rien */ } this.recover.orphans = this.recover.orphans.filter(x => x.id !== id); this.emit(); }

  /* ---------- projets : nouveau, ouvrir, enregistrer, dupliquer, archiver ---------- */
  async confirmLeave(): Promise<boolean> { if (!this.p.dirty) return true; return ask(t('mu.q.unsaved', { name: this.p.name })); }
  private async loadInto(p: Project, path: string | null, keepDirty = false) {
    if (this.eng?.playing) this.stop();
    this.p = p; p.path = path; if (!keepDirty) p.dirty = false;
    if (this.ctx && Math.abs(this.ctx.sampleRate - p.sr) > 1) await this.rebuild(); else this.sync(true);
    this.hist.reset(p); this.sel = { track: p.tracks[0]?.id || 0, clips: new Set(), clip: 0, notes: new Set(), range: null }; this.view.sx = 0; this.slots.clear();
    if (this.eng) { this.eng.pos = 0; if (!this.set.safeExt) { const bad = await this.eng.loadExts(); if (bad.length) toast(t('mu.ext.missing', { list: bad.join(', ') })); this.eng.sync(); } }
    this.emit();
  }
  async newFrom(id: TemplateId, name: string, bpm: number, key: number, scale: string, sr: number) {
    if (!(await this.confirmLeave())) return;
    const names: Record<string, string> = {}; for (const k of ['synth', 'drums', 'bass', 'keys', 'chords', 'voice', 'voice2', 'loop', 'pad', 'lead', 'choirs', 'sfx', 'intro', 'verse', 'chorus', 'bridge', 'outro', 'theme']) names[k] = t('mu.tpl.n.' + k);
    const p = fromTemplate(id, name || t('mu.untitled'), bpm, key, scale, names); p.sr = sr;
    // un modèle tout juste créé n'a rien à perdre : pas de sauvegarde automatique (ni de « récupération ») tant qu'on ne l'a pas modifié
    await this.init(); await this.loadInto(p, null); this.dialog = null; this.emit();
  }
  async open() {
    if (!(await this.confirmLeave())) return; const F = IO.fs();
    if (!F) { const f = await pickFile('.dcmus'); if (!f) return; await this.openText(await f.text(), null); return; }
    const [f] = await F.open(t('mu.f.project'), ['dcmus'], false).catch(() => []); if (!f) return;
    this.busy = t('mu.f.opening'); this.emit();
    try { const txt = await (await fetch(F.url(f.path))).text(); await this.openText(txt, f.path); }
    catch (e) { toast(errText(e)); } finally { this.busy = ''; this.emit(); }
  }
  private async openText(txt: string, path: string | null) {
    await this.init();
    const r = await IO.loadProject(path || '', txt, this.store, this.ctx!, (i, n) => { this.busy = t('mu.f.loading', { i: String(i), n: String(n) }); this.emit(); });
    // ancien format : copie de sécurité avant conversion (MU157)
    if (r.migrated && path) { const F = IO.fs(); try { await F?.write(path.replace(/\.dcmus$/i, '') + ' (avant conversion).dcmus', new Blob([txt])); } catch { /* emplacement non permis : on prévient */ toast(t('mu.f.migratedNoCopy')); } }
    await this.loadInto(r.p, path); this.missing = r.missing;
    if (r.missing.length) { this.dialog = 'missing'; this.emit(); }
    toast(t('mu.f.opened', { name: r.p.name }));
  }
  async save(as = false): Promise<boolean> {
    const F = IO.fs(), id0 = this.p.id; if (!F) { downloadBlob(new Blob([IO.serialize(this.p)], { type: 'application/json' }), IO.safeName(this.p.name) + '.dcmus'); this.p.dirty = false; void this.dropAuto(id0); this.emit(); return true; }
    let path = this.p.path; if (as || !path) { path = await F.saveDialog(IO.safeName(this.p.name), t('mu.f.project'), 'dcmus'); if (!path) return false; }
    if (as && this.p.path && path.toLowerCase() !== this.p.path.toLowerCase()) { this.p.id = 'm' + Date.now().toString(36); this.p.name = IO.stemOf(path); }
    this.busy = t('mu.f.saving'); this.emit();
    try { await IO.saveProject(this.p, this.store, path, false, (_k, i, n) => { this.busy = t('mu.f.savingSounds', { i: String(i), n: String(n) }); this.emit(); }); toast(t('mu.f.saved'));
      // enregistré : sa sauvegarde automatique ne sert plus (sinon le prochain démarrage proposerait une « récupération » inutile)
      void this.dropAuto(id0); if (this.p.id !== id0) void this.dropAuto(this.p.id); return true; }
    catch (e) { toast(errText(e)); this.logEv('saveFail'); return false; } finally { this.busy = ''; this.emit(); }
  }
  /** projet transportable : les sons extérieurs sont copiés dans « <projet> - Sons » */
  async collect() { const F = IO.fs(); if (!F || !this.p.path) { toast(t('mu.f.saveFirst')); return; } this.busy = t('mu.f.saving'); this.emit(); try { await IO.saveProject(this.p, this.store, this.p.path, true); toast(t('mu.f.collected')); } catch (e) { toast(errText(e)); } finally { this.busy = ''; this.emit(); } }
  async archive() {
    const F = IO.fs(); this.busy = t('mu.f.archiving'); this.emit();
    try {
      const ext = extList().map(e => ({ id: e.id, name: e.name, ver: e.ver, author: e.author, licence: e.licence, hash: e.hash, on: e.on }));
      const { blob, notShared } = await IO.archive(this.p, this.store, ext);
      if (F) { const path = await F.saveDialog(IO.safeName(this.p.name), t('mu.f.zip'), 'zip'); if (!path) return; await F.write(path, blob); } else downloadBlob(blob, IO.safeName(this.p.name) + '.zip');
      toast(notShared.length ? t('mu.f.archivedWarn', { n: String(notShared.length) }) : t('mu.f.archived'));
    } catch (e) { toast(errText(e)); } finally { this.busy = ''; this.emit(); }
  }
  /** version nommée gardée dans le projet (comparaison et retour possibles) */
  saveVersion(name: string) { const q = deepClone(this.p) as Project; q.versions = []; this.p.versions.push({ name: name.slice(0, 60), at: Date.now(), data: JSON.stringify(q) }); this.p.dirty = true; this.scheduleAutosave(); toast(t('mu.ver.saved')); this.emit(); }
  restoreVersion(i: number) {
    const v = this.p.versions[i]; if (!v) return; const keep = this.p.versions, path = this.p.path;
    this.act('mu.h.version', p => { const o = JSON.parse(v.data) as Project; Object.assign(p, o, { versions: keep, path, id: p.id }); }, true);
    toast(t('mu.ver.restored', { name: v.name }));
  }
  async relink(a: Asset) {
    const F = IO.fs(); if (!F) return; const [f] = await F.open(t('mu.f.sound'), IO.AUDIO_EXT, false).catch(() => []); if (!f) return;
    try { const b = await IO.decodeFile(this.ctx!, await (await fetch(F.url(f.path))).arrayBuffer(), f.name); this.store.set(a.id, b); const A = this.p.assets[a.id]; if (A) { A.path = f.path; A.missing = false; } this.missing = this.missing.filter(x => x.id !== a.id); this.p.dirty = true; this.sync(true); toast(t('mu.f.relinked')); }
    catch (e) { toast(errText(e)); }
    this.emit();
  }

  /* ---------- sons et MIDI : import ---------- */
  /** importe des sons et les pose sur la piste audio choisie (ou une nouvelle), l'un après l'autre à partir de « at » */
  async importAudio(files?: { path?: string; file?: File }[], at = this.pos(), trackId?: number) {
    await this.init(); const F = IO.fs();
    if (!files) { if (F) files = (await F.open(t('mu.f.sound'), IO.AUDIO_EXT, true).catch(() => [])).map(f => ({ path: f.path })); else files = (await pickFiles(IO.AUDIO_EXT.map(e => '.' + e).join(','))).map(file => ({ file })); }
    if (!files.length) return; const got: Asset[] = []; let dups = 0;
    for (const f of files) { try { this.busy = t('mu.f.importing'); this.emit(); const r = await IO.importSound(this.p, this.store, this.ctx!, f); got.push(r.a); if (r.dup) dups++; } catch (e) { toast(errText(e)); } }
    this.busy = ''; if (!got.length) { this.emit(); return; }
    this.act('mu.h.import', p => {
      let tr = trackOf(p, trackId ?? this.sel.track); if (!tr || tr.kind !== 'audio') { tr = newTrack(p, 'audio', got[0].name.replace(/\.[^.]+$/, '')); p.tracks.push(tr); }
      let t0 = at; for (const a of got) { const c = IOclip(p, a, t0); tr.clips.push(c); t0 = clipEnd(p, c); }
      this.sel.track = tr.id;
    }, true);
    if (dups) toast(t('mu.f.dups', { n: String(dups) }));
  }
  async importMidi() {
    const F = IO.fs(); let buf: ArrayBuffer | null = null;
    if (F) { const [f] = await F.open(t('mu.f.midi'), ['mid', 'midi'], false).catch(() => []); if (f) buf = await (await fetch(F.url(f.path))).arrayBuffer(); }
    else { const f = await pickFile('.mid,.midi'); if (f) buf = await f.arrayBuffer(); }
    if (!buf) return;
    try {
      const smf = readSmf(buf);
      this.act('mu.h.importMidi', p => {
        if (smf.tempo.length && !p.tracks.some(x => x.clips.length)) { p.tempo = smf.tempo; p.bpm = smf.tempo[0].bpm; if (smf.sigs.length) { p.sigs = smf.sigs; p.num = smf.sigs[0].num; p.den = smf.sigs[0].den; } }
        for (const tr of smf.tracks) {
          if (!tr.notes.length) continue; const drum = tr.ch === 9, T = newTrack(p, drum ? 'drum' : 'inst', tr.name || t('mu.kind.inst'));
          T.inst = instPreset(drum ? 'kit-studio' : 'keys') || T.inst; const md = smfToMidi(p, tr); p.midi.push(md);
          const len = Math.max(4, Math.ceil(Math.max(...tr.notes.map(n => n.t + n.d)) / 4) * 4); T.clips.push({ kind: 'midi', id: nid(p), name: T.name, t: 0, len, data: md.id, color: '', loop: false }); p.tracks.push(T);
        }
      }, true);
      toast(t('mu.f.midiIn', { n: String(smf.tracks.filter(x => x.notes.length).length) }));
    } catch (e) { toast(errText(e)); }
  }
  /** fichier MIDI standard (format 1) avec le tempo et la métrique du projet */
  async exportMidi(onlyClip = false) {
    const p = this.p, list: { name: string; ch: number; program: number; notes: Note[]; cc: Record<string, { t: number; v: number }[]> }[] = [];
    const tracks = onlyClip && this.clip ? [this.clip.t] : p.tracks;
    for (const tr of tracks) {
      if (tr.kind !== 'inst' && tr.kind !== 'drum') continue; const notes: Note[] = [], cc: Record<string, { t: number; v: number }[]> = {};
      for (const c of tr.clips) {
        if (onlyClip && c.id !== this.sel.clip) continue;
        if (c.kind === 'midi') { const md = midiOf(p, c.data); if (!md) continue; const per = c.loop ? (c.loopLen || c.len) : Infinity, off = c.off || 0;
          for (let r = 0; r * (per === Infinity ? 1 : per) < c.len + off && r < 512; r++) { for (const n of md.notes) { const at = c.t - off + n.t + (per === Infinity ? 0 : r * per); if (n.mute || at < c.t || at >= c.t + c.len) continue; notes.push({ ...n, t: at, d: Math.min(n.d, c.t + c.len - at) }); } if (per === Infinity) break; }
          for (const [k, pts] of Object.entries(md.cc)) (cc[k] ||= []).push(...pts.map(x => ({ t: c.t - off + x.t, v: x.v })).filter(x => x.t >= c.t && x.t < c.t + c.len));
        } else if (c.kind === 'pattern') { const pat = tr.inst?.patterns.find(x => x.id === c.pat); if (!pat) continue; const sl = 1 / pat.div; for (let g = 0; g * sl < c.len; g++) pat.rows.forEach(row => { const L = Math.max(1, row.len || pat.steps), cell = row.cells[g % L]; if (cell?.on) notes.push({ id: 0, p: 36 + row.pad, t: c.t + g * sl, d: sl * .9, v: cell.v }); }); }
      }
      if (notes.length) list.push({ name: tr.name, ch: tr.kind === 'drum' ? 9 : 0, program: 0, notes, cc });
    }
    if (!list.length) { toast(t('mu.f.noMidi')); return; }
    const data = writeSmf(p, list), blob = new Blob([data as BlobPart], { type: 'audio/midi' }), F = IO.fs();
    if (F) { const path = await F.saveDialog(IO.safeName(p.name), t('mu.f.midi'), 'mid'); if (path) { await F.write(path, blob); toast(t('mu.f.midiOut')); } } else downloadBlob(blob, IO.safeName(p.name) + '.mid');
  }

  /* ---------- rendu : gel de piste, instrument → audio ---------- */
  async renderTrack(id: number, label: 'freeze' | 'bounce'): Promise<Asset | null> {
    await this.init(); const tr = trackOf(this.p, id); if (!tr) return null; const end = Math.max(songEnd(this.p), 1);
    this.busy = t('mu.r.rendering'); this.emit();
    try {
      const o: RenderOpts = { a: 0, b: end, tail: 3, sr: this.ctx!.sampleRate, ch: 2, only: [id], master: false, pre: label === 'freeze' };
      // gel : le son de la piste avant son volume / panoramique (les réglages de la console restent actifs)
      const q = deepClone(this.p); const T = trackOf(q, id)!; if (label === 'freeze') { T.vol = 0; T.pan = 0; T.auto = T.auto.filter(l => !['vol', 'pan', 'mute'].includes(l.param)); } T.out = 0; T.sends = [];
      const b = await renderProject(q, this.store, o); if (!b) return null;
      const ch = IO.chOf(b), a: Asset = { id: (label === 'freeze' ? 'frz:' : 'bnc:') + Date.now().toString(36) + id, name: tr.name + ' (' + t('mu.r.' + label) + ')', path: null, sr: b.sampleRate, ch: 2, len: b.duration, hash: '', origin: 'render', licence: 'user', tags: ['render'], bpm: this.p.bpm, key: '' };
      await IO.persistSound(this.p, this.store, a, ch.map(c => new Float32Array(c)), 'Rendus'); return a;
    } catch (e) { toast(errText(e)); return null; } finally { this.busy = ''; this.emit(); }
  }
  async freeze(id: number) { const a = await this.renderTrack(id, 'freeze'); if (!a) return; this.act('mu.h.freeze', p => { const tr = trackOf(p, id); if (tr) tr.frozen = a.id; }, true); toast(t('mu.r.frozen')); }
  unfreeze(id: number) { this.act('mu.h.unfreeze', p => { const tr = trackOf(p, id); if (tr) tr.frozen = null; }, true); }
  /** instrument rendu en audio sur une nouvelle piste ; la piste MIDI reste (coupée), rien n'est perdu */
  async bounce(id: number) {
    const a = await this.renderTrack(id, 'bounce'); if (!a) return;
    this.act('mu.h.bounce', p => { const tr = trackOf(p, id); if (!tr) return; const x = newTrack(p, 'audio', a.name); x.vol = tr.vol; x.pan = tr.pan; x.out = tr.out; x.clips.push(IOclip(p, a, 0)); p.tracks.splice(p.tracks.indexOf(tr) + 1, 0, x); tr.mute = true; }, true);
    toast(t('mu.r.bounced'));
  }

  /* ---------- vue session : lancer des clips en boucle, quantifié à la mesure ---------- */
  launch(trackId: number, slot: number | null) {
    const e = this.eng; if (!e) return; const tr = trackOf(this.p, trackId); if (!tr) return;
    const run = () => {
      const p = this.p, now = e.playing ? e.now() : e.pos, bar = barOf(p, now), next = e.playing ? barStart(p, bar.bar + 1) : now;
      if (!e.session) e.session = new Map();
      if (slot == null) { e.session.set(trackId, []); this.slots.set(trackId, -1); }
      else {
        const src = (tr.pool || []).find(c => c.id === tr.slots[slot]); if (!src) return;
        const len = src.kind === 'audio' ? Math.max(1 / 4, clipEnd(p, src) - src.t) : src.len, reps = Math.ceil(512 / Math.max(.25, len)), L: Clip[] = [];
        if (src.kind === 'audio') for (let i = 0; i < reps; i++) L.push({ ...src, id: -(trackId * 10000 + i + 1), t: next + i * len } as AudioClip);
        else L.push({ ...src, id: -(trackId * 10000 + 1), t: next, len: reps * len, loop: true, loopLen: len } as Clip);
        e.session.set(trackId, L); this.slots.set(trackId, slot);
      }
      if (!e.playing) void this.play(now); else e.resync();
      this.emit();
    };
    void this.init().then(run);
  }
  launchScene(i: number) { for (const tr of this.p.tracks) if (tr.kind !== 'bus') this.launch(tr.id, tr.slots[i] != null ? i : null); }
  stopSession() { const e = this.eng; if (!e) return; e.session = null; this.slots.clear(); if (e.playing) e.resync(); this.emit(); }

  /** préécoute d'un motif de batterie seul, en boucle, au tempo du projet (même moteur que la lecture : swing, probabilités, groove) */
  previewing: { track: number; pat: number } | null = null;
  async previewPattern(trackId: number, patId: number) {
    await this.init(); const e = this.eng!;
    if (this.previewing && this.previewing.track === trackId && this.previewing.pat === patId) { this.previewing = null; this.stop(); return; }
    if (e.playing) this.stop();
    const c: PatternClip = { kind: 'pattern', id: -999, name: '', t: 0, len: 4096, pat: patId, color: '' };
    e.session = new Map(this.p.tracks.map(x => [x.id, x.id === trackId ? [c] : []])); this.previewing = { track: trackId, pat: patId };
    await e.play(0); this.emit();
  }

  /** mesure aller-retour : un clic sort par la sortie et revient par l'entrée (micro près du haut-parleur, ou câble de retour) ; renvoie des secondes */
  async measureLatency(dev: string): Promise<number | null> {
    await this.init(); const ctx = this.ctx!, e = this.eng!; if (ctx.state !== 'running') await ctx.resume();
    const inp = await e.openInput(dev), rec = new AudioWorkletNode(ctx, 'mu-rec', { numberOfInputs: 1, numberOfOutputs: 0, processorOptions: { ch: 1 } });
    const chunks: { frame: number; ch: Float32Array[] }[] = []; rec.port.onmessage = ev => { if (ev.data?.ch) chunks.push(ev.data); };
    inp.node.connect(rec); rec.port.postMessage({ start: Math.round((ctx.currentTime + .05) * ctx.sampleRate) });
    const T = ctx.currentTime + .35, b = ctx.createBuffer(1, 96, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < 24; i++) d[i] = .9 * (1 - i / 24) * (i % 2 ? -1 : 1);
    const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(T);
    await new Promise(r => setTimeout(r, 1400)); rec.port.postMessage('stop'); await new Promise(r => setTimeout(r, 250)); try { inp.node.disconnect(rec); } catch { /* rien */ }
    let best = 0, at = -1; for (const c of chunks) { const x = c.ch[0]; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > best) { best = v; at = c.frame + i; } } }
    if (best < .03 || at < 0) return null; const rt = at / ctx.sampleRate - T; return rt > 0 && rt < 1 ? rt : null;
  }

  /* ---------- export (fenêtre Exporter) ---------- */
  async render(o: RenderOpts) { await this.init(); return renderProject(this.p, this.store, o); }
}

/** écrit une valeur dans un objet par son chemin (« flt.cut », « o1.lvl ») */
export function setPath(o: unknown, path: string, v: number) { const ks = path.split('.'); let x = o as Record<string, unknown>; for (const k of ks.slice(0, -1)) { x = x[k] as Record<string, unknown>; if (!x) return; } if (typeof x[ks[ks.length - 1]] === 'number') x[ks[ks.length - 1]] = v; }
export function getPath(o: unknown, path: string): number { let x = o as Record<string, unknown>; for (const k of path.split('.')) { x = x?.[k] as Record<string, unknown>; } return typeof x === 'number' ? x : 0; }
/** nom lisible d'un son : « Studio · Grosse caisse », « Pop · 120 BPM » pour les sons fabriqués par DedCut */
function assetLabel(a: Asset): string {
  if (!a.id.startsWith('gen:')) return a.name.replace(/\.[^.]+$/, '');
  const q = a.id.split('/');
  if (q[0] === 'gen:kit') return t('mu.kit.' + q[1]) + ' · ' + t('mu.pad.' + q[2]);
  if (a.id.startsWith('gen:loop')) return t('mu.loop.' + a.id.slice(9).replace(/-\d+$/, '')) + ' · ' + Math.round(a.bpm) + ' BPM';
  return a.name;
}
/** clip audio pour un son, posé à « at » */
function IOclip(p: Project, a: Asset, at: number): AudioClip { return { kind: 'audio', id: nid(p), name: assetLabel(a), t: at, asset: a.id, off: 0, dur: a.len, gain: 0, fin: { len: .005, curve: 'lin' }, fout: { len: .01, curve: 'lin' }, rev: false, warp: false, srcBpm: a.bpm || bpmAt(p, at), ratio: 1, pitch: 0, mode: 'stretch', color: '' }; }
export { IOclip, assetLabel };

/* ---------- navigateur seul (tests) : fichiers et sauvegarde automatique sans le logiciel installé ---------- */
function pickFiles(accept: string): Promise<File[]> { return new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = accept; i.onchange = () => ok([...(i.files || [])]); i.click(); }); }
async function pickFile(accept: string): Promise<File | null> { const l = await pickFiles(accept); return l[0] || null; }
export function downloadBlob(b: Blob, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const idb = (): Promise<IDBDatabase> => new Promise((ok, ko) => { const r = indexedDB.open('dedcut-music', 1); r.onupgradeneeded = () => r.result.createObjectStore('auto'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
async function idbPut(id: string, text: string) { const db = await idb(); await new Promise<void>((ok, ko) => { const tx = db.transaction('auto', 'readwrite'); tx.objectStore('auto').put({ text, time: Date.now() }, id); tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error); }); db.close(); }
async function idbGet(id: string): Promise<string> { const db = await idb(); const v = await new Promise<{ text: string } | undefined>(ok => { const r = db.transaction('auto').objectStore('auto').get(id); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined); }); db.close(); if (!v) throw new Error('mu.err.noAuto'); return v.text; }
async function idbDel(id: string) { const db = await idb(); await new Promise<void>(ok => { const tx = db.transaction('auto', 'readwrite'); tx.objectStore('auto').delete(id); tx.oncomplete = () => ok(); tx.onerror = () => ok(); }); db.close(); }
async function idbList(): Promise<{ id: string; time: number; size: number }[]> {
  const db = await idb(); const out: { id: string; time: number; size: number }[] = [];
  await new Promise<void>(ok => { const c = db.transaction('auto').objectStore('auto').openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { const v = cu.value as { text: string; time: number }; out.push({ id: String(cu.key), time: v.time, size: v.text.length }); cu.continue(); } else ok(); }; c.onerror = () => ok(); });
  db.close(); return out;
}

export const mu = new MusicState();
(window as unknown as { __mu?: MusicState }).__mu = mu; // accès pour les tests automatiques (console de test du logiciel)
export function useMu(): number { return useSyncExternalStore(f => mu.on(f), () => mu.v); }
export { genCatalog, decodeWav, s2b, b2s };
export type { MusicState };

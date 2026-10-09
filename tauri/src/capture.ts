// DedCut — fenêtre de partage au style de DedCut et capture faite par DedCut (voir src-tauri/src/capture.rs).
// Remplace la fenêtre grise de Windows / WebView2 : navigator.mediaDevices.getDisplayMedia() ouvre cette fenêtre,
// puis renvoie un MediaStream ordinaire (piste vidéo + son du PC), donc Enregistrer et Live n'ont rien à changer.
// Les images arrivent dans des mémoires partagées avec la page (une par emplacement, 3 en tout) ; un message par image
// dit laquelle lire. En cas d'échec, la fenêtre de Windows reste disponible.
import { invoke } from '@tauri-apps/api/core';
import { t } from './i18n';

export type CapSource = { id: string; kind: 'screen' | 'window'; name: string; app: string; w: number; h: number; primary: boolean; min: boolean };
type Choice = { id: string; audio: boolean };
type WebviewMsg = { cap?: number; aud?: number; s?: number; q?: number; w?: number; h?: number; t?: number; p?: number; end?: number; gone?: number; rate?: number; ring?: number };
type WebviewBridge = {
  addEventListener(type: 'message', fn: (e: { data: WebviewMsg }) => void): void;
  addEventListener(type: 'sharedbufferreceived', fn: (e: { additionalData: WebviewMsg; getBuffer(): ArrayBuffer }) => void): void;
  releaseBuffer?(b: ArrayBuffer): void;
};
type TrackGen = MediaStreamTrack & { writable: WritableStream<VideoFrame> };

const wv = (window as unknown as { chrome?: { webview?: WebviewBridge } }).chrome?.webview;
const Gen = (window as unknown as { MediaStreamTrackGenerator?: new (o: { kind: string }) => TrackGen }).MediaStreamTrackGenerator;
/** capture faite par DedCut possible : logiciel Windows (WebView2) */
export const capSupported = !!(window.__TAURI_INTERNALS__ && wv && Gen && typeof VideoFrame === 'function' && /Windows/.test(navigator.userAgent));

/* ---------- capture en cours ---------- */
const HDR = 32;
const bufs = new Map<string, ArrayBuffer>();
const caps = new Map<number, Cap>();

/** son du PC : anneau de 2 s en 16 bits stéréo ; un « worklet » le rejoue avec ~60 ms d'avance contre les à-coups */
const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.q=[];this.n=0;this.o=0;this.go=false;
this.port.onmessage=e=>{this.q.push(e.data);this.n+=e.data.length/2;while(this.n>sampleRate*.4&&this.q.length>1){this.n-=(this.q[0].length-this.o)/2;this.q.shift();this.o=0}}}
process(_,outs){const L=outs[0][0],R=outs[0][1]||L;if(!this.go){if(this.n<sampleRate*.06){L.fill(0);R.fill(0);return true}this.go=true}
for(let i=0;i<L.length;i++){if(!this.q.length){L[i]=R[i]=0;this.go=false;continue}const c=this.q[0];L[i]=c[this.o];R[i]=c[this.o+1];this.o+=2;this.n--;if(this.o>=c.length){this.q.shift();this.o=0}}return true}}
registerProcessor('dc-cap-son',P);`;

class Cap {
  gen: TrackGen; writer: WritableStreamDefaultWriter<VideoFrame>; busy = false; ended = false;
  ac: AudioContext | null = null; node: AudioWorkletNode | null = null; aTrack: MediaStreamTrack | null = null; rp = -1;
  live = 0; // pistes encore ouvertes : la capture s'arrête quand toutes sont arrêtées
  constructor(public token: number) {
    this.gen = new Gen!({ kind: 'video' });
    this.writer = this.gen.writable.getWriter();
    this.watch(this.gen);
  }
  /** track.stop() par Enregistrer / Live : arrête la capture quand plus personne ne l'utilise */
  watch(tr: MediaStreamTrack) {
    this.live++;
    const stop = tr.stop.bind(tr); let done = false;
    tr.stop = () => { stop(); if (!done) { done = true; if (--this.live <= 0) this.close(); } };
  }
  frame(m: WebviewMsg) {
    if (m.end || m.gone) { this.finish(); return; }
    const b = bufs.get(this.token + ':' + m.s); if (!b || this.ended || this.busy) return;
    const hd = new Uint32Array(b, 0, 4); if (hd[0] !== m.q) return;
    let vf: VideoFrame;
    try { vf = new VideoFrame(new Uint8Array(b, HDR, m.w! * m.h! * 4), { format: 'BGRX', codedWidth: m.w!, codedHeight: m.h!, timestamp: m.t! }); } catch { return; }
    if (hd[0] !== m.q) { vf.close(); return; } // réécrite pendant la lecture : image sautée
    this.busy = true;
    this.writer.write(vf).catch(() => { try { vf.close(); } catch { /* déjà fermée */ } }).finally(() => { this.busy = false; });
  }
  async audioInit() {
    const ac = new AudioContext({ sampleRate: 48000 });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    try { await ac.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const node = new AudioWorkletNode(ac, 'dc-cap-son', { numberOfInputs: 0, outputChannelCount: [2] });
    const dst = ac.createMediaStreamDestination(); node.connect(dst);
    this.ac = ac; this.node = node; this.aTrack = dst.stream.getAudioTracks()[0]; this.watch(this.aTrack);
    ac.resume().catch(() => { });
  }
  audio(m: WebviewMsg) {
    const b = bufs.get('a' + this.token); if (!b || !this.node || this.ended) return;
    const ring = (b.byteLength - 16) / 4, d = new Int16Array(b, 16, ring * 2), p = m.p! >>> 0;
    if (this.rp < 0 || ((p - this.rp) >>> 0) > ring) this.rp = (p - Math.min(ring, 4800)) >>> 0; // départ ou retard : on repart de près
    const n = (p - this.rp) >>> 0; if (!n) return;
    const out = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const at = ((this.rp + i) % ring) * 2; out[i * 2] = d[at] / 32768; out[i * 2 + 1] = d[at + 1] / 32768; }
    this.rp = p;
    this.node.port.postMessage(out, [out.buffer]);
  }
  /** fin venant de Windows (fenêtre fermée) : la piste se termine (évènement « ended ») */
  finish() {
    if (this.ended) return; this.ended = true;
    this.writer.close().catch(() => { });
    this.aTrack?.stop();
    this.close();
  }
  close() {
    if (!caps.has(this.token)) return;
    caps.delete(this.token);
    this.ended = true;
    invoke('cap_stop', { token: this.token }).catch(() => { });
    try { this.node?.disconnect(); } catch { /* rien */ }
    this.ac?.close().catch(() => { });
    for (const k of [...bufs.keys()]) if (k.startsWith(this.token + ':') || k === 'a' + this.token) { const b = bufs.get(k)!; bufs.delete(k); try { wv?.releaseBuffer?.(b); } catch { /* rien */ } }
  }
}

if (capSupported) {
  wv!.addEventListener('sharedbufferreceived', e => {
    const d = e.additionalData || {};
    if (d.cap) bufs.set(d.cap + ':' + d.s, e.getBuffer());
    else if (d.aud) bufs.set('a' + d.aud, e.getBuffer());
  });
  wv!.addEventListener('message', e => {
    const m = e.data; if (!m || typeof m !== 'object') return;
    if (m.cap) caps.get(m.cap)?.frame(m);
    else if (m.aud) caps.get(m.aud)?.audio(m);
  });
}

/** démarre la capture d'une source et renvoie un MediaStream (vidéo + son du PC si demandé) */
export async function capOpen(id: string, o: { fps?: number; audio?: boolean } = {}): Promise<MediaStream> {
  const r = await invoke<{ token: number; w: number; h: number; audio: boolean; audioError?: string }>('cap_start', { id, fps: Math.round(o.fps || 30), audio: !!o.audio });
  const c = new Cap(r.token); caps.set(r.token, c);
  const tracks: MediaStreamTrack[] = [c.gen];
  if (r.audio) { try { await c.audioInit(); tracks.push(c.aTrack!); } catch { /* sans le son */ } }
  if (o.audio && !c.aTrack) window.toast?.(t('partage.noSound'));
  return new MediaStream(tracks);
}

/* ---------- liste des sources et petites images ---------- */
export async function capSources(): Promise<CapSource[]> { return invoke<CapSource[]>('cap_sources'); }
/** petite image d'une source (adresse « data: »), ou '' (fenêtre réduite) */
export async function capThumb(id: string, w = 320, h = 200): Promise<string> {
  const b = new Uint8Array(await invoke<ArrayBuffer>('cap_thumb', { id, w, h }));
  const dv = new DataView(b.buffer, b.byteOffset), tw = dv.getUint32(0, true), th = dv.getUint32(4, true);
  if (!tw || !th) return '';
  const px = new Uint8ClampedArray(tw * th * 4);
  for (let i = 0; i < px.length; i += 4) { px[i] = b[8 + i + 2]; px[i + 1] = b[8 + i + 1]; px[i + 2] = b[8 + i]; px[i + 3] = 255; }
  const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
  cv.getContext('2d')!.putImageData(new ImageData(px, tw, th), 0, 0);
  return cv.toDataURL('image/jpeg', .82);
}
export const screenName = (s: CapSource, i: number) => t('partage.screenN', { n: i + 1 }) + (s.primary ? ' · ' + t('partage.primary') : '');

/* ---------- la fenêtre « Que veux-tu partager ? » ---------- */
const svg = (d: string, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC_SCREEN = '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>';
const IC_WIN = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>';
const IC_MIN = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 15h8"/>';
const IC_REFRESH = '<path d="M20 11a8 8 0 0 0-14.7-4.3L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4.3L21 15"/><path d="M21 20v-5h-5"/>';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

let open = false;
/** ouvre la fenêtre de partage ; renvoie le choix, 'windows' (fenêtre de Windows) ou null (annulé) */
export function capPick(o: { audio?: boolean } = {}): Promise<Choice | 'windows' | null> {
  if (open) return Promise.resolve(null);
  open = true;
  return new Promise(done => {
    const prev = document.activeElement as HTMLElement | null;
    const m = document.createElement('div'); m.className = 'dcq dccap';
    m.innerHTML = `<div class="dcq-box dccap-box" role="dialog" aria-modal="true" aria-labelledby="dccapT">
      <div class="dcq-h"><span class="dcq-ic">${svg(IC_SCREEN)}</span><b id="dccapT">${esc(t('partage.title'))}</b>
        <button class="dccap-ref" title="${esc(t('rec.refresh'))}">${svg(IC_REFRESH, 15)}</button></div>
      <div class="seg dccap-tabs"><button data-k="screen" class="on">${esc(t('partage.screens'))}</button><button data-k="window">${esc(t('partage.windows'))}</button></div>
      <div class="dccap-grid" role="listbox"><div class="dccap-empty">${esc(t('partage.loading'))}</div></div>
      ${o.audio ? `<label class="chk dccap-snd"><span>${esc(t('partage.sound'))}<small>${esc(t('partage.soundHint'))}</small></span><input type="checkbox" checked></label>` : ''}
      <div class="dcq-b"><button class="dccap-win" title="${esc(t('partage.windowsTip'))}">${esc(t('partage.windowsPicker'))}</button><span class="dccap-sp"></span>
        <button class="dcq-no">${esc(t('common.cancel'))}</button><button class="dcq-ok" disabled>${esc(t('partage.share'))}</button></div></div>`;
    const grid = m.querySelector('.dccap-grid') as HTMLElement, ok = m.querySelector('.dcq-ok') as HTMLButtonElement;
    const snd = m.querySelector('.dccap-snd input') as HTMLInputElement | null;
    let list: CapSource[] = [], kind: 'screen' | 'window' = 'screen', sel = '', gen = 0;
    const thumbs = new Map<string, string>();
    const draw = () => {
      m.querySelectorAll<HTMLButtonElement>('.dccap-tabs button').forEach(b => {
        b.classList.toggle('on', b.dataset.k === kind);
        const n = list.filter(s => s.kind === b.dataset.k).length;
        b.textContent = t(b.dataset.k === 'screen' ? 'partage.screens' : 'partage.windows') + (list.length ? ' (' + n + ')' : '');
      });
      const items = list.filter(s => s.kind === kind);
      if (!items.length) { grid.innerHTML = `<div class="dccap-empty">${esc(t(list.length ? 'partage.none' : 'partage.loading'))}</div>`; return; }
      let si = 0;
      grid.innerHTML = items.map(s => {
        const name = s.kind === 'screen' ? screenName(s, si++) : s.name, th = thumbs.get(s.id);
        const sub = s.kind === 'screen' ? s.w + ' × ' + s.h : s.min ? t('partage.minimized') : s.app;
        return `<button class="dccap-card${s.id === sel ? ' on' : ''}" role="option" aria-selected="${s.id === sel}" data-id="${esc(s.id)}" title="${esc(name)}">
          <span class="dccap-th">${th ? `<img src="${th}" alt="">` : svg(s.kind === 'screen' ? IC_SCREEN : s.min ? IC_MIN : IC_WIN, 30)}</span>
          <span class="dccap-n">${s.kind === 'window' ? svg(IC_WIN, 13) : ''}<b>${esc(name)}</b></span><small>${esc(sub || '')}</small></button>`;
      }).join('');
      ok.disabled = !list.some(s => s.id === sel);
    };
    const load = async () => {
      const g = ++gen;
      try { list = await capSources(); } catch { list = []; }
      if (g !== gen) return;
      if (!list.some(s => s.id === sel)) sel = (list.find(s => s.kind === kind && s.primary) || list.find(s => s.kind === kind) || { id: '' }).id;
      draw();
      // petites images une par une (les fenêtres lentes à dessiner ne bloquent pas les autres)
      for (const s of [...list.filter(x => x.kind === kind), ...list.filter(x => x.kind !== kind)]) {
        if (g !== gen || !document.body.contains(m)) return;
        if (s.min) continue;
        try { const u = await capThumb(s.id); if (u) { thumbs.set(s.id, u); const im = grid.querySelector(`[data-id="${CSS.escape(s.id)}"] .dccap-th`); if (im) im.innerHTML = `<img src="${u}" alt="">`; } } catch { /* sans image */ }
      }
    };
    const end = (v: Choice | 'windows' | null) => {
      gen++; open = false;
      removeEventListener('keydown', key, true);
      m.classList.add('out'); setTimeout(() => m.remove(), 120);
      try { prev?.focus?.(); } catch { /* rien */ }
      done(v);
    };
    const share = () => { if (list.some(s => s.id === sel)) end({ id: sel, audio: !!snd?.checked }); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(null); }
      else if (e.key === 'Enter' && !(document.activeElement as HTMLElement)?.matches?.('.dcq-no,.dccap-win,.dccap-tabs button,.dccap-ref')) { e.preventDefault(); e.stopPropagation(); share(); }
      else if (e.key.startsWith('Arrow')) {
        const items = list.filter(s => s.kind === kind); if (!items.length) return;
        const cols = Math.max(1, Math.round(grid.clientWidth / 210)), i = Math.max(0, items.findIndex(s => s.id === sel));
        const j = Math.min(items.length - 1, Math.max(0, i + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols } as Record<string, number>)[e.key]));
        sel = items[j].id; draw(); grid.querySelector<HTMLElement>('.dccap-card.on')?.focus(); e.preventDefault(); e.stopPropagation();
      } else e.stopPropagation();
    };
    m.addEventListener('click', e => {
      const el = e.target as HTMLElement;
      const card = el.closest<HTMLElement>('.dccap-card'); if (card) { sel = card.dataset.id!; draw(); grid.querySelector<HTMLElement>('.dccap-card.on')?.focus(); return; }
      const tab = el.closest<HTMLElement>('.dccap-tabs button');
      if (tab) { kind = tab.dataset.k as 'screen' | 'window'; if (!list.some(s => s.id === sel && s.kind === kind)) sel = (list.find(s => s.kind === kind && s.primary) || list.find(s => s.kind === kind) || { id: '' }).id; draw(); return; }
      if (el.closest('.dccap-ref')) { thumbs.clear(); load(); return; }
      if (el.closest('.dcq-ok')) share(); else if (el.closest('.dcq-no')) end(null); else if (el.closest('.dccap-win')) end('windows');
    });
    m.addEventListener('dblclick', e => { if ((e.target as HTMLElement).closest('.dccap-card')) share(); });
    m.addEventListener('mousedown', e => { if (e.target === m) end(null); });
    addEventListener('keydown', key, true); document.body.appendChild(m);
    requestAnimationFrame(() => ok.focus());
    load();
  });
}

/* ---------- getDisplayMedia : fenêtre de DedCut à la place de celle de Windows ---------- */
let preset: Choice | null = null;
/** choix fait à l'avance dans la liste du panneau Enregistrer (route __pick) : utilisé par le prochain partage */
export function capPreset(c: Choice | null) { preset = c; }

export function installCapture() {
  if (!capSupported || !navigator.mediaDevices?.getDisplayMedia) return;
  invoke('cap_stop_all').catch(() => { }); // page rechargée : captures d'avant arrêtées
  const md = navigator.mediaDevices, orig = md.getDisplayMedia.bind(md);
  md.getDisplayMedia = async (o?: DisplayMediaStreamOptions) => {
    const v = o?.video, fr = typeof v === 'object' ? (v as MediaTrackConstraints).frameRate : undefined;
    const fps = typeof fr === 'number' ? fr : (fr as ConstrainDoubleRange | undefined)?.ideal ?? (fr as ConstrainDoubleRange | undefined)?.max ?? 30;
    let c: Choice | 'windows' | null = preset; preset = null;
    if (!c) c = await capPick({ audio: !!o?.audio });
    if (c === 'windows') return orig(o);
    if (!c) throw new DOMException(t('common.cancel'), 'NotAllowedError');
    try { return await capOpen(c.id, { fps: Math.min(60, Math.max(1, +fps || 30)), audio: c.audio }); }
    catch { window.toast?.(t('partage.failed')); return orig(o); }
  };
  (window as unknown as { dedcutCapture: unknown }).dedcutCapture = { supported: true, sources: capSources, thumb: capThumb, pick: capPick, open: capOpen };
}

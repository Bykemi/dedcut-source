// Pont entre le moteur de DedCut (public/engine.js) et Windows, via Tauri.
// Le moteur appelle appFetch('app://dedcut/__…') ; ici chaque route devient une commande Rust.
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { getVersion } from '@tauri-apps/api/app';
import { dedcutChat } from './assistant';
import { dedcutUpdate } from './updates';
import { installCapture, capSupported, capSources, capThumb, capPreset } from './capture';
import { t } from './i18n';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __dedcutVersion?: string;
    appFetch: (url: string, opts?: RequestInit) => Promise<Response>;
    dedcutSave?: (blob: Blob, name: string) => Promise<void>;
    openPath?: (p: string) => Promise<unknown>;
    recHotkey?: () => unknown;
    dedcutSecret?: { protect(text: string): Promise<string>; unprotect(hex: string): Promise<string> };
    dedcutRemote?: { start(pin: string): Promise<{ port: number; ip: string }>; stop(): Promise<void>; state(json: string): Promise<void>; on(fn: (p: unknown) => void): Promise<unknown> };
    dedcutKeys?: { on(acc: string, fn: () => unknown): Promise<void>; off(acc: string): Promise<void>; hold(acc: string, down: () => unknown, up: () => unknown): Promise<void> };
    toast?: (t: string) => void;
    dedcutFS?: DedcutFS;
    dedcutMCP?: typeof dedcutMCP;
    dedcutAI?: DedcutAI;
    dedcutBrain?: typeof dedcutBrain;
    dedcutMusic?: typeof dedcutMusic;
    dedcutLive?: typeof dedcutLive;
    dedcutChat?: typeof dedcutChat;
    dedcutUpdate?: typeof dedcutUpdate;
    dedcutZoom?: (scale: number) => Promise<void>;
    dedcutDrop?: (paths: string[], x: number, y: number) => void;
    dedcutDragOver?: (on: boolean) => void;
  }
}


export interface FileInfo { path: string; name: string; size: number; exists: boolean }
interface DedcutFS {
  fileUrl(path: string): string;
  pickMedia(label: string): Promise<FileInfo[]>;
  allowPaths(paths: string[]): Promise<FileInfo[]>;
  saveMedia(file: Blob & { name?: string }, name?: string): Promise<FileInfo>;
  chooseSave(name: string, label: string): Promise<string | null>;
  writeProject(path: string, text: string): Promise<void>;
  openProjectDialog(label: string): Promise<string | null>;
  pickOne(title: string, label: string): Promise<FileInfo | null>;
  pickFolder(title: string): Promise<string | null>;
  findInDir(dir: string, names: string[]): Promise<(string | null)[]>;
  openLink(url: string): Promise<void>;
  openFolder(kind: 'rec' | 'exports'): Promise<void>;
  openLicences(): Promise<void>;
  ttsVoices(): Promise<{ name: string; lang: string; gender: string }[]>;
  ttsMake(text: string, voice: string, rate: number, name: string): Promise<FileInfo>;
  ttsSettings(): Promise<void>;
  ttsLive(text: string, voice: string, rate: number): Promise<string>;
  trashProject(path: string): Promise<void>;
}

// Accès aux fichiers par chemin : le projet garde les chemins au lieu de copier les vidéos
const dedcutFS: DedcutFS = {
  fileUrl: p => convertFileSrc(p),
  pickMedia: label => invoke<FileInfo[]>('pick_media', { label }),
  allowPaths: paths => invoke<FileInfo[]>('allow_paths', { paths }),
  saveMedia: async (file, name) => {
    const n = name || (file as File).name || 'media.bin';
    return invoke<FileInfo>('save_media', new Uint8Array(await file.arrayBuffer()), { headers: { name: encodeURIComponent(n) } });
  },
  chooseSave: (name, label) => invoke<string | null>('choose_save', { name, label }),
  writeProject: (path, text) => invoke('write_project', new TextEncoder().encode(text), { headers: { path: encodeURIComponent(path) } }),
  openProjectDialog: label => invoke<string | null>('open_project_dialog', { label }),
  pickOne: (title, label) => invoke<FileInfo | null>('pick_one', { title, label }),
  pickFolder: title => invoke<string | null>('pick_folder', { title }),
  findInDir: (dir, names) => invoke<(string | null)[]>('find_in_dir', { dir, names }),
  openLink: url => invoke('open_link', { url }),
  openFolder: kind => invoke('open_folder', { kind }),
  openLicences: () => invoke('open_licences'),
  // texte en voix : moteur vocal intégré à Windows (voir src-tauri/src/tts.rs)
  ttsVoices: () => invoke('tts_voices'),
  ttsMake: (text, voice, rate, name) => invoke<FileInfo>('tts_make', { text, voice, rate, name }),
  ttsSettings: () => invoke('tts_settings'),
  ttsLive: (text, voice, rate) => invoke<string>('tts_live', { text, voice, rate }),
  trashProject: path => invoke('trash_project', { path })
};

// DedCut AI : générateur de vidéo local (moteur et modèle téléchargés à la demande, voir src-tauri/src/ai.rs)
export interface AiModel { id: string; ready: boolean; missing: number; image: boolean; max_frames: number }
export interface AiStatus { models: AiModel[]; dir: string; busy: boolean; parts: { id: string; size: number; have: number; ok: boolean }[] }
export interface AiGen { prompt: string; negative: string; width: number; height: number; frames: number; fps: number; steps: number; seed: number; cfg: number; name: string; model: string; image: boolean; enhance: boolean }
export interface AiResult { path: string | null; frames_dir: string | null; count: number; fps: number; width: number; height: number }
export interface AiHardware { gpu: string; vram_gb: number; ram_gb: number; known: boolean; recent: boolean; ok: boolean; min_vram_gb: number; min_ram_gb: number; unsupported?: boolean }
interface DedcutAI {
  status(): Promise<AiStatus>;
  hardware(): Promise<AiHardware>;
  download(model: string): Promise<void>;
  setRef(png: Uint8Array): Promise<void>;
  cancel(): Promise<void>;
  remove(model?: string): Promise<void>;
  generate(p: AiGen): Promise<AiResult>;
  clearFrames(): Promise<void>;
  onProgress(f: (p: { id: string; done: number; total: number; idx: number; n: number }) => void): void;
  onLog(f: (line: string) => void): void;
}
const dedcutAI: DedcutAI = {
  status: () => invoke<AiStatus>('ai_status'),
  hardware: () => invoke<AiHardware>('ai_hardware'),
  download: model => invoke('ai_download', { modelId: model }),
  setRef: png => invoke('ai_set_ref', png),
  cancel: () => invoke('ai_cancel'),
  remove: model => invoke('ai_delete', { modelId: model ?? null }),
  generate: p => invoke<AiResult>('ai_generate', { p }),
  clearFrames: () => invoke('ai_clear_frames'),
  onProgress: f => { listen<{ id: string; done: number; total: number; idx: number; n: number }>('ai-progress', e => f(e.payload)); },
  onLog: f => { listen<{ line: string }>('ai-log', e => f(e.payload.line)); }
};

// Cerveau de DedCut IA : téléchargé avec ai_download('brain') (même dossier que la Vidéo IA), lancé par brain.rs
export interface BrainStatus { supported: boolean; ready: boolean; missing: number; total: number; running: boolean; gpu: boolean; busy: boolean }
const dedcutBrain = {
  status: () => invoke<BrainStatus>('brain_status'),
  start: (gpu = true) => invoke<{ url: string; key: string; gpu: boolean }>('brain_start', { gpu }),
  stop: () => invoke('brain_stop'),
  download: () => invoke('ai_download', { modelId: 'brain' }),
  cancel: () => invoke('ai_cancel'),
  remove: () => invoke('ai_delete', { modelId: 'brain' }),
  hardware: () => invoke<AiHardware>('ai_hardware')
};

// Bibliothèque de vraies musiques (domaine public) : téléchargées sur demande et vérifiées par music.rs
export interface MusicTrack { id: string; cat: string; title: string; artist: string; album: string; dur: number; tags: string[]; page: string; size: number; sha256: string }
const dedcutMusic = {
  catalog: () => invoke<{ base: string; tracks: MusicTrack[]; have: string[]; supported: boolean }>('music_catalog'),
  get: (id: string) => invoke<FileInfo>('music_get', { id }),
  onProgress: (f: (p: { id: string; done: number; total: number }) => void) => { listen<{ id: string; done: number; total: number }>('music-progress', e => f(e.payload)); }
};

// Espace Image : ouvrir / enregistrer sous / écrire (seulement vers un fichier choisi par l'utilisateur, voir image.rs)
const dedcutImg = {
  open: (label: string, exts: string[], multi: boolean) => invoke<FileInfo[]>('img_open', { label, exts, multi }),
  saveDialog: (name: string, label: string, ext: string) => invoke<string | null>('img_save_dialog', { name, label, ext }),
  write: async (path: string, data: Blob) => invoke<FileInfo>('img_write', new Uint8Array(await data.arrayBuffer()), { headers: { path: encodeURIComponent(path) } }),
  url: (path: string) => convertFileSrc(path),
  pickDir: (title: string) => invoke<string | null>('img_pick_dir', { title })
};

// Espace Musique : projets .dcmus, sons, exports, sauvegardes automatiques, prises écrites au fil de l'eau (voir musicfs.rs)
export interface MusOrphan { id: string; path: string; meta: string; size: number }
export interface MusPlugin { format: string; name: string; vendor: string; version: string; path: string; x64: boolean; size: number; modified: number; category: string }
const dedcutMus = {
  open: (label: string, exts: string[], multi: boolean) => invoke<FileInfo[]>('mus_open', { label, exts, multi }),
  allow: (project: string, paths: string[]) => invoke<FileInfo[]>('mus_allow', { project, paths }),
  saveDialog: (name: string, label: string, ext: string) => invoke<string | null>('mus_save_dialog', { name, label, ext }),
  pickDir: (title: string) => invoke<string | null>('mus_pick_dir', { title }),
  write: async (path: string, data: Blob | Uint8Array) => invoke<FileInfo>('mus_write', data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer()), { headers: { path: encodeURIComponent(path) } }),
  copy: (src: string, dst: string) => invoke<FileInfo>('mus_copy', { src, dst }),
  dir: () => invoke<{ path: string; free: number }>('mus_dir'),
  free: (path: string) => invoke<number>('mus_free', { path }),
  url: (path: string) => convertFileSrc(path),
  autosave: (id: string, text: string) => invoke('mus_autosave', { id, text }),
  autosaves: () => invoke<{ id: string; time: number; size: number }[]>('mus_autosaves'),
  autosaveRead: (id: string) => invoke<string>('mus_autosave_read', { id }),
  autosaveDel: (id: string) => invoke('mus_autosave_del', { id }),
  recOpen: (id: string, meta: string) => invoke<number>('mus_rec_open', { id, meta }),
  recAppend: (id: string, bytes: Uint8Array) => invoke<number>('mus_rec_append', bytes, { headers: { id } }),
  recClose: (id: string) => invoke('mus_rec_close', { id }),
  recOrphans: () => invoke<MusOrphan[]>('mus_rec_orphans'),
  recDrop: (id: string) => invoke('mus_rec_drop', { id }),
  plugins: () => invoke<MusPlugin[]>('mus_plugins')
};
export type DedcutMus = typeof dedcutMus;

// Direct (Live) : client RTMP / RTMPS de live.rs ; la page lui envoie des paquets de messages FLV
const dedcutLive = {
  start: (id: number, url: string, key: string, meta: Record<string, number>) => invoke('live_start', { id, url, key, meta }),
  send: (id: number, bytes: Uint8Array) => invoke<{ sent: number; queued: number; full?: boolean }>('live_send', bytes, { headers: { id: String(id) } }),
  stop: (id: number) => invoke('live_stop', { id }),
  onStatus: (f: (s: { id: number; state: string; error?: string }) => void) => { listen<{ id: number; state: string; error?: string }>('live-status', e => f(e.payload)); }
};

const ok = () => new Response('ok');
const json = (v: unknown) => Response.json(v);

async function bodyBytes(opts?: RequestInit): Promise<Uint8Array> {
  const b = opts?.body;
  if (b instanceof Blob) return new Uint8Array(await b.arrayBuffer());
  if (b instanceof ArrayBuffer) return new Uint8Array(b);
  if (b instanceof Uint8Array) return b;
  return new Uint8Array();
}

async function appFetch(url: string, opts?: RequestInit): Promise<Response> {
  const u = new URL(url), q = (k: string) => u.searchParams.get(k) || '';
  switch (u.pathname) {
    case '/__file': {
      const p = q('p');
      if (/\.dedcut$/i.test(p)) return new Response(await invoke<ArrayBuffer>('read_project', { path: p }));
      return fetch(convertFileSrc(p)); // enregistrements (dossier Vidéos\DedCut uniquement)
    }
    case '/__sources': {
      // liste du panneau Enregistrer (écrans puis fenêtres, avec leur petite image), comme dans l'ancienne version
      if (!capSupported) return json([]);
      const l = await capSources(); let i = 0;
      const out = await Promise.all(l.filter(s => !s.min).map(async s => ({ id: s.id, name: s.kind === 'screen' ? String(++i) + (s.primary ? ' · ' + t('partage.primary') : '') : s.name, thumb: await capThumb(s.id, 320, 180).catch(() => '') })));
      return json(out);
    }
    case '/__pick':
      capPreset(capSupported && q('id') ? { id: q('id'), audio: q('audio') === '1' } : null);
      return ok();
    case '/__rec': {
      const op = q('op'), ch = ['cam', 'mic', 'tdesk', 'tmic', 'tmusic'].includes(q('ch')) ? q('ch') : 'scr';
      if (op === 'start') return json({ path: await invoke<string>('rec_start', { ch, name: q('name'), dir: q('dir') || null }) });
      if (op === 'chunk') { await invoke('rec_chunk', await bodyBytes(opts), { headers: { ch } }); return ok(); }
      if (op === 'end') return json({ path: await invoke<string>('rec_end', { ch }) });
      if (op === 'folder') { await invoke('open_folder', { kind: 'rec' }); return ok(); }
      break;
    }
    case '/__out': {
      const op = q('op');
      if (op === 'start') return json({ path: await invoke<string>('out_start', { name: q('name') }) });
      if (op === 'write') { await invoke('out_write', await bodyBytes(opts), { headers: { pos: q('pos') || '0' } }); return ok(); }
      if (op === 'end') return json({ path: await invoke<string>('out_end') });
      if (op === 'show') { await invoke('reveal', { path: q('p') }); return ok(); }
      break;
    }
    case '/__win': {
      const w = getCurrentWindow();
      if (q('a') === 'min') await w.minimize();
      if (q('a') === 'close') await w.close();
      if (q('a') === 'show') { await w.unminimize(); await w.show(); await w.setFocus(); }
      return ok();
    }
    case '/__licences':
      await invoke('open_licences');
      return ok();
  }
  return new Response('', { status: 404 });
}

// « Enregistrer sous » de Windows puis écriture du fichier (vidéo exportée, projet .dedcut, image…)
async function dedcutSave(blob: Blob, name: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const saved = await invoke<string | null>('save_as', bytes, { headers: { name: encodeURIComponent(name) } });
  if (saved && window.toast) window.toast('Enregistré : ' + saved.split(/[\\/]/).pop());
}

// Connecteur IA (MCP) : l'écoute locale est dans src-tauri/src/mcp.rs ; le moteur exécute les demandes (engine.js, MCP_TOOLS)
interface McpStatus { on: boolean; calls: number; claude: boolean; config: string }
const dedcutMCP = {
  enable: (on: boolean) => invoke<{ on: boolean; calls: number }>('mcp_enable', { on }),
  reply: (id: number, result: unknown) => invoke('mcp_reply', { id, result }),
  status: () => invoke<McpStatus>('mcp_status'),
  installClaude: () => invoke<string>('mcp_install_claude'),
  onCall: (cb: (c: { id: number; tool: string; args: Record<string, unknown> }) => void) => listen<{ id: number; tool: string; args: Record<string, unknown> }>('mcp-call', e => cb(e.payload))
};

export async function installPlatform() {
  if (!window.__TAURI_INTERNALS__) {
    window.appFetch = (url, opts) => fetch(url, opts); // hors logiciel (navigateur de test)
    return;
  }
  window.appFetch = appFetch;
  installCapture(); // fenêtre de partage au style de DedCut (à la place de celle de Windows)
  // garde la page active quand la fenêtre est réduite (export, enregistrement)
  try { navigator.locks?.request('dedcut-actif', () => new Promise(() => {})); } catch { /* rien */ }
  window.dedcutSave = dedcutSave;
  window.dedcutFS = dedcutFS;
  window.dedcutMCP = dedcutMCP;
  window.dedcutAI = dedcutAI;
  window.dedcutBrain = dedcutBrain;
  window.dedcutMusic = dedcutMusic;
  window.dedcutLive = dedcutLive;
  (window as unknown as { dedcutImg: typeof dedcutImg }).dedcutImg = dedcutImg;
  (window as unknown as { dedcutMus: typeof dedcutMus }).dedcutMus = dedcutMus;
  window.dedcutChat = dedcutChat;
  window.dedcutUpdate = dedcutUpdate;
  window.dedcutZoom = scale => getCurrentWebview().setZoom(Math.min(2, Math.max(0.5, scale)));
  // glisser-déposer depuis l'explorateur Windows (Tauri donne les vrais chemins des fichiers)
  try {
    await getCurrentWebview().onDragDropEvent(e => {
      const d = e.payload;
      if (d.type === 'enter' || d.type === 'over') window.dedcutDragOver?.(true);
      else if (d.type === 'leave') window.dedcutDragOver?.(false);
      else if (d.type === 'drop') {
        window.dedcutDragOver?.(false);
        const r = window.devicePixelRatio || 1;
        window.dedcutDrop?.(d.paths, d.position.x / r, d.position.y / r);
      }
    });
  } catch { /* rien */ }
  try { window.__dedcutVersion = await getVersion(); } catch { /* rien */ }
  // raccourci utilisable pendant un jeu
  // télécommande sur le téléphone (src-tauri/src/remote.rs)
  // clés de stream chiffrées par Windows (src-tauri/src/secret.rs)
  window.dedcutSecret = { protect: text => invoke<string>('secret_protect', { text }), unprotect: hex => invoke<string>('secret_unprotect', { hex }) };
  window.dedcutRemote = { start: pin => invoke('remote_start', { pin }), stop: () => invoke('remote_stop'), state: json => invoke('remote_state', { json }), on: fn => listen('remote-cmd', e => fn(e.payload)) };
  window.dedcutKeys = { on: (acc, fn) => register(acc, e => { if (e.state === 'Pressed') fn(); }), off: acc => unregister(acc),
    // touche maintenue (appuyer pour parler) : une fonction à l'appui, une au relâchement
    hold: (acc, down, up) => register(acc, e => { if (e.state === 'Pressed') down(); else up(); }) };
  // Ctrl+Maj+R (enregistrer même en jeu) : pris seulement dans Enregistrer / Live (voir recHotSync dans 10b-studio.js)
  // projet .dedcut ouvert par double-clic (au lancement ou logiciel déjà ouvert)
  const waitEngine = async () => { for (let i = 0; i < 200 && !window.openPath; i++) await new Promise(r => setTimeout(r, 50)); };
  const first = await invoke<string | null>('initial_file');
  const opened = (ok: unknown) => { if (ok) window.dispatchEvent(new CustomEvent('dedcut-home-close')); };
  if (first) waitEngine().then(() => window.openPath?.(first)).then(opened);
  await listen<string>('open-file', e => waitEngine().then(() => window.openPath?.(e.payload)).then(opened));
}

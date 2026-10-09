// Sous-titres automatiques (DedCut AI) : 100 % local.
// - le modèle Whisper est téléchargé seulement quand l'utilisateur le demande, depuis une adresse et une révision figées,
//   puis vérifié (taille + SHA-256) avant d'être gardé ;
// - la voix est analysée par morceaux (~25 s, coupés dans les silences) dans un worker ;
// - rien n'est envoyé nulle part : ni l'audio, ni la vidéo, ni le texte.
import MODELS from './whisper-models.json';

const CACHE = 'dedcut-whisper-v1';
const SR = 16000;

export interface CapWord { t: string; s: number; e: number }
type Prog = (done: number, total: number, file: string) => void;

const M: Record<string, { repo: string; revision: string; license: string; totalBytes: number; files: { path: string; size: number; sha256: string }[] }> = MODELS as any;
const urlOf = (key: string, path: string) => `https://huggingface.co/${M[key].repo}/resolve/${M[key].revision}/${path}`;
const marker = (key: string) => `https://dedcut.invalid/verified/${key}`;

async function sha256(buf: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  return Array.from(d, b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- worker ---------- */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { ok: (v: any) => void; ko: (e: Error) => void }>();
function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./captions.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.type === 'error') p.ko(new Error(e.data.message)); else p.ok(e.data.result);
  };
  w.onerror = ev => {
    const err = new Error(ev.message || 'worker');
    pending.forEach(p => p.ko(err)); pending.clear();
  };
  worker = w;
  return w;
}
function call(msg: any, transfer: Transferable[] = []): Promise<any> {
  const w = ensureWorker();
  const id = ++seq;
  return new Promise((ok, ko) => { pending.set(id, { ok, ko }); w.postMessage({ id, ...msg }, transfer); });
}
function killWorker() {
  if (worker) { worker.terminate(); worker = null; }
  const err = new Error('cancelled');
  pending.forEach(p => p.ko(err)); pending.clear();
}

/* ---------- modèles ---------- */
let dlAbort: AbortController | null = null;

export const captions = {
  models() {
    return Object.entries(M).map(([key, m]) => ({ key, repo: m.repo, license: m.license, bytes: m.totalBytes, revision: m.revision }));
  },
  async has(key: string): Promise<boolean> {
    try { return !!(await (await caches.open(CACHE)).match(marker(key))); } catch { return false; }
  },
  async download(key: string, onProgress: Prog): Promise<void> {
    const m = M[key];
    if (!m) throw new Error('model');
    dlAbort = new AbortController();
    const cache = await caches.open(CACHE);
    await cache.delete(marker(key));
    let done = 0;
    try {
      for (const f of m.files) {
        const res = await fetch(urlOf(key, f.path), { signal: dlAbort.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok || !res.body) throw new Error('http ' + res.status);
        const reader = res.body.getReader();
        const parts: Uint8Array[] = [];
        let got = 0;
        for (;;) {
          const { done: end, value } = await reader.read();
          if (end) break;
          parts.push(value); got += value.length;
          onProgress(done + got, m.totalBytes, f.path);
        }
        if (got !== f.size) throw new Error('size ' + f.path);
        const blob = new Blob(parts as BlobPart[]);
        if ((await sha256(await blob.arrayBuffer())) !== f.sha256) throw new Error('sha256 ' + f.path);
        await cache.put(urlOf(key, f.path), new Response(blob, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(f.size) } }));
        done += f.size;
      }
      await cache.put(marker(key), new Response(JSON.stringify({ revision: m.revision, date: Date.now() }), { headers: { 'content-type': 'application/json' } }));
    } catch (e) {
      // pas de fichier à moitié téléchargé ou non vérifié
      for (const f of m.files) await cache.delete(urlOf(key, f.path));
      throw e;
    } finally {
      dlAbort = null;
    }
  },
  cancelDownload() { if (dlAbort) dlAbort.abort(); },
  async remove(key: string): Promise<void> {
    const cache = await caches.open(CACHE);
    for (const f of M[key].files) await cache.delete(urlOf(key, f.path));
    await cache.delete(marker(key));
    killWorker();
  },

  /* ---------- transcription ---------- */
  cancel() { killWorker(); },
  /** samples : voix en 16 kHz mono. Renvoie les mots avec leur temps (en secondes depuis le début de samples). */
  async transcribe(samples: Float32Array, opt: { model: string; language?: string; onProgress?: (p: number) => void }): Promise<{ words: CapWord[]; language: string | null }> {
    const N = samples.length;
    // énergie par trame de 30 ms
    const F = 480, nf = Math.floor(N / F);
    const rms = new Float32Array(nf);
    for (let i = 0; i < nf; i++) { let s = 0; for (let j = i * F, e = j + F; j < e; j++) s += samples[j] * samples[j]; rms[i] = Math.sqrt(s / F); }
    const sorted = Float32Array.from(rms).sort();
    const floor = sorted[Math.floor(nf * 0.1)] || 0;
    const thr = Math.max(0.006, floor * 4);
    // morceaux de ~25 s, coupés au plus calme
    const wins: [number, number][] = [];
    let st = 0;
    while (st < N) {
      let en = Math.min(N, st + 25 * SR);
      if (en < N) {
        let best = Math.floor(en / F), bv = Infinity;
        for (let f = Math.floor((en - 4 * SR) / F); f < Math.floor(en / F); f++) { if (f * F > st + 8 * SR && rms[f] < bv) { bv = rms[f]; best = f; } }
        en = best * F;
      }
      wins.push([st, en]);
      st = en;
    }
    const words: CapWord[] = [];
    await call({ type: 'load', model: opt.model });
    const voicedWin = (k: number) => {
      const f0 = Math.floor(wins[k][0] / F), f1 = Math.max(f0 + 1, Math.floor(wins[k][1] / F));
      let v = 0; for (let f = f0; f < f1 && f < nf; f++) if (rms[f] > thr) v++;
      return v / (f1 - f0) >= 0.04;
    };
    // langue : choisie par l'utilisateur, sinon détectée sur le premier passage parlé
    let language: string | null = opt.language || null;
    if (!language) {
      const k0 = wins.findIndex((_, k) => voicedWin(k));
      if (k0 >= 0) {
        const audio = samples.slice(wins[k0][0], wins[k0][1]);
        try { language = (await call({ type: 'detect', model: opt.model, audio }, [audio.buffer])).language || null; }
        catch (e: any) { if (e && e.message === 'cancelled') throw e; language = null; }
      }
    }
    for (let k = 0; k < wins.length; k++) {
      const [a, b] = wins[k];
      const f0 = Math.floor(a / F), f1 = Math.max(f0 + 1, Math.floor(b / F));
      let voiced = 0; for (let f = f0; f < f1 && f < nf; f++) if (rms[f] > thr) voiced++;
      if (voiced / (f1 - f0) >= 0.04) {
        const audio = samples.slice(a, b);
        let res: any;
        try { res = await call({ type: 'run', model: opt.model, language: language || undefined, words: true, audio }, [audio.buffer]); }
        catch (e: any) {
          if (e && e.message === 'cancelled') throw e;
          const audio2 = samples.slice(a, b); // repli : sans temps par mot
          res = await call({ type: 'run', model: opt.model, language: language || undefined, words: false, audio: audio2 }, [audio2.buffer]);
        }
        const off = a / SR;
        const chunks: any[] = (res && res.chunks) || [];
        for (let i = 0; i < chunks.length; i++) {
          const text = String(chunks[i].text || '');
          if (!text.trim()) continue;
          const ts = chunks[i].timestamp || [];
          if (ts[0] == null) continue;
          const s = ts[0], e = ts[1] != null ? ts[1] : s + 0.4;
          words.push({ t: text, s: off + s, e: off + Math.max(e, s + 0.05) });
        }
      }
      opt.onProgress && opt.onProgress(Math.min(1, b / N));
    }
    // un même mot répété une dizaine de fois = hallucination classique de Whisper
    const out: CapWord[] = [];
    let rep = 0;
    for (const w of words) {
      const prev = out[out.length - 1];
      rep = prev && prev.t.trim().toLowerCase() === w.t.trim().toLowerCase() ? rep + 1 : 0;
      if (rep < 4) out.push(w);
    }
    return { words: out, language };
  }
};

declare global { interface Window { dedcutCaptions: typeof captions } }
window.dedcutCaptions = captions;

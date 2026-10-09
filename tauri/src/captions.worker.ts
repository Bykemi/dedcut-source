// Reconnaissance vocale Whisper, dans un worker (l interface ne se fige pas).
// Tout est local : le modèle vient du cache vérifié par DedCut (SHA-256), jamais d'internet.
import { env, pipeline } from '@huggingface/transformers';
import MODELS from './whisper-models.json';

const CACHE = 'dedcut-whisper-v1';

// Aucun accès réseau : la bibliothèque ne lit que notre cache.
env.allowRemoteModels = false;
env.allowLocalModels = true; // exigé par la bibliothèque ; aucun fichier local n'existe
env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = {
  match: async (key: string) => (await caches.open(CACHE)).match(key),
  put: async () => {}
} as any;
const wasm = (env.backends as any).onnx.wasm;
wasm.wasmPaths = new URL('/ort/', self.location.origin).href; // fichiers du moteur ONNX livrés avec DedCut
wasm.numThreads = 1;

let asr: any = null;
let asrKey = '';

async function load(key: string) {
  if (asr && asrKey === key) return asr;
  const m = (MODELS as any)[key];
  if (!m) throw new Error('model');
  asr = null;
  asr = await pipeline('automatic-speech-recognition', m.repo, { revision: m.revision, dtype: 'q8', device: 'wasm' } as any);
  asrKey = key;
  return asr;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type } = e.data;
  const post = (msg: any) => (self as any).postMessage({ id, ...msg });
  try {
    if (type === 'load') {
      await load(e.data.model);
      post({ type: 'done' });
    } else if (type === 'detect') {
      // Détection de la langue : on laisse le modèle choisir le jeton de langue juste après <|startoftranscript|>
      const a = await load(e.data.model);
      const inputs = await a.processor(e.data.audio);
      const gc = a.model.generation_config;
      const out = await a.model.generate({ inputs: inputs.input_features, decoder_input_ids: [gc.decoder_start_token_id], max_new_tokens: 1 });
      const seq = (out && out.tolist ? out.tolist() : out)[0];
      const tok = Number(seq[seq.length - 1]);
      let code: string | null = null;
      for (const [k, v] of Object.entries(gc.lang_to_id || {})) if (Number(v) === tok) code = k.replace(/[<|>]/g, '');
      post({ type: 'done', result: { language: code } });
    } else if (type === 'run') {
      const a = await load(e.data.model);
      const opts: any = { task: 'transcribe', return_timestamps: e.data.words ? 'word' : true };
      if (e.data.language) opts.language = e.data.language;
      const out = await a(e.data.audio, opts);
      const chunks = (out.chunks || []).map((c: any) => ({ text: c.text, timestamp: c.timestamp }));
      post({ type: 'done', result: { text: out.text, chunks } });
    }
  } catch (err: any) {
    post({ type: 'error', message: String((err && err.message) || err) });
  }
};

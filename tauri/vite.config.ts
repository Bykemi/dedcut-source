import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le moteur ONNX (21 Mo) est livré une seule fois, dans public/ort/ (la reconnaissance vocale le charge de là).
// Vite en émet aussi une copie à son nom haché, que rien n'utilise : on la retire pour garder l'installateur léger.
const dropDuplicateOrtWasm = () => ({
  name: 'drop-duplicate-ort-wasm',
  generateBundle(_options: unknown, bundle: Record<string, unknown>) {
    for (const k of Object.keys(bundle)) if (/(^|\/)ort-wasm[^/]*\.wasm$/.test(k)) delete bundle[k];
  }
});

// Configuration Vite pour Tauri (fichiers servis en local, aucun accès réseau)
export default defineConfig({
  plugins: [react(), dropDuplicateOrtWasm()],
  clearScreen: false,
  server: { port: 5178, strictPort: true },
  build: { target: 'chrome120', outDir: 'dist', chunkSizeWarningLimit: 4000 }
});

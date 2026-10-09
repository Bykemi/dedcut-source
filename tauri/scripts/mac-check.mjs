// Vérification automatique du moteur de DedCut dans un navigateur (utilisé par le test Mac sur GitHub).
// Usage : node scripts/mac-check.mjs <webkit|chromium> <dossier de sortie> [adresse]
// Le serveur de développement doit tourner (npx vite --port 5199). Playwright n'est pas livré avec DedCut :
// il est installé seulement pour ce test (npm i --no-save playwright).
// Résultat : rapport.json, rapport.md (résumé lisible) et des captures d'écran dans le dossier de sortie.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [engine = 'webkit', outDir = 'mac-report', url = 'http://localhost:5199/'] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const pw = (() => { try { return require('playwright'); } catch { return require(process.env.PLAYWRIGHT_MODULE || 'playwright'); } })();
fs.mkdirSync(outDir, { recursive: true });

const report = { engine, date: new Date().toISOString(), checks: [], errors: [] };
const check = (name, ok, detail = '') => { report.checks.push({ name, ok: !!ok, detail: String(detail) }); console.log((ok ? 'OK   ' : 'ÉCHEC') + ' ' + name + (detail ? ' — ' + detail : '')); };

const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--enable-unsafe-swiftshader'] } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
page.on('pageerror', e => report.errors.push(e.message));
try {
  await page.goto(url);
  const loaded = await page.waitForFunction(() => !!window.dedcutAPI && typeof renderEffects === 'function', null, { timeout: 120000 }).then(() => true, () => false);
  check('Le moteur se charge', loaded);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `${engine}-accueil.png`) });
  if (loaded) {
    const r = await page.evaluate(async () => {
      const out = {};
      const vc = { codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 8e6, framerate: 30 };
      out.video = !!window.VideoEncoder && !!(await VideoEncoder.isConfigSupported(vc).catch(() => ({}))).supported;
      out.video4k = !!window.VideoEncoder && !!(await VideoEncoder.isConfigSupported({ ...vc, codec: 'avc1.640033', width: 3840, height: 2160, bitrate: 3e7 }).catch(() => ({}))).supported;
      out.audio = !!window.AudioEncoder && !!(await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }).catch(() => ({}))).supported;
      out.decoder = !!window.VideoDecoder;
      out.recorder = !!window.MediaRecorder && ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm'].filter(t => MediaRecorder.isTypeSupported(t)).join(', ');
      out.worklet = !!(window.AudioContext && AudioContext.prototype && 'audioWorklet' in AudioContext.prototype);
      out.webgl = glSetup();
      out.badShaders = [];
      if (out.webgl) {
        for (const k of Object.keys(GLFX)) if (!glProgram(k)) out.badShaders.push('effet ' + k);
        for (const k of Object.keys(GLTR)) if (!glTrProgram(k)) out.badShaders.push('transition ' + k);
      }
      // chaque effet sur la photo d'exemple : aucune erreur attendue
      const im = new Image(); im.src = 'filter-sample.jpg'; await im.decode();
      const S = 160, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
      out.fxFail = [];
      for (const k of FX) {
        const sv = [ctx, W, H]; ctx = g; W = S; H = S;
        try { g.drawImage(im, 0, 0, S, S); const set = noFx(); set[k] = true; applyFX({ fx: set, amt: 70 }, 1.3, 1.3); } catch (e) { out.fxFail.push(k + ': ' + e.message); } finally { ctx = sv[0]; W = sv[1]; H = sv[2]; }
      }
      out.fxCount = FX.length;
      const t0 = performance.now();
      out.ai = !!(await Promise.race([personSeg(), new Promise(r => setTimeout(() => r(null), 60000))]));
      out.aiMs = Math.round(performance.now() - t0);
      return out;
    });
    check('Export vidéo H.264 (1080p)', r.video);
    check('Export vidéo 4K', r.video4k);
    check('Son AAC à l\'export', r.audio);
    check('Lecture image par image (VideoDecoder)', r.decoder);
    check('Enregistrement (MediaRecorder)', !!r.recorder, r.recorder || 'aucun format');
    check('Effets sonores (AudioWorklet)', r.worklet);
    check('Carte graphique (WebGL)', r.webgl);
    check('Effets et transitions WebGL', r.webgl && r.badShaders.length === 0, r.badShaders.join(', '));
    check(`Les ${r.fxCount} effets s'appliquent`, r.fxFail.length === 0, r.fxFail.join(' | '));
    check('IA de détourage (MediaPipe)', r.ai, r.ai ? r.aiMs + ' ms' : 'pas chargée en 60 s');
    // ouvrir l'éditeur
    await page.locator('.dc-qf').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByText(/Ne plus afficher les astuces|Don't show tips again/).click({ timeout: 3000 }).catch(() => {});
    const editor = await page.evaluate(() => !window.dedcutHomeVisible);
    check('L\'éditeur s\'ouvre', editor);
    await page.screenshot({ path: path.join(outDir, `${engine}-editeur.png`) });
  }
} catch (e) {
  check('Le test s\'est déroulé jusqu\'au bout', false, e.message);
}
check('Aucune erreur JavaScript', report.errors.length === 0, report.errors.slice(0, 5).join(' | '));
await browser.close();

fs.writeFileSync(path.join(outDir, `rapport-${engine}.json`), JSON.stringify(report, null, 2));
const md = [`### DedCut — moteur testé dans ${engine}`, '', '| Vérification | Résultat | Détail |', '| --- | --- | --- |',
  ...report.checks.map(c => `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${c.detail.replace(/\|/g, '/').slice(0, 300)} |`), ''].join('\n');
fs.writeFileSync(path.join(outDir, `rapport-${engine}.md`), md);
process.exitCode = report.checks.every(c => c.ok) ? 0 : 1;

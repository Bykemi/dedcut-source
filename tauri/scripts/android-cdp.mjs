// Lit l'intérieur de la page de DedCut dans le téléphone Android virtuel (APK de test : le débogage de la page est actif).
// Usage : node scripts/android-cdp.mjs [port]   (après « adb forward tcp:9222 localabstract:webview_devtools_remote_<pid> »)
// Affiche une ligne de tableau ✅/❌ et un extrait du texte de la page.
const port = process.argv[2] || '9222';
const row = (name, ok, detail = '') => console.log(`| ${name} | ${ok ? '✅' : '❌'} | ${String(detail).replace(/[|\n]/g, ' ').slice(0, 250)} |`);
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = pages.find(p => p.type === 'page') || pages[0];
  if (!page) throw new Error('aucune page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error('connexion')); });
  let id = 0;
  const call = (method, params) => new Promise(res => { const my = ++id; const h = e => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: my, method, params })); });
  const evalJs = async expr => (await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  const info = await evalJs(`(async()=>({
    text: (document.body && document.body.innerText || '').replace(/\\s+/g,' ').trim().slice(0,200),
    engine: typeof renderEffects === 'function',
    api: !!window.dedcutAPI,
    w: innerWidth, h: innerHeight,
    video: !!window.VideoEncoder && !!(await VideoEncoder.isConfigSupported({codec:'avc1.640028',width:1920,height:1080,bitrate:8e6,framerate:30}).catch(()=>({}))).supported,
    audio: !!window.AudioEncoder && !!(await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000}).catch(()=>({}))).supported,
    webgl: !!document.createElement('canvas').getContext('webgl')
  }))()`);
  ws.close();
  row("La page de DedCut s'affiche", info && /DedCut/i.test(info.text), info && info.text);
  row('Le moteur de montage est chargé', info && info.engine && info.api);
  row('Export vidéo H.264 (1080p)', info && info.video);
  row("Son AAC à l'export", info && info.audio);
  row('Carte graphique (WebGL)', info && info.webgl);
  console.log(`(écran de la page : ${info && info.w} × ${info && info.h})`);
} catch (e) {
  row("Lecture de la page de DedCut", false, e.message);
}

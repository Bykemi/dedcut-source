import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import App from './App';
import Home from './Home';
import TitleBar from './TitleBar';
import Support from './Support';
import './home.css';
import { installPlatform } from './platform';
import { initI18n } from './i18n';
import { startIntro } from './intro';
import './captions';
import './qr';
import './dedcut.css';

// Charge un script classique (le moteur garde ses variables globales, comme avant)
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Impossible de charger ' + src));
    document.body.appendChild(s);
  });
}

async function start() {
  // animation du logo (déjà affichée par index.html) : fin, « passer », ou retirée si coupée dans les réglages
  startIntro();
  // 0) langue (celle de Windows au premier lancement, sinon le choix enregistré)
  await initI18n();
  // 1) la mise en page React est affichée tout de suite
  const root = createRoot(document.getElementById('root')!);
  flushSync(() => root.render(<App />));
  // la mise en page vient d'être affichée : on applique la langue à ses textes (data-i18n)
  window.i18n.applyDom();
  // barre de titre DedCut (dans le logiciel Windows ; absente si on ouvre la page dans un navigateur)
  if ('__TAURI_INTERNALS__' in window) {
    document.body.classList.add('has-wbar');
    const wbEl = document.createElement('div');
    document.body.appendChild(wbEl);
    createRoot(wbEl).render(<TitleBar />);
  }
  // fenêtre « Soutenir DedCut » (ouverte par le bouton ♥ de l'en-tête)
  // espace Image : chargé seulement quand on l'ouvre la première fois
  let imgMounted = false;
  window.addEventListener('dedcut-image-open', async () => {
    if (imgMounted) return; imgMounted = true;
    const el = document.getElementById('imgApp'); if (!el) return;
    const { default: ImageApp } = await import('./image/ImageApp');
    createRoot(el).render(<ImageApp />);
  });
  // espace Musique : chargé seulement quand on l'ouvre la première fois
  let muMounted = false;
  window.addEventListener('dedcut-music-open', async () => {
    if (muMounted) return; muMounted = true;
    const el = document.getElementById('muApp'); if (!el) return;
    const { default: MusicApp } = await import('./music/MusicApp');
    createRoot(el).render(<MusicApp />);
  });
  const supEl = document.createElement('div');
  document.body.appendChild(supEl);
  createRoot(supEl).render(<Support />);
  // écran d'accueil : composant React séparé, au-dessus de l'éditeur
  const homeEl = document.createElement('div');
  document.body.appendChild(homeEl);
  createRoot(homeEl).render(<Home />);
  // 2) le pont vers Windows (fichiers, fenêtre, raccourci) est prêt avant le moteur
  await installPlatform();
  // 3) bibliothèques MP4 puis moteur de l'éditeur
  await loadScript('/vendor/mp4box.js');
  await loadScript('/vendor/mp4-muxer.js');
  // moteur de l'éditeur : morceaux thématiques (public/engine/), chargés dans l'ordre car ils partagent leurs variables
  const parts: string[] = await (await fetch('/engine/parts.json')).json();
  for (const p of parts) await loadScript('/engine/' + p);
  await loadScript('/captions-ui.js');
  await loadScript('/gen-ui.js');
  await loadScript('/detach.js');
  await loadScript('/tour.js');
}

start().catch(e => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f87171;padding:20px">${String(e)}</pre>`);
});

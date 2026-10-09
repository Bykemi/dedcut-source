// Animation de lancement (v4.53) : le « D » de DedCut se fait couper en deux, puis le nom apparaît.
// Le dessin et l'animation sont dans index.html (affichés dès le premier instant, avant le chargement de l'app) ;
// ici : la fin, « passer » (clic ou touche), « revoir » (Réglages de l'accueil) et le réglage pour la couper.
// Rien ne tourne après : l'élément est retiré de la page (pas d'animation qui use le PC).
// v4.58 : avec son (introsound.ts), calé sur l'endroit où en est déjà l'animation.
import { introSoundPrepare } from './introsound';
const KEY = 'dedcut-intro';
let tpl: HTMLElement | null = null;
export const introOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export const setIntroOn = (v: boolean) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* rien */ } };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// --dc-in : retard de l'entrée animée des cartes de l'accueil (elles arrivent quand le logo s'efface)
const setIn = (v: string) => document.documentElement.style.setProperty('--dc-in', v);

// où en est déjà l'animation (elle démarre avec la page, avant ce code), en secondes
// (temps de l'image en cours + ce qui s'est écoulé depuis son début)
const elapsed = (el: HTMLElement) => {
  try {
    const c = el.getAnimations()[0]?.currentTime, d = document.timeline.currentTime;
    return typeof c === 'number' ? (c + (typeof d === 'number' ? Math.max(0, performance.now() - d) : 0)) / 1000 : 0;
  } catch { return 0; }
};

function run(el: HTMLElement) {
  setIn(reduced() ? '0.9s' : '1.75s');
  // le son part quand l'animation a vraiment démarré (première image affichée), calé sur l'endroit où elle en est
  let over = false;
  const snd = introSoundPrepare(reduced());
  const sound = () => { if (!over && !el.classList.contains('dci-skip')) snd?.play(elapsed(el)); };
  const a = el.getAnimations()[0];
  if (a && a.pending) a.ready.then(sound, () => { /* rien */ }); else sound();
  const finish = () => { if (over) return; over = true; el.remove(); setIn('0s'); window.removeEventListener('keydown', skip, true); };
  const skip = () => { if (over || el.classList.contains('dci-skip')) return; el.classList.add('dci-skip'); setIn('0s'); snd?.hush(); setTimeout(finish, 260); };
  el.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, true);
  setTimeout(finish, reduced() ? 1250 : 2250);
}

/** au démarrage : garde un modèle (pour « revoir »), puis joue l'animation ou la retire tout de suite */
export function startIntro() {
  const el = document.getElementById('dcIntro');
  if (!el) return;
  tpl = el.cloneNode(true) as HTMLElement;
  if (!introOn()) { el.remove(); setIn('0s'); return; }
  run(el);
}

/** rejouer l'animation (bouton des Réglages) */
export function playIntro() {
  if (!tpl || document.getElementById('dcIntro')) return;
  const el = tpl.cloneNode(true) as HTMLElement;
  document.body.appendChild(el);
  run(el);
}
window.addEventListener('dedcut-intro', playIntro);

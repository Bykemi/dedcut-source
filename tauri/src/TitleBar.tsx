// Barre de titre de DedCut (la barre blanche de Windows est retirée : decorations=false dans tauri.conf.json).
// Dans l'éditeur, c'est l'en-tête (App.tsx) qui sert de barre de fenêtre ; cette barre-ci ne s'affiche que sur l'écran d'accueil.
// Zone de glisser = toute la barre ; double-clic = agrandir / restaurer. Boutons : réduire, agrandir, fermer.
// ⚠ Identifiant « wbar » : « tbar » est déjà la barre d'outils de la timeline (ne jamais réutiliser ce nom).
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { t, useLang } from './i18n';

const inTauri = () => '__TAURI_INTERNALS__' in window;

/* boutons réduire / agrandir / fermer (rien hors du logiciel Windows) */
export function WinControls() {
  useLang();
  const [max, setMax] = useState(false);
  useEffect(() => {
    if (!inTauri()) return;
    const win = getCurrentWindow();
    let off: (() => void) | undefined;
    const sync = () => { win.isMaximized().then(setMax).catch(() => {}); };
    sync();
    win.onResized(sync).then(u => { off = u; }).catch(() => {});
    return () => { off && off(); };
  }, []);
  if (!inTauri()) return null;
  const win = getCurrentWindow();
  return (
    <div className="wc">
      <button title={t('win.minimize')} aria-label={t('win.minimize')} onClick={() => win.minimize()}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
      </button>
      <button title={t(max ? 'win.restore' : 'win.maximize')} aria-label={t(max ? 'win.restore' : 'win.maximize')} onClick={() => win.toggleMaximize()}>
        {max
          ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3.5 3.5v-1h6v6h-1M2.5 3.5h6v6h-6z" stroke="currentColor" strokeWidth="1.1" fill="none" /></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>}
      </button>
      <button className="x" title={t('win.close')} aria-label={t('win.close')} onClick={() => win.close()}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
      </button>
    </div>
  );
}

export default function TitleBar() {
  useLang();
  const [title, setTitle] = useState(document.title);
  const logo = (document.getElementById('hlogo') as HTMLImageElement | null)?.src || '';
  useEffect(() => {
    const el = document.querySelector('title');
    const mo = new MutationObserver(() => setTitle(document.title));
    if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <div id="wbar" data-tauri-drag-region>
      {logo && <img src={logo} width={18} height={18} alt="" />}
      <span className="tt" data-tauri-drag-region>{title}</span>
      <WinControls />
    </div>
  );
}

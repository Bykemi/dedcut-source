// Fenêtre « Soutenir DedCut » de l'éditeur (le bouton ♥ est dans l'en-tête, voir App.tsx).
// Dons facultatifs : rien n'est jamais bloqué (cahier des charges §25).
import { useEffect, useState } from 'react';
import { t, useLang } from './i18n';
import { DONATE_URL } from './config';

export default function Support() {
  useLang();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const show = () => { setNote(''); setOpen(true); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('dedcut-support', show);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('dedcut-support', show); window.removeEventListener('keydown', key); };
  }, []);

  if (!open) return null;
  const donate = () => {
    if (DONATE_URL) window.dedcutAPI?.openLink(DONATE_URL);
    else setNote(t('support.soon'));
  };
  return (
    <div className="dc-modal" style={{ zIndex: 300 }} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="dc-box" role="dialog" aria-modal="true">
        <h3>♥ {t('support.title')}</h3>
        <p>{t('support.text')}</p>
        <button className="dc-btn dc-pink" onClick={donate}>{t('support.button')}</button>
        {note && <p className="dc-hint">{note}</p>}
        <button className="dc-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>{t('common.close')}</button>
      </div>
    </div>
  );
}

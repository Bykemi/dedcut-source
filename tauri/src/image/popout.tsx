// DedCut Image — panneaux dans des fenêtres à part (par exemple sur un 2e écran), comme dans le Montage.
// Le panneau reste un composant de la fenêtre principale (même éditeur, mêmes réglages) : React l'affiche dans le
// document de l'autre fenêtre. La souris (glisser une couleur, une courbe) et les raccourcis sont renvoyés à la fenêtre
// principale. Préférences sur ce PC : settings.out (panneaux à part) et settings.outPos (place et taille).
import { useEffect, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';
import { ed, useEd, toast, lastDoc } from './state';
import { Ico } from './icons';
import { PanelBody, ORDER_DEF, ICON } from './panels';
import type { Tools } from './tools';

const wins = new Map<string, Window>();
window.addEventListener('dedcut-img-focus', e => { try { wins.get((e as CustomEvent<string>).detail)?.focus(); } catch { /* fenêtre fermée */ } });
export function dockPanel(k: string) { const s = ed.settings; s.out = { ...s.out, [k]: false }; ed.saveSettings(); ed.emit(); }
export function popPanel(k: string) { const s = ed.settings; s.out = { ...s.out, [k]: true }; s.panels[k] = true; ed.saveSettings(); ed.emit(); }

function PopPanel({ k, tools }: { k: string; tools: MutableRefObject<Tools | null> }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const s = ed.settings, p = s.outPos?.[k], i = Math.max(0, ORDER_DEF.indexOf(k));
    const w0 = Math.round(p?.w || 340), h0 = Math.round(p?.h || 560), x0 = Math.round(p?.x ?? window.screenX + 140 + i * 30), y0 = Math.round(p?.y ?? window.screenY + 120 + i * 30);
    let W: Window | null = null;
    try { W = window.open('', 'dedcut-img-' + k, `popup,width=${w0},height=${h0},left=${x0},top=${y0}`); } catch { /* refusé */ }
    if (!W) { toast(t('detach.fail')); dockPanel(k); return; }
    const win = W; wins.set(k, win);
    let doc: Document | null = null, alive = true;
    const pointer = (e: PointerEvent) => {
      const ev = new PointerEvent(e.type, { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, button: e.button, buttons: e.buttons, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, pressure: e.pressure, tiltX: e.tiltX, tiltY: e.tiltY, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey });
      window.dispatchEvent(ev);
    };
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null; if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: e.key, code: e.code, repeat: e.repeat, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey });
      window.dispatchEvent(ev); if (ev.defaultPrevented) e.preventDefault();
    };
    const build = () => {
      const d = win.document; d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>DedCut</title></head><body><div id="imPop"></div></body></html>'); d.close();
      for (const n of document.querySelectorAll('link[rel=stylesheet],style')) { const c = d.importNode(n, true) as HTMLLinkElement; if ((n as HTMLLinkElement).href) c.href = (n as HTMLLinkElement).href; d.head.appendChild(c); }
      // mêmes couleurs, même langue que DedCut
      const H = d.documentElement, M = document.documentElement; H.setAttribute('style', M.getAttribute('style') || ''); H.className = M.className; H.lang = M.lang;
      for (const a of M.attributes) if (a.name.startsWith('data-')) H.setAttribute(a.name, a.value);
      d.body.className = 'im-popbody'; d.title = t('img.p.' + k) + ' — DedCut';
      d.addEventListener('pointerdown', () => { lastDoc.d = d; }, true);
      for (const ty of ['pointermove', 'pointerup', 'pointercancel']) d.addEventListener(ty, e => pointer(e as PointerEvent));
      d.addEventListener('keydown', key);
      d.addEventListener('dragover', e => e.preventDefault()); d.addEventListener('drop', e => e.preventDefault());
      doc = d; setHost(d.getElementById('imPop'));
    };
    build();
    // la fenêtre peut remplacer sa page vide juste après l'ouverture : on vérifie et on reconstruit si besoin
    let n = 0; const chk = setInterval(() => { if (++n > 15 || !alive) { clearInterval(chk); return; } if (win.closed) return; if (win.document !== doc || !win.document.getElementById('imPop')) build(); }, 100);
    // fermée par sa croix : le panneau revient dans la colonne ; sinon on retient sa place
    const poll = setInterval(() => {
      if (win.closed) { if (alive) dockPanel(k); return; }
      if (n > 4) try { s.outPos = { ...s.outPos, [k]: { x: win.screenX, y: win.screenY, w: win.innerWidth, h: win.innerHeight } }; } catch { /* rien */ }
    }, 1000);
    return () => {
      alive = false; clearInterval(chk); clearInterval(poll); wins.delete(k); ed.saveSettings(); setHost(null); if (lastDoc.d === doc) lastDoc.d = document;
      // dans DedCut, la fenêtre elle-même est fermée par Windows (la page ne peut fermer que son contenu)
      try { const ti = win.document.title; (window as unknown as { __TAURI_INTERNALS__?: { invoke(c: string, a: object): Promise<unknown> } }).__TAURI_INTERNALS__?.invoke('close_panel', { title: ti }).catch(() => { }); } catch { /* rien */ }
      try { win.close(); } catch { /* rien */ }
    };
  }, [k]);
  useEd();
  if (!host) return null;
  return createPortal(<div className="im-pop">
    <div className="im-popbar"><Ico n={ICON[k]} s={14} /><b>{t('img.p.' + k)}</b><span>DedCut Image</span><i />
      <button onClick={() => dockPanel(k)}><Ico n="popin" s={13} /><span>{t('detach.in')}</span></button></div>
    <section className={'im-panel im-p-' + k}><PanelBody k={k} tools={tools} /></section>
  </div>, host);
}
/** une fenêtre par panneau mis à part */
export function PanelWindows({ tools }: { tools: MutableRefObject<Tools | null> }) {
  useEd(); const out = ed.settings.out || {};
  return <>{ORDER_DEF.filter(k => out[k]).map(k => <PopPanel key={k} k={k} tools={tools} />)}</>;
}
// DedCut se ferme : les fenêtres à part aussi (elles se rouvriront au prochain lancement)
window.addEventListener('pagehide', () => { for (const w of wins.values()) try { w.close(); } catch { /* rien */ } });

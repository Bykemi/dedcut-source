// DedCut Image — menu du clic droit (sur l'image et sur les calques) : envoyer au Montage, copier, dupliquer…
// Le menu s'ouvre dans la fenêtre où l'on a cliqué (fenêtre principale ou panneau mis à part).
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';
import { ed, useEd } from './state';
import { Ico } from './icons';

export interface CtxItem { label: string; icon?: string; run: () => void; off?: boolean; sep?: boolean; danger?: boolean }
export const ctx = { x: 0, y: 0, items: null as CtxItem[] | null, win: window as Window };
export function openCtx(e: React.MouseEvent, items: CtxItem[]) {
  e.preventDefault(); e.stopPropagation();
  ctx.x = e.clientX; ctx.y = e.clientY; ctx.items = items; ctx.win = (e.currentTarget as HTMLElement).ownerDocument.defaultView || window; ed.emit();
}
const closeCtx = () => { if (ctx.items) { ctx.items = null; ed.emit(); } };

export function CtxMenu() {
  useEd(); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ctx.items) return;
    const w = ctx.win;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) closeCtx(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeCtx(); } };
    w.addEventListener('pointerdown', down, true); w.addEventListener('keydown', key, true); w.addEventListener('blur', closeCtx);
    // le menu reste dans la fenêtre
    const b = box.current; if (b) { const r = b.getBoundingClientRect(); b.style.left = Math.max(4, Math.min(ctx.x, w.innerWidth - r.width - 6)) + 'px'; b.style.top = Math.max(4, Math.min(ctx.y, w.innerHeight - r.height - 6)) + 'px'; }
    return () => { w.removeEventListener('pointerdown', down, true); w.removeEventListener('keydown', key, true); w.removeEventListener('blur', closeCtx); };
  });
  if (!ctx.items) return null;
  const menu = <div className="im-ctx" ref={box} style={{ left: ctx.x, top: ctx.y }} role="menu">
    {ctx.items.map((it, i) => [it.sep && <hr key={'s' + i} />,
      <button key={i} role="menuitem" disabled={!!it.off} className={it.danger ? 'danger' : ''} onClick={() => { closeCtx(); it.run(); }}>
        <i>{it.icon ? <Ico n={it.icon} s={14} /> : null}</i><span>{t(it.label)}</span></button>])}
  </div>;
  return ctx.win === window ? menu : createPortal(menu, ctx.win.document.body);
}

// DedCut Musique — glisser à la souris : sons, instruments et chaînes du navigateur vers les pistes, ordre des pistes,
// fichiers lâchés depuis l'Explorateur. Le glisser-déposer HTML ne marche pas dans l'app Windows : Tauri réserve le
// dépôt aux fichiers de l'Explorateur. Les cibles portent l'attribut data-mudrop et reçoivent l'événement « mu-drop ».
import { useEffect, useRef } from 'react';
import type { DropItem } from './arrange';

export type DragData = DropItem | { kind: 'track'; id: number } | { kind: 'files'; paths: string[] };
/** done : la cible a pris le dépôt */
export interface MuDrop { data: DragData; x: number; y: number; done?: boolean }

/** envoie un dépôt à la cible sous le point (x, y) ; vrai si elle l'a pris */
export function dropAt(data: DragData, x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y)?.closest('[data-mudrop]'); if (!el) return false;
  const d: MuDrop = { data, x, y }; el.dispatchEvent(new CustomEvent<MuDrop>('mu-drop', { detail: d })); return !!d.done;
}

/** à brancher sur onPointerDown : le glisser commence après 5 px (un simple clic reste un clic) */
export function startDrag(e: React.PointerEvent, data: DragData, label: string) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button,input,select')) return;
  const x0 = e.clientX, y0 = e.clientY, host = document.getElementById('muApp') || document.body;
  let ghost: HTMLDivElement | null = null, over: Element | null = null;
  const setOver = (el: Element | null) => { if (el === over) return; over?.classList.remove('mu-over'); over = el; over?.classList.add('mu-over'); };
  const mv = (ev: PointerEvent) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      ghost = document.createElement('div'); ghost.className = 'mu-ghost'; ghost.textContent = label; host.appendChild(ghost); document.documentElement.classList.add('mu-dragging');
    }
    ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 10}px)`;
    setOver(document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-mudrop]') || null);
  };
  const end = (ev: PointerEvent) => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); setOver(null);
    if (!ghost) return;
    ghost.remove(); document.documentElement.classList.remove('mu-dragging');
    if (ev.type === 'pointerup') dropAt(data, ev.clientX, ev.clientY);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
}

/** écoute les dépôts sur l'élément d'une référence React (la fonction la plus récente est toujours appelée) */
export function useDrop(ref: React.RefObject<HTMLElement | null>, f: (d: MuDrop) => void) {
  const fr = useRef(f); fr.current = f;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const h = (ev: Event) => fr.current((ev as CustomEvent<MuDrop>).detail);
    el.addEventListener('mu-drop', h); return () => el.removeEventListener('mu-drop', h);
  }, [ref]);
}

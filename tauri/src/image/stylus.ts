// DedCut Image — tablettes graphiques (Wacom, XP-Pen, Huion, stylets Surface…) : pression avec une courbe réglable,
// inclinaison, bout gomme du stylet et bouton latéral. Windows transmet tout cela par les événements « pointer » du stylet
// (pilote en mode Windows Ink).
import { ed } from './state';
export type { PenSettings } from './editor';

export const isPen = (e: PointerEvent) => e.pointerType === 'pen';
/** bout gomme (stylet retourné) : bouton 5, ou bit 32 des boutons enfoncés */
export const penEraser = (e: PointerEvent) => isPen(e) && (e.button === 5 || (e.buttons & 32) !== 0);
/** bouton latéral du stylet : Windows l'envoie comme un clic droit */
export const penBarrel = (e: PointerEvent) => isPen(e) && (e.button === 2 || ((e.buttons & 2) !== 0 && e.button !== 0));


/** pression 0..1 après la courbe choisie (douce, normale, ferme) et la taille minimale ; souris et doigt : 1 */
export function pressureOf(e: PointerEvent): number {
  if (!isPen(e)) return 1;
  const s = ed.settings.pen, p = Math.max(0, Math.min(1, e.pressure || 0));
  if (!penLive.pressureSeen && Math.abs(p - .5) < .002) return 1;
  return s.min + (1 - s.min) * Math.pow(p, s.curve);
}
/** direction du stylet en degrés d'après son inclinaison ; null si le stylet est presque droit ou si l'option est coupée */
export function tiltAngle(e: PointerEvent): number | null {
  if (!isPen(e) || !ed.settings.pen.tilt) return null;
  const tx = e.tiltX || 0, ty = e.tiltY || 0; if (Math.abs(tx) + Math.abs(ty) < 6) return null;
  return Math.atan2(ty, tx) * 180 / Math.PI;
}

/** dernier état du stylet (pour la zone d'essai des préférences) */
export const penLive = { type: '', pressure: 0, tiltX: 0, tiltY: 0, eraser: false, barrel: false, pressureSeen: false, events: 0 };
export function notePen(e: PointerEvent) {
  penLive.type = e.pointerType; penLive.events++;
  if (!isPen(e)) return;
  penLive.pressure = e.pressure; penLive.tiltX = e.tiltX || 0; penLive.tiltY = e.tiltY || 0; penLive.eraser = penEraser(e); penLive.barrel = penBarrel(e);
  // sans prise en charge de la pression, le navigateur donne 0,5 dès qu'on appuie : une autre valeur prouve que la pression arrive
  if (e.buttons && e.pressure > 0 && Math.abs(e.pressure - .5) > .01) penLive.pressureSeen = true;
}

/** le bouton latéral (ou un appui long du stylet) ne doit pas ouvrir le menu du clic droit pendant qu'on dessine */
let noMenuUntil = 0;
/** après quelques traits au stylet sans aucune pression, un seul message pour dire où trouver l'aide */
let penStrokes = 0, warned = false;
export function penStrokeDone(e: PointerEvent): boolean {
  if (!isPen(e) || penLive.pressureSeen || warned) return false;
  if (++penStrokes < 3) return false;
  warned = true; return true;
}

export function blockMenu(ms = 700) { noMenuUntil = Date.now() + ms; }
export const menuBlocked = () => Date.now() < noMenuUntil;

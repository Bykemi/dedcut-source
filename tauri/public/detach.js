/* DedCut — fenêtres séparées : un panneau (timeline, vidéo, propriétés, bibliothèque) sort de DedCut dans sa propre
   fenêtre, par exemple pour le mettre sur un 2e écran. Le moteur reste dans la fenêtre principale : le panneau (mêmes
   éléments, mêmes réglages) est simplement déplacé dans le document de la nouvelle fenêtre, et ses événements
   (souris, clavier) sont renvoyés à la fenêtre principale comme s'ils venaient d'elle.
   Préférences sur ce PC : dedcut-detach (panneaux à rouvrir séparés), dedcut-detach-pos (place et taille de chaque fenêtre). */
(() => {
const PANES = {
  tl: { sel: '#tl', name: 'layout.timeline', w: 1200, h: 330 },
  stage: { sel: '#stage', name: 'layout.video', w: 960, h: 600 },
  insp: { sel: '#insp', name: 'layout.props', w: 380, h: 720 },
  left: { sel: '#left', name: 'layout.library', w: 440, h: 720 }
};
// panneaux d'autres espaces (studio Enregistrer / Live : 10q-stlayout.js) : déclarés avant ce fichier, avec « space »
Object.assign(PANES, window.dedcutDetachExtra || {});
const KEYS = Object.keys(PANES).filter(k => !PANES[k].space); // panneaux du Montage (boutons et fenêtre « Disposition » du Montage)
const D = window.dedcutDetached = new Map(); // clé -> { k, win, doc, el, ph, ro }
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { } return null };
const json = k => { try { return JSON.parse(pref(k) || 'null') } catch (e) { return null } };
const svg = p => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const ICO_OUT = svg('<path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');
const ICO_IN = svg('<path d="M20 4l-8 8M12 6v6h6"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');

/* --- les recherches d'éléments ($, getElementById…) trouvent aussi les panneaux partis dans une autre fenêtre --- */
const P = Document.prototype, gid = P.getElementById, qs = P.querySelector, qsa = P.querySelectorAll, efp = P.elementFromPoint;
const docs = () => { const a = []; for (const o of D.values()) if (o.doc) a.push(o.doc); return a };
document.getElementById = function (id) { const r = gid.call(document, id); if (r || !D.size) return r; for (const d of docs()) { const x = gid.call(d, id); if (x) return x } return null };
document.querySelector = function (s) { const r = qs.call(document, s); if (r || !D.size) return r; for (const d of docs()) { const x = qs.call(d, s); if (x) return x } return null };
document.querySelectorAll = function (s) { const r = qsa.call(document, s); if (!D.size) return r; const a = [...r]; for (const d of docs()) a.push(...qsa.call(d, s)); return a };
let here = document; // fenêtre du dernier clic (menus, elementFromPoint)
document.elementFromPoint = function (x, y) { return efp.call(here !== document && here.defaultView ? here : document, x, y) };

/* coin haut-gauche de la page de chaque fenêtre, en coordonnées écran (glisser un média d'une fenêtre à l'autre) */
const origin = new Map();
const note = (w, e) => origin.set(w, { x: e.screenX - e.clientX, y: e.screenY - e.clientY });
window.dedcutOrigin = w => origin.get(w) || { x: w.screenX + (w.outerWidth - w.innerWidth) / 2, y: w.screenY + (w.outerHeight - w.innerHeight) - (w.outerWidth - w.innerWidth) / 2 };
addEventListener('pointermove', e => { if (!e.__fwd) note(window, e) }, true);
document.addEventListener('pointerdown', e => { if (!e.__fwd) { here = document; note(window, e) } }, true);

/* l'animation (lecture) suit la fenêtre de la vidéo quand elle est séparée : elle continue même si DedCut est caché */
const nativeRAF = window.requestAnimationFrame.bind(window), nativeCAF = window.cancelAnimationFrame.bind(window);
let rafN = 0; const rafs = new Map();
window.requestAnimationFrame = cb => {
  const o = D.get('stage') || D.get('stprev'), w = o && !o.win.closed && o.doc.visibilityState === 'visible' ? o.win : null, id = ++rafN;
  if (!w) { rafs.set(id, [null, nativeRAF(t => { rafs.delete(id); cb(t) })]); return id }
  const dt = w.performance.timeOrigin - performance.timeOrigin;
  rafs.set(id, [w, w.requestAnimationFrame(t => { rafs.delete(id); cb(t + dt) })]);
  return id;
};
// l'annulation passe par la vraie fonction du navigateur (window.cancelAnimationFrame est celle-ci : l'appeler annulait
// une autre animation au hasard et laissait tourner la bonne, ex. l'aperçu du studio après l'avoir quitté)
window.cancelAnimationFrame = id => { const e = rafs.get(id); if (!e) return; rafs.delete(id); try { if (e[0]) e[0].cancelAnimationFrame(e[1]); else nativeCAF(e[1]) } catch (x) { } };

/* --- événements de la fenêtre séparée → fenêtre principale --- */
function fwd(o, e) {
  const k = e.type.startsWith('key');
  const ev = k ? new KeyboardEvent(e.type, { bubbles: true, cancelable: true, key: e.key, code: e.code, location: e.location, repeat: e.repeat, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey })
    : new PointerEvent(e.type, { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, button: e.button, buttons: e.buttons, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey });
  Object.defineProperties(ev, { target: { value: e.target }, __fwd: { value: true }, __win: { value: o.win } });
  document.dispatchEvent(ev);
  if (ev.defaultPrevented) e.preventDefault();
}
function wire(o) {
  const d = o.doc, w = o.win;
  d.addEventListener('pointerdown', e => { here = d; note(w, e); fwd(o, e) }, true);
  d.addEventListener('pointermove', e => { note(w, e); fwd(o, e) });
  for (const t of ['pointerup', 'pointercancel', 'keydown', 'keyup']) d.addEventListener(t, e => fwd(o, e));
  d.addEventListener('dragover', e => e.preventDefault());
  d.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length && window.addFiles) addFiles(e.dataTransfer.files) });
  w.addEventListener('resize', () => { dispatchEvent(new Event('resize')); if (o.k === 'stage') try { fitCanvas() } catch (x) { } if (PANES[o.k].fit) PANES[o.k].fit(); });
  w.addEventListener('pagehide', () => { if (D.get(o.k) === o) dock(o.k, true) });
}

/* --- page de la fenêtre séparée : mêmes styles, mêmes couleurs que DedCut --- */
function mirror(o) {
  const h = o.doc.documentElement, b = o.doc.body;
  h.setAttribute('style', document.documentElement.getAttribute('style') || '');
  h.className = document.documentElement.className; h.lang = document.documentElement.lang;
  for (const a of document.documentElement.attributes) if (a.name.startsWith('data-')) h.setAttribute(a.name, a.value);
  b.className = document.body.className + ' dw dw-' + o.k;
}
function bar(o) {
  const bb = o.doc.getElementById('dwBar'); if (!bb) return;
  bb.innerHTML = '<b>' + T(PANES[o.k].name) + '</b><span>DedCut</span><i></i><button id="dwDock">' + ICO_IN + '<span>' + T('detach.in') + '</span></button>';
  bb.querySelector('#dwDock').onclick = () => dock(o.k);
  o.doc.title = T(PANES[o.k].name) + ' — DedCut';
}
function build(o) {
  const d = o.win.document;
  if (o.el.ownerDocument !== document) document.adoptNode(o.el); // jamais dans la page pendant document.open() (qui efface les écouteurs)
  d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>DedCut</title></head><body><div id="dwBar"></div><div id="dwHost"></div></body></html>'); d.close();
  for (const n of qsa.call(document, 'link[rel=stylesheet],style')) { const c = d.importNode(n, true); if (c.href) c.href = n.href; d.head.appendChild(c) }
  o.doc = d; mirror(o); bar(o);
  gid.call(d, 'dwHost').appendChild(o.el);
  wire(o);
  if (o.ro) o.ro.disconnect();
  try { o.ro = new o.win.ResizeObserver(() => { if (o.k === 'stage') try { fitCanvas() } catch (x) { } if (PANES[o.k].fit) PANES[o.k].fit(); placeResizers() }); o.ro.observe(o.el) } catch (x) { }
}
new MutationObserver(() => D.forEach(mirror)).observe(document.documentElement, { attributes: true });
new MutationObserver(() => D.forEach(mirror)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(ms => { // styles ajoutés plus tard : copiés aussi dans les fenêtres séparées
  for (const m of ms) for (const n of m.addedNodes) if (n.nodeName === 'STYLE' || (n.nodeName === 'LINK' && n.rel === 'stylesheet')) D.forEach(o => { try { o.doc.head.appendChild(o.doc.importNode(n, true)) } catch (e) { } });
}).observe(document.head, { childList: true });

/* --- séparer / remettre --- */
function savePos(o) {
  try { const w = o.win; if (w.closed || w.innerWidth < 100 || o.dx === undefined) return; const a = json('dedcut-detach-pos') || {}; a[o.k] = { x: w.screenX - (o.dx || 0), y: w.screenY - (o.dy || 0), w: w.innerWidth, h: w.innerHeight }; pref('dedcut-detach-pos', JSON.stringify(a)) } catch (e) { }
}
const saveList = () => pref('dedcut-detach', JSON.stringify([...D.keys()]));
function refreshAll() {
  syncBtns(); applyLayout(false); if (window.dedcutStLayout) window.dedcutStLayout.apply();
  try { fitCanvas() } catch (e) { }
  dispatchEvent(new Event('resize'));
  if (!$('#layoutPick').hidden) renderLayoutPick();
}
function detach(k) {
  if (D.has(k)) { try { D.get(k).win.focus() } catch (e) { } return }
  const el = qs.call(document, PANES[k].sel); if (!el) return;
  const r = el.getBoundingClientRect(), p = (json('dedcut-detach-pos') || {})[k] || {};
  const w = Math.round(p.w || Math.max(PANES[k].w, r.width)), h = Math.round(p.h || Math.max(PANES[k].h, r.height + 40));
  const pi = Object.keys(PANES).indexOf(k), x = Math.round(p.x ?? screenX + 80 + pi * 30), y = Math.round(p.y ?? screenY + 80 + pi * 30);
  let win = null;
  try { win = window.open('', 'dedcut-' + k, 'popup,width=' + w + ',height=' + h + ',left=' + x + ',top=' + y) } catch (e) { }
  if (!win) { toast('detach.fail'); return }
  hideCtx(); if (ctxEl.ownerDocument !== document) document.body.appendChild(ctxEl);
  const ph = document.createComment('dedcut-' + k);
  el.before(ph);
  const o = { k, win, el, ph, doc: null, req: [x, y] };
  D.set(k, o);
  document.body.classList.add('det-' + k);
  build(o);
  // la fenêtre peut remplacer sa page vide juste après l'ouverture : on vérifie et on reconstruit si besoin
  let n = 0; const chk = setInterval(() => { if (D.get(k) !== o || ++n > 15) return clearInterval(chk);
    if (n === 4) { o.dx = o.win.screenX - x; o.dy = o.win.screenY - y } // écart bord de fenêtre / page, pour la rouvrir au même endroit
    if (o.win.document !== o.doc || !gid.call(o.win.document, 'dwHost')) build(o) }, 100);
  saveList(); refreshAll();
  try { win.focus() } catch (e) { }
}
// dans DedCut, la fenêtre elle-même est fermée par Windows (la page seule ne peut fermer que son contenu)
function closeWin(o) { const t = o.doc && o.doc.title; try { window.__TAURI_INTERNALS__?.invoke('close_panel', { title: t }).catch(() => { }) } catch (e) { } try { o.win.close() } catch (e) { } }
function dock(k, closed) {
  const o = D.get(k); if (!o) return;
  if (!closed) savePos(o);
  D.delete(k);
  if (ctxEl.ownerDocument === o.doc) { hideCtx(); document.body.appendChild(ctxEl) }
  if (o.ro) o.ro.disconnect();
  o.ph.replaceWith(o.el);
  document.body.classList.remove('det-' + k);
  if (here === o.doc) here = document;
  if (!closed) { closeWin(o); saveList() }
  else setTimeout(saveList, 400); // si DedCut entier se ferme, ce minuteur ne part pas : la fenêtre se rouvrira au prochain lancement
  refreshAll();
}
window.dedcutDetach = { detach, dock, toggle: k => D.has(k) ? dock(k) : detach(k), isOut: k => D.has(k), icoOut: ICO_OUT, icoIn: ICO_IN };
setInterval(() => D.forEach(o => { if (o.win.closed) dock(o.k, true); else savePos(o) }), 1500);
addEventListener('pagehide', () => D.forEach(closeWin));

/* menus contextuels : ils s'ouvrent dans la fenêtre où on a cliqué */
const _showCtx = showCtx;
showCtx = function (items, x, y) {
  const d = here;
  if (ctxEl.ownerDocument !== d) d.body.appendChild(ctxEl);
  ctxEl.style.maxHeight = (d.defaultView || window).innerHeight - 8 + 'px'; ctxEl.style.overflowY = 'auto'; // petite fenêtre : le menu défile
  _showCtx(items, x, y);
  if (d !== document) {
    const v = d.defaultView, r = ctxEl.getBoundingClientRect();
    ctxEl.style.left = Math.max(4, Math.min(x, v.innerWidth - r.width - 6)) + 'px';
    ctxEl.style.top = Math.max(4, Math.min(y, v.innerHeight - r.height - 6)) + 'px';
  }
};

/* --- boutons « séparer / remettre » sur chaque panneau --- */
const btns = {};
function mkBtn(k) { const b = document.createElement('button'); b.className = 'dtb'; b.dataset.det = k; b.onclick = e => { e.stopPropagation(); window.dedcutDetach.toggle(k) }; btns[k] = b; return b }
function syncBtns() {
  for (const k of KEYS) { const b = btns[k]; if (!b) continue; const out = D.has(k); b.innerHTML = out ? ICO_IN : ICO_OUT; b.title = T(out ? 'detach.in' : 'detach.out'); b.classList.toggle('on', out) }
}
{ const vs = document.createElement('span'); vs.className = 'vs'; $('#tbar').append(vs, mkBtn('tl')) }
$('#stage .pright').append(mkBtn('stage'));
{ // bibliothèque : à côté de la flèche qui réduit la barre d'outils
  const t = $('#railToggle'), row = document.createElement('div'); row.className = 'railrow';
  t.before(row); row.append(t, mkBtn('left'));
}
{ // propriétés : le panneau est redessiné souvent, le bouton est remis à chaque fois
  const insp = $('#insp'), b = mkBtn('insp'); b.classList.add('fl');
  const put = () => { if (b.parentNode !== insp) insp.prepend(b) };
  put(); new MutationObserver(put).observe(insp, { childList: true });
}
syncBtns();

/* section de la fenêtre « Disposition » */
window.dedcutDetachHTML = () => '<div class="lpt" style="margin-top:12px">' + T('detach.section') + '</div><div class="lpd">' +
  KEYS.map(k => '<button data-det="' + k + '" class="' + (D.has(k) ? 'on' : '') + '">' + (D.has(k) ? ICO_IN : ICO_OUT) + '<span>' + T(PANES[k].name) + '</span></button>').join('') +
  '</div><div class="hint" style="margin:6px 0 0">' + T('detach.hint') + '</div>';
$('#layoutPick').addEventListener('click', e => { const b = e.target.closest('[data-det]'); if (!b) return; e.stopPropagation(); window.dedcutDetach.toggle(b.dataset.det) });

window.addEventListener('dedcut-lang', () => { syncBtns(); D.forEach(bar) });

/* les panneaux laissés séparés se rouvrent à l'entrée dans l'éditeur */
let restored = false;
const restore = () => {
  if (restored || document.body.classList.contains('home-on')) return; restored = true;
  for (const k of json('dedcut-detach') || []) if (PANES[k] && !PANES[k].space) detach(k); // ceux du studio se rouvrent à l'entrée dans le studio
};
new MutationObserver(restore).observe(document.body, { attributes: true, attributeFilter: ['class'] });
setTimeout(restore, 300);
})();

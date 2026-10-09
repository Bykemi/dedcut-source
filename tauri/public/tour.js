/* DedCut — tutoriels : visite guidée de l'éditeur (1re ouverture) et astuces à la 1re ouverture de certains outils.
   Une bulle pointe la zone concernée (mise en évidence), avec Retour / points / Suivant, Passer et « Ne plus afficher ».
   Préférences sur ce PC : dedcut-tour-<nom> = vu, dedcut-tour-off = plus d'astuces automatiques. */
(() => {
const TOURS = {
  main: [
    { t: 'tour.welcomeT', d: 'tour.welcomeD' },
    { sel: '#rail', t: 'tour.railT', d: 'tour.railD' },
    { sel: '#drop', tab: 'media', t: 'tour.importT', d: 'tour.importD' },
    { sel: '#stage', t: 'tour.stageT', d: 'tour.stageD' },
    { sel: '#insp', t: 'tour.inspT', d: 'tour.inspD' },
    { sel: '#tl', t: 'tour.tlT', d: 'tour.tlD' },
    { sel: '#bLayout', t: 'tour.layoutT', d: 'tour.layoutD' },
    { sel: '#bMenu', t: 'tour.menuT', d: 'tour.menuD' },
    { sel: '#bExport', t: 'tour.exportT', d: 'tour.exportD' }
  ],
  gen: [
    { sel: '#aigDrop', t: 'tour.genImgT', d: 'tour.genImgD' },
    { sel: '#aigStyles', t: 'tour.genStyleT', d: 'tour.genStyleD' },
    { sel: '#aigGo', t: 'tour.genGoT', d: 'tour.genGoD' }
  ],
  cap: [
    { sel: '#capModel', t: 'tour.capModelT', d: 'tour.capModelD' },
    { sel: '#capGo', t: 'tour.capGoT', d: 'tour.capGoD' }
  ],
  filt: [
    { sel: '#fcats', t: 'tour.filtCatsT', d: 'tour.filtCatsD' },
    { sel: '#fAll', t: 'tour.filtAllT', d: 'tour.filtAllD' }
  ],
  fx: [
    { sel: '#fxpre', t: 'tour.fxPreT', d: 'tour.fxPreD' },
    { sel: '#fxcats', t: 'tour.fxListT', d: 'tour.fxListD' }
  ],
  tr: [
    { sel: '#trWhere', t: 'tour.trWhereT', d: 'tour.trWhereD' },
    { sel: '#trCross', t: 'tour.trCrossT', d: 'tour.trCrossD' }
  ]
};
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch (e) { } return null };
let cur = null; // { name, i, steps }

const ring = document.createElement('div'); ring.id = 'tourRing'; ring.hidden = true;
const box = document.createElement('div'); box.id = 'tourBox'; box.hidden = true; box.setAttribute('role', 'dialog');
document.body.append(ring, box);

function visible(el) { if (!el || el.ownerDocument !== document) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth }

function show() {
  if (!cur) return;
  const st = cur.steps[cur.i];
  if (st.tab && typeof showTab === 'function') showTab(st.tab);
  const el = st.sel ? document.querySelector(st.sel) : null;
  if (el && el.offsetParent) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // dans un panneau qui défile
  if (st.sel && !visible(el)) { // zone introuvable (onglet fermé, élément caché) : on passe
    if (cur.i < cur.steps.length - 1) { cur.i++; return show() }
    return end(true);
  }
  const n = cur.steps.length, last = cur.i === n - 1;
  box.innerHTML =
    '<button class="tx" data-tour="skip" title="' + T('tour.skip') + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<div class="th"><b>' + T(st.t) + '</b></div>' +
    '<p>' + T(st.d) + '</p>' +
    '<div class="tf"><button data-tour="back"' + (cur.i ? '' : ' disabled') + '>' + T('tour.back') + '</button>' +
    '<span class="dots">' + Array.from({ length: n }, (_, k) => '<i class="' + (k === cur.i ? 'on' : '') + '"></i>').join('') + '</span>' +
    '<button class="nx pri" data-tour="next">' + T(last ? 'tour.done' : 'tour.next') + '</button></div>' +
    (cur.name === 'main' ? '' : '<button class="never" data-tour="never">' + T('tour.never') + '</button>');
  box.hidden = false; box.className = el ? '' : 'center';
  if (!el) { ring.hidden = false; ring.className = 'full'; Object.assign(ring.style, { left: innerWidth / 2 + 'px', top: innerHeight / 2 + 'px', width: '0px', height: '0px' }); box.style.left = (innerWidth - box.offsetWidth) / 2 + 'px'; box.style.top = (innerHeight - box.offsetHeight) / 2 + 'px'; box.removeAttribute('data-side'); return }
  const r = el.getBoundingClientRect(), pad = 6;
  ring.hidden = false; ring.className = '';
  Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
  // côté de la bulle : là où il y a le plus de place
  const bw = box.offsetWidth, bh = box.offsetHeight, gap = 16;
  const space = { bottom: innerHeight - r.bottom, top: r.top, right: innerWidth - r.right, left: r.left };
  let side = ['bottom', 'top', 'right', 'left'].find(k => (k === 'bottom' || k === 'top' ? space[k] > bh + gap + 8 : space[k] > bw + gap + 8)) || 'center';
  let x, y;
  if (side === 'bottom' || side === 'top') { x = r.left + r.width / 2 - bw / 2; y = side === 'bottom' ? r.bottom + gap : r.top - bh - gap }
  else if (side === 'right' || side === 'left') { x = side === 'right' ? r.right + gap : r.left - bw - gap; y = r.top + r.height / 2 - bh / 2 }
  else { x = r.left + r.width / 2 - bw / 2; y = r.top + r.height / 2 - bh / 2 }
  x = Math.max(10, Math.min(innerWidth - bw - 10, x)); y = Math.max(10, Math.min(innerHeight - bh - 10, y));
  box.style.left = x + 'px'; box.style.top = y + 'px'; box.dataset.side = side;
  // flèche vers le centre de la zone
  const ax = Math.max(18, Math.min(bw - 18, r.left + r.width / 2 - x)), ay = Math.max(18, Math.min(bh - 18, r.top + r.height / 2 - y));
  box.style.setProperty('--ax', ax + 'px'); box.style.setProperty('--ay', ay + 'px');
}
function start(name, force) {
  if (!TOURS[name] || (cur && !force)) return;
  if (!force && (pref('dedcut-tour-' + name) || pref('dedcut-tour-off'))) return;
  if (!TOURS[name].some(st => !st.sel || st.tab || visible(document.querySelector(st.sel)))) return; // rien à montrer pour l'instant : on réessaiera plus tard
  cur = { name, i: 0, steps: TOURS[name] };
  show(); box.querySelector('.nx')?.focus();
}
function end(seen) {
  if (cur && seen) pref('dedcut-tour-' + cur.name, '1');
  cur = null; box.hidden = true; ring.hidden = true;
}
box.addEventListener('click', e => {
  const b = e.target.closest('[data-tour]'); if (!b || !cur) return;
  const a = b.dataset.tour;
  if (a === 'next') { if (cur.i < cur.steps.length - 1) { cur.i++; show() } else end(true) }
  else if (a === 'back') { if (cur.i > 0) { cur.i--; show() } }
  else if (a === 'skip') end(true);
  else if (a === 'never') { pref('dedcut-tour-off', '1'); end(true) }
});
addEventListener('keydown', e => {
  if (!cur) return;
  if (e.key === 'Escape') end(true);
  else if (e.key === 'ArrowRight' && !e.target.closest('input,textarea')) box.querySelector('[data-tour=next]')?.click();
  else if (e.key === 'ArrowLeft' && !e.target.closest('input,textarea')) box.querySelector('[data-tour=back]')?.click();
});
addEventListener('resize', () => { if (cur) show() });

// visite générale à la 1re ouverture de l'éditeur ; astuces à la 1re ouverture de certains outils
const inEditor = () => !document.body.classList.contains('home-on') && (typeof appMode === 'undefined' || appMode === 'edit');
const tryMain = () => setTimeout(() => { if (inEditor()) start('main') }, 700);
let wasEditor = inEditor();
new MutationObserver(() => { const now = inEditor(); if (now && !wasEditor && !cur) tryMain(); wasEditor = now }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
tryMain();
const _showTab = showTab;
showTab = function (t) { _showTab(t); if (TOURS[t] && t !== 'main' && !(cur && cur.name === 'main')) setTimeout(() => start(t), 350) };

window.dedcutTour = {
  start: name => { end(false); start(name || 'main', true) },
  reset: () => { for (const k of Object.keys(TOURS)) pref('dedcut-tour-' + k, null); pref('dedcut-tour-off', null) }
};
})();

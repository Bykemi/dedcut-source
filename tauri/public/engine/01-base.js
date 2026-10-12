const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* traduction : t() vient de src/i18n.ts ; sans lui, la clé est affichée telle quelle */
const T=(k,v)=>window.t?window.t(k,v):k;
/* question OK / Annuler → Promise<boolean> (ne jamais utiliser confirm() : dans l'appli, le plugin dialog en fait une Promise
   toujours « vraie »). Fenêtre au style de DedCut, dans la page (plus la boîte grise de Windows) : Entrée = OK,
   Échap ou clic à côté = Annuler (l'action n'est pas faite). Plusieurs questions à la suite s'affichent l'une après l'autre.
   o : { ok, no } textes des boutons, danger : icône d'alerte jaune. */
let askQ=Promise.resolve();
function askYes(msg,o={}){
  const run=()=>new Promise(done=>{
    const prev=document.activeElement,m=document.createElement('div');m.className='dcq';
    m.innerHTML=`<div class="dcq-box" role="alertdialog" aria-modal="true" aria-labelledby="dcqT" aria-describedby="dcqM">
      <div class="dcq-h"><span class="dcq-ic${o.danger?' warn':''}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg></span><b id="dcqT">DedCut</b></div>
      <p id="dcqM"></p>
      <div class="dcq-b"><button class="dcq-no"></button><button class="dcq-ok"></button></div></div>`;
    m.querySelector('#dcqM').textContent=String(msg);
    const bOk=m.querySelector('.dcq-ok'),bNo=m.querySelector('.dcq-no');bOk.textContent=o.ok||T('common.ok');bNo.textContent=o.no||T('common.cancel');
    const end=v=>{removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}done(v)};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end(false)}
      else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();end(document.activeElement!==bNo)}
      else if(e.key==='Tab'){e.preventDefault();(document.activeElement===bOk?bNo:bOk).focus()}
      else e.stopPropagation();
    };
    bOk.onclick=()=>end(true);bNo.onclick=()=>end(false);m.addEventListener('mousedown',e=>{if(e.target===m)end(false)});
    addEventListener('keydown',key,true);document.body.appendChild(m);requestAnimationFrame(()=>bOk.focus());
  });
  const p=askQ.then(run);askQ=p.catch(()=>{});return p;
}
/** saisie d'un texte dans une fenêtre au style de DedCut (remplace prompt(), qui ouvre une boîte de Windows) ;
 *  renvoie le texte, ou null si on annule. o.ok : texte du bouton, o.ro : lecture seule (texte à copier) */
function askText(msg,def='',o={}){
  const run=()=>new Promise(done=>{
    const prev=document.activeElement,m=document.createElement('div');m.className='dcq';
    m.innerHTML=`<div class="dcq-box" role="dialog" aria-modal="true" aria-labelledby="dcqT" aria-describedby="dcqM">
      <div class="dcq-h"><span class="dcq-ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></span><b id="dcqT">DedCut</b></div>
      <p id="dcqM"></p><input class="dcq-in" type="text" spellcheck="false">
      <div class="dcq-b"><button class="dcq-no"></button><button class="dcq-ok"></button></div></div>`;
    m.querySelector('#dcqM').textContent=String(msg||'');const inp=m.querySelector('.dcq-in');inp.value=def==null?'':String(def);if(o.ro)inp.readOnly=true;
    const bOk=m.querySelector('.dcq-ok'),bNo=m.querySelector('.dcq-no');bOk.textContent=o.ok||T('common.ok');bNo.textContent=T('common.cancel');if(o.ro)bNo.hidden=true;
    const end=v=>{removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}done(v)};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end(null)}
      else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();end(document.activeElement===bNo?null:inp.value)}
      else e.stopPropagation(); // les raccourcis de DedCut ne doivent pas agir pendant la saisie
    };
    bOk.onclick=()=>end(inp.value);bNo.onclick=()=>end(null);m.addEventListener('mousedown',e=>{if(e.target===m)end(null)});
    addEventListener('keydown',key,true);document.body.appendChild(m);inp.focus();inp.select();requestAnimationFrame(()=>{if(document.activeElement!==inp){inp.focus();inp.select()}});
  });
  const p=askQ.then(run);askQ=p.catch(()=>{});return p;
}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const appVersion=()=>window.__dedcutVersion||(navigator.userAgent.split('DedCut/')[1]||'').split(' ')[0];
const fmtN=v=>typeof v==='number'?Math.round(v*100)/100:v;

/* ---------- icônes ---------- */
const ICO={
  loop:'<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  guides:'<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14M15 5v14M3 10h18M3 14h18" stroke-dasharray="2 2"/>',
  pipette:'<path d="m14 4 6 6M17 7l-9.5 9.5L5 19l-1-1 2.5-2.5L16 6"/><path d="M15 3l6 6"/>',
  layout:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8.5 4v16M15.5 4v16"/>',
  media:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  audio:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  text:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  cc:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10a2.2 2.2 0 1 0 0 4M17 10a2.2 2.2 0 1 0 0 4"/>',
  sticker:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  fx:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  trans:'<path d="M4 7h14l-3-3M20 17H6l3 3"/>',
  aivid:'<rect x="2.5" y="10" width="15.5" height="10.5" rx="2"/><path d="M2.5 10l-.3-2.6 14.6-2.3.4 2.7M7 6.7l1.7 2.6M11.5 6l1.7 2.6"/><path d="M8.6 13.2v4.1l3.5-2z"/><path d="M20 1.8l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor" stroke-width="1"/>',
  filter:'<circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/>',
  elem:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  split:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  ripple:'<path d="M3 6h11M8 6V4h4v2M5 6l1 14h7l1-14M17 12h5M19 9l3 3-3 3"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  freeze:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9v6M14 9v6"/>',
  flip:'<path d="M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z"/>',
  rotate:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  kf:'<path d="M12 3l9 9-9 9-9-9z"/>',
  marker:'<path d="M5 21V4h12l-2.5 4L17 12H5"/>',
  magnet:'<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4"/>',
  zoomin:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>',
  zoomout:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
  fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
  vol:'<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
  mute:'<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  play:'<path d="M8 5l12 7-12 7z" fill="currentColor"/>',
  pause:'<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
  start:'<path d="M6 5v14M19 5l-10 7 10 7z"/>',
  end:'<path d="M18 5v14M5 5l10 7-10 7z"/>',
  prev:'<path d="M15 6l-6 6 6 6"/>',
  next:'<path d="M9 6l6 6-6 6"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  full:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  live:'<circle cx="12" cy="12" r="2.2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  export:'<path d="M12 15V3M7 8l5-5 5 5M5 14v6h14v-6"/>',
  new:'<path d="M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14h6"/>',
  open:'<path d="M3 6h6l2 2h10v11H3z"/>',
  save:'<path d="M5 3h11l3 3v15H5zM8 3v5h7M8 21v-7h8v7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  square:'<rect x="4" y="4" width="16" height="16" rx="3"/>',
  rec:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  banner:'<rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M6.5 17h8M3 5h18M3 9h12"/>',
  badge:'<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="7.5" cy="12" r="1.7" fill="currentColor"/><path d="M11.5 12h6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  minus:'<path d="M5 12h14"/>',
  up:'<path d="M6 15l6-6 6 6"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  center:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
  scene:'<path d="M3 9.5h18V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z"/><path d="M3.4 9.5L4.8 5l15.6-.1.6 4.6M9 5l-1.5 4.5M14.5 5L13 9.5"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  pen:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  prompter:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  blob:'<path d="M7 6c3-3 9-2 11 2s1 9-3 11-10 1-11-3 0-7 3-10z"/>',
  sunset:'<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7V4.5M5.6 10.6L4 9M18.4 10.6L20 9M3 21h18"/>',
  party:'<path d="M4 20l4.5-12.5 8 8z"/><path d="M14 3.5v2M18.5 5.5L17 7M20.5 10h-2M11 3l.6 1.6M16 12.5c1.5-1 3-1 4.5 0"/>',
  sword:'<path d="M14.5 3.5H20.5v6L10 20l-6-6zM6.5 14.5l3 3M3.5 20.5l2.5-2.5"/>',
  gamepad:'<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4M15.5 11.5h.01M17.5 13.5h.01"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  leaf:'<path d="M5 19C5 11 10 5 20 5c0 10-6 15-14 15M5 19l7-7"/>',
  coffee:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  flame:'<path d="M12 21c-4 0-6.5-2.8-6.5-6.2C5.5 10 10 8 10 3c3 2 4.5 4.5 4.5 7 1-.8 1.5-2 1.6-3 1.8 1.8 2.9 4.4 2.9 7.8 0 3.4-3 6.2-7 6.2z"/>',
  ghost:'<path d="M5 21V11a7 7 0 0 1 14 0v10l-2.4-2-2.3 2-2.3-2-2.3 2-2.3-2z"/><path d="M9.5 11h.01M14.5 11h.01"/>',
  tree:'<path d="M12 3l5 6h-3l4 5h-3l4 5H5l4-5H6l4-5H7z"/><path d="M12 19v2.5"/>',
  balloon:'<path d="M12 3a5.5 5.5 0 0 0-5.5 5.5c0 3.6 3.2 6.5 5.5 7.5 2.3-1 5.5-3.9 5.5-7.5A5.5 5.5 0 0 0 12 3zM12 16v5"/>',
  bolt:'<path d="M13 2.5L4.5 14H11l-1 7.5L19.5 10H13z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  replay:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/><path d="M10.3 9.3v5.4l4.2-2.7z" fill="currentColor"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  keys:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9.3 9.5h.01M12.6 9.5h.01M15.9 9.5h.01M18 9.5h.01M6 12.2h.01M9.3 12.2h.01M12.6 12.2h.01M15.9 12.2h.01M18 12.2h.01M8 15h8"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.3-4-7.8-9-7.8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  chat:'<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M12 7.6l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  poll:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
  flag:'<path d="M5 21V4h12l-2.5 4 2.5 4H5"/>',
  ticker:'<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6 12h6M15 12h3"/>',
  counter:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 12h5M9.5 9.5v5M15.5 9l1-1v8"/>',
  pad:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  portrait:'<rect x="7.5" y="3" width="9" height="18" rx="1.5"/><path d="M4 7v10M20 7v10"/>',
  crown:'<path d="M3.5 8l4.5 4 4-7 4 7 4.5-4-2 11h-13z"/>',
  gem:'<path d="M6.5 4h11l3.5 5-9 11L3 9z"/><path d="M3 9h18M9.5 4L12 9l2.5-5M12 9v11"/>',
  robot:'<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5M9 13h.01M15 13h.01M9.5 16.5h5"/><circle cx="12" cy="3.5" r="1"/>',
  speak:'<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  ban:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  studio2:'<rect x="2.5" y="6" width="8.5" height="7" rx="1"/><rect x="13" y="6" width="8.5" height="7" rx="1"/><path d="M10.5 17h3M12 13v4"/>',
  stats:'<path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/>',
  clip:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4-2.5z"/><path d="M3 9h3M18 9h3M3 15h3M18 15h3"/>',
  tracks:'<path d="M4 7h16M4 12h10M4 17h13"/>',
  shapes:'<circle cx="7.5" cy="7.5" r="4.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M17 3l4 7h-8z"/><path d="M3 21l7-7"/>'
};
const ico=(n,s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[n]||''}</svg>`;
$$('[data-ico]').forEach(e=>e.insertAdjacentHTML('afterbegin',ico(e.dataset.ico,+(e.dataset.s||17))));

let W=1280,H=720;
let projFps=30; // images par seconde du projet (précision à l'image, compteur, pas à pas)
const cv=$('#cv'),mctx=cv.getContext('2d',{willReadFrequently:true});
const lcv=document.createElement('canvas'),lctx=lcv.getContext('2d',{willReadFrequently:true});
const kcv=document.createElement('canvas'),kctx=kcv.getContext('2d');
let ctx=mctx;
let media=[],clips=[],sel=null,time=0,playing=false,pxs=80,uid=1;
let markers=[],tracks=defTracks(),bgColor='#000000',projName='Mon projet',snapOn=true;
let actx,master,spk,recDest;
const els=new Map();
/* effets (cumulables) ; catégories pour l'onglet Effets */
const FX_CATS={
  beatfx:['bpulse','bbounce','bspin','bshake','brgb','bcolor','bflash','bstrobe','bzoomout','bslide','bmirror','bblur','binvert','bvig'],
  trend:['holo','planet','vaporwave','dreamy','pixelsort','datamosh','tear','anaglyph','ghost3','retrogame','bit8','jelly','tunnel','spinblur','focus'],
  colorfx:['huecycle','gmsunset','gmocean','gmfire','gmice','gmtoxic','keepred','keepblue','popgrid','solarize'],
  lightfx:['godrays','bokehfx','sunflare','glints','rimlight','spotfx','discofx','prismleak','caustics','aurorafx'],
  frames:['polaroid','filmstrip','roundmask','circlemask','heartmask','viewfinder','tvshape','burnedge','blurframe','insetline'],
  warp:['mirror4','mirrortop','twist','squeeze','drunk','shockwave','vortex','hstretch','spinzoom','flagwave'],
  pattern:['knit','blocks','pointil','crossstitch','weave','paper','linescreen','gridline','checkfx','brickwall'],
  screens:['vhsfull','oldtv','cga','teletext','sepiamovie','cctv','jpegfx','riso','onebit','amber'],
  magic:['starsky','magicdust','rainglass','zoomecho','hologram','underwater','bokehblur','oilspill','galaxy','flames'],
  halloween:['hwbats','hwghosts','hwpumpkins','hwspiders','hwmoon','hwmist','hwcandy','hwslime','hweyes','hwcandle','hwhaunted','hwzombie'], // v4.67.2, dessinés dans 06c-halloween.js
  art:['comic','stained','shatter','engrave','blueprint','xray','edgeglow','hexpix','trimosaic','tilefx','lcd','liquid','frosted','pinch','binoc'],
  person:['outline','neonline','aura','bgblur','bggray','bgblack','bgcolor','bgspace','bgpixel','bgzoom','spot','pgray','ppixel','pholo','pglitch','silhouette','shadow','pghost','pclone','outline2','prainbow','pdash','pelec','psticker'],
  face:['fcglasses','fcheartgl','fcpixelgl','fccrown','fchalo','fccat','fcbunny','fcdevil','fcparty','fcflowers','fcblush','fchearts','fcdizzy','fcsparkle','fcmustache','fcnose','fcbigeyes','fcbighead','fcsmooth','fcblur','fcpixel','fczoom','fcwitch','fcvampire','fcskull','fcpumpkin'],
  move:['shake','handheld','sway','zoomin','pulse','zoomblur','impact','zoompunch','whip','motionblur'],
  lens:['lens','fisheye','tiltshift','halation','flare','prism','letterbox','sharpen','blur','chroma'],
  glitch:['glitch','glitchblock','rgb','slices','vhstrack','crt','pixel','strobe','flicker'],
  retro:['noise','scan','scratch','vig','sepia','gray','dither','filmburn','nightvision'],
  light:['bloom','leak','sparkle','rainbow','rays','shine','disco','lightning','lasers'],
  particles:['snow','rain','confetti','hearts','fireflies','embers','petals','leaves','bubbles','dust','warp','fog','starry','glitter','balloons'],
  stylize:['neon','sketch','oil','halftone','emboss','poster','thermal','invert','green','cartoon','watercolor','dots'],
  distort:['wave','ripple','swirl','heat','fluted','kaleido','mirror','echo','grid4','grid9','reflect','bulge','rgbwave']
};
const FX=Object.values(FX_CATS).flat();
const FXN={bgcolor:'fx.bgcolor',bgspace:'fx.bgspace',bgpixel:'fx.bgpixel',bgzoom:'fx.bgzoom',spot:'fx.spot',pgray:'fx.pgray',ppixel:'fx.ppixel',pholo:'fx.pholo',pglitch:'fx.pglitch',silhouette:'fx.silhouette',shadow:'fx.shadow',pghost:'fx.pghost',pclone:'fx.pclone',outline2:'fx.outline2',prainbow:'fx.prainbow',pdash:'fx.pdash',pelec:'fx.pelec',psticker:'fx.psticker',bzoomout:'fx.bzoomout',bslide:'fx.bslide',bmirror:'fx.bmirror',bblur:'fx.bblur',binvert:'fx.binvert',bvig:'fx.bvig',bpulse:'fx.bpulse',bbounce:'fx.bbounce',bspin:'fx.bspin',bshake:'fx.bshake',brgb:'fx.brgb',bcolor:'fx.bcolor',bflash:'fx.bflash',bstrobe:'fx.bstrobe',huecycle:'fx.huecycle',gmsunset:'fx.gmsunset',gmocean:'fx.gmocean',gmfire:'fx.gmfire',gmice:'fx.gmice',gmtoxic:'fx.gmtoxic',keepred:'fx.keepred',keepblue:'fx.keepblue',popgrid:'fx.popgrid',solarize:'fx.solarize',godrays:'fx.godrays',bokehfx:'fx.bokehfx',sunflare:'fx.sunflare',glints:'fx.glints',rimlight:'fx.rimlight',spotfx:'fx.spotfx',discofx:'fx.discofx',prismleak:'fx.prismleak',caustics:'fx.caustics',aurorafx:'fx.aurorafx',polaroid:'fx.polaroid',filmstrip:'fx.filmstrip',roundmask:'fx.roundmask',circlemask:'fx.circlemask',heartmask:'fx.heartmask',viewfinder:'fx.viewfinder',tvshape:'fx.tvshape',burnedge:'fx.burnedge',blurframe:'fx.blurframe',insetline:'fx.insetline',mirror4:'fx.mirror4',mirrortop:'fx.mirrortop',twist:'fx.twist',squeeze:'fx.squeeze',drunk:'fx.drunk',shockwave:'fx.shockwave',vortex:'fx.vortex',hstretch:'fx.hstretch',spinzoom:'fx.spinzoom',flagwave:'fx.flagwave',knit:'fx.knit',blocks:'fx.blocks',pointil:'fx.pointil',crossstitch:'fx.crossstitch',weave:'fx.weave',paper:'fx.paper',linescreen:'fx.linescreen',gridline:'fx.gridline',checkfx:'fx.checkfx',brickwall:'fx.brickwall',vhsfull:'fx.vhsfull',oldtv:'fx.oldtv',cga:'fx.cga',teletext:'fx.teletext',sepiamovie:'fx.sepiamovie',cctv:'fx.cctv',jpegfx:'fx.jpegfx',riso:'fx.riso',onebit:'fx.onebit',amber:'fx.amber',starsky:'fx.starsky',magicdust:'fx.magicdust',rainglass:'fx.rainglass',zoomecho:'fx.zoomecho',hologram:'fx.hologram',underwater:'fx.underwater',bokehblur:'fx.bokehblur',oilspill:'fx.oilspill',galaxy:'fx.galaxy',flames:'fx.flames',anaglyph:'fx.anaglyph',pixelsort:'fx.pixelsort',holo:'fx.holo',planet:'fx.planet',tear:'fx.tear',datamosh:'fx.datamosh',dreamy:'fx.dreamy',vaporwave:'fx.vaporwave',retrogame:'fx.retrogame',bit8:'fx.bit8',ghost3:'fx.ghost3',jelly:'fx.jelly',tunnel:'fx.tunnel',spinblur:'fx.spinblur',focus:'fx.focus',tilefx:'fx.tilefx',lcd:'fx.lcd',liquid:'fx.liquid',frosted:'fx.frosted',shatter:'fx.shatter',stained:'fx.stained',xray:'fx.xray',comic:'fx.comic',edgeglow:'fx.edgeglow',blueprint:'fx.blueprint',engrave:'fx.engrave',trimosaic:'fx.trimosaic',hexpix:'fx.hexpix',binoc:'fx.binoc',pinch:'fx.pinch',chroma:'fx.chroma',nightvision:'fx.nightvision',lasers:'fx.lasers',starry:'fx.starry',glitter:'fx.glitter',balloons:'fx.balloons',cartoon:'fx.cartoon',watercolor:'fx.watercolor',dots:'fx.dots',reflect:'fx.reflect',bulge:'fx.bulge',rgbwave:'fx.rgbwave',outline:'fx.outline',neonline:'fx.neonline',aura:'fx.aura',bgblur:'fx.bgblur',bggray:'fx.bggray',bgblack:'fx.bgblack',glitch:'fx.glitch',rgb:'fx.rgb',noise:'fx.noise',scan:'fx.scan',gray:'fx.gray',green:'fx.green',invert:'fx.invert',shake:'fx.shake',flicker:'fx.flicker',vig:'fx.vig',sepia:'common.sepia',pulse:'fx.pulse',pixel:'fx.pixel',mirror:'common.mirror',blur:'fx.blur',
  impact:'fx.impact',zoompunch:'fx.zoompunch',whip:'fx.whip',motionblur:'fx.motionblur',lens:'fx.lens',fisheye:'fx.fisheye',tiltshift:'fx.tiltshift',halation:'fx.halation',flare:'fx.flare',prism:'fx.prism',letterbox:'fx.letterbox',sharpen:'fx.sharpen',
  glitchblock:'fx.glitchblock',crt:'fx.crt',dither:'fx.dither',filmburn:'fx.filmburn',rays:'fx.rays',shine:'fx.shine',disco:'fx.disco',lightning:'fx.lightning',
  fireflies:'fx.fireflies',embers:'fx.embers',petals:'fx.petals',leaves:'fx.leaves',bubbles:'fx.bubbles',dust:'fx.dust',warp:'fx.warp',fog:'fx.fog',
  neon:'fx.neon',sketch:'fx.sketch',oil:'fx.oil',halftone:'fx.halftone',emboss:'fx.emboss',wave:'fx.wave',ripple:'fx.ripple',swirl:'fx.swirl',heat:'fx.heat',fluted:'fx.fluted',grid4:'fx.grid4',grid9:'fx.grid9',
  handheld:'fx.handheld',sway:'fx.sway',zoomin:'fx.zoomin',zoomblur:'fx.zoomblur',slices:'fx.slices',vhstrack:'fx.vhstrack',strobe:'fx.strobe',scratch:'fx.scratch',bloom:'fx.bloom',leak:'fx.leak',sparkle:'fx.sparkle',rainbow:'fx.rainbow',snow:'fx.snow',rain:'fx.rain',confetti:'fx.confetti',hearts:'fx.hearts',kaleido:'fx.kaleido',poster:'fx.poster',thermal:'fx.thermal',echo:'fx.echo'};
const FXCATN={beatfx:'fxcat.beatfx',trend:'fxcat.trend',art:'fxcat.art',colorfx:'fxcat.colorfx',lightfx:'fxcat.lightfx',frames:'fxcat.frames',warp:'fxcat.warp',pattern:'fxcat.pattern',screens:'fxcat.screens',magic:'fxcat.magic',person:'fxcat.person',move:'fxcat.move',lens:'fxcat.lens',glitch:'fxcat.glitch',retro:'fxcat.retro',light:'fxcat.light',particles:'fxcat.particles',stylize:'fxcat.stylize',distort:'fxcat.distort'};
const noiseTab=new Int8Array(1<<20);for(let i=0;i<noiseTab.length;i++)noiseTab[i]=(Math.random()-.5)*255;

/* ---------- utils ---------- */
const mById=id=>media.find(m=>m.id===id);
const total=()=>clips.reduce((a,c)=>Math.max(a,c.start+c.dur),0);
const fmt=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,'0')+':'+(s<10?'0':'')+s.toFixed(1)};
const fmtTC=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=Math.floor(t%60),f=Math.min(Math.ceil(projFps)-1,Math.floor((t%1)*projFps+1e-6));return[m,s,f].map(x=>String(x).padStart(2,'0')).join(':')};
/* temps arrondi à l'image la plus proche ; pas à pas image par image */
const frT=t=>Math.round(t*projFps)/projFps;
function stepFrame(n){seek(frT(time)+n/projFps)}
function toast(t){const e=$('#toast');e.textContent=T(t);e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2500)}
const noFx=()=>Object.fromEntries(FX.map(k=>[k,false]));
const selClip=()=>clips.find(c=>c.id===sel);
/* sélection multiple : sel = clip principal (affiché dans le panneau), msel = les autres clips sélectionnés */
let msel=new Set(),box=null;
function selIds(){const s=[];if(sel!=null&&clips.some(c=>c.id===sel))s.push(sel);for(const id of msel)if(id!==sel&&clips.some(c=>c.id===id))s.push(id);return s}
const selClips=()=>selIds().map(id=>clips.find(c=>c.id===id));
function toggleSel(c){
  if(c.id===sel){const n=[...msel].find(id=>clips.some(x=>x.id===id));sel=n??null;if(n!=null)msel.delete(n)}
  else if(msel.has(c.id))msel.delete(c.id);
  else{if(sel!=null)msel.add(sel);sel=c.id}
}
function setSelection(ids){const a=[...ids];sel=a.includes(sel)?sel:(a[0]??null);msel=new Set(a.filter(i=>i!==sel))}
function selectAll(){setSelection(clips.map(c=>c.id));renderTL();renderInspector()}
function selectNone(){sel=null;msel.clear();renderTL();renderInspector()}
const isText=c=>!!c&&isOvr(c)&&!c.gen&&!c.mid;
/* types de piste : 'video' (plein cadre), 'over' (calques : texte, formes, images par-dessus), 'audio' */
function newTrack(kind){return{kind,hide:false,mute:false,lock:false}}
function defTracks(){return[newTrack('video'),newTrack('over'),newTrack('audio')]}
function fixTracks(a){
  const dk=['video','over','audio'];
  const t=Array.isArray(a)&&a.length?a.map((x,i)=>Object.assign({kind:x&&dk.includes(x.kind)?x.kind:(dk[i]||'video'),hide:!!(x&&x.hide),mute:!!(x&&x.mute),lock:!!(x&&x.lock)},x&&x.name?{name:String(x.name).slice(0,40)}:{},x&&x.solo?{solo:true}:{},x&&Number.isFinite(x.pos)?{pos:+x.pos}:{})):defTracks();
  for(const k of dk)if(!t.some(x=>x.kind===k))t.push(newTrack(k));
  return normPos(t);
}
/* ordre d'affichage par défaut (anciens projets) : calques (la plus récente en haut), vidéo (idem), audio */
function defaultOrder(t){const by=k=>t.map((x,i)=>x.kind===k?i:-1).filter(i=>i>=0);return[...by('over').reverse(),...by('video').reverse(),...by('audio')]}
function normPos(t){
  const ok=t.every(x=>Number.isFinite(x.pos))&&new Set(t.map(x=>x.pos)).size===t.length;
  (ok?t.map((x,i)=>i).sort((a,b)=>t[a].pos-t[b].pos):defaultOrder(t)).forEach((i,r)=>{t[i].pos=r});
  return t;
}
/* temps dans le fichier source pour un instant t de la timeline (vitesse + lecture à l'envers) */
function srcOf(c,t){const r=c.p.rate||1,l=t-c.start;return c.p.rev?c.in+Math.max(0,c.dur-l)*r:c.in+l*r}
function trk(c){return tracks[c.track]||tracks[0]}
function isVid(c){return !!c&&trk(c).kind==='video'}
function isOvr(c){return !!c&&trk(c).kind==='over'}
function isAud(c){return !!c&&trk(c).kind==='audio'}
const activeTk={video:0,over:1,audio:2};
/* piste où se posent les nouveaux éléments : la piste active du type demandé, sinon la première de ce type */
function tk(kind){const a=activeTk[kind];if(a!=null&&tracks[a]&&tracks[a].kind===kind)return a;const i=tracks.findIndex(t=>t.kind===kind);return i<0?0:i}
/* clips visuels dans l'ordre d'empilement (le dernier est au-dessus) */
function layerClips(){return visualOrder().flatMap(i=>clips.filter(c=>c.track===i))}
function getPath(o,path){for(const k of path.split('.')){if(o==null)return undefined;o=o[k]}return o}
function setPath(o,path,v){const k=path.split('.');while(k.length>1){const s=k.shift();if(o[s]==null||typeof o[s]!=='object')o[s]={};o=o[s]}o[k[0]]=v}
const safeName=s=>(String(s||'').trim()||'dedcut').replace(/[\\/:*?"<>|]+/g,'_');
function download(blob,name){if(window.dedcutSave)return window.dedcutSave(blob,name);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000)}

/* ---------- historique ---------- */
let hist=[],hi=-1;
let histBytes=0;
function commit(){
  projDirty=true;wake();const s=JSON.stringify({c:clips,t:tracks});
  if(s!==hist[hi]){hist=hist.slice(0,hi+1);hist.push(s);histBytes=hist.reduce((n,x)=>n+x.length,0);
    while(hist.length>2&&(hist.length>100||histBytes>2e7)){histBytes-=hist[0].length;hist.shift()}hi=hist.length-1}
  autosave();
}
function histApply(j){const o=JSON.parse(j);if(Array.isArray(o)){clips=o}else{clips=o.c;tracks=fixTracks(o.t)}clips.forEach(c=>{if(!trk(c))c.track=0})}
function undo(){if(hi>0){hi--;histApply(hist[hi]);if(!selClip())sel=null;refresh();autosave()}}
function redo(){if(hi<hist.length-1){hi++;histApply(hist[hi]);if(!selClip())sel=null;refresh();autosave()}}

/* ---------- stockage (IndexedDB) : sauvegarde auto du projet + médias ---------- */
const DB={db:null,
  open(){return new Promise((res,rej)=>{const r=indexedDB.open('dedcut',1);
    r.onupgradeneeded=()=>{r.result.createObjectStore('media',{keyPath:'id'});r.result.createObjectStore('kv')};
    r.onsuccess=()=>{DB.db=r.result;res()};r.onerror=()=>rej(r.error)})},
  run(store,mode,fn){return new Promise((res,rej)=>{const t=DB.db.transaction(store,mode),rq=fn(t.objectStore(store));
    t.oncomplete=()=>res(rq&&rq.result);t.onerror=t.onabort=()=>rej(t.error)})},
  put(store,key,val){return DB.run(store,'readwrite',s=>key===null?s.put(val):s.put(val,key))},
  get(store,key){return DB.run(store,'readonly',s=>s.get(key))},
  all(store){return DB.run(store,'readonly',s=>s.getAll())},
  del(store,key){return DB.run(store,'readwrite',s=>s.delete(key))},
  clear(store){return DB.run(store,'readwrite',s=>s.clear())}};
const setSave=t=>{setSave.last=t;const e=$('#sv');e.textContent=T(t);e.classList.toggle('warn',/^save\.(failed|full|off)$/.test(t))};
let saveTimer;
function autosave(){
  if(!DB.db)return;
  clearTimeout(saveTimer);setSave('save.saving');
  saveTimer=setTimeout(async()=>{
    try{await DB.put('kv','project',{clips,W,H,uid,markers,tracks,scenes:scenesOut(),bg:bgColor,name:projName,mvol:masterVol,mlim:masterLim,mx:window.mxOut?mxOut():undefined,projPath,projDirty,savedAt:Date.now()});setSave('save.saved');maybeSnapshot()}catch(e){setSave('save.failed')}
  },600);
}

/* ---------- versions de secours (récupération après une coupure ou une erreur) ----------
   Au plus une version toutes les 2 minutes (si le montage a changé), 12 gardées. Elles vivent dans la base du logiciel,
   sur ce PC. Chaque version appartient au montage en cours : elles sont effacées quand on ouvre ou crée un autre projet. */
let lastSnapSig='',lastSnapAt=0;
async function maybeSnapshot(why){
  if(!DB.db||!clips.length)return;
  const sig=JSON.stringify({c:clips,t:tracks,m:markers});
  if(sig===lastSnapSig&&!why)return;
  const now=Date.now();if(!why&&now-lastSnapAt<120000)return;
  lastSnapSig=sig;lastSnapAt=now;
  try{
    const list=(await DB.get('kv','snaps'))||[];
    list.unshift({t:now,name:projName,W,H,uid,clips:JSON.parse(JSON.stringify(clips)),tracks:JSON.parse(JSON.stringify(tracks)),markers:[...markers],scenes:JSON.parse(JSON.stringify(scenesOut()||null)),bg:bgColor,mx:window.mxOut?mxOut():undefined,dur:total(),n:clips.length,why:why||''});
    await DB.put('kv','snaps',list.slice(0,12));
  }catch(e){}
}
async function listSnapshots(){try{return((await DB.get('kv','snaps'))||[]).map(x=>({t:x.t,name:x.name,n:x.n,dur:x.dur,why:x.why||''}))}catch(e){return[]}}
async function restoreSnapshot(t){
  const x=((await DB.get('kv','snaps'))||[]).find(v=>v.t===t);if(!x)return false;
  await maybeSnapshot('restore'); // la version actuelle est gardée aussi : on peut revenir en arrière
  pause();
  setFormat(x.W||1280,x.H||720,false);
  tracks=fixTracks(x.tracks);markers=Array.isArray(x.markers)?x.markers:[];bgColor=x.bg||'#000000';
  clips=(x.clips||[]).filter(c=>!c.mid||mById(c.mid));clips.forEach(c=>{if(!tracks[c.track])c.track=0});
  scenesIn(x.scenes);scActivate();renderScenes();if(window.mxIn)mxIn(x.mx);
  uid=Math.max(uid,x.uid||1,...media.map(m=>m.id+1),...clips.map(c=>c.id+1));
  sel=null;time=0;projDirty=true;commit();renderBin();refresh();autosave();toast(T('home.restored'));
  return true;
}
/* fermeture inattendue : l'indicateur passe à « 0 » au démarrage et à « 1 » à la fermeture normale */
let crashed=false;
try{crashed=localStorage.getItem('dedcut-clean')==='0';localStorage.setItem('dedcut-clean','0')}catch(e){}
addEventListener('pagehide',()=>{try{localStorage.setItem('dedcut-clean','1')}catch(e){}});
function persistMedia(m){
  if(!DB.db)return;
  DB.put('media',null,{id:m.id,name:m.name,type:m.type,duration:m.duration,w:m.w,h:m.h,thumb:m.thumb&&m.thumb.startsWith('data:')?m.thumb:null,path:m.path||null,size:m.size||0,blob:m.path?null:m.blob})
    .catch(()=>setSave('save.full'));
}

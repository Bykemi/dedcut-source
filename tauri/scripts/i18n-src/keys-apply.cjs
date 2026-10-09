// v4.18 : raccourcis clavier personnalisables. Tous les raccourcis passent par KEYACTS ; l'utilisateur peut les changer
// (fenêtre « Raccourcis clavier », Menu ou panneau Projet). Réglages dans localStorage « dedcut-keys » (seulement les changements). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };
const cut = (a, b, y) => { const i = e.indexOf(a), j = e.indexOf(b, i + a.length); if (i < 0 || j < 0 || e.indexOf(a, i + 1) >= 0) throw new Error('bloc introuvable : ' + a.slice(0, 60)); e = e.slice(0, i) + y + e.slice(j); };

cut("addEventListener('keydown',e=>{\n  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)", "\n\n/* ---------- projets et médias sur le disque",
`/* liste des raccourcis : id, nom affiché, touches par défaut, action. keep = ne pas bloquer l'action normale du navigateur (copier / coller) */
var KEYACTS=[
  {id:'play',n:'keys.playPause',d:['space'],f:()=>playing?pause():play()},
  {id:'split',n:'keys.split',d:['s','ctrl+b'],f:()=>split()},
  {id:'del',n:'keys.delete',d:['delete','backspace'],f:()=>del()},
  {id:'ripple',n:'keys.ripple',d:['shift+delete','shift+backspace'],f:()=>rippleDel()},
  {id:'dup',n:'keys.duplicate',d:['ctrl+d'],f:()=>dup()},
  {id:'copy',n:'kb.copy',d:['ctrl+c'],f:()=>copyClip(),keep:true},
  {id:'paste',n:'kb.paste',d:['ctrl+v'],f:()=>{clearTimeout(pasteWant);pasteWant=setTimeout(()=>{pasteWant=0;pasteClip(time)},80)},keep:true}, // une image collée annule ce collage de clip
  {id:'selAll',n:'kb.selAll',d:['ctrl+a'],f:()=>selectAll()},
  {id:'desel',n:'msel.none',d:['escape'],f:()=>{if(sel!=null||msel.size)selectNone()}},
  {id:'undo',n:'kb.undo',d:['ctrl+z'],f:()=>undo()},
  {id:'redo',n:'kb.redo',d:['ctrl+y','ctrl+shift+z'],f:()=>redo()},
  {id:'prevF',n:'kb.prevFrame',d:['arrowleft'],f:()=>seek(time-1/30)},
  {id:'nextF',n:'kb.nextFrame',d:['arrowright'],f:()=>seek(time+1/30)},
  {id:'back1',n:'kb.back1',d:['shift+arrowleft'],f:()=>seek(time-1)},
  {id:'fwd1',n:'kb.fwd1',d:['shift+arrowright'],f:()=>seek(time+1)},
  {id:'start',n:'kb.start',d:['home'],f:()=>seek(0)},
  {id:'end',n:'kb.end',d:['end'],f:()=>seek(total())},
  {id:'kf',n:'keys.keyframe',d:['k'],f:()=>toggleKf()},
  {id:'marker',n:'keys.marker',d:['m'],f:()=>toggleMarker()},
  {id:'zin',n:'kb.zoomIn',d:['+','='],f:()=>setZoom(pxs*1.25)},
  {id:'zout',n:'kb.zoomOut',d:['-'],f:()=>setZoom(pxs/1.25)},
  {id:'guides',n:'kb.guides',d:['g'],f:()=>{guides.thirds=!guides.thirds;try{localStorage.setItem('dedcut-guides',JSON.stringify(guides))}catch(x){}drawGuides()}},
  {id:'save',n:'ui.save',d:['ctrl+s'],f:()=>saveProject(false)},
  {id:'saveAs',n:'kb.saveAs',d:['ctrl+shift+s'],f:()=>saveProject(true)},
  {id:'export',n:'ui.export',d:['ctrl+e'],f:()=>openExport()}
];
const KEY_RESERVED=['ctrl+shift+r','alt+f4','alt+tab','ctrl+alt+delete','ctrl+w'];
var userKeys={};try{userKeys=JSON.parse(localStorage.getItem('dedcut-keys')||'{}')||{}}catch(x){userKeys={}}
function keysOf(a){return (userKeys&&userKeys[a.id])||a.d}
/* « ctrl+shift+s », « space », « + »… Maj n'est noté que pour les lettres, chiffres et touches nommées (pour « + », la touche elle-même suffit) */
function comboOf(e){
  let k=e.key===' '?'space':String(e.key||'').toLowerCase();if(!k||['control','shift','alt','meta','altgraph','os','dead','unidentified'].includes(k))return null;
  const sh=e.shiftKey&&(/^[a-z0-9]$/.test(k)||k.length>1);
  return (e.ctrlKey||e.metaKey?'ctrl+':'')+(e.altKey?'alt+':'')+(sh?'shift+':'')+k;
}
function splitCombo(cb){const plus=cb.endsWith('++')||cb==='+';const key=plus?'+':cb.split('+').pop();const mods=plus?cb.slice(0,-1).split('+').filter(Boolean):cb.split('+').slice(0,-1);return{mods,key}}
function fmtCombo(cb){
  const{mods,key}=splitCombo(cb),AR={arrowleft:'←',arrowright:'→',arrowup:'↑',arrowdown:'↓'};
  const kn=AR[key]||(['space','delete','backspace','escape','home','end','enter'].includes(key)?T('kb.k.'+key):key.length===1?key.toUpperCase():key[0].toUpperCase()+key.slice(1));
  return [...mods.map(m=>T('kb.k.'+m)),kn].join('+');
}
const kbLabel=id=>{const a=KEYACTS.find(x=>x.id===id);return a&&keysOf(a).length?fmtCombo(keysOf(a)[0]):''};
function keyFind(cb){return KEYACTS.find(a=>keysOf(a).includes(cb))}
function saveKeys(){try{localStorage.setItem('dedcut-keys',JSON.stringify(userKeys))}catch(x){}}
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!['range','checkbox','color'].includes(e.target.type))return;
  if(window.dedcutHomeVisible||$('#kbdlg'))return;
  if($('#ov').style.display==='grid'){if(e.key==='Escape'&&!exporting)$('#ov').style.display='none';return}
  const cb=comboOf(e);if(!cb)return;
  const a=keyFind(cb);if(!a)return;
  if(!a.keep)e.preventDefault();a.f();
});

/* ---------- fenêtre « Raccourcis clavier » ---------- */
let kbCap=null;
function openKeys(){
  let o=$('#kbdlg');if(!o){o=document.createElement('div');o.id='kbdlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',ev=>{if(ev.target===o)closeKeys()});
    o.addEventListener('click',ev=>{
      const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.kbx!=null){closeKeys();return}
      if(b.dataset.kbra!=null){userKeys={};saveKeys();kbCap=null;openKeys();refreshKeyLabels();return}
      if(b.dataset.kbr){delete userKeys[b.dataset.kbr];saveKeys();kbCap=null;openKeys();refreshKeyLabels();return}
      if(b.dataset.kba){kbCap={id:b.dataset.kba,i:+b.dataset.kbi};openKeys()}
    });
    o.addEventListener('contextmenu',ev=>{const b=ev.target.closest('[data-kba]');if(!b||b.classList.contains('add'))return;ev.preventDefault();const a=KEYACTS.find(x=>x.id===b.dataset.kba),ks=keysOf(a).slice();ks.splice(+b.dataset.kbi,1);setUserKeys(a,ks);kbCap=null;openKeys();refreshKeyLabels()});
  }
  o.innerHTML=\`<div class="kbbox"><div class="kbhead"><h3>\${T('kb.title')}</h3><button class="sm" data-kbx>\${T('kb.close')}</button></div><p class="hint">\${T('kb.hint')}</p><div class="kblist">\${KEYACTS.map(a=>{const ks=keysOf(a);
    return \`<div class="kbrow"><span>\${T(a.n)}</span><div class="kbkeys">\${ks.map((k,i)=>\`<button class="kbk\${kbCap&&kbCap.id===a.id&&kbCap.i===i?' cap':''}" data-kba="\${a.id}" data-kbi="\${i}">\${kbCap&&kbCap.id===a.id&&kbCap.i===i?T('kb.press'):fmtCombo(k)}</button>\`).join('')}<button class="kbk add\${kbCap&&kbCap.id===a.id&&kbCap.i===ks.length?' cap':''}" data-kba="\${a.id}" data-kbi="\${ks.length}" title="\${T('kb.addTip')}">\${kbCap&&kbCap.id===a.id&&kbCap.i===ks.length?T('kb.press'):'+'}</button>\${userKeys[a.id]?\`<button class="sm kbr" data-kbr="\${a.id}">\${T('kb.reset')}</button>\`:''}</div></div>\`}).join('')}</div><div class="kbfoot"><button data-kbra>\${T('kb.resetAll')}</button></div></div>\`;
}
function closeKeys(){kbCap=null;const o=$('#kbdlg');if(o)o.remove();if(!sel)renderInspector()}
function setUserKeys(a,ks){ks=[...new Set(ks)];if(JSON.stringify(ks)===JSON.stringify(a.d))delete userKeys[a.id];else userKeys[a.id]=ks;saveKeys()}
function refreshKeyLabels(){if(!sel&&!$('#kbdlg'))renderInspector()}
addEventListener('keydown',e=>{
  if(!$('#kbdlg'))return;
  if(!kbCap){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeKeys()}return}
  e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='Escape'){kbCap=null;openKeys();return}
  const cb=comboOf(e);if(!cb)return;
  if(KEY_RESERVED.includes(cb)){toast(T('kb.reserved'));return}
  const a=KEYACTS.find(x=>x.id===kbCap.id);
  for(const b of KEYACTS)if(b!==a&&keysOf(b).includes(cb)){setUserKeys(b,keysOf(b).filter(k=>k!==cb));toast(T('kb.taken',{name:T(b.n)}))}
  const ks=keysOf(a).slice();ks[kbCap.i]=cb;setUserKeys(a,ks);kbCap=null;openKeys();
},true);
window.addEventListener('dedcut-lang',()=>{if($('#kbdlg'))openKeys()});`);

/* panneau Projet : liste des raccourcis tirée de KEYACTS + bouton Personnaliser */
cut("  <div class=\"sec\"><h4>${T('proj.shortcuts')}</h4><div class=\"keys\">", "  </div></div></div>`;\n}",
"  <div class=\"sec\"><h4>${T('proj.shortcuts')}</h4><div class=\"keys\">\n    ${(KEYACTS||[]).filter(a=>keysOf(a).length).map(a=>`<kbd>${keysOf(a).map(fmtCombo).join(' / ')}</kbd><span>${T(a.n)}</span>`).join('')}<kbd>${T('keys.wheel')}</kbd><span>${T('keys.zoom')}</span>\n  </div><button class=\"sm\" data-pact=\"keys\" style=\"margin-top:10px\">${T('kb.customize')}</button>\n");
rep("  if(d.pact==='vert'){toFormat(1080,1920);return}", "  if(d.pact==='keys'){openKeys();return}\n  if(d.pact==='vert'){toFormat(1080,1920);return}");

/* menu du haut : raccourcis affichés selon les réglages + entrée « Raccourcis clavier » */
rep("    {label:'ui.save',key:'Ctrl+S',fn:()=>$('#bSave').click()},", "    {label:'ui.save',key:kbLabel('save'),fn:()=>$('#bSave').click()},");
rep("    {label:'ui.export',key:'Ctrl+E',fn:()=>$('#bExport').click()},", "    {label:'ui.export',key:kbLabel('export'),fn:()=>$('#bExport').click()},");
rep("    {label:'menu.tour',fn:()=>window.dedcutTour&&dedcutTour.start('main')},", "    {label:'kb.title',fn:openKeys},\n    {label:'menu.tour',fn:()=>window.dedcutTour&&dedcutTour.start('main')},");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.kbov{')) {
  css += `
/* fenêtre « Raccourcis clavier » */
.kbov{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);display:grid;place-items:center}
.kbbox{width:min(640px,calc(100vw - 32px));max-height:calc(100vh - 60px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line2,rgba(255,255,255,.14));border-radius:6px;padding:14px 16px;box-shadow:0 20px 60px #000c}
.kbhead{display:flex;align-items:center;justify-content:space-between;gap:10px}
.kbhead h3{margin:0;font-size:15px}
.kbbox>.hint{margin:6px 0 10px}
.kblist{overflow-y:auto;min-height:0;flex:1;border-top:1px solid var(--line);padding-top:4px}
.kbrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);font-size:12.5px}
.kbkeys{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.kbk{min-width:30px;padding:3px 8px;font:600 11.5px/1.4 Consolas,monospace;border-radius:3px;background:var(--panel3)}
.kbk.add{opacity:.6}
.kbk.cap{background:var(--ac);color:#fff;opacity:1}
.kbr{opacity:.8}
.kbfoot{display:flex;justify-content:flex-end;padding-top:10px}
`;
  fs.writeFileSync(C, css);
}
console.log('raccourcis personnalisables ajoutés');

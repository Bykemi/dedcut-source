/* ---------- boutons & clavier ---------- */
$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
/* liste des raccourcis : id, nom affiché, touches par défaut, action. keep = ne pas bloquer l'action normale du navigateur (copier / coller) */
var KEYACTS=[
  {id:'play',n:'keys.playPause',d:['space'],f:()=>playing?pause():play()},
  {id:'split',n:'keys.split',d:['s','ctrl+b'],f:()=>split()},
  {id:'del',n:'keys.delete',d:['delete','backspace'],f:()=>del()},
  {id:'ripple',n:'keys.ripple',d:['shift+delete','shift+backspace'],f:()=>rippleDel()},
  {id:'dup',n:'keys.duplicate',d:['ctrl+d'],f:()=>dup()},
  {id:'copy',n:'kb.copy',d:['ctrl+c'],f:()=>copyClip(),keep:true},
  {id:'paste',n:'kb.paste',d:['ctrl+v'],f:()=>{clearTimeout(pasteWant);pasteWant=setTimeout(()=>{pasteWant=0;pasteClip(time)},80)},keep:true}, // une image collée annule ce collage de clip
  {id:'selAll',n:'kb.selAll',d:['ctrl+a'],f:()=>selectAll()},
  {id:'group',n:'grp.group',d:['ctrl+g'],f:()=>groupSel()},
  {id:'copyStyle',n:'style.copy',d:['ctrl+shift+c'],f:()=>copyStyle()},
  {id:'pasteStyle',n:'style.paste',d:['ctrl+shift+v'],f:()=>pasteStyle()},
  {id:'ungroup',n:'grp.ungroup',d:['ctrl+shift+g'],f:()=>ungroupSel()},
  {id:'desel',n:'msel.none',d:['escape'],f:()=>{if(sel!=null||msel.size)selectNone()}},
  {id:'undo',n:'kb.undo',d:['ctrl+z'],f:()=>undo()},
  {id:'redo',n:'kb.redo',d:['ctrl+y','ctrl+shift+z'],f:()=>redo()},
  {id:'prevF',n:'kb.prevFrame',d:['arrowleft'],f:()=>stepFrame(-1)},
  {id:'nextF',n:'kb.nextFrame',d:['arrowright'],f:()=>stepFrame(1)},
  {id:'back1',n:'kb.back1',d:['shift+arrowleft'],f:()=>seek(time-1)},
  {id:'fwd1',n:'kb.fwd1',d:['shift+arrowright'],f:()=>seek(time+1)},
  {id:'start',n:'kb.start',d:['home'],f:()=>seek(0)},
  {id:'prevEdit',n:'kb.prevEdit',d:['arrowup'],f:()=>jumpEdit(-1)},
  {id:'nextEdit',n:'kb.nextEdit',d:['arrowdown'],f:()=>jumpEdit(1)},
  {id:'loop',n:'kb.loop',d:['l'],f:()=>toggleLoop()},
  {id:'end',n:'kb.end',d:['end'],f:()=>seek(total())},
  {id:'kf',n:'keys.keyframe',d:['k'],f:()=>toggleKf()},
  {id:'marker',n:'keys.marker',d:['m'],f:()=>toggleMarker()},
  {id:'rin',n:'range.in',d:['i'],f:()=>setRange('in')},
  {id:'rout',n:'range.out',d:['o'],f:()=>setRange('out')},
  {id:'rclr',n:'range.clear',d:['alt+x'],f:()=>clearRange()},
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
  if(window.dedcutHomeVisible||$('#kbdlg')||$('#app').classList.contains('studio')||$('#app').classList.contains('imgmode')||$('#app').classList.contains('mumode'))return; // espaces Image et Musique : leurs propres raccourcis
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
  o.innerHTML=`<div class="kbbox"><div class="kbhead"><h3>${T('kb.title')}</h3><button class="sm" data-kbx>${T('kb.close')}</button></div><p class="hint">${T('kb.hint')}</p><div class="kblist">${KEYACTS.map(a=>{const ks=keysOf(a);
    return `<div class="kbrow"><span>${T(a.n)}</span><div class="kbkeys">${ks.map((k,i)=>`<button class="kbk${kbCap&&kbCap.id===a.id&&kbCap.i===i?' cap':''}" data-kba="${a.id}" data-kbi="${i}">${kbCap&&kbCap.id===a.id&&kbCap.i===i?T('kb.press'):fmtCombo(k)}</button>`).join('')}<button class="kbk add${kbCap&&kbCap.id===a.id&&kbCap.i===ks.length?' cap':''}" data-kba="${a.id}" data-kbi="${ks.length}" title="${T('kb.addTip')}">${kbCap&&kbCap.id===a.id&&kbCap.i===ks.length?T('kb.press'):'+'}</button>${userKeys[a.id]?`<button class="sm kbr" data-kbr="${a.id}">${T('kb.reset')}</button>`:''}</div></div>`}).join('')}</div><div class="kbfoot"><button data-kbra>${T('kb.resetAll')}</button></div></div>`;
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
window.addEventListener('dedcut-lang',()=>{if($('#kbdlg'))openKeys()});
if($('#bKeys'))$('#bKeys').onclick=()=>{if($('#kbdlg'))closeKeys();else openKeys()};

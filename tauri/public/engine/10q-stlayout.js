/* ---------- Studio (Enregistrer, Live) modulable comme le Montage (v4.47) ----------
   - côté du panneau des réglages / du chat (gauche ou droite), rangée des panneaux en bas ou en haut ;
   - tailles réglables en tirant les bords (double-clic : taille d'origine), ordre des panneaux du bas en glissant leur titre ;
   - panneaux du bas cachés à volonté (sauf Commandes) ;
   - fenêtres à part pour un 2e écran (aperçu, réglages / chat, scènes, sources, mixeur, commandes), avec detach.js.
   Réglages de chaque personne, sur ce PC : dedcut-stlayout. */
const SL_DOCKS=['scenes','sources','mixer','ctl'];
const SL_DEF=()=>({side:'right',docks:'bottom',order:[...SL_DOCKS],hide:{},sideW:300,docksH:236,w:{scenes:1,sources:1.25,mixer:1.35,ctl:1}});
let sl=SL_DEF();
try{const o=JSON.parse(localStorage.getItem('dedcut-stlayout')||'null');if(o){const d=SL_DEF();sl={...d,...o,w:{...d.w,...(o.w||{})},hide:{...(o.hide||{})},
  order:Array.isArray(o.order)&&SL_DOCKS.every(k=>o.order.includes(k))?o.order.filter(k=>SL_DOCKS.includes(k)):d.order};sl.hide.ctl=false}}catch(e){}
const slSave=()=>{try{localStorage.setItem('dedcut-stlayout',JSON.stringify(sl))}catch(e){}};
// chaque panneau du bas reçoit un identifiant (pour les fenêtres à part)
const slDock={};
{const map={stScenes:'scenes',stSources:'sources',stMixer:'mixer',stCtl:'ctl'};
  for(const d of $$('#studio .st-docks > .st-dock')){const id=Object.keys(map).find(i=>d.querySelector('#'+i));if(!id)continue;const k=map[id];d.id='stDock-'+k;d.dataset.dock=k;slDock[k]=d}}
const SL_DET={prev:'stprev',side:'stside',scenes:'stscenes',sources:'stsources',mixer:'stmixer',ctl:'stctl'};
const SL_NAME={prev:'sl.prev',side:'sl.side',scenes:'st.scenes',sources:'st.sources',mixer:'st.mixer',ctl:'st.controls'};
// déclarés pour detach.js (chargé après le moteur)
window.dedcutDetachExtra=Object.assign(window.dedcutDetachExtra||{},{
  stprev:{sel:'#stPrevArea',name:'sl.prev',w:960,h:600,space:'studio',fit:()=>{try{stFit()}catch(e){}}},
  stside:{sel:'#stSide',name:'sl.side',w:380,h:760,space:'studio'},
  stscenes:{sel:'#stDock-scenes',name:'st.scenes',w:320,h:420,space:'studio'},
  stsources:{sel:'#stDock-sources',name:'st.sources',w:360,h:420,space:'studio'},
  stmixer:{sel:'#stDock-mixer',name:'st.mixer',w:380,h:480,space:'studio'},
  stctl:{sel:'#stDock-ctl',name:'st.controls',w:320,h:440,space:'studio'}
});
const slOut=k=>!!(window.dedcutDetach&&dedcutDetach.isOut(SL_DET[k]));

/* ---------- mise en page ---------- */
function slApply(save){
  const st=$('#studio'),top=$('#studio .st-top'),docks=$('#studio .st-docks'),side=$('#stSide'),prev=$('#stPrevArea');if(!st||!top||!docks)return;
  const pOut=slOut('prev'),sOut=slOut('side'),vis=sl.order.filter(k=>!sl.hide[k]&&!slOut(k));
  const hasTop=!(pOut&&sOut),hasDocks=vis.length>0;
  top.style.display=hasTop?'':'none';docks.style.display=hasDocks?'':'none';
  top.style.order=sl.docks==='top'?2:1;docks.style.order=sl.docks==='top'?1:2;const sb=$('#stStatus');if(sb)sb.style.order=3;
  const R=[];
  if(hasTop&&hasDocks){if(sl.docks==='top')R.push(sl.docksH+'px','minmax(0,1fr)');else R.push('minmax(0,1fr)',sl.docksH+'px')}
  else R.push('minmax(0,1fr)');
  R.push('30px');st.style.gridTemplateRows=R.join(' ');
  if(side)side.style.order=sl.side==='left'?0:2;if(prev)prev.style.order=1;
  top.style.gridTemplateColumns=pOut||sOut?'minmax(0,1fr)':sl.side==='left'?sl.sideW+'px minmax(0,1fr)':'minmax(0,1fr) '+sl.sideW+'px';
  for(const k of SL_DOCKS){const d=slDock[k];if(!d)continue;d.style.order=sl.order.indexOf(k);if(!slOut(k))d.style.display=sl.hide[k]?'none':''}
  docks.style.gridTemplateColumns=vis.map(k=>'minmax(110px,'+sl.w[k]+'fr)').join(' ');
  slSync();if(save)slSave();
  requestAnimationFrame(()=>{slPlace();try{stFit()}catch(e){}});
}

/* ---------- bords à tirer ---------- */
const slRz=[];
function slHandle(kind,i){
  const d=document.createElement('div');d.className='slrz '+(kind==='row'?'h':'v');d.dataset.kind=kind;d.dataset.i=i;d.title=T('layout.resizeTip');$('#studio').appendChild(d);
  let drag=null;
  d.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();d.setPointerCapture(e.pointerId);d.classList.add('on');
    const vis=sl.order.filter(k=>!sl.hide[k]&&!slOut(k));
    drag={x0:e.clientX,y0:e.clientY,w0:sl.sideW,h0:sl.docksH};
    if(kind==='col'){const a=vis[i],b=vis[i+1],ra=slDock[a].getBoundingClientRect(),rb=slDock[b].getBoundingClientRect();Object.assign(drag,{a,b,pa:ra.width,pb:rb.width,tot:sl.w[a]+sl.w[b]})}
  });
  d.addEventListener('pointermove',e=>{
    if(!drag)return;const dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;
    if(kind==='side')sl.sideW=clamp(Math.round(drag.w0+(sl.side==='left'?dx:-dx)),220,640);
    else if(kind==='row')sl.docksH=clamp(Math.round(drag.h0+(sl.docks==='top'?dy:-dy)),120,560);
    else{const pa=clamp(drag.pa+dx,110,drag.pa+drag.pb-110),pb=drag.pa+drag.pb-pa;sl.w[drag.a]=+(drag.tot*pa/(pa+pb)).toFixed(3);sl.w[drag.b]=+(drag.tot*pb/(pa+pb)).toFixed(3)}
    slApply(false);
  });
  const end=()=>{if(!drag)return;drag=null;d.classList.remove('on');slSave()};
  d.addEventListener('pointerup',end);d.addEventListener('pointercancel',end);
  d.addEventListener('dblclick',()=>{const D=SL_DEF();if(kind==='side')sl.sideW=D.sideW;else if(kind==='row')sl.docksH=D.docksH;else sl.w={...D.w};slApply(true)});
  slRz.push(d);return d;
}
slHandle('side',0);slHandle('row',0);for(let i=0;i<SL_DOCKS.length-1;i++)slHandle('col',i);
function slPlace(){
  const st=$('#studio');if(!st||st.hidden)return;const S=st.getBoundingClientRect(),top=$('#studio .st-top'),docks=$('#studio .st-docks');
  const vis=sl.order.filter(k=>!sl.hide[k]&&!slOut(k)),tv=top.style.display!=='none',dv=docks.style.display!=='none';
  for(const d of slRz){
    const kind=d.dataset.kind,i=+d.dataset.i;let show=false;
    if(kind==='side'&&tv&&!slOut('prev')&&!slOut('side')){const a=$('#stPrevArea').getBoundingClientRect(),b=$('#stSide').getBoundingClientRect(),T0=top.getBoundingClientRect();
      const x=sl.side==='left'?(b.right+a.left)/2:(a.right+b.left)/2;Object.assign(d.style,{left:(x-S.left-4)+'px',top:(T0.top-S.top)+'px',height:T0.height+'px'});show=true}
    else if(kind==='row'&&tv&&dv){const a=top.getBoundingClientRect(),b=docks.getBoundingClientRect(),y=sl.docks==='top'?(b.bottom+a.top)/2:(a.bottom+b.top)/2;
      Object.assign(d.style,{top:(y-S.top-4)+'px',left:'0px',width:S.width+'px'});show=true}
    else if(kind==='col'&&dv&&i<vis.length-1){const a=slDock[vis[i]].getBoundingClientRect(),b=slDock[vis[i+1]].getBoundingClientRect(),B=docks.getBoundingClientRect();
      Object.assign(d.style,{left:((a.right+b.left)/2-S.left-4)+'px',top:(B.top-S.top)+'px',height:B.height+'px'});show=true}
    d.hidden=!show;
  }
}
addEventListener('resize',()=>requestAnimationFrame(slPlace));
new ResizeObserver(()=>requestAnimationFrame(slPlace)).observe($('#studio'));

/* ---------- ordre des panneaux du bas : on glisse leur titre ---------- */
let slDrag=null;
for(const k of SL_DOCKS){
  const h=slDock[k]&&slDock[k].querySelector('h4');if(!h)continue;h.classList.add('slh');
  h.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button')||slOut(k))return;slDrag={k,x0:e.clientX,moved:false,t:null}});
}
addEventListener('pointermove',e=>{
  if(!slDrag)return;if(!slDrag.moved&&Math.abs(e.clientX-slDrag.x0)<6)return;
  if(!slDrag.moved){slDrag.moved=true;slDock[slDrag.k].classList.add('sldrag')}
  slDrag.t=null;for(const k of SL_DOCKS){const d=slDock[k];d.classList.remove('sldropb','sldropa');if(k===slDrag.k||sl.hide[k]||slOut(k))continue;
    const r=d.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top-40&&e.clientY<=r.bottom+40){const after=e.clientX>r.left+r.width/2;d.classList.add(after?'sldropa':'sldropb');slDrag.t=k;slDrag.after=after}}
});
addEventListener('pointerup',()=>{
  const d=slDrag;slDrag=null;if(!d)return;for(const k of SL_DOCKS)slDock[k]&&slDock[k].classList.remove('sldrag','sldropb','sldropa');
  if(!d.moved||!d.t)return;const o=sl.order.filter(k=>k!==d.k);o.splice(o.indexOf(d.t)+(d.after?1:0),0,d.k);sl.order=o;slApply(true);
});

/* ---------- boutons « fenêtre à part » sur chaque panneau ---------- */
const slBtn={};
function slMk(k,where){const b=document.createElement('button');b.className='dtb sldt';b.dataset.slk=k;b.onclick=e=>{e.stopPropagation();slToggle(k)};where.appendChild(b);slBtn[k]=b;return b}
// posé dans le panneau (pas dans son titre : le titre est réécrit au changement de langue)
for(const k of SL_DOCKS)if(slDock[k])slMk(k,slDock[k]);
{const p=$('#stPrevArea');if(p)slMk('prev',p).classList.add('slprev')}
function slSync(){
  for(const[k,b]of Object.entries(slBtn)){const out=slOut(k),D=window.dedcutDetach;b.innerHTML=D?(out?D.icoIn:D.icoOut):'';b.title=T(out?'detach.in':'detach.out');b.classList.toggle('on',out);b.hidden=!D}
}
function slToggle(k){const D=window.dedcutDetach;if(!D){toast('detach.fail');return}D.toggle(SL_DET[k]);slRemember()}
// panneaux du studio laissés à part : rouverts à la prochaine entrée dans le studio
function slRemember(){setTimeout(()=>{try{const o=SL_DOCKS.concat(['prev','side']).filter(slOut).map(k=>SL_DET[k]);localStorage.setItem('dedcut-stdetach',JSON.stringify(o))}catch(e){}},300)}
let slRestored=false;
{const sm=setMode;setMode=function(m){const r=sm.apply(this,arguments);try{$('#stLayoutBtn').title=T(m==='image'?'img.c.layout':'sl.title').replace(/…$/,'')}catch(e){}
  if(m==='rec'||m==='live'){requestAnimationFrame(()=>slApply(false));
    if(!slRestored&&window.dedcutDetach){slRestored=true;let L=[];try{L=JSON.parse(localStorage.getItem('dedcut-stdetach')||'[]')}catch(e){}
      for(const id of L)if(Object.values(SL_DET).includes(id)&&!dedcutDetach.isOut(id))dedcutDetach.detach(id)}}
  return r}}
setInterval(()=>{if(window.dedcutDetach&&!$('#studio').hidden)slRemember()},4000);

/* ---------- fenêtre « Disposition du studio » ---------- */
{const b=document.createElement('button');b.id='stLayoutBtn';b.innerHTML=ico('layout',16);const bl=$('#bLayout');if(bl)bl.after(b);else $('header').appendChild(b);
  const pick=document.createElement('div');pick.id='stLayoutPick';pick.hidden=true;document.body.appendChild(pick);
  const tip=()=>{b.title=T(appMode==='image'?'img.c.layout':'sl.title').replace(/…$/,'')};tip();addEventListener('dedcut-lang',()=>{tip();slSync();if(!pick.hidden)slPick()});
  // dans l'espace Image, le même bouton ouvre la disposition de l'espace Image
  b.onclick=e=>{if(appMode==='image'){window.dispatchEvent(new Event('dedcut-image-layout'));return}const r=e.currentTarget.getBoundingClientRect();slPick();pick.hidden=!pick.hidden;pick.style.top=(r.bottom+6)+'px';pick.style.left=Math.max(8,Math.min(innerWidth-310,r.right-290))+'px'};
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#stLayoutPick,#stLayoutBtn'))pick.hidden=true});
  pick.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t)return;const d=t.dataset;
    if(d.slside){sl.side=d.slside}else if(d.sldocks){sl.docks=d.sldocks}else if(d.slhide){sl.hide[d.slhide]=!sl.hide[d.slhide]}
    else if(d.slout){slToggle(d.slout)}else if(d.slreset){sl=SL_DEF()}else return;
    slApply(true);setTimeout(slPick,d.slout?350:0);
  });
}
function slPick(){
  const p=$('#stLayoutPick'),seg=(k,v,label)=>`<button data-${k}="${v}" class="${sl[k.slice(2)]===v?'on':''}">${T(label)}</button>`,D=window.dedcutDetach;
  p.innerHTML=`<div class="lpt">${T('sl.title')}</div>
    <div class="slsub">${T('sl.sideRow')}</div><div class="seg">${seg('slside','left','sl.left')}${seg('slside','right','sl.right')}</div>
    <div class="slsub">${T('sl.docksRow')}</div><div class="seg">${seg('sldocks','top','layout.tlTop')}${seg('sldocks','bottom','layout.tlBottom')}</div>
    <div class="slsub">${T('sl.shown')}</div><div class="slchips">${['scenes','sources','mixer'].map(k=>`<button data-slhide="${k}" class="${sl.hide[k]?'':'on'}">${ico(sl.hide[k]?'eyeoff':'eye',13)}<span>${T(SL_NAME[k])}</span></button>`).join('')}</div>
    ${D?`<div class="slsub">${T('detach.section')}</div><div class="lpd">${['prev','side',...SL_DOCKS].map(k=>`<button data-slout="${k}" class="${slOut(k)?'on':''}">${slOut(k)?D.icoIn:D.icoOut}<span>${T(SL_NAME[k])}</span></button>`).join('')}</div><div class="hint" style="margin:6px 0 0">${T('detach.hint')}</div>`:''}
    <div class="hint" style="margin:8px 0">${T('sl.hint')}</div><button class="sm" data-slreset="1">${T('layout.reset')}</button>`;
}
window.dedcutStLayout={apply:()=>slApply(false)};
slApply(false);

/* ---------- barre du haut : si les espaces ne tiennent pas (5 espaces, nom du projet, boutons de la fenêtre Windows),
   on n'affiche que leurs icônes (le nom reste dans l'infobulle) au lieu de couper « Montage » ---------- */
function hdrFit(){
  const hd=document.querySelector('header'),hc=hd&&hd.querySelector('.hc');if(!hc)return;
  hd.classList.remove('compact');if(hc.scrollWidth>hc.clientWidth+1)hd.classList.add('compact');
}
{const hd=document.querySelector('header');if(hd&&window.ResizeObserver){let t=0;const ro=new ResizeObserver(()=>{clearTimeout(t);t=setTimeout(hdrFit,40)});ro.observe(hd);for(const c of hd.querySelectorAll('.hl,.hc,.hr'))ro.observe(c)}
 // le contenu du centre change avec l'espace affiché et le nom du projet
 const hc=hd&&hd.querySelector('.hc');if(hc&&window.MutationObserver){let q=0;new MutationObserver(()=>{if(q)return;q=setTimeout(()=>{q=0;hdrFit()},30)}).observe(hc,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']})}
 const f=setMode;setMode=function(){const r=f.apply(this,arguments);setTimeout(hdrFit,30);return r};hdrFit()}

/* ---------- en quittant le Montage, son panneau « Enregistrer » éteint le testeur de micro et l'aperçu webcam
   (avant, ils restaient allumés dans les autres espaces : micro ouvert pour rien) ; ils reviennent au retour ---------- */
{const f=setMode;setMode=function(m){const was=typeof appMode!=='undefined'?appMode:'edit',r=f.apply(this,arguments);
  try{if(m!=='edit'&&!recState){stopMeter();stopCamPrev()}
    else if(m==='edit'&&was!=='edit'&&!recState&&!$('#t-rec').hidden){loadMics();camPreview()}}catch(e){}
  return r}}

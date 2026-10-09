/* ---------- Module Live, socle (v4.43) ----------
   Complète le studio là où il était partiel (cahier « DedCut : module Live », priorité P1) :
   - réglages communs à toutes les sources : recadrage, opacité, luminosité, contraste, saturation, verrou,
     et « sortie » (live + enregistrement, live seulement, enregistrement seulement) ;
   - source « Son » (fichier audio : lecture, pause, boucle, volume) ; vidéo : pause et boucle ;
   - webcam : résolution et images par seconde au choix, retour automatique après un débranchement ;
   - qualité : débit choisi, encodeur matériel ou logiciel, qualité et dossier des enregistrements ;
   - statistiques : temps de rendu par image, file de l'encodeur et alerte de surcharge ;
   - scènes : dupliquer. */
const LB_CROP=new Set(['screen','cam','image','video']);

/* ---------- réglages communs (panneau Source) ---------- */
function lbAdjHTML(it){
  if(it.kind==='audio')return`<label class="chk"><span>${T('lb.lock')}</span><input type="checkbox" data-lblock="1" ${it.lock?'checked':''}></label>`;
  const o=it.o,R=(k,l,mn,mx,d,u)=>`<div class="fld"><label>${T(l)} <span>${o[k]==null?d:o[k]}${u||''}</span></label><input type="range" min="${mn}" max="${mx}" value="${o[k]==null?d:o[k]}" data-o="${k}" data-lbr="${u||''}"></div>`;
  const crop=LB_CROP.has(it.kind)?`<div class="two">${R('cl','wg.cam.l',0,45,0,' %')}${R('cr','wg.cam.r',0,45,0,' %')}</div><div class="two">${R('ct','wg.cam.t',0,45,0,' %')}${R('cb','wg.cam.b',0,45,0,' %')}</div>`:'';
  const color=it.kind==='audio'?'':R('opa','lb.opacity',0,100,100,' %')+R('cbr','wg.cam.bri',40,170,100,' %')+R('cco','wg.cam.con',40,170,100,' %')+R('csa','wg.cam.sat',0,200,100,' %');
  const out=`<div class="fld"><label>${T('lb.out')}</label><select data-o="out">${['both','live','rec'].map(k=>`<option value="${k}" ${(o.out||'both')===k?'selected':''}>${T('lb.out_'+k)}</option>`).join('')}</select></div>`;
  const used=['cl','cr','ct','cb','opa','cbr','cco','csa'].some(k=>o[k]!=null)||o.out&&o.out!=='both';
  return`<details class="cxsec lbadj"${used?' open':''}><summary>${ico('sliders',14)}<b>${T('lb.adj')}</b></summary>${crop}${color}${out}
    <label class="chk"><span>${T('lb.lock')}</span><input type="checkbox" data-lblock="1" ${it.lock?'checked':''}></label>
    <button class="sm" data-lbact="adjreset">${T('wg.reset')}</button></details>`;
}
function stPropsExtra(it){
  const o=it.o;let h='';
  if(it.kind==='cam'){const S=st.cams[stCamKey(it)],tr=S&&S.stream&&S.stream.getVideoTracks()[0],cs=tr&&tr.getSettings?tr.getSettings():null,cap=tr&&tr.getCapabilities?tr.getCapabilities():null;
    const maxH=cap&&cap.height&&cap.height.max||2160,maxF=cap&&cap.frameRate&&cap.frameRate.max||60;
    h+=`<div class="two"><div class="fld"><label>${T('lb.res')}</label><select data-lbcam="res">${[480,720,1080,1440,2160].filter(v=>v<=maxH).map(v=>`<option value="${v}" ${(+o.res||720)===v?'selected':''}>${v}p</option>`).join('')}</select></div>
      <div class="fld"><label>${T('lb.fps')}</label><select data-lbcam="fps">${[15,24,30,60].filter(v=>v<=Math.max(15,Math.round(maxF))).map(v=>`<option value="${v}" ${(+o.fps||30)===v?'selected':''}>${v}</option>`).join('')}</select></div></div>`
      +(cs&&cs.width?`<p class="hint">${T('lb.camReal',{w:cs.width,h:cs.height,f:Math.round(cs.frameRate||0)})}</p>`:S&&S.err?`<p class="hint cxwarn">${T(S.lost?'lb.camLost':'lb.camErr')}</p><button class="sm" data-lbact="camretry">${ico('replay',13)}${T('lb.retry')}</button>`:'')}
  if(it.kind==='video')h+=`<div class="stduo"><button data-lbact="vplay">${ico(o.paused?'play':'pause',13)}${T(o.paused?'lb.play':'lb.pause')}</button><button data-lbact="vstart">${ico('start',13)}${T('lb.fromStart')}</button></div>
    <label class="chk"><span>${T('lb.loop')}</span><input type="checkbox" data-o="loop" ${o.loop!==false?'checked':''}></label>`;
  return h+lbAdjHTML(it);
}

/* ---------- source « Son » : un fichier audio qui joue dans le live ---------- */
ST_KINDS.audio='audio';
ST_NEW.audio={o:()=>({vol:80,loop:true,mon:false}),r:()=>({x:.02,y:.02,w:.22,h:.06})};
const lbAuds={};
function lbAud(path){
  if(!path)return null;let A=lbAuds[path];
  if(!A){const a=new Audio();a.crossOrigin='anonymous';a.preload='auto';a.src=window.dedcutFS?window.dedcutFS.fileUrl(path):path;A=lbAuds[path]={a};
    if(st.ac){try{A.src=st.ac.createMediaElementSource(a);A.g=st.ac.createGain();A.m=st.ac.createGain();A.src.connect(A.g);A.g.connect(st.bus);A.g.connect(A.m);A.m.connect(st.ac.destination)}catch(e){}}}
  return A;
}
ST_DRAW.audio=(g,it,x,y,w,h)=>{if(O.live||O.rec)return;const A=it.o.path&&lbAuds[it.o.path];
  stHolder(g,x,y,w,h,(it.o.path?it.o.path.split(/[\\/]/).pop():T('lb.pickAudio'))+(A&&!A.a.paused?' · '+T('lb.playing'):''))};
ST_PROPS.audio=it=>{const o=it.o,A=o.path&&lbAuds[o.path];return`<button class="pri" data-lbact="apick">${ico('audio',15)}${T(o.path?'deco.change':'lb.pickAudio')}</button>
  ${o.path?`<p class="hint">${esc(o.path.split(/[\\/]/).pop())}</p><div class="stduo"><button data-lbact="aplay">${ico(o.paused?'play':'pause',13)}${T(o.paused?'lb.play':'lb.pause')}</button><button data-lbact="astart">${ico('start',13)}${T('lb.fromStart')}</button></div>`:''}
  <div class="fld"><label>${T('st.vid.vol')} <span>${o.vol==null?80:o.vol}</span></label><input type="range" min="0" max="150" value="${o.vol==null?80:o.vol}" data-o="vol"></div>
  <label class="chk"><span>${T('lb.loop')}</span><input type="checkbox" data-o="loop" ${o.loop!==false?'checked':''}></label>
  <label class="chk"><span>${T('cx.tts.me')}</span><input type="checkbox" data-o="mon" ${o.mon?'checked':''}></label>
  <p class="hint">${T('lb.audioHint')}</p>${A&&A.a.error?`<p class="hint cxwarn">${T('wg.sb.fail')}</p>`:''}`};
// lecture des sons et des vidéos de la scène affichée (le programme en mode studio)
function lbMediaSync(){
  if(!stData)return;const sc=stData.smode&&typeof pgScene==='function'?pgScene():stScene(),on=stOn()||!!(O.live||O.rec),want=new Map();
  for(const it of sc.items)if(it.kind==='audio'&&it.vis&&it.o.path)want.set(it.o.path,it);
  for(const[p,A]of Object.entries(lbAuds)){const it=want.get(p);
    if(it&&on&&!it.o.paused){A.a.loop=it.o.loop!==false;if(A.g)A.g.gain.value=(it.o.vol==null?80:+it.o.vol)/100;if(A.m)A.m.gain.value=it.o.mon?.9:0;if(A.a.paused&&!(A.a.ended&&!A.a.loop))A.a.play().catch(()=>{})}
    else if(!A.a.paused)A.a.pause()}
  for(const it of stScene().items)if(it.kind==='video'&&it.o.path&&typeof stVids!=='undefined'&&stVids[it.o.path]){const v=stVids[it.o.path].v;v.loop=it.o.loop!==false;if(it.o.paused&&!v.paused)v.pause()}
}
{const vs=stVideoSync;stVideoSync=function(r){vs(r);lbMediaSync()}}
setInterval(lbMediaSync,1000);
async function lbPickAudio(it){
  const F=window.dedcutFS;if(!F){toast(T('msg.onlyInApp'));return}
  const l=await F.pickMedia(T('st.k.audio')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)==='audio');if(!f)return;
  it.o.path=f.path;delete it.o.paused;lbAud(f.path);stSave();lbMediaSync();stRender();
}

/* ---------- sortie de chaque composition : live, enregistrement (sources propres), programme du mode studio ---------- */
const lbRecCv=document.createElement('canvas'),lbRecG=lbRecCv.getContext('2d');
const lbOutScene=()=>stData.smode&&typeof pgScene==='function'?pgScene():stScene();
const lbSelective=()=>lbOutScene().items.some(it=>it.vis&&it.o.out&&it.o.out!=='both');
function lbRecDraw(){
  if(lbRecCv.width!==st.w||lbRecCv.height!==st.h){lbRecCv.width=st.w;lbRecCv.height=st.h}
  const t=(performance.now()-st.t0)/1000;lbRecG.fillStyle='#000';lbRecG.fillRect(0,0,st.w,st.h);
  for(const it of lbOutScene().items)if(it.vis&&stOutOk(it,'rec'))try{stDrawIt(lbRecG,it,t)}catch(e){}
  return lbRecCv;
}
function stOutSrc(o){
  if(o===O.rec&&lbSelective())return lbRecDraw;
  return stData&&stData.smode&&typeof pgCv!=='undefined'?()=>pgCv:null;
}
// pas de mode studio ni de sources propres : le crochet de 10l ne met rien ; on le fait ici aussi pour l'enregistrement seul
setInterval(()=>{if(O.rec&&O.rec.kind!=='vert')O.rec.src=stOutSrc(O.rec)},300);

/* ---------- webcams : nouvel essai après un débranchement ---------- */
function lbCamRetry(){if(!stData||!stOn())return;let n=0;for(const[k,c]of Object.entries(st.cams))if(c&&c.err){delete st.cams[k];n++}if(n)stCamsSync().then(()=>{if(stSide==='props')stSideUI()})}
setInterval(lbCamRetry,8000);
if(navigator.mediaDevices&&navigator.mediaDevices.addEventListener)navigator.mediaDevices.addEventListener('devicechange',()=>setTimeout(lbCamRetry,800));
function lbCamReopen(k){const c=st.cams[k];if(c&&c.close)c.close();delete st.cams[k];stCamsSync().then(()=>{if(stSide==='props')stSideUI()})}

/* ---------- qualité : débit, encodeur, enregistrement ---------- */
function stQualHTML(busy){
  const kb=+stData.kbps||0,auto=(ST_Q[stData.q]||ST_Q['1080:30'])[3];
  return`<div class="fld"><label>${T('lb.kbps')}</label><select data-lq="kbps" ${busy?'disabled':''}><option value="0">${T('lb.kbpsAuto',{n:auto})}</option>${[2500,3500,4500,6000,8000,10000,12000].map(v=>`<option value="${v}" ${kb===v?'selected':''}>${v} kb/s</option>`).join('')}</select></div>
    <div class="fld"><label>${T('lb.enc')}</label><select data-lq="enc" ${busy?'disabled':''}>${['auto','hw','sw'].map(k=>`<option value="${k}" ${(stData.enc||'auto')===k?'selected':''}>${T('lb.enc_'+k)}</option>`).join('')}</select></div>
    <div id="lbEncSt" class="hint">${lbEncMsg||''}</div>
    <div class="fld"><label>${T('lb.recQ')}</label><select data-lq="mult" ${busy?'disabled':''}>${[[1.5,'n'],[2.5,'h'],[4,'x']].map(([v,k])=>`<option value="${v}" ${(+stData.rec.mult||2.5)===v?'selected':''}>${T('lb.recQ_'+k)}</option>`).join('')}</select></div>
    <div class="fld"><label>${T('lb.recDir')}</label><div class="lbdir">${esc(stData.rec.dir||T('lb.recDirDef'))}</div><div class="stduo"><button class="sm" data-lqact="dir" ${busy?'disabled':''}>${ico('open',13)}${T('lb.choose')}</button>${stData.rec.dir?`<button class="sm" data-lqact="dirdef" ${busy?'disabled':''}>${T('lb.recDirReset')}</button>`:''}</div></div>`;
}
let lbEncMsg='';
async function lbEncCheck(){
  const c=await stCodecs(st.w,st.h,st.fps,stKbps()).catch(()=>null);
  lbEncMsg=c?T('lb.encOk',{codec:c.codec,mode:c.hardwareAcceleration?T('lb.enc_'+(c.hardwareAcceleration==='prefer-hardware'?'hw':'sw')):T('lb.enc_auto')}):'<span class="cxwarn">'+T('live.noEncoder')+'</span>';
  const el=$('#lbEncSt');if(el)el.innerHTML=lbEncMsg;
}

/* ---------- statistiques : rendu et encodeur ---------- */
const lbPerf={ms:0};
{const sd=stDraw;stDraw=function(t){const a=performance.now();sd(t);const d=performance.now()-a;lbPerf.ms=lbPerf.ms?lbPerf.ms*.9+d*.1:d}}
{const ss=stStatus;stStatus=function(s){ss(s);const el=$('#stStatus');if(!el||!(O.live||O.rec||O.vert))return;
  const o=O.live||O.rec,q=Math.max(...[O.live,O.rec,O.vert].filter(Boolean).map(x=>x.venc&&x.venc.encodeQueueSize||0)),budget=1000/(st.fps||30),over=lbPerf.ms>budget*.85||q>2;
  el.insertAdjacentHTML('beforeend',`<span class="lbperf${over?' warn':''}" title="${esc(T('lb.perfTip'))}">${T('lb.perf',{ms:lbPerf.ms.toFixed(1),q})}${over?' · '+T('lb.over'):''}</span>`)}}

/* ---------- scènes : dupliquer ---------- */
{const add=$('#stScAdd');if(add&&!$('#stScDup')){const b=document.createElement('button');b.id='stScDup';b.title=T('lb.dup');b.innerHTML=ico('copy',15);add.after(b);
  b.onclick=()=>{const s=stScene(),id=Math.max(...stData.scenes.map(x=>x.id))+1,c=JSON.parse(JSON.stringify(s));c.id=id;c.name=(s.name+' '+T('lb.copy')).slice(0,40);
    for(const it of c.items)it.id=++stUid;stData.scenes.splice(stData.scenes.indexOf(s)+1,0,c);stSave();stSwitch(id)}}}
window.addEventListener('dedcut-lang',()=>{const b=$('#stScDup');if(b)b.title=T('lb.dup')});

/* ---------- événements ---------- */
$('#stSide').addEventListener('input',e=>{
  const t=e.target,it=stSel();
  if(t.dataset.lbr!=null){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value+t.dataset.lbr;return}
  if(t.dataset.lblock&&it){it.lock=t.checked;stSave();stSourcesUI();return}
});
$('#stSide').addEventListener('change',async e=>{
  const t=e.target,it=stSel();
  if(t.dataset.lbcam&&it){it.o[t.dataset.lbcam]=+t.value;stSave();lbCamReopen(stCamKey(it));return}
  if(t.dataset.lq){const k=t.dataset.lq;if(k==='kbps')stData.kbps=+t.value;else if(k==='enc')stData.enc=t.value;else if(k==='mult')stData.rec.mult=+t.value;stSave();if(k!=='mult')lbEncCheck();return}
  if(t.dataset.o==='out'||t.dataset.o==='loop'){if(it&&it.kind==='video')lbMediaSync();stSourcesUI()}
});
$('#stSide').addEventListener('click',async e=>{
  const b=e.target.closest('[data-lbact],[data-lqact]');if(!b)return;const it=stSel(),a=b.dataset.lbact||b.dataset.lqact;
  if(a==='adjreset'&&it){for(const k of['cl','cr','ct','cb','opa','cbr','cco','csa','out'])delete it.o[k];stSave();stSideUI();return}
  if(a==='camretry'&&it){lbCamReopen(stCamKey(it));return}
  if(a==='vplay'&&it){it.o.paused=!it.o.paused;stSave();stVideoSync(false);const V=stVids[it.o.path];if(V&&!it.o.paused)V.v.play().catch(()=>{});stSideUI();return}
  if(a==='vstart'&&it){const V=stVids[it.o.path];if(V)try{V.v.currentTime=0}catch(x){}return}
  if(a==='apick'&&it){lbPickAudio(it);return}
  if(a==='aplay'&&it){it.o.paused=!it.o.paused;stSave();lbMediaSync();stSideUI();return}
  if(a==='astart'&&it){const A=lbAuds[it.o.path];if(A){try{A.a.currentTime=0}catch(x){}delete it.o.paused;stSave();lbMediaSync();stSideUI()}return}
  if(a==='dir'){const F=window.dedcutFS;if(!F||!F.pickFolder){toast(T('msg.onlyInApp'));return}const d=await F.pickFolder(T('lb.recDir')).catch(()=>null);if(d){stData.rec.dir=d;stSave();stSideUI()}return}
  if(a==='dirdef'){stData.rec.dir='';stSave();stSideUI();return}
});
{const sd=stSideUI;stSideUI=function(){sd();if(stSide==='set'&&!lbEncMsg)lbEncCheck()}}

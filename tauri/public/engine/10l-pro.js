/* ---------- Live pro (v4.42) ----------
   - Live vertical (TikTok, YouTube Shorts) en même temps que le live normal : les destinations cochées « 9:16 »
     reçoivent une 2e image 720 x 1280 faite à partir du live (image entière sur fond flou, ou recadrée) ;
   - Télécommande sur le téléphone : petit serveur sur le réseau local (src-tauri/src/remote.rs), code PIN ;
   - Mode studio (comme OBS) : on prépare la scène suivante dans l'aperçu pendant que le programme part en direct,
     puis « Transition » l'envoie au live. */

/* ---------- (12) live vertical ---------- */
const LV_DEF=()=>({mode:'fit',pos:50,q:'720'});
function lvCfg(){if(!stData.vert)stData.vert=LV_DEF();return stData.vert}
const LV_Q={'720':[720,1280,3000],'1080':[1080,1920,5000]};
const lvCv=document.createElement('canvas'),lvG=lvCv.getContext('2d'),lvSm=document.createElement('canvas'),lvSmG=lvSm.getContext('2d');
lvSm.width=90;lvSm.height=160;
// image 9:16 faite à partir de l'image du live (programme en mode studio)
function lvFrame(){
  const C=lvCfg(),src=stData.smode?pgCv:st.cv,W=lvCv.width,H=lvCv.height,sw=src.width,sh=src.height;
  if(C.mode==='crop'){const cw=sh*W/H,x=Math.max(0,Math.min(sw-cw,(sw-cw)*(+C.pos||50)/100));lvG.drawImage(src,x,0,cw,sh,0,0,W,H)}
  else{ // image entière au milieu, fond flou (petite copie agrandie : rapide)
    lvSmG.drawImage(src,(sw-sh*9/16)/2,0,sh*9/16,sh,0,0,90,160);lvG.save();lvG.filter='blur(6px) brightness(.6)';lvG.drawImage(lvSm,-W*.05,-H*.05,W*1.1,H*1.1);lvG.restore();
    const h=W*sh/sw;lvG.drawImage(src,0,(H-h)/2,W,h)}
  return lvCv;
}
const lvMeta=V=>({width:lvCv.width,height:lvCv.height,framerate:st.fps,videodatarate:V.kbps,audiodatarate:160});
async function lvOutput(kb){
  const[w,h]=LV_Q[lvCfg().q]||LV_Q['720'];lvCv.width=w;lvCv.height=h;
  const vcfg=await stCodecs(w,h,st.fps,kb),acfg={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:160000};
  if(!vcfg){toast(T('live.noEncoder'));return null}
  const o={kind:'vert',kbps:kb,vcfg,on:false,paused:false,s0:0,pausedS:0,el:0,lastKey:-9,forceKey:true,frames:0,dropped:0,congested:false,t0:Date.now(),src:lvFrame};
  const bad=()=>{if(O.vert===o||O.live===o){toast(T('live.encFail'));lvStop()}};
  o.venc=new VideoEncoder({output:(c,m)=>stLiveV(o,c,m),error:bad});o.venc.configure(vcfg);
  o.aenc=new AudioEncoder({output:(c,m)=>stLiveA(o,c,m),error:bad});o.aenc.configure(acfg);
  return o;
}
// démarre la sortie verticale ; seule (aucune destination 16:9), elle devient le live principal
async function lvStart(vds,alone){
  const kb=(LV_Q[lvCfg().q]||LV_Q['720'])[2];const[w,h]=LV_Q[lvCfg().q]||LV_Q['720'];const ok=[];
  await stAudio();stApplyQ();stWake();
  for(const d of vds){try{await dedcutLive.start(d.id,d.url,d.key,{width:w,height:h,framerate:st.fps,videodatarate:kb,audiodatarate:160});ok.push(d)}catch(e){toast(stDestName(d)+' : '+stLiveErr(e))}}
  if(!ok.length)return;
  const V=await lvOutput(kb);if(!V){ok.forEach(d=>dedcutLive.stop(d.id).catch(()=>{}));return}
  V.dests=ok.map(d=>({id:d.id,name:stDestName(d)+' 9:16',q:[],qBytes:0,sending:false,lastFlush:0,sent:0,prevSent:0,reconn:false,dead:false,congested:false,kbps_now:0}));
  if(!O.rec&&!O.live)st.nextV=st.samples;V.s0=st.samples;V.on=true;
  if(alone){O.live=V;if(!stChatOn()&&stChatReady())stChatConnect();stStatsOn();if(typeof lxStart==='function'&&!lxS.on)lxStart()}else O.vert=V;
  stCtlUI();stStatus();
}
async function lvStop(){
  const V=O.vert;if(!V||V.stopping)return;V.stopping=true;
  await stOutStop(V);await stFlush(V,true);V.dests.forEach(d=>dedcutLive.stop(d.id).catch(()=>{}));O.vert=null;stStatus();
}
{const ls=stLiveStart;stLiveStart=async function(){
  if(O.live||stLiveStart.busy)return;
  // studio déjà vertical (10t-vertical.js) : toutes les destinations reçoivent l'image 9:16 du studio
  const vv=stData.fmt==='v',vds=stData.dests.filter(d=>d.on&&d.vert&&!vv),hds=stData.dests.filter(d=>d.on&&(!d.vert||vv));
  if(!vds.length)return ls();
  if(!window.dedcutLive){toast(T('msg.onlyInApp'));return}
  if(vds.some(d=>!d.url)){toast(T('live.needUrl'));stSideShow('set');return}
  const nk=vds.find(d=>!d.key&&!/rtmps?:\/\/[^/]+\/.+\/.+/.test(d.url));if(nk){toast(T('live.needKey')+' ('+stDestName(nk)+')');stSideShow('set');return}
  if(!hds.length){stLiveStart.busy=true;stCtlUI();try{stStatus('connecting');await lvStart(vds,true)}finally{stLiveStart.busy=false;stCtlUI();stStatus()}return}
  vds.forEach(d=>d.on=false);try{await ls()}finally{vds.forEach(d=>d.on=true)}
  if(O.live)await lvStart(vds,false);
}}
{const lt=stLiveStop;stLiveStop=async function(){await lvStop();return lt()}}
// une destination verticale perd la connexion : elle réessaie seule
{const ll=stLiveLost;stLiveLost=async function(id){
  const V=O.vert;if(!V||!V.dests.some(d=>d.id===id))return ll(id);
  const d=V.dests.find(x=>x.id===id);if(d.reconn||d.dead)return;d.reconn=true;d.q=[];d.qBytes=0;
  for(let i=0;i<6&&O.vert===V&&V.on;i++){await new Promise(r=>setTimeout(r,2000+i*2000));if(O.vert!==V||!V.on)return;
    const c=stData.dests.find(x=>x.id===id);if(!c)break;
    try{await dedcutLive.start(id,c.url,c.key,lvMeta(V));d.reconn=false;const us=Math.round(V.el*1e6);if(V.avcC)stPushTo(d,stMsg(9,us,[0x17,0,0,0,0],V.avcC));if(V.asc)stPushTo(d,stMsg(8,us,[0xAF,0],V.asc));V.forceKey=true;toast(d.name+' : '+T('live.back'));return}catch(e){}}
  if(O.vert!==V)return;d.dead=true;d.reconn=false;toast(d.name+' : '+T('live.lost'));if(V.dests.every(x=>x.dead))lvStop();
}}
if(window.dedcutLive)dedcutLive.onStatus(s=>{if(!O.live&&O.vert&&O.vert.on&&s.state==='error')stLiveLost(s.id)});
function lvSetHTML(){
  const C=lvCfg(),busy=!!(O.live||O.vert);
  return`<h5>${ico('portrait',14)} ${T('lv.title')}</h5>
    ${stData.dests.map(d=>`<label class="chk"><span>${esc(stDestName(d))} — ${T('lv.destVert')}</span><input type="checkbox" data-lvdest="${d.id}" ${d.vert?'checked':''} ${busy?'disabled':''}></label>`).join('')}
    <div class="copt">${['fit','crop'].map(k=>`<button data-lvmode="${k}" class="${C.mode===k?'on':''}">${T('lv.mode_'+k)}</button>`).join('')}</div>
    ${C.mode==='crop'?`<div class="fld"><label>${T('lv.pos')} <span>${C.pos}</span></label><input type="range" min="0" max="100" value="${C.pos}" data-lvpos="1"></div>`:''}
    <div class="fld"><label>${T('common.quality')}</label><select data-lvq="1" ${busy?'disabled':''}>${Object.keys(LV_Q).map(k=>`<option value="${k}" ${C.q===k?'selected':''}>${LV_Q[k][0]} × ${LV_Q[k][1]}</option>`).join('')}</select></div>
    <p class="hint">${T('lv.hint')}</p>`;
}

/* ---------- (15) mode studio : aperçu (on prépare) et programme (en direct) ---------- */
const pgCv=document.createElement('canvas'),pgG=pgCv.getContext('2d');let pgFade=null;
const pgScene=()=>stData.scenes.find(s=>s.id===stData.prog)||stScene();
function pgDraw(t){
  if(pgCv.width!==st.w||pgCv.height!==st.h){pgCv.width=st.w;pgCv.height=st.h}
  const g=pgG,W=st.w,H=st.h;g.save();g.fillStyle='#000';g.fillRect(0,0,W,H);
  for(const it of pgScene().items)if(it.vis&&stOutOk(it,'live'))try{stDrawIt(g,it,t)}catch(e){}
  const F=pgFade;if(F){const p=(performance.now()-F.t0)/F.ms;if(p>=1)pgFade=null;else{const e=1-Math.pow(1-p,3);g.save();
    if(F.type==='slide')g.drawImage(F.cv,-e*W,0);else if(F.type==='zoom'){const k=1+e*.35;g.globalAlpha=1-p;g.translate(W/2,H/2);g.scale(k,k);g.drawImage(F.cv,-W/2,-H/2)}else if(F.type!=='cut'){g.globalAlpha=1-p;g.drawImage(F.cv,0,0)}g.restore()}}
  g.restore();
  const m=$('#psMini');if(m){const mg=m.getContext('2d');mg.drawImage(pgCv,0,0,m.width,m.height)}
}
{const sd=stDraw;stDraw=function(t){sd(t);if(stData&&stData.smode)pgDraw(t)}}
// les sorties (live, enregistrement) prennent le programme ; le live vertical aussi (lvFrame)
setInterval(()=>{for(const o of[O.live,O.rec])if(o&&o.kind!=='vert')o.src=typeof stOutSrc==='function'?stOutSrc(o):stData&&stData.smode?()=>pgCv:null},300);
function pgTake(){
  if(!stData.smode)return;const tr=stData.trans||{type:'fade',ms:350};
  if(tr.type!=='cut'){const c=document.createElement('canvas');c.width=pgCv.width;c.height=pgCv.height;c.getContext('2d').drawImage(pgCv,0,0);pgFade={cv:c,t0:performance.now(),ms:tr.ms||350,type:tr.type}}
  stData.prog=stData.cur;if(typeof stTimersStart==='function')stTimersStart(pgScene());stSave();stScenesUI();stCtlUI();
}
function pgSet(on){
  stData.smode=!!on;if(on)stData.prog=stData.cur;stSave();pgUI();stScenesUI();stCtlUI();
}
function pgUI(){
  const area=$('#stPrevArea');if(!area)return;let box=$('#psBox');
  if(!stData||!stData.smode){if(box)box.remove();area.classList.remove('ps-on');return}
  area.classList.add('ps-on');area.dataset.prev=T('ps.preview');
  if(!box){box=document.createElement('div');box.id='psBox';box.className='psbox';box.innerHTML=`<div class="pslab prog">${T('ps.program')}</div><canvas id="psMini" width="320" height="180"></canvas><button class="pri" data-psact="take">${ico('next',14)}${T('ps.take')}</button>`;area.appendChild(box)}
}
{const su=stScenesUI;stScenesUI=function(){su();if(!stData||!stData.smode)return;
  $$('#stScenes [data-sc]').forEach(r=>{if(+r.dataset.sc===stData.prog)r.classList.add('prog')})}}
{const cu=stCtlUI;stCtlUI=function(){cu();const box=$('#stCtl');if(!box||!stData)return;
  box.insertAdjacentHTML('beforeend',`<button class="sm ps${stData.smode?' on':''}" data-psact="mode" title="${esc(T('ps.tip'))}">${ico('studio2',14)}${T('ps.mode')}</button>`+(O.vert?`<div class="hint lvon">${ico('portrait',13)} ${T('lv.on')}</div>`:''))}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-psact]');if(!b)return;if(b.dataset.psact==='mode')pgSet(!stData.smode);else pgTake()});
// les raccourcis de scène (Ctrl+Maj+1…9) changent l'aperçu en mode studio ; Ctrl+Maj+Entrée fait la transition
let pgKey=false;
setInterval(()=>{const K=window.dedcutKeys;if(!K||!stData)return;const want=!!stData.smode&&typeof appMode!=='undefined'&&stOn();
  if(want!==pgKey){pgKey=want;(want?K.on('CommandOrControl+Shift+Enter',pgTake):K.off('CommandOrControl+Shift+Enter')).catch(()=>{})}},1000);

/* ---------- (13) télécommande sur le téléphone ---------- */
const RM={on:false,pin:'',url:'',unlisten:null,iv:0};
function rmState(){
  const L=(k)=>T(k),pads=typeof stSb==='function'?stSb().pads.map(p=>sbName(p)):[];
  return JSON.stringify({l:{live:L('live.go'),stop:L('live.stop'),rec:L('st.recStart'),recStop:L('st.recStop'),scenes:L('st.scenes'),actions:L('rm.actions'),mark:L('lx.hl.mark'),replay:T('st.rp.btn',{s:stRpSec()}),mic:L('rec.mic'),desk:L('st.desk'),sb:L('wg.sb.title'),counters:L('st.k.counter'),take:L('ps.take')},
    live:{on:!!(O.live&&O.live.on),el:O.live?O.live.el:0},rec:{on:!!(O.rec&&O.rec.on),el:O.rec?O.rec.el:0},
    scenes:stData.scenes.map(s=>({id:s.id,n:s.name})),cur:stData.smode?stData.cur:stData.cur,smode:!!stData.smode,mute:{mic:!!stData.mute.mic,desk:!!stData.mute.desk},
    pads,counters:(typeof wgItems==='function'?wgItems('counter'):[]).map(it=>({id:it.id,n:it.o.label||'',v:wgNum(it.o.val||0)}))});
}
function rmCmd(p){
  const c=p&&p.cmd,a=p&&p.arg;
  if(c==='live')O.live?stLiveStop():stLiveStart();
  else if(c==='rec')O.rec?stRecStop():stRecStart();
  else if(c==='scene'){const id=+a;if(stData.scenes.some(s=>s.id===id))stSwitch(id)}
  else if(c==='take')pgTake();
  else if(c==='mark'){if(typeof lxMark==='function')lxMark()}
  else if(c==='replay')stReplaySave();
  else if(c==='mute'&&(a==='mic'||a==='desk')){stData.mute[a]=!stData.mute[a];stGains();stMixerUI();stSave()}
  else if(c==='pad'&&typeof sbPlay==='function')sbPlay(+a);
  else if(c==='count'&&typeof wgCount==='function'){const[id,d]=String(a).split(':');const it=wgItems('counter').find(x=>x.id===+id);if(it)wgCount(+d,it)}
  if(window.dedcutRemote)dedcutRemote.state(rmState()).catch(()=>{});
}
async function rmStart(){
  const R=window.dedcutRemote;if(!R){toast(T('msg.onlyInApp'));return}
  const pin=String(Math.floor(100000+Math.random()*900000));
  try{const r=await R.start(pin);RM.on=true;RM.pin=pin;RM.url='http://'+r.ip+':'+r.port;
    RM.unlisten=await R.on(rmCmd);clearInterval(RM.iv);RM.iv=setInterval(()=>{if(RM.on)R.state(rmState()).catch(()=>{})},1000);R.state(rmState()).catch(()=>{})}
  catch(e){toast(T('rm.fail'))}
  cxRedraw();
}
async function rmStop(){const R=window.dedcutRemote;RM.on=false;clearInterval(RM.iv);try{RM.unlisten&&RM.unlisten()}catch(e){}RM.unlisten=null;if(R)await R.stop().catch(()=>{});cxRedraw()}
{const tp=stToolsPanel;stToolsPanel=function(){
  const h=tp();if(cxOpen.rm==null)cxOpen.rm=false;
  const body=RM.on?`<div class="rmbox"><div class="hint">${T('rm.open')}</div><div class="rmurl">${esc(RM.url)}</div><div class="hint">${T('rm.pin')}</div><div class="rmpin">${RM.pin}</div></div>
      <button data-rmact="stop">${ico('square',13)}${T('rm.stop')}</button><p class="hint">${T('rm.same')}</p>`
    :`<button class="pri" data-rmact="start">${ico('phone',14)}${T('rm.start')}</button><p class="hint">${T('rm.hint')}</p>`;
  return h+`<details class="cxsec" data-cxsec="rm"${cxOpen.rm?' open':''}><summary>${ico('phone',15)}<b>${T('rm.title')}</b>${RM.on?`<i class="cxon on">${T('cx.on')}</i>`:''}</summary>${body}</details>`}}
$('#stSide').addEventListener('click',e=>{const b=e.target.closest('[data-rmact]');if(b){b.dataset.rmact==='start'?rmStart():rmStop();return}
  const m=e.target.closest('[data-lvmode]');if(m){lvCfg().mode=m.dataset.lvmode;stSave();stSideUI();return}});
$('#stSide').addEventListener('input',e=>{const t=e.target;
  if(t.dataset.lvdest){const d=stData.dests.find(x=>x.id===+t.dataset.lvdest);if(d){d.vert=t.checked;stSave()}return}
  if(t.dataset.lvpos){lvCfg().pos=+t.value;const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value;stSave();return}
  if(t.dataset.lvq){lvCfg().q=t.value;stSave()}});
setTimeout(()=>{if(stData)pgUI()},0);
{const so=stOpen;stOpen=async function(){const r=await so.apply(this,arguments);pgUI();return r}}

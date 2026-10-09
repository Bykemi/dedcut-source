/* ============ DedCut 4.64 : moins de lag pendant le live et l'enregistrement ============
   - mode jeu : DedCut se fait discret (aperçu 15 images/s, effets de webcam plus rares, encodage partagé)
   - débit automatique : la qualité du live baisse quand la connexion ralentit, puis remonte
   - encodage partagé : l'enregistrement reprend les images déjà encodées pour le live (une seule fabrication de la vidéo)
   - test du PC et de la connexion : qualité conseillée, appliquée en un clic
   - alertes en mots simples : connexion lente, PC surchargé, scène trop lourde
   (l'aperçu limité à 30 images/s est dans 10b-studio.js, le fond de webcam allégé dans 10d-livepack.js) */
ICO.gauge='<path d="M4.5 17.5a8.5 8.5 0 1 1 15 0"/><path d="M12 13.5l4.5-4.5"/><circle cx="12" cy="13.5" r="1.3"/>';
ICO.wifi='<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>';
ICO.cpu='<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>';
ICO.warn='<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.3h.01"/>';
const pf={h:'',win:[],told:{},brToast:-1e9};
const pfGame=()=>!!(stData&&stData.game);
const pfQName=k=>T('live.q'+({'720:30':'720','720:60':'72060','1080:30':'1080','1080:60':'108060'}[k]||'1080'));
const pfLog=s=>{if(typeof lpL==='function')lpL(s)};

/* ---------- mode jeu ---------- */
function pfGameSet(on){if(!stData)return;stData.game=!!on;stSave();toast(T(on?'pf.gameOn':'pf.gameOff'));stCtlUI();if(stSide==='set')stSideUI()}
{const cu=stCtlUI;stCtlUI=function(){cu();const box=$('#stCtl');if(!box||!stData)return;const on=pfGame();
  box.insertAdjacentHTML('beforeend',`<button class="sm pfgame${on?' on':''}" data-ctl="game" aria-pressed="${on}" title="${esc(T('pf.gameTip'))}">${ico('gamepad',14)}${T('pf.game')}</button>`)}}
$('#stCtl').addEventListener('click',e=>{if(e.target.closest('[data-ctl="game"]'))pfGameSet(!pfGame())});

/* ---------- encodage partagé : l'enregistrement reprend les images encodées pour le live ---------- */
function pfShareFrom(){
  const L=O.live;if(!L||!L.on||L.stopping||L.kind!=='live'||!L.vcfg||!L.avcC||!L.asc)return null;
  if(!(stData.recShare||pfGame()))return null;
  if(typeof lqDelay!=='undefined'&&lqDelay>0)return null; // live en différé : il s'arrête en vidant sa mémoire, son encodeur ne peut pas continuer pour l'enregistrement
  if(typeof lbSelective==='function'&&lbSelective())return null; // des sources seulement dans le live ou seulement dans l'enregistrement : les images ne sont pas les mêmes
  return L;
}
function pfSharedRec(L){
  const R={kind:'rec',shared:L,kbps:L.kbps,on:false,paused:false,s0:0,pausedS:0,el:0,lastKey:-9,frames:0,dropped:0,congested:false,t0:Date.now(),needKey:true,vMeta:false,aMeta:false,lastV:-1,lastA:-1};
  Object.defineProperty(R,'rb',{get:()=>L.rb,set(){},configurable:true}); // replay : celui du live
  pfLog('enregistrement : encodage du live partagé');
  return R;
}
// temps du live → temps de l'enregistrement (µs) : on retire le début de l'enregistrement et ses pauses
const pfOff=(R,L)=>Math.round((R.s0-L.s0-(L.pausedS||0)+R.pausedS)/48*1000);
function pfRecV(R,L,ch){
  if(!R.on||R.stopping||!R.mux)return;
  if(R.paused){R.needKey=true;return}
  if(R.needKey){if(ch.type!=='key'||!L.avcC)return;R.needKey=false;R.k0=ch.timestamp-pfOff(R,L)}
  const ts=ch.timestamp-pfOff(R,L);if(ts<=R.lastV)return;R.lastV=ts;
  const b=new Uint8Array(ch.byteLength);ch.copyTo(b);
  try{R.mux.addVideoChunk(new EncodedVideoChunk({type:ch.type,timestamp:ts,duration:ch.duration||Math.round(1e6/st.fps),data:b}),
    R.vMeta?undefined:{decoderConfig:{codec:L.vcfg.codec,codedWidth:st.w,codedHeight:st.h,description:L.avcC}});R.vMeta=true;R.frames++}catch(e){}
}
function pfRecA(R,L,ch){
  if(!R.on||R.stopping||!R.mux||R.paused||!R.vMeta)return; // le son commence avec la première image complète
  const ts=ch.timestamp-pfOff(R,L);if(ts<R.k0||ts<=R.lastA)return;R.lastA=ts;
  const b=new Uint8Array(ch.byteLength);ch.copyTo(b);
  try{R.mux.addAudioChunk(new EncodedAudioChunk({type:'key',timestamp:ts,duration:ch.duration||21333,data:b}),
    R.aMeta?undefined:{decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:L.asc}});R.aMeta=true}catch(e){}
}
// connexion lente avec un enregistrement partagé : l'enregistrement garde toutes les images ; l'envoi saute les images
// intermédiaires et reprend sur une image complète (sinon l'image du live serait abîmée jusqu'à la suivante)
{const lv=stLiveV;stLiveV=function(L,ch,meta){
  const R=O.rec,sh=!!(R&&R.shared===L&&R.on);
  const skip=ch.type==='key'?sh&&L.congested:L.netSkip||sh&&L.congested;
  if(skip){ // l'envoi saute cette image (les réglages de l'image, eux, partent toujours)
    const dc=meta&&meta.decoderConfig&&meta.decoderConfig.description;if(dc){L.avcC=stDesc(dc);stPush(L,9,ch.timestamp,[0x17,0,0,0,0],L.avcC)}
    L.netSkip=true;L.dropped++;L.dropNet=(L.dropNet||0)+1;if(!L.congested||!sh)L.forceKey=true;
  }else{lv(L,ch,meta);if(ch.type==='key')L.netSkip=false}
  if(sh)pfRecV(R,L,ch)}}
{const la=stLiveA;stLiveA=function(L,ch,meta){la(L,ch,meta);const R=O.rec;if(R&&R.shared===L)pfRecA(R,L,ch)}}
// début (et reprise après une pause) : on demande tout de suite une image complète au lieu d'attendre la suivante
{const rs=stRecStart;stRecStart=async function(){await rs();const R=O.rec;if(R&&R.shared){R.shared.forceKey=true;stStatus()}}}
{const rp=stRecPause;stRecPause=function(){rp();const R=O.rec;if(R&&R.shared&&!R.paused){R.needKey=true;R.shared.forceKey=true}}}
// le live s'arrête, l'enregistrement continue : son encodeur reste, avec le débit de départ
function pfHubKeep(L){if(L.kbps0&&L.kbps<L.kbps0)pfSetKbps(L,L.kbps0);pfLog('live arrêté : l\'encodeur continue pour l\'enregistrement')}

/* ---------- débit automatique ---------- */
const pfAuto=()=>!stData||stData.autoBr!==false;
function pfSetKbps(o,kb){
  kb=Math.round(kb);if(!o.venc||o.venc.state!=='configured'||!o.vcfg||kb===o.kbps)return false;
  const c={...o.vcfg,bitrate:kb*1000};
  try{o.venc.configure(c)}catch(e){return false}
  o.vcfg=c;o.kbps=kb;o.forceKey=true;o.lastBr=performance.now();return true;
}
// ce que la connexion a réussi à envoyer, gardé pour le test du PC
function pfNet(kbps,ok){
  kbps=Math.round(kbps);if(!stData||!(kbps>0))return;const n=stData.net;
  if(ok&&n&&n.ok&&n.kbps>=kbps)return;if(!ok&&n&&!n.ok&&Math.abs(n.kbps-kbps)<kbps*.1&&Date.now()-n.at<6e5)return;
  stData.net={kbps,ok:!!ok,at:Date.now()};stSave();
}
function pfAdapt(o){
  if(!o||!o.on||o.stopping||o.drain||!o.dests||!o.vcfg)return;
  if(!o.kbps0)o.kbps0=o.kbps;
  const now=performance.now(),ds=o.dests.filter(d=>!d.reconn&&!d.dead);if(!ds.length)return;
  for(const d of ds){const dt=Math.max(.2,(now-(d.pfT||now-1000))/1000);d.pfRate=Math.max(0,(d.sent-(d.pfSent==null?d.sent:d.pfSent))*8/1000/dt);d.pfSent=d.sent;d.pfT=now}
  const back=Math.max(...ds.map(d=>(d.queued||0)+d.qBytes))*8/1000/Math.max(1,o.kbps); // secondes de vidéo qui attendent de partir
  const bad=o.congested||back>1.5;
  o.badN=bad?(o.badN||0)+1:0;o.goodN=bad||back>.4?0:(o.goodN||0)+1;
  if(!pfAuto())return;
  const rate=Math.min(...ds.map(d=>d.pfRate||0));
  if(o.badN>=2&&o.kbps>o.kbps0*.35+1&&now-(o.lastBr||0)>4000){
    // un peu sous ce qui passe vraiment, sans descendre sous 35 % du débit choisi
    const tgt=Math.max(o.kbps0*.35,Math.min(o.kbps*.75,rate>200?rate*.85:o.kbps*.75));
    if(pfSetKbps(o,tgt)){o.badN=0;if(rate>200)pfNet(rate,false);pfLog('débit automatique : '+o.kbps+' kb/s ('+Math.round(back*10)/10+' s en attente)');
      if(now-pf.brToast>60000){pf.brToast=now;pf.told.net=now;toast(T('pf.brDown',{kbps:o.kbps}))}stStatus()}
  }else if(o.goodN>=20&&o.kbps<o.kbps0&&now-(o.lastBr||0)>15000){
    const up=Math.min(o.kbps0,Math.round(o.kbps*1.15));
    if(pfSetKbps(o,up)){o.goodN=0;pfLog('débit automatique : '+up+' kb/s');if(up>=o.kbps0)toast(T('pf.brUp',{kbps:up}));stStatus()}
  }
  if(o.kind==='live'&&o.kbps>=o.kbps0&&o.goodN>=60)pfNet(o.kbps0,true);
}

/* ---------- alertes en mots simples ---------- */
function pfHealth(){
  if(st.hub&&st.hub.venc&&st.hub.venc.state==='closed'&&O.rec&&!O.rec.stopping){toast(T('live.encFail'));stRecStop()}
  const outs=[O.live,O.rec,O.vert,st.hub].filter(o=>o&&o.on&&o.venc);
  if(!outs.length){pf.win=[];if(pf.h){pf.h='';stStatus()}return}
  let dn=0,de=0;for(const o of new Set(outs)){dn+=(o.dropNet||0)-(o.pfDn||0);o.pfDn=o.dropNet||0;de+=(o.dropEnc||0)-(o.pfDe||0);o.pfDe=o.dropEnc||0}
  pf.win.push({dn,de,draw:typeof lbPerf!=='undefined'?lbPerf.ms:0});if(pf.win.length>5)pf.win.shift();
  const fps=st.fps||30,sDn=pf.win.reduce((a,w)=>a+w.dn,0),sDe=pf.win.reduce((a,w)=>a+w.de,0);
  const drawBad=pf.win.length>=5&&pf.win.every(w=>w.draw>1000/fps*.85);
  const h=sDe>fps*.5?'enc':drawBad?'draw':sDn>fps*.5?'net':'';
  if(h!==pf.h){pf.h=h;stStatus()}
  if(h&&performance.now()-(pf.told[h]||-1e9)>90000){pf.told[h]=performance.now();toast(pfTip(h));pfLog('alerte : '+h)}
}
const pfTip=h=>T(h==='net'?(pfAuto()?'pf.h.netAuto':'pf.h.netTip'):'pf.h.'+h+'Tip');
setInterval(()=>{if(!stData)return;pfAdapt(O.live);pfAdapt(O.vert);pfHealth()},1000);
{const ss=stStatus;stStatus=function(s){ss(s);const el=$('#stStatus');if(!el||!stData)return;
  const R=O.rec;if(R&&R.shared){const p=el.querySelector('.stpill.rec');if(p)p.insertAdjacentHTML('afterend',`<span class="lbperf">${T('pf.shared')}</span>`)}
  const L=O.live;if(L&&L.kbps0&&L.kbps<L.kbps0)el.insertAdjacentHTML('beforeend',`<span class="lbperf warn">${ico('wifi',12)}${L.kbps} kb/s</span>`);
  if(pf.h)el.insertAdjacentHTML('beforeend',`<span class="pfh" title="${esc(pfTip(pf.h))}">${ico('warn',12)}${T('pf.h.'+pf.h)}</span>`)}}

/* ---------- Réglages : débit automatique, encodage partagé, test du PC ---------- */
{const qh=stQualHTML;stQualHTML=function(busy){
  // juste sous le débit et l'encodeur (avant le délai, le replay… ajoutés par 10p-liveflow.js)
  const h=qh(busy),i=h.indexOf('<div id="lbEncSt"'),j=i<0?-1:h.indexOf('</div>',i)+6;
  const mine=`<label class="chk"><span>${T('pf.autoBr')}</span><input type="checkbox" data-pf="autoBr" ${pfAuto()?'checked':''}></label>
    <label class="chk"><span>${T('pf.share')}</span><input type="checkbox" data-pf="recShare" ${stData.recShare||pfGame()?'checked':''} ${pfGame()?'disabled':''}></label>
    <button class="sm" data-pfact="test">${ico('gauge',14)}${T('pf.test')}</button>`;
  return j>5?h.slice(0,j)+mine+h.slice(j):h+mine}}
$('#stSide').addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.pf||!stData)return;stData[t.dataset.pf]=t.checked;stSave()});
$('#stSide').addEventListener('click',e=>{if(e.target.closest('[data-pfact="test"]'))pfTestOpen()});

/* ---------- test du PC et de la connexion ---------- */
// combien d'images par seconde l'encodeur arrive à fabriquer dans cette qualité (image qui bouge, comme un vrai jeu)
async function pfBench(w,h,fps,kb,ms){
  const c=await stCodecs(w,h,fps,kb).catch(()=>null);if(!c)return{ok:false,fps:0};
  const cv=new OffscreenCanvas(w,h),g=cv.getContext('2d'),S={n:0,err:null};let i=0;
  const enc=new VideoEncoder({output:()=>{S.n++},error:e=>{S.err=e}});
  try{enc.configure(c)}catch(e){return{ok:false,fps:0}}
  const t0=performance.now();
  while(performance.now()-t0<ms&&!S.err){
    g.fillStyle='hsl('+(i*7%360)+' 55% 35%)';g.fillRect(0,0,w,h);g.fillStyle='#e5e7eb';
    for(let k=0;k<36;k++)g.fillRect((i*17+k*97)%w,(k*53+i*9)%h,w/14,h/14);
    const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps)});try{enc.encode(vf,{keyFrame:i%(fps*2)===0})}catch(e){S.err=e}vf.close();i++;
    while(enc.encodeQueueSize>3&&!S.err&&performance.now()-t0<ms+2000)await new Promise(r=>setTimeout(r,2));
  }
  try{await enc.flush()}catch(e){}
  const dt=(performance.now()-t0)/1000;try{enc.close()}catch(e){}
  return{ok:!S.err&&S.n>0,fps:Math.round(S.n/dt),hw:c.hardwareAcceleration||''};
}
// temps de dessin de la scène actuelle (ms par image, à la taille actuelle)
function pfDrawCost(){
  const ts=[];for(let i=0;i<24;i++){const a=performance.now();stDraw((performance.now()-st.t0)/1000);ts.push(performance.now()-a)}
  ts.sort((a,b)=>a-b);return ts.slice(2,-2).reduce((a,v)=>a+v,0)/(ts.length-4);
}
async function pfTestRun(step){
  const keys=['1080:60','1080:30','720:60','720:30'],v=stData.fmt==='v',res={rows:[],draw:0,net:stData.net||null};
  stApplyQ();await new Promise(r=>setTimeout(r,300));
  const draw=pfDrawCost(),px=st.w*st.h;res.draw=draw;
  let gpu=false;try{gpu=!!(await VideoEncoder.isConfigSupported({codec:'avc1.640028',width:1920,height:1080,bitrate:6e6,framerate:30,hardwareAcceleration:'prefer-hardware'})).supported}catch(e){}
  res.gpu=gpu;
  for(let i=0;i<keys.length;i++){
    const k=keys[i];let[w,h,fps,kb]=ST_Q[k];if(v)[w,h]=[h,w];
    step(i/keys.length);
    const b=await pfBench(w,h,fps,kb,1100);
    const dms=draw*Math.max(.35,w*h/px); // le dessin coûte à peu près selon le nombre de points
    const encOk=b.ok&&b.fps>=fps*1.25,drawOk=dms<1000/fps*.5;
    res.rows.push({k,fps,kb,enc:b.fps,encOk,dms,drawOk});
  }
  step(1);
  const n=res.net,lim=n&&!n.ok?n.kbps*.85:Infinity;
  const pc=res.rows.filter(r=>r.encOk&&r.drawOk);
  res.reco=(pc.find(r=>r.kb<=lim)||pc[pc.length-1]||null);
  if(res.reco&&res.reco.kb>lim)res.kbps=Math.max(1500,[2500,3500,4500,6000].filter(x=>x<=lim).pop()||2500);
  return res;
}
function pfTestOpen(){
  if($('#pfdlg'))return;
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='pfdlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box" role="dialog" aria-modal="true" aria-labelledby="pfT">
    <div class="dcq-h"><span class="dcq-ic">${ico('gauge',18)}</span><b id="pfT">${T('pf.t.title')}</b><button class="dcthumb-x" data-pfx title="${esc(T('common.close'))}">${ico('close',18)}</button></div>
    <p class="dcthumb-p" id="pfInfo">${T('pf.t.intro')}</p>
    <div class="dcthumb-bar" id="pfBarW" hidden><i id="pfBar"></i></div>
    <div class="pft" id="pfRes" hidden></div>
    <div class="dcq-b"><button class="dcq-no" data-pfx>${T('common.close')}</button><button class="dcq-ok" id="pfGo">${T('pf.t.run')}</button></div></div>`;
  document.body.appendChild(m);
  const prev=document.activeElement;let busy=false,res=null,closed=false;
  const end=()=>{closed=true;removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const key=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();e.stopPropagation();end()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  const live=()=>!!(O.live||O.rec||O.vert);
  const show=()=>{
    const ok=b=>b?`<i class="pfok">${ico('check',14)}</i>`:`<i class="pfko">${ico('warn',14)}</i>`;
    const n=res.net;
    $('#pfRes').innerHTML=`<div class="pft-h"><span></span><b>${T('pf.t.enc')}</b><b>${T('pf.t.draw')}</b></div>`+
      res.rows.map(r=>`<div class="pft-r${res.reco&&res.reco.k===r.k?' on':''}"><span>${esc(pfQName(r.k))}</span>
        <span>${ok(r.encOk)}${r.enc?T('pf.t.fps',{n:r.enc}):T('pf.t.heavy')}</span><span>${ok(r.drawOk)}${T('pf.t.drawMs',{ms:r.dms<1?'< 1':r.dms.toFixed(1)})}</span></div>`).join('')+
      `<div class="pft-n">${ico('cpu',14)}${T(res.gpu?'pf.t.gpu':'pf.t.cpu')}</div>
      <div class="pft-n">${ico('wifi',14)}<b>${T('pf.t.net')}</b>${!n?T('pf.t.netUnknown'):T(n.ok?'pf.t.netOk':'pf.t.netSlow',{kbps:n.kbps})}</div>
      <div class="pft-reco">${res.reco?T('pf.t.reco',{q:esc(pfQName(res.reco.k))+(res.kbps?' · '+res.kbps+' kb/s':'')})+`<small>${T('pf.t.why')}</small>`:T('pf.t.recoNone')}</div>`+
      (res.reco&&live()?`<div class="pft-n">${T('pf.t.busy')}</div>`:'');
    $('#pfRes').hidden=false;
    const go=$('#pfGo');go.textContent=res.reco?T('pf.t.apply'):T('pf.t.again');go.disabled=!!(res.reco&&live());go.dataset.mode=res.reco?'apply':'run';
  };
  const run=async()=>{
    if(live()){toast(T('pf.t.busy'));return}
    busy=true;$('#pfGo').disabled=true;$('#pfRes').hidden=true;$('#pfInfo').textContent=T('pf.t.running');$('#pfBarW').hidden=false;
    try{res=await pfTestRun(q=>{$('#pfBar').style.width=Math.round(q*100)+'%'})}catch(e){console.warn(e);res=null}
    busy=false;if(closed)return;$('#pfBarW').hidden=true;$('#pfGo').disabled=false;$('#pfInfo').textContent=T('pf.t.intro');
    if(res){pfLog('test du PC : '+res.rows.map(r=>r.k+' enc '+r.enc+' i/s, dessin '+r.dms.toFixed(1)+' ms').join(' ; ')+' → '+(res.reco?res.reco.k:'aucune'));show()}
  };
  const apply=()=>{
    if(!res||!res.reco)return;if(live()){toast(T('pf.t.busy'));return}
    stData.q=res.reco.k;if(res.kbps)stData.kbps=res.kbps;stApplyQ();if(typeof stFit==='function')stFit();stSave();
    toast(T('pf.t.applied',{q:pfQName(res.reco.k)+(res.kbps?' · '+res.kbps+' kb/s':'')}));if(stSide==='set')stSideUI();end();
  };
  m.addEventListener('click',e=>{
    if(e.target===m||e.target.closest('[data-pfx]')){if(!busy)end();return}
    if(e.target.closest('#pfGo')){$('#pfGo').dataset.mode==='apply'?apply():run()}
  });
  setTimeout(()=>{const b=$('#pfGo');if(b)b.focus()},30);
}

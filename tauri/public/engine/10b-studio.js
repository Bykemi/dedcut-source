/* ---------- Studio (v4.42) : espaces « Enregistrer » et « Live » façon OBS, à côté de l'espace « Montage » ----------
   Scènes faites de sources (écran / fenêtre, webcam, image, texte, fond, badge, bandeau) placées à la souris sur un grand
   aperçu, mixeur audio (son du PC + micro, vu-mètres), deux sorties indépendantes :
   - Live : H.264 + AAC (WebCodecs) → messages FLV → live.rs (RTMP / RTMPS) ; reconnexion automatique ;
   - Enregistrement : H.264 + AAC → MP4 fragmenté écrit au fur et à mesure dans Vidéos\DedCut (lisible même après une coupure),
     pause, moments forts (marqueurs), arrêt automatique, ajout à la timeline.
   L'horloge des sorties est celle du son (AudioWorklet) : elles continuent quand DedCut est réduit. */
const ST_Q={'720:30':[1280,720,30,3000],'720:60':[1280,720,60,4500],'1080:30':[1920,1080,30,4500],'1080:60':[1920,1080,60,6000]};
const LIVE_PF={
  youtube:{n:'YouTube',url:'rtmps://a.rtmps.youtube.com:443/live2',help:'https://studio.youtube.com/'},
  twitch:{n:'Twitch',url:'rtmp://live.twitch.tv/app',help:'https://dashboard.twitch.tv/settings/stream'},
  facebook:{n:'Facebook',url:'rtmps://live-api-s.facebook.com:443/rtmp/',help:'https://www.facebook.com/live/producer'},
  kick:{n:'Kick',url:'',help:'https://kick.com/dashboard/settings/stream'},
  tiktok:{n:'TikTok',url:'',help:'https://livecenter.tiktok.com/producer',vert:true}, // adresse + clé de TikTok LIVE Producer (nouvelles à chaque live), image en 9:16
  custom:{n:'',url:'',help:''}
};
const ST_KINDS={screen:'monitor',cam:'camera',image:'image',text:'text',color:'palette',badge:'badge',banner:'banner',chat:'chat',alerts:'bell',timer:'clock',video:'media'};
// nouvelles sortes de sources (fichiers suivants) : dessin, réglages, valeurs de départ
const ST_DRAW={},ST_PROPS={},ST_NEW={};
let appMode='edit',stData=null,stSelId=null,stSide='props';
// le studio (Enregistrer ou Live) est affiché ; l'espace Image et le Montage n'en font pas partie
const stOn=()=>appMode==='rec'||appMode==='live';
// Enregistrer et Live : seulement sur ordinateur (pas sur téléphone : pas de capture d'écran ni de raccourcis globaux)
const stPhone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const st={on:false,ac:null,cv:null,g:null,samples:0,nextV:0,fps:30,w:1280,h:720,t0:performance.now(),fade:null,scr:null,cams:{},imgs:{},raf:0,desk:null,mic:null,micStream:null};
const O={live:null,rec:null,vert:null}; // vert : 2e live en 9:16 (10l-pro.js)
let stUid=Date.now()%100000;
const stItem=(kind,o={},r={})=>Object.assign({id:++stUid,kind,vis:true,x:0,y:0,w:1,h:1,o},
  {screen:{},cam:{x:.775,y:.6,w:.2,h:.355},image:{x:.35,y:.3,w:.3,h:.4},text:{x:.08,y:.4,w:.84,h:.2},color:{},badge:{x:.018,y:.03,w:.17,h:.06},banner:{x:0,y:.915,w:1,h:.085},chat:{x:.02,y:.3,w:.27,h:.52},alerts:{x:.25,y:.1,w:.5,h:.26},timer:{x:.3,y:.6,w:.4,h:.18},video:{x:.3,y:.3,w:.4,h:.4}}[kind],r);
const ST_CHAT_DEF=()=>({size:3.2,max:6,life:30,bgp:55});
const ST_AL_DEF=()=>({dur:6,sound:true,vol:70});
const ST_TM_DEF=next=>({mode:'down',min:5,label:T('st.tm.soonLabel'),color:'#ffffff',next:next||0});
let stDestN=Date.now()%100000;
// réglages ajoutés au fil des versions (complète un studio déjà enregistré)
function stFill(d){
  d.vol=Object.assign({desk:100,mic:100,music:25},d.vol);d.mute=Object.assign({desk:false,mic:false,music:false},d.mute);
  d.mus=Object.assign({cat:'all',src:'all',duck:true},d.mus);d.micfx=Object.assign({gate:false,thr:-50,comp:false,ns:true},d.micfx);
  d.trans=Object.assign({type:'fade',ms:350},d.trans);
  if(!Array.isArray(d.dests)||!d.dests.length){const l=d.live||{};d.dests=[{id:1,pf:l.pf||'youtube',url:l.url!=null?l.url:LIVE_PF.youtube.url,key:l.key||'',on:true}];if(d.remember==null)d.remember=l.remember!==false}
  for(const x of d.dests)stDestN=Math.max(stDestN,x.id);if(d.remember==null)d.remember=true;
  return d;
}
function stDefault(){
  const tx=k=>stItem('text',{text:T(k),size:9,color:'#ffffff'});
  return stFill({v:3,q:'1080:30',cur:1,mic:'default',rec:{limit:0,toTl:true},
    scenes:[
      {id:1,name:T('st.sc.game'),items:[stItem('color',{c1:'#0b0b14',c2:'#1d1236'}),stItem('screen'),stItem('cam',{shape:'round'}),stItem('badge'),stItem('banner',{text:T('st.bannerDef')},{vis:false}),stItem('chat',ST_CHAT_DEF()),stItem('alerts',ST_AL_DEF())]},
      {id:2,name:T('st.sc.cam'),items:[stItem('color',{c1:'#111118',c2:'#1d1236'}),stItem('cam',{shape:'rect'},{x:0,y:0,w:1,h:1}),stItem('badge'),stItem('chat',ST_CHAT_DEF()),stItem('alerts',ST_AL_DEF())]},
      {id:3,name:T('st.sc.soon'),items:[stItem('color',{c1:'#7c3aed',c2:'#2563eb',anim:true}),Object.assign(tx('live.sc.soonBig'),{y:.22}),stItem('timer',ST_TM_DEF(1)),stItem('chat',ST_CHAT_DEF(),{x:.68,y:.45,w:.3,h:.5})]},
      {id:4,name:T('st.sc.brb'),items:[stItem('color',{c1:'#f97316',c2:'#db2777',anim:true}),tx('live.sc.brbBig'),stItem('chat',ST_CHAT_DEF(),{x:.68,y:.45,w:.3,h:.5})]},
      {id:5,name:T('st.sc.end'),items:[stItem('color',{c1:'#0d9488',c2:'#7c3aed',anim:true}),tx('live.sc.endBig')]}
    ]});
}
function stLoad(){
  try{stData=JSON.parse(localStorage.getItem('dedcut-studio')||'null')}catch(e){stData=null}
  if(!stData||!Array.isArray(stData.scenes)||!stData.scenes.length)stData=stDefault();
  for(const s of stData.scenes)for(const it of s.items)stUid=Math.max(stUid,it.id);
  if((stData.v||1)<2){const s=stData.scenes[0];if(s&&!s.items.some(i=>i.kind==='chat'))s.items.push(stItem('chat',ST_CHAT_DEF()));stData.v=2}
  if(stData.v<3){const s=stData.scenes[0];if(s&&!s.items.some(i=>i.kind==='alerts'))s.items.push(stItem('alerts',ST_AL_DEF()));const s3=stData.scenes.find(x=>x.id===3);if(s3&&!s3.items.some(i=>i.kind==='timer'))s3.items.push(stItem('timer',ST_TM_DEF(1)));stData.v=3}
  stFill(stData);
}
let stSaveT=0;
function stSave(){clearTimeout(stSaveT);stSaveT=setTimeout(()=>{try{const d=JSON.parse(JSON.stringify(stData));delete d.live;if(!d.remember)d.dests.forEach(x=>{x.key='';delete x.ekey});else if(typeof stKeyOut==='function')d.dests.forEach(stKeyOut);localStorage.setItem('dedcut-studio',JSON.stringify(d))}catch(e){}},300)}
const stScene=()=>stData.scenes.find(s=>s.id===stData.cur)||stData.scenes[0];
const stSel=()=>stScene().items.find(i=>i.id===stSelId)||null;

/* ---------- espaces : Montage / Enregistrer / Live ---------- */
function setMode(m){
  if(!['edit','rec','live','image','music'].includes(m)||stPhone&&m!=='edit')m='edit';
  appMode=m;const studio=m==='rec'||m==='live';
  $('#app').classList.toggle('studio',studio);$('#studio').hidden=!studio;
  // espace Image (src/image) : affiché à la place du montage, chargé à la première ouverture
  $('#app').classList.toggle('imgmode',m==='image');const ia=document.getElementById('imgApp');if(ia)ia.hidden=m!=='image';
  if(m==='image'){if(typeof pause==='function')pause();window.dispatchEvent(new Event('dedcut-image-open'))}
  // espace Musique (src/music) : même principe
  $('#app').classList.toggle('mumode',m==='music');const ma=document.getElementById('muApp');if(ma)ma.hidden=m!=='music';
  if(m==='music'){if(typeof pause==='function')pause();window.dispatchEvent(new Event('dedcut-music-open'))}
  $$('#modeBar [data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  if(studio){if(typeof pause==='function')pause();stOpen();}else if(stData)stIdle();
}
function stEnsure(){
  if(!stData)stLoad();
  if(!st.cv){st.cv=$('#stCv');st.g=st.cv.getContext('2d');new ResizeObserver(stFit).observe($('#stPrevArea'))}
}
async function stOpen(){
  stEnsure();stApplyQ();await stAllowFiles();await stAudio();if(!stOn()&&!O.live&&!O.rec)return;twBoot();fbBoot();stCamsSync();if(stData.mic&&!st.micStream)stMicSet(stData.mic);stDevices();stRender();stFit();stVideoSync(false);
  if(!st.raf)stLoop();
}
function stIdle(){ // de retour au montage : si rien ne tourne, on éteint webcams et micro (l'écran partagé reste choisi)
  if(O.live||O.rec)return;
  cancelAnimationFrame(st.raf);st.raf=0;stVideoSync(false);
  for(const k of Object.keys(st.cams)){st.cams[k].close&&st.cams[k].close();delete st.cams[k]}
  if(st.mic&&st.mic.src){try{st.mic.src.disconnect()}catch(e){}st.mic.src=null}
  stMicTok++;if(st.micStream){st.micStream.getTracks().forEach(t=>t.stop());st.micStream=null}
  // le moteur de son du studio se met en pause (processeur, et un flux audio ouvert peut empêcher la veille de Windows) ; stAudio le relance
  if(st.ac&&st.ac.state==='running'&&!(typeof stMus!=='undefined'&&(stMus.on||stMus.loading)))st.ac.suspend().catch(()=>{});
}
// sources vivantes pour une sortie lancée depuis n'importe quel espace (raccourci Ctrl+Maj+R depuis le Montage)
function stWake(){stCamsSync();if(stData.mic&&!st.micStream)stMicSet(stData.mic)}
function stApplyQ(){let[w,h,fps]=ST_Q[stData.q]||ST_Q['1080:30'];if(stData.fmt==='v')[w,h]=[h,w]; // studio vertical 9:16 (10t-vertical.js)
  if(O.live||O.rec)return;st.w=w;st.h=h;st.fps=fps;if(st.cv.width!==w){st.cv.width=w;st.cv.height=h}}
function stFit(){
  const a=$('#stPrevArea'),wr=$('#stWrap');if(!a||!wr)return;const r=a.getBoundingClientRect(),ar=st.w/st.h,pad=16;
  let w=r.width-pad,h=w/ar;if(h>r.height-pad){h=r.height-pad;w=h*ar}
  wr.style.width=Math.max(50,w)+'px';wr.style.height=Math.max(28,h)+'px';stSelBox();
}

/* ---------- sources : écran, webcams, images ---------- */
function stSrc(stream){
  const tr=stream.getVideoTracks()[0],S={f:null,stop:false,stream};
  if(window.MediaStreamTrackProcessor){
    const rd=new MediaStreamTrackProcessor({track:tr}).readable.getReader();S.rd=rd;
    (async()=>{for(;;){let r;try{r=await rd.read()}catch(e){break}if(r.done)break;if(S.stop){r.value.close();break}if(S.f)S.f.close();S.f=r.value}})();
  }else{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.srcObject=stream;v.play().catch(()=>{});S.v=v}
  S.img=()=>S.v?(S.v.readyState>=2?S.v:null):S.f;
  S.close=()=>{S.stop=true;try{S.rd&&S.rd.cancel()}catch(e){}if(S.f){S.f.close();S.f=null}if(S.v)S.v.srcObject=null;stream.getTracks().forEach(t=>t.stop())};
  return S;
}
async function stCaptureScreen(){
  try{
    const d=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:60}},audio:true});
    if(st.scr)st.scr.close();st.scr=stSrc(d);
    d.getVideoTracks()[0].addEventListener('ended',()=>{if(st.scr&&st.scr.stream===d){st.scr.close();st.scr=null;stDeskAudio(null);stRender()}});
    stDeskAudio(d.getAudioTracks().length?new MediaStream(d.getAudioTracks()):null);stRender();
  }catch(e){toast(T('rec.captureFailed'))}
}
function stCamKey(it){return it.o.dev||''}
async function stCamsSync(){ // webcams des scènes : allumées tant que le studio est ouvert
  const need=new Set();for(const s of stData.scenes)for(const it of s.items)if(it.kind==='cam')need.add(stCamKey(it));
  for(const k of Object.keys(st.cams))if(!need.has(k)){st.cams[k].close&&st.cams[k].close();delete st.cams[k]}
  for(const k of need){if(st.cams[k])continue;st.cams[k]={pending:true};
    const it=stData.scenes.flatMap(x=>x.items).find(i=>i.kind==='cam'&&stCamKey(i)===k),res=+(it&&it.o.res)||720,fps=+(it&&it.o.fps)||30;
    try{const s=await navigator.mediaDevices.getUserMedia({video:Object.assign({width:{ideal:Math.round(res*16/9)},height:{ideal:res},frameRate:{ideal:fps}},k?{deviceId:{exact:k}}:{})});
      const S=stSrc(s);S.res=res;S.fps=fps;st.cams[k]=S;
      s.getVideoTracks()[0].addEventListener('ended',()=>{if(st.cams[k]===S){S.close();st.cams[k]={err:true,lost:true};stRender()}})}
    catch(e){st.cams[k]={err:true}}}
}
function stImg(path){
  if(!path)return null;let im=st.imgs[path];
  if(!im){im=new Image();im.crossOrigin='anonymous';im.src=FS?FS.fileUrl(path):path;st.imgs[path]=im}
  return im.complete&&im.naturalWidth?im:null;
}

/* ---------- son : mixeur (vu-mètres) + horloge des sorties ---------- */
const ST_TAP=`class T extends AudioWorkletProcessor{constructor(){super();this.n=0;this.l=new Float32Array(512);this.r=new Float32Array(512)}
process(i){const c=i[0]||[],a=c[0],b=c[1]||c[0];for(let k=0;k<128;k++){this.l[this.n+k]=a?a[k]:0;this.r[this.n+k]=b?b[k]:0}this.n+=128;
if(this.n>=512){this.port.postMessage({l:this.l,r:this.r},[this.l.buffer,this.r.buffer]);this.l=new Float32Array(512);this.r=new Float32Array(512);this.n=0}return true}}
registerProcessor('dc-st-tap',T);`;
async function stAudio(){
  if(st.ac){if(st.ac.state==='suspended')st.ac.resume().catch(()=>{});return}
  const ac=new AudioContext({sampleRate:48000});st.ac=ac;st.bus=ac.createGain();
  const mk=k=>{const g=ac.createGain(),an=ac.createAnalyser();an.fftSize=512;g.connect(an);g.connect(st.bus);return{g,an,src:null}};
  st.desk=mk('desk');st.mic=mk('mic');st.music=mk('music');stGains();
  const keep=ac.createConstantSource();keep.offset.value=0;keep.connect(st.bus);keep.start();
  const url=URL.createObjectURL(new Blob([ST_TAP],{type:'application/javascript'}));
  try{await ac.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
  st.tap=new AudioWorkletNode(ac,'dc-st-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
  const z=ac.createGain();z.gain.value=0;st.bus.connect(st.tap);st.tap.connect(z);z.connect(ac.destination);
  st.tap.port.onmessage=e=>stTick(e.data.l,e.data.r);st.on=true;
  ac.resume().catch(()=>{});
  try{await stDspInit()}catch(e){}
}
function stGains(){if(!st.desk)return;for(const k of['desk','mic','music'])if(st[k])st[k].g.gain.value=stData.mute[k]?0:stData.vol[k]/100}
function stDeskAudio(stream){
  if(!st.ac)return;if(st.desk.src){try{st.desk.src.disconnect()}catch(e){}st.desk.src=null}
  if(stream){st.desk.src=st.ac.createMediaStreamSource(stream);st.desk.src.connect(st.desk.g)}
  stMixerUI();
}
// numéro de la dernière demande de micro : une demande dépassée (on a quitté le studio, ou une autre demande est partie
// entre-temps) referme son flux au lieu de le garder — sinon le micro restait ouvert pour rien, même dans le Montage
let stMicTok=0;
async function stMicSet(id){
  const tok=++stMicTok;
  stData.mic=id;stSave();if(!st.ac)return;
  if(st.mic.src){try{st.mic.src.disconnect()}catch(e){}st.mic.src=null}
  if(st.micStream){st.micStream.getTracks().forEach(t=>t.stop());st.micStream=null}
  if(id){try{const s=await navigator.mediaDevices.getUserMedia({audio:Object.assign({echoCancellation:true,noiseSuppression:stData.micfx.ns!==false,autoGainControl:true},id==='default'?{}:{deviceId:{exact:id}})});
    if(tok!==stMicTok){s.getTracks().forEach(t=>t.stop());return}
    st.micStream=s;st.mic.src=st.ac.createMediaStreamSource(st.micStream);st.mic.src.connect(st.gate||st.mic.g)}catch(e){toast(T('rec.micUnavailable'))}}
  stMixerUI();
}
async function stDevices(){
  try{if(!loadMics.ok){const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());loadMics.ok=true}}catch(e){}
  st.devs=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);stMixerUI();
}

/* ---------- dessin du programme ---------- */
// recadrage (en %) de la source en cours de dessin : réglages cl / cr / ct / cb (10m-livebase.js)
function stCropR(IW,IH){const it=st.curIt,o=it&&it.o;const l=o?+o.cl||0:0,r=o?+o.cr||0:0,t=o?+o.ct||0:0,b=o?+o.cb||0:0;
  if(!(l||r||t||b))return[0,0,IW,IH];return[IW*l/100,IH*t/100,Math.max(1,IW*(100-l-r)/100),Math.max(1,IH*(100-t-b)/100)]}
const stDim=im=>[im.displayWidth||im.videoWidth||im.naturalWidth||im.width||1,im.displayHeight||im.videoHeight||im.naturalHeight||im.height||1];
function stCover(g,im,x,y,w,h,mirror){
  const[IW,IH]=stDim(im),[cx,cy,iw,ih]=stCropR(IW,IH),s=Math.max(w/iw,h/ih),sw=w/s,sh=h/s,sx=cx+(iw-sw)/2,sy=cy+(ih-sh)/2;
  if(mirror){g.save();g.translate(x+w,y);g.scale(-1,1);g.drawImage(im,sx,sy,sw,sh,0,0,w,h);g.restore()}else g.drawImage(im,sx,sy,sw,sh,x,y,w,h);
}
function stContain(g,im,x,y,w,h){const[IW,IH]=stDim(im),[cx,cy,iw,ih]=stCropR(IW,IH),s=Math.min(w/iw,h/ih);g.drawImage(im,cx,cy,iw,ih,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s)}
// une source dans une composition : sortie (live / enregistrement / les deux), couleurs, opacité, recadrage
const stOutOk=(it,w)=>!it.o.out||it.o.out==='both'||it.o.out===w;
const stItFilter=o=>{const b=o.cbr==null?100:+o.cbr,c=o.cco==null?100:+o.cco,s=o.csa==null?100:+o.csa;return b===100&&c===100&&s===100?'':'brightness('+b+'%) contrast('+c+'%) saturate('+s+'%)'};
function stDrawIt(g,it,t){
  const o=it.o,f=stItFilter(o),a=o.opa==null?1:+o.opa/100;if(a<=0)return;st.curIt=it;
  try{if(f||a<1){g.save();if(f)g.filter=f;if(a<1)g.globalAlpha*=a;try{stDrawItem(g,it,t)}finally{g.restore()}}else stDrawItem(g,it,t)}finally{st.curIt=null}
}
function stHolder(g,x,y,w,h,txt){
  g.save();g.fillStyle='rgba(255,255,255,.04)';g.fillRect(x,y,w,h);g.setLineDash([12,10]);g.lineWidth=3;g.strokeStyle='rgba(255,255,255,.35)';g.strokeRect(x+2,y+2,w-4,h-4);
  g.fillStyle='rgba(255,255,255,.75)';g.textAlign='center';g.textBaseline='middle';g.font='600 '+Math.max(12,Math.min(h*.09,st.h*.04))+'px Bahnschrift, "Segoe UI", sans-serif';g.fillText(txt,x+w/2,y+h/2);g.restore();
}
const stFont=(px,w=700)=>w+' '+Math.round(px)+'px Bahnschrift, "Segoe UI", sans-serif';
function stDrawItem(g,it,t){
  const W=st.w,H=st.h,x=it.x*W,y=it.y*H,w=it.w*W,h=it.h*H,o=it.o,u=W/1280;
  switch(it.kind){
    case'color':{const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,o.c1||'#111');gr.addColorStop(1,o.c2||o.c1||'#222');g.fillStyle=gr;g.fillRect(x,y,w,h);
      if(o.anim){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();for(let i=0;i<6;i++){const a=t*.15+i*1.7;g.fillStyle='rgba(255,255,255,'+(.05+.03*Math.sin(a*2))+')';g.beginPath();g.arc(x+w*(.5+.42*Math.sin(a)),y+h*(.5+.38*Math.cos(a*1.3)),h*(.12+.05*i),0,Math.PI*2);g.fill()}g.restore()}break}
    case'screen':{const im=st.scr&&st.scr.img();if(im)(o.cover?stCover(g,im,x,y,w,h):stContain(g,im,x,y,w,h));else if(!st.scr)stHolder(g,x,y,w,h,T('st.pickScreen'));break}
    case'cam':{const c=st.cams[stCamKey(it)],im=c&&c.img&&c.img();g.save();g.beginPath();
      if(o.shape==='round'){const r=Math.min(w,h)/2;g.arc(x+w/2,y+h/2,r,0,Math.PI*2)}else g.roundRect(x,y,w,h,o.shape==='rounded'?Math.min(w,h)*.12:0);
      const cut=o.bgfx==='remove'||o.bgfx==='green';if(!cut){g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=o.shape==='rect'&&it.w>=.99?0:18*u;g.fillStyle='#000';g.fill();g.shadowColor='transparent'}g.clip();
      if(im){const src=typeof stCamCrop==='function'?stCamCrop(it,im):im,fl=typeof stCamFilt==='function'?stCamFilt(o):'';if(fl)g.filter=fl; // recadrage et couleurs (10j)
        const fx=o.bgfx&&o.bgfx!=='none'?stCamFx(it,src,w,h):null;if(fx)g.drawImage(fx,x,y,w,h);else if(!cut||o.bgfx==='remove'&&!personSegM)stCover(g,src,x,y,w,h,o.mirror);g.filter='none'}else{g.fillStyle='#1f2937';g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.6)';g.textAlign='center';g.textBaseline='middle';const k=Math.min(w,h)*.3/24;g.save();g.translate(x+w/2-12*k,y+h/2-12*k);g.scale(k,k);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.8;g.lineJoin='round';g.stroke(new Path2D('M4 8h3l2-3h6l2 3h3v11H4z'));g.beginPath();g.arc(12,13,3.5,0,Math.PI*2);g.stroke();g.restore()}
      g.restore();if(o.shape==='round'&&o.border!==false){g.lineWidth=4*u;g.strokeStyle='#fff';g.beginPath();g.arc(x+w/2,y+h/2,Math.min(w,h)/2-2*u,0,Math.PI*2);g.stroke()}break}
    case'image':{const im=stImg(o.path);if(im)stContain(g,im,x,y,w,h);else stHolder(g,x,y,w,h,T('st.pickImage'));break}
    case'text':{const px=(o.size||8)*H/100;g.save();g.font=stFont(px);g.textAlign='center';g.textBaseline='middle';const s=String(o.text||'');let tw=g.measureText(s).width,k=tw>w?w/tw:1;
      g.translate(x+w/2,y+h/2);g.scale(k,k);if(o.bg){const bw=tw+px*.8,bh=px*1.5;g.fillStyle=o.bg;g.beginPath();g.roundRect(-bw/2,-bh/2,bw,bh,px*.25);g.fill()}
      g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=px*.25;g.fillStyle=o.color||'#fff';g.fillText(s,0,px*.04);g.restore();break}
    case'badge':{const lv=O.live&&O.live.on,rc=O.rec&&O.rec.on,lab=lv?'LIVE  '+recClock(O.live.el||0):rc?'REC  '+recClock(O.rec.el||0):'LIVE';
      g.save();const bh=h,px=bh*.55;g.font=stFont(px);const bw=Math.min(w,g.measureText(lab).width+bh*1.35);g.fillStyle='rgba(0,0,0,.6)';g.beginPath();g.roundRect(x,y,bw,bh,bh/2);g.fill();
      g.fillStyle=rc&&!lv?'#f43f5e':'#ef4444';g.globalAlpha=.55+.45*Math.abs(Math.sin(t*2.5));g.beginPath();g.arc(x+bh*.5,y+bh/2,bh*.19,0,Math.PI*2);g.fill();g.globalAlpha=1;
      g.fillStyle='#fff';g.textAlign='left';g.textBaseline='middle';g.fillText(lab,x+bh*.85,y+bh/2+bh*.03);g.restore();break}
    case'chat':stChatDraw(g,it,x,y,w,h);break;
    case'alerts':stAlertDraw(g,it,x,y,w,h);break;
    case'timer':stTimerDraw(g,it,x,y,w,h);break;
    case'video':stVideoDraw(g,it,x,y,w,h);break;
    case'banner':{g.save();g.fillStyle='rgba(8,8,16,.72)';g.fillRect(x,y,w,h);g.fillStyle=o.color||'#8b5cf6';g.fillRect(x,y,Math.max(4,6*u),h);
      g.font=stFont(h*.42,600);g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff';const s=String(o.text||''),tw=g.measureText(s).width,room=w-48*u;
      g.beginPath();g.rect(x+16*u,y,w-16*u,h);g.clip();
      if(tw<=room)g.fillText(s,x+24*u,y+h/2);else{const sp=tw+w*.3,xx=x+24*u+room-((t*90*u)%sp);g.fillText(s,xx,y+h/2);g.fillText(s,xx+sp,y+h/2)}g.restore();break}
    default:if(ST_DRAW[it.kind])ST_DRAW[it.kind](g,it,x,y,w,h,t);
  }
}
function stDraw(t){
  const g=st.g,W=st.w,H=st.h;stAlertTick(performance.now());g.save();g.fillStyle='#000';g.fillRect(0,0,W,H);
  for(const it of stScene().items)if(it.vis&&stOutOk(it,'live'))try{stDrawIt(g,it,t)}catch(e){}
  // transition entre scènes : fondu, glissement ou zoom de l'ancienne image
  const F=st.fade;if(F){const p=(performance.now()-F.t0)/F.ms;
    if(p>=1)st.fade=null;else{const e=1-Math.pow(1-p,3);g.save();
      if(F.type==='slide'){g.drawImage(F.cv,-e*W,0)}
      else if(F.type==='zoom'){const k=1+e*.35;g.globalAlpha=1-p;g.translate(W/2,H/2);g.scale(k,k);g.drawImage(F.cv,-W/2,-H/2)}
      else{g.globalAlpha=1-p;g.drawImage(F.cv,0,0)}g.restore()}}
  g.restore();
}
function stLoop(){
  st.raf=requestAnimationFrame(stLoop);
  // aperçu : 30 images/s au plus (15 en mode jeu), pas la fréquence de l'écran (60, 144 Hz…) : le jeu garde la carte graphique
  const now=performance.now(),fps=stData&&stData.game?15:30;if(now-(st.lastPv||0)<1000/fps-4)return;st.lastPv=now;
  if(!O.live&&!O.rec&&!O.vert&&stOn())stDraw((now-st.t0)/1000);
  if(stOn())stMeters();
}
function stMeters(){
  for(const k of['desk','mic','music']){const el=$('#stMx-'+k+' .mxm i');if(!el||!st[k])continue;const an=st[k].an,b=new Float32Array(an.fftSize);an.getFloatTimeDomainData(b);
    let m=0;for(const v of b)m=Math.max(m,Math.abs(v));const db=m>0?20*Math.log10(m):-90;el.style.width=Math.max(0,Math.min(100,(db+60)/60*100))+'%';el.classList.toggle('hot',db>-3)}
}

/* ---------- sorties : horloge du son → image + son encodés ---------- */
// débit du live : celui choisi dans les Réglages, sinon celui de la qualité
const stKbps=()=>+stData.kbps>0?+stData.kbps:(ST_Q[stData.q]||ST_Q['1080:30'])[3];
async function stCodecs(w,h,fps,kbps){
  const lv=h>=1080?(fps>30?'2a':'28'):(fps>30?'20':'1f'),hw=stData.enc==='hw'?'prefer-hardware':stData.enc==='sw'?'prefer-software':null;
  for(const codec of['avc1.6400'+lv,'avc1.4d00'+lv,'avc1.42e0'+lv])for(const mode of['constant',null])for(const acc of hw?[hw,null]:[null]){
    const c={codec,width:w,height:h,bitrate:kbps*1000,framerate:fps,latencyMode:'realtime',avc:{format:'avc'}};if(mode)c.bitrateMode=mode;if(acc)c.hardwareAcceleration=acc;
    if((await VideoEncoder.isConfigSupported(c).catch(()=>({}))).supported)return c;
  }
  return null;
}
function stTick(l,r){
  const outs=[O.live,O.rec,O.vert,st.hub!==O.live?st.hub:null].filter(o=>o&&o.on&&!o.paused&&!o.shared),n=l.length; // o.shared : enregistrement qui réutilise l'encodage du live (10u-perf.js)
  if(outs.length){
    const buf=new Float32Array(n*2);buf.set(l,0);buf.set(r,n);
    for(const o of outs){if(o.aenc.state!=='configured')continue;const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round((st.samples-o.s0-o.pausedS)/48*1000),data:buf});o.aenc.encode(ad);ad.close()}
  }
  st.samples+=n;
  for(const o of[O.live,O.rec,O.vert])if(o&&o.on){if(o.paused)o.pausedS+=n;o.el=(st.samples-o.s0-o.pausedS)/48000}
  if(!O.live&&!O.rec&&!O.vert){st.nextV=st.samples;return}
  while(st.samples>=st.nextV){
    const tv=st.nextV;st.nextV+=48000/st.fps;stDraw((performance.now()-st.t0)/1000);
    let base=null;
    for(const o of outs){
      if(o.venc.state!=='configured')continue;
      if(o.venc.encodeQueueSize>3){o.dropped++;o.dropEnc=(o.dropEnc||0)+1;continue}
      if(o.congested&&!o.forceKey&&!(O.rec&&O.rec.shared===o&&O.rec.on)){o.dropped++;o.dropNet=(o.dropNet||0)+1;continue} // enregistrement partagé : on encode tout, seul l'envoi saute des images (10u-perf.js)
      const t=(tv-o.s0-o.pausedS)/48000;if(t<0)continue;
      const src=o.src?o.src():(base=base||new VideoFrame(st.cv,{timestamp:0})); // o.src : image propre à la sortie (programme du mode studio, live vertical)
      const key=o.forceKey||t-o.lastKey>=1.999,vf=new VideoFrame(src,{timestamp:Math.round(t*1e6)});
      o.venc.encode(vf,{keyFrame:key});vf.close();if(key){o.lastKey=t;o.forceKey=false}o.frames++;
    }
    if(base)base.close();
  }
  if(O.live&&O.live.on)stFlush(O.live);
  if(O.vert&&O.vert.on)stFlush(O.vert);
  if(O.rec&&O.rec.on&&stData.rec.limit&&O.rec.el>=stData.rec.limit&&!O.rec.stopping){toast(T('rec.autoStopped',{time:recClock(O.rec.el)}));stRecStop()}
}
async function stOutput(kind,kbps,onV,onA){
  const vcfg=await stCodecs(st.w,st.h,st.fps,kbps),acfg={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:kind==='rec'?192000:160000};
  if(!vcfg||!(await AudioEncoder.isConfigSupported(acfg).catch(()=>({}))).supported){toast(T('live.noEncoder'));return null}
  const o={kind,kbps,vcfg,on:false,paused:false,s0:0,pausedS:0,el:0,lastKey:-9,forceKey:true,frames:0,dropped:0,congested:false,t0:Date.now()};
  const bad=()=>{if(O[kind]===o){toast(T('live.encFail'));kind==='live'?stLiveStop():stRecStop()}};
  o.venc=new VideoEncoder({output:(c,m)=>{stRbV(o,c,m);onV(o,c,m)},error:bad});o.venc.configure(vcfg);
  o.aenc=new AudioEncoder({output:(c,m)=>{stRbA(o,c,m);onA(o,c,m)},error:bad});o.aenc.configure(acfg);
  return o;
}
const stDesc=d=>d?new Uint8Array(d instanceof ArrayBuffer?d:d.buffer?new Uint8Array(d.buffer,d.byteOffset,d.byteLength):d):null;
async function stOutStop(o){
  o.on=false;if(!o.venc)return; // enregistrement sans encodeur à lui (encodage du live partagé)
  try{if(o.venc.state==='configured')await o.venc.flush()}catch(e){}try{if(o.aenc.state==='configured')await o.aenc.flush()}catch(e){}
  try{o.venc.close()}catch(e){}try{o.aenc.close()}catch(e){}
}

/* ---------- sortie Live (RTMP) ---------- */
// un message FLV ; il part vers chaque destination (sauf celles en reconnexion)
function stMsg(typ,us,head,data){const ms=Math.max(0,Math.round(us/1000)),n=head.length+data.length,b=new Uint8Array(9+n),v=new DataView(b.buffer);b[0]=typ;v.setUint32(1,ms);v.setUint32(5,n);b.set(head,9);b.set(data,9+head.length);return b}
function stPushTo(d,b){if(d.reconn||d.dead)return;d.q.push(b);d.qBytes+=b.length}
function stPush(L,typ,us,head,data){const b=stMsg(typ,us,head,data);for(const d of L.dests)stPushTo(d,b)}
function stFlushDest(L,d,force){
  if(!d.q.length||d.sending||d.reconn||d.dead)return;
  if(!force&&performance.now()-d.lastFlush<40&&d.qBytes<300000)return;
  const buf=new Uint8Array(d.qBytes);let p=0;for(const b of d.q){buf.set(b,p);p+=b.length}
  d.q=[];d.qBytes=0;d.lastFlush=performance.now();d.sending=true;
  return dedcutLive.send(d.id,buf).then(r=>{d.sending=false;d.sent=r.sent;d.queued=r.queued;d.congested=r.queued>L.kbps*125*3;if(r.full){d.congested=true;L.forceKey=true}L.congested=L.dests.some(x=>x.congested&&!x.reconn&&!x.dead)}).catch(()=>{d.sending=false});
}
function stFlush(L,force){return Promise.all(L.dests.map(d=>stFlushDest(L,d,force)))}
const stDestName=d=>d.pf==='custom'?(String(d.url).replace(/^rtmps?:\/\//,'').split(/[/:]/)[0]||T('live.custom')):LIVE_PF[d.pf]?LIVE_PF[d.pf].n:'?';
function stLiveV(L,ch,meta){const d=stDesc(meta&&meta.decoderConfig&&meta.decoderConfig.description);if(d){L.avcC=d;stPush(L,9,ch.timestamp,[0x17,0,0,0,0],d)}if(!L.avcC)return;const b=new Uint8Array(ch.byteLength);ch.copyTo(b);stPush(L,9,ch.timestamp,[ch.type==='key'?0x17:0x27,1,0,0,0],b)}
function stLiveA(L,ch,meta){if(!L.asc){L.asc=stDesc(meta&&meta.decoderConfig&&meta.decoderConfig.description)||new Uint8Array([0x11,0x90]);stPush(L,8,ch.timestamp,[0xAF,0],L.asc)}const b=new Uint8Array(ch.byteLength);ch.copyTo(b);stPush(L,8,ch.timestamp,[0xAF,1],b)}
function stLiveErr(e){
  const s=String(e&&e.message||e);
  if(s==='url')return T('live.errUrl');if(s==='key')return T('live.needKey');if(s==='server')return T('live.errServer');if(s==='rtmps')return T('live.errRtmps');
  if(s.startsWith('tls:'))return T('live.errTls');if(s==='timeout'||s==='handshake')return T('live.errTimeout');if(s==='closed'||s.startsWith('refused:'))return T('live.errRefused');
  return T('live.errOther',{error:s.slice(0,120)});
}
const stMeta=o=>({width:st.w,height:st.h,framerate:st.fps,videodatarate:o.kbps,audiodatarate:160});
async function stLiveStart(){
  if(O.live||stLiveStart.busy)return;if(!window.dedcutLive){toast(T('msg.onlyInApp'));return}
  const ds=stData.dests.filter(d=>d.on);if(!ds.length||ds.some(d=>!d.url)){toast(T('live.needUrl'));stSideShow('set');return}
  const nk=ds.find(d=>!d.key&&!/rtmps?:\/\/[^/]+\/.+\/.+/.test(d.url));if(nk){toast(T('live.needKey')+' ('+stDestName(nk)+')');stSideShow('set');return}
  stLiveStart.busy=true;stCtlUI();
  try{
    await stAudio();stApplyQ();stWake();
    const kb=stKbps();
    stStatus('connecting');
    const ok=[];
    for(const d of ds){try{await dedcutLive.start(d.id,d.url,d.key,{width:st.w,height:st.h,framerate:st.fps,videodatarate:kb,audiodatarate:160});ok.push(d)}catch(e){toast(stDestName(d)+' : '+stLiveErr(e))}}
    if(!ok.length)return;
    const L=await stOutput('live',kb,stLiveV,stLiveA);if(!L){ok.forEach(d=>dedcutLive.stop(d.id).catch(()=>{}));return}
    L.dests=ok.map(d=>({id:d.id,name:stDestName(d),q:[],qBytes:0,sending:false,lastFlush:0,sent:0,prevSent:0,reconn:false,dead:false,congested:false,kbps_now:0}));
    if(!O.rec)st.nextV=st.samples;L.s0=st.samples;L.on=true;O.live=L;
    {if(!stChatOn()&&stChatReady()){stChatConnect();if(stSide!=='chat')stSideUI()}}
    stStatsOn();
  }finally{stLiveStart.busy=false;stCtlUI();stStatus()}
}
// une destination perd la connexion : elle réessaie seule, les autres continuent
async function stLiveLost(id){
  const L=O.live;if(!L||!L.on)return;const d=L.dests.find(x=>x.id===id);if(!d||d.reconn||d.dead)return;
  d.reconn=true;d.q=[];d.qBytes=0;stStatus();
  for(let i=0;i<6&&O.live===L&&L.on;i++){
    await new Promise(r=>setTimeout(r,2000+i*2000));if(O.live!==L||!L.on)return;
    const c=stData.dests.find(x=>x.id===id);if(!c)break;
    try{await dedcutLive.start(id,c.url,c.key,stMeta(L));
      d.reconn=false;const us=Math.round(L.el*1e6);if(L.avcC)stPushTo(d,stMsg(9,us,[0x17,0,0,0,0],L.avcC));if(L.asc)stPushTo(d,stMsg(8,us,[0xAF,0],L.asc));L.forceKey=true;stStatus();toast(d.name+' : '+T('live.back'));return}
    catch(e){}
  }
  if(O.live!==L)return;d.dead=true;d.reconn=false;toast(d.name+' : '+T('live.lost'));
  if(L.dests.every(x=>x.dead))stLiveStop();else stStatus();
}
async function stLiveStop(){
  const L=O.live;if(!L||L.stopping)return;L.stopping=true;
  // enregistrement qui réutilise l'encodage du live (10u-perf.js) : l'encodeur continue pour lui seul, on détache juste les destinations
  const keep=!!(O.rec&&O.rec.shared===L&&O.rec.on),F=keep?{dests:L.dests,kbps:L.kbps}:L;
  if(keep){st.hub=L;L.dests=[];L.congested=false}else await stOutStop(L);
  for(let i=0;i<50&&F.dests.some(d=>d.sending);i++)await new Promise(r=>setTimeout(r,40));
  await stFlush(F,true);F.dests.forEach(d=>dedcutLive.stop(d.id).catch(()=>{}));if(keep){L.stopping=false;if(typeof pfHubKeep==='function')pfHubKeep(L)}O.live=null;
  stStatsOn();toast(T('live.ended',{time:recClock(L.el)}));stCtlUI();stStatus();if(!stOn())stIdle();
}

/* ---------- sortie Enregistrement (MP4 fragmenté écrit au fur et à mesure) ---------- */
async function stRecStart(){
  if(O.rec||stRecStart.busy)return;stRecStart.busy=true;stCtlUI();
  try{
    await stAudio();stApplyQ();stWake();
    const kb=Math.round(stKbps()*(+stData.rec.mult||2.5)),name=(String(stData.rec.prefix||'').replace(/[\\/:*?"<>|]+/g,'').trim().slice(0,40)||T('rec.filePrefix'))+' '+recStamp()+'.mp4';
    let disk=null,pos=0,bad=false;
    if(inApp){try{disk=await(await appFetch('app://dedcut/__rec?op=start&ch=scr&name='+encodeURIComponent(name)+(stData.rec.dir?'&dir='+encodeURIComponent(stData.rec.dir):''),{method:'POST'})).json()}catch(e){disk=null}}
    const sh=typeof pfShareFrom==='function'?pfShareFrom():null;
    const R=sh?pfSharedRec(sh):await stOutput('rec',kb,(o,c,m)=>{try{o.mux.addVideoChunk(c,m)}catch(e){}},(o,c,m)=>{try{o.mux.addAudioChunk(c,m)}catch(e){}});if(!R)return;
    R.name=name;R.moments=[];R.wchain=Promise.resolve();R.mem=[];R.bytes=0;
    R.mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.StreamTarget({onData:(data,p)=>{
        const b=data.slice();R.bytes+=b.length;if(p!==pos)bad=true;pos=p+b.length;
        if(disk&&!bad)R.wchain=R.wchain.then(()=>appFetch('app://dedcut/__rec?op=chunk&ch=scr',{method:'POST',body:b})).then(x=>{if(!x.ok)throw 0}).catch(()=>{bad=true});
        else R.mem.push({p,b});
      }}),video:{codec:'avc',width:st.w,height:st.h,frameRate:st.fps},audio:{codec:'aac',numberOfChannels:2,sampleRate:48000},fastStart:'fragmented',minFragmentDuration:1,firstTimestampBehavior:R.shared?'cross-track-offset':'offset'});
    R.disk=disk;R.bad=()=>bad;
    if(!O.live)st.nextV=st.samples;R.s0=st.samples;R.on=true;O.rec=R;
    stStatsOn();stRecKeys(true);
    $('#recInd').hidden=false;
  }finally{stRecStart.busy=false;stCtlUI();stStatus()}
}
function stRecPause(){const R=O.rec;if(!R||!R.on)return;R.paused=!R.paused;if(!R.paused)R.forceKey=true;stCtlUI();stStatus()}
function stRecMark(){const R=O.rec;if(!R||!R.on)return;const t=R.el;if(R.moments.length&&t-R.moments[R.moments.length-1]<1)return;R.moments.push(t);toast(T('rec.marked',{time:recClock(t)}));stCtlUI()}
function stRecKeys(on){const K=window.dedcutKeys;if(!K)return;for(const[a,f]of[['CommandOrControl+Shift+P',stRecPause]]) // Ctrl+Maj+M : 10k (marqueur pendant le live ou l'enregistrement)
  (on?K.on(a,f):K.off(a)).catch(()=>{})}
async function stRecStop(){
  const R=O.rec;if(!R||R.stopping)return;R.stopping=true;stRecKeys(false);
  await stOutStop(R);if(st.hub&&st.hub===R.shared){const H=st.hub;st.hub=null;await stOutStop(H)}try{R.mux.finalize()}catch(e){}await R.wchain;O.rec=null;stStatsOn();$('#recInd').hidden=true;stCtlUI();stStatus();
  let file=null;
  if(R.disk&&!R.bad()){try{const e=await(await appFetch('app://dedcut/__rec?op=end&ch=scr',{method:'POST'})).json();file={path:e.path,name:R.name,size:0}}catch(e){}}
  if(!file){if(R.disk)appFetch('app://dedcut/__rec?op=end&ch=scr',{method:'POST'}).catch(()=>{});
    const all=new Uint8Array(R.mem.reduce((a,x)=>Math.max(a,x.p+x.b.length),0));for(const x of R.mem)all.set(x.b,x.p);file=new File([all],R.name,{type:'video/mp4'});download(file,R.name)}
  toast(T('rec.finished',{time:recClock(R.el)}));if(!stOn())stIdle();
  const m=file instanceof File?addFiles([file])[0]:addPaths([file])[0];if(!m)return;
  if(!stData.rec.toTl){toast(T('rec.added'));return}
  await waitMeta([m],12000);
  const s=endOf(tk('video')),d=isFinite(m.duration)&&m.duration>0?m.duration:R.el;
  clips.push(newClip({track:tk('video'),mid:m.id,start:s,dur:d,p:{vol:100,fit:'cover',amt:60,fx:noFx()}}));
  if(R.moments.length)markers=[...markers,...R.moments.map(t=>s+t)].sort((a,b)=>a-b);
  commit();refresh();toast(T('st.recToTl')+(R.moments.length?' · '+T('rec.withMoments',{n:R.moments.length}):''));
}
// Ctrl+Maj+R (même en jeu) : démarre / arrête l'enregistrement du studio ; s'il n'est pas prêt, on l'ouvre
window.recHotkey=()=>{if(stPhone)return;if(O.rec)return stRecStop();stEnsure();
  if(!st.ac||st.ac.state!=='running'||(!st.scr&&stScene().items.some(i=>i.kind==='screen'&&i.vis))){setMode('rec');toast(T('st.prepare'));return}
  return stRecStart()};
// Ctrl+Maj+R n'est pris à Windows que dans Enregistrer / Live ou pendant un enregistrement : le reste du temps il reste
// aux autres logiciels (dans un navigateur, Ctrl+Maj+R recharge la page ; avant, DedCut le gardait dès son ouverture)
let recHotOn=false;
function recHotSync(){
  const K=window.dedcutKeys;if(!K)return;
  // (aussi quand le panneau « Enregistrer » du Montage est ouvert : son aide annonce ce raccourci)
  const want=stOn()||!!(O&&(O.rec||O.live))||(typeof recState!=='undefined'&&!!recState)||!!(document.getElementById('recGo')||{}).offsetParent;if(want===recHotOn)return;recHotOn=want;
  (want?K.on('CommandOrControl+Shift+R',()=>window.recHotkey&&window.recHotkey()):K.off('CommandOrControl+Shift+R')).catch(()=>{});
}
setInterval(recHotSync,1000);

/* ---------- interface ---------- */
function stRender(){stScenesUI();stSourcesUI();stMixerUI();stCtlUI();stSideUI();stStatus();stSelBox()}
function stScenesUI(){
  $('#stScenes').innerHTML=stData.scenes.map(s=>`<div class="strow${s.id===stData.cur?' on':''}" data-sc="${s.id}" title="${esc(T('st.scTip'))}"><span>${esc(s.name)}</span></div>`).join('');
}
function stSourcesUI(){
  const its=stScene().items.slice().reverse();
  $('#stSources').innerHTML=its.map(it=>`<div class="strow${it.id===stSelId?' on':''}" data-it="${it.id}"><button class="stv${it.vis?'':' off'}" data-vis="${it.id}" title="${T('st.visible')}">${ico(it.vis?'eye':'eyeoff',14)}</button><i>${ico(ST_KINDS[it.kind],15)}</i><span>${esc(stName(it))}</span><button class="stv stlk${it.lock?' on':''}" data-lock="${it.id}" title="${T('lb.lock')}">${ico(it.lock?'lock':'unlock',13)}</button></div>`).join('')||`<div class="hint">${T('st.noSource')}</div>`;
}
function stName(it){
  if(it.kind==='text'||it.kind==='banner')return(it.o.text||T('st.k.'+it.kind)).slice(0,40);
  if(it.kind==='cam'){const d=(st.devs||[]).find(x=>x.kind==='videoinput'&&x.deviceId===it.o.dev);return T('st.k.cam')+(d&&d.label?' · '+d.label:'')}
  if(it.kind==='image'&&it.o.path)return T('st.k.image')+' · '+baseName(it.o.path);
  return T('st.k.'+it.kind);
}
function stMixerUI(){
  const box=$('#stMixer');if(!box||!stData)return;
  const mics=(st.devs||[]).filter(x=>x.kind==='audioinput'&&x.deviceId!=='communications');
  const row=(k,label,extra)=>`<div class="mx" id="stMx-${k}"><div class="mxh"><b>${label}</b>${extra||''}<button class="mxmute${stData.mute[k]?' on':''}" data-mute="${k}" title="${esc(T(stData.mute[k]?'st.mx.unmute':'st.mx.mute',{name:String(label).replace(/<[^>]*>/g,'')}))}">${ico(stData.mute[k]?'mute':'vol',14)}</button></div><div class="mxm"><i></i></div><input type="range" min="0" max="200" value="${stData.vol[k]}" data-vol="${k}"></div>`;
  const f=stData.micfx,mu=stData.mus;
  const fx=`<details class="mxfx"${st.fxOpen?' open':''}><summary>${ico('sliders',13)}${T('st.fx.title')}</summary>
    <label class="chk"><span>${T('st.fx.ns')}</span><input type="checkbox" data-fx="ns" ${f.ns!==false?'checked':''}></label>
    <label class="chk"><span>${T('lx.rnn.label')}</span><input type="checkbox" data-fx="rnn" ${f.rnn?'checked':''}></label>
    <label class="chk"><span>${T('st.fx.gate')}</span><input type="checkbox" data-fx="gate" ${f.gate?'checked':''}></label>
    ${f.gate||stData.afx&&stData.afx.exp?`<div class="fld"><label>${T('st.fx.thr')} <span>${f.thr} dB</span></label><input type="range" min="-70" max="-20" value="${f.thr}" data-fx="thr"></div>`:''}
    <label class="chk"><span>${T('st.fx.comp')}</span><input type="checkbox" data-fx="comp" ${f.comp?'checked':''}></label>${typeof lpMixHTML==='function'?lpMixHTML():''}</details>`;
  const cats=['all',...MCATS].map(k=>`<option value="${k}" ${mu.cat===k?'selected':''}>${T('mlib.cat.'+k)}</option>`).join('');
  const music=`<div class="mx" id="stMx-music"><div class="mxh"><b>${T('st.mus.title')}</b><button class="mxbtn" data-mus="play" title="${T(stMus.on?'rec.pause':'st.mus.play')}">${ico(stMus.on||stMus.loading?'pause':'play',13)}</button><button class="mxbtn" data-mus="next" title="${T('st.mus.next')}">${ico('next',13)}</button><button class="mxmute${stData.mute.music?' on':''}" data-mute="music" title="${esc(T(stData.mute.music?'st.mx.unmute':'st.mx.mute',{name:T('st.mus.title')}))}">${ico(stData.mute.music?'mute':'vol',14)}</button></div>
    <div class="mxt">${stMus.loading?T('mus.making'):stMus.on?esc(stMus.title):T('st.mus.hint')}</div><div class="mxm"><i></i></div><input type="range" min="0" max="200" value="${stData.vol.music}" data-vol="music">
    <div class="mxrow"><select data-muscat>${cats}</select><label class="chk"><span>${T('st.mus.duck')}</span><input type="checkbox" data-musduck ${mu.duck!==false?'checked':''}></label></div></div>`;
  box.innerHTML=row('desk',T('st.desk'),st.desk&&st.desk.src?'':`<span class="hint">${T('st.noDesk')}</span>`)+
    row('mic',T('rec.mic'),`<select data-mic>${['<option value="">'+T('rec.noMic')+'</option>',...mics.map((x,i)=>'<option value="'+esc(x.deviceId)+'"'+(x.deviceId===stData.mic?' selected':'')+'>'+esc(x.deviceId==='default'?T('rec.defaultMic'):x.label||T('rec.micN',{n:i+1}))+'</option>')].join('')}</select>`)+fx+music;
}
function stCtlUI(){
  const box=$('#stCtl');if(!box||!stData)return;const L=O.live,R=O.rec,busyL=stLiveStart.busy,busyR=stRecStart.busy;
  const live=`<button class="stbig live${L?' on':''}" data-ctl="live" ${busyL?'disabled':''}>${L?ico('square',14)+T('live.stop'):ico('live',16)+T('live.go')}</button>`;
  const rec=`<button class="stbig rec${R?' on':''}" data-ctl="rec" ${busyR?'disabled':''}>${R?ico('square',14)+T('st.recStop'):ico('rec',16)+T(appMode==='live'?'st.recAlso':'st.recStart')}</button>`;
  const extra=R?`<div class="stduo"><button data-ctl="pause" class="${R.paused?'on':''}">${ico(R.paused?'play':'pause',13)}${T(R.paused?'rec.resume':'rec.pause')}</button><button data-ctl="mark">${ico('marker',14)}${T('rec.mark')}</button></div>`+(R.moments.length?`<div class="hint">${T('rec.moments',{list:R.moments.map(recClock).join(', ')})}</div>`:''):'';
  const rp=L||R?`<button class="sm" data-ctl="replay" title="${esc(T('kb.k.ctrl')+'+'+T('kb.k.shift')+'+X')}">${ico('replay',14)}${T('st.rp.btn',{s:typeof stRpSec==='function'?stRpSec():30})}</button>`:'';
  box.innerHTML=(appMode==='live'?live+rec:rec+live)+extra+rp+`<button class="sm stset${stSide==='set'?' on':''}" data-ctl="set">${ico('gear',14)}${T('st.settings')}</button>`;
}
function stStatus(s){
  const el=$('#stStatus');if(!el||!stData)return;const L=O.live,R=O.rec,sc=stScene();
  const lv=L?`<span class="stpill live">● ${T('live.st.live')} ${recClock(L.el)}</span>${L.dests.map(d=>`<span class="stdpill${d.dead?' dead':d.reconn?' warn':''}">${esc(d.name)} ${d.dead?'✕':d.reconn?T('live.st.reconnecting'):(d.kbps_now/1000).toFixed(1)+' Mb/s'}</span>`).join('')}<span>${L.fps_now||0} i/s · ${T('st.dropped',{n:L.dropped})}${L.congested?' · '+T('live.slow'):''}</span>${stViewersHTML()}`:s==='connecting'?`<span class="stpill warn">${T('live.st.connecting')}</span>`:'';
  const rc=R?`<span class="stpill rec${R.paused?' warn':''}">● ${R.paused?T('rec.paused'):'REC'} ${recClock(R.el)}</span><span>${T('rec.sizeMB',{n:Math.round(R.bytes/1048576)})}</span>`:'';
  el.innerHTML=`<span class="stscn">${ico('scene',13)}${esc(sc.name)}</span>${lv}${rc}<span class="stq">${st.w}×${st.h} · ${st.fps} i/s</span>`;
  $('#modeBar [data-mode=live]').classList.toggle('act',!!L);$('#modeBar [data-mode=rec]').classList.toggle('act',!!R);
}
// un seul minuteur pour les deux sorties ; débit et images par seconde mesurés sur le temps vraiment écoulé
function stStatsOn(){const on=!!(O.live||O.rec);if(on&&!st.statIv)st.statIv=setInterval(stStats,1000);if(!on&&st.statIv){clearInterval(st.statIv);st.statIv=0}stLiveKeys(on)}
function stLiveKeys(on){
  const K=window.dedcutKeys;if(!K||!!st.keysOn===on)return;st.keysOn=on;
  for(let i=1;i<=9;i++)(on?K.on('CommandOrControl+Shift+'+i,()=>{const s=stData.scenes[i-1];if(s)stSwitch(s.id)}):K.off('CommandOrControl+Shift+'+i)).catch(()=>{});
  (on?K.on('CommandOrControl+Shift+X',stReplaySave):K.off('CommandOrControl+Shift+X')).catch(()=>{});
}
function stStats(){
  const L=O.live,now=performance.now();
  if(L){const dt=Math.max(.2,(now-(L.lastStat||now-1000))/1000);L.lastStat=now;for(const d of L.dests){d.kbps_now=Math.max(0,Math.round((d.sent-d.prevSent)*8/1000/dt));d.prevSent=d.sent}L.fps_now=Math.round((L.frames-(L.prevFrames||0))/dt);L.prevFrames=L.frames}
  if(O.rec)$('#recInd span').textContent=recClock(O.rec.el);
  stStatus();
}
/* panneau de droite : propriétés de la source choisie, ou paramètres */
function stSideShow(k){stSide=k;stSideUI();stCtlUI()}
function stSideUI(){
  const box=$('#stSide');if(!box||!stData)return;
  stSideBody(box);
  const tabs=[['props','elem','st.tab.props'],['chat','chat','st.tab.chat'],['tools','sliders','st.tab.tools'],['set','gear','st.tab.set']];
  box.insertAdjacentHTML('afterbegin','<div class="sttabs">'+tabs.map(([k,i,l])=>`<button data-sttab="${k}" class="${stSide===k?'on':''}">${ico(i,14)}${T(l)}${k==='chat'&&stChatOn()?'<i class="stdot"></i>':''}</button>`).join('')+'</div>');
}
function stSideBody(box){
  if(stSide==='chat'){box.innerHTML=stChatPanel();stChatStatusUI();const L=$('#stChatList');if(L)L.scrollTop=L.scrollHeight;return}
  if(stSide==='tools'){box.innerHTML=stToolsPanel();return}
  if(stSide==='set'){
    const busy=!!(O.live||O.rec),tr=stData.trans;
    box.innerHTML=`<h4>${ico('gear',15)}${T('st.settings')}</h4>
      <h5>${T('live.where')}</h5>
      ${stData.dests.map(d=>`<div class="stdest${d.on?'':' off'}" data-dest="${d.id}">
        <div class="stdest-h"><label class="chk"><input type="checkbox" data-dset="on" ${d.on?'checked':''}><b>${esc(stDestName(d))}</b>${d.vert?'<i class="lvtag">9:16</i>':''}</label>${stData.dests.length>1?`<button class="sm" data-ddel="${d.id}" title="${T('st.delDest')}">${ico('trash',13)}</button>`:''}</div>
        <div class="chips c3">${Object.keys(LIVE_PF).map(k=>`<button data-dpf="${k}" class="${k===d.pf?'on':''}">${k==='custom'?T('live.custom'):LIVE_PF[k].n}</button>`).join('')}</div>
        <div class="fld"><label>${T('live.server')}</label><input type="text" data-dset="url" value="${esc(d.url)}" spellcheck="false"></div>
        ${d.pf==='kick'?`<p class="hint">${T('live.kickHint')}</p>`:d.pf==='tiktok'?`<p class="hint">${T('live.tiktokHint')}</p>${stData.fmt!=='v'?`<button class="sm" data-vfmt="v">${ico('portrait',13)}${T('vf.toVert')}</button>`:''}`:d.pf==='custom'?`<p class="hint">${T('live.customHint')}</p>`:''}
        <div class="fld"><label>${T('live.key')} ${LIVE_PF[d.pf].help?`<a href="#" data-dhelp="1">${T('live.whereKey')}</a>`:''}</label><div class="keyrow"><input type="password" data-dset="key" value="${esc(d.key)}" spellcheck="false"><button class="sm" data-dshow="1">${ico('eye',14)}</button></div></div></div>`).join('')}
      ${stData.dests.length<4?`<button class="sm" data-dadd="1">${ico('plus',14)}${T('st.addDest')}</button>`:''}
      <p class="hint">${T('st.multiHint')}</p>${typeof lvSetHTML==='function'?lvSetHTML():''}
      <label class="chk"><span>${T('live.remember')}</span><input type="checkbox" data-set="remember" ${stData.remember?'checked':''}></label>
      <p class="hint">${T('live.keyWarn')}</p>
      <h5>${T('st.tr.title')}</h5><div class="copt">${['cut','fade','slide','zoom','stinger'].map(k=>`<button data-trans="${k}" class="${tr.type===k?'on':''}">${T('st.tr.'+k)}</button>`).join('')}</div>
      ${tr.type!=='cut'&&tr.type!=='stinger'?`<div class="fld"><label>${T('st.tr.ms')} <span>${tr.ms} ms</span></label><input type="range" min="150" max="1500" step="50" value="${tr.ms}" data-set="transMs"></div>`:''}
      ${typeof lpStingerHTML==='function'?lpStingerHTML():''}
      <p class="hint">${T('st.keysHint')}</p>
      <h5>${T('common.quality')}</h5><div class="fld"><select data-set="q" ${busy?'disabled':''}>${Object.keys(ST_Q).map(k=>`<option value="${k}" ${k===stData.q?'selected':''}>${T('live.q'+{'720:30':'720','720:60':'72060','1080:30':'1080','1080:60':'108060'}[k])}</option>`).join('')}</select></div>
      ${typeof stQualHTML==='function'?stQualHTML(busy):''}
      <h5>${T('st.recording')}</h5>
      <div class="fld"><label>${T('rec.autoStop')}</label><select data-set="limit">${[0,60,300,600,1800,3600,7200].map(v=>`<option value="${v}" ${v===stData.rec.limit?'selected':''}>${v?v<3600?v/60+' min':v/3600+' h':T('rec.never')}</option>`).join('')}</select></div>
      <label class="chk"><span>${T('st.toTl')}</span><input type="checkbox" data-set="toTl" ${stData.rec.toTl?'checked':''}></label>
      <p class="hint">${T('st.recWhere')}</p>
      ${typeof lpSetHTML==='function'?lpSetHTML(busy):''}
      <button class="sm" data-reset="1">${T('st.reset')}</button>`;
    return;
  }
  const it=stSel();
  if(!it){box.innerHTML=`<h4>${T('st.props')}</h4><p class="hint">${T('st.propsHint')}</p>`;return}
  const o=it.o,devs=(st.devs||[]).filter(x=>x.kind==='videoinput');let h='';
  if(it.kind==='screen')h=`<button class="pri" data-act="screen">${ico('monitor',15)}${T(st.scr?'st.changeScreen':'st.pickScreen')}</button><p class="hint">${T('rec.pickerHint')}</p><label class="chk"><span>${T('vf.cover')}</span><input type="checkbox" data-o="cover" ${o.cover?'checked':''}></label>`;
  if(it.kind==='cam')h=`<div class="fld"><label>${T('rec.camera')}</label><select data-o="dev"><option value="">${T('rec.defaultCam')}</option>${devs.map((x,i)=>`<option value="${esc(x.deviceId)}" ${x.deviceId===o.dev?'selected':''}>${esc(x.label||T('rec.camN',{n:i+1}))}</option>`).join('')}</select></div>
    <div class="fld"><label>${T('rec.camShape')}</label><div class="copt">${['rect','rounded','round'].map(s=>`<button data-shape="${s}" class="${(o.shape||'rect')===s?'on':''}">${T('st.shape.'+s)}</button>`).join('')}</div></div>
    <label class="chk"><span>${T('st.mirror')}</span><input type="checkbox" data-o="mirror" ${o.mirror?'checked':''}></label>
    <div class="fld"><label>${T('st.bg.title')}</label><select data-o="bgfx">${['none','blur','remove','green'].map(k=>`<option value="${k}" ${(o.bgfx||'none')===k?'selected':''}>${T('st.bg.'+k)}</option>`).join('')}</select></div>${o.bgfx==='green'?`<p class="hint">${T('st.bg.greenHint')}</p>`:o.bgfx&&o.bgfx!=='none'?`<p class="hint">${T('st.bg.aiHint')}</p>`:''}`;
  if(it.kind==='image')h=`<button class="pri" data-act="image">${ico('image',15)}${T('st.pickImage')}</button>`;
  if(it.kind==='text')h=`<div class="fld"><label>${T('st.text')}</label><textarea data-o="text" rows="2">${esc(o.text||'')}</textarea></div>
    <div class="fld"><label>${T('st.size')} <span>${o.size||8}</span></label><input type="range" min="2" max="25" value="${o.size||8}" data-o="size"></div>
    <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#ffffff')}"></div>
    <label class="chk"><span>${T('st.textBg')}</span><input type="checkbox" data-o="bgOn" ${o.bg?'checked':''}></label>`;
  if(it.kind==='color')h=`<div class="fld"><label>${T('st.color')} 1</label><input type="color" data-o="c1" value="${o.c1||'#111111'}"></div><div class="fld"><label>${T('st.color')} 2</label><input type="color" data-o="c2" value="${o.c2||o.c1||'#222222'}"></div>
    <label class="chk"><span>${T('st.anim')}</span><input type="checkbox" data-o="anim" ${o.anim?'checked':''}></label>`;
  if(it.kind==='banner')h=`<div class="fld"><label>${T('st.text')}</label><input type="text" data-o="text" value="${esc(o.text||'')}"></div><div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#8b5cf6')}"></div>`;
  if(it.kind==='badge')h=`<p class="hint">${T('st.badgeHint')}</p>`;
  if(it.kind==='alerts')h=`<div class="fld"><label>${T('st.al.dur')} <span>${o.dur||6} s</span></label><input type="range" min="3" max="15" value="${o.dur||6}" data-o="dur"></div>
    <label class="chk"><span>${T('st.al.sound')}</span><input type="checkbox" data-o="sound" ${o.sound!==false?'checked':''}></label>
    <div class="fld"><label>${T('st.al.vol')} <span>${o.vol==null?70:o.vol}</span></label><input type="range" min="0" max="100" value="${o.vol==null?70:o.vol}" data-o="vol"></div>
    <button class="sm" data-altest="1">${ico('bell',14)}${T('st.al.test')}</button><p class="hint">${T('st.al.hint')}</p>`;
  if(it.kind==='timer')h=`<div class="copt">${['down','clock','live'].map(m=>`<button data-tmmode="${m}" class="${(o.mode||'down')===m?'on':''}">${T('st.tm.'+m)}</button>`).join('')}</div>
    ${(o.mode||'down')==='down'?`<div class="fld"><label>${T('st.tm.min')} <span>${o.min||5} min</span></label><input type="range" min="1" max="60" value="${o.min||5}" data-o="min"></div>
    <div class="fld"><label>${T('st.tm.next')}</label><select data-o="next"><option value="0">${T('st.tm.stay')}</option>${stData.scenes.filter(s=>s!==stScene()).map(s=>`<option value="${s.id}" ${+o.next===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    <button class="sm" data-tmgo="1">${ico('replay',14)}${T('st.tm.restart')}</button>`:''}
    <div class="fld"><label>${T('st.tm.label')}</label><input type="text" data-o="label" value="${esc(o.label||'')}"></div>
    <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#ffffff')}"></div>`;
  if(it.kind==='video')h=`<button class="pri" data-act="video">${ico('media',15)}${T('st.pickVideo')}</button>
    <div class="fld"><label>${T('st.vid.vol')} <span>${o.vol==null?80:o.vol}</span></label><input type="range" min="0" max="100" value="${o.vol==null?80:o.vol}" data-o="vol"></div>
    <label class="chk"><span>${T('live.mute')}</span><input type="checkbox" data-o="mute" ${o.mute?'checked':''}></label>
    <label class="chk"><span>${T('st.vid.restart')}</span><input type="checkbox" data-o="restart" ${o.restart!==false?'checked':''}></label>`;
  if(it.kind==='chat')h=`<div class="fld"><label>${T('st.chat.size')} <span>${o.size||3.2}</span></label><input type="range" min="2" max="6" step="0.2" value="${o.size||3.2}" data-o="size"></div>
    <div class="fld"><label>${T('st.chat.max')} <span>${o.max||6}</span></label><input type="range" min="2" max="12" value="${o.max||6}" data-o="max"></div>
    <div class="fld"><label>${T('st.chat.life')}</label><select data-o="life">${[0,15,30,60,120].map(v=>`<option value="${v}" ${+(o.life==null?30:o.life)===v?'selected':''}>${v?v+' s':T('st.chat.never')}</option>`).join('')}</select></div>
    <div class="fld"><label>${T('st.chat.bg')} <span>${o.bgp==null?55:o.bgp}</span></label><input type="range" min="0" max="90" value="${o.bgp==null?55:o.bgp}" data-o="bgp"></div>
    <button class="sm" data-sttab="chat">${ico('chat',14)}${T('st.chat.open')}</button>`;
  if(ST_PROPS[it.kind])h=ST_PROPS[it.kind](it);
  if(typeof stPropsExtra==='function')h+=stPropsExtra(it);
  if(it.kind==='chat'||it.kind==='alerts')h+=stLookHTML(it);
  box.innerHTML=`<h4>${ico(ST_KINDS[it.kind],15)}${esc(T('st.k.'+it.kind))}</h4>${h}<div class="stduo"><button class="sm" data-act="full">${ico('full',14)}${T('st.full')}</button><button class="sm" data-act="center">${ico('center',14)}${T('st.center')}</button></div><p class="hint">${T('st.dragHint')}</p>`;
}
function stSelBox(){
  const b=$('#stSel');if(!b)return;const it=stOn()&&stData?stSel():null;
  if(!it||!it.vis){b.hidden=true;return}
  b.hidden=false;Object.assign(b.style,{left:it.x*100+'%',top:it.y*100+'%',width:it.w*100+'%',height:it.h*100+'%'});
}
function stSelect(id){stSelId=id;if(stSide==='set')stSide='props';stSourcesUI();stSideUI();stSelBox();stCtlUI()}
function stSwitch(id){
  if(id===stData.cur)return;
  const tr=stData.trans||{type:'fade',ms:350};
  if(st.cv&&tr.type!=='cut'){const c=document.createElement('canvas');c.width=st.w;c.height=st.h;c.getContext('2d').drawImage(st.cv,0,0);st.fade={cv:c,t0:performance.now(),type:tr.type,ms:Math.max(100,+tr.ms||350)}}
  stData.cur=id;stSelId=null;stTimersStart(stScene());stSave();stRender();stVideoSync(true);
}
function stAdd(kind){
  const nw=ST_NEW[kind],it=nw?stItem(kind,nw.o(),nw.r?nw.r():{}):stItem(kind,{color:{c1:'#1e1b4b',c2:'#7c3aed',anim:true},text:{text:T('st.k.text'),size:8,color:'#ffffff'},banner:{text:T('st.bannerDef'),color:'#8b5cf6'},cam:{shape:'round'},chat:ST_CHAT_DEF(),alerts:ST_AL_DEF(),timer:ST_TM_DEF(0),video:{vol:80,restart:true}}[kind]||{});
  if(kind==='color')stScene().items.unshift(it);else stScene().items.push(it);
  if(kind==='cam')stCamsSync();stSave();stSelect(it.id);if(kind==='screen'&&!st.scr)stCaptureScreen();if(kind==='image')stPickImage(it);if(kind==='video')stPickVideo(it);
}
async function stPickImage(it){
  if(!FS){toast(T('msg.onlyInApp'));return}
  const l=await FS.pickMedia(T('st.k.image')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)==='image');if(!f)return;
  it.o.path=f.path;const im=new Image();im.onload=()=>{const a=im.naturalWidth/im.naturalHeight;it.h=Math.min(.9,it.w*st.w/st.h/a);stSave();stSelBox()};im.src=FS.fileUrl(f.path);st.imgs[f.path]=im;stSave();stRender();
}
/* glisser / agrandir sur l'aperçu */
let stDrag=null;
function stPt(e){const r=$('#stWrap').getBoundingClientRect();return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]}
function stHit(x,y){const its=stScene().items;for(let i=its.length-1;i>=0;i--){const it=its[i];if(it.vis&&x>=it.x&&x<=it.x+it.w&&y>=it.y&&y<=it.y+it.h)return it}return null}
function stSnap(v,len){for(const s of[0,.5-len/2,1-len])if(Math.abs(v-s)<.012)return s;return v}

/* ---------- branchements ---------- */
if(stPhone){$('#modeBar').hidden=true;const rr=$('#railRec');if(rr)rr.hidden=true}
$('#modeBar').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)});
$('#recInd').onclick=()=>setMode('rec');
$('#stScenes').addEventListener('click',e=>{const r=e.target.closest('[data-sc]');if(r)stSwitch(+r.dataset.sc)});
$('#stScenes').addEventListener('dblclick',e=>{const r=e.target.closest('[data-sc]');if(!r)return;const s=stData.scenes.find(x=>x.id===+r.dataset.sc);askText(T('st.rename'),s.name).then(n=>{if(n&&n.trim()){s.name=n.trim().slice(0,40);stSave();stRender()}})});
$('#stScAdd').onclick=()=>{const id=Math.max(...stData.scenes.map(s=>s.id))+1;stData.scenes.push({id,name:T('st.scene')+' '+id,items:[stItem('color',{c1:'#111118',c2:'#1d1236'})]});stSwitch(id)};
$('#stScDel').onclick=()=>{if(stData.scenes.length<2)return;const i=stData.scenes.findIndex(s=>s.id===stData.cur);stData.scenes.splice(i,1);stData.cur=stData.scenes[Math.max(0,i-1)].id;stCamsSync();stSave();stRender()};
$('#stScUp').onclick=()=>{const a=stData.scenes,i=a.findIndex(s=>s.id===stData.cur);if(i>0){[a[i-1],a[i]]=[a[i],a[i-1]];stSave();stScenesUI()}};
$('#stScDown').onclick=()=>{const a=stData.scenes,i=a.findIndex(s=>s.id===stData.cur);if(i<a.length-1){[a[i+1],a[i]]=[a[i],a[i+1]];stSave();stScenesUI()}};
$('#stSources').addEventListener('click',e=>{const lk=e.target.closest('[data-lock]');if(lk){const it=stScene().items.find(x=>x.id===+lk.dataset.lock);it.lock=!it.lock;stSave();stSourcesUI();return}const v=e.target.closest('[data-vis]');if(v){const it=stScene().items.find(x=>x.id===+v.dataset.vis);it.vis=!it.vis;stSave();stSourcesUI();stSelBox();return}const r=e.target.closest('[data-it]');if(r)stSelect(+r.dataset.it)});
$('#stSrcAdd').onclick=e=>{const m=$('#stAddMenu'),r=e.currentTarget.getBoundingClientRect();m.innerHTML=Object.keys(ST_KINDS).map(k=>`<button data-add="${k}">${ico(ST_KINDS[k],15)}${T('st.k.'+k)}</button>`).join('');m.hidden=false;m.style.left=r.left+'px';m.style.top=(r.top-m.offsetHeight-6)+'px'};
$('#stAddMenu').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;$('#stAddMenu').hidden=true;stAdd(b.dataset.add)});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#stAddMenu,#stSrcAdd'))$('#stAddMenu').hidden=true});
const stDelSel=()=>{const its=stScene().items,i=its.findIndex(x=>x.id===stSelId);if(i<0)return;its.splice(i,1);stSelId=null;stCamsSync();stSave();stRender()};
$('#stSrcDel').onclick=stDelSel;
const stMove=d=>{const its=stScene().items,i=its.findIndex(x=>x.id===stSelId),j=i+d;if(i<0||j<0||j>=its.length)return;[its[i],its[j]]=[its[j],its[i]];stSave();stSourcesUI()};
$('#stSrcUp').onclick=()=>stMove(1);$('#stSrcDown').onclick=()=>stMove(-1);
$('#stMixer').addEventListener('input',e=>{const k=e.target.dataset.vol;if(k){stData.vol[k]=+e.target.value;stGains();stSave()}});
$('#stMixer').addEventListener('change',e=>{const t=e.target;if(t.matches('[data-mic]'))stMicSet(t.value);
  if(t.dataset.fx){const k=t.dataset.fx;stData.micfx[k]=t.type==='checkbox'?t.checked:+t.value;st.fxOpen=true;stSave();if(k==='ns'){stMicSet(stData.mic)}else{stMicFx();stMixerUI()}}
  if(t.matches('[data-muscat]')){stData.mus.cat=t.value;stSave();stMus.list=[];if(stMus.on)stMusicPlay(0)}
  if(t.matches('[data-musduck]')){stData.mus.duck=t.checked;stSave();stMicFx()}});
$('#stMixer').addEventListener('toggle',e=>{if(e.target.matches('.mxfx'))st.fxOpen=e.target.open},true);
$('#stMixer').addEventListener('click',e=>{const mb=e.target.closest('[data-mus]');if(mb){if(mb.dataset.mus==='next')stMusicPlay(1);else if(stMus.on||stMus.loading)stMusicStop();else stMusicPlay(0);return}
  const b=e.target.closest('[data-mute]');if(!b)return;const k=b.dataset.mute;stData.mute[k]=!stData.mute[k];stGains();stSave();stMixerUI()});
$('#stCtl').addEventListener('click',e=>{const b=e.target.closest('[data-ctl]');if(!b)return;const c=b.dataset.ctl;
  if(c==='live')O.live?stLiveStop():stLiveStart();if(c==='rec')O.rec?stRecStop():stRecStart();if(c==='pause')stRecPause();if(c==='mark')stRecMark();if(c==='replay')stReplaySave();if(c==='set')stSideShow(stSide==='set'?'props':'set')});
$('#stSide').addEventListener('input',e=>{
  const t=e.target,it=stSel();
  if(t.dataset.dset){const dc=t.closest('[data-dest]'),d=dc&&stData.dests.find(x=>x.id===+dc.dataset.dest);if(d){d[t.dataset.dset]=t.type==='checkbox'?t.checked:t.value.trim();stSave();if(t.dataset.dset==='on')dc.classList.toggle('off',!t.checked)}return}
  if(t.dataset.set){const k=t.dataset.set,v=t.type==='checkbox'?t.checked:t.value;
    if(k==='remember')stData.remember=v;else if(k==='transMs'){stData.trans.ms=+v;const s=t.closest('.fld').querySelector('span');if(s)s.textContent=v+' ms'}else if(k==='limit'||k==='toTl')stData.rec[k]=k==='limit'?+v:v;else if(k==='q'){stData.q=v;stApplyQ();stFit()}stSave();return}
  if(it&&t.dataset.o){const k=t.dataset.o;let v=t.type==='checkbox'?t.checked:t.type==='range'?+t.value:t.value;
    if(k==='bgOn'){it.o.bg=v?'rgba(0,0,0,.55)':'';}else it.o[k]=v;
    if(k==='size'||k==='max'||k==='bgp'||k==='vol'){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=v}
    if(k==='dur'||k==='min'){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=v+(k==='dur'?' s':' min');if(k==='min'&&it.o.end){it.o.end=Date.now()+v*60000;it.o.done=false}}
    if(it.kind==='video')stVideoSync(false);
    if(k==='dev')stCamsSync();stSave();if(k==='text')stSourcesUI()}
});
$('#stSide').addEventListener('change',e=>{if(e.target.dataset.set==='q'||e.target.dataset.o==='dev'||e.target.dataset.o==='bgfx'){if(e.target.dataset.o==='bgfx'&&e.target.value!=='none'&&e.target.value!=='green')personSeg();stSideUI()}});
$('#stSide').addEventListener('click',e=>{
  const tb=e.target.closest('[data-sttab]');if(tb){stSideShow(tb.dataset.sttab);return}
  const dc=e.target.closest('[data-dest]'),dd=dc&&stData.dests.find(x=>x.id===+dc.dataset.dest);
  const pf=e.target.closest('[data-dpf]');if(pf&&dd){const was=dd.pf;dd.pf=pf.dataset.dpf;dd.url=LIVE_PF[dd.pf].url;if(LIVE_PF[dd.pf].vert)dd.vert=true;else if(LIVE_PF[was]&&LIVE_PF[was].vert)dd.vert=false;stSave();stSideUI();return}
  if(e.target.closest('[data-dshow]')&&dc){const k=dc.querySelector('[data-dset=key]');k.type=k.type==='password'?'text':'password';return}
  if(e.target.closest('[data-dhelp]')&&dd){e.preventDefault();const u=LIVE_PF[dd.pf].help;if(u)(FS?FS.openLink(u):window.open(u,'_blank','noopener'));return}
  const del=e.target.closest('[data-ddel]');if(del){stData.dests=stData.dests.filter(x=>x.id!==+del.dataset.ddel);stSave();stSideUI();return}
  if(e.target.closest('[data-dadd]')){const used=new Set(stData.dests.map(x=>x.pf)),pf2=['twitch','youtube','tiktok','kick','facebook','custom'].find(k=>!used.has(k))||'custom';stData.dests.push({id:++stDestN,pf:pf2,url:LIVE_PF[pf2].url,key:'',on:true,vert:!!LIVE_PF[pf2].vert});stSave();stSideUI();return}
  const trb=e.target.closest('[data-trans]');if(trb){stData.trans.type=trb.dataset.trans;stSave();stSideUI();return}
  if(e.target.closest('[data-altest]')){stAlertTest();return}
  if(e.target.closest('[data-tmgo]')){const it=stSel();if(it){it.o.end=Date.now()+(+it.o.min||5)*60000;it.o.done=false}return}
  if(e.target.closest('[data-reset]')){if(O.live||O.rec)return;const keep={dests:stData.dests,remember:stData.remember,chat:stData.chat,tw:stData.tw,yta:stData.yta,fba:stData.fba,looks:stData.looks};stData=Object.assign(stDefault(),keep);stSelId=null;stCamsSync();stSave();stRender();return}
  const it=stSel(),sh=e.target.closest('[data-shape]'),tm=e.target.closest('[data-tmmode]');
  if(it&&tm){it.o.mode=tm.dataset.tmmode;stSave();stSideUI();return}
  if(it&&sh){it.o.shape=sh.dataset.shape;if(it.o.shape==='round'||it.o.shape==='square'){it.h=Math.min(1,it.w*st.w/st.h)}stSave();stSideUI();stSelBox();return}
  const a=e.target.closest('[data-act]');if(!a)return;
  if(a.dataset.act==='screen')stCaptureScreen();
  if(a.dataset.act==='image'&&it)stPickImage(it);
  if(a.dataset.act==='video'&&it)stPickVideo(it);
  if(a.dataset.act==='full'&&it){Object.assign(it,{x:0,y:0,w:1,h:1});stSave();stSelBox()}
  if(a.dataset.act==='center'&&it){it.x=(1-it.w)/2;it.y=(1-it.h)/2;stSave();stSelBox()}
});
$('#stWrap').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const[x,y]=stPt(e),hd=e.target.closest('#stSel i'),it=hd?stSel():stHit(x,y);
  if(!it){stSelect(null);return}
  if(!hd&&it.id!==stSelId)stSelect(it.id);
  if(it.lock)return;
  stDrag={it,h:hd&&hd.dataset.h,x0:x,y0:y,o:{x:it.x,y:it.y,w:it.w,h:it.h},moved:false};$('#stWrap').setPointerCapture(e.pointerId);e.preventDefault();
});
$('#stWrap').addEventListener('pointermove',e=>{
  const d=stDrag;if(!d)return;const[x,y]=stPt(e),dx=x-d.x0,dy=y-d.y0;if(Math.abs(dx)+Math.abs(dy)>.004)d.moved=true;if(!d.moved)return;
  const it=d.it,o=d.o,free=it.kind==='color'||it.kind==='banner'||it.kind==='text';
  if(!d.h){it.x=stSnap(o.x+dx,it.w);it.y=stSnap(o.y+dy,it.h)}
  else{const L=d.h.includes('w'),Tp=d.h.includes('n');let w=Math.max(.03,o.w+(L?-dx:dx)),h=Math.max(.03,o.h+(Tp?-dy:dy));
    if(!free){const ar=o.w/o.h;if(w/h>ar)h=w/ar;else w=h*ar}
    it.w=w;it.h=h;it.x=L?o.x+o.w-w:o.x;it.y=Tp?o.y+o.h-h:o.y}
  stSelBox();
});
$('#stWrap').addEventListener('pointerup',e=>{const d=stDrag;stDrag=null;if(!d)return;if(d.moved)stSave();else if(d.it.kind==='screen'&&!st.scr)stCaptureScreen()});
addEventListener('keydown',e=>{if(!stOn()||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(/^[1-9]$/.test(e.key)&&!e.ctrlKey&&!e.altKey&&!e.metaKey){const s=stData.scenes[+e.key-1];if(s){e.preventDefault();stSwitch(s.id)}return}if((e.key==='Delete'||e.key==='Backspace')&&stSelId){e.preventDefault();stDelSel()}});
if(window.dedcutLive)dedcutLive.onStatus(s=>{if(O.live&&O.live.on&&s.state==='error')stLiveLost(s.id)});
window.addEventListener('dedcut-lang',()=>{if(stData&&stOn())stRender()});

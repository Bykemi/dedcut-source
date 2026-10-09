/* ---------- enregistrement d'écran (+ son du PC + micro) ---------- */
const tauriApp=!!window.__TAURI_INTERNALS__,inApp=location.protocol==='app:'||tauriApp;
/* rend la main à l'interface sans minuteur (les minuteurs sont ralentis quand la fenêtre est réduite) */
function yieldUI(){return new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0)})}
let recSrc=null,recState=null,meter=null;
async function loadSources(){
  const box=$('#srcList');
  if(!inApp||(tauriApp&&!window.dedcutCapture)){box.innerHTML='<div class="hint" style="grid-column:1/-1">'+T('rec.pickerHint')+'</div>';$('#srcRefresh').hidden=true;return}
  try{
    const l=await(await appFetch('app://dedcut/__sources')).json();
    if(!recSrc||!l.some(x=>x.id===recSrc))recSrc=(l.find(x=>x.id.startsWith('screen'))||l[0]||{}).id||null;
    box.innerHTML=l.map(x=>'<button class="src'+(x.id===recSrc?' on':'')+'" data-src="'+esc(x.id)+'" title="'+esc(x.name)+'"><img src="'+x.thumb+'" alt=""><span>'+esc(x.id.startsWith('screen')?T('rec.screenPrefix',{name:x.name}):x.name)+'</span></button>').join('')||'<div class="hint">'+T('rec.noSource')+'</div>';
  }catch(e){box.innerHTML='<div class="hint" style="grid-column:1/-1">'+T('rec.listError')+'</div>'}
}
async function loadMics(){
  try{if(!loadMics.ok){const st=await navigator.mediaDevices.getUserMedia({audio:true});st.getTracks().forEach(t=>t.stop());loadMics.ok=true}}catch(e){}
  const d=(await navigator.mediaDevices.enumerateDevices().catch(()=>[])).filter(x=>x.kind==='audioinput'&&x.deviceId!=='communications');
  const sel=$('#recMic'),cur=sel.value;
  sel.innerHTML='<option value="">'+T('rec.noMic')+'</option>'+d.map((x,i)=>'<option value="'+esc(x.deviceId)+'">'+esc(x.deviceId==='default'?T('rec.defaultMic'):x.label||T('rec.micN',{n:i+1}))+'</option>').join('');
  sel.value=cur&&d.some(x=>x.deviceId===cur)?cur:d.length?d[0].deviceId:'';
  startMeter();
}
function stopMeter(){if(meter){clearInterval(meter.iv);meter.st.getTracks().forEach(t=>t.stop());meter.ctx.close();meter=null}$('#micLvl').style.width='0'}
async function startMeter(){
  stopMeter();const id=$('#recMic').value;if(id===''||recState||$('#t-rec').hidden)return;
  try{
    const st=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:id}}});
    if(meter||recState||$('#t-rec').hidden||(typeof appMode!=='undefined'&&appMode!=='edit')){st.getTracks().forEach(t=>t.stop());return}
    const ctx=new AudioContext(),an=ctx.createAnalyser();
    an.fftSize=512;ctx.createMediaStreamSource(st).connect(an);const b=new Float32Array(an.fftSize);
    meter={st,ctx,iv:setInterval(()=>{an.getFloatTimeDomainData(b);let m=0;for(const v of b)m=Math.max(m,Math.abs(v));$('#micLvl').style.width=Math.min(100,m*($('#recMicVol').value/100)*140)+'%'},80)};
  }catch(e){}
}
const pad2=n=>String(Math.floor(n)).padStart(2,'0');
const recClock=s=>(s>=3600?pad2(s/3600)+':':'')+pad2(s/60%60)+':'+pad2(s%60);
function recUI(){
  const on=!!recState;
  $('#recIdle').hidden=on;$('#recRun').hidden=!on;$('#recInd').hidden=!on;$('#railRec').classList.toggle('live',on);
}
async function countdown(){
  const el=$('#cd');el.style.display='grid';
  for(const n of[3,2,1]){el.textContent=n;await new Promise(r=>setTimeout(r,1000))}
  el.style.display='none';
}
let recHot=false;
/* modes (v4.40) : écran (+ facecam, + micro sur une piste à part), caméra seule, micro seul */
let recMode='screen';try{recMode=localStorage.getItem('dedcut-rec-mode')||'screen'}catch(e){}
const recCamOpt={pos:'br',shape:'round',size:'m'};try{Object.assign(recCamOpt,JSON.parse(localStorage.getItem('dedcut-rec-cam')||'{}'))}catch(e){}
const recSaveOpt=()=>{try{localStorage.setItem('dedcut-rec-mode',recMode);localStorage.setItem('dedcut-rec-cam',JSON.stringify(recCamOpt))}catch(e){}};
const VMT=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'],VMT0=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'],AMT=['audio/webm;codecs=opus','audio/mp4','audio/webm'];
const pickMT=l=>l.find(m=>MediaRecorder.isTypeSupported(m))||'';
const camWanted=()=>recMode==='cam'||(recMode==='screen'&&$('#recCam').checked);
function recModeUI(){
  if(!['screen','cam','mic'].includes(recMode))recMode='screen';
  $$('#recMode [data-rmode]').forEach(b=>b.classList.toggle('on',b.dataset.rmode===recMode));
  $$('#t-rec .rm-screen').forEach(e=>e.hidden=recMode!=='screen');
  $$('#t-rec .rm-av').forEach(e=>e.hidden=recMode==='mic');
  $('#recModeHint').textContent=T('rec.mhint.'+recMode);
  $('#camBox').hidden=!camWanted();$('#camOpts').hidden=recMode!=='screen';
  $('#recMicSepL').hidden=recMode!=='screen'||$('#recMic').value==='';
  $$('#camPos [data-cpos]').forEach(b=>b.classList.toggle('on',b.dataset.cpos===recCamOpt.pos));
  $$('#camShape [data-cshape]').forEach(b=>b.classList.toggle('on',b.dataset.cshape===recCamOpt.shape));
  $$('#camSize [data-csize]').forEach(b=>b.classList.toggle('on',b.dataset.csize===recCamOpt.size));
  $('#camPrev').className=recMode==='screen'?'cs-'+recCamOpt.shape:'';
}
const recStamp=()=>{const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+'h'+pad2(d.getMinutes())+'m'+pad2(d.getSeconds())};
// temps enregistré (sans les pauses)
const recEl=st=>Math.max(0,((st.pauseAt||Date.now())-st.t0-st.pausedMs)/1000);
async function startRec(){
  if(recState||startRec.busy)return;startRec.busy=true;
  try{await doStartRec()}finally{startRec.busy=false}
}
/* une « piste » enregistrée : écrite morceau par morceau dans Vidéos\DedCut (ou en mémoire si impossible) */
async function recChan(stream,name,mt,ch,kind,opt){
  let disk=null;
  if(inApp){try{disk=await(await appFetch('app://dedcut/__rec?op=start&ch='+ch+'&name='+encodeURIComponent(name),{method:'POST'})).json()}catch(e){disk=null}}
  return{r:new MediaRecorder(stream,Object.assign({mimeType:mt},opt)),name,mt,disk,ch,kind,mem:[],chain:Promise.resolve()};
}
async function recMicStream(id,clean){
  return navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:id},echoCancellation:!!clean,noiseSuppression:true,autoGainControl:true}});
}
async function doStartRec(){
  if(!loadMics.ok)await loadMics();
  stopMeter();
  const[h,fps]=$('#recQ').value.split(':').map(Number),micId=$('#recMic').value;
  const rc=new AudioContext({sampleRate:48000}),dst=rc.createMediaStreamDestination();
  const st={mode:recMode,chans:[],streams:[],rc,micGain:null,moments:[],bytes:0,pausedMs:0,pauseAt:0,limit:+$('#recLimit').value||0,vt:null,info:[]};
  const fail=m=>{st.streams.forEach(s=>s.getTracks().forEach(t=>t.stop()));rc.close();if(m)toast(m);loadMics()};
  // micro (avec son volume réglable pendant l'enregistrement)
  let mic=null;
  if(micId!==''){try{mic=await recMicStream(micId,recMode!=='screen');st.streams.push(mic)}catch(e){toast(T('rec.micUnavailable'))}}
  if(recMode==='mic'&&!mic)return fail(micId===''?T('rec.needMic'):'');
  const micSep=recMode==='screen'&&mic&&$('#recMicSep').checked;
  let micDst=null;
  if(mic){st.micGain=rc.createGain();st.micGain.gain.value=+$('#recMicVol').value/100;rc.createMediaStreamSource(mic).connect(st.micGain);
    if(micSep){micDst=rc.createMediaStreamDestination();st.micGain.connect(micDst)}else st.micGain.connect(dst);st.info.push(T('rec.withMic'))}
  const stamp=recStamp();
  if(recMode==='screen'){
    const sys=$('#recSys').checked;
    if(inApp)await appFetch('app://dedcut/__pick?id='+encodeURIComponent(recSrc||'')+'&audio='+(sys?1:0)).catch(()=>{});
    let disp;
    try{disp=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:fps}},audio:sys})}
    catch(e){return fail(T('rec.captureFailed'))}
    st.streams.push(disp);
    const vt=disp.getVideoTracks()[0];st.vt=vt;
    try{await vt.applyConstraints(h?{frameRate:{ideal:fps},height:{max:h},width:{max:Math.round(h*32/9)}}:{frameRate:{ideal:fps}})}catch(e){}
    let hasA=!!(mic&&!micSep);
    if(disp.getAudioTracks().length){rc.createMediaStreamSource(new MediaStream(disp.getAudioTracks())).connect(dst);hasA=true;st.info.push(T('rec.withSys'))}
    const mt=pickMT(VMT),vb=!h||h>=2160?(fps>=60?45e6:30e6):h>=1440?(fps>=60?24e6:16e6):h>=1080?(fps>=60?16e6:10e6):6e6;
    let cam=null;
    if($('#recCam').checked){stopCamPrev();try{cam=await navigator.mediaDevices.getUserMedia({video:camCons()});st.streams.push(cam);st.info.push(T('rec.withCam'))}catch(e){toast(T('rec.camUnavailable'))}}
    if($('#recCd').checked&&!recHot)await countdown();
    st.chans.push(await recChan(new MediaStream([vt,...(hasA?dst.stream.getAudioTracks():[])]),T('rec.filePrefix')+' '+stamp+'.'+(mt.includes('mp4')?'mp4':'webm'),mt,'scr','main',{videoBitsPerSecond:vb,audioBitsPerSecond:192000}));
    if(cam){const cmt=pickMT(VMT0);st.chans.push(await recChan(cam,T('rec.camPrefix')+' '+stamp+'.'+(cmt.includes('mp4')?'mp4':'webm'),cmt,'cam','cam',{videoBitsPerSecond:4e6}))}
    if(micDst){const amt=pickMT(AMT);st.chans.push(await recChan(micDst.stream,T('rec.micPrefix')+' '+stamp+'.'+(amt.includes('mp4')?'m4a':'weba'),amt,'mic','mic',{audioBitsPerSecond:160000}))}
    vt.addEventListener('ended',()=>stopRec());
  }else if(recMode==='cam'){
    stopCamPrev();
    let cam;const ch=Math.min(h||1080,1080);
    try{cam=await navigator.mediaDevices.getUserMedia({video:Object.assign({width:{ideal:Math.round(ch*16/9)},height:{ideal:ch},frameRate:{ideal:Math.min(fps||30,60)}},$('#recCamSel').value?{deviceId:{exact:$('#recCamSel').value}}:{})})}
    catch(e){return fail(T('rec.camError'))}
    st.streams.push(cam);const vt=cam.getVideoTracks()[0];st.vt=vt;
    if($('#recCd').checked&&!recHot)await countdown();
    const mt=pickMT(VMT);
    st.chans.push(await recChan(new MediaStream([vt,...(mic?dst.stream.getAudioTracks():[])]),T('rec.camModePrefix')+' '+stamp+'.'+(mt.includes('mp4')?'mp4':'webm'),mt,'scr','main',{videoBitsPerSecond:ch>=1080?8e6:5e6,audioBitsPerSecond:192000}));
    const lv=$('#recLive');lv.srcObject=cam;lv.hidden=false;lv.play().catch(()=>{});
    vt.addEventListener('ended',()=>stopRec());
  }else{
    if($('#recCd').checked&&!recHot)await countdown();
    const amt=pickMT(AMT);
    st.chans.push(await recChan(dst.stream,T('rec.micPrefix')+' '+stamp+'.'+(amt.includes('mp4')?'m4a':'weba'),amt,'scr','main',{audioBitsPerSecond:160000}));
  }
  for(const o of st.chans)o.r.ondataavailable=e=>{if(e.data.size){st.bytes+=e.data.size;recFeed(o,e.data)}};
  st.t0=Date.now();recState=st;st.chans.forEach(o=>o.r.start(1000));recUI();recRunUI();recKeys(true);
  st.iv=setInterval(()=>recTick(st),250);recTick(st);
  if(recMode==='screen'&&$('#recMin').checked&&inApp)appFetch('app://dedcut/__win?a=min').catch(()=>{});
  try{new Notification('DedCut',{body:T('rec.started'),silent:true})}catch(e){}
}
function recTick(st){
  if(recState!==st)return;const s=recEl(st),g=st.vt?st.vt.getSettings():null;
  $('#recTime').textContent=recClock(s);$('#recInd span').textContent=recClock(s);
  $('#recInfo').textContent=[T('rec.sizeMB',{n:Math.round(st.bytes/1048576)}),g&&(g.width||'?')+'×'+(g.height||'?'),...st.info].filter(Boolean).join(' · ');
  if(st.limit&&s>=st.limit&&!st.stopping){toast(T('rec.autoStopped',{time:recClock(s)}));stopRec()}
}
function recRunUI(){
  const st=recState;if(!st)return;const p=!!st.pauseAt;
  $('#recBig').classList.toggle('paused',p);$('#recPausedTag').hidden=!p;
  $('#recPause').classList.toggle('on',p);$('#recPause span').textContent=T(p?'rec.resume':'rec.pause');
  $('#recMoments').textContent=st.moments.length?T('rec.moments',{list:st.moments.map(recClock).join(', ')}):'';
}
function recPause(){
  const st=recState;if(!st||st.stopping)return;
  if(st.pauseAt){st.pausedMs+=Date.now()-st.pauseAt;st.pauseAt=0;st.chans.forEach(o=>{try{o.r.resume()}catch(e){}})}
  else{st.pauseAt=Date.now();st.chans.forEach(o=>{try{o.r.pause()}catch(e){}})}
  recRunUI();recTick(st);
}
function recMark(){
  const st=recState;if(!st||st.stopping)return;const t=recEl(st);
  if(st.moments.length&&t-st.moments[st.moments.length-1]<1)return;
  st.moments.push(t);recRunUI();toast(T('rec.marked',{time:recClock(t)}));
}
// raccourcis pendant l'enregistrement seulement (pour ne pas les prendre aux autres logiciels le reste du temps)
function recKeys(on){
  const K=window.dedcutKeys;if(!K)return;
  for(const[a,f]of[['CommandOrControl+Shift+P',recPause],['CommandOrControl+Shift+M',recMark]])(on?K.on(a,f):K.off(a)).catch(()=>{});
}
async function stopRec(){
  const st=recState;if(!st||st.stopping)return;st.stopping=true;
  const dur=recEl(st);if(st.pauseAt){st.pausedMs+=Date.now()-st.pauseAt;st.pauseAt=0}
  const files=await Promise.all(st.chans.map(o=>recFinish(o)));
  clearInterval(st.iv);recKeys(false);st.streams.forEach(s=>s.getTracks().forEach(t=>t.stop()));st.rc.close();
  const lv=$('#recLive');lv.srcObject=null;lv.hidden=true;
  recState=null;recUI();
  if(inApp)appFetch('app://dedcut/__win?a=show').catch(()=>{});
  try{new Notification('DedCut',{body:T('rec.finished',{time:recClock(dur)}),silent:true})}catch(e){}
  const med={};files.forEach((x,i)=>{if(x)med[st.chans[i].kind]=x instanceof File?addFiles([x])[0]:addPaths([{path:x.path,name:x.name,size:0}])[0]});
  const m=med.main,cm=med.cam,mm=med.mic;
  showTab('media');toast(T('rec.added'));
  if(!m)return;
  await waitMeta([m,cm,mm].filter(Boolean),12000);
  const D=x=>isFinite(x.duration)&&x.duration>0?x.duration:dur||5;
  if(st.mode==='mic'){
    // voix seule : à la tête de lecture, réglée « Voix claire »
    const s=time;add(newClip({track:tk('audio'),mid:m.id,start:s,dur:D(m),p:{vol:100,au:Object.assign(auDefaults(),AUPRE.voix.v)}}));
    if(st.moments.length){markers=[...markers,...st.moments.map(t=>s+t)].sort((a,b)=>a-b);refresh()}
    return;
  }
  if(!(cm||mm||st.moments.length||!clips.length))return; // comme avant : seulement dans les médias
  const s=endOf(tk('video')),d=D(m);
  clips.push(newClip({track:tk('video'),mid:m.id,start:s,dur:d,p:{vol:100,fit:'cover',amt:60,fx:noFx()}}));
  if(cm){ // facecam en incrustation, synchronisée, avec la position, la forme et la taille choisies
    const P={tl:[17,22],tr:[83,22],bl:[17,78],br:[83,78]}[recCamOpt.pos]||[83,78],Z={s:18,m:26,l:36}[recCamOpt.size]||26,sh=recCamOpt.shape;
    const a=cm.w&&cm.h?cm.w/cm.h:16/9,cut=a>=1?{l:(1-1/a)*50,r:(1-1/a)*50,t:0,b:0}:{t:(1-a)*50,b:(1-a)*50,l:0,r:0};
    const sq=sh!=='rounded',sz=sq?Z*.62:Z,dx=P[0]<50?-1:1,dy=P[1]<50?-1:1;
    const p={x:sq?50+dx*(50-sz/2-4):P[0],y:sq?50+dy*(50-sz*W/H/2-6):P[1],scale:sz,op:100,vol:0,shd:1,round:sh==='round'?100:sh==='square'?14:30};
    if(sq)p.crop=cut;if(sh==='round'){p.bw=3;p.bc='#ffffff'}
    const cc=newClip({track:tk('over'),mid:cm.id,start:s,dur:Math.min(d,D(cm)),p});clips.push(cc);sel=cc.id;
  }
  if(mm){const c=placeFree(newClip({track:tk('audio'),mid:mm.id,start:s,dur:Math.min(d,D(mm)),p:{vol:100,au:Object.assign(auDefaults(),AUPRE.voix.v)}}));clips.push(c)}
  if(st.moments.length)markers=[...markers,...st.moments.map(t=>s+t)].sort((a,b)=>a-b);
  commit();refresh();
  toast(T(cm?'rec.withFacecam':mm?'rec.withMicTrack':'rec.onTimeline')+(st.moments.length?' · '+T('rec.withMoments',{n:st.moments.length}):''));
}
window.recHotkey=()=>{if(recState)return stopRec();recHot=true;return startRec().finally(()=>{recHot=false})};
/* écriture des morceaux d'enregistrement sur le disque (ou en mémoire si impossible) */
function recFeed(o,b){
  if(o.disk)o.chain=o.chain.then(()=>appFetch('app://dedcut/__rec?op=chunk&ch='+o.ch,{method:'POST',body:b})).then(x=>{if(!x.ok)throw 0}).catch(()=>{o.mem.push(b)});
  else o.mem.push(b);
}
async function recFinish(o){
  await new Promise(r=>{o.r.onstop=r;o.r.stop()});
  await o.chain;
  const type=o.mt.split(';')[0];let file=null;
  if(o.disk&&!o.mem.length){
    try{const e=await(await appFetch('app://dedcut/__rec?op=end&ch='+o.ch,{method:'POST'})).json();
      file={path:e.path,name:o.name}}catch(e){file=null}
  }
  if(!file){if(o.disk)appFetch('app://dedcut/__rec?op=end&ch='+o.ch,{method:'POST'}).catch(()=>{});file=new File(o.mem,o.name,{type});download(file,o.name)}
  return file;
}
/* facecam */
let camPrevSt=null;
const camCons=()=>{const id=$('#recCamSel').value;return Object.assign({width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},id?{deviceId:{exact:id}}:{})};
async function loadCams(){
  const d=(await navigator.mediaDevices.enumerateDevices().catch(()=>[])).filter(x=>x.kind==='videoinput');
  const s=$('#recCamSel'),cur=s.value;
  s.innerHTML=d.length?d.map((x,i)=>'<option value="'+esc(x.deviceId)+'">'+esc(x.label||T('rec.camN',{n:i+1}))+'</option>').join(''):'<option value="">'+T('rec.noCam')+'</option>';
  if(cur&&d.some(x=>x.deviceId===cur))s.value=cur;
}
function stopCamPrev(){if(camPrevSt){camPrevSt.getTracks().forEach(t=>t.stop());camPrevSt=null}const v=$('#camPrev');if(v)v.srcObject=null}
async function camPreview(){
  stopCamPrev();if(!camWanted()||recState||$('#t-rec').hidden)return;
  try{const cs=await navigator.mediaDevices.getUserMedia({video:camCons()});
    if(camPrevSt||recState||$('#t-rec').hidden||(typeof appMode!=='undefined'&&appMode!=='edit')){cs.getTracks().forEach(t=>t.stop());return}
    camPrevSt=cs;if(!loadCams.ok){loadCams.ok=true;await loadCams()}$('#camPrev').srcObject=camPrevSt;$('#camPrev').play().catch(()=>{})}
  catch(e){toast(T('rec.camError'));if(recMode==='screen'){$('#recCam').checked=false;recModeUI()}}
}
$('#recCam').onchange=()=>{recModeUI();camPreview()};
$('#recCamSel').onchange=camPreview;
$('#recMode').addEventListener('click',e=>{const b=e.target.closest('[data-rmode]');if(!b||recState)return;recMode=b.dataset.rmode;recSaveOpt();recModeUI();camPreview();startMeter()});
$('#camOpts').addEventListener('click',e=>{const b=e.target.closest('[data-cpos],[data-cshape],[data-csize]');if(!b)return;
  if(b.dataset.cpos)recCamOpt.pos=b.dataset.cpos;if(b.dataset.cshape)recCamOpt.shape=b.dataset.cshape;if(b.dataset.csize)recCamOpt.size=b.dataset.csize;recSaveOpt();recModeUI()});
$('#recPause').onclick=recPause;$('#recMark').onclick=recMark;
recModeUI();window.addEventListener('dedcut-lang',()=>{recModeUI();recRunUI()});

/* ---------- outils audio : coupe des silences, marqueurs sur le rythme ---------- */
const silCfg={db:-38,min:.6,pad:.12};
$('#insp').addEventListener('change',e=>{if(e.target.id==='silThr')silCfg.db=+e.target.value;if(e.target.id==='silMin')silCfg.min=+e.target.value;if(e.target.id==='silPad')silCfg.pad=+e.target.value});
/* aperçu : rien n'est coupé tant que l'utilisateur n'a pas validé */
let silPrev=null;
const silKey=c=>[c.start,c.in,c.dur,c.p.rate||1,c.track].join('|');
function silValid(){if(!silPrev)return null;const c=clips.find(x=>x.id===silPrev.cid);if(!c||silKey(c)!==silPrev.key){silPrev=null;return null}return silPrev}
function silZones(){const s=silValid();if(!s)return[];const c=clips.find(x=>x.id===s.cid),r=c.p.rate||1,z=[];let p=s.a0;
  for(const[a,b]of[...s.segs,[s.a1,s.a1]]){if(a-p>.001)z.push([c.start+(p-s.a0)/r,c.start+(a-s.a0)/r]);p=b}return z}
function silBox(c){const s=silValid();if(!s||s.cid!==c.id)return'';
  return`<div class="silprev"><b>${T('audio.silPreview',{count:s.runs,sec:Math.round(s.removed*10)/10})}</b><div class="pre" style="margin:6px 0 0"><button class="pri" data-act="silApply">${T('audio.silApply')}</button><button data-act="silNext">${T('audio.silNext')}</button><button data-act="silCancel">${T('common.cancel')}</button></div></div>`}
function silCancel(){silPrev=null;renderTL();renderInspector()}
function silNext(){const z=silZones();if(!z.length)return;silPrev.idx=((silPrev.idx??-1)+1)%z.length;pause();seek(Math.max(0,z[silPrev.idx][0]-.5))}
function silApply(){const s=silValid();if(!s){renderTL();renderInspector();return}const c=clips.find(x=>x.id===s.cid);silPrev=null;silCut(c,s.segs,s.runs)}
function soundClipOk(c){const m=c&&c.mid&&mById(c.mid);if(!m||m.type==='image'){toast(T('msg.selectSound'));return null}return m}
async function cutSilences(c){
  const m=soundClipOk(c);if(!m)return;
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  toast(T('audio.analyzing'));
  const buf=await decodeAudio(m);if(!buf){toast(T('audio.noSound'));return}
  const sr=buf.sampleRate,rate=c.p.rate||1,a0=c.in,a1=c.in+c.dur*rate,W2=.02,win=Math.round(sr*W2),thr=Math.pow(10,silCfg.db/20);
  const chs=[...Array(buf.numberOfChannels)].map((_,i)=>buf.getChannelData(i)),n=Math.max(1,Math.ceil((a1-a0)/W2)),loud=new Uint8Array(n);
  for(let i=0;i<n;i++){const s0=Math.floor(a0*sr)+i*win;let sum=0,k=0;for(const d of chs)for(let j=s0,e=Math.min(s0+win,d.length);j<e;j+=2){sum+=d[j]*d[j];k++}loud[i]=k&&Math.sqrt(sum/k)>thr?1:0}
  const mask=new Uint8Array(n).fill(1),minW=Math.round(silCfg.min/W2),pad=Math.round(silCfg.pad/W2);let runs=0;
  for(let i=0;i<n;){if(loud[i]){i++;continue}let j=i;while(j<n&&!loud[j])j++;if(j-i>=minW){const a=i===0?0:i+pad,b=j===n?n:j-pad;if(b>a){for(let x=a;x<b;x++)mask[x]=0;runs++}}i=j}
  const segs=[];for(let i=0;i<n;){if(!mask[i]){i++;continue}let j=i;while(j<n&&mask[j])j++;segs.push([a0+i*W2,Math.min(a1,a0+j*W2)]);i=j}
  if(!segs.length){toast(T('audio.allSilent'));return}
  if(!runs){toast(T('audio.noSilence'));return}
  const kept=segs.reduce((x,sg)=>x+(sg[1]-sg[0]),0);
  silPrev={cid:c.id,key:silKey(c),segs,runs,a0,a1,removed:(a1-a0-kept)/rate};
  sel=c.id;renderTL();renderInspector();silNext();
}
function silCut(c,segs,runs){
  const rate=c.p.rate||1;
  const linked=clips.filter(x=>x!==c&&x.mid===c.mid&&Math.abs(x.start-c.start)<.01&&Math.abs(x.in-c.in)<.01&&Math.abs(x.dur-c.dur)<.01);
  let first=null,removed=0;
  for(const cl of[c,...linked]){
    let t=cl.start;const parts=segs.map((sg,k)=>{const n2=JSON.parse(JSON.stringify(cl));n2.id=uid++;n2.in=sg[0];n2.dur=Math.max(.05,(sg[1]-sg[0])/rate);n2.start=t;t+=n2.dur;delete n2.kf;if(k>0)n2.p.tin='none';if(k<segs.length-1)n2.p.tout='none';return n2});
    removed=cl.dur-(t-cl.start);const end=cl.start+cl.dur;
    clips=clips.filter(x=>x!==cl);clips.forEach(x=>{if(x.track===cl.track&&x.start>=end-.001)x.start=Math.max(0,x.start-removed)});
    clips.push(...parts);if(!first)first=parts[0];
  }
  sel=first.id;commit();refresh();toast(T('audio.silencesCut',{count:runs,sec:Math.round(removed*10)/10}));
}
/* temps des temps forts d'un son (en secondes de timeline à partir de « start ») */
function beatTimes(buf,a0,a1,rate,start){
  const sr=buf.sampleRate,hop=Math.round(sr*.01);
  const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L,n=Math.max(2,Math.floor((a1-a0)*sr/hop)),e=new Float32Array(n);let lp=0;
  for(let i=0;i<n;i++){const s0=Math.floor(a0*sr)+i*hop;let sum=0;for(let j=s0,end=Math.min(s0+hop,L.length);j<end;j++){lp+=.06*((L[j]+R[j])*.5-lp);sum+=lp*lp}e[i]=Math.sqrt(sum/hop)}
  const f=new Float32Array(n);for(let i=1;i<n;i++)f[i]=Math.max(0,e[i]-e[i-1]);
  const ps=new Float64Array(n+1);for(let i=0;i<n;i++)ps[i+1]=ps[i]+f[i];
  const out=[];let last=-1e9;
  for(let i=1;i<n-1;i++){const a=Math.max(0,i-50),b=Math.min(n,i+50),mean=(ps[b]-ps[a])/(b-a);if(f[i]>mean*2.2&&f[i]>=f[i-1]&&f[i]>=f[i+1]&&f[i]>1e-4&&i-last>=28){out.push(start+i*hop/sr/rate);last=i}}
  return out;
}
async function beatMarkers(c){
  const m=soundClipOk(c);if(!m)return;
  toast(T('audio.beatAnalyzing'));
  const buf=await decodeAudio(m);if(!buf){toast(T('audio.noSound'));return}
  const rate=c.p.rate||1,out=beatTimes(buf,c.in,c.in+c.dur*rate,rate,c.start);
  if(!out.length){toast(T('audio.noBeat'));return}
  markers=[...markers,...out].sort((a,b)=>a-b).filter((t,i,a)=>!i||t-a[i-1]>.05);
  autosave();renderTL();toast(T('audio.beatsPlaced',{count:out.length}));
}

/* ---------- format en 1 clic ---------- */
function toFormat(w,h){
  setFormat(w,h,true);
  clips.forEach(c=>{if(isVid(c)&&!c.gen&&c.mid){const m=mById(c.mid);if(m&&m.type!=='audio')c.p.fit=w<h?'blur':'cover'}});
  commit();refresh();toast(w<h?T('proj.toVertical'):T('proj.toHorizontal'));
}

/* ---------- export : préréglages et taille estimée ---------- */
const XPRE={discord:{mb:9.5,fps:30},nitro:{mb:48,fps:60},yt:{q:20,fps:60},tiktok:{q:10,fps:30}};
function expBitrate(){
  const p=XPRE[$('#xPre').value],TD=Math.max(.5,expDur());
  if(p&&p.mb)return{v:Math.max(2e5,Math.round(p.mb*8388608*.93/TD-128000)),a:128000,cbr:true};
  if($('#xQ').value==='c')return{v:Math.round(clamp(+$('#xQc').value||8,.5,80)*1e6),a:192000};
  const[w,h]=expDims();
  return{v:Math.round(Math.min(80e6,+$('#xQ').value*1e6*Math.pow(Math.max(1,w*h/921600),.75))),a:192000};
}
function expInfo(){
  $('#xQcF').hidden=$('#xQ').value!=='c'||$('#xQ').disabled;
  rangeRow();
  const fv=$('#xFmt').value,au=fv==='wav'||fv==='m4a';['#xRes','#xFps','#xPre'].forEach(s=>{$(s).disabled=au});$('#xQ').disabled=au||!!(XPRE[$('#xPre').value]&&XPRE[$('#xPre').value].mb);
  if(au){const d=expDur();$('#xInfo').textContent=T('export.audioInfo',{dur:fmt(d),size:window.i18n.fmt.bytes(d*(fv==='wav'?192000:24000))});return}
  if(fv==='gif'){$('#xInfo').textContent=T('export.gifInfo',{w:Math.min(480,W),dur:fmt(expDur()),max:GIF_MAX_S});return}
  const b=expBitrate(),mb=(b.v+b.a)*expDur()/8388608;
  const[ew,eh]=expDims();
  $('#xInfo').textContent=[scenes&&scenes.length>1&&T('scene.exported',{name:scName(scenes[curSc],curSc)}),T('export.info',{w:ew,h:eh,dur:fmt(expDur()),size:window.i18n.fmt.bytes(mb*1048576)}),
    b.cbr&&b.v<1.5e6&&W*H>1e6&&T('export.warnLong'),$('#xPre').value==='tiktok'&&W>H&&T('export.tipVertical'),Math.min(ew,eh)>=2160&&T('export.warn4k')].filter(Boolean).join(' · ');
}
$('#xPre').onchange=()=>{const p=XPRE[$('#xPre').value];if(p){$('#xFps').value=String(p.fps);if(p.q)$('#xQ').value=String(p.q);$('#xFmt').value='mp4'}$('#xQ').disabled=!!(p&&p.mb);expInfo()};
['#xQ','#xFps','#xFmt','#xRes','#xRange'].forEach(s=>$(s).addEventListener('change',expInfo));
$('#xQc').addEventListener('input',expInfo);
let expRestore=null,expT0=0;
function expDims(){const r=+$('#xRes').value;if(!r)return[W,H];const k=r/Math.min(W,H),e=x=>Math.max(2,Math.round(x*k/2)*2);return[e(W),e(H)]}

/* ---------- son : chaîne par clip (égaliseur, anti-souffle, compresseur, panoramique, réverbe), limiteur, vu-mètre ---------- */
let masterVol=100,masterLim=true,limN=null,anL=null,anR=null,vuBuf=null;const vuPk=[0,0],chains=new Map();
const auDefaults=()=>({eqL:0,eqM:0,eqH:0,hp:false,nr:0,comp:false,pan:0,rev:0,enh:0,ch:'st',hpf:0,lpf:0,midF:1400,cThr:-24,cRat:4});
const AUPRE={none:{n:'common.none',v:{}},voix:{n:'aupre.clearVoice',v:{hp:true,eqL:-3,eqM:3,eqH:4,comp:true}},gaming:{n:'aupre.gaming',v:{hp:true,eqM:2,eqH:3,comp:true,nr:40}},
  podcast:{n:'aupre.podcast',v:{hp:true,eqL:2,eqM:2,eqH:3,comp:true,nr:25}},basses:{n:'aupre.bass',v:{eqL:9,eqH:2}},loin:{n:'aupre.distant',v:{eqL:-10,eqH:-9,rev:30}},
  salle:{n:'aupre.hall',v:{rev:50}},tel:{n:'aupre.phone',v:{hp:true,eqL:-15,eqM:6,eqH:-12}},
  animateur:{n:'aupre.broadcast',v:{hp:true,eqL:4,eqM:2,eqH:4,comp:true,enh:60}},chaude:{n:'aupre.warm',v:{eqL:4,eqM:1,eqH:-2,comp:true}},
  asmr:{n:'aupre.asmr',v:{hp:true,eqH:5,nr:30,rev:6}},vlog:{n:'aupre.outdoor',v:{hp:true,nr:50,comp:true,enh:40}},
  musique:{n:'aupre.music',v:{eqL:3,eqH:3,comp:true}},cinema:{n:'aupre.cinema',v:{eqL:5,eqH:1,rev:15,comp:true}}};
function limiterSet(n){if(masterLim){n.threshold.value=-1.5;n.knee.value=0;n.ratio.value=20;n.attack.value=.002;n.release.value=.1}else{n.threshold.value=0;n.knee.value=0;n.ratio.value=1}}
const irCache=new WeakMap();
function impulse(A){
  if(irCache.has(A))return irCache.get(A);
  /* réverbe naturelle : petit pré-délai, premières réflexions (murs proches), puis queue dont les aigus s'éteignent plus vite que les graves */
  const sr=A.sampleRate,len=Math.round(sr*2.4),b=A.createBuffer(2,len,sr),pre=Math.round(sr*.012);
  for(let c=0;c<2;c++){
    const d=b.getChannelData(c);let lp=0;
    for(let i=pre;i<len;i++){const q=(i-pre)/(len-pre),k=.85-.75*q;lp+=k*((Math.random()*2-1)-lp);d[i]=lp*Math.pow(1-q,2.6)*(1.1+.5*q)}
    for(let r=0;r<9;r++){const at=pre+Math.round(sr*(.004+.075*hash(r*3+c*17))),g=(.55-.04*r)*(hash(r*5+c)>.5?1:-1);if(at<len)d[at]+=g}
  }
  irCache.set(A,b);return b;
}
function buildChain(A,ws){
  const g=A.createGain(),hp=A.createBiquadFilter(),lo=A.createBiquadFilter(),mi=A.createBiquadFilter(),hi=A.createBiquadFilter();
  hp.type='highpass';hp.frequency.value=10;lo.type='lowshelf';lo.frequency.value=180;mi.type='peaking';mi.frequency.value=1400;mi.Q.value=.8;hi.type='highshelf';hi.frequency.value=6000;
  let gate;try{gate=ws===1?new AudioWorkletNode(A,'gate'):A.createGain()}catch(e){gate=A.createGain()}
  const comp=A.createDynamicsCompressor(),mk=A.createGain(),pan=A.createStereoPanner(),dry=A.createGain(),wet=A.createGain(),conv=A.createConvolver(),out=A.createGain();
  comp.threshold.value=0;comp.ratio.value=1;comp.knee.value=0;wet.gain.value=0;
  /* canaux : mono remis en stéréo, puis matrice gauche / droite (0 = G→G, 1 = G→D, 2 = D→G, 3 = D→D) */
  const up=A.createGain();up.channelCount=2;up.channelCountMode='explicit';up.channelInterpretation='speakers';
  const sp=A.createChannelSplitter(2),mg=A.createChannelMerger(2),mx=[0,1,2,3].map(()=>A.createGain());
  g.connect(up);up.connect(sp);sp.connect(mx[0],0);sp.connect(mx[1],0);sp.connect(mx[2],1);sp.connect(mx[3],1);
  mx[0].connect(mg,0,0);mx[1].connect(mg,0,1);mx[2].connect(mg,0,0);mx[3].connect(mg,0,1);mx[1].gain.value=0;mx[2].gain.value=0;
  /* Améliorer la voix : moins de graves sourds, plus de présence, « s » adoucis, un peu d'air */
  const mud=A.createBiquadFilter(),pres=A.createBiquadFilter(),ess=A.createBiquadFilter(),air=A.createBiquadFilter();
  mud.type='peaking';mud.frequency.value=320;mud.Q.value=1;pres.type='peaking';pres.frequency.value=3200;pres.Q.value=.9;
  ess.type='peaking';ess.frequency.value=7200;ess.Q.value=2.5;air.type='highshelf';air.frequency.value=11000;
  const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=A.sampleRate/2;lp.Q.value=.707; // passe-bas réglable (ouvert par défaut)
  mg.connect(hp);hp.connect(lo);lo.connect(mi);mi.connect(hi);hi.connect(mud);mud.connect(pres);pres.connect(ess);ess.connect(air);air.connect(lp);lp.connect(gate);gate.connect(comp);comp.connect(mk);mk.connect(pan);
  pan.connect(dry);dry.connect(out);pan.connect(conv);conv.connect(wet);wet.connect(out);
  return{in:g,g,hp,lo,mi,hi,lp,gate,comp,mk,pan,dry,wet,conv,out,mx,mud,pres,ess,air,sig:''};
}
function chainParams(ch,au){
  au=Object.assign(auDefaults(),au||{});
  const sig=JSON.stringify(au);if(sig===ch.sig)return;ch.sig=sig;
  const e=clamp(+au.enh||0,0,100)/100;
  ch.hp.frequency.value=Math.max(au.hp?90:10,e>0?60+e*30:10,clamp(+au.hpf||0,0,1000));
  if(ch.lp)ch.lp.frequency.value=au.lpf>0?clamp(au.lpf*1000,500,ch.lp.context.sampleRate/2):ch.lp.context.sampleRate/2;
  ch.mi.frequency.value=clamp(+au.midF||1400,200,8000);
  ch.mud.gain.value=-5*e;ch.pres.gain.value=4.5*e;ch.ess.gain.value=-4*e;ch.air.gain.value=3*e;
  const M={st:[1,0,0,1],mono:[.5,.5,.5,.5],ll:[1,1,0,0],rr:[0,0,1,1],swap:[0,1,1,0]}[au.ch]||[1,0,0,1];ch.mx.forEach((x,i)=>{x.gain.value=M[i]});
  ch.lo.gain.value=au.eqL;ch.mi.gain.value=au.eqM;ch.hi.gain.value=au.eqH;
  if(ch.gate.parameters)ch.gate.parameters.get('thr').value=au.nr>0?Math.pow(10,(-60+au.nr*.35)/20):0;
  const c=ch.comp;
  if(au.comp){c.threshold.value=clamp(+au.cThr||-24,-60,0);c.ratio.value=clamp(+au.cRat||4,1,20);c.knee.value=8;c.attack.value=.005;c.release.value=.15;ch.mk.gain.value=1.7}
  else if(e>0){c.threshold.value=-14-e*10;c.ratio.value=1.5+e*2.5;c.knee.value=8;c.attack.value=.006;c.release.value=.18;ch.mk.gain.value=1+e*.5}
  else{c.threshold.value=0;c.ratio.value=1;c.knee.value=0;ch.mk.gain.value=1}
  ch.pan.pan.value=clamp(au.pan/100,-1,1);
  if(au.rev>0&&!ch.conv.buffer)ch.conv.buffer=impulse(ch.conv.context);
  ch.wet.gain.value=au.rev/100*.6;ch.dry.gain.value=1-au.rev/100*.3;
}
function drawVU(){
  const c=$('#vu'),x=c.getContext('2d');x.clearRect(0,0,90,16);
  const b=vuBuf||(vuBuf=new Float32Array(1024));
  [anL,anR].forEach((an,i)=>{
    let w=0;if(an&&playing){an.getFloatTimeDomainData(b);let m=0;for(let j=0;j<b.length;j+=2){const v=Math.abs(b[j]);if(v>m)m=v}w=clamp((20*Math.log10(m||1e-6)+48)/48,0,1)*90}
    vuPk[i]=Math.max(w,vuPk[i]-1.2);
    const g=x.createLinearGradient(0,0,90,0);g.addColorStop(0,'#22c55e');g.addColorStop(.72,'#facc15');g.addColorStop(1,'#ef4444');
    x.fillStyle='rgba(255,255,255,.08)';x.fillRect(0,i*9,90,7);x.fillStyle=g;x.fillRect(0,i*9,w,7);
    if(vuPk[i]>1){x.fillStyle='#fff';x.fillRect(Math.min(88.5,vuPk[i]),i*9,1.5,7)}
  });
}
$('#insp').addEventListener('input',e=>{if(e.target.dataset.proj==='mvol'){masterVol=+e.target.value;if(master)master.gain.value=masterVol/100;const sp=e.target.previousElementSibling.querySelector('span');if(sp)sp.textContent=masterVol+' %'}});
$('#insp').addEventListener('change',e=>{const p=e.target.dataset.proj;if(p==='mvol')autosave();if(p==='lim'){masterLim=e.target.checked;if(limN)limiterSet(limN);autosave()}});
/* normaliser : volume réglé pour une voix / musique bien audible sans saturer */

/* ---------- Nettoyer la voix (Clean Voice) : réduction locale du bruit de fond, jamais destructive ---------- */
const DENOISE_SRC="\nfunction plan(N){const rev=new Uint32Array(N),cs=new Float32Array(N/2),sn=new Float32Array(N/2),bits=Math.log2(N);\n  for(let i=0;i<N;i++){let r=0,x=i;for(let b=0;b<bits;b++){r=(r<<1)|(x&1);x>>=1}rev[i]=r}\n  for(let i=0;i<N/2;i++){cs[i]=Math.cos(2*Math.PI*i/N);sn[i]=-Math.sin(2*Math.PI*i/N)}\n  return{N,rev,cs,sn}}\nfunction fft(p,re,im,inv){const N=p.N,rev=p.rev,cs=p.cs,sn=p.sn;\n  for(let i=0;i<N;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}\n  for(let size=2;size<=N;size<<=1){const half=size>>1,step=N/size;\n    for(let i=0;i<N;i+=size)for(let j=0,k=0;j<half;j++,k+=step){\n      const wr=cs[k],wi=inv?-sn[k]:sn[k],a=i+j,b=a+half,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;\n      re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}\n  if(inv)for(let i=0;i<N;i++){re[i]/=N;im[i]/=N}}\nconst LV={light:{ns:1.0,dd:.97,floor:.3},normal:{ns:1.3,dd:.97,floor:.18},strong:{ns:1.8,dd:.97,floor:.1}};\nfunction denoise(x,P,tick){\n  const N=2048,H=512,B=N/2+1,len=x.length,pl=plan(N),win=new Float32Array(N);\n  for(let i=0;i<N;i++)win[i]=Math.sqrt(.5-.5*Math.cos(2*Math.PI*(i+.5)/N));\n  const xp=new Float32Array(len+3*N);xp.set(x,N);\n  const nF=Math.floor((len+N)/H)+1,re=new Float32Array(N),im=new Float32Array(N);\n  // 1) profil du bruit : les images les plus calmes (15 % les plus faibles)\n  const rms=new Float32Array(nF);\n  for(let i=0;i<nF;i++){let e=0;const s=i*H;for(let n=0;n<N;n+=4){const v=xp[s+n];e+=v*v}rms[i]=e}\n  const idx=Array.from(rms.keys()).filter(i=>i*H>=N/2&&i*H<len).sort((a,b)=>rms[a]-rms[b]);\n  const take=Math.max(8,Math.min(400,Math.floor(idx.length*.15))),noise=new Float32Array(B);\n  for(let t=0;t<take&&t<idx.length;t++){const s=idx[t]*H;for(let n=0;n<N;n++){re[n]=xp[s+n]*win[n];im[n]=0}fft(pl,re,im,false);for(let k=0;k<B;k++)noise[k]+=Math.hypot(re[k],im[k])}\n  const nt=Math.max(1,Math.min(take,idx.length));for(let k=0;k<B;k++)noise[k]=noise[k]/nt+1e-9;\n  // 2) traitement\n  const out=new Float32Array(len+3*N),gp=new Float32Array(B).fill(1),g=new Float32Array(B),pa=new Float32Array(B);\n  for(let i=0;i<nF;i++){\n    const s=i*H;for(let n=0;n<N;n++){re[n]=xp[s+n]*win[n];im[n]=0}\n    fft(pl,re,im,false);\n    for(let k=0;k<B;k++){const mag=Math.hypot(re[k],im[k]),nk=noise[k]*P.ns,n2=nk*nk,xi=P.dd*pa[k]/n2+(1-P.dd)*Math.max(mag*mag/n2-1,0);\n      let v=xi/(1+xi);if(v<P.floor)v=P.floor;g[k]=v;pa[k]=v*v*mag*mag}\n    for(let k=0;k<B;k++){const v=(g[k>0?k-1:0]+2*g[k]+g[k<B-1?k+1:B-1])/4,a=v<gp[k]?.2:.7,sm=a*gp[k]+(1-a)*v;gp[k]=sm;\n      re[k]*=sm;im[k]*=sm;if(k>0&&k<B-1){re[N-k]*=sm;im[N-k]*=sm}}\n    fft(pl,re,im,true);\n    for(let n=0;n<N;n++)out[s+n]+=re[n]*win[n]*.5;\n    if(i%200===0)tick(i/nF)}\n  return out.subarray(N,N+len)}\nself.onmessage=e=>{const{chs,lv}=e.data,P=LV[lv]||LV.normal,res=[];\n  try{chs.forEach((x,c)=>{res.push(denoise(x,P,p=>self.postMessage({p:(c+p)/chs.length})))});\n    self.postMessage({out:res},res.map(r=>r.buffer))}catch(err){self.postMessage({error:String(err&&err.message||err)})}};\n";
let cleanLv='normal',cleanBusy=false;
function wavFromChannels(chs,sr){
  const n=chs[0].length,nc=chs.length,buf=new ArrayBuffer(44+n*nc*2),v=new DataView(buf);
  const ws=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  ws(0,'RIFF');v.setUint32(4,36+n*nc*2,true);ws(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*nc*2,true);v.setUint16(32,nc*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*nc*2,true);
  let o=44;for(let i=0;i<n;i++)for(let c=0;c<nc;c++){v.setInt16(o,clamp(chs[c][i],-1,1)*32767,true);o+=2}
  return new Blob([buf],{type:'audio/wav'});
}
function runDenoise(chs,lv,onP){
  return new Promise((res,rej)=>{
    const w=new Worker(URL.createObjectURL(new Blob([DENOISE_SRC],{type:'application/javascript'})));
    w.onmessage=e=>{if(e.data.p!=null)onP(e.data.p);else if(e.data.error){w.terminate();rej(new Error(e.data.error))}else{w.terminate();res(e.data.out)}};
    w.onerror=e=>{w.terminate();rej(new Error(e.message||'worker'))};
    w.postMessage({chs,lv},chs.map(c=>c.buffer));
  });
}
async function cleanVoice(c,lv){
  if(cleanBusy)return;
  const m=c&&c.mid&&mById(c.mid);
  if(!m||m.type==='image'){toast(T('clean.noAudio'));return}
  const buf=await decodeAudio(m);
  if(!buf){toast(T('clean.noAudio'));return}
  if(buf.duration>900){toast(T('clean.tooLong'));return}
  cleanBusy=true;
  const pct=q=>{const e=$('#cleanPct');if(e)e.textContent=T('clean.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})};
  pct(0);
  try{
    const chs=[];for(let i=0;i<Math.min(2,buf.numberOfChannels);i++)chs.push(buf.getChannelData(i).slice());
    const out=await runDenoise(chs,lv,pct);
    const base=m.name.replace(/\.[^.]+$/,'');
    const nm=await addGenerated(new File([wavFromChannels(out,buf.sampleRate)],base+' ('+T('clean.suffix')+').wav',{type:'audio/wav'}));
    nm.duration=buf.duration;
    if(m.type==='video'){ // vidéo : le son nettoyé devient un clip audio, le son d'origine de la vidéo est coupé
      const ac=newClip({track:tk('audio'),mid:nm.id,start:c.start,dur:c.dur,in:c.in,p:{vol:c.p.vol??100,rate:c.p.rate||1,rev:!!c.p.rev,cleanFrom:{clip:c.id,vol:c.p.vol??100}}});
      c.p.vol=0;clips.push(ac);sel=ac.id;
    }else{c.p.cleanOrig=c.mid;c.mid=nm.id}
    commit();refresh();toast(T('clean.done'));
  }catch(e){toast(T('clean.error',{error:String((e&&e.message)||e)}))}
  cleanBusy=false;
}
function restoreClean(c){
  if(c.p.cleanFrom){ // clip audio créé à partir d'une vidéo : on le retire et on rend le son à la vidéo
    const v=clips.find(x=>x.id===c.p.cleanFrom.clip);
    if(v)v.p.vol=c.p.cleanFrom.vol;
    clips=clips.filter(x=>x!==c);sel=v?v.id:null;
  }else if(c.p.cleanOrig&&mById(c.p.cleanOrig)){c.mid=c.p.cleanOrig;delete c.p.cleanOrig}
  commit();refresh();toast(T('clean.reverted'));
}

/* ---------- Recadrage automatique : le cadre suit ce qui bouge et les visages ----------
   Pas d'intelligence artificielle téléchargée : on mesure, toutes les 0,5 s, où se trouvent le mouvement, les zones de couleur de peau
   (détection simple de visages / mains) et les contrastes, puis on déplace le cadre (images clés de position) pour les garder à l'écran. */
let reframeBusy=false;
/* détecteur de visages (MediaPipe BlazeFace, Apache-2.0, 100 % local, fichiers livrés dans vendor/mediapipe) */
let faceDet;
async function faceDetector(){
  if(faceDet!==undefined)return faceDet;
  try{
    const base=new URL('vendor/mediapipe/',document.baseURI).href,mod=await import(base+'vision_bundle.mjs'),fs=await mod.FilesetResolver.forVisionTasks(base.replace(/\/$/,''));
    faceDet=await mod.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:base+'blaze_face_short_range.tflite',delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:.5});
  }catch(e){console.warn('visages indisponibles',e);faceDet=null}
  return faceDet;
}
async function reframeAnalyze(c,onP){
  const m=mById(c.mid),rate=c.p.rate||1,r=new SeekReader(m),step=.5,n=Math.max(2,Math.ceil(c.dur/step)+1),sw=64;
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true}),pts=[];
  let prev=null,sh=0,vw=0,vh=0,lastFace=null,faceN=0;const det=await faceDetector();
  try{
    for(let i=0;i<n;i++){
      const tl=Math.min(c.dur,i*step),src=Math.min(c.in+tl*rate,Math.max(0,(m.duration||1e9)-.05));
      const el=await r.frameAt(src);
      vw=el.videoWidth;vh=el.videoHeight;if(!vw||!vh)continue;
      if(!sh){sh=Math.max(8,Math.round(sw*vh/vw));cv.width=sw;cv.height=sh}
      cx.drawImage(el,0,0,sw,sh);
      const d=cx.getImageData(0,0,sw,sh).data,Y=new Float32Array(sw*sh);
      for(let k=0;k<sw*sh;k++)Y[k]=.299*d[k*4]+.587*d[k*4+1]+.114*d[k*4+2];
      let tot=0,sx=0,sy=0;
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
        const k=y*sw+x,R=d[k*4],G=d[k*4+1],B=d[k*4+2],cb=128-.168736*R-.331264*G+.5*B,cr=128+.5*R-.418688*G-.081312*B;
        const skin=Y[k]>50&&cb>77&&cb<127&&cr>133&&cr<173?1:0;
        const mot=prev?Math.abs(Y[k]-prev[k])/255:0;
        const gr=x<sw-1&&y<sh-1?(Math.abs(Y[k]-Y[k+1])+Math.abs(Y[k]-Y[k+sw]))/255:0;
        const ctr=.15*Math.exp(-(Math.pow(x/sw-.5,2)+Math.pow(y/sh-.5,2))/.18);
        const w=Math.pow(2*skin+3*mot+.8*gr+ctr,1.5);
        tot+=w;sx+=w*(x+.5)/sw;sy+=w*(y+.5)/sh;
      }
      let px=tot>0?sx/tot:.5,py=tot>0?sy/tot:.5;
      if(det){
        let best=null;
        try{for(const f of det.detect(el).detections){const b=f.boundingBox,fx=(b.originX+b.width/2)/vw,fy=(b.originY+b.height/2)/vh,a=b.width*b.height/(vw*vh),d=lastFace?Math.hypot(fx-lastFace.x,fy-lastFace.y):0,sc=a/(1+6*d);if(!best||sc>best.sc)best={x:fx,y:fy,sc}}}catch(e){}
        if(best){lastFace={x:best.x,y:best.y,t:tl};faceN++}
        // pas de visage sur cette image : on garde le dernier vu pendant 1,5 s, sinon on suit le mouvement
        if(lastFace&&tl-lastFace.t<=1.5){px=lastFace.x;py=lastFace.y}
      }
      pts.push({t:tl,x:px,y:py,w:tot});
      prev=Y;onP(i/n);
      if(i%3===0)await new Promise(r=>setTimeout(r,0));
    }
  }finally{r.close()}
  return{pts,vw,vh,faces:faceN};
}
/** images clés qui suivent le sujet (pts de reframeAnalyze) pour une image de W2 × H2 ; false = rien à recadrer */
function reframeApply(c,pts,vw,vh,W2,H2){
  const sc=Math.max(W2/vw,H2/vh),z=Math.max(100,(c.p.tf&&c.p.tf.zoom)||100),zs=sc*z/100;
  const ox=Math.max(0,(vw*zs-W2)/2),oy=Math.max(0,(vh*zs-H2)/2);
  if(ox<2&&oy<2)return false;
  // lissage (moyenne glissante sur 3 mesures) puis limite de vitesse : le cadre bouge doucement
  const sm=(a,i)=>{const lo=Math.max(0,i-1),hi=Math.min(a.length-1,i+1);let t=0;for(let k=lo;k<=hi;k++)t+=a[k];return t/(hi-lo+1)};
  const ax=pts.map(p=>p.x),ay=pts.map(p=>p.y),sx=ax.map((_,i)=>sm(ax,i)),sy=ay.map((_,i)=>sm(ay,i));
  for(let i=1;i<pts.length;i++){const dt=Math.max(.05,pts[i].t-pts[i-1].t),mx=.35*dt;sx[i]=clamp(sx[i],sx[i-1]-mx,sx[i-1]+mx);sy[i]=clamp(sy[i],sy[i-1]-mx,sy[i-1]+mx)}
  const base=Object.fromEntries(KFK(c).map(k=>[k,gv(c,k)])),kf=[];
  pts.forEach((p,i)=>{
    const px=ox>0?clamp(-(sx[i]-.5)*vw*zs,-ox,ox):0,py=oy>0?clamp(-(sy[i]-.5)*vh*zs,-oy,oy):0;
    kf.push({t:p.t,v:{...base,'p.tf.zoom':z,'p.tf.x':Math.round(px/W2*1000)/10,'p.tf.y':Math.round(py/H2*1000)/10}});
  });
  if(kf[kf.length-1].t<c.dur)kf.push({t:c.dur,v:{...kf[kf.length-1].v}});
  c.p.fit='cover';c.p.tf=Object.assign({zoom:z,x:0,y:0,rot:0,flip:false},c.p.tf||{},{zoom:z});
  c.kf=kf;return true;
}
async function autoReframe(c){
  if(reframeBusy)return;
  const m=c&&c.mid&&mById(c.mid);
  if(!isVid(c)||c.gen||!m||m.type!=='video'){toast(T('reframe.notVideo'));return}
  reframeBusy=true;
  const pct=q=>{const e=$('#reframePct');if(e)e.textContent=T('reframe.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})};
  pct(0);
  try{
    const{pts,vw,vh,faces}=await reframeAnalyze(c,pct);
    if(pts.length<2||!vw){toast(T('reframe.error',{error:'video'}));reframeBusy=false;return}
    if(!reframeApply(c,pts,vw,vh,W,H)){toast(T('reframe.noNeed'));reframeBusy=false;return}
    commit();refresh();toast(T(faces>pts.length*.2?'reframe.doneFace':'reframe.done'));
  }catch(e){toast(T('reframe.error',{error:String((e&&e.message)||e)}))}
  reframeBusy=false;
}
/* ---------- détection de scènes : propose des coupes, rien n'est coupé sans validation ---------- */
let scnPrev=null,scnBusy=false;
const scnKey=c=>[c.start,c.in,c.dur,c.p.rate||1,c.track].join('|');
function scnValid(){if(!scnPrev)return null;const c=clips.find(x=>x.id===scnPrev.cid);if(!c||scnKey(c)!==scnPrev.key){scnDrop();return null}return scnPrev}
function scnDrop(){if(!scnPrev)return;const a=scnPrev.times;markers=markers.filter(t=>!a.some(x=>Math.abs(x-t)<.001));scnPrev=null}
function scnBox(c){const s=scnValid();if(!s||s.cid!==c.id)return'';
  return`<div class="silprev"><b>${T('scene.preview',{count:s.times.length})}</b><div class="pre" style="margin:6px 0 0"><button class="pri" data-act="scnApply">${T('scene.apply')}</button><button data-act="scnCancel">${T('common.cancel')}</button></div></div>`}
function scnCancel(){scnDrop();autosave();renderTL();renderInspector()}
function scnApply(){const s=scnValid();if(!s)return;const c=clips.find(x=>x.id===s.cid),times=s.times.slice().sort((a,b)=>a-b);
  const grp=[c,...clips.filter(x=>x!==c&&x.mid===c.mid&&Math.abs(x.start-c.start)<.01&&Math.abs(x.in-c.in)<.01&&Math.abs(x.dur-c.dur)<.01)];
  scnDrop();let n=0;
  for(const t of times){let hit=false;for(const g of grp){const p=clips.find(x=>x.mid===g.mid&&x.track===g.track&&t>x.start+.05&&t<x.start+x.dur-.05);if(p){splitAt(p,t);hit=true}}if(hit)n++}
  commit();refresh();toast(T('scene.done',{count:n}))}
async function detectScenes(c){
  if(scnBusy)return;
  const m=c&&c.mid&&mById(c.mid);
  if(!isVid(c)||c.gen||!m||m.type!=='video'){toast(T('reframe.notVideo'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  scnBusy=true;scnDrop();
  const pct=q=>{const e=$('#scnPct');if(e)e.textContent=T('scene.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})};
  pct(0);const r=new SeekReader(m);
  try{
    const rate=c.p.rate||1,step=.2,n=Math.max(2,Math.ceil(c.dur/step)+1),sw=48,cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true}),ds=[];
    let prev=null,sh=0;
    for(let i=0;i<n;i++){
      const tl=Math.min(c.dur,i*step),src=Math.min(c.in+tl*rate,Math.max(0,(m.duration||1e9)-.05)),el=await r.frameAt(src);
      if(!el.videoWidth)continue;
      if(!sh){sh=Math.max(8,Math.round(sw*el.videoHeight/el.videoWidth));cv.width=sw;cv.height=sh}
      cx.drawImage(el,0,0,sw,sh);const d=cx.getImageData(0,0,sw,sh).data;let df=0;
      if(prev){for(let k=0;k<d.length;k+=4)df+=Math.abs(d[k]-prev[k])+Math.abs(d[k+1]-prev[k+1])+Math.abs(d[k+2]-prev[k+2]);df/=(d.length/4)*3*255}
      ds.push({t:tl,d:df});prev=d;pct(i/n);if(i%4===0)await new Promise(r2=>setTimeout(r2,0));
    }
    // un vrai changement de plan = saut net, bien plus grand que les mesures voisines (un mouvement de caméra ne l'est pas)
    const times=[];let last=-1e9;
    for(let i=1;i<ds.length;i++){
      let s=0,k=0;for(let j=Math.max(1,i-5);j<=Math.min(ds.length-1,i+5);j++)if(j!==i){s+=ds[j].d;k++}
      const loc=k?s/k:0;
      if(ds[i].d>.14&&ds[i].d>loc*3.5&&ds[i].t-last>=1&&ds[i].t>.5&&c.dur-ds[i].t>.5){times.push(c.start+ds[i].t);last=ds[i].t}
    }
    if(!times.length){toast(T('scene.none'));scnBusy=false;renderInspector();return}
    markers=[...markers,...times].sort((a,b)=>a-b);
    scnPrev={cid:c.id,key:scnKey(c),times};sel=c.id;autosave();renderTL();renderInspector();
  }catch(e){toast(T('scene.error',{error:String((e&&e.message)||e)}))}
  r.close();scnBusy=false;
}
/* ---------- zoom automatique : petit zoom à chaque nouvelle phrase (Shorts / TikTok) ---------- */
async function autoZoom(c){
  const m=c&&c.mid&&mById(c.mid);
  if(!isVid(c)||c.gen||!m||m.type!=='video'){toast(T('reframe.notVideo'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  try{
    const rate=c.p.rate||1,starts=[];
    const buf=await decodeAudio(m);
    if(buf){
      const sr=buf.sampleRate,W2=.05,win=Math.round(sr*W2),a0=c.in,n=Math.max(1,Math.ceil(c.dur*rate/W2)),thr=Math.pow(10,-38/20),ch=buf.getChannelData(0);
      let quiet=99,vol=false;
      for(let i=0;i<n;i++){const s0=Math.floor(a0*sr)+i*win;let sum=0,k=0;for(let j=s0,e=Math.min(s0+win,ch.length);j<e;j+=2){sum+=ch[j]*ch[j];k++}
        const loud=k&&Math.sqrt(sum/k)>thr;
        if(loud){if(quiet>=.45&&(!starts.length||(i*W2/rate)-starts[starts.length-1]>=2))starts.push(i*W2/rate);quiet=0;vol=true}else quiet+=W2}
      if(!vol)starts.length=0;
    }
    let msg=null;
    if(!starts.length){for(let t=0;t<c.dur-1;t+=3)starts.push(t);msg=T('azoom.noSpeech')}
    const base=Math.max(100,(c.p.tf&&c.p.tf.zoom)||100),lv=[base*1.15,base,base*1.2,base],ts=starts.filter(t=>t<c.dur-.3);
    // le zoom change en 0,3 s au début de chaque phrase, puis reste fixe
    const zAt=t=>{let z=base;ts.forEach((s,i)=>{const to=lv[i%lv.length],from=i?lv[(i-1)%lv.length]:base,u=clamp((t-s)/.3,0,1);if(t>=s)z=from+(to-from)*u*u*(3-2*u)});return z};
    const T0=new Set([0,c.dur]);ts.forEach(s=>{T0.add(s);T0.add(Math.min(c.dur,s+.3));T0.add(Math.max(0,s-.01))});(c.kf||[]).forEach(k=>T0.add(k.t));
    const keys=KFK(c),kf=[...T0].sort((a,b)=>a-b).map(t=>{const v={};keys.forEach(k=>{v[k]=k==='p.tf.zoom'?Math.round(zAt(t)*10)/10:kfVal(c,k,t)});return{t:Math.round(t*1000)/1000,v}});
    c.p.fit=c.p.fit==='contain'?'cover':c.p.fit;c.p.tf=Object.assign({zoom:base,x:0,y:0,rot:0,flip:false},c.p.tf||{});
    c.kf=kf;commit();refresh();toast(T('azoom.done',{count:ts.length}));if(msg)setTimeout(()=>toast(msg),1800);
  }catch(e){toast(T('azoom.error',{error:String((e&&e.message)||e)}))}
}
/* ---------- proxys vidéo : copie légère (480 p) pour un aperçu fluide ; l'export utilise toujours l'original ---------- */
const PX_SHORT=480,PX_AUTO_W=1900;
let pxQ=Promise.resolve(),pxOff=false;const pxBusy=new Map();
const pxMap=()=>{try{return JSON.parse(localStorage.getItem('dedcut-px')||'{}')}catch(e){return{}}};
const pxSave=o=>{try{localStorage.setItem('dedcut-px',JSON.stringify(o))}catch(e){}};
function pxLookup(m){
  if(m.proxyUrl!==undefined||!FS||!m.path||m.type!=='video')return;
  const e=pxMap()[m.path];m.proxyUrl=null;
  if(e&&e.p&&(!e.size||!m.size||e.size===m.size)){m.proxy=e.p;m.proxyUrl=FS.fileUrl(e.p)}
}
const pxUrl=m=>(!pxOff&&m.proxyUrl)||m.url;
function pxSetEls(m,url){
  const out=[];
  for(const c of clips){
    if(c.mid!==m.id)continue;const el=els.get(c.id);if(!el||el.tagName!=='VIDEO'||el._src===url)continue;
    const t=el.currentTime,was=!el.paused;el._src=url;el.src=url;out.push(el);
    el.addEventListener('loadedmetadata',()=>{try{el.currentTime=t}catch(e){}if(was)el.play().catch(()=>{})},{once:true});
  }
  return out;
}
/* off=true : on remet les vidéos d'origine (export en temps réel, capture d'image) ; attend qu'elles soient prêtes */
async function pxSwap(off){
  pxOff=off;const all=[];
  for(const m of media)if(m.proxyUrl)all.push(...pxSetEls(m,pxUrl(m)));
  const t0=performance.now();
  while(all.some(e=>e.readyState<2||e.seeking)&&performance.now()-t0<4000)await new Promise(r=>setTimeout(r,60));
  if(all.length)await new Promise(r=>setTimeout(r,150));
}
function pxAuto(m){
  pxLookup(m);
  if(m.proxyUrl||!FS||!m.path||m.type!=='video'||pxBusy.has(m.id))return;
  if(Math.max(m.w||0,m.h||0)>=(window.lowPC?1200:PX_AUTO_W)){toast(T('proxy.auto'));pxQ=pxQ.then(()=>makeProxy(m)).catch(()=>{})}
}
function pxToggle(id){
  const m=mById(id);if(!m||m.type!=='video')return;
  if(m.proxyUrl){const o=pxMap();delete o[m.path];pxSave(o);m.proxyUrl=null;m.proxy=null;pxSetEls(m,m.url);renderBin();return}
  if(Math.min(m.w||0,m.h||0)<=PX_SHORT*1.25){toast(T('proxy.tooSmall'));return}
  pxQ=pxQ.then(()=>makeProxy(m)).catch(()=>{});
}
async function makeProxy(m){
  if(!FS||!m.path||m.type!=='video'||m.proxyUrl||pxBusy.has(m.id)||!window.VideoEncoder||!window.Mp4Muxer||!m.w||!m.h)return;
  pxBusy.set(m.id,0);renderBin();
  let r=null,venc=null,aenc=null;
  try{
    const k=PX_SHORT/Math.min(m.w,m.h);if(k>=1)throw new Error(T('proxy.tooSmall'));
    const w=Math.max(2,Math.round(m.w*k/2)*2),h=Math.max(2,Math.round(m.h*k/2)*2),fps=30,N=Math.max(1,Math.floor(Math.min(m.duration,10800)*fps));
    const d=await demux(m);if(!d)throw new Error(T('export.noH264'));
    let vcfg=null;
    for(const codec of['avc1.4d0028','avc1.42002a','avc1.640028']){const c={codec,width:w,height:h,bitrate:Math.round(1.4e6*w*h/(854*480)),framerate:fps,avc:{format:'avc'}};if((await VideoEncoder.isConfigSupported(c).catch(()=>({}))).supported){vcfg=c;break}}
    if(!vcfg)throw new Error(T('export.noH264'));
    const buf=await decodeAudio(m);let acfg=null;
    if(buf){const c={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:96000};if((await AudioEncoder.isConfigSupported(c).catch(()=>({}))).supported)acfg=c}
    const mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:'avc',width:w,height:h,frameRate:fps},audio:acfg?{codec:'aac',numberOfChannels:2,sampleRate:48000}:undefined,fastStart:'in-memory',firstTimestampBehavior:'offset'});
    let err=null;venc=new VideoEncoder({output:(ch,meta)=>mux.addVideoChunk(ch,meta),error:e=>err=e});venc.configure(vcfg);
    const cv2=document.createElement('canvas');cv2.width=w;cv2.height=h;const cx=cv2.getContext('2d');
    r=new FrameReader(d,0);
    for(let i=0;i<N;i++){
      const img=await r.frameAt(i/fps);if(!img)break;
      cx.drawImage(img,0,0,w,h);
      const vf=new VideoFrame(cv2,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});venc.encode(vf,{keyFrame:i%15===0});vf.close();
      if(err)throw err;
      if(venc.encodeQueueSize>6)await new Promise(q=>{venc.addEventListener('dequeue',q,{once:true});setTimeout(q,250)});
      if(i%10===0){pxBusy.set(m.id,i/N);const e=$('#px'+m.id);if(e)e.textContent=T('proxy.working',{pct:window.i18n.fmt.percent(i/N)});await yieldUI()}
    }
    r.close();r=null;await venc.flush();venc.close();venc=null;if(err)throw err;
    if(acfg){
      aenc=new AudioEncoder({output:(ch,meta)=>mux.addAudioChunk(ch,meta),error:e=>err=e});aenc.configure(acfg);
      const Lc=buf.getChannelData(0),Rc=buf.numberOfChannels>1?buf.getChannelData(1):Lc,n=buf.length,B=4800;
      for(let i=0;i<n;i+=B){const kk=Math.min(B,n-i),dd=new Float32Array(kk*2);dd.set(Lc.subarray(i,i+kk),0);dd.set(Rc.subarray(i,i+kk),kk);
        const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:kk,numberOfChannels:2,timestamp:Math.round(i*1e6/48000),data:dd});aenc.encode(ad);ad.close();
        if(aenc.encodeQueueSize>16)await new Promise(q=>{aenc.addEventListener('dequeue',q,{once:true});setTimeout(q,1000)});if(err)throw err}
      await aenc.flush();aenc.close();aenc=null;if(err)throw err;
    }
    mux.finalize();
    const f=await FS.saveMedia(new Blob([mux.target.buffer],{type:'video/mp4'}),m.name.replace(/\.[^.]+$/,'')+' (proxy).mp4');
    const o=pxMap();o[m.path]={p:f.path,size:m.size||0};pxSave(o);
    m.proxy=f.path;m.proxyUrl=FS.fileUrl(f.path);pxSetEls(m,pxUrl(m));
    toast(T('proxy.ready',{name:m.name}));
  }catch(e){m.proxyUrl=null;toast(T('proxy.error',{name:m.name,error:String((e&&e.message)||e)}))}
  try{if(r)r.close();if(venc)venc.close();if(aenc)aenc.close()}catch(e){}
  pxBusy.delete(m.id);renderBin();
}
async function normalizeClip(c){
  const m=soundClipOk(c);if(!m)return;const buf=await decodeAudio(m);if(!buf){toast(T('audio.noSound'));return}
  const sr=buf.sampleRate,rate=c.p.rate||1,a0=Math.floor(c.in*sr),a1=Math.min(buf.length,Math.floor((c.in+c.dur*rate)*sr)),chs=[...Array(buf.numberOfChannels)].map((_,i)=>buf.getChannelData(i)),win=Math.round(sr*.05);
  let pk=0,sum=0,k=0;
  for(let s=a0;s<a1;s+=win){let ws=0,wn=0;for(const d of chs)for(let j=s,e=Math.min(s+win,a1);j<e;j+=2){const v=d[j];ws+=v*v;wn++;const av=Math.abs(v);if(av>pk)pk=av}if(Math.sqrt(ws/Math.max(1,wn))>.003){sum+=ws;k+=wn}}
  if(!k){toast(T('audio.tooQuiet'));return}
  const rms=Math.sqrt(sum/k),gain=Math.min(Math.pow(10,-16/20)/rms,.97/Math.max(pk,1e-4)*(masterLim?1.25:1));
  c.p.vol=Math.round(clamp(gain*100,5,400));delete c.kf;commit();renderInspector();toast(T('audio.volumeSet',{vol:c.p.vol}));
}
/* baisse automatique de la musique quand quelqu'un parle (images clés de volume) */
async function duckUnderVoice(c){
  const m=soundClipOk(c);if(!m)return;
  const others=clips.filter(x=>{if(x===c||!x.mid||trk(x).mute||(x.p.vol??100)<=0)return false;const mm=mById(x.mid);return mm&&mm.type!=='image'&&x.start<c.start+c.dur&&x.start+x.dur>c.start});
  if(!others.length){toast(T('audio.noVoice'));return}
  toast(T('audio.voiceAnalyzing'));
  const step=.05,n=Math.max(1,Math.ceil(c.dur/step)),env=new Float32Array(n);
  for(const x of others){
    const b=await decodeAudio(mById(x.mid));if(!b)continue;const sr=b.sampleRate,d=b.getChannelData(0),r=x.p.rate||1;
    for(let i=0;i<n;i++){const t=c.start+i*step;if(t<x.start||t>=x.start+x.dur)continue;const s0=Math.floor(((t-x.start)*r+x.in)*sr),s1=Math.min(d.length,s0+Math.floor(step*sr*r));let ss=0,k=0;for(let j=Math.max(0,s0);j<s1;j+=4){ss+=d[j]*d[j];k++}if(k)env[i]=Math.max(env[i],Math.sqrt(ss/k)*(x.p.vol??100)/100)}
  }
  const thr=Math.pow(10,-36/20),act=new Uint8Array(n);
  for(let i=0;i<n;i++)if(env[i]>thr)for(let j=Math.max(0,i-3);j<Math.min(n,i+10);j++)act[j]=1;
  if(!act.some(Boolean)){toast(T('audio.noVoiceDetected'));return}
  const base=gv(c,'p.vol'),low=Math.round(base*.25),kf=[];let prev=-1;
  for(let i=0;i<n;i++){if(act[i]===prev)continue;const t=i*step,v=act[i]?low:base;if(prev<0)kf.push({t:0,v:{'p.vol':v}});else{kf.push({t:Math.max(0,t-.25),v:{'p.vol':prev?low:base}});kf.push({t,v:{'p.vol':v}})}prev=act[i]}
  kf.push({t:c.dur,v:{'p.vol':prev?low:base}});kf.sort((a,b)=>a.t-b.t);
  c.kf=kf.filter((k,i)=>!i||k.t-kf[i-1].t>.01);commit();refresh();toast(T('audio.ducked'));
}
/* voix off */
let vo=null;
async function voMics(){
  const d=(await navigator.mediaDevices.enumerateDevices().catch(()=>[])).filter(x=>x.kind==='audioinput'&&x.deviceId!=='communications'&&x.deviceId!=='default');
  const s=$('#voMic'),cur=s.value;
  s.innerHTML='<option value="">'+T('rec.defaultMic')+'</option>'+d.map((x,i)=>'<option value="'+esc(x.deviceId)+'">'+esc(x.label||T('rec.micN',{n:i+1}))+'</option>').join('');
  if(d.some(x=>x.deviceId===cur))s.value=cur;
}
function voBtn(on){$('#voGo').classList.toggle('stop',on);$('#voGo').lastChild.textContent=on?T('vo.stop'):T('vo.record')}
async function voToggle(){
  if(vo)return voStop();
  let st;const id=$('#voMic').value;
  try{st=await navigator.mediaDevices.getUserMedia({audio:Object.assign({echoCancellation:true,noiseSuppression:true,autoGainControl:true},id?{deviceId:{exact:id}}:{})})}catch(e){toast(T('vo.micUnavailable'));return}
  voMics();
  const mt=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m)),r=new MediaRecorder(st,{mimeType:mt,audioBitsPerSecond:160000}),ch=[];
  r.ondataavailable=e=>{if(e.data.size)ch.push(e.data)};
  vo={st,r,ch,mt,t0:time};r.start(500);voBtn(true);
  ensureAudio();if(!$('#voListen').checked)spk.gain.value=0;
  if(clips.length)play();
}
async function voStop(){
  const o=vo;if(!o)return;vo=null;pause();if(spk)spk.gain.value=1;voBtn(false);
  await new Promise(r=>{o.r.onstop=r;o.r.stop()});o.st.getTracks().forEach(t=>t.stop());
  const f=new File(o.ch,T('vo.filePrefix')+' '+fmtTC(o.t0).replace(/:/g,'-')+(o.mt.includes('mp4')?'.m4a':'.webm'),{type:o.mt.split(';')[0]});
  const m=await addGenerated(f);if(!m)return;
  await waitMeta([m]);
  add(newClip({track:tk('audio'),mid:m.id,start:o.t0,dur:isFinite(m.duration)?m.duration:1,p:{vol:100,au:Object.assign(auDefaults(),AUPRE.voix.v)}}));
  toast(T('vo.added'));
}
$('#voGo').onclick=voToggle;

/* ---------- Extras du live (v4.42) ----------
   - Alertes de dons : Streamlabs (Socket API) et StreamElements (Astro), avec le jeton de la personne, gardé sur son PC ;
   - Sous-titres en direct : la voix du micro passe par Whisper (modèle déjà téléchargé dans Montage > Sous-titres), sur le PC ;
   - Réduction de bruit du micro par IA : RNNoise (bibliothèque libre, public/vendor/rnnoise) ;
   - Résumé après le live : durée, messages, alertes, spectateurs, moments forts (gardé dans un historique) ;
   - Clips automatiques : les 30 dernières secondes sont enregistrées dans le Montage après un raid, un don, un pic du chat… ;
   - Marqueur (Ctrl+Maj+M) pendant le live ou l'enregistrement ;
   - Pistes audio séparées à l'enregistrement : son du PC, micro et musique en fichiers .m4a à part. */
ICO.close='<path d="M6 6l12 12M18 6L6 18"/>';
const lxCap=window.dedcutCaptions&&window.dedcutCaptions.transcribe?window.dedcutCaptions:null; // pris avant que l'onglet Sous-titres ne le remplace
const LX_DEF=()=>({cap:{lang:'',size:4.4},clips:{on:true,raid:true,sub:false,gift:true,bits:true,tip:true,chat:true,mark:true},tracks:false});
let lxFilled=null;
function lxCfg(){if(lxFilled!==stData){const d=LX_DEF(),c=stData.lx||(stData.lx={});for(const k in d)c[k]=typeof d[k]==='object'?Object.assign(d[k],c[k]):(c[k]??d[k]);lxFilled=stData}return stData.lx}
ST_AL_COL.tip='#10b981';
ST_AL_TEST.push(['tip','','5,00 €']);
const lxMoney=(v,cur)=>{const n=Number(v);if(cur&&isFinite(n)){try{return new Intl.NumberFormat(document.documentElement.lang||undefined,{style:'currency',currency:String(cur).toUpperCase()}).format(n)}catch(e){}}return String(v==null?'':v)+(cur?' '+cur:'')};

/* ---------- (9) dons : Streamlabs et StreamElements ---------- */
const lxD={sl:null,se:null,st:{}};
function lxDCfg(){if(!stData.don)stData.don={sl:'',se:''};return stData.don}
function lxDState(k,state,err){lxD.st[k]={state,err:err||''};const el=$('#lxDonSt');if(el)el.innerHTML=lxDonStHTML()}
const lxDonStHTML=()=>Object.entries(lxD.st).map(([k,s])=>`<span class="stcs ${s.state}"><i class="stsrc" style="background:${k==='sl'?'#80f5d2':'#7c5cff'}"></i>${T('lx.don.st_'+s.state,{src:k==='sl'?'Streamlabs':'StreamElements'})}${s.err?' · '+esc(s.err):''}</span>`).join('');
function lxTip(src,name,amount,text){stAlert({src,type:'tip',name:String(name||T('tw.anon')),amount,text:String(text||'')})}
function lxSlOn(){
  lxSlOff();const tok=lxDCfg().sl.trim();if(!tok)return;const S={closed:false,tries:0};lxD.sl=S;
  const open=()=>{
    if(S.closed)return;lxDState('sl','wait');
    const ws=new WebSocket('wss://sockets.streamlabs.com/socket.io/?token='+encodeURIComponent(tok)+'&EIO=3&transport=websocket');S.ws=ws;
    ws.onmessage=e=>{const d=String(e.data);
      if(d[0]==='0'){try{const j=JSON.parse(d.slice(1));clearInterval(S.ping);S.ping=setInterval(()=>{if(ws.readyState===1)ws.send('2')},j.pingInterval||25000)}catch(x){}return}
      if(d==='40'){S.tries=0;lxDState('sl','on');return}
      if(d==='2'){ws.send('3');return}
      if(d.startsWith('44')){S.closed=true;lxDState('sl','err',T('lx.don.badToken'));try{ws.close()}catch(x){}return}
      if(d.startsWith('42')){let a;try{a=JSON.parse(d.slice(2))}catch(x){return}const ev=a&&a[1]||{};
        if(ev.type==='donation')for(const m of[].concat(ev.message||[]))lxTip('streamlabs',m.from||m.name,m.formatted_amount||lxMoney(m.amount,m.currency),m.message)}
    };
    ws.onclose=()=>{clearInterval(S.ping);if(S.closed)return;lxDState('sl','wait');S.tries++;S.timer=setTimeout(open,Math.min(30000,2000*S.tries))};
  };
  open();
}
function lxSlOff(){const S=lxD.sl;if(!S)return;S.closed=true;clearTimeout(S.timer);clearInterval(S.ping);try{S.ws&&S.ws.close()}catch(e){}lxD.sl=null;delete lxD.st.sl}
function lxSeOn(){
  lxSeOff();const tok=lxDCfg().se.trim();if(!tok)return;const S={closed:false,tries:0};lxD.se=S;
  const open=()=>{
    if(S.closed)return;lxDState('se','wait');
    const ws=new WebSocket('wss://astro.streamelements.com');S.ws=ws;
    ws.onopen=()=>ws.send(JSON.stringify({type:'subscribe',nonce:'dc'+Date.now(),data:{topic:'channel.tips',token:tok,token_type:'jwt'}}));
    ws.onmessage=e=>{let j;try{j=JSON.parse(e.data)}catch(x){return}
      if(j.type==='response'){if(j.error){S.closed=true;lxDState('se','err',T('lx.don.badToken'));try{ws.close()}catch(x){}}else{S.tries=0;lxDState('se','on')}return}
      if(j.type==='reconnect'){try{ws.close()}catch(x){}return}
      if(j.type==='message'&&j.topic==='channel.tips'){const d=j.data||{},dn=d.donation||d,u=dn.user||{};
        lxTip('streamelements',u.username||u.name||dn.username||d.username,lxMoney(dn.amount,dn.currency),dn.message)}
    };
    ws.onclose=()=>{if(S.closed)return;lxDState('se','wait');S.tries++;S.timer=setTimeout(open,Math.min(30000,2000*S.tries))};
  };
  open();
}
function lxSeOff(){const S=lxD.se;if(!S)return;S.closed=true;clearTimeout(S.timer);try{S.ws&&S.ws.close()}catch(e){}lxD.se=null;delete lxD.st.se}
const lxDonOn=()=>!!(lxD.sl||lxD.se);

/* ---------- (11) sous-titres en direct (Whisper sur le PC) ---------- */
const lxC={on:false,busy:false,buf:[],len:0,text:'',t:0,model:'',pending:null};
async function lxCapModel(){
  if(!lxCap)return'';const ms=lxCap.models().slice().sort((a,b)=>a.bytes-b.bytes);
  for(const m of ms)try{if(await lxCap.has(m.key))return m.key}catch(e){}
  return'';
}
async function lxCapStart(){
  if(!lxCap){toast(T('msg.onlyInApp'));return}
  await stAudio();const model=await lxCapModel();
  if(!model){toast(T('lx.cap.noModel'));return}
  if(!stData.mic||!st.mic.src)toast(T('lx.cap.noMic'));
  lxC.model=model;lxC.on=true;lxC.buf=[];lxC.len=0;lxC.text='';
  const tap=new AudioWorkletNode(st.ac,'dc-st-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
  const z=st.ac.createGain();z.gain.value=0;st.mic.g.connect(tap);tap.connect(z);z.connect(st.ac.destination);
  tap.port.onmessage=e=>lxCapIn(e.data.l,e.data.r);lxC.tap=tap;lxC.z=z;
  lxRedraw();
}
function lxCapStop(){
  lxC.on=false;lxC.buf=[];lxC.len=0;lxC.text='';
  try{st.mic.g.disconnect(lxC.tap)}catch(e){}try{lxC.tap&&lxC.tap.disconnect()}catch(e){}try{lxC.z&&lxC.z.disconnect()}catch(e){}lxC.tap=null;lxRedraw();
}
const lxRms=(a,from)=>{let s=0,n=0;for(let i=from||0;i<a.length;i++){s+=a[i]*a[i];n++}return n?Math.sqrt(s/n):0};
function lxCapIn(l,r){
  if(!lxC.on)return;const n=Math.floor(l.length/3),o=new Float32Array(n);
  for(let i=0;i<n;i++){const k=i*3;o[i]=(l[k]+l[k+1]+l[k+2]+r[k]+r[k+1]+r[k+2])/6}
  lxC.buf.push(o);lxC.len+=n;const sec=lxC.len/16000;
  // un morceau part quand la personne fait une pause (après 2,5 s de parole) ou au bout de 8 s
  if(sec>=8||(sec>=2.5&&lxCapQuiet()))lxCapFlush();
}
function lxCapQuiet(){let need=Math.round(16000*.45),s=0,n=0;for(let i=lxC.buf.length-1;i>=0&&need>0;i--){const b=lxC.buf[i];for(let k=b.length-1;k>=0&&need>0;k--,need--){s+=b[k]*b[k];n++}}return n&&Math.sqrt(s/n)<.012}
function lxCapFlush(){
  const all=new Float32Array(lxC.len);let p=0;for(const b of lxC.buf){all.set(b,p);p+=b.length}lxC.buf=[];lxC.len=0;
  if(lxRms(all)<.008)return; // silence
  if(lxC.busy){lxC.pending=all;return}
  lxCapRun(all);
}
const LX_HALLU=/amara\.org|sous-titr|subtit|merci d.avoir regard|thanks? for watching|ご視聴|字幕/i;
async function lxCapRun(audio){
  lxC.busy=true;
  try{const lang=lxCfg().cap.lang||(document.documentElement.lang||'').slice(0,2)||undefined;
    const r=await lxCap.transcribe(audio,{model:lxC.model,language:lang});
    const txt=(r.words||[]).map(w=>w.t).join('').replace(/\s+/g,' ').trim();
    if(txt&&txt.length>1&&!LX_HALLU.test(txt)&&!/^[\[(].*[\])]$/.test(txt)){lxC.text=txt;lxC.t=performance.now()}
  }catch(e){}
  lxC.busy=false;if(lxC.pending&&lxC.on){const p=lxC.pending;lxC.pending=null;lxCapRun(p)}
}
ST_KINDS.captions='cc';
ST_NEW.captions={o:()=>({size:4.4,bgp:70,color:'#ffffff'}),r:()=>({x:.08,y:.78,w:.84,h:.15})};
ST_DRAW.captions=(g,it,x,y,w,h)=>{
  const o=it.o,age=performance.now()-lxC.t;
  if(!lxC.text||age>7000){if(!O.live&&!O.rec)stHolder(g,x,y,w,h,T(lxC.on?'lx.cap.listening':'st.k.captions'));return}
  const px=(+o.size||4.4)*st.h/100,lh=px*1.35;g.save();g.font=stFont(px,700);g.textAlign='center';g.textBaseline='middle';
  const lines=stWrap(g,lxC.text,w-px,0).slice(-2),al=Math.min(1,Math.max(0,(7000-age)/600));g.globalAlpha=al;
  lines.forEach((ln,i)=>{const cy=y+h-(lines.length-i)*lh+lh/2,tw=g.measureText(ln).width+px*.9;
    g.fillStyle=stRgba('#000000',(o.bgp==null?70:+o.bgp)/100);g.beginPath();g.roundRect(x+w/2-tw/2,cy-lh/2+px*.06,tw,lh-px*.12,px*.22);g.fill();
    g.fillStyle=o.color||'#fff';g.fillText(ln,x+w/2,cy+px*.03)});
  g.restore();
};
ST_PROPS.captions=it=>{const o=it.o;return`<div class="fld"><label>${T('st.size')} <span>${o.size||4.4}</span></label><input type="range" min="2.5" max="8" step=".1" value="${o.size||4.4}" data-o="size"></div>
  <div class="fld"><label>${T('st.chat.bg')} <span>${o.bgp==null?70:o.bgp}</span></label><input type="range" min="0" max="100" value="${o.bgp==null?70:o.bgp}" data-o="bgp"></div>
  <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#ffffff')}"></div>
  <button class="sm" data-sttab="tools">${ico('cc',14)}${T('cx.openTools')}</button>`};

/* ---------- (14) réduction de bruit du micro par IA (RNNoise) ---------- */
let lxRnn=null,lxRnnP=null;
function lxRnnInit(){
  if(lxRnn||lxRnnP||!st.ac)return lxRnnP||Promise.resolve(lxRnn);
  lxRnnP=(async()=>{
    const simd=WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
    const wasm=await(await fetch('/vendor/rnnoise/'+(simd?'rnnoise_simd.wasm':'rnnoise.wasm'))).arrayBuffer();
    await st.ac.audioWorklet.addModule('/vendor/rnnoise/workletProcessor.js');
    lxRnn=new AudioWorkletNode(st.ac,'@sapphi-red/web-noise-suppressor/rnnoise',{processorOptions:{maxChannels:2,wasmBinary:wasm}});
    return lxRnn;
  })().catch(e=>{lxRnnP=null;toast(T('lx.rnn.fail'));return null});
  return lxRnnP;
}
async function lxRnnWire(){
  if(!st.mic||!st.mic.src)return;const on=!!stData.micfx.rnn;if(on&&!lxRnn)await lxRnnInit();
  const dst=st.gate||st.mic.g;try{st.mic.src.disconnect()}catch(e){}
  if(on&&lxRnn){try{lxRnn.disconnect()}catch(e){}st.mic.src.connect(lxRnn);lxRnn.connect(dst)}else st.mic.src.connect(dst);
}
{const ms=stMicSet;stMicSet=async function(id){await ms(id);if(stData.micfx.rnn)await lxRnnWire()}}
{const mf=stMicFx;stMicFx=function(){mf();if(st.mic&&st.mic.src&&(stData.micfx.rnn||lxRnn))lxRnnWire()}}

/* ---------- (16) (17) (18) statistiques du live, moments forts, clips automatiques, marqueurs ---------- */
let lxS={on:false};
function lxStart(){lxS={on:true,t0:Date.now(),msgs:0,src:{},users:new Map(),al:{},hl:[],peak:{},clips:0,last:[],clipT:0}}
function lxHl(type,label){
  if(!lxS.on)return;const now=Date.now();lxS.hl.push({t:now,type,label});
  const C=lxCfg().clips;if(!C.on||!C[type]||!O.live)return;
  if(now-lxS.clipT<45000)return;lxS.clipT=now;
  setTimeout(async()=>{try{const m=await stReplaySave();if(m){m.name=label+' · '+m.name;lxS.clips++;if(typeof renderBin==='function')renderBin()}}catch(e){}},type==='mark'?0:8000);
}
function lxMsg(m){
  if(!lxS.on||m.bot)return;lxS.msgs++;lxS.src[m.src]=(lxS.src[m.src]||0)+1;
  const k=m.src+':'+m.name;lxS.users.set(k,{n:m.name,src:m.src,c:((lxS.users.get(k)||{}).c||0)+1});
  // pic du chat : beaucoup plus de messages que d'habitude en 10 s
  const now=Date.now();lxS.last.push(now);while(lxS.last.length&&now-lxS.last[0]>300000)lxS.last.shift();
  const in10=lxS.last.filter(t=>now-t<10000).length,avg=lxS.last.length/Math.max(1,Math.min(30,(now-lxS.t0)/10000));
  if(in10>=8&&in10>=avg*3&&now-(lxS.spikeT||0)>90000){lxS.spikeT=now;lxHl('chat',T('lx.hl.chat'))}
}
{const ci=stCxIn;stCxIn=function(m){ci(m);try{lxMsg(m)}catch(e){}}}
{const ca=stCxAlert;stCxAlert=function(a){ca(a);if(!lxS.on||wgTesting||a.type==='pin')return;lxS.al[a.type]=(lxS.al[a.type]||0)+1;
  const ty={raid:'raid',sub:'sub',member:'sub',gift:'gift',bits:'bits',tip:'tip',superchat:'tip'}[a.type];
  if(ty)lxHl(ty,T('st.al.'+a.type,{n:a.amount||''}).replace(/\s*!$/,'')+' · '+a.name)}}
setInterval(()=>{if(!lxS.on)return;const v={YouTube:stChat.viewers,Twitch:typeof tw!=='undefined'?tw.viewers:null,Kick:stChat.kickViewers,Facebook:stChat.fbViewers};
  for(const[k,n]of Object.entries(v))if(n!=null&&+n>(lxS.peak[k]||0))lxS.peak[k]=+n},15000);
// marqueur : Ctrl+Maj+M pendant le live (clip des 30 dernières secondes) ou l'enregistrement (repère dans le Montage)
function lxMark(){
  if(O.rec&&O.rec.on){stRecMark();return}
  if(O.live&&O.live.on){toast(T('lx.hl.marked',{time:recClock(O.live.el||0)}));lxHl('mark',T('lx.hl.mark'))}
}
{const rm=stRecMark;stRecMark=function(){rm();if(lxS.on)lxS.hl.push({t:Date.now(),type:'mark',label:T('lx.hl.mark')})}}
let lxKeyOn=false;
setInterval(()=>{const K=window.dedcutKeys;if(!K)return;const want=!!((O.live&&O.live.on)||(O.rec&&O.rec.on));
  if(want!==lxKeyOn){lxKeyOn=want;(want?K.on('CommandOrControl+Shift+M',lxMark):K.off('CommandOrControl+Shift+M')).catch(()=>{})}},1000);
{const ls=stLiveStart;stLiveStart=async function(){await ls();if(O.live&&O.live.on&&!lxS.on)lxStart()}}
{const lt=stLiveStop;stLiveStop=async function(){
  const L=O.live,snap=lxS.on?lxS:null;if(snap)snap.el=L?L.el:0;
  await lt();
  if(snap&&!O.live){snap.on=false;lxS={on:false};lxSummary(snap)}}}
// enregistrement : pistes audio séparées + moments forts du live ajoutés comme repères dans le Montage
{const rs=stRecStart;stRecStart=async function(){await rs();if(O.rec&&O.rec.on&&lxCfg().tracks)lxTracksStart(O.rec)}}
{const re=stRecStop;stRecStop=async function(){
  const R=O.rec;if(!R)return re();const t0=R.t0,n0=clips.length,hl=lxS.on?lxS.hl.slice():[],tr=R.lxTracks;
  if(tr)await lxTracksStop(tr);
  await re();
  const c=clips.slice(n0).find(x=>x.mid);
  if(c&&hl.length){const add=hl.filter(h=>h.type!=='mark').map(h=>c.start+(h.t-t0)/1000).filter(t=>t>c.start&&t<c.start+c.dur);
    if(add.length){markers=[...markers,...add].sort((a,b)=>a-b);commit();refresh()}}
  if(tr&&tr.files.length){const ms=addPaths(tr.files);toast(T('lx.tr.done',{n:ms.length}))}
}}

/* ---------- (19) pistes audio séparées (son du PC, micro, musique) ---------- */
async function lxTracksStart(R){
  const base=R.name.replace(/\.mp4$/i,''),T0={files:[],list:[]};R.lxTracks=T0;
  for(const ch of['desk','mic','music']){
    if(!st[ch]||!st[ch].g)continue;
    const name=base+' - '+T('lx.tr.'+ch)+'.m4a';let disk=null,pos=0,bad=false;
    if(inApp){try{disk=await(await appFetch('app://dedcut/__rec?op=start&ch=t'+ch+'&name='+encodeURIComponent(name),{method:'POST'})).json()}catch(e){disk=null}}
    if(!disk)continue; // seulement dans le logiciel installé (écriture directe sur le disque)
    const K={ch,name,n:0,chain:Promise.resolve(),bad:()=>bad};
    K.mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.StreamTarget({onData:(data,p)=>{const b=data.slice();if(p!==pos)bad=true;pos=p+b.length;
      if(!bad)K.chain=K.chain.then(()=>appFetch('app://dedcut/__rec?op=chunk&ch=t'+ch,{method:'POST',body:b})).then(x=>{if(!x.ok)throw 0}).catch(()=>{bad=true})}}),
      audio:{codec:'aac',numberOfChannels:2,sampleRate:48000},fastStart:'fragmented',minFragmentDuration:1,firstTimestampBehavior:'offset'});
    K.enc=new AudioEncoder({output:(c,m)=>{try{K.mux.addAudioChunk(c,m)}catch(e){}},error:()=>{bad=true}});
    K.enc.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:160000});
    K.tap=new AudioWorkletNode(st.ac,'dc-st-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    K.z=st.ac.createGain();K.z.gain.value=0;st[ch].g.connect(K.tap);K.tap.connect(K.z);K.z.connect(st.ac.destination);
    K.tap.port.onmessage=e=>{if(R.paused||K.enc.state!=='configured')return;const l=e.data.l,r=e.data.r,n=l.length,d=new Float32Array(n*2);d.set(l,0);d.set(r,n);
      const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(K.n*1e6/48000),data:d});K.n+=n;try{K.enc.encode(ad)}catch(x){}ad.close()};
    T0.list.push(K);
  }
  return T0;
}
async function lxTracksStop(T0){
  for(const K of T0.list){
    try{st[K.ch].g.disconnect(K.tap)}catch(e){}try{K.tap.disconnect()}catch(e){}try{K.z.disconnect()}catch(e){}
    try{await K.enc.flush()}catch(e){}try{K.enc.close()}catch(e){}try{K.mux.finalize()}catch(e){}await K.chain;
    try{const e=await(await appFetch('app://dedcut/__rec?op=end&ch=t'+K.ch,{method:'POST'})).json();if(!K.bad()&&e.path&&K.n>0)T0.files.push({path:e.path,name:K.name,size:0})}catch(e){}
  }
}

/* ---------- résumé après le live (et historique) ---------- */
function lxSummary(S){
  const top=[...S.users.values()].sort((a,b)=>b.c-a.c).slice(0,5);
  const rec={t:S.t0,el:S.el||0,msgs:S.msgs,chatters:S.users.size,src:S.src,al:S.al,peak:S.peak,clips:S.clips,top,hl:S.hl.slice(-40).map(h=>({s:Math.round((h.t-S.t0)/1000),type:h.type,label:h.label}))};
  const H=stData.lives||(stData.lives=[]);H.unshift(rec);H.splice(20);stSave();
  lxShowSum(rec);if(stSide==='tools')cxRedraw();
}
function lxShowSum(r){
  let el=$('#lxSum');if(!el){el=document.createElement('div');el.id='lxSum';el.className='lxsum';document.body.appendChild(el)}
  const al=Object.entries(r.al||{}).filter(([k])=>k!=='pin'),pk=Object.entries(r.peak||{});
  const stat=(n,l)=>`<div class="lxst"><b>${n}</b><span>${l}</span></div>`;
  el.innerHTML=`<div class="lxcard"><button class="lxx" data-lxsum="close" title="${esc(T('common.close'))}">${ico('close',16)}</button>
    <h3>${ico('stats',18)}${T('lx.sum.title')}</h3><p class="hint">${new Date(r.t).toLocaleString(document.documentElement.lang||undefined,{dateStyle:'medium',timeStyle:'short'})}</p>
    <div class="lxgrid">${stat(recClock(r.el),T('lx.sum.dur'))}${stat(r.msgs,T('lx.sum.msgs'))}${stat(r.chatters,T('lx.sum.chatters'))}${stat(pk.length?Math.max(...pk.map(x=>x[1])):'–',T('lx.sum.peak'))}${stat(r.clips,T('lx.sum.clips'))}</div>
    ${al.length?`<h5>${T('lx.sum.alerts')}</h5><div class="lxchips">${al.map(([k,n])=>`<span style="--c:${ST_AL_COL[k]||'#8b5cf6'}">${esc(T('lx.al.'+k))} <b>${n}</b></span>`).join('')}</div>`:''}
    ${pk.length?`<h5>${T('lx.sum.viewers')}</h5><div class="lxchips">${pk.map(([k,n])=>`<span>${esc(k)} <b>${n}</b></span>`).join('')}</div>`:''}
    ${r.top&&r.top.length?`<h5>${T('lx.sum.top')}</h5><ol class="lxtop">${r.top.map(u=>`<li><i class="stsrc" style="background:${ST_CHAT_COL[u.src]||'#94a3b8'}"></i>${esc(u.n)} <span class="hint">${T('lx.sum.nmsg',{n:u.c})}</span></li>`).join('')}</ol>`:''}
    ${r.hl&&r.hl.length?`<h5>${T('lx.sum.moments')}</h5><ul class="lxhl">${r.hl.map(h=>`<li><code>${recClock(h.s)}</code> ${esc(h.label)}</li>`).join('')}</ul>`:''}
    <div class="stduo">${r.clips?`<button class="pri" data-lxsum="clips">${ico('clip',14)}${T('lx.sum.seeClips')}</button>`:''}<button data-lxsum="close">${T('common.close')}</button></div></div>`;
  el.hidden=false;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-lxsum]');if(b){const a=b.dataset.lxsum;$('#lxSum').hidden=true;if(a==='clips'){setMode('edit');if(typeof showTab==='function')showTab('media')}return}
  if(e.target.id==='lxSum')e.target.hidden=true;
});

/* ---------- onglet « Outils » : sections Dons, Sous-titres en direct, Clips et pistes, Résumés ---------- */
function lxRedraw(){if(typeof cxRedraw==='function')cxRedraw()}
{const tp=stToolsPanel;stToolsPanel=function(){
  const h=tp(),C=lxCfg(),D=lxDCfg(),F=!!window.dedcutFS;
  for(const k of['don','lcap','lclip','lives'])if(cxOpen[k]==null)cxOpen[k]=false;
  const sec=(k,ic,title,body,on)=>`<details class="cxsec" data-cxsec="${k}"${cxOpen[k]?' open':''}><summary>${ico(ic,15)}<b>${T(title)}</b>${on!=null?`<i class="cxon${on?' on':''}">${T(on?'cx.on':'cx.off')}</i>`:''}</summary>${body}</details>`;
  const key=(k,label,help)=>`<div class="fld"><label>${T(label)} <a href="#" data-lxhelp="${k}">${T('lx.don.where')}</a></label><div class="keyrow"><input type="password" data-lxdon="${k}" value="${esc(D[k]||'')}" spellcheck="false"><button class="sm" data-lxshow="${k}">${ico('eye',14)}</button></div></div>`;
  const don=key('sl','lx.don.sl')+key('se','lx.don.se')
    +`<div class="stduo"><button data-lxact="dongo" class="${lxDonOn()?'on':''}">${ico(lxDonOn()?'square':'play',13)}${T(lxDonOn()?'st.chat.disconnect':'st.chat.connect')}</button><button data-lxact="dontest">${ico('coin',14)}${T('lx.don.test')}</button></div>
    <div id="lxDonSt" class="stchat-st">${lxDonStHTML()}</div><p class="hint">${T('lx.don.hint')}</p><p class="hint">${T('lx.don.kofi')}</p>`;
  const langs=['','fr','en','es','de','it','pt','ja','ko','zh','nl','pl','ru','tr','ar'];
  const lcap=`<div class="fld"><label>${T('cap.language')}</label><select data-lxcap="lang">${langs.map(l=>`<option value="${l}" ${C.cap.lang===l?'selected':''}>${l?esc(new Intl.DisplayNames([document.documentElement.lang||'fr'],{type:'language'}).of(l)||l):T('lx.cap.uiLang')}</option>`).join('')}</select></div>
    <button class="${lxC.on?'':'pri'}" data-lxact="capgo">${ico(lxC.on?'square':'cc',14)}${T(lxC.on?'lx.cap.stop':'lx.cap.start')}</button>
    ${lxC.on?`<p class="hint">${T('lx.cap.on',{model:esc(lxC.model)})}</p>`:''}
    ${stData.scenes.some(s=>s.items.some(i=>i.kind==='captions'))?'':`<button class="sm" data-lxact="capsrc">${ico('plus',13)}${T('lx.cap.addSrc')}</button>`}
    <p class="hint">${T(F?'lx.cap.hint':'msg.onlyInApp')}</p>`;
  const ck=(k,l)=>`<label class="chk"><span>${T(l)}</span><input type="checkbox" data-lxclip="${k}" ${C.clips[k]?'checked':''}></label>`;
  const lclip=ck('on','lx.clip.on')+(C.clips.on?`<div class="lxsub">${['raid','gift','sub','bits','tip','chat','mark'].map(k=>ck(k,'lx.clip.'+k)).join('')}</div>`:'')
    +`<p class="hint">${T('lx.clip.hint')}</p><label class="chk"><span>${T('lx.tr.on')}</span><input type="checkbox" data-lxtracks="1" ${C.tracks?'checked':''}></label><p class="hint">${T('lx.tr.hint')}</p>`;
  const H=stData.lives||[];
  const lives=H.length?`<div class="lxhist">${H.map((r,i)=>`<button data-lxlive="${i}">${ico('stats',13)}<span>${new Date(r.t).toLocaleDateString(document.documentElement.lang||undefined,{day:'numeric',month:'short'})} · ${recClock(r.el)}</span><span class="hint">${T('lx.sum.nmsg',{n:r.msgs})}</span></button>`).join('')}</div>`:`<p class="hint">${T('lx.sum.none')}</p>`;
  return h+sec('don','coin','lx.don.title',don,lxDonOn())+sec('lcap','cc','lx.cap.title',lcap,lxC.on)+sec('lclip','clip','lx.clip.title',lclip,!!C.clips.on)+sec('lives','stats','lx.sum.hist',lives);
}}
$('#stSide').addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.lxdon){lxDCfg()[t.dataset.lxdon]=t.value.trim();stSave();return}
  if(t.dataset.lxcap){lxCfg().cap[t.dataset.lxcap]=t.value;stSave();return}
  if(t.dataset.lxclip){lxCfg().clips[t.dataset.lxclip]=t.checked;stSave();if(t.dataset.lxclip==='on')lxRedraw();return}
  if(t.dataset.lxtracks){lxCfg().tracks=t.checked;stSave()}
});
$('#stSide').addEventListener('click',e=>{
  const hp=e.target.closest('[data-lxhelp]');if(hp){e.preventDefault();stOpenLink(hp.dataset.lxhelp==='sl'?'https://streamlabs.com/dashboard#/settings/api-settings':'https://streamelements.com/dashboard/account/channels');return}
  const sh=e.target.closest('[data-lxshow]');if(sh){const i=$('#stSide [data-lxdon='+sh.dataset.lxshow+']');if(i)i.type=i.type==='password'?'text':'password';return}
  const lv=e.target.closest('[data-lxlive]');if(lv){const r=(stData.lives||[])[+lv.dataset.lxlive];if(r)lxShowSum(r);return}
  const b=e.target.closest('[data-lxact]');if(!b)return;const a=b.dataset.lxact;
  if(a==='dongo'){if(lxDonOn()){lxSlOff();lxSeOff()}else{const D=lxDCfg();if(!D.sl&&!D.se){toast(T('lx.don.need'));return}lxSlOn();lxSeOn()}lxRedraw();return}
  if(a==='dontest'){lxTip('test',T('st.chat.testName'),lxMoney(5,'EUR'),T('st.chat.test1'));return}
  if(a==='capgo'){if(lxC.on)lxCapStop();else lxCapStart();return}
  if(a==='capsrc'){stAdd('captions');return}
});

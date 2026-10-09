/* ---------- Pack live du studio (v4.41) ----------
   Alertes à l'écran (abonnements, raids, bits, Super Chat, membres) avec un son, message du chat mis en avant,
   musique de fond libre de droits (bibliothèque DedCut) qui baisse quand on parle, filtres du micro (porte de bruit,
   compresseur, réduction du bruit), minuteur (compte à rebours, heure, durée du live), replay des 30 dernières secondes,
   fond de la webcam (flou, enlevé, fond vert) et source vidéo (un fichier qui tourne en boucle). */

/* ---------- alertes ---------- */
const stAl={q:[],cur:null};
function stChatAppendAlert(a){stChatAdd({src:a.src||'test',alert:true,type:a.type,name:a.name,text:a.text,amount:a.amount})}
const ST_AL_COL={sub:'#a970ff',gift:'#f472b6',raid:'#f59e0b',bits:'#22d3ee',superchat:'#fbbf24',member:'#22c55e',pin:'#8b5cf6',follow:'#38bdf8',reward:'#ec4899',ytsub:'#ef4444'};
function stAlert(a,first){
  if(a.irc&&typeof twLive==='function'&&twLive())return; // le compte Twitch relié donne déjà ces alertes
  a.text=String(a.text||'').slice(0,200);a.name=String(a.name||'').slice(0,40);
  if(first)stAl.q.unshift(a);else stAl.q.push(a);if(stAl.q.length>40)stAl.q.splice(0,stAl.q.length-40);
  if(a.type!=='pin')stChatAppendAlert(a);
  if(typeof stCxAlert==='function')try{stCxAlert(a)}catch(e){}
}
function stAlertOpts(){const c=stScene().items.find(i=>i.kind==='alerts'&&i.vis);if(c)return c.o;for(const s of stData.scenes)for(const it of s.items)if(it.kind==='alerts')return it.o;return{dur:6,sound:true,vol:70}}
function stAlertTick(now){
  const o=stAlertOpts(),c=stAl.cur,dur=(c&&c.type==='pin'?12:(+o.dur||6))*1000;
  if(c&&now-c.start<dur)return;
  stAl.cur=null;const n=stAl.q.shift();if(!n)return;n.start=now;stAl.cur=n;if(n.type!=='pin'&&o.sound!==false)stAlertSound((o.vol==null?70:+o.vol)/100,o);
}
// petit carillon (synthétisé) : dans le stream et dans les haut-parleurs de la personne qui fait le live
function stAlertSound(v,o){
  const ac=st.ac;if(!ac)return;const out=ac.createGain();out.gain.value=v*.35;out.connect(st.bus);const mon=ac.createGain();mon.gain.value=v*.25;out.connect(mon);mon.connect(ac.destination);
  const buf=o&&o.snd?stLookSnd(o.snd):null;if(buf){const s=ac.createBufferSource();s.buffer=buf;const g=ac.createGain();g.gain.value=2.4;s.connect(g);g.connect(out);s.start();return}
  [[880,0],[1318.5,.12],[1760,.24]].forEach(([f,d])=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+d;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.9);o.connect(g);g.connect(out);o.start(t);o.stop(t+1)});
}
function stAlertDraw(g,it,x,y,w,h){
  const a=stAl.cur;
  if(!a){if(!O.live&&!O.rec)stHolder(g,x,y,w,h,T('st.k.alerts'));return}
  const L=stLook(it.o,'alerts'),F=(s,wt)=>stLookFont(L.font,s,wt);
  const now=performance.now(),el=now-a.start,dur=(a.type==='pin'?12:(+it.o.dur||6))*1000,p=el/dur,col=L.col||ST_AL_COL[a.type]||'#8b5cf6';
  const inA=Math.min(1,el/(L.anim==='bounce'?600:L.anim==='drop'||L.anim==='slide'?450:280)),outA=Math.min(1,(dur-el)/400),ease=1-Math.pow(1-inA,3);
  const al=Math.max(0,L.anim==='zoom'||L.anim==='fade'?Math.min(inA,outA):outA);
  g.save();g.globalAlpha=al;g.translate(x+w/2,y+h/2);
  if(L.anim==='zoom'){const s=.82+.18*ease;g.scale(s,s)}
  else if(L.anim==='bounce'){const s=Math.max(.02,stBack(inA));g.scale(s,s)}
  else if(L.anim==='drop')g.translate(0,-(1-stBack(inA))*(y+h));
  else if(L.anim==='slide')g.translate(-(1-ease)*(x+w),0);
  const cw=w,ch=h,r=Math.min(cw,ch)*(+L.rad)/100,box=L.layout!=='text';
  if(box&&(+L.bgp>0||+L.bw>0)){
    g.beginPath();g.roundRect(-cw/2,-ch/2,cw,ch,Math.min(r,ch/2));
    if(+L.bgp>0){let fill;if(L.bg)fill=stRgba(L.bg,L.bgp/100);else{fill=g.createLinearGradient(-cw/2,-ch/2,cw/2,ch/2);fill.addColorStop(0,stRgba('#0f0c1e',L.bgp/100));fill.addColorStop(1,stRgba('#1e1432',L.bgp/100))}
      if(L.glow){g.shadowColor=col;g.shadowBlur=ch*.25}g.fillStyle=fill;g.fill();g.shadowBlur=0}
    if(+L.bw>0){g.lineWidth=Math.max(1,ch*.0125*L.bw);g.strokeStyle=col;if(L.glow&&!(+L.bgp>0)){g.shadowColor=col;g.shadowBlur=ch*.2}g.stroke();g.shadowBlur=0}
  }
  // confettis
  if(L.confetti&&a.type!=='pin')for(let i=0;i<18;i++){const k=(i*137.5)%360,rr=(.3+((i*53)%40)/100)*cw*.55*(.4+p),ang=k*Math.PI/180+p*2;g.fillStyle=['#fbbf24','#f472b6','#22d3ee','#a3e635',col][i%5];g.globalAlpha=al*(1-p)*.9;g.fillRect(Math.cos(ang)*rr,Math.sin(ang)*rr*.6-ch*.1,ch*.04,ch*.025)}
  g.globalAlpha=al;g.textBaseline='middle';
  const title=stAlTitle(a,L),img=L.img?stLookImg(L.img,el):null,out=!box,sub=stRgba(L.txt,.85);
  const put=(s,cx,cy,max,size,wt,fill,align)=>{if(!s)return;g.textAlign=align||'center';g.font=F(size,wt);const tw=g.measureText(s).width;if(tw>max){size*=max/tw;g.font=F(size,wt)}
    if(out){g.lineJoin='round';g.lineWidth=size*.16;g.strokeStyle='rgba(0,0,0,.9)';g.strokeText(s,cx,cy)}g.fillStyle=fill;g.fillText(s,cx,cy)};
  if(L.layout==='banner'){
    const s=ch*.76,ix=-cw/2+ch*.12;
    if(img)stDrawContain(g,img,ix,-s/2,s,s);else{g.fillStyle=stRgba(col,.22);g.beginPath();g.arc(ix+s/2,0,s*.46,0,Math.PI*2);g.fill();stIcoDraw(g,'bell',ix+s/2,0,s*.55,col)}
    const tx=ix+s+ch*.14,tw=cw/2-tx-ch*.12;
    put(title,tx,a.text?-ch*.25:-ch*.17,tw,ch*.17,700,col,'left');
    put(a.name,tx,a.text?ch*.01:ch*.12,tw,ch*.27,800,L.txt,'left');
    if(a.text)put(a.text,tx,ch*.28,tw,ch*.13,500,sub,'left');
  }else if(img){
    const s=ch*.42;stDrawContain(g,img,-cw/2,-ch/2+ch*.05,cw,s);
    put(title,0,ch*.07,cw*.86,ch*.11,700,col);
    put(a.name,0,a.text?ch*.22:ch*.26,cw*.9,ch*.18,800,L.txt);
    if(a.text)put(a.text,0,ch*.38,cw*.9,ch*.08,500,sub);
  }else{
    put(title,0,-ch*.26,cw*.86,ch*.15,700,col);
    put(a.name,0,a.text?-ch*.02:ch*.06,cw*.9,ch*.24,800,L.txt);
    if(a.text)put(a.text,0,ch*.25,cw*.9,ch*.11,500,sub);
  }
  g.restore();g.globalAlpha=1;
}
const ST_AL_TEST=[['follow','',''],['sub','',''],['raid','','42'],['bits','','500'],['superchat','','5,00 €'],['gift','','5'],['member','','']];let stAlTestN=0;
function stAlertTest(){const[t,,n]=ST_AL_TEST[stAlTestN++%ST_AL_TEST.length];stAlert({type:t,name:T('st.chat.testName')+' '+(10+stAlTestN),text:t==='superchat'?T('st.chat.test1'):'',amount:n})}

/* ---------- minuteur ---------- */
const stPad=n=>String(Math.max(0,Math.floor(n))).padStart(2,'0');
function stTimerDraw(g,it,x,y,w,h){
  const o=it.o;let main='';
  if(o.mode==='clock'){const d=new Date();main=stPad(d.getHours())+':'+stPad(d.getMinutes())}
  else if(o.mode==='live'){const s=O.live?O.live.el:O.rec?O.rec.el:0;main=recClock(s)}
  else{const left=o.end?Math.max(0,(o.end-Date.now())/1000):(+o.min||5)*60;main=stPad(left/60)+':'+stPad(left%60);
    if(o.end&&left<=0&&!o.done){o.done=true;if(o.next&&stScene().items.includes(it)&&stData.scenes.some(s=>s.id===+o.next))setTimeout(()=>stSwitch(+o.next),0)}}
  g.save();g.textAlign='center';g.textBaseline='middle';const lab=String(o.label||'');
  const big=h*(lab?.62:.85);g.font=stFont(big,800);let k=Math.min(1,w*.95/g.measureText(main).width);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=big*.12;g.fillStyle=o.color||'#fff';
  if(lab){g.font=stFont(h*.22*Math.min(1,k*1.4),600);g.fillText(lab,x+w/2,y+h*.16)}
  g.font=stFont(big*k,800);g.fillText(main,x+w/2,y+h*(lab?.62:.5));g.restore();
}
// le compte à rebours repart quand sa scène s'affiche
function stTimersStart(scene){for(const it of scene.items)if(it.kind==='timer'&&(it.o.mode||'down')==='down'){it.o.end=Date.now()+(+it.o.min||5)*60000;it.o.done=false}}

/* ---------- musique de fond (bibliothèque DedCut : libre de droits, pas de blocage pour droits d'auteur) ---------- */
const stMus={on:false,src:null,title:'',list:[],idx:-1,loading:false};
function stMusicList(){
  const cat=stData.mus.cat||'all',real=[],made=[];
  if(typeof mlLib!=='undefined'&&mlLib&&mlLib.supported)for(const t of mlLib.tracks)if(cat==='all'||t.cat===cat)real.push({real:true,id:t.id,title:t.title+' – '+t.artist});
  if(typeof MUS!=='undefined')for(const k of Object.keys(MUS))if(cat==='all'||MUS_CAT[k]===cat)made.push({real:false,k,title:T('mus.'+k)+' – DedCut'});
  const l=(stData.mus.src==='dc'?made:stData.mus.src==='real'?real:[...real,...made]);
  for(let i=l.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[l[i],l[j]]=[l[j],l[i]]}
  return l;
}
async function stMusicPlay(step){
  if(!st.ac)return;if(!stMus.list.length||step===0)stMus.list=stMusicList();if(!stMus.list.length){toast(T('mlib.none'));return}
  stMus.idx=(stMus.idx+(step||1)+stMus.list.length)%stMus.list.length;const it=stMus.list[stMus.idx];
  stMusicHalt();stMus.loading=true;stMus.title=it.title;stMixerUI();
  let buf=null;
  try{
    if(it.real){const f=await dedcutMusic.get(it.id);if(typeof mlHave!=='undefined')mlHave.add(it.id);buf=await st.ac.decodeAudioData(await(await fetch(FS.fileUrl(f.path))).arrayBuffer())}
    else{const[l,r]=await musicRender(it.k,120);buf=st.ac.createBuffer(2,l.length,44100);buf.copyToChannel(l,0);buf.copyToChannel(r,1)}
  }catch(e){stMus.loading=false;stMixerUI();toast(T('st.mus.fail'));return}
  if(!stMus.loading)return; // arrêtée pendant le chargement
  const s=st.ac.createBufferSource();s.buffer=buf;s.connect(st.musIn);s.onended=()=>{if(stMus.src===s&&stMus.on)stMusicPlay(1)};s.start();
  stMus.src=s;stMus.on=true;stMus.loading=false;stMixerUI();
}
function stMusicHalt(){const s=stMus.src;stMus.src=null;if(s){try{s.onended=null;s.stop()}catch(e){}}}
function stMusicStop(){stMus.on=false;stMus.loading=false;stMusicHalt();stMixerUI()}

/* ---------- traitements audio dans le fil du son (marchent aussi DedCut réduit) : porte de bruit, baisse de la musique ---------- */
const ST_DSP=`
class Gate extends AudioWorkletProcessor{constructor(){super();this.on=false;this.thr=-50;this.env=0;this.g=1;this.port.onmessage=e=>{Object.assign(this,e.data)}}
process(i,o){const a=i[0]||[],b=o[0];if(!a.length){return true}let s=0;for(const c of a)for(let k=0;k<c.length;k++)s=Math.max(s,Math.abs(c[k]));
const db=s>0?20*Math.log10(s):-120;this.env=db>this.env?db:this.env*.995+db*.005;const want=!this.on||this.env>this.thr?1:(this.floor||0);
for(let ch=0;ch<b.length;ch++){const src=a[Math.min(ch,a.length-1)],dst=b[ch];let g=this.g;for(let k=0;k<dst.length;k++){g+=(want-g)*(want>g?.02:.002);dst[k]=src[k]*g}if(ch===b.length-1)this.g=g}return true}}
registerProcessor('dc-gate',Gate);
class Duck extends AudioWorkletProcessor{constructor(){super();this.on=true;this.env=0;this.g=1;this.port.onmessage=e=>{Object.assign(this,e.data)}}
process(i,o){const m=i[0]||[],v=i[1]||[],b=o[0];let s=0;for(const c of v)for(let k=0;k<c.length;k++)s=Math.max(s,Math.abs(c[k]));
this.env=Math.max(s,this.env*.9995);const want=this.on&&this.env>.06?.3:1;
for(let ch=0;ch<b.length;ch++){const src=m[Math.min(ch,m.length-1)],dst=b[ch];let g=this.g;for(let k=0;k<dst.length;k++){g+=(want-g)*(want<g?.004:.0004);dst[k]=src?src[k]*g:0}if(ch===b.length-1)this.g=g}return true}}
registerProcessor('dc-duck',Duck);`;
async function stDspInit(){
  const ac=st.ac;if(!ac||st.gate)return;
  const url=URL.createObjectURL(new Blob([ST_DSP],{type:'application/javascript'}));try{await ac.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
  st.gate=new AudioWorkletNode(ac,'dc-gate',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
  st.comp=ac.createDynamicsCompressor();st.comp.threshold.value=-24;st.comp.knee.value=12;st.comp.ratio.value=4;st.comp.attack.value=.005;st.comp.release.value=.2;
  st.duck=new AudioWorkletNode(ac,'dc-duck',{numberOfInputs:2,numberOfOutputs:1,outputChannelCount:[2]});
  st.musIn=ac.createGain();st.musIn.connect(st.duck,0,0);st.duck.connect(st.music.g);st.mic.g.connect(st.duck,0,1);
  stMicFx();
}
// chaîne du micro : source → porte de bruit → (compresseur) → volume du micro
function stMicFx(){
  if(!st.gate)return;const f=stData.micfx;
  try{st.gate.disconnect()}catch(e){}try{st.comp.disconnect()}catch(e){}
  st.gate.port.postMessage({on:!!f.gate,thr:+f.thr||-50});
  if(f.comp){st.gate.connect(st.comp);st.comp.connect(st.mic.g)}else st.gate.connect(st.mic.g);
  st.duck.port.postMessage({on:stData.mus.duck!==false});
}

/* ---------- replay : les dernières secondes (30 par défaut, réglable), gardées en mémoire pendant le live ou l'enregistrement ---------- */
const stRpSec=()=>Math.max(10,Math.min(120,+(stData&&stData.rpSec)||30));
// une seule copie en mémoire : celle du live s'il tourne (le replay est pris dans le live en priorité)
const stRbSkip=o=>o.kind==='vert'||o.kind==='rec'&&O.live&&O.live.on&&O.live.kind==='live'&&(o.rb=null,true);
function stRbV(o,ch,meta){
  if(stRbSkip(o))return;const rb=o.rb||(o.rb={v:[],a:[]});const d=meta&&meta.decoderConfig;if(d&&d.description){rb.avcC=stDesc(d.description);rb.codec=d.codec;rb.cw=d.codedWidth||st.w;rb.chh=d.codedHeight||st.h}
  const b=new Uint8Array(ch.byteLength);ch.copyTo(b);rb.v.push({k:ch.type==='key',ts:ch.timestamp,d:ch.duration||Math.round(1e6/st.fps),b});
  const lim=ch.timestamp-(stRpSec()+10)*1e6;while(rb.v.length&&rb.v[0].ts<lim)rb.v.shift();
}
function stRbA(o,ch,meta){
  if(stRbSkip(o))return;const rb=o.rb||(o.rb={v:[],a:[]});const d=meta&&meta.decoderConfig;if(d&&d.description)rb.asc=stDesc(d.description);
  const b=new Uint8Array(ch.byteLength);ch.copyTo(b);rb.a.push({ts:ch.timestamp,d:ch.duration||21333,b});
  const lim=ch.timestamp-(stRpSec()+11)*1e6;while(rb.a.length&&rb.a[0].ts<lim)rb.a.shift();
}
async function stReplaySave(){
  const o=O.live||O.rec,rb=o&&o.rb;if(!rb||!rb.avcC||!rb.v.length){toast(T('st.rp.none'));return}
  const last=rb.v[rb.v.length-1].ts;let i0=rb.v.findIndex(f=>f.k&&f.ts>=last-stRpSec()*1e6);if(i0<0)i0=rb.v.findIndex(f=>f.k);if(i0<0){toast(T('st.rp.none'));return}
  const vs=rb.v.slice(i0),t0=vs[0].ts,as=rb.a.filter(a=>a.ts>=t0&&a.ts<=last);
  const mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:'avc',width:rb.cw,height:rb.chh,frameRate:st.fps},audio:rb.asc?{codec:'aac',numberOfChannels:2,sampleRate:48000}:undefined,fastStart:'in-memory',firstTimestampBehavior:'offset'});
  vs.forEach((f,i)=>mux.addVideoChunk(new EncodedVideoChunk({type:f.k?'key':'delta',timestamp:f.ts-t0,duration:f.d,data:f.b}),i?undefined:{decoderConfig:{codec:rb.codec||'avc1.640028',codedWidth:rb.cw,codedHeight:rb.chh,description:rb.avcC}}));
  if(rb.asc)as.forEach((a,i)=>mux.addAudioChunk(new EncodedAudioChunk({type:'key',timestamp:a.ts-t0,duration:a.d,data:a.b}),i?undefined:{decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:rb.asc}}));
  mux.finalize();
  const name=T('st.rp.file')+' '+recStamp()+'.mp4',m=await addGenerated(new File([mux.target.buffer],name,{type:'video/mp4'}));
  toast(T('st.rp.saved',{s:Math.round((last-t0)/1e6)}));return m;
}

/* ---------- webcam : fond flou, enlevé ou vert ---------- */
// toiles de travail : lues par le programme seulement pour le fond vert (rd) ; les autres restent sur la carte graphique (flou et mélange bien plus rapides)
const stFxCv={};const stFxC=(k,rd)=>stFxCv[k]||(stFxCv[k]=(()=>{const c=document.createElement('canvas');return{c,g:c.getContext('2d',rd?{willReadFrequently:true}:undefined)}})());
/* détourage de la personne dans un worker : le calcul (15 à 20 ms) ne bloque plus le dessin des images du live.
   Si le worker ne démarre pas, on revient au calcul dans la page (personSeg de 06-render.js). */
const stSeg={w:null,ok:false,fail:false,ms:15,cb:{},n:0};
function stSegW(){
  if(stSeg.w||stSeg.fail)return stSeg.ok;
  const SRC=`let seg=null;
self.onmessage=async e=>{const m=e.data;
  if(m.init){try{const mod=await import(m.base+'vision_bundle.mjs'),fs=await mod.FilesetResolver.forVisionTasks(m.base.slice(0,-1));
      seg=await mod.ImageSegmenter.createFromOptions(fs,{baseOptions:{modelAssetPath:m.base+'selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});postMessage({ready:1})}
    catch(err){postMessage({fail:String(err&&err.message||err)})}return}
  if(!m.bmp)return;let r=null;const t0=performance.now();
  try{r=seg.segment(m.bmp);const cm=r.confidenceMasks,mm=cm[cm.length-1],v=mm.getAsFloat32Array(),d=new Uint8ClampedArray(v.length*4);
    for(let i=0,j=0;i<v.length;i++,j+=4){const q=Math.min(1,Math.max(0,(v[i]-.35)/.3));d[j]=d[j+1]=d[j+2]=255;d[j+3]=q*q*(3-2*q)*255}
    postMessage({id:m.id,w:mm.width,h:mm.height,d,ms:performance.now()-t0},[d.buffer])}
  catch(err){postMessage({id:m.id,err:String(err&&err.message||err)})}finally{if(r)r.close();m.bmp.close()}};`;
  try{
    const w=new Worker(URL.createObjectURL(new Blob([SRC],{type:'application/javascript'})));stSeg.w=w;
    w.onmessage=e=>{const m=e.data;
      if(m.ready){stSeg.ok=true;if(typeof wake==='function')wake();return}
      if(m.fail){console.warn('détourage (worker) indisponible',m.fail);stSeg.fail=true;stSeg.ok=false;try{w.terminate()}catch(x){}stSeg.w=null;return}
      const cb=stSeg.cb[m.id];delete stSeg.cb[m.id];if(m.ms)stSeg.ms=stSeg.ms*.8+m.ms*.2;if(cb)cb(m)};
    w.onerror=e=>{console.warn('détourage (worker)',e.message);stSeg.fail=true;stSeg.ok=false;try{w.terminate()}catch(x){}stSeg.w=null};
    w.postMessage({init:1,base:new URL('vendor/mediapipe/',document.baseURI).href});
  }catch(e){stSeg.fail=true}
  return false;
}
// plus de webcam détourée depuis une minute : on libère le worker (et sa mémoire)
setInterval(()=>{if(stSeg.w&&performance.now()-(stSeg.used||0)>60000){try{stSeg.w.terminate()}catch(e){}stSeg.w=null;stSeg.ok=false;stSeg.cb={}}},15000);
function stCamFx(it,im,w,h){
  const o=it.o,mode=o.bgfx,s=Math.min(1,960/Math.max(w,h)),W=Math.max(16,Math.round(w*s)),H=Math.max(16,Math.round(h*s)),now=performance.now();
  // une webcam donne 30 images par seconde : inutile de refaire le même calcul pour chaque image du live (60 i/s)
  const F=stFxCv['f'+it.id]||(stFxCv['f'+it.id]={});if(F.out&&F.mode===mode&&F.W===W&&F.H===H&&now-F.t<30)return F.out;
  const out=stCamFx2(it,im,W,H,mode,now);F.out=out;F.mode=mode;F.W=W;F.H=H;F.t=now;return out;
}
function stCamFx2(it,im,W,H,mode,now){
  const o=it.o;
  if(mode==='green'){
    const A=stFxC('g'+it.id,true);if(A.c.width!==W||A.c.height!==H){A.c.width=W;A.c.height=H}
    A.g.clearRect(0,0,W,H);stCover(A.g,im,0,0,W,H,o.mirror);
    const img=A.g.getImageData(0,0,W,H),d=img.data;
    const kb=o.kc==='blue',f=1+(o.ksim==null?35:+o.ksim)/100,sm=Math.max(5,o.ksm==null?40:+o.ksm),lo=o.ksim==null?90:Math.max(40,110-+o.ksim);
    for(let i=0;i<d.length;i+=4){const r=d[i],gg=kb?d[i+2]:d[i+1],b=kb?d[i+1]:d[i+2],m=Math.max(r,b);if(gg>lo&&gg>m*f){const k=Math.min(1,(gg-m*f)/sm);d[i+3]=255*(1-k);d[kb?i+2:i+1]=Math.min(gg,m+(gg-m)*(1-k))}}
    A.g.putImageData(img,0,0);return A.c;
  }
  const A=stFxC('a'+it.id);if(A.c.width!==W||A.c.height!==H){A.c.width=W;A.c.height=H}
  A.g.globalCompositeOperation='source-over';A.g.clearRect(0,0,W,H);stCover(A.g,im,0,0,W,H,o.mirror);
  if(typeof personMask!=='function')return A.c;
  const viaW=stSegW()||!stSeg.fail&&!personSegM;
  if(!viaW&&!personSegM){personSeg();return mode==='remove'?null:A.c}
  if(viaW&&!stSeg.ok)return mode==='remove'?null:A.c; // le worker charge le modèle
  const M=stFxC('m'+it.id);
  // masque de la personne : toutes les 45 ms au mieux, plus espacé si le PC calcule lentement, deux fois moins souvent en mode jeu
  const gap=Math.min(250,Math.max(45,stSeg.ms*3))*(stData&&stData.game?2:1);
  if(M.busy&&now-M.busy>2000)M.busy=0;
  if(!M.busy&&(!M.t||now-M.t>gap)){
    M.t=now;const k=256/Math.max(W,H),sw=Math.round(W*k),sh=Math.round(H*k);
    const fill=(mw,mh,data)=>{if(M.c.width!==mw||M.c.height!==mh){M.c.width=mw;M.c.height=mh;M.img=M.g.createImageData(mw,mh)}M.img.data.set(data);M.g.putImageData(M.img,0,0);M.ok=true};
    if(viaW){
      if(!stSeg.S||stSeg.S.width!==sw||stSeg.S.height!==sh){stSeg.S=new OffscreenCanvas(sw,sh);stSeg.Sg=stSeg.S.getContext('2d')}
      stSeg.Sg.drawImage(A.c,0,0,sw,sh);const bmp=stSeg.S.transferToImageBitmap(),id=++stSeg.n;M.busy=now;stSeg.used=now;
      stSeg.cb[id]=m=>{M.busy=0;if(m.d)fill(m.w,m.h,m.d)};
      stSeg.w.postMessage({id,bmp},[bmp]);
    }else{
      const S=stFxC('s',true);if(S.c.width!==sw||S.c.height!==sh){S.c.width=sw;S.c.height=sh}
      S.g.drawImage(A.c,0,0,sw,sh);let r=null;const t0=performance.now();
      try{r=personSegM.segment(S.c);const cm=r.confidenceMasks,mm=cm[cm.length-1],v=mm.getAsFloat32Array(),d=new Uint8ClampedArray(v.length*4);
        for(let i=0,j=0;i<v.length;i++,j+=4){const q=Math.min(1,Math.max(0,(v[i]-.35)/.3));d[j]=d[j+1]=d[j+2]=255;d[j+3]=q*q*(3-2*q)*255}
        fill(mm.width,mm.height,d)}catch(e){}finally{if(r)r.close()}
      stSeg.ms=stSeg.ms*.8+(performance.now()-t0)*.2;
    }
  }
  if(!M.ok)return mode==='remove'?null:A.c;
  const P=stFxC('p'+it.id);if(P.c.width!==W||P.c.height!==H){P.c.width=W;P.c.height=H}
  P.g.globalCompositeOperation='source-over';P.g.clearRect(0,0,W,H);P.g.drawImage(A.c,0,0);P.g.globalCompositeOperation='destination-in';P.g.imageSmoothingQuality='high';P.g.drawImage(M.c,0,0,W,H);P.g.globalCompositeOperation='source-over';
  if(mode==='remove')return P.c;
  // fond flou : flouté sur une image 4 fois plus petite puis agrandie (même rendu, beaucoup moins de calcul)
  const B=stFxC('b'+it.id);if(B.c.width!==W||B.c.height!==H){B.c.width=W;B.c.height=H}
  const Q=stFxC('q'+it.id),qw=Math.max(8,Math.round(W/4)),qh=Math.max(8,Math.round(H/4));if(Q.c.width!==qw||Q.c.height!==qh){Q.c.width=qw;Q.c.height=qh}
  Q.g.filter='blur('+Math.max(1,Math.round(Math.max(W,H)/180))+'px)';Q.g.drawImage(A.c,0,0,qw,qh);Q.g.filter='none';
  B.g.imageSmoothingQuality='medium';B.g.drawImage(Q.c,0,0,W,H);B.g.drawImage(P.c,0,0);return B.c;
}

/* ---------- source vidéo (fichier du PC, en boucle) ---------- */
const stVids={};
function stVid(path){
  if(!path)return null;let V=stVids[path];
  if(!V){const v=document.createElement('video');v.crossOrigin='anonymous';v.loop=true;v.playsInline=true;v.preload='auto';v.src=FS?FS.fileUrl(path):path;V=stVids[path]={v};
    if(st.ac){try{V.src=st.ac.createMediaElementSource(v);V.g=st.ac.createGain();V.src.connect(V.g);V.g.connect(st.bus)}catch(e){v.muted=true}}else v.muted=true}
  return V;
}
function stVideoSync(restart){
  const want=new Map();for(const it of stScene().items)if(it.kind==='video'&&it.vis&&it.o.path)want.set(it.o.path,it);
  for(const[p,V]of Object.entries(stVids)){const it=want.get(p);
    if(it&&stOn()||it&&(O.live||O.rec)){if(V.g)V.g.gain.value=it.o.mute?0:(it.o.vol==null?80:+it.o.vol)/100;if(restart&&it.o.restart!==false)try{V.v.currentTime=0}catch(e){}if(V.v.paused)V.v.play().catch(()=>{})}
    else if(!V.v.paused)V.v.pause()}
}
function stVideoDraw(g,it,x,y,w,h){const V=stVid(it.o.path);if(V&&V.v.readyState>=2)stContain(g,V.v,x,y,w,h);else if(!it.o.path)stHolder(g,x,y,w,h,T('st.pickVideo'))}
async function stPickVideo(it){
  if(!FS){toast(T('msg.onlyInApp'));return}
  const l=await FS.pickMedia(T('st.k.video')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)==='video');if(!f)return;
  it.o.path=f.path;const V=stVid(f.path);V.v.addEventListener('loadedmetadata',()=>{const a=V.v.videoWidth/V.v.videoHeight||16/9;it.h=Math.min(1,it.w*st.w/st.h/a);stSave();stSelBox()},{once:true});
  stSave();stVideoSync(true);stRender();
}

/* message du chat mis en avant : clic sur le message dans l'onglet Chat */
$('#stSide').addEventListener('click',e=>{
  const r=e.target.closest('[data-mid]');if(!r)return;const m=stChat.msgs.find(x=>x.id===+r.dataset.mid);if(!m)return;
  stAlert({type:'pin',name:m.name,text:m.text},true);if(stAl.cur&&stAl.cur.type!=='pin')stAl.cur.start=-1e9;
  toast(T(stScene().items.some(i=>i.kind==='alerts'&&i.vis)?'st.pinned':'st.pinNeedAlerts'));
});

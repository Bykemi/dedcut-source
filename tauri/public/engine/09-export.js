/* ---------- export ---------- */
function openExport(){
  if(!clips.length||total()<=0){toast(T('msg.timelineEmpty'));return}
  pause();$('#xName').value=safeName(projName);
  // la fréquence du projet est proposée (une fois par changement, le choix de l'utilisateur est ensuite gardé)
  if(openExport.fps!==projFps&&$('#xPre').value==='perso'){openExport.fps=projFps;const v=String(Math.round(projFps));if([...$('#xFps').options].some(o=>o.value===v))$('#xFps').value=v}$('#xRange').checked=xin!=null||xout!=null;
  expInfo();
  $('#expForm').hidden=false;$('#expRun').hidden=true;$('#ov').style.display='grid';
}
/* export du son seul : mixage complet (volumes, effets, voix, limiteur) puis WAV 16 bits ou M4A (AAC 192 k) */
async function audioExport(kind){
  fastCancel=false;const t0=performance.now();
  const audio=await mixAudio(total());if(!audio)throw new Error(T('export.noAudio'));
  const Lc=audio.getChannelData(0),Rc=audio.numberOfChannels>1?audio.getChannelData(1):Lc,n=audio.length;
  if(kind==='wav'){xProgress(1,t0);return wavFromChannels([Lc,Rc],48000)}
  const cfg={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000};
  if(!window.AudioEncoder||!window.Mp4Muxer||!(await AudioEncoder.isConfigSupported(cfg).catch(()=>({}))).supported)throw new Error('AAC');
  const target=new Mp4Muxer.ArrayBufferTarget(),mux=new Mp4Muxer.Muxer({target,audio:{codec:'aac',numberOfChannels:2,sampleRate:48000},fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let err=null;const aenc=new AudioEncoder({output:(ch,meta)=>mux.addAudioChunk(ch,meta),error:x=>err=x});aenc.configure(cfg);
  for(let i=0,B=4800;i<n;i+=B){
    if(fastCancel){aenc.close();return null}
    const k=Math.min(B,n-i),d=new Float32Array(k*2);d.set(Lc.subarray(i,i+k),0);d.set(Rc.subarray(i,i+k),k);
    const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:k,numberOfChannels:2,timestamp:Math.round(i*1e6/48000),data:d});aenc.encode(ad);ad.close();
    if(aenc.encodeQueueSize>16)await new Promise(r=>{aenc.addEventListener('dequeue',r,{once:true});setTimeout(r,1000)});
    if(i%(B*50)===0){xProgress(i/n,t0);await new Promise(r=>setTimeout(r,0))}
  }
  await aenc.flush();aenc.close();if(err)throw err;mux.finalize();xProgress(1,t0);
  return new Blob([target.buffer],{type:'audio/mp4'});
}
async function startExport(){
  await personPrep();await fontPrep();
  await vizReady();
  const fps=+$('#xFps').value,br=expBitrate(),[nw,nh]=expDims();
  const rg=expRange(),fmtv=$('#xFmt').value,rRestore=rg?rangeApply(rg[0],rg[1]):null;
  if(fmtv==='wav'||fmtv==='m4a'){
    expName=safeName($('#xName').value);
    $('#expForm').hidden=true;$('#expRun').hidden=false;$('#bar i').style.width='0';$('#xPct').textContent=T('export.audioPrep');$('#xRunInfo').textContent=T('export.audioHint');
    let b=null,err=null;try{b=await audioExport(fmtv)}catch(x){err=x}
    if(rRestore)rRestore();$('#ov').style.display='none';
    if(err){console.error(err);toast(T('export.audioFailed',{error:String((err&&err.message)||err)}))}else if(b){download(b,expName+'.'+fmtv);toast(T('export.done'))}
    return;
  }
  if(nw!==W||nh!==H){const snap=JSON.stringify(clips),ow=W,oh=H;setFormat(nw,nh,true);expRestore=()=>{clips=JSON.parse(snap);setFormat(ow,oh,false);refresh()}}
  if(rRestore){const r0=expRestore;expRestore=()=>{if(r0)r0();rRestore()}}
  expName=safeName($('#xName').value);
  if($('#xFmt').value==='gif'){
    $('#expForm').hidden=true;$('#expRun').hidden=false;$('#bar i').style.width='0';$('#xPct').textContent=T('export.preparing');$('#xRunInfo').textContent=T('export.gifHint');
    try{const b=await gifExport(fps);if(expRestore){expRestore();expRestore=null}$('#ov').style.display='none';if(b){download(b,expName+'.gif');toast(T('export.done'))}return}
    catch(e){console.error(e);fastExp=false;xf=null;if(expRestore){expRestore();expRestore=null}$('#ov').style.display='none';toast(T('export.fastFailed',{error:String((e&&e.message)||e)}));return}
  }
  if($('#xFmt').value==='mp4'&&window.VideoEncoder&&window.Mp4Muxer){
    $('#expForm').hidden=true;$('#expRun').hidden=false;$('#bar i').style.width='0';$('#xPct').textContent=T('export.preparing');
    $('#xRunInfo').textContent=T('export.fastHint');
    try{let b;const ep=window.encPref||'auto';try{b=await fastExport(fps,br,ep==='cpu'?true:ep==='gpu'?'hw':undefined)}catch(e){if(ep!=='cpu'&&(e&&e.message==='STALL'||ep==='gpu')){if(ep==='gpu')toast(T('pref.gpuFallback'));$('#xPct').textContent=T('export.preparing');b=await fastExport(fps,br,true)}else throw e}
      if(expRestore){expRestore();expRestore=null}$('#ov').style.display='none';
      if(b&&b.disk){toast(T('export.savedToExports'));appFetch('app://dedcut/__out?op=show&p='+encodeURIComponent(b.disk)).catch(()=>{});setTimeout(()=>window.thumbAsk&&thumbAsk(),900)}
      else if(b){download(b,expName+'.mp4');toast(T('export.done'));setTimeout(()=>window.thumbAsk&&thumbAsk(),900)}return}
    catch(e){console.error(e);fastExp=false;xf=null;toast(T('export.fastFailed',{error:T(e&&e.message||String(e))}))}
  }
  $('#xRunInfo').textContent=T('export.realtimeHint');
  ensureAudio();await actx.resume();await pxSwap(true);
  const MP4=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1.640033,mp4a.40.2','video/mp4'],WEBM=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  mime=($('#xFmt').value==='webm'?[...WEBM,...MP4]:[...MP4,...WEBM]).find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime){pxSwap(false);toast(T('export.unsupported'));return}
  if($('#xFmt').value==='mp4'&&!mime.includes('mp4'))toast(T('export.noMp4'));
  const stream=cv.captureStream(fps),at=recDest.stream.getAudioTracks()[0];if(at)stream.addTrack(at);
  chunks=[];rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:br.v,audioBitsPerSecond:br.a});
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  rec.onstop=()=>{
    spk.gain.value=1;exporting=false;pxSwap(false);$('#ov').style.display='none';
    if(expRestore){expRestore();expRestore=null}
    if(rec._cancel)return;
    download(new Blob(chunks,{type:mime}),expName+'.'+(mime.includes('mp4')?'mp4':'webm'));toast(T('export.done'));setTimeout(()=>window.thumbAsk&&thumbAsk(),900);
  };
  $('#expForm').hidden=true;$('#expRun').hidden=false;
  spk.gain.value=0;exporting=true;time=0;expT0=performance.now();$('#bar i').style.width='0';
  rec.start(250);play();
}
function finishExport(){pause();setTimeout(()=>{if(rec&&rec.state!=='inactive')rec.stop()},400)}
async function snapshot(){
  await personPrep();await fontPrep();await pxSwap(true);render(time);pxSwap(false);
  cv.toBlob(b=>{download(b,safeName(projName)+'-'+fmtTC(time).replace(/:/g,'-')+'.png');toast(T('export.imageSaved'))},'image/png');
}
$('#bExport').onclick=openExport;
$('#xGo').onclick=startExport;
$('#xCancel').onclick=()=>{$('#ov').style.display='none'};
$('#xPng').onclick=()=>{$('#ov').style.display='none';snapshot()};
$('#bSnap').onclick=snapshot;
$('#bCancel').onclick=()=>{fastCancel=true;if(rec&&rec.state!=='inactive'){rec._cancel=true;rec.stop()}pause();exporting=false;if(spk)spk.gain.value=1;$('#ov').style.display='none'};


/* ---------- export rapide : décodage image par image + encodage MP4 (WebCodecs) ---------- */
let fastCancel=false;
const demuxCache=new Map(),abufCache=new Map();
function demux(m){if(!demuxCache.has(m.id))demuxCache.set(m.id,doDemux(m).catch(e=>{console.warn('lecture',m.name,e);return null}));return demuxCache.get(m.id)}
async function doDemux(m){
  if(!window.VideoDecoder||mediaSize(m)>3e9)return null;
  const buf=await mediaBuf(m),u8=new Uint8Array(buf);
  const r=u8[0]===0x1A&&u8[1]===0x45&&u8[2]===0xDF&&u8[3]===0xA3?demuxWebm(u8):await demuxMp4(buf);
  if(!r||!r.chunks.length||!r.chunks[0].key)return null;
  if(!(await VideoDecoder.isConfigSupported(r.config).catch(()=>({}))).supported)return null;
  const off=Math.min(...r.chunks.map(c=>c.ts));r.chunks.forEach(c=>c.ts-=off);
  return r;
}
function demuxMp4(buf){
  return new Promise((res,rej)=>{
    const f=MP4Box.createFile(),chunks=[];let cfg=null;
    f.onError=e=>rej(new Error(e));
    f.onReady=info=>{
      const tr=info.videoTracks[0];if(!tr)return;
      let desc;
      for(const e of f.getTrackById(tr.id).mdia.minf.stbl.stsd.entries){const b=e.avcC||e.hvcC||e.av1C;if(b){const st=new DataStream(undefined,0,DataStream.BIG_ENDIAN);b.write(st);desc=new Uint8Array(st.buffer,8);break}}
      cfg={codec:tr.codec.startsWith('vp08')?'vp8':tr.codec,codedWidth:tr.video.width,codedHeight:tr.video.height};if(desc)cfg.description=desc;
      f.setExtractionOptions(tr.id,null,{nbSamples:1e9});f.start();
    };
    f.onSamples=(id,u,list)=>{for(const x of list)chunks.push({ts:x.cts*1e6/x.timescale,key:x.is_sync,data:x.data})};
    buf.fileStart=0;f.appendBuffer(buf);f.flush();
    setTimeout(()=>res(cfg?{config:cfg,chunks}:null),0);
  });
}
/* lecteur WebM minimal (EBML) : récupère les images de la piste vidéo */
function demuxWebm(u8){
  let p=0,scale=1e6,cluster=0,cur=null,last=null;const tracks=[],chunks=[];
  const vint=marker=>{const b=u8[p];let n=1,mask=0x80;while(n<=8&&!(b&mask)){mask>>=1;n++}if(n>8)throw new Error('webm');
    let v=marker?b:b&(mask-1),all=(b&(mask-1))===mask-1;for(let i=1;i<n;i++){v=v*256+u8[p+i];if(u8[p+i]!==255)all=false}p+=n;return{v,unk:all&&!marker}};
  const uint=(a,n)=>{let v=0;for(let i=0;i<n;i++)v=v*256+u8[a+i];return v};
  const MASTER=new Set([0x18538067,0x1549A966,0x1654AE6B,0xAE,0xE0,0x1F43B675,0xA0]);
  while(p<u8.length-2){
    const id=vint(true).v,sz=vint(false),a=p;
    if(MASTER.has(id)){if(id===0xAE){cur={};tracks.push(cur)}if(id===0xA0)last=null;continue}
    if(sz.unk)break;
    const n=sz.v,end=a+n;
    if(id===0x2AD7B1)scale=uint(a,n);
    else if(id===0xD7&&cur)cur.num=uint(a,n);
    else if(id===0x83&&cur)cur.type=uint(a,n);
    else if(id===0x86&&cur)cur.codec=String.fromCharCode(...u8.subarray(a,end));
    else if(id===0x63A2&&cur)cur.priv=u8.slice(a,end);
    else if(id===0xB0&&cur)cur.w=uint(a,n);
    else if(id===0xBA&&cur)cur.h=uint(a,n);
    else if(id===0xE7)cluster=uint(a,n);
    else if(id===0xFB){if(last)last.key=false}
    else if(id===0xA3||id===0xA1){
      const v=tracks.find(t=>t.type===1);p=a;const tn=vint(false).v;
      if(v&&tn===v.num){const tc=(u8[p]<<8|u8[p+1])<<16>>16,fl=u8[p+2];
        if(!(fl&6)){const c={ts:(cluster+tc)*scale/1000,key:id===0xA3?!!(fl&0x80):true,data:u8.subarray(p+3,end)};chunks.push(c);last=id===0xA1?c:null}}
    }
    p=end;
  }
  const v=tracks.find(t=>t.type===1);if(!v)return null;
  const map={V_VP8:'vp8',V_VP9:'vp09.00.10.08',V_AV1:'av01.0.08M.08'};
  let codec=map[v.codec],cfg;
  if(v.codec==='V_MPEG4/ISO/AVC'&&v.priv){codec='avc1.'+[...v.priv.subarray(1,4)].map(x=>x.toString(16).padStart(2,'0')).join('');cfg={codec,description:v.priv}}
  if(!codec)return null;
  cfg=cfg||{codec};if(v.w){cfg.codedWidth=v.w;cfg.codedHeight=v.h}
  return{config:cfg,chunks};
}
class FrameReader{
  constructor(d,src){
    this.d=d;this.q=[];this.done=false;this.err=null;this.wait=null;this.fed=0;this.outN=0;this.cap=6;this.flushing=null;
    const tus=src*1e6;this.idx=0;d.chunks.forEach((c,i)=>{if(c.key&&c.ts<=tus+1)this.idx=i});
    this.dec=new VideoDecoder({output:f=>{this.outN++;this.q.push(f);this.ping()},error:e=>{this.err=e;this.done=true;this.ping()}});
    this.dec.configure(d.config);this.dec.ondequeue=()=>this.ping();
  }
  ping(){const w=this.wait;this.wait=null;if(w)w()}
  /* image à afficher au temps t (s) ; on garde peu d'images en attente pour ne pas saturer le décodeur de la carte graphique */
  async frameAt(t){
    const tus=t*1e6+500,n=this.d.chunks.length;
    for(;;){
      while(this.q.length>1&&this.q[1].timestamp<=tus)this.q.shift().close();
      const l=this.q[this.q.length-1];
      if(l&&(l.timestamp>tus||this.done))return this.q[0];
      if(this.err)return null;
      if(this.idx<n&&this.fed-this.outN<this.cap&&this.dec.decodeQueueSize<4){
        const c=this.d.chunks[this.idx++];this.fed++;
        this.dec.decode(new EncodedVideoChunk({type:c.key?'key':'delta',timestamp:Math.round(c.ts),data:c.data}));
        continue;
      }
      if(this.idx>=n&&!this.flushing)this.flushing=this.dec.flush().catch(()=>{}).then(()=>{this.done=true;this.ping()});
      if(this.done)return this.q[0]||null;
      const before=this.outN,ok=await new Promise(r=>{this.wait=()=>r(true);setTimeout(()=>r(false),2500)});
      if(!ok&&this.outN===before){
        if(this.idx<n&&this.cap<64){this.cap*=2;continue} // décodeur qui demande plus d'images avant de répondre
        if(this.q.length)return this.q[0];
        this.err=new Error(T('export.decoderStuck'));return null;
      }
    }
  }
  close(){try{this.dec.close()}catch(e){}this.q.forEach(f=>f.close());this.q=[]}
}
/* secours si une vidéo ne peut pas être décodée directement : on avance l'élément vidéo image par image */
class SeekReader{
  constructor(m){this.el=document.createElement('video');this.el.crossOrigin='anonymous';this.el.muted=true;this.el.preload='auto';this.el.src=m.url}
  async frameAt(t){
    const el=this.el;
    if(el.readyState<1)await new Promise(r=>{el.onloadedmetadata=r;el.onerror=r;setTimeout(r,5000)});
    if(Math.abs(el.currentTime-t)>.001||el.readyState<2){el.currentTime=t;await new Promise(r=>{const f=()=>{el.removeEventListener('seeked',f);r()};el.addEventListener('seeked',f);setTimeout(f,3000)})}
    return el;
  }
  close(){this.el.removeAttribute('src');this.el.load()}
}
function decodeAudio(m){
  if(!abufCache.has(m.id))abufCache.set(m.id,(async()=>new OfflineAudioContext(2,1,48000).decodeAudioData(await mediaBuf(m)))().catch(()=>null));
  return abufCache.get(m.id);
}
const revCache=new WeakMap();
function revBuf(b){
  if(revCache.has(b))return revCache.get(b);
  const r=new AudioBuffer({length:b.length,numberOfChannels:b.numberOfChannels,sampleRate:b.sampleRate});
  for(let c=0;c<b.numberOfChannels;c++){const a=b.getChannelData(c),d=r.getChannelData(c),n=a.length;for(let i=0;i<n;i++)d[i]=a[n-1-i]}
  revCache.set(b,r);return r;
}
async function mixAudio(TD){
  const sc=clips.filter(c=>{const m=c.mid&&mById(c.mid);return m&&m.type!=='image'&&!trk(c).mute});
  if(!sc.length)return null;
  const oc=new OfflineAudioContext(2,Math.ceil(TD*48000)+1,48000);
  let ws=-1;try{await oc.audioWorklet.addModule(URL.createObjectURL(new Blob([PS_SRC],{type:'application/javascript'})));ws=1}catch(e){}
  const mv=oc.createGain(),lm=oc.createDynamicsCompressor();mv.gain.value=masterVol/100;limiterSet(lm);mv.connect(lm);lm.connect(oc.destination);
  let any=false;
  for(const c of sc){
    let buf=await decodeAudio(mById(c.mid));if(!buf)continue;any=true;if(c.p.rev)buf=revBuf(buf);
    const s=oc.createBufferSource(),cc=buildChain(oc,ws),g=cc.g,rate=clamp(c.p.rate||1,.1,8);s.buffer=buf;s.playbackRate.value=rate;
    chainParams(cc,c.p.au);
    const n=Math.max(2,Math.ceil(c.dur*100)),cu=new Float32Array(n);for(let i=0;i<n;i++)cu[i]=volAt(c,c.start+c.dur*i/(n-1)*.9999);
    g.gain.setValueCurveAtTime(cu,c.start,c.dur);
    const v=c.p.voice,on=!!(v&&v.on),pitch=(on?v.pitch:1)/(c.p.chip?1:rate);
    if(on||(ws===1&&Math.abs(pitch-1)>.01)){const ch=buildVoice(oc,ws);voiceParams(ch,Object.assign(voiceDefaults(),on?v:{},{pitch:clamp(pitch,.25,3)}));s.connect(ch.in);ch.out.connect(g)}
    else s.connect(g);
    cc.out.connect(mv);
    s.start(c.start,c.p.rev?Math.max(0,buf.duration-(c.in+c.dur*rate)):c.in,c.dur*rate);
  }
  return any?oc.startRendering():null;
}
function xProgress(q,t0){
  $('#bar i').style.width=(q*100)+'%';
  const el=(performance.now()-t0)/1000,rest=q>.02?el*(1-q)/q:0;
  const tm=x=>fmt(x).replace(/\.\d$/,'');
  $('#xPct').textContent=[window.i18n.fmt.percent(Math.min(1,q)),T('export.elapsed',{time:tm(el)}),q>.02&&q<1&&T('export.remaining',{time:tm(rest)})].filter(Boolean).join(' · ');
}

/* ---------- export GIF animé : encodeur écrit pour DedCut (palette par coupes médianes + tramage + compression LZW) ---------- */
function gifPalette(frames){
  const total=frames.length*frames[0].length/4,step=Math.max(1,Math.floor(total/60000)),px=[];
  let k=0;for(const f of frames)for(let i=0;i<f.length;i+=4)if((k++)%step===0)px.push((f[i]<<16)|(f[i+1]<<8)|f[i+2]);
  const boxes=[px];
  while(boxes.length<256){
    let bi=0;for(let i=1;i<boxes.length;i++)if(boxes[i].length>boxes[bi].length)bi=i;
    const b=boxes[bi];if(b.length<2)break;
    let r0=255,r1=0,g0=255,g1=0,b0=255,b1=0;
    for(const c of b){const r=c>>16,g=(c>>8)&255,bl=c&255;if(r<r0)r0=r;if(r>r1)r1=r;if(g<g0)g0=g;if(g>g1)g1=g;if(bl<b0)b0=bl;if(bl>b1)b1=bl}
    const dr=r1-r0,dg=g1-g0,db=b1-b0,sh=dr>=dg&&dr>=db?16:dg>=db?8:0;
    b.sort((x,y)=>((x>>sh)&255)-((y>>sh)&255));const mid=b.length>>1;
    boxes.splice(bi,1,b.slice(0,mid),b.slice(mid));
  }
  const pal=boxes.map(b=>{let r=0,g=0,bl=0;for(const c of b){r+=c>>16;g+=(c>>8)&255;bl+=c&255}const n=Math.max(1,b.length);return[Math.round(r/n),Math.round(g/n),Math.round(bl/n)]});
  while(pal.length<256)pal.push([0,0,0]);
  return pal;
}
function gifIndexer(pal){
  const cache=new Int16Array(32768).fill(-1);
  return(r,g,b)=>{
    r=r<0?0:r>255?255:r;g=g<0?0:g>255?255:g;b=b<0?0:b>255?255:b;
    const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);let v=cache[key];
    if(v<0){const rr=(r&248)|4,gg=(g&248)|4,bb=(b&248)|4;let bd=1e9;v=0;
      for(let i=0;i<256;i++){const p=pal[i],d=(p[0]-rr)*(p[0]-rr)+(p[1]-gg)*(p[1]-gg)+(p[2]-bb)*(p[2]-bb);if(d<bd){bd=d;v=i}}
      cache[key]=v}
    return v;
  };
}
function gifLzw(idx,minCode){
  const clear=1<<minCode,eoi=clear+1,out=[];let size=minCode+1,next=eoi+1,cur=0,sh=0,table=new Map();
  const emit=c=>{cur|=c<<sh;sh+=size;while(sh>=8){out.push(cur&255);cur>>>=8;sh-=8}};
  emit(clear);let code=idx[0];
  for(let i=1;i<idx.length;i++){
    const k=idx[i],key=(code<<8)|k,f=table.get(key);
    if(f!==undefined)code=f;
    else{
      emit(code);
      if(next===4096){emit(clear);size=minCode+1;next=eoi+1;table=new Map()}
      else{if(next>=(1<<size))size++;table.set(key,next++)}
      code=k;
    }
  }
  emit(code);emit(eoi);if(sh>0)out.push(cur&255);
  return Uint8Array.from(out);
}
async function gifEncode(frames,w,h,delayCs,onP){
  const pal=gifPalette(frames),ix=gifIndexer(pal),parts=[],u16=n=>[n&255,(n>>8)&255];
  parts.push(Uint8Array.from([71,73,70,56,57,97,...u16(w),...u16(h),0xF7,0,0]));
  parts.push(Uint8Array.from(pal.flat()));
  parts.push(Uint8Array.from([0x21,0xFF,0x0B,...'NETSCAPE2.0'.split('').map(c=>c.charCodeAt(0)),3,1,0,0,0]));
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let f=0;f<frames.length;f++){
    const d=frames[f],idx=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,o=(bayer[(y&3)*4+(x&3)]-7.5)*2.2;idx[y*w+x]=ix(d[i]+o,d[i+1]+o,d[i+2]+o)}
    parts.push(Uint8Array.from([0x21,0xF9,4,0,...u16(delayCs),0,0]));
    parts.push(Uint8Array.from([0x2C,0,0,0,0,...u16(w),...u16(h),0,8]));
    const data=gifLzw(idx,8);
    for(let i=0;i<data.length;i+=255){const n=Math.min(255,data.length-i);parts.push(Uint8Array.from([n]));parts.push(data.subarray(i,i+n))}
    parts.push(Uint8Array.from([0]));
    if(f%4===0){onP&&onP((f+1)/frames.length);await new Promise(r=>setTimeout(r,0))}
  }
  parts.push(Uint8Array.from([0x3B]));
  return new Blob(parts,{type:'image/gif'});
}
const GIF_MAX_S=40,GIF_MAX_FRAMES=450;
async function gifExport(fps){
  await vizReady();
  const TD=total();
  if(TD>GIF_MAX_S)throw new Error(T('export.gifTooLong',{max:GIF_MAX_S}));
  const f=Math.max(4,Math.min(15,fps,Math.floor(GIF_MAX_FRAMES/Math.max(1,TD)))),N=Math.max(1,Math.ceil(TD*f)),t0=performance.now();
  pause();fastCancel=false;
  const gw=Math.max(2,Math.min(480,W)&~1),gh=Math.max(2,Math.round(H*gw/W)&~1);
  const sc=document.createElement('canvas');sc.width=gw;sc.height=gh;const sx=sc.getContext('2d',{willReadFrequently:true});
  for(const c of clips){const m=c.mid&&mById(c.mid);if(m&&m.type==='image'){const el=getEl(c);try{await el.decode()}catch(e){}}}
  const readers=new Map(),frames=[];fastExp=true;xf=new Map();
  try{
    for(let i=0;i<N;i++){
      if(fastCancel)return null;
      const t=i/f,act=clips.filter(c=>t>=c.start&&t<c.start+c.dur&&!trk(c).hide);
      for(const[id,r]of readers)if(!act.some(c=>c.id===id)){r.close();readers.delete(id);xf.delete(id)}
      for(const c of act){
        const m=c.mid&&mById(c.mid);if(!m||m.type!=='video'||isAud(c))continue;
        const src=Math.min(srcOf(c,t),Math.max(0,(m.duration||1e9)-.03));let r=readers.get(c.id);
        if(!r){r=new SeekReader(m);readers.set(c.id,r)}
        const img=await r.frameAt(src);
        if(img)xf.set(c.id,{img,w:img.displayWidth||img.videoWidth,h:img.displayHeight||img.videoHeight});else xf.delete(c.id);
      }
      render(t);
      sx.drawImage(cv,0,0,gw,gh);frames.push(sx.getImageData(0,0,gw,gh).data);
      if(i%3===0){xProgress(i/N*.8,t0);await yieldUI()}
    }
  }finally{readers.forEach(r=>r.close());fastExp=false;xf=null}
  $('#xPct').textContent=T('export.gifEncoding');
  const blob=await gifEncode(frames,gw,gh,Math.round(100/f),q=>xProgress(.8+q*.2,t0));
  return blob;
}
/* soft=true : encodeur logiciel (repli automatique quand l'encodeur matériel se bloque : il ne rend rien avant la fin) */
async function fastExport(fps,br,soft){
  await vizReady();
  const TD=total(),N=Math.max(1,Math.ceil(TD*fps)),t0=performance.now();
  pause();fastCancel=false;
  let vcfg=null;
  for(const codec of['avc1.640034','avc1.640033','avc1.4d0034','avc1.4d0033','avc1.42003e','avc1.640028']){
    for(const mode of br.cbr?['constant',null]:[null]){
      const c={codec,width:W,height:H,bitrate:br.v,framerate:fps,avc:{format:'avc'}};if(mode)c.bitrateMode=mode;if(soft===true)c.hardwareAcceleration='prefer-software';else if(soft==='hw')c.hardwareAcceleration='prefer-hardware';
      if((await VideoEncoder.isConfigSupported(c).catch(()=>({}))).supported){vcfg=c;break}
    }
    if(vcfg)break;
  }
  if(!vcfg)throw new Error(T('export.noH264'));
  $('#xPct').textContent=T('export.audioPrep');
  const audio=await mixAudio(TD);
  let acfg=null;
  if(audio)for(const codec of['mp4a.40.2','opus']){const c={codec,sampleRate:48000,numberOfChannels:2,bitrate:br.a};if((await AudioEncoder.isConfigSupported(c).catch(()=>({}))).supported){acfg=c;break}}
  /* gros fichier (4K, longue vidéo) : écrit directement sur le disque au lieu de la mémoire */
  const estMB=(br.v+br.a)*TD/8388608;let disk=null,wchain=Promise.resolve(),target;
  if(inApp&&estMB>900){try{disk=await(await appFetch('app://dedcut/__out?op=start&name='+encodeURIComponent(expName+'.mp4'),{method:'POST'})).json()}catch(e){disk=null}}
  if(disk)target=new Mp4Muxer.StreamTarget({onData:(data,pos)=>{const b=data.slice();wchain=wchain.then(()=>appFetch('app://dedcut/__out?op=write&pos='+pos,{method:'POST',body:b}))},chunked:true,chunkSize:2**24});
  else target=new Mp4Muxer.ArrayBufferTarget();
  const mux=new Mp4Muxer.Muxer({target,video:{codec:'avc',width:W,height:H,frameRate:fps},
    audio:acfg?{codec:acfg.codec==='opus'?'opus':'aac',numberOfChannels:2,sampleRate:48000}:undefined,fastStart:disk?false:'in-memory',firstTimestampBehavior:'offset'});
  let err=null;
  let nOut=0;const tEnc=performance.now();
  const venc=new VideoEncoder({output:(ch,meta)=>{nOut++;mux.addVideoChunk(ch,meta)},error:e=>err=e});venc.configure(vcfg);
  /* images préchargées */
  for(const c of clips){const m=c.mid&&mById(c.mid);if(m&&m.type==='image'){const el=getEl(c);try{await el.decode()}catch(e){}}}
  const readers=new Map();fastExp=true;xf=new Map();
  try{
    for(let i=0;i<N;i++){
      if(fastCancel)return null;
      const t=i/fps,act=clips.filter(c=>t>=c.start&&t<c.start+c.dur&&!trk(c).hide);
      for(const[id,r]of readers)if(!act.some(c=>c.id===id)){r.close();readers.delete(id);xf.delete(id)}
      for(const c of act){
        const m=c.mid&&mById(c.mid);if(!m||m.type!=='video'||isAud(c))continue;
        const src=Math.min(srcOf(c,t),Math.max(0,(m.duration||1e9)-.03));let r=readers.get(c.id);
        if(!r){const d=c.p.rev?null:await demux(m);r=d?new FrameReader(d,src):new SeekReader(m);readers.set(c.id,r)}
        let img=await r.frameAt(src);
        if(!img&&r instanceof FrameReader){r.close();r=new SeekReader(m);readers.set(c.id,r);img=await r.frameAt(src)}
        if(img)xf.set(c.id,{img,w:img.displayWidth||img.videoWidth,h:img.displayHeight||img.videoHeight});else xf.delete(c.id);
      }
      render(t);
      const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      venc.encode(vf,{keyFrame:i%(fps*2)===0});vf.close();
      if(err)throw err;
      if(venc.encodeQueueSize>4){
        await new Promise(r=>{venc.addEventListener('dequeue',r,{once:true});setTimeout(r,250)});
        // encodeur matériel bloqué (file qui grossit, aucune sortie) : on arrête pour recommencer avec l'encodeur logiciel
        if(!soft&&nOut===0&&venc.encodeQueueSize>8&&performance.now()-tEnc>1500){try{venc.close()}catch(e){}throw new Error('STALL')}
      }
      if(i%6===0){xProgress(i/N*(audio?.92:1),t0);await yieldUI()}
    }
  }finally{readers.forEach(r=>r.close());fastExp=false;xf=null}
  await venc.flush();venc.close();if(err)throw err;
  if(acfg){
    $('#xPct').textContent=T('export.audioEnc');
    const aenc=new AudioEncoder({output:(ch,meta)=>mux.addAudioChunk(ch,meta),error:e=>err=e});aenc.configure(acfg);
    const Lc=audio.getChannelData(0),Rc=audio.numberOfChannels>1?audio.getChannelData(1):Lc,n=audio.length,B=4800;
    for(let i=0;i<n;i+=B){
      if(fastCancel)return null;
      const k=Math.min(B,n-i),d=new Float32Array(k*2);d.set(Lc.subarray(i,i+k),0);d.set(Rc.subarray(i,i+k),k);
      const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:k,numberOfChannels:2,timestamp:Math.round(i*1e6/48000),data:d});aenc.encode(ad);ad.close();
      if(aenc.encodeQueueSize>16)await new Promise(r=>{aenc.addEventListener('dequeue',r,{once:true});setTimeout(r,1000)});
    }
    await aenc.flush();aenc.close();if(err)throw err;
  }
  mux.finalize();xProgress(1,t0);
  if(disk){await wchain;const r=await(await appFetch('app://dedcut/__out?op=end',{method:'POST'})).json();return{disk:r.path}}
  return new Blob([mux.target.buffer],{type:'video/mp4'});
}

/* ---------- import ---------- */
function addFiles(list){
  const made=[];
  for(const f of list){
    const type=f.type.startsWith('video')?'video':f.type.startsWith('audio')?'audio':f.type.startsWith('image')?'image':null;
    if(!type){toast(T('media.unsupported',{name:f.name}));continue}
    const m={id:uid++,name:f.name,type,url:URL.createObjectURL(f),duration:5,thumb:null,blob:f};
    media.push(m);made.push(m);
    loadMeta(m);
  }
  renderBin();
  return made;
}
/* infos d'un média : durée, taille, miniature, forme d'onde */
function loadMeta(m){
  const type=m.type;
  if(type==='image'){m.thumb=m.url;const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{m.w=im.naturalWidth;m.h=im.naturalHeight;m.ok=true};im.onerror=()=>{m.ok=true};im.src=m.url;renderBin();persistMedia(m)}
  else{
    const v=document.createElement(type);v.crossOrigin='anonymous';v.preload='metadata';v.muted=true;v.src=m.url;
    let known=false;
    const ready=()=>{known=true;m.ok=true;m.duration=v.duration||1;m.w=v.videoWidth||0;m.h=v.videoHeight||0;if(type==='video'){v.currentTime=Math.min(.5,v.duration/2);pxAuto(m)}renderBin();persistMedia(m);queueWave(m)};
    // les vidéos enregistrées (MediaRecorder) n'annoncent pas toujours leur durée : on va à la fin pour la connaître
    v.onloadedmetadata=()=>{if(isFinite(v.duration))ready();else{v.ondurationchange=()=>{if(isFinite(v.duration)&&!known){v.ondurationchange=null;ready()}};v.currentTime=1e101}};
    v.onseeked=()=>{if(m.thumb||!known)return;try{const c=document.createElement('canvas');c.width=160;c.height=Math.round(160*(v.videoHeight/v.videoWidth||.5625));c.getContext('2d').drawImage(v,0,0,c.width,c.height);m.thumb=c.toDataURL('image/jpeg',.8);renderBin();renderTL();persistMedia(m)}catch(e){}};
    v.onerror=()=>{m.ok=true;toast(T('media.unreadable',{name:m.name}))};
  }
}
/* forme d'onde (calculée en arrière-plan, affichée dans la timeline) */
let waveQ=Promise.resolve();
function mediaBuf(m){return m.blob?m.blob.arrayBuffer():fetch(m.url).then(r=>{if(!r.ok)throw new Error('lecture');return r.arrayBuffer()})}
function mediaSize(m){return m.blob?m.blob.size:(m.size||0)}
function queueWave(m){if(m.missing||!m.url)return;if(m.type==='image'||m.pk||mediaSize(m)>4e8)return;waveQ=waveQ.then(()=>makeWave(m)).catch(()=>{})}
/* analyse du son : crête et niveau moyen (RMS) par petite tranche (jusqu'à 200 par seconde), gardés en mémoire ;
   l'onde est ensuite dessinée au pixel près pour le zoom affiché (drawWaves) */
async function makeWave(m){
  const oc=new OfflineAudioContext(1,1,44100);
  const buf=await oc.decodeAudioData(await mediaBuf(m));
  const ch=[];for(let k=0;k<Math.min(2,buf.numberOfChannels);k++)ch.push(buf.getChannelData(k));
  const L=ch[0].length,rate=Math.min(200,Math.max(20,Math.floor(720000/Math.max(1,buf.duration)))),N=Math.max(1,Math.ceil(buf.duration*rate)),bs=L/N;
  const p=new Float32Array(N),q=new Float32Array(N);let mx=1e-6;
  for(let i=0;i<N;i++){
    let a=0,e2=0,n=0;const j0=Math.floor(i*bs),j1=Math.min(L,Math.floor((i+1)*bs));
    for(const d of ch)for(let j=j0;j<j1;j++){const v=d[j],av=v<0?-v:v;if(av>a)a=av;e2+=v*v;n++}
    p[i]=a;q[i]=Math.sqrt(e2/(n||1));if(a>mx)mx=a;
    if((i&4095)===4095)await new Promise(r=>setTimeout(r)); // laisse respirer l'interface sur les longs fichiers
  }
  m.pk={r:rate,p,q,mx};renderTL();
}
const WV_GAMMA=.6;
function drawWaves(){
  const sc=$('#tls');if(!sc)return;
  const v0=sc.scrollLeft-200,v1=sc.scrollLeft+sc.clientWidth+200;
  for(const cv of $$('#rows canvas.wvc')){
    const c=clips.find(x=>x.id==cv.dataset.id),m=c&&c.mid&&mById(c.mid),pk=m&&m.pk;if(!pk)continue;
    const box=cv.parentNode,W0=c.dur*pxs,x0=Math.max(0,v0-c.start*pxs),x1=Math.min(W0,v1-c.start*pxs);
    if(x1<=x0){cv.style.display='none';continue}
    const win=cv.ownerDocument.defaultView,dpr=win.devicePixelRatio||1,hc=box.clientHeight,w=Math.max(1,Math.round((x1-x0)*dpr)),hh=Math.max(2,Math.round(hc*dpr));
    cv.style.display='';cv.style.left=x0+'px';cv.style.width=(x1-x0)+'px';cv.style.height=hc+'px';
    if(cv.width!==w)cv.width=w;if(cv.height!==hh)cv.height=hh;
    const g=cv.getContext('2d');g.clearRect(0,0,w,hh);
    const col=win.getComputedStyle(box).color,rt=c.p.rate||1,rev=!!c.p.rev,vol=Math.min(1.3,Math.max(0,(c.p.vol??100)/100)),mid=hh/2,A=hh/2-dpr,N=pk.p.length,R=pk.r,inv=1/pk.mx;
    const tm=t=>rev?c.in+(c.dur-t)*rt:c.in+t*rt;
    const at=(arr,f)=>{const i=Math.min(N-1,Math.max(0,Math.floor(f))),k=Math.min(N-1,i+1),u=f-Math.floor(f);return arr[i]*(1-u)+arr[k]*u};
    const P=new Float32Array(w),Q=new Float32Array(w),C=new Uint8Array(w);
    for(let x=0;x<w;x++){
      let ta=tm((x0+x/dpr)/pxs)*R,tb=tm((x0+(x+1)/dpr)/pxs)*R;if(ta>tb){const z=ta;ta=tb;tb=z}
      let pv,qv,raw;
      if(tb-ta<1){pv=raw=at(pk.p,ta);qv=at(pk.q,ta)}
      else{pv=0;qv=0;const a=Math.max(0,Math.floor(ta)),b=Math.min(N,Math.ceil(tb));for(let i=a;i<b;i++){if(pk.p[i]>pv)pv=pk.p[i];if(pk.q[i]>qv)qv=pk.q[i]}raw=pv}
      P[x]=Math.min(1,Math.pow(pv*inv,WV_GAMMA)*vol);Q[x]=Math.min(1,Math.pow(qv*inv,WV_GAMMA)*vol);C[x]=raw>=.985&&vol>0?1:0;
    }
    g.fillStyle=col;
    g.globalAlpha=.32;g.fillRect(0,Math.round(mid-dpr/2),w,Math.max(1,Math.round(dpr)));      // ligne du milieu
    g.globalAlpha=.5;for(let x=0;x<w;x++){const h=Math.max(.5,P[x]*A);g.fillRect(x,mid-h,1,h*2)}   // crêtes
    g.globalAlpha=1;for(let x=0;x<w;x++){const h=Q[x]*A;if(h>.4)g.fillRect(x,mid-h,1,h*2)}         // niveau moyen
    g.fillStyle='#f43f5e';for(let x=0;x<w;x++)if(C[x]){const h=Math.max(.5,P[x]*A);g.fillRect(x,mid-h,1,h*2)} // son saturé
  }
}
let wvRaf=0;const drawWavesSoon=()=>{if(!wvRaf)wvRaf=requestAnimationFrame(()=>{wvRaf=0;drawWaves()})};
function updateMediaStyles(){
  $('#mstyles').textContent=media.map(m=>(m.thumb?`.m${m.id}{background-image:url("${m.thumb}")!important}`:'')+'').join('\n');
}
let mfilt='all';
function renderBin(){
  updateMediaStyles();
  const box=$('#mlist'),l0=media.filter(m=>mfilt==='all'||m.type===mfilt),list=window.binView?binView(l0):l0;
  box.innerHTML=list.length?list.map(m=>`<div class="card${m.missing?' miss':''}" data-mid="${m.id}" title="${esc(m.missing?m.path||m.name:m.name)}${m.type==='audio'?'':'\n'+T('ins.tip')}">
    <div class="cth ${m.type==='audio'?'aud':'m'+m.id}">${m.type==='audio'?`<i class="w${m.id}"></i>♪`:m.thumb?'':'…'}
      ${m.type==='image'?'':`<span class="dur">${fmt(m.duration)}</span>`}${pxBusy.has(m.id)?`<span class="pxb" id="px${m.id}">${T('proxy.working',{pct:window.i18n.fmt.percent(pxBusy.get(m.id)||0)})}</span>`:m.proxyUrl?`<span class="pxb" title="${T('proxy.badgeTip')}">${T('proxy.badge')}</span>`:''}
      ${m.missing?`<div class="mmiss"><b>${T('media.notFound')}</b><button data-relink="${m.id}">${T('media.relink')}</button></div>`:''}<div class="cact"><button data-add="${m.id}" title="${T('media.addTip')}">+</button>${m.type!=='audio'?`<button data-ov="${m.id}" title="${T('media.overlayTip')}">⧉</button>`:''}${m.type==='video'&&m.path&&!pxBusy.has(m.id)?`<button data-px="${m.id}" title="${T(m.proxyUrl?'proxy.remove':'proxy.make')}">⚡</button>`:''}<button class="x" data-del="${m.id}" title="${T('media.deleteTip')}">✕</button></div>
    </div><div class="cnm">${window.binBadge?binBadge(m):''}${esc(m.name)}</div></div>`).join(''):`<div class="hint" style="grid-column:1/-1">${l0.length?T('bin.noMatch'):media.length?T('media.noneOfType'):T('media.empty')}</div>`;
  const au=media.filter(m=>m.type==='audio');
  $('#alist').innerHTML=au.length?au.map(m=>`<div class="srow"><span class="nm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span><span class="hint" style="flex:none">${fmt(m.duration)}</span><button data-add="${m.id}" title="${T('common.addAtPlayhead')}">+</button></div>`).join(''):'<div class="hint">'+T('audio.noSounds')+'</div>';
}
$('#mfilt').addEventListener('click',e=>{const b=e.target.closest('[data-mf]');if(!b)return;mfilt=b.dataset.mf;$$('#mfilt button').forEach(x=>x.classList.toggle('on',x===b));renderBin()});
$('#lib').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const a=b.dataset.add,o=b.dataset.ov,d=b.dataset.del;
  if(a){const m=mById(+a);addFromMedia(+a,false,m&&m.type==='audio'?time:undefined)}
  if(o)addFromMedia(+o,true);if(d)removeMedia(+d);if(b.dataset.relink)relinkMedia(+b.dataset.relink);if(b.dataset.px)pxToggle(+b.dataset.px);
});
$('#mlist').addEventListener('dblclick',e=>{const c=e.target.closest('.card');if(c)addFromMedia(+c.dataset.mid,false)});
async function removeMedia(id){
  const used=clips.some(c=>c.mid===id)||(scenes||[]).some((s,i)=>i!==curSc&&s.clips.some(c=>c.mid===id));
  if(used&&!(await askYes(T('media.removeConfirm'))))return;
  (scenes||[]).forEach((s,i)=>{if(i!==curSc)s.clips=s.clips.filter(c=>c.mid!==id)});
  clips.filter(c=>c.mid===id).forEach(c=>{const e=els.get(c.id);if(e&&e.pause)e.pause();els.delete(c.id)});
  clips=clips.filter(c=>c.mid!==id);if(!selClip())sel=null;
  const m=mById(id);if(m&&m.url&&m.url.startsWith('blob:'))URL.revokeObjectURL(m.url);
  media=media.filter(x=>x.id!==id);
  if(DB.db)DB.del('media',id).catch(()=>{});
  commit();renderBin();refresh();
}

/* ---------- création de clips ---------- */
function newClip(o){return Object.assign({id:uid++,track:0,start:0,dur:3,in:0,p:{}},o)}
function add(c){if(tracks[c.track]&&tracks[c.track].kind==='audio')placeFree(c);clips.push(c);sel=c.id;commit();refresh()}
function endOf(track){return clips.filter(c=>c.track===track).reduce((a,c)=>Math.max(a,c.start+c.dur),0)}
function addFromMedia(id,overlay,at,onTrack){
  const m=mById(id);if(!m)return;
  if(!isFinite(m.duration)||m.duration<=0)m.duration=5;
  const want=m.type==='audio'?'audio':overlay?'over':'video';
  const tr=onTrack!=null&&tracks[onTrack]&&tracks[onTrack].kind===want?onTrack:tk(want);
  if(want==='audio')add(newClip({track:tr,mid:id,start:at??time,dur:m.duration,p:{vol:100}}));
  else if(want==='over')add(newClip({track:tr,mid:id,start:at??time,dur:m.type==='video'?m.duration:4,p:{x:50,y:50,scale:40,op:100,vol:100}}));
  else add(newClip({track:tr,mid:id,start:at??endOf(tr),dur:m.type==='video'?m.duration:5,p:{vol:100,fit:'cover',amt:60,fx:noFx()}}));
}
const TBASE=()=>({font:'Arial Black',color:'#ffffff',stroke:false,sc:'#000000',sw:7,shadow:false,glitch:false,neon:false,bg:false,bgc:'#000000',anim:'none',aout:'none',bold:true,italic:false,ls:0,align:'center',fade:false,amt:60,
  caps:false,hollow:false,gradOn:false,grad:'#f43f5e',st2On:false,st2:'#facc15',hardOn:false,hard:'#000000',extOn:false,ext:'#7c3aed',glowc:'',bgs:'box',bgo:88,aloop:'none'});
/* modèles de texte (styles) : n = nom, s = réglages ; sz = taille (hauteur / sz), y = position verticale */
const TPRE={
  classic:{n:'txs.classic',s:{shadow:true,anim:'fade',aout:'fade'}},
  clean:{n:'txs.clean',s:{font:'Segoe UI',anim:'fade'}},
  contour:{n:'txs.contour',s:{font:'Impact',stroke:true,sw:9,anim:'pop'}},
  elegant:{n:'txs.elegant',s:{font:'Georgia',italic:true,bold:false,color:'#fef3c7',shadow:true,anim:'fade',aout:'fade'}},
  minimal:{n:'txs.minimal',s:{font:'Segoe UI',bold:false,ls:12,caps:true,anim:'slide',aout:'fade'}},
  machine:{n:'txs.machine',s:{font:'Courier New',shadow:true,anim:'typec'}},
  jaune:{n:'txs.jaune',s:{color:'#fde047',stroke:true,sw:9,anim:'pop'}},
  viral:{n:'txs.viral',s:{font:'Arial Black',caps:true,stroke:true,sw:8,glitch:true,amt:25,anim:'letters'}},
  story:{n:'txs.story',s:{font:'Segoe UI',color:'#111111',bg:true,bgc:'#ffffff',bgs:'pill',bgo:96,anim:'pop'}},
  thumb:{n:'txs.thumb',s:{font:'Impact',caps:true,color:'#fde047',gradOn:true,grad:'#f97316',stroke:true,sw:10,hardOn:true,hard:'#000000',anim:'zoom'}},
  marker:{n:'txs.marker',s:{color:'#111111',bg:true,bgc:'#facc15',bgs:'line',bgo:100,anim:'wipe'}},
  comic:{n:'txs.comic',s:{font:'Comic Sans MS',color:'#111111',bg:true,bgc:'#ffffff',bgs:'pill',anim:'bounce'}},
  neon:{n:'txs.neon',s:{color:'#fdf4ff',neon:true,glowc:'#e879f9',anim:'fade',aloop:'glow'}},
  neonblue:{n:'txs.neonblue',s:{font:'Segoe UI',color:'#e0f2fe',neon:true,glowc:'#0ea5e9',anim:'fade',aloop:'flicker'}},
  neongreen:{n:'txs.neongreen',s:{font:'Bahnschrift',color:'#dcfce7',neon:true,glowc:'#22c55e',anim:'blur'}},
  neonred:{n:'txs.neonred',s:{font:'Segoe Script',color:'#fee2e2',neon:true,glowc:'#ef4444',anim:'fade',aloop:'flicker'}},
  neonhollow:{n:'txs.neonhollow',s:{caps:true,hollow:true,stroke:true,sc:'#f0abfc',sw:5,neon:true,glowc:'#d946ef',anim:'fade',aloop:'glow'}},
  cyber:{n:'txs.cyber',s:{font:'Consolas',caps:true,ls:6,color:'#a5f3fc',neon:true,glowc:'#06b6d4',glitch:true,amt:30,anim:'glitchin'}},
  retro80:{n:'txs.retro80',s:{italic:true,caps:true,color:'#fdf2f8',gradOn:true,grad:'#22d3ee',extOn:true,ext:'#7c3aed',anim:'zoom'}},
  vhs:{n:'txs.vhs',s:{font:'Consolas',caps:true,ls:4,shadow:true,glitch:true,amt:70,anim:'glitchin',aloop:'shake'}},
  arcade:{n:'txs.arcade',s:{font:'Consolas',caps:true,ls:4,color:'#facc15',hardOn:true,hard:'#dc2626',anim:'letters'}},
  disco:{n:'txs.disco',s:{font:'Georgia',italic:true,color:'#fef9c3',gradOn:true,grad:'#d97706',shadow:true,anim:'spin',aloop:'pulse'}},
  vintage:{n:'txs.vintage',s:{font:'Palatino Linotype',color:'#fde68a',hardOn:true,hard:'#78350f',anim:'fade',aout:'fade'}},
  popart:{n:'txs.popart',s:{font:'Impact',caps:true,color:'#facc15',stroke:true,sw:8,hardOn:true,hard:'#ef4444',anim:'pop'}},
  cine:{n:'txs.cine',s:{font:'Times New Roman',caps:true,bold:false,ls:14,color:'#f5f5f4',anim:'fade',aout:'fade'}},
  trailer:{n:'txs.trailer',s:{font:'Trebuchet MS',caps:true,ls:10,color:'#f9fafb',gradOn:true,grad:'#9ca3af',shadow:true,anim:'blur',aout:'blur'}},
  horror:{n:'txs.horror',s:{font:'Ink Free',color:'#dc2626',shadow:true,glitch:true,amt:20,anim:'fade',aloop:'shake'}},
  epic:{n:'txs.epic',s:{font:'Georgia',caps:true,color:'#fef3c7',gradOn:true,grad:'#b45309',shadow:true,anim:'zoom',aout:'fade'}},
  credits:{n:'txs.credits',s:{font:'Segoe UI',bold:false,caps:true,ls:6,color:'#d4d4d8',anim:'rise',aout:'fade'}},
  docu:{n:'txs.docu',s:{font:'Segoe UI',bg:true,bgc:'#111827',bgo:82,anim:'slidel',aout:'slidel'}},
  double:{n:'txs.double',s:{stroke:true,sw:6,st2On:true,st2:'#facc15',anim:'pop'}},
  hollow:{n:'txs.hollow',s:{caps:true,hollow:true,stroke:true,sc:'#ffffff',sw:4,anim:'wipe'}},
  extrude:{n:'txs.extrude',s:{caps:true,color:'#fde047',extOn:true,ext:'#b45309',anim:'drop'}},
  extrude2:{n:'txs.extrude2',s:{caps:true,color:'#ffffff',extOn:true,ext:'#2563eb',anim:'flip'}},
  sticker:{n:'txs.sticker',s:{color:'#ec4899',stroke:true,sc:'#ffffff',sw:16,hardOn:true,hard:'#0000008c',anim:'pop',aloop:'swing'}},
  hardshadow:{n:'txs.hardshadow',s:{font:'Impact',caps:true,hardOn:true,hard:'#7c3aed',anim:'slidel'}},
  sunset:{n:'txs.sunset',s:{color:'#fde047',gradOn:true,grad:'#f43f5e',shadow:true,anim:'rise'}},
  ocean:{n:'txs.ocean',s:{color:'#a5f3fc',gradOn:true,grad:'#2563eb',shadow:true,anim:'fade',aloop:'float'}},
  candy:{n:'txs.candy',s:{font:'Comic Sans MS',color:'#fbcfe8',gradOn:true,grad:'#a855f7',stroke:true,sc:'#ffffff',sw:6,anim:'bounce'}},
  fire:{n:'txs.fire',s:{font:'Impact',caps:true,color:'#fef08a',gradOn:true,grad:'#dc2626',stroke:true,sc:'#450a0a',sw:5,anim:'zoom',aloop:'flicker'}},
  mint:{n:'txs.mint',s:{font:'Bahnschrift',color:'#dcfce7',gradOn:true,grad:'#14b8a6',anim:'slide'}},
  chrome:{n:'txs.chrome',s:{caps:true,color:'#ffffff',gradOn:true,grad:'#64748b',stroke:true,sc:'#0f172a',sw:4,anim:'blur'}},
  encadre:{n:'txs.encadre',s:{color:'#000000',bg:true,bgc:'#22d3ee',anim:'slide'}},
  rouge:{n:'txs.rouge',s:{bg:true,bgc:'#e11d48',caps:true,anim:'zoom'}},
  pill:{n:'txs.pill',s:{font:'Segoe UI',bg:true,bgc:'#7c3aed',bgs:'pill',anim:'pop'}},
  glass:{n:'txs.glass',s:{font:'Segoe UI',bg:true,bgc:'#ffffff',bgs:'pill',bgo:22,shadow:true,anim:'blur'}},
  tag:{n:'txs.tag',s:{font:'Bahnschrift',caps:true,ls:4,bg:true,bgc:'#000000',bgo:92,anim:'wipe'}},
  underline:{n:'txs.underline',s:{bg:true,bgc:'#22d3ee',bgs:'under',bgo:100,anim:'wipe'}},
  sub:{n:'txs.sub',s:{font:'Segoe UI',bg:true,bgo:80,y:86,sz:20}},
  subyellow:{n:'txs.subyellow',s:{color:'#fde047',stroke:true,sw:12,y:85,sz:16}},
  subclean:{n:'txs.subclean',s:{font:'Segoe UI',shadow:true,y:86,sz:18}},
  subline:{n:'txs.subline',s:{font:'Segoe UI',bg:true,bgs:'line',bgo:78,y:85,sz:20}},
  subbig:{n:'txs.subbig',s:{font:'Impact',caps:true,stroke:true,sw:12,y:78,sz:12,anim:'pop'}},
  subpill:{n:'txs.subpill',s:{font:'Bahnschrift',bg:true,bgs:'pill',bgo:85,y:86,sz:20}},
  gamer:{n:'txs.gamer',s:{font:'Bahnschrift',caps:true,ls:3,color:'#a3e635',hardOn:true,hard:'#14532d',anim:'glitchin',aloop:'pulse'}},
  boss:{n:'txs.boss',s:{font:'Impact',caps:true,color:'#fecaca',gradOn:true,grad:'#b91c1c',stroke:true,sc:'#000000',sw:8,anim:'zoom',aloop:'shake'}},
  pixel:{n:'txs.pixel',s:{font:'Consolas',caps:true,ls:2,color:'#ffffff',hardOn:true,hard:'#7c3aed',anim:'letters'}},
  victory:{n:'txs.victory',s:{font:'Impact',caps:true,color:'#fef08a',gradOn:true,grad:'#b45309',stroke:true,sc:'#451a03',sw:6,anim:'zoom',aloop:'pulse'}},
  live:{n:'txs.live',s:{font:'Segoe UI',caps:true,color:'#ffffff',bg:true,bgc:'#dc2626',bgs:'pill',bgo:100,anim:'pop',aloop:'heart'}},
  combo:{n:'txs.combo',s:{font:'Impact',italic:true,caps:true,color:'#ffffff',extOn:true,ext:'#ef4444',anim:'pop',aloop:'shake'}},
  bubble:{n:'txs.bubble',s:{font:'Comic Sans MS',color:'#ffffff',stroke:true,sc:'#60a5fa',sw:12,anim:'bounce',aloop:'float'}},
  love:{n:'txs.love',s:{font:'Segoe Script',color:'#fecdd3',gradOn:true,grad:'#e11d48',shadow:true,anim:'fade',aloop:'heart'}},
  kawaii:{n:'txs.kawaii',s:{font:'Comic Sans MS',color:'#f472b6',stroke:true,sc:'#ffffff',sw:14,anim:'pop',aloop:'swing'}},
  handwrite:{n:'txs.handwrite',s:{font:'Segoe Print',bold:false,color:'#ffffff',shadow:true,anim:'type'}},
  chalk:{n:'txs.chalk',s:{font:'Ink Free',bold:false,color:'#f5f5f4',bg:true,bgc:'#1f2937',bgo:90,anim:'wipe'}},
  karaoke:{n:'txs.karaoke',s:{font:'Arial Black',color:'#ffffff',stroke:true,sc:'#000000',sw:7,kcol:'#facc15',anim:'pop',aloop:'karaoke'}},
  wordpop:{n:'txs.wordpop',s:{font:'Arial Black',color:'#ffffff',stroke:true,sc:'#000000',sw:7,kcol:'#22d3ee',anim:'none',aloop:'wordpop'}},
  rainbow:{n:'txs.rainbow',s:{font:'Arial Black',color:'#ffffff',stroke:true,sc:'#111111',sw:6,anim:'pop',aloop:'rainbow'}},
  // ---- v4.36 : 30 styles tendance (Tendance, Y2K, Luxe, Street, Doux) ----
  hook:{n:'txs.hook',s:{font:'Arial Black',caps:true,color:'#111111',bg:true,bgc:'#fde047',bgo:100,anim:'pop',aloop:'pulse'}},
  acidgreen:{n:'txs.acidgreen',s:{font:'Arial',bold:false,color:'#000000',bg:true,bgc:'#8ace00',bgo:100,anim:'blur'}},
  aesthetic:{n:'txs.aesthetic',s:{font:'Segoe UI',bold:false,ls:10,color:'#ffffff',shadow:true,anim:'fade',aout:'fade'}},
  quote:{n:'txs.quote',s:{font:'Georgia',italic:true,bold:false,color:'#ffffff',bg:true,bgc:'#f472b6',bgs:'under',bgo:100,shadow:true,anim:'type'}},
  pov:{n:'txs.pov',s:{font:'Segoe UI',color:'#111111',bg:true,bgc:'#ffffff',bgs:'box',bgo:94,anim:'slidedown'}},
  boldcap:{n:'txs.boldcap',s:{font:'Arial Black',caps:true,color:'#fde047',stroke:true,sw:11,hardOn:true,hard:'#000000',anim:'zoomin',aloop:'hop'}},
  y2kchrome:{n:'txs.y2kchrome',s:{font:'Arial Black',italic:true,color:'#f8fafc',gradOn:true,grad:'#94a3b8',stroke:true,sc:'#1e3a8a',sw:4,extOn:true,ext:'#3b82f6',anim:'flip'}},
  bubblegum:{n:'txs.bubblegum',s:{font:'Comic Sans MS',color:'#fbcfe8',gradOn:true,grad:'#ec4899',stroke:true,sc:'#7e22ce',sw:9,anim:'elastic',aloop:'jelly'}},
  glittertxt:{n:'txs.glittertxt',s:{font:'Georgia',caps:true,color:'#fef9c3',gradOn:true,grad:'#ca8a04',neon:true,glowc:'#facc15',anim:'blur',aloop:'glow'}},
  cyberpink:{n:'txs.cyberpink',s:{font:'Consolas',caps:true,ls:5,color:'#fdf2f8',neon:true,glowc:'#ec4899',glitch:true,amt:35,anim:'glitchin',aloop:'flicker'}},
  holotext:{n:'txs.holotext',s:{font:'Arial Black',color:'#a5f3fc',gradOn:true,grad:'#f0abfc',stroke:true,sc:'#ffffff',sw:4,anim:'zoom',aloop:'rainbow'}},
  starlight:{n:'txs.starlight',s:{font:'Segoe UI',italic:true,color:'#eff6ff',neon:true,glowc:'#60a5fa',anim:'fade',aloop:'float'}},
  gold:{n:'txs.gold',s:{font:'Constantia',caps:true,ls:8,color:'#fde68a',gradOn:true,grad:'#b45309',shadow:true,anim:'blur',aout:'fade'}},
  marble:{n:'txs.marble',s:{font:'Cambria',caps:true,ls:6,color:'#f5f5f4',gradOn:true,grad:'#a8a29e',hardOn:true,hard:'#44403c',anim:'rise'}},
  royal:{n:'txs.royal',s:{font:'Constantia',color:'#e9d5ff',gradOn:true,grad:'#6d28d9',stroke:true,sc:'#fbbf24',sw:4,anim:'zoom',aloop:'pulse'}},
  champagne:{n:'txs.champagne',s:{font:'Gabriola',bold:false,color:'#fef3c7',shadow:true,anim:'fade',aloop:'float'}},
  noirtxt:{n:'txs.noirtxt',s:{font:'Times New Roman',caps:true,bold:false,ls:16,color:'#ffffff',bg:true,bgc:'#000000',bgo:70,anim:'wipe'}},
  velvet:{n:'txs.velvet',s:{font:'Cambria',italic:true,color:'#fecdd3',gradOn:true,grad:'#9f1239',shadow:true,anim:'fade',aout:'fade'}},
  graffiti:{n:'txs.graffiti',s:{font:'Ink Free',caps:true,color:'#a3e635',stroke:true,sc:'#000000',sw:9,extOn:true,ext:'#db2777',anim:'pop',aloop:'tilt'}},
  stencil:{n:'txs.stencil',s:{font:'Impact',caps:true,ls:4,color:'#111111',bg:true,bgc:'#facc15',bgo:100,anim:'slidel'}},
  drill:{n:'txs.drill',s:{font:'Impact',italic:true,caps:true,color:'#ef4444',hardOn:true,hard:'#000000',stroke:true,sc:'#ffffff',sw:3,anim:'shakein',aloop:'shake'}},
  tape:{n:'txs.tape',s:{font:'Bahnschrift',caps:true,ls:3,color:'#000000',bg:true,bgc:'#fbbf24',bgs:'line',bgo:100,anim:'wipe'}},
  spray:{n:'txs.spray',s:{font:'Ink Free',color:'#fb923c',neon:true,glowc:'#f97316',anim:'blur',aloop:'flicker'}},
  concretetxt:{n:'txs.concretetxt',s:{font:'Bahnschrift',caps:true,ls:4,color:'#e5e7eb',gradOn:true,grad:'#6b7280',hardOn:true,hard:'#111827',anim:'drop'}},
  cloud:{n:'txs.cloud',s:{font:'Comic Sans MS',color:'#ffffff',stroke:true,sc:'#7dd3fc',sw:14,anim:'bounce',aloop:'float'}},
  peachy:{n:'txs.peachy',s:{font:'Comic Sans MS',color:'#fdba74',stroke:true,sc:'#ffffff',sw:12,hardOn:true,hard:'#00000055',anim:'pop'}},
  mochi:{n:'txs.mochi',s:{font:'Segoe UI',color:'#ffffff',bg:true,bgc:'#f9a8d4',bgs:'pill',bgo:100,anim:'elastic',aloop:'jelly'}},
  sweetheart:{n:'txs.sweetheart',s:{font:'Segoe Script',color:'#fecaca',gradOn:true,grad:'#dc2626',stroke:true,sc:'#ffffff',sw:5,anim:'pop',aloop:'heart'}},
  lemon:{n:'txs.lemon',s:{font:'Arial Black',color:'#fef08a',extOn:true,ext:'#f97316',anim:'drop',aloop:'hop'}},
  sakura:{n:'txs.sakura',s:{font:'Segoe Print',bold:false,color:'#fdf2f8',neon:true,glowc:'#f472b6',anim:'fade',aloop:'wave'}},
  // ---- v4.36 : 70 styles avec les polices livrées ----
  pbebas:{n:'txs.pbebas',s:{font:'Bebas Neue',ls:4,color:'#ffffff',shadow:true,anim:'slide',aout:'fade'}},
  panton:{n:'txs.panton',s:{font:'Anton',caps:true,color:'#facc15',hardOn:true,hard:'#000000',anim:'zoomin'}},
  poswald:{n:'txs.poswald',s:{font:'Oswald',caps:true,ls:3,color:'#ffffff',bg:true,bgc:'#ef4444',bgo:100,anim:'wipe'}},
  pstaat:{n:'txs.pstaat',s:{font:'Staatliches',ls:6,color:'#f8fafc',stroke:true,sc:'#0f172a',sw:5,anim:'drop'}},
  pabril:{n:'txs.pabril',s:{font:'Abril Fatface',color:'#fef3c7',hardOn:true,hard:'#b45309',anim:'rise'}},
  palfa:{n:'txs.palfa',s:{font:'Alfa Slab One',color:'#fb923c',extOn:true,ext:'#7c2d12',anim:'pop'}},
  parchivo:{n:'txs.parchivo',s:{font:'Archivo Black',caps:true,color:'#111111',bg:true,bgc:'#ffffff',bgo:100,anim:'slidel',aout:'slider'}},
  pblackops:{n:'txs.pblackops',s:{font:'Black Ops One',color:'#a3e635',stroke:true,sc:'#1a2e05',sw:6,anim:'shakein'}},
  pbowlby:{n:'txs.pbowlby',s:{font:'Bowlby One',color:'#f472b6',stroke:true,sc:'#ffffff',sw:8,hardOn:true,hard:'#831843',anim:'bounce'}},
  pgravitas:{n:'txs.pgravitas',s:{font:'Gravitas One',color:'#ffffff',gradOn:true,grad:'#60a5fa',anim:'zoom'}},
  spacifico:{n:'txs.spacifico',s:{font:'Pacifico',bold:false,color:'#ffffff',stroke:true,sc:'#f97316',sw:6,anim:'pop',aloop:'float'}},
  slobster:{n:'txs.slobster',s:{font:'Lobster',bold:false,color:'#fde047',hardOn:true,hard:'#9a3412',anim:'rise'}},
  sdancing:{n:'txs.sdancing',s:{font:'Dancing Script',bold:false,color:'#fdf2f8',shadow:true,anim:'type'}},
  svibes:{n:'txs.svibes',s:{font:'Great Vibes',bold:false,color:'#fde68a',gradOn:true,grad:'#d97706',shadow:true,anim:'fade',aout:'fade'}},
  ssatisfy:{n:'txs.ssatisfy',s:{font:'Satisfy',bold:false,color:'#ffffff',neon:true,glowc:'#f472b6',anim:'blur',aloop:'glow'}},
  sallura:{n:'txs.sallura',s:{font:'Allura',bold:false,color:'#ffffff',shadow:true,anim:'fade'}},
  sparis:{n:'txs.sparis',s:{font:'Parisienne',bold:false,color:'#fecdd3',anim:'type',aloop:'float'}},
  syellowtail:{n:'txs.syellowtail',s:{font:'Yellowtail',bold:false,color:'#ffffff',extOn:true,ext:'#2563eb',anim:'slidel'}},
  ssacramento:{n:'txs.ssacramento',s:{font:'Sacramento',bold:false,color:'#f0fdfa',neon:true,glowc:'#2dd4bf',anim:'fade',aloop:'flicker'}},
  scookie:{n:'txs.scookie',s:{font:'Cookie',bold:false,color:'#7c2d12',bg:true,bgc:'#fde68a',bgs:'pill',bgo:100,anim:'bounce'}},
  hcaveat:{n:'txs.hcaveat',s:{font:'Caveat',bold:false,color:'#ffffff',shadow:true,anim:'type'}},
  hmarker:{n:'txs.hmarker',s:{font:'Permanent Marker',color:'#111111',bg:true,bgc:'#ffffff',bgo:92,anim:'pop'}},
  hindie:{n:'txs.hindie',s:{font:'Indie Flower',bold:false,color:'#fde047',stroke:true,sc:'#000000',sw:5,anim:'bounce'}},
  hshadows:{n:'txs.hshadows',s:{font:'Shadows Into Light',bold:false,color:'#ffffff',neon:true,glowc:'#38bdf8',anim:'fade'}},
  hamatic:{n:'txs.hamatic',s:{font:'Amatic SC',ls:3,color:'#ffffff',bg:true,bgc:'#1f2937',bgo:85,anim:'wipe'}},
  hgloria:{n:'txs.hgloria',s:{font:'Gloria Hallelujah',bold:false,color:'#a5f3fc',stroke:true,sc:'#0c4a6e',sw:5,anim:'pop',aloop:'wave'}},
  hpatrick:{n:'txs.hpatrick',s:{font:'Patrick Hand',bold:false,color:'#111111',bg:true,bgc:'#fef08a',bgo:100,anim:'drop',aloop:'tilt'}},
  hrocksalt:{n:'txs.hrocksalt',s:{font:'Rock Salt',bold:false,color:'#fca5a5',stroke:true,sc:'#450a0a',sw:4,anim:'shakein'}},
  harchitect:{n:'txs.harchitect',s:{font:'Architects Daughter',bold:false,color:'#e0f2fe',bg:true,bgc:'#1e3a8a',bgo:85,anim:'type'}},
  happle:{n:'txs.happle',s:{font:'Homemade Apple',bold:false,color:'#ffffff',shadow:true,anim:'fade',aout:'fade'}},
  fbangers:{n:'txs.fbangers',s:{font:'Bangers',ls:2,color:'#facc15',stroke:true,sc:'#000000',sw:8,hardOn:true,hard:'#dc2626',anim:'zoomin',aloop:'shake'}},
  fluckiest:{n:'txs.fluckiest',s:{font:'Luckiest Guy',color:'#ffffff',stroke:true,sc:'#7c3aed',sw:10,anim:'bounce',aloop:'hop'}},
  fchewy:{n:'txs.fchewy',s:{font:'Chewy',color:'#86efac',stroke:true,sc:'#14532d',sw:7,anim:'elastic',aloop:'jelly'}},
  ftitan:{n:'txs.ftitan',s:{font:'Titan One',color:'#fde047',extOn:true,ext:'#ea580c',anim:'pop'}},
  flilita:{n:'txs.flilita',s:{font:'Lilita One',color:'#ffffff',bg:true,bgc:'#2563eb',bgs:'pill',bgo:100,anim:'pop',aloop:'pulse'}},
  ffredoka:{n:'txs.ffredoka',s:{font:'Fredoka',color:'#fbcfe8',stroke:true,sc:'#be185d',sw:7,anim:'bounce'}},
  fdynapuff:{n:'txs.fdynapuff',s:{font:'DynaPuff',color:'#fef08a',stroke:true,sc:'#a16207',sw:8,hardOn:true,hard:'#00000066',anim:'elastic'}},
  fsniglet:{n:'txs.fsniglet',s:{font:'Sniglet',color:'#ffffff',bg:true,bgc:'#f97316',bgs:'pill',bgo:100,anim:'slidedown'}},
  fknewave:{n:'txs.fknewave',s:{font:'Knewave',color:'#22d3ee',stroke:true,sc:'#ffffff',sw:6,anim:'slidel',aloop:'tilt'}},
  fshrikhand:{n:'txs.fshrikhand',s:{font:'Shrikhand',color:'#fb7185',extOn:true,ext:'#4c0519',anim:'zoom'}},
  xcreepster:{n:'txs.xcreepster',s:{font:'Creepster',color:'#84cc16',hardOn:true,hard:'#000000',anim:'drop',aloop:'shake'}},
  xnosifer:{n:'txs.xnosifer',s:{font:'Nosifer',color:'#dc2626',shadow:true,anim:'fade',aloop:'flicker'}},
  xeater:{n:'txs.xeater',s:{font:'Eater',color:'#fef3c7',stroke:true,sc:'#7f1d1d',sw:4,anim:'shakein'}},
  xbutcher:{n:'txs.xbutcher',s:{font:'Butcherman',color:'#e5e7eb',hardOn:true,hard:'#7f1d1d',anim:'drop'}},
  xfrijole:{n:'txs.xfrijole',s:{font:'Frijole',color:'#fb923c',stroke:true,sc:'#000000',sw:5,anim:'pop',aloop:'wave'}},
  xjolly:{n:'txs.xjolly',s:{font:'Jolly Lodger',ls:2,color:'#a78bfa',neon:true,glowc:'#7c3aed',anim:'fade',aloop:'float'}},
  xgriffy:{n:'txs.xgriffy',s:{font:'Griffy',color:'#4ade80',neon:true,glowc:'#16a34a',anim:'blur',aloop:'flicker'}},
  xmetal:{n:'txs.xmetal',s:{font:'Metal Mania',color:'#e5e7eb',gradOn:true,grad:'#6b7280',stroke:true,sc:'#000000',sw:4,anim:'zoomin',aloop:'shake'}},
  xrocker:{n:'txs.xrocker',s:{font:'New Rocker',color:'#fde68a',hardOn:true,hard:'#7c2d12',anim:'drop'}},
  xpirata:{n:'txs.xpirata',s:{font:'Pirata One',color:'#fef3c7',gradOn:true,grad:'#a16207',shadow:true,anim:'fade'}},
  torbitron:{n:'txs.torbitron',s:{font:'Orbitron',caps:true,ls:6,color:'#a5f3fc',neon:true,glowc:'#06b6d4',anim:'blur'}},
  taudiowide:{n:'txs.taudiowide',s:{font:'Audiowide',color:'#ffffff',gradOn:true,grad:'#a855f7',anim:'slidel'}},
  trusso:{n:'txs.trusso',s:{font:'Russo One',caps:true,color:'#ffffff',bg:true,bgc:'#0ea5e9',bgo:100,anim:'wipe'}},
  tpress:{n:'txs.tpress',s:{font:'Press Start 2P',bold:false,color:'#facc15',hardOn:true,hard:'#b91c1c',anim:'letters'}},
  tvt323:{n:'txs.tvt323',s:{font:'VT323',bold:false,ls:2,color:'#4ade80',neon:true,glowc:'#22c55e',anim:'typec'}},
  tsilk:{n:'txs.tsilk',s:{font:'Silkscreen',bold:false,color:'#ffffff',bg:true,bgc:'#111827',bgo:90,anim:'letters'}},
  tspacemono:{n:'txs.tspacemono',s:{font:'Space Mono',bold:false,color:'#e5e7eb',bg:true,bgc:'#000000',bgo:70,anim:'typec'}},
  tjetbrains:{n:'txs.tjetbrains',s:{font:'JetBrains Mono',bold:false,color:'#c4b5fd',anim:'typec',aloop:'flicker'}},
  tmonoton:{n:'txs.tmonoton',s:{font:'Monoton',bold:false,color:'#f0abfc',neon:true,glowc:'#d946ef',anim:'fade',aloop:'glow'}},
  tsyne:{n:'txs.tsyne',s:{font:'Syne',color:'#ffffff',gradOn:true,grad:'#22d3ee',anim:'slide'}},
  cplayfair:{n:'txs.cplayfair',s:{font:'Playfair Display',italic:true,color:'#ffffff',shadow:true,anim:'fade',aout:'fade'}},
  ccinzel:{n:'txs.ccinzel',s:{font:'Cinzel',ls:8,color:'#fde68a',gradOn:true,grad:'#a16207',anim:'blur',aout:'fade'}},
  ccinzeldeco:{n:'txs.ccinzeldeco',s:{font:'Cinzel Decorative',color:'#f5f5f4',hardOn:true,hard:'#57534e',anim:'rise'}},
  cbodoni:{n:'txs.cbodoni',s:{font:'Bodoni Moda',caps:true,ls:10,bold:false,color:'#ffffff',anim:'fade',aout:'fade'}},
  cdmserif:{n:'txs.cdmserif',s:{font:'DM Serif Display',color:'#111111',bg:true,bgc:'#f5f5f4',bgo:96,anim:'slide'}},
  cprata:{n:'txs.cprata',s:{font:'Prata',color:'#fecdd3',shadow:true,anim:'fade',aloop:'float'}},
  cyeseva:{n:'txs.cyeseva',s:{font:'Yeseva One',color:'#fef3c7',gradOn:true,grad:'#be185d',anim:'zoom'}},
  cbask:{n:'txs.cbask',s:{font:'Libre Baskerville',italic:true,bold:false,color:'#ffffff',bg:true,bgc:'#000000',bgs:'under',bgo:100,anim:'wipe'}},
  clora:{n:'txs.clora',s:{font:'Lora',italic:true,color:'#e0e7ff',shadow:true,anim:'type'}},
  cmontserrat:{n:'txs.cmontserrat',s:{font:'Montserrat',caps:true,ls:12,bold:false,color:'#ffffff',bg:true,bgc:'#000000',bgo:55,anim:'fade',aout:'fade'}},
  // ---- v4.36 : styles « Exposé » ----
  xtitle:{n:'txs.xtitle',s:{font:'Montserrat',caps:true,ls:3,color:'#ffffff',shadow:true,anim:'rise',aout:'fade'}},
  xsub:{n:'txs.xsub',s:{font:'Poppins',bold:false,color:'#e2e8f0',anim:'fade',aout:'fade'}},
  xkey:{n:'txs.xkey',s:{font:'Poppins',color:'#111111',bg:true,bgc:'#fde047',bgs:'line',bgo:100,anim:'wipe'}},
  xnote:{n:'txs.xnote',s:{font:'Caveat',bold:false,color:'#1e3a8a',bg:true,bgc:'#fef9c3',bgo:96,anim:'type'}},
  xlabel:{n:'txs.xlabel',s:{font:'Outfit',caps:true,ls:4,color:'#ffffff',bg:true,bgc:'#6366f1',bgs:'pill',bgo:100,anim:'pop'}},
  xchalk:{n:'txs.xchalk',s:{font:'Shadows Into Light',bold:false,color:'#f8fafc',anim:'type'}},
  xbigtitle:{n:'txs.xbigtitle',s:{font:'Bebas Neue',ls:5,color:'#ffffff',shadow:true,anim:'rise',aout:'fade'}},
  xserif:{n:'txs.xserif',s:{font:'Playfair Display',color:'#ffffff',shadow:true,anim:'fade',aout:'fade'}},
  xhistory:{n:'txs.xhistory',s:{font:'Cinzel',ls:4,color:'#fde68a',gradOn:true,grad:'#b45309',shadow:true,anim:'blur'}},
  xscience:{n:'txs.xscience',s:{font:'Orbitron',caps:true,ls:3,color:'#a5f3fc',neon:true,glowc:'#06b6d4',anim:'fade'}},
  xmath:{n:'txs.xmath',s:{font:'JetBrains Mono',bold:false,color:'#ffffff',bg:true,bgc:'#1e293b',bgo:90,anim:'typec'}},
  xgeo:{n:'txs.xgeo',s:{font:'Montserrat',color:'#ffffff',bg:true,bgc:'#15803d',bgs:'pill',bgo:100,anim:'pop'}},
  xlit:{n:'txs.xlit',s:{font:'Libre Baskerville',italic:true,bold:false,color:'#fef3c7',shadow:true,anim:'type'}},
  xart:{n:'txs.xart',s:{font:'Pacifico',bold:false,color:'#f472b6',stroke:true,sc:'#ffffff',sw:6,anim:'pop'}},
  xsport:{n:'txs.xsport',s:{font:'Anton',caps:true,italic:true,color:'#ffffff',extOn:true,ext:'#ea580c',anim:'slidel'}},
  xmusic:{n:'txs.xmusic',s:{font:'Righteous',color:'#c4b5fd',neon:true,glowc:'#8b5cf6',anim:'fade',aloop:'pulse'}},
  xenglish:{n:'txs.xenglish',s:{font:'Poppins',color:'#ffffff',bg:true,bgc:'#1d4ed8',bgs:'box',bgo:100,st2On:false,anim:'wipe'}},
  xquestion:{n:'txs.xquestion',s:{font:'Fredoka',color:'#111111',bg:true,bgc:'#ffffff',bgs:'pill',bgo:100,anim:'bounce',aloop:'tilt'}},
  xanswer:{n:'txs.xanswer',s:{font:'Fredoka',color:'#ffffff',bg:true,bgc:'#16a34a',bgs:'pill',bgo:100,anim:'pop'}},
  xwrong:{n:'txs.xwrong',s:{font:'Fredoka',color:'#ffffff',bg:true,bgc:'#dc2626',bgs:'pill',bgo:100,anim:'shakein'}},
  xfact:{n:'txs.xfact',s:{font:'Outfit',color:'#111111',bg:true,bgc:'#a5f3fc',bgo:100,anim:'slide'}},
  xsticky:{n:'txs.xsticky',s:{font:'Patrick Hand',bold:false,color:'#1f2937',bg:true,bgc:'#fef08a',bgo:100,anim:'drop',aloop:'tilt'}},
  xpen:{n:'txs.xpen',s:{font:'Caveat',bold:false,color:'#2563eb',bg:true,bgc:'#ffffff',bgo:92,anim:'type'}},
  xredpen:{n:'txs.xredpen',s:{font:'Caveat',bold:false,color:'#dc2626',bg:true,bgc:'#ffffff',bgo:92,anim:'type'}},
  xhighlight:{n:'txs.xhighlight',s:{font:'Poppins',color:'#111111',bg:true,bgc:'#86efac',bgs:'line',bgo:100,anim:'wipe'}},
  xpinkhl:{n:'txs.xpinkhl',s:{font:'Poppins',color:'#111111',bg:true,bgc:'#f9a8d4',bgs:'line',bgo:100,anim:'wipe'}},
  xunder:{n:'txs.xunder',s:{font:'Montserrat',color:'#ffffff',bg:true,bgc:'#facc15',bgs:'under',bgo:100,anim:'fade'}},
  xcaption:{n:'txs.xcaption',s:{font:'Manrope',bold:false,color:'#ffffff',bg:true,bgc:'#000000',bgo:60,anim:'fade',aout:'fade'}},
  xsource:{n:'txs.xsource',s:{font:'Space Mono',bold:false,color:'#cbd5e1',anim:'fade'}},
  xnumber:{n:'txs.xnumber',s:{font:'Bebas Neue',color:'#facc15',hardOn:true,hard:'#000000',anim:'zoomin'}},
  xdate:{n:'txs.xdate',s:{font:'Staatliches',ls:4,color:'#ffffff',bg:true,bgc:'#7c3aed',bgo:100,anim:'drop'}},
  xname:{n:'txs.xname',s:{font:'Raleway',bold:false,ls:6,caps:true,color:'#ffffff',anim:'fade',aout:'fade'}},
  xconclusion:{n:'txs.xconclusion',s:{font:'Sora',color:'#ffffff',gradOn:true,grad:'#22d3ee',shadow:true,anim:'rise'}},
  xwarning:{n:'txs.xwarning',s:{font:'Black Ops One',color:'#111111',bg:true,bgc:'#fbbf24',bgo:100,anim:'shakein'}},
  xkids:{n:'txs.xkids',s:{font:'Sniglet',color:'#ffffff',stroke:true,sc:'#3b82f6',sw:9,anim:'bounce',aloop:'hop'}},
  xrecap:{n:'txs.xrecap',s:{font:'Space Grotesk',color:'#ffffff',bg:true,bgc:'#0f172a',bgs:'box',bgo:88,anim:'slidel',aout:'slider'}}
};
const TXT_CATS={basic:['classic','clean','contour','elegant','minimal','machine'],school:['xtitle','xsub','xkey','xnote','xlabel','xchalk','xbigtitle','xserif','xhistory','xscience','xmath','xgeo','xlit','xart','xsport','xmusic','xenglish','xquestion','xanswer','xwrong','xfact','xsticky','xpen','xredpen','xhighlight','xpinkhl','xunder','xcaption','xsource','xnumber','xdate','xname','xconclusion','xwarning','xkids','xrecap'],trend:['hook','acidgreen','aesthetic','quote','pov','boldcap'],y2k:['y2kchrome','bubblegum','glittertxt','cyberpink','holotext','starlight'],social:['jaune','viral','story','thumb','marker','comic'],
  neon:['neon','neonblue','neongreen','neonred','neonhollow','cyber'],retro:['retro80','vhs','arcade','disco','vintage','popart'],
  cinema:['cine','trailer','horror','epic','credits','docu'],outline:['double','hollow','extrude','extrude2','sticker','hardshadow'],
  gradient:['sunset','ocean','candy','fire','mint','chrome'],label:['encadre','rouge','pill','glass','tag','underline'],
  subs:['sub','subyellow','subclean','subline','subbig','subpill','karaoke','wordpop'],gaming:['gamer','boss','pixel','victory','live','combo'],
  fun:['bubble','love','kawaii','handwrite','chalk','rainbow'],luxe:['gold','marble','royal','champagne','noirtxt','velvet'],
  street:['graffiti','stencil','drill','tape','spray','concretetxt'],soft:['cloud','peachy','mochi','sweetheart','lemon','sakura'],
  poster:['pbebas','panton','poswald','pstaat','pabril','palfa','parchivo','pblackops','pbowlby','pgravitas'],script:['spacifico','slobster','sdancing','svibes','ssatisfy','sallura','sparis','syellowtail','ssacramento','scookie'],hand:['hcaveat','hmarker','hindie','hshadows','hamatic','hgloria','hpatrick','hrocksalt','harchitect','happle'],fun2:['fbangers','fluckiest','fchewy','ftitan','flilita','ffredoka','fdynapuff','fsniglet','fknewave','fshrikhand'],spooky:['xcreepster','xnosifer','xeater','xbutcher','xfrijole','xjolly','xgriffy','xmetal','xrocker','xpirata'],tech:['torbitron','taudiowide','trusso','tpress','tvt323','tsilk','tspacemono','tjetbrains','tmonoton','tsyne'],chic:['cplayfair','ccinzel','ccinzeldeco','cbodoni','cdmserif','cprata','cyeseva','cbask','clora','cmontserrat']};
/* animations du texte : entrée, sortie, en boucle */
const TAN={in:['none','fade','pop','zoom','zoomin','slide','slidedown','slidel','slider','drop','bounce','blur','spin','flip','wipe','type','typec','letters','rise','glitchin','elastic','swingin','shakein','unfold'],
  out:['none','fade','pop','zoom','slide','slideup','slidel','slider','drop','blur','spin','flip','wipe','letters','flyaway','glitchout','elastic'],
  loop:['none','pulse','heart','float','wave','shake','swing','flicker','glow','rainbow','hop','jelly','spinslow','tilt','karaoke','wordpop']};
const TANK={in:'p.anim',out:'p.aout',loop:'p.aloop'},TANP={in:'tani.',out:'tano.',loop:'tanl.'};
const tanName=(w,k)=>k==='none'?T('common.noneF'):T(TANP[w]+k);
function textClip(k,start){
  const s=Object.assign(TBASE(),k?TPRE[k].s:{stroke:true,anim:'pop'});let size=Math.round(H/7);
  if(s.sz){size=Math.round(H/s.sz);delete s.sz}
  const y=s.y??50;delete s.y;
  return newClip({track:tk('over'),start:start??time,dur:3,p:Object.assign(s,{text:k==='sub'?T('content.subtitle'):T('content.title'),size,x:50,y})});
}
$('#aText').onclick=$('#aText2').onclick=()=>add(textClip(null));
$('#aColor').onclick=()=>add(newClip({track:tk('video'),gen:'color',start:endOf(tk('video')),dur:5,p:{color:'#1e293b',fit:'cover',amt:60,fx:noFx()}}));
$('#aGrad').onclick=()=>add(newClip({track:tk('video'),gen:'grad',start:endOf(tk('video')),dur:5,p:{color:'#7c3aed',color2:'#06b6d4',angle:135,fit:'cover',amt:60,fx:noFx()}}));
$('#aFiles').onclick=$('#aAud').onclick=$('#drop').onclick=()=>importMedia();
$('#file').onchange=e=>{addFiles(e.target.files);e.target.value=''};
['dragover','dragenter'].forEach(ev=>$('#drop').addEventListener(ev,e=>{e.preventDefault();$('#drop').classList.add('over')}));
['dragleave','drop'].forEach(ev=>$('#drop').addEventListener(ev,e=>{e.preventDefault();$('#drop').classList.remove('over')}));
$('#drop').addEventListener('drop',e=>{e.stopPropagation();addFiles(e.dataTransfer.files)});
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files.length)addFiles(e.dataTransfer.files)});

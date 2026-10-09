/* ---------- images clés (animation) ---------- */
const KDEF={'p.op':100,'p.rot':0,'p.vol':100,'p.tf.zoom':100,'p.tf.x':0,'p.tf.y':0,'p.tf.rot':0,'p.scale':30,'p.size':72,'p.x':50,'p.y':50,'p.rate':1,'p.tdur':.5,'p.tspeed':16,'p.amt':60,'p.afin':0,'p.afout':0,'p.round':0,'p.ls':0,'p.angle':135,'p.crop.l':0,'p.crop.r':0,'p.crop.t':0,'p.crop.b':0,'p.w':30,'p.h':20,'p.sw':8,'p.r':12};
function KFK(c){
  if(!c)return[];
  if(isAud(c))return['p.vol'];
  if(isVid(c))return c.gen?['p.op']:['p.tf.zoom','p.tf.x','p.tf.y','p.tf.rot','p.op','p.vol'];
  if(c.gen)return c.gen==='hud'?['p.op']:c.gen==='shape'?['p.x','p.y','p.w','p.h','p.rot','p.op']:['p.x','p.y','p.op'];
  return isText(c)?['p.x','p.y','p.size','p.rot','p.op']:['p.x','p.y','p.scale','p.rot','p.op'];
}
const gv=(c,k)=>getPath(c,k)??KDEF[k];
const kfAt=(c,loc)=>(c.kf||[]).find(k=>Math.abs(k.t-loc)<.04);
/* courbes du mouvement (u de 0 à 1 entre deux images clés) */
const EASE={
  linear:u=>u,smooth:u=>u*u*(3-2*u),in:u=>u*u*u,out:u=>1-Math.pow(1-u,3),
  inout:u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,
  back:u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2)},
  bounce:u=>{const n=7.5625,d=2.75;if(u<1/d)return n*u*u;if(u<2/d)return n*(u-=1.5/d)*u+.75;if(u<2.5/d)return n*(u-=2.25/d)*u+.9375;return n*(u-=2.625/d)*u+.984375},
  elastic:u=>u<=0?0:u>=1?1:Math.pow(2,-10*u)*Math.sin((u*10-.75)*2*Math.PI/3)+1,
  hold:u=>u<1?0:1
};
const EASE_KEYS=Object.keys(EASE);
function easeIcon(k){let d='';for(let i=0;i<=24;i++){const u=i/24,y=EASE[k](u);d+=(i?'L':'M')+(3+u*28).toFixed(1)+' '+(19-y*14).toFixed(1)}return `<svg viewBox="0 0 34 22" width="34" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`}
/* image clé de départ du passage où se trouve la tête de lecture (null si on n'est pas entre deux images clés) */
function kfSeg(c){const K=c&&c.kf;if(!K||K.length<2)return null;const loc=time-c.start;for(let i=0;i<K.length-1;i++)if(loc>=K[i].t-.04&&loc<K[i+1].t-.001)return i;return null}
function kfVal(c,k,loc){
  const K=c.kf;if(!K||!K.length)return gv(c,k);
  const f=x=>x.v[k]??gv(c,k);
  if(loc<=K[0].t)return f(K[0]);
  const L=K[K.length-1];if(loc>=L.t)return f(L);
  for(let i=0;i<K.length-1;i++){const a=K[i],b=K[i+1];if(loc<=b.t){const u=(loc-a.t)/Math.max(1e-6,b.t-a.t),e=(EASE[a.e]||EASE.smooth)(u);return f(a)+(f(b)-f(a))*e}}
  return f(L);
}
function valOf(c,k){
  if(k==='start'||k==='dur'||k==='in')return c[k];
  return c.kf&&c.kf.length&&KFK(c).includes(k)?kfVal(c,k,time-c.start):gv(c,k);
}
function anim(c,t){
  if(!c.kf||!c.kf.length)return c;
  const n={...c,p:{...c.p}};if(c.p.tf)n.p.tf={...c.p.tf};
  for(const k of KFK(c))setPath(n,k,kfVal(c,k,t-c.start));
  return n;
}
const snapKf=(c,loc)=>({t:loc,v:Object.fromEntries(KFK(c).map(k=>[k,valOf(c,k)]))});
function setKf(c,k,v){const loc=time-c.start;let f=kfAt(c,loc);if(!f){f=snapKf(c,loc);c.kf.push(f);c.kf.sort((a,b)=>a.t-b.t)}f.v[k]=v}
function setVal(c,k,v){if(c.kf&&c.kf.length&&KFK(c).includes(k))setKf(c,k,v);else setPath(c,k,v)}
function toggleKf(){
  const c=selClip();if(!c){toast(T('msg.selectClip'));return}
  const loc=time-c.start;if(loc<-.01||loc>c.dur+.01){toast(T('msg.playheadOnClip'));return}
  c.kf=c.kf||[];const f=kfAt(c,loc);
  if(f){for(const k of KFK(c))setPath(c,k,f.v[k]??gv(c,k));c.kf.splice(c.kf.indexOf(f),1)}
  else{c.kf.push(snapKf(c,loc));c.kf.sort((a,b)=>a.t-b.t)}
  if(!c.kf.length)delete c.kf;
  commit();refresh();toast(f?T('msg.kfRemoved'):T('msg.kfAdded'));
}
function kfNav(dir){
  const c=selClip();if(!c||!c.kf)return;
  const ts=c.kf.map(k=>c.start+k.t),t=dir>0?ts.find(x=>x>time+.01):ts.reverse().find(x=>x<time-.01);
  if(t!=null)seek(t);
}
function kenBurns(c,type){
  const base=Object.fromEntries(KFK(c).map(k=>[k,gv(c,k)]));
  const a={...base},b={...base};
  if(type==='in'){a['p.tf.zoom']=100;b['p.tf.zoom']=125}
  else if(type==='out'){a['p.tf.zoom']=125;b['p.tf.zoom']=100}
  else{a['p.tf.zoom']=b['p.tf.zoom']=120;a['p.tf.x']=-8;b['p.tf.x']=8}
  c.kf=[{t:0,v:a},{t:c.dur,v:b}];commit();refresh();toast(T('msg.motionAdded'));
}

/* ---------- actions d'édition ---------- */
function splitAt(c,t){
  const d=t-c.start,rt=c.p.rate||1;
  const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=t;n.dur=c.dur-d;
  if(c.p.rev){n.in=c.in;c.in=c.in+n.dur*rt}else n.in=c.in+d*rt;
  if(n.kf)n.kf.forEach(k=>k.t-=d);
  c.dur=d;if(isVid(c)){c.p.tout='none';n.p.tin='none'}
  clips.push(n);return n;
}
function split(){
  let c=selClip();
  if(!c||time<=c.start+.05||time>=c.start+c.dur-.05)c=clips.filter(x=>isVid(x)&&time>x.start+.05&&time<x.start+x.dur-.05).pop();
  if(!c||time<=c.start+.05||time>=c.start+c.dur-.05){toast(T('msg.playheadOnAny'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  const n=splitAt(c,time);sel=n.id;commit();refresh();
}
function cross(){
  const c=selClip();if(!c||!isVid(c))return;
  const prev=clips.filter(x=>isVid(x)&&x!==c&&x.start<c.start+.001).sort((a,b)=>(b.start+b.dur)-(a.start+a.dur))[0];
  if(!prev){toast(T('msg.noPrevClip'));return}
  const d=c.p.tdur||.5,old=c.start,ns=Math.max(prev.start+.1,prev.start+prev.dur-d),delta=ns-old;
  clips.filter(x=>isVid(x)&&x.start>=old-.001).forEach(x=>x.start=Math.max(0,x.start+delta));
  if(!c.p.tin||c.p.tin==='none')c.p.tin='fade';
  commit();refresh();
}
function transAll(){
  const c=selClip();if(!c||!isVid(c))return;
  clips.filter(x=>isVid(x)).forEach(x=>{x.p.tin=c.p.tin||'none';x.p.tout=c.p.tout||'none';x.p.tdur=c.p.tdur||.5});
  commit();refresh();toast(T('msg.trAll'));
}
function del(){const g=selClips();if(!g.length)return;const ok=g.filter(c=>!trk(c).lock);if(!ok.length){toast(T('msg.trackLocked'));return}clips=clips.filter(x=>!ok.includes(x));sel=null;msel.clear();commit();refresh()}
function rippleDel(){
  const g=selClips().filter(c=>!trk(c).lock);if(!g.length){if(selClip())toast(T('msg.trackLocked'));return}
  for(const c of g.sort((a,b)=>b.start-a.start)){
    const end=c.start+c.dur;clips=clips.filter(x=>x!==c);
    clips.forEach(x=>{if(x.track===c.track&&x.start>=end-.001)x.start=Math.max(0,x.start-c.dur)});
  }
  sel=null;msel.clear();commit();refresh();
}
function dup(){const g=selClips();if(!g.length)return;const a=Math.min(...g.map(c=>c.start)),b=Math.max(...g.map(c=>c.start+c.dur));const made=g.map(c=>{const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=c.start+(b-a);clips.push(n);return n});regroup(made);sel=made[0].id;msel=new Set(made.slice(1).map(n=>n.id));commit();refresh()}
function flipSel(){
  const c=selClip();if(!c||(isVid(c)&&c.gen)||isAud(c)||isText(c)||(isOvr(c)&&c.gen)){toast(T('msg.selectVisual'));return}
  if(isVid(c)){c.p.tf=c.p.tf||{};c.p.tf.flip=!c.p.tf.flip}else c.p.flip=!c.p.flip;
  commit();refresh();
}
function rotSel(){
  const c=selClip(),k=c&&(isVid(c)&&!c.gen?'p.tf.rot':isOvr(c)&&!c.gen?'p.rot':null);
  if(!k){toast(T('msg.selectVisualText'));return}
  let v=Math.round(valOf(c,k)/90)*90+90;if(v>180)v-=360;
  setVal(c,k,v);commit();refresh();
}
async function freeze(){
  let c=selClip();
  if(!c||!isVid(c)||time<c.start||time>=c.start+c.dur)c=clips.filter(x=>isVid(x)&&time>=x.start&&time<x.start+x.dur).pop();
  const m=c&&c.mid&&mById(c.mid);
  if(!m||m.type!=='video'){toast(T('msg.freezeWhere'));return}
  pause();const el=getEl(c),want=srcOf(c,time);
  if(Math.abs(el.currentTime-want)>.01||el.readyState<2){el.currentTime=want;await new Promise(r=>{const f=()=>{el.removeEventListener('seeked',f);r()};el.addEventListener('seeked',f);setTimeout(f,2500)})}
  const k=document.createElement('canvas');k.width=el.videoWidth;k.height=el.videoHeight;k.getContext('2d').drawImage(el,0,0);
  const blob=await new Promise(r=>k.toBlob(r,'image/png'));
  const nm=await addGenerated(new File([blob],T('freeze.fileName',{time:fmt(time).replace(':','m')})+'.png',{type:'image/png'}));
  const FD=2,t0=time;
  if(t0>c.start+.05&&t0<c.start+c.dur-.05)splitAt(c,t0);
  clips.forEach(x=>{if(x.start>=t0-.001)x.start+=FD});
  const p=JSON.parse(JSON.stringify(c.p));delete p.voice;delete p.rate;p.tin=p.tout='none';p.vol=0;
  const f=newClip({track:tk('video'),mid:nm.id,start:t0,dur:FD,p});clips.push(f);sel=f.id;commit();refresh();toast(T('msg.freezeAdded'));
}
function toggleMarker(){
  const i=markers.findIndex(m=>Math.abs(m-time)*pxs<6);
  if(i>=0)markers.splice(i,1);else markers.push(time);
  markers.sort((a,b)=>a-b);autosave();renderTL();
}

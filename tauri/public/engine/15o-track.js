/* ---------- Suivi d'objet (v4.60) ----------
   Un élément posé sur la vidéo (texte, sticker, forme, zone floutée…) suit ce qui bouge dessous.
   On part de la tête de lecture : le petit morceau d'image sous le centre de l'élément est recherché dans chaque image
   suivante (vidéo lue en accéléré, sans le son, en petit et en gris ; ressemblance « corrélation normalisée », affinée
   sous le pixel). Le modèle se met à jour doucement (l'objet peut tourner, changer de lumière) ; si l'objet est perdu
   (caché, sorti de l'image), le suivi s'arrête là. Le résultat : des images clés de position (10 par seconde),
   modifiables et annulables comme les autres. Tout se passe sur ce PC. */
const TRK_SW=320,TRK_GRAB=15;
let trkStop=false,trkBusy=false;
const trkCan=c=>!!c&&isOvr(c)&&KFK(c).includes('p.x')&&KFK(c).includes('p.y');
/** la vidéo dessinée sous l'élément au temps t (piste vidéo la plus haute qui a une image) */
function trkVideoAt(t){
  const l=clips.filter(c=>isVid(c)&&!c.gen&&c.mid&&(mById(c.mid)||{}).type==='video'&&!(mById(c.mid)||{}).missing&&!trk(c).hide&&!c.p.mcOff&&!c.p.rev&&c.start<=t+1e-3&&c.start+c.dur>t+1e-3);
  return l.sort((a,b)=>b.track-a.track)[0]||null;
}
/** passage image de la vidéo ↔ image du montage (même calcul que drawCover, à l'instant t) */
function trkMap(v,t,vw,vh){
  const p=anim(v,t).p,[sx,sy,sw,sh]=cropRect(p,vw,vh),tf=p.tf||{},cov=Math.max(W/sw,H/sh),s=(p.fit==='contain'||p.fit==='blur')?Math.min(W/sw,H/sh):cov;
  const z=(tf.zoom??100)/100,cx=W/2+W*(tf.x||0)/100,cy=H/2+H*(tf.y||0)/100,fl=tf.flip?-1:1,r=(tf.rot||0)*Math.PI/180,co=Math.cos(r),si=Math.sin(r);
  return{
    toCanvas:(x,y)=>{const ux=(x-sx-sw/2)*s*z*fl,uy=(y-sy-sh/2)*s*z;return[cx+ux*co-uy*si,cy+ux*si+uy*co]},
    toVideo:(X,Y)=>{const dx=X-cx,dy=Y-cy,ux=dx*co+dy*si,uy=-dx*si+dy*co;return[sx+sw/2+ux/(s*z*fl),sy+sh/2+uy/(s*z)]}
  };
}
/** ressemblance (corrélation normalisée) du modèle tp (taille n×n, centré) avec l'image Y au point (x, y) */
function trkNCC(Y,w,h,tp,n,x,y){
  const r=n>>1,x0=Math.round(x)-r,y0=Math.round(y)-r;if(x0<0||y0<0||x0+n>=w||y0+n>=h)return-2;
  let s=0,s2=0,st=0;for(let j=0;j<n;j++){const o=(y0+j)*w+x0,q=j*n;for(let i=0;i<n;i++){const v=Y[o+i];s+=v;s2+=v*v;st+=v*tp[q+i]}}
  const N=n*n,mu=s/N,va=s2/N-mu*mu;if(va<4)return-1;
  return(st/N-mu*tp.mu)/Math.sqrt(va*tp.va);
}
function trkPatch(Y,w,x,y,n){
  const r=n>>1,x0=Math.round(x)-r,y0=Math.round(y)-r,p=new Float32Array(n*n);let s=0,s2=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const v=Y[(y0+j)*w+x0+i];p[j*n+i]=v;s+=v;s2+=v*v}
  const N=n*n;p.mu=s/N;p.va=Math.max(4,s2/N-p.mu*p.mu);return p;
}
/** suit le point (x, y) (pixels de la vidéo) de a à b secondes du fichier ; → [{t, x, y, q}] (lecture : vidGray, 15j-stab.js) */
async function trkFrames(m,a,b,x,y,n,onP){
  const out=[];let tp=null,t0p=null,vx=0,vy=0,lost=0,qAvg=1,sc=1;const sw=TRK_SW;
  const r=await vidGray(m,a,b,TRK_GRAB,sw,(t,Y,sh,vw)=>{
    if(!tp){ // modèle de départ : l'image exacte de la tête de lecture (l'élément y est posé sur l'objet)
      sc=sw/vw;x=clamp(x*sc,n,sw-n);y=clamp(y*sc,n,sh-n);tp=trkPatch(Y,sw,x,y,n);t0p=trkPatch(Y,sw,x,y,n);out.push({t,x,y,q:1});return;
    }
    // recherche autour de la position prévue (vitesse gardée), d'abord en gros puis finement ; préférence pour la position attendue
    const px=x+vx,py=y+vy,R=Math.round(n*.9)+6;let best=-3,bx=px,by=py;
    const pen=(dx,dy)=>.15*(dx*dx+dy*dy)/(R*R);let bs=-9;
    for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){const q=trkNCC(Y,sw,sh,tp,n,px+dx,py+dy),sc2=q-pen(dx,dy);if(sc2>bs){bs=sc2;best=q;bx=px+dx;by=py+dy}}
    const cx0=Math.round(bx),cy0=Math.round(by);bs=-9;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const q=trkNCC(Y,sw,sh,tp,n,cx0+dx,cy0+dy),sc2=q-pen(cx0+dx-px,cy0+dy-py);if(sc2>bs){bs=sc2;best=q;bx=cx0+dx;by=cy0+dy}}
    // affinage sous le pixel (parabole sur les voisins)
    const f=(ox,oy)=>trkNCC(Y,sw,sh,tp,n,bx+ox,by+oy),c0=best,l=f(-1,0),rr=f(1,0),u=f(0,-1),dn=f(0,1);
    const sx=(l>-2&&rr>-2&&l+rr-2*c0<0)?clamp(.5*(l-rr)/(l+rr-2*c0),-.5,.5):0,sy=(u>-2&&dn>-2&&u+dn-2*c0<0)?clamp(.5*(u-dn)/(u+dn-2*c0),-.5,.5):0;
    // perdu : ressemblance basse, ou nette chute par rapport à d'habitude (l'objet est caché et le décor lui ressemble un peu)
    if(best<Math.max(.45,qAvg-.12)){lost++;if(lost>=4){out.lost=t;return false}}
    else{
      lost=0;qAvg=qAvg*.9+best*.1;const nx=bx+sx,ny=by+sy;vx=(nx-x)*.6+vx*.4;vy=(ny-y)*.6+vy*.4;x=nx;y=ny;
      // le modèle ne suit l'apparence que si l'objet ressemble encore à celui du départ (pas de glissement vers le décor)
      if(best>.8&&best>qAvg-.05&&trkNCC(Y,sw,sh,t0p,n,x,y)>.6){const p2=trkPatch(Y,sw,x,y,n);for(let i=0;i<tp.length;i++)tp[i]=tp[i]*.92+p2[i]*.08;let s=0,s2=0;for(const vv of tp){s+=vv;s2+=vv*vv}tp.mu=s/tp.length;tp.va=Math.max(4,s2/tp.length-tp.mu*tp.mu)}
      out.push({t,x,y,q:best});
    }
    onP&&onP((t-a)/(b-a));
  },()=>trkStop);
  return{pts:out.map(p=>({t:p.t,x:p.x/sc,y:p.y/sc,q:p.q})),lost:out.lost,vw:r.vw,vh:r.vh};
}
/** suivre : l'élément c suit l'objet qui est sous son centre à la tête de lecture */
async function trkRun(c){
  if(trkBusy)return null;
  if(!trkCan(c)){toast(T('trk.pick'));return null}
  if(trk(c).lock){toast(T('msg.trackLocked'));return null}
  const t0=clamp(time,c.start,c.start+c.dur-.1),v=trkVideoAt(t0);
  if(!v){toast(T('trk.noVideo'));return null}
  const m=mById(v.mid),rate=v.p.rate||1,t1=Math.min(c.start+c.dur,v.start+v.dur);
  if(t1-t0<.2){toast(T('trk.tooShort'));return null}
  // centre de l'élément (montage) → point de la vidéo d'origine
  const loc0=t0-c.start,X0=W*kfVal(c,'p.x',loc0)/100,Y0=H*kfVal(c,'p.y',loc0)/100;
  // taille de la vidéo : celle déjà connue du média (un 2e lecteur sur le même fichier gêne la lecture du suivi)
  let vw=m.w,vh=m.h;
  if(!vw||!vh){const pr=document.createElement('video');pr.crossOrigin='anonymous';pr.muted=true;pr.src=m.url;await new Promise(r=>{pr.onloadedmetadata=r;pr.onerror=r;setTimeout(r,6000)});vw=pr.videoWidth;vh=pr.videoHeight;pr.removeAttribute('src');pr.load()}
  if(!vw||!vh){toast(T('trk.noVideo'));return null}
  const mp0=trkMap(v,t0,vw,vh),[px,py]=mp0.toVideo(X0,Y0);
  if(px<0||py<0||px>vw||py>vh){toast(T('trk.outside'));return null}
  // taille du morceau suivi : celle de l'élément (zone floutée, forme), sinon un petit carré autour du centre
  const ew=c.gen==='blurz'||c.gen==='shape'?W*(kfVal(c,'p.w',loc0)||12)/100:W*.07,eh=c.gen==='blurz'||c.gen==='shape'?H*(kfVal(c,'p.h',loc0)||12)/100:W*.07;
  const sc=TRK_SW/vw,ppc=1/(mp0.toCanvas(1,0)[0]-mp0.toCanvas(0,0)[0]||1),n=clamp(Math.round(Math.min(ew,eh)*Math.abs(ppc)*sc*.8)|1,25,41);
  const a=v.in+(t0-v.start)*rate,b=v.in+(t1-v.start)*rate;
  trkBusy=true;trkStop=false;
  const esc2=e=>{if(e.key==='Escape'){trkStop=true}};addEventListener('keydown',esc2,true);
  let F=null,err=null;
  try{F=await trkFrames(m,a,b,px,py,n,q=>toast(T('trk.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})))}catch(e){err=e}
  removeEventListener('keydown',esc2,true);trkBusy=false;
  if(err){toast(T('trk.fail',{error:String(err&&err.message||err).slice(0,120)}));return null}
  if(!F||F.pts.length<2){toast(T(trkStop?'cap.cancelled':'trk.lostStart'));return null}
  // points → montage, puis images clés (10 par seconde, légèrement lissées)
  const P=F.pts.map(p=>{const tl=v.start+(p.t-v.in)/rate,[X,Y]=trkMap(v,tl,vw,vh).toCanvas(p.x,p.y);return{t:tl,X,Y}});
  // lissage léger (¼ ½ ¼) ; l'instant est moyenné comme la position : les images sautées ne créent pas de retard
  const sm=P.map((p,i)=>{let st=0,sx=0,sy=0,k=0;for(let j=Math.max(0,i-1);j<=Math.min(P.length-1,i+1);j++){const w=j===i?2:1;st+=w*P[j].t;sx+=w*P[j].X;sy+=w*P[j].Y;k+=w}return{t:st/k,X:sx/k,Y:sy/k}});
  sm[0]={t:P[0].t,X:P[0].X,Y:P[0].Y}; // le départ reste exactement où l'élément était posé
  const bx=kfVal(c,'p.x',loc0),by=kfVal(c,'p.y',loc0),dX=bx-100*P[0].X/W,dY=by-100*P[0].Y/H; // calage sur le point exact de départ (pas sur le point lissé)
  const keys=KFK(c),base=Object.fromEntries(keys.map(k=>[k,kfVal(c,k,loc0)]));
  c.kf=(c.kf||[]).filter(k=>k.t<loc0-.02);
  let last=-1;
  for(const p of sm){
    const lt=p.t-c.start;if(lt<loc0-1e-3||lt>c.dur+1e-3)continue;if(lt-last<.1&&p!==sm[sm.length-1])continue;last=lt;
    c.kf.push({t:Math.round(lt*1000)/1000,e:'linear',v:Object.assign({},base,{'p.x':Math.round((100*p.X/W+dX)*100)/100,'p.y':Math.round((100*p.Y/H+dY)*100)/100})});
  }
  c.kf.sort((p,q)=>p.t-q.t);c.p.trk={v:v.id,t0:Math.round(loc0*100)/100};
  sel=c.id;commit();refresh();
  const lostAt=F.lost!=null?v.start+(F.lost-v.in)/rate:null;
  toast(lostAt!=null?T('trk.lost',{t:fmt(lostAt)}):T('trk.done',{sec:window.i18n.fmt.number(Math.round((sm[sm.length-1].t-t0)*10)/10)}));
  return{keyframes:c.kf.length,lost_at:lostAt!=null?Math.round(lostAt*100)/100:null};
}
/** enlever le suivi : les images clés posées par le suivi (après son départ) sont retirées */
function trkRemove(c){if(!c||!c.p.trk)return;const t0=c.p.trk.t0;c.kf=(c.kf||[]).filter(k=>k.t<t0-.02||k.e!=='linear');if(!c.kf.length)delete c.kf;delete c.p.trk;commit();refresh();toast(T('trk.removed'))}
/** « flouter quelque chose qui bouge » : une zone floutée posée au milieu, à placer puis à suivre */
function trkBlurNew(){
  const v=trkVideoAt(time);if(!v){toast(T('trk.noVideo'));return}
  const d=WDEF.blurz(),c=newClip({track:tk('over'),start:time,dur:Math.min(d.dur,Math.max(.5,v.start+v.dur-time)),gen:'blurz',p:Object.assign({},d.p,{w:16,h:10,st:'zpix'})});
  clips.push(c);sel=c.id;commit();refresh();toast(T('trk.blurPlace'));
}

/* ---------- entrées : clic droit, Ctrl+K, assistant, DedCut IA ---------- */
{const b=lutCtx;lutCtx=function(c){const extra=[];
  if(trkCan(c)){extra.push({label:T('trk.run'),fn:()=>trkRun(c)});if(c.p.trk)extra.push({label:T('trk.remove'),fn:()=>trkRemove(c)})}
  if(isVid(c)&&c.mid&&!c.gen)extra.push({label:T('trk.blurNew'),fn:()=>trkBlurNew()});
  return[...b(c),...extra]}}
CMDS.push({id:'track',n:'trk.cmd',f:()=>{const c=selClip();if(trkCan(c))trkRun(c);else toast(T('trk.pick'))}});
CMDS.push({id:'trackblur',n:'trk.blurNew',f:()=>trkBlurNew()});
SPACE_TOOLS.track_object=async a=>{
  if(appMode!=='edit')setMode('edit');
  const c=a.id!=null?clips.find(x=>x.id===+a.id):selClip();
  if(!trkCan(c))throw new Error('give the id of an overlay element (text, sticker, shape, blur zone…) placed over the object at the playhead');
  if(a.time!=null)seek(+a.time);
  const r=await trkRun(c);if(!r)throw new Error('tracking did not work here');return r;
};
SPACE_TOOLS.add_moving_blur=async a=>{if(appMode!=='edit')setMode('edit');if(a.time!=null)seek(+a.time);trkBlurNew();const c=selClip();return c?{id:c.id,note:'Blur zone added in the middle: move it over the object (update_clip p.x / p.y, %), then call track_object with its id.'}:{error:'no video at the playhead'}};
MCP_READ.add('track_object');MCP_READ.add('add_moving_blur');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['suivre','suit ','suivi','qui bouge','tracking','track','rastrear','seguimiento','verfolgen','tracciamento','seguire','rastreamento','追跡','トラッキング','추적','트래킹','跟踪','追踪'])){
    if(dcIsQ(q,raw)&&!dcIsReq(q,raw))return{text:T('trk.howTo')};
    if(appMode!=='edit')setMode('edit');
    const c=selClip();if(!trkCan(c))return{text:T('trk.howTo')};
    const r=await trkRun(c);if(!r)return{text:T('trk.howTo')};chatActs++;chatAdd('act',T('ai.t.track_object'));return{text:T('trk.aiDone')};
  }
  return b(raw,q);
}}

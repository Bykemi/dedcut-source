/* ---------- Stabiliser la vidéo (v4.56) ----------
   Tout se passe sur ce PC. La vidéo est lue en accéléré (sans le son) et chaque image est comparée à la précédente :
   12 petits blocs (sur les contours) cherchent leur déplacement ; la médiane donne le glissement, l'écart entre les blocs
   donne la rotation. Le trajet de la caméra est lissé (Léger / Normal / Fort), puis chaque image est décalée de l'écart
   entre le trajet lissé et le vrai, avec un léger zoom pour cacher les bords.
   Les corrections sont rangées dans c.p.stab, au temps de la vidéo d'origine : couper ou raccourcir le clip les garde justes. */
const STAB_FPS=30,STAB_SW=192,STAB_GRAB=30; // grille des corrections (images/s) · images lues au plus par seconde de vidéo
/** images d'une vidéo de a à b secondes (want par seconde environ), en petit (largeur sw) et en gris, pour l'analyse :
 *  lecture accélérée ×2 qui ralentit d'elle-même si le navigateur saute des images ; si plus aucune image n'arrive
 *  (fenêtre réduite ou cachée, vidéo très lourde), on continue image par image en se déplaçant dans la vidéo (plus lent, sûr).
 *  onFrame(t, Y, sh, vw) : la 1re image est exactement celle de a ; renvoyer false arrête. stop() : annulation. */
async function vidGray(m,a,b,want,sw,onFrame,stop){
  const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.preload='auto';v.playsInline=true;v.src=m.url; // crossOrigin : sinon l'image est illisible (fichier du PC)
  try{
    // une grosse vidéo lue pour la 1re fois peut mettre longtemps à donner sa taille (fichier pas encore en mémoire)
    await new Promise(r=>{v.onloadedmetadata=r;v.onerror=r;setTimeout(r,30000)});
    const vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh)throw new Error('video');
    const sh=Math.max(16,Math.round(sw*vh/vw)),k=document.createElement('canvas');k.width=sw;k.height=sh;const g=k.getContext('2d',{willReadFrequently:true});
    const gray=()=>{g.drawImage(v,0,0,sw,sh);const d=g.getImageData(0,0,sw,sh).data,Y=new Float32Array(sw*sh);for(let i=0;i<sw*sh;i++)Y[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];return Y};
    const seekTo=t=>new Promise(r=>{let ok=false;const f=()=>{if(ok)return;ok=true;v.removeEventListener('seeked',f);r()};v.addEventListener('seeked',f);v.currentTime=t;setTimeout(f,4000)});
    await seekTo(a);
    let last=a,ended=false;
    if(onFrame(a,gray(),sh,vw)===false||stop())return{vw,vh,sh};
    // 1) lecture accélérée
    await new Promise((done,fail)=>{
      let over=false,wall=performance.now(),lastT=null;
      const fin=()=>{if(over)return;over=true;clearInterval(wd);v.pause();done()};
      const wd=setInterval(()=>{if(performance.now()-wall>1000)fin()},250); // plus aucune image depuis 1 s : image par image
      v.onended=()=>{ended=true;fin()};
      const grab=(now,meta)=>{if(over)return;
        try{
          if(stop()){ended=true;fin();return}
          const t=meta.mediaTime;wall=performance.now();
          // grand trou (le navigateur n'envoie presque plus d'images) : image par image à partir de la dernière traitée
          if(lastT!=null&&t-Math.max(lastT,last)>Math.max(.5,4/want)){fin();return}
          if(lastT!=null&&t-lastT>1.5/want&&v.playbackRate>.25)v.playbackRate=Math.max(.25,v.playbackRate/2); // une image sautée : plus lentement (chaque image compte)
          lastT=t;
          if(t>a+1e-3&&t>=last+1/want-1/120){last=t;if(onFrame(t,gray(),sh,vw)===false){ended=true;fin();return}}
          if(t>=b-.5/want){ended=true;fin();return}
        }catch(e){over=true;clearInterval(wd);v.pause();fail(e);return}
        v.requestVideoFrameCallback(grab);
      };
      v.requestVideoFrameCallback(grab);v.playbackRate=2;v.play().catch(e=>{over=true;clearInterval(wd);fail(e)});
    });
    // 2) image par image, si la lecture s'est arrêtée avant la fin
    if(!ended)for(let t=last+1/want;t<b-.5/want;t+=1/want){if(stop())break;await seekTo(t);if(onFrame(v.currentTime||t,gray(),sh,vw)===false)break}
    return{vw,vh,sh};
  }finally{v.removeAttribute('src');v.load()}
}
/** mouvement de la caméra entre a et b secondes : chaque petite image (en gris) est comparée à la précédente au fil de la
 *  lecture ; on ne garde que les déplacements [{t, dx, dy, da}] (peu de mémoire) */
async function stabFrames(m,a,b,onP){
  const out=[];let prev=null;
  const r=await vidGray(m,a,b,STAB_GRAB,STAB_SW,(t,Y,sh)=>{const[dx,dy,da]=prev?stabMotion(prev,Y,STAB_SW,sh):[0,0,0];out.push({t,dx,dy,da});prev=Y;onP&&onP((t-a)/(b-a))},()=>stabStop);
  return{pts:out,sw:STAB_SW,sh:r.sh,vw:r.vw,vh:r.vh};
}
/** déplacement de l'image B par rapport à A : [dx, dy, angle] (pixels de la petite image, radians)
 *  20 blocs texturés : recherche entière (somme des écarts), puis affinage sous le pixel par les gradients (Lucas-Kanade) ;
 *  la médiane donne le glissement, l'écart des blocs à la médiane donne la rotation */
function stabMotion(A,B,w,h){
  const bs=20,R=8,GX=5,GY=4,res=[];
  for(let gy=0;gy<GY;gy++)for(let gx=0;gx<GX;gx++){
    const x0=Math.round((gx+.5)*w/GX-bs/2),y0=Math.round((gy+.5)*h/GY-bs/2);
    if(x0-R-1<0||y0-R-1<0||x0+bs+R+1>w||y0+bs+R+1>h)continue;
    // bloc assez texturé seulement (un ciel uni ne dit rien du mouvement)
    let tx=0,ty=0;for(let y=y0;y<y0+bs;y++)for(let x=x0;x<x0+bs;x++){const i=y*w+x;tx+=Math.abs(A[i+1]-A[i]);ty+=Math.abs(A[i+w]-A[i])}
    if(tx<bs*bs*2||ty<bs*bs*2)continue;
    let best=Infinity,bx=0,by=0;
    for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
      let s=0;for(let y=0;y<bs&&s<best;y++){const ra=(y0+y)*w+x0,rb=(y0+y+dy)*w+x0+dx;for(let x=0;x<bs;x++)s+=Math.abs(A[ra+x]-B[rb+x])}
      if(s<best){best=s;bx=dx;by=dy}
    }
    // affinage : B(p+d+u) ≈ A(p)  →  G u = -Σ ∇B·(B(p+d) - A(p))
    let gxx=0,gxy=0,gyy=0,bxs=0,bys=0;
    for(let y=y0;y<y0+bs;y++)for(let x=x0;x<x0+bs;x++){
      const j=(y+by)*w+x+bx,Ix=(B[j+1]-B[j-1])/2,Iy=(B[j+w]-B[j-w])/2,It=B[j]-A[y*w+x];
      gxx+=Ix*Ix;gxy+=Ix*Iy;gyy+=Iy*Iy;bxs+=Ix*It;bys+=Iy*It;
    }
    const det=gxx*gyy-gxy*gxy;let ux=0,uy=0;
    if(det>1e-6){ux=clamp(-(gyy*bxs-gxy*bys)/det,-1,1);uy=clamp(-(gxx*bys-gxy*bxs)/det,-1,1)}
    res.push({x:x0+bs/2-w/2,y:y0+bs/2-h/2,dx:bx+ux,dy:by+uy});
  }
  if(res.length<3)return[0,0,0];
  const med=a=>{const s=[...a].sort((p,q)=>p-q);return s[s.length>>1]};
  const mx=med(res.map(r=>r.dx)),my=med(res.map(r=>r.dy));
  const ok=res.filter(r=>Math.hypot(r.dx-mx,r.dy-my)<3);
  let num=0,den=0,sx=0,sy=0;for(const r of ok){num+=r.x*(r.dy-my)-r.y*(r.dx-mx);den+=r.x*r.x+r.y*r.y;sx+=r.dx;sy+=r.dy}
  // glissement final : moyenne des blocs d'accord avec la médiane (plus fine que la médiane seule)
  return[ok.length?sx/ok.length:mx,ok.length?sy/ok.length:my,den&&ok.length>=4?clamp(num/den,-.05,.05):0];
}
/** trajet lissé → corrections (fractions de la largeur / hauteur de la vidéo, radians) et zoom pour cacher les bords */
function stabSolve(F,sw,sh,level){
  // trajet de la caméra aux vrais instants des images (le navigateur peut en avoir sauté), puis sur une grille régulière
  const fr=F.pts,nf=fr.length,px=new Float64Array(nf),py=new Float64Array(nf),pa=new Float64Array(nf);
  for(let i=1;i<nf;i++){px[i]=px[i-1]+fr[i].dx;py[i]=py[i-1]+fr[i].dy;pa[i]=pa[i-1]+fr[i].da}
  const t0=fr[0].t,n=Math.max(2,Math.round((fr[nf-1].t-t0)*STAB_FPS)+1),cx=new Float64Array(n),cy=new Float64Array(n),ca=new Float64Array(n);
  for(let i=0,j=0;i<n;i++){const t=t0+i/STAB_FPS;while(j<nf-2&&fr[j+1].t<t)j++;const k=clamp((t-fr[j].t)/Math.max(1e-6,fr[j+1].t-fr[j].t),0,1);cx[i]=px[j]+(px[j+1]-px[j])*k;cy[i]=py[j]+(py[j+1]-py[j])*k;ca[i]=pa[j]+(pa[j+1]-pa[j])*k}
  const sig={light:.35,normal:.8,strong:1.8}[level]||.8,rad=Math.ceil(sig*STAB_FPS*3),wts=[];for(let k=-rad;k<=rad;k++)wts.push(Math.exp(-.5*Math.pow(k/(sig*STAB_FPS),2)));
  const smooth=a=>Float64Array.from(a,(_,i)=>{let s=0,ws=0;for(let k=-rad;k<=rad;k++){const j=Math.min(n-1,Math.max(0,i+k));s+=a[j]*wts[k+rad];ws+=wts[k+rad]}return s/ws});
  const sx=smooth(cx),sy=smooth(cy),sa=smooth(ca);
  const x=[],y=[],a=[];for(let i=0;i<n;i++){x.push((sx[i]-cx[i])/sw);y.push((sy[i]-cy[i])/sh);a.push(sa[i]-ca[i])}
  // zoom : assez pour 98 % des images, 25 % au plus ; les corrections plus grandes sont rognées
  const need=x.map((v,i)=>Math.max(Math.abs(v)*2+Math.abs(a[i])*.6,Math.abs(y[i])*2+Math.abs(a[i])*.6)).sort((p,q)=>p-q);
  const z=Math.min(1.25,1+(need[Math.floor(n*.98)]||0)),m=(z-1)/2;
  const r3=v=>Math.round(v*1e4)/1e4;
  return{fps:STAB_FPS,t0,x:x.map(v=>r3(clamp(v,-m,m))),y:y.map(v=>r3(clamp(v,-m,m))),a:a.map(r3),z:Math.round(z*1000)/1000};
}
/** correction à l'instant t du montage : [dx, dy, angle, zoom] */
function stabAt(c,t){
  const S=c.p.stab;if(!S||!S.x||!S.x.length)return null;
  const loc=t-c.start,r=c.p.rate||1,src=c.p.rev?c.in+(c.dur-loc)*r:c.in+loc*r,f=(src-S.t0)*S.fps,n=S.x.length;
  if(f<0||f>n-1)return[0,0,0,S.z];
  const i=Math.floor(f),k=f-i,j=Math.min(n-1,i+1),L=(A)=>A[i]+(A[j]-A[i])*k;
  return[L(S.x),L(S.y),L(S.a),S.z];
}
let stabCur=null;
{const db=drawBase;drawBase=function(c,t){stabCur=c.mid&&c.p&&c.p.stab?stabAt(c,t):null;try{return db(c,t)}finally{stabCur=null}}}
{const dc=drawCover;drawCover=function(el,w,h,p){
  const s=stabCur;if(!s||!w||!h)return dc(el,w,h,p);
  const[,,sw,sh]=cropRect(p,w,h),fit=p.fit,sc=(fit==='contain'||fit==='blur')?Math.min(W/sw,H/sh):Math.max(W/sw,H/sh),tf=p.tf||{},z=(tf.zoom??100)/100*s[3];
  return dc(el,w,h,{...p,tf:{...tf,zoom:z*100,x:(tf.x||0)+s[0]*sw*sc*z/W*100,y:(tf.y||0)+s[1]*sh*sc*z/H*100,rot:(tf.rot||0)+s[2]*180/Math.PI}});
}}

/* ---------- inspecteur (onglet Animation d'un clip vidéo) ---------- */
let stabBusy=false,stabStop=false,stabLevel='normal';try{stabLevel=localStorage.getItem('dedcut-stab')||'normal'}catch(e){}
function stabHTML(c){
  const on=!!(c.p.stab&&c.p.stab.x);
  if(stabBusy)return`<div class="pre" style="margin:10px 0 0"><button data-act="stabStop">${T('common.cancel')}</button></div><div id="stabPct" class="hint" style="margin:6px 0 0"></div>`;
  return`<div class="pre" style="margin:10px 0 0"><button data-act="stab">${T(on?'stab.again':'stab.run')}</button>${on?`<button data-act="unstab">${T('stab.remove')}</button>`:''}</div>
  <div class="seg" style="margin:6px 0 0">${['light','normal','strong'].map(k=>`<button data-act="stabLv" data-lv="${k}" class="${stabLevel===k?'on':''}">${T('stab.'+k)}</button>`).join('')}</div>
  <div id="stabPct" class="hint" style="margin:6px 0 0">${on?T('stab.on',{zoom:Math.round((c.p.stab.z-1)*100)}):''}</div><p class="hint" style="margin:6px 0 0">${T('stab.hint')}</p>`;
}
async function stabRun(c){
  if(stabBusy)return;
  const m=c&&c.mid&&mById(c.mid);
  if(!isVid(c)||c.gen||!m||m.type!=='video'){toast(T('reframe.notVideo'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  stabBusy=true;stabStop=false;renderInspector();const pct=q=>{const e=$('#stabPct');if(e)e.textContent=T('stab.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})};pct(0);
  try{
    const len=c.dur*(c.p.rate||1),a=Math.max(0,c.in||0),b=Math.min(m.duration||a+len,a+len+.05);
    const F=await stabFrames(m,a,b,q=>pct(q*.85));
    if(stabStop)throw new Error('cancelled');
    if(F.pts.length<4)throw new Error('video');
    const S=stabSolve(F,F.sw,F.sh,stabLevel);pct(1);
    c.p.stab=S;commit();refresh();
    toast(T('stab.done',{zoom:Math.round((S.z-1)*100)}));
  }catch(e){toast(String(e&&e.message)==='cancelled'?T('cap.cancelled'):T('stab.fail',{error:String((e&&e.message)||e).slice(0,140)}))}
  stabBusy=false;renderInspector();
}
function stabRemove(c){if(!c||!c.p.stab)return;delete c.p.stab;commit();refresh();toast(T('stab.removed'))}
WACTS.stab=c=>stabRun(c);
WACTS.unstab=c=>stabRemove(c);
WACTS.stabStop=()=>{stabStop=true};
WACTS.stabLv=()=>{}; // le choix Léger / Normal / Fort est lu ci-dessous (bouton cliqué)
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="stabLv"]');if(!b)return;stabLevel=b.dataset.lv;try{localStorage.setItem('dedcut-stab',stabLevel)}catch(x){}renderInspector()});

/* clic droit sur un clip vidéo, assistant IA, DedCut IA (« stabilise la vidéo ») */
{const b=lutCtx;lutCtx=function(c){const m=c&&c.mid&&mById(c.mid);return[...b(c),...(isVid(c)&&m&&m.type==='video'&&!c.gen?[{label:T(c.p.stab?'stab.again':'stab.run'),fn:()=>{sel=c.id;insTab[kindOf(c)]='anim';refresh();stabRun(c)}}]:[])]}}
SPACE_TOOLS.stabilize_video=async a=>{
  if(appMode!=='edit')setMode('edit');
  const c=a.id!=null?clips.find(x=>x.id===+a.id):(selClip()&&isVid(selClip())?selClip():clips.filter(x=>isVid(x)&&x.mid&&(mById(x.mid)||{}).type==='video').sort((p,q)=>q.dur-p.dur)[0]);
  if(!c)throw new Error('no video clip: give the id of a video clip (get_project)');
  if(a.strength&&['light','normal','strong'].includes(a.strength))stabLevel=a.strength;
  if(a.remove){stabRemove(c);return{removed:true,id:c.id}}
  sel=c.id;insTab[kindOf(c)]='anim';refresh();await stabRun(c);
  return c.p.stab?{stabilized:true,id:c.id,zoom_percent:Math.round((c.p.stab.z-1)*100)}:{error:'the stabilization did not work'};
};
MCP_READ.add('stabilize_video');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['stabilis','stabiliz','estabiliz','shaky','verwackelt','traballante','手ぶれ','흔들림 보정','防抖'])){
    if(dcIsQ(q,raw)&&!dcIsReq(q,raw))return{text:T('stab.howTo')};
    if(appMode!=='edit')setMode('edit');
    try{const r=await SPACE_TOOLS.stabilize_video({strength:dcHas(q,['fort','strong','fuerte','stark','forte','強','강하게','强'])?'strong':undefined});if(!r.stabilized)return{text:T('stab.fail',{error:'?'})};chatActs++;chatAdd('act',T('stab.run'));return{text:T('stab.done',{zoom:r.zoom_percent})}}
    catch(e){return{text:T('reframe.notVideo')}}
  }
  return b(raw,q);
}}

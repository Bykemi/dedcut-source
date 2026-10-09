/* ---------- Accorder les couleurs (v4.54) : clic droit sur un clip → les autres clips prennent ses couleurs ----------
   Pour des vidéos filmées avec des appareils différents. Méthode de Reinhard (moyenne et écart de la lumière et des
   couleurs, espace YCbCr), mesurée sur 6 images de chaque clip, puis transformée en LUT 3D (33 × 33 × 33) appliquée par
   le moteur des LUT du Montage (15d-montage3.js) : force réglable dans « LUT… », Ctrl+Z annule. Tout se fait sur ce PC. */
const cmYcc=(r,g,b)=>[.299*r+.587*g+.114*b,128-.168736*r-.331264*g+.5*b,128+.5*r-.418688*g-.081312*b];
const cmRgb=(y,cb,cr)=>[y+1.402*(cr-128),y-.344136*(cb-128)-.714136*(cr-128),y+1.772*(cb-128)];
/** moyenne et écart de Y, Cb, Cr sur quelques images du clip (source, sans les effets) */
async function cmStats(c){
  const m=c.mid&&mById(c.mid);if(!m)return null;
  const rd=m.type==='video'?new SeekReader(m):null,im=rd?null:await thImg(m.url);
  const cv=document.createElement('canvas'),g=cv.getContext('2d',{willReadFrequently:true}),S=[0,0,0],Q=[0,0,0];let n=0;
  try{
    for(let j=0;j<6;j++){
      const tl=c.dur*(j+.5)/6,src=(c.in||0)+tl*(c.p.rate||1),el=rd?await rd.frameAt(Math.min(src,Math.max(0,(m.duration||1e9)-.05))):im;
      const vw=el&&(el.videoWidth||el.naturalWidth),vh=el&&(el.videoHeight||el.naturalHeight);if(!vw||!vh)continue;
      const w=96,h=Math.max(8,Math.round(w*vh/vw));cv.width=w;cv.height=h;g.drawImage(el,0,0,w,h);
      const d=g.getImageData(0,0,w,h).data;
      for(let i=0;i<d.length;i+=4){const y=cmYcc(d[i],d[i+1],d[i+2]);for(let k=0;k<3;k++){S[k]+=y[k];Q[k]+=y[k]*y[k]}n++}
      if(!rd)break; // image fixe : une mesure suffit
    }
  }finally{rd&&rd.close()}
  if(!n)return null;
  const mu=S.map(s=>s/n);return{mu,sd:Q.map((q,k)=>Math.sqrt(Math.max(1,q/n-mu[k]*mu[k])))};
}
/** LUT (même rangement que parseCube) qui amène les couleurs de src vers celles de ref */
function cmLut(src,ref){
  const n=33,u8=new Uint8Array(n*n*n*3),k=[0,1,2].map(i=>clamp(ref.sd[i]/src.sd[i],.55,1.8));
  for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){
    const y=cmYcc(r*255/(n-1),g*255/(n-1),b*255/(n-1)),z=y.map((v,i)=>(v-src.mu[i])*k[i]+ref.mu[i]),o=cmRgb(z[0],z[1],z[2]),at=(g*n*n+b*n+r)*3;
    for(let q=0;q<3;q++)u8[at+q]=clamp(Math.round(o[q]),0,255);
  }
  return{n,u8};
}
let cmBusy=false;
async function cmMatchAll(ref){
  if(cmBusy)return;
  const ok=x=>x!==ref&&isVid(x)&&!x.gen&&x.mid&&!trk(x).lock&&mById(x.mid)&&/^(video|image)$/.test(mById(x.mid).type);
  const list=clips.filter(ok);if(!list.length){toast(T('cm.none'));return}
  cmBusy=true;toast(T('cm.working',{n:list.length}));
  try{
    const rs=await cmStats(ref);if(!rs){toast(T('cm.fail'));return}
    let done=0;
    for(const c of list){
      const s=await cmStats(c);if(!s)continue;const{n,u8}=cmLut(s,rs),id='cm'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
      lutLib[id]={n:T('cm.lutName',{name:clipName(ref)}).slice(0,80),size:n,d:lutB64(u8)};lutCache.delete(id);c.p.lut={id,a:100};done++;
    }
    projDirty=true;commit();refresh();toast(T('cm.done',{n:done}));
  }finally{cmBusy=false}
}
{const b=lutCtx;lutCtx=function(c){return[...b(c),...(isVid(c)&&!c.gen&&c.mid&&clips.filter(x=>x!==c&&isVid(x)&&x.mid).length?[{label:T('cm.menu'),fn:()=>cmMatchAll(c)}]:[])]}}

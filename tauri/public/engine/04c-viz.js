/* ---------- visualiseur audio : barres, onde, cercle, courbe, vumètre qui suivent le son de tout le projet ----------
   Le son du projet (vidéos et musiques audibles) est mélangé en mono à 22 050 Hz, puis analysé une fois (FFT, 30 images/s, 48 bandes).
   Résultat gardé en mémoire tant que le son du projet ne change pas ; l'export attend que l'analyse soit prête (vizReady). */
const VIZ_FPS=30,VIZ_B=48,VIZ_SR=22050;
let vizCache={sig:'',data:null},vizJob=null;
function vizClips(){return clips.filter(c=>{const m=c.mid&&mById(c.mid);return m&&m.type!=='image'&&!trk(c).mute&&(c.p.vol??100)>0})}
function vizSig(){return JSON.stringify(vizClips().map(c=>[c.mid,r2(c.start),r2(c.dur),r2(c.in),c.p.rate||1,c.p.vol??100,c.p.rev?1:0]))}
function vizFFT(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k],xr=re[i+k+len/2]*cr-im[i+k+len/2]*ci,xi=re[i+k+len/2]*ci+im[i+k+len/2]*cr;re[i+k]=ur+xr;im[i+k]=ui+xi;re[i+k+len/2]=ur-xr;im[i+k+len/2]=ui-xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
async function vizBuild(){
  const sig=vizSig();if(sig===vizCache.sig)return vizCache.data;
  const TD=Math.max(.5,total()),n=Math.ceil(TD*VIZ_SR),mono=new Float32Array(n);
  for(const c of vizClips()){const buf=await decodeAudio(mById(c.mid));if(!buf)continue;
    const chs=[];for(let k=0;k<buf.numberOfChannels;k++)chs.push(buf.getChannelData(k));const sr=buf.sampleRate,rate=c.p.rate||1,vol=(c.p.vol??100)/100/chs.length;
    const i0=Math.max(0,Math.floor(c.start*VIZ_SR)),i1=Math.min(n,Math.ceil((c.start+c.dur)*VIZ_SR));
    for(let i=i0;i<i1;i++){const tl=i/VIZ_SR-c.start,st=c.p.rev?buf.duration-(c.in+tl*rate):c.in+tl*rate,k=Math.floor(st*sr);if(k<0||k>=buf.length)continue;let v=0;for(const d of chs)v+=d[k];mono[i]+=v*vol}}
  const N=1024,frames=Math.ceil(TD*VIZ_FPS),spec=new Float32Array(frames*VIZ_B),lev=new Float32Array(frames),win=new Float32Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  const edges=[];for(let b=0;b<=VIZ_B;b++)edges.push(Math.max(1,Math.round(40*Math.pow(9000/40,b/VIZ_B)/VIZ_SR*N)));
  const re=new Float32Array(N),im=new Float32Array(N);
  for(let f=0;f<frames;f++){const c0=Math.round(f/VIZ_FPS*VIZ_SR)-N/2;let rms=0;
    for(let i=0;i<N;i++){const v=mono[c0+i]||0;re[i]=v*win[i];im[i]=0;rms+=v*v}lev[f]=Math.sqrt(rms/N);vizFFT(re,im);
    for(let b=0;b<VIZ_B;b++){let s=0;const a=edges[b],z=Math.max(a+1,edges[b+1]);for(let k=a;k<z&&k<N/2;k++)s+=Math.hypot(re[k],im[k]);spec[f*VIZ_B+b]=s/(z-a)*(1+b/VIZ_B*2.5)}
    if(f%400===399)await new Promise(r=>setTimeout(r,0))}
  // normalisation (95e centile) puis montée rapide / descente douce
  const pick=a=>{const s=Array.from(a.filter((_,i)=>i%7===0)).sort((x,y)=>x-y);return s[Math.floor(s.length*.95)]||1};
  const ns=pick(spec)||1,nl=pick(lev)||1;
  for(let f=0;f<frames;f++){for(let b=0;b<VIZ_B;b++){const i=f*VIZ_B+b,v=Math.min(1.25,Math.sqrt(spec[i]/ns));spec[i]=f?Math.max(v,spec[i-VIZ_B]*.82):v}lev[f]=Math.min(1.2,lev[f]/nl);if(f)lev[f]=Math.max(lev[f],lev[f-1]*.9)}
  let pk=0;for(let i=0;i<n;i+=3){const a=Math.abs(mono[i]);if(a>pk)pk=a}
  vizCache={sig,data:{mono,spec,lev,frames,peak:Math.max(.02,pk)}};return vizCache.data;
}
function vizEnsure(){const sig=vizSig();if(sig===vizCache.sig||vizJob)return;vizJob=vizBuild().catch(e=>console.warn('visualiseur',e)).finally(()=>{vizJob=null;try{if(!playing)render(time)}catch(e){}})}
async function vizReady(){if(!clips.some(c=>c.gen==='viz'))return;if(vizJob)await vizJob;await vizBuild()}
/* valeurs d'une image : 48 bandes entre 0 et ~1,2 (données réelles, ou animation de démonstration pour les vignettes) */
function vizBands(t,demo){
  const out=new Float32Array(VIZ_B);
  if(demo){for(let b=0;b<VIZ_B;b++){const u=b/VIZ_B;out[b]=Math.max(.05,(.55+.4*Math.sin(t*5+u*9)*Math.cos(t*2.3+u*4))*(1-u*.55))}return out}
  const d=vizCache.data;if(!d)return out;const f=Math.max(0,Math.min(d.frames-1,Math.floor(t*VIZ_FPS)));out.set(d.spec.subarray(f*VIZ_B,f*VIZ_B+VIZ_B));return out;
}
const vizSample=(arr,n)=>{const o=new Float32Array(n);for(let i=0;i<n;i++){const p=i/(n-1||1)*(arr.length-1),k=Math.floor(p),f=p-k;o[i]=arr[k]*(1-f)+(arr[Math.min(arr.length-1,k+1)]||0)*f}return o};
WDRAW.viz=(c,p,loc,t)=>{
  const demo=c.id===-8;if(!demo)vizEnsure();
  const st=p.st||'vbars',sens=(p.sens??100)/100,col=p.color||'#22d3ee',col2=p.color2||'#a78bfa';
  const w=W*(p.w??60)/100,h=H*(p.h??22)/100,cx=W*(p.x??50)/100,cy=H*(p.y??80)/100;
  const bands=vizBands(demo?loc:t,demo).map(v=>Math.min(1.3,v*sens));
  const grad=(x0,y0,x1,y1)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,col);g.addColorStop(1,col2);return g};
  ctx.shadowColor=hexA(col,.55);ctx.shadowBlur=H*.012;
  if(st==='vbars'){const n=Math.max(4,Math.round(p.n??32)),v=vizSample(bands,n),gap=w/n*.28,bw=w/n-gap,mir=!!p.mir;
    ctx.fillStyle=grad(0,cy+h/2,0,cy-h/2);
    for(let i=0;i<n;i++){const bh=Math.max(bw*.6,v[i]*h*(mir?.5:1)),x=cx-w/2+i*(bw+gap)+gap/2;ctx.beginPath();if(mir)ctx.roundRect(x,cy-bh,bw,bh*2,bw/2);else ctx.roundRect(x,cy+h/2-bh,bw,bh,[bw/2,bw/2,1,1]);ctx.fill()}
    boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
  }else if(st==='vwave'){const d=vizCache.data,n=Math.round(w/3),win=Math.round(VIZ_SR*.05),c0=Math.round(t*VIZ_SR)-win/2;
    ctx.lineWidth=Math.max(2,H*.006);ctx.lineJoin=ctx.lineCap='round';ctx.strokeStyle=grad(cx-w/2,0,cx+w/2,0);
    for(const pass of [0,1]){ctx.globalAlpha*=pass?1:.35;ctx.beginPath();
      for(let i=0;i<n;i++){const u=i/(n-1),env=Math.sin(Math.PI*u);let v;
        if(demo||!d)v=Math.sin(u*28+loc*9)*.45*Math.sin(u*7-loc*3)*(demo?1:.15);else{const k=c0+Math.round(u*win);v=(d.mono[k]||0)/d.peak*1.6*sens}
        const y=cy+Math.max(-1,Math.min(1,v))*h/2*env*(pass?1:1.15);i?ctx.lineTo(cx-w/2+u*w,y):ctx.moveTo(cx-w/2,y)}
      ctx.stroke();if(!pass)ctx.globalAlpha/=.35}
    boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
  }else if(st==='vcircle'){const n=Math.max(12,Math.round(p.n??64)),v=vizSample(bands,n/2),r=Math.min(w,h*2.2)/2*.42,len=r*.9,rot=loc*.25;
    ctx.lineCap='round';ctx.lineWidth=Math.max(2,2*Math.PI*r/n*.55);ctx.strokeStyle=grad(cx-r,cy-r,cx+r,cy+r);ctx.beginPath();
    for(let i=0;i<n;i++){const k=i<n/2?i:n-1-i,a=rot+i/n*Math.PI*2,l=Math.max(ctx.lineWidth,v[k]*len);ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.lineTo(cx+Math.cos(a)*(r+l),cy+Math.sin(a)*(r+l))}
    ctx.stroke();ctx.shadowBlur=0;ctx.lineWidth=Math.max(2,r*.05);ctx.strokeStyle=hexA(col,.7);ctx.beginPath();ctx.arc(cx,cy,r*.86,0,Math.PI*2);ctx.stroke();
    const R=r+len;boxes.set(c.id,{x:cx-R,y:cy-R,w:R*2,h:R*2,rot:0});
  }else if(st==='vline'){const n=64,v=vizSample(bands,n);ctx.beginPath();ctx.moveTo(cx-w/2,cy+h/2);
    for(let i=0;i<n;i++){const x=cx-w/2+i/(n-1)*w,y=cy+h/2-v[i]*h;if(!i)ctx.lineTo(x,y);else{const px=cx-w/2+(i-1)/(n-1)*w,py=cy+h/2-v[i-1]*h;ctx.quadraticCurveTo(px,py,(px+x)/2,(py+y)/2)}}
    ctx.lineTo(cx+w/2,cy+h/2);ctx.closePath();const g=ctx.createLinearGradient(0,cy-h/2,0,cy+h/2);g.addColorStop(0,hexA(col,.85));g.addColorStop(1,hexA(col2,.1));ctx.fillStyle=g;ctx.fill();
    boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
  }else{/* vumètre : deux rangées de segments vert → jaune → rouge */
    const d=vizCache.data,f=d?Math.max(0,Math.min(d.frames-1,Math.floor(t*VIZ_FPS))):0,base=demo?.55+.35*Math.sin(loc*4):(d?d.lev[f]:0),segs=24,gap=w/segs*.22,sw=w/segs-gap,rh=h*.36;
    ctx.shadowBlur=0;
    for(const [row,k] of [[0,1],[1,.92]]){const lvl=Math.min(1,base*sens*k*(demo&&row?1.08:1)),y=cy-h/2+row*(rh+h*.12)+h*.08;
      for(let i=0;i<segs;i++){const u=i/segs,on=u<lvl,cc=u<.65?'#22c55e':u<.85?'#facc15':'#ef4444';ctx.fillStyle=on?cc:hexA(cc,.16);ctx.beginPath();ctx.roundRect(cx-w/2+i*(sw+gap),y,sw,rh,2);ctx.fill()}}
    boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
  }
};
WSTY.viz=['vbars','vwave','vcircle','vline','vvu'];
WDEF.viz=()=>({dur:10,p:{st:'vbars',color:'#22d3ee',color2:'#a78bfa',n:32,w:60,h:22,mir:false,sens:100,x:50,y:80,op:100}});
WINSP.viz=[['st','st'],['color','col','common.color'],['color2','col','wdg.color2'],['n','num','wdg.vizBars',[8,96],['vbars','vcircle']],['mir','chk','wdg.mirror',null,['vbars']],
  ['w','num','insp.widthPct',[10,100,.5]],['h','num','insp.heightPct',[4,80,.5]],['sens','num','wdg.sens',[30,250]],['hint','hint','wdg.vizHint']];
GN.viz='wdg.viz';

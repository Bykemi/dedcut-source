/* ---------- suivi d'objet (v4.36) : un texte, un emoji ou un élément suit quelque chose qui bouge dans la vidéo ----------
   Tu cliques sur l'objet dans l'aperçu ; DedCut le retrouve image après image (comparaison de petits carrés d'image, 100 % local)
   et pose des images clés de position sur l'élément. */
let tpick=null,trackBusy=false;
function startTrackPick(c){if(!c||trackBusy)return;pause();tpick={id:c.id};cv.classList.add('drawing');mdc.style.display='block';const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  mdc.style.left=cv.style.left;mdc.style.top=cv.style.top;mdc.style.width=w+'px';mdc.style.height=h+'px';mdc.width=Math.round(w*d);mdc.height=Math.round(h*d);const g=mdc.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,0,w,h);toast(T('trk.pick'))}
function stopTrackPick(){tpick=null;cv.classList.remove('drawing');mdc.style.display='none'}
cv.addEventListener('pointerdown',e=>{if(!tpick)return;e.stopImmediatePropagation();e.preventDefault();const[px,py]=mdrawPt(e),c=clips.find(x=>x.id===tpick.id);stopTrackPick();if(c)trackObject(c,px,py)},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&tpick){e.stopImmediatePropagation();stopTrackPick()}},true);
/* passage image de la vidéo (pixels de la source) <-> image du projet (pixels), pour un clip vidéo sans rotation */
function vidMap(v,sw,sh){const tf=v.p.tf||{},cov=Math.max(W/sw,H/sh),s=(v.p.fit==='contain'||v.p.fit==='blur')?Math.min(W/sw,H/sh):cov,z=(tf.zoom??100)/100*s,fl=tf.flip?-1:1,cx=W/2+W*(tf.x||0)/100,cy=H/2+H*(tf.y||0)/100;
  return{toProj:(x,y)=>[cx+(x-sw/2)*z*fl,cy+(y-sh/2)*z],toSrc:(X,Y)=>[sw/2+(X-cx)/(z*fl),sh/2+(Y-cy)/z]}}
async function trackObject(c,px,py){
  const v=clips.filter(x=>isVid(x)&&!x.gen&&x.mid&&(mById(x.mid)||{}).type==='video'&&time>=x.start&&time<x.start+x.dur).pop();
  if(!v){toast(T('trk.noVideo'));return}
  trackBusy=true;const m=mById(v.mid),rate=v.p.rate||1,r=new SeekReader(m),t0=Math.max(time,c.start),t1=Math.min(c.start+c.dur,v.start+v.dur),dt=1/12;
  const WW=320,cvs=document.createElement('canvas'),g=cvs.getContext('2d',{willReadFrequently:true});let sw=0,sh=0,hh=0,map=null,gray=null;
  const grab=async tl=>{const el=await r.frameAt(Math.min(v.in+(tl-v.start)*rate,Math.max(0,(m.duration||1e9)-.05)));if(!sw){sw=el.videoWidth;sh=el.videoHeight;hh=Math.max(8,Math.round(WW*sh/sw));cvs.width=WW;cvs.height=hh;map=vidMap(v,sw,sh)}g.drawImage(el,0,0,WW,hh);const d=g.getImageData(0,0,WW,hh).data,Y=new Float32Array(WW*hh);for(let i=0;i<Y.length;i++)Y[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];return Y};
  const R=10,S=16;
  const patch=(Y,x,y)=>{const p=new Float32Array((2*R+1)**2);let k=0,s=0;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const xx=clamp(Math.round(x+i),0,WW-1),yy=clamp(Math.round(y+j),0,hh-1);p[k]=Y[yy*WW+xx];s+=p[k++]}s/=p.length;for(let i=0;i<p.length;i++)p[i]-=s;return p};
  try{
    gray=await grab(t0);const off=[c.p.x-px,c.p.y-py];
    let[sx,sy]=map.toSrc(px*W/100,py*H/100);let x=sx*WW/sw,y=sy*hh/sh;if(x<0||y<0||x>=WW||y>=hh){toast(T('trk.noVideo'));trackBusy=false;r.close();return}
    let tpl=patch(gray,x,y);const pts=[{t:t0,x,y}];let lost=0;
    for(let t=t0+dt;t<=t1+1e-6;t+=dt){
      const Y=await grab(t);let best=1e18,bx=x,by=y;
      for(let j=-S;j<=S;j+=2)for(let i=-S;i<=S;i+=2){const p=patch(Y,x+i,y+j);let e=0;for(let k=0;k<p.length;k++)e+=Math.abs(p[k]-tpl[k]);if(e<best){best=e;bx=x+i;by=y+j}}
      for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const p=patch(Y,bx+i,by+j);let e=0;for(let k=0;k<p.length;k++)e+=Math.abs(p[k]-tpl[k]);if(e<best){best=e;bx+=i;by+=j}}
      const err=best/tpl.length;if(err>40){lost++}else{lost=0;x=bx;y=by;const np=patch(Y,x,y);for(let k=0;k<tpl.length;k++)tpl[k]=tpl[k]*.85+np[k]*.15}
      pts.push({t,x,y});if(pts.length%6===0){toast(T('trk.working',{pct:Math.round((t-t0)/Math.max(.01,t1-t0)*100)}));await new Promise(r=>setTimeout(r,0))}
      if(lost>18)break;
    }
    // positions lissées -> images clés (p.x, p.y en % de l'image du projet), décalage d'origine gardé
    const sm=pts.map((p,i)=>{let ax=0,ay=0,n=0;for(let k=Math.max(0,i-2);k<=Math.min(pts.length-1,i+2);k++){ax+=pts[k].x;ay+=pts[k].y;n++}return{t:p.t,x:ax/n,y:ay/n}});
    const base=Object.fromEntries(KFK(c).map(k=>[k,gv(c,k)])),kf=(c.kf||[]).filter(k=>k.t<t0-c.start-1e-3);
    sm.forEach((p,i)=>{if(i%2&&i!==sm.length-1)return;const[X,Yp]=map.toProj(p.x*sw/WW,p.y*sh/hh);kf.push({t:Math.round((p.t-c.start)*1000)/1000,v:{...base,'p.x':Math.round((X/W*100+off[0])*10)/10,'p.y':Math.round((Yp/H*100+off[1])*10)/10}})});
    c.kf=kf;commit();refresh();toast(T('trk.done',{n:kf.length}));
  }catch(e){console.error(e);toast(T('trk.error'))}
  finally{r.close();trackBusy=false}
}
WACTS.track=c=>startTrackPick(c);

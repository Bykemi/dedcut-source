/* ---------- effets « Visage » (v4.50) : accessoires et retouches qui suivent le visage, façon réseaux sociaux ----------
   Tous les dessins sont faits ici par DedCut (rien de repris d'autres applis : ni noms, ni logos, ni dessins).
   Détecteur de visages MediaPipe BlazeFace (Apache-2.0, déjà livré dans vendor/mediapipe, voir faceDetector dans 10-tools.js) :
   cadre du visage + 6 points (yeux, bout du nez, bouche, oreilles), cherchés sur une petite copie de l'image (320 px),
   puis lissés d'une image à l'autre pour que les accessoires ne tremblent pas.
   Repère « visage » : origine entre les deux yeux, x vers l'œil de droite (à l'écran), y vers la bouche, 100 = écart des yeux. */
const FACE_FX=FX_CATS.face;
const usesFace=fx=>!!fx&&FACE_FX.some(k=>fx[k]);
Object.assign(FXN,Object.fromEntries(FACE_FX.map(k=>[k,'fx.'+k])));
FXCATN.face='fxcat.face';
let faceFxDet=null,faceFxP=null;
function faceFxLoad(){if(!faceFxP)faceFxP=faceDetector().then(d=>{faceFxDet=d||null;wake();return faceFxDet});return faceFxP}
/* avant un export : le détecteur doit être chargé, sinon les premières images sortiraient sans l'effet */
async function facePrep(){if(clips.some(c=>usesFace(c.p&&c.p.fx)))await faceFxLoad()}
const fcIn=document.createElement('canvas'),fcInCtx=fcIn.getContext('2d',{willReadFrequently:true});
const fcTmp=document.createElement('canvas'),fcTmpCtx=fcTmp.getContext('2d');
const fcMem=new WeakMap();
const fcLerp=(a,b,q)=>a+(b-a)*q;
function fcAngLerp(a,b,q){let d=b-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return a+d*q}
/** visages de l'image du clip (3 au plus), lissés d'une image à l'autre ; null si le détecteur n'est pas encore prêt */
function faceFind(p,t){
  if(!faceFxDet){faceFxLoad();return null}
  // même image redessinée : pas de nouvelle recherche (sauf si rien n'a été trouvé : l'image n'était peut-être pas encore chargée)
  const m0=fcMem.get(p);if(m0&&!fxPreview&&m0.faces.length&&Math.abs(t-m0.t)<1e-4)return m0.faces;
  const s=Math.min(1,320/Math.max(W,H)),w=Math.max(16,Math.round(W*s)),h=Math.max(16,Math.round(H*s));
  if(fcIn.width!==w||fcIn.height!==h){fcIn.width=w;fcIn.height=h}
  fcInCtx.clearRect(0,0,w,h);fcInCtx.drawImage(ctx.canvas,0,0,w,h);
  let r;try{r=faceFxDet.detect(fcIn)}catch(e){return null}
  const now=[];
  for(const d of(r&&r.detections||[]).slice(0,3)){
    const b=d.boundingBox,kp=d.keypoints||[];if(!b||kp.length<4)continue;
    let A={x:kp[0].x*W,y:kp[0].y*H},B={x:kp[1].x*W,y:kp[1].y*H};if(A.x>B.x)[A,B]=[B,A];
    const ed=Math.hypot(B.x-A.x,B.y-A.y);if(ed<4)continue;
    now.push({ex:(A.x+B.x)/2,ey:(A.y+B.y)/2,ang:Math.atan2(B.y-A.y,B.x-A.x),k:ed/100,nx:kp[2].x*W,ny:kp[2].y*H,mx:kp[3].x*W,my:kp[3].y*H,
      bx:b.originX/s,by:b.originY/s,bw:b.width/s,bh:b.height/s,seen:t});
  }
  const m=fcMem.get(p),cont=m&&!fxPreview&&t>=m.t&&t-m.t<.25;let out=now;
  if(cont){
    out=now.map(f=>{let best=null,bd=1e9;for(const o of m.faces){const dd=Math.hypot(o.ex-f.ex,o.ey-f.ey);if(dd<bd){bd=dd;best=o}}
      if(!best||bd>f.k*150)return f;
      const g={seen:t};for(const key of['ex','ey','k','nx','ny','mx','my','bx','by','bw','bh'])g[key]=fcLerp(best[key],f[key],.55);g.ang=fcAngLerp(best.ang,f.ang,.55);return g});
    // visage perdu un instant (main devant, tête qui tourne) : on le garde 0,3 s
    for(const o of m.faces)if(t-o.seen<.3&&!out.some(f=>Math.hypot(o.ex-f.ex,o.ey-f.ey)<o.k*150))out.push(o);
  }
  fcMem.set(p,{t,faces:out});
  return out;
}
/** point de l'image → repère du visage */
function fcLocal(f,x,y){const dx=(x-f.ex)/f.k,dy=(y-f.ey)/f.k,c=Math.cos(-f.ang),s=Math.sin(-f.ang);return{x:dx*c-dy*s,y:dx*s+dy*c}}
/** point du repère du visage → image */
function fcImg(f,x,y){const c=Math.cos(f.ang),s=Math.sin(f.ang);return{x:f.ex+(x*c-y*s)*f.k,y:f.ey+(x*s+y*c)*f.k}}
function fcGrad(g,x0,y0,x1,y1,stops){const gr=g.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));return gr}

/* ---------- accessoires (dessinés dans le repère du visage) ---------- */
function fcLens(g,x,y,w,h,r){g.beginPath();g.roundRect(x-w/2,y-h/2,w,h,r)}
function fcSunglasses(g){
  g.lineJoin='round';
  for(const sx of[-1,1]){
    fcLens(g,sx*53,8,88,62,24);g.fillStyle=fcGrad(g,0,-24,0,40,['rgba(24,24,38,.95)','rgba(58,58,86,.93)']);g.fill();
    g.save();g.clip();g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(sx*53-40,-30);g.lineTo(sx*53-14,-30);g.lineTo(sx*53-48,40);g.lineTo(sx*53-74,40);g.closePath();g.fill();g.restore();
    fcLens(g,sx*53,8,88,62,24);g.strokeStyle='#0b0b12';g.lineWidth=7;g.stroke();
  }
  g.beginPath();g.moveTo(-10,0);g.quadraticCurveTo(0,-9,10,0);g.stroke();
  g.beginPath();g.moveTo(-97,0);g.lineTo(-122,-6);g.moveTo(97,0);g.lineTo(122,-6);g.stroke();
}
function fcHeartGlasses(g){
  for(const sx of[-1,1]){
    heartPath(g,sx*54,14,104);g.fillStyle=fcGrad(g,0,-40,0,50,['rgba(255,77,141,.9)','rgba(255,158,196,.88)']);g.fill();
    g.save();g.clip();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(sx*54-18,-14,14,8,-.5,0,TAU);g.fill();g.restore();
    heartPath(g,sx*54,14,104);g.strokeStyle='#fff';g.lineWidth=6;g.stroke();
  }
  g.beginPath();g.moveTo(-14,-2);g.quadraticCurveTo(0,-10,14,-2);g.stroke();
}
function fcPixelGlasses(g){
  // lunettes « 8 bits » : une grille de carrés noirs, deux reflets blancs
  const c=9,on=(r,k)=>r===0||(r===1&&k>=10&&k<=13)||(r>=1&&r<=3&&((k>=1&&k<=9)||(k>=14&&k<=22)))||(r===4&&((k>=2&&k<=8)||(k>=15&&k<=21)));
  const wht=(r,k)=>(r===1&&(k===2||k===3||k===15||k===16))||(r===2&&(k===3||k===16));
  for(let r=0;r<5;r++)for(let k=0;k<24;k++)if(on(r,k)){g.fillStyle=wht(r,k)?'#fff':'#060608';g.fillRect(-12*c+k*c-.4,-1.6*c+r*c-.4,c+.8,c+.8)}
}
function fcCrown(g){
  const pk=[[-86,-238],[-64,-198],[-43,-256],[-21,-198],[0,-276],[21,-198],[43,-256],[64,-198],[86,-238]];
  g.beginPath();g.moveTo(-86,-150);for(const[x,y]of pk)g.lineTo(x,y);g.lineTo(86,-150);g.closePath();
  g.fillStyle=fcGrad(g,0,-276,0,-150,['#fef3c7','#fbbf24','#d97706']);g.fill();g.strokeStyle='#92400e';g.lineWidth=4;g.lineJoin='round';g.stroke();
  g.fillStyle='rgba(146,64,14,.35)';g.fillRect(-86,-176,172,6);
  [['#ef4444',-52],['#3b82f6',0],['#22c55e',52]].forEach(([col,x])=>{g.beginPath();g.arc(x,-163,9,0,TAU);g.fillStyle=col;g.fill();g.strokeStyle='#fff7';g.lineWidth=2;g.stroke()});
  for(const[x,y]of[pk[0],pk[2],pk[4],pk[6],pk[8]]){g.beginPath();g.arc(x,y-4,7,0,TAU);g.fillStyle='#fef9c3';g.fill()}
}
function fcHalo(g,t){
  const y=-250+Math.sin(t*2.2)*7;g.save();g.shadowColor='#facc15';g.shadowBlur=24*(g.getTransform().a||1);
  g.beginPath();g.ellipse(0,y,82,20,0,0,TAU);g.strokeStyle='#fde68a';g.lineWidth=11;g.stroke();g.lineWidth=4;g.strokeStyle='#fffbeb';g.stroke();g.restore();
}
function fcEars(g,t,kind){
  for(const sx of[-1,1]){
    g.save();
    if(kind==='bunny'){
      g.translate(sx*42,-205);g.rotate(sx*.16+Math.sin(t*3+sx)*.05);
      g.beginPath();g.ellipse(0,-90,31,98,0,0,TAU);g.fillStyle='#fafafa';g.fill();g.strokeStyle='#d4d4d8';g.lineWidth=4;g.stroke();
      g.beginPath();g.ellipse(0,-84,15,72,0,0,TAU);g.fillStyle='#f9a8d4';g.fill();
    }else if(kind==='devil'){
      g.beginPath();g.moveTo(sx*38,-178);g.quadraticCurveTo(sx*48,-232,sx*96,-268);g.quadraticCurveTo(sx*78,-222,sx*78,-168);g.closePath();
      g.fillStyle=fcGrad(g,0,-268,0,-168,['#fca5a5','#dc2626','#7f1d1d']);g.fill();g.strokeStyle='#450a0a';g.lineWidth=3;g.stroke();
    }else{ // chat
      g.beginPath();g.moveTo(sx*38,-182);g.lineTo(sx*104,-288);g.lineTo(sx*120,-160);g.closePath();g.fillStyle='#3f3f46';g.fill();g.strokeStyle='#18181b';g.lineWidth=4;g.lineJoin='round';g.stroke();
      g.beginPath();g.moveTo(sx*60,-188);g.lineTo(sx*101,-258);g.lineTo(sx*108,-180);g.closePath();g.fillStyle='#f9a8d4';g.fill();
    }
    g.restore();
  }
}
function fcCatFace(g,f){
  const n=fcLocal(f,f.nx,f.ny);
  g.beginPath();g.moveTo(n.x-15,n.y-6);g.lineTo(n.x+15,n.y-6);g.quadraticCurveTo(n.x+4,n.y+12,n.x,n.y+12);g.quadraticCurveTo(n.x-4,n.y+12,n.x-15,n.y-6);g.closePath();
  g.fillStyle='#f472b6';g.fill();g.strokeStyle='#1f1f23';g.lineWidth=2.5;g.stroke();
  g.strokeStyle='rgba(20,20,24,.85)';g.lineWidth=3;g.lineCap='round';
  for(const sx of[-1,1])for(let i=0;i<3;i++){g.beginPath();g.moveTo(n.x+sx*24,n.y+6+i*8);g.lineTo(n.x+sx*108,n.y-10+i*17);g.stroke()}
}
function fcBunnyNose(g,f){const n=fcLocal(f,f.nx,f.ny);g.beginPath();g.ellipse(n.x,n.y,13,9,0,0,TAU);g.fillStyle='#f9a8d4';g.fill();g.strokeStyle='#be185d';g.lineWidth=2;g.stroke()}
function fcPartyHat(g){
  g.save();g.rotate(.18);
  g.beginPath();g.moveTo(-62,-170);g.lineTo(0,-345);g.lineTo(62,-170);g.closePath();g.save();g.clip();
  g.fillStyle='#22d3ee';g.fillRect(-70,-350,140,185);g.fillStyle='#a78bfa';
  for(let i=-6;i<6;i++){g.beginPath();g.moveTo(i*30,-170);g.lineTo(i*30+16,-170);g.lineTo(i*30+96,-350);g.lineTo(i*30+80,-350);g.closePath();g.fill()}
  g.fillStyle='#fde047';for(const[x,y]of[[-22,-210],[18,-240],[-6,-280],[30,-195]]){g.beginPath();g.arc(x,y,6,0,TAU);g.fill()}
  g.restore();g.strokeStyle='#0e7490';g.lineWidth=3;g.stroke();
  g.beginPath();g.moveTo(-66,-170);for(let i=0;i<=12;i++)g.lineTo(-66+i*11,-170+(i%2?-10:0));g.strokeStyle='#f472b6';g.lineWidth=6;g.stroke();
  g.beginPath();g.arc(0,-350,18,0,TAU);g.fillStyle='#f472b6';g.fill();g.restore();
}
function fcFlowers(g,t){
  const C=['#f9a8d4','#fde68a','#c4b5fd','#fca5a5','#a7f3d0'];
  for(let i=0;i<9;i++){
    const an=Math.PI*(1.12+i*.095),x=Math.cos(an)*138,y=-150+Math.sin(an)*62;
    g.save();g.translate(x,y);g.rotate(an);g.fillStyle='#4ade80';g.beginPath();g.ellipse(0,20,7,15,0,0,TAU);g.fill();g.restore();
  }
  for(let i=0;i<9;i++){
    const an=Math.PI*(1.07+i*.108),x=Math.cos(an)*138,y=-150+Math.sin(an)*62,r=i%2?15:19;
    g.save();g.translate(x,y);g.rotate(t*.3+i);g.fillStyle=C[i%C.length];
    for(let k=0;k<5;k++){const a2=k/5*TAU;g.beginPath();g.arc(Math.cos(a2)*r*.62,Math.sin(a2)*r*.62,r*.55,0,TAU);g.fill()}
    g.beginPath();g.arc(0,0,r*.36,0,TAU);g.fillStyle='#facc15';g.fill();g.restore();
  }
}
function fcBlush(g,a){
  for(const sx of[-1,1]){const gr=g.createRadialGradient(sx*64,64,2,sx*64,64,36);gr.addColorStop(0,'rgba(255,92,138,'+(.32+.4*a)+')');gr.addColorStop(1,'rgba(255,92,138,0)');
    g.fillStyle=gr;g.beginPath();g.ellipse(sx*64,64,40,26,0,0,TAU);g.fill()}
}
function fcHeartsOrbit(g,t){
  const L=[];for(let i=0;i<6;i++){const an=t*1.5+i*TAU/6;L.push({x:Math.cos(an)*150,y:-205+Math.sin(an)*40,z:Math.sin(an),i})}
  L.sort((p,q)=>p.z-q.z);
  for(const h of L){g.globalAlpha=.5+.5*(h.z+1)/2;heartPath(g,h.x,h.y,40+14*h.z);g.fillStyle=['#ff4d6d','#ff8fab','#f43f5e'][h.i%3];g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke()}
  g.globalAlpha=1;
}
function fcDizzy(g,t){
  const L=[];for(let i=0;i<5;i++){const an=t*3.2+i*TAU/5;L.push({x:Math.cos(an)*98,y:-222+Math.sin(an)*22,z:Math.sin(an)})}
  L.sort((p,q)=>p.z-q.z);
  for(const s of L){g.globalAlpha=.6+.4*(s.z+1)/2;starPath(g,s.x,s.y,16+5*s.z,5);g.fillStyle='#fde047';g.fill();g.strokeStyle='#ca8a04';g.lineWidth=3;g.stroke()}
  g.globalAlpha=1;
}
function fcSpark(g,x,y,r){g.beginPath();for(let i=0;i<8;i++){const an=i*Math.PI/4,rr=i%2?r*.22:r;g.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr)}g.closePath();g.fill()}
function fcSparkleEyes(g,t){
  g.save();g.fillStyle='#fff';g.shadowColor='#fff';g.shadowBlur=14*(g.getTransform().a||1);
  for(const sx of[-1,1]){fcSpark(g,sx*50+sx*14,-14,26*(.8+.3*Math.sin(t*6+sx)));fcSpark(g,sx*50+sx*42,-38,11*(.6+.5*Math.sin(t*7+sx*2)));fcSpark(g,sx*50-sx*30,26,8*(.5+.5*Math.sin(t*5+sx*3)))}
  g.restore();
}
function fcMustache(g,f){
  const n=fcLocal(f,f.nx,f.ny),m=fcLocal(f,f.mx,f.my),y=n.y+(m.y-n.y)*.45,x=(n.x+m.x)/2;
  g.save();g.translate(x,y);g.fillStyle='#3b2416';g.beginPath();
  g.moveTo(0,-6);g.bezierCurveTo(-18,-18,-48,-16,-60,0);g.bezierCurveTo(-70,10,-84,4,-82,-10);g.bezierCurveTo(-84,14,-58,22,-34,12);g.bezierCurveTo(-18,8,-8,4,0,6);
  g.bezierCurveTo(8,4,18,8,34,12);g.bezierCurveTo(58,22,84,14,82,-10);g.bezierCurveTo(84,4,70,10,60,0);g.bezierCurveTo(48,-16,18,-18,0,-6);g.closePath();g.fill();g.restore();
}
function fcRedNose(g,f){
  const n=fcLocal(f,f.nx,f.ny),gr=g.createRadialGradient(n.x-7,n.y-12,3,n.x,n.y-4,26);
  gr.addColorStop(0,'#fecaca');gr.addColorStop(.35,'#ef4444');gr.addColorStop(1,'#991b1b');g.beginPath();g.arc(n.x,n.y-4,24,0,TAU);g.fillStyle=gr;g.fill();
}
/* Halloween (v4.67.2) : chapeau de sorcière, crocs de vampire, maquillage squelette, tête de citrouille */
function fcWitchHat(g){
  g.save();g.rotate(-.08);g.lineJoin='round';
  // cône pointu un peu tordu, puis le bord par-dessus, le ruban orange et la boucle dorée
  g.beginPath();g.moveTo(-98,-176);g.quadraticCurveTo(-60,-280,-10,-360);g.quadraticCurveTo(14,-410,74,-425);g.quadraticCurveTo(42,-398,36,-358);g.quadraticCurveTo(62,-270,98,-176);g.closePath();
  g.fillStyle=fcGrad(g,-90,0,90,0,['#2e1650','#4c1d95','#2a1247']);g.fill();g.strokeStyle='#0d0618';g.lineWidth=4;g.stroke();
  g.beginPath();g.ellipse(0,-168,178,34,0,0,TAU);g.fillStyle=fcGrad(g,0,-202,0,-134,['#3b1d5e','#1a0b2e']);g.fill();g.stroke();
  g.beginPath();g.moveTo(-94,-196);g.quadraticCurveTo(0,-176,94,-196);g.lineTo(90,-224);g.quadraticCurveTo(0,-204,-88,-224);g.closePath();g.fillStyle='#f97316';g.fill();
  g.fillStyle='#fbbf24';g.fillRect(-20,-228,40,34);g.fillStyle='#4c1d95';g.fillRect(-11,-220,22,18);
  g.restore();
}
function fcFangs(g,f){
  const m=fcLocal(f,f.mx,f.my),y=m.y-8;
  for(const sx of[-1,1]){const x=m.x+sx*20;g.beginPath();g.moveTo(x-9,y);g.lineTo(x+9,y);g.quadraticCurveTo(x+3,y+16,x+sx*2,y+35);g.quadraticCurveTo(x-4,y+16,x-9,y);g.closePath();
    g.fillStyle=fcGrad(g,0,y,0,y+35,['#ffffff','#e5e7eb']);g.fill();g.strokeStyle='rgba(60,60,70,.55)';g.lineWidth=2;g.stroke()}
}
function fcSkull(g,f,a){
  const n=fcLocal(f,f.nx,f.ny),m=fcLocal(f,f.mx,f.my),dark='rgba(8,8,12,';
  g.save();
  // teint pâle
  g.save();g.translate(0,42);g.scale(1,145/112);const gr=g.createRadialGradient(0,0,40,0,0,112);gr.addColorStop(0,'rgba(245,245,250,'+(.3+.25*a)+')');gr.addColorStop(.75,'rgba(245,245,250,'+(.18+.15*a)+')');gr.addColorStop(1,'rgba(245,245,250,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,112,0,TAU);g.fill();g.restore();
  // orbites
  for(const sx of[-1,1]){const r=g.createRadialGradient(sx*50,4,8,sx*50,4,44);r.addColorStop(0,dark+'.95)');r.addColorStop(.7,dark+'.85)');r.addColorStop(1,dark+'0)');g.fillStyle=r;g.beginPath();g.ellipse(sx*50,4,44,40,0,0,TAU);g.fill()}
  // nez en cœur à l'envers
  g.fillStyle=dark+'.92)';g.beginPath();g.moveTo(n.x,n.y-18);g.quadraticCurveTo(n.x-14,n.y+6,n.x-4,n.y+8);g.lineTo(n.x,n.y+2);g.lineTo(n.x+4,n.y+8);g.quadraticCurveTo(n.x+14,n.y+6,n.x,n.y-18);g.fill();
  // dents cousues sur la bouche
  g.strokeStyle=dark+'.9)';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(m.x-62,m.y-2);g.quadraticCurveTo(m.x,m.y+10,m.x+62,m.y-2);
  for(let k=-5;k<=5;k++){const x=m.x+k*11,yy=m.y+4-Math.abs(k)*.4;g.moveTo(x,yy-11);g.lineTo(x,yy+11)}g.stroke();
  // joues creuses
  for(const sx of[-1,1]){const r=g.createRadialGradient(sx*78,70,4,sx*78,70,40);r.addColorStop(0,'rgba(20,20,30,'+(.35*a+.15)+')');r.addColorStop(1,'rgba(20,20,30,0)');g.fillStyle=r;g.fillRect(sx*78-40,30,80,80)}
  g.restore();
}
function fcPumpkinHead(g,t){hwPumpkin(g,0,52,168,.6+.25*Math.sin(t*11)+.15*hash(Math.floor(t*12)))}

/* ---------- retouches de l'image autour du visage ---------- */
/** grossit le disque (cx, cy, R) comme une loupe déformante, sans bord net (anneaux de plus en plus agrandis) */
function fcBulge(cx,cy,R,z){
  R=Math.max(4,R);const D=Math.ceil(R*2)+2,x0=cx-R-1,y0=cy-R-1;
  if(fcTmp.width<D||fcTmp.height<D){fcTmp.width=Math.max(fcTmp.width,D);fcTmp.height=Math.max(fcTmp.height,D)}
  fcTmpCtx.clearRect(0,0,D,D);fcTmpCtx.drawImage(ctx.canvas,x0,y0,D,D,0,0,D,D);
  const N=12;
  for(let i=0;i<N;i++){
    const rd=R*(1-i/N),u=rd/R,rs=rd*(1-z*(1-u)*(1-u)),sc=rd/Math.max(1e-3,rs);
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,rd,0,TAU);ctx.clip();ctx.translate(cx,cy);ctx.scale(sc,sc);ctx.drawImage(fcTmp,0,0,D,D,x0-cx,y0-cy,D,D);ctx.restore();
  }
}
/** zone du visage (ellipse) retouchée : kind = smooth (peau lisse) | blur (flou) | pixel (mosaïque) */
function fcFaceZone(f,kind,a){
  const c=fcImg(f,0,42),rx=f.k*118,ry=f.k*150,D=Math.ceil(Math.max(rx,ry)*2)+4,x0=c.x-D/2,y0=c.y-D/2;
  if(fcTmp.width<D||fcTmp.height<D){fcTmp.width=Math.max(fcTmp.width,D);fcTmp.height=Math.max(fcTmp.height,D)}
  const g=fcTmpCtx;g.save();g.clearRect(0,0,D,D);
  if(kind==='pixel'){const b=Math.max(2,f.k*(16-8*a)),sw=Math.max(1,Math.round(D/b));g.imageSmoothingEnabled=false;g.drawImage(ctx.canvas,x0,y0,D,D,0,0,sw,sw);g.drawImage(fcTmp,0,0,sw,sw,0,0,D,D);g.imageSmoothingEnabled=true}
  else{g.filter=kind==='blur'?'blur('+Math.max(2,f.k*(10+16*a))+'px)':'blur('+Math.max(1,f.k*(2+3*a))+'px) brightness(1.05) saturate(1.06)';g.drawImage(ctx.canvas,x0,y0,D,D,0,0,D,D);g.filter='none'}
  // forme du visage : ovale tourné comme la tête, bord fondu (net pour la mosaïque)
  g.globalCompositeOperation='destination-in';g.translate(D/2,D/2);g.rotate(f.ang);g.scale(1,ry/rx);
  if(kind==='pixel'){g.beginPath();g.arc(0,0,rx,0,TAU);g.fillStyle='#000';g.fill()}
  else{const gr=g.createRadialGradient(0,0,rx*.55,0,0,rx);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(-rx,-rx,rx*2,rx*2)}
  g.setTransform(1,0,0,1,0,0);
  if(kind==='smooth'){ // les yeux et la bouche restent nets
    g.globalCompositeOperation='destination-out';
    for(const p of[fcImg(f,-50,0),fcImg(f,50,0),{x:f.mx,y:f.my}]){const q={x:p.x-x0,y:p.y-y0},r=f.k*30,gr=g.createRadialGradient(q.x,q.y,r*.4,q.x,q.y,r);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(q.x-r,q.y-r,r*2,r*2)}
  }
  g.restore();
  ctx.save();ctx.globalAlpha=kind==='smooth'?.45+.4*a:1;ctx.drawImage(fcTmp,0,0,D,D,x0,y0,D,D);ctx.restore();
}

/* ---------- tout l'effet « Visage » d'un clip ---------- */
function faceFX(p,fx,t,a){
  const faces=faceFind(p,t);if(!faces||!faces.length)return;
  for(const f of faces){
    if(fx.fcsmooth)fcFaceZone(f,'smooth',a);
    if(fx.fcbighead){const c=fcImg(f,0,30);fcBulge(c.x,c.y,f.k*180,.3+.22*a)}
    if(fx.fcbigeyes)for(const sx of[-1,1]){const c=fcImg(f,sx*50,2);fcBulge(c.x,c.y,f.k*46,.4+.2*a)}
    if(fx.fcblur)fcFaceZone(f,'blur',a);
    if(fx.fcpixel)fcFaceZone(f,'pixel',a);
    const any=FACE_FX.some(k=>fx[k]&&!['fcsmooth','fcbighead','fcbigeyes','fcblur','fcpixel','fczoom'].includes(k));
    if(!any)continue;
    const sz=.82+.36*a;
    ctx.save();ctx.translate(f.ex,f.ey);ctx.rotate(f.ang);ctx.scale(f.k,f.k);
    if(fx.fcblush)fcBlush(ctx,a);
    if(fx.fcskull)fcSkull(ctx,f,a);
    if(fx.fcpumpkin)fcPumpkinHead(ctx,t);
    // accessoires du haut de la tête : posés sur les cheveux (un peu plus bas que le haut du cadre du visage)
    ctx.save();ctx.translate(0,46);ctx.scale(sz,sz);
    if(fx.fcwitch)fcWitchHat(ctx);
    if(fx.fchalo)fcHalo(ctx,t);
    if(fx.fchearts)fcHeartsOrbit(ctx,t);
    if(fx.fcdizzy)fcDizzy(ctx,t);
    if(fx.fccat)fcEars(ctx,t,'cat');
    if(fx.fcbunny)fcEars(ctx,t,'bunny');
    if(fx.fcdevil)fcEars(ctx,t,'devil');
    if(fx.fcflowers)fcFlowers(ctx,t);
    if(fx.fcparty)fcPartyHat(ctx);
    if(fx.fccrown)fcCrown(ctx);
    ctx.restore();
    if(fx.fccat)fcCatFace(ctx,f);
    if(fx.fcbunny)fcBunnyNose(ctx,f);
    if(fx.fcmustache)fcMustache(ctx,f);
    if(fx.fcvampire)fcFangs(ctx,f);
    if(fx.fcnose)fcRedNose(ctx,f);
    if(fx.fcglasses)fcSunglasses(ctx);
    if(fx.fcheartgl)fcHeartGlasses(ctx);
    if(fx.fcpixelgl)fcPixelGlasses(ctx);
    if(fx.fcsparkle)fcSparkleEyes(ctx,t);
    ctx.restore();
  }
  // zoom qui suit le visage (le plus grand), sans jamais sortir de l'image
  if(fx.fczoom){
    const f=faces.reduce((x,y)=>y.k>x.k?y:x),c=fcImg(f,0,30),z=1+.6*a,hw=W/z/2,hh=H/z/2;
    const cx=Math.min(W-hw,Math.max(hw,c.x)),cy=Math.min(H-hh,Math.max(hh,c.y));
    ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-cx,-cy);ctx.drawImage(ctx.canvas,0,0);ctx.restore();
  }
}

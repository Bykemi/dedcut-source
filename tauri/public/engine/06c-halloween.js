/* ---------- effets « Halloween » (v4.67.2) : chauves-souris, fantômes, citrouilles, araignées, pleine lune, brume, bonbons,
   slime, yeux dans le noir, lueur de bougie, hanté, zombie. Tous les dessins sont faits ici par DedCut (formes en code,
   rien de repris d'autres applis). hwFX est appelé par applyFX (06-render.js) ; la tête de citrouille du visage
   (06b-face.js) réutilise hwPumpkin. ---------- */
const HW_FX=FX_CATS.halloween;
Object.assign(FXN,Object.fromEntries(HW_FX.map(k=>[k,'fx.'+k])));
FXCATN.halloween='fxcat.halloween';
/* période d'Halloween (1er octobre → 2 novembre) : la catégorie passe en tête des listes d'effets et de filtres */
function hwSeason(d=new Date()){const m=d.getMonth();return m===9||(m===10&&d.getDate()<=2)}
const hwOrder=keys=>hwSeason()&&keys.includes('halloween')?['halloween',...keys.filter(k=>k!=='halloween')]:keys;

/* ---------- dessins ---------- */
/** chauve-souris de demi-envergure s ; w = battement des ailes (1 = en haut, négatif = en bas) */
function hwBat(g,x,y,s,w){
  g.save();g.translate(x,y);
  for(const sx of[1,-1]){g.save();g.scale(sx*s,w*s);g.beginPath();g.moveTo(.06,-.04);g.quadraticCurveTo(.45,-.5,1,-.24);g.quadraticCurveTo(.86,-.04,.76,.12);
    g.quadraticCurveTo(.63,-.01,.51,.14);g.quadraticCurveTo(.39,.02,.27,.17);g.quadraticCurveTo(.16,.07,.05,.13);g.closePath();g.restore();g.fill()}
  g.beginPath();g.ellipse(0,.03*s,.11*s,.21*s,0,0,TAU);g.fill();g.beginPath();g.arc(0,-.17*s,.09*s,0,TAU);g.fill();
  g.beginPath();g.moveTo(-.08*s,-.2*s);g.lineTo(-.06*s,-.34*s);g.lineTo(-.01*s,-.23*s);g.lineTo(.01*s,-.23*s);g.lineTo(.06*s,-.34*s);g.lineTo(.08*s,-.2*s);g.closePath();g.fill();
  g.fillStyle='rgba(255,110,50,.9)';for(const sx of[-1,1]){g.beginPath();g.arc(sx*.035*s,-.18*s,.02*s,0,TAU);g.fill()}
  g.restore();
}
/** petit fantôme : tête ronde de rayon s, bas ondulé (ph fait onduler), al = opacité */
function hwGhost(g,x,y,s,ph,al){
  g.save();g.globalAlpha=al;
  const gr=g.createLinearGradient(0,y-s,0,y+s*1.4);gr.addColorStop(0,'rgba(255,255,255,.96)');gr.addColorStop(1,'rgba(205,225,255,.6)');
  g.fillStyle=gr;g.shadowColor='rgba(190,220,255,.9)';g.shadowBlur=s*.5;
  g.beginPath();g.moveTo(x-s,y);g.arc(x,y,s,Math.PI,0);g.lineTo(x+s,y+s*1.2);
  for(let j=0;j<4;j++){const x0=x+s-j*s/2,x1=x0-s/2,yy=y+s*1.2+Math.sin(ph+j*1.9)*s*.1;g.quadraticCurveTo((x0+x1)/2,yy+(j%2?-.25:.3)*s,x1,yy)}
  g.closePath();g.fill();g.shadowBlur=0;
  g.fillStyle='#1d1530';
  for(const sx of[-1,1]){g.beginPath();g.ellipse(x+sx*s*.36,y-s*.02,s*.15,s*.23,0,0,TAU);g.fill()}
  g.beginPath();g.ellipse(x,y+s*.48,s*.13,s*.19+Math.sin(ph*1.3)*s*.04,0,0,TAU);g.fill();
  g.restore();
}
/** citrouille creusée, éclairée de l'intérieur : s ≈ rayon, f = éclat de la bougie (0 → 1) */
function hwPumpkin(g,x,y,s,f){
  g.save();
  const lobe=(dx,rx,c1,c2)=>{const gr=g.createLinearGradient(0,y-s*.8,0,y+s*.8);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.beginPath();g.ellipse(x+dx*s,y,rx*s,s*.8,0,0,TAU);g.fill()};
  lobe(-.5,.5,'#ea580c','#9a3412');lobe(.5,.5,'#ea580c','#9a3412');lobe(-.24,.52,'#f97316','#c2410c');lobe(.24,.52,'#f97316','#c2410c');lobe(0,.44,'#fb923c','#ea580c');
  g.fillStyle='rgba(255,255,255,.13)';g.beginPath();g.ellipse(x-s*.22,y-s*.42,s*.16,s*.08,-.4,0,TAU);g.fill();
  g.fillStyle='#4d7c0f';g.beginPath();g.moveTo(x-s*.09,y-s*.72);g.quadraticCurveTo(x-s*.04,y-s*1.02,x+s*.2,y-s*1.08);g.lineTo(x+s*.14,y-s*.95);
  g.quadraticCurveTo(x+s*.05,y-s*.9,x+s*.09,y-s*.72);g.closePath();g.fill();
  // yeux, nez et bouche creusés : la lumière de la bougie passe à travers
  g.fillStyle='rgb(255,'+Math.round(190+50*f)+','+Math.round(60+90*f)+')';g.shadowColor='rgba(255,170,40,'+(.6+.4*f)+')';g.shadowBlur=s*.25;
  g.beginPath();g.moveTo(x-s*.46,y-s*.08);g.lineTo(x-s*.27,y-s*.4);g.lineTo(x-s*.1,y-s*.06);g.closePath();
  g.moveTo(x+s*.46,y-s*.08);g.lineTo(x+s*.27,y-s*.4);g.lineTo(x+s*.1,y-s*.06);g.closePath();
  g.moveTo(x-s*.07,y+s*.06);g.lineTo(x,y-s*.07);g.lineTo(x+s*.07,y+s*.06);g.closePath();g.fill();
  g.beginPath();g.moveTo(x-s*.55,y+s*.18);g.quadraticCurveTo(x,y+s*.72,x+s*.55,y+s*.18);
  for(const[px,py]of[[.4,.3],[.3,.21],[.18,.36],[.06,.26],[-.06,.37],[-.18,.26],[-.3,.36],[-.4,.24]])g.lineTo(x+px*s,y+py*s);
  g.closePath();g.fill();
  g.restore();
}
/** toile d'araignée dans un coin (cx, cy) : rayons de a0 à a0 + 90°, fils qui pendent un peu entre deux rayons */
function hwWeb(g,cx,cy,a0,R){
  const A=[0,1,2,3,4,5].map(k=>a0+k*Math.PI/10),P=(r,an)=>[cx+Math.cos(an)*r,cy+Math.sin(an)*r];
  g.beginPath();for(const an of A){const p=P(R,an);g.moveTo(cx,cy);g.lineTo(p[0],p[1])}
  for(let r=R*.18;r<R;r+=R*.17)A.forEach((an,k)=>{const p=P(r,an);if(!k){g.moveTo(p[0],p[1]);return}const c=P(r*.86,an-Math.PI/20);g.quadraticCurveTo(c[0],c[1],p[0],p[1])});
  g.stroke();
}
/** araignée (corps de rayon s), pattes qui bougent un peu */
function hwSpider(g,x,y,s,t){
  g.save();g.translate(x,y);g.strokeStyle='#0c0a10';g.lineWidth=Math.max(1,s*.16);g.lineCap='round';g.lineJoin='round';
  for(const sx of[-1,1])for(let k=0;k<4;k++){const an=-.75+k*.42+Math.sin(t*6+k+sx)*.08,L=s*(1.7+(k===1||k===2?.3:0));
    g.beginPath();g.moveTo(sx*s*.3,0);g.lineTo(sx*Math.cos(an)*L*.55,Math.sin(an)*L*.55-s*.5);g.lineTo(sx*Math.cos(an)*L,Math.sin(an)*L*.9+s*.3);g.stroke()}
  g.fillStyle='#0c0a10';g.beginPath();g.ellipse(0,s*.25,s*.62,s*.75,0,0,TAU);g.fill();g.beginPath();g.arc(0,-s*.55,s*.38,0,TAU);g.fill();
  g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.ellipse(-s*.2,s*.02,s*.15,s*.25,-.4,0,TAU);g.fill();
  g.fillStyle='#ef4444';for(const sx of[-1,1]){g.beginPath();g.arc(sx*s*.14,-s*.62,s*.09,0,TAU);g.fill()}
  g.restore();
}
const HW_CANDY=['#f97316','#a855f7','#22c55e','#facc15','#ef4444'];
/** bonbon en grain de maïs : pointe blanche, milieu orange, base jaune */
function hwCandyCorn(g,s){
  g.beginPath();g.moveTo(0,-s);g.quadraticCurveTo(s*.62,s*.2,s*.55,s*.7);g.quadraticCurveTo(0,s*.95,-s*.55,s*.7);g.quadraticCurveTo(-s*.62,s*.2,0,-s);g.closePath();
  g.save();g.clip();g.fillStyle='#fef9c3';g.fillRect(-s,-s,2*s,s*.75);g.fillStyle='#f97316';g.fillRect(-s,-s*.25,2*s,s*.55);g.fillStyle='#facc15';g.fillRect(-s,s*.3,2*s,s*.8);g.restore();
}
/** bonbon emballé (papier tortillé aux deux bouts, rayures) */
function hwWrapped(g,s,c){
  g.fillStyle=c;g.beginPath();
  for(const sx of[-1,1]){g.moveTo(sx*s*.5,0);g.lineTo(sx*s*1.15,-s*.45);g.lineTo(sx*s*1.02,0);g.lineTo(sx*s*1.15,s*.45);g.closePath()}
  g.fill();g.beginPath();g.arc(0,0,s*.58,0,TAU);g.fill();
  g.save();g.clip();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=s*.16;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*s*.35-s*.4,-s);g.lineTo(k*s*.35+s*.4,s);g.stroke()}g.restore();
}

/* ---------- l'effet, image par image (a = intensité 0 → 1, u = échelle, n0 = nombre selon l'intensité) ---------- */
function hwFX(fx,t,a,u,n0){
  if(!HW_FX.some(k=>fx[k]))return;
  const cvs=ctx.canvas,S=Math.max(W,H),pv=fxPreview;
  // 1) l'image elle-même : zombie, hanté, bougie, yeux dans le noir (assombrit)
  if(fx.hwzombie){ctx.save();ctx.globalAlpha=.55+.45*a;ctx.filter='saturate(.45) sepia(.35) hue-rotate(48deg) contrast(1.18) brightness(.9)';
    const k=Math.floor(t*10),j=hash(k*7)<.15?(hash(k)-.5)*10*u:0;ctx.drawImage(cvs,j,0);ctx.filter='none';ctx.globalAlpha=1;
    ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba(150,190,110,'+(.35*a)+')';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';
    const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,S*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(5,12,0,'+(.55*a+.1)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
  if(fx.hwhaunted){ctx.save();ctx.filter='grayscale(.55) brightness(.92)';ctx.drawImage(cvs,0,0);ctx.filter='none';
    const dx=Math.sin(t*.7)*W*.03*a+W*.012,dy=Math.cos(t*.53)*H*.015*a;ctx.globalCompositeOperation='screen';ctx.globalAlpha=.22+.2*a;
    ctx.filter='grayscale(1) brightness(1.25) sepia(.3) hue-rotate(150deg)';ctx.drawImage(cvs,dx,dy);ctx.filter='none';ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    const k=Math.floor(t*8);if(hash(k*3)<.12+.1*a){ctx.fillStyle='rgba(0,0,0,'+(.25+.3*hash(k))+')';ctx.fillRect(0,0,W,H)}
    const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,S*.62);g.addColorStop(0,'rgba(10,15,30,0)');g.addColorStop(1,'rgba(10,15,30,'+(.6*a+.15)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
  if(fx.hwcandle){const f=.82+.1*Math.sin(t*13.7)+.08*Math.sin(t*7.1+1.3)+.06*(hash(Math.floor(t*15))-.5),cx=W*.5+Math.sin(t*3.1)*W*.01,cy=H*.78,R=S*(.55+.12*f);
    ctx.save();const g=ctx.createRadialGradient(cx,cy,R*.08,cx,cy,R);g.addColorStop(0,'rgba(20,8,0,0)');g.addColorStop(.4,'rgba(20,8,0,'+(.45*a)+')');g.addColorStop(1,'rgba(8,3,0,'+(.85+.15*a)+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='screen';glowDot(cx,cy,R*.7,'255,150,50',(.32+.18*a)*f);
    ctx.globalCompositeOperation='overlay';ctx.fillStyle='rgba(255,140,40,'+(.18*a)+')';ctx.fillRect(0,0,W,H);ctx.restore()}
  if(fx.hweyes){ctx.save();const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.15,W/2,H/2,S*.65);g.addColorStop(0,'rgba(0,0,0,'+(.15*a)+')');g.addColorStop(1,'rgba(0,0,0,'+(.55+.35*a)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const C=['255,214,64','255,72,40','140,255,90'];
    for(let i=0,n=2+n0(6);i<n;i++){const an=hash(i*5)*TAU,rr=.33+hash(i*5+1)*.12,x=W/2+Math.cos(an)*W*rr,y=H/2+Math.sin(an)*H*rr*.95,cyc=5+hash(i*5+2)*4,ph=(t/cyc+hash(i*5+3))%1,vis=Math.min(1,ph*6,(1-ph)*6);
      if(vis<=0)continue;const bl=(t+hash(i*5+4)*3)%3.2<.14?.12:1,s=(9+hash(i*5+4)*8)*u*(pv?1.4:1),col=C[i%3];
      for(const sx of[-1,1]){const ex=x+sx*s*1.3;ctx.globalCompositeOperation='lighter';glowDot(ex,y,s*2.2,col,.35*vis);ctx.globalCompositeOperation='source-over';
        ctx.save();ctx.translate(ex,y);ctx.rotate(sx*.18);ctx.scale(1,bl);ctx.fillStyle='rgba('+col+','+(.95*vis)+')';ctx.beginPath();ctx.ellipse(0,0,s,s*.5,0,0,TAU);ctx.fill();
        ctx.fillStyle='rgba(0,0,0,'+(.9*vis)+')';ctx.beginPath();ctx.ellipse(0,0,s*.14,s*.44,0,0,TAU);ctx.fill();ctx.restore()}}
    ctx.restore()}
  // 2) le décor par-dessus
  if(fx.hwmoon){const R=Math.min(W,H)*(.11+.07*a),cx=W*.8,cy=H*.24;
    ctx.save();ctx.globalCompositeOperation='screen';glowDot(cx,cy,R*3.2,'255,225,170',.32+.2*a);ctx.restore();
    ctx.save();const g=ctx.createRadialGradient(cx-R*.3,cy-R*.3,R*.1,cx,cy,R);g.addColorStop(0,'#fffbeb');g.addColorStop(.7,'#fde9b8');g.addColorStop(1,'#f3cf8a');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fill();ctx.clip();
    ctx.fillStyle='rgba(180,140,80,.22)';for(const[dx,dy,r]of[[-.35,-.15,.2],[.25,.3,.15],[.3,-.35,.1],[-.1,.4,.12],[-.45,.25,.08]]){ctx.beginPath();ctx.arc(cx+dx*R,cy+dy*R,r*R,0,TAU);ctx.fill()}
    // nuages qui passent devant la lune
    ctx.filter='blur('+Math.max(1,R*.07).toFixed(1)+'px)';ctx.fillStyle='rgba(55,40,75,.26)';
    for(let i=0;i<3;i++){const p=(t*.03+hash(i*3))%1.6-.3,x=cx+(p-.5)*R*6,y=cy+(hash(i*3+1)-.5)*R*1.2;
      for(const[dx,dy,r]of[[0,0,.34],[.36,-.06,.28],[-.34,.04,.26],[.66,.04,.2],[-.6,.06,.18]]){ctx.beginPath();ctx.arc(x+dx*R,y+dy*R,r*R,0,TAU);ctx.fill()}}
    ctx.filter='none';
    ctx.restore();
    // une chauve-souris passe devant la lune de temps en temps
    const ph=(t%7)/7;if(ph<.45){const q=ph/.45;ctx.save();ctx.fillStyle='#0d0812';hwBat(ctx,cx-R*1.6+q*R*3.2,cy+Math.sin(q*9)*R*.15,R*.32,.25+.75*Math.sin(t*14));ctx.restore()}}
  if(fx.hwmist){ctx.save();
    const g=ctx.createLinearGradient(0,H*.45,0,H);g.addColorStop(0,'rgba(190,255,205,0)');g.addColorStop(1,'rgba(190,255,205,'+(.22+.2*a)+')');ctx.fillStyle=g;ctx.fillRect(0,H*.45,W,H*.55);
    for(let i=0;i<16;i++){const x=(((hash(i*4)+t*(.012+.02*hash(i*4+1))*(i%2?1:-1))%1.4+1.4)%1.4-.2)*W,y=(.68+hash(i*4+2)*.36)*H;
      glowDot(x,y,S*(.14+hash(i*4+3)*.16),i%3?'200,255,210':'215,195,255',(.2+.12*Math.sin(t*.7+i))*a+.1)}
    ctx.restore()}
  if(fx.hwspiders){ctx.save();const R=Math.min(W,H)*(.24+.12*a);ctx.strokeStyle='rgba(235,235,245,'+(.35+.3*a)+')';ctx.lineWidth=Math.max(1,1.2*u);
    hwWeb(ctx,0,0,0,R);hwWeb(ctx,W,0,Math.PI/2,R*.8);
    for(let i=0,n=1+n0(3);i<n;i++){const x=(.14+.72*hash(i*13))*W,yb=(.25+.4*hash(i*13+1))*H,y=yb+Math.sin(t*(.6+hash(i*13+2)*.5)+i*2)*H*.12,s=(7+hash(i*13+3)*7)*u*(pv?1.4:1);
      ctx.strokeStyle='rgba(235,235,245,.55)';ctx.lineWidth=Math.max(1,u*.8);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,y-s*.8);ctx.stroke();hwSpider(ctx,x,y,s,t)}
    ctx.restore()}
  if(fx.hwbats){ctx.save();ctx.fillStyle='#120a18';ctx.shadowColor='rgba(255,140,60,.55)';ctx.shadowBlur=6*u;
    for(let i=0,n=n0(14);i<n;i++){const sp=.05+hash(i*7+1)*.07,p=(hash(i*7)+t*sp)%1.3-.15,x=(i%2?p:1-p)*W,y=(.07+hash(i*7+2)*.5)*H+Math.sin(t*1.7+i*2)*H*.035,
      s=(18+hash(i*7+3)*30)*u,w=.25+.75*Math.sin(t*(12+hash(i*7+4)*6)+i*2);hwBat(ctx,x,y,s,w)}
    ctx.restore()}
  if(fx.hwghosts){for(let i=0,n=n0(7);i<n;i++){const sp=.045+hash(i*5+1)*.05,q=(hash(i*5+2)+t*sp)%1.25,y=(1.15-q)*H,x=(hash(i*5)+Math.sin(t*.9+i*1.7)*.05)*W,s=(22+hash(i*5+3)*26)*u;
    hwGhost(ctx,x,y,s,t*3+i,(.55+.3*a)*Math.min(1,q*4,(1.25-q)*4))}}
  if(fx.hwpumpkins){const n=pv?3:2+n0(4);for(let i=0;i<n;i++){const s=(48+hash(i*9+3)*40)*u*(pv?.8:1),x=((i+.5)/n+(hash(i*9)-.5)*.5/n)*W,y=H-s*.55+Math.sin(t*1.2+i*2)*s*.03,
    f=.5+.25*Math.sin(t*11+i*3)+.25*hash(Math.floor(t*14)+i*31);
    ctx.save();ctx.globalCompositeOperation='lighter';glowDot(x,y,s*1.9,'255,140,30',.22*f*(.5+a));ctx.restore();hwPumpkin(ctx,x,y,s,f)}}
  if(fx.hwslime){ctx.save();const top=H*(.04+.025*a),gr=ctx.createLinearGradient(0,0,0,H*.5);gr.addColorStop(0,'#a3e635');gr.addColorStop(.25,'#65a30d');gr.addColorStop(1,'#3f6212');ctx.fillStyle=gr;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,0);for(let k=24;k>=0;k--)ctx.lineTo(k/24*W,top*(1+.3*Math.sin(k*1.7+t*.8)+.15*Math.sin(k*4.3)));ctx.closePath();ctx.fill();
    for(let i=0,n=3+n0(8);i<n;i++){const x=(i+.5+(hash(i*11)-.5)*.6)/n*W,cyc=2.6+hash(i*11+1)*2.4,ph=(t/cyc+hash(i*11+2))%1,Lm=H*(.06+.2*hash(i*11+3)),w=(13+hash(i*11+4)*13)*u;
      const q=Math.min(1,ph/.7),L=top+Lm*(ph<.7?q*q*(3-2*q):1-(ph-.7)/.3*.6),nw=w*.42;
      ctx.beginPath();ctx.moveTo(x-w*1.3,top*.9);ctx.quadraticCurveTo(x-nw,top*.9+w*.3,x-nw,top+w);ctx.lineTo(x-nw,L);ctx.lineTo(x+nw,L);ctx.lineTo(x+nw,top+w);ctx.quadraticCurveTo(x+nw,top*.9+w*.3,x+w*1.3,top*.9);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(x,L,w*.6,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(236,252,203,.6)';ctx.beginPath();ctx.ellipse(x-w*.22,L-w*.2,w*.13,w*.2,-.4,0,TAU);ctx.fill();ctx.fillRect(x-nw*.55,top+w*.6,Math.max(1,nw*.3),Math.max(0,L-top-w*1.2));ctx.fillStyle=gr;
      if(ph>.7){const d=(ph-.7)/.3,y=top+Lm+w*.6+d*d*H*1.1,r=w*.5;ctx.beginPath();ctx.moveTo(x,y-r*2.2);ctx.quadraticCurveTo(x+r,y-r*.4,x+r,y);ctx.arc(x,y,r,0,Math.PI);ctx.quadraticCurveTo(x-r,y-r*.4,x,y-r*2.2);ctx.fill()}}
    const gl=ctx.createLinearGradient(0,top*.15,0,top*.55);gl.addColorStop(0,'rgba(255,255,255,0)');gl.addColorStop(.5,'rgba(236,252,203,.45)');gl.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.fillRect(0,top*.15,W,top*.4);
    ctx.restore()}
  if(fx.hwcandy){ctx.save();for(let i=0,n=n0(26);i<n;i++){const sp=.1+hash(i*7+1)*.14,y=(hash(i*7+2)+t*sp)%1.15-.07,x=hash(i*7)+Math.sin(t*1.5+i)*.02,s=(15+hash(i*7+3)*11)*u*(pv?1:1),r=t*(1+hash(i*7+4)*2.5)*(i%2?1:-1)+i;
    ctx.save();ctx.translate(x*W,y*H);ctx.rotate(r);if(i%3===0)hwCandyCorn(ctx,s);else hwWrapped(ctx,s,HW_CANDY[i%HW_CANDY.length]);ctx.restore()}ctx.restore()}
}

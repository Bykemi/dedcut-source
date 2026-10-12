/* ---------- Overlays « jeu d'action en ville néon » (v4.63) : pour le Live / Enregistrer ET le Montage ----------
   Ambiance des jeux d'action en monde ouvert (ville au coucher du soleil, palmiers, néons, interface de jeu), entièrement
   dessinée ici en code : aucun nom, logo, police, personnage ni image repris d'un jeu existant (droits des autres).
   Cinq dessins : interface de jeu (mini-carte, étoiles, argent), « Mission réussie », écran d'attente coucher de soleil,
   cadre de webcam en téléphone, étoiles de recherche. Les mêmes dessins servent :
   - au studio : nouvelle famille de la source « Overlay » (OV_DRAW de 10r-overlays.js) ;
   - au Montage : élément « Overlay de jeu » (gen 'ovl', bibliothèque d'éléments, catégorie « Jeu en ville »). */
const GM_STYLES=['gm-hud','gm-mission','gm-screen','gm-cam','gm-stars'];
let gmFontAsked=false;
// police condensée libre déjà livrée avec DedCut (Anton, OFL)
const gmFont=px=>{if(!gmFontAsked&&typeof loadFont==='function'){gmFontAsked=true;loadFont('Anton')}return Math.max(1,Math.round(px))+'px "Anton", Impact, "Arial Black", sans-serif'};
function gmText(g,s,x,y,maxW,px,fill,stroke,align){
  s=String(s||'');if(!s||maxW<=0)return 0;g.font=gmFont(px);let tw=g.measureText(s).width;if(tw>maxW){px*=maxW/tw;g.font=gmFont(px);tw=maxW}
  g.textAlign=align||'center';g.textBaseline='middle';g.lineJoin='round';
  if(stroke){g.lineWidth=px*.14;g.strokeStyle=stroke;g.strokeText(s,x,y)}g.fillStyle=fill;g.fillText(s,x,y);return tw;
}
function gmPalm(g,bx,by,hh,lean,sway){ // palmier en ombre chinoise (pied en bx, by ; hauteur hh)
  const tx=bx+lean*hh+sway*hh*.04,ty=by-hh;
  g.lineCap='round';g.lineWidth=hh*.035;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+lean*hh*.2,by-hh*.55,tx,ty);g.stroke();
  for(let i=0;i<7;i++){const a=-Math.PI*.95+i*Math.PI*.95/6+sway*.06,L=hh*(.38+.08*Math.sin(i*1.7)),ex=tx+Math.cos(a)*L,ey=ty+Math.sin(a)*L*.55+L*.35;
    g.lineWidth=hh*.022;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a)*L*.55,ty+Math.sin(a)*L*.55-L*.12,ex,ey);g.stroke()}
}
const GM_DRAW={
  /* interface de jeu plein écran : mini-carte qui défile, barres de vie, étoiles de recherche, argent */
  'gm-hud'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),R=m*.13,cx=x+m*.045+R,cy=y+h-m*.075-R,rot=Math.sin(t*.12)*.6;
    g.save();g.beginPath();g.arc(cx,cy,R,0,OV_TAU);g.fillStyle='rgba(12,16,26,.86)';g.fill();g.clip();
    g.translate(cx,cy);g.rotate(rot);
    const cell=R*.62,s=t*R*.22,k=Math.floor(s/cell),off=s-k*cell;
    for(let i=-4;i<=4;i++)for(let j=-4;j<=5;j++){const r=ovR(i*31+(j-k)*17,7);if(r<.2){g.fillStyle=r<.09?'rgba(34,197,94,.3)':'rgba(56,189,248,.24)';g.fillRect(i*cell+cell*.14,j*cell+off-cell+cell*.14,cell*.72,cell*.72)}}
    g.strokeStyle='rgba(205,214,232,.38)';
    for(let i=-4;i<=4;i++){g.lineWidth=R*(i%3?.045:.075);g.beginPath();g.moveTo(i*cell,-R*1.6);g.lineTo(i*cell,R*1.6);g.stroke()}
    for(let j=-4;j<=5;j++){g.lineWidth=R*((j-k)%3?.045:.075);g.beginPath();g.moveTo(-R*1.6,j*cell+off-cell);g.lineTo(R*1.6,j*cell+off-cell);g.stroke()}
    // itinéraire (GPS) le long des rues
    const ty=-cell+off-(off>cell*.6?cell:0); // le virage reste devant la flèche
    g.strokeStyle=c1;g.lineWidth=R*.09;g.lineJoin='round';g.shadowColor=c1;g.shadowBlur=R*.25;
    g.beginPath();g.moveTo(0,R*.05);g.lineTo(0,ty);g.lineTo(cell,ty);g.lineTo(cell,-R*1.6);g.stroke();g.shadowBlur=0;
    g.rotate(-rot);g.fillStyle='#ffffff';g.beginPath();g.moveTo(0,-R*.14);g.lineTo(R*.1,R*.1);g.lineTo(0,R*.04);g.lineTo(-R*.1,R*.1);g.closePath();g.fill();
    g.restore();
    g.save();g.lineWidth=R*.06;g.strokeStyle='rgba(255,255,255,.88)';g.shadowColor=c2;g.shadowBlur=R*.2;g.beginPath();g.arc(cx,cy,R,0,OV_TAU);g.stroke();g.shadowBlur=0;
    const na=-Math.PI/2+rot,nx=cx+Math.cos(na)*R,ny=cy+Math.sin(na)*R;g.fillStyle='#111827';g.beginPath();g.arc(nx,ny,R*.15,0,OV_TAU);g.fill();ovText(g,'N',nx,ny+R*.01,R*.3,R*.17,800,'#fff','center');
    // vie et protection
    const bw=R*2,bh=m*.013,by=cy+R+m*.022,hp=.78+.08*Math.sin(t*.4),ar=.55+.05*Math.sin(t*.3);
    g.fillStyle='rgba(0,0,0,.6)';g.fillRect(cx-R,by,bw,bh*2.6);g.fillStyle='#22c55e';g.fillRect(cx-R+bh*.3,by+bh*.3,(bw/2-bh*.5)*hp,bh);g.fillStyle=c2;g.fillRect(cx+bh*.2,by+bh*.3,(bw/2-bh*.5)*ar,bh);
    // étoiles de recherche (une de plus toutes les 5 s) et argent
    const lev=1+Math.floor(t/5)%5,sr=m*.022,gap=sr*2.5,sx0=x+w-m*.045-sr;
    for(let i=0;i<5;i++){const sx=sx0-(4-i)*gap,sy=y+m*.06,on=i<lev,fresh=i===lev-1&&(t%5)<1;g.save();
      if(on){g.globalAlpha=fresh?.4+.6*Math.abs(Math.sin(t*9)):1;g.fillStyle='#ffffff';g.shadowColor='rgba(255,255,255,.8)';g.shadowBlur=sr*.8;ovStar(g,sx,sy,sr,5,.45);g.fill()}
      else{g.lineWidth=Math.max(1,sr*.14);g.strokeStyle='rgba(255,255,255,.4)';ovStar(g,sx,sy,sr,5,.45);g.stroke()}g.restore()}
    if(o.t1)gmText(g,o.t1,x+w-m*.045,y+m*.125,w*.4,m*.055,'#86efac','rgba(0,0,0,.85)','right');
    g.restore();
  },
  /* grand titre « Mission réussie » qui revient toutes les 9 s */
  'gm-mission'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),ph=t%9;if(ph>4.2)return;
    const a=ovClamp(ph/.35,0,1)*ovClamp((4.2-ph)/.5,0,1),z=1+.35*Math.pow(1-ovClamp(ph/.45,0,1),2),s2=ovClamp((ph-.35)/.4,0,1);
    g.save();g.globalAlpha=a;
    const gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.2,'rgba(0,0,0,.6)');gr.addColorStop(.8,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.fillRect(x,y+h*.1,w,h*.8);
    gmText(g,String(o.t1||'').toUpperCase(),x+w/2,y+h*.4,w*.9,h*.42*z,c1,'rgba(0,0,0,.9)','center');
    if(o.t2){g.globalAlpha=a*s2;gmText(g,o.t2,x+w/2,y+h*.74+(1-s2)*h*.08,w*.7,h*.2,c2,'rgba(0,0,0,.85)','center')}
    for(let i=0;i<6;i++){const q=ovClamp((ph-.1-i*.08)/.9,0,1);if(q<=0||q>=1)continue;const an=i*1.05+.4,d=w*(.18+.3*q);g.globalAlpha=a*(1-q);g.fillStyle=c1;
      ovStar(g,x+w/2+Math.cos(an)*d,y+h*.4+Math.sin(an)*h*.45*q,h*.05*(1-q*.5),4,.35);g.fill()}
    g.restore();
  },
  /* écran d'attente : ville au coucher du soleil, palmiers, route en perspective */
  'gm-screen'(g,x,y,w,h,t,o,e,u,key){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.5,(g,x,y,w,h)=>{
      const hz=y+h*.64,sky=g.createLinearGradient(0,y,0,hz);sky.addColorStop(0,'#120a2a');sky.addColorStop(.45,'#4c1d6e');sky.addColorStop(.8,'#c0266d');sky.addColorStop(1,'#f59e0b');
      g.fillStyle=sky;g.fillRect(x,y,w,hz-y);
      for(let i=0;i<40;i++){g.globalAlpha=.3+.5*ovR(i,9)*(.6+.4*Math.sin(t*1.3+i));g.fillStyle='#fff';g.fillRect(x+w*ovR(i,1),y+h*.32*ovR(i,2),Math.max(1,h*.002),Math.max(1,h*.002))}g.globalAlpha=1;
      // soleil rayé
      const sr=h*.2,sx=x+w*.5,sy=hz-h*.02,sg=g.createLinearGradient(0,sy-sr,0,sy+sr);sg.addColorStop(0,'#fde047');sg.addColorStop(1,c1);
      g.fillStyle=sg;g.beginPath();g.arc(sx,sy,sr,Math.PI,0);g.fill();g.fillStyle=sky;
      for(let i=0;i<6;i++){const yy=sy-sr*.08-i*sr*.15+((t*.04)%1)*sr*.15,hh=sr*(.02+.014*(5-i));if(yy<sy-sr)continue;g.fillRect(sx-sr,yy,sr*2,hh)}
      // immeubles et fenêtres allumées
      let bx=x-w*.02;for(let i=0;bx<x+w;i++){const bw=w*(.025+.035*ovR(i,3)),bh=h*(.07+.24*Math.pow(ovR(i,4),1.5));g.fillStyle=i%3?'#1b0d33':'#22103d';g.fillRect(bx,hz-bh,bw,bh);
        for(let k=0;k<6;k++){if(ovR(i*13+k,5)<.55)continue;g.fillStyle=ovR(i+k,6)<.5?'rgba(253,230,138,.85)':stRgba(c2,.75);g.globalAlpha=.5+.5*Math.sin(t*.5+i+k);g.fillRect(bx+bw*(.2+.5*ovR(i,k+7)),hz-bh*(.2+.7*ovR(k,i+2)),bw*.12,bh*.04)}g.globalAlpha=1;bx+=bw*(1+.15*ovR(i,8))}
      // sol : route en perspective qui défile
      g.fillStyle='#0b0618';g.fillRect(x,hz,w,y+h-hz);g.strokeStyle=stRgba(c2,.55);g.lineWidth=Math.max(1,h*.003);
      const vx=x+w/2;for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(vx+i*w*.006,hz);g.lineTo(vx+i*w*.16,y+h);g.stroke()}
      for(let k=0;k<9;k++){const q=Math.pow((k+(t*.5)%1)/9,2),yy=hz+(y+h-hz)*q;g.globalAlpha=Math.min(1,q*3);g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke()}g.globalAlpha=1;
      // palmiers (premier plan)
      g.strokeStyle='#07030f';const sw=Math.sin(t*.8);gmPalm(g,x+w*.08,y+h*1.02,h*.62,.12,sw);gmPalm(g,x+w*.17,y+h*1.02,h*.45,-.08,-sw);gmPalm(g,x+w*.9,y+h*1.02,h*.66,-.14,sw);gmPalm(g,x+w*.81,y+h*1.02,h*.42,.06,-sw);
    });
    const tg=g.createLinearGradient(0,y+h*.18,0,y+h*.32);tg.addColorStop(0,'#ffffff');tg.addColorStop(1,'#fbcfe8');
    g.save();g.shadowColor=c1;g.shadowBlur=h*.03;gmText(g,String(o.t1||'').toUpperCase(),x+w/2,y+h*.25,w*.86,h*.12,tg,'rgba(30,8,50,.9)','center');g.restore();
    if(o.t2)gmText(g,o.t2,x+w/2,y+h*.36,w*.7,h*.045,'#ffffff','rgba(30,8,50,.85)','center');
  },
  /* cadre de webcam en téléphone (à l'horizontale ou debout selon sa forme), écran transparent */
  'gm-cam'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),land=w>=h,m=Math.min(w,h),b=m*.075,r=m*.17;
    g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=m*.08;ovRing(g,x,y,w,h,r,b);g.fillStyle='#0d0d14';g.fill('evenodd');g.shadowBlur=0;
    const lw=Math.max(1.5,m*.012);g.lineWidth=lw;g.strokeStyle=ovConic(g,t*.7,x+w/2,y+h/2,[[0,c1],[.5,c2],[1,c1]]);g.beginPath();g.roundRect(x+lw/2,y+lw/2,w-lw,h-lw,r);g.stroke();
    g.fillStyle='#1f2937';g.beginPath();if(land)g.arc(x+b*.5,y+h/2,b*.22,0,OV_TAU);else g.arc(x+w/2,y+b*.5,b*.22,0,OV_TAU);g.fill();
    // barre d'état : heure, réseau, batterie
    const ix=x+b,iy=y+b,iw=w-2*b,bh=m*.075,d=new Date(),hh=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    g.save();g.beginPath();g.roundRect(ix,iy,iw,h-2*b,Math.max(0,r-b));g.clip();const sg=g.createLinearGradient(0,iy,0,iy+bh*1.6);sg.addColorStop(0,'rgba(0,0,0,.45)');sg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sg;g.fillRect(ix,iy,iw,bh*1.6);g.restore();
    ovText(g,hh,ix+bh*.6,iy+bh*.6,iw*.3,bh*.5,700,'#fff','left');
    const ex=ix+iw-bh*.5;g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=Math.max(1,bh*.06);
    g.strokeRect(ex-bh*.8,iy+bh*.42,bh*.7,bh*.36);g.fillRect(ex-bh*.1,iy+bh*.52,bh*.06,bh*.16);g.fillRect(ex-bh*.74,iy+bh*.48,bh*.58*(.6+.3*Math.sin(t*.2)),bh*.24);
    for(let i=0;i<4;i++)g.fillRect(ex-bh*1.6+i*bh*.17,iy+bh*(.75-.1*i),bh*.11,bh*(.08+.1*i));
    // nom en bas, façon appel en direct
    const s=String(o.t1||'');if(s){const px=m*.075;g.font=ovFont(px,700);const tw=Math.min(iw*.75,g.measureText(s).width),pw=tw+px*2.4,ph=px*1.8,px0=x+(w-pw)/2,py0=y+h-b-ph*1.25;
      g.fillStyle='rgba(10,10,18,.78)';g.beginPath();g.roundRect(px0,py0,pw,ph,ph/2);g.fill();g.fillStyle='#ef4444';g.globalAlpha=.55+.45*Math.abs(Math.sin(t*2.5));g.beginPath();g.arc(px0+ph*.5,py0+ph/2,ph*.16,0,OV_TAU);g.fill();g.globalAlpha=1;
      ovText(g,s,px0+ph*.85,py0+ph/2,tw,px,700,'#fff','left')}
    g.restore();
  },
  /* étoiles de recherche : une de plus toutes les 2,4 s, elles clignotent quand il y en a cinq */
  'gm-stars'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),P=2.4,lev=1+Math.floor(t/P)%5,ph=(t%P)/P,full=lev===5,s=String(o.t1||'');
    g.save();g.fillStyle='rgba(0,0,0,.55)';g.beginPath();g.roundRect(x,y,w,h,h/2);g.fill();
    const lx=s?gmText(g,s.toUpperCase(),x+h*.45,y+h/2,w*.4,h*.5,'#fff',null,'left')+h*.75:h*.35,area=x+w-h*.35-(x+lx),r=Math.min(h*.33,area/12),gap=area/5;
    for(let i=0;i<5;i++){const sx=x+lx+gap*(i+.5),sy=y+h/2,on=i<lev,fresh=i===lev-1&&ph<.3,k=fresh?1+.6*(1-ph/.3):1;g.save();
      if(on){g.globalAlpha=full?.45+.55*(Math.sin(t*10)>0?1:0):1;g.fillStyle=full&&Math.sin(t*5)>0?c2:c1;g.shadowColor=c2;g.shadowBlur=r*(fresh?1.4:.5);ovStar(g,sx,sy,r*k,5,.45);g.fill()}
      else{g.lineWidth=Math.max(1,r*.14);g.strokeStyle='rgba(255,255,255,.4)';ovStar(g,sx,sy,r,5,.45);g.stroke()}g.restore()}
    g.restore();
  }
};

/* ---------- studio (Live / Enregistrer) : nouvelle famille de la source « Overlay » ---------- */
Object.assign(OV_DRAW,GM_DRAW);
OV_CATS.game=GM_STYLES.slice();for(const s of GM_STYLES)OV_CAT[s]='game';
Object.assign(OV_R,{'gm-hud':OV_FULL,'gm-screen':OV_FULL,'gm-mission':{x:.2,y:.33,w:.6,h:.26},'gm-cam':{x:.765,y:.58,w:.21,h:.37},'gm-stars':{x:.74,y:.05,w:.23,h:.08}});
Object.assign(OV_TX,{'gm-hud':['ov.d.money',''],'gm-mission':['ov.d.mission','ov.d.reward'],'gm-screen':['ov.d.soon','ov.d.soon2'],'gm-cam':['ov.d.live',''],'gm-stars':['','']});
Object.assign(OV_COL,{'gm-hud':['#ec4899','#22d3ee'],'gm-mission':['#fbbf24','#ffffff'],'gm-screen':['#ec4899','#22d3ee'],'gm-cam':['#ec4899','#22d3ee'],'gm-stars':['#ffffff','#fbbf24']});
Object.assign(OV_NTX,{'gm-hud':1,'gm-mission':2,'gm-screen':2,'gm-cam':1,'gm-stars':1});

/* ---------- Montage : élément « Overlay de jeu » (gen 'ovl') ---------- */
const OVL_P={'gm-hud':{x:50,y:50,w:100,h:100},'gm-screen':{x:50,y:50,w:100,h:100},'gm-mission':{x:50,y:45,w:60,h:26},'gm-cam':{x:85.5,y:76.5,w:21,h:37},'gm-stars':{x:85.5,y:9,w:23,h:8}};
/** réglages de départ d'un style : place, textes traduits, couleurs */
function ovlDefs(s){const k=ovTx(s),c=OV_COL[s]||['#ec4899','#22d3ee'];return Object.assign({st:s,t1:k[0]?T(k[0]):'',t2:k[1]?T(k[1]):'',c1:c[0],c2:c[1],sp:1,op:100},OVL_P[s]||OVL_P['gm-hud'])}
const ovlKeys=new Map(); // une petite image de travail par clip (fonds animés calculés en petit)
WDRAW.ovl=(c,p,loc)=>{
  const f=OV_DRAW[p.st]||GM_DRAW['gm-hud'],w=W*(p.w??100)/100,h=H*(p.h??100)/100,x=W*(p.x??50)/100-w/2,y=H*(p.y??50)/100-h/2;
  let key=ovlKeys.get(c.id);if(!key){key={};ovlKeys.set(c.id,key)}
  ovFontName='Bahnschrift';f(ctx,x,y,w,h,loc*ovClamp(+p.sp||1,.1,4),p,loc/.75,W/1280,key);
};
WSTY.ovl=GM_STYLES.slice();
WDEF.ovl=()=>({dur:8,p:ovlDefs('gm-hud')});
WINSP.ovl=[['st','st'],['t1','txt','ov.t1',null,['gm-hud','gm-mission','gm-screen','gm-cam','gm-stars']],['t2','txt','ov.t2',null,['gm-mission','gm-screen']],
  ['c1','col','ov.c1'],['c2','col','ov.c2'],['sp','num','ov.speed',[.25,3,.05]],['w','num','insp.widthPct',[5,100,.5]],['h','num','insp.heightPct',[5,100,.5]]];
GN.ovl='ovl.name';
/** changement de style dans le Montage : place, textes et couleurs de départ du nouveau style s'ils n'ont pas été changés */
function ovlStyle(c,s){
  const a=ovlDefs(c.p.st),b=ovlDefs(s);
  for(const k of['t1','t2','c1','c2'])if(c.p[k]==null||c.p[k]===a[k])c.p[k]=b[k];
  if(['x','y','w','h'].every(k=>Math.abs((c.p[k]??a[k])-a[k])<.01))for(const k of['x','y','w','h'])c.p[k]=b[k];
}
WCATS.push('game');
for(const s of GM_STYLES){const d=ovlDefs(s),k=ovTx(s);
  WLIB.push({c:'game',g:'ovl',s,n:'ov.s.'+s,p:Object.assign({},d,{t1:k[0]?()=>T(k[0]):'',t2:k[1]?()=>T(k[1]):''}),tt:s==='gm-mission'?1.2:s==='gm-stars'?10.5:2.2})}

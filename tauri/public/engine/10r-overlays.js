/* ---------- Overlays du live (v4.52) : 30 habillages animés pour Enregistrer et Live ----------
   Six familles de cinq : cadres de webcam, bandeaux de nom, écrans d'attente, contours d'écran, rappels, ambiances.
   Tout est dessiné ici, en code (formes, dégradés, particules calculées à partir du temps) : aucun dessin, logo ni nom
   repris d'ailleurs, rien à télécharger. Une source « Overlay » = un style + 2 textes + 2 couleurs + une vitesse ;
   elle se place et s'agrandit à la souris comme les autres. Galerie dans le panneau Propriétés : images fixes,
   seule la vignette survolée bouge (pas de dessin inutile quand rien ne change). */
ICO.overlay='<path d="M3 8V5a1 1 0 0 1 1-1h3M17 4h3a1 1 0 0 1 1 1v3M21 16v3a1 1 0 0 1-1 1h-3M7 20H4a1 1 0 0 1-1-1v-3"/><rect x="6.5" y="13.5" width="11" height="3.5" rx="1"/>';
ST_KINDS.overlay='overlay';
const OV_CATS={
  cam:['cam-neon','cam-angles','cam-degrade','cam-double','cam-pixel'],
  lt:['lt-simple','lt-neon','lt-degrade','lt-tech','lt-ruban'],
  screen:['ec-aurore','ec-grille','ec-points','ec-vagues','ec-bulles'],
  border:['bd-neon','bd-coins','bd-cinema','bd-tournant','bd-hud'],
  remind:['rp-abonne','rp-like','rp-direct','rp-reseaux','rp-merci'],
  amb:['am-neige','am-coeurs','am-etincelles','am-confettis','am-lumiere']
};
const OV_CAT=Object.fromEntries(Object.entries(OV_CATS).flatMap(([c,l])=>l.map(s=>[s,c])));
const OV_FULL={x:0,y:0,w:1,h:1};
const OV_RECT={cam:{x:.765,y:.58,w:.21,h:.37},lt:{x:.03,y:.76,w:.42,h:.13},screen:OV_FULL,border:OV_FULL,amb:OV_FULL,remind:{x:.76,y:.06,w:.21,h:.09}};
const OV_R={'rp-like':{x:.79,y:.06,w:.18,h:.085},'rp-direct':{x:.025,y:.045,w:.16,h:.065},'rp-reseaux':{x:.025,y:.84,w:.27,h:.08},'rp-merci':{x:0,y:.945,w:1,h:.055}};
// textes de départ (clés de traduction) : [texte principal, texte secondaire]
const OV_TX={lt:['ov.d.name','ov.d.role'],screen:['ov.d.soon','ov.d.soon2'],'rp-abonne':['ov.d.sub','ov.d.subbed'],'rp-like':['ov.d.like',''],'rp-direct':['ov.d.live',''],
  'rp-reseaux':['ov.d.social',''],'rp-merci':['ov.d.thanks',''],'cam-angles':['',''],'bd-cinema':['',''],'bd-hud':['','']};
// nombre de textes réglables : 0, 1 ou 2
const OV_NTX={}; // nombre de textes donné par un pack ajouté plus tard (11b-gamehud.js)
const OV_NT=s=>{if(OV_NTX[s]!=null)return OV_NTX[s];const c=OV_CAT[s];if(c==='lt'||c==='screen'||s==='rp-abonne')return 2;if(c==='remind'||c==='cam'||s==='bd-cinema'||s==='bd-hud')return 1;return 0};
const OV_COL={'rp-direct':['#ef4444','#ffffff'],'am-neige':['#ffffff','#bfdbfe'],'am-coeurs':['#f472b6','#ef4444']};
const ovTx=s=>OV_TX[s]||OV_TX[OV_CAT[s]]||['',''];
const ovRect=s=>Object.assign({},OV_R[s]||OV_RECT[OV_CAT[s]]||OV_RECT.lt);
const ovDefs=s=>{const k=ovTx(s),c=OV_COL[s],th=stData&&stData.theme;return{style:s,t1:k[0]?T(k[0]):'',t2:k[1]?T(k[1]):'',c1:c?c[0]:(th&&th.acc)||'#8b5cf6',c2:c?c[1]:'#22d3ee',sp:1}};
ST_NEW.overlay={o:()=>ovDefs('lt-simple'),r:()=>ovRect('lt-simple')};

/* ---------- petits outils de dessin ---------- */
const OV_TAU=Math.PI*2;
const ovR=(i,k)=>{const v=Math.sin(i*127.1+(k||0)*311.7+.37)*43758.5453;return v-Math.floor(v)}; // hasard fixe : même résultat à chaque image
const ovC=(o,k)=>/^#[0-9a-f]{6}$/i.test(o[k]||'')?o[k]:(k==='c1'?'#8b5cf6':'#22d3ee');
const ovEase=e=>1-Math.pow(1-Math.max(0,Math.min(1,e)),3);
const ovClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let ovFontName='Bahnschrift';
const ovFont=(px,w)=>(w||700)+' '+Math.max(1,Math.round(px))+'px "'+ovFontName+'", Bahnschrift, "Segoe UI", sans-serif';
function ovText(g,s,x,y,maxW,px,w8,col,align,glow,ls){
  s=String(s||'');if(!s||maxW<=0)return 0;g.font=ovFont(px,w8);if(ls)try{g.letterSpacing=Math.round(px*ls)+'px'}catch(e){}
  let tw=g.measureText(s).width;if(tw>maxW){px*=maxW/tw;g.font=ovFont(px,w8);tw=maxW}
  g.textAlign=align||'left';g.textBaseline='middle';g.shadowColor=glow||'rgba(0,0,0,.5)';g.shadowBlur=px*(glow?.55:.18);g.fillStyle=col;g.fillText(s,x,y);
  g.shadowBlur=0;g.shadowColor='transparent';if(ls)try{g.letterSpacing='0px'}catch(e){}return tw;
}
function ovHeart(g,cx,cy,s){g.beginPath();g.moveTo(cx,cy+s*.42);g.bezierCurveTo(cx-s*1.05,cy-s*.2,cx-s*.5,cy-s*.98,cx,cy-s*.42);g.bezierCurveTo(cx+s*.5,cy-s*.98,cx+s*1.05,cy-s*.2,cx,cy+s*.42);g.closePath()}
function ovStar(g,cx,cy,r,n,inner){n=n||4;g.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rr=i%2?r*(inner||.3):r;g[i?'lineTo':'moveTo'](cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}g.closePath()}
function ovRing(g,x,y,w,h,r,lw){g.beginPath();g.roundRect(x,y,w,h,r);g.roundRect(x+lw,y+lw,w-2*lw,h-2*lw,Math.max(0,r-lw))}
function ovShine(g,x,y,w,h,t,per){const p=((t/(per||4))%1)*1.6-.3,sx=x+w*p,gr=g.createLinearGradient(sx-h,0,sx+h,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x,y,w,h)}
function ovConic(g,a,cx,cy,stops){if(!g.createConicGradient){const gr=g.createLinearGradient(cx-1,cy,cx+1,cy);stops.forEach(([p,c])=>gr.addColorStop(p,c));return gr}const gr=g.createConicGradient(a,cx,cy);stops.forEach(([p,c])=>gr.addColorStop(p,c));return gr}
// petite étiquette de nom en bas d'un cadre de webcam (si un texte est donné)
function ovTag(g,o,x,y,w,h,col){
  const s=String(o.t1||'');if(!s)return;const m=Math.min(w,h),px=m*.085;g.font=ovFont(px,700);const tw=Math.min(w*.8,g.measureText(s).width),bw=tw+px*1.4,bh=px*1.7,bx=x+(w-bw)/2,by=y+h-bh*.62;
  g.save();g.fillStyle=col;g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=px*.4;g.beginPath();g.roundRect(bx,by,bw,bh,bh/2);g.fill();g.restore();ovText(g,s,x+w/2,by+bh/2,w*.8,px,700,'#fff','center');
}
// un écran d'attente : titre, sous-titre et trois points qui patientent
function ovTitles(g,o,x,y,w,h,t,c2){
  const px=h*.085;ovText(g,o.t1,x+w/2,y+h*.44,w*.86,px,800,'#fff','center',null,.02);
  if(o.t2)ovText(g,o.t2,x+w/2,y+h*.53,w*.8,h*.036,500,'rgba(255,255,255,.82)','center');
  const dy=y+h*(o.t2?.6:.54);for(let i=0;i<3;i++){const a=.35+.65*Math.max(0,Math.sin(t*3-i*.7));g.globalAlpha=a;g.fillStyle=c2;g.beginPath();g.arc(x+w/2+(i-1)*h*.03,dy,h*.007,0,OV_TAU);g.fill()}g.globalAlpha=1;
}
// petite flèche de souris (dessin DedCut)
function ovCursor(g,x,y,s){g.save();g.translate(x,y);g.scale(s/24,s/24);g.beginPath();g.moveTo(4,2.5);g.lineTo(19.5,13.7);g.lineTo(12.9,14.7);g.lineTo(16.8,21.8);g.lineTo(13.9,23.4);g.lineTo(10,16.2);g.lineTo(4.6,20.9);g.closePath();g.fillStyle='#fff';g.strokeStyle='#111';g.lineWidth=1.3;g.lineJoin='round';g.fill();g.stroke();g.restore()}

// les grands fonds animés sont dessinés dans une petite image (q = 1/4 à 1/2) puis agrandis : 4 à 16 fois moins de pixels à calculer
const ovLow=new WeakMap();
function ovLowRes(g,key,x,y,w,h,q,fn){
  if(!key||w*h<300000){g.save();fn(g,x,y,w,h);g.restore();return} // petites vignettes : directement
  let c=ovLow.get(key);if(!c){c=document.createElement('canvas');ovLow.set(key,c)}
  const cw=Math.max(16,Math.round(w*q)),ch=Math.max(9,Math.round(h*q));if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch}
  const cg=c.getContext('2d');cg.setTransform(1,0,0,1,0,0);cg.clearRect(0,0,cw,ch);cg.save();cg.scale(cw/w,ch/h);fn(cg,0,0,w,h);cg.restore();
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='medium';g.drawImage(c,x,y,w,h);g.restore();
}

/* ---------- les 30 dessins : (g, x, y, w, h, t secondes × vitesse, réglages, apparition 0→1, échelle) ---------- */
const OV_DRAW={
  /* ===== cadres de webcam (on place le cadre par-dessus la webcam) ===== */
  'cam-neon'(g,x,y,w,h,t,o){const m=Math.min(w,h),lw=Math.max(2,m*.022),c1=ovC(o,'c1'),c2=ovC(o,'c2'),cx=x+w/2,cy=y+h/2;
    g.save();g.lineWidth=lw;g.strokeStyle=ovConic(g,t*.9,cx,cy,[[0,c1],[.5,c2],[1,c1]]);g.shadowColor=c1;g.shadowBlur=m*(.06+.035*Math.sin(t*3));
    g.beginPath();g.roundRect(x+lw/2,y+lw/2,w-lw,h-lw,m*.08);g.stroke();g.shadowBlur=0;g.lineWidth=lw*.32;g.strokeStyle='rgba(255,255,255,.8)';g.stroke();g.restore();ovTag(g,o,x,y,w,h,c1)},
  'cam-angles'(g,x,y,w,h,t,o){const m=Math.min(w,h),lw=Math.max(2,m*.03),L=m*(.2+.025*Math.sin(t*2)),c1=ovC(o,'c1'),p=lw/2+m*.012*(1+Math.sin(t*2));
    g.save();g.strokeStyle=c1;g.lineWidth=lw;g.lineCap='square';g.shadowColor=c1;g.shadowBlur=m*.04;
    for(const[cx,cy,sx,sy]of[[x+p,y+p,1,1],[x+w-p,y+p,-1,1],[x+w-p,y+h-p,-1,-1],[x+p,y+h-p,1,-1]]){g.beginPath();g.moveTo(cx,cy+sy*L);g.lineTo(cx,cy);g.lineTo(cx+sx*L,cy);g.stroke()}
    g.shadowBlur=0;g.lineWidth=Math.max(1,lw*.22);g.strokeStyle=stRgba(c1,.35);g.strokeRect(x+lw*2.4,y+lw*2.4,w-lw*4.8,h-lw*4.8);
    g.fillStyle=ovC(o,'c2');g.globalAlpha=.45+.55*Math.max(0,Math.sin(t*5));g.fillRect(x+w-lw*3.6,y+lw*2.6,lw*1.1,lw*1.1);g.globalAlpha=1;g.restore();ovTag(g,o,x,y,w,h,c1)},
  'cam-degrade'(g,x,y,w,h,t,o){const m=Math.min(w,h),lw=m*.045,r=m*.12,c1=ovC(o,'c1'),c2=ovC(o,'c2');
    g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=m*.05;ovRing(g,x,y,w,h,r,lw);g.fillStyle=ovConic(g,t*.6,x+w/2,y+h/2,[[0,c1],[.33,c2],[.66,'#ffffff'],[1,c1]]);g.fill('evenodd');
    g.shadowBlur=0;g.lineWidth=Math.max(1,lw*.12);g.strokeStyle='rgba(255,255,255,.55)';g.beginPath();g.roundRect(x+lw,y+lw,w-2*lw,h-2*lw,Math.max(0,r-lw));g.stroke();g.restore();ovTag(g,o,x,y,w,h,c1)},
  'cam-double'(g,x,y,w,h,t,o){const m=Math.min(w,h),lw=Math.max(2,m*.022),d=m*.05,a=t*1.1,c1=ovC(o,'c1'),c2=ovC(o,'c2');
    const ox=d*.5*(1+Math.cos(a)),oy=d*.5*(1+Math.sin(a));
    g.save();g.lineWidth=lw;g.strokeStyle=c2;g.globalAlpha=.9;g.strokeRect(x+lw/2+d-ox,y+lw/2+d-oy,w-lw-d,h-lw-d);
    g.globalAlpha=1;g.strokeStyle=c1;g.shadowColor=c1;g.shadowBlur=m*.03;g.strokeRect(x+lw/2+ox,y+lw/2+oy,w-lw-d,h-lw-d);g.restore();ovTag(g,o,x,y,w,h,c1)},
  'cam-pixel'(g,x,y,w,h,t,o){const m=Math.min(w,h),s=Math.max(3,m*.05),nx=Math.max(3,Math.round(w/s)),ny=Math.max(3,Math.round(h/s)),sx=w/nx,sy=h/ny,c1=ovC(o,'c1'),c2=ovC(o,'c2'),ph=Math.floor(t*6);
    g.save();let i=0;const sq=(cx,cy)=>{g.fillStyle=((i+ph)%4<2)?c1:c2;g.fillRect(cx+sx*.08,cy+sy*.08,sx*.84,sy*.84);i++};
    for(let k=1;k<nx-1;k++)sq(x+k*sx,y);for(let k=1;k<ny-1;k++)sq(x+(nx-1)*sx,y+k*sy);for(let k=nx-2;k>=1;k--)sq(x+k*sx,y+(ny-1)*sy);for(let k=ny-2;k>=1;k--)sq(x,y+k*sy);
    g.fillStyle='#ffffff';for(const[cx,cy]of[[x+sx,y+sy],[x+w-2*sx,y+sy],[x+w-2*sx,y+h-2*sy],[x+sx,y+h-2*sy]])g.fillRect(cx+sx*.2,cy+sy*.2,sx*.6,sy*.6);g.restore();ovTag(g,o,x,y,w,h,c1)},

  /* ===== bandeaux de nom (bas de l'écran) ===== */
  'lt-simple'(g,x,y,w,h,t,o,e){const c1=ovC(o,'c1'),k=ovEase(e),tx=ovClamp((e-.35)/.5,0,1);if(k<=0)return;
    g.save();g.beginPath();g.rect(x,y,w*k,h);g.clip();g.fillStyle='rgba(10,10,18,.84)';g.beginPath();g.roundRect(x,y,w,h,h*.08);g.fill();ovShine(g,x,y,w,h,t,5);
    g.fillStyle=c1;g.fillRect(x,y,h*.09,h);g.globalAlpha=tx;
    ovText(g,o.t1,x+h*.32,y+h*(o.t2?.38:.5),w-h*.5,h*.4,800,'#fff');if(o.t2)ovText(g,o.t2,x+h*.32,y+h*.74,w-h*.5,h*.22,500,'rgba(255,255,255,.78)');g.restore()},
  'lt-neon'(g,x,y,w,h,t,o,e){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),r=h*.28,lw=Math.max(1.5,h*.045),per=2*(w+h),k=ovEase(e);
    g.save();g.fillStyle='rgba(6,6,14,.55)';g.globalAlpha=k;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();g.globalAlpha=1;
    g.setLineDash([per*k,per]);g.lineWidth=lw;g.strokeStyle=c1;g.shadowColor=c1;g.shadowBlur=h*(.25+.12*Math.sin(t*3));g.beginPath();g.roundRect(x+lw/2,y+lw/2,w-lw,h-lw,r);g.stroke();g.setLineDash([]);g.shadowBlur=0;
    g.globalAlpha=ovClamp((e-.4)/.5,0,1);ovText(g,o.t1,x+h*.42,y+h*(o.t2?.4:.5),w-h*.8,h*.38,700,'#fff','left',c1);if(o.t2)ovText(g,o.t2,x+h*.42,y+h*.73,w-h*.8,h*.2,600,c2,'left',null,.08);g.restore()},
  'lt-degrade'(g,x,y,w,h,t,o,e){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),k=ovEase(e),sk=h*.32;if(k<=0)return;
    g.save();g.beginPath();g.rect(x-sk,y,(w+sk)*k,h);g.clip();g.beginPath();g.moveTo(x+sk,y);g.lineTo(x+w,y);g.lineTo(x+w-sk,y+h);g.lineTo(x,y+h);g.closePath();
    g.save();g.translate(h*.05,h*.07);g.fillStyle='rgba(0,0,0,.28)';g.fill();g.restore();const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fill();g.save();g.clip();ovShine(g,x,y,w,h,t,3.5);g.restore();
    g.globalAlpha=ovClamp((e-.35)/.5,0,1);ovText(g,o.t1,x+sk*1.3,y+h*(o.t2?.38:.5),w-sk*2.8,h*.4,800,'#fff');if(o.t2)ovText(g,o.t2,x+sk*1.1,y+h*.73,w-sk*2.6,h*.21,600,'rgba(255,255,255,.9)');g.restore()},
  'lt-tech'(g,x,y,w,h,t,o,e){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),k=ovEase(e),lw=Math.max(1,h*.03);
    g.save();g.fillStyle='rgba(4,8,16,.62)';g.fillRect(x,y,w*k,h);g.fillStyle=c1;g.fillRect(x,y,w*k,lw);g.fillRect(x,y+h-lw,w*k*.6,lw);
    g.strokeStyle=c1;g.lineWidth=lw*1.4;g.beginPath();g.moveTo(x+h*.18,y+h*.18);g.lineTo(x+h*.08,y+h*.18);g.lineTo(x+h*.08,y+h*.82);g.lineTo(x+h*.18,y+h*.82);g.stroke();
    g.fillStyle=c2;g.globalAlpha=.5+.5*Math.max(0,Math.sin(t*6));g.fillRect(x+w*k-h*.16,y+h*.14,h*.08,h*.08);g.globalAlpha=1;
    const sx=x+((t*.35)%1)*w*k;g.fillStyle=stRgba(c1,.18);g.fillRect(sx,y+lw,h*.12,h-2*lw);
    g.globalAlpha=ovClamp((e-.4)/.5,0,1);ovText(g,String(o.t1||'').toUpperCase(),x+h*.32,y+h*(o.t2?.4:.5),w-h*.6,h*.36,700,'#fff','left',null,.08);
    if(o.t2)ovText(g,o.t2,x+h*.32,y+h*.74,w-h*.6,h*.2,500,c2,'left',null,.04);g.restore()},
  'lt-ruban'(g,x,y,w,h,t,o,e){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),h1=h*.6,h2=h*.4,sk=h*.2,k1=ovEase(e*1.3),k2=ovEase(e*1.3-.3);
    g.save();if(k1>0){g.save();g.beginPath();g.rect(x,y,w*k1,h1);g.clip();g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w-sk,y+h1);g.lineTo(x,y+h1);g.closePath();g.fillStyle=c1;g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=h*.15;g.fill();g.shadowBlur=0;
      ovText(g,o.t1,x+h*.25,y+h1/2,w-h*.6,h1*.62,800,'#fff');g.restore()}
    if(k2>0&&o.t2){const x2=x+h*.25,w2=w*.78;g.save();g.beginPath();g.rect(x2,y+h1,w2*k2,h2);g.clip();g.beginPath();g.moveTo(x2,y+h1);g.lineTo(x2+w2,y+h1);g.lineTo(x2+w2-sk*.7,y+h);g.lineTo(x2,y+h);g.closePath();
      g.fillStyle='rgba(12,12,22,.9)';g.fill();g.fillStyle=c2;g.fillRect(x2,y+h1,w2,Math.max(1,h*.035));ovText(g,o.t2,x2+h*.18,y+h1+h2/2,w2-h*.5,h2*.55,600,'#fff');g.restore()}g.restore()},

  /* ===== écrans d'attente (tout l'écran) ===== */
  'ec-aurore'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.25,(g,x,y,w,h)=>{const bg=g.createLinearGradient(0,y,0,y+h);bg.addColorStop(0,'#05040c');bg.addColorStop(1,'#0c0a1c');g.fillStyle=bg;g.fillRect(x,y,w,h);g.globalCompositeOperation='lighter';
      for(let b=0;b<3;b++){const base=y+h*(.28+b*.13),amp=h*(.07+.03*b),col=b%2?c2:c1;g.beginPath();g.moveTo(x,y+h);
        for(let i=0;i<=40;i++){const px=x+w*i/40,yy=base+Math.sin(i*.336+t*(.35+b*.15)+b*2)*amp+Math.sin(i*.132-t*.25)*amp*.6;g.lineTo(px,yy)}g.lineTo(x+w,y+h);g.closePath();
        const gr=g.createLinearGradient(0,base-amp,0,base+h*.4);gr.addColorStop(0,stRgba(col,.42));gr.addColorStop(.35,stRgba(col,.12));gr.addColorStop(1,stRgba(col,0));g.fillStyle=gr;g.fill()}
      g.globalCompositeOperation='source-over'});
    g.save();g.fillStyle='#fff';for(let i=0;i<40;i++){g.globalAlpha=.25+.5*ovR(i,1)*Math.max(0,Math.sin(t*1.5+i));g.fillRect(x+w*ovR(i,2),y+h*ovR(i,3)*.5,Math.max(1.5,h*.0016),Math.max(1.5,h*.0016))}g.restore();
    ovTitles(g,o,x,y,w,h,t,c2)},
  'ec-grille'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.5,(g,x,y,w,h)=>{const hz=y+h*.64,cx=x+w/2;
      const bg=g.createLinearGradient(0,y,0,hz);bg.addColorStop(0,'#070313');bg.addColorStop(1,stRgba(c1,.55));g.fillStyle=bg;g.fillRect(x,y,w,hz-y);g.fillStyle='#07030f';g.fillRect(x,hz,w,y+h-hz);
      const R=h*.2,sun=g.createLinearGradient(0,hz-R,0,hz);sun.addColorStop(0,c2);sun.addColorStop(1,c1);g.save();g.beginPath();g.arc(cx,hz,R,Math.PI,0);g.closePath();g.clip();g.fillStyle=sun;g.fillRect(cx-R,hz-R,2*R,R);
      g.fillStyle='#07030f';for(let i=0;i<6;i++){const yy=hz-R*(.08+i*.15)+((t*.08)%1)*R*.15,th=R*.012*(i+1);g.fillRect(cx-R,yy,2*R,th)}g.restore();
      const N=14,off=(t*.5)%1,lw0=Math.max(1,h*.002);g.strokeStyle=c1;
      for(const[lw,al]of[[lw0*4,.22],[lw0,1]]){g.lineWidth=lw;g.beginPath();for(let i=0;i<N;i++){const z=(i+off)/N,yy=hz+(y+h-hz)*z*z;g.moveTo(x,yy);g.lineTo(x+w,yy)}for(let i=-12;i<=12;i++){g.moveTo(cx+i*w*.012,hz);g.lineTo(cx+i*w*.16,y+h)}g.globalAlpha=al;g.stroke()}g.globalAlpha=1});
    ovText(g,o.t1,x+w/2,y+h*.26,w*.86,h*.085,800,'#fff','center',c1,.02);if(o.t2)ovText(g,o.t2,x+w/2,y+h*.35,w*.8,h*.036,500,'rgba(255,255,255,.85)','center')},
  'ec-points'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.5,(g,x,y,w,h)=>{const N=58,P=[];const bg=g.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.hypot(w,h)/2);bg.addColorStop(0,'#0d0b1e');bg.addColorStop(1,'#04040a');g.fillStyle=bg;g.fillRect(x,y,w,h);
      for(let i=0;i<N;i++){const a=t*(.03+.04*ovR(i,4))*(ovR(i,5)<.5?-1:1);P.push([x+w*((ovR(i,1)+Math.cos(a+i)*.06+1)%1),y+h*((ovR(i,2)+Math.sin(a*1.3+i)*.06+1)%1)])}
      const D=Math.min(w,h)*.2;g.lineWidth=Math.max(1,h*.002);for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);if(d<D){g.strokeStyle=stRgba(c1,.5*(1-d/D));g.beginPath();g.moveTo(P[i][0],P[i][1]);g.lineTo(P[j][0],P[j][1]);g.stroke()}}
      g.fillStyle=c2;for(const p of P){g.beginPath();g.arc(p[0],p[1],Math.max(1.5,h*.0035),0,OV_TAU);g.fill()}});
    ovTitles(g,o,x,y,w,h,t,c2)},
  'ec-vagues'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.34,(g,x,y,w,h)=>{const bg=g.createLinearGradient(0,y,0,y+h);bg.addColorStop(0,'#060612');bg.addColorStop(1,stRgba(c1,.35));g.fillStyle='#060612';g.fillRect(x,y,w,h);g.fillStyle=bg;g.fillRect(x,y,w,h);
      for(let b=0;b<4;b++){const base=y+h*(.66+b*.08),amp=h*(.03+.012*b),f=2+b*.7,col=b%2?c2:c1;g.beginPath();g.moveTo(x,y+h);for(let i=0;i<=60;i++){const px=x+w*i/60;g.lineTo(px,base+Math.sin(i/60*OV_TAU*f+t*(.7+b*.25)+b)*amp)}g.lineTo(x+w,y+h);g.closePath();g.fillStyle=stRgba(col,.22+b*.08);g.fill()}});
    ovTitles(g,o,x,y,w,h,t,c2)},
  'ec-bulles'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.34,(g,x,y,w,h)=>{const bg=g.createRadialGradient(x+w/2,y+h,0,x+w/2,y+h,h*1.2);bg.addColorStop(0,stRgba(c1,.45));bg.addColorStop(1,'#05050c');g.fillStyle='#05050c';g.fillRect(x,y,w,h);g.fillStyle=bg;g.fillRect(x,y,w,h);
      for(let i=0;i<42;i++){const v=.04+.06*ovR(i,2),py=y+h*(1.1-((ovR(i,1)+t*v)%1.2)),px=x+w*ovR(i,3)+Math.sin(t*.8+i)*w*.012,r=h*(.006+.03*ovR(i,4));
        g.beginPath();g.arc(px,py,r,0,OV_TAU);g.fillStyle=stRgba(i%3?c1:c2,.14);g.fill();g.lineWidth=Math.max(1,r*.08);g.strokeStyle='rgba(255,255,255,.28)';g.stroke();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(px-r*.35,py-r*.35,r*.18,0,OV_TAU);g.fill()}});
    ovTitles(g,o,x,y,w,h,t,c2)},

  /* ===== contours d'écran (le milieu reste libre) ===== */
  'bd-neon'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),p=m*.018,lw=Math.max(2,m*.006);
    // halo en petit (doux), traits nets en grand
    ovLowRes(g,key,x,y,w,h,.25,(g,x,y,w,h)=>{const m=Math.min(w,h),p=m*.018,lw=Math.max(2,m*.006);g.strokeStyle=c1;g.beginPath();g.roundRect(x+p,y+p,w-2*p,h-2*p,m*.02);g.globalAlpha=.18+.1*Math.sin(t*2.5);g.lineWidth=lw*6;g.stroke();g.globalAlpha=.35;g.lineWidth=lw*3;g.stroke()});
    g.save();g.strokeStyle=c1;g.lineWidth=lw;g.beginPath();g.roundRect(x+p,y+p,w-2*p,h-2*p,m*.02);g.stroke();g.lineWidth=Math.max(1,lw*.4);g.strokeStyle=stRgba(c2,.7);g.beginPath();g.roundRect(x+p*1.7,y+p*1.7,w-3.4*p,h-3.4*p,m*.016);g.stroke();g.restore()},
  'bd-coins'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),L=m*.09,lw=Math.max(2,m*.007),p=m*.025;
    ovLowRes(g,key,x,y,w,h,.25,(g,x,y,w,h)=>{const R=Math.min(w,h)*.38;[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].forEach(([cx,cy],i)=>{const a=.22+.14*Math.sin(t*1.6+i*1.5),gr=g.createRadialGradient(cx,cy,0,cx,cy,R);gr.addColorStop(0,stRgba(i%2?c2:c1,a));gr.addColorStop(1,stRgba(i%2?c2:c1,0));g.fillStyle=gr;g.fillRect(cx-R,cy-R,2*R,2*R)})});g.save();
    g.strokeStyle='#fff';g.lineWidth=lw;g.lineCap='round';for(const[cx,cy,sx,sy]of[[x+p,y+p,1,1],[x+w-p,y+p,-1,1],[x+w-p,y+h-p,-1,-1],[x+p,y+h-p,1,-1]]){g.beginPath();g.moveTo(cx,cy+sy*L);g.lineTo(cx,cy);g.lineTo(cx+sx*L,cy);g.stroke()}g.restore()},
  'bd-cinema'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),bh=h*.1,lw=Math.max(1,h*.002);g.save();g.fillStyle='rgba(0,0,0,.93)';g.fillRect(x,y,w,bh);g.fillRect(x,y+h-bh,w,bh);
    g.fillStyle=stRgba(c1,.8);g.fillRect(x,y+bh-lw,w,lw);g.fillRect(x,y+h-bh,w,lw);const sx=x+((t*.12)%1)*w,gr=g.createLinearGradient(sx-w*.08,0,sx+w*.08,0);gr.addColorStop(0,stRgba(c1,0));gr.addColorStop(.5,'#ffffff');gr.addColorStop(1,stRgba(c1,0));g.fillStyle=gr;g.fillRect(sx-w*.08,y+bh-lw*1.5,w*.16,lw*2);g.fillRect(x+w-(sx-x)-w*.08,y+h-bh-lw*.5,w*.16,lw*2);
    if(o.t1)ovText(g,String(o.t1).toUpperCase(),x+w*.04,y+h-bh/2,w*.6,bh*.32,600,'rgba(255,255,255,.85)','left',null,.18);g.restore()},
  'bd-tournant'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),p=m*.012,lw=Math.max(2,m*.009),a=t*1.2;
    const grad=(g,x,y,w,h)=>ovConic(g,a,x+w/2,y+h/2,[[0,c1],[.08,stRgba(c2,.9)],[.22,stRgba(c2,0)],[.5,stRgba(c1,0)],[.58,stRgba(c1,.9)],[.72,stRgba(c2,0)],[1,c1]]);
    ovLowRes(g,key,x,y,w,h,.25,(g,x,y,w,h)=>{const m=Math.min(w,h),p=m*.012,lw=Math.max(2,m*.009);g.beginPath();g.roundRect(x+p,y+p,w-2*p,h-2*p,m*.02);g.strokeStyle=grad(g,x,y,w,h);g.globalAlpha=.35;g.lineWidth=lw*3.5;g.stroke()});
    g.save();g.beginPath();g.roundRect(x+p,y+p,w-2*p,h-2*p,m*.02);g.lineWidth=lw;g.strokeStyle='rgba(255,255,255,.12)';g.stroke();g.strokeStyle=grad(g,x,y,w,h);g.stroke();g.restore()},
  'bd-hud'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),p=m*.03,L=m*.06,lw=Math.max(1,m*.003);g.save();g.strokeStyle=stRgba(c1,.9);g.lineWidth=lw*1.6;
    for(const[cx,cy,sx,sy]of[[x+p,y+p,1,1],[x+w-p,y+p,-1,1],[x+w-p,y+h-p,-1,-1],[x+p,y+h-p,1,-1]]){g.beginPath();g.moveTo(cx,cy+sy*L);g.lineTo(cx,cy);g.lineTo(cx+sx*L,cy);g.stroke()}
    g.lineWidth=lw;g.strokeStyle=stRgba(c1,.45);for(let i=1;i<40;i++){const px=x+p+L+(w-2*p-2*L)*i/40,l=i%5?m*.008:m*.018;g.beginPath();g.moveTo(px,y+p);g.lineTo(px,y+p+l);g.moveTo(px,y+h-p);g.lineTo(px,y+h-p-l);g.stroke()}
    const sy=y+((t*.18)%1)*h,gr=g.createLinearGradient(0,sy-h*.04,0,sy+h*.04);gr.addColorStop(0,stRgba(c1,0));gr.addColorStop(.5,stRgba(c1,.12));gr.addColorStop(1,stRgba(c1,0));g.fillStyle=gr;g.fillRect(x,sy-h*.04,w,h*.08);
    const s=Math.floor(t),tc=[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':')+'.'+String(Math.floor((t%1)*100)).padStart(2,'0');
    ovText(g,tc,x+w-p-L*.2,y+p+m*.05,w*.3,m*.03,600,c2,'right',null,.06);if(o.t1)ovText(g,String(o.t1).toUpperCase(),x+p+L*.2,y+p+m*.05,w*.4,m*.03,600,'#fff','left',null,.1);
    g.fillStyle=c2;g.globalAlpha=.4+.6*Math.max(0,Math.sin(t*4));g.beginPath();g.arc(x+w-p-L*.2,y+h-p-m*.045,m*.008,0,OV_TAU);g.fill();g.restore()},

  /* ===== rappels ===== */
  'rp-abonne'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),P=7,ph=(t%P)/P,on=ph>.56&&ph<.9,press=ph>.52&&ph<.58?.93:1,r=h/2;g.save();g.translate(x+w/2,y+h/2);g.scale(press,press);g.translate(-(x+w/2),-(y+h/2));
    g.fillStyle=on?'rgba(40,40,52,.92)':c1;g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=h*.25;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();g.shadowBlur=0;
    if(!on){const pul=.5+.5*Math.sin(t*4);g.strokeStyle=stRgba('#ffffff',.25+.3*pul);g.lineWidth=Math.max(1,h*.04);g.stroke()}
    const ic=h*.28,icx=x+h*.55,icy=y+h/2;g.strokeStyle='#fff';g.lineWidth=Math.max(1.5,h*.075);g.lineCap='round';g.beginPath();
    if(on){g.moveTo(icx-ic*.6,icy);g.lineTo(icx-ic*.1,icy+ic*.5);g.lineTo(icx+ic*.7,icy-ic*.5)}else{g.moveTo(icx-ic*.6,icy);g.lineTo(icx+ic*.6,icy);g.moveTo(icx,icy-ic*.6);g.lineTo(icx,icy+ic*.6)}g.stroke();
    ovText(g,on?(o.t2||o.t1):o.t1,x+h,y+h/2,w-h*1.25,h*.4,800,'#fff');g.restore();
    if(ph>.36&&ph<.7){const q=ovEase((ph-.36)/.16),fx=x+w*1.05-(w*.35)*q,fy=y+h*1.2-h*.55*q;ovCursor(g,fx,fy,h*.55)}},
  'rp-like'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),beat=Math.pow(Math.max(0,Math.sin(t*3.2)),6),P=4,ph=(t%P)/P;g.save();g.fillStyle='rgba(10,10,18,.8)';g.beginPath();g.roundRect(x,y,w,h,h/2);g.fill();
    const hx=x+h*.52,hy=y+h*.53,hs=h*.3*(1+.18*beat);g.fillStyle=c1;g.shadowColor=c1;g.shadowBlur=h*.3*beat;ovHeart(g,hx,hy,hs);g.fill();g.shadowBlur=0;
    if(ph<.45)for(let i=0;i<3;i++){const q=ph/.45,dx=(i-1)*h*.28,s=h*.12*(1-q*.4);g.globalAlpha=1-q;g.fillStyle=i===1?c2:c1;ovHeart(g,hx+dx*q,hy-h*.9*q,s);g.fill()}g.globalAlpha=1;
    ovText(g,o.t1,x+h,y+h/2,w-h*1.25,h*.38,700,'#fff');g.restore()},
  'rp-direct'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),r=h/2,dx=x+h*.5,dy=y+h/2;g.save();g.fillStyle='rgba(8,8,14,.82)';g.beginPath();g.roundRect(x,y,w,h,r);g.fill();
    for(let i=0;i<2;i++){const q=((t*.9+i*.5)%1);g.strokeStyle=stRgba(c1,1-q);g.lineWidth=Math.max(1,h*.05);g.beginPath();g.arc(dx,dy,h*(.12+.3*q),0,OV_TAU);g.stroke()}
    g.fillStyle=c1;g.beginPath();g.arc(dx,dy,h*.13,0,OV_TAU);g.fill();ovText(g,String(o.t1||'').toUpperCase(),x+h*.95,dy,w-h*1.2,h*.42,800,ovC(o,'c2'),'left',null,.06);g.restore()},
  'rp-reseaux'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),items=String(o.t1||'').split(/\s*[|,;]\s*/).filter(Boolean);if(!items.length)return;const P=3.2,n=items.length,i=Math.floor(t/P)%n,ph=(t%P)/P,sl=ph>.85?ovEase((ph-.85)/.15):0;
    g.save();g.fillStyle='rgba(10,10,18,.82)';g.beginPath();g.roundRect(x,y,w,h,h*.3);g.fill();const cx=x+h*.5,cy=y+h/2;g.fillStyle=c1;g.beginPath();g.arc(cx,cy,h*.32,0,OV_TAU);g.fill();
    ovText(g,'@',cx,cy+h*.01,h*.5,h*.4,800,'#fff','center');g.beginPath();g.rect(x+h,y,w-h*1.1,h);g.clip();
    g.globalAlpha=1-sl;ovText(g,items[i],x+h*1.05,cy-h*sl*.6,w-h*1.3,h*.38,700,'#fff');if(n>1){g.globalAlpha=sl;ovText(g,items[(i+1)%n],x+h*1.05,cy+h*(1-sl)*.6,w-h*1.3,h*.38,700,'#fff')}g.restore()},
  'rp-merci'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),s=String(o.t1||'');if(!s)return;g.save();g.fillStyle='rgba(8,8,16,.8)';g.fillRect(x,y,w,h);g.fillStyle=c1;g.fillRect(x,y,w,Math.max(1,h*.06));g.beginPath();g.rect(x,y,w,h);g.clip();
    g.font=ovFont(h*.46,600);const gap=h*1.6,unit=g.measureText(s).width+gap,off=(t*h*1.6)%unit;for(let k=-1;k*unit<w+unit;k++){const px=x+k*unit-off;ovText(g,s,px,y+h*.53,1e6,h*.46,600,'#fff');g.fillStyle=c2;ovStar(g,px-gap/2,y+h*.53,h*.2,4,.35);g.fill()}g.restore()},

  /* ===== ambiances (par-dessus, fond transparent) ===== */
  'am-neige'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),u=h/1080;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    for(let i=0;i<110;i++){const v=.03+.06*ovR(i,2),py=y+h*(((ovR(i,1)+t*v)%1.1)-.05),px=x+w*((ovR(i,3)+Math.sin(t*.6+i)*.012+1)%1),r=(1.2+3.6*ovR(i,4))*Math.max(.4,u)*1.6;
      g.globalAlpha=.45+.5*ovR(i,5);g.fillStyle=i%4?c1:c2;g.beginPath();g.arc(px,py,r,0,OV_TAU);g.fill()}g.restore()},
  'am-coeurs'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),u=h/1080;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    for(let i=0;i<26;i++){const v=.05+.05*ovR(i,2),q=(ovR(i,1)+t*v)%1.2,py=y+h*(1.08-q),px=x+w*ovR(i,3)+Math.sin(t*1.4+i)*w*.015,s=(10+18*ovR(i,4))*Math.max(.4,u)*1.5;
      g.globalAlpha=Math.max(0,Math.min(1,(1-q)*1.6))*.85;g.fillStyle=i%2?c1:c2;ovHeart(g,px,py,s);g.fill()}g.restore()},
  'am-etincelles'(g,x,y,w,h,t,o){const c1=ovC(o,'c1'),c2=ovC(o,'c2'),u=h/1080;g.save();g.globalCompositeOperation='lighter';
    for(let i=0;i<34;i++){const f=.35+.4*ovR(i,1),cyc=Math.floor(t*f+ovR(i,2)),ph=(t*f+ovR(i,2))%1,b=Math.pow(Math.sin(ph*Math.PI),3),px=x+w*ovR(i*7+cyc,3),py=y+h*ovR(i*7+cyc,4),r=(8+20*ovR(i,5))*Math.max(.4,u)*1.4*(.4+.6*b);
      if(b<.02)continue;const gc=i%2?c1:c2,rg=g.createRadialGradient(px,py,0,px,py,r*.9);rg.addColorStop(0,stRgba(gc,.45*b));rg.addColorStop(1,stRgba(gc,0));g.globalAlpha=1;g.fillStyle=rg;g.fillRect(px-r,py-r,2*r,2*r);g.globalAlpha=b;g.fillStyle=i%3?'#ffffff':gc;ovStar(g,px,py,r,4,.22);g.fill()}g.restore()},
  'am-confettis'(g,x,y,w,h,t,o){const C=[ovC(o,'c1'),ovC(o,'c2'),'#fbbf24','#ffffff','#f472b6'],u=h/1080;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    for(let i=0;i<80;i++){const v=.07+.07*ovR(i,2),py=y+h*(((ovR(i,1)+t*v)%1.15)-.08),px=x+w*((ovR(i,3)+Math.sin(t*1.8+i)*.012+1)%1),a=t*(2+3*ovR(i,4))+i,sw=(7+7*ovR(i,5))*Math.max(.4,u)*1.4,sh=sw*.5;
      g.save();g.translate(px,py);g.rotate(a);g.scale(1,Math.abs(Math.cos(a*1.3))+.15);g.fillStyle=C[i%5];g.globalAlpha=.9;g.fillRect(-sw/2,-sh/2,sw,sh);g.restore()}g.restore()},
  'am-lumiere'(g,x,y,w,h,t,o,e,u,key){const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.25,(g,x,y,w,h)=>{g.globalCompositeOperation='lighter';
      const P=7,ph=(t%P)/P,sx=x-w*.4+ph*w*1.8,gr=g.createLinearGradient(sx-w*.18,y,sx+w*.18,y+h*.35);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,stRgba(c2,.16));gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;const bx=Math.max(x,sx-w*.3),bw=Math.min(x+w,sx+w*.3)-bx;if(bw>0)g.fillRect(bx,y,bw,h);
      for(let i=0;i<14;i++){const px=x+w*((ovR(i,1)+t*.012*(ovR(i,2)-.5)+1)%1),py=y+h*((ovR(i,3)+t*.01*(ovR(i,4)-.5)+1)%1),r=h*(.03+.07*ovR(i,5)),a=.06+.07*(.5+.5*Math.sin(t*.7+i)),rg=g.createRadialGradient(px,py,0,px,py,r);
        rg.addColorStop(0,stRgba(i%2?c1:c2,a));rg.addColorStop(1,stRgba(i%2?c1:c2,0));g.fillStyle=rg;g.fillRect(px-r,py-r,2*r,2*r)}})}
};

/* ---------- dessin dans le studio ---------- */
const ovSeen=new WeakMap(); // moment où la source est réapparue (pour l'entrée des bandeaux de nom)
ST_DRAW.overlay=(g,it,x,y,w,h,t)=>{
  const o=it.o,f=OV_DRAW[o.style]||OV_DRAW['lt-simple'],now=performance.now();let s=ovSeen.get(it);if(!s||now-s.last>700)s={start:now};s.last=now;ovSeen.set(it,s);
  ovFontName=String(o.font||(stData&&stData.theme&&stData.theme.font)||'Bahnschrift').replace(/["\\]/g,'');
  g.save();try{f(g,x,y,w,h,t*ovClamp(+o.sp||1,.1,4),o,(now-s.start)/750,st.w/1280,it)}finally{g.restore()}
};
// nom dans la liste des sources : « Overlay · Néon »
{const _n=stName;stName=function(it){return it&&it.kind==='overlay'?T('st.k.overlay')+' · '+T('ov.s.'+(it.o.style||'lt-simple')):_n.apply(this,arguments)}}
// le thème du live colore aussi les overlays
{const _th=lcThemeApply;lcThemeApply=function(th){if(th&&stData)for(const s of stData.scenes)for(const it of s.items)if(it.kind==='overlay'&&!OV_COL[it.o.style]){it.o.c1=th.acc;it.o.font=th.font}return _th.apply(this,arguments)}}

/* ---------- panneau Propriétés : galerie des 30 styles + réglages ---------- */
const OV_TW=128,OV_TH=72;
ST_PROPS.overlay=it=>{const o=it.o,n=OV_NT(o.style);
  setTimeout(ovPaintTiles,0); // le panneau est écrit juste après
  const gal=Object.entries(OV_CATS).map(([c,l])=>`<h5>${T('ov.cat.'+c)}</h5><div class="ovgal">${l.map(s=>`<button class="ovtile${s===o.style?' on':''}" data-ovst="${s}" title="${esc(T('ov.s.'+s))}"><canvas width="${OV_TW*2}" height="${OV_TH*2}" data-ovpv="${s}"></canvas><span>${esc(T('ov.s.'+s))}</span></button>`).join('')}</div>`).join('');
  const k=ovTx(o.style);
  return`<details class="ovsec" open><summary>${ico('overlay',14)}${T('ov.pick')}</summary>${gal}<p class="hint">${T('ov.hint')}</p></details>
  ${n>=1?`<div class="fld"><label>${T(OV_CAT[o.style]==='cam'?'ov.tag':o.style==='rp-reseaux'?'ov.social':'ov.t1')}</label><input type="text" data-o="t1" value="${esc(o.t1||'')}" maxlength="${o.style==='rp-merci'||o.style==='rp-reseaux'?160:60}" placeholder="${esc(k[0]?T(k[0]):'')}"></div>`:''}
  ${n>=2?`<div class="fld"><label>${T(o.style==='rp-abonne'?'ov.after':'ov.t2')}</label><input type="text" data-o="t2" value="${esc(o.t2||'')}" maxlength="80" placeholder="${esc(k[1]?T(k[1]):'')}"></div>`:''}
  <div class="two"><div class="fld"><label>${T('ov.c1')}</label><input type="color" data-o="c1" value="${esc(ovC(o,'c1'))}"></div><div class="fld"><label>${T('ov.c2')}</label><input type="color" data-o="c2" value="${esc(ovC(o,'c2'))}"></div></div>
  <div class="fld"><label>${T('ov.speed')} <span>${(+o.sp||1).toFixed(2)}</span></label><input type="range" min=".25" max="3" step=".05" value="${+o.sp||1}" data-o="sp"></div>`;
};
// image fixe de chaque style (sur un faux écran), la vignette survolée bouge
function ovPreview(cv,s,t){
  const g=cv.getContext('2d'),W=cv.width,H=cv.height,c=OV_CAT[s];if(!g)return;
  g.setTransform(1,0,0,1,0,0);const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1d2433');bg.addColorStop(1,'#3a2a4d');g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.fillStyle='rgba(255,255,255,.06)';for(let i=0;i<6;i++)g.fillRect(W*(.08+i*.15),H*.2,W*.1,H*.5);
  const r=ovRect(s),o=Object.assign(ovDefs(s),{style:s});
  if(c==='cam'){g.fillStyle='#2b3445';g.fillRect(r.x*W,r.y*H,r.w*W,r.h*H);g.fillStyle='rgba(255,255,255,.22)';const cx=(r.x+r.w/2)*W,cy=(r.y+r.h*.55)*H,m=Math.min(r.w*W,r.h*H);g.beginPath();g.arc(cx,cy-m*.12,m*.16,0,OV_TAU);g.fill();g.beginPath();g.ellipse(cx,cy+m*.32,m*.3,m*.22,0,Math.PI,0);g.fill()}
  // les petits éléments sont montrés en grand dans la vignette
  const big=c==='cam'||c==='lt'||c==='remind'||(r.w<.65&&r.h<.65),k=big?Math.min(.9/r.w,.6/r.h,2.6):1,rw=r.w*W*k,rh=r.h*H*k,rx=big?(W-rw)/2:r.x*W,ry=big?(H-rh)/2:r.y*H;
  ovFontName=(stData&&stData.theme&&stData.theme.font)||'Bahnschrift';
  g.save();try{OV_DRAW[s](g,rx,ry,rw,rh,t,o,9,W/1280)}catch(e){}g.restore();
}
function ovPaintTiles(){for(const cv of document.querySelectorAll('#stSide canvas[data-ovpv]'))ovPreview(cv,cv.dataset.ovpv,2.2)}
let ovHover=null;
$('#stSide').addEventListener('pointerover',e=>{const cv=e.target.closest('.ovtile')?.querySelector('canvas');if(!cv||ovHover&&ovHover.cv===cv)return;if(ovHover)cancelAnimationFrame(ovHover.raf);
  const t0=performance.now()-2200,H={cv,raf:0};ovHover=H;const loop=()=>{if(ovHover!==H||!cv.isConnected)return;ovPreview(cv,cv.dataset.ovpv,(performance.now()-t0)/1000);H.raf=requestAnimationFrame(loop)};loop()});
$('#stSide').addEventListener('pointerout',e=>{const b=e.target.closest('.ovtile');if(!b||!ovHover||b.contains(e.relatedTarget))return;cancelAnimationFrame(ovHover.raf);const cv=ovHover.cv;ovHover=null;if(cv.isConnected)ovPreview(cv,cv.dataset.ovpv,2.2)});
$('#stSide').addEventListener('click',e=>{
  const b=e.target.closest('[data-ovst]');if(!b)return;const it=stSel();if(!it||it.kind!=='overlay')return;
  const old=it.o.style,s=b.dataset.ovst;if(!OV_DRAW[s]||s===old)return;
  // place par défaut si la source n'a pas été déplacée, textes de départ s'ils n'ont pas été changés
  const r0=ovRect(old),moved=Math.abs(it.x-r0.x)+Math.abs(it.y-r0.y)+Math.abs(it.w-r0.w)+Math.abs(it.h-r0.h)>.004;
  if(!moved||OV_CAT[s]!==OV_CAT[old])Object.assign(it,ovRect(s));
  const k0=ovTx(old),k1=ovTx(s),d=ovDefs(s);
  for(const[i,key]of[[0,'t1'],[1,'t2']])if(!it.o[key]||(k0[i]&&it.o[key]===T(k0[i])))it.o[key]=k1[i]?T(k1[i]):'';
  if(OV_COL[s]||OV_COL[old]){it.o.c1=d.c1;it.o.c2=d.c2}
  it.o.style=s;stSave();stSideUI();stSourcesUI();stSelBox();
});
$('#stSide').addEventListener('input',e=>{const t=e.target;if(t.dataset.o!=='sp')return;const s=t.closest('.fld')&&t.closest('.fld').querySelector('label span');if(s)s.textContent=(+t.value).toFixed(2)});

/* ---------- Overlays « Halloween » (v4.67.2) : pour le Live / Enregistrer ET le Montage ----------
   Dessinés ici en code, avec les dessins de 06c-halloween.js (chauves-souris, citrouilles, toiles, araignées, bonbons) :
   rien de repris d'ailleurs. Six dessins : écran d'attente (lune, cimetière, brume), cadre de webcam (toile, araignée,
   citrouille), bandeau de nom, contour d'écran (toiles dans les coins, citrouilles en bas), ambiance (chauves-souris,
   bonbons, brume), rappel « Abonne-toi ». Police libre déjà livrée avec DedCut : Creepster (OFL).
   Aussi : styles « Halloween » pour la source Chat du live et la source Alertes (10h-looks.js). */
const HWO_STYLES=['hw-screen','hw-cam','hw-lt','hw-border','hw-amb','hw-sub'];
let hwoFontAsked=false;
const hwoFont=px=>{if(!hwoFontAsked&&typeof loadFont==='function'){hwoFontAsked=true;loadFont('Creepster')}return Math.max(1,Math.round(px))+'px "Creepster", Impact, "Arial Black", sans-serif'};
function hwoText(g,s,x,y,maxW,px,fill,stroke,align){
  s=String(s||'');if(!s||maxW<=0)return 0;g.font=hwoFont(px);let tw=g.measureText(s).width;if(tw>maxW){px*=maxW/tw;g.font=hwoFont(px);tw=maxW}
  g.textAlign=align||'center';g.textBaseline='middle';g.lineJoin='round';
  if(stroke){g.lineWidth=px*.12;g.strokeStyle=stroke;g.strokeText(s,x,y)}g.fillStyle=fill;g.fillText(s,x,y);return tw;
}
const hwoFlick=(t,k)=>.6+.25*Math.sin(t*9+k)+.15*ovR(Math.floor(t*12),k); // bougie dans les citrouilles
/** brume (taches douces) entre y0 et y0 + dy, qui glisse lentement */
function hwoFog(g,x,y,w,h,t,y0,dy,n,col,al){for(let i=0;i<n;i++){const fx=x+((ovR(i,3)+t*.012*(i%2?1:-1))%1+1)%1*w,fy=y+h*(y0+dy*ovR(i,4)),fr=h*(.18+.12*ovR(i,5)),gr=g.createRadialGradient(fx,fy,0,fx,fy,fr);
  gr.addColorStop(0,'rgba('+col+','+al+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(fx-fr,fy-fr,fr*2,fr*2)}}
/** vol de chauves-souris (n), taille s */
function hwoBats(g,x,y,w,h,t,n,s,y0,dy){g.save();g.fillStyle='#0d0716';g.shadowColor='rgba(255,140,60,.55)';g.shadowBlur=s*.25;
  for(let i=0;i<n;i++){const p=((ovR(i,7)+t*(.04+.03*ovR(i,8)))%1.3)-.15,bx=x+w*(i%2?p:1-p),by=y+h*(y0+dy*ovR(i,9))+Math.sin(t*1.6+i)*h*.03;hwBat(g,bx,by,s*(.6+.8*ovR(i,6)),.25+.75*Math.sin(t*13+i*2))}g.restore()}
const HWO_DRAW={
  /* écran d'attente : nuit, pleine lune, arbre mort, tombes, brume, citrouilles, chauves-souris */
  'hw-screen'(g,x,y,w,h,t,o,e,u,key){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2');
    ovLowRes(g,key,x,y,w,h,.5,(g,x,y,w,h)=>{
      const sky=g.createLinearGradient(0,y,0,y+h);sky.addColorStop(0,'#07040f');sky.addColorStop(.55,'#1e0b3a');sky.addColorStop(.8,stRgba(c2,.55));sky.addColorStop(1,'#0b0614');
      g.fillStyle=sky;g.fillRect(x,y,w,h);
      for(let i=0;i<50;i++){g.globalAlpha=.25+.55*ovR(i,9)*(.6+.4*Math.sin(t*1.2+i));g.fillStyle='#fff';const s=Math.max(1,h*.0025);g.fillRect(x+w*ovR(i,1),y+h*.55*ovR(i,2),s,s)}g.globalAlpha=1;
      const mr=h*.17,mx=x+w*.74,my=y+h*.3,gl=g.createRadialGradient(mx,my,mr*.8,mx,my,mr*3);gl.addColorStop(0,'rgba(255,230,180,.35)');gl.addColorStop(1,'rgba(255,230,180,0)');g.fillStyle=gl;g.fillRect(mx-mr*3,my-mr*3,mr*6,mr*6);
      const mg=g.createRadialGradient(mx-mr*.3,my-mr*.3,mr*.1,mx,my,mr);mg.addColorStop(0,'#fffbeb');mg.addColorStop(.75,'#fde9b8');mg.addColorStop(1,'#f3cf8a');g.fillStyle=mg;g.beginPath();g.arc(mx,my,mr,0,OV_TAU);g.fill();
      g.fillStyle='rgba(180,140,80,.2)';for(const[dx,dy,r]of[[-.35,-.15,.2],[.25,.3,.15],[.3,-.35,.1],[-.1,.4,.12]]){g.beginPath();g.arc(mx+dx*mr,my+dy*mr,r*mr,0,OV_TAU);g.fill()}
      const hill=(base,amp,f,ph,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(x,y+h);for(let i=0;i<=40;i++)g.lineTo(x+w*i/40,y+h*base-Math.sin(i/40*Math.PI*f+ph)*h*amp);g.lineTo(x+w,y+h);g.closePath();g.fill()};
      hill(.74,.05,2.2,.4,'#1a0d2e');hill(.84,.04,3.1,1.7,'#0d0717');
      // arbre mort (branches qui se divisent), tombes
      g.strokeStyle='#0d0717';g.lineCap='round';
      const br=(bx,by,len,an,wd,d)=>{if(d>5)return;const ex=bx+Math.cos(an)*len,ey=by+Math.sin(an)*len;g.lineWidth=wd;g.beginPath();g.moveTo(bx,by);g.lineTo(ex,ey);g.stroke();
        br(ex,ey,len*.7,an-.45-ovR(d,1)*.2,wd*.65,d+1);br(ex,ey,len*.66,an+.38+ovR(d,2)*.2,wd*.65,d+1)};
      br(x+w*.12,y+h*.87,h*.2,-Math.PI/2-.08,h*.03,0);
      g.fillStyle='#120a1f';
      for(const[px,sc,cr]of[[.3,.9,0],[.4,.7,1],[.55,1,0],[.63,.75,1],[.88,.85,0]]){const tw=h*.06*sc,th=h*.09*sc,bx=x+w*px,by=y+h*.89;
        if(cr){g.fillRect(bx-tw*.12,by-th*1.25,tw*.24,th*1.25);g.fillRect(bx-tw*.45,by-th*.95,tw*.9,tw*.22)}
        else{g.beginPath();g.moveTo(bx-tw/2,by);g.lineTo(bx-tw/2,by-th*.6);g.arc(bx,by-th*.6,tw/2,Math.PI,0);g.lineTo(bx+tw/2,by);g.closePath();g.fill()}}
      hwoFog(g,x,y,w,h,t,.8,.14,9,'200,210,255',.16);
    });
    hwPumpkin(g,x+w*.2,y+h*.92,h*.07,hwoFlick(t,1));hwPumpkin(g,x+w*.78,y+h*.935,h*.055,hwoFlick(t,2));
    hwoBats(g,x,y,w,h,t,6,h*.035,.1,.35);
    g.save();g.shadowColor=c1;g.shadowBlur=h*.03;hwoText(g,String(o.t1||''),x+w/2,y+h*.56,w*.8,h*.1,c1,'rgba(20,6,30,.9)','center');g.restore();
    if(o.t2)ovText(g,o.t2,x+w/2,y+h*.66,w*.7,h*.04,600,'#f5f3ff','center');
  },
  /* cadre de webcam : bord sombre qui brille, toile dans le coin, araignée qui descend, citrouille posée sur le cadre */
  'hw-cam'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h),b=m*.06,r=m*.08;
    g.save();g.shadowColor=stRgba(c1,.6);g.shadowBlur=m*.08;ovRing(g,x,y,w,h,r,b);g.fillStyle='#160a24';g.fill('evenodd');g.shadowBlur=0;
    const lw=Math.max(1.5,m*.012);g.lineWidth=lw;g.strokeStyle=ovConic(g,t*.6,x+w/2,y+h/2,[[0,c1],[.5,c2],[1,c1]]);g.beginPath();g.roundRect(x+lw/2,y+lw/2,w-lw,h-lw,r);g.stroke();
    g.save();g.beginPath();g.roundRect(x+b,y+b,w-2*b,h-2*b,Math.max(0,r-b));g.clip();g.strokeStyle='rgba(235,235,245,.6)';g.lineWidth=Math.max(1,m*.005);hwWeb(g,x+b,y+b,0,m*.32);
    const sx=x+w-b-m*.16,sy=y+b+m*(.25+.12*Math.sin(t*.9));g.beginPath();g.moveTo(sx,y+b);g.lineTo(sx,sy-m*.03);g.stroke();hwSpider(g,sx,sy,m*.028,t);g.restore();
    hwPumpkin(g,x+b*1.6,y+h-b*1.2,m*.1,hwoFlick(t,3));
    const s=String(o.t1||'');if(s){const px=m*.075;g.font=ovFont(px,700);const tw=Math.min((w-2*b)*.7,g.measureText(s).width),pw=tw+px*1.6,ph=px*1.8,px0=x+(w-pw)/2+m*.06,py0=y+h-b-ph*1.25;
      g.fillStyle='rgba(22,10,36,.85)';g.beginPath();g.roundRect(px0,py0,pw,ph,ph/2);g.fill();g.lineWidth=Math.max(1,px*.08);g.strokeStyle=c1;g.stroke();ovText(g,s,px0+px*.8,py0+ph/2,tw,px,700,'#fff','left')}
    g.restore();
  },
  /* bandeau de nom : citrouille, coulures orange en haut, nom écrit en lettres qui font peur */
  'hw-lt'(g,x,y,w,h,t,o,e){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),k=ovEase(e==null?1:e),r=h*.22;
    g.save();g.globalAlpha=k;g.translate((1-k)*-w*.25,0);
    g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=h*.25;g.fillStyle='#160a24';g.beginPath();g.roundRect(x+h*.55,y+h*.08,w-h*.55,h*.84,r);g.fill();g.shadowBlur=0;
    g.lineWidth=Math.max(1.5,h*.035);g.strokeStyle=ovConic(g,t*.5,x+w/2,y+h/2,[[0,c1],[.5,c2],[1,c1]]);g.stroke();
    g.fillStyle=c1;for(let i=0;i<6;i++){const px=x+h*.95+(w-h*1.3)*(i+.5)/6,L=h*(.06+.12*(.5+.5*Math.sin(t*1.3+i*1.7))),dw=h*.035,y0=y+h*.09;
      g.beginPath();g.moveTo(px-dw*1.6,y0);g.quadraticCurveTo(px-dw,y0+dw*.3,px-dw*.7,y0+L);g.arc(px,y0+L,dw*.7,Math.PI,0,true);g.quadraticCurveTo(px+dw,y0+dw*.3,px+dw*1.6,y0);g.closePath();g.fill()}
    hwPumpkin(g,x+h*.5,y+h*.55,h*.36,hwoFlick(t,4));
    hwoText(g,String(o.t1||''),x+h*1.05,y+h*(o.t2?.42:.54),w-h*1.4,h*.34,c1,'rgba(10,4,20,.9)','left');
    if(o.t2)ovText(g,o.t2,x+h*1.07,y+h*.74,w-h*1.4,h*.17,600,'#f5f3ff','left');
    g.restore();
  },
  /* contour d'écran (milieu transparent) : toiles dans les coins du haut, araignées, citrouilles en bas, bords qui luisent */
  'hw-border'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1'),c2=ovC(o,'c2'),m=Math.min(w,h);
    g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    const vg=g.createRadialGradient(x+w/2,y+h/2,m*.42,x+w/2,y+h/2,Math.hypot(w,h)*.55);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.75,stRgba(c2,.18));vg.addColorStop(1,stRgba(c1,.35));g.fillStyle=vg;g.fillRect(x,y,w,h);
    g.strokeStyle='rgba(235,235,245,.55)';g.lineWidth=Math.max(1,m*.0025);hwWeb(g,x,y,0,m*.3);hwWeb(g,x+w,y,Math.PI/2,m*.26);
    for(const[px,ph]of[[.18,0],[.83,2]]){const sx=x+w*px,sy=y+m*(.2+.08*Math.sin(t*.8+ph));g.beginPath();g.moveTo(sx,y);g.lineTo(sx,sy-m*.02);g.stroke();hwSpider(g,sx,sy,m*.016,t+ph)}
    hwPumpkin(g,x+m*.09,y+h-m*.05,m*.075,hwoFlick(t,5));hwPumpkin(g,x+w-m*.09,y+h-m*.05,m*.065,hwoFlick(t,6));
    const ph=(t%9)/9;if(ph<.4){const q=ph/.4;g.fillStyle='#0d0716';g.shadowColor='rgba(255,140,60,.55)';g.shadowBlur=m*.01;hwBat(g,x-w*.1+q*w*1.2,y+h*(.12+.05*Math.sin(q*12)),m*.035,.25+.75*Math.sin(t*14));g.shadowBlur=0}
    g.restore();
  },
  /* ambiance : chauves-souris, bonbons qui tombent, brume en bas */
  'hw-amb'(g,x,y,w,h,t,o){
    const m=Math.min(w,h);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    hwoFog(g,x,y,w,h,t,.86,.12,10,'190,255,205',.2);
    for(let i=0;i<14;i++){const sp=.07+ovR(i,2)*.08,py=y+h*(((ovR(i,3)+t*sp)%1.15)-.07),px=x+w*(ovR(i,1)+Math.sin(t*1.3+i)*.015),s=m*(.014+.01*ovR(i,4)),rr=t*(1+ovR(i,5)*2)*(i%2?1:-1)+i;
      g.save();g.translate(px,py);g.rotate(rr);if(i%3===0)hwCandyCorn(g,s);else hwWrapped(g,s,HW_CANDY[i%HW_CANDY.length]);g.restore()}
    hwoBats(g,x,y,w,h,t,5,m*.035,.08,.3);
    g.restore();
  },
  /* rappel « Abonne-toi » : citrouille, texte, petite chauve-souris */
  'hw-sub'(g,x,y,w,h,t,o){
    const c1=ovC(o,'c1');g.save();g.fillStyle='rgba(22,10,36,.9)';g.beginPath();g.roundRect(x,y,w,h,h*.3);g.fill();g.lineWidth=Math.max(1,h*.05);g.strokeStyle=c1;g.stroke();
    hwPumpkin(g,x+h*.5,y+h*.55,h*.3,hwoFlick(t,7));
    ovText(g,String(o.t1||''),x+h*.95,y+h/2,w-h*1.7,h*.42,800,'#fff','left');
    g.fillStyle='#0d0716';g.shadowColor='rgba(255,140,60,.6)';g.shadowBlur=h*.1;hwBat(g,x+w-h*.5,y+h*.45+Math.sin(t*2)*h*.06,h*.3,.25+.75*Math.sin(t*12));
    g.restore();
  }
};

/* ---------- studio (Live / Enregistrer) : nouvelle famille de la source « Overlay » ---------- */
Object.assign(OV_DRAW,HWO_DRAW);
OV_CATS.halloween=HWO_STYLES.slice();for(const s of HWO_STYLES)OV_CAT[s]='halloween';
// pendant la saison d'Halloween, la famille passe en tête de la galerie
if(hwSeason()){const e=Object.entries(OV_CATS);for(const[k]of e)delete OV_CATS[k];OV_CATS.halloween=HWO_STYLES.slice();for(const[k,v]of e)if(k!=='halloween')OV_CATS[k]=v}
Object.assign(OV_R,{'hw-screen':OV_FULL,'hw-border':OV_FULL,'hw-amb':OV_FULL,'hw-cam':{x:.765,y:.58,w:.21,h:.37},'hw-lt':{x:.03,y:.76,w:.42,h:.13},'hw-sub':{x:.76,y:.06,w:.21,h:.09}});
Object.assign(OV_TX,{'hw-screen':['ov.d.soon','ov.d.soon2'],'hw-cam':['',''],'hw-lt':['ov.d.name','ov.d.role'],'hw-border':['',''],'hw-amb':['',''],'hw-sub':['ov.d.sub','']});
for(const s of HWO_STYLES)OV_COL[s]=['#f97316','#a855f7'];
Object.assign(OV_NTX,{'hw-screen':2,'hw-cam':1,'hw-lt':2,'hw-border':0,'hw-amb':0,'hw-sub':1});
// styles « Halloween » du chat et des alertes (police Creepster pour les alertes seulement : le chat reste facile à lire)
ST_LOOKS.chat.halloween={bg:'#1a0b2e',bgp:86,rad:22,txt:'#ffedd5',names:'custom',nameCol:'#fb923c',bar:false,bw:2,glow:true,anim:'pop'};
ST_LOOKS.alerts.halloween={font:'Creepster',col:'#fb923c',bg:'#1a0b2e',bgp:94,txt:'#ffedd5',rad:16,bw:3,glow:true,confetti:true,anim:'drop'};

/* ---------- Montage : les mêmes dessins dans l'élément « Overlay » (gen 'ovl', 11b-gamehud.js) ---------- */
Object.assign(OVL_P,{'hw-screen':{x:50,y:50,w:100,h:100},'hw-border':{x:50,y:50,w:100,h:100},'hw-amb':{x:50,y:50,w:100,h:100},'hw-cam':{x:85.5,y:76.5,w:21,h:37},'hw-lt':{x:24,y:82.5,w:42,h:13},'hw-sub':{x:86.5,y:10.5,w:21,h:9}});
WSTY.ovl.push(...HWO_STYLES);
WINSP.ovl[1][4].push('hw-screen','hw-cam','hw-lt','hw-sub');WINSP.ovl[2][4].push('hw-screen','hw-lt');
if(hwSeason())WCATS.unshift('halloween');else WCATS.push('halloween');
for(const s of HWO_STYLES){const d=ovlDefs(s),k=ovTx(s);
  WLIB.push({c:'halloween',g:'ovl',s,n:'ov.s.'+s,p:Object.assign({},d,{t1:k[0]?()=>T(k[0]):'',t2:k[1]?()=>T(k[1]):''}),tt:s==='hw-lt'?1.2:2.2})}

// v4.18 : masque « Dessin libre » (contour tracé à la souris sur l'aperçu, en % de l'image ; position / taille / adoucir / inverser). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

/* rendu */
rep("const hasMask=p=>p.mask&&p.mask.type&&p.mask.type!=='none';",
    "const hasMask=p=>p.mask&&p.mask.type&&p.mask.type!=='none'&&(p.mask.type!=='free'||(Array.isArray(p.mask.pts)&&p.mask.pts.length>2));\n/* contour lissé passant par les milieux des points */\nfunction smoothPath(g,P){g.moveTo((P[0][0]+P[P.length-1][0])/2,(P[0][1]+P[P.length-1][1])/2);for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];g.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}g.closePath()}");
rep("  else if(k.type==='rect')kctx.roundRect(cx-w/2,cy-h/2,Math.max(1,w),Math.max(1,h),Math.min(w,h)/2*(k.r||0)/100);\n  else{",
    "  else if(k.type==='rect')kctx.roundRect(cx-w/2,cy-h/2,Math.max(1,w),Math.max(1,h),Math.min(w,h)/2*(k.r||0)/100);\n  else if(k.type==='free'){const sx=(k.w??100)/100,sy=(k.h??100)/100;smoothPath(kctx,k.pts.map(([x,y])=>[cx+(W*x/100-W/2)*sx,cy+(H*y/100-H/2)*sy]))}\n  else{");

/* panneau Masque */
rep("[['none',T('common.none')],['circle',T('shape.circle')],['rect',T('shape.rect')],['linear',T('mask.linear')]].map(([v,n])=>`<button data-mask=\"${v}\" class=\"${t===v?'on':''}\">${n}</button>`).join('')}</div>`+(t==='none'?'<p class=\"hint\" style=\"margin:0\">'+T('mask.hint')+'</p>':",
    "[['none',T('common.none')],['circle',T('shape.circle')],['rect',T('shape.rect')],['linear',T('mask.linear')],['free',T('mask.free')]].map(([v,n])=>`<button data-mask=\"${v}\" class=\"${t===v?'on':''}\">${n}</button>`).join('')}</div>`+(t==='none'?'<p class=\"hint\" style=\"margin:0\">'+T('mask.hint')+'</p>':t==='free'?`<div class=\"pre\" style=\"margin:0 0 8px\"><button class=\"pri\" data-act=\"maskdraw\">${T(p.mask.pts&&p.mask.pts.length>2?'mask.redraw':'mask.draw')}</button></div><p class=\"hint\" style=\"margin:0 0 8px\">${T(p.mask.pts&&p.mask.pts.length>2?'mask.freeHint':'mask.drawHint')}</p>`+(p.mask.pts&&p.mask.pts.length>2?`<div class=\"two\">${R(T('mask.cx'),'p.mask.x',0,100)}${R(T('mask.cy'),'p.mask.y',0,100)}</div><div class=\"two\">${R(T('insp.widthPct'),'p.mask.w',10,300)}${R(T('insp.heightPct'),'p.mask.h',10,300)}</div>`+R(T('mask.feather'),'p.mask.feather',0,100)+CK(T('mask.invert'),'p.mask.inv'):''):");
rep("  if(d.mask){c.p.mask=c.p.mask||maskDefaults();c.p.mask.type=d.mask;commit();renderInspector()}",
    "  if(d.mask){c.p.mask=c.p.mask||maskDefaults();const was=c.p.mask.type;c.p.mask.type=d.mask;if(d.mask==='free'&&was!=='free'){Object.assign(c.p.mask,{x:50,y:50,w:100,h:100})}commit();renderInspector();if(d.mask==='free'&&!(c.p.mask.pts&&c.p.mask.pts.length>2))startMaskDraw(c)}");
rep("silence:()=>cutSilences(c),", "silence:()=>cutSilences(c),maskdraw:()=>startMaskDraw(c),");

/* tracé à la souris sur l'aperçu */
rep("/* ---------- guides d'aperçu (grille des tiers, centre, marges, zones cachées par les applis) ---------- */",
`/* ---------- masque « Dessin libre » : tracé à la souris sur l'aperçu ---------- */
var mdraw=null;
const mdc=document.createElement('canvas');mdc.id='mdraw';$('#vwrap').appendChild(mdc);
function startMaskDraw(c){if(!c)return;pause();mdraw={id:c.id,pts:[],on:false};cv.classList.add('drawing');mdc.style.display='block';mdrawPaint();toast(T('mask.drawHint'))}
function stopMaskDraw(){mdraw=null;cv.classList.remove('drawing');mdc.style.display='none'}
function mdrawPt(e){const r=cv.getBoundingClientRect();return[clamp((e.clientX-r.left)/r.width*100,-5,105),clamp((e.clientY-r.top)/r.height*100,-5,105)]}
function mdrawPaint(){
  const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  mdc.style.left=cv.style.left;mdc.style.top=cv.style.top;mdc.style.width=w+'px';mdc.style.height=h+'px';mdc.width=Math.round(w*d);mdc.height=Math.round(h*d);
  const g=mdc.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,w,h);
  if(!mdraw||mdraw.pts.length<2)return;
  const P=mdraw.pts.map(([x,y])=>[x*w/100,y*h/100]);
  g.beginPath();g.moveTo(P[0][0],P[0][1]);for(const q of P)g.lineTo(q[0],q[1]);if(!mdraw.on)g.closePath();
  g.fillStyle='rgba(255,255,255,.18)';g.fill();g.lineWidth=2;g.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--ac').trim()||'#a78bfa';g.stroke();
}
cv.addEventListener('pointerdown',e=>{if(!mdraw)return;e.stopImmediatePropagation();e.preventDefault();cv.setPointerCapture(e.pointerId);mdraw.on=true;mdraw.pts=[mdrawPt(e)];mdrawPaint()},true);
cv.addEventListener('pointermove',e=>{if(!mdraw||!mdraw.on)return;e.stopImmediatePropagation();const q=mdrawPt(e),l=mdraw.pts[mdraw.pts.length-1];if(Math.hypot(q[0]-l[0],q[1]-l[1])>.6)mdraw.pts.push(q);mdrawPaint()},true);
cv.addEventListener('pointerup',e=>{
  if(!mdraw||!mdraw.on)return;e.stopImmediatePropagation();mdraw.on=false;
  let P=mdraw.pts;const c=clips.find(x=>x.id===mdraw.id);
  const xs=P.map(q=>q[0]),ys=P.map(q=>q[1]);
  if(P.length<4||Math.max(...xs)-Math.min(...xs)<3||Math.max(...ys)-Math.min(...ys)<3){toast(T('mask.tooSmall'));mdraw.pts=[];mdrawPaint();return}
  if(P.length>400){const s=P.length/400;P=Array.from({length:400},(_,i)=>P[Math.floor(i*s)])}
  if(c){c.p.mask=Object.assign(c.p.mask||maskDefaults(),{type:'free',pts:P.map(([x,y])=>[Math.round(x*100)/100,Math.round(y*100)/100]),x:50,y:50,w:100,h:100});commit();refresh()}
  stopMaskDraw();renderInspector();
},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&mdraw){e.stopImmediatePropagation();stopMaskDraw()}},true);

/* ---------- guides d'aperçu (grille des tiers, centre, marges, zones cachées par les applis) ---------- */`);
rep("  drawGuides();\n}", "  drawGuides();if(mdraw)mdrawPaint();\n}");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('#mdraw{')) {
  css += `
/* masque « Dessin libre » : calque de tracé */
#mdraw{position:absolute;z-index:3;pointer-events:none;display:none}
#cv.drawing{cursor:crosshair}
`;
  fs.writeFileSync(C, css);
}
console.log('masque dessin libre ajouté');

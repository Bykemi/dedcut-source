/* ---------- dessin à main levée sur la vidéo (v4.36) : tu dessines sur l'aperçu, DedCut le retrace comme si on écrivait ---------- */
var WACTS={};
const SCR_DEMO=[[[20,62],[24,55],[30,50],[37,48],[44,50],[50,55],[54,62],[57,68],[62,71],[68,70],[74,64],[78,56],[80,48]],[[72,46],[80,48],[82,56]]];
const SCR_OLD=['sc_marker','sc_high','sc_chalk','sc_neon','sc_brush','sc_dotted','sc_double','sc_rainbow'];
const scrRnd=i=>{const v=Math.sin(i*12.9898+78.233)*43758.5453;return v-Math.floor(v)};
/* trace un chemin (liste de points en px) avec décalage/tremblement facultatifs */
function scrLine(P,o){o=o||{};const j=o.jit||0,sd=o.seed||0,dx=o.dx||0,dy=o.dy||0;
  P.forEach((s,si)=>{if(s.length<2)return;ctx.beginPath();s.forEach(([x,y],i)=>{const jx=j?(scrRnd(sd+si*997+i*1.7)-.5)*j:0,jy=j?(scrRnd(sd+si*991+i*2.3+5)-.5)*j:0;i?ctx.lineTo(x+dx+jx,y+dy+jy):ctx.moveTo(x+dx+jx,y+dy+jy)});ctx.stroke()})}
/* appelle fn tous les « step » pixels le long des traits */
function scrAlong(P,step,fn){let n=0;P.forEach(s=>{let acc=step;for(let i=1;i<s.length;i++){const [ax,ay]=s[i-1],[bx,by]=s[i],d=Math.hypot(bx-ax,by-ay),an=Math.atan2(by-ay,bx-ax);let u=step-acc;while(u<=d){fn(ax+(bx-ax)*u/d,ay+(by-ay)*u/d,n++,an);u+=step}acc=d-(u-step)}})}
function scrShape(k,x,y,r,an){ctx.beginPath();
  if(k==='star'){for(let i=0;i<10;i++){const a=an+i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}
  else if(k==='heart'){ctx.moveTo(x,y+r*.9);ctx.bezierCurveTo(x-r*1.4,y,x-r*.6,y-r*1.1,x,y-r*.35);ctx.bezierCurveTo(x+r*.6,y-r*1.1,x+r*1.4,y,x,y+r*.9)}
  else if(k==='sq')ctx.rect(x-r,y-r,r*2,r*2);else ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
WDRAW.scribble=(c,p,loc)=>{
  const S=(p.strokes&&p.strokes.length?p.strokes:SCR_DEMO),st=p.st||'sc_marker',col=p.color||'#facc15',lw=Math.max(1.5,H*(p.th??1)/100),q=clamp(loc/Math.max(.1,p.draw??1.5),0,1),out=clamp((c.dur-loc)/.3,0,1);
  const lens=S.map(s=>{let l=0;for(let i=1;i<s.length;i++)l+=Math.hypot((s[i][0]-s[i-1][0])*W/100,(s[i][1]-s[i-1][1])*H/100);return l}),tot=lens.reduce((a,b)=>a+b,0)||1;let left=tot*q;
  /* parties déjà « écrites » des traits, en pixels */
  const P=[];for(const s of S){if(left<=0||s.length<2)break;const o=[[s[0][0]*W/100,s[0][1]*H/100]];
    for(let i=1;i<s.length;i++){const ax=s[i-1][0]*W/100,ay=s[i-1][1]*H/100,bx=s[i][0]*W/100,by=s[i][1]*H/100,d=Math.hypot(bx-ax,by-ay);if(d>=left){const f=left/d;o.push([ax+(bx-ax)*f,ay+(by-ay)*f]);left=0;break}o.push([bx,by]);left-=d}P.push(o)}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach(s=>s.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}));
  ctx.globalAlpha*=out;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=lw;
  const A0=ctx.globalAlpha,grad=cs=>{const g=ctx.createLinearGradient(x0<1e9?x0:0,y0<1e9?y0:0,x1>-1e9?x1:W,y1>-1e9?y1:H);cs.forEach((cc,i)=>g.addColorStop(i/(cs.length-1),cc));return g};
  if(SCR_OLD.includes(st)){
    if(st==='sc_high'){ctx.globalCompositeOperation='multiply';ctx.globalAlpha*=.5;ctx.lineWidth=lw*5;ctx.lineCap='butt'}
    if(st==='sc_neon'){ctx.shadowColor=col;ctx.shadowBlur=lw*3}
    if(st==='sc_chalk'){ctx.setLineDash([lw*.6,lw*.35]);ctx.globalAlpha*=.9;scrLine(P);ctx.setLineDash([]);ctx.globalAlpha=A0;ctx.lineWidth=lw*.5;scrLine(P)}
    else if(st==='sc_brush'){ctx.lineWidth=lw*1.6;scrLine(P)}
    else if(st==='sc_dotted'){ctx.setLineDash([.01,lw*1.8]);ctx.lineWidth=lw*1.3;scrLine(P);ctx.setLineDash([])}
    else if(st==='sc_double'){ctx.strokeStyle='#ffffff';ctx.lineWidth=lw*2.6;scrLine(P);ctx.strokeStyle=col;ctx.lineWidth=lw*1.3;scrLine(P)}
    else if(st==='sc_rainbow'){const g=ctx.createLinearGradient(x0<1e9?x0:0,0,x1>-1e9?x1:W,0);['#ef4444','#f59e0b','#facc15','#22c55e','#3b82f6','#a855f7'].forEach((cc,i)=>g.addColorStop(i/5,cc));ctx.strokeStyle=g;ctx.lineWidth=lw*1.3;scrLine(P)}
    else scrLine(P);
    if(st==='sc_neon'){ctx.shadowBlur=0;ctx.strokeStyle='#ffffff';ctx.lineWidth=lw*.35;scrLine(P)}
  } else (SCR_FX[st]||SCR_FX.sc_pencil)(P,col,lw,loc,grad,A0);
  ctx.shadowBlur=0;ctx.setLineDash([]);
  if(x1>x0)boxes.set(c.id,{x:x0-lw,y:y0-lw,w:x1-x0+lw*2,h:y1-y0+lw*2,rot:0});else boxes.set(c.id,{x:W*.4,y:H*.4,w:W*.2,h:H*.2,rot:0});
};
/* v4.36 (3) : 30 styles de plus — jamais de « destination-out » (ça effacerait la vidéo) */
const SCR_FX={
  sc_pencil:(P,col,lw,t,g,A)=>{ctx.lineWidth=lw*.45;ctx.globalAlpha=A*.55;for(let k=0;k<3;k++)scrLine(P,{jit:lw*.5,seed:k*31})},
  sc_crayon:(P,col,lw,t,g,A)=>{ctx.lineCap='butt';for(let k=0;k<4;k++){ctx.globalAlpha=A*.45;ctx.lineWidth=lw*.5;ctx.setLineDash([lw*(.4+k*.15),lw*.25]);scrLine(P,{jit:lw*.7,seed:k*17})}},
  sc_sketch:(P,col,lw,t,g,A)=>{ctx.lineWidth=lw*.6;ctx.globalAlpha=A*.8;for(let k=0;k<3;k++)scrLine(P,{jit:lw*1.6,seed:k*53})},
  sc_calli:(P,col,lw)=>{P.forEach(s=>{for(let i=1;i<s.length;i++){const [ax,ay]=s[i-1],[bx,by]=s[i],a=Math.atan2(by-ay,bx-ax);ctx.lineWidth=lw*(.35+1.6*Math.abs(Math.sin(a-Math.PI/4)));ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke()}})},
  sc_ink:(P,col,lw)=>{P.forEach(s=>{const n=s.length;for(let i=1;i<n;i++){const f=Math.sin(Math.PI*i/n);ctx.lineWidth=lw*(.25+1.6*f);ctx.beginPath();ctx.moveTo(...s[i-1]);ctx.lineTo(...s[i]);ctx.stroke()}})},
  sc_spray:(P,col,lw)=>scrAlong(P,lw*.5,(x,y,i)=>{for(let k=0;k<5;k++){const a=scrRnd(i*7+k)*6.283,r=scrRnd(i*13+k*3)*lw*1.6;ctx.globalAlpha=.25+scrRnd(i+k*11)*.6;ctx.fillRect(x+Math.cos(a)*r,y+Math.sin(a)*r,lw*.18+1,lw*.18+1)}}),
  sc_glitter:(P,col,lw,t,g,A)=>{ctx.lineWidth=lw*.8;scrLine(P);const cs=['#ffffff','#fde68a','#f9a8d4','#a5f3fc'];scrAlong(P,lw*.9,(x,y,i)=>{const tw=.5+.5*Math.sin(t*9+i*1.7);ctx.globalAlpha=A*tw;ctx.fillStyle=cs[i%4];scrShape('star',x+(scrRnd(i)-.5)*lw*2.2,y+(scrRnd(i+9)-.5)*lw*2.2,lw*(.35+.4*scrRnd(i+3)),t*2)})},
  sc_shadow:(P,col,lw,t,g,A)=>{ctx.strokeStyle='rgba(0,0,0,.55)';scrLine(P,{dx:lw*.6,dy:lw*.7});ctx.strokeStyle=col;scrLine(P)},
  sc_3d:(P,col,lw)=>{ctx.strokeStyle='#111827';for(let k=5;k>0;k--)scrLine(P,{dx:k*lw*.18,dy:k*lw*.18});ctx.strokeStyle=col;scrLine(P)},
  sc_outline:(P,col,lw)=>{ctx.strokeStyle='#000000';ctx.lineWidth=lw*1.9;scrLine(P);ctx.strokeStyle=col;ctx.lineWidth=lw;scrLine(P)},
  sc_fire:(P,col,lw,t,g)=>{ctx.shadowColor='#f97316';ctx.shadowBlur=lw*(3+Math.sin(t*12));ctx.strokeStyle=g(['#dc2626','#f97316','#facc15']);ctx.lineWidth=lw*1.3;scrLine(P,{jit:lw*.25,seed:Math.floor(t*12)});ctx.shadowBlur=0;ctx.strokeStyle='#fef08a';ctx.lineWidth=lw*.35;scrLine(P)},
  sc_ice:(P,col,lw)=>{ctx.shadowColor='#67e8f9';ctx.shadowBlur=lw*2.5;ctx.strokeStyle='#22d3ee';ctx.lineWidth=lw*1.2;scrLine(P);ctx.shadowBlur=0;ctx.strokeStyle='#ecfeff';ctx.lineWidth=lw*.45;scrLine(P)},
  sc_gold:(P,col,lw,t,g)=>{ctx.strokeStyle=g(['#92400e','#fbbf24','#fef3c7','#d97706','#fbbf24']);ctx.lineWidth=lw*1.2;scrLine(P);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=lw*.25;scrLine(P,{dx:-lw*.2,dy:-lw*.25})},
  sc_pastel:(P,col,lw,t,g,A)=>{ctx.globalAlpha=A*.85;ctx.strokeStyle=g(['#f9a8d4','#c4b5fd','#93c5fd','#a7f3d0']);ctx.lineWidth=lw*1.8;scrLine(P)},
  sc_dash:(P,col,lw)=>{ctx.lineCap='butt';ctx.setLineDash([lw*2.4,lw*1.3]);scrLine(P)},
  sc_dashdot:(P,col,lw)=>{ctx.setLineDash([lw*2.2,lw*1.2,.01,lw*1.2]);scrLine(P)},
  sc_arrow:(P,col,lw)=>{scrLine(P);P.forEach(s=>{if(s.length<2)return;const [bx,by]=s[s.length-1];let k=s.length-2;while(k>0&&Math.hypot(bx-s[k][0],by-s[k][1])<lw*2)k--;const a=Math.atan2(by-s[k][1],bx-s[k][0]),r=lw*3.2;ctx.beginPath();ctx.moveTo(bx+Math.cos(a)*r*.5,by+Math.sin(a)*r*.5);ctx.lineTo(bx+Math.cos(a+2.5)*r,by+Math.sin(a+2.5)*r);ctx.lineTo(bx+Math.cos(a-2.5)*r,by+Math.sin(a-2.5)*r);ctx.closePath();ctx.fill()})},
  sc_stitch:(P,col,lw)=>{ctx.lineWidth=lw*1.6;scrLine(P);ctx.strokeStyle='#ffffff';ctx.lineWidth=lw*.25;ctx.lineCap='butt';ctx.setLineDash([lw*.8,lw*.6]);scrLine(P)},
  sc_laser:(P,col,lw,t)=>{ctx.shadowColor='#ef4444';ctx.shadowBlur=lw*(2.5+1.5*Math.abs(Math.sin(t*25)));ctx.strokeStyle='#ef4444';ctx.lineWidth=lw*.7;scrLine(P);ctx.shadowBlur=0;ctx.strokeStyle='#fff1f2';ctx.lineWidth=lw*.25;scrLine(P)},
  sc_electric:(P,col,lw,t)=>{const f=Math.floor(t*15);ctx.shadowColor='#a5b4fc';ctx.shadowBlur=lw*3;ctx.strokeStyle='#818cf8';ctx.lineWidth=lw*.6;scrLine(P,{jit:lw*2.2,seed:f*7});ctx.shadowBlur=0;ctx.strokeStyle='#ffffff';ctx.lineWidth=lw*.3;scrLine(P,{jit:lw*1.2,seed:f*7+3})},
  sc_bubble:(P,col,lw)=>{ctx.lineWidth=Math.max(1,lw*.25);scrAlong(P,lw*1.6,(x,y,i)=>{const r=lw*(.4+.5*scrRnd(i));ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.stroke();ctx.globalAlpha*=.5;ctx.fillStyle='#ffffff';scrShape('o',x-r*.35,y-r*.35,r*.22);ctx.globalAlpha*=2;ctx.fillStyle=col})},
  sc_stars:(P,col,lw,t)=>scrAlong(P,lw*2.2,(x,y,i)=>scrShape('star',x,y,lw*(.8+.25*Math.sin(t*6+i)),i*.4)),
  sc_hearts:(P,col,lw,t)=>scrAlong(P,lw*2.3,(x,y,i)=>scrShape('heart',x,y,lw*(.8+.15*Math.sin(t*8+i)),0)),
  sc_ribbon:(P,col,lw)=>{ctx.lineWidth=lw*.4;P.forEach(s=>{for(const sg of[-1,1]){ctx.beginPath();s.forEach(([x,y],i)=>{const j=Math.min(i+1,s.length-1),h=Math.max(i-1,0),a=Math.atan2(s[j][1]-s[h][1],s[j][0]-s[h][0])+Math.PI/2,d=sg*lw*.9;i?ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d)});ctx.stroke()}})},
  sc_tape:(P,col,lw,t,g,A)=>{ctx.lineCap='butt';ctx.globalAlpha=A*.8;ctx.lineWidth=lw*3;scrLine(P);ctx.globalAlpha=A*.35;ctx.strokeStyle='#ffffff';ctx.setLineDash([lw*.5,lw*.9]);ctx.lineWidth=lw*3;scrLine(P)},
  sc_water:(P,col,lw,t,g,A)=>{for(let k=0;k<4;k++){ctx.globalAlpha=A*.22;ctx.lineWidth=lw*(1.4+k*.5);scrLine(P,{jit:lw*.9,seed:k*41})}},
  sc_glow:(P,col,lw,t,g,A)=>{ctx.shadowColor=col;ctx.shadowBlur=lw*5;ctx.globalAlpha=A*.7;ctx.lineWidth=lw*1.5;scrLine(P);ctx.globalAlpha=A*.4;scrLine(P)},
  sc_pixel:(P,col,lw)=>{const gsz=lw*1.2;const seen=new Set();scrAlong(P,gsz*.5,(x,y)=>{const gx=Math.round(x/gsz),gy=Math.round(y/gsz),k=gx+','+gy;if(seen.has(k))return;seen.add(k);ctx.fillRect(gx*gsz-gsz/2,gy*gsz-gsz/2,gsz,gsz)})},
  sc_comic:(P,col,lw)=>{ctx.strokeStyle='#000000';ctx.lineWidth=lw*2.2;scrLine(P,{dx:lw*.3,dy:lw*.35});ctx.lineWidth=lw*1.9;scrLine(P);ctx.strokeStyle=col;ctx.lineWidth=lw*1.2;scrLine(P);ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=lw*.25;scrLine(P,{dx:-lw*.2,dy:-lw*.25})},
  sc_duo:(P,col,lw,t,g)=>{ctx.strokeStyle=g([col,'#ec4899']);ctx.lineWidth=lw*1.3;scrLine(P)}
};
WSTY.scribble=[...SCR_OLD,...Object.keys(SCR_FX)];
WDEF.scribble=()=>({dur:5,p:{st:'sc_marker',strokes:[],color:'#facc15',th:1,draw:1.5,x:50,y:50,op:100}});
WINSP.scribble=[['st','st'],['scrdraw','btn','draw.start'],['scrclear','btn','draw.clear'],['color','col','common.color'],['th','num','wdg.thick',[.2,5,.05]],['draw','num','draw.dur',[0,20,.1]],['hint','hint','draw.hint']];
GN.scribble='draw.g';
/* mode dessin : chaque trait tracé sur l'aperçu est ajouté ; Échap ou « Terminé » pour finir */
let sdraw=null;
function startScribble(c){
  if(!c)return;pause();sdraw={id:c.id,cur:null};cv.classList.add('drawing');mdc.style.display='block';scrPaint();
  let b=$('#scrDone');if(!b){b=document.createElement('button');b.id='scrDone';b.className='pri';$('#vwrap').appendChild(b);b.onclick=stopScribble}b.textContent='✓ '+T('draw.done');b.style.display='block';toast(T('draw.hint'));
}
function stopScribble(){sdraw=null;cv.classList.remove('drawing');mdc.style.display='none';const b=$('#scrDone');if(b)b.style.display='none';renderInspector()}
function scrPaint(){
  const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  mdc.style.left=cv.style.left;mdc.style.top=cv.style.top;mdc.style.width=w+'px';mdc.style.height=h+'px';mdc.width=Math.round(w*d);mdc.height=Math.round(h*d);
  const g=mdc.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(0,0,w,h);
  const c=sdraw&&clips.find(x=>x.id===sdraw.id);if(!c)return;const S=[...(c.p.strokes||[]),...(sdraw.cur?[sdraw.cur]:[])];
  g.strokeStyle=c.p.color||'#facc15';g.lineWidth=Math.max(2,h*(c.p.th??1)/100);g.lineCap='round';g.lineJoin='round';
  S.forEach(s=>{if(s.length<2)return;g.beginPath();g.moveTo(s[0][0]*w/100,s[0][1]*h/100);s.forEach(([x,y])=>g.lineTo(x*w/100,y*h/100));g.stroke()});
}
cv.addEventListener('pointerdown',e=>{if(!sdraw)return;e.stopImmediatePropagation();e.preventDefault();cv.setPointerCapture(e.pointerId);sdraw.cur=[mdrawPt(e)];scrPaint()},true);
cv.addEventListener('pointermove',e=>{if(!sdraw||!sdraw.cur)return;e.stopImmediatePropagation();const q=mdrawPt(e),l=sdraw.cur[sdraw.cur.length-1];if(Math.hypot(q[0]-l[0],q[1]-l[1])>.35)sdraw.cur.push(q);scrPaint()},true);
cv.addEventListener('pointerup',e=>{if(!sdraw||!sdraw.cur)return;e.stopImmediatePropagation();const c=clips.find(x=>x.id===sdraw.id);let s=sdraw.cur;sdraw.cur=null;
  if(c&&s.length>1){if(s.length>300){const k=s.length/300;s=Array.from({length:300},(_,i)=>s[Math.floor(i*k)])}c.p.strokes=[...(c.p.strokes||[]),s.map(([x,y])=>[Math.round(x*100)/100,Math.round(y*100)/100])];commit()}scrPaint()},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&sdraw){e.stopImmediatePropagation();stopScribble()}},true);
WACTS.scrdraw=c=>startScribble(c);
WACTS.scrclear=c=>{c.p.strokes=[];commit();refresh();if(sdraw)scrPaint()};

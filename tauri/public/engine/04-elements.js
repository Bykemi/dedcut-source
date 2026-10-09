/* ---------- éléments (style hacker) ---------- */
const hexA=(h,al)=>{const n=parseInt(String(h||'#000000').slice(1,7),16)||0;return`rgba(${n>>16&255},${n>>8&255},${n&255},${al})`};
const GN={pbar:'wdg.pbar',count:'wdg.count',timer:'wdg.timer',sub:'wdg.sub',lower:'wdg.lower',chat:'wdg.chat',hearts:'wdg.hearts',confetti:'wdg.confetti',rec:'wdg.rec',pin:'wdg.pin',swipe:'wdg.swipe',stars:'wdg.stars',pulse:'wdg.pulse',arrowp:'wdg.arrowp',spin:'wdg.spin',matrix:'gen.matrix',color:'gen.color',grad:'gen.grad',terminal:'gen.terminal',hackbar:'gen.progress',hud:'gen.hud',shape:'common.shape'};
function genDefaults(g){
  if(g==='terminal')return{dur:5,p:{text:T('gen.termText'),size:Math.round(H/28),color:'#00ff46',x:6,y:10,speed:28,box:true}};
  if(g==='hackbar')return{dur:4,p:{label:'PIRATAGE EN COURS',color:'#00ff46',x:50,y:50,w:50}};
  return{dur:5,p:{label:'CAM 01 - SURVEILLANCE',color:'#ffffff'}};
}
/* ---------- éléments animés : dessin (un style = p.st). Tout est dessiné par DedCut, aucun logo de marque ---------- */
const wRnd=(i,k,s)=>{const x=Math.sin(i*127.1+k*311.7+(s||0)*17.3)*43758.5453;return x-Math.floor(x)};
const wFont=(w,s,f)=>`${w} ${Math.max(1,s)}px ${f||'"Segoe UI",sans-serif'}`;
function wStar(g,r){g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,q=k%2?r*.45:r;g.lineTo(Math.cos(a)*q,Math.sin(a)*q)}g.closePath()}
function wHeart(g,s){g.beginPath();g.moveTo(0,s*.35);g.bezierCurveTo(-s*.62,-s*.05,-s*.36,-s*.62,0,-s*.26);g.bezierCurveTo(s*.36,-s*.62,s*.62,-s*.05,0,s*.35);g.closePath()}
function wBell(g,s){g.beginPath();g.moveTo(-s*.46,s*.3);g.lineTo(-s*.36,s*.18);g.lineTo(-s*.36,-s*.08);g.quadraticCurveTo(-s*.36,-s*.5,0,-s*.52);g.quadraticCurveTo(s*.36,-s*.5,s*.36,-s*.08);g.lineTo(s*.36,s*.18);g.lineTo(s*.46,s*.3);g.closePath();g.fill();g.beginPath();g.arc(0,s*.4,s*.11,0,TAU);g.fill()}
function wCursor(g,s){g.fillStyle='#ffffff';g.strokeStyle='#111111';g.lineWidth=s*.07;g.lineJoin='round';g.beginPath();g.moveTo(0,0);g.lineTo(0,s);g.lineTo(s*.28,s*.75);g.lineTo(s*.5,s*1.12);g.lineTo(s*.65,s*1.04);g.lineTo(s*.45,s*.68);g.lineTo(s*.8,s*.68);g.closePath();g.fill();g.stroke()}
function wShare(g,s){g.beginPath();g.moveTo(-s*.42,s*.32);g.quadraticCurveTo(-s*.32,-s*.18,s*.12,-s*.18);g.lineTo(s*.12,-s*.4);g.lineTo(s*.46,-s*.06);g.lineTo(s*.12,s*.28);g.lineTo(s*.12,s*.06);g.quadraticCurveTo(-s*.2,s*.04,-s*.42,s*.32);g.closePath();g.fill()}
function wWrap(g,txt,maxW){const L=[];let cur='';for(const w of String(txt||'').split(/\s+/).filter(Boolean)){const t2=cur?cur+' '+w:w;if(g.measureText(t2).width>maxW&&cur){L.push(cur);cur=w}else cur=t2}if(cur)L.push(cur);return L.slice(0,6)}
const WDRAW={
  pbar(c,p,loc){
    const q=clamp(loc/Math.max(.01,c.dur),0,1),st=p.st||'line',col=p.color||'#ffffff',bg=hexA(p.bgc,(p.bgo??35)/100);
    const th=Math.max(2,H*(p.th??1.2)/100),w=W*(p.w??100)/100,cx=W*(p.x??50)/100,cy=p.y!=null?H*p.y/100:(p.pos==='top'?th/2:H-th/2),x0=cx-w/2,y0=cy-th/2;
    if(st==='ring'){
      const r=Math.max(th*2,Math.min(w,H*.9)/2);ctx.lineWidth=th;ctx.lineCap='round';
      ctx.strokeStyle=bg;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();
      ctx.strokeStyle=col;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+TAU*Math.max(.001,q));ctx.stroke();
      ctx.fillStyle=col;ctx.font=wFont(800,r*.55);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(Math.floor(q*100)+'%',cx,cy+r*.03);
      boxes.set(c.id,{x:cx-r-th,y:cy-r-th,w:2*(r+th),h:2*(r+th),rot:0});return;
    }
    if(st==='seg'||st==='dots'){
      const n=Math.max(3,Math.round(p.n??(st==='dots'?12:20))),gap=st==='dots'?0:th*.35,sw=(w-gap*(n-1))/n,f=q*n;
      for(let i=0;i<n;i++){const x=x0+i*(sw+gap),k=clamp(f-i,0,1);
        if(st==='seg'){ctx.fillStyle=bg;ctx.fillRect(x,y0,sw,th);if(k>0){ctx.fillStyle=col;ctx.fillRect(x,y0,sw*k,th)}}
        else{const r=Math.min(sw*.36,th*1.1)*(k>0&&k<1?1.15+.15*Math.sin(loc*12):1);ctx.fillStyle=k>=1?col:k>0?hexA(col,.55+.45*k):bg;ctx.beginPath();ctx.arc(x+sw/2,cy,r,0,TAU);ctx.fill()}}
      boxes.set(c.id,{x:x0,y:cy-th*1.4-H*.01,w,h:th*2.8+H*.02,rot:0});return;
    }
    const pad=st==='pill'?th*.45:0,rnd=p.round!==false||st!=='line';
    ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(x0-pad,y0-pad,w+pad*2,th+pad*2,rnd?(th+pad*2)/2:0);ctx.fill();
    const fw=Math.max(rnd?th:0,w*q);
    if(st==='neon'){ctx.shadowColor=col;ctx.shadowBlur=th*2.5}
    ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x0,y0,fw,th,rnd?th/2:0);ctx.fill();
    if(st==='neon'){ctx.beginPath();ctx.arc(x0+fw,cy,th*1.1,0,TAU);ctx.fillStyle='#ffffff';ctx.fill();ctx.shadowBlur=0}
    let lab=0;
    if(st==='label'){const fs=Math.max(10,th*2.4);lab=fs*1.3;ctx.font=wFont(700,fs);ctx.textBaseline='bottom';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.25;
      ctx.textAlign='right';ctx.fillText(Math.floor(q*100)+' %',x0+w,y0-pad-fs*.25);if(p.text){ctx.textAlign='left';ctx.fillText(p.text,x0,y0-pad-fs*.25)}ctx.shadowBlur=0}
    boxes.set(c.id,{x:x0-pad,y:y0-pad-lab-H*.01,w:w+pad*2,h:th+pad*2+lab+H*.02,rot:0});
  },
  count(c,p,loc){
    const from=Math.max(1,Math.round(p.from??3)),n=Math.floor(loc),f=loc-n,fs=H*(p.size??30)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100,col=p.color||'#ffffff',st=p.st||'ring',live=n<from,txt=live?String(from-n):(p.end||'');
    boxes.set(c.id,{x:x-fs*.8,y:y-fs*.8,w:fs*1.6,h:fs*1.6,rot:0});
    if(!txt)return;
    const pop=f<.25?.6+.4*easeOut(f/.25):1,big=live?fs:fs*.42;
    ctx.translate(x,y);ctx.globalAlpha*=live&&f>.85?1-(f-.85)/.15:1;
    const label=(fill,stroke)=>{ctx.font=wFont(900,big);ctx.textAlign='center';ctx.textBaseline='middle';if(stroke){ctx.lineWidth=big*.1;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.strokeText(txt,0,big*.04)}ctx.fillStyle=fill;ctx.fillText(txt,0,big*.04)};
    if(st==='pop'){const s=live?(f<.2?1.7-.7*easeOut(f/.2):1):pop;ctx.scale(s,s);ctx.rotate(live?(n%2?-.08:.08):0);label(col,'#000000')}
    else if(st==='flip'){
      ctx.font=wFont(900,big);const bw=live?fs*.95:ctx.measureText(txt).width+fs*.3,bh=live?fs*1.2:big*1.6;
      ctx.scale(1,live&&f<.16?Math.max(.06,f/.16):pop);ctx.fillStyle='#18181b';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.12;ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,fs*.1);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(-bw/2,-bh/2,bw,bh/2);ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(-bw/2,-1,bw,2);label(col);
    }
    else if(st==='neon'){ctx.scale(pop,pop);ctx.globalAlpha*=Math.sin(loc*37)>.92?.55:1;ctx.shadowColor=col;ctx.shadowBlur=fs*.3;ctx.font=wFont(900,big);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=big*.05;ctx.strokeStyle=col;ctx.strokeText(txt,0,big*.04);ctx.fillStyle='#ffffff';ctx.fillText(txt,0,big*.04)}
    else if(st==='dots'){ctx.scale(pop,pop);label(col);if(live){const r=fs*.06;for(let i=0;i<from;i++){const a=-Math.PI/2+i*TAU/from;ctx.fillStyle=i<from-n?col:hexA(col,.2);ctx.beginPath();ctx.arc(Math.cos(a)*fs*.78,Math.sin(a)*fs*.78,r,0,TAU);ctx.fill()}}}
    else if(st==='bar'){ctx.scale(pop,pop);ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.08;label(col);ctx.shadowBlur=0;if(live){const rem=clamp((from-loc)/from,0,1);ctx.fillStyle=hexA(col,.25);ctx.beginPath();ctx.roundRect(-fs*.8,fs*.62,fs*1.6,fs*.09,fs*.045);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-fs*.8,fs*.62,Math.max(fs*.09,fs*1.6*rem),fs*.09,fs*.045);ctx.fill()}}
    else{ctx.scale(pop,pop);if(p.ring!==false&&live){ctx.lineWidth=fs*.06;ctx.strokeStyle=hexA(col,.25);ctx.beginPath();ctx.arc(0,0,fs*.72,0,TAU);ctx.stroke();ctx.strokeStyle=col;ctx.beginPath();ctx.arc(0,0,fs*.72,-Math.PI/2,-Math.PI/2+TAU*(1-f));ctx.stroke()}ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.08;label(col)}
  },
  timer(c,p,loc){
    const v=p.mode==='down'?Math.max(0,(p.from??60)-loc):loc,mi=Math.floor(v/60),s=Math.floor(v%60),cs=Math.floor((v%1)*100);
    const txt=String(mi).padStart(2,'0')+':'+String(s).padStart(2,'0')+(p.cs?'.'+String(cs).padStart(2,'0'):'');
    const fs=H*(p.size??9)/100,x=W*(p.x??50)/100,y=H*(p.y??12)/100,col=p.color||'#ffffff',st=p.st||(p.box===false?'minimal':'box');
    if(st==='ring'){
      const r=fs*1.25;ctx.lineWidth=fs*.12;ctx.lineCap='round';ctx.strokeStyle=hexA(col,.22);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
      ctx.strokeStyle=col;ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+TAU*Math.max(.001,(v%60)/60));ctx.stroke();
      ctx.font=wFont(700,fs*.62,'Consolas,"Courier New",monospace');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=col;ctx.fillText(txt,x,y+fs*.03);
      boxes.set(c.id,{x:x-r-fs*.1,y:y-r-fs*.1,w:2*r+fs*.2,h:2*r+fs*.2,rot:0});return;
    }
    ctx.font=wFont(700,fs,'Consolas,"Courier New",monospace');ctx.textAlign='center';ctx.textBaseline='middle';
    let tw=ctx.measureText(txt).width,bx=x-tw/2-fs*.4,bw=tw+fs*.8,bh=fs*1.3;
    if(st==='rec'){const dot=fs*.32;bw+=fs*.9;bx=x-bw/2;ctx.fillStyle='rgba(0,0,0,.62)';ctx.beginPath();ctx.roundRect(bx,y-bh/2,bw,bh,bh/2);ctx.fill();
      if(Math.floor(loc*1.6)%2===0){ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(bx+fs*.65,y,dot,0,TAU);ctx.fill()}ctx.fillStyle=col;ctx.fillText(txt,x+fs*.42,y+fs*.03)}
    else if(st==='digital'){ctx.fillStyle='rgba(0,0,0,.72)';ctx.beginPath();ctx.roundRect(bx,y-bh/2,bw,bh,fs*.12);ctx.fill();ctx.strokeStyle=hexA(col,.5);ctx.lineWidth=Math.max(1,fs*.04);ctx.stroke();ctx.shadowColor=col;ctx.shadowBlur=fs*.35;ctx.fillStyle=col;ctx.fillText(txt,x,y+fs*.03);ctx.shadowBlur=0}
    else if(st==='minimal'){ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=fs*.25;ctx.fillStyle=col;ctx.fillText(txt,x,y+fs*.03);ctx.shadowBlur=0}
    else{ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.roundRect(bx,y-bh/2,bw,bh,fs*.2);ctx.fill();ctx.fillStyle=col;ctx.fillText(txt,x,y+fs*.03)}
    boxes.set(c.id,{x:bx,y:y-bh/2,w:bw,h:bh,rot:0});
  },
  sub(c,p,loc){
    const fs=H*(p.size??5)/100,x=W*(p.x??50)/100,y=H*(p.y??80)/100,st=p.st||'sub',col=p.color||'#ef4444';
    const ap=clamp(loc/.35,0,1),out=clamp((c.dur-loc)/.3,0,1),clicked=loc>=1.3,press=loc>1.2&&loc<1.4?.92:1;
    ctx.globalAlpha*=Math.min(ap,out);ctx.translate(x,y);
    const cursorAt=(tx,ty)=>{if(loc>.5&&loc<2.2){const k=easeOut(clamp((loc-.5)/.7,0,1));ctx.save();ctx.translate(tx+(1-k)*fs*3,ty+(1-k)*fs*2.6);wCursor(ctx,fs*1.1);ctx.restore()}};
    if(st==='like'||st==='share'||st==='notif'){
      const r=fs*1.25,sc=(.6+.4*easeOut(ap))*(st==='notif'?1:press);ctx.save();ctx.scale(sc,sc);
      if(st==='like'){
        const on=clicked,k=on?clamp((loc-1.3)/.35,0,1):0,s=fs*2.2*(on?1+.35*Math.sin(k*Math.PI):1);
        ctx.fillStyle=on?col:'rgba(0,0,0,.35)';ctx.strokeStyle='#ffffff';ctx.lineWidth=fs*.14;wHeart(ctx,s);ctx.fill();ctx.stroke();
        if(on&&k<1)for(let i=0;i<8;i++){const a=i*TAU/8,d=fs*(1.4+k*1.2);ctx.globalAlpha*=1;ctx.fillStyle=i%2?'#ffffff':col;ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,fs*.16*(1-k),0,TAU);ctx.fill()}
        if(p.text){ctx.font=wFont(800,fs*.8);ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.2;ctx.fillText(p.text,0,fs*1.05);ctx.shadowBlur=0}
        ctx.restore();cursorAt(fs*.2,fs*.1);boxes.set(c.id,{x:x-fs*1.4,y:y-fs*1.3,w:fs*2.8,h:fs*3.2,rot:0});return;
      }
      if(st==='share'){
        ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.4;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowBlur=0;
        ctx.save();if(clicked)ctx.rotate(-.25*Math.sin(clamp((loc-1.3)/.4,0,1)*Math.PI));ctx.fillStyle=col;wShare(ctx,fs*1.5);ctx.restore();
        if(p.text){ctx.font=wFont(800,fs*.75);ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.2;ctx.fillText(p.text,0,r+fs*.3);ctx.shadowBlur=0}
        ctx.restore();cursorAt(fs*.3,fs*.2);boxes.set(c.id,{x:x-r,y:y-r,w:2*r,h:2*r+fs*1.2,rot:0});return;
      }
      /* notification : cloche qui sonne + pastille « 1 » + texte qui glisse */
      ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.4;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowBlur=0;
      ctx.save();ctx.rotate(.35*Math.sin(loc*14)*Math.max(0,Math.sin(loc*2.2)));ctx.fillStyle='#ffffff';wBell(ctx,fs*1.4);ctx.restore();
      const bk=clamp((loc-.5)/.25,0,1);if(bk>0){const bs=fs*.5*(bk<1?EASE.back(bk):1);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(r*.72,-r*.72,bs,0,TAU);ctx.fill();ctx.fillStyle=col;ctx.font=wFont(900,bs*1.2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1',r*.72,-r*.72+bs*.06)}
      let tw=0;if(p.text){const tk=easeOut(clamp((loc-.7)/.4,0,1));ctx.font=wFont(700,fs*.8);tw=ctx.measureText(p.text).width;ctx.globalAlpha*=tk;ctx.fillStyle='rgba(0,0,0,.65)';ctx.beginPath();ctx.roundRect(r+fs*.3,-fs*.65,(tw+fs*1.1)*tk,fs*1.3,fs*.65);ctx.fill();ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(p.text,r+fs*.85,fs*.04)}
      ctx.restore();boxes.set(c.id,{x:x-r,y:y-r,w:2*r+(tw?tw+fs*1.5:0),h:2*r,rot:0});return;
    }
    /* boutons en pilule : S'abonner, + cloche, Suivre */
    ctx.font=wFont(700,fs);const txt=clicked?(p.done||''):(p.text||''),ic=st==='bell'||st==='follow'?fs*1.1:0;
    const tw=ctx.measureText(txt).width,bw=tw+fs*2.2+ic,bh=fs*2,sc=(.6+.4*easeOut(ap))*press;
    ctx.save();ctx.scale(sc,sc);
    ctx.fillStyle=clicked?'#3f3f46':col;ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.5;ctx.shadowOffsetY=fs*.12;ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
    if(st==='follow'){const ix=-bw/2+fs*1.05;ctx.lineWidth=fs*.16;ctx.lineCap='round';ctx.beginPath();if(clicked){ctx.moveTo(ix-fs*.3,0);ctx.lineTo(ix-fs*.05,fs*.25);ctx.lineTo(ix+fs*.32,-fs*.25)}else{ctx.moveTo(ix-fs*.3,0);ctx.lineTo(ix+fs*.3,0);ctx.moveTo(ix,-fs*.3);ctx.lineTo(ix,fs*.3)}ctx.stroke();ctx.fillText(txt,ic/2,fs*.05)}
    else if(st==='bell'){ctx.fillText(txt,-ic/2,fs*.05);ctx.save();ctx.translate(bw/2-fs*1.05,0);if(clicked)ctx.rotate(.45*Math.sin((loc-1.3)*18)*clamp(1-(loc-1.3)/1,0,1));wBell(ctx,fs*1.05);ctx.restore()}
    else ctx.fillText(txt,0,fs*.05);
    ctx.restore();cursorAt(bw*.25*sc,bh*.15*sc);
    boxes.set(c.id,{x:x-bw/2,y:y-bh/2,w:bw,h:bh,rot:0});
  },
  lower(c,p,loc){
    const fs=H*(p.size??4.2)/100,x=W*(p.x??6)/100,y=H*(p.y??80)/100,col=p.color||'#a78bfa',st=p.st||'lbar';
    const inK=easeOut(clamp(loc/.5,0,1)),outK=clamp((c.dur-loc)/.4,0,1);ctx.globalAlpha*=Math.min(inK*1.5,outK);
    const nf=fs*1.25,tf=fs*.85,name=p.name||'',title=p.title||'';
    ctx.font=wFont(800,nf);const nw=ctx.measureText(name).width;ctx.font=wFont(500,tf);const tw=ctx.measureText(title).width;
    const hh=nf+tf+fs*.9,top=y-hh/2;ctx.translate((1-inK)*-W*.25,0);ctx.textAlign='left';ctx.textBaseline='middle';
    if(st==='lbox'){
      const pw=fs*.6;ctx.fillStyle=col;ctx.fillRect(x,top,(nw+pw*2)*inK,nf+fs*.4);ctx.fillStyle='rgba(15,15,20,.85)';ctx.fillRect(x+fs*.5,top+nf+fs*.4,(tw+pw*2)*clamp(inK*1.3-.3,0,1),tf+fs*.5);
      ctx.fillStyle='#ffffff';ctx.font=wFont(800,nf);ctx.fillText(name,x+pw,top+(nf+fs*.4)/2+fs*.04);ctx.font=wFont(500,tf);ctx.fillText(title,x+fs*.5+pw,top+nf+fs*.4+(tf+fs*.5)/2+fs*.03);
    }else if(st==='clean'){
      ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=fs*.3;ctx.fillStyle='#ffffff';ctx.font=wFont(800,nf);ctx.fillText(name,x,top+nf/2);ctx.shadowBlur=0;
      ctx.fillStyle=col;ctx.fillRect(x,top+nf+fs*.2,nw*inK,fs*.14);
      ctx.fillStyle='#ffffff';ctx.font=wFont(500,tf);if('letterSpacing' in ctx)ctx.letterSpacing=(tf*.12)+'px';ctx.fillText(title.toUpperCase(),x,top+nf+fs*.5+tf/2);if('letterSpacing' in ctx)ctx.letterSpacing='0px';
    }else{
      ctx.fillStyle=col;ctx.fillRect(x,top,fs*.22,hh*inK);ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=fs*.3;
      ctx.fillStyle='#ffffff';ctx.font=wFont(800,nf);ctx.fillText(name,x+fs*.6,top+nf/2+fs*.15);ctx.fillStyle=col;ctx.font=wFont(600,tf);ctx.fillText(title,x+fs*.6,top+nf+fs*.45+tf/2);ctx.shadowBlur=0;
    }
    boxes.set(c.id,{x,y:top,w:Math.max(nw,tw)+fs*1.6,h:hh+fs*.2,rot:0});
  },
  chat(c,p,loc){
    const fs=H*(p.size??3.8)/100,x=W*(p.x??50)/100,y=H*(p.y??70)/100,col=p.color||'#a78bfa',dark=p.st==='dark';
    const ap=clamp(loc/.25,0,1),out=clamp((c.dur-loc)/.3,0,1);ctx.globalAlpha*=Math.min(ap,out);
    const r=fs*1.1,typing=loc<1;ctx.font=wFont(500,fs);const lines=typing?[]:wWrap(ctx,p.text,W*.55);
    const lw=lines.length?Math.max(...lines.map(l=>ctx.measureText(l).width)):fs*2.4;ctx.font=wFont(700,fs*.75);const nmw=ctx.measureText(p.name||'').width;
    const bw=Math.max(lw,nmw)+fs*1.4,bh=(lines.length||1)*fs*1.3+fs*1.1+(p.name?fs*.95:0),tot=r*2+fs*.5+bw,lx=x-tot/2,by=y-bh/2,sc=.7+.3*EASE.back(ap);
    ctx.translate(x,y);ctx.scale(sc,sc);ctx.translate(-x,-y);
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(lx+r,y+bh/2-r,r,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.font=wFont(800,r);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText((p.name||'?').trim().charAt(0).toUpperCase(),lx+r,y+bh/2-r+r*.05);
    const bx=lx+r*2+fs*.5;ctx.fillStyle=dark?'rgba(24,24,27,.94)':'#ffffff';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=fs*.5;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,fs*.7);ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(bx+fs*.2,by+bh-fs*.9);ctx.lineTo(bx-fs*.45,by+bh-fs*.2);ctx.lineTo(bx+fs*.9,by+bh-fs*.25);ctx.closePath();ctx.fill();
    ctx.textAlign='left';ctx.textBaseline='top';let ty=by+fs*.55;
    if(p.name){ctx.fillStyle=col;ctx.font=wFont(700,fs*.75);ctx.fillText(p.name,bx+fs*.7,ty);ty+=fs*.95}
    if(typing){for(let i=0;i<3;i++){const b=Math.max(0,Math.sin(loc*9-i*.9));ctx.fillStyle=dark?'#a1a1aa':'#71717a';ctx.beginPath();ctx.arc(bx+fs*.95+i*fs*.62,ty+fs*.6-b*fs*.25,fs*.19,0,TAU);ctx.fill()}}
    else{ctx.fillStyle=dark?'#ffffff':'#18181b';ctx.font=wFont(500,fs);lines.forEach((l,i)=>ctx.fillText(l,bx+fs*.7,ty+i*fs*1.3))}
    boxes.set(c.id,{x:lx,y:by,w:tot,h:bh,rot:0});
  },
  hearts(c,p,loc){
    const n=Math.round(p.n??14),fs=H*(p.size??6)/100,x=W*(p.x??82)/100,y=H*(p.y??86)/100,st=p.st||'heart',col=p.color||'#ff4d6d',life=2.4,A0=ctx.globalAlpha,rise=H*(p.h??45)/100;
    for(let i=0;i<n;i++){
      const tt=(loc+wRnd(i,1,c.id)*life)%life,k=tt/life;if(loc<tt)continue;
      const px=x+Math.sin(tt*2.5+wRnd(i,2,c.id)*6)*fs*.8+(wRnd(i,3,c.id)-.5)*fs*1.6,py=y-k*rise,s=fs*(.55+wRnd(i,4,c.id)*.6)*(k<.12?k/.12:1);
      ctx.globalAlpha=A0*(1-k)*Math.min(1,loc/.3);ctx.save();ctx.translate(px,py);ctx.rotate((wRnd(i,5,c.id)-.5)*.6);
      if(st==='star'){ctx.fillStyle=i%3?col:'#ffffff';wStar(ctx,s*.55);ctx.fill()}
      else if(st==='bubble'){ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,s*.08);ctx.beginPath();ctx.arc(0,0,s*.45,0,TAU);ctx.stroke();ctx.fillStyle=hexA('#ffffff',.5);ctx.beginPath();ctx.arc(-s*.15,-s*.15,s*.1,0,TAU);ctx.fill()}
      else{ctx.fillStyle=i%4?col:'#ffffff';wHeart(ctx,s)}
      if(st==='heart')ctx.fill();ctx.restore();
    }
    ctx.globalAlpha=A0;boxes.set(c.id,{x:x-fs*2,y:y-rise,w:fs*4,h:rise+fs,rot:0});
  },
  confetti(c,p,loc){
    const n=Math.round(p.n??90),x=W*(p.x??50)/100,y=H*(p.y??45)/100,cols=['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'],gr=H*1.1,A0=ctx.globalAlpha;
    for(let i=0;i<n;i++){
      const a=-Math.PI/2+(wRnd(i,1,c.id)-.5)*Math.PI*1.4,v=H*(.5+wRnd(i,2,c.id)*.8),px=x+Math.cos(a)*v*loc*.9,py=y+Math.sin(a)*v*loc+.5*gr*loc*loc;
      if(py>H+30)continue;const s=H*.011*(.7+wRnd(i,3,c.id));
      ctx.save();ctx.translate(px,py);ctx.rotate(loc*(4+wRnd(i,4,c.id)*9));ctx.scale(1,Math.abs(Math.cos(loc*(3+wRnd(i,6,c.id)*6))));ctx.globalAlpha=A0*clamp((c.dur-loc)/.5,0,1);ctx.fillStyle=cols[i%cols.length];ctx.fillRect(-s,-s*.5,s*2,s);ctx.restore();
    }
    boxes.set(c.id,{x:x-W*.08,y:y-H*.08,w:W*.16,h:H*.16,rot:0});
  },
  rec(c,p,loc){
    const fs=H*(p.size??4)/100,x=W*(p.x??6)/100,y=H*(p.y??8)/100,col=p.color||'#ef4444';
    ctx.font=wFont(800,fs);ctx.textBaseline='middle';ctx.textAlign='left';
    if(p.st==='live'){const txt=p.text||'',tw=ctx.measureText(txt).width,bw=tw+fs*2.2,bh=fs*1.7;ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y-bh/2,bw,bh,fs*.3);ctx.fill();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x+fs*.75,y,fs*.28*(.75+.25*Math.sin(loc*6)),0,TAU);ctx.fill();ctx.fillText(txt,x+fs*1.35,y+fs*.05);boxes.set(c.id,{x,y:y-bh/2,w:bw,h:bh,rot:0});return}
    const s=Math.floor(loc),txt=(p.text||'REC')+'  '+String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'),tw=ctx.measureText(txt).width;
    ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.3;if(Math.floor(loc*1.6)%2===0){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+fs*.45,y,fs*.42,0,TAU);ctx.fill()}
    ctx.fillStyle='#ffffff';ctx.fillText(txt,x+fs*1.2,y+fs*.05);ctx.shadowBlur=0;boxes.set(c.id,{x,y:y-fs*.6,w:tw+fs*1.3,h:fs*1.2,rot:0});
  },
  pin(c,p,loc){
    const fs=H*(p.size??4.5)/100,x=W*(p.x??50)/100,y=H*(p.y??18)/100,col=p.color||'#ef4444',txt=p.text||'';
    const k=clamp(loc/.6,0,1),dy=(1-EASE.bounce(k))*-H*.06,out=clamp((c.dur-loc)/.3,0,1);ctx.globalAlpha*=out*Math.min(1,k*3);
    ctx.font=wFont(700,fs);const tw=ctx.measureText(txt).width,ps=fs*1.7,tot=fs*1.9+tw+fs*.9,lx=x-tot/2;
    const tk=easeOut(clamp((loc-.35)/.4,0,1));ctx.fillStyle='rgba(0,0,0,.62)';ctx.beginPath();ctx.roundRect(lx,y-fs*.95,fs*1.9+(tw+fs*.9)*tk,fs*1.9,fs*.95);ctx.fill();
    const px=lx+fs*.95,py=y+dy;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(px,py+ps*.42);ctx.bezierCurveTo(px-ps*.52,py-ps*.02,px-ps*.38,py-ps*.52,px,py-ps*.52);ctx.bezierCurveTo(px+ps*.38,py-ps*.52,px+ps*.52,py-ps*.02,px,py+ps*.42);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(px,py-ps*.17,ps*.13,0,TAU);ctx.fill();
    ctx.save();ctx.beginPath();ctx.rect(lx+fs*1.7,y-fs,(tw+fs*.9)*tk,fs*2);ctx.clip();ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(txt,lx+fs*1.85,y+fs*.05);ctx.restore();
    boxes.set(c.id,{x:lx,y:y-fs*1.05,w:tot,h:fs*2.1,rot:0});
  },
  swipe(c,p,loc){
    const fs=H*(p.size??4)/100,x=W*(p.x??50)/100,y=H*(p.y??84)/100,col=p.color||'#ffffff',A0=ctx.globalAlpha;
    ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineCap='round';ctx.lineJoin='round';let ty;
    if(p.st==='tap'){const ph=(loc%1.1)/1.1;ctx.globalAlpha=A0*(1-ph);ctx.lineWidth=fs*.14;ctx.beginPath();ctx.arc(x,y,fs*(.55+ph*1.6),0,TAU);ctx.stroke();ctx.globalAlpha=A0;
      ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.3;ctx.beginPath();ctx.arc(x,y,fs*.45*(ph<.15?.8:1),0,TAU);ctx.fill();ctx.shadowBlur=0;ty=y+fs*2.4}
    else{for(let i=0;i<3;i++){const ph=((loc*1.4)+i/3)%1,yy=y-fs*.4-ph*fs*2.2;ctx.globalAlpha=A0*Math.sin(ph*Math.PI);ctx.lineWidth=fs*.22;ctx.beginPath();ctx.moveTo(x-fs*.7,yy+fs*.35);ctx.lineTo(x,yy-fs*.25);ctx.lineTo(x+fs*.7,yy+fs*.35);ctx.stroke()}ctx.globalAlpha=A0;ty=y+fs*.9}
    if(p.text){ctx.font=wFont(800,fs);ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=fs*.3;ctx.fillText(p.text,x,ty);ctx.shadowBlur=0}
    boxes.set(c.id,{x:x-fs*3,y:y-fs*3,w:fs*6,h:fs*3+(ty-y)+fs*.8,rot:0});
  },
  stars(c,p,loc){
    const v=clamp(p.value??5,0,5),fs=H*(p.size??7)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100,col=p.color||'#facc15',gap=fs*.25,tw=5*fs+4*gap,x0=x-tw/2+fs/2;
    for(let i=0;i<5;i++){const ap=clamp((loc-i*.18)/.3,0,1);if(ap<=0)continue;const s=fs/2*(ap<1?.4+.6*EASE.back(ap):1),fill=clamp(v-i,0,1);
      ctx.save();ctx.translate(x0+i*(fs+gap),y);ctx.fillStyle='rgba(255,255,255,.25)';wStar(ctx,s);ctx.fill();
      if(fill>0){ctx.save();ctx.beginPath();ctx.rect(-s,-s,2*s*fill,2*s);ctx.clip();ctx.fillStyle=col;ctx.shadowColor=hexA(col,.6);ctx.shadowBlur=fs*.2;wStar(ctx,s);ctx.fill();ctx.restore()}ctx.restore()}
    boxes.set(c.id,{x:x-tw/2,y:y-fs/2,w:tw,h:fs,rot:0});
  },
  pulse(c,p,loc){
    const r=H*(p.size??12)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100,col=p.color||'#ffffff',A0=ctx.globalAlpha;
    if(p.st==='spot'){const rr=r*(1+.04*Math.sin(loc*4));ctx.fillStyle=`rgba(0,0,0,${(p.dim??60)/100})`;ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(x,y,rr,0,TAU,true);ctx.fill('evenodd');ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,r*.04);ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.stroke()}
    else{for(let i=0;i<3;i++){const ph=((loc*.8)+i/3)%1;ctx.globalAlpha=A0*(1-ph);ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,r*.06*(1-ph));ctx.beginPath();ctx.arc(x,y,r*(.4+ph*.9),0,TAU);ctx.stroke()}ctx.globalAlpha=A0;ctx.lineWidth=Math.max(2,r*.07);ctx.beginPath();ctx.arc(x,y,r*.4,0,TAU);ctx.stroke()}
    boxes.set(c.id,{x:x-r,y:y-r,w:2*r,h:2*r,rot:0});
  },
  arrowp(c,p,loc){
    const fs=H*(p.size??9)/100,x=W*(p.x??50)/100,y=H*(p.y??40)/100,col=p.color||'#facc15';
    ctx.translate(x,y);ctx.rotate((p.rot??90)*Math.PI/180);ctx.lineJoin='round';ctx.lineCap='round';
    if(p.st==='chev'){ctx.strokeStyle=col;ctx.lineWidth=fs*.16;for(let i=0;i<3;i++){const ph=((loc*2)-i/3+3)%1;ctx.globalAlpha=(ph<.5?.25+ph*1.5:1.75-ph*1.5);ctx.beginPath();ctx.moveTo(-fs*.45+i*fs*.38,-fs*.38);ctx.lineTo(-fs*.1+i*fs*.38,0);ctx.lineTo(-fs*.45+i*fs*.38,fs*.38);ctx.stroke()}}
    else{ctx.translate(Math.sin(loc*6)*fs*.18,0);ctx.fillStyle=col;ctx.strokeStyle='#000000';ctx.lineWidth=fs*.06;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs*.2;
      ctx.beginPath();ctx.moveTo(-fs*.6,-fs*.18);ctx.lineTo(fs*.1,-fs*.18);ctx.lineTo(fs*.1,-fs*.42);ctx.lineTo(fs*.6,0);ctx.lineTo(fs*.1,fs*.42);ctx.lineTo(fs*.1,fs*.18);ctx.lineTo(-fs*.6,fs*.18);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke()}
    boxes.set(c.id,{x:x-fs*.7,y:y-fs*.7,w:fs*1.4,h:fs*1.4,rot:0});
  },
  spin(c,p,loc){
    const r=H*(p.size??5)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100,col=p.color||'#ffffff';
    if(p.st==='sdots'){for(let i=0;i<8;i++){const a=i*TAU/8,on=(Math.floor(loc*10)%8+8-i)%8;ctx.fillStyle=hexA(col,1-on/8*.85);ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,r*.17,0,TAU);ctx.fill()}}
    else{ctx.lineWidth=r*.2;ctx.lineCap='round';ctx.strokeStyle=hexA(col,.2);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.strokeStyle=col;const a=loc*5;ctx.beginPath();ctx.arc(x,y,r,a,a+Math.PI*1.3);ctx.stroke()}
    if(p.text){ctx.font=wFont(700,r*.6);ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=r*.2;ctx.fillText(p.text,x,y+r*1.5);ctx.shadowBlur=0}
    boxes.set(c.id,{x:x-r*1.3,y:y-r*1.3,w:r*2.6,h:r*2.6+(p.text?r*1.2:0),rot:0});
  }
};
const WSTY={pbar:['line','pill','seg','dots','neon','label','ring'],count:['ring','pop','flip','neon','dots','bar'],timer:['box','digital','rec','minimal','ring'],sub:['sub','bell','follow','like','share','notif'],
  lower:['lbar','clean','lbox'],chat:['light','dark'],hearts:['heart','star','bubble'],rec:['dot','live'],swipe:['up','tap'],pulse:['rings','spot'],arrowp:['arrow','chev'],spin:['sring','sdots']};
const WSIZE=new Set(['count','timer','sub','lower','chat','hearts','rec','pin','swipe','stars','pulse','arrowp','spin']);
/* réglages par défaut (les textes sont traduits au moment de la création) */
const WDEF={
  pbar:()=>({dur:10,p:{st:'line',color:'#ffffff',bgc:'#000000',bgo:35,th:1.2,w:100,x:50,y:99.4,round:true,n:20,text:'',op:100}}),
  count:()=>({dur:4,p:{st:'ring',from:3,end:T('wdg.go'),size:30,color:'#ffffff',ring:true,x:50,y:50,op:100}}),
  timer:()=>({dur:10,p:{st:'box',mode:'up',from:60,size:9,color:'#ffffff',cs:false,x:50,y:12,op:100}}),
  sub:()=>({dur:3,p:{st:'sub',text:T('wdg.subText'),done:T('wdg.subDone'),size:5,color:'#ef4444',x:50,y:80,op:100}}),
  lower:()=>({dur:5,p:{st:'lbar',name:T('wdg.defName'),title:T('wdg.defTitle'),size:4.2,color:'#a78bfa',x:6,y:80,op:100}}),
  chat:()=>({dur:5,p:{st:'light',name:T('wdg.defUser'),text:T('wdg.defChat'),size:3.8,color:'#a78bfa',x:50,y:70,op:100}}),
  hearts:()=>({dur:5,p:{st:'heart',n:14,size:6,color:'#ff4d6d',x:82,y:86,h:45,op:100}}),
  confetti:()=>({dur:3,p:{n:90,x:50,y:45,op:100}}),
  rec:()=>({dur:6,p:{st:'dot',text:'REC',size:4,color:'#ef4444',x:6,y:8,op:100}}),
  pin:()=>({dur:4,p:{text:T('wdg.defPlace'),size:4.5,color:'#ef4444',x:50,y:18,op:100}}),
  swipe:()=>({dur:4,p:{st:'up',text:T('wdg.swipeUp'),size:4,color:'#ffffff',x:50,y:84,op:100}}),
  stars:()=>({dur:4,p:{value:5,size:7,color:'#facc15',x:50,y:50,op:100}}),
  pulse:()=>({dur:4,p:{st:'rings',size:12,color:'#ffffff',dim:60,x:50,y:50,op:100}}),
  arrowp:()=>({dur:4,p:{st:'arrow',size:9,color:'#facc15',rot:90,x:50,y:40,op:100}}),
  spin:()=>({dur:3,p:{st:'sring',text:T('wdg.loading'),size:5,color:'#ffffff',x:50,y:50,op:100}})
};
/* champs du panneau de droite : [clé, type, libellé, [min,max,pas], styles où le champ apparaît] */
const WINSP={
  pbar:[['st','st'],['place','place'],['color','col','common.color'],['bgc','col','text.bgColor'],['bgo','num','wdg.bgOp',[0,100]],['th','num','wdg.thick',[.3,8,.1]],['w','num','insp.widthPct',[3,100,.5]],['n','num','wdg.segments',[3,40],['seg','dots']],['text','txt','common.text',null,['label']],['round','chk','insp.cornerRadius',null,['line']],['h','hint','wdg.pbarHint']],
  count:[['st','st'],['from','num','wdg.from',[1,10]],['end','txt','wdg.endText'],['size','num','common.size',[5,60]],['color','col','common.color'],['ring','chk','wdg.ring',null,['ring']]],
  timer:[['st','st'],['mode','mode'],['from','num','wdg.from',[5,3600]],['size','num','common.size',[3,30,.5]],['color','col','common.color'],['cs','chk','wdg.cs']],
  sub:[['st','st'],['text','txt','common.text'],['done','txt','wdg.textDone',null,['sub','bell','follow']],['size','num','common.size',[2,15,.5]],['color','col','common.color']],
  lower:[['st','st'],['name','txt','wdg.name'],['title','txt','wdg.subtitle'],['size','num','common.size',[2,10,.1]],['color','col','common.color']],
  chat:[['st','st'],['name','txt','wdg.name'],['text','txt','common.text'],['size','num','common.size',[2,8,.1]],['color','col','common.color']],
  hearts:[['st','st'],['n','num','wdg.amount',[3,40]],['size','num','common.size',[2,15,.5]],['h','num','wdg.height',[10,90]],['color','col','common.color']],
  confetti:[['n','num','wdg.amount',[20,250]]],
  rec:[['st','st'],['text','txt','common.text'],['size','num','common.size',[2,10,.1]],['color','col','common.color']],
  pin:[['text','txt','common.text'],['size','num','common.size',[2,10,.1]],['color','col','common.color']],
  swipe:[['st','st'],['text','txt','common.text'],['size','num','common.size',[2,10,.1]],['color','col','common.color']],
  stars:[['value','num','wdg.value',[0,5,.5]],['size','num','common.size',[2,15,.5]],['color','col','common.color']],
  pulse:[['st','st'],['size','num','common.size',[3,40,.5]],['color','col','common.color'],['dim','num','wdg.dim',[0,90],['spot']]],
  arrowp:[['st','st'],['rot','num','insp.rotDeg',[-180,180]],['size','num','common.size',[3,25,.5]],['color','col','common.color']],
  spin:[['st','st'],['text','txt','common.text'],['size','num','common.size',[2,15,.5]],['color','col','common.color']]
};
/* zone floutée : lit l'image déjà dessinée en dessous (calque principal), la floute ou la pixelise, découpée dans la forme */
const _wt=[document.createElement('canvas'),document.createElement('canvas')];
function wTmp(i,w,h){const k=_wt[i];if(k.width!==w||k.height!==h){k.width=w;k.height=h}return k}
WDRAW.blurz=(c,p)=>{
  const w=W*(p.w??30)/100,h=H*(p.h??20)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,x0=cx-w/2,y0=cy-h/2,st=p.st||'zblur',k=clamp((p.amt??60)/100,0,1);
  const shape=g=>{g.beginPath();if(p.oval)g.ellipse(cx,cy,Math.max(1,w/2),Math.max(1,h/2),0,0,TAU);else g.roundRect(x0,y0,Math.max(1,w),Math.max(1,h),Math.min(w,h)*.06)};
  boxes.set(c.id,{x:x0,y:y0,w,h,rot:0});
  if(st==='zsolid'){ctx.fillStyle=p.color||'#000000';shape(ctx);ctx.fill();return}
  const src=ctx===lctx?mctx.canvas:ctx.canvas,s=src.width/W,pad=st==='zblur'?Math.ceil((10+60*k)*H/1080):0;
  const tw=Math.max(1,Math.round(w+2*pad)),th=Math.max(1,Math.round(h+2*pad)),tmp=wTmp(0,tw,th),g=tmp.getContext('2d');
  g.clearRect(0,0,tw,th);g.drawImage(src,(x0-pad)*s,(y0-pad)*s,tw*s,th*s,0,0,tw,th);
  ctx.save();shape(ctx);ctx.clip();
  if(st==='zpix'){const b=Math.max(2,Math.round((4+40*k)*H/1080)),sw=Math.max(1,Math.round(tw/b)),sh=Math.max(1,Math.round(th/b)),t2=wTmp(1,sw,sh),g2=t2.getContext('2d');g2.imageSmoothingEnabled=true;g2.clearRect(0,0,sw,sh);g2.drawImage(tmp,0,0,sw,sh);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(t2,0,0,sw,sh,x0-pad,y0-pad,tw,th);ctx.imageSmoothingEnabled=true}
  else{ctx.filter=`blur(${(4+40*k)*H/1080}px)`;ctx.drawImage(tmp,x0-pad,y0-pad,tw,th);ctx.filter='none'}
  ctx.restore();
};
WSTY.blurz=['zblur','zpix','zsolid'];
WDEF.blurz=()=>({dur:5,p:{st:'zblur',amt:60,color:'#000000',oval:false,w:30,h:20,x:50,y:50,op:100}});
WINSP.blurz=[['st','st'],['amt','num','wdg.strength',[0,100],['zblur','zpix']],['color','col','common.color',null,['zsolid']],['oval','chk','wdg.oval'],['w','num','insp.widthPct',[2,100,.5]],['h','num','insp.heightPct',[2,100,.5]],['hint','hint','wdg.blurHint']];
GN.blurz='wdg.blurz';
WDRAW.counter=(c,p,loc)=>{
  const fs=H*(p.size??12)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100,col=p.color||'#ffffff',cd=Math.max(.2,Math.min(p.cdur??2,c.dur)),q=easeOut(clamp(loc/cd,0,1));
  const v=(+p.from||0)+((+p.to||0)-(+p.from||0))*q,dec=clamp(Math.round(p.dec??0),0,3);
  let num;try{num=v.toLocaleString(document.documentElement.lang||undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec})}catch(x){num=v.toFixed(dec)}
  const txt=(p.pre||'')+num+(p.suf||'');ctx.font=wFont(900,fs);ctx.textAlign='center';ctx.textBaseline='middle';const tw=ctx.measureText(txt).width;
  const pop=q>=1&&loc<cd+.25?1+.08*Math.sin((loc-cd)/.25*Math.PI):1;ctx.translate(x,y);ctx.scale(pop,pop);
  if(p.st==='badge'){ctx.fillStyle=hexA(col,.18);ctx.strokeStyle=col;ctx.lineWidth=fs*.06;ctx.beginPath();ctx.roundRect(-tw/2-fs*.5,-fs*.75,tw+fs,fs*1.5,fs*.75);ctx.fill();ctx.stroke()}
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=fs*.15;ctx.fillStyle=col;ctx.fillText(txt,0,fs*.04);
  boxes.set(c.id,{x:x-tw/2-fs*.5,y:y-fs*.75,w:tw+fs,h:fs*1.5,rot:0});
};
WDRAW.ticker=(c,p,loc)=>{
  const fs=H*(p.size??3.4)/100,y=H*(p.y??92)/100,bh=fs*2,col=p.color||'#ef4444',txt=String(p.text||''),news=p.st!=='plain';
  const ap=easeOut(clamp(loc/.4,0,1)),out=clamp((c.dur-loc)/.3,0,1);ctx.globalAlpha*=Math.min(ap,out);
  ctx.fillStyle=news?'rgba(15,15,20,.88)':'rgba(0,0,0,.55)';ctx.fillRect(0,y-bh/2,W,bh);
  let lx=0;ctx.font=wFont(800,fs);ctx.textBaseline='middle';
  if(news&&p.label){const lw=ctx.measureText(p.label).width+fs*1.6;ctx.fillStyle=col;ctx.fillRect(0,y-bh/2,lw*ap,bh);ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.fillText(p.label,fs*.8,y+fs*.05);lx=lw}
  ctx.save();ctx.beginPath();ctx.rect(lx,y-bh/2,W-lx,bh);ctx.clip();ctx.font=wFont(600,fs);ctx.fillStyle='#ffffff';ctx.textAlign='left';
  const tw=ctx.measureText(txt).width,gap=W*.25,per=tw+gap,sp=W*(p.speed??12)/100,off=(loc*sp)%per;
  for(let xx=W-off;xx>lx-per;xx-=per)ctx.fillText(txt,xx,y+fs*.05);
  ctx.restore();boxes.set(c.id,{x:0,y:y-bh/2,w:W,h:bh,rot:0});
};
WDRAW.chart=(c,p,loc)=>{
  const vals=String(p.values||'').split(/[;,]/).map(s=>parseFloat(s.replace(',','.'))).filter(v=>isFinite(v)).slice(0,10),labs=String(p.labels||'').split(/[;,]/).map(s=>s.trim());
  const w=W*(p.w??50)/100,h=H*(p.h??40)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,x0=cx-w/2,y0=cy-h/2,col=p.color||'#a78bfa',n=Math.max(1,vals.length),mx=Math.max(1e-9,...vals.map(Math.abs)),fs=Math.max(8,Math.min(w,h)*.07);
  const out=clamp((c.dur-loc)/.3,0,1);ctx.globalAlpha*=out;ctx.font=wFont(700,fs);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.roundRect(x0-fs*.6,y0-fs*.6,w+fs*1.2,h+fs*1.2,fs*.4);ctx.fill();
  const hor=p.st==='hbars';
  vals.forEach((v,i)=>{const k=easeOut(clamp((loc-i*.15)/.9,0,1)),f=Math.abs(v)/mx*k,shade=1-.45*(i/Math.max(1,n-1));ctx.fillStyle=hexA(col,.55+.45*shade);
    if(hor){const bh=h/n*.62,by=y0+i*h/n+(h/n-bh)/2,lw=fs*3.2,bw=(w-lw-fs*2.5)*f;ctx.beginPath();ctx.roundRect(x0+lw,by,Math.max(1,bw),bh,bh*.2);ctx.fill();
      ctx.fillStyle='#ffffff';ctx.textBaseline='middle';ctx.textAlign='right';ctx.fillText(labs[i]||'',x0+lw-fs*.4,by+bh/2);ctx.textAlign='left';if(k>0)ctx.fillText(fmtN(Math.round(v*k*10)/10),x0+lw+bw+fs*.3,by+bh/2)}
    else{const bw=w/n*.62,bx=x0+i*w/n+(w/n-bw)/2,ah=h-fs*2.6,bh=ah*f,by=y0+fs*1.2+ah-bh;ctx.beginPath();ctx.roundRect(bx,by,bw,Math.max(1,bh),[bw*.15,bw*.15,0,0]);ctx.fill();
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='bottom';if(k>0)ctx.fillText(fmtN(Math.round(v*k*10)/10),bx+bw/2,by-fs*.2);ctx.textBaseline='top';ctx.fillText(labs[i]||'',bx+bw/2,y0+h-fs*1.25)}});
  boxes.set(c.id,{x:x0-fs*.6,y:y0-fs*.6,w:w+fs*1.2,h:h+fs*1.2,rot:0});
};
WDRAW.letterbox=(c,p,loc)=>{
  const r=clamp(+p.ratio||2.39,1,4),bar=Math.max(0,(H-W/r)/2),k=easeOut(clamp(loc/.6,0,1))*clamp((c.dur-loc)/.6,0,1),b=bar*k;
  ctx.fillStyle=p.color||'#000000';ctx.fillRect(0,0,W,b);ctx.fillRect(0,H-b,W,b);boxes.set(c.id,{x:0,y:0,w:W,h:Math.max(H*.04,b),rot:0});
};
WSTY.counter=['plain','badge'];WSTY.ticker=['news','plain'];WSTY.chart=['bars','hbars'];
WDEF.counter=()=>({dur:4,p:{st:'plain',from:0,to:1000,dec:0,pre:'',suf:'',cdur:2,size:12,color:'#ffffff',x:50,y:50,op:100}});
WDEF.ticker=()=>({dur:10,p:{st:'news',text:T('wdg.defTicker'),label:T('wdg.defLabel'),speed:12,size:3.4,color:'#ef4444',y:92,x:50,op:100}});
WDEF.chart=()=>({dur:5,p:{st:'bars',values:'30,55,80,45',labels:T('wdg.defLabels'),color:'#a78bfa',w:50,h:40,x:50,y:50,op:100}});
WDEF.letterbox=()=>({dur:8,p:{ratio:2.39,color:'#000000',x:50,y:50,op:100}});
WINSP.counter=[['st','st'],['from','num','wdg.from2',[-100000,100000]],['to','num','wdg.to',[-1000000,1000000]],['dec','num','wdg.decimals',[0,3]],['pre','txt','wdg.prefix'],['suf','txt','wdg.suffix'],['cdur','num','wdg.countDur',[.2,10,.1]],['size','num','common.size',[3,40,.5]],['color','col','common.color']];
WINSP.ticker=[['st','st'],['text','txt','common.text'],['label','txt','wdg.label',null,['news']],['speed','num','wdg.speed',[2,40]],['size','num','common.size',[2,8,.1]],['color','col','common.color',null,['news']]];
WINSP.chart=[['st','st'],['values','txt','wdg.values'],['labels','txt','wdg.labels'],['w','num','insp.widthPct',[15,100,.5]],['h','num','insp.heightPct',[15,100,.5]],['color','col','common.color']];
WINSP.letterbox=[['ratio','num','wdg.ratio',[1.5,3,.01]],['color','col','common.color']];
['counter','ticker'].forEach(g=>WSIZE.add(g));
Object.assign(GN,{counter:'wdg.counter',ticker:'wdg.ticker',chart:'wdg.chart',letterbox:'wdg.letterbox'});
function wInsp(c,p,R,CO,CK){
  const g=c.gen,stl=WSTY[g],cur=p.st||(stl&&stl[0]);let h='';
  if(KFK(c).includes('p.x')&&!['slide','animbg','scribble','marker'].includes(g)&&!(g==='aemoji'&&p.st==='em_rain'))h+=`<button data-act="track" style="width:100%;margin:2px 0 8px">🎯 ${T('trk.btn')}</button>`;
  for(const[k,ty,lab,rg,only]of WINSP[g]||[]){
    if(only&&!only.includes(cur))continue;
    if(ty==='ist'&&stl)h+=`<div class="wico">${stl.map(s=>`<button data-wst="${s}" class="${cur===s?'on':''}" title="${esc(T('wst.'+s))}">${iconSvg(s,22)}</button>`).join('')}</div>`;
    else if(ty==='opt')h+=`<div class="fld"><label>${T(lab)}</label><div class="wst">${rg.map(([v,n])=>`<button data-wset="${k}:${v}" class="${(p[k]??rg[0][0])===v?'on':''}">${T(n)}</button>`).join('')}</div></div>`;
    else if(ty==='st'&&stl)h+=`<div class="wst">${stl.map(s=>`<button data-wst="${s}" class="${cur===s?'on':''}">${T('wst.'+s)}</button>`).join('')}</div>`;
    else if(ty==='place')h+=`<div class="fld"><label>${T('wdg.place')}</label><div class="seg">${[['top','wdg.top'],['center','wdg.center'],['bottom','wdg.bottom']].map(([v,n])=>`<button data-wpos="${v}">${T(n)}</button>`).join('')}</div></div>`;
    else if(ty==='mode')h+=`<div class="seg">${[['up','wdg.up'],['down','wdg.down']].map(([v,n])=>`<button data-wmode="${v}" class="${(p.mode||'up')===v?'on':''}">${T(n)}</button>`).join('')}</div>`;
    else if(ty==='txt')h+=`<div class="fld"><label>${T(lab)}</label><input data-k="p.${k}" data-t="s" type="text" value="${esc(p[k]??'')}"></div>`;
    else if(ty==='area')h+=`<div class="fld"><label>${T(lab)}</label><textarea data-k="p.${k}" data-t="s" rows="4">${esc(p[k]??'')}</textarea></div>`;
    else if(ty==='num')h+=R(T(lab),'p.'+k,rg[0],rg[1],rg[2]||1);
    else if(ty==='col')h+=CO(T(lab),'p.'+k);
    else if(ty==='chk')h+=CK(T(lab),'p.'+k);
    else if(ty==='hint')h+=`<p class="hint">${T(lab)}</p>`;
    else if(ty==='btn')h+=`<button data-act="${k}" style="width:100%;margin:4px 0">${T(lab)}</button>`;
  }
  return h;
}

function drawGenOverlay(c,t){
  const p=c.p,loc=t-c.start;ctx.save();ctx.globalAlpha=(p.op??100)/100;
  if(WDRAW[c.gen]){try{WDRAW[c.gen](c,p,loc,t)}finally{ctx.restore()}return}
  if(c.gen==='terminal'){
    const fs=p.size,lh=fs*1.35,lines=String(p.text).split('\n'),x=W*p.x/100,y=H*p.y/100;
    ctx.font=`${fs}px Consolas,"Courier New",monospace`;ctx.textBaseline='top';ctx.textAlign='left';
    let left=Math.floor(loc*p.speed);const shown=[];
    for(const ln of lines){if(left<=0)break;shown.push(ln.slice(0,left));left-=ln.length+1}
    const wmax=Math.max(10,...lines.map(l=>ctx.measureText(l).width));
    if(p.box){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x-fs*.6,y-fs*.5,wmax+fs*1.2,lines.length*lh+fs);ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.strokeRect(x-fs*.6,y-fs*.5,wmax+fs*1.2,lines.length*lh+fs)}
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=fs*.4;
    shown.forEach((l,i)=>ctx.fillText(l,x,y+i*lh));
    if(Math.floor(t*2.5)%2===0){const li=Math.max(0,shown.length-1);ctx.fillRect(x+ctx.measureText(shown[li]||'').width+2,y+li*lh,fs*.55,fs)}
    boxes.set(c.id,{x:x-fs*.6,y:y-fs*.5,w:wmax+fs*1.2,h:lines.length*lh+fs,rot:0});
  }else if(c.gen==='hackbar'){
    const w=W*p.w/100,h=H*.05,x=W*p.x/100-w/2,y=H*p.y/100,q=clamp(loc/c.dur,0,1),pr=q>=.97?1:Math.floor(q*40)/40,fs=Math.round(H*.035);
    ctx.font=`bold ${fs}px Consolas,"Courier New",monospace`;ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x-fs*.6,y-fs*1.8,w+fs*1.2,h+fs*2.5);
    ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=fs*.5;ctx.fillRect(x+4,y+4,(w-8)*pr,h-8);
    ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,.55)';for(let i=1;i<40;i++)ctx.fillRect(x+4+(w-8)*i/40,y+4,2,h-8);
    ctx.fillStyle=p.color;ctx.textAlign='left';
    const done=q>=.97;
    if(!done||Math.floor(t*4)%2===0)ctx.fillText(done?'ACCÈS AUTORISÉ':p.label,x,y-fs*.3);
    ctx.textAlign='right';ctx.fillText(Math.floor(pr*100)+'%',x+w,y-fs*.3);
    boxes.set(c.id,{x:x-fs*.6,y:y-fs*1.8,w:w+fs*1.2,h:h+fs*2.5,rot:0});
  }else if(c.gen==='shape'){
    const w=W*(p.w??30)/100,h=H*(p.h??20)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,lw=Math.max(1,(p.sw??8)*H/720),s=p.shape||'rect';
    ctx.translate(cx,cy);if(p.rot)ctx.rotate(p.rot*Math.PI/180);
    ctx.fillStyle=ctx.strokeStyle=p.color||'#ffffff';ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
    if(p.shadow){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=H*.02;ctx.shadowOffsetY=H*.006}
    ctx.beginPath();
    if(s==='rect')ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*(p.r??12)/200);
    else if(s==='circle')ctx.ellipse(0,0,w/2,h/2,0,0,TAU);
    else if(s==='arrow'){const hw=Math.min(h*.9,w*.45),bh=h*.38;ctx.moveTo(-w/2,-bh/2);ctx.lineTo(w/2-hw,-bh/2);ctx.lineTo(w/2-hw,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(w/2-hw,h/2);ctx.lineTo(w/2-hw,bh/2);ctx.lineTo(-w/2,bh/2);ctx.closePath()}
    else if(s==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.42:1;ctx.lineTo(Math.cos(a)*w/2*r,Math.sin(a)*h/2*r)}ctx.closePath()}
    else if(s==='line'){ctx.moveTo(-w/2,0);ctx.lineTo(w/2,0)}
    else if(s==='bubble'){ctx.roundRect(-w/2,-h/2,w,h*.8,Math.min(w,h)*.18);ctx.moveTo(-w*.22,h*.28);ctx.lineTo(-w*.3,h/2);ctx.lineTo(-w*.04,h*.28);ctx.closePath()}
    else if(s==='triangle'){ctx.moveTo(0,-h/2);ctx.lineTo(w/2,h/2);ctx.lineTo(-w/2,h/2);ctx.closePath()}
    else if(s==='diamond'){ctx.moveTo(0,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(0,h/2);ctx.lineTo(-w/2,0);ctx.closePath()}
    else if(s==='heart'){ctx.moveTo(0,h*.45);ctx.bezierCurveTo(-w*.62,h*.02,-w*.56,-h*.62,0,-h*.24);ctx.bezierCurveTo(w*.56,-h*.62,w*.62,h*.02,0,h*.45);ctx.closePath()}
    else if(s==='hexagon'){for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*w/2,Math.sin(a)*h/2)}ctx.closePath()}
    else if(s==='burst'){for(let i=0;i<24;i++){const a=-Math.PI/2+i*Math.PI/12,r=i%2?.76:1;ctx.lineTo(Math.cos(a)*w/2*r,Math.sin(a)*h/2*r)}ctx.closePath()}
    else if(s==='plus'){const a=w*.17,b=h*.17;ctx.moveTo(-a,-h/2);ctx.lineTo(a,-h/2);ctx.lineTo(a,-b);ctx.lineTo(w/2,-b);ctx.lineTo(w/2,b);ctx.lineTo(a,b);ctx.lineTo(a,h/2);ctx.lineTo(-a,h/2);ctx.lineTo(-a,b);ctx.lineTo(-w/2,b);ctx.lineTo(-w/2,-b);ctx.lineTo(-a,-b);ctx.closePath()}
    else if(s==='pill')ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)/2);
    else if(s==='dblarrow'){const hw=Math.min(h*.9,w*.3),bh=h*.38;ctx.moveTo(-w/2,0);ctx.lineTo(-w/2+hw,-h/2);ctx.lineTo(-w/2+hw,-bh/2);ctx.lineTo(w/2-hw,-bh/2);ctx.lineTo(w/2-hw,-h/2);ctx.lineTo(w/2,0);ctx.lineTo(w/2-hw,h/2);ctx.lineTo(w/2-hw,bh/2);ctx.lineTo(-w/2+hw,bh/2);ctx.lineTo(-w/2+hw,h/2);ctx.closePath()}
    else if(s==='check'){ctx.moveTo(-w/2,0);ctx.lineTo(-w/8,h*.4);ctx.lineTo(w/2,-h*.4)}
    if(s==='line'||s==='check'||p.fill===false)ctx.stroke();else ctx.fill();
    const bh2=s==='line'?Math.max(h,lw*4):h;
    boxes.set(c.id,{x:cx-w/2,y:cy-bh2/2,w,h:bh2,rot:p.rot||0});
  }else if(c.gen==='pbar'){
    const q=clamp(loc/Math.max(.01,c.dur),0,1),th=Math.max(2,H*(p.th??1.2)/100),y=p.pos==='top'?0:H-th;
    ctx.fillStyle=hexA(p.bgc,(p.bgo??35)/100);ctx.fillRect(0,y,W,th);ctx.fillStyle=p.color||'#ffffff';
    if(p.round){ctx.beginPath();ctx.roundRect(0,y,Math.max(th,W*q),th,th/2);ctx.fill()}else ctx.fillRect(0,y,W*q,th);
    boxes.set(c.id,{x:0,y:y-H*.01,w:W,h:th+H*.02,rot:0});
  }else if(c.gen==='count'){
    const from=Math.max(1,Math.round(p.from??3)),n=Math.floor(loc),f=loc-n,fs=H*(p.size??30)/100,x=W*(p.x??50)/100,y=H*(p.y??50)/100;
    const txt=n<from?String(from-n):(p.end||'');
    if(txt){
      const pop=f<.25?.6+.4*easeOut(f/.25):1,fade=n<from&&f>.85?1-(f-.85)/.15:1;
      ctx.translate(x,y);ctx.scale(pop,pop);ctx.globalAlpha*=fade;
      if(p.ring&&n<from){ctx.lineWidth=fs*.06;ctx.strokeStyle=hexA(p.color,.25);ctx.beginPath();ctx.arc(0,0,fs*.72,0,TAU);ctx.stroke();ctx.strokeStyle=p.color;ctx.beginPath();ctx.arc(0,0,fs*.72,-Math.PI/2,-Math.PI/2+TAU*(1-f));ctx.stroke()}
      ctx.font=`900 ${n<from?fs:fs*.42}px "Segoe UI",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.color||'#ffffff';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.08;ctx.fillText(txt,0,fs*.04);
    }
    boxes.set(c.id,{x:x-fs*.8,y:y-fs*.8,w:fs*1.6,h:fs*1.6,rot:0});
  }else if(c.gen==='timer'){
    const v=p.mode==='down'?Math.max(0,(p.from??60)-loc):loc,mi=Math.floor(v/60),s=Math.floor(v%60),cs=Math.floor((v%1)*100);
    const txt=String(mi).padStart(2,'0')+':'+String(s).padStart(2,'0')+(p.cs?'.'+String(cs).padStart(2,'0'):'');
    const fs=H*(p.size??9)/100,x=W*(p.x??50)/100,y=H*(p.y??12)/100;
    ctx.font=`700 ${fs}px Consolas,"Courier New",monospace`;ctx.textAlign='center';ctx.textBaseline='middle';const tw=ctx.measureText(txt).width;
    if(p.box){ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.roundRect(x-tw/2-fs*.4,y-fs*.65,tw+fs*.8,fs*1.3,fs*.2);ctx.fill()}
    ctx.fillStyle=p.color||'#ffffff';ctx.fillText(txt,x,y+fs*.03);
    boxes.set(c.id,{x:x-tw/2-fs*.4,y:y-fs*.65,w:tw+fs*.8,h:fs*1.3,rot:0});
  }else if(c.gen==='sub'){
    /* bouton « S'abonner » dessiné par DedCut (aucun logo) : il apparaît, un curseur vient cliquer, il passe en « Abonné » */
    const fs=H*(p.size??5)/100,x=W*(p.x??50)/100,y=H*(p.y??80)/100,ap=clamp(loc/.35,0,1),out=clamp((c.dur-loc)/.3,0,1),clicked=loc>=1.3;
    ctx.font=`700 ${fs}px "Segoe UI",sans-serif`;const txt=clicked?(p.done||''):(p.text||''),tw=ctx.measureText(txt).width,bw=tw+fs*2.2,bh=fs*2;
    const press=loc>1.2&&loc<1.4?.92:1,sc=(.6+.4*easeOut(ap))*press;ctx.globalAlpha*=Math.min(ap,out);
    ctx.translate(x,y);ctx.scale(sc,sc);
    ctx.fillStyle=clicked?'#3f3f46':(p.color||'#ef4444');ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.5;ctx.shadowOffsetY=fs*.12;
    ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,fs*.05);
    if(loc>.5&&loc<2.2){const k=easeOut(clamp((loc-.5)/.7,0,1)),s2=fs*1.1;ctx.translate(bw*.25+(1-k)*bw*.6,bh*.15+(1-k)*bh*1.4);
      ctx.fillStyle='#ffffff';ctx.strokeStyle='#111111';ctx.lineWidth=fs*.08;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,s2);ctx.lineTo(s2*.28,s2*.75);ctx.lineTo(s2*.5,s2*1.12);ctx.lineTo(s2*.65,s2*1.04);ctx.lineTo(s2*.45,s2*.68);ctx.lineTo(s2*.8,s2*.68);ctx.closePath();ctx.fill();ctx.stroke()}
    boxes.set(c.id,{x:x-bw/2,y:y-bh/2,w:bw,h:bh,rot:0});
  }else if(c.gen==='hud'){
    const m=Math.min(W,H)*.05,L=Math.min(W,H)*.09,fs=Math.round(H*.04);
    ctx.strokeStyle=p.color;ctx.fillStyle=p.color;ctx.lineWidth=Math.max(3,W/400);
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x,y+sy*L);ctx.lineTo(x,y);ctx.lineTo(x+sx*L,y);ctx.stroke()});
    ctx.font=`bold ${fs}px Consolas,"Courier New",monospace`;ctx.textBaseline='top';ctx.shadowColor='#000';ctx.shadowBlur=6;
    ctx.textAlign='left';ctx.fillText(p.label,m+L*.35,m+L*.3);
    if(Math.floor(t*1.6)%2===0){ctx.fillStyle='#ff2a2a';ctx.beginPath();ctx.arc(W-m-L*.35-fs*2.6,m+L*.3+fs*.5,fs*.32,0,7);ctx.fill()}
    ctx.fillStyle=p.color;ctx.textAlign='right';ctx.fillText('REC',W-m-L*.35,m+L*.3);
    const cs=Math.floor((loc%1)*100),s=Math.floor(loc)%60,mi=Math.floor(loc/60);
    ctx.textAlign='left';ctx.textBaseline='bottom';
    ctx.fillText(new Date().toISOString().slice(0,10).replace(/-/g,'/')+'  '+String(mi).padStart(2,'0')+':'+String(s).padStart(2,'0')+':'+String(cs).padStart(2,'0'),m+L*.35,H-m-L*.3);
    boxes.set(c.id,{x:0,y:0,w:W,h:H,rot:0});
  }
  ctx.restore();
}
/* sons synthétisés (WAV généré en JS) */
function makeWav(dur,fn,sr=44100){ // 44,1 kHz : qualité CD
  const n=Math.floor(dur*sr),buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  ws(0,'RIFF');v.setUint32(4,36+n*2,true);ws(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*2,true);
  // crêtes ramenées sous 0 dB (pas de saturation), au lieu de couper le son
  const d=new Float32Array(n);let pk=0;for(let i=0;i<n;i++){d[i]=fn(i/sr)||0;pk=Math.max(pk,Math.abs(d[i]))}
  const g=pk>.95?.95/pk:1;
  for(let i=0;i<n;i++)v.setInt16(44+i*2,clamp(d[i]*g,-1,1)*32767,true);
  return new Blob([buf],{type:'audio/wav'});
}
const TAU=Math.PI*2;
let wy=0;
const SOUNDS={
  whoosh:{name:'snd.whoosh',dur:.8,fn:t=>{if(t===0)wy=0;const e=Math.sin(Math.PI*t/.8),a=.03+.3*e*e;wy+=a*((Math.random()*2-1)-wy);return wy*2.4*e}},
  pop:{name:'common.pop',dur:.25,fn:t=>Math.sin(TAU*(180*t+700/30*(1-Math.exp(-30*t))))*Math.exp(-t*22)*.8},
  clic:{name:'snd.click',dur:.08,fn:t=>(Math.random()*2-1)*Math.exp(-t*90)*.7},
  ding:{name:'snd.ding',dur:1.4,fn:t=>(Math.sin(TAU*1320*t)+.35*Math.sin(TAU*2640*t))*Math.exp(-t*3.5)*.45},
  bip:{name:'snd.bleep',dur:.6,fn:t=>Math.sin(TAU*1000*t)*.45*Math.min(1,t/.005,(.6-t)/.005)},
  drop:{name:'snd.impact',dur:1.2,fn:t=>Math.sin(TAU*(40*t+140/3*(1-Math.exp(-3*t))))*Math.exp(-t*2.2)*.9},
  rire:{name:'snd.tada',dur:1.1,fn:t=>[523,659,784,1047].reduce((s,f,i)=>s+(t>i*.07?Math.sin(TAU*f*t)*Math.exp(-(t-i*.07)*4):0),0)*.22},
  swoosh:{name:'snd.swoosh',dur:.6,fn:t=>Math.sin(TAU*(200*t+1400*t*t))*Math.sin(Math.PI*t/.6)*.35},
  riser:{name:'snd.riser',dur:2.5,fn:t=>{const q=t/2.5;return(Math.sin(TAU*(200*t+1800*t*t*t/(3*2.5*2.5)))*.28+(Math.random()*2-1)*.14*q)*q}},
  boom:{name:'snd.boom',dur:2.5,fn:t=>(Math.sin(TAU*(35*t+60/4*(1-Math.exp(-4*t))))*.9+(Math.random()*2-1)*.25*Math.exp(-t*8))*Math.exp(-t*1.6)},
  notif:{name:'snd.notif',dur:.6,fn:t=>(t<.12?Math.sin(TAU*988*t)*Math.exp(-t*9):t>.15?Math.sin(TAU*1319*t)*Math.exp(-(t-.15)*7):0)*.45},
  erreur:{name:'snd.error',dur:.5,fn:t=>Math.sign(Math.sin(TAU*(t<.22?220:160)*t))*.16*(t<.2||t>.26&&t<.48?1:0)},
  applau:{name:'snd.applause',dur:3,fn:t=>{const e=Math.min(1,t/.3)*Math.min(1,(3-t)/.8),k=hash(Math.floor(t*60))>.5?Math.exp(-((t*60)%1)*6):0;return(Math.random()*2-1)*(.12+.5*k)*e}},
  coeur:{name:'snd.heart',dur:1.6,fn:t=>{const l=t%.8,a=l<.12?Math.exp(-l*30):l>.18&&l<.32?Math.exp(-(l-.18)*30)*.7:0;return Math.sin(TAU*55*l)*a*.9}},
  piece:{name:'snd.coin',dur:.6,fn:t=>(Math.sin(TAU*1975*t)*.4+(t>.08?Math.sin(TAU*2637*t)*.4:0))*Math.exp(-t*7)},
  tictac:{name:'snd.tick',dur:2,fn:t=>{const l=t%.5;return(Math.random()*2-1)*Math.exp(-l*120)*(Math.floor(t/.5)%2?.4:.6)}},
  laser:{name:'snd.laser',dur:.4,fn:t=>Math.sin(TAU*(200*t+1800/8*(1-Math.exp(-8*t))))*Math.exp(-t*6)*.4},
  saut:{name:'snd.jump',dur:.3,fn:t=>Math.sign(Math.sin(TAU*(300*t+1000*t*t)))*.16*Math.exp(-t*4)},
  bonus:{name:'snd.powerup',dur:.9,fn:t=>{const n=Math.min(7,Math.floor(t/.1)),l=t-n*.1;return Math.sign(Math.sin(TAU*523*Math.pow(2,n/4)*t))*.13*Math.exp(-l*6)*Math.min(1,(.9-t)/.05)}},
  photo:{name:'snd.camera',dur:.35,fn:t=>(Math.random()*2-1)*(Math.exp(-t*120)*.8+(t>.12?Math.exp(-(t-.12)*80)*.55:0))},
  tonnerre:{name:'snd.thunder',dur:3.5,fn:t=>{if(t===0)wy=0;wy+=.025*((Math.random()*2-1)-wy);const e=t<.08?t/.08:Math.exp(-(t-.08)*1.1)*(1+.6*Math.max(0,Math.sin(t*9)));return wy*4*e}},
  roulement:{name:'snd.drumroll',dur:3.2,fn:t=>t<2.2?(Math.random()*2-1)*Math.exp(-(t%(1/28))*90)*(.15+.35*t/2.2):(Math.random()*2-1)*Math.exp(-(t-2.2)*3)*.55+Math.sin(TAU*90*t)*Math.exp(-(t-2.2)*12)*.5},
  badum:{name:'snd.rimshot',dur:1.5,fn:t=>Math.sin(TAU*180*t)*Math.exp(-t*14)*.6+(t>.18?Math.sin(TAU*140*t)*Math.exp(-(t-.18)*12)*.6:0)+(t>.42?(Math.random()*2-1)*Math.exp(-(t-.42)*4.5)*.32:0)},
  clavier:{name:'snd.typing',dur:2,fn:t=>{const k=Math.floor(t/.11),l=t-k*.11-hash(k)*.04;return l>0?(Math.random()*2-1)*Math.exp(-l*220)*(.3+.3*hash(k+7)):0}},
  magie:{name:'snd.magic',dur:1.6,fn:t=>[2093,2637,3136,3520,4186,5274].reduce((s,f,i)=>s+(t>i*.12?Math.sin(TAU*f*t)*Math.exp(-(t-i*.12)*5):0),0)*.12},
  sifflet:{name:'snd.whistle',dur:.9,fn:t=>Math.sin(TAU*2400*t-150/28*Math.cos(TAU*28*t))*.3*Math.min(1,t/.03,(.9-t)/.08)},
  gong:{name:'snd.gong',dur:4,fn:t=>[[110,1],[163,.7],[227,.5],[311,.35],[421,.2]].reduce((s,[f,a])=>s+Math.sin(TAU*f*t)*a*Math.exp(-t*(.8+f/400)),0)*.32*Math.min(1,t/.01)},
  boing:{name:'snd.boing',dur:.7,fn:t=>{if(t===0)wy=0;wy+=TAU*(260+160*Math.sin(t*45)*Math.exp(-t*4))/44100;return Math.sin(wy)*Math.exp(-t*4.5)*.5}},
  suspense:{name:'snd.suspense',dur:2.8,fn:t=>{const N=[[0,.38,147],[.45,.38,139],[.9,1.9,131]];let s=0;for(const[a,d,f]of N)if(t>=a&&t<a+d){const l=t-a;for(let k=1;k<6;k++)s+=Math.sin(TAU*f*k*t)/k*Math.exp(-l*(d>1?1.2:4))*Math.min(1,l/.01)}return s*.3}}
};
const OLDSND={};
function renderSounds(){$('#slist').innerHTML=Object.entries(SOUNDS).map(([k,s])=>`<div class="srow"><button data-sprev="${k}" title="${T('common.listen')}">${ico('play',14)}</button><span>${T(s.name)}</span><span class="hint">${s.dur}s</span><button data-snd="${k}" title="${T('common.addAtPlayhead')}">+</button></div>`).join('')}
renderSounds();
async function soundMedia(key){
  // nom de fichier fixe (indépendant de la langue) pour réutiliser le même bruitage
  const s=SOUNDS[key],name='DedCut-'+key+'.wav';let m=media.find(x=>x.name===name||(OLDSND[key]&&x.name===OLDSND[key]+'.wav'));
  if(m)return m;
  m=await addGenerated(new File([makeWav(s.dur,s.fn)],name,{type:'audio/wav'}));m.duration=s.dur;return m;
}
async function soundClip(key,start){const m=await soundMedia(key);return newClip({track:tk('audio'),mid:m.id,start,dur:m.duration,p:{vol:100}})}
let prevAudio;
function previewSound(k){const s=SOUNDS[k];if(prevAudio)prevAudio.pause();prevAudio=new Audio(URL.createObjectURL(makeWav(s.dur,s.fn)));prevAudio.play().catch(()=>{})}
$('#lib').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const g=b.dataset.gen,s=b.dataset.snd;
  if(g){const d=genDefaults(g);add(newClip({track:tk('over'),gen:g,start:time,dur:d.dur,p:d.p}))}
  if(s)soundClip(s,time).then(add);
  if(b.dataset.sprev)previewSound(b.dataset.sprev);
  if(b.dataset.tab2)showTab(b.dataset.tab2);
});

/* ---------- zone d'export (I = début, O = fin) : seule cette partie est exportée si la case est cochée ---------- */
var xin=null,xout=null;
function setRange(w,t){t=clamp(t??time,0,total());if(w==='in'){xin=t;if(xout!=null&&xout<=xin+.05)xout=null}else{xout=t;if(xin!=null&&xin>=xout-.05)xin=null}renderTL();toast(T('range.set',{a:fmt(xin??0),b:fmt(xout??total())}))}
function clearRange(){xin=xout=null;renderTL();toast(T('range.cleared'))}
function expRange(){const cb=$('#xRange');if(!cb||!cb.checked||(xin==null&&xout==null))return null;const T0=total(),a=clamp(xin??0,0,T0),b=clamp(xout??T0,0,T0);return b-a>.05?[a,b]:null}
function expDur(){const r=expRange();return r?r[1]-r[0]:total()}
function rangeRow(){const row=$('#xRangeRow');if(!row)return;const has=xin!=null||xout!=null;row.hidden=!has;if(has){const T0=total(),a=clamp(xin??0,0,T0),b=clamp(xout??T0,0,T0);$('#xRangeTxt').textContent=T('range.only',{a:fmt(a),b:fmt(b),d:fmt(Math.max(0,b-a))})}}
/* garde seulement [a,b] le temps de l'export (clips coupés aux bords, décalés au début) ; renvoie la fonction qui remet tout comme avant */
function rangeApply(a,b){
  const snap=JSON.stringify({c:clips,m:markers}),out=[];
  for(const c of clips){
    const s=c.start,en=s+c.dur;if(en<=a+1e-4||s>=b-1e-4)continue;
    const ns=Math.max(s,a),ne=Math.min(en,b),r=c.p.rate||1,cutL=ns-s,cutR=en-ne;
    if(c.mid){if(c.p.rev)c.in+=cutR*r;else c.in+=cutL*r}
    if(cutL>.01){c.p.anim='none';c.p.tin='none';c.p.afin=0}
    if(cutR>.01){c.p.aout='none';c.p.tout='none';c.p.afout=0}
    if(c.kf)c.kf=c.kf.map(k=>({...k,t:k.t-cutL}));
    c.start=ns-a;c.dur=ne-ns;out.push(c);
  }
  clips=out;markers=markers.filter(t=>t>=a&&t<=b).map(t=>t-a);
  return()=>{const o=JSON.parse(snap);clips=o.c;markers=o.m;refresh()};
}
/* ---------- supprimer les trous (resserrer les clips d'une piste vers la gauche) ---------- */
function closeGaps(ti){
  let moved=0;
  for(const i of ti==null?tracks.map((_,k)=>k):[ti]){
    if(!tracks[i]||tracks[i].lock)continue;let end=0;
    for(const c of clips.filter(c=>c.track===i).sort((x,y)=>x.start-y.start)){if(c.start>end+.001){c.start=end;moved++}end=Math.max(end,c.start+c.dur)}
  }
  if(moved){commit();refresh();toast(T('gap.done',{count:moved}))}else toast(T('gap.none'));
}

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
function wInsp(c,p,R,CO,CK){
  const g=c.gen,stl=WSTY[g],cur=p.st||(stl&&stl[0]);let h='';
  for(const[k,ty,lab,rg,only]of WINSP[g]||[]){
    if(only&&!only.includes(cur))continue;
    if(ty==='st'&&stl)h+=`<div class="wst">${stl.map(s=>`<button data-wst="${s}" class="${cur===s?'on':''}">${T('wst.'+s)}</button>`).join('')}</div>`;
    else if(ty==='place')h+=`<div class="fld"><label>${T('wdg.place')}</label><div class="seg">${[['top','wdg.top'],['center','wdg.center'],['bottom','wdg.bottom']].map(([v,n])=>`<button data-wpos="${v}">${T(n)}</button>`).join('')}</div></div>`;
    else if(ty==='mode')h+=`<div class="seg">${[['up','wdg.up'],['down','wdg.down']].map(([v,n])=>`<button data-wmode="${v}" class="${(p.mode||'up')===v?'on':''}">${T(n)}</button>`).join('')}</div>`;
    else if(ty==='txt')h+=`<div class="fld"><label>${T(lab)}</label><input data-k="p.${k}" data-t="s" type="text" value="${esc(p[k]??'')}"></div>`;
    else if(ty==='num')h+=R(T(lab),'p.'+k,rg[0],rg[1],rg[2]||1);
    else if(ty==='col')h+=CO(T(lab),'p.'+k);
    else if(ty==='chk')h+=CK(T(lab),'p.'+k);
    else if(ty==='hint')h+=`<p class="hint">${T(lab)}</p>`;
  }
  return h;
}

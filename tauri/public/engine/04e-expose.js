/* ---------- pack « Exposé » (v4.36) : éléments pour faire des exposés et des présentations en vidéo ----------
   Fonds de diapo, listes, étapes, frise, encadrés, comparaison, chiffre clé, citation, sources, plan, annotations, camembert.
   Tout est dessiné par DedCut (aucune image, aucune police imposée sauf les polices libres livrées). */
const XL=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const XA=(loc,dur,a=.45,o=.35)=>Math.min(easeOut(clamp(loc/a,0,1)),clamp((dur-loc)/o,0,1));
const XF=(name,fb)=>{fontReady(name);return `"${name}",${fb||'"Segoe UI",sans-serif'}`};
const XCARD=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()};
/* fond de diapo (plein écran) */
WDRAW.slide=(c,p,loc)=>{
  const st=p.st||'sclean',col=p.color||'#6366f1',k=XA(loc,c.dur,.5,.4);ctx.globalAlpha*=k;
  const fs=H*(p.tsize??7)/100;let tc='#0f172a',tf=XF('Montserrat');
  if(st==='sclean'){ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,W,H);ctx.fillStyle=col;ctx.fillRect(0,0,W*.012,H)}
  else if(st==='sdark'){const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0f172a');g.addColorStop(1,'#1e1b4b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);tc='#ffffff'}
  else if(st==='snote'){ctx.fillStyle='#fffef6';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(59,130,246,.35)';ctx.lineWidth=Math.max(1,H/540);for(let y=H*.2;y<H;y+=H/16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.strokeStyle='rgba(239,68,68,.6)';ctx.beginPath();ctx.moveTo(W*.08,0);ctx.lineTo(W*.08,H);ctx.stroke();tf=XF('Caveat','cursive');tc='#1e3a8a'}
  else if(st==='schalk'){ctx.fillStyle='#5b3a1e';ctx.fillRect(0,0,W,H);const b=H*.035;const g=ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,W*.7);g.addColorStop(0,'#2f5a45');g.addColorStop(1,'#1d3b2c');ctx.fillStyle=g;ctx.fillRect(b,b,W-2*b,H-2*b);tf=XF('Shadows Into Light','cursive');tc='#f5f5f4'}
  else if(st==='sgrid'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(14,165,233,.22)';ctx.lineWidth=Math.max(1,H/720);const s=H/24;for(let x=0;x<W;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
  else{const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,col);g.addColorStop(1,'#0f172a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);tc='#ffffff'}
  if(p.title){ctx.font=wFont(800,fs,tf);ctx.fillStyle=tc;ctx.textAlign='left';ctx.textBaseline='middle';const ty=H*.13,tx=W*(st==='snote'?.11:.07);ctx.fillText(p.title,tx,ty);
    const tw=ctx.measureText(p.title).width;ctx.fillStyle=st==='schalk'?'#fde68a':col;ctx.fillRect(tx,ty+fs*.7,Math.min(tw,W*.3)*easeOut(clamp((loc-.2)/.6,0,1)),Math.max(2,fs*.1))}
  boxes.set(c.id,{x:0,y:0,w:W,h:H,rot:0});
};
/* liste à puces : un élément apparaît après l'autre */
WDRAW.bullets=(c,p,loc)=>{
  const items=XL(p.text),st=p.st||'bdot',fs=H*(p.size??4.6)/100,col=p.color||'#6366f1',tcol=p.tcolor||'#ffffff',x0=W*(p.x??8)/100,y0=H*(p.y??28)/100,w=W*(p.w??84)/100,dl=Math.max(.05,p.delay??.7),out=clamp((c.dur-loc)/.35,0,1);
  ctx.font=wFont(600,fs);ctx.textBaseline='middle';let y=y0;const ind=fs*1.9;let maxY=y0;
  items.forEach((it,i)=>{
    const q=easeOut(clamp((loc-i*dl)/.45,0,1));if(q<=0){return}
    const lines=wWrap(ctx,it,w-ind-(st==='bcard'?fs:0)),lh=fs*1.35,hh=lines.length*lh+(st==='bcard'?fs*.8:0);
    ctx.save();ctx.globalAlpha*=q*out;ctx.translate((1-q)*-fs*2,0);
    if(st==='bcard'){XCARD(x0,y,w,hh,fs*.35,'rgba(15,23,42,.72)');ctx.fillStyle=col;ctx.fillRect(x0,y,fs*.22,hh)}
    const my=y+(st==='bcard'?fs*.4:0)+lh/2,mx=x0+(st==='bcard'?fs*.9:fs*.55);
    ctx.fillStyle=col;
    if(st==='bnum'||st==='bcard'){ctx.beginPath();ctx.arc(mx,my,fs*.55,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.font=wFont(800,fs*.65);ctx.textAlign='center';ctx.fillText(String(i+1),mx,my+fs*.03)}
    else if(st==='bcheck'){ctx.beginPath();ctx.roundRect(mx-fs*.5,my-fs*.5,fs,fs,fs*.2);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=fs*.14;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(mx-fs*.25,my);ctx.lineTo(mx-fs*.05,my+fs*.2);ctx.lineTo(mx+fs*.27,my-fs*.2);ctx.stroke()}
    else if(st==='barrow'){ctx.beginPath();ctx.moveTo(mx-fs*.35,my-fs*.4);ctx.lineTo(mx+fs*.4,my);ctx.lineTo(mx-fs*.35,my+fs*.4);ctx.closePath();ctx.fill()}
    else{ctx.beginPath();ctx.arc(mx,my,fs*.24,0,TAU);ctx.fill()}
    ctx.font=wFont(600,fs);ctx.textAlign='left';ctx.fillStyle=tcol;if(st!=='bcard'){ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.2}
    lines.forEach((l,j)=>ctx.fillText(l,x0+ind+(st==='bcard'?fs*.3:0),my+j*lh));
    ctx.restore();y+=hh+fs*.55;maxY=y;
  });
  boxes.set(c.id,{x:x0,y:y0,w,h:Math.max(fs*2,maxY-y0),rot:0});
};
/* étapes numérotées reliées par un trait */
WDRAW.steps=(c,p,loc)=>{
  const items=XL(p.text),n=Math.max(1,items.length),fs=H*(p.size??4)/100,col=p.color||'#22c55e',tcol=p.tcolor||'#ffffff',vert=p.st==='svert',dl=Math.max(.05,p.delay??.8),out=clamp((c.dur-loc)/.35,0,1);
  const cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,L=vert?H*(p.w??60)/100:W*(p.w??80)/100,r=fs*1.05;ctx.globalAlpha*=out;
  const pos=i=>n===1?0:-L/2+L*i/(n-1),P=i=>vert?[cx-W*.15,cy+pos(i)]:[cx+pos(i),cy];
  const prog=clamp(loc/(dl*(n-1)+.01),0,1);ctx.strokeStyle=hexA(col,.35);ctx.lineWidth=fs*.22;ctx.lineCap='round';
  const [ax,ay]=P(0),[bx,by]=P(n-1);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+(bx-ax)*prog,ay+(by-ay)*prog);ctx.stroke();
  items.forEach((it,i)=>{const q=backOut(clamp((loc-i*dl)/.4,0,1));if(q<=0)return;const[x,y]=P(i);
    ctx.save();ctx.translate(x,y);ctx.scale(q,q);ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs*.3;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),0,fs*.05);ctx.restore();
    ctx.save();ctx.globalAlpha*=clamp((loc-i*dl-.15)/.35,0,1);ctx.fillStyle=tcol;ctx.font=wFont(700,fs*.8);ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.2;
    if(vert){ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(it,x+r*1.6,y)}else{ctx.textAlign='center';ctx.textBaseline='top';wWrap(ctx,it,L/n*1.05).forEach((l,j)=>ctx.fillText(l,x,y+r*1.5+j*fs))}ctx.restore()});
  boxes.set(c.id,vert?{x:cx-W*.15-r,y:cy-L/2-r,w:W*.5,h:L+2*r,rot:0}:{x:cx-L/2-r,y:cy-r,w:L+2*r,h:r*2+fs*3,rot:0});
};
/* frise chronologique : « date : événement » par ligne */
WDRAW.timeline=(c,p,loc)=>{
  const ev=XL(p.text).map(s=>{const m=s.match(/^(.{1,24}?)\s*[:—–-]\s+(.*)$/);return m?[m[1],m[2]]:[s,'']}),n=Math.max(1,ev.length),fs=H*(p.size??3.6)/100,col=p.color||'#f59e0b',tcol=p.tcolor||'#ffffff',out=clamp((c.dur-loc)/.35,0,1);
  const cx=W*(p.x??50)/100,cy=H*(p.y??55)/100,L=W*(p.w??84)/100,x0=cx-L/2,dl=Math.max(.1,p.delay??.9),total=dl*n;ctx.globalAlpha*=out;
  const prog=clamp(loc/total,0,1);ctx.lineCap='round';ctx.strokeStyle=hexA(tcol,.25);ctx.lineWidth=fs*.25;ctx.beginPath();ctx.moveTo(x0,cy);ctx.lineTo(x0+L,cy);ctx.stroke();
  ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(x0,cy);ctx.lineTo(x0+L*prog,cy);ctx.stroke();
  ev.forEach(([d,t],i)=>{const x=x0+L*(i+.5)/n,q=clamp((prog*L-(x-x0))/(fs*2)+1,0,1);if(q<=0)return;const up=i%2===0;
    ctx.save();ctx.globalAlpha*=q;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,cy,fs*.55*backOut(q),0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,cy,fs*.22,0,TAU);ctx.fill();
    ctx.strokeStyle=hexA(col,.7);ctx.lineWidth=Math.max(1,fs*.08);ctx.beginPath();ctx.moveTo(x,cy+(up?-1:1)*fs*.7);ctx.lineTo(x,cy+(up?-1:1)*fs*1.6);ctx.stroke();
    ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.2;ctx.fillStyle=col;ctx.font=wFont(900,fs*1.1);ctx.textBaseline=up?'bottom':'top';const yd=cy+(up?-1:1)*fs*1.8;ctx.fillText(d,x,yd);
    ctx.fillStyle=tcol;ctx.font=wFont(600,fs*.8);const tl=wWrap(ctx,t,L/n*.95);(up?tl.slice().reverse():tl).forEach((l,j)=>ctx.fillText(l,x,yd+(up?-1:1)*(fs*1.25+j*fs*.95)));ctx.restore()});
  boxes.set(c.id,{x:x0,y:cy-fs*5,w:L,h:fs*10,rot:0});
};
/* encadré : définition, à retenir, exemple, attention, astuce */
const XBOX={def:['#3b82f6','expo.h.def'],retain:['#f59e0b','expo.h.retain'],example:['#22c55e','expo.h.example'],warn:['#ef4444','expo.h.warn'],tip:['#a855f7','expo.h.tip']};
WDRAW.defbox=(c,p,loc)=>{
  const st=XBOX[p.st]?p.st:'def',[col0,hk]=XBOX[st],col=p.color||col0,fs=H*(p.size??3.8)/100,w=W*(p.w??62)/100,cx=W*(p.x??50)/100,cy=H*(p.y??52)/100,k=XA(loc,c.dur,.45,.35),pad=fs*1.1;
  ctx.font=wFont(500,fs);const body=wWrap(ctx,p.text,w-pad*2);ctx.font=wFont(900,fs*1.3);const term=p.title?wWrap(ctx,p.title,w-pad*2):[];
  const h=pad*2+fs*1.4+term.length*fs*1.5+body.length*fs*1.4+(term.length?fs*.4:0),x=cx-w/2,y=cy-h/2;
  ctx.globalAlpha*=k;ctx.translate(cx,cy);const s=.92+.08*k;ctx.scale(s,s);ctx.translate(-cx,-cy);
  ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=fs*.8;ctx.shadowOffsetY=fs*.2;XCARD(x,y,w,h,fs*.5,'#ffffff');ctx.shadowColor='transparent';
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y,fs*.35,h,[fs*.5,0,0,fs*.5]);ctx.fill();
  const lab=T(hk).toUpperCase();ctx.font=wFont(800,fs*.75);const lw=ctx.measureText(lab).width+fs*1.2;XCARD(x+pad,y+pad*.8,lw,fs*1.2,fs*.6,hexA(col,.15));ctx.fillStyle=col;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(lab,x+pad+fs*.6,y+pad*.8+fs*.62);
  let yy=y+pad*.8+fs*2.1;ctx.fillStyle='#0f172a';ctx.font=wFont(900,fs*1.3);term.forEach(l=>{ctx.fillText(l,x+pad,yy+fs*.7);yy+=fs*1.5});if(term.length)yy+=fs*.4;
  ctx.fillStyle='#334155';ctx.font=wFont(500,fs);body.forEach(l=>{ctx.fillText(l,x+pad,yy+fs*.6);yy+=fs*1.4});
  boxes.set(c.id,{x,y,w,h,rot:0});
};
/* comparaison sur deux colonnes */
WDRAW.compare=(c,p,loc)=>{
  const fs=H*(p.size??3.6)/100,w=W*(p.w??84)/100,cx=W*(p.x??50)/100,cy=H*(p.y??55)/100,ca=p.color||'#3b82f6',cb=p.color2||'#f97316',out=clamp((c.dur-loc)/.35,0,1),dl=Math.max(.05,p.delay??.5);
  const A=XL(p.a),B=XL(p.b),cw=w/2-fs*1.2,rows=Math.max(A.length,B.length),h=fs*3.2+rows*fs*1.7+fs,y=cy-h/2;ctx.globalAlpha*=out;
  [[cx-w/2,ca,p.ta,A,-1],[cx+fs*1.2,cb,p.tb,B,1]].forEach(([x,col,tt,L,sd],ci)=>{const q=easeOut(clamp((loc-ci*.2)/.45,0,1));ctx.save();ctx.globalAlpha*=q;ctx.translate(sd*(1-q)*fs*3,0);
    XCARD(x,y,cw,h,fs*.5,'rgba(15,23,42,.78)');ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y,cw,fs*2.4,[fs*.5,fs*.5,0,0]);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs*1.05);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tt||'',x+cw/2,y+fs*1.2);
    ctx.font=wFont(600,fs*.9);ctx.textAlign='left';L.forEach((it,i)=>{const r=clamp((loc-.4-i*dl)/.35,0,1);if(r<=0)return;ctx.globalAlpha=q*r*out;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+fs*1,y+fs*3.4+i*fs*1.7,fs*.22,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(wWrap(ctx,it,cw-fs*2.2)[0]||'',x+fs*1.6,y+fs*3.4+i*fs*1.7)});ctx.restore()});
  const q=backOut(clamp((loc-.3)/.4,0,1));if(q>0){ctx.save();ctx.translate(cx,cy);ctx.scale(q,q);ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs*.5;ctx.beginPath();ctx.arc(0,0,fs*1.2,0,TAU);ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='#0f172a';ctx.font=wFont(900,fs*.9);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.vs||'VS',0,fs*.05);ctx.restore()}
  boxes.set(c.id,{x:cx-w/2,y,w,h,rot:0});
};
/* chiffre clé (compte jusqu'au nombre) */
WDRAW.keyfig=(c,p,loc)=>{
  const fs=H*(p.size??16)/100,col=p.color||'#facc15',cx=W*(p.x??50)/100,cy=H*(p.y??45)/100,k=XA(loc,c.dur,.3,.35),v=String(p.value??''),m=v.match(/-?\d+([.,]\d+)?/);
  let txt=v;if(m){const num=parseFloat(m[0].replace(',','.')),dec=(m[1]||'').length?m[1].length-1:0,q=easeOut(clamp(loc/1.4,0,1));txt=v.replace(m[0],(num*q).toFixed(dec).replace('.',m[0].includes(',')?',':'.'))}
  ctx.globalAlpha*=k;ctx.font=wFont(900,fs,XF('Montserrat'));ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=col;ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.12;ctx.fillText(txt,cx,cy);
  const tw=Math.max(fs*2,ctx.measureText(v).width);ctx.shadowColor='transparent';ctx.fillRect(cx-tw*.25*easeOut(clamp((loc-.3)/.6,0,1)),cy+fs*.62,tw*.5*easeOut(clamp((loc-.3)/.6,0,1)),Math.max(2,fs*.05));
  ctx.fillStyle=p.tcolor||'#ffffff';ctx.font=wFont(600,fs*.24);ctx.globalAlpha*=clamp((loc-.4)/.4,0,1);const L=wWrap(ctx,p.label,W*.6);L.forEach((l,i)=>ctx.fillText(l,cx,cy+fs*.95+i*fs*.32));
  boxes.set(c.id,{x:cx-tw/2,y:cy-fs*.6,w:tw,h:fs*1.4+L.length*fs*.32,rot:0});
};
/* citation */
WDRAW.quote=(c,p,loc)=>{
  const fs=H*(p.size??4.6)/100,col=p.color||'#a78bfa',cx=W*(p.x??50)/100,cy=H*(p.y??48)/100,w=W*(p.w??70)/100,k=XA(loc,c.dur,.6,.4);ctx.globalAlpha*=k;
  ctx.font=wFont('italic 500',fs,XF('Playfair Display','Georgia,serif'));const L=wWrap(ctx,p.text,w),h=L.length*fs*1.35;
  ctx.fillStyle=hexA(col,.85);ctx.font=wFont(900,fs*4,'Georgia,serif');ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('“',cx-w/2-fs*1.2,cy-h/2-fs*1.6);
  ctx.fillStyle=p.tcolor||'#ffffff';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.2;ctx.font=wFont('italic 500',fs,XF('Playfair Display','Georgia,serif'));ctx.textAlign='center';ctx.textBaseline='middle';
  const len=(p.text||'').length;let left=Math.floor(clamp(loc/Math.max(.5,len*.035),0,1)*len);
  L.forEach((l,i)=>{const s=l.slice(0,Math.max(0,left));left-=l.length+1;ctx.fillText(s,cx,cy-h/2+fs*.68+i*fs*1.35)});
  if(p.author){ctx.globalAlpha*=clamp((loc-1)/.5,0,1);ctx.fillStyle=col;ctx.font=wFont(700,fs*.7);ctx.fillText('— '+p.author,cx,cy+h/2+fs*.9)}
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2-fs,w,h:h+fs*2.4,rot:0});
};
/* sources / bibliographie */
WDRAW.sources=(c,p,loc)=>{
  const fs=H*(p.size??2.6)/100,x=W*(p.x??6)/100,y=H*(p.y??58)/100,w=W*(p.w??60)/100,L=XL(p.text),k=XA(loc,c.dur);ctx.globalAlpha*=k;
  ctx.font=wFont(500,fs);const lines=L.flatMap(l=>wWrap(ctx,'• '+l,w-fs*2)),h=fs*3+lines.length*fs*1.35;
  XCARD(x,y,w,h,fs*.5,'rgba(15,23,42,.78)');ctx.fillStyle=p.color||'#94a3b8';ctx.font=wFont(800,fs*1.1);ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText((p.title||'').toUpperCase(),x+fs,y+fs*1.4);
  ctx.fillStyle='#e2e8f0';ctx.font=wFont(500,fs);lines.forEach((l,i)=>ctx.fillText(l,x+fs,y+fs*3+i*fs*1.35));
  boxes.set(c.id,{x,y,w,h,rot:0});
};
/* titre de partie */
WDRAW.chapter=(c,p,loc)=>{
  const fs=H*(p.size??8)/100,col=p.color||'#22d3ee',cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,k=XA(loc,c.dur,.5,.4),q=easeOut(clamp((loc-.15)/.7,0,1));ctx.globalAlpha*=k;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=col;ctx.font=wFont(800,fs*.42);if('letterSpacing' in ctx)ctx.letterSpacing=(fs*.12)+'px';ctx.fillText(String(p.num||'').toUpperCase(),cx,cy-fs*.9);if('letterSpacing' in ctx)ctx.letterSpacing='0px';
  ctx.fillStyle=p.tcolor||'#ffffff';ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.15;ctx.font=wFont(900,fs,XF('Montserrat'));ctx.fillText(p.title||'',cx,cy+fs*.15*(1-q)+fs*.1);
  const tw=ctx.measureText(p.title||'').width;ctx.shadowColor='transparent';ctx.fillStyle=col;ctx.fillRect(cx-tw/2*q,cy+fs*.8,tw*q,Math.max(2,fs*.07));
  boxes.set(c.id,{x:cx-tw/2,y:cy-fs*1.3,w:tw,h:fs*2.3,rot:0});
};
/* plan / sommaire avec l'élément en cours */
WDRAW.agenda=(c,p,loc)=>{
  const L=XL(p.text),fs=H*(p.size??4.2)/100,col=p.color||'#6366f1',x=W*(p.x??10)/100,y0=H*(p.y??28)/100,w=W*(p.w??60)/100,cur=Math.round(p.cur??0),out=clamp((c.dur-loc)/.35,0,1);
  L.forEach((it,i)=>{const q=easeOut(clamp((loc-i*.25)/.4,0,1));if(q<=0)return;const y=y0+i*fs*2.1,on=cur===i+1;ctx.save();ctx.globalAlpha*=q*out*(cur&&!on?.55:1);ctx.translate((1-q)*-fs*2,0);
    XCARD(x,y,w,fs*1.7,fs*.4,on?col:'rgba(15,23,42,.7)');ctx.fillStyle=on?'#ffffff':col;ctx.font=wFont(900,fs*.85);ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(String(i+1).padStart(2,'0'),x+fs*.6,y+fs*.87);
    ctx.fillStyle='#ffffff';ctx.font=wFont(on?800:600,fs*.85);ctx.fillText(wWrap(ctx,it,w-fs*3.2)[0]||'',x+fs*2.3,y+fs*.87);ctx.restore()});
  boxes.set(c.id,{x,y:y0,w,h:Math.max(fs*2,L.length*fs*2.1),rot:0});
};
/* annotation : étiquette reliée à un point */
WDRAW.callout=(c,p,loc)=>{
  const fs=H*(p.size??3.6)/100,col=p.color||'#facc15',x=W*(p.x??66)/100,y=H*(p.y??30)/100,ax=W*(p.ax??45)/100,ay=H*(p.ay??55)/100,k=XA(loc,c.dur,.3,.35),q=easeOut(clamp(loc/.6,0,1));ctx.globalAlpha*=k;
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,fs*.12);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(ax-x)*q,y+(ay-y)*q);ctx.stroke();
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(ax,ay,fs*.35*backOut(clamp((loc-.5)/.3,0,1)),0,TAU);ctx.fill();ctx.strokeStyle=hexA(col,.5);ctx.lineWidth=fs*.08;ctx.beginPath();ctx.arc(ax,ay,fs*(.6+.3*Math.sin(loc*5)),0,TAU);ctx.stroke();
  ctx.font=wFont(800,fs);const tw=ctx.measureText(p.text||'').width,bw=tw+fs*1.4,bh=fs*1.8;XCARD(x-bw/2,y-bh/2,bw,bh,fs*.5,col);ctx.fillStyle='#111111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.text||'',x,y+fs*.05);
  boxes.set(c.id,{x:x-bw/2,y:y-bh/2,w:bw,h:bh,rot:0});
};
/* surligneur */
WDRAW.marker=(c,p,loc)=>{
  const w=W*(p.w??30)/100,h=H*(p.h??7)/100,x=W*(p.x??50)/100-w/2,y=H*(p.y??50)/100-h/2,q=easeOut(clamp(loc/.5,0,1)),out=clamp((c.dur-loc)/.3,0,1);
  ctx.globalAlpha*=.55*out;ctx.globalCompositeOperation='multiply';ctx.fillStyle=p.color||'#facc15';ctx.beginPath();ctx.roundRect(x,y,w*q,h,h*.2);ctx.fill();
  boxes.set(c.id,{x,y,w,h,rot:0});
};
/* cercle dessiné à la main autour d'une zone */
WDRAW.circleann=(c,p,loc)=>{
  const w=W*(p.w??24)/100,h=H*(p.h??22)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,q=easeOut(clamp(loc/.7,0,1)),out=clamp((c.dur-loc)/.3,0,1),lw=Math.max(2,H*(p.th??.8)/100);
  ctx.globalAlpha*=out;ctx.strokeStyle=p.color||'#ef4444';ctx.lineWidth=lw;ctx.lineCap='round';ctx.beginPath();const N=80;
  for(let i=0;i<=N*q*1.08;i++){const a=-Math.PI*.6+i/N*TAU,r=1+.04*Math.sin(i*.4)+i/N*.06;const X=cx+Math.cos(a)*w/2*r,Y=cy+Math.sin(a)*h/2*r;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)}ctx.stroke();
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
};
/* camembert / anneau */
WDRAW.pie=(c,p,loc)=>{
  const vals=String(p.values||'').split(/[;,]/).map(s=>parseFloat(s)).filter(v=>isFinite(v)&&v>0).slice(0,8),labs=String(p.labels||'').split(/[;,]/).map(s=>s.trim()),tot=vals.reduce((a,b)=>a+b,0)||1;
  const R=H*(p.size??20)/100,cx=W*(p.x??40)/100,cy=H*(p.y??52)/100,q=easeOut(clamp(loc/1.2,0,1)),out=clamp((c.dur-loc)/.35,0,1),pal=['#6366f1','#f59e0b','#22c55e','#ef4444','#06b6d4','#a855f7','#84cc16','#f472b6'],fs=R*.16;
  ctx.globalAlpha*=out;let a=-Math.PI/2;
  vals.forEach((v,i)=>{const s=v/tot*TAU*q;ctx.fillStyle=pal[i%8];ctx.beginPath();if(p.st==='donut'){ctx.arc(cx,cy,R,a,a+s);ctx.arc(cx,cy,R*.55,a+s,a,true)}else{ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,a,a+s)}ctx.closePath();ctx.fill();
    if(q>.95&&v/tot>.06){const m=a+s/2;ctx.fillStyle='#ffffff';ctx.font=wFont(800,fs);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(Math.round(v/tot*100)+'%',cx+Math.cos(m)*R*(p.st==='donut'?.78:.62),cy+Math.sin(m)*R*(p.st==='donut'?.78:.62))}a+=s});
  ctx.font=wFont(600,fs*1.1);ctx.textAlign='left';ctx.textBaseline='middle';vals.forEach((v,i)=>{const y=cy-vals.length*fs*.9+i*fs*1.8,x=cx+R*1.3;ctx.globalAlpha=out*clamp((loc-.3-i*.15)/.3,0,1);ctx.fillStyle=pal[i%8];ctx.beginPath();ctx.roundRect(x,y-fs*.45,fs*.9,fs*.9,fs*.2);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(labs[i]||'',x+fs*1.4,y)});
  boxes.set(c.id,{x:cx-R,y:cy-R,w:R*2.6+W*.15,h:R*2,rot:0});
};
Object.assign(WSTY,{slide:['sclean','sdark','snote','schalk','sgrid','sgrad'],bullets:['bdot','bnum','bcheck','barrow','bcard'],steps:['shor','svert'],defbox:['def','retain','example','warn','tip'],pie:['pie','donut']});
Object.assign(WDEF,{
  slide:()=>({dur:6,p:{st:'sdark',title:T('expo.d.slide'),tsize:7,color:'#6366f1',x:50,y:50,op:100}}),
  bullets:()=>({dur:6,p:{st:'bnum',text:T('expo.d.bullets'),size:5.6,delay:.7,color:'#6366f1',tcolor:'#ffffff',x:8,y:28,w:84,op:100}}),
  steps:()=>({dur:6,p:{st:'shor',text:T('expo.d.steps'),size:4.8,delay:.8,w:80,color:'#22c55e',tcolor:'#ffffff',x:50,y:45,op:100}}),
  timeline:()=>({dur:7,p:{text:T('expo.d.timeline'),size:4.4,delay:.9,w:84,color:'#f59e0b',tcolor:'#ffffff',x:50,y:55,op:100}}),
  defbox:()=>({dur:6,p:{st:'def',title:T('expo.d.term'),text:T('expo.d.def'),size:4.6,w:66,color:'',x:50,y:52,op:100}}),
  compare:()=>({dur:7,p:{ta:T('expo.d.ta'),tb:T('expo.d.tb'),a:T('expo.d.la'),b:T('expo.d.lb'),vs:'VS',size:4.4,delay:.5,w:84,color:'#3b82f6',color2:'#f97316',x:50,y:56,op:100}}),
  keyfig:()=>({dur:5,p:{value:'75 %',label:T('expo.d.figlabel'),size:16,color:'#facc15',tcolor:'#ffffff',x:50,y:45,op:100}}),
  quote:()=>({dur:7,p:{text:T('expo.d.quote'),author:T('expo.d.author'),size:5.8,w:72,color:'#a78bfa',tcolor:'#ffffff',x:50,y:48,op:100}}),
  sources:()=>({dur:6,p:{title:T('expo.d.sources'),text:T('expo.d.srclist'),size:3.2,w:62,color:'#94a3b8',x:6,y:58,op:100}}),
  chapter:()=>({dur:4,p:{num:T('expo.d.part'),title:T('expo.d.intro'),size:8,color:'#22d3ee',tcolor:'#ffffff',x:50,y:50,op:100}}),
  agenda:()=>({dur:6,p:{text:T('expo.d.plan'),cur:0,size:5.2,w:60,color:'#6366f1',x:10,y:28,op:100}}),
  callout:()=>({dur:4,p:{text:T('expo.d.look'),size:4.2,color:'#facc15',x:66,y:28,ax:45,ay:55,op:100}}),
  marker:()=>({dur:4,p:{color:'#facc15',w:30,h:7,x:50,y:50,op:100}}),
  circleann:()=>({dur:4,p:{color:'#ef4444',w:24,h:22,th:.8,x:50,y:50,op:100}}),
  pie:()=>({dur:6,p:{st:'pie',values:'45,30,25',labels:T('expo.d.pielabels'),size:20,x:38,y:52,op:100}})
});
const XS=[['size','num','common.size',[1,40,.1]]],XW=[['w','num','insp.widthPct',[10,100,.5]]],XC=[['color','col','common.color']],XT=[['tcolor','col','expo.tcolor']],XD=[['delay','num','expo.delay',[.1,3,.05]]];
Object.assign(WINSP,{
  slide:[['st','st'],['title','txt','expo.title'],['tsize','num','common.size',[2,16,.1]],...XC],
  bullets:[['st','st'],['text','area','expo.list'],...XD,...XS,...XW,...XC,...XT],
  steps:[['st','st'],['text','area','expo.list'],...XD,...XS,...XW,...XC,...XT],
  timeline:[['text','area','expo.tlist'],...XD,...XS,...XW,...XC,...XT],
  defbox:[['st','st'],['title','txt','expo.term'],['text','area','common.text'],...XS,...XW,['color','col','common.color']],
  compare:[['ta','txt','expo.ta'],['a','area','expo.la'],['tb','txt','expo.tb'],['b','area','expo.lb'],['vs','txt','expo.vs'],...XD,...XS,...XW,['color','col','expo.ca'],['color2','col','expo.cb']],
  keyfig:[['value','txt','expo.value'],['label','txt','expo.label'],...XS,...XC,...XT],
  quote:[['text','area','common.text'],['author','txt','expo.author'],...XS,...XW,...XC,...XT],
  sources:[['title','txt','expo.title'],['text','area','expo.list'],...XS,...XW,...XC],
  chapter:[['num','txt','expo.num'],['title','txt','expo.title'],...XS,...XC,...XT],
  agenda:[['text','area','expo.list'],['cur','num','expo.cur',[0,12]],...XS,...XW,...XC],
  callout:[['text','txt','common.text'],['ax','num','expo.ax',[0,100,.5]],['ay','num','expo.ay',[0,100,.5]],...XS,...XC],
  marker:[['w','num','insp.widthPct',[2,100,.5]],['h','num','insp.heightPct',[1,60,.5]],...XC],
  circleann:[['w','num','insp.widthPct',[2,100,.5]],['h','num','insp.heightPct',[2,100,.5]],['th','num','wdg.thick',[.2,3,.05]],...XC],
  pie:[['st','st'],['values','txt','wdg.values'],['labels','txt','wdg.labels'],...XS]
});
['slide','bullets','steps','timeline','defbox','compare','keyfig','quote','sources','chapter','agenda','callout','marker','circleann','pie'].forEach(g=>{GN[g]='expo.g.'+g});
/* ---------- pack « Exposé » (2) : quiz, vrai/faux, cartes mémoire, phrase à trous, graphiques, carte mentale, cycle, pyramide,
   tableau, pictogrammes, tampons, dessins à la main ---------- */
const XPAL=['#6366f1','#f59e0b','#22c55e','#ef4444','#06b6d4','#a855f7','#84cc16','#f472b6'];
const XRV=(p,loc)=>loc>=(p.reveal??3);
/* trait « dessiné à la main » : la ligne passe par les points, avec un léger tremblement, et se dessine avec le temps (q de 0 à 1) */
function XHAND(pts,q,seed=1){const n=pts.length-1;if(n<1)return;const m=Math.max(1,Math.floor(n*q));ctx.beginPath();for(let i=0;i<=m;i++){const j=(hash(i*7+seed)-.5)*ctx.lineWidth*.35;const[x,y]=pts[i];i?ctx.lineTo(x+j,y-j):ctx.moveTo(x,y)}ctx.stroke()}
/* quiz à choix multiples : la bonne réponse s'allume au moment choisi */
WDRAW.quiz=(c,p,loc)=>{
  const A=XL(p.text).slice(0,6),fs=H*(p.size??4)/100,w=W*(p.w??80)/100,cx=W*(p.x??50)/100,y0=H*(p.y??18)/100,k=XA(loc,c.dur),rv=XRV(p,loc),good=Math.round(p.good??1),grid=p.st!=='qlist'&&A.length===4;ctx.globalAlpha*=k;
  ctx.font=wFont(800,fs*1.15);const ql=wWrap(ctx,p.q,w-fs*2),qh=fs*1.2+ql.length*fs*1.45;XCARD(cx-w/2,y0,w,qh,fs*.5,'#ffffff');ctx.fillStyle='#0f172a';ctx.textAlign='center';ctx.textBaseline='middle';ql.forEach((l,i)=>ctx.fillText(l,cx,y0+fs*.6+fs*.72+i*fs*1.45));
  const gap=fs*.6,cols=grid?2:1,tw=(w-gap*(cols-1))/cols,th=fs*2.2,ty=y0+qh+gap*1.4;
  A.forEach((a,i)=>{const q=easeOut(clamp((loc-.3-i*.15)/.35,0,1));if(q<=0)return;const cx0=cx-w/2+(i%cols)*(tw+gap),yy=ty+Math.floor(i/cols)*(th+gap),ok=rv&&i+1===good;ctx.save();ctx.globalAlpha*=q*(rv&&!ok?.45:1);
    XCARD(cx0,yy,tw,th,fs*.45,ok?'#16a34a':XPAL[i%4]);ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(cx0+th/2,yy+th/2,fs*.7,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs*.9);ctx.textAlign='center';ctx.fillText(ok?'✓':'ABCDEF'[i],cx0+th/2,yy+th/2+fs*.04);
    ctx.textAlign='left';ctx.font=wFont(700,fs);ctx.fillText(wWrap(ctx,a,tw-th-fs)[0]||'',cx0+th+fs*.2,yy+th/2+fs*.04);ctx.restore()});
  if(!rv){const left=Math.ceil((p.reveal??3)-loc);if(left<=5&&left>0){ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs*1.2);ctx.textAlign='center';ctx.fillText(String(left),cx+w/2-fs,y0-fs*1.1)}}
  boxes.set(c.id,{x:cx-w/2,y:y0,w,h:qh+gap*1.4+Math.ceil(A.length/cols)*(th+gap),rot:0});
};
/* vrai ou faux */
WDRAW.truefalse=(c,p,loc)=>{
  const fs=H*(p.size??4.6)/100,w=W*(p.w??70)/100,cx=W*(p.x??50)/100,cy=H*(p.y??45)/100,k=XA(loc,c.dur),rv=XRV(p,loc),isT=p.st!=='tffaux';ctx.globalAlpha*=k;
  ctx.font=wFont(800,fs);const L=wWrap(ctx,p.text,w-fs*2),h=fs*1.4+L.length*fs*1.4;XCARD(cx-w/2,cy-h,w,h,fs*.5,'rgba(15,23,42,.85)');ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';L.forEach((l,i)=>ctx.fillText(l,cx,cy-h+fs*.7+fs*.7+i*fs*1.4));
  [[T('expo.true'),'#16a34a',-1,isT],[T('expo.false'),'#dc2626',1,!isT]].forEach(([lab,col,sd,ok])=>{const bw=w*.4,bh=fs*2.2,bx=cx+sd*(w*.05+bw/2)-bw/2,by=cy+fs*1.2,pop=rv&&ok?1+.08*Math.sin(clamp((loc-(p.reveal??3))/.3,0,1)*Math.PI):1;
    ctx.save();ctx.globalAlpha*=rv&&!ok?.3:1;ctx.translate(bx+bw/2,by+bh/2);ctx.scale(pop,pop);XCARD(-bw/2,-bh/2,bw,bh,bh/2,col);ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs*1.05);ctx.fillText((rv&&ok?'✓ ':'')+lab.toUpperCase(),0,fs*.05);ctx.restore()});
  boxes.set(c.id,{x:cx-w/2,y:cy-h,w,h:h+fs*3.6,rot:0});
};
/* carte mémoire qui se retourne : question devant, réponse derrière */
WDRAW.flashcard=(c,p,loc)=>{
  const fs=H*(p.size??5)/100,w=W*(p.w??46)/100,h=w*.6,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,k=XA(loc,c.dur),rt=p.reveal??3,f=clamp((loc-rt)/.6,0,1),ang=f*Math.PI,back=ang>Math.PI/2,col=p.st==='fcyellow'?'#facc15':'#3b82f6';ctx.globalAlpha*=k;
  ctx.translate(cx,cy);ctx.scale(Math.max(.02,Math.abs(Math.cos(ang))),1);ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs;XCARD(-w/2,-h/2,w,h,fs*.6,back?'#ffffff':col);ctx.shadowColor='transparent';
  ctx.fillStyle=back?'#0f172a':(p.st==='fcyellow'?'#1f2937':'#ffffff');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=wFont(600,fs*.5);ctx.globalAlpha*=.7;ctx.fillText((back?T('expo.answer'):T('expo.question')).toUpperCase(),0,-h/2+fs*.8);ctx.globalAlpha/=.7;
  ctx.font=wFont(800,fs);const L=wWrap(ctx,back?p.a:p.q,w-fs*1.6);L.forEach((l,i)=>ctx.fillText(l,0,(i-(L.length-1)/2)*fs*1.3));
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
};
/* phrase à trous : les mots entre [crochets] apparaissent au moment choisi */
WDRAW.fillblank=(c,p,loc)=>{
  const fs=H*(p.size??5)/100,w=W*(p.w??80)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,k=XA(loc,c.dur),rv=clamp((loc-(p.reveal??3))/.5,0,1),col=p.color||'#facc15';ctx.globalAlpha*=k;ctx.font=wFont(700,fs);
  const toks=String(p.text||'').split(/(\[[^\]]*\])/).flatMap(s=>s.startsWith('[')?[{w:s.slice(1,-1),b:1}]:s.split(/(\s+)/).filter(Boolean).map(x=>({w:x,b:0})));
  const lines=[[]];let lw=0;toks.forEach(t=>{const tw=ctx.measureText(t.b?t.w+'  ':t.w).width;if(lw+tw>w&&lines[lines.length-1].length&&t.w.trim()){lines.push([]);lw=0}if(!t.w.trim()&&!lines[lines.length-1].length)return;lines[lines.length-1].push([t,tw]);lw+=tw});
  const lh=fs*1.6,h=lines.length*lh;if(p.st==='fbbox')XCARD(cx-w/2-fs,cy-h/2-fs*.8,w+fs*2,h+fs*1.6,fs*.5,'rgba(15,23,42,.8)');
  ctx.textBaseline='middle';ctx.textAlign='left';lines.forEach((ln,i)=>{const tot=ln.reduce((s,[,tw])=>s+tw,0);let x=cx-tot/2;const y=cy-h/2+lh*(i+.5);
    ln.forEach(([t,tw])=>{if(t.b){ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,fs*.08);ctx.beginPath();ctx.moveTo(x,y+fs*.6);ctx.lineTo(x+tw-fs*.3,y+fs*.6);ctx.stroke();if(rv>0){ctx.save();ctx.globalAlpha*=rv;ctx.fillStyle=col;ctx.fillText(t.w,x+fs*.15,y+(1-rv)*fs*.5);ctx.restore()}}else{ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=fs*.2;ctx.fillText(t.w,x,y);ctx.shadowColor='transparent'}x+=tw})});
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
};
/* courbe */
WDRAW.linechart=(c,p,loc)=>{
  const vals=String(p.values||'').split(/[;,]/).map(s=>parseFloat(s)).filter(isFinite).slice(0,16),labs=String(p.labels||'').split(/[;,]/).map(s=>s.trim()),n=vals.length;if(n<2)return;
  const w=W*(p.w??60)/100,h=H*(p.h??42)/100,cx=W*(p.x??50)/100,cy=H*(p.y??52)/100,x0=cx-w/2,y0=cy-h/2,col=p.color||'#22d3ee',fs=Math.max(8,h*.07),mx=Math.max(...vals),mn=Math.min(0,...vals),q=clamp(loc/1.6,0,1),out=clamp((c.dur-loc)/.35,0,1);
  ctx.globalAlpha*=out;XCARD(x0-fs,y0-fs,w+fs*2,h+fs*3,fs*.5,'rgba(15,23,42,.72)');ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=y0+h*i/4;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+w,y);ctx.stroke()}
  const P=vals.map((v,i)=>[x0+w*i/(n-1),y0+h-(v-mn)/((mx-mn)||1)*h]),m=q*(n-1),last=Math.floor(m),fr=m-last,pts=P.slice(0,last+1);if(last<n-1)pts.push([P[last][0]+(P[last+1][0]-P[last][0])*fr,P[last][1]+(P[last+1][1]-P[last][1])*fr]);
  if(p.st==='lcarea'){const g=ctx.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,hexA(col,.55));g.addColorStop(1,hexA(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(pts[0][0],y0+h);pts.forEach(([x,y])=>ctx.lineTo(x,y));ctx.lineTo(pts[pts.length-1][0],y0+h);ctx.closePath();ctx.fill()}
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,fs*.3);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  ctx.font=wFont(700,fs);ctx.textAlign='center';P.forEach(([x,y],i)=>{if(i>m+.01)return;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,fs*.35,0,TAU);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,fs*.2,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.textBaseline='bottom';ctx.fillText(fmtN(vals[i]),x,y-fs*.5);ctx.textBaseline='top';ctx.fillStyle='#cbd5e1';ctx.fillText(labs[i]||'',x,y0+h+fs*.5)});
  boxes.set(c.id,{x:x0-fs,y:y0-fs,w:w+fs*2,h:h+fs*3,rot:0});
};
/* jauge */
WDRAW.gauge=(c,p,loc)=>{
  const R=H*(p.size??16)/100,cx=W*(p.x??50)/100,cy=H*(p.y??55)/100,v=clamp(+p.value||0,0,100),q=easeOut(clamp(loc/1.4,0,1)),cv=v*q,col=p.color||'#22c55e',k=XA(loc,c.dur),th=R*.22,ring=p.st==='gring';ctx.globalAlpha*=k;
  const a0=ring?-Math.PI/2:Math.PI,span=ring?TAU:Math.PI;ctx.lineCap='round';ctx.lineWidth=th;ctx.strokeStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(cx,cy,R,a0,a0+span);ctx.stroke();
  const g=ctx.createLinearGradient(cx-R,0,cx+R,0);g.addColorStop(0,'#ef4444');g.addColorStop(.5,'#facc15');g.addColorStop(1,col);ctx.strokeStyle=ring?col:g;ctx.beginPath();ctx.arc(cx,cy,R,a0,a0+span*cv/100);ctx.stroke();
  if(!ring){const a=a0+span*cv/100;ctx.strokeStyle='#ffffff';ctx.lineWidth=th*.3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*R*.8,cy+Math.sin(a)*R*.8);ctx.stroke();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(cx,cy,th*.45,0,TAU);ctx.fill()}
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=wFont(900,R*.42);ctx.fillText(Math.round(cv)+'%',cx,ring?cy:cy+R*.35);ctx.font=wFont(600,R*.16);ctx.fillStyle='#e2e8f0';ctx.fillText(p.label||'',cx,ring?cy+R*1.5:cy+R*.7);
  boxes.set(c.id,{x:cx-R-th,y:cy-R-th,w:2*(R+th),h:ring?2*(R+th)+R*.6:R*1.9,rot:0});
};
/* barres de niveau (« Nom : 70 ») */
WDRAW.skillbars=(c,p,loc)=>{
  const L=XL(p.text).map(s=>{const m=s.match(/^(.*?)[\s:]+(-?\d+(?:[.,]\d+)?)\s*%?$/);return m?[m[1],parseFloat(m[2].replace(',','.'))]:[s,0]}),fs=H*(p.size??3.6)/100,w=W*(p.w??60)/100,x=W*(p.x??50)/100-w/2,y0=H*(p.y??35)/100,col=p.color||'#a855f7',out=clamp((c.dur-loc)/.35,0,1),round=p.st!=='sbflat';
  ctx.globalAlpha*=out;L.forEach(([lab,v],i)=>{const q=easeOut(clamp((loc-i*.25)/1,0,1));if(q<=0)return;const y=y0+i*fs*3,bh=fs*.9,f=clamp(v,0,100)/100*q;
    ctx.fillStyle='#ffffff';ctx.font=wFont(700,fs);ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText(lab,x,y);ctx.textAlign='right';ctx.fillText(Math.round(v*q)+'%',x+w,y);
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.roundRect(x,y+fs*.3,w,bh,round?bh/2:0);ctx.fill();ctx.fillStyle=XPAL[(i+(col==='#a855f7'?5:0))%8];if(p.color)ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y+fs*.3,Math.max(1,w*f),bh,round?bh/2:0);ctx.fill()});
  boxes.set(c.id,{x,y:y0-fs,w,h:L.length*fs*3,rot:0});
};
/* diagramme de Venn (2 ou 3 cercles) */
WDRAW.venn=(c,p,loc)=>{
  const R=H*(p.size??20)/100,cx=W*(p.x??50)/100,cy=H*(p.y??52)/100,three=p.st==='v3',k=XA(loc,c.dur),fs=R*.17,cols=['#3b82f6','#f59e0b','#22c55e'];ctx.globalAlpha*=k;
  const C=three?[[cx-R*.5,cy-R*.3],[cx+R*.5,cy-R*.3],[cx,cy+R*.5]]:[[cx-R*.55,cy],[cx+R*.55,cy]],labs=[p.a,p.b,p.c];
  C.forEach(([x,y],i)=>{const q=backOut(clamp((loc-i*.2)/.5,0,1));if(q<=0)return;ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=hexA(cols[i],.55);ctx.beginPath();ctx.arc(x,y,R*q,0,TAU);ctx.fill();ctx.restore();ctx.strokeStyle=cols[i];ctx.lineWidth=Math.max(2,R*.02);ctx.beginPath();ctx.arc(x,y,R*q,0,TAU);ctx.stroke()});
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=wFont(800,fs);ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.3;
  C.forEach(([x,y],i)=>{const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;ctx.globalAlpha=k*clamp((loc-.6-i*.15)/.3,0,1);wWrap(ctx,labs[i]||'',R*.8).forEach((l,j)=>ctx.fillText(l,x+dx/d*R*.45,y+dy/d*R*.45+j*fs*1.2))});
  ctx.globalAlpha=k*clamp((loc-1.2)/.3,0,1);ctx.font=wFont(900,fs*.9);wWrap(ctx,p.ab||'',R*.6).forEach((l,j)=>ctx.fillText(l,cx,cy+(three?R*.05:0)+j*fs*1.1));
  boxes.set(c.id,{x:cx-R*1.6,y:cy-R*1.3,w:R*3.2,h:R*2.6,rot:0});
};
/* carte mentale : idée au centre, branches autour */
WDRAW.mindmap=(c,p,loc)=>{
  const L=XL(p.text).slice(0,8),n=Math.max(1,L.length),fs=H*(p.size??3.6)/100,cx=W*(p.x??50)/100,cy=H*(p.y??52)/100,rx=W*(p.w??34)/100,ry=H*.3,k=XA(loc,c.dur),cards=p.st==='mmcards';ctx.globalAlpha*=k;
  L.forEach((it,i)=>{const a=-Math.PI/2+i*TAU/n,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry,q=easeOut(clamp((loc-.3-i*.18)/.5,0,1));if(q<=0)return;const col=XPAL[i%8];
    ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,fs*.18);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(cx+(x-cx)*.5,cy,cx+(x-cx)*q,cy+(y-cy)*q);ctx.stroke();
    if(q>.95){ctx.font=wFont(700,fs);const tw=Math.min(W*.22,ctx.measureText(it).width);const bw=tw+fs*1.4,bh=fs*1.9;XCARD(x-bw/2,y-bh/2,bw,bh,cards?fs*.4:bh/2,cards?'#ffffff':col);ctx.fillStyle=cards?'#0f172a':'#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(wWrap(ctx,it,W*.22)[0]||'',x,y+fs*.05);if(cards){ctx.fillStyle=col;ctx.fillRect(x-bw/2,y-bh/2,fs*.25,bh)}}});
  const q=backOut(clamp(loc/.4,0,1));ctx.save();ctx.translate(cx,cy);ctx.scale(q,q);ctx.font=wFont(900,fs*1.25);const tw=ctx.measureText(p.title||'').width,bw=tw+fs*2,bh=fs*2.6;ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs;XCARD(-bw/2,-bh/2,bw,bh,bh/2,'#0f172a');ctx.shadowColor='transparent';ctx.strokeStyle='#ffffff';ctx.lineWidth=fs*.12;ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.title||'',0,fs*.05);ctx.restore();
  boxes.set(c.id,{x:cx-rx-W*.1,y:cy-ry-fs*2,w:2*rx+W*.2,h:2*ry+fs*4,rot:0});
};
/* cycle : étapes en rond reliées par des flèches */
WDRAW.cycle=(c,p,loc)=>{
  const L=XL(p.text).slice(0,8),n=Math.max(2,L.length),fs=H*(p.size??3.4)/100,cx=W*(p.x??50)/100,cy=H*(p.y??52)/100,R=H*(p.w??26)/100,k=XA(loc,c.dur),col=p.color||'#06b6d4',act=Math.floor(loc/1.2)%n;ctx.globalAlpha*=k;
  const q=easeOut(clamp(loc/1.2,0,1));ctx.strokeStyle=hexA(col,.6);ctx.lineWidth=Math.max(2,fs*.2);ctx.lineCap='round';
  for(let i=0;i<n;i++){const a0=-Math.PI/2+i*TAU/n+.32,a1=-Math.PI/2+(i+1)*TAU/n-.32,am=a0+(a1-a0)*q;if(q<=0)break;ctx.beginPath();ctx.arc(cx,cy,R,a0,am);ctx.stroke();
    if(q>.98){const hx=cx+Math.cos(a1)*R,hy=cy+Math.sin(a1)*R,d=a1+Math.PI/2,s=fs*.6;ctx.fillStyle=hexA(col,.8);ctx.beginPath();ctx.moveTo(hx+Math.cos(d)*s,hy+Math.sin(d)*s);ctx.lineTo(hx+Math.cos(d+2.5)*s,hy+Math.sin(d+2.5)*s);ctx.lineTo(hx+Math.cos(d-2.5)*s,hy+Math.sin(d-2.5)*s);ctx.closePath();ctx.fill()}}
  L.forEach((it,i)=>{const a=-Math.PI/2+i*TAU/n,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R,on=p.st!=='cydots'&&i===act&&loc>1.2;ctx.font=wFont(800,fs);const tw=Math.min(W*.2,ctx.measureText(it).width),bw=tw+fs*1.4,bh=fs*1.9,s=on?1.08:1;
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);if(p.st==='cydots'){ctx.fillStyle=XPAL[i%8];ctx.beginPath();ctx.arc(0,0,fs*.9,0,TAU);ctx.fill();ctx.fillStyle='#ffffff';ctx.font=wFont(900,fs*.8);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),0,fs*.04);ctx.font=wFont(700,fs);ctx.textBaseline=Math.sin(a)>.3?'top':Math.sin(a)<-.3?'bottom':'middle';ctx.textAlign=Math.cos(a)>.3?'left':Math.cos(a)<-.3?'right':'center';ctx.fillText(it,Math.cos(a)*fs*1.4,Math.sin(a)*fs*1.4)}
    else{XCARD(-bw/2,-bh/2,bw,bh,bh/2,on?col:'#0f172a');ctx.strokeStyle=col;ctx.lineWidth=fs*.1;ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);ctx.stroke();ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(wWrap(ctx,it,W*.2)[0]||'',0,fs*.05)}ctx.restore()});
  boxes.set(c.id,{x:cx-R-W*.1,y:cy-R-fs*2,w:2*R+W*.2,h:2*R+fs*4,rot:0});
};
/* pyramide : du sommet à la base, apparaît par le bas */
WDRAW.pyramid=(c,p,loc)=>{
  const L=XL(p.text).slice(0,7),n=Math.max(1,L.length),fs=H*(p.size??3.4)/100,cx=W*(p.x??50)/100,h=H*(p.h??62)/100,y0=H*(p.y??55)/100-h/2,w=W*(p.w??50)/100,k=XA(loc,c.dur),lh=h/n,tri=p.st!=='pystack';ctx.globalAlpha*=k;
  for(let i=n-1;i>=0;i--){const q=easeOut(clamp((loc-(n-1-i)*.3)/.45,0,1));if(q<=0)continue;const yt=y0+i*lh,wt=tri?w*i/n:w*(.35+.65*i/Math.max(1,n-1)),wb=tri?w*(i+1)/n:wt,g=lh*.08,col=XPAL[i%8];
    ctx.save();ctx.globalAlpha*=q;ctx.translate(0,(1-q)*lh*.4);ctx.fillStyle=col;ctx.beginPath();if(tri){ctx.moveTo(cx-wt/2,yt+g/2);ctx.lineTo(cx+wt/2,yt+g/2);ctx.lineTo(cx+wb/2,yt+lh-g/2);ctx.lineTo(cx-wb/2,yt+lh-g/2);ctx.closePath()}else ctx.roundRect(cx-wt/2,yt+g/2,wt,lh-g,lh*.2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.font=wFont(800,Math.min(fs,lh*.38));ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=fs*.2;ctx.fillText(L[i],cx,yt+lh*(tri&&i===0?.65:.5));ctx.restore()}
  boxes.set(c.id,{x:cx-w/2,y:y0,w,h,rot:0});
};
/* tableau : une ligne par rangée, cellules séparées par « ; » (la première rangée = en-têtes) */
WDRAW.table=(c,p,loc)=>{
  const R=XL(p.text).map(r=>r.split(/[;|]/).map(s=>s.trim())),nr=R.length,nc=Math.max(1,...R.map(r=>r.length)),fs=H*(p.size??3.4)/100,w=W*(p.w??70)/100,rh=fs*2.2,h=rh*nr,x0=W*(p.x??50)/100-w/2,y0=H*(p.y??52)/100-h/2,cw=w/nc,dark=p.st!=='tblight',col=p.color||'#6366f1',out=clamp((c.dur-loc)/.35,0,1);
  ctx.globalAlpha*=out;R.forEach((r,i)=>{const q=easeOut(clamp((loc-i*.3)/.4,0,1));if(q<=0)return;ctx.save();ctx.globalAlpha*=q;const y=y0+i*rh;
    ctx.fillStyle=i===0?col:dark?(i%2?'rgba(30,41,59,.92)':'rgba(15,23,42,.92)'):(i%2?'#f1f5f9':'#ffffff');ctx.beginPath();ctx.roundRect(x0,y,w,rh,i===0?[fs*.4,fs*.4,0,0]:i===nr-1?[0,0,fs*.4,fs*.4]:0);ctx.fill();
    ctx.fillStyle=i===0?'#ffffff':dark?'#e2e8f0':'#0f172a';ctx.font=wFont(i===0?800:500,fs*.9);ctx.textAlign='center';ctx.textBaseline='middle';for(let j=0;j<nc;j++)ctx.fillText(wWrap(ctx,r[j]||'',cw-fs*.6)[0]||'',x0+cw*(j+.5),y+rh/2);ctx.restore()});
  boxes.set(c.id,{x:x0,y:y0,w,h,rot:0});
};
/* pictogramme : « 7 sur 10 » avec des petits bonshommes ou des cœurs */
WDRAW.iconstat=(c,p,loc)=>{
  const tot=clamp(Math.round(+p.total||10),1,50),v=clamp(+p.value||0,0,tot),fs=H*(p.size??7)/100,cols=Math.min(10,tot),rows=Math.ceil(tot/cols),cx=W*(p.x??50)/100,cy=H*(p.y??46)/100,gw=cols*fs*1.25,x0=cx-gw/2,y0=cy-rows*fs*1.5/2,col=p.color||'#22c55e',k=XA(loc,c.dur),id=p.st==='ishearts'?'i_heart':'i_user',P=iconPath(id);ctx.globalAlpha*=k;
  for(let i=0;i<tot;i++){const x=x0+(i%cols)*fs*1.25,y=y0+Math.floor(i/cols)*fs*1.5,on=i<v&&loc>.3+i*.08;ctx.save();ctx.translate(x,y);ctx.scale(fs/24,fs/24);ctx.fillStyle=on?col:'rgba(255,255,255,.22)';P.forEach(q=>ctx.fill(q,'evenodd'));ctx.restore()}
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='top';ctx.font=wFont(900,fs*.8);ctx.fillText(`${fmtN(v)} / ${tot}`,cx,y0+rows*fs*1.5+fs*.2);ctx.font=wFont(600,fs*.42);ctx.fillStyle='#e2e8f0';ctx.fillText(p.label||'',cx,y0+rows*fs*1.5+fs*1.15);
  boxes.set(c.id,{x:x0,y:y0,w:gw,h:rows*fs*1.5+fs*1.8,rot:0});
};
/* tampon qui claque */
WDRAW.stamp=(c,p,loc)=>{
  const fs=H*(p.size??8)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,col=p.color||(p.st==='stgreen'?'#16a34a':'#dc2626'),q=clamp(loc/.25,0,1),s=2.2-1.2*easeOut(q),out=clamp((c.dur-loc)/.3,0,1);if(loc<0)return;
  ctx.globalAlpha*=Math.min(1,q*1.5)*out*.88;ctx.translate(cx,cy);ctx.rotate((p.rot??-12)*Math.PI/180);ctx.scale(s,s);ctx.font=wFont(900,fs,XF('Black Ops One'));const t=String(p.text||'').toUpperCase(),tw=ctx.measureText(t).width;
  ctx.strokeStyle=col;ctx.lineWidth=fs*.1;ctx.strokeRect(-tw/2-fs*.5,-fs*.8,tw+fs,fs*1.6);ctx.lineWidth=fs*.04;ctx.strokeRect(-tw/2-fs*.32,-fs*.62,tw+fs*.64,fs*1.24);ctx.fillStyle=col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,0,fs*.06);
  boxes.set(c.id,{x:cx-tw/2-fs*.6,y:cy-fs,w:tw+fs*1.2,h:fs*2,rot:p.rot??-12});
};
/* dessins à la main : flèche courbe, soulignement, cadre, croix */
WDRAW.handdraw=(c,p,loc)=>{
  const st=p.st||'hdarrow',w=W*(p.w??26)/100,h=H*(p.h??18)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,q=easeOut(clamp(loc/.7,0,1)),out=clamp((c.dur-loc)/.3,0,1),lw=Math.max(2,H*(p.th??.9)/100);
  ctx.globalAlpha*=out;ctx.strokeStyle=p.color||'#facc15';ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';const N=40,pts=[];
  if(st==='hdarrow'){const x0=cx-w/2,y0=cy+h/2,x1=cx+w/2,y1=cy-h/2;for(let i=0;i<=N;i++){const t=i/N;pts.push([x0+(x1-x0)*t,y0+(y1-y0)*t-Math.sin(t*Math.PI)*h*.4])}XHAND(pts,q,3);
    if(q>.97){const a=Math.atan2(pts[N][1]-pts[N-3][1],pts[N][0]-pts[N-3][0]),s=lw*5;ctx.beginPath();ctx.moveTo(x1+Math.cos(a+2.6)*s,y1+Math.sin(a+2.6)*s);ctx.lineTo(x1,y1);ctx.lineTo(x1+Math.cos(a-2.6)*s,y1+Math.sin(a-2.6)*s);ctx.stroke()}}
  else if(st==='hdunder'){for(let i=0;i<=N;i++){const t=i/N;pts.push([cx-w/2+w*t,cy+Math.sin(t*12)*lw*.6+t*lw])}XHAND(pts,q,5);if(q>.9){const p2=pts.map(([x,y])=>[x,y+lw*2.2]);XHAND(p2.slice(4,N-6),clamp((loc-.7)/.4,0,1),9)}}
  else if(st==='hdbox'){const c4=[[cx-w/2,cy-h/2],[cx+w/2,cy-h/2+lw],[cx+w/2+lw,cy+h/2],[cx-w/2-lw,cy+h/2-lw],[cx-w/2+lw*.5,cy-h/2-lw*1.5]];for(let s=0;s<4;s++)for(let i=0;i<10;i++){const t=i/10;pts.push([c4[s][0]+(c4[s+1][0]-c4[s][0])*t,c4[s][1]+(c4[s+1][1]-c4[s][1])*t])}pts.push(c4[4]);XHAND(pts,q,7)}
  else{const a=[[cx-w/2,cy-h/2],[cx+w/2,cy+h/2]],b=[[cx+w/2,cy-h/2],[cx-w/2,cy+h/2]];const L=(A,B)=>{const r=[];for(let i=0;i<=20;i++)r.push([A[0]+(B[0]-A[0])*i/20,A[1]+(B[1]-A[1])*i/20]);return r};XHAND(L(...a),clamp(q*2,0,1),11);XHAND(L(...b),clamp(q*2-1,0,1),13)}
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
};
Object.assign(WSTY,{quiz:['q4','qlist'],truefalse:['tfvrai','tffaux'],flashcard:['fcblue','fcyellow'],fillblank:['fbline','fbbox'],linechart:['lcline','lcarea'],gauge:['gsemi','gring'],skillbars:['sbround','sbflat'],venn:['v2','v3'],mindmap:['mmradial','mmcards'],cycle:['cyarrows','cydots'],pyramid:['pytri','pystack'],table:['tbdark','tblight'],iconstat:['ispeople','ishearts'],stamp:['stred','stgreen'],handdraw:['hdarrow','hdunder','hdbox','hdcross']});
Object.assign(WDEF,{
  quiz:()=>({dur:8,p:{st:'q4',q:T('expo.d.quiz'),text:T('expo.d.quizans'),good:2,reveal:5,size:4,w:80,x:50,y:16,op:100}}),
  truefalse:()=>({dur:7,p:{st:'tfvrai',text:T('expo.d.tf'),reveal:4,size:4.6,w:70,x:50,y:45,op:100}}),
  flashcard:()=>({dur:7,p:{st:'fcblue',q:T('expo.d.fq'),a:T('expo.d.fa'),reveal:3,size:5,w:46,x:50,y:50,op:100}}),
  fillblank:()=>({dur:7,p:{st:'fbbox',text:T('expo.d.fill'),reveal:3,size:5,w:80,color:'#facc15',x:50,y:50,op:100}}),
  linechart:()=>({dur:6,p:{st:'lcarea',values:'12,18,15,26,31,40',labels:'2019,2020,2021,2022,2023,2024',color:'#22d3ee',w:60,h:42,x:50,y:50,op:100}}),
  gauge:()=>({dur:5,p:{st:'gsemi',value:72,label:T('expo.d.gauge'),size:16,color:'#22c55e',x:50,y:55,op:100}}),
  skillbars:()=>({dur:6,p:{st:'sbround',text:T('expo.d.skills'),size:3.6,w:60,color:'',x:50,y:32,op:100}}),
  venn:()=>({dur:6,p:{st:'v2',a:T('expo.d.va'),b:T('expo.d.vb'),c:T('expo.d.vc'),ab:T('expo.d.vab'),size:22,x:50,y:52,op:100}}),
  mindmap:()=>({dur:7,p:{st:'mmradial',title:T('expo.d.mmtitle'),text:T('expo.d.mm'),size:3.6,w:32,x:50,y:52,op:100}}),
  cycle:()=>({dur:8,p:{st:'cyarrows',text:T('expo.d.cycle'),size:3.6,w:28,color:'#06b6d4',x:50,y:52,op:100}}),
  pyramid:()=>({dur:6,p:{st:'pytri',text:T('expo.d.pyr'),size:3.6,w:56,h:62,x:50,y:55,op:100}}),
  table:()=>({dur:6,p:{st:'tbdark',text:T('expo.d.table'),size:3.6,w:70,color:'#6366f1',x:50,y:52,op:100}}),
  iconstat:()=>({dur:6,p:{st:'ispeople',value:7,total:10,label:T('expo.d.istat'),size:7,color:'#22c55e',x:50,y:42,op:100}}),
  stamp:()=>({dur:3,p:{st:'stred',text:T('expo.d.stamp'),size:8,rot:-12,color:'',x:50,y:50,op:100}}),
  handdraw:()=>({dur:4,p:{st:'hdarrow',color:'#facc15',w:26,h:18,th:.9,x:50,y:50,op:100}})
});
Object.assign(WINSP,{
  quiz:[['st','st'],['q','txt','expo.question'],['text','area','expo.answers'],['good','num','expo.good',[1,6]],['reveal','num','expo.reveal',[.5,30,.1]],...XS,...XW],
  truefalse:[['st','st'],['text','area','expo.statement'],['reveal','num','expo.reveal',[.5,30,.1]],...XS,...XW],
  flashcard:[['st','st'],['q','area','expo.front'],['a','area','expo.back'],['reveal','num','expo.reveal',[.5,30,.1]],...XS,...XW],
  fillblank:[['st','st'],['text','area','expo.filltxt'],['reveal','num','expo.reveal',[.5,30,.1]],...XS,...XW,...XC],
  linechart:[['st','st'],['values','txt','wdg.values'],['labels','txt','wdg.labels'],['w','num','insp.widthPct',[15,100,.5]],['h','num','insp.heightPct',[15,100,.5]],...XC],
  gauge:[['st','st'],['value','num','expo.pct',[0,100]],['label','txt','expo.label'],...XS,...XC],
  skillbars:[['st','st'],['text','area','expo.bars'],...XS,...XW,...XC],
  venn:[['st','st'],['a','txt','expo.va'],['b','txt','expo.vb'],['c','txt','expo.vc',null,['v3']],['ab','txt','expo.vab'],...XS],
  mindmap:[['st','st'],['title','txt','expo.center'],['text','area','expo.list'],...XS,...XW],
  cycle:[['st','st'],['text','area','expo.list'],...XS,['w','num','common.size',[8,45,.5]],...XC],
  pyramid:[['st','st'],['text','area','expo.pyrlist'],...XS,['w','num','insp.widthPct',[10,100,.5]],['h','num','insp.heightPct',[10,100,.5]]],
  table:[['st','st'],['text','area','expo.tablerows'],...XS,...XW,...XC],
  iconstat:[['st','st'],['value','num','expo.value',[0,50,.5]],['total','num','expo.total',[1,50]],['label','txt','expo.label'],...XS,...XC],
  stamp:[['st','st'],['text','txt','common.text'],['rot','num','insp.rotDeg',[-45,45]],...XS,...XC],
  handdraw:[['st','st'],['w','num','insp.widthPct',[2,100,.5]],['h','num','insp.heightPct',[2,100,.5]],['th','num','wdg.thick',[.2,3,.05]],...XC]
});
['quiz','truefalse','flashcard','fillblank','linechart','gauge','skillbars','venn','mindmap','cycle','pyramid','table','iconstat','stamp','handdraw'].forEach(g=>{GN[g]='expo.g.'+g});

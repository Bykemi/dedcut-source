/* ---------- fonds animés et emojis animés (v4.36) ---------- */
/* fond animé plein écran (à mettre sous un texte ou une diapo) */
WDRAW.animbg=(c,p,loc)=>{
  const st=p.st||'bgflow',c1=p.color||'#6366f1',c2=p.color2||'#ec4899',t=loc*(p.speed??1),k=clamp(loc/.4,0,1)*clamp((c.dur-loc)/.4,0,1);ctx.globalAlpha*=k;
  const fill=(a,b,ang)=>{const g=ctx.createLinearGradient(W/2-Math.cos(ang)*W,H/2-Math.sin(ang)*H,W/2+Math.cos(ang)*W,H/2+Math.sin(ang)*H);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)};
  if(st==='bgflow'){fill(c1,c2,t*.25);for(let i=0;i<3;i++){const x=W*(.5+.4*Math.sin(t*.3+i*2)),y=H*(.5+.4*Math.cos(t*.25+i*1.7)),g=ctx.createRadialGradient(x,y,0,x,y,H*.8);g.addColorStop(0,hexA(i%2?c1:c2,.55));g.addColorStop(1,hexA(c2,0));ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}}
  else if(st==='bgparticles'){ctx.fillStyle='#0b1020';ctx.fillRect(0,0,W,H);const P=[];for(let i=0;i<60;i++){const x=(hash(i)*W+Math.sin(t*.3+i)*W*.05+t*W*.01*(hash(i+5)-.5))%W,y=(hash(i+9)*H-t*H*.03*(.3+hash(i+3)))%H;P.push([(x+W)%W,(y+H)%H])}
    ctx.strokeStyle=hexA(c1,.25);ctx.lineWidth=Math.max(1,H/900);for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);if(d<H*.18){ctx.globalAlpha=k*(1-d/(H*.18))*.8;ctx.beginPath();ctx.moveTo(...P[i]);ctx.lineTo(...P[j]);ctx.stroke()}}
    ctx.globalAlpha=k;ctx.fillStyle=c1;P.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,H*.004*(1+hash(i+7)),0,TAU);ctx.fill()})}
  else if(st==='bgbokeh'){fill('#120a24','#0a1a2a',.8);for(let i=0;i<26;i++){const r=H*(.03+.08*hash(i+1)),x=(hash(i)*W*1.2+t*W*.02*(hash(i+2)+.2))%(W*1.2)-W*.1,y=H*hash(i+4)+Math.sin(t*.5+i)*H*.03;ctx.fillStyle=hexA(i%2?c1:c2,.12+.18*hash(i+6));ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}}
  else if(st==='bgwaves'){fill(c1,'#0f172a',1.57);for(let j=0;j<5;j++){ctx.fillStyle=hexA(c2,.12+.06*j);ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=W/60)ctx.lineTo(x,H*(.55+j*.09)+Math.sin(x/W*TAU*(1+j*.3)+t*(.6+j*.15))*H*.04);ctx.lineTo(W,H);ctx.closePath();ctx.fill()}}
  else if(st==='bgretro'){fill('#1a0533','#3b0764',1.57);const hz=H*.58,sg=ctx.createLinearGradient(0,H*.15,0,hz);sg.addColorStop(0,'#fde047');sg.addColorStop(1,'#ec4899');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(W/2,hz,H*.28,Math.PI,0);ctx.fill();
    ctx.fillStyle='#1a0533';for(let i=0;i<6;i++){const y=hz-H*.03-i*H*.035;ctx.fillRect(W/2-H*.3,y,H*.6,H*.006*(6-i)*.6)}ctx.fillStyle='#12002a';ctx.fillRect(0,hz,W,H-hz);ctx.strokeStyle='#f472b6';ctx.lineWidth=Math.max(1,H/400);
    for(let i=-14;i<=14;i++){ctx.beginPath();ctx.moveTo(W/2+i*W*.02,hz);ctx.lineTo(W/2+i*W*.16,H);ctx.stroke()}for(let i=0;i<12;i++){const f=((i+t*.8)%12)/12,y=hz+(H-hz)*f*f;ctx.globalAlpha=k*f;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
  else if(st==='bgstars'){fill('#020617','#1e1b4b',1.2);for(let i=0;i<180;i++){const z=hash(i+3),x=((hash(i)*W-t*W*.01*z*3)%W+W)%W,y=hash(i+1)*H;ctx.globalAlpha=k*(.3+.7*Math.abs(Math.sin(t*(1+z)+i)));ctx.fillStyle='#ffffff';ctx.fillRect(x,y,H*.002*(1+z*2),H*.002*(1+z*2))}}
  else if(st==='bgblobs'){ctx.fillStyle='#0f172a';ctx.fillRect(0,0,W,H);ctx.filter=`blur(${H*.05}px)`;for(let i=0;i<5;i++){ctx.fillStyle=hexA(i%2?c1:c2,.85);ctx.beginPath();ctx.arc(W*(.5+.35*Math.sin(t*.4+i*1.3)),H*(.5+.35*Math.cos(t*.33+i*2.1)),H*(.18+.06*Math.sin(t+i)),0,TAU);ctx.fill()}ctx.filter='none'}
  else if(st==='bgstripes'){ctx.fillStyle=c1;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-.5);const s=H*.12,o=(t*s*.8)%(2*s);ctx.fillStyle=c2;for(let x=-W*1.2-o;x<W*1.2;x+=2*s)ctx.fillRect(x,-W,s,W*2);ctx.restore()}
  else if(st==='bgaurora'){fill('#020617','#0b1a2e',1.57);for(let j=0;j<3;j++){ctx.fillStyle=hexA(j===1?c2:c1,.22);ctx.beginPath();ctx.moveTo(0,0);for(let x=0;x<=W;x+=W/50)ctx.lineTo(x,H*(.3+j*.08)+Math.sin(x/W*5+t*.5+j)*H*.08+Math.sin(x/W*13-t*.7)*H*.02);ctx.lineTo(W,0);ctx.closePath();ctx.fill()}}
  else if(st==='bgmatrix'){ctx.fillStyle='#020a04';ctx.fillRect(0,0,W,H);const fs=H/30,cols=Math.ceil(W/fs);ctx.font=`${fs}px Consolas,monospace`;ctx.textAlign='center';
    for(let i=0;i<cols;i++){const sp=.5+hash(i)*1.2,head=((t*sp*.4+hash(i+3))%1.4)*H/fs;for(let j=0;j<22;j++){const y=Math.floor(head)-j;if(y<0)continue;ctx.fillStyle=j===0?'#d1fae5':hexA('#22c55e',1-j/22);ctx.fillText(String.fromCharCode(0x30A0+Math.floor(hash(i*31+y+Math.floor(t*6))*96)),i*fs+fs/2,y*fs)}}}
  else if(st==='bgrays'){fill(c1,c2,.6);ctx.save();ctx.translate(W/2,H/2);ctx.rotate(t*.15);ctx.fillStyle='rgba(255,255,255,.12)';const n=18,R=Math.hypot(W,H);for(let i=0;i<n;i++){const a0=i*TAU/n;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a0,a0+TAU/n/2);ctx.closePath();ctx.fill()}ctx.restore()}
  else if(st==='bgrings'){fill('#0b1020','#111827',1);for(let i=0;i<10;i++){const r=((t*.25+i/10)%1)*Math.hypot(W,H)/2;ctx.strokeStyle=hexA(i%2?c1:c2,1-r/(Math.hypot(W,H)/2));ctx.lineWidth=H*.012;ctx.beginPath();ctx.arc(W/2,H/2,r,0,TAU);ctx.stroke()}}
  else if(st==='bgconfetti'){fill('#fdf4ff','#e0f2fe',1.2);for(let i=0;i<70;i++){const x=hash(i)*W+Math.sin(t+i)*W*.02,y=((hash(i+5)+t*.12*(.5+hash(i+2)))%1.1-.05)*H;ctx.save();ctx.translate(x,y);ctx.rotate(t*2+i);ctx.fillStyle=['#f43f5e','#f59e0b','#22c55e','#3b82f6','#a855f7'][i%5];ctx.fillRect(-H*.008,-H*.004,H*.016,H*.008);ctx.restore()}}
  else if(st==='bgsnow'){fill('#0c1a33','#1e3a5f',1.57);ctx.fillStyle='#ffffff';for(let i=0;i<120;i++){const z=hash(i+1),x=(hash(i)*W+Math.sin(t*.7+i)*W*.02)%W,y=((hash(i+7)+t*.05*(.4+z))%1)*H;ctx.globalAlpha=k*(.4+.6*z);ctx.beginPath();ctx.arc(x,y,H*.003*(1+z*2),0,TAU);ctx.fill()}}
  else if(st==='bghearts'){fill(c2,'#fdf2f8',1.57);ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<26;i++){const x=hash(i)*W+Math.sin(t+i)*W*.03,y=H-((hash(i+3)+t*.07*(.5+hash(i+9)))%1.2)*H,sz=H*(.03+.04*hash(i+4));ctx.globalAlpha=k*.6;ctx.fillStyle=hexA(i%2?'#ffffff':c1,.8);heartPath(ctx,x,y,sz);ctx.fill()}}
  else if(st==='bgtv'){const b=Math.max(2,Math.round(H/180)),id=ctx.getImageData?null:null;for(let y=0;y<H;y+=b*4)for(let x=0;x<W;x+=b*4){const v=Math.floor(hash(x*7+y*13+Math.floor(t*24)*101)*255);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,b*4,b*4)}ctx.fillStyle='rgba(0,0,0,.25)';for(let y=0;y<H;y+=b*2)ctx.fillRect(0,y,W,b)}
  else if(st==='bgdots'){ctx.fillStyle='#0f172a';ctx.fillRect(0,0,W,H);const sp=H/22;for(let y=sp/2;y<H;y+=sp)for(let x=sp/2;x<W;x+=sp){const r=sp*.42*(.5+.5*Math.sin(x/W*6+y/H*4-t*2));ctx.fillStyle=hexA(c1,.8);ctx.beginPath();ctx.arc(x,y,Math.max(.5,r),0,TAU);ctx.fill()}}
  else if(st==='bgembers'){fill('#1c0a05','#000000',1.57);ctx.globalCompositeOperation='lighter';for(let i=0;i<60;i++){const x=hash(i)*W+Math.sin(t*1.3+i)*W*.03,y=H-((hash(i+2)+t*.1*(.5+hash(i+4)))%1)*H*1.1,r=H*.006*(1+hash(i+6)*2);const g=ctx.createRadialGradient(x,y,0,x,y,r*3);g.addColorStop(0,'rgba(255,190,80,.9)');g.addColorStop(1,'rgba(255,60,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*3,0,TAU);ctx.fill()}ctx.globalCompositeOperation='source-over'}
  else if(st==='bgplasma'){const n=24,cw=W/n,chh=H/Math.round(n*H/W);for(let x=0;x<W;x+=cw)for(let y=0;y<H;y+=chh){const v=Math.sin(x/W*6+t)+Math.sin(y/H*5+t*1.3)+Math.sin((x+y)/W*4-t*.7);ctx.fillStyle=`hsl(${(v*60+t*30)%360},80%,55%)`;ctx.fillRect(x,y,cw+1,chh+1)}}
  else{const n=12,s=W/n;for(let i=0;i<n;i++)for(let j=0;j<Math.ceil(H/s);j++){ctx.fillStyle=hexA((i+j)%2?c1:c2,.25+.25*Math.sin(t*2+i*.6+j*.4));ctx.fillRect(i*s,j*s,s-1,s-1)}}
  boxes.set(c.id,{x:0,y:0,w:W,h:H,rot:0});
};
/* emoji animé : un emoji de l'ordinateur, mis en mouvement par DedCut */
const EMOFONT='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
WDRAW.aemoji=(c,p,loc)=>{
  const st=p.st||'em_pop',fs=H*(p.size??16)/100,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,e=p.emoji||'😂',out=clamp((c.dur-loc)/.3,0,1);let sx=1,sy=1,r=0,dx=0,dy=0,al=1;const L=loc;
  ctx.font=`${fs}px ${EMOFONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  if(st==='em_rain'){for(let i=0;i<18;i++){const sp=.4+hash(i)*.6,y=((L*sp*.5+hash(i+3))%1.2-.1)*H,x=hash(i+7)*W;ctx.save();ctx.globalAlpha*=out;ctx.translate(x,y);ctx.rotate(Math.sin(L*2+i)*.3);ctx.font=`${fs*(.4+hash(i+9)*.4)}px ${EMOFONT}`;ctx.fillText(e,0,0);ctx.restore()}boxes.set(c.id,{x:0,y:0,w:W,h:H,rot:0});return}
  if(st==='em_burst'){for(let i=0;i<14;i++){const a=i/14*TAU+hash(i),d=easeOut(clamp(L/1.2,0,1))*H*(.25+hash(i+2)*.2),f=clamp(1-(L-.6)/1,0,1);ctx.save();ctx.globalAlpha*=f*out;ctx.translate(cx+Math.cos(a)*d,cy+Math.sin(a)*d+L*L*H*.05);ctx.rotate(a);ctx.font=`${fs*.35}px ${EMOFONT}`;ctx.fillText(e,0,0);ctx.restore()}}
  const q=clamp(L/.35,0,1);
  switch(st){
    case 'em_pop':{const s=backOut(q);sx=sy=s;break}
    case 'em_bounce':{const h=Math.abs(Math.sin(L*5));dy=-h*fs*.5;sx=1+(1-h)*.15;sy=1-(1-h)*.15;break}
    case 'em_beat':{const f=(L*1.4)%1,b=f<.15?Math.sin(f/.15*Math.PI)*.25:f>.25&&f<.4?Math.sin((f-.25)/.15*Math.PI)*.15:0;sx=sy=(1+b)*backOut(q);break}
    case 'em_spin':{r=L*2.5;sx=sy=backOut(q);break}
    case 'em_shake':{dx=Math.sin(L*40)*fs*.06;r=Math.sin(L*33)*.12;sx=sy=backOut(q);break}
    case 'em_float':{dy=Math.sin(L*2)*fs*.12;r=Math.sin(L*1.3)*.1;al=q;break}
    case 'em_tilt':{r=Math.sin(L*3)*.3;sx=sy=backOut(q);break}
    case 'em_zoom':{sx=sy=.6+easeOut(clamp(L/.8,0,1))*.6+Math.sin(L*6)*.04;break}
    case 'em_wobble':{sx=1+Math.sin(L*8)*.12;sy=1-Math.sin(L*8)*.12;break}
    case 'em_burst':{sx=sy=backOut(q)*(1+.05*Math.sin(L*8));break}
  }
  ctx.save();ctx.globalAlpha*=al*out;ctx.translate(cx+dx,cy+dy);ctx.rotate(r);ctx.scale(sx,sy);ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=fs*.08;ctx.shadowOffsetY=fs*.04;ctx.fillText(e,0,fs*.05);ctx.restore();
  // petits détails ajoutés : larmes, cœurs, étincelles
  const ex=p.extra||'none';
  if(ex==='tears')for(let i=0;i<6;i++){const f=((L*1.6+i/6)%1),sd=i%2?1:-1;ctx.fillStyle=hexA('#38bdf8',(1-f)*out);ctx.beginPath();ctx.arc(cx+sd*(fs*.32+f*fs*.5),cy-fs*.05+f*f*fs*.9,fs*.06,0,TAU);ctx.fill()}
  if(ex==='hearts')for(let i=0;i<5;i++){const f=((L*.6+i/5)%1);ctx.save();ctx.globalAlpha*=(1-f)*out;ctx.font=`${fs*.25}px ${EMOFONT}`;ctx.fillText('❤️',cx+Math.sin(i*2+L*2)*fs*.5,cy-fs*.4-f*fs*.8);ctx.restore()}
  if(ex==='sparkles')for(let i=0;i<6;i++){const a=i/6*TAU+L,s=Math.abs(Math.sin(L*3+i));ctx.save();ctx.globalAlpha*=s*out;ctx.font=`${fs*.22}px ${EMOFONT}`;ctx.fillText('✨',cx+Math.cos(a)*fs*.75,cy+Math.sin(a)*fs*.75);ctx.restore()}
  if(ex==='fire'){ctx.save();ctx.globalAlpha*=out*.9;ctx.globalCompositeOperation='lighter';for(let i=0;i<10;i++){const f=((L*1.5+i/10)%1),x=cx+(hash(i)-.5)*fs*.7;const g=ctx.createRadialGradient(x,cy+fs*.4-f*fs,0,x,cy+fs*.4-f*fs,fs*.18*(1-f));g.addColorStop(0,'rgba(255,200,60,.8)');g.addColorStop(1,'rgba(255,60,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,cy+fs*.4-f*fs,fs*.18*(1-f)+1,0,TAU);ctx.fill()}ctx.restore()}
  boxes.set(c.id,{x:cx-fs*.6,y:cy-fs*.6,w:fs*1.2,h:fs*1.2,rot:0});
};
Object.assign(WSTY,{animbg:['bgflow','bgparticles','bgbokeh','bgwaves','bgretro','bgstars','bgblobs','bgstripes','bgaurora','bgtiles','bgmatrix','bgrays','bgrings','bgconfetti','bgsnow','bghearts','bgtv','bgdots','bgembers','bgplasma'],aemoji:['em_pop','em_bounce','em_beat','em_spin','em_shake','em_float','em_tilt','em_zoom','em_wobble','em_burst','em_rain']});
Object.assign(WDEF,{
  animbg:()=>({dur:8,p:{st:'bgflow',color:'#6366f1',color2:'#ec4899',speed:1,x:50,y:50,op:100}}),
  aemoji:()=>({dur:3,p:{st:'em_pop',emoji:'😂',extra:'none',size:16,x:50,y:50,op:100}})
});
Object.assign(WINSP,{
  animbg:[['st','st'],['color','col','common.color'],['color2','col','wdg.color2'],['speed','num','wdg.speed',[0,4,.05]]],
  aemoji:[['st','st'],['emoji','txt','fun.emoji'],['extra','opt','fun.extra',[['none','common.noneF'],['tears','fun.x.tears'],['hearts','fun.x.hearts'],['sparkles','fun.x.sparkles'],['fire','fun.x.fire']]],['size','num','common.size',[3,60,.5]]]
});
GN.animbg='fun.g.animbg';GN.aemoji='fun.g.aemoji';WSIZE.add('aemoji');

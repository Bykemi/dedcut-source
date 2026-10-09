// v4.19 : zone d'export (I / O), export du son seul (WAV / M4A), supprimer les trous, couleur des clips,
// éléments animés (barre de progression, compte à rebours, chronomètre, bouton S'abonner). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), A = path.resolve(__dirname, '../../src/App.tsx'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };
const R1 = (x, y) => { e = rep(e, x, y); };

/* ===== App.tsx ===== */
a = rep(a, '<option data-i18n="export.gif" value="gif">GIF animé</option></select></div>',
  '<option data-i18n="export.gif" value="gif">GIF animé</option><option data-i18n="export.wav" value="wav">Son seul — WAV</option><option data-i18n="export.m4a" value="m4a">Son seul — M4A</option></select></div>\n          <label className="chk" id="xRangeRow" hidden><span id="xRangeTxt"></span><input type="checkbox" id="xRange" defaultChecked /></label>');
a = rep(a, '<div className="chips c4 emo" id="emolist"></div>',
  '<div className="chips c4 emo" id="emolist"></div>\n              <h3 data-i18n="wdg.title">Éléments animés</h3>\n              <div className="shp" id="wdglist"></div>');

/* ===== 1) zone d'export ===== */
R1("/* ---------- images clés (animation) ---------- */",
`/* ---------- zone d'export (I = début, O = fin) : seule cette partie est exportée si la case est cochée ---------- */
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

/* ---------- images clés (animation) ---------- */`);
R1("  rh+=markers.map(t=>`<div class=\"mk\" style=\"left:${t*pxs}px\"></div>`).join('');",
   "  rh+=markers.map(t=>`<div class=\"mk\" style=\"left:${t*pxs}px\"></div>`).join('');\n  if(xin!=null||xout!=null){const ra=clamp(xin??0,0,total()),rb=clamp(xout??total(),0,total());rh+=`<div class=\"xrange\" style=\"left:${ra*pxs}px;width:${Math.max(2,(rb-ra)*pxs)}px\"></div>`}");
R1("  {id:'marker',n:'keys.marker',d:['m'],f:()=>toggleMarker()},",
   "  {id:'marker',n:'keys.marker',d:['m'],f:()=>toggleMarker()},\n  {id:'rin',n:'range.in',d:['i'],f:()=>setRange('in')},\n  {id:'rout',n:'range.out',d:['o'],f:()=>setRange('out')},\n  {id:'rclr',n:'range.clear',d:['alt+x'],f:()=>clearRange()},");
R1("      {label:T('menu.markerHere'),key:'M',fn:()=>{time=tAt;toggleMarker()}},\n      '-',\n",
   "      {label:T('menu.markerHere'),key:'M',fn:()=>{time=tAt;toggleMarker()}},\n      '-',\n      {label:T('range.inHere'),key:kbLabel('rin'),fn:()=>setRange('in',tAt)},\n      {label:T('range.outHere'),key:kbLabel('rout'),fn:()=>setRange('out',tAt)},\n      {label:T('range.clear'),off:xin==null&&xout==null,fn:clearRange},\n      '-',\n      {label:T('gap.track'),off:trackAtY(e.clientY-$('#tli').getBoundingClientRect().top)==null,fn:()=>closeGaps(trackAtY(e.clientY-$('#tli').getBoundingClientRect().top))},\n      {label:T('gap.all'),fn:()=>closeGaps(null)},\n      '-',\n");

/* ===== 2) export : zone + son seul ===== */
R1("function expBitrate(){\n  const p=XPRE[$('#xPre').value],TD=Math.max(.5,total());", "function expBitrate(){\n  const p=XPRE[$('#xPre').value],TD=Math.max(.5,expDur());");
R1("  if($('#xFmt').value==='gif'){$('#xInfo').textContent=T('export.gifInfo',{w:Math.min(480,W),dur:fmt(total()),max:GIF_MAX_S});return}\n  const b=expBitrate(),mb=(b.v+b.a)*total()/8388608;",
`  rangeRow();
  const fv=$('#xFmt').value,au=fv==='wav'||fv==='m4a';['#xRes','#xFps','#xPre'].forEach(s=>{$(s).disabled=au});$('#xQ').disabled=au||!!(XPRE[$('#xPre').value]&&XPRE[$('#xPre').value].mb);
  if(au){const d=expDur();$('#xInfo').textContent=T('export.audioInfo',{dur:fmt(d),size:window.i18n.fmt.bytes(d*(fv==='wav'?192000:24000))});return}
  if(fv==='gif'){$('#xInfo').textContent=T('export.gifInfo',{w:Math.min(480,W),dur:fmt(expDur()),max:GIF_MAX_S});return}
  const b=expBitrate(),mb=(b.v+b.a)*expDur()/8388608;`);
R1("T('export.info',{w:ew,h:eh,dur:fmt(total()),", "T('export.info',{w:ew,h:eh,dur:fmt(expDur()),");
R1("['#xQ','#xFps','#xFmt','#xRes'].forEach(s=>$(s).addEventListener('change',expInfo));", "['#xQ','#xFps','#xFmt','#xRes','#xRange'].forEach(s=>$(s).addEventListener('change',expInfo));");
R1("  pause();$('#xName').value=safeName(projName);\n  expInfo();", "  pause();$('#xName').value=safeName(projName);$('#xRange').checked=xin!=null||xout!=null;\n  expInfo();");
R1("async function startExport(){\n  const fps=+$('#xFps').value,br=expBitrate(),[nw,nh]=expDims();\n",
`/* export du son seul : mixage complet (volumes, effets, voix, limiteur) puis WAV 16 bits ou M4A (AAC 192 k) */
async function audioExport(kind){
  fastCancel=false;const t0=performance.now();
  const audio=await mixAudio(total());if(!audio)throw new Error(T('export.noAudio'));
  const Lc=audio.getChannelData(0),Rc=audio.numberOfChannels>1?audio.getChannelData(1):Lc,n=audio.length;
  if(kind==='wav'){xProgress(1,t0);return wavFromChannels([Lc,Rc],48000)}
  const cfg={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000};
  if(!window.AudioEncoder||!window.Mp4Muxer||!(await AudioEncoder.isConfigSupported(cfg).catch(()=>({}))).supported)throw new Error('AAC');
  const target=new Mp4Muxer.ArrayBufferTarget(),mux=new Mp4Muxer.Muxer({target,audio:{codec:'aac',numberOfChannels:2,sampleRate:48000},fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let err=null;const aenc=new AudioEncoder({output:(ch,meta)=>mux.addAudioChunk(ch,meta),error:x=>err=x});aenc.configure(cfg);
  for(let i=0,B=4800;i<n;i+=B){
    if(fastCancel){aenc.close();return null}
    const k=Math.min(B,n-i),d=new Float32Array(k*2);d.set(Lc.subarray(i,i+k),0);d.set(Rc.subarray(i,i+k),k);
    const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:k,numberOfChannels:2,timestamp:Math.round(i*1e6/48000),data:d});aenc.encode(ad);ad.close();
    if(aenc.encodeQueueSize>16)await new Promise(r=>{aenc.addEventListener('dequeue',r,{once:true});setTimeout(r,1000)});
    if(i%(B*50)===0){xProgress(i/n,t0);await new Promise(r=>setTimeout(r,0))}
  }
  await aenc.flush();aenc.close();if(err)throw err;mux.finalize();xProgress(1,t0);
  return new Blob([target.buffer],{type:'audio/mp4'});
}
async function startExport(){
  const fps=+$('#xFps').value,br=expBitrate(),[nw,nh]=expDims();
  const rg=expRange(),fmtv=$('#xFmt').value,rRestore=rg?rangeApply(rg[0],rg[1]):null;
  if(fmtv==='wav'||fmtv==='m4a'){
    expName=safeName($('#xName').value);
    $('#expForm').hidden=true;$('#expRun').hidden=false;$('#bar i').style.width='0';$('#xPct').textContent=T('export.audioPrep');$('#xRunInfo').textContent=T('export.audioHint');
    let b=null,err=null;try{b=await audioExport(fmtv)}catch(x){err=x}
    if(rRestore)rRestore();$('#ov').style.display='none';
    if(err){console.error(err);toast(T('export.audioFailed',{error:String((err&&err.message)||err)}))}else if(b){download(b,expName+'.'+fmtv);toast(T('export.done'))}
    return;
  }
`);
R1("setFormat(ow,oh,false);refresh()}}\n  expName=safeName($('#xName').value);", "setFormat(ow,oh,false);refresh()}}\n  if(rRestore){const r0=expRestore;expRestore=()=>{if(r0)r0();rRestore()}}\n  expName=safeName($('#xName').value);");

/* ===== 3) couleur des clips ===== */
R1("  if(m&&m.type!=='audio')h+=`<div class=\"strip m${m.id}\"></div>`;", "  if(c.lc)h+=`<i class=\"lct\" style=\"background:${c.lc}\"></i><i class=\"lcb\" style=\"background:${c.lc}\"></i>`;\n  if(m&&m.type!=='audio')h+=`<div class=\"strip m${m.id}\"></div>`;");
R1("it==='-'?'<div class=\"sep\"></div>':it.title?", "it==='-'?'<div class=\"sep\"></div>':it.swatches?`<div class=\"tt\">${esc(T(it.label))}</div><div class=\"ctxsw\">${it.swatches.map((c,j)=>`<button data-i=\"${i}\" data-sw=\"${j}\" class=\"${c?'':'none'}\" style=\"${c?'background:'+c:''}\"></button>`).join('')}</div>`:it.title?");
R1("  const it=ctxEl._items[+b.dataset.i];hideCtx();if(it&&it.fn)it.fn();", "  const it=ctxEl._items[+b.dataset.i];hideCtx();if(it&&it.fn)it.fn(b.dataset.sw!=null&&it.swatches?it.swatches[+b.dataset.sw]:undefined);");
R1("  const c=clips.find(x=>x.id==ce.dataset.id);if(!c)return;\n  sel=c.id;refresh();", "  const c=clips.find(x=>x.id==ce.dataset.id);if(!c)return;\n  if(!selIds().includes(c.id))msel.clear();sel=c.id;refresh();");
R1("    {title:clipName(c)},\n", "    {title:clipName(c)},\n    {label:'clipcol.title',swatches:['','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'],fn:col=>{for(const x of selClips()){if(col)x.lc=col;else delete x.lc}commit();renderTL()}},\n    '-',\n");

/* ===== 4) éléments animés ===== */
R1("const GN={matrix:'gen.matrix',", "const hexA=(h,al)=>{const n=parseInt(String(h||'#000000').slice(1,7),16)||0;return`rgba(${n>>16&255},${n>>8&255},${n&255},${al})`};\nconst GN={pbar:'wdg.pbar',count:'wdg.count',timer:'wdg.timer',sub:'wdg.sub',matrix:'gen.matrix',");
R1("  }else if(c.gen==='hud'){\n", `  }else if(c.gen==='pbar'){
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
      ctx.font=\`900 \${n<from?fs:fs*.42}px "Segoe UI",sans-serif\`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.color||'#ffffff';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=fs*.08;ctx.fillText(txt,0,fs*.04);
    }
    boxes.set(c.id,{x:x-fs*.8,y:y-fs*.8,w:fs*1.6,h:fs*1.6,rot:0});
  }else if(c.gen==='timer'){
    const v=p.mode==='down'?Math.max(0,(p.from??60)-loc):loc,mi=Math.floor(v/60),s=Math.floor(v%60),cs=Math.floor((v%1)*100);
    const txt=String(mi).padStart(2,'0')+':'+String(s).padStart(2,'0')+(p.cs?'.'+String(cs).padStart(2,'0'):'');
    const fs=H*(p.size??9)/100,x=W*(p.x??50)/100,y=H*(p.y??12)/100;
    ctx.font=\`700 \${fs}px Consolas,"Courier New",monospace\`;ctx.textAlign='center';ctx.textBaseline='middle';const tw=ctx.measureText(txt).width;
    if(p.box){ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.roundRect(x-tw/2-fs*.4,y-fs*.65,tw+fs*.8,fs*1.3,fs*.2);ctx.fill()}
    ctx.fillStyle=p.color||'#ffffff';ctx.fillText(txt,x,y+fs*.03);
    boxes.set(c.id,{x:x-tw/2-fs*.4,y:y-fs*.65,w:tw+fs*.8,h:fs*1.3,rot:0});
  }else if(c.gen==='sub'){
    /* bouton « S'abonner » dessiné par DedCut (aucun logo) : il apparaît, un curseur vient cliquer, il passe en « Abonné » */
    const fs=H*(p.size??5)/100,x=W*(p.x??50)/100,y=H*(p.y??80)/100,ap=clamp(loc/.35,0,1),out=clamp((c.dur-loc)/.3,0,1),clicked=loc>=1.3;
    ctx.font=\`700 \${fs}px "Segoe UI",sans-serif\`;const txt=clicked?(p.done||''):(p.text||''),tw=ctx.measureText(txt).width,bw=tw+fs*2.2,bh=fs*2;
    const press=loc>1.2&&loc<1.4?.92:1,sc=(.6+.4*easeOut(ap))*press;ctx.globalAlpha*=Math.min(ap,out);
    ctx.translate(x,y);ctx.scale(sc,sc);
    ctx.fillStyle=clicked?'#3f3f46':(p.color||'#ef4444');ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fs*.5;ctx.shadowOffsetY=fs*.12;
    ctx.beginPath();ctx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,fs*.05);
    if(loc>.5&&loc<2.2){const k=easeOut(clamp((loc-.5)/.7,0,1)),s2=fs*1.1;ctx.translate(bw*.25+(1-k)*bw*.6,bh*.15+(1-k)*bh*1.4);
      ctx.fillStyle='#ffffff';ctx.strokeStyle='#111111';ctx.lineWidth=fs*.08;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,s2);ctx.lineTo(s2*.28,s2*.75);ctx.lineTo(s2*.5,s2*1.12);ctx.lineTo(s2*.65,s2*1.04);ctx.lineTo(s2*.45,s2*.68);ctx.lineTo(s2*.8,s2*.68);ctx.closePath();ctx.fill();ctx.stroke()}
    boxes.set(c.id,{x:x-bw/2,y:y-bh/2,w:bw,h:bh,rot:0});
  }else if(c.gen==='hud'){
`);
R1("  if(c.gen)return c.gen==='hud'?['p.op']:", "  if(c.gen)return c.gen==='hud'||c.gen==='pbar'?['p.op']:");
R1("      else h+=S('HUD',`", `      else if(c.gen==='pbar')h+=S(T('wdg.pbar'),\`<div class="seg">\${[['bottom','wdg.bottom'],['top','wdg.top']].map(([v,n])=>\`<button data-wpos="\${v}" class="\${(p.pos||'bottom')===v?'on':''}">\${T(n)}</button>\`).join('')}</div>\`+CO(T('common.color'),'p.color')+CO(T('text.bgColor'),'p.bgc')+R(T('wdg.bgOp'),'p.bgo',0,100)+R(T('wdg.thick'),'p.th',.3,6,.1)+CK(T('insp.cornerRadius'),'p.round')+\`<p class="hint">\${T('wdg.pbarHint')}</p>\`);
      else if(c.gen==='count')h+=S(T('wdg.count'),R(T('wdg.from'),'p.from',1,10)+\`<div class="fld"><label>\${T('wdg.endText')}</label><input data-k="p.end" data-t="s" type="text" value="\${esc(p.end||'')}"></div>\`+R(T('common.size'),'p.size',5,60)+CO(T('common.color'),'p.color')+CK(T('wdg.ring'),'p.ring'));
      else if(c.gen==='timer')h+=S(T('wdg.timer'),\`<div class="seg">\${[['up','wdg.up'],['down','wdg.down']].map(([v,n])=>\`<button data-wmode="\${v}" class="\${(p.mode||'up')===v?'on':''}">\${T(n)}</button>\`).join('')}</div>\`+(p.mode==='down'?R(T('wdg.from'),'p.from',5,3600):'')+R(T('common.size'),'p.size',3,30,.5)+CO(T('common.color'),'p.color')+CK(T('wdg.cs'),'p.cs')+CK(T('wdg.box'),'p.box'));
      else if(c.gen==='sub')h+=S(T('wdg.sub'),\`<div class="fld"><label>\${T('common.text')}</label><input data-k="p.text" data-t="s" type="text" value="\${esc(p.text||'')}"></div><div class="fld"><label>\${T('wdg.textDone')}</label><input data-k="p.done" data-t="s" type="text" value="\${esc(p.done||'')}"></div>\`+R(T('common.size'),'p.size',2,15,.5)+CO(T('common.color'),'p.color'));
      else h+=S('HUD',\``);
R1("h+=S(T('common.position'),kfBar()+(c.gen!=='hud'?", "h+=S(T('common.position'),kfBar()+(c.gen!=='hud'&&c.gen!=='pbar'?");
R1("  if(d.vcat){vCat=d.vcat;renderInspector();return}", "  if(d.vcat){vCat=d.vcat;renderInspector();return}\n  if(d.wpos){c.p.pos=d.wpos;commit();refresh();return}\n  if(d.wmode){c.p.mode=d.wmode;commit();refresh();return}");
R1("  if(k==='p.rate'){const old=c.p.rate||1;", "  if(k==='p.from'&&c.gen==='count'){c.dur=Math.max(1,Math.round(v))+1;renderTL()}\n  if(k==='p.rate'){const old=c.p.rate||1;");
R1("renderShapes();\n", `renderShapes();
/* éléments animés (onglet Formes) */
const WDG=[['pbar','wdg.pbar','<rect x="3" y="10" width="18" height="4" rx="2"/><path d="M5 12h8" stroke-width="3"/>'],['count','wdg.count','<circle cx="12" cy="12" r="9"/><path d="M10 8.5h3.5l-2 3a2.2 2.2 0 1 1-2 3"/>'],
  ['timer','wdg.timer','<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>'],['sub','wdg.sub','<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M9 12h6"/>']];
function renderWidgets(){const L=$('#wdglist');if(L)L.innerHTML=WDG.map(([k,n,i])=>\`<button data-wdg="\${k}" title="\${esc(T(n))}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">\${i}</svg>\${esc(T(n))}</button>\`).join('')}
renderWidgets();window.addEventListener('dedcut-lang',renderWidgets);
$('#wdglist').addEventListener('click',e=>{
  const b=e.target.closest('[data-wdg]');if(!b)return;const k=b.dataset.wdg;
  const D={pbar:{start:0,dur:Math.max(1,total()||10),p:{pos:'bottom',color:'#ffffff',bgc:'#000000',bgo:35,th:1.2,round:true,op:100}},
    count:{dur:4,p:{from:3,end:T('wdg.go'),size:30,color:'#ffffff',ring:true,x:50,y:50,op:100}},
    timer:{dur:10,p:{mode:'up',from:60,size:9,color:'#ffffff',cs:false,box:true,x:50,y:12,op:100}},
    sub:{dur:3,p:{text:T('wdg.subText'),done:T('wdg.subDone'),size:5,color:'#ef4444',x:50,y:80,op:100}}}[k];
  add(newClip({track:tk('over'),gen:k,start:D.start??time,dur:D.dur,p:D.p}));
});
`);

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.xrange{')) {
  css += `
/* zone d'export sur la règle */
.xrange{position:absolute;top:0;bottom:0;z-index:1;pointer-events:none;background:rgba(56,189,248,.2);border-left:2px solid #38bdf8;border-right:2px solid #38bdf8}
/* couleur des clips */
.clip .lct{position:absolute;inset:0;opacity:.22;pointer-events:none;z-index:1}
.clip .lcb{position:absolute;left:0;right:0;top:0;height:4px;pointer-events:none;z-index:3}
.ctxsw{display:flex;gap:6px;padding:4px 10px 8px}
#ctx .ctxsw button{width:20px;height:20px;min-width:0;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.35);flex:none}
#ctx .ctxsw button:hover{outline:2px solid #fff;outline-offset:1px}
#ctx .ctxsw .none{background:repeating-linear-gradient(45deg,#555 0 3px,#222 3px 6px)}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.19 : zone d’export, son seul, trous, couleurs, éléments animés');

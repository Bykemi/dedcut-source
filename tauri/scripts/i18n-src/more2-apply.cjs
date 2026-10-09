// v4.21 : flouter / pixeliser / cacher une zone, diaporama automatique, texte en voix (voix de Windows),
// couper à chaque marqueur, incrustation (placement rapide, bordure, ombre). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), A = path.resolve(__dirname, '../../src/App.tsx'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };
const R1 = (x, y) => { e = rep(e, x, y); };

/* ===== App.tsx ===== */
a = rep(a, `<button data-i18n="lib.recordScreen" data-tab2="rec" data-ico="rec">Enregistrer l'écran</button>`,
  `<button data-i18n="lib.recordScreen" data-tab2="rec" data-ico="rec">Enregistrer l'écran</button>\n                <button data-i18n="slide.btn" id="aSlide" data-ico="media">Diaporama</button>`);
a = rep(a, '<h3 data-i18n="audio.sfx">Effets sonores</h3>',
  `<h3 data-i18n="tts.title">Texte en voix</h3>
              <div data-i18n="tts.hint" className="hint" style={{"marginBottom":"6px"}}>Écris un texte : une voix installée dans Windows le lit.</div>
              <textarea data-i18n-ph="tts.ph" id="ttsTxt" rows={3} placeholder="…"></textarea>
              <div className="fld" style={{"marginTop":"6px"}}><label data-i18n="tts.voice">Voix</label><select id="ttsVoice"></select></div>
              <div className="fld"><label><span data-i18n="tts.rate">Vitesse</span><span id="ttsRateV">0</span></label><input type="range" id="ttsRate" min="-5" max="5" step="1" defaultValue="0" /></div>
              <button data-i18n="tts.go" className="pri" id="ttsGo" style={{"width":"100%"}}>Créer la voix</button>
              <h3 data-i18n="audio.sfx">Effets sonores</h3>`);

/* ===== 1) flouter / pixeliser / cacher une zone (élément « blurz ») ===== */
R1("function wInsp(c,p,R,CO,CK){", `/* zone floutée : lit l'image déjà dessinée en dessous (calque principal), la floute ou la pixelise, découpée dans la forme */
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
  else{ctx.filter=\`blur(\${(4+40*k)*H/1080}px)\`;ctx.drawImage(tmp,x0-pad,y0-pad,tw,th);ctx.filter='none'}
  ctx.restore();
};
WSTY.blurz=['zblur','zpix','zsolid'];
WDEF.blurz=()=>({dur:5,p:{st:'zblur',amt:60,color:'#000000',oval:false,w:30,h:20,x:50,y:50,op:100}});
WINSP.blurz=[['st','st'],['amt','num','wdg.strength',[0,100],['zblur','zpix']],['color','col','common.color',null,['zsolid']],['oval','chk','wdg.oval'],['w','num','insp.widthPct',[2,100,.5]],['h','num','insp.heightPct',[2,100,.5]],['hint','hint','wdg.blurHint']];
GN.blurz='wdg.blurz';
function wInsp(c,p,R,CO,CK){`);
R1("const WCATS=['bar','count','timer','social','tag','fun','shape','stick'];", "const WCATS=['bar','count','timer','social','tag','fun','tools','shape','stick'];");
R1("  ...SHPLIB.map((s,i)=>({c:'shape',shp:i,n:s.n}))\n];",
`  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurRect',tp:{w:62,h:42},tt:1},
  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurOval',p:{oval:true,w:16,h:30},tp:{oval:true,w:46,h:62},tt:1},
  {c:'tools',g:'blurz',s:'zpix',n:'wl.pixRect',tp:{w:62,h:42},tt:1},
  {c:'tools',g:'blurz',s:'zsolid',n:'wl.solidBar',p:{w:40,h:8},tp:{w:72,h:16},tt:1},
  ...SHPLIB.map((s,i)=>({c:'shape',shp:i,n:s.n}))
];`);
R1("c.gen==='shape'||c.gen==='pbar'?'p.w':WSIZE.has(c.gen)?'p.size':null", "c.gen==='shape'||c.gen==='pbar'||c.gen==='blurz'?'p.w':WSIZE.has(c.gen)?'p.size':null");
R1("if(c.gen==='shape')setVal(c,'p.h',Math.max(1,Math.round(cdrag.h0*r*10)/10))", "if(c.gen==='shape'||c.gen==='blurz')setVal(c,'p.h',Math.max(1,Math.round(cdrag.h0*r*10)/10))");
R1("h0:hit.gen==='shape'?valOf(hit,'p.h'):0", "h0:hit.gen==='shape'||hit.gen==='blurz'?valOf(hit,'p.h'):0");

/* ===== 2) diaporama automatique ===== */
R1("/* ---------- boutons & clavier ---------- */", `/* ---------- diaporama automatique : photos choisies posées à la suite (durée, transition, mouvement, musique) ---------- */
let slideSel=null;
function slideOpen(){
  const ims=media.filter(m=>m.type==='image'&&!m.missing);if(!ims.length){toast(T('slide.none'));return}
  if(!slideSel)slideSel=new Set(ims.map(m=>m.id));for(const m of ims)if(!slideSel.has(m.id)&&!slideSel.seen)slideSel.add(m.id);
  const auds=media.filter(m=>m.type==='audio'&&!m.missing);
  let o=$('#slidedlg');if(!o){o=document.createElement('div');o.id='slidedlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',ev=>{if(ev.target===o)o.remove()});
    o.addEventListener('change',ev=>{const id=ev.target.dataset.sl;if(id!=null){if(ev.target.checked)slideSel.add(+id);else slideSel.delete(+id);slideSel.seen=true;slideCount()}});
    o.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.slx!=null)o.remove();if(b.dataset.slall!=null){const on=b.dataset.slall==='1';media.filter(m=>m.type==='image').forEach(m=>on?slideSel.add(m.id):slideSel.delete(m.id));slideSel.seen=true;slideOpen()}if(b.dataset.slgo!=null)slideMake()});
  }
  const sel2=(id,opts,v)=>\`<select id="\${id}">\${opts.map(([k,n])=>\`<option value="\${k}" \${k===v?'selected':''}>\${esc(n)}</option>\`).join('')}</select>\`;
  o.innerHTML=\`<div class="kbbox slbox"><div class="kbhead"><h3>\${T('slide.title')}</h3><button class="sm" data-slx>\${T('kb.close')}</button></div>
    <div class="slbar"><span id="slCount" class="hint"></span><span class="sp"></span><button class="sm" data-slall="1">\${T('slide.all')}</button><button class="sm" data-slall="0">\${T('slide.nothing')}</button></div>
    <div class="slgrid">\${ims.map(m=>\`<label class="slit"><img src="\${esc(m.thumb||m.url||'')}" alt=""><input type="checkbox" data-sl="\${m.id}" \${slideSel.has(m.id)?'checked':''}></label>\`).join('')}</div>
    <div class="slopts">
      <div class="fld"><label>\${T('slide.dur')}</label>\${sel2('slDur',[1.5,2,3,4,5,6].map(v=>[String(v),fmtN(v)+' s']),'3')}</div>
      <div class="fld"><label>\${T('slide.trans')}</label>\${sel2('slTr',['none','fade','slide','zoom','wipe','black','flash'].map(k=>[k,T(TRN[k])]),'fade')}</div>
      <div class="fld"><label>\${T('slide.move')}</label>\${sel2('slMv',[['none',T('slide.moveNone')],['in',T('slide.moveIn')],['alt',T('slide.moveAlt')]],'alt')}</div>
      <div class="fld"><label>\${T('slide.order')}</label>\${sel2('slOr',[['media',T('slide.orderMedia')],['rand',T('slide.orderRandom')]],'media')}</div>
      <div class="fld"><label>\${T('slide.music')}</label>\${sel2('slMu',[['',T('slide.noMusic')],...auds.map(m=>[String(m.id),m.name])],'')}</div>
      <label class="chk"><span>\${T('slide.fit')}</span><input type="checkbox" id="slFit"></label>
    </div>
    <div class="kbfoot"><button class="pri" data-slgo>\${T('slide.create')}</button></div></div>\`;
  slideCount();
}
function slideCount(){const n=media.filter(m=>m.type==='image'&&slideSel.has(m.id)).length;const el=$('#slCount');if(el)el.textContent=T('slide.count',{count:n});const g=$('#slidedlg [data-slgo]');if(g)g.disabled=!n}
function slideMake(){
  let ims=media.filter(m=>m.type==='image'&&!m.missing&&slideSel.has(m.id));if(!ims.length)return;
  if($('#slOr').value==='rand')ims=ims.map(m=>[Math.random(),m]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
  const mu=mById(+$('#slMu').value),tr=$('#slTr').value,mv=$('#slMv').value;
  let per=+$('#slDur').value||3;if(mu&&$('#slFit').checked&&mu.duration>0)per=clamp(mu.duration/ims.length,1,15);
  const v=tk('video'),t0=endOf(v);let t=t0;
  ims.forEach((m,i)=>{
    const c=newClip({track:v,mid:m.id,start:t,dur:per,p:{vol:100,fit:'cover',amt:60,fx:noFx(),tf:{zoom:100,x:0,y:0,rot:0,flip:false}}});
    if(tr!=='none'&&i>0){c.p.tin=tr;c.p.tdur=Math.min(.8,per/3)}
    if(mv!=='none'){const base=Object.fromEntries(KFK(c).map(k=>[k,gv(c,k)])),A0={...base},B0={...base},kind=mv==='in'?0:i%3;
      if(kind===0){A0['p.tf.zoom']=100;B0['p.tf.zoom']=116}else if(kind===1){A0['p.tf.zoom']=116;B0['p.tf.zoom']=100}else{A0['p.tf.zoom']=B0['p.tf.zoom']=114;A0['p.tf.x']=i%2?-6:6;B0['p.tf.x']=i%2?6:-6}
      c.kf=[{t:0,v:A0},{t:per,v:B0}]}
    clips.push(c);t+=per;
  });
  if(mu){const d=Math.min(mu.duration||t-t0,t-t0);clips.push(placeFree(newClip({track:tk('audio'),mid:mu.id,start:t0,dur:d,p:{vol:100,afout:Math.min(2,d/4)}})))}
  sel=null;msel.clear();commit();refresh();$('#slidedlg')?.remove();toast(T('slide.done',{count:ims.length}));
}
$('#aSlide').onclick=slideOpen;

/* ---------- texte en voix : moteur vocal intégré à Windows (src-tauri/src/tts.rs), rien ne sort du PC ---------- */
let ttsList=null;
async function ttsLoad(){
  const s=$('#ttsVoice');if(!s)return;
  if(!FS||!FS.ttsVoices){s.innerHTML=\`<option value="">\${esc(T('tts.onlyApp'))}</option>\`;$('#ttsGo').disabled=true;return}
  if(!ttsList){try{ttsList=await FS.ttsVoices()}catch(x){ttsList=[]}}
  ttsFill();
}
function ttsFill(){
  const s=$('#ttsVoice');if(!s||!ttsList)return;const cur=s.value,lg=(document.documentElement.lang||'fr').slice(0,2);
  if(!ttsList.length){s.innerHTML=\`<option value="">\${esc(T('tts.noVoice'))}</option>\`;return}
  const L=[...ttsList].sort((x,y)=>(y.lang.startsWith(lg)?1:0)-(x.lang.startsWith(lg)?1:0));
  s.innerHTML=L.map(v=>\`<option value="\${esc(v.name)}">\${esc(v.name.replace(/^Microsoft\\s+|\\s+Desktop$/g,''))} — \${esc(v.lang)}\${v.gender==='Female'?' · '+T('tts.female'):v.gender==='Male'?' · '+T('tts.male'):''}</option>\`).join('');
  if(cur&&L.some(v=>v.name===cur))s.value=cur;
}
async function ttsMake(text,at){
  text=String(text||'').trim();if(!text){toast(T('tts.empty'));return}
  if(!FS||!FS.ttsMake){toast(T('tts.onlyApp'));return}
  const b=$('#ttsGo');if(b)b.disabled=true;toast(T('tts.busy'));
  try{
    if(!ttsList)await ttsLoad();
    const f=await FS.ttsMake(text,$('#ttsVoice')?.value||'',+($('#ttsRate')?.value||0),T('tts.title')+' - '+text.slice(0,28));
    const m=addPaths([f])[0];if(!m)throw new Error('?');await waitMeta([m]);
    const c=placeFree(newClip({track:tk('audio'),mid:m.id,start:at??time,dur:m.duration||3,p:{vol:100}}));clips.push(c);sel=c.id;msel.clear();commit();refresh();toast(T('tts.done'));
  }catch(x){toast(T('tts.fail',{error:String((x&&x.message)||x).slice(0,140)}))}
  finally{if(b)b.disabled=false}
}
$('#ttsGo').onclick=()=>ttsMake($('#ttsTxt').value);
$('#ttsRate').oninput=e=>{$('#ttsRateV').textContent=e.target.value};
window.addEventListener('dedcut-lang',ttsFill);

/* ---------- couper à chaque marqueur (sur les clips sélectionnés) ---------- */
function cutAtMarkers(){
  const g=selClips().filter(c=>!trk(c).lock);if(!g.length){toast(T('msg.selectClip'));return}
  let n=0;for(const c of g)for(const t of markers.filter(t=>t>c.start+.05&&t<c.start+c.dur-.05).sort((x,y)=>y-x)){splitAt(c,t);n++}
  if(n){commit();refresh();toast(T('mkcut.done',{count:n}))}else toast(T('mkcut.none'));
}

/* ---------- boutons & clavier ---------- */`);
R1("  if(t==='audio')voMics();", "  if(t==='audio'){voMics();ttsLoad()}");
R1("    {label:T('menu.splitHere'),key:'S',fn:()=>{seek(tAt);split()}},", "    {label:T('menu.splitHere'),key:'S',fn:()=>{seek(tAt);split()}},\n    {label:T('mkcut.menu'),off:!markers.some(t=>t>c.start+.05&&t<c.start+c.dur-.05),fn:cutAtMarkers},");
R1("  items.push({label:T('menu.kfHere'),key:'K',fn:()=>{seek(tAt);toggleKf()}},'-');", "  if(isText(c))items.push({label:T('tts.fromText'),fn:()=>ttsMake(c.p.text,c.start)});\n  items.push({label:T('menu.kfHere'),key:'K',fn:()=>{seek(tAt);toggleKf()}},'-');");

/* ===== 5) incrustation : placement rapide, bordure, ombre ===== */
R1("  if(p.round){ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*p.round/200);ctx.clip()}\n  if(hasGrade(p.col)){",
   "  if(p.shd){ctx.save();ctx.filter='none';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=Math.max(w,h)*.06;ctx.shadowOffsetY=Math.max(w,h)*.02;ctx.fillStyle='#000000';ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,p.round?Math.min(w,h)*p.round/200:0);ctx.fill();ctx.restore()}\n  if(p.round){ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*p.round/200);ctx.clip()}\n  if(hasGrade(p.col)){");
R1("  }else ctx.drawImage(el,sx,sy,sw,sh,-w/2,-h/2,w,h);\n  ctx.restore();\n  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:p.rot||0});",
   "  }else ctx.drawImage(el,sx,sy,sw,sh,-w/2,-h/2,w,h);\n  if(p.bw>0){const lw=p.bw*H/720;ctx.filter='none';ctx.globalAlpha=op;ctx.lineWidth=lw;ctx.strokeStyle=p.bc||'#ffffff';ctx.beginPath();ctx.roundRect(-w/2+lw/2,-h/2+lw/2,Math.max(1,w-lw),Math.max(1,h-lw),Math.max(0,(p.round?Math.min(w,h)*p.round/200:0)-lw/2));ctx.stroke()}\n  ctx.restore();\n  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:p.rot||0});");
R1("      h+=S(T('insp.posSize'),kfBar()+`<div class=\"two\">${R(T('insp.posX'),'p.x',-50,150,.1)}",
   "      h+=S(T('insp.posSize'),kfBar()+`<div class=\"fld\"><label>${T('pip.pos')}</label><div class=\"pipgrid\">${['tl','tc','tr','ml','c','mr','bl','bc','br'].map(k=>`<button data-pp=\"${k}\"><i style=\"left:${k==='c'||k[1]==='c'?'calc(50% - 4px)':k[1]==='l'?'3px':'calc(100% - 11px)'};top:${k==='c'||k[0]==='m'?'calc(50% - 3px)':k[0]==='t'?'3px':'calc(100% - 9px)'}\"></i></button>`).join('')}<button data-pp=\"full\" class=\"pipfull\">${T('pip.full')}</button></div></div><div class=\"two\">${R(T('insp.posX'),'p.x',-50,150,.1)}");
R1("+R(T('insp.rounded'),'p.round',0,100)+CK(T('common.mirror'),'p.flip')", "+R(T('insp.rounded'),'p.round',0,100)+R(T('pip.border'),'p.bw',0,30)+(p.bw>0?CO(T('pip.bcol'),'p.bc'):'')+CK(T('pip.shadow'),'p.shd')+CK(T('common.mirror'),'p.flip')");
R1("  if(d.vcat){vCat=d.vcat;renderInspector();return}", `  if(d.vcat){vCat=d.vcat;renderInspector();return}
  if(d.pp){const m=mById(c.mid),ar=m&&m.w&&m.h?m.h/m.w:9/16;
    if(d.pp==='full'){setVal(c,'p.scale',100);setVal(c,'p.x',50);setVal(c,'p.y',50)}
    else{const s=valOf(c,'p.scale')??30,hw=s/2,hh=s*W/H*ar/2,mg=3,row=d.pp==='c'?'m':d.pp[0],col=d.pp==='c'?'c':d.pp[1];
      setVal(c,'p.x',col==='l'?mg+hw:col==='r'?100-mg-hw:50);setVal(c,'p.y',row==='t'?mg+hh:row==='b'?100-mg-hh:50)}
    commit();refresh();return}`);

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.slgrid{')) {
  css += `
/* diaporama */
.slbox{width:min(720px,calc(100vw - 32px))}
.slbar{display:flex;align-items:center;gap:6px;margin:4px 0 8px}
.slbar .sp{flex:1}
.slgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;max-height:34vh;overflow-y:auto;padding:2px}
.slit{position:relative;display:block;aspect-ratio:16/10;border-radius:4px;overflow:hidden;cursor:pointer;border:2px solid transparent;background:#000}
.slit img{width:100%;height:100%;object-fit:cover;display:block}
.slit input{position:absolute;top:5px;left:5px;width:16px;height:16px}
.slit:has(input:checked){border-color:var(--ac)}
.slit:has(input:not(:checked)) img{opacity:.35}
.slopts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;margin-top:10px}
.slopts .chk{grid-column:1/-1}
/* incrustation : placement rapide */
.pipgrid{display:grid;grid-template-columns:repeat(3,34px);gap:4px;align-items:center}
.pipgrid button{position:relative;height:22px;padding:0;border-radius:3px}
.pipgrid button i{position:absolute;width:8px;height:6px;background:currentColor;border-radius:1px}
.pipgrid .pipfull{grid-column:1/-1;height:24px;font-size:11px}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.21 : flou, diaporama, voix, marqueurs, incrustation');

// v4.24 : 4 éléments (compteur, texte défilant, graphique, bandes cinéma), écran partagé, logo sur toute la vidéo (clic droit sur un média),
// zoom rapide, copier / coller le style, remplacer le média, même durée pour la sélection, fondus d'ouverture / fermeture, favoris. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

/* ===== 1) nouveaux éléments ===== */
rep("function wInsp(c,p,R,CO,CK){", `WDRAW.counter=(c,p,loc)=>{
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
function wInsp(c,p,R,CO,CK){`);
rep("const WCATS=['tpl','bar','count','timer','social','tag','fun','tools','shape','stick'];", "const WCATS=['tpl','bar','count','timer','social','tag','data','fun','tools','shape','stick'];");
rep("  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurRect',", `  {c:'data',g:'counter',s:'plain',n:'wl.counterPlain',tp:{size:20,to:1000},tt:1.6},
  {c:'data',g:'counter',s:'badge',n:'wl.counterBadge',p:{to:250,pre:'+',suf:' %'},tp:{size:15},tt:1.6},
  {c:'data',g:'chart',s:'bars',n:'wl.chartBars',tp:{w:80,h:70},tt:1.8},
  {c:'data',g:'chart',s:'hbars',n:'wl.chartH',tp:{w:80,h:70},tt:1.8},
  {c:'data',g:'ticker',s:'news',n:'wl.tickerNews',tp:{size:7,y:50},tt:1.2},
  {c:'data',g:'ticker',s:'plain',n:'wl.tickerPlain',tp:{size:7,y:50},tt:1.2},
  {c:'tools',g:'letterbox',n:'wl.letterbox',tt:2},
  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurRect',`);
// le graphique se redimensionne par le coin (largeur et hauteur)
rep("c.gen==='shape'||c.gen==='pbar'||c.gen==='blurz'?'p.w':WSIZE.has(c.gen)?'p.size':null", "c.gen==='shape'||c.gen==='pbar'||c.gen==='blurz'||c.gen==='chart'?'p.w':WSIZE.has(c.gen)?'p.size':null");
rep("if(c.gen==='shape'||c.gen==='blurz')setVal(c,'p.h',", "if(c.gen==='shape'||c.gen==='blurz'||c.gen==='chart')setVal(c,'p.h',");
rep("h0:hit.gen==='shape'||hit.gen==='blurz'?valOf(hit,'p.h'):0", "h0:hit.gen==='shape'||hit.gen==='blurz'||hit.gen==='chart'?valOf(hit,'p.h'):0");

/* ===== 2..8) fonctions ===== */
rep("/* ---------- boutons & clavier ---------- */", `/* ---------- écran partagé : 2 à 4 vidéos / images placées en cases (recadrées pour remplir) ---------- */
const SPLITS={'2h':[[0,0,50,100],[50,0,50,100]],'2v':[[0,0,100,50],[0,50,100,50]],'3':[[0,0,50,100],[50,0,50,50],[50,50,50,50]],'4':[[0,0,50,50],[50,0,50,50],[0,50,50,50],[50,50,50,50]]};
function splitScreen(k){
  const L=SPLITS[k],g=selClips().filter(c=>c.mid&&mById(c.mid)&&mById(c.mid).type!=='audio'&&!trk(c).lock).sort((a,b)=>a.start-b.start).slice(0,L.length);
  if(g.length<2){toast(T('split.need'));return}
  const ov=tk('over');
  g.forEach((c,i)=>{const[cx,cy,cw,ch]=L[i],m=mById(c.mid),a=m.w&&m.h?m.h/m.w:9/16,r=(ch*H)/(cw*W);
    if(!isOvr(c)){c.track=ov;c.p=Object.assign({x:50,y:50,scale:40,op:100,vol:c.p.vol??100},c.p)}
    c.p.crop=a>r?{l:0,r:0,t:(1-r/a)*50,b:(1-r/a)*50}:{l:(1-a/r)*50,r:(1-a/r)*50,t:0,b:0};
    c.p.scale=cw;c.p.x=cx+cw/2;c.p.y=cy+ch/2;c.p.rot=0;c.p.round=0;delete c.kf});
  commit();refresh();toast(T('split.done'));
}
/* ---------- logo sur toute la vidéo ---------- */
function logoAll(m){
  if(!m||m.type==='audio')return;const s=12,a=m.w&&m.h?m.h/m.w:1,hh=s*W/H*a/2,dur=Math.max(1,total());
  const c=placeFree(newClip({track:tk('over'),mid:m.id,start:0,dur:m.type==='video'?Math.min(dur,m.duration||dur):dur,p:{x:100-3-s/2,y:3+hh,scale:s,op:85,vol:0}}));
  clips.push(c);sel=c.id;msel.clear();commit();refresh();toast(T('mm.logoDone'));
}
$('#mlist').addEventListener('contextmenu',e=>{
  const card=e.target.closest('.card');if(!card)return;e.preventDefault();const m=mById(+card.dataset.mid);if(!m)return;
  showCtx([{title:m.name},{label:'mm.add',fn:()=>addFromMedia(m.id,false)},...(m.type!=='audio'?[{label:'mm.addOver',fn:()=>addFromMedia(m.id,true)},{label:'mm.logo',fn:()=>logoAll(m)}]:[]),'-',{label:'mm.remove',danger:true,fn:()=>removeMedia(m.id)}],e.clientX,e.clientY);
});
/* ---------- zoom rapide (« punch-in ») à la tête de lecture ---------- */
function punchIn(c,back){
  const k=c&&isVid(c)&&!c.gen&&c.mid?'p.tf.zoom':c&&isOvr(c)&&c.mid?'p.scale':null;if(!k){toast(T('punch.no'));return}
  const loc=clamp(time-c.start,0,c.dur);if(loc>c.dur-.3){toast(T('msg.playheadOnClip'));return}
  c.kf=c.kf||[];const base=snapKf(c,loc),z0=base.v[k],z1=Math.round(z0*1.3*10)/10;
  const put=(t,z)=>{t=Math.min(c.dur,t);let f=c.kf.find(x=>Math.abs(x.t-t)<.04);if(!f){f={t,v:{...base.v}};c.kf.push(f)}f.v[k]=z;f.e='out'};
  put(loc,z0);put(loc+.25,z1);if(back){put(loc+1.5,z1);put(loc+1.8,z0)}
  c.kf.sort((a,b)=>a.t-b.t);commit();refresh();toast(T('punch.done'));
}
/* ---------- copier / coller le style d'un clip (sans le texte, le média ni la vitesse) ---------- */
let styleClip=null;
const STYLE_SKIP=['text','rate','rev','chip','cleanOrig','cleanFrom','label','name','title','done','values','labels','end','pre','suf'];
function copyStyle(){const c=selClip();if(!c){toast(T('msg.selectClip'));return}const p=JSON.parse(JSON.stringify(c.p));STYLE_SKIP.forEach(k=>delete p[k]);styleClip={p,kind:kindOf(c),gen:c.gen||''};toast(T('style.copied'))}
function pasteStyle(){
  if(!styleClip){toast(T('style.none'));return}
  const g=selClips().filter(x=>!trk(x).lock&&kindOf(x)===styleClip.kind&&(x.gen||'')===styleClip.gen);if(!g.length){toast(T('style.none'));return}
  g.forEach(x=>Object.assign(x.p,JSON.parse(JSON.stringify(styleClip.p))));commit();refresh();toast(T('style.pasted',{count:g.length}));
}
/* ---------- remplacer le média d'un clip (réglages gardés) ---------- */
async function replaceMedia(c){
  if(!c||!c.mid)return;const old=mById(c.mid),ms=await importMedia(),m=ms&&ms[0];if(!m)return;
  if((old&&old.type==='audio')!==(m.type==='audio')){toast(T('repl.type'));return}
  await waitMeta([m]);const el=els.get(c.id);if(el&&el.pause)el.pause();els.delete(c.id);
  c.mid=m.id;c.in=0;if(m.type!=='image'&&m.duration)c.dur=Math.min(c.dur,m.duration/(c.p.rate||1));commit();refresh();toast(T('repl.done'));
}
/* ---------- même durée pour la sélection (les clips d'une même piste sont remis à la suite) ---------- */
function sameDur(v){
  v=clamp(+v||0,.1,3600);const g=selClips().filter(x=>!trk(x).lock);if(!g.length)return;
  for(const ti of new Set(g.map(c=>c.track))){const L=g.filter(c=>c.track===ti).sort((a,b)=>a.start-b.start);let t=L[0].start;
    for(const c of L){const m=c.mid&&mById(c.mid),mx=m&&m.type!=='image'&&m.duration?(m.duration-c.in)/(c.p.rate||1):Infinity;c.dur=Math.min(v,mx);c.start=t;t+=c.dur}}
  commit();refresh();toast(T('mdur.done',{count:g.length,sec:fmtN(v)}));
}
/* ---------- fondus d'ouverture / de fermeture du projet (image + son) ---------- */
function fadeProject(w){
  const vid=clips.filter(c=>isVid(c)).sort((a,b)=>a.start-b.start),T0=total();if(!vid.length)return;
  if(w==='in'){const c=vid[0];c.p.tin='black';c.p.tdur=Math.min(1,c.dur/2);clips.filter(c=>isAud(c)&&c.start<.05).forEach(c=>{c.p.afin=Math.max(c.p.afin||0,1)})}
  else{const c=vid.reduce((a,b)=>a.start+a.dur>=b.start+b.dur?a:b);c.p.tout='black';c.p.tdur=Math.min(1.2,c.dur/2);clips.filter(c=>isAud(c)&&c.start+c.dur>T0-.05).forEach(c=>{c.p.afout=Math.max(c.p.afout||0,1.5)})}
  commit();refresh();toast(T('fade.done'));
}
/* ---------- favoris de l'onglet Formes ---------- */
let wlFav=[];try{wlFav=JSON.parse(localStorage.getItem('dedcut-wl-fav')||'[]')||[]}catch(x){wlFav=[]}
const wlKey=x=>x.tpl?'tpl:'+x.tpl:x.shp!=null?'shp:'+x.shp:x.g+':'+(x.s||'')+':'+(x.n||'');
function wlToggleFav(x){const k=wlKey(x),i=wlFav.indexOf(k);if(i>=0)wlFav.splice(i,1);else wlFav.push(k);try{localStorage.setItem('dedcut-wl-fav',JSON.stringify(wlFav))}catch(e){}renderWL()}

/* ---------- boutons & clavier ---------- */`);

/* ===== branchements ===== */
// favoris : catégorie en tête + clic droit + étoile
rep("  $('#wcats').innerHTML=['all',...WCATS].map(", "  const cats0=wlFav.length?['fav',...WCATS]:WCATS;if(wlCat==='fav'&&!wlFav.length)wlCat='all';\n  $('#wcats').innerHTML=['all',...cats0].map(");
rep("  const item=i=>`<button data-wl=\"${i}\" title=\"${esc(wlName(WLIB[i]))}\">", "  const item=i=>`<button data-wl=\"${i}\" class=\"${wlFav.includes(wlKey(WLIB[i]))?'fav':''}\" title=\"${esc(wlName(WLIB[i]))}\">");
rep("  L.innerHTML=(wlCat==='all'?WCATS:[wlCat]).filter(k=>k!=='stick').map(cat=>`<h3>${T('wcat.'+cat)}</h3><div class=\"filt\">${WLIB.map((x,i)=>x.c===cat?item(i):'').join('')}</div>`).join('');",
    "  L.innerHTML=(wlCat==='all'?cats0:[wlCat]).filter(k=>k!=='stick').map(cat=>`<h3>${T('wcat.'+cat)}</h3><div class=\"filt\">${WLIB.map((x,i)=>(cat==='fav'?wlFav.includes(wlKey(x)):x.c===cat)?item(i):'').join('')}</div>`).join('');");
rep("$('#wlq').addEventListener('input',()=>renderWL());", "$('#wlq').addEventListener('input',()=>renderWL());\n$('#wlist').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-wl]');if(!b)return;e.preventDefault();const x=WLIB[+b.dataset.wl];showCtx([{title:wlName(x)},{label:wlFav.includes(wlKey(x))?'fav.remove':'fav.add',fn:()=>wlToggleFav(x)}],e.clientX,e.clientY)});");
// clic droit sur un clip : zoom rapide, style, remplacer
rep("  if(isText(c))items.push({label:T('tts.fromText'),fn:()=>ttsMake(c.p.text,c.start)});",
    "  if(isText(c))items.push({label:T('tts.fromText'),fn:()=>ttsMake(c.p.text,c.start)});\n  if(visual&&c.mid)items.push({label:T('punch.stay'),fn:()=>{seek(tAt);punchIn(c,false)}},{label:T('punch.back'),fn:()=>{seek(tAt);punchIn(c,true)}});\n  items.push({label:T('style.copy'),key:kbLabel('copyStyle'),fn:copyStyle},{label:T('style.paste'),key:kbLabel('pasteStyle'),off:!styleClip,fn:pasteStyle});\n  if(c.mid)items.push({label:T('repl.menu'),fn:()=>replaceMedia(c)});\n  items.push('-');");
rep("  {id:'group',n:'grp.group',d:['ctrl+g'],f:()=>groupSel()},", "  {id:'group',n:'grp.group',d:['ctrl+g'],f:()=>groupSel()},\n  {id:'copyStyle',n:'style.copy',d:['ctrl+shift+c'],f:()=>copyStyle()},\n  {id:'pasteStyle',n:'style.paste',d:['ctrl+shift+v'],f:()=>pasteStyle()},");
// bandeau de la sélection : écran partagé + même durée
rep("<button data-act=\"mnone\">${T('msel.none')}</button></div></div>`)}",
    "<button data-act=\"mnone\">${T('msel.none')}</button></div><div class=\"msplit\"><b>${T('split.title')}</b><div class=\"pre\" style=\"margin:4px 0 0\">${Object.keys(SPLITS).map(k=>`<button data-split=\"${k}\">${T('split.'+k)}</button>`).join('')}</div></div><div class=\"mdur\"><label>${T('mdur.label')}</label><input type=\"number\" id=\"mselDur\" min=\"0.1\" step=\"0.1\" value=\"${fmtN(selClip()?selClip().dur:3)}\"><button data-act=\"mdur\">${T('mdur.apply')}</button></div></div>`)}");
rep("silence:()=>cutSilences(c),", "silence:()=>cutSilences(c),mdur:()=>sameDur($('#mselDur').value),");
rep("  if(d.vcat){vCat=d.vcat;renderInspector();return}", "  if(d.vcat){vCat=d.vcat;renderInspector();return}\n  if(d.split){splitScreen(d.split);return}");
// panneau Projet : fondus
rep("  <div class=\"sec\"><h4>${T('proj.quickFormat')}</h4>", "  <div class=\"sec\"><h4>${T('fade.title')}</h4><div class=\"pre\" style=\"margin:0\"><button data-pact=\"fadein\">${T('fade.in')}</button><button data-pact=\"fadeout\">${T('fade.out')}</button></div></div>\n  <div class=\"sec\"><h4>${T('proj.quickFormat')}</h4>");
rep("  if(d.pact==='keys'){openKeys();return}", "  if(d.pact==='keys'){openKeys();return}\n  if(d.pact==='fadein'||d.pact==='fadeout'){fadeProject(d.pact==='fadein'?'in':'out');return}");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.msplit')) {
  css += `
/* bandeau de sélection : écran partagé + même durée */
.mselbar .msplit{margin-top:10px;font-size:12px}
.mselbar .mdur{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px}
.mselbar .mdur label{flex:1}
.mselbar .mdur input{width:70px}
/* favoris */
#wlist .filt button.fav i::after{content:"★";position:absolute;right:4px;top:2px;color:#facc15;font-size:13px;text-shadow:0 1px 2px #000}
#wlist .filt button i{position:relative}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.24 : 9 nouveautés');

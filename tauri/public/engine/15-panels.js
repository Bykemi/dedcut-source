/* ---------- bibliothèque : onglets, effets, transitions, filtres, texte, stickers ---------- */
const FXPRE={
  vhs:{n:'txs.vhs',a:['rgb','noise','scan','flicker','vig','vhstrack']},
  oldtv:{n:'fxpre.oldTv',a:['scan','noise','flicker','vig','gray']},
  silent:{n:'fxpre.silentFilm',a:['gray','scratch','flicker','vig','noise']},
  nbgrain:{n:'fxpre.bwGrain',a:['gray','noise','vig']},
  retro:{n:'fxpre.retro',a:['sepia','vig','noise']},
  reve:{n:'fxpre.dream',a:['bloom','vig','pulse']},
  choc:{n:'fxpre.shock',a:['shake','flicker','rgb']},
  clip:{n:'fxpre.musicVideo',a:['rgb','pulse','strobe']},
  cyber:{n:'fxpre.cyber',a:['slices','rgb','scan']},
  party:{n:'fxpre.party',a:['confetti','sparkle','pulse']},
  love:{n:'fxpre.love',a:['hearts','bloom','leak']},
  winter:{n:'fxpre.winter',a:['snow','bloom']},
  hwnight:{n:'fxpre.hwnight',a:['hwmoon','hwbats','hwmist']},
  hwparty:{n:'fxpre.hwparty',a:['hwpumpkins','hwcandy','hwbats']},
  hwmonster:{n:'fxpre.hwmonster',a:['hwzombie','hwslime','hweyes']},
  aucozy:{n:'fxpre.aucozy',a:['aufire','aulights','austeam']},
  aurainy:{n:'fxpre.aurainy',a:['audrizzle','aupuddle','vig']},
  aufeast:{n:'fxpre.aufeast',a:['fireworks','glitter','bloom']},
  storm:{n:'fxpre.storm',a:['rain','flicker','vig']},
  vlog:{n:'fxpre.vlog',a:['handheld','zoomin']},
  magic:{n:'fxpre.magic',a:['sparkle','bloom','leak']},
  cinepro:{n:'fxpre.cinePro',a:['letterbox','lens','halation','vig']},
  film35:{n:'fxpre.film35',a:['halation','noise','vig','flicker']},
  neonclip:{n:'fxpre.neonClip',a:['neon','zoompunch','rgb']},
  gaming:{n:'fxpre.retroGaming',a:['dither','crt']},
  comic:{n:'fxpre.comic',a:['halftone','poster']},
  sketchy:{n:'fxpre.animatedSketch',a:['sketch','handheld']},
  mini:{n:'fxpre.miniature',a:['tiltshift','sharpen']},
  hyper:{n:'fxpre.hyperspace',a:['warp','zoomblur','prism']},
  autumn:{n:'fxpre.autumn',a:['leaves','leak']},
  spring:{n:'fxpre.spring',a:['petals','bloom']},
  campfire:{n:'fxpre.campfire',a:['embers','filmburn','vig']},
  mystery:{n:'fxpre.mystery',a:['fog','vig','flicker']},
  night:{n:'fxpre.nightParty',a:['disco','sparkle','zoompunch']},
  action:{n:'fxpre.action',a:['impact','whip','motionblur']},
  dreamy:{n:'fxpre.dreamy',a:['dust','halation','tiltshift']},
  portraitpro:{n:'fxpre.portraitPro',a:['bgblur','vig']},
  stickerfx:{n:'fxpre.sticker',a:['outline','pulse']},
  concert:{n:'fxpre.concert',a:['lasers','neonline','bggray']},
  birthday:{n:'fxpre.birthday',a:['balloons','confetti','glitter']},
  spy:{n:'fxpre.spy',a:['nightvision','scan','noise']},
  mirrorlake:{n:'fxpre.mirrorLake',a:['reflect','bloom']},
  starnight:{n:'fxpre.starryNight',a:['starry','vig','bloom']},
  toon:{n:'fxpre.toon',a:['cartoon','sparkle']},
  painting:{n:'fxpre.painting',a:['watercolor','leak']},
  hologram:{n:'fxpre.hologram',a:['pholo','scan']},
  stage:{n:'fxpre.stage',a:['spot','sparkle']},
  popstar:{n:'fxpre.popstar',a:['bgcolor','psticker']},
  space:{n:'fxpre.space',a:['bgspace','aura']},
  cutie:{n:'fxpre.cutie',a:['fcblush','fcsparkle','fchearts']},
  royal:{n:'fxpre.royal',a:['fccrown','fcsparkle','glitter']},
  kitty:{n:'fxpre.kitty',a:['fccat','fcblush']},
  cool:{n:'fxpre.cool',a:['fcglasses','fczoom']},
  none:{n:'fxpre.none',a:[]}
};
function showTab(t){
  if(t==='rec'||t==='live'){setMode(t);return}
  $$('#rail button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  $$('.tab').forEach(d=>d.hidden=d.id!=='t-'+t);
  if(t==='rec'&&!recState){loadSources();loadMics();loadCams();camPreview()}else{stopMeter();stopCamPrev()}
  if(t==='audio'){voMics();ttsLoad()}
  if(t==='text')renderTextTab();
  if(t==='stick')renderWL();
}
/* barre d'outils de gauche : repliable et réorganisable (préférence de chaque personne, gardée sur ce PC) */
const RAIL_DEF=[...$$('#rail [data-tab]')].map(b=>b.dataset.tab);
let rDrag=null,rSuppress=false;
function railPref(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}return null}
function applyRailOrder(list){const nav=$('#rail');for(const t of list){const b=nav.querySelector('[data-tab="'+t+'"]');if(b)nav.appendChild(b)}}
function railTitles(){$$('#rail [data-tab]').forEach(b=>{b.title=b.textContent.trim()+' — '+T('rail.reorderTip')})}
function setRailCompact(on){
  $('#left').classList.toggle('railmini',on);railPref('dedcut-rail-mini',on?'1':'0');
  const t=$('#railToggle');t.textContent=on?'▾':'▴';t.title=T(on?'rail.expand':'rail.collapse');
}
try{const o=JSON.parse(railPref('dedcut-rail-order')||'null');if(Array.isArray(o))applyRailOrder([...o,...RAIL_DEF.filter(t=>!o.includes(t))])}catch(e){}
setRailCompact(railPref('dedcut-rail-mini')==='1');railTitles();
window.addEventListener('dedcut-lang',()=>{railTitles();setRailCompact($('#left').classList.contains('railmini'))});
$('#railToggle').onclick=()=>setRailCompact(!$('#left').classList.contains('railmini'));
$('#rail').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-tab]');if(!b||e.button!==0)return;rDrag={b,x0:e.clientX,y0:e.clientY,moved:false,t:null}});
addEventListener('pointermove',e=>{
  if(!rDrag)return;if(!rDrag.moved&&Math.hypot(e.clientX-rDrag.x0,e.clientY-rDrag.y0)<6)return;
  if(!rDrag.moved){rDrag.moved=true;rDrag.b.classList.add('rdrag')}
  const el=document.elementFromPoint(e.clientX,e.clientY),tb=el&&el.closest('#rail [data-tab]');
  $$('#rail [data-tab]').forEach(x=>x.classList.remove('rdropb','rdropa'));rDrag.t=null;
  if(tb&&tb!==rDrag.b){const r=tb.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;tb.classList.add(after?'rdropa':'rdropb');rDrag.t=tb;rDrag.after=after}
});
addEventListener('pointerup',()=>{
  const d=rDrag;rDrag=null;if(!d)return;
  d.b.classList.remove('rdrag');$$('#rail [data-tab]').forEach(x=>x.classList.remove('rdropb','rdropa'));
  if(!d.moved)return;rSuppress=true;setTimeout(()=>{rSuppress=false},60);
  if(d.t){if(d.after)d.t.after(d.b);else d.t.before(d.b);railPref('dedcut-rail-order',JSON.stringify([...$$('#rail [data-tab]')].map(x=>x.dataset.tab)))}
});
$('#rail').addEventListener('contextmenu',e=>{
  e.preventDefault();const mini=$('#left').classList.contains('railmini');
  showCtx([{label:T(mini?'rail.expand':'rail.collapse'),fn:()=>setRailCompact(!mini)},{label:T('rail.resetOrder'),fn:()=>{applyRailOrder(RAIL_DEF);railPref('dedcut-rail-order','')}}],e.clientX,e.clientY);
});
$('#rail').addEventListener('click',e=>{if(rSuppress)return;const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab)});
/* ---------- disposition des panneaux : ordre libre (Bibliothèque, Vidéo, Propriétés) + largeur des côtés ----------
   préférence de chaque personne, gardée sur ce PC (localStorage dedcut-layout / dedcut-pw) */
const PANELS={left:'#left',stage:'#stage',insp:'#insp'},PANEL_N={left:'layout.library',stage:'layout.video',insp:'layout.props'},PANEL_I={left:'▤',stage:'▶',insp:'☰'};
const LAYOUT_DEF=['left','stage','insp'],PW_DEF={left:304,insp:322};
let layout=LAYOUT_DEF.slice(),pw={...PW_DEF},tlTop=railPref('dedcut-tltop')==='1';
try{
  const o=JSON.parse(railPref('dedcut-layout')||'null');if(Array.isArray(o)&&o.length===3&&LAYOUT_DEF.every(k=>o.includes(k)))layout=o;
  const w=JSON.parse(railPref('dedcut-pw')||'null');if(w)pw={left:clamp(+w.left||304,220,600),insp:clamp(+w.insp||322,240,600)};
}catch(e){}
const colrz=[0,1].map(b=>{const d=document.createElement('div');d.className='colrz';d.dataset.b=b;d.title=T('layout.resizeTip');$('main').appendChild(d);return d});
const docked=()=>layout.filter(k=>!(window.dedcutDetached&&dedcutDetached.has(k))),fluidOf=v=>v.includes('stage')?'stage':v.includes('left')?'left':v[0];
function placeResizers(){
  const m=$('main').getBoundingClientRect(),v=docked();
  colrz.forEach((d,b)=>{d.hidden=b>=v.length-1;if(d.hidden)return;const a=$(PANELS[v[b]]).getBoundingClientRect(),c=$(PANELS[v[b+1]]).getBoundingClientRect();d.style.left=((a.right+c.left)/2-m.left-5)+'px'});
}
function applyLayout(save){
  document.body.classList.toggle('tl-top',tlTop);
  const v=docked(),fl=fluidOf(v);
  v.forEach((k,i)=>{$(PANELS[k]).style.order=i});
  $('main').style.gridTemplateColumns=v.map(k=>k===fl?'minmax(320px,1fr)':pw[k]+'px').join(' ')||'1fr';
  placeResizers();requestAnimationFrame(placeResizers);
  if(save){railPref('dedcut-layout',JSON.stringify(layout));railPref('dedcut-pw',JSON.stringify(pw));railPref('dedcut-tltop',tlTop?'1':'0')}
}
addEventListener('resize',()=>requestAnimationFrame(placeResizers));
let lrz=null;
colrz.forEach(d=>{
  d.addEventListener('pointerdown',e=>{if(e.button!==0)return;const b=+d.dataset.b,v=docked(),fl=fluidOf(v),l=v[b],r=v[b+1];lrz={d,x0:e.clientX,k:l!==fl?l:r,sign:l!==fl?1:-1,w0:pw[l!==fl?l:r]};d.classList.add('on');d.setPointerCapture(e.pointerId);e.preventDefault()});
  d.addEventListener('pointermove',e=>{if(!lrz||lrz.d!==d)return;pw[lrz.k]=clamp(Math.round(lrz.w0+lrz.sign*(e.clientX-lrz.x0)),lrz.k==='left'?220:240,600);applyLayout(false)});
  d.addEventListener('pointerup',()=>{if(!lrz)return;lrz.d.classList.remove('on');lrz=null;applyLayout(true)});
  d.addEventListener('dblclick',()=>{pw={...PW_DEF};applyLayout(true)});
});
function renderLayoutPick(){
  const perms=[['left','stage','insp'],['insp','stage','left'],['left','insp','stage'],['insp','left','stage'],['stage','left','insp'],['stage','insp','left']];
  $('#layoutPick').innerHTML='<div class="lpt">'+T('layout.title')+'</div><div class="lpg">'+
    perms.map(p=>'<button data-lay="'+p.join(',')+'" class="'+(p.join()===layout.join()?'on':'')+'" title="'+p.map(k=>T(PANEL_N[k])).join(' · ')+'">'+p.map(k=>'<i class="'+k+'">'+PANEL_I[k]+'</i>').join('')+'</button>').join('')+
    '</div><div class="lpl">'+LAYOUT_DEF.map(k=>'<span><b class="'+k+'">'+PANEL_I[k]+'</b> '+T(PANEL_N[k])+'</span>').join('')+'</div>'+
    '<div class="lpt" style="margin-top:12px">'+T('layout.timeline')+'</div><div class="seg lptl"><button data-tlpos="bottom" class="'+(tlTop?'':'on')+'">'+T('layout.tlBottom')+'</button><button data-tlpos="top" class="'+(tlTop?'on':'')+'">'+T('layout.tlTop')+'</button></div>'+
    (window.dedcutDetachHTML?dedcutDetachHTML():'')+
    '<div class="hint" style="margin:8px 0">'+T('layout.hint')+'</div><button class="sm" data-lay="reset">'+T('layout.reset')+'</button>';
}
$('#bLayout').onclick=e=>{const p=$('#layoutPick'),r=e.currentTarget.getBoundingClientRect();renderLayoutPick();p.hidden=!p.hidden;p.style.top=(r.bottom+6)+'px';p.style.left=Math.max(8,Math.min(innerWidth-290,r.right-270))+'px'};
$('#layoutPick').addEventListener('click',e=>{
  const tp=e.target.closest('[data-tlpos]');if(tp){tlTop=tp.dataset.tlpos==='top';applyLayout(true);renderLayoutPick();return}
  const b=e.target.closest('[data-lay]');if(!b)return;
  if(b.dataset.lay==='reset'){layout=LAYOUT_DEF.slice();pw={...PW_DEF};tlTop=false}else layout=b.dataset.lay.split(',');
  applyLayout(true);renderLayoutPick();
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#layoutPick,#bLayout'))$('#layoutPick').hidden=true});
applyLayout(false);
const EMO=['😂','🤣','😍','🔥','💯','👍','👏','🙏','😎','🤯','😱','😭','🥳','😅','🙄','😤','❤️','💔','⭐','✨','⚡','💥','💀','👀','🎉','🎮','🏆','🎯','🎵','📢','✅','❌','⚠️','➡️','👉','💪'];
function buildLib(){
  renderEffects();
  renderTransitions();
  renderFilters();
  renderTextTab();
  $('#emolist').innerHTML=EMO.map(e=>`<button data-emo="${e}">${e}</button>`).join('');
}
/* ---------- onglet Texte : styles et animations, vignettes dessinées par le vrai moteur de texte ---------- */
let txCat='all',txAk='in',txThumbs=null,txAnim=null,txFontsP=null,txFontsOk=false;
const TX_S=160,TX_DUR=2.6;
// fond des vignettes : la photo d'exemple, floutée et assombrie (les contours noirs comme les textes blancs restent visibles)
let txPhoto=null;
function txBg(g,S){
  if(txPhoto&&txPhoto.ok){if(!txPhoto.c||txPhoto.c.width!==S){const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');x.filter='blur(4px) brightness(.55) saturate(.9)';x.drawImage(txPhoto,-12,-12,S+24,S+24);x.filter='none';const v=x.createRadialGradient(S/2,S/2,S*.2,S/2,S/2,S*.75);v.addColorStop(0,'rgba(10,9,16,0)');v.addColorStop(1,'rgba(10,9,16,.55)');x.fillStyle=v;x.fillRect(0,0,S,S);txPhoto.c=c}g.drawImage(txPhoto.c,0,0);return}
  const gr=g.createLinearGradient(0,0,S,S);gr.addColorStop(0,'#3a3746');gr.addColorStop(1,'#1c1a24');g.fillStyle=gr;g.fillRect(0,0,S,S);
}
function txSample(p){const s=Object.assign(TBASE(),p);delete s.sz;delete s.y;return s}
/* dessine le texte d'exemple : la taille s'adapte à la vignette */
const txCv=document.createElement('canvas'),txCvG=txCv.getContext('2d',{willReadFrequently:true}),txTones=new Map();
function txFrame(g,S,st,t,dur,word){
  const sv=[W,H];W=S;H=S;
  try{
    if(txCv.width!==S||txCv.height!==S){txCv.width=txCv.height=S}
    txCvG.setTransform(1,0,0,1,0,0);txCvG.globalAlpha=1;txCvG.filter='none';txCvG.globalCompositeOperation='source-over';txCvG.clearRect(0,0,S,S);
    const p=Object.assign({},st,{text:word,x:50,y:50});
    g.save();g.font=`${p.italic?'italic ':''}${p.bold===false?'400':'900'} 100px "${p.font==='snd.impact'?'Impact':p.font||'Arial Black'}", sans-serif`;if('letterSpacing' in g)g.letterSpacing='0px';
    const w=g.measureText(p.caps?word.toUpperCase():word).width;g.restore();
    p.size=Math.max(10,Math.min(S*.26,S*.62*100/Math.max(1,w+(p.ls||0)*word.length*.6)));p.ls=(p.ls||0)*p.size/150;
    drawText({id:-7,start:0,dur,p},t,txCvG);
    // fond assorti au style (calculé une fois par style : il ne change pas pendant l'aperçu animé)
    const key=JSON.stringify(st)+'|'+word;let tone=txTones.get(key);if(!tone){tone=toneOf(txCvG,S,S);txTones.set(key,tone)}
    g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.filter='none';g.globalCompositeOperation='source-over';wlBg(g,S,tone);g.drawImage(txCv,0,0);g.restore();
  }finally{W=sv[0];H=sv[1]}
}
function txThumb(st,t,dur,word){const c=document.createElement('canvas');c.width=c.height=TX_S;txFrame(c.getContext('2d'),TX_S,st,t,dur,word);return c.toDataURL('image/jpeg',.9)}
const txAnimStyle=()=>txSample({shadow:true});
function txAnimP(w,k){const p=txAnimStyle();p[{in:'anim',out:'aout',loop:'aloop'}[w]]=k;return p}
function txAnimT(w,k){return k==='none'?1:w==='in'?(k==='type'||k==='typec'?.12:k==='letters'||k==='rise'?.22:k==='drop'?.18:.16):w==='out'?TX_DUR-.18:.7}
/* fabrique des vignettes par petits paquets pour ne pas figer l'interface ; done(clé, image) pose chaque vignette dès qu'elle est prête */
function thumbJobs(jobs,done,alive){let i=0;const step=()=>{if(!alive())return;const t0=performance.now();while(i<jobs.length&&performance.now()-t0<10){const[k,f]=jobs[i++];try{done(k,f())}catch(err){console.error(err)}}if(i<jobs.length)setTimeout(step,0)};setTimeout(step,0)}
function textThumbs(){
  if(!txPhoto||!txPhoto.done)return; // la photo de fond arrive : les vignettes seront faites à ce moment-là
  // les polices livrées utilisées par les styles doivent être chargées avant de dessiner les vignettes
  if(!txFontsP){txFontsP=loadFonts(Object.values(TPRE).map(x=>x.s.font).filter(Boolean)).then(()=>{txThumbs=null;txFontsOk=true;renderTextTab()})}
  if(!txFontsOk)return;
  const lang=document.documentElement.lang||'';if(txThumbs&&txThumbs.lang===lang)return;
  const mine={lang};txThumbs=mine;const word=T('txt.sample'),jobs=[];
  for(const k of Object.keys(TPRE))jobs.push(['s:'+k,()=>txThumb(txSample(TPRE[k].s),1.3,TX_DUR,word)]);
  for(const w of Object.keys(TAN))for(const k of TAN[w])jobs.push([w+':'+k,()=>txThumb(txAnimP(w,k),txAnimT(w,k),TX_DUR,word)]);
  thumbJobs(jobs,(key,url)=>{mine[key]=url;const[w,k]=key.split(':'),el=w==='s'?$(`#txlist [data-tpl="${k}"] i`):$(`#txalist [data-tan="${k}"][data-w="${w}"] i`);if(el)el.style.backgroundImage=`url(${url})`},()=>txThumbs===mine);
}
function txMode(m){
  $$('#txMode [data-txm]').forEach(b=>b.classList.toggle('on',b.dataset.txm===m));
  $('#txStyle').hidden=m!=='style';$('#txAnim').hidden=m!=='anim';$('#txSubs').hidden=m!=='subs';
  renderTextTab();
}
function renderTextTab(){
  if(!$('#txlist'))return;
  if(!txPhoto){txPhoto=new Image();txPhoto.onload=txPhoto.onerror=e=>{txPhoto.ok=e.type==='load';txPhoto.done=true;txThumbs=null;renderTextTab()};txPhoto.src='filter-sample.jpg'}
  if(!$('#t-text').hidden)textThumbs();
  const th=k=>txThumbs&&txThumbs[k]?` style="background-image:url(${txThumbs[k]})"`:'';
  $('#txcats').innerHTML=['all',...Object.keys(TXT_CATS)].map(k=>`<button data-txcat="${k}" class="${k===txCat?'on':''}">${T(k==='all'?'lookcat.all':'txcat.'+k)}</button>`).join('');
  const item=k=>`<button data-tpl="${k}"><i${th('s:'+k)}></i><span>${T(TPRE[k].n)}</span></button>`;
  $('#txlist').innerHTML=txCat==='all'
    ?Object.keys(TXT_CATS).map(cat=>`<h3>${T('txcat.'+cat)}</h3><div class="filt">${TXT_CATS[cat].map(item).join('')}</div>`).join('')
    :`<div class="filt">${TXT_CATS[txCat].map(item).join('')}</div>`;
  $$('#txAk [data-txa]').forEach(b=>b.classList.toggle('on',b.dataset.txa===txAk));
  $('#txalist').innerHTML=TAN[txAk].map(k=>`<button data-tan="${k}" data-w="${txAk}"><i${th(txAk+':'+k)}></i><span>${tanName(txAk,k)}</span></button>`).join('');
  syncText();
}
function syncText(){
  const c=selClip(),ok=!!c&&isText(c),p=ok?c.p:{};
  const tg=$('#txTgt');if(tg){tg.classList.toggle('ok',ok);tg.textContent=ok?T('txt.target',{name:clipName(c)}):T('txt.targetHint')}
  $$('#txalist [data-tan]').forEach(b=>{const v=p[{in:'anim',out:'aout',loop:'aloop'}[b.dataset.w]]||'none';b.classList.toggle('on',ok&&v===b.dataset.tan)});
}
/* survol : la vignette joue l'animation (entrée → tenue → sortie, ou la boucle) */
function txHover(b){
  txStop();if(!txThumbs)return;const i=b.querySelector('i');if(!i)return;
  let st,w=b.dataset.w;
  if(b.dataset.tpl)st=txSample(TPRE[b.dataset.tpl].s);else st=txAnimP(w,b.dataset.tan);
  const c=document.createElement('canvas');c.width=c.height=TX_S;c.className='fxlive';i.appendChild(c);const g=c.getContext('2d'),word=T('txt.sample'),t0=performance.now();let last=0;
  const span=w==='in'?1.6:w==='out'?1.4:TX_DUR+.4;
  const loop=now=>{if(!txAnim||txAnim.c!==c)return;if(now-last>33){last=now;const e=((now-t0)/1000)%span;
    const t=w==='out'?Math.min(TX_DUR,TX_DUR-1.2+e):w==='in'?Math.min(e,TX_DUR-.6):w==='loop'?.6+e:Math.min(e,TX_DUR);txFrame(g,TX_S,st,t,w==='loop'?99:TX_DUR,word)}
    txAnim.raf=requestAnimationFrame(loop)};
  txAnim={c,raf:requestAnimationFrame(loop)};
}
function txStop(){if(!txAnim)return;cancelAnimationFrame(txAnim.raf);txAnim.c.remove();txAnim=null}
$('#t-text').addEventListener('mouseover',e=>{const b=e.target.closest('[data-tpl],[data-tan]');if(b&&(!txAnim||!b.contains(txAnim.c)))txHover(b)});
$('#t-text').addEventListener('mouseleave',txStop);
$('#t-text').addEventListener('mouseout',e=>{const b=e.target.closest('[data-tpl],[data-tan]');if(b&&!b.contains(e.relatedTarget))txStop()});
$('#txMode').addEventListener('click',e=>{const b=e.target.closest('[data-txm]');if(b)txMode(b.dataset.txm)});
$('#txcats').addEventListener('click',e=>{const b=e.target.closest('[data-txcat]');if(!b)return;txCat=b.dataset.txcat;renderTextTab()});
$('#txAk').addEventListener('click',e=>{const b=e.target.closest('[data-txa]');if(!b)return;txAk=b.dataset.txa;renderTextTab()});
$('#txalist').addEventListener('click',e=>{
  const b=e.target.closest('[data-tan]');if(!b)return;
  const key={in:'anim',out:'aout',loop:'aloop'}[b.dataset.w];let c=selClip();
  if(!c||!isText(c)){const n=textClip(null);n.p[key]=b.dataset.tan;add(n);return}
  c.p[key]=b.dataset.tan;commit();refresh();
});
function syncLib(){
  syncText();
  const c=selClip(),ok=!!c&&isVid(c),p=ok?c.p:{},fx=p.fx||{},ti=p.tin||'none',to=p.tout||'none';
  $$('.tgt').forEach(e=>{e.classList.toggle('ok',ok);e.textContent=ok?T('lib.target',{name:clipName(c)}):T('lib.targetHint')});
  $$('#fxlist [data-fx]').forEach(b=>b.classList.toggle('on',ok&&!!fx[b.dataset.fx]));
  $$('#fxpre [data-fxpre]').forEach(b=>{const a=(FXPRE[b.dataset.fxpre]||{a:[]}).a;b.classList.toggle('on',ok&&a.length>0&&FX.every(k=>!!fx[k]===a.includes(k)))});
  if($('#fxClear'))$('#fxClear').disabled=!ok||!FX.some(k=>fx[k]);
  $$('#trlist [data-tr]').forEach(b=>{const k=b.dataset.tr;b.classList.toggle('on',ok&&(k==='none'?ti==='none'&&to==='none':ti===k||to===k))});
  $('#fxAmt').value=p.amt??60;$('#fxAmtV').textContent=$('#fxAmt').value;
  $('#trDur').value=p.tdur||.5;$('#trDurV').textContent=$('#trDur').value+' s';
  const fc=filtClip(false),m=fc&&fc.mid&&mById(fc.mid);
  $$('.tgt2').forEach(e=>{e.classList.toggle('ok',!!fc);e.textContent=fc?T('lib.target',{name:clipName(fc)}):T('lib.targetVisualHint')});
  syncFilters(fc,m);
}
function targetClip(){
  let c=selClip();if(c&&isVid(c))return c;
  c=clips.filter(x=>isVid(x)&&time>=x.start&&time<x.start+x.dur).pop();
  if(!c){toast(T('msg.clickVideoFirst'));return null}
  sel=c.id;refresh();return c;
}
function filtClip(pick=true){
  let c=selClip();if(c&&(isVid(c)||(isOvr(c)&&c.mid)))return c;
  if(!pick)return null;
  return targetClip();
}
let prevT;
function previewTr(c,where){
  const d=c.p.tdur||.5;clearTimeout(prevT);pause();
  time=where==='out'?Math.max(0,c.start+c.dur-d-.6):Math.max(0,c.start-.3);
  play();prevT=setTimeout(()=>{if(playing&&!exporting)pause()},(d+1.1)*1000);
}
/* ---------- effets : vignettes sur la photo d'exemple, animées au survol ---------- */
let fxCat='all',fxThumbs=null,fxAnim=null;
const FX_T0=(()=>{for(let k=18;k<200;k++)if(hash(k)<.55)return k/9+.02;return 2.2})(); // instant où les effets « par à-coups » se voient
function fxFrame(g,S,img,set,t){
  const sv=[ctx,W,H];ctx=g;W=S;H=S;fxPreview=true;
  try{g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';g.drawImage(img,0,0,S,S);applyFX({fx:set,amt:80},t,t)}finally{ctx=sv[0];W=sv[1];H=sv[2];fxPreview=false}
}
const fxSet=keys=>Object.assign(noFx(),Object.fromEntries(keys.map(k=>[k,true])));
function effectThumbs(){
  if(fxThumbs)return;fxThumbs={};
  // effets « Personne » (contour, néon, aura, fonds) : montrés sur une photo où l'on voit toute la personne (public/person-sample.jpg)
  const go=(img,pimg)=>{
    // effets « Personne » : le modèle de détourage se charge en arrière-plan, puis les vignettes sont refaites
    if(!personSegM)personSeg().then(m=>{if(m&&fxThumbs&&fxThumbs.img){fxThumbs=null;renderEffects()}});
    if(!faceFxDet)faceFxLoad().then(d=>{if(d&&fxThumbs&&fxThumbs.img){fxThumbs=null;renderEffects()}});
    fxThumbs.img=img;fxThumbs.pimg=pimg||img;const S=160,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d',{willReadFrequently:true});
    for(const k of FX){fxFrame(g,S,fxSrc([k]),fxSet([k]),FX_T0);fxThumbs['fx:'+k]=c.toDataURL('image/jpeg',.82)}
    for(const[k,v]of Object.entries(FXPRE)){fxFrame(g,S,fxSrc(v.a),fxSet(v.a),FX_T0);fxThumbs['pre:'+k]=c.toDataURL('image/jpeg',.82)}
    renderEffects();
  };
  const ld=src=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=src});
  Promise.all([ld('filter-sample.jpg'),ld('person-sample.jpg')]).then(([a,p])=>go(a||fSample,p));
}
/* photo d'exemple d'un effet : celle de la personne en entier s'il touche à la personne, sinon la photo habituelle */
const fxSrc=keys=>keys.some(k=>PERSON_FX.includes(k))?fxThumbs.pimg:fxThumbs.img;
function renderEffects(){
  effectThumbs();
  const th=k=>fxThumbs&&fxThumbs[k]?` style="background-image:url(${fxThumbs[k]})"`:'';
  const cats=['all',...hwOrder(Object.keys(FX_CATS))];
  $('#fxcats').innerHTML=cats.map(k=>`<button data-fxcat="${k}" class="${k===fxCat?'on':''}">${T(k==='all'?'lookcat.all':FXCATN[k])}</button>`).join('');
  $('#fxpre').innerHTML=Object.entries(FXPRE).map(([k,v])=>`<button data-fxpre="${k}"><i${th('pre:'+k)}></i><span>${T(v.n)}</span></button>`).join('');
  const item=k=>`<button data-fx="${k}"><i${th('fx:'+k)}></i><span>${T(FXN[k])}</span></button>`;
  $('#fxlist').innerHTML=fxCat==='all'
    ?hwOrder(Object.keys(FX_CATS)).map(cat=>`<h3>${T(FXCATN[cat])}</h3>${cat==='beatfx'?`<p class="hint">${T('fx.beatHint')}</p>`:''}<div class="filt">${FX_CATS[cat].map(item).join('')}</div>`).join('')
    :`${fxCat==='beatfx'?`<p class="hint">${T('fx.beatHint')}</p>`:''}<div class="filt">${FX_CATS[fxCat].map(item).join('')}</div>`;
  syncLib();
}
/* survol : l'effet bouge dans sa vignette */
function fxHover(b){
  fxStop();if(!fxThumbs||!fxThumbs.img)return;
  const keys=b.dataset.fx?[b.dataset.fx]:(FXPRE[b.dataset.fxpre]||{a:[]}).a;if(!keys.length)return;
  const i=b.querySelector('i');if(!i)return;
  const S=160,c=document.createElement('canvas');c.width=c.height=S;c.className='fxlive';const g=c.getContext('2d',{willReadFrequently:true});i.appendChild(c);
  const set=fxSet(keys),t0=performance.now();let last=0;
  const src=fxSrc(keys),loop=now=>{if(!fxAnim||fxAnim.c!==c)return;if(now-last>66){last=now;fxFrame(g,S,src,set,FX_T0+(now-t0)/1000)}fxAnim.raf=requestAnimationFrame(loop)};
  fxAnim={c,raf:requestAnimationFrame(loop)};
}
function fxStop(){if(!fxAnim)return;cancelAnimationFrame(fxAnim.raf);fxAnim.c.remove();fxAnim=null}
$('#t-fx').addEventListener('mouseover',e=>{const b=e.target.closest('[data-fx],[data-fxpre]');if(b&&(!fxAnim||!b.contains(fxAnim.c)))fxHover(b)});
$('#t-fx').addEventListener('mouseleave',fxStop);
$('#t-fx').addEventListener('mouseout',e=>{const b=e.target.closest('[data-fx],[data-fxpre]');if(b&&!b.contains(e.relatedTarget))fxStop()});
$('#fxClear').onclick=()=>{const c=selClip();if(!c||!isVid(c))return;c.p.fx=noFx();commit();refresh()};
$('#t-fx').addEventListener('click',e=>{
  const cb=e.target.closest('[data-fxcat]');if(cb){fxCat=cb.dataset.fxcat;renderEffects();return}
  const b=e.target.closest('button');if(!b)return;
  const k=b.dataset.fx,pr=b.dataset.fxpre;if(!k&&!pr)return;
  const c=targetClip();if(!c)return;
  c.p.fx=c.p.fx||noFx();
  if(k)c.p.fx[k]=!c.p.fx[k];
  else{const f=noFx();FXPRE[pr].a.forEach(x=>f[x]=true);c.p.fx=f}
  commit();refresh();
});
let trWhere='in';
$('#trWhere').addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;trWhere=b.dataset.w;$$('#trWhere button').forEach(x=>x.classList.toggle('on',x===b))});
/* ---------- transitions : vignettes (photo d'exemple → même photo retournée en couleurs), animées au survol ---------- */
let trCat='all',trThumbs=null,trAnim=null;
const trL=document.createElement('canvas'),trLC=trL.getContext('2d',{willReadFrequently:true});
function trFrame(g,S,A,Bimg,type,q){
  const sv=[W,H];W=S;H=S;
  try{trL.width=trL.height=S;trLC.clearRect(0,0,S,S);trLC.drawImage(Bimg,0,0,S,S);g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';g.drawImage(A,0,0,S,S);g.restore();
    compose({q,type,isIn:true},'source-over',g,trL,trLC)}finally{W=sv[0];H=sv[1]}
}
/* 2e image des aperçus de transition, de secours si transition-sample.jpg manque : une scène différente de la photo (ciel bleu, collines, nuages),
   dessinée ici, pour bien voir le passage de l'une à l'autre sans teinter les vignettes */
function trSceneB(S){
  const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
  let sk=g.createLinearGradient(0,0,0,S*.62);sk.addColorStop(0,'#2563eb');sk.addColorStop(.55,'#60a5fa');sk.addColorStop(1,'#dbeafe');
  g.fillStyle=sk;g.fillRect(0,0,S,S);
  const sun=g.createRadialGradient(S*.78,S*.2,0,S*.78,S*.2,S*.22);sun.addColorStop(0,'rgba(255,253,230,1)');sun.addColorStop(.25,'rgba(255,244,190,.95)');sun.addColorStop(1,'rgba(255,244,190,0)');
  g.fillStyle=sun;g.fillRect(0,0,S,S);
  g.fillStyle='rgba(255,255,255,.92)';
  for(const[x,y,r]of[[.18,.2,.07],[.25,.17,.09],[.33,.21,.065],[.55,.32,.05],[.61,.29,.065],[.67,.33,.045]]){g.beginPath();g.arc(x*S,y*S,r*S,0,TAU);g.fill()}
  const hill=(y0,amp,ph,c1,c2)=>{g.beginPath();g.moveTo(0,S);for(let x=0;x<=S;x+=2)g.lineTo(x,y0*S+Math.sin(x/S*TAU*1.1+ph)*amp*S+Math.sin(x/S*TAU*2.7+ph*2)*amp*.35*S);g.lineTo(S,S);g.closePath();
    const gr=g.createLinearGradient(0,(y0-amp)*S,0,S);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fill()};
  hill(.58,.05,1.2,'#7aa6c2','#5b8db0');hill(.66,.06,2.4,'#4ade80','#16a34a');hill(.78,.05,.3,'#22c55e','#166534');
  g.strokeStyle='rgba(254,243,199,.85)';g.lineWidth=S*.035;g.lineCap='round';g.beginPath();g.moveTo(S*.42,S);g.quadraticCurveTo(S*.5,S*.86,S*.62,S*.79);g.stroke();
  for(let i=0;i<14;i++){const x=hash(i*3)*S,y=S*(.8+hash(i*3+1)*.18),r=S*(.012+hash(i*3+2)*.012);g.fillStyle=i%2?'#facc15':'#fef3c7';g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
  return c;
}
function transitionThumbs(){
  if(trThumbs)return;trThumbs={};
  const go=(img,bi)=>{
    const S=160,b=bi||trSceneB(S);
    trThumbs.A=img;trThumbs.B=b;
    const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d',{willReadFrequently:true});
    for(const k of Object.keys(TRN)){trFrame(g,S,img,b,k,k==='none'?1:({flip:.18,gridflip:.22,cube:.3,doorway:.25,tvoff:.18,black:.3,melt:.35,bounce:.35,pop:.4,circleclose:.45,zoomthrough:.45,uncover:.5})[k]??.5);trThumbs[k]=c.toDataURL('image/jpeg',.82)}
    renderTransitions();
  };
  // 2e image : la photo de plage (public/transition-sample.jpg) ; si elle manque, le paysage dessiné
  const ld=src=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=src});
  Promise.all([ld('filter-sample.jpg'),ld('transition-sample.jpg')]).then(([a,bi])=>go(a||fSample,bi));
}
function renderTransitions(){
  transitionThumbs();
  const th=k=>trThumbs&&trThumbs[k]?` style="background-image:url(${trThumbs[k]})"`:'';
  const item=k=>`<button data-tr="${k}"><i${th(k)}></i><span>${T(TRN[k])}</span></button>`;
  $('#trcats').innerHTML=['all',...Object.keys(TR_CATS)].map(k=>`<button data-trcat="${k}" class="${k===trCat?'on':''}">${T(k==='all'?'lookcat.all':TRCATN[k])}</button>`).join('');
  $('#trlist').innerHTML=trCat==='all'
    ?Object.keys(TR_CATS).map(cat=>`<h3>${T(TRCATN[cat])}</h3><div class="filt">${TR_CATS[cat].map(item).join('')}</div>`).join('')
    :`<div class="filt">${TR_CATS[trCat].map(item).join('')}</div>`;
  syncLib();
}
function trHover(b){
  trStop();if(!trThumbs||!trThumbs.B||b.dataset.tr==='none')return;const i=b.querySelector('i');if(!i)return;
  const S=160,c=document.createElement('canvas');c.width=c.height=S;c.className='fxlive';const g=c.getContext('2d',{willReadFrequently:true});i.appendChild(c);
  const k=b.dataset.tr,t0=performance.now();let last=0;
  const loop=now=>{if(!trAnim||trAnim.c!==c)return;if(now-last>50){last=now;const ph=((now-t0)/1000)%1.8;trFrame(g,S,trThumbs.A,trThumbs.B,k,Math.min(1,Math.max(0,(ph-.2)/1.2)))}trAnim.raf=requestAnimationFrame(loop)};
  trAnim={c,raf:requestAnimationFrame(loop)};
}
function trStop(){if(!trAnim)return;cancelAnimationFrame(trAnim.raf);trAnim.c.remove();trAnim=null}
$('#t-tr').addEventListener('mouseover',e=>{const b=e.target.closest('[data-tr]');if(b&&(!trAnim||!b.contains(trAnim.c)))trHover(b)});
$('#t-tr').addEventListener('mouseleave',trStop);
$('#t-tr').addEventListener('mouseout',e=>{const b=e.target.closest('[data-tr]');if(b&&!b.contains(e.relatedTarget))trStop()});
$('#t-tr').addEventListener('click',e=>{
  const cb=e.target.closest('[data-trcat]');if(cb){trCat=cb.dataset.trcat;renderTransitions();return}
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='trCross'){const c=targetClip();if(c)cross();return}
  const k=b.dataset.tr;if(!k)return;
  const c=targetClip();if(!c)return;
  if(trWhere!=='out')c.p.tin=k;if(trWhere!=='in')c.p.tout=k;
  c.p.tdur=c.p.tdur||.5;commit();refresh();
  if(k!=='none')previewTr(c,trWhere);
});
/* ---------- filtres : catégories, aperçus sur l'image du clip, intensité ---------- */
let fCat='all',fSrc='',fThumbs={};
const fSample=(()=>{ // image d'exemple : ciel, soleil, colline, visage (montre l'effet sur la peau, le ciel, la végétation)
  const c=document.createElement('canvas');c.width=c.height=120;const g=c.getContext('2d');
  let gr=g.createLinearGradient(0,0,0,120);gr.addColorStop(0,'#4f8fdc');gr.addColorStop(.55,'#f6b26b');gr.addColorStop(1,'#f6d28b');g.fillStyle=gr;g.fillRect(0,0,120,120);
  g.fillStyle='#fff3c4';g.beginPath();g.arc(92,30,13,0,7);g.fill();
  g.fillStyle='#3f8f3a';g.beginPath();g.moveTo(0,92);g.quadraticCurveTo(50,62,120,88);g.lineTo(120,120);g.lineTo(0,120);g.fill();
  g.fillStyle='#e8b293';g.beginPath();g.arc(42,70,20,0,7);g.fill();g.fillStyle='#3b2618';g.beginPath();g.arc(42,62,20,Math.PI,0);g.fill();
  g.fillStyle='#222';g.fillRect(34,70,4,4);g.fillRect(46,70,4,4);g.fillStyle='#b5525a';g.fillRect(37,80,10,3);
  return c})();
function lookThumb(src,k){
  const S=160,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),col=lookCol(k,100);
  const sw=src.naturalWidth||src.width,sh=src.naturalHeight||src.height,s=Math.max(S/sw,S/sh);
  g.filter=colFilter({col});g.drawImage(src,(S-sw*s)/2,(S-sh*s)/2,sw*s,sh*s);g.filter='none';
  // en miniature, le grain paraîtrait bien plus fort que sur la vraie vidéo : on l'atténue
  applyGrade(g,0,0,S,S,Object.assign({},col,{grain:(col.grain||0)*.4}),0);
  return c.toDataURL('image/jpeg',.85);
}
function renderFilters(){
  const cats=['all',...hwOrder(Object.keys(LOOK_CATS))];
  $('#fcats').innerHTML=cats.map(k=>`<button data-fcat="${k}" class="${k===fCat?'on':''}">${T(k==='all'?'lookcat.all':LOOK_CATS[k])}</button>`).join('');
  const item=k=>`<button data-filt="${k}"><i${fThumbs[k]?` style="background-image:url(${fThumbs[k]})"`:''}></i><span>${T(LOOKS[k].n)}</span></button>`;
  const keys=Object.keys(LOOKS);
  $('#filtlist').innerHTML=fCat==='all'
    ?hwOrder(Object.keys(LOOK_CATS)).map(cat=>`<h3>${T(LOOK_CATS[cat])}</h3><div class="filt">${keys.filter(k=>LOOKS[k].cat===cat).map(item).join('')}</div>`).join('')
    :`<div class="filt">${keys.filter(k=>LOOKS[k].cat===fCat).map(item).join('')}</div>`;
  syncFilters(filtClip(false));
}
/* aperçus : tous les filtres montrés sur la même photo (public/filter-sample.jpg), calculés une seule fois ;
   si la photo manque, image d'exemple dessinée */
function filterThumbs(){
  if(fSrc)return;fSrc='photo';
  const go=src=>{fThumbs={};for(const k of Object.keys(LOOKS))fThumbs[k]=lookThumb(src,k);renderFilters()};
  const im=new Image();im.onload=()=>go(im);im.onerror=()=>go(fSample);im.src='filter-sample.jpg';
}
function syncFilters(fc,m){
  if(m===undefined)m=fc&&fc.mid&&mById(fc.mid);
  filterThumbs();
  const look=fc&&fc.p.col&&fc.p.col.look,amt=fc&&fc.p.col&&fc.p.col.amt!=null?fc.p.col.amt:100;
  $$('#filtlist button').forEach(b=>b.classList.toggle('on',!!fc&&(look?b.dataset.filt===look:b.dataset.filt==='none'&&!hasGrade(fc.p.col)&&colFilter(fc.p)==='none')));
  $('#fAmtBox').hidden=!fc||!look||look==='none';
  $('#fAmt').value=amt;$('#fAmtV').textContent=Math.round(amt);
  $('#fAll').disabled=$('#fNone').disabled=!fc;
}
$('#t-filt').addEventListener('click',e=>{
  const cb=e.target.closest('[data-fcat]');if(cb){fCat=cb.dataset.fcat;renderFilters();return}
  const b=e.target.closest('[data-filt]');if(!b)return;
  const c=filtClip();if(!c)return;
  const amt=c.p.col&&c.p.col.look&&c.p.col.amt!=null?c.p.col.amt:100;
  c.p.col=b.dataset.filt==='none'?colDefaults():lookCol(b.dataset.filt,amt);commit();refresh();
});
$('#fAmt').oninput=e=>{const c=filtClip(false);if(!c||!c.p.col||!c.p.col.look)return;c.p.col=lookCol(c.p.col.look,+e.target.value);$('#fAmtV').textContent=e.target.value;render(time)};
$('#fAmt').onchange=()=>{if(filtClip(false)){commit();refresh()}};
$('#fNone').onclick=()=>{const c=filtClip(false);if(!c)return;c.p.col=colDefaults();commit();refresh()};
$('#fAll').onclick=()=>{
  const c=filtClip(false);if(!c)return;let n=0;
  clips.forEach(x=>{if(x!==c&&(isVid(x)||(isOvr(x)&&x.mid))&&!isText(x)&&(x.mid||x.gen)){x.p.col=JSON.parse(JSON.stringify(c.p.col||colDefaults()));n++}});
  commit();refresh();toast(T('look.appliedAll',{count:n+1}));
};
$('#fxAmt').oninput=e=>{const c=selClip();if(c&&isVid(c)){c.p.amt=+e.target.value;$('#fxAmtV').textContent=e.target.value}};
$('#fxAmt').onchange=()=>{if(selClip()){commit();renderInspector()}};
$('#trDur').oninput=e=>{const c=selClip();if(c&&isVid(c)){c.p.tdur=+e.target.value;$('#trDurV').textContent=e.target.value+' s'}};
$('#trDur').onchange=()=>{if(selClip()){commit();renderInspector()}};
$('#t-text').addEventListener('click',e=>{
  const b=e.target.closest('[data-tpl]');if(!b)return;
  const c=selClip();
  if(isText(c))applyTpl(c,b.dataset.tpl);else add(textClip(b.dataset.tpl));
});
$('#emolist').addEventListener('click',e=>{
  const b=e.target.closest('[data-emo]');if(!b)return;
  add(newClip({track:tk('over'),start:time,dur:2.5,p:Object.assign(TBASE(),{text:b.dataset.emo,size:Math.round(H/4),x:Math.round(25+Math.random()*50),y:Math.round(25+Math.random()*50),font:'Segoe UI Emoji',bold:false,anim:'pop'})}));
});
function setRate(c,v){
  const m=c&&c.mid&&mById(c.mid);
  if(!m||m.type==='image'){toast(T('msg.selectTimed'));return}
  const old=c.p.rate||1;c.dur=Math.max(.1,c.dur*old/v);scaleKf(c,old/v);c.p.rate=v;commit();refresh();
}
$('#subGo').onclick=()=>{
  const lines=$('#subTxt').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length){toast(T('msg.writeLine'));return}
  const c=selClip();let a=0,b=total();if(c){a=c.start;b=c.start+c.dur}
  if(b-a<.5){toast("Ajoute d'abord un clip dans la timeline");return}
  const w=lines.map(l=>Math.max(8,l.length)),sum=w.reduce((x,y)=>x+y,0);let t=a;
  const made=lines.map((l,i)=>{const d=(b-a)*w[i]/sum,cl=newClip({track:tk('over'),start:t,dur:d,p:Object.assign(TBASE(),{text:l,size:Math.round(H/20),x:50,y:86,font:'Segoe UI',bg:true,bgc:'#000000',cap:true})});t+=d;return cl});
  clips.push(...made);sel=made[0].id;commit();refresh();toast(T('text.subsCreated',{count:made.length}));
};

/* ---------- menu clic droit ---------- */
let clipboard=null;
function copyClip(){const g=selClips();if(!g.length){toast(T('msg.selectClip'));return}clipboard=JSON.stringify(g.length>1?g:g[0]);toast(g.length>1?T('msel.copied',{count:g.length}):T('msg.clipCopied'))}
function pasteClip(at){
  if(!clipboard){toast(T('msg.nothingToPaste'));return}
  const v=JSON.parse(clipboard),arr=Array.isArray(v)?v:[v],a=Math.min(...arr.map(x=>x.start));
  const made=arr.map(n=>{n.id=uid++;n.start=Math.max(0,at+(n.start-a));if(!tracks[n.track])n.track=tk(n.track===2?'audio':'video');clips.push(n);return n});regroup(made);
  sel=made[0].id;msel=new Set(made.slice(1).map(n=>n.id));commit();refresh();
}
function detachAudio(c){
  const au=placeFree(newClip({track:tk('audio'),mid:c.mid,start:c.start,dur:c.dur,in:c.in,p:{vol:c.p.vol??100,rate:c.p.rate||1,rev:!!c.p.rev}}));clips.push(au);if(!c.grp)c.grp=uid++;au.grp=c.grp; // vidéo et son restent groupés
  c.p.vol=0;commit();refresh();toast(T('msg.audioDetached'));
}
function toggleMute(c){
  if((c.p.vol??100)>0){c.p.volPrev=c.p.vol??100;c.p.vol=0}else c.p.vol=c.p.volPrev||100;
  commit();refresh();
}
const ctxEl=$('#ctx');
function hideCtx(){ctxEl.hidden=true}
function showCtx(items,x,y){
  ctxEl.innerHTML=items.map((it,i)=>it==='-'?'<div class="sep"></div>':it.swatches?`<div class="tt">${esc(T(it.label))}</div><div class="ctxsw">${it.swatches.map((c,j)=>`<button data-i="${i}" data-sw="${j}" class="${c?'':'none'}" style="${c?'background:'+c:''}"></button>`).join('')}</div>`:it.title?`<div class="tt">${esc(it.title)}</div>`:`<button data-i="${i}" class="${it.danger?'danger':''}" ${it.off?'disabled':''}><span>${esc(T(it.label))}</span><span class="hint">${it.key||''}</span></button>`).join('');
  ctxEl._items=items;ctxEl.hidden=false;
  const r=ctxEl.getBoundingClientRect();
  ctxEl.style.left=Math.max(4,Math.min(x,innerWidth-r.width-6))+'px';
  ctxEl.style.top=Math.max(4,Math.min(y,innerHeight-r.height-6))+'px';
}
ctxEl.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const it=ctxEl._items[+b.dataset.i];hideCtx();if(it&&it.fn)it.fn(b.dataset.sw!=null&&it.swatches?it.swatches[+b.dataset.sw]:undefined);
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#ctx'))hideCtx()},true);
addEventListener('keydown',e=>{if(e.key==='Escape')hideCtx()});
addEventListener('blur',hideCtx);addEventListener('resize',hideCtx);
$('#tls').addEventListener('scroll',hideCtx);$('#tls').addEventListener('scroll',drawWavesSoon);addEventListener('resize',drawWavesSoon);
$('#tli').addEventListener('contextmenu',e=>{
  e.preventDefault();
  const ce=e.target.closest('.clip'),tAt=Math.max(0,xToT(e));
  if(!ce){
    showCtx([
      {label:T('menu.pasteHere'),key:'Ctrl+V',off:!clipboard,fn:()=>pasteClip(tAt)},
      {label:T('menu.addTextHere'),fn:()=>add(textClip(null,tAt))},
      {label:T('menu.playheadHere'),fn:()=>seek(tAt)},
      {label:T('menu.markerHere'),key:'M',fn:()=>{time=tAt;toggleMarker()}},
      '-',
      {label:T('range.inHere'),key:kbLabel('rin'),fn:()=>setRange('in',tAt)},
      {label:T('range.outHere'),key:kbLabel('rout'),fn:()=>setRange('out',tAt)},
      {label:T('range.clear'),off:xin==null&&xout==null,fn:clearRange},
      '-',
      {label:T('gap.track'),off:trackAtY(e.clientY-$('#tli').getBoundingClientRect().top)==null,fn:()=>closeGaps(trackAtY(e.clientY-$('#tli').getBoundingClientRect().top))},
      {label:T('gap.all'),fn:()=>closeGaps(null)},
      '-',
      {label:T('chap.copy'),off:!markers.length,fn:copyChapters},
      {label:T('menu.clearMarkers'),off:!markers.length,danger:true,fn:()=>{markers=[];autosave();renderTL()}}
    ],e.clientX,e.clientY);
    return;
  }
  const c=clips.find(x=>x.id==ce.dataset.id);if(!c)return;
  if(!selIds().includes(c.id))msel.clear();sel=c.id;refresh();
  const m=c.mid&&mById(c.mid),hasSound=!!m&&m.type!=='image',visual=m&&m.type!=='audio';
  const items=[
    {title:clipName(c)},
    {label:'clipcol.title',swatches:['','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'],fn:col=>{for(const x of selClips()){if(col)x.lc=col;else delete x.lc}commit();renderTL()}},
    '-',
    {label:T('menu.splitHere'),key:'S',fn:()=>{seek(tAt);split()}},
    {label:T('grp.group'),key:kbLabel('group'),off:selClips().length<2,fn:groupSel},
    {label:T('grp.ungroup'),key:kbLabel('ungroup'),off:!c.grp,fn:ungroupSel},
    {label:T('mkcut.menu'),off:!markers.some(t=>t>c.start+.05&&t<c.start+c.dur-.05),fn:cutAtMarkers},
    {label:T('keys.duplicate'),key:'Ctrl+D',fn:dup},
    {label:T('menu.copy'),key:'Ctrl+C',fn:copyClip},
    {label:T('menu.pasteHere'),key:'Ctrl+V',off:!clipboard,fn:()=>pasteClip(tAt)},
    '-'
  ];
  if(m&&m.type==='video'&&isVid(c))items.push({label:T('menu.freezeHere'),fn:()=>{seek(tAt);freeze()}});
  if(m&&m.type!=='image'&&!c.gen)items.push({label:T('speed.reverse'),fn:()=>{c.p.rev=!c.p.rev;commit();refresh()}});
  if(visual)items.push({label:T('common.mirror'),fn:flipSel},{label:T('common.rotate90'),fn:rotSel});
  if(isText(c))items.push({label:T('tts.fromText'),fn:()=>ttsMake(c.p.text,c.start)});
  if(visual&&c.mid)items.push({label:T('punch.stay'),fn:()=>{seek(tAt);punchIn(c,false)}},{label:T('punch.back'),fn:()=>{seek(tAt);punchIn(c,true)}});
  items.push({label:T('style.copy'),key:kbLabel('copyStyle'),fn:copyStyle},{label:T('style.paste'),key:kbLabel('pasteStyle'),off:!styleClip,fn:pasteStyle},...(window.styleCtx?styleCtx(c):[]),...(window.lutCtx?lutCtx(c):[]),...(window.imgCtx?imgCtx(c,tAt):[]));
  if(c.mid)items.push({label:T('repl.menu'),fn:()=>replaceMedia(c)});
  items.push('-');
  items.push({label:T('menu.kfHere'),key:'K',fn:()=>{seek(tAt);toggleKf()}},'-');
  if(hasSound){
    if(m.type==='video'&&isVid(c))items.push({label:T('audio.detach'),fn:()=>detachAudio(c)});
    if(window.syncCtx)items.push(...syncCtx(c));
    if(isAud(c))items.push({label:T('loop.btn'),fn:()=>loopMusic(c)});
    items.push({label:(c.p.vol??100)>0?T('audio.mute'):T('audio.unmute'),fn:()=>toggleMute(c)},'-');
  }
  items.push(
    {label:T('menu.goStart'),fn:()=>seek(c.start)},
    {label:T('menu.goEnd'),fn:()=>seek(c.start+c.dur)},
    '-',
    {label:T('menu.trackUp'),fn:()=>moveTrackBy(c,-1)},{label:T('menu.trackDown'),fn:()=>moveTrackBy(c,1)},
    '-',
    {label:T('keys.ripple'),key:T('keys.shiftDel'),danger:true,fn:rippleDel},
    {label:T('keys.delete'),key:T('keys.del'),danger:true,fn:del}
  );
  showCtx(items,e.clientX,e.clientY);
});

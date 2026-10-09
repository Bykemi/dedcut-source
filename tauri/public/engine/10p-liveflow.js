/* ---------- Module Live, distribution, replay et automatisations (v4.43, priorités P4 à P6) ----------
   - ajouter / retirer une destination pendant le live sans couper les autres ;
   - délai de diffusion (5 s à 2 min), gardé en mémoire et vidé proprement à l'arrêt ;
   - durée du replay réglable, nom des fichiers d'enregistrement ;
   - automatisations : quand (alerte, commande, mot du chat, début / fin du live, minuteur, scène, raccourci)
     → alors (scène, montrer / cacher une source, son, replay, marqueur, enregistrement, message, compteur) ;
   - retard de l'image d'une webcam (synchro avec le son) ;
   - clés de stream chiffrées par Windows (DPAPI) dans les réglages, au lieu d'être écrites en clair. */

/* ---------- (1) destinations pendant le live ---------- */
async function lqDestLive(d,on){
  const H=O.live&&O.live.kind==='live'?O.live:null,V=O.vert||(O.live&&O.live.kind==='vert'?O.live:null);
  if(on){
    const tgt=d.vert?V:H;if(!d.url){toast(T('live.needUrl'));return}
    if(!tgt){if(d.vert&&H){await lvStart([d],false);return}toast(T('lq.d.restart'));return}
    if(tgt.dests.some(x=>x.id===d.id))return;
    try{await dedcutLive.start(d.id,d.url,d.key,d.vert?lvMeta(tgt):stMeta(tgt))}catch(e){toast(stDestName(d)+' : '+stLiveErr(e));return}
    if(O.live!==tgt&&O.vert!==tgt){dedcutLive.stop(d.id).catch(()=>{});return}
    const x={id:d.id,name:stDestName(d)+(d.vert?' 9:16':''),q:[],qBytes:0,sending:false,lastFlush:0,sent:0,prevSent:0,reconn:false,dead:false,congested:false,kbps_now:0};
    const us=Math.round(tgt.el*1e6);if(tgt.avcC)stPushTo(x,stMsg(9,us,[0x17,0,0,0,0],tgt.avcC));if(tgt.asc)stPushTo(x,stMsg(8,us,[0xAF,0],tgt.asc));
    tgt.dests.push(x);tgt.forceKey=true;if(typeof lpL==='function')lpL('destination ajoutée pendant le live : '+x.name);toast(T('lq.d.added',{name:x.name}));stStatus();
  }else{
    const o=[H,V].find(z=>z&&z.dests.some(x=>x.id===d.id));if(!o)return;
    const x=o.dests.find(y=>y.id===d.id),left=o.dests.filter(y=>y!==x&&!y.dead);
    if(!left.length&&o===O.live){d.on=true;stSideUI();toast(T('lq.d.last'));return}
    o.dests=o.dests.filter(y=>y!==x);dedcutLive.stop(d.id).catch(()=>{});
    if(typeof lpL==='function')lpL('destination retirée pendant le live : '+x.name);toast(T('lq.d.removed',{name:x.name}));
    if(!o.dests.length&&o===O.vert)lvStop();stStatus();
  }
  stSideUI();
}
$('#stSide').addEventListener('change',e=>{const t=e.target;if(t.dataset.dset!=='on'||!(O.live||O.vert)||!window.dedcutLive)return;
  const dc=t.closest('[data-dest]'),d=dc&&stData.dests.find(x=>x.id===+dc.dataset.dest);if(d)lqDestLive(d,t.checked)});
// Réglages pendant le live : état de chaque destination
{const su=stSideUI;stSideUI=function(){su();if(stSide!=='set'||!(O.live||O.vert))return;
  const on=new Map([O.live,O.vert].filter(Boolean).flatMap(o=>o.dests.map(x=>[x.id,x])));
  for(const el of $$('#stSide .stdest[data-dest]')){const x=on.get(+el.dataset.dest),h=el.querySelector('.stdest-h');if(!h||h.querySelector('.lqst'))continue;
    h.insertAdjacentHTML('beforeend',`<i class="lqst${x?x.dead?' dead':' on':''}">${T(x?x.dead?'lq.d.lost':x.reconn?'live.st.reconnecting':'lq.d.on':'lq.d.off')}</i>`)}
  const hint=$('#stSide .stdest:last-of-type');if(hint&&!$('#lqLiveHint'))hint.insertAdjacentHTML('afterend',`<p class="hint" id="lqLiveHint">${T('lq.d.hint')}</p>`)}}

/* ---------- (2) délai de diffusion ---------- */
let lqDelay=0; // secondes, fixé au démarrage du live
const lqPushNow=stPushTo;
stPushTo=function(d,b){if(!lqDelay||d.reconn||d.dead)return lqPushNow(d,b);(d.dq||(d.dq=[])).push([performance.now()+lqDelay*1000,b])};
setInterval(()=>{if(!lqDelay)return;const now=performance.now();for(const o of[O.live,O.vert])if(o)for(const d of o.dests)if(d.dq)while(d.dq.length&&d.dq[0][0]<=now)lqPushNow(d,d.dq.shift()[1])},40);
{const fl=stFlush;stFlush=function(L,force){if(force)for(const d of L.dests)if(d.dq&&d.dq.length){for(const[,b]of d.dq)lqPushNow(d,b);d.dq=[]}return fl(L,force)}}
{const ls=stLiveStart;stLiveStart=async function(){if(!O.live)lqDelay=Math.max(0,Math.min(120,+stData.delay||0));await ls();if(!O.live)lqDelay=0;else if(lqDelay&&typeof lpL==='function')lpL('délai de diffusion : '+lqDelay+' s')}}
// arrêt : on n'encode plus rien, puis on envoie la fin gardée en mémoire (2e clic sur Arrêter : tout de suite)
{const lt=stLiveStop;stLiveStop=async function(){
  const L=O.live;
  if(L&&lqDelay>0&&!L.stopping&&!L.drain){L.drain=true;await stOutStop(L);if(O.vert)await stOutStop(O.vert);toast(T('lq.dl.ending',{s:lqDelay}));stStatus();
    const end=performance.now()+lqDelay*1000+1500;
    while(O.live===L&&performance.now()<end&&[L,O.vert].some(o=>o&&o.dests.some(d=>d.dq&&d.dq.length||d.q.length))){await new Promise(r=>setTimeout(r,120));await stFlush(L);if(O.vert)await stFlush(O.vert)}}
  await lt();if(!O.live)lqDelay=0;
}}
{const ss=stStatus;stStatus=function(s){ss(s);const el=$('#stStatus');if(!el||!O.live||!lqDelay)return;
  el.insertAdjacentHTML('beforeend',`<span class="lbperf">${T(O.live.drain?'lq.dl.draining':'lq.dl.pill',{s:lqDelay})}</span>`)}}

/* ---------- (3) Réglages : délai, replay, nom des fichiers ---------- */
{const qh=stQualHTML;stQualHTML=function(busy){
  const sec=stRpSec(),mo=Math.round((stKbps()+160)*(sec+10)/8/1000);
  return qh(busy)+`<div class="fld"><label>${T('lq.dl.label')}</label><select data-lqx="delay" ${busy?'disabled':''}>${[0,5,10,20,30,60,120].map(v=>`<option value="${v}" ${(+stData.delay||0)===v?'selected':''}>${v?v+' s':T('lq.dl.none')}</option>`).join('')}</select></div>
    ${+stData.delay?`<p class="hint">${T('lq.dl.hint')}</p>`:''}
    <div class="fld"><label>${T('lq.rp.label')}</label><select data-lqx="rpSec">${[15,30,60,90,120].map(v=>`<option value="${v}" ${sec===v?'selected':''}>${v} s</option>`).join('')}</select></div>
    <p class="hint">${T('lq.rp.mem',{mo})}</p>
    <div class="fld"><label>${T('lq.rec.prefix')}</label><input type="text" maxlength="40" value="${esc(stData.rec.prefix||'')}" placeholder="${esc(T('rec.filePrefix'))}" data-lqx="prefix"></div>`;
}}
$('#stSide').addEventListener('change',e=>{const t=e.target,k=t.dataset.lqx;if(!k)return;
  if(k==='prefix')stData.rec.prefix=t.value.trim().slice(0,40);else stData[k]=+t.value;stSave();if(k!=='prefix'){stSideUI();stCtlUI()}});

/* ---------- (4) automatisations ---------- */
const LQ_WHEN=['alert','cmd','word','live','liveEnd','timer','scene','key'],LQ_DO=['scene','show','hide','toggle','sound','replay','mark','recStart','recStop','say','counter'];
const lqAutos=()=>stData.auto||(stData.auto=[]);
const lqItems=()=>stData.scenes.flatMap(s=>s.items.map(it=>({it,s})));
let lqDepth=0;
function lqRun(r,ctx){
  if(lqDepth>2)return;const now=Date.now();if(now-(r._t||0)<3000&&!ctx.test)return;r._t=now;lqDepth++;
  try{
    const a=r.do,p=r.a;
    if(a==='scene'){const id=+p;if(stData.scenes.some(s=>s.id===id)){stSwitch(id);if(stData.smode&&typeof pgTake==='function')setTimeout(pgTake,50)}}
    else if(a==='show'||a==='hide'||a==='toggle'){const x=lqItems().find(z=>z.it.id===+p);if(x){const it=x.it,was=it.vis;it.vis=a==='show'?true:a==='hide'?false:!it.vis;stSave();stSourcesUI();
      if(+r.dur>0&&it.vis!==was)setTimeout(()=>{it.vis=was;stSave();stSourcesUI()},+r.dur*1000)}}
    else if(a==='sound')sbPlay(+p||0);
    else if(a==='replay')stReplaySave();
    else if(a==='mark')lxMark();
    else if(a==='recStart'){if(!O.rec)stRecStart()}
    else if(a==='recStop'){if(O.rec)stRecStop()}
    else if(a==='say'){const s=String(p||'').replace(/\{user\}/gi,ctx.user||'').replace(/\{amount\}/gi,ctx.amount||'').trim();if(s)cxSayAll(s)}
    else if(a==='counter')wgCount(+p||1);
    if(typeof lpL==='function')lpL('automatisation : '+r.when+' → '+a);
  }catch(e){}finally{lqDepth--}
}
// appelé par 10o (alertes, chat) et ici (live, minuteur, scène, raccourci)
function lcAuto(kind,x){
  if(!stData)return;
  for(const r of lqAutos()){if(!r.on)continue;let ok=false,ctx={};
    if(kind==='alert'&&r.when==='alert'){ok=(r.p==='any'||!r.p||r.p===x.type)&&lcAmt(x.amount)>=(+r.min||0);ctx={user:x.name,amount:x.amount||''}}
    else if(kind==='chat'&&(r.when==='cmd'||r.when==='word')){const s=String(x.text||'').trim(),k=String(r.p||'').trim().toLowerCase();if(!k)continue;
      ok=r.when==='cmd'?cxNorm(s.split(/\s+/)[0])===cxNorm(k.startsWith('!')?k:'!'+k):cxNorm(s).includes(cxNorm(k));
      if(ok&&r.when==='cmd'&&lcRank(x)<(LC_PERM[r.perm]||0))ok=false;ctx={user:x.name}}
    else if(kind===r.when&&(kind==='live'||kind==='liveEnd'))ok=true;
    else if(kind==='scene'&&r.when==='scene')ok=+r.p===+x;
    else if(kind==='key'&&r.when==='key')ok=r===x;
    if(ok)lqRun(r,ctx);
  }
}
{const ls=stLiveStart;stLiveStart=async function(){const was=!!O.live;await ls();if(!was&&O.live)lcAuto('live')}}
{const lt=stLiveStop;stLiveStop=async function(){const was=!!O.live;await lt();if(was&&!O.live)lcAuto('liveEnd')}}
{const sw=stSwitch;stSwitch=function(id){const b=stData.cur;sw(id);if(stData.cur!==b)lcAuto('scene',stData.cur)}}
setInterval(()=>{if(!stData||!O.live||!O.live.on)return;const now=Date.now();
  for(const r of lqAutos())if(r.on&&r.when==='timer'&&+r.p>0){if(!r._s){r._s=now;continue}if(now-r._s>=+r.p*60000){r._s=now;lqRun(r,{})}}},15000);
// raccourcis des automatisations (seulement dans le studio)
const lqKOn=new Map();
setInterval(()=>{const K=window.dedcutKeys;if(!K||!stData)return;const studio=typeof appMode!=='undefined'&&stOn(),want=new Map();
  if(studio)for(const r of lqAutos())if(r.on&&r.when==='key'&&r.p&&!want.has(r.p))want.set(r.p,r);
  for(const[a,r]of lqKOn)if(want.get(a)!==r){K.off(a).catch(()=>{});lqKOn.delete(a)}
  for(const[a,r]of want)if(!lqKOn.has(a)){lqKOn.set(a,r);K.on(a,()=>lcAuto('key',r)).catch(()=>{})}},1500);
function lqAutoHTML(){
  const L=lqAutos(),scenes=stData.scenes,items=lqItems(),pads=typeof stSb==='function'?stSb().pads:[];
  const opt=(list,v)=>list.map(([k,n])=>`<option value="${esc(String(k))}" ${String(v)===String(k)?'selected':''}>${esc(n)}</option>`).join('');
  const scOpts=v=>opt(scenes.map(s=>[s.id,s.name]),v),itOpts=v=>opt(items.map(z=>[z.it.id,z.s.name+' › '+stName(z.it)]),v);
  return(L.length?L.map((r,i)=>{
    let wp='';
    if(r.when==='alert')wp=`<div class="two"><select data-lqa="${i}:p">${opt(LC_AT.map(k=>[k,T(k==='any'?'lc.var.any':'lc.t.'+k)]),r.p||'any')}</select><input type="number" min="0" value="${+r.min||0}" data-lqa="${i}:min" title="${esc(T('lc.var.min'))}"></div>`;
    else if(r.when==='cmd')wp=`<div class="two"><input type="text" maxlength="30" value="${esc(r.p||'')}" placeholder="!clip" data-lqa="${i}:p"><select data-lqa="${i}:perm">${opt(['all','subs','mods'].map(k=>[k,T('lc.perm_'+k)]),r.perm||'all')}</select></div>`;
    else if(r.when==='word')wp=`<input type="text" maxlength="40" value="${esc(r.p||'')}" placeholder="${esc(T('lq.a.wordPh'))}" data-lqa="${i}:p">`;
    else if(r.when==='timer')wp=`<select data-lqa="${i}:p">${opt([5,10,15,20,30,45,60].map(v=>[v,T('lq.a.every',{n:v})]),r.p||15)}</select>`;
    else if(r.when==='scene')wp=`<select data-lqa="${i}:p">${scOpts(r.p)}</select>`;
    else if(r.when==='key')wp=`<input type="text" readonly value="${esc(r.p?lpAccTxt(r.p):'')}" placeholder="${esc(T('lp.k.none'))}" data-lqkey="${i}" class="lqkey">`;
    let dp='';
    if(r.do==='scene')dp=`<select data-lqa="${i}:a">${scOpts(r.a)}</select>`;
    else if(r.do==='show'||r.do==='hide'||r.do==='toggle')dp=`<select data-lqa="${i}:a">${itOpts(r.a)}</select><div class="fld lqdur"><label>${T('lq.a.dur')}</label><input type="number" min="0" max="600" value="${+r.dur||0}" data-lqa="${i}:dur"></div>`;
    else if(r.do==='sound')dp=`<select data-lqa="${i}:a">${opt(pads.map((p,j)=>[j,(j+1)+'. '+sbName(p)]),r.a||0)}</select>`;
    else if(r.do==='say')dp=`<input type="text" maxlength="300" value="${esc(r.a||'')}" placeholder="${esc(T('lq.a.sayPh'))}" data-lqa="${i}:a">`;
    else if(r.do==='counter')dp=`<input type="number" step="1" value="${r.a==null?1:+r.a}" data-lqa="${i}:a">`;
    return`<div class="lqrule${r.on?'':' off'}"><div class="lqh"><label class="chk"><input type="checkbox" data-lqa="${i}:on" ${r.on?'checked':''}><b>${T('lq.a.n',{n:i+1})}</b></label><button class="sm" data-lqact="test" data-i="${i}" title="${esc(T('lq.a.test'))}">${ico('play',12)}</button><button class="sm" data-lqact="del" data-i="${i}" title="${esc(T('common.remove'))}">${ico('trash',12)}</button></div>
      <div class="fld"><label>${T('lq.a.when')}</label><select data-lqa="${i}:when">${opt(LQ_WHEN.map(k=>[k,T('lq.w.'+k)]),r.when)}</select></div>${wp}
      <div class="fld"><label>${T('lq.a.then')}</label><select data-lqa="${i}:do">${opt(LQ_DO.map(k=>[k,T('lq.do.'+k)]),r.do)}</select></div>${dp}</div>`}).join(''):`<p class="hint">${T('lq.a.none')}</p>`)
    +`<button class="sm" data-lqact="add">${ico('plus',13)}${T('lq.a.add')}</button><p class="hint">${T('lq.a.hint')}</p>`;
}
{const tp=stToolsPanel;stToolsPanel=function(){
  const h=tp();if(cxOpen.lqauto==null)cxOpen.lqauto=false;const n=lqAutos().filter(r=>r.on).length;
  return h+`<details class="cxsec" data-cxsec="lqauto"${cxOpen.lqauto?' open':''}><summary>${ico('bolt',15)}<b>${T('lq.a.title')}</b>${n?`<i class="cxon on">${n}</i>`:''}</summary>${lqAutoHTML()}</details>`}}
$('#stSide').addEventListener('change',e=>{const t=e.target;if(!t.dataset.lqa)return;const[i,k]=t.dataset.lqa.split(':'),r=lqAutos()[+i];if(!r)return;
  r[k]=t.type==='checkbox'?t.checked:['min','dur'].includes(k)?Math.max(0,+t.value||0):k==='counter'?+t.value:t.value;
  if(k==='when'){r.p=r.when==='alert'?'any':r.when==='timer'?15:r.when==='scene'?stData.cur:'';r._s=0}
  if(k==='do')r.a=r.do==='scene'?stData.cur:r.do==='counter'?1:['show','hide','toggle'].includes(r.do)?((lqItems()[0]||{}).it||{}).id:r.do==='sound'?0:'';
  stSave();if(['when','do','on'].includes(k))lcRedraw()});
$('#stSide').addEventListener('keydown',e=>{const t=e.target;if(!t.dataset||t.dataset.lqkey==null)return;e.preventDefault();e.stopPropagation();if(['Control','Shift','Alt','Meta'].includes(e.key))return;
  if(e.key==='Escape'){t.blur();return}const a=lpAccel(e);if(a==='mods'){toast(T('lp.k.needMod'));return}if(!a)return;const r=lqAutos()[+t.dataset.lqkey];if(r){r.p=a;stSave();t.value=lpAccTxt(a)}},true);
$('#stSide').addEventListener('click',e=>{const b=e.target.closest('[data-lqact]');if(!b)return;const a=b.dataset.lqact,i=+b.dataset.i,L=lqAutos();
  if(a==='add'){L.push({on:true,when:'alert',p:'any',min:0,do:'sound',a:0,dur:0});cxOpen.lqauto=true;stSave();lcRedraw();return}
  if(a==='del'){L.splice(i,1);stSave();lcRedraw();return}
  if(a==='test'&&L[i])lqRun(L[i],{test:true,user:T('st.chat.testName'),amount:'100'});
});

/* ---------- (5) retard de l'image d'une webcam ---------- */
const lqVd=new Map();
function lqDelayed(it,src){
  const now=performance.now(),dl=Math.min(800,+it.o.vdelay||0);let Q=lqVd.get(it.id);if(!Q){Q={q:[],pool:[],last:0};lqVd.set(it.id,Q)}
  const per=1000/Math.max(15,+(src.fps)||30)-2;
  if(now-Q.last>=per){const im=src.img();if(im){const[w,h]=stDim(im),c=Q.pool.pop()||document.createElement('canvas');if(c.width!==w||c.height!==h){c.width=w;c.height=h}
    c.getContext('2d').drawImage(im,0,0);Q.q.push({t:now,c});Q.last=now}}
  while(Q.q.length>1&&Q.q[1].t<=now-dl)Q.pool.push(Q.q.shift().c);
  while(Q.q.length>50)Q.pool.push(Q.q.shift().c);if(Q.pool.length>3)Q.pool.length=3;
  return Q.q.length?Q.q[0].c:null;
}
{const di=stDrawIt;stDrawIt=function(g,it,t){
  if(it.kind!=='cam'||!(+it.o.vdelay>0))return di(g,it,t);
  const c=st.cams[stCamKey(it)];if(!c||!c.img)return di(g,it,t);
  const orig=c.img,d=lqDelayed(it,c);c.img=()=>d;try{return di(g,it,t)}finally{c.img=orig}
}}
{const pe=stPropsExtra;stPropsExtra=function(it){const h=pe(it);if(it.kind!=='cam')return h;const v=+it.o.vdelay||0;
  return`<div class="fld"><label>${T('lq.vd')} <span>${v} ms</span></label><input type="range" min="0" max="800" step="20" value="${v}" data-o="vdelay" data-lbr=" ms"></div>`+h}}

/* ---------- (6) clés de stream chiffrées par Windows ---------- */
const lqSec=new Map(); // clé en clair → clé chiffrée (seulement en mémoire)
const lqPend=new Set();
function stKeyOut(x){ // appelé par stSave (10b) sur la copie écrite dans les réglages
  const S=window.dedcutSecret;if(!S)return;if(!x.key)return; // clé encore verrouillée : la version chiffrée reste telle quelle
  const e=lqSec.get(x.key);if(e){x.ekey=e;x.key='';return}
  delete x.ekey;const k=x.key;if(!lqPend.has(k)){lqPend.add(k);S.protect(k).then(h=>{lqSec.set(k,h);stSave()},()=>{}).finally(()=>lqPend.delete(k))}
}
let lqUnlockP=null;
function lqUnlock(){
  const S=window.dedcutSecret;if(!S||!stData)return Promise.resolve();
  lqUnlockP=Promise.all(stData.dests.filter(d=>d.ekey).map(d=>{const h=d.ekey;
    return S.unprotect(h).then(k=>{delete d.ekey;if(!d.key)d.key=k;lqSec.set(k,h)},()=>{})})).then(()=>{stSave();if(stSide==='set')stSideUI()});
  return lqUnlockP;
}
{const lo=stLoad;stLoad=function(){lo();lqUnlock()}}
if(stData)lqUnlock();
{const ls=stLiveStart;stLiveStart=async function(){if(lqUnlockP)await lqUnlockP;return ls()}}
{const sn=lpSnap;lpSnap=function(){const d=sn();(d.dests||[]).forEach(x=>{x.key='';delete x.ekey});return d}}

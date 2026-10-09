/* ---------- Module Live, interaction et communauté (v4.43, priorité P3) ----------
   - événements récents : liste gardée d'un lancement à l'autre, relance d'une alerte, doublons ignorés ;
   - variantes d'alertes selon le montant (couleur, image, son, message) ;
   - thème du live : une couleur et une police pour tous les widgets, à exporter / importer ;
   - bot : permission par commande (tout le monde, abonnés, modérateurs) ;
   - points de fidélité (règles affichées), récompenses et historique ; tirage au sort, file d'attente, citations,
     mini-jeux (devine le nombre, dé).
   Tout reste sur le PC : les réponses passent par les comptes déjà reliés (onglet Chat), rien n'est simulé comme
   « connecté ». Réglages gardés dans stData (evh, loy, gw, quotes). */

/* ---------- (1) événements récents, doublons, variantes ---------- */
ST_AL_COL.loyalty='#f59e0b';
let lcTest=false;
{const at=stAlertTest;stAlertTest=function(){lcTest=true;try{return at.apply(this,arguments)}finally{lcTest=false}}}
const lcSeen=new Map();
const lcAmt=x=>parseFloat(String(x||'').replace(/[\s  ]/g,'').replace(',','.').replace(/[^\d.]/g,''))||0;
function lcVarPick(a){
  const o=stAlertOpts(),am=lcAmt(a.amount);let best=null;
  for(const v of o.vars||[])if((v.type==='any'||v.type===a.type)&&am>=(+v.min||0)&&(!best||(+v.min||0)>=(+best.min||0)))best=v;
  return best?JSON.parse(JSON.stringify(best)):null;
}
function lcEvPush(a){
  const h=stData.evh||(stData.evh=[]);h.unshift({t:Date.now(),type:a.type,name:a.name,amount:a.amount||'',text:a.text||'',src:a.src||'',test:!!a.test});
  if(h.length>50)h.length=50;stSave();if(stSide==='tools'&&cxOpen.lcev)lcRedraw();
}
{const al=stAlert;stAlert=function(a,first){
  if(!a||a.type==='pin'||a.replay||a.irc&&typeof twLive==='function'&&twLive())return al(a,first);
  if(lcTest)a.test=true;
  // le même événement reçu deux fois (deux connexions, reconnexion) : une seule alerte
  const now=Date.now(),k=[a.type,String(a.name||'').toLowerCase(),a.amount||'',String(a.text||'').slice(0,60)].join('|');
  for(const[x,t]of lcSeen)if(now-t>5000)lcSeen.delete(x);
  if(lcSeen.has(k))return;lcSeen.set(k,now);
  a.var=lcVarPick(a);lcEvPush(a);
  const r=al(a,first);if(typeof lcAuto==='function')try{lcAuto('alert',a)}catch(e){}
  return r;
}}
// relancer une alerte de la liste : seulement à l'écran (pas de nouveau message dans le chat ni de voix)
function lcReplay(i){const e=(stData.evh||[])[i];if(!e)return;const a={type:e.type,name:e.name,amount:e.amount,text:e.text,replay:true};a.var=lcVarPick(a);stAl.q.push(a);toast(T('lc.ev.replayed'))}
{const lk=stLook;stLook=function(o,kind){const L=lk(o,kind),c=kind==='alerts'&&stAl.cur,v=c&&c.var;
  if(v){if(v.col)L.col=v.col;if(v.img)L.img=v.img;if(v.tpl)L.tpl=Object.assign({},L.tpl,{[c.type]:v.tpl})}return L}}
{const as=stAlertSound;stAlertSound=function(v,o){const c=stAl.cur;if(c&&c.var&&c.var.snd)o=Object.assign({},o,{snd:c.var.snd});return as(v,o)}}
{const ad=stAlertDraw;stAlertDraw=function(g,it,x,y,w,h){const c=stAl.cur;if(c&&c.var&&+c.var.dur>0&&c.start){const d=it.o.dur;it.o.dur=+c.var.dur;try{return ad(g,it,x,y,w,h)}finally{it.o.dur=d}}return ad(g,it,x,y,w,h)}}
{const tk=stAlertTick;stAlertTick=function(now){const c=stAl.cur;if(c&&c.var&&+c.var.dur>0){const o=stAlertOpts(),d=o.dur;o.dur=+c.var.dur;try{return tk(now)}finally{o.dur=d}}return tk(now)}}
const LC_AT=['any','follow','sub','gift','raid','bits','tip','superchat','member','reward','loyalty'];
function lcVarsHTML(it){
  const vs=it.o.vars||[];
  return`<details class="cxsec"${vs.length?' open':''}><summary>${ico('star',14)}<b>${T('lc.var.title')}</b></summary>
    ${vs.map((v,i)=>`<div class="lcvar"><div class="two"><div class="fld"><label>${T('lc.var.type')}</label><select data-lcvar="${i}:type">${LC_AT.map(k=>`<option value="${k}" ${v.type===k?'selected':''}>${T(k==='any'?'lc.var.any':'lc.t.'+k)}</option>`).join('')}</select></div>
      <div class="fld"><label>${T('lc.var.min')}</label><input type="number" min="0" step="1" value="${+v.min||0}" data-lcvar="${i}:min"></div></div>
      <div class="two"><div class="fld"><label>${T('lc.var.col')}</label><input type="color" value="${esc(v.col||'#fbbf24')}" data-lcvar="${i}:col"></div><div class="fld"><label>${T('lc.var.dur')}</label><input type="number" min="0" max="30" value="${+v.dur||0}" data-lcvar="${i}:dur"></div></div>
      <div class="fld"><label>${T('lc.var.msg')}</label><input type="text" maxlength="80" value="${esc(v.tpl||'')}" placeholder="${esc(T('lc.var.msgPh'))}" data-lcvar="${i}:tpl"></div>
      <div class="lcrow"><button class="sm" data-lcvact="img" data-i="${i}">${ico('image',13)}${T(v.img?'deco.change':'deco.img')}</button><button class="sm" data-lcvact="snd" data-i="${i}">${ico('audio',13)}${T(v.snd?'deco.change':'deco.snd')}</button><button class="sm" data-lcvact="del" data-i="${i}" title="${esc(T('common.remove'))}">${ico('trash',13)}</button></div>
      ${v.img||v.snd?`<p class="hint">${esc([v.img,v.snd].filter(Boolean).map(p=>p.split(/[\\/]/).pop()).join(' · '))}</p>`:''}</div>`).join('')}
    <div class="stduo"><button class="sm" data-lcvact="add">${ico('plus',13)}${T('lc.var.add')}</button><button class="sm" data-lcvact="test">${ico('play',13)}${T('lc.var.test')}</button></div>
    <p class="hint">${T('lc.var.hint')}</p></details>`;
}
{const pe=stPropsExtra;stPropsExtra=function(it){const h=pe(it);return it.kind==='alerts'?lcVarsHTML(it)+h:h}}
// fichiers choisis avant (stinger, variantes) : ré-autorisés au premier passage dans le studio
{const af=stAllowFiles;stAllowFiles=async function(){const first=!stAllowed;await af();if(!first||!FS||!stData)return;
  const l=[];if(stData.trans&&stData.trans.stg)l.push(stData.trans.stg);for(const s of stData.scenes)for(const it of s.items)for(const v of(it.o&&it.o.vars)||[])for(const k of['img','snd'])if(v[k])l.push(v[k]);
  if(l.length)await FS.allowPaths([...new Set(l)]).catch(()=>{})}}

/* ---------- (2) thème du live ---------- */
const LC_THEMES={violet:{acc:'#a78bfa',txt:'#ffffff',font:'Bahnschrift'},neon:{acc:'#22d3ee',txt:'#e0f2fe',font:'Audiowide'},game:{acc:'#f43f5e',txt:'#ffffff',font:'Russo One'},
  gold:{acc:'#fbbf24',txt:'#fffbeb',font:'Luckiest Guy'},nature:{acc:'#22c55e',txt:'#f0fdf4',font:'Segoe UI'}};
function lcThemeApply(th){
  let n=0;for(const s of stData.scenes)for(const it of s.items){const o=it.o;
    if(it.kind==='alerts'){o.col=th.acc;o.txt=th.txt;o.font=th.font;o.look='';n++}
    else if(it.kind==='chat'){o.nameCol=th.acc;o.txt=th.txt;o.font=th.font;o.look='';n++}
    else if(['goal','ticker','poll','banner'].includes(it.kind)){o.color=th.acc;n++}
    else if(['counter','captions'].includes(it.kind)){o.color=th.txt;n++}}
  stData.theme=Object.assign({},th);stSave();stRender();toast(T('lc.th.applied',{n}));
}
function lcThemeHTML(){
  const th=stData.theme||LC_THEMES.violet;
  return`<div class="lcthemes">${Object.entries(LC_THEMES).map(([k,v])=>`<button data-lcth="${k}" style="--c:${v.acc}"><i></i>${T('lc.th.'+k)}</button>`).join('')}</div>
    <div class="two"><div class="fld"><label>${T('lc.th.acc')}</label><input type="color" value="${esc(th.acc)}" data-lcthv="acc"></div><div class="fld"><label>${T('lc.th.txt')}</label><input type="color" value="${esc(th.txt)}" data-lcthv="txt"></div></div>
    <div class="stduo"><button class="sm" data-lcact="thapply">${ico('check',13)}${T('lc.th.apply')}</button><button class="sm" data-lcact="thexp">${ico('export',13)}${T('lp.c.export')}</button></div>
    <button class="sm" data-lcact="thimp">${ico('open',13)}${T('lc.th.import')}</button><p class="hint">${T('lc.th.hint')}</p>`;
}
{const ti=document.createElement('input');ti.type='file';ti.accept='.json';ti.hidden=true;ti.id='lcThIn';document.body.appendChild(ti);
  ti.onchange=async()=>{const f=ti.files[0];ti.value='';if(!f)return;try{const d=JSON.parse(await f.text()),ok=c=>/^#[0-9a-f]{6}$/i.test(c);
    if(!ok(d.acc)||!ok(d.txt))throw 0;lcThemeApply({acc:d.acc,txt:d.txt,font:String(d.font||'Bahnschrift').slice(0,60)});stSideUI()}catch(e){toast(T('lc.th.bad'))}}}

/* ---------- (3) bot : permissions ---------- */
const lcRank=m=>m.own||(m.badges||[]).includes('owner')?3:(m.badges||[]).includes('mod')?2:(m.badges||[]).some(b=>b==='sub'||b==='member'||b==='vip')?1:0;
const LC_PERM={all:0,subs:1,mods:2};
{const cb=cxBot;cxBot=function(m){
  const s=String(m.text||'').trim();if(s.startsWith('!')){const k=cxNorm(s.split(/\s+/)[0]),cmd=(stCx().bot.cmds||[]).find(c=>c.k&&cxNorm(c.k.trim().startsWith('!')?c.k.trim():'!'+c.k.trim())===k);
    if(cmd&&lcRank(m)<(LC_PERM[cmd.p]||0))return}
  return cb(m)}}

/* ---------- (4) points de fidélité, récompenses ---------- */
const LC_LOY=()=>({on:false,name:'points',msg:5,act:10,every:10,rewards:[],users:{},hist:[]});
function lcLoy(){if(!stData.loy)stData.loy=LC_LOY();else for(const[k,v]of Object.entries(LC_LOY()))if(stData.loy[k]==null)stData.loy[k]=v;return stData.loy}
const lcKey=m=>m.src+':'+String(m.uid||m.name).toLowerCase();
const lcLiveOn=m=>!!(O.live&&O.live.on)||m&&m.src==='test';
function lcUser(m){const L=lcLoy(),k=lcKey(m);let u=L.users[k];if(!u){u=L.users[k]={n:m.name,p:0,last:0,seen:0};const ks=Object.keys(L.users);if(ks.length>3000){ks.sort((a,b)=>L.users[a].seen-L.users[b].seen);for(const x of ks.slice(0,ks.length-3000))delete L.users[x]}}u.n=m.name;return u}
function lcHist(who,what,pts){const L=lcLoy();L.hist.unshift({t:Date.now(),who,what,pts});if(L.hist.length>100)L.hist.length=100}
function lcFind(name){const L=lcLoy(),n=String(name||'').replace(/^@/,'').toLowerCase();return Object.values(L.users).find(u=>u.n.toLowerCase()===n)}
// points de présence : toutes les N minutes de live, pour les personnes qui ont écrit pendant ces N minutes
setInterval(()=>{if(!stData||!O.live||!O.live.on)return;const L=lcLoy();if(!L.on)return;const now=Date.now(),per=(+L.every||10)*60000;
  if(!L.tick){L.tick=now;return}if(now-L.tick<per)return;L.tick=now;let n=0;
  for(const u of Object.values(L.users))if(now-u.seen<per){u.p+=+L.act||0;n++}if(n)stSave()},20000);

/* ---------- (5) tirage au sort, file d'attente, citations, mini-jeux ---------- */
const lcGw={on:false,ents:new Map(),win:null};
const lcQ={open:false,list:[]};
let lcGuess=null; // {n, min, max, pts}
const lcCd=new Map();
const lcCool=(k,ms)=>{const now=Date.now();if(now-(lcCd.get(k)||0)<ms)return false;lcCd.set(k,now);return true};
function lcGwCfg(){if(!stData.gw)stData.gw={kw:'!join',subs:false,cost:0};return stData.gw}
function lcChat(m){
  const s=String(m.text||'').trim(),low=s.toLowerCase(),w=s.split(/\s+/),c=cxNorm(w[0]||''),L=lcLoy(),u=L.on?lcUser(m):null,now=Date.now();
  // fidélité : points par message (1 fois par minute au plus)
  if(u){u.seen=now;if(lcLiveOn(m)&&now-u.last>=60000){u.last=now;u.p+=+L.msg||0}}
  const say=t=>cxReply(m.src,t),cur=L.name||'points';
  if(L.on&&(c==='!points'||c==='!pts')&&lcCool('p:'+lcKey(m),10000)){say(T('lc.l.mine',{user:m.name,n:Math.floor(u.p),cur}));return}
  if(L.on&&c==='!top'&&lcCool('top',20000)){say(T('lc.l.topSay',{cur,list:Object.values(L.users).sort((a,b)=>b.p-a.p).slice(0,5).map((x,i)=>(i+1)+'. '+x.n+' '+Math.floor(x.p)).join(' · ')}));return}
  if(L.on&&(c==='!rewards'||c==='!recompenses')&&lcCool('rw',20000)){say(L.rewards.length?T('lc.l.list',{list:L.rewards.map((r,i)=>(i+1)+'. '+r.n+' ('+r.c+' '+cur+')').join(' · ')}):T('lc.l.noRw'));return}
  if(L.on&&(c==='!reward'||c==='!recompense')&&w[1]){
    const q=s.slice(w[0].length).trim().toLowerCase(),r=L.rewards[+q-1]||L.rewards.find(x=>x.n.toLowerCase()===q);
    if(!r){say(T('lc.l.noSuch',{user:m.name}));return}
    if(u.p<+r.c){say(T('lc.l.poor',{user:m.name,n:Math.floor(u.p),c:r.c,cur}));return}
    u.p-=+r.c;lcHist(m.name,r.n,-r.c);stSave();say(T('lc.l.got',{user:m.name,reward:r.n}));
    stAlert({type:'loyalty',name:m.name,text:r.n,amount:r.c+' '+cur,src:m.src});return}
  if(L.on&&c==='!give'&&lcRank(m)>=2&&w[1]&&w[2]){const t=lcFind(w[1]),n=Math.round(+w[2]);if(t&&isFinite(n)){t.p=Math.max(0,t.p+n);lcHist(t.n,T('lc.l.byMod',{mod:m.name}),n);stSave();say(T('lc.l.mine',{user:t.n,n:Math.floor(t.p),cur}))}return}
  // tirage au sort
  const G=lcGwCfg();
  if(lcGw.on&&c===cxNorm(G.kw||'!join')){const k=lcKey(m);if(lcGw.ents.has(k))return;if(G.subs&&lcRank(m)<1)return;
    if(+G.cost>0&&L.on){if(!u||u.p<+G.cost)return;u.p-=+G.cost;lcHist(m.name,T('lc.g.title'),-G.cost)}
    lcGw.ents.set(k,{name:m.name,src:m.src});lcRedraw();return}
  // file d'attente
  if(c==='!queue'||c==='!file'){if(!lcQ.open)return;const k=lcKey(m);let i=lcQ.list.findIndex(x=>x.k===k);
    if(i<0&&lcQ.list.length<100){lcQ.list.push({k,name:m.name,src:m.src});i=lcQ.list.length-1;lcRedraw()}if(lcCool('q:'+k,8000))say(T('lc.q.pos',{user:m.name,n:i+1}));return}
  if(c==='!leave'||c==='!quitter'){const k=lcKey(m),i=lcQ.list.findIndex(x=>x.k===k);if(i>=0){lcQ.list.splice(i,1);lcRedraw()}return}
  // citations
  const Q=stData.quotes||(stData.quotes=[]);
  if((c==='!addquote'||c==='!ajoutcitation')&&lcRank(m)>=2&&w[1]){Q.push(s.slice(w[0].length).trim().slice(0,200));stSave();say(T('lc.c.added',{n:Q.length}));lcRedraw();return}
  if((c==='!quote'||c==='!citation')&&lcCool('quote',8000)){if(!Q.length){say(T('lc.c.none'));return}const i=+w[1]>0&&+w[1]<=Q.length?+w[1]-1:Math.floor(Math.random()*Q.length);say('#'+(i+1)+' « '+Q[i]+' »');return}
  // mini-jeux
  if((c==='!dice'||c==='!de'||c==='!des')&&lcCool('d:'+lcKey(m),15000)){say(T('lc.m.dice',{user:m.name,n:1+Math.floor(Math.random()*6)}));return}
  if(lcGuess&&/^\d{1,6}$/.test(s)){const n=+s;if(n===lcGuess.n){const g=lcGuess;lcGuess=null;let extra='';
      if(L.on&&u&&+g.pts>0){u.p+=+g.pts;lcHist(m.name,T('lc.m.guess'),+g.pts);extra=' (+'+g.pts+' '+cur+')';stSave()}
      cxSayAll(T('lc.m.won',{user:m.name,n})+extra);toast(T('lc.m.won',{user:m.name,n}));lcRedraw()}}
}
{const ci=stCxIn;stCxIn=function(m){ci(m);if(m.bot||m.hidden||m.alert)return;try{lcChat(m)}catch(e){}if(typeof lcAuto==='function')try{lcAuto('chat',m)}catch(e){}}}
function lcGwDraw(){
  const e=[...lcGw.ents.values()];if(!e.length){toast(T('lc.g.empty'));return}
  const w=e[Math.floor(Math.random()*e.length)];lcGw.win=w;lcGw.on=false;
  cxSayAll(T('lc.g.won',{user:w.name,n:e.length}));stAlert({type:'pin',name:w.name,text:T('lc.g.winner')});lcHist(w.name,T('lc.g.title'),0);stSave();lcRedraw();
}

/* ---------- onglet Outils : nouvelles sections ---------- */
function lcRedraw(){if(stSide!=='tools')return;const b=$('#stSide');const y=b.scrollTop;stSideUI();b.scrollTop=y}
const lcAgo=t=>{const s=Math.max(0,(Date.now()-t)/1000|0);return s<60?s+' s':s<3600?(s/60|0)+' min':s<86400?(s/3600|0)+' h':(s/86400|0)+' j'};
{const tp=stToolsPanel;stToolsPanel=function(){
  let h=tp();
  // permission de chaque commande du bot
  h=h.replace(/(<button class="sm" data-cxact="cmddel" data-i="(\d+)")/g,(x,b,i)=>{const c=(stCx().bot.cmds||[])[+i]||{};return`<select data-cxcmd="${i}:p" title="${esc(T('lc.perm'))}">${['all','subs','mods'].map(k=>`<option value="${k}" ${(c.p||'all')===k?'selected':''}>${T('lc.perm_'+k)}</option>`).join('')}</select>`+b});
  for(const k of['lcev','lcth','lcloy','lcgw','lcq','lcquo','lcgame'])if(cxOpen[k]==null)cxOpen[k]=false;
  const sec=(k,ic,title,body,on)=>`<details class="cxsec" data-cxsec="${k}"${cxOpen[k]?' open':''}><summary>${ico(ic,15)}<b>${T(title)}</b>${on!=null?`<i class="cxon${on?' on':''}">${T(on?'cx.on':'cx.off')}</i>`:''}</summary>${body}</details>`;
  const say=stSayList().length>0,noAcc=say?'':`<p class="hint cxwarn">${T('cx.bot.noAcc')}</p>`;
  // événements récents
  const ev=stData.evh||[];
  const evb=(ev.length?`<div class="lcev">${ev.slice(0,25).map((e,i)=>`<div class="lcevr"><i style="--c:${ST_AL_COL[e.type]||'#8b5cf6'}"></i><span><b>${esc(e.name)}</b> ${esc(T('st.al.'+e.type,{n:e.amount||''}).replace(/\s*!$/,''))}${e.test?` <em>${T('lc.ev.test')}</em>`:''}</span><small>${lcAgo(e.t)}</small><button class="sm" data-lcrep="${i}" title="${esc(T('lc.ev.replay'))}">${ico('replay',12)}</button></div>`).join('')}</div>`:`<p class="hint">${T('lc.ev.none')}</p>`)
    +`<div class="stduo"><button class="sm" data-lcact="evtest">${ico('bell',13)}${T('lc.ev.test2')}</button><button class="sm" data-lcact="evclear">${ico('trash',13)}${T('lc.ev.clear')}</button></div><p class="hint">${T('lc.ev.hint')}</p>`;
  // fidélité
  const L=lcLoy(),top=Object.values(L.users).sort((a,b)=>b.p-a.p).slice(0,8);
  const loy=`<label class="chk"><span>${T('lc.l.on')}</span><input type="checkbox" data-lcl="on" ${L.on?'checked':''}></label>${noAcc}
    <div class="fld"><label>${T('lc.l.name')}</label><input type="text" maxlength="20" value="${esc(L.name)}" data-lcl="name"></div>
    <div class="two"><div class="fld"><label>${T('lc.l.msg')}</label><input type="number" min="0" max="1000" value="${L.msg}" data-lcl="msg"></div><div class="fld"><label>${T('lc.l.act',{m:L.every})}</label><input type="number" min="0" max="5000" value="${L.act}" data-lcl="act"></div></div>
    <div class="fld"><label>${T('lc.l.every')}</label><select data-lcl="every">${[5,10,15,30].map(v=>`<option value="${v}" ${+L.every===v?'selected':''}>${v} min</option>`).join('')}</select></div>
    <p class="hint">${T('lc.l.rules',{msg:L.msg,act:L.act,m:L.every,cur:esc(L.name)})}</p>
    <h5>${T('lc.l.rewards')}</h5>${L.rewards.map((r,i)=>`<div class="cxcmd lcrw"><input type="text" maxlength="40" value="${esc(r.n)}" data-lcrw="${i}:n" placeholder="${esc(T('lc.l.rwName'))}"><input type="number" min="1" value="${r.c}" data-lcrw="${i}:c"><button class="sm" data-lcact="rwdel" data-i="${i}">${ico('trash',13)}</button></div>`).join('')}
    <button class="sm" data-lcact="rwadd">${ico('plus',13)}${T('lc.l.rwAdd')}</button>
    <h5>${T('lc.l.top')}</h5>${top.length?`<ol class="lctop">${top.map(u=>`<li><span>${esc(u.n)}</span><b>${Math.floor(u.p)}</b></li>`).join('')}</ol>`:`<p class="hint">${T('lc.l.nobody')}</p>`}
    ${L.hist.length?`<h5>${T('lc.l.hist')}</h5><div class="lchist">${L.hist.slice(0,15).map(x=>`<div><small>${lcAgo(x.t)}</small> ${esc(x.who)} · ${esc(x.what)}${x.pts?` <b>${x.pts>0?'+':''}${x.pts}</b>`:''}</div>`).join('')}</div>`:''}
    <button class="sm" data-lcact="loyreset">${ico('trash',13)}${T('lc.l.reset')}</button><p class="hint">${T('lc.l.cmds')}</p>`;
  // tirage
  const G=lcGwCfg(),ents=[...lcGw.ents.values()];
  const gw=`<div class="two"><div class="fld"><label>${T('lc.g.kw')}</label><input type="text" maxlength="20" value="${esc(G.kw)}" data-lcg="kw" ${lcGw.on?'disabled':''}></div><div class="fld"><label>${T('lc.g.cost')}</label><input type="number" min="0" value="${+G.cost||0}" data-lcg="cost" ${lcGw.on?'disabled':''}></div></div>
    <label class="chk"><span>${T('lc.g.subs')}</span><input type="checkbox" data-lcg="subs" ${G.subs?'checked':''} ${lcGw.on?'disabled':''}></label>
    <p class="hint">${T('lc.g.count',{n:ents.length})}${ents.length?' : '+esc(ents.slice(-12).map(e=>e.name).join(', '))+(ents.length>12?'…':''):''}</p>
    ${lcGw.win?`<div class="lcwin">${ico('crown',15)}<b>${esc(lcGw.win.name)}</b></div>`:''}
    <div class="stduo">${lcGw.on?`<button data-lcact="gwstop">${ico('square',13)}${T('lc.g.close')}</button>`:`<button data-lcact="gwstart">${ico('play',13)}${T('lc.g.open')}</button>`}<button data-lcact="gwdraw" ${ents.length?'':'disabled'}>${ico('party',13)}${T(lcGw.win?'lc.g.redraw':'lc.g.draw')}</button></div>
    <button class="sm" data-lcact="gwclear">${ico('trash',13)}${T('lc.g.clear')}</button>${noAcc}<p class="hint">${T('lc.g.hint')}</p>`;
  // file d'attente
  const qb=`<label class="chk"><span>${T('lc.q.open')}</span><input type="checkbox" data-lcq="open" ${lcQ.open?'checked':''}></label>
    ${lcQ.list.length?`<ol class="lctop">${lcQ.list.map((x,i)=>`<li><span>${esc(x.name)}</span><button class="sm" data-lcqdel="${i}" title="${esc(T('common.remove'))}">${ico('close',11)}</button></li>`).join('')}</ol>`:`<p class="hint">${T('lc.q.empty')}</p>`}
    <div class="stduo"><button data-lcact="qnext" ${lcQ.list.length?'':'disabled'}>${ico('next',13)}${T('lc.q.next')}</button><button data-lcact="qclear">${ico('trash',13)}${T('lc.q.clear')}</button></div><p class="hint">${T('lc.q.hint')}</p>`;
  // citations
  const quo=`<div class="fld"><label>${T('lc.c.list')}</label><textarea rows="5" data-lcquotes="1" spellcheck="false" placeholder="${esc(T('lc.c.ph'))}">${esc((stData.quotes||[]).join('\n'))}</textarea></div><p class="hint">${T('lc.c.hint')}</p>`;
  // mini-jeux
  const game=lcGuess?`<p class="hint">${T('lc.m.running',{min:lcGuess.min,max:lcGuess.max})}</p><div class="stduo"><button data-lcact="gstop">${ico('square',13)}${T('lc.m.stop')}</button><button data-lcact="ghint">${ico('chat',13)}${T('lc.m.hintBtn')}</button></div>`
    :`<div class="two"><div class="fld"><label>${T('lc.m.max')}</label><select data-lcgm="max">${[10,50,100,1000].map(v=>`<option value="${v}" ${+(stData.gmax||100)===v?'selected':''}>1 – ${v}</option>`).join('')}</select></div><div class="fld"><label>${T('lc.m.pts')}</label><input type="number" min="0" value="${+(stData.gpts==null?50:stData.gpts)}" data-lcgm="pts"></div></div>
    <button data-lcact="gstart">${ico('gamepad',13)}${T('lc.m.start')}</button>`;
  h+=sec('lcev','bell','lc.ev.title',evb)+sec('lcth','palette','lc.th.title',lcThemeHTML())+sec('lcloy','gem','lc.l.title',loy,!!L.on)
    +sec('lcgw','party','lc.g.title',gw,lcGw.on?true:null)+sec('lcq','flag','lc.q.title',qb,lcQ.open?true:null)+sec('lcquo','chat','lc.c.title',quo)
    +sec('lcgame','gamepad','lc.m.title',game+`<p class="hint">${T('lc.m.hint')}</p>`,lcGuess?true:null);
  return h;
}}
$('#stSide').addEventListener('change',e=>{const t=e.target;
  if(t.dataset.lcl){const L=lcLoy(),k=t.dataset.lcl;L[k]=t.type==='checkbox'?t.checked:t.type==='number'||k==='every'?Math.max(0,+t.value||0):t.value.trim().slice(0,20)||'points';stSave();lcRedraw();return}
  if(t.dataset.lcrw){const[i,k]=t.dataset.lcrw.split(':'),r=lcLoy().rewards[+i];if(r){r[k]=k==='c'?Math.max(1,+t.value||1):t.value.trim().slice(0,40);stSave()}return}
  if(t.dataset.lcg){const G=lcGwCfg(),k=t.dataset.lcg;G[k]=t.type==='checkbox'?t.checked:k==='cost'?Math.max(0,+t.value||0):(t.value.trim().split(/\s+/)[0]||'!join').slice(0,20);stSave();return}
  if(t.dataset.lcq){lcQ.open=t.checked;if(lcQ.open)cxSayAll(T('lc.q.opened'));lcRedraw();return}
  if(t.dataset.lcquotes){stData.quotes=t.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,500);stSave();return}
  if(t.dataset.lcgm){stData['g'+t.dataset.lcgm]=Math.max(0,+t.value||0);stSave();return}
  if(t.dataset.lcthv){const th=Object.assign({},stData.theme||LC_THEMES.violet);th[t.dataset.lcthv]=t.value;stData.theme=th;stSave();return}
  if(t.dataset.lcvar){const it=stSel();if(!it||!it.o.vars)return;const[i,k]=t.dataset.lcvar.split(':'),v=it.o.vars[+i];if(!v)return;v[k]=k==='min'||k==='dur'?Math.max(0,+t.value||0):t.value;stSave();return}
});
$('#stSide').addEventListener('click',async e=>{
  const t=e.target,g=s=>{const el=t.closest('['+s+']');return el?el.getAttribute(s):null};let n;
  if((n=g('data-lcrep'))!=null){lcReplay(+n);return}
  if((n=g('data-lcqdel'))!=null){lcQ.list.splice(+n,1);lcRedraw();return}
  if((n=g('data-lcth'))){lcThemeApply(LC_THEMES[n]);stSideUI();return}
  const vb=t.closest('[data-lcvact]');if(vb){const it=stSel();if(!it||it.kind!=='alerts')return;const a=vb.dataset.lcvact,i=+vb.dataset.i,vs=it.o.vars||(it.o.vars=[]);
    if(a==='add'){vs.push({type:'any',min:vs.length?(+vs[vs.length-1].min||0)*5||100:100,col:'#fbbf24',img:'',snd:'',tpl:'',dur:0});stSave();stSideUI();return}
    if(a==='del'){vs.splice(i,1);stSave();stSideUI();return}
    if(a==='test'){const v=vs[vs.length-1],ty=v&&v.type!=='any'?v.type:'bits';stAlert({type:ty,name:T('st.chat.testName'),amount:String(v?Math.max(1,+v.min||1):100),text:'',test:true});return}
    if(a==='img'||a==='snd'){if(!FS){toast(T('msg.onlyInApp'));return}const want=a==='img'?'image':'audio';const l=await FS.pickMedia(T(a==='img'?'deco.img':'deco.snd')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)===want);
      if(f&&vs[i]){vs[i][a]=f.path;if(a==='snd')stLookSnd(f.path);stSave();stSideUI()}return}
    return}
  const b=t.closest('[data-lcact]');if(!b)return;const a=b.dataset.lcact;
  if(a==='evtest'){stAlertTest();return}
  if(a==='evclear'){stData.evh=[];stSave();lcRedraw();return}
  if(a==='thapply'){lcThemeApply(Object.assign({font:'Bahnschrift'},stData.theme||LC_THEMES.violet));return}
  if(a==='thexp'){const th=stData.theme||LC_THEMES.violet;download(new Blob([JSON.stringify({dedcutTheme:1,acc:th.acc,txt:th.txt,font:th.font||'Bahnschrift'},null,1)],{type:'application/json'}),'theme-dedcut.json');return}
  if(a==='thimp'){$('#lcThIn').click();return}
  if(a==='rwadd'){lcLoy().rewards.push({n:T('lc.l.rwDef'),c:500});stSave();lcRedraw();return}
  if(a==='rwdel'){lcLoy().rewards.splice(+b.dataset.i,1);stSave();lcRedraw();return}
  if(a==='loyreset'){if(!b.dataset.sure){b.dataset.sure='1';b.textContent=T('lc.l.sure');setTimeout(()=>{if(b.isConnected)lcRedraw()},4000);return} // 2e clic = confirmation
    const L=lcLoy();L.users={};L.hist=[];stSave();lcRedraw();return}
  if(a==='gwstart'){lcGw.on=true;lcGw.ents=new Map();lcGw.win=null;cxSayAll(T('lc.g.announce',{kw:lcGwCfg().kw}));lcRedraw();return}
  if(a==='gwstop'){lcGw.on=false;lcRedraw();return}
  if(a==='gwdraw'){if(lcGw.win){const k=[...lcGw.ents.entries()].find(([,v])=>v===lcGw.win);if(k)lcGw.ents.delete(k[0])}lcGwDraw();return}
  if(a==='gwclear'){lcGw.on=false;lcGw.ents=new Map();lcGw.win=null;lcRedraw();return}
  if(a==='qnext'){const x=lcQ.list.shift();if(x){cxSayAll(T('lc.q.turn',{user:x.name}));toast(T('lc.q.turn',{user:x.name}))}lcRedraw();return}
  if(a==='qclear'){lcQ.list=[];lcRedraw();return}
  if(a==='gstart'){const max=+(stData.gmax||100);lcGuess={n:1+Math.floor(Math.random()*max),min:1,max,pts:+(stData.gpts==null?50:stData.gpts)};cxSayAll(T('lc.m.announce',{max}));lcRedraw();return}
  if(a==='ghint'){if(lcGuess)cxSayAll(T('lc.m.clue',{n:lcGuess.n%2?T('lc.m.odd'):T('lc.m.even')}));return}
  if(a==='gstop'){if(lcGuess)cxSayAll(T('lc.m.ended',{n:lcGuess.n}));lcGuess=null;lcRedraw();return}
});

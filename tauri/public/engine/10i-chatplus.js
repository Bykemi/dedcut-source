/* ---------- Outils du chat du studio (v4.42) ----------
   Onglet « Outils » : voix qui lit le chat, emotes (Twitch, Kick, 7TV) et badges, mots interdits, bot (commandes et
   messages automatiques), sondages du chat (toutes les plateformes) et sondages / prédictions Twitch, avec la source
   « Sondage » pour les montrer sur le live. Tout se passe sur le PC : la voix vient de Windows, et rien n'est envoyé
   ailleurs que sur les plateformes que la personne a reliées. Réglages gardés dans stData.cx. */
const CX_DEF=()=>({
  tts:{on:false,voice:'',rate:0,vol:80,mode:'all',who:'all',name:true,alerts:true,live:true,me:true},
  emo:{on:true,seventv:true,badges:true},
  ban:{on:false,words:'',links:false,plat:false},
  bot:{on:false,cmds:[{k:'!discord',r:''},{k:'!uptime',r:''}],auto:'',every:15},
  poll:{mode:'chat',q:'',opts:['',''],dur:60,say:true}
});
let cxFilled=null;
function stCx(){
  if(cxFilled!==stData){const d=CX_DEF(),c=stData.cx||(stData.cx={});for(const k in d)c[k]=Object.assign(d[k],c[k]);cxFilled=stData}
  return stData.cx;
}
const cxGet=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],stCx());
function cxSetv(p,v){const ks=p.split('.'),last=ks.pop();const o=ks.reduce((a,k)=>a[k],stCx());o[last]=v;stSave()}
const cxNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const cxStaff=m=>!!m.own||(m.badges||[]).some(b=>b==='owner'||b==='mod');
const cxPlain=m=>(m.parts||[m.text]).filter(p=>typeof p==='string').join(' ').replace(/\s+/g,' ').trim();
// textes envoyés par DedCut (bot, annonces) : quand ils reviennent par le chat, ils ne sont ni lus ni traités
const cxSent=new Map();
function cxSentAdd(t){const now=Date.now();cxSent.set(String(t).trim(),now);for(const[k,v]of cxSent)if(now-v>60000)cxSent.delete(k)}

/* ---------- point d'entrée : chaque message du chat (10c-chat.js) ---------- */
let cxCount=0;
function stCxIn(m){
  const C=stCx();
  if(cxSent.has(String(m.text).trim()))m.bot=true;
  if(C.emo.on){cxEmoLoad(m);const p=cxParts(m);if(p)m.parts=p}
  if(C.ban.on&&!cxStaff(m)&&!m.bot&&cxBanned(m.text)){
    m.hidden=true;
    if(C.ban.plat){const a=stAcc[m.src];if(a&&a.on()&&a.acts&&a.acts(m).includes('del'))a.mod('del',m).then(()=>{m.modded='del';if(stSide==='chat')stSideUI()},()=>{})}
    return;
  }
  if(m.bot)return;
  cxCount++;
  cxVote(m);
  if(C.bot.on)cxBot(m);
  const t=C.tts;
  if(t.on&&!(m.badges||[]).includes('owner')&&!m.own){
    let s=cxPlain(m);
    if(t.mode==='cmd'){const k=s.match(/^!tts\s+(.+)/i);s=k?k[1]:''}else if(/^!/.test(s))s='';
    if(s&&(t.who!=='subs'||(m.badges||[]).length))cxSay(t.name?T('cx.tts.says',{name:m.name,text:s}):s);
  }
}
// alertes (abonnement, raid, dons…) lues à voix haute
function stCxAlert(a){
  const t=stCx().tts;if(!t.on||!t.alerts||a.type==='pin'||a.test)return;
  cxSay(T('st.al.'+a.type,{n:a.amount||''})+' : '+a.name+(a.text?'. '+a.text:''));
}

/* ---------- (1) voix qui lit le chat : une file de 6 messages, son envoyé dans le live et/ou les haut-parleurs ---------- */
const cxT={q:[],busy:false,cur:null};let cxVoices=null;
const cxClean=s=>String(s).replace(/https?:\/\/\S+|www\.\S+/gi,' '+T('cx.tts.link')+' ').replace(/(.)\1{3,}/gu,'$1$1$1').replace(/\s+/g,' ').trim().slice(0,220);
function cxSay(text){text=cxClean(text);if(!text)return;if(cxT.q.length>=6)cxT.q.shift();cxT.q.push(text);cxRun()}
async function cxRun(){
  if(cxT.busy||!cxT.q.length)return;cxT.busy=true;
  const text=cxT.q.shift(),c=stCx().tts,F=window.dedcutFS;
  try{
    if(F&&F.ttsLive&&st.ac){
      const b64=await F.ttsLive(text,c.voice||'',Math.round(+c.rate||0)),bin=atob(b64),u=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      const buf=await st.ac.decodeAudioData(u.buffer),s=st.ac.createBufferSource(),g=st.ac.createGain();
      s.buffer=buf;g.gain.value=(+c.vol||0)/100;s.connect(g);
      if(c.live!==false)g.connect(st.bus);
      if(c.me!==false){const mon=st.ac.createGain();mon.gain.value=.9;g.connect(mon);mon.connect(st.ac.destination)}
      cxT.cur=s;await new Promise(r=>{s.onended=r;s.start()});
    }else if('speechSynthesis' in window){ // dans le navigateur : seulement dans les haut-parleurs
      await new Promise(r=>{const v=new SpeechSynthesisUtterance(text);v.rate=Math.pow(2,(+c.rate||0)/6);v.volume=(+c.vol||0)/100;v.onend=v.onerror=r;cxT.cur={stop:()=>{speechSynthesis.cancel();r()}};speechSynthesis.speak(v)});
    }
  }catch(e){}
  cxT.cur=null;cxT.busy=false;cxRun();
}
function cxSkip(){cxT.q.length=0;try{cxT.cur&&cxT.cur.stop()}catch(e){}}
async function cxLoadVoices(){
  const F=window.dedcutFS;if(cxVoices||!F||!F.ttsVoices)return;
  try{cxVoices=await F.ttsVoices()}catch(e){cxVoices=[]}
  if(stSide==='tools')cxRedraw();
}

/* ---------- (2) emotes et badges ---------- */
const cx7=new Map(); // 'global' ou 'twitch:<id>' / 'kick:<id>' → Map(nom → image) ; null pendant le chargement
function cx7Load(key,url,pick){
  if(cx7.has(key))return;cx7.set(key,null);
  fetch(url).then(r=>r.ok?r.json():null).then(j=>{const list=(j&&pick(j))||[],mp=new Map();
    for(const e of list){const h=e.data&&e.data.host;if(e.name&&h&&h.url)mp.set(e.name,'https:'+h.url+'/2x.webp')}cx7.set(key,mp)}).catch(()=>cx7.set(key,new Map()));
}
function cxEmoLoad(m){
  if(!stCx().emo.seventv||(m.src!=='twitch'&&m.src!=='kick'))return;
  cx7Load('global','https://7tv.io/v3/emote-sets/global',j=>j.emotes);
  if(m.room){const[pf,id]=m.room.split(':');if(id)cx7Load(m.room,'https://7tv.io/v3/users/'+pf+'/'+encodeURIComponent(id),j=>j.emote_set&&j.emote_set.emotes)}
}
// découpe le message en morceaux : texte ou emote {e: image, n: nom}
function cxParts(m){
  let parts=[m.text];
  if(m.src==='twitch'&&m.emotes){
    const cps=[...m.text],marks=[];
    for(const grp of String(m.emotes).split('/')){const[id,pos]=grp.split(':');if(!id||!pos)continue;
      for(const r of pos.split(',')){const[a,b]=r.split('-').map(Number);if(b>=a&&b<cps.length)marks.push([a,b,id])}}
    marks.sort((x,y)=>x[0]-y[0]);parts=[];let i=0;
    for(const[a,b,id]of marks){if(a<i)continue;if(a>i)parts.push(cps.slice(i,a).join(''));parts.push({e:'https://static-cdn.jtvnw.net/emoticons/v2/'+encodeURIComponent(id)+'/default/dark/2.0',n:cps.slice(a,b+1).join('')});i=b+1}
    if(i<cps.length)parts.push(cps.slice(i).join(''));
  }else if(m.src==='kick'&&m.raw&&/\[emote:\d+:/.test(m.raw)){
    parts=[];let i=0;const re=/\[emote:(\d+):([^\]]*)\]/g;let r;
    while((r=re.exec(m.raw))){if(r.index>i)parts.push(m.raw.slice(i,r.index));parts.push({e:'https://files.kick.com/emotes/'+r[1]+'/fullsize',n:r[2]});i=re.lastIndex}
    if(i<m.raw.length)parts.push(m.raw.slice(i));
  }
  if(stCx().emo.seventv){
    const maps=[cx7.get('global'),m.room&&cx7.get(m.room)].filter(Boolean);
    if(maps.some(x=>x.size))parts=parts.flatMap(p=>{
      if(typeof p!=='string')return[p];const out=[];
      for(const tok of p.split(/(\s+)/)){const u=tok&&maps.reduce((a,mp)=>a||mp.get(tok),'');
        if(u)out.push({e:u,n:tok});else if(typeof out[out.length-1]==='string')out[out.length-1]+=tok;else if(tok)out.push(tok)}
      return out;
    });
  }
  return parts.some(p=>typeof p!=='string')?parts:null;
}
function stTextHTML(m){
  return(m.parts||[m.text]).map(p=>typeof p==='string'?esc(p):`<img class="emo" src="${esc(p.e)}" alt="${esc(p.n)}" title="${esc(p.n)}" loading="lazy">`).join('');
}
function stBadgeHTML(m){
  if(!m.badges||!m.badges.length||stCx().emo.badges===false)return'';
  return m.badges.map(b=>{const d=ST_BDG[b];return d?`<i class="bdg" style="background:${d[0]}" title="${esc(T('cx.bdg.'+b))}">${ico(d[1],10)}</i>`:''}).join('');
}

/* ---------- (3) mots interdits ---------- */
let cxBanC={src:null,list:[]};
const cxCJK=/[぀-ヿ㐀-鿿가-힯]/;
function cxBanned(text){
  const C=stCx().ban;
  if(cxBanC.src!==C.words)cxBanC={src:C.words,list:String(C.words||'').split(/[\n,;]+/).map(w=>cxNorm(w).trim()).filter(Boolean)};
  const n=cxNorm(text),t=' '+n.replace(/[^\p{L}\p{N}*']+/gu,' ')+' ';
  for(const w of cxBanC.list){
    if(cxCJK.test(w)){if(n.includes(w.replace(/\*$/,'')))return true;continue}
    const k=w.replace(/[^\p{L}\p{N}*' ]+/gu,' ').replace(/\s+/g,' ').trim();if(!k)continue;
    if(k.endsWith('*')?t.includes(' '+k.slice(0,-1)):t.includes(' '+k+' '))return true;
  }
  return!!(C.links&&/(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|fr|io|gg|tv|ly|be|xyz|me|co|link|app|shop)\b)/i.test(text));
}

/* ---------- (4) bot : commandes et messages automatiques ---------- */
const cxCool={};
const cxDur=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),mn=Math.floor(s%3600/60);return h?h+' h '+String(mn).padStart(2,'0'):mn+' min'};
function cxBot(m){
  const s=String(m.text||'').trim();if(!s.startsWith('!'))return;
  const k=cxNorm(s.split(/\s+/)[0]),cmd=(stCx().bot.cmds||[]).find(c=>c.k&&cxNorm(c.k.trim().startsWith('!')?c.k.trim():'!'+c.k.trim())===k&&String(c.r||'').trim());
  if(!cmd)return;const now=Date.now();if(now-(cxCool[k]||0)<10000)return;cxCool[k]=now;
  const up=O.live&&O.live.on?cxDur(O.live.el):T('cx.bot.offline');
  cxReply(m.src,String(cmd.r).replace(/\{user\}/gi,m.name).replace(/\{uptime\}/gi,up));
}
function cxReply(src,text){
  text=String(text).slice(0,450);const a=stAcc[src];cxSentAdd(text);
  if(a&&a.on()&&a.canSay&&a.canSay())a.say(text).catch(e=>stAccFail(a.name,e));
  else if(src==='test')setTimeout(()=>stChatAdd({src:'test',name:'DedCut',color:'#8b5cf6',text}),300); // essai sans compte
}
function cxSayAll(text){cxSentAdd(text);for(const a of stSayList())a.say(String(text).slice(0,450)).catch(()=>{})}
let cxAutoT=0,cxAutoI=0;
setInterval(()=>{
  if(!stData||!O.live||!O.live.on){cxAutoT=0;return}
  const C=stCx().bot;if(!C.on)return;
  const list=String(C.auto||'').split('\n').map(s=>s.trim()).filter(Boolean);if(!list.length)return;
  if(!cxAutoT){cxAutoT=Date.now();return}
  if(Date.now()-cxAutoT<(+C.every||15)*60000||cxCount<1)return;
  cxAutoT=Date.now();cxCount=0;cxSayAll(list[cxAutoI++%list.length]);
},20000);

/* ---------- (10) sondages du chat, sondages et prédictions Twitch ---------- */
let cxP=null; // {kind:'chat'|'twpoll'|'twpred', q, opts:[{t, v, pts, id}], votes, end, state:'run'|'lock'|'done', win, until, twid}
const cxTot=P=>P.opts.reduce((a,o)=>a+(o.v||0),0);
const cxWin=P=>{let w=-1,b=0;P.opts.forEach((o,i)=>{if((o.v||0)>b){b=o.v;w=i}});return w};
function cxPollStart(){
  const P=stCx().poll,q=String(P.q||'').trim(),opts=(P.opts||[]).map(s=>String(s||'').trim()).filter(Boolean),dur=+P.dur||60;
  if(!q||opts.length<2){toast(T('cx.poll.need'));return}
  const b=typeof twCfg==='function'?twCfg().id:'';
  if(P.mode==='twpoll'||P.mode==='twpred'){
    const poll=P.mode==='twpoll';
    const body=poll?{broadcaster_id:b,title:q.slice(0,60),choices:opts.slice(0,5).map(t=>({title:t.slice(0,25)})),duration:Math.max(15,Math.min(1800,dur))}
      :{broadcaster_id:b,title:q.slice(0,45),outcomes:opts.slice(0,10).map(t=>({title:t.slice(0,25)})),prediction_window:Math.max(30,Math.min(1800,dur))};
    twApi('POST',poll?'polls':'predictions',body).then(j=>{const d=j.data&&j.data[0];if(!d)return;
      cxP={kind:P.mode,q,opts:(poll?d.choices:d.outcomes).map(c=>({t:c.title,v:0,pts:0,id:c.id})),end:Date.now()+dur*1000,state:'run',twid:d.id};cxRedraw()},e=>stAccFail('Twitch',e));
    return;
  }
  cxP={kind:'chat',q,opts:opts.slice(0,9).map(t=>({t,v:0})),votes:new Map(),end:Date.now()+dur*1000,state:'run'};
  if(P.say)cxSayAll(T('cx.poll.announce',{q,list:cxP.opts.map((o,i)=>(i+1)+' = '+o.t).join(' · ')}));
  cxRedraw();
}
function cxVote(m){
  if(!cxP||cxP.kind!=='chat'||cxP.state!=='run')return;
  const g=String(m.text).trim().match(/^(?:!vote\s*)?(\d{1,2})$/i);if(!g)return;
  const i=+g[1]-1;if(i<0||i>=cxP.opts.length)return;
  const who=m.src+':'+(m.uid||m.name),prev=cxP.votes.get(who);if(prev===i)return;
  if(prev!=null)cxP.opts[prev].v--;cxP.opts[i].v++;cxP.votes.set(who,i);cxPollUI(true);
}
function cxPollEnd(){ // fin d'un sondage du chat (temps écoulé ou bouton)
  if(!cxP||cxP.kind!=='chat'||cxP.state!=='run')return;
  cxP.state='done';cxP.win=cxWin(cxP);cxP.until=Date.now()+20000;
  if(stCx().poll.say){const w=cxP.opts[cxP.win],tot=cxTot(cxP);cxSayAll(w?T('cx.poll.won',{opt:w.t,pct:Math.round(w.v*100/tot)}):T('cx.poll.noVote'))}
  cxRedraw();
}
// événements Twitch (EventSub, 10e-twitch.js) : aussi pour un sondage lancé depuis le site de Twitch
function stPollTw(type,ev){
  const poll=type.startsWith('channel.poll.');
  if(!cxP||cxP.twid!==ev.id)cxP={kind:poll?'twpoll':'twpred',q:ev.title,opts:[],state:'run',twid:ev.id};
  const list=poll?ev.choices:ev.outcomes;
  if(list)cxP.opts=list.map(c=>({t:c.title,id:c.id,v:poll?(+c.votes||(+c.channel_points_votes||0)+(+c.bits_votes||0)):(+c.users||0),pts:+c.channel_points||0}));
  const end=ev.ends_at||ev.locks_at;if(end)cxP.end=Date.parse(end);
  if(/\.lock$/.test(type))cxP.state='lock';
  if(/\.end$/.test(type)){
    cxP.state='done';cxP.until=Date.now()+20000;
    if(poll)cxP.win=cxWin(cxP);else{cxP.win=cxP.opts.findIndex(o=>o.id===ev.winning_outcome_id);cxP.canceled=ev.status==='canceled'}
  }
  cxRedraw();
}
function cxTwPatch(body){const poll=cxP.kind==='twpoll';return twApi('PATCH',poll?'polls':'predictions',Object.assign({broadcaster_id:twCfg().id,id:cxP.twid},body)).catch(e=>stAccFail('Twitch',e))}
setInterval(()=>{
  if(!cxP)return;const now=Date.now();
  if(cxP.kind==='chat'&&cxP.state==='run'&&now>cxP.end)cxPollEnd();
  else if(cxP.kind==='twpred'&&cxP.state==='run'&&cxP.end&&now>cxP.end+3000){cxP.state='lock';cxRedraw()} // si l'événement « fermé » tarde
  else if(cxP.state==='run')cxPollUI(true);
},1000);

/* ---------- source « Sondage » (sur l'image du live) ---------- */
ST_KINDS.poll='poll';
ST_NEW.poll={o:()=>({color:'#8b5cf6',bgp:80}),r:()=>({x:.64,y:.05,w:.33,h:.4})};
const cxClock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
ST_DRAW.poll=(g,it,x,y,w,h)=>{
  const P=cxP,now=Date.now();
  if(!P||!P.opts.length||(P.state==='done'&&now>(P.until||0))){if(!O.live&&!O.rec)stHolder(g,x,y,w,h,T('st.k.poll'));return}
  const o=it.o,ac=o.color||'#8b5cf6',n=P.opts.length,tot=cxTot(P),fit=k=>Math.min(h/(2.5+k*1.02+n*1.24),w/9);
  let u=fit(1);g.font=stFont(u*.74,700);let ql=stWrap(g,P.q,w-u*1.2,0).slice(0,2);if(ql.length>1){u=fit(2);g.font=stFont(u*.74,700);ql=stWrap(g,P.q,w-u*1.2,0).slice(0,2)}
  const r=u*.55,pad=u*.6;
  const by0=pad+u*1.45+ql.length*u*1.02-u*.2,bh=Math.max(4,Math.min(u*1.02,(h-pad-by0)/n-u*.22)),ch=Math.min(h,by0+n*(bh+u*.22)-u*.22+pad); // carte à la hauteur du contenu
  g.save();g.beginPath();g.roundRect(x,y,w,ch,r);g.fillStyle=stRgba('#0b0a12',(o.bgp==null?80:+o.bgp)/100);g.fill();
  g.lineWidth=Math.max(1,u*.06);g.strokeStyle=stRgba(ac,.55);g.stroke();g.clip();
  g.textBaseline='middle';g.textAlign='left';
  // en-tête : type + temps restant
  const hy=y+pad+u*.45;stIcoDraw(g,P.kind==='twpred'?'gem':'poll',x+pad+u*.4,hy,u*.8,ac);
  g.font=stFont(u*.6,700);g.fillStyle=ac;g.fillText(T('cx.poll.label_'+P.kind).toUpperCase(),x+pad+u*1.05,hy);
  const st2=P.state==='run'&&P.end?cxClock((P.end-now)/1000):P.state==='lock'?T('cx.poll.locked'):P.canceled?T('cx.poll.canceled'):T('cx.poll.result');
  g.textAlign='right';g.fillStyle='rgba(255,255,255,.75)';g.fillText(st2,x+w-pad,hy);g.textAlign='left';
  // question
  g.font=stFont(u*.74,700);g.fillStyle='#fff';
  ql.forEach((l,i)=>g.fillText(l,x+pad,y+pad+u*1.45+i*u*1.02));
  // barres
  let by=y+by0;
  P.opts.forEach((op,i)=>{
    const pct=tot?op.v/tot:0;op._a=op._a==null?pct:op._a+(pct-op._a)*.12;
    const win=P.state==='done'&&P.win===i,bx=x+pad,bw=w-pad*2;
    g.beginPath();g.roundRect(bx,by,bw,bh,bh*.3);g.fillStyle='rgba(255,255,255,.09)';g.fill();
    if(op._a>.002){g.beginPath();g.roundRect(bx,by,Math.max(bh*.6,bw*op._a),bh,bh*.3);g.fillStyle=win?ac:stRgba(ac,.55);if(win){g.shadowColor=ac;g.shadowBlur=u*.6}g.fill();g.shadowBlur=0}
    g.font=stFont(bh*.52,win?800:600);g.fillStyle='#fff';
    const label=(P.kind==='chat'?(i+1)+'. ':'')+op.t,val=Math.round(op._a*100)+' %';
    g.textAlign='right';g.fillText(val,bx+bw-bh*.35,by+bh/2);const vw=g.measureText(val).width;g.textAlign='left';
    g.save();g.beginPath();g.rect(bx,by,bw-vw-bh*.7,bh);g.clip();g.fillText(label,bx+bh*.35+(win?bh*.85:0),by+bh/2);g.restore();
    if(win)stIcoDraw(g,'crown',bx+bh*.62,by+bh/2,bh*.62,'#fff');
    by+=bh+u*.22;
  });
  g.restore();
};
ST_PROPS.poll=it=>{const o=it.o;return`<div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#8b5cf6')}"></div>
  <div class="fld"><label>${T('st.chat.bg')} <span>${o.bgp==null?80:o.bgp}</span></label><input type="range" min="0" max="100" value="${o.bgp==null?80:o.bgp}" data-o="bgp"></div>
  <button class="sm" data-sttab="tools">${ico('poll',14)}${T('cx.openTools')}</button>`};

/* ---------- onglet « Outils » ---------- */
const cxOpen={tts:true,emo:false,ban:false,bot:false,poll:false};
function cxRedraw(){if(stSide!=='tools')return;const b=$('#stSide');if(!b)return;const sc=b.scrollTop;stSideUI();b.scrollTop=sc}
function cxPollUI(onlyBox){if(stSide!=='tools')return;const b=$('#cxPollBox');if(onlyBox&&b)b.innerHTML=cxPollRes();else if(!onlyBox)cxRedraw()}
function cxPollRes(){
  const P=cxP,tot=cxTot(P),now=Date.now();
  const head=P.state==='run'&&P.end?cxClock((P.end-now)/1000):P.state==='lock'?T('cx.poll.locked'):P.canceled?T('cx.poll.canceled'):T('cx.poll.result');
  return`<div class="cxq">${esc(P.q)} <span class="hint">· ${esc(head)} · ${T('cx.poll.votes',{n:tot})}</span></div><div class="cxres">${P.opts.map((o,i)=>{const pct=tot?Math.round(o.v*100/tot):0;
    return`<div class="cxbar${P.state==='done'&&P.win===i?' win':''}"><u style="width:${pct}%"></u><span>${P.kind==='chat'?(i+1)+'. ':''}${esc(o.t)}</span><b>${pct} %</b>${P.kind==='twpred'&&o.pts?`<em>${T('cx.poll.points',{n:o.pts})}</em>`:''}</div>`}).join('')}</div>`;
}
function stToolsPanel(){
  const C=stCx(),F=window.dedcutFS;if(C.tts.on||cxOpen.tts)cxLoadVoices();
  const sec=(k,ic,title,body,on)=>`<details class="cxsec" data-cxsec="${k}"${cxOpen[k]?' open':''}><summary>${ico(ic,15)}<b>${T(title)}</b>${on!=null?`<i class="cxon${on?' on':''}">${T(on?'cx.on':'cx.off')}</i>`:''}</summary>${body}</details>`;
  const ck=(p,l)=>`<label class="chk"><span>${T(l)}</span><input type="checkbox" data-cx="${p}" ${cxGet(p)?'checked':''}></label>`;
  const sel=(p,l,opts)=>`<div class="fld"><label>${T(l)}</label><select data-cx="${p}">${opts.map(([v,n])=>`<option value="${esc(v)}" ${String(cxGet(p))===String(v)?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`;
  const rng=(p,l,mn,mx,shown)=>`<div class="fld"><label>${T(l)} <span>${shown}</span></label><input type="range" min="${mn}" max="${mx}" value="${cxGet(p)}" data-cx="${p}"></div>`;
  const say=stSayList().length>0,twOk=typeof twOn==='function'&&twOn();
  // (1) voix
  const vs=(cxVoices||[]).map(v=>[v.name,v.name+(v.lang?' · '+v.lang:'')]);
  if(C.tts.voice&&!vs.some(v=>v[0]===C.tts.voice))vs.unshift([C.tts.voice,C.tts.voice]);
  const tts=ck('tts.on','cx.tts.on')
    +(F&&F.ttsLive?sel('tts.voice','cx.tts.voice',[['',T('cx.tts.defVoice')],...vs])+(F.ttsSettings?`<button class="sm" data-cxact="voices">${ico('plus',13)}${T('cx.tts.addVoices')}</button>`:''):'')
    +`<div class="two">${rng('tts.rate','cx.tts.rate',-10,10,C.tts.rate>0?'+'+C.tts.rate:C.tts.rate)}${rng('tts.vol','cx.tts.vol',0,100,C.tts.vol)}</div>`
    +sel('tts.mode','cx.tts.mode',[['all',T('cx.tts.mode_all')],['cmd',T('cx.tts.mode_cmd')]])
    +sel('tts.who','cx.tts.who',[['all',T('cx.tts.who_all')],['subs',T('cx.tts.who_subs')]])
    +ck('tts.name','cx.tts.name')+ck('tts.alerts','cx.tts.alerts')+ck('tts.live','cx.tts.live')+ck('tts.me','cx.tts.me')
    +`<div class="stduo"><button data-cxact="ttstest">${ico('speak',14)}${T('cx.tts.test')}</button><button data-cxact="ttsskip">${ico('next',14)}${T('cx.tts.skip')}</button></div><p class="hint">${T('cx.tts.hint')}</p>`;
  // (2) emotes
  const emo=ck('emo.on','cx.emo.on')+ck('emo.seventv','cx.emo.seventv')+ck('emo.badges','cx.emo.badges')+`<p class="hint">${T('cx.emo.hint')}</p>`;
  // (3) mots interdits
  const ban=ck('ban.on','cx.ban.on')+`<div class="fld"><label>${T('cx.ban.words')}</label><textarea rows="4" data-cx="ban.words" placeholder="${esc(T('cx.ban.ph'))}" spellcheck="false">${esc(C.ban.words||'')}</textarea></div>`
    +ck('ban.links','cx.ban.links')+ck('ban.plat','cx.ban.plat')+`<p class="hint">${T('cx.ban.hint')}</p>`;
  // (4) bot
  const bot=ck('bot.on','cx.bot.on')+(say?'':`<p class="hint cxwarn">${T('cx.bot.noAcc')}</p>`)
    +`<h5>${T('cx.bot.cmds')}</h5>`+(C.bot.cmds||[]).map((c,i)=>`<div class="cxcmd"><input type="text" data-cxcmd="${i}:k" value="${esc(c.k||'')}" placeholder="!commande" spellcheck="false"><input type="text" data-cxcmd="${i}:r" value="${esc(c.r||'')}" placeholder="${esc(T('cx.bot.replyPh'))}"><button class="sm" data-cxact="cmddel" data-i="${i}" title="${esc(T('common.remove'))}">${ico('trash',13)}</button></div>`).join('')
    +`<button class="sm" data-cxact="cmdadd">${ico('plus',13)}${T('cx.bot.add')}</button><p class="hint">${T('cx.bot.cmdHint')}</p>`
    +`<div class="fld"><label>${T('cx.bot.auto')}</label><textarea rows="3" data-cx="bot.auto" placeholder="${esc(T('cx.bot.autoPh'))}">${esc(C.bot.auto||'')}</textarea></div>`
    +sel('bot.every','cx.bot.every',[5,10,15,20,30,45,60].map(v=>[v,v+' min']))+`<p class="hint">${T('cx.bot.autoHint')}</p>`;
  // (10) sondages
  let poll;
  if(cxP&&(cxP.state!=='done'||Date.now()<(cxP.until||0)+600000)){
    const P=cxP,acts=P.state==='done'?`<button class="sm" data-cxact="pollnew">${ico('plus',13)}${T('cx.poll.new')}</button>`
      :P.kind==='chat'?`<button class="sm" data-cxact="pollend">${ico('square',13)}${T('cx.poll.end')}</button>`
      :P.kind==='twpoll'?`<button class="sm" data-cxact="pollend">${ico('square',13)}${T('cx.poll.end')}</button>`
      :P.state==='run'?`<div class="stduo"><button data-cxact="polllock">${ico('lock',13)}${T('cx.poll.lock')}</button><button data-cxact="pollcancel">${ico('trash',13)}${T('cx.poll.cancel')}</button></div>`
      :`<p class="hint">${T('cx.poll.pickWin')}</p><div class="cxwins">${P.opts.map((o,i)=>`<button class="sm" data-cxact="pollwin" data-i="${i}">${ico('crown',13)}${esc(o.t)}</button>`).join('')}</div><button class="sm" data-cxact="pollcancel">${T('cx.poll.cancel')}</button>`;
    poll=`<div id="cxPollBox">${cxPollRes()}</div>${acts}`;
  }else{
    const P=C.poll,max=P.mode==='twpred'?10:P.mode==='twpoll'?5:9,mode=P.mode!=='chat'&&!twOk?'chat':P.mode;
    poll=`<div class="copt cxmodes">${['chat','twpoll','twpred'].map(k=>`<button data-cxmode="${k}" class="${mode===k?'on':''}" ${k!=='chat'&&!twOk?'disabled':''}>${T('cx.poll.mode_'+k)}</button>`).join('')}</div>`
      +(twOk?'':`<p class="hint">${T('cx.poll.twNeed')}</p>`)
      +`<div class="fld"><label>${T('cx.poll.q')}</label><input type="text" data-cx="poll.q" value="${esc(P.q||'')}" maxlength="${mode==='twpred'?45:mode==='twpoll'?60:120}" placeholder="${esc(T('cx.poll.qPh'))}"></div>
      <h5>${T('cx.poll.opts')}</h5>`+P.opts.slice(0,max).map((t,i)=>`<div class="cxopt"><i>${i+1}</i><input type="text" data-cxopt="${i}" value="${esc(t||'')}" maxlength="${mode==='chat'?60:25}" placeholder="${esc(T('cx.poll.optPh',{n:i+1}))}">${P.opts.length>2?`<button class="sm" data-cxact="optdel" data-i="${i}">${ico('trash',13)}</button>`:'<span></span>'}</div>`).join('')
      +(P.opts.length<max?`<button class="sm" data-cxact="optadd">${ico('plus',13)}${T('cx.poll.addOpt')}</button>`:'')
      +sel('poll.dur','cx.poll.dur',(mode==='twpred'?[30,60,120,300,600,900,1800]:[30,60,120,180,300,600]).map(v=>[v,v<60?v+' s':v/60+' min']))
      +(mode==='chat'?ck('poll.say','cx.poll.say')+`<p class="hint">${T('cx.poll.voteHint')}</p>`:'')
      +`<button class="pri" data-cxact="pollgo">${ico('play',14)}${T('cx.poll.go')}</button>`;
  }
  const hasSrc=stData.scenes.some(s=>s.items.some(i=>i.kind==='poll'));
  poll+=hasSrc?'':`<p class="hint">${T('cx.poll.srcHint')}</p><button class="sm" data-cxact="addpoll">${ico('plus',13)}${T('cx.poll.addSrc')}</button>`;
  return`<h4>${ico('sliders',15)}${T('st.tab.tools')}</h4>`
    +sec('tts','speak','cx.tts.title',tts,!!C.tts.on)+sec('emo','gem','cx.emo.title',emo,!!C.emo.on)+sec('ban','ban','cx.ban.title',ban,!!C.ban.on)
    +sec('bot','robot','cx.bot.title',bot,!!C.bot.on)+sec('poll','poll','cx.poll.title',poll,cxP&&cxP.state!=='done'?true:null);
}
$('#stSide').addEventListener('toggle',e=>{const s=e.target.closest&&e.target.closest('[data-cxsec]');if(s&&s===e.target){cxOpen[s.dataset.cxsec]=s.open;if(s.open&&s.dataset.cxsec==='tts')cxLoadVoices()}},true);
$('#stSide').addEventListener('input',e=>{
  const t=e.target,p=t.dataset.cx;
  if(p){const v=t.type==='checkbox'?t.checked:t.type==='range'?+t.value:t.tagName==='SELECT'&&/^\d+$/.test(t.value)&&p!=='tts.voice'?+t.value:t.value;cxSetv(p,v);
    if(t.type==='range'){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=p==='tts.rate'&&v>0?'+'+v:v}return}
  if(t.dataset.cxcmd){const[i,k]=t.dataset.cxcmd.split(':');const c=stCx().bot.cmds[+i];if(c){c[k]=t.value;stSave()}return}
  if(t.dataset.cxopt!=null){stCx().poll.opts[+t.dataset.cxopt]=t.value;stSave()}
});
$('#stSide').addEventListener('change',e=>{const t=e.target;if(t.dataset.cx&&(t.type==='checkbox'||t.tagName==='SELECT'))cxRedraw()});
$('#stSide').addEventListener('click',e=>{
  const mb=e.target.closest('[data-cxmode]');if(mb){cxSetv('poll.mode',mb.dataset.cxmode);cxRedraw();return}
  const b=e.target.closest('[data-cxact]');if(!b)return;const a=b.dataset.cxact,C=stCx(),i=+b.dataset.i;
  if(a==='voices'){const F=window.dedcutFS;F.ttsSettings().then(()=>{cxVoices=null;setTimeout(cxLoadVoices,4000)},er=>toast(String(er&&er.message||er)));return}
  if(a==='ttstest'){if(st.ac&&st.ac.state==='suspended')st.ac.resume().catch(()=>{});cxSay(T('cx.tts.testText'));return}
  if(a==='ttsskip'){cxSkip();return}
  if(a==='cmdadd'){C.bot.cmds.push({k:'!',r:''});stSave();cxRedraw();return}
  if(a==='cmddel'){C.bot.cmds.splice(i,1);stSave();cxRedraw();return}
  if(a==='optadd'){C.poll.opts.push('');stSave();cxRedraw();return}
  if(a==='optdel'){C.poll.opts.splice(i,1);stSave();cxRedraw();return}
  if(a==='pollgo'){if(C.poll.mode!=='chat'&&!(typeof twOn==='function'&&twOn()))C.poll.mode='chat';cxPollStart();return}
  if(a==='pollend'){if(cxP.kind==='chat')cxPollEnd();else cxTwPatch({status:'TERMINATED'});return}
  if(a==='polllock'){cxTwPatch({status:'LOCKED'});return}
  if(a==='pollwin'){cxTwPatch({status:'RESOLVED',winning_outcome_id:cxP.opts[i].id});return}
  if(a==='pollcancel'){if(cxP.kind==='twpred')cxTwPatch({status:'CANCELED'});else{cxP=null;cxRedraw()}return}
  if(a==='pollnew'){cxP=null;cxRedraw();return}
  if(a==='addpoll'){stAdd('poll');return}
});

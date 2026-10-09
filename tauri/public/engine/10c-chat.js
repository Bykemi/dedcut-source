/* ---------- Chat en direct du studio (v4.41) ----------
   - Twitch : connexion de chat officielle, anonyme et en lecture seule (aucun compte, aucune clé) ;
   - YouTube : API officielle YouTube Data v3 avec la clé gratuite de l'utilisateur (gardée sur son PC), ou son compte relié ;
   - Kick : chat public de kick.com en lecture seule (le même que sur le site, aucun compte) ;
   - Facebook : commentaires du live d'une Page, avec le compte relié (10g-facebook.js).
   Les messages s'affichent dans l'onglet « Chat » du studio (pour la personne qui fait le live) et, avec la source
   « Chat du live », sur l'image envoyée (pour les spectateurs). Sans compte relié, rien n'est envoyé dans le chat. */
const stChat={msgs:[],twitch:null,yt:null,kick:null,fb:null,st:{}};
const ST_CHAT_COL={twitch:'#a970ff',youtube:'#ff3355',kick:'#53fc18',facebook:'#1877f2',test:'#94a3b8'};
const ST_CHAT_NAME={twitch:'Twitch',youtube:'YouTube',kick:'Kick',facebook:'Facebook'};
let stChatSeq=0;
function stChatCfg(){if(!stData.chat)stData.chat={twitch:'',yt:'',ytKey:'',kick:''};return stData.chat}
const stChatOn=()=>!!(stChat.twitch||stChat.yt||stChat.kick||stChat.fb);
// un chat est prêt à être connecté (chaîne, lien ou compte relié)
const stChatReady=()=>{const c=stChatCfg();return!!(c.twitch||c.yt||c.kick||ytOn()||fbReady())};
function stChatAdd(m){
  m.id=++stChatSeq;m.t=performance.now();m.text=String(m.text||'').slice(0,400);m.name=String(m.name||'?').slice(0,40);
  m.color=/^#[0-9a-f]{3,8}$/i.test(m.color||'')?m.color:''; // couleur venue d'internet : rien d'autre qu'une couleur
  if(!m.alert&&typeof stCxIn==='function')try{stCxIn(m)}catch(e){} // emotes, badges, mots interdits, bot, voix, votes (10i)
  stChat.msgs.push(m);if(stChat.msgs.length>300)stChat.msgs.splice(0,stChat.msgs.length-300);
  stChatAppend(m);
}
// message supprimé ou personne bannie sur la plateforme : on l'enlève aussi de DedCut (onglet Chat et image du live)
function stChatDrop(fn){const n=stChat.msgs.length;stChat.msgs=stChat.msgs.filter(m=>m.alert||!fn(m));if(stChat.msgs.length!==n&&stSide==='chat')stSideUI()}
function stChatState(src,state,err){stChat.st[src]={state,err:err||''};stChatStatusUI()}
const stForm=o=>({method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(o)});
const stBdgTw=s=>{const b=String(s||'');return[/(^|,)broadcaster\//.test(b)&&'owner',/(^|,)moderator\//.test(b)&&'mod',/(^|,)vip\//.test(b)&&'vip',/(^|,)(subscriber|founder)\//.test(b)&&'sub'].filter(Boolean)};
const stOpenLink=u=>window.dedcutFS?window.dedcutFS.openLink(u):window.open(u,'_blank','noopener');
const stAccFail=(src,e)=>toast(T('acc.fail',{src,error:String(e&&e.message||e).slice(0,90)}));

/* Twitch : IRC sur WebSocket, pseudo anonyme « justinfan… » (lecture seule) */
function stTwitchOn(name){
  stTwitchOff();
  const ch=String(name||'').trim().toLowerCase().replace(/^https?:\/\/(www\.)?twitch\.tv\//,'').replace(/^#/,'').split(/[/?#]/)[0];
  if(!/^[a-z0-9_]{3,25}$/.test(ch)){stChatState('twitch','err',T('st.chat.badChannel'));return}
  const tw={ch,closed:false,tries:0};stChat.twitch=tw;
  const open=()=>{
    if(tw.closed)return;stChatState('twitch','wait');
    const ws=new WebSocket('wss://irc-ws.chat.twitch.tv:443');tw.ws=ws;
    ws.onopen=()=>{ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');ws.send('PASS SCHMOOPIIE');ws.send('NICK justinfan'+(10000+Math.floor(Math.random()*80000)));ws.send('JOIN #'+ch)};
    ws.onmessage=e=>{
      for(const line of String(e.data).split('\r\n')){
        if(!line)continue;
        if(line.startsWith('PING')){ws.send('PONG :tmi.twitch.tv');continue}
        const m=line.match(/^(?:@(\S+) )?:([^!\s]+)!\S+ PRIVMSG #\S+ :(.*)$/);
        if(m){const tags={};(m[1]||'').split(';').forEach(kv=>{const i=kv.indexOf('=');if(i>0)tags[kv.slice(0,i)]=kv.slice(i+1)});
          let text=m[3];const act=text.match(/^\x01ACTION (.*)\x01$/);if(act)text=act[1];const nm=(tags['display-name']||m[2]).replace(/\\s/g,' ');
          stChatAdd({src:'twitch',name:nm,color:/^#[0-9a-f]{6}$/i.test(tags.color||'')?tags.color:'',text,tid:tags.id||'',uid:tags['user-id']||'',emotes:act?'':(tags.emotes||''),badges:stBdgTw(tags.badges),room:tags['room-id']?'twitch:'+tags['room-id']:''});
          if(+tags.bits>0)stAlert({irc:true,src:'twitch',type:'bits',name:nm,text:text.replace(/\b(cheer|kappa|pogchamp|biblethump)\d+\b/gi,'').trim(),amount:tags.bits});continue}
        const un=line.match(/^(?:@(\S+) )?:\S+ USERNOTICE #\S+(?: :(.*))?$/);
        if(un){const tg={};(un[1]||'').split(';').forEach(kv=>{const i=kv.indexOf('=');if(i>0)tg[kv.slice(0,i)]=kv.slice(i+1).replace(/\\s/g,' ')});
          const id=tg['msg-id'],nm=tg['display-name']||tg.login||'';
          if(id==='sub'||id==='resub'||id==='primepaidupgrade'||id==='giftpaidupgrade'||id==='anongiftpaidupgrade')stAlert({irc:true,src:'twitch',type:'sub',name:nm,text:un[2]||'',amount:+tg['msg-param-cumulative-months']>1?tg['msg-param-cumulative-months']:''});
          else if(id==='subgift')stAlert({irc:true,src:'twitch',type:'gift',name:nm,text:'→ '+(tg['msg-param-recipient-display-name']||''),amount:'1'});
          else if(id==='submysterygift')stAlert({irc:true,src:'twitch',type:'gift',name:nm,text:'',amount:tg['msg-param-mass-gift-count']||''});
          else if(id==='raid')stAlert({irc:true,src:'twitch',type:'raid',name:tg['msg-param-displayName']||nm,text:'',amount:tg['msg-param-viewerCount']||''});
          continue}
        // message supprimé / personne exclue par un modérateur
        const cm=line.match(/^@(\S+) :\S+ CLEARMSG /);if(cm){const t=(cm[1].match(/(?:^|;)target-msg-id=([^;]+)/)||[])[1];if(t)stChatDrop(x=>x.src==='twitch'&&x.tid===t);continue}
        const cc=line.match(/^@(\S+) :\S+ CLEARCHAT #\S+ :/);if(cc){const u=(cc[1].match(/(?:^|;)target-user-id=([^;]+)/)||[])[1];if(u)stChatDrop(x=>x.src==='twitch'&&x.uid===u);continue}
        if(/^:\S+ 366 /.test(line)){tw.tries=0;stChatState('twitch','on')}
      }
    };
    ws.onclose=()=>{if(tw.closed)return;stChatState('twitch','wait');tw.tries++;tw.timer=setTimeout(open,Math.min(30000,2000*tw.tries))};
  };
  open();
}
function stTwitchOff(){const t=stChat.twitch;if(!t)return;t.closed=true;clearTimeout(t.timer);try{t.ws&&t.ws.close()}catch(e){}stChat.twitch=null;delete stChat.st.twitch;stChatStatusUI()}

/* YouTube : API officielle, avec la clé de l'utilisateur ou son compte relié ; on respecte l'intervalle demandé par YouTube (6 s au moins).
   Avec le compte relié et sans lien, le live en cours de la chaîne est trouvé tout seul. */
function stYtId(s){s=String(s||'').trim();const m=s.match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/)||s.match(/^([A-Za-z0-9_-]{11})$/);return m?m[1]:null}
function stYtOn(link,key){
  stYtOff();const id=stYtId(link),acc=ytOn();key=String(key||'').trim();
  const useKey=/^[A-Za-z0-9_-]{20,80}$/.test(key);
  if(!id&&!acc){stChatState('youtube','err',T('st.chat.ytBadLink'));return}
  if(!useKey&&!acc){stChatState('youtube','err',T('st.chat.ytNeedKey'));return}
  const Y={closed:false,chat:null,page:'',first:true,seen:new Set(),id};stChat.yt=Y;
  const views=async()=>{if(Y.closed)return;try{const v=await api('videos',{part:'liveStreamingDetails',id:Y.id});const d=v.items&&v.items[0]&&v.items[0].liveStreamingDetails;stChat.viewers=d&&d.concurrentViewers!=null?+d.concurrentViewers:null}catch(e){}if(!Y.closed)Y.vt=setTimeout(views,30000)};
  // la clé de l'utilisateur sert à lire (son propre quota) ; sinon le compte relié
  const api=async(path,params)=>{
    if(!useKey)return ytApi('GET',path,params);
    const r=await fetch('https://www.googleapis.com/youtube/v3/'+path+'?'+new URLSearchParams({...params,key}).toString());
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const e=j.error||{},why=(e.errors&&e.errors[0]&&e.errors[0].reason)||'';throw new Error(why+'|'+r.status+'|'+(e.message||''))}
    return j;
  };
  const step=async()=>{
    if(Y.closed)return;let wait=20000;
    try{
      if(!Y.chat){
        stChatState('youtube','wait');
        if(Y.id){
          const v=await api('videos',{part:'liveStreamingDetails',id:Y.id});
          if(!v.items||!v.items.length)throw new Error('videoNotFound||');
          const d=v.items[0].liveStreamingDetails||{};Y.chat=d.activeLiveChatId||null;
        }else{const b=await ytFindLive(true);if(b){Y.id=b.id;Y.chat=b.chat}else wait=60000}
        if(!Y.chat)stChatState('youtube','wait',T('st.chat.ytNoLive'));
      }
      if(Y.chat){
        const r=await api('liveChat/messages',{liveChatId:Y.chat,part:'snippet,authorDetails',maxResults:'200',...(Y.page?{pageToken:Y.page}:{})});
        Y.page=r.nextPageToken||Y.page;stChatState('youtube','on');if(!Y.vt)views();
        const items=r.items||[];
        for(const it of(Y.first?items.slice(-5):items)){
          if(it.id){if(Y.seen.has(it.id))continue;Y.seen.add(it.id);if(Y.seen.size>1000)Y.seen=new Set([...Y.seen].slice(-500))}
          const s=it.snippet||{},a=it.authorDetails||{};
          if(!Y.first){const sc=s.superChatDetails,ss=s.superStickerDetails;
            if(s.type==='superChatEvent'&&sc)stAlert({src:'youtube',type:'superchat',name:a.displayName,text:sc.userComment||'',amount:sc.amountDisplayString||''});
            else if(s.type==='superStickerEvent'&&ss)stAlert({src:'youtube',type:'superchat',name:a.displayName,text:'',amount:ss.amountDisplayString||''});
            else if(s.type==='newSponsorEvent'||s.type==='memberMilestoneChatEvent')stAlert({src:'youtube',type:'member',name:a.displayName,text:s.type==='memberMilestoneChatEvent'&&s.memberMilestoneChatDetails?(s.memberMilestoneChatDetails.userComment||''):'',amount:''});
            else if(s.type==='membershipGiftingEvent')stAlert({src:'youtube',type:'gift',name:a.displayName,text:'',amount:(s.membershipGiftingDetails&&s.membershipGiftingDetails.giftMembershipsCount)||''});}
          if(s.type==='messageDeletedEvent'&&s.messageDeletedDetails){const t=s.messageDeletedDetails.deletedMessageId;stChatDrop(x=>x.src==='youtube'&&x.tid===t);continue}
          if(s.type==='userBannedEvent'&&s.userBannedDetails&&s.userBannedDetails.bannedUserDetails){const u=s.userBannedDetails.bannedUserDetails.channelId;stChatDrop(x=>x.src==='youtube'&&x.uid===u);continue}
          if(!s.displayMessage)continue;
          stChatAdd({src:'youtube',name:a.displayName,color:a.isChatOwner?'#fbbf24':a.isChatModerator?'#60a5fa':'',text:s.displayMessage,tid:it.id||'',uid:a.channelId||'',own:!!a.isChatOwner,badges:[a.isChatOwner&&'owner',a.isChatModerator&&'mod',a.isChatSponsor&&'sub'].filter(Boolean)});
        }
        Y.first=false;wait=Math.max(6000,+r.pollingIntervalMillis||6000);
      }
    }catch(e){
      const s=String(e.message);
      if(/quotaExceeded|rateLimitExceeded|dailyLimit/i.test(s)){stChatState('youtube','err',T('st.chat.ytQuota'));wait=300000}
      else if(/keyInvalid|API key|API_KEY|accessNotConfigured|SERVICE_DISABLED/i.test(s)){stChatState('youtube','err',T('st.chat.ytBadKey'));wait=60000}
      else if(/liveChatEnded|liveChatNotFound/i.test(s)){Y.chat=null;Y.page='';if(!stYtId(link))Y.id=null;stChatState('youtube','wait',T('st.chat.ytNoLive'))}
      else if(/liveChatDisabled/i.test(s)){stChatState('youtube','err',T('st.chat.ytOff'));wait=60000}
      else if(/videoNotFound/i.test(s)){stChatState('youtube','err',T('st.chat.ytBadLink'));wait=60000}
      else if(/invalid_grant|ytRelogin/.test(s)){stChatState('youtube','err',T('acc.relogin',{src:'YouTube'}));wait=60000}
      else stChatState('youtube','err',T('st.chat.netErr'));
    }
    if(!Y.closed)Y.timer=setTimeout(step,wait);
  };
  step();
}
function stYtOff(){const y=stChat.yt;if(!y)return;y.closed=true;clearTimeout(y.timer);clearTimeout(y.vt);stChat.viewers=null;stChat.yt=null;delete stChat.st.youtube;stChatStatusUI()}

/* Kick : chat public de kick.com (service Pusher, en lecture seule, aucun compte) — pas d'API officielle sans serveur,
   donc ça peut changer du jour au lendemain si Kick modifie son site */
const KICK_KEYS=['32cbd69e4b950bf97679','eb1d5f283081a78b932c']; // clés publiques utilisées par la page de kick.com
function stKickOn(name){
  stKickOff();
  const slug=String(name||'').trim().toLowerCase().replace(/^https?:\/\/(www\.)?kick\.com\//,'').replace(/^@/,'').split(/[/?#]/)[0];
  if(!/^[a-z0-9_-]{2,30}$/.test(slug)){stChatState('kick','err',T('st.chat.badChannel'));return}
  const K={slug,closed:false,tries:0,ki:0};stChat.kick=K;
  const info=async()=>{const r=await fetch('https://kick.com/api/v2/channels/'+slug,{headers:{Accept:'application/json'}});if(r.status===404)throw new Error('404');if(!r.ok)throw new Error(String(r.status));return r.json()};
  const live=j=>j&&j.livestream&&j.livestream.viewer_count!=null?+j.livestream.viewer_count:null;
  const views=async()=>{if(K.closed)return;try{stChat.kickViewers=live(await info())}catch(e){}if(!K.closed)K.vt=setTimeout(views,30000)};
  const open=async()=>{
    if(K.closed)return;stChatState('kick','wait');
    if(!K.room){
      try{const j=await info();K.room=j.chatroom&&j.chatroom.id;K.cid=j.id;K.uid=j.user_id;stChat.kickViewers=live(j);if(!K.room)throw new Error('404')}
      catch(e){if(K.closed)return;stChatState('kick','err',T(/404/.test(e.message)?'st.chat.badChannel':'st.chat.netErr'));K.timer=setTimeout(open,30000);return}
      if(K.closed)return;K.vt=setTimeout(views,30000);
    }
    const ws=new WebSocket('wss://ws-us2.pusher.com/app/'+KICK_KEYS[K.ki%KICK_KEYS.length]+'?protocol=7&client=js&version=8.4.0&flash=false');K.ws=ws;
    ws.onmessage=e=>{
      let m;try{m=JSON.parse(e.data)}catch(x){return}
      const ev=m.event;let d={};try{d=typeof m.data==='string'?JSON.parse(m.data):(m.data||{})}catch(x){}
      if(ev==='pusher:connection_established'){for(const ch of['chatrooms.'+K.room+'.v2','channel.'+K.cid])ws.send(JSON.stringify({event:'pusher:subscribe',data:{auth:'',channel:ch}}));return}
      if(ev==='pusher_internal:subscription_succeeded'){K.tries=0;stChatState('kick','on');return}
      if(ev==='pusher:ping'){ws.send('{"event":"pusher:pong","data":{}}');return}
      if(ev==='pusher:error'){if(+d.code>=4000&&+d.code<4100)K.ki++;return} // clé refusée : on essaie l'autre à la reconnexion
      if(ev==='App\\Events\\ChatMessageEvent'){const s=d.sender||{},idt=s.identity||{};
        stChatAdd({src:'kick',name:s.username,color:/^#[0-9a-f]{6}$/i.test(idt.color||'')?idt.color:'',text:String(d.content||'').replace(/\[emote:\d+:([^\]]*)\]/g,'$1'),raw:String(d.content||''),tid:String(d.id||''),uid:String(s.id||''),room:K.uid?'kick:'+K.uid:'',
          badges:[...new Set((idt.badges||[]).map(b=>({broadcaster:'owner',moderator:'mod',vip:'vip',og:'vip',subscriber:'sub',founder:'sub'})[b.type]).filter(Boolean))]});return}
      if(ev==='App\\Events\\SubscriptionEvent')stAlert({src:'kick',type:'sub',name:d.username,amount:+d.months>1?d.months:''});
      else if(ev==='App\\Events\\GiftedSubscriptionsEvent')stAlert({src:'kick',type:'gift',name:d.gifter_username||T('tw.anon'),amount:(d.gifted_usernames||[]).length||''});
      else if(ev==='App\\Events\\StreamHostEvent')stAlert({src:'kick',type:'raid',name:d.host_username,text:d.optional_message||'',amount:d.number_viewers||''});
      else if(ev==='App\\Events\\FollowersUpdated'&&d.followed&&d.username)stAlert({src:'kick',type:'follow',name:d.username});
      else if(ev==='App\\Events\\MessageDeletedEvent'&&d.message){const t=String(d.message.id);stChatDrop(x=>x.src==='kick'&&x.tid===t)}
      else if(ev==='App\\Events\\UserBannedEvent'&&d.user){const u=String(d.user.id);stChatDrop(x=>x.src==='kick'&&x.uid===u)}
    };
    ws.onclose=()=>{clearInterval(K.ping);if(K.closed)return;stChatState('kick','wait');K.tries++;K.timer=setTimeout(open,Math.min(30000,2000*K.tries))};
    clearInterval(K.ping);K.ping=setInterval(()=>{if(ws.readyState===1)ws.send('{"event":"pusher:ping","data":{}}')},60000);
  };
  open();
}
function stKickOff(){const k=stChat.kick;if(!k)return;k.closed=true;clearTimeout(k.timer);clearTimeout(k.vt);clearInterval(k.ping);try{k.ws&&k.ws.close()}catch(e){}stChat.kick=null;stChat.kickViewers=null;delete stChat.st.kick;stChatStatusUI()}

function stChatConnect(){
  const c=stChatCfg();if(!stChatReady()){toast(T('st.chat.needSrc'));return}
  if(c.twitch)stTwitchOn(c.twitch);else stTwitchOff();
  if(c.yt||ytOn())stYtOn(c.yt,c.ytKey);else stYtOff();
  if(c.kick)stKickOn(c.kick);else stKickOff();
  if(fbReady())stFbOn();else stFbOff();
}
function stChatDisconnect(){stTwitchOff();stYtOff();stKickOff();stFbOff()}
// spectateurs de chaque plateforme (barre d'état du studio, pendant le live)
function stViewersHTML(){
  return[['YouTube',stChat.viewers],['Twitch',tw.viewers],['Kick',stChat.kickViewers],['Facebook',stChat.fbViewers]].filter(v=>v[1]!=null)
    .map(([n,v])=>`<span class="stview">${ico('eye',13)}${n} ${v}</span>`).join('');
}

/* ---------- comptes reliés (Twitch, YouTube, Facebook) : chaque fichier s'inscrit ici ----------
   { name, col, ok() appli configurée, on() connecté, who(), state(), pending(), login(), logout(), cancel(),
     canSay(), say(text), acts(m) boutons de modération, mod(act,m), chan {get, load, save, game}, adv(k), extra() } */
const stAcc={};let stAccOpen=true;
function stAccHTML(){
  const rows=Object.entries(stAcc).map(([k,a])=>{
    const dot=`<i class="stsrc" style="background:${a.col}"></i><b>${esc(a.name)}</b>`,p=a.pending();
    if(a.on()){const s=a.state?a.state():'';
      return`<div class="acrow on">${dot}<span class="hint">${esc(a.who()||'')}${s?'<br>'+esc(s):''}</span><button class="sm" data-accout="${k}">${T('tw.logout')}</button></div>${a.extra?a.extra():''}${a.chan?stChanHTML(k,a):''}`}
    if(p)return`<div class="acrow">${dot}<span class="hint"></span><button class="sm" data-acccancel="${k}">${T('tw.cancel')}</button></div><div class="accode"><p class="hint">${T('acc.codeHint',{src:a.site||a.name})}</p><div class="twcode">${esc(p.code)}</div><button class="sm" data-accopen="${k}">${T('tw.openPage')}</button></div>`;
    return`<div class="acrow">${dot}<span class="hint">${T(a.ok()?'acc.p.'+k:'acc.soon')}</span><button class="sm acin" data-accin="${k}">${T('acc.login')}</button></div>`;
  }).join('');
  const adv=Object.entries(stAcc).map(([k,a])=>a.adv?a.adv(k):'').join('');
  return`<details class="twbox acbox"${stAccOpen?' open':''}><summary>${ico('live',14)}${T('acc.title')}</summary>${rows}<p class="hint">${T('acc.hint')}</p>${adv?`<details class="acadv"><summary class="hint">${T('tw.adv')}</summary>${adv}</details>`:''}</details>`;
}
function stAccFld(k,f,label,val){return`<div class="fld"><label>${label}</label><input type="text" data-accf="${k}:${f}" value="${esc(val||'')}" spellcheck="false"></div>`}
function stChanHTML(k,a){
  const c=a.chan.get()||{};
  return`<details class="twchan" data-acc="${k}"${a.chanOpen?' open':''}><summary>${ico('text',13)}${T(a.chan.game?'tw.chanTitle':'acc.chanTitle')} · ${esc(a.name)}</summary>
    <div class="fld"><label>${T('tw.title')}</label><input type="text" data-ch="title" maxlength="${a.chan.max||140}" value="${esc(c.title||'')}"></div>
    ${a.chan.game?`<div class="fld"><label>${T('tw.game')}</label><input type="text" data-ch="game" value="${esc(c.game||'')}"></div>`:''}
    <button class="sm" data-chsave="${k}">${T('acc.update',{src:a.name})}</button></details>`;
}
// zone pour écrire : le message part sur tous les comptes reliés qui le permettent
const stSayList=()=>Object.values(stAcc).filter(a=>a.on()&&a.canSay&&a.canSay());
function stSendHTML(){const l=stSayList();return l.length?`<form class="twsend" data-accform="1"><input type="text" maxlength="500" placeholder="${esc(T('acc.writePh',{list:l.map(a=>a.name).join(', ')}))}" data-accmsg="1"><button class="sm" type="submit">${ico('chat',14)}</button></form>`:''}
function stModHTML(m){
  if(m.modded)return' <em class="twdone">'+esc(T('tw.mod.'+m.modded+'Done',{name:''}))+'</em>';
  const a=stAcc[m.src],acts=a&&a.on()&&a.acts?a.acts(m):[];
  return acts.length?`<span class="twmod">${acts.map(x=>`<button data-accmod="${x}" title="${esc(T('tw.mod.'+x))}">${ico({del:'trash',to:'clock',ban:'minus'}[x],12)}</button>`).join('')}</span>`:'';
}
$('#stSide').addEventListener('click',e=>{
  const at=s=>{const el=e.target.closest('['+s+']');return el?el.getAttribute(s):null};let k;
  if((k=at('data-accin'))){const a=stAcc[k];if(a.ok())a.login();else toast(T('acc.noApp',{src:a.name}));return}
  if((k=at('data-accout'))){const a=stAcc[k];Promise.resolve(a.logout()).then(()=>{toast(T('acc.loggedOut',{src:a.name}));stSideUI()});return}
  if((k=at('data-acccancel'))){stAcc[k].cancel();stSideUI();return}
  if((k=at('data-accopen'))){const p=stAcc[k].pending();if(p)stOpenLink(p.url);return}
  if((k=at('data-chsave'))){const a=stAcc[k],b=e.target.closest('.twchan'),gm=b.querySelector('[data-ch=game]');
    a.chan.save(b.querySelector('[data-ch=title]').value,gm?gm.value.trim():'').then(()=>{toast(T('acc.saved',{src:a.name}));a.chan.load()},er=>stAccFail(a.name,er));return}
  const mb=e.target.closest('[data-accmod]');
  if(mb){e.stopPropagation();const row=mb.closest('[data-mid]'),m=row&&stChat.msgs.find(x=>x.id===+row.dataset.mid),a=m&&stAcc[m.src];if(!a)return;
    const act=mb.dataset.accmod;if(act==='ban'&&!mb.classList.contains('sure')){mb.classList.add('sure');mb.title=T('tw.mod.sure');setTimeout(()=>mb.classList.remove('sure'),3000);return}
    a.mod(act,m).then(()=>{m.modded=act;toast(T('tw.mod.'+act+'Done',{name:m.name}));stSideUI()},er=>stAccFail(a.name,er))}
},true);
$('#stSide').addEventListener('toggle',e=>{
  if(e.target.matches('.acbox'))stAccOpen=e.target.open;
  if(e.target.matches('.twchan[data-acc]')){const a=stAcc[e.target.dataset.acc];if(!a)return;a.chanOpen=e.target.open;if(a.chanOpen&&!a.chan.get())a.chan.load().catch(er=>stAccFail(a.name,er))}
},true);
$('#stSide').addEventListener('input',e=>{const f=e.target.dataset.accf;if(!f)return;const[k,n]=f.split(':');stAcc[k].cfg()[n]=e.target.value.trim();stSave()});
$('#stSide').addEventListener('submit',async e=>{
  const f=e.target.closest('[data-accform]');if(!f)return;e.preventDefault();const i=f.querySelector('[data-accmsg]'),text=i.value.trim();if(!text)return;
  const ok=await Promise.all(stSayList().map(a=>a.say(text).then(()=>true,er=>{stAccFail(a.name,er);return false})));
  if(ok.some(Boolean))i.value='';
});

/* ---------- onglet « Chat » (pour la personne qui fait le live) ---------- */
function stChatRow(m){
  if(m.alert)return`<div class="stca" style="--c:${ST_AL_COL[m.type]||'#8b5cf6'}">${ico('bell',13)}<b>${esc(T('st.al.'+m.type,{n:m.amount||''}))}</b> ${esc(m.name)}${m.text?' · '+esc(m.text):''}</div>`;
  return`<div class="stcm${m.hidden?' hid':''}" data-mid="${m.id}" title="${esc(T('st.pinTip'))}"><i class="stsrc" style="background:${ST_CHAT_COL[m.src]}"></i>${stBadgeHTML(m)}<b style="${m.color?'color:'+m.color:''}">${esc(m.name)}</b> <span>${stTextHTML(m)}</span>${m.hidden?' <em class="twdone">'+esc(T('cx.ban.hidden'))+'</em>':''}${stModHTML(m)}</div>`}
function stChatPanel(){
  const c=stChatCfg(),on=stChatOn();
  return stAccHTML()+`<details class="stchat-cfg"${on?'':' open'}><summary>${ico('gear',13)}${T('st.chat.setup')}</summary>
    <div class="fld"><label>${T('st.chat.twitch')}</label><input type="text" data-chat="twitch" value="${esc(c.twitch)}" placeholder="${esc(T('st.chat.twitchPh'))}" spellcheck="false"></div>
    <div class="fld"><label>${T('st.chat.kick')}</label><input type="text" data-chat="kick" value="${esc(c.kick||'')}" placeholder="${esc(T('st.chat.twitchPh'))}" spellcheck="false"></div>
    <div class="fld"><label>${T('st.chat.yt')}</label><input type="text" data-chat="yt" value="${esc(c.yt)}" placeholder="https://youtube.com/live/…" spellcheck="false"></div>
    ${ytOn()?`<p class="hint">${T('st.chat.ytOpt')}</p>`:''}
    <div class="fld"><label>${T('st.chat.ytKey')} <a href="#" data-ythelp="1">${T('st.chat.ytHelp')}</a></label><div class="keyrow"><input type="password" data-chat="ytKey" value="${esc(c.ytKey)}" spellcheck="false"><button class="sm" data-chatshow="1">${ico('eye',14)}</button></div></div>
    <p class="hint">${T('st.chat.ytSteps')}</p><p class="hint">${T('st.chat.others')}</p></details>
    <div class="stduo"><button data-chatgo="1" class="${on?'on':''}">${ico(on?'square':'play',13)}${T(on?'st.chat.disconnect':'st.chat.connect')}</button><button data-chattest="1">${ico('chat',14)}${T('st.chat.test')}</button></div>
    <div id="stChatStatus" class="stchat-st"></div>
    <div id="stChatList" class="stchat-list">${stChat.msgs.length?stChat.msgs.slice(-150).map(stChatRow).join(''):`<p class="hint stchat-empty">${T('st.chat.empty')}</p>`}</div>`+stSendHTML();
}
function stChatAppend(m){
  const L=$('#stChatList');if(!L)return;const near=L.scrollHeight-L.scrollTop-L.clientHeight<60;
  const e=L.querySelector('.stchat-empty');if(e)e.remove();
  L.insertAdjacentHTML('beforeend',stChatRow(m));while(L.children.length>200)L.firstElementChild.remove();
  if(near)L.scrollTop=L.scrollHeight;
}
function stChatStatusUI(){
  const el=$('#stChatStatus');if(!el)return;
  el.innerHTML=Object.entries(stChat.st).map(([src,s])=>`<span class="stcs ${s.state}"><i class="stsrc" style="background:${ST_CHAT_COL[src]}"></i>${T('st.chat.st.'+s.state,{src:ST_CHAT_NAME[src]||src})}${s.err?' · '+esc(s.err):''}</span>`).join('');
}
const ST_CHAT_TEST=['st.chat.test1','st.chat.test2','st.chat.test3'];let stChatTestN=0;
$('#stSide').addEventListener('input',e=>{const k=e.target.dataset.chat;if(!k)return;stChatCfg()[k]=e.target.value.trim();stSave()});
$('#stSide').addEventListener('click',e=>{
  if(e.target.closest('[data-chatgo]')){stChatOn()?stChatDisconnect():stChatConnect();stSideUI();return}
  if(e.target.closest('[data-chattest]')){stChatAdd({src:'test',name:T('st.chat.testName'),color:'',text:T(ST_CHAT_TEST[stChatTestN++%3])});return}
  if(e.target.closest('[data-chatshow]')){const k=$('#stSide [data-chat=ytKey]');k.type=k.type==='password'?'text':'password';return}
  if(e.target.closest('[data-ythelp]')){e.preventDefault();stOpenLink('https://console.cloud.google.com/apis/library/youtube.googleapis.com')}
});

/* ---------- source « Chat du live » (sur l'image envoyée) ---------- */
function stWrap(g,text,maxW,first){
  const words=String(text).split(/\s+/).filter(Boolean),lines=[];let cur='',lim=maxW-first;
  for(const wd of words){const t=cur?cur+' '+wd:wd;if(!cur||g.measureText(t).width<=lim)cur=t;else{lines.push(cur);cur=wd;lim=maxW}}
  if(cur)lines.push(cur);return lines.slice(0,4);
}
// mots et emotes d'un message (m.parts vient de 10i) ; les emotes gardent leur largeur réelle
function stToks(m,eh,now){
  const out=[];
  for(const p of m.parts||[m.text]){
    if(typeof p==='string'){for(const wd of p.split(/\s+/))if(wd)out.push({s:wd})}
    else{const im=stPic(p.e,now),r=im&&im.height?Math.min(3.5,im.width/im.height):1;out.push({e:p.e,n:p.n,r,im})}
  }
  return out;
}
function stWrapT(g,toks,maxW,first,eh){
  const sp=g.measureText(' ').width,lines=[];let cur=[],cw=0,lim=maxW-first;
  for(const t of toks){t.w=t.e?eh*t.r+sp*.7:g.measureText(t.s).width+sp;
    if(cur.length&&cw+t.w>lim){lines.push(cur);cur=[];cw=0;lim=maxW}
    cur.push(t);cw+=t.w}
  if(cur.length)lines.push(cur);return lines.slice(0,4);
}
const ST_BDG={owner:['#ef4444','crown'],mod:['#16a34a','sword'],vip:['#db2777','gem'],sub:['#7c3aed','star']};
function stBadgeDraw(g,b,x,cy,s){const d=ST_BDG[b];if(!d)return;g.save();g.shadowBlur=0;g.fillStyle=d[0];g.beginPath();g.roundRect(x,cy-s/2,s,s,s*.24);g.fill();stIcoDraw(g,d[1],x+s/2,cy,s*.74,'#fff');g.restore()}
function stChatDraw(g,it,x,y,w,h){
  const o=it.o,px=(o.size||3.2)*st.h/100,max=o.max||6,life=(o.life==null?30:+o.life)*1000,now=performance.now(),pad=px*.55,lh=px*1.32,gap=px*.35;
  let list=stChat.msgs.filter(m=>!m.alert&&!m.hidden).slice(-max);if(life>0)list=list.filter(m=>now-m.t<life);
  if(!list.length){if(!O.live&&!O.rec)stHolder(g,x,y,w,h,T('st.k.chat'));return}
  const L=stLook(o,'chat'),F=(s,wt)=>stLookFont(L.font,s,wt),rad=px*(+L.rad)/100,down=L.dir==='down',right=L.align==='right',bo=L.bar?Math.max(3,px*.14):0;
  const eh=px*1.18,bs=px*1.02,showB=o.badges!==false&&!(stData.cx&&stData.cx.emo&&stData.cx.emo.badges===false);
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.textBaseline='middle';g.textAlign='left';let yc=down?y:y+h;
  for(let i=list.length-1;i>=0;i--){
    const m=list[i],sc=ST_CHAT_COL[m.src]||'#94a3b8',bdg=showB&&m.badges?m.badges:[],bw0=bdg.length*(bs+px*.18);
    g.font=F(px,700);const nw=g.measureText(m.name+'  ').width+bw0;g.font=F(px,500);
    const lines=stWrapT(g,stToks(m,eh,now),w-pad*2-bo,nw,eh),bh=lines.length*lh+pad*.9,lw=ln=>ln.reduce((a,t)=>a+t.w,0);
    const bw=L.fit?Math.min(w,Math.max(...lines.map((ln,k)=>lw(ln)+(k?0:nw)))+pad*2+bo):w;
    const top=down?yc:yc-bh;if(down?top+bh>y+h:top<y)break;
    const bx=right?x+w-bw:x,age=now-m.t,k=Math.min(1,age/280),ease=1-Math.pow(1-k,3);
    g.save();g.globalAlpha=(L.anim==='none'?1:L.anim==='pop'?Math.min(1,k*2):k)*(life>0?Math.max(0,Math.min(1,(life-age)/1500)):1);
    if(L.anim==='slide')g.translate((right?1:-1)*(1-ease)*bw*.4,0);
    else if(L.anim==='pop'){const s=Math.max(.05,.6+.4*stBack(k)),cx=bx+bw/2,cy=top+bh/2;g.translate(cx,cy);g.scale(s,s);g.translate(-cx,-cy)}
    if(+L.bgp>0||+L.bw>0){g.beginPath();g.roundRect(bx,top,bw,bh,Math.min(rad,bh/2));
      if(+L.bgp>0){if(L.glow){g.shadowColor=sc;g.shadowBlur=px*.9}g.fillStyle=stRgba(L.bg,L.bgp/100);g.fill();g.shadowBlur=0}
      if(+L.bw>0){g.lineWidth=Math.max(1,px*.05*L.bw);g.strokeStyle=sc;if(L.glow&&!(+L.bgp>0)){g.shadowColor=sc;g.shadowBlur=px*.9}g.stroke();g.shadowBlur=0}}
    if(bo){g.fillStyle=sc;g.fillRect(right?bx+bw-bo:bx,top+px*.35,bo,bh-px*.7)}
    const tx=bx+pad+(right?0:bo*.3),ty=top+pad*.45+lh/2,nc=L.names==='src'?sc:L.names==='custom'?L.nameCol:(m.color||sc);
    bdg.forEach((b,j)=>stBadgeDraw(g,b,tx+j*(bs+px*.18),ty,bs));
    if(L.outline){g.lineJoin='round';g.strokeStyle='rgba(0,0,0,.85)';g.lineWidth=px*.2}
    g.font=F(px,700);if(L.outline)g.strokeText(m.name,tx+bw0,ty);g.fillStyle=nc;g.fillText(m.name,tx+bw0,ty);
    g.font=F(px,500);g.fillStyle=L.txt;
    lines.forEach((ln,j)=>{let lx=tx+(j?0:nw);const ly=ty+j*lh;
      for(const t of ln){if(t.e){if(t.im)g.drawImage(t.im,lx,ly-eh/2,eh*t.r,eh)}else{if(L.outline)g.strokeText(t.s,lx,ly);g.fillText(t.s,lx,ly)}lx+=t.w}});
    g.restore();
    yc=down?top+bh+gap:top-gap;
  }
  g.restore();g.globalAlpha=1;
}

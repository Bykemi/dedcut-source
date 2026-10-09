/* ---------- Compte YouTube dans le studio (v4.41) ----------
   Connexion officielle Google « par code » (OAuth pour TV et appareils à saisie limitée) : DedCut montre un code,
   l'utilisateur le tape sur google.com/device. Aucun mot de passe dans DedCut.
   Une fois connecté : le live en cours de la chaîne est trouvé tout seul (le lien et la clé API ne sont plus obligatoires),
   écrire dans le chat, modération (supprimer, exclure 10 min, bannir), titre du live, alertes « nouvel abonné ».
   Quota : chaque appel compte dans le quota du projet Google de l'application ; si l'utilisateur a mis sa propre clé API,
   la lecture du chat (le plus gros) passe par sa clé. Le jeton reste sur le PC ; « Se déconnecter » le révoque chez Google. */
// application Google de DedCut (type « TV et appareils à saisie limitée ») — à remplir par ByKemi.
// Pour une application installée, Google indique que ce « code secret » n'est pas considéré comme secret.
const YT_CLIENT_ID='',YT_CLIENT_SECRET='';
const YT_SCOPE='https://www.googleapis.com/auth/youtube';
const yt={pending:null,chan:null,subs:null,subsOff:false};
const ytCfg=()=>{if(!stData.yta)stData.yta={cid:'',sec:'',token:'',exp:0,refresh:'',id:'',name:''};return stData.yta};
const ytCid=()=>YT_CLIENT_ID||ytCfg().cid||'';
const ytSec=()=>YT_CLIENT_ID?YT_CLIENT_SECRET:(ytCfg().sec||'');
const ytOn=()=>!!(stData&&stData.yta&&stData.yta.refresh&&stData.yta.id);

async function ytLogin(){
  const cid=ytCid();
  let j;try{const r=await fetch('https://oauth2.googleapis.com/device/code',stForm({client_id:cid,scope:YT_SCOPE}));j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||r.status)}
  catch(e){stAccFail('YouTube',e);return}
  const url=j.verification_url||j.verification_uri||'https://www.google.com/device';
  yt.pending={code:j.user_code,url,until:Date.now()+(+j.expires_in||1800)*1000};stSideUI();stOpenLink(url);
  let wait=(+j.interval||5)*1000;const P=yt.pending;
  while(yt.pending===P&&Date.now()<P.until){
    await new Promise(r=>setTimeout(r,wait));if(yt.pending!==P)return;
    const r=await fetch('https://oauth2.googleapis.com/token',stForm({client_id:cid,client_secret:ytSec(),device_code:j.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'})).catch(()=>null);
    const k=r?await r.json().catch(()=>({})):{};
    if(r&&r.ok&&k.access_token){const c=ytCfg();c.token=k.access_token;c.exp=Date.now()+(+k.expires_in||3600)*1000;c.refresh=k.refresh_token||'';yt.pending=null;
      try{const me=await ytApi('GET','channels',{part:'snippet',mine:'true'});const ch=me.items&&me.items[0];if(!ch)throw new Error(T('yt.noChannel'));
        c.id=ch.id;c.name=ch.snippet&&ch.snippet.title||'YouTube';stSave();toast(T('acc.connected',{src:'YouTube',name:c.name}));
        if(stChatOn())stYtOn(stChatCfg().yt,stChatCfg().ytKey);else stChatConnect()}
      catch(e){ytForget();stAccFail('YouTube',e)}
      stSideUI();return}
    const er=k.error||'';if(er==='slow_down')wait+=5000;else if(er!=='authorization_pending'&&r){yt.pending=null;stAccFail('YouTube',k.error_description||er||r.status);stSideUI();return}
  }
  if(yt.pending===P){yt.pending=null;stSideUI()}
}
// jeton d'accès (1 h), renouvelé avec le jeton de longue durée
async function ytToken(){
  const c=ytCfg();if(c.token&&Date.now()<c.exp-60000)return c.token;
  const r=await fetch('https://oauth2.googleapis.com/token',stForm({client_id:ytCid(),client_secret:ytSec(),grant_type:'refresh_token',refresh_token:c.refresh})).catch(()=>null);
  if(!r)throw new Error('net');
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.access_token){c.token=j.access_token;c.exp=Date.now()+(+j.expires_in||3600)*1000;stSave();return c.token}
  if(j.error==='invalid_grant'){ytForget();toast(T('acc.relogin',{src:'YouTube'}));throw new Error('invalid_grant')} // accès retiré, ou application Google « en test » (7 jours)
  throw new Error(j.error_description||j.error||String(r.status));
}
async function ytApi(method,path,params,body){
  const tok=await ytToken();
  const r=await fetch('https://www.googleapis.com/youtube/v3/'+path+(params?'?'+new URLSearchParams(params):''),{method,headers:Object.assign({Authorization:'Bearer '+tok},body?{'Content-Type':'application/json'}:{}),body:body?JSON.stringify(body):undefined});
  const j=r.status===204?{}:await r.json().catch(()=>({}));
  if(!r.ok){const e=j.error||{},why=(e.errors&&e.errors[0]&&e.errors[0].reason)||'';throw new Error(why+'|'+r.status+'|'+(e.message||''))}
  return j;
}
function ytForget(){const c=ytCfg();c.token='';c.exp=0;c.refresh='';c.id='';c.name='';yt.chan=null;yt.subs=null;yt.subsOff=false;stSave();if(stChat.yt&&!stYtId(stChatCfg().yt))stYtOff();stSideUI()}
async function ytLogout(){const c=ytCfg(),t=c.refresh||c.token;if(t)fetch('https://oauth2.googleapis.com/revoke',stForm({token:t})).catch(()=>{});ytForget()}

// live de la chaîne : en cours (sinon prévu, pour changer le titre avant de commencer)
async function ytFindLive(activeOnly){
  for(const s of activeOnly?['active']:['active','upcoming']){
    const j=await ytApi('GET','liveBroadcasts',{part:'snippet',broadcastStatus:s,broadcastType:'all',maxResults:'5'});
    const b=(j.items||[]).find(x=>x.snippet&&x.snippet.liveChatId)||(j.items||[])[0];
    if(b)return{id:b.id,chat:b.snippet&&b.snippet.liveChatId||null,title:b.snippet&&b.snippet.title||'',active:s==='active'};
  }
  return null;
}
async function ytSay(text){
  const Y=stChat.yt;if(!Y||!Y.chat)throw new Error(T('acc.noLive'));
  await ytApi('POST','liveChat/messages',{part:'snippet'},{snippet:{liveChatId:Y.chat,type:'textMessageEvent',textMessageDetails:{messageText:String(text).slice(0,200)}}});
}
async function ytMod(act,m){
  const Y=stChat.yt;if(!Y||!Y.chat)throw new Error(T('acc.noLive'));
  if(act==='del')await ytApi('DELETE','liveChat/messages',{id:m.tid});
  else await ytApi('POST','liveChat/bans',{part:'snippet'},{snippet:Object.assign({liveChatId:Y.chat,type:act==='to'?'temporary':'permanent',bannedUserDetails:{channelId:m.uid}},act==='to'?{banDurationSeconds:600}:{})});
}
async function ytLoadChan(){const b=await ytFindLive(false);if(!b)throw new Error(T('acc.noLive'));yt.chan={id:b.id,title:b.title};stSideUI()}
async function ytSaveChan(title){
  if(!yt.chan)await ytLoadChan();
  const v=await ytApi('GET','videos',{part:'snippet',id:yt.chan.id});const s=v.items&&v.items[0]&&v.items[0].snippet;if(!s)throw new Error(T('acc.noLive'));
  const sn={title:String(title).trim().slice(0,100)||s.title,categoryId:s.categoryId,description:s.description||''};
  if(s.tags)sn.tags=s.tags;if(s.defaultLanguage)sn.defaultLanguage=s.defaultLanguage;
  await ytApi('PUT','videos',{part:'snippet'},{id:yt.chan.id,snippet:sn});
}
// alertes « nouvel abonné » (abonnements publics seulement : YouTube ne donne pas les abonnés privés), toutes les minutes pendant le chat
async function ytSubs(){
  if(!ytOn()||yt.subsOff||!stChat.yt)return;
  try{const j=await ytApi('GET','subscriptions',{part:'subscriberSnippet',myRecentSubscribers:'true',maxResults:'20'});
    const list=(j.items||[]).map(x=>({id:x.id,name:x.subscriberSnippet&&x.subscriberSnippet.title||''}));
    if(!yt.subs){yt.subs=new Set(list.map(x=>x.id));return}
    for(const x of list.reverse())if(!yt.subs.has(x.id)){yt.subs.add(x.id);stAlert({src:'youtube',type:'ytsub',name:x.name})}
  }catch(e){if(/forbidden|insufficient|403/i.test(String(e.message)))yt.subsOff=true}
}
setInterval(ytSubs,60000);

/* dans la boîte « Comptes » de l'onglet Chat (10c-chat.js) */
stAcc.youtube={name:'YouTube',site:'Google',col:ST_CHAT_COL.youtube,cfg:ytCfg,ok:()=>!!(ytCid()&&ytSec()),on:ytOn,
  who:()=>ytCfg().name,state:()=>stChat.yt?(stChat.yt.chat?T('acc.liveOn'):T('st.chat.ytNoLive')):'',
  pending:()=>yt.pending,login:ytLogin,logout:ytLogout,cancel:()=>{yt.pending=null},
  canSay:ytOn,say:ytSay,mod:ytMod,acts:m=>m.uid&&!m.own&&m.uid!==ytCfg().id?['del','to','ban']:[],
  chan:{get:()=>yt.chan,load:ytLoadChan,save:ytSaveChan,max:100},
  adv:k=>YT_CLIENT_ID?'':stAccFld(k,'cid','YouTube · Client ID',ytCfg().cid)+stAccFld(k,'sec','YouTube · Client secret',ytCfg().sec)};

/* ---------- Compte Twitch dans le studio (v4.41) ----------
   Connexion officielle « par code » (Device Code Flow, application publique : aucun mot de passe ni secret dans DedCut).
   Une fois connecté : alertes follows / abonnements / bits / raids / points de chaîne (EventSub WebSocket), écrire dans le chat,
   modération (supprimer, exclure 10 min, bannir), titre et catégorie du live, nombre de spectateurs.
   Le jeton reste sur le PC (stockage local de DedCut) ; « Se déconnecter » le révoque chez Twitch. */
const TW_CLIENT_ID='2tlcmdixgabl4p6pa7ow7itndk0bba'; // « Client ID » de l'application Twitch de DedCut (dev.twitch.tv/console, client public : ce n'est pas un secret)
const TW_SCOPES=['moderator:read:followers','channel:read:subscriptions','bits:read','channel:read:redemptions','user:write:chat','moderator:manage:banned_users','moderator:manage:chat_messages','channel:manage:broadcast','channel:manage:polls','channel:manage:predictions'];
const tw={pending:null,es:null,sid:'',viewers:null,vt:0,chan:null,closing:false};
const twCfg=()=>{if(!stData.tw)stData.tw={cid:'',token:'',refresh:'',id:'',login:'',name:''};return stData.tw};
const twCid=()=>TW_CLIENT_ID||twCfg().cid||'';
const twOn=()=>!!(twCfg().token&&twCfg().id);
const twLive=()=>!!(tw.es&&tw.es.readyState===1&&tw.sid);

/* connexion par code : DedCut montre un code, l'utilisateur clique « Autoriser » sur la page de Twitch */
async function twLogin(){
  const cid=twCid();
  let j;try{const r=await fetch('https://id.twitch.tv/oauth2/device',stForm({client_id:cid,scopes:TW_SCOPES.join(' ')}));j=await r.json();if(!r.ok)throw new Error(j.message||r.status)}
  catch(e){stAccFail('Twitch',e);return}
  tw.pending={code:j.user_code,url:j.verification_uri,until:Date.now()+(+j.expires_in||1800)*1000};stSideUI();stOpenLink(j.verification_uri);
  let wait=(+j.interval||5)*1000;const P=tw.pending;
  while(tw.pending===P&&Date.now()<P.until){
    await new Promise(r=>setTimeout(r,wait));if(tw.pending!==P)return;
    const r=await fetch('https://id.twitch.tv/oauth2/token',stForm({client_id:cid,scopes:TW_SCOPES.join(' '),device_code:j.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'})).catch(()=>null);
    const k=r?await r.json().catch(()=>({})):{};
    if(r&&r.ok&&k.access_token){const c=twCfg();c.token=k.access_token;c.refresh=k.refresh_token||'';tw.pending=null;
      if(await twValidate()){toast(T('acc.connected',{src:'Twitch',name:c.name}));if(!stChatCfg().twitch){stChatCfg().twitch=c.login}stSave();twStart();if(!stChatOn())stChatConnect();else if(!stChat.twitch)stTwitchOn(stChatCfg().twitch)}
      stSideUI();return}
    const msg=String(k.message||'');if(/slow_down/.test(msg))wait+=5000;else if(!/authorization_pending/.test(msg)&&r){tw.pending=null;stAccFail('Twitch',msg||r.status);stSideUI();return}
  }
  if(tw.pending===P){tw.pending=null;stSideUI()}
}
async function twValidate(){
  const c=twCfg();try{const r=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:'OAuth '+c.token}});
    if(r.status===401){if(await twRefresh())return twValidate();return false}
    const j=await r.json();c.id=j.user_id;c.login=j.login;
    const u=await twApi('GET','users?id='+c.id).catch(()=>null);c.name=u&&u.data&&u.data[0]?u.data[0].display_name:j.login;stSave();return true}catch(e){return false}
}
async function twRefresh(){
  const c=twCfg();if(!c.refresh)return false;
  try{const r=await fetch('https://id.twitch.tv/oauth2/token',stForm({client_id:twCid(),grant_type:'refresh_token',refresh_token:c.refresh}));const j=await r.json();
    if(!r.ok||!j.access_token){twForget();return false}c.token=j.access_token;c.refresh=j.refresh_token||c.refresh;stSave();return true}catch(e){return false}
}
async function twApi(method,path,body,again){
  const c=twCfg();const r=await fetch('https://api.twitch.tv/helix/'+path,{method,headers:Object.assign({'Client-Id':twCid(),Authorization:'Bearer '+c.token},body?{'Content-Type':'application/json'}:{}),body:body?JSON.stringify(body):undefined});
  if(r.status===401&&!again&&await twRefresh())return twApi(method,path,body,true);
  const j=r.status===204?{}:await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||String(r.status));return j;
}
function twForget(){const c=twCfg();c.token='';c.refresh='';c.id='';c.login='';c.name='';tw.chan=null;stSave();twStop();stSideUI()}
async function twLogout(){
  const c=twCfg();if(c.token)fetch('https://id.twitch.tv/oauth2/revoke',stForm({client_id:twCid(),token:c.token})).catch(()=>{});
  twForget();
}

/* alertes en direct : EventSub sur WebSocket (aucun serveur) */
function twStart(){
  if(!twOn()||tw.es)return;tw.closing=false;
  const open=url=>{
    const ws=new WebSocket(url||'wss://eventsub.wss.twitch.tv/ws');tw.es=ws;
    ws.onmessage=async e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}const t=m.metadata&&m.metadata.message_type;
      if(t==='session_welcome'){tw.sid=m.payload.session.id;if(!url)await twSubscribe();stSideUI()}
      else if(t==='notification')twEvent(m.payload.subscription.type,m.payload.event);
      else if(t==='session_reconnect'){const old=ws;tw.es=null;open(m.payload.session.reconnect_url);setTimeout(()=>{try{old.close()}catch(x){}},3000)}};
    ws.onclose=()=>{if(tw.es!==ws)return;tw.es=null;tw.sid='';if(!tw.closing&&twOn())setTimeout(()=>twStart(),5000)};
  };
  open();
  clearInterval(tw.vt);tw.vt=setInterval(twViewers,30000);twViewers();
}
function twStop(){tw.closing=true;clearInterval(tw.vt);tw.viewers=null;const ws=tw.es;tw.es=null;tw.sid='';if(ws)try{ws.close()}catch(e){}}
async function twSubscribe(){
  const b=twCfg().id,list=[['channel.follow','2',{broadcaster_user_id:b,moderator_user_id:b}],['channel.subscribe','1',{broadcaster_user_id:b}],['channel.subscription.message','1',{broadcaster_user_id:b}],
    ['channel.subscription.gift','1',{broadcaster_user_id:b}],['channel.cheer','1',{broadcaster_user_id:b}],['channel.raid','1',{to_broadcaster_user_id:b}],['channel.channel_points_custom_reward_redemption.add','1',{broadcaster_user_id:b}],
    ...['poll.begin','poll.progress','poll.end','prediction.begin','prediction.progress','prediction.lock','prediction.end'].map(t=>['channel.'+t,'1',{broadcaster_user_id:b}])];
  for(const[type,version,condition]of list){try{await twApi('POST','eventsub/subscriptions',{type,version,condition,transport:{method:'websocket',session_id:tw.sid}})}catch(e){}}
}
function twEvent(type,ev){
  if(/^channel\.(poll|prediction)\./.test(type)){if(typeof stPollTw==='function')stPollTw(type,ev);return}
  const anon=x=>x.is_anonymous?T('tw.anon'):x.user_name;
  if(type==='channel.follow')stAlert({src:'twitch',type:'follow',name:ev.user_name});
  else if(type==='channel.subscribe'&&!ev.is_gift)stAlert({src:'twitch',type:'sub',name:ev.user_name});
  else if(type==='channel.subscription.message')stAlert({src:'twitch',type:'sub',name:ev.user_name,text:ev.message&&ev.message.text||'',amount:ev.cumulative_months});
  else if(type==='channel.subscription.gift')stAlert({src:'twitch',type:'gift',name:anon(ev),amount:ev.total});
  else if(type==='channel.cheer')stAlert({src:'twitch',type:'bits',name:anon(ev),text:(ev.message||'').replace(/\b[a-z]+\d+\b/gi,'').trim(),amount:ev.bits});
  else if(type==='channel.raid')stAlert({src:'twitch',type:'raid',name:ev.from_broadcaster_user_name,amount:ev.viewers});
  else if(type==='channel.channel_points_custom_reward_redemption.add')stAlert({src:'twitch',type:'reward',name:ev.user_name,text:(ev.reward&&ev.reward.title||'')+(ev.user_input?' · '+ev.user_input:''),amount:ev.reward&&ev.reward.cost});
}
async function twViewers(){if(!twOn())return;try{const j=await twApi('GET','streams?user_id='+twCfg().id);tw.viewers=j.data&&j.data[0]?j.data[0].viewer_count:null}catch(e){}}

/* écrire dans le chat, modérer */
async function twSay(text){
  const b=twCfg().id;const j=await twApi('POST','chat/messages',{broadcaster_id:b,sender_id:b,message:String(text).slice(0,500)});
  const d=j.data&&j.data[0];if(d&&d.is_sent===false)throw new Error(d.drop_reason&&d.drop_reason.message||'refusé');
}
async function twMod(act,m){
  const b=twCfg().id,q='broadcaster_id='+b+'&moderator_id='+b;
  if(act==='del')await twApi('DELETE','moderation/chat?'+q+'&message_id='+encodeURIComponent(m.tid));
  else await twApi('POST','moderation/bans?'+q,{data:Object.assign({user_id:m.uid},act==='to'?{duration:600}:{})});
}

/* titre et catégorie du live */
async function twLoadChannel(){const j=await twApi('GET','channels?broadcaster_id='+twCfg().id);const d=j.data&&j.data[0];if(d){tw.chan={title:d.title,game:d.game_name,gameId:d.game_id};stSideUI()}}
async function twSaveChannel(title,game){
  let gameId=tw.chan&&tw.chan.game===game?tw.chan.gameId:'';
  if(game&&!gameId){const s=await twApi('GET','search/categories?first=1&query='+encodeURIComponent(game));gameId=s.data&&s.data[0]?s.data[0].id:''}
  await twApi('PATCH','channels?broadcaster_id='+twCfg().id,Object.assign({title:String(title).slice(0,140)},gameId?{game_id:gameId}:{}));
}

/* dans la boîte « Comptes » de l'onglet Chat (10c-chat.js) */
stAcc.twitch={name:'Twitch',col:ST_CHAT_COL.twitch,cfg:twCfg,ok:()=>!!twCid(),on:twOn,
  who:()=>twCfg().name||twCfg().login,state:()=>T(twLive()?'tw.alertsOn':'tw.alertsWait'),
  pending:()=>tw.pending,login:twLogin,logout:twLogout,cancel:()=>{tw.pending=null},
  canSay:twOn,say:twSay,mod:twMod,acts:m=>m.uid&&m.uid!==twCfg().id?['del','to','ban']:[],
  chan:{get:()=>tw.chan,load:twLoadChannel,save:twSaveChannel,game:true},
  adv:k=>TW_CLIENT_ID?'':stAccFld(k,'cid','Twitch · Client ID',twCfg().cid)};
// au démarrage du studio : reconnexion des alertes si le compte est déjà relié
function twBoot(){if(twOn()&&!tw.es)twValidate().then(ok=>{if(ok)twStart();else stSideUI()})}

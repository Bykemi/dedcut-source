/* ---------- Compte Facebook dans le studio (v4.41) ----------
   Connexion officielle Facebook « par code » (Facebook Login for Devices) : DedCut montre un code, l'utilisateur le tape sur
   facebook.com/device. Aucun mot de passe dans DedCut.
   Facebook ne donne les commentaires que pour les lives d'une PAGE (pas d'un profil perso) : une fois connecté, on choisit
   la Page, et DedCut lit les commentaires de son live en cours, peut écrire au nom de la Page et supprimer un commentaire.
   Les jetons restent sur le PC ; « Se déconnecter » retire l'autorisation chez Facebook. */
// application Meta de DedCut — à remplir par ByKemi. Le « jeton client » est fait pour être dans l'application (pas un secret).
const FB_APP_ID='',FB_CLIENT_TOKEN='';
const FB_SCOPE='pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_engagement';
const FB_G='https://graph.facebook.com/';
const fb={pending:null,pages:null};
const fbCfg=()=>{if(!stData.fba)stData.fba={app:'',ctok:'',token:'',name:'',page:'',pageName:'',pageTok:''};return stData.fba};
const fbApp=()=>FB_APP_ID?FB_APP_ID+'|'+FB_CLIENT_TOKEN:(fbCfg().app&&fbCfg().ctok?fbCfg().app+'|'+fbCfg().ctok:'');
const fbOn=()=>!!(stData&&stData.fba&&stData.fba.token);
const fbReady=()=>!!(fbOn()&&stData.fba.pageTok);

async function fbGraph(method,path,params,tok){
  const q=method!=='POST'&&params?'?'+new URLSearchParams(params):'';
  const r=await fetch(FB_G+path+q,{method,headers:Object.assign({Authorization:'Bearer '+tok},method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{}),body:method==='POST'&&params?new URLSearchParams(params):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error){const e=j.error||{};if(e.code===190&&fbOn()){fbForget();toast(T('acc.relogin',{src:'Facebook'}))}throw new Error((e.code?e.code+'|':'')+(e.error_user_msg||e.message||r.status))}
  return j;
}
async function fbLogin(){
  const app=fbApp();
  let j;try{const r=await fetch(FB_G+'device/login',stForm({access_token:app,scope:FB_SCOPE}));j=await r.json();if(!r.ok||j.error)throw new Error(j.error&&j.error.message||r.status)}
  catch(e){stAccFail('Facebook',e);return}
  fb.pending={code:j.user_code,url:j.verification_uri||'https://www.facebook.com/device',until:Date.now()+(+j.expires_in||420)*1000};stSideUI();stOpenLink(fb.pending.url);
  let wait=(+j.interval||5)*1000;const P=fb.pending;
  while(fb.pending===P&&Date.now()<P.until){
    await new Promise(r=>setTimeout(r,wait));if(fb.pending!==P)return;
    const r=await fetch(FB_G+'device/login_status',stForm({access_token:app,code:j.code})).catch(()=>null);
    const k=r?await r.json().catch(()=>({})):{};
    if(k.access_token){const c=fbCfg();c.token=k.access_token;fb.pending=null;
      try{const me=await fbGraph('GET','me',{fields:'name'},c.token);c.name=me.name||'Facebook';stSave();toast(T('acc.connected',{src:'Facebook',name:c.name}));await fbPages()}
      catch(e){stAccFail('Facebook',e)}
      stSideUI();return}
    const er=k.error||{},sub=er.error_subcode;
    if(sub===1349172)wait+=5000;else if(sub!==1349174&&r){fb.pending=null;stAccFail('Facebook',er.error_user_msg||er.message||r.status);stSideUI();return} // 1349174 = en attente
  }
  if(fb.pending===P){fb.pending=null;stSideUI()}
}
// Pages gérées par le compte (chaque Page a son propre jeton)
async function fbPages(){
  const c=fbCfg();const j=await fbGraph('GET','me/accounts',{fields:'id,name,access_token',limit:'100'},c.token);
  fb.pages=(j.data||[]).map(p=>({id:p.id,name:p.name,tok:p.access_token}));
  if(!fb.pages.length){c.page='';c.pageName='';c.pageTok='';stSave();toast(T('fb.noPage'));stSideUI();return}
  const keep=fb.pages.find(p=>p.id===c.page)||(fb.pages.length===1?fb.pages[0]:null);
  if(keep)fbPick(keep.id);else stSideUI();
}
function fbPick(id){
  const p=(fb.pages||[]).find(x=>x.id===id);if(!p)return;const c=fbCfg(),same=c.page===p.id&&c.pageTok===p.tok;
  c.page=p.id;c.pageName=p.name;c.pageTok=p.tok;stSave();
  if(!same||!stChat.fb){if(stChatOn())stFbOn();else stChatConnect()}
  stSideUI();
}
function fbForget(){const c=fbCfg();c.token='';c.name='';c.page='';c.pageName='';c.pageTok='';fb.pages=null;stSave();stFbOff();stSideUI()}
async function fbLogout(){const t=fbCfg().token;if(t)fbGraph('DELETE','me/permissions',null,t).catch(()=>{});fbForget()}
function fbBoot(){if(fbOn()&&!fb.pages)fbPages().catch(()=>{})}

/* commentaires du live en cours de la Page (toutes les 4 s) */
function stFbOn(){
  stFbOff();if(!fbReady())return;const c=fbCfg(),F={closed:false,live:null,seen:new Set(),first:true};stChat.fb=F;
  const views=async()=>{if(F.closed||!F.live)return;
    try{const v=await fbGraph('GET',F.live,{fields:'live_views,status'},c.pageTok);stChat.fbViewers=v.live_views!=null?+v.live_views:null;if(v.status&&v.status!=='LIVE'){F.live=null;stChat.fbViewers=null}}catch(e){}
    if(!F.closed&&F.live)F.vt=setTimeout(views,30000)};
  const step=async()=>{
    if(F.closed)return;let wait=4000;
    try{
      if(!F.live){
        stChatState('facebook','wait');
        const j=await fbGraph('GET',c.page+'/live_videos',{broadcast_status:'["LIVE"]',fields:'id,live_views',limit:'1'},c.pageTok);const v=(j.data||[])[0];
        if(v){F.live=v.id;F.first=true;stChat.fbViewers=v.live_views!=null?+v.live_views:null;clearTimeout(F.vt);F.vt=setTimeout(views,30000)}
        else{stChatState('facebook','wait',T('st.chat.ytNoLive'));wait=30000}
      }
      if(F.live){
        const j=await fbGraph('GET',F.live+'/comments',{order:'reverse_chronological',live_filter:'no_filter',fields:'id,from{id,name},message',limit:'50'},c.pageTok);
        stChatState('facebook','on');
        const items=(j.data||[]).reverse();
        for(const it of(F.first?items.slice(-5):items)){
          if(F.seen.has(it.id))continue;F.seen.add(it.id);if(!it.message)continue;const fr=it.from||{};
          stChatAdd({src:'facebook',name:fr.name||T('fb.someone'),color:fr.id===c.page?'#fbbf24':'',text:it.message,tid:it.id,uid:fr.id||'',own:fr.id===c.page});
        }
        if(F.first)items.forEach(it=>F.seen.add(it.id));
        if(F.seen.size>2000)F.seen=new Set([...F.seen].slice(-1000));F.first=false;
      }
    }catch(e){const s=String(e.message);
      if(/^(4|17|32|613)\|/.test(s)){stChatState('facebook','err',T('fb.rate'));wait=120000}
      else if(/^190\|/.test(s)){stChatState('facebook','err',T('acc.relogin',{src:'Facebook'}));return}
      else if(/^(10|200)\|/.test(s)){stChatState('facebook','err',T('fb.perm'));wait=60000}
      else if(/^100\|/.test(s)&&F.live){F.live=null;stChat.fbViewers=null} // live terminé ou supprimé
      else{stChatState('facebook','err',T('st.chat.netErr'));wait=15000}}
    if(!F.closed)F.timer=setTimeout(step,wait);
  };
  step();
}
function stFbOff(){const f=stChat.fb;if(!f)return;f.closed=true;clearTimeout(f.timer);clearTimeout(f.vt);stChat.fb=null;stChat.fbViewers=null;delete stChat.st.facebook;stChatStatusUI()}
async function fbSay(text){const F=stChat.fb;if(!F||!F.live)throw new Error(T('acc.noLive'));await fbGraph('POST',F.live+'/comments',{message:String(text).slice(0,500)},fbCfg().pageTok)}
async function fbMod(act,m){if(act==='del')await fbGraph('DELETE',m.tid,null,fbCfg().pageTok)}

/* dans la boîte « Comptes » de l'onglet Chat (10c-chat.js) */
stAcc.facebook={name:'Facebook',col:ST_CHAT_COL.facebook,cfg:fbCfg,ok:()=>!!fbApp(),on:fbOn,
  who:()=>fbCfg().pageName||fbCfg().name,state:()=>stChat.fb?(stChat.fb.live?T('acc.liveOn'):T('st.chat.ytNoLive')):'',
  pending:()=>fb.pending,login:fbLogin,logout:fbLogout,cancel:()=>{fb.pending=null},
  canSay:fbReady,say:fbSay,mod:fbMod,acts:m=>m.tid&&!m.own?['del']:[],
  extra:()=>{const c=fbCfg(),ps=fb.pages||[];
    if(ps.length>1||(ps.length&&!c.pageTok))return`<div class="fld acpage"><label>${T('fb.page')}</label><select data-fbpage="1">${c.pageTok?'':'<option value="">—</option>'}${ps.map(p=>`<option value="${esc(p.id)}"${p.id===c.page?' selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`;
    return c.pageTok?'':`<p class="hint">${T('fb.noPage')}</p>`},
  adv:k=>FB_APP_ID?'':stAccFld(k,'app','Facebook · App ID',fbCfg().app)+stAccFld(k,'ctok','Facebook · Client token',fbCfg().ctok)};
$('#stSide').addEventListener('change',e=>{if(e.target.dataset.fbpage&&e.target.value)fbPick(e.target.value)});

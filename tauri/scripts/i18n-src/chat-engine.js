
/* ---------- Assistant IA intégré (src/assistant.ts) : on discute avec une IA qui monte la vidéo avec les outils du connecteur ---------- */
const CHATP={claude:{model:'claude-opus-5-5',models:['claude-opus-5-5','claude-sonnet-5-5','claude-haiku-4-5-20251001'],key:1,link:'https://console.anthropic.com/settings/keys'},
  openai:{model:'gpt-5',url:'https://api.openai.com/v1',key:1,link:'https://platform.openai.com/api-keys'},
  ollama:{model:'qwen3',url:'http://127.0.0.1:11434/v1',link:'https://ollama.com/download'},
  custom:{model:'',url:'http://127.0.0.1:1234/v1',key:2}};
let chatCfg={provider:'claude',model:{},url:{}};try{Object.assign(chatCfg,JSON.parse(localStorage.getItem('dedcut-chat')||'{}'))}catch(x){}
if(!CHATP[chatCfg.provider])chatCfg.provider='claude';
let chatLog=[],chatBusy=false,chatActs=0,chatSet=false,chatKey={},chatBase=null;
const chatModel=()=>chatCfg.model[chatCfg.provider]||CHATP[chatCfg.provider].model;
const chatUrl=()=>chatCfg.url[chatCfg.provider]||CHATP[chatCfg.provider].url||'';
function chatSaveCfg(){try{localStorage.setItem('dedcut-chat',JSON.stringify(chatCfg))}catch(x){}}
function chatSystem(){
  const L={fr:'French',en:'English',es:'Spanish',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese'}[(document.documentElement.lang||'fr').slice(0,2)]||'the language of the user';
  return `You are the editing assistant built into DedCut, a free video editor for Windows made by ByKemi. The user talks to you inside DedCut and you edit their open project directly with the tools.
- Reply in ${L} unless the user writes in another language. Keep replies short, simple and friendly: the user may be a beginner.
- First call get_project, and call get_capabilities before using templates, elements, text styles, effects, transitions or voices. Never invent ids: read them from get_project.
- Times are in seconds. x and y are 0-100 % of the frame (50,50 = center). Plan the timeline so items only overlap on purpose.
- Do the work with the tools instead of explaining how to do it. When you are done, say in 1 to 3 sentences what you did and suggest one next idea. Every change can be undone by the user.
- You cannot see the pictures or the sound, and you cannot create new footage: work from media names, types and durations. If the project has no media you can still build a full video with texts, animated elements, templates and a voice-over (add_voiceover).
- For a promo or ad: a strong hook in the first 2 seconds, short punchy texts, 3 to 6 parts, animated elements, and a clear call to action at the end.
- You cannot export files yourself: when the video is ready, call open_export so the user can export it.`;
}
function chatMd(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>')}
function chatAdd(who,text){chatLog.push({who,text});if(chatLog.length>200)chatLog.shift();renderChatLog()}
function renderChatLog(){
  const box=$('#chatLog');if(!box)return;
  box.innerHTML=chatLog.length?chatLog.map(m=>m.who==='act'?`<div class="cact">✓ ${esc(m.text)}</div>`:`<div class="cm ${m.who}">${m.who==='ai'?chatMd(m.text):esc(m.text)}</div>`).join('')
    :`<div class="chello"><p>${T('chat.hello')}</p>${['chat.ex1','chat.ex2','chat.ex3'].map(k=>`<button class="sm" data-cex="${k}">${T(k)}</button>`).join('')}</div>`;
  if(chatBusy)box.insertAdjacentHTML('beforeend',`<div class="cwait">${T('chat.thinking')}</div>`);
  if(chatActs&&!chatBusy)box.insertAdjacentHTML('beforeend',`<button class="sm cundo" data-cundo>${T('chat.undoAll',{count:chatActs})}</button>`);
  box.scrollTop=box.scrollHeight;
}
function chatAppend(d){
  let m=chatLog[chatLog.length-1];if(!m||m.who!=='ai'){chatLog.push(m={who:'ai',text:''});renderChatLog()}
  m.text+=d;const els=$$('#chatLog .cm.ai'),e=els[els.length-1];if(e)e.innerHTML=chatMd(m.text);const box=$('#chatLog');if(box)box.scrollTop=box.scrollHeight;
}
async function chatTool(name,args){
  const r=await mcpRun(name,args||{});
  if(!MCP_READ.has(name)){commit();refresh();chatActs++;chatAdd('act',T('ai.t.'+name))}
  return r;
}
async function chatSend(text){
  text=String(text||'').trim();if(!text||chatBusy)return;
  const C=window.dedcutChat;if(!C){toast(T('ai.onlyApp'));return}
  const p=chatCfg.provider,P=CHATP[p];let key='';
  if(P.key){try{key=chatKey[p]??(chatKey[p]=await C.keyGet(p))}catch(x){key=''}
    if(P.key===1&&!key){chatSet=true;openChat();toast(T('chat.needKey'));return}}
  if(!chatModel()){chatSet=true;openChat();toast(T('chat.needModel'));return}
  chatAdd('me',text);const inp=$('#chatIn');if(inp)inp.value='';
  chatBusy=true;chatActs=0;chatBase=JSON.stringify({c:clips,t:tracks});renderChatBar();renderChatLog();
  try{const r=await C.send({provider:p,model:chatModel(),url:chatUrl(),key,system:chatSystem(),text,onText:chatAppend,onTool:chatTool});if(r&&r.stopped)chatAdd('note',T('chat.stopped'))}
  catch(e){const code=e&&e.code||'other';chatAdd('err',code==='other'||code==='bad'?T('chat.err.other',{error:String(e&&e.message||e).slice(0,300)}):T('chat.err.'+code))}
  finally{chatBusy=false;renderChatBar();renderChatLog()}
}
function renderChatBar(){const b=$('#chatGo');if(b){b.textContent=T(chatBusy?'chat.stop':'chat.send');b.classList.toggle('pri',!chatBusy)}}
async function openChat(){
  let o=$('#chatp');
  if(!o){o=document.createElement('div');o.id='chatp';o.className='chatp';document.body.appendChild(o);
    o.addEventListener('click',async ev=>{const b=ev.target.closest('button,a');if(!b)return;
      if(b.dataset.cx!=null){o.remove();return}
      if(b.dataset.cset!=null){chatSet=!chatSet;openChat();return}
      if(b.dataset.cnew!=null){window.dedcutChat&&window.dedcutChat.reset();chatLog=[];chatActs=0;renderChatLog();return}
      if(b.dataset.cex){chatSend(T(b.dataset.cex));return}
      if(b.dataset.cundo!=null){if(chatBase){histApply(chatBase);sel=null;msel.clear();commit();refresh()}chatActs=0;chatBase=null;chatAdd('note',T('chat.undone'));return}
      if(b.dataset.clink!=null){ev.preventDefault();const u=CHATP[chatCfg.provider].link;if(u)(FS?FS.openLink(u):window.open(u,'_blank','noopener'));return}
      if(b.id==='chatGo'){if(chatBusy){window.dedcutChat&&window.dedcutChat.stop()}else chatSend($('#chatIn').value);return}
      if(b.dataset.csave!=null){const p=chatCfg.provider;chatCfg.model[p]=$('#chatModel').value.trim();if($('#chatUrl'))chatCfg.url[p]=$('#chatUrl').value.trim();chatSaveCfg();
        const k=$('#chatKey');if(k&&k.value!=='••••••••'){try{await window.dedcutChat.keySet(p,k.value);chatKey[p]=k.value.trim()}catch(x){toast(String((x&&x.message)||x));return}}
        window.dedcutChat&&window.dedcutChat.reset();chatSet=false;toast(T('chat.saved'));openChat()}});
    o.addEventListener('change',ev=>{if(ev.target.id==='chatProv'){chatCfg.provider=ev.target.value;chatSaveCfg();openChat()}});
    o.addEventListener('keydown',ev=>{if(ev.target.id==='chatIn'&&ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();chatSend(ev.target.value)}ev.stopPropagation()});
    // déplacer le panneau par son titre
    o.addEventListener('pointerdown',ev=>{const h=ev.target.closest('.chead');if(!h||ev.target.closest('button'))return;const r=o.getBoundingClientRect(),dx=ev.clientX-r.left,dy=ev.clientY-r.top;
      const mv=e=>{o.style.left=clamp(e.clientX-dx,0,innerWidth-80)+'px';o.style.top=clamp(e.clientY-dy,0,innerHeight-40)+'px';o.style.right='auto'};
      const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)});
  }
  const p=chatCfg.provider,P=CHATP[p];
  let body;
  if(chatSet){
    let has='';if(P.key&&window.dedcutChat){try{has=chatKey[p]??(chatKey[p]=await window.dedcutChat.keyGet(p))}catch(x){}}
    body=`<div class="cset"><label>${T('chat.provider')}<select id="chatProv">${Object.keys(CHATP).map(k=>`<option value="${k}" ${k===p?'selected':''}>${T('chat.p.'+k)}</option>`).join('')}</select></label>
      <label>${T('chat.model')}${P.models?`<select id="chatModel">${P.models.map(m=>`<option ${m===chatModel()?'selected':''}>${m}</option>`).join('')}</select>`:`<input id="chatModel" type="text" value="${esc(chatModel())}" spellcheck="false">`}</label>
      ${P.url?`<label>${T('chat.url')}<input id="chatUrl" type="text" value="${esc(chatUrl())}" spellcheck="false"></label>`:''}
      ${P.key?`<label>${T(P.key===2?'chat.keyOpt':'chat.key')}<input id="chatKey" type="password" autocomplete="off" value="${has?'••••••••':''}"></label><p class="hint">${T('chat.keyHint')}</p>`:''}
      <p class="hint">${T('chat.d.'+p)}${P.link?` <a href="#" data-clink>${T(p==='ollama'?'chat.getOllama':'chat.getKey')}</a>`:''}</p>
      <p class="hint">${T(p==='ollama'?'chat.privLocal':'chat.privacy')}</p>
      <div class="cbtns"><button class="sm" data-cset>${T('chat.back')}</button><button class="sm pri" data-csave>${T('chat.save')}</button></div></div>`;
  }else body=`<div id="chatLog" class="clog"></div><div class="cin"><textarea id="chatIn" rows="2" placeholder="${esc(T('chat.placeholder'))}"></textarea><button id="chatGo" class="sm"></button></div>
      <div class="cfoot hint">${esc(T('chat.p.'+p))} · ${esc(chatModel()||'?')}</div>`;
  const keep=$('#chatIn')?.value||'';
  o.innerHTML=`<div class="chead"><b>${ico('chat',15)} ${T('chat.title')}</b><span><button class="sm" data-cnew title="${esc(T('chat.new'))}">${T('chat.newShort')}</button><button class="sm" data-cset>${T('chat.settings')}</button><button class="sm" data-cx>✕</button></span></div>${body}`;
  if(!chatSet){$('#chatIn').value=keep;renderChatLog();renderChatBar();$('#chatIn').focus()}
}
window.addEventListener('dedcut-lang',()=>{if($('#chatp'))openChat()});
$('#bChat').onclick=()=>{if($('#chatp'))$('#chatp').remove();else openChat()};

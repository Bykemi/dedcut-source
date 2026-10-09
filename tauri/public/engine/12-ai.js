/* ---------- connecteur IA (MCP) : Claude Desktop pilote DedCut (src-tauri/src/mcp.rs). Désactivé par défaut. ---------- */
const r2=x=>Math.round((+x||0)*100)/100;
async function mcpRun(tool,a,wait){
  const need=id=>{const c=clips.find(x=>x.id===+id);if(!c)throw new Error('clip '+id+' not found (read ids with get_project)');return c};
  const unlocked=c=>{if(trk(c).lock)throw new Error('track is locked');return c};
  switch(tool){
    case 'get_project':return{app:'DedCut '+appVersion(),format:{width:W,height:H},duration:r2(total()),playhead:r2(time),scene:scenes&&scenes.length>1?scName(scenes[curSc],curSc):null,
      tracks:tracks.map((t,i)=>({index:i,kind:t.kind,hidden:!!t.hide,muted:!!t.mute,locked:!!t.lock})),
      clips:clips.slice().sort((x,y)=>x.start-y.start).slice(0,500).map(c=>{const m=c.mid&&mById(c.mid),o={id:c.id,track:c.track,kind:kindOf(c),start:r2(c.start),duration:r2(c.dur)};
        if(m){o.media_id=m.id;o.media=m.name;o.media_type=m.type}if(isText(c))o.text=c.p.text;if(c.gen){o.element=c.gen;if(c.p.st)o.style=c.p.st}
        if((c.p.rate||1)!==1)o.speed=r2(c.p.rate);if(c.p.vol!=null&&c.p.vol!==100)o.volume=c.p.vol;const fx=c.p.fx&&Object.keys(c.p.fx).filter(k=>c.p.fx[k]);if(fx&&fx.length)o.effects=fx;
        if(c.p.tin&&c.p.tin!=='none')o.transition_in=c.p.tin;if(c.p.tout&&c.p.tout!=='none')o.transition_out=c.p.tout;if(c.grp)o.group=c.grp;return o}),
      media:media.map(m=>({id:m.id,name:m.name,type:m.type,duration:m.type==='image'?null:r2(m.duration),width:m.w||null,height:m.h||null,missing:!!m.missing})),markers:markers.map(r2)};
    case 'get_capabilities':if(a.compact)return{templates:Object.keys(TPLS),elements:Object.fromEntries(Object.keys(WDEF).map(g=>[g,(WSTY[g]||[]).slice(0,4)])),text_styles:Object.keys(TPRE).slice(0,14),effects:FX.slice(0,24),transitions:Object.keys(TRN).slice(0,20),
        notes:'Short lists (first styles only). x and y are 0-100 % of the frame (50,50 = center). Common element props: x, y, size, color (#rrggbb). A progress bar is kind "pbar".'};
      if(FS&&FS.ttsVoices&&!ttsList){try{ttsList=await FS.ttsVoices()}catch(x){ttsList=[]}}
      return{voices:(ttsList||[]).map(v=>({name:v.name,language:v.lang,gender:v.gender})),templates:Object.keys(TPLS),elements:Object.fromEntries(Object.keys(WDEF).map(g=>[g,{styles:WSTY[g]||[],props:Object.keys(WDEF[g]().p).filter(k=>k!=='op')}])),
      text_styles:Object.keys(TPRE),effects:FX,transitions:Object.keys(TRN),speed_ramps:Object.keys(RAMPS),notes:'x and y are 0-100 % of the frame (50,50 = center). Element size is % of the frame height. Colors are #rrggbb. A progress bar (pbar) covers the whole video by default.'};
    case 'import_media':{if(!FS)throw new Error('only in the installed app');const inf=await FS.allowPaths((a.paths||[]).map(String)),ok=inf.filter(i=>i.exists),made=await addPaths(ok);await waitMeta(made);
      return{imported:made.map(m=>({id:m.id,name:m.name,type:m.type,duration:r2(m.duration)})),not_found:inf.filter(i=>!i.exists).map(i=>i.path)}}
    case 'add_clip':{const m=mById(+a.media_id);if(!m)throw new Error('media '+a.media_id+' not found');const n0=clips.length;addFromMedia(m.id,!!a.overlay,a.start!=null?Math.max(0,+a.start):m.type==='audio'?time:undefined);
      if(clips.length===n0)throw new Error('not added');const c=clips[clips.length-1];if(a.duration)c.dur=Math.max(.1,+a.duration);return{id:c.id,start:r2(c.start),duration:r2(c.dur)}}
    case 'add_text':{const c=textClip(TPRE[a.style]?a.style:null,Math.max(0,+(a.start??time)));c.p.text=String(a.text??'');if(a.duration)c.dur=Math.max(.1,+a.duration);if(a.y!=null)c.p.y=clamp(+a.y,-20,120);if(a.size)c.p.size=Math.round(H*clamp(+a.size,1,60)/100);add(c);return{id:c.id}}
    case 'add_element':{const g=String(a.kind||'');if(!WDEF[g])throw new Error('unknown element kind, see get_capabilities');const d=WDEF[g]();if(a.style){if(WSTY[g]&&!WSTY[g].includes(a.style))throw new Error('unknown style');d.p.st=a.style}
      if(g==='icon'&&ICONS[d.p.st])d.p.color=ICONS[d.p.st][1];
      for(const[k,v]of Object.entries(a.props||{}))if(v===null||['string','number','boolean'].includes(typeof v))d.p[k]=v;
      const start=g==='pbar'&&a.start==null?0:Math.max(0,+(a.start??time)),dur=Math.max(.2,+(a.duration||(g==='pbar'?Math.max(1,total()||10):d.dur)));const c=newClip({track:tk('over'),gen:g,start,dur,p:d.p});add(c);return{id:c.id}}
    case 'add_template':{if(!TPLS[a.name])throw new Error('unknown template, see get_capabilities');seek(Math.max(0,+(a.start??time)));insertTpl(a.name);const ids=selIds();
      return{ids,texts:ids.map(id=>clips.find(x=>x.id===id)).filter(c=>c&&isText(c)).map(c=>({id:c.id,text:c.p.text})),note:'Replace example texts with update_clip (id, text).'}}
    case 'update_clip':{const c=unlocked(need(a.id));if(a.start!=null)c.start=Math.max(0,+a.start);if(a.duration!=null)c.dur=Math.max(.05,+a.duration);if(a.volume!=null)c.p.vol=clamp(+a.volume,0,400);
      if(a.speed!=null)setRate(c,clamp(+a.speed,.1,8));if(a.text!=null&&isText(c))c.p.text=String(a.text);
      for(const[k,v]of Object.entries(a.props||{}))if(v===null||['string','number','boolean'].includes(typeof v))c.p[k]=v;return{id:c.id,start:r2(c.start),duration:r2(c.dur)}}
    case 'delete_clips':{const ids=(a.ids||[]).map(Number),n0=clips.length;clips=clips.filter(c=>!ids.includes(c.id)||trk(c).lock);sel=null;msel.clear();return{deleted:n0-clips.length}}
    case 'split_clip':{const tt=+a.time,c=a.id!=null?need(a.id):clips.filter(x=>isVid(x)&&tt>x.start+.05&&tt<x.start+x.dur-.05).pop();if(!c||tt<=c.start+.05||tt>=c.start+c.dur-.05)throw new Error('no clip at that time');unlocked(c);const n=splitAt(c,tt);return{left:c.id,right:n.id}}
    case 'set_transition':{const c=need(a.id);for(const w of['in','out'])if(a[w]!=null){if(!TRN[a[w]])throw new Error('unknown transition '+a[w]);c.p[w==='in'?'tin':'tout']=a[w]}if(a.duration)c.p.tdur=clamp(+a.duration,.1,3);return{ok:true}}
    case 'set_effects':{const c=need(a.id);if(!isVid(c)&&!isOvr(c))throw new Error('effects work on videos, images and layers');c.p.fx=noFx();for(const k of a.effects||[]){if(!FX.includes(k))throw new Error('unknown effect '+k);c.p.fx[k]=true}if(a.intensity!=null)c.p.amt=clamp(+a.intensity,0,100);return{ok:true}}
    case 'remove_silences':{const c=unlocked(need(a.id));silCfg.db={sensitive:-45,normal:-38,strong:-30}[a.sensitivity]??silCfg.db;if(a.min_silence)silCfg.min=clamp(+a.min_silence,.1,10);if(a.margin!=null)silCfg.pad=clamp(+a.margin,0,2);
      silPrev=null;await cutSilences(c);if(!silPrev||silPrev.cid!==c.id)return{cut:0};const runs=silPrev.runs,rm=r2(silPrev.removed);silApply();return{cut:runs,removed_seconds:rm}}
    case 'speed_ramp':{if(!RAMPS[a.preset])throw new Error('unknown preset, see get_capabilities');speedRamp(unlocked(need(a.id)),a.preset);return{ok:true}}
    case 'add_voiceover':{if(!FS||!FS.ttsMake)throw new Error('only in the installed app');const tx=String(a.text||'').trim().slice(0,5000);if(!tx)throw new Error('empty text');
      if(!ttsList){try{ttsList=await FS.ttsVoices()}catch(x){ttsList=[]}}const v=a.voice&&ttsList.some(x=>x.name===a.voice)?a.voice:($('#ttsVoice')?.value||'');
      const f=await FS.ttsMake(tx,v,clamp(Math.round(+a.rate||0),-10,10),T('tts.title')+' - '+tx.slice(0,28)),m=addPaths([f])[0];if(!m)throw new Error('voice file not created');await waitMeta([m]);
      const c=placeFree(newClip({track:tk('audio'),mid:m.id,start:Math.max(0,+(a.start??time)),dur:m.duration||3,p:{vol:100}}));clips.push(c);return{id:c.id,start:r2(c.start),duration:r2(c.dur)}}
    case 'generate_video':{const G=window.dedcutGen;if(!G)throw new Error('only in the installed app');if(G.busy())throw new Error('a video is already being generated');if(!String(a.prompt||'').trim())throw new Error('empty prompt');
      if(!wait){G.run(a).then(r=>{if(r&&r.ok){commit();refresh()}});return{started:true,note:'Generation takes several minutes on this PC (about 2-3 min per 2 s). The clip will be added to the timeline automatically when done; check later with get_project.'}}
      const r=await G.run(a);if(r&&r.error)throw new Error(r.error);return{media_ids:r.media,note:'Added at the playhead on the video track.'}}
    case 'add_markers':{markers.push(...(a.times||[]).map(Number).filter(x=>isFinite(x)&&x>=0));markers.sort((x,y)=>x-y);return{markers:markers.map(r2)}}
    case 'beat_markers':{await beatMarkers(need(a.id));return{markers:markers.map(r2)}}
    case 'undo':undo();return{ok:true};
    case 'seek':seek(+a.time||0);return{playhead:r2(time)};
    case 'open_export':openExport();return{ok:true,note:'The export window is open: the user chooses the settings and clicks Export.'};
    /* outils de la discussion intégrée (src/assistant.ts, EXTRA_TOOLS) */
    case 'ask_user':{const q=String(a.question||'').trim()||'?',opts=(Array.isArray(a.options)?a.options:[]).map(x=>String(x).trim()).filter(Boolean).slice(0,4);
      // si l'IA a déjà écrit la question, les boutons vont sous son message (pas de doublon)
      const last=chatLog[chatLog.length-1];let m=last;if(last&&last.who==='ai'&&last.text.trim()){if(!last.text.includes(q))last.text+='\n\n'+q}else{chatAdd('ai',q);m=chatLog[chatLog.length-1]}
      if(opts.length)m.chips=opts.map(o=>({label:o,send:o}));renderChatLog();return{shown:true,note:'The question is shown with buttons. Stop now and wait for the answer.'}}
    case 'how_to':{const q=dcQ(String(a.question||'')),qT=dcQ(q.n.replace(/sous[- ]?titres?|subtitles?|subtitulos?|untertitel|sottotitoli?|legendas?/g,' ')),r=dcaiAnswer(q,qT,false);
      // réponse écrite dans la langue de l'interface : à traduire si l'utilisateur écrit dans une autre langue (noms des boutons gardés tels qu'à l'écran)
      const ui={fr:'French',en:'English',es:'Spanish',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Chinese'}[(document.documentElement.lang||'fr').slice(0,2)]||'French',lg=typeof brainLang!=='undefined'?brainLang:null;
      if(!r)return{answer:null,note:'No ready answer: explain from general video-editing knowledge and say when you are not sure.'};
      return{answer:r.text,answer_language:ui,...(lg&&lg!==ui?{note:'Translate this answer into '+lg+' for the user. Keep the words in **bold** exactly as written: they are the names shown on the screen.'}:{})}}
    case 'add_captions':{const C=window.dedcutCaptions;if(!C)throw new Error('only in the installed app');
      if(!(await C.ready().catch(()=>false)))return{error:'The speech recognition model is not downloaded yet: tell the user to open the Subtitles tab once and click the download button, then ask again.'};await C.run();return{ok:true}}
    case 'set_format':{const fm={vertical:[1080,1920],horizontal:[1920,1080],square:[1080,1080]}[a.format];if(!fm)throw new Error('format must be vertical, horizontal or square');toFormat(fm[0],fm[1]);return{width:W,height:H}}
    case 'fade_project':{if(a.in!==false)fadeProject('in');if(a.out!==false)fadeProject('out');return{ok:true}}
    case 'add_music':{if(typeof mlAddAuto!=='function')throw new Error('music library not available');return await mlAddAuto(a.mood,a.volume!=null?+a.volume:null)}
    case 'loop_music':{const c=need(a.id);if(!isAud(c))throw new Error('not a sound clip');const n0=clips.length;loopMusic(c);return{copies:clips.length-n0}}
  }
  throw new Error('unknown tool '+tool);
}
const MCP_READ=new Set(['get_project','get_capabilities','seek','open_export','ask_user','how_to']);
let mcpOn=false,mcpUnl=null,mcpCalls=0;
async function mcpHandle(c){
  let res;
  try{res=await mcpRun(c.tool,c.args||{});if(!MCP_READ.has(c.tool)){commit();refresh();toast(T('ai.did',{action:T('ai.t.'+c.tool)}))}mcpCalls++}
  catch(x){res={error:String((x&&x.message)||x)}}
  try{await window.dedcutMCP.reply(c.id,res)}catch(x){}
  if($('#aidlg'))openAI();
}
function aiBadge(){let b=$('#aiBadge');if(!b){b=document.createElement('button');b.id='aiBadge';b.className='aibadge';b.onclick=()=>openAI();$('#sv').after(b)}b.hidden=!mcpOn;b.textContent=T('ai.badge')}
async function mcpSet(on){
  if(!window.dedcutMCP){toast(T('ai.onlyApp'));return}
  try{const r=await window.dedcutMCP.enable(on);mcpOn=r.on;if(mcpOn&&!mcpUnl)mcpUnl=await window.dedcutMCP.onCall(mcpHandle);if(!mcpOn&&mcpUnl){mcpUnl();mcpUnl=null}
    try{localStorage.setItem('dedcut-mcp',mcpOn?'1':'0')}catch(x){}}catch(x){toast(String((x&&x.message)||x))}
  aiBadge();if($('#aidlg'))openAI();
}
async function openAI(){
  let o=$('#aidlg');if(!o){o=document.createElement('div');o.id='aidlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',ev=>{if(ev.target===o)o.remove()});
    o.addEventListener('change',ev=>{if(ev.target.id==='aiOn')mcpSet(ev.target.checked)});
    o.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.aix!=null)o.remove();
      if(b.dataset.aiinst!=null){try{await window.dedcutMCP.installClaude();toast(T('ai.installed'))}catch(x){toast(T('ai.installFail',{error:String((x&&x.message)||x)}))}openAI()}
      if(b.dataset.aicopy!=null){const t=$('#aiCfg').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(T('ai.copied'))).catch(()=>{})}});
  }
  let st={on:mcpOn,calls:0,claude:false,config:''};if(window.dedcutMCP){try{st=await window.dedcutMCP.status()}catch(x){}}
  o.innerHTML=`<div class="kbbox aibox"><div class="kbhead"><h3>${T('ai.title')}</h3><button class="sm" data-aix>${T('kb.close')}</button></div>
    <p>${T('ai.intro')}</p><p class="hint">${T('ai.privacy')}</p>
    <label class="chk aion"><span>${T('ai.enable')}</span><input type="checkbox" id="aiOn" ${mcpOn?'checked':''} ${window.dedcutMCP?'':'disabled'}></label>
    <p class="aistate ${mcpOn?'on':''}">${T(window.dedcutMCP?(mcpOn?'ai.on':'ai.off'):'ai.onlyApp')}${mcpOn&&mcpCalls?' · '+T('ai.calls',{count:mcpCalls}):''}</p>
    <ol class="aisteps"><li>${T('ai.step1')}</li><li>${T('ai.step2')}</li><li>${T('ai.step3')}</li></ol>
    <div class="pre"><button class="pri" data-aiinst ${window.dedcutMCP?'':'disabled'}>${T('ai.install')}</button>${st.claude?`<span class="hint aiok">${T('ai.already')}</span>`:''}</div>
    <p class="hint" style="margin-top:12px">${T('ai.manual')}</p><pre id="aiCfg" class="aicfg">${esc(st.config||'')}</pre><button class="sm" data-aicopy>${T('ai.copy')}</button>
    <p class="hint" style="margin-top:12px">${T('ai.chatgpt')}</p></div>`;
}
try{if(localStorage.getItem('dedcut-mcp')==='1')setTimeout(()=>mcpSet(true),1500)}catch(x){}
window.addEventListener('dedcut-lang',()=>{aiBadge();if($('#aidlg'))openAI()});

/* ---------- Assistant IA intégré (src/assistant.ts) : on discute avec une IA qui monte la vidéo avec les outils du connecteur ---------- */
const CHATP={dedcut:{model:'locale',local:1},
  claude:{model:'claude-opus-5-5',models:['claude-opus-5-5','claude-sonnet-5-5','claude-haiku-4-5-20251001'],key:1,link:'https://console.anthropic.com/settings/keys'},
  gemini:{model:'gemini-2.5-flash',url:'https://generativelanguage.googleapis.com/v1beta/openai',key:1,link:'https://aistudio.google.com/apikey'},
  openai:{model:'gpt-5',url:'https://api.openai.com/v1',key:1,link:'https://platform.openai.com/api-keys'},
  ollama:{model:'qwen3',url:'http://127.0.0.1:11434/v1',link:'https://ollama.com/download'},
  custom:{model:'',url:'http://127.0.0.1:1234/v1',key:2}};
let chatCfg={provider:'dedcut',model:{},url:{}};try{Object.assign(chatCfg,JSON.parse(localStorage.getItem('dedcut-chat')||'{}'))}catch(x){}
if(!CHATP[chatCfg.provider])chatCfg.provider='dedcut';
let chatLog=[],chatBusy=false,chatActs=0,chatSet=false,chatKey={},chatBase=null,chatWait=null;
const chatModel=()=>chatCfg.model[chatCfg.provider]||CHATP[chatCfg.provider].model;
const chatUrl=()=>chatCfg.url[chatCfg.provider]||CHATP[chatCfg.provider].url||'';
function chatSaveCfg(){try{localStorage.setItem('dedcut-chat',JSON.stringify(chatCfg))}catch(x){}}
function chatSystem(local){
  const L={fr:'French',en:'English',es:'Spanish',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese'}[(document.documentElement.lang||'fr').slice(0,2)]||'the language of the user';
  return `You are the editing assistant built into DedCut, a free video editor for Windows made by ByKemi. The user talks to you inside DedCut and you edit their open project directly with the tools.
- Always answer in the language of the user's LAST message (the user may write in any language and switch at any time); use ${L} only when you cannot tell. Keep replies short, simple and friendly: the user may be a beginner.
- First call get_project, and call get_capabilities before using templates, elements, text styles, effects, transitions or voices. Never invent ids: read them from get_project.
- Times are in seconds. x and y are 0-100 % of the frame (50,50 = center). Plan the timeline so items only overlap on purpose.
- Do the work with the tools instead of explaining how to do it. When you are done, say in 1 to 3 sentences what you did and suggest one next idea. Every change can be undone by the user.
- You cannot see the pictures or the sound: work from media names, types and durations. generate_video can create a short AI clip on this PC (from a description, or animating an image of the project), but it is slow (minutes): use it only when the user asks for it or agrees. If the project has no media you can still build a full video with texts, animated elements, templates and a voice-over (add_voiceover).
- For a promo or ad: a strong hook in the first 2 seconds, short punchy texts, 3 to 6 parts, animated elements, and a clear call to action at the end.
- You cannot export files yourself: when the video is ready, call open_export so the user can export it.`+(local?`
- You are DedCut AI and you run on the user's PC, without internet. Keep replies short (1 to 3 sentences), in the language of the user's last message (how_to answers may be in another language: translate them).
- After add_template, replace its example texts (like "Le titre de ta vidéo") with real texts using update_clip.
- Big but vague requests ("edit my video", "make my video", "make it cool"): call get_project, then call ask_user ONCE to ask the style of video, with 3 or 4 short options written in the user's language (for example: Vlog / Gaming / Tutorial / TikTok short), then stop and wait. Skip this question only if the user already gave the style or says "do as you like".
- Full edit, once you know the style: remove_silences on the video clips where people talk; set_transition "fade" on every video clip after the first one; add_text with a REAL short title (from the user's words, the project name or the media names; never a placeholder like "Video title"); add_captions if people talk; music: if an imported music of the media library is not on the timeline, add_clip it, update_clip volume 30, then loop_music; otherwise call add_music with the mood that fits the style (vlog, happy, dance, hiphop, epic, game, sad, calm, jazz, rock, scary, xmas, kids, electro, world); fade_project; for TikTok/Shorts/Reels: set_format vertical and add_element kind "pbar". Then say in 1 to 3 sentences what the tools really did (never claim something that failed) and propose open_export.
- If the project has no media, tell the user to import videos first (Media tab, or drag the files into DedCut) and offer to make a video with texts and animated elements instead.
- For "how do I..." questions about DedCut, call how_to with the question, then explain the answer simply (translate it if needed).`:'');
}
function chatMd(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>')}
function chatAdd(who,text){chatLog.push({who,text});if(chatLog.length>200)chatLog.shift();renderChatLog()}
function renderChatLog(){
  const box=$('#chatLog');if(!box)return;
  box.innerHTML=chatLog.length?chatLog.map((m,i)=>m.who==='act'?`<div class="cact">✓ ${esc(m.text)}</div>`:`<div class="cm ${m.who}">${m.who==='ai'?chatMd(m.text):esc(m.text)}</div>${m.chips&&i===chatLog.length-1&&!chatBusy?`<div class="cchips">${m.chips.map((c,j)=>`<button class="sm" data-cchip="${j}">${esc(c.label)}</button>`).join('')}</div>`:''}`).join('')
    :`<div class="chello"><p>${T('chat.hello')}</p>${(chatCfg.provider==='dedcut'?(brainOn()?['brain.ex1','brain.ex2','dcai.qex2']:['chat.ex4','chat.ex6','dcai.qex1','dcai.qex2']):['chat.ex1','chat.ex2','chat.ex3']).map(k=>`<button class="sm" data-cex="${k}">${T(k)}</button>`).join('')}</div>`;
  if(chatBusy)box.insertAdjacentHTML('beforeend',`<div class="cwait">${esc(chatWait||T('chat.thinking'))}</div>`);
  if(chatActs&&!chatBusy)box.insertAdjacentHTML('beforeend',`<button class="sm cundo" data-cundo>${T('chat.undoAll',{count:chatActs})}</button>`);
  box.scrollTop=box.scrollHeight;
}
function chatAppend(d){
  let m=chatLog[chatLog.length-1];if(!m||m.who!=='ai'){chatLog.push(m={who:'ai',text:''});renderChatLog()}
  m.text+=d;const els=$$('#chatLog .cm.ai'),e=els[els.length-1];if(e)e.innerHTML=chatMd(m.text);const box=$('#chatLog');if(box)box.scrollTop=box.scrollHeight;
}
async function chatTool(name,args){
  const r=await mcpRun(name,args||{},true);
  if(!MCP_READ.has(name)&&!(r&&(r.error||r.cut===0))){commit();refresh();chatActs++;chatAdd('act',T('ai.t.'+name))}
  return r;
}
async function chatSend(text){
  text=String(text||'').trim();if(!text||chatBusy)return;
  if(chatCfg.provider==='dedcut')return brainOn()?brainSend(text):dcaiSend(text);
  const C=window.dedcutChat;if(!C){toast(T('ai.onlyApp'));return}
  const p=chatCfg.provider,P=CHATP[p];let key='';
  if(P.key){try{key=chatKey[p]??(chatKey[p]=await C.keyGet(p))}catch(x){key=''}
    if(P.key===1&&!key){chatSet=true;openChat();toast(T('chat.needKey'));return}}
  if(!chatModel()){chatSet=true;openChat();toast(T('chat.needModel'));return}
  chatAdd('me',text);const inp=$('#chatIn');if(inp)inp.value='';
  chatBusy=true;chatActs=0;chatBase=JSON.stringify({c:clips,t:tracks});renderChatBar();renderChatLog();
  try{const r=await C.send({provider:p,model:chatModel(),url:chatUrl(),key,system:chatSystem(),text:spaceCtx()+text,onText:chatAppend,onTool:chatTool});if(r&&r.stopped)chatAdd('note',T('chat.stopped'))}
  catch(e){const code=e&&e.code||'other';chatAdd('err',code==='other'||code==='bad'?T('chat.err.other',{error:String(e&&e.message||e).slice(0,300)}):T('chat.err.'+code))}
  finally{chatBusy=false;renderChatBar();renderChatLog()}
}
function chatFoot(){const p=chatCfg.provider;return T('chat.p.'+p)+' · '+(p==='dedcut'?(brainOn()?T('brain.foot'):T('brain.simple')):(chatModel()||'?'))}
function renderChatBar(){const b=$('#chatGo');if(b){b.textContent=T(chatBusy?'chat.stop':'chat.send');b.classList.toggle('pri',!chatBusy)}}
async function openChat(){
  let o=$('#chatp');
  if(!o){o=document.createElement('div');o.id='chatp';o.className='chatp';document.body.appendChild(o);
    o.addEventListener('click',async ev=>{const b=ev.target.closest('button,a');if(!b)return;
      if(b.dataset.cx!=null){o.remove();return}
      if(b.dataset.cset!=null){chatSet=!chatSet;openChat();return}
      if(b.dataset.cnew!=null){window.dedcutChat&&window.dedcutChat.reset();chatLog=[];chatActs=0;renderChatLog();return}
      if(b.dataset.cex){chatSend(T(b.dataset.cex));return}
      if(b.dataset.bget!=null){brainGet();return}
      if(b.dataset.bcancel!=null){window.dedcutBrain&&window.dedcutBrain.cancel();return}
      if(b.dataset.brm!=null){brainRemove();return}
      if(b.dataset.bon!=null){chatCfg.brain='on';chatSaveCfg();window.dedcutChat&&window.dedcutChat.reset();openChat();return}
      if(b.dataset.cchip!=null){const m=chatLog[chatLog.length-1],c=m&&m.chips&&m.chips[+b.dataset.cchip];if(c&&!chatBusy)dcaiChip(c);return}
      if(b.dataset.cundo!=null){if(chatBase){histApply(chatBase);sel=null;msel.clear();commit();refresh()}chatActs=0;chatBase=null;chatAdd('note',T('chat.undone'));return}
      if(b.dataset.clink!=null){ev.preventDefault();const u=CHATP[chatCfg.provider].link;if(u)(FS?FS.openLink(u):window.open(u,'_blank','noopener'));return}
      if(b.id==='chatGo'){if(chatBusy){window.dedcutChat&&window.dedcutChat.stop();window.dedcutGen&&window.dedcutGen.cancel()}else chatSend($('#chatIn').value);return}
      if(b.dataset.csave!=null){const p=chatCfg.provider;if($('#brainMode'))chatCfg.brain=$('#brainMode').value;if($('#brainGpu')){const g=$('#brainGpu').checked;if(g!==(chatCfg.brainGpu!==false)){chatCfg.brainGpu=g;window.dedcutBrain&&window.dedcutBrain.stop()}}if($('#chatModel'))chatCfg.model[p]=$('#chatModel').value.trim();if($('#chatUrl'))chatCfg.url[p]=$('#chatUrl').value.trim();chatSaveCfg();
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
      ${P.local&&brainSt&&brainSt.ready?`<label>${T('brain.mode')}<select id="brainMode"><option value="on" ${chatCfg.brain!=='off'?'selected':''}>${T('brain.modeSmart')}</option><option value="off" ${chatCfg.brain==='off'?'selected':''}>${T('brain.modeFast')}</option></select></label>
      <label class="chk"><span>${T('brain.gpu')}</span><input type="checkbox" id="brainGpu" ${chatCfg.brainGpu!==false?'checked':''}></label><p class="hint">${T('brain.gpuHint')}</p>`:''}
      ${P.local?'':`<label>${T('chat.model')}${P.models?`<select id="chatModel">${P.models.map(m=>`<option ${m===chatModel()?'selected':''}>${m}</option>`).join('')}</select>`:`<input id="chatModel" type="text" value="${esc(chatModel())}" spellcheck="false">`}</label>`}
      ${P.url?`<label>${T('chat.url')}<input id="chatUrl" type="text" value="${esc(chatUrl())}" spellcheck="false"></label>`:''}
      ${P.key?`<label>${T(P.key===2?'chat.keyOpt':'chat.key')}<input id="chatKey" type="password" autocomplete="off" value="${has?'••••••••':''}"></label><p class="hint">${T('chat.keyHint')}</p>`:''}
      <p class="hint">${T('chat.d.'+p)}${P.link?` <a href="#" data-clink>${T(p==='ollama'?'chat.getOllama':'chat.getKey')}</a>`:''}</p>
      <p class="hint">${T(p==='ollama'||P.local?'chat.privLocal':'chat.privacy')}</p>
      ${P.local&&brainSt&&brainSt.ready?`<p class="hint"><button class="sm" data-brm>${T('brain.remove',{size:brainGb(brainSt.total)})}</button></p>`:''}
      <div class="cbtns"><button class="sm" data-cset>${T('chat.back')}</button><button class="sm pri" data-csave>${T('chat.save')}</button></div></div>`;
  }else body=`${p==='dedcut'?'<div id="brainBar" hidden></div>':''}<div id="chatLog" class="clog"></div><div class="cin"><textarea id="chatIn" rows="2" placeholder="${esc(T('chat.placeholder'))}"></textarea><button id="chatGo" class="sm"></button></div>
      <div class="cfoot hint">${esc(chatFoot())}</div>`;
  const keep=$('#chatIn')?.value||'';
  o.innerHTML=`<div class="chead"><b>${ico('chat',15)} ${T('chat.title')}</b><span><button class="sm" data-cnew title="${esc(T('chat.new'))}">${T('chat.newShort')}</button><button class="sm" data-cset>${T('chat.settings')}</button><button class="sm" data-cx>✕</button></span></div>${body}`;
  if(!chatSet){$('#chatIn').value=keep;renderChatLog();renderChatBar();renderBrainBar();$('#chatIn').focus()}
  if(p==='dedcut'&&!openChat.busy){openChat.busy=1;brainRefresh().finally(()=>{openChat.busy=0})}
}
window.addEventListener('dedcut-lang',()=>{if($('#chatp'))openChat()});
$('#bChat').onclick=()=>{if($('#chatp'))$('#chatp').remove();else openChat()};

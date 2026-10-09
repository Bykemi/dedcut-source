/* ---------- l'assistant IA dans les cinq espaces (v4.50) ----------
   Les IA (DedCut IA, Claude, ChatGPT, Gemini, Ollama, Claude Desktop) savent dans quel espace on est et ont des outils pour
   Image (src/image/aiapi.ts), Musique (window.__mu) et le studio Enregistrer / Live (fonctions st…), en plus du Montage.
   Sécurité : une IA ne lance JAMAIS un enregistrement ni un live (il faut appuyer soi-même sur le bouton).
   DedCut IA en mode simple (mots-clés) : demandes courantes de chaque espace + réponses « comment faire ». */
const SPACES=['edit','rec','live','image','music'];
const spName=m=>T('mode.'+m);
async function spWait(fn,ms=12000){const t0=performance.now();while(performance.now()-t0<ms){try{const v=fn();if(v)return v}catch(e){}await new Promise(r=>setTimeout(r,150))}return null}
async function imgAPI(){if(appMode!=='image')setMode('image');const a=await spWait(()=>window.dedcutImageAPI);if(!a)throw new Error('the Image space did not open');return a}
async function muAPI(){if(appMode!=='music')setMode('music');const m=await spWait(()=>window.__mu&&window.__mu.ready&&window.__mu,20000);if(!m)throw new Error('the Music space did not open');return m}
async function stGo(){if(!stOn())setMode('rec');if(!await spWait(()=>stData&&stData.scenes&&stData.scenes.length))throw new Error('the studio did not open')}
const MU_KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const muKey=k=>{const s=String(k||'').trim().replace('♯','#').replace(/b$/,'b').toUpperCase(),fl={DB:'C#',EB:'D#',GB:'F#',AB:'G#',BB:'A#'};const i=MU_KEYS.indexOf(fl[s]||s);return i<0?0:i};
const muInfo=m=>({name:m.p.name,bpm:m.p.bpm,key:MU_KEYS[m.p.key]||m.p.key,scale:m.p.scale,tracks:m.p.tracks.map(t=>({name:t.name,kind:t.kind})),templates:['beat','song','instrumental','video','voice','empty']});
/** résumé de l'espace ouvert (pour l'IA) */
async function spSummary(){
  try{
    if(appMode==='image'&&window.dedcutImageAPI){const i=window.dedcutImageAPI.info();return i.current?{picture:i.current.name,size:i.current.width+'x'+i.current.height,layers:i.current.layers.length}:{picture:null}}
    if(appMode==='music'&&window.__mu&&window.__mu.p){const m=window.__mu;return{project:m.p.name,bpm:m.p.bpm,tracks:m.p.tracks.length}}
    if(stOn()&&stData)return{scene:stScene().name,sources:stScene().items.map(i=>i.kind)};
    return{clips:clips.length,duration:Math.round(total()*10)/10};
  }catch(e){return{}}
}
const SPACE_TOOLS={
  get_space:async()=>({space:appMode,name:spName(appMode),spaces:Object.fromEntries(SPACES.map(m=>[m,spName(m)])),now:await spSummary()}),
  switch_space:async a=>{const m=String(a.space||'');if(!SPACES.includes(m))throw new Error('space must be one of '+SPACES.join(', '));setMode(m);return{space:m,name:spName(m)}},
  make_thumbnail:async a=>{thumbOpen({title:a.title,style:a.style,format:a.format,auto:!!a.auto});return{opened:a.auto?'thumbnail being made from the best moment':'thumbnail window: the user picks the moment, title, style and format'}},
  image_info:async()=>(await imgAPI()).info(),
  image_new:async a=>(await imgAPI()).newDoc(String(a.preset||'thumb'),a.name?String(a.name).slice(0,60):undefined),
  image_enhance:async()=>(await imgAPI()).enhance(),
  image_remove_background:async()=>(await imgAPI()).removeBackground(),
  image_add_text:async a=>(await imgAPI()).addText(String(a.text||'').trim()||'Texte',{size:a.size,color:a.color}),
  image_look:async a=>(await imgAPI()).look(String(a.look||'vivid')),
  image_export:async()=>(await imgAPI()).exportDialog(),
  music_info:async()=>muInfo(await muAPI()),
  music_new:async a=>{
    const m=await muAPI(),tpl=['beat','song','instrumental','video','voice','empty'].includes(a.template)?a.template:'beat';
    try{await m.autosave()}catch(e){} // l'ancien projet reste dans la sauvegarde automatique
    await m.newFrom(tpl,String(a.name||T('mu.tpl.'+tpl)).slice(0,60),Math.round(clamp(+a.bpm||(tpl==='beat'?90:tpl==='video'?100:110),40,240)),a.key!=null?muKey(a.key):0,a.scale==='minor'?'minor':a.scale==='major'?'major':(tpl==='beat'?'minor':'major'),48000);
    m.dialog=null;m.emit();return muInfo(m);
  },
  music_set_tempo:async a=>{const m=await muAPI(),b=Math.round(clamp(+a.bpm||120,40,240));m.act(T('mu.h.tempo'),p=>{p.bpm=b},true);m.emit();return{bpm:b}},
  music_set_key:async a=>{const m=await muAPI(),k=muKey(a.key),s=a.scale==='minor'?'minor':'major';m.act(T('mu.h.tempo'),p=>{p.key=k;p.scale=s},true);m.emit();return{key:MU_KEYS[k],scale:s}},
  music_add_track:async a=>{const m=await muAPI(),k=a.kind==='drums'?'drum':a.kind==='audio'?'audio':'inst';m.addTrack(k,k==='inst'?(['basic','pluck','keys','organ','strings','brass'].includes(a.instrument)?a.instrument:'keys'):undefined);m.emit();return{added:k,tracks:m.p.tracks.length}},
  music_ideas:async()=>{const m=await muAPI();m.dialog='ideas';m.emit();return{opened:'ideas window'}},
  music_export:async()=>{const m=await muAPI();m.dialog='export';m.emit();return{opened:'export window'}},
  studio_info:async()=>{await stGo();return{space:appMode,scenes:stData.scenes.map((s,i)=>({index:i,name:s.name,current:s===stScene(),sources:s.items.map(x=>x.kind)})),screenShared:!!st.scr}},
  studio_add:async a=>{
    await stGo();const k={webcam:'cam',camera:'cam'}[a.kind]||String(a.kind||'');
    if(!ST_KINDS[k])throw new Error('kind must be one of '+[...Object.keys(ST_KINDS),'webcam'].join(', '));
    stAdd(k);const it=stScene().items.find(i=>i.id===stSelId);
    if(it&&a.text&&(k==='text'||k==='banner')){it.o.text=String(a.text).slice(0,200);stSave();stRender();stSideUI()}
    if(it&&k==='overlay'){const s=typeof OV_DRAW!=='undefined'&&OV_DRAW[a.style]?a.style:it.o.style;Object.assign(it.o,ovDefs(s));Object.assign(it,ovRect(s));if(a.text)it.o.t1=String(a.text).slice(0,160);stSave();stRender();stSideUI();stSourcesUI();return{added:k,style:s,scene:stScene().name}}
    return{added:k,scene:stScene().name};
  },
  studio_scene:async a=>{await stGo();const s=stData.scenes[+a.index];if(!s)throw new Error('no scene '+a.index+' (see studio_info)');stSwitch(s.id);stScenesUI();return{scene:s.name}}
};
{const base=mcpRun;mcpRun=async function(tool,a,wait){const f=SPACE_TOOLS[tool];if(f)return f(a||{});return base(tool,a,wait)}}
// ces outils ne touchent pas au montage : pas d'instantané d'annulation du Montage
for(const n of Object.keys(SPACE_TOOLS))MCP_READ.add(n);

/* consignes et contexte donnés aux IA */
{const base=chatSystem;chatSystem=function(local){return base(local)+`
- DedCut has five spaces: edit (video editing, the tools above), rec (screen recording studio), live (live streaming studio), image (photo editing), music (music creation). Use get_space to know where the user is; the message may start with a [DedCut] line giving the current space.
- In image, music, rec and live, use the image_*, music_* and studio_* tools (switch_space opens another space). The video editing tools only change the video project of the edit space.
- make_thumbnail makes a thumbnail for the video from its best moments (offer it when the user exports or finishes a video).
- NEVER start a recording or a live stream yourself: prepare everything, then tell the user to press the button.`}}
/** ligne de contexte ajoutée au message envoyé aux IA (pas affichée dans la discussion) */
function spaceCtx(){
  if(appMode==='edit')return '';
  let s='';try{const i=appMode==='image'&&window.dedcutImageAPI&&window.dedcutImageAPI.info().current;if(i)s=', picture "'+i.name+'" '+i.width+'x'+i.height;
    if(appMode==='music'&&window.__mu&&window.__mu.p)s=', music project "'+window.__mu.p.name+'" '+window.__mu.p.bpm+' BPM';
    if(stOn()&&stData)s=', scene "'+stScene().name+'"'}catch(e){}
  return '[DedCut: the user is in the '+appMode+' space ('+spName(appMode)+s+')]\n';
}

/* ---------- DedCut IA en mode simple : demandes et questions de chaque espace ---------- */
const DCS={
  thumb:['miniature','thumbnail','vignette youtube','image de couverture','portada','vorschaubild','titelbild','copertina','capa do video','サムネ','썸네일','封面','缩略图'],
  bg:['fond','background','arriere plan','arriere-plan','detour','detoure','fondo','hintergrund','freistell','sfondo','scontorn','fundo','recort','背景','배경','抠图'],
  enhance:['ameliore','embelli','retouche auto','plus belle','plus beau','enhance','improve','make it better','mejora','verbesser','migliora','melhora','補正','보정','增强','优化'],
  newimg:['nouvelle image','nouveau visuel','new image','new picture','nueva imagen','neues bild','nuova immagine','nova imagem','新しい画像','새 이미지','新建图像'],
  text:['texte','text','titre','title','texto','testo','titel','titolo','titulo','テキスト','タイトル','텍스트','제목','文字','标题'],
  bw:['noir et blanc','black and white','black & white','b&w','blanco y negro','schwarzweiss','schwarz-weiss','bianco e nero','preto e branco','モノクロ','흑백','黑白'],
  sepia:['sepia','セピア','세피아','棕褐'],vivid:['couleurs vives','plus de couleur','vivid','vibrant','saturat','lebhaft','vivace','vivo','鮮やか','선명','鲜艳'],
  warm:['chaud','chaude','warm','calido','caldo','quente','暖','따뜻'],cool:['froid','froide','cool tone','cold','frio','kalt','freddo','寒色','차가','冷色'],
  vintage:['vintage','retro','ancien','old school','antiguo','vecchio','antigo','レトロ','빈티지','怀旧'],
  export:DCAI.export,
  beat:['beat','instru','prod ','rythme','ritmo','ビート','비트','节拍'],song:['chanson','song','cancion','lied','canzone','cancao','歌','노래','歌曲'],
  faster:['plus vite','plus rapide','accelere','faster','speed up','mas rapido','schneller','piu veloce','mais rapido','速く','빠르게','更快'],slower:['moins vite','plus lent','ralenti','slower','slow down','mas lento','langsamer','piu lento','mais lento','遅く','느리게','更慢'],
  ideas:['idee','idea','ideen','melodie','melody','melodia','accord','chord','acorde','akkord','accordo','アイデア','メロディ','아이디어','멜로디','灵感','旋律','和弦'],
  piano:['piano','clavier','keys','teclado','klavier','ピアノ','피아노','钢琴'],strings:['cordes','violon','strings','cuerdas','streicher','archi','cordas','ストリングス','현악','弦乐'],
  drums:['batterie','drum','bateria','schlagzeug','batteria','ドラム','드럼','鼓'],
  overlay:['overlay','habillage','cadre webcam','cadre de webcam','webcam frame','marco','rahmen','cornice','moldura','オーバーレイ','오버레이','叠加'],
  banner:['bandeau','banniere','banner','banda','laufband','fascia','faixa','バナー','배너','横幅'],cam:['webcam','camera','cam','kamera','telecamera','カメラ','웹캠','摄像头'],
  screen:['ecran','screen','mon jeu','le jeu','game','pantalla','bildschirm','schermo','tela','画面','화면','屏幕'],chat:['=chat','tchat','commentaire','comments','コメント','채팅','聊天'],
  alerts:['alerte','alert','alerta','benachrichtigung','avviso','aviso','アラート','알림','提醒'],timer:['minuteur','chrono','compte a rebours','timer','countdown','temporizador','タイマー','타이머','计时'],
  golive:['lance le live','lancer le live','commence le live','demarre le live','passe en direct','start the live','go live','start streaming','empieza el directo','live starten','avvia la diretta','iniciar a live','ライブを開始','라이브 시작','开始直播'],
  startrec:['lance l enregistrement','demarre l enregistrement','commence l enregistrement','start recording','start the recording','empieza a grabar','aufnahme starten','avvia la registrazione','iniciar a gravacao','録画を開始','녹화 시작','开始录制']
};
const dcsQuote=raw=>{const m=String(raw).match(/["«“„「『](.+?)["»”“」』]/)||String(raw).match(/[:：]\s*(.+)$/);return m?m[1].trim():''};
/** réponses « comment faire » propres à chaque espace */
const DCSQ=[
  {sp:'image',k:DCS.bg,a:()=>T('dcai.s.imgBg',{menu:dcL('img.m.select'),cmd:dcL('img.c.removeBg')}),act:'bg'},
  {sp:'image',k:DCS.enhance,a:()=>T('dcai.s.imgEnhance',{cmd:dcL('img.c.autoEnhance')}),act:'enhance'},
  {sp:'image',k:DCS.export,a:()=>T('dcai.s.imgExport',{menu:dcL('img.m.file'),cmd:dcL('img.c.export')}),act:'export'},
  {sp:'image',k:[...DCS.text,'calque','layer','capa','ebene','livello','camada','レイヤー','레이어','图层'],a:()=>T('dcai.s.imgText')},
  {sp:'music',k:DCS.beat,a:()=>T('dcai.s.muBeat',{cmd:dcL('mu.cmd.new')}),act:'beat'},
  {sp:'music',k:['voix','chant','micro','vocal','voice','sing','voz','cantar','stimme','singen','voce','cantare','ボーカル','歌う','보컬','人声'],a:()=>T('dcai.s.muVoice',{cmd:dcL('mu.cmd.record')})},
  {sp:'music',k:DCS.export,a:()=>T('dcai.s.muExport',{cmd:dcL('mu.cmd.export')}),act:'export'},
  {sp:'music',k:['tempo','bpm','tonalite','gamme','key','tonalidad','tonart','tonalita','tom','テンポ','키','调性'],a:()=>T('dcai.s.muTempo',{cmd:dcL('mu.cmd.tempo')})},
  {sp:'rec',k:[...DCS.screen,'enregistr','record','grabar','aufnehm','registra','gravar','録画','녹화','录制'],a:()=>T('dcai.s.recScreen',{src:dcL('st.k.screen'),go:dcL('st.recStart')})},
  {sp:'rec',k:[...DCS.cam,'micro','mic'],a:()=>T('dcai.s.recCam',{cam:dcL('st.k.cam')})},
  {sp:'live',k:['diffus','direct','stream','=live','youtube','twitch','kick','facebook','tiktok','plateforme','platform','plataforma','plattform','piattaforma','配信','방송','直播'],a:()=>T('dcai.s.liveGo',{go:dcL('live.go')})},
  {sp:'live',k:[...DCS.chat,...DCS.alerts],a:()=>T('dcai.s.liveChat',{chat:dcL('st.k.chat'),al:dcL('st.k.alerts')})}
];
async function dcaiSpace(raw,q){
  const act=async(label,fn)=>{await fn();chatActs++;chatAdd('act',label)};
  const has=k=>dcHas(q,DCS[k]);
  // miniature : depuis n'importe quel espace
  if(has('thumb')){if(appMode==='image'&&!clips.some(c=>isVid(c)&&c.mid)&&!has('export'))return null;await act(T('dcai.a.thumb'),()=>thumbOpen({title:dcsQuote(raw)||undefined}));return{text:T('dcai.s.thumbDone')}}
  if(appMode==='edit')return null;
  // « fais un beat » depuis Image ou le studio : on ouvre Musique (dans le Montage, la musique de fond reste celle du montage)
  if(appMode!=='music'&&has('beat')&&!(dcIsQ(q,raw)&&!dcIsReq(q,raw)))setMode('music');
  const asked=dcIsQ(q,raw)&&!dcIsReq(q,raw);
  if(asked){const hit=DCSQ.find(x=>(x.sp===appMode||(x.sp==='rec'&&appMode==='live'))&&dcHas(q,x.k));if(hit)return{text:hit.a(),chips:hit.act?[{label:T('dcai.do'),act:'s:'+hit.act}]:[]};return null}
  if(has('golive')||has('startrec'))return{text:T('dcai.s.youStart',{go:dcL(appMode==='live'?'live.go':'st.recStart')})};
  if(appMode==='image'){
    const A=await imgAPI();let did=0;const need=()=>{if(!A.info().current)throw new Error(T('dcai.s.noImage'))};
    if(has('newimg')){const p=dcHas(q,['story','tiktok','vertical','verticale','=reel','=reels','=shorts'])?'story':dcHas(q,['instagram','=post','carre','square','cuadrad','quadrat','quadrato','quadrado'])?'post':dcHas(q,['banniere','banner','chaine','channel'])?'banner':'thumb';await act(T('dcai.a.imgNew'),()=>A.newDoc(p));did++}
    if(has('bg')){need();await act(T('dcai.a.imgBg'),()=>A.removeBackground());did++}
    if(has('enhance')){need();await act(T('dcai.a.imgEnhance'),()=>A.enhance());did++}
    for(const lk of['bw','sepia','vivid','warm','cool','vintage'])if(has(lk)){need();await act(T('dcai.a.imgLook'),()=>A.look(lk));did++;break}
    if(has('text')&&dcsQuote(raw)){need();await act(T('dcai.a.imgText'),()=>A.addText(dcsQuote(raw),{size:'title'}));did++}
    if(has('export')){need();A.exportDialog();did++}
    return did?{text:T('dcai.s.doneUndo')}:null;
  }
  if(appMode==='music'){
    let did=0;const num=(String(raw).match(/(\d{2,3})\s*(bpm)?/i)||[])[1];
    if(has('beat')||has('song')){const m=await muAPI();await act(T('dcai.a.muNew'),()=>SPACE_TOOLS.music_new({template:has('song')?'song':'beat',bpm:num?+num:undefined}));void m;did++}
    else if(num&&dcHas(q,['tempo','bpm','vitesse','speed','velocidad','geschwindigkeit','velocita','velocidade','テンポ','템포','速度'])){await act(T('dcai.a.muTempo',{bpm:num}),()=>SPACE_TOOLS.music_set_tempo({bpm:+num}));did++}
    else if(has('faster')||has('slower')){const m=await muAPI(),b=m.p.bpm+(has('faster')?10:-10);await act(T('dcai.a.muTempo',{bpm:b}),()=>SPACE_TOOLS.music_set_tempo({bpm:b}));did++}
    if(has('drums')&&!has('beat')){await act(T('dcai.a.muTrack'),()=>SPACE_TOOLS.music_add_track({kind:'drums'}));did++}
    else if(has('piano')||has('strings')){await act(T('dcai.a.muTrack'),()=>SPACE_TOOLS.music_add_track({kind:'instrument',instrument:has('piano')?'keys':'strings'}));did++}
    if(has('ideas')){await SPACE_TOOLS.music_ideas();did++}
    if(has('export')){await SPACE_TOOLS.music_export();did++}
    return did?{text:T('dcai.s.doneUndo')}:null;
  }
  if(stOn()){
    let did=0;const tx=dcsQuote(raw);
    if(has('banner')){await act(T('dcai.a.stAdd',{what:dcL('st.k.banner')}),()=>SPACE_TOOLS.studio_add({kind:'banner',text:tx}));did++}
    else if(has('text')){await act(T('dcai.a.stAdd',{what:dcL('st.k.text')}),()=>SPACE_TOOLS.studio_add({kind:'text',text:tx}));did++}
    if(has('overlay')){await act(T('dcai.a.stAdd',{what:dcL('st.k.overlay')}),()=>SPACE_TOOLS.studio_add({kind:'overlay',style:has('cam')||/cadre|frame|marco|rahmen|cornice|moldura/.test(q)?'cam-neon':undefined}));did++}
    else if(has('cam')){await act(T('dcai.a.stAdd',{what:dcL('st.k.cam')}),()=>SPACE_TOOLS.studio_add({kind:'cam'}));did++}
    if(has('screen')&&!has('cam')){await act(T('dcai.a.stAdd',{what:dcL('st.k.screen')}),()=>SPACE_TOOLS.studio_add({kind:'screen'}));did++}
    if(has('chat')){await act(T('dcai.a.stAdd',{what:dcL('st.k.chat')}),()=>SPACE_TOOLS.studio_add({kind:'chat'}));did++}
    if(has('alerts')){await act(T('dcai.a.stAdd',{what:dcL('st.k.alerts')}),()=>SPACE_TOOLS.studio_add({kind:'alerts'}));did++}
    if(has('timer')){await act(T('dcai.a.stAdd',{what:dcL('st.k.timer')}),()=>SPACE_TOOLS.studio_add({kind:'timer'}));did++}
    return did?{text:T('dcai.s.doneStudio',{src:dcL('st.sources')})}:null;
  }
  return null;
}
{const base=dcaiRun;dcaiRun=async function(text,force){
  if(typeof force==='string'&&force.startsWith('s:')){ // « Le faire pour moi » sous une réponse d'un espace
    const map={bg:'image_remove_background',enhance:'image_enhance',export:appMode==='music'?'music_export':'image_export',beat:'music_new'};const n=map[force.slice(2)];
    if(n){try{await SPACE_TOOLS[n](force==='s:beat'?{template:'beat'}:{});chatAdd('act',T('dcai.done'))}catch(e){return{text:String(e.message||e)}}return{text:T('dcai.done')}}
  }
  if(!force){try{const r=await dcaiSpace(text,dcQ(text));if(r)return r}catch(e){return{text:String((e&&e.message)||e)}}}
  return base(text,force);
}}

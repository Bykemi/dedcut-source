/* ---------- Traduire les sous-titres et voix traduite (v4.55) ----------
   - La traduction est écrite par une IA de langage : le cerveau de DedCut IA s'il est installé (sur ce PC, rien n'est envoyé),
     sinon l'IA choisie dans l'assistant (Claude, ChatGPT, Gemini, Ollama…) avec sa clé déjà enregistrée.
   - Le texte d'origine reste dans c.p.capSrc : on peut retraduire vers une autre langue ou revenir à l'original.
   - La voix traduite utilise les voix de Windows (src-tauri/src/tts.rs) : une voix par phrase, posée au début de son sous-titre,
     accélérée si elle déborde sur la suivante. */
const CTR_LANGS=['en','fr','es','de','it','pt','nl','pl','ru','uk','tr','ar','he','hi','id','vi','th','ja','ko','zh','sv','da','no','fi','cs','el','ro','hu'];
const CTR_NOSPACE=/^(ja|zh|th)$/;
let ctrCfg={lang:'',mode:'replace',voice:'',duck:true};try{Object.assign(ctrCfg,JSON.parse(localStorage.getItem('dedcut-ctr')||'{}'))}catch(e){}
const ctrSave=()=>{try{localStorage.setItem('dedcut-ctr',JSON.stringify(ctrCfg))}catch(e){}};
let ctrBusy=false,ctrStop=false;
const ctrCaps=()=>clips.filter(c=>isText(c)&&c.p.cap).sort((a,b)=>a.start-b.start);
const ctrName=(code,ui)=>{try{return new Intl.DisplayNames([ui||document.documentElement.lang||'en'],{type:'language'}).of(code)||code}catch(e){return code}};
const ctrFlat=s=>String(s||'').replace(/\s*\n\s*/g,' ').trim();
/* longueur de ligne : celle choisie pour les sous-titres automatiques */
const ctrMax=()=>({short:26,normal:40,long:58}[localStorage.getItem('dedcut-cap-len')||'normal']||40)*(W<H?.7:1);
function ctrWrap(s,lang,max){
  s=ctrFlat(s);if(s.length<=(max||ctrMax())*.6)return s;
  const mid=Math.floor(s.length/2);
  if(CTR_NOSPACE.test(lang))return s.slice(0,mid)+'\n'+s.slice(mid);
  for(let d=0;d<mid;d++){if(s[mid+d]===' ')return s.slice(0,mid+d)+'\n'+s.slice(mid+d+1);if(s[mid-d]===' ')return s.slice(0,mid-d)+'\n'+s.slice(mid-d+1)}
  return s;
}

/* ---------- quelle IA traduit ---------- */
function ctrWho(){
  const p=chatCfg.provider;
  if(p!=='dedcut')return{ok:true,text:T('ctr.whoOnline',{name:T('chat.p.'+p)})};
  if(brainSt&&brainSt.supported!==false&&brainSt.ready)return{ok:true,text:T('ctr.whoBrain')};
  return{ok:false,text:T('ctr.whoNone')};
}
/** IA de langage disponible (cerveau de DedCut IA ou IA de l'assistant) ; null = aucune ; say : message pendant le démarrage du cerveau */
async function ctrAI(say){
  const C=window.dedcutChat;if(!C||!C.once)throw new Error(T('ai.onlyApp'));
  const p=chatCfg.provider;
  if(p==='dedcut'){
    const B=window.dedcutBrain;if(!B)throw new Error(T('ai.onlyApp'));
    if(!brainSt)await brainRefresh();
    if(!brainSt||brainSt.supported===false||!brainSt.ready)return null;
    say&&say(T('brain.starting'));
    const conn=await B.start(chatCfg.brainGpu!==false);if(brainSt)brainSt.running=true;
    return{provider:'local',model:'qwen3.5-4b',url:conn.url,key:conn.key};
  }
  const P=CHATP[p];let key='';
  if(P.key){try{key=chatKey[p]??(chatKey[p]=await C.keyGet(p))}catch(e){key=''}if(P.key===1&&!key)return null}
  if(!chatModel())return null;
  return{provider:p,model:chatModel(),url:chatUrl(),key};
}
/* réponse attendue : un tableau JSON de n textes (une réflexion <think> éventuelle est ignorée) ; empty : textes vides permis */
function ctrParse(s,n,empty){
  s=String(s||'').replace(/<think>[\s\S]*?<\/think>/g,'');
  const a=s.indexOf('['),b=s.lastIndexOf(']');if(a<0||b<a)return null;
  try{const j=JSON.parse(s.slice(a,b+1));if(Array.isArray(j)&&j.length===n&&j.every(x=>typeof x==='string'&&(empty||x.trim())))return j.map(x=>x.trim())}catch(e){}
  return null;
}
async function ctrBatch(ai,lines,lang){
  if(ctrStop)throw new Error('cancelled');
  const sys='You translate video subtitles into '+lang+'. The user sends a JSON array of subtitle lines, in order. Translate every item: keep the meaning and the spoken, natural tone, keep it as short as a subtitle, keep names, brands and numbers. Never merge, split or skip items. Reply with ONLY a JSON array of exactly '+lines.length+' strings, in the same order, nothing else.';
  for(let k=0;k<2;k++){
    let r;
    try{r=await window.dedcutChat.once({...ai,system:sys,text:JSON.stringify(lines),maxTokens:4096})}
    catch(e){const code=e&&e.code||'other';throw new Error(code==='other'||code==='bad'?String(e&&e.message||e).slice(0,200):T('chat.err.'+code))}
    if(ctrStop)throw new Error('cancelled');
    const j=ctrParse(r,lines.length);if(j)return j;
  }
  // réponse illisible : on recommence en deux moitiés ; une ligne seule qui échoue reste dans sa langue
  if(lines.length===1)return[null];
  const h=Math.ceil(lines.length/2);
  return[...await ctrBatch(ai,lines.slice(0,h),lang),...await ctrBatch(ai,lines.slice(h),lang)];
}

/* ---------- traduire ---------- */
function ctrRunUI(on){
  ctrBusy=on;$('#ctrRun').hidden=!on;$('#ctrGo').hidden=on;$('#dubGo').disabled=on;$('#ctrLang').disabled=on;
  if(on){$('#ctrBar').style.width='0';$('#ctrPct').textContent=''}
}
const ctrPct=(q,key)=>{$('#ctrBar').style.width=(100*Math.min(1,q))+'%';$('#ctrPct').textContent=T(key||'ctr.working',{pct:window.i18n.fmt.percent(Math.min(1,q))})};
async function ctrTranslate(){
  if(ctrBusy)return;
  const list=ctrCaps().filter(c=>!trk(c).lock);
  if(!list.length){toast(T('ctr.noCaps'));return}
  const lang=ctrCfg.lang||'en',langEn=ctrName(lang,'en');
  ctrRunUI(true);ctrStop=false;
  let ai=null;
  try{ai=await ctrAI(t=>{$('#ctrPct').textContent=t})}catch(e){ctrRunUI(false);toast(String(e&&e.message||e));return}
  if(!ai){ctrRunUI(false);toast(T('ctr.whoNone'));openChat();return}
  const src=list.map(c=>ctrFlat(c.p.capSrc??c.p.text)),out=new Array(src.length).fill(null),N=20;
  let err=null;
  try{
    ctrPct(0);
    for(let i=0;i<src.length;i+=N){
      const r=await ctrBatch(ai,src.slice(i,i+N),langEn);
      r.forEach((x,k)=>{out[i+k]=x});
      ctrPct((i+N)/src.length);
    }
  }catch(e){err=e}
  ctrRunUI(false);
  if(err&&String(err.message)==='cancelled'){toast(T('cap.cancelled'));return}
  if(err){toast(T('ctr.fail',{error:String(err&&err.message||err).slice(0,200)}));return}
  let n=0;
  list.forEach((c,i)=>{const t=out[i];if(!t)return;
    if(c.p.capSrc==null)c.p.capSrc=c.p.text;
    c.p.capTr=t;c.p.capLang=lang;n++;
    c.p.text=ctrCfg.mode==='both'?ctrFlat(c.p.capSrc)+'\n'+ctrFlat(t):ctrWrap(t,lang)});
  commit();refresh();dubFill();
  toast(n<list.length?T('ctr.donePart',{count:n,total:list.length,lang:ctrName(lang)}):T('ctr.done',{count:n,lang:ctrName(lang)}));
}
function ctrUndo(){
  const list=ctrCaps().filter(c=>c.p.capSrc!=null&&!trk(c).lock);if(!list.length)return;
  for(const c of list){c.p.text=c.p.capSrc;delete c.p.capSrc;delete c.p.capTr;delete c.p.capLang}
  commit();refresh();toast(T('ctr.undone'));
}

/* ---------- voix traduite (voix de Windows) ---------- */
function dubFill(){
  const s=$('#dubVoice');if(!s)return;
  if(!FS||!FS.ttsVoices){s.innerHTML=`<option value="">${esc(T('tts.onlyApp'))}</option>`;$('#dubGo').disabled=true;return}
  if(!ttsList){s.innerHTML=`<option value="">${esc(T('common.loading'))}</option>`;FS.ttsVoices().then(l=>{ttsList=l;dubFill()}).catch(()=>{ttsList=[];dubFill()});return}
  const lang=(ctrCaps().find(c=>c.p.capLang)||{p:{}}).p.capLang||ctrCfg.lang||'en';
  const good=ttsList.filter(v=>v.lang.toLowerCase().startsWith(lang)),rest=ttsList.filter(v=>!good.includes(v));
  const opt=v=>`<option value="${esc(v.name)}">${esc(v.name.replace(/^Microsoft\s+|\s+Desktop$/g,''))} · ${esc(ctrName(v.lang.split('-')[0]))}</option>`;
  s.innerHTML=(good.length?'':`<option value="" disabled>${esc(T('dub.noVoice',{lang:ctrName(lang)}))}</option>`)+good.map(opt).join('')+(rest.length?`<optgroup label="${esc(T('dub.others'))}">${rest.map(opt).join('')}</optgroup>`:'');
  if(ctrCfg.voice&&ttsList.some(v=>v.name===ctrCfg.voice)&&(good.some(v=>v.name===ctrCfg.voice)||!good.length))s.value=ctrCfg.voice;
  else if(good.length)s.value=good[0].name;
}
/* phrases : sous-titres qui se suivent sans pause, jusqu'à ~10 s */
function dubGroups(list){
  const g=[];let cur=null;
  for(const c of list){
    const t=ctrFlat(c.p.capTr??c.p.text);if(!t)continue;
    if(cur&&c.start-cur.e<.25&&c.start+c.dur-cur.s<10&&!/[.!?。！？…]$/.test(cur.text)){cur.text+=(CTR_NOSPACE.test(c.p.capLang||'')?'':' ')+t;cur.e=c.start+c.dur}
    else{cur={s:c.start,e:c.start+c.dur,text:t};g.push(cur)}
  }
  return g;
}
async function dubMake(){
  if(ctrBusy)return;
  if(!FS||!FS.ttsMake){toast(T('tts.onlyApp'));return}
  const list=ctrCaps();if(!list.length){toast(T('ctr.noCaps'));return}
  const voice=$('#dubVoice').value;if(!voice){toast(T('dub.pick'));return}
  ctrCfg.voice=voice;ctrCfg.duck=$('#dubDuck').checked;ctrSave();
  const groups=dubGroups(list);
  ctrRunUI(true);ctrStop=false;
  const made=[];let err=null;
  let tr=null; // piste audio à part pour la voix traduite, créée avec la première voix
  try{
    for(let i=0;i<groups.length;i++){
      if(ctrStop)throw new Error('cancelled');
      const g=groups[i],slot=Math.max(.6,(groups[i+1]?groups[i+1].s:g.e+1.5)-g.s-.05);
      ctrPct(i/groups.length,'dub.working');
      const name=T('dub.fileName')+' '+(i+1);
      let f=await FS.ttsMake(g.text,voice,0,name),m=addPaths([f])[0];if(!m)throw new Error('?');await waitMeta([m]);
      // trop longue pour sa place : refaite plus vite (vitesse ×2 au plus)
      if((m.duration||0)>slot*1.03){
        const r=Math.min(6,Math.ceil(6*Math.log2(m.duration/slot*1.02)));
        f=await FS.ttsMake(g.text,voice,r,name);const m2=addPaths([f])[0];
        // la version trop longue sort de la liste des médias (le fichier reste dans Vidéos\DedCut\Médias)
        if(m2){await waitMeta([m2]);media=media.filter(x=>x!==m);if(DB.db)DB.del('media',m.id).catch(()=>{});m=m2}
      }
      if(tr==null)tr=insertTrack('audio');
      const c=newClip({track:tr,mid:m.id,start:g.s,dur:Math.min(m.duration||2,slot+1),p:{vol:100,dub:1}});clips.push(c);made.push(c);
    }
  }catch(e){err=e}
  ctrRunUI(false);
  if(err&&String(err.message)==='cancelled'&&!made.length){refresh();toast(T('cap.cancelled'));return}
  if(err&&!made.length){refresh();toast(T('tts.fail',{error:String(err&&err.message||err).slice(0,140)}));return}
  let ducked=0;
  if(ctrCfg.duck)for(const x of clips){
    if(x.p.dub||!isVid(x)||trk(x).lock)continue;const m=x.mid&&mById(x.mid);if(!m||m.type!=='video')continue;
    if(x.p.dubVol==null){x.p.dubVol=x.p.vol??100;x.p.vol=Math.round(x.p.dubVol*.2);ducked++}
  }
  msel.clear();made.forEach(c=>msel.add(c.id));sel=made[0].id;
  commit();refresh();
  toast(T('dub.done',{count:made.length})+(ducked?' · '+T('dub.ducked'):'')+(err?' · '+T('cap.cancelled'):''));
}

/* ---------- interface (onglet Sous-titres) ---------- */
function ctrBuild(){
  const s=$('#ctrLang');if(!s)return;
  const ui=document.documentElement.lang||'fr';
  if(!ctrCfg.lang)ctrCfg.lang=ui.startsWith('en')?'fr':'en';
  const names=CTR_LANGS.map(c=>[c,ctrName(c)]).sort((a,b)=>a[1].localeCompare(b[1],ui));
  s.innerHTML=names.map(([c,n])=>`<option value="${c}">${esc(n.charAt(0).toUpperCase()+n.slice(1))}</option>`).join('');s.value=ctrCfg.lang;
  $$('#ctrMode button').forEach(b=>b.classList.toggle('on',b.dataset.v===ctrCfg.mode));
  $('#dubDuck').checked=ctrCfg.duck!==false;
  dubFill();ctrSync();
}
function ctrSync(){
  if(!$('#ctrWho'))return;
  const w=ctrWho(),list=ctrCaps();
  $('#ctrWho').textContent=w.text;$('#ctrWho').classList.toggle('warn',!w.ok);
  if(!ctrBusy){$('#ctrGo').disabled=!list.length;$('#dubGo').disabled=!list.length}
  $('#ctrUndo').hidden=!list.some(c=>c.p.capSrc!=null);
}
$('#ctrLang').addEventListener('change',e=>{ctrCfg.lang=e.target.value;ctrSave();dubFill()});
$('#ctrMode').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;ctrCfg.mode=b.dataset.v;ctrSave();$$('#ctrMode button').forEach(x=>x.classList.toggle('on',x===b))});
$('#ctrGo').addEventListener('click',ctrTranslate);
$('#ctrUndo').addEventListener('click',ctrUndo);
$('#ctrCancel').addEventListener('click',()=>{ctrStop=true});
$('#dubGo').addEventListener('click',dubMake);
$('#dubVoice').addEventListener('change',e=>{ctrCfg.voice=e.target.value;ctrSave()});
/* « Ajouter des voix » : page Voix des Réglages de Windows ; au retour dans DedCut, la liste est relue */
let dubWait=false;
{const b=$('#dubAdd');if(b){if(!FS||!FS.ttsSettings)b.hidden=true;else b.addEventListener('click',async()=>{try{await FS.ttsSettings();dubWait=true}catch(e){toast(String((e&&e.message)||e))}})}}
window.addEventListener('focus',()=>{if(!dubWait)return;dubWait=false;ttsList=null;dubFill()});
{const st=showTab;showTab=function(t){st(t);if(t==='cap'){if(window.dedcutBrain&&!brainSt)brainRefresh().then(()=>{if(!$('#t-cap').hidden)ctrSync()});ctrBuild()}}}
{const rf=refresh;refresh=function(){rf();const t=$('#t-cap');if(t&&!t.hidden&&!ctrBusy)ctrSync()}}
window.addEventListener('dedcut-lang',()=>{const t=$('#t-cap');if(t&&!t.hidden)ctrBuild()});

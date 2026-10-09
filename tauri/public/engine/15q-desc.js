/* ---------- Description YouTube automatique (v4.65) ----------
   À partir de ce qui est dit dans la vidéo (sous-titres, sinon texte du montage par le texte), du nom du projet et des
   chapitres (repères) : 3 idées de titre, une description et des hashtags, écrits par une IA de langage — le cerveau de
   DedCut IA (sur ce PC, rien n'est envoyé) ou l'IA choisie dans l'assistant (comme la traduction des sous-titres).
   Sans IA : une description simple faite sur le PC (premières phrases, chapitres, mots les plus utilisés). */
const DESC_IC='<path d="M4 5h16v10H8l-4 4z"/><path d="M8 9h8M8 12h5"/>';
/** ce qui est dit dans la vidéo (texte d'origine des sous-titres, ou mots du montage par le texte) */
function descSpeech(){
  const caps=clips.filter(c=>isText(c)&&c.p.cap).sort((a,b)=>a.start-b.start).map(c=>String(c.p.capSrc??c.p.text).replace(/\s*\n\s*/g,' '));
  if(caps.length)return caps.join(' ');
  if(typeof tedTargets==='function'){
    const out=[];
    for(const c of tedTargets(null)){const m=mById(c.mid),tx=m&&m.tx;if(!tx)continue;const r=c.p.rate||1;for(const w of tx.w){const mid=(w[1]+w[2])/2;if(mid>=c.in&&mid<c.in+c.dur*r)out.push(w[0])}}
    if(out.length)return out.join('').replace(/\s+/g,' ').trim();
  }
  return '';
}
/** chapitres YouTube (repères), une ligne chacun ; '' sans repère */
function descChapters(){
  const ms=[...new Set(markers.map(t=>Math.floor(t)))].sort((a,b)=>a-b);if(!ms.length)return'';
  const f=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(x).padStart(2,'0')};
  const L=[];if(ms[0]>0)L.push('0:00 '+T('chap.intro'));ms.forEach((s,i)=>{const nm=window.mkName?mkName(s):'';L.push(f(s)+' '+(nm||T('chap.name',{n:i+1})))});
  return L.join('\n');
}
/** sans IA : premières phrases, chapitres, mots les plus utilisés en hashtags */
function descLocal(speech){
  const sent=(speech.match(/[^.!?。！？]+[.!?。！？]?/g)||[]).map(s=>s.trim()).filter(s=>s.length>12),intro=sent.slice(0,2).join(' ').slice(0,320);
  const cnt=new Map();for(const w of speech.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]{5,}/gu)||[])cnt.set(w,(cnt.get(w)||0)+1);
  const tags=[...cnt.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([w])=>'#'+w);
  return{titles:[projName&&projName!==T('project.untitled')?projName:(sent[0]||'').slice(0,70)].filter(Boolean),description:(intro?intro+'\n\n':'')+T('desc.subscribe'),hashtags:tags};
}
function descParse(s){
  s=String(s||'').replace(/<think>[\s\S]*?<\/think>/g,'');const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)return null;
  try{const j=JSON.parse(s.slice(a,b+1));if(j&&typeof j.description==='string')return{titles:(Array.isArray(j.titles)?j.titles:[]).filter(x=>typeof x==='string').map(x=>x.trim().slice(0,100)).slice(0,3),description:j.description.trim(),hashtags:(Array.isArray(j.hashtags)?j.hashtags:[]).filter(x=>typeof x==='string').map(x=>'#'+x.replace(/^#+/,'').replace(/\s+/g,'')).filter(x=>x.length>1).slice(0,8)}}catch(e){}
  return null;
}
/** écrit titres + description + hashtags (IA si possible, sinon sur le PC) ; say : messages pendant le travail */
async function descWrite(say){
  const speech=descSpeech();if(!speech)return{error:'nospeech'};
  let ai=null;try{ai=await ctrAI(say)}catch(e){ai=null}
  if(!ai)return Object.assign(descLocal(speech),{local:true});
  const lang=ctrName(document.documentElement.lang||'fr','en');
  const sys='You write YouTube metadata in '+lang+' for the video described by the user. Write: "titles": 3 short catchy titles that stay honest (under 70 characters each), "description": 2 short paragraphs (what the video is about and why to watch it, then an invitation to subscribe), "hashtags": 3 to 6 hashtags without spaces. Use the spoken words of the video; never invent facts. Reply with ONLY a JSON object: {"titles":[...],"description":"...","hashtags":[...]}';
  const text='Project name: '+(projName||'')+'\nVideo length: '+fmt(total())+'\nSpoken words:\n'+speech.slice(0,7000);
  for(let k=0;k<2;k++){
    let r;try{r=await window.dedcutChat.once({...ai,system:sys,text,maxTokens:1500})}catch(e){const code=e&&e.code||'other';return{error:'ai',msg:code==='other'||code==='bad'?String(e&&e.message||e).slice(0,200):T('chat.err.'+code)}}
    const j=descParse(r);if(j)return j;
  }
  return Object.assign(descLocal(speech),{local:true});
}
const descCopy=txt=>(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast(T('desc.copied'))).catch(()=>{askText('',txt,{ro:true})});

function descOpen(){
  if($('#descdlg'))return;
  if(appMode!=='edit')setMode('edit');
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='descdlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box desc-box" role="dialog" aria-modal="true" aria-labelledby="descT">
    <div class="dcq-h"><span class="dcq-ic">${thIco(DESC_IC)}</span><b id="descT">${T('desc.title')}</b><button class="dcthumb-x" data-dx title="${esc(T('common.close'))}">${thIco('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="dcthumb-p" id="descInfo">${T('desc.intro')}</p>
    <div class="dcthumb-bar" id="descBarW" hidden><i id="descBar" style="width:100%"></i></div>
    <div id="descOut" hidden>
      <h5>${T('desc.titles')}</h5><div id="descTitles" class="desc-titles"></div>
      <h5>${T('desc.text')}</h5><textarea id="descText" rows="9" spellcheck="true"></textarea>
      <h5>${T('desc.tags')}</h5><input type="text" id="descTags" maxlength="300">
      <p class="dcthumb-note" id="descWho"></p>
    </div>
    <div class="dcq-b"><button class="dcq-no" data-dx>${T('common.close')}</button><button id="descAgain" hidden>${T('desc.again')}</button><button class="dcq-ok" id="descCopyB" hidden>${T('desc.copy')}</button></div></div>`;
  document.body.appendChild(m);
  const prev=document.activeElement;let busy=false,closed=false;
  const end=()=>{closed=true;removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const key=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();e.stopPropagation();end()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  m.addEventListener('click',e=>{
    if(e.target.closest('[data-dx]')&&!busy){end();return}
    const c=e.target.closest('[data-dcopy]');if(c)descCopy(c.dataset.dcopy);
  });
  const run=async()=>{
    busy=true;$('#descBarW').hidden=false;$('#descOut').hidden=true;$('#descCopyB').hidden=true;$('#descAgain').hidden=true;
    $('#descInfo').textContent=T('desc.working');
    const r=await descWrite(t=>{if(!closed)$('#descInfo').textContent=t});
    busy=false;if(closed)return;$('#descBarW').hidden=true;
    if(r.error==='nospeech'){$('#descInfo').innerHTML=esc(T('desc.noSpeech'))+` <button class="sm" id="descCaps">${esc(T('cap.create'))}</button>`;$('#descCaps').onclick=()=>{end();showTab('cap')};return}
    if(r.error){$('#descInfo').textContent=T('desc.fail',{error:r.msg||''});$('#descAgain').hidden=false;return}
    const ch=descChapters();
    $('#descTitles').innerHTML=(r.titles.length?r.titles:[projName||'']).map(x=>`<div class="desc-ti"><span>${esc(x)}</span><button class="sm" data-dcopy="${esc(x)}">${T('desc.copyOne')}</button></div>`).join('');
    $('#descText').value=r.description+(ch?'\n\n'+T('desc.chapters')+'\n'+ch:'');
    $('#descTags').value=r.hashtags.join(' ');
    $('#descWho').textContent=r.local?T('desc.local'):T('desc.byAi');
    $('#descInfo').textContent=T('desc.ready');
    $('#descOut').hidden=false;$('#descCopyB').hidden=false;$('#descAgain').hidden=false;
  };
  $('#descCopyB').onclick=()=>{const tg=$('#descTags').value.trim();descCopy($('#descText').value.trim()+(tg?'\n\n'+tg:''))};
  $('#descAgain').onclick=run;
  run();
}
/* entrées : fenêtre Exporter, Ctrl+K, assistant, DedCut IA */
$('#xDesc')&&$('#xDesc').addEventListener('click',()=>{$('#ov').style.display='none';descOpen()});
CMDS.push({id:'ytdesc',n:'desc.title',f:()=>descOpen()});
SPACE_TOOLS.write_description=async()=>{
  const r=await descWrite(()=>{});
  if(r.error==='nospeech')throw new Error('no spoken words: make the subtitles first (add_captions)');
  if(r.error)throw new Error(r.msg||'the AI did not answer');
  const ch=descChapters();return{titles:r.titles,description:r.description+(ch?'\n\n'+ch:''),hashtags:r.hashtags,made_on_this_pc_without_ai:!!r.local};
};
MCP_READ.add('write_description');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['description','descripción','descrizione','descrição','beschreibung','説明','概要欄','설명','简介','描述'])&&dcHas(q,['youtube','vidéo','video','vídeo','動画','영상','视频','titre','title','hashtag','hashtags'])){
    descOpen();return{text:T('desc.aiOpened')};
  }
  return b(raw,q);
}}

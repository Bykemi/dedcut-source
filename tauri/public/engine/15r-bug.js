/* ---------- Signaler un bug (v4.67) ----------
   DedCut est en bêta : une fenêtre prépare un message pour ByKemi (bugs@dedcut.com). DedCut n'envoie rien tout seul :
   le message s'ouvre dans la messagerie de l'utilisateur (Gmail, Outlook ou son application d'e-mail), ou il le copie.
   Infos techniques jointes (case décochable, texte visible avant l'envoi) : version, Windows, langue, espace, écran,
   carte graphique, taille du projet et dernières erreurs — sans nom de fichier, chemin du PC, e-mail ni clé.
   Ouvert par : la pastille « bêta » (barre du haut et accueil), Menu > Signaler un bug, l'accueil, À propos, Ctrl+K,
   DedCut IA (« signaler un bug »). window.dedcutBug.open() pour la partie React. */
const BUG_MAIL='bugs@dedcut.com';
const BUG_IC='<path d="M9 7.5a3 3 0 0 1 6 0"/><path d="M12 8a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0v-2a5 5 0 0 1 5-5z"/><path d="M12 12v8M7 13H3.5M17 13h3.5M7.5 17.5l-3 2M16.5 17.5l3 2M7.5 9.5l-3-2M16.5 9.5l3-2M10 5L8.5 3M14 5l1.5-2"/>';
const BUG_ERR=[],BUG_T0=Date.now();
let bugDraft={what:'',before:'',tech:true};
/** enlève tout ce qui peut être personnel : chemins du PC, noms de fichiers, e-mails, clés */
function bugClean(s){
  s=String(s==null?'':s).replace(/%5C/gi,'\\').replace(/%2F/gi,'/').replace(/%3A/gi,':').replace(/%20/g,' ');
  return s
    .replace(/https?:\/\/(?:asset|tauri)\.localhost\/[^\s"')]*/gi,'(fichier)')
    .replace(/blob:[^\s"')]+/gi,'blob:…')
    .replace(/[A-Za-z]:[\\/][^\s"'<>|*?]*/g,'(chemin)')
    .replace(/(?:\/Users|\/home)\/[^\s"')]*/g,'(chemin)')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'(e-mail)')
    .replace(/\b(key|token|secret|password|pass|auth|sig|code|access_token|refresh_token|client_secret)\s*[=:]\s*[^&\s,;]+/gi,'$1=…')
    .replace(/\b(?:live|rtmps?|srt)_?[A-Za-z0-9]{16,}\b/g,'(clé)')
    .replace(/[^\s"'\\/]+\.(?:mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a|flac|ogg|aac|opus|png|jpe?g|webp|gif|bmp|psd|tiff?|heic|dedcut|srt|vtt|ass|json|zip)\b/gi,'(fichier)')
    .replace(/\s+/g,' ').trim().slice(0,240);
}
function bugNote(m){
  const s=bugClean(m);if(!s||/^INFO:|XNNPACK|^\[vite\]/i.test(s))return;
  const last=BUG_ERR[BUG_ERR.length-1];if(last&&last.m===s){last.n++;last.t=Date.now();return}
  BUG_ERR.push({t:Date.now(),m:s,n:1});if(BUG_ERR.length>8)BUG_ERR.shift();
}
addEventListener('error',e=>{if(e&&e.message)bugNote(e.message+(e.filename?' @ '+String(e.filename).split('/').pop()+':'+e.lineno:''))});
addEventListener('unhandledrejection',e=>{const r=e&&e.reason;bugNote('promesse : '+(r&&(r.message||r.error)||r))});
{const ce=console.error;console.error=function(...a){try{bugNote(a.map(x=>x&&x.message?x.message:typeof x==='string'?x:'').filter(Boolean).join(' '))}catch(e){}return ce.apply(this,a)}}

let bugWin='';
if(navigator.userAgentData&&navigator.userAgentData.getHighEntropyValues)navigator.userAgentData.getHighEntropyValues(['platformVersion','bitness']).then(v=>{
  const mj=parseInt(v.platformVersion,10);if(navigator.userAgentData.platform==='Windows')bugWin=(mj>=13?'Windows 11':'Windows 10')+(v.bitness?' ('+v.bitness+' bits)':'');
}).catch(()=>{});
function bugGpu(){try{const c=document.createElement('canvas').getContext('webgl');const x=c&&c.getExtension('WEBGL_debug_renderer_info');const g=x?c.getParameter(x.UNMASKED_RENDERER_WEBGL):'';const l=c&&c.getExtension('WEBGL_lose_context');if(l)l.loseContext();return bugClean(g).replace(/\s*\(0x[0-9a-f]+\)/gi,'')}catch(e){return ''}}
const bugAgo=t=>{const s=Math.round((Date.now()-t)/1000);return s<90?s+' s':s<5400?Math.round(s/60)+' min':Math.round(s/3600)+' h'};
/** infos techniques (en français : c'est ByKemi qui les lit) */
function bugTech(){
  const ua=navigator.userAgent,L=[];
  L.push('DedCut '+(appVersion()||'?')+' (bêta)');
  L.push('Système : '+(bugWin||(/Windows NT/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Android/.test(ua)?'Android':navigator.platform||'?')));
  L.push('Langue : '+(document.documentElement.lang||'?')+' · espace : '+({edit:'Montage',rec:'Enregistrer',live:'Live',image:'Image',music:'Musique'}[appMode]||appMode)+(typeof simpleOn!=='undefined'&&simpleOn?' (mode simple)':''));
  L.push('Écran : '+screen.width+'×'+screen.height+' ×'+(Math.round(devicePixelRatio*100)/100)+(navigator.deviceMemory?' · mémoire ≈ '+navigator.deviceMemory+' Go':'')+(navigator.hardwareConcurrency?' · '+navigator.hardwareConcurrency+' cœurs':''));
  const g=bugGpu();if(g)L.push('Carte graphique : '+g);
  try{if(clips.length)L.push('Projet : '+W+'×'+H+' · '+Math.round(total())+' s · '+clips.length+' éléments · '+tracks.length+' pistes')}catch(e){}
  L.push('Ouvert depuis : '+bugAgo(BUG_T0));
  if(BUG_ERR.length){L.push('Dernières erreurs :');for(const e of BUG_ERR.slice().reverse())L.push('- il y a '+bugAgo(e.t)+(e.n>1?' (×'+e.n+')':'')+' : '+e.m)}
  else L.push('Dernières erreurs : aucune');
  return L.join('\n');
}
function bugMessage(max){
  const what=bugDraft.what.trim(),before=bugDraft.before.trim();
  const subject=T('bug.subject',{version:appVersion()||''})+' : '+what.replace(/\s+/g,' ').slice(0,60)+(what.length>60?'…':'');
  let body=T('bug.h.what')+'\n'+what+'\n'+(before?'\n'+T('bug.h.before')+'\n'+before+'\n':'');
  if(bugDraft.tech){let t=bugTech();body+='\n— '+T('bug.h.tech')+' —\n';const room=max-body.length;if(t.length>room)t=t.slice(0,Math.max(0,room-1))+'…';body+=t}
  return{subject,body:body.slice(0,max)};
}
function bugOpen(){
  if($('#bugdlg')){$('#bugWhat').focus();return}
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='bugdlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box bug-box" role="dialog" aria-modal="true" aria-labelledby="bugT">
    <div class="dcq-h"><span class="dcq-ic">${thIco(BUG_IC)}</span><b id="bugT">${T('bug.title')}</b><button class="dcthumb-x" data-bx title="${esc(T('common.close'))}">${thIco('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="dcthumb-p">${esc(T('bug.intro',{mail:BUG_MAIL}))}</p>
    <label class="bug-l" for="bugWhat">${T('bug.what')}</label>
    <textarea id="bugWhat" rows="4" maxlength="3000" spellcheck="true" placeholder="${esc(T('bug.whatPh'))}"></textarea>
    <label class="bug-l" for="bugBefore">${T('bug.before')}</label>
    <textarea id="bugBefore" rows="2" maxlength="1500" spellcheck="true" placeholder="${esc(T('bug.beforePh'))}"></textarea>
    <label class="bug-chk"><input type="checkbox" id="bugTech"> <span>${T('bug.tech')}</span></label>
    <details class="bug-det"><summary>${T('bug.see')}</summary><pre id="bugTechTxt"></pre></details>
    <p class="dcthumb-note">${T('bug.private')}</p>
    <p class="bug-msg" id="bugMsg" role="status" aria-live="polite"></p>
    <div class="dcq-b bug-send">
      <button data-bs="copy">${thIco('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>')}<span>${T('bug.copy')}</span></button>
      <button data-bs="app">${thIco('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>')}<span>${T('bug.mailApp')}</span></button>
      <button data-bs="outlook"><span>${T('bug.outlook')}</span></button>
      <button class="dcq-ok" data-bs="gmail"><span>${T('bug.gmail')}</span></button></div></div>`;
  document.body.appendChild(m);
  const prev=document.activeElement,what=$('#bugWhat'),before=$('#bugBefore'),tech=$('#bugTech'),msg=$('#bugMsg');
  what.value=bugDraft.what;before.value=bugDraft.before;tech.checked=bugDraft.tech;
  const sync=()=>{bugDraft={what:what.value,before:before.value,tech:tech.checked};$('#bugTechTxt').textContent=bugTech();$('#bugTechTxt').parentElement.hidden=!tech.checked};
  sync();setTimeout(()=>what.focus(),30);
  const end=()=>{sync();removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  what.addEventListener('input',()=>{sync();msg.textContent=''});before.addEventListener('input',sync);tech.addEventListener('change',sync);
  const open=u=>(FS&&FS.openLink?FS.openLink(u):Promise.resolve(window.open(u,'_blank','noopener')));
  m.addEventListener('click',e=>{
    if(e.target.closest('[data-bx]')){end();return}
    const b=e.target.closest('[data-bs]');if(!b)return;
    sync();
    if(!bugDraft.what.trim()){msg.textContent=T('bug.empty');msg.className='bug-msg warn';what.focus();return}
    const how=b.dataset.bs,q=encodeURIComponent;
    if(how==='copy'){
      const {subject,body}=bugMessage(20000),txt=T('bug.to')+' '+BUG_MAIL+'\n'+T('bug.subj')+' '+subject+'\n\n'+body;
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{msg.textContent=T('bug.copied',{mail:BUG_MAIL});msg.className='bug-msg ok'}).catch(()=>askText('',txt,{ro:true}));
      return;
    }
    const {subject,body}=bugMessage(how==='app'?1600:5500);
    const url=how==='gmail'?'https://mail.google.com/mail/?view=cm&fs=1&to='+q(BUG_MAIL)+'&su='+q(subject)+'&body='+q(body)
      :how==='outlook'?'https://outlook.live.com/mail/0/deeplink/compose?to='+q(BUG_MAIL)+'&subject='+q(subject)+'&body='+q(body)
      :'mailto:'+BUG_MAIL+'?subject='+q(subject)+'&body='+q(body);
    Promise.resolve(open(url)).then(()=>{msg.textContent=T('bug.sent');msg.className='bug-msg ok'}).catch(()=>{msg.textContent=T('bug.noApp',{mail:BUG_MAIL});msg.className='bug-msg warn'});
  });
}
window.dedcutBug={open:bugOpen,mail:BUG_MAIL};
CMDS.push({id:'bugreport',n:'bug.cmd',f:()=>bugOpen()});
// pastille « bêta » de la barre du haut : un clic ouvre la fenêtre
document.addEventListener('click',e=>{if(e.target.closest('.brand .beta'))bugOpen()});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('.brand .beta')){e.preventDefault();bugOpen()}});
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['signaler un bug','signaler un probleme','signaler une erreur','signale un bug','report a bug','report bug','report a problem','reportar un error','reportar un fallo','informar de un error','fehler melden','bug melden','segnalare un bug','segnala un bug','segnalare un problema','reportar um bug','relatar um bug','reportar um problema','バグを報告','不具合を報告','버그 신고','버그 제보','报告错误','报告问题','反馈问题','报告bug'])){
    bugOpen();return{text:T('bug.aiOpened',{mail:BUG_MAIL})};
  }
  return b(raw,q);
}}

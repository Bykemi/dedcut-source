/* ---------- mises à jour automatiques (src/updates.ts) : vérification au démarrage (désactivable), bandeau, fenêtre ---------- */
let updInfo=null,updBusy=false,updMsg='',updQ=-1;
const updAuto=()=>{try{return localStorage.getItem('dedcut-upd-auto')!=='0'}catch(x){return true}};
async function updCheck(quiet){
  const U=window.dedcutUpdate;if(!U){if(!quiet)toast(T('ai.onlyApp'));return}
  updMsg=T('upd.checking');if($('#upddlg'))openUpd();
  try{updInfo=await U.check();updMsg=updInfo?T('upd.found',{version:updInfo.version}):T('upd.none')}
  catch(e){updInfo=null;updMsg=navigator.onLine===false?T('upd.offline'):T('upd.error',{error:String((e&&e.message)||e).slice(0,160)})}
  if($('#upddlg'))openUpd();
  if(updInfo&&!$('#upddlg'))updBar();
  else if(!quiet&&!$('#upddlg'))toast(updMsg);
}
function updBar(){
  let b=$('#updbar');if(!b){b=document.createElement('div');b.id='updbar';b.className='updbar';document.body.appendChild(b);
    b.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.ui!=null)updInstall();if(x.dataset.uo!=null)openUpd();if(x.dataset.ul!=null)b.remove()})}
  b.innerHTML=`<span>${ico('export',15)} ${esc(T('upd.found',{version:updInfo.version}))}</span><button class="sm pri" data-ui>${T('upd.install')}</button><button class="sm" data-uo>${T('upd.details')}</button><button class="sm" data-ul>${T('upd.later')}</button>`;
}
async function updInstall(){
  const U=window.dedcutUpdate;if(!U||!updInfo||updBusy)return;
  updBusy=true;updQ=0;$('#updbar')?.remove();openUpd();
  // le projet ouvert est enregistré avant : DedCut va se fermer pendant l'installation
  try{if(projDirty&&projPath)await saveProject(false)}catch(e){}
  try{await U.install(q=>{updQ=q;const p=$('#updProg');if(p)p.style.width=(q*100)+'%';const t=$('#updState');if(t)t.textContent=q<1?T('upd.downloading',{pct:window.i18n.fmt.percent(q)}):T('upd.installing')})}
  catch(e){updBusy=false;updQ=-1;updMsg=T('upd.error',{error:String((e&&e.message)||e).slice(0,160)});openUpd()}
}
function openUpd(){
  $('#updbar')?.remove();
  let o=$('#upddlg');if(!o){o=document.createElement('div');o.id='upddlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',e=>{if(e.target===o&&!updBusy)o.remove()});
    o.addEventListener('change',e=>{if(e.target.id==='updAuto'){try{localStorage.setItem('dedcut-upd-auto',e.target.checked?'1':'0')}catch(x){}}});
    o.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.ux!=null&&!updBusy)o.remove();if(b.dataset.uc!=null)updCheck(false);if(b.dataset.ui!=null)updInstall()})}
  const notes=updInfo&&updInfo.notes?`<p class="hint">${T('upd.notes')}</p><pre class="aicfg updnotes">${esc(updInfo.notes)}</pre>`:'';
  o.innerHTML=`<div class="kbbox aibox"><div class="kbhead"><h3>${T('upd.title')}</h3><button class="sm" data-ux ${updBusy?'disabled':''}>${T('kb.close')}</button></div>
    <p>${T('upd.current',{version:appVersion()})}</p>
    ${updBusy?`<div class="updprog"><i id="updProg" style="width:${Math.max(0,updQ)*100}%"></i></div><p class="hint" id="updState">${T('upd.downloading',{pct:window.i18n.fmt.percent(Math.max(0,updQ))})}</p>`
      :`<p class="aistate ${updInfo?'on':''}">${esc(updMsg)}</p>${notes}<div class="pre">${updInfo?`<button class="pri" data-ui>${T('upd.install')}</button>`:''}<button class="sm" data-uc>${T('upd.check')}</button></div>`}
    <label class="chk aion"><span>${T('upd.auto')}</span><input type="checkbox" id="updAuto" ${updAuto()?'checked':''}></label>
    <p class="hint">${T('upd.privacy')}</p></div>`;
}
window.addEventListener('dedcut-lang',()=>{if($('#upddlg'))openUpd();if($('#updbar')&&updInfo)updBar()});
if(updAuto())setTimeout(()=>{if(window.dedcutUpdate)updCheck(true)},8000);

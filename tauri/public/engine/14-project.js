/* ---------- projets et médias sur le disque (cahier des charges §18) ----------
   Le fichier .dedcut (v3) est un petit fichier JSON : il garde le chemin de chaque média
   (absolu + relatif au projet) au lieu de copier les vidéos. Les fichiers déplacés peuvent être reliés. */
const FS=window.dedcutFS||null;
let projPath=null,projDirty=false,restoredDirty=false;
const baseName=p=>String(p).split(/[\\/]/).pop();
const dirOf=p=>String(p).replace(/[\\/][^\\/]*$/,'');
const splitP=p=>String(p).replace(/\//g,'\\').split('\\').filter((s,i)=>s||i===0);
function relPath(fromDir,to){
  const a=splitP(fromDir),b=splitP(to);
  if(!a.length||!b.length||a[0].toLowerCase()!==b[0].toLowerCase())return null; // autre disque
  let i=0;while(i<a.length&&i<b.length&&a[i].toLowerCase()===b[i].toLowerCase())i++;
  return[...Array(a.length-i).fill('..'),...b.slice(i)].join('\\');
}
function joinPath(dir,rel){const out=splitP(dir);for(const s of String(rel).split(/[\\/]/)){if(s==='..')out.pop();else if(s&&s!=='.')out.push(s)}return out.join('\\')}
const extType=n=>{const e=(String(n).split('.').pop()||'').toLowerCase();return/^(mp4|mov|m4v|mkv|webm|avi|wmv|mpg|mpeg|3gp|ts)$/.test(e)?'video':/^(mp3|wav|ogg|oga|m4a|aac|flac|opus|wma|weba)$/.test(e)?'audio':/^(png|jpe?g|gif|webp|bmp|avif)$/.test(e)?'image':null};
function addPaths(list){
  const made=[];
  for(const f of list){
    const type=extType(f.name||f.path);if(!type){toast(T('media.unsupported',{name:f.name||baseName(f.path)}));continue}
    const m={id:uid++,name:f.name||baseName(f.path),type,path:f.path,size:f.size||0,url:FS.fileUrl(f.path),duration:5,thumb:null};
    media.push(m);made.push(m);loadMeta(m);
  }
  renderBin();return made;
}
async function importMedia(){if(!FS){$('#file').click();return[]}return addPaths(await FS.pickMedia(T('media.importFilter')))}
/* fichier créé par DedCut (bruitage, arrêt sur image, logo, voix off) : écrit dans Vidéos\DedCut\Médias */
async function addGenerated(file){if(!FS)return addFiles([file])[0];return addPaths([await FS.saveMedia(file)])[0]}
const waitMeta=(ms,max=8000)=>new Promise(r=>{const t0=Date.now(),iv=setInterval(()=>{if(ms.every(m=>!m||m.ok||m.missing)||Date.now()-t0>max){clearInterval(iv);r()}},100)});
function resetProject(){
  pause();els.forEach(e=>{if(e.pause)e.pause()});els.clear();
  demuxCache.clear();abufCache.clear();
  media.forEach(m=>{if(m.url&&m.url.startsWith('blob:'))URL.revokeObjectURL(m.url)});
  media=[];clips=[];sel=null;time=0;markers=[];lastSnapSig='';lastSnapAt=0;
  if(DB.db){DB.clear('media').catch(()=>{});DB.del('kv','snaps').catch(()=>{})}
}
const confirmReplace=async()=>!(clips.length&&projDirty)||askYes(T('project.unsavedConfirm'));
async function newProject(w,h){
  if(!(await confirmReplace()))return false;
  resetProject();setFormat(w||1920,h||1080,false);applyExtras({name:T('project.untitled')});
  projPath=null;commit();projDirty=false;renderBin();refresh();autosave();return true;
}
/* miniature du projet pour les projets récents */
function projThumb(){
  try{const k=document.createElement('canvas'),s=Math.min(1,240/Math.max(W,H));k.width=Math.round(W*s);k.height=Math.round(H*s);
    render(Math.min(time,Math.max(0,total()-.05)));const g=k.getContext('2d');g.drawImage(cv,0,0,k.width,k.height);
    // image encore noire (vidéo pas chargée) : on prend la miniature d'un média
    const px=g.getImageData(0,0,k.width,k.height).data;let mx=0;for(let i=0;i<px.length;i+=97)mx=Math.max(mx,px[i]);
    if(mx<12){const t=media.find(m=>m.thumb&&m.thumb.startsWith('data:'));if(t)return t.thumb}
    return k.toDataURL('image/jpeg',.7)}catch(e){return null}
}
async function getRecents(){
  if(!DB.db)return[];const l=(await DB.get('kv','recent'))||[];
  if(FS&&l.length){const inf=await FS.allowPaths(l.map(r=>r.path));l.forEach((r,i)=>r.exists=!!(inf[i]&&inf[i].exists))}
  return l;
}
async function addRecent(p){
  if(!DB.db)return;const l=((await DB.get('kv','recent'))||[]).filter(r=>r.path.toLowerCase()!==p.toLowerCase());
  l.unshift({path:p,name:projName,date:Date.now(),W,H,dur:total(),clips:clips.length,thumb:projThumb()});
  await DB.put('kv','recent',l.slice(0,15));
}
async function deleteProject(p){
  if(!FS||!FS.trashProject)return false;
  try{await FS.trashProject(p)}catch(x){toast(T('home.deleteFail',{error:String((x&&x.message)||x).slice(0,160)}));return false}
  await removeRecent(p);if(projPath===p){projPath=null;projDirty=true}toast(T('home.deleted'));return true;
}
async function removeRecent(p){if(DB.db)await DB.put('kv','recent',((await DB.get('kv','recent'))||[]).filter(r=>r.path!==p))}
/* contenu du fichier .dedcut (chemins des médias relatifs au dossier du projet) */
function projDoc(dir){
  return{format:'dedcut',v:3,app:appVersion(),saved:new Date().toISOString(),W,H,uid,clips,markers,tracks,scenes:scenesOut(),bg:bgColor,name:projName,mvol:masterVol,mlim:masterLim,mx:window.mxOut?mxOut():undefined,
    media:media.filter(m=>m.path).map(m=>({id:m.id,name:m.name,type:m.type,duration:m.duration,w:m.w,h:m.h,size:m.size,path:m.path,rel:relPath(dir,m.path),thumb:m.thumb&&m.thumb.startsWith('data:')?m.thumb:null,tx:m.tx||undefined}))};
}
async function saveProject(as){
  if(!FS)return legacySaveProject();
  try{
    for(const m of media.filter(m=>!m.path&&m.blob)){const f=await FS.saveMedia(m.blob,m.name);m.path=f.path;m.size=f.size;persistMedia(m)}
    let p=as?null:projPath;
    if(!p){p=await FS.chooseSave(safeName(projName)+'.dedcut',T('project.filterName'));if(!p)return false}
    if(!projName||projName===T('project.untitled'))setName(baseName(p).replace(/\.dedcut$/i,''));
    await FS.writeProject(p,JSON.stringify(projDoc(dirOf(p))));
    projPath=p;projDirty=false;await addRecent(p);autosave();toast(T('project.saved',{name:baseName(p)}));return true;
  }catch(e){console.error(e);toast(T('project.saveError'));return false}
}
async function openProjectPath(p,skipConfirm){
  let buf;
  try{const r=await appFetch('app://dedcut/__file?p='+encodeURIComponent(p));if(!r.ok)throw 0;buf=new Uint8Array(await r.arrayBuffer())}catch(e){toast(T('project.openError'));return false}
  if(!skipConfirm&&!(await confirmReplace()))return false;
  if(new TextDecoder().decode(buf.subarray(0,8))==='DEDCUT1:')return legacyOpenProject(new File([buf],baseName(p)),true);
  let doc;
  try{doc=JSON.parse(new TextDecoder().decode(buf));if(doc.format!=='dedcut'||!Array.isArray(doc.clips))throw 0}catch(e){toast(T('project.invalid'));return false}
  resetProject();
  const dir=dirOf(p),list=Array.isArray(doc.media)?doc.media:[];
  // chemin absolu d'abord, sinon chemin relatif au projet (dossier déplacé avec ses vidéos)
  const cand=list.map(mm=>[mm.path,mm.rel?joinPath(dir,mm.rel):null]);
  const inf=FS?await FS.allowPaths(cand.flat().filter(Boolean)):[];
  const ok=new Set(inf.filter(i=>i.exists).map(i=>i.path.toLowerCase()));
  list.forEach((mm,i)=>{
    const hit=cand[i].find(x=>x&&ok.has(x.toLowerCase()))||null;
    const m={id:mm.id,name:mm.name,type:mm.type,duration:mm.duration||5,w:mm.w,h:mm.h,size:mm.size||0,path:hit||mm.path,url:hit?FS.fileUrl(hit):null,missing:!hit,thumb:mm.thumb||null,ok:true,tx:mm.tx&&Array.isArray(mm.tx.w)?mm.tx:undefined};
    if(m.type==='image'&&m.url)m.thumb=m.url;
    media.push(m);persistMedia(m);if(!m.missing)queueWave(m);
  });
  setFormat(doc.W||1920,doc.H||1080,false);clips=doc.clips;applyExtras(doc);
  uid=Math.max(uid,doc.uid||1,...media.map(m=>m.id+1),...clips.map(c=>c.id+1));
  projPath=p;commit();projDirty=false;renderBin();refresh();autosave();await addRecent(p);
  const miss=media.filter(m=>m.missing).length;
  if(miss){showTab('media');toast(T('media.missingCount',{count:miss}))}else toast(T('project.opened',{name:baseName(p)}));
  return true;
}
async function openDialog(){if(!FS){$('#pfile').click();return false}const p=await FS.openProjectDialog(T('project.filterName'));return p?openProjectPath(p):false}
async function openPath(p){return openProjectPath(p)}
/* fichier déplacé ou renommé : l'utilisateur le montre, puis on cherche les autres dans le même dossier */
async function relinkMedia(id){
  const m=mById(id);if(!m||!FS)return;
  const f=await FS.pickOne(T('media.relinkTitle',{name:m.name}),T('media.importFilter'));if(!f)return;
  const fix=(mm,path,size)=>{
    mm.path=path;if(size)mm.size=size;mm.url=FS.fileUrl(path);mm.missing=false;mm.ok=false;
    clips.filter(c=>c.mid===mm.id).forEach(c=>{const e=els.get(c.id);if(e&&e.pause)e.pause();els.delete(c.id)});
    demuxCache.delete(mm.id);abufCache.delete(mm.id);if(mm.type==='image')mm.thumb=mm.url;loadMeta(mm);
  };
  fix(m,f.path,f.size);let n=1;
  const others=media.filter(x=>x.missing);
  if(others.length){const found=await FS.findInDir(dirOf(f.path),others.map(x=>x.name));others.forEach((x,i)=>{if(found[i]){fix(x,found[i]);n++}})}
  commit();renderBin();refresh();toast(T('media.relinked',{count:n}));
}
/* glisser-déposer depuis l'explorateur Windows (chemins fournis par Tauri) */
window.dedcutDragOver=on=>document.body.classList.toggle('dropping',!!on);
window.dedcutDrop=async(paths,x,y)=>{
  if(!FS||!paths||!paths.length)return;
  const inf=await FS.allowPaths(paths);
  const proj=inf.find(i=>i.exists&&/\.dedcut$/i.test(i.path));
  if(proj){if(await openProjectPath(proj.path))window.dispatchEvent(new CustomEvent('dedcut-home-close'));return}
  const files=inf.filter(i=>i.exists&&extType(i.name));
  if(!files.length){if(inf.length)toast(T('media.unsupported',{name:inf[0].name}));return}
  if(window.dedcutHomeVisible){if(await startWithMedia(files))window.dispatchEvent(new CustomEvent('dedcut-home-close'));return}
  const ms=await addPaths(files),r=$('#tls').getBoundingClientRect();
  if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){
    await waitMeta(ms);const ir=$('#tli').getBoundingClientRect(),yy=y-ir.top,tr=trackAtY(yy);let t=Math.max(0,(x-ir.left)/pxs);
    for(const m of ms){addFromMedia(m.id,tr!=null&&tracks[tr].kind==='over'&&m.type!=='audio',t,tr);if(m.type!=='audio')t+=m.type==='video'?m.duration:5}
  }
};
async function startWithMedia(files){
  if(!(await newProject(1920,1080)))return false;
  const ms=await addPaths(files);await waitMeta(ms);
  const v=ms.find(m=>m.type!=='audio'&&m.w&&m.h);if(v&&v.h>v.w)setFormat(1080,1920,false);
  for(const m of ms)if(m.type!=='audio')addFromMedia(m.id,false);
  for(const m of ms)if(m.type==='audio')addFromMedia(m.id,false,0);
  sel=null;commit();refresh();return true;
}
async function importAndStart(){
  if(!FS){if(await newProject(1920,1080))$('#file').click();return true}
  const l=await FS.pickMedia(T('media.importFilter'));if(!l.length)return false;return startWithMedia(l);
}
/* glisser une carte de média vers la timeline (à la souris : le glisser HTML est désactivé par Tauri sous Windows) */
let mdrag=null;
$('#mlist').addEventListener('pointerdown',e=>{const c=e.target.closest('.card');if(!c||e.button!==0||e.target.closest('button'))return;mdrag={id:+c.dataset.mid,x:e.clientX,y:e.clientY,ghost:null}});
const overTL=e=>{const r=$('#tls').getBoundingClientRect(),p=ptIn(e,$('#tls'));return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom};
addEventListener('pointermove',e=>{
  if(!mdrag)return;
  if(!mdrag.ghost){if(Math.hypot(e.clientX-mdrag.x,e.clientY-mdrag.y)<6)return;const m=mById(mdrag.id);const g=document.createElement('div');g.className='mghost';g.textContent=m?m.name:'';document.body.appendChild(g);mdrag.ghost=g}
  mdrag.ghost.style.left=(e.clientX+14)+'px';mdrag.ghost.style.top=(e.clientY+10)+'px';$('#tli').classList.toggle('dropok',overTL(e));
});
addEventListener('pointerup',e=>{
  if(!mdrag)return;const d=mdrag;mdrag=null;if(!d.ghost)return;d.ghost.remove();$('#tli').classList.remove('dropok');
  if(!overTL(e))return;const tr=trackAtY(ptIn(e,$('#tli')).y-$('#tli').getBoundingClientRect().top);
  const ov=tr!=null&&tracks[tr].kind==='over',at=Math.max(0,xToT(e)),mode=e.ctrlKey||e.metaKey?'insert':e.altKey?'over':null; // Ctrl = insérer, Alt = écraser
  if(mode&&window.editDrop)editDrop(d.id,ov,at,tr,mode);else addFromMedia(d.id,ov,at,tr);
});
/* boutons du haut */
$('#bSave').onclick=()=>saveProject(false);
/* bouton « Menu » de la barre du haut : regroupe les commandes de fichier, d'affichage et d'aide */
$('#bMenu').onclick=e=>{
  const r=e.currentTarget.getBoundingClientRect(),mini=$('#left').classList.contains('railmini');
  showCtx([
    {label:'menu.home',fn:()=>window.dispatchEvent(new CustomEvent('dedcut-home'))},
    {label:'ui.new',fn:()=>$('#bNew').click()},
    {label:'common.open',fn:()=>$('#bOpen').click()},
    {label:'ui.save',key:kbLabel('save'),fn:()=>$('#bSave').click()},
    {label:'kb.saveAs',key:kbLabel('saveAs'),fn:()=>saveProject(true)},
    {label:'pj.saveCopy',fn:()=>saveCopy()},
    {label:'pj.close',fn:()=>closeProject()},
    '-',
    {label:'ui.export',key:kbLabel('export'),fn:()=>$('#bExport').click()},
    '-',
    {label:'menu.theme',fn:()=>$('#bTheme').click()},
    {label:'layout.menu',fn:()=>$('#bLayout').click()},
    {label:'detach.menu',fn:()=>$('#bLayout').click()},
    {label:mini?'rail.expand':'rail.collapse',fn:()=>setRailCompact(!mini)},
    {label:tlTop?'layout.tlToBottom':'layout.tlToTop',fn:()=>{tlTop=!tlTop;applyLayout(true)}},
    '-',
    {label:'pref.title',fn:()=>openPrefs()},
    {label:typeof simpleOn!=='undefined'&&simpleOn?'simple.menuOff':'simple.menuOn',fn:()=>simpleSet(!simpleOn)},
    {label:'kb.title',fn:openKeys},
    {label:'cmd.title',key:kbLabel('palette'),fn:()=>openPalette()},
    {label:'ai.menu',fn:()=>openAI()},
    {label:'upd.menu',fn:()=>openUpd()},
    {label:'bug.menu',fn:()=>window.dedcutBug&&dedcutBug.open()},
    {label:'menu.tour',fn:()=>window.dedcutTour&&dedcutTour.start('main')},
    {label:'menu.tips',fn:()=>{if(window.dedcutTour){dedcutTour.reset();toast('menu.tipsOn')}}},
    {label:'about.openLicences',fn:()=>appFetch('app://dedcut/__licences').catch(()=>{})},
    {label:'home.support',fn:()=>window.dispatchEvent(new Event('dedcut-support'))},
    ...(inApp?['-',{label:'menu.quit',fn:()=>appFetch('app://dedcut/__win?a=close').catch(()=>{})}]:[])
  ],r.left,r.bottom+4);
};
$('#bOpen').onclick=()=>openDialog();
$('#bNew').onclick=()=>window.dispatchEvent(new CustomEvent('dedcut-home',{detail:'new'}));
$('#pfile').onchange=e=>{if(e.target.files[0])legacyOpenProject(e.target.files[0]);e.target.value=''};
{const b=$('.brand');b.style.cursor='pointer';b.dataset.i18nTitle='header.home';b.title=T('header.home');b.onclick=()=>window.dispatchEvent(new CustomEvent('dedcut-home'))}
/* fonctions utilisées par l'écran d'accueil (React) */
window.dedcutAPI={
  newProject:(w,h)=>newProject(w,h),openDialog,openPath:p=>openProjectPath(p),importAndStart,
  recents:getRecents,removeRecent,deleteProject,
  session:()=>({name:projName,clips:clips.length,dur:total(),path:projPath,dirty:projDirty,W,H,thumb:clips.length?projThumb():null}),
  themes:()=>Object.entries(THEMES).map(([k,t])=>({id:k,c1:t[1],c2:t[2]})),
  theme:()=>{try{return localStorage.getItem('dedcut-theme')||'violet'}catch(e){return'violet'}},setTheme:k=>setTheme(k),
  version:()=>appVersion(),
  snapshots:listSnapshots,restoreSnapshot,crashed:()=>crashed&&clips.length>0,
  openLicences:()=>FS?FS.openLicences():appFetch('app://dedcut/__licences'),openFolder:()=>FS?FS.openFolder('rec'):null,
  openLink:u=>FS?FS.openLink(u):window.open(u,'_blank','noopener'),
  space:m=>{setMode(m);return true},studioState:()=>({live:!!O.live,rec:!!O.rec,phone:stPhone,mode:appMode})
};

/* ---------- ancien format .dedcut (v1/v2 : médias inclus dans le fichier) ---------- */
const enc=new TextEncoder();
function legacySaveProject(){
  if(!clips.length){toast(T('msg.nothingToSave'));return}
  const used=new Set(clips.map(c=>c.mid).filter(Boolean)),ms=media.filter(m=>used.has(m.id)&&m.blob);
  const head=enc.encode(JSON.stringify({v:2,W,H,uid,clips,markers,tracks,bg:bgColor,name:projName,mvol:masterVol,mlim:masterLim,media:ms.map(m=>({id:m.id,name:m.name,type:m.type,duration:m.duration,size:m.blob.size,mime:m.blob.type,thumb:m.thumb&&m.thumb.startsWith('data:')?m.thumb:null}))}));
  const blob=new Blob([enc.encode('DEDCUT1:'+String(head.length).padStart(12,'0')),head,...ms.map(m=>m.blob)]);
  download(blob,safeName(projName)+'.dedcut');projDirty=false;
}
/* ---------- scènes : plusieurs timelines dans un projet ---------- */
var scenes=null,curSc=0;
function scAll(){if(!scenes)scenes=[{id:1,name:'',clips,tracks,markers}];return scenes}
function scStore(){if(scenes){const s=scenes[curSc];if(s){s.clips=clips;s.tracks=tracks;s.markers=markers}}}
const scName=(s,i)=>s.name||T('scene.default',{n:i+1});
function scenesOut(){if(!scenes||scenes.length<2)return undefined;scStore();return{cur:curSc,list:scenes.map(s=>({id:s.id,name:s.name||'',clips:s.clips,tracks:s.tracks,markers:s.markers}))}}
function scenesIn(o){
  scenes=null;curSc=0;const L=o&&o.list;if(!Array.isArray(L)||L.length<2)return;
  const cur=clamp(o.cur|0,0,L.length-1);
  scenes=L.map((s,i)=>{const b={id:+s.id||i+1,name:String(s.name||'').slice(0,60)};
    if(i===cur)return Object.assign(b,{clips,tracks,markers});
    const tr=fixTracks(s.tracks),cl=(Array.isArray(s.clips)?s.clips:[]).filter(c=>c&&(!c.mid||mById(c.mid)));cl.forEach(c=>{if(!tr[c.track])c.track=0});
    return Object.assign(b,{clips:cl,tracks:tr,markers:Array.isArray(s.markers)?s.markers:[]})});
  curSc=cur;uid=Math.max(uid,...scenes.flatMap(s=>s.clips.map(c=>(c.id|0)+1)));
}
function scActivate(){for(const k of['video','over','audio']){const i=tracks.findIndex(t=>t.kind===k);if(i>=0)activeTk[k]=i}}
function switchScene(i){
  const L=scAll();if(i===curSc||!L[i])return;
  pause();scStore();const s=L[i];curSc=i;clips=s.clips;tracks=s.tracks;markers=s.markers;
  sel=null;msel.clear();time=0;scActivate();hist=[JSON.stringify({c:clips,t:tracks})];hi=0;
  renderScenes();refresh();renderInspector();autosave();
}
function newScene(){const L=scAll();scStore();L.push({id:Math.max(...L.map(s=>s.id))+1,name:'',clips:[],tracks:defTracks(),markers:[]});projDirty=true;switchScene(L.length-1)}
function dupScene(i){
  const L=scAll();scStore();const s=L[i];if(!s)return;
  const cl=JSON.parse(JSON.stringify(s.clips)).map(c=>Object.assign(c,{id:uid++}));
  L.splice(i+1,0,{id:Math.max(...L.map(x=>x.id))+1,name:T('scene.copy',{name:scName(s,i)}).slice(0,60),clips:cl,tracks:JSON.parse(JSON.stringify(s.tracks)),markers:[...s.markers]});
  if(curSc>i)curSc++;projDirty=true;switchScene(i+1);
}
async function delScene(i){
  const L=scAll();if(L.length<2||!L[i])return;scStore();
  if(L[i].clips.length&&!(await askYes(T('scene.delConfirm',{name:scName(L[i],i)}))))return;
  if(i===curSc)switchScene(i>0?i-1:1);
  L.splice(i,1);if(curSc>i)curSc--;projDirty=true;renderScenes();autosave();
}
function renameScene(i,n){const L=scAll();if(!L[i])return;L[i].name=String(n||'').trim().slice(0,60);projDirty=true;renderScenes();autosave()}
function renderScenes(){
  const b=$('#scbar');if(!b)return;
  b.innerHTML=scAll().map((s,i)=>`<button class="sctab${i===curSc?' on':''}" data-sc="${i}" title="${T('scene.tabTip')}">${esc(scName(s,i))}</button>`).join('')+`<button class="scadd" data-scadd="1" title="${T('scene.addTip')}">+</button>`;
}
$('#scbar').addEventListener('click',e=>{const t=e.target.closest('button');if(!t||t.tagName!=='BUTTON')return;if(t.dataset.scadd){newScene();return}if(t.dataset.sc!=null)switchScene(+t.dataset.sc)});
$('#scbar').addEventListener('dblclick',e=>{
  const t=e.target.closest('[data-sc]');if(!t)return;const i=+t.dataset.sc,L=scAll();
  const inp=document.createElement('input');inp.className='scin';inp.value=scName(L[i],i);inp.maxLength=60;t.replaceWith(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;if(ok)renameScene(i,inp.value);else renderScenes()};
  inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')fin(true);if(ev.key==='Escape')fin(false)});inp.addEventListener('blur',()=>fin(true));
});
$('#scbar').addEventListener('contextmenu',e=>{
  const t=e.target.closest('[data-sc]');if(!t)return;e.preventDefault();const i=+t.dataset.sc,L=scAll();
  showCtx([{label:'scene.rename',fn:()=>{t.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))}},{label:'scene.duplicate',fn:()=>dupScene(i)},{label:'scene.add',fn:newScene},'-',{label:'scene.delete',danger:true,off:L.length<2,fn:()=>delScene(i)}],e.clientX,e.clientY);
});
window.addEventListener('dedcut-lang',renderScenes);
function applyExtras(o){
  markers=Array.isArray(o.markers)?o.markers:[];
  tracks=fixTracks(o.tracks);clips.forEach(c=>{if(!trk(c))c.track=0});
  bgColor=o.bg||'#000000';setName(o.name||T('project.untitled'));
  masterVol=o.mvol??100;masterLim=o.mlim??true;if(master)master.gain.value=masterVol/100;if(limN)limiterSet(limN);
  scenesIn(o.scenes);scActivate();renderScenes();hist=[];hi=-1;
}
/* lit un ancien projet ; sous Windows, ses médias sont extraits dans Vidéos\DedCut\Médias puis reliés par chemin */
async function legacyOpenProject(file,skipConfirm){
  try{
    const pre=await file.slice(0,20).text();
    if(!pre.startsWith('DEDCUT1:'))throw new Error('format');
    const hl=parseInt(pre.slice(8),10),head=JSON.parse(await file.slice(20,20+hl).text());
    if(!skipConfirm&&!(await confirmReplace()))return false;
    resetProject();
    let off=20+hl;
    for(const mm of head.media){
      const blob=new File([file.slice(off,off+mm.size)],mm.name,{type:mm.mime});off+=mm.size;
      let m;
      if(FS){const f=await FS.saveMedia(blob,mm.name);m={id:mm.id,name:mm.name,type:mm.type,duration:mm.duration,path:f.path,size:f.size,url:FS.fileUrl(f.path),thumb:mm.thumb,ok:true}}
      else m={id:mm.id,name:mm.name,type:mm.type,duration:mm.duration,blob,url:URL.createObjectURL(blob),thumb:mm.thumb,ok:true};
      if(m.type==='image')m.thumb=m.url;
      media.push(m);persistMedia(m);queueWave(m);
    }
    setFormat(head.W,head.H,false);clips=head.clips;sel=null;time=0;
    applyExtras(head.v>=2?head:{name:file.name.replace(/\.dedcut$/i,'')});
    uid=Math.max(uid,head.uid||1,...media.map(m=>m.id+1),...clips.map(c=>c.id+1));
    projPath=null;commit();renderBin();refresh();
    toast(FS?T('project.legacyConverted',{folder:'Vidéos\\DedCut\\Médias'}):T('project.opened',{name:file.name}));
    return true;
  }catch(e){console.error(e);toast(T('project.invalid'));return false}
}

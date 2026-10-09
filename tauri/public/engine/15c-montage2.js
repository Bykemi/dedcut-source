/* ---------- Montage, lot B (suite) (cahier « DedCut Montage — Claude 2 ») ----------
   M001 enregistrer une copie / fermer · M008 + M012 préférences (taille de l'interface, réglages d'origine)
   M040 fluidité de l'aperçu · M135 carte graphique ou processeur pour l'export · M161 mode PC modeste
   M013 séquences d'images numérotées → vidéo · M032 + M107 décalage son / image visible, resynchroniser, décaler d'une image
   M039 coller une partie du style, réinitialiser */

/* ---------- M001 : enregistrer une copie (le projet ouvert ne change pas), fermer le projet ---------- */
async function saveCopy(){
  if(!FS){legacySaveProject();return}
  try{
    for(const m of media.filter(m=>!m.path&&m.blob)){const f=await FS.saveMedia(m.blob,m.name);m.path=f.path;m.size=f.size;persistMedia(m)}
    const p=await FS.chooseSave(safeName(T('pj.copyName',{name:projName}))+'.dedcut',T('project.filterName'));if(!p)return;
    if(projPath&&p.toLowerCase()===projPath.toLowerCase()){toast(T('pj.copySame'));return}
    await FS.writeProject(p,JSON.stringify(projDoc(dirOf(p))));await addRecent(p);
    toast(T('pj.copied',{name:baseName(p)}));
  }catch(e){console.error(e);toast(T('project.saveError'))}
}
async function closeProject(){
  if(!(await confirmReplace()))return;
  projDirty=false;await newProject(W,H);
  window.dispatchEvent(new CustomEvent('dedcut-home'));
}

/* ---------- préférences (gardées sur ce PC) ---------- */
const PREF_KEYS=['dedcut-keys','dedcut-tlh','dedcut-guides','dedcut-layout','dedcut-pw','dedcut-rail-mini','dedcut-rail-order','dedcut-tltop','dedcut-detach','dedcut-detach-pos','dedcut-theme','dedcut-uizoom','dedcut-pvfps','dedcut-lowpc','dedcut-enc'];
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(e){}};
var lowPC=false,encPref='auto'; // lus aussi par 09-export.js et 10-tools.js
let uiZoom=1,pvPref='auto';
const UI_ZOOMS=[.8,.9,1,1.1,1.25,1.5];
function prefsLoad(){
  uiZoom=UI_ZOOMS.find(z=>Math.abs(z-+lsGet('dedcut-uizoom',1))<1e-3)||1;
  pvPref=['auto','full','30','15'].includes(lsGet('dedcut-pvfps','auto'))?lsGet('dedcut-pvfps','auto'):'auto';
  lowPC=lsGet('dedcut-lowpc','0')==='1';
  encPref=['auto','gpu','cpu'].includes(lsGet('dedcut-enc','auto'))?lsGet('dedcut-enc','auto'):'auto';
  pvCap=pvPref==='30'?30:pvPref==='15'?15:pvPref==='full'?0:lowPC?15:0;
}
prefsLoad();
if(window.dedcutZoom&&uiZoom!==1)dedcutZoom(uiZoom).catch(()=>{});
function openPrefs(){
  $('#prefdlg')?.remove();
  const o=document.createElement('div');o.className='kbov';o.id='prefdlg';
  const opt=(v,cur,lbl)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${lbl}</option>`;
  o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="prefh"><div class="kbhead"><h3 id="prefh">${T('pref.title')}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
  <div class="fld"><label for="pfZoom">${T('pref.zoom')}</label><select id="pfZoom" ${window.dedcutZoom?'':'disabled'}>${UI_ZOOMS.map(z=>opt(z,uiZoom,window.i18n.fmt.percent(z))).join('')}</select>${window.dedcutZoom?'':`<div class="hint">${T('msg.onlyInApp')}</div>`}</div>
  <div class="fld"><label for="pfPv">${T('pref.preview')}</label><select id="pfPv">${opt('auto',pvPref,T('pref.pv_auto'))}${opt('full',pvPref,T('pref.pv_full'))}${opt('30',pvPref,T('pref.pv_30'))}${opt('15',pvPref,T('pref.pv_15'))}</select><div class="hint">${T('pref.previewHint')}</div></div>
  <label class="chk"><span>${T('pref.lowPC')}</span><input id="pfLow" type="checkbox" ${lowPC?'checked':''}></label><div class="hint">${T('pref.lowPCHint')}</div>
  <div class="fld"><label for="pfEnc">${T('pref.enc')}</label><select id="pfEnc">${opt('auto',encPref,T('pref.enc_auto'))}${opt('gpu',encPref,T('pref.enc_gpu'))}${opt('cpu',encPref,T('pref.enc_cpu'))}</select><div class="hint">${T('pref.encHint')}</div></div>
  <div class="kbfoot mtfoot"><button class="danger" data-reset>${T('pref.reset')}</button><button class="pri" data-x>${T('kb.close')}</button></div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  o.addEventListener('pointerdown',e=>{if(e.target===o)close()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});
  o.addEventListener('change',e=>{
    const id=e.target.id;
    if(id==='pfZoom'){lsSet('dedcut-uizoom',e.target.value);prefsLoad();if(window.dedcutZoom)dedcutZoom(uiZoom).catch(()=>{})}
    if(id==='pfPv')lsSet('dedcut-pvfps',e.target.value);
    if(id==='pfLow')lsSet('dedcut-lowpc',e.target.checked?'1':'0');
    if(id==='pfEnc')lsSet('dedcut-enc',e.target.value);
    prefsLoad();wake();
  });
  o.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.x!=null)close();
    if(b.dataset.reset!=null&&(await askYes(T('pref.resetConfirm')))){
      for(const k of PREF_KEYS)try{localStorage.removeItem(k)}catch(x){}
      if(window.dedcutZoom)dedcutZoom(1).catch(()=>{});
      autosave();setTimeout(()=>location.reload(),900); // le montage en cours est gardé par la sauvegarde automatique
    }
  });
  $('#pfPv').focus();
}

/* ---------- M013 : séquence d'images numérotées (image_0001.png…) → une vidéo à la fréquence du projet ---------- */
function seqSplit(list,nameOf){
  const groups=new Map();
  list.forEach((f,i)=>{const n=nameOf(f)||'',m=/^(.*?)(\d+)\.(png|jpe?g|webp|bmp)$/i.exec(n);if(!m)return;const k=m[1].toLowerCase()+'|'+m[3].toLowerCase();if(!groups.has(k))groups.set(k,[]);groups.get(k).push({f,i,n:+m[2],pre:m[1],name:n})});
  for(const g of groups.values()){
    if(g.length<5)continue;g.sort((a,b)=>a.n-b.n);
    if(!g.every((x,j)=>!j||x.n===g[j-1].n+1))continue; // numéros qui se suivent, sans trou
    const ids=new Set(g.map(x=>x.i));return{seq:g,rest:list.filter((_,i)=>!ids.has(i))};
  }
  return{seq:null,rest:list};
}
const seqAsk=g=>askYes(T('seq.ask',{count:g.length,first:g[0].name,last:g[g.length-1].name,fps:projFps}));
/* la question est async (askYes) : sans séquence, la liste des médias est rendue tout de suite comme avant ; avec une séquence
   (au moins 5 images), c'est une Promise de cette liste : les appelants qui importent plusieurs fichiers font await */
{const af=addFiles;addFiles=function(list){const L=[...list],r=seqSplit(L,f=>f.name);if(!r.seq)return af(L);
  return seqAsk(r.seq).then(yes=>{if(!yes)return af(L);seqImport(r.seq.map(x=>x.f),r.seq[0].pre,false);return af(r.rest)})}}
{const ap=addPaths;addPaths=function(list){const L=[...list],r=seqSplit(L,f=>f.name||baseName(f.path));if(!r.seq)return ap(L);
  return seqAsk(r.seq).then(yes=>{if(!yes)return ap(L);seqImport(r.seq.map(x=>x.f),r.seq[0].pre,true);return ap(r.rest)})}}
async function seqImport(items,pre,byPath){
  if(!window.VideoEncoder||!window.Mp4Muxer){toast(T('export.noH264'));return}
  const load=async it=>createImageBitmap(byPath?await(await fetch(FS.fileUrl(it.path))).blob():it);
  const o=document.createElement('div');o.className='kbov';o.id='seqdlg';
  o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="seqh"><div class="kbhead"><h3 id="seqh">${T('seq.title')}</h3></div><p class="hint" id="seqp" role="status">${T('seq.progress',{pct:window.i18n.fmt.percent(0)})}</p><div class="seqbar"><i id="seqi"></i></div><div class="kbfoot"><button data-c>${T('common.cancel')}</button></div></div>`;
  document.body.appendChild(o);
  let cancel=false,venc=null;o.querySelector('[data-c]').onclick=()=>{cancel=true};
  try{
    const first=await load(items[0]),k=Math.min(1,3840/Math.max(first.width,first.height),2160/Math.min(first.width,first.height));
    const w=Math.max(2,Math.round(first.width*k/2)*2),h=Math.max(2,Math.round(first.height*k/2)*2),fps=projFps;
    // H.264 d'abord ; VP9 (dans le même MP4) si l'appareil n'a pas d'encodeur H.264
    let vcfg=null,mc='avc';
    for(const[codec,m2]of[['avc1.640034','avc'],['avc1.640033','avc'],['avc1.640028','avc'],['avc1.4d0028','avc'],['avc1.42002a','avc'],['vp09.00.40.08','vp9'],['vp09.00.10.08','vp9']]){const c={codec,width:w,height:h,bitrate:clamp(Math.round(9e6*w*h/(1920*1080)),2e6,40e6),framerate:fps};if(m2==='avc')c.avc={format:'avc'};if((await VideoEncoder.isConfigSupported(c).catch(()=>({}))).supported){vcfg=c;mc=m2;break}}
    if(!vcfg)throw new Error(T('export.noH264'));
    const mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:mc,width:w,height:h,frameRate:Math.round(fps)},fastStart:'in-memory'});
    let err=null;venc=new VideoEncoder({output:(ch,meta)=>mux.addVideoChunk(ch,meta),error:e=>err=e});venc.configure(vcfg);
    const cv2=document.createElement('canvas');cv2.width=w;cv2.height=h;const cx=cv2.getContext('2d');
    for(let i=0;i<items.length;i++){
      if(cancel)throw new Error('cancel');
      const img=i?await load(items[i]):first;
      cx.fillStyle='#000';cx.fillRect(0,0,w,h);cx.drawImage(img,0,0,w,h);img.close();
      const vf=new VideoFrame(cv2,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});venc.encode(vf,{keyFrame:i%Math.max(1,Math.round(fps))===0});vf.close();
      if(err)throw err;
      if(venc.encodeQueueSize>6)await new Promise(q=>{venc.addEventListener('dequeue',q,{once:true});setTimeout(q,250)});
      if(i%5===0){$('#seqi').style.width=(i/items.length*100)+'%';$('#seqp').textContent=T('seq.progress',{pct:window.i18n.fmt.percent(i/items.length)});await yieldUI()}
    }
    await venc.flush();venc.close();venc=null;if(err)throw err;
    mux.finalize();
    const name=(String(pre).replace(/[\s._-]+$/,'')||T('seq.name'))+'.mp4';
    await addGenerated(new File([mux.target.buffer],name,{type:'video/mp4'}));
    toast(T('seq.done',{count:items.length}));
  }catch(e){if(cancel)toast(T('seq.cancelled'));else{console.error(e);toast(T('seq.failed'))}}
  finally{try{venc&&venc.close()}catch(x){}o.remove()}
}

/* ---------- M032 + M107 : son et image d'un même média groupés (« Séparer le son ») : décalage visible, resynchroniser ---------- */
function syncPartner(c){if(!c||!c.grp||!c.mid)return null;return clips.find(x=>x!==c&&x.grp===c.grp&&x.mid===c.mid&&isAud(x)!==isAud(c))||null}
/* décalage en secondes (positif = le son arrive en retard) ; null si les vitesses diffèrent */
function syncOff(c){
  const o=syncPartner(c);if(!o)return null;const a=isAud(c)?c:o,v=isAud(c)?o:c,ra=a.p.rate||1,rv=v.p.rate||1;
  if(Math.abs(ra-rv)>1e-6||!!a.p.rev!==!!v.p.rev||a.p.rev)return null;
  return(a.start-a.in/ra)-(v.start-v.in/rv);
}
function syncBadge(c){
  const d=syncOff(c);if(d==null||Math.abs(d)*projFps<.5)return'';
  const f=Math.round(d*projFps),s=(f>0?'+':'')+f;
  return`<i class="syncb" title="${esc(T('sync.tip',{n:s}))}">${s}</i>`;
}
function syncFix(c){
  const d=syncOff(c),o=syncPartner(c);if(d==null||!o)return;const a=isAud(c)?c:o;
  if(trk(a).lock){toast(T('msg.trackLocked'));return}
  a.start=Math.max(0,a.start-d);commit();refresh();toast(T('sync.fixed'));
}
function syncCtx(c){const d=syncOff(c);return d!=null&&Math.abs(d)*projFps>=.5?[{label:T('sync.fix',{n:(d>0?'+':'')+Math.round(d*projFps)}),fn:()=>syncFix(c)}]:[]}
/* décaler la sélection d'une image (Alt+← / Alt+→) ou de 10 images (avec Maj) */
function nudgeSel(n){
  const g=selClips().filter(c=>!trk(c).lock);if(!g.length){toast(T('msg.selectClip'));return}
  const d=Math.max(n/projFps,-Math.min(...g.map(c=>c.start)));if(!d)return;
  g.forEach(c=>{c.start=Math.max(0,c.start+d)});commit();refresh();
}

/* ---------- M039 : coller une partie du style, remettre à zéro ---------- */
const SCAT={
  pos:['x','y','scale','size','rot','w','h','tf','crop','flip','fit','round','angle'],
  look:['col','blend','op','chroma','mask','bw','bc','shd'],
  fx:['fx','amt','glitch','neon'],
  text:['font','color','color2','stroke','sw','sc','shadow','box','bg','bgc','bgo','bgs','italic','bold','caps','hollow','ls','cs','st2','st2On','hardOn','hard','gradOn','grad','glowc','kcol','ext','extOn','fill'],
  anim:['anim','aout','aloop','tspeed'],
  trans:['tin','tout','tdur'],
  sound:['vol','au','voice','afin','afout','afade']
};
const scatOf=k=>Object.keys(SCAT).find(c=>SCAT[c].includes(k))||'other';
function styleCtx(c){return[{label:T('stylex.pasteSome'),off:!styleClip,fn:()=>styleDialog('paste')},{label:T('stylex.reset'),fn:()=>styleDialog('reset')}]}
function styleTargets(){return selClips().filter(x=>!trk(x).lock)}
function styleDialog(mode){
  const tg=mode==='paste'?styleTargets().filter(x=>kindOf(x)===styleClip.kind&&(x.gen||'')===styleClip.gen):styleTargets();
  if(!tg.length){toast(T(mode==='paste'?'style.none':'msg.selectClip'));return}
  const cats=mode==='paste'?[...new Set(Object.keys(styleClip.p).map(scatOf))]:['pos','look','fx','sound','anim','trans'];
  const o=document.createElement('div');o.className='kbov';
  o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="sth"><div class="kbhead"><h3 id="sth">${T(mode==='paste'?'stylex.pasteSome':'stylex.reset')}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
  <p class="hint">${T('stylex.count',{count:tg.length})}</p>${cats.map(k=>`<label class="chk"><span>${T('stylex.cat_'+k)}</span><input type="checkbox" data-cat="${k}" ${mode==='paste'?'checked':''}></label>`).join('')}
  <div class="kbfoot mtfoot"><button class="pri" data-ok>${T(mode==='paste'?'style.paste':'stylex.resetBtn')}</button></div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  o.addEventListener('pointerdown',e=>{if(e.target===o)close()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});
  o.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;if(b.dataset.x!=null){close();return}
    if(b.dataset.ok==null)return;
    const on=new Set([...o.querySelectorAll('[data-cat]:checked')].map(x=>x.dataset.cat));if(!on.size){close();return}
    if(mode==='paste')for(const x of tg)for(const[k,v]of Object.entries(styleClip.p))if(on.has(scatOf(k)))x.p[k]=JSON.parse(JSON.stringify(v));
    if(mode==='reset')for(const x of tg)styleReset(x,on);
    close();commit();refresh();toast(T(mode==='paste'?'style.pasted':'stylex.resetDone',{count:tg.length}));
  });
  o.querySelector('[data-ok]').focus();
}
function styleReset(c,on){
  const p=c.p,dropKf=keys=>{if(!c.kf)return;for(const f of c.kf)for(const k of Object.keys(f.v))if(keys.some(x=>k===x||k.startsWith(x+'.')))delete f.v[k];c.kf=c.kf.filter(f=>Object.keys(f.v).length);if(!c.kf.length)delete c.kf};
  if(on.has('pos')){if(isVid(c)){delete p.tf}else if(!isAud(c)){p.x=50;p.y=50;p.rot=0;delete p.flip}delete p.crop;delete p.round;dropKf(['p.tf','p.x','p.y','p.rot','p.crop'])}
  if(on.has('look')){delete p.col;delete p.blend;delete p.chroma;delete p.mask;if(!isAud(c))p.op=100;dropKf(['p.op'])}
  if(on.has('fx')){if(isVid(c))p.fx=noFx();else delete p.fx}
  if(on.has('sound')&&c.mid){p.vol=100;delete p.au;delete p.voice;delete p.afin;delete p.afout;delete p.afade;dropKf(['p.vol'])}
  if(on.has('anim')){delete p.anim;delete p.aout;delete p.aloop;delete c.kf}
  if(on.has('trans')&&isVid(c)){p.tin='none';p.tout='none'}
}

/* raccourcis et commandes de ce lot */
KEYACTS.push(
  {id:'nudgeL',n:'nudge.left',d:['alt+arrowleft'],f:()=>nudgeSel(-1)},
  {id:'nudgeR',n:'nudge.right',d:['alt+arrowright'],f:()=>nudgeSel(1)},
  {id:'nudgeL10',n:'nudge.left10',d:['alt+shift+arrowleft'],f:()=>nudgeSel(-10)},
  {id:'nudgeR10',n:'nudge.right10',d:['alt+shift+arrowright'],f:()=>nudgeSel(10)},
  {id:'saveCopy',n:'pj.saveCopy',d:[],f:()=>saveCopy()},
  {id:'closeProj',n:'pj.close',d:[],f:()=>closeProject()},
  {id:'prefs',n:'pref.title',d:['ctrl+,'],f:()=>openPrefs()}
);
CMDS.push({id:'stylePart',n:'stylex.pasteSome',f:()=>{if(styleClip)styleDialog('paste');else toast(T('style.none'))}},{id:'styleReset',n:'stylex.reset',f:()=>styleDialog('reset')});

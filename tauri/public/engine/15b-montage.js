/* ---------- Montage, lot B (cahier « DedCut Montage — Claude 2 ») ----------
   M005 fréquence d'images du projet · M007 palette de commandes · M015 chutier (recherche, tri, favoris, couleurs, notes, étiquettes)
   M016 informations d'un média · M026 solo des pistes · M028 insertion / écrasement · M031 aimant inversé avec Alt · M038 marqueurs nommés.
   Les données propres au montage voyagent dans le champ « mx » du projet (sauvegarde auto, versions de secours, fichier .dedcut). */
ICO.solo='<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5"/>';
ICO.search='<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>';
ICO.info='<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>';
const FPS_LIST=[23.976,24,25,29.97,30,50,59.94,60];
const MK_COLORS=['','#ef4444','#f97316','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];
var mkMeta=[];   // [{t,n,c,note}] : nom, couleur et note de chaque marqueur (retrouvé par son temps)
var binMeta={};  // {idMédia:{fav,c,note,tags:[]}}
let binQ='',binSort='add',binFav=false;

function mxOut(){
  const ms=new Set(markers.map(t=>Math.round(t*1000)));
  for(const s of(scenes||[]))for(const t of(s.markers||[]))ms.add(Math.round(t*1000));
  const ids=new Set(media.map(m=>m.id));
  const bm={};for(const[k,v]of Object.entries(binMeta))if(ids.has(+k)&&(v.fav||v.c||v.note||(v.tags&&v.tags.length)))bm[k]=v;
  return{fps:projFps,mkm:mkMeta.filter(x=>ms.has(Math.round(x.t*1000))&&(x.n||x.c||x.note)),bin:bm};
}
function mxIn(o){
  o=o&&typeof o==='object'?o:{};
  projFps=FPS_LIST.find(v=>Math.abs(v-(+o.fps||0))<1e-3)||30;
  mkMeta=Array.isArray(o.mkm)?o.mkm.filter(x=>x&&isFinite(x.t)).map(x=>({t:+x.t,n:String(x.n||'').slice(0,60),c:MK_COLORS.includes(x.c)?x.c:'',note:String(x.note||'').slice(0,500)})):[];
  binMeta={};
  if(o.bin&&typeof o.bin==='object')for(const[k,v]of Object.entries(o.bin))if(v&&typeof v==='object')binMeta[k]={fav:!!v.fav,c:MK_COLORS.includes(v.c)?v.c:'',note:String(v.note||'').slice(0,1000),tags:Array.isArray(v.tags)?v.tags.map(x=>String(x).slice(0,30)).filter(Boolean).slice(0,20):[]};
}
{const ax=applyExtras;applyExtras=function(o){ax(o);mxIn(o&&o.mx)}}

/* ---------- M005 : fréquence d'images du projet ---------- */
$('#insp').addEventListener('change',e=>{
  if(e.target.dataset.proj!=='fps')return;
  const v=FPS_LIST.find(x=>Math.abs(x-+e.target.value)<1e-3);if(!v)return;
  projFps=v;projDirty=true;autosave();seek(frT(time));renderTL();toast(T('mt.fpsSet',{fps:v}));
});

/* ---------- M038 : marqueurs avec nom, couleur et note ---------- */
function mkInfo(t){return mkMeta.find(x=>Math.abs(x.t-t)<.0005)||null}
function mkName(sec){const t=markers.find(x=>Math.floor(x)===sec);const i=t!=null&&mkInfo(t);return i&&i.n||''}
function mkSet(t,o){
  let i=mkInfo(t);if(!i){i={t,n:'',c:'',note:''};mkMeta.push(i)}
  Object.assign(i,o);projDirty=true;autosave();renderTL();
}
function mkOpen(idx){
  const t=markers[idx];if(t==null)return;
  const i=mkInfo(t)||{n:'',c:'',note:''};
  const o=document.createElement('div');o.className='kbov';o.id='mkdlg';
  o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="mkh"><div class="kbhead"><h3 id="mkh">${T('mk.title',{time:fmtTC(t)})}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
  <div class="fld"><label for="mkn">${T('mk.name')}</label><input id="mkn" type="text" maxlength="60" value="${esc(i.n)}"></div>
  <div class="fld"><label>${T('mk.color')}</label><div class="ctxsw mtsw" role="radiogroup">${MK_COLORS.map(c=>`<button role="radio" aria-checked="${c===i.c}" aria-label="${c||T('mk.noColor')}" data-c="${c}" class="${c?'':'none'}${c===i.c?' on':''}" style="${c?'background:'+c:''}"></button>`).join('')}</div></div>
  <div class="fld"><label for="mknote">${T('mk.note')}</label><textarea id="mknote" rows="3" maxlength="500">${esc(i.note)}</textarea></div>
  <div class="kbfoot mtfoot"><button class="danger" data-del>${T('mk.delete')}</button><button class="pri" data-ok>${T('mk.save')}</button></div></div>`;
  document.body.appendChild(o);
  let col=i.c;
  const close=()=>{o.remove()};
  const save=()=>{mkSet(t,{n:$('#mkn').value.trim().slice(0,60),c:col,note:$('#mknote').value.trim().slice(0,500)});close()};
  o.addEventListener('pointerdown',e=>{if(e.target===o)close()});
  o.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.c!=null){col=b.dataset.c;o.querySelectorAll('[data-c]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});return}
    if(b.dataset.x!=null)close();
    if(b.dataset.ok!=null)save();
    if(b.dataset.del!=null){markers.splice(markers.indexOf(t),1);mkMeta=mkMeta.filter(x=>x!==mkInfo(t));autosave();renderTL();close()}
  });
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close();if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA')save()});
  $('#mkn').focus();
}
for(const ev of['contextmenu','dblclick'])$('#tli').addEventListener(ev,e=>{
  const mk=e.target.closest('.mk');if(!mk)return;e.preventDefault();e.stopPropagation();mkOpen(+mk.dataset.mk);
},true);
/* un clic sur un marqueur place la tête de lecture dessus */
$('#tli').addEventListener('pointerdown',e=>{const mk=e.target.closest('.mk');if(!mk||e.button!==0)return;e.stopPropagation();const t=markers[+mk.dataset.mk];if(t!=null)seek(t)},true);
function mkJump(dir){const t=dir>0?markers.find(x=>x>time+.001):[...markers].reverse().find(x=>x<time-.001);if(t==null){toast(T('mk.noMore'));return}pause();seek(t)}
function mkEditHere(){let i=markers.findIndex(m=>Math.abs(m-time)*pxs<6);if(i<0){markers.push(time);markers.sort((a,b)=>a-b);i=markers.indexOf(time);autosave();renderTL()}mkOpen(i)}

/* ---------- M026 : solo (rien à faire ici : bouton dans l'en-tête de piste, volume coupé dans volAt) ---------- */
function soloClear(){tracks.forEach(t=>{delete t.solo});autosave();renderTL()}

/* ---------- M028 : insérer (la suite est décalée) ou écraser (ce qui est dessous est remplacé) ---------- */
function dropLen(m,over,tr){if(!isFinite(m.duration)||m.duration<=0)m.duration=5;return m.type==='image'?(over?4:5):m.duration}
function makeRoom(tr,t,d,mode){
  const eps=.001;
  if(mode==='insert'){
    const x=clips.find(c=>c.track===tr&&c.start<t-eps&&c.start+c.dur>t+eps);if(x)splitAt(x,t);
    for(const c of clips)if(!trk(c).lock&&c.start>=t-eps)c.start+=d; // toutes les pistes : la suite reste synchronisée
    markers=markers.map(m=>m>=t-eps?m+d:m);mkMeta.forEach(x=>{if(x.t>=t-eps)x.t+=d});
    return;
  }
  const e=t+d;
  for(const x of clips.filter(c=>c.track===tr&&c.start<e-eps&&c.start+c.dur>t+eps)){
    let a=x;if(a.start<t-eps)a=splitAt(a,t);
    if(a.start+a.dur>e+eps)splitAt(a,e);
    clips=clips.filter(c=>c!==a);
  }
}
function editDrop(id,over,at,tr,mode){
  const m=mById(id);if(!m)return;
  const want=m.type==='audio'?'audio':over?'over':'video';
  const ti=tr!=null&&tracks[tr]&&tracks[tr].kind===want?tr:tk(want);
  if(tracks[ti].lock){toast(T('msg.trackLocked'));return}
  const t=frT(at);
  makeRoom(ti,t,dropLen(m,over,ti),mode);
  addFromMedia(id,over,t,ti); // un seul enregistrement dans l'historique : une seule annulation défait les deux
  toast(T(mode==='insert'?'ins.inserted':'ins.overwritten'));
}

/* ---------- M015 : chutier (recherche, tri, favoris, couleur, note, étiquettes) ---------- */
const binOf=m=>binMeta[m.id]||{};
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function binView(l){
  const q=fold(binQ).split(/\s+/).filter(Boolean);
  let r=l.filter(m=>{const b=binOf(m);if(binFav&&!b.fav)return false;if(!q.length)return true;const hay=fold([m.name,b.note,...(b.tags||[]),m.type].join(' '));return q.every(w=>hay.includes(w))});
  const by={name:(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}),dur:(a,b)=>(b.type==='image'?0:b.duration||0)-(a.type==='image'?0:a.duration||0),type:(a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name),color:(a,b)=>MK_COLORS.indexOf(binOf(a).c||'')-MK_COLORS.indexOf(binOf(b).c||'')}[binSort];
  if(by)r=r.slice().sort(by);
  return r;
}
function binBadge(m){const b=binOf(m);return(b.c?`<i class="bincol" style="background:${b.c}"></i>`:'')+(b.fav?`<i class="binfav" aria-label="${T('bin.fav')}">${ico('star',11)}</i>`:'')+(b.note||(b.tags&&b.tags.length)?`<i class="binnote" title="${esc([b.note,(b.tags||[]).map(x=>'#'+x).join(' ')].filter(Boolean).join('\n'))}">${ico('pen',11)}</i>`:'')}
function binSet(m,o){const b=binMeta[m.id]=Object.assign({fav:false,c:'',note:'',tags:[]},binMeta[m.id],o);if(!b.fav&&!b.c&&!b.note&&!b.tags.length)delete binMeta[m.id];projDirty=true;autosave();renderBin()}
function binCtx(m){const b=binOf(m);return['-',
  {label:b.fav?'bin.unfav':'bin.fav',fn:()=>binSet(m,{fav:!b.fav})},
  {label:'bin.color',swatches:MK_COLORS,fn:c=>binSet(m,{c:c||''})},
  {label:'bin.notes',fn:()=>binNotes(m)},
  {label:'minfo.menu',fn:()=>mediaInfo(m)}]}
function binNotes(m){
  const b=binOf(m),o=document.createElement('div');o.className='kbov';
  o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="bnh"><div class="kbhead"><h3 id="bnh">${esc(m.name)}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
  <div class="fld"><label for="bntags">${T('bin.tags')}</label><input id="bntags" type="text" value="${esc((b.tags||[]).join(', '))}" placeholder="${T('bin.tagsPh')}"></div>
  <div class="fld"><label for="bnnote">${T('bin.note')}</label><textarea id="bnnote" rows="4" maxlength="1000">${esc(b.note||'')}</textarea></div>
  <div class="kbfoot mtfoot"><button class="pri" data-ok>${T('mk.save')}</button></div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove(),save=()=>{binSet(m,{note:$('#bnnote').value.trim().slice(0,1000),tags:[...new Set($('#bntags').value.split(/[,;#]/).map(x=>x.trim().slice(0,30)).filter(Boolean))].slice(0,20)});close()};
  o.addEventListener('pointerdown',e=>{if(e.target===o)close()});
  o.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.x!=null)close();if(x.dataset.ok!=null)save()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close();if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA')save()});
  $('#bntags').focus();
}
function binTools(){
  let b=$('#mtools');
  if(!b){b=document.createElement('div');b.id='mtools';$('#mfilt').after(b);
    b.addEventListener('input',e=>{if(e.target.id==='mq'){binQ=e.target.value;renderBin()}});
    b.addEventListener('change',e=>{if(e.target.id==='msort'){binSort=e.target.value;renderBin()}});
    b.addEventListener('click',e=>{if(e.target.closest('#mfav')){binFav=!binFav;binTools();renderBin()}});
    b.addEventListener('keydown',e=>{if(e.target.id==='mq'&&e.key==='Escape'){binQ='';e.target.value='';renderBin()}});
  }
  const q=$('#mq')&&document.activeElement===$('#mq');
  b.innerHTML=`<label class="mq">${ico('search',13)}<input id="mq" type="search" value="${esc(binQ)}" placeholder="${T('bin.search')}" aria-label="${T('bin.search')}"></label>
  <select id="msort" aria-label="${T('bin.sort')}" title="${T('bin.sort')}">${['add','name','dur','type','color'].map(k=>`<option value="${k}" ${k===binSort?'selected':''}>${T('bin.sort_'+k)}</option>`).join('')}</select>
  <button id="mfav" class="${binFav?'on':''}" aria-pressed="${binFav}" title="${T('bin.onlyFav')}">${ico('star',13)}</button>`;
  if(q){const i=$('#mq');i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}
binTools();window.addEventListener('dedcut-lang',()=>{binTools();renderBin()});

/* ---------- M016 : informations d'un média (lecture locale du fichier, rien n'est envoyé) ---------- */
async function probeMedia(m){
  const r={};
  try{
    if(m.missing||!m.url&&!m.blob)return r;
    const sz=mediaSize(m);
    if(m.type==='video'&&sz&&sz<5e8){ // le fichier entier est lu en mémoire : on se limite à 500 Mo
      const buf=await mediaBuf(m),u8=new Uint8Array(buf,0,4);
      if(u8[0]===0x1A&&u8[1]===0x45&&u8[2]===0xDF&&u8[3]===0xA3){r.container='WebM / Matroska';return r}
      const info=await new Promise(res=>{const f=MP4Box.createFile();f.onError=()=>res(null);f.onReady=res;buf.fileStart=0;f.appendBuffer(buf);f.flush();setTimeout(()=>res(null),4000)});
      if(info){
        r.container=(info.brands||[]).includes('qt  ')?'QuickTime (MOV)':'MP4';
        const v=info.videoTracks&&info.videoTracks[0],a=info.audioTracks&&info.audioTracks[0];
        if(v){r.vcodec=v.codec;const s=v.movie_duration/v.movie_timescale||v.duration/v.timescale;if(v.nb_samples&&s)r.fps=Math.round(v.nb_samples/s*1000)/1000;if(v.bitrate)r.vbr=v.bitrate}
        if(a){r.acodec=a.codec;r.ch=a.audio&&a.audio.channel_count;r.sr=a.audio&&a.audio.sample_rate}
      }
    }else if(m.type==='audio'&&sz<3e8){
      const b=await decodeAudio(m);if(b){r.ch=b.numberOfChannels;r.sr=b.sampleRate}
    }
  }catch(e){console.warn('infos',m.name,e)}
  return r;
}
async function mediaInfo(m){
  const o=document.createElement('div');o.className='kbov';o.id='minfo';
  const row=(k,v)=>v==null||v===''?'':`<div class="kbrow"><span>${T(k)}</span><b>${esc(v)}</b></div>`;
  const draw=p=>{o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="mih"><div class="kbhead"><h3 id="mih">${esc(m.name)}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
  <div class="kblist">${row('minfo.type',T(m.type==='video'?'lib.videos':m.type==='image'?'lib.images':'lib.sounds'))}${m.type==='image'?'':row('common.duration',fmtTC(m.duration||0))}
  ${m.w?row('minfo.res',m.w+' × '+m.h):''}${p?row('minfo.container',p.container)+row('minfo.fps',p.fps)+row('minfo.vcodec',p.vcodec)+row('minfo.acodec',p.acodec)+row('minfo.ch',p.ch)+row('minfo.sr',p.sr?p.sr+' Hz':''):`<div class="kbrow"><span>${T('minfo.reading')}</span></div>`}
  ${row('minfo.size',mediaSize(m)?window.i18n.fmt.bytes(mediaSize(m)):'')}${row('minfo.path',m.path||'')}${row('minfo.proxy',m.proxyUrl?T('minfo.yes'):'')}${m.missing?row('minfo.status',T('media.notFound')):''}
  ${p&&p.fps&&Math.abs(p.fps-projFps)>.01&&m.type==='video'?`<p class="hint" style="margin:8px 0 0">${T('minfo.fpsDiff',{fps:p.fps,proj:projFps})}</p>`:''}</div></div>`};
  draw(null);document.body.appendChild(o);
  o.addEventListener('pointerdown',e=>{if(e.target===o)o.remove()});
  o.addEventListener('click',e=>{if(e.target.closest('[data-x]'))o.remove()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')o.remove()});
  o.tabIndex=-1;o.focus();
  const p=await probeMedia(m);if(o.isConnected)draw(p);
}

/* ---------- M007 : palette de commandes (Ctrl+K) ---------- */
const CMDS=[
  {id:'trkV',n:'tl.addVideoTrack',f:()=>addTrack('video')},
  {id:'trkO',n:'tl.addOverTrack',f:()=>addTrack('over')},
  {id:'trkA',n:'tl.addAudioTrack',f:()=>addTrack('audio')},
  {id:'gaps',n:'cmd.closeGaps',f:()=>closeGaps(null)},
  {id:'snap',n:'cmd.snap',f:()=>$('#tbar [data-tb="snap"]')?.click()},
  {id:'fit',n:'cmd.fit',f:()=>$('#tbar [data-tb="fit"]')?.click()},
  {id:'solo0',n:'solo.clear',f:soloClear},
  {id:'chap',n:'chap.copy',f:()=>copyChapters()},
  {id:'mkcut',n:'mkcut.menu',f:()=>{if(selClip())cutAtMarkers();else toast(T('msg.selectClip'))}},
  {id:'freeze',n:'cmd.freeze',f:()=>freeze()},
  {id:'proj',n:'cmd.project',f:()=>{sel=null;msel.clear();refresh()}},
  {id:'keys',n:'kb.customize',f:()=>openKeys()}
];
let cmdSel=0,cmdList=[];
function cmdItems(q){
  const w=fold(q).split(/\s+/).filter(Boolean),out=[];
  const push=(n,k,f,extra)=>{const hay=fold(n+' '+(extra||''));if(w.every(x=>hay.includes(x)))out.push({n,k,f})};
  for(const a of KEYACTS)if(a.id!=='palette')push(T(a.n),keysOf(a).length?fmtCombo(keysOf(a)[0]):'',a.f,a.id);
  for(const c of CMDS)push(T(c.n),'',c.f,c.id);
  markers.forEach(t=>{const i=mkInfo(t);push(T('cmd.goMarker',{name:i&&i.n||fmtTC(t)}),fmtTC(t),()=>{pause();seek(t)},'marker')});
  return out.slice(0,60);
}
function cmdDraw(){
  const ul=$('#cmdl');if(!ul)return;
  ul.innerHTML=cmdList.length?cmdList.map((c,i)=>`<li role="option" id="cmd${i}" data-i="${i}" aria-selected="${i===cmdSel}" class="${i===cmdSel?'on':''}"><span>${esc(c.n)}</span>${c.k?`<kbd>${esc(c.k)}</kbd>`:''}</li>`).join(''):`<li class="none">${T('cmd.none')}</li>`;
  $('#cmdq').setAttribute('aria-activedescendant',cmdList.length?'cmd'+cmdSel:'');
  $('#cmd'+cmdSel)?.scrollIntoView({block:'nearest'});
}
function cmdRun(i){const c=cmdList[i];cmdClose();if(c)try{c.f()}catch(e){console.error(e)}}
function cmdClose(){$('#cmdk')?.remove()}
function openPalette(){
  if($('#cmdk')){cmdClose();return}
  const o=document.createElement('div');o.className='kbov';o.id='cmdk';
  o.innerHTML=`<div class="kbbox cmdbox" role="dialog" aria-modal="true" aria-label="${T('cmd.title')}"><input id="cmdq" type="text" role="combobox" aria-expanded="true" aria-controls="cmdl" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${T('cmd.ph')}"><ul id="cmdl" role="listbox" aria-label="${T('cmd.title')}"></ul><p class="hint">${T('cmd.hint')}</p></div>`;
  document.body.appendChild(o);
  const q=$('#cmdq');cmdSel=0;cmdList=cmdItems('');cmdDraw();q.focus();
  q.addEventListener('input',()=>{cmdSel=0;cmdList=cmdItems(q.value);cmdDraw()});
  q.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();cmdClose()}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(cmdList.length){cmdSel=(cmdSel+(e.key==='ArrowDown'?1:-1)+cmdList.length)%cmdList.length;cmdDraw()}}
    else if(e.key==='Enter'){e.preventDefault();cmdRun(cmdSel)}
  });
  o.addEventListener('pointerdown',e=>{if(e.target===o)cmdClose();else if(e.target.closest('#cmdl'))e.preventDefault()});
  o.addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li)cmdRun(+li.dataset.i)});
}

/* nouveaux raccourcis (personnalisables comme les autres) */
KEYACTS.push(
  {id:'palette',n:'cmd.title',d:['ctrl+k'],f:openPalette},
  {id:'prevMk',n:'mk.prev',d:['ctrl+arrowleft'],f:()=>mkJump(-1)},
  {id:'nextMk',n:'mk.next',d:['ctrl+arrowright'],f:()=>mkJump(1)},
  {id:'mkEdit',n:'mk.edit',d:['shift+m'],f:mkEditHere}
);

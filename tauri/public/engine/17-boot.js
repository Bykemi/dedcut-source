/* ---------- changement de langue (sans redémarrer) ---------- */
window.addEventListener('dedcut-lang',()=>{
  renderSounds();renderShapes();renderThemes();buildLib();renderBin();refresh();
  if(setSave.last)setSave(setSave.last);
  if(typeof vo!=='undefined'&&vo)voBtn(true);
  if(!$('#t-rec').hidden&&!recState){loadSources();loadMics();loadCams()}
});

/* ---------- démarrage : restauration de la dernière session ---------- */
async function restore(){
  const rows=await DB.all('media'),paths=rows.filter(r=>r.path).map(r=>r.path);
  const inf=FS&&paths.length?await FS.allowPaths(paths):[];
  const ok=new Set(inf.filter(i=>i.exists).map(i=>i.path.toLowerCase()));
  for(const r of rows){
    let m;
    if(r.path){const hit=!!FS&&ok.has(r.path.toLowerCase());m={id:r.id,name:r.name,type:r.type,duration:r.duration,w:r.w,h:r.h,size:r.size||0,path:r.path,url:hit?FS.fileUrl(r.path):null,missing:!hit,thumb:r.thumb,ok:true}}
    else if(r.blob&&FS){try{const f=await FS.saveMedia(r.blob,r.name);m={id:r.id,name:r.name,type:r.type,duration:r.duration,path:f.path,size:f.size,url:FS.fileUrl(f.path),thumb:r.thumb,ok:true};persistMedia(m)}catch(e){continue}}
    else if(r.blob)m={id:r.id,name:r.name,type:r.type,duration:r.duration,blob:r.blob,url:URL.createObjectURL(r.blob),thumb:r.thumb,ok:true};
    else continue;
    if(m.type==='image'&&m.url)m.thumb=m.url;
    media.push(m);if(!m.missing)queueWave(m);
  }
  const pr=await DB.get('kv','project');
  if(pr){
    setFormat(pr.W||1280,pr.H||720,false);
    clips=(pr.clips||[]).filter(c=>!c.mid||mById(c.mid));
    applyExtras(pr);projPath=pr.projPath||null;restoredDirty=!!pr.projDirty;
    uid=Math.max(uid,pr.uid||1,...media.map(m=>m.id+1),...clips.map(c=>c.id+1));
  }
}
(async()=>{
  setFormat(1280,720,false);setName(projName);setPlayIcon();renderScenes();
  try{await DB.open();await restore();setSave('save.on')}catch(e){setSave('save.off')}
  buildLib();renderBin();commit();projDirty=restoredDirty;refresh();engineReady=true;requestAnimationFrame(tick);
  window.dispatchEvent(new CustomEvent('dedcut-ready'));
  const op=new URLSearchParams(location.search).get('open');if(op)openPath(op);
})();

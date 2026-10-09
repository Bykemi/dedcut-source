/* ---------- passerelle Montage → Image (v4.47) ----------
   Clic droit sur un clip de la timeline :
   - « Envoyer à Image » : l'image d'origine (clip image) ou l'image de la vidéo à cet endroit (clip vidéo) ;
   - « Envoyer l'image affichée à Image » : ce que montre l'aperçu à cet instant (tous les clips, textes compris).
   L'image s'ouvre dans un nouveau document de l'espace Image (file d'attente lue par src/image/ImageApp.tsx). */
window.dedcutImageQueue=window.dedcutImageQueue||[];
function sendToImage(blob,name){
  window.dedcutImageQueue.push({blob,name:String(name||'image').replace(/[\\/:*?"<>|]+/g,'').slice(0,80)+'.png'});
  setMode('image');window.dispatchEvent(new Event('dedcut-image-import'));
}
const ibPng=c=>new Promise((ok,ko)=>c.toBlob(b=>b?ok(b):ko(new Error('png')),'image/png'));
const ibBase=n=>String(n||'').replace(/\.[a-z0-9]+$/i,'');
/** image d'un clip à l'instant t (dans le clip) */
async function ibClipImage(c,t){
  const m=c.mid&&mById(c.mid);t=Math.min(Math.max(t,c.start),c.start+c.dur-1/60);
  if(m&&m.type==='image'){const r=await fetch(m.url);if(!r.ok)throw new Error('media');return{blob:await r.blob(),name:ibBase(m.name)}}
  if(m&&m.type==='video'){
    if(typeof pause==='function')pause();const el=getEl(c),want=srcOf(c,t);
    if(Math.abs(el.currentTime-want)>.01||el.readyState<2){el.currentTime=want;await new Promise(r=>{const f=()=>{el.removeEventListener('seeked',f);r()};el.addEventListener('seeked',f);setTimeout(f,2500)})}
    const k=document.createElement('canvas');k.width=el.videoWidth||W;k.height=el.videoHeight||H;k.getContext('2d').drawImage(el,0,0,k.width,k.height);
    return{blob:await ibPng(k),name:ibBase(m.name)+' '+fmt(t).replace(/:/g,'-')};
  }
  return ibShown(t,clipName(c));
}
/** image affichée par l'aperçu à l'instant t */
async function ibShown(t,name){
  if(typeof pause==='function')pause();seek(t);await new Promise(r=>setTimeout(r,450));
  const k=document.createElement('canvas');k.width=cv.width;k.height=cv.height;k.getContext('2d').drawImage(cv,0,0);
  return{blob:await ibPng(k),name:(name||projName||'DedCut')+' '+fmt(t).replace(/:/g,'-')};
}
window.imgCtx=(c,t)=>{
  const m=c.mid&&mById(c.mid);if(m&&m.type==='audio')return[];
  const go=async fn=>{try{const r=await fn();sendToImage(r.blob,r.name);toast(T('ib.sent'))}catch(e){toast(T('ib.fail'))}};
  return['-',{label:T('ib.toImage'),fn:()=>go(()=>ibClipImage(c,t))},{label:T('ib.shownToImage'),fn:()=>go(()=>ibShown(Math.min(Math.max(t,c.start),c.start+c.dur-1/60),clipName(c)))}];
};

/* ---------- Image → Montage : le média envoyé par l'espace Image est posé sur la timeline, à la tête de lecture ----------
   overlay : un calque seul (fond transparent) va par-dessus la vidéo, à la taille de l'image entière */
window.ibToMontage=(id,overlay)=>{
  const m=mById(id);if(!m)return;addFromMedia(id,!!overlay);
  const c=clips.filter(x=>x.mid===id).pop();if(overlay&&c){c.p.scale=100;c.p.x=50;c.p.y=50;commit();refresh()}
  setMode('edit');
};

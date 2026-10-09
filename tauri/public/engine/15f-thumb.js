/* ---------- Miniature IA (v4.50) : DedCut choisit les meilleurs moments de la vidéo et prépare la miniature dans Image ----------
   Tout se passe sur ce PC. Chaque moment reçoit une note : visage bien visible (MediaPipe BlazeFace, déjà livré), image nette,
   couleurs vives, bon contraste, ni trop sombre ni trop claire ; les images noires (fondus, transitions) sont écartées.
   On propose les 3 meilleurs (assez éloignés dans le temps), ou l'image affichée, ou une image à soi. La miniature est ensuite
   construite en calques modifiables par l'espace Image (src/image/thumbnail.ts) : file window.dedcutThumbQueue. */
const TH_STYLES=['gaming','vlog','tuto','clean'],TH_FMTS=['yt','vertical','square'];
let thPref={style:'gaming',fmt:'yt'};try{Object.assign(thPref,JSON.parse(localStorage.getItem('dedcut-thumb')||'{}'))}catch(e){}
const thSave=()=>{try{localStorage.setItem('dedcut-thumb',JSON.stringify(thPref))}catch(e){}};
const thImg=src=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=src});
/** titre proposé : le premier texte du montage, sinon le nom du projet (s'il a été changé) */
function thTitleGuess(){
  const tx=clips.filter(c=>isText(c)&&c.p&&String(c.p.text||'').trim()).sort((a,b)=>a.start-b.start)[0];
  if(tx)return String(tx.p.text).split('\n')[0].trim().slice(0,48);
  const n=String(projName||'').trim();return n&&n!=='Mon projet'&&n!==T('project.untitled')?n.slice(0,48):'';
}
/** note d'une image (petite copie dans g) */
function thScore(g,w,h,det){
  const d=g.getImageData(0,0,w,h).data,n=w*h,Y=new Float32Array(n);
  let sy=0,sy2=0,srg=0,srg2=0,syb=0,syb2=0;
  for(let i=0,k=0;i<n;i++,k+=4){const r=d[k],gg=d[k+1],b=d[k+2],y=.299*r+.587*gg+.114*b;Y[i]=y;sy+=y;sy2+=y*y;const rg=r-gg,yb=.5*(r+gg)-b;srg+=rg;srg2+=rg*rg;syb+=yb;syb2+=yb*yb}
  const mu=sy/n,sd=Math.sqrt(Math.max(0,sy2/n-mu*mu)),mrg=srg/n,myb=syb/n;
  const color=Math.sqrt(Math.max(0,srg2/n-mrg*mrg)+Math.max(0,syb2/n-myb*myb))+.3*Math.hypot(mrg,myb);
  let lap=0,ln=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,v=4*Y[i]-Y[i-1]-Y[i+1]-Y[i-w]-Y[i+w];lap+=v*v;ln++}
  let face=0,fbox=null;
  if(det){try{const r=det.detect(g.canvas);for(const f of r.detections||[]){
    const b=f.boundingBox,a=b.width*b.height/(w*h),cx=(b.originX+b.width/2)/w,conf=f.categories&&f.categories[0]?f.categories[0].score:.6;
    const size=a<.012?.5*a/.012:a<=.3?1:Math.max(.5,1-(a-.3)),s=conf*size*(1-Math.min(.5,Math.abs(cx-.5))*.6);
    if(s>face){face=s;fbox={x:b.originX/w,y:b.originY/h,w:b.width/w,h:b.height/h}}}}catch(e){}}
  return{mu,sd,color,sharp:lap/Math.max(1,ln),face,fbox,expo:Math.max(0,1-Math.abs(mu-128)/128),bad:mu<22||sd<10};
}
/** les meilleurs moments de la vidéo (3 au plus), du meilleur au moins bon */
async function thAnalyze(onP){
  const vids=clips.filter(c=>isVid(c)&&c.mid&&mById(c.mid)&&/^(video|image)$/.test(mById(c.mid).type)).sort((a,b)=>a.start-b.start);
  if(!vids.length)return[];
  const det=await faceDetector(),tot=vids.reduce((s,c)=>s+c.dur,0),N=Math.min(48,Math.max(8,Math.round(tot/1.5)));
  const cv=document.createElement('canvas'),g=cv.getContext('2d',{willReadFrequently:true}),all=[];let done=0;
  for(const c of vids){
    const m=mById(c.mid),n=Math.max(1,Math.round(N*c.dur/tot)),rd=m.type==='video'?new SeekReader(m):null,im=rd?null:await thImg(m.url);
    try{for(let j=0;j<n;j++){
      const tl=c.dur*(j+.5)/n,src=(c.in||0)+tl*(c.p.rate||1),el=rd?await rd.frameAt(Math.min(src,Math.max(0,(m.duration||1e9)-.05))):im;
      const vw=el&&(el.videoWidth||el.naturalWidth),vh=el&&(el.videoHeight||el.naturalHeight);onP&&onP(++done/N);if(!vw||!vh)continue;
      const w=256,h=Math.max(8,Math.round(w*vh/vw));cv.width=w;cv.height=h;g.drawImage(el,0,0,w,h);
      all.push({c,m,t:c.start+tl,src,...thScore(g,w,h,det)});
    }}finally{rd&&rd.close()}
  }
  const ms=Math.max(1e-6,...all.map(o=>o.sharp)),mc=Math.max(1e-6,...all.map(o=>o.color));
  for(const o of all){o.nSharp=Math.sqrt(o.sharp/ms);o.nColor=o.color/mc;o.score=o.bad?-1:.34*o.face+.22*o.nSharp+.18*o.nColor+.13*Math.min(1,o.sd/64)+.13*o.expo}
  all.sort((a,b)=>b.score-a.score);
  const gap=Math.max(1.5,tot/12),pick=[];
  for(const o of all){if(o.score<0)break;if(pick.every(p=>Math.abs(p.t-o.t)>=gap))pick.push(o);if(pick.length===3)break}
  for(const o of all){if(pick.length>=3||o.score<0)break;if(!pick.includes(o))pick.push(o)}
  return pick;
}
/** image d'un moment, à la taille de la vidéo */
async function thFrame(o){
  if(o.blob)return o.blob;
  const rd=o.m.type==='video'?new SeekReader(o.m):null;
  try{const el=rd?await rd.frameAt(o.src):await thImg(o.m.url),k=document.createElement('canvas');k.width=el.videoWidth||el.naturalWidth;k.height=el.videoHeight||el.naturalHeight;k.getContext('2d').drawImage(el,0,0);
    return await new Promise((ok,ko)=>k.toBlob(b=>b?ok(b):ko(new Error('png')),'image/png'))}finally{rd&&rd.close()}
}
/** visage d'une image donnée (blob), pour cadrer la miniature */
async function thFaceOf(blob){
  const det=await faceDetector();if(!det)return null;const u=URL.createObjectURL(blob);
  try{const im=await thImg(u);if(!im)return null;const w=256,h=Math.max(8,Math.round(w*im.naturalHeight/im.naturalWidth)),k=document.createElement('canvas');k.width=w;k.height=h;const g=k.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,w,h);return thScore(g,w,h,det).fbox}
  finally{URL.revokeObjectURL(u)}
}
const thIco=d=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TH_IC={img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',play:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/>',up:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'};

/** ouvre la fenêtre « Miniature de ta vidéo » ; o.title : titre proposé (assistant), o.auto : créer directement avec le meilleur moment */
async function thumbOpen(o={}){
  if($('#thdlg'))return;
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='thdlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box" role="dialog" aria-modal="true" aria-labelledby="thT">
    <div class="dcq-h"><span class="dcq-ic">${thIco(TH_IC.img)}</span><b id="thT">${T('th.title')}</b><button class="dcthumb-x" data-thx title="${esc(T('common.close'))}">${thIco('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="dcthumb-p" id="thInfo">${T('th.analyzing')}</p><div class="dcthumb-bar"><i id="thBar"></i></div>
    <div class="dcthumb-grid" id="thGrid" hidden></div>
    <div class="dcthumb-form" id="thForm" hidden>
      <label class="dcthumb-l"><span>${T('th.titleLabel')}</span><input id="thTitle" maxlength="60" placeholder="${esc(T('th.titlePh'))}"></label>
      <div class="dcthumb-row"><span>${T('th.style')}</span><div class="seg" id="thStyle">${TH_STYLES.map(s=>`<button data-st="${s}">${T('th.s.'+s)}</button>`).join('')}</div></div>
      <div class="dcthumb-row"><span>${T('th.format')}</span><div class="seg" id="thFmt">${TH_FMTS.map(s=>`<button data-fm="${s}">${T('th.f.'+s)}</button>`).join('')}</div></div>
      <p class="dcthumb-note">${T('th.note')}</p>
    </div>
    <div class="dcq-b"><button class="dcq-no" data-thx>${T('common.cancel')}</button><button class="dcq-ok" id="thGo" disabled>${T('th.create')}</button></div>
    <input type="file" id="thFile" accept="image/*" hidden></div>`;
  document.body.appendChild(m);
  const prev=document.activeElement;let gen=0,cands=[],sel=-1,closed=false;
  const end=()=>{closed=true;gen++;removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);for(const c of cands)if(c.url&&c.own)URL.revokeObjectURL(c.url);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end()}else if(e.key==='Enter'&&e.target.id!=='thTitle'&&!$('#thGo').disabled){e.preventDefault();e.stopPropagation();go()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  const segSet=()=>{m.querySelectorAll('#thStyle button').forEach(b=>b.classList.toggle('on',b.dataset.st===thPref.style));m.querySelectorAll('#thFmt button').forEach(b=>b.classList.toggle('on',b.dataset.fm===thPref.fmt))};
  const tags=c=>[c.face>.45&&T('th.tag.face'),c.nSharp>.75&&T('th.tag.sharp'),c.nColor>.7&&T('th.tag.color')].filter(Boolean).slice(0,2);
  const draw=()=>{
    $('#thGrid').innerHTML=cands.map((c,i)=>`<button class="dcthumb-card${i===sel?' on':''}" data-i="${i}"><span class="dcthumb-im"><img src="${c.url}" alt=""></span>
      <span class="dcthumb-cap"><b>${c.own?esc(c.label):fmt(c.t)}</b>${c.own?'':tags(c).map(x=>`<em>${esc(x)}</em>`).join('')}</span></button>`).join('')
      +`<button class="dcthumb-card dcthumb-add" data-add="now">${thIco(TH_IC.play)}<span>${T('th.now')}</span></button><button class="dcthumb-card dcthumb-add" data-add="file">${thIco(TH_IC.up)}<span>${T('th.own')}</span></button>`;
    $('#thGo').disabled=sel<0;
  };
  const addOwn=async(blob,label)=>{const url=URL.createObjectURL(blob);cands.push({own:true,blob,url,label,face:0,fbox:await thFaceOf(blob)});sel=cands.length-1;draw()};
  const go=async()=>{
    const c=cands[sel];if(!c)return;thPref.style=thPref.style||'gaming';thSave();$('#thGo').disabled=true;$('#thInfo').textContent=T('th.making');
    try{const blob=await thFrame(c);if(closed)return;
      window.dedcutThumbQueue=window.dedcutThumbQueue||[];window.dedcutThumbQueue.push({blob,title:$('#thTitle').value.trim(),style:thPref.style,fmt:thPref.fmt,face:c.fbox||null,name:projName});
      end();setMode('image');window.dispatchEvent(new Event('dedcut-thumb'));
    }catch(e){$('#thInfo').textContent=T('th.fail');$('#thGo').disabled=false}
  };
  m.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-thx')){end();return}
    if(b.id==='thGo'){go();return}
    if(b.dataset.st){thPref.style=b.dataset.st;thSave();segSet();return}
    if(b.dataset.fm){thPref.fmt=b.dataset.fm;thSave();segSet();return}
    if(b.dataset.add==='file'){$('#thFile').click();return}
    if(b.dataset.add==='now'){try{const r=await ibShown(time,projName);if(!closed)addOwn(r.blob,T('th.nowShort')+' '+fmt(time))}catch(x){toast(T('th.fail'))}return}
    if(b.dataset.i!=null){sel=+b.dataset.i;draw()}
  });
  m.addEventListener('dblclick',e=>{if(e.target.closest('.dcthumb-card[data-i]'))go()});
  m.addEventListener('mousedown',e=>{if(e.target===m)end()});
  $('#thFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)addOwn(f,f.name.replace(/\.[^.]+$/,'').slice(0,24))});
  $('#thTitle').value=o.title!=null?String(o.title).slice(0,60):thTitleGuess();
  if(o.style&&TH_STYLES.includes(o.style))thPref.style=o.style;if(o.format&&TH_FMTS.includes(o.format))thPref.fmt=o.format;segSet();
  // analyse
  const g0=++gen;let best=[];
  try{best=await thAnalyze(q=>{if(g0===gen)$('#thBar').style.width=Math.round(q*100)+'%'})}catch(e){console.warn(e);best=[]}
  if(g0!==gen||closed)return;
  const k=document.createElement('canvas'),kg=k.getContext('2d');
  for(const c of best){try{const blob=await thFrame(c);c.blob=blob;const im=await thImg(c.url=URL.createObjectURL(blob));c.own=false;const w=360;k.width=w;k.height=Math.round(w*im.naturalHeight/im.naturalWidth);kg.drawImage(im,0,0,k.width,k.height);URL.revokeObjectURL(c.url);c.url=k.toDataURL('image/jpeg',.82)}catch(e){c.url=''}}
  if(closed)return;
  cands=best.filter(c=>c.url);sel=cands.length?0:-1;
  m.querySelector('.dcthumb-bar')?.remove();$('#thInfo').textContent=cands.length?T('th.pick'):T('th.none');
  $('#thGrid').hidden=false;$('#thForm').hidden=false;draw();
  if(o.auto&&sel>=0)go();else requestAnimationFrame(()=>$('#thTitle').focus());
}
window.thumbOpen=thumbOpen;

/* après un export de vidéo réussi : petite proposition en bas à droite (on peut dire « ne plus demander ») */
function thumbAsk(){
  try{if(localStorage.getItem('dedcut-thumb-ask')==='0')return}catch(e){}
  if(!clips.some(c=>isVid(c)&&c.mid))return;
  $('#thAsk')?.remove();const d=document.createElement('div');d.id='thAsk';d.className='dcthumb-ask';
  d.innerHTML=`<span class="dcq-ic">${thIco(TH_IC.img)}</span><div><b>${T('th.ask.t')}</b><p>${T('th.ask.p')}</p>
    <div class="dcthumb-askb"><button class="dcq-ok" data-a="go">${T('th.ask.go')}</button><button class="dcq-no" data-a="later">${T('th.ask.later')}</button></div>
    <label class="dcthumb-never"><input type="checkbox" data-a="never"> ${T('th.ask.never')}</label></div>`;
  document.body.appendChild(d);
  const close=()=>{d.classList.add('out');setTimeout(()=>d.remove(),150)};
  d.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.a;if(a==='go'){close();thumbOpen()}else if(a==='later')close();else if(a==='never'){try{localStorage.setItem('dedcut-thumb-ask',e.target.checked?'0':'1')}catch(x){}}});
  setTimeout(()=>{if(document.body.contains(d)&&!d.matches(':hover'))close()},20000);
}
window.thumbAsk=thumbAsk;

/* bouton « Miniature IA » de la fenêtre d'export */
$('#xThumb')&&$('#xThumb').addEventListener('click',()=>{$('#ov').style.display='none';thumbOpen()});

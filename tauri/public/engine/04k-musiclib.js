/* ---------- Bibliothèque de musiques façon CapCut (v4.40) : recherche, catégories, favoris, écoute, ajout en 1 clic ----------
   Deux sources dans la même liste :
   - les vraies musiques en domaine public (CC0) de Komiku, HoliznaCC0 et Loyalty Freak Music : écoute en direct, téléchargées
     (et vérifiées par music.rs) seulement quand on les ajoute, rangées dans Vidéos\DedCut\Musiques ;
   - les musiques créées par DedCut (04f-music.js) : composées sur place, durée au choix. */
const MCATS=['vlog','happy','dance','hiphop','epic','game','sad','calm','jazz','rock','scary','xmas','kids','electro','world'];
const MCAT_ICO={vlog:'sunset',happy:'sticker',dance:'party',hiphop:'mic',epic:'sword',game:'gamepad',sad:'drop',calm:'leaf',jazz:'coffee',rock:'flame',scary:'ghost',xmas:'tree',kids:'balloon',electro:'bolt',world:'globe'};
const MCAT_HUE={vlog:28,happy:48,dance:300,hiphop:265,epic:8,game:150,sad:212,calm:178,jazz:35,rock:350,scary:280,xmas:130,kids:330,electro:195,world:95};
// catégorie de chaque musique créée par DedCut
const MUS_CAT={chill:'vlog',lofi:'vlog',night:'vlog',summer:'happy',happy:'happy',epic:'epic',cinematic:'epic',adventure:'epic',victory:'epic',march:'epic',pirate:'epic',medieval:'epic',
  suspense:'scary',horror:'scary',mystery:'scary',game:'game',boss:'game',tech:'electro',synthwave:'electro',retro80:'electro',futurebass:'electro',bigdrop:'electro',news:'electro',
  hiphop:'hiphop',drill:'hiphop',darktrap:'hiphop',boombap:'hiphop',sad:'sad',rain:'sad',romance:'sad',ambient:'calm',zen:'calm',space:'calm',
  dance:'dance',funk:'dance',party:'dance',tropical:'dance',rock:'rock',sport:'rock',jazz:'jazz',cafe:'jazz',bossa:'jazz',
  reggae:'world',latin:'world',oriental:'world',afro:'world',country:'world',celtic:'world',asia:'world',western:'world',xmas:'xmas',kids:'kids',lullaby:'kids',cartoon:'kids'};
let mlCat='all',mlSrc='all',mlQ='',mlLib=null,mlHave=new Set(),mlBusy={},mlPlay=null;
let mlFav=new Set();try{mlFav=new Set(JSON.parse(localStorage.getItem('dedcut-mus-fav')||'[]'))}catch(e){}
const mlSaveFav=()=>{try{localStorage.setItem('dedcut-mus-fav',JSON.stringify([...mlFav]))}catch(e){}};
const mlNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const mlTime=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
async function mlLoad(){
  if(!window.dedcutMusic)return;
  try{mlLib=await dedcutMusic.catalog();mlHave=new Set(mlLib.have||[])}catch(e){mlLib=null}
  renderMusic();
}
// toutes les musiques : vraies (r:) puis créées par DedCut (g:)
function mlItems(){
  const real=mlLib?mlLib.tracks.map(t=>({key:'r:'+t.id,real:true,cat:t.cat,title:t.title,sub:t.artist+' · '+mlTime(t.dur),find:[t.title,t.artist,t.album,...t.tags].join(' '),t})):[];
  const made=Object.keys(MUS).map(k=>({key:'g:'+k,real:false,cat:MUS_CAT[k]||'calm',title:T('mus.'+k),sub:'DedCut · '+MUS[k].bpm+' bpm',find:k}));
  return[...real,...made];
}
function mlRow(it){
  const h=MCAT_HUE[it.cat]??200,busy=mlBusy[it.key],have=!it.real||mlHave.has(it.key.slice(2)),playing=mlPlay&&mlPlay.key===it.key;
  const add=busy!=null?`<span class="mlpct">${busy}%</span>`:have?'+':ico('dl',14);
  return`<div class="mlrow${playing?' play':''}" data-mlkey="${it.key}">
    <button class="mlplay" data-mlplay="${it.key}" title="${T('common.listen')}">${ico(playing?'square':'play',13)}</button>
    <i class="mlcov" style="--h:${h}">${ico(MCAT_ICO[it.cat]||'audio',18)}</i>
    <div class="mltx"><b title="${esc(it.title)}">${esc(it.title)}</b><span>${esc(it.sub)}${it.real?'':' · <em>'+T('mlib.anyLen')+'</em>'}</span></div>
    <button class="mlfav${mlFav.has(it.key)?' on':''}" data-mlfav="${it.key}" title="${T('mlib.fav')}">★</button>
    <button class="mladd" data-mladd="${it.key}" title="${T(have?'common.addAtPlayhead':'mlib.download')}" ${busy!=null?'disabled':''}>${add}</button>
    <s style="--p:0"></s></div>`;
}
renderMusic=function(){
  const L=$('#muslist');if(!L)return;
  const D=$('#mdur');if(D&&!D.dataset.ok){D.dataset.ok=1;D.innerHTML=[30,60,120,180].map(s=>`<option value="${s}" ${s===musDur?'selected':''}>${s<60?s+' s':(s/60)+' min'}</option>`).join('');D.onchange=()=>{musDur=+D.value}}
  let top=$('#mltop');
  if(!top){top=document.createElement('div');top.id='mltop';top.innerHTML=`<input type="search" id="mlq" autocomplete="off"><div class="mlsrc" id="mlsrc"></div><div class="mlcats" id="mlcats"></div>`;
    ($('#mdur')?.closest('.fld')||L).before(top);
    $('#mlq').oninput=e=>{mlQ=e.target.value;mlList()};
    for(const mc of [$('#mlsrc'),$('#mlcats')]){mc.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){mc.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
      mc.addEventListener('scroll',()=>mlEnd(mc))}}
  $('#mlq').placeholder=T('mlib.search');
  const srcs=['all','real','dc','fav'].concat(mlHave.size?['saved']:[]);if(!srcs.includes(mlSrc))mlSrc='all';
  $('#mlsrc').innerHTML=srcs.map(k=>`<button data-mlsrc="${k}" class="${k===mlSrc?'on':''}">${k==='fav'?'★ ':''}${T('mlib.src.'+k)}</button>`).join('');
  $('#mlcats').innerHTML=['all',...MCATS].map(k=>`<button data-mlcat="${k}" class="${k===mlCat?'on':''}">${k==='all'?'':ico(MCAT_ICO[k],13)}${T('mlib.cat.'+k)}</button>`).join('');
  for(const mc of [$('#mlsrc'),$('#mlcats')]){const on=mc.querySelector('.on');if(on&&(on.offsetLeft<mc.scrollLeft||on.offsetLeft+on.offsetWidth>mc.scrollLeft+mc.clientWidth))mc.scrollLeft=on.offsetLeft-12;mlEnd(mc)}
  const dl=$('#mdur')?.closest('.fld');if(dl)dl.hidden=mlSrc==='real'||mlSrc==='saved';
  mlList();
};
// fondu à droite seulement s'il reste des boutons à voir
function mlEnd(mc){mc.classList.toggle('end',mc.scrollLeft+mc.clientWidth>=mc.scrollWidth-4)}
function mlList(){
  const L=$('#muslist');if(!L)return;
  const q=mlNorm(mlQ).trim().split(/\s+/).filter(Boolean);
  const list=mlItems().filter(it=>{
    if(mlCat!=='all'&&it.cat!==mlCat)return false;
    if(mlSrc==='real'&&!it.real||mlSrc==='dc'&&it.real||mlSrc==='fav'&&!mlFav.has(it.key)||mlSrc==='saved'&&!(it.real&&mlHave.has(it.key.slice(2))))return false;
    if(q.length){const hay=mlNorm(it.title+' '+it.sub+' '+it.find+' '+T('mlib.cat.'+it.cat)+' '+it.cat);if(!q.every(w=>hay.includes(w)))return false}
    return true});
  L.innerHTML=list.length?list.map(mlRow).join(''):`<div class="hint mlnone">${T(mlSrc==='fav'?'mlib.noFav':'mlib.none')}</div>`;
}
function mlStop(){if(!mlPlay)return;const p=mlPlay;mlPlay=null;try{p.stop()}catch(e){}const r=$(`[data-mlkey="${p.key}"]`);if(r){r.classList.remove('play');const b=r.querySelector('.mlplay');if(b)b.innerHTML=ico('play',13);const s=r.querySelector('s');if(s)s.style.setProperty('--p',0)}}
function mlBar(key,f){const s=$(`[data-mlkey="${key}"] s`);if(s)s.style.setProperty('--p',Math.max(0,Math.min(1,f)))}
async function mlPreview(key){
  const again=mlPlay&&mlPlay.key===key;mlStop();if(again)return;
  if(typeof musPrev!=='undefined'&&musPrev){try{musPrev.stop()}catch(e){}musPrev=null}
  const row=$(`[data-mlkey="${key}"]`);if(row){row.classList.add('play');row.querySelector('.mlplay').innerHTML=ico('square',13)}
  const me={key};mlPlay=me;
  if(key.startsWith('r:')){
    const id=key.slice(2);let src=mlLib.base+id+'.mp3';
    if(mlHave.has(id)){try{src=FS.fileUrl((await dedcutMusic.get(id)).path)}catch(e){}}
    if(mlPlay!==me)return;
    const a=new Audio(src);a.volume=.9;me.stop=()=>{a.pause();a.src=''};
    a.ontimeupdate=()=>{if(mlPlay===me)mlBar(key,a.currentTime/(a.duration||1))};a.onended=()=>{if(mlPlay===me)mlStop()};
    a.onerror=()=>{if(mlPlay===me){mlStop();toast(T('mlib.noNet'))}};
    a.play().catch(()=>{});
  }else{
    const k=key.slice(2);toast(T('mus.making'));const[l,r]=await musicRender(k,16);if(mlPlay!==me)return;
    const ac=new AudioContext(),b=ac.createBuffer(2,l.length,44100);b.copyToChannel(l,0);b.copyToChannel(r,1);
    const s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);const t0=ac.currentTime;s.start();
    const iv=setInterval(()=>{if(mlPlay===me)mlBar(key,(ac.currentTime-t0)/16)},250);
    me.stop=()=>{clearInterval(iv);try{s.stop()}catch(e){}ac.close()};s.onended=()=>{if(mlPlay===me)mlStop()};
  }
}
// ajoute une vraie musique (téléchargée si besoin) à la tête de lecture, sur la piste Audio
async function mlAddReal(id,at){
  if(!window.dedcutMusic||!mlLib)return null;
  if(!mlHave.has(id)&&!mlLib.supported){toast(T('mlib.noDl'));return null}
  const key='r:'+id;if(mlBusy[key]!=null)return null;
  mlBusy[key]=0;mlList();
  try{
    const f=await dedcutMusic.get(id);mlHave.add(id);
    let m=media.find(x=>x.path===f.path);if(!m){m=addPaths([f])[0];if(!m)throw new Error('?')}
    await waitMeta([m]);delete mlBusy[key];renderMusic();
    add(newClip({track:tk('audio'),mid:m.id,start:at??time,dur:m.duration||60,p:{vol:70}}));
    toast(T('mlib.added',{title:(mlLib.tracks.find(t=>t.id===id)||{}).title||''}));return m;
  }catch(x){delete mlBusy[key];mlList();toast(T('mlib.fail',{error:String((x&&x.message)||x).slice(0,140)}));return null}
}
/* musique de fond automatique (DedCut IA) : une vraie musique de l'ambiance demandée, sinon une musique composée par DedCut
   (sans internet), posée au début et répétée jusqu'à la fin de la vidéo */
const ML_WORDS={vlog:['vlog','chill','lofi','lo-fi','relax','detente','tuto'],happy:['joyeu','happy','gai','positi','alegr','frohlich','felic','heureu','sourire'],
  dance:['danse','dance','fete','party','disco','fiesta','baile','tanz','festa','club','tiktok'],hiphop:['hip-hop','hiphop','hip hop','rap','trap','phonk','drill'],
  epic:['epique','epic','cinema','film','aventure','adventure','heroi','trailer','bande-annonce'],game:['jeu video','jeux video','gaming','gamer','game','8 bit','8-bit','arcade','minecraft','fortnite'],
  sad:['triste','sad','emotion','emouvant','nostalg','romanti','amour','love','souvenir','mariage'],calm:['calme','zen','medita','doux','calm','dormir','sleep','yoga'],
  jazz:['jazz','cafe','lounge'],rock:['rock','metal','sport','guitare','muscu','foot'],scary:['peur','horreur','horror','halloween','suspense','scary','creepy','fantome','flippant'],
  xmas:['noel','christmas','navidad','weihnacht','natale','natal'],kids:['enfant','kids','drole','funny','bebe','cartoon','dessin anime','rigolo'],
  electro:['electro','techno','edm','synth'],world:['monde','world','latino','reggae','afro','oriental','voyage','travel']};
function mlMood(q){const s=mlNorm(q);for(const[c,ws]of Object.entries(ML_WORDS))if(ws.some(w=>s.includes(w)))return c;return null}
async function mlAddAuto(mood,vol){
  const cat=MCATS.includes(mood)?mood:'vlog';
  const end=Math.max(0,...clips.filter(x=>isVid(x)||isOvr(x)).map(x=>x.start+x.dur))||total()||30;
  if(vol==null)vol=clips.some(x=>isVid(x)&&(x.p.vol??100)>0)?30:80;
  let m=null,title='',real=false;
  if(mlLib&&window.dedcutMusic&&mlLib.supported){
    const list=mlLib.tracks.filter(t=>t.cat===cat),pick=list[Math.floor(Math.random()*list.length)];
    if(pick){try{const f=await dedcutMusic.get(pick.id);mlHave.add(pick.id);m=media.find(x=>x.path===f.path)||addPaths([f])[0];await waitMeta([m]);title=pick.title+' – '+pick.artist;real=true}catch(e){m=null}}
  }
  if(!m){const ks=Object.keys(MUS).filter(k=>MUS_CAT[k]===cat),k=ks[Math.floor(Math.random()*ks.length)]||'chill';m=await musicMedia(k,Math.min(180,Math.max(30,Math.ceil(end/30)*30)));title=T('mus.'+k)}
  const c=placeFree(newClip({track:tk('audio'),mid:m.id,start:0,dur:Math.min(m.duration||60,end),p:{vol:Math.max(0,Math.min(100,+vol))}}));clips.push(c);
  if(c.dur<end-.05)loopMusic(c);
  renderMusic();
  return{id:c.id,title,mood:cat,real_song:real,volume:c.p.vol};
}
if(window.dedcutMusic)dedcutMusic.onProgress(p=>{const key='r:'+p.id;if(mlBusy[key]==null)return;mlBusy[key]=Math.min(99,Math.round(p.done/p.total*100));const b=$(`[data-mladd="${key}"] .mlpct`);if(b)b.textContent=mlBusy[key]+'%'});
document.addEventListener('click',async e=>{
  const c=e.target.closest('[data-mlcat]'),s=e.target.closest('[data-mlsrc]'),p=e.target.closest('[data-mlplay]'),f=e.target.closest('[data-mlfav]'),a=e.target.closest('[data-mladd]');
  if(c){mlCat=c.dataset.mlcat;mlStop();renderMusic();return}
  if(s){mlSrc=s.dataset.mlsrc;mlStop();renderMusic();return}
  if(p){mlPreview(p.dataset.mlplay);return}
  if(f){const k=f.dataset.mlfav;mlFav.has(k)?mlFav.delete(k):mlFav.add(k);mlSaveFav();f.classList.toggle('on',mlFav.has(k));if(mlSrc==='fav')mlList();return}
  if(a){const k=a.dataset.mladd;if(k.startsWith('r:'))mlAddReal(k.slice(2));else{const m=await musicMedia(k.slice(2),musDur);add(newClip({track:tk('audio'),mid:m.id,start:time,dur:m.duration,p:{vol:70}}))}}
});
window.addEventListener('dedcut-lang',()=>renderMusic());
setTimeout(()=>renderMusic(),0);mlLoad();

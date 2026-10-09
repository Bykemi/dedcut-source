/* ---------- Shorts automatiques (v4.55) : les meilleurs moments d'une longue vidéo deviennent des vidéos verticales ----------
   Tout se passe sur ce PC. DedCut écoute le son du montage et lit les sous-titres s'il y en a :
   - passages animés (voix plus forte, rires, cris) et début accrocheur (les 3 premières secondes comptent) ;
   - beaucoup de paroles (débit des sous-titres) ; longs silences pénalisés ;
   - coupes dans un silence ou à une fin de phrase, jamais au milieu d'un mot.
   Chaque Short devient un projet vertical 1080 × 1920 (fichier .dedcut à côté du projet) : clips coupés au moment choisi,
   cadre qui suit le visage (même analyse que « Recadrer automatiquement »), sous-titres repris et agrandis,
   titre accrocheur écrit par l'IA si elle est là. On l'ouvre, on retouche si besoin, on exporte. */
const SH_LEN={short:[15,30],medium:[30,60],long:[60,90]};
let shPref={len:'medium',n:3,title:true,face:true};try{Object.assign(shPref,JSON.parse(localStorage.getItem('dedcut-shorts')||'{}'))}catch(e){}
if(!SH_LEN[shPref.len])shPref.len='medium';
const shSave=()=>{try{localStorage.setItem('dedcut-shorts',JSON.stringify(shPref))}catch(e){}};
const SH_IC='<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>';
const shCaps=()=>clips.filter(c=>isText(c)&&c.p.cap).sort((a,b)=>a.start-b.start);
const shTick=()=>new Promise(r=>setTimeout(r,0));

/** enveloppe du son du montage : un point toutes les step secondes (le plus fort des clips qui sonnent) */
async function shEnv(step,onP){
  const n=Math.max(1,Math.ceil(total()/step)),env=new Float32Array(n);
  const src=clips.filter(x=>{if(!x.mid||trk(x).mute||(x.p.vol??100)<=0)return false;const m=mById(x.mid);return m&&!m.missing&&(m.type==='video'||m.type==='audio')});
  let k=0;
  for(const x of src){
    const b=await decodeAudio(mById(x.mid));onP&&onP(++k/src.length);if(!b)continue;
    const sr=b.sampleRate,d=b.getChannelData(0),r=x.p.rate||1,g=(x.p.vol??100)/100;
    const i0=Math.max(0,Math.ceil(x.start/step)),i1=Math.min(n,Math.floor((x.start+x.dur)/step));
    for(let i=i0;i<i1;i++){
      const s0=Math.floor(((i*step-x.start)*r+(x.in||0))*sr),s1=Math.min(d.length,s0+Math.floor(step*sr*r));
      let ss=0,c=0;for(let j=Math.max(0,s0);j<s1;j+=8){ss+=d[j]*d[j];c++}
      if(c)env[i]=Math.max(env[i],Math.sqrt(ss/c)*g);
    }
    await shTick();
  }
  return env;
}
/** les meilleurs moments : {list:[{a,b,score,tags}]} rangés dans l'ordre du montage, ou {tooShort} */
async function shFind(len,count,onP){
  const step=.1,env=await shEnv(step,onP),n=env.length,dur=n*step,[L0,L1]=SH_LEN[len]||SH_LEN.medium;
  if(dur<L0+1)return{tooShort:true,min:L0};
  const db=Float32Array.from(env,v=>20*Math.log10(v+1e-5)),srt=Float32Array.from(db).sort(),pc=q=>srt[Math.min(n-1,Math.floor(n*q))];
  const med=pc(.5),hi=pc(.92),thr=Math.max(pc(.1)+6,hi-26),span=Math.max(3,hi-med);
  const loud=new Float32Array(n),exc=new Float32Array(n),quiet=new Float32Array(n),chars=new Float32Array(n);
  for(let i=0;i<n;i++){loud[i]=clamp((db[i]-med)/span,-1,1.5);exc[i]=db[i]>hi-2?1:0;quiet[i]=db[i]<thr?1:0}
  const caps=shCaps();
  for(const c of caps){const t=ctrFlat(c.p.text).length,i0=Math.max(0,Math.floor(c.start/step)),i1=Math.min(n,Math.ceil((c.start+c.dur)/step));for(let i=i0;i<i1;i++)chars[i]+=t/Math.max(1,i1-i0)}
  const P=a=>{const p=new Float64Array(n+1);for(let i=0;i<n;i++)p[i+1]=p[i]+a[i];return p};
  const pL=P(loud),pE=P(exc),pQ=P(quiet),pC=P(chars),avg=(p,a,b)=>(p[b]-p[a])/Math.max(1,b-a);
  const spoken=caps.reduce((s,c)=>s+c.dur,0),rate0=spoken>5?pC[n]/spoken:0; // caractères par seconde de parole
  // points de coupe (avec un petit bonus) : milieu des silences, fins de phrases, et le plus calme de chaque tranche de 2 s
  const cuts=new Map(),addCut=(t,b)=>{t=Math.round(clamp(t,0,dur)*10)/10;cuts.set(t,Math.max(cuts.get(t)||0,b))};
  addCut(0,.05);addCut(dur,.05);
  for(let i=0;i<n;){if(!quiet[i]){i++;continue}let j=i;while(j<n&&quiet[j])j++;if(j-i>=3)addCut((i+j)/2*step,.06);i=j}
  for(const c of caps){if(/[.!?。！？…]$/.test(ctrFlat(c.p.text)))addCut(c.start+c.dur+.05,.08);addCut(c.start-.05,.02)}
  for(let i=0;i<n;i+=20){let b=i,bv=Infinity;for(let k=i;k<Math.min(n,i+20);k++)if(db[k]<bv){bv=db[k];b=k}addCut(b*step,0)}
  const ts=[...cuts.keys()].sort((x,y)=>x-y),cand=[];
  for(let x=0;x<ts.length;x++){
    for(let y=x+1;y<ts.length;y++){
      const a=ts[x],b=ts[y],L=b-a;if(L<L0)continue;if(L>L1)break;
      const ia=Math.floor(a/step),ib=Math.min(n,Math.floor(b/step)),ih=Math.min(ib,ia+30);
      const lo=avg(pL,ia,ib),ex=avg(pE,ia,ib),q=avg(pQ,ia,ib),hook=avg(pL,ia,ih),sp=rate0?avg(pC,ia,ib)/step/rate0:0;
      const score=.3*lo+.25*Math.min(1,ex*4)+.2*hook+(rate0?.25*Math.min(1.2,sp):0)-.8*Math.max(0,q-.3)+(cuts.get(a)||0)+(cuts.get(b)||0)-.06*Math.abs(L-(L0+L1)/2)/(L1-L0);
      cand.push({a,b,score,ex,hook,sp});
    }
    if(x%50===49)await shTick();
  }
  cand.sort((u,v)=>v.score-u.score);
  const pick=[];
  for(const c of cand){if(pick.every(p=>c.b<=p.a-1||c.a>=p.b+1))pick.push(c);if(pick.length>=count)break}
  for(const p of pick)p.tags=[p.hook>.45&&'hook',p.ex>.12&&'lively',p.sp>1.05&&'talk'].filter(Boolean);
  return{list:pick.sort((u,v)=>u.a-v.a)};
}
/** aperçu vertical d'un moment (ce que montre le montage, recadré au centre) */
async function shThumb(t){
  pause();seek(t);await new Promise(r=>setTimeout(r,450));
  const w=108,h=192,k=document.createElement('canvas');k.width=w;k.height=h;
  const s=Math.max(w/cv.width,h/cv.height),dw=cv.width*s,dh=cv.height*s;k.getContext('2d').drawImage(cv,(w-dw)/2,(h-dh)/2,dw,dh);
  return k.toDataURL('image/jpeg',.8);
}
const shText=(a,b)=>shCaps().filter(c=>c.start<b&&c.start+c.dur>a).map(c=>ctrFlat(c.p.text)).join(' ');

/* ---------- un Short = les clips du moment [a, b], recalés au début ---------- */
function shCut(a,b){
  const out=[];
  for(const x of clips){
    const s=x.start,e=x.start+x.dur;if(e<=a+.02||s>=b-.02)continue;
    const c=JSON.parse(JSON.stringify(x)),ns=Math.max(s,a),ne=Math.min(e,b),d0=ns-s,d1=e-ne,r=x.p.rate||1;
    c.start=Math.round((ns-a)*1000)/1000;c.dur=ne-ns;
    if(c.mid)c.in=(c.in||0)+(c.p.rev?d1:d0)*r;
    if(c.kf)c.kf.forEach(k=>{k.t-=d0});
    if(d0>.01)c.p.tin='none';if(d1>.01)c.p.tout='none';
    out.push(c);
  }
  return out;
}
/** passage au format vertical : cadre qui suit le visage, sous-titres agrandis, textes à la nouvelle largeur */
async function shVertical(list,face,onP){
  if(W<H)return; // le projet est déjà vertical
  const vids=list.filter(c=>isVid(c)&&c.mid&&!c.gen);let k=0;
  for(const c of list){
    if(isText(c)){
      if(c.p.cap){c.p.size=68;c.p.x=50;c.p.y=70;c.p.text=ctrWrap(c.p.text,c.p.capLang||'',28)}
      else if(c.p.size)c.p.size=Math.max(14,Math.round(c.p.size*1080/W));
    }
  }
  for(const c of vids){
    const m=mById(c.mid);
    if(m.type!=='video'){c.p.fit='blur';continue}
    c.p.tf={zoom:100,x:0,y:0,rot:0,flip:false};c.kf=null;c.p.fit='cover';
    if(face){
      try{const{pts,vw,vh}=await reframeAnalyze(c,q=>onP&&onP((k+q)/vids.length));if(pts.length>1&&vw)reframeApply(c,pts,vw,vh,1080,1920)}
      catch(e){console.warn('recadrage',e)}
    }
    k++;onP&&onP(k/vids.length);
  }
}
/** titres accrocheurs (un par Short) écrits par l'IA, dans la langue de chaque passage ; [] si pas d'IA */
async function shTitles(texts,say){
  if(!texts.some(Boolean))return[];
  let ai=null;try{ai=await ctrAI(say)}catch(e){ai=null}
  if(!ai)return[];
  const sys='You write a short catchy title for each vertical video (TikTok, YouTube Shorts, Reels) from its transcript. Each title: 2 to 6 words, in the same language as its transcript, no hashtags, no emojis, no quotes. Reply with ONLY a JSON array of exactly '+texts.length+' strings, in the same order (an empty string when a transcript is empty).';
  try{
    const r=await window.dedcutChat.once({...ai,system:sys,text:JSON.stringify(texts.map(t=>String(t||'').slice(0,700))),maxTokens:1024});
    const j=ctrParse(r,texts.length,true);
    return j?j.map(t=>t.replace(/[\p{Extended_Pictographic}#"«»“”]/gu,'').replace(/\s+/g,' ').trim().slice(0,60)):[];
  }catch(e){return[]}
}
function shTitleClip(text,dur,id){
  return{id,track:tk('over'),start:0,dur,in:0,p:Object.assign(TBASE(),{text:ctrWrap(text,'',26),size:76,x:50,y:13,font:'Anton',stroke:true,sw:9,shadow:true,anim:'pop'})};
}
/** écrit le Short : projet .dedcut qui reprend les médias du montage (rien n'est copié) */
async function shWrite(list,path,name){
  const used=new Set(list.filter(c=>c.mid).map(c=>c.mid));
  for(const m of media.filter(m=>used.has(m.id)&&!m.path&&m.blob)){const f=await FS.saveMedia(m.blob,m.name);m.path=f.path;m.size=f.size;persistMedia(m)}
  const d=projDoc(dirOf(path));
  Object.assign(d,{W:W<H?W:1080,H:W<H?H:1920,clips:list,markers:[],scenes:undefined,name,uid:Math.max(0,...list.map(c=>c.id|0))+1,media:d.media.filter(m=>used.has(m.id))});
  await FS.writeProject(path,JSON.stringify(d));await addRecent(path);
}
/** dossier des Shorts : celui du projet, sinon choisi une fois */
async function shDir(){
  if(projPath)return dirOf(projPath);
  return FS.pickFolder(T('sho.pickFolder'));
}

/* ---------- fenêtre ---------- */
async function shortsOpen(o={}){
  if($('#shdlg'))return;
  if(!clips.some(c=>c.mid)){toast(T('sho.empty'));return}
  if(o.length&&SH_LEN[o.length])shPref.len=o.length;if(o.count)shPref.n=clamp(Math.round(+o.count)||3,1,5);shSave();
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='shdlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box" role="dialog" aria-modal="true" aria-labelledby="shT">
    <div class="dcq-h"><span class="dcq-ic">${thIco(SH_IC)}</span><b id="shT">${T('sho.title')}</b><button class="dcthumb-x" data-shx title="${esc(T('common.close'))}">${thIco('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="dcthumb-p" id="shInfo">${T('sho.intro')}</p>
    <div class="dcthumb-form" id="shForm">
      <div class="dcthumb-row"><span>${T('sho.length')}</span><div class="seg" id="shLen">${Object.keys(SH_LEN).map(k=>`<button data-len="${k}">${T('sho.len.'+k)}</button>`).join('')}</div></div>
      <div class="dcthumb-row"><span>${T('sho.count')}</span><div class="seg" id="shN">${[1,2,3,4,5].map(k=>`<button data-n="${k}">${k}</button>`).join('')}</div></div>
      <label class="dcthumb-never"><input type="checkbox" id="shFace"> ${T('sho.face')}</label>
      <label class="dcthumb-never"><input type="checkbox" id="shTitle"> ${T('sho.titleAi')}</label>
      <p class="dcthumb-note" id="shCapHint" hidden>${T('sho.capHint')} <button class="sm" id="shCaps">${T('cap.create')}</button></p>
    </div>
    <div class="dcthumb-bar" id="shBarW" hidden><i id="shBar"></i></div>
    <div class="dcshort-grid" id="shGrid" hidden></div>
    <div class="dcq-b"><button class="dcq-no" data-shx>${T('common.cancel')}</button><button class="dcq-ok" id="shGo">${T('sho.find')}</button></div></div>`;
  document.body.appendChild(m);
  const prev=document.activeElement,t0=time;let found=null,closed=false,busy=false,made=[];
  const end=()=>{closed=true;removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const key=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();e.stopPropagation();end()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  const bar=q=>{$('#shBarW').hidden=false;$('#shBar').style.width=Math.round(Math.min(1,q)*100)+'%'};
  const segSet=()=>{m.querySelectorAll('#shLen button').forEach(b=>b.classList.toggle('on',b.dataset.len===shPref.len));m.querySelectorAll('#shN button').forEach(b=>b.classList.toggle('on',+b.dataset.n===shPref.n))};
  segSet();$('#shFace').checked=shPref.face!==false;$('#shTitle').checked=shPref.title!==false;
  const capsOk=()=>shCaps().length>0;
  const capHint=()=>{$('#shCapHint').hidden=capsOk();const w=ctrWho();$('#shTitle').disabled=!w.ok;$('#shTitle').closest('label').title=w.ok?'':w.text};
  capHint();
  const draw=()=>{
    $('#shGrid').innerHTML=found.map((p,i)=>`<button class="dcshort-card${p.on?' on':''}" data-i="${i}"><span class="dcshort-im">${p.url?`<img src="${p.url}" alt="">`:''}<i class="dcshort-ck">${thIco('<path d="M5 12l5 5 9-10"/>')}</i></span>
      <span class="dcshort-cap"><b>${esc(T('sho.n',{n:i+1}))} · ${fmt(p.a)} → ${fmt(p.b)}</b><small>${esc(T('sho.secs',{n:Math.round(p.b-p.a)}))}</small>
      ${p.tags.map(t=>`<em>${esc(T('sho.tag.'+t))}</em>`).join('')}${p.text?`<q>${esc(p.text.slice(0,90))}${p.text.length>90?'…':''}</q>`:''}</span></button>`).join('');
    const k=found.filter(p=>p.on).length;$('#shGo').textContent=T('sho.make',{count:k});$('#shGo').disabled=!k;
  };
  const find=async()=>{
    busy=true;$('#shGo').disabled=true;$('#shForm').hidden=true;$('#shInfo').textContent=T('sho.listening');bar(0);
    let r;try{r=await shFind(shPref.len,shPref.n,q=>bar(q*.8))}catch(e){console.warn(e);r={list:[]}}
    if(closed)return;
    if(r.tooShort){busy=false;$('#shBarW').hidden=true;$('#shForm').hidden=false;$('#shInfo').textContent=T('sho.tooShort',{n:r.min});$('#shGo').disabled=false;return}
    found=r.list;
    $('#shInfo').textContent=T('sho.preview');
    for(let i=0;i<found.length;i++){const p=found[i];p.on=true;p.text=shText(p.a,p.b);try{p.url=await shThumb(p.a+Math.min(2,(p.b-p.a)/3))}catch(e){p.url=''}bar(.8+.2*(i+1)/found.length);if(closed)return}
    pause();seek(t0);busy=false;$('#shBarW').hidden=true;
    if(!found.length){$('#shInfo').textContent=T('sho.none');$('#shForm').hidden=false;$('#shGo').disabled=false;return}
    $('#shInfo').textContent=T('sho.pick');$('#shGrid').hidden=false;draw();
  };
  const make=async()=>{
    const list=found.filter(p=>p.on);if(!list.length)return;
    if(!FS){toast(T('tts.onlyApp'));return}
    const dir=await shDir();if(!dir||closed)return;
    busy=true;$('#shGo').disabled=true;$('#shGrid').hidden=true;bar(0);
    try{
      const base=safeName(projName&&projName!==T('project.untitled')?projName:'DedCut');
      let titles=[];
      if(shPref.title&&ctrWho().ok){$('#shInfo').textContent=T('sho.titles');titles=await shTitles(list.map(p=>p.text),t=>{$('#shInfo').textContent=t})}
      for(let i=0;i<list.length;i++){
        if(closed)return;
        const p=list[i];$('#shInfo').textContent=T('sho.making',{n:i+1,total:list.length});
        const cl=shCut(p.a,p.b);
        await shVertical(cl,shPref.face,q=>bar((i+q*.95)/list.length));
        if(titles[i])cl.push(shTitleClip(titles[i],p.b-p.a,Math.max(0,...cl.map(c=>c.id|0))+1));
        let name=base+' - Short '+(found.indexOf(p)+1),n=2;
        while((await FS.findInDir(dir,[name+'.dedcut']))[0])name=base+' - Short '+(found.indexOf(p)+1)+' ('+(n++)+')';
        const path=dir.replace(/[\\/]+$/,'')+'\\'+name+'.dedcut';
        await shWrite(cl,path,titles[i]||name);made.push({path,name});
        bar((i+1)/list.length);
      }
    }catch(e){busy=false;$('#shInfo').textContent=T('sho.fail',{error:String(e&&e.message||e).slice(0,160)});$('#shGo').disabled=false;return}
    busy=false;$('#shBarW').hidden=true;
    $('#shInfo').textContent=T('sho.done',{count:made.length});
    $('#shGrid').hidden=false;$('#shGrid').className='dcshort-done';
    $('#shGrid').innerHTML=made.map((x,i)=>`<div class="dcshort-row"><span>${thIco(SH_IC)}<b>${esc(x.name)}</b></span><button class="sm${i?'':' pri'}" data-open="${i}">${T('sho.open')}</button></div>`).join('')+`<p class="dcthumb-note">${T('sho.doneHint')}</p>`;
    $('#shGo').hidden=true;m.querySelector('.dcq-no').textContent=T('common.close');
  };
  m.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-shx')){if(!busy)end();return}
    if(b.dataset.len){shPref.len=b.dataset.len;shSave();segSet();return}
    if(b.dataset.n){shPref.n=+b.dataset.n;shSave();segSet();return}
    if(b.dataset.open!=null){const x=made[+b.dataset.open];if(x){end();await openProjectPath(x.path)}return}
    if(b.id==='shCaps'){end();showTab('cap');if(window.dedcutCaptions&&await window.dedcutCaptions.ready().catch(()=>false))window.dedcutCaptions.run();else toast(T('cap.needModel'));return}
    if(b.id==='shGo'){if(busy)return;if(found&&found.length)make();else find();return}
    if(b.dataset.i!=null&&found){const p=found[+b.dataset.i];p.on=!p.on;draw()}
  });
  m.addEventListener('change',e=>{if(e.target.id==='shFace'){shPref.face=e.target.checked;shSave()}if(e.target.id==='shTitle'){shPref.title=e.target.checked;shSave()}});
  m.addEventListener('mousedown',e=>{if(e.target===m&&!busy)end()});
  if(o.auto)find();
}
window.shortsOpen=shortsOpen;

/* points d'entrée : bouton de la fenêtre d'export, palette de commandes (Ctrl+K), assistant IA */
$('#xShorts')&&$('#xShorts').addEventListener('click',()=>{$('#ov').style.display='none';shortsOpen()});
CMDS.push({id:'shorts',n:'sho.title',f:()=>shortsOpen()});
SPACE_TOOLS.make_shorts=async a=>{if(appMode!=='edit')setMode('edit');shortsOpen({length:a.length,count:a.count,auto:true});return{opened:'Shorts window: DedCut is looking for the best moments; the user checks them and clicks the button to create the vertical projects'}};
SPACE_TOOLS.translate_subtitles=async a=>{
  if(appMode!=='edit')setMode('edit');
  const lang=String(a.language||'').toLowerCase().slice(0,2);if(!CTR_LANGS.includes(lang))throw new Error('language must be one of '+CTR_LANGS.join(', '));
  if(!shCaps().length)return{error:'There are no subtitles yet: create them first with add_captions.'};
  if(!ctrWho().ok)return{error:'No AI to translate: the user must install the DedCut AI brain or choose an online AI in the assistant settings.'};
  ctrCfg.lang=lang;ctrCfg.mode=a.both?'both':'replace';ctrSave();showTab('cap');ctrTranslate();
  return{started:true,note:'The translation runs in the Subtitles tab (it can take a minute); the subtitles change when it is done.'};
};
MCP_READ.add('make_shorts');MCP_READ.add('translate_subtitles');

/* DedCut IA en mode simple : « fais des Shorts », « traduis les sous-titres en anglais » */
const SH_LNAMES=(()=>{const o=[];for(const ui of['fr','en','es','de','it','pt','ja','ko','zh']){let dn=null;try{dn=new Intl.DisplayNames([ui],{type:'language'})}catch(e){}if(dn)for(const c of CTR_LANGS){try{const n=dcNorm(dn.of(c)||'');if(n&&n!==c)o.push([n,c])}catch(e){}}}return o.sort((a,b)=>b[0].length-a[0].length)})();
const shLangIn=q=>{for(const[n,c]of SH_LNAMES)if(/[^\x00-\x7f]/.test(n)?q.n.includes(n):q.toks.some(t=>t===n||t.startsWith(n)&&t.length-n.length<=2))return c;return null}; // « ins Deutsche » : terminaison acceptée
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  const asked=dcIsQ(q,raw)&&!dcIsReq(q,raw),did=label=>{chatActs++;chatAdd('act',label)};
  const subs=dcHas(q,['sous-titre','sous titre','soustitre','subtitle','subtitulo','untertitel','sottotitol','legenda','字幕','자막']);
  if(dcHas(q,['tradui','traduction','translate','translation','traducir','traduce','ubersetz','übersetz','tradurre','traduci','traduzir','翻訳','번역','翻译'])&&(subs||appMode==='edit')){
    if(asked)return{text:T('ctr.howTo')};
    const lang=shLangIn(q);if(!lang)return{text:T('ctr.whichLang')};
    if(appMode!=='edit')setMode('edit');
    if(!shCaps().length)return{text:T('ctr.noCaps')};
    if(!ctrWho().ok)return{text:T('ctr.whoNone')};
    ctrCfg.lang=lang;ctrCfg.mode=dcHas(q,['deux langues','les deux','bilingue','both','bilingual','ambos','beide','entrambe','両方','둘 다','双语'])?'both':'replace';ctrSave();
    showTab('cap');ctrBuild();ctrTranslate();did(T('ctr.title'));
    return{text:T('ctr.started',{lang:ctrName(lang)})};
  }
  if(dcHas(q,['shorts','=short','meilleurs moments','best moments','mejores momentos','beste momente','momenti migliori','melhores momentos','ショート','쇼츠','短视频'])){
    if(asked)return{text:T('sho.howTo')};
    if(appMode!=='edit')setMode('edit');
    shortsOpen({auto:true});did(T('sho.title'));
    return{text:T('sho.aiDone')};
  }
  return b(raw,q);
}}
{const base=chatSystem;chatSystem=function(local){return base(local)+`
- make_shorts turns the best moments of a long video into vertical Shorts (offer it for long videos, after the subtitles). translate_subtitles translates the subtitles (create them first with add_captions).`}}

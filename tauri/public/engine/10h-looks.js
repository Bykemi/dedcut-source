/* ---------- Déco du chat et des alertes + ordre des scènes à la souris (v4.41) ----------
   Chaque source « Chat du live » et « Alertes » a sa déco : style prêt à l'emploi (Bulles, Néon, Bandeau…), police,
   couleurs, arrondi, bordure, lueur, apparition… Pour les alertes : sa propre image ou GIF, son propre son, ses propres textes.
   « Enregistrer ce style » le garde dans « Mes styles » (stData.looks) pour le remettre sur une autre scène.
   Scènes et sources : glisser-déposer pour changer l'ordre. */
const ST_LOOK_DEF={
  chat:{font:'Bahnschrift',bg:'#000000',bgp:55,rad:45,txt:'#ffffff',names:'user',nameCol:'#a78bfa',bar:true,bw:0,glow:false,outline:false,fit:false,anim:'fade',dir:'up',align:'left'},
  alerts:{layout:'card',font:'Bahnschrift',col:'',bg:'',bgp:92,txt:'#ffffff',rad:12,bw:2,glow:true,confetti:true,anim:'zoom',img:'',snd:'',tpl:null}
};
// styles prêts à l'emploi (seulement ce qui change par rapport au style de base)
const ST_LOOKS={
  chat:{bubble:{},clean:{bgp:0,bar:false,outline:true},neon:{font:'Audiowide',bg:'#0a0614',bgp:72,rad:30,bar:false,bw:2,glow:true,names:'src'},
    light:{bg:'#ffffff',bgp:94,txt:'#111827',names:'src',rad:30},pill:{bg:'#1e1b4b',bgp:82,rad:100,bar:false,fit:true,anim:'pop'},
    game:{font:'Russo One',bg:'#111827',bgp:85,rad:8,bw:2,names:'src',anim:'slide'},hand:{font:'Patrick Hand',bg:'#fef3c7',bgp:95,txt:'#1f2937',names:'custom',nameCol:'#b45309',rad:20,bar:false,fit:true}},
  alerts:{card:{},banner:{layout:'banner',rad:10,bw:0,confetti:false,anim:'slide'},neon:{font:'Audiowide',bg:'#05020c',bgp:85,bw:3,anim:'fade',confetti:false},
    clean:{layout:'text',bgp:0,bw:0,glow:false,anim:'bounce'},light:{bg:'#ffffff',bgp:96,txt:'#111827',bw:0,glow:false},
    game:{font:'Press Start 2P',bg:'#111827',bgp:95,rad:0,bw:4,glow:false,anim:'drop'},party:{font:'Luckiest Guy',col:'#fde047',bg:'#7c3aed',bgp:92,rad:50,bw:0,anim:'bounce'}}
};
const stLooks=()=>stData.looks||(stData.looks={chat:[],alerts:[]});
function stLook(o,kind){const d=ST_LOOK_DEF[kind],L={};for(const k in d)L[k]=o[k]==null?d[k]:o[k];return L}
function stLookFont(fam,px,wt){if(fam&&fam!=='Bahnschrift')fontReady(fam);return wt+' '+Math.round(px)+'px "'+(fam||'Bahnschrift')+'", Bahnschrift, "Segoe UI", sans-serif'}
function stRgba(hex,a){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return'rgba(0,0,0,'+a+')';const n=parseInt(m[1],16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}
const stBack=t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
function stAlTitle(a,L){const t=L.tpl&&L.tpl[a.type];return t?String(t).replace(/\{n\}/g,a.amount||''):T('st.al.'+a.type,{n:a.amount||''})}

/* images des alertes et emotes du chat : fichier du PC ou adresse internet ; GIF / WebP animés découpés en images (ImageDecoder)
   pour bouger aussi dans le live. Le type est reconnu au contenu (certains serveurs d'emotes ne le donnent pas). */
const stPics=new Map(),stUrl=p=>/^(https?:|data:|blob:)/.test(p)?p:(FS?FS.fileUrl(p):p);
function stSniff(u){if(u[0]===0x47&&u[1]===0x49&&u[2]===0x46)return'image/gif';if(u[0]===0x52&&u[1]===0x49&&u[8]===0x57&&u[9]===0x45)return'image/webp';if(u[0]===0x89&&u[1]===0x50)return'image/png';if(u[0]===0xFF&&u[1]===0xD8)return'image/jpeg';if(u[4]===0x66&&u[5]===0x74&&u[6]===0x79&&u[7]===0x70)return'image/avif';return''}
function stPic(src,t){
  if(!src)return null;let G=stPics.get(src);
  if(!G){G={frames:[],total:0,ok:false};stPics.set(src,G);
    if(stPics.size>500){const k=stPics.keys().next().value,o=stPics.get(k);stPics.delete(k);if(o)o.frames.forEach(f=>{try{f.bm.close()}catch(e){}})}
    (async()=>{try{const r=await fetch(stUrl(src));if(!r.ok)throw 0;const buf=await r.arrayBuffer(),type=stSniff(new Uint8Array(buf,0,Math.min(16,buf.byteLength)))||r.headers.get('content-type')||'image/png';
      if((type==='image/gif'||type==='image/webp')&&typeof ImageDecoder!=='undefined'){const dec=new ImageDecoder({data:buf,type});await dec.tracks.ready;
        const n=Math.min(300,dec.tracks.selectedTrack.frameCount||1);
        for(let i=0;i<n;i++){const fr=(await dec.decode({frameIndex:i})).image,d=Math.max(20,(fr.duration||100000)/1000);G.frames.push({bm:await createImageBitmap(fr),d});G.total+=d;fr.close()}dec.close()}
      else{G.frames.push({bm:await createImageBitmap(new Blob([buf],{type})),d:1e9});G.total=1e9}
      G.ok=G.frames.length>0}catch(e){G.fail=true}})()}
  if(G.ok){if(G.frames.length===1)return G.frames[0].bm;let k=((t||0)%G.total+G.total)%G.total;for(const f of G.frames){if(k<f.d)return f.bm;k-=f.d}return G.frames[0].bm}
  return null;
}
function stLookImg(path,t){const im=stPic(path,t);if(im)return im;const G=stPics.get(path);return G&&G.fail?stImg(path):null}
function stDrawContain(g,im,x,y,w,h){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;if(!iw||!ih)return;const k=Math.min(w/iw,h/ih),dw=iw*k,dh=ih*k;g.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
// icône au trait (même dessin que dans l'interface) pour le bandeau d'alerte sans image
const stIcoP={};
function stIcoDraw(g,name,cx,cy,s,col){
  const P=stIcoP[name]||(stIcoP[name]=[...String(ICO[name]||'').matchAll(/d="([^"]+)"/g)].map(m=>new Path2D(m[1])));
  g.save();g.translate(cx-s/2,cy-s/2);g.scale(s/24,s/24);g.strokeStyle=col;g.lineWidth=2;g.lineCap='round';g.lineJoin='round';P.forEach(p=>g.stroke(p));g.restore();
}
/* son personnel de l'alerte (fichier audio du PC), décodé une fois */
const stSnds={};
function stLookSnd(path){
  if(!path||!st.ac)return null;let S=stSnds[path];
  if(!S){S=stSnds[path]={buf:null};fetch(stUrl(path)).then(r=>r.arrayBuffer()).then(b=>st.ac.decodeAudioData(b)).then(b=>{S.buf=b}).catch(()=>{S.fail=true})}
  return S.buf;
}

/* ---------- panneau de réglages (source sélectionnée) ---------- */
const ST_LOOK_FIELDS={chat:Object.keys(ST_LOOK_DEF.chat),alerts:Object.keys(ST_LOOK_DEF.alerts)};
function stFontSel(cur){
  cur=cur||'Bahnschrift';loadAllFonts();
  const o=f=>`<option value="${esc(f)}" style="font-family:'${esc(f)}'" ${f===cur?'selected':''}>${esc(f)}</option>`;
  return`<div class="fld"><label>${T('deco.font')}</label><select data-o="font"><optgroup label="${T('font.system')}">${SYSFONTS.map(o).join('')}</optgroup>`+
    FONTCATS.map(c=>`<optgroup label="${T('font.cat.'+c)}">${FONTLIB.filter(x=>x[2]===c).map(x=>o(x[0])).join('')}</optgroup>`).join('')+`</select></div>`;
}
const stOpt=(k,v,list,lab)=>`<div class="fld"><label>${T(lab)}</label><select data-o="${k}">${list.map(x=>`<option value="${x}" ${x===v?'selected':''}>${T(lab+'_'+x)}</option>`).join('')}</select></div>`;
const stChk=(k,v,lab)=>`<label class="chk"><span>${T(lab)}</span><input type="checkbox" data-o="${k}" ${v?'checked':''}></label>`;
const stRng=(k,v,min,max,lab,unit)=>`<div class="fld"><label>${T(lab)} <span>${v}${unit||''}</span></label><input type="range" min="${min}" max="${max}" value="${v}" data-o="${k}" data-unit="${unit||''}"></div>`;
const stCol=(k,v,lab)=>`<div class="fld"><label>${T(lab)}</label><input type="color" data-o="${k}" value="${v}"></div>`;
function stLookHTML(it){
  const kind=it.kind,o=it.o,L=stLook(o,kind),mine=stLooks()[kind];
  const sel=`<div class="fld"><label>${T('deco.style')}</label><select data-look="${kind}"><option value="">${T('deco.custom')}</option>
    <optgroup label="DedCut">${Object.keys(ST_LOOKS[kind]).map(k=>`<option value="b:${k}" ${o.look==='b:'+k?'selected':''}>${T('deco.p.'+k)}</option>`).join('')}</optgroup>
    ${mine.length?`<optgroup label="${T('deco.mine')}">${mine.map((m,i)=>`<option value="m:${i}" ${o.look==='m:'+i?'selected':''}>${esc(m.n)}</option>`).join('')}</optgroup>`:''}</select></div>
    <div class="lkbtns"><button class="sm" data-looksave="1">${ico('save',13)}${T('deco.save')}</button>${/^m:/.test(o.look||'')?`<button class="sm" data-lookdel="1">${ico('trash',13)}${T('deco.del')}</button>`:''}</div>`;
  let h='';
  if(kind==='chat')h=stFontSel(L.font)+stCol('bg',L.bg,'deco.bg')+stRng('rad',L.rad,0,100,'deco.rad')+stRng('bw',L.bw,0,4,'deco.border')+stCol('txt',L.txt,'deco.txt')
    +stOpt('names',L.names,['user','src','custom'],'deco.names')+(L.names==='custom'?stCol('nameCol',L.nameCol,'deco.nameCol'):'')
    +stOpt('anim',L.anim,['fade','slide','pop','none'],'deco.anim')+stOpt('dir',L.dir,['up','down'],'deco.dir')+stOpt('align',L.align,['left','right'],'deco.align')
    +stChk('bar',L.bar,'deco.bar')+stChk('glow',L.glow,'deco.glow')+stChk('outline',L.outline,'deco.outline')+stChk('fit',L.fit,'deco.fit');
  else{
    const tp=L.tpl||{},types=['follow','sub','gift','raid','bits','reward','superchat','member','ytsub','tip'];
    h=stOpt('layout',L.layout,['card','banner','text'],'deco.layout')+stFontSel(L.font)
      +stChk('colType',!L.col,'deco.colType')+(L.col?stCol('col',L.col,'deco.col'):'')
      +(L.layout==='text'?'':stChk('bgType',!L.bg,'deco.bgType')+(L.bg?stCol('bg',L.bg,'deco.bg'):'')+stRng('bgp',L.bgp,0,100,'deco.bgo')+stRng('rad',L.rad,0,50,'deco.rad')+stRng('bw',L.bw,0,4,'deco.border'))
      +stCol('txt',L.txt,'deco.txt')+stOpt('anim',L.anim,['zoom','bounce','slide','drop','fade'],'deco.anim')+stChk('glow',L.glow,'deco.glow')+stChk('confetti',L.confetti,'deco.confetti')
      +`<div class="fld"><label>${T('deco.img')}</label><div class="stduo"><button class="sm" data-lookimg="1">${ico('image',13)}${T(L.img?'deco.change':'deco.imgAdd')}</button>${L.img?`<button class="sm" data-lookoff="img">${ico('trash',13)}${T('deco.remove')}</button>`:''}</div>${L.img?`<p class="hint">${esc(baseName(L.img))}</p>`:''}</div>`
      +`<div class="fld"><label>${T('deco.snd')}</label><div class="stduo"><button class="sm" data-looksnd="1">${ico('audio',13)}${T(L.snd?'deco.change':'deco.sndAdd')}</button>${L.snd?`<button class="sm" data-lookoff="snd">${ico('trash',13)}${T('deco.remove')}</button>`:''}</div><p class="hint">${L.snd?esc(baseName(L.snd)):T('deco.sndDef')}</p></div>`
      +`<details class="lktpl"><summary>${ico('text',13)}${T('deco.texts')}</summary><p class="hint">${T('deco.textsHint')}</p>${types.map(t=>`<div class="fld"><label>${esc(T('st.al.'+t,{n:'{n}'}))}</label><input type="text" maxlength="60" data-tpl="${t}" value="${esc(tp[t]||'')}" placeholder="${esc(T('st.al.'+t,{n:'{n}'}))}"></div>`).join('')}</details>`;
  }
  return`<h5>${T('deco.title')}</h5>${sel}${h}`;
}
function stLookApply(it,v){
  const kind=it.kind,d=ST_LOOK_DEF[kind];let src=null;
  if(v.startsWith('b:'))src=ST_LOOKS[kind][v.slice(2)];else if(v.startsWith('m:'))src=(stLooks()[kind][+v.slice(2)]||{}).o;
  if(!src)return;for(const k of ST_LOOK_FIELDS[kind])it.o[k]=src[k]==null?(k==='tpl'?null:d[k]):JSON.parse(JSON.stringify(src[k]));
  it.o.look=v;stSave();stSideUI();
}
$('#stSide').addEventListener('change',e=>{
  const t=e.target,it=stSel();if(!it)return;
  if(t.dataset.look){stLookApply(it,t.value);return}
  if(t.dataset.o==='names'||t.dataset.o==='layout'||t.dataset.o==='colType'||t.dataset.o==='bgType')stSideUI();
});
$('#stSide').addEventListener('input',e=>{
  const t=e.target,it=stSel();if(!it||(it.kind!=='chat'&&it.kind!=='alerts'))return;
  const k=t.dataset.o;
  if(k==='colType'){it.o.col=t.checked?'':ST_AL_COL.follow;delete it.o.colType}
  if(k==='bgType'){it.o.bg=t.checked?'':'#140f24';delete it.o.bgType}
  if(t.dataset.tpl){const tp=it.o.tpl||(it.o.tpl={});if(t.value.trim())tp[t.dataset.tpl]=t.value.slice(0,60);else delete tp[t.dataset.tpl]}
  if((k&&ST_LOOK_FIELDS[it.kind].includes(k))||t.dataset.tpl||k==='colType'||k==='bgType'){it.o.look='';const s=$('#stSide [data-look]');if(s)s.value='';const d=$('#stSide [data-lookdel]');if(d)d.remove()}
  if(t.type==='range'&&k&&t.dataset.unit!=null){const s=t.closest('.fld').querySelector('label span');if(s)s.textContent=t.value+(t.dataset.unit||'')}
  stSave();
});
$('#stSide').addEventListener('click',async e=>{
  const it=stSel();if(!it||(it.kind!=='chat'&&it.kind!=='alerts'))return;
  if(e.target.closest('[data-looksave]')){
    askText(T('deco.saveAs'),T('deco.mine')+' '+(stLooks()[it.kind].length+1)).then(n=>{if(!n||!n.trim())return;
      const o={};for(const k of ST_LOOK_FIELDS[it.kind])if(it.o[k]!=null)o[k]=JSON.parse(JSON.stringify(it.o[k]));
      const l=stLooks()[it.kind];l.push({n:n.trim().slice(0,30),o});it.o.look='m:'+(l.length-1);stSave();stSideUI();toast(T('deco.saved'))});return}
  if(e.target.closest('[data-lookdel]')){const i=+String(it.o.look||'').slice(2),l=stLooks()[it.kind];if(!l[i])return;l.splice(i,1);
    for(const s of stData.scenes)for(const x of s.items)if(x.kind===it.kind&&/^m:/.test(x.o.look||'')){const j=+x.o.look.slice(2);x.o.look=j===i?'':j>i?'m:'+(j-1):x.o.look}
    stSave();stSideUI();return}
  const off=e.target.closest('[data-lookoff]');if(off){it.o[off.dataset.lookoff]='';it.o.look='';stSave();stSideUI();return}
  const want=e.target.closest('[data-lookimg]')?'image':e.target.closest('[data-looksnd]')?'audio':'';
  if(want){if(!FS){toast(T('msg.onlyInApp'));return}
    const l=await FS.pickMedia(T(want==='image'?'deco.img':'deco.snd')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)===want);if(!f)return;
    it.o[want==='image'?'img':'snd']=f.path;it.o.look='';if(want==='audio')stLookSnd(f.path);stSave();stSideUI()}
});

/* ---------- scènes et sources : glisser à la souris pour changer l'ordre ----------
   (le glisser-déposer HTML « draggable » ne marche pas dans l'app Windows : Tauri garde le dépôt pour les fichiers de l'Explorateur.
    Marche aussi quand la liste est dans une fenêtre à part.) */
function stDndList(box,attr){
  box.addEventListener('pointerdown',e=>{
    const r=e.target.closest('['+attr+']');if(!r||e.button!==0||e.target.closest('button,input,select,textarea'))return;
    const id=+r.getAttribute(attr),x0=e.clientX,y0=e.clientY,pid=e.pointerId,doc=box.ownerDocument;let on=false,tgt=null;
    const clear=()=>box.querySelectorAll('.dragging,.dropb,.dropa').forEach(x=>x.classList.remove('dragging','dropb','dropa'));
    const mv=ev=>{
      if(!on){if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<5)return;on=true;try{r.setPointerCapture(pid)}catch(x){}r.classList.add('dragging')}
      box.querySelectorAll('.dropb,.dropa').forEach(x=>x.classList.remove('dropb','dropa'));tgt=null;
      const u=doc.elementFromPoint(ev.clientX,ev.clientY),o=u&&u.closest('['+attr+']');if(!o||!box.contains(o)||+o.getAttribute(attr)===id)return;
      const b=o.getBoundingClientRect(),after=ev.clientY>=b.top+b.height/2;o.classList.add(after?'dropa':'dropb');tgt={to:+o.getAttribute(attr),after};
    };
    const end=ok=>{
      r.removeEventListener('pointermove',mv);r.removeEventListener('pointerup',up);r.removeEventListener('pointercancel',no);clear();if(!on)return;
      // le clic qui suit le lâcher ne doit pas changer la scène ou la source choisie
      const blk=ev=>{ev.stopPropagation();ev.preventDefault()};box.addEventListener('click',blk,true);setTimeout(()=>box.removeEventListener('click',blk,true),0);
      if(!ok||!tgt)return;const {to,after}=tgt;
      if(attr==='data-sc'){stReorder(stData.scenes,id,to,after);stSave();stScenesUI()}
      else{const its=stScene().items,shown=its.slice().reverse();stReorder(shown,id,to,after);its.splice(0,its.length,...shown.reverse());stSave();stSourcesUI()}
    };
    const up=()=>end(true),no=()=>end(false);
    r.addEventListener('pointermove',mv);r.addEventListener('pointerup',up);r.addEventListener('pointercancel',no);
  });
}
// déplace l'élément « id » avant ou après « to » (dans l'ordre affiché)
function stReorder(arr,id,to,after){const i=arr.findIndex(x=>x.id===id);if(i<0)return;const[x]=arr.splice(i,1);let j=arr.findIndex(y=>y.id===to);if(j<0){arr.splice(i,0,x);return}arr.splice(j+(after?1:0),0,x)}
stDndList($('#stScenes'),'data-sc');stDndList($('#stSources'),'data-it');
// au premier passage dans le studio : DedCut ré-autorise les fichiers choisis avant (images, vidéos, image et son des alertes)
let stAllowed=false;
async function stAllowFiles(){
  if(stAllowed||!FS||!stData)return;stAllowed=true;
  const l=[];for(const s of stData.scenes)for(const it of s.items)for(const k of['path','img','snd'])if(it.o&&typeof it.o[k]==='string'&&it.o[k])l.push(it.o[k]);
  for(const m of Object.values(stData.looks||{}))for(const x of m)for(const k of['img','snd'])if(x.o&&x.o[k])l.push(x.o[k]);
  if(l.length)await FS.allowPaths([...new Set(l)]).catch(()=>{});
}

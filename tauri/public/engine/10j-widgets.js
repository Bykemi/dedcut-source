/* ---------- Widgets du live (v4.42) ----------
   - Barre d'objectif : abonnés, follows, bits ou dons, qui monte toute seule avec les alertes (ou à la main) ;
   - Bandeau des derniers événements : dernier follow, abonné, raid, bits, don ;
   - Compteur (morts, victoires…) avec Ctrl+Alt+Page haut / Page bas, même pendant un jeu ;
   - Soundboard : 9 sons (bruitages DedCut ou fichiers du PC) envoyés dans le live, touches Ctrl+Alt+F1…F9 ;
   - Webcams : recadrage (gauche, droite, haut, bas), luminosité, contraste et couleurs, pour chaque webcam. */
ICO.check='<path d="M5 12.5l4.5 4.5L19 7.5"/>';
ICO.crop='<path d="M6 2.5V18h15.5"/><path d="M2.5 6H18v15.5"/>';
ICO.coin='<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.6-.8-1.5-1.3-2.6-1.3-1.6 0-2.7.8-2.7 2s1 1.7 2.8 2.1c1.8.4 2.9 1 2.9 2.2s-1.2 2.1-2.9 2.1c-1.2 0-2.3-.5-2.9-1.4M12 6.4v1.6M12 16.1v1.5"/>';
const WG_TYPES={sub:'star',follow:'heart',bits:'gem',tips:'coin',custom:'flag'};
const wgNum=v=>{const n=Number(v)||0;return n%1?n.toFixed(2):String(n)};
const wgAmt=a=>{const n=parseFloat(String(a==null?'':a).replace(/\s/g,'').replace(',','.').replace(/[^0-9.]/g,''));return isFinite(n)?n:0};
let wgTesting=false;
{const t=stAlertTest;stAlertTest=function(){wgTesting=true;try{t()}finally{wgTesting=false}}}
function wgItems(kind){const l=[];for(const s of stData.scenes)for(const it of s.items)if(it.kind===kind)l.push(it);return l}

/* ---------- alertes : objectifs et derniers événements ---------- */
function stWgAlert(a){
  if(wgTesting||a.type==='pin'||!stData)return;
  // derniers événements (bandeau)
  const R=stData.recent||(stData.recent={}),key={follow:'follow',ytsub:'follow',sub:'sub',member:'sub',gift:'sub',raid:'raid',bits:'bits',superchat:'tip',tip:'tip'}[a.type];
  if(key){R[key]={n:a.name,a:key==='raid'||key==='bits'||key==='tip'?String(a.amount||''):'',t:Date.now()};}
  // objectifs
  for(const it of wgItems('goal')){const o=it.o;let add=0;
    if(o.type==='follow'&&(a.type==='follow'||a.type==='ytsub'))add=1;
    else if(o.type==='sub'&&(a.type==='sub'||a.type==='member'))add=1;
    else if(o.type==='sub'&&a.type==='gift')add=Math.max(1,parseInt(a.amount)||1);
    else if(o.type==='bits'&&a.type==='bits')add=wgAmt(a.amount);
    else if(o.type==='tips'&&(a.type==='tip'||a.type==='superchat'))add=wgAmt(a.amount);
    if(add>0){o.cur=Math.round(((+o.cur||0)+add)*100)/100;if(o.cur>=(+o.target||1)&&!o.doneT)o.doneT=Date.now()}}
  stSave();if(stSide==='props')stSideUI();
}
{const c=stCxAlert;stCxAlert=function(a){try{c(a)}catch(e){}stWgAlert(a)}}

/* ---------- (5) barre d'objectif ---------- */
ST_KINDS.goal='flag';
ST_NEW.goal={o:()=>({type:'sub',label:T('wg.goal.def_sub'),target:50,cur:0,color:'#22c55e'}),r:()=>({x:.3,y:.08,w:.4,h:.07})};
ST_DRAW.goal=(g,it,x,y,w,h,t)=>{
  const o=it.o,tg=Math.max(.01,+o.target||1),cur=Math.max(0,+o.cur||0),p=Math.min(1,cur/tg),col=o.color||'#22c55e',r=h/2,done=cur>=tg;
  o._a=o._a==null?p:o._a+(p-o._a)*.08;
  g.save();g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle='rgba(10,10,18,.74)';g.fill();g.save();g.clip();
  if(o._a>.002){const fw=Math.max(h,w*o._a),gr=g.createLinearGradient(x,0,x+fw,0);gr.addColorStop(0,stRgba(col,.6));gr.addColorStop(1,col);
    g.fillStyle=gr;g.beginPath();g.roundRect(x,y,fw,h,r);g.fill();
    const sx=x+((t*.32)%1.5-.25)*fw,sh=g.createLinearGradient(sx-h,0,sx+h,0);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.5,'rgba(255,255,255,.22)');sh.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=sh;g.fillRect(x,y,fw,h)}
  g.restore();
  g.lineWidth=Math.max(1,h*.045);g.strokeStyle=done?col:'rgba(255,255,255,.18)';if(done){g.shadowColor=col;g.shadowBlur=h*(.35+.25*Math.sin(t*4))}
  g.beginPath();g.roundRect(x,y,w,h,r);g.stroke();g.shadowBlur=0;
  g.textBaseline='middle';g.font=stFont(h*.44,700);g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.6)';g.shadowBlur=h*.12;
  const val=wgNum(cur)+' / '+wgNum(tg);g.textAlign='right';g.fillText(val,x+w-h*.45,y+h/2);const vw=g.measureText(val).width;
  stIcoDraw(g,WG_TYPES[o.type]||'flag',x+h*.55,y+h/2,h*.5,'#fff');
  g.textAlign='left';g.save();g.beginPath();g.rect(x,y,w-vw-h*.9,h);g.clip();g.fillText(String(o.label||''),x+h*.95,y+h/2);g.restore();
  g.restore();
};
ST_PROPS.goal=it=>{const o=it.o;return`<div class="fld"><label>${T('wg.goal.type')}</label><select data-o="type">${Object.keys(WG_TYPES).map(k=>`<option value="${k}" ${o.type===k?'selected':''}>${T('wg.goal.t_'+k)}</option>`).join('')}</select></div>
  <div class="fld"><label>${T('st.text')}</label><input type="text" data-o="label" value="${esc(o.label||'')}" maxlength="60"></div>
  <div class="two"><div class="fld"><label>${T('wg.goal.cur')}</label><input type="number" data-o="cur" value="${o.cur||0}" min="0" step="any"></div><div class="fld"><label>${T('wg.goal.target')}</label><input type="number" data-o="target" value="${o.target||50}" min="1" step="any"></div></div>
  <div class="copt wgpm"><button data-wgact="dec">${ico('minus',13)}1</button><button data-wgact="inc">${ico('plus',13)}1</button><button data-wgact="zero">${T('wg.reset')}</button></div>
  <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#22c55e')}"></div>
  <p class="hint">${T(o.type==='custom'?'wg.goal.hintManual':'wg.goal.hint')}</p>`};

/* ---------- (6) bandeau des derniers événements ---------- */
ST_KINDS.ticker='ticker';
const WG_TK={follow:'heart',sub:'star',raid:'flag',bits:'gem',tip:'coin'};
ST_NEW.ticker={o:()=>({show:{follow:true,sub:true,raid:true,bits:false,tip:true},color:'#8b5cf6',speed:60}),r:()=>({x:0,y:0,w:1,h:.055})};
ST_DRAW.ticker=(g,it,x,y,w,h,t)=>{
  const o=it.o,R=(stData&&stData.recent)||{},sh=o.show||{},col=o.color||'#8b5cf6';
  const segs=Object.keys(WG_TK).filter(k=>sh[k]!==false&&R[k]).map(k=>({k,lab:T('wg.tk.'+k),n:R[k].n+(R[k].a?' ('+R[k].a+')':'')}));
  if(!segs.length&&!O.live&&!O.rec){stHolder(g,x,y,w,h,T('st.k.ticker'));return}
  g.save();g.fillStyle='rgba(10,10,18,.8)';g.fillRect(x,y,w,h);g.fillStyle=col;g.fillRect(x,y+h-Math.max(2,h*.06),w,Math.max(2,h*.06));
  g.beginPath();g.rect(x,y,w,h);g.clip();g.textBaseline='middle';g.textAlign='left';
  const fs=h*.42,ic=h*.46,gap=h*1.1,cy=y+h*.48;
  if(!segs.length){g.font=stFont(fs,600);g.fillStyle='rgba(255,255,255,.6)';g.textAlign='center';g.fillText(T('wg.tk.none'),x+w/2,cy);g.restore();return}
  const meas=segs.map(s=>{g.font=stFont(fs,600);const a=g.measureText(s.lab+' ').width;g.font=stFont(fs,800);return ic*1.35+a+g.measureText(s.n).width});
  const total=meas.reduce((a,b)=>a+b,0)+gap*segs.length;
  const draw=x0=>{let cx=x0;segs.forEach((s,i)=>{stIcoDraw(g,WG_TK[s.k],cx+ic/2,cy,ic,col);cx+=ic*1.35;g.font=stFont(fs,600);g.fillStyle=stRgba('#ffffff',.72);g.fillText(s.lab+' ',cx,cy);cx+=g.measureText(s.lab+' ').width;
    g.font=stFont(fs,800);g.fillStyle='#fff';g.fillText(s.n,cx,cy);cx+=g.measureText(s.n).width+gap})};
  if(total-gap<=w-h){draw(x+(w-(total-gap))/2)}
  else{const off=(t*(+o.speed||60)*h/40)%total;draw(x+h*.5-off);draw(x+h*.5-off+total)}
  g.restore();
};
ST_PROPS.ticker=it=>{const o=it.o,sh=o.show||{};return`<h5>${T('wg.tk.what')}</h5>${Object.keys(WG_TK).map(k=>`<label class="chk"><span>${T('wg.tk.'+k)}</span><input type="checkbox" data-wgshow="${k}" ${sh[k]!==false?'checked':''}></label>`).join('')}
  <div class="fld"><label>${T('wg.tk.speed')} <span>${o.speed||60}</span></label><input type="range" min="20" max="160" value="${o.speed||60}" data-o="speed"></div>
  <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#8b5cf6')}"></div>
  <button class="sm" data-wgact="tkclear">${ico('trash',13)}${T('wg.tk.clear')}</button><p class="hint">${T('wg.tk.hint')}</p>`};

/* ---------- (7) compteur ---------- */
ST_KINDS.counter='counter';
ST_NEW.counter={o:()=>({label:T('wg.ct.def'),val:0,step:1,color:'#ffffff'}),r:()=>({x:.03,y:.83,w:.18,h:.09})};
ST_DRAW.counter=(g,it,x,y,w,h)=>{
  const o=it.o,now=performance.now(),k=o._t?Math.min(1,(now-o._t)/350):1,pop=1+.25*Math.sin(Math.PI*k)*(1-k*.3);
  g.save();g.beginPath();g.roundRect(x,y,w,h,h*.3);g.fillStyle='rgba(10,10,18,.72)';g.fill();g.lineWidth=Math.max(1,h*.04);g.strokeStyle=stRgba(o.color||'#ffffff',.3);g.stroke();
  g.textBaseline='middle';const val=wgNum(o.val||0);g.font=stFont(h*.6,800);const vw=g.measureText(val).width,lab=String(o.label||'');
  g.textAlign='right';g.save();g.translate(x+w-h*.32-vw/2,y+h/2);g.scale(pop,pop);g.fillStyle=o.color||'#fff';g.textAlign='center';g.fillText(val,0,h*.02);g.restore();
  g.textAlign='left';g.font=stFont(h*.36,600);g.fillStyle='rgba(255,255,255,.8)';g.save();g.beginPath();g.rect(x,y,w-vw-h*.6,h);g.clip();g.fillText(lab,x+h*.32,y+h/2);g.restore();
  g.restore();
};
ST_PROPS.counter=it=>{const o=it.o;return`<div class="fld"><label>${T('st.text')}</label><input type="text" data-o="label" value="${esc(o.label||'')}" maxlength="40"></div>
  <div class="two"><div class="fld"><label>${T('wg.ct.val')}</label><input type="number" data-o="val" value="${o.val||0}" step="any"></div><div class="fld"><label>${T('wg.ct.step')}</label><input type="number" data-o="step" value="${o.step||1}" min="1" step="any"></div></div>
  <div class="copt wgpm"><button data-wgact="dec">${ico('minus',13)}</button><button data-wgact="inc">${ico('plus',13)}</button><button data-wgact="zero">${T('wg.reset')}</button></div>
  <div class="fld"><label>${T('st.color')}</label><input type="color" data-o="color" value="${esc(o.color||'#ffffff')}"></div>
  <p class="hint">${T('wg.ct.keys')}</p>`};
function wgCount(d,it){
  it=it||(()=>{const s=stSel();if(s&&s.kind==='counter')return s;return stScene().items.find(i=>i.kind==='counter'&&i.vis)||wgItems('counter')[0]})();
  if(!it)return;const st2=+it.o.step||1;it.o.val=d===0?0:Math.round(((+it.o.val||0)+d*st2)*100)/100;it.o._t=performance.now();stSave();
  if(stSel()===it&&stSide==='props'){const i=$('#stSide [data-o=val]');if(i)i.value=it.o.val}
}

/* ---------- (8) soundboard ---------- */
const SB_DEF=()=>({live:true,me:true,keys:true,pads:['applau','rire','badum','roulement','boing','erreur','bonus','suspense','tonnerre'].filter(k=>typeof SOUNDS==='object'&&SOUNDS[k]).map(k=>({n:'',s:'k:'+k,vol:80}))});
function stSb(){if(!stData.sb)stData.sb=SB_DEF();return stData.sb}
const sbName=p=>p.n||(p.s.startsWith('k:')&&SOUNDS[p.s.slice(2)]?T(SOUNDS[p.s.slice(2)].name):p.s.startsWith('f:')?p.s.slice(2).split(/[\\/]/).pop().replace(/\.[^.]+$/,''):'?');
const sbBufs=new Map();
async function sbBuf(s){
  if(sbBufs.has(s))return sbBufs.get(s);let b=null;
  try{if(s.startsWith('k:')){const S=SOUNDS[s.slice(2)];if(S&&S.fn){const n=Math.ceil(S.dur*48000);b=st.ac.createBuffer(1,n,48000);const d=b.getChannelData(0);for(let i=0;i<n;i++){const v=S.fn(i/48000);d[i]=v>1?1:v<-1?-1:v||0}}}
    else if(s.startsWith('f:')){const r=await fetch(stUrl(s.slice(2)));b=await st.ac.decodeAudioData(await r.arrayBuffer())}}catch(e){b=null}
  if(b)sbBufs.set(s,b);return b;
}
async function sbPlay(i){
  const S=stSb(),p=S.pads[i];if(!p)return;if(!st.ac)await stAudio();if(st.ac.state==='suspended')st.ac.resume().catch(()=>{});
  const buf=await sbBuf(p.s);if(!buf){toast(T('wg.sb.fail'));return}
  const s=st.ac.createBufferSource(),g=st.ac.createGain();s.buffer=buf;g.gain.value=(+p.vol||0)/100;s.connect(g);
  if(S.live!==false)g.connect(st.bus);if(S.me!==false){const m=st.ac.createGain();m.gain.value=.85;g.connect(m);m.connect(st.ac.destination)}
  s.start();const b=$('#stSide [data-sbplay="'+i+'"]');if(b){b.classList.add('on');setTimeout(()=>b.classList.remove('on'),Math.min(1500,buf.duration*1000))}
}
let sbEdit=false;
function wgSbHTML(){
  const S=stSb(),opts=Object.keys(SOUNDS).map(k=>[k,T(SOUNDS[k].name)]).sort((a,b)=>a[1].localeCompare(b[1]));
  const grid=`<div class="sbgrid">${S.pads.map((p,i)=>`<button data-sbplay="${i}" title="${S.keys?'Ctrl+Alt+F'+(i+1):''}"><b>${esc(sbName(p))}</b>${S.keys?`<i>F${i+1}</i>`:''}</button>`).join('')}</div>`;
  const edit=sbEdit?S.pads.map((p,i)=>`<div class="sbrow"><div class="cxcmd"><input type="text" data-sbn="${i}" value="${esc(p.n||'')}" placeholder="${esc(sbName(p))}" maxlength="24"><select data-sbs="${i}">${p.s.startsWith('f:')?`<option value="${esc(p.s)}" selected>${esc(sbName(p))}</option>`:''}${opts.map(([k,n])=>`<option value="k:${k}" ${p.s==='k:'+k?'selected':''}>${esc(n)}</option>`).join('')}<option value="file">${esc(T('wg.sb.file'))}</option></select><button class="sm" data-wgact="sbdel" data-i="${i}">${ico('trash',13)}</button></div>
    <div class="fld"><label>${T('cx.tts.vol')} <span>${p.vol}</span></label><input type="range" min="0" max="100" value="${p.vol}" data-sbv="${i}"></div></div>`).join('')+(S.pads.length<9?`<button class="sm" data-wgact="sbadd">${ico('plus',13)}${T('wg.sb.add')}</button>`:''):'';
  return(S.pads.length?grid:`<p class="hint">${T('wg.sb.empty')}</p>`)
    +`<button class="sm" data-wgact="sbedit">${ico(sbEdit?'check':'gear',13)}${T(sbEdit?'wg.sb.done':'wg.sb.edit')}</button>${edit}`
    +`<label class="chk"><span>${T('wg.sb.keys')}</span><input type="checkbox" data-sbset="keys" ${S.keys?'checked':''}></label>`
    +`<label class="chk"><span>${T('cx.tts.live')}</span><input type="checkbox" data-sbset="live" ${S.live!==false?'checked':''}></label>`
    +`<label class="chk"><span>${T('cx.tts.me')}</span><input type="checkbox" data-sbset="me" ${S.me!==false?'checked':''}></label>`;
}
// ajoute la section au panneau « Outils » (10i)
{const tp=stToolsPanel;stToolsPanel=function(){const h=tp();if(cxOpen.sb==null)cxOpen.sb=false;
  return h+`<details class="cxsec" data-cxsec="sb"${cxOpen.sb?' open':''}><summary>${ico('pad',15)}<b>${T('wg.sb.title')}</b></summary>${wgSbHTML()}</details>`}}

/* ---------- raccourcis globaux du studio : compteur et soundboard ---------- */
const WG_KEYS={'CommandOrControl+Alt+PageUp':()=>wgCount(1),'CommandOrControl+Alt+PageDown':()=>wgCount(-1)};
for(let i=1;i<=9;i++)WG_KEYS['CommandOrControl+Alt+F'+i]=()=>sbPlay(i-1);
const wgOn=new Set();
function wgKeysSync(){
  const K=window.dedcutKeys;if(!K||!stData)return;
  const studio=typeof appMode!=='undefined'&&stOn(),S=stSb(),cnt=wgItems('counter').length>0;
  for(const[a,f]of Object.entries(WG_KEYS)){
    const want=studio&&(/Page/.test(a)?cnt:S.keys&&+a.slice(-1)<=S.pads.length);
    if(want&&!wgOn.has(a)){wgOn.add(a);K.on(a,f).catch(()=>wgOn.delete(a))}
    else if(!want&&wgOn.has(a)){wgOn.delete(a);K.off(a).catch(()=>{})}
  }
}
setInterval(wgKeysSync,1500);

/* ---------- (20) webcams : recadrage et couleurs ---------- */
const wgCrop={};
function stCamCrop(it,im){return im} // remplacé par le recadrage commun (stCropR, 10b)
function stCamCropOld(it,im){
  const o=it.o,l=+o.cl||0,r=+o.cr||0,tp=+o.ct||0,b=+o.cb||0;if(!(l||r||tp||b))return im;
  const iw=im.displayWidth||im.videoWidth||im.naturalWidth||im.width||1,ih=im.displayHeight||im.videoHeight||im.naturalHeight||im.height||1;
  const sx=iw*l/100,sy=ih*tp/100,sw=Math.max(8,iw*(100-l-r)/100),sh=Math.max(8,ih*(100-tp-b)/100);
  const C=wgCrop[it.id]||(wgCrop[it.id]=document.createElement('canvas')),W=Math.round(sw),H=Math.round(sh);
  if(C.width!==W||C.height!==H){C.width=W;C.height=H}C.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,W,H);
  C.naturalWidth=W;C.naturalHeight=H;return C;
}
function stCamFilt(o){return''} // couleurs communes (stDrawIt, 10b)
function stCamFiltOld(o){const b=o.cbr==null?100:+o.cbr,c=o.cco==null?100:+o.cco,s=o.csa==null?100:+o.csa;return b===100&&c===100&&s===100?'':`brightness(${b}%) contrast(${c}%) saturate(${s}%)`}
function stCamExtra(it){
  const o=it.o,R=(k,l,mn,mx,d)=>`<div class="fld"><label>${T(l)} <span>${o[k]==null?d:o[k]} %</span></label><input type="range" min="${mn}" max="${mx}" value="${o[k]==null?d:o[k]}" data-o="${k}" data-wgr="1"></div>`;
  return`<details class="cxsec wgcam"><summary>${ico('crop',14)}<b>${T('wg.cam.title')}</b></summary>
    <div class="two">${R('cl','wg.cam.l',0,45,0)}${R('cr','wg.cam.r',0,45,0)}</div><div class="two">${R('ct','wg.cam.t',0,45,0)}${R('cb','wg.cam.b',0,45,0)}</div>
    ${R('cbr','wg.cam.bri',40,170,100)}${R('cco','wg.cam.con',40,170,100)}${R('csa','wg.cam.sat',0,200,100)}
    <button class="sm" data-wgact="camreset">${T('wg.reset')}</button><p class="hint">${T('wg.cam.hint')}</p></details>`;
}

/* ---------- réglages ---------- */
$('#stSide').addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.wgr){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value+' %';return}
  if(t.dataset.sbn!=null){stSb().pads[+t.dataset.sbn].n=t.value.trim();stSave();return}
  if(t.dataset.sbv!=null){stSb().pads[+t.dataset.sbv].vol=+t.value;const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value;stSave();return}
  if(t.dataset.sbset){stSb()[t.dataset.sbset]=t.checked;stSave();wgKeysSync();return}
  if(t.dataset.wgshow){const it=stSel();if(it){(it.o.show||(it.o.show={}))[t.dataset.wgshow]=t.checked;stSave()}}
});
$('#stSide').addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.sbs!=null){const i=+t.dataset.sbs,S=stSb();
    if(t.value==='file'){const F=window.dedcutFS;if(!F){toast(T('msg.onlyInApp'));cxRedraw();return}
      const l=await F.pickMedia(T('wg.sb.file')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)==='audio');if(f)S.pads[i].s='f:'+f.path}
    else S.pads[i].s=t.value;
    stSave();cxRedraw();return}
  if(t.dataset.o==='type'){const it=stSel();if(it&&it.kind==='goal'){const def=Object.keys(WG_TYPES).map(k=>T('wg.goal.def_'+k));if(!it.o.label||def.includes(it.o.label))it.o.label=T('wg.goal.def_'+t.value);stSave();stSideUI()}}
});
$('#stSide').addEventListener('click',e=>{
  const p=e.target.closest('[data-sbplay]');if(p){sbPlay(+p.dataset.sbplay);return}
  const b=e.target.closest('[data-wgact]');if(!b)return;const a=b.dataset.wgact,it=stSel(),S=stSb();
  if(a==='inc'||a==='dec'||a==='zero'){if(!it)return;const d=a==='inc'?1:a==='dec'?-1:0;
    if(it.kind==='counter')wgCount(d,it);else if(it.kind==='goal'){it.o.cur=d===0?0:Math.max(0,(+it.o.cur||0)+d);if(it.o.cur<(+it.o.target||1))delete it.o.doneT;stSave()}
    const i=$('#stSide [data-o='+(it.kind==='goal'?'cur':'val')+']');if(i)i.value=it.kind==='goal'?it.o.cur:it.o.val;return}
  if(a==='tkclear'){stData.recent={};stSave();return}
  if(a==='camreset'){if(!it)return;for(const k of['cl','cr','ct','cb','cbr','cco','csa'])delete it.o[k];stSave();stSideUI();return}
  if(a==='sbedit'){sbEdit=!sbEdit;cxRedraw();return}
  if(a==='sbadd'){S.pads.push({n:'',s:'k:'+Object.keys(SOUNDS)[0],vol:80});stSave();cxRedraw();return}
  if(a==='sbdel'){S.pads.splice(+b.dataset.i,1);stSave();cxRedraw();wgKeysSync();return}
});

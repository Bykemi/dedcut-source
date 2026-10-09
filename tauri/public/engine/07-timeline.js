/* ---------- manipulation directe dans l'aperçu ---------- */
const posKeys=c=>isVid(c)?(c.gen?null:['p.tf.x','p.tf.y']):isOvr(c)&&c.gen!=='hud'?['p.x','p.y']:null;
const sizeKey=c=>isVid(c)?(c.gen?null:'p.tf.zoom'):isOvr(c)?(isText(c)?'p.size':c.mid?'p.scale':c.gen==='shape'||c.gen==='pbar'||c.gen==='blurz'||c.gen==='chart'||c.gen==='viz'?'p.w':WSIZE.has(c.gen)?'p.size':null):null;
function cvPt(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height,s:W/r.width}}
function local(b,x,y){const cx=b.x+b.w/2,cy=b.y+b.h/2,a=-(b.rot||0)*Math.PI/180,dx=x-cx,dy=y-cy;return{x:dx*Math.cos(a)-dy*Math.sin(a),y:dx*Math.sin(a)+dy*Math.cos(a)}}
function onCorner(c,P){const b=c&&boxes.get(c.id);if(!b||!sizeKey(c))return false;const l=local(b,P.x,P.y);return Math.hypot(Math.abs(l.x)-b.w/2,Math.abs(l.y)-b.h/2)<12*P.s}
function inBox(b,P){const l=local(b,P.x,P.y);return Math.abs(l.x)<=b.w/2&&Math.abs(l.y)<=b.h/2}
let cdrag=null,wheelT;
cv.addEventListener('pointerdown',e=>{
  if(exporting||e.button!==0)return;
  const P=cvPt(e),cur=selClip();let hit=null,mode='move';
  if(cur&&onCorner(cur,P)){hit=cur;mode='scale'}
  if(!hit){
    const order=layerClips().filter(c=>boxes.has(c.id)).reverse();
    hit=order.find(c=>inBox(boxes.get(c.id),P))||null;
  }
  if(!hit){if(sel){sel=null;refresh()}return}
  if(hit.id!==sel){sel=hit.id;refresh()}
  if(trk(hit).lock)return;
  const b=boxes.get(hit.id),pk=posKeys(hit),sk=sizeKey(hit);
  cdrag={c:hit,mode,P,moved:false,pk,sk,v0:pk?pk.map(k=>valOf(hit,k)):null,s0:sk?valOf(hit,sk):0,h0:hit.gen==='shape'||hit.gen==='blurz'||hit.gen==='chart'?valOf(hit,'p.h'):0,cx:b.x+b.w/2,cy:b.y+b.h/2};
  cdrag.d0=Math.hypot(P.x-cdrag.cx,P.y-cdrag.cy)||1;
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove',e=>{
  const P=cvPt(e);
  if(!cdrag){const c=selClip();cv.style.cursor=c&&onCorner(c,P)?'nwse-resize':c&&boxes.get(c.id)&&inBox(boxes.get(c.id),P)&&posKeys(c)?'move':'default';return}
  const{c}=cdrag;cdrag.moved=true;
  if(cdrag.mode==='scale'){if(cdrag.sk){const r=Math.hypot(P.x-cdrag.cx,P.y-cdrag.cy)/cdrag.d0;setVal(c,cdrag.sk,Math.max(1,Math.round(cdrag.s0*r*10)/10));if(c.gen==='shape'||c.gen==='blurz'||c.gen==='chart')setVal(c,'p.h',Math.max(1,Math.round(cdrag.h0*r*10)/10))}}
  else if(cdrag.pk){
    const ctr=isVid(c)?0:50,snap=v=>Math.abs(v-ctr)<1.2?ctr:Math.round(v*10)/10;
    setVal(c,cdrag.pk[0],snap(cdrag.v0[0]+(P.x-cdrag.P.x)/W*100));
    setVal(c,cdrag.pk[1],snap(cdrag.v0[1]+(P.y-cdrag.P.y)/H*100));
  }
  syncInputs();
});
cv.addEventListener('pointerup',()=>{if(cdrag&&cdrag.moved){commit();syncInputs()}cdrag=null});
cv.addEventListener('wheel',e=>{
  const c=selClip(),k=c&&sizeKey(c);if(!k||trk(c).lock)return;e.preventDefault();
  const f=e.deltaY<0?1.06:1/1.06;setVal(c,k,Math.max(1,Math.round(valOf(c,k)*f*10)/10));if(c.gen==='shape')setVal(c,'p.h',Math.max(1,Math.round(valOf(c,'p.h')*f*10)/10));syncInputs();
  clearTimeout(wheelT);wheelT=setTimeout(commit,400);
},{passive:false});
cv.addEventListener('dblclick',()=>{const c=selClip();if(isText(c)){insTab.text='texte';renderInspector();const ta=$('#insp textarea');if(ta){ta.focus();ta.select()}}});

/* ---------- timeline ---------- */
/* ---------- pistes (nombre libre) : vidéo / calques / audio ----------
   L'ordre des lignes est libre (glisser l'en-tête d'une piste) ; il est gardé dans tracks[i].pos.
   Plus une piste (vidéo ou calques) est haute, plus elle est DEVANT dans l'image. */
function rowOrder(){normPos(tracks);return tracks.map((t,i)=>i).sort((a,b)=>tracks[a].pos-tracks[b].pos)}
/* pistes visibles dans l'image, de l'arrière vers l'avant */
function visualOrder(){return rowOrder().filter(i=>tracks[i].kind!=='audio').reverse()}
function setOrder(o){o.forEach((i,r)=>{tracks[i].pos=r})}
function moveTrackRow(i,to){
  const o=rowOrder().filter(x=>x!==i);o.splice(clamp(to,0,o.length),0,i);setOrder(o);
  commit();refresh();toast(T('tl.trackMoved'));
}
function moveTrackStep(i,dir){const r=rowOrder().indexOf(i);if(r+dir<0||r+dir>=tracks.length)return;moveTrackRow(i,r+dir)}
const rowH=i=>tracks[i].kind==='video'?62:tracks[i].kind==='audio'?58:50;
function rowGeom(){let y=24;const order=rowOrder(),geom={};for(const i of order){geom[i]={top:y,h:rowH(i)};y+=rowH(i)}return{order,geom,total:y}}
function trackAtY(y){const g=rowGeom();for(const i of g.order)if(y>=g.geom[i].top&&y<g.geom[i].top+g.geom[i].h)return i;return null}
const KN={video:'common.video',over:'tl.overlays',audio:'common.audio'};
function trackName(i){
  const t=tracks[i];if(t.name)return t.name;
  const same=tracks.map((x,j)=>x.kind===t.kind?j:-1).filter(j=>j>=0),base=T(KN[t.kind]);
  return same.length>1?base+' '+(same.indexOf(i)+1):base;
}
function insertTrack(kind){
  // nouvelle piste : au-dessus des pistes du même type (en dessous pour l'audio)
  const o=rowOrder();tracks.push(newTrack(kind));const ni=tracks.length-1;
  const kinds=o.map(i=>tracks[i].kind),at=kind==='audio'?(kinds.lastIndexOf('audio')+1||o.length):Math.max(0,kinds.indexOf(kind));
  o.splice(at,0,ni);setOrder(o);return ni;
}
function addTrack(kind){const ni=insertTrack(kind);activeTk[kind]=ni;commit();refresh();toast(T('tl.trackAdded'))}
function placeFree(c){
  const busy=i=>clips.some(x=>x!==c&&x.track===i&&x.start<c.start+c.dur-1e-3&&x.start+x.dur>c.start+1e-3),k=trk(c).kind;
  if(!busy(c.track))return c;
  const free=rowOrder().find(i=>tracks[i].kind===k&&!tracks[i].lock&&!busy(i));
  if(free!=null)c.track=free;else{c.track=insertTrack(k);toast('tl.autoTrack')}
  return c;
}
function deleteTrack(i){
  if(tracks.filter(t=>t.kind===tracks[i].kind).length<=1){toast(T('tl.trackLastOfKind'));return}
  if(clips.some(c=>c.track===i)){toast(T('tl.trackNotEmpty'));return}
  tracks.splice(i,1);clips.forEach(c=>{if(c.track>i)c.track--});
  for(const k in activeTk)if(activeTk[k]>i)activeTk[k]--;
  commit();refresh();toast(T('tl.trackDeleted'));
}
function moveTrackBy(c,dir){
  if(!c||trk(c).lock)return;
  const o=rowOrder(),k=trk(c).kind;let j=o.indexOf(c.track)+dir;
  while(j>=0&&j<o.length&&tracks[o[j]].kind!==k)j+=dir;
  if(j<0||j>=o.length||tracks[o[j]].lock)return;
  c.track=o[j];activeTk[k]=c.track;commit();refresh();
}
function clipName(c){
  if(c.gen)return GN[c.gen]?T(GN[c.gen]):c.gen;
  if(isText(c))return String(c.p.text||'').split('\n')[0]||T('common.text');
  const m=mById(c.mid);return m?m.name:'?';
}
/* clips qui se chevauchent sur une même piste : chacun sa « voie » (moitié de hauteur…) pour qu'aucun ne soit caché */
function laneMap(rc){
  const map=new Map(),a=rc.slice().sort((x,y)=>x.start-y.start||x.id-y.id);let grp=[],end=-1;
  const close=()=>{const le=[];for(const c of grp){let i=le.findIndex(e=>e<=c.start+1e-3);if(i<0){i=le.length;le.push(0)}le[i]=c.start+c.dur;map.set(c.id,{i,n:0})}for(const c of grp)map.get(c.id).n=le.length;grp=[]};
  for(const c of a){if(grp.length&&c.start>=end-1e-3){close();end=-1}grp.push(c);end=Math.max(end,c.start+c.dur)}
  if(grp.length)close();return map;
}
function overlapZones(rc){
  const a=rc.slice().sort((x,y)=>x.start-y.start),z=[];
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const s0=a[j].start,e0=Math.min(a[i].start+a[i].dur,a[j].start+a[j].dur);if(s0<e0-1e-3)z.push([s0,e0])}
  return z.map(([x,y])=>`<div class="ovz" style="left:${x*pxs}px;width:${Math.max(2,(y-x)*pxs)}px"></div>`).join('');
}
const overlapsOther=c=>clips.some(x=>x!==c&&x.track===c.track&&x.start<c.start+c.dur-1e-3&&x.start+x.dur>c.start+1e-3);
function clipHTML(c,ln){
  const m=c.mid&&mById(c.mid),p=c.p,r=p.rate||1,lk=trk(c).lock;
  const kind=c.gen?'g':isText(c)?'t':isAud(c)||(m&&m.type==='audio')?'a':isOvr(c)?'o':'v';
  let lane='';if(ln&&ln.n>1){const hh=(rowH(c.track)-6)/ln.n;lane=`;top:${3+ln.i*hh}px;height:${hh-2}px;bottom:auto`}
  let h=`<div class="clip ${kind}${c.id===sel?' sel':msel.has(c.id)?' sel msel':''}${lk?' lock':''}${m&&m.missing?' miss':''}${ln&&ln.n>1?' lane':''}" data-id="${c.id}" style="left:${c.start*pxs}px;width:${Math.max(6,c.dur*pxs)}px${lane}">`;
  if(c.grp)h+='<i class="grpb"></i>'+(window.syncBadge?syncBadge(c):'');
  if(c.lc)h+=`<i class="lct" style="background:${c.lc}"></i><i class="lcb" style="background:${c.lc}"></i>`;
  if(m&&m.type!=='audio')h+=`<div class="strip m${m.id}"></div>`;
  if(m&&m.type!=='image'&&m.pk)h+=`<div class="wv"><canvas class="wvc" data-id="${c.id}"></canvas></div>`;
  const tags=[];
  if(Math.abs(r-1)>.005)tags.push((Math.round(r*100)/100)+'x');
  if(p.rev)tags.push('◀◀');
  if(p.fx&&FX.some(k=>p.fx[k]))tags.push('✦');
  if(p.voice&&p.voice.on)tags.push('voix');
  if(m&&m.type!=='image'&&(p.vol??100)===0)tags.push('muet');
  h+=`<div class="lbl">${isText(c)?'<i>T</i>':''}${tags.map(t=>`<i>${t}</i>`).join('')}<span style="overflow:hidden;text-overflow:ellipsis">${esc(clipName(c))}</span></div>`;
  if(p.tin&&p.tin!=='none')h+='<div class="ti">⇥</div>';
  if(p.tout&&p.tout!=='none')h+='<div class="to">⇤</div>';
  if(c.id===sel&&c.kf)h+=c.kf.map(k=>`<div class="kd" style="left:${k.t*pxs}px"></div>`).join('');
  return h+'<div class="h l"></div><div class="h r"></div></div>';
}
/* la timeline ne fabrique que les clips proches de la partie visible (gros projets : 300 clips = 40 ms → quelques ms) */
let tlWin=null,tlRaf=0;
function renderTLSoon(){if(!tlRaf)tlRaf=requestAnimationFrame(()=>{tlRaf=0;renderTL()})}
function renderTL(){
  if(tlRaf){cancelAnimationFrame(tlRaf);tlRaf=0}
  const G=rowGeom(),wpx=Math.max(total()+20,40)*pxs,inner=$('#tli');inner.style.width=wpx+'px';inner.style.height=(G.total+12)+'px';
  const sc=$('#tls'),vw=Math.max(400,sc.clientWidth||1200),X0=Math.max(0,sc.scrollLeft-vw),X1=sc.scrollLeft+2*vw;tlWin={X0,X1};
  const step=pxs>=160?1:pxs>=60?2:pxs>=30?5:pxs>=12?10:30,sub=step/5;let rh='';
  for(let s=Math.max(0,Math.floor(X0/pxs/sub)*sub);s*pxs<Math.min(wpx,X1);s+=sub){const big=Math.abs(s/step-Math.round(s/step))<1e-6;rh+=`<div class="tk${big?' big':''}" style="left:${s*pxs}px"></div>`;if(big)rh+=`<div class="tkl" style="left:${s*pxs}px">${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}</div>`}
  rh+=markers.map((t,i)=>{const mi=window.mkInfo?mkInfo(t):null;return`<div class="mk${mi&&mi.n?' named':''}" data-mk="${i}" style="left:${t*pxs}px${mi&&mi.c?';--mkc:'+mi.c:''}" title="${esc(mi?[mi.n,mi.note].filter(Boolean).join('\n'):'')}${mi&&(mi.n||mi.note)?'\n':''}${T('mk.tip')}">${mi&&mi.n?`<span>${esc(mi.n)}</span>`:''}</div>`}).join('');
  if(xin!=null||xout!=null){const ra=clamp(xin??0,0,total()),rb=clamp(xout??total(),0,total());rh+=`<div class="xrange" style="left:${ra*pxs}px;width:${Math.max(2,(rb-ra)*pxs)}px"></div>`}
  $('#ruler').innerHTML=rh;
  let h=markers.map(t=>{const mi=window.mkInfo?mkInfo(t):null;return`<div class="mkl" style="left:${t*pxs}px${mi&&mi.c?';--mkc:'+mi.c:''}"></div>`}).join('');
  for(const r of G.order){
    h+=`<div class="row${tracks[r].hide?' hid':''}" style="top:${G.geom[r].top}px;height:${G.geom[r].h}px" data-row="${r}">`;
    const rc=clips.filter(c=>c.track===r),lm=laneMap(rc);
    for(const c of rc)if(c.id===sel||msel.has(c.id)||(c.start*pxs<X1&&(c.start+c.dur)*pxs>X0))h+=clipHTML(c,lm.get(c.id));
    h+=overlapZones(rc);
    if(silPrev&&silValid()&&clips.find(x=>x.id===silPrev.cid).track===r)h+=silZones().map(([a,b])=>`<div class="silz" style="left:${a*pxs}px;width:${Math.max(2,(b-a)*pxs)}px"></div>`).join('');
    h+='</div>';
  }
  $('#rows').innerHTML=h;drawWavesSoon(); // à l'image suivante : évite un calcul de mise en page forcé
  $('#tll').innerHTML=`<div class="addtk"><button data-addtk title="${T('tl.addTrack')}">${ico('plus',14)}<span>${T('tl.addTrack')}</span></button></div>`+G.order.map(r=>{const tk_=tracks[r],k=tk_.kind;return`<div class="trh${activeTk[k]===r?' cur':''}" data-tr="${r}" title="${T('tl.trackTip')}" style="height:${G.geom[r].h}px"><span>${esc(trackName(r))}</span>${k!=='audio'?`<button data-trk="${r}" data-tt="hide" class="${tk_.hide?'act':''}" title="${tk_.hide?T('tl.showTrack'):T('tl.hideTrack')}">${ico(tk_.hide?'eyeoff':'eye',15)}</button>`:''}${k!=='over'?`<button data-trk="${r}" data-tt="mute" class="${tk_.mute?'act':''}" title="${tk_.mute?T('tl.unmute'):T('tl.mute')}">${ico(tk_.mute?'mute':'vol',15)}</button><button data-trk="${r}" data-tt="solo" class="solo${tk_.solo?' act':''}" aria-pressed="${!!tk_.solo}" title="${T(tk_.solo?'solo.off':'solo.on')}">${ico('solo',15)}</button>`:''}<button data-trk="${r}" data-tt="lock" class="${tk_.lock?'act':''}" title="${tk_.lock?T('tl.unlock'):T('tl.lock')}">${ico(tk_.lock?'lock':'unlock',15)}</button></div>`}).join('');
}
const addTrackMenu=(x,y)=>showCtx([{label:T('tl.addVideoTrack'),fn:()=>addTrack('video')},{label:T('tl.addOverTrack'),fn:()=>addTrack('over')},{label:T('tl.addAudioTrack'),fn:()=>addTrack('audio')}],x,y);
let trDrag=null,trSuppress=false;
$('#tll').addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button'))return;const h=e.target.closest('.trh');if(!h)return;
  trDrag={i:+h.dataset.tr,y0:e.clientY,moved:false,to:null};$('#tll').setPointerCapture(e.pointerId);
});
$('#tll').addEventListener('pointermove',e=>{
  if(!trDrag)return;if(!trDrag.moved&&Math.abs(e.clientY-trDrag.y0)<5)return;trDrag.moved=true;
  const hs=[...$$('#tll .trh')];let to=hs.length;
  for(let k=0;k<hs.length;k++){const r=hs[k].getBoundingClientRect();if(e.clientY<r.top+r.height/2){to=k;break}}
  trDrag.to=to;
  hs.forEach((h,k)=>{h.classList.toggle('drag',+h.dataset.tr===trDrag.i);h.classList.toggle('dropb',k===to);h.classList.toggle('dropa',to===hs.length&&k===hs.length-1)});
});
$('#tll').addEventListener('pointerup',()=>{
  const d=trDrag;trDrag=null;if(!d||!d.moved)return;
  $$('#tll .trh').forEach(h=>h.classList.remove('drag','dropb','dropa'));
  trSuppress=true;setTimeout(()=>{trSuppress=false},60);
  const from=rowOrder().indexOf(d.i);let to=d.to;if(to>from)to--;
  if(to!==from)moveTrackRow(d.i,to);
});
$('#tll').addEventListener('click',e=>{
  if(trSuppress)return;
  const ad=e.target.closest('[data-addtk]');if(ad){const r=ad.getBoundingClientRect();addTrackMenu(r.left,r.bottom+4);return}
  const b=e.target.closest('[data-trk]');
  if(b){const tk_=tracks[+b.dataset.trk];tk_[b.dataset.tt]=!tk_[b.dataset.tt];autosave();renderTL();return}
  const row=e.target.closest('.trh');if(row){const i=+row.dataset.tr;activeTk[tracks[i].kind]=i;renderTL()}
});
$('#tll').addEventListener('contextmenu',e=>{
  const row=e.target.closest('.trh');if(!row)return;e.preventDefault();
  const i=+row.dataset.tr;
  const r=rowOrder().indexOf(i);
  showCtx([{title:trackName(i)},{label:T('tl.trackUp'),off:r===0,fn:()=>moveTrackStep(i,-1)},{label:T('tl.trackDown'),off:r===tracks.length-1,fn:()=>moveTrackStep(i,1)},'-',{label:T('tl.addVideoTrack'),fn:()=>addTrack('video')},{label:T('tl.addOverTrack'),fn:()=>addTrack('over')},{label:T('tl.addAudioTrack'),fn:()=>addTrack('audio')},'-',{label:T('tl.deleteTrack'),danger:true,fn:()=>deleteTrack(i)}],e.clientX,e.clientY);
});
$('#tls').addEventListener('scroll',()=>{const s=$('#tls');$('#tll').scrollTop=s.scrollTop;if(tlWin&&((s.scrollLeft<tlWin.X0+20&&tlWin.X0>0)||s.scrollLeft+s.clientWidth>tlWin.X1-20))renderTLSoon()},{passive:true});
function ptIn(e,el){const v=el.ownerDocument.defaultView,src=e.__win||e.view||window;if(src===v||!window.dedcutOrigin)return{x:e.clientX,y:e.clientY};const o=dedcutOrigin(v);return{x:e.screenX-o.x,y:e.screenY-o.y}}
function xToT(e){return(ptIn(e,$('#tli')).x-$('#tli').getBoundingClientRect().left)/pxs}
let scrub=false,drag=null;
$('#tli').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const ce=e.target.closest('.clip'),mod=e.ctrlKey||e.metaKey||e.shiftKey;
  if(ce){
    const c=clips.find(x=>x.id==ce.dataset.id);
    if(mod){toggleSel(c);renderTL();renderInspector();return}
    if(c.grp&&!(msel.size&&(c.id===sel||msel.has(c.id)))){sel=c.id;msel=new Set(clips.filter(x=>x.grp===c.grp&&x.id!==c.id).map(x=>x.id))}
    const inGroup=msel.size>0&&(c.id===sel||msel.has(c.id));
    if(inGroup){if(c.id!==sel){if(sel!=null)msel.add(sel);msel.delete(c.id);sel=c.id}}else{msel.clear();sel=c.id}
    activeTk[trk(c).kind]=c.track;
    const zone=e.target.classList.contains('l')?'l':e.target.classList.contains('r')?'r':'m';
    if(!trk(c).lock){
      const grp=zone==='m'&&inGroup?selClips().filter(x=>x!==c&&!trk(x).lock).map(x=>({c:x,start:x.start})):[];
      drag={c,zone,x0:e.clientX,o:{start:c.start,dur:c.dur,in:c.in,kf:c.kf?JSON.parse(JSON.stringify(c.kf)):null},moved:false,ov0:overlapsOther(c),grp,collapse:inGroup&&!c.grp};
    }
    renderTL();renderInspector();$('#tli').setPointerCapture(e.pointerId);
  }else if(mod&&!e.target.closest('#ruler')){
    /* Maj (ou Ctrl) + glisser dans le vide : rectangle de sélection */
    const r=$('#tli').getBoundingClientRect(),d=document.createElement('div');d.className='boxsel';$('#tli').appendChild(d);
    box={x0:e.clientX-r.left,y0:e.clientY-r.top,base:new Set(selIds()),el:d};$('#tli').setPointerCapture(e.pointerId);
  }else{
    scrub=true;seek(Math.max(0,xToT(e)));
    if(!e.target.closest('#ruler')&&(sel!=null||msel.size)){sel=null;msel.clear();renderTL();renderInspector()}
    $('#tli').setPointerCapture(e.pointerId);
  }
});
function boxMove(e){
  const r=$('#tli').getBoundingClientRect(),x1=e.clientX-r.left,y1=e.clientY-r.top;
  const L=Math.min(box.x0,x1),T0=Math.min(box.y0,y1),Wd=Math.abs(x1-box.x0),Hd=Math.abs(y1-box.y0);
  Object.assign(box.el.style,{left:L+'px',top:T0+'px',width:Wd+'px',height:Hd+'px'});
  const ids=new Set(box.base);
  for(const el of $$('#rows .clip')){const q=el.getBoundingClientRect(),qx=q.left-r.left,qy=q.top-r.top;if(qx<L+Wd&&qx+q.width>L&&qy<T0+Hd&&qy+q.height>T0)ids.add(+el.dataset.id)}
  setSelection(ids);renderTLSoon();
}
$('#tli').addEventListener('pointermove',e=>{
  if(box){boxMove(e);return}
  if(scrub){seek(Math.max(0,xToT(e)));return}
  if(!drag)return;
  const{c,zone,o}=drag;const dt=(e.clientX-drag.x0)/pxs;if(Math.abs(e.clientX-drag.x0)<2&&!drag.moved)return;drag.moved=true;
  if(window.tlTool&&tlTool!=='sel'&&window.trimMove&&trimMove(drag,e)){renderTLSoon();return} // outils ripple / roll / slip / slide (15d-montage3.js)
  const m=c.mid&&mById(c.mid),timed=m&&m.type!=='image';
  const pts=[0,time,...markers];clips.forEach(x=>{if(x!==c){pts.push(x.start,x.start+x.dur)}});
  const sOn=snapOn!==e.altKey,snap=v=>{if(sOn)for(const p of pts)if(Math.abs(p-v)*pxs<8)return p;return frT(v)};
  if(zone==='m'){c.start=Math.max(0,snap(o.start+dt));const e2=snap(c.start+c.dur);if(sOn&&Math.abs(e2-(c.start+c.dur))*pxs<8&&e2!==c.start+c.dur&&pts.includes(e2))c.start=Math.max(0,e2-c.dur)}
  else if(zone==='r'){let d=snap(o.start+o.dur+dt)-o.start;d=Math.max(.1,d);if(timed){if(c.p.rev)d=Math.min(d,o.dur+o.in/(c.p.rate||1));else d=Math.min(d,(m.duration-o.in)/(c.p.rate||1))}c.dur=d;if(timed&&c.p.rev)c.in=o.in+(o.dur-d)*(c.p.rate||1)}
  else{const s=snap(o.start+dt);let d=s-o.start;const rt=c.p.rate||1;d=clamp(d,timed?(c.p.rev?o.dur-(m.duration-o.in)/rt:-o.in/rt):-o.start,o.dur-.1);c.start=o.start+d;c.dur=o.dur-d;if(timed&&!c.p.rev)c.in=o.in+d*rt;if(o.kf)c.kf=o.kf.map(k=>({...k,t:k.t-d}))}
  if(zone==='m'&&drag.grp&&drag.grp.length){let d=c.start-o.start;const mn=Math.min(...drag.grp.map(g=>g.start));if(mn+d<0){d=-mn;c.start=o.start+d}drag.grp.forEach(g=>{g.c.start=g.start+d})}
  else if(zone==='m'){const ty=trackAtY(e.clientY-$('#tli').getBoundingClientRect().top);if(ty!=null&&ty!==c.track&&tracks[ty].kind===trk(c).kind&&!tracks[ty].lock){c.track=ty;activeTk[tracks[ty].kind]=ty}}
  renderTLSoon();
});
$('#tli').addEventListener('pointerup',()=>{
  scrub=false;
  if(box){box.el.remove();box=null;renderTL();renderInspector();return}
  if(drag){if(drag.moved){commit();renderInspector();if(!drag.ov0&&overlapsOther(drag.c))toast('tl.overlapHint')}else if(drag.collapse){msel.clear();renderTL();renderInspector()}drag=null}
});
function setZoom(v,anchorX){
  const s=$('#tls'),ax=anchorX??s.clientWidth/2,t=(s.scrollLeft+ax)/pxs;
  pxs=clamp(v,10,400);$('#zoom').value=pxs;renderTL();s.scrollLeft=Math.max(0,t*pxs-ax);
}
$('#zoom').oninput=e=>setZoom(+e.target.value);
/* hauteur de la timeline réglable (utile avec beaucoup de pistes) : glisser la poignée, double-clic = taille normale */
{const h=$('#tlResize'),root=document.documentElement;let on=false;
  try{const v=+localStorage.getItem('dedcut-tlh');if(v>=180)root.style.setProperty('--tlh',v+'px')}catch(e){}
  h.addEventListener('pointerdown',e=>{on=true;h.setPointerCapture(e.pointerId);e.preventDefault()});
  h.addEventListener('pointermove',e=>{if(!on)return;const top=document.body.classList.contains('tl-top'),r=$('#tl').getBoundingClientRect();
    root.style.setProperty('--tlh',clamp(Math.round(top?e.clientY-r.top:innerHeight-e.clientY-8),180,Math.round(innerHeight*.7))+'px')});
  h.addEventListener('pointerup',()=>{on=false;try{localStorage.setItem('dedcut-tlh',String(parseInt(getComputedStyle(root).getPropertyValue('--tlh'))||272))}catch(e){}});
  h.addEventListener('dblclick',()=>{root.style.removeProperty('--tlh');try{localStorage.removeItem('dedcut-tlh')}catch(e){}})}
$('#tls').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(pxs*(e.deltaY<0?1.15:1/1.15),e.clientX-$('#tls').getBoundingClientRect().left)},{passive:false});
$('#tls').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/dedcut')){e.preventDefault();$('#tli').classList.add('dropok')}});
$('#tls').addEventListener('dragleave',()=>$('#tli').classList.remove('dropok'));
$('#tls').addEventListener('drop',e=>{
  $('#tli').classList.remove('dropok');
  const id=+e.dataTransfer.getData('text/dedcut');if(!id)return;e.preventDefault();e.stopPropagation();
  const tr=trackAtY(e.clientY-$('#tli').getBoundingClientRect().top);
  const ov=tr!=null&&tracks[tr].kind==='over',at=Math.max(0,xToT(e)),mode=e.ctrlKey||e.metaKey?'insert':e.altKey?'over':null;
  if(mode&&window.editDrop)editDrop(id,ov,at,tr,mode);else addFromMedia(id,ov,at,tr);
});
$('#tbar').addEventListener('click',e=>{
  const b=e.target.closest('[data-tb]');if(!b)return;
  const a=b.dataset.tb;
  ({split,del,ripple:rippleDel,dup,freeze,flip:flipSel,rot:rotSel,kf:toggleKf,mark:toggleMarker,
    snap:()=>{snapOn=!snapOn;b.classList.toggle('on',snapOn);toast(snapOn?T('tl.snapOn'):T('tl.snapOff'))},
    zin:()=>setZoom(pxs*1.25),zout:()=>setZoom(pxs/1.25),
    fit:()=>{setZoom(($('#tls').clientWidth-40)/Math.max(total(),3),0);$('#tls').scrollLeft=0}})[a]?.();
});

/* ---------- onglet Formes : bibliothèque d'éléments (catégories, vignettes dessinées par le moteur, aperçu animé au survol) ---------- */
const WCATS=['bar','count','timer','social','tag','fun','shape','stick'];
const WLIB=[
  ...['line','pill','seg','dots','neon','label','ring'].map(s=>({c:'bar',g:'pbar',s,p:s==='ring'?{w:14,th:1.4,x:86,y:16}:s==='line'?{}:{w:80,y:93,th:s==='dots'?1.8:s==='pill'?1.6:1.3},tp:{y:50,w:s==='ring'?62:86,th:s==='ring'?8:7},tt:2})),
  ...['ring','pop','flip','neon','dots','bar'].map(s=>({c:'count',g:'count',s,tp:{size:46},tt:.35})),
  ...['box','digital','rec','minimal','ring'].map(s=>({c:'timer',g:'timer',s,p:s==='digital'?{color:'#4ade80'}:{},tp:{size:s==='ring'?13:15,y:50},tt:3.4})),
  {c:'social',g:'sub',s:'sub',n:'wdg.sub',tp:{size:10,y:45},tt:1},
  {c:'social',g:'sub',s:'bell',n:'wl.bell',tp:{size:9,y:45},tt:1},
  {c:'social',g:'sub',s:'follow',n:'wl.follow',p:{text:()=>T('wdg.follow'),done:()=>T('wdg.followDone'),color:'#3b82f6'},tp:{size:10,y:45},tt:1},
  {c:'social',g:'sub',s:'like',n:'wl.like',p:{text:()=>T('wdg.like'),color:'#ff4d6d'},tp:{size:11,y:42},tt:1.7},
  {c:'social',g:'sub',s:'share',n:'wl.share',p:{text:()=>T('wdg.share'),color:'#3b82f6'},tp:{size:11,y:42},tt:1},
  {c:'social',g:'sub',s:'notif',n:'wl.notif',p:{text:()=>T('wdg.newVideo')},tp:{size:11,y:50,text:''},tt:1.2},
  {c:'social',g:'rec',s:'dot',n:'wl.rec',tp:{size:11,x:12,y:50},tt:.2},
  {c:'social',g:'rec',s:'live',n:'wl.live',p:{text:()=>T('wdg.live')},tp:{size:10,x:10,y:50},tt:.2},
  {c:'tag',g:'lower',s:'lbar',n:'wl.lowerBar',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'lower',s:'clean',n:'wl.lowerClean',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'lower',s:'lbox',n:'wl.lowerBox',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'chat',s:'light',n:'wl.chatLight',tp:{size:7,y:50,text:'OK !'},tt:1.7},
  {c:'tag',g:'chat',s:'dark',n:'wl.chatDark',tp:{size:7,y:50,text:'OK !'},tt:1.7},
  {c:'tag',g:'pin',n:'wdg.pin',tp:{size:8,y:50},tt:1.2},
  {c:'fun',g:'hearts',s:'heart',n:'wl.hearts',tp:{size:13,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'hearts',s:'star',n:'wl.starsUp',p:{color:'#facc15'},tp:{size:13,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'hearts',s:'bubble',n:'wl.bubbles',p:{color:'#7dd3fc'},tp:{size:14,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'confetti',n:'wdg.confetti',tt:.6},
  {c:'fun',g:'pulse',s:'rings',n:'wl.pulse',tp:{size:30},tt:.7},
  {c:'fun',g:'pulse',s:'spot',n:'wl.spot',tp:{size:28},tt:.7},
  {c:'fun',g:'arrowp',s:'arrow',n:'wl.arrow',tp:{size:36,y:50,rot:0},tt:.3},
  {c:'fun',g:'arrowp',s:'chev',n:'wl.chevrons',tp:{size:36,y:50,rot:0},tt:.3},
  {c:'fun',g:'swipe',s:'up',n:'wl.swipeUp',tp:{size:9,y:62,text:''},tt:.5},
  {c:'fun',g:'swipe',s:'tap',n:'wl.tap',p:{text:()=>T('wdg.tapHere')},tp:{size:9,y:45,text:''},tt:.5},
  {c:'fun',g:'stars',n:'wdg.stars',tp:{size:15},tt:2},
  {c:'fun',g:'spin',s:'sring',n:'wl.spinRing',tp:{size:16,text:''},tt:.3},
  {c:'fun',g:'spin',s:'sdots',n:'wl.spinDots',tp:{size:16,text:''},tt:.3},
  ...SHPLIB.map((s,i)=>({c:'shape',shp:i,n:s.n}))
];
const wlName=x=>T(x.n||'wst.'+x.s);
/* clip prêt à poser (thumb = réglages agrandis pour la vignette carrée) */
function wlClip(x,thumb){
  if(x.shp!=null){const s=SHPLIB[x.shp],p=Object.assign({shape:s.k,color:'#ffffff',fill:true,x:50,y:50,rot:0,op:100,sw:8,r:12,shadow:true},s.p);
    if(thumb){p.w=Math.min(78,p.w*2.4);p.sw=Math.max(p.sw,10);if(p.h)p.h=Math.min(78,p.h*2.4)}if(!p.h)p.h=Math.round(p.w*W/H*10)/10;return{id:-8,gen:'shape',start:0,dur:3,p}}
  const d=WDEF[x.g]();if(x.s)d.p.st=x.s;
  for(const[k,v]of Object.entries(x.p||{}))d.p[k]=typeof v==='function'?v():v;
  if(thumb){Object.assign(d.p,x.tp||{});if(x.g==='pbar')d.dur=4;if((x.c==='social'||x.c==='tag')&&d.p.size)d.p.size*=1.3}
  return{id:-8,gen:x.g,start:0,dur:d.dur,p:d.p};
}
function wlFrame(g2,S,x,t){
  const sv=[W,H,ctx];W=S;H=S;ctx=g2;
  try{g2.save();g2.setTransform(1,0,0,1,0,0);g2.globalAlpha=1;g2.filter='none';g2.globalCompositeOperation='source-over';txBg(g2,S);g2.restore();
    const c=wlClip(x,true);drawGenOverlay(c,Math.min(t,c.dur-.02))}
  finally{W=sv[0];H=sv[1];ctx=sv[2];boxes.delete(-8)}
}
let wlCat='all',wlThumbs=null,wlAnim=null;
function renderWL(){
  const L=$('#wlist');if(!L)return;
  if(!txPhoto)renderTextTab();
  const vis=!$('#t-stick').hidden,lang=document.documentElement.lang||'';
  if(vis&&txPhoto&&txPhoto.done&&(!wlThumbs||wlThumbs.lang!==lang)){
    wlThumbs={lang};
    WLIB.forEach((x,i)=>{const k=document.createElement('canvas');k.width=k.height=TX_S;try{wlFrame(k.getContext('2d'),TX_S,x,x.tt??1)}catch(e){console.error(e)}wlThumbs[i]=k.toDataURL('image/jpeg',.88)});
  }else if(vis&&txPhoto&&!txPhoto.done)setTimeout(renderWL,300);
  $('#wcats').innerHTML=['all',...WCATS].map(k=>`<button data-wlcat="${k}" class="${k===wlCat?'on':''}">${T(k==='all'?'lookcat.all':'wcat.'+k)}</button>`).join('');
  const th=i=>wlThumbs&&wlThumbs[i]?` style="background-image:url(${wlThumbs[i]})"`:'';
  const item=i=>`<button data-wl="${i}" title="${esc(wlName(WLIB[i]))}"><i${th(i)}></i><span>${esc(wlName(WLIB[i]))}</span></button>`;
  L.innerHTML=(wlCat==='all'?WCATS:[wlCat]).filter(k=>k!=='stick').map(cat=>`<h3>${T('wcat.'+cat)}</h3><div class="filt">${WLIB.map((x,i)=>x.c===cat?item(i):'').join('')}</div>`).join('');
  $('#emoBox').hidden=!(wlCat==='all'||wlCat==='stick');
}
function wlStop(){if(!wlAnim)return;cancelAnimationFrame(wlAnim.raf);wlAnim.c.remove();wlAnim=null}
function wlHover(b){
  wlStop();const x=WLIB[+b.dataset.wl],i=b.querySelector('i');if(!x||!i||x.shp!=null)return;
  const c=document.createElement('canvas');c.width=c.height=TX_S;c.className='fxlive';i.appendChild(c);
  const g=c.getContext('2d'),t0=performance.now(),dur=wlClip(x,true).dur,span=Math.min(dur,6)+.6;let last=0;
  const loop=now=>{if(!wlAnim||wlAnim.c!==c)return;if(now-last>33){last=now;const e=((now-t0)/1000)%span;try{wlFrame(g,TX_S,x,Math.min(e,dur-.02))}catch(err){}}wlAnim.raf=requestAnimationFrame(loop)};
  wlAnim={c,raf:requestAnimationFrame(loop)};
}
$('#t-stick').addEventListener('mouseover',e=>{const b=e.target.closest('[data-wl]');if(b&&(!wlAnim||!b.contains(wlAnim.c)))wlHover(b)});
$('#t-stick').addEventListener('mouseleave',wlStop);
$('#t-stick').addEventListener('mouseout',e=>{const b=e.target.closest('[data-wl]');if(b&&!b.contains(e.relatedTarget))wlStop()});
$('#wcats').addEventListener('click',e=>{const b=e.target.closest('[data-wlcat]');if(!b)return;wlCat=b.dataset.wlcat;renderWL()});
$('#wlist').addEventListener('click',e=>{
  const b=e.target.closest('[data-wl]');if(!b)return;const x=WLIB[+b.dataset.wl],c=wlClip(x,false);
  if(x.g==='pbar'){c.start=0;c.dur=Math.max(1,total()||10)}else c.start=time;
  add(newClip({track:tk('over'),gen:c.gen,start:c.start,dur:c.dur,p:c.p}));
});
window.addEventListener('dedcut-lang',()=>{wlThumbs=null;renderWL()});
setTimeout(renderWL,0); // après la fin du chargement du moteur (txPhoto, TX_S sont définis plus bas)

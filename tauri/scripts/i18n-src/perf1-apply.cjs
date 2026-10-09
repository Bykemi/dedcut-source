// v4.23 : optimisations (timeline virtualisée + 1 dessin par image, vignettes progressives, aperçu au repos à 4 i/s,
// historique plafonné) + lecture en boucle (L), sauts entre coupes (↑ ↓), recherche dans l'onglet Formes. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), A = path.resolve(__dirname, '../../src/App.tsx'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };
const R1 = (x, y) => { e = rep(e, x, y); };

/* ===== 1) timeline : seulement la partie visible (+ une largeur d'écran de chaque côté) ===== */
R1("function renderTL(){\n  const G=rowGeom(),wpx=Math.max(total()+20,40)*pxs,inner=$('#tli');inner.style.width=wpx+'px';inner.style.height=(G.total+12)+'px';\n  const step=pxs>=160?1:pxs>=60?2:pxs>=30?5:pxs>=12?10:30,sub=step/5;let rh='';\n  for(let s=0;s*pxs<wpx;s+=sub){",
`/* la timeline ne fabrique que les clips proches de la partie visible (gros projets : 300 clips = 40 ms → quelques ms) */
let tlWin=null,tlRaf=0;
function renderTLSoon(){if(!tlRaf)tlRaf=requestAnimationFrame(()=>{tlRaf=0;renderTL()})}
function renderTL(){
  if(tlRaf){cancelAnimationFrame(tlRaf);tlRaf=0}
  const G=rowGeom(),wpx=Math.max(total()+20,40)*pxs,inner=$('#tli');inner.style.width=wpx+'px';inner.style.height=(G.total+12)+'px';
  const sc=$('#tls'),vw=Math.max(400,sc.clientWidth||1200),X0=Math.max(0,sc.scrollLeft-vw),X1=sc.scrollLeft+2*vw;tlWin={X0,X1};
  const step=pxs>=160?1:pxs>=60?2:pxs>=30?5:pxs>=12?10:30,sub=step/5;let rh='';
  for(let s=Math.max(0,Math.floor(X0/pxs/sub)*sub);s*pxs<Math.min(wpx,X1);s+=sub){`);
R1("    for(const c of rc)h+=clipHTML(c,lm.get(c.id));", "    for(const c of rc)if(c.id===sel||msel.has(c.id)||(c.start*pxs<X1&&(c.start+c.dur)*pxs>X0))h+=clipHTML(c,lm.get(c.id));");
R1("$('#tls').addEventListener('scroll',()=>{$('#tll').scrollTop=$('#tls').scrollTop});",
   "$('#tls').addEventListener('scroll',()=>{const s=$('#tls');$('#tll').scrollTop=s.scrollTop;if(tlWin&&((s.scrollLeft<tlWin.X0+20&&tlWin.X0>0)||s.scrollLeft+s.clientWidth>tlWin.X1-20))renderTLSoon()},{passive:true});");
// glisser un clip / rectangle de sélection : au plus un dessin de la timeline par image
R1("  else if(zone==='m'){const ty=trackAtY(", "  else if(zone==='m'){const ty=trackAtY(");
{
  const k = "  renderTL();\n});\n$('#tli').addEventListener('pointerup'";
  if (e.split(k).length !== 2) throw new Error('fin du glisser introuvable');
  e = e.replace(k, () => "  renderTLSoon();\n});\n$('#tli').addEventListener('pointerup'");
}
R1("  setSelection(ids);renderTL();\n}", "  setSelection(ids);renderTLSoon();\n}");

/* ===== 2) vignettes progressives (onglets Texte et Formes) : jamais plus de ~10 ms d'affilée ===== */
R1("function textThumbs(){", `/* fabrique des vignettes par petits paquets pour ne pas figer l'interface ; done(clé, image) pose chaque vignette dès qu'elle est prête */
function thumbJobs(jobs,done,alive){let i=0;const step=()=>{if(!alive())return;const t0=performance.now();while(i<jobs.length&&performance.now()-t0<10){const[k,f]=jobs[i++];try{done(k,f())}catch(err){console.error(err)}}if(i<jobs.length)setTimeout(step,0)};setTimeout(step,0)}
function textThumbs(){`);
R1("  txThumbs={lang};const word=T('txt.sample');\n  for(const k of Object.keys(TPRE))txThumbs['s:'+k]=txThumb(txSample(TPRE[k].s),1.3,TX_DUR,word);\n  for(const w of Object.keys(TAN))for(const k of TAN[w])txThumbs[w+':'+k]=txThumb(txAnimP(w,k),txAnimT(w,k),TX_DUR,word);\n}",
`  const mine={lang};txThumbs=mine;const word=T('txt.sample'),jobs=[];
  for(const k of Object.keys(TPRE))jobs.push(['s:'+k,()=>txThumb(txSample(TPRE[k].s),1.3,TX_DUR,word)]);
  for(const w of Object.keys(TAN))for(const k of TAN[w])jobs.push([w+':'+k,()=>txThumb(txAnimP(w,k),txAnimT(w,k),TX_DUR,word)]);
  thumbJobs(jobs,(key,url)=>{mine[key]=url;const[w,k]=key.split(':'),el=w==='s'?$(\`#txlist [data-tpl="\${k}"] i\`):$(\`#txalist [data-tan="\${k}"][data-w="\${w}"] i\`);if(el)el.style.backgroundImage=\`url(\${url})\`},()=>txThumbs===mine);
}`);
R1("    wlThumbs={lang};\n    WLIB.forEach((x,i)=>{const k=document.createElement('canvas');k.width=k.height=TX_S;try{wlFrame(k.getContext('2d'),TX_S,x,x.tt??1)}catch(e){console.error(e)}wlThumbs[i]=k.toDataURL('image/jpeg',.88)});",
`    const mine={lang};wlThumbs=mine;
    thumbJobs(WLIB.map((x,i)=>[i,()=>{const k=document.createElement('canvas');k.width=k.height=TX_S;wlFrame(k.getContext('2d'),TX_S,x,x.tt??1);return k.toDataURL('image/jpeg',.88)}]),
      (i,url)=>{mine[i]=url;const el=$(\`#wlist [data-wl="\${i}"] i\`);if(el)el.style.backgroundImage=\`url(\${url})\`},()=>wlThumbs===mine);`);

/* ===== 3) aperçu au repos : si rien ne bouge depuis 1,5 s, 4 images / s au lieu de 60 ===== */
R1("function tick(ts,relay){", `let lastAct=0,lastDraw=0,tcLast='';
['pointerdown','pointermove','keydown','wheel','input','change','drop'].forEach(n=>addEventListener(n,()=>{lastAct=performance.now()},{capture:true,passive:true}));
function wake(){lastAct=performance.now()}
function tick(ts,relay){`);
R1("  if(!fastExp){render(time);syncMedia();drawSel();drawVU()}", "  const idle=!playing&&!exporting&&ts-lastAct>1500;\n  if(!fastExp&&(!idle||ts-lastDraw>250)){lastDraw=ts;render(time);syncMedia();drawSel();drawVU()}");
R1("  if(!tcEditing)$('#tc').innerHTML='<b>'+fmtTC(time)+'</b> / '+fmtTC(total());\n  $('#ph')",
   "  if(!tcEditing){const s='<b>'+fmtTC(time)+'</b> / '+fmtTC(total());if(s!==tcLast){tcLast=s;$('#tc').innerHTML=s}}\n  $('#ph')");
R1("function refresh(){renderTL();renderInspector()}", "function refresh(){wake();renderTL();renderInspector()}");
R1("function seek(t){time=clamp(t,0,Math.max(total(),0))}", "function seek(t){time=clamp(t,0,Math.max(total(),0));wake()}");

/* ===== 4) historique : pas de doublon, ~20 Mo au plus ===== */
R1("function commit(){projDirty=true;hist=hist.slice(0,hi+1);hist.push(JSON.stringify({c:clips,t:tracks}));if(hist.length>100)hist.shift();hi=hist.length-1;autosave()}",
`let histBytes=0;
function commit(){
  projDirty=true;wake();const s=JSON.stringify({c:clips,t:tracks});
  if(s!==hist[hi]){hist=hist.slice(0,hi+1);hist.push(s);histBytes=hist.reduce((n,x)=>n+x.length,0);
    while(hist.length>2&&(hist.length>100||histBytes>2e7)){histBytes-=hist[0].length;hist.shift()}hi=hist.length-1}
  autosave();
}`);

/* ===== 5) lecture en boucle + sauts entre coupes ===== */
R1("    if(time>=total()){\n      time=total();\n      if(exporting)finishExport(); else pause();\n    }",
   "    const lr=loopOn&&!exporting?loopRange():null;\n    if(lr&&time>=lr[1]){time=lr[0]}\n    else if(time>=total()){\n      time=total();\n      if(exporting)finishExport(); else pause();\n    }");
R1("function play(){\n  if(!clips.length)return;\n  ensureAudio();actx.resume();\n  if(time>=total()-.01)time=0;",
`let loopOn=false;
function loopRange(){const T0=total(),a=clamp(xin??0,0,T0),b=clamp(xout??T0,0,T0);return b-a>.1?[a,b]:[0,T0]}
function toggleLoop(){loopOn=!loopOn;$('#bLoop')?.classList.toggle('on',loopOn);toast(T(loopOn?'pl.on':'pl.off'))}
function jumpEdit(dir){const pts=[...new Set([0,total(),...clips.flatMap(c=>[c.start,c.start+c.dur]),...markers].map(x=>Math.round(x*1000)/1000))].sort((x,y)=>x-y);const t=dir>0?pts.find(x=>x>time+.01):pts.reverse().find(x=>x<time-.01);if(t!=null){pause();seek(t)}}
function play(){
  if(!clips.length)return;
  ensureAudio();actx.resume();
  if(time>=total()-.01)time=0;
  if(loopOn){const lr=loopRange();if(time<lr[0]||time>=lr[1]-.01)time=lr[0]}`);
R1("  {id:'start',n:'kb.start',d:['home'],f:()=>seek(0)},", "  {id:'start',n:'kb.start',d:['home'],f:()=>seek(0)},\n  {id:'prevEdit',n:'kb.prevEdit',d:['arrowup'],f:()=>jumpEdit(-1)},\n  {id:'nextEdit',n:'kb.nextEdit',d:['arrowdown'],f:()=>jumpEdit(1)},\n  {id:'loop',n:'kb.loop',d:['l'],f:()=>toggleLoop()},");
R1("const ICO={\n", "const ICO={\n  loop:'<path d=\"M17 2l3 3-3 3\"/><path d=\"M4 11V9a4 4 0 0 1 4-4h12\"/><path d=\"M7 22l-3-3 3-3\"/><path d=\"M20 13v2a4 4 0 0 1-4 4H4\"/>',\n");
a = rep(a, '<button data-i18n-title="ui.endTip" id="bEnd" data-ico="end" title="Fin (Fin)"></button>', '<button data-i18n-title="ui.endTip" id="bEnd" data-ico="end" title="Fin (Fin)"></button>\n                <button data-i18n-title="pl.tip" id="bLoop" data-ico="loop" title="Lecture en boucle (L)"></button>');
R1("$('#bEnd').onclick=()=>seek(total());", "$('#bEnd').onclick=()=>seek(total());\n$('#bLoop').onclick=toggleLoop;");

/* ===== 6) recherche dans l'onglet Formes ===== */
a = rep(a, '<div className="fcats" id="wcats"></div>', '<input type="search" id="wlq" data-i18n-ph="wl.search" placeholder="Rechercher un élément…" style={{"width":"100%","marginBottom":"8px"}} />\n              <div className="fcats" id="wcats"></div>');
R1("  L.innerHTML=(wlCat==='all'?WCATS:[wlCat]).filter(k=>k!=='stick').map(cat=>`<h3>${T('wcat.'+cat)}</h3><div class=\"filt\">${WLIB.map((x,i)=>x.c===cat?item(i):'').join('')}</div>`).join('');",
`  const nq=s=>String(s).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''),q=nq(($('#wlq')&&$('#wlq').value)||'').trim();
  if(q){const hits=WLIB.map((x,i)=>[x,i]).filter(([x])=>nq(wlName(x)+' '+T('wcat.'+x.c)).includes(q));L.innerHTML=hits.length?\`<div class="filt">\${hits.map(([,i])=>item(i)).join('')}</div>\`:\`<p class="hint">\${T('wl.noResult')}</p>\`;$('#emoBox').hidden=true;return}
  L.innerHTML=(wlCat==='all'?WCATS:[wlCat]).filter(k=>k!=='stick').map(cat=>\`<h3>\${T('wcat.'+cat)}</h3><div class="filt">\${WLIB.map((x,i)=>x.c===cat?item(i):'').join('')}</div>\`).join('');`);
R1("$('#wcats').addEventListener('click',e=>{const b=e.target.closest('[data-wlcat]');if(!b)return;wlCat=b.dataset.wlcat;renderWL()});",
   "$('#wcats').addEventListener('click',e=>{const b=e.target.closest('[data-wlcat]');if(!b)return;wlCat=b.dataset.wlcat;if($('#wlq'))$('#wlq').value='';renderWL()});\n$('#wlq').addEventListener('input',()=>renderWL());");

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('#bLoop.on')) { css += `\n/* lecture en boucle active */\n#bLoop.on{color:var(--ac);background:rgba(var(--acrgb),.14)}\n`; fs.writeFileSync(C, css); }
console.log('v4.23 : optimisations + boucle, sauts, recherche');

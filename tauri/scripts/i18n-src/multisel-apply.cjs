// v4.18 : sélection multiple dans la timeline (Ctrl/Maj+clic, Maj+glisser pour encadrer, Ctrl+A, Échap),
// déplacement du groupe, et Suppr / Ctrl+D / Ctrl+C / Ctrl+V sur tout le groupe. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };
const cut = (a, b, y) => { const i = e.indexOf(a), j = e.indexOf(b, i + a.length); if (i < 0 || j < 0 || e.indexOf(a, i + 1) >= 0) throw new Error('bloc introuvable : ' + a.slice(0, 60)); e = e.slice(0, i) + y + e.slice(j); };

/* 1) état de la sélection : sel = clip principal (celui du panneau), msel = les autres */
rep("const selClip=()=>clips.find(c=>c.id===sel);",
`const selClip=()=>clips.find(c=>c.id===sel);
/* sélection multiple : sel = clip principal (affiché dans le panneau), msel = les autres clips sélectionnés */
let msel=new Set(),box=null;
function selIds(){const s=[];if(sel!=null&&clips.some(c=>c.id===sel))s.push(sel);for(const id of msel)if(id!==sel&&clips.some(c=>c.id===id))s.push(id);return s}
const selClips=()=>selIds().map(id=>clips.find(c=>c.id===id));
function toggleSel(c){
  if(c.id===sel){const n=[...msel].find(id=>clips.some(x=>x.id===id));sel=n??null;if(n!=null)msel.delete(n)}
  else if(msel.has(c.id))msel.delete(c.id);
  else{if(sel!=null)msel.add(sel);sel=c.id}
}
function setSelection(ids){const a=[...ids];sel=a.includes(sel)?sel:(a[0]??null);msel=new Set(a.filter(i=>i!==sel))}
function selectAll(){setSelection(clips.map(c=>c.id));renderTL();renderInspector()}
function selectNone(){sel=null;msel.clear();renderTL();renderInspector()}`);

/* 2) actions sur tout le groupe */
rep("function del(){const c=selClip();if(!c)return;if(trk(c).lock){toast(T('msg.trackLocked'));return}clips=clips.filter(x=>x!==c);sel=null;commit();refresh()}",
    "function del(){const g=selClips();if(!g.length)return;const ok=g.filter(c=>!trk(c).lock);if(!ok.length){toast(T('msg.trackLocked'));return}clips=clips.filter(x=>!ok.includes(x));sel=null;msel.clear();commit();refresh()}");
cut("function rippleDel(){\n", "function dup(){",
`function rippleDel(){
  const g=selClips().filter(c=>!trk(c).lock);if(!g.length){if(selClip())toast(T('msg.trackLocked'));return}
  for(const c of g.sort((a,b)=>b.start-a.start)){
    const end=c.start+c.dur;clips=clips.filter(x=>x!==c);
    clips.forEach(x=>{if(x.track===c.track&&x.start>=end-.001)x.start=Math.max(0,x.start-c.dur)});
  }
  sel=null;msel.clear();commit();refresh();
}
`);
rep("function dup(){const c=selClip();if(!c)return;const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=c.start+c.dur;clips.push(n);sel=n.id;commit();refresh()}",
    "function dup(){const g=selClips();if(!g.length)return;const a=Math.min(...g.map(c=>c.start)),b=Math.max(...g.map(c=>c.start+c.dur));const made=g.map(c=>{const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=c.start+(b-a);clips.push(n);return n});sel=made[0].id;msel=new Set(made.slice(1).map(n=>n.id));commit();refresh()}");
rep("function copyClip(){const c=selClip();if(!c){toast(T('msg.selectClip'));return}clipboard=JSON.stringify(c);toast(T('msg.clipCopied'))}",
    "function copyClip(){const g=selClips();if(!g.length){toast(T('msg.selectClip'));return}clipboard=JSON.stringify(g.length>1?g:g[0]);toast(g.length>1?T('msel.copied',{count:g.length}):T('msg.clipCopied'))}");
rep("  const n=JSON.parse(clipboard);n.id=uid++;n.start=Math.max(0,at);\n  clips.push(n);sel=n.id;commit();refresh();",
    "  const v=JSON.parse(clipboard),arr=Array.isArray(v)?v:[v],a=Math.min(...arr.map(x=>x.start));\n  const made=arr.map(n=>{n.id=uid++;n.start=Math.max(0,at+(n.start-a));if(!tracks[n.track])n.track=tk(n.track===2?'audio':'video');clips.push(n);return n});\n  sel=made[0].id;msel=new Set(made.slice(1).map(n=>n.id));commit();refresh();");

/* 3) affichage : les clips du groupe sont surlignés */
rep("let h=`<div class=\"clip ${kind}${c.id===sel?' sel':''}", "let h=`<div class=\"clip ${kind}${c.id===sel?' sel':msel.has(c.id)?' sel msel':''}");

/* 4) souris dans la timeline */
cut("$('#tli').addEventListener('pointerdown',e=>{\n  if(e.button!==0)return;\n  const ce=e.target.closest('.clip');", "$('#tli').addEventListener('pointermove',e=>{",
`$('#tli').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const ce=e.target.closest('.clip'),mod=e.ctrlKey||e.metaKey||e.shiftKey;
  if(ce){
    const c=clips.find(x=>x.id==ce.dataset.id);
    if(mod){toggleSel(c);renderTL();renderInspector();return}
    const inGroup=msel.size>0&&(c.id===sel||msel.has(c.id));
    if(inGroup){if(c.id!==sel){if(sel!=null)msel.add(sel);msel.delete(c.id);sel=c.id}}else{msel.clear();sel=c.id}
    activeTk[trk(c).kind]=c.track;
    const zone=e.target.classList.contains('l')?'l':e.target.classList.contains('r')?'r':'m';
    if(!trk(c).lock){
      const grp=zone==='m'&&inGroup?selClips().filter(x=>x!==c&&!trk(x).lock).map(x=>({c:x,start:x.start})):[];
      drag={c,zone,x0:e.clientX,o:{start:c.start,dur:c.dur,in:c.in,kf:c.kf?JSON.parse(JSON.stringify(c.kf)):null},moved:false,ov0:overlapsOther(c),grp,collapse:inGroup};
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
  setSelection(ids);renderTL();
}
`);
rep("  if(scrub){seek(Math.max(0,xToT(e)));return}\n  if(!drag)return;", "  if(box){boxMove(e);return}\n  if(scrub){seek(Math.max(0,xToT(e)));return}\n  if(!drag)return;");
// déplacement du groupe : même décalage pour tous, jamais avant 0 ; pas de changement de piste en groupe
rep("  if(zone==='m'){const ty=trackAtY(", `  if(zone==='m'&&drag.grp&&drag.grp.length){let d=c.start-o.start;const mn=Math.min(...drag.grp.map(g=>g.start));if(mn+d<0){d=-mn;c.start=o.start+d}drag.grp.forEach(g=>{g.c.start=g.start+d})}
  else if(zone==='m'){const ty=trackAtY(`);
rep("  scrub=false;\n  if(drag){if(drag.moved){commit();renderInspector();if(!drag.ov0&&overlapsOther(drag.c))toast('tl.overlapHint')}drag=null}",
    "  scrub=false;\n  if(box){box.el.remove();box=null;renderTL();renderInspector();return}\n  if(drag){if(drag.moved){commit();renderInspector();if(!drag.ov0&&overlapsOther(drag.c))toast('tl.overlapHint')}else if(drag.collapse){msel.clear();renderTL();renderInspector()}drag=null}");

/* 5) clavier : Ctrl+A, Échap */
rep("  else if(C&&k==='b'){e.preventDefault();split()}\n  else if(C)return;", "  else if(C&&k==='b'){e.preventDefault();split()}\n  else if(C&&k==='a'){e.preventDefault();selectAll()}\n  else if(C)return;");
rep("  else if(e.key==='Delete'||e.key==='Backspace')e.shiftKey?rippleDel():del();", "  else if(e.key==='Delete'||e.key==='Backspace')e.shiftKey?rippleDel():del();\n  else if(e.key==='Escape'&&(sel!=null||msel.size))selectNone();");

/* 6) panneau de droite : bandeau du groupe */
rep("  renderInspector0();\n  const c=selClip(),k=c?c.id+'|'+insTab[kindOf(c)]:'proj';",
`  renderInspector0();
  const n=selIds().length;
  if(n>1){const b=$('#insp>.ibody');if(b)b.insertAdjacentHTML('afterbegin',\`<div class="mselbar"><b>\${T('msel.count',{count:n})}</b><p class="hint">\${T('msel.hint',{name:esc(clipName(selClip()))})}</p><div class="pre" style="margin:0"><button data-act="mdel">\${T('msel.delAll')}</button><button data-act="mdup">\${T('msel.dupAll')}</button><button data-act="mnone">\${T('msel.none')}</button></div></div>\`)}
  const c=selClip(),k=c?c.id+'|'+insTab[kindOf(c)]:'proj';`);
rep("silence:()=>cutSilences(c),", "silence:()=>cutSilences(c),mdel:del,mdup:dup,mnone:selectNone,");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.boxsel')) {
  css += `
/* sélection multiple */
.boxsel{position:absolute;z-index:8;pointer-events:none;border:1px solid var(--ac);background:rgba(var(--acrgb),.14);border-radius:2px}
.clip.msel{box-shadow:0 0 0 1px var(--ac);opacity:.95}
.mselbar{margin:0 0 12px;padding:9px 10px;border:1px solid rgba(var(--acrgb),.5);background:rgba(var(--acrgb),.09);border-radius:4px;font-size:12.5px}
.mselbar .hint{margin:4px 0 8px}
`;
  fs.writeFileSync(C, css);
}
console.log('sélection multiple ajoutée');

// v4.18 : plusieurs scènes (timelines) dans un même projet. Les médias, le format et le son général sont communs.
// La scène ouverte reste dans clips / tracks / markers (comme avant) ; les autres vont dans « scenes » (fichier, sauvegarde auto, versions de secours).
// Un projet à une seule scène est enregistré exactement comme avant. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), A = path.resolve(__dirname, '../../src/App.tsx'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };

/* barre des scènes dans la barre d'outils de la timeline */
a = rep(a, '            <button data-i18n-title="tl.markerTip" data-tb="mark" data-ico="marker" title="Marqueur (M)"></button>\n            <span className="sp"></span>',
           '            <button data-i18n-title="tl.markerTip" data-tb="mark" data-ico="marker" title="Marqueur (M)"></button>\n            <span className="vs"></span>\n            <div id="scbar"></div>');

/* données des scènes */
e = rep(e, "function applyExtras(o){", `/* ---------- scènes : plusieurs timelines dans un projet ---------- */
var scenes=null,curSc=0;
function scAll(){if(!scenes)scenes=[{id:1,name:'',clips,tracks,markers}];return scenes}
function scStore(){if(scenes){const s=scenes[curSc];if(s){s.clips=clips;s.tracks=tracks;s.markers=markers}}}
const scName=(s,i)=>s.name||T('scene.default',{n:i+1});
function scenesOut(){if(!scenes||scenes.length<2)return undefined;scStore();return{cur:curSc,list:scenes.map(s=>({id:s.id,name:s.name||'',clips:s.clips,tracks:s.tracks,markers:s.markers}))}}
function scenesIn(o){
  scenes=null;curSc=0;const L=o&&o.list;if(!Array.isArray(L)||L.length<2)return;
  const cur=clamp(o.cur|0,0,L.length-1);
  scenes=L.map((s,i)=>{const b={id:+s.id||i+1,name:String(s.name||'').slice(0,60)};
    if(i===cur)return Object.assign(b,{clips,tracks,markers});
    const tr=fixTracks(s.tracks),cl=(Array.isArray(s.clips)?s.clips:[]).filter(c=>c&&(!c.mid||mById(c.mid)));cl.forEach(c=>{if(!tr[c.track])c.track=0});
    return Object.assign(b,{clips:cl,tracks:tr,markers:Array.isArray(s.markers)?s.markers:[]})});
  curSc=cur;uid=Math.max(uid,...scenes.flatMap(s=>s.clips.map(c=>(c.id|0)+1)));
}
function scActivate(){for(const k of['video','over','audio']){const i=tracks.findIndex(t=>t.kind===k);if(i>=0)activeTk[k]=i}}
function switchScene(i){
  const L=scAll();if(i===curSc||!L[i])return;
  pause();scStore();const s=L[i];curSc=i;clips=s.clips;tracks=s.tracks;markers=s.markers;
  sel=null;msel.clear();time=0;scActivate();hist=[JSON.stringify({c:clips,t:tracks})];hi=0;
  renderScenes();refresh();renderInspector();autosave();
}
function newScene(){const L=scAll();scStore();L.push({id:Math.max(...L.map(s=>s.id))+1,name:'',clips:[],tracks:defTracks(),markers:[]});projDirty=true;switchScene(L.length-1)}
function dupScene(i){
  const L=scAll();scStore();const s=L[i];if(!s)return;
  const cl=JSON.parse(JSON.stringify(s.clips)).map(c=>Object.assign(c,{id:uid++}));
  L.splice(i+1,0,{id:Math.max(...L.map(x=>x.id))+1,name:T('scene.copy',{name:scName(s,i)}).slice(0,60),clips:cl,tracks:JSON.parse(JSON.stringify(s.tracks)),markers:[...s.markers]});
  if(curSc>i)curSc++;projDirty=true;switchScene(i+1);
}
function delScene(i){
  const L=scAll();if(L.length<2||!L[i])return;scStore();
  if(L[i].clips.length&&!confirm(T('scene.delConfirm',{name:scName(L[i],i)})))return;
  if(i===curSc)switchScene(i>0?i-1:1);
  L.splice(i,1);if(curSc>i)curSc--;projDirty=true;renderScenes();autosave();
}
function renameScene(i,n){const L=scAll();if(!L[i])return;L[i].name=String(n||'').trim().slice(0,60);projDirty=true;renderScenes();autosave()}
function renderScenes(){
  const b=$('#scbar');if(!b)return;
  b.innerHTML=scAll().map((s,i)=>\`<button class="sctab\${i===curSc?' on':''}" data-sc="\${i}" title="\${T('scene.tabTip')}">\${esc(scName(s,i))}</button>\`).join('')+\`<button class="scadd" data-scadd="1" title="\${T('scene.addTip')}">+</button>\`;
}
$('#scbar').addEventListener('click',e=>{const t=e.target.closest('button');if(!t||t.tagName!=='BUTTON')return;if(t.dataset.scadd){newScene();return}if(t.dataset.sc!=null)switchScene(+t.dataset.sc)});
$('#scbar').addEventListener('dblclick',e=>{
  const t=e.target.closest('[data-sc]');if(!t)return;const i=+t.dataset.sc,L=scAll();
  const inp=document.createElement('input');inp.className='scin';inp.value=scName(L[i],i);inp.maxLength=60;t.replaceWith(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;if(ok)renameScene(i,inp.value);else renderScenes()};
  inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')fin(true);if(ev.key==='Escape')fin(false)});inp.addEventListener('blur',()=>fin(true));
});
$('#scbar').addEventListener('contextmenu',e=>{
  const t=e.target.closest('[data-sc]');if(!t)return;e.preventDefault();const i=+t.dataset.sc,L=scAll();
  showCtx([{label:'scene.rename',fn:()=>{t.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))}},{label:'scene.duplicate',fn:()=>dupScene(i)},{label:'scene.add',fn:newScene},'-',{label:'scene.delete',danger:true,off:L.length<2,fn:()=>delScene(i)}],e.clientX,e.clientY);
});
window.addEventListener('dedcut-lang',renderScenes);
function applyExtras(o){`);
e = rep(e, "  masterVol=o.mvol??100;masterLim=o.mlim??true;if(master)master.gain.value=masterVol/100;if(limN)limiterSet(limN);\n}",
           "  masterVol=o.mvol??100;masterLim=o.mlim??true;if(master)master.gain.value=masterVol/100;if(limN)limiterSet(limN);\n  scenesIn(o.scenes);scActivate();renderScenes();hist=[];hi=-1;\n}");

/* enregistrement : sauvegarde auto, fichier .dedcut, versions de secours */
e = rep(e, "await DB.put('kv','project',{clips,W,H,uid,markers,tracks,bg:bgColor,", "await DB.put('kv','project',{clips,W,H,uid,markers,tracks,scenes:scenesOut(),bg:bgColor,");
e = rep(e, "const doc={format:'dedcut',v:3,app:appVersion(),saved:new Date().toISOString(),W,H,uid,clips,markers,tracks,bg:bgColor,", "const doc={format:'dedcut',v:3,app:appVersion(),saved:new Date().toISOString(),W,H,uid,clips,markers,tracks,scenes:scenesOut(),bg:bgColor,");
e = rep(e, "markers:[...markers],bg:bgColor,dur:total(),n:clips.length,why:why||''});", "markers:[...markers],scenes:JSON.parse(JSON.stringify(scenesOut()||null)),bg:bgColor,dur:total(),n:clips.length,why:why||''});");
e = rep(e, "  clips=(x.clips||[]).filter(c=>!c.mid||mById(c.mid));clips.forEach(c=>{if(!tracks[c.track])c.track=0});\n  uid=Math.max(uid,x.uid||1,",
           "  clips=(x.clips||[]).filter(c=>!c.mid||mById(c.mid));clips.forEach(c=>{if(!tracks[c.track])c.track=0});\n  scenesIn(x.scenes);scActivate();renderScenes();\n  uid=Math.max(uid,x.uid||1,");
/* l'historique annuler / rétablir repart de zéro à l'ouverture : applyExtras le vide, le commit() qui suit le remplit */

/* supprimer un média : vérifie et nettoie aussi les autres scènes */
e = rep(e, "function removeMedia(id){\n  const used=clips.some(c=>c.mid===id);",
           "function removeMedia(id){\n  const used=clips.some(c=>c.mid===id)||(scenes||[]).some((s,i)=>i!==curSc&&s.clips.some(c=>c.mid===id));\n  (scenes||[]).forEach((s,i)=>{if(i!==curSc)s.clips=s.clips.filter(c=>c.mid!==id)});");

/* export : rappel de la scène exportée quand il y en a plusieurs */
e = rep(e, "  $('#xInfo').textContent=[T('export.info',{", "  $('#xInfo').textContent=[scenes&&scenes.length>1&&T('scene.exported',{name:scName(scenes[curSc],curSc)}),T('export.info',{");

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('#scbar{')) {
  css += `
/* onglets des scènes (barre d'outils de la timeline) */
#scbar{flex:1;min-width:0;display:flex;align-items:center;gap:3px;overflow-x:auto;scrollbar-width:thin;padding:0 4px}
#scbar .sctab{flex:none;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 10px;font-size:11.5px;border-radius:3px;background:transparent;border:1px solid var(--line);color:var(--dim)}
#scbar .sctab.on{color:var(--txt);border-color:var(--ac);background:rgba(var(--acrgb),.14)}
#scbar .scadd{flex:none;width:24px;height:22px;padding:0;font-size:15px;line-height:1;border-radius:3px}
#scbar .scin{width:130px;font-size:11.5px;padding:2px 6px}
`;
  fs.writeFileSync(C, css);
}
console.log('scènes ajoutées');

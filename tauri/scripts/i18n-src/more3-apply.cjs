// v4.22 : rampes de vitesse, groupes de clips (Ctrl+G), répéter la musique, modèles prêts (onglet Formes), chapitres YouTube. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

/* ===== fonctions ===== */
rep("/* ---------- boutons & clavier ---------- */", `/* ---------- rampes de vitesse : le clip est découpé en 12 morceaux dont la vitesse suit une courbe ---------- */
const RAMPS={montage:u=>2.2-1.8*Math.sin(Math.PI*u),hero:u=>1-.75*Math.exp(-Math.pow((u-.5)/.16,2)),
  bullet:u=>{const q=clamp(Math.min((u-.18)/.14,(.82-u)/.14),0,1);return 1-.78*q*q*(3-2*q)},flashin:u=>1+2.5*Math.pow(1-u,2),flashout:u=>1+2.5*u*u,jump:u=>.45+1.6*Math.sin(Math.PI*u)};
function rampIcon(k){let d='';for(let i=0;i<=24;i++){const u=i/24,y=clamp(RAMPS[k](u)/3.2,0,1);d+=(i?'L':'M')+(3+u*28).toFixed(1)+' '+(19-y*15).toFixed(1)}return \`<svg viewBox="0 0 34 22" width="34" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 15.3h28" stroke-dasharray="2 2" opacity=".4"/><path d="\${d}"/></svg>\`}
function speedRamp(c,k){
  const m=c&&c.mid&&mById(c.mid);if(!m||m.type==='image'||c.p.rev){toast(T('ramp.no'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  const f=RAMPS[k],N=12,r0=c.p.rate||1,seg=c.dur*r0/N,oldEnd=c.start+c.dur,g=c.grp||uid++,parts=[];let t=c.start;
  for(let i=0;i<N;i++){const r=clamp(r0*f((i+.5)/N),.1,8),n=JSON.parse(JSON.stringify(c));n.id=uid++;n.in=c.in+i*seg;n.p.rate=r;n.dur=seg/r;n.start=t;t+=n.dur;delete n.kf;
    if(i>0){n.p.tin='none';n.p.afin=0}if(i<N-1){n.p.tout='none';n.p.afout=0}n.grp=g;parts.push(n)}
  const delta=t-oldEnd;clips=clips.filter(x=>x!==c);clips.forEach(x=>{if(x.track===c.track&&x.start>=oldEnd-.001)x.start=Math.max(0,x.start+delta)});
  clips.push(...parts);sel=parts[0].id;msel=new Set(parts.slice(1).map(n=>n.id));commit();refresh();toast(T('ramp.done',{name:T('ramp.'+k)}));
}
/* ---------- groupes : les clips groupés se sélectionnent et se déplacent ensemble ---------- */
function regroup(L){const m={};for(const n of L)if(n.grp){m[n.grp]=m[n.grp]||uid++;n.grp=m[n.grp]}}
function groupSel(){const g=selClips();if(g.length<2){toast(T('grp.need'));return}const id=uid++;g.forEach(x=>{x.grp=id});commit();renderTL();toast(T('grp.done',{count:g.length}))}
function ungroupSel(){const g=selClips();if(!g.some(x=>x.grp))return;const ids=new Set(g.map(x=>x.grp).filter(Boolean));clips.forEach(x=>{if(ids.has(x.grp))delete x.grp});commit();renderTL();toast(T('grp.undone'))}
/* ---------- répéter une musique jusqu'à la fin des images ---------- */
function loopMusic(c){
  if(!c||!c.mid)return;const vEnd=Math.max(0,...clips.filter(x=>isVid(x)||isOvr(x)).map(x=>x.start+x.dur)),end=vEnd||total();
  if(c.start+c.dur>=end-.05){toast(T('loop.none'));return}
  let t=c.start+c.dur,n=0;const g=c.grp||uid++;c.grp=g;
  while(t<end-.05&&n<300){const k=JSON.parse(JSON.stringify(c));k.id=uid++;k.start=t;k.dur=Math.min(c.dur,end-t);k.p.afin=.03;k.p.afout=t+c.dur>=end-.05?Math.min(2,k.dur/3):.03;delete k.kf;clips.push(k);t+=k.dur;n++}
  commit();refresh();toast(T('loop.done',{count:n}));
}
/* ---------- chapitres YouTube à partir des marqueurs ---------- */
function copyChapters(){
  const ms=[...new Set(markers.map(t=>Math.floor(t)))].sort((a,b)=>a-b);if(!ms.length){toast(T('chap.none'));return}
  const f=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(x).padStart(2,'0')};
  const L=[];if(ms[0]>0)L.push('0:00 '+T('chap.intro'));ms.forEach((s,i)=>L.push(f(s)+' '+T('chap.name',{n:i+1})));
  const txt=L.join('\\n');(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast(T('chap.done'))).catch(()=>{window.prompt('',txt)});
}

/* ---------- boutons & clavier ---------- */`);

/* panneau Vitesse : rampes */
rep("+'<p class=\"hint\" style=\"margin:0\">'+T('speed.hint')+(p.rev?' '+T('speed.reverseHint'):'')+'</p>');",
    "+'<p class=\"hint\" style=\"margin:0\">'+T('speed.hint')+(p.rev?' '+T('speed.reverseHint'):'')+'</p>');\n    if(c.mid&&!p.rev)h+=S(T('ramp.title'),'<div class=\"easegrid\">'+Object.keys(RAMPS).map(k=>`<button data-ramp=\"${k}\" title=\"${T('ramp.'+k)}\">${rampIcon(k)}<span>${T('ramp.'+k)}</span></button>`).join('')+'</div><p class=\"hint\" style=\"margin:6px 0 0\">'+T('ramp.hint')+'</p>');");
rep("  if(d.vcat){vCat=d.vcat;renderInspector();return}", "  if(d.vcat){vCat=d.vcat;renderInspector();return}\n  if(d.ramp){speedRamp(c,d.ramp);return}");

/* groupes : clic, glisser, duplication, collage, son détaché */
rep("    if(mod){toggleSel(c);renderTL();renderInspector();return}\n", "    if(mod){toggleSel(c);renderTL();renderInspector();return}\n    if(c.grp&&!(msel.size&&(c.id===sel||msel.has(c.id)))){sel=c.id;msel=new Set(clips.filter(x=>x.grp===c.grp&&x.id!==c.id).map(x=>x.id))}\n");
rep(",grp,collapse:inGroup};", ",grp,collapse:inGroup&&!c.grp};");
rep("const made=g.map(c=>{const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=c.start+(b-a);clips.push(n);return n});", "const made=g.map(c=>{const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.start=c.start+(b-a);clips.push(n);return n});regroup(made);");
rep("clips.push(n);return n});\n  sel=made[0].id;", "clips.push(n);return n});regroup(made);\n  sel=made[0].id;");
rep("  clips.push(placeFree(newClip({track:tk('audio'),mid:c.mid,start:c.start,dur:c.dur,in:c.in,p:{vol:c.p.vol??100,rate:c.p.rate||1,rev:!!c.p.rev}})));",
    "  const au=placeFree(newClip({track:tk('audio'),mid:c.mid,start:c.start,dur:c.dur,in:c.in,p:{vol:c.p.vol??100,rate:c.p.rate||1,rev:!!c.p.rev}}));clips.push(au);if(!c.grp)c.grp=uid++;au.grp=c.grp; // vidéo et son restent groupés");
rep("  if(c.lc)h+=`<i class=\"lct\"", "  if(c.grp)h+='<i class=\"grpb\"></i>';\n  if(c.lc)h+=`<i class=\"lct\"");
rep("  {id:'selAll',n:'kb.selAll',d:['ctrl+a'],f:()=>selectAll()},", "  {id:'selAll',n:'kb.selAll',d:['ctrl+a'],f:()=>selectAll()},\n  {id:'group',n:'grp.group',d:['ctrl+g'],f:()=>groupSel()},\n  {id:'ungroup',n:'grp.ungroup',d:['ctrl+shift+g'],f:()=>ungroupSel()},");
rep("    {label:T('mkcut.menu'),", "    {label:T('grp.group'),key:kbLabel('group'),off:selClips().length<2,fn:groupSel},\n    {label:T('grp.ungroup'),key:kbLabel('ungroup'),off:!c.grp,fn:ungroupSel},\n    {label:T('mkcut.menu'),");

/* musique : répéter jusqu'à la fin */
rep("<button data-act=\"beats\">${T('audio.beats')}</button>", "<button data-act=\"beats\">${T('audio.beats')}</button>${isAud(c)?`<button data-act=\"loopmus\">${T('loop.btn')}</button>`:''}");
rep("silence:()=>cutSilences(c),", "silence:()=>cutSilences(c),loopmus:()=>loopMusic(c),");
rep("    items.push({label:(c.p.vol??100)>0?T('audio.mute'):T('audio.unmute'),fn:()=>toggleMute(c)},'-');", "    if(isAud(c))items.push({label:T('loop.btn'),fn:()=>loopMusic(c)});\n    items.push({label:(c.p.vol??100)>0?T('audio.mute'):T('audio.unmute'),fn:()=>toggleMute(c)},'-');");

/* chapitres : clic droit dans le vide */
rep("      {label:T('menu.clearMarkers'),", "      {label:T('chap.copy'),off:!markers.length,fn:copyChapters},\n      {label:T('menu.clearMarkers'),");

/* ===== modèles (onglet Formes, catégorie « Modèles ») ===== */
rep("const WCATS=['bar','count','timer','social','tag','fun','tools','shape','stick'];", `/* modèles : plusieurs éléments posés d'un coup (groupés), textes à changer ensuite */
const TPLS={
  intro:{n:'tpl.intro',dur:5,build:()=>[{k:'text',st:'epic',start:0,dur:5,p:{text:T('tplc.title'),y:42,size:Math.round(H/9)}},{k:'text',st:'clean',start:.4,dur:4.6,p:{text:T('tplc.ep'),y:56,size:Math.round(H/18)}},{k:'gen',g:'sub',s:'bell',start:1.6,dur:3.4,p:{y:78}}]},
  outro:{n:'tpl.outro',dur:6,build:()=>[{k:'gen',g:'confetti',start:0,dur:3,p:{y:30}},{k:'text',st:'classic',start:0,dur:6,p:{text:T('tplc.thanks'),y:30,size:Math.round(H/10)}},{k:'gen',g:'sub',s:'sub',start:.6,dur:3,p:{y:58}},{k:'gen',g:'sub',s:'like',start:3.2,dur:2.8,p:{y:60,text:T('wdg.like'),color:'#ff4d6d'}}]},
  short:{n:'tpl.short',dur:8,build:()=>[{k:'text',st:'story',start:0,dur:8,p:{text:T('tplc.wait'),y:14,size:Math.round(H/16)}},{k:'gen',g:'pbar',s:'pill',start:0,dur:8,p:{w:86,y:95,th:1.2}},{k:'gen',g:'hearts',s:'heart',start:1,dur:7,p:{}},{k:'gen',g:'swipe',s:'up',start:5.5,dur:2.5,p:{y:84,text:T('wdg.swipeUp')}}]},
  tuto:{n:'tpl.tuto',dur:6,build:()=>[{k:'gen',g:'lower',s:'lbar',start:0,dur:5,p:{}},{k:'text',st:'pill',start:.3,dur:5.7,p:{text:T('tplc.step'),y:10,size:Math.round(H/18)}},{k:'gen',g:'arrowp',s:'arrow',start:2,dur:4,p:{x:70,y:45,rot:135,size:8}}]},
  gaming:{n:'tpl.gaming',dur:8,build:()=>[{k:'gen',g:'rec',s:'live',start:0,dur:8,p:{text:T('wdg.live'),x:4,y:8}},{k:'gen',g:'timer',s:'digital',start:0,dur:8,p:{x:88,y:9,size:6,color:'#4ade80'}},{k:'gen',g:'lower',s:'lbox',start:.5,dur:5,p:{name:T('tplc.gamer'),title:T('tplc.gamerSub'),color:'#22c55e',y:82}}]},
  review:{n:'tpl.review',dur:6,build:()=>[{k:'text',st:'thumb',start:0,dur:6,p:{text:T('tplc.verdict'),y:30,size:Math.round(H/10)}},{k:'gen',g:'stars',start:.6,dur:5.4,p:{value:4.5,y:50,size:9}},{k:'gen',g:'sub',s:'like',start:2.4,dur:3.6,p:{x:80,y:72,text:T('wdg.like'),color:'#ff4d6d'}}]}
};
function tplSpecs(id,t0){return TPLS[id].build().map(s=>{
  if(s.k==='text'){const c=textClip(s.st,t0+s.start);c.dur=s.dur;Object.assign(c.p,s.p);return c}
  const d=WDEF[s.g]();if(s.s)d.p.st=s.s;Object.assign(d.p,s.p);return newClip({track:tk('over'),gen:s.g,start:t0+s.start,dur:s.dur,p:d.p})})}
function insertTpl(id){const made=tplSpecs(id,time),g=uid++;made.forEach(c=>{c.grp=g;clips.push(c)});sel=made[0].id;msel=new Set(made.slice(1).map(c=>c.id));commit();refresh();toast(T('tpl.added'))}
const WCATS=['tpl','bar','count','timer','social','tag','fun','tools','shape','stick'];`);
rep("const WLIB=[\n", "const WLIB=[\n  ...Object.keys(TPLS).map(k=>({c:'tpl',tpl:k,n:TPLS[k].n,tt:TPLS[k].dur*.5})),\n");
rep("    const c=wlClip(x,true);drawGenOverlay(c,Math.min(t,c.dur-.02))}", "    if(x.tpl){for(const c of tplSpecs(x.tpl,0)){if(t>=c.start&&t<c.start+c.dur){if(c.gen)drawGenOverlay(c,t);else drawText(c,t,g2)}boxes.delete(c.id)}return}\n    const c=wlClip(x,true);drawGenOverlay(c,Math.min(t,c.dur-.02))}");
rep("dur=wlClip(x,true).dur,", "dur=x.tpl?TPLS[x.tpl].dur:wlClip(x,true).dur,");
rep("const x=WLIB[+b.dataset.wl],c=wlClip(x,false);", "const x=WLIB[+b.dataset.wl];if(x.tpl){insertTpl(x.tpl);return}const c=wlClip(x,false);");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.grpb{')) {
  css += `
/* clip groupé : petit maillon en haut à droite */
.clip .grpb{position:absolute;right:5px;top:4px;width:12px;height:7px;border:1.5px solid rgba(255,255,255,.85);border-radius:4px;z-index:4;pointer-events:none}
.clip .grpb::after{content:"";position:absolute;left:3px;top:1px;width:5px;height:2px;background:rgba(255,255,255,.85);border-radius:1px}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.22 : rampes, groupes, boucle, modèles, chapitres');

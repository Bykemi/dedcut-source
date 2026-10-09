// Suppression des silences (cahier des charges §12) : aperçu avant suppression + marge avant/après.
// 1) « Détecter les silences » analyse le clip et affiche les zones à retirer en rouge sur la timeline.
// 2) Un encadré dans le panneau propose : Couper / Silence suivant / Annuler. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

/* réglage « marge » + bouton qui détecte au lieu de couper + encadré d'aperçu */
rep("<option value=\"${v}\" ${silCfg.min===v?'selected':''}>${n}</option>`).join('')}</select></div></div><div class=\"pre\" style=\"margin:0\"><button data-act=\"silence\">${T('audio.cutSilences')}</button>",
  "<option value=\"${v}\" ${silCfg.min===v?'selected':''}>${n}</option>`).join('')}</select></div></div><div class=\"fld\"><label>${T('audio.silPad')}</label><select id=\"silPad\">${[[.05,'0,05 s'],[.12,'0,12 s'],[.25,'0,25 s'],[.5,'0,5 s']].map(([v,n])=>`<option value=\"${v}\" ${silCfg.pad===v?'selected':''}>${n}</option>`).join('')}</select></div>${silBox(c)}<div class=\"pre\" style=\"margin:0\"><button data-act=\"silence\">${T('audio.findSilences')}</button>");
rep("silence:()=>cutSilences(c),", "silence:()=>cutSilences(c),silApply,silCancel,silNext,");

rep("const silCfg={db:-38,min:.6};\n$('#insp').addEventListener('change',e=>{if(e.target.id==='silThr')silCfg.db=+e.target.value;if(e.target.id==='silMin')silCfg.min=+e.target.value});",
`const silCfg={db:-38,min:.6,pad:.12};
$('#insp').addEventListener('change',e=>{if(e.target.id==='silThr')silCfg.db=+e.target.value;if(e.target.id==='silMin')silCfg.min=+e.target.value;if(e.target.id==='silPad')silCfg.pad=+e.target.value});
/* aperçu : rien n'est coupé tant que l'utilisateur n'a pas validé */
let silPrev=null;
const silKey=c=>[c.start,c.in,c.dur,c.p.rate||1,c.track].join('|');
function silValid(){if(!silPrev)return null;const c=clips.find(x=>x.id===silPrev.cid);if(!c||silKey(c)!==silPrev.key){silPrev=null;return null}return silPrev}
function silZones(){const s=silValid();if(!s)return[];const c=clips.find(x=>x.id===s.cid),r=c.p.rate||1,z=[];let p=s.a0;
  for(const[a,b]of[...s.segs,[s.a1,s.a1]]){if(a-p>.001)z.push([c.start+(p-s.a0)/r,c.start+(a-s.a0)/r]);p=b}return z}
function silBox(c){const s=silValid();if(!s||s.cid!==c.id)return'';
  return\`<div class="silprev"><b>\${T('audio.silPreview',{count:s.runs,sec:Math.round(s.removed*10)/10})}</b><div class="pre" style="margin:6px 0 0"><button class="pri" data-act="silApply">\${T('audio.silApply')}</button><button data-act="silNext">\${T('audio.silNext')}</button><button data-act="silCancel">\${T('common.cancel')}</button></div></div>\`}
function silCancel(){silPrev=null;renderTL();renderInspector()}
function silNext(){const z=silZones();if(!z.length)return;const n=z.find(q=>q[0]>time+.05)||z[0];pause();seek(Math.max(0,n[0]-1))}
function silApply(){const s=silValid();if(!s){renderTL();renderInspector();return}const c=clips.find(x=>x.id===s.cid);silPrev=null;silCut(c,s.segs,s.runs)}`);

// l'analyse s'arrête à l'aperçu ; la coupe passe dans silCut()
rep("  const mask=new Uint8Array(n).fill(1),minW=Math.round(silCfg.min/W2),pad=Math.round(.12/W2);let runs=0;",
    "  const mask=new Uint8Array(n).fill(1),minW=Math.round(silCfg.min/W2),pad=Math.round(silCfg.pad/W2);let runs=0;");
rep("  if(!runs){toast(T('audio.noSilence'));return}\n",
`  if(!runs){toast(T('audio.noSilence'));return}
  const kept=segs.reduce((x,sg)=>x+(sg[1]-sg[0]),0);
  silPrev={cid:c.id,key:silKey(c),segs,runs,a0,a1,removed:(a1-a0-kept)/rate};
  sel=c.id;renderTL();renderInspector();silNext();
}
function silCut(c,segs,runs){
  const rate=c.p.rate||1;
`);
e = e.replace("  sel=first.id;commit();refresh();toast(T('audio.silencesCut',{count:runs,sec:Math.round(removed*10)/10}));",
  () => "  sel=first.id;commit();refresh();toast(T('audio.silencesCut',{count:runs,sec:Math.round(removed*10)/10}));");

/* zones rouges dans la timeline */
rep("    for(const c of clips.filter(c=>c.track===r))h+=clipHTML(c);\n",
`    for(const c of clips.filter(c=>c.track===r))h+=clipHTML(c);
    if(silPrev&&silValid()&&clips.find(x=>x.id===silPrev.cid).track===r)h+=silZones().map(([a,b])=>\`<div class="silz" style="left:\${a*pxs}px;width:\${Math.max(2,(b-a)*pxs)}px"></div>\`).join('');
`);

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.silz{')) {
  css += `
/* aperçu de la suppression des silences */
.silz{position:absolute;top:3px;bottom:3px;z-index:4;pointer-events:none;border-left:1px solid #ef4444;border-right:1px solid #ef4444;background:repeating-linear-gradient(135deg,rgba(239,68,68,.5) 0 5px,rgba(239,68,68,.22) 5px 10px)}
.silprev{margin:10px 0;padding:8px 10px;border:1px solid rgba(239,68,68,.55);background:rgba(239,68,68,.08);border-radius:3px;font-size:12px}
`;
  fs.writeFileSync(C, css);
}
console.log('silences : aperçu ajouté');

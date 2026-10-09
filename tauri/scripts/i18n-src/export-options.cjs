// Export (cahier des charges §8) : 24/25/30/50/60 i/s, qualité basse/moyenne/haute/maximale/personnalisée,
// temps écoulé + temps restant (aussi pour le WebM). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const A = path.resolve(__dirname, '../../src/App.tsx'), E = path.resolve(__dirname, '../../public/engine.js');
let a = fs.readFileSync(A, 'utf8'), e = fs.readFileSync(E, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };

/* App.tsx */
a = rep(a, '<option value="24">24</option><option value="30">30</option><option value="60">60</option>',
  '<option value="24">24</option><option value="25">25</option><option value="30">30</option><option value="50">50</option><option value="60">60</option>');
a = rep(a, '<option data-i18n="export.qNormal" value="5">Normale (léger)</option><option data-i18n="export.qHigh" value="10">Haute</option><option data-i18n="export.qMax" value="20">Maximale</option></select></div>\n          </div>',
  '<option data-i18n="export.qLow" value="2.5">Basse</option><option data-i18n="export.qMedium" value="5">Moyenne</option><option data-i18n="export.qHigh" value="10">Haute</option><option data-i18n="export.qMax" value="20">Maximale</option><option data-i18n="export.qCustom" value="c">Personnalisée</option></select></div>\n          </div>\n          <div className="fld" id="xQcF" hidden><label data-i18n="export.customRate">Débit vidéo (Mbit/s)</label><input type="number" id="xQc" min="0.5" max="80" step="0.5" defaultValue="8" /></div>');

/* engine.js */
e = rep(e, "  const[w,h]=expDims();\n  return{v:Math.round(",
  "  if($('#xQ').value==='c')return{v:Math.round(clamp(+$('#xQc').value||8,.5,80)*1e6),a:192000};\n  const[w,h]=expDims();\n  return{v:Math.round(");
e = rep(e, "function expInfo(){\n", "function expInfo(){\n  $('#xQcF').hidden=$('#xQ').value!=='c'||$('#xQ').disabled;\n");
e = rep(e, "['#xQ','#xFps','#xFmt','#xRes'].forEach(s=>$(s).addEventListener('change',expInfo));",
  "['#xQ','#xFps','#xFmt','#xRes'].forEach(s=>$(s).addEventListener('change',expInfo));\n$('#xQc').addEventListener('input',expInfo);");
e = rep(e, "let expRestore=null;", "let expRestore=null,expT0=0;");
// progression : % · écoulé · restant
e = rep(e, "  $('#xPct').textContent=window.i18n.fmt.percent(Math.min(1,q))+(q>.02?' · '+T('export.remaining',{time:fmt(rest).replace(/\\.\\d$/,'')}):'');",
  "  const tm=x=>fmt(x).replace(/\\.\\d$/,'');\n  $('#xPct').textContent=[window.i18n.fmt.percent(Math.min(1,q)),T('export.elapsed',{time:tm(el)}),q>.02&&q<1&&T('export.remaining',{time:tm(rest)})].filter(Boolean).join(' · ');");
e = rep(e, "  if(exporting){const q=100*time/Math.max(total(),.01);$('#bar i').style.width=q+'%';$('#xPct').textContent=Math.floor(q)+' %'}",
  "  if(exporting)xProgress(Math.min(1,time/Math.max(total(),.01)),expT0);");
e = rep(e, "spk.gain.value=0;exporting=true;time=0;", "spk.gain.value=0;exporting=true;time=0;expT0=performance.now();");

new Function(e);
fs.writeFileSync(A, a); fs.writeFileSync(E, e);
console.log('export : options ajoutées');

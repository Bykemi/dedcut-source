// Retouches manuelles du moteur pour la traduction (après i18n-apply.cjs).
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js');
let s = fs.readFileSync(E, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + a.slice(0, 100)); s = s.replace(a, () => b); };

/* 1) variables locales nommées T (elles masqueraient la fonction de traduction) */
rep('async function mixAudio(T){\n  const sc=', 'async function mixAudio(TD){\n  const sc=');
rep('new OfflineAudioContext(2,Math.ceil(T*48000)+1,48000)', 'new OfflineAudioContext(2,Math.ceil(TD*48000)+1,48000)');
rep('  const T=total(),N=Math.max(1,Math.ceil(T*fps)),t0=performance.now();', '  const TD=total(),N=Math.max(1,Math.ceil(TD*fps)),t0=performance.now();');
rep('const audio=await mixAudio(T);', 'const audio=await mixAudio(TD);');
rep('const estMB=(br.v+br.a)*T/8388608;', 'const estMB=(br.v+br.a)*TD/8388608;');
rep("  const p=XPRE[$('#xPre').value],T=Math.max(.5,total());", "  const p=XPRE[$('#xPre').value],TD=Math.max(.5,total());");
rep('Math.round(p.mb*8388608*.93/T-128000)', 'Math.round(p.mb*8388608*.93/TD-128000)');

/* 2) fonction de traduction tout en haut (utilisée dès le chargement) */
rep('const T=(k,v)=>window.t?window.t(k,v):k;\n', '');
rep('const clamp=', '/* traduction : t() vient de src/i18n.ts ; sans lui, la clé est affichée telle quelle */\nconst T=(k,v)=>window.t?window.t(k,v):k;\nconst clamp=');

/* 3) retouches précises (fichier .blocks) */
const src = fs.readFileSync(path.join(__dirname, 'engine-manual.blocks'), 'utf8').replace(/\r\n/g, '\n');
const parts = src.split(/^@@@ (FIND|REPLACE|END)\n?/m);
let find = null, n = 0;
for (let i = 1; i < parts.length; i += 2) {
  const tag = parts[i], body = parts[i + 1].replace(/\n$/, '');
  if (tag === 'FIND') find = body; else if (tag === 'REPLACE') { rep(find, body); n++; }
}

/* 4) thème courant mémorisé pour la liste des couleurs */
rep('function setTheme(k){', 'function setTheme(k){ACCK=THEMES[k]?k:\'violet\';');

/* 5) changement de langue : tout ce que le moteur affiche est recalculé immédiatement */
rep('/* ---------- démarrage : restauration de la dernière session ---------- */',
`/* ---------- changement de langue (sans redémarrer) ---------- */
window.addEventListener('dedcut-lang',()=>{
  renderSounds();renderShapes();renderThemes();buildLib();renderBin();refresh();
  if(setSave.last)setSave(setSave.last);
  if(typeof vo!=='undefined'&&vo)voBtn(true);
  if(!$('#t-rec').hidden&&!recState){loadSources();loadMics();loadCams()}
});

/* ---------- démarrage : restauration de la dernière session ---------- */`);

new Function(s);
fs.writeFileSync(E, s);
console.log(n + ' retouches appliquées, syntaxe OK');

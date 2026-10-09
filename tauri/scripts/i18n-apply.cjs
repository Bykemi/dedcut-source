// Applique la table maîtresse des traductions (scripts/i18n-src/*.js) :
//  1) écrit les clés dans public/locales/<langue>.json (fusion avec l'existant)
//  2) remplace les textes français du moteur (public/engine.js) par des clés
//  3) ajoute data-i18n / data-i18n-title / data-i18n-ph dans src/App.tsx
// Utilisation : node scripts/i18n-apply.cjs [--locales-only]
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zh-CN'];
const rows = [...require('./i18n-src/ui.cjs'), ...require('./i18n-src/image1.cjs'), ...require('./i18n-src/image2.cjs'), ...require('./i18n-src/image3.cjs'), ...require('./i18n-src/image4.cjs'), ...require('./i18n-src/image5.cjs'), ...require('./i18n-src/image6.cjs'), ...require('./i18n-src/image7.cjs'), ...require('./i18n-src/facefx.cjs'), ...require('./i18n-src/thumb.cjs'), ...require('./i18n-src/spaces-ai.cjs'), ...require('./i18n-src/capture.cjs'), ...require('./i18n-src/ed.cjs'), ...require('./i18n-src/captions.cjs'), ...require('./i18n-src/window.cjs'), ...require('./i18n-src/tracks.cjs'), ...require('./i18n-src/safety.cjs'), ...require('./i18n-src/clean.cjs'), ...require('./i18n-src/reframe.cjs'), ...require('./i18n-src/reverse-gif.cjs'), ...require('./i18n-src/scenes.cjs'), ...require('./i18n-src/autozoom.cjs'), ...require('./i18n-src/proxy.cjs'), ...require('./i18n-src/misc.cjs'), ...require('./i18n-src/aigen.cjs'), ...require('./i18n-src/aimodels.cjs'), ...require('./i18n-src/aiui.cjs'), ...require('./i18n-src/looks.cjs'), ...require('./i18n-src/effects.cjs'), ...require('./i18n-src/profx.cjs'), ...require('./i18n-src/transitions.cjs'), ...require('./i18n-src/transitions2.cjs'), ...require('./i18n-src/topbar.cjs'), ...require('./i18n-src/layout.cjs'),...require('./i18n-src/tour.cjs'),...require('./i18n-src/detach.cjs'),...require('./i18n-src/audiotl.cjs'),...require('./i18n-src/textpro.cjs'),...require('./i18n-src/voicepro.cjs'),...require('./i18n-src/preview-tools.cjs'),...require('./i18n-src/multisel.cjs'),...require('./i18n-src/easing.cjs'),...require('./i18n-src/freemask.cjs'),...require('./i18n-src/keys.cjs'),...require('./i18n-src/scenes2.cjs'),...require('./i18n-src/more1.cjs'),...require('./i18n-src/widgets2.cjs'),...require('./i18n-src/more2.cjs'),...require('./i18n-src/more3.cjs'),...require('./i18n-src/perf1.cjs'),...require('./i18n-src/more4.cjs'),...require('./i18n-src/aimcp.cjs'), ...require('./i18n-src/chat.cjs'), ...require('./i18n-src/updates.cjs'), ...require('./i18n-src/icons.cjs'), ...require('./i18n-src/dcai.cjs'),...require('./i18n-src/dcai-q.cjs'),...require('./i18n-src/brain.cjs'),...require('./i18n-src/fxperson.cjs'), ...require('./i18n-src/mlib.cjs'), ...require('./i18n-src/rec2.cjs'), ...require('./i18n-src/live.cjs'), ...require('./i18n-src/studio.cjs'),...require('./i18n-src/chatplus.cjs'),...require('./i18n-src/widgets-live.cjs'),...require('./i18n-src/live-extras.cjs'),...require('./i18n-src/live-pro.cjs'),...require('./i18n-src/live-module.cjs'),...require('./i18n-src/live-community.cjs'),...require('./i18n-src/montage1.cjs'),...require('./i18n-src/montage2.cjs'),...require('./i18n-src/montage3.cjs'),...require('./i18n-src/layout2.cjs'), ...require('./i18n-src/music1.cjs'), ...require('./i18n-src/music2.cjs'), ...require('./i18n-src/music3.cjs'), ...require('./i18n-src/music4.cjs'), ...require('./i18n-src/music5.cjs'), ...require('./i18n-src/music6.cjs'), ...require('./i18n-src/overlays.cjs'), ...require('./i18n-src/home2.cjs'), ...require('./i18n-src/plus454.cjs'), ...require('./i18n-src/plus455.cjs'), ...require('./i18n-src/plus456.cjs'), ...require('./i18n-src/plus457.cjs'), ...require('./i18n-src/plus460.cjs'), ...require('./i18n-src/plus461.cjs'), ...require('./i18n-src/live-tiktok.cjs'), ...require('./i18n-src/live-vertical.cjs'), ...require('./i18n-src/gamehud.cjs'), ...require('./i18n-src/perf-live.cjs'), ...require('./i18n-src/bugfix464.cjs'), ...require('./i18n-src/plus465.cjs'), ...require('./i18n-src/beta466.cjs'), ...require('./i18n-src/bug467.cjs')];
const onlyLocales = process.argv.includes('--locales-only');

/* ---------- contrôle de la table ---------- */
const keys = new Set(), byFr = new Map();
for (const r of rows) {
  if (r.length !== 10) throw new Error('ligne incomplète : ' + r[0]);
  if (keys.has(r[0])) throw new Error('clé en double : ' + r[0]);
  keys.add(r[0]);
  if (typeof r[1] === 'string') {
    if (byFr.has(r[1])) console.log(`  (même texte français pour ${byFr.get(r[1])} et ${r[0]} : on garde ${byFr.get(r[1])})`);
    else byFr.set(r[1], r[0]);
  }
}

/* ---------- 1) fichiers de langue ---------- */
for (let i = 0; i < LANGS.length; i++) {
  const f = path.join(root, 'public', 'locales', LANGS[i] + '.json');
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of rows) {
    const parts = r[0].split('.'); let o = data;
    for (const p of parts.slice(0, -1)) { if (typeof o[p] !== 'object' || !o[p]) o[p] = {}; o = o[p]; }
    o[parts[parts.length - 1]] = r[i + 1];
  }
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
}
console.log(`Langues : ${rows.length} clés écrites dans ${LANGS.length} fichiers.`);
// depuis la v4.27 le moteur est découpé (public/engine/*.js) : seuls les fichiers de langue sont mis à jour
if (onlyLocales || !fs.existsSync(path.join(root, 'public', 'engine.js'))) { if (!onlyLocales) console.log('Moteur découpé : seuls les fichiers de langue ont été mis à jour.'); process.exit(0); }

/* ---------- 2) moteur ---------- */
const E = path.join(root, 'public', 'engine.js');
const lines = fs.readFileSync(E, 'utf8').split('\n');
// dictionnaires calculés au chargement : on y met la clé seule (traduite à l'affichage)
const DICT = /^(?:const (?:FXN|TRN|CPN|GN|TABS|BLEND|AUPRE|SHAPES|SHPLIB|TPRE|SOUNDS|FXPRE|TH)=)/;
const unesc = s => s.replace(/\\(.)/g, (m, c) => (c === 'n' ? '\n' : c));
let depth = 0, inDict = false, nQ = 0, nNow = 0;
for (let n = 0; n < lines.length; n++) {
  const l = lines[n];
  if (l.length > 3000) continue; // logo encodé
  if (!inDict && DICT.test(l)) inDict = true;
  lines[n] = l.replace(/'((?:[^'\\\n]|\\.)*)'/g, (m, raw) => {
    const key = byFr.get(unesc(raw));
    if (!key) return m;
    if (inDict && !key.startsWith('content.')) { nQ++; return `'${key}'`; }
    nNow++; return `T('${key}')`;
  });
  if (inDict) {
    for (const ch of l.replace(/'(?:[^'\\]|\\.)*'/g, '')) { if (ch === '{' || ch === '[') depth++; else if (ch === '}' || ch === ']') depth--; }
    if (depth <= 0) { inDict = false; depth = 0; }
  }
}
fs.writeFileSync(E, lines.join('\n'));
console.log(`Moteur : ${nQ} textes de dictionnaires → clés, ${nNow} textes → T('clé').`);

/* ---------- 3) mise en page (App.tsx) ---------- */
const A = path.join(root, 'src', 'App.tsx');
let src = fs.readFileSync(A, 'utf8');
const dec = s => s.replace(/&amp;/g, '&').replace(/&#10;/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const tokRe = /<(\/?)([a-zA-Z][\w]*)((?:\s+[\w:-]+(?:=(?:"[^"]*"|\{[^}]*\}+))?)*)\s*(\/?)>|([^<]+)/g;
const stack = [], edits = [], manual = [];
let m;
while ((m = tokRe.exec(src))) {
  if (m[5] !== undefined) { const top = stack[stack.length - 1]; if (top && m[5].trim() && !/^\s*\{[\s\S]*\}\s*$/.test(m[5])) top.texts.push(m[5].trim()); continue; }
  const [, close, tag, attrs, self] = m;
  if (close) { const el = stack.pop(); if (el) finish(el); continue; }
  const el = { tag, attrs, at: m.index + 1 + tag.length, texts: [] };
  // attributs visibles
  for (const [, a, v] of attrs.matchAll(/\s(title|placeholder)="([^"]*)"/g)) {
    const key = byFr.get(dec(v));
    if (key && !attrs.includes(a === 'title' ? 'data-i18n-title' : 'data-i18n-ph')) edits.push([el.at, ` ${a === 'title' ? 'data-i18n-title' : 'data-i18n-ph'}="${key}"`]);
    else if (!key) manual.push(`${a}="${v}"`);
  }
  if (self) continue;
  stack.push(el);
}
function finish(el) {
  if (!el.texts.length || el.attrs.includes('data-i18n=')) return;
  if (el.texts.length > 1) { manual.push(`<${el.tag}> plusieurs textes : ${el.texts.join(' | ')}`); return; }
  const key = byFr.get(dec(el.texts[0]));
  if (key) edits.push([el.at, ` data-i18n="${key}"`]); else manual.push(`<${el.tag}> ${el.texts[0]}`);
}
edits.sort((a, b) => b[0] - a[0]).forEach(([at, ins]) => { src = src.slice(0, at) + ins + src.slice(at); });
fs.writeFileSync(A, src);
console.log(`Mise en page : ${edits.length} marqueurs ajoutés.`);
if (manual.length) console.log('À traiter à la main dans App.tsx :\n  ' + manual.join('\n  '));

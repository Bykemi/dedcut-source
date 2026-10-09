// Découpe public/engine.js en morceaux thématiques (public/engine/NN-nom.js), chargés dans l'ordre par src/main.tsx.
// Ce sont des scripts classiques : ils partagent les mêmes variables globales, le comportement reste identique.
// Vérification : un morceau ne doit rien EXÉCUTER au chargement qui soit déclaré dans un morceau suivant
// (dans un seul fichier, les fonctions étaient « remontées » ; en morceaux, ce n'est plus le cas).
// Utilisation : node scripts/split-engine.cjs [--write]
const fs = require('fs'), path = require('path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'public', 'engine.js'), 'utf8');
const lines = src.split('\n');
// auto-test : DEDCUT_SPLIT_SELFTEST=1 ajoute des appels interdits pour vérifier que le contrôle les voit
const selfTest = !!process.env.DEDCUT_SPLIT_SELFTEST;
if (selfTest) lines[5] += ' [1].forEach(()=>renderTL()); window.x=openChat; $("#a").onclick=()=>undo2();';
// [première ligne (titre de section), nom]
const PARTS = [
  [1, 'base'], [225, 'audio'], [367, 'media'], [581, 'elements'], [1114, 'edit'], [1255, 'render'], [2020, 'timeline'],
  [2299, 'inspector'], [2712, 'export'], [3116, 'tools'], [3761, 'extras'], [4146, 'ai'], [4331, 'keys'], [4431, 'project'],
  [4735, 'panels'], [5276, 'boot']
];
const parts = PARTS.map(([from, name], i) => {
  const to = i + 1 < PARTS.length ? PARTS[i + 1][0] - 1 : lines.length;
  return { name: String(i + 1).padStart(2, '0') + '-' + name, code: lines.slice(from - 1, to).join('\n') };
});
if (!selfTest && parts.map(p => p.code).join('\n') !== src) throw new Error('découpage incomplet');

const declared = parts.map(() => new Set());
const parsed = parts.map((p, i) => {
  const sf = ts.createSourceFile(p.name + '.js', p.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sf.parseDiagnostics && sf.parseDiagnostics.length) throw new Error(p.name + ' : ' + sf.parseDiagnostics[0].messageText);
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) declared[i].add(st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
      const add = n => { if (ts.isIdentifier(n)) declared[i].add(n.text); else n.elements && n.elements.forEach(e => e.name && add(e.name)); };
      add(d.name);
    }
  }
  return sf;
});
const isFn = n => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isConstructorDeclaration(n);
let problems = 0;
parsed.forEach((sf, i) => {
  const later = new Map();
  for (let j = i + 1; j < parts.length; j++) for (const n of declared[j]) if (!declared[i].has(n) && !later.has(n)) later.set(n, parts[j].name);
  const seen = new Set();
  const walk = (n, top) => {
    // une fonction passée à un appel (forEach, IIFE…) s'exécute souvent tout de suite : on la parcourt,
    // sauf pour les appels qui la gardent pour plus tard (événements, minuteries, promesses)
    if (isFn(n) && !top) {
      const p = n.parent, call = p && ts.isCallExpression(p) ? p : p && ts.isParenthesizedExpression(p) && ts.isCallExpression(p.parent) ? p.parent : null;
      const callee = call && (ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : ts.isIdentifier(call.expression) ? call.expression.text : '');
      if (!call || /^(addEventListener|setTimeout|setInterval|requestAnimationFrame|then|catch|finally|onCall|listen|on|Promise|observe|MutationObserver|ResizeObserver)$/.test(callee)) return;
    }
    if (ts.isIdentifier(n) && later.has(n.text)) {
      const p = n.parent;
      const isProp = p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n));
      if (!isProp) { const k = n.text + '@' + sf.getLineAndCharacterOfPosition(n.getStart()).line; if (!seen.has(k)) { seen.add(k); problems++; console.log(`  ${parts[i].name} ligne ${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} : « ${n.text} » est déclaré plus loin (${later.get(n.text)})`); } }
    }
    ts.forEachChild(n, c => walk(c, false));
  };
  for (const st of sf.statements) if (!ts.isFunctionDeclaration(st) && !ts.isClassDeclaration(st)) walk(st, false);
});
console.log(problems ? problems + ' problème(s) à régler avant d\'écrire.' : 'Aucun problème : chaque morceau ne dépend que des précédents au chargement.');
if (process.argv.includes('--write') && !problems) {
  const dir = path.join(root, 'public', 'engine');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^\d\d-.*\.js$/.test(f)) fs.unlinkSync(path.join(dir, f));
  for (const p of parts) fs.writeFileSync(path.join(dir, p.name + '.js'), p.code.endsWith('\n') ? p.code : p.code + '\n');
  fs.writeFileSync(path.join(dir, 'parts.json'), JSON.stringify(parts.map(p => p.name + '.js'), null, 1) + '\n');
  console.log(parts.length + ' morceaux écrits dans public/engine/');
}

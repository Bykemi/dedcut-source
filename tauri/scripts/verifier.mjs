// Vérifie le code de DedCut avant une version : ce qui ferait planter le logiciel ou ouvrirait une porte aux pirates.
//   npm run verifier            (dans le dossier tauri)
//   npm run verifier -- --complet   (ajoute clippy : plantages possibles du code Rust, quelques minutes)
// Contrôles : moteur (erreurs, doublons de noms), ESLint (vrais bugs seulement), CSP, clés secrètes dans git,
// TypeScript, traductions, code copié-collé (jscpd), failles connues des paquets (npm audit, cargo-deny).
// Sortie : « ERREUR » = à corriger avant de publier (code de sortie 1), « ATTENTION » = à regarder, « OK ».
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const require = createRequire(import.meta.url);
const acorn = require('acorn');
const COMPLET = process.argv.includes('--complet');
const ENGINE = path.join(ROOT, 'public', 'engine');
const res = { err: 0, warn: 0 };
const titre = t => console.log('\n== ' + t);
const ok = t => console.log('  OK        ' + t);
const warn = t => { res.warn++; console.log('  ATTENTION ' + t); };
const bad = t => { res.err++; console.log('  ERREUR    ' + t); };
// sous Windows, npm / npx sont des fichiers .cmd : on passe par le shell avec une ligne déjà écrite (arguments fixes, rien venant de l'extérieur)
const run = (cmd, args, opts = {}) => process.platform === 'win32'
  ? spawnSync([cmd, ...args.map(a => /[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a)].join(' '), { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 256 << 20, ...opts })
  : spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20, ...opts });
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

/* ---------- 1. moteur : chaque fichier est chargé seul, ils partagent leurs noms globaux ---------- */
titre('Moteur (public/engine) : erreurs et doublons de noms');
const parts = JSON.parse(fs.readFileSync(path.join(ENGINE, 'parts.json'), 'utf8'));
const classic = [...parts.map(f => path.join(ENGINE, f)), ...fs.readdirSync(path.join(ROOT, 'public')).filter(f => f.endsWith('.js')).map(f => path.join(ROOT, 'public', f))];
const decl = new Map();
const add = (name, kind, file, line) => { if (!decl.has(name)) decl.set(name, []); decl.get(name).push({ kind, file, line }); };
const names = p => { const out = []; const w = q => { if (!q) return; if (q.type === 'Identifier') out.push(q.name); else if (q.type === 'ObjectPattern') q.properties.forEach(x => w(x.value || x.argument)); else if (q.type === 'ArrayPattern') q.elements.forEach(w); else if (q.type === 'AssignmentPattern') w(q.left); else if (q.type === 'RestElement') w(q.argument); }; w(p); return out; };
let syntaxe = 0;
for (const f of classic) {
  let ast; try { ast = acorn.parse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', locations: true }); }
  catch (e) { bad(`${rel(f)} : erreur de syntaxe (${e.message}) — le fichier ne se charge pas`); syntaxe++; continue; }
  for (const n of ast.body) {
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) add(n.id.name, n.type === 'ClassDeclaration' ? 'class' : 'function', rel(f), n.loc.start.line);
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) for (const nm of names(d.id)) add(nm, n.kind, rel(f), n.loc.start.line);
  }
}
let dbl = 0, redef = 0;
for (const [name, l] of decl) {
  if (l.length < 2) continue;
  const where = l.map(x => `${x.kind} ${x.file}:${x.line}`).join(' | ');
  if (l.some(x => x.kind === 'const' || x.kind === 'let' || x.kind === 'class')) { bad(`« ${name} » déclaré plusieurs fois : ${where} — le 2e fichier ne se charge pas`); dbl++; }
  else if (l.filter(x => x.kind === 'function').length > 1) { warn(`fonction « ${name} » définie plusieurs fois (la dernière gagne) : ${where}`); redef++; }
}
if (!syntaxe && !dbl && !redef) ok(`${classic.length} fichiers, ${decl.size} noms globaux, aucun doublon`);

/* ---------- 2. ESLint : seulement les règles qui trouvent de vrais bugs ---------- */
titre('ESLint (noms inconnus, clés en double, code jamais atteint…)');
{
  const globals = require('globals');
  const g = {}; for (const k of decl.keys()) g[k] = 'writable';
  const scan = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(vendor|ort|locales|fonts)$/.test(e.name)) scan(p); } else if (/\.(ts|tsx|js)$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\b(?:window|W|w)\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) g[m[1]] = 'writable'; } };
  scan(path.join(ROOT, 'src')); scan(path.join(ROOT, 'public'));
  // bibliothèques chargées à part (public/vendor)
  for (const k of ['MP4Box', 'DataStream', 'Mp4Muxer', 'WebMMuxer', '__TAURI__', '__TAURI_INTERNALS__']) g[k] = 'readonly';
  const { ESLint } = require('eslint');
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: [{
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser, ...globals.worker, ...g } },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-undef': 'error', 'no-dupe-keys': 'error', 'no-dupe-args': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error', 'no-func-assign': 'error',
      'no-const-assign': 'error', 'no-class-assign': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-unsafe-finally': 'error', 'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error', 'no-compare-neg-zero': 'error', 'getter-return': 'error', 'no-setter-return': 'error', 'no-obj-calls': 'error',
      'for-direction': 'error', 'no-shadow-restricted-names': 'error', 'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unreachable': 'warn', 'no-self-assign': 'warn', 'no-self-compare': 'warn', 'no-loss-of-precision': 'warn', 'no-constant-binary-expression': 'warn', 'no-unmodified-loop-condition': 'warn',
    },
  }] });
  const files = classic.map(rel);
  const out = await eslint.lintFiles(files);
  let n = 0;
  for (const r of out) for (const m of r.messages) { n++; const t = `${rel(r.filePath)}:${m.line} ${m.message} [${m.ruleId}]`; if (m.severity === 2) bad(t); else warn(t); }
  if (!n) ok(`${files.length} fichiers sans bug détecté`);
}

/* ---------- 3. CSP : barrière contre le code injecté ---------- */
titre('Protection contre le code injecté (CSP de tauri.conf.json)');
{
  const conf = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  const csp = conf.app && conf.app.security && conf.app.security.csp;
  if (!csp) bad('CSP désactivée ("csp": null) : un texte piégé pourrait lancer du code avec tous les droits de DedCut');
  else {
    const s = typeof csp === 'string' ? (csp.match(/script-src([^;]*)/) || [, ''])[1] : (csp['script-src'] || '');
    if (/'unsafe-inline'/.test(s)) bad("script-src autorise 'unsafe-inline' : la CSP ne bloque plus le code injecté");
    else ok('CSP active, pas de script en ligne autorisé');
    const pro = fs.readFileSync(path.join(ROOT, 'src', 'image', 'pro.tsx'), 'utf8').match(/export const EXT_BOOT = "(.*)";/);
    if (pro) { const h = "'sha256-" + crypto.createHash('sha256').update(pro[1]).digest('base64') + "'"; if (!s.includes(h)) bad(`le lanceur des extensions d'Image a changé : mettre ${h} dans script-src`); else ok("empreinte du lanceur des extensions d'Image à jour"); }
  }
}

/* ---------- 4. clés secrètes envoyées dans git par erreur ---------- */
titre('Clés secrètes dans les fichiers suivis par git');
{
  const top = run('git', ['rev-parse', '--show-toplevel']).stdout.trim();
  const files = run('git', ['ls-files', '-z'], { cwd: top }).stdout.split('\0').filter(Boolean);
  const PAT = [[/untrusted comment: (?:rsign|minisign) encrypted secret key/, 'clé de signature des mises à jour'], [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, 'clé privée'],
    [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'clé Anthropic'], [/\bsk-(?:proj-)?[A-Za-z0-9]{32,}/, 'clé OpenAI'], [/\bAIza[0-9A-Za-z_-]{35}\b/, 'clé Google'], [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'jeton GitHub'],
    [/client_secret["']?\s*[:=]\s*["'][A-Za-z0-9]{24,}["']/, 'secret d\'application (Twitch, Google…)']];
  let found = 0;
  for (const f of files) {
    if (/\.(png|jpe?g|webp|gif|ico|mp4|webm|wav|mp3|m4a|ogg|woff2?|ttf|otf|exe|dll|wasm|onnx|bin|zip|7z|icns|pdf|psd)$/i.test(f)) continue;
    const p = path.join(top, f); let st; try { st = fs.statSync(p); } catch { continue; } if (st.size > 8 << 20) continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const [re, what] of PAT) if (re.test(txt)) { bad(`${f} : ressemble à une ${what} — ne jamais l'envoyer dans git`); found++; }
  }
  if (!found) ok(`${files.length} fichiers suivis, aucune clé secrète`);
}

/* ---------- 5. TypeScript et traductions ---------- */
titre('TypeScript');
{ const r = run('npx', ['tsc', '--noEmit']); const n = (r.stdout.match(/error TS/g) || []).length; if (r.status === 0) ok('aucune erreur de type'); else { bad(`${n || '?'} erreur(s) de type`); console.log(r.stdout.split('\n').slice(0, 15).map(l => '            ' + l).join('\n')); } }
titre('Traductions (9 langues)');
{ const r = run('node', ['scripts/check-i18n.mjs']); if (/aucune erreur/i.test(r.stdout)) ok('aucune clé manquante ni variable fausse'); else { bad('erreurs dans les traductions (node scripts/check-i18n.mjs)'); console.log(r.stdout.split('\n').slice(0, 15).map(l => '            ' + l).join('\n')); } }

/* ---------- 6. code copié-collé ---------- */
titre('Code copié-collé (jscpd)');
{
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dedcut-jscpd-'));
  const r = run('npx', ['jscpd', '-k', '120', '-l', '1', '-r', 'json', '-o', out, 'public/engine', 'src', 'src-tauri/src']);
  try {
    const j = JSON.parse(fs.readFileSync(path.join(out, 'jscpd-report.json'), 'utf8')), t = j.statistics.total;
    const pct = +(t.percentageTokens ?? t.percentage).toFixed(2);
    (pct > 3 ? warn : ok)(`${t.clones} passage(s) copié(s)-collé(s), ${pct} % du code`);
    for (const d of j.duplicates.sort((a, b) => (b.tokens || 0) - (a.tokens || 0)).slice(0, 5)) console.log(`            ${rel(d.firstFile.name)}:${d.firstFile.start} = ${rel(d.secondFile.name)}:${d.secondFile.start}`);
  } catch { warn('jscpd n\'a pas pu tourner : ' + (r.stderr || '').split('\n')[0]); }
  fs.rmSync(out, { recursive: true, force: true });
}

/* ---------- 7. failles connues des paquets ---------- */
titre('Failles connues des paquets JavaScript (npm audit, paquets livrés)');
{
  const r = run('npm', ['audit', '--omit=dev', '--json']);
  try {
    const j = JSON.parse(r.stdout), v = j.metadata.vulnerabilities, tot = v.critical + v.high + v.moderate + v.low;
    if (!tot) ok('aucune faille connue');
    else {
      warn(`${tot} alerte(s) : ${v.critical} critique(s), ${v.high} haute(s), ${v.moderate} moyenne(s), ${v.low} basse(s)`);
      for (const [k, x] of Object.entries(j.vulnerabilities)) if (x.isDirect || x.severity === 'critical') console.log(`            ${k} (${x.severity})${x.isDirect ? '' : ' via ' + (x.effects || []).join(', ')}`);
      console.log('            Note : sharp et onnxruntime-node viennent de transformers.js pour Node ; ils ne sont pas dans l\'installateur (DedCut utilise la version web).');
    }
  } catch { warn('npm audit n\'a pas pu tourner (pas d\'internet ?)'); }
}
titre('Failles connues, licences et sources des paquets Rust (cargo-deny)');
{
  const tauri = path.join(ROOT, 'src-tauri');
  const has = run('cargo', ['deny', '--version'], { cwd: tauri });
  if (has.status !== 0) warn('cargo-deny absent : l\'installer une fois avec « cargo install cargo-deny --locked »');
  else {
    const r = run('cargo', ['deny', '--format', 'json', 'check', 'advisories', 'licenses', 'sources'], { cwd: tauri });
    const lines = (r.stderr || '').split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    let e = 0;
    for (const x of lines) if (x.type === 'diagnostic' && x.fields.severity === 'error') { e++; const a = x.fields.advisory; bad(a ? `${a.package} : ${a.id} ${a.title}` : x.fields.message + ' ' + (x.fields.graphs || []).map(g => g.Krate && g.Krate.name + '@' + g.Krate.version).join(', ')); }
    if (!e && r.status === 0) ok('aucune faille connue, licences et sources conformes');
    else if (!e) warn('cargo-deny a échoué : ' + (r.stderr || '').split('\n').slice(-3).join(' '));
  }
}

/* ---------- 8. (complet) clippy : ce qui pourrait faire paniquer le code Rust (DedCut se ferme alors d'un coup) ---------- */
if (COMPLET) {
  titre('Code Rust (clippy)');
  const r = run('cargo', ['clippy', '--message-format=short', '--', '-W', 'clippy::unwrap_used', '-W', 'clippy::indexing_slicing', '-W', 'clippy::panic'], { cwd: path.join(ROOT, 'src-tauri') });
  const w = (r.stderr || '').split('\n').filter(l => /^src.*(warning|error):/.test(l));
  const errs = w.filter(l => /error:/.test(l));
  errs.forEach(l => bad(l));
  if (!errs.length) ok(`compile ; ${w.length} endroit(s) à surveiller (accès par index, unwrap) : à regarder s'ils lisent des données venues de l'extérieur`);
}

console.log(`\nRésultat : ${res.err} erreur(s), ${res.warn} point(s) à regarder.`);
process.exitCode = res.err ? 1 : 0;

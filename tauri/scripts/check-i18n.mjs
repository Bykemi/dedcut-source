// Vérification des traductions de DedCut (cahier des charges §37).
// Utilisation : node scripts/check-i18n.mjs          (erreurs de traduction = échec)
//               node scripts/check-i18n.mjs --strict (les textes encore écrits en dur = échec aussi)
// L'anglais (en.json) est la référence complète.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'locales');
const strict = process.argv.includes('--strict');
const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const isPlural = v => v && typeof v === 'object' && Object.keys(v).length && Object.keys(v).every(k => PLURAL.has(k));
function flat(o, pre = '', out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? `${pre}.${k}` : k;
    if (typeof v === 'string' || isPlural(v)) out[key] = v;
    else if (v && typeof v === 'object') flat(v, key, out);
    else out[key] = v;
  }
  return out;
}
const vars = v => new Set([...(typeof v === 'string' ? [v] : Object.values(v || {}))].flatMap(s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1])));

const index = read('index.json');
const ref = flat(read('en.json'));
let errors = 0;
const err = (lang, msg) => { errors++; console.log(`  ✗ [${lang}] ${msg}`); };

console.log(`Référence : en.json (${Object.keys(ref).length} clés)`);
for (const { code } of index.languages) {
  const file = `${code}.json`;
  if (!fs.existsSync(path.join(dir, file))) { err(code, `fichier manquant : ${file}`); continue; }
  let data;
  try { data = flat(read(file)); } catch (e) { err(code, `JSON invalide : ${e.message}`); continue; }
  for (const k of Object.keys(ref)) {
    const v = data[k];
    if (v === undefined) { err(code, `clé manquante : ${k}`); continue; }
    if (typeof v === 'string' ? !v.trim() : !isPlural(v)) err(code, `traduction vide ou mal formée : ${k}`);
    if (isPlural(ref[k]) && !isPlural(v)) err(code, `pluriel attendu (one/other…) : ${k}`);
    if (isPlural(v) && !v.other) err(code, `forme « other » manquante : ${k}`);
    const a = vars(ref[k]), b = vars(v);
    for (const x of a) if (!b.has(x)) err(code, `variable {${x}} absente : ${k}`);
    for (const x of b) if (!a.has(x)) err(code, `variable {${x}} inconnue : ${k}`);
  }
  for (const k of Object.keys(data)) if (!(k in ref)) err(code, `clé en trop (absente de l'anglais) : ${k}`);
}

// Textes encore écrits en dur (à migrer vers les clés)
const hard = [];
const found = [];
const scan = (file, rules) => {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  let n = 0;
  for (const re of rules) for (const m of src.matchAll(re)) {
    // élément déjà traduit (data-i18n…) : le texte français n'y est qu'un texte de secours
    const tag = src.slice(src.lastIndexOf('<', m.index), m.index + m[0].length);
    if (/data-i18n/.test(tag) || /\{t\(|T\(/.test(m[0])) continue;
    n++; found.push(file + ' : ' + m[0].trim().slice(0, 90));
  }
  if (n) hard.push([file, n]);
};
for (const f of fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.tsx'))) {
  scan(path.join('src', f), [
    />\s*([^<>{}\s][^<>{}]*[A-Za-zÀ-ÿ぀-ヿ一-鿿가-힯][^<>{}]*)\s*</g, // texte entre balises
    /\b(?:title|placeholder|aria-label)="[^"]*[A-Za-zÀ-ÿ][^"]*"/g // attributs visibles
  ]);
}
for (const f of fs.readdirSync(path.join('public', 'engine')).filter(f => f.endsWith('.js'))) scan(path.join('public', 'engine', f), [
  /toast\(\s*'[^']*[A-Za-zÀ-ÿ][^']*'/g,
  /title="[^"$]*[A-Za-zÀ-ÿ][^"$]*"/g,
  /'[^'\n]*[éèêàùçôî][^'\n]*'/g
]);

console.log(errors ? `\n${errors} erreur(s) de traduction.` : '\nTraductions : aucune erreur.');
if (process.env.SHOW) found.forEach(x => console.log(x));
if (hard.length) {
  console.log('\nTextes encore écrits en dur (à migrer vers t("clé")) :');
  for (const [f, n] of hard) console.log(`  • ${f} : ~${n}`);
  if (process.argv.includes('--list')) found.forEach(x => console.log('    ' + x));
}
process.exit(errors || (strict && hard.length) ? 1 : 0);

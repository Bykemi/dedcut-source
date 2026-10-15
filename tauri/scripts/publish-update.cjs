// Publie une mise à jour de DedCut sur le dépôt PUBLIC « Bykemi/DedCut-mises-a-jour » (installateurs seulement, jamais le code).
// 1) Fabriquer l'installateur Windows signé (depuis tauri/) :
//      TAURI_SIGNING_PRIVATE_KEY=%USERPROFILE%/.dedcut-signature/dedcut-maj.key TAURI_SIGNING_PRIVATE_KEY_PASSWORD= npx tauri build
// 2) (facultatif) Version Mac : lancer le test « DedCut Mac » sur GitHub pour CETTE version (commit avec [mac] ou tag v…).
//    Le script récupère sa fabrication sur le dépôt privé (gh run download) et la signe ICI, avec la même clé :
//    la clé ne quitte jamais ce PC. Sans fabrication Mac pour cette version, seul Windows est publié.
// 3) node scripts/publish-update.cjs "Texte des nouveautés"        (ajouter --sans-mac pour publier Windows seulement,
//    --apk pour joindre l'APK Android de test de cette version, fabriqué par « DedCut Android » sur GitHub,
//    --windows-github pour publier l'installateur fabriqué par « DedCut Windows » sur le dépôt public et signé par SignPath
//    au lieu de celui du PC ; la clé des mises à jour sert quand même, ici, à signer le .sig)
// Le fichier latest.json indique la version, l'adresse de chaque installateur et sa signature ; DedCut le lit au démarrage
// et chaque système (Windows, Mac Apple, Mac Intel) prend seulement le sien.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const REPO = 'Bykemi/DedCut-mises-a-jour', CODE = 'Bykemi/DedCut';
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8')).version;
const dir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const exe = path.join(dir, `DedCut_${version}_x64-setup.exe`);
/* ---------- Windows fabriqué par GitHub (--windows-github) : installateur signé par SignPath (Authenticode),
   récupéré sur le dépôt public, puis signature de la mise à jour (.sig) faite ICI avec la clé de ByKemi ---------- */
if (process.argv.includes('--windows-github')) {
  const PUB = 'Bykemi/dedcut-source', winDir = path.join(root, 'src-tauri', 'target', 'windows-github');
  let got = null;
  const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--repo', PUB, '--workflow', 'windows.yml', '--status', 'success', '--limit', '10', '--json', 'databaseId'], { encoding: 'utf8' }));
  for (const r of runs) {
    fs.rmSync(winDir, { recursive: true, force: true });
    try { execFileSync('gh', ['run', 'download', String(r.databaseId), '--repo', PUB, '-n', 'DedCut-Windows-signe', '-D', winDir], { stdio: 'ignore' }); } catch { continue; }
    const f = path.join(winDir, path.basename(exe));
    if (fs.existsSync(f)) { got = f; break; }
  }
  if (!got) throw new Error(`pas d'installateur signé par SignPath pour ${version} sur ${PUB} : lancer « DedCut Windows » sur GitHub et approuver la signature sur signpath.io`);
  const ps = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-AuthenticodeSignature -LiteralPath '${got.replace(/'/g, "''")}').Status`], { encoding: 'utf8' }).trim();
  if (ps !== 'Valid') throw new Error('signature Windows de l\'installateur de GitHub : ' + ps);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(got, exe);
  // « tauri signer sign » veut le contenu de la clé (pas son chemin)
  const env = { ...process.env }, k = env.TAURI_SIGNING_PRIVATE_KEY || '';
  if (!k) throw new Error('TAURI_SIGNING_PRIVATE_KEY manquant : la clé des mises à jour de ByKemi');
  if (fs.existsSync(k)) env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(k, 'utf8').trim();
  execFileSync(process.execPath, [path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js'), 'signer', 'sign', exe], { cwd: root, env, stdio: 'inherit' });
  console.log('Windows : installateur de GitHub signé par SignPath (' + ps + '), mise à jour signée ici');
}
if (!fs.existsSync(exe) || !fs.existsSync(exe + '.sig')) throw new Error('installateur signé introuvable pour ' + version + ' : relancer la fabrication avec la clé');
if (fs.statSync(exe + '.sig').mtimeMs < fs.statSync(exe).mtimeMs - 5000) throw new Error('signature plus ancienne que l\'installateur');
const args = process.argv.slice(2), noMac = args.includes('--sans-mac');
const notes = args.find(a => !a.startsWith('--')) || `DedCut ${version}`;
const tag = 'v' + version;
const url = f => `https://github.com/${REPO}/releases/download/${tag}/${path.basename(f)}`;
const platforms = { 'windows-x86_64': { signature: fs.readFileSync(exe + '.sig', 'utf8').trim(), url: url(exe) } };
const files = [exe, exe + '.sig'];

/* ---------- Mac : fabrication récupérée sur le dépôt privé, signée ici ---------- */
if (!noMac) {
  const macDir = path.join(root, 'src-tauri', 'target', 'mac-maj');
  fs.rmSync(macDir, { recursive: true, force: true });
  try {
    const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--repo', CODE, '--workflow', 'mac.yml', '--status', 'success', '--limit', '10', '--json', 'databaseId'], { encoding: 'utf8' }));
    for (const r of runs) {
      try { execFileSync('gh', ['run', 'download', String(r.databaseId), '--repo', CODE, '-n', 'dedcut-mac-maj', '-D', macDir], { stdio: 'ignore' }); } catch { continue; }
      if (fs.existsSync(path.join(macDir, `DedCut_${version}_universal.app.tar.gz`))) break;
      fs.rmSync(macDir, { recursive: true, force: true });
    }
  } catch (e) { console.warn('Mac : impossible de lister les fabrications (' + e.message + ')'); }
  const tgz = path.join(macDir, `DedCut_${version}_universal.app.tar.gz`);
  const dmg = fs.existsSync(macDir) && fs.readdirSync(macDir).find(f => f.endsWith('.dmg') && f.includes(version));
  if (fs.existsSync(tgz) && dmg) {
    // signature de la mise à jour Mac avec la même clé que Windows (variables TAURI_SIGNING_PRIVATE_KEY[_PASSWORD])
    // « tauri signer sign » veut le contenu de la clé (pas son chemin, contrairement à « tauri build »)
    const env = { ...process.env }, k = env.TAURI_SIGNING_PRIVATE_KEY || '';
    if (!k) throw new Error('TAURI_SIGNING_PRIVATE_KEY manquant : même clé que pour la fabrication Windows');
    if (fs.existsSync(k)) env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(k, 'utf8').trim();
    // lancé avec node directement (pas de shell : pas de souci avec les espaces dans le chemin)
    execFileSync(process.execPath, [path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js'), 'signer', 'sign', tgz], { cwd: root, env, stdio: 'inherit' });
    const sig = fs.readFileSync(tgz + '.sig', 'utf8').trim();
    // une seule appli « universelle » pour les Mac Apple (M1, M2…) et les Mac Intel
    platforms['darwin-aarch64'] = { signature: sig, url: url(tgz) };
    platforms['darwin-x86_64'] = { signature: sig, url: url(tgz) };
    const dmgPath = path.join(macDir, dmg), dmgFixe = path.join(macDir, 'DedCut-Installation-Mac.dmg');
    fs.copyFileSync(dmgPath, dmgFixe);
    files.push(tgz, tgz + '.sig', dmgPath, dmgFixe);
    console.log('Mac : ajouté (' + dmg + ')');
  } else {
    console.warn(`Mac : pas de fabrication pour la version ${version} → seul Windows est publié.\n  (lancer « DedCut Mac » sur GitHub pour cette version, puis relancer ce script)`);
  }
}

/* ---------- Android (bêta) : seulement avec --apk ; APK de test récupéré sur le dépôt privé ----------
   Publié sous le nom fixe DedCut-Android.apk : le site active son bouton « Télécharger l'APK » dès qu'il le voit.
   Pas d'entrée dans latest.json : sur Android, pas de mise à jour automatique (il faut retélécharger l'APK). */
if (args.includes('--apk')) {
  const apkDir = path.join(root, 'src-tauri', 'target', 'android-maj');
  fs.rmSync(apkDir, { recursive: true, force: true });
  let apk = null;
  try {
    const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--repo', CODE, '--workflow', 'android.yml', '--status', 'success', '--limit', '10', '--json', 'databaseId'], { encoding: 'utf8' }));
    for (const r of runs) {
      try { execFileSync('gh', ['run', 'download', String(r.databaseId), '--repo', CODE, '-n', 'dedcut-android-apk', '-D', apkDir], { stdio: 'ignore' }); } catch { continue; }
      if (fs.existsSync(path.join(apkDir, `DedCut_${version}_test.apk`))) { apk = path.join(apkDir, `DedCut_${version}_test.apk`); break; }
      fs.rmSync(apkDir, { recursive: true, force: true });
    }
  } catch (e) { console.warn('Android : impossible de lister les fabrications (' + e.message + ')'); }
  if (apk) {
    const apkFixe = path.join(apkDir, 'DedCut-Android.apk');
    fs.copyFileSync(apk, apkFixe);
    files.push(apkFixe);
    console.log('Android : ajouté (' + path.basename(apk) + ')');
  } else {
    console.warn(`Android : pas d'APK pour la version ${version} → non publié.\n  (lancer « DedCut Android » sur GitHub pour cette version, puis relancer ce script)`);
  }
}

const latest = { version, notes, pub_date: new Date().toISOString(), platforms };
const lj = path.join(dir, 'latest.json');
// copie au nom fixe : le site peut toujours pointer vers releases/latest/download/DedCut-Installation.exe
const fixe = path.join(dir, 'DedCut-Installation.exe');
fs.copyFileSync(exe, fixe);
fs.writeFileSync(lj, JSON.stringify(latest, null, 2));
// empreinte SHA-256 de l'installateur Windows : lien VirusTotal (page d'analyse par 70 antivirus) dans les notes de la version
const sha = require('crypto').createHash('sha256').update(fs.readFileSync(fixe)).digest('hex');
const vt = `https://www.virustotal.com/gui/file/${sha}`;
const relNotes = `${notes}\n\n---\nEmpreinte SHA-256 de DedCut-Installation.exe : \`${sha}\`\nVérification antivirus (VirusTotal) : ${vt}`;
execFileSync('gh', ['release', 'create', tag, ...files, lj, fixe, '--repo', REPO, '--title', `DedCut ${version}`, '--notes', relNotes, '--latest'], { stdio: 'inherit' });
console.log(`\nVirusTotal : dépose ${fixe} sur https://www.virustotal.com (onglet « File »), puis le résultat sera ici :\n  ${vt}\n(le site lit ce lien tout seul dans les notes de la version et affiche le badge « Vérifié par VirusTotal »)`);
console.log(`Publié : https://github.com/${REPO}/releases/tag/${tag}`);

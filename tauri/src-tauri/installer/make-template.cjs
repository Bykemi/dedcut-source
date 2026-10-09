// Fabrique installer/installer.nsi = modèle officiel de Tauri (tauri-installer-2.12.1.nsi, licence MIT / Apache-2.0,
// https://github.com/tauri-apps/tauri) + interface DedCut (dedcut-ui.nsh) + textes en 9 langues (dedcut-textes.nsh).
// Utilisation : node installer/make-template.cjs   (depuis src-tauri). À relancer si on change de version de Tauri
// ou si on modifie dedcut-ui.nsh / dedcut-textes.nsh. Ne jamais modifier installer.nsi à la main.
// Ce qui change par rapport au modèle de Tauri (tout le reste, dont les mises à jour /P /UPDATE, est gardé tel quel) :
// - pages : accueil DedCut (dossier + raccourci) au lieu de « Bienvenue » + « Dossier », fin DedCut au lieu de la page de fin ;
//   désinstalleur : accueil DedCut (avec « supprimer aussi mes réglages ») au lieu de la confirmation, et une page de fin ;
// - la page « déjà installé » n'est plus montrée : DedCut est installé par-dessus, comme les mises à jour automatiques
//   (l'accueil dit déjà « Mettre à jour » ou « Réinstaller ») ; une ancienne installation WiX est toujours retirée d'abord ;
// - le raccourci sur le Bureau est fait pendant l'installation si la case de l'accueil est cochée ;
// - désinstallation avec « supprimer aussi mes réglages » : les modèles d'IA téléchargés (%LOCALAPPDATA%\DedCut\ai) aussi.
const fs = require('fs'), path = require('path');
const D = __dirname;
let s = fs.readFileSync(path.join(D, 'tauri-installer-2.12.1.nsi'), 'utf8').replace(/\r\n/g, '\n');
const ui = fs.readFileSync(path.join(D, 'dedcut-ui.nsh'), 'utf8').replace(/\r\n/g, '\n');
const textes = fs.readFileSync(path.join(D, 'dedcut-textes.nsh'), 'utf8').replace(/\r\n/g, '\n');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + a.slice(0, 90)); s = s.replace(a, () => b); };

// 1) interface DedCut, juste avant les pages (après toutes les constantes de Tauri)
rep('; Installer pages, must be ordered as they appear\n', ui + '\n; Installer pages, must be ordered as they appear\n');

// 2) accueil DedCut à la place de « Bienvenue »
rep('; 1. Welcome Page\n!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive\n!insertmacro MUI_PAGE_WELCOME\n',
  '; 1. Accueil DedCut : dossier d\'installation et raccourci (remplace « Bienvenue » et « Dossier »)\nPage custom DcWelcome DcWelcomeLeave\n');

// 3) page « déjà installé » : jamais montrée, installation par-dessus (passive : comportement de Tauri inchangé)
rep(`  \${If} $PassiveMode = 1
    Call PageLeaveReinstall
  \${Else}
    nsDialogs::Create 1018`, `  \${If} $PassiveMode = 1
    Call PageLeaveReinstall
  \${ElseIf} $DcNoUninst = 1
    ; DedCut : l'accueil a déjà dit « Mettre à jour » / « Réinstaller » → on installe par-dessus, sans autre page
    Call PageLeaveReinstall
  \${Else}
    nsDialogs::Create 1018`);
rep(`Function PageLeaveReinstall
  \${NSD_GetState} $R2 $R1
`, `Function PageLeaveReinstall
  \${If} $DcNoUninst = 1
  \${AndIf} $PassiveMode <> 1
    ; DedCut : même version → « réinstaller » (1), autre version → « ne pas désinstaller » (0)
    \${If} $R0 = 0
      StrCpy $R1 1
    \${Else}
      StrCpy $R1 0
    \${EndIf}
  \${Else}
    \${NSD_GetState} $R2 $R1
  \${EndIf}
`);

// 4) plus de page « Dossier » (le dossier est sur l'accueil)
rep('; 5. Choose install directory page\n!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive\n!insertmacro MUI_PAGE_DIRECTORY\n', '; 5. (dossier : sur l\'accueil DedCut)\n');

// 5) page d'installation redessinée
rep('; 7. Installation page\n!insertmacro MUI_PAGE_INSTFILES\n', '; 7. Installation page (redessinée par DedCut)\n!define MUI_PAGE_CUSTOMFUNCTION_SHOW DcInstShow\n!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DcInstLeave\n!insertmacro MUI_PAGE_INSTFILES\n');

// 6) page de fin DedCut
const fin0 = s.indexOf('; 8. Finish page\n'), fin1 = s.indexOf('!insertmacro MUI_PAGE_FINISH\n');
if (fin0 < 0 || fin1 < fin0) throw new Error('page de fin introuvable');
s = s.slice(0, fin0) + '; 8. Fin DedCut (lancer DedCut)\nPage custom DcFinish DcFinishLeave\n' + s.slice(fin1 + '!insertmacro MUI_PAGE_FINISH\n'.length);

// 7) désinstalleur : accueil DedCut au lieu de la confirmation, page redessinée, page de fin
const un0 = s.indexOf('; Uninstaller Pages\n'), un1 = s.indexOf('!insertmacro MUI_UNPAGE_CONFIRM\n');
if (un0 < 0 || un1 < un0) throw new Error('pages du désinstalleur introuvables');
s = s.slice(0, un0) + '; Uninstaller Pages\n; 1. Accueil DedCut (avec « supprimer aussi mes réglages »)\nUninstPage custom un.DcUnWelcome un.DcUnWelcomeLeave\n' + s.slice(un1 + '!insertmacro MUI_UNPAGE_CONFIRM\n'.length);
rep('; 2. Uninstalling Page\n!insertmacro MUI_UNPAGE_INSTFILES\n', '; 2. Uninstalling Page (redessinée par DedCut)\n!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.DcInstShow\n!define MUI_PAGE_CUSTOMFUNCTION_LEAVE un.DcInstLeave\n!insertmacro MUI_UNPAGE_INSTFILES\n\n; 3. Fin DedCut\nUninstPage custom un.DcUnFinish un.DcUnFinishLeave\n');

// 8) textes DedCut après les langues de Tauri
rep('{{#each language_files}}\n  !include "{{this}}"\n{{/each}}\n', '{{#each language_files}}\n  !include "{{this}}"\n{{/each}}\n' + textes + '\n');

// 9) raccourci sur le Bureau : aussi quand la case de l'accueil est cochée
rep(`  \${If} $PassiveMode = 1
  \${OrIf} \${Silent}
    Call CreateOrUpdateDesktopShortcut
  \${EndIf}`, `  \${If} $PassiveMode = 1
  \${OrIf} \${Silent}
  \${OrIf} $DcDesk = 1
    Call CreateOrUpdateDesktopShortcut
  \${EndIf}`);

// 10) « supprimer aussi mes réglages » : les modèles d'IA téléchargés depuis DedCut (plusieurs Go) aussi
// (les vidéos de l'utilisateur, dans Vidéos\DedCut, ne sont jamais touchées)
rep('    RmDir /r "$LOCALAPPDATA\\${BUNDLEID}"\n', '    RmDir /r "$LOCALAPPDATA\\${BUNDLEID}"\n    ; modèles d\'IA téléchargés depuis DedCut (Vidéo IA, DedCut IA)\n    RmDir /r "$LOCALAPPDATA\\${PRODUCTNAME}\\ai"\n    RMDir "$LOCALAPPDATA\\${PRODUCTNAME}"\n');

s = '; Installateur DedCut : modèle Tauri 2.12.1 (MIT / Apache-2.0) + interface DedCut. FICHIER FABRIQUÉ par installer/make-template.cjs : ne pas modifier à la main.\n' + s;
fs.writeFileSync(path.join(D, 'installer.nsi'), s);
console.log('installer.nsi fabriqué (' + s.split('\n').length + ' lignes)');

// Retouches manuelles de src/App.tsx : textes composés de plusieurs morceaux.
const fs = require('fs'), path = require('path');
const A = path.resolve(__dirname, '../../src/App.tsx');
let s = fs.readFileSync(A, 'utf8');
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + a.slice(0, 80)); s = s.replace(a, () => b); };
rep(`<p className="hint">Pendant le jeu : <kbd data-i18n="rec.hotkey" className="k">Ctrl+Maj+R</kbd> démarre / arrête l'enregistrement.</p>`,
    `<p className="hint"><span data-i18n="rec.duringGame">Pendant le jeu :</span> <kbd data-i18n="rec.hotkey" className="k">Ctrl+Maj+R</kbd> <span data-i18n="rec.hotkeyAction">démarre / arrête l'enregistrement.</span></p>`);
rep(`<p className="hint">Les vidéos vont dans tes médias et dans le dossier <b>VidéosDedCut</b>. <a data-i18n="settings.openFolder" href="#" id="recFolder">Ouvrir le dossier</a></p>`,
    `<p className="hint"><span data-i18n="rec.savedTo">Les vidéos vont dans tes médias et dans le dossier</span> <b>{'Vidéos\\\\DedCut'}</b> · <a data-i18n="settings.openFolder" href="#" id="recFolder">Ouvrir le dossier</a></p>`);
// « par ByKemi » dans l'en-tête
const by = s.match(/<span className="by">par <i>ByKemi<\/i><\/span>/);
if (!by) throw new Error('mention par ByKemi introuvable');
s = s.replace(by[0], '<span className="by" data-i18n="ui.byPrefix">par <i>ByKemi</i></span>');
fs.writeFileSync(A, s);
console.log('App.tsx : 3 retouches');

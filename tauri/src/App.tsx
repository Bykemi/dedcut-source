// Mise en page de DedCut (React). Le moteur de l'éditeur (public/engine.js) s'y branche après l'affichage.
import { WinControls } from './TitleBar';
export default function App() {
  return (
    <>
      <div id="app">
        <header data-tauri-drag-region="">
          <div className="hl" data-tauri-drag-region="">
            <div className="brand"><img id="hlogo" alt="DedCut" src="data:image/png;base64,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" /><span>Ded<b>Cut</b></span><span className="beta" role="button" tabIndex={0} data-i18n="app.beta" data-i18n-title="bug.betaTip">bêta</span><span className="by" data-i18n="ui.byPrefix">par <i>ByKemi</i></span></div>
            <button id="bMenu" className="menub" data-i18n-title="ui.menuTip" title="Menu"><span data-i18n="ui.menu">Menu</span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <div className="grp">
              <button data-i18n-title="ui.undoTip" id="bUndo" data-ico="undo" title="Annuler (Ctrl+Z)"></button>
              <button data-i18n-title="ui.redoTip" id="bRedo" data-ico="redo" title="Rétablir (Ctrl+Y)"></button>
            </div>
            <span data-i18n-title="ui.recording" id="recInd" hidden title="Enregistrement en cours"><i></i><span>00:00</span></span>
          </div>
          <div className="hc" data-tauri-drag-region="">
            <div id="modeBar"><button data-mode="edit" data-i18n-title="mode.edit" className="on" data-ico="split" data-s="15"><span data-i18n="mode.edit">Montage</span></button><button data-mode="rec" data-i18n-title="mode.rec" data-ico="rec" data-s="15"><span data-i18n="mode.rec">Enregistrer</span></button><button data-mode="live" data-i18n-title="mode.live" data-ico="live" data-s="15"><span data-i18n="mode.live">Live</span></button><button data-mode="image" data-i18n-title="mode.image" data-ico="image" data-s="15"><span data-i18n="mode.image">Image</span></button><button data-mode="music" data-i18n-title="mode.music" data-ico="audio" data-s="15"><span data-i18n="mode.music">Musique</span></button></div>
            <input data-i18n-title="ui.projectName" type="text" id="pname" title="Nom du projet" autoComplete="off" />
            <span id="sv" className="hint"></span>
          </div>
          <div className="hr" data-tauri-drag-region="">
            <button id="bChat" data-ico="chat" data-i18n-title="chat.tip" title="Assistant IA"><span className="lbl" data-i18n="chat.btn">Assistant IA</span></button>
            <button data-i18n-title="layout.tip" id="bLayout" data-ico="layout" title="Disposition des panneaux"></button>
            <button data-i18n-title="ui.themeTip" id="bTheme" data-ico="palette" title="Couleur de l'interface"></button>
            <button data-i18n-title="kb.title" id="bKeys" data-ico="keys" title="Raccourcis clavier"></button>
            <button id="bSupport" data-i18n-title="home.support" title="Soutenir DedCut" onClick={() => window.dispatchEvent(new Event('dedcut-support'))}>♥ <span className="lbl" data-i18n="ui.supportShort">Soutenir</span></button>
            <button data-i18n="ui.export" data-i18n-title="ui.exportTip" id="bExport" className="pri" data-ico="export" title="Exporter (Ctrl+E)">Exporter</button>
            <WinControls />
          </div>
          <div className="hidbtns" hidden>
            <button data-i18n="ui.new" data-i18n-title="ui.newTip" id="bNew" data-ico="new" title="Nouveau projet">Nouveau</button>
            <button data-i18n="common.open" data-i18n-title="ui.openTip" id="bOpen" data-ico="open" title="Ouvrir un projet .dedcut">Ouvrir</button>
            <button data-i18n="ui.save" data-i18n-title="ui.saveTip" id="bSave" data-ico="save" title="Sauvegarder le projet (Ctrl+S)">Sauvegarder</button>
          </div>
          <input type="file" id="pfile" accept=".dedcut" hidden />
        </header>
      
        <main>
          <div id="left">
          <nav id="rail">
            <button data-i18n="rail.media" data-tab="media" className="on" data-ico="media" data-s="22">Médias</button>
            <button data-i18n="rail.record" data-tab="rec" data-ico="rec" data-s="22" id="railRec">Enregistrer</button>
            <button data-i18n="common.audio" data-tab="audio" data-ico="audio" data-s="22">Audio</button>
            <button data-i18n="common.text" data-tab="text" data-ico="text" data-s="22">Texte</button>
            <button data-i18n="rail.captions" data-tab="cap" data-ico="cc" data-s="22">Sous-titres</button>
            <button data-i18n="rail.aigen" data-tab="gen" data-ico="aivid" data-s="22">Vidéo IA</button>
            <button data-i18n="rail.shapes" data-tab="stick" data-ico="shapes" data-s="22">Formes</button>
            <button data-i18n="common.effects" data-tab="fx" data-ico="fx" data-s="22">Effets</button>
            <button data-i18n="common.transitions" data-tab="tr" data-ico="trans" data-s="22">Transitions</button>
            <button data-i18n="common.filters" data-tab="filt" data-ico="filter" data-s="22">Filtres</button>
          </nav>
          <button id="railToggle" className="railtog">▴</button>
      
          <aside id="lib">
            <div className="tab" id="t-media">
              <h2 data-i18n="rail.media">Médias</h2>
              <div className="drop" id="drop"><span data-ico="plus" data-s="22"></span><b data-i18n="lib.import" style={{"color":"var(--txt)"}}>Importer</b><span data-i18n="lib.dropHere">Glisse tes vidéos, images et sons ici</span></div>
              <input type="file" id="file" multiple accept="video/*,audio/*,image/*" hidden />
              <div className="qa" style={{"marginBottom":"14px"}}>
                <button data-i18n="common.text" id="aText" data-ico="text">Texte</button>
                <button data-i18n="gen.color" id="aColor" data-ico="square">Fond uni</button>
                <button data-i18n="gen.grad" id="aGrad" data-ico="square">Dégradé</button>
                <button data-i18n="lib.files" id="aFiles" data-ico="open">Fichiers</button>
                <button data-i18n="lib.recordScreen" data-tab2="rec" data-ico="rec">Enregistrer l'écran</button>
                <button data-i18n="slide.btn" id="aSlide" data-ico="media">Diaporama</button>
              </div>
              <div className="mf" id="mfilt"><button data-i18n="lib.all" data-mf="all" className="on">Tout</button><button data-i18n="lib.videos" data-mf="video">Vidéos</button><button data-i18n="lib.images" data-mf="image">Images</button><button data-i18n="lib.sounds" data-mf="audio">Sons</button></div>
              <div id="mlist" className="grid2"></div>
            </div>
      
            <div className="tab" id="t-audio" hidden>
              <h2 data-i18n="common.audio">Audio</h2>
              <button data-i18n="audio.importMusic" className="pri" id="aAud" style={{"width":"100%"}} data-ico="plus">Importer de la musique</button>
              <h3 data-i18n="vo.title">Voix off</h3>
              <div className="fld"><select id="voMic"><option data-i18n="rec.defaultMic" value="">Micro par défaut (Windows)</option></select></div>
              <label className="chk"><span data-i18n="vo.listen">Entendre la vidéo pendant (avec un casque)</span><input type="checkbox" id="voListen" defaultChecked /></label>
              <button data-i18n="vo.record" className="recbtn" id="voGo" style={{"margin":"6px 0"}}><i></i>Enregistrer une voix off</button>
              <div data-i18n="vo.hint" className="hint">Place la tête de lecture, clique et parle : la vidéo défile et ta voix est posée sur la piste Audio, déjà réglée « Voix claire ».</div>
              <button data-tp="1" data-i18n="tp.open" data-ico="prompter" data-s="15" className="sm" style={{"width":"100%","marginBottom":"6px"}}>Téléprompteur</button>
              <h3 data-i18n="tts.title">Texte en voix</h3>
              <div data-i18n="tts.hint" className="hint" style={{"marginBottom":"6px"}}>Écris un texte : une voix installée dans Windows le lit.</div>
              <textarea data-i18n-ph="tts.ph" id="ttsTxt" rows={3} placeholder="…"></textarea>
              <div className="fld" style={{"marginTop":"6px"}}><label data-i18n="tts.voice">Voix</label><select id="ttsVoice"></select></div>
              <div className="ttsmore"><span data-i18n="tts.moreHint" className="hint">Plus de voix (hommes, femmes, autres langues) : ajoute-les gratuitement dans Windows.</span><button className="sm" id="ttsAdd" data-i18n="tts.addVoices">Ajouter des voix</button></div>
              <div className="fld"><label><span data-i18n="tts.rate">Vitesse</span><span id="ttsRateV">0</span></label><input type="range" id="ttsRate" min="-5" max="5" step="1" defaultValue="0" /></div>
              <button data-i18n="tts.go" className="pri" id="ttsGo" style={{"width":"100%"}}>Créer la voix</button>
              <h3 data-i18n="mlib.title">Musiques</h3>
              <div data-i18n="mlib.hint" className="hint" style={{"marginBottom":"6px"}}>Vraies musiques et musiques créées par DedCut : libres de droits, utilisables partout.</div>
              <div className="fld"><label data-i18n="mlib.durDc">Durée des musiques DedCut</label><select id="mdur"></select></div>
              <div id="muslist"></div>
              <h3 data-i18n="audio.sfx">Effets sonores</h3>
              <div id="slist"></div>
              <h3 data-i18n="audio.mySounds">Mes sons</h3>
              <div id="alist"></div>
            </div>
      
            <div className="tab" id="t-text" hidden>
              <h2 data-i18n="common.text">Texte</h2>
              <button data-i18n="text.add" className="pri" id="aText2" style={{"width":"100%","marginBottom":"10px"}} data-ico="plus">Ajouter un texte</button>
              <div className="seg txseg" id="txMode"><button data-txm="style" className="on" data-i18n="txt.styles">Styles</button><button data-txm="anim" data-i18n="insp.animation">Animation</button><button data-txm="subs" data-i18n="text.subs">Sous-titres</button></div>
              <div id="txStyle">
                <div data-i18n="text.tplHint" className="hint" style={{"marginBottom":"8px"}}>Clic = nouveau texte. Si un texte est sélectionné, le modèle lui est appliqué.</div>
                <div className="fcats" id="txcats"></div>
                <div id="txlist"></div>
              </div>
              <div id="txAnim" hidden>
                <div className="tgtbox" id="txTgt"></div>
                <div className="seg" id="txAk"><button data-txa="in" className="on" data-i18n="common.in">Entrée</button><button data-txa="out" data-i18n="common.out">Sortie</button><button data-txa="loop" data-i18n="txt.loop">En boucle</button></div>
                <div data-i18n="txt.animHint" className="hint" style={{"margin":"8px 0"}}>Passe la souris sur une animation pour la voir. Clic = l’appliquer au texte sélectionné.</div>
                <div className="filt" id="txalist"></div>
              </div>
              <div id="txSubs" hidden>
                <div data-i18n="text.subsHint" className="hint" style={{"marginBottom":"6px"}}>Une ligne = un sous-titre. Ils sont répartis sur le clip sélectionné, ou sur toute la vidéo.</div>
                <textarea data-i18n-ph="text.subsPh" id="subTxt" rows={5} placeholder="Salut tout le monde&#10;Aujourd'hui je vous montre…&#10;Abonne-toi !"></textarea>
                <button data-i18n="text.createSubs" id="subGo" className="pri" style={{"width":"100%","marginTop":"6px"}}>Créer les sous-titres</button>
              </div>
            </div>

            <div className="tab aig" id="t-gen" hidden>
              <div className="aig-head"><h2 data-i18n="aig.head">Vidéo IA</h2><span className="aig-pill" data-i18n="aig.local">100 % sur ton PC</span></div>
              <div className="aig-beta" data-i18n="aig.beta">Fonction expérimentale : la Vidéo IA peut bugger, planter ou donner des résultats bizarres. Enregistre ton projet avant de t’en servir.</div>
              <div className="hint" id="aigNeed" hidden></div>
              <div id="aigBody">
                <div className="aig-install" id="aigInstall" hidden>
                  <b data-i18n="aig.installTitle">Installer le générateur vidéo</b>
                  <div className="hint" id="aigInstallInfo"></div>
                  <button data-i18n="aig.install" className="pri" id="aigDl">Installer</button>
                </div>
                <button className="aig-drop" id="aigDrop">
                  <img id="aigImgPrev" alt="" hidden />
                  <span className="aig-drop-t" id="aigDropT"><span className="aig-plus">＋</span><span data-i18n="aig.dropImage">Ajouter une image à animer</span><small data-i18n="aig.optional">facultatif</small></span>
                  <span className="aig-x" id="aigImgClear" data-i18n-title="aig.removeImage" title="Retirer l'image" hidden>✕</span>
                </button>
                <textarea id="aigPrompt" className="aig-prompt" rows={4} data-i18n-ph="aig.promptPh2" placeholder="Décris ce qui se passe…"></textarea>
                <div className="hint" data-i18n="aig.tipEnglish" style={{"margin":"-6px 0 12px","fontSize":"11px"}}>Astuce : l’IA comprend mieux l’anglais.</div>
                <div className="aig-lbl" data-i18n="aig.style">Style</div>
                <div className="aig-styles" id="aigStyles">
                  <button data-v="cartoon" className="on"><i data-ico="sticker" data-s="20"></i><span data-i18n="aig.sCartoon">Dessin animé 3D</span></button>
                  <button data-v="real"><i data-ico="camera" data-s="20"></i><span data-i18n="aig.sReal">Réaliste</span></button>
                  <button data-v="anime"><i data-ico="star" data-s="20"></i><span data-i18n="aig.sAnime">Anime</span></button>
                  <button data-v="clay"><i data-ico="blob" data-s="20"></i><span data-i18n="aig.sClay">Pâte à modeler</span></button>
                  <button data-v="draw"><i data-ico="pen" data-s="20"></i><span data-i18n="aig.sDraw">Dessin 2D</span></button>
                  <button data-v="none"><i data-ico="fx" data-s="20"></i><span data-i18n="aig.sNone">Libre</span></button>
                </div>
                <div className="aig-lbl" data-i18n="aig.format">Format</div>
                <div className="seg aig-seg" id="aigFmt"><button data-v="landscape" className="on"><i className="r169"></i>16:9</button><button data-v="portrait"><i className="r916"></i>9:16</button><button data-v="square"><i className="r11"></i>1:1</button></div>
                <div className="aig-lbl" data-i18n="aig.duration">Durée</div>
                <div className="seg aig-seg" id="aigDur"></div>
                <div data-i18n="aig.longHint" className="hint" id="aigLongHint" hidden style={{"margin":"-4px 0 8px"}}>Plusieurs morceaux enchaînés.</div>
                <button className="pri aig-go" id="aigGo" data-ico="fx" data-s="16"><span data-i18n="aig.create">Créer la vidéo</span></button>
                <div className="hint aig-eta" id="aigEta"></div>
                <div className="aig-run" id="aigRun" hidden>
                  <div className="aig-run-t" id="aigStatus"></div>
                  <div className="capbar"><i id="aigBar"></i></div>
                  <button data-i18n="aig.cancel" className="sm" id="aigCancel">Annuler</button>
                </div>
                <details className="aig-adv">
                  <summary data-i18n="aig.advanced">Réglages avancés</summary>
                  <div className="fld"><label data-i18n="aig.model">Modèle</label>
                    <select id="aigModel" defaultValue="fast"><option value="fast" data-i18n="aig.mFast">FastWan 2.2 5B</option><option value="wan" data-i18n="aig.mWan">Wan 2.1 1.3B</option><option value="vace" data-i18n="aig.mVace">Wan 2.1 VACE</option></select></div>
                  <div className="hint" id="aigModelHint" style={{"marginBottom":"4px"}}></div>
                  <div className="hint" id="aigModelState" style={{"marginBottom":"8px","fontWeight":"600"}}></div>
                  <div className="fld"><label data-i18n="aig.quality">Qualité</label><select id="aigQ"></select></div>
                  <label className="chk" style={{"marginBottom":"8px"}}><span data-i18n="aig.enhance">Netteté et fluidité ×2</span><input type="checkbox" id="aigEnh" defaultChecked /></label>
                  <div className="fld"><label data-i18n="aig.negative">À éviter (facultatif)</label><input id="aigNeg" type="text" defaultValue="blurry, low quality, deformed, distorted, static, watermark, text, ugly, extra limbs" /></div>
                  <div className="fld"><label data-i18n="aig.seed">Graine (seed)</label>
                    <div style={{"display":"flex","gap":"6px"}}><input id="aigSeed" type="number" min="0" /><button className="sm" id="aigSeedRnd" data-i18n="aig.seedRandom">Aléatoire</button></div></div>
                  <div data-i18n="aig.licences" className="hint" style={{"margin":"4px 0 8px"}}>Licences</div>
                  <button data-i18n="aig.removeModel" className="sm" id="aigRm" hidden>Supprimer ce modèle</button>
                </details>
                <div className="hint aig-foot" data-i18n="aig.footer">Contenu généré par IA.</div>
              </div>
            </div>

            <div className="tab" id="t-cap" hidden>
              <h2 data-i18n="cap.title">Sous-titres automatiques</h2>
              <div data-i18n="cap.privacy" className="hint" style={{"marginBottom":"10px"}}>Tout se passe sur ton PC : ni ta voix ni ta vidéo ne sont envoyées sur internet.</div>
              <h3 data-i18n="cap.model">Modèle de reconnaissance</h3>
              <div className="fld"><select id="capModel"></select></div>
              <div className="hint" id="capDlInfo" style={{"marginBottom":"6px"}}></div>
              <div className="capbar" id="capDlBar" hidden><i></i></div>
              <button data-i18n="cap.download" className="pri" id="capDl" style={{"width":"100%"}}>Télécharger le modèle</button>
              <button data-i18n="cap.remove" className="sm" id="capRm" style={{"marginTop":"4px"}} hidden>Supprimer le modèle</button>
              <h3 data-i18n="cap.language">Langue parlée</h3>
              <div className="fld"><select id="capLang"></select></div>
              <div className="fld"><label data-i18n="cap.lineLen">Longueur des lignes</label>
                <div className="seg" id="capLen"><button data-i18n="cap.short" data-v="short">Courte</button><button data-i18n="cap.normal" data-v="normal" className="on">Normale</button><button data-i18n="cap.long" data-v="long">Longue</button></div>
              </div>
              <div className="tgtbox" id="capTgt"></div>
              <button data-i18n="cap.create" className="pri" id="capGo" style={{"width":"100%"}}>Créer les sous-titres</button>
              <div id="capRun" hidden>
                <div className="capbar"><i id="capBar"></i></div>
                <div className="hint" id="capPct" style={{"margin":"6px 0"}}></div>
                <button data-i18n="common.cancel" className="sm" id="capCancel">Annuler</button>
              </div>
              <div data-i18n="cap.slowHint" className="hint" style={{"margin":"8px 0 12px"}}>L'analyse se fait sur le processeur.</div>
              <h3 id="capListTitle"></h3>
              <div id="caplist"></div>
              <div className="qa" style={{"marginTop":"10px"}}>
                <button data-i18n="cap.exportSrt" id="capSrt">Exporter SRT</button>
                <button data-i18n="cap.exportVtt" id="capVtt">Exporter VTT</button>
                <button data-i18n="cap.import" id="capImp">Importer SRT / VTT</button>
                <button data-i18n="cap.clear" id="capClr">Tout supprimer</button>
              </div>
              <button data-i18n="cap.applyStyle" id="capStyle" style={{"width":"100%","marginTop":"6px"}}>Appliquer ce style à tous</button>
              <div data-i18n="cap.styleHint" className="hint" style={{"marginTop":"6px"}}></div>
              <input type="file" id="capFile" accept=".srt,.vtt,text/vtt,application/x-subrip" hidden />
              <h3 data-i18n="ctr.title" style={{"marginTop":"16px"}}>Traduire les sous-titres</h3>
              <div className="fld"><label data-i18n="ctr.to">Vers</label><select id="ctrLang"></select></div>
              <div className="seg" id="ctrMode" style={{"marginBottom":"8px"}}><button data-i18n="ctr.replace" data-v="replace" className="on">Remplacer</button><button data-i18n="ctr.both" data-v="both">Les deux langues</button></div>
              <div className="hint" id="ctrWho" style={{"marginBottom":"6px"}}></div>
              <button data-i18n="ctr.go" className="pri" id="ctrGo" style={{"width":"100%"}}>Traduire</button>
              <button data-i18n="ctr.undo" className="sm" id="ctrUndo" style={{"marginTop":"4px"}} hidden>Remettre la langue d'origine</button>
              <div id="ctrRun" hidden>
                <div className="capbar"><i id="ctrBar"></i></div>
                <div className="hint" id="ctrPct" style={{"margin":"6px 0"}}></div>
                <button data-i18n="common.cancel" className="sm" id="ctrCancel">Annuler</button>
              </div>
              <h3 data-i18n="dub.title" style={{"marginTop":"14px"}}>Voix traduite</h3>
              <div className="fld"><select id="dubVoice"></select></div>
              <label className="chk"><span data-i18n="dub.duck">Baisser le son des vidéos (voix d'origine)</span><input type="checkbox" id="dubDuck" defaultChecked /></label>
              <button data-i18n="dub.go" id="dubGo" style={{"width":"100%","marginTop":"6px"}}>Créer la voix traduite</button>
              <div className="ttsmore" style={{"marginTop":"6px"}}><span data-i18n="dub.hint" className="hint"></span><button className="sm" id="dubAdd" data-i18n="tts.addVoices">Ajouter des voix</button></div>
            </div>

            <div className="tab" id="t-stick" hidden>
              <h2 data-i18n="shape.title">Formes &amp; stickers</h2>
              <div data-i18n="wl.hint" className="hint" style={{"marginBottom":"8px"}}>Passe la souris sur un élément pour le voir bouger. Clic = l’ajouter à la tête de lecture.</div>
              <input type="search" id="wlq" data-i18n-ph="wl.search" placeholder="Rechercher un élément…" style={{"width":"100%","marginBottom":"8px"}} />
              <div className="fcats" id="wcats"></div>
              <div id="wlist"></div>
              <div id="emoBox"><h3 data-i18n="shape.stickers">Stickers</h3><div className="chips c4 emo" id="emolist"></div></div>
              <div className="shp" id="shplist" hidden></div>
            </div>

            <div className="tab" id="t-fx" hidden>
              <h2 data-i18n="common.effects">Effets</h2>
              <div className="tgt tgtbox"></div>
              <div className="fld" style={{"marginTop":"4px"}}><label><span data-i18n="common.intensity">Intensité</span><span id="fxAmtV"></span></label><input type="range" id="fxAmt" min="0" max="100" /></div>
              <div className="pre fbtns"><button id="fxClear" data-i18n="fx.clearAll">Retirer tous les effets</button></div>
              <div data-i18n="fx.hoverHint" className="hint" style={{"margin":"0 0 8px"}}>Passe la souris sur un effet pour le voir bouger. Clic = ajouter / retirer.</div>
              <h3 data-i18n="fx.oneClick">Styles en 1 clic</h3>
              <div className="filt" id="fxpre"></div>
              <h3 data-i18n="common.effects">Effets</h3>
              <div className="fcats" id="fxcats"></div>
              <div id="fxlist"></div>
            </div>
      
            <div className="tab" id="t-tr" hidden>
              <h2 data-i18n="common.transitions">Transitions</h2>
              <div className="tgt tgtbox"></div>
              <div className="seg" id="trWhere"><button data-i18n="common.in" data-w="in" className="on">Entrée</button><button data-i18n="common.out" data-w="out">Sortie</button><button data-i18n="tr.both" data-w="both">Les deux</button></div>
              <div className="fld"><label data-i18n="common.duration">Durée <span id="trDurV"></span></label><input type="range" id="trDur" min="0.1" max="2" step="0.1" /></div>
              <button data-i18n="tr.crossPrev" id="trCross" style={{"width":"100%","margin":"2px 0 10px"}}>Fondu enchaîné avec le clip précédent</button>
              <div data-i18n="tr.hoverHint" className="hint" style={{"margin":"0 0 8px"}}>Passe la souris sur une transition pour la voir. Clic = appliquer + aperçu.</div>
              <div className="fcats" id="trcats"></div>
              <div id="trlist"></div>
            </div>
      
            <div className="tab" id="t-filt" hidden>
              <h2 data-i18n="common.filters">Filtres</h2>
              <div className="tgt2 tgtbox"></div>
              <div className="fcats" id="fcats"></div>
              <div className="fld fAmt" id="fAmtBox" hidden><label><span data-i18n="look.intensity">Intensité</span><span id="fAmtV">100</span></label><input type="range" id="fAmt" min="0" max="100" step="1" defaultValue="100" /></div>
              <div className="pre fbtns"><button id="fAll" data-i18n="look.applyAll">Appliquer à toute la vidéo</button><button id="fNone" data-i18n="look.remove">Retirer le filtre</button></div>
              <div id="filtlist"></div>
              <div data-i18n="filt.hint" className="hint" style={{"marginTop":"12px"}}>Réglages fins : onglet « Couleurs » à droite.</div>
            </div>
      
            <div className="tab" id="t-rec" hidden>
              <h2 data-i18n="rec.title">Enregistrer</h2>
              <div id="recIdle">
                <div className="chips c3 recmode" id="recMode"><button data-rmode="screen" className="on" data-i18n="rec.mode.screen">Écran</button><button data-rmode="cam" data-i18n="rec.mode.cam">Caméra</button><button data-rmode="mic" data-i18n="rec.mode.mic">Micro</button></div>
                <p className="hint" id="recModeHint"></p>
                <div className="rm-screen">
                  <h3 data-i18n="rec.what">Que veux-tu enregistrer ?</h3>
                  <div className="srcs" id="srcList"></div>
                  <button data-i18n="rec.refresh" className="sm" id="srcRefresh" style={{"marginTop":"6px"}}>Actualiser la liste</button>
                </div>
                <h3 data-i18n="rec.sound">Son</h3>
                <label className="chk rm-screen"><span data-i18n="rec.sysSound">Son du PC (jeu, musique, Discord…)</span><input type="checkbox" id="recSys" defaultChecked /></label>
                <div className="fld"><label data-i18n="rec.mic">Micro</label><select id="recMic"><option data-i18n="rec.noMic" value="">Pas de micro</option></select></div>
                <div className="fld"><label data-i18n="rec.micVolume">Volume du micro <span id="recMicV">100 %</span></label><input type="range" id="recMicVol" min="0" max="200" defaultValue="100" /></div>
                <div data-i18n-title="ui.micLevel" className="meter" title="Niveau du micro"><i id="micLvl"></i></div>
                <label className="chk" id="recMicSepL"><span data-i18n="rec.micSep">Micro sur une piste à part (réglé « Voix claire »)</span><input type="checkbox" id="recMicSep" defaultChecked /></label>
                <button data-tp="1" data-i18n="tp.open" data-ico="prompter" data-s="15" className="sm" style={{"width":"100%","marginTop":"8px"}}>Téléprompteur</button>
                <h3 data-i18n="rec.camera" className="rm-av">Caméra</h3>
                <label className="chk rm-screen"><span data-i18n="rec.facecam">Facecam (webcam en incrustation)</span><input type="checkbox" id="recCam" /></label>
                <div id="camBox" hidden><div className="fld"><select id="recCamSel"><option data-i18n="rec.defaultCam" value="">Caméra par défaut</option></select></div><div className="campv"><video id="camPrev" muted playsInline></video></div>
                  <div id="camOpts">
                    <div className="fld"><label data-i18n="rec.camPos">Position</label><div className="copt" id="camPos"><button data-cpos="tl" data-i18n-title="rec.pos.tl" title="En haut à gauche">↖</button><button data-cpos="tr" data-i18n-title="rec.pos.tr" title="En haut à droite">↗</button><button data-cpos="bl" data-i18n-title="rec.pos.bl" title="En bas à gauche">↙</button><button data-cpos="br" data-i18n-title="rec.pos.br" title="En bas à droite">↘</button></div></div>
                    <div className="fld"><label data-i18n="rec.camShape">Forme</label><div className="copt" id="camShape"><button data-cshape="round" data-i18n="rec.shape.round">Rond</button><button data-cshape="rounded" data-i18n="rec.shape.rounded">Arrondi</button><button data-cshape="square" data-i18n="rec.shape.square">Carré</button></div></div>
                    <div className="fld"><label data-i18n="rec.camSize">Taille</label><div className="copt" id="camSize"><button data-csize="s" data-i18n="rec.size.s">Petite</button><button data-csize="m" data-i18n="rec.size.m">Moyenne</button><button data-csize="l" data-i18n="rec.size.l">Grande</button></div></div>
                  </div>
                </div>
                <h3 data-i18n="common.quality" className="rm-av">Qualité</h3>
                <div className="fld rm-av"><select defaultValue="1080:60" id="recQ"><option data-i18n="rec.q720" value="720:30">720p · 30 i/s (léger)</option><option data-i18n="rec.q1080" value="1080:30">1080p · 30 i/s</option><option data-i18n="rec.q1080g" value="1080:60">1080p · 60 i/s (jeux)</option><option data-i18n="rec.q1440" value="1440:60">1440p (2K) · 60 i/s</option><option data-i18n="rec.q4k30" value="2160:30">2160p (4K) · 30 i/s</option><option data-i18n="rec.q4k60" value="2160:60">2160p (4K) · 60 i/s</option><option data-i18n="rec.qScreen" value="0:60">Taille de l'écran · 60 i/s</option></select></div>
                <h3 data-i18n="rec.options">Options</h3>
                <label className="chk rm-screen"><span data-i18n="rec.minimize">Réduire DedCut pendant l'enregistrement</span><input type="checkbox" id="recMin" defaultChecked /></label>
                <label className="chk"><span data-i18n="rec.countdown">Compte à rebours de 3 s</span><input type="checkbox" id="recCd" defaultChecked /></label>
                <div className="fld"><label data-i18n="rec.autoStop">Arrêt automatique</label><select id="recLimit"><option value="0" data-i18n="rec.never">Jamais</option><option value="60">1 min</option><option value="300">5 min</option><option value="600">10 min</option><option value="1800">30 min</option><option value="3600">1 h</option><option value="7200">2 h</option></select></div>
                <button data-i18n="rec.start" className="recbtn" id="recGo"><i></i>Démarrer l'enregistrement</button>
                <p className="hint"><span data-i18n="rec.duringGame">Pendant le jeu :</span> <kbd data-i18n="rec.hotkey" className="k">Ctrl+Maj+R</kbd> <span data-i18n="rec.hotkeyAction">démarre / arrête l'enregistrement.</span></p>
                <p className="hint"><span data-i18n="rec.savedTo">Les vidéos vont dans tes médias et dans le dossier</span> <b data-i18n="rec.folder">{'Vidéos\\DedCut'}</b> · <a data-i18n="settings.openFolder" href="#" id="recFolder">Ouvrir le dossier</a></p>
                <p data-i18n="rec.gameTip" className="hint rm-screen">Valorant / jeux : si l'image est noire, mets le jeu en « Plein écran fenêtré ».</p>
              </div>
              <div id="recRun" hidden>
                <div className="recbig" id="recBig"><i></i><b id="recTime">00:00</b></div>
                <div className="recpaused" id="recPausedTag" data-i18n="rec.paused" hidden>En pause</div>
                <div className="hint" id="recInfo" style={{"textAlign":"center","marginBottom":"10px"}}></div>
                <video id="recLive" muted playsInline hidden></video>
                <div className="recctl"><button id="recPause"><span data-i18n="rec.pause">Pause</span></button><button id="recMark"><span data-i18n="rec.mark">Moment fort</span></button></div>
                <div className="hint" id="recMoments" style={{"textAlign":"center"}}></div>
                <button data-i18n="rec.stop" className="recbtn stop" id="recStop"><i></i>Arrêter (Ctrl+Maj+R)</button>
                <p className="hint" data-i18n="rec.runKeys" style={{"textAlign":"center"}}>Ctrl+Maj+P : pause · Ctrl+Maj+M : moment fort</p>
              </div>
            </div>
          </aside>
          </div>
      
          <section id="stage">
            <div id="vwrap"><canvas id="cv" width="1280" height="720"></canvas><canvas id="guides"></canvas></div>
            <div id="tr">
              <div className="tleft"><span id="tc" data-i18n-title="tc.tip" title="Clique pour taper un moment précis"><b>00:00:00</b> / 00:00:00</span><canvas data-i18n-title="ui.vuTip" id="vu" width="90" height="16" title="Niveau du son (vert → rouge)"></canvas></div>
              <div className="pctl">
                <button data-i18n-title="ui.startTip" id="bStart" data-ico="start" title="Début (Origine)"></button>
                <button data-i18n-title="ui.prevTip" id="bPrev" data-ico="prev" title="Image précédente (←)"></button>
                <button data-i18n-title="ui.playTip" id="bPlay" title="Lecture (Espace)"></button>
                <button data-i18n-title="ui.nextTip" id="bNext" data-ico="next" title="Image suivante (→)"></button>
                <button data-i18n-title="ui.endTip" id="bEnd" data-ico="end" title="Fin (Fin)"></button>
                <button data-i18n-title="pl.tip" id="bLoop" data-ico="loop" title="Lecture en boucle (L)"></button>
              </div>
              <div className="pright">
                <select data-i18n-title="ui.formatTip" id="fmt" autoComplete="off" title="Format de la vidéo">
                  <option value="1280x720">16:9 · 720p</option>
                  <option value="1920x1080">16:9 · 1080p</option>
                  <option value="1080x1920">9:16 · TikTok / Shorts</option>
                  <option data-i18n="fmt.square" value="1080x1080">1:1 · Carré</option>
                  <option value="1080x1350">4:5 · Instagram</option>
                  <option data-i18n="fmt.classic" value="1440x1080">4:3 · Classique</option>
                  <option data-i18n="fmt.cinema" value="2560x1080">21:9 · Cinéma</option>
                  <option value="2560x1440">16:9 · 2K (1440p)</option>
                  <option value="3840x2160">16:9 · 4K (2160p)</option>
                  <option data-i18n="fmt.v2k" value="1440x2560">9:16 · 2K vertical</option>
                  <option data-i18n="fmt.v4k" value="2160x3840">9:16 · 4K vertical</option>
                </select>
                <button data-i18n-title="guide.tip" id="bGuide" data-ico="guides" title="Guides d’aperçu"></button>
                <button data-i18n-title="ui.snapTip" id="bSnap" data-ico="camera" title="Enregistrer l'image affichée (PNG)"></button>
                <button data-i18n-title="ui.fullTip" id="bFull" data-ico="full" title="Plein écran"></button>
              </div>
            </div>
          </section>
      
          <aside id="insp"></aside>
        </main>
      
        <div id="tl">
          <div id="tlResize" data-i18n-title="tl.resizeTip" title="Glisse pour agrandir ou réduire la timeline (double-clic : taille normale)"></div>
          <div id="tbar">
            <button data-i18n-title="tl.splitTip" data-tb="split" data-ico="split" title="Couper à la tête de lecture (S)"></button>
            <button data-i18n-title="tl.delTip" data-tb="del" data-ico="trash" title="Supprimer (Suppr)"></button>
            <button data-i18n-title="tl.rippleTip" data-tb="ripple" data-ico="ripple" title="Supprimer et resserrer (Maj+Suppr)"></button>
            <button data-i18n-title="tl.dupTip" data-tb="dup" data-ico="copy" title="Dupliquer (Ctrl+D)"></button>
            <span className="vs"></span>
            <button data-i18n-title="tl.freeze" data-tb="freeze" data-ico="freeze" title="Arrêt sur image"></button>
            <button data-i18n-title="common.mirror" data-tb="flip" data-ico="flip" title="Miroir"></button>
            <button data-i18n-title="common.rotate90" data-tb="rot" data-ico="rotate" title="Rotation 90°"></button>
            <span className="vs"></span>
            <button data-i18n-title="tl.kfTip" data-tb="kf" data-ico="kf" title="Ajouter / retirer une image clé (K)"></button>
            <button data-i18n-title="tl.markerTip" data-tb="mark" data-ico="marker" title="Marqueur (M)"></button>
            <span className="vs"></span>
            <div id="scbar"></div>
            <button data-i18n-title="tl.magnetTip" data-tb="snap" data-ico="magnet" title="Aimantation" className="on"></button>
            <span className="vs"></span>
            <button data-i18n-title="tl.zoutTip" data-tb="zout" data-ico="zoomout" title="Dézoomer (-)"></button>
            <input data-i18n-title="tl.zoomTip" type="range" id="zoom" min="10" max="400" defaultValue="80" title="Zoom de la timeline (Ctrl+molette)" />
            <button data-i18n-title="tl.zinTip" data-tb="zin" data-ico="zoomin" title="Zoomer (+)"></button>
            <button data-i18n-title="tl.fitTip" data-tb="fit" data-ico="fit" title="Tout afficher"></button>
          </div>
          <div id="tlb">
            <div id="tll"></div>
            <div id="tls"><div id="tli"><div id="ruler"></div><div id="rows"></div><div id="ph"></div></div></div>
          </div>
        </div>
        <section id="studio" hidden>
          <div className="st-top">
            <div className="st-prev" id="stPrevArea"><div className="st-wrap" id="stWrap"><canvas id="stCv" width="1280" height="720"></canvas><div id="stSel" hidden><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div></div></div>
            <aside className="st-side" id="stSide"></aside>
          </div>
          <div className="st-docks">
            <div className="st-dock"><h4 data-i18n="st.scenes">Scènes</h4><div className="st-list" id="stScenes"></div><div className="st-tools"><button id="stScAdd" data-ico="plus" data-s="15" data-i18n-title="st.addScene" title="Ajouter une scène"></button><button id="stScDel" data-ico="minus" data-s="15" data-i18n-title="st.delScene" title="Supprimer la scène"></button><button id="stScUp" data-ico="up" data-s="15" data-i18n-title="st.moveUp" title="Monter"></button><button id="stScDown" data-ico="down" data-s="15" data-i18n-title="st.moveDown" title="Descendre"></button></div></div>
            <div className="st-dock"><h4 data-i18n="st.sources">Sources</h4><div className="st-list" id="stSources"></div><div className="st-tools"><button id="stSrcAdd" data-ico="plus" data-s="15" data-i18n-title="st.addSource" title="Ajouter une source"></button><button id="stSrcDel" data-ico="minus" data-s="15" data-i18n-title="st.delSource" title="Enlever la source"></button><button id="stSrcUp" data-ico="up" data-s="15" data-i18n-title="st.moveUp" title="Monter"></button><button id="stSrcDown" data-ico="down" data-s="15" data-i18n-title="st.moveDown" title="Descendre"></button></div></div>
            <div className="st-dock"><h4 data-i18n="st.mixer">Mixeur audio</h4><div className="st-list" id="stMixer"></div></div>
            <div className="st-dock"><h4 data-i18n="st.controls">Commandes</h4><div className="st-ctl" id="stCtl"></div></div>
          </div>
          <div className="st-status" id="stStatus"></div>
          <div className="st-menu" id="stAddMenu" hidden></div>
        </section>
        <section id="imgApp" hidden></section>
        <section id="muApp" hidden></section>
      </div>
      
      <div id="ov"><div className="box">
        <div id="expForm">
          <h3 data-i18n="export.title">Exporter la vidéo</h3>
          <div className="fld"><label data-i18n="export.fileName">Nom du fichier</label><input type="text" id="xName" /></div>
          <div className="fld"><label data-i18n="export.preset">Préréglage</label><select id="xPre"><option data-i18n="export.custom" value="perso">Personnalisé</option><option data-i18n="export.discord" value="discord">Discord — moins de 10 Mo</option><option data-i18n="export.nitro" value="nitro">Discord Nitro — moins de 50 Mo</option><option data-i18n="export.youtube" value="yt">YouTube — haute qualité (60 i/s)</option><option value="tiktok">TikTok / Shorts / Reels</option></select></div>
          <div className="fld"><label data-i18n="export.resolution">Résolution d'export</label><select id="xRes"><option data-i18n="export.projectRes" value="0">Celle du projet</option><option value="720">720p (HD)</option><option value="1080">1080p (Full HD)</option><option value="1440">1440p (2K)</option><option value="2160">2160p (4K)</option></select></div>
          <div className="fld"><label data-i18n="export.format">Format</label><select defaultValue="mp4" id="xFmt"><option data-i18n="export.mp4fast" value="mp4">MP4 rapide (recommandé)</option><option data-i18n="export.webm" value="webm">WebM (temps réel)</option><option data-i18n="export.gif" value="gif">GIF animé</option><option data-i18n="export.wav" value="wav">Son seul — WAV</option><option data-i18n="export.m4a" value="m4a">Son seul — M4A</option></select></div>
          <label className="chk" id="xRangeRow" hidden><span id="xRangeTxt"></span><input type="checkbox" id="xRange" defaultChecked /></label>
          <div className="two">
            <div className="fld"><label data-i18n="export.fps">Images par seconde</label><select defaultValue="30" id="xFps"><option value="24">24</option><option value="25">25</option><option value="30">30</option><option value="50">50</option><option value="60">60</option></select></div>
            <div className="fld"><label data-i18n="common.quality">Qualité</label><select defaultValue="10" id="xQ"><option data-i18n="export.qLow" value="2.5">Basse</option><option data-i18n="export.qMedium" value="5">Moyenne</option><option data-i18n="export.qHigh" value="10">Haute</option><option data-i18n="export.qMax" value="20">Maximale</option><option data-i18n="export.qCustom" value="c">Personnalisée</option></select></div>
          </div>
          <div className="fld" id="xQcF" hidden><label data-i18n="export.customRate">Débit vidéo (Mbit/s)</label><input type="number" id="xQc" min="0.5" max="80" step="0.5" defaultValue="8" /></div>
          <p className="hint" id="xInfo"></p>
          <div className="btns"><button data-i18n="export.png" id="xPng" data-ico="camera">Image PNG</button><button data-i18n="th.btn" id="xThumb" data-ico="image">Miniature IA</button><button data-i18n="sho.btn" id="xShorts" data-ico="phone">Shorts auto</button><button data-i18n="desc.btn" id="xDesc" data-ico="text">Description YouTube</button><span className="sp"></span><button data-i18n="common.cancel" id="xCancel">Annuler</button><button data-i18n="ui.export" id="xGo" className="pri">Exporter</button></div>
        </div>
        <div id="expRun" hidden>
          <h3 data-i18n="export.running">Export en cours…</h3>
          <div className="hint" id="xRunInfo"></div>
          <div id="bar"><i></i></div>
          <div className="btns"><span id="xPct" className="hint">0 %</span><span className="sp"></span><button data-i18n="common.cancel" id="bCancel">Annuler</button></div>
        </div>
      </div></div>
      <div id="toast"></div>
      <div id="themes" hidden></div>
      <div id="layoutPick" hidden></div>
      <div id="cd"></div>
      <div id="ctx" hidden></div>
    </>
  );
}

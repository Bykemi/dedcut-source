; Installateur DedCut : modèle Tauri 2.12.1 (MIT / Apache-2.0) + interface DedCut. FICHIER FABRIQUÉ par installer/make-template.cjs : ne pas modifier à la main.
Unicode true
ManifestDPIAware true
; Add in `dpiAwareness` `PerMonitorV2` to manifest for Windows 10 1607+ (note this should not affect lower versions since they should be able to ignore this and pick up `dpiAware` `true` set by `ManifestDPIAware true`)
; Currently undocumented on NSIS's website but is in the Docs folder of source tree, see
; https://github.com/kichik/nsis/blob/5fc0b87b819a9eec006df4967d08e522ddd651c9/Docs/src/attributes.but#L286-L300
; https://github.com/tauri-apps/tauri/pull/10106
ManifestDPIAwareness PerMonitorV2

!if "{{compression}}" == "none"
  SetCompress off
!else
  ; Set the compression algorithm. We default to LZMA.
  SetCompressor /SOLID "{{compression}}"
!endif

; Keep above !include to stay ahead of any plugin command
; see https://github.com/tauri-apps/tauri/pull/15422#discussion_r3289239624
{{#if signed_plugins_path}}
!addplugindir "{{signed_plugins_path}}"
{{/if}}

!include MUI2.nsh
!include FileFunc.nsh
!include x64.nsh
!include WordFunc.nsh
!include "utils.nsh"
!include "FileAssociation.nsh"
!include "Win\COM.nsh"
!include "Win\Propkey.nsh"
!include "Win\RestartManager.nsh"
!include "StrFunc.nsh"
${StrCase}
${StrLoc}

{{#if installer_hooks}}
!include "{{installer_hooks}}"
{{/if}}

!define WEBVIEW2APPGUID "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

!define MANUFACTURER "{{manufacturer}}"
!define PRODUCTNAME "{{product_name}}"
!define VERSION "{{version}}"
!define VERSIONWITHBUILD "{{version_with_build}}"
!define HOMEPAGE "{{homepage}}"
!define INSTALLMODE "{{install_mode}}"
!define LICENSE "{{license}}"
!define INSTALLERICON "{{installer_icon}}"
!define SIDEBARIMAGE "{{sidebar_image}}"
!define HEADERIMAGE "{{header_image}}"
!define UNINSTALLERICON "{{uninstaller_icon}}"
!define UNINSTALLERHEADERIMAGE "{{uninstaller_header_image}}"
!define MAINBINARYNAME "{{main_binary_name}}"
!define MAINBINARYSRCPATH "{{main_binary_path}}"
!define BUNDLEID "{{bundle_id}}"
!define COPYRIGHT "{{copyright}}"
!define OUTFILE "{{out_file}}"
!define ARCH "{{arch}}"
!define ADDITIONALPLUGINSPATH "{{additional_plugins_path}}"
!define ALLOWDOWNGRADES "{{allow_downgrades}}"
!define DISPLAYLANGUAGESELECTOR "{{display_language_selector}}"
!define INSTALLWEBVIEW2MODE "{{install_webview2_mode}}"
!define WEBVIEW2INSTALLERARGS "{{webview2_installer_args}}"
!define WEBVIEW2BOOTSTRAPPERPATH "{{webview2_bootstrapper_path}}"
!define WEBVIEW2INSTALLERPATH "{{webview2_installer_path}}"
!define MINIMUMWEBVIEW2VERSION "{{minimum_webview2_version}}"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}"
!define MANUKEY "Software\${MANUFACTURER}"
!define MANUPRODUCTKEY "${MANUKEY}\${PRODUCTNAME}"
!define UNINSTALLERSIGNCOMMAND "{{uninstaller_sign_cmd}}"
!define ESTIMATEDSIZE "{{estimated_size}}"
!define STARTMENUFOLDER "{{start_menu_folder}}"

Var PassiveMode
Var UpdateMode
Var NoShortcutMode
Var WixMode
Var OldMainBinaryName

Name "${PRODUCTNAME}"
BrandingText "${COPYRIGHT}"
OutFile "${OUTFILE}"

; We don't actually use this value as default install path,
; it's just for nsis to append the product name folder in the directory selector
; https://nsis.sourceforge.io/Reference/InstallDir
!define PLACEHOLDER_INSTALL_DIR "placeholder\${PRODUCTNAME}"
InstallDir "${PLACEHOLDER_INSTALL_DIR}"

VIProductVersion "${VERSIONWITHBUILD}"
VIAddVersionKey "ProductName" "${PRODUCTNAME}"
VIAddVersionKey "FileDescription" "${PRODUCTNAME}"
VIAddVersionKey "LegalCopyright" "${COPYRIGHT}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

# additional plugins
!addplugindir "${ADDITIONALPLUGINSPATH}"

; Uninstaller signing command
!if "${UNINSTALLERSIGNCOMMAND}" != ""
  !uninstfinalize '${UNINSTALLERSIGNCOMMAND}'
!endif

; Handle install mode, `perUser`, `perMachine` or `both`
!if "${INSTALLMODE}" == "perMachine"
  RequestExecutionLevel admin
!endif

!if "${INSTALLMODE}" == "currentUser"
  RequestExecutionLevel user
!endif

!if "${INSTALLMODE}" == "both"
  !define MULTIUSER_MUI
  !define MULTIUSER_INSTALLMODE_INSTDIR "${PRODUCTNAME}"
  !define MULTIUSER_INSTALLMODE_COMMANDLINE
  !if "${ARCH}" == "x64"
    !define MULTIUSER_USE_PROGRAMFILES64
  !else if "${ARCH}" == "arm64"
    !define MULTIUSER_USE_PROGRAMFILES64
  !endif
  !define MULTIUSER_INSTALLMODE_DEFAULT_REGISTRY_KEY "${UNINSTKEY}"
  !define MULTIUSER_INSTALLMODE_DEFAULT_REGISTRY_VALUENAME "CurrentUser"
  !define MULTIUSER_INSTALLMODEPAGE_SHOWUSERNAME
  !define MULTIUSER_INSTALLMODE_FUNCTION RestorePreviousInstallLocation
  !define MULTIUSER_EXECUTIONLEVEL Highest
  !include MultiUser.nsh
!endif

; Installer icon
!if "${INSTALLERICON}" != ""
  !define MUI_ICON "${INSTALLERICON}"
!endif

; Installer sidebar image
!if "${SIDEBARIMAGE}" != ""
  !define MUI_WELCOMEFINISHPAGE_BITMAP "${SIDEBARIMAGE}"
!endif

; Enable header images for installer and uninstaller pages when either image is configured.
!if "${HEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE
!else if "${UNINSTALLERHEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE
!endif

; Installer header image
!if "${HEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE_BITMAP "${HEADERIMAGE}"
!endif

; Uninstaller header image
!if "${UNINSTALLERHEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE_UNBITMAP "${UNINSTALLERHEADERIMAGE}"
!endif

; Uninstaller icon
!if "${UNINSTALLERICON}" != ""
  !define MUI_UNICON "${UNINSTALLERICON}"
!endif

; Define registry key to store installer language
!define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
!define MUI_LANGDLL_REGISTRY_KEY "${MANUPRODUCTKEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"

; ===== Interface DedCut de l'installateur et du désinstalleur (v4.59) =====
; Inséré par make-template.cjs dans installer.nsi, juste avant les pages.
; La fenêtre de Windows (en-tête, boutons, lignes) est cachée : chaque page DedCut prend toute la fenêtre.
; Bandeau avec le logo, textes clairs sur le fond de DedCut, vrais boutons arrondis (dégradé violet → cyan) qui
; s'éclairent au survol, case à cocher DedCut. Images : installer/ui (make-ui.cjs), une série par zoom d'écran ;
; les textes traduits (dedcut-textes.nsh) sont écrits sur les boutons au moment de l'affichage.
; Pages : accueil (dossier, raccourci) → installation → fin (lancer DedCut).
; Désinstalleur : accueil (garder ou non les réglages) → désinstallation → fin.
; Mises à jour automatiques (/P /UPDATE) : seule la page d'installation s'affiche, aux couleurs de DedCut.

!define DC_BG "09080F"
!define DC_FG "F1EFFA"
!define DC_DIM "A49EBD"
!define DC_DIM2 "6F6889"
!define DC_FIELD "121019"
!define DC_AC "A78BFA"

; dossier des images : installer/ui, à côté de sidebar.bmp dont Tauri donne le chemin complet
!searchreplace DCUI "${SIDEBARIMAGE}" "sidebar.bmp" "ui\"

!define MUI_BGCOLOR "${DC_BG}"
!define MUI_TEXTCOLOR "${DC_FG}"
!define MUI_INSTFILESPAGE_COLORS "${DC_FG} ${DC_BG}"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"
!define MUI_CUSTOMFUNCTION_GUIINIT DcGuiInit
!define MUI_CUSTOMFUNCTION_UNGUIINIT un.DcGuiInit

Var DcPct       ; zoom de l'écran retenu : 100, 125, 150, 175 ou 200
Var DcDlg       ; page affichée
Var DcHot       ; bouton survolé (0 = aucun)
Var DcFTitle
Var DcFText
Var DcFSmall
Var DcFCap
Var DcFBtn
Var DcFBtnS
Var DcOld       ; version déjà installée ("" = aucune)
Var DcCmp       ; 2 = pas installé, 1 = mise à jour, 0 = même version, -1 = une version plus récente est installée
Var DcDir       ; champ du dossier d'installation
Var DcChkImg    ; case à cocher : image
Var DcChkTxt    ; case à cocher : texte
Var DcChk       ; case à cocher : 1 = cochée
Var DcDesk      ; raccourci sur le Bureau demandé (accueil)
Var DcNoUninst  ; 1 = installer par-dessus (pas de page « déjà installé »)
Var DcInstTitle ; page d'installation : titre
Var DcInstWait  ; page d'installation : « Ça ne prend que quelques secondes »
Var DeleteAppDataCheckbox
Var DeleteAppDataCheckboxState

; valeur à 100 % → pixels au zoom retenu
!macro DcPx OUT V
  IntOp ${OUT} ${V} * $DcPct
  IntOp ${OUT} ${OUT} / 100
!macroend
!define DcPx "!insertmacro DcPx"

!macro DcHideId ID
  GetDlgItem $0 $HWNDPARENT ${ID}
  ShowWindow $0 ${SW_HIDE}
!macroend

; images d'une série (zoom P) copiées dans le dossier temporaire de l'installateur
!macro DcFiles P
  File "/oname=$PLUGINSDIR\dc-hero.bmp" "${DCUI}hero-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-pri.bmp" "${DCUI}pri-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-pri-h.bmp" "${DCUI}pri-h-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-sec.bmp" "${DCUI}sec-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-sec-h.bmp" "${DCUI}sec-h-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-sm.bmp" "${DCUI}sm-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-sm-h.bmp" "${DCUI}sm-h-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-field.bmp" "${DCUI}field-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-chk0.bmp" "${DCUI}chk0-${P}.bmp"
  File "/oname=$PLUGINSDIR\dc-chk1.bmp" "${DCUI}chk1-${P}.bmp"
!macroend

!macro DC_UI UN
; ---- fenêtre : zoom, taille, barre de titre sombre, images, polices ----
Function ${UN}DcGuiInit
  StrCpy $0 0
  System::Call 'user32::GetDpiForWindow(p $HWNDPARENT) i .r0'
  ${If} $0 < 96
    System::Call 'user32::GetDC(p 0) p .r1'
    System::Call 'gdi32::GetDeviceCaps(p r1, i 88) i .r0'
    System::Call 'user32::ReleaseDC(p 0, p r1)'
  ${EndIf}
  ${If} $0 < 96
    StrCpy $0 96
  ${EndIf}
  ; arrondi au quart le plus proche (100, 125, 150, 175, 200 %)
  IntOp $1 $0 * 100
  IntOp $1 $1 / 96
  IntOp $1 $1 + 12
  IntOp $1 $1 / 25
  IntOp $1 $1 * 25
  ${If} $1 < 100
    StrCpy $1 100
  ${ElseIf} $1 > 200
    StrCpy $1 200
  ${EndIf}
  StrCpy $DcPct $1

  InitPluginsDir
  ${Select} $DcPct
    ${Case} 125
      !insertmacro DcFiles 125
    ${Case} 150
      !insertmacro DcFiles 150
    ${Case} 175
      !insertmacro DcFiles 175
    ${Case} 200
      !insertmacro DcFiles 200
    ${CaseElse}
      !insertmacro DcFiles 100
  ${EndSelect}

  ; taille de la fenêtre : 620 x 440 à 100 %, même centre qu'avant
  ${DcPx} $2 620
  ${DcPx} $3 440
  System::Call '*(i,i,i,i) p .r4'
  System::Call 'user32::GetWindowRect(p $HWNDPARENT, p r4)'
  System::Call '*$4(i .r5, i .r6, i .r7, i .r8)'
  System::Call 'user32::GetClientRect(p $HWNDPARENT, p r4)'
  System::Call '*$4(i, i, i .r9, i .R0)'
  System::Free $4
  IntOp $R1 $7 - $5
  IntOp $R1 $R1 - $9
  IntOp $R1 $R1 + $2
  IntOp $R2 $8 - $6
  IntOp $R2 $R2 - $R0
  IntOp $R2 $R2 + $3
  IntOp $R3 $5 + $7
  IntOp $R3 $R3 / 2
  IntOp $R4 $R1 / 2
  IntOp $R3 $R3 - $R4
  IntOp $R5 $6 + $8
  IntOp $R5 $R5 / 2
  IntOp $R4 $R2 / 2
  IntOp $R5 $R5 - $R4
  ${If} $R5 < 0
    StrCpy $R5 0
  ${EndIf}
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i R3, i R5, i R1, i R2, i 0x14)'
  GetDlgItem $0 $HWNDPARENT 1018
  System::Call 'user32::SetWindowPos(p r0, p 0, i 0, i 0, i r2, i r3, i 0x14)'

  ; barre de titre sombre (Windows 10 20H1+), couleur de DedCut et bord violet (Windows 11)
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i 1, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 19, *i 1, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 35, *i 0x000F0809, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 34, *i 0x00553B4A, i 4)'
  SetCtlColors $HWNDPARENT ${DC_FG} ${DC_BG}

  CreateFont $DcFTitle "Segoe UI" 16 600
  CreateFont $DcFText "Segoe UI" 10 400
  CreateFont $DcFSmall "Segoe UI" 9 400
  CreateFont $DcFCap "Segoe UI" 8 700
  CreateFont $DcFBtn "Segoe UI" 10 600
  CreateFont $DcFBtnS "Segoe UI" 9 600
  StrCpy $DcHot 0
  Call ${UN}DcChrome

  !if "${UN}" == ""
    ; ce qui est déjà installé (pour les textes de l'accueil)
    StrCpy $DcCmp 2
    ReadRegStr $DcOld SHCTX "${UNINSTKEY}" "DisplayVersion"
    ReadRegStr $0 SHCTX "${UNINSTKEY}" "UninstallString"
    ${If} $0 == ""
      StrCpy $DcOld ""
    ${EndIf}
    ${If} $DcOld != ""
      nsis_tauri_utils::SemverCompare "${VERSION}" $DcOld
      Pop $DcCmp
    ${EndIf}
  !endif
FunctionEnd

; cache le cadre de Windows (Windows le remontre parfois en changeant de page)
Function ${UN}DcChrome
  Push $0
  !insertmacro DcHideId 1
  !insertmacro DcHideId 2
  !insertmacro DcHideId 3
  !insertmacro DcHideId 1018
  !insertmacro DcHideId 1028
  !insertmacro DcHideId 1034
  !insertmacro DcHideId 1035
  !insertmacro DcHideId 1036
  !insertmacro DcHideId 1037
  !insertmacro DcHideId 1038
  !insertmacro DcHideId 1039
  !insertmacro DcHideId 1045
  !insertmacro DcHideId 1046
  !insertmacro DcHideId 1256
  Pop $0
FunctionEnd

; nouvelle page DedCut ($DcDlg = page de nsDialogs) : toute la fenêtre, fond sombre
Function ${UN}DcPageSetup
  Call ${UN}DcChrome
  ${DcPx} $0 620
  ${DcPx} $1 440
  System::Call 'user32::SetWindowPos(p $DcDlg, p 0, i 0, i 0, i r0, i r1, i 0x14)'
  SetCtlColors $DcDlg ${DC_FG} ${DC_BG}
  StrCpy $DcHot 0
FunctionEnd

; $R0 = nom d'image (hero, pri, sec…) → $R0 = image chargée (HBITMAP)
Function ${UN}DcImg
  System::Call 'user32::LoadImageW(p 0, w "$PLUGINSDIR\dc-$R0.bmp", i 0, i 0, i 0, i 0x2010) p .R0'
FunctionEnd

; écrit le texte $R6 au milieu de l'image $R5, police $R9, couleur $R4 (format Windows 0xBBGGRR)
Function ${UN}DcDraw
  System::Call '*(i,i,i,i,&i2,&i2,p) p .r6'
  System::Call 'gdi32::GetObjectW(p R5, i 24, p r6)'
  System::Call '*$6(i, i .r7, i .r8)'
  System::Free $6
  System::Call 'user32::GetDC(p 0) p .r1'
  System::Call 'gdi32::CreateCompatibleDC(p r1) p .r2'
  System::Call 'user32::ReleaseDC(p 0, p r1)'
  System::Call 'gdi32::SelectObject(p r2, p R5) p .r3'
  System::Call 'gdi32::SelectObject(p r2, p R9) p .r4'
  System::Call 'gdi32::SetBkMode(p r2, i 1)'
  System::Call 'gdi32::SetTextColor(p r2, i R4)'
  System::Call '*(i 0, i 0, i r7, i r8) p .r5'
  System::Call 'user32::DrawTextW(p r2, w R6, i -1, p r5, i 0x825)'
  System::Free $5
  System::Call 'gdi32::SelectObject(p r2, p r4)'
  System::Call 'gdi32::SelectObject(p r2, p r3)'
  System::Call 'gdi32::DeleteDC(p r2)'
FunctionEnd

; image fixe : $R0 nom, $R2 x, $R3 y (à 100 %) → $R0 = contrôle
Function ${UN}DcPic
  Call ${UN}DcImg
  StrCpy $R5 $R0
  ${DcPx} $R2 $R2
  ${DcPx} $R3 $R3
  nsDialogs::CreateControl STATIC ${WS_CHILD}|${WS_VISIBLE}|${WS_CLIPSIBLINGS}|${SS_BITMAP} 0 $R2 $R3 1 1 ""
  Pop $R0
  SendMessage $R0 ${STM_SETIMAGE} ${IMAGE_BITMAP} $R5
FunctionEnd

; bouton : $R0 type (pri, sec, sm), $R1 texte, $R2 x, $R3 y (à 100 %) → $R0 = contrôle
; deux images (normale, survolée) avec le texte écrit dessus, gardées sur le contrôle pour le survol
Function ${UN}DcButton
  StrCpy $R7 $R0
  StrCpy $R6 $R1
  StrCpy $R9 $DcFBtn
  StrCpy $R4 0x00FAEFF1
  ${If} $R7 == "pri"
    StrCpy $R4 0x00FFFFFF
  ${ElseIf} $R7 == "sm"
    StrCpy $R9 $DcFBtnS
  ${EndIf}
  StrCpy $R0 $R7
  Call ${UN}DcImg
  StrCpy $R5 $R0
  Push $R5
  Call ${UN}DcDraw
  StrCpy $R0 "$R7-h"
  Call ${UN}DcImg
  StrCpy $R5 $R0
  Push $R5
  Call ${UN}DcDraw
  Pop $R8 ; image survolée
  Pop $R5 ; image normale
  ${DcPx} $R2 $R2
  ${DcPx} $R3 $R3
  nsDialogs::CreateControl STATIC ${WS_CHILD}|${WS_VISIBLE}|${WS_CLIPSIBLINGS}|${SS_BITMAP}|${SS_NOTIFY} 0 $R2 $R3 1 1 "$R1"
  Pop $R0
  SendMessage $R0 ${STM_SETIMAGE} ${IMAGE_BITMAP} $R5
  System::Call 'user32::SetPropW(p R0, w "dcn", p R5)'
  System::Call 'user32::SetPropW(p R0, w "dch", p R8)'
FunctionEnd

; texte : $R1 texte, $R2 x, $R3 y, $R4 largeur, $R5 hauteur (à 100 %), $R6 police, $R7 couleur (fg, dim, dim2, ac),
; $R8 alignement (0 gauche, 1 centre) — SetCtlColors ne prend que des couleurs écrites en dur, d'où le choix par nom
Function ${UN}DcLabel
  ${DcPx} $R2 $R2
  ${DcPx} $R3 $R3
  ${DcPx} $R4 $R4
  ${DcPx} $R5 $R5
  nsDialogs::CreateControl STATIC ${WS_CHILD}|${WS_VISIBLE}|${SS_NOPREFIX}|$R8 0 $R2 $R3 $R4 $R5 "$R1"
  Pop $R0
  SendMessage $R0 ${WM_SETFONT} $R6 1
  ${If} $R7 == "dim"
    SetCtlColors $R0 ${DC_DIM} ${DC_BG}
  ${ElseIf} $R7 == "dim2"
    SetCtlColors $R0 ${DC_DIM2} ${DC_BG}
  ${ElseIf} $R7 == "ac"
    SetCtlColors $R0 ${DC_AC} ${DC_BG}
  ${Else}
    SetCtlColors $R0 ${DC_FG} ${DC_BG}
  ${EndIf}
FunctionEnd

; case à cocher DedCut : $R1 texte, $R2 x, $R3 y (à 100 %), $R4 état (0 / 1)
Function ${UN}DcCheckbox
  StrCpy $DcChk $R4
  StrCpy $R0 "chk$R4"
  Call ${UN}DcImg
  StrCpy $R5 $R0
  ${DcPx} $R6 $R2
  ${DcPx} $R7 $R3
  nsDialogs::CreateControl STATIC ${WS_CHILD}|${WS_VISIBLE}|${SS_BITMAP}|${SS_NOTIFY} 0 $R6 $R7 1 1 ""
  Pop $DcChkImg
  SendMessage $DcChkImg ${STM_SETIMAGE} ${IMAGE_BITMAP} $R5
  ${NSD_OnClick} $DcChkImg ${UN}DcCheckToggle
  IntOp $R2 $R2 + 30
  IntOp $R3 $R3 - 1
  ${DcPx} $R2 $R2
  ${DcPx} $R3 $R3
  ${DcPx} $R4 500
  ${DcPx} $R5 22
  nsDialogs::CreateControl STATIC ${WS_CHILD}|${WS_VISIBLE}|${SS_NOPREFIX}|${SS_NOTIFY}|${SS_CENTERIMAGE} 0 $R2 $R3 $R4 $R5 "$R1"
  Pop $DcChkTxt
  SendMessage $DcChkTxt ${WM_SETFONT} $DcFText 1
  SetCtlColors $DcChkTxt ${DC_FG} ${DC_BG}
  ${NSD_OnClick} $DcChkTxt ${UN}DcCheckToggle
FunctionEnd
Function ${UN}DcCheckToggle
  Pop $0
  IntOp $DcChk $DcChk ^ 1
  StrCpy $R0 "chk$DcChk"
  Call ${UN}DcImg
  SendMessage $DcChkImg ${STM_SETIMAGE} ${IMAGE_BITMAP} $R0
FunctionEnd

; survol des boutons (toutes les 50 ms) : image éclairée sous la souris
Function ${UN}DcTick
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  System::Call '*(i,i) p .r0'
  System::Call 'user32::GetCursorPos(p r0)'
  System::Call '*$0(i .r2, i .r3)'
  System::Free $0
  System::Call 'user32::WindowFromPoint(i r2, i r3) p .r1'
  ${If} $1 != $DcHot
    ${If} $DcHot != 0
      System::Call 'user32::GetPropW(p $DcHot, w "dcn") p .r4'
      SendMessage $DcHot ${STM_SETIMAGE} ${IMAGE_BITMAP} $4
    ${EndIf}
    StrCpy $DcHot 0
    System::Call 'user32::GetPropW(p r1, w "dch") p .r4'
    ${If} $4 <> 0
      SendMessage $1 ${STM_SETIMAGE} ${IMAGE_BITMAP} $4
      StrCpy $DcHot $1
    ${EndIf}
  ${EndIf}
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; boutons de navigation (comme « Suivant » et « Annuler » de Windows, cachés)
Function ${UN}DcNext
  Pop $0
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd
Function ${UN}DcCancel
  Pop $0
  SendMessage $HWNDPARENT ${WM_COMMAND} 2 0
FunctionEnd

; bas de page : version, gratuit, ByKemi
Function ${UN}DcFooter
  StrCpy $R1 "$(dcFooter)"
  StrCpy $R2 36
  StrCpy $R3 391
  StrCpy $R4 230
  StrCpy $R5 20
  StrCpy $R6 $DcFSmall
  StrCpy $R7 dim2
  StrCpy $R8 0
  Call ${UN}DcLabel
FunctionEnd

; titre centré ($R1) sous le bandeau, puis texte centré ($R2 texte, $R3 hauteur)
Function ${UN}DcTitles
  Push $R3
  Push $R2
  StrCpy $R2 36
  StrCpy $R3 172
  StrCpy $R4 548
  StrCpy $R5 34
  StrCpy $R6 $DcFTitle
  StrCpy $R7 fg
  StrCpy $R8 1
  Call ${UN}DcLabel
  Pop $R1
  Pop $R5
  StrCpy $R2 80
  StrCpy $R3 206
  StrCpy $R4 460
  StrCpy $R6 $DcFText
  StrCpy $R7 dim
  StrCpy $R8 1
  Call ${UN}DcLabel
FunctionEnd

; page d'installation (celle de Windows, redessinée) : bandeau, titre, barre de progression DedCut
Function ${UN}DcInstShow
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  Push $R6
  Push $R7
  Push $R8
  Push $R9
  Call ${UN}DcChrome
  FindWindow $DcDlg "#32770" "" $HWNDPARENT
  ${DcPx} $0 620
  ${DcPx} $1 440
  System::Call 'user32::SetWindowPos(p $DcDlg, p 0, i 0, i 0, i r0, i r1, i 0x14)'
  SetCtlColors $DcDlg ${DC_FG} ${DC_BG}
  GetDlgItem $0 $DcDlg 1016
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $DcDlg 1027
  ShowWindow $0 ${SW_HIDE}
  ; texte de l'étape en cours : centré, discret
  GetDlgItem $0 $DcDlg 1006
  ${DcPx} $2 36
  ${DcPx} $3 232
  ${DcPx} $4 548
  ${DcPx} $5 22
  System::Call 'user32::SetWindowPos(p r0, p 0, i r2, i r3, i r4, i r5, i 0x14)'
  System::Call 'user32::GetWindowLongW(p r0, i -16) i .r6'
  IntOp $6 $6 & 0xFFFF3FE0 ; le type de texte est un numéro : on l'efface avant
  IntOp $6 $6 | 0x8081 ; SS_CENTER, SS_NOPREFIX, chemin trop long raccourci au milieu (SS_PATHELLIPSIS)
  System::Call 'user32::SetWindowLongW(p r0, i -16, i r6)'
  SendMessage $0 ${WM_SETFONT} $DcFText 1
  SetCtlColors $0 ${DC_DIM} ${DC_BG}
  ; barre de progression : fine, arrondie, violet DedCut
  GetDlgItem $0 $DcDlg 1004
  ${DcPx} $3 266
  ${DcPx} $5 8
  System::Call 'user32::SetWindowPos(p r0, p 0, i r2, i r3, i r4, i r5, i 0x14)'
  System::Call 'uxtheme::SetWindowTheme(p r0, w " ", w " ")'
  System::Call 'user32::GetWindowLongW(p r0, i -20) i .r6'
  IntOp $6 $6 & 0xFFFDFDFF ; ni bord ni creux
  System::Call 'user32::SetWindowLongW(p r0, i -20, i r6)'
  System::Call 'user32::GetWindowLongW(p r0, i -16) i .r6'
  IntOp $6 $6 & 0xFF7FFFFF ; pas de WS_BORDER
  System::Call 'user32::SetWindowLongW(p r0, i -16, i r6)'
  System::Call 'user32::SetWindowPos(p r0, p 0, i 0, i 0, i 0, i 0, i 0x37)' ; SWP_FRAMECHANGED
  SendMessage $0 0x409 0 0x00FA8BA7 ; PBM_SETBARCOLOR #A78BFA
  SendMessage $0 0x2001 0 0x0024171A ; PBM_SETBKCOLOR #1A1724
  IntOp $6 $4 + 1
  IntOp $7 $5 + 1
  System::Call 'gdi32::CreateRoundRectRgn(i 0, i 0, i r6, i r7, i r5, i r5) p .r8'
  System::Call 'user32::SetWindowRgn(p r0, p r8, i 1)'
  ; bandeau avec le logo
  StrCpy $R0 "hero"
  Call ${UN}DcImg
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "", i 0x5000000E, i 0, i 0, i 1, i 1, p $DcDlg, p 0, p 0, p 0) p .r0'
  SendMessage $0 ${STM_SETIMAGE} ${IMAGE_BITMAP} $R0
  ; titre : installation, mise à jour ou désinstallation
  !if "${UN}" == ""
    StrCpy $9 "$(dcInstalling)"
    ${If} $UpdateMode = 1
    ${OrIf} $DcCmp = 1
      StrCpy $9 "$(dcUpdating)"
    ${EndIf}
  !else
    StrCpy $9 "$(dcUninstalling)"
  !endif
  ${DcPx} $2 36
  ${DcPx} $3 186
  ${DcPx} $4 548
  ${DcPx} $5 36
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w r9, i 0x50000081, i r2, i r3, i r4, i r5, p $DcDlg, p 0, p 0, p 0) p .r0'
  StrCpy $DcInstTitle $0
  SendMessage $0 ${WM_SETFONT} $DcFTitle 1
  SetCtlColors $0 ${DC_FG} ${DC_BG}
  ${DcPx} $3 290
  ${DcPx} $5 22
  StrCpy $9 "$(dcWait)"
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w r9, i 0x50000081, i r2, i r3, i r4, i r5, p $DcDlg, p 0, p 0, p 0) p .r0'
  StrCpy $DcInstWait $0
  SendMessage $0 ${WM_SETFONT} $DcFSmall 1
  SetCtlColors $0 ${DC_DIM2} ${DC_BG}
  ; une fois fini, passer tout seul à la page de fin
  SetAutoClose true
  Pop $R9
  Pop $R8
  Pop $R7
  Pop $R6
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; fin de l'installation (succès ou échec) : si elle a été interrompue, titre d'échec, détails et bouton « Fermer »
Function ${UN}DcInstLeave
  ${If} ${Abort}
    Call ${UN}DcFailed
  ${EndIf}
FunctionEnd
Function ${UN}DcFailed
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  !if "${UN}" == ""
    StrCpy $0 "$(dcFailTitle)"
  !else
    StrCpy $0 "$(dcUnFailTitle)"
  !endif
  SendMessage $DcInstTitle ${WM_SETTEXT} 0 "STR:$0"
  ShowWindow $DcInstWait ${SW_HIDE}
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1016
  ${DcPx} $2 36
  ${DcPx} $3 300
  ${DcPx} $4 548
  ${DcPx} $5 72
  System::Call 'user32::SetWindowPos(p r1, p 0, i r2, i r3, i r4, i r5, i 0x14)'
  System::Call 'uxtheme::SetWindowTheme(p r1, w "DarkMode_Explorer", p 0)'
  ShowWindow $1 ${SW_SHOW}
  ; bouton « Fermer » DedCut, posé au premier plan sur la fenêtre avec le numéro du bouton « Annuler » (2) :
  ; Windows le traite comme « Annuler », qu'il réactive justement après un échec
  Push $R0
  Push $R4
  Push $R5
  Push $R6
  Push $R9
  StrCpy $R0 "pri"
  Call ${UN}DcImg
  StrCpy $R5 $R0
  StrCpy $R6 "$(dcClose)"
  StrCpy $R9 $DcFBtn
  StrCpy $R4 0x00FFFFFF
  Call ${UN}DcDraw
  ${DcPx} $2 416
  ${DcPx} $3 380
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w R6, i 0x5000010E, i r2, i r3, i 1, i 1, p $HWNDPARENT, p 2, p 0, p 0) p .r1'
  SendMessage $1 ${STM_SETIMAGE} ${IMAGE_BITMAP} $R5
  System::Call 'user32::SetWindowPos(p r1, p 0, i 0, i 0, i 0, i 0, i 0x13)'
  ; la page ne dessine plus par-dessus le bouton
  FindWindow $0 "#32770" "" $HWNDPARENT
  System::Call 'user32::GetWindowLongW(p r0, i -16) i .r2'
  IntOp $2 $2 | 0x04000000 ; WS_CLIPSIBLINGS
  System::Call 'user32::SetWindowLongW(p r0, i -16, i r2)'
  Pop $R9
  Pop $R6
  Pop $R5
  Pop $R4
  Pop $R0
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!macroend
!insertmacro DC_UI ""
!insertmacro DC_UI "un."


; ---------- installateur : accueil ----------
Function DcWelcome
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  nsDialogs::Create 1018
  Pop $DcDlg
  ${If} $DcDlg == error
    Abort
  ${EndIf}
  Call DcPageSetup

  ; dossier : le champ et le bouton « Changer » d'abord (ils restent au-dessus du cadre du champ)
  ${DcPx} $R2 76
  ${DcPx} $R3 285
  ${DcPx} $R4 392
  ${DcPx} $R5 20
  nsDialogs::CreateControl EDIT ${WS_CHILD}|${WS_VISIBLE}|${WS_TABSTOP}|${ES_AUTOHSCROLL} 0 $R2 $R3 $R4 $R5 "$INSTDIR"
  Pop $DcDir
  SendMessage $DcDir ${WM_SETFONT} $DcFText 1
  SetCtlColors $DcDir ${DC_FG} ${DC_FIELD}
  ${If} $DcOld != ""
    ; déjà installé : même dossier (DedCut est remplacé sur place)
    SendMessage $DcDir ${EM_SETREADONLY} 1 0
  ${Else}
    StrCpy $R0 "sm"
    StrCpy $R1 "$(dcChange)"
    StrCpy $R2 480
    StrCpy $R3 280
    Call DcButton
    ${NSD_OnClick} $R0 DcBrowse
  ${EndIf}
  StrCpy $R0 "field"
  StrCpy $R2 36
  StrCpy $R3 272
  Call DcPic
  StrCpy $R1 "$(dcFolder)"
  StrCpy $R2 38
  StrCpy $R3 254
  StrCpy $R4 400
  StrCpy $R5 16
  StrCpy $R6 $DcFCap
  StrCpy $R7 ac
  StrCpy $R8 0
  Call DcLabel

  ; raccourci sur le Bureau (déjà là pour une mise à jour : on le garde coché)
  StrCpy $R4 1
  ${If} $DcOld != ""
  ${AndIfNot} ${FileExists} "$DESKTOP\${PRODUCTNAME}.lnk"
    StrCpy $R4 0
  ${EndIf}
  StrCpy $R1 "$(dcDesktop)"
  StrCpy $R2 36
  StrCpy $R3 334
  Call DcCheckbox

  ; titres selon ce qui est déjà installé
  ${If} $DcCmp = 1
    StrCpy $R1 "$(dcUpdateTitle)"
    StrCpy $R2 "$(dcUpdateText)"
    StrCpy $R9 "$(dcUpdate)"
  ${ElseIf} $DcCmp = 0
    StrCpy $R1 "$(dcSameTitle)"
    StrCpy $R2 "$(dcSameText)"
    StrCpy $R9 "$(dcReinstall)"
  ${ElseIf} $DcCmp = -1
    StrCpy $R1 "$(dcNewerTitle)"
    StrCpy $R2 "$(dcNewerText)"
    StrCpy $R9 "$(dcInstall)"
  ${Else}
    StrCpy $R1 "$(dcWelcomeTitle)"
    StrCpy $R2 "$(dcWelcomeText)"
    StrCpy $R9 "$(dcInstall)"
  ${EndIf}
  Push $R9
  StrCpy $R3 40
  Call DcTitles

  Call DcFooter
  StrCpy $R0 "sec"
  StrCpy $R1 "$(dcCancel)"
  StrCpy $R2 276
  StrCpy $R3 380
  Call DcButton
  ${NSD_OnClick} $R0 DcCancel
  Pop $R1
  StrCpy $R0 "pri"
  StrCpy $R2 416
  StrCpy $R3 380
  Call DcButton
  ${NSD_OnClick} $R0 DcNext
  StrCpy $R0 "hero"
  StrCpy $R2 0
  StrCpy $R3 0
  Call DcPic

  ${NSD_CreateTimer} DcTick 50
  ${NSD_SetFocus} $DcDir
  SendMessage $DcDir ${EM_SETSEL} 0x7FFFFFFF 0x7FFFFFFF
  nsDialogs::Show
FunctionEnd

Function DcBrowse
  Pop $0
  ${NSD_KillTimer} DcTick
  ${NSD_GetText} $DcDir $1
  nsDialogs::SelectFolderDialog "$(dcPick)" "$1"
  Pop $1
  ${If} $1 != "error"
  ${AndIf} $1 != ""
    ; comme la page de Windows d'avant : on ajoute le dossier « DedCut » au dossier choisi
    StrLen $2 "${PRODUCTNAME}"
    StrCpy $3 $1 "" -$2
    ${If} $3 != "${PRODUCTNAME}"
      StrCpy $3 $1 "" -1
      ${If} $3 == "\"
        StrCpy $1 $1 -1
      ${EndIf}
      StrCpy $1 "$1\${PRODUCTNAME}"
    ${EndIf}
    ${NSD_SetText} $DcDir $1
  ${EndIf}
  ${NSD_CreateTimer} DcTick 50
FunctionEnd

Function DcWelcomeLeave
  ${NSD_KillTimer} DcTick
  ${NSD_GetText} $DcDir $0
  ; chemin complet : « C:\… » ou « \\serveur\… »
  StrCpy $1 $0 2 1
  StrCpy $2 $0 2
  ${If} $1 != ":\"
  ${AndIf} $2 != "\\"
    MessageBox MB_ICONEXCLAMATION|MB_OK "$(dcBadDir)"
    ${NSD_CreateTimer} DcTick 50
    Abort
  ${EndIf}
  ; enlève un « \ » à la fin
  StrCpy $1 $0 "" -1
  StrLen $2 $0
  ${If} $1 == "\"
  ${AndIf} $2 > 3
    StrCpy $0 $0 -1
  ${EndIf}
  StrCpy $INSTDIR $0
  StrCpy $DcDesk $DcChk
  StrCpy $DcNoUninst 1
FunctionEnd

; ---------- installateur : fin ----------
Function DcFinish
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  nsDialogs::Create 1018
  Pop $DcDlg
  ${If} $DcDlg == error
    Abort
  ${EndIf}
  Call DcPageSetup
  StrCpy $R1 "$(dcLaunch)"
  StrCpy $R2 36
  StrCpy $R3 270
  StrCpy $R4 1
  Call DcCheckbox
  StrCpy $R1 "$(dcDoneTitle)"
  ${If} $DcCmp = 1
    StrCpy $R1 "$(dcUpdatedTitle)"
  ${EndIf}
  StrCpy $R2 "$(dcDoneText)"
  StrCpy $R3 40
  Call DcTitles
  Call DcFooter
  StrCpy $R0 "pri"
  StrCpy $R1 "$(dcFinish)"
  StrCpy $R2 416
  StrCpy $R3 380
  Call DcButton
  ${NSD_OnClick} $R0 DcNext
  StrCpy $R0 "hero"
  StrCpy $R2 0
  StrCpy $R3 0
  Call DcPic
  ${NSD_CreateTimer} DcTick 50
  nsDialogs::Show
FunctionEnd

Function DcFinishLeave
  ${NSD_KillTimer} DcTick
  ${If} $DcChk = 1
    Call RunMainBinary
  ${EndIf}
FunctionEnd

; ---------- désinstalleur : accueil ----------
Function un.DcUnWelcome
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  nsDialogs::Create 1018
  Pop $DcDlg
  ${If} $DcDlg == error
    Abort
  ${EndIf}
  Call un.DcPageSetup
  StrCpy $R1 "$(dcUnData)"
  StrCpy $R2 36
  StrCpy $R3 296
  StrCpy $R4 0
  Call un.DcCheckbox
  StrCpy $R1 "$(dcUnTitle)"
  StrCpy $R2 "$(dcUnText)"
  StrCpy $R3 60
  Call un.DcTitles
  Call un.DcFooter
  StrCpy $R0 "sec"
  StrCpy $R1 "$(dcCancel)"
  StrCpy $R2 276
  StrCpy $R3 380
  Call un.DcButton
  ${NSD_OnClick} $R0 un.DcCancel
  StrCpy $R0 "pri"
  StrCpy $R1 "$(dcUnBtn)"
  StrCpy $R2 416
  StrCpy $R3 380
  Call un.DcButton
  ${NSD_OnClick} $R0 un.DcNext
  StrCpy $R0 "hero"
  StrCpy $R2 0
  StrCpy $R3 0
  Call un.DcPic
  ${NSD_CreateTimer} un.DcTick 50
  nsDialogs::Show
FunctionEnd

Function un.DcUnWelcomeLeave
  ${NSD_KillTimer} un.DcTick
  StrCpy $DeleteAppDataCheckboxState $DcChk
FunctionEnd

; ---------- désinstalleur : fin ----------
Function un.DcUnFinish
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  nsDialogs::Create 1018
  Pop $DcDlg
  ${If} $DcDlg == error
    Abort
  ${EndIf}
  Call un.DcPageSetup
  StrCpy $R1 "$(dcUnDoneTitle)"
  StrCpy $R2 "$(dcUnDoneText)"
  StrCpy $R3 40
  Call un.DcTitles
  Call un.DcFooter
  StrCpy $R0 "pri"
  StrCpy $R1 "$(dcClose)"
  StrCpy $R2 416
  StrCpy $R3 380
  Call un.DcButton
  ${NSD_OnClick} $R0 un.DcNext
  StrCpy $R0 "hero"
  StrCpy $R2 0
  StrCpy $R3 0
  Call un.DcPic
  ${NSD_CreateTimer} un.DcTick 50
  nsDialogs::Show
FunctionEnd

Function un.DcUnFinishLeave
  ${NSD_KillTimer} un.DcTick
FunctionEnd
; ===== fin de l'interface DedCut =====

; Installer pages, must be ordered as they appear
; 1. Accueil DedCut : dossier d'installation et raccourci (remplace « Bienvenue » et « Dossier »)
Page custom DcWelcome DcWelcomeLeave

; 2. License Page (if defined)
!if "${LICENSE}" != ""
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive
  !insertmacro MUI_PAGE_LICENSE "${LICENSE}"
!endif

; 3. Install mode (if it is set to `both`)
!if "${INSTALLMODE}" == "both"
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive
  !insertmacro MULTIUSER_PAGE_INSTALLMODE
!endif

; 4. Custom page to ask user if he wants to reinstall/uninstall
;    only if a previous installation was detected
Var ReinstallPageCheck
Page custom PageReinstall PageLeaveReinstall
Function PageReinstall
  ; Uninstall previous WiX installation if exists.
  ;
  ; A WiX installer stores the installation info in registry
  ; using a UUID and so we have to loop through all keys under
  ; `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
  ; and check if `DisplayName` and `Publisher` keys match ${PRODUCTNAME} and ${MANUFACTURER}
  ;
  ; This has a potential issue that there maybe another installation that matches
  ; our ${PRODUCTNAME} and ${MANUFACTURER} but wasn't installed by our WiX installer,
  ; however, this should be fine since the user will have to confirm the uninstallation
  ; and they can chose to abort it if doesn't make sense.
  StrCpy $0 0
  wix_loop:
    EnumRegKey $1 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" $0
    StrCmp $1 "" wix_loop_done ; Exit loop if there is no more keys to loop on
    IntOp $0 $0 + 1
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
    ReadRegStr $R1 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "Publisher"
    StrCmp "$R0$R1" "${PRODUCTNAME}${MANUFACTURER}" 0 wix_loop
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "UninstallString"
    ${StrCase} $R1 $R0 "L"
    ${StrLoc} $R0 $R1 "msiexec" ">"
    StrCmp $R0 0 0 wix_loop_done
    StrCpy $WixMode 1
    StrCpy $R6 "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1"
    Goto compare_version
  wix_loop_done:

  ; Check if there is an existing installation, if not, abort the reinstall page
  ReadRegStr $R0 SHCTX "${UNINSTKEY}" ""
  ReadRegStr $R1 SHCTX "${UNINSTKEY}" "UninstallString"
  ${IfThen} "$R0$R1" == "" ${|} Abort ${|}

  ; Compare this installar version with the existing installation
  ; and modify the messages presented to the user accordingly
  compare_version:
  StrCpy $R4 "$(older)"
  ${If} $WixMode = 1
    ReadRegStr $R0 HKLM "$R6" "DisplayVersion"
  ${Else}
    ReadRegStr $R0 SHCTX "${UNINSTKEY}" "DisplayVersion"
  ${EndIf}
  ${IfThen} $R0 == "" ${|} StrCpy $R4 "$(unknown)" ${|}

  nsis_tauri_utils::SemverCompare "${VERSION}" $R0
  Pop $R0
  ; Reinstalling the same version
  ${If} $R0 = 0
    StrCpy $R1 "$(alreadyInstalledLong)"
    StrCpy $R2 "$(addOrReinstall)"
    StrCpy $R3 "$(uninstallApp)"
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(chooseMaintenanceOption)"
  ; Upgrading
  ${ElseIf} $R0 = 1
    StrCpy $R1 "$(olderOrUnknownVersionInstalled)"
    StrCpy $R2 "$(uninstallBeforeInstalling)"
    StrCpy $R3 "$(dontUninstall)"
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(choowHowToInstall)"
  ; Downgrading
  ${ElseIf} $R0 = -1
    StrCpy $R1 "$(newerVersionInstalled)"
    StrCpy $R2 "$(uninstallBeforeInstalling)"
    !if "${ALLOWDOWNGRADES}" == "true"
      StrCpy $R3 "$(dontUninstall)"
    !else
      StrCpy $R3 "$(dontUninstallDowngrade)"
    !endif
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(choowHowToInstall)"
  ${Else}
    Abort
  ${EndIf}

  ; Skip showing the page if passive
  ;
  ; Note that we don't call this earlier at the beginning
  ; of this function because we need to populate some variables
  ; related to current installed version if detected and whether
  ; we are downgrading or not.
  ${If} $PassiveMode = 1
    Call PageLeaveReinstall
  ${ElseIf} $DcNoUninst = 1
    ; DedCut : l'accueil a déjà dit « Mettre à jour » / « Réinstaller » → on installe par-dessus, sans autre page
    Call PageLeaveReinstall
  ${Else}
    nsDialogs::Create 1018
    Pop $R4
    ${IfThen} $(^RTL) = 1 ${|} nsDialogs::SetRTL $(^RTL) ${|}

    ${NSD_CreateLabel} 0 0 100% 24u $R1
    Pop $R1

    ${NSD_CreateRadioButton} 30u 50u -30u 8u $R2
    Pop $R2
    ${NSD_OnClick} $R2 PageReinstallUpdateSelection

    ${NSD_CreateRadioButton} 30u 70u -30u 8u $R3
    Pop $R3
    ; Disable this radio button if downgrading and downgrades are disabled
    !if "${ALLOWDOWNGRADES}" == "false"
      ${IfThen} $R0 = -1 ${|} EnableWindow $R3 0 ${|}
    !endif
    ${NSD_OnClick} $R3 PageReinstallUpdateSelection

    ; Check the first radio button if this the first time
    ; we enter this page or if the second button wasn't
    ; selected the last time we were on this page
    ${If} $ReinstallPageCheck <> 2
      SendMessage $R2 ${BM_SETCHECK} ${BST_CHECKED} 0
    ${Else}
      SendMessage $R3 ${BM_SETCHECK} ${BST_CHECKED} 0
    ${EndIf}

    ${NSD_SetFocus} $R2
    nsDialogs::Show
  ${EndIf}
FunctionEnd
Function PageReinstallUpdateSelection
  ${NSD_GetState} $R2 $R1
  ${If} $R1 == ${BST_CHECKED}
    StrCpy $ReinstallPageCheck 1
  ${Else}
    StrCpy $ReinstallPageCheck 2
  ${EndIf}
FunctionEnd
Function PageLeaveReinstall
  ${If} $DcNoUninst = 1
  ${AndIf} $PassiveMode <> 1
    ; DedCut : même version → « réinstaller » (1), autre version → « ne pas désinstaller » (0)
    ${If} $R0 = 0
      StrCpy $R1 1
    ${Else}
      StrCpy $R1 0
    ${EndIf}
  ${Else}
    ${NSD_GetState} $R2 $R1
  ${EndIf}

  ; If migrating from Wix, always uninstall
  ${If} $WixMode = 1
    Goto reinst_uninstall
  ${EndIf}

  ; In update mode, always proceeds without uninstalling
  ${If} $UpdateMode = 1
    Goto reinst_done
  ${EndIf}

  ; $R0 holds whether same(0)/upgrading(1)/downgrading(-1) version
  ; $R1 holds the radio buttons state:
  ;   1 => first choice was selected
  ;   0 => second choice was selected
  ${If} $R0 = 0 ; Same version, proceed
    ${If} $R1 = 1              ; User chose to add/reinstall
      Goto reinst_done
    ${Else}                    ; User chose to uninstall
      Goto reinst_uninstall
    ${EndIf}
  ${ElseIf} $R0 = 1 ; Upgrading
    ${If} $R1 = 1              ; User chose to uninstall
      Goto reinst_uninstall
    ${Else}
      Goto reinst_done         ; User chose NOT to uninstall
    ${EndIf}
  ${ElseIf} $R0 = -1 ; Downgrading
    ${If} $R1 = 1              ; User chose to uninstall
      Goto reinst_uninstall
    ${Else}
      Goto reinst_done         ; User chose NOT to uninstall
    ${EndIf}
  ${EndIf}

  reinst_uninstall:
    HideWindow
    ClearErrors

    ${If} $WixMode = 1
      ReadRegStr $R1 HKLM "$R6" "UninstallString"
      ExecWait '$R1' $0
    ${Else}
      ReadRegStr $4 SHCTX "${MANUPRODUCTKEY}" ""
      ReadRegStr $R1 SHCTX "${UNINSTKEY}" "UninstallString"
      ${IfThen} $UpdateMode = 1 ${|} StrCpy $R1 "$R1 /UPDATE" ${|} ; append /UPDATE
      ${IfThen} $PassiveMode = 1 ${|} StrCpy $R1 "$R1 /P" ${|} ; append /P
      StrCpy $R1 "$R1 _?=$4" ; append uninstall directory
      ExecWait '$R1' $0
    ${EndIf}

    BringToFront

    ${IfThen} ${Errors} ${|} StrCpy $0 2 ${|} ; ExecWait failed, set fake exit code

    ${If} $0 <> 0
    ${OrIf} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
      ; User cancelled wix uninstaller? return to select un/reinstall page
      ${If} $WixMode = 1
      ${AndIf} $0 = 1602
        Abort
      ${EndIf}

      ; User cancelled NSIS uninstaller? return to select un/reinstall page
      ${If} $0 = 1
        Abort
      ${EndIf}

      ; Other errors? show generic error message and return to select un/reinstall page
      MessageBox MB_ICONEXCLAMATION "$(unableToUninstall)"
      Abort
    ${EndIf}
  reinst_done:
FunctionEnd

; 5. (dossier : sur l'accueil DedCut)

; 6. Start menu shortcut page
Var AppStartMenuFolder
!if "${STARTMENUFOLDER}" != ""
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive
  !define MUI_STARTMENUPAGE_DEFAULTFOLDER "${STARTMENUFOLDER}"
!else
  !define MUI_PAGE_CUSTOMFUNCTION_PRE Skip
!endif
!insertmacro MUI_PAGE_STARTMENU Application $AppStartMenuFolder

; 7. Installation page (redessinée par DedCut)
!define MUI_PAGE_CUSTOMFUNCTION_SHOW DcInstShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DcInstLeave
!insertmacro MUI_PAGE_INSTFILES

; 8. Fin DedCut (lancer DedCut)
Page custom DcFinish DcFinishLeave

Function RunMainBinary
  nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" ""
FunctionEnd

; Uninstaller Pages
; 1. Accueil DedCut (avec « supprimer aussi mes réglages »)
UninstPage custom un.DcUnWelcome un.DcUnWelcomeLeave

; 2. Uninstalling Page (redessinée par DedCut)
!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.DcInstShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE un.DcInstLeave
!insertmacro MUI_UNPAGE_INSTFILES

; 3. Fin DedCut
UninstPage custom un.DcUnFinish un.DcUnFinishLeave

;Languages
{{#each languages}}
!insertmacro MUI_LANGUAGE "{{this}}"
{{/each}}
!insertmacro MUI_RESERVEFILE_LANGDLL
{{#each language_files}}
  !include "{{this}}"
{{/each}}
; Textes de l'installateur DedCut (v4.59), 9 langues — inséré par make-template.cjs après les langues de Tauri.
; Ordre : français, anglais, espagnol, allemand, italien, portugais (Brésil), japonais, coréen, chinois.
; Seules les langues incluses par Tauri reçoivent leurs textes (sinon NSIS les mélangerait). Jamais de guillemet droit dans les textes. $DcOld = version déjà installée (lue au lancement).
!macro DcT KEY FR EN ES DE IT PT JA KO ZH
  !ifdef LANG_FRENCH
    LangString ${KEY} ${LANG_FRENCH} "${FR}"
  !endif
  !ifdef LANG_ENGLISH
    LangString ${KEY} ${LANG_ENGLISH} "${EN}"
  !endif
  !ifdef LANG_SPANISH
    LangString ${KEY} ${LANG_SPANISH} "${ES}"
  !endif
  !ifdef LANG_GERMAN
    LangString ${KEY} ${LANG_GERMAN} "${DE}"
  !endif
  !ifdef LANG_ITALIAN
    LangString ${KEY} ${LANG_ITALIAN} "${IT}"
  !endif
  !ifdef LANG_PORTUGUESEBR
    LangString ${KEY} ${LANG_PORTUGUESEBR} "${PT}"
  !endif
  !ifdef LANG_JAPANESE
    LangString ${KEY} ${LANG_JAPANESE} "${JA}"
  !endif
  !ifdef LANG_KOREAN
    LangString ${KEY} ${LANG_KOREAN} "${KO}"
  !endif
  !ifdef LANG_SIMPCHINESE
    LangString ${KEY} ${LANG_SIMPCHINESE} "${ZH}"
  !endif
!macroend

!insertmacro DcT dcWelcomeTitle "Installer ${PRODUCTNAME}" "Install ${PRODUCTNAME}" "Instalar ${PRODUCTNAME}" "${PRODUCTNAME} installieren" "Installa ${PRODUCTNAME}" "Instalar o ${PRODUCTNAME}" "${PRODUCTNAME} をインストール" "${PRODUCTNAME} 설치" "安装 ${PRODUCTNAME}"
!insertmacro DcT dcWelcomeText "Montage, enregistrement, live, image et musique. Gratuit, sans compte, tout reste sur ton PC." "Editing, recording, live streaming, images and music. Free, no account, everything stays on your PC." "Edición, grabación, directos, imagen y música. Gratis, sin cuenta, todo se queda en tu PC." "Schnitt, Aufnahme, Livestream, Bild und Musik. Kostenlos, ohne Konto, alles bleibt auf deinem PC." "Montaggio, registrazione, live, immagini e musica. Gratis, senza account, tutto resta sul tuo PC." "Edição, gravação, lives, imagem e música. Grátis, sem conta, tudo fica no seu PC." "動画編集、録画、ライブ配信、画像、音楽。無料・アカウント不要で、すべてPCの中で完結します。" "영상 편집, 녹화, 라이브 방송, 이미지, 음악. 무료이고 계정도 필요 없으며, 모든 것이 내 PC에 남아요." "视频剪辑、录屏、直播、图片和音乐。免费、无需账号，一切都留在你的电脑上。"
!insertmacro DcT dcUpdateTitle "Mettre à jour ${PRODUCTNAME}" "Update ${PRODUCTNAME}" "Actualizar ${PRODUCTNAME}" "${PRODUCTNAME} aktualisieren" "Aggiorna ${PRODUCTNAME}" "Atualizar o ${PRODUCTNAME}" "${PRODUCTNAME} を更新" "${PRODUCTNAME} 업데이트" "更新 ${PRODUCTNAME}"
!insertmacro DcT dcUpdateText "La version $DcOld sera remplacée par la ${VERSION}. Tes projets et tes réglages sont gardés." "Version $DcOld will be replaced with ${VERSION}. Your projects and settings are kept." "La versión $DcOld se sustituirá por la ${VERSION}. Tus proyectos y ajustes se conservan." "Version $DcOld wird durch ${VERSION} ersetzt. Deine Projekte und Einstellungen bleiben erhalten." "La versione $DcOld sarà sostituita dalla ${VERSION}. I tuoi progetti e le impostazioni restano." "A versão $DcOld será substituída pela ${VERSION}. Seus projetos e configurações são mantidos." "バージョン $DcOld を ${VERSION} に更新します。プロジェクトと設定はそのまま残ります。" "설치된 버전 $DcOld을(를) ${VERSION}(으)로 업데이트해요. 프로젝트와 설정은 그대로 유지돼요." "版本 $DcOld 将更新为 ${VERSION}。你的项目和设置都会保留。"
!insertmacro DcT dcSameTitle "Réinstaller ${PRODUCTNAME}" "Reinstall ${PRODUCTNAME}" "Reinstalar ${PRODUCTNAME}" "${PRODUCTNAME} neu installieren" "Reinstalla ${PRODUCTNAME}" "Reinstalar o ${PRODUCTNAME}" "${PRODUCTNAME} を再インストール" "${PRODUCTNAME} 다시 설치" "重新安装 ${PRODUCTNAME}"
!insertmacro DcT dcSameText "${PRODUCTNAME} ${VERSION} est déjà installé. Tu peux le réinstaller : tes projets et tes réglages sont gardés." "${PRODUCTNAME} ${VERSION} is already installed. You can reinstall it: your projects and settings are kept." "${PRODUCTNAME} ${VERSION} ya está instalado. Puedes reinstalarlo: tus proyectos y ajustes se conservan." "${PRODUCTNAME} ${VERSION} ist bereits installiert. Du kannst es neu installieren, Projekte und Einstellungen bleiben erhalten." "${PRODUCTNAME} ${VERSION} è già installato. Puoi reinstallarlo: progetti e impostazioni restano." "O ${PRODUCTNAME} ${VERSION} já está instalado. Você pode reinstalá-lo: seus projetos e configurações são mantidos." "${PRODUCTNAME} ${VERSION} はすでにインストールされています。再インストールしても、プロジェクトと設定は残ります。" "${PRODUCTNAME} ${VERSION}이(가) 이미 설치되어 있어요. 다시 설치해도 프로젝트와 설정은 유지돼요." "${PRODUCTNAME} ${VERSION} 已经安装。可以重新安装，你的项目和设置都会保留。"
!insertmacro DcT dcNewerTitle "Une version plus récente est installée" "A newer version is installed" "Hay una versión más reciente instalada" "Eine neuere Version ist installiert" "È installata una versione più recente" "Uma versão mais recente está instalada" "より新しいバージョンがインストールされています" "더 최신 버전이 설치되어 있어요" "已安装更新的版本"
!insertmacro DcT dcNewerText "${PRODUCTNAME} $DcOld est installé. Installer la ${VERSION}, plus ancienne, le remplacera." "${PRODUCTNAME} $DcOld is installed. Installing the older ${VERSION} will replace it." "${PRODUCTNAME} $DcOld está instalado. Instalar la ${VERSION}, más antigua, lo sustituirá." "${PRODUCTNAME} $DcOld ist installiert. Die ältere Version ${VERSION} ersetzt sie." "${PRODUCTNAME} $DcOld è installato. Installare la ${VERSION}, più vecchia, lo sostituirà." "O ${PRODUCTNAME} $DcOld está instalado. Instalar a ${VERSION}, mais antiga, vai substituí-lo." "${PRODUCTNAME} $DcOld がインストールされています。古い ${VERSION} をインストールすると置き換わります。" "${PRODUCTNAME} $DcOld이(가) 설치되어 있어요. 더 오래된 ${VERSION}을(를) 설치하면 바뀌어요." "已安装 ${PRODUCTNAME} $DcOld。安装较旧的 ${VERSION} 会替换它。"
!insertmacro DcT dcFolder "DOSSIER D'INSTALLATION" "INSTALL FOLDER" "CARPETA DE INSTALACIÓN" "INSTALLATIONSORDNER" "CARTELLA DI INSTALLAZIONE" "PASTA DE INSTALAÇÃO" "インストール先フォルダー" "설치 폴더" "安装文件夹"
!insertmacro DcT dcChange "Changer" "Change" "Cambiar" "Ändern" "Cambia" "Alterar" "変更" "변경" "更改"
!insertmacro DcT dcDesktop "Créer un raccourci sur le Bureau" "Create a desktop shortcut" "Crear un acceso directo en el escritorio" "Verknüpfung auf dem Desktop erstellen" "Crea un collegamento sul desktop" "Criar um atalho na área de trabalho" "デスクトップにショートカットを作成" "바탕 화면에 바로 가기 만들기" "在桌面创建快捷方式"
!insertmacro DcT dcInstall "Installer" "Install" "Instalar" "Installieren" "Installa" "Instalar" "インストール" "설치" "安装"
!insertmacro DcT dcUpdate "Mettre à jour" "Update" "Actualizar" "Aktualisieren" "Aggiorna" "Atualizar" "更新" "업데이트" "更新"
!insertmacro DcT dcReinstall "Réinstaller" "Reinstall" "Reinstalar" "Neu installieren" "Reinstalla" "Reinstalar" "再インストール" "다시 설치" "重新安装"
!insertmacro DcT dcCancel "Annuler" "Cancel" "Cancelar" "Abbrechen" "Annulla" "Cancelar" "キャンセル" "취소" "取消"
!insertmacro DcT dcFooter "Version ${VERSION} bêta · Gratuit · ByKemi" "Version ${VERSION} beta · Free · ByKemi" "Versión ${VERSION} beta · Gratis · ByKemi" "Version ${VERSION} Beta · Kostenlos · ByKemi" "Versione ${VERSION} beta · Gratis · ByKemi" "Versão ${VERSION} beta · Grátis · ByKemi" "バージョン ${VERSION} ベータ · 無料 · ByKemi" "버전 ${VERSION} 베타 · 무료 · ByKemi" "版本 ${VERSION} 测试版 · 免费 · ByKemi"
!insertmacro DcT dcPick "Choisis où installer ${PRODUCTNAME}" "Choose where to install ${PRODUCTNAME}" "Elige dónde instalar ${PRODUCTNAME}" "Wähle, wo ${PRODUCTNAME} installiert wird" "Scegli dove installare ${PRODUCTNAME}" "Escolha onde instalar o ${PRODUCTNAME}" "${PRODUCTNAME} のインストール先を選択" "${PRODUCTNAME} 설치 위치 선택" "选择 ${PRODUCTNAME} 的安装位置"
!insertmacro DcT dcBadDir "Ce dossier n'est pas valide. Indique un chemin complet, par exemple D:\Logiciels\${PRODUCTNAME}." "This folder is not valid. Enter a full path, for example D:\Apps\${PRODUCTNAME}." "Esta carpeta no es válida. Escribe una ruta completa, por ejemplo D:\Programas\${PRODUCTNAME}." "Dieser Ordner ist ungültig. Gib einen vollständigen Pfad an, zum Beispiel D:\Programme\${PRODUCTNAME}." "Questa cartella non è valida. Indica un percorso completo, ad esempio D:\Programmi\${PRODUCTNAME}." "Esta pasta não é válida. Informe um caminho completo, por exemplo D:\Programas\${PRODUCTNAME}." "このフォルダーは使えません。D:\Apps\${PRODUCTNAME} のような完全なパスを入力してください。" "이 폴더는 사용할 수 없어요. D:\Apps\${PRODUCTNAME} 처럼 전체 경로를 입력하세요." "此文件夹无效。请输入完整路径，例如 D:\Apps\${PRODUCTNAME}。"
!insertmacro DcT dcInstalling "Installation de ${PRODUCTNAME}…" "Installing ${PRODUCTNAME}…" "Instalando ${PRODUCTNAME}…" "${PRODUCTNAME} wird installiert…" "Installazione di ${PRODUCTNAME}…" "Instalando o ${PRODUCTNAME}…" "${PRODUCTNAME} をインストールしています…" "${PRODUCTNAME} 설치 중…" "正在安装 ${PRODUCTNAME}…"
!insertmacro DcT dcUpdating "Mise à jour de ${PRODUCTNAME}…" "Updating ${PRODUCTNAME}…" "Actualizando ${PRODUCTNAME}…" "${PRODUCTNAME} wird aktualisiert…" "Aggiornamento di ${PRODUCTNAME}…" "Atualizando o ${PRODUCTNAME}…" "${PRODUCTNAME} を更新しています…" "${PRODUCTNAME} 업데이트 중…" "正在更新 ${PRODUCTNAME}…"
!insertmacro DcT dcWait "Ça ne prend que quelques secondes." "This only takes a few seconds." "Solo tarda unos segundos." "Das dauert nur ein paar Sekunden." "Ci vuole solo qualche secondo." "Leva só alguns segundos." "数秒で終わります。" "몇 초면 끝나요." "只需几秒钟。"
!insertmacro DcT dcDoneTitle "${PRODUCTNAME} est prêt !" "${PRODUCTNAME} is ready!" "¡${PRODUCTNAME} está listo!" "${PRODUCTNAME} ist bereit!" "${PRODUCTNAME} è pronto!" "O ${PRODUCTNAME} está pronto!" "${PRODUCTNAME} の準備ができました！" "${PRODUCTNAME} 준비 완료!" "${PRODUCTNAME} 已准备就绪！"
!insertmacro DcT dcUpdatedTitle "${PRODUCTNAME} est à jour !" "${PRODUCTNAME} is up to date!" "¡${PRODUCTNAME} está actualizado!" "${PRODUCTNAME} ist auf dem neuesten Stand!" "${PRODUCTNAME} è aggiornato!" "O ${PRODUCTNAME} está atualizado!" "${PRODUCTNAME} を更新しました！" "${PRODUCTNAME} 업데이트 완료!" "${PRODUCTNAME} 已更新！"
!insertmacro DcT dcDoneText "Tout est installé. Lance ${PRODUCTNAME} et commence ta prochaine création." "Everything is installed. Open ${PRODUCTNAME} and start your next creation." "Todo está instalado. Abre ${PRODUCTNAME} y empieza tu próxima creación." "Alles ist installiert. Öffne ${PRODUCTNAME} und starte deine nächste Kreation." "Tutto è installato. Apri ${PRODUCTNAME} e inizia la tua prossima creazione." "Tudo instalado. Abra o ${PRODUCTNAME} e comece sua próxima criação." "インストールが完了しました。${PRODUCTNAME} を開いて、次の作品を作りましょう。" "설치가 끝났어요. ${PRODUCTNAME}을(를) 열고 다음 작품을 시작해 보세요." "全部安装完成。打开 ${PRODUCTNAME}，开始你的下一个作品吧。"
!insertmacro DcT dcLaunch "Lancer ${PRODUCTNAME} maintenant" "Open ${PRODUCTNAME} now" "Abrir ${PRODUCTNAME} ahora" "${PRODUCTNAME} jetzt öffnen" "Apri ${PRODUCTNAME} ora" "Abrir o ${PRODUCTNAME} agora" "今すぐ ${PRODUCTNAME} を開く" "지금 ${PRODUCTNAME} 열기" "立即打开 ${PRODUCTNAME}"
!insertmacro DcT dcFinish "Terminer" "Finish" "Terminar" "Fertig" "Fine" "Concluir" "完了" "완료" "完成"
!insertmacro DcT dcUnTitle "Désinstaller ${PRODUCTNAME}" "Uninstall ${PRODUCTNAME}" "Desinstalar ${PRODUCTNAME}" "${PRODUCTNAME} deinstallieren" "Disinstalla ${PRODUCTNAME}" "Desinstalar o ${PRODUCTNAME}" "${PRODUCTNAME} をアンインストール" "${PRODUCTNAME} 제거" "卸载 ${PRODUCTNAME}"
!insertmacro DcT dcUnText "${PRODUCTNAME} va être retiré de ce PC. Tes vidéos, musiques et projets (dossier Vidéos\DedCut) ne seront pas touchés." "${PRODUCTNAME} will be removed from this PC. Your videos, music and projects (Videos\DedCut folder) will not be touched." "${PRODUCTNAME} se quitará de este PC. Tus vídeos, música y proyectos (carpeta Vídeos\DedCut) no se tocarán." "${PRODUCTNAME} wird von diesem PC entfernt. Deine Videos, Musik und Projekte (Ordner Videos\DedCut) bleiben unberührt." "${PRODUCTNAME} verrà rimosso da questo PC. I tuoi video, la musica e i progetti (cartella Video\DedCut) non verranno toccati." "O ${PRODUCTNAME} será removido deste PC. Seus vídeos, músicas e projetos (pasta Vídeos\DedCut) não serão mexidos." "${PRODUCTNAME} をこのPCから削除します。動画・音楽・プロジェクト（ビデオ\DedCut フォルダー）はそのまま残ります。" "${PRODUCTNAME}을(를) 이 PC에서 제거해요. 동영상, 음악, 프로젝트(동영상\DedCut 폴더)는 그대로 남아요." "将从这台电脑上移除 ${PRODUCTNAME}。你的视频、音乐和项目（视频\DedCut 文件夹）不会被删除。"
!insertmacro DcT dcUnData "Supprimer aussi mes réglages et les modèles d'IA téléchargés" "Also delete my settings and downloaded AI models" "Borrar también mis ajustes y los modelos de IA descargados" "Auch meine Einstellungen und heruntergeladenen KI-Modelle löschen" "Elimina anche le mie impostazioni e i modelli di IA scaricati" "Apagar também minhas configurações e os modelos de IA baixados" "設定とダウンロードしたAIモデルも削除する" "설정과 다운로드한 AI 모델도 삭제" "同时删除我的设置和已下载的 AI 模型"
!insertmacro DcT dcUnBtn "Désinstaller" "Uninstall" "Desinstalar" "Deinstallieren" "Disinstalla" "Desinstalar" "アンインストール" "제거" "卸载"
!insertmacro DcT dcUninstalling "Désinstallation de ${PRODUCTNAME}…" "Uninstalling ${PRODUCTNAME}…" "Desinstalando ${PRODUCTNAME}…" "${PRODUCTNAME} wird deinstalliert…" "Disinstallazione di ${PRODUCTNAME}…" "Desinstalando o ${PRODUCTNAME}…" "${PRODUCTNAME} をアンインストールしています…" "${PRODUCTNAME} 제거 중…" "正在卸载 ${PRODUCTNAME}…"
!insertmacro DcT dcUnDoneTitle "${PRODUCTNAME} est désinstallé" "${PRODUCTNAME} has been uninstalled" "${PRODUCTNAME} se ha desinstalado" "${PRODUCTNAME} wurde deinstalliert" "${PRODUCTNAME} è stato disinstallato" "O ${PRODUCTNAME} foi desinstalado" "${PRODUCTNAME} をアンインストールしました" "${PRODUCTNAME}을(를) 제거했어요" "${PRODUCTNAME} 已卸载"
!insertmacro DcT dcUnDoneText "Merci d'avoir utilisé ${PRODUCTNAME} ! Tu peux le réinstaller quand tu veux." "Thanks for using ${PRODUCTNAME}! You can reinstall it anytime." "¡Gracias por usar ${PRODUCTNAME}! Puedes reinstalarlo cuando quieras." "Danke, dass du ${PRODUCTNAME} benutzt hast! Du kannst es jederzeit neu installieren." "Grazie per aver usato ${PRODUCTNAME}! Puoi reinstallarlo quando vuoi." "Obrigado por usar o ${PRODUCTNAME}! Você pode reinstalá-lo quando quiser." "${PRODUCTNAME} をご利用いただきありがとうございました。いつでも再インストールできます。" "${PRODUCTNAME}을(를) 사용해 주셔서 고마워요! 언제든 다시 설치할 수 있어요." "感谢使用 ${PRODUCTNAME}！你可以随时重新安装。"
!insertmacro DcT dcFailTitle "L'installation n'a pas pu se terminer" "The installation could not finish" "La instalación no pudo terminar" "Die Installation konnte nicht abgeschlossen werden" "L'installazione non è riuscita" "A instalação não pôde ser concluída" "インストールを完了できませんでした" "설치를 마치지 못했어요" "安装未能完成"
!insertmacro DcT dcUnFailTitle "La désinstallation n'a pas pu se terminer" "The uninstallation could not finish" "La desinstalación no pudo terminar" "Die Deinstallation konnte nicht abgeschlossen werden" "La disinstallazione non è riuscita" "A desinstalação não pôde ser concluída" "アンインストールを完了できませんでした" "제거를 마치지 못했어요" "卸载未能完成"
!insertmacro DcT dcClose "Fermer" "Close" "Cerrar" "Schließen" "Chiudi" "Fechar" "閉じる" "닫기" "关闭"


Function .onInit
  ${GetOptions} $CMDLINE "/P" $PassiveMode
  ${IfNot} ${Errors}
    StrCpy $PassiveMode 1
  ${EndIf}

  ${GetOptions} $CMDLINE "/NS" $NoShortcutMode
  ${IfNot} ${Errors}
    StrCpy $NoShortcutMode 1
  ${EndIf}

  ${GetOptions} $CMDLINE "/UPDATE" $UpdateMode
  ${IfNot} ${Errors}
    StrCpy $UpdateMode 1
  ${EndIf}

  !if "${DISPLAYLANGUAGESELECTOR}" == "true"
    !insertmacro MUI_LANGDLL_DISPLAY
  !endif

  !insertmacro SetContext

  ${If} $INSTDIR == "${PLACEHOLDER_INSTALL_DIR}"
    ; Set default install location
    !if "${INSTALLMODE}" == "perMachine"
      ${If} ${RunningX64}
        !if "${ARCH}" == "x64"
          StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCTNAME}"
        !else if "${ARCH}" == "arm64"
          StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCTNAME}"
        !else
          StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCTNAME}"
        !endif
      ${Else}
        StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCTNAME}"
      ${EndIf}
    !else if "${INSTALLMODE}" == "currentUser"
      StrCpy $INSTDIR "$LOCALAPPDATA\${PRODUCTNAME}"
    !endif

    Call RestorePreviousInstallLocation
  ${EndIf}


  !if "${INSTALLMODE}" == "both"
    !insertmacro MULTIUSER_INIT
  !endif
FunctionEnd


Section EarlyChecks
  ; Abort silent installer if downgrades is disabled
  !if "${ALLOWDOWNGRADES}" == "false"
  ${If} ${Silent}
    ; If downgrading
    ${If} $R0 = -1
      System::Call 'kernel32::AttachConsole(i -1)i.r0'
      ${If} $0 <> 0
        System::Call 'kernel32::GetStdHandle(i -11)i.r0'
        System::call 'kernel32::SetConsoleTextAttribute(i r0, i 0x0004)' ; set red color
        FileWrite $0 "$(silentDowngrades)"
      ${EndIf}
      Abort
    ${EndIf}
  ${EndIf}
  !endif

SectionEnd

Section WebView2
  ; Check if Webview2 is already installed and skip this section
  ${If} ${RunningX64}
    ReadRegStr $4 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${Else}
    ReadRegStr $4 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}
  ${If} $4 == ""
    ReadRegStr $4 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}

  ${If} $4 == ""
    ; Webview2 installation
    ;
    ; Skip if updating
    ${If} $UpdateMode <> 1
      !if "${INSTALLWEBVIEW2MODE}" == "downloadBootstrapper"
        Delete "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        DetailPrint "$(webview2Downloading)"
        NSISdl::download "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Pop $0
        ${If} $0 == "success"
          DetailPrint "$(webview2DownloadSuccess)"
        ${Else}
          DetailPrint "$(webview2DownloadError)"
          Abort "$(webview2AbortError)"
        ${EndIf}
        StrCpy $6 "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Goto install_webview2
      !endif

      !if "${INSTALLWEBVIEW2MODE}" == "embedBootstrapper"
        Delete "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        File "/oname=$TEMP\MicrosoftEdgeWebview2Setup.exe" "${WEBVIEW2BOOTSTRAPPERPATH}"
        DetailPrint "$(installingWebview2)"
        StrCpy $6 "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Goto install_webview2
      !endif

      !if "${INSTALLWEBVIEW2MODE}" == "offlineInstaller"
        Delete "$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe"
        File "/oname=$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe" "${WEBVIEW2INSTALLERPATH}"
        DetailPrint "$(installingWebview2)"
        StrCpy $6 "$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe"
        Goto install_webview2
      !endif

      Goto webview2_done

      install_webview2:
        DetailPrint "$(installingWebview2)"
        ; $6 holds the path to the webview2 installer
        ExecWait "$6 ${WEBVIEW2INSTALLERARGS} /install" $1
        ${If} $1 = 0
          DetailPrint "$(webview2InstallSuccess)"
        ${Else}
          DetailPrint "$(webview2InstallError)"
          Abort "$(webview2AbortError)"
        ${EndIf}
      webview2_done:
    ${EndIf}
  ${Else}
    !if "${MINIMUMWEBVIEW2VERSION}" != ""
      ${VersionCompare} "${MINIMUMWEBVIEW2VERSION}" "$4" $R0
      ${If} $R0 = 1
        update_webview:
          DetailPrint "$(installingWebview2)"
          ${If} ${RunningX64}
            ReadRegStr $R1 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate" "path"
          ${Else}
            ReadRegStr $R1 HKLM "SOFTWARE\Microsoft\EdgeUpdate" "path"
          ${EndIf}
          ${If} $R1 == ""
            ReadRegStr $R1 HKCU "SOFTWARE\Microsoft\EdgeUpdate" "path"
          ${EndIf}
          ${If} $R1 != ""
            ; Chromium updater docs: https://source.chromium.org/chromium/chromium/src/+/main:docs/updater/user_manual.md
            ; Modified from "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft EdgeWebView\ModifyPath"
            ExecWait `"$R1" /install appguid=${WEBVIEW2APPGUID}&needsadmin=true` $1
            ${If} $1 = 0
              DetailPrint "$(webview2InstallSuccess)"
            ${Else}
              MessageBox MB_ICONEXCLAMATION|MB_ABORTRETRYIGNORE "$(webview2InstallError)" IDIGNORE ignore IDRETRY update_webview
              Quit
              ignore:
            ${EndIf}
          ${EndIf}
      ${EndIf}
    !endif
  ${EndIf}
SectionEnd

Section Install
  SetOutPath $INSTDIR

  !ifmacrodef NSIS_HOOK_PREINSTALL
    !insertmacro NSIS_HOOK_PREINSTALL
  !endif

  !insertmacro CheckIfAppIsRunning "$INSTDIR\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"

  ; Copy main executable
  File "${MAINBINARYSRCPATH}"

  ; Copy resources
  {{#each resources_dirs}}
    CreateDirectory "$INSTDIR\\{{this}}"
  {{/each}}
  {{#each resources}}
    File /a "/oname={{this.[1]}}" "{{no-escape @key}}"
  {{/each}}

  ; Copy external binaries
  {{#each binaries}}
    File /a "/oname={{this}}" "{{no-escape @key}}"
  {{/each}}

  ; Create file associations
  {{#each file_associations as |association| ~}}
    {{#each association.ext as |ext| ~}}
       !insertmacro APP_ASSOCIATE "{{ext}}" "{{or association.name ext}}" "{{association-description association.description ext}}" "$INSTDIR\${MAINBINARYNAME}.exe,0" "Open with ${PRODUCTNAME}" "$INSTDIR\${MAINBINARYNAME}.exe $\"%1$\""
    {{/each}}
  {{/each}}

  ; Register deep links
  {{#each deep_link_protocols as |protocol| ~}}
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}" "URL Protocol" ""
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}" "" "URL:${BUNDLEID} protocol"
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  {{/each}}

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Save $INSTDIR in registry for future installations
  WriteRegStr SHCTX "${MANUPRODUCTKEY}" "" $INSTDIR

  !if "${INSTALLMODE}" == "both"
    ; Save install mode to be selected by default for the next installation such as updating
    ; or when uninstalling
    WriteRegStr SHCTX "${UNINSTKEY}" $MultiUser.InstallMode 1
  !endif

  ; Remove old main binary if it doesn't match new main binary name
  ReadRegStr $OldMainBinaryName SHCTX "${UNINSTKEY}" "MainBinaryName"
  ${If} $OldMainBinaryName != ""
  ${AndIf} $OldMainBinaryName != "${MAINBINARYNAME}.exe"
    Delete "$INSTDIR\$OldMainBinaryName"
  ${EndIf}

  ; Save current MAINBINARYNAME for future updates
  WriteRegStr SHCTX "${UNINSTKEY}" "MainBinaryName" "${MAINBINARYNAME}.exe"

  ; Registry information for add/remove programs
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayName" "${PRODUCTNAME}"
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayIcon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr SHCTX "${UNINSTKEY}" "Publisher" "${MANUFACTURER}"
  WriteRegStr SHCTX "${UNINSTKEY}" "InstallLocation" "$\"$INSTDIR$\""
  WriteRegStr SHCTX "${UNINSTKEY}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegDWORD SHCTX "${UNINSTKEY}" "NoModify" "1"
  WriteRegDWORD SHCTX "${UNINSTKEY}" "NoRepair" "1"

  ${GetSize} "$INSTDIR" "/M=uninstall.exe /S=0K /G=0" $0 $1 $2
  IntOp $0 $0 + ${ESTIMATEDSIZE}
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD SHCTX "${UNINSTKEY}" "EstimatedSize" "$0"

  !if "${HOMEPAGE}" != ""
    WriteRegStr SHCTX "${UNINSTKEY}" "URLInfoAbout" "${HOMEPAGE}"
    WriteRegStr SHCTX "${UNINSTKEY}" "URLUpdateInfo" "${HOMEPAGE}"
    WriteRegStr SHCTX "${UNINSTKEY}" "HelpLink" "${HOMEPAGE}"
  !endif

  ; Create start menu shortcut
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    Call CreateOrUpdateStartMenuShortcut
  !insertmacro MUI_STARTMENU_WRITE_END

  ; Create desktop shortcut for silent and passive installers
  ; because finish page will be skipped
  ${If} $PassiveMode = 1
  ${OrIf} ${Silent}
  ${OrIf} $DcDesk = 1
    Call CreateOrUpdateDesktopShortcut
  ${EndIf}

  !ifmacrodef NSIS_HOOK_POSTINSTALL
    !insertmacro NSIS_HOOK_POSTINSTALL
  !endif

  ; Auto close this page for passive mode
  ${If} $PassiveMode = 1
    SetAutoClose true
  ${EndIf}
SectionEnd

Function .onInstSuccess
  ; Check for `/R` flag only in silent and passive installers because
  ; GUI installer has a toggle for the user to (re)start the app
  ${If} $PassiveMode = 1
  ${OrIf} ${Silent}
    ${GetOptions} $CMDLINE "/R" $R0
    ${IfNot} ${Errors}
      ${GetOptions} $CMDLINE "/ARGS" $R0
      nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" "$R0"
    ${EndIf}
  ${EndIf}
FunctionEnd

Function un.onInit
  !insertmacro SetContext

  !if "${INSTALLMODE}" == "both"
    !insertmacro MULTIUSER_UNINIT
  !endif

  !insertmacro MUI_UNGETLANGUAGE

  ${GetOptions} $CMDLINE "/P" $PassiveMode
  ${IfNot} ${Errors}
    StrCpy $PassiveMode 1
  ${EndIf}

  ${GetOptions} $CMDLINE "/UPDATE" $UpdateMode
  ${IfNot} ${Errors}
    StrCpy $UpdateMode 1
  ${EndIf}
FunctionEnd

Section Uninstall

  !ifmacrodef NSIS_HOOK_PREUNINSTALL
    !insertmacro NSIS_HOOK_PREUNINSTALL
  !endif

  !insertmacro CheckIfAppIsRunning "$INSTDIR\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"

  ; Delete the app directory and its content from disk
  ; Copy main executable
  Delete "$INSTDIR\${MAINBINARYNAME}.exe"

  ; Delete resources
  {{#each resources}}
    Delete "$INSTDIR\\{{this.[1]}}"
  {{/each}}

  ; Delete external binaries
  {{#each binaries}}
    Delete "$INSTDIR\\{{this}}"
  {{/each}}

  ; Delete app associations
  {{#each file_associations as |association| ~}}
    {{#each association.ext as |ext| ~}}
      !insertmacro APP_UNASSOCIATE "{{ext}}" "{{or association.name ext}}"
    {{/each}}
  {{/each}}

  ; Delete deep links
  {{#each deep_link_protocols as |protocol| ~}}
    ReadRegStr $R7 SHCTX "Software\Classes\\{{protocol}}\shell\open\command" ""
    ${If} $R7 == "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
      DeleteRegKey SHCTX "Software\Classes\\{{protocol}}"
    ${EndIf}
  {{/each}}


  ; Delete uninstaller
  Delete "$INSTDIR\uninstall.exe"

  {{#each resources_ancestors}}
  RMDir /REBOOTOK "$INSTDIR\\{{this}}"
  {{/each}}
  RMDir "$INSTDIR"

  ; Remove shortcuts if not updating
  ${If} $UpdateMode <> 1
    !insertmacro DeleteAppUserModelId

    ; Remove start menu shortcut
    !insertmacro MUI_STARTMENU_GETFOLDER Application $AppStartMenuFolder
    !insertmacro IsShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
      Delete "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
      RMDir "$SMPROGRAMS\$AppStartMenuFolder"
    ${EndIf}
    !insertmacro IsShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk"
      Delete "$SMPROGRAMS\${PRODUCTNAME}.lnk"
    ${EndIf}

    ; Remove desktop shortcuts
    !insertmacro IsShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$DESKTOP\${PRODUCTNAME}.lnk"
      Delete "$DESKTOP\${PRODUCTNAME}.lnk"
    ${EndIf}
  ${EndIf}

  ; Remove registry information for add/remove programs
  !if "${INSTALLMODE}" == "both"
    DeleteRegKey SHCTX "${UNINSTKEY}"
  !else if "${INSTALLMODE}" == "perMachine"
    DeleteRegKey HKLM "${UNINSTKEY}"
  !else
    DeleteRegKey HKCU "${UNINSTKEY}"
  !endif

  ; Removes the Autostart entry for ${PRODUCTNAME} from the HKCU Run key if it exists.
  ; This ensures the program does not launch automatically after uninstallation if it exists.
  ; If it doesn't exist, it does nothing.
  ; We do this when not updating (to preserve the registry value on updates)
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}"
  ${EndIf}

  ; Delete app data if the checkbox is selected
  ; and if not updating
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    ; Clear the install location $INSTDIR from registry
    DeleteRegKey SHCTX "${MANUPRODUCTKEY}"
    DeleteRegKey /ifempty SHCTX "${MANUKEY}"

    ; Clear the install language from registry
    DeleteRegValue HKCU "${MANUPRODUCTKEY}" "Installer Language"
    DeleteRegKey /ifempty HKCU "${MANUPRODUCTKEY}"
    DeleteRegKey /ifempty HKCU "${MANUKEY}"

    SetShellVarContext current
    RmDir /r "$APPDATA\${BUNDLEID}"
    RmDir /r "$LOCALAPPDATA\${BUNDLEID}"
    ; modèles d'IA téléchargés depuis DedCut (Vidéo IA, DedCut IA)
    RmDir /r "$LOCALAPPDATA\${PRODUCTNAME}\ai"
    RMDir "$LOCALAPPDATA\${PRODUCTNAME}"
  ${EndIf}

  !ifmacrodef NSIS_HOOK_POSTUNINSTALL
    !insertmacro NSIS_HOOK_POSTUNINSTALL
  !endif

  ; Auto close if passive mode or updating
  ${If} $PassiveMode = 1
  ${OrIf} $UpdateMode = 1
    SetAutoClose true
  ${EndIf}
SectionEnd

Function RestorePreviousInstallLocation
  ReadRegStr $4 SHCTX "${MANUPRODUCTKEY}" ""
  StrCmp $4 "" +2 0
    StrCpy $INSTDIR $4
FunctionEnd

Function Skip
  Abort
FunctionEnd

Function SkipIfPassive
  ${IfThen} $PassiveMode = 1  ${|} Abort ${|}
FunctionEnd
Function un.SkipIfPassive
  ${IfThen} $PassiveMode = 1  ${|} Abort ${|}
FunctionEnd

Function CreateOrUpdateStartMenuShortcut
  ; We used to use product name as MAINBINARYNAME
  ; migrate old shortcuts to target the new MAINBINARYNAME
  StrCpy $R0 0

  !insertmacro IsShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    StrCpy $R0 1
  ${EndIf}

  !insertmacro IsShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    StrCpy $R0 1
  ${EndIf}

  ${If} $R0 = 1
    Return
  ${EndIf}

  ; Skip creating shortcut if in update mode or no shortcut mode
  ; but always create if migrating from wix
  ${If} $WixMode = 0
    ${If} $UpdateMode = 1
    ${OrIf} $NoShortcutMode = 1
      Return
    ${EndIf}
  ${EndIf}

  !if "${STARTMENUFOLDER}" != ""
    CreateDirectory "$SMPROGRAMS\$AppStartMenuFolder"
    CreateShortcut "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
  !else
    CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  !endif
FunctionEnd

Function CreateOrUpdateDesktopShortcut
  ; We used to use product name as MAINBINARYNAME
  ; migrate old shortcuts to target the new MAINBINARYNAME
  !insertmacro IsShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Return
  ${EndIf}

  ; Skip creating shortcut if in update mode or no shortcut mode
  ; but always create if migrating from wix
  ${If} $WixMode = 0
    ${If} $UpdateMode = 1
    ${OrIf} $NoShortcutMode = 1
      Return
    ${EndIf}
  ${EndIf}

  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
  !insertmacro SetLnkAppUserModelId "$DESKTOP\${PRODUCTNAME}.lnk"
FunctionEnd

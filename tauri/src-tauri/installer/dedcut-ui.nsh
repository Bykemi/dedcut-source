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

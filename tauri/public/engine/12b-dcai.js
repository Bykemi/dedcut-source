/* ---------- DedCut IA : assistant intégré, gratuit, sans internet ----------
   Il reconnaît les demandes de montage courantes dans les 9 langues (mots-clés) et les exécute avec les mêmes outils que les IA en ligne
   (chatTool → mcpRun) : chaque action apparaît dans la discussion et s'annule avec « Annuler tout ce que l'IA a fait ».
   Il répond aussi aux questions sur DedCut (« comment couper ? ») avec une base de réponses (DCQ) : il ouvre le bon onglet
   et propose « Le faire pour moi » quand il sait faire l'action lui-même.
   Mots-clés : « mot » = début d'un mot (une faute de frappe tolérée dès 5 lettres), « =mot » = mot exact,
   « plusieurs mots » = mots qui se suivent, écriture non latine = morceau de texte, [a,b] = a et b présents tous les deux. */
const DCAI={
  silence:['les blancs','des blancs','=blancs','silence','silences','temps mort','temps morts','les pauses','=pauses','les vides','gap','gaps','dead air','stille','leerlauf','silenzi','silenzio','silencio','silencios','silêncio','silêncios','無音','沈黙','무음','침묵','공백','静音','沉默','空白','停顿'],
  captions:['sous-titre','soustitre','caption','subtitle','subtitul','subtítulo','untertitel','sottotitol','legenda','字幕','자막'],
  viz:['visualis','visualiz','barre de son','barres de son','barre son','spectre','spectrum','onde','ondes','equaliz','egalis','égalis','equalis','waveform','vumetre','vumètre','vu-metre','vu meter','espectro','ecualiz','spektrum','spettro','ビジュアライザ','スペクトラム','波形','イコライザ','비주얼라이저','시각화','파형','스펙트럼','이퀄라이저','可视化','频谱','均衡器'],
  title:['titre','title','titulo','título','titel','titolo','タイトル','제목','标题'],
  music:['musique','music','musica','música','musik','音楽','bgm','음악','音乐'],
  pbar:['barre de progression','progression','progress','progreso','fortschritt','avanzamento','progresso','進行','プログレス','진행','进度'],
  sub:['abonn','subscri','suscri','abonnier','iscriv','inscrev','登録','구독','订阅'],
  trans:['transition','transicion','transición','übergang','ubergang','transizion','transicao','transição','トランジション','전환','转场','过渡'],
  fade:['fondu','fondus','fade','fundido','blende','dissolvenz','esmaecer','フェード','페이드','淡入','淡出'],
  icons:['icone','icône','icon','emoji','icono','symbol','icona','ícone','アイコン','아이콘','图标','coeur','cœur','heart'],
  cine:['cinema','cinéma','cinemat','bandes noires','letterbox','kino','映画','시네마','电影'],
  export:['export','exporte','exporta','exportier','esporta','書き出','내보내','导出'],
  undo:['annule','undo','deshace','deshacer','rückgängig','ruckgangig','annulla','desfaz','元に戻','취소','撤销'],
  // « automatique » seul ne suffit pas (« sous-titres automatiques ») : il faut aussi un mot de montage
  auto:['montage auto','monte ma video','monte la video','fais le montage','fais mon montage','auto edit','autoedit','edit my video','edit it for me','edita mi','schneide mein','monta il mio','edite meu',
    ['automati','montage'],['automati','monte'],['automati','edit'],['automat','schneid'],['automat','monta'],['automat','edita'],['automat','edite'],['自動','編集'],['자동','편집'],['自动','剪辑'],['自动','编辑']],
  vert:['9:16','en vertical','en verticale','format vertical','video verticale','mode vertical','tiktok','=shorts','=reels','=reel','make it vertical','vertical video','to vertical','in vertical','video vertical','hochkant','hochformat','in verticale','formato verticale','na vertical','formato vertical','縦型','縦長','세로','竖屏','竖版'],
  horiz:['16:9','en horizontal','format horizontal','video horizontale','make it horizontal','horizontal video','to horizontal','in horizontal','video horizontal','querformat','in orizzontale','formato orizzontale','na horizontal','formato horizontal','横型','横長','가로','横屏','横版']
};
const dcNorm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’`]/g,"'");
const dcToks=n=>n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
function dcQ(text){const n=dcNorm(text);return{n,toks:dcToks(n)}}
/* distance entre deux mots (une lettre en trop, en moins, changée ou deux lettres inversées = 1) */
function dcDist(a,b){
  if(Math.abs(a.length-b.length)>1)return 2;const d=[];
  for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i?0:j}
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}
function dcWord(t,k){
  if(t.startsWith(k))return 1;
  if(k.length>=5&&t.length>=5&&t[0]===k[0]&&/^[a-z]+$/.test(k))for(const L of [k.length-1,k.length,k.length+1])if(dcDist(k,t.slice(0,L))<=1)return .6;
  return 0;
}
/* un mot-clé dans la phrase → [note, endroit trouvé] ; note : 1 = trouvé, 0,6 = avec une faute de frappe, 0 = absent */
function dcHit(q,k){
  if(Array.isArray(k)){let s=0;for(const p of k){const v=dcHit(q,p)[0];if(!v)return [0];s+=v}return [s,'a'+k.join('+')]}
  const kn=dcNorm(k);
  if(kn[0]==='='){const i=q.toks.indexOf(kn.slice(1));return i<0?[0]:[1,'t'+i]}
  if(/[^\x00-\x7f]/.test(kn))return q.n.includes(kn)?[1,'c'+kn]:[0];
  const kt=dcToks(kn);if(!kt.length)return [0];
  if(kt.length===1){let b=0,bi=-1;for(let i=0;i<q.toks.length&&b<1;i++){const v=dcWord(q.toks[i],kt[0]);if(v>b){b=v;bi=i}}return b?[b,'t'+bi]:[0]}
  for(let i=0;i+kt.length<=q.toks.length;i++){let ok=true;for(let j=0;j<kt.length&&ok;j++)ok=j<kt.length-1?q.toks[i+j]===kt[j]:q.toks[i+j].startsWith(kt[j]);if(ok)return [1,'p'+kn]}
  return [0];
}
const dcHas=(q,list)=>list.some(k=>dcHit(q,k)[0]>0);
/* note d'un sujet : un même mot de la phrase ne compte qu'une fois (« texte » trouvé par « text » et par « texte ») */
function dcScore(q,list){const best={};for(const k of list){const [v,at]=dcHit(q,k);if(v&&!(best[at]>=v))best[at]=v}return Object.values(best).reduce((a,b)=>a+b,0)}
/* question (« comment… ? ») ou demande polie (« tu peux… ? ») : une question reçoit une explication, une demande est exécutée */
const DCQ_FIRST=new Set(['comment','pourquoi','quoi','quand','combien','quel','quelle','quels','quelles','ou','est','how','what','why','where','when','which','who','can','is','are','does','como','que','donde','cuando','cuanto','cual','wie','was','warum','wo','wann','welche','welcher','kann','gibt','come','cosa','perche','dove','quando','quanto','quale','posso','onde','qual','porque','por','o']);
const DCQ_ANY=['=comment','=pourquoi','c est quoi','qu est ce','est ce que','est ce qu','ou est','ou sont','ou trouver','ou se trouve','je peux','puis je','=peut on','on peut','how do','how can','how to','what is','where is','can i','is there','is it','como hago','como puedo','como faco','como fazer','como posso','wie kann','wie mache','come faccio','come posso','どう','どこ','なぜ','何','なに','ですか','ますか','方法','でしょう','어떻게','어디','왜','뭐','무엇','방법','나요','까요','인가요','怎么','怎样','如何','哪','为什么','什么','吗','呢'];
const DCQ_REQ=['tu peux','peux tu','pourrais tu','tu pourrais','tu veux bien','est ce que tu','=stp','=svp','s il te plait','s il vous plait','can you','could you','would you','will you','=please','=pls','puedes','podrias','por favor','kannst du','konntest du','=bitte','puoi','potresti','per favore','=pode','=poderia','voce pode','てくれ','てください','ください','てほしい','해 줘','해줘','주세요','줄래','주실래','帮我','请','给我','能不能帮','可以帮'];
function dcIsQ(q,raw){const r=String(raw).toLowerCase();return /[?？]/.test(r)||/(^|[^a-zà-ÿ])où([^a-zà-ÿ]|$)/.test(r)||/[¿]|cómo|qué|dónde|cuándo|cuánto|cuál/.test(r)||DCQ_FIRST.has(q.toks[0])||dcHas(q,DCQ_ANY)}
function dcIsReq(q,raw){return dcHas(q,DCQ_REQ)||/して[!！。.\s]*$/.test(String(raw).trim())&&!/どうして/.test(raw)}

/* ---------- réponses aux questions ----------
   k = mots-clés · tab = onglet de gauche à ouvrir · it = onglet de droite à ouvrir si un clip est sélectionné
   act = action proposée (« Le faire pour moi ») · fn = bouton spécial · t = chercher dans la phrase sans les « sous-titres » (pour « titre ») */
const dcL=k=>T(k).replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s*\([^)]*\)\s*$/,'').replace(/[….\s]+$/,'');
const dcShapes=()=>T('dcai.q.shapes',{tab:dcL('rail.shapes')});
const DCQ_VERT=['vertical','verticale','hochkant','vertikal','9:16','tiktok','=shorts','=reels','縦','세로','竖'];
const DCQ_HORIZ=['horizontal','orizzontale','querformat','16:9','paysage','landscape','横','가로'];
const DCQ=[
  {k:[...DCAI.silence,'couper les silences'],it:'audio',act:'silence',a:()=>T('dcai.q.silence',{audio:dcL('common.audio'),cut:dcL('audio.cutSilences')})},
  {k:['bruit de fond','bruits de fond','=bruit','=bruits','souffle','gresill','ventilateur','nettoyer la voix','nettoyer le son','nettoie','debruit','voix claire','son propre','noise','background noise','denoise','=hiss','clean audio','clean voice','clean up the','ruido','limpiar','rauschen','hintergrundgerausch','storgerausch','rumore','fruscio','pulire','chiado','limpar','ノイズ','雑音','노이즈','잡음','소음','噪音','降噪','杂音','底噪'],it:'audio',
    a:()=>T('dcai.q.clean',{audio:dcL('common.audio'),clean:dcL('clean.title')})},
  {k:[...DCAI.captions,'transcri','=srt','closed caption'],tab:'cap',act:'captions',a:()=>T('dcai.q.captions',{tab:dcL('rail.captions'),text:dcL('common.text'),subs:dcL('text.subs')})},
  {k:DCAI.viz,tab:'stick',act:'viz',a:()=>T('dcai.q.viz',{tab:dcL('rail.shapes'),cat:dcL('wcat.viz')})},
  {k:DCAI.pbar,tab:'stick',act:'pbar',a:dcShapes},
  {k:['s abonner','abonne toi','abonnez vous','bouton abonne','bouton d abonnement','subscribe','suscrib','abonnier','iscriv','inscrev','登録ボタン','구독 버튼','订阅按钮'],tab:'stick',act:'sub',a:dcShapes},
  {k:DCAI.icons,tab:'stick',act:'icons',a:dcShapes},
  {k:DCAI.cine,tab:'stick',act:'cine',a:dcShapes},
  {k:[...DCAI.auto,'=automatique','automatic','automatico','automatisch','自動','자동','自动'],act:'auto',a:()=>T('dcai.q.auto')},
  {k:['vertical','horizontal','=format','=formats','ratio','9:16','16:9','1:1','4:5','tiktok','=shorts','=reels','=reel','portrait','paysage','carre','landscape','square','resolution','taille de la video','formato','cuadrado','vertikal','hochkant','hochformat','querformat','quadrat','orizzontale','quadrato','quadrado','縦','横','正方形','세로','가로','정사각','竖','横屏','方形','比例'],
    act:q=>dcHas(q,DCQ_HORIZ)?'horiz':dcHas(q,DCQ_VERT)?'vert':null,
    a:()=>T('dcai.q.format',{esc:T('kb.k.escape'),proj:dcL('proj.title'),quick:dcL('proj.quickFormat'),vert:dcL('proj.vertical'),horiz:dcL('proj.horizontal')})},
  {k:['fond uni','fond de couleur','fond noir','fond blanc','couleur de fond','degrade','solid background','background color','color background','black background','gradient','fondo de color','color de fondo','degradado','hintergrundfarbe','farbverlauf','sfondo colorato','colore di sfondo','sfumatura','fundo colorido','cor de fundo','gradiente','背景色','単色','グラデーション','배경색','그라데이션','纯色','渐变'],tab:'media',
    a:()=>T('dcai.q.bg',{media:dcL('rail.media'),color:dcL('gen.color'),grad:dcL('gen.grad')})},
  {k:['fond vert','ecran vert','green screen','greenscreen','chroma','incrust','detour','=fond','=fonds','arriere plan','retirer le fond','enlever le fond','supprimer le fond','sans fond','background','remove background','fondo verde','pantalla verde','quitar el fondo','eliminar fondo','=fondo','hintergrund','=sfondo','schermo verde','rimuovere lo sfondo','fundo verde','tela verde','remover o fundo','=fundo','グリーンバック','背景','クロマキー','크로마','배경','그린 스크린','绿幕','抠像','抠图','去背景'],it:'chroma',
    a:()=>T('dcai.q.chroma',{key:dcL('insp.keying'),rm:dcL('chroma.remove'),ai:dcL('chroma.ai')})},
  {k:['changer la voix','changer ma voix','change la voix','change ma voix','modifier la voix','voix robot','voix grave','voix aigue','voix de robot','voix de bebe','effet de voix','effets de voix','deformer la voix','voice changer','change voice','change my voice','robot voice','deep voice','voice effect','cambiar la voz','voz de robot','efecto de voz','stimme andern','stimme verander','roboterstimme','stimmeffekt','cambiare la voce','voce robot','effetto voce','mudar a voz','mudar minha voz','voz de robo','efeito de voz','ボイスチェンジ','声を変','ロボット声','음성 변조','목소리 변','목소리를 바꾸','变声','变音','机器人声'],it:'audio',
    a:()=>T('dcai.q.voice',{audio:dcL('common.audio'),voice:dcL('voice.title')})},
  {k:['voix off','voiceover','voice over','narration','commentaire audio','=micro','microphone','=mic','enregistrer ma voix','=voix','tts','text to speech','texte en voix','lire le texte','voz en off','locucion','=voz','grabar mi voz','sprachaufnahme','meine stimme','=stimme','vorlesen','voce fuori campo','=voce','registrare la voce','narracao','gravar minha voz','ナレーション','アフレコ','声','録音','読み上げ','내레이션','목소리','녹음','음성','旁白','配音','录音','文字转语音','朗读'],tab:'audio',
    a:()=>T('dcai.q.vo',{tab:dcL('common.audio'),vo:dcL('vo.record'),tts:dcL('tts.title')})},
  {k:['bruitage','effet sonore','effets sonores','son drole','sound effect','sfx','=whoosh','=ding','efecto de sonido','efectos de sonido','soundeffekt','gerausch','effetto sonoro','effetti sonori','efeito sonoro','efeitos sonoros','効果音','효과음','音效'],tab:'audio',
    a:()=>T('dcai.q.sfx',{tab:dcL('common.audio'),sfx:dcL('audio.sfx')})},
  {k:['volume','=mute','muet','couper le son','coupe le son','enlever le son','retirer le son','sans son','pas de son','plus fort','moins fort','trop fort','monter le son','baisser le son','loudness','louder','quieter','too loud','no sound','=sound','lautstarke','=laut','=leise','stumm','volumen','silenciar','sin sonido','=muto','senza audio','sem som','=mudo','音量','ミュート','소리','볼륨','음소거'],it:'audio',
    a:()=>T('dcai.q.volume',{audio:dcL('common.audio'),vol:dcL('audio.volume'),mute:dcL('audio.mute'),master:dcL('proj.masterVol')})},
  {k:[...DCAI.music,'chanson','=song','=songs','cancion','=lied','canzone','cancao','歌','노래','=mp3','musique de fond','background music'],tab:'audio',act:'music',
    a:()=>T('dcai.q.music',{tab:dcL('common.audio'),lib:dcL('mlib.title'),imp:dcL('audio.importMusic')})},
  {k:['enregistrer l ecran','enregistrer mon ecran','=ecran','screen record','record my screen','record the screen','screen capture','webcam','facecam','camera','grabar la pantalla','grabar pantalla','=pantalla','bildschirm','registra lo schermo','registrare lo schermo','=schermo','gravar a tela','gravar tela','=tela','画面録画','画面を録画','録画','화면 녹화','녹화','录屏','屏幕录制','录制屏幕'],tab:'rec',
    a:()=>T('dcai.q.rec',{tab:dcL('mode.rec').replace(/^\S+\s/,''),start:dcL('st.recStart')})},
  {k:['=live','en live','faire un live','un direct','en direct','stream','streamer','streaming','twitch','youtube live','kick','diffuser','diffusion','transmitir','directo','en vivo','livestream','diretta','ao vivo','ライブ配信','配信','라이브','방송','直播','推流','rtmp','cle de stream','stream key'],tab:'live',
    a:()=>T('dcai.q.live',{tab:dcL('mode.live').replace(/^\S+\s/,''),go:dcL('live.go')})},
  {k:['video ia','video ai','ai video','ia video','generer','generat','generar','generier','generare','=gerar','text to video','image to video','texte en video','animer une image','animer une photo','生成','동영상 생성','영상 생성','생성','ai视频'],tab:'gen',
    a:()=>T('dcai.q.aigen',{tab:dcL('rail.aigen')})},
  {k:[...DCAI.trans,'enchainement','切り替え','장면 전환'],tab:'tr',act:'trans',a:()=>T('dcai.q.trans',{tab:dcL('common.transitions')})},
  {k:[...DCAI.fade,'fondu au noir'],act:'fade',
    a:()=>T('dcai.q.fade',{proj:dcL('proj.title'),fade:dcL('fade.title'),audio:dcL('common.audio'),afin:dcL('audio.fadeIn'),afout:dcL('audio.fadeOut')})},
  {k:['arret sur image','=figer','=geler','freeze frame','=freeze','image fixe','congelar','standbild','fermo immagine','congelar imagem','静止画','フリーズ','정지 화면','定格'],a:()=>T('dcai.q.freeze',{freeze:dcL('menu.freezeHere')})},
  {k:['ralenti','vitesse','accelere','accelerer','slow motion','slow mo','=slowmo','speed','fast forward','camara lenta','velocidad','acelerar','zeitlupe','geschwindigkeit','schneller','rallentat','velocita','accelerare','camera lenta','velocidade','スロー','速度','倍速','早送り','슬로','속도','배속','慢动作','加速','快进'],it:'speed',
    a:()=>T('dcai.q.speed',{speed:dcL('insp.speed'),ramp:dcL('ramp.title')})},
  {k:['=lag','=lent','=lente','saccad','=rame','=ramer','fluide','proxy','=slow','laggy','stutter','choppy','=smooth','=lento','tirones','fluido','ruckel','langsam','flussig','scatti','travando','=trava','重い','カクカク','遅い','プロキシ','느려','끊겨','버벅','프록시','卡','慢','代理','流畅'],tab:'media',
    a:()=>T('dcai.q.lag',{media:dcL('rail.media'),proxy:dcL('proxy.make')})},
  {k:['zoom','agrandir','grossir','mouvement','ken burns','=pan','=travelling','acercar','bewegung','vergroßer','ingrandire','movimento','aproximar','ズーム','動き','줌','확대','움직임','缩放','放大','运动'],it:'anim',
    a:()=>T('dcai.q.zoom',{anim:dcL('insp.animation'),motion:dcL('motion.title'),zin:dcL('motion.zoomIn'),k:kbLabel('kf')})},
  {k:['image cle','images cles','keyframe','animer','animation','anima','fotograma clave','schlusselbild','animier','fotogramma chiave','quadro chave','キーフレーム','アニメーション','키프레임','애니메이션','关键帧','动画'],
    a:()=>T('dcai.q.kf',{k:kbLabel('kf'),btn:dcL('kf.button')})},
  {k:['recadr','rogner','=crop','cropping','recortar','zuschneid','beschneid','ritaglia','クロップ','トリミング','크롭','裁剪'],it:'base',a:()=>T('dcai.q.crop',{base:dcL('insp.base'),crop:dcL('insp.crop')})},
  {k:['theme','couleur de l interface','couleur de dedcut','mode sombre','dark mode','light mode','mode clair','interface','tema','modo oscuro','dunkel','farbe der oberflache','modalita scura','modo escuro','テーマ','ダークモード','테마','다크 모드','主题','深色','暗色'],
    a:()=>T('dcai.q.theme',{menu:dcL('ui.menu'),theme:dcL('menu.theme')})},
  {k:['couleur','luminosit','contraste','saturation','etalonnage','=lut','filtre','=color','=colors','colour','brightness','contrast','grading','filter','brillo','farbe','helligkeit','kontrast','colore','luminosita','=cor','=cores','brilho','色','明るさ','コントラスト','フィルター','색','밝기','대비','필터','颜色','亮度','对比度','滤镜'],tab:'filt',it:'col',
    a:()=>T('dcai.q.colors',{tab:dcL('common.filters'),col:dcL('insp.colors')})},
  {k:['effet','=efet','=efets','effect','efecto','effekt','effetto','efeito','エフェクト','효과','特效','效果','glitch','=vhs','=flou','blur','desenfoque','unscharf','sfocat','desfoque','ぼかし','흐림','模糊','fond flou','flout','flouter le fond','blur background','background blur'],tab:'fx',
    a:()=>T('dcai.q.effects',{tab:dcL('common.effects')})},
  {k:['forme','fleche','sticker','autocollant','compteur','shape','arrow','counter','forma','flecha','pegatina','contador','pfeil','zahler','freccia','adesivo','contatore','seta','figurinha','図形','矢印','ステッカー','도형','화살표','스티커','形状','箭头','贴纸','计数器'],tab:'stick',a:dcShapes},
  {k:['diaporama','slideshow','montage photo','diapositiva','diashow','bildershow','presentazione','apresentacao','スライドショー','슬라이드쇼','幻灯片','相册'],tab:'media',
    a:()=>T('dcai.q.slide',{media:dcL('rail.media'),slide:dcL('slide.btn')})},
  {t:1,k:[...DCAI.title,'texte','text','texto','testo','=ecrire','ecrit','write','escribir','schreib','scrivere','escrever','police','font','fuente','schrift','carattere','fonte','テキスト','文字','フォント','텍스트','글자','글꼴','文本','字体',
    'couleur du texte','animation de texte','animer le texte','animer un texte','text color','text animation','animate text','color del texto','textfarbe','colore del testo','cor do texto'],tab:'text',act:'title',
    a:()=>T('dcai.q.text',{tab:dcL('common.text'),add:dcL('text.add')})},
  {k:['import','ajouter une video','ajouter des videos','ajouter une photo','ajouter une image','mettre une video','mettre une photo','ouvrir une video','add a video','add video','add photo','add image','open a video','anadir video','agregar video','video hinzu','bild hinzu','aggiungere video','aggiungi video','adicionar video','読み込','インポート','가져오','불러오','导入','添加视频','加视频'],tab:'media',
    a:()=>T('dcai.q.import',{tab:dcL('rail.media'),imp:dcL('lib.import')})},
  {k:[...DCAI.export,'esport','enregistrer la video','enregistrer ma video','sauvegarder la video','telecharger la video','=mp4','=gif','=webm','render','rendu','publier','save the video','save my video','download the video','guardar el video','video speichern','salvare il video','salvar o video','動画を保存','ビデオを保存','동영상 저장','영상 저장','保存视频'],act:'export',
    a:()=>T('dcai.q.export',{exp:dcL('ui.export'),k:kbLabel('export')})},
  {k:['sauvegard','enregistr','=save','saving','autosave','guardar','speicher','salva','salvar','保存','저장'],
    a:()=>T('dcai.q.save',{k:kbLabel('save'),menu:dcL('ui.menu'),save:dcL('ui.save'),versions:dcL('home.versions')})},
  {k:[['supprim','projet'],['effac','projet'],['delete','project'],['remove','project'],['borr','proyecto'],['elimin','proyecto'],['losch','projekt'],['elimin','progett'],['cancell','progett'],['exclu','projeto'],['apag','projeto'],['プロジェクト','削除'],['프로젝트','삭제'],['项目','删除']],
    a:()=>T('dcai.q.delproj',{menu:dcL('ui.menu'),home:dcL('menu.home'),del:dcL('home.deleteProject')})},
  {k:[...DCAI.undo,'retour en arriere','revenir en arriere','ctrl z','go back','=revert','zuruck','indietro','voltar','戻','되돌','撤消'],act:'undo',
    a:()=>T('dcai.q.undo',{k:kbLabel('undo'),k2:kbLabel('redo')})},
  {k:['supprim','effac','enlev','retir','delete','remove','erase','borrar','eliminar','quitar','losch','entfern','elimina','cancell','rimuov','apagar','excluir','remover','削除','消','삭제','지우','删除','移除'],
    a:()=>T('dcai.q.delete',{k:kbLabel('del'),k2:kbLabel('ripple'),ripple:dcL('keys.ripple')})},
  {k:['coup','decoup','scind','divis','split','=cut','=cuts','cutting','trim','cort','dividir','schneid','teilen','trenn','tagli','dividere','カット','分割','切','자르','분할','컷','剪'],
    a:()=>T('dcai.q.split',{k:kbLabel('split'),here:dcL('menu.splitHere')})},
  {k:['langue','language','idioma','sprache','lingua','=lang','anglais','english','francais','french','espanol','deutsch','japonais','言語','언어','语言','英語','日本語','영어','中文','英文'],
    a:()=>T('dcai.q.lang',{menu:dcL('ui.menu'),home:dcL('menu.home'),set:dcL('home.settings'),lang:dcL('settings.language')})},
  {k:['raccourci','touche','clavier','shortcut','hotkey','keyboard','atajo','teclado','tastatur','tastenk','kurzbefehl','scorciatoi','tastiera','atalho','ショートカット','キーボード','단축키','키보드','快捷键','键盘'],
    a:()=>T('dcai.q.keys',{list:['play','split','del','undo','save','export'].map(id=>{const a=KEYACTS.find(x=>x.id===id);return a&&keysOf(a).length?fmtCombo(keysOf(a)[0])+' = '+T(a.n):''}).filter(Boolean).join(' · '),menu:dcL('ui.menu'),kb:dcL('kb.title')})},
  {k:['mise a jour','mises a jour','a jour','=maj','update','=version','actualiza','aktualis','aggiorn','versione','atualiza','versao','アップデート','更新','バージョン','업데이트','버전','版本'],
    a:()=>T('dcai.q.update',{v:appVersion()||'?',menu:dcL('ui.menu'),upd:dcL('upd.menu')})},
  {k:['chatgpt','=gpt','openai','claude','gemini','ollama','mistral','ia en ligne','autre ia','vraie ia','ia plus','plus intelligent','online ai','other ai','smarter','ia online','otra ia','andere ki','online ki','altra ia','outra ia','オンライン','他のai','다른 ai','온라인','在线','其他ai','更聪明'],
    a:()=>T('dcai.q.online',{set:dcL('chat.settings')})},
  {k:['internet','hors ligne','offline','en ligne','connexion','donnees','vie privee','confidential','securi','cloud','privacy','private','=data','sin internet','sin conexion','privacidad','datos','ohne internet','datenschutz','daten','senza internet','=dati','sem internet','privacidade','dados','オフライン','インターネット','ネット','プライバシー','データ','오프라인','인터넷','개인정보','데이터','离线','联网','网络','隐私','数据'],
    a:()=>T('dcai.q.privacy')},
  {k:['gratuit','payant','=prix','=payer','=paye','=cout','combien ca coute','abonnement','filigrane','=pub','publicite','=free','price','=cost','=costs','=paid','=pay','watermark','subscription','=ads','gratis','precio','=pagar','marca de agua','kostenlos','preis','kostet','bezahl','wasserzeichen','werbung','gratuito','prezzo','=costa','pagare','filigrana','pubblicita','=preco','=custa','marca d agua','無料','料金','有料','透かし','広告','サブスク','무료','가격','유료','워터마크','광고','免费','价格','收费','水印','广告'],
    fn:'support',a:()=>T('dcai.q.free',{sup:dcL('home.support')})},
  {k:['qui a fait','qui a cree','qui a developpe','createur','developpeur','auteur','bykemi','kemi','who made','who created','creator','developer','author','quien hizo','creador','desarrollador','wer hat','entwickler','ersteller','chi ha fatto','creatore','sviluppatore','quem fez','criador','desenvolvedor','作った','作者','開発者','만든','개발자','제작자','谁做','开发者'],
    a:()=>T('dcai.q.author',{v:appVersion()||'?'})},
  {k:['=don','=dons','donation','donate','=soutenir','soutien','aider dedcut','paypal','support dedcut','support the','donar','donacion','apoyar','spende','spenden','unterstutz','donare','donazione','sostenere','=doar','doacao','apoiar','寄付','응원','후원','기부','捐','赞助'],
    fn:'support',a:()=>T('dcai.q.support',{sup:dcL('home.support')})},
  {k:['commencer','debut','premier pas','par ou','comment ca marche','comment marche','tutoriel','=tuto','apprendre','visite','guide','=start','beginner','tutorial','learn','how does it work','how it works','getting started','empezar','principiante','como funciona','aprender','anfang','anfanger','wie funktioniert','lernen','iniziare','come funziona','imparare','comecar','iniciante','始め','初心者','使い方','チュートリアル','시작','초보','사용법','튜토리얼','开始','新手','怎么用','教程','入门'],
    fn:'tour',a:()=>T('dcai.q.start',{start:T('proj.startText')})},
  {k:['duree','=dure','combien de temps','longueur','combien de clips','how long','duration','length','how many clips','duracion','cuanto dura','=dauer','wie lang','durata','quanto dura','duracao','長さ','何秒','何分','길이','얼마나','时长','多长','多久'],it:'base',
    a:()=>T('dcai.q.dur',{dur:fmt(total()),clips:T('home.clips',{count:clips.length}),w:String(W),h:String(H),durL:dcL('insp.durS'),base:dcL('insp.base')})}
];
/* petites phrases (bonjour, merci, qui es-tu…) : seulement si aucune vraie question n'a été trouvée */
const DCQ_TALK=[
  {k:['qui es tu','t es qui','tes qui','tu es qui','c est qui','who are you','what are you','quien eres','que eres','wer bist du','was bist du','chi sei','quem e voce','quem es','あなたは誰','誰ですか','君は誰','누구','你是谁','你是什么'],a:()=>T('dcai.who')},
  {short:6,k:['ca va','comment vas','comment tu vas','tu vas bien','how are you','how r u','como estas','que tal','wie geht','come stai','come va','como vai','tudo bem','元気','잘 지내','你好吗'],a:()=>T('dcai.howru')},
  {short:6,k:['merci','thank','=thx','=ty','gracias','danke','grazie','obrigad','ありがと','감사','고마','谢谢','多谢','感谢'],a:()=>T('dcai.thanks')},
  {short:6,k:['bonjour','salut','coucou','bonsoir','=hello','=hi','=hey','=yo','hola','buenas','hallo','servus','=moin','ciao','salve','=ola','=oi','こんにちは','こんばんは','おはよう','やあ','안녕','你好','您好','嗨'],ex:1,a:()=>T('dcai.greet')},
  {k:['aide','help','ayuda','hilfe','aiuto','ajuda','ヘルプ','도움','帮助','tu sais faire','tu peux faire quoi','que sais tu','que peux tu','que fais tu','what can you do','what do you do','que puedes hacer','was kannst du','cosa sai fare','cosa puoi fare','o que voce faz','o que voce pode','何ができ','뭘 할 수','뭐 할 수','무엇을 할','你能做什么','你会什么','你可以做什么','question','repondre','answer','pregunta','frage','domand','pergunta','質問','질문','问题'],help:1}
];
const dcExChips=()=>['dcai.qex1','dcai.qex2','dcai.qex3'].map(k=>({label:T(k),send:T(k)}));
const dcaiHelp=()=>({text:T('dcai.help'),chips:dcExChips()});
function dcaiAnswer(q,qT,talk){
  let best=null,bs=0;
  for(const t of DCQ){const s=dcScore(t.t?qT:q,t.k);if(s>bs+1e-9){bs=s;best=t}}
  if(!best&&talk)for(const t of DCQ_TALK){if(t.short&&q.toks.length>t.short)continue;if(dcScore(q,t.k)>0){best=t;break}}
  if(!best)return null;
  if(best.help)return dcaiHelp();
  const chips=[],act=typeof best.act==='function'?best.act(q):best.act;
  if(act)chips.push({label:T('dcai.do'),act});
  if(best.fn==='tour')chips.push({label:dcL('menu.tour'),fn:'tour'});
  if(best.fn==='support')chips.push({label:'♥ '+dcL('home.support'),fn:'support'});
  if(best.ex)chips.push({label:T('chat.ex4'),send:T('chat.ex4')},{label:T('dcai.qex1'),send:T('dcai.qex1')});
  return{text:best.a(),chips,tab:best.tab,it:best.it};
}
/* montre l'endroit dont parle la réponse : onglet de gauche (qui clignote) et onglet de droite si un clip est sélectionné */
function dcaiShow(r){
  if(r.tab&&typeof showTab==='function'){showTab(r.tab);const b=$('#rail [data-tab="'+r.tab+'"]');if(b){b.classList.remove('dcflash');void b.offsetWidth;b.classList.add('dcflash');setTimeout(()=>b.classList.remove('dcflash'),2200)}}
  const c=r.it&&selClip();if(c&&tabsFor(c).includes(r.it)){insTab[kindOf(c)]=r.it;renderInspector()}
}
async function dcaiRun(text,force){
  const raw=String(text),q=dcQ(raw);
  // « sous-titre » ne doit pas être compris comme « titre »
  const qT=dcQ(q.n.replace(/sous[- ]?titres?|subtitles?|subtitulos?|untertitel|sottotitoli?|legendas?/g,' '));
  if(!force&&dcIsQ(q,raw)&&!dcIsReq(q,raw))return dcaiAnswer(q,qT,q.toks.length<=8||q.n.length<=24)||{text:T('dcai.q.unknown',{set:dcL('chat.settings')}),chips:dcExChips()};
  const want=k=>force?k===force:dcHas(k==='title'?qT:q,DCAI[k]);
  const auto=want('auto'),notes=[];let did=0;
  const act=async(label,fn)=>{await fn();commit();refresh();chatActs++;did++;chatAdd('act',label)};
  const tool=async(name,args)=>{const r=await chatTool(name,args);if(!MCP_READ.has(name))did++;return r};
  const media0=c=>c.mid&&mById(c.mid);
  const vids=()=>clips.filter(c=>isVid(c)&&media0(c)&&media0(c).type!=='image').sort((a,b)=>a.start-b.start);
  const TD=()=>Math.max(1,total());
  if(want('undo')&&!auto){undo();chatAdd('act',T('dcai.a.undo'));return T('dcai.done')}
  if(want('vert'))await act(T('proj.toVertical'),()=>toFormat(1080,1920));
  else if(want('horiz'))await act(T('proj.toHorizontal'),()=>toFormat(1920,1080));
  if(want('silence')||auto){
    const list=clips.filter(c=>media0(c)&&media0(c).type!=='image'&&!c.gen&&!trk(c).lock&&(isVid(c)||isAud(c)));
    if(!list.length)notes.push(T('dcai.noAudio'));
    for(const c of list.slice()){if(!clips.includes(c))continue;try{await tool('remove_silences',{id:c.id,sensitivity:'normal'})}catch(e){}}
  }
  if(want('trans')||auto){const v=vids();if(v.length<2&&!auto)notes.push(T('dcai.noVideo'));for(let i=1;i<v.length;i++)await tool('set_transition',{id:v[i].id,in:'fade',duration:.5})}
  if(want('title')||auto){
    const m=raw.match(/["«“„「『](.+?)["»”“」』]/)||raw.match(/[:：]\s*(.+)$/);
    let t=m?m[1].trim():'';if(!t)t=projName&&projName!=='Mon projet'&&projName!==T('project.untitled')?projName:T('dcai.defTitle');
    await tool('add_text',{text:t.slice(0,80),style:'viral',start:0,duration:Math.min(4,TD()),y:40,size:9});
  }
  if(want('captions')||auto){
    const C=window.dedcutCaptions;
    if(!C||!(await C.ready().catch(()=>false))){if(!auto||want('captions'))notes.push(T('dcai.capModel'))}
    else await act(T('dcai.a.captions'),()=>C.run());
  }
  if(want('viz')){
    const st=dcHas(q,['cercle','circle','circulo','círculo','kreis','cerchio','円','원형','圆'])?'vcircle':dcHas(q,['onde','ondes','wave','onda','welle','波形','파형'])?'vwave':dcHas(q,['vumetre','vumètre','vu-metre','vu meter','volume','=vu'])?'vvu':dcHas(q,['courbe','curve','=line','ligne','curva','kurve','曲線','곡선','曲线'])?'vline':'vbars';
    const P={vbars:{y:84,w:70,h:16},vwave:{y:84,w:70,h:14},vcircle:{y:50,w:44,h:50},vline:{y:84,w:80,h:18},vvu:{y:90,w:36,h:7}}[st];
    await tool('add_element',{kind:'viz',style:st,start:0,duration:TD(),props:P});
  }
  if(want('music')){
    const m=media.find(x=>x.type==='audio'&&!clips.some(c=>c.mid===x.id));
    if(!m&&typeof mlAddAuto==='function'){const r=await mlAddAuto(mlMood(q)||'vlog');if(r)await act(T('dcai.a.libMusic',{title:r.title}),()=>{})}
    else if(!m)notes.push(T('dcai.noMusic'));
    else{const r=await tool('add_clip',{media_id:m.id,start:0});const c=clips.find(x=>x.id===r.id);if(c){if(vids().some(v=>(v.p.vol??100)>0))c.p.vol=35;await act(T('dcai.a.music'),()=>loopMusic(c))}}
  }
  if(want('fade')||auto)await act(T('dcai.a.fade'),()=>{fadeProject('in');fadeProject('out')});
  if(want('pbar')||auto)await tool('add_element',{kind:'pbar',style:'pill'});
  if(want('sub'))await tool('add_element',{kind:'sub',start:Math.max(0,TD()-5),duration:Math.min(4,TD())});
  if(want('icons')){await tool('add_element',{kind:'icon',style:'i_heart',start:0,duration:TD(),props:{look:'sticker',aloop:'beat',size:11,x:12,y:20}});await tool('add_element',{kind:'icon',style:'i_fire',start:0,duration:TD(),props:{look:'glow',aloop:'float',size:10,x:88,y:20}})}
  if(want('cine'))await tool('add_element',{kind:'letterbox',start:0,duration:TD()});
  if(want('export')){openExport();notes.push(T('dcai.exportOpen'))}
  if(did||notes.length)return [did?T('dcai.done'):'',...notes].filter(Boolean).join('\n\n');
  // aucune action reconnue : peut-être une question sans « ? » (« fond vert », « merci »…)
  return dcaiAnswer(q,qT,true)||dcaiHelp();
}
async function dcaiSend(text,force,echoed){
  if(!echoed)chatAdd('me',text);const inp=$('#chatIn');if(inp&&!force)inp.value='';
  chatBusy=true;chatActs=0;chatBase=JSON.stringify({c:clips,t:tracks});renderChatBar();renderChatLog();
  try{
    await new Promise(r=>setTimeout(r,250));
    const r=await dcaiRun(text,force),rep=typeof r==='string'?{text:r}:r;
    chatAppend(rep.text||T('dcai.done'));
    if(rep.chips&&rep.chips.length)chatLog[chatLog.length-1].chips=rep.chips;
    if(rep.tab||rep.it)dcaiShow(rep);
  }
  catch(e){chatAdd('err',T('chat.err.other',{error:String((e&&e.message)||e).slice(0,300)}))}
  finally{chatBusy=false;renderChatBar();renderChatLog()}
}
/* boutons sous une réponse : « Le faire pour moi », exemples de questions, visite guidée, soutenir */
function dcaiChip(c){
  if(c.fn==='tour'){const o=$('#chatp');if(o)o.remove();if(window.dedcutTour)dedcutTour.start('main');return}
  if(c.fn==='support'){window.dispatchEvent(new Event('dedcut-support'));return}
  if(c.act)dcaiSend(c.label,c.act);else if(c.send)chatSend(c.send);
}

/* ---------- cerveau de DedCut IA : une vraie IA de langage qui tourne sur ce PC (src-tauri/src/brain.rs) ----------
   Téléchargée une fois (llama.cpp + Qwen3.5-4B, 2,8 Go). Elle comprend toutes les langues, pose des questions (ask_user)
   et monte la vidéo avec les mêmes outils que Claude ou ChatGPT. Sans cerveau (ou en mode simple) : les mots-clés ci-dessus. */
let brainSt=null,brainDl=null,brainHw=null,brainLang=null;
const brainOn=()=>!!(window.dedcutBrain&&brainSt&&brainSt.supported!==false&&brainSt.ready&&chatCfg.brain!=='off');
const brainGb=n=>window.i18n&&window.i18n.fmt?window.i18n.fmt.bytes(n||0):Math.round((n||0)/1048576)+' MB';
async function brainRefresh(){
  const B=window.dedcutBrain;if(!B)return;
  try{brainSt=await B.status()}catch(e){brainSt=null}
  brainWarm();
  if($('#chatp')&&!chatSet){renderBrainBar();const f=$('#chatp .cfoot');if(f)f.textContent=chatFoot();if(!chatLog.length)renderChatLog()}
}
function renderBrainBar(){
  const el=$('#brainBar');if(!el)return;
  const B=window.dedcutBrain;
  if(!B||chatCfg.provider!=='dedcut'||!brainSt){el.hidden=true;el.innerHTML='';return}
  el.hidden=false;
  const beta='<div class="cbeta">'+T('dcai.beta')+'</div>';
  if(brainSt.supported===false){el.innerHTML=beta;return} // Mac, Android : pas de cerveau, DedCut IA en mode simple
  if(brainSt.ready&&!brainDl&&chatCfg.brain!=='off'){el.innerHTML=beta;return}
  if(brainDl){const p=brainDl,pct=p.check?100:p.total?Math.round(100*p.done/p.total):0;
    el.innerHTML=`<div class="cbrain"><b>${T('brain.title')}</b><div class="cbar"><i style="width:${pct}%"></i></div>
      <span class="hint">${p.check?T('brain.check'):T('brain.dl',{part:p.idx+1,n:p.n,done:brainGb(p.done),size:brainGb(p.total)})}</span><button class="sm" data-bcancel>${T('brain.cancel')}</button></div>`;return}
  if(brainSt.ready){el.innerHTML=`<div class="cbrain off"><span class="hint">${T('brain.offLine')}</span><button class="sm" data-bon>${T('brain.turnOn')}</button></div>`+beta;return}
  const low=brainHw&&brainHw.known&&brainHw.ram_gb<7.5;
  el.innerHTML=`<div class="cbrain"><b>${T('brain.title')} <span class="cpill">${T('dcai.betaTag')}</span></b><span class="hint">${T('brain.pitch',{size:brainGb(brainSt.missing||brainSt.total)})}</span>
    ${low?`<span class="hint warn">${T('brain.noRam',{ram:brainHw.ram_gb})}</span>`:`<button class="sm pri" data-bget ${brainSt.busy?'disabled':''}>${T('brain.get',{size:brainGb(brainSt.missing||brainSt.total)})}</button>`}</div>`;
}
async function brainGet(){
  const B=window.dedcutBrain;if(!B||brainDl)return;
  try{brainHw=brainHw||await B.hardware()}catch(e){}
  if(brainHw&&brainHw.known&&brainHw.ram_gb<7.5){renderBrainBar();return}
  brainDl={done:0,total:1,idx:0,n:2,check:false};renderBrainBar();
  try{
    await B.download();brainDl=null;chatCfg.brain='on';chatSaveCfg();window.dedcutChat&&window.dedcutChat.reset();
    await brainRefresh();chatAdd('note',T('brain.ready'));if($('#chatp')&&!chatSet)openChat();
  }catch(e){
    brainDl=null;const m=String((e&&e.message)||e);
    if(!/annul/i.test(m))chatAdd('err',m==='busy'?T('brain.busy'):T('brain.err',{error:m.slice(0,200)}));
    await brainRefresh();
  }
}
if(window.dedcutAI)window.dedcutAI.onProgress(p=>{if(!brainDl)return;brainDl={...p,check:p.id.endsWith(':check')};renderBrainBar()});
async function brainRemove(){
  const B=window.dedcutBrain;if(!B||!brainSt)return;
  if(!(await askYes(T('brain.removeQ',{size:brainGb(brainSt.total)}))))return;
  try{await B.remove();toast(T('brain.removed'))}catch(e){toast(String((e&&e.message)||e))}
  window.dedcutChat&&window.dedcutChat.reset();await brainRefresh();if($('#chatp'))openChat();
}
/* langue du message (écriture, puis petits mots courants) : le cerveau reçoit « (Reply in …) » pour répondre dans cette langue,
   même si DedCut est réglé dans une autre langue. Rien n'est ajouté quand c'est incertain (réponse courte, mot isolé). */
const DCLW={English:['the','and','how','my','is','do','you','what','can','to','in','it','of','with','for','this','please','i','add','put','make','cut','why','want','where'],
  French:['le','la','les','des','et','comment','mon','ma','mes','est','je','tu','une','pour','avec','que','du','sur','fais','moi','ajoute','ajouter','mets','mettre','faire','coupe','couper','pourquoi','veux','où'],
  Spanish:['el','los','las','y','como','cómo','mi','mis','es','una','para','con','que','por','hazme','puedes','quiero','del','añade','añadir','pon','poner','haz','hacer','corta','puedo','dónde','añado','pongo','hago'],
  German:['der','die','das','und','wie','mein','meine','ist','ich','du','ein','eine','mit','für','zu','nicht','mach','mache','machen','kann','füge','hinzu','schneide','warum','will','wo'],
  Italian:['il','lo','gli','di','e','come','mio','mia','è','una','per','con','che','fammi','puoi','voglio','del','aggiungi','aggiungo','aggiungere','metti','metto','fai','faccio','taglia','posso','perché','dove'],
  Portuguese:['o','os','as','de','e','como','meu','minha','é','um','uma','para','com','que','do','da','você','quero','adicione','adiciono','coloque','coloco','faça','faço','corte','posso','deixo','onde']};
function dcLang(t){
  const x=String(t);
  if(/[\u3040-\u30ff]/.test(x))return 'Japanese';if(/[\uac00-\ud7af]/.test(x))return 'Korean';if(/[\u4e00-\u9fff]/.test(x))return 'Chinese';if(/[\u00bf\u00a1]/.test(x))return 'Spanish';
  const w=String(t).toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);if(w.length<3)return null;
  let best=null,bs=0,second=0;
  for(const[l,list]of Object.entries(DCLW)){const n=w.filter(x=>list.includes(x)).length;if(n>bs){second=bs;bs=n;best=l}else if(n>second)second=n}
  return bs>=2&&bs>second?best:null;
}
/* réveil + préchauffage dès que la discussion s'ouvre (le moteur s'endort seul après 10 min sans demande) */
let brainLast=0;
function brainWarm(){
  const B=window.dedcutBrain,C=window.dedcutChat;
  if(!brainOn()||!$('#chatp')||chatBusy||!C||!C.fresh()||Date.now()-brainLast<9*60e3)return;
  brainLast=Date.now();
  B.start(chatCfg.brainGpu!==false).then(conn=>{if(brainSt)brainSt.running=true;return C.warm({url:conn.url,key:conn.key,model:'qwen3.5-4b',system:chatSystem(true)})}).catch(()=>{brainLast=0});
}
async function brainSend(text){
  const C=window.dedcutChat;
  brainLast=Date.now();brainLang=dcLang(text)||(C&&C.fresh()?null:brainLang);
  const B=window.dedcutBrain;
  chatAdd('me',text);const inp=$('#chatIn');if(inp)inp.value='';
  chatBusy=true;chatActs=0;chatBase=JSON.stringify({c:clips,t:tracks});
  chatWait=brainSt&&brainSt.running?null:T('brain.starting');renderChatBar();renderChatLog();
  let conn;
  try{conn=await B.start(chatCfg.brainGpu!==false)}
  catch(e){
    // le cerveau ne démarre pas : réponse en mode simple
    chatBusy=false;chatWait=null;chatAdd('note',T('brain.startErr',{error:String((e&&e.message)||e).slice(0,160)}));
    return dcaiSend(text,null,true);
  }
  if(brainSt)brainSt.running=true;chatWait=null;renderChatLog();
  try{
    const r=await C.send({provider:'local',model:'qwen3.5-4b',url:conn.url,key:conn.key,system:chatSystem(true),text:spaceCtx()+(lg=>lg?text+'\n\n(Reply in '+lg+'.)':text)(dcLang(text)),onText:chatAppend,onTool:(n,a)=>chatTool(n,n==='get_capabilities'?{...a,compact:true}:a),maxSteps:40});
    if(r&&r.stopped)chatAdd('note',T('chat.stopped'));
  }catch(e){
    const code=e&&e.code||'other';
    chatAdd('err',code==='offline'?T('brain.crash'):code==='other'||code==='bad'?T('chat.err.other',{error:String(e&&e.message||e).slice(0,300)}):T('chat.err.'+code));
  }finally{chatBusy=false;chatWait=null;renderChatBar();renderChatLog()}
}
// le cerveau s'arrête quand la Vidéo IA a besoin de la mémoire vidéo : on se souvient qu'il faudra le réveiller
window.addEventListener('focus',()=>{if($('#chatp')&&chatCfg.provider==='dedcut')brainRefresh()});

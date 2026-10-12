/* ---------- inspecteur ---------- */
const insTab={};
const TABS={base:'insp.base',texte:'common.text',style:'insp.style',anim:'insp.animation',col:'insp.colors',fx:'common.effects',mask:'insp.mask',chroma:'insp.keying',speed:'insp.speed',audio:'common.audio'};
function kindOf(c){return isAud(c)?'audio':isText(c)?'text':isOvr(c)?(c.gen?'gen':'over'):c.gen?'bg':'main'}
function tabsFor(c){
  const m=c.mid&&mById(c.mid),timed=m&&m.type!=='image';
  return{audio:['audio','speed'],text:['texte','style','anim','base'],gen:['base'],over:['base','col','mask','chroma',...(timed?['speed','audio']:[])],bg:['base','col','fx','anim'],main:['base','col','fx','anim','mask','chroma',...(timed?['speed','audio']:[])]}[kindOf(c)];
}
const BLEND=[['source-over','common.normal'],['screen','blend.screen'],['multiply','blend.multiply'],['overlay','blend.overlay'],['soft-light','blend.softLight'],['lighter','blend.add'],['lighten','blend.lighten'],['darken','blend.darken'],['difference','blend.difference'],['color-dodge','blend.dodge']];
/* filtres : réglages propres à DedCut (aucun n'est repris d'un autre logiciel).
   br/ct/sa/hue/sep/gs/inv = filtres CSS ; t1/t2 = teintes (couleur, mode de fusion, opacité) ; fade = noirs délavés ;
   vig = vignette ; grain = grain de pellicule ; leak = halo de lumière (couleur leakc) */
const LOOK_CATS={basic:'lookcat.basic',trend:'lookcat.trend',aesth:'lookcat.aesth',film:'lookcat.film',season:'lookcat.season',halloween:'lookcat.halloween',travel:'lookcat.travel',colorpop:'lookcat.colorpop',dark:'lookcat.dark',softc:'lookcat.softc',mono:'lookcat.mono',cine:'lookcat.cine',retro:'lookcat.retro',bw:'lookcat.bw',mood:'lookcat.mood',creative:'lookcat.creative',portrait:'lookcat.portrait',nature:'lookcat.nature',street:'lookcat.street'};
const SL='soft-light',OV='overlay',MU='multiply',SC='screen',CO='color';
const LOOKS={
  none:{cat:'basic',n:'filter.original',c:{}},
  vif:{cat:'basic',n:'filter.vivid',c:{ct:110,sa:155}},
  clair:{cat:'basic',n:'look.bright',c:{br:112,ct:104,sa:110,fade:6}},
  net:{cat:'basic',n:'look.crisp',c:{ct:122,sa:112}},
  doux:{cat:'basic',n:'look.soft',c:{br:106,ct:88,sa:92,fade:14}},
  naturel:{cat:'basic',n:'look.natural',c:{br:103,ct:106,sa:108,t1c:'#ffd9a0',t1m:SL,t1o:12}},
  chaud:{cat:'basic',n:'filter.warm',c:{br:105,ct:105,sa:120,hue:-12,sep:15}},
  froid:{cat:'basic',n:'filter.cool',c:{ct:105,sa:105,hue:18}},
  pastel:{cat:'basic',n:'filter.pastel',c:{br:112,ct:85,sa:75,fade:8}},
  teal:{cat:'cine',n:'filter.blockbuster',c:{ct:118,sa:125,hue:-8,t1c:'#0f6d7a',t1m:SL,t1o:35,t2c:'#ff9a3c',t2m:SL,t2o:22,vig:25}},
  cinema:{cat:'cine',n:'filter.cinema',c:{br:95,ct:125,sa:85,vig:30}},
  polar:{cat:'cine',n:'look.noir',c:{br:88,ct:135,sa:55,t1c:'#2a4a3a',t1m:SL,t1o:30,vig:45,grain:12}},
  western:{cat:'cine',n:'look.western',c:{br:102,ct:118,sa:80,sep:35,t1c:'#e0a050',t1m:OV,t1o:22,vig:35,grain:10}},
  scifi:{cat:'cine',n:'look.scifi',c:{ct:120,sa:80,t1c:'#1fd1c1',t1m:SL,t1o:40,t2c:'#0a1a40',t2m:MU,t2o:20,vig:30}},
  drama:{cat:'cine',n:'filter.drama',c:{br:90,ct:145,sa:70,vig:30}},
  thriller:{cat:'cine',n:'look.suspense',c:{br:85,ct:130,sa:60,t1c:'#3a5a8a',t1m:SL,t1o:35,vig:50}},
  epique:{cat:'cine',n:'look.epic',c:{br:96,ct:128,sa:110,t1c:'#ffb070',t1m:SL,t1o:25,vig:40}},
  film:{cat:'cine',n:'filter.film',c:{br:96,ct:112,sa:90,sep:20,grain:18,fade:8}},
  vintage:{cat:'retro',n:'filter.vintage',c:{ct:90,sa:80,sep:55,fade:12,vig:25,grain:10}},
  sepia:{cat:'retro',n:'common.sepia',c:{sep:90,ct:105,vig:20}},
  delave:{cat:'retro',n:'filter.faded',c:{br:110,ct:85,sa:60,fade:18}},
  seventies:{cat:'retro',n:'look.seventies',c:{br:104,ct:95,sa:85,sep:30,t1c:'#ff8a3d',t1m:SL,t1o:30,fade:15,grain:14}},
  eighties:{cat:'retro',n:'look.eighties',c:{ct:115,sa:140,t1c:'#ff2bd6',t1m:SL,t1o:25,t2c:'#2b6bff',t2m:SC,t2o:10,grain:8}},
  vhs:{cat:'retro',n:'look.vhs',c:{br:105,ct:90,sa:120,hue:-6,fade:12,grain:28,t1c:'#3aff9a',t1m:SL,t1o:10}},
  instant:{cat:'retro',n:'look.instant',c:{br:108,ct:92,sa:85,t1c:'#ffe7b0',t1m:SL,t1o:30,fade:20,vig:30}},
  oldfilm:{cat:'retro',n:'look.oldfilm',c:{gs:100,sep:40,ct:120,fade:10,grain:35,vig:55}},
  memory:{cat:'retro',n:'look.memory',c:{br:104,ct:90,sa:80,t1c:'#f0b8a0',t1m:SL,t1o:25,leak:30,leakc:'#ff9050',fade:10}},
  nb:{cat:'bw',n:'filter.bw',c:{gs:100}},
  nbfort:{cat:'bw',n:'filter.bwContrast',c:{gs:100,ct:150,br:95}},
  nbsoft:{cat:'bw',n:'look.bwSoft',c:{gs:100,ct:85,br:108,fade:12}},
  ink:{cat:'bw',n:'look.ink',c:{gs:100,ct:190,br:90}},
  silver:{cat:'bw',n:'look.silver',c:{gs:100,ct:118,grain:30,vig:40}},
  selenium:{cat:'bw',n:'look.selenium',c:{gs:100,ct:110,t1c:'#6a5a8a',t1m:CO,t1o:25}},
  steel:{cat:'bw',n:'look.steel',c:{gs:100,ct:115,t1c:'#3a6a9a',t1m:CO,t1o:45}},
  chiaro:{cat:'bw',n:'look.chiaroscuro',c:{gs:100,ct:165,br:85,vig:60}},
  sunset:{cat:'mood',n:'look.sunset',c:{br:104,ct:110,sa:125,t1c:'#ff6a3d',t1m:SL,t1o:40,t2c:'#7a2a8a',t2m:SL,t2o:15,leak:25,leakc:'#ffb060'}},
  dawn:{cat:'mood',n:'look.dawn',c:{br:108,ct:95,sa:105,t1c:'#ffb0c8',t1m:SL,t1o:35,fade:8}},
  golden:{cat:'mood',n:'look.golden',c:{br:106,ct:108,sa:118,t1c:'#ffb347',t1m:OV,t1o:30,leak:20,leakc:'#ffd080'}},
  ete:{cat:'mood',n:'filter.summer',c:{br:108,sa:135,hue:-18,sep:10}},
  nuit:{cat:'mood',n:'filter.night',c:{br:82,ct:118,sa:80,hue:12,t1c:'#1a3a8a',t1m:SL,t1o:35,vig:35}},
  mist:{cat:'mood',n:'look.mist',c:{br:110,ct:78,sa:80,fade:25,t1c:'#dfe8f0',t1m:SC,t1o:12}},
  givre:{cat:'mood',n:'filter.frost',c:{br:108,ct:95,sa:60,hue:25,t1c:'#bfe6ff',t1m:SL,t1o:25}},
  storm:{cat:'mood',n:'look.storm',c:{br:88,ct:125,sa:65,t1c:'#3a4a5a',t1m:MU,t1o:25,vig:45}},
  autumn:{cat:'mood',n:'look.autumn',c:{br:102,ct:110,sa:120,hue:-15,t1c:'#d06a20',t1m:SL,t1o:30}},
  spring:{cat:'mood',n:'look.spring',c:{br:108,sa:125,hue:6,t1c:'#b8ffb0',t1m:SL,t1o:18}},
  neon:{cat:'creative',n:'common.neon',c:{sa:200,ct:120,hue:25,t1c:'#ff00c8',t1m:SL,t1o:20}},
  cyber:{cat:'creative',n:'look.cyber',c:{ct:125,sa:150,t1c:'#ff2bd6',t1m:SL,t1o:35,t2c:'#00e5ff',t2m:SL,t2o:30,vig:30}},
  candy:{cat:'creative',n:'look.candy',c:{br:110,ct:92,sa:140,t1c:'#ff9ad5',t1m:SL,t1o:30}},
  vapor:{cat:'creative',n:'look.vapor',c:{ct:105,sa:130,hue:-30,t1c:'#ff71ce',t1m:SL,t1o:30,t2c:'#01cdfe',t2m:SC,t2o:12}},
  duoviolet:{cat:'creative',n:'look.duoPurple',c:{gs:100,ct:115,t1c:'#ffb347',t1m:MU,t1o:100,t2c:'#3b0a6b',t2m:SC,t2o:100}},
  duoblue:{cat:'creative',n:'look.duoBlue',c:{gs:100,ct:115,t1c:'#ff7eb6',t1m:MU,t1o:100,t2c:'#1a2a80',t2m:SC,t2o:100}},
  duogreen:{cat:'creative',n:'look.duoGreen',c:{gs:100,ct:115,t1c:'#e8ff6a',t1m:MU,t1o:100,t2c:'#0a4a3a',t2m:SC,t2o:100}},
  pop:{cat:'creative',n:'look.pop',c:{br:105,ct:160,sa:220}},
  redmono:{cat:'creative',n:'look.redMono',c:{gs:100,ct:130,t1c:'#ff2a2a',t1m:MU,t1o:100}},
  greencode:{cat:'creative',n:'look.greenCode',c:{gs:100,ct:130,t1c:'#20ff60',t1m:MU,t1o:100,vig:40,grain:10}},
  infrared:{cat:'creative',n:'look.infrared',c:{inv:100,hue:180,sa:250,ct:120}},
  negative:{cat:'creative',n:'look.negative',c:{inv:100}},
  skin:{cat:'portrait',n:'look.softSkin',c:{br:106,ct:92,sa:96,t1c:'#ffd0b8',t1m:SL,t1o:25,fade:6}},
  peach:{cat:'portrait',n:'look.peach',c:{br:106,ct:98,sa:108,t1c:'#ffb38a',t1m:SL,t1o:30}},
  studio:{cat:'portrait',n:'look.studio',c:{br:104,ct:115,vig:20}},
  glow:{cat:'portrait',n:'look.radiant',c:{br:110,ct:105,sa:110,t1c:'#ffffff',t1m:SL,t1o:20,leak:12,leakc:'#ffe0c0'}},
  tan:{cat:'portrait',n:'look.tan',c:{ct:110,sa:115,hue:-6,t1c:'#c87a3a',t1m:SL,t1o:28}},
  porcelain:{cat:'portrait',n:'look.porcelain',c:{br:110,ct:96,sa:75,t1c:'#e8f0ff',t1m:SL,t1o:22}},
  green:{cat:'nature',n:'look.greenery',c:{ct:108,sa:135,hue:6,t1c:'#3aa040',t1m:SL,t1o:18}},
  ocean:{cat:'nature',n:'look.ocean',c:{ct:110,sa:130,hue:10,t1c:'#00a0d0',t1m:SL,t1o:25}},
  desert:{cat:'nature',n:'look.desert',c:{br:104,ct:112,sa:110,hue:-14,t1c:'#e0a060',t1m:SL,t1o:30}},
  snow:{cat:'nature',n:'look.snow',c:{br:112,ct:105,sa:85,t1c:'#d8ecff',t1m:SL,t1o:30}},
  food:{cat:'nature',n:'look.food',c:{br:106,ct:112,sa:130,t1c:'#ffb070',t1m:SL,t1o:18}},
  tropical:{cat:'nature',n:'look.tropical',c:{br:105,ct:110,sa:150,hue:-4}},
  hdr:{cat:'basic',n:'look.hdr',c:{br:102,ct:132,sa:122,vig:12}},
  matte:{cat:'basic',n:'look.matte',c:{br:104,ct:90,sa:92,fade:22}},
  bleach:{cat:'cine',n:'look.bleach',c:{br:96,ct:142,sa:45,grain:8,vig:20}},
  moonlight:{cat:'cine',n:'look.moonlight',c:{br:86,ct:115,sa:60,t1c:'#3a5aa0',t1m:SL,t1o:45,t2c:'#0a1030',t2m:MU,t2o:18,vig:40}},
  darkgold:{cat:'cine',n:'look.darkGold',c:{br:88,ct:132,sa:90,t1c:'#c08a30',t1m:SL,t1o:35,vig:45}},
  warmfilm:{cat:'retro',n:'look.warmFilm',c:{br:104,ct:106,sa:95,sep:18,t1c:'#ffc070',t1m:SL,t1o:22,fade:10,grain:16}},
  super8:{cat:'retro',n:'look.super8',c:{br:102,ct:96,sa:85,sep:30,fade:14,grain:32,vig:45,leak:15,leakc:'#ff8a40'}},
  newsprint:{cat:'bw',n:'look.newsprint',c:{gs:100,ct:142,br:104,grain:40}},
  rainy:{cat:'mood',n:'look.rainy',c:{br:92,ct:104,sa:70,t1c:'#4a6a8a',t1m:SL,t1o:35,fade:8}},
  cozy:{cat:'mood',n:'look.cozy',c:{br:104,ct:96,sa:105,t1c:'#ff9a50',t1m:SL,t1o:28,leak:18,leakc:'#ffa060',vig:20}},
  synth:{cat:'creative',n:'look.synth',c:{ct:118,sa:145,hue:-20,t1c:'#b026ff',t1m:SL,t1o:35,t2c:'#ff3d81',t2m:SC,t2o:14,vig:30}},
  acid:{cat:'creative',n:'look.acid',c:{ct:120,sa:185,hue:40,t1c:'#b0ff20',t1m:SL,t1o:20}},
  pinkdream:{cat:'creative',n:'look.pinkDream',c:{br:110,ct:90,sa:115,t1c:'#ff9ad5',t1m:SC,t1o:18,fade:14,leak:15,leakc:'#ffc0e0'}},
  glamour:{cat:'portrait',n:'look.glamour',c:{br:108,ct:110,sa:105,t1c:'#ffd0e0',t1m:SL,t1o:22,leak:10,leakc:'#ffe0f0',vig:25}},
  forest:{cat:'nature',n:'look.forest',c:{br:96,ct:114,sa:120,hue:8,t1c:'#1f6a3a',t1m:SL,t1o:30,vig:25}},
  sky:{cat:'nature',n:'look.sky',c:{br:106,ct:108,sa:125,hue:6,t1c:'#5ab0ff',t1m:SL,t1o:20}},
  urban:{cat:'street',n:'look.urban',c:{ct:125,sa:70,t1c:'#506070',t1m:SL,t1o:30,vig:30}},
  gritty:{cat:'street',n:'look.gritty',c:{br:94,ct:150,sa:60,grain:22,vig:40}},
  nightcity:{cat:'street',n:'look.nightCity',c:{br:92,ct:122,sa:130,t1c:'#00c8d0',t1m:SL,t1o:30,t2c:'#ff2b9a',t2m:SL,t2o:22,vig:35}},
  concrete:{cat:'street',n:'look.concrete',c:{ct:116,sa:30,t1c:'#8090a0',t1m:SL,t1o:25,fade:8}},
  // ---- v4.36 : 30 filtres tendance / esthétiques ----
  y2k:{cat:'trend',n:'look.y2k',c:{br:106,ct:112,sa:125,t1c:'#7dd3fc',t1m:SL,t1o:30,t2c:'#f0abfc',t2m:SC,t2o:12,leak:12,leakc:'#e0f2fe'}},
  cleanlook:{cat:'trend',n:'look.cleanlook',c:{br:108,ct:96,sa:92,fade:6,t1c:'#fff1e6',t1m:SL,t1o:18}},
  latte:{cat:'trend',n:'look.latte',c:{br:104,ct:94,sa:78,sep:18,fade:10,t1c:'#c8a27a',t1m:SL,t1o:28}},
  matcha:{cat:'trend',n:'look.matcha',c:{br:104,ct:98,sa:85,hue:8,t1c:'#a3c585',t1m:SL,t1o:32,fade:8}},
  lofi:{cat:'trend',n:'look.lofi',c:{br:98,ct:88,sa:80,fade:16,grain:18,t1c:'#8b7cf6',t1m:SL,t1o:18,vig:25}},
  disposable:{cat:'trend',n:'look.disposable',c:{br:108,ct:118,sa:118,hue:-6,t1c:'#ffd27a',t1m:SL,t1o:20,grain:26,vig:30,leak:18,leakc:'#ff9a5a'}},
  camcorder:{cat:'trend',n:'look.camcorder',c:{br:104,ct:90,sa:120,hue:-4,fade:10,grain:16,t1c:'#4dd0e1',t1m:SL,t1o:16}},
  miami:{cat:'trend',n:'look.miami',c:{br:104,ct:115,sa:140,t1c:'#ff4fa3',t1m:SL,t1o:30,t2c:'#22d3ee',t2m:SL,t2o:26}},
  tokyo:{cat:'trend',n:'look.tokyo',c:{br:94,ct:118,sa:120,hue:10,t1c:'#3b82f6',t1m:SL,t1o:30,t2c:'#f43f5e',t2m:SC,t2o:10,vig:35}},
  aurora:{cat:'trend',n:'look.aurora',c:{ct:112,sa:135,t1c:'#22c55e',t1m:SL,t1o:26,t2c:'#a855f7',t2m:SL,t2o:24,vig:20}},
  bluehour:{cat:'trend',n:'look.bluehour',c:{br:96,ct:108,sa:110,hue:12,t1c:'#1e40af',t1m:SL,t1o:34,leak:8,leakc:'#93c5fd'}},
  neonnoir:{cat:'trend',n:'look.neonnoir',c:{br:88,ct:135,sa:120,t1c:'#7c3aed',t1m:SL,t1o:30,t2c:'#06b6d4',t2m:SC,t2o:10,vig:50}},
  dreamhaze:{cat:'trend',n:'look.dreamhaze',c:{br:110,ct:84,sa:96,fade:18,leak:22,leakc:'#fbcfe8',t1c:'#e9d5ff',t1m:SC,t1o:12}},
  faded90:{cat:'trend',n:'look.faded90',c:{br:102,ct:90,sa:88,hue:-5,fade:20,grain:12,t1c:'#facc15',t1m:SL,t1o:14}},
  crimson:{cat:'trend',n:'look.crimson',c:{br:96,ct:125,sa:80,t1c:'#dc2626',t1m:SL,t1o:30,vig:40}},
  lavender:{cat:'aesth',n:'look.lavender',c:{br:106,ct:94,sa:90,t1c:'#c4b5fd',t1m:SL,t1o:34,fade:10}},
  cherry:{cat:'aesth',n:'look.cherry',c:{br:104,ct:108,sa:118,t1c:'#fb7185',t1m:SL,t1o:28}},
  honey:{cat:'aesth',n:'look.honey',c:{br:106,ct:104,sa:115,hue:-8,t1c:'#f59e0b',t1m:SL,t1o:30,leak:12,leakc:'#fde68a'}},
  cinnamon:{cat:'aesth',n:'look.cinnamon',c:{br:100,ct:110,sa:95,sep:22,t1c:'#b45309',t1m:SL,t1o:26,vig:20}},
  menthe:{cat:'aesth',n:'look.menthe',c:{br:106,ct:98,sa:92,hue:14,t1c:'#5eead4',t1m:SL,t1o:26,fade:8}},
  arctic:{cat:'aesth',n:'look.arctic',c:{br:110,ct:104,sa:70,hue:16,t1c:'#bae6fd',t1m:SC,t1o:14,fade:6}},
  terracotta:{cat:'aesth',n:'look.terracotta',c:{br:102,ct:108,sa:108,hue:-10,t1c:'#c2410c',t1m:SL,t1o:30}},
  blush:{cat:'aesth',n:'look.blush',c:{br:108,ct:96,sa:100,t1c:'#fbcfe8',t1m:SL,t1o:34,leak:10,leakc:'#ffe4e6'}},
  moody:{cat:'aesth',n:'look.moody',c:{br:90,ct:118,sa:75,t1c:'#334155',t1m:SL,t1o:30,fade:8,vig:40}},
  academia:{cat:'aesth',n:'look.academia',c:{br:92,ct:112,sa:70,sep:28,t1c:'#78350f',t1m:SL,t1o:24,vig:45,grain:10}},
  cottage:{cat:'aesth',n:'look.cottage',c:{br:106,ct:96,sa:105,hue:-4,t1c:'#bef264',t1m:SL,t1o:18,leak:14,leakc:'#fef3c7',fade:8}},
  emerald:{cat:'aesth',n:'look.emerald',c:{ct:114,sa:120,hue:12,t1c:'#047857',t1m:SL,t1o:30,vig:25}},
  cream:{cat:'aesth',n:'look.cream',c:{br:110,ct:90,sa:85,t1c:'#fef3c7',t1m:SL,t1o:30,fade:12}},
  postcard:{cat:'aesth',n:'look.postcard',c:{br:104,ct:106,sa:125,hue:-6,fade:12,t1c:'#fdba74',t1m:SL,t1o:18,vig:28}},
  sorbet:{cat:'aesth',n:'look.sorbet',c:{br:108,ct:100,sa:130,t1c:'#fda4af',t1m:SL,t1o:20,t2c:'#fde047',t2m:SL,t2o:16}},
  // ---- v4.36 : 70 filtres en plus ----
  fgold:{cat:'film',n:'look.fgold',c:{br:104,ct:108,sa:118,hue:-6,t1c:'#ffcf6b',t1m:SL,t1o:22,grain:14,fade:6}},
  fportra:{cat:'film',n:'look.fportra',c:{br:106,ct:96,sa:92,t1c:'#ffd9c2',t1m:SL,t1o:20,fade:10,grain:10}},
  fslide:{cat:'film',n:'look.fslide',c:{ct:122,sa:135,t1c:'#1e3a8a',t1m:SL,t1o:14,vig:20,grain:8}},
  fcine500:{cat:'film',n:'look.fcine500',c:{br:96,ct:112,sa:96,t1c:'#0e7490',t1m:SL,t1o:22,t2c:'#fb923c',t2m:SL,t2o:14,grain:18,vig:25}},
  fexpired:{cat:'film',n:'look.fexpired',c:{br:108,ct:86,sa:80,hue:-14,t1c:'#e879f9',t1m:SL,t1o:16,fade:18,grain:24,leak:18,leakc:'#fb7185'}},
  fbwfilm:{cat:'film',n:'look.fbwfilm',c:{ct:118,gs:100,grain:28,vig:30}},
  fsepiafilm:{cat:'film',n:'look.fsepiafilm',c:{br:102,ct:104,gs:60,sep:60,grain:20,vig:30,fade:8}},
  fcross:{cat:'film',n:'look.fcross',c:{ct:125,sa:140,hue:12,t1c:'#a3e635',t1m:SL,t1o:20,t2c:'#ec4899',t2m:SL,t2o:12}},
  fbleachy:{cat:'film',n:'look.fbleachy',c:{br:98,ct:135,sa:55,t1c:'#94a3b8',t1m:SL,t1o:18,grain:12}},
  fhalation:{cat:'film',n:'look.fhalation',c:{br:104,ct:106,sa:110,leak:26,leakc:'#ff6b4a',grain:14,vig:20}},
  swinter:{cat:'season',n:'look.swinter',c:{br:106,ct:104,sa:78,hue:16,t1c:'#bfdbfe',t1m:SC,t1o:12}},
  sspring2:{cat:'season',n:'look.sspring2',c:{br:108,ct:98,sa:118,t1c:'#bbf7d0',t1m:SL,t1o:22,t2c:'#fbcfe8',t2m:SL,t2o:14}},
  ssummer:{cat:'season',n:'look.ssummer',c:{br:108,ct:110,sa:130,hue:-6,t1c:'#fde047',t1m:SL,t1o:20}},
  sfall:{cat:'season',n:'look.sfall',c:{br:100,ct:110,sa:115,hue:-14,t1c:'#ea580c',t1m:SL,t1o:26,vig:20}},
  sxmas:{cat:'season',n:'look.sxmas',c:{br:100,ct:112,sa:120,t1c:'#dc2626',t1m:SL,t1o:16,t2c:'#16a34a',t2m:SL,t2o:12,leak:14,leakc:'#fde68a'}},
  shalloween:{cat:'season',n:'look.shalloween',c:{br:92,ct:120,sa:110,t1c:'#f97316',t1m:SL,t1o:24,t2c:'#7c3aed',t2m:SL,t2o:18,vig:45}},
  sbeach:{cat:'season',n:'look.sbeach',c:{br:108,ct:106,sa:125,t1c:'#22d3ee',t1m:SL,t1o:20,t2c:'#fde68a',t2m:SL,t2o:16}},
  sfog:{cat:'season',n:'look.sfog',c:{br:110,ct:80,sa:70,fade:24,t1c:'#e2e8f0',t1m:SC,t1o:16}},
  ssunrise:{cat:'season',n:'look.ssunrise',c:{br:106,ct:104,sa:120,t1c:'#fb923c',t1m:SL,t1o:24,leak:20,leakc:'#fdba74'}},
  sstormy:{cat:'season',n:'look.sstormy',c:{br:88,ct:122,sa:70,t1c:'#1e293b',t1m:SL,t1o:30,vig:40}},
  // Halloween (v4.67.2) : réglages propres à DedCut
  hwnight:{cat:'halloween',n:'look.hwnight',c:{br:78,ct:126,sa:90,hue:12,t1c:'#2e1065',t1m:SL,t1o:58,t2c:'#f97316',t2m:SL,t2o:12,vig:58}},
  hwpumpkin:{cat:'halloween',n:'look.hwpumpkin',c:{br:98,ct:116,sa:130,hue:-10,t1c:'#f97316',t1m:SL,t1o:34,vig:35}},
  hwzombie:{cat:'halloween',n:'look.hwzombie',c:{br:92,ct:118,sa:55,t1c:'#4d7c0f',t1m:SL,t1o:40,t2c:'#1f2937',t2m:MU,t2o:15,vig:40,grain:10}},
  hwvampire:{cat:'halloween',n:'look.hwvampire',c:{br:92,ct:132,sa:42,t1c:'#991b1b',t1m:OV,t1o:30,t2c:'#cbd5e1',t2m:SC,t2o:10,vig:55}},
  hwwitch:{cat:'halloween',n:'look.hwwitch',c:{br:92,ct:118,sa:120,hue:10,t1c:'#7c3aed',t1m:SL,t1o:50,t2c:'#16a34a',t2m:SL,t2o:24,vig:45}},
  hwghost:{cat:'halloween',n:'look.hwghost',c:{br:108,ct:84,sa:35,fade:22,t1c:'#a5f3fc',t1m:SC,t1o:14,vig:30}},
  hwmanor:{cat:'halloween',n:'look.hwmanor',c:{br:88,ct:125,sa:55,sep:30,t1c:'#3f2a14',t1m:SL,t1o:26,vig:60,grain:22}},
  hwbloodmoon:{cat:'halloween',n:'look.hwbloodmoon',c:{br:90,ct:120,sa:110,t1c:'#b91c1c',t1m:SL,t1o:36,t2c:'#1e1b4b',t2m:MU,t2o:18,vig:45}},
  hwcandle:{cat:'halloween',n:'look.hwcandle',c:{br:96,ct:112,sa:115,t1c:'#f59e0b',t1m:OV,t1o:26,leak:22,leakc:'#fb923c',vig:55}},
  hwswamp:{cat:'halloween',n:'look.hwswamp',c:{br:104,ct:82,sa:60,fade:26,t1c:'#94a3b8',t1m:SC,t1o:14,t2c:'#4c1d95',t2m:SL,t2o:12}},
  tparis:{cat:'travel',n:'look.tparis',c:{br:104,ct:100,sa:96,t1c:'#f9a8d4',t1m:SL,t1o:16,fade:10}},
  tla:{cat:'travel',n:'look.tla',c:{br:106,ct:112,sa:122,hue:-6,t1c:'#fb923c',t1m:SL,t1o:22,t2c:'#14b8a6',t2m:SL,t2o:12}},
  tnyc:{cat:'travel',n:'look.tnyc',c:{br:96,ct:120,sa:85,t1c:'#475569',t1m:SL,t1o:22,t2c:'#f59e0b',t2m:SL,t2o:10,vig:25}},
  tseoul:{cat:'travel',n:'look.tseoul',c:{br:108,ct:98,sa:105,t1c:'#a5b4fc',t1m:SL,t1o:18,t2c:'#fbcfe8',t2m:SL,t2o:12}},
  tmarrakech:{cat:'travel',n:'look.tmarrakech',c:{br:104,ct:110,sa:118,hue:-10,t1c:'#c2410c',t1m:SL,t1o:28,t2c:'#0e7490',t2m:SL,t2o:10}},
  tsantorini:{cat:'travel',n:'look.tsantorini',c:{br:110,ct:104,sa:120,t1c:'#3b82f6',t1m:SL,t1o:22,fade:4}},
  ticeland:{cat:'travel',n:'look.ticeland',c:{br:100,ct:114,sa:70,hue:10,t1c:'#64748b',t1m:SL,t1o:22,t2c:'#22d3ee',t2m:SL,t2o:10}},
  tbali:{cat:'travel',n:'look.tbali',c:{br:104,ct:108,sa:125,hue:6,t1c:'#16a34a',t1m:SL,t1o:20,t2c:'#fde68a',t2m:SL,t2o:12}},
  trio:{cat:'travel',n:'look.trio',c:{br:106,ct:114,sa:140,t1c:'#facc15',t1m:SL,t1o:18,t2c:'#10b981',t2m:SL,t2o:16}},
  tkyoto:{cat:'travel',n:'look.tkyoto',c:{br:102,ct:100,sa:92,t1c:'#fda4af',t1m:SL,t1o:16,t2c:'#4d7c0f',t2m:SL,t2o:12,fade:6}},
  cpvivid:{cat:'colorpop',n:'look.cpvivid',c:{ct:116,sa:170}},
  cpcandy2:{cat:'colorpop',n:'look.cpcandy2',c:{br:108,ct:108,sa:150,t1c:'#f472b6',t1m:SL,t1o:18}},
  cpelectric:{cat:'colorpop',n:'look.cpelectric',c:{ct:124,sa:150,hue:-16,t1c:'#3b82f6',t1m:SL,t1o:24}},
  cplime:{cat:'colorpop',n:'look.cplime',c:{br:106,ct:112,sa:140,hue:14,t1c:'#a3e635',t1m:SL,t1o:22}},
  cpsunny:{cat:'colorpop',n:'look.cpsunny',c:{br:110,ct:108,sa:135,t1c:'#facc15',t1m:SL,t1o:22}},
  cpfuchsia:{cat:'colorpop',n:'look.cpfuchsia',c:{ct:116,sa:140,t1c:'#d946ef',t1m:SL,t1o:26}},
  cpturq:{cat:'colorpop',n:'look.cpturq',c:{br:104,ct:110,sa:135,t1c:'#14b8a6',t1m:SL,t1o:26}},
  cpcoral:{cat:'colorpop',n:'look.cpcoral',c:{br:106,ct:106,sa:130,t1c:'#fb7185',t1m:SL,t1o:24}},
  cprainbow:{cat:'colorpop',n:'look.cprainbow',c:{ct:112,sa:150,t1c:'#f43f5e',t1m:SL,t1o:14,t2c:'#22d3ee',t2m:SL,t2o:14,leak:16,leakc:'#facc15'}},
  cpkids:{cat:'colorpop',n:'look.cpkids',c:{br:110,ct:104,sa:155,fade:4}},
  dmidnight:{cat:'dark',n:'look.dmidnight',c:{br:84,ct:118,sa:85,hue:12,t1c:'#1e1b4b',t1m:SL,t1o:34,vig:45}},
  dshadow:{cat:'dark',n:'look.dshadow',c:{br:82,ct:130,sa:80,vig:55}},
  dgothic:{cat:'dark',n:'look.dgothic',c:{br:86,ct:125,sa:55,t1c:'#4c0519',t1m:SL,t1o:30,vig:50}},
  dmatrix:{cat:'dark',n:'look.dmatrix',c:{br:88,ct:120,sa:90,t1c:'#16a34a',t1m:SL,t1o:34,vig:40}},
  dnoirblue:{cat:'dark',n:'look.dnoirblue',c:{br:86,ct:126,gs:70,t1c:'#1d4ed8',t1m:SL,t1o:26,vig:45}},
  dember:{cat:'dark',n:'look.dember',c:{br:88,ct:122,sa:110,t1c:'#9a3412',t1m:SL,t1o:30,vig:45}},
  dsmoke:{cat:'dark',n:'look.dsmoke',c:{br:90,ct:110,sa:40,fade:14,vig:40}},
  dthriller2:{cat:'dark',n:'look.dthriller2',c:{br:88,ct:120,sa:70,t1c:'#365314',t1m:SL,t1o:26,vig:40}},
  dvampire:{cat:'dark',n:'look.dvampire',c:{br:90,ct:120,sa:60,t1c:'#991b1b',t1m:SL,t1o:24,t2c:'#1e293b',t2m:SL,t2o:20,vig:45}},
  dcave:{cat:'dark',n:'look.dcave',c:{br:80,ct:115,sa:90,t1c:'#78350f',t1m:SL,t1o:22,vig:60}},
  sfpeach2:{cat:'softc',n:'look.sfpeach2',c:{br:110,ct:92,sa:100,t1c:'#fed7aa',t1m:SL,t1o:30,fade:10}},
  sfbaby:{cat:'softc',n:'look.sfbaby',c:{br:112,ct:90,sa:85,t1c:'#bfdbfe',t1m:SL,t1o:26,fade:12}},
  sfcotton:{cat:'softc',n:'look.sfcotton',c:{br:112,ct:88,sa:95,t1c:'#fbcfe8',t1m:SL,t1o:28,fade:14}},
  sfmilk:{cat:'softc',n:'look.sfmilk',c:{br:114,ct:86,sa:80,fade:18}},
  sfsage:{cat:'softc',n:'look.sfsage',c:{br:104,ct:92,sa:80,t1c:'#a7c4a0',t1m:SL,t1o:30,fade:10}},
  sflilac:{cat:'softc',n:'look.sflilac',c:{br:108,ct:92,sa:92,t1c:'#d8b4fe',t1m:SL,t1o:28,fade:10}},
  sfbutter:{cat:'softc',n:'look.sfbutter',c:{br:110,ct:92,sa:96,t1c:'#fef08a',t1m:SL,t1o:24,fade:10}},
  sfcloud:{cat:'softc',n:'look.sfcloud',c:{br:114,ct:84,sa:90,fade:16,leak:12,leakc:'#ffffff'}},
  sfrose:{cat:'softc',n:'look.sfrose',c:{br:108,ct:94,sa:100,t1c:'#fda4af',t1m:SL,t1o:24,fade:8}},
  sfmorning:{cat:'softc',n:'look.sfmorning',c:{br:110,ct:96,sa:96,t1c:'#fde68a',t1m:SL,t1o:16,leak:16,leakc:'#fff7ed',fade:8}},
  mnblue:{cat:'mono',n:'look.mnblue',c:{gs:100,ct:110,t1c:'#2563eb',t1m:CO,t1o:55}},
  mnred:{cat:'mono',n:'look.mnred',c:{gs:100,ct:115,t1c:'#dc2626',t1m:CO,t1o:55}},
  mngreen:{cat:'mono',n:'look.mngreen',c:{gs:100,ct:110,t1c:'#16a34a',t1m:CO,t1o:55}},
  mnpurple:{cat:'mono',n:'look.mnpurple',c:{gs:100,ct:112,t1c:'#7c3aed',t1m:CO,t1o:55}},
  mngold:{cat:'mono',n:'look.mngold',c:{gs:100,ct:110,t1c:'#d97706',t1m:CO,t1o:55}},
  mnpink:{cat:'mono',n:'look.mnpink',c:{gs:100,ct:105,br:106,t1c:'#ec4899',t1m:CO,t1o:50}},
  mncyan:{cat:'mono',n:'look.mncyan',c:{gs:100,ct:112,t1c:'#06b6d4',t1m:CO,t1o:55}},
  mnorange:{cat:'mono',n:'look.mnorange',c:{gs:100,ct:112,t1c:'#ea580c',t1m:CO,t1o:55}},
  mnteal:{cat:'mono',n:'look.mnteal',c:{gs:100,ct:112,t1c:'#0f766e',t1m:CO,t1o:55}},
  mnbrown:{cat:'mono',n:'look.mnbrown',c:{gs:100,ct:108,t1c:'#92400e',t1m:CO,t1o:50,grain:10}}
};
const CP=Object.fromEntries(Object.entries(LOOKS).map(([k,v])=>[k,v.c]));
const CPN=Object.fromEntries(Object.entries(LOOKS).map(([k,v])=>[k,v.n]));
const LOOK0={br:100,ct:100,sa:100,hue:0,sep:0,gs:0,inv:0,fade:0,vig:0,grain:0,leak:0,t1o:0,t2o:0};
/* réglages d'un filtre à une intensité donnée (0 = image d'origine, 100 = filtre complet) */
function lookCol(k,amt=100){
  const L=LOOKS[k],o=Object.assign(colDefaults(),{look:k,amt});if(!L)return colDefaults();
  for(const[key,v]of Object.entries(L.c)){if(typeof v==='number'){const n=LOOK0[key]??0;o[key]=Math.round((n+(v-n)*amt/100)*10)/10}else o[key]=v}
  return o;
}
const colDefaults=()=>({br:100,ct:100,sa:100,hue:0,sep:0});
/* choix de la police : polices du système puis les 100 polices livrées, rangées par genre, chacune affichée dans son style */
const SYSFONTS=['Arial Black','Impact','Segoe UI','Bahnschrift','Arial','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Courier New','Consolas','Comic Sans MS','Segoe Script','Segoe Print','Ink Free','Palatino Linotype','Franklin Gothic Medium','Gabriola','Candara','Constantia','Cambria','Segoe UI Emoji'];
function FSEL(cur){
  cur=cur||'Arial Black';loadAllFonts();
  const o=f=>`<option value="${esc(f)}" style="font-family:'${esc(f)}'" ${f===cur?'selected':''}>${esc(f)}</option>`;
  const extra=!SYSFONTS.includes(cur)&&!FONTMAP.has(cur)?o(cur):'';
  return `<div class="fld"><label>${T('text.font')}</label><select data-k="p.font" data-t="s">${extra}<optgroup label="${T('font.system')}">${SYSFONTS.map(o).join('')}</optgroup>`+
    FONTCATS.map(c=>`<optgroup label="${T('font.cat.'+c)}">${FONTLIB.filter(x=>x[2]===c).map(x=>o(x[0])).join('')}</optgroup>`).join('')+`</select></div>`;
}
/* le panneau est redessiné à chaque réglage : on garde la position de défilement tant qu'on reste sur le même clip et le même onglet */
let inspKey='';
function renderInspector(){
  const ob=$('#insp>.ibody'),st=ob?ob.scrollTop:0;
  renderInspector0();
  const n=selIds().length;
  if(n>1){const b=$('#insp>.ibody');if(b)b.insertAdjacentHTML('afterbegin',`<div class="mselbar"><b>${T('msel.count',{count:n})}</b><p class="hint">${T('msel.hint',{name:esc(clipName(selClip()))})}</p><div class="pre" style="margin:0"><button data-act="mdel">${T('msel.delAll')}</button><button data-act="mdup">${T('msel.dupAll')}</button><button data-act="mnone">${T('msel.none')}</button></div><div class="msplit"><b>${T('split.title')}</b><div class="pre" style="margin:4px 0 0">${['2h','2v','3','4'].map(k=>`<button data-split="${k}">${T('split.'+k)}</button>`).join('')}</div></div><div class="mdur"><label>${T('mdur.label')}</label><input type="number" id="mselDur" min="0.1" step="0.1" value="${fmtN(selClip()?selClip().dur:3)}"><button data-act="mdur">${T('mdur.apply')}</button></div></div>`)}
  const c=selClip(),k=c?c.id+'|'+insTab[kindOf(c)]:'proj';
  if(k===inspKey){const nb=$('#insp>.ibody');if(nb)nb.scrollTop=st}
  inspKey=k;
}
function renderInspector0(){
  syncLib();
  const c=selClip(),b=$('#insp');
  if(!c){b.innerHTML=projectPanel();return}
  const m=c.mid&&mById(c.mid),p=c.p,timed=m&&m.type!=='image',kind=kindOf(c);
  if(timed&&!p.voice)p.voice=voiceDefaults();if(timed)p.au=Object.assign(auDefaults(),p.au||{});
  if(p.afade!=null&&p.afin==null){p.afin=p.afout=p.afade;delete p.afade}
  if(kind==='main'){p.col=p.col||colDefaults();p.tf=p.tf||{zoom:100,x:0,y:0,rot:0,flip:false};p.chroma=Object.assign({on:false,color:'#00ff00',tol:35,bg:'none',soft:35,spill:50,ai:false},p.chroma);p.mask=p.mask||maskDefaults();p.fx=p.fx||noFx()}
  if(kind==='bg'){p.col=p.col||colDefaults();p.fx=p.fx||noFx()}
  if(kind==='over'){p.col=p.col||colDefaults();p.mask=p.mask||maskDefaults();p.chroma=Object.assign({on:false,color:'#00ff00',tol:35,bg:'none',soft:35,spill:50,ai:false},p.chroma)}
  if(isText(c))Object.keys(TBASE()).forEach(k=>{if(p[k]===undefined&&!['stroke','glitch','fade'].includes(k))p[k]=TBASE()[k]});
  const tabs=tabsFor(c);let tab=insTab[kind];if(!tabs.includes(tab))tab=tabs[0];insTab[kind]=tab;
  const V=k=>valOf(c,k),kf=!!(c.kf&&c.kf.length),KK=KFK(c);
  const lab=(l,k)=>T(l)+(kf&&KK.includes(k)?T('insp.keyMark'):'');
  const R=(l,k,mn,mx,st=1)=>`<div class="fld"><label>${lab(l,k)}<span>${fmtN(V(k))}</span></label><input data-k="${k}" data-t="n" type="range" min="${mn}" max="${mx}" step="${st}" value="${V(k)}"></div>`;
  const N=(l,k,st=.1)=>`<div class="fld"><label>${T(l)}</label><input data-k="${k}" data-t="n" type="number" step="${st}" min="0" value="${(+V(k)).toFixed(2)}"></div>`;
  const CK=(l,k)=>`<label class="chk"><span>${T(l)}</span><input type="checkbox" data-k="${k}" data-t="b" ${V(k)?'checked':''}></label>`;
  const CO=(l,k)=>`<div class="fld"><label>${T(l)}</label><div class="colrow"><input data-k="${k}" data-t="s" type="color" value="${V(k)||'#000000'}">${window.EyeDropper?`<button class="pip" data-pip="1" title="${T('pip.tip')}">${ico('pipette',15)}</button>`:''}</div></div>`;
  const SE=(l,k,o)=>`<div class="fld"><label>${T(l)}</label><select data-k="${k}" data-t="s">${o.map(([v,n])=>`<option value="${v}" ${String(V(k)??o[0][0])===v?'selected':''}>${T(n)}</option>`).join('')}</select></div>`;
  const S=(t,inner)=>`<div class="sec"><h4>${T(t)}</h4>${inner}</div>`;
  const timing=S(T('common.duration'),`<div class="${timed?'three':'two'}">${N(T('insp.startS'),'start')}${N(T('insp.durS'),'dur')}${timed?N(T('insp.sourceStart'),'in'):''}</div>`);
  const kfBar=()=>`<div class="kfbar"><button data-act="kfprev" title="${T('kf.prevTip')}">${ico('prev',14)}</button><button data-act="kf" class="kfb ${kfAt(c,time-c.start)?'on':''}" title="${T('kf.toggleTip')}">${T('kf.button')}</button><button data-act="kfnext" title="${T('kf.nextTip')}">${ico('next',14)}</button>${kf?`<button data-act="kfclear" title="${T('kf.clearTip')}">✕</button>`:''}</div>${kf?easeUI():''}`;
  const easeUI=()=>{const i=kfSeg(c);if(i==null)return`<p class="hint" style="margin:-4px 0 10px">${T('ease.none')}</p>`;const a=c.kf[i],b=c.kf[i+1],cur=a.e||'smooth';
    return`<div class="easebox"><div class="easeh"><b>${T('ease.title')}</b><span class="hint">${T('ease.hint',{a:fmt(a.t),b:fmt(b.t)})}</span></div><div class="easegrid">${EASE_KEYS.map(k=>`<button data-kfe="${k}" class="${k===cur?'on':''}" title="${T('ease.'+k)}">${easeIcon(k)}<span>${T('ease.'+k)}</span></button>`).join('')}</div><button class="sm" data-kfeall="${cur}" style="margin-top:6px">${T('ease.all')}</button></div>`};
  let h='';
  if(tab==='base'){
    h+=timing;
    if(kind==='main'){
      h+=S(T('insp.framing'),SE(T('insp.fill'),'p.fit',[['cover',T('insp.fitCover')],['contain',T('insp.fitContain')],['blur',T('insp.fitBlur')]]));
      h+=S(T('insp.transform'),kfBar()+R(T('insp.zoomPct'),'p.tf.zoom',10,400)+`<div class="two">${R(T('insp.posX'),'p.tf.x',-100,100,.1)}${R(T('insp.posY'),'p.tf.y',-100,100,.1)}</div>`+R(T('insp.rotDeg'),'p.tf.rot',-180,180)+CK(T('common.mirror'),'p.tf.flip')+`<div class="pre" style="margin:6px 0 0"><button data-act="rot90">${T('common.rotate90')}</button><button data-act="resettf">${T('insp.reset')}</button></div>`);
      h+=S(T('insp.opacityBlend'),R(T('insp.opacityPct'),'p.op',0,100)+SE(T('insp.blendMode'),'p.blend',BLEND));
      h+=S(T('insp.crop'),`<div class="two">${R(T('insp.leftPct'),'p.crop.l',0,90)}${R(T('insp.rightPct'),'p.crop.r',0,90)}${R(T('insp.topPct'),'p.crop.t',0,90)}${R(T('insp.bottomPct'),'p.crop.b',0,90)}</div>`);
    }else if(kind==='bg'){
      if(c.gen==='grad')h+=S(T('gen.grad'),`<div class="two">${CO(T('insp.color1'),'p.color')}${CO(T('insp.color2'),'p.color2')}</div>`+R(T('insp.angle'),'p.angle',0,360));
      else h+=S(c.gen==='matrix'?T('gen.matrix'):T('common.color'),CO(T('common.color'),'p.color'));
      h+=S(T('insp.opacity'),kfBar()+R(T('insp.opacityPct'),'p.op',0,100)+SE(T('insp.blendMode'),'p.blend',BLEND));
    }else if(kind==='over'){
      h+=S(T('insp.posSize'),kfBar()+`<div class="fld"><label>${T('pip.pos')}</label><div class="pipgrid">${['tl','tc','tr','ml','c','mr','bl','bc','br'].map(k=>`<button data-pp="${k}"><i style="left:${k==='c'||k[1]==='c'?'calc(50% - 4px)':k[1]==='l'?'3px':'calc(100% - 11px)'};top:${k==='c'||k[0]==='m'?'calc(50% - 3px)':k[0]==='t'?'3px':'calc(100% - 9px)'}"></i></button>`).join('')}<button data-pp="full" class="pipfull">${T('pip.full')}</button></div></div><div class="two">${R(T('insp.posX'),'p.x',-50,150,.1)}${R(T('insp.posY'),'p.y',-50,150,.1)}</div>`+R(T('insp.sizePct'),'p.scale',2,300,.5)+R(T('insp.rotDeg'),'p.rot',-180,180)+R(T('insp.opacityPct'),'p.op',0,100)+R(T('insp.rounded'),'p.round',0,100)+R(T('pip.border'),'p.bw',0,30)+(p.bw>0?CO(T('pip.bcol'),'p.bc'):'')+CK(T('pip.shadow'),'p.shd')+CK(T('common.mirror'),'p.flip')+CK(T('insp.glitchFx'),'p.glitch'));
      h+=S(T('insp.blending'),SE(T('insp.blendMode'),'p.blend',BLEND));
      h+=S(T('insp.crop'),`<div class="two">${R(T('insp.leftPct'),'p.crop.l',0,90)}${R(T('insp.rightPct'),'p.crop.r',0,90)}${R(T('insp.topPct'),'p.crop.t',0,90)}${R(T('insp.bottomPct'),'p.crop.b',0,90)}</div>`);
    }else if(kind==='gen'){
      if(WINSP[c.gen])h+=S(T(GN[c.gen]),wInsp(c,p,R,CO,CK));
      else if(c.gen==='terminal')h+=S(T('gen.terminal'),`<div class="fld"><label>${T('insp.termText')}</label><textarea data-k="p.text" data-t="s" rows="5">${esc(p.text)}</textarea></div>${R(T('common.size'),'p.size',10,120)}${R(T('insp.lettersPerSec'),'p.speed',5,80)}${CO(T('common.color'),'p.color')}${CK(T('insp.blackBox'),'p.box')}`);
      else if(c.gen==='hackbar')h+=S(T('insp.bar'),`<div class="fld"><label>${T('common.text')}</label><input data-k="p.label" data-t="s" type="text" value="${esc(p.label)}"></div>${R(T('insp.widthPct'),'p.w',10,100)}${CO(T('common.color'),'p.color')}<p class="hint">${T('insp.barHint')}</p>`);
      else if(c.gen==='shape')h+=S(T('common.shape'),`<div class="seg w3">${SHAPES.map(([k,n])=>`<button data-shape="${k}" class="${(p.shape||'rect')===k?'on':''}">${T(n)}</button>`).join('')}</div>`+CO(T('common.color'),'p.color')+CK(T('insp.filled'),'p.fill')+R(T('insp.strokeWidth'),'p.sw',1,40)+(p.shape==='rect'?R(T('insp.cornerRadius'),'p.r',0,100):'')+CK(T('insp.dropShadow'),'p.shadow'));
      else if(c.gen==='pbar')h+=S(T('wdg.pbar'),`<div class="seg">${[['bottom','wdg.bottom'],['top','wdg.top']].map(([v,n])=>`<button data-wpos="${v}" class="${(p.pos||'bottom')===v?'on':''}">${T(n)}</button>`).join('')}</div>`+CO(T('common.color'),'p.color')+CO(T('text.bgColor'),'p.bgc')+R(T('wdg.bgOp'),'p.bgo',0,100)+R(T('wdg.thick'),'p.th',.3,6,.1)+CK(T('insp.cornerRadius'),'p.round')+`<p class="hint">${T('wdg.pbarHint')}</p>`);
      else if(c.gen==='count')h+=S(T('wdg.count'),R(T('wdg.from'),'p.from',1,10)+`<div class="fld"><label>${T('wdg.endText')}</label><input data-k="p.end" data-t="s" type="text" value="${esc(p.end||'')}"></div>`+R(T('common.size'),'p.size',5,60)+CO(T('common.color'),'p.color')+CK(T('wdg.ring'),'p.ring'));
      else if(c.gen==='timer')h+=S(T('wdg.timer'),`<div class="seg">${[['up','wdg.up'],['down','wdg.down']].map(([v,n])=>`<button data-wmode="${v}" class="${(p.mode||'up')===v?'on':''}">${T(n)}</button>`).join('')}</div>`+(p.mode==='down'?R(T('wdg.from'),'p.from',5,3600):'')+R(T('common.size'),'p.size',3,30,.5)+CO(T('common.color'),'p.color')+CK(T('wdg.cs'),'p.cs')+CK(T('wdg.box'),'p.box'));
      else if(c.gen==='sub')h+=S(T('wdg.sub'),`<div class="fld"><label>${T('common.text')}</label><input data-k="p.text" data-t="s" type="text" value="${esc(p.text||'')}"></div><div class="fld"><label>${T('wdg.textDone')}</label><input data-k="p.done" data-t="s" type="text" value="${esc(p.done||'')}"></div>`+R(T('common.size'),'p.size',2,15,.5)+CO(T('common.color'),'p.color'));
      else h+=S('HUD',`<div class="fld"><label>${T('tpl.title')}</label><input data-k="p.label" data-t="s" type="text" value="${esc(p.label)}"></div>${CO(T('common.color'),'p.color')}`);
      h+=S(T('common.position'),kfBar()+(c.gen!=='hud'?`<div class="two">${R(T('insp.posX'),'p.x',c.gen==='shape'?-20:0,c.gen==='shape'?120:100,.1)}${R(T('insp.posY'),'p.y',c.gen==='shape'?-20:0,c.gen==='shape'?120:100,.1)}</div>`:'')+(c.gen==='shape'?`<div class="two">${R(T('insp.widthPct'),'p.w',1,150,.5)}${R(T('insp.heightPct'),'p.h',1,150,.5)}</div>`+R(T('insp.rotDeg'),'p.rot',-180,180):'')+R(T('insp.opacityPct'),'p.op',0,100));
    }else if(kind==='text'){
      h+=S(T('common.position'),kfBar()+`<div class="two">${R(T('insp.posX'),'p.x',-20,120,.1)}${R(T('insp.posY'),'p.y',-20,120,.1)}</div>`+R(T('common.size'),'p.size',8,400)+R(T('insp.rotDeg'),'p.rot',-180,180)+R(T('insp.opacityPct'),'p.op',0,100)+SE(T('insp.blendMode'),'p.blend',BLEND));
    }
  }
  if(tab==='texte'){
    h+=S(T('common.text'),`<div class="fld"><textarea data-k="p.text" data-t="s" rows="3">${esc(p.text)}</textarea></div>`+FSEL(p.font)+`<button data-act="track" style="width:100%;margin:6px 0">🎯 ${T('trk.btn')}</button>`
      +`<div class="two">${R(T('common.size'),'p.size',8,400)}${CO(T('common.color'),'p.color')}</div>`
      +`<div class="seg">${[['left',T('common.left')],['center',T('common.center')],['right',T('common.right')]].map(([v,n])=>`<button data-align="${v}" class="${(p.align||'center')===v?'on':''}">${n}</button>`).join('')}</div>`
      +CK(T('text.bold'),'p.bold')+CK(T('text.italic'),'p.italic')+CK(T('txt.caps'),'p.caps')+R(T('text.spacing'),'p.ls',-10,60));
    h+=S(T('common.templates'),`<div class="pre" style="margin:0"><button data-act="txstyles">${T('txt.allStyles')}</button><button data-act="txanims">${T('txt.allAnims')}</button></div>`);
  }
  if(tab==='style'){
    if(kind==='text'){p.bgo??=88;p.bgs??='box';if(p.neon&&!p.glowc)p.glowc=p.color}
    h+=S(T('txt.fill'),CK(T('txt.gradient'),'p.gradOn')+(p.gradOn?CO(T('txt.color2'),'p.grad'):'')+CK(T('txt.hollow'),'p.hollow'));
    h+=S(T('text.outline'),CK(T('text.outline'),'p.stroke')+`<div class="two">${CO(T('common.color'),'p.sc')}${R(T('text.thickness'),'p.sw',1,30)}</div>`+CK(T('txt.outline2'),'p.st2On')+(p.st2On?CO(T('txt.outline2c'),'p.st2'):''));
    h+=S(T('text.background'),CK(T('text.bgBehind'),'p.bg')+(p.bg?CO(T('text.bgColor'),'p.bgc')+SE(T('txt.bgStyle'),'p.bgs',[['box','txt.bgBox'],['pill','txt.bgPill'],['line','txt.bgLine'],['under','txt.bgUnder']])+R(T('txt.bgOpacity'),'p.bgo',5,100):''));
    h+=S(T('common.effects'),CK(T('insp.dropShadow'),'p.shadow')+CK(T('txt.hard'),'p.hardOn')+(p.hardOn?CO(T('txt.hardc'),'p.hard'):'')+CK(T('txt.ext'),'p.extOn')+(p.extOn?CO(T('txt.extc'),'p.ext'):'')
      +CK(T('text.neonGlow'),'p.neon')+(p.neon?CO(T('txt.glowc'),'p.glowc'):'')+CK(T('text.glitchRgb'),'p.glitch')+R(T('text.glitchAmt'),'p.amt',0,100));
  }
  if(tab==='anim'&&kind==='text'){
    const ao=w=>TAN[w].map(k=>[k,tanName(w,k)]);
    h+=S(T('common.in'),SE(T('anim.inLabel'),'p.anim',ao('in'))+(p.anim==='type'||p.anim==='typec'?R(T('insp.lettersPerSec'),'p.tspeed',4,40):''));
    h+=S(T('common.out'),SE(T('anim.outLabel'),'p.aout',ao('out'))+CK(T('anim.fadeShort'),'p.fade'));
    h+=S(T('txt.loop'),SE(T('anim.loopLabel'),'p.aloop',ao('loop'))+(p.aloop==='karaoke'||p.aloop==='wordpop'?CO(T('txt.kcol'),'p.kcol')+`<p class="hint">${T('txt.khint')}</p>`:'')+`<div class="pre" style="margin:8px 0 0"><button data-act="txanims">${T('txt.allAnims')}</button></div>`);
  }else if(tab==='anim'){
    h+=S(T('common.transitions'),`<div class="two"><div class="fld"><label>${T('common.in')}</label>${trSel('p.tin',p.tin)}</div><div class="fld"><label>${T('common.out')}</label>${trSel('p.tout',p.tout)}</div></div>${R(T('insp.durS'),'p.tdur',.1,2,.1)}<div class="pre" style="margin:0"><button data-act="cross" title="${T('tr.crossTip')}">${T('tr.crossShort')}</button><button data-act="trall">${T('tr.applyAll')}</button></div>`);
    if(kind==='main')h+=S(T('motion.title'),`<div class="pre" style="margin:0"><button data-act="kbin">${T('motion.zoomIn')}</button><button data-act="kbout">${T('motion.zoomOut')}</button><button data-act="kbpan">${T('motion.pan')}</button>${kf?`<button data-act="kfclear">${T('common.remove')}</button>`:''}</div>${m&&m.type==='video'?`<div class="pre" style="margin:8px 0 0"><button data-act="reframe">${T('reframe.run')}</button></div><div id="reframePct" class="hint" style="margin:6px 0 0"></div><p class="hint" style="margin:6px 0 0">${T('reframe.hint')}</p>${typeof stabHTML==='function'?stabHTML(c):''}<div class="pre" style="margin:8px 0 0"><button data-act="scenes">${T('scene.run')}</button><button data-act="azoom">${T('azoom.run')}</button></div><div id="scnPct" class="hint" style="margin:6px 0 0"></div>${scnBox(c)}<p class="hint" style="margin:6px 0 0">${T('scene.hint')}</p><p class="hint" style="margin:6px 0 0">${T('azoom.hint')}</p>`:''}<p class="hint" style="margin:8px 0 0">${T('motion.hint')}</p>`);
  }
  if(tab==='col'){
    const lk=p.col&&p.col.look&&LOOKS[p.col.look];
    h+=S(T('common.filters'),`<div class="hint" style="margin:0 0 6px">${lk?T('look.current',{name:T(lk.n),amt:Math.round(p.col.amt??100)}):T('look.noneYet')}</div><div class="pre" style="margin:0"><button data-act="openfilt">${T('look.choose')}</button></div>`);
    h+=S(T('insp.adjust'),R(T('insp.brightness'),'p.col.br',0,200)+R(T('insp.contrast'),'p.col.ct',0,200)+R(T('insp.saturation'),'p.col.sa',0,300)+R(T('insp.hue'),'p.col.hue',-180,180)+R(T('insp.sepiaPct'),'p.col.sep',0,100));
    h+=S(T('look.finish'),R(T('look.fade'),'p.col.fade',0,60)+R(T('look.vignette'),'p.col.vig',0,90)+R(T('look.grain'),'p.col.grain',0,80));
  }
  if(tab==='fx'){
    h+=S(T('insp.styles'),`<div class="pre">${Object.entries(FXPRE).map(([k,v])=>`<button data-pre="${k}">${T(v.n)}</button>`).join('')}</div>`);
    const fon=FX.filter(k=>p.fx&&p.fx[k]);
    h+=S(T('common.effects'),(fon.length?fon.map(k=>CK(FXN[k],'p.fx.'+k)).join(''):`<div class="hint" style="margin:0 0 6px">${T('fx.noneActive')}</div>`)+`<div class="pre" style="margin:6px 0 8px"><button data-act="openfx">${T('fx.choose')}</button></div>`+R(T('common.intensity'),'p.amt',0,100));
  }
  if(tab==='mask'){
    const t=p.mask.type||'none';
    h+=S(T('common.shape'),`<div class="seg">${[['none',T('common.none')],['circle',T('shape.circle')],['rect',T('shape.rect')],['linear',T('mask.linear')],['free',T('mask.free')]].map(([v,n])=>`<button data-mask="${v}" class="${t===v?'on':''}">${n}</button>`).join('')}</div>`+(t==='none'?'<p class="hint" style="margin:0">'+T('mask.hint')+'</p>':t==='free'?`<div class="pre" style="margin:0 0 8px"><button class="pri" data-act="maskdraw">${T(p.mask.pts&&p.mask.pts.length>2?'mask.redraw':'mask.draw')}</button></div><p class="hint" style="margin:0 0 8px">${T(p.mask.pts&&p.mask.pts.length>2?'mask.freeHint':'mask.drawHint')}</p>`+(p.mask.pts&&p.mask.pts.length>2?`<div class="two">${R(T('mask.cx'),'p.mask.x',0,100)}${R(T('mask.cy'),'p.mask.y',0,100)}</div><div class="two">${R(T('insp.widthPct'),'p.mask.w',10,300)}${R(T('insp.heightPct'),'p.mask.h',10,300)}</div>`+R(T('mask.feather'),'p.mask.feather',0,100)+CK(T('mask.invert'),'p.mask.inv'):''):
      `<div class="two">${R(T('mask.cx'),'p.mask.x',0,100)}${R(T('mask.cy'),'p.mask.y',0,100)}</div>`+(t!=='linear'?`<div class="two">${R(T('insp.widthPct'),'p.mask.w',1,150)}${R(T('insp.heightPct'),'p.mask.h',1,150)}</div>`:R(T('insp.angle'),'p.mask.ang',-180,180))+(t==='rect'?R(T('mask.round'),'p.mask.r',0,100):'')+R(T('mask.feather'),'p.mask.feather',0,100)+CK(T('mask.invert'),'p.mask.inv')));
  }
  if(tab==='chroma'){
    h+=S(T('chroma.aiTitle'),CK(T('chroma.ai'),'p.chroma.ai')+`<p class="hint">${T('chroma.aiHint')}</p>`);
    h+=S(T('chroma.title'),CK(T('chroma.remove'),'p.chroma.on')+CO(T('chroma.color'),'p.chroma.color')+`<div class="pre"><button data-ckpick class="${ckPick?'on':''}">${T('chroma.pick')}</button><button data-ckc="#00ff00">${T('chroma.green')}</button><button data-ckc="#0000ff">${T('chroma.blue')}</button><button data-ckc="#ffffff">${T('chroma.white')}</button><button data-ckc="#000000">${T('common.black')}</button></div>`+(ckPick?`<p class="hint">${T('chroma.pickHint')}</p>`:'')+R(T('chroma.tolerance'),'p.chroma.tol',5,80)
      +R(T('chroma.spill'),'p.chroma.spill',0,100));
    h+=S(T('chroma.finish'),R(T('chroma.soft'),'p.chroma.soft',0,100)
      +(kind==='main'?SE(T('chroma.replace'),'p.chroma.bg',[['none',T('chroma.below')],['black',T('common.black')],['blur',T('chroma.blurBg')]]):''));
  }
  if(tab==='speed'){
    h+=S(T('insp.speed'),`<div class="chips c3" style="margin-bottom:10px">${[.25,.5,.75,1,1.5,2,3,4].map(v=>`<button data-spd="${v}" class="${(p.rate||1)===v?'on':''}">${v===1?T('voice.normal'):v+'x'}</button>`).join('')}</div>`+R(T('speed.x'),'p.rate',.25,4,.05)+CK(T('speed.chip'),'p.chip')+CK(T('speed.reverse'),'p.rev')+'<p class="hint" style="margin:0">'+T('speed.hint')+(p.rev?' '+T('speed.reverseHint'):'')+'</p>');
    if(c.mid&&!p.rev)h+=S(T('ramp.title'),'<div class="easegrid">'+Object.keys(RAMPS).map(k=>`<button data-ramp="${k}" title="${T('ramp.'+k)}">${rampIcon(k)}<span>${T('ramp.'+k)}</span></button>`).join('')+'</div><p class="hint" style="margin:6px 0 0">'+T('ramp.hint')+'</p>');
    if(c.mid)h+=S(T('tk.title'),`<div class="pre" style="margin:0">${m&&m.type!=='image'&&!p.rev?`<button data-tk="velocity" title="${T('vel.tip')}">⚡ ${T('vel.btn')}</button>`:''}<button data-tk="loop" title="${T('loopx.tip')}">🔁 ${T('loopx.btn')}</button></div>`);
  }
  if(tab==='audio'){
    if(kind==='audio')h+=timing;
    h+=S(T('audio.volume'),(KK.includes('p.vol')?kfBar():'')+R(T('audio.volumePct'),'p.vol',0,400)+`<div class="two">${R(T('audio.fadeIn'),'p.afin',0,5,.1)}${R(T('audio.fadeOut'),'p.afout',0,5,.1)}</div><div class="pre" style="margin:0"><button data-act="mute">${(p.vol??100)>0?T('audio.mute'):T('audio.unmute')}</button>${kind==='main'&&m.type==='video'?'<button data-act="detach">'+T('audio.detach')+'</button>':''}</div>`);
    h+=S(T('enh.title'),`<div class="chips c4" style="margin-bottom:8px">${[[0,'enh.off'],[35,'enh.light'],[60,'common.normal'],[90,'enh.strong']].map(([v,n])=>`<button data-enh="${v}" class="${(+(p.au&&p.au.enh)||0)===v?'on':''}">${T(n)}</button>`).join('')}</div>`+R(T('enh.amount'),'p.au.enh',0,100)+`<p class="hint" style="margin:0">${T('enh.hint')}</p>`);
    h+=S(T('audio.eq'),`<div class="pre">${Object.entries(AUPRE).map(([k,v])=>`<button data-aupre="${k}">${T(v.n)}</button>`).join('')}</div>`+R(T('audio.bass'),'p.au.eqL',-15,15,.5)+R(T('audio.mid'),'p.au.eqM',-15,15,.5)+R(T('audio.treble'),'p.au.eqH',-15,15,.5)+CK(T('audio.highpass'),'p.au.hp')+`<details class="vfine"><summary>${T('eqx.fine')}</summary>${R(T('eqx.midF'),'p.au.midF',200,8000,50)}${R(T('eqx.hpf'),'p.au.hpf',0,400,5)}${R(T('eqx.lpf'),'p.au.lpf',0,20,.5)}<p class="hint" style="margin:0">${T('eqx.hint')}</p></details>`);
    h+=S(T('audio.effects'),CK(T('audio.comp'),'p.au.comp')+(V('p.au.comp')?`<div class="two">${R(T('eqx.cThr'),'p.au.cThr',-60,0,1)}${R(T('eqx.cRat'),'p.au.cRat',1,20,.5)}</div>`:'')+R(T('audio.gate'),'p.au.nr',0,100)+R(T('audio.reverb'),'p.au.rev',0,100)+R(T('audio.pan'),'p.au.pan',-100,100));
    h+=S(T('chan.title'),`<div class="fld"><select data-k="p.au.ch" data-t="s">${[['st','chan.st'],['mono','chan.mono'],['ll','chan.ll'],['rr','chan.rr'],['swap','chan.swap']].map(([v,n])=>`<option value="${v}" ${(V('p.au.ch')||'st')===v?'selected':''}>${T(n)}</option>`).join('')}</select></div><p class="hint" style="margin:0">${T('chan.hint')}</p>`);
    h+=S(T('clean.title'),`<div class="chips c3" style="margin-bottom:8px">${[['light','clean.light'],['normal','common.normal'],['strong','clean.strong']].map(([k,n])=>`<button data-cleanlv="${k}" class="${cleanLv===k?'on':''}">${T(n)}</button>`).join('')}</div><div class="pre" style="margin:0"><button data-act="clean">${T('clean.run')}</button>${p.cleanOrig||p.cleanFrom?`<button data-act="unclean">${T('clean.revert')}</button>`:''}</div><div id="cleanPct" class="hint" style="margin:6px 0 0"></div><p class="hint" style="margin:6px 0 0">${T('clean.hint')}</p>`);
    if(!isOvr(c))h+=S(T('audio.tools'),`<div class="two"><div class="fld"><label>${T('audio.silThr')}</label><select id="silThr">${[[-45,T('audio.sensitive')],[-38,T('common.normal')],[-30,T('audio.strong')]].map(([v,n])=>`<option value="${v}" ${silCfg.db===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="fld"><label>${T('audio.silMin')}</label><select id="silMin">${[[.3,'0,3 s'],[.6,'0,6 s'],[1,'1 s']].map(([v,n])=>`<option value="${v}" ${silCfg.min===v?'selected':''}>${n}</option>`).join('')}</select></div></div><div class="fld"><label>${T('audio.silPad')}</label><select id="silPad">${[[.05,'0,05 s'],[.12,'0,12 s'],[.25,'0,25 s'],[.5,'0,5 s']].map(([v,n])=>`<option value="${v}" ${silCfg.pad===v?'selected':''}>${n}</option>`).join('')}</select></div>${silBox(c)}<div class="pre" style="margin:0"><button data-act="silence">${T('audio.findSilences')}</button><button data-act="beats">${T('audio.beats')}</button>${isAud(c)?`<button data-act="loopmus">${T('loop.btn')}</button>`:''}<button data-act="norm">${T('audio.normalize')}</button>${isAud(c)?`<button data-act="duck">${T('audio.duck')}</button>`:''}</div><p class="hint" style="margin:8px 0 0">${T('audio.toolsHint')}</p>`);
    h+=voiceUI(p.voice);
  }
  b.innerHTML=`<div class="ihead"><div class="ititle"><span class="badge">${{audio:T('common.audio'),text:T('common.text'),gen:T('kind.element'),over:T('kind.layer'),bg:T('text.background'),main:m&&m.type==='image'?T('kind.image'):T('common.video')}[kind]}</span><span>${esc(clipName(c))}</span></div><div class="itabs">${tabs.map(t=>`<button data-itab="${t}" class="${t===tab?'on':''}">${T(TABS[t])}</button>`).join('')}</div></div><div class="ibody">${h}</div>`;
}
const maskDefaults=()=>({type:'none',x:50,y:50,w:60,h:60,r:0,feather:10,ang:0,inv:false});
function voiceUI(v){
  v=Object.assign(voiceDefaults(),v);
  const cur=v.on?(v.pre||''):'none';
  const sl=(k,L,mn,mx,st)=>`<div class="fld"><label>${T(L)}<span>${fmtN(v[k])}</span></label><input data-k="p.voice.${k}" data-t="n" type="range" min="${mn}" max="${mx}" step="${st}" value="${v[k]}"></div>`;
  const ck=(k,L)=>`<label class="chk"><span>${T(L)}</span><input type="checkbox" data-k="p.voice.${k}" data-t="b" ${v[k]?'checked':''}></label>`;
  return `<div class="sec"><h4>${T('voice.title')}</h4>${ck('on','voice.enable')}
  <div class="seg">${Object.keys(VCAT).map(k=>`<button data-vcat="${k}" class="${k===vCat?'on':''}">${T('vc.cat.'+k)}</button>`).join('')}</div>
  <div class="chips c3 vgrid">${['none',...VCAT[vCat]].map(k=>`<button data-vpre="${k}" class="${k===cur?'on':''}">${T(vName(k))}</button>`).join('')}</div>
  <p class="hint" style="margin:6px 0 8px">${T('vc.hint')}</p>
  <details class="vfine" ${vFineOpen?'open':''}><summary>${T('vc.fine')}</summary>
  ${sl('pitch','voice.pitch',.5,1.8,.01)}${sl('robot','voice.robot',0,100,1)}${sl('dist','voice.distortion',0,100,1)}${sl('crush','vc.crush',0,100,1)}${sl('muff','vc.muff',0,100,1)}${sl('thin','vc.thin',0,100,1)}${sl('chorus','vc.chorus',0,100,1)}${sl('wob','vc.wob',0,100,1)}${sl('wobF','vc.wobF',.5,15,.5)}${ck('wobSq','vc.wobSq')}${sl('echo','voice.echo',0,100,1)}${sl('edl','vc.edl',.05,1.2,.01)}${sl('vrev','vc.vrev',0,100,1)}${sl('vrevL','vc.vrevL',.3,5,.1)}${ck('radio','voice.phone')}
  </details>
  <div class="pre" style="margin:8px 0 0"><button data-act="voiceAll">${T('vc.all')}</button></div></div>`;
}
$('#insp').addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('vfine'))vFineOpen=e.target.open},true);
const trSel=(key,val)=>`<select data-k="${key}" data-t="s">${Object.entries(TRN).map(([k,n])=>`<option value="${k}" ${(val||'none')===k?'selected':''}>${T(n)}</option>`).join('')}</select>`;
function projectPanel(){
  return `<div class="ihead"><div class="ititle"><span class="badge">${T('proj.title')}</span><span>${esc(projName)}</span></div></div><div class="ibody">
  <div class="sec"><h4>${T('proj.title')}</h4>
    <div class="fld"><label>${T('proj.bgColor')}</label><input type="color" data-proj="bg" value="${bgColor}"></div>
    <div class="fld"><label>${T('export.format')}</label><div class="hint">${T('proj.formatHint',{w:W,h:H})}</div></div>
    <div class="fld"><label>${T('mt.fps')}</label><select data-proj="fps">${[23.976,24,25,29.97,30,50,59.94,60].map(v=>`<option value="${v}" ${Math.abs(v-projFps)<1e-3?'selected':''}>${v}</option>`).join('')}</select><div class="hint">${T('mt.fpsHint')}</div></div>
    <div class="fld"><label>${T('common.duration')}</label><div class="hint">${fmt(total())} · ${T('home.clips',{count:clips.length})} · ${T('proj.mediaCount',{count:media.length})}</div></div>
  </div>
  <div class="sec"><h4>${T('pj.file')}</h4><div class="pre" style="margin:0"><button data-pact="saveCopy">${T('pj.saveCopy')}</button><button data-pact="close">${T('pj.close')}</button><button data-pact="prefs">${T('pref.title')}</button></div></div>
  <div class="sec"><h4>${T('lu.title')}</h4><div class="pre" style="margin:0"><button data-pact="lufs">${T('lu.measure')}</button><button data-pact="stems">${T('stem.btn')}</button></div><p class="hint" style="margin:8px 0 0">${T('lu.hint')}</p></div>
  <div class="sec"><h4>${T('proj.sound')}</h4><div class="fld"><label>${T('proj.masterVol')}<span>${masterVol} %</span></label><input type="range" data-proj="mvol" min="0" max="200" value="${masterVol}"></div><label class="chk"><span>${T('proj.limiter')}</span><input type="checkbox" data-proj="lim" ${masterLim?'checked':''}></label></div>
  <div class="sec"><h4>${T('fade.title')}</h4><div class="pre" style="margin:0"><button data-pact="fadein">${T('fade.in')}</button><button data-pact="fadeout">${T('fade.out')}</button></div></div>
  <div class="sec"><h4>${T('proj.quickFormat')}</h4><div class="pre" style="margin:0"><button data-pact="vert">${T('proj.vertical')}</button><button data-pact="horiz">${T('proj.horizontal')}</button></div><p class="hint" style="margin:8px 0 0">${T('proj.formatHint2')}</p></div>
  <div class="sec"><h4>${T('about.title')}</h4><p class="hint" style="margin:0 0 8px"><b style="color:var(--txt)">DedCut</b> ${appVersion()} — ${T('app.madeBy',{author:'<b style="color:var(--ac)">ByKemi</b>'})}</p><p class="hint" style="margin:0 0 8px">${T('proj.aboutText')}</p><button class="sm" data-pact="lic">${T('about.openLicences')}</button></div>
  <div class="sec"><h4>${T('proj.start')}</h4><p class="hint" style="margin:0">${T('proj.startText')}</p></div>
  <div class="sec"><h4>${T('proj.shortcuts')}</h4><div class="keys">
    ${(KEYACTS||[]).filter(a=>keysOf(a).length).map(a=>`<kbd>${keysOf(a).map(fmtCombo).join(' / ')}</kbd><span>${T(a.n)}</span>`).join('')}<kbd>${T('keys.wheel')}</kbd><span>${T('keys.zoom')}</span>
  </div><button class="sm" data-pact="keys" style="margin-top:10px">${T('kb.customize')}</button>
  </div></div></div>`;
}
function syncInputs(){
  const c=selClip();if(!c)return;
  $$('#insp [data-k]').forEach(el=>{
    if(el.dataset.t!=='n'||el===document.activeElement&&el.type!=='range')return;
    const v=valOf(c,el.dataset.k);if(typeof v!=='number')return;
    if(el.type==='range'){el.value=v;const sp=el.previousElementSibling&&el.previousElementSibling.querySelector('span');if(sp)sp.textContent=fmtN(v)}
    else el.value=v.toFixed(2);
  });
  const kb=$('#insp .kfb');if(kb)kb.classList.toggle('on',!!kfAt(c,time-c.start));
}
function scaleKf(c,f){if(c.kf)c.kf.forEach(k=>k.t*=f)}
$('#insp').addEventListener('input',e=>{
  const k=e.target.dataset.k;if(!k)return;const c=selClip();if(!c)return;
  let v=e.target.dataset.t==='b'?e.target.checked:e.target.dataset.t==='n'?parseFloat(e.target.value):e.target.value;
  if(e.target.dataset.t==='n'&&isNaN(v))return;
  if(k==='p.from'&&c.gen==='count'){c.dur=Math.max(1,Math.round(v))+1;renderTL()}
  if(k==='p.rate'){const old=c.p.rate||1;c.dur=Math.max(.1,c.dur*old/v);scaleKf(c,old/v);const di=$('#insp [data-k=dur]');if(di)di.value=c.dur.toFixed(2);renderTL()}
  setVal(c,k,v);
  if(e.target.type==='range'){const sp=e.target.previousElementSibling.querySelector('span');if(sp)sp.textContent=fmtN(v)}
  if(['start','dur','in','p.text'].includes(k))renderTL();
});
$('#insp').addEventListener('change',e=>{
  if(e.target.dataset.proj==='bg'){bgColor=e.target.value;autosave();return}
  if(e.target.dataset.k){commit();renderTL();if(e.target.tagName==='SELECT'||e.target.type==='checkbox')renderInspector()}
});
$('#insp').addEventListener('input',e=>{if(e.target.dataset.proj==='bg')bgColor=e.target.value});
/* pipette du détourage : clic dans l'aperçu = la couleur de la vidéo à cet endroit (lue avant détourage), moyenne sur 5 × 5 points */
let ckPick=false;
cv.addEventListener('pointerdown',e=>{
  if(!ckPick||e.button!==0)return;
  const c=selClip();if(!c||!c.p||!c.p.chroma){ckPick=false;return}
  e.stopImmediatePropagation();e.preventDefault();
  const P=cvPt(e),ck=c.p.chroma,sv=[ck.on,ck.ai];ck.on=false;ck.ai=false;
  let r=0,g=0,b=0,n=0;
  try{render(time);const x=clamp(Math.round(P.x)-2,0,W-5),y=clamp(Math.round(P.y)-2,0,H-5),d=mctx.getImageData(x,y,5,5).data;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++}}
  finally{ck.on=sv[0];ck.ai=sv[1]}
  const hx=v=>Math.round(v/n).toString(16).padStart(2,'0');
  ck.color='#'+hx(r)+hx(g)+hx(b);ck.on=true;ckPick=false;
  commit();renderInspector();wake();toast(T('chroma.picked'));
},{capture:true});
$('#insp').addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  const c=selClip(),d=t.dataset,A=d.act;
  if(d.pip&&window.EyeDropper){const inp=t.parentElement.querySelector('input[type=color]');new EyeDropper().open().then(r=>{inp.value=r.sRGBHex;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}))}).catch(()=>{});return}
  if(d.itab&&c){insTab[kindOf(c)]=d.itab;renderInspector();return}
  if(d.pact==='lic'){if(inApp)appFetch('app://dedcut/__licences').catch(()=>{});else toast(T('msg.seeLicences'));return}
  if(d.pact==='keys'){openKeys();return}
  if(d.pact==='saveCopy'){saveCopy();return}
  if(d.pact==='close'){closeProject();return}
  if(d.pact==='prefs'){openPrefs();return}
  if(d.pact==='lufs'){openLoudness();return}
  if(d.pact==='stems'){exportStems();return}
  if(d.pact==='fadein'||d.pact==='fadeout'){fadeProject(d.pact==='fadein'?'in':'out');return}
  if(d.pact==='vert'){toFormat(1080,1920);return}
  if(d.pact==='horiz'){toFormat(1920,1080);return}
  if(!c)return;
  const acts={split,dup,del,cross,trall:transAll,kf:toggleKf,kfprev:()=>kfNav(-1),kfnext:()=>kfNav(1),
    kfclear:()=>{delete c.kf;commit();refresh()},kbin:()=>kenBurns(c,'in'),kbout:()=>kenBurns(c,'out'),kbpan:()=>kenBurns(c,'pan'),
    rot90:rotSel,resettf:()=>{c.p.tf={zoom:100,x:0,y:0,rot:0,flip:false};delete c.kf;commit();refresh()},
    detach:()=>detachAudio(c),mute:()=>toggleMute(c),silence:()=>cutSilences(c),mdur:()=>sameDur($('#mselDur').value),loopmus:()=>loopMusic(c),maskdraw:()=>startMaskDraw(c),mdel:del,mdup:dup,mnone:selectNone,voiceAll:()=>{const v=JSON.stringify(Object.assign(voiceDefaults(),c.p.voice));let n=1;for(const x of clips){if(x===c)continue;const m=x.mid&&mById(x.mid);if(!m||m.type==='image'||trk(x).lock)continue;x.p.voice=JSON.parse(v);n++}commit();refresh();toast(T('vc.allDone',{count:n}))},silApply,silCancel,silNext,beats:()=>beatMarkers(c),norm:()=>normalizeClip(c),duck:()=>duckUnderVoice(c),clean:()=>cleanVoice(c,cleanLv),unclean:()=>restoreClean(c),reframe:()=>autoReframe(c),scenes:()=>detectScenes(c),openfilt:()=>showTab('filt'),openfx:()=>showTab('fx'),azoom:()=>autoZoom(c),scnApply,scnCancel};
  if(A==='txstyles'||A==='txanims'){showTab('text');txMode(A==='txstyles'?'style':'anim');return}
  if(A&&WACTS[A]){WACTS[A](c);return}
  if(A&&acts[A]){acts[A]();return}
  if(d.cleanlv){cleanLv=d.cleanlv;renderInspector();return}
  if(d.colpre){c.p.col=Object.assign(colDefaults(),CP[d.colpre]);commit();renderInspector()}
  if(d.vpre){c.p.voice=Object.assign(voiceDefaults(),VP[d.vpre],{on:d.vpre!=='none',pre:d.vpre});commit();renderInspector()}
  if(d.vcat){vCat=d.vcat;renderInspector();return}
  if(d.split){splitScreen(d.split);return}
  if(d.tk&&TKACT[d.tk]){TKACT[d.tk](c);return}
  if(d.ramp){speedRamp(c,d.ramp);return}
  if(d.pp){const m=mById(c.mid),ar=m&&m.w&&m.h?m.h/m.w:9/16;
    if(d.pp==='full'){setVal(c,'p.scale',100);setVal(c,'p.x',50);setVal(c,'p.y',50)}
    else{const s=valOf(c,'p.scale')??30,hw=s/2,hh=s*W/H*ar/2,mg=3,row=d.pp==='c'?'m':d.pp[0],col=d.pp==='c'?'c':d.pp[1];
      setVal(c,'p.x',col==='l'?mg+hw:col==='r'?100-mg-hw:50);setVal(c,'p.y',row==='t'?mg+hh:row==='b'?100-mg-hh:50)}
    commit();refresh();return}
  if(d.wst){if(c.gen==='icon'&&ICONS[d.wst]&&(!c.p.color||c.p.color===(ICONS[c.p.st]||[])[1]))c.p.color=ICONS[d.wst][1];if(c.gen==='ovl'&&typeof ovlStyle==='function')ovlStyle(c,d.wst);c.p.st=d.wst;commit();refresh();return}
  if(d.wset){const i=d.wset.indexOf(':');c.p[d.wset.slice(0,i)]=d.wset.slice(i+1);commit();refresh();return}
  if(d.wpos){const th=c.p.th??1.2;c.p.x=50;c.p.y=d.wpos==='top'?th/2+.6:d.wpos==='bottom'?100-th/2-.6:50;commit();refresh();return}
  if(d.wmode){c.p.mode=d.wmode;commit();refresh();return}
  if(d.kfe){const i=kfSeg(c);if(i!=null){c.kf[i].e=d.kfe;commit();refresh()}return}
  if(d.kfeall){if(c.kf){c.kf.forEach(k=>{k.e=d.kfeall});commit();refresh()}return}
  if(d.enh!=null){c.p.au=Object.assign(auDefaults(),c.p.au||{},{enh:+d.enh});commit();renderInspector()}
  if(d.pre){const f=noFx();FXPRE[d.pre].a.forEach(k=>f[k]=true);c.p.fx=f;commit();renderInspector()}
  if(d.shape){c.p.shape=d.shape;commit();renderInspector()}
  if(d.aupre){const o=c.p.au||{};c.p.au=Object.assign(auDefaults(),{ch:o.ch||'st',enh:o.enh||0},AUPRE[d.aupre].v);commit();renderInspector()}
  if(d.mask){c.p.mask=c.p.mask||maskDefaults();const was=c.p.mask.type;c.p.mask.type=d.mask;if(d.mask==='free'&&was!=='free'){Object.assign(c.p.mask,{x:50,y:50,w:100,h:100})}commit();renderInspector();if(d.mask==='free'&&!(c.p.mask.pts&&c.p.mask.pts.length>2))startMaskDraw(c)}
  if(d.align){c.p.align=d.align;commit();renderInspector()}
  if(d.ckc){c.p.chroma.color=d.ckc;c.p.chroma.on=true;commit();renderInspector()}
  if("ckpick" in d){ckPick=!ckPick;renderInspector()}
  if(d.spd)setRate(c,+d.spd);
  if(d.tpl)applyTpl(c,d.tpl);
});
function applyTpl(c,k){
  const s=Object.assign(TBASE(),TPRE[k].s);if(s.sz){s.size=Math.round(H/s.sz);delete s.sz}if(s.y==null)delete s.y;
  for(const a of ['anim','aout','aloop'])if(c.p[a]&&c.p[a]!=='none')s[a]=c.p[a]; // les animations déjà choisies sont gardées
  Object.assign(c.p,s);commit();refresh();
}
function refresh(){wake();renderTL();renderInspector()}

/* ---------- format & projet ---------- */
function setFormat(w,h,rescale){
  if(rescale)clips.forEach(c=>{if(isText(c)&&c.p.size)c.p.size=Math.round(c.p.size*h/H)});
  W=w;H=h;cv.width=lcv.width=w;cv.height=lcv.height=h;fitCanvas();
  const v=w+'x'+h;if(![...$('#fmt').options].some(o=>o.value===v))$('#fmt').add(new Option(w+'×'+h,v));$('#fmt').value=v;
}
/* l'aperçu garde ses proportions et reste entier dans sa zone, quel que soit le format (16:9, 9:16…) */
function fitCanvas(){
  const r=$('#vwrap').getBoundingClientRect(),pad=28,s=Math.max(.01,Math.min((r.width-pad)/W,(r.height-pad)/H));
  const w=Math.round(W*s),h=Math.round(H*s);
  cv.style.width=w+'px';cv.style.height=h+'px';cv.style.left=Math.round((r.width-w)/2)+'px';cv.style.top=Math.round((r.height-h)/2)+'px';
  drawGuides();if(mdraw)mdrawPaint();
}
/* ---------- masque « Dessin libre » : tracé à la souris sur l'aperçu ---------- */
var mdraw=null;
const mdc=document.createElement('canvas');mdc.id='mdraw';$('#vwrap').appendChild(mdc);
function startMaskDraw(c){if(!c)return;pause();mdraw={id:c.id,pts:[],on:false};cv.classList.add('drawing');mdc.style.display='block';mdrawPaint();toast(T('mask.drawHint'))}
function stopMaskDraw(){mdraw=null;cv.classList.remove('drawing');mdc.style.display='none'}
function mdrawPt(e){const r=cv.getBoundingClientRect();return[clamp((e.clientX-r.left)/r.width*100,-5,105),clamp((e.clientY-r.top)/r.height*100,-5,105)]}
function mdrawPaint(){
  const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  mdc.style.left=cv.style.left;mdc.style.top=cv.style.top;mdc.style.width=w+'px';mdc.style.height=h+'px';mdc.width=Math.round(w*d);mdc.height=Math.round(h*d);
  const g=mdc.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,w,h);
  if(!mdraw||mdraw.pts.length<2)return;
  const P=mdraw.pts.map(([x,y])=>[x*w/100,y*h/100]);
  g.beginPath();g.moveTo(P[0][0],P[0][1]);for(const q of P)g.lineTo(q[0],q[1]);if(!mdraw.on)g.closePath();
  g.fillStyle='rgba(255,255,255,.18)';g.fill();g.lineWidth=2;g.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--ac').trim()||'#a78bfa';g.stroke();
}
cv.addEventListener('pointerdown',e=>{if(!mdraw)return;e.stopImmediatePropagation();e.preventDefault();cv.setPointerCapture(e.pointerId);mdraw.on=true;mdraw.pts=[mdrawPt(e)];mdrawPaint()},true);
cv.addEventListener('pointermove',e=>{if(!mdraw||!mdraw.on)return;e.stopImmediatePropagation();const q=mdrawPt(e),l=mdraw.pts[mdraw.pts.length-1];if(Math.hypot(q[0]-l[0],q[1]-l[1])>.6)mdraw.pts.push(q);mdrawPaint()},true);
cv.addEventListener('pointerup',e=>{
  if(!mdraw||!mdraw.on)return;e.stopImmediatePropagation();mdraw.on=false;
  let P=mdraw.pts;const c=clips.find(x=>x.id===mdraw.id);
  const xs=P.map(q=>q[0]),ys=P.map(q=>q[1]);
  if(P.length<4||Math.max(...xs)-Math.min(...xs)<3||Math.max(...ys)-Math.min(...ys)<3){toast(T('mask.tooSmall'));mdraw.pts=[];mdrawPaint();return}
  if(P.length>400){const s=P.length/400;P=Array.from({length:400},(_,i)=>P[Math.floor(i*s)])}
  if(c){c.p.mask=Object.assign(c.p.mask||maskDefaults(),{type:'free',pts:P.map(([x,y])=>[Math.round(x*100)/100,Math.round(y*100)/100]),x:50,y:50,w:100,h:100});commit();refresh()}
  stopMaskDraw();renderInspector();
},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&mdraw){e.stopImmediatePropagation();stopMaskDraw()}},true);

/* ---------- guides d'aperçu (grille des tiers, centre, marges, zones cachées par les applis) ---------- */
var guides=null;
try{guides=Object.assign({thirds:false,center:false,safe:false,ui:false},JSON.parse(localStorage.getItem('dedcut-guides')||'{}'))}catch(x){guides={thirds:false,center:false,safe:false,ui:false}}
function drawGuides(){
  const gcv=$('#guides');if(!gcv||!guides)return;
  const on=Object.values(guides).some(Boolean);const bg=$('#bGuide');if(bg)bg.classList.toggle('on',on);
  gcv.style.display=on?'block':'none';if(!on)return;
  const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  gcv.style.left=cv.style.left;gcv.style.top=cv.style.top;gcv.style.width=w+'px';gcv.style.height=h+'px';gcv.width=Math.round(w*d);gcv.height=Math.round(h*d);
  const g=gcv.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.lineWidth=1;
  const line=(x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  if(guides.ui){
    /* zones approximatives : en vertical, barre du haut, légende en bas, colonne de boutons à droite ; sinon barre de lecture en bas */
    const zones=W<H?[[0,0,1,.09],[0,.8,1,.2],[.85,.38,.15,.42]]:[[0,.88,1,.12]];
    g.fillStyle='rgba(239,68,68,.2)';g.strokeStyle='rgba(239,68,68,.75)';
    for(const[x,y,zw,zh]of zones){g.fillRect(w*x,h*y,w*zw,h*zh);g.strokeRect(w*x+.5,h*y+.5,w*zw-1,h*zh-1)}
    const lz=zones[W<H?1:0];g.fillStyle='rgba(255,255,255,.9)';g.font='600 11px "Segoe UI", sans-serif';g.fillText(T('guide.uiLabel'),8,h*lz[1]+16);
  }
  if(guides.thirds){g.strokeStyle='rgba(255,255,255,.5)';for(const k of[1/3,2/3]){line(Math.round(w*k)+.5,0,Math.round(w*k)+.5,h);line(0,Math.round(h*k)+.5,w,Math.round(h*k)+.5)}}
  if(guides.center){g.strokeStyle='rgba(56,189,248,.85)';g.setLineDash([6,4]);line(Math.round(w/2)+.5,0,Math.round(w/2)+.5,h);line(0,Math.round(h/2)+.5,w,Math.round(h/2)+.5);g.setLineDash([])}
  if(guides.safe){g.setLineDash([4,4]);g.strokeStyle='rgba(250,204,21,.85)';g.strokeRect(w*.05,h*.05,w*.9,h*.9);g.strokeStyle='rgba(250,204,21,.45)';g.strokeRect(w*.1,h*.1,w*.8,h*.8);g.setLineDash([])}
}
$('#bGuide').onclick=e=>{
  e.stopPropagation();let m=$('#guideMenu');if(m){m.remove();return}
  m=document.createElement('div');m.id='guideMenu';m.className='gmenu';
  m.innerHTML=[['thirds','guide.thirds'],['center','guide.center'],['safe','guide.safe'],['ui','guide.ui']].map(([k,n])=>`<label class="chk"><span>${T(n)}</span><input type="checkbox" data-g="${k}" ${guides[k]?'checked':''}></label>`).join('')+`<p class="hint">${T('guide.hint')}</p>`;
  document.body.appendChild(m);
  const r=e.currentTarget.getBoundingClientRect(),mh=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.right-m.offsetWidth))+'px';m.style.top=(r.top-mh-6>8?r.top-mh-6:r.bottom+6)+'px';
  m.onchange=ev=>{const k=ev.target.dataset.g;if(!k)return;guides[k]=ev.target.checked;try{localStorage.setItem('dedcut-guides',JSON.stringify(guides))}catch(x){}drawGuides()};
};
document.addEventListener('pointerdown',e=>{const m=$('#guideMenu');if(m&&!m.contains(e.target)&&!e.target.closest('#bGuide'))m.remove()});
window.addEventListener('dedcut-lang',()=>{const m=$('#guideMenu');if(m)m.remove();drawGuides()});
new ResizeObserver(fitCanvas).observe($('#vwrap'));
$('#fmt').onchange=e=>{const[w,h]=e.target.value.split('x').map(Number);setFormat(w,h,true);commit();refresh()};
function setName(n){projName=n||'Mon projet';$('#pname').value=projName;document.title=projName+' — DedCut'}
$('#pname').onchange=e=>{setName(e.target.value.trim());autosave();if(!sel)renderInspector()};
$('#pname').onkeydown=e=>{if(e.key==='Enter')e.target.blur()};

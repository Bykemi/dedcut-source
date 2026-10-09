/* ---------- formes ---------- */
const SHAPES=[['rect','shape.rect'],['circle','shape.circle'],['arrow','shape.arrow'],['star','shape.star'],['line','shape.line'],['bubble','shape.bubble'],
  ['triangle','shape.triangle'],['diamond','shape.diamond'],['heart','shape.heart'],['hexagon','shape.hexagon'],['burst','shape.burst'],['plus','shape.plus'],['pill','shape.pill'],['dblarrow','shape.dblarrow'],['check','shape.check']];
const SHPLIB=[
  {k:'rect',n:'shape.rect',p:{w:30,h:20},i:'<rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor"/>'},
  {k:'rect',n:'shape.frame',p:{w:40,h:30,fill:false},i:'<rect x="3" y="6" width="18" height="12" rx="2"/>'},
  {k:'circle',n:'shape.circle',p:{w:18,h:0},i:'<circle cx="12" cy="12" r="8" fill="currentColor"/>'},
  {k:'circle',n:'shape.ring',p:{w:22,h:0,fill:false},i:'<circle cx="12" cy="12" r="8"/>'},
  {k:'arrow',n:'shape.arrow',p:{w:26,h:13},i:'<path d="M3 10h11V6l7 6-7 6v-4H3z" fill="currentColor"/>'},
  {k:'star',n:'shape.star',p:{w:14,h:0},i:'<path d="M12 3l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 16.8 6.4 20l1.5-6.3L3 9.6l6.4-.6z" fill="currentColor"/>'},
  {k:'line',n:'shape.line',p:{w:36,h:2},i:'<path d="M4 12h16"/>'},
  {k:'bubble',n:'shape.bubble',p:{w:28,h:22},i:'<path d="M4 5h16v10H10l-4 4v-4H4z" fill="currentColor"/>'},
  {k:'triangle',n:'shape.triangle',p:{w:16,h:0},i:'<path d="M12 4l9 16H3z" fill="currentColor"/>'},
  {k:'diamond',n:'shape.diamond',p:{w:14,h:0},i:'<path d="M12 3l9 9-9 9-9-9z" fill="currentColor"/>'},
  {k:'heart',n:'shape.heart',p:{w:15,h:0,color:'#f43f5e'},i:'<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z" fill="currentColor"/>'},
  {k:'hexagon',n:'shape.hexagon',p:{w:15,h:0},i:'<path d="M7.5 4h9l4.5 8-4.5 8h-9L3 12z" fill="currentColor"/>'},
  {k:'burst',n:'shape.burst',p:{w:18,h:0,color:'#facc15'},i:'<path d="M12 2l2 4 4-2-1 4.5 4.5 1-3.5 3 3 3.5-4.5.5.5 4.5-4-2-1 4-2-4-4 2 .5-4.5L3 15.5l3-3.5L2.5 9l4.5-1-1-4.5 4 2z" fill="currentColor"/>'},
  {k:'plus',n:'shape.plus',p:{w:12,h:0},i:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor"/>'},
  {k:'pill',n:'shape.pill',p:{w:30,h:12},i:'<rect x="2" y="8" width="20" height="8" rx="4" fill="currentColor"/>'},
  {k:'dblarrow',n:'shape.dblarrow',p:{w:32,h:13},i:'<path d="M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z" fill="currentColor"/>'},
  {k:'check',n:'shape.check',p:{w:14,h:0,color:'#22c55e',sw:14},i:'<path d="M4 12l5 5L20 6"/>'}
];
function renderShapes(){$('#shplist').innerHTML=SHPLIB.map((s,i)=>'<button data-shp="'+i+'" title="'+esc(T(s.n))+'">'+ico('square',22).replace(ICO.square,s.i)+esc(T(s.n))+'</button>').join('')}
renderShapes();
/* ---------- onglet Formes : bibliothèque d'éléments (catégories, vignettes dessinées par le moteur, aperçu animé au survol) ---------- */
/* modèles : plusieurs éléments posés d'un coup (groupés), textes à changer ensuite */
const TPLS={
  intro:{n:'tpl.intro',dur:5,build:()=>[{k:'text',st:'epic',start:0,dur:5,p:{text:T('tplc.title'),y:42,size:Math.round(H/9)}},{k:'text',st:'clean',start:.4,dur:4.6,p:{text:T('tplc.ep'),y:56,size:Math.round(H/18)}},{k:'gen',g:'sub',s:'bell',start:1.6,dur:3.4,p:{y:78}}]},
  outro:{n:'tpl.outro',dur:6,build:()=>[{k:'gen',g:'confetti',start:0,dur:3,p:{y:30}},{k:'text',st:'classic',start:0,dur:6,p:{text:T('tplc.thanks'),y:30,size:Math.round(H/10)}},{k:'gen',g:'sub',s:'sub',start:.6,dur:3,p:{y:58}},{k:'gen',g:'sub',s:'like',start:3.2,dur:2.8,p:{y:60,text:T('wdg.like'),color:'#ff4d6d'}}]},
  short:{n:'tpl.short',dur:8,build:()=>[{k:'text',st:'story',start:0,dur:8,p:{text:T('tplc.wait'),y:14,size:Math.round(H/16)}},{k:'gen',g:'pbar',s:'pill',start:0,dur:8,p:{w:86,y:95,th:1.2}},{k:'gen',g:'hearts',s:'heart',start:1,dur:7,p:{}},{k:'gen',g:'swipe',s:'up',start:5.5,dur:2.5,p:{y:84,text:T('wdg.swipeUp')}}]},
  tuto:{n:'tpl.tuto',dur:6,build:()=>[{k:'gen',g:'lower',s:'lbar',start:0,dur:5,p:{}},{k:'text',st:'pill',start:.3,dur:5.7,p:{text:T('tplc.step'),y:10,size:Math.round(H/18)}},{k:'gen',g:'arrowp',s:'arrow',start:2,dur:4,p:{x:70,y:45,rot:135,size:8}}]},
  gaming:{n:'tpl.gaming',dur:8,build:()=>[{k:'gen',g:'rec',s:'live',start:0,dur:8,p:{text:T('wdg.live'),x:4,y:8}},{k:'gen',g:'timer',s:'digital',start:0,dur:8,p:{x:88,y:9,size:6,color:'#4ade80'}},{k:'gen',g:'lower',s:'lbox',start:.5,dur:5,p:{name:T('tplc.gamer'),title:T('tplc.gamerSub'),color:'#22c55e',y:82}}]},
  review:{n:'tpl.review',dur:6,build:()=>[{k:'text',st:'thumb',start:0,dur:6,p:{text:T('tplc.verdict'),y:30,size:Math.round(H/10)}},{k:'gen',g:'stars',start:.6,dur:5.4,p:{value:4.5,y:50,size:9}},{k:'gen',g:'sub',s:'like',start:2.4,dur:3.6,p:{x:80,y:72,text:T('wdg.like'),color:'#ff4d6d'}}]}
};
/* modèles d'exposé (v4.36) : un fond de diapo + les éléments, prêts à modifier */
const XH=n=>Math.round(H/n);
Object.assign(TPLS,{
  x_title:{cat:'expo',n:'expo.t.title',dur:5,build:()=>[{k:'gen',g:'slide',s:'sgrad',start:0,dur:5,p:{title:'',color:'#6366f1'}},{k:'text',st:'ccinzel',start:.2,dur:4.8,p:{text:T('expo.c.title'),y:44,size:XH(9)}},{k:'text',st:'clean',start:.7,dur:4.3,p:{text:T('expo.c.by'),y:58,size:XH(22)}}]},
  x_plan:{cat:'expo',n:'expo.t.plan',dur:6,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:6,p:{title:T('expo.c.plan')}},{k:'gen',g:'agenda',start:.4,dur:5.6,p:{}}]},
  x_chapter:{cat:'expo',n:'expo.t.chapter',dur:4,build:()=>[{k:'gen',g:'slide',s:'sgrad',start:0,dur:4,p:{title:'',color:'#0891b2'}},{k:'gen',g:'chapter',start:.2,dur:3.8,p:{}}]},
  x_list:{cat:'expo',n:'expo.t.list',dur:6,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:6,p:{title:T('expo.c.points')}},{k:'gen',g:'bullets',s:'bcard',start:.4,dur:5.6,p:{}}]},
  x_def:{cat:'expo',n:'expo.t.def',dur:6,build:()=>[{k:'gen',g:'slide',s:'snote',start:0,dur:6,p:{title:T('expo.c.vocab')}},{k:'gen',g:'defbox',s:'def',start:.4,dur:5.6,p:{}}]},
  x_retain:{cat:'expo',n:'expo.t.retain',dur:6,build:()=>[{k:'gen',g:'slide',s:'schalk',start:0,dur:6,p:{title:T('expo.c.retain')}},{k:'gen',g:'defbox',s:'retain',start:.4,dur:5.6,p:{title:T('expo.c.keyidea'),text:T('expo.c.keytext')}}]},
  x_compare:{cat:'expo',n:'expo.t.compare',dur:7,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:7,p:{title:T('expo.c.compare')}},{k:'gen',g:'compare',start:.4,dur:6.6,p:{}}]},
  x_timeline:{cat:'expo',n:'expo.t.timeline',dur:7,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:7,p:{title:T('expo.c.dates')}},{k:'gen',g:'timeline',start:.4,dur:6.6,p:{}}]},
  x_steps:{cat:'expo',n:'expo.t.steps',dur:6,build:()=>[{k:'gen',g:'slide',s:'sgrid',start:0,dur:6,p:{title:T('expo.c.how')}},{k:'gen',g:'steps',start:.4,dur:5.6,p:{tcolor:'#0f172a'}}]},
  x_figure:{cat:'expo',n:'expo.t.figure',dur:5,build:()=>[{k:'gen',g:'slide',s:'sgrad',start:0,dur:5,p:{title:'',color:'#7c3aed'}},{k:'gen',g:'keyfig',start:.3,dur:4.7,p:{}}]},
  x_chart:{cat:'expo',n:'expo.t.chart',dur:6,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:6,p:{title:T('expo.c.numbers')}},{k:'gen',g:'pie',s:'donut',start:.4,dur:5.6,p:{}}]},
  x_quote:{cat:'expo',n:'expo.t.quote',dur:7,build:()=>[{k:'gen',g:'slide',s:'sdark',start:0,dur:7,p:{title:''}},{k:'gen',g:'quote',start:.3,dur:6.7,p:{}}]},
  x_sources:{cat:'expo',n:'expo.t.sources',dur:6,build:()=>[{k:'gen',g:'slide',s:'sclean',start:0,dur:6,p:{title:T('expo.d.sources')}},{k:'gen',g:'sources',start:.3,dur:5.7,p:{x:7,y:26,w:80,size:3.4}}]},
  x_end:{cat:'expo',n:'expo.t.end',dur:5,build:()=>[{k:'gen',g:'slide',s:'sgrad',start:0,dur:5,p:{title:'',color:'#db2777'}},{k:'text',st:'pbebas',start:.2,dur:4.8,p:{text:T('expo.c.thanks'),y:42,size:XH(8)}},{k:'text',st:'clean',start:1,dur:4,p:{text:T('expo.c.questions'),y:58,size:XH(16)}},{k:'gen',g:'confetti',start:.4,dur:2.6,p:{y:30}}]}
});
/* miniatures YouTube (v4.36) : une image forte à exporter en PNG (Exporter > Image), et modèles de vidéos complètes */
const BG=(s,c1,c2,dur)=>({k:'gen',g:'animbg',s,start:0,dur,p:{color:c1,color2:c2}}),EM=(e,st,x,y,size,start,dur,extra)=>({k:'gen',g:'aemoji',s:st,start,dur,p:{emoji:e,x,y,size,extra:extra||'none'}});
Object.assign(TPLS,{
  th_shock:{cat:'thumb',n:'th.shock',dur:5,build:()=>[BG('bgflow','#dc2626','#f59e0b',5),{k:'text',st:'thumb',start:0,dur:5,p:{text:T('th.c.shock'),x:36,y:50,size:XH(12)}},EM('😱','em_zoom',83,55,32,0,5),{k:'gen',g:'handdraw',s:'hdarrow',start:.3,dur:4.7,p:{x:60,y:30,w:14,h:14,color:'#ffffff',th:1.2}}]},
  th_top:{cat:'thumb',n:'th.top',dur:5,build:()=>[BG('bgstripes','#111827','#1f2937',5),{k:'text',st:'fbangers',start:0,dur:5,p:{text:'TOP 10',y:40,size:XH(3.5)}},{k:'text',st:'xkey',start:0,dur:5,p:{text:T('th.c.top'),y:72,size:XH(11)}},EM('🔥','em_float',84,30,26,0,5,'fire')]},
  th_tuto:{cat:'thumb',n:'th.tuto',dur:5,build:()=>[BG('bgflow','#2563eb','#06b6d4',5),{k:'text',st:'boldcap',start:0,dur:5,p:{text:T('th.c.tuto'),x:36,y:40,size:XH(8)}},{k:'gen',g:'circleann',start:.2,dur:4.8,p:{x:76,y:55,w:28,h:40,color:'#facc15',th:1.4}},EM('👉','em_bounce',52,70,22,0,5)]},
  th_gaming:{cat:'thumb',n:'th.gaming',dur:5,build:()=>[BG('bgretro','#ec4899','#facc15',5),{k:'text',st:'gamer',start:0,dur:5,p:{text:T('th.c.gaming'),y:22,size:XH(7)}},EM('🏆','em_pop',50,72,26,0,5,'sparkles')]},
  th_vlog:{cat:'thumb',n:'th.vlog',dur:5,build:()=>[BG('bgbokeh','#f472b6','#facc15',5),{k:'text',st:'spacifico',start:0,dur:5,p:{text:T('th.c.vlog'),y:42,size:XH(6)}},EM('😍','em_float',82,70,22,0,5,'hearts')]},
  th_challenge:{cat:'thumb',n:'th.challenge',dur:5,build:()=>[BG('bgstripes','#facc15','#f97316',5),{k:'text',st:'thumb',start:0,dur:5,p:{text:T('th.c.challenge'),y:40,size:XH(6)}},EM('⏰','em_shake',20,72,24,0,5),{k:'gen',g:'stamp',s:'stred',start:.2,dur:4.8,p:{text:T('th.c.extreme'),x:70,y:74,size:9}}]},
  th_vs:{cat:'thumb',n:'th.vs',dur:5,build:()=>[BG('bgflow','#1d4ed8','#dc2626',5),{k:'text',st:'boldcap',start:0,dur:5,p:{text:'A',x:22,y:50,size:XH(3)}},{k:'text',st:'boldcap',start:0,dur:5,p:{text:'B',x:78,y:50,size:XH(3)}},{k:'gen',g:'stamp',s:'stred',start:0,dur:5,p:{text:'VS',size:16,rot:0,color:'#ffffff'}}]},
  th_money:{cat:'thumb',n:'th.money',dur:5,build:()=>[BG('bgflow','#15803d','#84cc16',5),{k:'gen',g:'keyfig',start:0,dur:5,p:{value:'1 000 €',label:T('th.c.money'),size:22,y:44}},{k:'gen',g:'aemoji',s:'em_rain',start:0,dur:5,p:{emoji:'💸',size:10}}]},
  th_reaction:{cat:'thumb',n:'th.reaction',dur:5,build:()=>[BG('bgrays','#f59e0b','#ef4444',5),{k:'text',st:'thumb',start:0,dur:5,p:{text:T('th.c.reaction'),x:36,y:24,size:XH(10)}},EM('😂','em_shake',70,62,44,0,5,'tears')]},
  th_unboxing:{cat:'thumb',n:'th.unboxing',dur:5,build:()=>[BG('bgconfetti','#ffffff','#ffffff',5),{k:'text',st:'fbangers',start:0,dur:5,p:{text:'UNBOXING',y:30,size:XH(5)}},EM('📦','em_bounce',50,66,30,0,5,'sparkles'),{k:'gen',g:'stamp',s:'stred',start:0,dur:5,p:{text:T('th.c.new'),x:80,y:74,size:8}}]},
  th_story:{cat:'thumb',n:'th.story',dur:5,build:()=>[BG('bgbokeh','#a855f7','#22d3ee',5),{k:'text',st:'hmarker',start:0,dur:5,p:{text:'STORYTIME',x:36,y:40,size:XH(8)}},EM('🤫','em_tilt',80,56,34,0,5)]},
  th_fail:{cat:'thumb',n:'th.fail',dur:5,build:()=>[BG('bgtv','#000000','#000000',5),{k:'gen',g:'stamp',s:'stred',start:0,dur:5,p:{text:'FAIL',size:20,y:44}},EM('💀','em_wobble',82,74,22,0,5)]},
  th_horror:{cat:'thumb',n:'th.horror',dur:5,build:()=>[BG('bgembers','#000000','#000000',5),{k:'text',st:'xcreepster',start:0,dur:5,p:{text:T('th.c.horror'),y:36,size:XH(9)}},EM('👻','em_float',50,72,26,0,5)]},
  th_sport:{cat:'thumb',n:'th.sport',dur:5,build:()=>[BG('bgstripes','#15803d','#166534',5),{k:'text',st:'panton',start:0,dur:5,p:{text:T('th.c.sport'),x:38,y:44,size:XH(8)}},EM('⚽','em_spin',82,60,30,0,5,'fire')]},
  th_school:{cat:'thumb',n:'th.school',dur:5,build:()=>[BG('bgdots','#6366f1','#22d3ee',5),{k:'text',st:'boldcap',start:0,dur:5,p:{text:T('th.c.school'),x:38,y:44,size:XH(9)}},EM('🧠','em_beat',82,56,30,0,5,'sparkles')]},
  th_ba:{cat:'thumb',n:'th.ba',dur:5,build:()=>[BG('bgflow','#0ea5e9','#22c55e',5),{k:'text',st:'xlabel',start:0,dur:5,p:{text:T('expo.d.ta'),x:24,y:16,size:XH(12)}},{k:'text',st:'xlabel',start:0,dur:5,p:{text:T('expo.d.tb'),x:76,y:16,size:XH(12)}},{k:'gen',g:'handdraw',s:'hdarrow',start:0,dur:5,p:{x:50,y:52,w:22,h:16,color:'#ffffff',th:1.4}}]},
  v_unboxing:{cat:'vtpl',n:'vt.unboxing',dur:12,build:()=>[BG('bgconfetti','#fff','#fff',3),{k:'text',st:'fbangers',start:.2,dur:2.8,p:{text:'UNBOXING',y:45,size:XH(5)}},{k:'gen',g:'count',s:'pop',start:3,dur:3,p:{}},EM('😮','em_pop',80,25,14,6.2,2.5),{k:'gen',g:'stars',start:9,dur:3,p:{value:5,y:80}}]},
  v_story:{cat:'vtpl',n:'vt.story',dur:10,build:()=>[BG('bgbokeh','#a855f7','#22d3ee',3),{k:'text',st:'hmarker',start:.2,dur:2.8,p:{text:'STORYTIME',y:45,size:XH(7)}},{k:'text',st:'subpill',start:3.2,dur:6.8,p:{text:T('vt.c.story'),y:86}},EM('🤫','em_tilt',85,20,12,3.5,3)]},
  v_sport:{cat:'vtpl',n:'vt.sport',dur:10,build:()=>[{k:'text',st:'panton',start:0,dur:3,p:{text:T('vt.c.goal'),y:40,size:XH(6)}},EM('⚽','em_burst',50,62,18,0,3),{k:'gen',g:'counter',start:3,dur:4,p:{from:0,to:3,suf:' - 1',size:16,y:45}},{k:'gen',g:'stamp',s:'stgreen',start:7,dur:3,p:{text:T('vt.c.win')}}]},
  v_birthday:{cat:'vtpl',n:'vt.birthday',dur:8,build:()=>[BG('bghearts','#ffffff','#f472b6',8),{k:'text',st:'spacifico',start:.3,dur:7.7,p:{text:T('vt.c.bday'),y:40,size:XH(8)}},EM('🎂','em_bounce',50,66,16,1,7,'sparkles'),{k:'gen',g:'confetti',start:.5,dur:3,p:{}},{k:'gen',g:'aemoji',s:'em_rain',start:4,dur:4,p:{emoji:'🎈',size:8}}]},
  v_travel:{cat:'vtpl',n:'vt.travel',dur:12,build:()=>[{k:'text',st:'xtitle',start:0,dur:3,p:{text:T('vt.c.travel'),y:42,size:XH(10)}},{k:'gen',g:'pin',start:.5,dur:4,p:{y:60}},{k:'gen',g:'timeline',start:4,dur:8,p:{text:T('vt.c.trip')}}]},
  v_gaming:{cat:'vtpl',n:'vt.gaming',dur:8,build:()=>[BG('bgretro','#ec4899','#facc15',3.5),{k:'text',st:'tpress',start:.3,dur:3.2,p:{text:'GAME ON',y:30,size:XH(10)}},{k:'gen',g:'rec',s:'live',start:3.5,dur:4.5,p:{text:T('wdg.live'),x:6,y:8}},{k:'gen',g:'lower',s:'lbox',start:4,dur:4,p:{color:'#22c55e'}}]},
  v_motivation:{cat:'vtpl',n:'vt.motivation',dur:8,build:()=>[BG('bgaurora','#22c55e','#a855f7',8),{k:'gen',g:'quote',start:.3,dur:7.7,p:{text:T('vt.c.quote'),author:''}}]},
  v_challenge:{cat:'vtpl',n:'vt.challenge',dur:12,build:()=>[{k:'text',st:'thumb',start:0,dur:3,p:{text:T('th.c.challenge'),y:40,size:XH(8)}},{k:'gen',g:'timer',s:'digital',start:0,dur:12,p:{mode:'down',from:600,x:84,y:9,size:6}},{k:'gen',g:'stamp',s:'stred',start:5,dur:2.5,p:{text:T('th.c.extreme')}},{k:'gen',g:'stamp',s:'stgreen',start:9,dur:3,p:{text:T('expo.d.stamp2')}}]},
  v_vlog:{cat:'vtpl',n:'vt.vlog',dur:10,build:()=>[BG('bgflow','#f472b6','#6366f1',3.5),{k:'text',st:'spacifico',start:.2,dur:3.3,p:{text:T('vt.c.vlog'),y:44,size:XH(6)}},{k:'text',st:'clean',start:.8,dur:2.7,p:{text:T('vt.c.date'),y:60,size:XH(18)}},{k:'gen',g:'lower',s:'lbox',start:4,dur:4.5,p:{}},EM('😍','em_float',85,22,12,6,3.5,'hearts')]},
  v_recipe:{cat:'vtpl',n:'vt.recipe',dur:16,build:()=>[{k:'gen',g:'slide',s:'snote',start:0,dur:16,p:{title:T('vt.c.recipe')}},{k:'gen',g:'bullets',s:'bcheck',start:1,dur:6,p:{text:T('vt.c.ingr'),tcolor:'#1e3a8a',color:'#f97316'}},{k:'gen',g:'steps',s:'shor',start:7.5,dur:6,p:{text:T('vt.c.steps'),tcolor:'#1e3a8a',color:'#f97316'}},{k:'text',st:'xnote',start:13.5,dur:2.5,p:{text:T('vt.c.enjoy'),y:80,size:XH(12)}},EM('😋','em_bounce',80,78,14,13.5,2.5)]},
  v_top5:{cat:'vtpl',n:'vt.top5',dur:18,build:()=>[BG('bgstripes','#111827','#1f2937',18),{k:'text',st:'fbangers',start:0,dur:3,p:{text:'TOP 5',y:45,size:XH(4)}},...[5,4,3,2,1].map((n,i)=>({k:'gen',g:'chapter',start:3+i*3,dur:3,p:{num:'#'+n,title:T('vt.c.item'),color:['#22d3ee','#a855f7','#f59e0b','#ef4444','#facc15'][i]}}))]},
  v_reaction:{cat:'vtpl',n:'vt.reaction',dur:10,build:()=>[{k:'gen',g:'rec',s:'live',start:0,dur:10,p:{text:T('vt.c.react'),x:6,y:8}},EM('😱','em_zoom',85,20,14,1,2.5),EM('😂','em_shake',85,20,14,4,2.5),EM('🤯','em_burst',85,20,14,7,3)]},
  v_tuto:{cat:'vtpl',n:'vt.tuto',dur:16,build:()=>[{k:'gen',g:'slide',s:'sgrid',start:0,dur:4,p:{title:T('vt.c.tuto')}},{k:'gen',g:'steps',s:'shor',start:.5,dur:3.5,p:{tcolor:'#0f172a'}},{k:'gen',g:'callout',start:5,dur:4,p:{}},{k:'gen',g:'chapter',start:10,dur:3,p:{num:T('vt.c.tip'),title:T('vt.c.tiptitle')}},{k:'gen',g:'stamp',s:'stgreen',start:13.5,dur:2.5,p:{text:T('expo.d.stamp2')}}]},
  v_beforeafter:{cat:'vtpl',n:'vt.ba',dur:8,build:()=>[{k:'text',st:'xlabel',start:0,dur:4,p:{text:T('expo.d.ta'),y:12,size:XH(14)}},{k:'text',st:'xlabel',start:4,dur:4,p:{text:T('expo.d.tb'),y:12,size:XH(14)}},{k:'gen',g:'stamp',s:'stgreen',start:4.3,dur:3.7,p:{text:'WOW',x:80,y:80,size:7}}]},
  v_news:{cat:'vtpl',n:'vt.news',dur:12,build:()=>[{k:'text',st:'poswald',start:0,dur:4,p:{text:T('vt.c.breaking'),y:16,size:XH(12)}},{k:'gen',g:'lower',s:'lbar',start:1,dur:10,p:{}},{k:'gen',g:'ticker',start:0,dur:12,p:{}}]},
  v_quiz:{cat:'vtpl',n:'vt.quiz',dur:20,build:()=>[BG('bgparticles','#22d3ee','#a855f7',20),{k:'text',st:'fluckiest',start:0,dur:3,p:{text:'QUIZ !',y:45,size:XH(5)}},{k:'gen',g:'quiz',s:'q4',start:3,dur:8,p:{}},{k:'gen',g:'truefalse',s:'tfvrai',start:11,dur:6,p:{}},{k:'text',st:'xconclusion',start:17,dur:3,p:{text:T('vt.c.score'),y:45,size:XH(10)}},{k:'gen',g:'confetti',start:17,dur:3,p:{}}]}
});
/* v4.36 (3) : 30 miniatures et 30 modèles de vidéos en plus */
const TX=(st,text,x,y,size,start,dur,extra)=>({k:'text',st,start:start??0,dur:dur??5,p:Object.assign({text,y,size:XH(size)},x==null?{}:{x},extra||{})}),G=(g,s,start,dur,p)=>({k:'gen',g,s,start,dur,p:p||{}});
Object.assign(TPLS,{
  th_asmr:{cat:'thumb',n:'th.asmr',dur:5,build:()=>[BG('bgwaves','#7c3aed','#ec4899',5),TX('neon','ASMR',36,46,4),EM('🎧','em_float',80,54,30,0,5,'sparkles')]},
  th_diy:{cat:'thumb',n:'th.diy',dur:5,build:()=>[BG('bgstripes','#f59e0b','#d97706',5),TX('fbangers','DIY',34,34,4),TX('xkey',T('th.d.diy'),34,66,13),EM('🛠️','em_wobble',80,56,30,0,5)]},
  th_cook:{cat:'thumb',n:'th.cook',dur:5,build:()=>[BG('bgrays','#f97316','#facc15',5),TX('thumb',T('th.d.cook'),38,44,9),EM('🍕','em_spin',80,58,32,0,5,'fire')]},
  th_makeup:{cat:'thumb',n:'th.makeup',dur:5,build:()=>[BG('bgbokeh','#f472b6','#fbcfe8',5),TX('spacifico',T('th.d.makeup'),36,46,9),EM('💄','em_tilt',80,58,30,0,5,'sparkles')]},
  th_fit:{cat:'thumb',n:'th.fit',dur:5,build:()=>[BG('bgstripes','#111827','#dc2626',5),TX('panton',T('th.d.fit'),38,44,8),EM('💪','em_beat',80,56,32,0,5,'fire')]},
  th_trip:{cat:'thumb',n:'th.trip',dur:5,build:()=>[BG('bgaurora','#0ea5e9','#22c55e',5),TX('xtitle',T('th.d.trip'),36,44,11),EM('✈️','em_float',80,40,28,0,5)]},
  th_tech:{cat:'thumb',n:'th.tech',dur:5,build:()=>[BG('bgmatrix','#000000','#22c55e',5),TX('torbitron',T('th.d.tech'),36,44,5),EM('📱','em_zoom',80,56,30,0,5,'sparkles')]},
  th_song:{cat:'thumb',n:'th.song',dur:5,build:()=>[BG('bgplasma','#7c3aed','#06b6d4',5),TX('spacifico',T('th.d.song'),36,46,8),EM('🎤','em_bounce',80,58,30,0,5,'sparkles')]},
  th_prank:{cat:'thumb',n:'th.prank',dur:5,build:()=>[BG('bgrays','#7c3aed','#111827',5),TX('fbangers','PRANK',36,40,4),TX('xkey',T('th.d.prank'),36,72,12),EM('😈','em_shake',80,54,34,0,5)]},
  th_mystery:{cat:'thumb',n:'th.mystery',dur:5,build:()=>[BG('bgstars','#020617','#1e1b4b',5),TX('xcreepster',T('th.d.mystery'),38,44,5),EM('❓','em_wobble',82,54,30,0,5)]},
  th_iq:{cat:'thumb',n:'th.iq',dur:5,build:()=>[BG('bgdots','#2563eb','#7c3aed',5),TX('boldcap',T('th.d.iq'),36,40,8),G('keyfig',null,0,5,{value:'150',label:'QI',size:16,x:36,y:66}),EM('🧠','em_beat',80,52,30,0,5,'sparkles')]},
  th_rich:{cat:'thumb',n:'th.rich',dur:5,build:()=>[BG('bgflow','#78350f','#fbbf24',5),TX('boldcap',T('th.d.rich'),36,44,8),EM('💎','em_spin',80,56,30,0,5,'sparkles')]},
  th_cheap:{cat:'thumb',n:'th.cheap',dur:5,build:()=>[BG('bgflow','#16a34a','#a855f7',5),TX('boldcap','1 €',22,50,4),TX('boldcap','1000 €',78,50,5),G('stamp','stred',0,5,{text:'VS',size:14,rot:0,color:'#ffffff'}),TX('xkey',T('th.d.cheap'),null,86,14)]},
  th_first:{cat:'thumb',n:'th.first',dur:5,build:()=>[BG('bgbokeh','#0ea5e9','#f472b6',5),TX('thumb',T('th.d.first'),36,44,9),EM('😳','em_zoom',80,56,34,0,5)]},
  th_official:{cat:'thumb',n:'th.official',dur:5,build:()=>[BG('bgrays','#1e3a8a','#0f172a',5),TX('thumb',T('th.d.official'),null,44,8),EM('📢','em_shake',84,74,22,0,5)]},
  th_secret:{cat:'thumb',n:'th.secret',dur:5,build:()=>[BG('bgblobs','#0f172a','#6366f1',5),TX('hmarker',T('th.d.secret'),38,44,9),EM('🔒','em_wobble',80,56,30,0,5,'sparkles')]},
  th_cry:{cat:'thumb',n:'th.cry',dur:5,build:()=>[BG('bgsnow','#1e3a8a','#60a5fa',5),TX('thumb',T('th.d.cry'),36,40,9),EM('😭','em_shake',78,58,38,0,5,'tears')]},
  th_pet:{cat:'thumb',n:'th.pet',dur:5,build:()=>[BG('bghearts','#fde68a','#f472b6',5),TX('boldcap',T('th.d.pet'),36,44,6),EM('🐶','em_bounce',84,60,30,0,5,'hearts')]},
  th_car:{cat:'thumb',n:'th.car',dur:5,build:()=>[BG('bgretro','#0f172a','#ef4444',5),TX('xsport',T('th.d.car'),null,24,10),EM('🚗','em_zoom',50,66,32,0,5,'fire')]},
  th_speed:{cat:'thumb',n:'th.speed',dur:5,build:()=>[BG('bgstripes','#7c3aed','#22d3ee',5),TX('gamer','SPEEDRUN',null,30,7),G('timer','digital',0,5,{x:50,y:66,size:14,color:'#4ade80'}),EM('⚡','em_beat',84,74,20,0,5)]},
  th_tier:{cat:'thumb',n:'th.tier',dur:5,build:()=>[BG('bgdots','#111827','#6366f1',5),TX('fbangers','TIER LIST',null,22,6),...['S','A','B','C'].map((l,k)=>TX('xlabel',l,12+k*25,64,6,0,5)),EM('🤔','em_tilt',86,30,18,0,5)]},
  th_quiz:{cat:'thumb',n:'th.quiz',dur:5,build:()=>[BG('bgdots','#f59e0b','#ef4444',5),TX('thumb',T('th.d.quiz'),36,44,9),EM('❓','em_bounce',80,56,30,0,5,'sparkles')]},
  th_halloween:{cat:'thumb',n:'th.halloween',dur:5,build:()=>[BG('bgembers','#000000','#f97316',5),TX('xcreepster','HALLOWEEN',null,30,7),EM('🎃','em_beat',50,68,30,0,5,'fire')]},
  th_xmas:{cat:'thumb',n:'th.xmas',dur:5,build:()=>[BG('bgsnow','#991b1b','#166534',5),TX('ccinzeldeco',T('th.d.xmas'),36,44,9),EM('🎄','em_float',80,56,32,0,5,'sparkles')]},
  th_summer:{cat:'thumb',n:'th.summer',dur:5,build:()=>[BG('bgwaves','#0ea5e9','#facc15',5),TX('sunset',T('th.d.summer'),36,44,8),EM('☀️','em_spin',80,40,30,0,5)]},
  th_space:{cat:'thumb',n:'th.space',dur:5,build:()=>[BG('bgstars','#020617','#312e81',5),TX('taudiowide',T('th.d.space'),36,44,9),EM('🚀','em_float',80,56,30,0,5,'fire')]},
  th_couple:{cat:'thumb',n:'th.couple',dur:5,build:()=>[BG('bghearts','#f43f5e','#fda4af',5),TX('boldcap',T('th.d.couple'),null,22,11),EM('💑','em_beat',50,64,30,0,5,'hearts')]},
  th_podcast:{cat:'thumb',n:'th.podcast',dur:5,build:()=>[BG('bgrings','#111827','#f59e0b',5),TX('pbebas','PODCAST',36,38,5),TX('xlabel',T('th.d.ep'),36,62,14),EM('🎙️','em_tilt',80,54,30,0,5)]},
  th_live:{cat:'thumb',n:'th.live',dur:5,build:()=>[BG('bgparticles','#7f1d1d','#ef4444',5),G('rec','live',0,5,{text:T('wdg.live'),x:6,y:10,size:6}),TX('thumb',T('th.d.live'),null,50,8),EM('🔴','em_beat',50,78,14,0,5)]},
  th_win:{cat:'thumb',n:'th.win',dur:5,build:()=>[BG('bgconfetti','#ffffff','#ffffff',5),TX('victory',T('th.d.win'),36,44,8),EM('🏆','em_bounce',80,56,32,0,5,'sparkles')]},
  v_asmr:{cat:'vtpl',n:'vt.asmr',dur:10,build:()=>[BG('bgwaves','#7c3aed','#ec4899',3),TX('neon','ASMR',null,44,5,.2,2.8),EM('🎧','em_float',85,18,10,3,7),TX('subpill',T('vt.d.asmr'),null,88,22,3,7)]},
  v_diy:{cat:'vtpl',n:'vt.diy',dur:12,build:()=>[TX('fbangers','DIY',null,40,5,0,3),EM('🛠️','em_wobble',50,64,14,0,3),G('steps',null,3,6,{text:T('vt.d.diysteps'),y:50}),G('stamp','stgreen',9,3,{text:T('vt.d.done')})]},
  v_workout:{cat:'vtpl',n:'vt.workout',dur:14,build:()=>[TX('panton',T('vt.d.workout'),null,40,7,0,3),EM('💪','em_beat',50,64,16,0,3,'fire'),G('timer','ring',3,11,{mode:'down',from:30,x:86,y:16,size:8}),G('bullets','bcheck',3,11,{text:T('vt.d.moves'),y:30})]},
  v_makeup:{cat:'vtpl',n:'vt.makeup',dur:10,build:()=>[BG('bgbokeh','#f472b6','#fbcfe8',3),TX('sallura',T('vt.d.grwm'),null,44,8,.2,2.8),G('lower','clean',3.5,4,{name:T('vt.d.look'),title:T('vt.d.lookSub'),color:'#f472b6'}),EM('💄','em_tilt',86,20,10,4,6,'sparkles')]},
  v_podcast:{cat:'vtpl',n:'vt.podcast',dur:10,build:()=>[BG('bgrings','#111827','#f59e0b',4),TX('pbebas','PODCAST',null,40,6,.2,3.8),TX('xlabel',T('th.d.ep'),null,58,16,.8,3.2),G('lower','lbox',4.5,5.5,{name:T('vt.d.guest'),title:T('vt.d.guestSub'),color:'#f59e0b'})]},
  v_lyrics:{cat:'vtpl',n:'vt.lyrics',dur:12,build:()=>[TX('spacifico',T('vt.d.song'),null,40,8,0,3),...T('vt.d.lyrics').split('\n').slice(0,4).map((l,k)=>TX('subbig',l,null,82,14,3+k*2.25,2.25))]},
  v_countdown:{cat:'vtpl',n:'vt.countdown',dur:8,build:()=>[BG('bgrays','#111827','#6366f1',8),G('count','neon',0,4.5,{from:3}),G('confetti',null,4.5,3,{}),TX('thumb',T('vt.d.go'),null,46,6,4.5,3.5)]},
  v_review:{cat:'vtpl',n:'vt.review',dur:10,build:()=>[TX('boldcap',T('vt.d.review'),null,20,9,0,10),G('bullets','bcheck',1,6,{text:T('vt.d.pros'),y:36,color:'#22c55e'}),G('stars',null,7,3,{value:4,y:62,size:10}),G('sub','like',7.5,2.5,{x:80,y:84,text:T('wdg.like'),color:'#ff4d6d'})]},
  v_interview:{cat:'vtpl',n:'vt.interview',dur:12,build:()=>[TX('xtitle',T('vt.d.interview'),null,44,10,0,3),G('lower','lbar',3,4.5,{name:T('vt.d.guest'),title:T('vt.d.guestSub')}),G('lower','lbox',7.5,4.5,{name:T('vt.d.host'),title:T('vt.d.hostSub'),color:'#3b82f6'})]},
  v_day:{cat:'vtpl',n:'vt.day',dur:12,build:()=>[BG('bgflow','#f59e0b','#ec4899',3),TX('spacifico',T('vt.d.day'),null,44,7,.2,2.8),G('timeline',null,3,9,{text:T('vt.d.dayplan')})]},
  v_prank:{cat:'vtpl',n:'vt.prank',dur:10,build:()=>[TX('fbangers','PRANK',null,40,5,0,3),EM('😈','em_shake',50,64,16,0,3),G('rec','dot',3,5,{x:6,y:8}),G('stamp','stred',7,3,{text:T('vt.d.gotcha')}),EM('😂','em_burst',80,24,12,7,3,'tears')]},
  v_pet:{cat:'vtpl',n:'vt.pet',dur:10,build:()=>[BG('bghearts','#fde68a','#f472b6',3),TX('fchewy',T('vt.d.pet'),null,42,8,.2,2.8),G('pin',null,3.5,4,{text:T('vt.d.petname'),y:20}),G('hearts','heart',3,7,{}),EM('🐶','em_bounce',86,78,12,6,4,'hearts')]},
  v_lesson:{cat:'vtpl',n:'vt.lesson',dur:12,build:()=>[G('slide','schalk',0,12,{title:T('vt.d.lesson')}),G('defbox','tip',.5,5.5,{}),G('quiz','q4',6,6,{})]},
  v_halloween:{cat:'vtpl',n:'vt.halloween',dur:8,build:()=>[BG('bgembers','#000000','#f97316',8),TX('xcreepster','HALLOWEEN',null,40,7,.3,7.7),EM('🎃','em_beat',50,66,16,1,7,'fire'),G('aemoji','em_rain',4,4,{emoji:'🦇',size:8})]},
  v_xmas:{cat:'vtpl',n:'vt.xmas',dur:8,build:()=>[BG('bgsnow','#991b1b','#166534',8),TX('ccinzeldeco',T('vt.d.xmas'),null,40,9,.3,7.7),EM('🎅','em_bounce',50,66,16,1,7,'sparkles'),G('aemoji','em_rain',4,4,{emoji:'🎁',size:8})]},
  v_newyear:{cat:'vtpl',n:'vt.newyear',dur:9,build:()=>[BG('bgstars','#020617','#312e81',9),G('count','pop',0,4,{from:3}),TX('gold',T('vt.d.newyear'),null,44,8,4,5),G('confetti',null,4,3,{}),EM('🥂','em_pop',50,66,14,4.5,4.5,'sparkles')]},
  v_wedding:{cat:'vtpl',n:'vt.wedding',dur:10,build:()=>[BG('bgbokeh','#fde68a','#ffffff',10),TX('svibes',T('vt.d.wedding'),null,42,9,.3,9.7),TX('cplayfair',T('vt.d.names'),null,58,14,1,9),EM('💍','em_float',50,76,10,1.5,8.5,'sparkles')]},
  v_baby:{cat:'vtpl',n:'vt.baby',dur:9,build:()=>[BG('bghearts','#bae6fd','#fbcfe8',9),TX('fsniglet',T('vt.d.baby'),null,40,9,.3,8.7),EM('👶','em_bounce',50,64,16,1,8,'hearts'),G('confetti',null,3,3,{})]},
  v_sale:{cat:'vtpl',n:'vt.sale',dur:8,build:()=>[BG('bgstripes','#dc2626','#f59e0b',8),TX('thumb',T('vt.d.sale'),null,30,7,0,8),G('stamp','stred',.8,7.2,{text:'-50 %',size:16,y:62,color:'#ffffff'}),G('swipe','tap',4.5,3.5,{y:88,text:T('vt.d.shop')})]},
  v_event:{cat:'vtpl',n:'vt.event',dur:10,build:()=>[BG('bgplasma','#7c3aed','#06b6d4',10),TX('pbebas',T('vt.d.event'),null,34,7,.2,9.8),TX('xdate',T('vt.d.when'),null,54,14,1,9),G('pin',null,2,8,{text:T('wdg.defPlace'),y:72})]},
  v_outro:{cat:'vtpl',n:'vt.outro',dur:8,build:()=>[BG('bgflow','#111827','#ef4444',8),TX('boldcap',T('vt.d.thanks'),null,30,11,.2,7.8),G('sub','sub',1.5,3,{y:58}),G('sub','bell',4.5,3.5,{y:58}),EM('👋','em_wobble',84,22,12,.5,7.5)]},
  v_intro:{cat:'vtpl',n:'vt.intro',dur:5,build:()=>[BG('bgrays','#6366f1','#ec4899',5),TX('fbangers',T('vt.d.channel'),null,44,7,.3,4.7),TX('clean',T('vt.d.welcome'),null,60,18,1,4),G('confetti',null,.5,2.5,{y:30})]},
  v_poll:{cat:'vtpl',n:'vt.poll',dur:12,build:()=>[TX('xquestion',T('vt.d.poll'),null,20,10,0,12),G('truefalse','tfvrai',1,5,{y:50}),G('truefalse','tffaux',6,6,{text:T('vt.d.poll2'),y:50})]},
  v_ranking:{cat:'vtpl',n:'vt.ranking',dur:12,build:()=>[BG('bgdots','#111827','#6366f1',12),TX('fbangers',T('vt.d.ranking'),null,14,9,0,12),G('bullets','bnum',1,11,{text:T('vt.d.rank'),y:28,delay:1.4})]},
  v_fact:{cat:'vtpl',n:'vt.fact',dur:8,build:()=>[BG('bgdots','#0891b2','#6366f1',8),TX('xfact',T('vt.d.fact'),null,22,12,0,8),G('keyfig',null,1,7,{value:'70 %',label:T('vt.d.factlbl'),y:52}),EM('🤯','em_zoom',86,78,12,3,5)]},
  v_pov:{cat:'vtpl',n:'vt.pov',dur:6,build:()=>[TX('pov',T('vt.d.pov'),null,14,14,0,6),EM('😐','em_tilt',86,82,12,2,4)]},
  v_glowup:{cat:'vtpl',n:'vt.glowup',dur:10,build:()=>[G('stamp','stred',0,4,{text:T('expo.d.ta'),x:20,y:12,size:7,rot:0}),G('stamp','stgreen',5,5,{text:T('expo.d.tb'),x:20,y:12,size:7,rot:0}),TX('glittertxt','GLOW UP',null,50,6,4,1.5),EM('✨','em_burst',50,50,20,4,1.2)]},
  v_summer:{cat:'vtpl',n:'vt.summer',dur:10,build:()=>[BG('bgwaves','#0ea5e9','#facc15',3.5),TX('sunset',T('th.d.summer'),null,42,8,.2,3.3),EM('🌴','em_tilt',50,66,14,.5,3),G('pin',null,4,4,{text:T('vt.d.beach'),y:18}),G('aemoji','em_rain',7,3,{emoji:'☀️',size:8})]},
  v_qna:{cat:'vtpl',n:'vt.qna',dur:12,build:()=>[BG('bgblobs','#0f172a','#6366f1',3),TX('fbangers',T('vt.d.qna'),null,44,7,.2,2.8),EM('💬','em_pop',50,64,14,.4,2.6),G('chat','dark',3,4.5,{text:T('vt.d.q')}),G('flashcard','fcyellow',7.5,4.5,{q:T('vt.d.q'),a:T('vt.d.a')})]},
  v_launch:{cat:'vtpl',n:'vt.launch',dur:10,build:()=>[BG('bgstars','#020617','#1e1b4b',10),G('count','ring',0,5,{from:5}),EM('🚀','em_float',50,60,18,5,5,'fire'),TX('taudiowide',T('vt.d.launch'),null,24,10,5.2,4.8)]}
});
function tplSpecs(id,t0){return TPLS[id].build().map(s=>{
  if(s.k==='text'){const c=textClip(s.st,t0+s.start);c.dur=s.dur;Object.assign(c.p,s.p);return c}
  const d=WDEF[s.g]();if(s.s)d.p.st=s.s;Object.assign(d.p,s.p);return newClip({track:tk('over'),gen:s.g,start:t0+s.start,dur:s.dur,p:d.p})})}
function insertTpl(id){const made=tplSpecs(id,time),g=uid++;made.forEach(c=>{c.grp=g;clips.push(c)});sel=made[0].id;msel=new Set(made.slice(1).map(c=>c.id));commit();refresh();toast(T('tpl.added'))}
const WCATS=['tpl','hook','vtpl','thumb','expo','draw','bgfx','emoji','bar','count','timer','social','icon','viz','tag','data','fun','tools','shape','stick'];
const WLIB=[
  {c:'expo',tpl:'x_title',act:'xbuild',n:'xb.btn',tt:3},
  ...Object.keys(TPLS).map(k=>({c:TPLS[k].cat||'tpl',tpl:k,n:TPLS[k].n,tt:TPLS[k].dur*.6})),
  ...[['slide','sclean'],['slide','sdark'],['slide','snote'],['slide','schalk'],['slide','sgrid'],['slide','sgrad']].map(([g,s])=>({c:'expo',g,s,n:'wst.'+s,tt:1.2})),
  ...['bdot','bnum','bcheck','barrow','bcard'].map(s=>({c:'expo',g:'bullets',s,n:'wst.'+s,tp:{size:7,x:8,y:22,w:84,delay:.3},tt:2.5})),
  {c:'expo',g:'steps',s:'shor',n:'expo.g.steps',tp:{size:7,w:70,y:40},tt:3},
  {c:'expo',g:'timeline',n:'expo.g.timeline',tp:{size:6,w:92,y:50,delay:.5},tt:3},
  ...['def','retain','example','warn','tip'].map(s=>({c:'expo',g:'defbox',s,n:'wst.'+s,tp:{size:6.5,w:90},tt:1.5})),
  {c:'expo',g:'compare',n:'expo.g.compare',tp:{size:6,w:96,y:50},tt:3},
  {c:'expo',g:'keyfig',n:'expo.g.keyfig',tp:{size:26},tt:2},
  {c:'expo',g:'quote',n:'expo.g.quote',tp:{size:7,w:80},tt:4},
  {c:'expo',g:'sources',n:'expo.g.sources',tp:{size:5,x:5,y:15,w:90},tt:1.5},
  {c:'expo',g:'chapter',n:'expo.g.chapter',tp:{size:12},tt:1.5},
  {c:'expo',g:'agenda',n:'expo.g.agenda',p:{cur:2},tp:{size:7,x:6,y:18,w:88},tt:2.5},
  {c:'expo',g:'callout',n:'expo.g.callout',tp:{size:6,x:60,y:28,ax:35,ay:65},tt:1.5},
  {c:'expo',g:'marker',n:'expo.g.marker',tp:{w:70,h:16},tt:1},
  {c:'expo',g:'circleann',n:'expo.g.circleann',tp:{w:60,h:50,th:2},tt:1.2},
  {c:'expo',g:'pie',s:'pie',n:'wst.pie',tp:{size:30,x:34},tt:2},
  {c:'expo',g:'pie',s:'donut',n:'wst.donut',tp:{size:30,x:34},tt:2},
  ...['sc_marker','sc_high','sc_chalk','sc_neon','sc_brush','sc_dotted','sc_double','sc_rainbow'].map(s=>({c:'draw',g:'scribble',s,n:'wst.'+s,p:{color:{sc_marker:'#facc15',sc_high:'#a3e635',sc_chalk:'#ffffff',sc_neon:'#22d3ee',sc_brush:'#f43f5e',sc_dotted:'#ffffff',sc_double:'#38bdf8',sc_rainbow:'#ffffff'}[s]},tp:{th:2.5},tt:2})),
  ...Object.entries({'sc_pencil': '#e5e7eb', 'sc_crayon': '#f97316', 'sc_sketch': '#ffffff', 'sc_calli': '#ffffff', 'sc_ink': '#111827', 'sc_spray': '#22c55e', 'sc_glitter': '#f472b6', 'sc_shadow': '#facc15', 'sc_3d': '#38bdf8', 'sc_outline': '#facc15', 'sc_fire': '#f97316', 'sc_ice': '#22d3ee', 'sc_gold': '#fbbf24', 'sc_pastel': '#f9a8d4', 'sc_dash': '#ffffff', 'sc_dashdot': '#a3e635', 'sc_arrow': '#ef4444', 'sc_stitch': '#ef4444', 'sc_laser': '#ef4444', 'sc_electric': '#818cf8', 'sc_bubble': '#7dd3fc', 'sc_stars': '#facc15', 'sc_hearts': '#f43f5e', 'sc_ribbon': '#c084fc', 'sc_tape': '#fb7185', 'sc_water': '#3b82f6', 'sc_glow': '#a855f7', 'sc_pixel': '#22c55e', 'sc_comic': '#facc15', 'sc_duo': '#22d3ee'}).map(([s,color])=>({c:'draw',g:'scribble',s,n:'wst.'+s,p:{color},tp:{th:2.5},tt:2})),
  ...['bgflow','bgparticles','bgbokeh','bgwaves','bgretro','bgstars','bgblobs','bgstripes','bgaurora','bgtiles','bgmatrix','bgrays','bgrings','bgconfetti','bgsnow','bghearts','bgtv','bgdots','bgembers','bgplasma'].map(s=>({c:'bgfx',g:'animbg',s,n:'wst.'+s,tt:1.5})),
  ...[['😂','em_shake','none','fun.e.laugh'],['🔥','em_float','fire','fun.e.fire'],['❤️','em_beat','none','fun.e.heart'],['😭','em_float','tears','fun.e.cry'],['😮','em_pop','none','fun.e.wow'],['😎','em_tilt','sparkles','fun.e.cool'],['🤯','em_burst','none','fun.e.mind'],['🎉','em_burst','none','fun.e.party'],['👍','em_pop','none','fun.e.like'],['👀','em_shake','none','fun.e.eyes'],
      ['💯','em_zoom','none','fun.e.hundred'],['😍','em_float','hearts','fun.e.love'],['🤔','em_tilt','none','fun.e.think'],['😡','em_shake','fire','fun.e.angry'],['🥳','em_bounce','sparkles','fun.e.cele'],['⭐','em_spin','sparkles','fun.e.star'],['💀','em_wobble','none','fun.e.dead'],['🙏','em_beat','none','fun.e.please'],['😱','em_zoom','none','fun.e.scream'],['🚀','em_float','fire','fun.e.rocket'],
      ['🤣','em_bounce','none','fun.e.rofl'],['😅','em_float','tears','fun.e.sweat'],['🥺','em_wobble','tears','fun.e.puppy'],['😤','em_shake','fire','fun.e.huff'],['🤩','em_spin','sparkles','fun.e.starstruck'],['😴','em_float','none','fun.e.sleep'],['🤡','em_bounce','none','fun.e.clown'],['👻','em_float','none','fun.e.ghost'],
      ['💩','em_bounce','none','fun.e.poop'],['🐐','em_pop','sparkles','fun.e.goat'],['🧠','em_beat','none','fun.e.brain'],['💪','em_pop','sparkles','fun.e.strong'],['👏','em_shake','none','fun.e.clap'],['🙌','em_bounce','sparkles','fun.e.hands'],['🫶','em_beat','hearts','fun.e.hearthands'],['💥','em_burst','none','fun.e.boom'],
      ['⚡','em_shake','sparkles','fun.e.zap'],['🌈','em_float','sparkles','fun.e.rainbow'],['🍕','em_spin','none','fun.e.pizza'],['🎮','em_tilt','none','fun.e.game'],
      ['🎉','em_rain','none','fun.e.rainparty'],['⭐','em_rain','none','fun.e.rainstar'],['❄️','em_rain','none','fun.e.rainsnow'],['🍀','em_rain','none','fun.e.rainluck'],
      ['😂','em_rain','none','fun.e.rainlaugh'],['❤️','em_rain','none','fun.e.rainheart'],['💸','em_rain','none','fun.e.money'],['🔥','em_rain','none','fun.e.rainfire']].map(([emoji,s,extra,n])=>({c:'emoji',g:'aemoji',s,n,p:{emoji,extra},tp:{size:s==='em_rain'?14:42},tt:1.2})),
  ...[['q4','quiz'],['qlist','quiz']].map(([s,g])=>({c:'expo',g,s,n:'wst.'+s,tp:{size:6,w:94,y:8,reveal:1},tt:2})),
  ...['tfvrai','tffaux'].map(s=>({c:'expo',g:'truefalse',s,n:'wst.'+s,tp:{size:7,w:94,y:55,reveal:1},tt:2})),
  ...['fcblue','fcyellow'].map(s=>({c:'expo',g:'flashcard',s,n:'wst.'+s,tp:{size:9,w:86},tt:1})),
  ...['fbline','fbbox'].map(s=>({c:'expo',g:'fillblank',s,n:'wst.'+s,tp:{size:8,w:86,reveal:1},tt:2})),
  ...['lcline','lcarea'].map(s=>({c:'expo',g:'linechart',s,n:'wst.'+s,tp:{w:80,h:60},tt:2.5})),
  ...['gsemi','gring'].map(s=>({c:'expo',g:'gauge',s,n:'wst.'+s,tp:{size:s==='gring'?24:32,y:s==='gring'?44:60},tt:2})),
  ...['sbround','sbflat'].map(s=>({c:'expo',g:'skillbars',s,n:'wst.'+s,tp:{size:6,w:86,y:22},tt:2.5})),
  ...['v2','v3'].map(s=>({c:'expo',g:'venn',s,n:'wst.'+s,tp:{size:30},tt:2})),
  ...['mmradial','mmcards'].map(s=>({c:'expo',g:'mindmap',s,n:'wst.'+s,tp:{size:5.5,w:34},tt:3})),
  ...['cyarrows','cydots'].map(s=>({c:'expo',g:'cycle',s,n:'wst.'+s,tp:{size:5.5,w:30},tt:2.5})),
  ...['pytri','pystack'].map(s=>({c:'expo',g:'pyramid',s,n:'wst.'+s,tp:{size:6,w:90,h:86,y:50},tt:3})),
  ...['tbdark','tblight'].map(s=>({c:'expo',g:'table',s,n:'wst.'+s,tp:{size:5.5,w:92},tt:2.5})),
  ...['ispeople','ishearts'].map(s=>({c:'expo',g:'iconstat',s,n:'wst.'+s,tp:{size:9},tt:2.5})),
  ...['stred','stgreen'].map(s=>({c:'expo',g:'stamp',s,n:'wst.'+s,p:{text:()=>T(s==='stgreen'?'expo.d.stamp2':'expo.d.stamp')},tp:{size:11},tt:1})),
  ...['hdarrow','hdunder','hdbox','hdcross'].map(s=>({c:'expo',g:'handdraw',s,n:'wst.'+s,tp:{w:66,h:46,th:2},tt:1.2})),
  ...['line','pill','seg','dots','neon','label','ring'].map(s=>({c:'bar',g:'pbar',s,p:s==='ring'?{w:14,th:1.4,x:86,y:16}:s==='line'?{}:{w:80,y:93,th:s==='dots'?1.8:s==='pill'?1.6:1.3},tp:{x:50,y:50,w:s==='ring'?56:86,th:s==='ring'?8:7},tt:2})),
  ...['ring','pop','flip','neon','dots','bar'].map(s=>({c:'count',g:'count',s,tp:{size:46},tt:.35})),
  ...['box','digital','rec','minimal','ring'].map(s=>({c:'timer',g:'timer',s,p:s==='digital'?{color:'#4ade80'}:{},tp:{size:s==='ring'?13:15,y:50},tt:3.4})),
  {c:'social',g:'sub',s:'sub',n:'wdg.sub',tp:{size:10,y:45},tt:1},
  {c:'social',g:'sub',s:'bell',n:'wl.bell',tp:{size:9,y:45},tt:1},
  {c:'social',g:'sub',s:'follow',n:'wl.follow',p:{text:()=>T('wdg.follow'),done:()=>T('wdg.followDone'),color:'#3b82f6'},tp:{size:10,y:45},tt:1},
  {c:'social',g:'sub',s:'like',n:'wl.like',p:{text:()=>T('wdg.like'),color:'#ff4d6d'},tp:{size:11,y:42},tt:1.7},
  {c:'social',g:'sub',s:'share',n:'wl.share',p:{text:()=>T('wdg.share'),color:'#3b82f6'},tp:{size:11,y:42},tt:1},
  {c:'social',g:'sub',s:'notif',n:'wl.notif',p:{text:()=>T('wdg.newVideo')},tp:{size:11,y:50,text:''},tt:1.2},
  {c:'social',g:'rec',s:'dot',n:'wl.rec',tp:{size:11,x:12,y:50},tt:.2},
  {c:'social',g:'rec',s:'live',n:'wl.live',p:{text:()=>T('wdg.live')},tp:{size:10,x:10,y:50},tt:.2},
  {c:'tag',g:'lower',s:'lbar',n:'wl.lowerBar',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'lower',s:'clean',n:'wl.lowerClean',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'lower',s:'lbox',n:'wl.lowerBox',tp:{size:7,x:8,y:50},tt:1.5},
  {c:'tag',g:'chat',s:'light',n:'wl.chatLight',tp:{size:7,y:50,text:'OK !'},tt:1.7},
  {c:'tag',g:'chat',s:'dark',n:'wl.chatDark',tp:{size:7,y:50,text:'OK !'},tt:1.7},
  {c:'tag',g:'pin',n:'wdg.pin',tp:{size:8,y:50},tt:1.2},
  {c:'fun',g:'hearts',s:'heart',n:'wl.hearts',tp:{size:13,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'hearts',s:'star',n:'wl.starsUp',p:{color:'#facc15'},tp:{size:13,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'hearts',s:'bubble',n:'wl.bubbles',p:{color:'#7dd3fc'},tp:{size:14,x:50,y:96,h:85},tt:1.6},
  {c:'fun',g:'confetti',n:'wdg.confetti',tt:.6},
  {c:'fun',g:'pulse',s:'rings',n:'wl.pulse',tp:{size:30},tt:.7},
  {c:'fun',g:'pulse',s:'spot',n:'wl.spot',tp:{size:28},tt:.7},
  {c:'fun',g:'arrowp',s:'arrow',n:'wl.arrow',tp:{size:36,y:50,rot:0},tt:.3},
  {c:'fun',g:'arrowp',s:'chev',n:'wl.chevrons',tp:{size:36,y:50,rot:0},tt:.3},
  {c:'fun',g:'swipe',s:'up',n:'wl.swipeUp',tp:{size:9,y:62,text:''},tt:.5},
  {c:'fun',g:'swipe',s:'tap',n:'wl.tap',p:{text:()=>T('wdg.tapHere')},tp:{size:9,y:45,text:''},tt:.5},
  {c:'fun',g:'stars',n:'wdg.stars',tp:{size:15},tt:2},
  {c:'fun',g:'spin',s:'sring',n:'wl.spinRing',tp:{size:16,text:''},tt:.3},
  {c:'fun',g:'spin',s:'sdots',n:'wl.spinDots',tp:{size:16,text:''},tt:.3},
  {c:'data',g:'counter',s:'plain',n:'wl.counterPlain',tp:{size:20,to:1000},tt:1.6},
  {c:'data',g:'counter',s:'badge',n:'wl.counterBadge',p:{to:250,pre:'+',suf:' %'},tp:{size:15},tt:1.6},
  {c:'data',g:'chart',s:'bars',n:'wl.chartBars',tp:{w:80,h:70},tt:1.8},
  {c:'data',g:'chart',s:'hbars',n:'wl.chartH',tp:{w:80,h:70},tt:1.8},
  {c:'data',g:'ticker',s:'news',n:'wl.tickerNews',tp:{size:7,y:50},tt:1.2},
  {c:'data',g:'ticker',s:'plain',n:'wl.tickerPlain',tp:{size:7,y:50},tt:1.2},
  {c:'tools',g:'letterbox',n:'wl.letterbox',tt:2},
  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurRect',tp:{w:62,h:42},tt:1},
  {c:'tools',g:'blurz',s:'zblur',n:'wl.blurOval',p:{oval:true,w:16,h:30},tp:{oval:true,w:46,h:62},tt:1},
  {c:'tools',g:'blurz',s:'zpix',n:'wl.pixRect',tp:{w:62,h:42},tt:1},
  {c:'tools',g:'blurz',s:'zsolid',n:'wl.solidBar',p:{w:40,h:8},tp:{w:72,h:16},tt:1},
  ...['vbars','vwave','vcircle','vline','vvu'].map(s=>({c:'viz',g:'viz',s,tp:{y:50,w:s==='vvu'?70:84,h:s==='vcircle'?62:s==='vvu'?22:44,n:s==='vbars'?20:48},tt:1.3})),
  ...ICON_IDS.map((id,i)=>({c:'icon',g:'icon',s:id,p:{color:ICONS[id][1],look:['i_like','i_bell','i_play','i_send','i_share','i_hash'].includes(id)?'badge':['i_fire','i_star','i_heart','i_bolt','i_crown','i_trophy','i_smile'].includes(id)?'sticker':'solid',color2:{i_like:'#3b82f6',i_bell:'#ef4444',i_play:'#ef4444',i_send:'#0ea5e9',i_share:'#16a34a',i_hash:'#7c3aed'}[id]||'#7c3aed',...(['i_like','i_bell','i_play','i_send','i_share','i_hash'].includes(id)?{color:'#ffffff'}:{})},tp:{size:46},tt:1.1})),
  ...SHPLIB.map((s,i)=>({c:'shape',shp:i,n:s.n}))
];
const wlName=x=>T(x.n||'wst.'+x.s);
/* clip prêt à poser (thumb = réglages agrandis pour la vignette carrée) */
function wlClip(x,thumb){
  if(x.shp!=null){const s=SHPLIB[x.shp],p=Object.assign({shape:s.k,color:'#ffffff',fill:true,x:50,y:50,rot:0,op:100,sw:8,r:12,shadow:true},s.p);
    if(thumb){p.w=Math.min(78,p.w*2.4);p.sw=Math.max(p.sw,10);if(p.h)p.h=Math.min(78,p.h*2.4)}if(!p.h)p.h=Math.round(p.w*W/H*10)/10;return{id:-8,gen:'shape',start:0,dur:3,p}}
  const d=WDEF[x.g]();if(x.s)d.p.st=x.s;
  for(const[k,v]of Object.entries(x.p||{}))d.p[k]=typeof v==='function'?v():v;
  if(thumb){Object.assign(d.p,x.tp||{});if(x.g==='pbar')d.dur=4;if((x.c==='social'||x.c==='tag')&&d.p.size)d.p.size*=1.3}
  return{id:-8,gen:x.g,start:0,dur:d.dur,p:d.p};
}
/* vignette : l'élément est dessiné sur une image transparente ; s'il dépasse sur les côtés du carré, il est redessiné
   sur une image plus large puis recentré et réduit pour tenir (modèles : image plus large, réduite) ;
   le cadrage est calculé une fois puis gardé (aperçu animé stable) */
const wlCv=document.createElement('canvas'),wlG=wlCv.getContext('2d',{willReadFrequently:true});
function wlDraw(S,x,t,VW){
  const full=x.c==='tools',VH=S;wlCv.width=VW;wlCv.height=VH;wlG.clearRect(0,0,VW,VH);
  if(full)txBg(wlG,S); // flou, pixels, bandes : ils agissent sur l'image dessous, donc dessinés sur le fond
  const sv=[W,H,ctx];W=VW;H=VH;ctx=wlG;
  try{if(x.tpl){for(const c of tplSpecs(x.tpl,0)){if(t>=c.start&&t<c.start+c.dur){if(c.gen)drawGenOverlay(c,t);else drawText(c,t,wlG)}boxes.delete(c.id)}}
    else{const c=wlClip(x,true);drawGenOverlay(c,Math.min(t,c.dur-.02))}}
  finally{W=sv[0];H=sv[1];ctx=sv[2];boxes.delete(-8)}
}
function wlCols(VW,VH){ // première et dernière colonnes non transparentes
  const d=wlG.getImageData(0,0,VW,VH).data;let x0=VW,x1=-1;
  for(let yy=0;yy<VH;yy+=2)for(let xx=0;xx<VW;xx++)if(d[(yy*VW+xx)*4+3]>12){if(xx<x0)x0=xx;if(xx>x1)x1=xx}
  return[x0,x1];
}
function wlFit(S,x,t){
  if(x.tpl){const r=['expo','thumb','vtpl'].includes(TPLS[x.tpl].cat)?16/9:1.4;return{VW:Math.round(S*r),k:1/r,dx:0,dy:S*(1-1/r)/2}}
  const one={VW:S,k:1,dx:0,dy:0};
  if(x.c==='tools'||x.shp!=null||x.g==='slide'||x.g==='animbg'||x.s==='em_rain')return one;
  wlDraw(S,x,t,S);let[x0,x1]=wlCols(S,S);
  if(x1<0||(x0>1&&x1<S-2))return one; // tient déjà dans le carré
  const VW=S*2;wlDraw(S,x,t,VW);[x0,x1]=wlCols(VW,S);if(x1<0)return one;
  const k=Math.min(1,S*.9/(x1-x0+1));
  return{VW,k,dx:S/2-(x0+x1)/2*k,dy:S*(1-k)/2};
}
/* fond des vignettes (Formes et Texte) : pas de photo, une couleur assortie à l'élément (sa teinte dominante, en sombre) ;
   élément blanc ou gris → fond sombre neutre, élément sombre → fond clair. Les outils (flou, pixels, bandes) gardent la photo :
   ils agissent sur l'image dessous. */
function toneOf(g0,VW,VH){
  const d=g0.getImageData(0,0,VW,VH).data;let r=0,g=0,b=0,n=0,lum=0,m=0;
  for(let i=0;i<d.length;i+=16){
    if(d[i+3]<110)continue;const R=d[i],G=d[i+1],B=d[i+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B);
    lum+=.299*R+.587*G+.114*B;m++;
    const sat=mx?(mx-mn)/mx:0;if(sat<.28||mx<45)continue;r+=R*sat;g+=G*sat;b+=B*sat;n+=sat;
  }
  if(!m)return{mode:'dark'};
  if(n<m*.08)return{mode:lum/m<90?'light':'dark'}; // presque pas de couleur
  r/=n;g/=n;b/=n;const mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,dl=mx-mn;
  let h=0;if(dl){if(mx===r/255)h=((g-b)/255/dl)%6;else if(mx===g/255)h=(b-r)/255/dl+2;else h=(r-g)/255/dl+4}
  return{mode:'color',h:Math.round((h*60+360)%360),s:Math.min(1,dl/(1-Math.abs(mx+mn-1)||1))};
}
function wlBg(g,S,b){
  const gr=g.createRadialGradient(S/2,S*.42,S*.05,S/2,S/2,S*.78);
  if(b.mode==='light'){gr.addColorStop(0,'#f6f4fb');gr.addColorStop(1,'#cfcadb')}
  else if(b.mode==='dark'){gr.addColorStop(0,'#3a3546');gr.addColorStop(1,'#16141d')}
  else{gr.addColorStop(0,'hsl('+b.h+','+Math.round(25+40*b.s)+'%,30%)');gr.addColorStop(1,'hsl('+b.h+','+Math.round(20+30*b.s)+'%,11%)')}
  g.fillStyle=gr;g.fillRect(0,0,S,S);
}
function wlFrame(g2,S,x,t){
  if(!x._fit||x._fit.S!==S)x._fit=Object.assign(wlFit(S,x,t),{S});
  const f=x._fit;wlDraw(S,x,t,f.VW);
  if(f.bg===undefined)f.bg=x.c==='tools'?null:toneOf(wlG,f.VW,S); // calculée une fois : le fond ne change pas pendant l'aperçu animé
  g2.save();g2.setTransform(1,0,0,1,0,0);g2.globalAlpha=1;g2.filter='none';g2.globalCompositeOperation='source-over';
  if(f.bg)wlBg(g2,S,f.bg);else txBg(g2,S);
  g2.drawImage(wlCv,f.dx,f.dy,f.VW*f.k,S*f.k);g2.restore();
}
let wlCat='all',wlThumbs=null,wlAnim=null;
function renderWL(){
  const L=$('#wlist');if(!L)return;
  if(typeof txPhoto==='undefined'){setTimeout(renderWL,100);return} // 15-panels.js pas encore chargé
  if(!txPhoto)renderTextTab();
  const vis=!$('#t-stick').hidden,lang=document.documentElement.lang||'';
  if(vis&&txPhoto&&txPhoto.done&&(!wlThumbs||wlThumbs.lang!==lang)){
    const mine={lang};wlThumbs=mine;WLIB.forEach(x=>delete x._fit);
    thumbJobs(WLIB.map((x,i)=>[i,()=>{const k=document.createElement('canvas');k.width=k.height=TX_S;wlFrame(k.getContext('2d'),TX_S,x,x.tt??1);return k.toDataURL('image/jpeg',.88)}]),
      (i,url)=>{mine[i]=url;const el=$(`#wlist [data-wl="${i}"] i`);if(el)el.style.backgroundImage=`url(${url})`},()=>wlThumbs===mine);
  }else if(vis&&txPhoto&&!txPhoto.done)setTimeout(renderWL,300);
  const cats0=wlFav.length?['fav',...WCATS]:WCATS;if(wlCat==='fav'&&!wlFav.length)wlCat='all';
  $('#wcats').innerHTML=['all',...cats0].map(k=>`<button data-wlcat="${k}" class="${k===wlCat?'on':''}">${T(k==='all'?'lookcat.all':'wcat.'+k)}</button>`).join('');
  const th=i=>wlThumbs&&wlThumbs[i]?` style="background-image:url(${wlThumbs[i]})"`:'';
  const item=i=>`<button data-wl="${i}" class="${wlFav.includes(wlKey(WLIB[i]))?'fav':''}" title="${esc(wlName(WLIB[i]))}"><i${th(i)}></i><span>${esc(wlName(WLIB[i]))}</span></button>`;
  const nq=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),q=nq(($('#wlq')&&$('#wlq').value)||'').trim();
  if(q){const hits=WLIB.map((x,i)=>[x,i]).filter(([x])=>nq(wlName(x)+' '+T('wcat.'+x.c)).includes(q));L.innerHTML=hits.length?`<div class="filt">${hits.map(([,i])=>item(i)).join('')}</div>`:`<p class="hint">${T('wl.noResult')}</p>`;$('#emoBox').hidden=true;return}
  L.innerHTML=(wlCat==='all'?cats0:[wlCat]).filter(k=>k!=='stick').map(cat=>`<h3>${T('wcat.'+cat)}</h3><div class="filt">${WLIB.map((x,i)=>(cat==='fav'?wlFav.includes(wlKey(x)):x.c===cat)?item(i):'').join('')}</div>`).join('');
  $('#emoBox').hidden=!(wlCat==='all'||wlCat==='stick');
}
function wlStop(){if(!wlAnim)return;cancelAnimationFrame(wlAnim.raf);wlAnim.c.remove();wlAnim=null}
function wlHover(b){
  wlStop();const x=WLIB[+b.dataset.wl],i=b.querySelector('i');if(!x||!i||x.shp!=null)return;
  const c=document.createElement('canvas');c.width=c.height=TX_S;c.className='fxlive';i.appendChild(c);
  const g=c.getContext('2d'),t0=performance.now(),dur=x.tpl?TPLS[x.tpl].dur:wlClip(x,true).dur,span=Math.min(dur,6)+.6;let last=0;
  const loop=now=>{if(!wlAnim||wlAnim.c!==c)return;if(now-last>33){last=now;const e=((now-t0)/1000)%span;try{wlFrame(g,TX_S,x,Math.min(e,dur-.02))}catch(err){}}wlAnim.raf=requestAnimationFrame(loop)};
  wlAnim={c,raf:requestAnimationFrame(loop)};
}
$('#t-stick').addEventListener('mouseover',e=>{const b=e.target.closest('[data-wl]');if(b&&(!wlAnim||!b.contains(wlAnim.c)))wlHover(b)});
$('#t-stick').addEventListener('mouseleave',wlStop);
$('#t-stick').addEventListener('mouseout',e=>{const b=e.target.closest('[data-wl]');if(b&&!b.contains(e.relatedTarget))wlStop()});
$('#wcats').addEventListener('click',e=>{const b=e.target.closest('[data-wlcat]');if(!b)return;wlCat=b.dataset.wlcat;if($('#wlq'))$('#wlq').value='';renderWL()});
$('#wlq').addEventListener('input',()=>renderWL());
$('#wlist').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-wl]');if(!b)return;e.preventDefault();const x=WLIB[+b.dataset.wl];showCtx([{title:wlName(x)},{label:wlFav.includes(wlKey(x))?'fav.remove':'fav.add',fn:()=>wlToggleFav(x)}],e.clientX,e.clientY)});
$('#wlist').addEventListener('click',e=>{
  const b=e.target.closest('[data-wl]');if(!b)return;const x=WLIB[+b.dataset.wl];if(x.act){WACT[x.act]();return}if(x.tpl){insertTpl(x.tpl);return}const c=wlClip(x,false);
  if(x.g==='pbar'){c.start=0;c.dur=Math.max(1,total()||10)}else c.start=time;
  add(newClip({track:tk('over'),gen:c.gen,start:c.start,dur:c.dur,p:c.p}));
});
window.addEventListener('dedcut-lang',()=>{wlThumbs=null;renderWL()});
setTimeout(renderWL,0); // après la fin du chargement du moteur (txPhoto, TX_S sont définis plus bas)
$('#shplist').addEventListener('click',e=>{
  const b=e.target.closest('[data-shp]');if(!b)return;const s=SHPLIB[+b.dataset.shp],p=Object.assign({shape:s.k,color:'#ffffff',fill:true,x:50,y:50,rot:0,op:100,sw:8,r:12,shadow:true},s.p);
  if(!p.h)p.h=Math.round(p.w*W/H*10)/10; // forme ronde quel que soit le format
  add(newClip({track:tk('over'),gen:'shape',start:time,dur:3,p}));
});

/* ---------- couleur de l'interface ---------- */
const THEMES={violet:['Violet','#a78bfa','#22d3ee','167,139,250'],cyan:['Cyan','#22d3ee','#818cf8','34,211,238'],rose:['Rose','#f472b6','#fb923c','244,114,182'],
  orange:['Orange','#fb923c','#facc15','251,146,60'],vert:[T('chroma.green'),'#4ade80','#22d3ee','74,222,128'],rouge:['Rouge','#f43f5e','#a78bfa','244,63,94']};
let ACC='#a78bfa';
function setTheme(k){ACCK=THEMES[k]?k:'violet';
  const t=THEMES[k]||THEMES.violet,r=document.documentElement.style;
  r.setProperty('--ac',t[1]);r.setProperty('--ac2',t[2]);r.setProperty('--acrgb',t[3]);ACC=t[1];
  try{localStorage.setItem('dedcut-theme',k)}catch(e){}
  $$('#themes button').forEach(b=>b.classList.toggle('on',b.dataset.th===k));
}
function renderThemes(){$('#themes').innerHTML=Object.entries(THEMES).map(([k,t])=>'<button data-th="'+k+'" class="'+(k===ACCK?'on':'')+'"><i style="background:linear-gradient(135deg,'+t[1]+','+t[2]+')"></i>'+esc(T('themes.'+k))+'</button>').join('')}
let ACCK='violet';
renderThemes();
$('#bTheme').onclick=e=>{const p=$('#themes'),r=e.currentTarget.getBoundingClientRect();p.hidden=!p.hidden;p.style.top=(r.bottom+6)+'px';p.style.left=Math.max(8,r.right-226)+'px'};
$('#themes').addEventListener('click',e=>{const b=e.target.closest('[data-th]');if(b){setTheme(b.dataset.th);$('#themes').hidden=true}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#themes,#bTheme'))$('#themes').hidden=true});
try{setTheme(localStorage.getItem('dedcut-theme')||'violet')}catch(e){setTheme('violet')}

$('#recGo').onclick=()=>startRec();
$('#recStop').onclick=()=>stopRec();
$('#recInd').onclick=()=>showTab('rec');
$('#srcRefresh').onclick=loadSources;
$('#srcList').addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(!b)return;recSrc=b.dataset.src;$$('#srcList .src').forEach(x=>x.classList.toggle('on',x===b))});
$('#recMic').onchange=startMeter;
$('#recMicVol').oninput=e=>{$('#recMicV').textContent=e.target.value+' %';if(recState&&recState.micGain)recState.micGain.gain.value=e.target.value/100};
$('#recFolder').onclick=e=>{e.preventDefault();if(inApp)appFetch('app://dedcut/__rec?op=folder',{method:'POST'});else toast(T('msg.onlyInApp'))};

/* ---------- compteur : taper un moment (90 · 1:30 · 1:30:15 = minutes:secondes:images) ---------- */
var tcEditing=false;
function parseTC(s){
  s=String(s).trim().replace(',','.');if(!s)return null;
  const p=s.split(':');if(p.length>3||p.some(x=>x===''||isNaN(+x)))return null;
  const n=p.map(Number);
  if(n.length===1)return n[0];
  if(n.length===2)return n[0]*60+n[1];
  return n[0]*60+n[1]+n[2]/projFps;
}
$('#tc').addEventListener('click',()=>{
  if(tcEditing)return;tcEditing=true;pause();
  const box=$('#tc');box.innerHTML=`<input id="tcIn" type="text" spellcheck="false" value="${fmtTC(time)}">`;
  const inp=$('#tcIn');inp.focus();inp.select();
  const done=ok=>{if(!tcEditing)return;tcEditing=false;
    if(ok){const v=parseTC(inp.value);if(v==null)toast(T('tc.bad'));else seek(clamp(v,0,total()))}
    box.innerHTML='<b>'+fmtTC(time)+'</b> / '+fmtTC(total())};
  inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')done(true);if(ev.key==='Escape')done(false)});
  inp.addEventListener('blur',()=>done(true));
});

/* ---------- coller une image / une vidéo / un son depuis le presse-papiers (Ctrl+V) ---------- */
let pasteWant=0;
document.addEventListener('paste',async e=>{
  if($('#app').classList.contains('imgmode')||$('#app').classList.contains('mumode'))return; // les espaces Image et Musique gèrent leur propre « coller »
  if(/INPUT|TEXTAREA/.test((e.target&&e.target.tagName)||'')||window.dedcutHomeVisible)return;
  const files=[...((e.clipboardData&&e.clipboardData.files)||[])].filter(f=>/^(image|video|audio)\//.test(f.type));
  if(!files.length)return;
  e.preventDefault();clearTimeout(pasteWant);pasteWant=0;
  const D=new Date(),z=x=>String(x).padStart(2,'0'),stamp=D.getFullYear()+'-'+z(D.getMonth()+1)+'-'+z(D.getDate())+' '+z(D.getHours())+'-'+z(D.getMinutes())+'-'+z(D.getSeconds());let n=0;
  for(const f of files){
    const generic=/^(image|blob)\.\w+$/i.test(f.name)||!f.name;
    const ext=(f.type.split('/')[1]||'png').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'');
    const file=generic?new File([f],T('paste.name',{date:stamp})+(files.length>1?' '+(n+1):'')+'.'+ext,{type:f.type}):f;
    try{await addGenerated(file);n++}catch(x){}
  }
  if(n){showTab('media');toast(T('paste.done',{count:n}))}
});

/* ---------- diaporama automatique : photos choisies posées à la suite (durée, transition, mouvement, musique) ---------- */
let slideSel=null;
function slideOpen(){
  const ims=media.filter(m=>m.type==='image'&&!m.missing);if(!ims.length){toast(T('slide.none'));return}
  if(!slideSel)slideSel=new Set(ims.map(m=>m.id));for(const m of ims)if(!slideSel.has(m.id)&&!slideSel.seen)slideSel.add(m.id);
  const auds=media.filter(m=>m.type==='audio'&&!m.missing);
  let o=$('#slidedlg');if(!o){o=document.createElement('div');o.id='slidedlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',ev=>{if(ev.target===o)o.remove()});
    o.addEventListener('change',ev=>{const id=ev.target.dataset.sl;if(id!=null){if(ev.target.checked)slideSel.add(+id);else slideSel.delete(+id);slideSel.seen=true;slideCount()}});
    o.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.slx!=null)o.remove();if(b.dataset.slall!=null){const on=b.dataset.slall==='1';media.filter(m=>m.type==='image').forEach(m=>on?slideSel.add(m.id):slideSel.delete(m.id));slideSel.seen=true;slideOpen()}if(b.dataset.slgo!=null)slideMake()});
  }
  const sel2=(id,opts,v)=>`<select id="${id}">${opts.map(([k,n])=>`<option value="${k}" ${k===v?'selected':''}>${esc(n)}</option>`).join('')}</select>`;
  o.innerHTML=`<div class="kbbox slbox"><div class="kbhead"><h3>${T('slide.title')}</h3><button class="sm" data-slx>${T('kb.close')}</button></div>
    <div class="slbar"><span id="slCount" class="hint"></span><span class="sp"></span><button class="sm" data-slall="1">${T('slide.all')}</button><button class="sm" data-slall="0">${T('slide.nothing')}</button></div>
    <div class="slgrid">${ims.map(m=>`<label class="slit"><img src="${esc(m.thumb||m.url||'')}" alt=""><input type="checkbox" data-sl="${m.id}" ${slideSel.has(m.id)?'checked':''}></label>`).join('')}</div>
    <div class="slopts">
      <div class="fld"><label>${T('slide.dur')}</label>${sel2('slDur',[...[1.5,2,3,4,5,6].map(v=>[String(v),fmtN(v)+' s']),['beat','♪ '+T('slide.beat')]],'3')}</div>
      <div class="fld"><label>${T('slide.trans')}</label>${sel2('slTr',['none','fade','slide','zoom','wipe','black','flash'].map(k=>[k,T(TRN[k])]),'fade')}</div>
      <div class="fld"><label>${T('slide.move')}</label>${sel2('slMv',[['none',T('slide.moveNone')],['in',T('slide.moveIn')],['alt',T('slide.moveAlt')]],'alt')}</div>
      <div class="fld"><label>${T('slide.order')}</label>${sel2('slOr',[['media',T('slide.orderMedia')],['rand',T('slide.orderRandom')]],'media')}</div>
      <div class="fld"><label>${T('slide.music')}</label>${sel2('slMu',[['',T('slide.noMusic')],...auds.map(m=>[String(m.id),m.name])],'')}</div>
      <label class="chk"><span>${T('slide.fit')}</span><input type="checkbox" id="slFit"></label>
    </div>
    <div class="kbfoot"><button class="pri" data-slgo>${T('slide.create')}</button></div></div>`;
  slideCount();
}
function slideCount(){const n=media.filter(m=>m.type==='image'&&slideSel.has(m.id)).length;const el=$('#slCount');if(el)el.textContent=T('slide.count',{count:n});const g=$('#slidedlg [data-slgo]');if(g)g.disabled=!n}
async function slideMake(){
  let ims=media.filter(m=>m.type==='image'&&!m.missing&&slideSel.has(m.id));if(!ims.length)return;
  if($('#slOr').value==='rand')ims=ims.map(m=>[Math.random(),m]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
  const mu=mById(+$('#slMu').value),tr=$('#slTr').value,mv=$('#slMv').value,onBeat=$('#slDur').value==='beat';
  let per=+$('#slDur').value||3;if(mu&&$('#slFit').checked&&mu.duration>0)per=clamp(mu.duration/ims.length,1,15);
  /* au rythme : chaque photo change sur un temps fort de la musique */
  let durs=null;
  if(onBeat){if(!mu){toast(T('slide.beatNeed'));return}toast(T('audio.beatAnalyzing'));const buf=await decodeAudio(mu);
    const bt=buf?beatTimes(buf,0,buf.duration,1,0):[],cuts=[];let last=0;for(const b of bt)if(b-last>=.45){cuts.push(b);last=b}
    if(cuts.length<2){toast(T('audio.noBeat'));return}
    const gap=cuts.length>1?(cuts[cuts.length-1]-cuts[0])/(cuts.length-1):1;durs=ims.map((_,i)=>i<cuts.length?cuts[i]-(i?cuts[i-1]:0):gap);per=gap}
  const v=tk('video'),t0=endOf(v);let t=t0;
  ims.forEach((m,i)=>{if(durs)per=Math.max(.2,durs[i]);
    const c=newClip({track:v,mid:m.id,start:t,dur:per,p:{vol:100,fit:'cover',amt:60,fx:noFx(),tf:{zoom:100,x:0,y:0,rot:0,flip:false}}});
    if(tr!=='none'&&i>0){c.p.tin=tr;c.p.tdur=Math.min(.8,per/3)}
    if(mv!=='none'){const base=Object.fromEntries(KFK(c).map(k=>[k,gv(c,k)])),A0={...base},B0={...base},kind=mv==='in'?0:i%3;
      if(kind===0){A0['p.tf.zoom']=100;B0['p.tf.zoom']=116}else if(kind===1){A0['p.tf.zoom']=116;B0['p.tf.zoom']=100}else{A0['p.tf.zoom']=B0['p.tf.zoom']=114;A0['p.tf.x']=i%2?-6:6;B0['p.tf.x']=i%2?6:-6}
      c.kf=[{t:0,v:A0},{t:per,v:B0}]}
    clips.push(c);t+=per;
  });
  if(mu){const d=Math.min(mu.duration||t-t0,t-t0);clips.push(placeFree(newClip({track:tk('audio'),mid:mu.id,start:t0,dur:d,p:{vol:100,afout:Math.min(2,d/4)}})))}
  sel=null;msel.clear();commit();refresh();$('#slidedlg')?.remove();toast(T('slide.done',{count:ims.length}));
}
$('#aSlide').onclick=slideOpen;

/* ---------- accroches TikTok (v4.36) : un texte fort pour les 3 premières secondes ---------- */
/* texte d'accroche : coupé en 2 lignes s'il est long, et taille calculée pour tenir dans la largeur (vertical ou horizontal) */
const HK=(st,key,y,start,dur)=>{let t=T(key);if([...t].length>14){const mid=t.length/2;let best=-1;for(let i=0;i<t.length;i++)if(t[i]===' '&&(best<0||Math.abs(i-mid)<Math.abs(best-mid)))best=i;if(best>0)t=t.slice(0,best)+'\n'+t.slice(best+1)}
  const ln=Math.max(...t.split('\n').map(l=>[...l].length)),wide=/[\u3000-\u9fff\uac00-\ud7af]/.test(t)?1.05:.66;
  return {k:'text',st,start:start??0,dur:dur??3,p:{text:t,y,size:Math.round(Math.min(Math.min(W,H)/9,W*.88/(ln*wide)))}}};
Object.assign(TPLS,{
  hk_end:{cat:'hook',n:'hook.end',dur:3,build:()=>[HK('hook','hook.c.end',18),EM('👀','em_shake',50,34,12,.2,2.8)]},
  hk_nobody:{cat:'hook',n:'hook.nobody',dur:3,build:()=>[HK('hook','hook.c.nobody',18),EM('🤫','em_tilt',50,34,12,.2,2.8)]},
  hk_tips:{cat:'hook',n:'hook.tips',dur:3,build:()=>[HK('hook','hook.c.tips',18),EM('💡','em_beat',50,34,12,.2,2.8,'sparkles')]},
  hk_mistake:{cat:'hook',n:'hook.mistake',dur:3,build:()=>[HK('hook','hook.c.mistake',18),EM('❌','em_shake',50,34,12,.2,2.8)]},
  hk_wait:{cat:'hook',n:'hook.wait',dur:3,build:()=>[HK('hook','hook.c.wait',18),EM('⏳','em_wobble',50,34,12,.2,2.8)]},
  hk_save:{cat:'hook',n:'hook.save',dur:3,build:()=>[HK('hook','hook.c.save',18),EM('📌','em_bounce',50,34,12,.2,2.8)]},
  hk_part:{cat:'hook',n:'hook.part',dur:3,build:()=>[HK('pill','hook.c.part',9),HK('hook','hook.c.story',22)]},
  hk_secret:{cat:'hook',n:'hook.secret',dur:3,build:()=>[HK('hook','hook.c.secret',18),EM('🔥','em_beat',50,34,12,.2,2.8,'fire')]}
});

/* ---------- velocity edit (v4.36) : la vidéo accélère puis ralentit sur chaque temps fort ---------- */
async function velocityEdit(c){
  const m=c&&c.mid&&mById(c.mid);if(!m||m.type==='image'||c.p.rev){toast(T('ramp.no'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  const t0=c.start,t1=c.start+c.dur;let bts=markers.filter(x=>x>t0+.15&&x<t1-.15);
  if(bts.length<2){/* pas assez de repères : on cherche les temps forts de la musique placée sous la vidéo */
    const au=clips.filter(x=>isAud(x)&&x.mid&&x.start<t1&&x.start+x.dur>t0).sort((x,y)=>y.dur-x.dur)[0]||(m.type==='video'?c:null);
    if(au){toast(T('audio.beatAnalyzing'));const buf=await decodeAudio(mById(au.mid));if(buf){const r=au.p.rate||1;bts=beatTimes(buf,au.in,au.in+au.dur*r,r,au.start).filter(x=>x>t0+.15&&x<t1-.15)}}
  }
  const cuts=[];let last=t0;for(const b of bts)if(b-last>=.3){cuts.push(b);last=b}
  if(cuts.length<2){toast(T('vel.need'));return}
  const gap=(cuts[cuts.length-1]-cuts[0])/(cuts.length-1),r0=c.p.rate||1,srcEnd=c.in+c.dur*r0,oldEnd=t1,g=c.grp||uid++,parts=[];
  let src=c.in,t=t0,k=0,prev=t0;
  while(src<srcEnd-.02&&parts.length<400){
    const nb=k<cuts.length?cuts[k]:prev+gap,L=Math.max(.15,nb-prev);prev=nb;k++;
    for(const[f,rr]of[[.35,2.6],[.65,.55]]){if(src>=srcEnd-.02)break;const r=clamp(r0*rr,.1,8);let d=f*L;if(src+d*r>srcEnd)d=(srcEnd-src)/r;
      const n=JSON.parse(JSON.stringify(c));n.id=uid++;n.in=src;n.p.rate=r;n.dur=d;n.start=t;delete n.kf;n.grp=g;n.p.tin='none';n.p.tout='none';n.p.afin=0;n.p.afout=0;parts.push(n);src+=d*r;t+=d}
  }
  if(!parts.length)return;parts[0].p.tin=c.p.tin;parts[parts.length-1].p.tout=c.p.tout;
  const delta=t-oldEnd;clips=clips.filter(x=>x!==c);clips.forEach(x=>{if(x.track===c.track&&x.start>=oldEnd-.001)x.start=Math.max(0,x.start+delta)});
  clips.push(...parts);sel=parts[0].id;msel=new Set(parts.slice(1).map(n=>n.id));commit();refresh();toast(T('vel.done'));
}
/* ---------- boucle parfaite (v4.36) : le début de la vidéo apparaît en fondu à la fin, la fin se raccorde au début ---------- */
function perfectLoop(c){
  const vis=clips.filter(x=>x.mid&&isVid(x)&&!x.gen&&x.track===c.track).sort((a,b)=>a.start-b.start),F=vis[0];
  if(!F){toast(T('loopx.no'));return}
  const E=clips.filter(x=>!isAud(x)).reduce((a,x)=>Math.max(a,x.start+x.dur),0),m=mById(F.mid),r=F.p.rate||1;
  let L=Math.min(.8,(E-F.start)/4);if(m&&m.type!=='image'&&m.duration)L=Math.min(L,(m.duration-F.in)/r);if(L<.1||E-L<=F.start+.1){toast(T('loopx.no'));return}
  const n=JSON.parse(JSON.stringify(F));n.id=uid++;n.start=E-L;n.dur=L;n.p.tin='none';n.p.tout='none';n.p.vol=0;n.p.afin=0;n.p.afout=0;delete n.kf;delete n.grp;
  n.track=insertTrack('video');
  const base=Object.fromEntries(KFK(n).map(k=>[k,gv(n,k)]));n.kf=[{t:0,v:{...base,'p.op':0}},{t:L,v:{...base,'p.op':100}}];
  clips.push(n);sel=n.id;msel.clear();commit();refresh();toast(T('loopx.done'));
}
const TKACT={velocity:velocityEdit,loop:perfectLoop};

/* ---------- texte en voix : moteur vocal intégré à Windows (src-tauri/src/tts.rs), rien ne sort du PC ---------- */
let ttsList=null;
async function ttsLoad(){
  const s=$('#ttsVoice');if(!s)return;
  if(!FS||!FS.ttsVoices){s.innerHTML=`<option value="">${esc(T('tts.onlyApp'))}</option>`;$('#ttsGo').disabled=true;return}
  if(!ttsList){try{ttsList=await FS.ttsVoices()}catch(x){ttsList=[]}}
  ttsFill();
}
function ttsFill(){
  const s=$('#ttsVoice');if(!s||!ttsList)return;const cur=s.value,lg=(document.documentElement.lang||'fr').slice(0,2);
  if(!ttsList.length){s.innerHTML=`<option value="">${esc(T('tts.noVoice'))}</option>`;return}
  // rangées par langue : celle de DedCut d'abord ; nom de la langue écrit dans la langue de DedCut
  let dn=null;try{dn=new Intl.DisplayNames([document.documentElement.lang||'fr'],{type:'language'})}catch(x){}
  const langs=[...new Set(ttsList.map(v=>v.lang))].sort((a,b)=>(b.startsWith(lg)?1:0)-(a.startsWith(lg)?1:0)||a.localeCompare(b));
  const opt=v=>`<option value="${esc(v.name)}">${esc(v.name.replace(/^Microsoft\s+|\s+Desktop$/g,''))}${v.gender==='Female'?' · '+T('tts.female'):v.gender==='Male'?' · '+T('tts.male'):''}</option>`;
  s.innerHTML=langs.map(l=>{let n=l;try{n=dn?dn.of(l):l}catch(x){}return `<optgroup label="${esc(n.charAt(0).toUpperCase()+n.slice(1))}">${ttsList.filter(v=>v.lang===l).map(opt).join('')}</optgroup>`}).join('');
  const L=ttsList;
  if(cur&&L.some(v=>v.name===cur))s.value=cur;
}
async function ttsMake(text,at){
  text=String(text||'').trim();if(!text){toast(T('tts.empty'));return}
  if(!FS||!FS.ttsMake){toast(T('tts.onlyApp'));return}
  const b=$('#ttsGo');if(b)b.disabled=true;toast(T('tts.busy'));
  try{
    if(!ttsList)await ttsLoad();
    const f=await FS.ttsMake(text,$('#ttsVoice')?.value||'',+($('#ttsRate')?.value||0),T('tts.title')+' - '+text.slice(0,28));
    const m=addPaths([f])[0];if(!m)throw new Error('?');await waitMeta([m]);
    const c=placeFree(newClip({track:tk('audio'),mid:m.id,start:at??time,dur:m.duration||3,p:{vol:100}}));clips.push(c);sel=c.id;msel.clear();commit();refresh();toast(T('tts.done'));
  }catch(x){toast(T('tts.fail',{error:String((x&&x.message)||x).slice(0,140)}))}
  finally{if(b)b.disabled=false}
}
$('#ttsGo').onclick=()=>ttsMake($('#ttsTxt').value);
/* « Ajouter des voix » : page Voix des Réglages de Windows ; au retour dans DedCut, la liste est relue */
// window.dedcutFS et pas FS : FS n'est déclaré que plus loin (14-project.js), l'utiliser ici arrêterait tout ce fichier au démarrage
{const b=$('#ttsAdd'),F=window.dedcutFS;if(b){if(!F||!F.ttsSettings)b.hidden=true;else b.onclick=async()=>{try{await F.ttsSettings();ttsWait=true}catch(x){toast(String((x&&x.message)||x))}}}}
let ttsWait=false;window.addEventListener('focus',()=>{if(!ttsWait)return;ttsWait=false;ttsList=null;ttsLoad()});
$('#ttsRate').oninput=e=>{$('#ttsRateV').textContent=e.target.value};
window.addEventListener('dedcut-lang',ttsFill);

/* ---------- couper à chaque marqueur (sur les clips sélectionnés) ---------- */
function cutAtMarkers(){
  const g=selClips().filter(c=>!trk(c).lock);if(!g.length){toast(T('msg.selectClip'));return}
  let n=0;for(const c of g)for(const t of markers.filter(t=>t>c.start+.05&&t<c.start+c.dur-.05).sort((x,y)=>y-x)){splitAt(c,t);n++}
  if(n){commit();refresh();toast(T('mkcut.done',{count:n}))}else toast(T('mkcut.none'));
}

/* ---------- rampes de vitesse : le clip est découpé en 12 morceaux dont la vitesse suit une courbe ---------- */
const RAMPS={montage:u=>2.2-1.8*Math.sin(Math.PI*u),hero:u=>1-.75*Math.exp(-Math.pow((u-.5)/.16,2)),
  bullet:u=>{const q=clamp(Math.min((u-.18)/.14,(.82-u)/.14),0,1);return 1-.78*q*q*(3-2*q)},flashin:u=>1+2.5*Math.pow(1-u,2),flashout:u=>1+2.5*u*u,jump:u=>.45+1.6*Math.sin(Math.PI*u)};
function rampIcon(k){let d='';for(let i=0;i<=24;i++){const u=i/24,y=clamp(RAMPS[k](u)/3.2,0,1);d+=(i?'L':'M')+(3+u*28).toFixed(1)+' '+(19-y*15).toFixed(1)}return `<svg viewBox="0 0 34 22" width="34" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 15.3h28" stroke-dasharray="2 2" opacity=".4"/><path d="${d}"/></svg>`}
function speedRamp(c,k){
  const m=c&&c.mid&&mById(c.mid);if(!m||m.type==='image'||c.p.rev){toast(T('ramp.no'));return}
  if(trk(c).lock){toast(T('msg.trackLocked'));return}
  const f=RAMPS[k],N=12,r0=c.p.rate||1,seg=c.dur*r0/N,oldEnd=c.start+c.dur,g=c.grp||uid++,parts=[];let t=c.start;
  for(let i=0;i<N;i++){const r=clamp(r0*f((i+.5)/N),.1,8),n=JSON.parse(JSON.stringify(c));n.id=uid++;n.in=c.in+i*seg;n.p.rate=r;n.dur=seg/r;n.start=t;t+=n.dur;delete n.kf;
    if(i>0){n.p.tin='none';n.p.afin=0}if(i<N-1){n.p.tout='none';n.p.afout=0}n.grp=g;parts.push(n)}
  const delta=t-oldEnd;clips=clips.filter(x=>x!==c);clips.forEach(x=>{if(x.track===c.track&&x.start>=oldEnd-.001)x.start=Math.max(0,x.start+delta)});
  clips.push(...parts);sel=parts[0].id;msel=new Set(parts.slice(1).map(n=>n.id));commit();refresh();toast(T('ramp.done',{name:T('ramp.'+k)}));
}
/* ---------- groupes : les clips groupés se sélectionnent et se déplacent ensemble ---------- */
function regroup(L){const m={};for(const n of L)if(n.grp){m[n.grp]=m[n.grp]||uid++;n.grp=m[n.grp]}}
function groupSel(){const g=selClips();if(g.length<2){toast(T('grp.need'));return}const id=uid++;g.forEach(x=>{x.grp=id});commit();renderTL();toast(T('grp.done',{count:g.length}))}
function ungroupSel(){const g=selClips();if(!g.some(x=>x.grp))return;const ids=new Set(g.map(x=>x.grp).filter(Boolean));clips.forEach(x=>{if(ids.has(x.grp))delete x.grp});commit();renderTL();toast(T('grp.undone'))}
/* ---------- répéter une musique jusqu'à la fin des images ---------- */
function loopMusic(c){
  if(!c||!c.mid)return;const vEnd=Math.max(0,...clips.filter(x=>isVid(x)||isOvr(x)).map(x=>x.start+x.dur)),end=vEnd||total();
  if(c.start+c.dur>=end-.05){toast(T('loop.none'));return}
  let t=c.start+c.dur,n=0;const g=c.grp||uid++;c.grp=g;
  while(t<end-.05&&n<300){const k=JSON.parse(JSON.stringify(c));k.id=uid++;k.start=t;k.dur=Math.min(c.dur,end-t);k.p.afin=.03;k.p.afout=t+c.dur>=end-.05?Math.min(2,k.dur/3):.03;delete k.kf;clips.push(k);t+=k.dur;n++}
  commit();refresh();toast(T('loop.done',{count:n}));
}
/* ---------- chapitres YouTube à partir des marqueurs ---------- */
function copyChapters(){
  const ms=[...new Set(markers.map(t=>Math.floor(t)))].sort((a,b)=>a-b);if(!ms.length){toast(T('chap.none'));return}
  const f=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(x).padStart(2,'0')};
  const L=[];if(ms[0]>0)L.push('0:00 '+T('chap.intro'));ms.forEach((s,i)=>{const nm=window.mkName?mkName(s):'';L.push(f(s)+' '+(nm||T('chap.name',{n:i+1})))});
  const txt=L.join('\n');(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast(T('chap.done'))).catch(()=>{askText('',txt,{ro:true})});
}

/* ---------- écran partagé : 2 à 4 vidéos / images placées en cases (recadrées pour remplir) ---------- */
const SPLITS={'2h':[[0,0,50,100],[50,0,50,100]],'2v':[[0,0,100,50],[0,50,100,50]],'3':[[0,0,50,100],[50,0,50,50],[50,50,50,50]],'4':[[0,0,50,50],[50,0,50,50],[0,50,50,50],[50,50,50,50]]};
function splitScreen(k){
  const L=SPLITS[k],g=selClips().filter(c=>c.mid&&mById(c.mid)&&mById(c.mid).type!=='audio'&&!trk(c).lock).sort((a,b)=>a.start-b.start).slice(0,L.length);
  if(g.length<2){toast(T('split.need'));return}
  const ov=tk('over');
  g.forEach((c,i)=>{const[cx,cy,cw,ch]=L[i],m=mById(c.mid),a=m.w&&m.h?m.h/m.w:9/16,r=(ch*H)/(cw*W);
    if(!isOvr(c)){c.track=ov;c.p=Object.assign({x:50,y:50,scale:40,op:100,vol:c.p.vol??100},c.p)}
    c.p.crop=a>r?{l:0,r:0,t:(1-r/a)*50,b:(1-r/a)*50}:{l:(1-a/r)*50,r:(1-a/r)*50,t:0,b:0};
    c.p.scale=cw;c.p.x=cx+cw/2;c.p.y=cy+ch/2;c.p.rot=0;c.p.round=0;delete c.kf});
  commit();refresh();toast(T('split.done'));
}
/* ---------- logo sur toute la vidéo ---------- */
function logoAll(m){
  if(!m||m.type==='audio')return;const s=12,a=m.w&&m.h?m.h/m.w:1,hh=s*W/H*a/2,dur=Math.max(1,total());
  const c=placeFree(newClip({track:tk('over'),mid:m.id,start:0,dur:m.type==='video'?Math.min(dur,m.duration||dur):dur,p:{x:100-3-s/2,y:3+hh,scale:s,op:85,vol:0}}));
  clips.push(c);sel=c.id;msel.clear();commit();refresh();toast(T('mm.logoDone'));
}
$('#mlist').addEventListener('contextmenu',e=>{
  const card=e.target.closest('.card');if(!card)return;e.preventDefault();const m=mById(+card.dataset.mid);if(!m)return;
  showCtx([{title:m.name},{label:'mm.add',fn:()=>addFromMedia(m.id,false)},...(m.type!=='audio'?[{label:'mm.addOver',fn:()=>addFromMedia(m.id,true)},{label:'mm.logo',fn:()=>logoAll(m)}]:[]),...(window.binCtx?binCtx(m):[]),'-',{label:'mm.remove',danger:true,fn:()=>removeMedia(m.id)}],e.clientX,e.clientY);
});
/* ---------- zoom rapide (« punch-in ») à la tête de lecture ---------- */
function punchIn(c,back){
  const k=c&&isVid(c)&&!c.gen&&c.mid?'p.tf.zoom':c&&isOvr(c)&&c.mid?'p.scale':null;if(!k){toast(T('punch.no'));return}
  const loc=clamp(time-c.start,0,c.dur);if(loc>c.dur-.3){toast(T('msg.playheadOnClip'));return}
  c.kf=c.kf||[];const base=snapKf(c,loc),z0=base.v[k],z1=Math.round(z0*1.3*10)/10;
  const put=(t,z)=>{t=Math.min(c.dur,t);let f=c.kf.find(x=>Math.abs(x.t-t)<.04);if(!f){f={t,v:{...base.v}};c.kf.push(f)}f.v[k]=z;f.e='out'};
  put(loc,z0);put(loc+.25,z1);if(back){put(loc+1.5,z1);put(loc+1.8,z0)}
  c.kf.sort((a,b)=>a.t-b.t);commit();refresh();toast(T('punch.done'));
}
/* ---------- copier / coller le style d'un clip (sans le texte, le média ni la vitesse) ---------- */
let styleClip=null;
const STYLE_SKIP=['text','rate','rev','chip','cleanOrig','cleanFrom','label','name','title','done','values','labels','end','pre','suf'];
function copyStyle(){const c=selClip();if(!c){toast(T('msg.selectClip'));return}const p=JSON.parse(JSON.stringify(c.p));STYLE_SKIP.forEach(k=>delete p[k]);styleClip={p,kind:kindOf(c),gen:c.gen||''};toast(T('style.copied'))}
function pasteStyle(){
  if(!styleClip){toast(T('style.none'));return}
  const g=selClips().filter(x=>!trk(x).lock&&kindOf(x)===styleClip.kind&&(x.gen||'')===styleClip.gen);if(!g.length){toast(T('style.none'));return}
  g.forEach(x=>Object.assign(x.p,JSON.parse(JSON.stringify(styleClip.p))));commit();refresh();toast(T('style.pasted',{count:g.length}));
}
/* ---------- remplacer le média d'un clip (réglages gardés) ---------- */
async function replaceMedia(c){
  if(!c||!c.mid)return;const old=mById(c.mid),ms=await importMedia(),m=ms&&ms[0];if(!m)return;
  if((old&&old.type==='audio')!==(m.type==='audio')){toast(T('repl.type'));return}
  await waitMeta([m]);const el=els.get(c.id);if(el&&el.pause)el.pause();els.delete(c.id);
  c.mid=m.id;c.in=0;if(m.type!=='image'&&m.duration)c.dur=Math.min(c.dur,m.duration/(c.p.rate||1));commit();refresh();toast(T('repl.done'));
}
/* ---------- même durée pour la sélection (les clips d'une même piste sont remis à la suite) ---------- */
function sameDur(v){
  v=clamp(+v||0,.1,3600);const g=selClips().filter(x=>!trk(x).lock);if(!g.length)return;
  for(const ti of new Set(g.map(c=>c.track))){const L=g.filter(c=>c.track===ti).sort((a,b)=>a.start-b.start);let t=L[0].start;
    for(const c of L){const m=c.mid&&mById(c.mid),mx=m&&m.type!=='image'&&m.duration?(m.duration-c.in)/(c.p.rate||1):Infinity;c.dur=Math.min(v,mx);c.start=t;t+=c.dur}}
  commit();refresh();toast(T('mdur.done',{count:g.length,sec:fmtN(v)}));
}
/* ---------- fondus d'ouverture / de fermeture du projet (image + son) ---------- */
function fadeProject(w){
  const vid=clips.filter(c=>isVid(c)).sort((a,b)=>a.start-b.start),T0=total();if(!vid.length)return;
  if(w==='in'){const c=vid[0];c.p.tin='black';c.p.tdur=Math.min(1,c.dur/2);clips.filter(c=>isAud(c)&&c.start<.05).forEach(c=>{c.p.afin=Math.max(c.p.afin||0,1)})}
  else{const c=vid.reduce((a,b)=>a.start+a.dur>=b.start+b.dur?a:b);c.p.tout='black';c.p.tdur=Math.min(1.2,c.dur/2);clips.filter(c=>isAud(c)&&c.start+c.dur>T0-.05).forEach(c=>{c.p.afout=Math.max(c.p.afout||0,1.5)})}
  commit();refresh();toast(T('fade.done'));
}
/* ---------- favoris de l'onglet Formes ---------- */
let wlFav=[];try{wlFav=JSON.parse(localStorage.getItem('dedcut-wl-fav')||'[]')||[]}catch(x){wlFav=[]}
const wlKey=x=>x.tpl?'tpl:'+x.tpl:x.shp!=null?'shp:'+x.shp:x.g+':'+(x.s||'')+':'+(x.n||'');
function wlToggleFav(x){const k=wlKey(x),i=wlFav.indexOf(k);if(i>=0)wlFav.splice(i,1);else wlFav.push(k);try{localStorage.setItem('dedcut-wl-fav',JSON.stringify(wlFav))}catch(e){}renderWL()}

/* ---------- créer un exposé complet en 1 clic (v4.36) : titre, plan, parties avec leurs points, sources, fin ---------- */
const WACT={xbuild:()=>xbOpen()};
function specsToClips(list,t0){return list.map(s=>{
  if(s.k==='text'){const c=textClip(s.st,t0+s.start);c.dur=s.dur;Object.assign(c.p,s.p);return c}
  const d=WDEF[s.g]();if(s.s)d.p.st=s.s;Object.assign(d.p,s.p);return newClip({track:tk('over'),gen:s.g,start:t0+s.start,dur:s.dur,p:d.p})})}
function xbOpen(){
  let o=$('#xbov');if(o)o.remove();o=document.createElement('div');o.id='xbov';o.className='xbov';
  const th=[['sdark','wst.sdark'],['sclean','wst.sclean'],['snote','wst.snote'],['schalk','wst.schalk'],['sgrid','wst.sgrid'],['sgrad','wst.sgrad']];
  o.innerHTML=`<div class="box"><h3>${T('xb.title')}</h3><p class="hint">${T('xb.hint')}</p>
    <div class="fld"><label>${T('xb.ttl')}</label><input id="xbT" type="text" value="${esc(T('expo.c.title'))}"></div>
    <div class="fld"><label>${T('xb.by')}</label><input id="xbB" type="text" value="${esc(T('expo.c.by'))}"></div>
    <div class="fld"><label>${T('xb.outline')}</label><textarea id="xbO" rows="9">${esc(T('xb.example'))}</textarea></div>
    <div class="fld"><label>${T('expo.d.sources')}</label><textarea id="xbS" rows="2">${esc(T('expo.d.srclist'))}</textarea></div>
    <div class="two"><div class="fld"><label>${T('xb.theme')}</label><select id="xbTh">${th.map(([v,n])=>`<option value="${v}">${T(n)}</option>`).join('')}</select></div>
    <div class="fld"><label>${T('xb.music')}</label><select id="xbM"><option value="">${T('common.noneF')}</option>${Object.keys(MUS).map(k=>`<option value="${k}" ${k==='lofi'?'selected':''}>${T('mus.'+k)}</option>`).join('')}</select></div></div>
    <div class="btns"><button id="xbGo" class="pri">${T('xb.go')}</button><button id="xbX">${T('common.cancel')}</button></div></div>`;
  document.body.appendChild(o);
  $('#xbX').onclick=()=>o.remove();o.addEventListener('mousedown',e=>{if(e.target===o)o.remove()});
  $('#xbGo').onclick=async()=>{const r={title:$('#xbT').value,by:$('#xbB').value,outline:$('#xbO').value,src:$('#xbS').value,theme:$('#xbTh').value,music:$('#xbM').value};o.remove();await xbBuild(r)};
}
/* plan : une ligne = une partie ; une ligne qui commence par « - » = un point de la partie au-dessus */
async function xbBuild(r){
  const parts=[];for(const ln of String(r.outline||'').split('\n')){const s=ln.trim();if(!s)continue;if(/^[-•*]/.test(s)){if(!parts.length)parts.push({t:'',pts:[]});parts[parts.length-1].pts.push(s.replace(/^[-•*]\s*/,''))}else parts.push({t:s,pts:[]})}
  const th=r.theme||'sdark',light=['sclean','snote','sgrid'].includes(th),tc=light?'#0f172a':'#ffffff',acc=['#6366f1','#0891b2','#db2777','#16a34a','#f59e0b','#7c3aed'];
  const slides=[];const S=(dur,list)=>slides.push({dur,list});
  S(5,[{k:'gen',g:'slide',s:'sgrad',start:0,dur:5,p:{title:'',color:'#6366f1'}},{k:'text',st:'ccinzel',start:.2,dur:4.8,p:{text:r.title,y:44,size:XH(10)}},{k:'text',st:'clean',start:.7,dur:4.3,p:{text:r.by,y:58,size:XH(22)}}]);
  if(parts.length>1)S(6,[{k:'gen',g:'slide',s:th,start:0,dur:6,p:{title:T('expo.c.plan')}},{k:'gen',g:'agenda',start:.4,dur:5.6,p:{text:parts.map(p=>p.t).join('\n')}}]);
  parts.forEach((p,i)=>{const col=acc[i%acc.length];
    if(p.t)S(3.5,[{k:'gen',g:'slide',s:'sgrad',start:0,dur:3.5,p:{title:'',color:col}},{k:'gen',g:'chapter',start:.2,dur:3.3,p:{num:T('xb.part',{n:i+1}),title:p.t,color:'#ffffff'}}]);
    if(p.pts.length){const d=Math.max(5,3+p.pts.length*1.3);S(d,[{k:'gen',g:'slide',s:th,start:0,dur:d,p:{title:p.t,color:col}},{k:'gen',g:'bullets',s:light?'bnum':'bcard',start:.5,dur:d-.5,p:{text:p.pts.join('\n'),color:col,tcolor:light&&th!=='bcard'?tc:'#ffffff',delay:1}}]);
      if(parts.length>1&&i<parts.length-1){const d2=4;S(d2,[{k:'gen',g:'slide',s:th,start:0,dur:d2,p:{title:T('expo.c.plan')}},{k:'gen',g:'agenda',start:.3,dur:d2-.3,p:{text:parts.map(q=>q.t).join('\n'),cur:i+2}}])}}});
  if(String(r.src||'').trim())S(6,[{k:'gen',g:'slide',s:'sclean',start:0,dur:6,p:{title:T('expo.d.sources')}},{k:'gen',g:'sources',start:.3,dur:5.7,p:{text:r.src,x:7,y:26,w:80,size:3.4}}]);
  S(5,[{k:'gen',g:'slide',s:'sgrad',start:0,dur:5,p:{title:'',color:'#db2777'}},{k:'text',st:'pbebas',start:.2,dur:4.8,p:{text:T('expo.c.thanks'),y:42,size:XH(8)}},{k:'text',st:'clean',start:1,dur:4,p:{text:T('expo.c.questions'),y:58,size:XH(16)}},{k:'gen',g:'confetti',start:.4,dur:2.6,p:{y:30}}]);
  let t=time;const made=[];
  for(const sl of slides){const cs=specsToClips(sl.list,t),g=uid++;cs.forEach(c=>{c.grp=g;if(c.gen==='slide'){c.p.tin='fade';c.p.tout='fade';c.p.tdur=.4}clips.push(c)});made.push(...cs);t+=sl.dur}
  const t0=time;sel=made[0]&&made[0].id;msel=new Set();commit();refresh();toast(T('xb.done',{n:slides.length,s:Math.round(t-t0)}));
  // la musique est composée ensuite (quelques secondes), puis posée sous tout l'exposé
  if(r.music&&typeof musicMedia==='function'){try{const total=t-t0,m=await musicMedia(r.music,Math.min(180,Math.ceil(total/30)*30));clips.push(newClip({track:tk('audio'),mid:m.id,start:t0,dur:Math.min(m.duration,total),p:{vol:35}}));commit();refresh()}catch(e){console.warn(e)}}
}

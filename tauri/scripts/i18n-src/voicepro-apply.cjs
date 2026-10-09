// Son v4.16 : changeur de voix agrandi (29 voix en 4 catégories + réglages fins), Améliorer la voix,
// canaux gauche / droite, hauteur qui suit la vitesse. Tout est en direct (Web Audio) et identique à l'export. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };
const cut = (a, b, y) => { const i = e.indexOf(a), j = e.indexOf(b, i); if (i < 0 || j < 0 || e.indexOf(a, i + 1) >= 0) throw new Error('bloc introuvable : ' + a.slice(0, 60)); e = e.slice(0, i) + y + e.slice(j); };

/* 1) voix : réglages par défaut + nouvelles voix classées */
rep("const voiceDefaults=()=>({on:false,pitch:1,robot:0,dist:0,echo:0,radio:false});",
    "const voiceDefaults=()=>({on:false,pitch:1,robot:0,dist:0,echo:0,radio:false,muff:0,thin:0,wob:0,wobF:5,wobSq:false,chorus:0,crush:0,vrev:0,vrevL:2,edl:.18,pre:''});");
rep("  megaphone:{pitch:1,robot:0,dist:65,echo:10,radio:true},\n  none:{}\n};",
`  megaphone:{pitch:1,robot:0,dist:65,echo:10,radio:true},
  giant:{pitch:.62,vrev:25,vrevL:2.2},squirrel:{pitch:1.75},ghost:{pitch:.9,wob:35,wobF:3,vrev:60,vrevL:3.5,muff:20},
  cyborg:{pitch:.9,robot:55,chorus:50,dist:10},witch:{pitch:1.22,wob:22,wobF:7,dist:15},
  walkie:{radio:true,dist:55,crush:40,thin:30},cassette:{muff:35,wob:14,wobF:1.2,crush:15,dist:10},gramo:{thin:45,muff:45,dist:15,crush:10},
  speaker:{thin:60,muff:25,dist:55},chip:{crush:88,pitch:1.1,thin:10},
  cave:{echo:40,edl:.35,vrev:40,vrevL:3},church:{vrev:75,vrevL:4.5},bath:{vrev:50,vrevL:.8},stadium:{echo:30,edl:.55,vrev:50,vrevL:2.6,thin:15},
  water:{muff:88,wob:30,wobF:2.5,pitch:.92},hall:{vrev:35,vrevL:1.4,thin:10},
  double:{chorus:75},shaky:{wob:45,wobF:6},stutter:{wob:100,wobF:9,wobSq:true},lofi:{crush:55,muff:30},fuzz:{dist:75},longecho:{echo:70,edl:.6},
  none:{}
};
/* classement des voix (catégories propres à DedCut) */
const VCAT={perso:['anonyme','robot','demon','aigu','enfant','monstre','alien','giant','squirrel','ghost','cyborg','witch'],device:['radio','megaphone','walkie','cassette','gramo','speaker','chip'],
  place:['echo','cave','church','bath','stadium','water','hall'],fx:['double','shaky','stutter','lofi','fuzz','longecho']};
const VN={anonyme:'voice.anon',robot:'voice.robot',demon:'voice.deep',aigu:'voice.high',enfant:'voice.child',monstre:'voice.monster',alien:'voice.alien',radio:'voice.radio',megaphone:'voice.megaphone',echo:'voice.echo',none:'voice.normal'};
const vName=k=>VN[k]||'vc.'+k;
let vCat='perso',vFineOpen=false;`);

/* 2) chaîne de la voix : tremblement, voix doublée, écho réglable, espace */
cut("  const sh=A.createWaveShaper();sh.oversample='2x';mix.connect(sh);", "\nfunction applyVoice(c){",
`  const sh=A.createWaveShaper();sh.oversample='2x';mix.connect(sh);
  const hp=A.createBiquadFilter(),lp=A.createBiquadFilter(),out=A.createGain();
  hp.type='highpass';lp.type='lowpass';sh.connect(hp);hp.connect(lp);
  /* tremblement / saccades : gain modulé par un oscillateur lent */
  const tg=A.createGain(),lfo=A.createOscillator(),lg=A.createGain();lfo.frequency.value=5;lg.gain.value=0;lfo.connect(lg);lg.connect(tg.gain);lfo.start();lp.connect(tg);
  const dg=A.createGain();tg.connect(dg);dg.connect(out);
  /* voix doublée : copie légèrement retardée et modulée */
  const cd=A.createDelay(.1),co=A.createOscillator(),cog=A.createGain(),cg=A.createGain();cd.delayTime.value=.022;co.frequency.value=.9;cog.gain.value=.004;co.connect(cog);cog.connect(cd.delayTime);co.start();cg.gain.value=0;tg.connect(cd);cd.connect(cg);cg.connect(out);
  /* écho */
  const dl=A.createDelay(2),fb=A.createGain(),eg=A.createGain();
  dl.delayTime.value=.18;fb.gain.value=.35;eg.gain.value=0;tg.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(eg);eg.connect(out);
  /* espace (réverbération) */
  const cv=A.createConvolver(),rg=A.createGain();rg.gain.value=0;tg.connect(cv);cv.connect(rg);rg.connect(out);
  return{in:inn,out,ps,dry,wet,sh,hp,lp,eg,dl,tg,lfo,lg,dg,cg,cv,rg,active:false,sig:''};
}`);
cut("function voiceParams(ch,v){", "\nfunction getEl(c){",
`function voiceParams(ch,v){
  v=Object.assign(voiceDefaults(),v);
  if(ch.ps.parameters)ch.ps.parameters.get('pitch').value=clamp(+v.pitch||1,.25,3);
  ch.dry.gain.value=1-v.robot/100;ch.wet.gain.value=v.robot/100*1.5;
  ch.eg.gain.value=v.echo/100*.7;ch.dl.delayTime.value=clamp(+v.edl||.18,.03,1.5);
  ch.hp.frequency.value=Math.max(v.radio?400:10,v.thin>0?10*Math.pow(150,v.thin/100):10);
  ch.lp.frequency.value=Math.min(v.radio?3200:20000,v.muff>0?20000*Math.pow(.02,v.muff/100):20000);
  const k=1+v.dist*.15,q=v.crush>0?Math.pow(2,8-v.crush*.065):0;
  if(v.dist>0||q){const n=4096,cu=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;let y=v.dist>0?Math.tanh(x*k)/Math.tanh(k):x;if(q)y=Math.round(y*q)/q;cu[i]=y}ch.sh.curve=cu}else ch.sh.curve=null;
  const d=clamp(v.wob/100,0,1);ch.lfo.type=v.wobSq?'square':'sine';ch.lfo.frequency.value=clamp(+v.wobF||5,.5,15);ch.lg.gain.value=d/2;ch.tg.gain.value=1-d/2;
  ch.cg.gain.value=clamp(v.chorus/100,0,1)*.8;
  if(v.vrev>0){const L=clamp(+v.vrevL||2,.2,5);if(ch.cvL!==L){ch.cv.buffer=impulseL(ch.cv.context,L);ch.cvL=L}}
  ch.rg.gain.value=clamp(v.vrev/100,0,1)*.9;ch.dg.gain.value=1-clamp(v.vrev/100,0,1)*.35;
}
/* réponse de salle synthétique de longueur L (secondes), gardée en mémoire par contexte audio */
const irL=new WeakMap();
function impulseL(A,L){
  let m=irL.get(A);if(!m){m=new Map();irL.set(A,m)}if(m.has(L))return m.get(L);
  const len=Math.max(1,Math.round(A.sampleRate*L)),b=A.createBuffer(2,len,A.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
  m.set(L,b);return b;
}`);

/* 3) panneau du changeur de voix */
cut("function voiceUI(v){", "\nconst trSel=",
`function voiceUI(v){
  v=Object.assign(voiceDefaults(),v);
  const cur=v.on?(v.pre||''):'none';
  const sl=(k,L,mn,mx,st)=>\`<div class="fld"><label>\${T(L)}<span>\${fmtN(v[k])}</span></label><input data-k="p.voice.\${k}" data-t="n" type="range" min="\${mn}" max="\${mx}" step="\${st}" value="\${v[k]}"></div>\`;
  const ck=(k,L)=>\`<label class="chk"><span>\${T(L)}</span><input type="checkbox" data-k="p.voice.\${k}" data-t="b" \${v[k]?'checked':''}></label>\`;
  return \`<div class="sec"><h4>\${T('voice.title')}</h4>\${ck('on','voice.enable')}
  <div class="seg">\${Object.keys(VCAT).map(k=>\`<button data-vcat="\${k}" class="\${k===vCat?'on':''}">\${T('vc.cat.'+k)}</button>\`).join('')}</div>
  <div class="chips c3 vgrid">\${['none',...VCAT[vCat]].map(k=>\`<button data-vpre="\${k}" class="\${k===cur?'on':''}">\${T(vName(k))}</button>\`).join('')}</div>
  <p class="hint" style="margin:6px 0 8px">\${T('vc.hint')}</p>
  <details class="vfine" \${vFineOpen?'open':''}><summary>\${T('vc.fine')}</summary>
  \${sl('pitch','voice.pitch',.5,1.8,.01)}\${sl('robot','voice.robot',0,100,1)}\${sl('dist','voice.distortion',0,100,1)}\${sl('crush','vc.crush',0,100,1)}\${sl('muff','vc.muff',0,100,1)}\${sl('thin','vc.thin',0,100,1)}\${sl('chorus','vc.chorus',0,100,1)}\${sl('wob','vc.wob',0,100,1)}\${sl('wobF','vc.wobF',.5,15,.5)}\${ck('wobSq','vc.wobSq')}\${sl('echo','voice.echo',0,100,1)}\${sl('edl','vc.edl',.05,1.2,.01)}\${sl('vrev','vc.vrev',0,100,1)}\${sl('vrevL','vc.vrevL',.3,5,.1)}\${ck('radio','voice.phone')}
  </details>
  <div class="pre" style="margin:8px 0 0"><button data-act="voiceAll">\${T('vc.all')}</button></div></div>\`;
}
$('#insp').addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('vfine'))vFineOpen=e.target.open},true);`);
rep("  if(d.vpre){c.p.voice=Object.assign(voiceDefaults(),VP[d.vpre],{on:d.vpre!=='none'});commit();renderInspector()}",
    "  if(d.vpre){c.p.voice=Object.assign(voiceDefaults(),VP[d.vpre],{on:d.vpre!=='none',pre:d.vpre});commit();renderInspector()}\n  if(d.vcat){vCat=d.vcat;renderInspector();return}\n  if(d.enh!=null){c.p.au=Object.assign(auDefaults(),c.p.au||{},{enh:+d.enh});commit();renderInspector()}");
rep("  if(d.aupre){c.p.au=Object.assign(auDefaults(),AUPRE[d.aupre].v);commit();renderInspector()}",
    "  if(d.aupre){const o=c.p.au||{};c.p.au=Object.assign(auDefaults(),{ch:o.ch||'st',enh:o.enh||0},AUPRE[d.aupre].v);commit();renderInspector()}");
rep("silence:()=>cutSilences(c),", `silence:()=>cutSilences(c),voiceAll:()=>{const v=JSON.stringify(Object.assign(voiceDefaults(),c.p.voice));let n=1;for(const x of clips){if(x===c)continue;const m=x.mid&&mById(x.mid);if(!m||m.type==='image'||trk(x).lock)continue;x.p.voice=JSON.parse(v);n++}commit();refresh();toast(T('vc.allDone',{count:n}))},`);

/* 4) chaîne du clip : canaux gauche / droite + Améliorer la voix */
rep("const auDefaults=()=>({eqL:0,eqM:0,eqH:0,hp:false,nr:0,comp:false,pan:0,rev:0});",
    "const auDefaults=()=>({eqL:0,eqM:0,eqH:0,hp:false,nr:0,comp:false,pan:0,rev:0,enh:0,ch:'st'});");
rep("  g.connect(hp);hp.connect(lo);lo.connect(mi);mi.connect(hi);hi.connect(gate);gate.connect(comp);",
`  /* canaux : mono remis en stéréo, puis matrice gauche / droite (0 = G→G, 1 = G→D, 2 = D→G, 3 = D→D) */
  const up=A.createGain();up.channelCount=2;up.channelCountMode='explicit';up.channelInterpretation='speakers';
  const sp=A.createChannelSplitter(2),mg=A.createChannelMerger(2),mx=[0,1,2,3].map(()=>A.createGain());
  g.connect(up);up.connect(sp);sp.connect(mx[0],0);sp.connect(mx[1],0);sp.connect(mx[2],1);sp.connect(mx[3],1);
  mx[0].connect(mg,0,0);mx[1].connect(mg,0,1);mx[2].connect(mg,0,0);mx[3].connect(mg,0,1);mx[1].gain.value=0;mx[2].gain.value=0;
  /* Améliorer la voix : moins de graves sourds, plus de présence, « s » adoucis, un peu d'air */
  const mud=A.createBiquadFilter(),pres=A.createBiquadFilter(),ess=A.createBiquadFilter(),air=A.createBiquadFilter();
  mud.type='peaking';mud.frequency.value=320;mud.Q.value=1;pres.type='peaking';pres.frequency.value=3200;pres.Q.value=.9;
  ess.type='peaking';ess.frequency.value=7200;ess.Q.value=2.5;air.type='highshelf';air.frequency.value=11000;
  mg.connect(hp);hp.connect(lo);lo.connect(mi);mi.connect(hi);hi.connect(mud);mud.connect(pres);pres.connect(ess);ess.connect(air);air.connect(gate);gate.connect(comp);`);
rep("  return{in:g,g,hp,lo,mi,hi,gate,comp,mk,pan,dry,wet,conv,out,sig:''};",
    "  return{in:g,g,hp,lo,mi,hi,gate,comp,mk,pan,dry,wet,conv,out,mx,mud,pres,ess,air,sig:''};");
rep("  ch.hp.frequency.value=au.hp?90:10;ch.lo.gain.value=au.eqL;",
`  const e=clamp(+au.enh||0,0,100)/100;
  ch.hp.frequency.value=Math.max(au.hp?90:10,e>0?60+e*30:10);
  ch.mud.gain.value=-5*e;ch.pres.gain.value=4.5*e;ch.ess.gain.value=-4*e;ch.air.gain.value=3*e;
  const M={st:[1,0,0,1],mono:[.5,.5,.5,.5],ll:[1,1,0,0],rr:[0,0,1,1],swap:[0,1,1,0]}[au.ch]||[1,0,0,1];ch.mx.forEach((x,i)=>{x.gain.value=M[i]});
  ch.lo.gain.value=au.eqL;`);
rep("  if(au.comp){c.threshold.value=-24;c.ratio.value=4;c.knee.value=8;c.attack.value=.005;c.release.value=.15;ch.mk.gain.value=1.7}",
    "  if(au.comp){c.threshold.value=-24;c.ratio.value=4;c.knee.value=8;c.attack.value=.005;c.release.value=.15;ch.mk.gain.value=1.7}\n  else if(e>0){c.threshold.value=-14-e*10;c.ratio.value=1.5+e*2.5;c.knee.value=8;c.attack.value=.006;c.release.value=.18;ch.mk.gain.value=1+e*.5}");

/* 5) panneau Son : Améliorer la voix + canaux */
rep("    h+=S(T('audio.eq'),`<div class=\"pre\">${Object.entries(AUPRE)",
`    h+=S(T('enh.title'),\`<div class="chips c4" style="margin-bottom:8px">\${[[0,'enh.off'],[35,'enh.light'],[60,'common.normal'],[90,'enh.strong']].map(([v,n])=>\`<button data-enh="\${v}" class="\${(+(p.au&&p.au.enh)||0)===v?'on':''}">\${T(n)}</button>\`).join('')}</div>\`+R(T('enh.amount'),'p.au.enh',0,100)+\`<p class="hint" style="margin:0">\${T('enh.hint')}</p>\`);
    h+=S(T('audio.eq'),\`<div class="pre">\${Object.entries(AUPRE)`);
rep("+R(T('audio.reverb'),'p.au.rev',0,100)+R(T('audio.pan'),'p.au.pan',-100,100));",
    "+R(T('audio.reverb'),'p.au.rev',0,100)+R(T('audio.pan'),'p.au.pan',-100,100));\n    h+=S(T('chan.title'),`<div class=\"fld\"><select data-k=\"p.au.ch\" data-t=\"s\">${[['st','chan.st'],['mono','chan.mono'],['ll','chan.ll'],['rr','chan.rr'],['swap','chan.swap']].map(([v,n])=>`<option value=\"${v}\" ${(V('p.au.ch')||'st')===v?'selected':''}>${T(n)}</option>`).join('')}</select></div><p class=\"hint\" style=\"margin:0\">${T('chan.hint')}</p>`);");

/* 6) vitesse : la hauteur peut suivre la vitesse (aperçu ET export) */
rep("+CK(T('speed.reverse'),'p.rev')+", "+CK(T('speed.chip'),'p.chip')+CK(T('speed.reverse'),'p.rev')+");
rep("    if(el.playbackRate!==sp)el.playbackRate=sp;", "    if(el.playbackRate!==sp)el.playbackRate=sp;\n    if(el.preservesPitch!==!c.p.chip)el.preservesPitch=!c.p.chip;");
rep("const v=c.p.voice,on=!!(v&&v.on),pitch=(on?v.pitch:1)/rate;", "const v=c.p.voice,on=!!(v&&v.on),pitch=(on?v.pitch:1)/(c.p.chip?1:rate);");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.vfine')) {
  css += `
/* changeur de voix : grille des voix + réglages fins repliables */
.vgrid{margin:0 0 2px}
.vgrid button{font-size:11.5px;padding:7px 4px;white-space:normal;line-height:1.15}
.vfine{margin:4px 0 0;border-top:1px solid var(--line,rgba(255,255,255,.08));padding-top:6px}
.vfine summary{cursor:pointer;font-size:12px;color:var(--mut,#a1a1aa);padding:4px 0;user-select:none}
.vfine[open] summary{color:var(--ac)}
`;
  fs.writeFileSync(C, css);
}
console.log('son : options ajoutées');

/* ---------- musiques de fond créées par DedCut (v4.36) : composées et jouées par le code, aucun enregistrement,
   aucune licence tierce → libres de droits, utilisables partout (YouTube, TikTok, école…).
   Rendu avec OfflineAudioContext (synthés, batterie, réverbération) puis enregistré en WAV stéréo. */
const MUS={
  chill:{bpm:86,key:57,minor:false,prog:[[0,'M7'],[9,'m7'],[5,'M7'],[7,'7']],pad:1,pluck:1,bass:'sine',drums:'soft',lead:'bell',rev:.35},
  lofi:{bpm:74,key:53,minor:false,prog:[[2,'m7'],[7,'7'],[0,'M7'],[9,'m7']],keys:1,bass:'sine',drums:'lofi',lead:'keys',rev:.25,lofi:1},
  epic:{bpm:96,key:50,minor:true,prog:[[0,'m'],[8,'M'],[3,'M'],[10,'M']],strings:1,bass:'saw',drums:'epic',lead:'brass',rev:.5},
  happy:{bpm:118,key:60,minor:false,prog:[[0,'M'],[7,'M'],[9,'m'],[5,'M']],pluck:1,bass:'saw',drums:'pop',lead:'bell',rev:.2,clap:1},
  suspense:{bpm:70,key:45,minor:true,prog:[[0,'m'],[1,'M'],[0,'m'],[6,'dim']],pad:1,bass:'sine',drums:'pulse',lead:'none',rev:.6,tick:1},
  game:{bpm:140,key:60,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[0,'M']],chip:1,bass:'square',drums:'chip',lead:'chip',rev:.08},
  tech:{bpm:110,key:55,minor:true,prog:[[0,'m7'],[5,'m7'],[8,'M7'],[7,'m7']],pad:1,arp:1,bass:'saw',drums:'house',lead:'none',rev:.3},
  hiphop:{bpm:90,key:50,minor:true,prog:[[0,'m7'],[0,'m7'],[8,'M7'],[7,'7']],keys:1,bass:'sub',drums:'trap',lead:'bell',rev:.2},
  sad:{bpm:68,key:57,minor:true,prog:[[0,'m'],[8,'M'],[3,'M'],[10,'M']],piano:1,bass:'none',drums:'none',lead:'piano',rev:.55},
  ambient:{bpm:60,key:52,minor:false,prog:[[0,'add9'],[5,'add9'],[9,'m7'],[7,'add9']],pad:1,bass:'none',drums:'none',lead:'bell',rev:.7,slow:1},
  dance:{bpm:124,key:57,minor:true,prog:[[0,'m'],[8,'M'],[3,'M'],[10,'M']],stab:1,bass:'saw',drums:'house',lead:'saw',rev:.25,clap:1},
  funk:{bpm:104,key:52,minor:false,prog:[[0,'7'],[0,'7'],[5,'7'],[7,'7']],pluck:1,bass:'slap',drums:'funk',lead:'none',rev:.18,clap:1},
  // ---- v4.36 (2) : 12 ambiances en plus ----
  rock:{bpm:128,key:52,minor:false,prog:[[0,'M'],[10,'M'],[5,'M'],[0,'M']],power:1,bass:'saw',drums:'rock',lead:'saw',rev:.15},
  jazz:{bpm:120,key:55,minor:false,prog:[[2,'m7'],[7,'7'],[0,'M7'],[9,'7']],keys:1,bass:'walk',drums:'jazz',lead:'keys',rev:.25},
  synthwave:{bpm:100,key:57,minor:true,prog:[[0,'m'],[8,'M'],[3,'M'],[10,'M']],pad:1,arp:1,bass:'saw',drums:'synth',lead:'saw',rev:.4},
  reggae:{bpm:76,key:55,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[5,'M']],skank:1,bass:'sine',drums:'reggae',lead:'none',rev:.25},
  latin:{bpm:100,key:57,minor:true,prog:[[0,'m'],[5,'m'],[7,'7'],[0,'m']],pluck:1,bass:'latin',drums:'latin',lead:'bell',rev:.2},
  horror:{bpm:60,key:38,minor:true,prog:[[0,'dim'],[1,'m'],[0,'dim'],[6,'dim']],pad:1,bass:'none',drums:'none',lead:'horror',rev:.85,slow:1,drone:1},
  xmas:{bpm:110,key:62,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[0,'M']],pluck:1,bass:'sine',drums:'soft',lead:'bell',rev:.35,sleigh:1},
  kids:{bpm:124,key:60,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[0,'M']],pluck:1,bass:'square',drums:'pop',lead:'chip',rev:.15,clap:1},
  zen:{bpm:56,key:50,minor:false,prog:[[0,'add9'],[7,'add9'],[5,'add9'],[0,'add9']],pad:1,bass:'none',drums:'none',lead:'bell',rev:.8,slow:1},
  drill:{bpm:142,key:49,minor:true,prog:[[0,'m'],[8,'M'],[0,'m'],[7,'M']],pad:1,bass:'slide',drums:'drill',lead:'bell',rev:.3},
  oriental:{bpm:96,key:52,minor:true,scale:[0,1,4,5,7,8,10],prog:[[0,'M'],[1,'M'],[0,'M'],[10,'m']],pluck:1,bass:'sine',drums:'latin',lead:'saw',rev:.3},
  cinematic:{bpm:80,key:48,minor:true,prog:[[0,'m'],[8,'M'],[5,'m'],[7,'M']],strings:1,piano:1,bass:'sine',drums:'epic',lead:'piano',rev:.6},
  // ---- v4.36 (3) : 30 ambiances en plus ----
  summer:{bpm:112,key:62,minor:false,prog:[[0,'M'],[7,'M'],[9,'m'],[5,'M']],pluck:1,bass:'sine',drums:'house',lead:'bell',rev:.25,clap:1},
  night:{bpm:84,key:50,minor:true,prog:[[0,'m7'],[5,'m7'],[3,'M7'],[10,'7']],pad:1,keys:1,bass:'sub',drums:'lofi',lead:'keys',rev:.4},
  cafe:{bpm:96,key:55,minor:false,prog:[[0,'M7'],[9,'m7'],[2,'m7'],[7,'7']],keys:1,bass:'walk',drums:'jazz',lead:'piano',rev:.3},
  rain:{bpm:70,key:53,minor:true,prog:[[0,'m7'],[8,'M7'],[3,'M7'],[10,'add9']],piano:1,pad:1,bass:'none',drums:'none',lead:'piano',rev:.6,lofi:1},
  adventure:{bpm:104,key:50,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[9,'m']],strings:1,pluck:1,bass:'saw',drums:'epic',lead:'brass',rev:.45},
  mystery:{bpm:78,key:45,minor:true,prog:[[0,'m'],[3,'M'],[1,'M'],[0,'m']],pad:1,pluck:1,bass:'sine',drums:'pulse',lead:'bell',rev:.55,tick:1},
  victory:{bpm:116,key:55,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[0,'M']],strings:1,bass:'saw',drums:'epic',lead:'brass',rev:.4},
  party:{bpm:126,key:57,minor:false,prog:[[0,'M'],[7,'M'],[9,'m'],[5,'M']],stab:1,bass:'saw',drums:'house',lead:'saw',rev:.2,clap:1},
  romance:{bpm:72,key:57,minor:false,prog:[[0,'M7'],[5,'M7'],[9,'m7'],[7,'add9']],piano:1,strings:1,bass:'sine',drums:'none',lead:'piano',rev:.55},
  space:{bpm:64,key:48,minor:true,prog:[[0,'add9'],[8,'M7'],[3,'add9'],[10,'add9']],pad:1,arp:1,bass:'none',drums:'none',lead:'bell',rev:.85,slow:1},
  retro80:{bpm:112,key:52,minor:true,prog:[[0,'m'],[8,'M'],[10,'M'],[7,'M']],pad:1,arp:1,bass:'saw',drums:'synth',lead:'saw',rev:.35},
  darktrap:{bpm:140,key:46,minor:true,prog:[[0,'m'],[1,'M'],[0,'m'],[8,'M']],pad:1,bass:'slide',drums:'trap',lead:'horror',rev:.4},
  boombap:{bpm:88,key:52,minor:true,prog:[[0,'m7'],[5,'m7'],[0,'m7'],[7,'7']],keys:1,bass:'sub',drums:'soft',lead:'keys',rev:.2,lofi:1},
  afro:{bpm:104,key:57,minor:false,prog:[[0,'M7'],[9,'m7'],[5,'M7'],[7,'7']],pluck:1,bass:'latin',drums:'latin',lead:'bell',rev:.25},
  bossa:{bpm:84,key:52,minor:false,prog:[[0,'M7'],[2,'m7'],[7,'7'],[0,'M7']],keys:1,bass:'latin',drums:'latin',lead:'keys',rev:.3},
  country:{bpm:108,key:55,minor:false,prog:[[0,'M'],[5,'M'],[0,'M'],[7,'M']],pluck:1,bass:'walk',drums:'rock',lead:'keys',rev:.2},
  celtic:{bpm:118,key:62,minor:false,scale:[0, 2, 4, 7, 9],prog:[[0,'M'],[10,'M'],[5,'M'],[0,'M']],pluck:1,bass:'sine',drums:'soft',lead:'bell',rev:.35},
  asia:{bpm:90,key:57,minor:false,scale:[0, 2, 4, 7, 9],prog:[[0,'add9'],[9,'m7'],[5,'add9'],[7,'add9']],pluck:1,pad:1,bass:'sine',drums:'soft',lead:'bell',rev:.45},
  march:{bpm:110,key:53,minor:false,prog:[[0,'M'],[7,'M'],[0,'M'],[5,'M']],strings:1,bass:'saw',drums:'epic',lead:'brass',rev:.3},
  western:{bpm:92,key:52,minor:true,scale:[0, 3, 5, 7, 10],prog:[[0,'m'],[10,'M'],[8,'M'],[7,'M']],pluck:1,bass:'sine',drums:'reggae',lead:'saw',rev:.5},
  pirate:{bpm:132,key:50,minor:true,prog:[[0,'m'],[10,'M'],[8,'M'],[7,'M']],strings:1,pluck:1,bass:'saw',drums:'rock',lead:'brass',rev:.3},
  medieval:{bpm:100,key:50,minor:true,scale:[0,2,3,5,7,9,10],prog:[[0,'m'],[10,'M'],[0,'m'],[5,'M']],pluck:1,bass:'sine',drums:'soft',lead:'bell',rev:.45},
  tropical:{bpm:110,key:60,minor:false,prog:[[9,'m'],[5,'M'],[0,'M'],[7,'M']],pluck:1,bass:'sine',drums:'house',lead:'bell',rev:.3},
  futurebass:{bpm:150,key:55,minor:false,prog:[[0,'M7'],[9,'m7'],[5,'M7'],[7,'add9']],stab:1,pad:1,bass:'saw',drums:'trap',lead:'saw',rev:.35},
  bigdrop:{bpm:140,key:45,minor:true,prog:[[0,'m'],[0,'m'],[8,'M'],[7,'M']],power:1,bass:'slide',drums:'drill',lead:'saw',rev:.25},
  boss:{bpm:160,key:57,minor:true,prog:[[0,'m'],[8,'M'],[10,'M'],[7,'M']],chip:1,bass:'square',drums:'chip',lead:'chip',rev:.1},
  lullaby:{bpm:66,key:60,minor:false,prog:[[0,'M'],[5,'M'],[7,'M'],[0,'M']],pluck:1,bass:'none',drums:'none',lead:'bell',rev:.6,slow:1},
  cartoon:{bpm:136,key:62,minor:false,prog:[[0,'M'],[9,'m'],[2,'m'],[7,'7']],pluck:1,bass:'walk',drums:'pop',lead:'chip',rev:.15},
  news:{bpm:120,key:50,minor:true,prog:[[0,'m'],[0,'m'],[10,'M'],[8,'M']],pad:1,arp:1,bass:'saw',drums:'pulse',lead:'none',rev:.3,tick:1},
  sport:{bpm:130,key:52,minor:true,prog:[[0,'m'],[8,'M'],[10,'M'],[7,'M']],power:1,bass:'saw',drums:'rock',lead:'saw',rev:.2,clap:1}
};
const CHD={M:[0,4,7],m:[0,3,7],M7:[0,4,7,11],m7:[0,3,7,10],'7':[0,4,7,10],dim:[0,3,6],add9:[0,4,7,14]};
const MSC=(n)=>440*Math.pow(2,(n-69)/12);
function musRng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000}}
async function musicRender(style,dur,seed=7){
  const S=MUS[style],sr=44100,ac=new OfflineAudioContext(2,Math.ceil(sr*dur),sr),R=musRng(seed+style.length*977);
  const master=ac.createGain();master.gain.value=.8;let out=master;
  if(S.lofi){const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;master.connect(lp);out=lp}
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;out.connect(comp);comp.connect(ac.destination);
  // réverbération : réponse impulsionnelle faite de bruit qui s'éteint
  const ir=ac.createBuffer(2,sr*2.6,sr);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6)}
  const rev=ac.createConvolver();rev.buffer=ir;const wet=ac.createGain();wet.gain.value=S.rev;rev.connect(wet);wet.connect(master);
  const bus=(g=1,pan=0)=>{const n=ac.createGain();n.gain.value=g;const p=ac.createStereoPanner();p.pan.value=pan;n.connect(p);p.connect(master);p.connect(rev);return n};
  const noiseBuf=ac.createBuffer(1,sr,sr);{const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const env=(g,t,a,peak,d,sus=0,rel=.1,len=0)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(peak*sus,t+a,d/3);if(len){g.gain.setTargetAtTime(0,t+len,rel/3)}};
  const tone=(type,f,t,len,peak,dest,o={})=>{const os=ac.createOscillator();os.type=type;os.frequency.value=f;if(o.det)os.detune.value=o.det;const g=ac.createGain();env(g,t,o.a??.005,peak,o.d??len,o.s??0,o.r??.08,len);
    let node=os;if(o.lp){const f2=ac.createBiquadFilter();f2.type='lowpass';f2.frequency.setValueAtTime(o.lp,t);if(o.lpEnd)f2.frequency.exponentialRampToValueAtTime(o.lpEnd,t+Math.max(.05,len));f2.Q.value=o.q??.7;os.connect(f2);node=f2}
    node.connect(g);g.connect(dest);os.start(t);os.stop(t+len+(o.r??.08)*3+.05)};
  const noise=(t,len,peak,dest,type,f,q=1)=>{const s=ac.createBufferSource();s.buffer=noiseBuf;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=ac.createGain();g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(.001,t+len);s.connect(fl);fl.connect(g);g.connect(dest);s.start(t,R()*.5);s.stop(t+len+.05)};
  const kick=(t,v=1)=>{const os=ac.createOscillator();os.frequency.setValueAtTime(150,t);os.frequency.exponentialRampToValueAtTime(42,t+.12);const g=ac.createGain();g.gain.setValueAtTime(.95*v,t);g.gain.exponentialRampToValueAtTime(.001,t+.45);os.connect(g);g.connect(drumB);os.start(t);os.stop(t+.5)};
  const snare=(t,v=1)=>{noise(t,.18,.55*v,drumB,'bandpass',1900,.8);tone('triangle',190,t,.08,.35*v,drumB)};
  const hat=(t,v=1,open=0)=>noise(t,open?.25:.05,.22*v,drumB,'highpass',7500);
  const clap=(t)=>{for(let i=0;i<3;i++)noise(t+i*.012,.12,.35,drumB,'bandpass',1400,1.2)};
  const drumB=bus(.9),padB=bus(.22,-.15),bassB=bus(.55),leadB=bus(.3,.2),keyB=bus(.3,.1);
  const beat=60/S.bpm,bar=beat*4,nb=Math.ceil(dur/bar),key=S.key,scale=S.scale||(S.minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]);
  for(let b=0;b<nb;b++){
    const t0=b*bar,[rt,q]=S.prog[b%S.prog.length],ch=CHD[q].map(x=>x+rt+key),intro=b<1,end=b>=nb-1,sect=Math.floor(b/4)%4,full=!intro&&sect!==2;
    // nappe / cordes
    if(S.pad||S.strings)ch.forEach((n,i)=>[-8,8].forEach(det=>tone('sawtooth',MSC(n+12),t0,bar,S.strings?.08:.06,padB,{a:S.slow?1.5:.4,d:bar,s:.85,r:.6,det,lp:S.strings?2200:1100})));
    // piano / claviers
    if(S.piano||S.keys){const pat=S.piano?[0,1.5,2,3]:[0,2.5];pat.forEach(k=>ch.forEach(n=>tone('triangle',MSC(n+12),t0+k*beat,beat*1.6,S.piano?.11:.08,keyB,{a:.004,d:1.2,s:.15,r:.4,lp:S.keys?2400:5000})))}
    if(S.stab&&full)[.5,1.5,2.5,3.5].forEach(k=>ch.forEach(n=>tone('sawtooth',MSC(n+12),t0+k*beat,beat*.25,.07,keyB,{a:.003,d:.15,s:0,lp:3000,lpEnd:600})));
    // cordes pincées / arpège
    if(S.pluck||S.arp||S.chip){const step=S.chip||S.arp?.5:1,arp=[...ch,ch[1]+12,ch[0]+12];for(let k=0;k<4/step;k++){if(intro&&!S.chip&&k%2)continue;const n=arp[(k+(S.arp?b:0))%arp.length]+12;tone(S.chip?'square':'triangle',MSC(n),t0+k*step*beat,step*beat*.9,S.chip?.05:.09,leadB,{a:.002,d:.25,s:0,lp:S.chip?6000:3500,lpEnd:900})}}
    if(S.power&&full)[0,.5,1,1.5,2,2.5,3,3.5].forEach(k=>[ch[0],ch[0]+7,ch[0]+12].forEach(n=>tone('sawtooth',MSC(n),t0+k*beat,beat*.45,.06,keyB,{a:.003,d:.4,s:.5,lp:1600,q:2})));
    if(S.skank)[1,3].forEach(k=>ch.forEach(n=>tone('square',MSC(n+12),t0+k*beat,beat*.18,.05,keyB,{a:.002,d:.1,s:0,lp:2500})));
    if(S.drone)[0,7].forEach(d=>tone('sawtooth',MSC(key-12+d),t0,bar,.07,padB,{a:1,d:bar,s:1,r:1,lp:300,det:R()*20-10}));
    if(S.sleigh)for(let k=0;k<8;k++)noise(t0+k*beat/2,.08,.12,drumB,'highpass',9000);
    // basse
    if(S.bass==='walk'){const r=ch[0]-12,wn=[0,4,7,9];wn.forEach((d,k)=>tone('triangle',MSC(r+d),t0+k*beat,beat*.9,.4,bassB,{a:.01,d:beat,s:.5,lp:900}))}
    else if(S.bass==='latin'){const r=ch[0]-12;[[0,.5],[1.5,.5],[2,.5],[3.5,.5]].forEach(([k,l],j)=>tone('sine',MSC(r+(j===2?7:0)),t0+k*beat,l*beat,.5,bassB,{a:.005,d:l*beat,s:.4}))}
    else if(S.bass==='slide'){const r=ch[0]-12;[[0,1.4],[1.5,.4],[2.5,1.2]].forEach(([k,l],j)=>{const os=ac.createOscillator();os.type='sine';const tt=t0+k*beat;os.frequency.setValueAtTime(MSC(r+(j===1?12:0)),tt);os.frequency.exponentialRampToValueAtTime(MSC(r),tt+.12);const gg=ac.createGain();gg.gain.setValueAtTime(.6,tt);gg.gain.setTargetAtTime(0,tt+l*beat,.08);os.connect(gg);gg.connect(bassB);os.start(tt);os.stop(tt+l*beat+.5)})}
    else     if(S.bass!=='none'){const r=ch[0]-12,pat=S.bass==='slap'?[[0,.3],[.75,.2],[1.5,.25],[2,.3],[2.75,.2],[3.5,.3]]:S.drums==='house'||S.bass==='square'?[[.5,.4],[1.5,.4],[2.5,.4],[3.5,.4]]:S.bass==='sub'?[[0,1.4],[1.75,.6],[2.5,1.2]]:[[0,1.5],[2,1.5]];
      pat.forEach(([k,l],j)=>tone(S.bass==='sub'||S.bass==='sine'?'sine':S.bass==='square'?'square':'sawtooth',MSC(r+(S.bass==='slap'&&j%3===1?12:0)),t0+k*beat,l*beat,S.bass==='sub'?.55:S.bass==='square'?.12:.3,bassB,{a:.005,d:l*beat,s:.6,lp:S.bass==='saw'||S.bass==='slap'?900:4000,lpEnd:300}))}
    // mélodie
    if(S.lead!=='none'&&!intro&&sect!==1){const nn=S.lead==='piano'?4:S.chip?8:S.slow?2:4;for(let k=0;k<nn;k++){if(R()<.25)continue;const deg=Math.floor(R()*scale.length),n=key+12+scale[deg]+(R()<.3?12:0),tt=t0+k*4/nn*beat,len=4/nn*beat*.9;
      if(S.lead==='bell')tone('sine',MSC(n+12),tt,len*1.5,.12,leadB,{a:.002,d:.8,s:0,r:.6});else if(S.lead==='piano'||S.lead==='keys')tone('triangle',MSC(n+12),tt,len*1.5,.13,leadB,{a:.003,d:1,s:.1,r:.5,lp:4000});
      else if(S.lead==='horror')tone('sine',MSC(n+12+(R()<.5?1:6)),tt,len*2,.06,leadB,{a:.4,d:len*2,s:.6,r:1});
      else if(S.lead==='brass')tone('sawtooth',MSC(n),tt,len,.08,leadB,{a:.06,d:len,s:.7,lp:1800});else if(S.lead==='chip')tone('square',MSC(n+12),tt,len*.8,.05,leadB,{a:.002,d:len,s:.6});else tone('sawtooth',MSC(n+12),tt,len*.7,.06,leadB,{a:.005,d:.3,s:.3,lp:2500})}}
    // batterie
    const D=S.drums;if(D!=='none'&&!(intro&&D!=='pulse')){for(let k=0;k<16;k++){const t=t0+k*beat/4,h=k%4===0,x=k%8===4;
      if(D==='pop'||D==='house'||D==='funk'){if(h)kick(t);if(x)(S.clap?clap:snare)(t);if(D==='house'?k%4===2:k%2===0)hat(t,.7,D==='house'&&k%4===2);if(D==='funk'&&(k===10||k===7))kick(t,.7)}
      else if(D==='soft'||D==='lofi'){if(k===0||k===10)kick(t,.8);if(x)snare(t,.6);if(k%2===0)hat(t,.45)}
      else if(D==='trap'){if(k===0||k===7||k===10)kick(t);if(k===8)clap(t);hat(t,.5);if(k>=12&&b%2)hat(t+beat/8,.4)}
      else if(D==='epic'){if(k===0||k===6||k===8)kick(t,1);if(x){snare(t,1);tone('sine',60,t,.4,.6,drumB)}if(sect===3&&k%2===0)snare(t,.35)}
      else if(D==='pulse'){if(h)kick(t,.6);if(S.tick&&k%2===0)hat(t,.3)}
      else if(D==='rock'){if(k===0||k===8||k===10)kick(t);if(x)snare(t,1.1);if(k%2===0)hat(t,.6);if(sect===3&&k===14)snare(t,.8)}
      else if(D==='jazz'){const sw=k%4===2?beat/12:0;if(k%4===0||k%4===3||k%4===2)noise(t+sw,.18,.12,drumB,'highpass',6000);if(k%8===4)noise(t,.05,.15,drumB,'highpass',8000);if(k===0)kick(t,.4)}
      else if(D==='synth'){if(h)kick(t);if(x){snare(t,1);noise(t,.35,.25,drumB,'bandpass',1200)}if(k%2===0)hat(t,.5)}
      else if(D==='reggae'){if(k===8)kick(t);if(k===8)snare(t,.7);if(k%4===2)hat(t,.5)}
      else if(D==='latin'){if([0,3,6,10,12].includes(k))tone('sine',900,t,.05,.25,drumB);if(h)kick(t,.7);if(k===4||k===12)noise(t,.1,.3,drumB,'bandpass',600,3);if(k%2)hat(t,.3)}
      else if(D==='drill'){if(k===0||k===11)kick(t);if(k===6||k===14)snare(t,1);hat(t,.45);if(k%4===3)[1,2].forEach(j=>hat(t+j*beat/12,.35))}
      else if(D==='chip'){if(h)noise(t,.08,.5,drumB,'lowpass',400);if(x)noise(t,.1,.4,drumB,'bandpass',2500);if(k%2)noise(t,.03,.18,drumB,'highpass',9000)}}}
  }
  if(S.lofi){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=3000;const g=ac.createGain();g.gain.value=.025;s.connect(f);f.connect(g);g.connect(ac.destination);s.start(0)}
  master.gain.setValueAtTime(.8,0);master.gain.setValueAtTime(.8,Math.max(0,dur-2.5));master.gain.linearRampToValueAtTime(0,dur);
  const buf=await ac.startRendering(),L=buf.getChannelData(0),Rr=buf.getChannelData(1);
  // même volume pour toutes les musiques : crête ramenée à -1,5 dB
  let pk=1e-6;for(let i=0;i<L.length;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(Rr[i]));const g=.84/pk;for(let i=0;i<L.length;i++){L[i]*=g;Rr[i]*=g}
  return[L,Rr];
}
let musDur=60,musPrev=null;
function renderMusic(){
  const L=$('#muslist');if(!L)return;
  const D=$('#mdur');if(D&&!D.dataset.ok){D.dataset.ok=1;D.innerHTML=[30,60,120,180].map(s=>`<option value="${s}" ${s===musDur?'selected':''}>${s<60?s+' s':(s/60)+' min'}</option>`).join('');D.onchange=()=>{musDur=+D.value}}
  L.innerHTML=Object.keys(MUS).map(k=>`<div class="srow"><button data-mprev="${k}" title="${T('common.listen')}">${ico('play',14)}</button><span>${T('mus.'+k)}</span><span class="hint">${MUS[k].bpm} bpm</span><button data-mus="${k}" title="${T('common.addAtPlayhead')}">+</button></div>`).join('');
}
async function musicMedia(k,dur){
  const name=`DedCut-musique-${k}-${dur}s.wav`;let m=media.find(x=>x.name===name);if(m)return m;
  toast(T('mus.making'));const[l,r]=await musicRender(k,dur);m=await addGenerated(new File([wavFromChannels([l,r],44100)],name,{type:'audio/wav'}));m.duration=dur;return m;
}
document.addEventListener('click',async e=>{
  // seulement les styles de cette liste (le mixeur du studio a aussi des boutons data-mus : « play », « next »)
  let p=e.target.closest('[data-mprev]'),a=e.target.closest('[data-mus]');if(p&&!MUS[p.dataset.mprev])p=null;if(a&&!MUS[a.dataset.mus])a=null;
  if(p){if(musPrev){try{musPrev.stop()}catch(x){}musPrev=null;if(p.classList.contains('on')){p.classList.remove('on');return}}$$('[data-mprev].on').forEach(b=>b.classList.remove('on'));p.classList.add('on');
    const[l,r]=await musicRender(p.dataset.mprev,16),ac=new AudioContext(),b=ac.createBuffer(2,l.length,44100);b.copyToChannel(l,0);b.copyToChannel(r,1);const s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);s.start();musPrev=s;s.onended=()=>{p.classList.remove('on');ac.close()}}
  if(a){const m=await musicMedia(a.dataset.mus,musDur);add(newClip({track:tk('audio'),mid:m.id,start:time,dur:m.duration,p:{vol:70}}))}
});
setTimeout(renderMusic,0);

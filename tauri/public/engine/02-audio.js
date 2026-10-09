/* ---------- audio ---------- */
function ensureAudio(){
  if(actx)return;
  actx=new(window.AudioContext||window.webkitAudioContext)();
  master=actx.createGain();spk=actx.createGain();recDest=actx.createMediaStreamDestination();limN=actx.createDynamicsCompressor();limiterSet(limN);
  master.gain.value=masterVol/100;master.connect(limN);limN.connect(spk);spk.connect(actx.destination);limN.connect(recDest);
  const sp=actx.createChannelSplitter(2);anL=actx.createAnalyser();anR=actx.createAnalyser();anL.fftSize=anR.fftSize=1024;limN.connect(sp);sp.connect(anL,0);sp.connect(anR,1);
  try{actx.audioWorklet.addModule(URL.createObjectURL(new Blob([PS_SRC],{type:'application/javascript'}))).then(()=>psState=1).catch(()=>psState=-1)}catch(e){psState=-1}
}

/* ---------- voix déformée (décaleur de hauteur + robot + distorsion + écho + radio) ---------- */
let psState=0; // 0 = chargement, 1 = prêt, -1 = indisponible
const srcs=new Map(),vch=new Map();
const PS_SRC=`class P extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'pitch',defaultValue:1,minValue:.25,maxValue:3,automationRate:'k-rate'}]}
constructor(){super();this.N=16384;this.buf=[new Float32Array(this.N),new Float32Array(this.N)];this.w=0;this.ph=0}
process(ins,outs,pr){
  const i0=ins[0],o=outs[0];if(!i0||!i0.length)return true;
  const N=this.N,m=N-1,win=Math.floor(sampleRate*.08),inc=(1-pr.pitch[0])/win,nc=Math.min(2,o.length);
  for(let n=0;n<i0[0].length;n++){
    const a=this.ph,b=(a+.5)%1,wa=.5-.5*Math.cos(6.283185307*a),wb=1-wa,k=1/Math.sqrt(wa*wa+wb*wb); // puissance constante : le volume ne baisse plus
    for(let c=0;c<nc;c++){
      const buf=this.buf[c];buf[this.w]=(i0[c]||i0[0])[n];let y=0;
      for(const[p,wp]of[[a,wa],[b,wb]]){const r=this.w-p*win+N,i=Math.floor(r),f=r-i;y+=(buf[i&m]*(1-f)+buf[(i+1)&m]*f)*wp}
      o[c][n]=y*k;
    }
    this.w=(this.w+1)&m;this.ph+=inc;this.ph-=Math.floor(this.ph);
  }
  return true;
}}
registerProcessor('pitchshift',P);
class G extends AudioWorkletProcessor{
static get parameterDescriptors(){return[{name:'thr',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'}]}
constructor(){super();this.env=0;this.g=1}
process(ins,outs,pr){
  const i=ins[0],o=outs[0];if(!i||!i.length)return true;
  const thr=pr.thr[0],a=Math.exp(-1/(sampleRate*.004)),r=Math.exp(-1/(sampleRate*.12));
  for(let n=0;n<i[0].length;n++){
    let x=0;for(let c=0;c<i.length;c++){const v=Math.abs(i[c][n]);if(v>x)x=v}
    this.env=x>this.env?x:this.env*.9995;
    const want=thr<=0||this.env>thr?1:.04;
    this.g=want+(this.g-want)*(want>this.g?a:r);
    for(let c=0;c<o.length;c++)o[c][n]=(i[c]||i[0])[n]*this.g;
  }
  return true;
}}
registerProcessor('gate',G);`;
const voiceDefaults=()=>({on:false,pitch:1,robot:0,dist:0,echo:0,radio:false,muff:0,thin:0,wob:0,wobF:5,wobSq:false,chorus:0,crush:0,vrev:0,vrevL:2,edl:.18,pre:''});
const VP={
  anonyme:{pitch:.72,robot:20,dist:25,echo:0,radio:false},
  robot:{pitch:1,robot:100,dist:15,echo:0,radio:false},
  demon:{pitch:.55,robot:0,dist:45,echo:25,radio:false},
  radio:{pitch:1,robot:0,dist:40,echo:0,radio:true},
  aigu:{pitch:1.5,robot:0,dist:0,echo:0,radio:false},
  echo:{pitch:1,robot:0,dist:0,echo:55,radio:false},
  enfant:{pitch:1.3,robot:0,dist:0,echo:0,radio:false},
  monstre:{pitch:.5,robot:20,dist:35,echo:15,radio:false},
  alien:{pitch:1.35,robot:60,dist:10,echo:20,radio:false},
  megaphone:{pitch:1,robot:0,dist:65,echo:10,radio:true},
  giant:{pitch:.62,vrev:25,vrevL:2.2},squirrel:{pitch:1.75},ghost:{pitch:.9,wob:35,wobF:3,vrev:60,vrevL:3.5,muff:20},
  cyborg:{pitch:.9,robot:55,chorus:50,dist:10},witch:{pitch:1.22,wob:22,wobF:7,dist:15},
  walkie:{radio:true,dist:55,crush:40,thin:30},cassette:{muff:35,wob:14,wobF:1.2,crush:15,dist:10},gramo:{thin:45,muff:45,dist:15,crush:10},
  speaker:{thin:60,muff:25,dist:55},chip:{crush:88,pitch:1.1,thin:10},
  cave:{echo:40,edl:.35,vrev:40,vrevL:3},church:{vrev:75,vrevL:4.5},bath:{vrev:50,vrevL:.8},stadium:{echo:30,edl:.55,vrev:50,vrevL:2.6,thin:15},
  water:{muff:88,wob:30,wobF:2.5,pitch:.92},hall:{vrev:35,vrevL:1.4,thin:10},
  villain:{pitch:.7,dist:20,vrev:30,vrevL:2},elf:{pitch:1.4,chorus:30,vrev:20,vrevL:1.5},troll:{pitch:.6,dist:30,muff:20},
  phone:{radio:true,thin:50,crush:20},retro8:{crush:95,pitch:1.2},space:{echo:50,edl:.45,vrev:70,vrevL:5,chorus:30},tunnel:{vrev:55,vrevL:1.6,echo:25,edl:.2},stage:{vrev:30,vrevL:2,echo:12,edl:.25},
  drunk:{pitch:.95,wob:60,wobF:1.5},choir:{chorus:100,vrev:40,vrevL:3},
  double:{chorus:75},shaky:{wob:45,wobF:6},stutter:{wob:100,wobF:9,wobSq:true},lofi:{crush:55,muff:30},fuzz:{dist:75},longecho:{echo:70,edl:.6},
  none:{}
};
/* classement des voix (catégories propres à DedCut) */
const VCAT={perso:['anonyme','robot','demon','aigu','enfant','monstre','alien','giant','squirrel','ghost','cyborg','witch','villain','elf','troll'],device:['radio','megaphone','walkie','cassette','gramo','speaker','chip','phone','retro8'],
  place:['echo','cave','church','bath','stadium','water','hall','space','tunnel','stage'],fx:['double','shaky','stutter','lofi','fuzz','longecho','drunk','choir']};
const VN={anonyme:'voice.anon',robot:'voice.robot',demon:'voice.deep',aigu:'voice.high',enfant:'voice.child',monstre:'voice.monster',alien:'voice.alien',radio:'voice.radio',megaphone:'voice.megaphone',echo:'voice.echo',none:'voice.normal'};
const vName=k=>VN[k]||'vc.'+k;
let vCat='perso',vFineOpen=false;
function buildVoice(A=actx,st=psState){
  let ps;
  if(st===1)ps=new AudioWorkletNode(A,'pitchshift',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'}); // stéréo gardée
  else if(st===-1)ps=A.createGain();
  else return null;
  const inn=A.createGain(),dry=A.createGain(),wet=A.createGain(),rm=A.createGain(),osc=A.createOscillator(),mix=A.createGain();
  inn.connect(ps);rm.gain.value=0;osc.frequency.value=55;osc.connect(rm.gain);osc.start();
  ps.connect(dry);dry.connect(mix);ps.connect(rm);rm.connect(wet);wet.connect(mix);
  const sh=A.createWaveShaper();sh.oversample='2x';mix.connect(sh);
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
}
function applyVoice(c){
  const src=srcs.get(c.id);if(!src)return;
  const dst=(chains.get(c.id)||{}).in||master;
  const v=c.p.voice,on=!!(v&&v.on);let ch=vch.get(c.id);
  if(!on){if(ch&&ch.active){src.disconnect();ch.out.disconnect();src.connect(dst);ch.active=false}return}
  if(!ch){ch=buildVoice();if(!ch)return;vch.set(c.id,ch)}
  if(!ch.active){src.disconnect();src.connect(ch.in);ch.out.connect(dst);ch.active=true;ch.sig=''}
  const sig=JSON.stringify(v);if(sig===ch.sig)return;ch.sig=sig;
  voiceParams(ch,v);
}
function voiceParams(ch,v){
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
}
function getEl(c){
  if(els.has(c.id))return els.get(c.id);
  const m=mById(c.mid);if(!m||!m.url)return null;
  let el;
  if(m.type==='image'){el=new Image();el.crossOrigin='anonymous';el.src=m.url}
  else{
    ensureAudio();
    el=document.createElement(m.type);el.crossOrigin='anonymous';if(m.type==='video'){pxLookup(m);el._src=pxUrl(m);el.src=el._src;el.addEventListener('error',()=>{if(m.proxyUrl&&el._src===m.proxyUrl){m.proxyUrl=null;pxSetEls(m,m.url);renderBin()}})}else el.src=m.url;el.preload='auto';el.playsInline=true;
    try{const s=actx.createMediaElementSource(el),ch=buildChain(actx,psState);ch.out.connect(master);s.connect(ch.in);srcs.set(c.id,s);chains.set(c.id,ch)}catch(e){}
  }
  els.set(c.id,el);return el;
}

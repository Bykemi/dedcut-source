// DedCut Musique — traitements qui tournent dans le fil audio (AudioWorklet) : aucun objet créé pendant le calcul,
// tampons alloués une seule fois. Code chargé une fois par contexte audio (blob).
export const WORKLETS = String.raw`
const DB=x=>Math.pow(10,x/20),TODB=x=>x<1e-9?-180:20*Math.log10(x);
// --- enregistrement : renvoie les échantillons par paquets (transférés, pas copiés)
class Rec extends AudioWorkletProcessor{constructor(o){super();this.on=false;this.at=-1;this.n=0;this.f0=0;this.size=8192;this.ch=Math.max(1,(o.processorOptions&&o.processorOptions.ch)||2);this.buf=[];for(let c=0;c<this.ch;c++)this.buf.push(new Float32Array(this.size));
  // 'start' : tout de suite ; {start:F} : à partir de l'échantillon F (départ exact) ; 'stop' : envoie le reste
  this.port.onmessage=e=>{const d=e.data;if(d==='start'){this.on=true;this.at=-1;this.n=0}else if(d&&d.start!=null){this.on=false;this.at=d.start;this.n=0}else if(d==='stop'){this.flush();this.on=false;this.at=-1;this.port.postMessage({end:true})}}}
  flush(){if(!this.n)return;const out=this.buf.map(b=>b.slice(0,this.n));this.port.postMessage({ch:out,frame:this.f0},out.map(b=>b.buffer));this.n=0}
  process(i){const inp=i[0];if(!inp||!inp.length)return true;const len=inp[0].length;
    if(!this.on){if(this.at<0||currentFrame+len<=this.at)return true;this.on=true}
    for(let k=0;k<len;k++){if(currentFrame+k<this.at)continue;if(this.n===0)this.f0=currentFrame+k;for(let c=0;c<this.ch;c++){const s=inp[Math.min(c,inp.length-1)];this.buf[c][this.n]=s[k]}this.n++;if(this.n>=this.size)this.flush()}return true}}
registerProcessor('mu-rec',Rec);
// --- porte de bruit / expandeur
class Gate extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'thr',defaultValue:-45},{name:'range',defaultValue:-60},{name:'att',defaultValue:.002},{name:'rel',defaultValue:.12},{name:'hold',defaultValue:.05},{name:'ratio',defaultValue:0}]}
  constructor(){super();this.env=0;this.g=1;this.h=0}
  process(i,o,p){const a=i[0],b=o[0];if(!a||!a.length)return true;const n=a[0].length,thr=DB(p.thr[0]),floor=DB(p.range[0]),at=Math.exp(-1/(sampleRate*Math.max(1e-4,p.att[0]))),rl=Math.exp(-1/(sampleRate*Math.max(1e-3,p.rel[0]))),hold=p.hold[0]*sampleRate,ratio=p.ratio[0];
    for(let k=0;k<n;k++){let m=0;for(const c of a)m=Math.max(m,Math.abs(c[k]));this.env=m>this.env?m:this.env*.9995+m*.0005;
      let want=1;if(this.env<thr){if(this.h>0){this.h--;}else want=ratio>1?Math.max(floor,Math.pow(this.env/thr,ratio-1)):floor}else this.h=hold;
      this.g=want>this.g?want+(this.g-want)*at:want+(this.g-want)*rl;for(let c=0;c<b.length;c++)b[c][k]=(a[Math.min(c,a.length-1)][k])*this.g}return true}}
registerProcessor('mu-gate',Gate);
// --- compresseur avec entrée de déclenchement (sidechain) sur la 2e entrée
class Comp extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'thr',defaultValue:-20},{name:'ratio',defaultValue:4},{name:'att',defaultValue:.01},{name:'rel',defaultValue:.15},{name:'knee',defaultValue:6},{name:'makeup',defaultValue:0}]}
  constructor(){super();this.env=0;this.gr=0;this.port.onmessage=()=>{};this.t=0}
  process(i,o,p){const a=i[0],key=i[1]&&i[1].length?i[1]:a,b=o[0];if(!a||!a.length)return true;const n=a[0].length,T=p.thr[0],R=Math.max(1,p.ratio[0]),K=Math.max(0,p.knee[0]),mk=DB(p.makeup[0]),at=Math.exp(-1/(sampleRate*Math.max(1e-4,p.att[0]))),rl=Math.exp(-1/(sampleRate*Math.max(1e-3,p.rel[0])));let red=0;
    for(let k=0;k<n;k++){let m=0;for(const c of key)m=Math.max(m,Math.abs(c[k]));const x=TODB(m);let y=x;
      if(2*(x-T)<-K)y=x;else if(2*Math.abs(x-T)<=K)y=x+(1/R-1)*Math.pow(x-T+K/2,2)/(2*K||1);else y=T+(x-T)/R;
      const g=y-x;this.gr=g<this.gr?g+(this.gr-g)*at:g+(this.gr-g)*rl;const lin=DB(this.gr)*mk;red=Math.min(red,this.gr);
      for(let c=0;c<b.length;c++)b[c][k]=a[Math.min(c,a.length-1)][k]*lin}
    if(++this.t%32===0)this.port.postMessage(red);return true}}
registerProcessor('mu-comp',Comp);
// --- limiteur à anticipation (crête), latence fixe de 1,5 ms
class Limit extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'ceil',defaultValue:-.3},{name:'rel',defaultValue:.08},{name:'gain',defaultValue:0}]}
  constructor(){super();this.L=Math.round(sampleRate*.0015);this.d=[new Float32Array(this.L+1),new Float32Array(this.L+1)];this.w=0;this.g=1;this.pk=new Float32Array(this.L+1);this.t=0;this.min=1}
  process(i,o,p){const a=i[0],b=o[0];if(!a||!a.length)return true;const n=a[0].length,ceil=DB(p.ceil[0]),pre=DB(p.gain[0]),rl=Math.exp(-1/(sampleRate*Math.max(.005,p.rel[0]))),L=this.L;
    for(let k=0;k<n;k++){let m=0;for(let c=0;c<2;c++){const s=a[Math.min(c,a.length-1)][k]*pre;this.d[c][this.w]=s;m=Math.max(m,Math.abs(s))}this.pk[this.w]=m;
      let mx=0;for(let j=0;j<=L;j++)if(this.pk[j]>mx)mx=this.pk[j];const want=mx>ceil?ceil/mx:1;this.g=want<this.g?want:want+(this.g-want)*rl;if(this.g<this.min)this.min=this.g;
      const r=(this.w+1)%(L+1);for(let c=0;c<b.length;c++)b[c][k]=Math.max(-ceil,Math.min(ceil,this.d[Math.min(c,1)][r]*this.g));this.w=r}
    if(++this.t%32===0){this.port.postMessage(TODB(this.min));this.min=1}return true}}
registerProcessor('mu-limit',Limit);
// --- de-esseur : détecte les sifflantes (bande haute) et baisse seulement quand elles dépassent
class Deess extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'freq',defaultValue:6500},{name:'thr',defaultValue:-28},{name:'range',defaultValue:-10}]}
  constructor(){super();this.x1=[0,0];this.y1=[0,0];this.env=0;this.g=1}
  process(i,o,p){const a=i[0],b=o[0];if(!a||!a.length)return true;const n=a[0].length,f=p.freq[0],rc=1/(2*Math.PI*f),dt=1/sampleRate,al=rc/(rc+dt),thr=DB(p.thr[0]),floor=DB(p.range[0]);
    for(let k=0;k<n;k++){let m=0;for(let c=0;c<a.length&&c<2;c++){const x=a[c][k],y=al*(this.y1[c]+x-this.x1[c]);this.x1[c]=x;this.y1[c]=y;m=Math.max(m,Math.abs(y))}
      this.env=Math.max(m,this.env*.999);const want=this.env>thr?Math.max(floor,thr/this.env):1;this.g+=(want-this.g)*(want<this.g?.05:.002);
      for(let c=0;c<b.length;c++){const s=a[Math.min(c,a.length-1)][k],hp=c<2?this.y1[c]:0;b[c][k]=s-hp+hp*this.g}}return true}}
registerProcessor('mu-deess',Deess);
// --- changement de hauteur en temps réel (2 grains en fondu)
class Pitch extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'semi',defaultValue:0},{name:'mix',defaultValue:1}]}
  constructor(){super();this.N=4096;this.b=[new Float32Array(this.N),new Float32Array(this.N)];this.w=0;this.ph=0;this.G=Math.round(sampleRate*.05)}
  process(i,o,p){const a=i[0],out=o[0];if(!a||!a.length)return true;const n=a[0].length,r=Math.pow(2,p.semi[0]/12),mix=p.mix[0],N=this.N,G=this.G;
    for(let k=0;k<n;k++){for(let c=0;c<2;c++)this.b[c][this.w]=a[Math.min(c,a.length-1)][k];
      this.ph=(this.ph+(1-r)+G)%G;const d1=this.ph,d2=(this.ph+G/2)%G,w1=Math.sin(Math.PI*d1/G),w2=Math.sin(Math.PI*d2/G);
      for(let c=0;c<out.length;c++){const bb=this.b[Math.min(c,1)];let pos=(this.w-d1-1+N*2)%N,i0=Math.floor(pos),f=pos-i0;const r1=bb[i0]*(1-f)+bb[(i0+1)%N]*f;
        pos=(this.w-d2-1+N*2)%N;i0=Math.floor(pos);f=pos-i0;const r2=bb[i0]*(1-f)+bb[(i0+1)%N]*f;
        out[c][k]=a[Math.min(c,a.length-1)][k]*(1-mix)+(r1*w1*w1+r2*w2*w2)*mix}this.w=(this.w+1)%N}return true}}
registerProcessor('mu-pitch',Pitch);
// --- réduction de bits et de fréquence
class Crush extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'bits',defaultValue:8},{name:'down',defaultValue:4},{name:'mix',defaultValue:1}]}
  constructor(){super();this.h=[0,0];this.c=0}
  process(i,o,p){const a=i[0],b=o[0];if(!a||!a.length)return true;const n=a[0].length,q=Math.pow(2,Math.max(1,p.bits[0])-1),dn=Math.max(1,Math.round(p.down[0])),mix=p.mix[0];
    for(let k=0;k<n;k++){if(this.c++%dn===0)for(let c=0;c<2;c++)this.h[c]=Math.round(a[Math.min(c,a.length-1)][k]*q)/q;for(let c=0;c<b.length;c++){const s=a[Math.min(c,a.length-1)][k];b[c][k]=s*(1-mix)+this.h[Math.min(c,1)]*mix}}return true}}
registerProcessor('mu-crush',Crush);
// --- suppression des clics : un échantillon qui saute loin de ses voisins est remplacé par l'interpolation
class Declick extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'sens',defaultValue:.5}]}
  constructor(){super();this.p=[[0,0,0],[0,0,0]];this.e=[0,0]}
  process(i,o,p){const a=i[0],b=o[0];if(!a||!a.length)return true;const n=a[0].length,k0=3+(1-p.sens[0])*12;
    for(let c=0;c<b.length;c++){const s=a[Math.min(c,a.length-1)],d=b[c],h=this.p[Math.min(c,1)];for(let k=0;k<n;k++){const x=s[k],pred=2*h[2]-h[1],err=Math.abs(x-pred);this.e[Math.min(c,1)]=this.e[Math.min(c,1)]*.995+err*.005;
      const y=err>k0*this.e[Math.min(c,1)]+.02?pred:x;d[k]=y;h[0]=h[1];h[1]=h[2];h[2]=y}}return true}}
registerProcessor('mu-declick',Declick);
// --- corrélation de phase et sonie (momentanée, court terme, intégrée) + crête : mesures du master
class Meter extends AudioWorkletProcessor{constructor(){super();this.ic=0;this.integ=null;this.t=0;this.s=[0,0,0];this.pk=0;this.blocks=[];this.ms=0;this.cnt=0;this.st=[];
  this.k=[[0,0,0,0],[0,0,0,0]];this.k2=[[0,0,0,0],[0,0,0,0]];this.port.onmessage=e=>{if(e.data==='reset'){this.blocks=[];this.st=[];this.integ=null}};
  const sr=sampleRate;let f0=1681.974450955533,G=3.999843853973347,Q=.7071752369554196,K=Math.tan(Math.PI*f0/sr),Vh=Math.pow(10,G/20),Vb=Math.pow(Vh,.4996667741545416),a0=1+K/Q+K*K;
  this.c1=[(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0,2*(K*K-1)/a0,(1-K/Q+K*K)/a0];f0=38.13547087602444;Q=.5003270373238773;K=Math.tan(Math.PI*f0/sr);a0=1+K/Q+K*K;this.c2=[1,-2,1,2*(K*K-1)/a0,(1-K/Q+K*K)/a0]}
  bq(x,c,z){const y=c[0]*x+c[1]*z[0]+c[2]*z[1]-c[3]*z[2]-c[4]*z[3];z[1]=z[0];z[0]=x;z[3]=z[2];z[2]=y;return y}
  process(i){const a=i[0];if(!a||!a.length)return true;const n=a[0].length,L=a[0],R=a[1]||a[0];
    for(let k=0;k<n;k++){const l=L[k],r=R[k];this.s[0]+=l*r;this.s[1]+=l*l;this.s[2]+=r*r;this.pk=Math.max(this.pk,Math.abs(l),Math.abs(r));
      const kl=this.bq(this.bq(l,this.c1,this.k[0]),this.c2,this.k2[0]),kr=this.bq(this.bq(r,this.c1,this.k[1]),this.c2,this.k2[1]);this.ms+=kl*kl+kr*kr;this.cnt++}
    if(this.cnt>=sampleRate*.1){this.blocks.push(this.ms/this.cnt);if(this.blocks.length>36000)this.blocks.shift();this.ms=0;this.cnt=0;
      const LU=z=>-0.691+10*Math.log10(z||1e-12),avg=(arr)=>arr.reduce((x,y)=>x+y,0)/Math.max(1,arr.length);
      const mom=LU(avg(this.blocks.slice(-4))),sh=LU(avg(this.blocks.slice(-30)));
      // sonie intégrée (avec les deux seuils de la norme) recalculée une fois par seconde
      if(++this.ic%10===0||this.integ==null){let s1=0,n1=0;for(let j=3;j<this.blocks.length;j++){const z=(this.blocks[j]+this.blocks[j-1]+this.blocks[j-2]+this.blocks[j-3])/4;if(z>1.17e-7){s1+=z;n1++}}
        const rel=n1?LU(s1/n1)-10:-70,thr=Math.pow(10,(rel+0.691)/10);let s2=0,n2=0;for(let j=3;j<this.blocks.length;j++){const z=(this.blocks[j]+this.blocks[j-1]+this.blocks[j-2]+this.blocks[j-3])/4;if(z>1.17e-7&&z>thr){s2+=z;n2++}}this.integ=n2?LU(s2/n2):-70}
      const integ=this.integ;
      const corr=this.s[1]&&this.s[2]?this.s[0]/Math.sqrt(this.s[1]*this.s[2]):1;
      this.port.postMessage({mom,sh,integ,corr,peak:TODB(this.pk)});this.s=[0,0,0];this.pk=0}
    return true}}
registerProcessor('mu-meter',Meter);
// --- suiveur d'enveloppe d'une bande (égalisation dynamique) : sort un signal de commande (gain en dB) pour un filtre
class DynBand extends AudioWorkletProcessor{static get parameterDescriptors(){return[{name:'freq',defaultValue:3000},{name:'q',defaultValue:1.5},{name:'thr',defaultValue:-24},{name:'range',defaultValue:-8}]}
  constructor(){super();this.z=[0,0,0,0];this.env=0;this.g=0}
  process(i,o,p){const a=i[0],out=o[0];if(!a||!a.length)return true;const n=a[0].length,w=2*Math.PI*p.freq[0]/sampleRate,al=Math.sin(w)/(2*Math.max(.1,p.q[0])),a0=1+al,
    b0=al/a0,b2=-al/a0,a1=-2*Math.cos(w)/a0,a2=(1-al)/a0,thr=p.thr[0],rng=p.range[0];
    for(let k=0;k<n;k++){let x=0;for(const c of a)x+=c[k]/a.length;const y=b0*x+b2*this.z[1]-a1*this.z[2]-a2*this.z[3];this.z[1]=this.z[0];this.z[0]=x;this.z[3]=this.z[2];this.z[2]=y;
      this.env=Math.max(Math.abs(y),this.env*.9993);const over=TODB(this.env)-thr,want=over>0?Math.max(rng,-over*.7):0;this.g+=(want-this.g)*.003;out[0][k]=this.g}return true}}
registerProcessor('mu-dynband',DynBand);
`;
const loaded = new WeakMap<BaseAudioContext, Promise<void>>();
/** charge les traitements dans un contexte audio (une seule fois) */
export function loadWorklets(ctx: BaseAudioContext): Promise<void> {
  let p = loaded.get(ctx);
  if (!p) { const url = URL.createObjectURL(new Blob([WORKLETS], { type: 'application/javascript' })); p = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url)); loaded.set(ctx, p); }
  return p;
}

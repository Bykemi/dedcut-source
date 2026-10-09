/* ---------- Multicam (v4.57) : plusieurs caméras du même moment, calées par le son ; on choisit l'angle en direct ----------
   - « Créer un multicam » (2 à 4 clips vidéo sélectionnés) : les sons sont comparés (énergie du son 20 fois par seconde
     pour trouver le décalage, puis 200 fois par seconde pour l'affiner) et chaque angle est posé sur sa propre piste vidéo,
     calé sur le premier. Le son gardé est celui du premier angle (les autres sont coupés, ancien volume dans p.mcVol).
   - Touches 1 à 4 (réglables) ou la barre au-dessus de l'aperçu : à la tête de lecture, les angles sont coupés et seul
     l'angle choisi reste visible jusqu'au changement suivant. Les autres sont masqués (p.mcOff) : rien n'est supprimé,
     on peut changer d'avis à tout moment. Repère de chaque clip : p.mc = {g: groupe, a: angle}. */
const mcClips=()=>clips.filter(c=>c.p&&c.p.mc);
const mcCan=c=>isVid(c)&&c.mid&&!c.gen&&(mById(c.mid)||{}).type==='video';
/** énergie du son d'un clip, R fois par seconde, du début à la fin du clip (temps du montage) */
async function mcEnv(c,R){
  const m=mById(c.mid),b=await decodeAudio(m),n=Math.max(1,Math.floor(c.dur*R)),e=new Float32Array(n);if(!b)return e;
  const sr=b.sampleRate,d0=b.getChannelData(0),d1=b.numberOfChannels>1?b.getChannelData(1):d0,r=c.p.rate||1,st=Math.max(1,Math.floor(sr/(R*40)));
  for(let i=0;i<n;i++){
    const s0=Math.floor(((c.in||0)+i/R*r)*sr),s1=Math.min(d0.length,s0+Math.floor(sr*r/R));let s=0,k=0;
    for(let j=Math.max(0,s0);j<s1;j+=st){const v=(d0[j]+d1[j])*.5;s+=v*v;k++}
    e[i]=Math.log10(1e-6+(k?s/k:0));
  }
  // variations du son (attaques), sans la moyenne : deux micros différents se ressemblent mieux ainsi
  const o=new Float32Array(n);for(let i=1;i<n;i++)o[i]=Math.max(0,e[i]-e[i-1]);
  let mu=0;for(const v of o)mu+=v;mu/=n;let sd=0;for(let i=0;i<n;i++){o[i]-=mu;sd+=o[i]*o[i]}sd=Math.sqrt(sd/n)||1;for(let i=0;i<n;i++)o[i]/=sd;
  return o;
}
/** meilleur décalage L (en échantillons) : b(u) ≈ a(u + L), cherché entre lo et hi ; score = corrélation moyenne */
function mcLag(a,b,lo,hi,minOv){
  let best=-Infinity,bl=0;
  for(let L=lo;L<=hi;L++){
    const u0=Math.max(0,-L),u1=Math.min(b.length,a.length-L);if(u1-u0<minOv)continue;
    let s=0;for(let u=u0;u<u1;u++)s+=a[u+L]*b[u];s/=(u1-u0);
    if(s>best){best=s;bl=L}
  }
  return{L:bl,score:best};
}
async function mcCreate(list){
  list=(list||selClips()).filter(mcCan).slice(0,4);
  if(list.length<2){toast(T('mc.need'));return}
  if(list.some(c=>trk(c).lock)){toast(T('msg.trackLocked'));return}
  toast(T('mc.syncing'));
  const ref=list.slice().sort((x,y)=>y.dur-x.dur)[0],others=list.filter(c=>c!==ref),R1=20,R2=200;
  const a1=await mcEnv(ref,R1),a2=await mcEnv(ref,R2),res=[];
  for(const c of others){
    const b1=await mcEnv(c,R1),minOv=Math.max(R1*3,Math.floor(Math.min(a1.length,b1.length)*.25));
    const g=mcLag(a1,b1,-(b1.length-minOv),a1.length-minOv,minOv);
    const b2=await mcEnv(c,R2),c0=g.L*R2/R1,f=mcLag(a2,b2,c0-30,c0+30,minOv*R2/R1);
    res.push({c,off:f.L/R2,score:g.score});
    await new Promise(r=>setTimeout(r,0));
  }
  // chaque angle sur sa propre piste vidéo, au-dessus du premier ; le son vient du premier angle
  const g=Date.now()%1e9;ref.p.mc={g,a:1};
  res.forEach((r,i)=>{
    const c=r.c;let st=ref.start+r.off;
    if(st<0){const cut=-st;c.in=(c.in||0)+cut*(c.p.rate||1);c.dur=Math.max(.1,c.dur-cut);st=0}
    c.start=st;c.track=insertTrack('video');
    c.p.mc={g,a:i+2};c.p.mcOff=true;if(c.p.mcVol==null){c.p.mcVol=c.p.vol??100;c.p.vol=0}
  });
  commit();refresh();mcBar();
  const weak=res.filter(r=>r.score<.15).length;
  toast(T('mc.done',{count:list.length})+(weak?' · '+T('mc.weak'):''));
  return res.map(r=>({id:r.c.id,offset:Math.round(r.off*1000)/1000,score:Math.round(r.score*100)/100}));
}
/** passer à l'angle k à la tête de lecture : les angles sont coupés là, seul k reste visible jusqu'au changement suivant */
function mcSwitch(k){
  const t=time,here=mcClips().filter(c=>c.start<=t+1e-3&&c.start+c.dur>t+1e-3);
  if(!here.length)return false;
  const g=here.find(c=>c.p.mc.a===k)?here.find(c=>c.p.mc.a===k).p.mc.g:here[0].p.mc.g,grp=here.filter(c=>c.p.mc.g===g);
  if(!grp.some(c=>c.p.mc.a===k)){toast(T('mc.noAngle',{n:k}));return true}
  if(grp.some(c=>trk(c).lock)){toast(T('msg.trackLocked'));return true}
  for(const c of grp){
    let seg=c;if(t-c.start>.05&&c.start+c.dur-t>.05)seg=splitAt(c,t);
    seg.p.mcOff=seg.p.mc.a!==k;
    // la coupe ne doit pas ajouter de transition entre deux angles
    if(seg!==c){seg.p.tin='none';c.p.tout='none'}
  }
  commit();refresh();mcBar();
  return true;
}
/* barre des angles, au-dessus de l'aperçu (seulement s'il y a un multicam) */
function mcBar(){
  const has=appMode==='edit'&&mcClips().length>0;let b=$('#mcbar');
  if(!has){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='mcbar';$('#vwrap').appendChild(b);
    b.addEventListener('click',e=>{const x=e.target.closest('[data-mc]');if(x)mcSwitch(+x.dataset.mc)})}
  const t=time,on=mcClips().find(c=>c.start<=t+1e-3&&c.start+c.dur>t+1e-3&&!c.p.mcOff),n=Math.max(...mcClips().map(c=>c.p.mc.a));
  const key=n+'|'+(on?on.p.mc.a:0);if(b.dataset.k===key)return;b.dataset.k=key;
  b.innerHTML=`<b>${T('mc.title')}</b>${Array.from({length:n},(_,i)=>`<button data-mc="${i+1}" class="${on&&on.p.mc.a===i+1?'on':''}" title="${esc(T('mc.angleTip',{n:i+1}))}">${i+1}</button>`).join('')}`;
}
/* rendu : un angle masqué n'est pas dessiné (son volume reste celui choisi) */
{const db=drawBase;drawBase=function(c,t){if(c.p&&c.p.mcOff)return;return db(c,t)}}
/* timeline : angles masqués en transparence, numéro de l'angle sur le clip */
{const rt=renderTL;renderTL=function(){rt();for(const c of mcClips()){const el=document.querySelector(`#tls .clip[data-id="${c.id}"]`);if(!el)continue;el.classList.toggle('mcoff',!!c.p.mcOff);el.dataset.mc=c.p.mc.a}}}
{const rf=refresh;refresh=function(){rf();mcBar()}}
{const sk=seek;seek=function(t){const r=sk(t);if(mcClips().length)mcBar();return r}}
/* touches 1 à 4 (réglables dans « Raccourcis clavier ») : rien ne se passe s'il n'y a pas de multicam */
for(let k=1;k<=4;k++)KEYACTS.push({id:'mc'+k,n:'mc.key'+k,d:[String(k)],f:()=>{if(mcClips().length)mcSwitch(k)}});
/* entrées : clic droit (plusieurs clips vidéo sélectionnés), palette Ctrl+K, assistant IA */
{const b=lutCtx;lutCtx=function(c){const n=selClips().filter(mcCan).length;return[...b(c),...(n>=2&&mcCan(c)?[{label:T('mc.create',{count:Math.min(4,n)}),fn:()=>mcCreate()}]:[])]}}
CMDS.push({id:'multicam',n:'mc.cmd',f:()=>mcCreate()});
SPACE_TOOLS.make_multicam=async a=>{
  if(appMode!=='edit')setMode('edit');
  const list=Array.isArray(a.ids)&&a.ids.length?a.ids.map(id=>clips.find(c=>c.id===+id)).filter(Boolean):selClips();
  if(list.filter(mcCan).length<2)throw new Error('give 2 to 4 video clip ids (get_project) filmed at the same time');
  return{synced:await mcCreate(list),note:'Angle 1 keeps its sound. Use switch_angle (or keys 1-4) at the playhead to choose the visible camera.'};
};
SPACE_TOOLS.switch_angle=async a=>{
  if(a.time!=null)seek(Math.max(0,+a.time));
  if(!mcClips().length)throw new Error('no multicam: use make_multicam first');
  return mcSwitch(clamp(Math.round(+a.angle||1),1,4))?{angle:+a.angle,time:Math.round(time*100)/100}:{error:'no angle at this time'};
};
MCP_READ.add('make_multicam');MCP_READ.add('switch_angle');
/* pendant la lecture, la barre montre l'angle visible (minuterie arrêtée dès la pause : rien ne tourne au repos) */
let mcTimer=0;
{const pl=play;play=function(){const r=pl.apply(this,arguments);if(mcClips().length&&!mcTimer)mcTimer=setInterval(()=>{if(!playing){clearInterval(mcTimer);mcTimer=0;return}mcBar()},250);return r}}

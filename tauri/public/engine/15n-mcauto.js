/* ---------- Multicam automatique : la caméra de celui qui parle (v4.60) ----------
   Chaque caméra a son propre micro : la personne filmée de près y est plus forte que les autres.
   Le son de chaque angle est mesuré 10 fois par seconde (sur le fichier, même si l'angle est muet dans le montage),
   ramené à son niveau habituel (un micro plus fort ne gagne pas toujours), puis on choisit l'angle le plus fort,
   avec une durée minimale par plan (rythme calme / normal / rapide). Plan large (angle 1) quand personne ne parle
   nettement, ou de temps en temps si un plan dure trop. Rien n'est supprimé : les angles restent masqués / visibles
   comme avec les touches 1 à 4, Ctrl+Z annule tout. */
const MCA_RHYTHM={calm:{min:3.5,max:14},normal:{min:2,max:10},fast:{min:1.2,max:6}};
let mcaPref={rhythm:'normal',wide:true};try{Object.assign(mcaPref,JSON.parse(localStorage.getItem('dedcut-mcauto')||'{}'))}catch(e){}
const mcaSave=()=>{try{localStorage.setItem('dedcut-mcauto',JSON.stringify(mcaPref))}catch(e){}};
/** niveau du son (dB) de l'angle a du groupe g, R fois par seconde, de t0 à t1 (temps du montage) */
async function mcaLevel(grp,a,t0,t1,R){
  const n=Math.max(1,Math.ceil((t1-t0)*R)),out=new Float32Array(n).fill(-120),pieces=grp.filter(c=>c.p.mc.a===a);
  for(const c of pieces){
    const m=mById(c.mid),b=m&&await decodeAudio(m);if(!b)continue;
    const sr=b.sampleRate,d0=b.getChannelData(0),d1=b.numberOfChannels>1?b.getChannelData(1):d0,r=c.p.rate||1;
    const i0=Math.max(0,Math.floor((c.start-t0)*R)),i1=Math.min(n,Math.ceil((c.start+c.dur-t0)*R));
    for(let i=i0;i<i1;i++){
      const t=t0+(i+.5)/R,src=(c.in||0)+(t-c.start)*r,s0=Math.floor((src-.5/R*r)*sr),s1=Math.min(d0.length,s0+Math.floor(sr*r/R));
      let s=0,k=0;for(let j=Math.max(0,s0);j<s1;j+=4){const v=(d0[j]+d1[j])*.5;s+=v*v;k++}
      out[i]=10*Math.log10(1e-12+(k?s/k:0));
    }
    await new Promise(r=>setTimeout(r,0));
  }
  return out;
}
const mcaPct=(a,q)=>{const s=Array.from(a).filter(v=>v>-119).sort((x,y)=>x-y);return s.length?s[Math.floor(q*(s.length-1))]:-120};
/** décisions : liste [{t, a}] (changements d'angle) pour le groupe */
async function mcaPlan(grp,o){
  const R=10,t0=Math.min(...grp.map(c=>c.start)),t1=Math.max(...grp.map(c=>c.start+c.dur));
  const angles=[...new Set(grp.map(c=>c.p.mc.a))].sort((x,y)=>x-y),lv={};
  for(const a of angles)lv[a]=await mcaLevel(grp,a,t0,t1,R);
  const n=lv[angles[0]].length,rel={},act={};
  for(const a of angles){
    const L=lv[a],floor=mcaPct(L,.15),loud=mcaPct(L,.9);
    // lissage sur une demi-seconde, niveau ramené à « quand cette personne parle » (le haut de son micro) :
    // celui qui parle le plus n'est pas désavantagé, un micro plus fort ne gagne pas toujours
    const sm=new Float32Array(n);for(let i=0;i<n;i++){let s=0,k=0;for(let j=Math.max(0,i-2);j<=Math.min(n-1,i+2);j++){s+=L[j];k++}sm[i]=s/k}
    rel[a]=sm.map(v=>v-loud);act[a]=sm.map(v=>v>floor+8?1:0);
  }
  // à 3 caméras ou plus, l'angle 1 est le plan large : il ne « parle » pas, il sert quand personne ne parle nettement
  const wide=angles[0],talkers=angles.length>=3?angles.slice(1):angles;
  // à chaque instant : l'angle nettement le plus fort (3 dB d'avance), sinon personne
  const want=new Int8Array(n);
  for(let i=0;i<n;i++){
    let best=0,bv=-1e9,sec=-1e9;
    for(const a of talkers){if(!act[a][i])continue;const v=rel[a][i];if(v>bv){sec=bv;bv=v;best=a}else if(v>sec)sec=v}
    want[i]=best&&bv-sec>=3?best:0;
  }
  const R2=MCA_RHYTHM[o.rhythm]||MCA_RHYTHM.normal,minN=Math.round(R2.min*R),maxN=Math.round(R2.max*R);
  const plan=[];let cur=0,since=0;
  for(let i=0;i<n;i++){
    let w=want[i]||0;
    // personne ne parle nettement : on garde le plan, ou le plan large si ça dure
    if(!w){let q=i;while(q<n&&!want[q])q++;w=(q-i)>=minN&&o.wide?wide:(cur||wide)}
    if(!cur){cur=w;since=i;plan.push({t:t0+i/R,a:cur});continue}
    if(w!==cur&&i-since>=minN){
      // le nouvel angle doit tenir au moins un peu (pas de va-et-vient pour un « oui » de l'autre)
      let k=i;while(k<n&&(want[k]===w||!want[k]))k++;
      if(k-i>=Math.round(minN*.6)||w===wide){cur=w;since=i;plan.push({t:t0+i/R,a:cur})}
    }else if(o.wide&&cur!==wide&&i-since>=maxN&&angles.length>1&&want[i]===cur){
      // plan trop long sur la même personne : un moment en plan large
      cur=wide;since=i;plan.push({t:t0+i/R,a:wide});
    }
  }
  return{plan,t0,t1};
}
/** appliquer : chaque angle est coupé aux changements, seul l'angle choisi reste visible entre deux changements */
async function mcaRun(o=mcaPref){
  const all=mcClips();if(!all.length){toast(T('mca.none'));return null}
  const here=all.filter(c=>c.start<=time+1e-3&&c.start+c.dur>time+1e-3),g=(here[0]||all[0]).p.mc.g,grp=all.filter(c=>c.p.mc.g===g);
  if(grp.some(c=>trk(c).lock)){toast(T('msg.trackLocked'));return null}
  if(new Set(grp.map(c=>c.p.mc.a)).size<2){toast(T('mc.need'));return null}
  toast(T('mca.listening'));
  const{plan}=await mcaPlan(grp,o);
  if(!plan.length){toast(T('mca.noVoice'));return null}
  const times=plan.slice(1).map(p=>p.t);
  let pieces=grp.slice();
  for(const t of times){
    const add=[];
    for(const c of pieces){if(t-c.start>.05&&c.start+c.dur-t>.05){const n=splitAt(c,t);n.p.tin='none';c.p.tout='none';add.push(n)}}
    pieces.push(...add);
  }
  const angleAt=t=>{let a=plan[0].a;for(const p of plan){if(p.t<=t+1e-3)a=p.a;else break}return a};
  for(const c of pieces)c.p.mcOff=c.p.mc.a!==angleAt(c.start+c.dur/2);
  commit();refresh();mcBar();
  const n=plan.length-1;toast(T('mca.done',{count:n}));
  return{switches:n,angles:[...new Set(plan.map(p=>p.a))]};
}
function mcaOpen(){
  if($('#mcadlg'))return;
  if(!mcClips().length){toast(T('mca.none'));return}
  const m=document.createElement('div');m.className='dcq';m.id='mcadlg';
  m.innerHTML=`<div class="dcq-box" role="dialog" aria-modal="true" aria-labelledby="mcaT">
    <div class="dcq-h"><span class="dcq-ic">${thIco('<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3"/><path d="M6 3h6"/>')}</span><b id="mcaT">${T('mca.title')}</b></div>
    <p>${T('mca.intro')}</p>
    <div class="dcthumb-row" style="margin:0 0 10px 44px"><span>${T('mca.rhythm')}</span><div class="seg" id="mcaR">${Object.keys(MCA_RHYTHM).map(k=>`<button data-r="${k}" class="${mcaPref.rhythm===k?'on':''}">${T('mca.r.'+k)}</button>`).join('')}</div></div>
    <label class="dcthumb-never" style="margin:0 0 16px 44px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="mcaW"${mcaPref.wide?' checked':''}> ${T('mca.wide')}</label>
    <div class="dcq-b"><button class="dcq-no" data-x>${T('common.cancel')}</button><button class="dcq-ok" id="mcaGo">${T('mca.go')}</button></div></div>`;
  document.body.appendChild(m);
  const end=()=>{removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120)};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end()}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();$('#mcaGo').click()}else e.stopPropagation()};
  addEventListener('keydown',key,true);
  m.addEventListener('click',e=>{const r=e.target.closest('[data-r]');if(r){mcaPref.rhythm=r.dataset.r;m.querySelectorAll('[data-r]').forEach(b=>b.classList.toggle('on',b===r))}if(e.target.closest('[data-x]'))end()});
  $('#mcaGo').onclick=async()=>{mcaPref.wide=$('#mcaW').checked;mcaSave();end();await mcaRun(mcaPref)};
}
/* bouton « Auto » dans la barre des angles, clic droit, Ctrl+K, assistant, DedCut IA */
{const mb=mcBar;mcBar=function(){mb();const b=$('#mcbar');if(b&&!b.querySelector('[data-mcauto]')){b.insertAdjacentHTML('beforeend',`<button class="mca-b" data-mcauto title="${esc(T('mca.tip'))}">${T('mca.btn')}</button>`);b.querySelector('[data-mcauto]').onclick=e=>{e.stopPropagation();mcaOpen()}}}}
{const b=lutCtx;lutCtx=function(c){return[...b(c),...(c&&c.p&&c.p.mc?[{label:T('mca.title'),fn:()=>mcaOpen()}]:[])]}}
CMDS.push({id:'mcauto',n:'mca.cmd',f:()=>mcaOpen()});
SPACE_TOOLS.auto_multicam=async a=>{
  if(appMode!=='edit')setMode('edit');
  const o={rhythm:MCA_RHYTHM[a.rhythm]?a.rhythm:mcaPref.rhythm,wide:a.wide_shots==null?mcaPref.wide:!!a.wide_shots};
  const r=await mcaRun(o);if(!r)throw new Error('no multicam with 2 angles or more: use make_multicam first');
  return r;
};
MCP_READ.add('auto_multicam');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(mcClips().length&&dcHas(q,['qui parle','celui qui parle','auto','automatique','automatic','automatico','automático','automatisch','自動','자동','自动','speaker','speaking','habla','spricht','parla','fala'])&&dcHas(q,['multicam','camera','caméra','cámara','kamera','telecamera','câmera','angle','ángulo','winkel','angolo','ângulo','カメラ','카메라','机位','镜头'])){
    if(dcIsQ(q,raw)&&!dcIsReq(q,raw))return{text:T('mca.howTo')};
    const r=await mcaRun(mcaPref);if(!r)return{text:T('mca.none')};chatActs++;chatAdd('act',T('ai.t.auto_multicam'));return{text:T('mca.done',{count:r.switches})};
  }
  return b(raw,q);
}}

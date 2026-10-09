/* ---------- Montage par le texte (v4.60) ----------
   La parole des clips est écrite mot par mot (Whisper sur ce PC : mêmes modèles que les sous-titres, rien n'est envoyé).
   Effacer des mots coupe la vidéo au même endroit et tout ce qui suit recule (toutes les pistes, marqueurs compris) ;
   les sous-titres automatiques sont refaits avec les mots qui restent.
   Hésitations : mots « euh, hum… » écrits par Whisper, et sons sans mot entre deux mots (Whisper les saute souvent).
   Le texte est gardé avec le média (m.tx, en secondes du fichier d'origine, enregistré dans le projet) : calculé une fois. */
const TED_CAP=window.dedcutCaptions; // module de reconnaissance (captions-ui.js remplace ensuite window.dedcutCaptions)
const TED_FILL={
  fr:['euh','euhh','euuh','heu','hum','hmm','hm','mmh','mmm','bah','beh'],
  en:['uh','uhh','um','umm','uhm','er','erm','hmm','hm','mm','mmm'],
  es:['eh','ehh','em','emm','ehm','mmm','hmm'],
  de:['äh','ähm','ähh','öh','öhm','hm','hmm','mh'],
  it:['ehm','eh','ehh','uhm','mmm','hmm'],
  pt:['hã','ahn','éh','eh','ehh','uhm','hum','hmm'],
  ja:['えー','えーと','えっと','ええと','あのー','うーん','えーっと'],
  ko:['음','어','음음'],
  zh:['嗯','呃','额','呃呃']};
const TED_NOSPACE=/^(ja|zh|th|lo|km|my)$/;
const tedNorm=s=>String(s||'').toLowerCase().replace(/[\s.,!?;:…"'«»“”。、！？，・]/g,'');
function tedIsFill(w,lang){
  const n=tedNorm(w);if(!n)return false;
  const L=TED_FILL[lang]||[...TED_FILL.fr,...TED_FILL.en];
  return L.includes(n)||/^(e+u+h+|h?e+u+|u+h+|u+m+|h?m{2,}|ä+h+m*)$/.test(n);
}
const tedModel=()=>{try{return localStorage.getItem('dedcut-cap-model')||'base'}catch(e){return'base'}};
const tedLangPref=()=>{try{const l=localStorage.getItem('dedcut-cap-lang');return l&&l!=='auto'?l:null}catch(e){return null}};

/* clips dont on écrit la parole : le clip choisi, sinon les clips vidéo avec du son (sinon tous les clips avec du son) */
function tedHasSound(c){
  const m=c&&c.mid&&mById(c.mid);
  return !!m&&!m.missing&&(m.type==='video'||m.type==='audio')&&!isOvr(c)&&!trk(c).mute&&(c.p.vol??100)>0&&!c.p.rev&&!c.p.mcOff&&!c.p.dub;
}
function tedTargets(only){
  if(only)return clips.filter(c=>tedHasSound(c)&&c.mid===only.mid&&c.track===only.track).sort((a,b)=>a.start-b.start);
  let l=clips.filter(c=>tedHasSound(c)&&isVid(c));
  if(!l.length)l=clips.filter(tedHasSound);
  // une seule fois par moment : un son détaché collé à sa vidéo n'est pas écrit deux fois
  const out=[];for(const c of l.sort((a,b)=>a.start-b.start||a.track-b.track))if(!out.some(x=>x.mid===c.mid&&Math.abs(x.start-c.start)<.01&&Math.abs(x.in-c.in)<.01))out.push(c);
  return out;
}

/* ---------- énergie du son (toutes les 10 ms) : blancs, hésitations, coupes au calme ---------- */
const tedEnvC=new Map();
async function tedEnv(m){
  if(tedEnvC.has(m.id))return tedEnvC.get(m.id);
  const buf=await decodeAudio(m);if(!buf)return null;
  const sr=buf.sampleRate,hop=Math.round(sr*.01),n=Math.floor(buf.length/hop),env=new Float32Array(n);
  const chs=[...Array(buf.numberOfChannels)].map((_,i)=>buf.getChannelData(i));
  for(let i=0;i<n;i++){let s=0,k=0;for(const d of chs)for(let j=i*hop,e=j+hop;j<e;j+=3){s+=d[j]*d[j];k++}env[i]=Math.sqrt(s/(k||1))}
  tedEnvC.set(m.id,env);return env;
}
const tedEi=t=>Math.max(0,Math.round(t*100));
/* le moment le plus calme autour de t (±r s) : la coupe tombe entre deux sons, pas au milieu d'un */
function tedQuiet(env,t,r=.05){
  if(!env)return t;let best=t,bv=Infinity;
  for(let i=tedEi(t-r);i<=tedEi(t+r)&&i<env.length;i++)if(env[i]<bv){bv=env[i];best=i/100}
  return best;
}

/* ---------- reconnaissance (une fois par morceau de média) ---------- */
function tedMerge(a){a=a.slice().sort((p,q)=>p[0]-q[0]);const o=[];for(const r of a){const l=o[o.length-1];if(l&&r[0]<=l[1]+.05)l[1]=Math.max(l[1],r[1]);else o.push([r[0],r[1]])}return o}
function tedMissing(cov,a,b){
  const out=[];let p=a;
  for(const[x,y]of tedMerge(cov)){if(y<=p)continue;if(x>=b)break;if(x>p)out.push([p,Math.min(x,b)]);p=Math.max(p,y)}
  if(p<b)out.push([p,b]);
  return out.filter(r=>r[1]-r[0]>.3);
}
function ted16k(buf,a,b){
  const sr=buf.sampleRate,i0=Math.max(0,Math.floor(a*sr)),i1=Math.min(buf.length,Math.floor(b*sr));
  const chs=[...Array(buf.numberOfChannels)].map((_,i)=>buf.getChannelData(i)),step=sr/16000,n=Math.max(0,Math.floor((i1-i0)/step)),out=new Float32Array(n);
  for(let i=0;i<n;i++){const s=i0+Math.floor(i*step),e=Math.max(s+1,i0+Math.floor((i+1)*step));let v=0,k=0;for(let j=s;j<e;j++)for(const d of chs){v+=d[j];k++}out[i]=v/k}
  return out;
}
let tedStop=false;
async function tedEnsure(list,prog){
  const jobs=[];
  for(const c of list){
    const m=mById(c.mid),rate=c.p.rate||1,a0=c.in,a1=Math.min(m.duration||1e9,c.in+c.dur*rate);
    const tx=m.tx||(m.tx={v:1,lang:null,cov:[],w:[]});
    for(const r of tedMissing(tx.cov,a0,a1))if(!jobs.some(j=>j.m===m&&j.a<r[1]&&j.b>r[0]))jobs.push({m,a:r[0],b:r[1]});
  }
  if(!jobs.length)return 0;
  if(!TED_CAP||!(await TED_CAP.has(tedModel())))throw new Error('model');
  const tot=jobs.reduce((s,j)=>s+j.b-j.a,0);let done=0;
  for(const j of jobs){
    if(tedStop)throw new Error('cancelled');
    const buf=await decodeAudio(j.m);if(!buf)throw new Error('audio');
    const tx=j.m.tx,pa=Math.max(0,j.a-.6),pb=Math.min(buf.duration,j.b+.6);
    const r=await TED_CAP.transcribe(ted16k(buf,pa,pb),{model:tedModel(),language:tedLangPref()||tx.lang||undefined,onProgress:p=>prog&&prog((done+p*(j.b-j.a))/tot)});
    tx.lang=tx.lang||r.language||null;
    for(const w of r.words){const s=pa+w.s,e=pa+w.e,mid=(s+e)/2;if(mid<j.a||mid>=j.b)continue;tx.w.push([w.t,Math.round(s*1000)/1000,Math.round(e*1000)/1000])}
    tx.cov=tedMerge([...tx.cov,[j.a,j.b]]);
    tx.w.sort((p,q)=>p[1]-q[1]);tx.w=tx.w.filter((w,i,a)=>!i||Math.abs(w[1]-a[i-1][1])>.005||w[0]!==a[i-1][0]);
    done+=j.b-j.a;prog&&prog(done/tot);
  }
  projDirty=true;autosave();
  return jobs.length;
}

/* ---------- mots, hésitations et blancs d'un clip, en temps de la timeline ---------- */
async function tedTokens(c){
  const m=mById(c.mid),tx=m&&m.tx;if(!tx||!tx.w.length)return[];
  const env=await tedEnv(m),rate=c.p.rate||1,a0=c.in,a1=c.in+c.dur*rate,lang=tx.lang;
  const ws=tx.w.filter(w=>(w[1]+w[2])/2>=a0&&(w[1]+w[2])/2<a1);if(!ws.length)return[];
  // niveaux : bruit de fond (10 % les plus calmes du clip) et voix (médiane pendant les mots)
  let floor=0,speech=.05;
  if(env){
    const all=[];for(let i=tedEi(a0);i<tedEi(a1)&&i<env.length;i+=2)all.push(env[i]);all.sort((p,q)=>p-q);floor=all[Math.floor(all.length*.1)]||0;
    const vo=[];for(const w of ws)for(let i=tedEi(w[1]);i<tedEi(w[2])&&i<env.length;i+=2)vo.push(env[i]);vo.sort((p,q)=>p-q);speech=vo[Math.floor(vo.length/2)]||speech;
  }
  const thr=floor+.22*Math.max(0,speech-floor);
  const voiced=(s,e)=>{if(!env)return 0;let v=0,n=0;for(let i=tedEi(s);i<tedEi(e)&&i<env.length;i++){n++;if(env[i]>thr)v++}return n?v/n:0};
  const out=[];
  for(let i=0;i<ws.length;i++){
    const w=ws[i],nx=ws[i+1];
    out.push({k:tedIsFill(w[0],lang)?'f':'w',t:w[0],s:w[1],e:w[2],c});
    if(!nx)continue;
    const g=nx[1]-w[2];
    if(g>=.22&&voiced(w[2]+.03,nx[1]-.03)>=.4)out.push({k:'h',s:w[2]+.02,e:nx[1]-.02,c});
    else if(g>=.75)out.push({k:'p',s:w[2]+.16,e:nx[1]-.16,g,c});
  }
  return out;
}
const tedT=(tok,s)=>tok.c.start+(s-tok.c.in)/(tok.c.p.rate||1);

/* ---------- couper ---------- */
/* morceaux du fichier d'origine à enlever pour une liste de jetons choisis (tous du même clip, dans l'ordre) */
function tedRanges(toks,chosen,env){
  const out=[];let i=0;
  while(i<toks.length){
    if(!chosen.has(toks[i])){i++;continue}
    let j=i;while(j+1<toks.length&&chosen.has(toks[j+1]))j++;
    const first=toks[i],last=toks[j],prevW=toks.slice(0,i).reverse().find(t=>t.k==='w'||t.k==='f'),next=toks[j+1];
    const isW=t=>t.k==='w'||t.k==='f';
    let a=isW(first)?Math.max(prevW?prevW.e+.01:first.s-.06,first.s-.04):first.s;
    let b=isW(last)?(next&&isW(next)?next.s-.03:last.e+.05):last.e;
    if(isW(first))a=tedQuiet(env,a,.04);if(isW(last)&&!(next&&isW(next)))b=tedQuiet(env,b,.04);
    // un mot choisi part toujours en entier (la reconnaissance fait parfois se chevaucher deux mots)
    if(isW(first))a=Math.min(a,(first.s+first.e)/2-.02);if(isW(last))b=Math.max(b,(last.s+last.e)/2+.02);
    if(b-a>.03)out.push([a,b]);
    i=j+1;
  }
  return tedMerge(out);
}
/* style des sous-titres automatiques gardé quand on les refait */
const TED_CAPKEYS=['font','color','stroke','sc','sw','shadow','glitch','neon','bg','bgc','anim','aout','bold','italic','ls','align','fade','amt','size','x','y'];
/* enlève des morceaux (secondes du fichier) de plusieurs clips ; tout ce qui suit recule. rm : Map clip → [[a,b]…] */
function tedApply(rm){
  const work=[...rm.entries()].filter(([c,r])=>r.length&&clips.includes(c)&&!trk(c).lock).sort((p,q)=>q[0].start-p[0].start);
  let removed=0;const touched=[];
  for(const[c,ranges]of work){
    const rate=c.p.rate||1,a0=c.in,a1=c.in+c.dur*rate;
    // ce qu'on garde, en secondes du fichier
    const keep=[];let p=a0;for(const[a,b]of tedMerge(ranges)){const x=Math.max(a0,a),y=Math.min(a1,b);if(y<=x)continue;if(x-p>.02)keep.push([p,x]);p=Math.max(p,y)}if(a1-p>.02)keep.push([p,a1]);
    // sous-titres automatiques de ce clip (refaits après la coupe, avec leur style)
    const span0=c.start,span1=c.start+c.dur;
    const oldCaps=clips.filter(x=>isText(x)&&x.p.cap&&x.start<span1-.01&&x.start+x.dur>span0+.01);
    const capStyle=oldCaps[0]?Object.fromEntries(TED_CAPKEYS.filter(k=>oldCaps[0].p[k]!==undefined).map(k=>[k,oldCaps[0].p[k]])):null;
    const translated=oldCaps.some(x=>x.p.capSrc!=null);
    // moments coupés, en temps de la timeline (de la fin vers le début)
    const cuts=[];p=a0;for(const[a,b]of[...keep,[a1,a1]]){if(a-p>.001)cuts.push([c.start+(p-a0)/rate,c.start+(a-a0)/rate]);p=b}
    cuts.reverse();
    // le clip (et son son détaché, collé à lui) devient plusieurs morceaux bout à bout
    const linked=clips.filter(x=>x!==c&&x.mid===c.mid&&Math.abs(x.start-c.start)<.01&&Math.abs(x.in-c.in)<.01&&Math.abs(x.dur-c.dur)<.01);
    const parts=[];
    for(const cl of[c,...linked]){
      let t=cl.start;
      const ps=keep.map((sg,k)=>{const n=JSON.parse(JSON.stringify(cl));n.id=uid++;n.in=sg[0];n.dur=Math.max(.05,(sg[1]-sg[0])/rate);n.start=t;t+=n.dur;delete n.kf;if(k>0)n.p.tin='none';if(k<keep.length-1)n.p.tout='none';return n});
      clips=clips.filter(x=>x!==cl);parts.push(...ps);
    }
    // toutes les autres pistes suivent : décalées, raccourcies, coupées (multicam, son collé) ou retirées (textes dans la coupe)
    for(const[ra,rb]of cuts){
      const d=rb-ra;removed+=d;
      const next=[];
      for(const x of clips){
        if(trk(x).lock){next.push(x);continue}
        const xs=x.start,xe=x.start+x.dur;
        if(xe<=ra+.001){next.push(x);continue}
        if(xs>=rb-.001){x.start=Math.max(0,xs-d);next.push(x);continue}
        if(xs>=ra-.001&&xe<=rb+.001)continue;// entièrement dans la coupe : retiré
        const sync=x.mid&&!isOvr(x)&&(x.p.mc||x.mid===c.mid);
        if(xs<ra&&xe>rb){
          if(sync){const r2=x.p.rate||1,n=JSON.parse(JSON.stringify(x));n.id=uid++;n.start=ra;n.in=x.in+(rb-xs)*r2;n.dur=xe-rb;delete n.kf;x.dur=ra-xs;x.p.tout='none';n.p.tin='none';next.push(x,n);continue}
          x.dur-=d;if(x.kf)x.kf.forEach(k=>{if(k.t>rb-xs)k.t-=d});next.push(x);continue;
        }
        if(xs<ra){x.dur=ra-xs;next.push(x);continue}
        // commence dans la coupe, finit après
        const cut=rb-xs;x.start=ra;x.dur=xe-rb;if(x.mid)x.in+=cut*(x.p.rate||1);if(x.kf)x.kf=x.kf.filter(k=>k.t>=cut).map(k=>(k.t-=cut,k));next.push(x);
      }
      clips=next;
      markers=markers.filter(t=>t<=ra+.001||t>=rb-.001).map(t=>t>=rb-.001?t-d:t);
    }
    clips.push(...parts);touched.push(...parts.filter(x=>x.mid===c.mid&&x.track===c.track));
    // sous-titres refaits avec les mots qui restent (pas s'ils ont été traduits : ils sont seulement décalés)
    const CT=window.dedcutCapTools;
    if(oldCaps.length&&!translated&&CT){
      const ps=parts.filter(x=>x.track===c.track).sort((a,b)=>a.start-b.start),z0=ps[0].start,z1=ps[ps.length-1].start+ps[ps.length-1].dur;
      clips=clips.filter(x=>!(isText(x)&&x.p.cap&&x.start<z1-.01&&x.start+x.dur>z0+.01));
      const m=mById(c.mid),tx=m.tx||{w:[]},words=[];
      for(const pt of ps){const r2=pt.p.rate||1;for(const w of tx.w){const mid=(w[1]+w[2])/2;if(mid<pt.in||mid>=pt.in+pt.dur*r2)continue;words.push({t:w[0],s:pt.start+(Math.max(w[1],pt.in)-pt.in)/r2,e:pt.start+(Math.min(w[2],pt.in+pt.dur*r2)-pt.in)/r2})}}
      const spaced=!TED_NOSPACE.test(tx.lang||'');
      for(const l of CT.group(words,CT.max(),spaced)){const st=Math.max(z0,l.s),en=Math.min(z1,l.e);if(en-st<.1)continue;const nc=CT.clip(l.text,st,en-st);if(capStyle)Object.assign(nc.p,capStyle);clips.push(nc)}
    }
  }
  if(!work.length)return 0;
  sel=touched[0]?touched[0].id:null;msel.clear();
  commit();refresh();
  return removed;
}

/* ---------- hésitations et blancs, pour tout ce qui est écrit (sans fenêtre : assistant, DedCut IA) ---------- */
async function tedAuto(kind,only){
  const list=tedTargets(only);if(!list.length)throw new Error(T('te.none'));
  await tedEnsure(list);
  const rm=new Map();let n=0;
  for(const c of list){
    const toks=await tedTokens(c),chosen=new Set(toks.filter(t=>kind==='fill'?(t.k==='h'||t.k==='f'):t.k==='p'));
    n+=chosen.size;if(!chosen.size)continue;
    rm.set(c,tedRanges(toks,chosen,await tedEnv(mById(c.mid))));
  }
  const sec=n?tedApply(rm):0;
  return{count:n,sec:Math.round(sec*10)/10};
}

/* ---------- fenêtre ---------- */
const TED_IC='<path d="M4 6h16M4 12h10M4 18h7"/><path d="M15 15l5 5M20 15l-5 5"/>';
let tedOpenNow=false;
async function tedOpen(only){
  if($('#teddlg'))return;
  if(appMode!=='edit')setMode('edit');
  only=only||(selClip()&&tedHasSound(selClip())?selClip():null);
  if(only)only={mid:only.mid,track:only.track};
  if(!tedTargets(only).length){toast(T('te.none'));return}
  const m=document.createElement('div');m.className='dcq dcthumb';m.id='teddlg';
  m.innerHTML=`<div class="dcq-box dcthumb-box ted-box" role="dialog" aria-modal="true" aria-labelledby="tedT">
    <div class="dcq-h"><span class="dcq-ic">${thIco(TED_IC)}</span><b id="tedT">${T('te.title')}</b><button class="dcthumb-x" data-tx title="${esc(T('common.close'))}">${thIco('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="dcthumb-p" id="tedInfo">${T('te.intro')}</p>
    <div class="ted-tools" id="tedTools" hidden><button class="pri" id="tedCut">${T('te.cut')} <kbd>${T('te.cutKey')}</kbd></button><button id="tedFill"></button><button id="tedPause"></button><span class="ted-who" id="tedWho"></span></div>
    <div class="dcthumb-bar" id="tedBarW" hidden><i id="tedBar"></i></div>
    <div class="ted-text" id="tedText" tabindex="0"></div>
    <p class="dcthumb-note" id="tedHint" hidden>${T('te.selHint')}</p>
    <div class="dcq-b"><button class="dcq-no" id="tedStopB" hidden>${T('common.cancel')}</button><button class="dcq-ok" data-tx>${T('common.close')}</button></div></div>`;
  document.body.appendChild(m);tedOpenNow=true;
  const prev=document.activeElement;let toks=[],busy=false,closed=false;
  const end=()=>{if(busy){tedStop=true;return}closed=true;tedOpenNow=false;removeEventListener('keydown',key,true);m.classList.add('out');setTimeout(()=>m.remove(),120);try{prev&&prev.focus&&prev.focus()}catch(e){}};
  const box=$('#tedText');
  const draw=async()=>{
    const list=tedTargets(only);
    toks=[];for(const c of list)toks.push(...(await tedTokens(c)));
    if(closed)return;
    if(!toks.length){box.innerHTML=`<div class="hint">${esc(T('te.empty'))}</div>`;$('#tedTools').hidden=true;$('#tedHint').hidden=true;return}
    const lang=(mById(toks[0].c.mid).tx||{}).lang||'',sp=TED_NOSPACE.test(lang)?'':' ';
    let h='<p>',lastC=null,lastPill=false;
    toks.forEach((t,i)=>{
      // nouveau paragraphe : autre média, morceaux qui ne se suivent pas, ou long blanc (pas à chaque morceau d'un clip coupé)
      const apart=lastC&&t.c!==lastC&&(t.c.mid!==lastC.mid||Math.abs(t.c.start-(lastC.start+lastC.dur))>.05);
      if(lastC&&(apart||(t.k==='p'&&t.g>=2))){h+='</p><p>';lastPill=false}
      lastC=t.c;
      const pre=sp&&(t.k!=='w'&&t.k!=='f'||/^\s/.test(t.t)||lastPill)?sp:'';lastPill=t.k!=='w'&&t.k!=='f';
      if(t.k==='w'||t.k==='f')h+=`${pre}<span class="ted-w${t.k==='f'?' ted-f':''}" data-i="${i}">${esc(String(t.t).trim())}</span>`;
      else if(t.k==='h')h+=`${pre}<span class="ted-h" data-i="${i}" title="${esc(T('te.hesTip'))}">${esc(T('te.hes'))}</span>`;
      else h+=`${pre}<span class="ted-p" data-i="${i}" title="${esc(T('te.pauseTip',{sec:window.i18n.fmt.number(Math.round(t.g*10)/10)}))}">${window.i18n.fmt.number(Math.round(t.g*10)/10)} s</span>`;
    });
    box.innerHTML=h+'</p>';
    const nf=toks.filter(t=>t.k==='h'||t.k==='f').length,np=toks.filter(t=>t.k==='p').length;
    $('#tedFill').textContent=T('te.fillers',{count:nf});$('#tedFill').disabled=!nf;
    $('#tedPause').textContent=T('te.pauses',{count:np});$('#tedPause').disabled=!np;
    const n=tedTargets(only).length;
    $('#tedWho').textContent=only?T('te.clipOnly',{name:(mById(only.mid)||{}).name||''}):T('te.allClips',{count:n});
    $('#tedTools').hidden=false;$('#tedHint').hidden=false;hl(true);
  };
  // mot en cours de lecture surligné
  let hlI=-1;
  const hl=force=>{
    if(closed)return;let k=-1;
    for(let i=0;i<toks.length;i++){const t=toks[i];if(t.k!=='w'&&t.k!=='f')continue;if(tedT(t,t.s)<=time+.02)k=i;else break}
    if(k===hlI&&!force)return;
    box.querySelectorAll('.ted-now').forEach(e=>e.classList.remove('ted-now'));
    const e=k>=0&&box.querySelector(`[data-i="${k}"]`);if(e){e.classList.add('ted-now');if(playing){const r=e.getBoundingClientRect(),b=box.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)e.scrollIntoView({block:'center'})}}
    hlI=k;
  };
  tedHL=hl;
  const chosenFromSel=()=>{
    const s=getSelection(),set=new Set();if(!s||!s.rangeCount||s.isCollapsed)return set;
    box.querySelectorAll('[data-i]').forEach(e=>{if(s.containsNode(e,true))set.add(toks[+e.dataset.i])});
    return set;
  };
  const cutSet=async(set,doneKey)=>{
    if(!set.size){toast(T('te.nothingSel'));return}
    const byC=new Map();for(const t of toks)if(set.has(t)){if(!byC.has(t.c))byC.set(t.c,[]);}
    const rm=new Map();
    for(const c of byC.keys()){const tk2=toks.filter(t=>t.c===c);rm.set(c,tedRanges(tk2,set,await tedEnv(mById(c.mid))))}
    if([...rm.keys()].some(c=>trk(c).lock)){toast(T('msg.trackLocked'));return}
    const sec=tedApply(rm);
    getSelection().removeAllRanges();
    toast(T(doneKey||'te.done',{count:set.size,sec:window.i18n.fmt.number(Math.round(sec*10)/10)}));
    await draw();
  };
  const key=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end();return}
    if(busy){e.stopPropagation();return}
    const k=e.key.toLowerCase();
    if((e.key==='Delete'||e.key==='Backspace')&&!e.ctrlKey){e.preventDefault();e.stopPropagation();cutSet(chosenFromSel());return}
    if(e.ctrlKey&&(k==='z'||k==='y')){e.preventDefault();e.stopPropagation();if(k==='y'||e.shiftKey)redo();else undo();draw();return}
    if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();e.stopPropagation();playing?pause():play();return}
    e.stopPropagation();
  };
  addEventListener('keydown',key,true);
  m.addEventListener('click',e=>{
    if(e.target.closest('[data-tx]')){end();return}
    const w=e.target.closest('[data-i]');
    if(w&&!busy){const s=getSelection();if(s&&!s.isCollapsed)return;const t=toks[+w.dataset.i];if(t){pause();seek(tedT(t,t.s));hl(true)}}
  });
  $('#tedCut').onclick=()=>cutSet(chosenFromSel());
  $('#tedFill').onclick=()=>cutSet(new Set(toks.filter(t=>t.k==='h'||t.k==='f')),'te.fillersDone');
  $('#tedPause').onclick=()=>cutSet(new Set(toks.filter(t=>t.k==='p')),'te.pausesDone');
  $('#tedStopB').onclick=()=>{tedStop=true};
  // reconnaissance de ce qui manque, puis le texte
  busy=true;tedStop=false;
  $('#tedBarW').hidden=false;$('#tedStopB').hidden=false;
  const bar=q=>{$('#tedBar').style.width=Math.round(Math.min(1,q)*100)+'%';$('#tedInfo').textContent=T('te.reading',{pct:window.i18n.fmt.percent(Math.min(1,q))})};
  try{await tedEnsure(tedTargets(only),bar)}
  catch(e){
    busy=false;$('#tedBarW').hidden=true;$('#tedStopB').hidden=true;
    const msg=String(e&&e.message||e);
    if(msg==='model'){$('#tedInfo').innerHTML=esc(T('te.needModel'))+` <button class="sm" id="tedCapB">${esc(T('te.openCap'))}</button>`;$('#tedCapB').onclick=()=>{end();showTab('cap')};return}
    if(msg==='cancelled'){end();toast(T('cap.cancelled'));return}
    $('#tedInfo').textContent=T('cap.errRun',{error:msg.slice(0,160)});return;
  }
  busy=false;$('#tedBarW').hidden=true;$('#tedStopB').hidden=true;
  if(closed)return;
  $('#tedInfo').textContent=T('te.intro');
  await draw();box.focus();
}
/* surlignage pendant la lecture (minuterie arrêtée dès la pause : rien ne tourne au repos) */
let tedHL=null,tedTimer=0;
{const pl=play;play=function(){const r=pl.apply(this,arguments);if(tedOpenNow&&!tedTimer)tedTimer=setInterval(()=>{if(!playing||!tedOpenNow){clearInterval(tedTimer);tedTimer=0}tedHL&&tedHL()},150);return r}}

/* ---------- entrées : onglet Sous-titres, clic droit, Ctrl+K, assistant, DedCut IA ---------- */
{const t=$('#t-cap');if(t){const d=document.createElement('div');d.className='ted-entry';d.innerHTML=`<h3>${T('te.title')}</h3><p class="hint">${T('te.tabHint')}</p><button class="pri" id="tedOpenB">${T('te.open')}</button>`;t.insertBefore(d,t.firstChild);$('#tedOpenB').onclick=()=>tedOpen()}}
window.addEventListener('dedcut-lang',()=>{const d=document.querySelector('.ted-entry');if(d){d.querySelector('h3').textContent=T('te.title');d.querySelector('.hint').textContent=T('te.tabHint');$('#tedOpenB').textContent=T('te.open')}});
{const b=lutCtx;lutCtx=function(c){return[...b(c),...(tedHasSound(c)?[{label:T('te.menu'),fn:()=>tedOpen(c)}]:[])]}}
CMDS.push({id:'textedit',n:'te.cmd',f:()=>tedOpen()});
SPACE_TOOLS.edit_by_text=async a=>{
  if(appMode!=='edit')setMode('edit');
  const c=a.id!=null?clips.find(x=>x.id===+a.id):null;
  tedOpen(c||null);return{opened:'text editing window: the user deletes words to cut the video'};
};
SPACE_TOOLS.remove_fillers=async a=>{
  if(appMode!=='edit')setMode('edit');
  const c=a.id!=null?clips.find(x=>x.id===+a.id):null;
  try{const r=await tedAuto('fill',c);return{removed:r.count,seconds:r.sec}}
  catch(e){if(String(e.message)==='model')throw new Error('no speech recognition model: the user downloads one in Edit > Subtitles (free)');throw e}
};
SPACE_TOOLS.shorten_pauses=async a=>{
  if(appMode!=='edit')setMode('edit');
  const c=a.id!=null?clips.find(x=>x.id===+a.id):null;
  try{const r=await tedAuto('pause',c);return{shortened:r.count,seconds:r.sec}}
  catch(e){if(String(e.message)==='model')throw new Error('no speech recognition model: the user downloads one in Edit > Subtitles (free)');throw e}
};
MCP_READ.add('edit_by_text');MCP_READ.add('remove_fillers');MCP_READ.add('shorten_pauses');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  const fill=dcHas(q,['euh','=euhs','hésitation','hesitation','hésitations','hesitations','filler','fillers','=uhm','=ums','=äh','=ähm','muletilla','muletillas','esitazioni','hesitações','フィラー','えー','머뭇','추임새','语气词','嗯嗯']);
  const text=dcHas(q,['montage par le texte','par le texte','transcript','transcription','edit by text','text editing','texto','per testo','pelo texto','im text','テキスト編集','텍스트 편집','文本剪辑']);
  if(fill||text){
    if(dcIsQ(q,raw)&&!dcIsReq(q,raw))return{text:T('te.howTo')};
    if(appMode!=='edit')setMode('edit');
    if(text&&!fill){tedOpen();return{text:T('te.howTo')}}
    try{const r=await tedAuto('fill',selClip()&&tedHasSound(selClip())?selClip():null);chatActs++;chatAdd('act',T('ai.t.remove_fillers'));return{text:r.count?T('te.fillersDone',{count:r.count,sec:window.i18n.fmt.number(r.sec)}):T('te.noFillers')}}
    catch(e){return{text:String(e.message)==='model'?T('te.needModel'):String(e.message||e)}}
  }
  return b(raw,q);
}}

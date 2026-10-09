/* ---------- Module Live, présentation et contrôle (v4.43, priorité P2) ----------
   - transition « stinger » (une vidéo passe devant, la scène change au point de coupe) ;
   - par source : LUT (.cube), netteté (WebGL), défilement horizontal / vertical ; fond vert réglable (vert ou bleu) ;
   - son : gain du micro, expandeur, limiteur général, décalage du micro et du son du PC (synchro), écoute du micro ;
   - raccourcis configurables (couper le micro, live, appuyer pour parler) avec détection des conflits ;
   - collections de scènes (enregistrer, changer, exporter, importer) ; projecteur (fenêtre / autre écran) ;
   - journal de diagnostic sans clé de stream. */

/* ---------- journal (diagnostic) ---------- */
const lpLog=[];
const lpMask=s=>{let r=String(s);for(const d of(stData&&stData.dests)||[])if(d.key&&d.key.length>3)r=r.split(d.key).join('****');return r.replace(/(rtmps?:\/\/\S+?\/)[A-Za-z0-9_\-]{12,}/g,'$1****')};
function lpL(m){lpLog.push(new Date().toTimeString().slice(0,8)+'  '+lpMask(m));if(lpLog.length>600)lpLog.splice(0,lpLog.length-600)}
{const tt=toast;toast=function(t,...a){try{lpL('message : '+T(t))}catch(e){}return tt(t,...a)}}
{const ls=stLiveStart;stLiveStart=async function(){lpL('live : démarrage ('+stData.dests.filter(d=>d.on).map(d=>stDestName(d)+(d.vert?' 9:16':'')).join(', ')+') '+st.w+'x'+st.h+' '+st.fps+' i/s '+stKbps()+' kb/s, encodeur '+(stData.enc||'auto'));
  await ls();lpL(O.live?'live : en cours':'live : pas démarré')}}
{const lt=stLiveStop;stLiveStop=async function(){const L=O.live;if(L)lpL('live : arrêt après '+recClock(L.el)+', images '+L.frames+', perdues '+L.dropped);return lt()}}
{const ll=stLiveLost;stLiveLost=function(id){const d=[O.live,O.vert].filter(Boolean).flatMap(o=>o.dests).find(x=>x.id===id);lpL('destination '+(d?d.name:id)+' : coupure, nouvel essai');return ll(id)}}
{const rs=stRecStart;stRecStart=async function(){await rs();if(O.rec)lpL('enregistrement : démarré ('+O.rec.name+')')}}
{const re=stRecStop;stRecStop=async function(){const R=O.rec;if(R)lpL('enregistrement : arrêt après '+recClock(R.el)+', '+Math.round(R.bytes/1048576)+' Mo');return re()}}
setInterval(()=>{const L=O.live;if(!L||!L.on)return;lpL('stats : '+(L.fps_now||0)+' i/s, perdues '+L.dropped+', rendu '+(typeof lbPerf!=='undefined'?lbPerf.ms.toFixed(1):'?')+' ms, '+L.dests.map(d=>d.name+' '+(d.dead?'perdue':d.reconn?'reconnexion':((d.kbps_now||0)/1000).toFixed(1)+' Mb/s')).join(' | '))},30000);
function lpLogText(){
  const head=['DedCut '+(typeof appVersion==='function'?appVersion():'')+' — journal du studio ('+new Date().toLocaleString()+')',
    'Système : '+navigator.userAgent,'WebCodecs : '+(typeof VideoEncoder!=='undefined'?'oui':'non')+' · WebGL : '+(!!document.createElement('canvas').getContext('webgl')?'oui':'non'),
    'Qualité : '+stData.q+' · débit '+stKbps()+' kb/s · encodeur '+(stData.enc||'auto')+' · '+(typeof lbEncMsg!=='undefined'?lbEncMsg.replace(/<[^>]+>/g,''):''),
    'Scènes : '+stData.scenes.length+' · sources : '+stData.scenes.reduce((a,s)=>a+s.items.length,0)+' · destinations : '+stData.dests.map(d=>stDestName(d)+(d.on?'':' (off)')).join(', '),'(les clés de stream ne sont jamais écrites ici)',''];
  return lpMask(head.join('\n')+lpLog.join('\n'));
}

/* ---------- transition « stinger » ---------- */
const lpStg={v:null,path:'',on:false,wired:false};
const lpStgCut=()=>stData.trans.cut==null?600:+stData.trans.cut;
function lpStgEl(){
  const p=stData.trans.stg;if(!p)return null;
  if(lpStg.path!==p){if(lpStg.v){lpStg.v.pause();lpStg.v.src=''}const v=document.createElement('video');v.crossOrigin='anonymous';v.playsInline=true;v.preload='auto';v.muted=true;v.src=window.dedcutFS?window.dedcutFS.fileUrl(p):p;
    lpStg.v=v;lpStg.path=p;lpStg.wired=false}
  // le son du stinger passe dans le live (et un peu dans le casque) dès que le son du studio est prêt
  if(!lpStg.wired&&st.ac){lpStg.wired=true;try{const v=lpStg.v,s=st.ac.createMediaElementSource(v),g=st.ac.createGain(),m=st.ac.createGain();g.gain.value=.9;m.gain.value=.6;s.connect(g);g.connect(st.bus);g.connect(m);m.connect(st.ac.destination);v.muted=false}catch(e){}}
  return lpStg.v;
}
function lpStgPlay(go){const v=lpStgEl();if(!v||v.readyState<1){go();return}try{v.currentTime=0}catch(e){}v.play().catch(()=>{});lpStg.on=true;setTimeout(go,Math.max(0,lpStgCut()))}
function lpStgDraw(g){const v=lpStg.v;if(!lpStg.on||!v)return;if(v.ended||v.paused&&v.currentTime>0){lpStg.on=false;return}if(v.readyState>=2)g.drawImage(v,0,0,st.w,st.h)}
{const sw=stSwitch;stSwitch=function(id){
  if(stData.trans.type==='stinger'&&!stData.smode&&id!==stData.cur&&stData.trans.stg){lpStgPlay(()=>{const t=stData.trans.type;stData.trans.type='cut';try{sw(id)}finally{stData.trans.type=t}});return}
  const t=stData.trans.type;if(t==='stinger')stData.trans.type='cut';try{sw(id)}finally{stData.trans.type=t}}}
{const tk=pgTake;pgTake=function(){
  if(stData.trans.type==='stinger'&&stData.trans.stg){lpStgPlay(()=>{const t=stData.trans.type;stData.trans.type='cut';try{tk()}finally{stData.trans.type=t}});return}
  const t=stData.trans.type;if(t==='stinger')stData.trans.type='cut';try{tk()}finally{stData.trans.type=t}}}
function lpStingerHTML(){
  const tr=stData.trans;if(tr.type!=='stinger')return'';
  return`<div class="fld"><label>${T('lp.stg.file')}</label><div class="lbdir">${esc(tr.stg?tr.stg.split(/[\\/]/).pop():T('lp.stg.none'))}</div><button class="sm" data-lpact="stgpick">${ico('media',13)}${T(tr.stg?'deco.change':'lp.stg.pick')}</button></div>
    <div class="fld"><label>${T('lp.stg.cut')} <span>${lpStgCut()} ms</span></label><input type="range" min="0" max="3000" step="50" value="${lpStgCut()}" data-lpstg="cut"></div>
    <p class="hint">${T('lp.stg.hint')}</p>`;
}

/* ---------- LUT (.cube) et netteté : un passage WebGL par source concernée ---------- */
const lpGL={gl:undefined,tex:{},c:null};
function lpGLInit(){
  if(lpGL.gl!==undefined)return lpGL.gl;const c=document.createElement('canvas'),gl=c.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true});lpGL.c=c;lpGL.gl=gl;if(!gl)return null;
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=vec2((p.x+1.)*.5,1.-(p.y+1.)*.5);gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(p,sh(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 v;uniform sampler2D img;uniform sampler2D lut;uniform float n,amt,sharp,useLut;uniform vec2 px;
vec3 lk(vec3 c){float b=clamp(c.b,0.,1.)*(n-1.),b0=floor(b),b1=min(n-1.,b0+1.),f=b-b0;float r=clamp(c.r,0.,1.)*(n-1.)+.5,g=(clamp(c.g,0.,1.)*(n-1.)+.5)/n;
return mix(texture2D(lut,vec2((b0*n+r)/(n*n),g)).rgb,texture2D(lut,vec2((b1*n+r)/(n*n),g)).rgb,f);}
void main(){vec4 c=texture2D(img,v);if(sharp>0.){vec3 s=texture2D(img,v+vec2(px.x,0.)).rgb+texture2D(img,v-vec2(px.x,0.)).rgb+texture2D(img,v+vec2(0.,px.y)).rgb+texture2D(img,v-vec2(0.,px.y)).rgb;c.rgb=clamp(c.rgb+sharp*(4.*c.rgb-s),0.,1.);}
if(useLut>0.)c.rgb=mix(c.rgb,lk(c.rgb),amt);gl_FragColor=c;}`));
  gl.linkProgram(p);gl.useProgram(p);lpGL.p=p;
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(p,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  lpGL.img=gl.createTexture();for(const t of[lpGL.img]){gl.bindTexture(gl.TEXTURE_2D,t);for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v)}
  gl.uniform1i(gl.getUniformLocation(p,'img'),0);gl.uniform1i(gl.getUniformLocation(p,'lut'),1);
  return gl;
}
function lpLutTex(id){
  const gl=lpGLInit();if(!gl)return null;if(lpGL.tex[id])return lpGL.tex[id];const L=(stData.luts||[]).find(x=>x.id===id);if(!L)return null;
  const n=L.n,raw=Uint8Array.from(atob(L.b64),c=>c.charCodeAt(0)),px=new Uint8Array(n*n*n*4);
  for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){const i=(r+g*n+b*n*n)*3,o=((g*n*n)+(b*n+r))*4;px[o]=raw[i];px[o+1]=raw[i+1];px[o+2]=raw[i+2];px[o+3]=255}
  const t=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);
  for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n*n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,px);gl.activeTexture(gl.TEXTURE0);lpGL.tex[id]={t,n};return lpGL.tex[id];
}
function lpParseCube(txt){
  let n=0;const vals=[];
  for(const line of String(txt).split(/\r?\n/)){const l=line.trim();if(!l||l[0]==='#')continue;const m=l.match(/^LUT_3D_SIZE\s+(\d+)/i);if(m){n=+m[1];continue}
    if(/^[A-Z_]/i.test(l))continue;const p=l.split(/\s+/).map(Number);if(p.length===3&&p.every(isFinite))vals.push(p)}
  if(!n||n<2||n>65||vals.length<n*n*n)throw new Error('cube');
  const u=new Uint8Array(n*n*n*3);for(let i=0;i<n*n*n;i++)for(let k=0;k<3;k++)u[i*3+k]=Math.max(0,Math.min(255,Math.round(vals[i][k]*255)));
  let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));
  return{n,b64:btoa(s)};
}
const lpTmp=document.createElement('canvas'),lpTmpG=lpTmp.getContext('2d');
{const di=stDrawIt;stDrawIt=function(g,it,t){
  const o=it.o,W=st.w,H=st.h,x=it.x*W,y=it.y*H,w=Math.max(1,Math.round(it.w*W)),h=Math.max(1,Math.round(it.h*H));
  const scx=+o.scx||0,scy=+o.scy||0,lut=o.lut&&lpLutTex(o.lut),sharp=(+o.sharp||0)/100;
  if(scx||scy){ // défilement : la source se répète en boucle dans son cadre
    const u=W/1920,ox=((t*scx*u)%w+w)%w,oy=((t*scy*u)%h+h)%h;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    const sv=[o.scx,o.scy];o.scx=0;o.scy=0;try{for(const dx of scx?[-ox,w-ox]:[0])for(const dy of scy?[-oy,h-oy]:[0]){g.save();g.translate(dx,dy);stDrawIt(g,it,t);g.restore()}}finally{o.scx=sv[0];o.scy=sv[1];g.restore()}return}
  if(!lut&&!(sharp>0)){di(g,it,t);return}
  const gl=lpGLInit();if(!gl){di(g,it,t);return}
  if(lpTmp.width!==w||lpTmp.height!==h){lpTmp.width=w;lpTmp.height=h}else lpTmpG.clearRect(0,0,w,h);
  lpTmpG.save();lpTmpG.translate(-x,-y);di(lpTmpG,it,t);lpTmpG.restore();
  const c=lpGL.c;if(c.width!==w||c.height!==h){c.width=w;c.height=h}gl.viewport(0,0,w,h);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,lpGL.img);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,lpTmp);
  const p=lpGL.p,U=k=>gl.getUniformLocation(p,k);
  if(lut){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,lut.t);gl.activeTexture(gl.TEXTURE0);gl.uniform1f(U('n'),lut.n);gl.uniform1f(U('useLut'),1)}else gl.uniform1f(U('useLut'),0);
  gl.uniform1f(U('amt'),o.luta==null?1:+o.luta/100);gl.uniform1f(U('sharp'),sharp*1.5);gl.uniform2f(U('px'),1/w,1/h);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);g.drawImage(c,x,y,w,h);
}}
// réglages : LUT, netteté, défilement, fond vert
{const pe=stPropsExtra;stPropsExtra=function(it){
  let h=pe(it);const o=it.o;if(it.kind==='audio')return h;
  if(it.kind==='cam'&&o.bgfx==='green')h=`<div class="fld"><label>${T('lp.key.col')}</label><select data-o="kc">${['green','blue'].map(k=>`<option value="${k}" ${(o.kc||'green')===k?'selected':''}>${T('lp.key.'+k)}</option>`).join('')}</select></div>
    <div class="fld"><label>${T('lp.key.sim')} <span>${o.ksim==null?35:o.ksim}</span></label><input type="range" min="5" max="80" value="${o.ksim==null?35:o.ksim}" data-o="ksim" data-lbr=""></div>
    <div class="fld"><label>${T('lp.key.smooth')} <span>${o.ksm==null?40:o.ksm}</span></label><input type="range" min="5" max="120" value="${o.ksm==null?40:o.ksm}" data-o="ksm" data-lbr=""></div>`+h;
  const luts=stData.luts||[],fx=`<div class="fld"><label>${T('lp.lut')}</label><select data-lplut="1"><option value="">${T('common.noneF')}</option>${luts.map(l=>`<option value="${l.id}" ${o.lut===l.id?'selected':''}>${esc(l.name)}</option>`).join('')}<option value="+">${T('lp.lutAdd')}</option></select></div>
    ${o.lut?`<div class="fld"><label>${T('look.intensity')} <span>${o.luta==null?100:o.luta}</span></label><input type="range" min="0" max="100" value="${o.luta==null?100:o.luta}" data-o="luta" data-lbr=""></div>`:''}
    <div class="fld"><label>${T('lp.sharp')} <span>${o.sharp||0}</span></label><input type="range" min="0" max="100" value="${o.sharp||0}" data-o="sharp" data-lbr=""></div>
    <div class="two"><div class="fld"><label>${T('lp.scx')} <span>${o.scx||0}</span></label><input type="range" min="-400" max="400" step="10" value="${o.scx||0}" data-o="scx" data-lbr=""></div><div class="fld"><label>${T('lp.scy')} <span>${o.scy||0}</span></label><input type="range" min="-400" max="400" step="10" value="${o.scy||0}" data-o="scy" data-lbr=""></div></div>`;
  return h.replace('<button class="sm" data-lbact="adjreset">',fx+'<button class="sm" data-lbact="adjreset">');
}}
{const ar=document.createElement('input');ar.type='file';ar.accept='.cube';ar.hidden=true;ar.id='lpLutIn';document.body.appendChild(ar);
  ar.onchange=async()=>{const f=ar.files[0],it=stSel();ar.value='';if(!f)return;
    try{const L=lpParseCube(await f.text());const id='l'+Date.now().toString(36);(stData.luts||(stData.luts=[])).push({id,name:f.name.replace(/\.cube$/i,'').slice(0,40),...L});if(stData.luts.length>8)stData.luts.shift();
      if(it){it.o.lut=id;delete it.o.luta}stSave();stSideUI();toast(T('lp.lutOk',{n:L.n}))}catch(e){toast(T('lp.lutBad'))}}}

/* ---------- son : gain, expandeur, limiteur, décalages, écoute ---------- */
const LP_AFX=()=>({gain:0,exp:false,lim:true,dmic:0,ddesk:0,mon:false,monv:70});
function lpAfx(){if(!stData.afx)stData.afx=LP_AFX();else stData.afx=Object.assign(LP_AFX(),stData.afx);return stData.afx}
function lpAudioInit(){
  const ac=st.ac;if(!ac||st.lpReady||!st.tap||!st.desk)return;st.lpReady=true; // st.tap : le son du studio est complètement prêt (stAudio peut être appelé deux fois en même temps)
  st.micPre=ac.createGain();st.micDly=ac.createDelay(1);st.micPre.connect(st.micDly);
  st.deskDly=ac.createDelay(1);st.deskDly.connect(st.desk.g);
  st.lim=ac.createDynamicsCompressor();st.lim.threshold.value=-1.5;st.lim.knee.value=0;st.lim.ratio.value=20;st.lim.attack.value=.002;st.lim.release.value=.12;st.limOut=ac.createGain();st.limOut.gain.value=.89;st.lim.connect(st.limOut);
  st.monG=ac.createGain();st.monG.gain.value=0;st.mic.g.connect(st.monG);st.monG.connect(ac.destination);
  lpAudioApply();
  // micro et son du PC déjà branchés avant que tout soit prêt : on les passe dans la nouvelle chaîne
  if(st.mic&&st.mic.src)lxRnnWire();if(st.desk.src){try{st.desk.src.disconnect()}catch(e){}st.desk.src.connect(st.deskDly)}
}
function lpAudioApply(){
  const ac=st.ac;if(!ac||!st.lpReady)return;const A=lpAfx();
  st.micPre.gain.value=Math.pow(10,(+A.gain||0)/20);st.micDly.delayTime.value=Math.max(0,Math.min(1,(+A.dmic||0)/1000));st.deskDly.delayTime.value=Math.max(0,Math.min(1,(+A.ddesk||0)/1000));
  st.monG.gain.value=A.mon?(+A.monv||70)/100:0;
  // expandeur : la porte de bruit baisse le son (25 %) au lieu de le couper
  if(st.gate)st.gate.port.postMessage({on:!!(stData.micfx.gate||A.exp),floor:A.exp?.25:0});
  // limiteur général avant la sortie (live, enregistrement)
  try{st.bus.disconnect(st.tap)}catch(e){}try{st.bus.disconnect(st.lim)}catch(e){}try{st.limOut.disconnect()}catch(e){}
  if(A.lim){st.bus.connect(st.lim);st.limOut.connect(st.tap)}else st.bus.connect(st.tap);
}
// chaîne du micro : source → (RNNoise) → gain → décalage → porte de bruit / expandeur → (compresseur) → volume
lxRnnWire=async function(){
  if(!st.mic||!st.mic.src)return;lpAudioInit();if(!st.lpReady)return;const on=!!stData.micfx.rnn;if(on&&!lxRnn)await lxRnnInit();
  const dst=st.gate||st.mic.g;try{st.mic.src.disconnect()}catch(e){}try{st.micDly.disconnect()}catch(e){}st.micDly.connect(dst);
  if(on&&lxRnn){try{lxRnn.disconnect()}catch(e){}st.mic.src.connect(lxRnn);lxRnn.connect(st.micPre)}else st.mic.src.connect(st.micPre);
};
{const ms=stMicSet;stMicSet=async function(id){await ms(id);if(st.ac){lpAudioInit();await lxRnnWire()}}}
{const mf=stMicFx;stMicFx=function(){mf();if(st.ac&&st.lpReady){lpAudioApply();if(st.mic&&st.mic.src)lxRnnWire()}}}
{const da=stDeskAudio;stDeskAudio=function(stream){da(stream);if(st.ac&&st.desk&&st.desk.src){lpAudioInit();if(!st.lpReady)return;try{st.desk.src.disconnect()}catch(e){}st.desk.src.connect(st.deskDly)}}}
{const au=stAudio;stAudio=async function(){await au();lpAudioInit()}}
function lpMixHTML(){
  const A=lpAfx(),R=(k,l,mn,mx,u,st2)=>`<div class="fld"><label>${T(l)} <span>${A[k]}${u}</span></label><input type="range" min="${mn}" max="${mx}" step="${st2||1}" value="${A[k]}" data-afx="${k}" data-u="${u}"></div>`,C=(k,l)=>`<label class="chk"><span>${T(l)}</span><input type="checkbox" data-afx="${k}" ${A[k]?'checked':''}></label>`;
  return R('gain','lp.a.gain',-12,24,' dB')+C('exp','lp.a.exp')+C('lim','lp.a.lim')+(lpPttOn()?`<p class="hint">${T('lp.k.pttOn',{key:lpAccTxt(lpKeys().ptt)})}</p>`:'')+R('dmic','lp.a.dmic',0,800,' ms',10)+R('ddesk','lp.a.ddesk',0,800,' ms',10)+C('mon','lp.a.mon')+(A.mon?R('monv','lp.a.monv',0,100,' %'):'')+`<p class="hint">${T('lp.a.hint')}</p>`;
}
$('#stMixer').addEventListener('input',e=>{const t=e.target,k=t.dataset.afx;if(!k)return;const A=lpAfx();A[k]=t.type==='checkbox'?t.checked:+t.value;
  st.fxOpen=true;if(t.type==='range'){const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value+(t.dataset.u||'')}stSave();lpAudioApply();if(t.type==='checkbox'&&(k==='mon'||k==='exp'))stMixerUI()});

/* ---------- raccourcis : configurables, conflits, appuyer pour parler ---------- */
const lpKeyStat={};
{const K=window.dedcutKeys;if(K){const on=K.on,hold=K.hold;
  K.on=(a,f)=>on(a,f).then(r=>{lpKeyStat[a]='ok';return r},e=>{lpKeyStat[a]='fail';throw e});
  if(hold)K.hold=(a,d,u)=>hold(a,d,u).then(r=>{lpKeyStat[a]='ok';return r},e=>{lpKeyStat[a]='fail';throw e});
  const off=K.off;K.off=a=>{delete lpKeyStat[a];return off(a)}}}
function lpKeys(){if(!stData.keys)stData.keys={mute:'',live:'',ptt:''};return stData.keys}
const lpPtt={down:false};
// appuyer pour parler : micro coupé tant que la touche n'est pas tenue (seulement si la touche est bien enregistrée)
const lpPttOn=()=>{const a=stData&&lpKeys().ptt;return!!a&&lpKeyStat[a]==='ok'&&lpKOn.get(a)==='ptt'};
{const gs=stGains;stGains=function(){gs();if(lpPttOn()&&st.mic&&st.mic.g&&!lpPtt.down)st.mic.g.gain.value=0}}
const LP_KEYS={mute:()=>{stData.mute.mic=!stData.mute.mic;stGains();stMixerUI();stSave();toast(T(stData.mute.mic?'lp.k.muted':'lp.k.unmuted'))},live:()=>{O.live?stLiveStop():stLiveStart()}};
const lpKOn=new Map();
function lpKeysSync(){
  const K=window.dedcutKeys;if(!K||!stData)return;const studio=typeof appMode!=='undefined'&&stOn(),C=lpKeys(),want=new Map();
  if(studio){for(const k of['mute','live'])if(C[k])want.set(C[k],k);if(C.ptt)want.set(C.ptt,'ptt')}
  let ch=false;
  for(const[a,k]of lpKOn)if(want.get(a)!==k){K.off(a).catch(()=>{});lpKOn.delete(a);ch=true}
  for(const[a,k]of want)if(!lpKOn.has(a)){lpKOn.set(a,k);
    const p=k==='ptt'&&K.hold?K.hold(a,()=>{lpPtt.down=true;stGains()},()=>{lpPtt.down=false;stGains()}):K.on(a,LP_KEYS[k]);
    p.then(()=>{if(k==='ptt')stGains()},()=>{})}
  if(!C.ptt)lpPtt.down=false;if(ch)stGains();
}
setInterval(lpKeysSync,1200);
const LP_ACC={Space:'Space',PageUp:'PageUp',PageDown:'PageDown',Home:'Home',End:'End',Insert:'Insert',Pause:'Pause',ScrollLock:'ScrollLock',ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',Backquote:'`'};
function lpAccel(e){
  const c=e.code;let k=/^Key[A-Z]$/.test(c)?c.slice(3):/^Digit\d$/.test(c)?c.slice(5):/^F([1-9]|1\d|2[0-4])$/.test(c)?c:/^Numpad\d$/.test(c)?'Num'+c.slice(6):LP_ACC[c];
  if(!k)return null;const mods=[(e.ctrlKey||e.metaKey)&&'CommandOrControl',e.altKey&&'Alt',e.shiftKey&&'Shift'].filter(Boolean);
  if(!mods.length&&!/^(F1[3-9]|F2[0-4]|Pause|ScrollLock|Insert|Num\d)$/.test(k))return'mods';return[...mods,k].join('+');
}
// noms des touches dans la langue de DedCut (Maj / Shift / Umschalt…)
const lpKeyTxt=s=>s.replace(/Ctrl/g,T('kb.k.ctrl')).replace(/Maj/g,T('kb.k.shift')).replace('Entrée',T('kb.k.enter')).replace('Page haut / bas',T('kb.k.pgud'));
const lpAccTxt=a=>lpKeyTxt(String(a||'').replace('CommandOrControl','Ctrl').replace(/Shift/,'Maj'));
function lpKeysHTML(){
  const C=lpKeys(),fixed=[['Ctrl+Maj+1…9','lp.k.scenes'],['Ctrl+Maj+R','lp.k.rec'],['Ctrl+Maj+P','lp.k.pause'],['Ctrl+Maj+M','lx.hl.mark'],['Ctrl+Maj+X','st.rp.btn'],['Ctrl+Maj+Entrée','ps.take'],['Ctrl+Alt+Page haut / bas','st.k.counter'],['Ctrl+Alt+F1…F9','wg.sb.title']];
  const fails=Object.entries(lpKeyStat).filter(([,v])=>v==='fail').map(([a])=>a);
  return`${['mute','live','ptt'].map(k=>`<div class="fld"><label>${T('lp.k.'+k)}</label><div class="lpkrow"><input type="text" readonly data-lpkey="${k}" value="${esc(lpAccTxt(C[k]))}" placeholder="${esc(T('lp.k.none'))}"><button class="sm" data-lpkclr="${k}" title="${esc(T('common.remove'))}">${ico('trash',13)}</button></div>${C[k]&&lpKeyStat[C[k]]==='fail'?`<p class="hint cxwarn">${T('lp.k.conflict')}</p>`:''}</div>`).join('')}
    <p class="hint">${T('lp.k.hint')}</p><div class="lpkfix">${fixed.map(([a,l])=>`<span><kbd>${esc(lpKeyTxt(a))}</kbd> ${T(l,{s:stRpSec()})}</span>`).join('')}</div>
    ${fails.length?`<p class="hint cxwarn">${T('lp.k.fails',{list:fails.map(lpAccTxt).join(', ')})}</p>`:''}`;
}

/* ---------- collections de scènes ---------- */
const LP_COLL='dedcut-studio-collections';
const lpColls=()=>{try{return JSON.parse(localStorage.getItem(LP_COLL)||'{}')||{}}catch(e){return{}}};
function lpCollPut(c){try{localStorage.setItem(LP_COLL,JSON.stringify(c));return true}catch(e){toast(T('lp.c.full'));return false}}
function lpSnap(){const d=JSON.parse(JSON.stringify(stData));delete d.live;delete d.lives;(d.dests||[]).forEach(x=>x.key='');return d}
function lpCollLoad(d){
  if(O.live||O.rec){toast(T('lp.c.busy'));return}
  const keep=stData.dests,cur=stData.coll;d=JSON.parse(JSON.stringify(d));d.dests=keep;d.lives=stData.lives;
  for(const s of d.scenes||[])for(const it of s.items)stUid=Math.max(stUid,it.id);
  stData=stFill(d);stData.coll=cur;stSave();stCamsSync();stRender();stVideoSync(true);if(typeof pgUI==='function')pgUI();
}
function lpCollHTML(){
  const C=lpColls(),names=Object.keys(C);
  return`${names.length?`<div class="lxhist">${names.map(n=>`<div class="lpcoll${stData.coll===n?' on':''}"><button data-lpcload="${esc(n)}">${ico('scene',13)}<span>${esc(n)}</span></button><button class="sm" data-lpcsave="${esc(n)}" title="${esc(T('lp.c.update'))}">${ico('save',13)}</button><button class="sm" data-lpcexp="${esc(n)}" title="${esc(T('lp.c.export'))}">${ico('export',13)}</button><button class="sm" data-lpcdel="${esc(n)}" title="${esc(T('common.remove'))}">${ico('trash',13)}</button></div>`).join('')}</div>`:`<p class="hint">${T('lp.c.none')}</p>`}
    <div class="stduo"><button data-lpact="cnew">${ico('plus',13)}${T('lp.c.new')}</button><button data-lpact="cimp">${ico('open',13)}${T('lp.c.import')}</button></div><p class="hint">${T('lp.c.hint')}</p>`;
}
{const ci=document.createElement('input');ci.type='file';ci.accept='.json';ci.hidden=true;ci.id='lpCollIn';document.body.appendChild(ci);
  ci.onchange=async()=>{const f=ci.files[0];ci.value='';if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.scenes)||!d.scenes.length)throw 0;
    const C=lpColls(),n=(d.collName||f.name.replace(/(\.dedcut-studio)?\.json$/i,'')).slice(0,40);(d.dests||[]).forEach(x=>x.key='');C[n]=d;if(lpCollPut(C)){toast(T('lp.c.imported',{name:n}));stSideUI()}}catch(e){toast(T('lp.c.bad'))}}}

/* ---------- projecteur : la sortie (ou l'aperçu) dans une fenêtre, à mettre sur un autre écran ---------- */
const lpProj={win:null,cv:null,g:null,src:'prog'};
// la fenêtre (Tauri) peut remplacer sa page vide juste après l'ouverture : on la remplit, puis on vérifie 1,5 s
function lpProjBuild(){
  const P=lpProj,w=P.win;if(!w||w.closed)return;const d=w.document;
  d.open();d.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(T('lp.p.title'))+' — DedCut</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;cursor:none}canvas{width:100%;height:100%;object-fit:contain;display:block}</style></head><body><canvas id="c"></canvas></body></html>');d.close();
  P.doc=d;P.cv=d.getElementById('c');P.g=P.cv.getContext('2d');P.title=d.title;
  d.addEventListener('dblclick',()=>{const el=d.documentElement;if(d.fullscreenElement)d.exitFullscreen().catch(()=>{});else if(el.requestFullscreen)el.requestFullscreen().catch(()=>{})});
}
function lpProjOpen(src){
  if(lpProj.win&&!lpProj.win.closed){lpProj.src=src;try{lpProj.win.focus()}catch(e){}return}
  const w=window.open('','dedcut-proj','popup,width=960,height=560');if(!w){toast(T('detach.fail'));return}
  lpProj.win=w;lpProj.src=src;lpProjBuild();
  let n=0;const chk=setInterval(()=>{if(lpProj.win!==w||w.closed||++n>15)return clearInterval(chk);try{if(w.document!==lpProj.doc||!w.document.getElementById('c'))lpProjBuild()}catch(e){}},100);
  lpL('projecteur ouvert ('+src+')');stSideUI();
}
function lpProjClose(){const P=lpProj;if(!P.win)return;try{window.__TAURI_INTERNALS__&&window.__TAURI_INTERNALS__.invoke('close_panel',{title:P.title}).catch(()=>{})}catch(e){}try{P.win.close()}catch(e){}P.win=null;stSideUI()}
function lpProjDraw(){const P=lpProj;if(!P.win)return;if(P.win.closed){P.win=null;if(stSide==='set')stSideUI();return}if(!P.cv)return;
  const src=P.src==='prev'?st.cv:(stData.smode&&typeof pgCv!=='undefined'?pgCv:st.cv);if(!src||!src.width)return;if(P.cv.width!==src.width||P.cv.height!==src.height){P.cv.width=src.width;P.cv.height=src.height}P.g.drawImage(src,0,0)}
// le stinger passe devant l'image de sortie : la scène hors mode studio, le programme en mode studio
{const sd=stDraw;stDraw=function(t){sd(t);try{if(!stData.smode)lpStgDraw(st.g);lpProjDraw()}catch(e){}}}
{const pd=pgDraw;pgDraw=function(t){pd(t);try{if(stData.smode)lpStgDraw(pgG)}catch(e){}}}
addEventListener('pagehide',lpProjClose);

/* ---------- Réglages : raccourcis, collections, projecteur, journal ---------- */
function lpSetHTML(busy){
  const sec=(k,ic,title,body)=>`<details class="cxsec" data-cxsec="${k}"${cxOpen[k]?' open':''}><summary>${ico(ic,15)}<b>${T(title)}</b></summary>${body}</details>`;
  for(const k of['lpkeys','lpcoll','lpproj','lplog'])if(cxOpen[k]==null)cxOpen[k]=false;
  const proj=lpProj.win&&!lpProj.win.closed?`<p class="hint">${T('lp.p.on')}</p><div class="stduo"><button data-lpact="pswap">${ico('replay',13)}${T(lpProj.src==='prev'?'lp.p.toProg':'lp.p.toPrev')}</button><button data-lpact="pclose">${ico('square',13)}${T('lp.p.close')}</button></div>`
    :`<div class="stduo"><button data-lpact="pprog">${ico('full',13)}${T('lp.p.prog')}</button><button data-lpact="pprev">${ico('eye',13)}${T('lp.p.prev')}</button></div>`;
  return`<h5>${T('lp.more')}</h5>`+sec('lpkeys','keys','lp.k.title',lpKeysHTML())+sec('lpcoll','scene','lp.c.title',lpCollHTML())+sec('lpproj','monitor','lp.p.title',proj+`<p class="hint">${T('lp.p.hint')}</p>`)
    +sec('lplog','text','lp.l.title',`<pre class="lplog">${esc(lpLog.slice(-40).join('\n')||T('lp.l.empty'))}</pre><div class="stduo"><button data-lpact="lcopy">${ico('copy',13)}${T('lp.l.copy')}</button><button data-lpact="lsave">${ico('save',13)}${T('lp.l.save')}</button></div><p class="hint">${T('lp.l.hint')}</p>`);
}
$('#stSide').addEventListener('input',e=>{const t=e.target;if(t.dataset.lpstg){stData.trans[t.dataset.lpstg]=+t.value;const s=t.closest('.fld').querySelector('span');if(s)s.textContent=t.value+' ms';stSave()}});
$('#stSide').addEventListener('change',e=>{const t=e.target;if(t.dataset.lplut){const it=stSel();if(!it)return;if(t.value==='+'){$('#lpLutIn').click();t.value=it.o.lut||'';return}if(t.value)it.o.lut=t.value;else delete it.o.lut;stSave();stSideUI()}});
$('#stSide').addEventListener('keydown',e=>{const t=e.target;if(!t.dataset||!t.dataset.lpkey)return;e.preventDefault();e.stopPropagation();if(['Control','Shift','Alt','Meta'].includes(e.key))return;
  if(e.key==='Escape'){t.blur();return}const a=lpAccel(e);if(a==='mods'){toast(T('lp.k.needMod'));return}if(!a)return;
  const C=lpKeys();for(const k of Object.keys(C))if(k!==t.dataset.lpkey&&C[k]===a)C[k]='';C[t.dataset.lpkey]=a;stSave();lpKeysSync();setTimeout(stSideUI,600)},true);
$('#stSide').addEventListener('click',async e=>{
  const t=e.target;const g=s=>{const el=t.closest('['+s+']');return el?el.getAttribute(s):null};let n;
  if((n=g('data-lpkclr'))){lpKeys()[n]='';stSave();lpKeysSync();stSideUI();return}
  if((n=g('data-lpcload'))){const d=lpColls()[n];if(d){lpCollLoad(d);stData.coll=n;stSave();stSideUI();toast(T('lp.c.loaded',{name:n}))}return}
  if((n=g('data-lpcsave'))){const C=lpColls();C[n]=lpSnap();if(lpCollPut(C)){stData.coll=n;stSave();toast(T('lp.c.saved',{name:n}))}return}
  if((n=g('data-lpcexp'))){const d=lpColls()[n];if(d)download(new Blob([JSON.stringify(Object.assign({collName:n},d),null,1)],{type:'application/json'}),n+'.dedcut-studio.json');return}
  if((n=g('data-lpcdel'))){const C=lpColls();delete C[n];lpCollPut(C);if(stData.coll===n)delete stData.coll;stSideUI();return}
  const b=t.closest('[data-lpact]');if(!b)return;const a=b.dataset.lpact;
  if(a==='stgpick'){const F=window.dedcutFS;if(!F){toast(T('msg.onlyInApp'));return}const l=await F.pickMedia(T('lp.stg.file')).catch(()=>[]);const f=(l||[]).find(x=>extType(x.name||x.path)==='video');if(f){stData.trans.stg=f.path;stSave();lpStgEl();stSideUI()}return}
  if(a==='cnew'){askText(T('lp.c.name'),T('st.scenes')+' '+(Object.keys(lpColls()).length+1)).then(v=>{const name=(v||'').trim().slice(0,40);if(!name)return;const C=lpColls();C[name]=lpSnap();if(lpCollPut(C)){stData.coll=name;stSave();stSideUI();toast(T('lp.c.saved',{name}))}});return}
  if(a==='cimp'){$('#lpCollIn').click();return}
  if(a==='pprog'||a==='pprev'){lpProjOpen(a==='pprev'?'prev':'prog');return}
  if(a==='pswap'){lpProj.src=lpProj.src==='prev'?'prog':'prev';stSideUI();return}
  if(a==='pclose'){lpProjClose();return}
  if(a==='lcopy'){try{await navigator.clipboard.writeText(lpLogText());toast(T('lp.l.copied'))}catch(x){toast(T('lp.l.copyFail'))}return}
  if(a==='lsave'){download(new Blob([lpLogText()],{type:'text/plain'}),'DedCut-journal-studio-'+recStamp()+'.txt');return}
});
// enregistrement sélectif (10m) : le stinger passe aussi dans le fichier
{const rd=lbRecDraw;lbRecDraw=function(){const r=rd();try{lpStgDraw(lbRecG)}catch(e){}return r}}

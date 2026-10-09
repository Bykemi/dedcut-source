/* ---------- Montage, lot C (cahier « DedCut Montage — Claude 2 ») ----------
   M042 rognage ripple / roll · M043 slip / slide · M087 LUT (.cube) · M090 scopes · M106 sonie (LUFS, crête)
   M108 pistes séparées (WAV) · M066 lisibilité des sous-titres · M099 / M100 égaliseur et compresseur réglables */
Object.assign(KDEF,{'p.au.midF':1400,'p.au.hpf':0,'p.au.lpf':0,'p.au.cThr':-24,'p.au.cRat':4});
Object.assign(ICO,{
  tsel:'<path d="M5 3l14 8-6 1.5L10 19z"/>',
  tripple:'<path d="M4 5v14M8 9h7M12 6l3 3-3 3M15 15h5M17 13l3 2-3 2"/>',
  troll:'<path d="M12 4v16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  tslip:'<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M3 12h4M17 12h4M5 10l-2 2 2 2M19 10l2 2-2 2"/>',
  tslide:'<rect x="8" y="7" width="8" height="10" rx="1.5"/><path d="M3 12h5M16 12h5M3 7v10M21 7v10"/>',
  scope:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 16l3-5 3 3 3-6 3 4"/>'
});

/* ---------- M042 / M043 : outils de la timeline ---------- */
var tlTool='sel';
const TOOLS=[['sel','tsel','tool.sel','v'],['ripple','tripple','tool.ripple','b'],['roll','troll','tool.roll','n'],['slip','tslip','tool.slip','y'],['slide','tslide','tool.slide','u']];
function setTool(k){tlTool=k;$('#tli').dataset.tool=k;$$('#tools [data-tool]').forEach(b=>{b.classList.toggle('on',b.dataset.tool===k);b.setAttribute('aria-pressed',b.dataset.tool===k)});if(k!=='sel')toast(T('tool.'+k+'Hint'))}
function toolsBar(){
  let g=$('#tools');if(!g){g=document.createElement('div');g.id='tools';g.setAttribute('role','toolbar');$('#scbar').before(g);const vs=document.createElement('span');vs.className='vs';g.after(vs);
    g.addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool)})}
  g.setAttribute('aria-label',T('tool.title'));
  g.innerHTML=TOOLS.map(([k,i,n])=>`<button data-tool="${k}" class="${k===tlTool?'on':''}" aria-pressed="${k===tlTool}" title="${T(n)} (${kbLabel('tool_'+k)})">${ico(i,16)}</button>`).join('');
}
const fr1=()=>1/projFps,snapF=v=>Math.round(v*projFps)/projFps;
function mediaMax(x){const m=x.mid&&mById(x.mid);return m&&m.type!=='image'&&!x.gen?m.duration:null} // durée de la source (null = image, texte… : sans limite)
function shiftKf(x,orig,d){if(orig)x.kf=orig.map(k=>({...k,t:k.t-d}))}
function trimMove(d,e){
  const c=d.c,o=d.o,zone=d.zone,tool=tlTool,rt=c.p.rate||1,eps=1.5/projFps;
  if((tool==='ripple'||tool==='roll')&&zone==='m')return false; // le milieu du clip garde le déplacement normal
  if((tool==='slip'||tool==='slide')&&zone!=='m')return false;
  if(c.p.rev){if(!d.tmWarn){d.tmWarn=1;toast(T('tool.noRev'))}return true}
  if(!d.tm){
    const same=clips.filter(x=>x!==c&&x.track===c.track).map(x=>({x,start:x.start,dur:x.dur,in:x.in,kf:x.kf?JSON.parse(JSON.stringify(x.kf)):null}));
    d.tm={same,
      prev:same.filter(s=>Math.abs(s.start+s.dur-o.start)<eps).sort((a,b)=>b.start-a.start)[0]||null,
      next:same.filter(s=>Math.abs(s.start-(o.start+o.dur))<eps).sort((a,b)=>a.start-b.start)[0]||null,
      after:same.filter(s=>s.start>=o.start+o.dur-1e-3)};
  }
  const{same,prev,next,after}=d.tm;
  for(const s of same){s.x.start=s.start;s.x.dur=s.dur;s.x.in=s.in;if(s.kf)s.x.kf=JSON.parse(JSON.stringify(s.kf))}
  c.start=o.start;c.dur=o.dur;c.in=o.in;if(o.kf)c.kf=JSON.parse(JSON.stringify(o.kf));
  const dt=snapF((e.clientX-d.x0)/pxs),F=fr1(),mx=mediaMax(c);
  const rr=s=>s.x.p.rate||1,sMax=s=>mediaMax(s.x);
  if(tool==='ripple'){
    if(zone==='r'){const nd=clamp(o.dur+dt,F,mx!=null?(mx-o.in)/rt:1e6);c.dur=nd;for(const s of after)s.x.start=Math.max(0,s.start+nd-o.dur)}
    else{const lo=mx!=null?-o.in/rt:-1e6,dl=clamp(dt,lo,o.dur-F);c.in=o.in+dl*rt;c.dur=o.dur-dl;shiftKf(c,o.kf,dl);for(const s of after)s.x.start=Math.max(0,s.start-dl)}
  }else if(tool==='roll'){
    if(zone==='r'){if(!next){if(!d.tmWarn){d.tmWarn=1;toast(T('tool.noNeighbour'))}return true}
      const nr=rr(next),hi=Math.min(next.dur-F,mx!=null?(mx-o.in)/rt-o.dur:1e6),lo=Math.max(F-o.dur,sMax(next)!=null?-next.in/nr:-1e6),dl=clamp(dt,lo,hi);
      c.dur=o.dur+dl;next.x.start=next.start+dl;next.x.dur=next.dur-dl;next.x.in=next.in+dl*nr;shiftKf(next.x,next.kf,dl)}
    else{if(!prev){if(!d.tmWarn){d.tmWarn=1;toast(T('tool.noNeighbour'))}return true}
      const pr=rr(prev),pm=sMax(prev),hi=Math.min(o.dur-F,pm!=null?(pm-prev.in)/pr-prev.dur:1e6),lo=Math.max(F-prev.dur,mx!=null?-o.in/rt:-1e6),dl=clamp(dt,lo,hi);
      c.start=o.start+dl;c.dur=o.dur-dl;c.in=o.in+dl*rt;shiftKf(c,o.kf,dl);prev.x.dur=prev.dur+dl}
  }else if(tool==='slip'){
    if(mx==null){if(!d.tmWarn){d.tmWarn=1;toast(T('tool.noSlip'))}return true}
    c.in=clamp(o.in-dt*rt,0,Math.max(0,mx-o.dur*rt));
  }else if(tool==='slide'){
    let lo=-o.start,hi=1e6;
    if(prev){const pm=sMax(prev);lo=Math.max(lo,F-prev.dur);if(pm!=null)hi=Math.min(hi,(pm-prev.in)/rr(prev)-prev.dur)}
    if(next){const nm=sMax(next);hi=Math.min(hi,next.dur-F);if(nm!=null)lo=Math.max(lo,-next.in/rr(next))}
    const dl=clamp(dt,lo,hi);c.start=o.start+dl;
    if(prev)prev.x.dur=prev.dur+dl;
    if(next){next.x.start=next.start+dl;next.x.dur=next.dur-dl;next.x.in=next.in+dl*rr(next);shiftKf(next.x,next.kf,dl)}
  }
  return true;
}

/* ---------- M087 : LUT 3D (.cube) importées par l'utilisateur, appliquées sur un clip vidéo ---------- */
var lutLib={}; // {id:{n, size, d:base64}} — enregistré avec le projet (mx.luts)
const lutCache=new Map(); // id → {n, u8, tex}
{const o=mxOut;mxOut=function(){const r=o();const used=new Set();for(const s of[{clips},...(scenes||[])])for(const c of s.clips||[])if(c.p&&c.p.lut&&c.p.lut.id)used.add(c.p.lut.id);r.luts=Object.fromEntries(Object.entries(lutLib).filter(([k])=>used.has(k)));return r}}
{const o=mxIn;mxIn=function(x){o(x);lutLib={};lutCache.clear();const L=x&&x.luts;if(L&&typeof L==='object')for(const[k,v]of Object.entries(L))if(v&&v.d&&+v.size>=2&&+v.size<=65)lutLib[k]={n:String(v.n||k).slice(0,80),size:+v.size,d:String(v.d)}}}
function parseCube(txt){
  let n=0,min=[0,0,0],max=[1,1,1];const vals=[];
  for(const raw of txt.split(/\r?\n/)){
    const l=raw.trim();if(!l||l[0]==='#')continue;
    const w=l.split(/\s+/);
    if(w[0]==='LUT_3D_SIZE'){n=+w[1];continue}
    if(w[0]==='DOMAIN_MIN'){min=w.slice(1,4).map(Number);continue}
    if(w[0]==='DOMAIN_MAX'){max=w.slice(1,4).map(Number);continue}
    if(w[0]==='LUT_1D_SIZE')throw new Error('1d');
    if(/^[-+.\d]/.test(w[0])&&w.length>=3)vals.push(+w[0],+w[1],+w[2]);
  }
  if(!(n>=2&&n<=65)||vals.length!==n*n*n*3||vals.some(v=>!isFinite(v)))throw new Error('format');
  /* atlas 2D : les n tranches de bleu côte à côte (largeur n×n, hauteur n), valeurs sur 8 bits */
  const u8=new Uint8Array(n*n*n*3);let i=0;
  for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++,i+=3){
    const o=(g*n*n+b*n+r)*3;for(let k=0;k<3;k++)u8[o+k]=clamp(Math.round((vals[i+k]-min[k])/((max[k]-min[k])||1)*255),0,255);
  }
  return{n,u8};
}
const lutB64=u8=>{let s='';for(let i=0;i<u8.length;i+=32768)s+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));return btoa(s)};
const lutUnb64=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
function lutGet(id){
  if(lutCache.has(id))return lutCache.get(id);
  const L=lutLib[id];if(!L)return null;
  const e={n:L.size,u8:lutUnb64(L.d),tex:null};lutCache.set(id,e);return e;
}
const LUT_FS='precision mediump float;uniform sampler2D tx;uniform sampler2D lt;uniform float n;uniform float a;varying vec2 v;'+
 'vec3 lk(vec3 c){float b=c.b*(n-1.);float b0=floor(b);float b1=min(b0+1.,n-1.);vec2 o=vec2((c.r*(n-1.)+.5)/(n*n),(c.g*(n-1.)+.5)/n);'+
 'return mix(texture2D(lt,o+vec2(b0/n,0.)).rgb,texture2D(lt,o+vec2(b1/n,0.)).rgb,b-b0);}'+
 'void main(){vec4 c=texture2D(tx,v);gl_FragColor=vec4(mix(c.rgb,lk(clamp(c.rgb,0.,1.)),a),c.a);}';
let lutProg=null;
function lutApply(L){
  const e=lutGet(L.id);if(!e||!glSetup())return;
  if(!lutProg){
    const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);return gl.getShaderParameter(o,gl.COMPILE_STATUS)?o:null};
    const vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'),fs=sh(gl.FRAGMENT_SHADER,LUT_FS);
    if(!vs||!fs){lutProg=false;return}
    const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
    lutProg=gl.getProgramParameter(pr,gl.LINK_STATUS)?{pr,p:gl.getAttribLocation(pr,'p'),tx:gl.getUniformLocation(pr,'tx'),lt:gl.getUniformLocation(pr,'lt'),n:gl.getUniformLocation(pr,'n'),a:gl.getUniformLocation(pr,'a')}:false;
  }
  if(!lutProg)return;
  if(!e.tex){
    e.tex=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,e.tex);
    for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,e.n*e.n,e.n,0,gl.RGB,gl.UNSIGNED_BYTE,e.u8);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.activeTexture(gl.TEXTURE0);
  }
  const cw=ctx.canvas.width,ch=ctx.canvas.height;
  if(glc.width<cw||glc.height<ch){glc.width=Math.max(glc.width,cw);glc.height=Math.max(glc.height,ch)}
  gl.viewport(0,0,cw,ch);gl.useProgram(lutProg.pr);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,e.tex);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,glTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ctx.canvas);
  gl.enableVertexAttribArray(lutProg.p);gl.vertexAttribPointer(lutProg.p,2,gl.FLOAT,false,0,0);
  gl.uniform1i(lutProg.tx,0);gl.uniform1i(lutProg.lt,1);gl.uniform1f(lutProg.n,e.n);gl.uniform1f(lutProg.a,clamp((L.a??100)/100,0,1));
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='copy';
  ctx.drawImage(glc,0,glc.height-ch,cw,ch,0,0,cw,ch);ctx.restore();
}
function lutImport(file){
  return file.text().then(txt=>{
    const{n,u8}=parseCube(txt),id='l'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
    lutLib[id]={n:file.name.replace(/\.cube$/i,'').slice(0,80),size:n,d:lutB64(u8)};lutCache.delete(id);projDirty=true;return id;
  });
}
function lutCtx(c){return isVid(c)&&!c.gen?[{label:T('lut.menu'),fn:()=>lutDialog()}]:[]}
function lutDialog(){
  const tg=selClips().filter(x=>isVid(x)&&!x.gen&&!trk(x).lock);if(!tg.length){toast(T('lut.noClip'));return}
  const cur=tg[0].p.lut||{};
  const o=document.createElement('div');o.className='kbov';o.id='lutdlg';
  const draw=()=>{
    const ids=Object.keys(lutLib),c0=tg[0].p.lut||{};
    o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="luth"><div class="kbhead"><h3 id="luth">${T('lut.title')}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
    <p class="hint">${T('lut.hint')}</p>
    <div class="fld"><label for="lutSel">${T('lut.choose')}</label><select id="lutSel"><option value="">${T('lut.none')}</option>${ids.map(k=>`<option value="${k}" ${c0.id===k?'selected':''}>${esc(lutLib[k].n)} (${lutLib[k].size}³)</option>`).join('')}</select></div>
    <div class="fld"><label for="lutA">${T('lut.amount')}<span>${c0.a??100} %</span></label><input id="lutA" type="range" min="0" max="100" value="${c0.a??100}"></div>
    <div class="kbfoot mtfoot"><button data-imp>${T('lut.import')}</button><button class="pri" data-x>${T('kb.close')}</button></div><input id="lutFile" type="file" accept=".cube" hidden></div>`;
  };
  draw();document.body.appendChild(o);
  const set=(id,a)=>{for(const x of tg){if(id)x.p.lut={id,a};else delete x.p.lut}commit();refresh()};
  o.addEventListener('pointerdown',e=>{if(e.target===o)o.remove()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')o.remove()});
  o.addEventListener('input',e=>{if(e.target.id==='lutA'){e.target.previousElementSibling.querySelector('span').textContent=e.target.value+' %';const id=$('#lutSel').value;if(id){for(const x of tg)x.p.lut={id,a:+e.target.value};wake()}}});
  o.addEventListener('change',e=>{
    if(e.target.id==='lutSel')set(e.target.value,+$('#lutA').value);
    if(e.target.id==='lutA'&&$('#lutSel').value)set($('#lutSel').value,+e.target.value);
    if(e.target.id==='lutFile'&&e.target.files[0])lutImport(e.target.files[0]).then(id=>{set(id,+$('#lutA').value);draw();toast(T('lut.added'))}).catch(()=>toast(T('lut.bad')));
  });
  o.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x!=null)o.remove();if(b.dataset.imp!=null)$('#lutFile').click()});
  void cur;$('#lutSel').focus();
}

/* ---------- M090 : scopes (histogramme, forme d'onde, parade RVB, vectorscope) de l'image de l'aperçu ---------- */
let scopeOn=false,scopeKind='wave',scopeTimer=0;
const scSmall=document.createElement('canvas'),scSmallCtx=scSmall.getContext('2d',{willReadFrequently:true});
function toggleScopes(){
  scopeOn=!scopeOn;let b=$('#scopes');
  if(!scopeOn){b&&b.remove();clearInterval(scopeTimer);return}
  b=document.createElement('div');b.id='scopes';b.setAttribute('role','dialog');b.setAttribute('aria-label',T('scope.title'));
  b.innerHTML=`<div class="schead"><div class="seg">${['wave','parade','hist','vector'].map(k=>`<button data-sk="${k}" class="${k===scopeKind?'on':''}">${T('scope.'+k)}</button>`).join('')}</div><button class="sm" data-x aria-label="${T('kb.close')}">✕</button></div><canvas id="scopecv" width="320" height="180"></canvas><div class="hint" id="scopeinfo"></div>`;
  document.body.appendChild(b);
  b.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;if(x.dataset.x!=null){toggleScopes();return}if(x.dataset.sk){scopeKind=x.dataset.sk;b.querySelectorAll('[data-sk]').forEach(y=>y.classList.toggle('on',y===x));drawScope()}});
  scopeTimer=setInterval(()=>{if(!document.hidden)drawScope()},160);drawScope();
}
function drawScope(){
  const out=$('#scopecv');if(!out)return;const o=out.getContext('2d'),w=out.width,h=out.height;
  const sw=192,sh=Math.max(2,Math.round(192*H/W));scSmall.width=sw;scSmall.height=sh;scSmallCtx.drawImage(cv,0,0,sw,sh);
  const d=scSmallCtx.getImageData(0,0,sw,sh).data,N=sw*sh;
  o.fillStyle='#0b0b10';o.fillRect(0,0,w,h);
  o.strokeStyle='rgba(255,255,255,.12)';o.lineWidth=1;o.beginPath();for(const q of[0,.25,.5,.75,1]){const y=Math.round(4+(h-8)*(1-q))+.5;o.moveTo(0,y);o.lineTo(w,y)}o.stroke();
  let clipHi=0,clipLo=0;for(let i=0;i<d.length;i+=4){const Y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];if(Y>=254)clipHi++;if(Y<=1)clipLo++}
  $('#scopeinfo').textContent=T('scope.clip',{hi:window.i18n.fmt.percent(clipHi/N),lo:window.i18n.fmt.percent(clipLo/N)});
  const img=o.getImageData(0,0,w,h),px=img.data,plot=(x,y,r,g,b)=>{x|=0;y|=0;if(x<0||y<0||x>=w||y>=h)return;const k=(y*w+x)*4;px[k]=Math.min(255,px[k]+r);px[k+1]=Math.min(255,px[k+1]+g);px[k+2]=Math.min(255,px[k+2]+b)};
  const yOf=v=>4+(h-8)*(1-v/255);
  if(scopeKind==='wave'||scopeKind==='parade'){
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const k=(y*sw+x)*4,r=d[k],g=d[k+1],b=d[k+2];
      if(scopeKind==='wave'){plot(x/sw*w,yOf(.2126*r+.7152*g+.0722*b),26,40,26)}
      else{const cw=w/3;plot(x/sw*cw,yOf(r),60,8,8);plot(cw+x/sw*cw,yOf(g),8,60,8);plot(2*cw+x/sw*cw,yOf(b),10,14,70)}}
  }else if(scopeKind==='hist'){
    const H4=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)];
    for(let i=0;i<d.length;i+=4){H4[0][d[i]]++;H4[1][d[i+1]]++;H4[2][d[i+2]]++;H4[3][Math.round(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])]++}
    o.putImageData(img,0,0);const mx=Math.max(1,...H4.map(a=>Math.max(...a.slice(2,254))));
    [['rgba(239,68,68,.55)',0],['rgba(34,197,94,.55)',1],['rgba(59,130,246,.55)',2],['rgba(255,255,255,.75)',3]].forEach(([col,ci])=>{o.strokeStyle=col;o.beginPath();for(let v=0;v<256;v++){const x=v/255*w,y=h-4-(h-8)*Math.min(1,H4[ci][v]/mx);v?o.lineTo(x,y):o.moveTo(x,y)}o.stroke()});
    return;
  }else{
    const cx=w/2,cy=h/2,R=h/2-6;
    for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],cb=-.1146*r-.3854*g+.5*b,cr=.5*r-.4542*g-.0458*b;plot(cx+cb/128*R,cy-cr/128*R,40,40,40)}
    o.putImageData(img,0,0);o.strokeStyle='rgba(255,255,255,.18)';o.beginPath();o.arc(cx,cy,R,0,7);o.moveTo(cx-R,cy);o.lineTo(cx+R,cy);o.moveTo(cx,cy-R);o.lineTo(cx,cy+R);o.stroke();
    /* ligne des tons chair */
    o.strokeStyle='rgba(251,191,36,.5)';o.beginPath();o.moveTo(cx,cy);const a=-123*Math.PI/180;o.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);o.stroke();
    return;
  }
  o.putImageData(img,0,0);
}

/* ---------- M106 : sonie du mixage (ITU-R BS.1770 : pondération K, blocs de 400 ms, porte absolue et relative) ---------- */
function biq(x,b,a){const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=x[i],o=b[0]*v+b[1]*x1+b[2]*x2-a[1]*y1-a[2]*y2;x2=x1;x1=v;y2=y1;y1=o;y[i]=o}return y}
function loudnessOf(buf){
  const sr=buf.sampleRate;
  /* coefficients de la norme pour 48 kHz (le mixage de DedCut est toujours rendu à 48 kHz) */
  const s1b=[1.53512485958697,-2.69169618940638,1.19839281085285],s1a=[1,-1.69065929318241,.73248077421585],s2b=[1,-2,1],s2a=[1,-1.99004745483398,.99007225036621];
  const chs=[];for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)chs.push(biq(biq(buf.getChannelData(c),s1b,s1a),s2b,s2a));
  const bl=Math.round(.4*sr),hop=Math.round(.1*sr),z=[];
  for(let s=0;s+bl<=buf.length;s+=hop){let t=0;for(const x of chs){let m=0;for(let i=s;i<s+bl;i++)m+=x[i]*x[i];t+=m/bl}z.push(t)}
  const L=v=>-.691+10*Math.log10(v);
  const abs=z.filter(v=>v>0&&L(v)>-70);if(!abs.length)return{lufs:-Infinity,peak:-Infinity};
  const mean=a=>a.reduce((p,v)=>p+v,0)/a.length,rel=L(mean(abs))-10,gated=abs.filter(v=>L(v)>rel);
  /* crête estimée : échantillons + interpolation ×4 (approximation de la crête réelle) */
  let pk=0;for(let c=0;c<buf.numberOfChannels;c++){const x=buf.getChannelData(c);for(let i=1;i<x.length-2;i++){const a=x[i];if(Math.abs(a)>pk)pk=Math.abs(a);if(Math.abs(a)>.5)for(const f of[.25,.5,.75]){const p0=x[i-1],p1=a,p2=x[i+1],p3=x[i+2],v=p1+.5*f*(p2-p0+f*(2*p0-5*p1+4*p2-p3+f*(3*(p1-p2)+p3-p0)));if(Math.abs(v)>pk)pk=Math.abs(v)}}}
  return{lufs:L(mean(gated.length?gated:abs)),peak:20*Math.log10(pk||1e-9)};
}
const LU_TARGETS=[['yt',-14],['pod',-16],['tv',-23]];
async function measureLoud(){const TD=total();if(TD<=0)throw new Error(T('msg.timelineEmpty'));if(TD>1800)throw new Error(T('lu.tooLong'));const b=await mixAudio(TD);if(!b)return null;return loudnessOf(b)}
async function openLoudness(){
  if(!clips.length){toast(T('msg.timelineEmpty'));return}
  const o=document.createElement('div');o.className='kbov';o.id='ludlg';document.body.appendChild(o);
  const close=()=>o.remove();
  o.addEventListener('pointerdown',e=>{if(e.target===o)close()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});
  const fmt1=v=>isFinite(v)?window.i18n.fmt.number(Math.round(v*10)/10,{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
  const draw=(r,msg)=>{o.innerHTML=`<div class="kbbox mtbox" role="dialog" aria-modal="true" aria-labelledby="luh"><div class="kbhead"><h3 id="luh">${T('lu.title')}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
    ${r?`<div class="kblist"><div class="kbrow"><span>${T('lu.integrated')}</span><b>${fmt1(r.lufs)} LUFS</b></div><div class="kbrow"><span>${T('lu.peak')}</span><b>${fmt1(r.peak)} dB</b></div><div class="kbrow"><span>${T('proj.masterVol')}</span><b>${masterVol} %</b></div></div>
    ${r.peak>-1?`<p class="hint" style="color:var(--yel)">${T('lu.peakWarn')}</p>`:''}<p class="hint">${T('lu.adjust')}</p><div class="pre" style="margin:0">${LU_TARGETS.map(([k,v])=>`<button data-lt="${v}">${T('lu.t_'+k)} (${v})</button>`).join('')}</div>`:`<p class="hint" role="status">${msg||T('lu.measuring')}</p>`}</div>`};
  const run=async()=>{draw(null);try{const r=await measureLoud();if(!r){draw(null,T('lu.silent'));return}o.isConnected&&draw(r);o._r=r}catch(e){draw(null,String(e.message||e))}};
  o.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;if(b.dataset.x!=null){close();return}
    if(b.dataset.lt&&o._r&&isFinite(o._r.lufs)){
      const want=+b.dataset.lt,nv=clamp(Math.round(masterVol*Math.pow(10,(want-o._r.lufs)/20)),0,200);
      masterVol=nv;if(master)master.gain.value=masterVol/100;autosave();if(!sel)renderInspector();
      await run();toast(T('lu.done',{v:nv}));
    }
  });
  await run();
}

/* ---------- M108 : une piste = un fichier WAV (mixage de cette piste seule, réglages du clip compris) ---------- */
async function exportStems(){
  const TD=total();if(TD<=0){toast(T('msg.timelineEmpty'));return}
  if(TD>1800){toast(T('lu.tooLong'));return}
  const rows=tracks.map((t,i)=>i).filter(i=>!tracks[i].mute&&clips.some(c=>c.track===i&&c.mid&&mById(c.mid)&&mById(c.mid).type!=='image'));
  if(!rows.length){toast(T('stem.none'));return}
  const save=tracks.map(t=>t.solo),stamp=new Date().toTimeString().slice(0,8).replace(/:/g,'-');let n=0,last=null;
  toast(T('stem.working'));
  try{
    for(const i of rows){
      tracks.forEach((t,k)=>{if(k===i)t.solo=true;else delete t.solo});
      const b=await mixAudio(TD);if(!b)continue;
      const blob=wavFromChannels([b.getChannelData(0),b.getChannelData(1)],b.sampleRate);
      const name=safeName(projName+' - '+trackName(i)+' ('+stamp+')')+'.wav';
      if(inApp){
        const st=await(await appFetch('app://dedcut/__out?op=start&name='+encodeURIComponent(name),{method:'POST'})).json();
        for(let p=0;p<blob.size;p+=1<<24)await appFetch('app://dedcut/__out?op=write&pos='+p,{method:'POST',body:await blob.slice(p,p+(1<<24)).arrayBuffer()});
        await appFetch('app://dedcut/__out?op=end',{method:'POST'});last=st.path;
      }else download(blob,name);
      n++;
    }
  }catch(e){console.error(e);toast(T('stem.failed'))}
  finally{tracks.forEach((t,k)=>{if(save[k])t.solo=true;else delete t.solo});renderTL()}
  if(n){toast(T('stem.done',{count:n}));if(last)appFetch('app://dedcut/__out?op=show&p='+encodeURIComponent(last)).catch(()=>{})}
}

/* ---------- M066 : lisibilité des sous-titres ---------- */
const capOf=c=>isText(c)&&c.p&&c.p.cap;
let capCps=17;
function capIssues(){
  const L=clips.filter(capOf).sort((a,b)=>a.start-b.start),out=[];
  L.forEach((c,i)=>{
    const tx=String(c.p.text||''),lines=tx.split('\n'),n=tx.replace(/\s+/g,' ').trim().length,cps=n/Math.max(.01,c.dur),why=[];
    if(cps>capCps)why.push(T('rd.fast',{cps:Math.round(cps)}));
    if(lines.some(l=>l.length>42))why.push(T('rd.long',{n:Math.max(...lines.map(l=>l.length))}));
    if(lines.length>2)why.push(T('rd.lines',{n:lines.length}));
    if(c.dur<.83)why.push(T('rd.short'));
    if(c.dur>7)why.push(T('rd.slow'));
    const nx=L[i+1];if(nx&&nx.start<c.start+c.dur-.01)why.push(T('rd.overlap'));
    if(why.length)out.push({c,why,tx});
  });
  return{list:out,count:L.length};
}
function openReadability(){
  const o=document.createElement('div');o.className='kbov';o.id='rddlg';document.body.appendChild(o);
  const draw=()=>{const r=capIssues();o.innerHTML=`<div class="kbbox" role="dialog" aria-modal="true" aria-labelledby="rdh"><div class="kbhead"><h3 id="rdh">${T('rd.title')}</h3><button class="sm" data-x>${T('kb.close')}</button></div>
    <div class="fld"><label for="rdCps">${T('rd.cps')}</label><select id="rdCps">${[12,15,17,20,25].map(v=>`<option ${v===capCps?'selected':''}>${v}</option>`).join('')}</select></div>
    <p class="hint" role="status">${!r.count?T('rd.noCaps'):r.list.length?T('rd.found',{n:r.list.length,total:r.count}):T('rd.allGood',{total:r.count})}</p>
    <div class="kblist">${r.list.map(x=>`<div class="kbrow"><span><b>${fmtTC(x.c.start)}</b> ${esc(x.tx.slice(0,48))}${x.tx.length>48?'…':''}<br><span class="hint">${x.why.map(esc).join(' · ')}</span></span><button class="sm" data-go="${x.c.id}">${T('rd.go')}</button></div>`).join('')}</div></div>`};
  draw();
  o.addEventListener('pointerdown',e=>{if(e.target===o)o.remove()});
  o.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')o.remove()});
  o.addEventListener('change',e=>{if(e.target.id==='rdCps'){capCps=+e.target.value;draw()}});
  o.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x!=null)o.remove();if(b.dataset.go){const c=clips.find(x=>x.id===+b.dataset.go);if(c){pause();sel=c.id;msel.clear();seek(c.start);refresh();o.remove()}}});
}
{const t=$('#t-cap');if(t){const d=document.createElement('div');d.className='sec';d.innerHTML=`<button class="sm" id="rdBtn"></button>`;t.appendChild(d);const lab=()=>{$('#rdBtn').textContent=T('rd.title')};lab();$('#rdBtn').onclick=openReadability;window.addEventListener('dedcut-lang',lab)}}

/* raccourcis et commandes */
KEYACTS.push(...TOOLS.map(([k,,n,key])=>({id:'tool_'+k,n,d:[key],f:()=>setTool(k)})),{id:'scopes',n:'scope.title',d:['shift+s'],f:toggleScopes});
CMDS.push({id:'lufs',n:'lu.measure',f:openLoudness},{id:'stems',n:'stem.btn',f:exportStems},{id:'readab',n:'rd.title',f:openReadability},{id:'lut',n:'lut.menu',f:lutDialog});
toolsBar();window.addEventListener('dedcut-lang',toolsBar);

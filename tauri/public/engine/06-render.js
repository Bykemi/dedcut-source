/* ---------- rendu ---------- */
let curFilter='none',curId=0;
const boxes=new Map();
function colFilter(p){
  const c=p.col;if(!c)return 'none';const f=[];
  if((c.br??100)!==100)f.push('brightness('+c.br+'%)');
  if((c.ct??100)!==100)f.push('contrast('+c.ct+'%)');
  if((c.sa??100)!==100)f.push('saturate('+c.sa+'%)');
  if(c.hue)f.push('hue-rotate('+c.hue+'deg)');
  if(c.sep)f.push('sepia('+c.sep+'%)');
  if(c.gs)f.push('grayscale('+c.gs+'%)');
  if(c.inv)f.push('invert('+c.inv+'%)');
  return f.length?f.join(' '):'none';
}
/* étalonnage dessiné par-dessus l'image (teintes, noirs délavés, halo, vignette, grain) */
const hasGrade=c=>!!c&&!!(c.fade||c.vig||c.grain||c.leak||c.t1o||c.t2o);
let grainCv=null;
function grainTile(){
  if(grainCv)return grainCv;
  grainCv=document.createElement('canvas');grainCv.width=grainCv.height=256;
  const g=grainCv.getContext('2d'),im=g.createImageData(256,256),d=im.data;
  for(let i=0;i<d.length;i+=4){const v=128+((Math.random()+Math.random()+Math.random())/3-.5)*230;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}
  g.putImageData(im,0,0);return grainCv;
}
function applyGrade(g,x,y,w,h,c,t){
  if(!hasGrade(c)||w<=0||h<=0)return;
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.filter='none';
  if(c.fade){const v=Math.round(c.fade*.9);g.globalCompositeOperation='screen';g.globalAlpha=1;g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(x,y,w,h)}
  for(const i of[1,2]){const o=c['t'+i+'o'];if(!o)continue;g.globalCompositeOperation=c['t'+i+'m']||'soft-light';g.globalAlpha=Math.min(1,o/100);g.fillStyle=c['t'+i+'c']||'#ffffff';g.fillRect(x,y,w,h)}
  if(c.leak){
    const r=Math.hypot(w,h)*.75,lg=g.createRadialGradient(x+w*.08,y+h*.05,0,x+w*.08,y+h*.05,r);
    lg.addColorStop(0,c.leakc||'#ffb060');lg.addColorStop(1,'rgba(0,0,0,0)');
    g.globalCompositeOperation='screen';g.globalAlpha=Math.min(1,c.leak/60);g.fillStyle=lg;g.fillRect(x,y,w,h);
  }
  if(c.vig){
    const cx=x+w/2,cy=y+h/2,r=Math.hypot(w,h)/2,vg=g.createRadialGradient(cx,cy,r*.45,cx,cy,r);
    vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,'+Math.min(.95,c.vig/100)+')');
    g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle=vg;g.fillRect(x,y,w,h);
  }
  if(c.grain){
    const p=g.createPattern(grainTile(),'repeat'),k=Math.max(1,Math.round(Math.min(w,h)/720));
    p.setTransform(new DOMMatrix().translate(Math.floor(hash(Math.floor(t*24))*256),Math.floor(hash(Math.floor(t*24)+7)*256)).scale(k));
    g.globalCompositeOperation='overlay';g.globalAlpha=Math.min(.9,c.grain/100);g.fillStyle=p;g.fillRect(x,y,w,h);
  }
  g.restore();
}
function cropRect(p,w,h){const r=p.crop||{},l=r.l||0,t=r.t||0;return[w*l/100,h*t/100,Math.max(1,w*(1-(l+(r.r||0))/100)),Math.max(1,h*(1-(t+(r.b||0))/100))]}
function drawCover(el,w,h,p){
  if(!w||!h)return;
  const[sx,sy,sw,sh]=cropRect(p,w,h);
  const fit=p.fit,tf=p.tf||{},cov=Math.max(W/sw,H/sh),s=(fit==='contain'||fit==='blur')?Math.min(W/sw,H/sh):cov;
  if(fit==='blur'){ // contenir + arrière-plan flou
    ctx.save();ctx.filter=(curFilter==='none'?'':curFilter+' ')+'blur(40px)';
    const b=cov*1.1;ctx.drawImage(el,sx,sy,sw,sh,(W-sw*b)/2,(H-sh*b)/2,sw*b,sh*b);ctx.restore();ctx.filter=curFilter;
  }
  const z=(tf.zoom??100)/100,cx=W/2+W*(tf.x||0)/100,cy=H/2+H*(tf.y||0)/100;
  ctx.save();ctx.translate(cx,cy);
  if(tf.rot)ctx.rotate(tf.rot*Math.PI/180);
  ctx.scale(tf.flip?-z:z,z);
  ctx.drawImage(el,sx,sy,sw,sh,-sw*s/2,-sh*s/2,sw*s,sh*s);
  ctx.restore();
  boxes.set(curId,{x:cx-sw*s*z/2,y:cy-sh*s*z/2,w:sw*s*z,h:sh*s*z,rot:tf.rot||0});
}
function drawBase(c,t){
  const p=c.p;curId=c.id;curFilter=colFilter(p);ctx.filter=curFilter;
  if(c.gen==='matrix')drawMatrix(t-c.start,p);
  else if(c.gen==='color'){ctx.fillStyle=p.color;ctx.fillRect(0,0,W,H)}
  else if(c.gen==='grad'){
    const a=(p.angle??135)*Math.PI/180,r=Math.hypot(W,H)/2,dx=Math.sin(a)*r,dy=-Math.cos(a)*r,g=ctx.createLinearGradient(W/2-dx,H/2-dy,W/2+dx,H/2+dy);
    g.addColorStop(0,p.color);g.addColorStop(1,p.color2||'#000');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  else{
    const m=mById(c.mid),fr=xf&&xf.get(c.id),el=!fr&&m&&getEl(c);
    if(fr)drawCover(fr.img,fr.w,fr.h,p);
    else if(el){
      if(m.type==='video'){if(el.readyState>=2)drawCover(el,el.videoWidth,el.videoHeight,p)}
      else drawCover(el,el.naturalWidth,el.naturalHeight,p);
    }
  }
  if(c.gen)boxes.set(c.id,{x:0,y:0,w:W,h:H,rot:0});
  ctx.filter='none';
  if(hasGrade(p.col)){const b=p.fit==='blur'?null:boxes.get(c.id);applyGrade(ctx,b?b.x:0,b?b.y:0,b?b.w:W,b?b.h:H,p.col,t)}
  if(p.lut&&p.lut.id&&window.lutApply)lutApply(p.lut);
  if(keyOn(p)&&!c.gen)chromaKey(c,t);
  applyFX(p,t,t-c.start);
}
/* ---------- détourage : couleur (écran vert) et/ou fond retiré par l'IA (sans écran vert) ----------
   ck.on = retirer une couleur (tol = tolérance, soft = douceur des bords, spill = retrait des reflets de la couleur sur la personne)
   ck.ai = retirer le fond avec le modèle de détourage de personne (le même que les effets « Personne », 100 % local)
   ck.bg = ce qui remplace le fond sur la piste principale : clips en dessous, noir, image d'origine floutée */
const keyOn=p=>!!(p&&p.chroma&&(p.chroma.on||p.chroma.ai));
const ckOrig=document.createElement('canvas'),ckOrigCtx=ckOrig.getContext('2d');
function chromaKey(c,t){
  const ck=c.p.chroma,main=isVid(c),bg=main?ck.bg:'none';
  if(bg==='blur'){ckOrig.width=W;ckOrig.height=H;ckOrigCtx.drawImage(ctx.canvas,0,0)}
  if(ck.on){
    const kr=parseInt(ck.color.slice(1,3),16),kg=parseInt(ck.color.slice(3,5),16),kb=parseInt(ck.color.slice(5,7),16);
    const img=ctx.getImageData(0,0,W,H),d=img.data,tol=ck.tol*3.2,soft=Math.max(1,tol*(ck.soft??35)/100),t2=tol*tol;
    // reflets : seulement pour une couleur franche (vert, bleu…), pas pour le blanc ou le noir
    const mx=Math.max(kr,kg,kb),ch=mx-Math.min(kr,kg,kb)>60?(mx===kg?1:mx===kb?2:0):-1,sp=ch<0?0:(ck.spill??50)/100;
    const o1=(ch+1)%3,o2=(ch+2)%3;
    for(let i=0;i<d.length;i+=4){
      const dr=d[i]-kr,dg=d[i+1]-kg,db=d[i+2]-kb,dd=dr*dr+dg*dg+db*db;
      if(dd<t2){d[i+3]=0;continue}
      const dist=Math.sqrt(dd);if(dist<tol+soft)d[i+3]=d[i+3]*(dist-tol)/soft;
      if(sp>0){const lim=Math.max(d[i+o1],d[i+o2]),v=d[i+ch];if(v>lim)d[i+ch]=v-(v-lim)*sp}
    }
    ctx.putImageData(img,0,0);
  }
  if(ck.ai&&personMask()){
    const u=Math.max(.12,H/720),f=(ck.soft??35)/100*5*u;
    ctx.save();ctx.globalCompositeOperation='destination-in';if(f>.3)ctx.filter='blur('+f+'px)';ctx.drawImage(psA,0,0);ctx.restore();
  }
  if(bg==='black'||bg==='matrix'||bg==='blur'){
    ctx.save();ctx.globalCompositeOperation='destination-over';
    if(bg==='matrix')drawMatrix(t-c.start,{color:'#00ff46'});
    else if(bg==='blur'){ctx.filter='blur('+Math.round(Math.max(W,H)/60)+'px)';ctx.drawImage(ckOrig,0,0);ctx.filter='none'}
    else{ctx.fillStyle='#000';ctx.fillRect(0,0,W,H)}
    ctx.restore();
  }
}
const MCH='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂ0123456789ABCDEF<>/|=+*'.split('');
function drawMatrix(t,p){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const fs=Math.round(H/32),cols=Math.ceil(W/fs),rows=Math.ceil(H/fs);
  ctx.font=fs+'px monospace';ctx.textBaseline='top';
  for(let i=0;i<cols;i++){
    const sp=.5+hash(i)*1.3,len=8+Math.floor(hash(i+5)*16);
    const head=(t*sp*12+hash(i+99)*200)%(rows+len+4);
    for(let k=0;k<len;k++){
      const r=Math.floor(head)-k;if(r<0||r>=rows)continue;
      const ch=MCH[Math.floor(hash(i*131+r*7+Math.floor(t*(k?2:14)))*MCH.length)%MCH.length];
      ctx.globalAlpha=k?Math.max(.08,1-k/len):1;
      ctx.fillStyle=k?p.color:'#e6ffe9';
      ctx.fillText(ch,i*fs,r*fs);
    }
  }
  ctx.globalAlpha=1;
}
const tcv=document.createElement('canvas'),tctx=tcv.getContext('2d');
function pixelate(src,dst,ps){
  const tw=Math.max(1,Math.ceil(W/ps)),th=Math.max(1,Math.ceil(H/ps));
  tcv.width=tw;tcv.height=th;tctx.drawImage(src,0,0,tw,th);
  dst.clearRect(0,0,W,H);dst.imageSmoothingEnabled=false;dst.drawImage(tcv,0,0,tw,th,0,0,W,H);dst.imageSmoothingEnabled=true;
}
/* ---------- effets calculés par la carte graphique (WebGL) ----------
   L'image du canvas est envoyée comme texture, un petit programme (shader) la transforme, le résultat est recopié.
   Si WebGL n'est pas disponible, ces effets sont simplement ignorés. */
const GLH='precision mediump float;varying vec2 v;uniform sampler2D tx;uniform vec2 res;uniform float t,a,u;'+
 'vec4 T(vec2 p){return texture2D(tx,clamp(p,0.,1.));}float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}'+
 'float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
 'vec3 hrot(vec3 c,float h){vec3 k=vec3(.57735);float cs=cos(h);return c*cs+cross(k,c)*sin(h)+k*dot(k,c)*(1.-cs);}vec3 g3(float x,vec3 a,vec3 b,vec3 c){return x<.5?mix(a,b,x*2.):mix(b,c,x*2.-1.);}'+
 'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+vec2(1.,1.)),f.x),f.y);}float fbm(vec2 p){return .5*vn(p)+.25*vn(p*2.03)+.125*vn(p*4.01)+.125*vn(p*8.05);}'+
 'float sob(vec2 px){float tl=lum(T(v+px*vec2(-1.,1.)).rgb),tc=lum(T(v+px*vec2(0.,1.)).rgb),tr=lum(T(v+px*vec2(1.,1.)).rgb),ml=lum(T(v+px*vec2(-1.,0.)).rgb),mr=lum(T(v+px*vec2(1.,0.)).rgb),bl=lum(T(v+px*vec2(-1.,-1.)).rgb),bc=lum(T(v+px*vec2(0.,-1.)).rgb),br=lum(T(v+px*vec2(1.,-1.)).rgb);'+
 'float gx=-tl-2.*ml-bl+tr+2.*mr+br,gy=-tl-2.*tc-tr+bl+2.*bc+br;return length(vec2(gx,gy));}';
const GLFX={
  lens:'void main(){vec2 d=v-.5;float r2=dot(d,d);vec2 q=d*(1.+.22*a*r2)/(1.+.06*a);float c=.014*a*(.25+r2*2.5);gl_FragColor=vec4(T(.5+q*(1.+c)).r,T(.5+q).g,T(.5+q*(1.-c)).b,T(.5+q).a);}',
  fisheye:'void main(){vec2 d=v-.5;float r=length(d*vec2(res.x/res.y,1.));float k=1.+a*1.1*r*r;vec2 q=.5+d*k/(1.+a*.3);if(q.x<0.||q.x>1.||q.y<0.||q.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}gl_FragColor=T(q);}',
  tiltshift:'void main(){float k=smoothstep(.1,.42,abs(v.y-.5))*a;vec4 s=vec4(0.);for(int i=0;i<24;i++){float an=float(i)*2.399,rr=sqrt(float(i)/24.)*k*16.*u;s+=T(v+vec2(cos(an),sin(an))*rr/res);}vec4 c=s/24.;float l=lum(c.rgb);c.rgb=mix(vec3(l),c.rgb,1.+.35*a);gl_FragColor=c;}',
  halation:'void main(){vec4 c=T(v);vec3 g=vec3(0.);for(int i=0;i<24;i++){float an=float(i)*2.399,rr=sqrt(float(i)/24.)*22.*u;g+=max(T(v+vec2(cos(an),sin(an))*rr/res).rgb-vec3(.62),0.);}g/=24.;c.rgb+=lum(g)*vec3(1.,.38,.18)*4.*a;gl_FragColor=c;}',
  prism:'void main(){vec2 o=vec2(cos(t*.8),sin(t*.8))*.012*a;vec4 c=T(v);vec3 p=vec3(T(v+o).r,c.g,T(v-o).b);vec3 gh=vec3(T(v+o*3.).r,T(v-o*3.).g,T(v+o*2.).b);gl_FragColor=vec4(mix(c.rgb,p,.8)+gh*.18*a,c.a);}',
  sharpen:'void main(){vec2 px=max(1.,u)/res;vec4 c=T(v);vec3 m=(T(v+vec2(px.x,0.)).rgb+T(v-vec2(px.x,0.)).rgb+T(v+vec2(0.,px.y)).rgb+T(v-vec2(0.,px.y)).rgb)*.25;gl_FragColor=vec4(c.rgb+(c.rgb-m)*2.2*a,c.a);}',
  motionblur:'void main(){vec4 s=vec4(0.);for(int i=0;i<16;i++){float f=float(i)/15.-.5;s+=T(v+vec2(f*40.*u*a,0.)/res);}gl_FragColor=s/16.;}',
  glitchblock:'void main(){float st=floor(t*10.);vec2 b=floor(v*vec2(16.,9.));float h=hsh(b+st);vec2 q=v;if(h<.12*a+.02)q.x+=(hsh(b*1.7+st)-.5)*.22;vec4 c=T(q);if(h<.07*a+.01)c.rgb=vec3(T(q+vec2(.012,0.)).r,c.g,T(q-vec2(.012,0.)).b);if(hsh(vec2(b.y,st))<.04*a)c.rgb=1.-c.rgb;gl_FragColor=c;}',
  crt:'void main(){vec2 d=v-.5;d*=1.+dot(d,d)*.28*a;vec2 q=d+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}vec4 c=T(q);float sl=.5+.5*sin(q.y*res.y*3.14159/max(1.5,2.*u));c.rgb*=mix(1.,.65+.35*sl,a);float m=mod(gl_FragCoord.x,3.);vec3 k=m<1.?vec3(1.,.75,.75):m<2.?vec3(.75,1.,.75):vec3(.75,.75,1.);c.rgb*=mix(vec3(1.),k,.55*a);c.rgb*=(1.-.9*a*dot(d,d))*(1.+.12*a);gl_FragColor=c;}',
  dither:'float m2(vec2 p){return 2.*p.x+3.*p.y-4.*p.x*p.y;}void main(){float bs=max(1.,floor(2.*u+1.));vec2 px=floor(v*res/bs)*bs+bs*.5;vec4 c=T(px/res);vec2 g=mod(floor(gl_FragCoord.xy/bs),4.);float bay=(4.*m2(mod(g,2.))+m2(floor(g/2.)))/16.;float L=mix(6.,3.,a);vec3 q=floor(c.rgb*(L-1.)+bay)/(L-1.);gl_FragColor=vec4(q,c.a);}',
  halftone:'void main(){float cs=(4.+7.*a)*u;vec2 p=v*res;mat2 R=mat2(.7071,-.7071,.7071,.7071),Ri=mat2(.7071,.7071,-.7071,.7071);vec2 rp=R*p;vec2 cell=floor(rp/cs)*cs+cs*.5;vec4 s=T((Ri*cell)/res);float r=(1.-lum(s.rgb))*cs*.72;float ink=smoothstep(r+1.,r-1.,length(rp-cell));vec3 col=mix(vec3(1.,.98,.93),s.rgb*.82,ink);gl_FragColor=vec4(mix(T(v).rgb,col,.45+.55*a),1.);}',
  neon:'void main(){float e=sob(1.3*max(1.,u)/res);vec3 h=.5+.5*cos(6.2831*(v.x*.6+v.y*.3+t*.25)+vec3(0.,2.1,4.2));vec4 c=T(v);gl_FragColor=vec4(c.rgb*(1.-.88*a)+h*smoothstep(.12,.55,e)*1.8*(.35+.65*a),c.a);}',
  sketch:'void main(){float e=sob(max(1.,u)/res);float l=lum(T(v).rgb);float pen=1.-smoothstep(.06,.4,e);float sh=mix(1.,smoothstep(.0,.9,l),.45);float hat=l<.45?(.85+.15*step(.5,fract((gl_FragCoord.x+gl_FragCoord.y)/(4.*max(1.,u))))):1.;vec3 o=vec3(.97,.95,.9)*pen*sh*hat;gl_FragColor=vec4(mix(T(v).rgb,o,.3+.7*a),1.);}',
  oil:'vec4 qd(vec2 sg,float st){vec3 m=vec3(0.),s=vec3(0.);for(int i=0;i<4;i++)for(int j=0;j<4;j++){vec3 c=T(v+sg*vec2(float(i),float(j))*st/res).rgb;m+=c;s+=c*c;}m/=16.;s=s/16.-m*m;return vec4(m,s.r+s.g+s.b);}void main(){float st=max(1.,1.3*u*(.6+a));vec4 b=qd(vec2(-1.,-1.),st),c=qd(vec2(1.,-1.),st),d=qd(vec2(-1.,1.),st),e=qd(vec2(1.,1.),st);vec4 r=b;if(c.w<r.w)r=c;if(d.w<r.w)r=d;if(e.w<r.w)r=e;gl_FragColor=vec4(r.rgb,T(v).a);}',
  emboss:'void main(){vec2 px=1.5*max(1.,u)/res;float e=lum(T(v-px).rgb)-lum(T(v+px).rgb);vec3 g=vec3(.5+e*2.5);vec4 c=T(v);gl_FragColor=vec4(mix(c.rgb,g*mix(vec3(1.),c.rgb*1.3,.25),.35+.65*a),c.a);}',
  wave:'void main(){vec2 q=v;q.x+=sin(q.y*18.+t*3.)*.014*a;q.y+=cos(q.x*14.+t*2.2)*.008*a;gl_FragColor=T(q);}',
  ripple:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);vec2 q=v+normalize(d+1e-5)/ar*sin(r*42.-t*7.)*.012*a*(1.-smoothstep(0.,.75,r));gl_FragColor=T(q);}',
  swirl:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d),k=max(0.,1.-r/.55);float an=a*3.2*k*k*sin(t*.6+1.2);float cs=cos(an),sn=sin(an);d=vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs);gl_FragColor=T(.5+d/ar);}',
  heat:'void main(){float k=a*(.4+.6*smoothstep(.7,0.,v.y));vec2 q=v+vec2(sin(v.y*70.+t*6.)*sin(v.x*22.+t*3.),cos(v.y*55.+t*4.5))*.0045*k;gl_FragColor=T(q);}',
  reflect:'void main(){vec2 q=v;float lo=step(v.y,.5);if(lo>.5){q.y=1.-v.y;q.x+=sin(v.y*120.+t*4.)*.004*a;}vec4 c=T(q);c.rgb*=1.-lo*(.15+.25*a);gl_FragColor=c;}',
  bulge:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);float k=1.-a*.45*smoothstep(.55,0.,r)*(.85+.15*sin(t*2.));gl_FragColor=T(.5+d*k/ar);}',
  rgbwave:'void main(){float o=sin(v.y*30.+t*5.)*.012*a;vec4 c=T(v);gl_FragColor=vec4(T(v+vec2(o,0.)).r,c.g,T(v-vec2(o,0.)).b,c.a);}',
  chroma:'void main(){vec2 d=v-.5;float k=.12*a*length(d);vec4 c=T(v);gl_FragColor=vec4(T(v+d*k).r,c.g,T(v-d*k).b,c.a);}',
  cartoon:'void main(){vec4 c=T(v);float e=sob(max(1.,u)/res);float L=mix(8.,4.,a);vec3 q=floor(c.rgb*L+.5)/L;gl_FragColor=vec4(q*(1.-smoothstep(.25,.6,e)*(.5+.5*a)),c.a);}',
  watercolor:'void main(){vec2 px=max(1.,u)/res;vec3 s=vec3(0.);for(int i=0;i<12;i++){float an=float(i)*2.399,rr=sqrt(float(i)/12.)*3.*(1.+a);s+=T(v+vec2(cos(an),sin(an))*rr*px).rgb;}s/=12.;float e=sob(2.*px);float L=mix(10.,5.,a);s=floor(s*L+.5)/L;float pap=.94+.06*hsh(floor(v*res/(2.*max(1.,u))));vec3 o=s*(1.-smoothstep(.15,.7,e)*.35)*pap+vec3(.03);gl_FragColor=vec4(mix(T(v).rgb,o,.35+.65*a),1.);}',
  dots:'void main(){float cs=(5.+9.*a)*u;vec2 p=v*res;vec2 cell=floor(p/cs)*cs+cs*.5;vec4 c=T(cell/res);float d=length(p-cell)/(cs*.5);gl_FragColor=vec4(c.rgb*smoothstep(1.,.7,d)*1.25,1.);}',
  nightvision:'void main(){vec4 c=T(v);float l=lum(c.rgb);float n=(hsh(floor(v*res/max(1.,u))+fract(t*7.)*91.)-.5)*.3*a;vec2 d=v-.5;float vg=clamp(1.-dot(d,d)*2.4,0.,1.);float sl=.92+.08*sin(v.y*res.y*1.5/max(1.,u));vec3 g=vec3(.2,1.,.3)*(pow(l,.8)*1.5+n)*vg*sl;gl_FragColor=vec4(mix(c.rgb,g,.45+.55*a),c.a);}',
  // ---- v4.36 : 30 effets « Tendance » et « Artistique » (shaders originaux DedCut) ----
  // ---- v4.36 (2) : 70 effets en plus ----
  huecycle:'void main(){vec4 c=T(v);gl_FragColor=vec4(mix(c.rgb,hrot(c.rgb,t*1.5),a),c.a);}',
  gmsunset:'void main(){vec4 c=T(v);vec3 g=g3(lum(c.rgb),vec3(.18,.02,.3),vec3(.95,.3,.35),vec3(1.,.85,.4));gl_FragColor=vec4(mix(c.rgb,g,.4+.6*a),c.a);}',
  gmocean:'void main(){vec4 c=T(v);vec3 g=g3(lum(c.rgb),vec3(.02,.06,.2),vec3(.05,.55,.6),vec3(.9,1.,.98));gl_FragColor=vec4(mix(c.rgb,g,.4+.6*a),c.a);}',
  gmfire:'void main(){vec4 c=T(v);float l=lum(c.rgb);vec3 g=l<.5?mix(vec3(.05,0.,0.),vec3(.9,.15,.02),l*2.):mix(vec3(.9,.15,.02),vec3(1.,.95,.6),l*2.-1.);gl_FragColor=vec4(mix(c.rgb,g,.4+.6*a),c.a);}',
  gmice:'void main(){vec4 c=T(v);vec3 g=g3(lum(c.rgb),vec3(.05,.08,.2),vec3(.45,.7,.95),vec3(.97,.99,1.));gl_FragColor=vec4(mix(c.rgb,g,.4+.6*a),c.a);}',
  gmtoxic:'void main(){vec4 c=T(v);vec3 g=g3(lum(c.rgb),vec3(.02,.08,.03),vec3(.3,.8,.1),vec3(.9,1.,.4));gl_FragColor=vec4(mix(c.rgb,g,.4+.6*a),c.a);}',
  keepred:'void main(){vec4 c=T(v);float l=lum(c.rgb);float h=smoothstep(.12,.32,c.r-max(c.g,c.b));gl_FragColor=vec4(mix(c.rgb,mix(vec3(l),c.rgb*1.15,h),a),c.a);}',
  keepblue:'void main(){vec4 c=T(v);float l=lum(c.rgb);float h=smoothstep(.06,.25,c.b-max(c.r,c.g*.9));gl_FragColor=vec4(mix(c.rgb,mix(vec3(l),c.rgb*1.15,h),a),c.a);}',
  popgrid:'void main(){vec2 q=fract(v*2.);vec2 id=floor(v*2.);vec4 c=T(q);float l=lum(c.rgb);float k=id.x+id.y*2.;vec3 lo=k<1.?vec3(.9,.1,.5):k<2.?vec3(.1,.3,.9):k<3.?vec3(.95,.6,.05):vec3(.1,.7,.4);vec3 hi=k<1.?vec3(1.,.9,.2):k<2.?vec3(1.,.5,.8):k<3.?vec3(.2,.9,1.):vec3(1.,1.,.6);vec3 o=mix(lo,hi,step(.45,l));gl_FragColor=vec4(mix(T(v).rgb,o,a),1.);}',
  solarize:'void main(){vec4 c=T(v);vec3 s=mix(c.rgb,1.-c.rgb,step(.5,c.rgb));gl_FragColor=vec4(mix(c.rgb,s*1.6,a),c.a);}',
  godrays:'void main(){vec2 L=vec2(.2,.95);vec2 d=(v-L)/32.;vec2 p=v;float s=0.;float w=1.;for(int i=0;i<32;i++){p-=d;float l=lum(T(p).rgb);s+=smoothstep(.55,.9,l)*w;w*=.96;}vec4 c=T(v);c.rgb+=vec3(1.,.9,.7)*s/14.*a;gl_FragColor=c;}',
  bokehfx:'void main(){vec4 c=T(v);vec2 ar=vec2(res.x/res.y,1.);vec3 o=vec3(0.);for(int i=0;i<14;i++){float f=float(i);vec2 p=vec2(hsh(vec2(f,1.)),fract(hsh(vec2(f,2.))+t*.02*(.5+hsh(vec2(f,3.)))));float r=.03+.06*hsh(vec2(f,4.));float d=length((v-p)*ar);float m=smoothstep(r,r*.85,d)*(.6+.4*smoothstep(r*.6,r,d));o+=m*(.5+.5*cos(6.28*(f*.13+vec3(0.,.33,.67))))*.35;}gl_FragColor=vec4(c.rgb+o*a,c.a);}',
  sunflare:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 L=vec2(.78+.04*sin(t*.4),.8);vec2 d=(v-L)*ar;float r=length(d);vec3 o=vec3(1.,.85,.6)*(.08/(r+.05))*.6;o+=vec3(1.,.7,.4)*smoothstep(.006,0.,abs(d.y))*smoothstep(.9,0.,abs(d.x))*.6;for(int i=1;i<4;i++){vec2 g=mix(L,vec2(.5),float(i)*.6);float rr=length((v-g)*ar);o+=vec3(.4,.7,1.)*smoothstep(.05*float(i),.04*float(i),rr)*.15;}vec4 c=T(v);gl_FragColor=vec4(c.rgb+o*a,c.a);}',
  glints:'void main(){vec4 c=T(v);vec2 ar=vec2(res.x/res.y,1.);vec2 g=v*ar*14.;vec2 id=floor(g),f=fract(g)-.5;float h=hsh(id);float tw=pow(max(0.,sin(t*2.+h*30.)),8.);float l=lum(T((id+.5)/14./ar).rgb);float s=0.;if(h>.6&&l>.55){vec2 q=abs(f);s=(smoothstep(.04,0.,q.x)*smoothstep(.5,0.,q.y)+smoothstep(.04,0.,q.y)*smoothstep(.5,0.,q.x))*tw;}gl_FragColor=vec4(c.rgb+vec3(1.,.97,.9)*s*a*1.5,c.a);}',
  rimlight:'void main(){vec4 c=T(v);float g=smoothstep(.2,1.,v.x)*(.6+.4*sin(t*.7));c.rgb+=vec3(1.,.55,.25)*g*.45*a*(.4+lum(c.rgb));c.rgb+=vec3(.25,.45,1.)*smoothstep(.8,0.,v.x)*.25*a;gl_FragColor=c;}',
  spotfx:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 p=vec2(.5+.25*sin(t*.8),.5+.15*cos(t*1.1));float d=length((v-p)*ar);vec4 c=T(v);c.rgb*=mix(1.,smoothstep(.42,.18,d)*1.2+.08,a);gl_FragColor=c;}',
  discofx:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec4 c=T(v);vec3 o=vec3(0.);for(int i=0;i<5;i++){float f=float(i);vec2 p=vec2(.5+.4*sin(t*(.7+f*.2)+f*2.),.5+.35*cos(t*(.9+f*.13)+f));o+=(.5+.5*cos(6.28*(f*.21+vec3(0.,.33,.67))))*smoothstep(.22,.05,length((v-p)*ar));}gl_FragColor=vec4(c.rgb*(1.-.35*a)+c.rgb*o*1.2*a+o*.12*a,c.a);}',
  prismleak:'void main(){vec4 c=T(v);float x=v.x+v.y*.5-fract(t*.15)*2.+.5;float b=smoothstep(.0,.25,x)*smoothstep(.6,.25,x);vec3 h=.5+.5*cos(6.28*(x*1.5+vec3(0.,.33,.67)));gl_FragColor=vec4(1.-(1.-c.rgb)*(1.-h*b*.7*a),c.a);}',
  caustics:'void main(){vec2 p=v*vec2(res.x/res.y,1.)*6.;float s=0.;for(int i=0;i<3;i++){float f=float(i);p+=vec2(sin(p.y*1.3+t*(.8+f*.3)),cos(p.x*1.1-t*(.6+f*.2)));s+=.5/length(fract(p)-.5+.0001)*.08;}vec4 c=T(v);c.rgb+=vec3(.6,.9,1.)*clamp(s-.25,0.,1.)*.6*a;gl_FragColor=c;}',
  aurorafx:'void main(){vec4 c=T(v);float y=v.y-.55-.08*sin(v.x*6.+t*.6)-.04*sin(v.x*13.-t);float b=smoothstep(0.,.08,y)*smoothstep(.45,.1,y)*(.6+.4*sin(v.x*30.+t*2.));vec3 col=mix(vec3(.1,1.,.5),vec3(.6,.3,1.),smoothstep(.0,.35,y));gl_FragColor=vec4(c.rgb+col*b*.55*a,c.a);}',
  polaroid:'void main(){float s=mix(1.,.82,a);vec2 q=(v-vec2(.5,.56))/s+.5;vec3 o=vec3(.97,.96,.93);if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.)o=T(q).rgb;gl_FragColor=vec4(o,1.);}',
  filmstrip:'void main(){float s=mix(1.,.8,a);vec2 q=vec2(v.x,(v.y-.5)/s+.5);vec3 o=vec3(.05);if(q.y>0.&&q.y<1.)o=T(q).rgb;float band=step(abs(v.y-.5),.5)*(1.-step(abs(v.y-.5),.5*s));vec2 h=vec2(fract(v.x*res.x/res.y*7.),fract((abs(v.y-.5)-.5*s)/(.5-.5*s)));float hole=step(.3,h.x)*step(h.x,.7)*step(.3,h.y)*step(h.y,.7)*band;o=mix(o,vec3(.92),hole*step(.01,a));gl_FragColor=vec4(o,1.);}',
  roundmask:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=abs(v-.5)*ar;vec2 m=vec2(.5)*ar-mix(0.,.06,a);float r=.12*a;float k=length(max(d-(m-r),0.))-r;vec4 c=T(v);c.rgb*=1.-smoothstep(-.003,.003,k);gl_FragColor=c;}',
  circlemask:'void main(){vec2 ar=vec2(res.x/res.y,1.);float d=length((v-.5)*ar);vec4 c=T(v);c.rgb*=mix(1.,smoothstep(.45,.44,d),a);gl_FragColor=c;}',
  heartmask:'void main(){vec2 p=(v-vec2(.5,.45))*vec2(res.x/res.y,1.)*2.2;p.y-=sqrt(abs(p.x))*.45;float d=length(p)-.85;vec4 c=T(v);c.rgb*=mix(1.,1.-smoothstep(-.01,.01,d),a);gl_FragColor=c;}',
  viewfinder:'void main(){vec4 c=T(v);vec2 p=v*res;vec2 m=res*.06;float w=max(1.5,res.y/360.);vec2 d=min(p-m,res-m-p);float L=res.y*.08;float cr=0.;if(d.x>-w&&d.x<w&&d.y<L&&d.y>-w)cr=1.;if(d.y>-w&&d.y<w&&d.x<L&&d.x>-w)cr=1.;vec2 cc=abs(p-res*.5);if((cc.x<w&&cc.y<L*.4)||(cc.y<w&&cc.x<L*.4))cr=1.;float rec=step(length(p-vec2(m.x+L*.4,res.y-m.y-L*.4)),L*.15)*step(.5,fract(t));c.rgb=mix(c.rgb,vec3(1.),cr*a);c.rgb=mix(c.rgb,vec3(1.,.1,.1),rec*a);gl_FragColor=c;}',
  tvshape:'void main(){vec2 d=v-.5;vec2 q=d*(1.+dot(d,d)*.25*a)+.5;vec2 e=abs(q-.5)*2.;float k=pow(pow(e.x,6.)+pow(e.y,6.),1./6.);vec4 c=T(q);c.rgb*=(1.-smoothstep(.93,.97,k))*(1.-.4*a*dot(d,d)*2.);gl_FragColor=c;}',
  burnedge:'void main(){vec2 d=abs(v-.5)*2.;float e=max(d.x,d.y)+fbm(v*8.)*.25;float k=smoothstep(.75,.98,e)*a;vec4 c=T(v);c.rgb=mix(c.rgb,c.rgb*vec3(.8,.45,.2),k*.8);c.rgb*=1.-smoothstep(.95,1.05,e)*a;gl_FragColor=c;}',
  blurframe:'void main(){float s=mix(1.,.72,a);vec2 q=(v-.5)/s+.5;vec3 b=vec3(0.);for(int i=0;i<16;i++){float an=float(i)*2.399,rr=sqrt(float(i)/16.)*.06;b+=T(v+vec2(cos(an),sin(an))*rr).rgb;}b=b/16.*.7;vec3 o=b;if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.)o=T(q).rgb;gl_FragColor=vec4(o,1.);}',
  insetline:'void main(){vec4 c=T(v);vec2 p=v*res;float m=res.y*.05;float w=max(1.5,res.y/400.);vec2 d=abs(min(p,res-p)-m);float l=(d.x<w&&p.y>m-w&&p.y<res.y-m+w)||(d.y<w&&p.x>m-w&&p.x<res.x-m+w)?1.:0.;c.rgb=mix(c.rgb,vec3(1.),l*a);gl_FragColor=c;}',
  mirror4:'void main(){gl_FragColor=T(vec2(mix(v.x,.5-abs(v.x-.5),a),mix(v.y,.5+abs(v.y-.5),a)));}',
  mirrortop:'void main(){gl_FragColor=T(vec2(v.x,mix(v.y,v.y<.5?1.-v.y:v.y,a)));}',
  twist:'void main(){vec2 q=v;q.x+=sin(v.y*6.+t*2.)*.03*a;gl_FragColor=T(q);}',
  squeeze:'void main(){float k=sin(t*3.)*.06*a;vec2 q=.5+(v-.5)*vec2(1.+k,1.-k);gl_FragColor=T(q);}',
  drunk:'void main(){vec2 o=vec2(sin(t*1.3),cos(t*1.7))*.02*a;vec4 c=T(v+o)*.5+T(v-o)*.5;vec2 q=v+vec2(sin(v.y*5.+t),cos(v.x*4.+t*.8))*.008*a;gl_FragColor=mix(T(q),c,.6*a);}',
  shockwave:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);float R=fract(t*.6)*.9;float w=.06;float k=smoothstep(w,0.,abs(r-R))*.04*a*(1.-R);gl_FragColor=T(v-normalize(d+1e-5)/ar*k);}',
  vortex:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);float an=a*2.5*max(0.,.7-r)*sin(t*1.2)+t*.0;float k=a*(2.*exp(-r*4.))*sin(t);float cs=cos(k),sn=sin(k);d=vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs);gl_FragColor=T(.5+d/ar);}',
  hstretch:'void main(){float x=v.x-.5;float k=1.-a*.5*exp(-x*x*18.);gl_FragColor=T(vec2(.5+x*k,v.y));}',
  spinzoom:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float an=t*.35*a;float k=1./(1.+.45*a);d=vec2(d.x*cos(an)-d.y*sin(an),d.x*sin(an)+d.y*cos(an))*k;gl_FragColor=T(.5+d/ar);}',
  flagwave:'void main(){float w=sin(v.x*8.-t*3.)*.02*a*v.x;vec2 q=vec2(v.x,v.y+w);vec4 c=T(q);c.rgb*=1.+cos(v.x*8.-t*3.)*.15*a*v.x;gl_FragColor=c;}',
  knit:'void main(){float cs=(8.+8.*a)*u;vec2 p=v*res/cs;vec2 id=floor(p),f=fract(p)-.5;vec3 c=T((id+.5)*cs/res).rgb;float vsh=1.-pow(abs(abs(f.x)*2.-.5+f.y*.5),1.5)*1.2;c*=clamp(vsh,.4,1.15);gl_FragColor=vec4(mix(T(v).rgb,c,.5+.5*a),1.);}',
  blocks:'void main(){float cs=(10.+12.*a)*u;vec2 p=v*res/cs;vec2 id=floor(p),f=fract(p)-.5;vec3 c=T((id+.5)*cs/res).rgb;c=floor(c*5.+.5)/5.;float st=smoothstep(.32,.28,length(f));float hl=(f.x-f.y)*.4;c*=1.+st*hl*.8;c*=1.-smoothstep(.45,.5,max(abs(f.x),abs(f.y)))*.35;gl_FragColor=vec4(mix(T(v).rgb,c,.5+.5*a),1.);}',
  pointil:'void main(){vec3 bg=vec3(.96,.94,.9);vec3 o=bg;float cs=7.*u;vec2 p=v*res/cs;vec2 id=floor(p);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=id+vec2(float(x),float(y));vec2 c=g+vec2(hsh(g),hsh(g+5.));float d=length(p-c);vec3 col=T(c*cs/res).rgb*1.1;o=mix(o,col,smoothstep(.75,.6,d));}gl_FragColor=vec4(mix(T(v).rgb,o,.5+.5*a),1.);}',
  crossstitch:'void main(){float cs=(8.+8.*a)*u;vec2 p=v*res/cs;vec2 id=floor(p),f=fract(p);vec3 c=T((id+.5)*cs/res).rgb;float x1=abs(f.x-f.y),x2=abs(f.x+f.y-1.);float m=smoothstep(.2,.1,min(x1,x2));vec3 o=mix(vec3(.93,.9,.84),c*1.1,m);gl_FragColor=vec4(mix(T(v).rgb,o,.5+.5*a),1.);}',
  weave:'void main(){float cs=(10.+8.*a)*u;vec2 p=v*res/cs;vec2 id=floor(p),f=fract(p);float ch=mod(id.x+id.y,2.);float sh=ch>.5?sin(f.x*3.1416):sin(f.y*3.1416);vec3 c=T(v).rgb*(.7+.4*sh);gl_FragColor=vec4(mix(T(v).rgb,c,a),1.);}',
  paper:'void main(){vec4 c=T(v);float n=fbm(v*res/(6.*max(1.,u)))*.5+fbm(v*res/(60.*max(1.,u)))*.5;vec3 p=c.rgb*(.88+.2*n);p=mix(p,p*vec3(1.03,1.,.92),.6);gl_FragColor=vec4(mix(c.rgb,p,a),c.a);}',
  linescreen:'void main(){float l=lum(T(v).rgb);float s=(5.+4.*a)*u;float y=fract(gl_FragCoord.y/s);float th=(1.-l)*.9;float ink=step(abs(y-.5),th*.5);vec3 o=mix(vec3(.97,.95,.9),vec3(.1,.08,.15),ink);gl_FragColor=vec4(mix(T(v).rgb,o,.4+.6*a),1.);}',
  gridline:'void main(){vec4 c=T(v);vec2 g=fract(gl_FragCoord.xy/(res.y/12.));float l=max(step(g.x,.02*u*.5+.01),step(g.y,.02*u*.5+.01));c.rgb=mix(c.rgb,vec3(1.),l*.35*a);gl_FragColor=c;}',
  checkfx:'void main(){vec4 c=T(v);vec2 id=floor(v*vec2(res.x/res.y,1.)*8.);float ch=mod(id.x+id.y,2.);vec3 o=ch>.5?c.rgb:1.-c.rgb;gl_FragColor=vec4(mix(c.rgb,o,a),c.a);}',
  brickwall:'void main(){vec2 p=v*vec2(res.x/res.y,1.)*vec2(8.,16.);p.x+=step(1.,mod(floor(p.y),2.))*.5;vec2 f=fract(p);float m=step(.06,f.x)*step(.1,f.y);vec4 c=T(v);vec3 o=c.rgb*(.8+.2*hsh(floor(p)))*m+vec3(.75,.72,.68)*(1.-m);gl_FragColor=vec4(mix(c.rgb,o,a*.85),c.a);}',
  vhsfull:'void main(){float j=(hsh(vec2(floor(v.y*res.y/3.),floor(t*30.)))-.5)*.004*a;vec2 q=v+vec2(j,0.);vec3 c=vec3(T(q+vec2(.004*a,0.)).r,T(q).g,T(q-vec2(.004*a,0.)).b);float band=smoothstep(.02,0.,abs(v.y-fract(t*.3)))*a;c+=band*.25;c=mix(c,vec3(lum(c)),.2*a);c*=.95+.05*sin(v.y*res.y*1.5);gl_FragColor=vec4(c,1.);}',
  oldtv:'void main(){vec2 d=v-.5;vec4 c=T(v);float l=lum(c.rgb)*(.9+.1*hsh(vec2(t,1.)));l+=(hsh(v*res+t)-.5)*.15*a;l*=.85+.15*sin(v.y*res.y*1.2);l*=1.-dot(d,d)*1.6*a;gl_FragColor=vec4(mix(c.rgb,vec3(l),.4+.6*a),1.);}',
  cga:'void main(){float ps=max(2.,3.*u);vec2 p=(floor(v*res/ps)+.5)*ps/res;vec3 c=T(p).rgb;vec3 P0=vec3(0.),P1=vec3(.33,1.,1.),P2=vec3(1.,.33,1.),P3=vec3(1.);float d0=distance(c,P0),d1=distance(c,P1*.8),d2=distance(c,P2*.8),d3=distance(c,P3);vec3 o=P0;float m=d0;if(d1<m){m=d1;o=P1;}if(d2<m){m=d2;o=P2;}if(d3<m)o=P3;gl_FragColor=vec4(mix(T(v).rgb,o,.5+.5*a),1.);}',
  teletext:'void main(){vec2 cs=vec2(8.,10.)*u;vec2 p=(floor(v*res/cs)+.5)*cs/res;vec3 c=step(.5,T(p).rgb);gl_FragColor=vec4(mix(T(v).rgb,c,.5+.5*a),1.);}',
  sepiamovie:'void main(){vec4 c=T(v);float l=lum(c.rgb);vec3 s=vec3(l*1.07,l*.86,l*.62)*(.92+.08*hsh(vec2(floor(t*12.),2.)));float sc=step(.997,hsh(vec2(floor(v.x*200.),floor(t*12.))))*.6;s=mix(s,vec3(.95,.9,.8),sc);vec2 d=v-.5;s*=1.-dot(d,d)*1.3;gl_FragColor=vec4(mix(c.rgb,s,.4+.6*a),c.a);}',
  cctv:'void main(){vec4 c=T(v);float l=lum(c.rgb);l+=(hsh(v*res*.5+t*60.)-.5)*.18*a;l*=.9+.1*sin(v.y*res.y*.8+t*20.);vec3 o=vec3(l*.85,l,l*.85);gl_FragColor=vec4(mix(c.rgb,o,.4+.6*a),1.);}',
  jpegfx:'void main(){float bs=8.*u*(1.+a);vec2 id=floor(v*res/bs);vec3 m=T((id+.5)*bs/res).rgb;vec3 c=T(v).rgb;vec3 o=mix(c,m,.65);o=floor(o*mix(16.,5.,a))/mix(16.,5.,a);gl_FragColor=vec4(mix(c,o,a),1.);}',
  riso:'void main(){vec4 c=T(v);float l=lum(c.rgb);vec2 o=vec2(.004,.002)*a;float l2=lum(T(v+o).rgb);float n=hsh(v*res)*.15;vec3 pink=vec3(1.,.3,.55),blue=vec3(.15,.35,.85);vec3 p=vec3(.97,.95,.9);p=mix(p,p*pink,smoothstep(.85,.25,l+n));p=mix(p,p*blue,smoothstep(.6,.1,l2+n)*.8);gl_FragColor=vec4(mix(c.rgb,p,.4+.6*a),1.);}',
  onebit:'float b4(vec2 g){vec2 a1=mod(g,2.),b1=mod(floor(g/2.),2.);return(4.*(2.*a1.x+3.*a1.y-4.*a1.x*a1.y)+(2.*b1.x+3.*b1.y-4.*b1.x*b1.y))/16.;}void main(){float bs=max(1.,floor(u*1.5));float l=lum(T(v).rgb);float d=step(b4(floor(gl_FragCoord.xy/bs)),l);gl_FragColor=vec4(mix(T(v).rgb,vec3(d),.4+.6*a),1.);}',
  amber:'void main(){vec4 c=T(v);float l=lum(c.rgb);l*=.8+.2*sin(v.y*res.y*1.5/max(1.,u));vec3 o=vec3(1.,.62,.1)*l*1.2;gl_FragColor=vec4(mix(c.rgb,o,.4+.6*a),1.);}',
  starsky:'void main(){vec4 c=T(v);vec2 ar=vec2(res.x/res.y,1.);vec2 g=v*ar*40.;vec2 id=floor(g),f=fract(g)-.5;float h=hsh(id);float s=step(.92,h)*smoothstep(.12,0.,length(f))*(.5+.5*sin(t*3.+h*50.));float dark=1.-smoothstep(.2,.6,lum(c.rgb));gl_FragColor=vec4(c.rgb+vec3(1.,.95,.85)*s*dark*a*1.5,c.a);}',
  magicdust:'void main(){vec4 c=T(v);vec2 ar=vec2(res.x/res.y,1.);vec3 o=vec3(0.);for(int i=0;i<30;i++){float f=float(i);vec2 p=vec2(fract(hsh(vec2(f,7.))+sin(t*.3+f)*.05),fract(hsh(vec2(f,9.))+t*.05*(.5+hsh(vec2(f,3.)))));float d=length((v-p)*ar);o+=vec3(1.,.85,.5)*smoothstep(.008,0.,d)*(.5+.5*sin(t*4.+f));o+=vec3(1.,.8,.4)*smoothstep(.03,0.,d)*.15;}gl_FragColor=vec4(c.rgb+o*a,c.a);}',
  rainglass:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 g=v*ar*12.;vec2 id=floor(g);vec2 f=fract(g)-.5;float h=hsh(id);vec2 c0=vec2(hsh(id+1.)-.5,fract(h-t*.1*(.3+h))-.5)*.6;vec2 d=f-c0;float r=.08+.06*hsh(id+3.);float m=smoothstep(r,r*.7,length(d*vec2(1.,.8)));vec2 q=v-d/ar/12.*m*1.5;vec3 col=T(q).rgb;vec3 bl=vec3(0.);for(int i=0;i<8;i++){float an=float(i)*.785;bl+=T(v+vec2(cos(an),sin(an))*.006).rgb;}bl/=8.;vec3 o=mix(bl,col,m);o+=m*smoothstep(0.,.5,-d.y)*.12;gl_FragColor=vec4(mix(T(v).rgb,o,a),1.);}',
  zoomecho:'void main(){vec2 d=v-.5;vec4 s=vec4(0.);float w=0.;for(int i=0;i<6;i++){float f=float(i);float k=1.-f*.06*a*(.8+.2*sin(t*2.));float ww=1.-f/7.;s+=T(.5+d*k)*ww;w+=ww;}gl_FragColor=mix(T(v),s/w,a);}',
  hologram:'void main(){vec4 c=T(v);float l=lum(c.rgb);float sl=.75+.25*sin(v.y*res.y*.6-t*20.);float fl=.9+.1*step(.95,hsh(vec2(floor(t*15.),1.)));vec3 o=vec3(.3,.85,1.)*(l*1.3+sob(1.5/res)*.8)*sl*fl;o+=vec3(.2,.6,1.)*smoothstep(.98,1.,fract(v.y*3.-t))*.3;gl_FragColor=vec4(mix(c.rgb,o,.4+.6*a),1.);}',
  underwater:'void main(){vec2 q=v+vec2(sin(v.y*20.+t*2.),cos(v.x*16.+t*1.7))*.004*a;vec4 c=T(q);vec3 o=c.rgb*vec3(.55,.85,1.)+vec3(0.,.06,.12);float cs=sin(v.x*30.+sin(v.y*20.+t)*2.+t*2.)*sin(v.y*25.-t*1.5);o+=vec3(.3,.6,.7)*smoothstep(.6,1.,cs)*.25*(v.y);gl_FragColor=vec4(mix(c.rgb,o,a),c.a);}',
  bokehblur:'void main(){vec3 s=vec3(0.);float w=0.;for(int i=0;i<32;i++){float an=float(i)*2.399,rr=sqrt(float(i)/32.)*16.*u*a;vec3 c=T(v+vec2(cos(an),sin(an))*rr/res).rgb;float ww=1.+pow(lum(c),4.)*8.;s+=c*ww;w+=ww;}gl_FragColor=vec4(s/w,1.);}',
  oilspill:'void main(){vec4 c=T(v);float n=fbm(v*3.+vec2(t*.05,t*.03));vec3 h=.5+.5*cos(6.28*(n*2.+lum(c.rgb)+vec3(0.,.33,.67)));gl_FragColor=vec4(mix(c.rgb,1.-(1.-c.rgb)*(1.-h*.6),a*.8),c.a);}',
  galaxy:'void main(){vec4 c=T(v);float n=fbm(v*2.5+vec2(t*.02,0.));float n2=fbm(v*5.-vec2(0.,t*.03));vec3 neb=mix(vec3(.4,.1,.7),vec3(.1,.5,.9),n2)*smoothstep(.35,.8,n);float st=step(.997,hsh(floor(v*res/2.)))*(.6+.4*sin(t*3.+hsh(floor(v*res/2.))*40.));gl_FragColor=vec4(1.-(1.-c.rgb)*(1.-(neb*.8+st)*a),c.a);}',
  flames:'void main(){vec4 c=T(v);vec2 p=vec2(v.x*6.,v.y*3.-t*1.5);float n=fbm(p);float h=v.y*1.6+(n-.5)*.9;float f=smoothstep(.65,.0,h);vec3 col=mix(vec3(1.,.2,0.),vec3(1.,.9,.3),smoothstep(.2,.8,f));gl_FragColor=vec4(c.rgb+col*f*a*.9,c.a);}',
  anaglyph:'void main(){float o=.012*a;vec4 c=T(v);gl_FragColor=vec4(T(v-vec2(o,0.)).r,T(v+vec2(o,0.)).gb,c.a);}',
  pixelsort:'void main(){vec4 c=T(v);vec4 b=c;float th=mix(.92,.45,a);for(int i=1;i<40;i++){vec4 s=T(v+vec2(0.,float(i)*.006*a));if(lum(s.rgb)>th&&lum(s.rgb)>lum(b.rgb))b=s;}gl_FragColor=mix(c,b,step(.001,lum(b.rgb)-lum(c.rgb))*.9);}',
  holo:'void main(){vec4 c=T(v);float l=lum(c.rgb);vec3 h=.5+.5*cos(6.2831*(l*1.5+v.x*.5+v.y*.3+t*.15)+vec3(0.,2.1,4.2));vec3 o=mix(c.rgb,1.-(1.-c.rgb)*(1.-h*.7),.8);gl_FragColor=vec4(mix(c.rgb,o,.3+.6*a),c.a);}',
  planet:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d),an=atan(d.x,-d.y);vec2 q=vec2(fract(an/6.2831+.5),clamp(r*1.5,0.,1.));gl_FragColor=vec4(mix(T(v).rgb,T(q).rgb,a),1.);}',
  tear:'void main(){float st=floor(t*12.);float band=floor(v.y*24.);float h=hsh(vec2(band,st));float o=h<.25*a+.03?(hsh(vec2(band+3.,st))-.5)*.15*a:0.;vec2 q=vec2(fract(v.x+o),v.y);vec4 c=T(q);if(o!=0.)c.rgb=vec3(T(q+vec2(.01,0.)).r,c.g,T(q-vec2(.01,0.)).b);gl_FragColor=c;}',
  datamosh:'void main(){float st=floor(t*4.);vec2 b=floor(v*vec2(20.,12.));float h=hsh(b+st*1.3);vec2 q=v;if(h<.35*a){float k=fract(t*4.);q.y+=k*.06*a*(hsh(b+.7)+.3);q.x+=(hsh(b+2.2)-.5)*.02*a;}gl_FragColor=T(q);}',
  dreamy:'void main(){vec4 c=T(v);vec3 s=vec3(0.);for(int i=0;i<24;i++){float an=float(i)*2.399,rr=sqrt(float(i)/24.)*14.*u;s+=T(v+vec2(cos(an),sin(an))*rr/res).rgb;}s/=24.;vec3 o=1.-(1.-c.rgb)*(1.-s*.85);o*=vec3(1.03,1.,1.05);gl_FragColor=vec4(mix(c.rgb,o,.3+.6*a),c.a);}',
  vaporwave:'void main(){vec4 c=T(v);float l=lum(c.rgb);vec3 m=mix(vec3(.15,.05,.35),mix(vec3(1.,.3,.7),vec3(.3,1.,1.),smoothstep(.45,.95,l)),smoothstep(.05,.6,l));float gy=1.-v.y;float hor=smoothstep(.62,1.,gy);float z=max(gy-.5,.02)+.03;vec2 gp=vec2((v.x-.5)/z,1./z+t*.8);float ln=max(step(.95,fract(gp.x*.8)),step(.92,fract(gp.y*.5)))*hor;vec3 o=m+vec3(1.,.2,.9)*ln*.6;gl_FragColor=vec4(mix(c.rgb,o,.5+.5*a),c.a);}',
  retrogame:'void main(){float ps=max(2.,3.*u);vec2 p=(floor(v*res/ps)+.5)*ps/res;float l=lum(T(p).rgb);float b=hsh(floor(v*res/ps))*.12-.06;float q=floor(clamp(l+b*a,0.,.999)*4.);vec3 col=q<1.?vec3(.06,.22,.06):q<2.?vec3(.19,.38,.19):q<3.?vec3(.55,.67,.06):vec3(.61,.74,.06);gl_FragColor=vec4(mix(T(v).rgb,col,.5+.5*a),1.);}',
  bit8:'void main(){float ps=max(2.,(3.+5.*a)*u);vec2 p=(floor(v*res/ps)+.5)*ps/res;vec3 c=T(p).rgb;c=floor(c*3.+.5)/3.;gl_FragColor=vec4(mix(T(v).rgb,c,.5+.5*a),1.);}',
  ghost3:'void main(){vec4 c=T(v);float o=.025*a*(1.+.3*sin(t*3.));vec3 g=T(v+vec2(o,0.)).rgb*vec3(1.,.3,.6)+T(v-vec2(o,0.)).rgb*vec3(.3,.8,1.);gl_FragColor=vec4(mix(c.rgb,c.rgb*.6+g*.4,a),c.a);}',
  jelly:'void main(){vec2 d=v-.5;float k=sin(t*6.)*.04*a;vec2 q=.5+d*vec2(1.+k,1.-k)+vec2(sin(v.y*8.+t*5.),0.)*.006*a;gl_FragColor=T(q);}',
  tunnel:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d),an=atan(d.y,d.x);vec2 q=vec2(an/6.2831+.5,fract(.25/(r+.05)+t*.3));vec3 o=T(q).rgb*smoothstep(.02,.3,r);gl_FragColor=vec4(mix(T(v).rgb,o,a),1.);}',
  spinblur:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;vec4 s=vec4(0.);for(int i=0;i<16;i++){float an=(float(i)/15.-.5)*.12*a;float cs=cos(an),sn=sin(an);s+=T(.5+vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs)/ar);}gl_FragColor=s/16.;}',
  focus:'void main(){vec2 d=v-.5;float k=smoothstep(.15,.6,length(d*vec2(res.x/res.y,1.)))*a;vec4 s=vec4(0.);for(int i=0;i<20;i++){float an=float(i)*2.399,rr=sqrt(float(i)/20.)*18.*k*u;s+=T(v+vec2(cos(an),sin(an))*rr/res);}gl_FragColor=s/20.;}',
  tilefx:'void main(){float cs=(8.+14.*a)*u;vec2 p=v*res;vec2 f=fract(p/cs);vec2 cell=(floor(p/cs)+.5)*cs;vec3 c=T(cell/res).rgb;float g=step(.08,f.x)*step(.08,f.y);float sh=1.+.18*(f.x-f.y);gl_FragColor=vec4(mix(T(v).rgb,c*sh*g+vec3(.12)*(1.-g),.5+.5*a),1.);}',
  lcd:'void main(){vec4 c=T(v);float s=max(1.,u*1.5);float m=mod(gl_FragCoord.x/s,3.);vec3 k=m<1.?vec3(1.,.2,.2):m<2.?vec3(.2,1.,.2):vec3(.2,.2,1.);float row=step(.25,fract(gl_FragCoord.y/(3.*s)));gl_FragColor=vec4(mix(c.rgb,c.rgb*k*1.8*row,.6*a),c.a);}',
  liquid:'void main(){float n=sin(v.x*9.+t*1.3)+sin(v.y*11.-t*1.1)+sin((v.x+v.y)*7.+t*.9);gl_FragColor=T(v+vec2(cos(n*1.7),sin(n*1.3))*.018*a);}',
  frosted:'void main(){vec2 c=floor(v*res/max(1.,u));vec2 j=(vec2(hsh(c),hsh(c+7.3))-.5)*14.*a*u/res;gl_FragColor=T(v+j);}',
  shatter:'void main(){float sc=5.+3.*a;vec2 g=v*vec2(sc*res.x/res.y,sc);vec2 i=floor(g),f=fract(g);float md=9.,md2=9.;vec2 mc=vec2(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 pt=o+vec2(hsh(i+o),hsh(i+o+3.1));float d=length(pt-f);if(d<md){md2=md;md=d;mc=i+o;}else if(d<md2)md2=d;}vec2 off=(vec2(hsh(mc+1.7),hsh(mc+5.2))-.5)*.04*a;float e=1.-smoothstep(0.,.06,md2-md);vec4 c=T(v+off);c.rgb=c.rgb*(1.+.15*(hsh(mc)-.5)*a)+e*.7*a;gl_FragColor=c;}',
  stained:'void main(){float sc=10.+10.*(1.-a);vec2 ar=vec2(res.x/res.y,1.);vec2 g=v*ar*sc;vec2 i=floor(g),f=fract(g);float md=9.,md2=9.;vec2 mp=vec2(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 pt=o+vec2(hsh(i+o),hsh(i+o+3.1));float d=length(pt-f);if(d<md){md2=md;md=d;mp=i+pt;}else if(d<md2)md2=d;}vec3 c=T(mp/sc/ar).rgb*1.15;float e=smoothstep(0.,.08,md2-md);vec3 o=c*e+vec3(.05)*(1.-e);gl_FragColor=vec4(mix(T(v).rgb,o,.5+.5*a),1.);}',
  xray:'void main(){vec4 c=T(v);float l=1.-lum(c.rgb);float e=sob(max(1.,u)/res);vec3 o=vec3(.55,.85,1.)*pow(l,1.4)+vec3(.6,.9,1.)*e*.8;gl_FragColor=vec4(mix(c.rgb,o,.4+.6*a),c.a);}',
  comic:'void main(){vec4 c=T(v);float e=sob(max(1.,u)/res);vec3 q=floor(c.rgb*4.+.5)/4.;float cs=6.*u;vec2 p=v*res;vec2 cell=floor(p/cs)*cs+cs*.5;float l=lum(q);float rr=cs*.3*(1.-l);float dt=smoothstep(rr+.5,rr-.5,length(p-cell));q*=1.-dt*.35;q*=1.-smoothstep(.2,.5,e);gl_FragColor=vec4(mix(c.rgb,q*vec3(1.1,1.08,.98),.4+.6*a),1.);}',
  edgeglow:'void main(){float e=sob(max(1.,u)/res);vec4 c=T(v);gl_FragColor=vec4(mix(c.rgb,c.rgb*1.7*smoothstep(.1,.45,e),.5+.5*a),c.a);}',
  blueprint:'void main(){float e=sob(max(1.,u)/res);vec2 g=fract(gl_FragCoord.xy/(24.*max(1.,u)));float gr=max(step(.96,g.x),step(.96,g.y));vec3 bg=vec3(.07,.25,.6)+gr*.08;vec3 o=mix(bg,vec3(.9,.97,1.),smoothstep(.12,.4,e));gl_FragColor=vec4(mix(T(v).rgb,o,.5+.5*a),1.);}',
  engrave:'void main(){float l=lum(T(v).rgb);vec2 p=gl_FragCoord.xy/max(1.,u);float s=6.;float h1=step(fract((p.x+p.y)/s),.18),h2=step(fract((p.x-p.y)/s),.18),h3=step(fract(p.y/(s*.7)),.18);float ink=0.;if(l<.75)ink=max(ink,h1);if(l<.5)ink=max(ink,h2);if(l<.28)ink=max(ink,h3);vec3 o=mix(vec3(.96,.93,.86),vec3(.12,.1,.08),ink);gl_FragColor=vec4(mix(T(v).rgb,o,.4+.6*a),1.);}',
  trimosaic:'void main(){float cs=(18.+26.*a)*u;vec2 p=v*res/cs;vec2 i=floor(p),f=fract(p);vec2 c=f.x>f.y?vec2(.66,.33):vec2(.33,.66);vec3 s=T((i+c)*cs/res).rgb;s*=f.x>f.y?1.06:.94;gl_FragColor=vec4(mix(T(v).rgb,s,.6+.4*a),1.);}',
  hexpix:'void main(){float cs=(10.+16.*a)*u;vec2 p=v*res/cs;vec2 r=vec2(1.,1.732),h=r*.5;vec2 a1=mod(p,r)-h,b1=mod(p-h,r)-h;vec2 g=dot(a1,a1)<dot(b1,b1)?a1:b1;vec3 c=T((p-g)*cs/res).rgb;c*=1.-smoothstep(.42,.5,length(g))*.45;gl_FragColor=vec4(mix(T(v).rgb,c,.6+.4*a),1.);}',
  binoc:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 p=(v-.5)*ar;float d=min(length(p-vec2(-.22,0.)),length(p-vec2(.22,0.)));float m=smoothstep(.42,.4,d);vec4 c=T(v);c.rgb*=mix(1.,m,a);gl_FragColor=c;}',
  pinch:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);float k=1.+a*.6*smoothstep(.6,0.,r)*(.9+.1*sin(t*2.));gl_FragColor=T(.5+d*k/ar);}',
  fluted:'void main(){float w=(14.+22.*a)*u/res.x;float f=fract(v.x/w)-.5;vec2 q=vec2(v.x+f*w*(.9*a),v.y);vec4 c=T(q);c.rgb*=1.+.18*a*cos(f*6.2831);gl_FragColor=c;}'
};
let glc=null,gl=null,glOK=null,glProg={},glTex=null;
function glSetup(){
  if(glOK!==null)return glOK;
  try{
    glc=document.createElement('canvas');gl=glc.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
    if(!gl)return glOK=false;
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    glTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,glTex);
    for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    glOK=true;
  }catch(e){console.warn('WebGL indisponible',e);glOK=false}
  return glOK;
}
function glProgram(k){
  if(glProg[k]!==undefined)return glProg[k];
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn('shader',k,gl.getShaderInfoLog(o));return null}return o};
  const vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'),fsh=sh(gl.FRAGMENT_SHADER,GLH+GLFX[k]);
  if(!vs||!fsh)return glProg[k]=null;
  const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fsh);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn('programme',k,gl.getProgramInfoLog(pr));return glProg[k]=null}
  const loc={p:gl.getAttribLocation(pr,'p')};for(const n of['tx','res','t','a','u'])loc[n]=gl.getUniformLocation(pr,n);
  return glProg[k]={pr,loc};
}
/* applique un effet WebGL au canvas actuel (ctx) ; la zone de dessin GL grandit si besoin, on n'en utilise que le coin bas-gauche */
function glPass(k,t,a,u){
  if(!glSetup())return;const P=glProgram(k);if(!P)return;
  const cw=ctx.canvas.width,ch=ctx.canvas.height;
  if(glc.width<cw||glc.height<ch){glc.width=Math.max(glc.width,cw);glc.height=Math.max(glc.height,ch)}
  gl.viewport(0,0,cw,ch);gl.useProgram(P.pr);
  gl.bindTexture(gl.TEXTURE_2D,glTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ctx.canvas);
  gl.enableVertexAttribArray(P.loc.p);gl.vertexAttribPointer(P.loc.p,2,gl.FLOAT,false,0,0);
  gl.uniform1i(P.loc.tx,0);gl.uniform2f(P.loc.res,cw,ch);gl.uniform1f(P.loc.t,t%1000);gl.uniform1f(P.loc.a,a);gl.uniform1f(P.loc.u,u);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='copy';
  ctx.drawImage(glc,0,glc.height-ch,cw,ch,0,0,cw,ch);ctx.restore();
}
const GL_ORDER=['mirror4','mirrortop','twist','squeeze','drunk','shockwave','vortex','hstretch','spinzoom','flagwave','polaroid','filmstrip','blurframe','tvshape','planet','tunnel','jelly','pinch','liquid','frosted','spinblur','focus','datamosh','tear','shatter','reflect','bulge','wave','ripple','swirl','heat','rgbwave','fluted','chroma','cartoon','watercolor','dots','nightvision','fisheye','lens','prism','motionblur','tiltshift','glitchblock','oil','halftone','sketch','emboss','neon','dither','halation','sharpen','crt','anaglyph','pixelsort','holo','dreamy','vaporwave','retrogame','bit8','ghost3','tilefx','lcd','stained','xray','comic','edgeglow','blueprint','engrave','trimosaic','hexpix','huecycle','gmsunset','gmocean','gmfire','gmice','gmtoxic','keepred','keepblue','popgrid','solarize','godrays','bokehfx','sunflare','glints','rimlight','spotfx','discofx','prismleak','caustics','aurorafx','roundmask','circlemask','heartmask','viewfinder','burnedge','insetline','knit','blocks','pointil','crossstitch','weave','paper','linescreen','gridline','checkfx','brickwall','vhsfull','oldtv','cga','teletext','sepiamovie','cctv','jpegfx','riso','onebit','amber','starsky','magicdust','rainglass','zoomecho','hologram','underwater','bokehblur','oilspill','galaxy','flames','binoc'];
const fxTmp=document.createElement('canvas'),fxTmpCtx=fxTmp.getContext('2d');
let thermLUT=null;
function thermalLUT(){
  if(thermLUT)return thermLUT;thermLUT=new Uint8Array(768);
  const st=[[0,[0,0,32]],[.25,[59,15,140]],[.5,[200,29,110]],[.7,[255,122,0]],[.88,[255,214,0]],[1,[255,255,255]]];
  for(let i=0;i<256;i++){const v=i/255;let k=0;while(k<st.length-2&&v>st[k+1][0])k++;const[a,ca]=st[k],[b,cb]=st[k+1],q=(v-a)/(b-a);for(let c=0;c<3;c++)thermLUT[i*3+c]=Math.round(ca[c]+(cb[c]-ca[c])*q)}
  return thermLUT;
}
const CONF=['#ff4d6d','#ffd23f','#3bceac','#4d96ff','#c77dff','#ff9f1c'];
function heartPath(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*.55,y-s*.05,x-s*.3,y-s*.55,x,y-s*.2);g.bezierCurveTo(x+s*.3,y-s*.55,x+s*.55,y-s*.05,x,y+s*.35);g.closePath()}
/* ---------- effets « Personne » : contour, néon, aura, fond flou / noir et blanc / sombre ----------
   MediaPipe ImageSegmenter + modèle « selfie segmenter » (Apache-2.0, 100 % local, fichiers livrés dans vendor/mediapipe).
   Le modèle sépare la personne du fond sur une petite copie de l'image (256 px) ; ce masque sert ensuite à dessiner les effets. */
const PERSON_FX=FX_CATS.person;
let personSegP=null,personSegM=null;
function personSeg(){
  if(!personSegP)personSegP=(async()=>{
    try{
      const base=new URL('vendor/mediapipe/',document.baseURI).href,mod=await import(base+'vision_bundle.mjs'),fs=await mod.FilesetResolver.forVisionTasks(base.replace(/\/$/,''));
      personSegM=await mod.ImageSegmenter.createFromOptions(fs,{baseOptions:{modelAssetPath:base+'selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});
    }catch(e){console.warn('détourage indisponible',e);personSegM=null}
    wake();return personSegM;
  })();
  return personSegP;
}
const usesPerson=fx=>!!fx&&PERSON_FX.some(k=>fx[k]);
/* avant un export : le modèle doit être chargé, sinon les premières images sortiraient sans l'effet */
async function personPrep(){if(clips.some(c=>usesPerson(c.p&&c.p.fx)||(c.p&&c.p.chroma&&c.p.chroma.ai)))await personSeg();await facePrep()}
const psCv=()=>{const c=document.createElement('canvas');return[c,c.getContext('2d',{willReadFrequently:true})]};
const[psIn,psInCtx]=psCv(),[psM,psMCtx]=psCv(),[psA,psACtx]=psCv(),[psB,psBCtx]=psCv(),[psC,psCCtx]=psCv(),[psD,psDCtx]=psCv(),[psE,psECtx]=psCv();
let psImg=null,psBox=null; // psBox : cadre et centre de la personne (0 à 1), calculés avec le masque
/* masque de la personne à la taille de l'image (blanc opaque = personne) dans psA ; false si le modèle n'est pas prêt */
function personMask(){
  if(!personSegM){personSeg();return false}
  const s=256/Math.max(W,H),mw=Math.max(16,Math.round(W*s)),mh=Math.max(16,Math.round(H*s));
  if(psIn.width!==mw||psIn.height!==mh){psIn.width=mw;psIn.height=mh}
  psInCtx.clearRect(0,0,mw,mh);psInCtx.drawImage(ctx.canvas,0,0,mw,mh);
  let r;try{r=personSegM.segment(psIn)}catch(e){return false}
  try{
    const cm=r.confidenceMasks;if(!cm||!cm.length)return false;
    const m=cm[cm.length-1],v=m.getAsFloat32Array(),w=m.width,h=m.height; // dernier masque = la personne
    if(psM.width!==w||psM.height!==h||!psImg){psM.width=w;psM.height=h;psImg=psMCtx.createImageData(w,h)}
    const d=psImg.data;
    for(let i=0,k=0;i<v.length;i++,k+=4){const q=Math.min(1,Math.max(0,(v[i]-.35)/.3));d[k]=d[k+1]=d[k+2]=255;d[k+3]=q*q*(3-2*q)*255}
    psMCtx.putImageData(psImg,0,0);
    let x0=w,y0=h,x1=-1,y1=-1,sx=0,sy=0,n=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>128){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;sx+=x;sy+=y;n++}
    psBox=n?{x0:x0/w,y0:y0/h,x1:(x1+1)/w,y1:(y1+1)/h,cx:sx/n/w,cy:sy/n/h}:null;
  }finally{r.close()}
  if(psA.width!==W||psA.height!==H){for(const c of[psA,psB,psC]){c.width=W;c.height=H}}
  psACtx.clearRect(0,0,W,H);psACtx.imageSmoothingQuality='high';psACtx.drawImage(psM,0,0,W,H);
  return true;
}
/* la personne seule (fond transparent), dans psC */
function personCut(){
  psCCtx.clearRect(0,0,W,H);psCCtx.drawImage(ctx.canvas,0,0);
  psCCtx.globalCompositeOperation='destination-in';psCCtx.drawImage(psA,0,0);psCCtx.globalCompositeOperation='source-over';
  return psC;
}
/* anneau de couleur autour de la personne (épaisseur r), dans psB ; full = silhouette élargie pleine (sans trou) */
function personRing(r,color,full){
  psBCtx.clearRect(0,0,W,H);
  for(const rr of[r,r*.5]){const n=Math.max(8,Math.min(24,Math.round(rr*1.5)));for(let i=0;i<n;i++){const an=i/n*TAU;psBCtx.drawImage(psA,Math.cos(an)*rr,Math.sin(an)*rr)}}
  psBCtx.globalCompositeOperation='source-in';psBCtx.fillStyle=color;psBCtx.fillRect(0,0,W,H);
  if(!full){psBCtx.globalCompositeOperation='destination-out';psBCtx.drawImage(psA,0,0)}
  psBCtx.globalCompositeOperation='source-over';
  return psB;
}
/* silhouette de la personne remplie d'une couleur, dans psD */
function personShape(fill){
  if(psD.width!==W||psD.height!==H){psD.width=W;psD.height=H}
  psDCtx.clearRect(0,0,W,H);psDCtx.drawImage(psA,0,0);psDCtx.globalCompositeOperation='source-in';psDCtx.fillStyle=fill;psDCtx.fillRect(0,0,W,H);psDCtx.globalCompositeOperation='source-over';
  return psD;
}
/* image pixelisée (carrés de k px) dans psE, à la taille de l'image */
function pixelated(src,k){
  const sw=Math.max(1,Math.round(W/k)),sh=Math.max(1,Math.round(H/k));
  if(psD.width!==sw||psD.height!==sh){psD.width=sw;psD.height=sh}
  psDCtx.clearRect(0,0,sw,sh);psDCtx.drawImage(src,0,0,sw,sh);
  if(psE.width!==W||psE.height!==H){psE.width=W;psE.height=H}
  psECtx.clearRect(0,0,W,H);psECtx.imageSmoothingEnabled=false;psECtx.drawImage(psD,0,0,W,H);psECtx.imageSmoothingEnabled=true;
  return psE;
}
/* copie teintée de la personne (p = personne seule) dans psE */
function tinted(p,fill){
  if(psE.width!==W||psE.height!==H){psE.width=W;psE.height=H}
  psECtx.clearRect(0,0,W,H);psECtx.drawImage(p,0,0);psECtx.globalCompositeOperation='source-in';psECtx.fillStyle=fill;psECtx.fillRect(0,0,W,H);psECtx.globalCompositeOperation='source-over';
  return psE;
}
function personFX(fx,t,a,u){
  if(!personMask())return;
  const cvs=ctx.canvas;
  if(fx.bgblur||fx.bggray||fx.bgblack){
    const p=personCut();ctx.save();
    if(fx.bgblur||fx.bggray){ctx.filter=[fx.bgblur?'blur('+(3+17*a)*u+'px)':'',fx.bggray?'grayscale(1)':''].join(' ').trim();ctx.drawImage(cvs,0,0);ctx.filter='none'}
    if(fx.bgblack){ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(0,0,0,'+(.5+.45*a)+')';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
    ctx.drawImage(p,0,0);ctx.restore();
  }
  if(fx.aura){
    const p=personCut(),halo=personRing((6+16*a)*u,'hsl('+Math.round(t*60%360)+',100%,60%)',true);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.7+.3*Math.sin(t*3);ctx.filter='blur('+(6+14*a)*u+'px)';ctx.drawImage(halo,0,0);ctx.drawImage(halo,0,0);ctx.restore();
    ctx.drawImage(p,0,0);
  }
  /* ----- nouveaux fonds (v4.37) ----- */
  if(fx.bgcolor){ // fond dégradé dont les couleurs tournent
    const p=personCut(),h0=Math.round(t*40%360),g=ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0,'hsl('+h0+',85%,55%)');g.addColorStop(1,'hsl('+((h0+70)%360)+',85%,42%)');
    ctx.save();ctx.globalAlpha=.55+.45*a;ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();ctx.drawImage(p,0,0);
  }
  if(fx.bgspace){ // nuit étoilée derrière la personne
    const p=personCut(),g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.5,Math.max(W,H)*.75);g.addColorStop(0,'#1e1b4b');g.addColorStop(1,'#020617');
    ctx.save();ctx.globalAlpha=.7+.3*a;ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
    const n=Math.round(60+140*a);
    for(let i=0;i<n;i++){const x=hash(i*7.1)*W,y=hash(i*3.7+1)*H,sz=(.7+hash(i*1.3+2)*1.8)*u,tw=.35+.65*Math.abs(Math.sin(t*(1+hash(i)*3)+i));ctx.fillStyle='rgba(255,255,255,'+tw.toFixed(2)+')';ctx.fillRect(x,y,sz,sz)}
    ctx.restore();ctx.drawImage(p,0,0);
  }
  if(fx.bgpixel){const p=personCut();ctx.drawImage(pixelated(ctx.canvas,Math.max(3,(6+26*a)*u)),0,0);ctx.drawImage(p,0,0)}
  if(fx.bgzoom){ // fond qui file vers l'avant, la personne reste nette
    const p=personCut();if(psE.width!==W||psE.height!==H){psE.width=W;psE.height=H}psECtx.clearRect(0,0,W,H);psECtx.drawImage(ctx.canvas,0,0);
    ctx.save();for(let i=1;i<=5;i++){const sc=1+i*(.01+.028*a)*(1+.35*Math.sin(t*3));ctx.globalAlpha=.3;ctx.setTransform(sc,0,0,sc,W/2*(1-sc),H/2*(1-sc));ctx.drawImage(psE,0,0)}ctx.restore();
    ctx.drawImage(p,0,0);
  }
  if(fx.spot&&psBox){ // projecteur : tout s'assombrit sauf un cercle de lumière sur la personne
    const cx=psBox.cx*W,cy=psBox.cy*H,r=Math.max((psBox.x1-psBox.x0)*W,(psBox.y1-psBox.y0)*H)*.7+30*u;
    const g=ctx.createRadialGradient(cx,cy,r*.35,cx,cy,r*(1+.04*Math.sin(t*2)));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.55+.4*a).toFixed(2)+')');
    ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='soft-light';
    const g2=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g2.addColorStop(0,'rgba(255,240,200,.55)');g2.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  /* ----- la personne elle-même ----- */
  if(fx.pgray){const p=personCut();ctx.save();ctx.filter='grayscale(1) contrast(1.1)';ctx.globalAlpha=.5+.5*a;ctx.drawImage(p,0,0);ctx.restore()}
  if(fx.ppixel){ // anonymat : la personne en gros pixels, le fond intact
    const px=pixelated(ctx.canvas,Math.max(4,(8+30*a)*u));psECtx.globalCompositeOperation='destination-in';psECtx.drawImage(psA,0,0);psECtx.globalCompositeOperation='source-over';ctx.drawImage(px,0,0);
  }
  if(fx.pholo){ // hologramme bleuté qui scintille, fond éteint
    const p=personCut();ctx.save();ctx.fillStyle='rgba(2,6,23,'+(.6+.35*a).toFixed(2)+')';ctx.fillRect(0,0,W,H);ctx.restore();
    if(psE.width!==W||psE.height!==H){psE.width=W;psE.height=H}
    psECtx.clearRect(0,0,W,H);psECtx.drawImage(p,0,0);psECtx.globalCompositeOperation='source-atop';psECtx.fillStyle='rgba(34,211,238,.55)';psECtx.fillRect(0,0,W,H);
    psECtx.fillStyle='rgba(0,0,0,.35)';const st=Math.max(2,3*u);for(let y=(t*20*u)%(st*2);y<H;y+=st*2)psECtx.fillRect(0,y,W,st*.6);psECtx.globalCompositeOperation='source-over';
    const fl=.8+.2*Math.sin(t*23)*Math.sin(t*7),jit=hash(Math.floor(t*12))<.2?(hash(Math.floor(t*12)+5)-.5)*12*u*a:0;
    ctx.save();ctx.globalAlpha=fl;ctx.drawImage(psE,jit,0);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45*fl;ctx.filter='blur('+(6*u)+'px)';ctx.drawImage(psE,jit,0);ctx.restore();
  }
  if(fx.pglitch){ // personne qui se dédouble en rouge et bleu, tranches décalées
    const p=personCut(),f0=Math.floor(t*10),off=(3+10*a)*u*(hash(f0)<.5?1:-1);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55;ctx.drawImage(tinted(p,'#ff0040'),-off,0);ctx.drawImage(tinted(p,'#00e5ff'),off,0);ctx.restore();
    for(let i=0;i<8;i++)if(hash(i+f0*13)<.4){const y=hash(i*5+f0)*H,hh=(4+24*hash(i*3+f0))*u,dx=(hash(i*9+f0)-.5)*50*u*a;ctx.drawImage(p,0,y,W,hh,dx,y,W,hh)}
  }
  if(fx.silhouette){ // ombre chinoise avec un liseré de lumière
    ctx.save();ctx.globalAlpha=.75+.25*a;ctx.drawImage(personShape('#05050a'),0,0);ctx.restore();
    ctx.drawImage(personRing(1.6*u,'rgba(255,200,120,.85)'),0,0);
  }
  /* ----- autour de la personne ----- */
  if(fx.shadow){const p=personCut(),sh=personShape('#000');ctx.save();ctx.filter='blur('+((4+10*a)*u)+'px)';ctx.globalAlpha=.5+.35*a;ctx.drawImage(sh,(10+24*a)*u,(8+18*a)*u);ctx.restore();ctx.drawImage(p,0,0)}
  if(fx.pghost){ // traînée d'échos derrière la personne
    const p=personCut();ctx.save();for(let i=3;i>=1;i--){const dx=i*(8+24*a)*u+Math.sin(t*2.2-i*.6)*(6+16*a)*u;ctx.globalAlpha=.16+.1*(3-i);ctx.drawImage(p,-dx,0)}ctx.restore();ctx.drawImage(p,0,0);
  }
  if(fx.pclone&&psBox){ // deux clones un peu plus petits, à gauche et à droite
    const p=personCut(),cx=psBox.cx*W,by=psBox.y1*H,sc=.62,d=W*(.24+.08*a);
    ctx.save();ctx.globalAlpha=.9;
    for(const side of[-1,1]){ctx.save();ctx.translate(cx+side*d,by);ctx.scale(sc,sc);ctx.translate(-cx,-by);ctx.drawImage(p,0,0);ctx.restore()}
    ctx.restore();ctx.drawImage(p,0,0);
  }
  /* ----- contours ----- */
  if(fx.psticker){ // découpe autocollant : gros bord blanc et ombre sous la personne
    const p=personCut(),base=personRing((6+14*a)*u,'#ffffff',true);
    ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=12*u;ctx.shadowOffsetX=4*u;ctx.shadowOffsetY=6*u;ctx.drawImage(base,0,0);ctx.restore();ctx.drawImage(p,0,0);
  }
  if(fx.outline2){ctx.drawImage(personRing((7+14*a)*u,'#7c3aed'),0,0);ctx.drawImage(personRing((2.5+6*a)*u,'#ffffff'),0,0)}
  if(fx.prainbow){
    const r=personRing((3+9*a)*u,'#ffffff'),cx=psBox?psBox.cx*W:W/2,cy=psBox?psBox.cy*H:H/2,g=psBCtx.createConicGradient(t*2,cx,cy);
    for(let i=0;i<=6;i++)g.addColorStop(i/6,'hsl('+(i*60)+',100%,60%)');
    psBCtx.globalCompositeOperation='source-in';psBCtx.fillStyle=g;psBCtx.fillRect(0,0,W,H);psBCtx.globalCompositeOperation='source-over';ctx.drawImage(r,0,0);
  }
  if(fx.pdash){ // pointillés qui tournent autour de la personne
    const r=personRing((2+5*a)*u,'#ffffff'),sp=14*u,off=(t*40*u)%sp;
    psBCtx.save();psBCtx.globalCompositeOperation='destination-out';psBCtx.strokeStyle='#000';psBCtx.lineWidth=sp*.45;
    psBCtx.beginPath();for(let x=-H+off;x<W+H;x+=sp){psBCtx.moveTo(x,0);psBCtx.lineTo(x+H,H)}psBCtx.stroke();psBCtx.restore();ctx.drawImage(r,0,0);
  }
  if(fx.pelec){ // contour électrique qui grésille
    const r=personRing((1+3*a)*u,'#bae6fd'),fr=Math.floor(t*24);
    ctx.save();ctx.shadowColor='#38bdf8';ctx.shadowBlur=(10+20*a)*u;
    for(let i=0;i<3;i++){const j=(2+6*a)*u;ctx.globalAlpha=hash(fr*3+i)<.85?1:.3;ctx.drawImage(r,(hash(i*3+fr)-.5)*j,(hash(i*5+fr+1)-.5)*j)}ctx.restore();
  }
  if(fx.outline)ctx.drawImage(personRing((2+10*a)*u,'#ffffff'),0,0);
  if(fx.neonline){
    const col='hsl('+Math.round(t*90%360)+',100%,62%)',ring=personRing((1.5+4*a)*u,col);
    ctx.save();ctx.shadowColor=col;ctx.shadowBlur=(8+18*a)*u;ctx.drawImage(ring,0,0);ctx.drawImage(ring,0,0);ctx.restore();
  }
}
/* temps écoulé depuis le dernier temps fort, et son numéro (marqueurs de rythme, sinon 120 battements par minute) */
const BEATFX=['bpulse','bbounce','bspin','bshake','brgb','bcolor','bflash','bstrobe','bzoomout','bslide','bmirror','bblur','binvert','bvig'];
function beatAt(t){
  if(!markers.length||t<markers[0]){const p=.5;return[((t%p)+p)%p,Math.floor(t/p)]}
  let lo=0,hi=markers.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(markers[m]<=t)lo=m;else hi=m-1}
  return[t-markers[lo],lo];
}
/* p.fx = effets actifs, p.amt = intensité ; t = temps global, loc = temps depuis le début du clip */
let fxPreview=false; // vignettes : détails grossis pour rester visibles en petit
function applyFX(p,t,loc){
  const fx=p.fx;if(!fx||!FX.some(k=>fx[k]))return;
  if(loc==null)loc=t;
  const a=(p.amt??60)/100,u=fxPreview?Math.max(.55,H/720):Math.max(.12,H/720),cvs=ctx.canvas,n0=k=>Math.round(k*(.3+.7*a));
  const burst=hash(Math.floor(t*9))<.3+.45*a;
  const tf=(sc,r,dx,dy)=>{ctx.save();ctx.translate(W/2+dx,H/2+dy);if(r)ctx.rotate(r);ctx.scale(sc,sc);ctx.drawImage(cvs,-W/2,-H/2);ctx.restore()};
  // personne (avant le reste : le détourage se fait sur l'image d'origine)
  if(usesPerson(fx))personFX(fx,t,a,u);
  // visage (v4.50) : accessoires et retouches qui suivent le visage (06b-face.js)
  if(usesFace(fx))faceFX(p,fx,t,a);
  // mouvement
  if(fx.shake){const s=14*a*u;ctx.drawImage(cvs,(Math.random()-.5)*s*2,(Math.random()-.5)*s*2)}
  if(fx.handheld)tf(1.05,Math.sin(t*.9)*.006*a,(Math.sin(t*1.3)+Math.sin(t*2.7)*.5)*9*u*a,(Math.cos(t*1.1)+Math.sin(t*2.1)*.5)*7*u*a);
  if(fx.sway)tf(1+.1*a,Math.sin(t*1.4)*.05*a,0,0);
  if(fx.zoomin)tf(1+Math.min(.4,Math.max(0,loc)*.05*a),0,0,0);
  if(fx.pulse)tf(1+.09*a*Math.pow(Math.abs(Math.sin(t*Math.PI*2)),3),0,0,0);
  const beat=t%1;
  if(fx.impact){const k=Math.pow(1-beat,3)*26*u*a,an=hash(Math.floor(t))*TAU;tf(1.06,0,Math.cos(an)*k*Math.cos(beat*40),Math.sin(an)*k*Math.cos(beat*40))}
  if(fx.zoompunch)tf(1+.2*a*Math.pow(1-beat,4),0,0,0);
  // au rythme de la musique (v4.36) : se déclenche sur les marqueurs de rythme (Audio > Marqueurs du rythme), sinon 2 fois par seconde
  if(BEATFX.some(k=>fx[k])){const[bs,bi]=beatAt(t),e=Math.exp(-bs*9),sg=bi%2?1:-1;
    if(fx.bpulse)tf(1+.13*a*e,0,0,0);
    if(fx.bbounce)tf(1+.09*a*e*Math.cos(bs*28),0,0,0);
    if(fx.bspin)tf(1.08,e*.07*a*sg,0,0);
    if(fx.bshake){const k=e*34*u*a,an=hash(bi)*TAU;ctx.drawImage(cvs,Math.cos(an)*k*Math.cos(bs*50),Math.sin(an)*k*Math.cos(bs*50))}
    if(fx.brgb&&e>.05){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35*e;ctx.filter='saturate(0) sepia(1) hue-rotate(-50deg) saturate(6)';ctx.drawImage(cvs,e*22*u*a,0);ctx.filter='saturate(0) sepia(1) hue-rotate(150deg) saturate(6)';ctx.drawImage(cvs,-e*22*u*a,0);ctx.restore()}
    if(fx.bcolor){ctx.save();ctx.filter=`hue-rotate(${(bi%6)*60*a}deg) saturate(${1+.4*a})`;ctx.drawImage(cvs,0,0);ctx.restore()}
    if(fx.bflash&&e>.02){ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(255,255,255,${.65*a*e})`;ctx.fillRect(0,0,W,H);ctx.restore()}
    if(fx.bzoomout)tf(1.18-.15*a*e,0,0,0);
    if(fx.bslide){const k=(1-Math.min(1,bs*6))*W*.06*a*sg;if(k){ctx.save();ctx.drawImage(cvs,k,0);ctx.restore()}}
    if(fx.bmirror&&bi%2){ctx.save();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(cvs,0,0);ctx.restore()}
    if(fx.bblur&&e>.05){ctx.save();ctx.filter=`blur(${e*14*u*a}px)`;ctx.drawImage(cvs,0,0);ctx.restore()}
    if(fx.binvert&&bs<.07){ctx.save();ctx.filter='invert(1)';ctx.globalAlpha=a;ctx.drawImage(cvs,0,0);ctx.restore()}
    if(fx.bvig){const g=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,Math.hypot(W,H)/2);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${.85*a*e})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    if(fx.bstrobe&&bs<.08){ctx.fillStyle=`rgba(0,0,0,${.85*a})`;ctx.fillRect(0,0,W,H)}}
  if(fx.whip){const w=(t%2)/.3;if(w<1){const k=Math.sin(w*Math.PI);ctx.save();for(let i=1;i<=6;i++){ctx.globalAlpha=.2;ctx.drawImage(cvs,(i-3.5)*18*u*a*k,0)}ctx.restore()}}
  if(fx.zoomblur){ctx.save();for(let i=1;i<=5;i++){const sc=1+.025*i*a;ctx.globalAlpha=.16;ctx.setTransform(sc,0,0,sc,W/2*(1-sc),H/2*(1-sc));ctx.drawImage(cvs,0,0)}ctx.restore()}
  // glitch
  if(fx.glitch&&burst){
    const n=3+Math.floor(9*a);
    for(let i=0;i<n;i++){const y=Math.random()*H,h=(8+Math.random()*90*a)*u,dx=(Math.random()-.5)*260*a*u;ctx.drawImage(cvs,0,y,W,h,dx,y,W,h)}
  }
  if(fx.slices){const n=6+Math.round(10*a),sd=Math.floor(t*2);for(let i=0;i<n;i++){const y=hash(sd*31+i)*H,h=(10+hash(sd*7+i)*50)*u,dx=(hash(sd*13+i)-.5)*80*u*a;ctx.drawImage(cvs,0,y,W,h,dx,y,W,h)}}
  if(fx.vhstrack){
    const by=((t*.35)%1.3-.15)*H,bh=60*u,st=Math.max(1,3*u);
    for(let y=Math.max(0,by);y<Math.min(H,by+bh);y+=st){const dx=(hash(Math.floor(y)+Math.floor(t*30))-.5)*36*u*a;ctx.drawImage(cvs,0,y,W,st,dx,y,W,st)}
    ctx.fillStyle='rgba(255,255,255,'+(.08*a)+')';ctx.fillRect(0,by,W,bh);
  }
  if(fx.mirror){ctx.save();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(cvs,0,0,W/2,H,0,0,W/2,H);ctx.restore()}
  if(fx.kaleido){
    ctx.save();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(cvs,0,0,W/2,H,0,0,W/2,H);ctx.restore();
    ctx.save();ctx.translate(0,H);ctx.scale(1,-1);ctx.drawImage(cvs,0,0,W,H/2,0,0,W,H/2);ctx.restore();
  }
  if(fx.grid4||fx.grid9){
    const n=fx.grid9?3:2;fxTmp.width=W;fxTmp.height=H;fxTmpCtx.drawImage(cvs,0,0);
    ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);const gap=Math.round(3*u*a);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)ctx.drawImage(fxTmp,x*W/n+gap/2,y*H/n+gap/2,W/n-gap,H/n-gap);
    ctx.restore();
  }
  if(fx.echo){ctx.save();ctx.globalAlpha=.32*a+.08;const d=(14+10*Math.sin(t*2))*u*a;ctx.drawImage(cvs,-d,0);ctx.drawImage(cvs,d,0);ctx.restore()}
  if(fx.pixel)pixelate(cvs,ctx,Math.max(2,Math.round((6+34*a)*u)));
  if(fx.blur){ctx.filter='blur('+(2+14*a)*u+'px)';ctx.drawImage(cvs,0,0);ctx.filter='none'}
  if(fx.bloom){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.6*a;ctx.filter='blur('+(14*u)+'px) brightness(1.15)';ctx.drawImage(cvs,0,0);ctx.restore()}
  if(fx.rainbow){ctx.save();ctx.globalAlpha=.4+.6*a;ctx.filter='hue-rotate('+Math.round(t*90%360)+'deg) saturate('+(1+.6*a)+')';ctx.drawImage(cvs,0,0);ctx.restore()}
  // calculs pixel par pixel
  if(fx.rgb||fx.noise||fx.gray||fx.green||fx.invert||fx.sepia||fx.poster||fx.thermal){
    const img=ctx.getImageData(0,0,W,H),d=img.data,len=d.length;
    if(fx.rgb){
      const sh=Math.max(1,Math.round((5+22*a)*(burst?1.7:1)*u)),src=new Uint8ClampedArray(d);
      for(let y=0;y<H;y++){const row=y*W;for(let x=0;x<W;x++){
        const i=(row+x)*4,xr=x-sh<0?0:x-sh,xb=x+sh>=W?W-1:x+sh;
        d[i]=src[(row+xr)*4];d[i+2]=src[(row+xb)*4+2];
      }}
    }
    if(fx.gray||fx.green){
      for(let i=0;i<len;i+=4){const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11;
        if(fx.green){d[i]=l*.1;d[i+1]=Math.min(255,l*1.15);d[i+2]=l*.25}else{d[i]=d[i+1]=d[i+2]=l}}
    }
    if(fx.sepia){for(let i=0;i<len;i+=4){const r=d[i],g=d[i+1],b=d[i+2];d[i]=r*.393+g*.769+b*.189;d[i+1]=r*.349+g*.686+b*.168;d[i+2]=r*.272+g*.534+b*.131}}
    if(fx.thermal){const P=thermalLUT();for(let i=0;i<len;i+=4){const j=((d[i]*.3+d[i+1]*.59+d[i+2]*.11)|0)*3;d[i]=P[j];d[i+1]=P[j+1];d[i+2]=P[j+2]}}
    if(fx.poster){const L=Math.max(2,Math.round(6-4*a)),k=255/(L-1);for(let i=0;i<len;i+=4){d[i]=Math.round(d[i]/k)*k;d[i+1]=Math.round(d[i+1]/k)*k;d[i+2]=Math.round(d[i+2]/k)*k}}
    if(fx.invert){for(let i=0;i<len;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}}
    if(fx.noise){
      const off=Math.floor(Math.random()*noiseTab.length),k=.45*a*(fxPreview?.4:1),m=noiseTab.length-1;
      for(let i=0,j=off;i<len;i+=4,j++){const n=noiseTab[j&m]*k;d[i]+=n;d[i+1]+=n;d[i+2]+=n}
    }
    ctx.putImageData(img,0,0);
  }
  // effets calculés par la carte graphique
  for(const k of GL_ORDER)if(fx[k])glPass(k,t,a,u);
  // par-dessus l'image
  if(fx.letterbox){const want=W/2.39;if(want<H){const bar=(H-want)/2*a;ctx.fillStyle='#000';ctx.fillRect(0,0,W,bar);ctx.fillRect(0,H-bar,W,bar)}}
  if(fx.scan){ctx.fillStyle='rgba(0,0,0,.35)';const st=Math.max(2,4*u);for(let y=0;y<H;y+=st)ctx.fillRect(0,y,W,st*.38)}
  if(fx.flicker&&burst){ctx.fillStyle=`rgba(255,255,255,${Math.random()*.18*a})`;ctx.fillRect(0,0,W,H)}
  if(fx.strobe&&Math.floor(t*8)%2===0){ctx.fillStyle='rgba(255,255,255,'+(.5*a)+')';ctx.fillRect(0,0,W,H)}
  if(fx.vig){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.6);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.8)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  if(fx.scratch){
    const f=Math.floor(t*12);ctx.save();ctx.strokeStyle='rgba(20,15,10,'+(.35+.3*a)+')';ctx.lineWidth=Math.max(1,1.2*u);
    for(let i=0;i<3;i++){if(hash(f*5+i)<.45)continue;const x=hash(f*3+i)*W;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+(hash(f+i)-.5)*6*u,H);ctx.stroke()}
    ctx.fillStyle='rgba(15,10,5,.6)';for(let i=0;i<n0(20);i++){ctx.beginPath();ctx.arc(hash(f*17+i)*W,hash(f*23+i)*H,(.6+hash(f*29+i)*2.2)*u,0,TAU);ctx.fill()}
    ctx.restore();
  }
  if(fx.leak){
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const[k,col]of[[0,'255,120,40'],[1,'255,60,140']]){const x=(.15+.7*(.5+.5*Math.sin(t*.4+k*2.1)))*W,y=(.2+.6*(.5+.5*Math.cos(t*.33+k*1.3)))*H,r=Math.max(W,H)*.6,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+col+','+(.55*a)+')');g.addColorStop(1,'rgba('+col+',0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    ctx.restore();
  }
  if(fx.sparkle){
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0,n=n0(40);i<n;i++){const ph=Math.sin(t*3+i*1.7);if(ph<=0)continue;const x=hash(i*13)*W,y=hash(i*13+1)*H,sz=(4+hash(i*13+2)*9)*u*ph;
      ctx.fillStyle=i%2?'rgba(255,240,200,.95)':'rgba(255,255,255,.95)';ctx.beginPath();ctx.moveTo(x,y-sz);ctx.quadraticCurveTo(x,y,x+sz,y);ctx.quadraticCurveTo(x,y,x,y+sz);ctx.quadraticCurveTo(x,y,x-sz,y);ctx.quadraticCurveTo(x,y,x,y-sz);ctx.fill()}
    ctx.restore();
  }
  if(fx.snow){
    ctx.save();ctx.fillStyle='rgba(255,255,255,.85)';
    for(let i=0,n=n0(90);i<n;i++){const sp=.08+hash(i*3+1)*.12,y=((hash(i*3+2)+t*sp)%1.06)-.03,x=hash(i*3)+Math.sin(t*1.3+i)*.012,r=(1.2+hash(i*7)*2.6)*u;ctx.beginPath();ctx.arc(x*W,y*H,r,0,TAU);ctx.fill()}
    ctx.restore();
  }
  if(fx.rain){
    ctx.save();ctx.strokeStyle='rgba(200,220,255,.55)';ctx.lineWidth=Math.max(1,1.3*u);ctx.beginPath();
    for(let i=0,n=n0(160);i<n;i++){const sp=1.1+hash(i*5+1)*.9,y=((hash(i*5+2)+t*sp)%1.1)-.05,x=hash(i*5),l=(18+hash(i*5+3)*22)*u;ctx.moveTo(x*W,y*H);ctx.lineTo(x*W-l*.18,y*H+l)}
    ctx.stroke();ctx.restore();
  }
  if(fx.confetti){
    ctx.save();
    for(let i=0,n=n0(70);i<n;i++){const sp=.12+hash(i*7+1)*.2,y=((hash(i*7+2)+t*sp)%1.1)-.05,x=hash(i*7)+Math.sin(t*2+i)*.015,sz=(5+hash(i*7+3)*6)*u,r=t*(2+hash(i*7+4)*4)+i;
      ctx.save();ctx.translate(x*W,y*H);ctx.rotate(r);ctx.scale(1,Math.abs(Math.cos(r*1.3))+.15);ctx.fillStyle=CONF[i%CONF.length];ctx.fillRect(-sz/2,-sz/4,sz,sz/2);ctx.restore()}
    ctx.restore();
  }
  if(fx.hearts){
    ctx.save();
    for(let i=0,n=n0(16);i<n;i++){const sp=.06+hash(i*11+1)*.08,y=1.08-((hash(i*11+2)+t*sp)%1.15),x=hash(i*11)+Math.sin(t*1.2+i)*.03,sz=(10+hash(i*11+3)*16)*u;
      ctx.globalAlpha=.85*Math.max(0,Math.min(1,y*3));ctx.fillStyle=i%3?'#ff4d6d':'#ff8fab';heartPath(ctx,x*W,y*H,sz);ctx.fill()}
    ctx.restore();
  }
  fxPro(fx,t,a,u,n0);
}
/* lumières, atmosphère et particules « pro » (dessinées par-dessus) */
function glowDot(x,y,r,col,al){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+col+','+al+')');g.addColorStop(1,'rgba('+col+',0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function fxPro(fx,t,a,u,n0){
  const S=Math.max(W,H);
  if(fx.fog){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<10;i++){const x=((hash(i*3)+t*.025*(1+hash(i)))%1.4-.2)*W,y=(.3+hash(i*3+1)*.65)*H;glowDot(x,y,S*(.3+hash(i*3+2)*.35),'220,225,235',.38*a)}ctx.restore()}
  if(fx.rays){ctx.save();ctx.globalCompositeOperation='screen';const ox=-W*.05,oy=-H*.1;for(let i=0;i<7;i++){const an=.35+i*.11+Math.sin(t*.5+i)*.03,w=.025+hash(i)*.03,L=S*1.6;const g=ctx.createLinearGradient(ox,oy,ox+Math.cos(an)*L,oy+Math.sin(an)*L);g.addColorStop(0,'rgba(255,240,200,'+(.42*a)+')');g.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+Math.cos(an-w)*L,oy+Math.sin(an-w)*L);ctx.lineTo(ox+Math.cos(an+w)*L,oy+Math.sin(an+w)*L);ctx.fill()}ctx.restore()}
  if(fx.flare){
    ctx.save();ctx.globalCompositeOperation='screen';const fx_=(.2+.6*(.5+.5*Math.sin(t*.35)))*W,fy=(.3+.1*Math.sin(t*.5))*H;
    const g=ctx.createLinearGradient(0,fy,W,fy);g.addColorStop(0,'rgba(80,140,255,0)');g.addColorStop(fx_/W,'rgba(140,190,255,'+(.75*a)+')');g.addColorStop(1,'rgba(80,140,255,0)');ctx.fillStyle=g;ctx.fillRect(0,fy-3*u,W,6*u);
    glowDot(fx_,fy,60*u,'200,220,255',.6*a);
    for(let i=1;i<=4;i++){const k=1-i*.45,x=W/2+(fx_-W/2)*k,y=H/2+(fy-H/2)*k;glowDot(x,y,(14+i*9)*u,i%2?'120,200,255':'255,170,90',.22*a)}
    ctx.restore();
  }
  if(fx.shine){const ph=(t%2.5)/1.2;if(ph<1){ctx.save();ctx.globalCompositeOperation='screen';const x=-W*.4+ph*W*1.8,g=ctx.createLinearGradient(x-W*.15,0,x+W*.15,H*.3);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,'+(.45*a)+')');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}}
  if(fx.filmburn){ctx.save();ctx.globalCompositeOperation='screen';const f=Math.floor(t*3);for(let i=0;i<3;i++){const e=hash(f*7+i),x=e<.5?(e<.25?0:W):hash(f*11+i)*W,y=e<.5?hash(f*13+i)*H:(e<.75?0:H),r=S*(.25+.3*hash(f*5+i))*(.6+.4*Math.sin(t*6+i));glowDot(x,y,r*1.2,'255,130,40',.95*a);glowDot(x,y,r*.5,'255,240,200',.85*a)}ctx.restore()}
  if(fx.disco){ctx.save();ctx.globalCompositeOperation='screen';const cols=['255,40,120','40,200,255','255,220,40','120,255,80'];for(let i=0;i<4;i++){const x=(.5+.42*Math.sin(t*(.9+i*.23)+i*1.7))*W,y=(.5+.38*Math.cos(t*(.7+i*.31)+i))*H;glowDot(x,y,S*.26,cols[i],.62*a)}ctx.restore()}
  if(fx.lightning){const k=Math.floor(t/2.6),ph=t-k*2.6;if(hash(k)<.85&&ph<.32){const fl=ph<.05||(ph>.12&&ph<.17);ctx.save();if(fl){ctx.fillStyle='rgba(220,230,255,'+(.55*a)+')';ctx.fillRect(0,0,W,H)}
    ctx.strokeStyle='rgba(235,240,255,.95)';ctx.shadowColor='#9ab8ff';ctx.shadowBlur=18*u;ctx.lineWidth=Math.max(1.5,3*u);ctx.beginPath();let x=(.2+.6*hash(k*3))*W,y=0;ctx.moveTo(x,y);
    for(let j=1;j<=12;j++){x+=(hash(k*17+j)-.5)*W*.09;y=j/12*H*.75;ctx.lineTo(x,y)}ctx.stroke();ctx.restore()}}
  if(fx.warp){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(let i=0,n=n0(120);i<n;i++){const an=hash(i*3)*TAU,sp=.4+hash(i*3+1)*.8,d=((hash(i*3+2)+t*sp)%1),r0=d*d*S*.75,r1=r0+(8+d*90)*u;ctx.strokeStyle='rgba(200,225,255,'+(Math.min(1,d*1.6)*.85)+')';ctx.lineWidth=Math.max(1,(.5+d*2.5)*u);ctx.beginPath();ctx.moveTo(W/2+Math.cos(an)*r0,H/2+Math.sin(an)*r0);ctx.lineTo(W/2+Math.cos(an)*r1,H/2+Math.sin(an)*r1);ctx.stroke()}ctx.restore()}
  if(fx.dust){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0,n=n0(26);i<n;i++){const x=((hash(i*5)+t*.012*(hash(i*5+1)-.5))%1+1)%1*W,y=((hash(i*5+2)-t*.008*(1+hash(i)))%1+1)%1*H;glowDot(x,y,(6+hash(i*5+3)*22)*u,'255,235,200',(.18+.2*Math.sin(t+i))*a+.05)}ctx.restore()}
  if(fx.starry){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0,n=n0(70);i<n;i++){const f=.5+.5*Math.sin(t*(1+2*hash(i*5+2))*2+i);glowDot(hash(i*5)*W,hash(i*5+1)*H*.75,(2+3*hash(i*5+3))*u*2.6*(.4+.6*f),'255,255,255',.95*f)}ctx.restore()}
  if(fx.glitter){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0,n=n0(60);i<n;i++){const sp=.1+hash(i*11+1)*.15,y=((hash(i*11+2)+t*sp)%1.05)*H,x=(hash(i*11)+Math.sin(t*1.4+i)*.015)*W,f=Math.max(0,Math.sin(t*6+i*2.3)),sz=(3+hash(i*11+3)*6)*u*(.3+.7*f);
    ctx.fillStyle=i%3?'rgba(255,211,106,.95)':'rgba(255,250,230,.95)';ctx.beginPath();ctx.moveTo(x,y-sz);ctx.quadraticCurveTo(x,y,x+sz,y);ctx.quadraticCurveTo(x,y,x,y+sz);ctx.quadraticCurveTo(x,y,x-sz,y);ctx.quadraticCurveTo(x,y,x,y-sz);ctx.fill()}ctx.restore()}
  if(fx.balloons){ctx.save();for(let i=0,n=n0(12);i<n;i++){const sp=.05+hash(i*17+1)*.06,y=(1.25-((hash(i*17+2)+t*sp)%1.5))*H,x=(hash(i*17)+Math.sin(t*.9+i)*.02)*W,r=(18+hash(i*17+3)*16)*u;
    ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=Math.max(1,u);ctx.beginPath();ctx.moveTo(x,y+r*1.2);ctx.quadraticCurveTo(x+Math.sin(t*2+i)*r*.4,y+r*2.2,x,y+r*3.2);ctx.stroke();
    ctx.fillStyle=CONF[i%CONF.length];ctx.beginPath();ctx.ellipse(x,y,r,r*1.2,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(x-r*.35,y-r*.45,r*.22,r*.32,-.5,0,TAU);ctx.fill()}ctx.restore()}
  if(fx.lasers){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(let i=0;i<6;i++){const ox=(i<3?.1:.9)*W,an=-Math.PI/2+Math.sin(t*1.3+i*1.1)*.75,L=S*1.4,col='hsla('+Math.round((t*80+i*60)%360)+',100%,60%,'+(.5+.4*a)+')';
    ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=14*u;ctx.lineWidth=(2+3*a)*u;ctx.beginPath();ctx.moveTo(ox,H);ctx.lineTo(ox+Math.cos(an)*L,H+Math.sin(an)*L);ctx.stroke()}ctx.restore()}
  if(fx.fireflies){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0,n=n0(30);i<n;i++){const x=(hash(i*7)+.06*Math.sin(t*.7+i*2.1))*W,y=(.3+.65*hash(i*7+1)+.05*Math.cos(t*.9+i))*H,f=.5+.5*Math.sin(t*2.5+i*3.3);glowDot(x,y,(5+8*f)*u,'210,255,120',.7*f*(.4+.6*a))}ctx.restore()}
  if(fx.embers){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0,n=n0(45);i<n;i++){const sp=.12+hash(i*9+1)*.25,y=1.05-((hash(i*9+2)+t*sp)%1.1),x=hash(i*9)+Math.sin(t*1.7+i)*.02,f=.6+.4*Math.sin(t*9+i*5);glowDot(x*W,y*H,(2.5+hash(i*9+3)*4)*u*3.6,'255,'+Math.round(110+60*hash(i))+',30',.85*f*Math.min(1,y*2))}ctx.restore()}
  if(fx.bubbles){ctx.save();for(let i=0,n=n0(24);i<n;i++){const sp=.07+hash(i*13+1)*.1,y=1.1-((hash(i*13+2)+t*sp)%1.2),x=hash(i*13)+Math.sin(t*1.5+i)*.02,r=(6+hash(i*13+3)*20)*u;ctx.strokeStyle='rgba(220,240,255,.7)';ctx.lineWidth=Math.max(1,1.2*u);ctx.fillStyle='rgba(200,230,255,.10)';ctx.beginPath();ctx.arc(x*W,y*H,r,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(x*W-r*.35,y*H-r*.35,r*.18,0,TAU);ctx.fill()}ctx.restore()}
  if(fx.petals||fx.leaves){
    const cols=fx.petals?['#ffc2d6','#ffb0c8','#ffd6e4']:['#d9631e','#b8441a','#e8a33a','#8a3b12'];ctx.save();
    for(let i=0,n=n0(fx.petals?40:28);i<n;i++){const sp=.07+hash(i*15+1)*.09,y=((hash(i*15+2)+t*sp)%1.1)-.05,x=hash(i*15)+Math.sin(t*1.1+i)*.04,sz=(fx.petals?6:11)*u*(1+hash(i*15+3)),r=t*(1+hash(i*15+4)*2)+i;
      ctx.save();ctx.translate(x*W,y*H);ctx.rotate(r);ctx.scale(1,.55+.45*Math.abs(Math.sin(r*1.4)));ctx.fillStyle=cols[i%cols.length];ctx.beginPath();
      if(fx.petals){ctx.ellipse(0,0,sz,sz*.6,0,0,TAU)}else{ctx.moveTo(0,-sz);ctx.quadraticCurveTo(sz*.8,0,0,sz);ctx.quadraticCurveTo(-sz*.8,0,0,-sz)}
      ctx.fill();ctx.restore()}
    ctx.restore();
  }
}
const easeOut=q=>1-Math.pow(1-q,3),backOut=q=>1+2.70158*Math.pow(q-1,3)+1.70158*Math.pow(q-1,2);
const outBounce=q=>{const n=7.5625,d=2.75;if(q<1/d)return n*q*q;if(q<2/d)return n*(q-=1.5/d)*q+.75;if(q<2.5/d)return n*(q-=2.25/d)*q+.9375;return n*(q-=2.625/d)*q+.984375};
/* durée de la vidéo verticale comparée aux limites courantes des applis (15 s, 60 s, 3 min, 10 min) */
const DUR_LIM=[15,60,180,600];
function durBadge(){if(W>=H)return '';const d=total();if(d<=0)return '';const l=DUR_LIM.find(x=>d<=x+.05);
  const lab=l?(l<60?l+' s':l/60+' min'):'10 min+';return ` <i class="durb ${l?(l<=60?'ok':'mid'):'over'}" title="${esc(T('durb.tip'))}">${l?'≤ ':''}${lab}</i>`}
function drawText(c,t,g=ctx){
  const p=c.p,loc=t-c.start,rem=c.dur-loc,an=p.anim||'none',ao=p.aout||'none',lp=p.aloop||'none';let al=(p.op??100)/100;
  if(p.fade)al*=clamp(Math.min(loc/.3,rem/.3),0,1);
  if(an==='fade')al*=Math.min(1,loc/.5);
  if(ao==='fade')al*=clamp(rem/.5,0,1);
  const size=p.size||72,raw=String(p.text||''),full=(p.caps?raw.toUpperCase():raw).split('\n'),lh=size*1.12,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100;
  const a=(p.amt??60)/100,burst=hash(Math.floor(t*10)+c.id)<.3+.45*a;
  g.save();
  fontReady(p.font);
  g.font=`${p.italic?'italic ':''}${p.bold===false?'400':'900'} ${size}px "${p.font==='snd.impact'?'Impact':p.font||'Arial Black'}", sans-serif`;
  if('letterSpacing' in g)g.letterSpacing=(p.ls||0)+'px';
  g.textBaseline='middle';g.lineJoin='round';g.textAlign='left';
  const ws=full.map(l=>g.measureText(l).width),mw=Math.max(1,...ws),bh=full.length*lh,pad=size*.35;
  if(g===ctx)boxes.set(c.id,{x:cx-mw/2-pad,y:cy-bh/2-pad/2,w:mw+2*pad,h:bh+pad,rot:p.rot||0});
  let dx=0,dy=0,sc=1,sy=1,rot=0,blur=0,wipe=1,glK=1,gli=!!p.glitch;
  const qi=d=>Math.min(1,Math.max(0,loc/d)),qo=d=>rem<d?Math.pow(1-Math.max(0,rem)/d,3):0;
  // entrée
  if(an==='pop'){const q=qi(.35);sc*=q<1?backOut(q):1}
  else if(an==='slide'){const e=easeOut(qi(.45));dy+=(1-e)*H*.12;al*=e}
  else if(an==='slidedown'){const e=easeOut(qi(.45));dy-=(1-e)*H*.12;al*=e}
  else if(an==='slidel'){const e=easeOut(qi(.45));dx-=(1-e)*W*.25;al*=e}
  else if(an==='slider'){const e=easeOut(qi(.45));dx+=(1-e)*W*.25;al*=e}
  else if(an==='drop'){const q=qi(.75);dy-=(1-outBounce(q))*H*.3;al*=Math.min(1,q*4)}
  else if(an==='zoom'){const e=easeOut(qi(.5));sc*=2-e;al*=e}
  else if(an==='zoomin'){const e=easeOut(qi(.45));sc*=.25+.75*e;al*=e}
  else if(an==='bounce'&&loc<.7)dy-=Math.abs(Math.sin(loc/.7*Math.PI*3))*(1-loc/.7)*size*.9;
  else if(an==='blur'){const e=easeOut(qi(.6));blur+=(1-e)*size*.25;al*=e}
  else if(an==='spin'){const e=easeOut(qi(.6));rot-=(1-e)*Math.PI;sc*=.2+.8*e;al*=e}
  else if(an==='flip'){const q=qi(.5);sy*=q<1?Math.max(.01,backOut(q)):1}
  else if(an==='wipe')wipe=Math.min(wipe,easeOut(qi(.6)));
  else if(an==='elastic'){const q=qi(.8);sc*=q>=1?1:Math.max(.01,Math.pow(2,-10*q)*Math.sin((q*10-.75)*TAU/3)+1)}
  else if(an==='swingin'){const q=qi(.7);rot+=(1-q)*(1-q)*Math.sin(q*14)*.5;al*=Math.min(1,q*3)}
  else if(an==='shakein'&&loc<.6){const k=1-loc/.6;dx+=Math.sin(loc*70)*size*.25*k;al*=Math.min(1,loc*6)}
  else if(an==='unfold'){const q=qi(.5);sy*=Math.max(.01,easeOut(q));sc*=.85+.15*easeOut(q);al*=Math.min(1,q*2)}
  else if(an==='glitchin'&&loc<.5){const k=1-loc/.5;dx+=(hash(Math.floor(t*40)+c.id)-.5)*size*.5*k;if(hash(Math.floor(t*25)+c.id*3)<.35*k)al*=.15;gli=true}
  // sortie
  if(ao==='slide'){const e=qo(.45);dy+=e*H*.12;al*=1-e}
  else if(ao==='slideup'){const e=qo(.45);dy-=e*H*.12;al*=1-e}
  else if(ao==='slidel'){const e=qo(.45);dx-=e*W*.25;al*=1-e}
  else if(ao==='slider'){const e=qo(.45);dx+=e*W*.25;al*=1-e}
  else if(ao==='pop'&&rem<.3)sc*=Math.max(0,rem/.3);
  else if(ao==='zoom'&&rem<.5){const q=1-rem/.5;sc*=1+q;al*=1-q}
  else if(ao==='blur'){const e=qo(.5);blur+=e*size*.25;al*=1-e}
  else if(ao==='spin'){const e=qo(.5);rot+=e*Math.PI;sc*=1-.8*e;al*=1-e}
  else if(ao==='flip'&&rem<.4)sy*=Math.max(0,rem/.4);
  else if(ao==='wipe'&&rem<.5)wipe=Math.min(wipe,Math.max(0,rem/.5));
  else if(ao==='drop'){const e=qo(.5);dy+=e*H*.35;al*=1-e*e}
  else if(ao==='flyaway'){const e=qo(.6);dy-=e*H*.45;rot+=e*.35;sc*=1-.3*e;al*=1-e}
  else if(ao==='glitchout'&&rem<.5){const k=1-rem/.5;dx+=(hash(Math.floor(t*40)+c.id*5)-.5)*size*.6*k;if(hash(Math.floor(t*25)+c.id*9)<.5*k)al*=.1;gli=true}
  else if(ao==='elastic'&&rem<.45){const q=1-rem/.45;sc*=Math.max(0,1+Math.sin(q*Math.PI)*.18-q*q*1.18)}
  // en boucle
  if(lp==='pulse')sc*=1+.07*Math.sin(loc*Math.PI*2.4);
  else if(lp==='heart'){const ph=(loc*1.3)%1;sc*=1+(ph<.14?Math.sin(ph/.14*Math.PI)*.13:ph<.28?Math.sin((ph-.14)/.14*Math.PI)*.07:0)}
  else if(lp==='float')dy+=Math.sin(loc*2.4)*size*.12;
  else if(lp==='shake'){dx+=(hash(Math.floor(t*30)+c.id*7)-.5)*size*.09;dy+=(hash(Math.floor(t*30)+c.id*13)-.5)*size*.09}
  else if(lp==='swing')rot+=Math.sin(loc*3.2)*.09;
  else if(lp==='flicker'){if(hash(Math.floor(t*14)+c.id)<.14)al*=.3}
  else if(lp==='glow')glK=.4+1.2*(.5+.5*Math.sin(loc*4));
  else if(lp==='hop')dy-=Math.abs(Math.sin(loc*3.6))*size*.22;
  else if(lp==='jelly'){const w=Math.sin(loc*7);sy*=1+.08*w;sc*=1-.04*w}
  else if(lp==='spinslow')rot+=loc*1.1;
  else if(lp==='tilt')sy*=.75+.25*Math.abs(Math.cos(loc*2.2));
  if(al<=0||sc<=0||sy<=0){g.restore();return}
  g.globalAlpha=al;
  g.translate(cx+dx,cy+dy);if(p.rot)g.rotate(p.rot*Math.PI/180);if(rot)g.rotate(rot);if(sc!==1||sy!==1)g.scale(sc,sc*sy);
  if(blur>.3)g.filter=`blur(${blur.toFixed(1)}px)`;
  if(wipe<1){g.beginPath();g.rect(-mw/2-pad*1.5,-bh/2-pad*1.5,(mw+pad*3)*Math.max(0,wipe),bh+pad*3);g.clip()}
  const align=p.align||'center',alignX=i=>align==='left'?-mw/2:align==='right'?mw/2-ws[i]:-ws[i]/2;
  // fond : bloc, pastille, surligné par ligne ou souligné
  if(p.bg){
    const bs=p.bgs||'box';g.save();g.globalAlpha=al*(p.bgo??88)/100;g.fillStyle=p.bgc||'#000000';
    const rr=(x,y,w,h,r)=>{g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill()};
    if(bs==='line'||bs==='under')full.forEach((ln,i)=>{const y=-bh/2+lh/2+i*lh,w=ws[i],X=alignX(i);if(!w)return;
      if(bs==='line')rr(X-size*.18,y-lh*.46,w+size*.36,lh*.92,size*.14);else rr(X-size*.06,y+size*.42,w+size*.12,size*.13,size*.06)});
    else rr(-mw/2-pad,-bh/2-pad/2,mw+pad*2,bh+pad,bs==='pill'?(bh+pad)/2:size*.25);
    g.restore();
  }
  const neon=p.neon||lp==='glow',gc=p.glowc||p.color,sw=size*(p.sw??7)/100;
  const fillAt=(y,over)=>{if(over)return over;if(p.gradOn&&p.grad){const gr=g.createLinearGradient(0,y-size*.42,0,y+size*.42);gr.addColorStop(0,p.color);gr.addColorStop(1,p.grad);return gr}return p.color};
  const hollowLine=()=>{g.lineWidth=Math.max(sw,size*.04);g.strokeStyle=p.stroke?(p.sc||'#000'):p.color};
  // toutes les couches d'un morceau de texte : relief 3D, ombre dure, glitch, ombre, contours, lueur, remplissage
  const paint=(s,X,y,over)=>{
    if(!s)return;const f=fillAt(y,over);
    if(p.extOn&&p.ext){const n=Math.max(4,Math.min(24,Math.round(size*.1))),st=size*.085/n;g.fillStyle=p.ext;g.strokeStyle=p.ext;g.lineWidth=sw;for(let i=n;i>=1;i--){g.fillText(s,X+i*st,y+i*st);if(p.stroke)g.strokeText(s,X+i*st,y+i*st)}}
    if(p.hardOn&&p.hard){const o=size*.07;g.fillStyle=p.hard;g.strokeStyle=p.hard;if(p.stroke||p.st2On){g.lineWidth=p.st2On?sw*2+size*.12:sw;g.strokeText(s,X+o,y+o)}g.fillText(s,X+o,y+o)}
    if(gli){const k=burst?size*.05:size*.02,j=burst?(Math.random()-.5)*size*.08:0;g.fillStyle='#00e5ff';g.fillText(s,X-k+j,y);g.fillStyle='#ff1f8e';g.fillText(s,X+k+j,y)}
    if(p.shadow){g.save();g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=size*.18;g.shadowOffsetY=size*.06;if(p.hollow){hollowLine();g.strokeText(s,X,y)}else{g.fillStyle=f;g.fillText(s,X,y)}g.restore()}
    if(p.st2On&&p.st2){g.lineWidth=sw*2+size*.12;g.strokeStyle=p.st2;g.strokeText(s,X,y)}
    if(p.stroke){g.lineWidth=sw;g.strokeStyle=p.sc||'#000';g.strokeText(s,X,y)}
    if(neon){g.shadowColor=gc;g.shadowBlur=size*.45*glK;if(p.hollow){hollowLine();g.strokeText(s,X,y)}else{g.fillStyle=f;g.fillText(s,X,y)}g.shadowBlur=size*.15*glK}
    if(!p.hollow){g.fillStyle=f;g.fillText(s,X,y)}else if(!p.stroke){hollowLine();g.strokeText(s,X,y)}
    g.shadowBlur=0;
  };
  const perL=an==='letters'||an==='rise'||ao==='letters'||lp==='wave'||lp==='rainbow'||lp==='karaoke'||lp==='wordpop';
  /* mot par mot (v4.36) : le mot « dit » est surligné (karaoké) ou les mots apparaissent un à un */
  let wOf=null,wCur=0,wQ=1;
  if(lp==='karaoke'||lp==='wordpop'){wOf=[];let w=-1;full.forEach(ln=>{let sp=true;for(const ch of ln){if(ch===' '){sp=true;wOf.push(w);continue}if(sp){w++;sp=false}wOf.push(w)}});
    const nw=Math.max(1,w+1),f=clamp(loc/Math.max(.2,c.dur*.92),0,.9999)*nw;wCur=Math.floor(f);wQ=clamp((f-wCur)*3,0,1)}
  const typing=an==='type'||an==='typec';let left=typing?Math.floor(loc*(p.tspeed||16)):1e9;
  const nAll=full.reduce((n,l)=>n+[...l].length,0);let gi=0,curX=null,curY=0;
  full.forEach((ln,i)=>{
    const y=-bh/2+lh/2+i*lh,chars=[...ln],reach=left>=0,txt=chars.slice(0,Math.max(0,left)).join('');left-=chars.length+1;
    const X=alignX(i);
    if(reach){curX=X+g.measureText(txt).width;curY=y}
    if(!perL){paint(txt,X,y);return}
    const tc=[...txt];let pre='';
    for(let k=0;k<tc.length;k++,gi++){
      const ch=tc[k],x0=X+g.measureText(pre).width,cw=g.measureText(ch).width;pre+=ch;
      if(ch===' ')continue;
      let ca=1,cs=1,cdy=0,col=null;
      if(an==='letters'){const q=Math.min(1,Math.max(0,(loc-gi*.045)/.3));if(q<=0)continue;cs*=backOut(q);ca*=Math.min(1,q*2)}
      if(an==='rise'){const q=Math.min(1,Math.max(0,(loc-gi*.04)/.4));if(q<=0)continue;const e=easeOut(q);cdy+=(1-e)*size*.7;ca*=e}
      if(ao==='letters'){const q=Math.min(1,Math.max(0,((.7-rem)-(nAll-1-gi)*.035)/.25));if(q>=1)continue;cs*=1-q;ca*=1-q}
      if(lp==='wave')cdy+=Math.sin(loc*5-gi*.55)*size*.13;
      if(lp==='rainbow')col=`hsl(${(gi*28+loc*150)%360},92%,64%)`;
      if(wOf){const wi=wOf[gi];if(lp==='wordpop'&&wi>wCur)continue;if(wi===wCur){col=p.kcol||'#facc15';cs*=lp==='wordpop'?.6+.52*backOut(wQ):1.12}}
      g.save();g.globalAlpha=al*ca;g.translate(x0+cw/2,y+cdy);if(cs!==1)g.scale(cs,cs);paint(ch,-cw/2,0,col);g.restore();
    }
    gi+=chars.length-tc.length;
  });
  // curseur de la machine à écrire « clavier »
  if(an==='typec'&&curX!=null&&(left<0||Math.floor(loc*2.2)%2===0)){g.fillStyle=fillAt(curY);g.globalAlpha=al;g.fillRect(curX+size*.06,curY-size*.42,Math.max(2,size*.07),size*.84)}
  g.restore();
}
const gcv=document.createElement('canvas'),gctx=gcv.getContext('2d');
function drawOverlay(c,t){
  const fr=xf&&xf.get(c.id),el=fr?fr.img:getEl(c),p=c.p,m=mById(c.mid);if(!el||!m)return;
  const vid=m.type==='video',vw=fr?fr.w:vid?el.videoWidth:el.naturalWidth,vh=fr?fr.h:vid?el.videoHeight:el.naturalHeight;
  if(!vw||!vh||(!fr&&vid&&el.readyState<2))return;
  const[sx,sy,sw,sh]=cropRect(p,vw,vh),w=W*(p.scale??30)/100,h=w*sh/sw,cx=W*(p.x??50)/100,cy=H*(p.y??50)/100,op=(p.op??100)/100;
  ctx.save();ctx.globalAlpha=op;ctx.filter=colFilter(p);
  ctx.translate(cx,cy);if(p.rot)ctx.rotate(p.rot*Math.PI/180);if(p.flip)ctx.scale(-1,1);
  if(p.glitch&&hash(Math.floor(t*10)+c.id)<.5){const s=w*.015;ctx.globalAlpha=op/2;ctx.globalCompositeOperation='screen';
    ctx.drawImage(el,sx,sy,sw,sh,-w/2-s,-h/2,w,h);ctx.drawImage(el,sx,sy,sw,sh,-w/2+s,-h/2,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=op}
  if(p.shd){ctx.save();ctx.filter='none';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=Math.max(w,h)*.06;ctx.shadowOffsetY=Math.max(w,h)*.02;ctx.fillStyle='#000000';ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,p.round?Math.min(w,h)*p.round/200:0);ctx.fill();ctx.restore()}
  if(p.round){ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*p.round/200);ctx.clip()}
  if(hasGrade(p.col)){
    const gw=Math.max(1,Math.round(w)),gh=Math.max(1,Math.round(h));if(gcv.width!==gw||gcv.height!==gh){gcv.width=gw;gcv.height=gh}else gctx.clearRect(0,0,gw,gh);
    gctx.filter=colFilter(p);gctx.drawImage(el,sx,sy,sw,sh,0,0,gw,gh);gctx.filter='none';
    applyGrade(gctx,0,0,gw,gh,p.col,t);
    gctx.save();gctx.globalCompositeOperation='destination-in';gctx.drawImage(el,sx,sy,sw,sh,0,0,gw,gh);gctx.restore();
    ctx.filter='none';ctx.drawImage(gcv,-w/2,-h/2,w,h);
  }else ctx.drawImage(el,sx,sy,sw,sh,-w/2,-h/2,w,h);
  if(p.bw>0){const lw=p.bw*H/720;ctx.filter='none';ctx.globalAlpha=op;ctx.lineWidth=lw;ctx.strokeStyle=p.bc||'#ffffff';ctx.beginPath();ctx.roundRect(-w/2+lw/2,-h/2+lw/2,Math.max(1,w-lw),Math.max(1,h-lw),Math.max(0,(p.round?Math.min(w,h)*p.round/200:0)-lw/2));ctx.stroke()}
  ctx.restore();
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:p.rot||0});
}
const TR_CATS={
  basic:['none','fade','black','flash','dreamy','burn','colorflash','leaksweep','colorphase'],
  slide:['slide','slideright','slideup','slidedown','slidediag','push','pushup','uncover','split','whip','motionslide','bounce','filmroll'],
  wipe:['wipe','wipeup','diagwipe','barn','softwipe','wavewipe','zigzag','blinds','checker','clock','sunburst','spiral','luma','wind','vblinds','pinwheel'],
  shape:['iris','circleclose','heart','star','diamond','hexagons','polka','mosaicgl','randomsq','tiles','circles','portal'],
  zoom:['zoom','zoomout','zoomthrough','pop','spin','roll','tornado','stretch','zoomblur'],
  d3:['cube','doorway','page','swing','gridflip','flip'],
  fxt:['blur','pixel','glitch','glitchd','chroma','dissolve','burnholes','ink','ripple','swirl','kaleidot','crosswarp','morph','wavy','shake','melt','tvoff']
};
const TRN={colorphase:'tr.colorPhase',wind:'tr.wind',vblinds:'tr.vblinds',pinwheel:'tr.pinwheel',tiles:'tr.tiles',circles:'tr.circles',portal:'tr.portal',melt:'tr.melt',tvoff:'tr.tvOff',none:'common.noneF',fade:'tr.fade',black:'tr.black',flash:'tr.flash',zoom:'tr.zoomIn',zoomout:'tr.zoomOut',slide:'tr.slide',slideup:'tr.slideUp',wipe:'tr.wipe',wipeup:'tr.wipeUp',iris:'shape.circle',clock:'tr.clock',spin:'tr.spin',blur:'fx.blur',pixel:'fx.pixel',glitch:'tr.glitch',
  dreamy:'tr.dreamy',burn:'tr.burn',slideright:'tr.slideRight',slidedown:'tr.slideDown',push:'tr.push',pushup:'tr.pushUp',split:'tr.split',whip:'tr.whip',diagwipe:'tr.diagWipe',barn:'tr.barn',blinds:'tr.blinds',checker:'tr.checker',luma:'tr.luma',
  heart:'tr.heart',star:'tr.star',diamond:'tr.diamond',tornado:'tr.tornado',flip:'tr.flip',stretch:'tr.stretch',zoomblur:'tr.zoomBlur',glitchd:'tr.glitchDigital',chroma:'tr.chroma',dissolve:'tr.dissolve',ripple:'tr.ripple',swirl:'tr.swirl',crosswarp:'tr.crosswarp',morph:'tr.morph',wavy:'tr.wavy',
  colorflash:'tr.colorFlash',leaksweep:'tr.leakSweep',slidediag:'tr.slideDiag',uncover:'tr.uncover',motionslide:'tr.motionSlide',bounce:'tr.bounce',filmroll:'tr.filmRoll',softwipe:'tr.softWipe',wavewipe:'tr.waveWipe',zigzag:'tr.zigzag',sunburst:'tr.sunburst',spiral:'tr.spiral',
  circleclose:'tr.circleClose',hexagons:'tr.hexagons',polka:'tr.polka',mosaicgl:'tr.mosaic',randomsq:'tr.randomSquares',zoomthrough:'tr.zoomThrough',pop:'tr.pop',roll:'tr.roll',
  cube:'tr.cube',doorway:'tr.doorway',page:'tr.page',swing:'tr.swing',gridflip:'tr.gridFlip',burnholes:'tr.burnHoles',ink:'tr.ink',kaleidot:'tr.kaleido',shake:'tr.shake'};
const TRCATN={basic:'trcat.basic',slide:'trcat.slide',wipe:'trcat.wipe',shape:'trcat.shape',zoom:'trcat.zoom',d3:'trcat.d3',fxt:'trcat.fx'};
/* q = visibilité du clip pendant sa transition (0 = caché, 1 = visible) */
function trans(c,t){
  const p=c.p,d=Math.max(.05,p.tdur||.5),loc=t-c.start,ti=p.tin||'none',to=p.tout||'none';
  const qi=ti!=='none'&&loc<d?loc/d:1,qo=to!=='none'&&c.dur-loc<d?(c.dur-loc)/d:1;
  if(qi>=1&&qo>=1)return null;
  return qi<=qo?{q:Math.max(0,qi),type:ti,isIn:true}:{q:Math.max(0,qo),type:to,isIn:false};
}
/* transitions calculées par la carte graphique : A = ce qui est dessous, B = le clip qui apparaît (q = 0 → 1) */
const GLTH='precision mediump float;varying vec2 v;uniform sampler2D tA,tB;uniform vec2 res;uniform float q,u;'+
 'vec4 A(vec2 p){return texture2D(tA,clamp(p,0.,1.));}vec4 B(vec2 p){vec4 a=A(p),b=texture2D(tB,clamp(p,0.,1.));return vec4(mix(a.rgb,b.rgb,b.a),1.);}'+
 'float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float bell(){return sin(q*3.14159);}';
const GLTR={
  colorphase:'void main(){vec4 a=A(v),b=B(v);gl_FragColor=vec4(mix(a.r,b.r,smoothstep(0.,.6,q)),mix(a.g,b.g,smoothstep(.2,.8,q)),mix(a.b,b.b,smoothstep(.4,1.,q)),1.);}',
  wind:'void main(){float n=hsh(vec2(floor(v.y*res.y/(4.*max(1.,u))),3.))*.3;float e=q*1.35-n;float k=smoothstep(e-.04,e,v.x);gl_FragColor=mix(B(v),A(v+vec2(.04*bell()*k,0.)),k);}',
  vblinds:'void main(){float f=fract(v.x*10.);gl_FragColor=f<q?B(v):A(v);}',
  pinwheel:'void main(){vec2 d=(v-.5)*vec2(res.x/res.y,1.);float s=fract((atan(d.y,d.x)+3.14159)/(6.2831/8.));gl_FragColor=s<q?B(v):A(v);}',
  tiles:'void main(){vec2 g=fract(v*vec2(res.x/res.y,1.)*7.)-.5;float s=max(abs(g.x),abs(g.y));gl_FragColor=s<q*.52?B(v):A(v);}',
  circles:'void main(){vec2 c=v*vec2(res.x/res.y,1.)*6.;vec2 id=floor(c);float r=length(fract(c)-.5);float st=hsh(id)*.5;float k=clamp((q-st)/.5,0.,1.);gl_FragColor=r<k*.75?B(v):A(v);}',
  portal:'void main(){vec2 ar=vec2(res.x/res.y,1.);float r=length((v-.5)*ar);float R=q*q*1.05;vec4 c=r<R?B(.5+(v-.5)*(1.4-.4*q)):A(.5+(v-.5)*(1.-.15*q));c.rgb+=vec3(.6,.4,1.)*smoothstep(.03,0.,abs(r-R))*bell();gl_FragColor=c;}',
  melt:'void main(){float h=hsh(vec2(floor(v.x*res.x/(10.*max(1.,u))),1.));float off=clamp(q*(1.+h*.8)*1.5-h*.3,0.,2.);vec2 p=vec2(v.x,v.y+off);gl_FragColor=p.y<=1.?A(p):B(v);}',
  tvoff:'void main(){float k=q<.5?q*2.:(1.-q)*2.;float sy=max(1.-k*.985,.012),sx=max(1.-max(0.,k-.85)*6.,.01);vec2 p=vec2((v.x-.5)/sx+.5,(v.y-.5)/sy+.5);if(p.x<0.||p.x>1.||p.y<0.||p.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}vec4 c=q<.5?A(p):B(p);c.rgb=mix(c.rgb,vec3(1.),k*k*.8);gl_FragColor=c;}',
  dreamy:'void main(){float r=bell()*8.*u;vec4 a=vec4(0.),b=vec4(0.);for(int i=0;i<12;i++){float an=float(i)*2.399,rr=sqrt(float(i)/12.)*r;vec2 o=vec2(cos(an),sin(an))*rr/res+vec2(0.,sin(v.x*12.+q*6.)*.01*bell());a+=A(v+o);b+=B(v+o);}vec4 c=mix(a,b,smoothstep(0.,1.,q))/12.;c.rgb+=.12*bell();gl_FragColor=c;}',
  burn:'void main(){vec2 c=vec2(.25+.5*hsh(vec2(3.,7.)),.4);float d=length((v-c)*vec2(res.x/res.y,1.));float f=bell();vec4 m=mix(A(v),B(v),smoothstep(.3,.7,q));m.rgb=mix(m.rgb,vec3(1.,.62,.25),f*f*.55*smoothstep(1.5,0.,d))+vec3(1.,.45,.1)*f*f*.35*smoothstep(1.,0.,d);gl_FragColor=m;}',
  luma:'void main(){float l=lum(texture2D(tB,v).rgb);float e=q*1.3-.15;gl_FragColor=mix(A(v),B(v),smoothstep(l-.12,l+.12,e));}',
  zoomblur:'void main(){vec2 d=v-.5;float k=bell()*.35;vec4 a=vec4(0.),b=vec4(0.);for(int i=0;i<14;i++){float f=1.-k*float(i)/13.;a+=A(.5+d*f);b+=B(.5+d*f);}gl_FragColor=mix(a,b,smoothstep(.35,.65,q))/14.;}',
  glitchd:'void main(){float st=floor(q*14.);vec2 bl=floor(v*vec2(12.,8.));float h=hsh(bl+st);vec2 o=vec2((hsh(bl*1.3+st)-.5)*.2*bell(),0.);bool b=h<q;vec4 c=b?B(v+o*step(.6,h)):A(v+o*step(.6,h));if(hsh(vec2(bl.y,st))<.25*bell())c.rgb=vec3(b?B(v+vec2(.015,0.)).r:A(v+vec2(.015,0.)).r,c.g,b?B(v-vec2(.015,0.)).b:A(v-vec2(.015,0.)).b);gl_FragColor=c;}',
  chroma:'void main(){vec2 o=vec2(.035*bell(),0.);float k=smoothstep(.3,.7,q);gl_FragColor=vec4(mix(A(v+o).r,B(v+o).r,k),mix(A(v).g,B(v).g,k),mix(A(v-o).b,B(v-o).b,k),1.);}',
  dissolve:'void main(){float n=hsh(floor(v*res/max(1.5,2.*u)));float e=q*1.15-.07;vec4 c=n<e-.04?B(v):A(v);if(n>=e-.04&&n<e)c.rgb=mix(c.rgb,vec3(1.,.6,.2),.85);gl_FragColor=c;}',
  ripple:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d);vec2 o=normalize(d+1e-5)/ar*sin(r*55.-q*22.)*.025*bell();gl_FragColor=mix(A(v+o),B(v+o),smoothstep(.25,.75,q));}',
  swirl:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d),k=max(0.,1.-r/.7);float an=bell()*5.*k*k;float cs=cos(an),sn=sin(an);vec2 p=.5+vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs)/ar;gl_FragColor=mix(A(p),B(p),smoothstep(.35,.65,q));}',
  crosswarp:'void main(){float x=smoothstep(0.,1.,q*2.+v.x-1.);gl_FragColor=mix(A(mix(v,vec2(.5,v.y),x*.9)),B(mix(v,vec2(.5,v.y),(1.-x)*.9)),x);}',
  morph:'void main(){float la=lum(A(v).rgb),lb=lum(B(v).rgb);vec2 oa=vec2(la-.5,lb-.5)*.12*q,ob=vec2(lb-.5,la-.5)*.12*(1.-q);gl_FragColor=mix(A(v+oa),B(v-ob),smoothstep(0.,1.,q));}',
  wavy:'void main(){float b=bell();vec2 p=v+vec2(sin(v.y*24.+q*12.)*.03*b,cos(v.x*18.+q*9.)*.02*b);gl_FragColor=mix(A(p),B(p),smoothstep(.3,.7,q));}',
  cube:'void main(){float z=1.+.18*bell();vec2 p=(v-.5)*z+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}float x0=1.-q,k=.22*bell();vec4 c;if(p.x<x0){float ua=p.x/max(x0,1e-4);float sc=1.-k*(1.-ua);float y=(p.y-.5)/sc+.5;c=(y<0.||y>1.)?vec4(0.,0.,0.,1.):A(vec2(ua,y));c.rgb*=1.-.5*q;}else{float ub=(p.x-x0)/max(1.-x0,1e-4);float sc=1.-k*ub;float y=(p.y-.5)/sc+.5;c=(y<0.||y>1.)?vec4(0.,0.,0.,1.):B(vec2(ub,y));c.rgb*=.5+.5*q;}gl_FragColor=c;}',
  doorway:'void main(){float hw=.5*(1.-q);float s=.6+.4*q;vec2 pb=(v-.5)/s+.5;vec4 c=(pb.x<0.||pb.x>1.||pb.y<0.||pb.y>1.)?vec4(0.,0.,0.,1.):B(pb);c.rgb*=.4+.6*q;if(v.x<hw){float f=v.x/max(hw,1e-4);float sc=1.+.3*q*f;float y=(v.y-.5)/sc+.5;if(y>=0.&&y<=1.)c=A(vec2(f*.5,y))*(1.-.4*q);}else if(v.x>1.-hw){float f=(1.-v.x)/max(hw,1e-4);float sc=1.+.3*q*f;float y=(v.y-.5)/sc+.5;if(y>=0.&&y<=1.)c=A(vec2(1.-f*.5,y))*(1.-.4*q);}gl_FragColor=vec4(c.rgb,1.);}',
  page:'void main(){vec2 d=normalize(vec2(1.,.35));float p=dot(v,d);float e=mix(1.35,-.25,q),w=.16;vec4 c;if(p>e){c=B(v);c.rgb*=1.-.45*exp(-(p-e)*25.);}else if(p>e-w){vec2 m=v+d*2.*(e-p);c=(m.x>1.||m.y>1.||m.x<0.||m.y<0.)?A(v):vec4(mix(A(m).rgb,vec3(.95),.55)*(.75+.25*(e-p)/w),1.);}else{c=A(v);}gl_FragColor=c;}',
  gridflip:'void main(){vec2 n=vec2(8.,5.);vec2 id=floor(v*n),f=fract(v*n);float dl=(id.x/(n.x-1.)*.65+(n.y-1.-id.y)/(n.y-1.)*.35)*.7+hsh(id)*.08;float lp=clamp((q-dl)/.25,0.,1.);float sx=abs(1.-2.*lp);float x=(f.x-.5)/max(sx,1e-3)+.5;vec4 c=vec4(.12,.12,.15,1.);if(x>=0.&&x<=1.){vec2 uv=(id+vec2(x,f.y))/n;c=lp<.5?A(uv):B(uv);c.rgb*=.55+.45*sx;}gl_FragColor=c;}',
  hexagons:'vec2 hx(vec2 p){vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;return dot(a,a)<dot(b,b)?p-a:p-b;}void main(){float cs=34.*u;vec2 pp=v*res/cs;vec2 c=hx(pp);float t=length(c*cs/res-.5)*.9+hsh(c)*.3;float k=smoothstep(t,t+.06,q*1.45-.1);gl_FragColor=mix(A(v),B(v),k);}',
  polka:'void main(){float cs=46.*u;vec2 g=v*res/cs;vec2 f=fract(g)-.5;float r=length(f);float rr=q*.75;gl_FragColor=mix(A(v),B(v),smoothstep(rr+.02,rr-.02,r)+step(.99,q));}',
  mosaicgl:'void main(){vec2 n=vec2(16.,9.);vec2 id=floor(v*n);float h=hsh(id);gl_FragColor=mix(A(v),B(v),smoothstep(h,h+.08,q*1.1-.05));}',
  spiral:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float an=atan(d.y,d.x)/6.2832+.5;float r=length(d);float k=fract(an+r*2.5);float t=(k+floor(r*2.5))/3.2;gl_FragColor=mix(A(v),B(v),smoothstep(t,t+.04,q*1.05));}',
  motionslide:'void main(){vec4 s=vec4(0.);for(int i=0;i<12;i++){float f=(float(i)/11.-.5)*.12*bell();float x=v.x+f;s+=x>1.-q?B(vec2(x-(1.-q),v.y)):A(vec2(x+q,v.y));}gl_FragColor=s/12.;}',
  ink:'float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+vec2(1.,1.)),f.x),f.y);}float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*nz(p);p*=2.03;a*=.5;}return s;}void main(){vec2 ar=vec2(res.x/res.y,1.);float n=fbm(v*ar*3.)*.75+length((v-.5)*ar)*.55;float e=q*1.35-.05;float k=smoothstep(n,n+.03,e);vec4 c=mix(A(v),B(v),k);float edge=smoothstep(.06,0.,abs(e-n));c.rgb*=1.-.7*edge*bell();gl_FragColor=c;}',
  burnholes:'float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+vec2(1.,1.)),f.x),f.y);}void main(){vec2 ar=vec2(res.x/res.y,1.);float n=nz(v*ar*5.)*.6+nz(v*ar*13.)*.4;float e=q*1.2-.1;vec4 c=n<e-.05?B(v):A(v);if(n>=e-.05&&n<e-.02)c.rgb=vec3(.05);else if(n>=e-.02&&n<e)c.rgb=vec3(1.,.55,.1)*1.3;gl_FragColor=c;}',
  kaleidot:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float b=bell();float an=atan(d.y,d.x),r=length(d);float seg=6.2832/6.;float a2=abs(mod(an+q*2.,seg)-seg*.5);vec2 k=vec2(cos(a2),sin(a2))*r/ar+.5;vec2 p=mix(v,k,b);gl_FragColor=mix(A(p),B(p),smoothstep(.35,.65,q));}'
};
let glTexB=null,glTrProg={};
function glTrProgram(k){
  if(glTrProg[k]!==undefined)return glTrProg[k];
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn('transition',k,gl.getShaderInfoLog(o));return null}return o};
  const vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'),fsh=sh(gl.FRAGMENT_SHADER,GLTH+GLTR[k]);
  if(!vs||!fsh)return glTrProg[k]=null;
  const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fsh);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return glTrProg[k]=null;
  const loc={p:gl.getAttribLocation(pr,'p')};for(const n of['tA','tB','res','q','u'])loc[n]=gl.getUniformLocation(pr,n);
  return glTrProg[k]={pr,loc};
}
function glTex2(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);return t}
/* renvoie false si la carte graphique n'est pas utilisable (la transition devient alors un fondu) */
function glTrans(k,q,m,L){
  if(!glSetup())return false;const P=glTrProgram(k);if(!P)return false;
  if(!glTexB)glTexB=glTex2();
  const cw=m.canvas.width,ch=m.canvas.height;
  if(glc.width<cw||glc.height<ch){glc.width=Math.max(glc.width,cw);glc.height=Math.max(glc.height,ch)}
  gl.viewport(0,0,cw,ch);gl.useProgram(P.pr);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,glTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,m.canvas);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,glTexB);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,L);
  gl.enableVertexAttribArray(P.loc.p);gl.vertexAttribPointer(P.loc.p,2,gl.FLOAT,false,0,0);
  gl.uniform1i(P.loc.tA,0);gl.uniform1i(P.loc.tB,1);gl.uniform2f(P.loc.res,cw,ch);gl.uniform1f(P.loc.q,clamp(q,0,1));gl.uniform1f(P.loc.u,Math.max(.12,ch/720));
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.activeTexture(gl.TEXTURE0);
  m.save();m.setTransform(1,0,0,1,0,0);m.globalAlpha=1;m.filter='none';m.globalCompositeOperation='copy';m.drawImage(glc,0,glc.height-ch,cw,ch,0,0,cw,ch);m.restore();
  return true;
}
function starPath(m,cx,cy,r,n=5){m.beginPath();for(let i=0;i<n*2;i++){const rr=i%2?r*.45:r,an=-Math.PI/2+i*Math.PI/n;m.lineTo(cx+Math.cos(an)*rr,cy+Math.sin(an)*rr)}m.closePath()}
/* q = visibilité du clip (0 → 1) ; m = image du dessous, L = calque du clip ; les aperçus passent leurs propres canvas */
function compose(tr,bl='source-over',m=mctx,L=lcv,LC=lctx){
  const q=tr.q,dir=tr.isIn?1:-1,R=Math.hypot(W,H)/2;
  if(GLTR[tr.type]&&bl==='source-over'&&glTrans(tr.type,q,m,L))return;
  m.save();m.globalCompositeOperation=bl;
  const copyBase=()=>{fxTmp.width=W;fxTmp.height=H;fxTmpCtx.drawImage(m.canvas,0,0,W,H,0,0,W,H)};
  switch(tr.type){
    case 'fade':m.globalAlpha=q;m.drawImage(L,0,0);break;
    case 'black':m.drawImage(L,0,0);m.globalCompositeOperation='source-over';m.globalAlpha=1-q;m.fillStyle='#000';m.fillRect(0,0,W,H);break;
    case 'flash':m.drawImage(L,0,0);m.globalCompositeOperation='source-over';m.globalAlpha=Math.pow(1-q,1.5);m.fillStyle='#fff';m.fillRect(0,0,W,H);break;
    case 'glitch':{
      const n=Math.round(16*(1-q)),sh=W*.03*(1-q);
      for(let i=0;i<n;i++){const y=Math.random()*H,h=6+Math.random()*80,dx=(Math.random()-.5)*400*(1-q);LC.drawImage(L,0,y,W,h,dx,y,W,h)}
      m.globalCompositeOperation='screen';m.globalAlpha=.5*(1-q);m.drawImage(L,-sh,0);m.drawImage(L,sh,0);
      m.globalCompositeOperation=bl;m.globalAlpha=Math.random()<q+.2?1:.3;m.drawImage(L,0,0);break}
    case 'zoom':{const k=1+(1-q)*.6;m.globalAlpha=q;m.translate(W/2,H/2);m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'zoomout':{const k=1-(1-q)*.45;m.globalAlpha=q;m.translate(W/2,H/2);m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'slide':m.drawImage(L,dir*(1-q)*W,0);break;
    case 'slideright':m.drawImage(L,-dir*(1-q)*W,0);break;
    case 'slideup':m.drawImage(L,0,dir*(1-q)*H);break;
    case 'slidedown':m.drawImage(L,0,-dir*(1-q)*H);break;
    case 'push':case 'pushup':{
      const hz=tr.type==='push',d=dir*(hz?W:H);copyBase();m.globalCompositeOperation='copy';
      m.drawImage(fxTmp,hz?-q*d:0,hz?0:-q*d);m.globalCompositeOperation=bl;m.drawImage(L,hz?(1-q)*d:0,hz?0:(1-q)*d);break}
    case 'split':{copyBase();m.drawImage(L,0,0);const o=q*W/2;m.drawImage(fxTmp,0,0,W/2,H,-o,0,W/2,H);m.drawImage(fxTmp,W/2,0,W/2,H,W/2+o,0,W/2,H);break}
    case 'whip':{const x=dir*(1-q)*W;for(let i=0;i<5;i++){m.globalAlpha=i===4?1:.18*(1-q)+.04;m.drawImage(L,x+dir*(4-i)*W*.06*(1-q),0)}break}
    case 'wipe':m.beginPath();m.rect(0,0,W*q,H);m.clip();m.drawImage(L,0,0);break;
    case 'wipeup':m.beginPath();m.rect(0,H*(1-q),W,H*q);m.clip();m.drawImage(L,0,0);break;
    case 'diagwipe':{const k=q*(W+H)*1.02;m.beginPath();m.moveTo(0,0);m.lineTo(k,0);m.lineTo(k-H,H);m.lineTo(0,H);m.closePath();m.clip();m.drawImage(L,0,0);break}
    case 'barn':m.beginPath();m.rect((1-q)*W/2,0,q*W,H);m.clip();m.drawImage(L,0,0);break;
    case 'blinds':{const n=10,sh=H/n;m.beginPath();for(let i=0;i<n;i++)m.rect(0,i*sh,W,sh*q);m.clip();m.drawImage(L,0,0);break}
    case 'checker':{const nx=8,ny=Math.max(4,Math.round(8*H/W)),cw=W/nx,ch=H/ny;m.beginPath();for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const st=hash(x*7+y*13)*.6,k=clamp((q-st)/.4,0,1);if(k>0)m.rect(x*cw+cw*(1-k)/2,y*ch+ch*(1-k)/2,cw*k,ch*k)}m.clip();m.drawImage(L,0,0);break}
    case 'clock':m.beginPath();m.moveTo(W/2,H/2);m.arc(W/2,H/2,Math.hypot(W,H),-Math.PI/2,-Math.PI/2+q*TAU);m.closePath();m.clip();m.drawImage(L,0,0);break;
    case 'iris':m.beginPath();m.arc(W/2,H/2,R*q,0,7);m.clip();m.drawImage(L,0,0);break;
    case 'heart':heartPath(m,W/2,H/2+R*q*.25,R*q*2.6);m.clip();m.drawImage(L,0,0);break;
    case 'star':starPath(m,W/2,H/2,R*q*2.2);m.clip();m.drawImage(L,0,0);break;
    case 'diamond':{const r=R*q*1.45;m.beginPath();m.moveTo(W/2,H/2-r);m.lineTo(W/2+r,H/2);m.lineTo(W/2,H/2+r);m.lineTo(W/2-r,H/2);m.closePath();m.clip();m.drawImage(L,0,0);break}
    case 'spin':{m.globalAlpha=q;m.translate(W/2,H/2);m.rotate(-dir*(1-q)*Math.PI*.7);const k=.4+.6*q;m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'tornado':{m.globalAlpha=Math.min(1,q*1.5);m.translate(W/2,H/2);m.rotate(-dir*Math.pow(1-q,2)*TAU*1.5);const k=Math.max(.01,q);m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'flip':{
      copyBase();m.globalCompositeOperation='copy';m.fillStyle='#000';m.fillRect(0,0,W,H);m.globalCompositeOperation=bl;m.translate(W/2,0);
      if(q<.5){m.scale(Math.max(.001,1-2*q),1);m.drawImage(fxTmp,-W/2,0)}else{m.scale(Math.max(.001,2*q-1),1);m.drawImage(L,-W/2,0)}break}
    case 'stretch':{m.globalAlpha=Math.min(1,q*1.6);m.translate(W/2,H/2);m.scale(1+Math.pow(1-q,2)*3,Math.max(.05,q));m.drawImage(L,-W/2,-H/2);break}
    case 'slidediag':m.drawImage(L,dir*(1-q)*W,dir*(1-q)*H);break;
    case 'uncover':{copyBase();m.drawImage(L,0,0);m.drawImage(fxTmp,-dir*q*W,0);break}
    case 'bounce':{const b=x=>{const n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d)return n*(x-=1.5/d)*x+.75;if(x<2.5/d)return n*(x-=2.25/d)*x+.9375;return n*(x-=2.625/d)*x+.984375};m.drawImage(L,0,-(1-b(q))*H);break}
    case 'pop':{const c1=1.70158,c3=c1+1,e=1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);m.globalAlpha=Math.min(1,q*3);m.translate(W/2,H/2);const k=Math.max(.01,e);m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'swing':{const k=Math.max(.01,q);m.globalAlpha=Math.min(1,q*2);m.setTransform(k,-(1-q)*.18*H/W*k,0,1,0,0);m.drawImage(L,0,0);break}
    case 'roll':{m.globalAlpha=Math.min(1,q*2);m.translate(W/2,H/2);m.rotate(-dir*(1-q)*TAU);const k=.2+.8*q;m.scale(k,k);m.drawImage(L,-W/2,-H/2);break}
    case 'zoomthrough':{copyBase();m.globalCompositeOperation='copy';m.translate(W/2,H/2);const a=1+q*1.6;m.scale(a,a);m.drawImage(fxTmp,-W/2,-H/2);m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation=bl;m.globalAlpha=Math.min(1,q*1.4);m.translate(W/2,H/2);const b=1.35-.35*q;m.scale(b,b);m.drawImage(L,-W/2,-H/2);break}
    case 'softwipe':{const f=W*.25,x=q*(W+f)-f;fxTmp.width=W;fxTmp.height=H;fxTmpCtx.clearRect(0,0,W,H);fxTmpCtx.drawImage(L,0,0);fxTmpCtx.globalCompositeOperation='destination-in';const g=fxTmpCtx.createLinearGradient(x,0,x+f,0);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');fxTmpCtx.fillStyle=g;fxTmpCtx.fillRect(0,0,W,H);fxTmpCtx.globalCompositeOperation='source-over';m.drawImage(fxTmp,0,0);break}
    case 'wavewipe':{m.beginPath();m.moveTo(0,0);const x0=q*W*1.12;for(let y=0;y<=H;y+=H/40)m.lineTo(x0+Math.sin(y/H*Math.PI*4+q*10)*W*.05-W*.06,y);m.lineTo(0,H);m.closePath();m.clip();m.drawImage(L,0,0);break}
    case 'zigzag':{m.beginPath();m.moveTo(0,0);const x0=q*W*1.12,n=12;for(let i=0;i<=n;i++)m.lineTo(x0+(i%2?W*.05:-W*.05)-W*.06,i*H/n);m.lineTo(0,H);m.closePath();m.clip();m.drawImage(L,0,0);break}
    case 'sunburst':{const n=24,sp=TAU/n,R2=Math.hypot(W,H);m.beginPath();for(let i=0;i<n;i++){const a0=i*sp;m.moveTo(W/2,H/2);m.arc(W/2,H/2,R2,a0,a0+sp*q);m.closePath()}m.clip();m.drawImage(L,0,0);break}
    case 'circleclose':{copyBase();m.drawImage(L,0,0);m.beginPath();m.arc(W/2,H/2,R*(1-q),0,TAU);m.clip();m.drawImage(fxTmp,0,0);break}
    case 'randomsq':{const nx=12,ny=Math.max(5,Math.round(12*H/W)),cw=W/nx,ch=H/ny;m.beginPath();for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(hash(x*31+y*17+5)<q)m.rect(x*cw,y*ch,cw+.5,ch+.5);m.clip();m.drawImage(L,0,0);break}
    case 'filmroll':{
      copyBase();const d=dir*H*1.06;m.globalCompositeOperation='copy';m.fillStyle='#000';m.fillRect(0,0,W,H);m.globalCompositeOperation=bl;
      m.drawImage(fxTmp,0,-q*d);m.drawImage(L,0,(1-q)*d);
      const b=Math.sin(q*Math.PI),hw=W*.035;if(b>.02){m.globalAlpha=b;m.fillStyle='#111';m.fillRect(0,0,hw,H);m.fillRect(W-hw,0,hw,H);m.fillStyle='#f4efe4';const st=H/9,off=(q*H*3)%st;for(let y=-st;y<H+st;y+=st){m.fillRect(hw*.3,y+off,hw*.4,st*.45);m.fillRect(W-hw*.7,y+off,hw*.4,st*.45)}}break}
    case 'shake':{const b=Math.sin(q*Math.PI),k=b*30*Math.max(.12,H/720),an=Math.random()*TAU;copyBase();m.globalCompositeOperation='copy';m.drawImage(fxTmp,Math.cos(an)*k,Math.sin(an)*k);m.globalCompositeOperation=bl;m.globalAlpha=q;m.drawImage(L,Math.cos(an)*k,Math.sin(an)*k);break}
    case 'colorflash':{m.globalAlpha=q;m.drawImage(L,0,0);m.globalAlpha=Math.pow(Math.sin(q*Math.PI),2)*.85;m.globalCompositeOperation='screen';m.fillStyle='#ff3cb4';m.fillRect(0,0,W,H);break}
    case 'leaksweep':{m.globalAlpha=q;m.drawImage(L,0,0);m.globalAlpha=1;m.globalCompositeOperation='screen';const b=Math.sin(q*Math.PI),x=(q*1.6-.3)*W,g=m.createRadialGradient(x,H*.4,0,x,H*.4,Math.max(W,H)*.7);g.addColorStop(0,'rgba(255,170,70,'+(.9*b)+')');g.addColorStop(.5,'rgba(255,80,60,'+(.45*b)+')');g.addColorStop(1,'rgba(255,80,60,0)');m.fillStyle=g;m.fillRect(0,0,W,H);break}
    case 'blur':m.filter='blur('+((1-q)*30)+'px)';m.globalAlpha=q;m.drawImage(L,0,0);break;
    case 'pixel':pixelate(L,LC,Math.max(1,Math.round((1-q)*70*Math.max(.12,H/720))));m.globalAlpha=Math.min(1,q*2.5);m.drawImage(L,0,0);break;
    default:
      if(GLTR[tr.type]){m.globalAlpha=q;m.drawImage(L,0,0);break} // sans carte graphique : simple fondu
      m.drawImage(L,0,0);
  }
  m.restore();
}
const hasMask=p=>p.mask&&p.mask.type&&p.mask.type!=='none'&&(p.mask.type!=='free'||(Array.isArray(p.mask.pts)&&p.mask.pts.length>2));
/* contour lissé passant par les milieux des points */
function smoothPath(g,P){g.moveTo((P[0][0]+P[P.length-1][0])/2,(P[0][1]+P[P.length-1][1])/2);for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];g.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}g.closePath()}
function applyMask(p){
  if(!hasMask(p))return;const k=p.mask;
  if(kcv.width!==W||kcv.height!==H){kcv.width=W;kcv.height=H}else kctx.clearRect(0,0,W,H);
  const cx=W*(k.x??50)/100,cy=H*(k.y??50)/100,w=W*(k.w??60)/100,h=H*(k.h??60)/100,f=(k.feather||0)*Math.min(W,H)/300;
  kctx.save();kctx.filter=f>0?`blur(${f}px)`:'none';kctx.fillStyle='#fff';kctx.beginPath();
  if(k.type==='circle')kctx.ellipse(cx,cy,Math.max(1,w/2),Math.max(1,h/2),0,0,TAU);
  else if(k.type==='rect')kctx.roundRect(cx-w/2,cy-h/2,Math.max(1,w),Math.max(1,h),Math.min(w,h)/2*(k.r||0)/100);
  else if(k.type==='free'){const sx=(k.w??100)/100,sy=(k.h??100)/100;smoothPath(kctx,k.pts.map(([x,y])=>[cx+(W*x/100-W/2)*sx,cy+(H*y/100-H/2)*sy]))}
  else{kctx.translate(cx,cy);kctx.rotate((k.ang||0)*Math.PI/180);const B=W+H;kctx.rect(-B,0,2*B,B)}
  kctx.fill();kctx.restore();
  ctx.save();ctx.globalCompositeOperation=k.inv?'destination-out':'destination-in';ctx.drawImage(kcv,0,0);ctx.restore();
}
function render(t){
  boxes.clear();
  ctx=mctx;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=bgColor;ctx.fillRect(0,0,W,H);
  const act=clips.filter(c=>t>=c.start&&t<c.start+c.dur&&!trk(c).hide);
  let nb=0;
  for(const ti of visualOrder()){
  if(tracks[ti].kind==='video')act.filter(c=>c.track===ti).sort((a,b)=>a.start-b.start).forEach(c0=>{const i=nb++;
    const c=anim(c0,t),p=c.p,tr=trans(c,t),op=p.op??100,bl=p.blend||'source-over';
    if(!tr&&i===0&&!keyOn(p)&&op>=100&&!hasMask(p)&&bl==='source-over'){drawBase(c,t);return}
    ctx=lctx;lctx.clearRect(0,0,W,H);drawBase(c,t);applyMask(p);
    if(op<100){lctx.save();lctx.globalCompositeOperation='destination-in';lctx.fillStyle=`rgba(0,0,0,${op/100})`;lctx.fillRect(0,0,W,H);lctx.restore()}
    ctx=mctx;compose(tr||{q:1,type:'none'},bl);
  });
  else act.filter(c=>c.track===ti).forEach(c0=>{
    const c=anim(c0,t),p=c.p,bl=p.blend||'source-over',ck=c.mid&&keyOn(p);
    const draw=()=>c.gen?drawGenOverlay(c,t):c.mid?drawOverlay(c,t):drawText(c,t);
    if(!hasMask(p)&&!ck&&bl==='source-over'){draw();return}
    ctx=lctx;lctx.clearRect(0,0,W,H);draw();if(ck)chromaKey(c,t);applyMask(p);ctx=mctx;
    mctx.save();mctx.globalCompositeOperation=bl;mctx.drawImage(lcv,0,0);mctx.restore();
  });
  }
}
function drawSel(){
  const c=selClip();if(!c||exporting||isAud(c))return;
  const b=boxes.get(c.id);if(!b||(b.w>=W&&b.h>=H&&!b.x&&!b.y&&c.gen))return;
  const m=mctx,s=W/Math.max(1,cv.clientWidth);
  m.save();m.translate(b.x+b.w/2,b.y+b.h/2);if(b.rot)m.rotate(b.rot*Math.PI/180);
  m.lineWidth=1.5*s;m.strokeStyle='#ffffff';m.shadowColor='#0009';m.shadowBlur=3*s;m.strokeRect(-b.w/2,-b.h/2,b.w,b.h);m.shadowBlur=0;
  if(sizeKey(c)){m.fillStyle='#fff';m.strokeStyle=ACC;m.lineWidth=2*s;
    for(const[x,y]of[[-1,-1],[1,-1],[-1,1],[1,1]]){m.beginPath();m.arc(x*b.w/2,y*b.h/2,5*s,0,TAU);m.fill();m.stroke()}}
  m.restore();
}
function volAt(c,t){
  let v=((c.kf?anim(c,t).p.vol:c.p.vol)??100)/100;
  if(trk(c).mute||(tracks.some(x=>x.solo)&&!trk(c).solo))v=0; // solo : on n'entend que les pistes en solo
  if(isVid(c)){const tr=trans(c,t);if(tr)v*=tr.q}
  const loc=t-c.start,fi=c.p.afin??c.p.afade??0,fo=c.p.afout??c.p.afade??0;
  if(fi>0)v*=clamp(loc/fi,0,1);if(fo>0)v*=clamp((c.dur-loc)/fo,0,1);
  return clamp(v,0,4);
}
function syncMedia(){
  for(const c of clips){
    const m=c.mid&&mById(c.mid);if(!m||m.type==='image')continue;
    const on=time>=c.start&&time<c.start+c.dur;
    if(!on){const e=els.get(c.id);if(e&&!e.paused)e.pause();continue}
    const el=getEl(c),sp=clamp(c.p.rate||1,.1,8),want=srcOf(c,time);
    if(!el)continue;
    applyVoice(c);
    {const ch=chains.get(c.id),v=c.p.rev?0:volAt(c,time);if(ch){el.volume=1;ch.g.gain.value=v;chainParams(ch,c.p.au)}else el.volume=Math.min(1,v)}
    if(c.p.rev){if(!el.paused)el.pause();if(Math.abs(el.currentTime-want)>.03)el.currentTime=want;continue}
    if(el.playbackRate!==sp)el.playbackRate=sp;
    if(el.preservesPitch!==!c.p.chip)el.preservesPitch=!c.p.chip;
    if(playing){
      if(el.paused){el.currentTime=want;el.play().catch(()=>{})}
      else if(Math.abs(el.currentTime-want)>.3)el.currentTime=want;
    }else{
      if(!el.paused)el.pause();
      if(Math.abs(el.currentTime-want)>.05)el.currentTime=want;
    }
  }
}

/* ---------- lecture ---------- */
let fastExp=false,xf=null;
let last=0,exporting=false,rec=null,chunks=[],mime='',lastSync=-1,expName='';
function setPlayIcon(){$('#bPlay').innerHTML=ico(playing?'pause':'play',20)}
let loopOn=false;
function loopRange(){const T0=total(),a=clamp(xin??0,0,T0),b=clamp(xout??T0,0,T0);return b-a>.1?[a,b]:[0,T0]}
function toggleLoop(){loopOn=!loopOn;$('#bLoop')?.classList.toggle('on',loopOn);toast(T(loopOn?'pl.on':'pl.off'))}
function jumpEdit(dir){const pts=[...new Set([0,total(),...clips.flatMap(c=>[c.start,c.start+c.dur]),...markers].map(x=>Math.round(x*1000)/1000))].sort((x,y)=>x-y);const t=dir>0?pts.find(x=>x>time+.01):pts.reverse().find(x=>x<time-.01);if(t!=null){pause();seek(t)}}
function play(){
  if(!clips.length)return;
  ensureAudio();actx.resume();
  if(time>=total()-.01)time=0;
  if(loopOn){const lr=loopRange();if(time<lr[0]||time>=lr[1]-.01)time=lr[0]}
  playing=true;setPlayIcon();tickKick();
}
var pausedAt=0;
function pause(){playing=false;pausedAt=performance.now();setPlayIcon();for(const e of els.values())if(e.pause)e.pause()}
// moteur de son du Montage en pause après 15 s sans lecture ni export (processeur, et un flux audio ouvert peut empêcher la veille de Windows)
setInterval(()=>{if(actx&&actx.state==='running'&&!playing&&!exporting&&performance.now()-pausedAt>15000)actx.suspend().catch(()=>{})},3000);
function seek(t){time=clamp(t,0,Math.max(total(),0));wake()}
$('#bPlay').onclick=()=>playing?pause():play();
$('#bStart').onclick=()=>{seek(0);$('#tls').scrollLeft=0};
$('#bEnd').onclick=()=>seek(total());
$('#bLoop').onclick=toggleLoop;
$('#bPrev').onclick=()=>stepFrame(-1);
$('#bNext').onclick=()=>stepFrame(1);
$('#bFull').onclick=()=>{document.fullscreenElement?document.exitFullscreen():$('#vwrap').requestFullscreen().catch(()=>{})};
/* relais : si la fenêtre est cachée ou réduite, l'animation est mise en pause par le navigateur ;
   ce minuteur prend le relais pour que la lecture et l'export continuent */
// le relais ne démarre qu'une fois tout le moteur chargé (17-boot.js) : sur un appareil lent, les morceaux suivants
// (timeline, outils…) ne sont pas encore là et render() échouerait (« visualOrder is not defined »)
let engineReady=false;
setInterval(()=>{if(!engineReady||tickT)return;const n=performance.now();if(n-last>120)tick(n,true)},40);
let lastAct=0,lastDraw=0,tcLast='',pvUnseen=false;
var pvCap=0; // images par seconde max de l'aperçu (0 = sans limite)
// au repos (rien ne joue, pas de geste depuis 1,5 s, ou aperçu invisible) la boucle passe sur un minuteur 4 fois par seconde
// au lieu de se réveiller à chaque image de l'écran (60, 144 fois par seconde) ; un geste ou wake() la relance tout de suite
let tickT=0;
function tickKick(){if(tickT){clearTimeout(tickT);tickT=0;requestAnimationFrame(tick)}}
['pointerdown','pointermove','keydown','wheel','input','change','drop'].forEach(n=>addEventListener(n,()=>{lastAct=performance.now();tickKick()},{capture:true,passive:true}));
function wake(){lastAct=performance.now();tickKick()}
function tick(ts,relay){
  const dt=Math.min(relay?1:.1,(ts-last)/1000);last=ts;
  if(playing){
    time+=dt;
    const lr=loopOn&&!exporting?loopRange():null;
    if(lr&&time>=lr[1]){time=lr[0]}
    else if(time>=total()){
      time=total();
      if(exporting)finishExport(); else pause();
    }
  }
  const idle=!playing&&!exporting&&ts-lastAct>1500;
  const capped=!exporting&&pvCap>0&&ts-lastDraw<1000/pvCap-2; // « fluidité de l'aperçu » (Préférences)
  // aperçu invisible (DedCut réduit, ou autre espace affiché) et rien en cours : on ne redessine pas (processeur, batterie)
  const unseen=!playing&&!exporting&&((typeof appMode!=='undefined'&&appMode!=='edit')||(document.hidden&&!(window.dedcutDetach&&dedcutDetach.isOut('stage'))));
  if(!unseen&&pvUnseen)lastAct=ts; // de retour à l'écran : image tout de suite
  pvUnseen=unseen;
  // au repos : 4 images/s pendant 10 s (fin des chargements), puis 1 image/s
  const idleGap=ts-lastAct>10000?1000:250;
  if(!fastExp&&!capped&&!unseen&&(!idle||ts-lastDraw>idleGap)){lastDraw=ts;render(time);syncMedia();drawSel();drawVU()}
  if(exporting)xProgress(Math.min(1,time/Math.max(total(),.01)),expT0);
  if(!tcEditing){const s='<b>'+fmtTC(time)+'</b> / '+fmtTC(total())+durBadge();if(s!==tcLast){tcLast=s;$('#tc').innerHTML=s}}
  $('#ph').style.left=(time*pxs)+'px';
  if(playing){const s=$('#tls'),x=time*pxs;if(x>s.scrollLeft+s.clientWidth-40||x<s.scrollLeft)s.scrollLeft=Math.max(0,x-60)}
  if(!playing&&time!==lastSync){lastSync=time;const c=selClip();if(c&&c.kf)syncInputs()}
  if(!relay){if(!playing&&!exporting&&(unseen||ts-lastAct>1500))tickT=setTimeout(()=>{tickT=0;requestAnimationFrame(tick)},250);else requestAnimationFrame(tick)}
}

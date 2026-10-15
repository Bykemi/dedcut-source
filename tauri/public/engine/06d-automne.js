/* ---------- pack « Automne & cosy » (v4.67.3) : 10 effets et 10 transitions.
   Effets : coup de vent, guirlande lumineuse, vapeur, coin du feu, reflet de flaque, bruine (catégorie aucozy),
   plus scanner (lumières), pluie de code (écrans), feu d'artifice (particules), lignes de vitesse (stylisés).
   Transitions : calculées par la carte graphique (sans elle : simple fondu, comme les autres).
   Les 10 filtres sont dans 08-inspector.js (catégorie aucozy), les préréglages dans 15-panels.js.
   Tout est dessiné ici par DedCut (formes en code), noms génériques, rien de repris d'autres applis.
   auFX est appelé par applyFX (06-render.js), juste après les effets d'Halloween. ---------- */
const AU_FX=[...FX_CATS.aucozy,'scanlight','coderain','fireworks','speedlines'];
Object.assign(FXN,Object.fromEntries(AU_FX.map(k=>[k,'fx.'+k])));
FXCATN.aucozy='fxcat.aucozy';
const AU_COLS=['#d9480f','#e8590c','#f59f00','#c92a2a','#a0522d','#fab005'];

/* ---------- dessins ---------- */
/** feuille d'érable (5 pointes) de hauteur ~2s, tige vers le bas */
const AU_LEAF=[[0,-1],[.13,-.62],[.38,-.76],[.31,-.43],[.72,-.52],[.6,-.27],[.92,-.13],[.52,.03],[.58,.24],[.2,.13],[.07,.4]];
function auLeaf(g,s){
  g.beginPath();g.moveTo(0,-s);
  for(const[x,y]of AU_LEAF.slice(1))g.lineTo(x*s,y*s);
  for(const[x,y]of AU_LEAF.slice(1).reverse())g.lineTo(-x*s,y*s);
  g.closePath();g.fill();
  g.lineWidth=Math.max(1,s*.08);g.beginPath();g.moveTo(0,.35*s);g.lineTo(0,.8*s);g.stroke();
}

function auFX(fx,t,a,u,n0){
  if(!AU_FX.some(k=>fx[k]))return;
  const cvs=ctx.canvas,S=Math.max(W,H),m=Math.min(W,H);
  // 1) l'image elle-même : reflet de flaque, coin du feu
  if(fx.aupuddle){
    // la moitié basse reflète ce qui est au-dessus de l'horizon, avec des rides qui ondulent (on ne lit que des lignes au-dessus)
    const hz=Math.round(H*(.7-.08*a)),st=Math.max(2,Math.round(2*u));ctx.save();
    for(let y=hz;y<H;y+=st){const d=y-hz,sy=hz-d*.9-st;if(sy<0)break;const dx=Math.sin(d*.09/u+t*3.2)*(2+d*.04)*u*(.5+a);ctx.drawImage(cvs,0,sy,W,st,dx,y,W,st)}
    const g=ctx.createLinearGradient(0,hz,0,H);g.addColorStop(0,'rgba(20,30,45,.18)');g.addColorStop(1,'rgba(10,18,30,'+(.35+.25*a)+')');ctx.fillStyle=g;ctx.fillRect(0,hz,W,H-hz);
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=Math.max(1,u);
    for(let i=0;i<5;i++){const ph=(t*.5+hash(i*7))%1,x=hash(i*7+1)*W,y=hz+(.15+.8*hash(i*7+2))*(H-hz);ctx.globalAlpha=(1-ph)*.8;ctx.beginPath();ctx.ellipse(x,y,ph*90*u,ph*18*u,0,0,TAU);ctx.stroke()}
    ctx.globalAlpha=1;ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,hz-u,W,2*u);ctx.restore();
  }
  if(fx.aufire){
    // lumière chaude qui vacille depuis le bas, comme devant une cheminée
    const f=.85+.08*Math.sin(t*11.3)+.05*Math.sin(t*6.7+2)+.05*(hash(Math.floor(t*14))-.5);ctx.save();
    const dk=ctx.createRadialGradient(W*.5,H*1.05,m*.2,W*.5,H*1.05,S*1.05);dk.addColorStop(0,'rgba(10,4,0,0)');dk.addColorStop(1,'rgba(10,4,0,'+(.15+.45*a)+')');ctx.fillStyle=dk;ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='soft-light';const g=ctx.createRadialGradient(W*.5,H*1.15,m*.1,W*.5,H*1.15,S*(.85+.1*f));
    g.addColorStop(0,'rgba(255,140,40,'+(.95*f)+')');g.addColorStop(.6,'rgba(230,90,20,'+(.55*a*f)+')');g.addColorStop(1,'rgba(60,20,5,'+(.5*a)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='screen';glowDot(W*.5,H*1.05,S*.6*f,'255,120,30',.2+.3*a);
    ctx.globalCompositeOperation='source-over';
    for(let i=0,n=n0(26);i<n;i++){const sp=.12+hash(i*9)*.2,y=1.05-((hash(i*9+1)+t*sp)%1.1),x=.5+(hash(i*9+2)-.5)*.9+Math.sin(t*2+i)*.02,al=Math.max(0,Math.min(1,y*1.6))*(.5+.5*Math.sin(t*9+i));
      glowDot(x*W,y*H,(5+hash(i*9+3)*6)*u,'255,170,60',al);ctx.fillStyle='rgba(255,230,160,'+al+')';ctx.beginPath();ctx.arc(x*W,y*H,1.4*u,0,TAU);ctx.fill()}
    ctx.restore();
  }
  // 2) par-dessus : vapeur, bruine, vent, guirlande, scanner, code, feu d'artifice, lignes de vitesse
  if(fx.austeam){
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let s=0;s<3;s++){const bx=W*(.35+.15*s);
      for(let i=0,n=n0(18);i<n;i++){const k=(t*.18+i/n+hash(s*31+i)*.2)%1,x=bx+Math.sin(k*7+t*.8+s*2+i)*m*.07*k+(hash(s*7+i)-.5)*m*.04,y=H*(1.02-k*.85),r=m*(.05+.14*k);
        glowDot(x,y,r,'240,242,248',(.32+.28*a)*Math.sin(Math.PI*Math.min(1,k*1.15)))}}
    ctx.restore();
  }
  if(fx.audrizzle){
    ctx.save();ctx.strokeStyle='rgba(215,228,245,.5)';ctx.lineWidth=Math.max(1,1.1*u);ctx.beginPath();
    for(let i=0,n=n0(220);i<n;i++){const sp=1.6+hash(i*5+1),y=((hash(i*5+2)+t*sp)%1.1)-.05,x=hash(i*5)+y*.08,l=(8+hash(i*5+3)*10)*u;ctx.moveTo(x*W,y*H);ctx.lineTo(x*W-l*.3,y*H+l)}
    ctx.stroke();ctx.strokeStyle='rgba(225,235,250,.45)';
    for(let i=0,n=n0(18);i<n;i++){const ph=(t*1.4+hash(i*3))%1,x=hash(i*3+1)*W,y=H*(.8+.18*hash(i*3+2));ctx.globalAlpha=1-ph;ctx.beginPath();ctx.ellipse(x,y,ph*26*u,ph*7*u,0,0,TAU);ctx.stroke()}
    ctx.globalAlpha=1;ctx.fillStyle='rgba(120,140,170,'+(.1*a)+')';ctx.fillRect(0,0,W,H);ctx.restore();
  }
  if(fx.auwind){
    // rafales : les feuilles traversent l'image de gauche à droite, plus ou moins vite
    const gust=.55+.45*Math.sin(t*.9)*Math.sin(t*.37+1);ctx.save();
    ctx.strokeStyle='rgba(255,255,255,'+(.16*gust)+')';ctx.lineWidth=Math.max(1,1.2*u);
    for(let i=0;i<6;i++){const x=((hash(i*13)+t*(.5+gust))%1.4-.2)*W,y=hash(i*13+1)*H,l=W*(.12+.1*hash(i*13+2));ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+l*.3,y-12*u,x+l*.6,y+12*u,x+l,y);ctx.stroke()}
    for(let i=0,n=n0(30);i<n;i++){const sp=.18+.3*hash(i*17+1)+.35*gust,x=((hash(i*17)+t*sp)%1.25)-.12,y=hash(i*17+2)+Math.sin(t*2.3+i*1.7)*.05+x*.08,s=(9+hash(i*17+3)*9)*u,r=t*(3+hash(i*17+4)*4)+i;
      ctx.save();ctx.translate(x*W,y*H);ctx.rotate(r);ctx.scale(1,.35+.65*Math.abs(Math.cos(r*1.2)));ctx.fillStyle=ctx.strokeStyle=AU_COLS[i%AU_COLS.length];auLeaf(ctx,s);ctx.restore()}
    ctx.restore();
  }
  if(fx.aulights){
    // guirlande en deux arcs en haut de l'image, ampoules chaudes qui scintillent
    ctx.save();const sag=H*(.07+.04*a),y0=H*.05,pts=[];
    ctx.strokeStyle='rgba(40,30,25,.85)';ctx.lineWidth=Math.max(1.5,2*u);
    for(const[x0,x1]of[[-.02,.52],[.48,1.02]]){ctx.beginPath();for(let i=0;i<=40;i++){const k=i/40,x=(x0+(x1-x0)*k)*W,y=y0+Math.sin(k*Math.PI)*sag;i?ctx.lineTo(x,y):ctx.moveTo(x,y);if(i%5===2)pts.push([x,y])}ctx.stroke()}
    const cols=['255,190,90','255,120,80','255,220,140','250,160,60'];ctx.globalCompositeOperation='lighter';
    pts.forEach(([x,y],i)=>{const tw=.6+.4*Math.sin(t*(2+hash(i)*3)+i*1.9),c=cols[i%cols.length],r=9*u;
      glowDot(x,y+r,r*(5+3*a)*tw,c,.35*tw);ctx.fillStyle='rgba('+c+','+(.75+.25*tw)+')';ctx.beginPath();ctx.ellipse(x,y+r,r*.55,r*.85,0,0,TAU);ctx.fill()});
    ctx.restore();
  }
  if(fx.scanlight){
    // une barre de lumière balaie l'image de haut en bas, comme un scanner
    const k=(t*.45+.91)%1.25-.1,y=k*H,bh=H*.06;ctx.save();ctx.globalCompositeOperation='screen';
    const g=ctx.createLinearGradient(0,y-H*.35,0,y+bh);g.addColorStop(0,'rgba(60,200,255,0)');g.addColorStop(.85,'rgba(60,200,255,'+(.3*a)+')');g.addColorStop(.97,'rgba(200,245,255,'+(.8+.2*a)+')');g.addColorStop(1,'rgba(200,245,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,y-H*.35,W,H*.35+bh);ctx.fillStyle='rgba(120,220,255,'+(.08*a)+')';
    for(let x=0;x<W;x+=Math.max(6,24*u))ctx.fillRect(x,Math.max(0,y-H*.35),Math.max(1,u),H*.35);
    ctx.restore();
  }
  if(fx.coderain){
    // colonnes de signes verts qui tombent (chiffres et lettres)
    const cs=Math.max(10,Math.round(22*u)),cols=Math.ceil(W/cs),rows=Math.ceil(H/cs)+1,CH='0123456789ABCDEFXZ<>=+*#';
    ctx.save();ctx.fillStyle='rgba(0,8,2,'+(.25+.45*a)+')';ctx.fillRect(0,0,W,H);ctx.font='700 '+Math.round(cs*.9)+'px Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='top';
    for(let c=0;c<cols;c++){if(hash(c*3.1)>.35+.6*a)continue;const sp=4+hash(c*7)*8,head=Math.floor((t*sp+hash(c*11)*rows*2)%(rows*1.6)),L=8+Math.floor(hash(c*13)*10);
      for(let j=0;j<L;j++){const r=head-j;if(r<0||r>=rows)continue;const ch=CH[Math.floor(hash(c*31+r*7+Math.floor(t*6+hash(c+r)*3))*CH.length)];
        ctx.fillStyle=j?'rgba(60,255,120,'+((1-j/L)*.85)+')':'rgba(220,255,230,.95)';ctx.fillText(ch,c*cs+cs/2,r*cs)}}
    ctx.restore();
  }
  if(fx.fireworks){
    // gerbes qui éclatent en haut de l'image, retombent et s'éteignent
    ctx.save();ctx.fillStyle='rgba(5,5,25,'+(.12+.3*a)+')';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';const P=1.1-.4*a;
    for(let b=Math.floor(t/P)-3;b<=Math.floor(t/P);b++){const age=t-(b*P+hash(b*5)*.3);if(age<0||age>2.2)continue;
      const cx=(.12+.76*hash(b*3))*W,cy=(.12+.33*hash(b*7))*H,R=m*(.18+.14*hash(b*9)),col=AU_COLS.concat(['#74c0fc','#e599f7','#8ce99a'])[Math.floor(hash(b*11)*9)],N=n0(48),f=Math.max(0,1-age/2.2);
      if(age<.15)glowDot(cx,cy,R*.6,'255,250,230',.6*(1-age/.15));
      ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=Math.max(1.5,2.6*u);ctx.shadowColor=col;ctx.shadowBlur=8*u;
      for(let j=0;j<N;j++){const an=j/N*TAU+hash(b+j)*.2,sp=.75+.25*hash(b*13+j),e=1-Math.pow(1-Math.min(1,age/1.1),3),dx=Math.cos(an)*R*sp*e,dy=Math.sin(an)*R*sp*e+age*age*m*.06,x=cx+dx,y=cy+dy;
        ctx.globalAlpha=f*(.6+.4*Math.sin(t*25+j));ctx.beginPath();ctx.moveTo(x-dx*.18,y-dy*.18);ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.arc(x,y,2.6*u,0,TAU);ctx.fill()}}
    ctx.restore();
  }
  if(fx.speedlines){
    // lignes de vitesse façon BD : des traits qui foncent vers le centre, renouvelés 12 fois par seconde
    const k=Math.floor(t*12),cx=W/2,cy=H/2,R0=m*(.42-.17*a),R1=S*.9;ctx.save();ctx.fillStyle='rgba(255,255,255,.85)';
    for(let i=0,n=n0(90);i<n;i++){const an=hash(k*97+i)*TAU,w=(.004+hash(k*31+i)*.012),r0=R0*(1+hash(k*13+i)*.5);
      ctx.beginPath();ctx.moveTo(cx+Math.cos(an)*r0,cy+Math.sin(an)*r0);ctx.lineTo(cx+Math.cos(an-w)*R1,cy+Math.sin(an-w)*R1);ctx.lineTo(cx+Math.cos(an+w)*R1,cy+Math.sin(an+w)*R1);ctx.fill()}
    ctx.restore();
  }
}

/* ---------- transitions (carte graphique) : A = image du dessous, B = le clip qui apparaît, q = 0 → 1 ---------- */
Object.assign(GLTR,{
  prismsplit:'void main(){float b=bell(),k=smoothstep(.35,.65,q);vec2 o1=vec2(.04,.012)*b,o2=vec2(-.028,.035)*b,o3=vec2(.012,-.04)*b;vec3 a=vec3(A(v+o1).r,A(v+o2).g,A(v+o3).b),c=vec3(B(v-o1).r,B(v-o2).g,B(v-o3).b);gl_FragColor=vec4(mix(a,c,k)+.08*b,1.);}',
  stripes:'void main(){float i=floor(v.y*12.);float d=mod(i,2.)<1.?1.:-1.;float st=hsh(vec2(i,5.))*.3;float k=clamp((q-st)/(1.-st*.9),0.,1.);k=k*k*(3.-2.*k);vec2 pb=v+vec2(d*(k-1.),0.);gl_FragColor=(pb.x>=0.&&pb.x<=1.)?B(pb):A(v+vec2(d*k,0.));}',
  shockring:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 d=(v-.5)*ar;float r=length(d),R=q*1.25,x=(r-R)/.12,k=exp(-x*x*4.);vec2 p=v-normalize(d+1e-5)/ar*k*.05;vec4 c=r<R?B(p):A(p);c.rgb+=k*.25;gl_FragColor=c;}',
  pixelrain:'void main(){vec2 cell=28.*max(1.,u)/res;vec2 id=floor(v/cell),l=fract(v/cell);float st=hsh(vec2(id.x,7.))*.45+hsh(id)*.2;float k=clamp((q-st)/.35,0.,1.);k=1.-(1.-k)*(1.-k);gl_FragColor=(k>0.&&l.y>=1.-k)?B(v-vec2(0.,(1.-k)*cell.y)):A(v);}',
  hyperspace:'void main(){vec2 d=v-.5;float b=bell();vec4 c=vec4(0.);for(int i=0;i<16;i++){float f=1.-b*.6*float(i)/15.;c+=q<.5?A(.5+d*f):B(.5+d*f*(1.+.3*(1.-q)));}c/=16.;float s=hsh(vec2(floor(atan(d.y,d.x)*40.),3.));c.rgb+=vec3(.6,.8,1.)*smoothstep(.85,1.,s)*b*length(d)*1.5+b*b*.35;gl_FragColor=c;}',
  fold:'void main(){float an=q*1.5708,h=.5*cos(an),y=v.y-.5,t=abs(y)/max(h,1e-4);if(t<=1.){float sc=1.+.35*sin(an)*t;float x=(v.x-.5)/sc+.5;if(x>=0.&&x<=1.){vec4 c=A(vec2(x,.5+sign(y)*t*.5));c.rgb*=1.-.55*sin(an)*t;gl_FragColor=c;return;}}vec4 c=B(v);c.rgb*=.55+.45*q;gl_FragColor=c;}',
  triangles:'void main(){vec2 p=v*vec2(res.x/res.y,1.)*7.;p.x+=p.y*.57735;vec2 id=floor(p),f=fract(p);float up=step(f.x,f.y);float k=clamp((q-hsh(id*2.+vec2(up,0.))*.6)/.4,0.,1.);float e=up>.5?min(min(f.y-f.x,1.-f.y),f.x):min(min(f.x-f.y,1.-f.x),f.y);gl_FragColor=e>=.34*(1.-k)?B(v):A(v);}',
  laser:'void main(){float y=1.05-q*1.1,d=v.y-y;vec4 c=d>0.?B(v):A(v);c.rgb+=vec3(.4,.9,1.)*exp(-abs(d)*res.y/(6.*max(1.,u)))*1.2+vec3(.2,.6,1.)*exp(-abs(d)*40.)*.35;gl_FragColor=c;}',
  glassbrk:'void main(){vec2 ar=vec2(res.x/res.y,1.);vec2 g=v*ar*6.;vec2 id=floor(g),f=fract(g);float d1=9.,d2=9.;vec2 mc=vec2(0.);for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j));vec2 pt=o+vec2(hsh(id+o),hsh(id+o+7.31));float dd=length(pt-f);if(dd<d1){d2=d1;d1=dd;mc=id+o;}else if(dd<d2)d2=dd;}float h=hsh(mc+3.3);float k=clamp((q-.15-h*.45)/.4,0.,1.);float cr=smoothstep(.06,0.,d2-d1)*smoothstep(0.,.15,q)*(1.-k);vec2 sh=vec2(hsh(mc+1.1)-.5,.6+hsh(mc+2.2))*k*k*.25;vec4 c=k>=1.?B(v):mix(A(v+sh),B(v),k*k);c.rgb+=cr*.9;gl_FragColor=c;}',
  smoke:'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+1.),f.x),f.y);}float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}void main(){float n=fbm(v*vec2(res.x/res.y,1.)*3.+vec2(0.,q*1.5));float e=q*1.3-.15;vec4 c=mix(A(v),B(v),smoothstep(-.07,.07,e-n));float x=(e-n)/.06;c.rgb=mix(c.rgb,vec3(.78),exp(-x*x)*.6*bell());gl_FragColor=c;}'
});
TR_CATS.basic.push('smoke');TR_CATS.slide.push('stripes');TR_CATS.wipe.push('laser');TR_CATS.shape.push('triangles','glassbrk');
TR_CATS.zoom.push('hyperspace');TR_CATS.d3.push('fold');TR_CATS.fxt.push('prismsplit','shockring','pixelrain');
Object.assign(TRN,Object.fromEntries(['prismsplit','stripes','shockring','pixelrain','hyperspace','fold','triangles','laser','glassbrk','smoke'].map(k=>[k,'tr.'+k])));

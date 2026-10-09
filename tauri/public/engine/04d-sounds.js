/* ---------- 100 bruitages en plus (v4.36), tous synthétisés par DedCut : aucun enregistrement, aucune licence tierce ----------
   Petits outils de synthèse (oscillateurs, enveloppes, bruit filtré, cloches FM, notes) puis les sons, rangés par catégorie. */
const SN=(f,t)=>Math.sin(TAU*f*t),SQ=(f,t)=>Math.sign(Math.sin(TAU*f*t)),SAW=(f,t)=>2*((f*t)%1)-1,TRI=(f,t)=>1-4*Math.abs(((f*t+.25)%1)-.5);
const NZ=()=>Math.random()*2-1,AD=(t,a,d)=>Math.min(1,t/Math.max(1e-4,a))*Math.exp(-t*d),WIN=(t,d,a=.01,r=.05)=>Math.max(0,Math.min(1,t/a,(d-t)/r));
const CHIRP=(f0,f1,d,t)=>Math.sin(TAU*(f0*t+(f1-f0)*t*t/(2*d)));
const FM=(f,r,i,k,t)=>Math.sin(TAU*f*t+i*Math.exp(-t*k)*Math.sin(TAU*f*r*t));
const MID=n=>440*Math.pow(2,(n-69)/12);
/* son « avec mémoire » (filtres) : l'état repart de zéro à chaque fabrication */
const ST=gen=>{let f=null;return t=>{if(t===0||!f)f=gen();return f(t)}};
const LPF=()=>{let y=0;return(x,k)=>(y+=k*(x-y))};
const HPF=()=>{let y=0,px=0;return(x,k)=>{y=k*(y+x-px);px=x;return y}};
/* suite de notes : [début, note MIDI, durée] jouées par une voix v(f,t,d) */
const SEQ=(ns,v)=>t=>{let s=0;for(const[a,n,d]of ns)if(t>=a&&t<a+d+.6)s+=v(MID(n),t-a,d);return s};
const PLK=(f,t,d)=>(SN(f,t)+.5*SN(2*f,t)*Math.exp(-t*3)+.25*SN(3*f,t)*Math.exp(-t*6))*AD(t,.003,3.5);
const BELL=(f,t)=>FM(f,3.5,2.2,4,t)*AD(t,.002,2.6);
const SYN=(f,t,d)=>(SAW(f,t)*.6+SAW(f*1.006,t)*.4)*Math.min(1,t/.01)*(t<d?1:Math.exp(-(t-d)*14));
const WHO=(d,f0,f1,amt=1)=>ST(()=>{const lp=LPF();return t=>{const q=t/d,e=Math.sin(Math.PI*Math.min(1,q));return lp(NZ(),Math.min(.9,(f0+(f1-f0)*q)/22050*6))*e*e*2.2*amt}});
const RAINLIKE=(d,dens,k)=>ST(()=>{const lp=LPF();return t=>{const e=WIN(t,d,.3,.5);return(lp(NZ(),k)*.5+(Math.random()<dens?NZ()*.8:0))*e}});
const SND_NEW={
  // --- interface ---
  ui_tap:['ui',.08,t=>SN(1800,t)*AD(t,.001,70)*.6],
  ui_on:['ui',.18,t=>(t<.07?SN(880,t):SN(1320,t))*AD(t%.07,.002,25)*.5],
  ui_off:['ui',.18,t=>(t<.07?SN(1320,t):SN(880,t))*AD(t%.07,.002,25)*.5],
  ui_success:['ui',.7,SEQ([[0,76,.1],[.09,79,.1],[.18,84,.3]],(f,t)=>(SN(f,t)+.3*SN(2*f,t))*AD(t,.004,7)*.35)],
  ui_fail:['ui',.6,SEQ([[0,64,.12],[.14,60,.3]],(f,t)=>TRI(f,t)*AD(t,.004,6)*.45)],
  ui_message:['ui',.5,t=>(BELL(1568,t)*.5+(t>.1?BELL(2093,t-.1)*.45:0))],
  ui_send:['ui',.35,t=>CHIRP(500,2200,.35,t)*Math.sin(Math.PI*t/.35)*.35],
  ui_bubble:['ui',.15,t=>SN(400+2600*t/.15*(1-t/.15)*2,t)*AD(t,.003,25)*.6],
  ui_unlock:['ui',.45,t=>(NZ()*AD(t,.001,120)*.5+(t>.18?NZ()*AD(t-.18,.001,90)*.6:0)+SN(2400,t)*AD(t,.002,12)*.15)],
  ui_lock:['ui',.3,t=>(NZ()*AD(t,.001,60)*.7+SN(180,t)*AD(t,.002,30)*.6)],
  ui_select:['ui',.12,t=>SQ(1200,t)*AD(t,.001,40)*.18],
  ui_back:['ui',.25,t=>CHIRP(900,400,.25,t)*AD(t,.003,12)*.4],
  ui_scroll:['ui',.6,t=>{const l=t%.06;return NZ()*Math.exp(-l*300)*.35*(t<.55?1:0)}],
  ui_alert:['ui',.9,t=>(SN(880,t)+SN(1108,t))*(Math.floor(t/.15)%2?0:1)*.25*WIN(t,.9)],
  // --- transitions ---
  wh_fast:['trans',.45,WHO(.45,400,5000)],
  wh_slow:['trans',1.6,WHO(1.6,200,3000,.8)],
  wh_deep:['trans',1.2,WHO(1.2,120,900,1.3)],
  wh_up:['trans',.8,t=>(CHIRP(300,2400,.8,t)*.25+NZ()*.12)*Math.sin(Math.PI*t/.8)],
  wh_down:['trans',.8,t=>(CHIRP(2400,250,.8,t)*.25+NZ()*.12)*Math.sin(Math.PI*t/.8)],
  wh_swipe:['trans',.3,WHO(.3,800,7000,1.1)],
  wh_zip:['trans',.4,t=>SQ(80+900*t/.4,t)*NZ()*.4*Math.sin(Math.PI*t/.4)],
  wh_air:['trans',1,ST(()=>{const lp=LPF();return t=>{const p=Math.exp(-Math.pow((t-.5)/.12,2));return lp(NZ(),.05+.4*p)*p*2.5}})],
  wh_suck:['trans',1.2,t=>{const q=t/1.2;return(NZ()*.4*q*q+CHIRP(2000,200,1.2,t)*.15*q)*(q<.97?1:0)}],
  wh_rise:['trans',1.5,t=>{const q=t/1.5;return(CHIRP(150,1200,1.5,t)*.3+NZ()*.15*q)*q}],
  wh_fall:['trans',1.5,t=>{const q=1-t/1.5;return(CHIRP(1200,120,1.5,t)*.3+NZ()*.12*q)*q}],
  wh_spin:['trans',1,t=>WHO(1,500,3000)(t)*(.6+.4*Math.sin(TAU*9*t))],
  wh_glitch:['trans',.6,t=>{const b=Math.floor(t*40);return(hash(b)>.45?SQ(200+hash(b+3)*2000,t)*.3:NZ()*.2)*WIN(t,.6)}],
  wh_tapestop:['trans',1,ST(()=>{let ph=0;return t=>{const f=220*Math.pow(1-t,2);ph+=f/44100;return(SAW(1,ph)*.4+Math.sin(TAU*ph*.5)*.3)*(1-t)}})],
  // --- impacts ---
  hit_punch:['impact',.35,t=>(SN(90*Math.exp(-t*8)+40,t)*AD(t,.001,12)*.9+NZ()*AD(t,.0005,60)*.6)],
  hit_heavy:['impact',1.4,t=>(SN(55+120*Math.exp(-t*12),t)*AD(t,.001,3)*.9+NZ()*AD(t,.001,15)*.5)],
  hit_slam:['impact',.9,ST(()=>{const lp=LPF();return t=>lp(NZ(),.2)*AD(t,.001,9)*2+SN(70,t)*AD(t,.001,8)*.6})],
  hit_thud:['impact',.5,t=>SN(60+40*Math.exp(-t*20),t)*AD(t,.002,10)],
  hit_boom:['impact',3,ST(()=>{const lp=LPF();return t=>(SN(35+50*Math.exp(-t*5),t)*.9+lp(NZ(),.03)*2)*AD(t,.002,1.3)})],
  hit_braam:['impact',3.2,t=>[36,43,48].reduce((s,n)=>s+SAW(MID(n),t)+SAW(MID(n)*1.01,t),0)*.09*Math.min(1,t/.05)*Math.exp(-t*.9)],
  hit_subdrop:['impact',2.5,t=>SN(30+90*Math.exp(-t*2.5),t)*Math.min(1,t/.01)*Math.exp(-t*1.4)],
  hit_metal:['impact',2,t=>[523,1229,1843,2651,3433].reduce((s,f,i)=>s+SN(f,t)*Math.exp(-t*(1.5+i)),0)*.2+NZ()*AD(t,.0005,80)*.4],
  hit_glass:['impact',1.2,t=>(SN(3520,t)+.6*SN(5280,t)+.4*SN(7040,t))*AD(t,.0005,5)*.25],
  hit_wood:['impact',.3,t=>(SN(420,t)+.5*SN(1130,t))*AD(t,.0005,35)*.6],
  hit_kick:['impact',.5,t=>SN(50+130*Math.exp(-t*30),t)*AD(t,.001,7)*.95],
  hit_snap:['impact',.15,ST(()=>{const hp=HPF();return t=>hp(NZ(),.6)*AD(t,.0003,60)*1.2})],
  // --- dessin animé ---
  toon_up:['toon',.8,t=>SN(400+1400*t/.8,t)*.4*WIN(t,.8)],
  toon_down:['toon',.8,t=>SN(1800-1400*t/.8,t)*.4*WIN(t,.8)],
  toon_spring:['toon',1,ST(()=>{let ph=0;return t=>{ph+=(300+200*Math.sin(t*40)*Math.exp(-t*3))/44100;return TRI(1,ph)*Math.exp(-t*3.5)*.5}})],
  toon_squeak:['toon',.3,t=>SN(1800+600*Math.sin(TAU*12*t),t)*.3*WIN(t,.3,.02,.05)],
  toon_cork:['toon',.25,t=>(SN(600+1600*Math.exp(-t*30),t)*.5+NZ()*AD(t,.0005,80)*.5)*AD(t,.001,14)],
  toon_bonk:['toon',.5,t=>(SN(330,t)+.6*SN(870,t)+.3*SN(1500,t))*AD(t,.001,11)*.45],
  toon_wobble:['toon',1,t=>SN(300+120*Math.sin(TAU*7*t),t)*.4*WIN(t,1)],
  toon_run:['toon',.7,t=>{const k=Math.floor(t/.05),l=t-k*.05;return SN(500+k*60,l)*Math.exp(-l*60)*.5}],
  toon_splat:['toon',.6,ST(()=>{const lp=LPF();return t=>lp(NZ(),.15)*AD(t,.002,8)*2.2})],
  toon_buzz:['toon',.8,t=>SAW(140+10*Math.sin(TAU*6*t),t)*.3*WIN(t,.8)],
  toon_quack:['toon',.35,t=>SAW(260-80*t/.35,t)*(.6+.4*SN(900,t))*.35*WIN(t,.35,.01,.08)],
  toon_honk:['toon',.6,t=>(SQ(370,t)+SQ(466,t))*.13*WIN(t,.6,.01,.08)],
  toon_boing:['toon',.9,ST(()=>{let ph=0;return t=>{ph+=(180+260*Math.exp(-t*5)*Math.abs(Math.sin(t*30)))/44100;return Math.sin(TAU*ph)*Math.exp(-t*3)*.55}})],
  toon_plop:['toon',.2,t=>SN(200+900*Math.exp(-t*40),t)*AD(t,.001,20)*.7],
  // --- jeux vidéo ---
  g_coin:['game',.5,t=>SQ(t<.06?988:1319,t)*.15*(t<.06?1:Math.exp(-(t-.06)*6))],
  g_oneup:['game',.8,SEQ([[0,76,.08],[.08,79,.08],[.16,88,.08],[.24,84,.08],[.32,86,.08],[.4,91,.2]],(f,t,d)=>SQ(f,t)*.13*(t<d?1:0))],
  g_hit:['game',.25,t=>(SQ(220-500*t,t)*.2+NZ()*.15)*AD(t,.001,14)],
  g_lose:['game',1.4,SEQ([[0,67,.2],[.22,66,.2],[.44,65,.2],[.66,64,.6]],(f,t,d)=>TRI(f*(1-.02*t),t)*.4*(t<d?1:Math.exp(-(t-d)*10)))],
  g_win:['game',1.4,SEQ([[0,72,.12],[.12,76,.12],[.24,79,.12],[.36,84,.5],[.36,88,.5]],(f,t,d)=>SQ(f,t)*.11*(t<d?1:Math.exp(-(t-d)*12)))],
  g_select:['game',.15,t=>SQ(t<.05?660:990,t)*.15*WIN(t,.15)],
  g_jump:['game',.35,t=>SQ(250+1200*t,t)*.15*AD(t,.002,6)],
  g_laser:['game',.3,t=>SQ(1800*Math.exp(-t*10)+200,t)*.16*AD(t,.001,6)],
  g_explode:['game',1.2,t=>{const b=Math.floor(t*600);return(hash(b)*2-1)*AD(t,.001,3.5)*.7}],
  g_shield:['game',.9,t=>(SN(600+200*Math.sin(TAU*14*t),t)+SN(900,t)*.5)*.25*WIN(t,.9,.05,.3)],
  g_levelup:['game',1.2,SEQ([[0,60,.08],[.08,64,.08],[.16,67,.08],[.24,72,.08],[.32,76,.08],[.4,79,.08],[.48,84,.4]],(f,t,d)=>(SQ(f,t)*.08+TRI(f,t)*.15)*(t<d?1:Math.exp(-(t-d)*8)))],
  g_bleeps:['game',1,t=>{const k=Math.floor(t/.08);return SQ(400+hash(k)*1400,t)*.12*(t-k*.08<.06?1:0)}],
  g_pickup:['game',.3,t=>SQ(t<.08?1047:1568,t)*.14*WIN(t,.3)],
  g_over:['game',2.2,SEQ([[0,64,.35],[.4,60,.35],[.8,57,.35],[1.2,52,.8]],(f,t,d)=>(SQ(f,t)*.08+TRI(f/2,t)*.2)*(t<d?1:Math.exp(-(t-d)*6)))],
  // --- musique (petites ponctuations) ---
  m_happy:['music',1.2,SEQ([[0,72,.1],[.1,76,.1],[.2,79,.1],[.3,84,.6]],PLK)],
  m_sad:['music',2,SEQ([[0,69,.3],[.35,65,.3],[.7,64,.3],[1.05,57,.9]],(f,t,d)=>PLK(f,t,d)*.9)],
  m_epic:['music',3,t=>([[48,0],[55,0],[60,0],[63,0]].reduce((s,[n])=>s+SYN(MID(n),t,2),0)*.1+SN(MID(36),t)*.3)*Math.exp(-Math.max(0,t-2)*3)*Math.min(1,t/.02)],
  m_chimeup:['music',1.6,SEQ([[0,84,.2],[.08,88,.2],[.16,91,.2],[.24,96,.4]],(f,t)=>BELL(f,t)*.35)],
  m_chimedown:['music',1.6,SEQ([[0,96,.2],[.08,91,.2],[.16,88,.2],[.24,84,.4]],(f,t)=>BELL(f,t)*.35)],
  m_harp:['music',2,SEQ([60,62,64,67,69,72,74,76,79,81,84].map((n,i)=>[i*.05,n,.3]),(f,t,d)=>PLK(f,t,d)*.35)],
  m_piano:['music',2.5,t=>[60,64,67,72].reduce((s,n)=>s+(SN(MID(n),t)+.4*SN(2*MID(n),t)*Math.exp(-t*2))*AD(t,.003,1.6),0)*.18],
  m_stab:['music',.8,t=>[60,63,67,70].reduce((s,n)=>s+SYN(MID(n),t,.18),0)*.1],
  m_fanfare:['music',2,SEQ([[0,67,.15],[.18,67,.1],[.3,67,.1],[.42,72,.8]],(f,t,d)=>(SAW(f,t)*.5+SQ(f,t)*.2)*.25*Math.min(1,t/.02)*(t<d?1:Math.exp(-(t-d)*6)))],
  m_xylo:['music',1.5,SEQ([72,74,76,77,79,81,83,84].map((n,i)=>[i*.07,n,.1]),(f,t)=>(SN(f,t)+.3*SN(4*f,t))*AD(t,.001,9)*.35)],
  m_musicbox:['music',2.5,SEQ([[0,84,.3],[.3,88,.3],[.6,91,.3],[.9,88,.3],[1.2,96,.6]],(f,t)=>(SN(f,t)+.4*SN(3*f,t)*Math.exp(-t*8))*AD(t,.001,3)*.3)],
  m_bassdrop:['music',2.2,t=>(SN(40+200*Math.exp(-t*3),t)*.8+SAW(41,t)*.15*Math.exp(-t*1.2))*Math.min(1,t/.01)*Math.exp(-t*.9)],
  // --- ambiances ---
  amb_rain:['amb',6,RAINLIKE(6,.004,.35)],
  amb_wind:['amb',6,ST(()=>{const lp=LPF();return t=>lp(NZ(),.01+.02*(1+Math.sin(t*.9)))*6*WIN(t,6,.5,.8)}) ],
  amb_ocean:['amb',8,ST(()=>{const lp=LPF();return t=>{const w=Math.pow(.5+.5*Math.sin(TAU*t/4),2);return lp(NZ(),.03+.25*w)*(.4+1.6*w)*WIN(t,8,.5,1)}})],
  amb_fire:['amb',5,ST(()=>{const lp=LPF();return t=>(lp(NZ(),.05)*1.2+(Math.random()<.002?NZ()*1.2:0))*WIN(t,5,.3,.5)})],
  amb_birds:['amb',5,t=>{let s=0;for(let k=0;k<6;k++){const a=k*.8+hash(k)*.5,l=t-a;if(l>0&&l<.25)s+=SN(2600+1400*Math.sin(TAU*(8+hash(k+9)*6)*l),l)*Math.sin(Math.PI*l/.25)*.25}return s}],
  amb_crickets:['amb',5,t=>SN(4400,t)*(Math.floor(t*30)%2)*(Math.floor(t*2)%2?0:1)*.15*WIN(t,5,.2,.3)],
  amb_city:['amb',6,ST(()=>{const lp=LPF();return t=>(lp(NZ(),.015)*4+SN(60,t)*.05)*WIN(t,6,.5,.8)})],
  amb_stream:['amb',6,ST(()=>{const hp=HPF(),lp=LPF();return t=>lp(hp(NZ(),.9),.4)*(.6+.4*Math.sin(t*7+Math.sin(t*3)))*WIN(t,6,.4,.6)})],
  amb_rumble:['amb',5,ST(()=>{const lp=LPF();return t=>lp(NZ(),.004)*14*WIN(t,5,.6,.8)})],
  amb_static:['amb',3,t=>NZ()*.25*(.7+.3*Math.sin(t*13))*WIN(t,3,.05,.2)],
  // --- appareils & tech ---
  tk_ring:['tech',3,t=>(SN(1100,t)+SN(1400,t))*.2*((t%1)<.4?(Math.floor(t*25)%2):0)],
  tk_vibrate:['tech',2,t=>SAW(140,t)*.35*((t%.8)<.4?1:0)*WIN(t,2)],
  tk_poweron:['tech',1.2,t=>(CHIRP(100,900,1.2,t)*.3+SN(1800,t)*.05*t)*Math.min(1,t/.05)*(t<1.1?1:0)],
  tk_poweroff:['tech',1.2,t=>CHIRP(900,60,1.2,t)*.35*(1-t/1.2)],
  tk_robot:['tech',1,t=>SQ([300,500,250,700,400][Math.floor(t*5)%5],t)*.14*((t*5)%1<.8?1:0)],
  tk_scanner:['tech',2,t=>(SN(1200+400*Math.sin(TAU*1.5*t),t)*.2+NZ()*.03)*WIN(t,2,.05,.2)],
  tk_alarm:['tech',3,t=>SQ(Math.floor(t*4)%2?880:660,t)*.14*WIN(t,3)],
  tk_siren:['tech',4,t=>SN(700+400*Math.sin(TAU*.5*t)*1,t)*.3*WIN(t,4,.1,.3)],
  tk_shutter:['tech',.4,t=>NZ()*(AD(t,.0005,90)+(t>.09?AD(t-.09,.0005,70)*.8:0))*.8],
  tk_countdown:['tech',4,t=>{const l=t%1;return SN(t>3?1760:880,t)*(l<(t>3?.6:.15)?1:0)*.35}]
};
const SND_CATS=['fx','ui','trans','impact','toon','game','music','amb','tech'];
for(const[k,[cat,dur,fn]]of Object.entries(SND_NEW))SOUNDS[k]={name:'sfx.'+k,cat,dur,fn};
let sndCat='all';
renderSounds=function(){
  const L=$('#slist');if(!L)return;
  let C=$('#scats');if(!C){C=document.createElement('div');C.id='scats';C.className='chips';L.before(C)}
  C.innerHTML=['all',...SND_CATS].map(k=>`<button data-scat="${k}" class="${k===sndCat?'on':''}">${T(k==='all'?'lookcat.all':'sndcat.'+k)}</button>`).join('');
  L.innerHTML=Object.entries(SOUNDS).filter(([,s])=>sndCat==='all'||(s.cat||'fx')===sndCat).map(([k,s])=>`<div class="srow"><button data-sprev="${k}" title="${T('common.listen')}">${ico('play',14)}</button><span>${T(s.name)}</span><span class="hint">${s.dur}s</span><button data-snd="${k}" title="${T('common.addAtPlayhead')}">+</button></div>`).join('');
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-scat]');if(!b)return;sndCat=b.dataset.scat;renderSounds()});
renderSounds();

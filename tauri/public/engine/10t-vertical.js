/* ---------- Studio vertical 9:16 pour TikTok (v4.62) ----------
   Le studio (Enregistrer et Live) peut être horizontal 16:9 ou vertical 9:16. Le vertical a ses propres scènes, pensées
   pour le téléphone (TikTok, Shorts, Reels) : les scènes de l'autre format sont gardées de côté (stData.oscenes) et
   reviennent quand on rechange de format. En vertical, toutes les destinations reçoivent directement l'image 9:16
   (le 2e live « 9:16 fait à partir du 16:9 » de 10l-pro.js ne sert plus), et l'enregistrement est vertical aussi. */
/** scènes verticales prêtes : caméra plein écran, jeu + caméra, bientôt, pause, fin */
function stDefaultV(){
  const tx=(k,y)=>stItem('text',{text:T(k),size:5,color:'#ffffff'},{x:.06,y,w:.88,h:.12});
  const chat=(y,h)=>stItem('chat',Object.assign(ST_CHAT_DEF(),{size:2.2,max:5}),{x:.04,y,w:.8,h});
  const badge=()=>stItem('badge',{},{x:.05,y:.035,w:.34,h:.034});
  const alerts=y=>stItem('alerts',ST_AL_DEF(),{x:.06,y,w:.88,h:.13});
  return{cur:101,scenes:[
    {id:101,name:T('vf.sc.cam'),items:[stItem('color',{c1:'#111118',c2:'#1d1236'}),stItem('cam',{shape:'rect'},{x:0,y:0,w:1,h:1}),badge(),alerts(.12),chat(.6,.3)]},
    {id:102,name:T('vf.sc.game'),items:[stItem('color',{c1:'#0b0b14',c2:'#1d1236'}),stItem('screen',{cover:true},{x:0,y:0,w:1,h:.5}),stItem('cam',{shape:'rect'},{x:0,y:.5,w:1,h:.5}),badge(),alerts(.38),chat(.64,.28)]},
    {id:103,name:T('st.sc.soon'),items:[stItem('color',{c1:'#7c3aed',c2:'#2563eb',anim:true}),tx('live.sc.soonBig',.3),stItem('timer',ST_TM_DEF(101),{x:.15,y:.47,w:.7,h:.1}),chat(.66,.26)]},
    {id:104,name:T('st.sc.brb'),items:[stItem('color',{c1:'#f97316',c2:'#db2777',anim:true}),tx('live.sc.brbBig',.4),chat(.66,.26)]},
    {id:105,name:T('st.sc.end'),items:[stItem('color',{c1:'#0d9488',c2:'#7c3aed',anim:true}),tx('live.sc.endBig',.44)]}
  ]};
}
/** changer le format du studio ('h' = 16:9, 'v' = 9:16) : chaque format garde ses scènes */
function stFmtSet(f){
  f=f==='v'?'v':'h';if((stData.fmt||'h')===f)return;
  if(O.live||O.rec||O.vert){toast(T('vf.busy'));return}
  const keep={scenes:stData.scenes,cur:stData.cur};
  if(Array.isArray(stData.oscenes)&&stData.oscenes.length){stData.scenes=stData.oscenes;stData.cur=stData.ocur}
  else{const d=f==='v'?stDefaultV():stDefault();stData.scenes=d.scenes;stData.cur=d.cur}
  stData.oscenes=keep.scenes;stData.ocur=keep.cur;stData.fmt=f;
  if(stData.smode)stData.prog=stData.cur;
  stSelId=null;if(typeof stTimersStart==='function')stTimersStart(stScene());
  stApplyQ();stFit();stSave();stRender();stCamsSync();
  toast(T(f==='v'?'vf.onV':'vf.onH'));
}
/* réglages : choix du format, au-dessus du « live vertical » (qui ne sert plus quand le studio est déjà vertical) */
function stFmtHTML(){
  const v=stData.fmt==='v',busy=!!(O.live||O.rec||O.vert);
  return`<h5>${ico('portrait',14)} ${T('vf.title')}</h5><div class="copt">${['h','v'].map(k=>`<button data-vfmt="${k}" class="${(v?'v':'h')===k?'on':''}" ${busy?'disabled':''}>${T('vf.'+k)}</button>`).join('')}</div><p class="hint">${T('vf.hint')}</p>`;
}
{const b=lvSetHTML;lvSetHTML=function(){return stFmtHTML()+(stData.fmt==='v'?`<p class="hint">${T('vf.allVert')}</p>`:b())}}
$('#stSide').addEventListener('click',e=>{const b=e.target.closest('[data-vfmt]');if(!b||b.disabled)return;stFmtSet(b.dataset.vfmt);if(stSide==='set')stSideUI()});

/* ---------- Mode simple (v4.57) : pour débuter, les réglages avancés sont cachés ----------
   Caché : scènes, images clés, repères, masques, incrustation (fond vert), mesure du volume, export piste par piste,
   réglages fins de l'export (images par seconde, qualité). Tout revient en désactivant le mode (Menu ou Préférences).
   Un petit guide en 3 étapes s'affiche au-dessus de la timeline (on peut le fermer). */
let simpleOn=false,simpleGuideOff=false;
try{simpleOn=localStorage.getItem('dedcut-simple')==='1';simpleGuideOff=localStorage.getItem('dedcut-simple-guide')==='0'}catch(e){}
function simpleGuide(){
  let g=$('#simpleGuide');
  if(!simpleOn||simpleGuideOff){if(g)g.remove();return}
  if(!g){g=document.createElement('div');g.id='simpleGuide';$('#tl').prepend(g);
    g.addEventListener('click',e=>{if(e.target.closest('[data-sgx]')){simpleGuideOff=true;try{localStorage.setItem('dedcut-simple-guide','0')}catch(x){}g.remove()}})}
  g.innerHTML=`<span><i>1</i>${T('simple.g1')}</span><span><i>2</i>${T('simple.g2')}</span><span><i>3</i>${T('simple.g3')}</span><button class="sm" data-sgx title="${esc(T('common.close'))}">${T('simple.gClose')}</button>`;
}
function simpleApply(){document.body.classList.toggle('dc-simple',simpleOn);simpleGuide();renderInspector()}
function simpleSet(on){
  simpleOn=!!on;if(simpleOn){simpleGuideOff=false;try{localStorage.removeItem('dedcut-simple-guide')}catch(e){}}
  try{localStorage.setItem('dedcut-simple',simpleOn?'1':'0')}catch(e){}
  simpleApply();toast(T(simpleOn?'simple.on':'simple.off'));
}
/* inspecteur : pas d'onglets Masque ni Incrustation */
{const tf=tabsFor;tabsFor=function(c){const t=tf(c);return simpleOn?t.filter(x=>x!=='mask'&&x!=='chroma'):t}}
/* Préférences : case « Mode simple » */
{const op=openPrefs;openPrefs=function(){op();const f=$('#prefdlg .kbfoot');if(!f)return;
  f.insertAdjacentHTML('beforebegin',`<label class="chk"><span>${T('simple.title')}</span><input id="pfSimple" type="checkbox" ${simpleOn?'checked':''}></label><div class="hint">${T('simple.hint')}</div>`);
  $('#pfSimple').addEventListener('change',e=>simpleSet(e.target.checked))}}
CMDS.push({id:'simple',n:'simple.title',f:()=>simpleSet(!simpleOn)});
window.addEventListener('dedcut-lang',simpleGuide);
document.body.classList.toggle('dc-simple',simpleOn);simpleGuide(); // au démarrage : l'inspecteur se dessine plus tard

/* ---------- Halloween (v4.67.2) : ouvrir les effets Halloween depuis l'accueil, Ctrl+K et DedCut IA ----------
   Les effets sont dessinés dans 06c-halloween.js (et 06b-face.js pour les déguisements), les filtres sont dans 08-inspector.js. */
function hwOpen(){
  setMode('edit');showTab('fx');fxCat='halloween';renderEffects();
  const b=$('#rail [data-tab="fx"]');if(b){b.classList.remove('dcflash');void b.offsetWidth;b.classList.add('dcflash')}
  if(!clips.some(c=>isVid(c)))toast(T('hw.hint'));
}
if(window.dedcutAPI)window.dedcutAPI.halloween=()=>{hwOpen();return true};
CMDS.push({id:'halloween',n:'hw.cmd',f:()=>hwOpen()});
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['halloween','hallowen','ハロウィン','할로윈','万圣节'])){hwOpen();return{text:T('hw.aiOpened')}}
  return b(raw,q);
}}

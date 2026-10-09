/* ---------- téléprompteur (v4.36) : ton texte défile en gros pendant que tu t'enregistres (voix off, facecam, écran) ---------- */
let tpState={run:false,y:0,last:0,raf:0};
function tpLoad(k,d){try{return localStorage.getItem('dedcut-tp-'+k)??d}catch(e){return d}}
function tpSave(k,v){try{localStorage.setItem('dedcut-tp-'+k,v)}catch(e){}}
function openPrompter(){
  let o=$('#tpw');if(o){o.style.display='flex';return}
  o=document.createElement('div');o.id='tpw';o.className='tpw';
  o.innerHTML=`<div class="tph"><b>${T('tp.title')}</b><span class="tpsp"></span><button id="tpEdit" class="sm">${T('tp.edit')}</button><button id="tpX" class="sm" title="${T('common.close')}">✕</button></div>
  <div class="tpv"><div class="tpline"></div><div id="tpTxt"></div><textarea id="tpArea" hidden></textarea></div>
  <div class="tpc"><button id="tpPlay" class="pri">▶ ${T('tp.start')}</button><button id="tpBack" class="sm">⟲</button>
    <label>${T('tp.speed')}<input type="range" id="tpSpd" min="5" max="120" value="${tpLoad('spd',35)}"></label>
    <label>${T('common.size')}<input type="range" id="tpSize" min="18" max="80" value="${tpLoad('size',38)}"></label>
    <label class="chk"><span>${T('tp.mirror')}</span><input type="checkbox" id="tpMir"></label></div>`;
  document.body.appendChild(o);
  const txt=$('#tpTxt'),area=$('#tpArea'),view=o.querySelector('.tpv');
  const setText=v=>{txt.textContent=v;area.value=v};setText(tpLoad('text',T('tp.sample')));
  const style=()=>{txt.style.fontSize=$('#tpSize').value+'px';txt.style.transform=`translateY(${-tpState.y}px)`+($('#tpMir').checked?' scaleX(-1)':'')};style();
  const loop=now=>{if(!tpState.run)return;const dt=Math.min(.1,(now-(tpState.last||now))/1000);tpState.last=now;tpState.y+=dt*$('#tpSpd').value*1.6;
    const max=txt.scrollHeight-view.clientHeight*.35;if(tpState.y>max){tpState.y=max;tpStop()}style();tpState.raf=requestAnimationFrame(loop)};
  const tpStop=()=>{tpState.run=false;cancelAnimationFrame(tpState.raf);$('#tpPlay').textContent='▶ '+T('tp.start')};
  $('#tpPlay').onclick=()=>{if(tpState.run){tpStop();return}if(!area.hidden)$('#tpEdit').click();tpState.run=true;tpState.last=0;$('#tpPlay').textContent='❚❚ '+T('tp.pause');tpState.raf=requestAnimationFrame(loop)};
  $('#tpBack').onclick=()=>{tpState.y=0;style()};
  $('#tpEdit').onclick=()=>{const ed=area.hidden;area.hidden=!ed;txt.hidden=ed;if(ed){tpStop();area.focus()}else{setText(area.value);tpSave('text',area.value);style()}$('#tpEdit').textContent=ed?T('tp.ok'):T('tp.edit')};
  $('#tpSpd').oninput=e=>tpSave('spd',e.target.value);$('#tpSize').oninput=e=>{tpSave('size',e.target.value);style()};$('#tpMir').onchange=style;
  view.addEventListener('wheel',e=>{tpState.y=Math.max(0,tpState.y+e.deltaY*.6);style();e.preventDefault()},{passive:false});
  $('#tpX').onclick=()=>{tpStop();o.style.display='none'};
  // déplacer la fenêtre par sa barre de titre
  const hd=o.querySelector('.tph');let drag=null;hd.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag=[e.clientX-o.offsetLeft,e.clientY-o.offsetTop];hd.setPointerCapture(e.pointerId)});
  hd.addEventListener('pointermove',e=>{if(!drag)return;o.style.left=Math.max(0,e.clientX-drag[0])+'px';o.style.top=Math.max(0,e.clientY-drag[1])+'px'});hd.addEventListener('pointerup',()=>drag=null);
  o.addEventListener('keydown',e=>{if(e.code==='Space'&&area.hidden){e.preventDefault();$('#tpPlay').click()}});
}
document.addEventListener('click',e=>{if(e.target.closest('[data-tp]'))openPrompter()});

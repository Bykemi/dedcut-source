/* ---------- voix du micro modifiée dans Enregistrer et Live (v4.54) ----------
   Les mêmes voix que le changeur de voix du Montage (02-audio.js : VP, VCAT, buildVoice, voiceParams), en direct sur le micro.
   Placée à la fin de la chaîne du micro (après débruitage, porte, compresseur), juste avant le volume du micro : le mixeur,
   l'enregistrement et le live entendent la voix modifiée. Réglage gardé dans stData.micVoice (clé de VP, '' = normale). */
let stVoiceCh=null,stVoiceSt=0,stVoiceLast=null;
async function stVoiceLoad(){
  if(stVoiceSt||!st.ac)return stVoiceSt;
  try{const url=URL.createObjectURL(new Blob([PS_SRC],{type:'application/javascript'}));try{await st.ac.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}stVoiceSt=1}catch(e){stVoiceSt=-1}
  return stVoiceSt;
}
/** (re)branche la voix entre la fin de la chaîne du micro (porte ou compresseur) et le volume du micro */
async function stVoiceWire(){
  if(!st.ac||!st.gate||!st.mic)return;
  const key=stData&&stData.micVoice&&VP[stData.micVoice]?stData.micVoice:'';
  const last=stData&&stData.micfx&&stData.micfx.comp?st.comp:st.gate;
  if(stVoiceCh){try{stVoiceCh.out.disconnect()}catch(e){}}
  if(stVoiceLast&&stVoiceCh){try{stVoiceLast.disconnect(stVoiceCh.in)}catch(e){}}
  if(!key){try{last.disconnect(st.mic.g)}catch(e){}last.connect(st.mic.g);stVoiceLast=null;return}
  if(!stVoiceCh){await stVoiceLoad();stVoiceCh=buildVoice(st.ac,stVoiceSt);if(!stVoiceCh)return}
  voiceParams(stVoiceCh,Object.assign(voiceDefaults(),VP[key],{on:true}));
  try{last.disconnect(st.mic.g)}catch(e){}
  last.connect(stVoiceCh.in);stVoiceCh.out.connect(st.mic.g);stVoiceLast=last;
}
{const mf=stMicFx;stMicFx=function(){mf();stVoiceWire()}}
/* menu « Voix » dans les réglages du micro (mixeur du studio) */
function stVoiceHTML(){
  const cur=stData&&stData.micVoice||'';
  const opt=k=>`<option value="${k}" ${cur===k?'selected':''}>${esc(T(vName(k)))}</option>`;
  return `<div class="fld stvoice"><label>${T('mv.label')}</label><select data-micvoice><option value="" ${cur?'':'selected'}>${esc(T('voice.normal'))}</option>`
    +Object.entries(VCAT).map(([c,l])=>`<optgroup label="${esc(T('vc.cat.'+c))}">${l.map(opt).join('')}</optgroup>`).join('')+`</select><p class="hint">${T('mv.hint')}</p></div>`;
}
{const b=typeof lpMixHTML==='function'?lpMixHTML:()=>'';lpMixHTML=function(){return b()+stVoiceHTML()}}
document.addEventListener('change',e=>{
  const s=e.target&&e.target.closest&&e.target.closest('[data-micvoice]');if(!s||!stData)return;
  stData.micVoice=s.value;stSave();stVoiceWire();
  if(s.value)toast(T('mv.on',{name:T(vName(s.value))}));
});

// v4.25 : connecteur IA (MCP). Le moteur exécute les demandes de Claude Desktop (MCP_TOOLS) ; fenêtre « Connecteur IA » (Menu). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

rep("/* ---------- boutons & clavier ---------- */", `/* ---------- connecteur IA (MCP) : Claude Desktop pilote DedCut (src-tauri/src/mcp.rs). Désactivé par défaut. ---------- */
const r2=x=>Math.round((+x||0)*100)/100;
async function mcpRun(tool,a){
  const need=id=>{const c=clips.find(x=>x.id===+id);if(!c)throw new Error('clip '+id+' not found (read ids with get_project)');return c};
  const unlocked=c=>{if(trk(c).lock)throw new Error('track is locked');return c};
  switch(tool){
    case 'get_project':return{app:'DedCut '+appVersion(),format:{width:W,height:H},duration:r2(total()),playhead:r2(time),scene:scenes&&scenes.length>1?scName(scenes[curSc],curSc):null,
      tracks:tracks.map((t,i)=>({index:i,kind:t.kind,hidden:!!t.hide,muted:!!t.mute,locked:!!t.lock})),
      clips:clips.slice().sort((x,y)=>x.start-y.start).slice(0,500).map(c=>{const m=c.mid&&mById(c.mid),o={id:c.id,track:c.track,kind:kindOf(c),start:r2(c.start),duration:r2(c.dur)};
        if(m){o.media_id=m.id;o.media=m.name;o.media_type=m.type}if(isText(c))o.text=c.p.text;if(c.gen){o.element=c.gen;if(c.p.st)o.style=c.p.st}
        if((c.p.rate||1)!==1)o.speed=r2(c.p.rate);if(c.p.vol!=null&&c.p.vol!==100)o.volume=c.p.vol;const fx=c.p.fx&&Object.keys(c.p.fx).filter(k=>c.p.fx[k]);if(fx&&fx.length)o.effects=fx;
        if(c.p.tin&&c.p.tin!=='none')o.transition_in=c.p.tin;if(c.p.tout&&c.p.tout!=='none')o.transition_out=c.p.tout;if(c.grp)o.group=c.grp;return o}),
      media:media.map(m=>({id:m.id,name:m.name,type:m.type,duration:m.type==='image'?null:r2(m.duration),width:m.w||null,height:m.h||null,missing:!!m.missing})),markers:markers.map(r2)};
    case 'get_capabilities':return{templates:Object.keys(TPLS),elements:Object.fromEntries(Object.keys(WDEF).map(g=>[g,{styles:WSTY[g]||[],props:Object.keys(WDEF[g]().p).filter(k=>k!=='op')}])),
      text_styles:Object.keys(TPRE),effects:FX,transitions:Object.keys(TRN),speed_ramps:Object.keys(RAMPS),notes:'x and y are 0-100 % of the frame (50,50 = center). Element size is % of the frame height. Colors are #rrggbb. A progress bar (pbar) covers the whole video by default.'};
    case 'import_media':{if(!FS)throw new Error('only in the installed app');const inf=await FS.allowPaths((a.paths||[]).map(String)),ok=inf.filter(i=>i.exists),made=addPaths(ok);await waitMeta(made);
      return{imported:made.map(m=>({id:m.id,name:m.name,type:m.type,duration:r2(m.duration)})),not_found:inf.filter(i=>!i.exists).map(i=>i.path)}}
    case 'add_clip':{const m=mById(+a.media_id);if(!m)throw new Error('media '+a.media_id+' not found');const n0=clips.length;addFromMedia(m.id,!!a.overlay,a.start!=null?Math.max(0,+a.start):m.type==='audio'?time:undefined);
      if(clips.length===n0)throw new Error('not added');const c=clips[clips.length-1];if(a.duration)c.dur=Math.max(.1,+a.duration);return{id:c.id,start:r2(c.start),duration:r2(c.dur)}}
    case 'add_text':{const c=textClip(TPRE[a.style]?a.style:null,Math.max(0,+(a.start??time)));c.p.text=String(a.text??'');if(a.duration)c.dur=Math.max(.1,+a.duration);if(a.y!=null)c.p.y=clamp(+a.y,-20,120);if(a.size)c.p.size=Math.round(H*clamp(+a.size,1,60)/100);add(c);return{id:c.id}}
    case 'add_element':{const g=String(a.kind||'');if(!WDEF[g])throw new Error('unknown element kind, see get_capabilities');const d=WDEF[g]();if(a.style){if(WSTY[g]&&!WSTY[g].includes(a.style))throw new Error('unknown style');d.p.st=a.style}
      for(const[k,v]of Object.entries(a.props||{}))if(v===null||['string','number','boolean'].includes(typeof v))d.p[k]=v;
      const start=g==='pbar'&&a.start==null?0:Math.max(0,+(a.start??time)),dur=Math.max(.2,+(a.duration||(g==='pbar'?Math.max(1,total()||10):d.dur)));const c=newClip({track:tk('over'),gen:g,start,dur,p:d.p});add(c);return{id:c.id}}
    case 'add_template':{if(!TPLS[a.name])throw new Error('unknown template, see get_capabilities');seek(Math.max(0,+(a.start??time)));insertTpl(a.name);return{ids:selIds()}}
    case 'update_clip':{const c=unlocked(need(a.id));if(a.start!=null)c.start=Math.max(0,+a.start);if(a.duration!=null)c.dur=Math.max(.05,+a.duration);if(a.volume!=null)c.p.vol=clamp(+a.volume,0,400);
      if(a.speed!=null)setRate(c,clamp(+a.speed,.1,8));if(a.text!=null&&isText(c))c.p.text=String(a.text);
      for(const[k,v]of Object.entries(a.props||{}))if(v===null||['string','number','boolean'].includes(typeof v))c.p[k]=v;return{id:c.id,start:r2(c.start),duration:r2(c.dur)}}
    case 'delete_clips':{const ids=(a.ids||[]).map(Number),n0=clips.length;clips=clips.filter(c=>!ids.includes(c.id)||trk(c).lock);sel=null;msel.clear();return{deleted:n0-clips.length}}
    case 'split_clip':{const tt=+a.time,c=a.id!=null?need(a.id):clips.filter(x=>isVid(x)&&tt>x.start+.05&&tt<x.start+x.dur-.05).pop();if(!c||tt<=c.start+.05||tt>=c.start+c.dur-.05)throw new Error('no clip at that time');unlocked(c);const n=splitAt(c,tt);return{left:c.id,right:n.id}}
    case 'set_transition':{const c=need(a.id);for(const w of['in','out'])if(a[w]!=null){if(!TRN[a[w]])throw new Error('unknown transition '+a[w]);c.p[w==='in'?'tin':'tout']=a[w]}if(a.duration)c.p.tdur=clamp(+a.duration,.1,3);return{ok:true}}
    case 'set_effects':{const c=need(a.id);if(!isVid(c)&&!isOvr(c))throw new Error('effects work on videos, images and layers');c.p.fx=noFx();for(const k of a.effects||[]){if(!FX.includes(k))throw new Error('unknown effect '+k);c.p.fx[k]=true}if(a.intensity!=null)c.p.amt=clamp(+a.intensity,0,100);return{ok:true}}
    case 'remove_silences':{const c=unlocked(need(a.id));silCfg.db={sensitive:-45,normal:-38,strong:-30}[a.sensitivity]??silCfg.db;if(a.min_silence)silCfg.min=clamp(+a.min_silence,.1,10);if(a.margin!=null)silCfg.pad=clamp(+a.margin,0,2);
      silPrev=null;await cutSilences(c);if(!silPrev||silPrev.cid!==c.id)return{cut:0};const runs=silPrev.runs,rm=r2(silPrev.removed);silApply();return{cut:runs,removed_seconds:rm}}
    case 'speed_ramp':{if(!RAMPS[a.preset])throw new Error('unknown preset, see get_capabilities');speedRamp(unlocked(need(a.id)),a.preset);return{ok:true}}
    case 'add_markers':{markers.push(...(a.times||[]).map(Number).filter(x=>isFinite(x)&&x>=0));markers.sort((x,y)=>x-y);return{markers:markers.map(r2)}}
    case 'beat_markers':{await beatMarkers(need(a.id));return{markers:markers.map(r2)}}
    case 'undo':undo();return{ok:true};
    case 'seek':seek(+a.time||0);return{playhead:r2(time)};
    case 'open_export':openExport();return{ok:true,note:'The export window is open: the user chooses the settings and clicks Export.'};
  }
  throw new Error('unknown tool '+tool);
}
const MCP_READ=new Set(['get_project','get_capabilities','seek','open_export']);
let mcpOn=false,mcpUnl=null,mcpCalls=0;
async function mcpHandle(c){
  let res;
  try{res=await mcpRun(c.tool,c.args||{});if(!MCP_READ.has(c.tool)){commit();refresh();toast(T('ai.did',{action:T('ai.t.'+c.tool)}))}mcpCalls++}
  catch(x){res={error:String((x&&x.message)||x)}}
  try{await window.dedcutMCP.reply(c.id,res)}catch(x){}
  if($('#aidlg'))openAI();
}
function aiBadge(){let b=$('#aiBadge');if(!b){b=document.createElement('button');b.id='aiBadge';b.className='aibadge';b.onclick=()=>openAI();$('#sv').after(b)}b.hidden=!mcpOn;b.textContent=T('ai.badge')}
async function mcpSet(on){
  if(!window.dedcutMCP){toast(T('ai.onlyApp'));return}
  try{const r=await window.dedcutMCP.enable(on);mcpOn=r.on;if(mcpOn&&!mcpUnl)mcpUnl=await window.dedcutMCP.onCall(mcpHandle);if(!mcpOn&&mcpUnl){mcpUnl();mcpUnl=null}
    try{localStorage.setItem('dedcut-mcp',mcpOn?'1':'0')}catch(x){}}catch(x){toast(String((x&&x.message)||x))}
  aiBadge();if($('#aidlg'))openAI();
}
async function openAI(){
  let o=$('#aidlg');if(!o){o=document.createElement('div');o.id='aidlg';o.className='kbov';document.body.appendChild(o);
    o.addEventListener('pointerdown',ev=>{if(ev.target===o)o.remove()});
    o.addEventListener('change',ev=>{if(ev.target.id==='aiOn')mcpSet(ev.target.checked)});
    o.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.aix!=null)o.remove();
      if(b.dataset.aiinst!=null){try{await window.dedcutMCP.installClaude();toast(T('ai.installed'))}catch(x){toast(T('ai.installFail',{error:String((x&&x.message)||x)}))}openAI()}
      if(b.dataset.aicopy!=null){const t=$('#aiCfg').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(T('ai.copied'))).catch(()=>{})}});
  }
  let st={on:mcpOn,calls:0,claude:false,config:''};if(window.dedcutMCP){try{st=await window.dedcutMCP.status()}catch(x){}}
  o.innerHTML=\`<div class="kbbox aibox"><div class="kbhead"><h3>\${T('ai.title')}</h3><button class="sm" data-aix>\${T('kb.close')}</button></div>
    <p>\${T('ai.intro')}</p><p class="hint">\${T('ai.privacy')}</p>
    <label class="chk aion"><span>\${T('ai.enable')}</span><input type="checkbox" id="aiOn" \${mcpOn?'checked':''} \${window.dedcutMCP?'':'disabled'}></label>
    <p class="aistate \${mcpOn?'on':''}">\${T(window.dedcutMCP?(mcpOn?'ai.on':'ai.off'):'ai.onlyApp')}\${mcpOn&&mcpCalls?' · '+T('ai.calls',{count:mcpCalls}):''}</p>
    <ol class="aisteps"><li>\${T('ai.step1')}</li><li>\${T('ai.step2')}</li><li>\${T('ai.step3')}</li></ol>
    <div class="pre"><button class="pri" data-aiinst \${window.dedcutMCP?'':'disabled'}>\${T('ai.install')}</button>\${st.claude?\`<span class="hint aiok">\${T('ai.already')}</span>\`:''}</div>
    <p class="hint" style="margin-top:12px">\${T('ai.manual')}</p><pre id="aiCfg" class="aicfg">\${esc(st.config||'')}</pre><button class="sm" data-aicopy>\${T('ai.copy')}</button>
    <p class="hint" style="margin-top:12px">\${T('ai.chatgpt')}</p></div>\`;
}
try{if(localStorage.getItem('dedcut-mcp')==='1')setTimeout(()=>mcpSet(true),1500)}catch(x){}
window.addEventListener('dedcut-lang',()=>{aiBadge();if($('#aidlg'))openAI()});

/* ---------- boutons & clavier ---------- */`);
rep("    {label:'kb.title',fn:openKeys},", "    {label:'kb.title',fn:openKeys},\n    {label:'ai.menu',fn:()=>openAI()},");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.aibox')) {
  css += `
/* connecteur IA */
.aibox{width:min(620px,calc(100vw - 32px));overflow-y:auto}
.aibox>p{margin:8px 0;font-size:13px;line-height:1.45}
.aion{margin:10px 0 4px;padding:8px 10px;border:1px solid var(--line);border-radius:4px}
.aistate{font-size:12px;color:var(--dim)}
.aistate.on{color:#4ade80}
.aisteps{margin:6px 0 10px 18px;padding:0;font-size:12.5px;line-height:1.6}
.aicfg{max-height:110px;overflow:auto;font:11px/1.4 Consolas,monospace;background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:8px;white-space:pre-wrap;word-break:break-all;margin:4px 0 6px}
.aiok{color:#4ade80;margin-left:8px;align-self:center}
.aibadge{margin-left:8px;padding:2px 9px;font-size:11px;border-radius:10px;background:rgba(74,222,128,.15);color:#4ade80;border:1px solid rgba(74,222,128,.4)}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.25 : connecteur IA');

// v4.17 : guides d'aperçu, temps à taper, pipette, coller une image / vidéo (Ctrl+V). Idées vues dans OpenCut (MIT), code écrit pour DedCut. À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), A = path.resolve(__dirname, '../../src/App.tsx'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };

/* App.tsx : bouton des guides + calque des guides */
a = rep(a, '<div id="vwrap"><canvas id="cv" width="1280" height="720"></canvas></div>',
  '<div id="vwrap"><canvas id="cv" width="1280" height="720"></canvas><canvas id="guides"></canvas></div>');
a = rep(a, '<button data-i18n-title="ui.snapTip" id="bSnap"',
  '<button data-i18n-title="guide.tip" id="bGuide" data-ico="guides" title="Guides d’aperçu"></button>\n                <button data-i18n-title="ui.snapTip" id="bSnap"');
a = rep(a, '<span id="tc"><b>00:00:00</b> / 00:00:00</span>', '<span id="tc" data-i18n-title="tc.tip" title="Clique pour taper un moment précis"><b>00:00:00</b> / 00:00:00</span>');

/* icônes */
e = rep(e, "const ICO={\n", "const ICO={\n  guides:'<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"1.5\"/><path d=\"M9 5v14M15 5v14M3 10h18M3 14h18\" stroke-dasharray=\"2 2\"/>',\n  pipette:'<path d=\"m14 4 6 6M17 7l-9.5 9.5L5 19l-1-1 2.5-2.5L16 6\"/><path d=\"M15 3l6 6\"/>',\n");

/* guides : dessinés sur un calque au-dessus de l'aperçu, jamais exportés */
e = rep(e, "  cv.style.width=w+'px';cv.style.height=h+'px';cv.style.left=Math.round((r.width-w)/2)+'px';cv.style.top=Math.round((r.height-h)/2)+'px';\n}",
`  cv.style.width=w+'px';cv.style.height=h+'px';cv.style.left=Math.round((r.width-w)/2)+'px';cv.style.top=Math.round((r.height-h)/2)+'px';
  drawGuides();
}
/* ---------- guides d'aperçu (grille des tiers, centre, marges, zones cachées par les applis) ---------- */
var guides=null;
try{guides=Object.assign({thirds:false,center:false,safe:false,ui:false},JSON.parse(localStorage.getItem('dedcut-guides')||'{}'))}catch(x){guides={thirds:false,center:false,safe:false,ui:false}}
function drawGuides(){
  const gcv=$('#guides');if(!gcv||!guides)return;
  const on=Object.values(guides).some(Boolean);const bg=$('#bGuide');if(bg)bg.classList.toggle('on',on);
  gcv.style.display=on?'':'none';if(!on)return;
  const w=parseFloat(cv.style.width)||cv.clientWidth,h=parseFloat(cv.style.height)||cv.clientHeight,d=devicePixelRatio||1;
  gcv.style.left=cv.style.left;gcv.style.top=cv.style.top;gcv.style.width=w+'px';gcv.style.height=h+'px';gcv.width=Math.round(w*d);gcv.height=Math.round(h*d);
  const g=gcv.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);g.lineWidth=1;
  const line=(x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  if(guides.ui){
    /* zones approximatives : en vertical, barre du haut, légende en bas, colonne de boutons à droite ; sinon barre de lecture en bas */
    const zones=W<H?[[0,0,1,.09],[0,.8,1,.2],[.85,.38,.15,.42]]:[[0,.88,1,.12]];
    g.fillStyle='rgba(239,68,68,.2)';g.strokeStyle='rgba(239,68,68,.75)';
    for(const[x,y,zw,zh]of zones){g.fillRect(w*x,h*y,w*zw,h*zh);g.strokeRect(w*x+.5,h*y+.5,w*zw-1,h*zh-1)}
    const lz=zones[W<H?1:0];g.fillStyle='rgba(255,255,255,.9)';g.font='600 11px "Segoe UI", sans-serif';g.fillText(T('guide.uiLabel'),8,h*lz[1]+16);
  }
  if(guides.thirds){g.strokeStyle='rgba(255,255,255,.5)';for(const k of[1/3,2/3]){line(Math.round(w*k)+.5,0,Math.round(w*k)+.5,h);line(0,Math.round(h*k)+.5,w,Math.round(h*k)+.5)}}
  if(guides.center){g.strokeStyle='rgba(56,189,248,.85)';g.setLineDash([6,4]);line(Math.round(w/2)+.5,0,Math.round(w/2)+.5,h);line(0,Math.round(h/2)+.5,w,Math.round(h/2)+.5);g.setLineDash([])}
  if(guides.safe){g.setLineDash([4,4]);g.strokeStyle='rgba(250,204,21,.85)';g.strokeRect(w*.05,h*.05,w*.9,h*.9);g.strokeStyle='rgba(250,204,21,.45)';g.strokeRect(w*.1,h*.1,w*.8,h*.8);g.setLineDash([])}
}
$('#bGuide').onclick=e=>{
  e.stopPropagation();let m=$('#guideMenu');if(m){m.remove();return}
  m=document.createElement('div');m.id='guideMenu';m.className='gmenu';
  m.innerHTML=[['thirds','guide.thirds'],['center','guide.center'],['safe','guide.safe'],['ui','guide.ui']].map(([k,n])=>\`<label class="chk"><span>\${T(n)}</span><input type="checkbox" data-g="\${k}" \${guides[k]?'checked':''}></label>\`).join('')+\`<p class="hint">\${T('guide.hint')}</p>\`;
  document.body.appendChild(m);
  const r=e.currentTarget.getBoundingClientRect(),mh=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.right-m.offsetWidth))+'px';m.style.top=(r.top-mh-6>8?r.top-mh-6:r.bottom+6)+'px';
  m.onchange=ev=>{const k=ev.target.dataset.g;if(!k)return;guides[k]=ev.target.checked;try{localStorage.setItem('dedcut-guides',JSON.stringify(guides))}catch(x){}drawGuides()};
};
document.addEventListener('pointerdown',e=>{const m=$('#guideMenu');if(m&&!m.contains(e.target)&&!e.target.closest('#bGuide'))m.remove()});
window.addEventListener('dedcut-lang',()=>{const m=$('#guideMenu');if(m)m.remove();drawGuides()});`);

/* temps à taper : clic sur le compteur */
e = rep(e, "  $('#tc').innerHTML='<b>'+fmtTC(time)+'</b> / '+fmtTC(total());",
           "  if(!tcEditing)$('#tc').innerHTML='<b>'+fmtTC(time)+'</b> / '+fmtTC(total());");
e = rep(e, "/* ---------- boutons & clavier ---------- */",
`/* ---------- compteur : taper un moment (90 · 1:30 · 1:30:15 = minutes:secondes:images) ---------- */
var tcEditing=false;
function parseTC(s){
  s=String(s).trim().replace(',','.');if(!s)return null;
  const p=s.split(':');if(p.length>3||p.some(x=>x===''||isNaN(+x)))return null;
  const n=p.map(Number);
  if(n.length===1)return n[0];
  if(n.length===2)return n[0]*60+n[1];
  return n[0]*60+n[1]+n[2]/30;
}
$('#tc').addEventListener('click',()=>{
  if(tcEditing)return;tcEditing=true;pause();
  const box=$('#tc');box.innerHTML=\`<input id="tcIn" type="text" spellcheck="false" value="\${fmtTC(time)}">\`;
  const inp=$('#tcIn');inp.focus();inp.select();
  const done=ok=>{if(!tcEditing)return;tcEditing=false;
    if(ok){const v=parseTC(inp.value);if(v==null)toast(T('tc.bad'));else seek(clamp(v,0,total()))}
    box.innerHTML='<b>'+fmtTC(time)+'</b> / '+fmtTC(total())};
  inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')done(true);if(ev.key==='Escape')done(false)});
  inp.addEventListener('blur',()=>done(true));
});

/* ---------- coller une image / une vidéo / un son depuis le presse-papiers (Ctrl+V) ---------- */
let pasteWant=0;
document.addEventListener('paste',async e=>{
  if(/INPUT|TEXTAREA/.test((e.target&&e.target.tagName)||'')||window.dedcutHomeVisible)return;
  const files=[...((e.clipboardData&&e.clipboardData.files)||[])].filter(f=>/^(image|video|audio)\\//.test(f.type));
  if(!files.length)return;
  e.preventDefault();clearTimeout(pasteWant);pasteWant=0;
  const stamp=new Date().toISOString().slice(0,19).replace('T',' ').replace(/:/g,'-');let n=0;
  for(const f of files){
    const generic=/^(image|blob)\\.\\w+$/i.test(f.name)||!f.name;
    const ext=(f.type.split('/')[1]||'png').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'');
    const file=generic?new File([f],T('paste.name',{date:stamp})+(files.length>1?' '+(n+1):'')+'.'+ext,{type:f.type}):f;
    try{await addGenerated(file);n++}catch(x){}
  }
  if(n){showTab('media');toast(T('paste.done',{count:n}))}
});

/* ---------- boutons & clavier ---------- */`);
e = rep(e, "  else if(C&&k==='v')pasteClip(time);", "  else if(C&&k==='v'){clearTimeout(pasteWant);pasteWant=setTimeout(()=>{pasteWant=0;pasteClip(time)},80)} // une image collée annule ce collage de clip");

/* pipette à côté des couleurs du panneau de droite */
e = rep(e, "  const CO=(l,k)=>`<div class=\"fld\"><label>${T(l)}</label><input data-k=\"${k}\" data-t=\"s\" type=\"color\" value=\"${V(k)||'#000000'}\"></div>`;",
  "  const CO=(l,k)=>`<div class=\"fld\"><label>${T(l)}</label><div class=\"colrow\"><input data-k=\"${k}\" data-t=\"s\" type=\"color\" value=\"${V(k)||'#000000'}\">${window.EyeDropper?`<button class=\"pip\" data-pip=\"1\" title=\"${T('pip.tip')}\">${ico('pipette',15)}</button>`:''}</div></div>`;");
e = rep(e, "  const c=selClip(),d=t.dataset,A=d.act;\n",
`  const c=selClip(),d=t.dataset,A=d.act;
  if(d.pip&&window.EyeDropper){const inp=t.parentElement.querySelector('input[type=color]');new EyeDropper().open().then(r=>{inp.value=r.sRGBHex;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}))}).catch(()=>{});return}
`);

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('#guides{')) {
  css += `
/* guides d'aperçu (jamais exportés) */
#guides{position:absolute;pointer-events:none;z-index:2;display:none}
#bGuide.on{color:var(--ac)}
.gmenu{position:fixed;z-index:9999;width:270px;background:var(--panel2,#17151f);border:1px solid var(--line2,rgba(255,255,255,.14));border-radius:6px;padding:8px 10px;box-shadow:0 12px 34px #000a}
.gmenu .chk{margin:2px 0}
.gmenu .hint{margin:6px 0 0;font-size:11px}
/* compteur : on peut taper un moment */
#tc{cursor:text}
#tcIn{width:92px;font:inherit;font-weight:700;padding:1px 5px;border-radius:3px}
/* pipette à côté des couleurs */
.colrow{display:flex;gap:6px;align-items:stretch}
.colrow input[type=color]{flex:1;min-width:0}
.colrow .pip{flex:none;width:32px;padding:0;display:grid;place-items:center}
`;
  fs.writeFileSync(C, css);
}
console.log('outils : guides, temps, pipette, coller');

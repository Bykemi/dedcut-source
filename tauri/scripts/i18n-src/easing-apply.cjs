// v4.18 : courbe du mouvement entre deux images clés (k.e sur l'image clé de départ ; absente = « douce », comme avant). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const E = path.resolve(__dirname, '../../public/engine.js'), C = path.resolve(__dirname, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8');
const rep = (x, y) => { const n = e.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); e = e.replace(x, () => y); };

rep("function kfVal(c,k,loc){",
`/* courbes du mouvement (u de 0 à 1 entre deux images clés) */
const EASE={
  linear:u=>u,smooth:u=>u*u*(3-2*u),in:u=>u*u*u,out:u=>1-Math.pow(1-u,3),
  inout:u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,
  back:u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2)},
  bounce:u=>{const n=7.5625,d=2.75;if(u<1/d)return n*u*u;if(u<2/d)return n*(u-=1.5/d)*u+.75;if(u<2.5/d)return n*(u-=2.25/d)*u+.9375;return n*(u-=2.625/d)*u+.984375},
  elastic:u=>u<=0?0:u>=1?1:Math.pow(2,-10*u)*Math.sin((u*10-.75)*2*Math.PI/3)+1,
  hold:u=>u<1?0:1
};
const EASE_KEYS=Object.keys(EASE);
function easeIcon(k){let d='';for(let i=0;i<=24;i++){const u=i/24,y=EASE[k](u);d+=(i?'L':'M')+(3+u*28).toFixed(1)+' '+(19-y*14).toFixed(1)}return \`<svg viewBox="0 0 34 22" width="34" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="\${d}"/></svg>\`}
/* image clé de départ du passage où se trouve la tête de lecture (null si on n'est pas entre deux images clés) */
function kfSeg(c){const K=c&&c.kf;if(!K||K.length<2)return null;const loc=time-c.start;for(let i=0;i<K.length-1;i++)if(loc>=K[i].t-.04&&loc<K[i+1].t-.001)return i;return null}
function kfVal(c,k,loc){`);
rep("const u=(loc-a.t)/Math.max(1e-6,b.t-a.t),e=u*u*(3-2*u);return f(a)+(f(b)-f(a))*e}",
    "const u=(loc-a.t)/Math.max(1e-6,b.t-a.t),e=(EASE[a.e]||EASE.smooth)(u);return f(a)+(f(b)-f(a))*e}");

// barre des images clés : choix de la courbe
rep("${kf?`<button data-act=\"kfclear\" title=\"${T('kf.clearTip')}\">✕</button>`:''}</div>`;",
    "${kf?`<button data-act=\"kfclear\" title=\"${T('kf.clearTip')}\">✕</button>`:''}</div>${kf?easeUI():''}`;\n  const easeUI=()=>{const i=kfSeg(c);if(i==null)return`<p class=\"hint\" style=\"margin:-4px 0 10px\">${T('ease.none')}</p>`;const a=c.kf[i],b=c.kf[i+1],cur=a.e||'smooth';\n    return`<div class=\"easebox\"><div class=\"easeh\"><b>${T('ease.title')}</b><span class=\"hint\">${T('ease.hint',{a:fmt(a.t),b:fmt(b.t)})}</span></div><div class=\"easegrid\">${EASE_KEYS.map(k=>`<button data-kfe=\"${k}\" class=\"${k===cur?'on':''}\" title=\"${T('ease.'+k)}\">${easeIcon(k)}<span>${T('ease.'+k)}</span></button>`).join('')}</div><button class=\"sm\" data-kfeall=\"${cur}\" style=\"margin-top:6px\">${T('ease.all')}</button></div>`};");
rep("  if(d.vcat){vCat=d.vcat;renderInspector();return}",
    "  if(d.vcat){vCat=d.vcat;renderInspector();return}\n  if(d.kfe){const i=kfSeg(c);if(i!=null){c.kf[i].e=d.kfe;commit();refresh()}return}\n  if(d.kfeall){if(c.kf){c.kf.forEach(k=>{k.e=d.kfeall});commit();refresh()}return}");

new Function(e);
fs.writeFileSync(E, e);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.easebox')) {
  css += `
/* courbes du mouvement (images clés) */
.easebox{margin:-2px 0 12px;padding:8px;border:1px solid var(--line);border-radius:4px;background:var(--panel2,rgba(255,255,255,.02))}
.easeh{display:flex;flex-direction:column;gap:2px;margin-bottom:6px;font-size:12px}
.easegrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.easegrid button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;font-size:10.5px;line-height:1.1;white-space:normal}
.easegrid button.on{color:var(--ac);border-color:var(--ac)}
`;
  fs.writeFileSync(C, css);
}
console.log('courbes du mouvement ajoutées');

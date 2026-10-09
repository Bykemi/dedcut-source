// v4.20 : éléments animés avec styles (p.st), 11 nouveaux éléments, barre de progression déplaçable / redimensionnable,
// onglet Formes refait comme l'onglet Effets. Le code est dans widgets2-draw.js (dessin) et widgets2-ui.js (bibliothèque). À lancer une seule fois.
const fs = require('fs'), path = require('path');
const D = __dirname, E = path.resolve(D, '../../public/engine.js'), A = path.resolve(D, '../../src/App.tsx'), C = path.resolve(D, '../../src/dedcut.css');
let e = fs.readFileSync(E, 'utf8'), a = fs.readFileSync(A, 'utf8');
const draw = fs.readFileSync(path.join(D, 'widgets2-draw.js'), 'utf8'), ui = fs.readFileSync(path.join(D, 'widgets2-ui.js'), 'utf8');
const rep = (s, x, y) => { const n = s.split(x).length - 1; if (n !== 1) throw new Error((n ? n + ' occurrences' : 'introuvable') + ' : ' + x.slice(0, 90)); return s.replace(x, () => y); };
const R1 = (x, y) => { e = rep(e, x, y); };

/* App.tsx : nouvel onglet Formes */
{
  const s = '            <div className="tab" id="t-stick" hidden>', i = a.indexOf(s), j = a.indexOf('            <div className="tab" id="t-fx" hidden>', i);
  if (i < 0 || j < 0) throw new Error('onglet Formes introuvable');
  a = a.slice(0, i) + `            <div className="tab" id="t-stick" hidden>
              <h2 data-i18n="shape.title">Formes &amp; stickers</h2>
              <div data-i18n="wl.hint" className="hint" style={{"marginBottom":"8px"}}>Passe la souris sur un élément pour le voir bouger. Clic = l’ajouter à la tête de lecture.</div>
              <div className="fcats" id="wcats"></div>
              <div id="wlist"></div>
              <div id="emoBox"><h3 data-i18n="shape.stickers">Stickers</h3><div className="chips c4 emo" id="emolist"></div></div>
              <div className="shp" id="shplist" hidden></div>
            </div>

` + a.slice(j);
}

/* moteur : dessin des éléments */
R1("function drawGenOverlay(c,t){\n  const p=c.p,loc=t-c.start;ctx.save();ctx.globalAlpha=(p.op??100)/100;\n",
   draw + "\nfunction drawGenOverlay(c,t){\n  const p=c.p,loc=t-c.start;ctx.save();ctx.globalAlpha=(p.op??100)/100;\n  if(WDRAW[c.gen]){try{WDRAW[c.gen](c,p,loc,t)}finally{ctx.restore()}return}\n");
R1("const GN={pbar:'wdg.pbar',count:'wdg.count',timer:'wdg.timer',sub:'wdg.sub',",
   "const GN={pbar:'wdg.pbar',count:'wdg.count',timer:'wdg.timer',sub:'wdg.sub',lower:'wdg.lower',chat:'wdg.chat',hearts:'wdg.hearts',confetti:'wdg.confetti',rec:'wdg.rec',pin:'wdg.pin',swipe:'wdg.swipe',stars:'wdg.stars',pulse:'wdg.pulse',arrowp:'wdg.arrowp',spin:'wdg.spin',");
// la barre de progression se déplace (x/y animables) et s'agrandit (largeur) comme les autres éléments
R1("  if(c.gen)return c.gen==='hud'||c.gen==='pbar'?['p.op']:", "  if(c.gen)return c.gen==='hud'?['p.op']:");
R1("h+=S(T('common.position'),kfBar()+(c.gen!=='hud'&&c.gen!=='pbar'?", "h+=S(T('common.position'),kfBar()+(c.gen!=='hud'?");
R1("c.mid?'p.scale':c.gen==='shape'?'p.w':null", "c.mid?'p.scale':c.gen==='shape'||c.gen==='pbar'?'p.w':WSIZE.has(c.gen)?'p.size':null");
// panneau de droite : réglages générés depuis WINSP
R1("      if(c.gen==='terminal')h+=S(T('gen.terminal'),", "      if(WINSP[c.gen])h+=S(T(GN[c.gen]),wInsp(c,p,R,CO,CK));\n      else if(c.gen==='terminal')h+=S(T('gen.terminal'),");
R1("  if(d.wpos){c.p.pos=d.wpos;commit();refresh();return}", "  if(d.wst){c.p.st=d.wst;commit();refresh();return}\n  if(d.wpos){const th=c.p.th??1.2;c.p.x=50;c.p.y=d.wpos==='top'?th/2+.6:d.wpos==='bottom'?100-th/2-.6:50;commit();refresh();return}");
// bibliothèque : remplace l'ancienne liste de la 4.19
{
  const s = '/* éléments animés (onglet Formes) */', end = "  add(newClip({track:tk('over'),gen:k,start:D.start??time,dur:D.dur,p:D.p}));\n});\n";
  const i = e.indexOf(s), j = e.indexOf(end, i);
  if (i < 0 || j < 0) throw new Error('ancienne liste des éléments introuvable');
  e = e.slice(0, i) + ui + e.slice(j + end.length);
}
R1("  if(t==='text')renderTextTab();\n}", "  if(t==='text')renderTextTab();\n  if(t==='stick')renderWL();\n}");

new Function(e);
fs.writeFileSync(E, e); fs.writeFileSync(A, a);
let css = fs.readFileSync(C, 'utf8');
if (!css.includes('.wst{')) {
  css += `
/* éléments animés : choix du style dans le panneau de droite */
.wst{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0 0 10px}
.wst button{font-size:11px;padding:5px 4px;white-space:normal;line-height:1.15}
.wst button.on{color:var(--ac);border-color:var(--ac);background:rgba(var(--acrgb),.12)}
#emoBox h3{margin-top:14px}
`;
  fs.writeFileSync(C, css);
}
console.log('v4.20 : bibliothèque d’éléments animés');

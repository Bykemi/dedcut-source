// Applique le logo officiel DedCut (branding/logo-dedcut.svg : « D » coupé en diagonale avec un bouton lecture, dégradé cyan → violet).
// Fabrique : branding/icon-1024.png (symbole), branding/logo-complet.png (symbole + mot DedCut), logo de l'interface et favicon.
// Ensuite : npx tauri icon branding/icon-1024.png   puis   (depuis src-tauri) node installer/make-images.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const B = f => path.join(root, 'branding', f);

(async () => {
  const sym = fs.readFileSync(B('logo-dedcut.svg'));
  const full = fs.readFileSync(B('logo-dedcut-complet.svg'));
  const symbol = await sharp(sym, { density: 192 }).resize(1024, 1024).png().toBuffer();
  fs.writeFileSync(B('icon-1024.png'), symbol);
  fs.writeFileSync(B('logo-complet.png'), await sharp(full, { density: 192 }).resize({ height: 400 }).trim().png().toBuffer());
  const uri = async n => 'data:image/png;base64,' + (await sharp(symbol).resize(n, n).png({ compressionLevel: 9 }).toBuffer()).toString('base64');
  const hlogo = await uri(192), fav = await uri(64);
  let app = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
  const a2 = app.replace(/(id="hlogo" alt="DedCut" src=")data:[^"]+(")/, (_, a, b) => a + hlogo + b);
  if (a2 === app) throw new Error('logo de l\'interface introuvable dans App.tsx');
  fs.writeFileSync(path.join(root, 'src', 'App.tsx'), a2);
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const h2 = html.replace(/(<link rel="icon" href=")data:[^"]+(")/, (_, a, b) => a + fav + b);
  if (h2 === html) throw new Error('favicon introuvable dans index.html');
  fs.writeFileSync(path.join(root, 'index.html'), h2);
  console.log('logo appliqué');
})().catch(e => { console.error(e); process.exit(1); });

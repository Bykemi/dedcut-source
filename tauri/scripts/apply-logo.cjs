// Applique le logo DedCut (branding/logo-dedcut.webp) : symbole carré, icônes, logo de l'écran d'accueil, favicon.
// Utilisation : node scripts/apply-logo.cjs   (depuis tauri)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'branding', 'logo-dedcut.webp');

async function bbox(buf, y0, y1) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, ya = info.height, yb = 0;
  for (let y = y0; y < Math.min(y1, info.height); y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < ya) ya = y; if (y > yb) yb = y; }
  }
  return { left: x0, top: ya, width: x1 - x0 + 1, height: yb - ya + 1 };
}

(async () => {
  const input = fs.readFileSync(src);
  const meta = await sharp(input).metadata();
  // le symbole « D » occupe le haut ; le mot « DedCut » est en dessous (vers 72 % de la hauteur)
  const cut = Math.round(meta.height * 0.72);
  const sb = await bbox(input, 0, cut);
  const pad = Math.round(Math.max(sb.width, sb.height) * 0.06), side = Math.max(sb.width, sb.height) + pad * 2;
  const ext = await sharp(input).extract(sb).png().toBuffer();
  const symbol = await sharp(ext).extend({
    top: Math.round((side - sb.height) / 2), bottom: side - sb.height - Math.round((side - sb.height) / 2),
    left: Math.round((side - sb.width) / 2), right: side - sb.width - Math.round((side - sb.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }).png().toBuffer();
  const symbol1024 = await sharp(symbol).resize(1024, 1024).png().toBuffer();
  fs.writeFileSync(path.join(root, 'branding', 'icon-1024.png'), symbol);
  const full = await sharp(input).extract(await bbox(input, 0, meta.height)).png().toBuffer();
  fs.writeFileSync(path.join(root, 'branding', 'logo-complet.png'), full);

  const uri = async (buf, n) => 'data:image/png;base64,' + (await sharp(buf).resize(n, n).png({ compressionLevel: 9 }).toBuffer()).toString('base64');
  const hlogo = await uri(symbol, 192), fav = await uri(symbol, 64);

  let app = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
  app = app.replace(/(id="hlogo" alt="DedCut" src=")data:[^"]+(")/, (_, a, b) => a + hlogo + b);
  fs.writeFileSync(path.join(root, 'src', 'App.tsx'), app);
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/(<link rel="icon" href=")data:[^"]+(")/, (_, a, b) => a + fav + b);
  fs.writeFileSync(path.join(root, 'index.html'), html);
  console.log('symbole', sb, 'ok');
})().catch(e => { console.error(e); process.exit(1); });

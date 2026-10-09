// Fabrique les images de l'installateur / désinstalleur (BMP 24 bits) à partir du logo DedCut.
// Utilisation : node installer/make-images.cjs   (depuis src-tauri)
const sharp = require('../../node_modules/sharp');
const fs = require('fs');
const path = require('path');

// Logo DedCut officiel (tauri/branding) : symbole seul et logo complet avec le mot DedCut
const b64 = (f, n) => require("fs").readFileSync(require("path").join(__dirname, "../../branding", f)).toString("base64");
const SYM = "data:image/png;base64," + b64("icon-1024.png");
const FULL = "data:image/png;base64," + b64("logo-complet.png");
const symbol = (x, y, size) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="${SYM}"/>`;

// bandeau de gauche (pages d'accueil et de fin) : 164 x 314
const sidebar = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#1b1140"/><stop offset=".55" stop-color="#0d0a1f"/><stop offset="1" stop-color="#08070f"/></linearGradient>
    <radialGradient id="glowC" cx="0" cy="0" r="1" gradientTransform="translate(20 40) scale(150)"><stop offset="0" stop-color="#22d3ee" stop-opacity=".26"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowV" cx="0" cy="0" r="1" gradientTransform="translate(150 300) scale(170)"><stop offset="0" stop-color="#7c3aed" stop-opacity=".7"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
  </defs>
  <rect width="164" height="314" fill="url(#bg)"/>
  <rect width="164" height="314" fill="url(#glowC)"/>
  <rect width="164" height="314" fill="url(#glowV)"/>
  <g opacity=".13" stroke="#ffffff" stroke-width="1">
    <path d="M-10 250 L174 190"/><path d="M-10 272 L174 212"/><path d="M-10 294 L174 234"/>
  </g>
  ${symbol(32, 44, 100)}
  <text x="82" y="190" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="31" letter-spacing="-.5" fill="#ffffff">Ded<tspan fill="#22d3ee">Cut</tspan></text>
  <rect x="48" y="206" width="68" height="3" rx="1.5" fill="url(#line)"/>
  <text x="82" y="296" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="11" fill="#c4b5fd" opacity=".9">ByKemi</text>
</svg>`;

// en-tête des pages intérieures : 150 x 57 (fond sombre du thème DedCut, comme la zone d'en-tête)
const header = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs><linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
    <radialGradient id="g" cx="0" cy="0" r="1" gradientTransform="translate(140 0) scale(90)"><stop offset="0" stop-color="#7c3aed" stop-opacity=".35"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs>
  <rect width="150" height="57" fill="#13101c"/><rect width="150" height="57" fill="url(#g)"/>
  ${symbol(10, 9, 38)}
  <text x="54" y="35" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="23" letter-spacing="-.4" fill="#ffffff">Ded<tspan fill="#22d3ee">Cut</tspan></text>
  <rect x="55" y="42" width="40" height="2" rx="1" fill="url(#line)"/>
</svg>`;

function bmp24(raw, w, h) { // raw = RGB, 3 octets par pixel, ligne par ligne du haut vers le bas
  const row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size);
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
  b.writeInt32LE(2835, 38); b.writeInt32LE(2835, 42);
  for (let y = 0; y < h; y++) {
    const dst = 54 + (h - 1 - y) * row;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 3;
      b[dst + x * 3] = raw[s + 2]; b[dst + x * 3 + 1] = raw[s + 1]; b[dst + x * 3 + 2] = raw[s];
    }
  }
  return b;
}

(async () => {
  for (const [name, svg, w, h] of [['sidebar', sidebar, 164, 314], ['header', header, 150, 57]]) {
    // rendu 4x puis réduction : bords lisses
    const png = await sharp(Buffer.from(svg), { density: 288 }).resize(w, h).flatten({ background: '#13101c' }).removeAlpha().raw().toBuffer();
    fs.writeFileSync(path.join(__dirname, name + '.bmp'), bmp24(png, w, h));
    await sharp(png, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(__dirname, name + '-apercu.png'));
    console.log(name + '.bmp', w + 'x' + h);
  }
})().catch(e => { console.error(e); process.exit(1); });

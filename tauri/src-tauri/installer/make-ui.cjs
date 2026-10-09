// Fabrique les images de l'installateur DedCut (v4.59) : bandeau du haut, boutons, champ, cases à cocher, choix.
// Tout est dessiné ici en SVG (couleurs de DedCut : --bg #09080f, --panel #121019, --ac #a78bfa, --ac2 #22d3ee),
// puis enregistré en BMP 24 bits pour chaque zoom d'écran (100, 125, 150, 175, 200 %) : jamais d'image agrandie floue.
// Les textes (traduits) sont écrits par l'installateur lui-même au moment de l'affichage (dedcut-ui.nsh).
// Utilisation : node installer/make-ui.cjs   (depuis src-tauri)
const sharp = require('../../node_modules/sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'ui');
const BG = '#09080f';
const SCALES = { 100: 1, 125: 1.25, 150: 1.5, 175: 1.75, 200: 2 };
const ICON = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../branding/icon-1024.png')).toString('base64');

// Tailles à 100 % (doivent rester celles de dedcut-ui.nsh)
const W = 620, HERO_H = 168;

const hero = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HERO_H}" viewBox="0 0 ${W} ${HERO_H}">
  <defs>
    <radialGradient id="v" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(130 -20) scale(300 210)"><stop offset="0" stop-color="#7c3aed" stop-opacity=".55"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="c" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(540 30) scale(250 170)"><stop offset="0" stop-color="#22d3ee" stop-opacity=".30"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <radialGradient id="p" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(400 190) scale(240 120)"><stop offset="0" stop-color="#f472b6" stop-opacity=".13"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r=".9" fill="#ffffff" fill-opacity=".09"/></pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m"><rect width="${W}" height="${HERO_H}" fill="url(#fade)"/></mask>
    <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG}" stop-opacity="0"/><stop offset="1" stop-color="${BG}"/></linearGradient>
    <linearGradient id="cut" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
    <linearGradient id="trk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity="1"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="tm"><rect width="${W}" height="${HERO_H}" fill="url(#trk)"/></mask>
  </defs>
  <rect width="${W}" height="${HERO_H}" fill="${BG}"/>
  <rect width="${W}" height="${HERO_H}" fill="url(#v)"/>
  <rect width="${W}" height="${HERO_H}" fill="url(#c)"/>
  <rect width="${W}" height="${HERO_H}" fill="url(#p)"/>
  <rect width="${W}" height="${HERO_H}" fill="url(#dots)" mask="url(#m)"/>
  <!-- pistes de montage très discrètes derrière le logo -->
  <g mask="url(#tm)" opacity=".16">
    <rect x="30" y="52" width="150" height="9" rx="4.5" fill="#22d3ee"/><rect x="190" y="52" width="90" height="9" rx="4.5" fill="#a78bfa"/>
    <rect x="370" y="52" width="120" height="9" rx="4.5" fill="#22d3ee"/><rect x="500" y="52" width="110" height="9" rx="4.5" fill="#a78bfa"/>
    <rect x="0" y="70" width="110" height="9" rx="4.5" fill="#f472b6"/><rect x="120" y="70" width="170" height="9" rx="4.5" fill="#a78bfa"/>
    <rect x="340" y="70" width="80" height="9" rx="4.5" fill="#f472b6"/><rect x="430" y="70" width="190" height="9" rx="4.5" fill="#22d3ee"/>
    <rect x="60" y="88" width="200" height="9" rx="4.5" fill="#22d3ee"/><rect x="380" y="88" width="150" height="9" rx="4.5" fill="#f472b6"/>
  </g>
  <!-- logo officiel + nom -->
  <image x="${W / 2 - 34}" y="26" width="68" height="68" href="${ICON}"/>
  <text x="${W / 2}" y="134" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="30" letter-spacing="-.4" fill="#ffffff">Ded<tspan fill="url(#cut)">Cut</tspan></text>
  <rect width="${W}" height="${HERO_H}" fill="url(#bot)" opacity=".0"/>
  <rect y="${HERO_H - 34}" width="${W}" height="34" fill="url(#bot)"/>
</svg>`;

// Bouton : `kind` = pri (dégradé DedCut), sec (sombre), sm (petit sombre) ; `hot` = survolé
const button = (w, h, kind, hot) => {
  const r = h * 0.26;
  if (kind === 'pri') return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hot ? '#b9a2fc' : '#9f7ff8'}"/><stop offset="1" stop-color="${hot ? '#3ddcf2' : '#1fc3de'}"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="${BG}"/>
    <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="url(#g)"/>
    <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="url(#s)"/>
  </svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${kind === 'smc' ? '#121019' : BG}"/>
    <rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="${r}" fill="${hot ? '#2a2538' : '#1a1724'}" stroke="${hot ? '#5b4f7a' : '#312b41'}" stroke-width="1.2"/>
  </svg>`;
};

// Champ « dossier d'installation » (le texte et le bouton « Changer » sont posés dessus)
const field = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="9" fill="#121019" stroke="#312b41" stroke-width="1.2"/>
  <g transform="translate(13 ${h / 2 - 8})" fill="none" stroke="#a78bfa" stroke-width="1.6" stroke-linejoin="round"><path d="M1 3.5 Q1 2 2.5 2 H6.5 L8.3 4 H14.5 Q16 4 16 5.5 V13 Q16 14.5 14.5 14.5 H2.5 Q1 14.5 1 13 Z"/></g>
</svg>`;

// Case à cocher et choix (rond), cochés ou non
const check = (s, on) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 20 20">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
  <rect width="20" height="20" fill="${BG}"/>
  ${on ? `<rect x="1" y="1" width="18" height="18" rx="5" fill="url(#g)"/><path d="M5.4 10.4 L8.6 13.4 L14.8 6.8" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<rect x="1.6" y="1.6" width="16.8" height="16.8" rx="4.6" fill="#121019" stroke="#4a4160" stroke-width="1.4"/>`}
</svg>`;
const radio = (s, on) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 20 20">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
  <rect width="20" height="20" fill="${BG}"/>
  <circle cx="10" cy="10" r="8.3" fill="#121019" stroke="${on ? 'url(#g)' : '#4a4160'}" stroke-width="${on ? 2 : 1.4}"/>
  ${on ? '<circle cx="10" cy="10" r="4.4" fill="url(#g)"/>' : ''}
</svg>`;

// Barre de progression : fond et remplissage (le remplissage est étiré par l'installateur)
const track = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/><rect width="${w}" height="${h}" rx="${h / 2}" fill="#1a1724"/></svg>`;

function bmp24(raw, w, h) { // raw = RGB, 3 octets par pixel, du haut vers le bas
  const row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size);
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
  b.writeInt32LE(2835, 38); b.writeInt32LE(2835, 42);
  for (let y = 0; y < h; y++) {
    const dst = 54 + (h - 1 - y) * row;
    for (let x = 0; x < w; x++) { const s = (y * w + x) * 3; b[dst + x * 3] = raw[s + 2]; b[dst + x * 3 + 1] = raw[s + 1]; b[dst + x * 3 + 2] = raw[s]; }
  }
  return b;
}

// [nom, fabrique(svg à la taille 100 %), largeur, hauteur] — tailles à 100 %
const ITEMS = [
  ['hero', () => hero(), W, HERO_H],
  ['pri', () => button(168, 42, 'pri', false), 168, 42], ['pri-h', () => button(168, 42, 'pri', true), 168, 42],
  ['sec', () => button(128, 42, 'sec', false), 128, 42], ['sec-h', () => button(128, 42, 'sec', true), 128, 42],
  ['sm', () => button(96, 30, 'smc', false), 96, 30], ['sm-h', () => button(96, 30, 'smc', true), 96, 30],
  ['field', () => field(548, 46), 548, 46],
  ['chk0', () => check(20, false), 20, 20], ['chk1', () => check(20, true), 20, 20],
  ['rad0', () => radio(20, false), 20, 20], ['rad1', () => radio(20, true), 20, 20],
  ['track', () => track(548, 8), 548, 8],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [pct, s] of Object.entries(SCALES)) {
    for (const [name, make, w, h] of ITEMS) {
      const pw = Math.round(w * s), ph = Math.round(h * s);
      // rendu très grand puis réduction : bords lisses
      const raw = await sharp(Buffer.from(make()), { density: 72 * s * 4 }).resize(pw, ph, { fit: 'fill' }).flatten({ background: BG }).removeAlpha().raw().toBuffer();
      fs.writeFileSync(path.join(OUT, `${name}-${pct}.bmp`), bmp24(raw, pw, ph));
      if (process.env.APERCU && (pct === '100' || name === 'hero')) await sharp(raw, { raw: { width: pw, height: ph, channels: 3 } }).png().toFile(path.join(process.env.APERCU, `${name}-${pct}.png`));
    }
  }
  console.log('images de l\'installateur :', fs.readdirSync(OUT).filter(f => f.endsWith('.bmp')).length, 'fichiers BMP dans installer/ui');
})().catch(e => { console.error(e); process.exit(1); });

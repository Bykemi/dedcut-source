// QR code (v4.65) : fabriqué sur ce PC avec la bibliothèque qrcode-generator (Kazuhiko Arase, licence MIT).
// Utilisé par le Montage (élément « QR code »), le studio Live (source « QR code ») et l'espace Image (calque).
// « QR Code » est une marque déposée de DENSO WAVE INCORPORATED.
import qrcode from 'qrcode-generator';

type Ecc = 'L' | 'M' | 'Q' | 'H';
export interface QrOpts { dark?: string; light?: string | null; dots?: boolean; margin?: number; ecc?: Ecc }

const cache = new Map<string, boolean[][] | null>();
/** cases du QR code (true = case foncée), ou null si le texte est trop long */
export function qrMatrix(text: string, ecc: Ecc = 'M'): boolean[][] | null {
  const key = ecc + '|' + text;
  if (cache.has(key)) return cache.get(key)!;
  let m: boolean[][] | null = null;
  try {
    // texte en UTF-8 (accents, japonais…) : c'est ce que lisent les téléphones (la bibliothèque ne garderait qu'un octet par lettre)
    (qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes = (str: string) => Array.from(new TextEncoder().encode(str));
    const q = qrcode(0, ecc); q.addData(text || ' ', 'Byte'); q.make();
    const n = q.getModuleCount(); m = [];
    for (let r = 0; r < n; r++) { const row: boolean[] = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
  } catch { m = null; }
  if (cache.size > 60) cache.delete(cache.keys().next().value as string);
  cache.set(key, m);
  return m;
}

/** dessine le QR code dans un carré (x, y, côté) ; fond clair arrondi sauf si light = null ; dots = points ronds */
export function qrDraw(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, o: QrOpts = {}): boolean {
  const m = qrMatrix(text, o.ecc || 'M'); if (!m) return false;
  const n = m.length, q = o.margin ?? 2, cell = size / (n + 2 * q), dark = o.dark || '#111111';
  g.save();
  if (o.light) { g.fillStyle = o.light; g.beginPath(); g.roundRect(x, y, size, size, cell * 1.6); g.fill(); }
  g.fillStyle = dark;
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  g.beginPath();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!m[r][c] || (o.dots && finder(r, c))) continue;
    const px = x + (c + q) * cell, py = y + (r + q) * cell;
    if (o.dots) { g.moveTo(px + cell * .99, py + cell / 2); g.arc(px + cell / 2, py + cell / 2, cell * .49, 0, Math.PI * 2); }
    else g.rect(px - .25, py - .25, cell + .5, cell + .5); // un peu plus grand : pas de fines lignes entre les cases
  }
  g.fill();
  if (o.dots) {
    // les trois repères des coins : carrés arrondis (anneau + centre)
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      const px = x + (c0 + q) * cell, py = y + (r0 + q) * cell;
      g.beginPath(); g.roundRect(px, py, cell * 7, cell * 7, cell * 2); g.roundRect(px + cell, py + cell, cell * 5, cell * 5, cell * 1.4); g.fill('evenodd');
      g.beginPath(); g.roundRect(px + cell * 2, py + cell * 2, cell * 3, cell * 3, cell); g.fill();
    }
  }
  g.restore();
  return true;
}

declare global { interface Window { dedcutQR?: { matrix: typeof qrMatrix; draw: typeof qrDraw } } }
window.dedcutQR = { matrix: qrMatrix, draw: qrDraw };

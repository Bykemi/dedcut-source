// DedCut Musique — accordeur (v4.54) : la note jouée ou chantée au micro, son octave et l'écart en centièmes de demi-ton.
// Le micro n'est ouvert que pendant que la fenêtre est ouverte, et refermé dès qu'on la ferme. Tout se passe sur ce PC.
// Hauteur trouvée par autocorrélation (méthode classique « ACF » avec interpolation), sur 2048 échantillons, 20 fois par seconde.
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { Modal } from './dialogs';
import { NOTE_FR, NOTE_N } from './model';

const latin = () => /^(fr|es|it|pt)/.test(document.documentElement.lang || 'fr');
const SOLFEGE: Record<string, string[]> = { fr: NOTE_FR, es: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'], it: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'], pt: ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'] };

/** fréquence fondamentale (Hz) d'un bloc de son, ou 0 si trop faible / pas de hauteur nette */
export function pitchOf(buf: Float32Array, sr: number): number {
  const n = buf.length; let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / n);
  if (rms < .01) return 0;
  // on enlève les bords silencieux
  let a = 0, b = n - 1; const th = .2;
  for (let i = 0; i < n / 2; i++) if (Math.abs(buf[i]) < th) { a = i; break; }
  for (let i = 1; i < n / 2; i++) if (Math.abs(buf[n - i]) < th) { b = n - i; break; }
  const x = buf.subarray(a, b), m = x.length; if (m < 256) return 0;
  const L = Math.min(m - 1, Math.floor(sr / 50)), c = new Float32Array(L + 1); // décalages utiles seulement (notes au-dessus de 50 Hz)
  for (let lag = 0; lag <= L; lag++) { let s = 0; for (let i = 0; i < m - lag; i++) s += x[i] * x[i + lag]; c[lag] = s; }
  let d = 0; while (d < L && c[d] > c[d + 1]) d++;
  let best = -1, bi = -1; for (let i = d; i <= L; i++) if (c[i] > best) { best = c[i]; bi = i; }
  if (bi <= 0 || best < c[0] * .4) return 0;
  const y1 = c[bi - 1], y2 = c[bi], y3 = c[bi + 1] ?? y2, A = (y1 + y3 - 2 * y2) / 2, B = (y3 - y1) / 2;
  const T0 = A ? bi - B / (2 * A) : bi, f = sr / T0;
  return f > 30 && f < 2000 ? f : 0;
}

export function TunerDlg() {
  const [ref, setRef] = useState(() => +(localStorage.getItem('dedcut-tuner-a4') || 440) || 440);
  const [st, setSt] = useState<{ f: number; note: string; oct: number; cents: number } | null>(null);
  const [err, setErr] = useState('');
  const refA = useRef(ref); refA.current = ref;
  useEffect(() => {
    let alive = true, stream: MediaStream | null = null, ac: AudioContext | null = null, raf = 0, hold = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (!alive) { stream.getTracks().forEach(x => x.stop()); return; }
        ac = new AudioContext(); const an = ac.createAnalyser(); an.fftSize = 2048; ac.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        let fr = 0;
        const loop = () => {
          if (!alive) return; raf = requestAnimationFrame(loop); if (++fr % 3) return; // environ 20 mesures par seconde
          an.getFloatTimeDomainData(buf); const f = pitchOf(buf, ac!.sampleRate);
          if (f) {
            const midi = 69 + 12 * Math.log2(f / refA.current), k = Math.round(midi), names = latin() ? SOLFEGE[(document.documentElement.lang || 'fr').slice(0, 2)] || NOTE_FR : NOTE_N;
            setSt({ f, note: names[((k % 12) + 12) % 12], oct: Math.floor(k / 12) - 1, cents: Math.round((midi - k) * 100) }); hold = 0;
          } else if (++hold > 14) setSt(null); // note tenue un instant après la fin du son
        };
        loop();
      } catch { if (alive) setErr(t('mu.tu.noMic')); }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach(x => x.stop()); void ac?.close(); };
  }, []);
  const c = st ? Math.max(-50, Math.min(50, st.cents)) : 0, ok = !!st && Math.abs(st.cents) <= 5;
  return <Modal title={t('mu.tu.title')}>
    <div className="mu-tuner">
      {err ? <p className="mu-dim">{err}</p> : <>
        <div className={'mu-tu-note' + (ok ? ' ok' : '')}>{st ? <>{st.note}<sub>{st.oct}</sub></> : '–'}</div>
        <div className="mu-tu-scale" aria-hidden="true">
          {[-50, -25, 0, 25, 50].map(x => <span key={x} style={{ left: (50 + x) + '%' }}>{x > 0 ? '+' + x : x}</span>)}
          <i className={'mu-tu-needle' + (ok ? ' ok' : '')} style={{ left: (50 + c) + '%', opacity: st ? 1 : .25 }} />
        </div>
        <p className="mu-tu-info">{st ? (ok ? t('mu.tu.ok') : st.cents < 0 ? t('mu.tu.low') : t('mu.tu.high')) + ' · ' + st.f.toFixed(1) + ' Hz' : t('mu.tu.play')}</p>
        <label className="mu-tu-ref">{t('mu.tu.ref')}<input type="number" min={415} max={466} value={ref} onChange={e => { const v = Math.max(415, Math.min(466, +e.target.value || 440)); setRef(v); localStorage.setItem('dedcut-tuner-a4', String(v)); }} /> Hz</label>
      </>}
    </div>
  </Modal>;
}

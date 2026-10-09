// DedCut Image — ce que l'assistant IA peut faire dans l'espace Image (v4.50) : window.dedcutImageAPI, appelé par le moteur
// (public/engine/12c-spaces.js). Chaque action passe par l'historique d'Image : Ctrl+Z l'annule.
import { ed, newDocument, openDialog } from './state';
import { t } from '../i18n';
import { newAdjust, newText, walk, type FilterDef } from './doc';
import { PRESETS } from './dialogs';

type Look = 'bw' | 'sepia' | 'vivid' | 'warm' | 'cool' | 'vintage';
const f = (kind: string, v: number): FilterDef => ({ kind, v, on: true });
const LOOKS: Record<Look, FilterDef[]> = {
  bw: [f('grayscale', 100), f('contrast', 112)],
  sepia: [f('sepia', 85), f('contrast', 105)],
  vivid: [f('saturate', 140), f('contrast', 110), f('vibrance', 20)],
  warm: [f('temp', 35), f('saturate', 108)],
  cool: [f('temp', -35), f('contrast', 104)],
  vintage: [f('sepia', 38), f('contrast', 90), f('brightness', 106), f('saturate', 85)]
};
const need = () => { if (!ed.doc) throw new Error('no image open: create one with image_new or ask the user to open a picture'); return ed.doc; };
/** calque d'image le plus haut (pour l'amélioration automatique et le détourage) */
function pickPixelLayer() {
  const d = need(); const list = [...walk(d.layers)].map(x => x.l).filter(l => (l.type === 'raster' || l.type === 'smart') && l.visible);
  const l = list[list.length - 1]; if (l) d.sel = [l.id]; return l;
}

export function installImageAPI() {
  (window as unknown as { dedcutImageAPI: unknown }).dedcutImageAPI = {
    info() {
      const d = ed.doc;
      return {
        open: ed.docs.map(s => ({ name: s.doc.name, width: s.doc.w, height: s.doc.h })),
        current: d ? { name: d.name, width: d.w, height: d.h, layers: [...walk(d.layers)].map(x => ({ name: x.l.name, type: x.l.type })) } : null,
        presets: PRESETS.map(p => p.id), looks: Object.keys(LOOKS)
      };
    },
    newDoc(preset: string, name?: string) {
      const p = PRESETS.find(x => x.id === preset) || PRESETS[0];
      newDocument(name || t('img.pr.' + p.id), p.w, p.h, '#ffffff', p.dpi || 72, 'srgb');
      return { name: ed.doc!.name, width: p.w, height: p.h };
    },
    async enhance() { pickPixelLayer(); const m = await import('./autofix'); await m.autoEnhance(); return { done: 'auto enhance' }; },
    async removeBackground() { pickPixelLayer(); const m = await import('./ai'); await m.removeBackground(); return { done: 'background removed (mask)' }; },
    addText(text: string, o: { size?: 'title' | 'normal'; color?: string } = {}) {
      const d = need(), big = o.size !== 'normal';
      const l = newText(String(text).slice(0, 200), d.w / 2, big ? d.h * .2 : d.h * .5, {
        font: big ? 'Anton' : 'Bahnschrift', size: Math.round(d.h * (big ? .12 : .06)), align: 'center', caps: big,
        fill: { kind: 'color', color: /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color! : '#ffffff' }, stroke: { on: big, color: '#000000', width: Math.round(d.h * .01) }
      });
      ed.act('img.h.newLayer', (_tx, dd) => { ed.insert(dd, l, dd.layers[dd.layers.length - 1] || null); }, 'all');
      return { layer: l.name };
    },
    look(name: string) {
      const k = (name in LOOKS ? name : 'vivid') as Look, d = need();
      const l = newAdjust(t('img.look.' + k), LOOKS[k].map(x => ({ ...x })));
      ed.act('img.h.newLayer', (_tx, dd) => { ed.insert(dd, l, dd.layers[dd.layers.length - 1] || null); }, 'all');
      void d; return { look: k };
    },
    exportDialog() { need(); openDialog('export'); return { opened: 'export window' }; }
  };
}

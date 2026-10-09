// DedCut Image — l'éditeur unique de l'espace Image, branché sur React, et les actions sur les fichiers
// (nouveau, ouvrir, importer comme calque, enregistrer, exporter, reprise après un plantage).
import { useSyncExternalStore } from 'react';
import { t } from '../i18n';
import { Editor } from './editor';
import { Doc, newDoc, mkCanvas, ctx2d, newRaster, curLayer, walk } from './doc';
import { decode, docFromImage, smartFromImage, serialize, deserialize, readPath, writeFile, bridge, ImgError, OPEN_EXT, IMG_EXT, exportBlob, ExpOpts, FORMAT_INFO, autoList, autoDrop, AutoEntry } from './io';
import { missingFonts } from './text';
import { setDocRef, showSel } from './select';
import { renderDoc } from './render';

export const ed = new Editor();
ed.tr = (k, n) => t(k, n);
ed.toastFn = (k, n) => toast(t(k, n));
setDocRef(() => ed.doc);
ed.afterRestore = () => showSel(ed.doc);

/** document du dernier clic (la fenêtre principale ou une fenêtre à part) : les sélecteurs de fichiers s'y ouvrent */
export const lastDoc = { d: document as Document };
/** re-dessine un composant React quand l'éditeur change */
export function useEd(): number { return useSyncExternalStore(f => ed.on(f), () => ed.v); }

/* ---------- petits messages ---------- */
let toastT = 0;
/** saisie d'un texte dans la fenêtre au style de DedCut (prompt() ouvrirait une boîte de Windows) ; null si on annule */
export function askText(msg: string, def = ''): Promise<string | null> {
  const f = (window as unknown as { askText?: (m: string, d: string) => Promise<string | null> }).askText;
  return f ? f(msg, def) : Promise.resolve(window.prompt(msg, def));
}
export function toast(msg: string) {
  const w = window as unknown as { toast?: (m: string) => void };
  if (w.toast) { w.toast(msg); return; }
  let el = document.getElementById('imToast'); if (!el) { el = document.createElement('div'); el.id = 'imToast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => el!.classList.remove('on'), 2600);
}
export function errText(e: unknown): string {
  const c = e instanceof ImgError ? e.code : '';
  if (c) return t('img.err.' + c);
  return t('img.err.other', { error: String((e as Error)?.message || e).slice(0, 120) });
}

/* ---------- fenêtres de l'espace Image (une seule à la fois) ---------- */
export type DialogKind = null | string;
export const ui = { dialog: null as DialogKind, vw: 1200, vh: 800, full: false, menu: '' as string, palette: false, focusFilter: -1, compare: false, cmpX: .5 };
/** image telle qu'elle était à l'ouverture (comparaison avant / après) */
export function snapOrig() { const ds = ed.ds; if (ds) (ds as typeof ds & { orig?: HTMLCanvasElement }).orig = renderDoc(ds.doc, 1, true); }
export function openDialog(d: DialogKind) { ui.dialog = d; ed.emit(); }

/* ---------- documents ---------- */
export function newDocument(name: string, w: number, h: number, bg: string | null, dpi: number, space: 'srgb' | 'display-p3') {
  ed.newDocument(name || t('img.untitled'), Math.round(w), Math.round(h), bg, dpi, space); ed.fit(ui.vw, ui.vh); snapOrig(); ed.emit();
}
const nameOf = (p: string) => p.split(/[\\/]/).pop() || p;

/** ouvre des fichiers (images ou projets .dcimg) : chacun dans son propre onglet */
export async function openFiles(files: { name: string; blob: Blob; path?: string }[]) {
  for (const f of files) {
    try {
      let doc: Doc;
      if (/\.dcimg$/i.test(f.name)) doc = await deserialize(f.blob);
      else { const d = await decode(f.blob, f.name); doc = docFromImage(d, f.name, f.blob); }
      doc.path = /\.dcimg$/i.test(f.name) && f.path ? f.path : null;
      ed.add(doc, ui.vw, ui.vh); snapOrig();
      if (/\.dcimg$/i.test(f.name)) ed.markSaved();
      warnFonts(doc);
    } catch (e) { toast(nameOf(f.name) + ' : ' + errText(e)); }
  }
}
/** polices utilisées par le document qui manquent sur ce PC (le texte s'affiche avec une police de secours) */
function warnFonts(doc: Doc) {
  const fonts: string[] = []; for (const { l } of walk(doc.layers)) if (l.type === 'text') fonts.push(l.st.font);
  const miss = missingFonts(fonts); if (miss.length) toast(t('img.t.missingFonts', { list: miss.join(', ') }));
}
/** fenêtre « Ouvrir » (Windows) ou sélecteur du navigateur */
export async function pickAndOpen(asLayer = false) {
  const b = bridge();
  if (b) {
    const list = await b.open(t(asLayer ? 'img.f.importLayer' : 'img.f.open'), asLayer ? IMG_EXT : OPEN_EXT, true).catch(() => []);
    const files = []; for (const f of list) { try { files.push({ name: f.name, blob: await readPath(f.path), path: f.path }); } catch (e) { toast(f.name + ' : ' + errText(e)); } }
    return asLayer ? importLayers(files) : openFiles(files);
  }
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = (asLayer ? IMG_EXT : OPEN_EXT).map(e => '.' + e).join(',');
  inp.onchange = () => { const files = [...(inp.files || [])].map(f => ({ name: f.name, blob: f as Blob })); if (asLayer) importLayers(files); else openFiles(files); };
  inp.click();
}
/** importe des images dans le document ouvert : chacune devient un calque intelligent (l'original est gardé) */
export async function importLayers(files: { name: string; blob: Blob; path?: string }[], at?: { x: number; y: number }) {
  if (!ed.doc) return openFiles(files);
  for (const f of files) {
    try {
      if (/\.dcimg$/i.test(f.name)) { await openFiles([f]); continue; }
      const d = await decode(f.blob, f.name), doc = ed.doc!;
      if (d.psd) { ed.act('img.h.import', (_tx, dd) => { for (const l of d.psd!.layers) ed.insert(dd, l); }, 'all'); continue; }
      const s = smartFromImage(d, f.name, f.blob, doc); if (f.path) s.link = f.path;
      if (at) { s.tf.x = at.x; s.tf.y = at.y; }
      ed.act('img.h.import', (_tx, dd) => { ed.insert(dd, s); }, 'all');
    } catch (e) { toast(nameOf(f.name) + ' : ' + errText(e)); }
  }
}
/** remplace le contenu d'un calque intelligent par un autre fichier (taille et position gardées) */
export async function replaceSmart() {
  const l = ed.layer; if (!l || l.type !== 'smart') return;
  const b = bridge(); let file: { name: string; blob: Blob; path?: string } | null = null;
  if (b) { const [f] = await b.open(t('img.f.replace'), IMG_EXT, false).catch(() => []); if (f) file = { name: f.name, blob: await readPath(f.path), path: f.path }; }
  else file = await new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = IMG_EXT.map(e => '.' + e).join(','); i.onchange = () => { const f = i.files?.[0]; ok(f ? { name: f.name, blob: f } : null); }; i.click(); });
  if (!file) return;
  try {
    const d = await decode(file.blob, file.name), oldW = l.sw * l.tf.sx, oldH = l.sh * l.tf.sy;
    ed.act('img.h.replace', () => {
      l.src = d.cv; l.blob = file!.blob; l.mime = d.mime; l.srcName = file!.name; l.link = file!.path || null; l.sw = d.cv.width; l.sh = d.cv.height;
      const k = Math.min(Math.abs(oldW) / l.sw, Math.abs(oldH) / l.sh); l.tf.sx = Math.sign(l.tf.sx) * k; l.tf.sy = Math.sign(l.tf.sy) * k; l.quad = null;
    }, 'all');
  } catch (e) { toast(errText(e)); }
}

/* ---------- enregistrer (projet .dcimg avec tous les calques) ---------- */
export async function saveDoc(as = false): Promise<boolean> {
  const ds = ed.ds; if (!ds) return false; const doc = ds.doc, b = bridge();
  try {
    let path = as ? null : doc.path;
    if (b && !path) { path = await b.saveDialog(doc.name, t('img.f.project'), 'dcimg'); if (!path) return false; }
    const blob = await serialize(doc);
    // relecture avant d'écrire : un projet qui ne se rouvre pas n'est jamais enregistré
    await deserialize(blob);
    await writeFile(blob, doc.name + '.dcimg', path);
    if (path) { doc.path = path; doc.name = nameOf(path).replace(/\.dcimg$/i, ''); }
    ed.markSaved(); toast(t('img.t.saved')); return true;
  } catch (e) { toast(errText(e)); return false; }
}

/* ---------- exporter ---------- */
export async function exportDoc(doc: Doc, o: ExpOpts, sizes: number[] = [1]): Promise<number> {
  const b = bridge(), info = FORMAT_INFO[o.format]; let n = 0;
  for (const k of sizes) {
    const suffix = sizes.length > 1 ? (k === 1 ? '' : '@' + k + 'x') : '';
    const name = doc.name + suffix + '.' + info.ext;
    try {
      let path: string | null = null;
      if (b) { path = await b.saveDialog(name, t('img.f.export'), info.ext); if (!path) continue; }
      const blob = await exportBlob(doc, { ...o, scale: o.scale * k, w: o.w ? Math.round(o.w * k) : undefined, h: o.h ? Math.round(o.h * k) : undefined });
      await writeFile(blob, name, path); n++;
    } catch (e) { toast(errText(e)); }
  }
  if (n) toast(t('img.t.exported', { count: n }));
  return n;
}

/* ---------- reprise après un plantage ---------- */
export const recover = { list: [] as AutoEntry[] };
export async function checkRecover() { recover.list = await autoList(); if (recover.list.length) openDialog('recover'); }
export async function restoreAuto(e: AutoEntry) {
  try { const doc = await deserialize(e.data); doc.path = e.path; ed.add(doc, ui.vw, ui.vh); ed.ds!.key = e.key; ed.ds!.doc.dirty = true; } catch (err) { toast(errText(err)); }
  recover.list = recover.list.filter(x => x !== e); if (!recover.list.length) ui.dialog = null; ed.emit();
}
export async function dropAuto(e: AutoEntry) { await autoDrop(e.key); recover.list = recover.list.filter(x => x !== e); if (!recover.list.length) ui.dialog = null; ed.emit(); }

/* ---------- fermer un document (avec question si pas enregistré) ---------- */
export async function closeDoc(i: number) {
  const ds = ed.docs[i]; if (!ds) return;
  if (ds.doc.dirty) {
    const ask = (window as unknown as { askYes?: (m: string) => Promise<boolean> }).askYes;
    const ok = ask ? await ask(t('img.q.closeDirty', { name: ds.doc.name })) : window.confirm(t('img.q.closeDirty', { name: ds.doc.name }));
    if (!ok) return;
  }
  ed.close(i);
}

/* ---------- copier / coller une image ---------- */
export async function pasteImage() {
  try {
    const items = await navigator.clipboard.read();
    for (const it of items) for (const ty of it.types) if (ty.startsWith('image/')) { const blob = await it.getType(ty); await importLayers([{ name: t('img.pasted') + '.png', blob }]); return; }
    toast(t('img.t.noClipImage'));
  } catch { toast(t('img.t.noClipImage')); }
}
export async function copyMerged() {
  const d = ed.doc; if (!d) return;
  const { renderDoc } = await import('./render');
  const c = renderDoc(d, 1, true), blob = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/png'));
  if (!blob) return;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('img.t.copied')); } catch { toast(t('img.t.copyFail')); }
}

export { mkCanvas, ctx2d, newRaster, newDoc, curLayer };

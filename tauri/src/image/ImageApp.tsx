// DedCut Image — l'espace Image : menus, onglets des documents, outils, options, image, panneaux, barre d'état.
import { useEffect, useRef, useState } from 'react';
import { t, useLang, fmt } from '../i18n';
import { ed, ui, useEd, openDialog, openFiles, importLayers, closeDoc, checkRecover, toast } from './state';
import { CMDS, cmd, runCmd, setTool, TOOL_IDS, keyName, setViewRef } from './commands';
import { Viewport, over } from './view';
import { Tools } from './tools';
import { Ico } from './icons';
import { Panels } from './panels';
import { PanelWindows } from './popout';
import { CtxMenu, openCtx } from './ctxmenu';
import { menuBlocked } from './stylus';
import { installImageAPI } from './aiapi';
import * as PRO from './pro';
import { Dialogs } from './dialogs';
import { OptionsBar } from './options';
import { showSel } from './select';
import { readPath } from './io';
import { setFontLoaded } from './text';
import './retouch';
import './image.css';

const MENUS = ['file', 'edit', 'image', 'layer', 'select', 'filter', 'view'];
const TOOL_GROUPS: string[][] = [['move'], ['select', 'lasso', 'wand', 'selbrush'], ['crop'], ['brush', 'pencil', 'eraser', 'smudge'], ['fill', 'gradient', 'picker'],
  ['clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'redeye', 'liquify'], ['text', 'shape', 'pen', 'direct'], ['hand', 'zoom']];
const TOOL_ICON: Record<string, string> = { shape: 'shape', select: 'select' };

export default function ImageApp() {
  useLang(); useEd();
  const host = useRef<HTMLDivElement>(null), cvRef = useRef<HTMLCanvasElement>(null), tools = useRef<Tools | null>(null);
  const [menu, setMenu] = useState('');
  // vue + outils
  useEffect(() => {
    const cv = cvRef.current!, vp = new Viewport(cv), tl = new Tools(vp, host.current!); tools.current = tl; setViewRef(tl);
    const ro = new ResizeObserver(() => { const r = cv.parentElement!.getBoundingClientRect(); vp.resize(r.width, r.height); });
    ro.observe(cv.parentElement!);
    const off = ed.on(() => { vp.need = true; cv.style.cursor = tl.cursor(); });
    setFontLoaded(() => { ed.ds?.comp.all(); vp.need = true; });
    const pd = (e: PointerEvent) => { cv.setPointerCapture(e.pointerId); tl.down(e); cv.style.cursor = tl.cursor(); };
    const pm = (e: PointerEvent) => tl.move(e), pu = (e: PointerEvent) => { tl.up(e); cv.style.cursor = tl.cursor(); };
    const wh = (e: WheelEvent) => tl.wheel(e), lv = () => { over.cursor = null; over.hover = null; vp.need = true; };
    const dbl = () => { if (ed.tool === 'pen') tl.penFinish(); };
    cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu);
    cv.addEventListener('wheel', wh, { passive: false }); cv.addEventListener('pointerleave', lv); cv.addEventListener('dblclick', dbl);
    // sauvegarde automatique (reprise après un plantage)
    const auto = window.setInterval(() => ed.autoTick(), 20000);
    checkRecover();
    return () => {
      cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointermove', pm); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu);
      cv.removeEventListener('wheel', wh); cv.removeEventListener('pointerleave', lv); cv.removeEventListener('dblclick', dbl);
      ro.disconnect(); off(); vp.destroy(); window.clearInterval(auto); tools.current = null; setViewRef(null);
    };
  }, []);
  // clavier (seulement quand l'espace Image est affiché et qu'on n'écrit pas dans un champ)
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!document.getElementById('imgApp') || (document.getElementById('imgApp') as HTMLElement).hidden) return;
      const el = e.target as HTMLElement; if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const tl = tools.current;
      if (e.key === ' ' && tl && !tl.space) { tl.space = true; if (cvRef.current) cvRef.current.style.cursor = 'grab'; e.preventDefault(); return; }
      if (e.key === 'Escape') { if (ui.palette) { ui.palette = false; ed.emit(); return; } if (tl?.drag) { ed.cancel(); tl.drag = null; } if (ed.tool === 'crop') tl?.cropReset(); if (ed.tool === 'pen') tl?.penCancel(); over.marquee = null; tl && (tl.vp.need = true); return; }
      if (e.key === 'Enter') { if (ed.tool === 'crop' && over.crop) { tl?.cropApply(); return; } if (ed.tool === 'pen') { tl?.penFinish(); return; } if (ed.tool === 'lasso' && tl) { (tl as unknown as { polyFinish?: () => void }).polyFinish?.(); return; } }
      if (e.key.startsWith('Arrow') && ed.tool === 'move' && ed.doc) {
        const n = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0, dy = e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0;
        e.preventDefault(); ed.act('img.h.move', (_tx, d) => { ed.translate(d.sel.map(id => { for (const x of [...walkAll(d.layers)]) if (x.id === id) return x; return null; }).filter(Boolean) as never, dx, dy); }, 'all'); return;
      }
      const k = keyName(e), keys = ed.settings.keys;
      const id = Object.keys(keys).find(c => keys[c] === k); if (!id) return;
      e.preventDefault();
      if ((TOOL_IDS as string[]).includes(id)) setTool(id as never); else runCmd(id);
    };
    const ku = (e: KeyboardEvent) => { if (e.key === ' ' && tools.current) { tools.current.space = false; if (cvRef.current) cvRef.current.style.cursor = tools.current.cursor(); } };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    // bouton « Disposition » de l'en-tête de DedCut (10q-stlayout.js)
    const lay = () => openDialog('layout'); window.addEventListener('dedcut-image-layout', lay);
    // coller une image (Ctrl+V depuis une autre appli)
    const paste = (e: ClipboardEvent) => {
      if ((document.getElementById('imgApp') as HTMLElement | null)?.hidden) return;
      const el = e.target as HTMLElement; if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      const f = [...(e.clipboardData?.files || [])].filter(x => x.type.startsWith('image/')); if (!f.length) return;
      e.preventDefault(); importLayers(f.map(x => ({ name: x.name || t('img.pasted') + '.png', blob: x })));
    };
    window.addEventListener('paste', paste);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('paste', paste); window.removeEventListener('dedcut-image-layout', lay); };
  }, []);
  // fichiers glissés depuis Windows (chemins donnés par Tauri) ou depuis un navigateur
  // images envoyées par le Montage (clic droit sur un clip → « Envoyer à Image ») : un nouveau document chacune
  useEffect(() => {
    const W = window as unknown as { dedcutImageQueue?: { blob: Blob; name: string }[] };
    const drain = () => { const q = W.dedcutImageQueue || []; if (!q.length) return; const files = q.splice(0); openFiles(files); };
    drain(); window.addEventListener('dedcut-image-import', drain); return () => window.removeEventListener('dedcut-image-import', drain);
  }, []);
  // l'assistant IA peut agir dans Image (12c-spaces.js)
  useEffect(() => { installImageAPI(); return () => { delete (window as unknown as { dedcutImageAPI?: unknown }).dedcutImageAPI; }; }, []);
  // miniatures demandées par le Montage (15f-thumb.js) : un nouveau document en calques chacune
  useEffect(() => {
    const W = window as unknown as { dedcutThumbQueue?: import('./thumbnail').ThumbJob[] };
    const drain = async () => { const q = W.dedcutThumbQueue || []; if (!q.length) return; const m = await import('./thumbnail'); for (const j of q.splice(0)) await m.makeThumbnail(j); };
    drain(); window.addEventListener('dedcut-thumb', drain); return () => window.removeEventListener('dedcut-thumb', drain);
  }, []);
  useEffect(() => {
    const w = window as unknown as { dedcutDrop?: (paths: string[], x: number, y: number) => void };
    const prev = w.dedcutDrop;
    w.dedcutDrop = (paths, x, y) => {
      if ((document.getElementById('imgApp') as HTMLElement | null)?.hidden) return prev?.(paths, x, y);
      (async () => {
        const files = []; for (const p of paths) { try { files.push({ name: p.split(/[\\/]/).pop() || p, blob: await readPath(p), path: p }); } catch (e) { toast(String(e)); } }
        const r = cvRef.current?.getBoundingClientRect(), inCanvas = r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        const at = inCanvas && tools.current && ed.doc ? tools.current.vp.toDoc(x - r!.left, y - r!.top) : undefined;
        if (ed.doc && inCanvas) importLayers(files, at); else openFiles(files);
      })();
    };
    return () => { w.dedcutDrop = prev; };
  }, []);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); const f = [...e.dataTransfer.files]; if (!f.length) return;
    const files = f.map(x => ({ name: x.name, blob: x as Blob }));
    if (ed.doc && e.target === cvRef.current) importLayers(files, tools.current!.vp.toDoc(e.nativeEvent.offsetX, e.nativeEvent.offsetY)); else openFiles(files);
  };
  const ds = ed.ds, doc = ed.doc;
  const hov = over.hover, zoom = ds ? ds.view.zoom : 1;
  return (
    <div className={'im-app' + (ui.full ? ' im-full' : '') + (ed.settings.side === 'left' ? ' im-left' : '')} ref={host} onDragOver={e => e.preventDefault()} onDrop={onDrop} onPointerDown={() => menu && setMenu('')}>
      <div className="im-menubar" onPointerDown={e => e.stopPropagation()}>
        {MENUS.map(m => (
          <div key={m} className={'im-menu' + (menu === m ? ' on' : '')}>
            <button onClick={() => setMenu(menu === m ? '' : m)} onMouseEnter={() => menu && setMenu(m)}>{t('img.m.' + m)}</button>
            {menu === m && <div className="im-drop">
              {m === 'filter' ? <><FilterMenu close={() => setMenu('')} /><hr /><button onClick={() => { setMenu(''); runCmd('extensions'); }}><i><Ico n="ext" s={14} /></i><span>{t('img.c.extensions')}</span><kbd /></button></> : CMDS.filter(c => c.menu === m).map(c => {
                const off = c.on && !c.on();
                return [c.sep && <hr key={c.id + 's'} />, <button key={c.id} disabled={!!off} onClick={() => { setMenu(''); c.run(); }}>
                  <i>{c.check ? (c.check() ? <Ico n="check" s={14} /> : null) : c.icon ? <Ico n={c.icon} s={14} /> : null}</i>
                  <span>{t('img.c.' + c.id)}</span><kbd>{fmtKey(ed.settings.keys[c.id])}</kbd></button>];
              })}
            </div>}
          </div>
        ))}
        <div className="im-tabs">
          {ed.docs.map((d, i) => (
            <div key={d.key} className={'im-tab' + (i === ed.cur ? ' on' : '')} onClick={() => { ed.cur = i; showSel(ed.doc); ed.emit(); }} title={d.doc.path || d.doc.name}>
              <span>{d.doc.name}</span>{d.doc.dirty && <b className="im-dot" />}
              <button title={t('img.c.close')} onClick={e => { e.stopPropagation(); closeDoc(i); }}><Ico n="close" s={12} /></button>
            </div>
          ))}
          <button className="im-tabadd" title={t('img.c.new')} onClick={() => openDialog('new')}><Ico n="plus" s={14} /></button>
        </div>
        <button className="im-pal" title={t('img.c.palette') + ' (' + fmtKey(ed.settings.keys.palette) + ')'} onClick={() => { ui.palette = true; ed.emit(); }}><Ico n="search" s={15} /></button>
      </div>
      <OptionsBar tools={tools} />
      <div className="im-main">
        <div className="im-toolbar">
          {TOOL_GROUPS.map((g, gi) => <div key={gi} className="im-tgroup">{g.map(id => (
            <button key={id} className={ed.tool === id ? 'on' : ''} title={t('img.tool.' + id) + (ed.settings.keys[id] ? ' (' + fmtKey(ed.settings.keys[id]) + ')' : '')}
              onClick={() => { if (tools.current?.textEl) tools.current.textCommit(); setTool(id as never); if (id === 'crop') tools.current?.cropReset(); else over.crop = null; }}>
              <Ico n={TOOL_ICON[id] || id} s={19} /></button>))}</div>)}
          <div className="im-colors">
            <button className="im-fg" style={{ background: ed.fg }} title={t('img.fg')} onClick={() => { ui.dialog = null; ed.settings.panels.color = true; ed.emit(); }} />
            <button className="im-bg" style={{ background: ed.bg }} title={t('img.bg')} onClick={() => runCmd('swap')} />
            <button className="im-swap" title={t('img.c.swap') + ' (X)'} onClick={() => runCmd('swap')}><Ico n="swap" s={12} /></button>
          </div>
        </div>
        <div className="im-stage" onContextMenu={e => { if (menuBlocked()) { e.preventDefault(); return; } const l = ed.layer; if (!ed.doc) return; openCtx(e, [
          { label: 'img.cx.sendImage', icon: 'export', run: () => PRO.sendToMontage() },
          { label: 'img.cx.sendLayer', icon: 'layers', run: () => { if (l) PRO.sendToMontage(l); }, off: !l || l.type === 'adjust' },
          { label: 'img.c.copy', icon: 'dup', run: () => runCmd('copy'), sep: true }, { label: 'img.c.paste', run: () => runCmd('paste') },
          { label: 'img.c.dupLayer', run: () => runCmd('dupLayer'), off: !l, sep: true }, { label: 'img.c.undo', icon: 'undo', run: () => runCmd('undo'), off: !ed.ds?.hist.canUndo }]); }}>
          <canvas ref={cvRef} className="im-cv" />
          {!doc && <Welcome />}
        </div>
        {!ui.full && <Panels tools={tools} />}
      </div>
      <div className="im-status">
        {doc ? <>
          <span>{doc.w} × {doc.h} px · {doc.dpi} ppp</span>
          <span className="im-zoom"><button onClick={() => runCmd('zoomOut')}><Ico n="minus" s={12} /></button><b onClick={() => runCmd('fit')} title={t('img.c.fit')}>{fmt.percent(zoom)}</b><button onClick={() => runCmd('zoomIn')}><Ico n="plus" s={12} /></button></span>
          <span className="im-zoom"><button title={t('img.c.rotViewL')} onClick={() => runCmd('rotViewL')}><Ico n="rotl" s={13} /></button><b onClick={() => runCmd('rotView0')}>{Math.round(ds!.view.rot)}°</b><button title={t('img.c.rotViewR')} onClick={() => runCmd('rotViewR')}><Ico n="rotr" s={13} /></button></span>
          {hov && <span>x {Math.floor(hov.x)} · y {Math.floor(hov.y)}</span>}
          <button className={'im-ib' + (ui.compare ? ' on' : '')} title={t('img.c.compare') + ' (' + fmtKey(ed.settings.keys.compare) + ')'} onClick={() => runCmd('compare')}><Ico n="compare" s={14} /></button>
          <span className="im-sp" />
          <span title={t('img.memTip')}>{t('img.mem', { size: fmt.bytes(ds!.hist.bytes) })}</span>
          {ed.settings.lowPC && <span className="im-badge">{t('img.lowPC')}</span>}
        </> : <span>{t('img.noDoc')}</span>}
      </div>
      <Dialogs tools={tools} />
      <PanelWindows tools={tools} />
      <CtxMenu />
      {ui.palette && <Palette />}
    </div>
  );
}
function* walkAll(list: import('./doc').Layer[]): Generator<import('./doc').Layer> { for (const l of list) { yield l; if (l.type === 'group') yield* walkAll(l.children); } }
export function fmtKey(k?: string) { return k ? k.split('+').map(p => p === 'ctrl' ? 'Ctrl' : p === 'shift' ? t('img.k.shift') : p === 'alt' ? 'Alt' : p === 'space' ? t('img.k.space') : p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)).join('+') : ''; }

/** écran d'accueil de l'espace Image (aucun document ouvert) */
function Welcome() {
  return <div className="im-welcome">
    <Ico n="image" s={46} />
    <h2>{t('img.welcome')}</h2>
    <p>{t('img.welcomeHint')}</p>
    <div className="im-wbtns">
      <button className="pri" onClick={() => openDialog('new')}><Ico n="newdoc" s={16} />{t('img.c.new')}</button>
      <button onClick={() => runCmd('open')}><Ico n="open" s={16} />{t('img.c.open')}</button>
      <button onClick={() => runCmd('paste')}><Ico n="dup" s={16} />{t('img.c.paste')}</button>
    </div>
  </div>;
}
/** menu Filtre : réglages et filtres posés sur le calque (lot 2), avec ceux déjà utilisés en haut */
function FilterMenu({ close }: { close: () => void }) {
  const [list, setList] = useState<{ id: string; group: string }[]>([]);
  useEffect(() => { import('./fxlib').then(m => setList(m.FILTER_MENU)); }, []);
  let last = '';
  return <>{list.map(f => { const head = f.group !== last; last = f.group; return [head && <div key={'g:' + f.group} className="im-dhead">{t('img.fgr.' + f.group)}</div>,
    <button key={'f:' + f.id} disabled={!ed.layer} onClick={() => { close(); import('./fxlib').then(m => m.openFilter(f.id)); }}><i /><span>{t('img.fl.' + f.id)}</span><kbd /></button>]; })}</>;
}
/** palette de commandes (Ctrl+K) : chercher n'importe quelle commande */
function Palette() {
  const [q, setQ] = useState(''), [i, setI] = useState(0);
  const all = [...CMDS.filter(c => c.menu), ...TOOL_IDS.map(id => ({ id, menu: 'tool', run: () => setTool(id), on: () => true } as const))];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const label = (c: { id: string; menu: string }) => c.menu === 'tool' ? t('img.tool.' + c.id) : t('img.c.' + c.id);
  const res = all.filter(c => !q || norm(label(c)).includes(norm(q)) || norm(t('img.m.' + c.menu)).includes(norm(q))).slice(0, 14);
  const go = (c: typeof res[number]) => { ui.palette = false; ed.emit(); if (!c.on || c.on()) c.run(); };
  return <div className="im-palette" onPointerDown={e => { if (e.target === e.currentTarget) { ui.palette = false; ed.emit(); } }}>
    <div className="im-pbox">
      <input autoFocus placeholder={t('img.paletteHint')} value={q} onChange={e => { setQ(e.target.value); setI(0); }}
        onKeyDown={e => { if (e.key === 'ArrowDown') { setI(Math.min(res.length - 1, i + 1)); e.preventDefault(); } if (e.key === 'ArrowUp') { setI(Math.max(0, i - 1)); e.preventDefault(); } if (e.key === 'Enter' && res[i]) go(res[i]); if (e.key === 'Escape') { ui.palette = false; ed.emit(); } }} />
      {res.map((c, k) => <button key={c.menu + c.id} className={k === i ? 'on' : ''} disabled={!!c.on && !c.on()} onClick={() => go(c)} onMouseEnter={() => setI(k)}>
        <span>{label(c)}</span><small>{c.menu === 'tool' ? t('img.tools') : t('img.m.' + c.menu)}</small><kbd>{fmtKey(ed.settings.keys[c.id])}</kbd></button>)}
    </div>
  </div>;
}
export { cmd };

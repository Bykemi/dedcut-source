// DedCut Image — barre des options de l'outil actif.
import type { MutableRefObject } from 'react';
import { t } from '../i18n';
import { ed, useEd } from './state';
import { Ico } from './icons';
import { runCmd } from './commands';
import { over } from './view';
import { selection, SelOp } from './select';
import { CUSTOM_SHAPES, GRAD_PRESETS, PATTERNS, gradientFill } from './paint';
import { SYS_FONTS, libFonts } from './text';
import type { Tools } from './tools';
import type { BrushOpts } from './brush';

/** curseur numérique compact (étiquette, curseur, valeur) */
export function Num({ label, v, min, max, step = 1, unit = '', set, w = 90 }: { label: string; v: number; min: number; max: number; step?: number; unit?: string; set: (v: number) => void; w?: number }) {
  return <label className="im-num" title={label}><span>{label}</span>
    <input type="range" min={min} max={max} step={step} value={v} style={{ width: w }} onChange={e => { set(+e.target.value); ed.emit(); }} />
    <input type="number" min={min} max={max} step={step} value={Math.round(v / step) * step} onChange={e => { const n = +e.target.value; if (isFinite(n)) { set(Math.max(min, Math.min(max, n))); ed.emit(); } }} />{unit && <em>{unit}</em>}</label>;
}
export function Chk({ label, v, set }: { label: string; v: boolean; set: (v: boolean) => void }) {
  return <label className="im-chk"><input type="checkbox" checked={v} onChange={e => { set(e.target.checked); ed.emit(); }} /><span>{label}</span></label>;
}
export function Sel<T extends string>({ label, v, opts, set }: { label?: string; v: T; opts: [T, string][]; set: (v: T) => void }) {
  return <label className="im-sel">{label && <span>{label}</span>}<select value={v} onChange={e => { set(e.target.value as T); ed.emit(); }}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
}
function SelOps() {
  const ops: [SelOp, string][] = [['new', 'select'], ['add', 'plus'], ['sub', 'minus'], ['int', 'clip']];
  return <div className="im-seg" title={t('img.o.selOp')}>{ops.map(([k, i]) => <button key={k} className={selection.op === k ? 'on' : ''} title={t('img.o.op.' + k)} onClick={() => { selection.op = k; ed.emit(); }}><Ico n={i} s={14} /></button>)}</div>;
}
function BrushOpts({ b, smudge }: { b: BrushOpts; smudge?: boolean }) {
  return <>
    <Num label={t('img.o.size')} v={b.size} min={1} max={1000} set={v => b.size = v} unit="px" />
    <Num label={t('img.o.hard')} v={Math.round(b.hard * 100)} min={0} max={100} set={v => b.hard = v / 100} unit="%" w={60} />
    {smudge ? <Num label={t('img.o.strength')} v={Math.round(b.strength * 100)} min={1} max={100} set={v => b.strength = v / 100} unit="%" w={60} /> : <>
      <Num label={t('img.o.opacity')} v={Math.round(b.opacity * 100)} min={1} max={100} set={v => b.opacity = v / 100} unit="%" w={60} />
      <Num label={t('img.o.flow')} v={Math.round(b.flow * 100)} min={1} max={100} set={v => b.flow = v / 100} unit="%" w={60} /></>}
    <Num label={t('img.o.smooth')} v={Math.round(b.smooth * 100)} min={0} max={95} set={v => b.smooth = v / 100} unit="%" w={60} />
    <Chk label={t('img.o.pSize')} v={b.pSize} set={v => b.pSize = v} />
    <Chk label={t('img.o.pOpacity')} v={b.pOpacity} set={v => b.pOpacity = v} />
    <Sel label={t('img.o.sym')} v={b.sym} opts={(['none', 'v', 'h', 'vh', 'radial'] as const).map(k => [k, t('img.o.sym_' + k)])} set={v => b.sym = v} />
    {b.sym === 'radial' && <Num label={t('img.o.symN')} v={b.symN} min={2} max={24} set={v => b.symN = v} w={50} />}
  </>;
}
export function OptionsBar({ tools }: { tools: MutableRefObject<Tools | null> }) {
  useEd(); const tl = tools.current, tool = ed.tool;
  let body: React.ReactNode = null;
  if (tool === 'move') body = <>
    <Chk label={t('img.o.autoSel')} v={ed.move.auto} set={v => ed.move.auto = v} />
    <Chk label={t('img.o.handles')} v={ed.move.handles} set={v => ed.move.handles = v} />
    <Chk label={t('img.o.keepRatio')} v={ed.move.lock} set={v => ed.move.lock = v} />
    <Sel label={t('img.o.resample')} v={ed.move.resample} opts={(['smooth', 'bilinear', 'lanczos', 'nearest'] as const).map(k => [k, t('img.o.rs_' + k)])} set={v => ed.move.resample = v} />
    <span className="im-sep" />
    {['alignL', 'alignCx', 'alignR', 'alignT', 'alignCy', 'alignB', 'distH', 'distV'].map(id => <button key={id} className="im-ib" title={t('img.c.' + id)} onClick={() => runCmd(id)}><Ico n={{ alignL: 'alignl', alignCx: 'alignc', alignR: 'alignr', alignT: 'alignt', alignCy: 'alignm', alignB: 'alignb', distH: 'disth', distV: 'distv' }[id]!} s={16} /></button>)}
    <span className="im-hint">{t('img.o.moveHint')}</span>
  </>;
  else if (tool === 'select') body = <>
    <div className="im-seg">{(['rect', 'ellipse'] as const).map(k => <button key={k} className={ed.selShape === k ? 'on' : ''} title={t('img.o.shape_' + k)} onClick={() => { ed.selShape = k; ed.emit(); }}><Ico n={k === 'rect' ? 'select' : 'ellipse'} s={14} /></button>)}</div>
    <SelOps /><Num label={t('img.o.feather')} v={selection.feather} min={0} max={200} set={v => selection.feather = v} unit="px" w={70} /><Chk label={t('img.o.aa')} v={selection.aa} set={v => selection.aa = v} />
    <button onClick={() => runCmd('refine')}>{t('img.c.refine')}</button></>;
  else if (tool === 'lasso') body = <>
    <div className="im-seg">{(['free', 'poly'] as const).map(k => <button key={k} className={ed.lassoKind === k ? 'on' : ''} onClick={() => { ed.lassoKind = k; ed.emit(); }}>{t('img.o.lasso_' + k)}</button>)}</div>
    <SelOps /><Num label={t('img.o.feather')} v={selection.feather} min={0} max={200} set={v => selection.feather = v} unit="px" w={70} />
    {ed.lassoKind === 'poly' && <span className="im-hint">{t('img.o.polyHint')}</span>}</>;
  else if (tool === 'wand') body = <>
    <SelOps /><Num label={t('img.o.tol')} v={selection.tol} min={0} max={255} set={v => selection.tol = v} w={80} />
    <Chk label={t('img.o.contig')} v={selection.contiguous} set={v => selection.contiguous = v} /><Chk label={t('img.o.allLayers')} v={selection.all} set={v => selection.all = v} />
    <button onClick={() => import('./ai').then(m => m.selectSubject())}><Ico n="ai" s={14} />{t('img.c.subject')}</button></>;
  else if (tool === 'selbrush') body = <><SelOps /><Num label={t('img.o.size')} v={ed.retouch.size} min={1} max={800} set={v => ed.retouch.size = v} unit="px" /></>;
  else if (tool === 'crop') body = <>
    <Sel label={t('img.o.ratio')} v={ed.crop.ratio} opts={[['free', t('img.o.free')], ['orig', t('img.o.orig')], ['1:1', '1:1'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9'], ['9:16', '9:16'], ['4:5', '4:5'], ['3:1', '3:1']]} set={v => ed.crop.ratio = v} />
    <Num label={t('img.o.straighten')} v={over.cropAngle} min={-45} max={45} step={.1} unit="°" set={v => { over.cropAngle = v; ed.crop.angle = v; if (tl) tl.vp.need = true; }} w={110} />
    <Chk label={t('img.o.delPixels')} v={ed.crop.del} set={v => ed.crop.del = v} />
    <button className="pri" onClick={() => tl?.cropApply()}><Ico n="check" s={14} />{t('img.o.apply')}</button>
    <button onClick={() => tl?.cropReset()}>{t('img.o.reset')}</button><span className="im-hint">{t('img.o.cropHint')}</span></>;
  else if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') body = <BrushOpts b={tool === 'pencil' ? ed.pencil : tool === 'eraser' ? ed.eraser : ed.brush} />;
  else if (tool === 'smudge') body = <BrushOpts b={ed.smudge} smudge />;
  else if (tool === 'fill') body = <>
    <Num label={t('img.o.tol')} v={ed.fill.tol} min={0} max={255} set={v => ed.fill.tol = v} w={80} />
    <Chk label={t('img.o.contig')} v={ed.fill.contiguous} set={v => ed.fill.contiguous = v} /><Chk label={t('img.o.allLayers')} v={ed.fill.all} set={v => ed.fill.all = v} />
    <Chk label={t('img.o.soft')} v={ed.fill.soft} set={v => ed.fill.soft = v} />
    <Sel label={t('img.o.fillWith')} v={ed.fill.pattern} opts={[['', t('img.o.fgColor')], ...Object.keys(PATTERNS).map(k => [k, t('img.pat.' + k)] as [string, string])]} set={v => ed.fill.pattern = v} /></>;
  else if (tool === 'gradient') body = <>
    <div className="im-grads">{GRAD_PRESETS.map((g, i) => <button key={i} title={t('img.o.gradPreset')} style={{ background: cssGrad(g) }} onClick={() => { ed.grad.g = structuredClone(g); ed.emit(); }} />)}
      <button title={t('img.o.gradFgBg')} style={{ background: `linear-gradient(90deg, ${ed.fg}, ${ed.bg})` }} onClick={() => { ed.grad.g = { kind: ed.grad.g.kind, angle: 0, stops: [{ o: 0, c: ed.fg, a: 1 }, { o: 1, c: ed.bg, a: 1 }] }; ed.emit(); }} />
      <button title={t('img.o.gradFgClear')} style={{ background: `linear-gradient(90deg, ${ed.fg}, transparent)` }} onClick={() => { ed.grad.g = { kind: ed.grad.g.kind, angle: 0, stops: [{ o: 0, c: ed.fg, a: 1 }, { o: 1, c: ed.fg, a: 0 }] }; ed.emit(); }} /></div>
    <Sel v={ed.grad.g.kind} opts={(['linear', 'radial', 'conic'] as const).map(k => [k, t('img.o.g_' + k)])} set={v => ed.grad.g.kind = v} />
    <Chk label={t('img.o.reverse')} v={ed.grad.reverse} set={v => ed.grad.reverse = v} />
    <Num label={t('img.o.opacity')} v={Math.round(ed.grad.opacity * 100)} min={1} max={100} set={v => ed.grad.opacity = v / 100} unit="%" w={60} /></>;
  else if (tool === 'picker') body = <>
    <Sel label={t('img.o.sample')} v={String(ed.picker.size)} opts={[['1', t('img.o.px1')], ['3', '3 × 3'], ['5', '5 × 5'], ['11', '11 × 11']]} set={v => ed.picker.size = +v} />
    <Chk label={t('img.o.allLayers')} v={ed.picker.all} set={v => ed.picker.all = v} /><span className="im-hint">{t('img.o.pickHint')}</span></>;
  else if (['clone', 'heal', 'dodge', 'burn', 'blurb', 'sharpen', 'liquify'].includes(tool)) body = <>
    <Num label={t('img.o.size')} v={ed.retouch.size} min={2} max={800} set={v => ed.retouch.size = v} unit="px" />
    <Num label={t('img.o.hard')} v={Math.round(ed.retouch.hard * 100)} min={0} max={100} set={v => ed.retouch.hard = v / 100} unit="%" w={60} />
    <Num label={t('img.o.strength')} v={Math.round(ed.retouch.strength * 100)} min={1} max={100} set={v => ed.retouch.strength = v / 100} unit="%" w={60} />
    {(tool === 'clone' || tool === 'heal') && <><Chk label={t('img.o.aligned')} v={ed.retouch.aligned} set={v => ed.retouch.aligned = v} /><Sel label={t('img.o.sample')} v={ed.retouch.sample} opts={[['layer', t('img.o.curLayer')], ['all', t('img.o.allLayersS')]]} set={v => ed.retouch.sample = v} /><span className="im-hint">{t('img.o.cloneHint')}</span></>}
    {(tool === 'dodge' || tool === 'burn') && <Sel label={t('img.o.range')} v={ed.retouch.range} opts={(['shadow', 'mid', 'high'] as const).map(k => [k, t('img.o.r_' + k)])} set={v => ed.retouch.range = v} />}
    {tool === 'liquify' && <Sel label={t('img.o.liqMode')} v={ed.retouch.liq} opts={(['push', 'grow', 'shrink', 'twirl', 'restore'] as const).map(k => [k, t('img.o.liq_' + k)])} set={v => ed.retouch.liq = v} />}</>;
  else if (tool === 'redeye') body = <><Num label={t('img.o.strength')} v={Math.round(ed.retouch.strength * 100)} min={1} max={100} set={v => ed.retouch.strength = v / 100} unit="%" w={60} /><span className="im-hint">{t('img.o.redeyeHint')}</span></>;
  else if (tool === 'text') { const s = ed.text; body = <>
    <FontSel v={s.font} set={f => s.font = f} />
    <Num label={t('img.o.size')} v={s.size} min={4} max={1000} set={v => s.size = v} unit="px" w={70} />
    <Sel v={String(s.weight)} opts={[['300', t('img.o.w300')], ['400', t('img.o.w400')], ['600', t('img.o.w600')], ['700', t('img.o.w700')], ['900', t('img.o.w900')]]} set={v => s.weight = +v} />
    <div className="im-seg">{(['left', 'center', 'right'] as const).map(a => <button key={a} className={s.align === a ? 'on' : ''} title={t('img.o.al_' + a)} onClick={() => { s.align = a; ed.emit(); }}><Ico n={a === 'left' ? 'alignl' : a === 'center' ? 'alignc' : 'alignr'} s={14} /></button>)}</div>
    <input type="color" value={s.fill.color} title={t('img.o.color')} onChange={e => { s.fill = { kind: 'color', color: e.target.value }; ed.emit(); }} />
    <span className="im-hint">{t('img.o.textHint')}</span></>; }
  else if (tool === 'shape') { const o = ed.shape; body = <>
    <Sel v={o.kind} opts={(['rect', 'ellipse', 'polygon', 'star', 'line', 'custom'] as const).map(k => [k, t('img.shape.' + k)])} set={v => o.kind = v} />
    {o.kind === 'custom' && <Sel v={o.custom} opts={Object.keys(CUSTOM_SHAPES).map(k => [k, t('img.cs.' + k)] as [string, string])} set={v => o.custom = v} />}
    {o.kind === 'rect' && <Num label={t('img.o.radius')} v={o.r} min={0} max={500} set={v => o.r = v} unit="px" w={70} />}
    {(o.kind === 'polygon' || o.kind === 'star') && <Num label={t('img.o.sides')} v={o.sides} min={3} max={40} set={v => o.sides = v} w={60} />}
    {o.kind === 'star' && <Num label={t('img.o.inner')} v={Math.round(o.inner * 100)} min={5} max={95} set={v => o.inner = v / 100} unit="%" w={60} />}
    {o.kind === 'line' ? <Chk label={t('img.o.arrow')} v={o.arrow} set={v => o.arrow = v} /> : <Chk label={t('img.o.fill')} v={o.fill} set={v => o.fill = v} />}
    <Chk label={t('img.o.stroke')} v={o.stroke} set={v => o.stroke = v} /><Num label={t('img.o.strokeW')} v={o.strokeW} min={1} max={200} set={v => o.strokeW = v} unit="px" w={60} />
    <Sel label={t('img.o.combine')} v={o.combine} opts={(['new', 'add', 'sub', 'int', 'xor'] as const).map(k => [k, t('img.o.cmb_' + k)])} set={v => o.combine = v} /></>; }
  else if (tool === 'pen' || tool === 'direct') body = <><Chk label={t('img.o.fill')} v={ed.shape.fill} set={v => ed.shape.fill = v} /><Num label={t('img.o.strokeW')} v={ed.shape.strokeW} min={1} max={200} set={v => ed.shape.strokeW = v} unit="px" w={60} /><span className="im-hint">{t(tool === 'pen' ? 'img.o.penHint' : 'img.o.directHint')}</span></>;
  else if (tool === 'hand' || tool === 'zoom') body = <><button onClick={() => runCmd('fit')}>{t('img.c.fit')}</button><button onClick={() => runCmd('actual')}>{t('img.c.actual')}</button><span className="im-hint">{t('img.o.zoomHint')}</span></>;
  return <div className="im-options"><b className="im-otool">{t('img.tool.' + tool)}</b>{body}</div>;
}
export const cssGrad = (g: import('./doc').Gradient) => { void gradientFill; const st = [...g.stops].sort((a, b) => a.o - b.o).map(s => `${hexA(s.c, s.a)} ${Math.round(s.o * 100)}%`).join(','); return g.kind === 'radial' ? `radial-gradient(${st})` : g.kind === 'conic' ? `conic-gradient(${st})` : `linear-gradient(${g.angle + 90}deg, ${st})`; };
const hexA = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
/** choix de la police : Windows puis les polices libres de DedCut, chacune dans son style */
export function FontSel({ v, set }: { v: string; set: (f: string) => void }) {
  const lib = libFonts(), cats = ['display', 'sans', 'serif', 'hand', 'mono'];
  return <select className="im-font" value={v} title={t('img.o.font')} style={{ fontFamily: `"${v}"` }} onChange={e => { set(e.target.value); ed.emit(); }}>
    {![...SYS_FONTS, ...lib.map(f => f.name)].includes(v) && <option value={v}>{v}</option>}
    <optgroup label={t('img.o.sysFonts')}>{SYS_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>{f}</option>)}</optgroup>
    {cats.map(c => <optgroup key={c} label={t('font.cat.' + c)}>{lib.filter(f => f.cat === c).map(f => <option key={f.name} value={f.name} style={{ fontFamily: `"${f.name}"` }}>{f.name}</option>)}</optgroup>)}
  </select>;
}

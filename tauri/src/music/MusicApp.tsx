// DedCut Musique — l'espace complet : menus, transport, navigateur, arrangement, éditeurs (piano roll, pas à pas, clip,
// instrument, effets, mixeur, session, partition), fenêtres, raccourcis clavier, clavier musical de l'ordinateur, vidéo de référence.
import { Component, useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { mu, useMu, toast } from './state';
import type { Tab } from './state';
import { barOf, bpmAt, b2s, clamp, clipEnd, fmtPos, fmtTime, midiOf } from './model';
import { duplicateClip, findClip, quantize, splitClip, songEnd } from './ops';
import { Arrange } from './arrange';
import { PianoRoll } from './pianoroll';
import { Steps } from './steps';
import { ClipEditor } from './clipedit';
import { InstEditor, FxEditor, KB_ROW } from './devices';
import { Mixer } from './mixer';
import { Session, ScoreView } from './session';
import { Browser } from './browser';
import { Dialogs, keyName } from './dialogs';
import * as IO from './io';
import { Ico } from './icons';
import { dropAt } from './pdrag';
import './music.css';

const TABS: [Tab, string][] = [['piano', 'piano'], ['steps', 'steps'], ['clip', 'wave'], ['inst', 'inst'], ['fx', 'fx'], ['mixer', 'mixer'], ['session', 'session'], ['score', 'score']];
type MenuItem = { k: string; ico?: string; key?: string; run: () => void; off?: boolean; sep?: boolean };
const open = (d: string, arg: unknown = null) => () => { mu.dialog = d; mu.dialogArg = arg; mu.emit(); };
/** hauteur maximale du panneau du bas : au moins ~210 px restent pour les pistes */
const edMax = () => Math.max(140, innerHeight - 360);

/** filet de sécurité : une erreur d'affichage ne vide plus tout l'espace ; le projet reste en mémoire et dans la sauvegarde automatique */
class Guard extends Component<{ children: React.ReactNode }, { err: string }> {
  state = { err: '' };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message || e).slice(0, 200) }; }
  componentDidCatch(e: unknown) { mu.logEv('uiError'); console.error(e); }
  render() {
    if (!this.state.err) return this.props.children;
    return <div className="mu-crash" role="alert"><Ico n="warn" s={28} /><b>{t('mu.crash.title')}</b><p>{t('mu.crash.text')}</p><small>{this.state.err}</small>
      <div className="mu-row"><button className="pri" onClick={() => this.setState({ err: '' })}>{t('mu.crash.retry')}</button><button onClick={() => void mu.save()}><Ico n="save" s={13} />{t('mu.cmd.save')}</button></div></div>;
  }
}
export default function MusicApp() { return <Guard><MusicSpace /></Guard>; }
function MusicSpace() {
  useMu(); const [menu, setMenu] = useState(''), [kbd, setKbd] = useState(false), editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // première ouverture, projet encore vide : on propose tout de suite les modèles (beat, chanson, voix…)
    if (!mu.p.tracks.length && !mu.p.path && !mu.dialog) { mu.dialog = 'new'; mu.emit(); }
    void mu.init().catch(e => toast(String(e)));
  }, []);
  // la fenêtre change de taille : le panneau du bas se réajuste (la zone des pistes garde toujours de la place)
  useEffect(() => { const f = () => mu.emit(); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  /* fichiers glissés depuis l'explorateur Windows quand l'espace Musique est affiché */
  useEffect(() => {
    const w = window as unknown as { dedcutDrop?: (paths: string[], x: number, y: number) => void; dedcutFS?: { allowPaths(p: string[]): Promise<{ path: string; exists: boolean }[]> } };
    const prev = w.dedcutDrop;
    w.dedcutDrop = (paths, x, y) => {
      if ((document.getElementById('muApp') as HTMLElement | null)?.hidden) return prev?.(paths, x, y);
      void (async () => {
        try { await w.dedcutFS?.allowPaths(paths); } catch { /* rien */ }
        const proj = paths.find(p => /\.dcmus$/i.test(p)), audio = paths.filter(p => IO.AUDIO_EXT.includes((p.split('.').pop() || '').toLowerCase()));
        if (proj) { toast(t('mu.f.useOpen')); return; }
        if (paths.some(p => /\.midi?$/i.test(p))) toast(t('mu.f.useMidiImport'));
        // lâché sur une piste ou dans l'arrangement : posé à cet endroit ; ailleurs : à la tête de lecture
        if (audio.length && !dropAt({ kind: 'files', paths: audio }, x, y)) await mu.importAudio(audio.map(path => ({ path })), Math.floor(mu.pos()));
      })();
    };
    return () => { w.dedcutDrop = prev; };
  }, []);
  /* raccourcis */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((document.getElementById('muApp') as HTMLElement | null)?.hidden || mu.dialog || (window as unknown as { dedcutHomeVisible?: boolean }).dedcutHomeVisible) return;
      const tg = e.target as HTMLElement; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
      // dans le piano roll, ces touches agissent sur les notes (sinon Suppr effaçait tout le clip dans l'arrangement)
      if (tg?.closest?.('.mu-pr') && (['Delete', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || (e.ctrlKey && /^[ad]$/i.test(e.key)) || (!e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'm'))) return;
      const k = keyName(e);
      // clavier musical de l'ordinateur (mode activé par le bouton du clavier)
      if (kbd && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const i = KB_ROW.indexOf(e.code);
        if (i >= 0) { e.preventDefault(); if (!e.repeat) void mu.noteOn(mu.set.oct * 12 + 12 + i); mu.emit(); return; }
        if (e.code === 'KeyZ' || e.code === 'KeyX') { e.preventDefault(); mu.set.oct = clamp(mu.set.oct + (e.code === 'KeyX' ? 1 : -1), 1, 7); mu.saveSettings(); toast(t('mu.kb.oct', { n: String(mu.set.oct) })); mu.emit(); return; }
        if (e.code === 'KeyC' || e.code === 'KeyV') { e.preventDefault(); mu.set.vel = clamp(mu.set.vel + (e.code === 'KeyV' ? 10 : -10), 10, 127); mu.saveSettings(); toast(t('mu.kb.vel', { n: String(mu.set.vel) })); return; }
      }
      const cmd = Object.keys(mu.set.keys).find(c => mu.set.keys[c] === k); if (!cmd) return;
      e.preventDefault(); e.stopPropagation(); run(cmd);
    };
    const upk = (e: KeyboardEvent) => { if (!kbd) return; const i = KB_ROW.indexOf(e.code); if (i >= 0) { mu.noteOff(mu.set.oct * 12 + 12 + i); mu.emit(); } };
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', upk, true);
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', upk, true); };
  }, [kbd]);
  /* le mode change (autre espace) : la lecture s'arrête */
  // espace quitté (ou DedCut réduit) et rien ne joue : le moteur de son se met en pause (processeur, veille de Windows) ;
  // lecture, enregistrement, clavier, écoute d'un son le relancent, et il repart quand on revient dans l'espace
  useEffect(() => {
    const f = () => {
      const hid = !!(document.getElementById('muApp') as HTMLElement | null)?.hidden; if (hid && mu.eng?.playing) mu.stop();
      const c = mu.ctx; if ((hid || document.hidden) && c && c.state === 'running' && !mu.eng?.playing && !mu.recState.on && !mu.p.tracks.some(x => x.mon)) void c.suspend().catch(() => { /* rien */ });
    };
    const back = () => { const c = mu.ctx; if (c && c.state === 'suspended') void c.resume().catch(() => { /* rien */ }); };
    const vis = () => { if (!document.hidden && !(document.getElementById('muApp') as HTMLElement | null)?.hidden) back(); };
    const iv = setInterval(f, 500); addEventListener('dedcut-music-open', back); document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(iv); removeEventListener('dedcut-music-open', back); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const p = mu.p, e = mu.eng, playing = !!e?.playing, tr = mu.track, sel = mu.sel;
  const menus: Record<string, MenuItem[]> = {
    file: [{ k: 'new', ico: 'file', key: 'new', run: open('new') }, { k: 'open', ico: 'open', key: 'open', run: () => void mu.open() }, { k: 'save', ico: 'save', key: 'save', run: () => void mu.save() }, { k: 'saveAs', ico: 'save', run: () => void mu.save(true) },
      { k: 'collect', ico: 'folder', run: () => void mu.collect(), off: !IO.fs() }, { k: 'archive', ico: 'export', run: () => void mu.archive() }, { k: 'importAudio', ico: 'wave', sep: true, run: () => void mu.importAudio() }, { k: 'importMidi', ico: 'midi', run: () => void mu.importMidi() },
      { k: 'export', ico: 'export', key: 'export', sep: true, run: open('export') }, { k: 'exportMidi', ico: 'midi', run: () => void mu.exportMidi() }, { k: 'notes', ico: 'clock', sep: true, run: open('notes') }, { k: 'recover', ico: 'undo', run: () => void mu.checkRecover().then(() => { if (!mu.dialog) toast(t('mu.rec.nothing')); }) }],
    edit: [{ k: 'undo', ico: 'undo', key: 'undo', run: () => mu.undo(), off: !mu.hist.canUndo() }, { k: 'redo', ico: 'redo', key: 'redo', run: () => mu.redo(), off: !mu.hist.canRedo() }, { k: 'copy', ico: 'dup', key: 'copy', sep: true, run: () => mu.copy(), off: !sel.clips.size }, { k: 'paste', ico: 'dup', key: 'paste', run: () => mu.paste(), off: !mu.clipboard },
      { k: 'dup', ico: 'dup', key: 'dup', run: () => run('dup'), off: !sel.clips.size }, { k: 'split', ico: 'scissors', key: 'split', run: () => run('split'), off: !sel.clips.size }, { k: 'del', ico: 'trash', key: 'del', run: () => mu.deleteSelected(), off: !sel.clips.size }, { k: 'selAll', ico: 'list', key: 'selAll', run: () => run('selAll') },
      { k: 'prefs', ico: 'gear', sep: true, run: open('prefs') }, { k: 'keys', ico: 'keys', run: open('keys') }],
    track: [{ k: 'addAudio', ico: 'mic', run: () => mu.addTrack('audio') }, { k: 'addInst', ico: 'piano', run: () => mu.addTrack('inst', 'keys') }, { k: 'addDrum', ico: 'drum', run: () => mu.addTrack('drum', 'kit-studio') }, { k: 'addBus', ico: 'bus', run: () => mu.addTrack('bus') },
      { k: 'dupTrack', ico: 'dup', sep: true, run: () => tr && mu.duplicateTrack(tr.id), off: !tr }, { k: 'delTrack', ico: 'trash', run: () => tr && void mu.deleteTrack(tr.id), off: !tr }, { k: 'freeze', ico: 'snow', run: () => tr && void (tr.frozen ? mu.unfreeze(tr.id) : mu.freeze(tr.id)), off: !tr || tr.kind === 'bus' },
      { k: 'bounce', ico: 'bounce', run: () => tr && void mu.bounce(tr.id), off: !tr || (tr.kind !== 'inst' && tr.kind !== 'drum') }, { k: 'routing', ico: 'bus', sep: true, run: open('routing') }],
    song: [{ k: 'tempo', ico: 'tempo', run: open('tempo') }, { k: 'chords', ico: 'chord', run: open('chords') }, { k: 'tuner', ico: 'tuner', run: open('tuner') }, { k: 'addMarker', ico: 'flag', key: 'addMarker', run: () => run('addMarker') }, { k: 'video', ico: 'video', run: open('video') }, { k: 'ideas', ico: 'spark', sep: true, run: open('ideas') }],
    settings: [{ k: 'audio', ico: 'vol', run: open('audio') }, { k: 'midi', ico: 'midi', run: open('midi') }, { k: 'ext', ico: 'ext', run: open('ext') }, { k: 'prefs', ico: 'gear', run: open('prefs') }],
    help: [{ k: 'help', ico: 'help', run: open('help') }, { k: 'keys', ico: 'keys', run: open('keys') }]
  };
  const bar = barOf(p, mu.pos()), edH = clamp(mu.set.editorH, 120, edMax());
  return <div className="mu-app" onPointerDown={() => menu && setMenu('')}>
    {/* barre du haut : menus et transport */}
    <div className="mu-top">
      <nav className="mu-menus">{Object.keys(menus).map(m => <div key={m} className="mu-mwrap">
        <button className={menu === m ? 'on' : ''} onPointerDown={ev => { ev.stopPropagation(); setMenu(menu === m ? '' : m); }} aria-haspopup="menu" aria-expanded={menu === m}>{t('mu.m.' + m)}</button>
        {menu === m && <div className="mu-drop" role="menu" onPointerDown={ev => ev.stopPropagation()}>{menus[m].map(it => <div key={it.k}>{it.sep && <hr />}<button role="menuitem" disabled={it.off} onClick={() => { setMenu(''); it.run(); }}>{it.ico && <Ico n={it.ico} s={13} />}<span>{t('mu.cmd.' + it.k)}</span>{it.key && mu.set.keys[it.key] && <kbd>{mu.set.keys[it.key]}</kbd>}</button></div>)}</div>}
      </div>)}</nav>
      <div className="mu-transport" role="toolbar" aria-label={t('mu.transport')}>
        <button className="mu-tbtn" title={t('mu.cmd.home')} onClick={() => mu.home()}><Ico n="start" s={15} /></button>
        <button className={'mu-tbtn play' + (playing ? ' on' : '')} title={t(playing ? 'mu.tr.stop' : 'mu.tr.play') + ' (' + mu.set.keys.play + ')'} onClick={() => mu.toggle()}><Ico n={playing ? 'stop' : 'play'} s={16} fill={!playing} /></button>
        <button className={'mu-tbtn rec' + (mu.recState.on ? ' on' : '')} title={t('mu.tr.rec') + ' (' + mu.set.keys.record + ')'} onClick={() => void mu.record()}><Ico n="rec" s={15} fill /></button>
        <button className={'mu-tbtn' + (p.loop.on ? ' on' : '')} title={t('mu.tr.loop')} onClick={() => mu.act('mu.h.loop', q => { q.loop.on = !q.loop.on; if (q.loop.b <= q.loop.a) { q.loop.a = 0; q.loop.b = 16; } }, true)}><Ico n="loop" s={15} /></button>
        <button className={'mu-tbtn' + (p.punch.on ? ' on' : '')} title={t('mu.tr.punch')} onClick={() => mu.act('mu.h.punch', q => { q.punch.on = !q.punch.on; })}><Ico n="punch" s={15} /></button>
        <button className={'mu-tbtn' + (p.metro.on ? ' on' : '')} title={t('mu.tr.metro')} onClick={() => mu.act('mu.h.metro', q => { q.metro.on = !q.metro.on; })}><Ico n="metro" s={15} /></button>
        <select className="mu-cin" value={p.metro.countIn} title={t('mu.tr.countIn')} onChange={ev => mu.act('mu.h.metro', q => { q.metro.countIn = +ev.target.value; })}>{[0, 1, 2].map(n => <option key={n} value={n}>{t('mu.tr.ci' + n)}</option>)}</select>
        <Pos />
        <label className="mu-bpm" title={t('mu.tr.bpmTip')}><input type="number" min={30} max={300} step={.1} value={Math.round(bpmAt(p, mu.pos()) * 10) / 10} onChange={ev => { const v = clamp(+ev.target.value || 120, 30, 300); mu.act('mu.h.tempo', q => { q.bpm = v; if (q.tempo.length <= 1) q.tempo = [{ t: 0, bpm: v, ramp: false }]; }, true); }} aria-label={t('mu.new.bpm')} />BPM</label>
        <button className="mu-sig" title={t('mu.tp.title')} onClick={open('tempo')}>{bar.num}/{bar.den}<span className="mu-key"> · {t('mu.keyShort', { key: (document.documentElement.lang || 'fr').startsWith('fr') ? ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'][p.key] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p.key], scale: t('mu.sc.' + p.scale) })}</span></button>
        <button className={'mu-tbtn' + (kbd ? ' on' : '')} title={t('mu.kb.typeTip')} onClick={() => setKbd(!kbd)}><Ico n="keys" s={15} /></button>
      </div>
      <span className="mu-sp" />
      <div className="mu-status">
        <button className="mu-ib" title={t('mu.cmd.undo') + (mu.hist.canUndo() ? ' : ' + t(mu.hist.undoLabel()) : '')} disabled={!mu.hist.canUndo()} onClick={() => mu.undo()}><Ico n="undo" s={14} /></button>
        <button className="mu-ib" title={t('mu.cmd.redo')} disabled={!mu.hist.canRedo()} onClick={() => mu.redo()}><Ico n="redo" s={14} /></button>
        <Health />
        <span className={'mu-pname' + (p.dirty ? ' dirty' : '')} title={p.path || t('mu.f.notSaved')}>{p.name}{p.dirty ? ' •' : ''}</span>
        <button className="mu-ib mu-opt" title={t('mu.cmd.ideas')} onClick={open('ideas')}><Ico n="spark" s={14} /></button>
        <button className="mu-ib mu-opt" title={t('mu.cmd.audio')} onClick={open('audio')}><Ico n="vol" s={14} /></button>
        <button className="mu-ib mu-opt" title={t('mu.cmd.help')} onClick={open('help')}><Ico n="help" s={14} /></button>
      </div>
    </div>
    <div className="mu-main">
      {mu.set.browser && <Browser />}
      <div className="mu-center">
        <div className="mu-tools">
          <button className={'mu-ib' + (mu.set.browser ? ' on' : '')} title={t('mu.br.toggle')} onClick={() => { mu.set.browser = !mu.set.browser; mu.saveSettings(); mu.emit(); }}><Ico n="folder" s={14} /></button>
          <span className="mu-sep" />
          {(['select', 'draw', 'split', 'erase'] as const).map(x => <button key={x} className={'mu-ib' + (mu.view.tool === x ? ' on' : '')} title={t('mu.tool.' + x)} aria-pressed={mu.view.tool === x} onClick={() => { mu.view.tool = x; mu.emit(); }}><Ico n={x === 'select' ? 'cursor' : x === 'draw' ? 'pen' : x === 'split' ? 'scissors' : 'eraser'} s={14} /></button>)}
          <span className="mu-sep" />
          <button className="mu-ib" title={t('mu.cmd.zoomOut')} onClick={() => run('zoomOut')}><Ico n="zoomOut" s={14} /></button>
          <button className="mu-ib" title={t('mu.cmd.zoomIn')} onClick={() => run('zoomIn')}><Ico n="zoomIn" s={14} /></button>
          <button className="mu-ib" title={t('mu.tool.fit')} onClick={() => { const w = (document.querySelector('.mu-tl') as HTMLElement | null)?.clientWidth || 800; mu.view.zoom = clamp(w / Math.max(16, songEnd(p) + 4), 2, 600); mu.view.sx = 0; mu.emit(); }}><Ico n="target" s={14} /></button>
          <span className="mu-sp" />
          <span className="mu-dim">{mu.busy}</span>
        </div>
        <Arrange />
        <div className="mu-split" role="separator" aria-orientation="horizontal" onDoubleClick={() => { mu.set.editorH = edH > 200 ? 160 : Math.round(innerHeight * .4); mu.saveSettings(); mu.emit(); }} onPointerDown={ev => { const y0 = ev.clientY, h0 = edH; const mv = (x: PointerEvent) => { mu.set.editorH = clamp(h0 - (x.clientY - y0), 120, edMax()); mu.emit(); }, u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); mu.saveSettings(); }; addEventListener('pointermove', mv); addEventListener('pointerup', u); }} />
        <div className="mu-editor" ref={editorRef} style={{ height: edH }}>
          <div className="mu-tabs" role="tablist">{TABS.map(([k, ico]) => <button key={k} role="tab" aria-selected={mu.view.tab === k} className={mu.view.tab === k ? 'on' : ''} onClick={() => { mu.view.tab = k; mu.emit(); }}><Ico n={ico} s={13} />{t('mu.tab.' + k)}</button>)}</div>
          <div className="mu-edbody">{mu.view.tab === 'piano' ? <PianoRoll /> : mu.view.tab === 'steps' ? <Steps /> : mu.view.tab === 'clip' ? <ClipEditor /> : mu.view.tab === 'inst' ? <InstEditor /> : mu.view.tab === 'fx' ? <FxEditor /> : mu.view.tab === 'mixer' ? <Mixer /> : mu.view.tab === 'session' ? <Session /> : <ScoreView />}</div>
        </div>
      </div>
    </div>
    <VideoRef />
    <Dialogs />
    {mu.learnTarget && <div className="mu-learn"><Ico n="midi" s={14} />{t('mu.midi.learning')}<button onClick={() => { mu.learnTarget = null; mu.midi.learn = null; mu.emit(); }}>{t('common.cancel')}</button></div>}
  </div>;
}

/* ---------- commandes (menus et raccourcis) ---------- */
function run(cmd: string) {
  const p = mu.p, sel = mu.sel;
  switch (cmd) {
    case 'play': mu.toggle(); break;
    case 'record': void mu.record(); break;
    case 'loop': mu.act('mu.h.loop', q => { q.loop.on = !q.loop.on; }, true); break;
    case 'metro': mu.act('mu.h.metro', q => { q.metro.on = !q.metro.on; }); break;
    case 'home': mu.home(); break;
    case 'undo': mu.undo(); break;
    case 'redo': mu.redo(); break;
    case 'save': void mu.save(); break;
    case 'open': void mu.open(); break;
    case 'new': mu.dialog = 'new'; mu.emit(); break;
    case 'export': mu.dialog = 'export'; mu.emit(); break;
    case 'panic': mu.panic(); break;
    case 'del': mu.deleteSelected(); break;
    case 'copy': mu.copy(); break;
    case 'paste': mu.paste(); break;
    case 'selAll': sel.clips = new Set(p.tracks.flatMap(x => x.clips.map(c => c.id))); mu.emit(); break;
    case 'dup': { const ids = [...sel.clips]; if (!ids.length) return; const made: number[] = []; mu.act('mu.h.dupClip', q => { const L = ids.map(id => findClip(q, id)).filter((x): x is NonNullable<typeof x> => !!x); if (!L.length) return; const a = Math.min(...L.map(x => x.c.t)), span = Math.max(...L.map(x => clipEnd(q, x.c))) - a; for (const x of L) made.push(duplicateClip(q, x.t, x.c, x.c.t + span).id); }, true); sel.clips = new Set(made); mu.emit(); break; }
    case 'split': { const at = mu.pos(), ids = [...sel.clips]; mu.act('mu.h.split', q => { for (const id of ids) { const f = findClip(q, id); if (f) splitClip(q, f.t, f.c, at); } }, true); break; }
    case 'zoomIn': mu.view.zoom = clamp(mu.view.zoom * 1.3, 2, 600); mu.emit(); break;
    case 'zoomOut': mu.view.zoom = clamp(mu.view.zoom / 1.3, 2, 600); mu.emit(); break;
    case 'addMarker': mu.act('mu.h.marker', q => { q.markers.push({ id: ++q.uid, t: Math.round(mu.pos() / mu.view.grid) * mu.view.grid, name: t('mu.mk.n', { n: String(q.markers.length + 1) }), color: '#fbbf24', kind: 'marker' }); }); break;
    case 'quantize': { const f = mu.clip; if (!f || f.c.kind !== 'midi') { toast(t('mu.pr.none')); return; } const md = midiOf(p, f.c.data); if (md) mu.act('mu.h.quantize', () => quantize(md, sel.notes.size ? sel.notes : null, { grid: mu.view.grid, strength: 1, swing: 0, ends: false })); break; }
    case 'toolDraw': mu.view.tool = 'draw'; mu.emit(); break;
    case 'toolSelect': mu.view.tool = 'select'; mu.emit(); break;
    default: { const m = cmd.match(/^tab(\w+)$/); if (m) { mu.view.tab = (m[1][0].toLowerCase() + m[1].slice(1)) as Tab; mu.emit(); } }
  }
}

/* ---------- position (mesures.temps et minutes:secondes), mise à jour pendant la lecture ---------- */
function Pos() {
  const [, force] = useState(0); useEffect(() => mu.onPos(() => force(x => x + 1)), []);
  const b = mu.pos();
  return <div className="mu-pos" title={t('mu.tr.posTip')}><b>{fmtPos(mu.p, b)}</b><small>{fmtTime(b2s(mu.p, b))}</small></div>;
}
/** santé du son : processeur (retards de planification), sorties perdues, protection active */
function Health() {
  const [, force] = useState(0); useEffect(() => { const iv = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(iv); }, []);
  const s = mu.eng?.stats(), c = mu.ctx; if (!s || !c) return <span className="mu-health off" title={t('mu.hl.off')}><Ico n="cpu" s={13} /></span>;
  const bad = s.late > 0, lat = ((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000;
  return <button className={'mu-health' + (bad ? ' warn' : '') + (c.state !== 'running' ? ' off' : '')} title={t('mu.hl.tip', { v: String(s.voices), late: String(s.late), lat: lat.toFixed(0), sr: String(c.sampleRate) })} onClick={() => { mu.dialog = 'audio'; mu.emit(); }}>
    <Ico n="cpu" s={13} /><span>{lat.toFixed(0)} ms</span>{bad && <Ico n="warn" s={12} />}{mu.p.master.protect && <Ico n="shield" s={12} />}</button>;
}
/** vidéo de référence : suit la tête de lecture (lecture seule, son coupé par défaut) */
function VideoRef() {
  useMu(); const v = mu.p.video, ref = useRef<HTMLVideoElement>(null), [pos, setPos] = useState({ x: 0, y: 0 }), [muted, setMuted] = useState(true);
  useEffect(() => {
    if (!v?.show) return; let raf = 0; const loop = () => { const el = ref.current, e = mu.eng; if (el && e) { const want = b2s(mu.p, mu.pos()) + v.off; if (e.playing) { if (el.paused) void el.play().catch(() => { /* rien */ }); if (Math.abs(el.currentTime - want) > .12) el.currentTime = Math.max(0, want); } else { if (!el.paused) el.pause(); if (Math.abs(el.currentTime - want) > .04) el.currentTime = Math.max(0, want); } } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [v?.show, v?.off, v?.path]);
  if (!v || !v.show) return null; const F = IO.fs(); const src = F ? F.url(v.path) : '';
  if (!src) return null;
  return <div className="mu-video" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
    <div className="mu-vbar" onPointerDown={ev => { const x0 = ev.clientX - pos.x, y0 = ev.clientY - pos.y; const mv = (x: PointerEvent) => setPos({ x: x.clientX - x0, y: x.clientY - y0 }), u = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', u); }; addEventListener('pointermove', mv); addEventListener('pointerup', u); }}>
      <Ico n="video" s={12} /><span>{t('mu.vd.title')}</span><span className="mu-sp" /><button className="mu-ib" onClick={() => setMuted(!muted)} title={t('mu.vd.sound')}><Ico n={muted ? 'mute' : 'vol'} s={12} /></button><button className="mu-ib" onClick={() => mu.act('mu.h.video', q => { if (q.video) q.video.show = false; })}><Ico n="close" s={12} /></button></div>
    <video ref={ref} src={src} muted={muted} playsInline preload="auto" />
  </div>;
}

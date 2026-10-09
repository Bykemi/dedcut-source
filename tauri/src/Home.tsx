// Écran d'accueil de DedCut (cahier des charges §3, §24, §25, §30).
// Tous les textes passent par t() : aucun texte visible écrit en dur.
import { useCallback, useEffect, useState } from 'react';
import { t, fmt, useLang, getLanguages, setLang, getLang } from './i18n';
import { DONATE_URL } from './config';
import { introOn, setIntroOn } from './intro';
import { introSoundOn, setIntroSoundOn } from './introsound';


interface Recent { path: string; name: string; date: number; W: number; H: number; dur: number; clips: number; thumb?: string | null; exists?: boolean }
interface Session { name: string; clips: number; dur: number; path: string | null; dirty: boolean; W: number; H: number; thumb: string | null }
interface Snap { t: number; name: string; n: number; dur: number; why: string }
interface Theme { id: string; c1: string; c2: string }
interface DedcutAPI {
  newProject(w: number, h: number): Promise<boolean>;
  openDialog(): Promise<boolean>;
  openPath(p: string): Promise<boolean>;
  importAndStart(): Promise<boolean>;
  recents(): Promise<Recent[]>;
  removeRecent(p: string): Promise<void>;
  deleteProject(p: string): Promise<boolean>;
  session(): Session;
  themes(): Theme[];
  theme(): string;
  setTheme(id: string): void;
  version(): string;
  openLicences(): unknown;
  openFolder(): unknown;
  openLink(url: string): unknown;
  space?(m: 'edit' | 'rec' | 'live' | 'image' | 'music'): boolean;
  studioState?(): { live: boolean; rec: boolean; phone: boolean; mode: string };
  snapshots(): Promise<Snap[]>;
  restoreSnapshot(t: number): Promise<boolean>;
  crashed(): boolean;
}
declare global { interface Window { dedcutAPI?: DedcutAPI; dedcutHomeVisible?: boolean } }

const FORMATS = [
  { id: 'landscape', w: 1920, h: 1080 },
  { id: 'portrait', w: 1080, h: 1920 },
  { id: 'square', w: 1080, h: 1080 },
  { id: 'insta', w: 1080, h: 1350 }
] as const;

// petites icônes au trait (24×24)
const PLUS = 'M12 5v14M5 12h14';
const FOLDER = 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z';
const FILM = 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4';
const PLAY = 'M8 5.5v13l11-6.5z';
const HEART = 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z';
const DROP = 'M12 4v11M7 10l5 5 5-5M5 20h14';
const SCISSORS = 'M3 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12';
const LIVE = 'M9.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2';
const IMGI = 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01';
const MUSI = 'M9 18a3 3 0 1 0 0 .1M9 18V5l11-2v12M20 15a3 3 0 1 0 0 .1M9 9l11-2';
const TRASH = 'M4 7h16M10 11v6M14 11v6M5.5 7l1 13h11l1-13M9 7V4h6v3';
const GEAR = 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8';
// petite bête (signaler un bug)
const BUG = 'M9 7.5a3 3 0 0 1 6 0M12 8a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0v-2a5 5 0 0 1 5-5zM12 12v8M7 13H3.5M17 13h3.5M7.5 17.5l-3 2M16.5 17.5l3 2M7.5 9.5l-3-2M16.5 9.5l3-2M10 5L8.5 3M14 5l1.5-2';
// chevrons de code (code source libre)
const CODE = 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16';
const SOURCE_URL = 'https://github.com/Bykemi/dedcut-source';
const openBug = () => (window as unknown as { dedcutBug?: { open(): void } }).dedcutBug?.open();
const INFO = 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v6M12 7.5h.01';
// enregistrer : cercle + point plein
const RecIco = () => (<svg className="dc-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></svg>);
const Ico = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg className="dc-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const logo = () => (document.getElementById('hlogo') as HTMLImageElement | null)?.src || '';

export default function Home() {
  useLang(); // se réaffiche quand la langue change
  const [visible, setVisible] = useState(true);
  const [view, setView] = useState<'main' | 'new'>('main');
  const [modal, setModal] = useState<null | 'settings' | 'about' | 'support'>(null);
  const [api, setApi] = useState<DedcutAPI | null>(window.dedcutAPI || null);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [crashed, setCrashed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [theme, setThemeState] = useState('violet');
  const [note, setNote] = useState('');
  const [del, setDel] = useState<Recent | null>(null);
  const [intro, setIntro] = useState(introOn());
  const [introSnd, setIntroSnd] = useState(introSoundOn());
  // la petite barre de titre (TitleBar) ne s'affiche qu'avec l'accueil ; dans l'éditeur, l'en-tête la remplace
  useEffect(() => { document.body.classList.toggle('home-on', visible); }, [visible]);

  const refresh = useCallback(async (a: DedcutAPI) => {
    setSession(a.session());
    setThemeState(a.theme());
    try { setRecents(await a.recents()); } catch { setRecents([]); }
    try { setSnaps(await a.snapshots()); } catch { setSnaps([]); }
    setCrashed(a.crashed());
  }, []);

  // le moteur se charge après l'écran d'accueil : on attend qu'il soit prêt
  useEffect(() => {
    const ready = () => { if (window.dedcutAPI) { setApi(window.dedcutAPI); refresh(window.dedcutAPI); } };
    ready();
    window.addEventListener('dedcut-ready', ready);
    return () => window.removeEventListener('dedcut-ready', ready);
  }, [refresh]);

  // ouvrir / fermer depuis l'éditeur (logo, bouton Nouveau) ou après ouverture d'un projet
  useEffect(() => {
    const open = (e: Event) => { setView((e as CustomEvent).detail === 'new' ? 'new' : 'main'); setModal(null); setVisible(true); if (window.dedcutAPI) refresh(window.dedcutAPI); };
    const close = () => setVisible(false);
    window.addEventListener('dedcut-home', open);
    window.addEventListener('dedcut-home-close', close);
    return () => { window.removeEventListener('dedcut-home', open); window.removeEventListener('dedcut-home-close', close); };
  }, [refresh]);

  useEffect(() => { window.dedcutHomeVisible = visible; }, [visible]);

  // Échap : revenir au montage en cours (s'il y en a un)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !visible) return;
      if (del) setDel(null); else if (modal) setModal(null); else if (view === 'new') setView('main'); else if (session?.clips) setVisible(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [visible, modal, view, session, del]);

  if (!visible) return null;

  // ouvrir un projet ou en créer un : on revient dans l'espace Montage
  const done = (ok: boolean | Promise<boolean>) => Promise.resolve(ok).then(v => { if (v) { api?.space?.('edit'); setVisible(false); } });
  const sp = api?.studioState?.() || { live: false, rec: false, phone: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent), mode: 'edit' };
  const onSpace = (m: 'rec' | 'live' | 'image' | 'music') => { if (api?.space?.(m)) setVisible(false); };
  const onNew = (w: number, h: number) => api && done(api.newProject(w, h));
  const onOpen = () => api && done(api.openDialog());
  const onImport = () => api && done(api.importAndStart());
  const onRecent = (r: Recent) => api && r.exists !== false && done(api.openPath(r.path));
  const onRemove = async (r: Recent) => { if (!api) return; await api.removeRecent(r.path); refresh(api); };
  const onDelete = async () => { const r = del; setDel(null); if (!api || !r) return; await api.deleteProject(r.path); refresh(api); };
  const onRestore = (s: Snap) => { if (api) done(api.restoreSnapshot(s.t)); };
  const onTheme = (id: string) => { api?.setTheme(id); setThemeState(id); };
  const onDonate = () => { if (DONATE_URL) api?.openLink(DONATE_URL); else setNote(t('support.soon')); };
  const openSupport = () => { setNote(''); setModal('support'); };

  return (
    <div className="dc-home" role="dialog" aria-label="DedCut">
      <div className="dc-glow" />
      <div className="dc-home-in">
        <header className="dc-top">
          <div className="dc-brand">
            <img src={logo()} alt="" />
            <div>
              <h1>Ded<b>Cut</b><button type="button" className="dc-beta" title={t('bug.betaTip')} onClick={openBug}>{t('app.beta')}</button></h1>
              <p>{t('app.tagline')}</p>
            </div>
          </div>
          <div className="dc-topr">
            <span className="dc-by">{t('app.madeBy', { author: 'ByKemi' })}</span>
            <button className="dc-support" onClick={openSupport}><Ico d={HEART} fill />{t('home.support')}</button>
          </div>
        </header>

        {view === 'main' ? (
          <>
            <section className="dc-hello">
              <h2>{t('home.sp.title')}</h2>
              <p>{t('home.sp.sub')}</p>
            </section>

            <section className={'dc-spaces' + (sp.phone ? ' dc-one' : '')}>
              <div className="dc-space dc-sp-edit">
                <div className="dc-art dc-art-edit" aria-hidden="true">
                  <span className="dc-mon"><i /><i /><i /></span>
                  <span className="dc-trk"><i style={{ left: '4%', width: '30%' }} /><i style={{ left: '37%', width: '42%' }} /><i style={{ left: '82%', width: '14%' }} /></span>
                  <span className="dc-trk dc-t2"><i style={{ left: '14%', width: '24%' }} /><i style={{ left: '55%', width: '20%' }} /></span>
                  <span className="dc-trk dc-t3"><i style={{ left: '4%', width: '88%' }} /></span>
                  <span className="dc-ph" />
                </div>
                <h3><span><Ico d={SCISSORS} /></span>{t('home.sp.edit.t')}</h3>
                <p>{t('home.sp.edit.d')}</p>
                <span className="dc-splab">{t('home.newProject')}</span>
                <div className="dc-spfmts">
                  {FORMATS.map(f => (
                    <button key={f.id} className="dc-spf" onClick={() => onNew(f.w, f.h)} title={t(`home.formats.${f.id}Use`)}>
                      <span><i style={{ width: `min(${(f.w / f.h > 54 / 34 ? 54 : 34 * f.w / f.h).toFixed(1)}px, 100%)`, aspectRatio: `${f.w} / ${f.h}` }} /></span>
                      <b>{t(`home.formats.${f.id}`)}</b>
                    </button>
                  ))}
                </div>
              </div>
              {!sp.phone && (
                <>
                  <button className="dc-space dc-sp-rec" onClick={() => onSpace('rec')}>
                    <div className="dc-art dc-art-rec" aria-hidden="true">
                      <span className="dc-scr"><i className="dc-sun" /><i className="dc-hill" /><i className="dc-hill2" /></span>
                      <span className="dc-rec">REC</span>
                      <span className="dc-face" />
                      <span className="dc-cur" />
                    </div>
                    {sp.rec && <span className="dc-onair">● REC</span>}
                    <h3><span><RecIco /></span>{t('home.sp.rec.t')}</h3>
                    <p>{t('home.sp.rec.d')}</p>
                    <span className="dc-spgo">{t('home.sp.rec.go')} <b>→</b></span>
                  </button>
                  <button className="dc-space dc-sp-live" onClick={() => onSpace('live')}>
                    <div className="dc-art dc-art-live" aria-hidden="true">
                      <span className="dc-scr"><i className="dc-sun" /><i className="dc-hill" /><i className="dc-hill2" /></span>
                      <span className="dc-livep">LIVE</span>
                      <span className="dc-wave" /><span className="dc-wave dc-w2" />
                      <span className="dc-chat"><i>GG !</i><i>wow</i><i>hype</i></span>
                    </div>
                    {sp.live && <span className="dc-onair">● {t('live.st.live').replace(/^●\s*/, '')}</span>}
                    <h3><span><Ico d={LIVE} /></span>{t('home.sp.live.t')}</h3>
                    <p>{t('home.sp.live.d')}</p>
                    <span className="dc-spgo">{t('home.sp.live.go')} <b>→</b></span>
                  </button>
                  <button className="dc-space dc-sp-img" onClick={() => onSpace('image')}>
                    <div className="dc-art dc-art-img" aria-hidden="true">
                      <span className="dc-scr"><i className="dc-sun" /><i className="dc-hill" /><i className="dc-hill2" /></span>
                      <span className="dc-lay"><i /><i /><i /></span>
                      <span className="dc-brush" />
                    </div>
                    <h3><span><Ico d={IMGI} /></span>{t('home.sp.img.t')}</h3>
                    <p>{t('home.sp.img.d')}</p>
                    <span className="dc-spgo">{t('home.sp.img.go')} <b>→</b></span>
                  </button>
                  <button className="dc-space dc-sp-mu" onClick={() => onSpace('music')}>
                    <div className="dc-art dc-art-mu" aria-hidden="true">
                      <span className="dc-mubars"><i /><i /><i /><i /><i /><i /><i /><i /></span>
                      <span className="dc-mupads"><i /><i /><i /><i /><i /><i /><i /><i /></span>
                    </div>
                    <h3><span><Ico d={MUSI} /></span>{t('home.sp.mu.t')}</h3>
                    <p>{t('home.sp.mu.d')}</p>
                    <span className="dc-spgo">{t('home.sp.mu.go')} <b>→</b></span>
                  </button>
                </>
              )}
            </section>
            <p className="dc-drop dc-drop2"><Ico d={DROP} />{t('home.dropHint')}</p>

            <div className="dc-row">
              {session && session.clips > 0 && (
                <button className="dc-tile dc-resume" onClick={() => { api?.space?.('edit'); setVisible(false); }}>
                  <span className="dc-ico dc-thumb">{session.thumb ? <img src={session.thumb} alt="" /> : <Ico d={PLAY} fill />}</span>
                  <span className="dc-tt">{t('home.resume')}</span>
                  <span className="dc-ds">{session.name} · {t('home.clips', { count: session.clips })} · {fmt.duration(session.dur)}</span>
                </button>
              )}
              <button className="dc-tile" onClick={onOpen}>
                <span className="dc-ico"><Ico d={FOLDER} /></span>
                <span className="dc-tt">{t('home.openProject')}</span>
                <span className="dc-ds">{t('home.openProjectDesc')}</span>
              </button>
              <button className="dc-tile" onClick={onImport}>
                <span className="dc-ico"><Ico d={FILM} /></span>
                <span className="dc-tt">{t('home.importVideo')}</span>
                <span className="dc-ds">{t('home.importVideoDesc')}</span>
              </button>
            </div>

            {crashed && (
              <div className="dc-warn"><b>{t('home.crashTitle')}</b><span>{t('home.crashText')}</span></div>
            )}

            <div className="dc-main">
              <section className="dc-recent">
                <h2>{t('home.recent')}{recents.length > 0 && <span className="dc-count">{recents.length}</span>}</h2>
                {recents.length === 0 ? (
                  <div className="dc-empty"><Ico d={FILM} /><p>{t('home.recentEmpty')}</p></div>
                ) : (
                  <div className="dc-rlist">
                    {recents.map(r => (
                      <div key={r.path} className={'dc-ritem' + (r.exists === false ? ' dc-miss' : '')} title={r.path}>
                        <button className="dc-rmain" onClick={() => onRecent(r)} disabled={r.exists === false}>
                          <span className="dc-rthumb">
                            {r.thumb ? <img src={r.thumb} alt="" /> : <Ico d={FILM} />}
                            <span className="dc-rfmt">{r.W && r.H ? `${r.W}×${r.H}` : ''}</span>
                            <span className="dc-rplay"><Ico d={PLAY} fill /></span>
                          </span>
                          <span className="dc-rtxt">
                            <b>{r.name}</b>
                            <small>{r.exists === false ? t('home.missingFile') : t('home.modified', { when: fmt.relative(r.date) })}</small>
                            <small>{t('home.clips', { count: r.clips })} · {fmt.duration(r.dur || 0)}</small>
                          </span>
                        </button>
                        {r.exists !== false && <button className="dc-rx dc-rdel" title={t('home.deleteProject')} aria-label={t('home.deleteProject')} onClick={() => setDel(r)}><Ico d={TRASH} /></button>}
                        <button className="dc-rx" title={t('home.removeRecent')} aria-label={t('home.removeRecent')} onClick={() => onRemove(r)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside className="dc-side">
                <div className="dc-supcard">
                  <span className="dc-supico"><Ico d={HEART} fill /></span>
                  <h3>{t('support.title')}</h3>
                  <p>{t('support.text')}</p>
                  <button className="dc-btn dc-pink" onClick={onDonate}><Ico d={HEART} fill />{t('support.button')}</button>
                  {note && modal === null && <p className="dc-hint">{note}</p>}
                </div>
                <details className="dc-vers">
                  <summary>{t('home.versions')}{snaps.length > 0 && <span className="dc-count">{snaps.length}</span>}</summary>
                  <p className="dc-hint">{t('home.versionsHint')}</p>
                  {snaps.length === 0 ? <p className="dc-hint">{t('home.versionsEmpty')}</p> : (
                    <div className="dc-vlist">
                      {snaps.map(sn => (
                        <div key={sn.t} className="dc-vitem">
                          <span className="dc-rtxt">
                            <b>{fmt.relative(sn.t)}</b>
                            <small>{t('home.clips', { count: sn.n })} · {fmt.duration(sn.dur || 0)}{sn.why === 'restore' ? ' · ' + t('home.versionBeforeRestore') : ''}</small>
                          </span>
                          <button className="dc-btn" onClick={() => onRestore(sn)}>{t('home.restore')}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              </aside>
            </div>
          </>
        ) : (
          <section className="dc-formats">
            <h2>{t('home.chooseFormat')}</h2>
            <div className="dc-fgrid">
              {FORMATS.map(f => (
                <button key={f.id} className="dc-fmt" onClick={() => onNew(f.w, f.h)}>
                  <span className="dc-fbox"><i style={{ aspectRatio: `${f.w} / ${f.h}` }} /></span>
                  <b>{t(`home.formats.${f.id}`)}</b>
                  <small>{t(`home.formats.${f.id}Use`)}</small>
                </button>
              ))}
            </div>
            <button className="dc-link" onClick={() => setView('main')}>← {t('common.back')}</button>
          </section>
        )}

        <footer className="dc-foot">
          <button className="dc-link" onClick={() => setModal('settings')}><Ico d={GEAR} />{t('home.settings')}</button>
          <button className="dc-link" onClick={() => setModal('about')}><Ico d={INFO} />{t('home.about')}</button>
          <button className="dc-link" onClick={openBug}><Ico d={BUG} />{t('bug.menu')}</button>
          <span className="dc-sp" />
          <span className="dc-priv">{t('home.privacy')}</span>
          <button className="dc-link dc-heart" onClick={openSupport}><Ico d={HEART} fill />{t('home.support')}</button>
        </footer>
      </div>

      {del && (
        <div className="dc-modal" onClick={e => { if (e.target === e.currentTarget) setDel(null); }}>
          <div className="dc-box">
            <h3>{t('home.deleteTitle')}</h3>
            <p><b>{del.name}</b></p>
            <p className="dc-hint">{t('home.deleteText')}</p>
            <div className="dc-delbtns">
              <button className="dc-btn" onClick={() => setDel(null)}>{t('home.deleteCancel')}</button>
              <button className="dc-btn dc-danger" onClick={onDelete}>{t('home.deleteConfirm')}</button>
            </div>
          </div>
        </div>
      )}
      {modal && (
        <div className="dc-modal" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="dc-box">
            {modal === 'settings' && (
              <>
                <h3>{t('settings.title')}</h3>
                <h4>{t('settings.language')}</h4>
                <div className="dc-langs">
                  {getLanguages().map(l => (
                    <button key={l.code} lang={l.code} className={l.code === getLang() ? 'on' : ''} onClick={() => setLang(l.code)}>{l.name}</button>
                  ))}
                </div>
                <p className="dc-hint">{t('settings.languageHint')}</p>
                <h4>{t('settings.theme')}</h4>
                <div className="dc-themes">
                  {(api?.themes() || []).map(th => (
                    <button key={th.id} className={th.id === theme ? 'on' : ''} onClick={() => onTheme(th.id)}>
                      <i style={{ background: `linear-gradient(135deg, ${th.c1}, ${th.c2})` }} />{t(`themes.${th.id}`)}
                    </button>
                  ))}
                </div>
                <h4>{t('home.intro.title')}</h4>
                <label className="dc-chk"><input type="checkbox" checked={intro} onChange={e => { setIntro(e.target.checked); setIntroOn(e.target.checked); }} /><span>{t('home.intro.on')}</span></label>
                <label className={'dc-chk' + (intro ? '' : ' off')}><input type="checkbox" checked={introSnd} disabled={!intro} onChange={e => { setIntroSnd(e.target.checked); setIntroSoundOn(e.target.checked); }} /><span>{t('home.intro.sound')}</span></label>
                <button className="dc-btn" onClick={() => { setModal(null); window.dispatchEvent(new Event('dedcut-intro')); }}>{t('home.intro.replay')}</button>
                <h4>{t('settings.folder')}</h4>
                <button className="dc-btn" onClick={() => api?.openFolder()}>{t('settings.openFolder')}</button>
                <h4>{t('settings.privacy')}</h4>
                <p className="dc-hint">{t('settings.privacyText')}</p>
              </>
            )}
            {modal === 'about' && (
              <>
                <div className="dc-about-head"><img src={logo()} alt="" /><div><h3>DedCut</h3><p>{t('about.version', { version: api?.version() || '' })} <span className="dc-beta">{t('app.beta')}</span> · {t('app.madeBy', { author: 'ByKemi' })}</p></div></div>
                <p className="dc-hint dc-betanote">{t('app.betaTip')}</p>
                <h4>{t('about.links')}</h4>
                <div className="dc-about-links"><button className="dc-btn" onClick={() => api?.openLink('https://dedcut.com')}>dedcut.com</button><button className="dc-btn" onClick={openBug}><Ico d={BUG} />{t('bug.menu')}</button><button className="dc-btn" onClick={() => api?.openLink(SOURCE_URL)}><Ico d={CODE} />{t('about.code')}</button></div>
                <h4>{t('about.licences')}</h4>
                <p className="dc-hint">{t('about.freeCode')}</p>
                <p className="dc-hint">{t('about.licencesText')}</p>
                <button className="dc-btn" onClick={() => api?.openLicences()}>{t('about.openLicences')}</button>
                <p className="dc-hint">{t('about.original')}</p>
                <button className="dc-link dc-heart" onClick={() => { setNote(''); setModal('support'); }}><Ico d={HEART} fill />{t('home.support')}</button>
              </>
            )}
            {modal === 'support' && (
              <>
                <h3><Ico d={HEART} fill />{t('support.title')}</h3>
                <p>{t('support.text')}</p>
                <button className="dc-btn dc-pink" onClick={onDonate}>{t('support.button')}</button>
                {note && <p className="dc-hint">{note}</p>}
              </>
            )}
            <button className="dc-close" onClick={() => setModal(null)} aria-label={t('common.close')}>{t('common.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

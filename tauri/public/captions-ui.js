/* Sous-titres automatiques (DedCut AI) : interface de l'onglet « Sous-titres ».
   Le calcul est fait par window.dedcutCaptions (src/captions.ts) : 100 % local, rien n'est envoyé. */
(() => {
const CAP = window.dedcutCaptions;
if (!CAP) return;

const LS = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
const LSset = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} };

/* langues proposées (Whisper en gère près de 100 ; les noms viennent de Windows via Intl, aucune traduction à maintenir) */
const LANGS = ['fr','en','es','de','it','pt','nl','pl','ru','uk','tr','ar','he','hi','id','vi','th','ja','ko','zh','sv','da','no','fi','cs','el','ro','hu'];
const LINE = { short: 26, normal: 40, long: 58 };
let capBusy = false, capRunning = false;

const state = {
  model: LS('dedcut-cap-model') || 'base',
  lang: LS('dedcut-cap-lang') || 'auto',
  len: LS('dedcut-cap-len') || 'normal'
};
const MODEL_NAME = { tiny: 'cap.mTiny', base: 'cap.mBase', small: 'cap.mSmall' };
const bytesFmt = b => window.i18n.fmt.bytes(b);
const pct = q => window.i18n.fmt.percent(Math.max(0, Math.min(1, q)));
const langName = code => { try { return new Intl.DisplayNames([document.documentElement.lang || 'en'], { type: 'language' }).of(code) || code } catch (e) { return code } };
const isCap = c => isText(c) && c.p.cap;
const caps = () => clips.filter(isCap).sort((a, b) => a.start - b.start);

/* ---------- modèle ---------- */
function buildSelects() {
  const ms = CAP.models();
  $('#capModel').innerHTML = ms.map(m => `<option value="${m.key}">${esc(T(MODEL_NAME[m.key] || m.key))} · ${esc(bytesFmt(m.bytes))}</option>`).join('');
  if (!ms.some(m => m.key === state.model)) state.model = 'base';
  $('#capModel').value = state.model;
  const names = LANGS.map(c => [c, langName(c)]).sort((a, b) => a[1].localeCompare(b[1], document.documentElement.lang || 'en'));
  $('#capLang').innerHTML = `<option value="auto">${esc(T('cap.langAuto'))}</option>` + names.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#capLang').value = LANGS.includes(state.lang) ? state.lang : 'auto';
  $$('#capLen button').forEach(b => b.classList.toggle('on', b.dataset.v === state.len));
}
let dlBusy = false;
async function syncModel() {
  const m = CAP.models().find(x => x.key === state.model);
  const ready = m ? await CAP.has(m.key) : false;
  $('#capDlInfo').textContent = ready ? T('cap.ready') : (m ? T('cap.dlInfo', { size: bytesFmt(m.bytes), license: m.license }) : '');
  $('#capDl').hidden = ready || dlBusy;
  $('#capRm').hidden = !ready || capBusy;
  $('#capGo').disabled = !ready || capBusy;
  return ready;
}
$('#capModel').onchange = e => { state.model = e.target.value; LSset('dedcut-cap-model', state.model); syncModel() };
$('#capLang').onchange = e => { state.lang = e.target.value; LSset('dedcut-cap-lang', state.lang) };
$('#capLen').addEventListener('click', e => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  state.len = b.dataset.v; LSset('dedcut-cap-len', state.len);
  $$('#capLen button').forEach(x => x.classList.toggle('on', x === b));
});
$('#capDl').onclick = async () => {
  if (dlBusy) return;
  dlBusy = true; $('#capDl').hidden = true; $('#capDlBar').hidden = false;
  const bar = $('#capDlBar i');
  try {
    await CAP.download(state.model, (d, t) => {
      bar.style.width = (100 * d / t) + '%';
      $('#capDlInfo').textContent = d >= t ? T('cap.verifying') : T('cap.downloading', { pct: pct(d / t) });
    });
  } catch (e) { toast(T('cap.errDownload', { error: String((e && e.message) || e) })) }
  dlBusy = false; $('#capDlBar').hidden = true; bar.style.width = '0';
  syncModel();
};
$('#capRm').onclick = async () => { await CAP.remove(state.model); toast(T('cap.modelDeleted')); syncModel() };

/* ---------- quels clips analyser ---------- */
function hasSound(c) {
  const m = c.mid && mById(c.mid);
  return !!m && m.type !== 'image' && !m.missing && !isOvr(c) && !trk(c).mute && (c.p.vol ?? 100) > 0 && (m.type === 'audio' || m.type === 'video');
}
function capSources() {
  const c = selClip();
  if (c && hasSound(c)) return [c];
  return clips.filter(hasSound).sort((a, b) => a.start - b.start);
}
function syncTarget() {
  const c = selClip(), src = capSources(), box = $('#capTgt');
  box.classList.toggle('ok', src.length > 0);
  box.textContent = !src.length ? T('cap.targetNone') : (c ? T('lib.target', { name: clipName(c) }) : T('cap.targetAll'));
}

/* ---------- voix du clip : 16 kHz mono ---------- */
async function capSamples(c) {
  const m = mById(c.mid), buf = await decodeAudio(m);
  if (!buf) throw new Error('audio');
  const rate = c.p.rate || 1, sr = buf.sampleRate;
  const a = Math.max(0, Math.floor(c.in * sr)), b = Math.min(buf.length, Math.floor((c.in + c.dur * rate) * sr));
  const chs = []; for (let i = 0; i < buf.numberOfChannels; i++) chs.push(buf.getChannelData(i));
  const step = sr / 16000, n = Math.max(0, Math.floor((b - a) / step)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = a + Math.floor(i * step), e = Math.max(s + 1, a + Math.floor((i + 1) * step));
    let v = 0, k = 0;
    for (let j = s; j < e; j++) for (const d of chs) { v += d[j]; k++ }
    out[i] = v / k;
  }
  return out;
}

/* ---------- mots -> lignes de sous-titres ---------- */
function capGroup(words, maxChars, spaced) {
  const lines = []; let cur = null;
  const flush = () => { if (cur && cur.text.trim()) lines.push(cur); cur = null };
  for (const w of words) {
    // un morceau sans espace devant continue le mot précédent (« sous » + « -titres ») : on ne coupe jamais là
    const joins = spaced && cur && !/^\s/.test(w.t);
    if (cur && !joins) {
      const gap = w.s - cur.e, len = (cur.text + w.t).trim().length, dur = w.e - cur.s;
      const endSentence = /[.!?。！？…]$/.test(cur.text.trim());
      if (gap > 0.9 || len > maxChars || dur > 6 || (endSentence && cur.text.trim().length >= maxChars * 0.45)) flush();
    }
    if (!cur) cur = { text: '', s: w.s, e: w.e };
    cur.text += w.t; cur.e = w.e;
  }
  flush();
  for (const l of lines) {
    l.text = l.text.replace(/\s+/g, ' ').trim();
    // long : deux lignes, coupées vers le milieu (sur une espace si possible)
    if (l.text.length > maxChars * 0.6) {
      const mid = Math.floor(l.text.length / 2);
      let cut = -1;
      for (let d = 0; d < mid; d++) { if (l.text[mid + d] === ' ') { cut = mid + d; break } if (l.text[mid - d] === ' ') { cut = mid - d; break } }
      if (cut > 0) l.text = l.text.slice(0, cut) + '\n' + l.text.slice(cut + 1);
      else if (!/\s/.test(l.text)) l.text = l.text.slice(0, mid) + '\n' + l.text.slice(mid);
    }
  }
  // durée minimale, pas de chevauchement
  for (let i = 0; i < lines.length; i++) {
    const nx = lines[i + 1];
    lines[i].e = Math.max(lines[i].e, lines[i].s + 0.7);
    if (nx && lines[i].e > nx.s - 0.02) lines[i].e = Math.max(lines[i].s + 0.3, nx.s - 0.02);
  }
  return lines;
}
const capStyle = () => Object.assign(TBASE(), {
  size: Math.round(W < H ? W / 15 : H / 20), x: 50, y: W < H ? 78 : 86, font: 'Segoe UI', bg: true, bgc: '#000000', cap: true
});
const capClip = (text, start, dur) => newClip({ track: tk('over'), start, dur, p: Object.assign(capStyle(), { text }) });

/* ---------- création ---------- */
function setRun(on) {
  capRunning = on; capBusy = on;
  $('#capRun').hidden = !on; $('#capGo').hidden = on;
  $('#capModel').disabled = on; $('#capLang').disabled = on;
  syncModel();
}
async function capCreate() {
  if (capBusy) return;
  if (!(await CAP.has(state.model))) { toast(T('cap.needModel')); return }
  const src = capSources();
  if (!src.length) { toast(T('cap.targetNone')); return }
  if (tracks[tk('over')].lock) { toast(T('msg.trackLocked')); return }
  setRun(true);
  $('#capBar').style.width = '0'; $('#capPct').textContent = T('cap.loadingModel');
  const made = []; let detected = null, error = null;
  try {
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      const samples = await capSamples(c);
      const r = await CAP.transcribe(samples, {
        model: state.model, language: state.lang === 'auto' ? undefined : state.lang,
        onProgress: p => { const q = (i + p) / src.length; $('#capBar').style.width = (100 * q) + '%'; $('#capPct').textContent = T('cap.working', { pct: pct(q) }) }
      });
      detected = detected || r.language;
      const rate = c.p.rate || 1;
      const max = LINE[state.len] * (W < H ? 0.7 : 1);
      const spaced = !/^(ja|zh|th|lo|km|my)$/.test(r.language || (state.lang === "auto" ? "" : state.lang));
      for (const l of capGroup(r.words, max, spaced)) {
        const st = c.start + l.s / rate, en = Math.min(c.start + c.dur, c.start + l.e / rate);
        if (st >= c.start + c.dur || en - st < 0.1) continue;
        made.push({ clip: capClip(l.text, st, en - st), from: c });
      }
    }
  } catch (e) { error = e }
  setRun(false);
  if (error) {
    if (String(error.message) === 'cancelled') toast(T('cap.cancelled'));
    else toast(T('cap.errRun', { error: String((error && error.message) || error) }));
    return;
  }
  if (!made.length) { toast(T('cap.noSpeech')); return }
  // les anciens sous-titres automatiques de ces mêmes clips sont remplacés (annulable avec Ctrl+Z)
  clips = clips.filter(x => !(isCap(x) && src.some(c => x.start >= c.start - 0.001 && x.start < c.start + c.dur)));
  clips.push(...made.map(m => m.clip));
  sel = made[0].clip.id; seek(made[0].clip.start);
  commit(); refresh();
  toast(T('text.subsCreated', { count: made.length }) + (detected && state.lang === 'auto' ? ' · ' + T('cap.langFound', { lang: langName(detected) }) : ''));
}
$('#capGo').onclick = capCreate;
/* pour DedCut IA : modèle prêt ? / créer les sous-titres */
window.dedcutCaptions = { ready: () => CAP.has(state.model), run: async () => { showTab('cap'); await capCreate(); return true } };
/* pour le montage par le texte (15m-textedit.js) : refaire les sous-titres avec les mots qui restent */
window.dedcutCapTools = { group: capGroup, clip: capClip, max: () => LINE[state.len] * (W < H ? 0.7 : 1) };
$('#capCancel').onclick = () => CAP.cancel();

/* ---------- liste éditable ---------- */
function capList() {
  const list = caps();
  $('#capListTitle').textContent = T('cap.listTitle', { count: list.length });
  $('#capSrt').disabled = $('#capVtt').disabled = $('#capClr').disabled = !list.length;
  const box = $('#caplist');
  if (!list.length) { box.innerHTML = `<div class="hint">${esc(T('cap.empty'))}</div>`; return }
  box.innerHTML = list.slice(0, 500).map(c => `<div class="capi${c.id === sel ? ' on' : ''}" data-id="${c.id}"><button class="sm tc" data-go>${fmt(c.start)}</button><textarea rows="2" spellcheck="false">${esc(c.p.text)}</textarea><button class="sm x" data-rm title="${esc(T('cap.removeTip'))}">✕</button></div>`).join('');
}
$('#caplist').addEventListener('click', e => {
  const row = e.target.closest('.capi'); if (!row) return;
  const c = clips.find(x => x.id === +row.dataset.id); if (!c) return;
  if (e.target.closest('[data-rm]')) { clips = clips.filter(x => x !== c); if (sel === c.id) sel = null; commit(); refresh(); return }
  if (e.target.closest('[data-go]')) { sel = c.id; seek(c.start + 0.01); refresh() }
});
$('#caplist').addEventListener('focusin', e => {
  const row = e.target.closest('.capi'); if (!row) return;
  const id = +row.dataset.id; if (sel !== id) { sel = id; renderTL(); renderInspector(); $$('#caplist .capi').forEach(r => r.classList.toggle('on', +r.dataset.id === id)) }
});
$('#caplist').addEventListener('input', e => {
  const row = e.target.closest('.capi'); if (!row || e.target.tagName !== 'TEXTAREA') return;
  const c = clips.find(x => x.id === +row.dataset.id); if (c) { c.p.text = e.target.value; renderTL() }
});
$('#caplist').addEventListener('change', e => { if (e.target.tagName === 'TEXTAREA') { commit(); renderInspector() } });

/* ---------- SRT / VTT ---------- */
const p2 = (n, l = 2) => String(n).padStart(l, '0');
function tc(t, vtt) {
  const ms = Math.max(0, Math.round(t * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
  return `${p2(h)}:${p2(m)}:${p2(s)}${vtt ? '.' : ','}${p2(ms % 1000, 3)}`;
}
function capExport(vtt) {
  const list = caps();
  if (!list.length) { toast(T('cap.noneToExport')); return }
  let out = vtt ? 'WEBVTT\n\n' : '';
  list.forEach((c, i) => { out += (vtt ? '' : (i + 1) + '\n') + tc(c.start, vtt) + ' --> ' + tc(c.start + c.dur, vtt) + '\n' + String(c.p.text).replace(/\n{2,}/g, '\n') + '\n\n' });
  download(new Blob([out], { type: 'text/plain;charset=utf-8' }), safeName(projName) + (vtt ? '.vtt' : '.srt'));
  toast(T('cap.exported'));
}
$('#capSrt').onclick = () => capExport(false);
$('#capVtt').onclick = () => capExport(true);
function parseTime(s) {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(s.trim());
  if (!m) return null;
  return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
}
function parseCaptions(text) {
  const blocks = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split('\n').filter(l => l.length || false);
    const i = lines.findIndex(l => l.includes('-->'));
    if (i < 0) continue;
    const [a, rest] = lines[i].split('-->');
    const s = parseTime(a), e = parseTime((rest || '').trim().split(/\s+/)[0] || '');
    if (s == null || e == null || e <= s) continue;
    const t = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim();
    if (t) out.push({ s, e, t });
  }
  return out;
}
$('#capImp').onclick = () => $('#capFile').click();
$('#capFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  let cues;
  try { cues = parseCaptions(await f.text()) } catch (err) { cues = [] }
  if (!cues.length) { toast(T('cap.invalidFile')); return }
  if (tracks[tk('over')].lock) { toast(T('msg.trackLocked')); return }
  const made = cues.map(c => capClip(c.t, c.s, c.e - c.s));
  clips.push(...made); sel = made[0].id; commit(); refresh();
  toast(T('cap.imported', { count: made.length }));
};
$('#capClr').onclick = async () => {
  const list = caps(); if (!list.length) return;
  if (!(await askYes(T('cap.confirmClear')))) return;
  clips = clips.filter(c => !isCap(c)); sel = null; commit(); refresh();
};
$('#capStyle').onclick = () => {
  const c = selClip();
  if (!isCap(c)) { toast(T('cap.styleHint')); return }
  const keys = ['font', 'color', 'stroke', 'sc', 'sw', 'shadow', 'glitch', 'neon', 'bg', 'bgc', 'anim', 'aout', 'bold', 'italic', 'ls', 'align', 'fade', 'amt', 'size', 'x', 'y'];
  caps().forEach(x => { if (x !== c) keys.forEach(k => { if (c.p[k] !== undefined) x.p[k] = c.p[k] }) });
  commit(); refresh(); toast(T('cap.styleApplied'));
};

/* ---------- liens avec le moteur ---------- */
function capSync() {
  syncTarget();
  if (!$('#t-cap').hidden) capList();
}
const _refresh = refresh; refresh = function () { _refresh(); capSync() };
const _showTab = showTab; showTab = function (t) { _showTab(t); if (t === 'cap') { buildSelects(); syncModel(); capSync() } };
window.addEventListener('dedcut-lang', () => { buildSelects(); syncModel(); capSync() });
buildSelects(); syncModel(); capSync();
})();

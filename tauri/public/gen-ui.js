/* DedCut AI — onglet « Vidéo IA » : une image (facultative), une description, un style, un format, une durée, un bouton.
   Le travail est fait par src-tauri/src/ai.rs (stable-diffusion.cpp, Real-ESRGAN, RIFE). Rien ne part sur internet, sauf le téléchargement demandé.
   Au-delà de 5 s (FastWan) : plusieurs morceaux enchaînés, chacun repart de la dernière image du précédent.
   Finition (FastWan) : netteté x2 + fluidité x2 ; les images finales sont assemblées ici en MP4 (WebCodecs). */
(() => {
const AI = window.dedcutAI;
const box = $('#t-gen');
if (!box) return;
const el = id => $('#' + id);
const val = id => el(id).value;
const bytesFmt = n => n >= 1073741824 ? (n / 1073741824).toFixed(1).replace('.', ',') + ' Go' : n >= 1048576 ? Math.round(n / 1048576) + ' Mo' : Math.round(n / 1024) + ' Ko';
const dur = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? m + ' min' + (m < 10 && s % 60 ? ' ' + String(s % 60).padStart(2, '0') + ' s' : '') : s + ' s' };
const pct = q => window.i18n.fmt.percent(Math.min(1, Math.max(0, q)));
let hw = null, st = null, busy = false, imgId = null, style = 'cartoon', fmt = 'landscape', secs = 5, segInfo = '', cancelled = false;

/* réglages propres à chaque modèle ; t = secondes mesurées sur RX 580 (qualité normale) pour 1, 2, 3, 5 s */
const MODELS = {
  fast: { fps: 24, seg: 5, steps: () => 3, cfg: 1, mult: 32, durs: [2, 5, 10, 15], def: 'normal', enh: true,
    q: { draft: 288, normal: 352, good: 480, hd: 704 }, hint: 'aig.mFastHint', t: { 1: 130, 2: 160, 3: 260, 5: 570 } },
  wan: { fps: 16, seg: 5, steps: q => q === 'draft' ? 12 : q === 'normal' ? 16 : 22, cfg: 6, mult: 16, durs: [1, 2, 3, 5], def: 'draft', enh: false,
    q: { draft: 256, normal: 320, good: 480 }, hint: 'aig.mWanHint', t: { 1: 300, 2: 450, 3: 650, 5: 1200 } },
  vace: { fps: 16, seg: 5, steps: q => q === 'draft' ? 12 : q === 'normal' ? 16 : 22, cfg: 6, mult: 16, durs: [1, 2, 3, 5], def: 'draft', enh: false,
    q: { draft: 256, normal: 320, good: 480 }, hint: 'aig.mVaceHint', t: { 1: 750, 2: 1100, 3: 1600, 5: 3000 } }
};
const QNAME = { draft: 'aig.qDraft', normal: 'aig.qNormal', good: 'aig.qGood', hd: 'aig.qHD' };
const QCOST = { draft: .6, normal: 1, good: 2.2, hd: 6 };
/* styles : la description est enrichie (ces modèles réagissent beaucoup à la façon de décrire) */
const STYLES = {
  cartoon: ['3D animated movie style, cute cartoon characters with big expressive eyes: ', '. Vibrant saturated colors, soft warm lighting, smooth fluid motion, highly detailed, high quality animation.'],
  real: ['Cinematic realistic video: ', '. Natural lighting, sharp focus, realistic textures, smooth camera motion, high detail.'],
  anime: ['Japanese anime style animation: ', '. Hand-drawn look, vivid colors, expressive characters, smooth animation, high quality.'],
  clay: ['Claymation stop-motion style: ', '. Plasticine characters, handmade miniature set, soft studio lighting, charming detailed textures.'],
  draw: ['2D cartoon drawing style: ', '. Bold clean outlines, flat bright colors, fun expressive animation.'],
  none: ['', '']
};
const cur = () => MODELS[val('aigModel')] || MODELS.fast;
const info = () => st && st.models.find(m => m.id === val('aigModel'));
function dims(q) {
  const M = cur(), s = M.q[q] || M.q.normal, r = n => Math.round(n / M.mult) * M.mult;
  if (fmt === 'portrait') return [s, r(s * 16 / 9)];
  if (fmt === 'square') return [r(s * 1.2), r(s * 1.2)];
  return [r(s * 16 / 9), s];
}
function estimate() {
  const M = cur(), segs = Math.ceil(secs / M.seg);
  let t = 0;
  for (let k = 0; k < segs; k++) { const s = Math.min(M.seg, secs - k * M.seg), keys = Object.keys(M.t).map(Number); const kk = keys.find(x => x >= s) || 5; t += M.t[kk] }
  t *= QCOST[val('aigQ')] || 1;
  if (M.enh && el('aigEnh').checked) t += secs * 12;
  return t;
}

/* ---------- état ---------- */
async function refresh() {
  if (!AI) { el('aigNeed').hidden = false; el('aigNeed').textContent = T('aig.onlyApp'); el('aigBody').hidden = true; return }
  if (!hw) { try { hw = await AI.hardware() } catch (e) { hw = { ok: true } } }
  if (hw.unsupported) { el('aigNeed').hidden = false; el('aigNeed').textContent = T('aig.notThisSystem'); el('aigBody').hidden = true; return }
  if (!hw.ok) { el('aigNeed').hidden = false; el('aigNeed').innerHTML = hwText(); el('aigBody').hidden = true; return }
  try { st = await AI.status() } catch (e) { st = null; return }
  sync();
}
/* message quand le PC n'est pas assez puissant : ce qui manque, et pourquoi */
function hwText() {
  const nf = x => window.i18n.fmt.number(x);
  const L = [];
  if (!hw.recent && hw.vram_gb > .3) L.push(T('aig.hwOld', { gpu: hw.gpu }));
  else if (hw.vram_gb < hw.min_vram_gb - .1) L.push(hw.vram_gb > .3 ? T('aig.hwVram', { gpu: hw.gpu, have: nf(hw.vram_gb), need: nf(hw.min_vram_gb) }) : T('aig.hwNoGpu', { need: nf(hw.min_vram_gb) }));
  if (hw.ram_gb < hw.min_ram_gb - .5) L.push(T('aig.hwRam', { have: nf(hw.ram_gb), need: nf(hw.min_ram_gb) }));
  return '<b>' + esc(T('aig.hwBlocked')) + '</b><br>' + L.map(x => '• ' + esc(x)).join('<br>') + '<br><br>' + esc(T('aig.hwWhy'));
}
function fillOptions() {
  const M = cur(), q = val('aigQ');
  el('aigQ').innerHTML = Object.keys(M.q).map(k => '<option value="' + k + '">' + esc(T(QNAME[k])) + '</option>').join('');
  el('aigQ').value = M.q[q] ? q : M.def;
  if (!M.durs.includes(secs)) secs = M.durs.includes(5) ? 5 : M.durs[0];
  el('aigDur').innerHTML = M.durs.map(n => '<button data-v="' + n + '"' + (n === secs ? ' class="on"' : '') + '>' + esc(T('aig.seconds', { n })) + '</button>').join('');
}
function sync() {
  const mi = info(), M = cur(), ready = !!(mi && mi.ready);
  el('aigModelHint').textContent = T(M.hint);
  el('aigModelState').textContent = ready ? T('aig.ready') : T('aig.toDownload', { size: bytesFmt(mi ? mi.missing : 0) });
  el('aigInstall').hidden = ready;
  el('aigInstallInfo').textContent = mi && !mi.missing ? T('aig.installVerify') : T('aig.installInfo', { size: bytesFmt(mi ? mi.missing : 0) });
  el('aigDl').disabled = busy;
  el('aigRm').hidden = !ready || busy;
  el('aigGo').disabled = !ready || busy;
  el('aigGo').hidden = busy;
  el('aigEta').hidden = busy || !ready;
  el('aigEta').textContent = T('aig.eta', { time: dur(estimate()) });
  el('aigEnh').closest('label').hidden = !M.enh;
  el('aigLongHint').hidden = secs <= M.seg;
  el('aigModel').disabled = busy;
  $$('#aigStyles button').forEach(b => b.classList.toggle('on', b.dataset.v === style));
  $$('#aigFmt button').forEach(b => b.classList.toggle('on', b.dataset.v === fmt));
  $$('#aigDur button').forEach(b => b.classList.toggle('on', +b.dataset.v === secs));
  const m = imgId && mById(imgId);
  if (!m) imgId = null;
  el('aigImgPrev').hidden = !m; if (m && el('aigImgPrev').src !== m.url) el('aigImgPrev').src = m.url;
  el('aigDropT').hidden = !!m; el('aigImgClear').hidden = !m;
}
el('aigModel').onchange = () => { fillOptions(); sync() };
el('aigQ').onchange = sync;
el('aigEnh').onchange = sync;
el('aigStyles').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; style = b.dataset.v; sync() });
el('aigFmt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fmt = b.dataset.v; sync() });
el('aigDur').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; secs = +b.dataset.v; sync() });
el('aigDrop').onclick = async e => {
  if (busy) return;
  if (e.target.closest('#aigImgClear')) { imgId = null; sync(); return }
  const ms = (await importMedia()).filter(m => m.type === 'image');
  if (!ms.length) return;
  await waitMeta(ms); imgId = ms[0].id; sync();
};

/* ---------- image de départ (recadrée à la taille de la vidéo, envoyée en PNG) ---------- */
async function sendRef(draw, w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); draw(g);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  await AI.setRef(new Uint8Array(await blob.arrayBuffer()));
}
const cover = (g, src, sw, sh, w, h) => { const k = Math.max(w / sw, h / sh); g.drawImage(src, (w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k) };
async function refFromImage(m, w, h) {
  const im = new Image(); im.crossOrigin = 'anonymous';
  await new Promise((ok, ko) => { im.onload = ok; im.onerror = () => ko(new Error(m.name)); im.src = m.url });
  await sendRef(g => cover(g, im, im.naturalWidth, im.naturalHeight, w, h), w, h);
}
/* dernière image d'un morceau : point de départ du suivant */
async function refFromVideoEnd(url, w, h) {
  const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.preload = 'auto'; v.src = url;
  await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = () => ko(new Error('video')); setTimeout(ok, 8000) });
  if (!isFinite(v.duration)) await new Promise(r => { v.ondurationchange = () => { if (isFinite(v.duration)) r() }; v.currentTime = 1e101; setTimeout(r, 5000) });
  v.currentTime = Math.max(0, (isFinite(v.duration) ? v.duration : 1) - 0.02);
  await new Promise(r => { v.onseeked = r; setTimeout(r, 4000) });
  await sendRef(g => cover(g, v, v.videoWidth, v.videoHeight, w, h), w, h);
  v.removeAttribute('src'); v.load();
}

/* ---------- assemblage des images de finition en MP4 ---------- */
async function encodeFrames(r, onP) {
  const W = r.width, H = r.height, fps = r.fps, n = r.count;
  let cfg = null;
  for (const codec of ['avc1.640033', 'avc1.4d0033', 'avc1.640028', 'avc1.42003e']) {
    const c = { codec, width: W, height: H, bitrate: Math.round(9e6 * W * H / (1280 * 704)), framerate: fps, avc: { format: 'avc' }, hardwareAcceleration: 'prefer-software' };
    if ((await VideoEncoder.isConfigSupported(c).catch(() => ({}))).supported) { cfg = c; break }
  }
  if (!cfg) throw new Error(T('export.noH264'));
  const mux = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null;
  const enc = new VideoEncoder({ output: (c, m) => mux.addVideoChunk(c, m), error: e => err = e }); enc.configure(cfg);
  for (let i = 1; i <= n; i++) {
    if (cancelled) { try { enc.close() } catch (e) { } throw new Error('annulé') }
    const res = await fetch(FS.fileUrl(r.frames_dir + '\\' + String(i).padStart(8, '0') + '.jpg'));
    if (!res.ok) throw new Error('image ' + i);
    const bmp = await createImageBitmap(await res.blob());
    const vf = new VideoFrame(bmp, { timestamp: Math.round((i - 1) * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: (i - 1) % (fps * 2) === 0 }); vf.close(); bmp.close();
    if (err) throw err;
    if (enc.encodeQueueSize > 6) await new Promise(q => { enc.addEventListener('dequeue', q, { once: true }); setTimeout(q, 250) });
    if (i % 6 === 0) { onP(i / n); await new Promise(q => setTimeout(q, 0)) }
  }
  await enc.flush(); enc.close(); if (err) throw err;
  mux.finalize();
  return new Blob([mux.target.buffer], { type: 'video/mp4' });
}

/* ---------- progression ---------- */
function setBusy(on) {
  busy = on;
  el('aigRun').hidden = !on;
  if (!on) segInfo = '';
  sync();
}
let part = { k: 0, n: 1 };
const bar = q => { el('aigBar').style.width = (100 * (part.k + Math.min(1, q)) / part.n) + '%' };
const say = t => { el('aigStatus').textContent = segInfo + t };
AI && AI.onProgress(p => {
  if (!busy) return;
  const check = p.id.endsWith(':check');
  el('aigBar').style.width = (100 * (check ? 1 : p.done / p.total)) + '%';
  el('aigStatus').textContent = check ? T('aig.checking') : T('aig.downloading', { part: p.idx + 1, total: p.n, done: bytesFmt(p.done), size: bytesFmt(p.total) });
});
let steps = { n: 0, total: 0 };
AI && AI.onLog(line => {
  if (!busy || el('aigGo').hidden === false) return;
  line = line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  if (line === '[dedcut] upscale') { bar(.86); say(T('aig.stUpscale')); return }
  if (line === '[dedcut] interpolate') { bar(.92); say(T('aig.stSmooth')); return }
  const m = line.match(/(\d+)\/(\d+)\s*-\s*([\d.]+)(s\/it|it\/s)/);
  if (m) {
    const n = +m[1], total = +m[2], sec = m[4] === 's/it' ? +m[3] : 1 / Math.max(.001, +m[3]);
    if (n >= 2 || total === 1) steps.sec = sec; // la 1re étape inclut le chargement : on ne s'y fie pas
    const left = (total - n) * (steps.sec || sec);
    bar(.8 * n / total);
    say(T('aig.step', { step: n, total, eta: dur(left + 20) }));
    steps.n = n; steps.total = total;
  } else if (/decod|vae|tae/i.test(line) && steps.total && steps.n >= steps.total) {
    say(T('aig.decoding'));
  }
});

/* ---------- téléchargement / suppression ---------- */
el('aigDl').onclick = async () => {
  if (busy) { toast(T('aig.busy')); return }
  setBusy(true); el('aigBar').style.width = '0';
  try { await AI.download(val('aigModel')); toast(T('aig.dlDone')) }
  catch (e) { if (String(e) !== 'annulé') toast(T('aig.dlError', { error: String(e) })) }
  setBusy(false); refresh();
};
el('aigRm').onclick = async () => {
  if (busy || !(await askYes(T('aig.removeModelConfirm')))) return;
  try { await AI.remove(val('aigModel')); toast(T('aig.removed')) } catch (e) { toast(String(e)) }
  refresh();
};
el('aigCancel').onclick = () => { cancelled = true; AI.cancel() };
el('aigSeedRnd').onclick = () => { el('aigSeed').value = Math.floor(Math.random() * 2147483647) };
el('aigSeed').value = Math.floor(Math.random() * 2147483647);

/* ---------- création ---------- */
async function addToProject(path, k, fps) {
  const inf = (await FS.allowPaths([path]))[0];
  const [m] = addPaths([inf]);
  if (!m) return;
  await waitMeta([m]); addFromMedia(m.id, false);
  // morceau suivant : sa 1re image est la dernière du précédent, on la saute pour éviter un arrêt sur image
  const c = k > 0 && selClip();
  if (c && c.mid === m.id && c.dur > 2 / fps) { c.in += 1 / fps; c.dur -= 1 / fps; commit(); refresh() }
  return m.id;
}

el('aigGo').onclick = () => { generate() };
/* renvoie { ok, media: [ids] } ou { error } ; utilisé aussi par l'Assistant IA (window.dedcutGen) */
async function generate() {
  if (busy) { toast(T('aig.busy')); return { error: 'busy' } }
  const text = val('aigPrompt').trim();
  if (!text) { toast(T('aig.needPrompt')); el('aigPrompt').focus(); return { error: 'empty prompt' } }
  const model = val('aigModel'), M = cur(), q = val('aigQ'), [w, h] = dims(q);
  const src = imgId ? mById(imgId) : null;
  if (src && !(info() || {}).image) { toast(T('aig.imgUnsupported')); return { error: 'this model cannot start from an image' } }
  const [pre, post] = STYLES[style] || STYLES.none;
  const prompt = pre + text + post, enhance = M.enh && el('aigEnh').checked;
  if (src) { try { await refFromImage(src, w, h) } catch (e) { toast(T('aig.imgError', { error: String((e && e.message) || e) })); return { error: 'image: ' + String((e && e.message) || e) } } }
  const n = Math.ceil(secs / M.seg), seed = Math.max(0, Math.floor(+val('aigSeed') || 0));
  cancelled = false;
  setBusy(true); el('aigBar').style.width = '0';
  let prev = null, out = { ok: true, media: [] };
  try {
    for (let k = 0; k < n; k++) {
      const s = Math.min(M.seg, secs - k * M.seg);
      part = { k, n };
      segInfo = n > 1 ? T('aig.part', { n: k + 1, total: n }) + ' · ' : '';
      steps = { n: 0, total: 0 };
      say(T('aig.loading'));
      if (k > 0) await refFromVideoEnd(FS.fileUrl(prev), w, h);
      const name = 'IA - ' + text.slice(0, 40) + (n > 1 ? ' - ' + (k + 1) : '');
      const r = await AI.generate({
        prompt, negative: val('aigNeg').trim(), width: w, height: h, frames: Math.round(s * M.fps) + 1, fps: M.fps,
        steps: M.steps(q), seed: seed + k, cfg: M.cfg, model, image: !!src || k > 0, enhance, name
      });
      let path = r.path, fps = r.fps;
      if (!path) {
        const blob = await encodeFrames(r, x => { bar(.94 + .06 * x); say(T('aig.stEncode', { pct: pct(x) })) });
        AI.clearFrames().catch(() => { });
        path = (await FS.saveMedia(blob, name + '.mp4')).path;
      }
      const mid = await addToProject(path, k, fps); if (mid) out.media.push(mid);
      prev = path;
    }
    bar(1);
    toast(T('aig.done'));
  } catch (e) {
    if (String(e) === 'annulé' || String(e && e.message) === 'annulé' || cancelled) { toast(T('aig.cancelled')); out = { error: 'cancelled' } }
    else { toast(T('aig.error', { error: String((e && e.message) || e) })); out = { error: String((e && e.message) || e) } }
  }
  setBusy(false); refresh();
  return out;
}
window.dedcutGen = {
  styles: Object.keys(STYLES), formats: ['landscape', 'portrait', 'square'],
  busy: () => busy,
  cancel: () => { if (busy) { cancelled = true; AI.cancel() } },
  async run(o) {
    if (!AI) return { error: 'only in the installed app' };
    if (!hw) { try { hw = await AI.hardware() } catch (e) { hw = { ok: true } } }
    if (hw.unsupported) return { error: 'AI video is only available in the Windows version of DedCut for now.' };
    if (!hw.ok) return { error: 'AI video is blocked: this PC is not powerful enough (' + hw.gpu + ', ' + hw.vram_gb + ' GB video memory, ' + hw.ram_gb + ' GB RAM; needs ' + hw.min_vram_gb + ' GB video memory on a recent graphics card: NVIDIA RTX 2000+, AMD RX 6000+ or Intel Arc, and ' + hw.min_ram_gb + ' GB RAM). Tell the user simply.' };
    showTab('gen');
    try { st = await AI.status() } catch (e) { return { error: String(e) } }
    if (!(info() || {}).ready) return { error: 'The video generator model is not installed. Ask the user to open the "AI video" tab and click Download (several GB, one time).' };
    el('aigPrompt').value = String(o.prompt || '').slice(0, 1500);
    if (o.image_media_id != null) { const m = mById(+o.image_media_id); if (!m || m.type !== 'image') return { error: 'image_media_id must be an image from get_project' }; imgId = m.id } else imgId = null;
    if (STYLES[o.style]) style = o.style;
    if (['landscape', 'portrait', 'square'].includes(o.format)) fmt = o.format;
    const M = cur(); if (o.seconds) secs = M.durs.reduce((a, b) => Math.abs(b - o.seconds) < Math.abs(a - o.seconds) ? b : a);
    fillOptions(); sync();
    return generate();
  }
};

const _showTab = showTab; showTab = function (t) { _showTab(t); if (t === 'gen') refresh() };
window.addEventListener('dedcut-lang', () => { fillOptions(); refresh() });
fillOptions();
refresh();
})();

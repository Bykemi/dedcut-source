//! Espace Musique : fichiers des projets (.dcmus), sons du projet, exports, sauvegardes automatiques et prises en cours.
//! Écriture seulement vers un fichier ou un dossier choisi par l'utilisateur, le dossier « Sons » d'un projet choisi,
//! ou le dossier Vidéos\DedCut\Musique. Toute écriture passe par un fichier temporaire : disque plein ou coupure = l'ancien fichier reste.
//! Les prises en cours d'enregistrement sont écrites au fil de l'eau sur le disque : après un plantage, elles sont récupérables.

use std::collections::{HashMap, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::ipc::Request;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::{allow, err, header, info, raw_body, urlencoding_decode, videos_dir, FileInfo};

/// fichiers choisis (écriture), dossiers choisis (écriture), fichiers ouverts (lecture / copie), prises en cours
#[derive(Default)]
pub struct MusPaths {
    files: Mutex<HashSet<String>>,
    dirs: Mutex<HashSet<String>>,
    read: Mutex<HashSet<String>>,
    rec: Mutex<HashMap<String, (File, u64)>>,
}
fn key(p: &str) -> String { p.replace('/', "\\").to_lowercase() }
const WRITE_EXT: &[&str] = &["dcmus", "wav", "flac", "aif", "aiff", "m4a", "mp3", "ogg", "opus", "mid", "midi", "json", "dcpreset", "dcmuschain", "zip", "txt", "xml", "musicxml", "csv"];
fn ext_of(p: &str) -> String { PathBuf::from(p).extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default() }
fn clean(name: &str, fallback: &str) -> String {
    let s: String = name.chars().filter(|c| !"\\/:*?\"<>|".contains(*c) && !c.is_control()).take(120).collect();
    if s.trim().is_empty() { fallback.into() } else { s.trim().to_string() }
}
/// Vidéos\DedCut\Musique (créé si besoin)
fn mus_root(app: &AppHandle) -> Result<PathBuf, String> {
    let d = videos_dir(app)?.join("Musique");
    fs::create_dir_all(&d).map_err(err)?;
    Ok(d)
}
fn inside(p: &Path, dir: &Path) -> bool {
    let (a, b) = (key(&p.to_string_lossy()), key(&dir.to_string_lossy()));
    a.starts_with(&(b.trim_end_matches('\\').to_string() + "\\"))
}
/// a-t-on le droit d'écrire ici ?
fn can_write(app: &AppHandle, ok: &MusPaths, path: &str) -> bool {
    if path.contains("..") || !WRITE_EXT.contains(&ext_of(path).as_str()) { return false; }
    let k = key(path);
    if ok.files.lock().unwrap().contains(&k) { return true; }
    let p = PathBuf::from(path);
    // dossier choisi (exports par lots, stems) : directement dedans ou un sous-dossier
    if ok.dirs.lock().unwrap().iter().any(|d| inside(&p, Path::new(d))) { return true; }
    // dossier « <projet> - Sons » à côté d'un projet choisi
    if let Some(parent) = p.parent() {
        let pk = key(&parent.to_string_lossy());
        if let Some(stem) = pk.strip_suffix(" - sons") { if ok.files.lock().unwrap().contains(&format!("{stem}.dcmus")) { return true; } }
    }
    mus_root(app).map(|r| inside(&p, &r)).unwrap_or(false)
}
fn write_atomic(path: &Path, body: &[u8]) -> Result<(), String> {
    if let Some(d) = path.parent() { fs::create_dir_all(d).map_err(err)?; }
    let tmp = PathBuf::from(format!("{}.dctmp", path.to_string_lossy()));
    let res = (|| -> std::io::Result<()> {
        let mut f = File::create(&tmp)?;
        f.write_all(body)?;
        f.sync_all()?;
        drop(f);
        fs::rename(&tmp, path)
    })();
    if let Err(e) = res { let _ = fs::remove_file(&tmp); return Err(err(e)); }
    Ok(())
}

/// Fenêtre « Ouvrir » ; les fichiers choisis peuvent être lus (et réécrits pour un projet .dcmus)
#[tauri::command]
pub async fn mus_open(app: AppHandle, ok: State<'_, MusPaths>, label: String, exts: Vec<String>, multi: bool) -> Result<Vec<FileInfo>, String> {
    let e: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
    let mut d = app.dialog().file().add_filter(&label, &e);
    if let Ok(r) = mus_root(&app) { d = d.set_directory(r); }
    let list = if multi { d.blocking_pick_files().unwrap_or_default() } else { d.blocking_pick_file().into_iter().collect() };
    let mut out = vec![];
    for f in list {
        let p = f.into_path().map_err(err)?;
        let s = p.to_string_lossy().into_owned();
        allow(&app, &p);
        ok.read.lock().unwrap().insert(key(&s));
        if ext_of(&s) == "dcmus" {
            ok.files.lock().unwrap().insert(key(&s));
            // les sons du projet sont à côté : on autorise leur lecture
            let sons = PathBuf::from(format!("{} - Sons", s.trim_end_matches(".dcmus").trim_end_matches(".DCMUS")));
            if let Ok(rd) = fs::read_dir(&sons) { for x in rd.flatten() { allow(&app, &x.path()); ok.read.lock().unwrap().insert(key(&x.path().to_string_lossy())); } }
        }
        out.push(info(&p));
    }
    Ok(out)
}

/// Autorise la lecture des sons d'un projet rouvert (chemins enregistrés dans le projet, s'ils existent encore).
/// Seulement des fichiers son : un projet reçu d'un inconnu ne peut pas faire lire autre chose.
const READ_EXT: &[&str] = &["wav", "flac", "aif", "aiff", "mp3", "ogg", "oga", "opus", "m4a", "aac", "webm", "wma"];
#[tauri::command]
pub fn mus_allow(app: AppHandle, ok: State<'_, MusPaths>, project: String, paths: Vec<String>) -> Vec<FileInfo> {
    if !ok.files.lock().unwrap().contains(&key(&project)) { return vec![]; }
    paths.iter().map(|s| { let p = PathBuf::from(s); if READ_EXT.contains(&ext_of(s).as_str()) && p.is_file() { allow(&app, &p); ok.read.lock().unwrap().insert(key(s)); } info(&p) }).collect()
}

/// Fenêtre « Enregistrer sous »
#[tauri::command]
pub async fn mus_save_dialog(app: AppHandle, ok: State<'_, MusPaths>, name: String, label: String, ext: String) -> Result<Option<String>, String> {
    let ext = ext.to_lowercase();
    if !WRITE_EXT.contains(&ext.as_str()) { return Err("extension refusée".into()); }
    let mut name = clean(&name, "musique");
    if ext_of(&name) != ext { name = format!("{name}.{ext}"); }
    let mut d = app.dialog().file().set_file_name(&name).add_filter(&label, &[ext.as_str()]);
    if let Ok(r) = mus_root(&app) { d = d.set_directory(r); }
    let Some(f) = d.blocking_save_file() else { return Ok(None) };
    let mut p = f.into_path().map_err(err)?;
    if p.extension().map(|e| e.to_string_lossy().to_lowercase()) != Some(ext.clone()) { p.set_extension(&ext); }
    let s = p.to_string_lossy().into_owned();
    ok.files.lock().unwrap().insert(key(&s));
    Ok(Some(s))
}

/// Dossier choisi (exports de stems, traitement par lots, archive)
#[tauri::command]
pub async fn mus_pick_dir(app: AppHandle, ok: State<'_, MusPaths>, title: String) -> Result<Option<String>, String> {
    let mut d = app.dialog().file().set_title(&title);
    if let Ok(r) = mus_root(&app) { d = d.set_directory(r); }
    let Some(x) = d.blocking_pick_folder() else { return Ok(None) };
    let s = x.into_path().map_err(err)?.to_string_lossy().into_owned();
    ok.dirs.lock().unwrap().insert(key(&s));
    Ok(Some(s))
}

/// Écrit un fichier en entier (sûr)
#[tauri::command]
pub fn mus_write(app: AppHandle, ok: State<'_, MusPaths>, request: Request<'_>) -> Result<FileInfo, String> {
    let path = urlencoding_decode(&header(&request, "path"));
    if !can_write(&app, &ok, &path) { return Err("emplacement non choisi par l'utilisateur".into()); }
    write_atomic(Path::new(&path), raw_body(&request)?)?;
    let p = PathBuf::from(&path);
    allow(&app, &p);
    ok.read.lock().unwrap().insert(key(&path));
    Ok(info(&p))
}

/// Copie un son déjà ouvert vers un emplacement permis (rassembler les fichiers dans le projet)
#[tauri::command]
pub fn mus_copy(app: AppHandle, ok: State<'_, MusPaths>, src: String, dst: String) -> Result<FileInfo, String> {
    let root = mus_root(&app)?;
    if !(ok.read.lock().unwrap().contains(&key(&src)) || inside(Path::new(&src), &root)) { return Err("fichier source non ouvert".into()); }
    if !can_write(&app, &ok, &dst) { return Err("emplacement non choisi par l'utilisateur".into()); }
    if key(&src) == key(&dst) { return Ok(info(Path::new(&dst))); }
    let body = fs::read(&src).map_err(err)?;
    write_atomic(Path::new(&dst), &body)?;
    let p = PathBuf::from(&dst);
    allow(&app, &p);
    ok.read.lock().unwrap().insert(key(&dst));
    Ok(info(&p))
}

/// Dossier Vidéos\DedCut\Musique et place libre sur ce disque
#[derive(Serialize)]
pub struct MusDir { path: String, free: u64 }
#[tauri::command]
pub fn mus_dir(app: AppHandle) -> Result<MusDir, String> {
    let r = mus_root(&app)?;
    Ok(MusDir { free: free_space(&r), path: r.to_string_lossy().into_owned() })
}
/// Place libre (octets) sur le disque d'un dossier ; 0 si inconnue
#[tauri::command]
pub fn mus_free(path: String) -> u64 { free_space(Path::new(&path)) }
#[cfg(windows)]
fn free_space(p: &Path) -> u64 {
    use std::os::windows::ffi::OsStrExt;
    let mut dir = p.to_path_buf();
    while !dir.exists() { if !dir.pop() { return 0; } }
    let w: Vec<u16> = dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let mut free: u64 = 0;
    // SAFETY : chaîne terminée par zéro, pointeurs valides pendant l'appel
    let ok = unsafe { windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW(w.as_ptr(), &mut free, std::ptr::null_mut(), std::ptr::null_mut()) };
    if ok == 0 { 0 } else { free }
}
#[cfg(not(windows))]
fn free_space(_p: &Path) -> u64 { 0 }

/* ---------- sauvegarde automatique (récupération après plantage) ---------- */
fn auto_dir(app: &AppHandle) -> Result<PathBuf, String> { let d = mus_root(app)?.join(".sauvegardes-auto"); fs::create_dir_all(&d).map_err(err)?; Ok(d) }
fn safe_id(id: &str) -> String { id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').take(40).collect() }
#[tauri::command]
pub fn mus_autosave(app: AppHandle, id: String, text: String) -> Result<(), String> {
    let id = safe_id(&id); if id.is_empty() { return Err("identifiant".into()); }
    write_atomic(&auto_dir(&app)?.join(format!("{id}.dcmus")), text.as_bytes())
}
#[derive(Serialize)]
pub struct AutoSave { id: String, time: u64, size: u64 }
#[tauri::command]
pub fn mus_autosaves(app: AppHandle) -> Result<Vec<AutoSave>, String> {
    let mut out = vec![];
    for x in fs::read_dir(auto_dir(&app)?).map_err(err)?.flatten() {
        let p = x.path(); if ext_of(&p.to_string_lossy()) != "dcmus" { continue; }
        let m = x.metadata().map_err(err)?;
        let time = m.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64).unwrap_or(0);
        out.push(AutoSave { id: p.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default(), time, size: m.len() });
    }
    Ok(out)
}
#[tauri::command]
pub fn mus_autosave_read(app: AppHandle, id: String) -> Result<String, String> { fs::read_to_string(auto_dir(&app)?.join(format!("{}.dcmus", safe_id(&id)))).map_err(err) }
#[tauri::command]
pub fn mus_autosave_del(app: AppHandle, id: String) -> Result<(), String> { let _ = fs::remove_file(auto_dir(&app)?.join(format!("{}.dcmus", safe_id(&id)))); Ok(()) }

/* ---------- prises en cours : écrites au fil de l'eau (échantillons 32 bits entrelacés) ---------- */
fn rec_dir(app: &AppHandle) -> Result<PathBuf, String> { let d = mus_root(app)?.join(".prises-en-cours"); fs::create_dir_all(&d).map_err(err)?; Ok(d) }
/// ouvre une prise : meta = JSON (fréquence, canaux, projet, piste, position) gardé à côté pour la récupération
#[tauri::command]
pub fn mus_rec_open(app: AppHandle, ok: State<'_, MusPaths>, id: String, meta: String) -> Result<u64, String> {
    let id = safe_id(&id); let d = rec_dir(&app)?;
    write_atomic(&d.join(format!("{id}.json")), meta.as_bytes())?;
    let f = OpenOptions::new().create(true).append(true).open(d.join(format!("{id}.f32"))).map_err(err)?;
    ok.rec.lock().unwrap().insert(id, (f, 0));
    Ok(free_space(&d))
}
/// ajoute un morceau ; en cas d'erreur (disque plein), la page garde le son en mémoire et prévient
#[tauri::command]
pub fn mus_rec_append(ok: State<'_, MusPaths>, request: Request<'_>) -> Result<u64, String> {
    let id = safe_id(&header(&request, "id"));
    let body = raw_body(&request)?;
    let mut map = ok.rec.lock().unwrap();
    let (f, n) = map.get_mut(&id).ok_or("aucune prise en cours")?;
    f.write_all(body).map_err(err)?;
    *n += body.len() as u64;
    if *n % (1 << 20) < body.len() as u64 { f.sync_data().map_err(err)?; }
    Ok(*n)
}
#[tauri::command]
pub fn mus_rec_close(ok: State<'_, MusPaths>, id: String) -> Result<(), String> {
    if let Some((f, _)) = ok.rec.lock().unwrap().remove(&safe_id(&id)) { f.sync_all().map_err(err)?; }
    Ok(())
}
/// prises restées sur le disque (plantage pendant l'enregistrement) : chemin du son brut (lisible par la page) et ses infos
#[derive(Serialize)]
pub struct Orphan { id: String, path: String, meta: String, size: u64 }
#[tauri::command]
pub fn mus_rec_orphans(app: AppHandle, ok: State<'_, MusPaths>) -> Result<Vec<Orphan>, String> {
    let d = rec_dir(&app)?; let open = ok.rec.lock().unwrap(); let mut out = vec![];
    for x in fs::read_dir(&d).map_err(err)?.flatten() {
        let p = x.path(); if ext_of(&p.to_string_lossy()) != "f32" { continue; }
        let id = p.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
        if open.contains_key(&id) { continue; }
        let meta = fs::read_to_string(d.join(format!("{id}.json"))).unwrap_or_default();
        allow(&app, &p);
        out.push(Orphan { size: x.metadata().map(|m| m.len()).unwrap_or(0), path: p.to_string_lossy().into_owned(), id, meta });
    }
    Ok(out)
}
#[tauri::command]
pub fn mus_rec_drop(app: AppHandle, id: String) -> Result<(), String> {
    let id = safe_id(&id); let d = rec_dir(&app)?;
    let _ = fs::remove_file(d.join(format!("{id}.f32"))); let _ = fs::remove_file(d.join(format!("{id}.json"))); Ok(())
}

/* ---------- extensions audio (VST3 / CLAP) : inventaire seulement ----------
   DedCut ne charge PAS ces extensions : leur son passerait par un moteur natif que l'espace Musique n'a pas (son moteur est celui de la page).
   L'inventaire lit seulement les dossiers standard et le fichier moduleinfo.json des VST3 (aucun code de l'extension n'est exécuté). */
#[derive(Serialize)]
pub struct PluginInfo { format: String, name: String, vendor: String, version: String, path: String, x64: bool, size: u64, modified: u64, category: String }
fn dir_size(p: &Path, depth: u32) -> u64 {
    if p.is_file() { return p.metadata().map(|m| m.len()).unwrap_or(0); }
    if depth == 0 { return 0; }
    fs::read_dir(p).map(|rd| rd.flatten().map(|x| dir_size(&x.path(), depth - 1)).sum()).unwrap_or(0)
}
fn scan_dir(dir: &Path, depth: u32, out: &mut Vec<PluginInfo>) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for x in rd.flatten() {
        let p = x.path(); let e = ext_of(&p.to_string_lossy());
        if e == "vst3" || e == "clap" {
            let name = p.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
            let modified = x.metadata().ok().and_then(|m| m.modified().ok()).and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
            let mut pi = PluginInfo { format: e.to_uppercase(), name: name.clone(), vendor: String::new(), version: String::new(), path: p.to_string_lossy().into_owned(), x64: e == "clap", size: dir_size(&p, 6), modified, category: String::new() };
            if p.is_dir() {
                pi.x64 = p.join("Contents").join("x86_64-win").exists();
                if let Ok(t) = fs::read_to_string(p.join("Contents").join("Resources").join("moduleinfo.json")) {
                    // moduleinfo.json est du JSON5 (virgules finales) : lecture tolérante des champs utiles
                    let field = |k: &str| -> String { t.find(&format!("\"{k}\"")).and_then(|i| { let r = &t[i + k.len() + 2..]; let a = r.find('"')? + 1; let b = r[a..].find('"')?; Some(r[a..a + b].to_string()) }).unwrap_or_default() };
                    let n = field("Name"); if !n.is_empty() { pi.name = n; }
                    pi.version = field("Version"); pi.vendor = field("Vendor"); pi.category = field("Sub Categories");
                }
            }
            out.push(pi);
        } else if p.is_dir() && depth > 0 { scan_dir(&p, depth - 1, out); }
    }
}
#[tauri::command]
pub async fn mus_plugins() -> Result<Vec<PluginInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut dirs: Vec<PathBuf> = vec![];
        for v in ["CommonProgramFiles", "CommonProgramW6432"] { if let Ok(c) = std::env::var(v) { dirs.push(PathBuf::from(&c).join("VST3")); dirs.push(PathBuf::from(&c).join("CLAP")); } }
        if let Ok(l) = std::env::var("LOCALAPPDATA") { dirs.push(PathBuf::from(&l).join("Programs").join("Common").join("VST3")); dirs.push(PathBuf::from(&l).join("Programs").join("Common").join("CLAP")); }
        let mut seen = HashSet::new(); let mut out = vec![];
        for d in dirs { if seen.insert(key(&d.to_string_lossy())) { scan_dir(&d, 3, &mut out); } }
        let mut uniq = HashSet::new(); out.retain(|p| uniq.insert(key(&p.path)));
        out
    }).await.map_err(err)
}

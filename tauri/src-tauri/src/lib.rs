// DedCut (fait par ByKemi) — partie Windows du logiciel, avec Tauri.
// Le moteur de l'éditeur tourne dans la page ; ici on gère ce que la page ne peut pas faire seule :
// écrire les enregistrements et les gros exports, la fenêtre « Enregistrer sous », ouvrir les .dedcut.
mod ai;
mod remote;
mod secret;
mod image;
mod musicfs;
mod brain;
mod music;
mod live;
mod tts;
mod mcp;
mod chat;
mod capture;

use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[derive(Default)]
struct Files {
    rec: Mutex<HashMap<String, (PathBuf, File)>>, // enregistrements en cours : "scr" (écran), "cam" (facecam)
    out: Mutex<Option<(PathBuf, File)>>,          // gros export écrit directement sur le disque
    initial: Mutex<Option<String>>,               // projet .dedcut passé au lancement
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Dossier Vidéos\DedCut (créé si besoin)
fn videos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    // Android n'a pas de dossier Vidéos accessible : dossier des données de l'appli
    let d = app.path().video_dir().or_else(|_| app.path().app_local_data_dir()).map_err(err)?.join("DedCut");
    fs::create_dir_all(&d).map_err(err)?;
    Ok(d)
}

/// Nom de fichier sans dossier ni caractère interdit par Windows
fn clean_name(name: &str, fallback: &str) -> String {
    let base = Path::new(name).file_name().and_then(|s| s.to_str()).unwrap_or(fallback);
    let s: String = base.chars().map(|c| if "\\/:*?\"<>|".contains(c) || c.is_control() { '_' } else { c }).collect();
    if s.trim().is_empty() { fallback.to_string() } else { s }
}

fn header(req: &Request<'_>, key: &str) -> String {
    req.headers().get(key).and_then(|v| v.to_str().ok()).unwrap_or("").to_string()
}

fn raw_body<'a>(req: &'a Request<'_>) -> Result<&'a [u8], String> {
    match req.body() {
        InvokeBody::Raw(b) => Ok(b),
        _ => Err("données manquantes".into()),
    }
}

fn first_project(args: &[String]) -> Option<String> {
    args.iter().skip(1).find(|a| a.to_lowercase().ends_with(".dedcut")).cloned()
}

/* ---------- enregistrement d'écran : écrit au fur et à mesure dans Vidéos\DedCut ---------- */

#[tauri::command]
fn rec_start(app: AppHandle, files: State<Files>, ch: String, name: String, dir: Option<String>) -> Result<String, String> {
    // dossier choisi dans les réglages du studio (s'il existe encore), sinon le dossier Vidéos/DedCut
    let base = match dir.filter(|d| !d.is_empty()).map(PathBuf::from) { Some(d) if d.is_dir() => d, _ => videos_dir(&app)? };
    let p = base.join(clean_name(&name, "Enregistrement.mp4"));
    // seulement des fichiers vidéo ou son (jamais un programme ou un script, même si la page était détournée)
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
    if !["mp4", "webm", "m4a", "weba", "mkv", "mov", "wav", "ogg"].contains(&ext.as_str()) { return Err("extension refusée".into()); }
    let f = File::create(&p).map_err(err)?;
    files.rec.lock().unwrap().insert(ch, (p.clone(), f));
    Ok(p.to_string_lossy().into_owned())
}

#[tauri::command]
fn rec_chunk(files: State<Files>, request: Request<'_>) -> Result<(), String> {
    let ch = header(&request, "ch");
    let data = raw_body(&request)?;
    let mut map = files.rec.lock().unwrap();
    let (_, f) = map.get_mut(match ch.as_str() { "cam" => "cam", "mic" => "mic", "tdesk" => "tdesk", "tmic" => "tmic", "tmusic" => "tmusic", _ => "scr" }).ok_or("aucun enregistrement en cours")?;
    f.write_all(data).map_err(err)
}

#[tauri::command]
fn rec_end(app: AppHandle, files: State<Files>, ch: String) -> Result<String, String> {
    let (p, mut f) = files.rec.lock().unwrap().remove(&ch).ok_or("aucun enregistrement en cours")?;
    f.flush().map_err(err)?;
    allow(&app, &p);
    Ok(p.to_string_lossy().into_owned())
}

/* ---------- gros exports (4K, longues vidéos) : Vidéos\DedCut\Exports ---------- */

#[tauri::command]
fn out_start(app: AppHandle, files: State<Files>, name: String) -> Result<String, String> {
    let d = videos_dir(&app)?.join("Exports");
    fs::create_dir_all(&d).map_err(err)?;
    let p = d.join(clean_name(&name, "video.mp4"));
    let f = File::create(&p).map_err(err)?;
    *files.out.lock().unwrap() = Some((p.clone(), f));
    Ok(p.to_string_lossy().into_owned())
}

#[tauri::command]
fn out_write(files: State<Files>, request: Request<'_>) -> Result<(), String> {
    let pos: u64 = header(&request, "pos").parse().unwrap_or(0);
    let data = raw_body(&request)?;
    let mut out = files.out.lock().unwrap();
    let (_, f) = out.as_mut().ok_or("aucun export en cours")?;
    f.seek(SeekFrom::Start(pos)).map_err(err)?;
    f.write_all(data).map_err(err)
}

#[tauri::command]
fn out_end(files: State<Files>) -> Result<String, String> {
    let (p, mut f) = files.out.lock().unwrap().take().ok_or("aucun export en cours")?;
    f.flush().map_err(err)?;
    Ok(p.to_string_lossy().into_owned())
}

/* ---------- fichiers ---------- */

/// Lit un projet .dedcut (uniquement cette extension)
#[tauri::command]
fn read_project(path: String) -> Result<Response, String> {
    if !path.to_lowercase().ends_with(".dedcut") {
        return Err("seuls les fichiers .dedcut peuvent être ouverts ici".into());
    }
    Ok(Response::new(fs::read(&path).map_err(err)?))
}

/// Fenêtre « Enregistrer sous » de Windows, puis écriture du fichier choisi par l'utilisateur
#[tauri::command]
async fn save_as(app: AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let name = header(&request, "name");
    let name = urlencoding_decode(&name);
    let name = clean_name(&name, "dedcut");
    let ext = Path::new(&name).extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mut dialog = app.dialog().file().set_file_name(&name);
    if !ext.is_empty() {
        let label = match ext.as_str() { "mp4" | "webm" => "Vidéo", "dedcut" => "Projet DedCut", "png" => "Image", "wav" | "webm-audio" => "Son", _ => "Fichier" };
        dialog = dialog.add_filter(label, &[ext.as_str()]);
    }
    let Some(chosen) = dialog.blocking_save_file() else { return Ok(None) };
    let path = chosen.into_path().map_err(err)?;
    fs::write(&path, raw_body(&request)?).map_err(err)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Décodage simple des noms passés dans l'en-tête (encodeURIComponent côté page)
fn urlencoding_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) { out.push(v); i += 3; continue; }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[tauri::command]
fn open_folder(app: AppHandle, kind: String) -> Result<(), String> {
    let mut d = videos_dir(&app)?;
    if kind == "exports" { d = d.join("Exports"); fs::create_dir_all(&d).map_err(err)?; }
    app.opener().open_path(d.to_string_lossy(), None::<&str>).map_err(err)
}

/// Montre un fichier exporté dans l'explorateur (seulement dans Vidéos\DedCut)
#[tauri::command]
fn reveal(app: AppHandle, path: String) -> Result<(), String> {
    let base = videos_dir(&app)?;
    let p = PathBuf::from(&path);
    if !p.starts_with(&base) { return Err("chemin refusé".into()); }
    #[cfg(desktop)]
    return app.opener().reveal_item_in_dir(p).map_err(err);
    #[cfg(mobile)]
    return Err("unsupported".into());
}

/// Ouvre le fichier des licences tierces livré avec le logiciel
#[tauri::command]
fn open_licences(app: AppHandle) -> Result<(), String> {
    let p = app.path().resource_dir().map_err(err)?.join("LICENCES-TIERS.txt");
    app.opener().open_path(p.to_string_lossy(), None::<&str>).map_err(err)
}

/* ---------- médias par chemin (le projet ne copie plus les fichiers) ---------- */

#[derive(serde::Serialize)]
struct FileInfo {
    path: String,
    name: String,
    size: u64,
    exists: bool,
}

const MEDIA_EXT: &[&str] = &[
    "mp4", "mov", "m4v", "mkv", "webm", "avi", "wmv", "mpg", "mpeg", "3gp", "ts",
    "mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "wma", "weba",
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "avif",
];

fn info(p: &Path) -> FileInfo {
    let meta = fs::metadata(p).ok().filter(|m| m.is_file());
    FileInfo {
        path: p.to_string_lossy().into_owned(),
        name: p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
        size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
        exists: meta.is_some(),
    }
}

/// Autorise la page à lire ce fichier (protocole asset) : uniquement des fichiers choisis par l'utilisateur
fn allow(app: &AppHandle, p: &Path) {
    let _ = app.asset_protocol_scope().allow_file(p);
}

/// Fenêtre « Ouvrir » pour importer des médias (plusieurs à la fois)
#[tauri::command]
async fn pick_media(app: AppHandle, label: String) -> Result<Vec<FileInfo>, String> {
    let Some(list) = app.dialog().file().add_filter(&label, MEDIA_EXT).blocking_pick_files() else { return Ok(vec![]) };
    let mut out = vec![];
    for f in list {
        let p = f.into_path().map_err(err)?;
        allow(&app, &p);
        out.push(info(&p));
    }
    Ok(out)
}

/// Vérifie une liste de chemins (projet ouvert, sauvegarde auto, glisser-déposer) et autorise ceux qui existent
#[tauri::command]
fn allow_paths(app: AppHandle, paths: Vec<String>) -> Vec<FileInfo> {
    paths.iter().map(|s| {
        let p = PathBuf::from(s);
        let i = info(&p);
        if i.exists { allow(&app, &p); }
        FileInfo { path: s.clone(), ..i }
    }).collect()
}

/// Enregistre un média créé par DedCut (son, arrêt sur image, logo, voix off) dans Vidéos\DedCut\Médias
#[tauri::command]
fn save_media(app: AppHandle, request: Request<'_>) -> Result<FileInfo, String> {
    let name = clean_name(&urlencoding_decode(&header(&request, "name")), "media.bin");
    let dir = videos_dir(&app)?.join("Médias");
    fs::create_dir_all(&dir).map_err(err)?;
    let (stem, ext) = match name.rsplit_once('.') { Some((s, e)) => (s.to_string(), format!(".{e}")), None => (name.clone(), String::new()) };
    let mut p = dir.join(&name);
    let mut n = 2;
    while p.exists() { p = dir.join(format!("{stem} ({n}){ext}")); n += 1; }
    fs::write(&p, raw_body(&request)?).map_err(err)?;
    allow(&app, &p);
    Ok(info(&p))
}

/// Fenêtre « Enregistrer sous » pour un projet (.dedcut imposé)
#[tauri::command]
async fn choose_save(app: AppHandle, name: String, label: String) -> Result<Option<String>, String> {
    let mut name = clean_name(&name, "projet.dedcut");
    if !name.to_lowercase().ends_with(".dedcut") { name.push_str(".dedcut"); }
    let Some(f) = app.dialog().file().set_file_name(&name).add_filter(&label, &["dedcut"]).blocking_save_file() else { return Ok(None) };
    let mut p = f.into_path().map_err(err)?;
    if p.extension().map(|e| e.to_string_lossy().to_lowercase()) != Some("dedcut".into()) { p.set_extension("dedcut"); }
    Ok(Some(p.to_string_lossy().into_owned()))
}

/// Écrit un projet : uniquement un fichier .dedcut
#[tauri::command]
fn write_project(request: Request<'_>) -> Result<(), String> {
    let path = urlencoding_decode(&header(&request, "path"));
    if !path.to_lowercase().ends_with(".dedcut") { return Err("extension refusée".into()); }
    // écriture sûre : fichier temporaire puis remplacement (pas de projet à moitié écrit en cas de coupure)
    let tmp = format!("{path}.tmp");
    fs::write(&tmp, raw_body(&request)?).map_err(err)?;
    fs::rename(&tmp, &path).map_err(err)
}

/// Fenêtre « Ouvrir » pour un projet .dedcut
#[tauri::command]
async fn open_project_dialog(app: AppHandle, label: String) -> Option<String> {
    let f = app.dialog().file().add_filter(&label, &["dedcut"]).blocking_pick_file()?;
    f.into_path().ok().map(|p| p.to_string_lossy().into_owned())
}

/// Choisir un dossier (dossier des enregistrements du studio)
#[tauri::command]
async fn pick_folder(app: AppHandle, title: String) -> Option<String> {
    let d = app.dialog().file().set_title(&title).blocking_pick_folder()?;
    d.into_path().ok().map(|p| p.to_string_lossy().into_owned())
}

/// Relier un fichier introuvable : l'utilisateur montre où il est maintenant
#[tauri::command]
async fn pick_one(app: AppHandle, title: String, label: String) -> Result<Option<FileInfo>, String> {
    let Some(f) = app.dialog().file().title_desktop(&title).add_filter(&label, MEDIA_EXT).blocking_pick_file() else { return Ok(None) };
    let p = f.into_path().map_err(err)?;
    allow(&app, &p);
    Ok(Some(info(&p)))
}

/// Cherche des fichiers par leur nom dans un dossier (et ses sous-dossiers directs) pour les relier d'un coup
#[tauri::command]
fn find_in_dir(app: AppHandle, dir: String, names: Vec<String>) -> Vec<Option<String>> {
    let mut found: HashMap<String, PathBuf> = HashMap::new();
    let mut scan = |d: &Path| {
        if let Ok(rd) = fs::read_dir(d) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_file() { if let Some(n) = p.file_name() { found.entry(n.to_string_lossy().to_lowercase()).or_insert(p); } }
            }
        }
    };
    let base = PathBuf::from(&dir);
    scan(&base);
    if let Ok(rd) = fs::read_dir(&base) { for e in rd.flatten() { if e.path().is_dir() { scan(&e.path()); } } }
    names.iter().map(|n| found.get(&n.to_lowercase()).map(|p| { allow(&app, p); p.to_string_lossy().into_owned() })).collect()
}

/// Ouvre un lien officiel (dons, site, Gmail / Outlook pour signaler un bug) dans le navigateur : https uniquement,
/// sauf l'e-mail de rapport de bug (messagerie de l'utilisateur, v4.67) : « mailto:bugs@dedcut.com?… » et rien d'autre
#[tauri::command]
fn open_link(app: AppHandle, url: String) -> Result<(), String> {
    let bug_mail = url.starts_with("mailto:bugs@dedcut.com?") || url == "mailto:bugs@dedcut.com";
    if !url.starts_with("https://") && !bug_mail { return Err("lien refusé".into()); }
    app.opener().open_url(url, None::<&str>).map_err(err)
}

/// Met un fichier projet (.dedcut) à la corbeille de Windows (récupérable). Les vidéos et images ne sont pas touchées.
#[tauri::command]
async fn trash_project(path: String) -> Result<(), String> {
    let p = std::path::PathBuf::from(&path);
    if !p.extension().map(|e| e.eq_ignore_ascii_case("dedcut")).unwrap_or(false) { return Err("not a project".into()); }
    if !p.is_file() { return Err("file not found".into()); }
    if !cfg!(windows) { return tauri::async_runtime::spawn_blocking(move || to_trash(&p)).await.map_err(err)?; }
    tauri::async_runtime::spawn_blocking(move || {
        let out = tts::powershell().env("DC_FILE", &p)
            .arg("Add-Type -AssemblyName Microsoft.VisualBasic;[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($env:DC_FILE,'OnlyErrorDialogs','SendToRecycleBin')")
            .output().map_err(err)?;
        if !out.status.success() || p.exists() { return Err(String::from_utf8_lossy(&out.stderr).trim().chars().take(300).collect()); }
        Ok(())
    }).await.map_err(err)?
}

/// Corbeille de macOS (~/.Trash) ou de Linux (~/.local/share/Trash/files) : le fichier y est déplacé, il reste récupérable
fn to_trash(p: &Path) -> Result<(), String> {
    let home = PathBuf::from(std::env::var("HOME").map_err(err)?);
    let dir = if cfg!(target_os = "macos") { home.join(".Trash") } else { home.join(".local/share/Trash/files") };
    fs::create_dir_all(&dir).map_err(err)?;
    let name = p.file_name().ok_or("name")?.to_string_lossy().into_owned();
    let (stem, ext) = match name.rsplit_once('.') { Some((a, b)) => (a.to_string(), format!(".{b}")), None => (name.clone(), String::new()) };
    let mut dest = dir.join(&name);
    let mut n = 2;
    while dest.exists() { dest = dir.join(format!("{stem} {n}{ext}")); n += 1; }
    if fs::rename(p, &dest).is_err() { fs::copy(p, &dest).map_err(err)?; fs::remove_file(p).map_err(err)?; }
    Ok(())
}

/// Titre des fenêtres « Ouvrir / Enregistrer » (n'existe que sur ordinateur)
trait TitleDesktop { fn title_desktop(self, t: &str) -> Self; }
impl<R: tauri::Runtime> TitleDesktop for tauri_plugin_dialog::FileDialogBuilder<R> {
    #[cfg(desktop)]
    fn title_desktop(self, t: &str) -> Self { self.set_title(t) }
    #[cfg(mobile)]
    fn title_desktop(self, _t: &str) -> Self { self }
}

#[tauri::command]
fn initial_file(files: State<Files>) -> Option<String> {
    files.initial.lock().unwrap().take()
}

static PANEL_N: AtomicUsize = AtomicUsize::new(0);

/// Fenêtre principale. Elle peut ouvrir des fenêtres de panneaux (timeline, vidéo… à mettre sur un autre écran) :
/// la page ouvre une fenêtre vide (about:blank) et y déplace le panneau ; toute autre adresse est refusée.
fn main_window(app: &tauri::App) -> tauri::Result<()> {
    let cfg = app.config().app.windows.iter().find(|w| w.label == "main").cloned().expect("fenêtre main");
    // téléphone / tablette : une seule fenêtre, pas de panneaux détachés
    #[cfg(mobile)]
    {
        WebviewWindowBuilder::from_config(app.handle(), &cfg)?.build()?;
        return Ok(());
    }
    #[cfg(desktop)]
    {
    let h = app.handle().clone();
    WebviewWindowBuilder::from_config(app.handle(), &cfg)?
        .on_new_window(move |url, features| {
            if url.as_str() != "about:blank" { return NewWindowResponse::Deny; }
            let label = format!("panel-{}", PANEL_N.fetch_add(1, Ordering::Relaxed));
            match WebviewWindowBuilder::new(&h, label, WebviewUrl::External(url))
                .window_features(features)
                .title("DedCut")
                .theme(Some(tauri::Theme::Dark))
                .background_color(tauri::window::Color(9, 8, 15, 255))
                .min_inner_size(320.0, 180.0)
                .on_document_title_changed(|w, t| { let _ = w.set_title(&t); })
                .build()
            {
                Ok(window) => NewWindowResponse::Create { window },
                Err(_) => NewWindowResponse::Deny,
            }
        })
        .build()?;
    Ok(())
    }
}

/// Ferme la fenêtre d'un panneau remis dans DedCut (la page ne peut fermer que son contenu, pas la fenêtre)
#[tauri::command]
fn close_panel(app: AppHandle, title: String) {
    #[cfg(desktop)]
    for (label, w) in app.webview_windows() {
        if label.starts_with("panel-") && w.title().map(|t| t == title).unwrap_or(false) { let _ = w.destroy(); }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    // connecteur IA : Claude Desktop lance « dedcut.exe --mcp » (relais sans fenêtre, voir mcp.rs)
    if args.iter().any(|a| a == "--mcp") { mcp::run_stdio(); return; }
    let builder = tauri::Builder::default();
    // seulement sur ordinateur : une seule fenêtre, raccourci global, mises à jour automatiques
    #[cfg(desktop)]
    let builder = builder
        // une seule fenêtre DedCut : un double-clic sur un .dedcut l'envoie à la fenêtre déjà ouverte
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(p) = first_project(&argv) { let _ = app.emit("open-file", p); }
            if let Some(w) = app.get_webview_window("main") { let _ = w.unminimize(); let _ = w.set_focus(); }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| { main_window(app)?; Ok(()) })
        // fermer DedCut ferme aussi les fenêtres de panneaux
        .on_window_event(|w, e| { if w.label() == "main" && matches!(e, WindowEvent::Destroyed) { let _ = std::fs::remove_file(mcp::info_file()); w.app_handle().exit(0); } })
        .manage(ai::AiState::default())
        .manage(brain::BrainState::default())
        .manage(music::MusicState::default())
        .manage(live::LiveState::default())
        .manage(tts::LiveTts::default())
        .manage(image::ImgPaths::default())
        .manage(musicfs::MusPaths::default())
        .manage(remote::RemoteState::default())
        .manage(mcp::McpState::default())
        .manage(chat::ChatState::default())
        .manage(Files { initial: Mutex::new(first_project(&args)), ..Default::default() })
        .invoke_handler(tauri::generate_handler![
            rec_start, rec_chunk, rec_end, out_start, out_write, out_end,
            read_project, save_as, open_folder, reveal, open_licences, initial_file,
            pick_media, allow_paths, save_media, choose_save, write_project, open_project_dialog, pick_one, find_in_dir, open_link, close_panel, pick_folder,
            tts::tts_voices, tts::tts_make, tts::tts_settings, tts::tts_live, trash_project, remote::remote_start, remote::remote_stop, remote::remote_state, secret::secret_protect, secret::secret_unprotect, image::img_open, image::img_save_dialog, image::img_write, image::img_pick_dir,
            mcp::mcp_enable, mcp::mcp_reply, mcp::mcp_status, mcp::mcp_install_claude,
            chat::chat_key_get, chat::chat_key_set, chat::chat_tools, chat::chat_post, chat::chat_cancel,
            ai::ai_status, ai::ai_hardware, ai::ai_download, ai::ai_cancel, ai::ai_hf_file, ai::ai_hf_cancel, ai::ai_delete, ai::ai_generate, ai::ai_set_ref, ai::ai_clear_frames,
            brain::brain_status, brain::brain_start, brain::brain_stop,
            music::music_catalog, music::music_get,
            musicfs::mus_open, musicfs::mus_allow, musicfs::mus_save_dialog, musicfs::mus_pick_dir, musicfs::mus_write, musicfs::mus_copy, musicfs::mus_dir, musicfs::mus_free,
            musicfs::mus_autosave, musicfs::mus_autosaves, musicfs::mus_autosave_read, musicfs::mus_autosave_del,
            musicfs::mus_rec_open, musicfs::mus_rec_append, musicfs::mus_rec_close, musicfs::mus_rec_orphans, musicfs::mus_rec_drop, musicfs::mus_plugins,
            live::live_start, live::live_send, live::live_stop,
            capture::win::cap_sources, capture::win::cap_thumb, capture::win::cap_start, capture::win::cap_stop, capture::win::cap_stop_all
        ])
        .run(tauri::generate_context!())
        .expect("impossible de démarrer DedCut");
}

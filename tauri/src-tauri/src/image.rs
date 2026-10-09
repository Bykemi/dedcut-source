//! Espace Image : fenêtres « Ouvrir » / « Enregistrer sous » et écriture sûre des fichiers (projets .dcimg et exports).
//! Seules les extensions d'images et de projets Image sont acceptées en écriture, et seulement vers un fichier
//! choisi par l'utilisateur pendant cette session (fenêtre « Enregistrer sous » ou « Ouvrir ») : la page ne peut pas écrire ailleurs.

use std::fs;
use std::io::Write;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::ipc::Request;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::{allow, err, header, info, raw_body, urlencoding_decode, FileInfo};

/// Fichiers que l'utilisateur a choisis (on peut y écrire)
#[derive(Default)]
pub struct ImgPaths(Mutex<HashSet<String>>, Mutex<HashSet<String>>);
fn key(p: &str) -> String { p.replace('/', "\\").to_lowercase() }

/// Extensions qu'on peut écrire depuis l'espace Image
const WRITE_EXT: &[&str] = &["dcimg", "png", "jpg", "jpeg", "webp", "tif", "tiff", "svg", "psd", "gbr", "json", "txt"];

fn ext_of(p: &str) -> String {
    PathBuf::from(p).extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default()
}

/// Fenêtre « Ouvrir » (un ou plusieurs fichiers) avec le filtre donné ; les fichiers choisis sont autorisés à la lecture
#[tauri::command]
pub async fn img_open(app: AppHandle, ok: State<'_, ImgPaths>, label: String, exts: Vec<String>, multi: bool) -> Result<Vec<FileInfo>, String> {
    let e: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
    let d = app.dialog().file().add_filter(&label, &e);
    let list = if multi { d.blocking_pick_files().unwrap_or_default() } else { d.blocking_pick_file().into_iter().collect() };
    let mut out = vec![];
    for f in list {
        let p = f.into_path().map_err(err)?;
        allow(&app, &p);
        if WRITE_EXT.contains(&ext_of(&p.to_string_lossy()).as_str()) { ok.0.lock().unwrap().insert(key(&p.to_string_lossy())); }
        out.push(info(&p));
    }
    Ok(out)
}

/// Fenêtre « Enregistrer sous » : renvoie le chemin choisi (avec la bonne extension)
#[tauri::command]
pub async fn img_save_dialog(app: AppHandle, ok: State<'_, ImgPaths>, name: String, label: String, ext: String) -> Result<Option<String>, String> {
    let ext = ext.to_lowercase();
    if !WRITE_EXT.contains(&ext.as_str()) { return Err("extension refusée".into()); }
    let mut name: String = name.chars().filter(|c| !"\\/:*?\"<>|".contains(*c)).take(120).collect();
    if name.trim().is_empty() { name = "image".into(); }
    if ext_of(&name) != ext { name = format!("{name}.{ext}"); }
    let Some(f) = app.dialog().file().set_file_name(&name).add_filter(&label, &[ext.as_str()]).blocking_save_file() else { return Ok(None) };
    let mut p = f.into_path().map_err(err)?;
    if p.extension().map(|e| e.to_string_lossy().to_lowercase()) != Some(ext.clone()) { p.set_extension(&ext); }
    let s = p.to_string_lossy().into_owned();
    ok.0.lock().unwrap().insert(key(&s));
    Ok(Some(s))
}

/// Écrit un fichier en entier, sans jamais laisser un fichier à moitié écrit :
/// fichier temporaire → vidage sur le disque → remplacement. Disque plein ou coupure : l'ancien fichier reste intact.
#[tauri::command]
pub fn img_write(app: AppHandle, ok: State<'_, ImgPaths>, request: Request<'_>) -> Result<FileInfo, String> {
    let path = urlencoding_decode(&header(&request, "path"));
    if !WRITE_EXT.contains(&ext_of(&path).as_str()) { return Err("extension refusée".into()); }
    // fichier choisi, ou fichier écrit directement dans un dossier choisi (traitement par lots), sans « .. »
    let in_dir = PathBuf::from(&path).parent().map(|d| ok.1.lock().unwrap().contains(&key(&d.to_string_lossy()))).unwrap_or(false);
    if path.contains("..") || !(ok.0.lock().unwrap().contains(&key(&path)) || in_dir) { return Err("fichier non choisi par l'utilisateur".into()); }
    let body = raw_body(&request)?;
    let tmp = format!("{path}.dctmp");
    let res = (|| -> std::io::Result<()> {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(body)?;
        f.sync_all()?;
        drop(f);
        fs::rename(&tmp, &path)
    })();
    if let Err(e) = res {
        let _ = fs::remove_file(&tmp);
        return Err(err(e));
    }
    let p = PathBuf::from(&path);
    allow(&app, &p);
    Ok(info(&p))
}

/// Dossier de sortie du traitement par lots : choisi par l'utilisateur, on peut ensuite y écrire des images
#[tauri::command]
pub async fn img_pick_dir(app: AppHandle, ok: State<'_, ImgPaths>, title: String) -> Result<Option<String>, String> {
    let Some(d) = app.dialog().file().set_title(&title).blocking_pick_folder() else { return Ok(None) };
    let p = d.into_path().map_err(err)?;
    let s = p.to_string_lossy().into_owned();
    ok.1.lock().unwrap().insert(key(&s));
    Ok(Some(s))
}

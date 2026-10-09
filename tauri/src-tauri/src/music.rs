// Bibliothèque de vraies musiques (v4.40) : 82 morceaux en domaine public (CC0 1.0) de Komiku, HoliznaCC0 et Loyalty Freak Music,
// choisis sur Free Music Archive (licence vérifiée morceau par morceau, voir THIRD_PARTY_LICENSES.md).
// Rien n'est livré avec l'installateur : chaque musique est téléchargée SUR DEMANDE depuis le dépôt public des mises à jour
// de DedCut (GitHub), avec contrôle de la taille et de l'empreinte SHA-256, puis rangée dans Vidéos\DedCut\Musiques.
// Sécurité : la page n'envoie qu'un identifiant ; l'adresse, la taille et l'empreinte viennent du catalogue intégré ici.
use std::collections::HashSet;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

use super::{allow, clean_name, err, info, videos_dir, FileInfo};

const BASE: &str = "https://github.com/Bykemi/DedCut-mises-a-jour/releases/download/musiques-1/";
const CATALOGUE: &str = include_str!("musiques.json");

#[derive(Deserialize)]
struct Track {
    id: String,
    title: String,
    artist: String,
    size: u64,
    sha256: String,
}

#[derive(Default)]
pub(crate) struct MusicState {
    busy: Mutex<HashSet<String>>,
}

fn tracks() -> Vec<Track> {
    serde_json::from_str(CATALOGUE).unwrap_or_default()
}

fn music_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = videos_dir(app)?.join("Musiques");
    fs::create_dir_all(&d).map_err(err)?;
    Ok(d)
}

/// Nom lisible dans le dossier Musiques : « Titre - Artiste.mp3 »
fn local_name(t: &Track) -> String {
    clean_name(&format!("{} - {}.mp3", t.title, t.artist), "musique.mp3")
}

fn complete(p: &Path, t: &Track) -> bool {
    fs::metadata(p).map(|m| m.is_file() && m.len() == t.size).unwrap_or(false)
}

/// curl fourni avec le système (Windows 10/11, macOS) ; absent sur Android
fn curl() -> Option<PathBuf> {
    let p = super::chat::curl_path();
    p.is_file().then_some(p)
}

fn sha256_file(p: &Path) -> Result<String, String> {
    if cfg!(windows) {
        return super::ai::sha256_of(p);
    }
    let out = Command::new("/usr/bin/shasum").args(["-a", "256"]).arg(p).output().map_err(err)?;
    String::from_utf8_lossy(&out.stdout)
        .split_whitespace()
        .next()
        .map(|s| s.to_lowercase())
        .filter(|s| s.len() == 64)
        .ok_or_else(|| "empreinte illisible".to_string())
}

/// Catalogue + musiques déjà téléchargées
#[tauri::command]
pub(crate) fn music_catalog(app: AppHandle) -> Result<Value, String> {
    let list: Value = serde_json::from_str(CATALOGUE).map_err(err)?;
    let have: Vec<String> = match music_dir(&app) {
        Ok(d) => tracks().iter().filter(|t| complete(&d.join(local_name(t)), t)).map(|t| t.id.clone()).collect(),
        Err(_) => vec![],
    };
    Ok(json!({ "base": BASE, "tracks": list, "have": have, "supported": curl().is_some() }))
}

/// Donne le fichier d'une musique (téléchargé et vérifié si besoin)
#[tauri::command]
pub(crate) async fn music_get(app: AppHandle, st: State<'_, MusicState>, id: String) -> Result<FileInfo, String> {
    let t = tracks().into_iter().find(|t| t.id == id).ok_or("unknown")?;
    let dest = music_dir(&app)?.join(local_name(&t));
    if !complete(&dest, &t) {
        if !st.busy.lock().unwrap().insert(id.clone()) {
            return Err("busy".into());
        }
        let (app2, dest2) = (app.clone(), dest.clone());
        let res = tauri::async_runtime::spawn_blocking(move || download(&app2, &t, &dest2)).await.map_err(err);
        st.busy.lock().unwrap().remove(&id);
        res??;
    }
    allow(&app, &dest);
    Ok(info(&dest))
}

fn download(app: &AppHandle, t: &Track, dest: &Path) -> Result<(), String> {
    let curl = curl().ok_or("unsupported")?;
    let tmp = dest.with_extension("mp3.part");
    let _ = fs::remove_file(&tmp);
    let mut child = super::ai::hidden(Command::new(curl))
        .args(["-L", "--fail", "--silent", "--show-error", "--proto", "=https", "--proto-redir", "=https", "--retry", "3"])
        .args(["--speed-limit", "5000", "--speed-time", "30", "--max-time", "900", "-o"])
        .arg(&tmp)
        .arg(format!("{BASE}{}.mp3", t.id))
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(err)?;
    loop {
        std::thread::sleep(std::time::Duration::from_millis(300));
        let done = fs::metadata(&tmp).map(|m| m.len()).unwrap_or(0);
        let _ = app.emit("music-progress", json!({ "id": t.id, "done": done, "total": t.size }));
        if let Some(status) = child.try_wait().map_err(err)? {
            if !status.success() {
                let mut msg = String::new();
                if let Some(mut e) = child.stderr.take() {
                    let _ = e.read_to_string(&mut msg);
                }
                let _ = fs::remove_file(&tmp);
                return Err(format!("téléchargement impossible : {}", msg.trim()));
            }
            break;
        }
    }
    let got = fs::metadata(&tmp).map(|m| m.len()).unwrap_or(0);
    if got != t.size || sha256_file(&tmp)? != t.sha256 {
        let _ = fs::remove_file(&tmp);
        return Err("fichier incorrect : refusé".into());
    }
    fs::rename(&tmp, dest).map_err(err)
}

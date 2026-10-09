// Assistant IA intégré : l'utilisateur discute avec une IA (Claude, ChatGPT, Ollama…) qui monte la vidéo avec les outils du connecteur.
// - Les clés API restent sur ce PC, dans %APPDATA%\DedCut\assistant.json (jamais dans les projets ni dans la page).
// - Pour ChatGPT / Ollama / serveur compatible OpenAI, la demande passe par curl.exe (fourni avec Windows) : pas de blocage CORS,
//   aucune dépendance ajoutée. La clé est écrite dans un fichier temporaire d'en-têtes (pas sur la ligne de commande) puis effacée.
// - Adresses acceptées : https:// partout, http:// seulement vers ce PC (127.0.0.1, localhost, [::1]).
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::sync::Mutex;

use serde_json::{json, Value};
use tauri::State;

use super::err;

#[cfg(windows)]
const NO_WINDOW: u32 = 0x0800_0000;

#[derive(Default)]
pub(crate) struct ChatState(Mutex<Option<u32>>);

fn store() -> PathBuf {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    PathBuf::from(base).join("DedCut").join("assistant.json")
}

fn valid_provider(p: &str) -> Result<(), String> {
    if p.is_empty() || p.len() > 20 || !p.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') { return Err("provider".into()); }
    Ok(())
}

/// Clé enregistrée pour un service ("" si aucune)
#[tauri::command]
pub(crate) fn chat_key_get(provider: String) -> Result<String, String> {
    valid_provider(&provider)?;
    let v: Value = std::fs::read_to_string(store()).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_else(|| json!({}));
    Ok(v["keys"][&provider].as_str().unwrap_or("").to_string())
}

/// Enregistre (ou efface si vide) la clé d'un service
#[tauri::command]
pub(crate) fn chat_key_set(provider: String, key: String) -> Result<(), String> {
    valid_provider(&provider)?;
    if key.len() > 400 || key.chars().any(|c| c.is_control()) { return Err("key".into()); }
    let f = store();
    let mut v: Value = std::fs::read_to_string(&f).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_else(|| json!({}));
    if !v.is_object() { v = json!({}); }
    if !v["keys"].is_object() { v["keys"] = json!({}); }
    if key.trim().is_empty() { v["keys"].as_object_mut().unwrap().remove(&provider); } else { v["keys"][&provider] = json!(key.trim()); }
    if let Some(d) = f.parent() { std::fs::create_dir_all(d).map_err(err)?; }
    std::fs::write(&f, v.to_string()).map_err(err)
}

/// Les outils de montage (les mêmes que le connecteur Claude Desktop)
#[tauri::command]
pub(crate) fn chat_tools() -> Value { super::mcp::tools() }

fn url_ok(u: &str) -> bool {
    if u.len() > 500 || u.chars().any(|c| c.is_whitespace() || c.is_control() || c == '"') { return false; }
    if let Some(rest) = u.strip_prefix("https://") { return !rest.is_empty(); }
    if let Some(rest) = u.strip_prefix("http://") {
        let host = rest.split(['/', '?']).next().unwrap_or("");
        let host = if host.starts_with('[') { host.split(']').next().map(|h| format!("{h}]")).unwrap_or_default() } else { host.split(':').next().unwrap_or("").to_string() };
        return matches!(host.to_ascii_lowercase().as_str(), "127.0.0.1" | "localhost" | "[::1]");
    }
    false
}

/// curl fourni avec le système : Windows 10/11 (System32), macOS et Linux (/usr/bin)
pub(crate) fn curl_path() -> PathBuf {
    if cfg!(windows) {
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
        PathBuf::from(root).join("System32\\curl.exe")
    } else { PathBuf::from("/usr/bin/curl") }
}

/// POST JSON vers un service compatible OpenAI. Renvoie { status, body }.
#[tauri::command]
pub(crate) async fn chat_post(state: State<'_, ChatState>, url: String, key: String, body: String) -> Result<Value, String> {
    if !url_ok(&url) { return Err("url".into()); }
    if key.chars().any(|c| c.is_control()) || key.len() > 400 { return Err("key".into()); }
    let hdr = std::env::temp_dir().join(format!("dedcut-chat-{}-{}.txt", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0)));
    let mut h = String::from("Content-Type: application/json\r\n");
    if !key.trim().is_empty() { h.push_str(&format!("Authorization: Bearer {}\r\n", key.trim())); }
    std::fs::write(&hdr, h).map_err(err)?;
    let mut c = Command::new(curl_path());
    c.args(["-sS", "--proto", "=https,http", "--max-time", "900", "-X", "POST", "-H"]).arg(format!("@{}", hdr.display()))
        .args(["--data-binary", "@-", "-w", "\n__DEDCUT_STATUS__%{http_code}", "--"]).arg(&url)
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]
    c.creation_flags(NO_WINDOW);
    let mut child = match c.spawn() { Ok(ch) => ch, Err(e) => { let _ = std::fs::remove_file(&hdr); return Err(err(e)); } };
    *state.0.lock().unwrap() = Some(child.id());
    if let Some(mut si) = child.stdin.take() { let b = body.into_bytes(); std::thread::spawn(move || { let _ = si.write_all(&b); }); }
    let out = tauri::async_runtime::spawn_blocking(move || child.wait_with_output()).await.map_err(err)?;
    *state.0.lock().unwrap() = None;
    let _ = std::fs::remove_file(&hdr);
    let out = out.map_err(err)?;
    let text = String::from_utf8_lossy(&out.stdout).into_owned();
    let (body, status) = match text.rsplit_once("\n__DEDCUT_STATUS__") { Some((b, s)) => (b.to_string(), s.trim().parse::<u16>().unwrap_or(0)), None => (text, 0) };
    if status == 0 {
        let e = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if e.is_empty() { "network".into() } else { e });
    }
    Ok(json!({ "status": status, "body": body }))
}

/// Arrête la demande en cours (bouton « Stop »)
#[tauri::command]
pub(crate) fn chat_cancel(state: State<'_, ChatState>) {
    if let Some(pid) = state.0.lock().unwrap().take() {
        #[cfg(windows)]
        let mut c = {
            let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
            let mut c = Command::new(PathBuf::from(root).join("System32\\taskkill.exe"));
            c.args(["/F", "/PID", &pid.to_string()]);
            c
        };
        #[cfg(not(windows))]
        let mut c = { let mut c = Command::new("/bin/kill"); c.args(["-9", &pid.to_string()]); c };
        #[cfg(windows)]
        c.creation_flags(NO_WINDOW);
        let _ = c.output();
    }
}

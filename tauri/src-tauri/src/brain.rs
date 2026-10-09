// DedCut IA « cerveau » : une vraie IA de langage qui tourne sur le PC (llama.cpp + Qwen3.5-4B, téléchargés sur demande, voir ai.rs).
// - llama-server n'écoute que 127.0.0.1, sur un port libre, avec une clé tirée au hasard à chaque démarrage :
//   les autres programmes ne peuvent pas s'en servir et rien ne passe par internet.
// - Il est lié à DedCut (objet « job » de Windows) : si DedCut se ferme ou plante, il s'arrête aussi.
// - Après 10 min sans demande il libère la mémoire (--sleep-idle-seconds) et recharge le modèle à la demande suivante.
// - Carte graphique (Vulkan) si possible, sinon le processeur seul (deuxième essai). Réglage « carte graphique » coupable :
//   processeur seul, plus lent mais plus doux (si un PC se fige ou plante quand sa carte graphique est poussée à fond).
// - Mise en forme de la conversation : celle de Qwen3.5 (Apache-2.0) avec une ligne changée (brain-chat.jinja) pour que le début
//   de la conversation reste identique d'un tour à l'autre : le moteur réutilise sa mémoire au lieu de tout relire.
use std::fs::File;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use super::ai::{ai_dir, brain_ok, hidden, missing_bytes, AiState, BRAIN_MODEL_FILE, BRAIN_PARTS};
use super::err;

const CHAT_TEMPLATE: &str = include_str!("brain-chat.jinja");

struct Server {
    child: Child,
    port: u16,
    key: String,
    gpu: bool,
}

#[derive(Default)]
pub struct BrainState {
    srv: Mutex<Option<Server>>,
    starting: Mutex<()>, // un seul démarrage à la fois
}

#[derive(Serialize)]
pub struct BrainStatus {
    supported: bool, // moteur fourni seulement pour Windows
    ready: bool,
    missing: u64,
    total: u64,
    running: bool,
    gpu: bool,
    busy: bool,
}

#[derive(Serialize, Clone)]
pub struct BrainConn {
    url: String,
    key: String,
    gpu: bool,
}

fn conn(s: &Server) -> BrainConn {
    BrainConn { url: format!("http://127.0.0.1:{}/v1", s.port), key: s.key.clone(), gpu: s.gpu }
}

fn alive(s: &mut Server) -> bool {
    matches!(s.child.try_wait(), Ok(None))
}

#[tauri::command]
pub fn brain_status(app: AppHandle, st: State<BrainState>, ai: State<AiState>) -> Result<BrainStatus, String> {
    let dir = ai_dir(&app)?;
    let mut g = st.srv.lock().unwrap();
    let (running, gpu) = match g.as_mut() { Some(s) => if alive(s) { (true, s.gpu) } else { (false, false) }, None => (false, false) };
    Ok(BrainStatus {
        supported: cfg!(windows),
        ready: brain_ok(&dir),
        missing: missing_bytes(&dir, BRAIN_PARTS),
        total: super::ai::parts_size(BRAIN_PARTS),
        running,
        gpu,
        busy: ai.is_busy(),
    })
}

/// Démarre le cerveau (ou renvoie celui qui tourne déjà) : adresse et clé pour les demandes compatibles OpenAI
#[tauri::command]
pub async fn brain_start(app: AppHandle, gpu: Option<bool>) -> Result<BrainConn, String> {
    tauri::async_runtime::spawn_blocking(move || start(&app, gpu.unwrap_or(true))).await.map_err(err)?
}

#[tauri::command]
pub fn brain_stop(app: AppHandle) {
    stop(&app);
}

pub(crate) fn stop(app: &AppHandle) {
    if let Some(st) = app.try_state::<BrainState>() {
        if let Some(mut s) = st.srv.lock().unwrap().take() {
            let _ = s.child.kill();
            let _ = s.child.wait();
        }
    }
}

fn free_port() -> Result<u16, String> {
    let l = TcpListener::bind(("127.0.0.1", 0)).map_err(err)?;
    Ok(l.local_addr().map_err(err)?.port())
}

fn new_key() -> String {
    use std::hash::BuildHasher;
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let a = std::collections::hash_map::RandomState::new().hash_one((t, std::process::id()));
    let b = std::collections::hash_map::RandomState::new().hash_one((a, t ^ 0x5bd1_e995));
    format!("{a:016x}{b:016x}")
}

/// Code HTTP de /health (200 = prêt, 503 = modèle en chargement), None si le serveur ne répond pas encore
fn health(port: u16) -> Option<u16> {
    let mut s = TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_millis(400)).ok()?;
    s.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    write!(s, "GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").ok()?;
    let mut buf = [0u8; 64];
    let n = s.read(&mut buf).ok()?;
    let head = String::from_utf8_lossy(&buf[..n]);
    head.split_whitespace().nth(1)?.parse().ok()
}

fn log_tail(path: &std::path::Path) -> String {
    let t = std::fs::read_to_string(path).unwrap_or_default();
    let lines: Vec<&str> = t.lines().filter(|l| !l.trim().is_empty()).collect();
    lines[lines.len().saturating_sub(4)..].join(" | ").chars().take(400).collect()
}

fn start(app: &AppHandle, want_gpu: bool) -> Result<BrainConn, String> {
    if !cfg!(windows) {
        return Err("unsupported".into());
    }
    let st = app.state::<BrainState>();
    let _one = st.starting.lock().unwrap();
    {
        let mut g = st.srv.lock().unwrap();
        if let Some(s) = g.as_mut() {
            // déjà lancé : gardé, sauf si le réglage « carte graphique » a été coupé depuis
            if alive(s) && (want_gpu || !s.gpu) {
                return Ok(conn(s));
            }
            let _ = s.child.kill();
            let _ = s.child.wait();
            *g = None;
        }
    }
    let dir = ai_dir(app)?;
    if !brain_ok(&dir) {
        return Err("missing".into());
    }
    let log = dir.join("brain.log");
    let tpl = dir.join("brain-chat.jinja");
    if std::fs::read_to_string(&tpl).map(|t| t != CHAT_TEMPLATE).unwrap_or(true) {
        std::fs::write(&tpl, CHAT_TEMPLATE).map_err(err)?;
    }
    let mut last = String::new();
    let tries: &[bool] = if want_gpu { &[true, false] } else { &[false] };
    for &gpu in tries {
        let port = free_port()?;
        let key = new_key();
        let mut c = hidden(Command::new(dir.join("llama").join("llama-server.exe")));
        // chemins relatifs : le dossier de l'utilisateur peut contenir des accents
        c.current_dir(&dir).args([
            "-m", BRAIN_MODEL_FILE,
            "--host", "127.0.0.1",
            "--port", &port.to_string(),
            "--api-key", &key,
            "-c", "32768",
            "-np", "1",
            "--jinja",
            "--chat-template-file", "brain-chat.jinja",
            "--reasoning", "off",
            "--no-webui",
            "--sleep-idle-seconds", "600",
        ]);
        if !gpu {
            c.args(["--device", "none", "-ngl", "0"]);
        }
        c.stdin(Stdio::null()).stdout(Stdio::null()).stderr(File::create(&log).map(Stdio::from).unwrap_or_else(|_| Stdio::null()));
        let mut child = c.spawn().map_err(err)?;
        tie_to_dedcut(&child);
        let t0 = Instant::now();
        loop {
            std::thread::sleep(Duration::from_millis(300));
            if let Ok(Some(_)) = child.try_wait() {
                last = log_tail(&log);
                break; // arrêté tout seul : on réessaie sans la carte graphique
            }
            if health(port) == Some(200) {
                let s = Server { child, port, key, gpu };
                let c = conn(&s);
                *st.srv.lock().unwrap() = Some(s);
                return Ok(c);
            }
            if t0.elapsed() > Duration::from_secs(240) {
                let _ = child.kill();
                let _ = child.wait();
                last = "délai dépassé".into();
                break;
            }
        }
    }
    Err(format!("démarrage impossible : {last}"))
}

/// Lie le serveur à DedCut : Windows l'arrête quand DedCut se ferme, même après un plantage
#[cfg(windows)]
fn tie_to_dedcut(child: &Child) {
    use std::os::windows::io::AsRawHandle;
    use std::sync::OnceLock;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject,
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };
    static JOB: OnceLock<usize> = OnceLock::new();
    let job = *JOB.get_or_init(|| unsafe {
        let h = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if h.is_null() {
            return 0;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(h, JobObjectExtendedLimitInformation, &info as *const _ as *const core::ffi::c_void, std::mem::size_of_val(&info) as u32);
        h as usize // gardé ouvert jusqu'à la fin de DedCut
    });
    if job != 0 {
        unsafe {
            AssignProcessToJobObject(job as _, child.as_raw_handle() as _);
        }
    }
}

#[cfg(not(windows))]
fn tie_to_dedcut(_child: &Child) {}

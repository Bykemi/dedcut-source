// DedCut AI — générateur de vidéo (texte ou image vers vidéo), 100 % local.
// Rien n'est livré avec l'installateur : le moteur (stable-diffusion.cpp, MIT), les modèles (FastWan 2.2 5B, Wan 2.1 1.3B, VACE ; Apache-2.0)
// et les outils de finition (Real-ESRGAN, BSD-3/MIT ; RIFE, MIT) sont téléchargés SUR DEMANDE de l'utilisateur dans
// %LOCALAPPDATA%\DedCut\ai, avec contrôle SHA-256.
// Sécurité : les adresses sont écrites ici (jamais reçues de la page), aucun texte n'est passé à un shell
// (programmes lancés avec une liste d'arguments), les nombres reçus sont bornés.
// Les programmes ne savent pas lire les chemins avec accents : on travaille dans le dossier ai avec des chemins relatifs.
use std::fs;
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const NO_WINDOW: u32 = 0x0800_0000; // pas de fenêtre noire

struct Part {
    id: &'static str,
    file: &'static str, // chemin relatif au dossier ai
    url: &'static str,
    size: u64,
    sha256: &'static str,
    unpack: Option<(&'static str, &'static [&'static str], &'static str)>, // archive : (dossier, éléments à extraire [vide = tout], fichier qui doit exister)
}

const PARTS: &[Part] = &[
    Part {
        id: "engine",
        file: "sd.zip",
        url: "https://github.com/leejet/stable-diffusion.cpp/releases/download/master-929-3f8527a/sd-master-3f8527a-bin-win-vulkan-x64.zip",
        size: 30_067_605,
        sha256: "60e6850d650417409f18c2170ab5e27335db96da70cd3d1ad1e930bcffc2fd35",
        unpack: Some(("engine", &[], "engine/sd-cli.exe")),
    },
    Part {
        id: "t5",
        file: "models/umt5-xxl-encoder-Q4_K_S.gguf",
        url: "https://huggingface.co/city96/umt5-xxl-encoder-gguf/resolve/main/umt5-xxl-encoder-Q4_K_S.gguf",
        size: 3_497_596_768,
        sha256: "4a3176f32fd70c0a335b4419fcbf8c86cc875e23498c0fc06f5b4aa0930889e0",
        unpack: None,
    },
    Part {
        id: "vae",
        file: "models/wan_2.1_vae.safetensors",
        url: "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors",
        size: 253_815_318,
        sha256: "2fc39d31359a4b0a64f55876d8ff7fa8d780956ae2cb13463b0223e15148976b",
        unpack: None,
    },
    Part {
        id: "wan",
        file: "models/wan2.1_t2v_1.3B_fp16.safetensors",
        url: "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors",
        size: 2_838_303_560,
        sha256: "be531024cd9018cb5b48c40cfbb6a6191645b1c792eb8bf4f8c1c6e10f924dc5",
        unpack: None,
    },
    Part {
        id: "vace",
        file: "models/wan2.1_vace_1.3B_fp16.safetensors",
        url: "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_vace_1.3B_fp16.safetensors",
        size: 4_309_519_800,
        sha256: "640ccc0577e6a5d4bb15cd91b11b699ef914fc55f126c5a1c544e152130784f2",
        unpack: None,
    },
    // décodeur rapide TAEHV (madebyollin, MIT) pour Wan 2.2 5B : 1 s au lieu de plusieurs minutes, qualité très proche
    Part {
        id: "tae22",
        file: "models/taew2_2.safetensors",
        url: "https://github.com/madebyollin/taehv/raw/fa579a9a726b0a55951998d73e309bfdf0abd342/safetensors/taew2_2.safetensors",
        size: 22_848_048,
        sha256: "b84609b2a133d48434bd9636bfcb44bf05168dc436e2d3cecf26256faa1f5325",
        unpack: None,
    },
    Part {
        id: "fast",
        file: "models/FastWan2.2-TI2V-5B-q6_k.gguf",
        url: "https://huggingface.co/Green-Sky/FastWan2.2-TI2V-5B-FullAttn-GGUF/resolve/main/FastWan2.2-TI2V-5B-q6_k.gguf",
        size: 4_210_247_200,
        sha256: "416a87e30f2328dbefd7666ac90b395ead74f443748ff31c83483ac4ac6121cc",
        unpack: None,
    },
    // finition : netteté x2 (Real-ESRGAN « animevideov3 », xinntao, BSD-3-Clause / MIT)
    Part {
        id: "esr",
        file: "tools/esr.zip",
        url: "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip",
        size: 45_474_481,
        sha256: "abc02804e17982a3be33675e4d471e91ea374e65b70167abc09e31acb412802d",
        unpack: Some(("tools/esr", &[], "tools/esr/realesrgan-ncnn-vulkan.exe")),
    },
    // finition : fluidité x2 (RIFE 4.6, nihui / hzwer, MIT) ; on n'extrait que le modèle utilisé
    Part {
        id: "rife",
        file: "tools/rife.zip",
        url: "https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-windows.zip",
        size: 431_540_241,
        sha256: "d8e4d772d26cd8006ef0ad0bc82eb191b53c68677d1ae2f42506d74cbbbea606",
        unpack: Some((
            "tools/rife",
            &[
                "rife-ncnn-vulkan-20221029-windows/rife-ncnn-vulkan.exe",
                "rife-ncnn-vulkan-20221029-windows/vcomp140.dll",
                "rife-ncnn-vulkan-20221029-windows/LICENSE",
                "rife-ncnn-vulkan-20221029-windows/rife-v4.6",
            ],
            "tools/rife/rife-ncnn-vulkan-20221029-windows/rife-ncnn-vulkan.exe",
        )),
    },
    // DedCut IA « cerveau » (voir brain.rs) : moteur llama.cpp (ggml-org, MIT ; libomp.dll : Apache-2.0 avec exception LLVM), version Vulkan
    Part {
        id: "llama",
        file: "llama.zip",
        url: "https://github.com/ggml-org/llama.cpp/releases/download/b11408/llama-b11408-bin-win-vulkan-x64.zip",
        size: 33_308_362,
        sha256: "2400e21263c745be6e4d0ca1d91206f0050cf6477b284a508effb8284d7270fd",
        unpack: Some(("llama", &[], "llama/llama-server.exe")),
    },
    // Qwen3.5-4B (équipe Qwen d'Alibaba, Apache-2.0), compressé en Q4_K_M par Unsloth (même licence) ; version figée par son commit
    Part {
        id: "qwen",
        file: "models/Qwen3.5-4B-Q4_K_M.gguf",
        url: "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/e87f176479d0855a907a41277aca2f8ee7a09523/Qwen3.5-4B-Q4_K_M.gguf",
        size: 2_740_937_888,
        sha256: "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4",
        unpack: None,
    },
];

/// Morceaux du « cerveau » de DedCut IA (téléchargés et supprimés ensemble, sous le nom « brain »)
pub(crate) const BRAIN_PARTS: &[&str] = &["llama", "qwen"];
pub(crate) const BRAIN_MODEL_FILE: &str = "models/Qwen3.5-4B-Q4_K_M.gguf";

const RIFE_DIR: &str = "tools/rife/rife-ncnn-vulkan-20221029-windows";

/// Un modèle = les morceaux dont il a besoin + sa façon de tourner
struct Model {
    id: &'static str,
    parts: &'static [&'static str],
    own: &'static [&'static str], // morceaux supprimés avec lui (non partagés)
    diffusion: &'static str,
    decoder: [&'static str; 2], // --vae ou --tae + fichier
    sampler: &'static str,
    image: bool,     // sait partir d'une image
    max_frames: u32, // pour une seule génération
    max_side: u32,
    multiple: u32, // largeur et hauteur multiples de
    flow_shift: &'static str,
    extra: &'static [&'static str],
}

const MODELS: &[Model] = &[
    // FastWan 2.2 TI2V 5B (FastVideo, Apache-2.0) : distillé (DMD), 3 étapes LCM sans CFG, 24 i/s, vraie « image vers vidéo »
    // mesuré sur RX 580 4 Go : 640x352, 2 s à partir d'une image = 2 min 40 s ; finition x2/x2 = +15 s
    // ⚠ avec euler le résultat est raté (motif en losanges) : garder lcm
    Model { id: "fast", parts: &["engine", "t5", "tae22", "fast", "esr", "rife"], own: &["fast", "tae22", "esr", "rife"], diffusion: "models/FastWan2.2-TI2V-5B-q6_k.gguf", decoder: ["--tae", "models/taew2_2.safetensors"], sampler: "lcm", image: true, max_frames: 121, max_side: 1280, multiple: 32, flow_shift: "5.0", extra: &[] },
    // Wan 2.1 T2V 1.3B : léger, texte seulement
    Model { id: "wan", parts: &["engine", "t5", "vae", "wan"], own: &["wan"], diffusion: "models/wan2.1_t2v_1.3B_fp16.safetensors", decoder: ["--vae", "models/wan_2.1_vae.safetensors"], sampler: "euler", image: false, max_frames: 81, max_side: 832, multiple: 16, flow_shift: "3.0", extra: &["--vae-tiling"] },
    // Wan 2.1 VACE 1.3B : garde un personnage de référence ; compressé en q8 pour tenir dans 4 Go de mémoire vidéo
    Model { id: "vace", parts: &["engine", "t5", "vae", "vace"], own: &["vace"], diffusion: "models/wan2.1_vace_1.3B_fp16.safetensors", decoder: ["--vae", "models/wan_2.1_vae.safetensors"], sampler: "euler", image: true, max_frames: 81, max_side: 832, multiple: 16, flow_shift: "3.0", extra: &["--type", "q8_0", "--vae-tiling"] },
];

#[derive(Default)]
pub struct AiState {
    child: Mutex<Option<Child>>, // téléchargement ou programme en cours
    cancel: AtomicBool,
    busy: AtomicBool,
}

impl AiState {
    pub(crate) fn is_busy(&self) -> bool {
        self.busy.load(Ordering::SeqCst)
    }
}

pub(crate) fn parts_size(ids: &[&str]) -> u64 {
    ids.iter().map(|id| part(id).size).sum()
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

pub(crate) fn ai_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().local_data_dir().map_err(err)?.join("DedCut").join("ai");
    for sub in ["models", "engine", "tools"] {
        fs::create_dir_all(d.join(sub)).map_err(err)?;
    }
    Ok(d)
}

fn model(id: &str) -> Result<&'static Model, String> {
    MODELS.iter().find(|m| m.id == id).ok_or_else(|| "modèle inconnu".to_string())
}

fn part(id: &str) -> &'static Part {
    PARTS.iter().find(|p| p.id == id).expect("morceau connu")
}

fn marker(dir: &Path, p: &Part) -> PathBuf {
    dir.join(format!(".ok-{}", p.id))
}

/// Un morceau est « prêt » s'il a été vérifié (SHA-256), que sa taille n'a pas changé et, pour une archive, qu'elle est extraite
fn part_ok(dir: &Path, p: &Part) -> bool {
    let size_ok = fs::metadata(dir.join(p.file)).map(|m| m.len() == p.size).unwrap_or(false);
    let mark = fs::read_to_string(marker(dir, p)).map(|s| s.trim() == p.sha256).unwrap_or(false);
    let unpacked = p.unpack.map(|(_, _, check)| dir.join(check).is_file()).unwrap_or(true);
    size_ok && mark && unpacked
}

/// Morceaux d'un modèle de Vidéo IA ou du cerveau de DedCut IA (« brain »)
fn parts_of(id: &str) -> Result<&'static [&'static str], String> {
    if id == "brain" { Ok(BRAIN_PARTS) } else { Ok(model(id)?.parts) }
}

pub(crate) fn brain_ok(dir: &Path) -> bool {
    BRAIN_PARTS.iter().all(|p| part_ok(dir, part(p)))
}

/// Octets encore à télécharger (un fichier complet mais pas encore vérifié ne sera pas retéléchargé)
pub(crate) fn missing_bytes(dir: &Path, ids: &[&str]) -> u64 {
    ids.iter()
        .map(|id| part(id))
        .filter(|p| !part_ok(dir, p))
        .map(|p| {
            let have = fs::metadata(dir.join(p.file)).or_else(|_| fs::metadata(dir.join(format!("{}.part", p.file)))).map(|x| x.len()).unwrap_or(0);
            p.size.saturating_sub(have.min(p.size))
        })
        .sum()
}

fn model_ok(dir: &Path, m: &Model) -> bool {
    m.parts.iter().all(|p| part_ok(dir, part(p)))
}

#[derive(Serialize)]
pub struct ModelInfo {
    id: String,
    ready: bool,
    missing: u64, // octets encore à télécharger
    image: bool,
    max_frames: u32,
}

/* ---------- puissance du PC : en dessous du minimum, l'onglet Vidéo IA est bloqué (sinon des heures de calcul ou un plantage) ---------- */
pub const MIN_VRAM_GB: f64 = 8.0;
pub const MIN_RAM_GB: f64 = 16.0;

/// Carte graphique assez récente (et donc assez rapide) : NVIDIA RTX 2000 et plus, AMD RX 6000 et plus, Intel Arc,
/// cartes pro récentes. Les anciennes (GTX, RX 400/500, Vega…) mettent plusieurs minutes pour 2 secondes de vidéo.
pub fn recent_gpu(name: &str) -> bool {
    let n = name.to_ascii_lowercase().replace("(tm)", "").replace("(r)", "").replace("  ", " ");
    let num_after = |key: &str| -> Option<u32> {
        let i = n.find(key)? + key.len();
        let d: String = n[i..].trim_start().chars().take_while(|c| c.is_ascii_digit()).collect();
        d.parse().ok()
    };
    if let Some(v) = num_after("rtx") { if v >= 2000 { return true; } }
    if n.contains("rtx a") || n.contains("rtx pro") || n.contains(" ada") { return true; }
    if let Some(v) = num_after("rx") { if (6000..10000).contains(&v) { return true; } }
    if n.contains("arc a") || n.contains("arc b") || n.contains("radeon ai pro") { return true; }
    if let Some(v) = num_after("radeon pro w") { if v >= 6000 { return true; } }
    false
}

#[derive(Serialize)]
pub struct Hardware { gpu: String, vram_gb: f64, ram_gb: f64, known: bool, recent: bool, ok: bool, min_vram_gb: f64, min_ram_gb: f64, unsupported: bool }

/// Mémoire du PC et carte graphique ayant le plus de mémoire vidéo (lue dans le registre de Windows :
/// la valeur de Win32_VideoController est limitée à 4 Go).
#[tauri::command]
pub async fn ai_hardware() -> Result<Hardware, String> {
    // les programmes de la Vidéo IA (sd-cli, Real-ESRGAN, RIFE) sont des versions Windows : ailleurs, la fonction est bloquée
    if !cfg!(windows) {
        return Ok(Hardware { gpu: String::new(), vram_gb: 0.0, ram_gb: 0.0, known: true, recent: false, ok: false, min_vram_gb: MIN_VRAM_GB, min_ram_gb: MIN_RAM_GB, unsupported: true });
    }
    tauri::async_runtime::spawn_blocking(|| {
        let script = r#"[Console]::OutputEncoding=[Text.Encoding]::UTF8;'RAM|'+(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory;
Get-ItemProperty 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' -ErrorAction SilentlyContinue|ForEach-Object{'GPU|'+$_.DriverDesc+'|'+$_.'HardwareInformation.qwMemorySize'+'|'+$_.'HardwareInformation.MemorySize'};
Get-CimInstance Win32_VideoController|ForEach-Object{'VC|'+$_.Name+'|'+$_.AdapterRAM}"#;
        let out = super::tts::powershell().arg(script).output().map_err(super::err)?;
        let text = String::from_utf8_lossy(&out.stdout).into_owned();
        let (mut ram, mut best, mut gpu) = (0f64, 0f64, String::new());
        for l in text.lines() {
            let f: Vec<&str> = l.trim().split('|').collect();
            let num = |i: usize| f.get(i).and_then(|v| v.trim().parse::<f64>().ok()).unwrap_or(0.0);
            match f.first().copied() {
                Some("RAM") => ram = num(1) / 1073741824.0,
                Some("GPU") | Some("VC") => {
                    let mut b = num(2);
                    if b <= 0.0 { b = num(3); }
                    let gb = b / 1073741824.0;
                    if gb > best { best = gb; gpu = f.get(1).unwrap_or(&"").trim().to_string(); }
                }
                _ => {}
            }
        }
        let known = ram > 0.0 && best > 0.0;
        let round = |x: f64| (x * 10.0).round() / 10.0;
        // si Windows ne donne pas l'information, on ne bloque pas
        // carte inconnue mais avec beaucoup de mémoire (cartes pro) : acceptée
        let recent = recent_gpu(&gpu) || best >= 16.0 - 0.1;
        let ok = !known || (recent && best >= MIN_VRAM_GB - 0.1 && ram >= MIN_RAM_GB - 0.5);
        Ok(Hardware { gpu, vram_gb: round(best), ram_gb: round(ram), known, recent, ok, min_vram_gb: MIN_VRAM_GB, min_ram_gb: MIN_RAM_GB, unsupported: false })
    }).await.map_err(super::err)?
}

#[derive(Serialize)]
pub struct AiStatus {
    models: Vec<ModelInfo>,
    dir: String,
    busy: bool,
}

#[tauri::command]
pub fn ai_status(app: AppHandle, st: State<AiState>) -> Result<AiStatus, String> {
    let dir = ai_dir(&app)?;
    let models = MODELS
        .iter()
        .map(|m| ModelInfo {
            id: m.id.into(),
            ready: model_ok(&dir, m),
            missing: missing_bytes(&dir, m.parts),
            image: m.image,
            max_frames: m.max_frames,
        })
        .collect();
    Ok(AiStatus { models, dir: dir.to_string_lossy().into_owned(), busy: st.busy.load(Ordering::SeqCst) })
}

fn sys32(exe: &str) -> PathBuf {
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    PathBuf::from(root).join("System32").join(exe)
}

#[cfg_attr(not(windows), allow(unused_mut))]
pub(crate) fn hidden(mut c: Command) -> Command {
    #[cfg(windows)]
    c.creation_flags(NO_WINDOW);
    c
}

pub(crate) fn sha256_of(path: &Path) -> Result<String, String> {
    // certutil est fourni avec Windows
    let out = hidden(Command::new(sys32("certutil.exe"))).args(["-hashfile"]).arg(path).arg("SHA256").output().map_err(err)?;
    let text = String::from_utf8_lossy(&out.stdout);
    text.lines()
        .map(|l| l.trim().replace(' ', "").to_lowercase())
        .find(|l| l.len() == 64 && l.chars().all(|c| c.is_ascii_hexdigit()))
        .ok_or_else(|| "empreinte illisible".to_string())
}

#[derive(Serialize, Clone)]
struct Progress {
    id: String,
    done: u64,
    total: u64,
    idx: usize,
    n: usize,
}

/// Télécharge (reprise possible) et vérifie les morceaux manquants d'un modèle, l'un après l'autre
#[tauri::command]
pub async fn ai_download(app: AppHandle, st: State<'_, AiState>, model_id: String) -> Result<(), String> {
    if !cfg!(windows) { return Err("unsupported".into()); }
    let parts = parts_of(&model_id)?;
    if st.busy.swap(true, Ordering::SeqCst) {
        return Err("busy".into());
    }
    st.cancel.store(false, Ordering::SeqCst);
    let app2 = app.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let st = app2.state::<AiState>();
        let dir = ai_dir(&app2)?;
        let todo: Vec<&Part> = parts.iter().map(|id| part(id)).filter(|p| !part_ok(&dir, p)).collect();
        let n = todo.len();
        for (idx, p) in todo.iter().enumerate() {
            let dest = dir.join(p.file);
            let tmp = dir.join(format!("{}.part", p.file));
            if dest.exists() && !tmp.exists() {
                // fichier déjà là mais pas encore vérifié (ou modifié) : on le revérifie plutôt que de le retélécharger
                let _ = fs::rename(&dest, &tmp);
            }
            let mut tries = 0;
            while !fs::metadata(&tmp).map(|x| x.len() == p.size).unwrap_or(false) {
                tries += 1;
                if tries > 8 {
                    return Err(format!("téléchargement incomplet ({})", p.id));
                }
                let before = fs::metadata(&tmp).map(|x| x.len()).unwrap_or(0);
                let child = hidden(Command::new(sys32("curl.exe")))
                    .args(["-L", "--fail", "--silent", "--show-error", "--retry", "3", "--speed-limit", "20000", "--speed-time", "30", "-C", "-", "-o"])
                    .arg(&tmp)
                    .arg(p.url)
                    .stdout(Stdio::null())
                    .stderr(Stdio::piped())
                    .spawn()
                    .map_err(err)?;
                *st.child.lock().unwrap() = Some(child);
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(400));
                    let done = fs::metadata(&tmp).map(|x| x.len()).unwrap_or(0);
                    let _ = app2.emit("ai-progress", Progress { id: p.id.into(), done, total: p.size, idx, n });
                    let mut g = st.child.lock().unwrap();
                    let Some(c) = g.as_mut() else { return Err("annulé".to_string()) };
                    if st.cancel.load(Ordering::SeqCst) {
                        let _ = c.kill();
                        *g = None;
                        return Err("annulé".to_string());
                    }
                    if let Some(status) = c.try_wait().map_err(err)? {
                        let mut msg = String::new();
                        if let Some(mut e) = c.stderr.take() {
                            let _ = e.read_to_string(&mut msg);
                        }
                        *g = None;
                        if !status.success() {
                            let now = fs::metadata(&tmp).map(|x| x.len()).unwrap_or(0);
                            if now > before && tries < 6 {
                                break; // ça avançait : on reprend où on en était
                            }
                            return Err(format!("téléchargement impossible : {}", msg.trim()));
                        }
                        break;
                    }
                }
            }
            let got = fs::metadata(&tmp).map(|x| x.len()).unwrap_or(0);
            if got != p.size {
                let _ = fs::remove_file(&tmp);
                return Err(format!("taille inattendue pour {} ({} au lieu de {})", p.id, got, p.size));
            }
            let _ = app2.emit("ai-progress", Progress { id: format!("{}:check", p.id), done: p.size, total: p.size, idx, n });
            let sha = sha256_of(&tmp)?;
            if sha != p.sha256 {
                let _ = fs::remove_file(&tmp);
                return Err(format!("empreinte incorrecte pour {} : fichier refusé", p.id));
            }
            fs::rename(&tmp, &dest).map_err(err)?;
            if let Some((into, members, check)) = p.unpack {
                let target = dir.join(into);
                fs::create_dir_all(&target).map_err(err)?;
                let out = hidden(Command::new(sys32("tar.exe"))).arg("-xf").arg(&dest).arg("-C").arg(&target).args(members).output().map_err(err)?;
                if !out.status.success() || !dir.join(check).is_file() {
                    return Err(format!("extraction impossible ({})", p.id));
                }
            }
            fs::write(marker(&dir, p), p.sha256).map_err(err)?;
        }
        Ok::<(), String>(())
    })
    .await
    .map_err(err)?;
    st.busy.store(false, Ordering::SeqCst);
    res
}

#[tauri::command]
pub fn ai_cancel(st: State<AiState>) {
    st.cancel.store(true, Ordering::SeqCst);
    if let Some(c) = st.child.lock().unwrap().as_mut() {
        let _ = c.kill();
    }
}

/// Supprime un modèle (ses morceaux non partagés) ou tout le dossier ai
#[tauri::command]
pub fn ai_delete(app: AppHandle, st: State<AiState>, model_id: Option<String>) -> Result<(), String> {
    if st.busy.load(Ordering::SeqCst) {
        return Err("busy".into());
    }
    let dir = ai_dir(&app)?;
    if let Some(id) = model_id {
        if id == "brain" { super::brain::stop(&app); }
        let own: &[&str] = if id == "brain" { BRAIN_PARTS } else { model(&id)?.own };
        for p in own.iter().map(|x| part(x)) {
            let _ = fs::remove_file(dir.join(p.file));
            let _ = fs::remove_file(dir.join(format!("{}.part", p.file)));
            let _ = fs::remove_file(marker(&dir, p));
            if let Some((into, _, _)) = p.unpack {
                let _ = fs::remove_dir_all(dir.join(into));
            }
        }
        return Ok(());
    }
    for e in fs::read_dir(&dir).map_err(err)?.flatten() {
        let p = e.path();
        if p.is_dir() {
            let _ = fs::remove_dir_all(&p);
        } else {
            let _ = fs::remove_file(&p);
        }
    }
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct GenParams {
    prompt: String,
    negative: String,
    width: u32,
    height: u32,
    frames: u32,
    fps: u32,
    steps: u32,
    seed: i64,
    cfg: f32,
    name: String,
    model: String,
    image: bool,   // true : part de l'image enregistrée par ai_set_ref
    enhance: bool, // true : netteté x2 + fluidité x2 (FastWan seulement), résultat en images
}

#[derive(Serialize, Clone)]
struct GenLine {
    line: String,
}

/// Résultat : un fichier vidéo, ou un dossier d'images (finition) que la page assemble en MP4
#[derive(Serialize)]
pub struct GenResult {
    path: Option<String>,
    frames_dir: Option<String>,
    count: u32,
    fps: u32,
    width: u32,
    height: u32,
}

/// Lance un programme, envoie ses lignes à la page (ai-log), attend la fin ; annulable
fn run(app: &AppHandle, st: &AiState, mut cmd: Command) -> Result<(), String> {
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(err)?;
    let so = child.stdout.take();
    let se = child.stderr.take();
    *st.child.lock().unwrap() = Some(child);
    let tail: Arc<Mutex<Vec<String>>> = Default::default();
    let mut readers = vec![];
    for r in [so.map(|x| Box::new(x) as Box<dyn Read + Send>), se.map(|x| Box::new(x) as Box<dyn Read + Send>)].into_iter().flatten() {
        let a = app.clone();
        let tl = tail.clone();
        readers.push(std::thread::spawn(move || {
            // la progression utilise des retours chariot : on découpe sur \r et \n
            let mut buf = BufReader::new(r);
            let mut cur = Vec::new();
            let mut byte = [0u8; 1];
            while buf.read(&mut byte).map(|n| n > 0).unwrap_or(false) {
                if byte[0] == b'\n' || byte[0] == b'\r' {
                    if !cur.is_empty() {
                        let line = String::from_utf8_lossy(&cur).into_owned();
                        {
                            let mut t = tl.lock().unwrap();
                            t.push(line.clone());
                            if t.len() > 6 {
                                t.remove(0);
                            }
                        }
                        let _ = a.emit("ai-log", GenLine { line });
                        cur.clear();
                    }
                } else if cur.len() < 400 {
                    cur.push(byte[0]);
                }
            }
        }));
    }
    let status = loop {
        std::thread::sleep(std::time::Duration::from_millis(300));
        let mut g = st.child.lock().unwrap();
        let Some(c) = g.as_mut() else { break None };
        if st.cancel.load(Ordering::SeqCst) {
            let _ = c.kill();
            let _ = c.wait();
            *g = None;
            break None;
        }
        if let Some(s) = c.try_wait().map_err(err)? {
            *g = None;
            break Some(s);
        }
    };
    for r in readers {
        let _ = r.join();
    }
    match status {
        None => Err("annulé".to_string()),
        Some(s) if s.success() => Ok(()),
        Some(s) => Err(format!("le programme s'est arrêté (code {}) : {}", s.code().unwrap_or(-1), tail.lock().unwrap().join(" | "))),
    }
}

/// Étape en cours, pour la barre de progression de la page
fn stage(app: &AppHandle, name: &str) {
    let _ = app.emit("ai-log", GenLine { line: format!("[dedcut] {name}") });
}

fn fresh_dir(p: &Path) -> Result<(), String> {
    let _ = fs::remove_dir_all(p);
    fs::create_dir_all(p).map_err(err)
}

fn count_files(p: &Path, ext: &str) -> u32 {
    fs::read_dir(p)
        .map(|rd| rd.flatten().filter(|e| e.path().extension().map(|x| x.eq_ignore_ascii_case(ext)).unwrap_or(false)).count() as u32)
        .unwrap_or(0)
}

/// Lance la génération (puis la finition si demandée)
#[tauri::command]
pub async fn ai_generate(app: AppHandle, st: State<'_, AiState>, p: GenParams) -> Result<GenResult, String> {
    if !cfg!(windows) { return Err("unsupported".into()); }
    if st.busy.swap(true, Ordering::SeqCst) {
        return Err("busy".into());
    }
    st.cancel.store(false, Ordering::SeqCst);
    // le cerveau de DedCut IA et la Vidéo IA ne tiennent pas ensemble dans la mémoire vidéo : on l'arrête (il redémarre à la demande)
    super::brain::stop(&app);
    let app2 = app.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let st = app2.state::<AiState>();
        let dir = ai_dir(&app2)?;
        let md = model(&p.model)?;
        if !model_ok(&dir, md) {
            return Err("moteur ou modèle manquant".to_string());
        }
        if p.image && !md.image {
            return Err("ce modèle ne sait pas partir d'une image".to_string());
        }
        if p.image && !dir.join("ref.png").is_file() {
            return Err("image de départ manquante".to_string());
        }
        let enhance = p.enhance && md.parts.contains(&"esr") && md.parts.contains(&"rife");
        // valeurs bornées : multiples imposés par le modèle, tailles et durées raisonnables
        let w = (p.width.clamp(128, md.max_side) / md.multiple) * md.multiple;
        let h = (p.height.clamp(128, md.max_side) / md.multiple) * md.multiple;
        let frames = {
            let f = p.frames.clamp(5, md.max_frames);
            ((f - 1) / 4) * 4 + 1 // Wan : 4k + 1 images
        };
        let fps = p.fps.clamp(8, 30);
        let steps = p.steps.clamp(1, 50);
        let cfg = p.cfg.clamp(1.0, 12.0);
        let prompt: String = p.prompt.chars().filter(|c| !c.is_control() || *c == ' ').take(1500).collect();
        let negative: String = p.negative.chars().filter(|c| !c.is_control() || *c == ' ').take(1000).collect();
        if prompt.trim().is_empty() {
            return Err("description vide".to_string());
        }
        let tmp_out = dir.join("out.webm");
        let _ = fs::remove_file(&tmp_out);
        if enhance {
            fresh_dir(&dir.join("frames"))?;
        }
        let mut cmd = hidden(Command::new(dir.join("engine").join("sd-cli.exe")));
        cmd.current_dir(&dir)
            .args(["-M", "vid_gen", "--diffusion-model", md.diffusion])
            .args(md.decoder)
            .args(["--t5xxl", "models/umt5-xxl-encoder-Q4_K_S.gguf"])
            .arg("-p")
            .arg(&prompt)
            .arg("-n")
            .arg(&negative)
            .args(["--cfg-scale", &format!("{cfg}"), "--sampling-method", md.sampler, "--flow-shift", md.flow_shift])
            .args(["-W", &w.to_string(), "-H", &h.to_string(), "--video-frames", &frames.to_string(), "--fps", &fps.to_string()])
            .args(["--steps", &steps.to_string(), "-s", &p.seed.to_string()])
            .args(["--diffusion-fa", "--offload-to-cpu", "-v"])
            .args(md.extra)
            .args(["-o", if enhance { "frames/%04d.png" } else { "out.webm" }]);
        if p.image {
            cmd.args(["-i", "ref.png"]);
        }
        stage(&app2, "generate");
        run(&app2, &st, cmd)?;

        if !enhance {
            if !tmp_out.is_file() {
                return Err("le moteur n'a rien produit".to_string());
            }
            let out_dir = app2.path().video_dir().map_err(err)?.join("DedCut").join("Médias");
            fs::create_dir_all(&out_dir).map_err(err)?;
            let stem = {
                let s: String = p.name.chars().map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' }).take(60).collect();
                if s.trim().is_empty() { "video-ia".to_string() } else { s.trim().to_string() }
            };
            let mut out = out_dir.join(format!("{stem}.webm"));
            let mut k = 2;
            while out.exists() {
                out = out_dir.join(format!("{stem} ({k}).webm"));
                k += 1;
            }
            if fs::rename(&tmp_out, &out).is_err() {
                fs::copy(&tmp_out, &out).map_err(err)?;
                let _ = fs::remove_file(&tmp_out);
            }
            let _ = app2.asset_protocol_scope().allow_file(&out);
            return Ok(GenResult { path: Some(out.to_string_lossy().into_owned()), frames_dir: None, count: frames, fps, width: w, height: h });
        }

        // finition : netteté x2 puis fluidité x2 ; les images finales sont lues par la page pour faire un MP4
        if count_files(&dir.join("frames"), "png") == 0 {
            return Err("le moteur n'a rien produit".to_string());
        }
        fresh_dir(&dir.join("up"))?;
        stage(&app2, "upscale");
        let mut esr = hidden(Command::new(dir.join("tools/esr/realesrgan-ncnn-vulkan.exe")));
        esr.current_dir(&dir).args(["-i", "frames", "-o", "up", "-n", "realesr-animevideov3", "-s", "2", "-f", "png", "-m", "tools/esr/models"]);
        run(&app2, &st, esr)?;
        fresh_dir(&dir.join("smooth"))?;
        stage(&app2, "interpolate");
        let mut rife = hidden(Command::new(dir.join(RIFE_DIR).join("rife-ncnn-vulkan.exe")));
        rife.current_dir(&dir).args(["-i", "up", "-o", "smooth", "-m", &format!("{RIFE_DIR}/rife-v4.6"), "-f", "%08d.jpg"]);
        run(&app2, &st, rife)?;
        let _ = fs::remove_dir_all(dir.join("frames"));
        let _ = fs::remove_dir_all(dir.join("up"));
        let smooth = dir.join("smooth");
        let count = count_files(&smooth, "jpg");
        if count == 0 {
            return Err("finition impossible".to_string());
        }
        let _ = app2.asset_protocol_scope().allow_directory(&smooth, false);
        Ok(GenResult { path: None, frames_dir: Some(smooth.to_string_lossy().into_owned()), count, fps: fps * 2, width: w * 2, height: h * 2 })
    })
    .await
    .map_err(err)?;
    st.busy.store(false, Ordering::SeqCst);
    res
}

/// Enregistre l'image de départ (PNG préparé par la page, à la taille de la vidéo) dans le dossier ai
#[tauri::command]
pub fn ai_set_ref(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(b) = request.body() else { return Err("image manquante".into()) };
    if b.len() > 40_000_000 || b.len() < 8 || &b[1..4] != b"PNG" {
        return Err("image refusée (PNG attendu)".into());
    }
    fs::write(ai_dir(&app)?.join("ref.png"), b).map_err(err)
}

/// Fin de l'assemblage : la page a fini de lire les images de finition, on libère la place
#[tauri::command]
pub fn ai_clear_frames(app: AppHandle) -> Result<(), String> {
    let _ = fs::remove_dir_all(ai_dir(&app)?.join("smooth"));
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn cartes() {
        for n in ["NVIDIA GeForce RTX 3060", "NVIDIA GeForce RTX 4090 Laptop GPU", "NVIDIA RTX A4000", "AMD Radeon RX 6700 XT", "AMD Radeon RX 7900 XTX", "AMD Radeon RX 9070", "Intel(R) Arc(TM) A770 Graphics", "Intel(R) Arc(TM) B580 Graphics", "NVIDIA GeForce RTX 2060 SUPER"] { assert!(super::recent_gpu(n), "{n}"); }
        for n in ["AMD Radeon RX 580 2048SP", "AMD Radeon RX 5700 XT", "NVIDIA GeForce GTX 1080 Ti", "NVIDIA GeForce GTX 1660", "Radeon RX Vega", "Intel(R) UHD Graphics 630", "AMD Radeon(TM) Graphics", "NVIDIA GeForce RTX 980"] { assert!(!super::recent_gpu(n), "{n}"); }
    }
}

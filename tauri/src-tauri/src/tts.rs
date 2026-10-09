// Texte en voix : utilise le moteur vocal intégré au système (Windows : voix modernes « OneCore » par Windows.Media.SpeechSynthesis,
// plus les anciennes voix SAPI de System.Speech ; macOS : la commande « say »). Les voix d'autres langues (hommes, femmes) s'ajoutent
// gratuitement dans les Réglages de Windows (bouton « Ajouter des voix » → ms-settings:speech).
// Rien n'est téléchargé, rien ne sort du PC. Le fichier WAV créé va dans Vidéos\DedCut\Médias.
use std::path::PathBuf;
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use tauri::AppHandle;

use super::{allow, clean_name, err, info, videos_dir, FileInfo};

#[cfg(windows)]
const NO_WINDOW: u32 = 0x0800_0000; // pas de fenêtre noire

pub(crate) fn powershell() -> Command {
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    let mut c = Command::new(PathBuf::from(root).join("System32\\WindowsPowerShell\\v1.0\\powershell.exe"));
    c.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"]);
    #[cfg(windows)]
    c.creation_flags(NO_WINDOW);
    c
}

#[derive(serde::Serialize)]
pub(crate) struct Voice { name: String, lang: String, gender: String }

/// Voix installées dans Windows (nom, langue, genre)
#[tauri::command]
pub(crate) async fn tts_voices() -> Result<Vec<Voice>, String> {
    if cfg!(target_os = "macos") { return tauri::async_runtime::spawn_blocking(mac_voices).await.map_err(err)?; }
    tauri::async_runtime::spawn_blocking(|| {
        // voix modernes (OneCore) d'abord, puis les anciennes (SAPI) qui ne sont pas déjà dans la liste
        let script = r#"[Console]::OutputEncoding=[Text.Encoding]::UTF8
try{$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime];[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices|ForEach-Object{'OC|'+$_.DisplayName+'|'+$_.Language+'|'+$_.Gender}}catch{}
try{Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$s.GetInstalledVoices()|Where-Object{$_.Enabled}|ForEach-Object{$v=$_.VoiceInfo;'SAPI|'+$v.Name+'|'+$v.Culture.Name+'|'+$v.Gender};$s.Dispose()}catch{}"#;
        let out = powershell().arg(script).output().map_err(err)?;
        let mut list: Vec<Voice> = Vec::new();
        for l in String::from_utf8_lossy(&out.stdout).lines() {
            let f: Vec<&str> = l.trim().splitn(4, '|').collect();
            if f.len() < 4 || f[1].trim().is_empty() { continue; }
            let name = f[1].trim().to_string();
            // « Microsoft Hortense Desktop » (SAPI) = « Microsoft Hortense » (OneCore) : gardée une seule fois
            if f[0] == "SAPI" && list.iter().any(|v| v.name == name.trim_end_matches(" Desktop")) { continue; }
            if list.iter().any(|v| v.name == name) { continue; }
            list.push(Voice { name, lang: f[2].trim().to_string(), gender: f[3].trim().to_string() });
        }
        if list.is_empty() && !out.status.success() { return Err(String::from_utf8_lossy(&out.stderr).trim().to_string()); }
        Ok(list)
    }).await.map_err(err)?
}

/// Lit le texte avec la voix choisie et l'enregistre en WAV dans Vidéos\DedCut\Médias
#[tauri::command]
pub(crate) async fn tts_make(app: AppHandle, text: String, voice: String, rate: i32, name: String) -> Result<FileInfo, String> {
    let text = text.trim().to_string();
    if text.is_empty() { return Err("empty".into()); }
    let dir = videos_dir(&app)?.join("Médias");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let stem = clean_name(&name, "voix");
    let mut out = dir.join(format!("{stem}.wav"));
    let mut n = 2;
    while out.exists() { out = dir.join(format!("{stem} ({n}).wav")); n += 1; }
    let txt = std::env::temp_dir().join(format!("dedcut-tts-{}.txt", std::process::id()));
    std::fs::write(&txt, text.as_bytes()).map_err(err)?;
    let out2 = out.clone();
    let mac = cfg!(target_os = "macos");
    let res = tauri::async_runtime::spawn_blocking(move || {
        if mac {
            // say : vitesse en mots par minute (175 = normal), sortie WAV 16 bits
            let mut c = Command::new("/usr/bin/say");
            if !voice.trim().is_empty() { c.args(["-v", voice.trim()]); }
            return c.args(["-r", &(175 + rate.clamp(-10, 10) * 15).to_string(), "--file-format=WAVE", "--data-format=LEI16@22050", "-o"]).arg(&out2).arg("-f").arg(&txt)
                .output().map_err(err);
        }
        // voix moderne (OneCore) si le nom en est une, sinon ancienne voix (SAPI) ; vitesse -10..10 → 0,5..3 fois
        let script = r#"$t=[IO.File]::ReadAllText($env:DC_TXT,[Text.Encoding]::UTF8);$v=$null
try{$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime];$v=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices|Where-Object{$_.DisplayName -eq $env:DC_VOICE}|Select-Object -First 1}catch{}
if($v){
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0].MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $s=New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer;$s.Voice=$v
  $s.Options.SpeakingRate=[Math]::Min(3,[Math]::Max(0.5,[Math]::Pow(2,[double]$env:DC_RATE/6)))
  $task=$m.Invoke($null,@($s.SynthesizeTextToStreamAsync($t)));$null=$task.Wait(-1);$st=$task.Result
  $rs=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($st);$fs=[IO.File]::Create($env:DC_OUT);$rs.CopyTo($fs);$fs.Close();$rs.Dispose();$s.Dispose()
}else{
  Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;if($env:DC_VOICE){try{$s.SelectVoice($env:DC_VOICE)}catch{}};$s.Rate=[int]$env:DC_RATE;$s.SetOutputToWaveFile($env:DC_OUT);$s.Speak($t);$s.Dispose()
}"#;
        powershell().arg(script)
            .env("DC_VOICE", &voice).env("DC_RATE", rate.clamp(-10, 10).to_string())
            .env("DC_OUT", &out2).env("DC_TXT", &txt)
            .output().map_err(err)
    }).await.map_err(err)?;
    let _ = std::fs::remove_file(std::env::temp_dir().join(format!("dedcut-tts-{}.txt", std::process::id())));
    let o = res?;
    if !o.status.success() || !out.exists() { return Err(String::from_utf8_lossy(&o.stderr).trim().to_string()); }
    allow(&app, &out);
    Ok(info(&out))
}

/// Ouvre la page « Voix » des Réglages de Windows : on y ajoute gratuitement des voix d'autres langues (hommes, femmes)
#[tauri::command]
pub(crate) fn tts_settings() -> Result<(), String> {
    if !cfg!(windows) { return Err("unsupported".into()); }
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    Command::new(PathBuf::from(root).join("explorer.exe")).arg("ms-settings:speech").spawn().map_err(err)?;
    Ok(())
}

/// Voix de macOS : « say -v ? » donne une ligne par voix, par ex. « Thomas   fr_FR   # Bonjour… »
fn mac_voices() -> Result<Vec<Voice>, String> {
    let out = Command::new("/usr/bin/say").args(["-v", "?"]).output().map_err(err)?;
    if !out.status.success() { return Err(String::from_utf8_lossy(&out.stderr).trim().to_string()); }
    Ok(String::from_utf8_lossy(&out.stdout).lines().filter_map(|l| {
        let head = l.split('#').next()?.trim();
        let toks: Vec<&str> = head.split_whitespace().collect();
        let i = toks.iter().rposition(|t| { let b = t.as_bytes(); b.len() >= 5 && b[2] == b'_' && b[..2].iter().all(|c| c.is_ascii_lowercase()) })?;
        let name = toks[..i].join(" ");
        if name.is_empty() { return None; }
        Some(Voice { name, lang: toks[i].replace('_', "-"), gender: String::new() })
    }).collect())
}

/* ---------- voix du live : un seul PowerShell reste ouvert pendant le live (réponse rapide), rien n'est écrit dans Médias ----------
   La page envoie une ligne JSON {t: texte, v: voix, r: vitesse} ; PowerShell répond « OK:<WAV en base64> » ou « ERR ».
   Quand DedCut se ferme, l'entrée se ferme et PowerShell s'arrête tout seul. */
use std::io::{BufRead, BufReader, Write as _};
use std::process::{Child, ChildStdin, ChildStdout, Stdio};
use std::sync::{Arc, Mutex};

pub(crate) struct LiveProc { child: Child, stdin: ChildStdin, out: BufReader<ChildStdout> }
#[derive(Default)]
pub(crate) struct LiveTts(Arc<Mutex<Option<LiveProc>>>);

const LIVE_SCRIPT: &str = r#"[Console]::InputEncoding=[Text.Encoding]::UTF8
$oc=$false;try{$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime];Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0].MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$s=New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer;$all=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices;$oc=$true}catch{}
Add-Type -AssemblyName System.Speech
while($null -ne ($l=[Console]::In.ReadLine())){
  try{$j=$l|ConvertFrom-Json;$ms=New-Object IO.MemoryStream
    $v=$null;if($oc){$v=$all|Where-Object{$_.DisplayName -eq $j.v}|Select-Object -First 1;if(-not $v -and -not $j.v){$v=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::DefaultVoice}}
    if($v){$s.Voice=$v;$s.Options.SpeakingRate=[Math]::Min(3,[Math]::Max(0.5,[Math]::Pow(2,[double]$j.r/6)))
      $task=$m.Invoke($null,@($s.SynthesizeTextToStreamAsync([string]$j.t)));$null=$task.Wait(-1);$st=$task.Result
      $rs=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($st);$rs.CopyTo($ms);$rs.Dispose()}
    else{$p=New-Object System.Speech.Synthesis.SpeechSynthesizer;if($j.v){try{$p.SelectVoice($j.v)}catch{}};$p.Rate=[int]$j.r;$p.SetOutputToWaveStream($ms);$p.Speak([string]$j.t);$p.Dispose()}
    [Console]::Out.WriteLine('OK:'+[Convert]::ToBase64String($ms.ToArray()))}catch{[Console]::Out.WriteLine('ERR')}
  [Console]::Out.Flush()
}"#;

fn live_spawn() -> Result<LiveProc, String> {
    let mut c = powershell();
    let mut child = c.arg(LIVE_SCRIPT).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).spawn().map_err(err)?;
    let stdin = child.stdin.take().ok_or("stdin")?;
    let out = BufReader::new(child.stdout.take().ok_or("stdout")?);
    Ok(LiveProc { child, stdin, out })
}

/// Lit un texte pour le live : renvoie le son (WAV) en base64, sans créer de fichier
#[tauri::command]
pub(crate) async fn tts_live(st: tauri::State<'_, LiveTts>, text: String, voice: String, rate: i32) -> Result<String, String> {
    if !cfg!(windows) { return Err("unsupported".into()); }
    let text: String = text.chars().filter(|c| !c.is_control()).take(400).collect();
    if text.trim().is_empty() { return Err("empty".into()); }
    let arc = st.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut g = arc.lock().map_err(|_| "tts".to_string())?;
        let line = serde_json::json!({ "t": text, "v": voice, "r": rate.clamp(-10, 10) }).to_string();
        for _ in 0..2 {
            if g.is_none() { *g = Some(live_spawn()?); }
            let p = g.as_mut().unwrap();
            if writeln!(p.stdin, "{line}").is_ok() && p.stdin.flush().is_ok() {
                let mut s = String::new();
                if p.out.read_line(&mut s).map(|n| n > 0).unwrap_or(false) {
                    let s = s.trim();
                    return if let Some(b) = s.strip_prefix("OK:") { Ok(b.to_string()) } else { Err("tts".into()) };
                }
            }
            // PowerShell s'est arrêté : on le relance une fois
            if let Some(mut p) = g.take() { let _ = p.child.kill(); }
        }
        Err("tts".into())
    }).await.map_err(err)?
}

// Connecteur IA (protocole MCP) pour Claude Desktop ou tout logiciel compatible MCP.
// 1) Claude Desktop lance « dedcut.exe --mcp » : ce relais lit les demandes sur l'entrée standard (JSON-RPC, une ligne par message)
//    et les transmet au DedCut ouvert.
// 2) Le DedCut ouvert n'écoute que si l'utilisateur a activé « Connecteur IA » : adresse 127.0.0.1 (ce PC seulement),
//    port au hasard, jeton secret écrit dans %APPDATA%\DedCut\mcp.json. Rien ne passe par internet.
// 3) Le moteur (engine.js) exécute l'action et renvoie le résultat ; chaque action s'annule avec Ctrl+Z.
use std::collections::HashMap;
use std::hash::BuildHasher;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

use super::err;

pub(crate) fn info_file() -> PathBuf {
    if let Ok(p) = std::env::var("DEDCUT_MCP_FILE") { return PathBuf::from(p); }
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    PathBuf::from(base).join("DedCut").join("mcp.json")
}

fn new_token() -> String {
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let a = std::collections::hash_map::RandomState::new().hash_one((t, std::process::id()));
    let b = std::collections::hash_map::RandomState::new().hash_one((a, t ^ 0x9e37_79b9));
    format!("{a:016x}{b:016x}")
}

#[derive(Default)]
struct Inner { on: bool, token: String, next: u64, calls: u64, waiting: HashMap<u64, mpsc::Sender<Value>>, stop: Option<Arc<AtomicBool>> }

#[derive(Default)]
pub(crate) struct McpState(Arc<Mutex<Inner>>);

/// Une demande HTTP minimale : en-têtes + corps (Content-Length)
fn read_request(s: &mut TcpStream) -> Option<(String, String)> {
    let mut r = BufReader::new(s.try_clone().ok()?);
    let (mut len, mut token, mut line) = (0usize, String::new(), String::new());
    loop {
        line.clear();
        if r.read_line(&mut line).ok()? == 0 { return None; }
        let l = line.trim_end();
        if l.is_empty() { break; }
        if let Some((k, v)) = l.split_once(':') {
            let k = k.trim().to_ascii_lowercase();
            if k == "content-length" { len = v.trim().parse().unwrap_or(0); }
            if k == "x-dedcut-token" { token = v.trim().to_string(); }
        }
    }
    if len > 8 * 1024 * 1024 { return None; }
    let mut body = vec![0u8; len];
    r.read_exact(&mut body).ok()?;
    Some((token, String::from_utf8_lossy(&body).into_owned()))
}

fn answer(s: &mut TcpStream, code: &str, body: &str) {
    let _ = write!(s, "HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
}

fn serve(app: AppHandle, st: Arc<Mutex<Inner>>, mut s: TcpStream) {
    let _ = s.set_read_timeout(Some(Duration::from_secs(10)));
    let Some((token, body)) = read_request(&mut s) else { return };
    let ok = { let i = st.lock().unwrap(); i.on && !i.token.is_empty() && token == i.token };
    if !ok { answer(&mut s, "403 Forbidden", "{\"error\":\"token\"}"); return; }
    let req: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
    let (tx, rx) = mpsc::channel();
    let id = { let mut i = st.lock().unwrap(); i.next += 1; i.calls += 1; let id = i.next; i.waiting.insert(id, tx); id };
    let _ = app.emit("mcp-call", json!({ "id": id, "tool": req["tool"], "args": req["args"] }));
    let res = rx.recv_timeout(Duration::from_secs(180)).unwrap_or_else(|_| json!({ "error": "DedCut n'a pas répondu à temps." }));
    st.lock().unwrap().waiting.remove(&id);
    answer(&mut s, "200 OK", &res.to_string());
}

/// Active / désactive l'écoute locale
#[tauri::command]
pub(crate) fn mcp_enable(app: AppHandle, state: State<'_, McpState>, on: bool) -> Result<Value, String> {
    let st = state.0.clone();
    let mut i = st.lock().unwrap();
    if on && !i.on {
        let l = TcpListener::bind("127.0.0.1:0").map_err(err)?;
        let port = l.local_addr().map_err(err)?.port();
        l.set_nonblocking(true).map_err(err)?;
        i.token = new_token();
        let stop = Arc::new(AtomicBool::new(false));
        i.stop = Some(stop.clone());
        let f = info_file();
        if let Some(d) = f.parent() { let _ = std::fs::create_dir_all(d); }
        std::fs::write(&f, json!({ "port": port, "token": i.token, "pid": std::process::id() }).to_string()).map_err(err)?;
        i.on = true;
        let (app2, st2) = (app.clone(), st.clone());
        std::thread::spawn(move || {
            while !stop.load(Ordering::Relaxed) {
                match l.accept() {
                    Ok((s, _)) => { let _ = s.set_nonblocking(false); let (a, b) = (app2.clone(), st2.clone()); std::thread::spawn(move || serve(a, b, s)); }
                    Err(_) => std::thread::sleep(Duration::from_millis(40)),
                }
            }
        });
    } else if !on && i.on {
        if let Some(s) = i.stop.take() { s.store(true, Ordering::Relaxed); }
        i.on = false;
        i.token.clear();
        let _ = std::fs::remove_file(info_file());
    }
    Ok(json!({ "on": i.on, "calls": i.calls }))
}

/// Réponse du moteur à une demande
#[tauri::command]
pub(crate) fn mcp_reply(state: State<'_, McpState>, id: u64, result: Value) {
    if let Some(tx) = state.0.lock().unwrap().waiting.remove(&id) { let _ = tx.send(result); }
}

fn claude_config() -> PathBuf {
    let roaming = PathBuf::from(std::env::var("APPDATA").unwrap_or_default()).join("Claude");
    if roaming.exists() { return roaming.join("claude_desktop_config.json"); }
    // version Microsoft Store de Claude Desktop
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        if let Ok(rd) = std::fs::read_dir(PathBuf::from(local).join("Packages")) {
            for e in rd.flatten() {
                let n = e.file_name().to_string_lossy().to_lowercase();
                if n.starts_with("claude") {
                    let p = e.path().join("LocalCache").join("Roaming").join("Claude");
                    if p.exists() { return p.join("claude_desktop_config.json"); }
                }
            }
        }
    }
    roaming.join("claude_desktop_config.json")
}

fn server_entry() -> Value {
    let exe = std::env::current_exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_else(|_| "dedcut.exe".into());
    json!({ "command": exe, "args": ["--mcp"] })
}

#[tauri::command]
pub(crate) fn mcp_status(state: State<'_, McpState>) -> Value {
    let i = state.0.lock().unwrap();
    let cfg = claude_config();
    let installed = std::fs::read_to_string(&cfg).ok().and_then(|t| serde_json::from_str::<Value>(&t).ok()).map(|v| !v["mcpServers"]["dedcut"].is_null()).unwrap_or(false);
    json!({ "on": i.on, "calls": i.calls, "claude": installed, "config": json!({ "mcpServers": { "dedcut": server_entry() } }).to_string() })
}

/// Ajoute DedCut dans la configuration de Claude Desktop (sans toucher au reste du fichier)
#[tauri::command]
pub(crate) fn mcp_install_claude() -> Result<String, String> {
    let f = claude_config();
    let mut v: Value = std::fs::read_to_string(&f).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_else(|| json!({}));
    if !v.is_object() { return Err("claude_desktop_config.json".into()); }
    if !v["mcpServers"].is_object() { v["mcpServers"] = json!({}); }
    v["mcpServers"]["dedcut"] = server_entry();
    if let Some(d) = f.parent() { std::fs::create_dir_all(d).map_err(err)?; }
    if f.exists() { let _ = std::fs::copy(&f, f.with_extension("json.avant-dedcut")); }
    std::fs::write(&f, serde_json::to_string_pretty(&v).map_err(err)?).map_err(err)?;
    Ok(f.to_string_lossy().into_owned())
}

/* ---------- relais lancé par Claude Desktop : dedcut.exe --mcp ---------- */

fn tool(name: &str, desc: &str, props: Value, req: &[&str]) -> Value {
    json!({ "name": name, "description": desc, "inputSchema": { "type": "object", "properties": props, "required": req } })
}

pub(crate) fn tools() -> Value {
    let id = json!({ "type": "integer", "description": "Clip id (from get_project)" });
    let t = json!({ "type": "number", "description": "Time in seconds on the timeline" });
    json!([
        tool("get_project", "Describe the open DedCut project: format, duration, tracks, clips (id, kind, start, duration, media, text, element), media library, markers. Call this first.", json!({}), &[]),
        tool("get_capabilities", "List what can be used: templates, animated elements and their styles/props, text styles, effects, transitions, speed ramps, voices.", json!({}), &[]),
        tool("import_media", "Import video, image or audio files from absolute Windows paths into the media library.", json!({ "paths": { "type": "array", "items": { "type": "string" } } }), &["paths"]),
        tool("add_clip", "Put a media from the library on the timeline. overlay=true puts it on a layer (picture-in-picture).", json!({ "media_id": { "type": "integer" }, "start": t, "duration": { "type": "number" }, "overlay": { "type": "boolean" } }), &["media_id"]),
        tool("add_text", "Add a text/title clip.", json!({ "text": { "type": "string" }, "start": t, "duration": { "type": "number" }, "style": { "type": "string", "description": "Text style id from get_capabilities" }, "y": { "type": "number", "description": "Vertical position 0-100 (%)" }, "size": { "type": "number", "description": "Text height in % of the frame height" } }), &["text"]),
        tool("add_element", "Add an animated element (progress bar, countdown, subscribe button, lower third, counter, chart, ticker, blur area...).", json!({ "kind": { "type": "string" }, "style": { "type": "string" }, "start": t, "duration": { "type": "number" }, "props": { "type": "object", "description": "Element properties from get_capabilities (x, y, text, color...)" } }), &["kind"]),
        tool("add_template", "Insert a ready-made template (several grouped elements).", json!({ "name": { "type": "string" }, "start": t }), &["name"]),
        tool("update_clip", "Change a clip: start, duration, volume (0-400), speed (0.1-8), text, or other properties.", json!({ "id": id, "start": t, "duration": { "type": "number" }, "volume": { "type": "number" }, "speed": { "type": "number" }, "text": { "type": "string" }, "props": { "type": "object" } }), &["id"]),
        tool("delete_clips", "Delete clips by id.", json!({ "ids": { "type": "array", "items": { "type": "integer" } } }), &["ids"]),
        tool("split_clip", "Cut a clip in two at a time (default: the video clip under that time).", json!({ "time": t, "id": id }), &["time"]),
        tool("set_transition", "Set the entry and/or exit transition of a clip.", json!({ "id": id, "in": { "type": "string" }, "out": { "type": "string" }, "duration": { "type": "number" } }), &["id"]),
        tool("set_effects", "Replace the visual effects of a clip (effect ids from get_capabilities; empty list removes all).", json!({ "id": id, "effects": { "type": "array", "items": { "type": "string" } }, "intensity": { "type": "number" } }), &["id", "effects"]),
        tool("remove_silences", "Detect and cut the silences of a video or sound clip.", json!({ "id": id, "sensitivity": { "type": "string", "enum": ["sensitive", "normal", "strong"] }, "min_silence": { "type": "number" }, "margin": { "type": "number" } }), &["id"]),
        tool("speed_ramp", "Apply a speed ramp preset to a video clip.", json!({ "id": id, "preset": { "type": "string" } }), &["id", "preset"]),
        tool("add_voiceover", "Create a voice-over with the Windows voices (text to speech, offline) and put it on an audio track. Voice names come from get_capabilities.", json!({ "text": { "type": "string" }, "start": t, "voice": { "type": "string" }, "rate": { "type": "number", "description": "Speed from -10 (slow) to 10 (fast), 0 = normal" } }), &["text"]),
        tool("generate_video", "Generate a short AI video clip on this PC (local model, slow: about 2-3 minutes per 2 seconds) from an English description, optionally animating an image of the project (walk, turn the head, clothes moving...). The clip is added at the playhead. Experimental: it can fail or give strange results, and it is blocked on PCs that are not powerful enough. Only use it when the user asks.", json!({ "prompt": { "type": "string", "description": "What happens in the video, in English, detailed" }, "image_media_id": { "type": "integer", "description": "Optional image media id to animate" }, "seconds": { "type": "number", "description": "2, 5, 10 or 15" }, "style": { "type": "string", "enum": ["cartoon", "real", "anime", "clay", "draw", "none"] }, "format": { "type": "string", "enum": ["landscape", "portrait", "square"] } }), &["prompt"]),
        tool("add_markers", "Add timeline markers at given times.", json!({ "times": { "type": "array", "items": { "type": "number" } } }), &["times"]),
        tool("add_music", "Add a royalty-free background music from the start of the video, looped until the end. Pick the mood that fits the video. A real public-domain song is downloaded if possible, otherwise DedCut composes one (works offline). Volume 0-100 (default: 30 under speech, 80 otherwise).", json!({ "mood": { "type": "string", "enum": ["vlog", "happy", "dance", "hiphop", "epic", "game", "sad", "calm", "jazz", "rock", "scary", "xmas", "kids", "electro", "world"] }, "volume": { "type": "number" } }), &["mood"]),
        tool("beat_markers", "Put markers on the beats of a music clip.", json!({ "id": id }), &["id"]),
        tool("undo", "Undo the last change.", json!({}), &[]),
        tool("seek", "Move the playhead to show a moment to the user.", json!({ "time": t }), &["time"]),
        tool("open_export", "Open the export window so the user can export the video.", json!({}), &[]),
        // v4.50 : les autres espaces de DedCut (Image, Musique, studio Enregistrer / Live) et la miniature
        tool("get_space", "Which DedCut space is open (edit = video editing, rec = screen recording studio, live = live streaming studio, image = photo editing, music = music creation) and what is open there.", json!({}), &[]),
        tool("switch_space", "Open another DedCut space.", json!({ "space": { "type": "string", "enum": ["edit", "rec", "live", "image", "music"] } }), &["space"]),
        tool("make_thumbnail", "Make a thumbnail for the video: DedCut picks the best moments of the edit (sharp, colorful, clear face) and builds an editable thumbnail in the Image space. Opens a window where the user picks the moment; auto=true uses the best moment directly.", json!({ "title": { "type": "string", "description": "Short punchy title, 2 to 5 words" }, "style": { "type": "string", "enum": ["gaming", "vlog", "tuto", "clean"] }, "format": { "type": "string", "enum": ["yt", "vertical", "square"] }, "auto": { "type": "boolean" } }), &[]),
        // v4.55 : Shorts automatiques et traduction des sous-titres
        tool("make_shorts", "Make vertical Shorts (TikTok, YouTube Shorts, Reels) from the best moments of a long video: DedCut finds lively, talkative passages that start and end on full sentences, then makes one vertical project per Short (frame following the face, subtitles kept). Opens a window where the user checks the moments. Subtitles made first help a lot.", json!({ "length": { "type": "string", "enum": ["short", "medium", "long"], "description": "short = 15-30 s, medium = 30-60 s, long = 60-90 s" }, "count": { "type": "integer", "description": "How many Shorts, 1 to 5" } }), &[]),
        tool("write_description", "Write YouTube metadata for the video from what is said in it (subtitles, or the edit-by-text transcript) and the chapters (markers): 3 title ideas, a description and hashtags. Uses the DedCut AI brain on this PC (or the assistant's AI); without AI, a simple local text.", json!({}), &[]),
        tool("add_qr_code", "Add a QR code that viewers scan with their phone (channel, social network, website...). In the edit (an element at the playhead) or in the live studio (a source).", json!({ "text": { "type": "string", "description": "link or text, e.g. https://youtube.com/@name" }, "caption": { "type": "string", "description": "short line under the code, e.g. Scan me" }, "style": { "type": "string", "enum": ["qcard", "qsq", "qdot"] }, "space": { "type": "string", "enum": ["edit", "live"] } }), &["text"]),
        tool("translate_subtitles", "Translate the subtitles of the video into another language (the DedCut AI brain on this PC, or the AI chosen in the assistant). Opens the Subtitles tab and starts the translation.", json!({ "language": { "type": "string", "description": "Target language code: en, fr, es, de, it, pt, nl, pl, ru, uk, tr, ar, he, hi, id, vi, th, ja, ko, zh, sv, da, no, fi, cs, el, ro, hu" }, "both": { "type": "boolean", "description": "true = keep the original line above the translation" } }), &["language"]),
        // v4.56 : stabiliser une vidéo filmée à la main
        tool("stabilize_video", "Stabilize a shaky video clip (handheld camera): DedCut measures the camera shake on this PC and smooths it, with a small zoom to hide the edges. Without id: the selected video clip, else the longest one.", json!({ "id": { "type": "integer" }, "strength": { "type": "string", "enum": ["light", "normal", "strong"] }, "remove": { "type": "boolean", "description": "true = remove the stabilization" } }), &[]),
        tool("edit_by_text", "Open the edit-by-text window: DedCut writes what is said in the clips (speech recognition on this PC) and the user deletes words to cut the video at the same place (everything after moves back, subtitles follow). Without id: the whole video.", json!({ "id": { "type": "integer", "description": "only this clip (get_project)" } }), &[]),
        tool("remove_fillers", "Remove hesitations from speech: filler words (uh, um, euh...) and sounds without words between words. Cuts the video there; everything after moves back and auto subtitles are remade. Needs a speech recognition model (Edit > Subtitles). Without id: the whole video.", json!({ "id": { "type": "integer" } }), &[]),
        tool("shorten_pauses", "Shorten long pauses between words (keeps about 0.3 s) using the speech recognition of the clips. Without id: the whole video.", json!({ "id": { "type": "integer" } }), &[]),
        // v4.57 : multicam (plusieurs caméras du même moment, calées par le son)
        tool("make_multicam", "Make a multicam from 2 to 4 video clips filmed at the same time: DedCut syncs them by their sound and puts each angle on its own video track; angle 1 (the longest) keeps its sound. Without ids: the selected clips.", json!({ "ids": { "type": "array", "items": { "type": "integer" } } }), &[]),
        tool("auto_multicam", "Automatic multicam: in an existing multicam (make_multicam first), DedCut listens to each camera's microphone and shows the camera of the person who is speaking, with a minimum shot length. Nothing is deleted (angles are hidden / shown, undo works).", json!({ "rhythm": { "type": "string", "enum": ["calm", "normal", "fast"], "description": "calm = long shots, fast = quick cuts" }, "wide_shots": { "type": "boolean", "description": "use angle 1 (wide shot) when nobody clearly speaks and now and then on long shots" } }), &[]),
        tool("track_object", "Make an overlay element (text, sticker, shape, blur zone...) follow a moving object: the element must be placed over the object at the playhead (or give time). DedCut tracks it on this PC and writes position keyframes (10 per second) until the object is lost or the element ends.", json!({ "id": { "type": "integer", "description": "overlay element id (get_project)" }, "time": { "type": "number", "description": "start time in seconds (playhead)" } }), &[]),
        tool("add_moving_blur", "Add a pixelated blur zone at the playhead (to hide a licence plate, a face, a screen...). Then move it over the object (update_clip p.x / p.y in %) and call track_object with its id.", json!({ "time": { "type": "number" } }), &[]),
        tool("switch_angle", "Multicam: from the playhead (or from time, in seconds), show this camera angle until the next cut. Nothing is deleted.", json!({ "angle": { "type": "integer", "description": "1 to 4" }, "time": { "type": "number" } }), &["angle"]),
        tool("image_info", "Image space: open pictures, current picture (size, layers), presets and looks.", json!({}), &[]),
        tool("image_new", "Image space: create a new picture (thumb = YouTube thumbnail 1280x720, post = square 1080, portrait = 1080x1350, story = 1080x1920, banner = channel banner, header, poster, flyer, hd, uhd, icon, card).", json!({ "preset": { "type": "string", "enum": ["thumb", "post", "portrait", "story", "banner", "header", "poster", "flyer", "hd", "uhd", "icon", "card"] }, "name": { "type": "string" } }), &["preset"]),
        tool("image_enhance", "Image space: automatic enhancement of the current picture (levels, color balance, vibrance).", json!({}), &[]),
        tool("image_remove_background", "Image space: remove the background of the current picture (editable mask, made on this PC).", json!({}), &[]),
        tool("image_add_text", "Image space: add a text layer to the current picture.", json!({ "text": { "type": "string" }, "size": { "type": "string", "enum": ["title", "normal"] }, "color": { "type": "string", "description": "#rrggbb" } }), &["text"]),
        tool("image_look", "Image space: add a color look (adjustment layer) to the current picture.", json!({ "look": { "type": "string", "enum": ["bw", "sepia", "vivid", "warm", "cool", "vintage"] } }), &["look"]),
        tool("image_export", "Image space: open the export window so the user can save the picture (PNG, JPEG, WebP...).", json!({}), &[]),
        tool("music_info", "Music space: project name, tempo, key and tracks.", json!({}), &[]),
        tool("music_new", "Music space: start a new music project from a template (the previous project stays in the automatic backup).", json!({ "template": { "type": "string", "enum": ["beat", "song", "instrumental", "video", "voice", "empty"] }, "name": { "type": "string" }, "bpm": { "type": "number" }, "key": { "type": "string", "description": "C, C#, D ... B" }, "scale": { "type": "string", "enum": ["major", "minor"] } }), &["template"]),
        tool("music_set_tempo", "Music space: change the tempo (40 to 240 BPM).", json!({ "bpm": { "type": "number" } }), &["bpm"]),
        tool("music_set_key", "Music space: change the key and the scale.", json!({ "key": { "type": "string" }, "scale": { "type": "string", "enum": ["major", "minor"] } }), &["key"]),
        tool("music_add_track", "Music space: add a drums, instrument or audio track.", json!({ "kind": { "type": "string", "enum": ["drums", "instrument", "audio"] }, "instrument": { "type": "string", "enum": ["basic", "pluck", "keys", "organ", "strings", "brass"] } }), &["kind"]),
        tool("music_ideas", "Music space: open the ideas window (melodies, chords, drums, analysis), made on this PC.", json!({}), &[]),
        tool("music_export", "Music space: open the audio export window (WAV, FLAC, M4A, separate tracks).", json!({}), &[]),
        tool("studio_info", "Record / Live studio: scenes and their sources.", json!({}), &[]),
        tool("studio_add", "Record / Live studio: add a source to the current scene (screen opens DedCut's share window). Starting a recording or a live stream is ALWAYS done by the user.", json!({ "kind": { "type": "string", "enum": ["screen", "webcam", "image", "text", "banner", "chat", "alerts", "timer", "badge", "color", "video", "overlay"] }, "text": { "type": "string" }, "style": { "type": "string", "description": "overlay only: cam-* webcam frames, lt-* name lower thirds, ec-* waiting screens, bd-* screen borders, rp-* reminders (subscribe, like, live, socials, thanks), am-* ambiences (snow, hearts, sparkles, confetti, light), gm-* action game in a neon city (gm-hud game interface with minimap, stars and money; gm-mission big mission complete title; gm-screen neon sunset waiting screen; gm-cam phone webcam frame; gm-stars wanted stars)", "enum": ["cam-neon", "cam-angles", "cam-degrade", "cam-double", "cam-pixel", "lt-simple", "lt-neon", "lt-degrade", "lt-tech", "lt-ruban", "ec-aurore", "ec-grille", "ec-points", "ec-vagues", "ec-bulles", "bd-neon", "bd-coins", "bd-cinema", "bd-tournant", "bd-hud", "rp-abonne", "rp-like", "rp-direct", "rp-reseaux", "rp-merci", "am-neige", "am-coeurs", "am-etincelles", "am-confettis", "am-lumiere", "gm-hud", "gm-mission", "gm-screen", "gm-cam", "gm-stars"] } }), &["kind"]),
        tool("studio_scene", "Record / Live studio: switch to a scene (index from studio_info).", json!({ "index": { "type": "integer" } }), &["index"])
    ])
}

fn forward(tool: &str, args: &Value) -> Result<Value, String> {
    let info: Value = std::fs::read_to_string(info_file()).ok().and_then(|t| serde_json::from_str(&t).ok()).ok_or("off")?;
    let port = info["port"].as_u64().ok_or("off")? as u16;
    let token = info["token"].as_str().unwrap_or("");
    let mut s = TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_secs(3)).map_err(|_| "off".to_string())?;
    s.set_read_timeout(Some(Duration::from_secs(200))).map_err(err)?;
    let body = json!({ "tool": tool, "args": args }).to_string();
    write!(s, "POST /call HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nX-DedCut-Token: {token}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).map_err(err)?;
    let mut raw = String::new();
    s.read_to_string(&mut raw).map_err(err)?;
    let (head, body) = raw.split_once("\r\n\r\n").ok_or("réponse invalide")?;
    if head.contains(" 403 ") { return Err("off".into()); }
    serde_json::from_str(body).map_err(err)
}

pub fn run_stdio() {
    let stdin = std::io::stdin();
    let mut out = std::io::stdout();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        let Ok(msg) = serde_json::from_str::<Value>(line.trim()) else { continue };
        let Some(id) = msg.get("id").cloned() else { continue }; // notification : pas de réponse
        let method = msg["method"].as_str().unwrap_or("");
        let result = match method {
            "initialize" => json!({
                "protocolVersion": msg["params"]["protocolVersion"].as_str().unwrap_or("2025-06-18"),
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "dedcut", "version": env!("CARGO_PKG_VERSION") },
                "instructions": "DedCut is a local video editor. Call get_project first, then get_capabilities. Times are in seconds. Every change can be undone by the user (Ctrl+Z). Never invent media ids or clip ids: read them from get_project."
            }),
            "ping" => json!({}),
            "tools/list" => json!({ "tools": tools() }),
            "tools/call" => {
                let name = msg["params"]["name"].as_str().unwrap_or("");
                let args = msg["params"].get("arguments").cloned().unwrap_or(json!({}));
                match forward(name, &args) {
                    Ok(v) => {
                        let is_err = v.get("error").is_some();
                        json!({ "content": [{ "type": "text", "text": v.to_string() }], "isError": is_err })
                    }
                    Err(e) => {
                        let text = if e == "off" { "DedCut n'est pas ouvert ou le connecteur IA est désactivé. Ouvre DedCut puis Menu > Connecteur IA > Activer. (DedCut is not open or its AI connector is off.)".to_string() } else { e };
                        json!({ "content": [{ "type": "text", "text": text }], "isError": true })
                    }
                }
            }
            _ => {
                let _ = writeln!(out, "{}", json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32601, "message": "method not found" } }));
                let _ = out.flush();
                continue;
            }
        };
        let _ = writeln!(out, "{}", json!({ "jsonrpc": "2.0", "id": id, "result": result }));
        let _ = out.flush();
    }
}

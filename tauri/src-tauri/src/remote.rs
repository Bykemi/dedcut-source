// Télécommande sur le téléphone (v4.42) : petit serveur web sur le réseau local, avec la bibliothèque standard seulement.
// Le téléphone ouvre http://<adresse du PC>:<port>, tape le code PIN affiché dans DedCut, puis ses boutons sont envoyés
// à la page de DedCut (événement « remote-cmd »). L'état affiché (scènes, live, enregistrement…) vient de la page (remote_state).
// Rien ne sort du réseau local ; après 8 mauvais codes, le serveur refuse tout pendant une minute.
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::json;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub(crate) struct RemoteState(Mutex<Option<Remote>>);
struct Remote { stop: Arc<AtomicBool>, shared: Arc<Shared>, port: u16 }
struct Shared { pin: String, state: Mutex<String>, fails: Mutex<(u32, Option<Instant>)> }

fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }

/// adresse du PC sur le réseau local (aucun paquet n'est envoyé : « connect » en UDP choisit seulement la carte réseau)
fn lan_ip() -> String {
    UdpSocket::bind("0.0.0.0:0").and_then(|s| { s.connect("8.8.8.8:80")?; s.local_addr() })
        .map(|a| a.ip().to_string()).unwrap_or_else(|_| "127.0.0.1".into())
}

#[tauri::command]
pub(crate) fn remote_start(app: AppHandle, st: State<'_, RemoteState>, pin: String) -> Result<serde_json::Value, String> {
    let mut g = st.0.lock().map_err(err)?;
    if let Some(r) = g.as_ref() { return Ok(json!({ "port": r.port, "ip": lan_ip() })); }
    if pin.len() < 4 || pin.len() > 12 || !pin.chars().all(|c| c.is_ascii_digit()) { return Err("pin".into()); }
    let listener = (0..30).find_map(|i| TcpListener::bind(("0.0.0.0", 8765 + i)).ok()).ok_or("port")?;
    let port = listener.local_addr().map_err(err)?.port();
    listener.set_nonblocking(true).map_err(err)?;
    let stop = Arc::new(AtomicBool::new(false));
    let shared = Arc::new(Shared { pin, state: Mutex::new("{}".into()), fails: Mutex::new((0, None)) });
    let (s2, sh2) = (stop.clone(), shared.clone());
    std::thread::spawn(move || {
        while !s2.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => { let (app, sh) = (app.clone(), sh2.clone()); std::thread::spawn(move || { let _ = handle(stream, &app, &sh); }); }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(60)),
                Err(_) => std::thread::sleep(Duration::from_millis(250)),
            }
        }
    });
    *g = Some(Remote { stop, shared, port });
    Ok(json!({ "port": port, "ip": lan_ip() }))
}

#[tauri::command]
pub(crate) fn remote_stop(st: State<'_, RemoteState>) {
    if let Ok(mut g) = st.0.lock() { if let Some(r) = g.take() { r.stop.store(true, Ordering::Relaxed); } }
}

#[tauri::command]
pub(crate) fn remote_state(st: State<'_, RemoteState>, json: String) {
    if let Ok(g) = st.0.lock() { if let Some(r) = g.as_ref() { if let Ok(mut s) = r.shared.state.lock() { *s = json; } } }
}

fn find(h: &[u8], n: &[u8]) -> Option<usize> { h.windows(n.len()).position(|w| w == n) }
fn qparam(q: &str, k: &str) -> String {
    q.split('&').find_map(|kv| { let (a, b) = kv.split_once('=')?; if a == k { Some(b.to_string()) } else { None } }).unwrap_or_default()
}
fn pin_ok(sh: &Shared, pin: &str) -> bool {
    let mut f = match sh.fails.lock() { Ok(f) => f, Err(_) => return false };
    if let Some(t) = f.1 { if t.elapsed() < Duration::from_secs(60) { return false; } *f = (0, None); }
    if !pin.is_empty() && pin == sh.pin { f.0 = 0; true } else { f.0 += 1; if f.0 >= 8 { f.1 = Some(Instant::now()); } false }
}
fn reply(s: &mut TcpStream, code: u16, ctype: &str, body: &[u8]) -> std::io::Result<()> {
    let status = match code { 200 => "OK", 403 => "Forbidden", _ => "Not Found" };
    write!(s, "HTTP/1.1 {code} {status}\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n", body.len())?;
    s.write_all(body)?;
    s.flush()
}
fn handle(mut s: TcpStream, app: &AppHandle, sh: &Shared) -> std::io::Result<()> {
    s.set_nonblocking(false)?;
    s.set_read_timeout(Some(Duration::from_secs(5)))?;
    let (mut buf, mut tmp) = (Vec::new(), [0u8; 4096]);
    let head_end = loop {
        let n = s.read(&mut tmp)?;
        if n == 0 { return Ok(()); }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(p) = find(&buf, b"\r\n\r\n") { break p; }
        if buf.len() > 32768 { return Ok(()); }
    };
    let head = String::from_utf8_lossy(&buf[..head_end]).to_string();
    let mut lines = head.lines();
    let mut first = lines.next().unwrap_or("").split_whitespace();
    let (method, path) = (first.next().unwrap_or("").to_string(), first.next().unwrap_or("/").to_string());
    let len = lines.filter_map(|l| { let (k, v) = l.split_once(':')?; if k.trim().eq_ignore_ascii_case("content-length") { v.trim().parse::<usize>().ok() } else { None } })
        .next().unwrap_or(0).min(16384);
    let mut body = buf[head_end + 4..].to_vec();
    while body.len() < len { let n = s.read(&mut tmp)?; if n == 0 { break; } body.extend_from_slice(&tmp[..n]); }
    let (route, query) = path.split_once('?').unwrap_or((path.as_str(), ""));
    match (method.as_str(), route) {
        ("GET", "/") => reply(&mut s, 200, "text/html; charset=utf-8", PAGE.as_bytes()),
        ("GET", "/state") => {
            if !pin_ok(sh, &qparam(query, "pin")) { return reply(&mut s, 403, "text/plain", b"pin"); }
            let st = sh.state.lock().map(|x| x.clone()).unwrap_or_default();
            reply(&mut s, 200, "application/json; charset=utf-8", st.as_bytes())
        }
        ("POST", "/cmd") => {
            let v: serde_json::Value = serde_json::from_slice(&body).unwrap_or_default();
            if !pin_ok(sh, v.get("pin").and_then(|x| x.as_str()).unwrap_or("")) { return reply(&mut s, 403, "text/plain", b"pin"); }
            let _ = app.emit("remote-cmd", json!({ "cmd": v.get("cmd"), "arg": v.get("arg") }));
            reply(&mut s, 200, "text/plain", b"ok")
        }
        _ => reply(&mut s, 404, "text/plain", b"not found"),
    }
}

/// page du téléphone : les textes viennent de DedCut (dans la langue choisie), sauf l'écran du code
const PAGE: &str = r##"<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>DedCut</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}[hidden]{display:none!important}body{margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#0b0a12;color:#ececf1}
header{position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:12px 14px;background:#141220;border-bottom:1px solid #26233a;z-index:2}
header b{font-size:17px}header b i{font-style:normal;color:#a78bfa}#st{margin-left:auto;font-size:13px;color:#8d8d99}#st.live{color:#fff;background:#e11d48;padding:3px 9px;border-radius:12px}
main{padding:12px;max-width:560px;margin:0 auto}h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8d8d99;margin:18px 2px 8px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.g3{grid-template-columns:repeat(3,1fr)}
button{font:inherit;color:inherit;border:1px solid #2c2840;background:#1b1828;border-radius:12px;padding:14px 8px;font-size:15px;font-weight:600;min-height:54px}
button:active{transform:scale(.97);background:#26223a}button.on{background:#7c3aed;border-color:#8b5cf6}button.red{background:#e11d48;border-color:#f43f5e}
.ct{display:grid;grid-template-columns:54px 1fr 54px;gap:6px;align-items:center;margin-bottom:6px}.ct span{text-align:center;font-weight:700}.ct small{display:block;font-weight:400;color:#8d8d99;font-size:12px}
#pin{display:flex;flex-direction:column;align-items:center;gap:14px;padding:60px 20px}#pin input{font-size:32px;letter-spacing:.3em;text-align:center;width:220px;padding:10px;border-radius:12px;border:1px solid #2c2840;background:#1b1828;color:#fff}
#pin button{width:220px;background:#7c3aed}#err{color:#f43f5e;min-height:1em}
</style></head><body>
<header><b>Ded<i>Cut</i></b><span id="st"></span></header>
<div id="pin"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><input id="pi" type="tel" inputmode="numeric" maxlength="12" placeholder="PIN" autocomplete="off"><button id="pb">OK</button><div id="err"></div></div>
<main id="ui" hidden></main>
<script>
let pin=localStorage.getItem('dcpin')||'',S=null,busy=false;
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clock=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':':'')+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')};
async function poll(){if(!pin)return showPin();try{const r=await fetch('/state?pin='+encodeURIComponent(pin),{cache:'no-store'});if(r.status===403){localStorage.removeItem('dcpin');pin='';return showPin(true)}S=await r.json();render()}catch(e){$('#st').textContent='…'}}
function showPin(bad){$('#ui').hidden=true;$('#pin').hidden=false;$('#err').textContent=bad?'PIN ?':''}
async function cmd(c,a){if(busy)return;busy=true;try{await fetch('/cmd',{method:'POST',body:JSON.stringify({pin,cmd:c,arg:a})})}catch(e){}busy=false;setTimeout(poll,250)}
function render(){
  $('#pin').hidden=true;$('#ui').hidden=false;const L=S.l||{},st=$('#st');
  st.className=S.live&&S.live.on?'live':'';st.textContent=S.live&&S.live.on?'LIVE '+clock(S.live.el):S.rec&&S.rec.on?'REC '+clock(S.rec.el):'';
  let h='<div class="g"><button data-c="live" class="'+(S.live&&S.live.on?'red':'')+'">'+esc(S.live&&S.live.on?L.stop:L.live)+'</button><button data-c="rec" class="'+(S.rec&&S.rec.on?'red':'')+'">'+esc(S.rec&&S.rec.on?L.recStop:L.rec)+'</button></div>';
  if(S.smode)h+='<div class="g" style="margin-top:8px;grid-template-columns:1fr"><button data-c="take" class="on">'+esc(L.take)+'</button></div>';
  h+='<h3>'+esc(L.scenes)+'</h3><div class="g">'+(S.scenes||[]).map(s=>'<button data-c="scene" data-a="'+s.id+'" class="'+(s.id===S.cur?'on':'')+'">'+esc(s.n)+'</button>').join('')+'</div>';
  h+='<h3>'+esc(L.actions)+'</h3><div class="g"><button data-c="mark">'+esc(L.mark)+'</button><button data-c="replay">'+esc(L.replay)+'</button><button data-c="mute" data-a="mic" class="'+(S.mute&&S.mute.mic?'red':'')+'">'+esc(L.mic)+'</button><button data-c="mute" data-a="desk" class="'+(S.mute&&S.mute.desk?'red':'')+'">'+esc(L.desk)+'</button></div>';
  if((S.pads||[]).length)h+='<h3>'+esc(L.sb)+'</h3><div class="g g3">'+S.pads.map((p,i)=>'<button data-c="pad" data-a="'+i+'">'+esc(p)+'</button>').join('')+'</div>';
  if((S.counters||[]).length)h+='<h3>'+esc(L.counters)+'</h3>'+S.counters.map(c=>'<div class="ct"><button data-c="count" data-a="'+c.id+':-1">&minus;</button><span>'+esc(c.v)+'<small>'+esc(c.n)+'</small></span><button data-c="count" data-a="'+c.id+':1">+</button></div>').join('');
  $('#ui').innerHTML=h;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b)cmd(b.dataset.c,b.dataset.a||null)});
$('#pb').onclick=()=>{pin=$('#pi').value.trim();localStorage.setItem('dcpin',pin);poll()};
$('#pi').addEventListener('keydown',e=>{if(e.key==='Enter')$('#pb').click()});
poll();setInterval(poll,1000);
</script></body></html>"##;

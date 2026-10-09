// Direct (Live) sur YouTube, Twitch, Facebook, Kick… (v4.41) : petit client RTMP / RTMPS écrit pour DedCut.
// La page fabrique l'image (H.264, WebCodecs) et le son (AAC) et envoie ici des messages FLV déjà prêts, par paquets ;
// ce fichier ouvre la connexion, fait la poignée de main RTMP, publie le flux avec la clé de l'utilisateur
// et découpe les messages en morceaux RTMP. RTMPS : rustls + rustls-platform-verifier (certificats de Windows / macOS),
// déjà livrés avec DedCut pour les mises à jour automatiques : aucune brique nouvelle.
// La clé de stream n'est envoyée qu'au serveur choisi par l'utilisateur et n'est jamais écrite dans un journal.
use std::collections::HashMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{sync_channel, Receiver, RecvTimeoutError, SyncSender, TrySendError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tauri::ipc::Request;
use tauri::{AppHandle, Emitter, State};

use super::{err, raw_body};

trait Conn: Read + Write + Send {}
impl<T: Read + Write + Send> Conn for T {}

#[derive(Default)]
struct Stats {
    sent: AtomicU64,
    queued: AtomicU64,
}

struct Live {
    tx: SyncSender<Vec<u8>>,
    stats: Arc<Stats>,
    stop: Arc<AtomicBool>,
}

/// une connexion par destination (multistream : YouTube + Twitch… en même temps)
#[derive(Default)]
pub(crate) struct LiveState(Mutex<HashMap<u32, Live>>);

const CHUNK: usize = 4096;
const CS_CMD: u8 = 3;
const CS_AUDIO: u8 = 4;
const CS_DATA: u8 = 5;
const CS_VIDEO: u8 = 6;

struct Target {
    tls: bool,
    host: String,
    port: u16,
    app: String,
    tc_url: String,
    name: String,
}

fn bad(s: &str) -> bool {
    s.is_empty() || s.len() > 1000 || s.chars().any(|c| c.is_control() || c.is_whitespace())
}

/// rtmp(s)://serveur[:port]/application + clé (ou clé à la fin de l'adresse)
fn parse(url: &str, key: &str) -> Result<Target, String> {
    let (url, key) = (url.trim(), key.trim());
    let (tls, rest) = if let Some(r) = url.strip_prefix("rtmps://") {
        (true, r)
    } else if let Some(r) = url.strip_prefix("rtmp://") {
        (false, r)
    } else {
        return Err("url".into());
    };
    let (hostport, path) = rest.split_once('/').unwrap_or((rest, ""));
    let (host, port, explicit) = match hostport.rsplit_once(':') {
        Some((h, p)) if !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()) => (h.to_string(), p.parse::<u16>().map_err(|_| "url")?, true),
        _ => (hostport.to_string(), if tls { 443 } else { 1935 }, false),
    };
    let path = path.trim_end_matches('/');
    let (app, name) = if key.is_empty() {
        match path.rsplit_once('/') {
            Some((a, n)) => (a.to_string(), n.to_string()),
            None => return Err("key".into()),
        }
    } else {
        (path.to_string(), key.to_string())
    };
    if bad(&host) || bad(&app) { return Err("url".into()); }
    if bad(&name) { return Err("key".into()); }
    let tc_url = format!("{}://{}{}/{}", if tls { "rtmps" } else { "rtmp" }, host, if explicit { format!(":{port}") } else { String::new() }, app);
    Ok(Target { tls, host, port, app, tc_url, name })
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn tls(tcp: TcpStream, host: &str) -> Result<Box<dyn Conn>, String> {
    use rustls_platform_verifier::BuilderVerifierExt;
    let cfg = rustls::ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .map_err(err)?
        .with_platform_verifier()
        .map_err(err)?
        .with_no_client_auth();
    let name = rustls::pki_types::ServerName::try_from(host.to_string()).map_err(|_| "url".to_string())?;
    let conn = rustls::ClientConnection::new(Arc::new(cfg), name).map_err(err)?;
    Ok(Box::new(rustls::StreamOwned::new(conn, tcp)))
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn tls(_tcp: TcpStream, _host: &str) -> Result<Box<dyn Conn>, String> {
    Err("rtmps".into())
}

/* ---------- AMF0 (commandes RTMP) ---------- */
enum Amf<'a> {
    S(&'a str),
    N(f64),
    B(bool),
}
fn amf_str(b: &mut Vec<u8>, s: &str) {
    b.push(2);
    b.extend((s.len() as u16).to_be_bytes());
    b.extend(s.as_bytes());
}
fn amf_num(b: &mut Vec<u8>, n: f64) {
    b.push(0);
    b.extend(n.to_be_bytes());
}
fn amf_obj(b: &mut Vec<u8>, props: &[(&str, Amf)]) {
    b.push(3);
    for (k, v) in props {
        b.extend((k.len() as u16).to_be_bytes());
        b.extend(k.as_bytes());
        match v {
            Amf::S(s) => amf_str(b, s),
            Amf::N(n) => amf_num(b, *n),
            Amf::B(x) => b.extend([1, *x as u8]),
        }
    }
    b.extend([0, 0, 9]);
}
fn command(name: &str, txn: f64, args: impl FnOnce(&mut Vec<u8>)) -> Vec<u8> {
    let mut b = Vec::new();
    amf_str(&mut b, name);
    amf_num(&mut b, txn);
    args(&mut b);
    b
}

/// Lit les valeurs AMF0 d'une commande reçue (assez pour _result, onStatus, _error)
fn amf_read(d: &[u8], i: &mut usize, depth: u32) -> Option<Value> {
    let t = *d.get(*i)?;
    *i += 1;
    let s16 = |i: &mut usize| -> Option<String> {
        let n = u16::from_be_bytes([*d.get(*i)?, *d.get(*i + 1)?]) as usize;
        let s = String::from_utf8_lossy(d.get(*i + 2..*i + 2 + n)?).into_owned();
        *i += 2 + n;
        Some(s)
    };
    match t {
        0 => {
            let v = f64::from_be_bytes(d.get(*i..*i + 8)?.try_into().ok()?);
            *i += 8;
            Some(json!(v))
        }
        1 => {
            let v = *d.get(*i)? != 0;
            *i += 1;
            Some(json!(v))
        }
        2 => s16(i).map(Value::String),
        3 | 8 => {
            if depth > 8 { return None; }
            if t == 8 { *i += 4; }
            let mut m = serde_json::Map::new();
            loop {
                if d.get(*i..*i + 3)? == [0, 0, 9] {
                    *i += 3;
                    break;
                }
                let k = s16(i)?;
                let v = amf_read(d, i, depth + 1)?;
                m.insert(k, v);
            }
            Some(Value::Object(m))
        }
        5 | 6 => Some(Value::Null),
        _ => None,
    }
}

/* ---------- morceaux RTMP ---------- */
fn put_msg(out: &mut Vec<u8>, cs: u8, typ: u8, sid: u32, ts: u32, body: &[u8]) {
    let ext = ts >= 0xFF_FFFF;
    out.push(cs & 0x3F);
    out.extend(&(if ext { 0xFF_FFFF } else { ts }).to_be_bytes()[1..]);
    out.extend(&(body.len() as u32).to_be_bytes()[1..]);
    out.push(typ);
    out.extend(sid.to_le_bytes());
    if ext { out.extend(ts.to_be_bytes()); }
    for (n, part) in body.chunks(CHUNK).enumerate() {
        if n > 0 {
            out.push(0xC0 | (cs & 0x3F));
            if ext { out.extend(ts.to_be_bytes()); }
        }
        out.extend(part);
    }
}

#[derive(Clone, Default)]
struct InHdr {
    ts: u32,
    len: u32,
    typ: u8,
    sid: u32,
    ext: bool,
    buf: Vec<u8>,
}

/// Lecture des messages reçus, sans jamais consommer un morceau incomplet
struct Reader {
    chunk: usize,
    hdr: HashMap<u32, InHdr>,
    inbuf: Vec<u8>,
    got: u64,
}

impl Reader {
    fn new() -> Self {
        Reader { chunk: 128, hdr: HashMap::new(), inbuf: Vec::new(), got: 0 }
    }
    fn next(&mut self) -> Option<(u8, Vec<u8>)> {
        loop {
            let d = &self.inbuf;
            let b0 = *d.first()?;
            let (fmt, mut i) = (b0 >> 6, 1usize);
            let cs = match b0 & 0x3F {
                0 => { i += 1; 64 + *d.get(1)? as u32 }
                1 => { i += 2; 64 + *d.get(1)? as u32 + 256 * *d.get(2)? as u32 }
                c => c as u32,
            };
            let mut h = self.hdr.get(&cs).cloned().unwrap_or_default();
            let mlen = [11, 7, 3, 0][fmt as usize];
            let m = d.get(i..i + mlen)?;
            let u24 = |o: usize| (m[o] as u32) << 16 | (m[o + 1] as u32) << 8 | m[o + 2] as u32;
            if fmt <= 2 {
                let t = u24(0);
                h.ext = t == 0xFF_FFFF;
                if !h.ext { h.ts = if fmt == 0 { t } else { h.ts.wrapping_add(t) }; }
            }
            if fmt <= 1 {
                h.len = u24(3);
                h.typ = m[6];
            }
            if fmt == 0 { h.sid = u32::from_le_bytes([m[7], m[8], m[9], m[10]]); }
            i += mlen;
            if h.ext {
                let e = d.get(i..i + 4)?;
                if fmt <= 2 { h.ts = u32::from_be_bytes([e[0], e[1], e[2], e[3]]); }
                i += 4;
            }
            if h.len as usize > 8 << 20 { return None; }
            let want = (h.len as usize).saturating_sub(h.buf.len()).min(self.chunk);
            let part = d.get(i..i + want)?.to_vec();
            self.inbuf.drain(..i + want);
            h.buf.extend(part);
            if h.buf.len() >= h.len as usize {
                let body = std::mem::take(&mut h.buf);
                let typ = h.typ;
                self.hdr.insert(cs, h);
                if typ == 1 && body.len() >= 4 {
                    self.chunk = (u32::from_be_bytes([body[0], body[1], body[2], body[3]]) & 0x7FFF_FFFF).clamp(1, 1 << 24) as usize;
                }
                return Some((typ, body));
            }
            self.hdr.insert(cs, h);
        }
    }
}

struct Session {
    c: Box<dyn Conn>,
    tcp: TcpStream,
    rd: Reader,
    win: u64,
    acked: u64,
}

impl Session {
    fn send(&mut self, cs: u8, typ: u8, sid: u32, ts: u32, body: &[u8]) -> Result<(), String> {
        let mut out = Vec::with_capacity(body.len() + 32);
        put_msg(&mut out, cs, typ, sid, ts, body);
        self.c.write_all(&out).map_err(io_err)?;
        self.c.flush().map_err(io_err)
    }
    /// lit ce qui est arrivé ; `wait` = attendre au moins un message (10 s au plus), sinon un simple coup d'œil sans attente
    /// (mode non bloquant : sous Windows, un délai de lecture de 1 ms dure en fait environ 0,5 s)
    fn pump(&mut self, wait: bool) -> Result<Vec<(u8, Vec<u8>)>, String> {
        let mut msgs = Vec::new();
        while let Some(m) = self.rd.next() { msgs.push(m); }
        if msgs.is_empty() || !wait {
            if wait { let _ = self.tcp.set_read_timeout(Some(Duration::from_secs(10))); } else { let _ = self.tcp.set_nonblocking(true); }
            let res = self.fill(wait, &mut msgs);
            if !wait { let _ = self.tcp.set_nonblocking(false); }
            res?;
        }
        // messages de contrôle : ping, accusés de réception, bande passante
        for (typ, body) in &msgs {
            match *typ {
                5 if body.len() >= 4 => self.win = u32::from_be_bytes([body[0], body[1], body[2], body[3]]) as u64,
                6 if body.len() >= 4 => { let w = body[..4].to_vec(); self.send(2, 5, 0, 0, &w)?; }
                4 if body.len() >= 6 && body[0] == 0 && body[1] == 6 => { let mut r = vec![0, 7]; r.extend(&body[2..6]); self.send(2, 4, 0, 0, &r)?; }
                _ => {}
            }
        }
        if self.win > 0 && self.rd.got - self.acked >= self.win / 2 {
            self.acked = self.rd.got;
            let n = (self.rd.got as u32).to_be_bytes();
            self.send(2, 3, 0, 0, &n)?;
        }
        Ok(msgs)
    }
    fn fill(&mut self, wait: bool, msgs: &mut Vec<(u8, Vec<u8>)>) -> Result<(), String> {
        let mut b = [0u8; 16384];
        loop {
            match self.c.read(&mut b) {
                Ok(0) => return Err("closed".into()),
                Ok(n) => {
                    self.rd.inbuf.extend_from_slice(&b[..n]);
                    self.rd.got += n as u64;
                    while let Some(m) = self.rd.next() { msgs.push(m); }
                }
                Err(e) if matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {
                    return if wait { Err("timeout".into()) } else { Ok(()) };
                }
                Err(e) => return Err(io_err(e)),
            }
            if !wait || !msgs.is_empty() { return Ok(()); }
        }
    }
    /// attend la réponse d'une commande (_result / _error / onStatus)
    fn answer(&mut self, txn: f64, status: bool) -> Result<Vec<Value>, String> {
        for _ in 0..200 {
            for (typ, body) in self.pump(true)? {
                if typ != 20 { continue; }
                let mut i = 0;
                let mut vals = Vec::new();
                while let Some(v) = amf_read(&body, &mut i, 0) { vals.push(v); }
                let name = vals.first().and_then(|v| v.as_str()).unwrap_or("");
                let t = vals.get(1).and_then(|v| v.as_f64()).unwrap_or(-1.0);
                if status && name == "onStatus" { return Ok(vals); }
                if !status && (name == "_result" || name == "_error") && t == txn { return Ok(vals); }
            }
        }
        Err("timeout".into())
    }
}

fn io_err(e: std::io::Error) -> String {
    match e.kind() {
        ErrorKind::TimedOut | ErrorKind::WouldBlock => "timeout".into(),
        ErrorKind::ConnectionReset | ErrorKind::ConnectionAborted | ErrorKind::BrokenPipe | ErrorKind::UnexpectedEof => "closed".into(),
        _ => e.to_string(),
    }
}

fn status_text(vals: &[Value]) -> (String, String) {
    let o = vals.iter().find(|v| v.is_object());
    let get = |k: &str| o.and_then(|o| o.get(k)).and_then(|v| v.as_str()).unwrap_or("").to_string();
    (get("code"), get("description"))
}

fn open(t: &Target, meta: &Value) -> Result<(Session, u32), String> {
    let addr = (t.host.as_str(), t.port).to_socket_addrs().map_err(|_| "server".to_string())?.next().ok_or("server")?;
    let tcp = TcpStream::connect_timeout(&addr, Duration::from_secs(10)).map_err(|_| "server".to_string())?;
    let _ = tcp.set_nodelay(true);
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(10)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(15)));
    let ctl = tcp.try_clone().map_err(err)?;
    let mut c: Box<dyn Conn> = if t.tls { tls(tcp, &t.host)? } else { Box::new(tcp) };
    // poignée de main simple : C0 + C1 (aléatoire), puis S0 S1 S2, puis C2 = S1
    let mut c01 = vec![0u8; 1537];
    c01[0] = 3;
    let mut x = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(7) | 1;
    for b in c01[9..].iter_mut() {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        *b = x as u8;
    }
    c.write_all(&c01).and_then(|_| c.flush()).map_err(|e| if t.tls { format!("tls:{e}") } else { io_err(e) })?;
    let mut s = vec![0u8; 3073];
    c.read_exact(&mut s).map_err(|e| if t.tls && !matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock) { format!("tls:{e}") } else { "handshake".to_string() })?;
    if s[0] != 3 { return Err("handshake".into()); }
    c.write_all(&s[1..1537]).and_then(|_| c.flush()).map_err(io_err)?;
    let mut ss = Session { c, tcp: ctl, rd: Reader::new(), win: 0, acked: 0 };
    ss.send(2, 1, 0, 0, &(CHUNK as u32).to_be_bytes())?;
    // connect → _result
    let cmd = command("connect", 1.0, |b| {
        amf_obj(b, &[
            ("app", Amf::S(&t.app)),
            ("type", Amf::S("nonprivate")),
            ("flashVer", Amf::S("FMLE/3.0 (compatible; DedCut)")),
            ("tcUrl", Amf::S(&t.tc_url)),
        ])
    });
    ss.send(CS_CMD, 20, 0, 0, &cmd)?;
    let r = ss.answer(1.0, false)?;
    if r.first().and_then(|v| v.as_str()) == Some("_error") {
        let (code, desc) = status_text(&r);
        return Err(format!("refused:{code} {desc}"));
    }
    // releaseStream, FCPublish, createStream → numéro du flux
    let null = |b: &mut Vec<u8>| b.push(5);
    ss.send(CS_CMD, 20, 0, 0, &command("releaseStream", 2.0, |b| { null(b); amf_str(b, &t.name) }))?;
    ss.send(CS_CMD, 20, 0, 0, &command("FCPublish", 3.0, |b| { null(b); amf_str(b, &t.name) }))?;
    ss.send(CS_CMD, 20, 0, 0, &command("createStream", 4.0, null))?;
    let r = ss.answer(4.0, false)?;
    let sid = r.iter().skip(2).find_map(|v| v.as_f64()).ok_or("refused:createStream")? as u32;
    // publish → onStatus NetStream.Publish.Start (sinon la clé est refusée)
    ss.send(CS_AUDIO, 20, sid, 0, &command("publish", 5.0, |b| { null(b); amf_str(b, &t.name); amf_str(b, "live") }))?;
    let r = ss.answer(0.0, true)?;
    let (code, desc) = status_text(&r);
    if code != "NetStream.Publish.Start" { return Err(format!("refused:{code} {desc}")); }
    // description du flux (onMetaData)
    let n = |k: &str| meta.get(k).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let mut md = Vec::new();
    amf_str(&mut md, "@setDataFrame");
    amf_str(&mut md, "onMetaData");
    amf_obj(&mut md, &[
        ("width", Amf::N(n("width"))),
        ("height", Amf::N(n("height"))),
        ("framerate", Amf::N(n("framerate"))),
        ("videocodecid", Amf::N(7.0)),
        ("videodatarate", Amf::N(n("videodatarate"))),
        ("audiocodecid", Amf::N(10.0)),
        ("audiodatarate", Amf::N(n("audiodatarate"))),
        ("audiosamplerate", Amf::N(48000.0)),
        ("audiosamplesize", Amf::N(16.0)),
        ("stereo", Amf::B(true)),
        ("encoder", Amf::S("DedCut")),
    ]);
    ss.send(CS_DATA, 18, sid, 0, &md)?;
    Ok((ss, sid))
}

#[allow(clippy::too_many_arguments)]
fn run(app: AppHandle, id: u32, mut ss: Session, sid: u32, name: String, rx: Receiver<Vec<u8>>, stats: Arc<Stats>, stop: Arc<AtomicBool>) {
    let res = (|| -> Result<(), String> {
        let mut last_poll = Instant::now();
        loop {
            if stop.load(Ordering::SeqCst) { return Ok(()); }
            match rx.recv_timeout(Duration::from_millis(10)) {
                Ok(batch) => {
                    // paquet : [type u8][temps u32][taille u32][contenu] …
                    let mut out = Vec::with_capacity(batch.len() + 256);
                    let mut i = 0;
                    while i + 9 <= batch.len() {
                        let typ = batch[i];
                        let ts = u32::from_be_bytes([batch[i + 1], batch[i + 2], batch[i + 3], batch[i + 4]]);
                        let len = u32::from_be_bytes([batch[i + 5], batch[i + 6], batch[i + 7], batch[i + 8]]) as usize;
                        let Some(body) = batch.get(i + 9..i + 9 + len) else { break };
                        if typ == 8 || typ == 9 { put_msg(&mut out, if typ == 8 { CS_AUDIO } else { CS_VIDEO }, typ, sid, ts, body); }
                        i += 9 + len;
                    }
                    ss.c.write_all(&out).map_err(io_err)?;
                    ss.c.flush().map_err(io_err)?;
                    stats.sent.fetch_add(batch.len() as u64, Ordering::SeqCst);
                    stats.queued.fetch_sub(batch.len() as u64, Ordering::SeqCst);
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return Ok(()),
            }
            if last_poll.elapsed() >= Duration::from_millis(100) {
                last_poll = Instant::now();
                ss.pump(false)?;
            }
        }
    })();
    // fin propre : on prévient le serveur
    let null = |b: &mut Vec<u8>| b.push(5);
    let _ = ss.send(CS_CMD, 20, 0, 0, &command("FCUnpublish", 6.0, |b| { null(b); amf_str(b, &name) }));
    let _ = ss.send(CS_CMD, 20, 0, 0, &command("deleteStream", 7.0, |b| { null(b); amf_num(b, sid as f64) }));
    let _ = ss.tcp.shutdown(std::net::Shutdown::Both);
    let _ = app.emit("live-status", match res {
        Ok(()) => json!({ "id": id, "state": "ended" }),
        Err(e) => json!({ "id": id, "state": "error", "error": e }),
    });
}

/// Se connecte et publie ; ensuite les paquets arrivent par live_send
#[tauri::command]
pub(crate) async fn live_start(app: AppHandle, st: State<'_, LiveState>, id: u32, url: String, key: String, meta: Value) -> Result<(), String> {
    if let Some(old) = st.0.lock().unwrap().remove(&id) { old.stop.store(true, Ordering::SeqCst); }
    let t = parse(&url, &key)?;
    let name = t.name.clone();
    let (ss, sid) = tauri::async_runtime::spawn_blocking(move || open(&t, &meta)).await.map_err(err)??;
    let (tx, rx) = sync_channel::<Vec<u8>>(256);
    let stats = Arc::new(Stats::default());
    let stop = Arc::new(AtomicBool::new(false));
    st.0.lock().unwrap().insert(id, Live { tx, stats: stats.clone(), stop: stop.clone() });
    std::thread::spawn(move || run(app, id, ss, sid, name, rx, stats, stop));
    Ok(())
}

/// Paquet de messages audio / vidéo à envoyer. Renvoie l'état de l'envoi (octets envoyés, en attente)
#[tauri::command]
pub(crate) fn live_send(st: State<LiveState>, request: Request<'_>) -> Result<Value, String> {
    let id: u32 = super::header(&request, "id").parse().unwrap_or(0);
    let body = raw_body(&request)?.to_vec();
    let g = st.0.lock().unwrap();
    let Some(l) = g.get(&id) else { return Err("off".into()) };
    let n = body.len() as u64;
    l.stats.queued.fetch_add(n, Ordering::SeqCst);
    match l.tx.try_send(body) {
        Ok(()) => {}
        Err(TrySendError::Full(_)) => { l.stats.queued.fetch_sub(n, Ordering::SeqCst); return Ok(json!({ "full": true, "sent": l.stats.sent.load(Ordering::SeqCst), "queued": l.stats.queued.load(Ordering::SeqCst) })); }
        Err(TrySendError::Disconnected(_)) => { l.stats.queued.fetch_sub(n, Ordering::SeqCst); return Err("off".into()); }
    }
    Ok(json!({ "sent": l.stats.sent.load(Ordering::SeqCst), "queued": l.stats.queued.load(Ordering::SeqCst) }))
}

/// Arrête une destination (le fil d'envoi finit d'envoyer ce qui attend, puis prévient le serveur et ferme)
#[tauri::command]
pub(crate) fn live_stop(st: State<LiveState>, id: u32) {
    drop(st.0.lock().unwrap().remove(&id));
}

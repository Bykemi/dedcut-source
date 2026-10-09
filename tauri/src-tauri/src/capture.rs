//! DedCut — capture de l'écran ou d'une fenêtre faite par DedCut lui-même (Windows Graphics Capture),
//! pour remplacer la fenêtre de partage grise de Windows / WebView2 par une fenêtre au style de DedCut.
//! - `cap_sources` : écrans et fenêtres (fenêtres visibles avec un titre, sans celles de DedCut).
//! - `cap_thumb` : petite image d'une source (PrintWindow ou copie de l'écran), en pixels BGRA bruts.
//! - `cap_start` / `cap_stop` : la capture. Les images sont copiées dans 3 mémoires partagées avec la page
//!   (WebView2 « SharedBuffer » : pas de passage par le pont de Tauri) ; un petit message par image dit laquelle lire.
//! - son du PC : WASAPI « loopback » de tout le son du PC sauf celui de DedCut (sinon toute la sortie son),
//!   écrit dans une mémoire partagée en anneau.
//! Pas de nouvelle bibliothèque : windows, windows-core et webview2-com sont déjà livrés avec Tauri (MIT / Apache-2.0).
use serde::Serialize;

#[derive(Serialize)]
pub struct CapSource {
    pub id: String,
    pub kind: &'static str,
    pub name: String,
    pub app: String,
    pub w: i32,
    pub h: i32,
    pub primary: bool,
    pub min: bool,
}

#[cfg(not(windows))]
pub mod win {
    use super::CapSource;
    #[tauri::command]
    pub fn cap_sources() -> Result<Vec<CapSource>, String> { Err("unsupported".into()) }
    #[tauri::command]
    pub async fn cap_thumb(_id: String, _w: u32, _h: u32) -> Result<tauri::ipc::Response, String> { Err("unsupported".into()) }
    #[tauri::command]
    pub async fn cap_start(_id: String, _fps: u32, _audio: bool) -> Result<serde_json::Value, String> { Err("unsupported".into()) }
    #[tauri::command]
    pub fn cap_stop(_token: u32) {}
    #[tauri::command]
    pub fn cap_stop_all() {}
}
#[cfg(windows)]
pub mod win {
    use super::CapSource;
    use std::cell::RefCell;
    use std::collections::HashMap;
    use std::sync::atomic::{fence, AtomicBool, AtomicU32, Ordering};
    use std::sync::{mpsc, Arc, LazyLock, Mutex};
    use std::time::{Duration, Instant};
    use tauri::WebviewWindow;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment12, ICoreWebView2SharedBuffer, ICoreWebView2_17, COREWEBVIEW2_SHARED_BUFFER_ACCESS_READ_ONLY,
    };
    use windows::core::{implement, IInspectable, Interface, Ref, BOOL, HRESULT, HSTRING, PCWSTR, PWSTR};
    use windows::Foundation::TypedEventHandler;
    use windows::Graphics::Capture::{Direct3D11CaptureFrame, Direct3D11CaptureFramePool, GraphicsCaptureItem, GraphicsCaptureSession};
    use windows::Graphics::DirectX::Direct3D11::IDirect3DDevice;
    use windows::Graphics::DirectX::DirectXPixelFormat;
    use windows::Graphics::SizeInt32;
    use windows::Win32::Foundation::{CloseHandle, E_FAIL, HMODULE, HWND, LPARAM, RECT};
    use windows::Win32::Graphics::Direct3D::D3D_DRIVER_TYPE_HARDWARE;
    use windows::Win32::Graphics::Direct3D11::*;
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows::Win32::Graphics::Dxgi::IDXGIDevice;
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::Media::Audio::*;
    use windows::Win32::Storage::Xps::{PrintWindow, PRINT_WINDOW_FLAGS};
    use windows::Win32::System::Com::StructuredStorage::PROPVARIANT;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED, BLOB};
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::System::Variant::VT_BLOB;
    use windows::Win32::System::WinRT::Direct3D11::{CreateDirect3D11DeviceFromDXGIDevice, IDirect3DDxgiInterfaceAccess};
    use windows::Win32::System::WinRT::Graphics::Capture::IGraphicsCaptureItemInterop;
    use windows::Win32::UI::WindowsAndMessaging::*;

    /// en-tête de chaque image dans sa mémoire partagée : numéro (0 pendant l'écriture), largeur, hauteur, réserve
    const HDR: usize = 32;
    /// son : 2 s en anneau, 48 kHz, stéréo, 16 bits
    const RATE: u32 = 48000;
    const RING: usize = 96000;

    fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }

    /* ---------- écrans et fenêtres ---------- */
    unsafe extern "system" fn mon_cb(hm: HMONITOR, _dc: HDC, _r: *mut RECT, lp: LPARAM) -> BOOL {
        let v = unsafe { &mut *(lp.0 as *mut Vec<HMONITOR>) };
        v.push(hm);
        BOOL(1)
    }
    /// écrans : poignée, rectangle (pixels réels), écran principal
    fn monitors() -> Vec<(HMONITOR, RECT, bool)> {
        let mut v: Vec<HMONITOR> = vec![];
        unsafe { let _ = EnumDisplayMonitors(None, None, Some(mon_cb), LPARAM(&mut v as *mut _ as isize)); }
        v.into_iter()
            .filter_map(|hm| {
                let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
                if unsafe { GetMonitorInfoW(hm, &mut mi) }.as_bool() { Some((hm, mi.rcMonitor, mi.dwFlags & MONITORINFOF_PRIMARY != 0)) } else { None }
            })
            .collect()
    }
    unsafe extern "system" fn win_cb(h: HWND, lp: LPARAM) -> BOOL {
        let v = unsafe { &mut *(lp.0 as *mut Vec<HWND>) };
        v.push(h);
        BOOL(1)
    }
    /// partie visible de la fenêtre (sans les bords invisibles de Windows 10)
    fn frame_rect(h: HWND) -> RECT {
        let mut r = RECT::default();
        unsafe {
            if DwmGetWindowAttribute(h, DWMWA_EXTENDED_FRAME_BOUNDS, &mut r as *mut _ as _, std::mem::size_of::<RECT>() as u32).is_err() { let _ = GetWindowRect(h, &mut r); }
        }
        r
    }
    fn app_name(pid: u32) -> String {
        unsafe {
            let Ok(p) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return String::new() };
            let mut buf = [0u16; 520];
            let mut n = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(p, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut n).is_ok();
            let _ = CloseHandle(p);
            if !ok { return String::new(); }
            let path = String::from_utf16_lossy(&buf[..n as usize]);
            std::path::Path::new(&path).file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default()
        }
    }
    fn windows_list() -> Vec<CapSource> {
        let mut hs: Vec<HWND> = vec![];
        unsafe { let _ = EnumWindows(Some(win_cb), LPARAM(&mut hs as *mut _ as isize)); }
        let me = std::process::id();
        let mut out = vec![];
        for h in hs {
            unsafe {
                if !IsWindowVisible(h).as_bool() { continue; }
                let ex = GetWindowLongW(h, GWL_EXSTYLE) as u32;
                if ex & WS_EX_TOOLWINDOW.0 != 0 { continue; }
                if let Ok(o) = GetWindow(h, GW_OWNER) { if !o.is_invalid() && ex & WS_EX_APPWINDOW.0 == 0 { continue; } }
                let mut pid = 0u32;
                GetWindowThreadProcessId(h, Some(&mut pid));
                if pid == me { continue; }
                let mut cloaked = 0u32;
                if DwmGetWindowAttribute(h, DWMWA_CLOAKED, &mut cloaked as *mut _ as _, 4).is_ok() && cloaked != 0 { continue; }
                let mut t = [0u16; 512];
                let n = GetWindowTextW(h, &mut t);
                if n <= 0 { continue; }
                let mut c = [0u16; 256];
                let cn = GetClassNameW(h, &mut c).max(0) as usize;
                let class = String::from_utf16_lossy(&c[..cn]);
                if matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd") { continue; }
                let min = IsIconic(h).as_bool();
                let r = frame_rect(h);
                let (w, hh) = (r.right - r.left, r.bottom - r.top);
                if !min && (w < 40 || hh < 40) { continue; }
                out.push(CapSource { id: format!("window:{}", h.0 as isize), kind: "window", name: String::from_utf16_lossy(&t[..n as usize]), app: app_name(pid), w, h: hh, primary: false, min });
            }
        }
        out
    }
    #[tauri::command]
    pub fn cap_sources() -> Result<Vec<CapSource>, String> {
        let mut v: Vec<CapSource> = monitors()
            .into_iter()
            .map(|(hm, r, p)| CapSource { id: format!("screen:{}", hm.0 as isize), kind: "screen", name: String::new(), app: String::new(), w: r.right - r.left, h: r.bottom - r.top, primary: p, min: false })
            .collect();
        v.extend(windows_list());
        Ok(v)
    }
    fn parse(id: &str) -> Result<(bool, isize), String> {
        if let Some(n) = id.strip_prefix("screen:") { return n.parse().map(|n| (true, n)).map_err(err); }
        if let Some(n) = id.strip_prefix("window:") { return n.parse().map(|n| (false, n)).map_err(err); }
        Err("source inconnue".into())
    }

    /* ---------- petites images ---------- */
    /// copie (et réduit) une zone d'un DC en BGRA ; fonds noirs de GDI rendus opaques
    unsafe fn shrink(src: HDC, x: i32, y: i32, w: i32, h: i32, tw: i32, th: i32) -> Option<Vec<u8>> {
        unsafe {
            let dc = CreateCompatibleDC(Some(src));
            let mut bi = BITMAPINFO::default();
            bi.bmiHeader = BITMAPINFOHEADER { biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32, biWidth: tw, biHeight: -th, biPlanes: 1, biBitCount: 32, biCompression: BI_RGB.0, ..Default::default() };
            let mut bits: *mut core::ffi::c_void = std::ptr::null_mut();
            let Ok(dib) = CreateDIBSection(Some(dc), &bi, DIB_RGB_COLORS, &mut bits, None, 0) else { let _ = DeleteDC(dc); return None };
            let old = SelectObject(dc, dib.into());
            SetStretchBltMode(dc, HALFTONE);
            let _ = SetBrushOrgEx(dc, 0, 0, None);
            let ok = StretchBlt(dc, 0, 0, tw, th, Some(src), x, y, w, h, SRCCOPY).as_bool();
            let _ = GdiFlush();
            let mut out = None;
            if ok && !bits.is_null() {
                let mut v = std::slice::from_raw_parts(bits as *const u8, (tw * th * 4) as usize).to_vec();
                for p in v.chunks_exact_mut(4) { p[3] = 255; }
                out = Some(v);
            }
            SelectObject(dc, old);
            let _ = DeleteObject(dib.into());
            let _ = DeleteDC(dc);
            out
        }
    }
    fn fit(w: i32, h: i32, mw: i32, mh: i32) -> (i32, i32) {
        let k = (mw as f64 / w.max(1) as f64).min(mh as f64 / h.max(1) as f64).min(1.0);
        (((w as f64 * k).round() as i32).max(1), ((h as f64 * k).round() as i32).max(1))
    }
    fn thumb(id: &str, mw: i32, mh: i32) -> Result<(i32, i32, Vec<u8>), String> {
        let (screen, n) = parse(id)?;
        unsafe {
            let sdc = GetDC(None);
            let res = if screen {
                let r = monitors().into_iter().find(|m| m.0 .0 as isize == n).map(|m| m.1).ok_or("écran introuvable")?;
                let (w, h) = (r.right - r.left, r.bottom - r.top);
                let (tw, th) = fit(w, h, mw, mh);
                shrink(sdc, r.left, r.top, w, h, tw, th).map(|v| (tw, th, v))
            } else {
                let hw = HWND(n as *mut _);
                if IsIconic(hw).as_bool() { None } else {
                    let mut wr = RECT::default();
                    let _ = GetWindowRect(hw, &mut wr);
                    let fr = frame_rect(hw);
                    let (ww, wh) = (wr.right - wr.left, wr.bottom - wr.top);
                    let (fw, fh) = (fr.right - fr.left, fr.bottom - fr.top);
                    let mdc = CreateCompatibleDC(Some(sdc));
                    let bmp = CreateCompatibleBitmap(sdc, ww.max(1), wh.max(1));
                    let old = SelectObject(mdc, bmp.into());
                    // PW_RENDERFULLCONTENT (2) : aussi les fenêtres dessinées par la carte graphique (navigateurs, jeux…)
                    let ok = PrintWindow(hw, mdc, PRINT_WINDOW_FLAGS(2)).as_bool();
                    let (tw, th) = fit(fw, fh, mw, mh);
                    let v = if ok { shrink(mdc, fr.left - wr.left, fr.top - wr.top, fw, fh, tw, th) } else { None };
                    SelectObject(mdc, old);
                    let _ = DeleteObject(bmp.into());
                    let _ = DeleteDC(mdc);
                    v.map(|v| (tw, th, v))
                }
            };
            ReleaseDC(None, sdc);
            Ok(res.unwrap_or((0, 0, vec![])))
        }
    }
    /// petite image d'une source : [largeur u32][hauteur u32] puis les pixels BGRA (0 × 0 : fenêtre réduite)
    #[tauri::command]
    pub async fn cap_thumb(id: String, w: u32, h: u32) -> Result<tauri::ipc::Response, String> {
        let (tw, th, px) = tauri::async_runtime::spawn_blocking(move || thumb(&id, w.clamp(16, 640) as i32, h.clamp(16, 480) as i32)).await.map_err(err)??;
        let mut out = Vec::with_capacity(8 + px.len());
        out.extend_from_slice(&(tw as u32).to_le_bytes());
        out.extend_from_slice(&(th as u32).to_le_bytes());
        out.extend_from_slice(&px);
        Ok(tauri::ipc::Response::new(out))
    }

    /* ---------- mémoires partagées avec la page (fil principal de la fenêtre) ---------- */
    thread_local! { static BUFS: RefCell<HashMap<u32, Vec<ICoreWebView2SharedBuffer>>> = RefCell::new(HashMap::new()); }
    /// crée les mémoires et les donne à la page (avec leur description JSON) ; renvoie leurs adresses
    fn make_buffers(win: &WebviewWindow, token: u32, list: Vec<(usize, String)>) -> Result<Vec<usize>, String> {
        let (tx, rx) = mpsc::channel();
        win.with_webview(move |pv| {
            let r = (|| -> windows::core::Result<Vec<usize>> {
                unsafe {
                    let env: ICoreWebView2Environment12 = pv.environment().cast()?;
                    let core: ICoreWebView2_17 = pv.controller().CoreWebView2()?.cast()?;
                    let mut out = vec![];
                    for (size, meta) in list {
                        let b = env.CreateSharedBuffer(size as u64)?;
                        let mut p: *mut u8 = std::ptr::null_mut();
                        b.Buffer(&mut p)?;
                        let m = HSTRING::from(meta);
                        core.PostSharedBufferToScript(&b, COREWEBVIEW2_SHARED_BUFFER_ACCESS_READ_ONLY, PCWSTR(m.as_ptr()))?;
                        out.push(p as usize);
                        BUFS.with(|x| x.borrow_mut().entry(token).or_default().push(b));
                    }
                    Ok(out)
                }
            })();
            let _ = tx.send(r.map_err(err));
        })
        .map_err(err)?;
        rx.recv_timeout(Duration::from_secs(5)).map_err(|_| "la page ne répond pas".to_string())?
    }
    fn free_buffers(win: &WebviewWindow, token: u32) {
        let _ = win.with_webview(move |_| {
            BUFS.with(|x| { if let Some(v) = x.borrow_mut().remove(&token) { for b in v { unsafe { let _ = b.Close(); } } } });
        });
    }
    /// petit message à la page (fil principal) : quelle image lire, fin de la capture…
    fn post(win: &WebviewWindow, json: String) {
        let _ = win.with_webview(move |pv| unsafe {
            if let Ok(core) = pv.controller().CoreWebView2() {
                let h = HSTRING::from(json);
                let _ = core.PostWebMessageAsJson(PCWSTR(h.as_ptr()));
            }
        });
    }

    /* ---------- images ---------- */
    struct Frames {
        dev: ID3D11Device,
        ctx: ID3D11DeviceContext,
        wdev: IDirect3DDevice,
        staging: Option<(ID3D11Texture2D, u32, u32)>,
        slots: Vec<usize>,
        cap: usize,
        next: usize,
        seq: u32,
        last: Option<Instant>,
        min_dt: Duration,
        size: SizeInt32,
        win: WebviewWindow,
        token: u32,
        t0: Instant,
        dead: bool,
    }
    // la carte graphique est utilisée sous verrou, par un seul fil à la fois
    unsafe impl Send for Frames {}

    fn d3d() -> windows::core::Result<(ID3D11Device, ID3D11DeviceContext, IDirect3DDevice)> {
        unsafe {
            let (mut dev, mut ctx) = (None, None);
            D3D11CreateDevice(None, D3D_DRIVER_TYPE_HARDWARE, HMODULE::default(), D3D11_CREATE_DEVICE_BGRA_SUPPORT, None, D3D11_SDK_VERSION, Some(&mut dev), None, Some(&mut ctx))?;
            let dev: ID3D11Device = dev.ok_or_else(|| windows::core::Error::from(E_FAIL))?;
            let ctx = ctx.ok_or_else(|| windows::core::Error::from(E_FAIL))?;
            let insp = CreateDirect3D11DeviceFromDXGIDevice(&dev.cast::<IDXGIDevice>()?)?;
            Ok((dev, ctx, insp.cast()?))
        }
    }
    fn on_frame(f: &mut Frames, pool: &Direct3D11CaptureFramePool, frame: &Direct3D11CaptureFrame) -> windows::core::Result<()> {
        let cs = frame.ContentSize()?;
        if cs.Width != f.size.Width || cs.Height != f.size.Height {
            // la fenêtre a changé de taille : réserve d'images refaite à la nouvelle taille
            f.size = cs;
            pool.Recreate(&f.wdev, DirectXPixelFormat::B8G8R8A8UIntNormalized, 2, cs)?;
            return Ok(());
        }
        let now = Instant::now();
        if let Some(l) = f.last { if now.duration_since(l) < f.min_dt { return Ok(()); } }
        f.last = Some(now);
        let tex: ID3D11Texture2D = unsafe { frame.Surface()?.cast::<IDirect3DDxgiInterfaceAccess>()?.GetInterface()? };
        let mut d = D3D11_TEXTURE2D_DESC::default();
        unsafe { tex.GetDesc(&mut d) };
        if f.staging.as_ref().map(|s| s.1 != d.Width || s.2 != d.Height).unwrap_or(true) {
            let sd = D3D11_TEXTURE2D_DESC { Usage: D3D11_USAGE_STAGING, BindFlags: 0, CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32, MiscFlags: 0, MipLevels: 1, ArraySize: 1, ..d };
            let mut st = None;
            unsafe { f.dev.CreateTexture2D(&sd, None, Some(&mut st))? };
            f.staging = Some((st.ok_or_else(|| windows::core::Error::from(E_FAIL))?, d.Width, d.Height));
        }
        let Some((st, _, _)) = f.staging.clone() else { return Ok(()) };
        let w = (cs.Width.max(1) as usize).min(d.Width as usize);
        let mut h = (cs.Height.max(1) as usize).min(d.Height as usize);
        h = h.min((f.cap - HDR) / (w * 4)); // plus grand que prévu (fenêtre énorme) : le bas est coupé
        unsafe {
            f.ctx.CopyResource(&st, &tex);
            let mut m = D3D11_MAPPED_SUBRESOURCE::default();
            f.ctx.Map(&st, 0, D3D11_MAP_READ, 0, Some(&mut m))?;
            let slot = f.next;
            f.next = (f.next + 1) % f.slots.len();
            f.seq = f.seq.wrapping_add(1).max(1);
            let base = f.slots[slot] as *mut u8;
            let hd = base as *mut u32;
            std::ptr::write_volatile(hd, 0);
            fence(Ordering::SeqCst);
            let src = m.pData as *const u8;
            for y in 0..h { std::ptr::copy_nonoverlapping(src.add(y * m.RowPitch as usize), base.add(HDR + y * w * 4), w * 4); }
            f.ctx.Unmap(&st, 0);
            std::ptr::write_volatile(hd.add(1), w as u32);
            std::ptr::write_volatile(hd.add(2), h as u32);
            fence(Ordering::SeqCst);
            std::ptr::write_volatile(hd, f.seq);
            post(&f.win, format!(r#"{{"cap":{},"s":{},"q":{},"w":{},"h":{},"t":{}}}"#, f.token, slot, f.seq, w, h, f.t0.elapsed().as_micros()));
        }
        Ok(())
    }
    struct Video {
        session: GraphicsCaptureSession,
        pool: Direct3D11CaptureFramePool,
        frames: Arc<Mutex<Frames>>,
    }
    impl Video {
        fn stop(&self) {
            // plus aucune écriture dans les mémoires partagées après ce verrou
            self.frames.lock().unwrap_or_else(|e| e.into_inner()).dead = true;
            let _ = self.session.Close();
            let _ = self.pool.Close();
        }
    }
    fn start_video(win: &WebviewWindow, token: u32, id: &str, fps: u32) -> Result<(Video, i32, i32), String> {
        let (screen, n) = parse(id)?;
        let interop = windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>().map_err(err)?;
        let item: GraphicsCaptureItem = unsafe { if screen { interop.CreateForMonitor(HMONITOR(n as *mut _)) } else { interop.CreateForWindow(HWND(n as *mut _)) } }.map_err(err)?;
        let size = item.Size().map_err(err)?;
        // place prévue : le plus grand écran (une fenêtre peut être agrandie ou changer d'écran)
        let big = monitors().iter().map(|m| ((m.1.right - m.1.left) * (m.1.bottom - m.1.top)) as usize).max().unwrap_or(0);
        let cap = HDR + 4 * big.max((size.Width.max(1) * size.Height.max(1)) as usize);
        let slots = make_buffers(win, token, (0..3).map(|s| (cap, format!(r#"{{"cap":{token},"s":{s}}}"#))).collect())?;
        let (dev, ctx, wdev) = d3d().map_err(err)?;
        let pool = Direct3D11CaptureFramePool::CreateFreeThreaded(&wdev, DirectXPixelFormat::B8G8R8A8UIntNormalized, 2, size).map_err(err)?;
        let frames = Arc::new(Mutex::new(Frames {
            dev, ctx, wdev, staging: None, slots, cap, next: 0, seq: 0, last: None,
            min_dt: Duration::from_secs_f64(0.85 / fps.clamp(1, 120) as f64), size, win: win.clone(), token, t0: Instant::now(), dead: false,
        }));
        let fr = frames.clone();
        pool.FrameArrived(&TypedEventHandler::<Direct3D11CaptureFramePool, IInspectable>::new(move |p: Ref<Direct3D11CaptureFramePool>, _| {
            let Some(p) = p.as_ref() else { return Ok(()) };
            let Ok(frame) = p.TryGetNextFrame() else { return Ok(()) };
            let mut f = fr.lock().unwrap_or_else(|e| e.into_inner());
            if !f.dead { let _ = on_frame(&mut f, p, &frame); }
            drop(f);
            let _ = frame.Close();
            Ok(())
        }))
        .map_err(err)?;
        // fenêtre fermée pendant la capture : la page arrête la source
        let w2 = win.clone();
        let _ = item.Closed(&TypedEventHandler::<GraphicsCaptureItem, IInspectable>::new(move |_, _| { post(&w2, format!(r#"{{"cap":{token},"gone":1}}"#)); Ok(()) }));
        let session = pool.CreateCaptureSession(&item).map_err(err)?;
        let _ = session.SetIsCursorCaptureEnabled(true);
        let _ = session.SetIsBorderRequired(false); // Windows 11 seulement (sur Windows 10, le cadre jaune reste)
        session.StartCapture().map_err(err)?;
        Ok((Video { session, pool, frames }, size.Width, size.Height))
    }

    /* ---------- son du PC ---------- */
    // objet « agile » d'office (windows-rs) : Windows peut l'appeler depuis n'importe quel fil
    #[implement(IActivateAudioInterfaceCompletionHandler)]
    struct Activated(Mutex<Option<mpsc::Sender<()>>>);
    impl IActivateAudioInterfaceCompletionHandler_Impl for Activated_Impl {
        fn ActivateCompleted(&self, _op: Ref<IActivateAudioInterfaceAsyncOperation>) -> windows::core::Result<()> {
            if let Some(tx) = self.0.lock().unwrap_or_else(|e| e.into_inner()).take() { let _ = tx.send(()); }
            Ok(())
        }
    }
    /// tout le son du PC sauf celui de DedCut et de ses fenêtres WebView2 (Windows 10 2004 et plus)
    fn loopback_without_dedcut() -> windows::core::Result<IAudioClient> {
        unsafe {
            let params = AUDIOCLIENT_ACTIVATION_PARAMS {
                ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
                Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 { ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS { TargetProcessId: std::process::id(), ProcessLoopbackMode: PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE } },
            };
            // ManuallyDrop : PROPVARIANT libère son contenu en fin de vie (PropVariantClear), or ce bloc est sur la pile
            let mut pv = std::mem::ManuallyDrop::new(PROPVARIANT::default());
            (*pv.Anonymous.Anonymous).vt = VT_BLOB;
            (*pv.Anonymous.Anonymous).Anonymous.blob = BLOB { cbSize: std::mem::size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32, pBlobData: &params as *const _ as *mut u8 };
            let (tx, rx) = mpsc::channel();
            let handler: IActivateAudioInterfaceCompletionHandler = Activated(Mutex::new(Some(tx))).into();
            let op = ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, &IAudioClient::IID, Some(&*pv), &handler)?;
            rx.recv_timeout(Duration::from_secs(5)).map_err(|_| windows::core::Error::from(E_FAIL))?;
            let (mut hr, mut unk) = (HRESULT(0), None);
            op.GetActivateResult(&mut hr, &mut unk)?;
            hr.ok()?;
            unk.ok_or_else(|| windows::core::Error::from(E_FAIL))?.cast()
        }
    }
    /// toute la sortie son par défaut (si la version de Windows ne sait pas exclure DedCut)
    fn loopback_device() -> windows::core::Result<IAudioClient> {
        unsafe {
            let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
            en.GetDefaultAudioEndpoint(eRender, eConsole)?.Activate(CLSCTX_ALL, None)
        }
    }
    struct Audio { stop: Arc<AtomicBool>, th: Option<std::thread::JoinHandle<()>>, all: bool }
    impl Audio {
        fn stop(mut self) {
            self.stop.store(true, Ordering::SeqCst);
            if let Some(t) = self.th.take() { let _ = t.join(); }
        }
    }
    fn start_audio(win: &WebviewWindow, token: u32) -> Result<Audio, String> {
        let ring = make_buffers(win, token, vec![(16 + RING * 4, format!(r#"{{"aud":{token},"rate":{RATE},"ring":{RING}}}"#))])?[0];
        let stop = Arc::new(AtomicBool::new(false));
        let (st, w2) = (stop.clone(), win.clone());
        let (ok_tx, ok_rx) = mpsc::channel::<Result<bool, String>>();
        let th = std::thread::Builder::new()
            .name("dedcut-cap-son".into())
            .spawn(move || unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
                let fmt = WAVEFORMATEX { wFormatTag: WAVE_FORMAT_PCM as u16, nChannels: 2, nSamplesPerSec: RATE, nAvgBytesPerSec: RATE * 4, nBlockAlign: 4, wBitsPerSample: 16, cbSize: 0 };
                let flags = AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY;
                let init = |c: &IAudioClient| c.Initialize(AUDCLNT_SHAREMODE_SHARED, flags, 2_000_000, 0, &fmt, None).map(|_| c.clone());
                let (client, sans_dedcut) = match loopback_without_dedcut().and_then(|c| init(&c)) {
                    Ok(c) => (c, true),
                    Err(_) => match loopback_device().and_then(|c| init(&c)) { Ok(c) => (c, false), Err(e) => { let _ = ok_tx.send(Err(err(e))); return; } },
                };
                let Ok(cc) = client.GetService::<IAudioCaptureClient>() else { let _ = ok_tx.send(Err("son".into())); return };
                if let Err(e) = client.Start() { let _ = ok_tx.send(Err(err(e))); return; }
                let _ = ok_tx.send(Ok(sans_dedcut));
                let (hd, data) = (ring as *mut u32, (ring + 16) as *mut i16);
                let (mut pos, mut sent, mut last) = (0u32, 0u32, Instant::now());
                while !st.load(Ordering::SeqCst) {
                    std::thread::sleep(Duration::from_millis(10));
                    loop {
                        let Ok(n) = cc.GetNextPacketSize() else { break };
                        if n == 0 { break; }
                        let (mut p, mut frames, mut fl) = (std::ptr::null_mut(), 0u32, 0u32);
                        if cc.GetBuffer(&mut p, &mut frames, &mut fl, None, None).is_err() { break; }
                        let silent = fl & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0;
                        for i in 0..frames as usize {
                            let at = (pos as usize + i) % RING;
                            let (l, r) = if silent || p.is_null() { (0, 0) } else { (*(p as *const i16).add(i * 2), *(p as *const i16).add(i * 2 + 1)) };
                            *data.add(at * 2) = l;
                            *data.add(at * 2 + 1) = r;
                        }
                        let _ = cc.ReleaseBuffer(frames);
                        pos = pos.wrapping_add(frames);
                        fence(Ordering::SeqCst);
                        std::ptr::write_volatile(hd, pos);
                    }
                    // un message toutes les 20 ms environ quand du son arrive
                    if pos != sent && last.elapsed() >= Duration::from_millis(18) {
                        sent = pos;
                        last = Instant::now();
                        post(&w2, format!(r#"{{"aud":{token},"p":{pos}}}"#));
                    }
                }
                let _ = client.Stop();
            })
            .map_err(err)?;
        match ok_rx.recv_timeout(Duration::from_secs(8)) {
            Ok(Ok(sans_dedcut)) => Ok(Audio { stop, th: Some(th), all: !sans_dedcut }),
            Ok(Err(e)) => { let _ = th.join(); Err(e) }
            Err(_) => { stop.store(true, Ordering::SeqCst); Err("son : délai dépassé".into()) }
        }
    }

    /* ---------- départ / arrêt ---------- */
    static NEXT: AtomicU32 = AtomicU32::new(1);
    static CAPS: LazyLock<Mutex<HashMap<u32, (mpsc::Sender<()>, std::thread::JoinHandle<()>)>>> = LazyLock::new(Default::default);

    #[tauri::command]
    pub async fn cap_start(window: WebviewWindow, id: String, fps: u32, audio: bool) -> Result<serde_json::Value, String> {
        tauri::async_runtime::spawn_blocking(move || {
            let token = NEXT.fetch_add(1, Ordering::Relaxed);
            let (ready_tx, ready_rx) = mpsc::channel::<Result<serde_json::Value, String>>();
            let (stop_tx, stop_rx) = mpsc::channel::<()>();
            let th = std::thread::Builder::new()
                .name(format!("dedcut-cap-{token}"))
                .spawn(move || {
                    unsafe { let _ = CoInitializeEx(None, COINIT_MULTITHREADED); }
                    let (video, w, h) = match start_video(&window, token, &id, fps) {
                        Ok(v) => v,
                        Err(e) => { free_buffers(&window, token); let _ = ready_tx.send(Err(e)); return; }
                    };
                    let (snd, son_err) = if audio { match start_audio(&window, token) { Ok(a) => (Some(a), None), Err(e) => (None, Some(e)) } } else { (None, None) };
                    let _ = ready_tx.send(Ok(serde_json::json!({ "token": token, "w": w, "h": h, "audio": snd.is_some(), "audioAll": snd.as_ref().map(|a| a.all), "audioError": son_err })));
                    let _ = stop_rx.recv(); // jusqu'à cap_stop (ou DedCut qui se ferme)
                    video.stop();
                    if let Some(a) = snd { a.stop(); }
                    post(&window, format!(r#"{{"cap":{token},"end":1}}"#));
                    free_buffers(&window, token);
                })
                .map_err(err)?;
            match ready_rx.recv_timeout(Duration::from_secs(15)) {
                Ok(Ok(v)) => { CAPS.lock().unwrap_or_else(|e| e.into_inner()).insert(token, (stop_tx, th)); Ok(v) }
                Ok(Err(e)) => { let _ = th.join(); Err(e) }
                Err(_) => Err("capture : délai dépassé".into()),
            }
        })
        .await
        .map_err(err)?
    }
    #[tauri::command]
    pub fn cap_stop(token: u32) {
        // l'arrêt se fait dans le fil de la capture (il rend les mémoires partagées à la fenêtre)
        if let Some((tx, _th)) = CAPS.lock().unwrap_or_else(|e| e.into_inner()).remove(&token) { let _ = tx.send(()); }
    }
    /// page rechargée : les captures d'avant n'ont plus de lecteur
    #[tauri::command]
    pub fn cap_stop_all() {
        for (_, (tx, _th)) in CAPS.lock().unwrap_or_else(|e| e.into_inner()).drain() { let _ = tx.send(()); }
    }
}

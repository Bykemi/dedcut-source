//! Clés de stream protégées par Windows (DPAPI) : seule la même session Windows peut les relire.
//! Le texte chiffré est rendu en hexadécimal pour être rangé dans les réglages du studio.

fn to_hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect()
}

fn from_hex(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 || s.len() > 65536 {
        return None;
    }
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(s.get(i..i + 2)?, 16).ok()).collect()
}

#[cfg(windows)]
fn dpapi(data: &[u8], protect: bool) -> Option<Vec<u8>> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};
    let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
    let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
    // SAFETY : tampons valides pendant l'appel ; la sortie est copiée puis libérée avec LocalFree
    unsafe {
        let ok = if protect {
            CryptProtectData(&input, std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
        } else {
            CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
        };
        if ok == 0 || out.pbData.is_null() {
            return None;
        }
        let v = std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec();
        LocalFree(out.pbData as _);
        Some(v)
    }
}

#[cfg(not(windows))]
fn dpapi(_data: &[u8], _protect: bool) -> Option<Vec<u8>> {
    None
}

#[tauri::command]
pub fn secret_protect(text: String) -> Result<String, String> {
    if text.len() > 4096 {
        return Err("long".into());
    }
    dpapi(text.as_bytes(), true).map(|v| to_hex(&v)).ok_or_else(|| "dpapi".into())
}

#[tauri::command]
pub fn secret_unprotect(hex: String) -> Result<String, String> {
    let b = from_hex(&hex).ok_or("hex")?;
    let v = dpapi(&b, false).ok_or("dpapi")?;
    String::from_utf8(v).map_err(|_| "utf8".into())
}

# THIRD_PARTY_LICENSES — DedCut (fait par ByKemi)

Règle du projet (cahier des charges §1) : avant chaque composant tiers, on vérifie et on note **nom, version, site officiel, licence, redistribution autorisée**. Licences privilégiées : MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause. **Jamais sans accord** : GPL, AGPL, non commerciale, payante, propriétaire, modèle à restrictions commerciales, licence inconnue. FFmpeg : uniquement LGPL, jamais `--enable-gpl` / `--enable-nonfree` / libx264 / libx265 sans accord.

Textes complets : dossier `LICENSES/` (un fichier par licence), `LICENCES-RUST.txt` (chaque brique Rust avec ses mentions de copyright), `LICENCES-TIERS.txt` (version livrée aux utilisateurs). Voir aussi `NOTICE.md`.

## Interface (JavaScript, livré avec DedCut)

| Composant | Version | Site officiel | Licence | Redistribution |
| --- | --- | --- | --- | --- |
| react | 19.3.0 | https://react.dev/ | MIT | ✅ |
| react-dom | 19.3.0 | https://react.dev/ | MIT | ✅ |
| scheduler | 0.28.0 | https://react.dev/ | MIT | ✅ |
| @tauri-apps/api | 2.12.1 | https://github.com/tauri-apps/tauri#readme | Apache-2.0 OR MIT | ✅ |
| @tauri-apps/plugin-global-shortcut | 2.4.0 | https://github.com/tauri-apps/plugins-workspace | MIT OR Apache-2.0 | ✅ |
| mp4box.js | 0.5.3 | https://github.com/gpac/mp4box.js | BSD-3-Clause | ✅ (mention de copyright reproduite) |
| mp4-muxer | 5.2.2 | https://github.com/Vanilagy/mp4-muxer | MIT | ✅ |
| @huggingface/transformers (sous-titres automatiques) | 3.8.1 | https://github.com/huggingface/transformers.js | Apache-2.0 | ✅ |
| @huggingface/jinja | 0.5.10 | https://github.com/huggingface/huggingface.js | MIT | ✅ |
| onnxruntime-web + onnxruntime-common (moteur d'inférence) | 1.22.0-dev.20250409-89f8206ba4 | https://github.com/microsoft/onnxruntime | MIT | ✅ |
| flatbuffers (dépendance d'onnxruntime-web) | 25.9.23 | https://github.com/google/flatbuffers | Apache-2.0 | ✅ |
| long (dépendance d'onnxruntime-web) | 5.3.2 | https://github.com/dcodeIO/long.js | Apache-2.0 | ✅ |
| protobufjs et @protobufjs/* (dépendance d'onnxruntime-web) | 7.6.6 | https://github.com/protobufjs/protobuf.js | BSD-3-Clause | ✅ (mention de copyright reproduite) |
| platform.js (dépendance d'onnxruntime-web) | 1.3.6 | https://github.com/bestiejs/platform.js | MIT | ✅ |
| guid-typescript (dépendance d'onnxruntime-web) | 1.0.9 | https://github.com/NicolasDeveloper/guid-typescript | ISC | ✅ |
| @tauri-apps/plugin-updater (mises à jour, v4.28.0) | 2.13.1 | https://github.com/tauri-apps/plugins-workspace | MIT OR Apache-2.0 | ✅ |
| @tauri-apps/plugin-process (redémarrage après mise à jour) | 2.4.0 | https://github.com/tauri-apps/plugins-workspace | MIT OR Apache-2.0 | ✅ |
| @anthropic-ai/sdk (Assistant IA : Claude, v4.26.0) | 0.131.0 | https://github.com/anthropics/anthropic-sdk-typescript | MIT | ✅ |
| standardwebhooks (dépendance du SDK Claude) | 1.1.1 | https://github.com/standard-webhooks/standard-webhooks | MIT | ✅ |
| @stablelib/base64 (dépendance de standardwebhooks) | 1.0.1 | https://github.com/StableLib/stablelib | MIT | ✅ |
| fast-sha256 (dépendance de standardwebhooks) | 1.3.0 | https://github.com/dchest/fast-sha256-js | Unlicense (domaine public) | ✅ |
| json-schema-to-ts, ts-algebra, @babel/runtime (dépendances du SDK Claude, surtout des types) | 3.1.1 / 2.0.0 / 7.29.7 | https://github.com/ThomasAribart/json-schema-to-ts | MIT | ✅ |
| ag-psd (espace Image : ouvrir et enregistrer les fichiers PSD avec calques, v4.46.0) | 31.0.2 | https://github.com/Agamnentzar/ag-psd | MIT | ✅ |
| base64-js (dépendance d'ag-psd) | 1.5.1 | https://github.com/beatgammit/base64-js | MIT | ✅ |
| pako (dépendance d'ag-psd et d'utif2 : compression zlib) | 2.1.0 / 1.0.11 | https://github.com/nodeca/pako | MIT AND Zlib | ✅ |
| utif2 (espace Image : lire et écrire les fichiers TIFF, v4.46.0) | 4.1.0 | https://github.com/photopea/UTIF.js | MIT | ✅ |
| opentype.js (espace Image : convertir un texte en formes, v4.46.0) | 2.0.0 | https://github.com/opentypejs/opentype.js | MIT | ✅ |
| acorn (espace Musique : lire le code des extensions pour y placer les garde-fous anti-blocage, v4.48.0) | 8.19.0 | https://github.com/acornjs/acorn | MIT | ✅ (aucune dépendance) |
| qrcode-generator (QR codes du Montage, du Live et d'Image, v4.65.0) | 2.0.4 | https://github.com/kazuhikoarase/qrcode-generator | MIT (Kazuhiko Arase ; « QR Code » marque de DENSO WAVE) | ✅ (aucune dépendance) |

## Partie Windows (Rust, livré avec DedCut) — 245 briques

Dépendances directes : tauri, tauri-plugin-single-instance, tauri-plugin-global-shortcut, tauri-plugin-dialog, tauri-plugin-opener (MIT OR Apache-2.0, https://github.com/tauri-apps).

⚠ **MPL-2.0** (copyleft faible, par fichier) : cssparser, cssparser-macros, selectors, dtoa-short (projet Servo), option-ext — dépendances de Tauri, non modifiées. Redistribution autorisée ; obligations : indiquer où trouver le code source (crates.io / GitHub) et publier nos modifications si on modifie un de ces fichiers.

| Brique | Version | Site officiel | Licence | Redistribution |
| --- | --- | --- | --- | --- |
| adler2 | 2.0.1 | https://github.com/oyvindln/adler2 | 0BSD OR MIT OR Apache-2.0 | ✅ |
| aho-corasick | 1.1.5 | https://github.com/BurntSushi/aho-corasick | Unlicense OR MIT | ✅ |
| alloc-no-stdlib | 3.0.0 | https://github.com/dropbox/rust-alloc-no-stdlib | BSD-3-Clause | ✅ |
| alloc-stdlib | 0.3.0 | https://github.com/dropbox/rust-alloc-no-stdlib | BSD-3-Clause | ✅ |
| anyhow | 1.0.104 | https://github.com/dtolnay/anyhow | MIT OR Apache-2.0 | ✅ |
| base64 | 0.22.1 | https://github.com/marshallpierce/rust-base64 | MIT OR Apache-2.0 | ✅ |
| base64 | 0.23.1 | https://github.com/marshallpierce/rust-base64 | MIT OR Apache-2.0 | ✅ |
| bit-set | 0.8.0 | https://github.com/contain-rs/bit-set | Apache-2.0 OR MIT | ✅ |
| bit-vec | 0.8.0 | https://github.com/contain-rs/bit-vec | Apache-2.0 OR MIT | ✅ |
| bitflags | 1.3.2 | https://github.com/bitflags/bitflags | MIT/Apache-2.0 | ✅ |
| bitflags | 2.13.2 | https://github.com/bitflags/bitflags | MIT OR Apache-2.0 | ✅ |
| block-buffer | 0.10.4 | https://github.com/RustCrypto/utils | MIT OR Apache-2.0 | ✅ |
| brotli | 9.0.0 | https://github.com/dropbox/rust-brotli | BSD-3-Clause AND MIT | ✅ |
| brotli-decompressor | 6.0.1 | https://github.com/dropbox/rust-brotli-decompressor | BSD-3-Clause/MIT | ✅ |
| bs58 | 0.5.1 | https://github.com/Nullus157/bs58-rs | MIT/Apache-2.0 | ✅ |
| byteorder | 1.5.0 | https://github.com/BurntSushi/byteorder | Unlicense OR MIT | ✅ |
| bytes | 1.12.1 | https://github.com/tokio-rs/bytes | MIT | ✅ |
| camino | 1.2.6 | https://github.com/camino-rs/camino | MIT OR Apache-2.0 | ✅ |
| cargo_metadata | 0.19.2 | https://github.com/oli-obk/cargo_metadata | MIT | ✅ |
| cargo-platform | 0.1.9 | https://github.com/rust-lang/cargo | MIT OR Apache-2.0 | ✅ |
| cfb | 0.14.0 | https://github.com/mdsteele/rust-cfb | MIT | ✅ |
| cfg-if | 1.0.5 | https://github.com/rust-lang/cfg-if | MIT OR Apache-2.0 | ✅ |
| chrono | 0.4.45 | https://github.com/chronotope/chrono | MIT OR Apache-2.0 | ✅ |
| cookie | 0.18.2 | https://github.com/SergioBenitez/cookie-rs | MIT OR Apache-2.0 | ✅ |
| cpufeatures | 0.2.17 | https://github.com/RustCrypto/utils | MIT OR Apache-2.0 | ✅ |
| crc32fast | 1.5.2 | https://github.com/srijs/rust-crc32fast | MIT OR Apache-2.0 | ✅ |
| crossbeam-channel | 0.5.17 | https://github.com/crossbeam-rs/crossbeam | MIT OR Apache-2.0 | ✅ |
| crossbeam-utils | 0.8.23 | https://github.com/crossbeam-rs/crossbeam | MIT OR Apache-2.0 | ✅ |
| crypto-common | 0.1.7 | https://github.com/RustCrypto/traits | MIT OR Apache-2.0 | ✅ |
| cssparser | 0.37.0 | https://github.com/servo/rust-cssparser | MPL-2.0 | ✅ |
| cssparser-macros | 0.7.1 | https://github.com/servo/rust-cssparser | MPL-2.0 | ✅ |
| ctor | 1.0.13 | https://github.com/mmastrac/linktime | Apache-2.0 OR MIT | ✅ |
| darling | 0.24.1 | https://github.com/TedDriggs/darling | MIT | ✅ |
| darling_core | 0.24.1 | https://github.com/TedDriggs/darling | MIT | ✅ |
| darling_macro | 0.24.1 | https://github.com/TedDriggs/darling | MIT | ✅ |
| defmt | 1.1.1 | https://github.com/knurling-rs/defmt | MIT OR Apache-2.0 | ✅ |
| defmt-macros | 1.1.1 | https://github.com/knurling-rs/defmt | MIT OR Apache-2.0 | ✅ |
| defmt-parser | 1.0.0 | https://github.com/knurling-rs/defmt | MIT OR Apache-2.0 | ✅ |
| deranged | 0.5.8 | https://github.com/jhpratt/deranged | MIT OR Apache-2.0 | ✅ |
| derive_more | 2.1.1 | https://github.com/JelteF/derive_more | MIT | ✅ |
| derive_more-impl | 2.1.1 | https://github.com/JelteF/derive_more | MIT | ✅ |
| digest | 0.10.7 | https://github.com/RustCrypto/traits | MIT OR Apache-2.0 | ✅ |
| dirs | 7.0.0 | https://codeberg.org/dirs/dirs-rs | MIT OR Apache-2.0 | ✅ |
| dirs-sys | 0.5.0 | https://github.com/dirs-dev/dirs-sys-rs | MIT OR Apache-2.0 | ✅ |
| displaydoc | 0.2.7 | https://github.com/yaahc/displaydoc | MIT OR Apache-2.0 | ✅ |
| dom_query | 0.28.0 | https://github.com/niklak/dom_query | MIT | ✅ |
| dpi | 0.1.2 | https://github.com/rust-windowing/winit | Apache-2.0 AND MIT | ✅ |
| dtoa | 1.0.11 | https://github.com/dtolnay/dtoa | MIT OR Apache-2.0 | ✅ |
| dtoa-short | 0.3.5 | https://github.com/upsuper/dtoa-short | MPL-2.0 | ✅ |
| dunce | 1.0.5 | https://gitlab.com/kornelski/dunce | CC0-1.0 OR MIT-0 OR Apache-2.0 | ✅ |
| dyn-clone | 1.0.20 | https://github.com/dtolnay/dyn-clone | MIT OR Apache-2.0 | ✅ |
| equivalent | 1.0.2 | https://github.com/indexmap-rs/equivalent | Apache-2.0 OR MIT | ✅ |
| erased-serde | 0.4.10 | https://github.com/dtolnay/erased-serde | MIT OR Apache-2.0 | ✅ |
| fastrand | 2.5.0 | https://github.com/smol-rs/fastrand | Apache-2.0 OR MIT | ✅ |
| fdeflate | 0.3.7 | https://github.com/image-rs/fdeflate | MIT OR Apache-2.0 | ✅ |
| flate2 | 1.1.10 | https://github.com/rust-lang/flate2-rs | MIT OR Apache-2.0 | ✅ |
| fnv | 1.0.7 | https://github.com/servo/rust-fnv | Apache-2.0 / MIT | ✅ |
| foldhash | 0.2.0 | https://github.com/orlp/foldhash | Zlib | ✅ |
| form_urlencoded | 1.2.2 | https://github.com/servo/rust-url | MIT OR Apache-2.0 | ✅ |
| generic-array | 0.14.7 | https://github.com/fizyk20/generic-array.git | MIT | ✅ |
| getrandom | 0.3.4 | https://github.com/rust-random/getrandom | MIT OR Apache-2.0 | ✅ |
| getrandom | 0.4.3 | https://github.com/rust-random/getrandom | MIT OR Apache-2.0 | ✅ |
| glob | 0.3.4 | https://github.com/rust-lang/glob | MIT OR Apache-2.0 | ✅ |
| global-hotkey | 0.8.0 | https://github.com/tauri-apps/global-hotkey | Apache-2.0 OR MIT | ✅ |
| hashbrown | 0.12.3 | https://github.com/rust-lang/hashbrown | MIT OR Apache-2.0 | ✅ |
| hashbrown | 0.17.1 | https://github.com/rust-lang/hashbrown | MIT OR Apache-2.0 | ✅ |
| heck | 0.5.0 | https://github.com/withoutboats/heck | MIT OR Apache-2.0 | ✅ |
| hex | 0.4.3 | https://github.com/KokaKiwi/rust-hex | MIT OR Apache-2.0 | ✅ |
| html5ever | 0.39.0 | https://github.com/servo/html5ever | MIT OR Apache-2.0 | ✅ |
| http | 1.5.0 | https://github.com/hyperium/http | MIT OR Apache-2.0 | ✅ |
| http-range | 0.1.5 | https://github.com/bancek/rust-http-range.git | MIT | ✅ |
| ico | 0.5.0 | https://github.com/mdsteele/rust-ico | MIT | ✅ |
| icu_collections | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_locale_core | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_normalizer | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_normalizer_data | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_properties | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_properties_data | 2.3.0 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| icu_provider | 2.3.1 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| ident_case | 1.0.1 | https://github.com/TedDriggs/ident_case | MIT/Apache-2.0 | ✅ |
| idna | 1.1.0 | https://github.com/servo/rust-url/ | MIT OR Apache-2.0 | ✅ |
| idna_adapter | 1.2.2 | https://github.com/hsivonen/idna_adapter | Apache-2.0 OR MIT | ✅ |
| indexmap | 1.9.3 | https://github.com/bluss/indexmap | Apache-2.0 OR MIT | ✅ |
| indexmap | 2.14.2 | https://github.com/indexmap-rs/indexmap | Apache-2.0 OR MIT | ✅ |
| infer | 0.22.0 | https://github.com/bojand/infer | MIT | ✅ |
| itoa | 1.0.18 | https://github.com/dtolnay/itoa | MIT OR Apache-2.0 | ✅ |
| jiff | 0.2.37 | https://github.com/BurntSushi/jiff | Unlicense OR MIT | ✅ |
| jiff-core | 0.1.1 | https://github.com/BurntSushi/jiff | Unlicense OR MIT | ✅ |
| jiff-tzdb | 0.1.8 | https://github.com/BurntSushi/jiff | Unlicense OR MIT | ✅ |
| jiff-tzdb-platform | 0.1.3 | https://github.com/BurntSushi/jiff | Unlicense OR MIT | ✅ |
| json-patch | 4.2.0 | https://github.com/idubrov/json-patch | MIT/Apache-2.0 | ✅ |
| jsonptr | 0.7.1 | https://github.com/chanced/jsonptr | MIT OR Apache-2.0 | ✅ |
| keyboard-types | 0.7.0 | https://github.com/pyfisch/keyboard-types | MIT OR Apache-2.0 | ✅ |
| keyboard-types | 0.8.3 | https://github.com/rust-windowing/keyboard-types | MIT OR Apache-2.0 | ✅ |
| libc | 0.2.190 | https://github.com/rust-lang/libc | MIT OR Apache-2.0 | ✅ |
| litemap | 0.8.3 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| lock_api | 0.4.14 | https://github.com/Amanieu/parking_lot | MIT OR Apache-2.0 | ✅ |
| log | 0.4.34 | https://github.com/rust-lang/log | MIT OR Apache-2.0 | ✅ |
| markup5ever | 0.39.0 | https://github.com/servo/html5ever | MIT OR Apache-2.0 | ✅ |
| memchr | 2.8.3 | https://github.com/BurntSushi/memchr | Unlicense OR MIT | ✅ |
| mime | 0.3.17 | https://github.com/hyperium/mime | MIT OR Apache-2.0 | ✅ |
| miniz_oxide | 0.8.9 | https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide | MIT OR Zlib OR Apache-2.0 | ✅ |
| miniz_oxide | 0.9.1 | https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide | MIT OR Zlib OR Apache-2.0 | ✅ |
| mio | 1.2.3 | https://github.com/tokio-rs/mio | MIT | ✅ |
| muda | 0.20.0 | https://github.com/tauri-apps/muda | Apache-2.0 OR MIT | ✅ |
| new_debug_unreachable | 1.0.6 | https://github.com/mbrubeck/rust-debug-unreachable | MIT | ✅ |
| num-conv | 0.2.2 | https://github.com/jhpratt/num-conv | MIT OR Apache-2.0 | ✅ |
| num-traits | 0.2.19 | https://github.com/rust-num/num-traits | MIT OR Apache-2.0 | ✅ |
| once_cell | 1.21.4 | https://github.com/matklad/once_cell | MIT OR Apache-2.0 | ✅ |
| open | 5.4.4 | https://github.com/Byron/open-rs | MIT | ✅ |
| option-ext | 0.2.0 | https://github.com/soc/option-ext.git | MPL-2.0 | ✅ |
| parking_lot | 0.12.5 | https://github.com/Amanieu/parking_lot | MIT OR Apache-2.0 | ✅ |
| parking_lot_core | 0.9.12 | https://github.com/Amanieu/parking_lot | MIT OR Apache-2.0 | ✅ |
| percent-encoding | 2.3.2 | https://github.com/servo/rust-url/ | MIT OR Apache-2.0 | ✅ |
| phf | 0.13.1 | https://github.com/rust-phf/rust-phf | MIT | ✅ |
| phf_generator | 0.13.1 | https://github.com/rust-phf/rust-phf | MIT | ✅ |
| phf_macros | 0.13.1 | https://github.com/rust-phf/rust-phf | MIT | ✅ |
| phf_shared | 0.13.1 | https://github.com/rust-phf/rust-phf | MIT | ✅ |
| pin-project-lite | 0.2.17 | https://github.com/taiki-e/pin-project-lite | Apache-2.0 OR MIT | ✅ |
| plist | 1.10.1 | https://github.com/ebarnard/rust-plist/ | MIT | ✅ |
| png | 0.17.16 | https://github.com/image-rs/image-png | MIT OR Apache-2.0 | ✅ |
| png | 0.18.1 | https://github.com/image-rs/image-png | MIT OR Apache-2.0 | ✅ |
| potential_utf | 0.1.6 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| powerfmt | 0.2.0 | https://github.com/jhpratt/powerfmt | MIT OR Apache-2.0 | ✅ |
| precomputed-hash | 0.1.1 | https://github.com/emilio/precomputed-hash | MIT | ✅ |
| proc-macro2 | 1.0.107 | https://github.com/dtolnay/proc-macro2 | MIT OR Apache-2.0 | ✅ |
| quick-xml | 0.42.0 | https://github.com/tafia/quick-xml | MIT | ✅ |
| quote | 1.0.47 | https://github.com/dtolnay/quote | MIT OR Apache-2.0 | ✅ |
| raw-window-handle | 0.6.2 | https://github.com/rust-windowing/raw-window-handle | MIT OR Apache-2.0 OR Zlib | ✅ |
| ref-cast | 1.0.27 | https://github.com/dtolnay/ref-cast | MIT OR Apache-2.0 | ✅ |
| ref-cast-impl | 1.0.27 | https://github.com/dtolnay/ref-cast | MIT OR Apache-2.0 | ✅ |
| regex | 1.13.1 | https://github.com/rust-lang/regex | MIT OR Apache-2.0 | ✅ |
| regex-automata | 0.4.18 | https://github.com/rust-lang/regex | MIT OR Apache-2.0 | ✅ |
| regex-syntax | 0.8.11 | https://github.com/rust-lang/regex | MIT OR Apache-2.0 | ✅ |
| rfd | 0.16.0 | https://github.com/PolyMeilex/rfd | MIT | ✅ |
| rustc-hash | 2.1.3 | https://github.com/rust-lang/rustc-hash | Apache-2.0 OR MIT | ✅ |
| same-file | 1.0.6 | https://github.com/BurntSushi/same-file | Unlicense/MIT | ✅ |
| schemars | 0.8.22 | https://github.com/GREsau/schemars | MIT | ✅ |
| schemars | 0.9.0 | https://github.com/GREsau/schemars | MIT | ✅ |
| schemars | 1.2.2 | https://github.com/GREsau/schemars | MIT | ✅ |
| schemars_derive | 0.8.22 | https://github.com/GREsau/schemars | MIT | ✅ |
| scopeguard | 1.2.0 | https://github.com/bluss/scopeguard | MIT OR Apache-2.0 | ✅ |
| selectors | 0.38.0 | https://github.com/servo/stylo | MPL-2.0 | ✅ |
| semver | 1.0.28 | https://github.com/dtolnay/semver | MIT OR Apache-2.0 | ✅ |
| serde | 1.0.229 | https://github.com/serde-rs/serde | MIT OR Apache-2.0 | ✅ |
| serde_core | 1.0.229 | https://github.com/serde-rs/serde | MIT OR Apache-2.0 | ✅ |
| serde_derive | 1.0.229 | https://github.com/serde-rs/serde | MIT OR Apache-2.0 | ✅ |
| serde_derive_internals | 0.29.1 | https://github.com/serde-rs/serde | MIT OR Apache-2.0 | ✅ |
| serde_json | 1.0.151 | https://github.com/serde-rs/json | MIT OR Apache-2.0 | ✅ |
| serde_repr | 0.1.21 | https://github.com/dtolnay/serde-repr | MIT OR Apache-2.0 | ✅ |
| serde_spanned | 1.1.1 | https://github.com/toml-rs/toml | MIT OR Apache-2.0 | ✅ |
| serde_with | 3.24.0 | https://github.com/jonasbb/serde_with/ | MIT OR Apache-2.0 | ✅ |
| serde_with_macros | 3.24.0 | https://github.com/jonasbb/serde_with/ | MIT OR Apache-2.0 | ✅ |
| serde-untagged | 0.1.9 | https://github.com/dtolnay/serde-untagged | MIT OR Apache-2.0 | ✅ |
| serialize-to-javascript | 0.1.2 | https://github.com/chippers/serialize-to-javascript | MIT OR Apache-2.0 | ✅ |
| serialize-to-javascript-impl | 0.1.2 | https://github.com/chippers/serialize-to-javascript | MIT OR Apache-2.0 | ✅ |
| servo_arc | 0.4.3 | https://github.com/servo/stylo | MIT OR Apache-2.0 | ✅ |
| sha2 | 0.10.9 | https://github.com/RustCrypto/hashes | MIT OR Apache-2.0 | ✅ |
| simd-adler32 | 0.3.10 | https://github.com/mcountryman/simd-adler32 | MIT | ✅ |
| siphasher | 1.0.4 | https://github.com/jedisct1/rust-siphash | MIT OR Apache-2.0 | ✅ |
| smallvec | 1.16.2 | https://github.com/servo/rust-smallvec | MIT OR Apache-2.0 | ✅ |
| socket2 | 0.6.5 | https://github.com/rust-lang/socket2 | MIT OR Apache-2.0 | ✅ |
| softbuffer | 0.4.8 | https://github.com/rust-windowing/softbuffer | MIT OR Apache-2.0 | ✅ |
| stable_deref_trait | 1.2.1 | https://github.com/storyyeller/stable_deref_trait | MIT OR Apache-2.0 | ✅ |
| string_cache | 0.9.0 | https://github.com/servo/string-cache | MIT OR Apache-2.0 | ✅ |
| strsim | 0.11.1 | https://github.com/rapidfuzz/strsim-rs | MIT | ✅ |
| syn | 2.0.119 | https://github.com/dtolnay/syn | MIT OR Apache-2.0 | ✅ |
| syn | 3.0.6 | https://github.com/dtolnay/syn | MIT OR Apache-2.0 | ✅ |
| synstructure | 0.14.0 | https://github.com/mystor/synstructure | MIT | ✅ |
| tao | 0.37.1 | https://github.com/tauri-apps/tao | Apache-2.0 | ✅ |
| tauri | 2.12.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tauri-codegen | 2.7.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tauri-macros | 2.7.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tauri-plugin-dialog | 2.8.1 | https://github.com/tauri-apps/plugins-workspace | Apache-2.0 OR MIT | ✅ |
| tauri-plugin-fs | 2.6.0 | https://github.com/tauri-apps/plugins-workspace | Apache-2.0 OR MIT | ✅ |
| tauri-plugin-global-shortcut | 2.4.0 | https://github.com/tauri-apps/plugins-workspace | Apache-2.0 OR MIT | ✅ |
| tauri-plugin-opener | 2.7.0 | https://github.com/tauri-apps/plugins-workspace | Apache-2.0 OR MIT | ✅ |
| tauri-plugin-single-instance | 2.5.2 | https://github.com/tauri-apps/plugins-workspace | Apache-2.0 OR MIT | ✅ |
| tauri-runtime | 2.12.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tauri-runtime-wry | 2.12.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tauri-utils | 2.10.1 | https://github.com/tauri-apps/tauri | Apache-2.0 OR MIT | ✅ |
| tendril | 0.5.1 | https://github.com/servo/html5ever | MIT OR Apache-2.0 | ✅ |
| thiserror | 2.0.21 | https://github.com/dtolnay/thiserror | MIT OR Apache-2.0 | ✅ |
| thiserror-impl | 2.0.21 | https://github.com/dtolnay/thiserror | MIT OR Apache-2.0 | ✅ |
| time | 0.3.55 | https://github.com/time-rs/time | MIT OR Apache-2.0 | ✅ |
| time-core | 0.1.9 | https://github.com/time-rs/time | MIT OR Apache-2.0 | ✅ |
| time-macros | 0.2.32 | https://github.com/time-rs/time | MIT OR Apache-2.0 | ✅ |
| tinystr | 0.8.4 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| tinyvec | 1.13.3 | https://github.com/Lokathor/tinyvec | Zlib OR Apache-2.0 OR MIT | ✅ |
| tokio | 1.53.1 | https://github.com/tokio-rs/tokio | MIT | ✅ |
| toml | 1.1.6+spec-1.1.0 | https://github.com/toml-rs/toml | MIT OR Apache-2.0 | ✅ |
| toml_datetime | 1.1.1+spec-1.1.0 | https://github.com/toml-rs/toml | MIT OR Apache-2.0 | ✅ |
| toml_parser | 1.1.3+spec-1.1.0 | https://github.com/toml-rs/toml | MIT OR Apache-2.0 | ✅ |
| toml_writer | 1.1.2+spec-1.1.0 | https://github.com/toml-rs/toml | MIT OR Apache-2.0 | ✅ |
| tracing | 0.1.44 | https://github.com/tokio-rs/tracing | MIT | ✅ |
| tracing-attributes | 0.1.31 | https://github.com/tokio-rs/tracing | MIT | ✅ |
| tracing-core | 0.1.36 | https://github.com/tokio-rs/tracing | MIT | ✅ |
| tray-icon | 0.25.1 | https://github.com/tauri-apps/tray-icon | MIT OR Apache-2.0 | ✅ |
| typeid | 1.0.3 | https://github.com/dtolnay/typeid | MIT OR Apache-2.0 | ✅ |
| typenum | 1.20.1 | https://github.com/paholg/typenum | MIT OR Apache-2.0 | ✅ |
| unicode-ident | 1.0.26 | https://github.com/dtolnay/unicode-ident | (MIT OR Apache-2.0) AND Unicode-3.0 | ✅ |
| unicode-segmentation | 1.13.3 | https://github.com/unicode-rs/unicode-segmentation | MIT OR Apache-2.0 | ✅ |
| url | 2.5.8 | https://github.com/servo/rust-url | MIT OR Apache-2.0 | ✅ |
| urlpattern | 0.6.0 | https://github.com/denoland/rust-urlpattern | MIT | ✅ |
| utf8_iter | 1.0.4 | https://github.com/hsivonen/utf8_iter | Apache-2.0 OR MIT | ✅ |
| uuid | 1.27.0 | https://github.com/uuid-rs/uuid | Apache-2.0 OR MIT | ✅ |
| walkdir | 2.5.0 | https://github.com/BurntSushi/walkdir | Unlicense/MIT | ✅ |
| web_atoms | 0.2.6 | https://github.com/servo/html5ever | MIT OR Apache-2.0 | ✅ |
| web-time | 1.1.0 | https://github.com/daxpedda/web-time | MIT OR Apache-2.0 | ✅ |
| webview2-com | 0.39.1 | https://github.com/wravery/webview2-rs | MIT | ✅ |
| webview2-com-macros | 0.8.1 | https://github.com/wravery/webview2-rs | MIT | ✅ |
| webview2-com-sys | 0.39.1 | https://github.com/wravery/webview2-rs | MIT | ✅ |
| winapi-util | 0.1.11 | https://github.com/BurntSushi/winapi-util | Unlicense OR MIT | ✅ |
| window-vibrancy | 0.8.1 | https://github.com/tauri-apps/tauri-plugin-vibrancy | Apache-2.0 OR MIT | ✅ |
| windows | 0.62.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows_x86_64_msvc | 0.52.6 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows_x86_64_msvc | 0.53.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-collections | 0.3.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-core | 0.62.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-future | 0.3.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-implement | 0.60.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-interface | 0.59.3 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-link | 0.2.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-numerics | 0.3.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-result | 0.4.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-strings | 0.5.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-sys | 0.59.0 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-sys | 0.60.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-sys | 0.61.2 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-targets | 0.52.6 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-targets | 0.53.5 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-threading | 0.2.1 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| windows-version | 0.1.7 | https://github.com/microsoft/windows-rs | MIT OR Apache-2.0 | ✅ |
| winnow | 1.0.4 | https://github.com/winnow-rs/winnow | MIT | ✅ |
| writeable | 0.6.4 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| wry | 0.57.0 | https://github.com/tauri-apps/wry | Apache-2.0 OR MIT | ✅ |
| yoke | 0.8.3 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| yoke-derive | 0.8.4 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zerofrom | 0.1.8 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zerofrom-derive | 0.1.8 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zerotrie | 0.2.5 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zerovec | 0.11.8 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zerovec-derive | 0.11.6 | https://github.com/unicode-org/icu4x | Unicode-3.0 | ✅ |
| zlib-rs | 0.6.8 | https://github.com/trifectatechfoundation/zlib-rs | Zlib | ✅ |
| zmij | 1.0.23 | https://github.com/dtolnay/zmij | MIT | ✅ |

## Sous-titres automatiques — DedCut AI (v3.5.0)

Reconnaissance vocale **100 % locale** : la voix est analysée par un modèle Whisper exécuté dans DedCut (worker + ONNX Runtime Web / WebAssembly). Rien n'est envoyé : ni audio, ni vidéo, ni texte.

**Livré avec DedCut** : le moteur ONNX Runtime Web (`ort/ort-wasm-simd-threaded.jsep.mjs` + `.wasm`, ~21 Mo, licence MIT) et le code de reconnaissance (@huggingface/transformers, Apache-2.0). Aucune adresse internet n'est utilisée par ce code : `env.allowRemoteModels = false`, les fichiers du moteur sont chargés depuis `/ort/` (jamais depuis un CDN), le cache est le nôtre.

⚠ **Composants tiers du moteur ONNX Runtime (WebAssembly)** : le binaire `.wasm` est compilé à partir d'ONNX Runtime (MIT) et peut contenir une partie des composants listés dans `LICENSES/ONNXRuntime-ThirdPartyNotices.txt` (texte complet fourni par Microsoft, livré avec DedCut sous le nom `LICENCES-ONNXRuntime.txt`) : protobuf, ONNX, flatbuffers, abseil, GSL, date, re2 (BSD-3-Clause / Apache-2.0 / MIT / Boost), et **Eigen sous MPL-2.0** (copyleft faible, par fichier ; non modifié ; code source : https://gitlab.com/libeigen/eigen). Aucune licence GPL, LGPL, AGPL ni non commerciale dans cette liste. Les entrées propres aux autres versions d'ONNX Runtime (par ex. Intel MKL, oneDNN, CUDA) ne concernent pas ce binaire WebAssembly.

**Modèles de reconnaissance — téléchargés seulement à la demande de l'utilisateur, jamais inclus dans l'installateur.** Téléchargement depuis https://huggingface.co (révision figée dans l'adresse, aucun compte, aucun jeton, aucun cookie). Chaque fichier est vérifié (taille + SHA-256, valeurs dans `src/whisper-models.json`) avant d'être gardé ; un fichier incorrect est effacé. Les modèles sont les conversions ONNX quantifiées de **OpenAI Whisper** (code et poids sous licence **MIT**, https://github.com/openai/whisper) publiées par Xenova / Hugging Face sous licence **Apache-2.0**. Aucune restriction d'usage commercial.

| Modèle | Révision | Taille | Licence | Page officielle |
| --- | --- | --- | --- | --- |
| Xenova/whisper-tiny | `5332fcc35e32…` | 41,6 Mo | apache-2.0 | https://huggingface.co/Xenova/whisper-tiny |
| Xenova/whisper-base | `64da57285918…` | 76,0 Mo | apache-2.0 | https://huggingface.co/Xenova/whisper-base |
| Xenova/whisper-small | `2d67713f236a…` | 240,2 Mo | apache-2.0 | https://huggingface.co/Xenova/whisper-small |

Redistribution : DedCut ne redistribue pas les modèles ; chaque utilisateur les télécharge lui-même depuis Hugging Face. Les modèles supprimés depuis DedCut disparaissent de son cache.

## Détection de visages et détourage de personne — Recadrage automatique (v3.10.0), effets « Personne » (v4.30.0), fond de la webcam du studio (v4.41.0)

| Composant | Site officiel | Licence | Livré ? |
| --- | --- | --- | --- |
| @mediapipe/tasks-vision 1.0.1 (code JavaScript + WebAssembly, `public/vendor/mediapipe/vision_bundle.mjs`, `vision_wasm_internal.js/.wasm`) | https://ai.google.dev/edge/mediapipe | Apache-2.0 (champ `license` du paquet npm) | Oui |
| Modèle BlazeFace « short range » (`blaze_face_short_range.tflite`, 230 Ko) | https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector | Apache-2.0 (fiche du modèle MediaPipe — à re-vérifier sur la fiche officielle avant toute diffusion payante) | Oui |
| Modèle « Selfie segmenter » (`selfie_segmenter.tflite`, 250 Ko, float16, SHA-256 `191ac952…658b`) — effets « Personne » (contour, néon, aura, fond flou / noir et blanc / sombre), v4.30.0 | https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter | Apache-2.0 (vérifié sur la fiche officielle du modèle « Model Card MediaPipe Selfie Segmentation », Google, 6 mai 2021 : « Licensed under Apache License, Version 2.0 ») | Oui |

Tout tourne en local : aucune image n'est envoyée nulle part. Le texte de la licence est dans `LICENSES/Apache-2.0.txt`.

## Générateur de vidéo IA — téléchargé à la demande, NON livré dans l'installateur (v4.0.0)

Rien de ce qui suit n'est dans l'installateur : DedCut le télécharge dans `%LOCALAPPDATA%DedCutai` quand l'utilisateur clique sur « Télécharger le moteur et le modèle » (adresses et empreintes SHA-256 écrites dans `src-tauri/src/ai.rs`). Tout fonctionne hors ligne ensuite.

| Composant | Source | Licence (vérifiée sur la source, 2026-10-03) | Taille |
| --- | --- | --- | --- |
| stable-diffusion.cpp (build Windows Vulkan, tag master-929-3f8527a) + ggml | https://github.com/leejet/stable-diffusion.cpp | MIT (fichiers `stable-diffusion.cpp.txt` et `ggml.txt` dans l'archive) | 30 Mo |
| Wan 2.1 T2V 1.3B (poids fp16, repackagés par Comfy-Org) | https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged | Apache-2.0 (champ licence du dépôt) | 2,84 Go |
| FastWan 2.2 TI2V 5B (FastVideo / Hao AI Lab, distillé en 3 étapes ; GGUF q6_k par Green-Sky) — **modèle recommandé (v4.2.0)** | https://huggingface.co/FastVideo/FastWan2.2-TI2V-5B-FullAttn-Diffusers et https://huggingface.co/Green-Sky/FastWan2.2-TI2V-5B-FullAttn-GGUF | Apache-2.0 (champ licence des deux dépôts) | 4,21 Go |
| Real-ESRGAN ncnn-vulkan 20220424 (netteté x2, modèle « realesr-animevideov3 ») — finition v4.3 | https://github.com/xinntao/Real-ESRGAN (BSD-3-Clause) et https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan (MIT) | BSD-3-Clause / MIT (fichiers LICENSE des dépôts) | 45 Mo |
| RIFE ncnn-vulkan 20221029, modèle rife-v4.6 (fluidité x2 ; seuls l’exécutable, vcomp140.dll, LICENSE et rife-v4.6 sont extraits) | https://github.com/nihui/rife-ncnn-vulkan (MIT) ; modèle RIFE https://github.com/hzwer/ECCV2022-RIFE (MIT) | MIT | archive 432 Mo |
| TAEHV « taew2_2 » (décodeur rapide pour Wan 2.2 5B, commit fa579a9) | https://github.com/madebyollin/taehv | MIT (fichier LICENSE du dépôt) | 23 Mo |
| Wan 2.1 VACE 1.3B (poids fp16, facultatif : mode « à partir d'une image », téléchargé seulement si l'utilisateur le demande) | https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged | Apache-2.0 (champ licence du dépôt) | 4,31 Go |
| Wan 2.1 VAE | idem | Apache-2.0 | 254 Mo |
| UMT5-XXL encodeur, quantifié Q4_K_S (city96) | https://huggingface.co/city96/umt5-xxl-encoder-gguf | Apache-2.0 (champ licence du dépôt) | 3,5 Go |

Outils Windows utilisés pour le téléchargement : `curl.exe`, `tar.exe`, `certutil.exe` (fournis avec Windows 10/11, non redistribués).
Les vidéos créées appartiennent à l'utilisateur ; Wan 2.1 (Apache-2.0) n'impose pas de restriction d'usage commercial, mais l'utilisateur reste responsable du contenu qu'il génère.

## Cerveau de DedCut IA — téléchargé à la demande, NON livré dans l'installateur (v4.36.0)

Rien de ce qui suit n'est dans l'installateur : DedCut le télécharge dans `%LOCALAPPDATA%\DedCut\ai` quand l'utilisateur clique sur « Télécharger le cerveau » dans l'Assistant IA (adresses figées et empreintes SHA-256 dans `src-tauri/src/ai.rs`, morceaux « llama » et « qwen »). Le moteur tourne ensuite sur le PC, n'écoute que 127.0.0.1 avec une clé tirée au hasard (`src-tauri/src/brain.rs`) ; rien ne passe par internet.

| Composant | Source | Licence (vérifiée sur la source, 2026-10-05) | Taille |
| --- | --- | --- | --- |
| llama.cpp + ggml, build b11408 Windows Vulkan x64 (llama-server et ses DLL) | https://github.com/ggml-org/llama.cpp | MIT (licence du dépôt, API GitHub) | 33 Mo |
| libomp.dll (LLVM OpenMP, inclus dans l'archive de llama.cpp) | https://github.com/llvm/llvm-project | Apache-2.0 avec exception LLVM (fichier `LICENSE-LLVM-OpenMP` dans l'archive) | inclus |
| Qwen3.5-4B (équipe Qwen, Alibaba) | https://huggingface.co/Qwen/Qwen3.5-4B | Apache-2.0 (champ licence du dépôt) | — |
| Qwen3.5-4B GGUF Q4_K_M (compression par Unsloth, commit e87f176) | https://huggingface.co/unsloth/Qwen3.5-4B-GGUF | Apache-2.0 (champ licence du dépôt) | 2,74 Go |
| Mise en forme de conversation `src-tauri/src/brain-chat.jinja` (livrée avec DedCut) | modèle de conversation inclus dans le fichier de Qwen3.5-4B | Apache-2.0 ; **modifiée par DedCut** (une ligne : bloc de réflexion vide gardé pour tous les messages de l'assistant, pour que le moteur réutilise sa mémoire) | 8 Ko |

Brique Rust ajoutée en dépendance directe pour lier le moteur à DedCut (objet « job » de Windows : il s'arrête avec DedCut) : `windows-sys` 0.61 (MIT OR Apache-2.0, déjà présent par Tauri, voir la liste Rust plus haut).
Les réponses et montages produits appartiennent à l'utilisateur.

## Bibliothèque de vraies musiques — téléchargées à la demande, NON livrées dans l'installateur (v4.40.0)

82 morceaux choisis sur Free Music Archive. La licence de **chaque** morceau a été lue sur sa page (lien `rel="license"` = https://creativecommons.org/publicdomain/zero/1.0/) le 2026-10-05 : **CC0 1.0, domaine public**. Utilisation libre, même commerciale, sans obligation de citer l'artiste (DedCut affiche quand même son nom). Les fichiers sont copiés tels quels (MP3 d'origine, non modifiés) dans la publication `musiques-1` du dépôt public https://github.com/Bykemi/DedCut-mises-a-jour (marquée « pre-release », jamais « latest »). DedCut télécharge un morceau seulement quand l'utilisateur l'ajoute, vérifie sa taille et son empreinte SHA-256 (`src-tauri/src/music.rs`, catalogue `src-tauri/src/musiques.json` avec la page source de chaque morceau) et le range dans `Vidéos\DedCut\Musiques`. L'écoute (▶) lit le fichier en direct depuis cette même adresse.

| Artiste | Source | Licence | Taille |
| --- | --- | --- | --- |
| HoliznaCC0 — 35 morceaux (albums : Public Domain Lofi, OCEAN MEMORY ( Lo-fi Chill ), Summer Air ( Lo-fi ), Spring Woke Me Up, Nature Spirit, PHONK - AURA FARMING, After Dark, Background Music, Ruby - Chiptunes, Amethyst - Chiptunes!, Retro Gamer Soundtrack!, Busted Guitar (JAZZ), A Synth Wave Christmas Special) | https://freemusicarchive.org/music/holiznacc0/ | CC0 1.0 (domaine public), lien de licence de chaque page de morceau | 220 Mo |
| Loyalty Freak Music — 30 morceaux (albums : POSITIVE ATTITUDE !, ROLLER DISCO DANCE DANCE, ROBOT DANCE !, INSTRUMENTAL R&B BEATS TO SING OR RAP ON, TO CHILL AND STAY AWAKE, MELODIES WITH A BEAT, HYPER METAL !, WITCHY, BATTY, SPOOKY, HALLOWEEN IN SEPTEMBER !!, MINIMAL AMBIENT BOUNCE) | https://freemusicarchive.org/music/Loyalty_Freak_Music/ | CC0 1.0 (domaine public), lien de licence de chaque page de morceau | 191 Mo |
| Komiku — 17 morceaux (albums : Helice Awesome Dance Adventure !!, Poupi's incredible adventures !, It's time for adventure !, It's time for adventure ! vol 2, It's time for adventure ! vol 5, Tale on the Late, ULTRA PERSON VOL1, Captain Glouglou's Incredible Week Soundtrack) | https://freemusicarchive.org/music/Komiku/ | CC0 1.0 (domaine public), lien de licence de chaque page de morceau | 86 Mo |

Refusé : FreePD (site fermé), Pixabay et la bibliothèque audio YouTube (leurs conditions interdisent de redistribuer les musiques dans un autre logiciel), musiques CC BY-NC (usage commercial interdit), corpus sans page source par morceau.

## Live (direct YouTube, Twitch, Facebook, Kick) — v4.41.0

Aucune brique nouvelle. Le client RTMP / RTMPS (`src-tauri/src/live.rs`) est écrit pour DedCut. Pour les adresses rtmps://, il utilise directement `rustls` 0.23 (Apache-2.0 OR ISC OR MIT, avec `ring`) et `rustls-platform-verifier` 0.7 (MIT OR Apache-2.0), qui étaient **déjà livrés** avec DedCut pour les mises à jour automatiques (mêmes versions, voir la liste Rust plus haut) ; elles sont seulement devenues des dépendances directes dans `Cargo.toml` (ordinateur seulement). L'image est encodée en H.264 et le son en AAC par les encodeurs du système (WebCodecs de WebView2), comme l'export ; la copie MP4 du live utilise mp4-muxer (déjà livré, MIT).

## Overlays du live (v4.52.0)

Aucune brique nouvelle, aucun fichier ajouté. Les 30 overlays (cadres de webcam, bandeaux de nom, écrans d'attente, contours d'écran, rappels, ambiances) sont dessinés en code par DedCut dans `public/engine/10r-overlays.js` (formes, dégradés, particules) : aucun dessin, logo, police ni nom repris d'une autre application ou d'un site. Les icônes (@, cœur, flèche de souris, plus, coche) sont des tracés faits pour DedCut ; aucune marque de plateforme n'est dessinée.

## Son de l'animation de lancement (v4.58.0)

Aucune brique nouvelle, aucun fichier son ajouté. Le son (souffle, lame, coupe métallique, coup sourd, étincelles, petite mélodie en Ré) est fabriqué en direct par DedCut avec l'API Web Audio du navigateur, dans `src/introsound.ts` (oscillateurs, bruit, filtres, réverbération calculée) : aucun échantillon, jingle ni son d'une autre application repris.

## Texte en voix — composants de Windows (v4.21.0), NON livrés avec DedCut

| Composant | Fourni par | Utilisation | Redistribution |
|---|---|---|---|
| System.Speech (SAPI 5) + Windows PowerShell 5.1 | Microsoft, déjà présents dans Windows | DedCut lance le moteur vocal de Windows pour lire un texte et enregistrer un WAV (code : src-tauri/src/tts.rs). Rien n'est téléchargé, rien ne sort du PC. | Aucune : DedCut ne copie ni ne livre ces composants ni les voix. |
| Voix installées (ex. Microsoft Hortense, Zira) | Microsoft (avec Windows) | Choisies par l'utilisateur dans la liste | Non livrées. Les conditions d'utilisation des voix sont celles de la licence Windows de l'utilisateur. |

## Assistant IA (v4.26.0) — services en ligne choisis par l'utilisateur, désactivés tant qu'il ne les configure pas

| Service | Utilisation | Coût |
|---|---|---|
| Claude (API Anthropic, api.anthropic.com) | via le SDK officiel @anthropic-ai/sdk (MIT) | payant, clé API de l'utilisateur |
| ChatGPT (API OpenAI) ou serveur compatible | demande envoyée par `curl.exe` (fourni avec Windows, non redistribué) — code : src-tauri/src/chat.rs | payant, clé API de l'utilisateur |
| Ollama (installé par l'utilisateur, sur son PC) | adresse 127.0.0.1, rien ne sort du PC | gratuit ; DedCut ne livre ni Ollama ni modèle |

Envoyé : le message de l'utilisateur et la description texte du projet (noms de fichiers, textes, durées). Jamais les vidéos, images ou sons. Les clés restent dans %APPDATA%DedCutassistant.json.

## Mises à jour automatiques (v4.28.0)

Briques Rust ajoutées (38, toutes listées avec leur texte dans LICENCES-RUST.txt) : tauri-plugin-updater 2.13.1 et tauri-plugin-process 2.4.0 (MIT OR Apache-2.0), minisign-verify 0.2.5 (MIT, vérification de signature), zip 4.6.1 (MIT), tar 0.4.46, rustls 0.23.45, hyper-rustls, tokio-rustls, rustls-platform-verifier (Apache-2.0 OR ISC OR MIT / MIT OR Apache-2.0), ring 0.17.14 (Apache-2.0 AND ISC), rustls-webpki 0.103.15 et untrusted 0.9.0 (ISC), subtle 2.6.1 (BSD-3-Clause), zeroize 1.9.0 (Apache-2.0 OR MIT), webpki-root-certs 1.0.9 (**CDLA-Permissive-2.0** : licence de données permissive pour la liste des certificats racine de Mozilla, redistribution libre, ajoutée à about.toml), et des briques système Windows/macOS/Android (MIT OR Apache-2.0).
Aucune brique GPL, AGPL, non commerciale ou payante.

Fonctionnement : DedCut lit https://github.com/Bykemi/DedCut-mises-a-jour/releases/latest/download/latest.json (dépôt PUBLIC qui ne contient que les installateurs ; le code est dans un dépôt privé). Chaque installateur est signé avec une clé privée gardée hors du projet (C:Usersmoi.dedcut-signature) ; la clé publique est dans tauri.conf.json. Vérification désactivable (Menu > Mises à jour).

## Icônes animées (v4.29.0)

Les 65 icônes de l'onglet Formes (public/engine/04b-icons.js) sont des **dessins originaux faits pour DedCut** (tracés SVG écrits à la main, grille 24 x 24). Aucune bibliothèque d'icônes tierce, aucun logo de marque ou de réseau social. Pas de licence tierce à respecter.

## Réduction de bruit du micro par IA (v4.42.0) — public/vendor/rnnoise/

- **@sapphi-red/web-noise-suppressor 0.4.1** (MIT, © 2022 翠 / green) : fichiers `dist/rnnoise/workletProcessor.js`, `rnnoise.wasm`, `rnnoise_simd.wasm` copiés sans modification ; texte MIT livré à côté (`LICENSE-web-noise-suppressor.txt`). https://github.com/sapphi-red/web-noise-suppressor
- Contient **rnnoise-wasm** de Shiguredo (Apache-2.0) https://github.com/shiguredo/rnnoise-wasm, construit à partir de **RNNoise** de Xiph.Org / Mozilla / Jean-Marc Valin (BSD-3-Clause) https://github.com/xiph/rnnoise
- Utilisé seulement si l'utilisateur coche « Réduction de bruit IA (RNNoise) » dans les filtres du micro du studio. Tout reste sur le PC.

## Télécommande (v4.42.0)

Serveur web écrit pour DedCut avec la bibliothèque standard de Rust (`src-tauri/src/remote.rs`), aucune brique ajoutée. Emotes du chat : images chargées à la demande depuis les serveurs de Twitch, Kick et 7TV (rien n'est livré avec DedCut).

## Espace Musique (v4.48.0) — registre des sons, préréglages et modèles

| Élément | Auteur | Source | Licence / droits | Redistribution | Preuve / décision |
| --- | --- | --- | --- | --- | --- |
| Sons de batterie, basses, boucles, sons uniques (« gen: ») | DedCut | calculés par `src/music/kits.ts` à l'ouverture (aucun fichier d'échantillon) | original DedCut, libre d'usage, y compris commercial | ✅ (rien d'extérieur) | code source lisible ; décision : livré |
| Instruments (synthé, FM, table d'ondes, échantillonneur), arpégiateur | DedCut | `src/music/instruments.ts` | original DedCut | ✅ | décision : livré |
| Préréglages d'instruments et d'effets, chaînes de mastering, modèles de projet, suites d'accords, styles de rythme | DedCut | `presets.ts`, `fx.ts`, `templates.ts`, `ops.ts` | original DedCut | ✅ | décision : livré |
| Effets (égaliseur, compresseurs, réverb, délai, etc.) et modules audio (AudioWorklet) | DedCut | `fx.ts`, `worklets.ts`, `dsp.ts` | original DedCut, sur l'API Web Audio du navigateur (WebView2) | ✅ | décision : livré |
| Exemples d'extensions (trémolo, repli d'onde) | DedCut | `src/music/ext.ts` | MIT (indiqué dans chaque exemple) | ✅ | décision : livré |
| acorn 8.19.0 | contributeurs acorn | npm `acorn` | MIT | ✅ | voir tableau « Interface » ; décision : livré |
| Sons importés par l'utilisateur | l'utilisateur ou un tiers | ses fichiers | inconnue : DedCut affiche l'origine et la licence saisies, et l'archive ZIP les signale « à vérifier » dans DROITS.json | ❓ jamais redistribués par DedCut | décision : l'utilisateur reste responsable |
| Plugins VST3 / CLAP installés sur le PC | leurs éditeurs | dossiers standard de Windows | celle de chaque éditeur | ❌ jamais copiés ni livrés | DedCut les **liste** seulement (aucun code exécuté, aucun SDK VST3 utilisé) |
| Voix de synthèse | Microsoft | voix de Windows déjà installées | conditions de Windows | ❌ non livrées | utilisées seulement si l'utilisateur le demande ; pas d'imitation d'une voix identifiable |
| Modèles d'IA | — | — | — | — | **aucun** : tempo, tonalité, accords, transcription et idées sont calculés par des règles DedCut sur le PC ; la séparation voix / batterie / basse par IA n'est pas incluse |

Aucun téléchargement, aucun service en ligne, aucun coût pour l'espace Musique.

## Outils de fabrication (non livrés)

- **Modèle d'installateur NSIS de Tauri** (tauri-bundler, CLI 2.12.1) — https://github.com/tauri-apps/tauri — MIT OR Apache-2.0 — copie gardée dans `src-tauri/installer/tauri-installer-2.12.1.nsi`, modifiée par `src-tauri/installer/make-template.cjs` (v4.59 : interface DedCut `dedcut-ui.nsh` et textes en 9 langues `dedcut-textes.nsh`, écrits pour DedCut ; images dessinées en code par `make-ui.cjs` — logo officiel de DedCut, dégradés, boutons ; rien de repris d'un autre installateur). Redistribution autorisée (le texte de l'installateur fait partie du programme d'installation).


| Outil | Site officiel | Licence |
| --- | --- | --- |
| @tauri-apps/cli | https://tauri.app | Apache-2.0 OR MIT |
| Vite | https://vite.dev | MIT |
| @vitejs/plugin-react | https://github.com/vitejs/vite-plugin-react | MIT |
| TypeScript | https://www.typescriptlang.org | Apache-2.0 |
| @types/react, @types/react-dom | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT |
| Rust (rustup, cargo, rustc) | https://www.rust-lang.org | MIT / Apache-2.0 |
| cargo-about | https://github.com/EmbarkStudios/cargo-about | MIT OR Apache-2.0 |
| Visual Studio Build Tools 2022 (C++) | https://visualstudio.microsoft.com | Licence Microsoft (gratuite pour un particulier) |
| NSIS | https://nsis.sourceforge.io | zlib/libpng (stub inclus dans l'installateur) |
| nsis-tauri-utils | https://github.com/tauri-apps/nsis-tauri-utils | MIT OR Apache-2.0 |
| sharp 0.34.5 (fabrique les images de l'installateur : `src-tauri/installer/make-images.cjs` et `make-ui.cjs`, à chaque compilation) | https://sharp.pixelplumbing.com | Apache-2.0 |
| @img/sharp-win32-x64 / libvips (moteur de sharp, non livré) | https://github.com/lovell/sharp-libvips | Apache-2.0 AND LGPL-3.0-or-later — **outil de développement uniquement, jamais embarqué ni redistribué** |
| onnxruntime-node 1.21.0 (installé avec transformers.js pour Node, **non utilisé et non embarqué**) | https://github.com/microsoft/onnxruntime | MIT |
| ESLint 10 (contrôle du code : `npm run verifier`) | https://eslint.org | MIT |
| globals (liste des noms du navigateur, pour ESLint) | https://github.com/sindresorhus/globals | MIT |
| jscpd 5 (recherche du code copié-collé : `npm run verifier`) | https://github.com/kucherenko/jscpd | MIT |
| cargo-deny (failles connues RustSec, licences et sources des paquets Rust : `src-tauri/deny.toml`) | https://github.com/EmbarkStudios/cargo-deny | MIT OR Apache-2.0 |
| Base RustSec (téléchargée par cargo-deny) | https://github.com/RustSec/advisory-db | CC0-1.0 |

## Non livré / non utilisé

- Microsoft Edge WebView2 : présent dans Windows, non redistribué (l'installateur télécharge le programme officiel de Microsoft seulement s'il manque).
- FFmpeg : **non utilisé** dans la version Tauri.
- Polices système Windows (Bahnschrift, Segoe UI, Microsoft YaHei UI, Yu Gothic UI, Malgun Gothic…) : utilisées, non redistribuées. Polices livrées : voir « Polices livrées (v4.36) ».
- Sons, musiques, icônes : aucun. Les bruitages sont générés par le code de DedCut ; les icônes et les images de l'installateur sont dessinées pour DedCut.
- Photo d'exemple des aperçus de filtres (`public/filter-sample.jpg`, 256×256) : **image générée par IA avec ChatGPT (OpenAI)** par ByKemi pour DedCut (pas une vraie personne) ; conditions d'OpenAI : l'utilisateur possède les images créées et peut s'en servir, y compris commercialement ; original dans `branding/filter-sample-original.webp`.
- 2e photo des aperçus de transition (`public/transition-sample.jpg`, 320×320, femme sur un banc au parc) et photo des aperçus des effets « Personne » (`public/person-sample.jpg`, 320×320, saut en rollers au skatepark) : **images générées par IA avec ChatGPT (OpenAI)** par ByKemi pour DedCut (confirmé par ByKemi le 2026-10-05 ; pas une vraie personne) ; conditions d'OpenAI : l'utilisateur possède les images créées et peut s'en servir, y compris commercialement ; originaux dans `branding/transition-sample-original.webp` et `branding/person-sample-original.webp`.
- Modèles d'IA : seuls le petit détecteur de visages BlazeFace (230 Ko) et le détoureur de personne « Selfie segmenter » (250 Ko) sont dans l'installateur (voir ci-dessus). Les modèles Whisper sont téléchargés à la demande (voir « Sous-titres automatiques »).
- **v4.50 (effets « Visage », Miniature IA)** : aucune nouvelle dépendance. Les effets « Visage » (lunettes, couronne, oreilles, cœurs…) et les styles de miniature sont **dessinés par DedCut** (formes faites en code, noms génériques) : rien de repris d'autres applications (ni noms, ni logos, ni dessins). Ils réutilisent BlazeFace et le « Selfie segmenter » déjà livrés. Polices des miniatures : Luckiest Guy, Lilita One, Archivo Black, Montserrat (déjà livrées, SIL OFL 1.1).
- **v4.67.2 (Halloween)** : aucune nouvelle dépendance. Les 12 effets Halloween (chauves-souris, fantômes, citrouilles, araignées, lune, brume, bonbons, slime, yeux, bougie, hanté, zombie), les 4 déguisements qui suivent le visage (chapeau de sorcière, crocs de vampire, maquillage squelette, tête de citrouille), les 10 filtres et le décor de l’accueil sont **dessinés par DedCut** (formes faites en code, réglages propres, noms génériques) : rien de repris d’autres applications.
- **v4.67.3 (Automne & cosy)** : aucune nouvelle dépendance. Les 10 effets (coup de vent, guirlande lumineuse, vapeur, coin du feu, reflet de flaque, bruine, scanner, pluie de code, feu d’artifice, lignes de vitesse), les 10 transitions (programmes pour la carte graphique écrits pour DedCut), les 10 filtres et les 6 styles de texte sont faits par DedCut (dessins en code, réglages de couleur) ; les styles de texte utilisent des polices déjà livrées (Yeseva One, Caveat, Patrick Hand, Gloria Hallelujah, Great Vibes, Lobster, licence OFL). Les modèles de sous-titres peuvent venir du miroir hf-mirror.com quand huggingface.co est bloqué (Chine) : mêmes fichiers, vérifiés par leur empreinte SHA-256. rustls passe de 0.23.45 à 0.23.46 (correctifs de sécurité RUSTSEC-2026-0346 à 0349), même licence.

## Brevets (information)

H.264 / H.265 / AAC : licence logicielle ≠ brevets. Encodage réalisé par WebView2/Windows. Usage personnel / diffusion gratuite : en général sans souci. Vente ou usage commercial : se renseigner (Via LA, Access Advance). WebM (VP9 + Opus) est libre de redevances.

## Polices livrées (v4.36) — 100 polices libres, fichiers d'origine NON modifiés

Source : dépôt officiel Google Fonts https://github.com/google/fonts (dossiers `ofl/` et `apache/`), téléchargées le 2026-10-05.
Licences : **SIL Open Font License 1.1** (90 polices) ou **Apache-2.0** (10 polices). Les deux autorisent l'usage commercial, l'intégration dans un logiciel et la redistribution, gratuitement.
Obligations respectées : chaque fichier est livré **tel quel** (pas de sous-ensemble, pas de conversion : les « noms réservés » de l'OFL ne posent donc aucun problème), avec son texte de licence à côté (`public/fonts/<nom>.license.txt`, livré dans l'appli) ; les polices ne sont jamais vendues seules. Les vidéos créées avec ces polices appartiennent à l'utilisateur (l'OFL ne s'applique pas aux documents/vidéos produits).
Texte générique de l'OFL : `LICENSES/OFL-1.1.txt`.

| Police | Fichier (nom d'origine) | Licence | Nom réservé (RFN) | Copyright |
| --- | --- | --- | --- | --- |
| Abril Fatface | `fonts/abrilfatface.ttf` (`AbrilFatface-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, TypeTogether (www.type-together.com), |
| Alfa Slab One | `fonts/alfaslabone.ttf` (`AlfaSlabOne-Regular.ttf`) | OFL-1.1 | oui | Copyright 2016 The Alfa Slab One Project Authors (http://www.jmsole.cl | info@jmsole.cl), with Reserved Font Name "Alfa Slab". |
| Allura | `fonts/allura.ttf` (`Allura-Regular.ttf`) | OFL-1.1 | non | Copyright 2010 The Allura Project Authors (https://github.com/googlefonts/allura) |
| Amatic SC | `fonts/amaticsc.ttf` (`AmaticSC-Regular.ttf`) | OFL-1.1 | non | Copyright 2015 The Amatic SC Project Authors (https://github.com/googlefonts/AmaticSC) |
| Anton | `fonts/anton.ttf` (`Anton-Regular.ttf`) | OFL-1.1 | non | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git) |
| Architects Daughter | `fonts/architectsdaughter.ttf` (`ArchitectsDaughter-Regular.ttf`) | OFL-1.1 | non | Copyright (c) 2010, Kimberly Geswein (kimberlygeswein.com) |
| Archivo Black | `fonts/archivoblack.ttf` (`ArchivoBlack-Regular.ttf`) | OFL-1.1 | non | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) |
| Audiowide | `fonts/audiowide.ttf` (`Audiowide-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012, Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Names "Audiowide" |
| Bangers | `fonts/bangers.ttf` (`Bangers-Regular.ttf`) | OFL-1.1 | non | Copyright 2010 The Bangers Project Authors (https://github.com/googlefonts/bangers) |
| Bebas Neue | `fonts/bebasneue.ttf` (`BebasNeue-Regular.ttf`) | OFL-1.1 | non | Copyright © 2010 by Dharma Type. |
| Black Ops One | `fonts/blackopsone.ttf` (`BlackOpsOne-Regular.ttf`) | OFL-1.1 | non | Copyright 2022 The Black-Ops Project Authors (https://github.com/googlefonts/googlefonts-project-template) |
| Bodoni Moda | `fonts/bodonimoda.ttf` (`BodoniModa[opsz,wght].ttf`) | OFL-1.1 | non | Copyright 2020 The Bodoni Moda Project Authors (https://github.com/indestructible-type/Bodoni) |
| Bowlby One | `fonts/bowlbyone.ttf` (`BowlbyOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by vernon adams (vern@newtypography.co.uk), |
| Bungee | `fonts/bungee.ttf` (`Bungee-Regular.ttf`) | OFL-1.1 | non | Copyright 2023 The Bungee Project Authors (https://github.com/djrrb/Bungee) |
| Bungee Shade | `fonts/bungeeshade.ttf` (`BungeeShade-Regular.ttf`) | OFL-1.1 | non | Copyright 2023 The Bungee Project Authors (https://github.com/djrrb/Bungee) |
| Butcherman | `fonts/butcherman.ttf` (`Butcherman-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Typomondo, |
| Caveat | `fonts/caveat.ttf` (`Caveat[wght].ttf`) | OFL-1.1 | non | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) |
| Chewy | `fonts/chewy.ttf` (`Chewy-Regular.ttf`) | Apache-2.0 | non |  |
| Cinzel | `fonts/cinzel.ttf` (`Cinzel[wght].ttf`) | OFL-1.1 | non | Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel) |
| Cinzel Decorative | `fonts/cinzeldecorative.ttf` (`CinzelDecorative-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012 Natanael Gama (info@ndiscovered.com), with Reserved Font Name 'Cinzel' |
| Comfortaa | `fonts/comfortaa.ttf` (`Comfortaa[wght].ttf`) | OFL-1.1 | oui | Copyright 2011 The Comfortaa Project Authors (https://github.com/alexeiva/comfortaa), with Reserved Font Name "Comfortaa". |
| Cookie | `fonts/cookie.ttf` (`Cookie-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by Ania Kruk (hello@aniakruk.com), |
| Courgette | `fonts/courgette.ttf` (`Courgette-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012 by Sorkin Type Co (www.sorkintype.com), with Reserved Font Name "Courgette". |
| Creepster | `fonts/creepster.ttf` (`Creepster-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Font Diner, Inc (diner@fontdiner.com), |
| Dancing Script | `fonts/dancingscript.ttf` (`DancingScript[wght].ttf`) | OFL-1.1 | oui | Copyright 2016 The Dancing Script Project Authors (https://github.com/googlefonts/DancingScript), with Reserved Font Name 'Dancing Script'. |
| DM Serif Display | `fonts/dmserifdisplay.ttf` (`DMSerifDisplay-Regular.ttf`) | OFL-1.1 | oui | Copyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'. All Rights Reserved. Source is a trademark of Adobe in the United States an |
| DynaPuff | `fonts/dynapuff.ttf` (`DynaPuff[wdth,wght].ttf`) | OFL-1.1 | non | Copyright 2021 The DynaPuff Project Authors (https://github.com/googlefonts/dynapuff) |
| Eater | `fonts/eater.ttf` (`Eater-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Typomondo, |
| Ewert | `fonts/ewert.ttf` (`Ewert-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 Johan Kallas (johankallas@gmail.com), Copyright (c) 2011 Mihkel Virkus (mihkelvirkus@gmail.com), |
| Fascinate | `fonts/fascinate.ttf` (`Fascinate-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by Brian J. Bonislawsky DBA Astigmatic (AOETI) |
| Faster One | `fonts/fasterone.ttf` (`FasterOne-Regular.ttf`) | OFL-1.1 | oui | Copyright 2012 The Faster Project Authors (https://github.com/etunni/faster), with Reserved Font Name 'Faster' |
| Fontdiner Swanky | `fonts/fontdinerswanky.ttf` (`FontdinerSwanky-Regular.ttf`) | Apache-2.0 | non |  |
| Fredoka | `fonts/fredoka.ttf` (`Fredoka[wdth,wght].ttf`) | OFL-1.1 | non | Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One) |
| Frijole | `fonts/frijole.ttf` (`Frijole-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Sideshow (a DBA of Font Diner, Inc) (www.fontdiner.com), |
| Gloria Hallelujah | `fonts/gloriahallelujah.ttf` (`GloriaHallelujah.ttf`) | OFL-1.1 | non | Copyright (c) 2010, Kimberly Geswein (kimberlygeswein.com) |
| Gochi Hand | `fonts/gochihand.ttf` (`GochiHand-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Juan Pablo del Peral (juandelperal@htfonts.com), |
| Gravitas One | `fonts/gravitasone.ttf` (`GravitasOne.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by Sorkin Type Co (www.sorkintype.com), |
| Great Vibes | `fonts/greatvibes.ttf` (`GreatVibes-Regular.ttf`) | OFL-1.1 | non | Copyright 2015 The Great Vibes Pro Project Authors (https://github.com/googlefonts/great-vibes) |
| Griffy | `fonts/griffy.ttf` (`Griffy-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012, Font Diner (www.fontdiner.com), |
| Handlee | `fonts/handlee.ttf` (`Handlee-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Joe Prince, Vissol Ltd. (http://www.vissol.co.uk/mavenpro/) |
| Homemade Apple | `fonts/homemadeapple.ttf` (`HomemadeApple-Regular.ttf`) | Apache-2.0 | non |  |
| Indie Flower | `fonts/indieflower.ttf` (`IndieFlower-Regular.ttf`) | OFL-1.1 | non | Copyright 2010 The Indie Flower Authors (kimberlygeswein.com), |
| JetBrains Mono | `fonts/jetbrainsmono.ttf` (`JetBrainsMono[wght].ttf`) | OFL-1.1 | non | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) |
| Jolly Lodger | `fonts/jollylodger.ttf` (`JollyLodger-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012, Font Diner (www.fontdiner.com), with Reserved Font Name "Jolly Lodger". |
| Josefin Sans | `fonts/josefinsans.ttf` (`JosefinSans[wght].ttf`) | OFL-1.1 | oui | Copyright 2010 The Josefin Sans Project Authors (https://github.com/ThomasJockin/JosefinSansFont-master), with Reserved Font Name "Josefin Sans". |
| Kaushan Script | `fonts/kaushanscript.ttf` (`KaushanScript-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Pablo Impallari (www.impallari.com|impallari@gmail.com), Copyright (c) 2011, Igino Marini. (www.ikern.com|mail@iginomarini.com), |
| Knewave | `fonts/knewave.ttf` (`Knewave-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2010, Tyler Finck <hello@sursly.com>, with Reserved Font Name: "Knewave". |
| Kranky | `fonts/kranky.ttf` (`Kranky-Regular.ttf`) | Apache-2.0 | non |  |
| Libre Baskerville | `fonts/librebaskerville.ttf` (`LibreBaskerville[wght].ttf`) | OFL-1.1 | oui | Copyright 2012 The Libre Baskerville Project Authors (https://github.com/impallari/Libre-Baskerville) with Reserved Font Name Libre Baskerville. |
| Lilita One | `fonts/lilitaone.ttf` (`LilitaOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 Juan Montoreano (juan@remolacha.biz), |
| Lobster | `fonts/lobster.ttf` (`Lobster-Regular.ttf`) | OFL-1.1 | oui | Copyright 2010 The Lobster Project Authors (https://github.com/impallari/The-Lobster-Font), with Reserved Font Name "Lobster". |
| Lora | `fonts/lora.ttf` (`Lora[wght].ttf`) | OFL-1.1 | oui | Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora". |
| Luckiest Guy | `fonts/luckiestguy.ttf` (`LuckiestGuy-Regular.ttf`) | Apache-2.0 | non |  |
| Manrope | `fonts/manrope.ttf` (`Manrope[wght].ttf`) | OFL-1.1 | non | Copyright 2018 The Manrope Project Authors (https://github.com/googlefonts/manrope) |
| Marck Script | `fonts/marckscript.ttf` (`MarckScript-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Denis Masharov <denis.masharov@gmail.com> & Marck Fogel, |
| MedievalSharp | `fonts/medievalsharp.ttf` (`MedievalSharp.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, wmk69 (wmk69@o2.pl), |
| Metal Mania | `fonts/metalmania.ttf` (`MetalMania-Regular.ttf`) | OFL-1.1 | non | Copyright (c) 2012 by Open Window (dathanboardman@gmail.com) with Reseved Font Name "Metal Mania" |
| Monofett | `fonts/monofett.ttf` (`Monofett-Regular.ttf`) | OFL-1.1 | oui | Copyright 2010 The Monofett Project Authors (https://github.com/googlefonts/monofett), with Reserved Font Name Monofett. |
| Monoton | `fonts/monoton.ttf` (`Monoton-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by vernon adams (vern@newtypography.co.uk), |
| Montserrat | `fonts/montserrat.ttf` (`Montserrat[wght].ttf`) | OFL-1.1 | non | Copyright 2024 The Montserrat.Git Project Authors (https://github.com/JulietaUla/Montserrat.git) |
| New Rocker | `fonts/newrocker.ttf` (`NewRocker-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Pablo Impallari (www.impallari.com|impallari@gmail.com), Copyright (c) 2011, Brenda Gallo (gbrenda1987@gmail.com), Copyright (c) 2011, Rodri |
| Nosifer | `fonts/nosifer.ttf` (`Nosifer-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Typomondo, |
| Orbitron | `fonts/orbitron.ttf` (`Orbitron[wght].ttf`) | OFL-1.1 | oui | Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron" |
| Oswald | `fonts/oswald.ttf` (`Oswald[wght].ttf`) | OFL-1.1 | non | Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont) |
| Outfit | `fonts/outfit.ttf` (`Outfit[wght].ttf`) | OFL-1.1 | non | Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts) |
| Pacifico | `fonts/pacifico.ttf` (`Pacifico-Regular.ttf`) | OFL-1.1 | non | Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico) |
| Parisienne | `fonts/parisienne.ttf` (`Parisienne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012 by Brian J. Bonislawsky DBA Astigmatic (AOETI) |
| Passion One | `fonts/passionone.ttf` (`PassionOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 Fontstage (info@fontstage.com), with Reserved Font Names, 'Passion' |
| Patrick Hand | `fonts/patrickhand.ttf` (`PatrickHand-Regular.ttf`) | OFL-1.1 | non | Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at) |
| Paytone One | `fonts/paytoneone.ttf` (`PaytoneOne-Regular.ttf`) | OFL-1.1 | oui | Copyright 2011 The Paytone Project Authors (https://github.com/googlefonts/paytoneFont), |
| Permanent Marker | `fonts/permanentmarker.ttf` (`PermanentMarker-Regular.ttf`) | Apache-2.0 | non |  |
| Pirata One | `fonts/pirataone.ttf` (`PirataOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012, Rodrigo Fuenzalida, Nicolas Massi (www.taip.com.ar / abc.taip.com.ar), with Reserved Font Name 'Pirata' |
| Playfair Display | `fonts/playfairdisplay.ttf` (`PlayfairDisplay[wght].ttf`) | OFL-1.1 | oui | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display" |
| Poppins | `fonts/poppins.ttf` (`Poppins-Regular.ttf`) | OFL-1.1 | non | Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) |
| Prata | `fonts/prata.ttf` (`Prata-Regular.ttf`) | OFL-1.1 | non | Copyright 2011 The Prata Project Authors (https://github.com/cyrealtype/Prata) |
| Press Start 2P | `fonts/pressstart2p.ttf` (`PressStart2P-Regular.ttf`) | OFL-1.1 | oui | Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P". |
| Quicksand | `fonts/quicksand.ttf` (`Quicksand[wght].ttf`) | OFL-1.1 | oui | Copyright 2011 The Quicksand Project Authors (https://github.com/andrew-paglinawan/QuicksandFamily), with Reserved Font Name “Quicksand”. |
| Raleway | `fonts/raleway.ttf` (`Raleway[wght].ttf`) | OFL-1.1 | oui | Copyright 2010 The Raleway Project Authors (impallari@gmail.com), with Reserved Font Name "Raleway". |
| Righteous | `fonts/righteous.ttf` (`Righteous-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by Brian J. Bonislawsky DBA Astigmatic (AOETI) |
| Rock Salt | `fonts/rocksalt.ttf` (`RockSalt-Regular.ttf`) | Apache-2.0 | non |  |
| Rubik Glitch | `fonts/rubikglitch.ttf` (`RubikGlitch-Regular.ttf`) | OFL-1.1 | non | Copyright 2020 The Rubik Filtered Project Authors (https://https://github.com/NaN-xyz/Rubik-Filtered) |
| Russo One | `fonts/russoone.ttf` (`RussoOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011-2012, Jovanny Lemonad (jovanny.ru), with Reserved Font Name "Russo" |
| Rye | `fonts/rye.ttf` (`Rye-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011 by Sorkin Type Co (www.sorkintype.com), |
| Sacramento | `fonts/sacramento.ttf` (`Sacramento-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2012, Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Names 'Sacramento' |
| Satisfy | `fonts/satisfy.ttf` (`Satisfy-Regular.ttf`) | Apache-2.0 | non |  |
| Shadows Into Light | `fonts/shadowsintolight.ttf` (`ShadowsIntoLight.ttf`) | OFL-1.1 | non | Copyright (c) 2010, Kimberly Geswein (kimberlygeswein.com) |
| Shrikhand | `fonts/shrikhand.ttf` (`Shrikhand-Regular.ttf`) | OFL-1.1 | non | Copyright (c) 2015 Jonny Pinhorn (jonpinhorn.typedesign@gmail.com) |
| Silkscreen | `fonts/silkscreen.ttf` (`Silkscreen-Regular.ttf`) | OFL-1.1 | non | Copyright 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen) |
| Sniglet | `fonts/sniglet.ttf` (`Sniglet-Regular.ttf`) | OFL-1.1 | non | Copyright (c) 2008, Haley Fiege (haley@kingdomofawesome.com), Copyright (c) 2012, Brenda Gallo (gbrenda1987@gmail.com), Copyright (c) 2013, Pablo Impallari (www |
| Sora | `fonts/sora.ttf` (`Sora[wght].ttf`) | OFL-1.1 | non | Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font) |
| Space Grotesk | `fonts/spacegrotesk.ttf` (`SpaceGrotesk[wght].ttf`) | OFL-1.1 | non | Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk) |
| Space Mono | `fonts/spacemono.ttf` (`SpaceMono-Regular.ttf`) | OFL-1.1 | non | Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono) |
| Special Elite | `fonts/specialelite.ttf` (`SpecialElite-Regular.ttf`) | Apache-2.0 | non |  |
| Staatliches | `fonts/staatliches.ttf` (`Staatliches-Regular.ttf`) | OFL-1.1 | non | Copyright 2018 The Staatliches Authors (https://github.com/googlefonts/staatliches) |
| Syne | `fonts/syne.ttf` (`Syne[wght].ttf`) | OFL-1.1 | non | Copyright 2017 The Syne Project Authors (https://gitlab.com/bonjour-monde/fonderie/syne-typeface) |
| Titan One | `fonts/titanone.ttf` (`TitanOne-Regular.ttf`) | OFL-1.1 | oui | Copyright (c) 2011, Rodrigo Fuenzalida (www.rfuenzalida.com|hello@rfuenzalida.com), |
| UnifrakturMaguntia | `fonts/unifrakturmaguntia.ttf` (`UnifrakturMaguntia-Book.ttf`) | OFL-1.1 | oui | Copyright (c) 2010, j. 'mach' wust, with Reserved Font Name UnifrakturMaguntia. Copyright (c) 2009, Peter Wiegel. |
| VT323 | `fonts/vt323.ttf` (`VT323-Regular.ttf`) | OFL-1.1 | non | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) |
| Yellowtail | `fonts/yellowtail.ttf` (`Yellowtail-Regular.ttf`) | Apache-2.0 | non |  |
| Yeseva One | `fonts/yesevaone.ttf` (`YesevaOne-Regular.ttf`) | OFL-1.1 | oui | Copyright 2012 The Yeseva One Project Authors (lemonad@jovanny.ru), with Reserved Font Name "Yeseva". |

## Vérification complète avant sortie (2026-10-05, v4.35)

- **JavaScript livré** : 0 licence payante, GPL ou AGPL. Licences trouvées : MIT, Apache-2.0, BSD-3-Clause, ISC, Unlicense, MIT OR CC0. Paquets BlueOak-1.0.0 (tar, minipass, chownr, yallist) et sharp/libvips (LGPL-3.0) : dépendances **Node seulement** de transformers.js, **absentes** de l'interface livrée (`dist/`) et de l'installateur.
- **Rust (Windows + Mac + Android, 519 briques)** : MIT / Apache-2.0 / BSD / ISC / Zlib / Unicode / CDLA ; 5 en MPL-2.0 (déjà notées, non modifiées) ; r-efi « MIT OR Apache-2.0 OR LGPL-2.1 » → choix MIT (sert seulement aux machines UEFI, pas à DedCut).
- **Mac** : la voix utilise la commande `say` de macOS (voix d'Apple, non livrées). **Android** : rien de plus que les briques Rust ci-dessus et le WebView du téléphone.
- **Fichiers livrés** : seulement les licences, le moteur ONNX, MediaPipe (+ 2 petits modèles Apache-2.0), mp4box.js, mp4-muxer, `filter-sample.jpg`, `transition-sample.jpg` et `person-sample.jpg`. 100 polices libres (OFL / Apache, non modifiées, voir plus haut). Aucun son, aucune musique, aucun logo de marque.
- `filter-sample.jpg`, `transition-sample.jpg` et `person-sample.jpg` : faites avec ChatGPT par ByKemi, images à ByKemi (conditions d'OpenAI) ✅.
- **À vérifier par ByKemi** : le nom « DedCut » sur la base des marques (INPI / EUIPO) avant de le déposer.

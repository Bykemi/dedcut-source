# NOTICE — DedCut

**DedCut** — logiciel de montage vidéo et de retouche photo gratuit, fait par **ByKemi**.
Copyright © 2026 ByKemi. Le code de DedCut est un logiciel libre sous licence GNU GPL version 3 ou ultérieure (fichier LICENSE à la racine du code source). Le nom « DedCut » et le logo DedCut appartiennent à ByKemi et ne sont pas couverts par cette licence : une version modifiée doit porter un autre nom et un autre logo.

DedCut est gratuit. Les dons sont facultatifs et ne débloquent aucune fonction : le montage et l'export restent toujours disponibles.

## Confidentialité

- DedCut fonctionne hors ligne. Aucune télémétrie, aucun envoi automatique de vidéos, de projets, d'audio ou de sous-titres vers un serveur.
- Connexions à internet, toutes visibles et liées à une action ou à un réglage de l'utilisateur :
  - vérification des mises à jour au démarrage (fichier `latest.json` sur GitHub, désactivable dans Menu > Mises à jour) ;
  - téléchargement **facultatif** des modèles de sous-titres (huggingface.co), du générateur de vidéo IA et du cerveau de DedCut IA (github.com, huggingface.co), seulement quand l'utilisateur le demande (fichiers vérifiés par SHA-256), puis tout fonctionne hors ligne ;
  - chat du live (espace Live, onglet Chat) : seulement quand l'utilisateur clique « Connecter le chat » ou lance un live avec un chat réglé, DedCut LIT le chat public (et, pour YouTube, le nombre de spectateurs toutes les 30 s ; les alertes viennent de ces mêmes messages) : Twitch (connexion anonyme en lecture seule à irc-ws.chat.twitch.tv, aucun compte) et YouTube (API officielle www.googleapis.com avec la clé gratuite de l'utilisateur, gardée sur son PC) ; sans compte relié, DedCut n'écrit jamais dans le chat ;
  - compte Twitch (espace Live, onglet Chat, facultatif) : seulement si l'utilisateur clique « Se connecter à Twitch », DedCut ouvre la page officielle de Twitch (connexion par code, le mot de passe reste chez Twitch) et garde sur le PC le jeton donné par Twitch (stockage local de DedCut). Avec ce jeton, DedCut parle directement à Twitch (id.twitch.tv, api.twitch.tv, eventsub.wss.twitch.tv) pour recevoir les alertes (follows, abonnements, bits, raids, points de chaîne), le nombre de spectateurs, et seulement quand l'utilisateur le demande : écrire un message dans son chat, supprimer un message, exclure ou bannir quelqu'un, changer le titre ou la catégorie du live. « Se déconnecter » efface le jeton et l'annule chez Twitch ;
  - compte YouTube (espace Live, onglet Chat, facultatif) : seulement si l'utilisateur clique « Se connecter » à côté de YouTube, DedCut ouvre la page officielle de Google (google.com/device, connexion par code, le mot de passe reste chez Google) et garde sur le PC le jeton donné par Google (stockage local de DedCut). Avec ce jeton, DedCut parle directement à Google (oauth2.googleapis.com, www.googleapis.com) pour trouver le live en cours de la chaîne, lire son chat, son nombre de spectateurs et ses nouveaux abonnés publics, et seulement quand l'utilisateur le demande : écrire un message, supprimer un message, exclure ou bannir quelqu'un, changer le titre du live. « Se déconnecter » efface le jeton et l'annule chez Google ;
  - compte Facebook (espace Live, onglet Chat, facultatif) : seulement si l'utilisateur clique « Se connecter » à côté de Facebook, DedCut ouvre la page officielle de Facebook (facebook.com/device, connexion par code, le mot de passe reste chez Facebook) et garde sur le PC le jeton du compte et celui de la Page choisie (stockage local de DedCut). Avec ces jetons, DedCut parle directement à Facebook (graph.facebook.com) pour lire la liste des Pages, les commentaires et le nombre de spectateurs du live en cours de la Page, et seulement quand l'utilisateur le demande : écrire un commentaire au nom de la Page ou supprimer un commentaire. « Se déconnecter » efface les jetons et retire l'autorisation chez Facebook ;
  - chat Kick (espace Live, onglet Chat) : seulement quand l'utilisateur a indiqué sa chaîne Kick et connecte le chat, DedCut lit les informations publiques de la chaîne (kick.com) et son chat public (ws-us2.pusher.com, le service utilisé par le site de Kick), en lecture seule et sans compte ;
  - Live (espace Live) : seulement quand l'utilisateur clique sur « Lancer le live », DedCut envoie l'image et le son choisis, avec sa clé de stream, au serveur qu'il a choisi (YouTube, Twitch, Facebook, Kick ou une autre adresse rtmp:// / rtmps://), rien d'autre ; la clé reste sur le PC (stockage local de DedCut) seulement si « Garder la clé sur ce PC » est coché ;
  - bibliothèque de musiques (onglet Audio) : l'écoute ▶ d'une vraie musique la lit depuis github.com, et l'ajout la télécharge (vérifiée par SHA-256) dans Vidéos\DedCut\Musiques ; les musiques « DedCut » sont composées sur le PC, sans internet ;
  - Assistant IA : seulement si l'utilisateur le configure avec sa propre clé (Claude, ChatGPT) ; il envoie le message et une description texte du projet, jamais les vidéos, images ou sons. Avec DedCut IA (intégrée, avec ou sans son cerveau) et avec Ollama, rien ne sort du PC : le cerveau de DedCut IA tourne sur l'ordinateur et n'écoute que l'adresse locale 127.0.0.1.
- Espace Image (retouche photo) : tout se fait sur le PC, sans internet. Les fonctions IA (détourage, retrait d'objet, ciel, colorisation, agrandissement) tournent en local, sans compte ni coût ; « Générer une image » utilise seulement le modèle de Vidéo IA déjà téléchargé. Les sauvegardes automatiques restent dans le stockage local de DedCut. Les extensions (.dcext) tournent dans une zone isolée sans accès aux fichiers, à internet, aux clés ou au bouton « Soutenir DedCut » ; elles ne peuvent modifier que les pixels du calque choisi, et DedCut peut démarrer sans elles.
- Les fichiers de l'utilisateur ne sont lus que lorsqu'il les choisit (import, ouverture d'un projet, glisser-déposer).
- Toute fonction en ligne future sera documentée et désactivable.

## Composants tiers

DedCut contient des logiciels libres de tiers, chacun sous sa propre licence :

- **Tauri** et ses modules (MIT OR Apache-2.0) — https://tauri.app — avec 245 briques Rust au total, sous licences MIT, Apache-2.0, BSD-3-Clause, Zlib, Unicode-3.0, et MPL-2.0 pour 5 d'entre elles (cssparser, cssparser-macros, selectors, dtoa-short, option-ext ; code source disponible sur https://crates.io, non modifié).
- **React**, **react-dom**, **scheduler** (MIT) — https://react.dev
- **@tauri-apps/api**, **@tauri-apps/plugin-global-shortcut** (MIT OR Apache-2.0) — https://github.com/tauri-apps
- **mp4box.js** 0.5.3 (BSD-3-Clause) — Copyright (c) 2012. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato — https://github.com/gpac/mp4box.js
- **mp4-muxer** 5.2.2 (MIT) — Copyright (c) 2023 Vanilagy — https://github.com/Vanilagy/mp4-muxer
- **Sous-titres automatiques** : **transformers.js** 3.8.1 (Apache-2.0, Hugging Face) — https://github.com/huggingface/transformers.js ; **ONNX Runtime Web** (MIT, Copyright (c) Microsoft Corporation) — https://github.com/microsoft/onnxruntime, dont le binaire WebAssembly contient des composants tiers (dont Eigen sous MPL-2.0, non modifié ; texte complet dans `LICENSES/ONNXRuntime-ThirdPartyNotices.txt`) ; **@huggingface/jinja** (MIT), flatbuffers et long (Apache-2.0), protobufjs (BSD-3-Clause), platform.js (MIT), guid-typescript (ISC).
- **MediaPipe Tasks Vision** 1.0.1 (Apache-2.0, Google) et les modèles BlazeFace et Selfie segmenter (Apache-2.0, Google) — recadrage automatique et effets « Personne », tout en local.
- **Espace Image** : **ag-psd** 31.0.2 (MIT, Agamnentzar) pour les fichiers PSD, avec base64-js (MIT) et **pako** (MIT et Zlib) ; **utif2** 4.1.0 (MIT, Photopea) pour les fichiers TIFF ; **opentype.js** 2.0.0 (MIT) pour transformer un texte en formes.
- **Mises à jour** : tauri-plugin-updater et tauri-plugin-process (MIT OR Apache-2.0).
- **Assistant IA** : @anthropic-ai/sdk (MIT, Anthropic) ; **windows-sys** (MIT OR Apache-2.0, Microsoft) pour arrêter le cerveau de DedCut IA avec DedCut ; mise en forme de conversation de Qwen3.5 (Apache-2.0, Alibaba Qwen), modifiée sur une ligne (`brain-chat.jinja`).
- **Cerveau de DedCut IA** (téléchargé à la demande, non inclus) : **llama.cpp** / ggml (MIT) — https://github.com/ggml-org/llama.cpp, avec libomp (Apache-2.0 avec exception LLVM) ; **Qwen3.5-4B** (Apache-2.0, Alibaba Qwen) — https://huggingface.co/Qwen/Qwen3.5-4B, version GGUF d'Unsloth (Apache-2.0).
- **Bibliothèque de musiques** : 82 morceaux en domaine public (CC0 1.0) de Komiku, HoliznaCC0 et Loyalty Freak Music (Free Music Archive), téléchargés à la demande, non livrés dans l'installateur.
- **100 polices libres** de Google Fonts (SIL Open Font License 1.1 / Apache-2.0), fichiers non modifiés, licence de chaque police livrée à côté (`fonts/<nom>.license.txt`).
- **Modèles Whisper** (téléchargés à la demande, non inclus) : OpenAI Whisper (MIT) — https://github.com/openai/whisper, conversions ONNX de Xenova (Apache-2.0) — https://huggingface.co/Xenova

L'affichage utilise **Microsoft Edge WebView2**, fourni par Windows (non redistribué avec DedCut).
DedCut n'inclut pas FFmpeg.

Textes complets des licences :
- `LICENSES/` — un fichier par licence (MIT, Apache-2.0, BSD-3-Clause, ISC, MPL-2.0, Unicode-3.0, Zlib) + `ONNXRuntime-ThirdPartyNotices.txt`
- `LICENCES-RUST.txt` — chaque brique Rust avec ses mentions de copyright
- `LICENCES-TIERS.txt` — mentions livrées avec le logiciel (bouton « Licences open source » dans DedCut)
- `THIRD_PARTY_LICENSES.md` — inventaire détaillé (nom, version, site officiel, licence, redistribution)

## Formats vidéo

L'export MP4 (H.264 / AAC) et l'enregistrement d'écran utilisent les encodeurs de Windows / WebView2. Les formats H.264 et AAC sont couverts par des brevets, indépendamment des licences logicielles. Le format WebM (VP9 / Opus), aussi proposé, est libre de redevances.

## Originalité

DedCut a sa propre identité graphique et son propre code. Il ne reprend ni code, ni icônes, ni effets, ni modèles, ni éléments graphiques de CapCut, Adobe Premiere Pro, DaVinci Resolve ou d'un autre logiciel propriétaire.

# DedCut

Logiciel de création **gratuit** pour Windows, fait par **ByKemi** : montage vidéo, enregistrement d'écran, live,
retouche photo et musique, avec un assistant IA. Tout se passe sur ton PC : pas de compte, pas de pub, pas de télémétrie.

- Site : https://dedcut.com
- Télécharger : https://github.com/Bykemi/DedCut-mises-a-jour/releases/latest
- Signaler un bug : dans DedCut, clique sur la pastille « bêta » (ou Menu > Signaler un bug), ou écris à bugs@dedcut.com

DedCut est en **bêta** : tout marche, mais il peut rester des bugs.

## Soutenir DedCut

DedCut est et restera gratuit. Si tu veux aider ByKemi à continuer, tu peux faire un don :
**https://paypal.me/DedCut** — c'est facultatif et ça ne débloque rien : toutes les fonctions sont pour tout le monde.

## Licence

Le code de DedCut est un **logiciel libre**, sous licence **GNU GPL version 3 ou ultérieure** (fichier [LICENSE](LICENSE)).
Tu peux l'étudier, le modifier et le partager, à condition que toute version partagée reste libre : même licence,
avec son code source.

- Les composants d'autres auteurs gardent leur propre licence : voir [tauri/THIRD_PARTY_LICENSES.md](tauri/THIRD_PARTY_LICENSES.md)
  et [tauri/LICENCES-TIERS.txt](tauri/LICENCES-TIERS.txt).
- Le **nom « DedCut »** et le **logo DedCut** appartiennent à ByKemi et ne sont pas couverts par la licence :
  une version modifiée doit porter un autre nom et un autre logo.
- Les mises à jour automatiques sont **signées par ByKemi** : une version fabriquée par quelqu'un d'autre ne peut pas
  se faire passer pour une mise à jour officielle.

## Fabriquer DedCut

Il faut Windows 10 ou 11, [Node.js](https://nodejs.org) 20 ou plus récent et [Rust](https://rustup.rs) (stable).

```
cd tauri
npm install
npm run tauri dev
```

Pour fabriquer un installateur sans la clé de signature des mises à jour (réservée à ByKemi) :

```
npx tauri build --config "{\"bundle\":{\"createUpdaterArtifacts\":false}}"
```

Le code de l'interface est dans `tauri/src` (React) et `tauri/public/engine` (moteur de l'éditeur), la partie Windows
dans `tauri/src-tauri` (Rust). Les textes des 9 langues sont dans `tauri/public/locales`.

---

## English

**DedCut** is a **free** creative app for Windows by **ByKemi**: video editing, screen recording, live streaming,
photo editing and music, with an AI assistant. Everything runs on your PC: no account, no ads, no telemetry.
Website: https://dedcut.com — Bug reports: the “beta” badge in DedCut, or bugs@dedcut.com.

The DedCut source code is **free software** under the **GNU GPL version 3 or later** (see [LICENSE](LICENSE)).
Third-party components keep their own licences (see `tauri/THIRD_PARTY_LICENSES.md`). The **DedCut name and logo**
belong to ByKemi and are not covered by the licence: a modified version must use another name and logo.
Automatic updates are signed by ByKemi.

DedCut is and will stay free. If you want to support ByKemi: **https://paypal.me/DedCut** (optional, unlocks nothing).

Build: Windows 10/11, Node.js 20+, Rust stable — `cd tauri`, `npm install`, `npm run tauri dev`.

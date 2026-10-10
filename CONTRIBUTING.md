# Aider DedCut / Contributing

*English below.*

Merci de vouloir aider DedCut ! Toute aide compte : signaler un bug, proposer une idée, corriger une traduction ou du code.

## Signaler un bug ou proposer une idée

- **Le plus simple** : dans DedCut, clique sur la pastille « bêta » (ou Menu > Signaler un bug). Le message part de ta
  messagerie vers bugs@dedcut.com, avec les infos techniques utiles (sans aucune donnée perso).
- Ou ouvre une **issue** sur ce dépôt : dis ce qui s'est passé, ce que tu faisais juste avant, ta version de DedCut et de Windows.
- Ne mets jamais de clé de stream, de mot de passe ou de fichier perso dans une issue.

## Proposer une correction (pull request)

1. Fabrique et lance DedCut (voir « Fabriquer DedCut » dans le [README](README.md)).
2. Fais une petite modification à la fois, testée dans l'application.
3. Avant d'envoyer : `cd tauri`, `npm run build` (vérifie le code) puis `npm run verifier` (sécurité, licences).
4. Ouvre une pull request qui explique simplement ce qui change et pourquoi.

Quelques règles du projet :

- **Gratuit pour toujours** : pas de fonction payante, pas de pub, pas de télémétrie, rien n'est envoyé sans une action
  de l'utilisateur.
- **Licences** : seulement des composants gratuits sous licence compatible avec la GPL-3.0 (MIT, Apache-2.0, BSD…), et
  chaque nouveau composant est noté dans `tauri/THIRD_PARTY_LICENSES.md` et `tauri/LICENCES-TIERS.txt`.
- **9 langues** : chaque texte de l'interface passe par les fichiers de `tauri/scripts/i18n-src/` (français, anglais,
  espagnol, allemand, italien, portugais, japonais, coréen, chinois), puis `node scripts/i18n-apply.cjs --locales-only`
  et `node scripts/check-i18n.mjs`.
- **Interface** : icônes dessinées au trait, jamais d'émojis ; dessins et effets originaux.
- **Sécurité** : pas de script en ligne ni de `onclick=` dans le HTML (politique de sécurité du contenu active).

En envoyant une contribution, tu acceptes qu'elle soit publiée sous la licence du projet, **GNU GPL version 3 ou ultérieure**.
Le nom et le logo DedCut restent à ByKemi.

---

## English

Thanks for wanting to help DedCut! Bug reports, ideas, translation fixes and code are all welcome.

- **Report a bug**: in DedCut, click the “beta” badge (or Menu > Report a bug) — the message goes from your own e-mail to
  bugs@dedcut.com with useful technical info (no personal data). Or open an issue here with what happened, what you were
  doing, and your DedCut and Windows versions. Never paste stream keys, passwords or personal files.
- **Pull requests**: build and run DedCut (see the [README](README.md)), keep changes small and tested, run `npm run build`
  and `npm run verifier` in `tauri/`, and explain what changes and why.
- **Project rules**: free forever (no paid features, no ads, no telemetry); only free, GPL-3.0-compatible dependencies,
  each one listed in `tauri/THIRD_PARTY_LICENSES.md`; every UI text in all 9 languages through `tauri/scripts/i18n-src/`;
  line icons, never emojis, in the UI; no inline scripts or `onclick=` attributes (Content Security Policy).

By contributing, you agree that your contribution is published under the project licence, **GNU GPL version 3 or later**.
The DedCut name and logo remain ByKemi's.

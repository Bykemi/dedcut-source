# Traduire DedCut

DedCut est conçu pour être traduit par la communauté. Ajouter une langue **ne demande aucune modification du code**.

## Ajouter une nouvelle langue
1. Copier `public/locales/en.json` (l'anglais est la référence complète) en `public/locales/<code>.json`
   — `<code>` = code de langue standard : `nl`, `pl`, `tr`, `ar`, `zh-TW`…
2. Traduire uniquement les **valeurs**, jamais les clés (`"cut": "…"`).
3. Garder les variables telles quelles : `{count}`, `{name}`, `{version}`…
4. Pluriels : garder la forme objet et fournir les formes de ta langue (`one`, `other`, et si besoin `zero`, `two`, `few`, `many` selon les règles Unicode CLDR).
5. Ajouter une ligne dans `public/locales/index.json` avec le nom de la langue **dans sa propre langue** : `{ "code": "nl", "name": "Nederlands" }`.
6. Vérifier : `node scripts/check-i18n.mjs` (clés manquantes, vides, variables incorrectes).

## Proposer une correction
Les traductions actuelles (sauf français et anglais) ont été faites rapidement : les corrections par des locuteurs natifs sont les bienvenues. Ce dossier `community-locales/` peut recevoir des propositions de fichiers avant leur intégration dans `public/locales/`.

## Règles
- Aucun texte visible ne doit être écrit en dur dans le code : tout passe par une clé.
- Les identifiants internes (effets, transitions, formats…) ne sont jamais traduits dans les projets `.dedcut` : un projet créé en français s'ouvre à l'identique en japonais.

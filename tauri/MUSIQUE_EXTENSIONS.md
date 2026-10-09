# DedCut Musique — créer une extension d'effet (kit de développement, version 1)

Une extension est un **petit traitement du son** écrit en JavaScript. Elle s'ajoute comme un effet sur une piste ou sur le master (Mixage ou Effets > « + Ajouter un effet », section Extensions).

## Ce qu'une extension peut faire, et ne peut pas faire

- Elle reçoit les échantillons de la piste où on l'ajoute, par blocs de 128, et ses propres réglages. C'est tout.
- Pas d'interface, pas de réseau, pas de fichiers, pas de mots de passe, pas d'accès au reste de DedCut. Elle ne peut **ni modifier ni recouvrir** le bouton « Soutenir DedCut » (elle n'a aucun accès à l'écran).
- Elle tourne dans le fil audio de l'espace Musique (AudioWorklet), avec ces protections :
  - **garde-fous anti-blocage** : DedCut lit le code avant de le charger (avec acorn, MIT) et ajoute une vérification dans chaque boucle et chaque fonction. Plus de 50 ms dans un même bloc (500 ms pour `init`) : l'extension est arrêtée ;
  - pas de fabrication de code (`eval`, `Function`, WebAssembly), pas d'expressions régulières, pas de code asynchrone (`async`, `await`, promesses), pas d'attente bloquante (Atomics) ; les objets de base de JavaScript sont gelés ;
  - une erreur, un signal invalide (pas un nombre, ou au-delà de ±8) ou un dépassement de temps : l'extension est **coupée**, le son passe sans elle, et elle est mise **en quarantaine** (Réglages > Extensions pour la réactiver) ;
  - un projet qui utilise une extension absente, désactivée ou en quarantaine s'ouvre quand même : le son passe sans elle et ses réglages restent dans le projet.
- **Limite honnête** : ce n'est pas une isolation de processus. Une extension qui réserve énormément de mémoire peut encore faire planter DedCut (la sauvegarde automatique protège le projet). N'installe que des extensions dont tu connais l'auteur.

## Format du fichier (`.json`)

```json
{
  "format": "dedcut-music-ext",
  "version": 1,
  "id": "mon-tremolo",
  "name": "Mon trémolo",
  "author": "Ton nom",
  "ver": "1.0.0",
  "description": "Volume qui ondule.",
  "licence": "MIT",
  "source": "https://exemple.org/mon-tremolo",
  "params": [
    { "k": "rate", "label": "Vitesse (Hz)", "min": 0.1, "max": 15, "def": 4 },
    { "k": "depth", "label": "Profondeur", "min": 0, "max": 1, "def": 0.5 }
  ],
  "init": "state.ph = 0;",
  "code": "const r = params.rate[0], d = params.depth[0];\nfor (let k = 0; k < outputs[0].length; k++) {\n  state.ph += r / sampleRate; const g = 1 - d * (0.5 + 0.5 * Math.sin(2 * Math.PI * state.ph));\n  for (let c = 0; c < outputs.length; c++) { const x = inputs && inputs[Math.min(c, inputs.length - 1)]; outputs[c][k] = x ? x[k] * g : 0; }\n}"
}
```

| Champ | Règle |
| --- | --- |
| `format`, `version` | toujours `"dedcut-music-ext"` et `1` |
| `id` | 2 à 40 caractères : lettres, chiffres, tirets. Même `id` = mise à jour de l'extension |
| `name`, `author`, `licence` | obligatoires, 80 caractères au plus |
| `ver`, `description`, `source` | affichés avant l'installation |
| `params` | 16 au plus ; `k` = nom court (lettres et chiffres, commence par une lettre), `label` (40 caractères au plus), `min` < `max`, `def` : des nombres |
| `init` | facultatif : corps d'une fonction `(state, sampleRate)` appelée une fois |
| `code` | corps d'une fonction `(inputs, outputs, params, state, sampleRate)` appelée pour chaque bloc de 128 échantillons ; 60 000 caractères au plus |

- `inputs` / `outputs` : un tableau par canal (`Float32Array` de 128 valeurs). `inputs` peut être vide (rien n'arrive) : écris alors des zéros.
- `params.<k>[0]` : valeur actuelle du réglage (automatisable dans DedCut).
- `state` : objet gardé d'un bloc à l'autre (préparé par `init`).
- Les noms qui commencent par `__dc` sont réservés : un code qui les utilise est refusé.

## Installation, mise à jour, retrait

- Réglages > Extensions > « Installer une extension… » : DedCut affiche nom, version, auteur, licence et source **avant** d'installer.
- Chaque version a une **empreinte** (SHA-256 du code, de `init` et des réglages). Une mise à jour (même `id`, code différent) redemande ton accord.
- « Révoquer » retire l'extension **et interdit cette empreinte** : elle ne pourra plus être réinstallée.
- « Désinstaller » la retire simplement.

## Exemples d'origine DedCut

Deux exemples (licence MIT) sont dans la fenêtre des extensions : « Trémolo (exemple) » et « Repli d'onde (exemple) ». Ils servent de modèle à copier.

## Plugins VST3 / CLAP

DedCut **liste** les plugins VST3 et CLAP installés (onglet « Plugins VST3 / CLAP ») mais **ne les charge pas** : leur son demanderait un moteur audio natif que l'espace Musique n'a pas, et un plugin natif ne peut pas être isolé de façon prouvée ici. Pendant la recherche, aucun code de plugin n'est exécuté (seuls les dossiers et le fichier `moduleinfo.json` des VST3 sont lus).

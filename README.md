# CMS Prêts — Canal Mhirsi Service

Une application toute simple pour le garage Canal Mhirsi Service : savoir quelle voiture de prêt est chez quel client, depuis quand, et quand elle doit revenir. Un prêt s'enregistre en quelques secondes : seul le nom du client est obligatoire.

## Ce que fait l'application

- **Grille de cartes** : chaque voiture avec son état (Dispo, Prêtée, Retard, Indispo), sa plaque et le client. Les voitures en retard passent en premier, les indisponibles en dernier. Toucher une pastille du haut (« 4 dispo », « 1 en retard »…) n'affiche que ces voitures.
- **Prêter** : toucher une voiture dispo, taper le nom du client (ou choisir un client récent), valider. En option : date de retour prévue, téléphone, note et photos.
- **Photos** (toutes facultatives) : au départ, le **permis** du client (recto, verso, ou un seul des deux) et la **jauge et l'état** de la voiture (jauge de carburant, avant, arrière, côtés, détail ou dégât). Au retour, la fiche de la voiture montre ces photos du départ (« Permis », « Jauge et état ») pour comparer avec la voiture rendue ; aucune photo n'est prise au retour. Toucher une photo l'affiche en grand. Tout reste dans l'**Historique** (« Permis et photos » sur chaque prêt).
- **Rendre** : toucher la voiture prêtée, puis « Voiture rendue ». Un bouton « Annuler » reste affiché 5 secondes en cas d'erreur.
- **Fiche** : client avec bouton d'appel, date de départ, retour prévu (en rouge s'il est dépassé), qui a fait le prêt, prêts précédents.
- **Gérer une voiture** : toucher une voiture dispo, puis le petit bouton « Gérer la voiture » à côté de la plaque pour changer son nom ou sa plaque, la retirer du parc, ou la **mettre de côté** (contrôle technique, réparation…). Elle passe alors en « Indispo » (gris), avec une raison facultative, et on ne peut plus la prêter ; toucher la carte grise puis « Remettre disponible » pour la rendre de nouveau prêtable.
- **Raccourcis (appui long sur une carte)** : sur une voiture prêtée, « Appeler » le client, « Voiture rendue » et « Voir l'historique de la voiture » ; sur une voiture dispo, « Mettre de côté » ; sur une voiture indispo, « Remettre disponible ». Tout reste faisable par le chemin normal.
- **Historique** : tous les prêts, rendus compris, à retrouver par jour, plaque, voiture ou client (pour un PV ou une amende). Le nom de celui qui a prêté reste, même s'il est retiré de l'équipe.
- **Le parc** (dans « Sur ce téléphone ») : ajouter une voiture avec un nom (la plaque est facultative), la modifier ou la retirer.
- **L'équipe** (dans « Sur ce téléphone ») : retirer un prénom créé par erreur (on ne peut pas retirer le sien).
- **Sans réseau** : un prêt ou un retour fait sans réseau attend sur le téléphone et part tout seul au retour du réseau.
- Mode clair uniquement, aux couleurs de la [charte graphique](docs/charte/README.md).

Dans l'appli Android, chacun touche son prénom au premier lancement : rien à taper. Dans un navigateur, on se connecte une fois avec le **code du garage** et un prénom (affiché dans « Prêtée par »).

## Charte graphique

Couleurs, polices, logo et règles d'usage : [`docs/charte/`](docs/charte/README.md). L'appli suit cette charte (bleu nuit, orange atelier pour les voitures prêtées, gris acier, titres en Archivo).

## Technique

| Partie | Dossier | Outils |
|---|---|---|
| Application web | `src/` | React 18, TypeScript, Vite |
| Serveur (API) | `worker/` | Cloudflare Workers, Hono, base D1 (SQLite) |
| Types communs | `shared/` | TypeScript |
| Schéma de la base | `migrations/` | SQL |
| Application Android | `android/` | Capacitor (l'appli affiche le site en ligne) |

Le Worker sert à la fois le site (dossier `dist/`) et l'API sous `/api`. Sur iPhone, l'application s'installe depuis Safari (« Sur l'écran d'accueil »).

## Lancer en local

Il faut Node.js 20 ou plus récent (Capacitor refuse les versions plus anciennes).

```bash
npm ci
npm run setup
npm run dev
```

`npm ci` installe exactement les versions du projet sans modifier `package-lock.json` (sinon `git pull` peut ensuite refuser de se faire). `npm run setup` crée `.dev.vars` (avec un code du garage de test, affiché dans le terminal) et la base locale. Le site s'ouvre sur http://localhost:5173.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Site et API en local |
| `npm run typecheck` | Vérification des types, site et Worker |
| `npm run db:remote` | Applique les migrations à la base de production |
| `npm run deploy` | Construit le site et met en ligne le Worker |
| `npm run apk` | Construit l'APK Android signé (Windows) |
| `npm run icons` | Régénère les icônes |

## Première mise en ligne

1. `npx wrangler login` (compte Cloudflare).
2. `npm run db:remote` : crée les tables dans la base `garage-prets` (déjà créée sur Cloudflare).
3. `npx wrangler secret put GARAGE_CODE` : choisir le code que le garage tapera une fois sur chaque téléphone.
4. `npm run deploy` : le site est en ligne sur https://garage-prets.handy-apps.workers.dev.

Quand une migration est ajoutée, lancer `npm run db:remote` avant `npm run deploy`.

## Mise en ligne automatique (GitHub Actions)

À chaque envoi sur `main`, `.github/workflows/deploy.yml` applique les migrations et met l'appli en ligne, à condition que le dépôt ait le secret `CLOUDFLARE_API_TOKEN` (jeton Cloudflare créé avec le modèle « Edit Cloudflare Workers », avec en plus le droit D1 Edit). Le secret `GARAGE_CODE`, s'il existe, met aussi à jour le code du garage.

## Application Android

L'application Android est une coquille [Capacitor](https://capacitorjs.com) qui affiche le site en ligne (adresse dans `capacitor.config.ts`, sous `server.url`). Elle n'utilise pas Chrome : pas de barre de remplissage automatique de Chrome au-dessus du clavier. Après un `npm run deploy`, il suffit de relancer l'appli pour avoir la nouvelle version (parfois au deuxième lancement). Un nouvel APK n'est nécessaire que si la partie Android change (icônes, adresse du site, module Capacitor).

Il faut le kit Android (Android SDK) ; son emplacement est écrit dans `android/local.properties` (`sdk.dir=...`), à copier depuis un autre projet Android.

`npm run apk` fabrique `android/app/build/outputs/apk/release/app-release.apk`. La signature utilise `android/keystore.properties` et `android/keystore/`, qui ne sont pas dans le dépôt (la clé du calendrier partagé convient). Sans eux, l'APK est signé avec la clé de test de l'ordinateur : il s'installe, mais une mise à jour construite sur un autre ordinateur devra d'abord désinstaller l'ancienne.

Les icônes Android (voiture blanche sur bleu nuit) sont produites par `npm run icons`, comme celles du site ; le dessin est dans `scripts/gen-icons.mjs`. Sous l'icône, l'appli s'appelle « CMS Prêts ».

Pour refaire l'APK sur l'ordinateur (PowerShell, dans le dossier du projet) :

```powershell
git checkout main
git pull
npm ci
npm run apk
explorer android\app\build\outputs\apk\release
```

**Connexion sans code dans l'appli** : l'APK porte une clé (`android/cle-appli.txt`, hors du dépôt) qu'il présente au serveur. Au premier lancement, on touche simplement son prénom (« Qui es-tu ? »). Pour la mettre en place une fois :

```powershell
npm run cle                                        # crée android/cle-appli.txt et affiche la clé
node scripts/cle-appli.mjs | npx wrangler secret put APP_KEY   # la donne au serveur
npm run apk                                        # l'APK embarque la clé
```

Sans ce fichier, l'APK demande le code du garage, comme le site ouvert dans un navigateur. À sauvegarder avec la clé de signature.

## Ce qui n'est pas dans le dépôt

`.dev.vars`, la clé de signature Android, `node_modules/`, `dist/` et les dossiers de construction.

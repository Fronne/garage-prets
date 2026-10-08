# Voitures de prêt

Une application toute simple pour le garage : savoir quelle voiture de prêt est chez quel client, depuis quand, et quand elle doit revenir. Un prêt s'enregistre en quelques secondes : seul le nom du client est obligatoire.

## Ce que fait l'application

- **Grille de cartes** : chaque voiture avec son état (Dispo, Prêtée, Retard), sa plaque et le client. Les voitures en retard passent en premier.
- **Prêter** : toucher une voiture dispo, taper le nom du client (ou choisir un client récent), valider. En option : date de retour prévue, photo du compteur, téléphone et note.
- **Rendre** : toucher la voiture prêtée, puis « Voiture rendue ». Un bouton « Annuler » reste affiché 5 secondes en cas d'erreur.
- **Fiche** : client avec bouton d'appel, date de départ, retour prévu (en rouge s'il est dépassé), qui a fait le prêt, prêts précédents.
- **Voitures** : ajouter avec un nom (la plaque est facultative), modifier ou retirer du parc.
- Mode clair uniquement, police Plus Jakarta Sans, design « Qui a quoi ? ».

Chaque téléphone se connecte une fois avec le **code du garage** et un prénom (affiché dans « Prêtée par »).

## Technique

| Partie | Dossier | Outils |
|---|---|---|
| Application web | `src/` | React 18, TypeScript, Vite |
| Serveur (API) | `worker/` | Cloudflare Workers, Hono, base D1 (SQLite) |
| Types communs | `shared/` | TypeScript |
| Schéma de la base | `migrations/` | SQL |
| Application Android | `android/` | Trusted Web Activity (le site en plein écran) |

Le Worker sert à la fois le site (dossier `dist/`) et l'API sous `/api`. Sur iPhone, l'application s'installe depuis Safari (« Sur l'écran d'accueil »).

## Lancer en local

Il faut Node.js.

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` crée `.dev.vars` (avec un code du garage de test, affiché dans le terminal) et la base locale. Le site s'ouvre sur http://localhost:5173.

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
4. `npm run deploy` : le site est en ligne sur https://garage-prets.dofus-craft.workers.dev.

Quand une migration est ajoutée, lancer `npm run db:remote` avant `npm run deploy`.

## Mise en ligne automatique (GitHub Actions)

À chaque envoi sur `main`, `.github/workflows/deploy.yml` applique les migrations et met l'appli en ligne, à condition que le dépôt ait le secret `CLOUDFLARE_API_TOKEN` (jeton Cloudflare créé avec le modèle « Edit Cloudflare Workers », avec en plus le droit D1 Edit). Le secret `GARAGE_CODE`, s'il existe, met aussi à jour le code du garage.

## Application Android

L'application affiche le site en plein écran ; l'adresse est fixée dans `android/app/build.gradle` (`host`).

La signature utilise `android/keystore.properties` et `android/keystore/`, qui ne sont pas dans le dépôt. La clé du calendrier partagé peut servir : copier ces deux éléments depuis ce projet, puis `npm run apk`. L'APK se trouve dans `android/app/build/outputs/apk/release/`.

Pour que l'appli s'ouvre sans barre d'adresse, l'empreinte SHA-256 de la clé doit être celle de `ANDROID_SHA256` dans `wrangler.jsonc` (déjà réglée sur la clé du calendrier). Avec une autre clé, la remplacer par le résultat de `keytool -list -v -keystore <fichier>` et redéployer.

## Ce qui n'est pas dans le dépôt

`.dev.vars`, la clé de signature Android, `node_modules/`, `dist/` et les dossiers de construction.

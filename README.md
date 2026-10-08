# Voitures de prêt

Une application toute simple pour le garage : savoir quelle voiture de prêt est chez quel client, depuis quand, et quand elle doit revenir. Un prêt s'enregistre en quelques secondes : seul le nom du client est obligatoire.

## Ce que fait l'application

- **Grille de cartes** : chaque voiture avec son état (Dispo, Prêtée, Retard), sa plaque et le client. Les voitures en retard passent en premier.
- **Prêter** : toucher une voiture dispo, taper le nom du client (ou choisir un client récent), valider. En option : date de retour prévue, photo du compteur, téléphone et note.
- **Rendre** : toucher la voiture prêtée, puis « Voiture rendue ». Un bouton « Annuler » reste affiché 5 secondes en cas d'erreur.
- **Fiche** : client avec bouton d'appel, date de départ, retour prévu (en rouge s'il est dépassé), qui a fait le prêt, prêts précédents.
- **Voitures** : ajouter avec un nom (la plaque est facultative), modifier ou retirer du parc.
- Mode clair uniquement, police Plus Jakarta Sans, design « Qui a quoi ? ».

Dans l'appli Android, chacun touche son prénom au premier lancement : rien à taper. Dans un navigateur, on se connecte une fois avec le **code du garage** et un prénom (affiché dans « Prêtée par »).

## Technique

| Partie | Dossier | Outils |
|---|---|---|
| Application web | `src/` | React 18, TypeScript, Vite |
| Serveur (API) | `worker/` | Cloudflare Workers, Hono, base D1 (SQLite) |
| Types communs | `shared/` | TypeScript |
| Schéma de la base | `migrations/` | SQL |
| Application Android | `android/` | Capacitor (le site affiché dans l'appli, comme la liste de courses) |

Le Worker sert à la fois le site (dossier `dist/`) et l'API sous `/api`. Sur iPhone, l'application s'installe depuis Safari (« Sur l'écran d'accueil »).

## Lancer en local

Il faut Node.js 20 ou plus récent (Capacitor refuse les versions plus anciennes).

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

L'application Android est une coquille [Capacitor](https://capacitorjs.com) qui affiche le site en ligne (adresse dans `capacitor.config.json`, sous `server.url`). Elle n'utilise pas Chrome : pas de barre de remplissage automatique de Chrome au-dessus du clavier. Après un `npm run deploy`, il suffit de relancer l'appli pour avoir la nouvelle version (parfois au deuxième lancement). Un nouvel APK n'est nécessaire que si la partie Android change (icônes, adresse du site, module Capacitor).

Il faut le kit Android (Android SDK) ; son emplacement est écrit dans `android/local.properties` (`sdk.dir=...`), à copier depuis un autre projet Android.

`npm run apk` fabrique `android/app/build/outputs/apk/release/app-release.apk`. La signature utilise `android/keystore.properties` et `android/keystore/`, qui ne sont pas dans le dépôt (la clé du calendrier partagé convient). Sans eux, l'APK est signé avec la clé de test de l'ordinateur : il s'installe, mais une mise à jour construite sur un autre ordinateur devra d'abord désinstaller l'ancienne.

Les icônes Android sont produites par `npm run icons`, comme celles du site.

**Connexion sans code dans l'appli** : l'APK porte une clé (`android/cle-appli.txt`, hors du dépôt) qu'il présente au serveur. Au premier lancement, on touche simplement son prénom (« Qui es-tu ? »). Pour la mettre en place une fois :

```powershell
npm run cle                                        # crée android/cle-appli.txt et affiche la clé
node scripts/cle-appli.mjs | npx wrangler secret put APP_KEY   # la donne au serveur
npm run apk                                        # l'APK embarque la clé
```

Sans ce fichier, l'APK demande le code du garage, comme le site ouvert dans un navigateur. À sauvegarder avec la clé de signature.

## Ce qui n'est pas dans le dépôt

`.dev.vars`, la clé de signature Android, `node_modules/`, `dist/` et les dossiers de construction.

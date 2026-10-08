// Crée la clé de l'appli Android (android/cle-appli.txt) si elle n'existe pas, puis l'affiche
// pour la donner au serveur : npx wrangler secret put APP_KEY
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const file = 'android/cle-appli.txt'
if (!existsSync(file)) writeFileSync(file, randomBytes(24).toString('base64url') + '\n')
process.stdout.write(readFileSync(file, 'utf8').trim())

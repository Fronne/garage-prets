import { existsSync, readFileSync } from 'node:fs'
import type { CapacitorConfig } from '@capacitor/cli'

// Clé de l'appli : l'APK la présente au serveur (secret APP_KEY du Worker) pour se connecter sans code.
// Elle vient de android/cle-appli.txt, hors du dépôt comme la clé de signature.
const keyFile = 'android/cle-appli.txt'
const cle = existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : ''
if (!cle) console.warn("android/cle-appli.txt absent : l'appli demandera le code du garage.")

const config: CapacitorConfig = {
  appId: 'app.garageprets',
  appName: 'Canal Mhirsi Service',
  webDir: 'dist',
  server: {
    url: 'https://garage-prets.handy-apps.workers.dev',
  },
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
    ...(cle ? { appendUserAgent: 'GaragePrets/' + cle } : {}),
  },
}

export default config

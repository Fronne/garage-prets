import { b64url, fromB64url, type Env } from './env'

const enc = new TextEncoder()
const dec = new TextDecoder()

// Comparaison sans raccourci : le temps de réponse ne dit pas combien de caractères sont justes
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

// Comparer les deux empreintes plutôt que les codes évite de révéler le code par le temps de réponse
export async function codeMatches(env: Env, code: string): Promise<boolean> {
  const secret = env.GARAGE_CODE!
  return (await hmac(secret, 'code:' + code.trim())) === (await hmac(secret, 'code:' + secret))
}

// La clé de l'appli Android, comparée de la même façon
export async function appKeyMatches(env: Env, cle: string): Promise<boolean> {
  if (!env.APP_KEY || !env.GARAGE_CODE) return false
  const secret = env.GARAGE_CODE
  return (await hmac(secret, 'app:' + cle.trim())) === (await hmac(secret, 'app:' + env.APP_KEY.trim()))
}

// Le jeton porte le prénom de la personne, signé avec le code du garage : changer le code déconnecte tous les téléphones
export async function makeToken(env: Env, prenom: string): Promise<string> {
  const id = b64url(enc.encode(prenom))
  return `${id}.${await hmac(env.GARAGE_CODE!, 'prenom:' + id)}`
}

export async function verifyToken(env: Env, token: string): Promise<string | null> {
  if (!env.GARAGE_CODE) return null
  const i = token.indexOf('.')
  if (i < 1) return null
  const id = token.slice(0, i)
  if (!egal(token.slice(i + 1), await hmac(env.GARAGE_CODE, 'prenom:' + id))) return null
  try {
    return dec.decode(fromB64url(id))
  } catch {
    return null
  }
}

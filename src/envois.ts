import { api, ApiError } from './api'

// File d'attente des enregistrements faits sans réseau : gardée sur le téléphone, envoyée dans l'ordre dès que le réseau revient
const KEY = 'garage.envois'
type Envoi = { path: string; method: string; body?: unknown }

function lire(): Envoi[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}
const ecrire = (l: Envoi[]) => localStorage.setItem(KEY, JSON.stringify(l))
const sansReseau = (e: unknown) => e instanceof ApiError && e.status === 0

export const enAttente = () => lire().length

/** Envoie tout de suite ; sans réseau, garde l'envoi pour plus tard. true si c'est parti, false s'il attend. */
export async function envoyer(path: string, method: string, body?: unknown): Promise<boolean> {
  // Des envois attendent déjà : celui-ci passe après eux, pour garder l'ordre (prêt avant retour)
  if (lire().length) {
    ecrire([...lire(), { path, method, body }])
    await vider()
    return lire().length === 0
  }
  try {
    await api(path, method, body)
    return true
  } catch (e) {
    if (!sansReseau(e)) throw e
    ecrire([{ path, method, body }])
    return false
  }
}

let enCours: Promise<string[]> | null = null

/** Renvoie la file dans l'ordre et s'arrête au premier envoi sans réseau. Rend les messages des envois refusés par le serveur. */
export function vider(): Promise<string[]> {
  enCours ??= (async () => {
    const refus: string[] = []
    try {
      for (let l = lire(); l.length; l = lire()) {
        try {
          await api(l[0].path, l[0].method, l[0].body)
        } catch (e) {
          if (sansReseau(e) || (e instanceof ApiError && e.status === 401)) break
          refus.push(e instanceof Error ? e.message : 'Envoi refusé.')
        }
        ecrire(lire().slice(1))
      }
    } finally {
      enCours = null
    }
    return refus
  })()
  return enCours
}

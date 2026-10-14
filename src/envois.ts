import { api, ApiError } from './api'

// File d'attente des enregistrements faits sans réseau : gardée sur le téléphone, envoyée dans l'ordre dès que le réseau revient
const KEY = 'garage.envois'
// Une photo en attente ne garde dans la file que son identifiant : l'image, trop lourde pour la file (5 Mo au plus), attend dans IndexedDB
type Envoi = { path: string; method: string; body?: unknown; photo?: string }

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

// ---------- Photos en attente (IndexedDB : bien plus de place que la file) ----------

let base: Promise<IDBDatabase> | null = null
function ouvrir(): Promise<IDBDatabase> {
  base ??= new Promise((ok, ko) => {
    const r = indexedDB.open('garage', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('photos')
    r.onsuccess = () => ok(r.result)
    r.onerror = () => ko(r.error)
  })
  base.catch(() => (base = null))
  return base
}
async function tiroir<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await ouvrir()
  return new Promise((ok, ko) => {
    const t = db.transaction('photos', mode)
    const r = fn(t.objectStore('photos'))
    t.oncomplete = () => ok(r.result)
    t.onerror = t.onabort = () => ko(t.error)
  })
}

/** La photo si elle attend encore d'être envoyée depuis ce téléphone */
export const photoEnAttente = (id: string) => tiroir<string | undefined>('readonly', (s) => s.get(id)).catch(() => undefined)

// Prévenu quand une photo est bien arrivée sur le serveur : sa copie sur le téléphone ne sert plus
let surPhotoPartie = (_id: string) => {}
export const quandPhotoPartie = (fn: (id: string) => void) => (surPhotoPartie = fn)

async function corps(e: Envoi, data?: string) {
  if (!e.photo) return e.body
  data ??= await photoEnAttente(e.photo)
  if (!data) throw new ApiError(400, "Une photo prise sans réseau n'a pas pu être retrouvée sur le téléphone.")
  return { id: e.photo, data }
}

async function parti(e: Envoi) {
  if (!e.photo) return
  surPhotoPartie(e.photo)
  await tiroir('readwrite', (s) => s.delete(e.photo!)).catch(() => {})
}

// ---------- Envoi ----------

// Met de côté : l'image d'abord (si elle ne tient pas, l'erreur remonte), puis sa place dans la file, sans écraser les autres
async function mettreEnFile(e: Envoi, data?: string) {
  if (e.photo && data) await tiroir('readwrite', (s) => s.put(data, e.photo!))
  ecrire([...lire(), e])
}

async function expedier(e: Envoi, data?: string): Promise<boolean> {
  // Des envois attendent déjà : celui-ci passe après eux, pour garder l'ordre (prêt avant retour)
  if (lire().length) {
    await mettreEnFile(e, data)
    await vider()
    return lire().length === 0
  }
  try {
    await api(e.path, e.method, await corps(e, data))
    await parti(e)
    return true
  } catch (err) {
    if (!sansReseau(err)) throw err
    await mettreEnFile(e, data)
    return false
  }
}

/** Envoie tout de suite ; sans réseau, garde l'envoi pour plus tard. true si c'est parti, false s'il attend. */
export const envoyer = (path: string, method: string, body?: unknown) => expedier({ path, method, body })

/** Envoie une photo (data URL JPEG) ; sans réseau, elle attend sur le téléphone comme un prêt */
export const envoyerPhoto = (id: string, data: string) => expedier({ path: '/photos', method: 'POST', photo: id }, data)

let enCours: Promise<string[]> | null = null

/** Renvoie la file dans l'ordre et s'arrête au premier envoi sans réseau. Rend les messages des envois refusés par le serveur. */
export function vider(): Promise<string[]> {
  enCours ??= (async () => {
    const refus: string[] = []
    try {
      for (let l = lire(); l.length; l = lire()) {
        try {
          await api(l[0].path, l[0].method, await corps(l[0]))
        } catch (e) {
          if (sansReseau(e) || (e instanceof ApiError && e.status === 401)) break
          refus.push(e instanceof Error ? e.message : 'Envoi refusé.')
        }
        // Envoyé ou refusé : il quitte la file (et sa photo le téléphone)
        await parti(l[0])
        ecrire(lire().slice(1))
      }
    } finally {
      enCours = null
    }
    return refus
  })()
  return enCours
}

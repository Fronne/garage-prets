import type { Pret } from '../shared/types'

const J = 86_400_000

const day0 = (d: string | number | Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}
// Nombre de jours calendaires entre deux dates
export const days = (a: string | number, b: string | number) => Math.round((day0(b) - day0(a)) / J)

// Jour local AAAA-MM-JJ, décalé de n jours
export function dayStr(n = 0): string {
  const d = new Date(Date.now() + n * J)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

// Une date seule (AAAA-MM-JJ) est lue à midi pour ne pas glisser d'un jour selon le fuseau
const asDate = (s: string) => new Date(s.length === 10 ? s + 'T12:00' : s)
export const fmt = (s: string) => asDate(s).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtS = (s: string) => asDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export const isLate = (p: Pret) => !p.retour && !!p.retour_prevu && p.retour_prevu < dayStr(0)

export function depuis(depart: string): string {
  const n = days(depart, Date.now())
  return n <= 0 ? "depuis aujourd'hui" : n === 1 ? 'depuis hier' : `depuis ${n} jours`
}

export const buzz = () => {
  try {
    navigator.vibrate?.(12)
  } catch {}
}

export const telHref = (tel: string) => 'tel:' + tel.replace(/[^\d+]/g, '')

// Photo du compteur réduite avant l'envoi (≈ 150 Ko), pour rester rapide sur le réseau du garage
export async function shrinkPhoto(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

// Plaque française AB-123-CD : les tirets se placent tout seuls pendant la saisie.
// Ils n'apparaissent qu'une fois le groupe suivant commencé, pour que l'effacement reste naturel.
// Une ancienne plaque (qui ne commence pas par deux lettres) est laissée telle quelle, en majuscules.
export function formatPlate(raw: string): string {
  const up = raw.toUpperCase()
  const c = up.replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z]{2}/.test(c)) return up
  const groups = [c.slice(0, 2), c.slice(2, 5), c.slice(5, 7)].filter(Boolean)
  return groups.join('-')
}

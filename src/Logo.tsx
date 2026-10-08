import { LOGOS, MOTS } from './brands'
import { Car } from './icons'

// Marque reconnue dans le nom (« Clio grise » -> renault, « 208 blanche » -> peugeot), sinon null
export function marque(nom: string): string | null {
  const t = nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  // Mot seul, ou deux mots collés (« Range Rover », « Model 3 », « C-HR », « T-Roc »)
  for (let i = 0; i < t.length; i++) {
    const b = MOTS[t[i] + (t[i + 1] ?? '')] ?? MOTS[t[i]]
    if (b) return b
  }
  return null
}

// Logo de la marque de la voiture, ou la petite voiture si on ne la reconnaît pas
export function Logo({ nom }: { nom: string }) {
  const b = marque(nom)
  if (!b) return <Car />
  return (
    <svg className="i brand" viewBox="0 0 24 24" aria-hidden="true">
      <path d={LOGOS[b]} />
    </svg>
  )
}

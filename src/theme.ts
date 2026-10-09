// Affichage choisi sur chaque téléphone : « auto » suit le réglage du téléphone, « clair » et « sombre » l'imposent
export type Theme = 'auto' | 'clair' | 'sombre'

const KEY = 'garage.theme'
// Couleur de la barre du téléphone (même valeur que --bg dans styles.css)
const BARRE = { clair: '#f4f6f9', sombre: '#0b1622' }

export function lireTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'clair' || t === 'sombre' ? t : 'auto'
  } catch {
    return 'auto'
  }
}

export function appliquerTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') delete root.dataset.theme
  else root.dataset.theme = t === 'sombre' ? 'dark' : 'light'
  // Les deux balises « theme-color » d'index.html : en auto chacune garde sa condition, sinon les deux prennent la couleur choisie
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const sienne = m.media.includes('dark') ? BARRE.sombre : BARRE.clair
    m.content = t === 'auto' ? sienne : BARRE[t]
  })
  try {
    if (t === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, t)
  } catch {
    // stockage bloqué : le choix vaut pour cette ouverture seulement
  }
}

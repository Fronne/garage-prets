// Style de l'appli, choisi sur chaque téléphone : « classique » (noir et blanc) ou « atelier » (charte Canal Mhirsi Service)
export type Style = 'classique' | 'atelier'

const KEY = 'garage.style'
// Fond de la barre du téléphone pour chaque style : le fond de page en classique, le bandeau bleu nuit en atelier
const BARRE: Record<Style, string> = { classique: '#f7f8fa', atelier: '#0f2a44' }

export function lireStyle(): Style {
  try {
    return localStorage.getItem(KEY) === 'atelier' ? 'atelier' : 'classique'
  } catch {
    return 'classique'
  }
}

export function appliquerStyle(s: Style) {
  document.documentElement.dataset.style = s
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BARRE[s])
  try {
    localStorage.setItem(KEY, s)
  } catch {
    // stockage bloqué : le choix vaut pour cette ouverture seulement
  }
}

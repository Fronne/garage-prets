import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { buzz } from './util'

const DELAI = 500
// Au-delà, le doigt fait défiler la page : ce n'est pas un appui long
const BOUGE = 10

// Le doigt se relève après l'appui long : le « clic » qui suit tomberait sur le fond de la fenêtre qui vient de s'ouvrir et la refermerait.
// On l'avale (s'il arrive dans la seconde ; sinon le prochain vrai toucher passe normalement).
function avalerLeClicSuivant() {
  const avale = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }
  window.addEventListener('click', avale, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', avale, { capture: true }), 1000)
}

// Garder le doigt sur une carte ouvre ses raccourcis ; un toucher simple reste un toucher simple.
// Un seul hook pour toute la grille : on n'appuie que sur une carte à la fois.
export function useAppuiLong() {
  const timer = useRef(0)
  const depart = useRef<{ x: number; y: number } | null>(null)
  const fait = useRef(false)

  return (onLong: () => void) => {
    const lancer = () => {
      clearTimeout(timer.current)
      if (fait.current) return
      fait.current = true
      buzz()
      avalerLeClicSuivant()
      onLong()
    }
    const stop = () => clearTimeout(timer.current)
    return {
      onPointerDown: (e: PointerEvent) => {
        fait.current = false
        depart.current = { x: e.clientX, y: e.clientY }
        clearTimeout(timer.current)
        timer.current = window.setTimeout(lancer, DELAI)
      },
      onPointerMove: (e: PointerEvent) => {
        const d = depart.current
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > BOUGE) stop()
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onPointerLeave: stop,
      // Android (appui long) et ordinateur (clic droit) : pas de menu du navigateur, nos raccourcis à la place
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        lancer()
      },
    }
  }
}

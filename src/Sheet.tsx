import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from './icons'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Fenêtre qui monte du bas de l'écran. Elle se ferme plus vite qu'elle ne s'ouvre et rend le focus à la carte d'origine.
export function Sheet({ onClose, children }: { onClose: () => void; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false)
  const back = useRef<Element | null>(document.activeElement)

  const close = () => {
    if (closing) return
    if (reduced()) return onClose()
    setClosing(true)
    setTimeout(onClose, 140)
  }

  // Échap ferme la fenêtre ; la référence suit la dernière version de close sans réabonner l'écouteur
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Rend le focus à la carte d'origine seulement à la fermeture, pas à chaque mise à jour (sinon le clavier se ferme à chaque lettre)
  useEffect(() => {
    const el = back.current
    return () => {
      if (el instanceof HTMLElement && document.body.contains(el)) el.focus()
    }
  }, [])

  // Quand le clavier s'ouvre, l'écran rétrécit : on garde le champ en cours de saisie visible
  useEffect(() => {
    const show = () => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement) setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 50)
    }
    window.addEventListener('resize', show)
    document.addEventListener('focusin', show)
    window.visualViewport?.addEventListener('resize', show)
    return () => {
      window.removeEventListener('resize', show)
      document.removeEventListener('focusin', show)
      window.visualViewport?.removeEventListener('resize', show)
    }
  }, [])

  return (
    <div className={'scrim' + (closing ? ' closing' : '')} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="grab" aria-hidden="true" />
        {children(close)}
      </div>
    </div>
  )
}

export function SheetHead({ title, close, children }: { title: string; close: () => void; children?: ReactNode }) {
  return (
    <div className="shead">
      <div className="shead-t">
        {children}
        <h3 id="sheet-title">{title}</h3>
      </div>
      <button className="x" onClick={close} aria-label="Fermer">
        <X />
      </button>
    </div>
  )
}

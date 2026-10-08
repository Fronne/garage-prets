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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const el = back.current
    return () => {
      document.removeEventListener('keydown', onKey)
      if (el instanceof HTMLElement && document.body.contains(el)) el.focus()
    }
  })

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

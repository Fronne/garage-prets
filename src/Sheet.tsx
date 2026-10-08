import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { Check, X } from './icons'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fenêtre avec des modifications en cours : on demande avant de les perdre */
export type Ask = { dirty: boolean; save: () => boolean; saveLabel: string; discard?: () => void }

// La croix d'en-tête passe par la même demande que le glissement vers le bas
const RequestClose = createContext<() => void>(() => {})

// Fenêtre qui monte du bas de l'écran. On la ferme par la croix, en touchant le fond ou en la faisant glisser vers le bas ;
// s'il y a des modifications, elle descend puis demande s'il faut les enregistrer (« Continuer à modifier » la fait remonter). Elle rend le focus à la carte d'origine.
export function Sheet({ onClose, ask, children }: { onClose: () => void; ask?: Ask; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false)
  const [asking, setAsking] = useState(false)
  const back = useRef<Element | null>(document.activeElement)
  const sheetRef = useRef<HTMLDivElement>(null)

  const close = () => {
    if (closing) return
    if (reduced()) return onClose()
    setClosing(true)
    setTimeout(onClose, 140)
  }
  // Le clavier se ferme pendant la question
  const askNow = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setAsking(true)
  }
  const request = () => (ask?.dirty ? askNow() : close())

  // Glisser vers le bas depuis le haut de la fenêtre la ferme
  const drag = useRef<{ y0: number; dy: number; t0: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const el = sheetRef.current!
    drag.current = el.scrollTop <= 0 ? { y0: e.touches[0].clientY, dy: 0, t0: Date.now() } : null
  }
  const onTouchMove = (e: TouchEvent) => {
    const d = drag.current
    if (!d) return
    d.dy = Math.max(0, e.touches[0].clientY - d.y0)
    // On ne suit le doigt que si la fenêtre est tout en haut (sinon c'est un défilement normal)
    if (sheetRef.current!.scrollTop > 0) return void (drag.current = null)
    sheetRef.current!.style.transition = 'none'
    sheetRef.current!.style.transform = `translateY(${d.dy}px)`
  }
  const onTouchEnd = () => {
    const d = drag.current
    drag.current = null
    const el = sheetRef.current
    if (!d || !el) return
    const fast = d.dy > 40 && d.dy / (Date.now() - d.t0) > 0.6
    el.style.transition = 'transform 160ms ease-out'
    if ((d.dy > 110 || fast) && !ask?.dirty) {
      el.style.animation = 'none'
      el.style.transform = 'translateY(100%)'
      setClosing(true)
      setTimeout(onClose, 160)
      return
    }
    // Avec des modifications : la fenêtre descend quand même, puis la question s'affiche
    el.style.transform = ''
    if (d.dy > 110 || fast) askNow()
  }

  // Échap ferme la fenêtre ; la référence suit la dernière version sans réabonner l'écouteur
  const closeRef = useRef(request)
  closeRef.current = asking ? () => setAsking(false) : request
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    // Geste retour du téléphone (voir App) : comme Échap
    const onBack = () => closeRef.current()
    document.addEventListener('keydown', onKey)
    window.addEventListener('sheet-back', onBack)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('sheet-back', onBack)
    }
  }, [])

  // Le focus va sur la fenêtre elle-même, pas sur un champ : le clavier ne s'ouvre que si on touche un champ
  useEffect(() => {
    const el = sheetRef.current
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
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
    <div className={'scrim' + (closing ? ' closing' : '')} onClick={(e) => e.target === e.currentTarget && request()}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={'sheet' + (asking ? ' away' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="grab" aria-hidden="true" />
        <RequestClose.Provider value={request}>{children(close)}</RequestClose.Provider>
      </div>
      {asking && ask && (
        <div className="ask-scrim" onClick={(e) => e.target === e.currentTarget && setAsking(false)}>
          <div className="ask" role="alertdialog" aria-modal="true" aria-labelledby="ask-t">
            <h3 id="ask-t">Enregistrer les modifications ?</h3>
            <button
              className="cta"
              onClick={() => {
                // Enregistré : on ferme sans faire remonter la fenêtre ; sinon elle remonte pour montrer ce qui bloque
                if (ask.save()) close()
                else setAsking(false)
              }}
            >
              <Check />
              {ask.saveLabel}
            </button>
            <button
              className="cta alt danger"
              onClick={() => {
                ask.discard?.()
                close()
              }}
            >
              Ne pas enregistrer
            </button>
            <button className="link" onClick={() => setAsking(false)}>
              Continuer à modifier
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SheetHead({ title, children }: { title: string; children?: ReactNode }) {
  const request = useContext(RequestClose)
  return (
    <div className="shead">
      <div className="shead-t">
        {children}
        <h3 id="sheet-title">{title}</h3>
      </div>
      <button className="x" onClick={request} aria-label="Fermer">
        <X />
      </button>
    </div>
  )
}

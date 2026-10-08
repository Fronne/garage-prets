import { useState, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { Back, Cal, Chevron } from './icons'

// Jour local AAAA-MM-JJ
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

type Props = { value: string; onChange: (v: string) => void; min?: string; max?: string; placeholder: string; id?: string }

// Calendrier aux couleurs de l'appli, à la place de celui du téléphone : on touche un jour et c'est choisi
export function DatePicker({ value, onChange, min, max, placeholder, id }: Props) {
  const [open, setOpen] = useState(false)
  const [mois, setMois] = useState(() => {
    const d = value ? new Date(value + 'T12:00') : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const ouvrir = () => {
    const d = value ? new Date(value + 'T12:00') : new Date()
    setMois(new Date(d.getFullYear(), d.getMonth(), 1))
    setOpen(true)
  }
  const choisir = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  // Le mois commence un lundi : cases vides avant le 1er
  const debut = (mois.getDay() + 6) % 7
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate()
  const cases = [...Array(debut).fill(null), ...Array.from({ length: nbJours }, (_, i) => new Date(mois.getFullYear(), mois.getMonth(), i + 1))]
  const auj = iso(new Date())
  const decaler = (n: number) => setMois(new Date(mois.getFullYear(), mois.getMonth() + n, 1))
  const prevOk = !min || iso(new Date(mois.getFullYear(), mois.getMonth(), 0)) >= min
  const nextOk = !max || iso(new Date(mois.getFullYear(), mois.getMonth() + 1, 1)) <= max
  // Les gestes dans le calendrier ne doivent pas faire glisser la fenêtre qui est dessous
  const stop = (e: SyntheticEvent) => e.stopPropagation()

  const label = value ? new Date(value + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <>
      <button type="button" id={id} className={'date-btn' + (value ? ' set' : '')} onClick={ouvrir}>
        <Cal />
        <span>{value ? label : placeholder}</span>
      </button>
      {open &&
        createPortal(
          <div
            className="cal-scrim"
            onClick={(e) => (stop(e), e.target === e.currentTarget && setOpen(false))}
            onTouchStart={stop}
            onTouchMove={stop}
            onTouchEnd={stop}
            onKeyDown={(e) => (stop(e), e.key === 'Escape' && setOpen(false))}
          >
            <div className="cal" role="dialog" aria-modal="true" aria-label="Choisir un jour">
              <div className="cal-hd">
                <button type="button" className="cal-nav" onClick={() => decaler(-1)} disabled={!prevOk} aria-label="Mois précédent">
                  <Back />
                </button>
                <span className="cal-t">{mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                <button type="button" className="cal-nav" onClick={() => decaler(1)} disabled={!nextOk} aria-label="Mois suivant">
                  <Chevron />
                </button>
              </div>
              <div className="cal-grid">
                {JOURS.map((j, i) => (
                  <span key={'j' + i} className="cal-dow" aria-hidden="true">
                    {j}
                  </span>
                ))}
                {cases.map((d, i) => {
                  if (!d) return <span key={'v' + i} />
                  const v = iso(d)
                  const off = (!!min && v < min) || (!!max && v > max)
                  return (
                    <button
                      type="button"
                      key={v}
                      className={'cal-d' + (v === value ? ' sel' : '') + (v === auj ? ' auj' : '')}
                      disabled={off}
                      aria-pressed={v === value}
                      aria-label={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      onClick={() => choisir(v)}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
              <div className="cal-ft">
                {(!min || auj >= min) && (!max || auj <= max) && (
                  <button type="button" className="link" onClick={() => choisir(auj)}>
                    Aujourd'hui
                  </button>
                )}
                {value && (
                  <button type="button" className="link" onClick={() => choisir('')}>
                    Effacer
                  </button>
                )}
                <button type="button" className="link" onClick={() => setOpen(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

import { useEffect, useState } from 'react'
import type { Pret, Vehicule } from '../shared/types'
import { photoUrl } from './api'
import { Check, Phone, Plate, Warn } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { days, depuis, fmt, fmtS, isLate, telHref } from './util'

type Props = { v: Vehicule; p: Pret; hist: Pret[]; onClose: () => void; onRendue: () => void; onModifier: () => void; onHistorique: () => void }

// Fiche d'une voiture dehors : chez qui, depuis quand, et le bouton « Voiture rendue »
export function VoirSheet({ v, p, hist, onClose, onRendue, onModifier, onHistorique }: Props) {
  const late = isLate(p)
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!p.photo_depart) return
    let url: string | null = null
    photoUrl(p.photo_depart)
      .then((u) => setPhoto((url = u)))
      .catch(() => {})
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [p.photo_depart])

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <SheetHead title={v.nom}>
            {late ? (
              <span className="st st-late">
                <Warn />
                En retard de {days(p.retour_prevu!, Date.now())} j
              </span>
            ) : (
              <span className="st st-out">Prêtée · {depuis(p.depart)}</span>
            )}
          </SheetHead>
          <Plate immat={v.immat} />
          <div className="who-card">
            <div className="who-l">
              <span className="sub">Chez</span>
              <span className="who-n">{p.client}</span>
              {p.tel && <span className="tel">{p.tel}</span>}
            </div>
            {p.tel && (
              <a className="btn call" href={telHref(p.tel)} aria-label={'Appeler ' + p.client}>
                <Phone />
              </a>
            )}
          </div>
          <div className={'kv' + (p.par ? ' trois' : '')}>
            <div>
              <span>Partie le</span>
              <span>{fmt(p.depart)}</span>
            </div>
            <div>
              <span>Retour prévu</span>
              <span className={late ? 'late-t' : undefined}>{p.retour_prevu ? fmt(p.retour_prevu) : 'Pas de date'}</span>
            </div>
            {p.par && (
              <div>
                <span>Prêtée par</span>
                <span>{p.par}</span>
              </div>
            )}
            {p.note && (
              <div className="full">
                <span>Note</span>
                <span>{p.note}</span>
              </div>
            )}
          </div>
          {photo && <img className="photo" src={photo} alt="Compteur au départ" />}
          {hist.length > 0 && (
            <>
              <div className="sub">Prêts précédents</div>
              <div className="hist">
                {/* 4 lignes au plus, pour que toute la fiche tienne sur l'écran avec le lien en dessous */}
                {hist.slice(0, 4).map((x) => (
                  <div key={x.id}>
                    <b>{x.client}</b>
                    <span>
                      {fmtS(x.depart)} – {fmtS(x.retour!)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="link tout-histo"
                onClick={() => {
                  onHistorique()
                  close()
                }}
              >
                Voir tout l'historique de cette voiture
              </button>
            </>
          )}
          <button
            className="cta ok"
            onClick={() => {
              onRendue()
              close()
            }}
          >
            <Check />
            Voiture rendue
          </button>
          <button className="link" onClick={onModifier}>
            Modifier le prêt
          </button>
        </>
      )}
    </Sheet>
  )
}

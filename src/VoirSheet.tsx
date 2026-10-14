import { useState } from 'react'
import type { Pret, Vehicule } from '../shared/types'
import { Cam, Check, IdCard, Pen, Phone, Plate, Warn } from './icons'
import { JaugeDepart, PERMIS, VoirPhotos, nbEtat, nbPhotos, resumeEtat } from './Photos'
import { Sheet, SheetHead } from './Sheet'
import { days, depuis, fmt, fmtS, isLate, telHref } from './util'

type Props = {
  v: Vehicule
  p: Pret
  hist: Pret[]
  onClose: () => void
  onRendue: () => void
  onModifier: () => void
  onHistorique: () => void
}

// Fiche d'une voiture dehors : chez qui, depuis quand, et le bouton « Voiture rendue »
export function VoirSheet({ v, p, hist, onClose, onRendue, onModifier, onHistorique }: Props) {
  const late = isLate(p)
  const [ouvert, setOuvert] = useState<'permis' | 'etat' | null>(null)
  const nPermis = nbPhotos(p.photos?.depart, PERMIS)
  const nEtat = nbEtat(p.photos?.depart)
  const jauge = p.photos?.depart?.jauge

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
          {/* Modifier, c'est un réglage : en haut près de la plaque ; en bas, seulement l'action principale */}
          <div className="plaque-ligne">
            <Plate immat={v.immat} />
            <button className="pill" onClick={onModifier}>
              <Pen />
              Modifier le prêt
            </button>
          </div>
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
          {/* Photos prises au départ, à regarder au retour : permis du client, jauge et état de la voiture */}
          {nPermis + nEtat > 0 && (
            <div className="opts" role="group" aria-label="Photos du départ">
            {nPermis > 0 && (
              <button type="button" className="opt" aria-expanded={ouvert === 'permis'} onClick={() => setOuvert(ouvert === 'permis' ? null : 'permis')}>
                <IdCard />
                Permis
              </button>
            )}
            {nEtat > 0 && (
              <button type="button" className="opt long" aria-expanded={ouvert === 'etat'} onClick={() => setOuvert(ouvert === 'etat' ? null : 'etat')}>
                <Cam />
                Jauge et état · {resumeEtat(p.photos?.depart)}
              </button>
            )}
            </div>
          )}
          {ouvert === 'permis' && <VoirPhotos photos={p.photos} partie="permis" />}
          {ouvert === 'etat' && <VoirPhotos photos={p.photos} partie="etat" />}
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
          {jauge && <JaugeDepart id={jauge} />}
          <button
            className="cta"
            onClick={() => {
              onRendue()
              close()
            }}
          >
            <Check />
            Voiture rendue
          </button>
        </>
      )}
    </Sheet>
  )
}

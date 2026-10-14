import { useEffect, useState } from 'react'
import type { JeuPhotos, Pret, Vehicule } from '../shared/types'
import { photoUrl } from './api'
import { Cam, Check, IdCard, Pen, Phone, Plate, Warn } from './icons'
import { ComparerPhotos, ETAT, PERMIS, nbPhotos } from './Photos'
import { Sheet, SheetHead } from './Sheet'
import { days, depuis, fmt, fmtS, isLate, telHref } from './util'

type Props = {
  v: Vehicule
  p: Pret
  hist: Pret[]
  onClose: () => void
  onRendue: (retour: JeuPhotos) => void
  onModifier: () => void
  onHistorique: () => void
}

// Photos du retour prises avant de toucher « Voiture rendue » : gardées si on ferme la fiche entre-temps
const retours: Record<string, JeuPhotos> = {}

// Fiche d'une voiture dehors : chez qui, depuis quand, et le bouton « Voiture rendue »
export function VoirSheet({ v, p, hist, onClose, onRendue, onModifier, onHistorique }: Props) {
  const late = isLate(p)
  const [photo, setPhoto] = useState<string | null>(null)
  const [retour, setRetourRaw] = useState<JeuPhotos>(() => retours[p.id] ?? {})
  const setRetour = (j: JeuPhotos) => setRetourRaw((retours[p.id] = j))
  const [ouvert, setOuvert] = useState<'permis' | 'etat' | null>(null)
  const [errPhoto, setErrPhoto] = useState('')
  const nPermis = nbPhotos(p.photos?.depart, PERMIS)
  const nRetour = nbPhotos(retour, ETAT)

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
          {photo && <img className="photo" src={photo} alt="Compteur au départ" />}
          {/* Permis du client, et jauge et état de la voiture : départ à gauche, photos du retour à prendre à droite */}
          <div className="opts" role="group" aria-label="Photos">
            {nPermis > 0 && (
              <button type="button" className="opt" aria-expanded={ouvert === 'permis'} onClick={() => setOuvert(ouvert === 'permis' ? null : 'permis')}>
                <IdCard />
                Permis
              </button>
            )}
            <button
              type="button"
              className={'opt' + (nRetour ? ' done' : '')}
              aria-expanded={ouvert === 'etat'}
              onClick={() => setOuvert(ouvert === 'etat' ? null : 'etat')}
            >
              <Cam />
              {nRetour ? `État au retour · ${nRetour}` : 'État au retour'}
            </button>
          </div>
          {ouvert === 'permis' && <ComparerPhotos photos={p.photos} partie="permis" />}
          {ouvert === 'etat' && (
            <>
              <ComparerPhotos photos={p.photos} partie="etat" retour={retour} onRetour={setRetour} onErreur={setErrPhoto} />
              {errPhoto && (
                <div className="err" role="alert">
                  {errPhoto}
                </div>
              )}
            </>
          )}
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
            className="cta"
            onClick={() => {
              onRendue(retour)
              delete retours[p.id]
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

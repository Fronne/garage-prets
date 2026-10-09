import type { Pret, Vehicule } from '../shared/types'
import { Check, Clock, Phone, Wrench } from './icons'
import { estIndispo } from './IndispoSheet'
import { Sheet, SheetHead } from './Sheet'
import { isLate, telHref } from './util'

type Props = {
  v: Vehicule
  p?: Pret
  onClose: () => void
  onRendue: () => void
  onIndispo: () => void
  onRemettre: () => void
  onHistorique: () => void
}

// Ouvert par un appui long sur une carte : les gestes les plus courants, sans passer par la fiche
export function RaccourcisSheet({ v, p, onClose, onRendue, onIndispo, onRemettre, onHistorique }: Props) {
  const etat = p ? (isLate(p) ? 'En retard' : 'Prêtée') : estIndispo(v) ? 'Indispo' : 'Dispo'
  const cls = p ? (isLate(p) ? 'st-late' : 'st-out') : estIndispo(v) ? 'st-off' : 'st-ok'
  return (
    <Sheet onClose={onClose}>
      {(close) => {
        const puis = (f: () => void) => () => {
          f()
          close()
        }
        return (
          <>
            <SheetHead title={v.nom}>
              <span className={'st ' + cls}>
                {etat}
                {p ? ' · ' + p.client : ''}
              </span>
            </SheetHead>
            {/* L'action principale en dernier, près du pouce, comme dans la fiche de la voiture */}
            <div className="raccourcis">
              {p?.tel && (
                <a className="cta" href={telHref(p.tel)} onClick={() => setTimeout(close, 300)}>
                  <Phone />
                  Appeler {p.client}
                </a>
              )}
              <button className="cta alt" onClick={puis(onHistorique)}>
                <Clock />
                Voir l'historique de la voiture
              </button>
              {p && (
                <button className="cta ok" onClick={puis(onRendue)}>
                  <Check />
                  Voiture rendue
                </button>
              )}
              {!p && estIndispo(v) && (
                <button className="cta ok" onClick={puis(onRemettre)}>
                  <Check />
                  Remettre disponible
                </button>
              )}
              {!p && !estIndispo(v) && (
                // La fenêtre « Mettre de côté » remplace celle-ci : pas de close(), qui fermerait aussi la suivante
                <button className="cta" onClick={onIndispo}>
                  <Wrench />
                  Mettre de côté
                </button>
              )}
            </div>
          </>
        )
      }}
    </Sheet>
  )
}

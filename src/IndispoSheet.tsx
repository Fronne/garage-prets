import { useState } from 'react'
import type { Vehicule } from '../shared/types'
import { Check, Plate, Wrench } from './icons'
import { Sheet, SheetHead, fermerClavier } from './Sheet'
import { days } from './util'

const RAISONS = ['Contrôle technique', 'En réparation', 'Carrosserie', 'Entretien']

export const estIndispo = (v: Vehicule) => v.indispo != null

export function depuis(iso: string | null | undefined) {
  if (!iso) return ''
  const n = days(iso, Date.now())
  return n <= 0 ? "depuis aujourd'hui" : n === 1 ? 'depuis hier' : `depuis ${n} jours`
}

// Mettre une voiture de côté (on ne peut plus la prêter), ou la remettre disponible
export function IndispoSheet({ v, onClose, onSet }: { v: Vehicule; onClose: () => void; onSet: (motif: string | null) => void }) {
  const [motif, setMotif] = useState(v.indispo ?? '')

  if (estIndispo(v)) {
    return (
      <Sheet onClose={onClose}>
        {(close) => (
          <>
            <SheetHead title={v.nom}>
              <span className="st st-off">
                <Wrench />
                Indispo {depuis(v.indispo_le)}
              </span>
            </SheetHead>
            <Plate immat={v.immat} />
            <div className="indispo-why">
              <span className="sub">Pourquoi</span>
              <span>{v.indispo || 'Pas de raison notée'}</span>
            </div>
            <button
              className="cta ok"
              onClick={() => {
                onSet(null)
                close()
              }}
            >
              <Check />
              Remettre disponible
            </button>
          </>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <SheetHead title={'Mettre la ' + v.nom + ' de côté'} />
          <p className="auto">Elle reste dans la grille, en gris, et on ne peut plus la prêter tant qu'elle n'est pas remise disponible.</p>
          <form
            className="f"
            noValidate
            onKeyDown={fermerClavier}
            onSubmit={(e) => {
              e.preventDefault()
              onSet(motif.trim())
              close()
            }}
          >
            <span className="sub">Pourquoi ? (facultatif)</span>
            <div className="chips">
              {RAISONS.map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={motif === r} onClick={() => setMotif(motif === r ? '' : r)}>
                  {r}
                </button>
              ))}
            </div>
            <input
              className="inp sm"
              id="indispo-motif"
              enterKeyHint="done"
              autoComplete="off"
              autoCapitalize="sentences"
              placeholder="Ou une autre raison…"
              aria-label="Autre raison"
              value={RAISONS.includes(motif) ? '' : motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <button className="cta" type="submit">
              <Wrench />
              Mettre indisponible
            </button>
          </form>
        </>
      )}
    </Sheet>
  )
}

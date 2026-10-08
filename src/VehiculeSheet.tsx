import { useState } from 'react'
import type { Vehicule } from '../shared/types'
import { Check } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { formatPlate } from './util'

type Props = {
  v?: Vehicule
  onClose: () => void
  onSave: (nom: string, immat: string) => void
  onRetirer?: () => void
}

// Ajouter ou modifier une voiture : un nom suffit, la plaque est facultative
export function VehiculeSheet({ v, onClose, onSave, onRetirer }: Props) {
  const [nom, setNom] = useState(v?.nom ?? '')
  const [immat, setImmat] = useState(v?.immat ?? '')
  const [err, setErr] = useState('')
  const [sure, setSure] = useState(false)

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <SheetHead title={v ? 'Modifier la voiture' : 'Ajouter une voiture'} close={close} />
          <form
            className="f"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (!nom.trim()) return setErr('Il faut juste un nom, par exemple « Clio grise ».')
              onSave(nom.trim(), immat.trim())
              close()
            }}
          >
            <label className="q" htmlFor="nom">
              Comment vous l'appelez ?
            </label>
            <input
              className="inp"
              id="nom"
              autoComplete="off"
              autoCapitalize="sentences"
              placeholder="Clio grise"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              aria-describedby="verr"
              autoFocus
            />
            <div className="err" id="verr" role="alert">
              {err}
            </div>
            <label className="sub" htmlFor="immat">
              Plaque (facultatif)
            </label>
            <input
              className="inp sm"
              id="immat"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="AB-123-CD"
              maxLength={12}
              value={immat}
              onChange={(e) => setImmat(formatPlate(e.target.value))}
            />
            <button className="cta" type="submit">
              <Check />
              {v ? 'Enregistrer' : 'Ajouter la voiture'}
            </button>
            {v && !onRetirer && <p className="auto">Elle est prêtée en ce moment : tu pourras la retirer une fois rendue.</p>}
            {onRetirer && (
              <button
                type="button"
                className="link danger"
                onClick={() => {
                  if (!sure) return setSure(true)
                  onRetirer()
                  close()
                }}
              >
                {sure ? 'Touche encore pour confirmer' : 'Retirer cette voiture du parc'}
              </button>
            )}
          </form>
        </>
      )}
    </Sheet>
  )
}

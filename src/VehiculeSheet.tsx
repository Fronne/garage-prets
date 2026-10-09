import { useState } from 'react'
import type { Vehicule } from '../shared/types'
import { Check } from './icons'
import { Sheet, SheetHead, fermerClavier } from './Sheet'
import { PlateInput } from './PlateInput'

type Props = {
  v?: Vehicule
  onClose: () => void
  onSave: (nom: string, immat: string) => void
  onRetirer?: () => void
}

// Plaque AB-123-CD commencée mais pas finie (vide ou ancienne plaque : c'est bon)
const plaqueIncomplete = (immat: string) => /^[A-Z]{1,2}(-\d{0,3}(-[A-Z]{0,2})?)?$/.test(immat) && !/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(immat)

// Ajouter ou modifier une voiture : un nom suffit, la plaque est facultative
export function VehiculeSheet({ v, onClose, onSave, onRetirer }: Props) {
  const [nom, setNom] = useState(v?.nom ?? '')
  const [immat, setImmat] = useState(v?.immat ?? '')
  const [err, setErr] = useState('')
  const [errPlaque, setErrPlaque] = useState('')
  const [sure, setSure] = useState(false)

  // Vérifie et enregistre ; false si un champ bloque (le message s'affiche sous ce champ)
  function save() {
    if (!nom.trim()) {
      setErr('Il faut juste un nom, par exemple « Clio grise ».')
      return false
    }
    // Plaque commencée mais pas finie : on bloque (vide, c'est permis)
    if (plaqueIncomplete(immat)) {
      setErrPlaque('Plaque incomplète : finis-la (AB-123-CD) ou vide-la.')
      return false
    }
    onSave(nom.trim(), immat.trim())
    return true
  }

  const dirty = nom !== (v?.nom ?? '') || immat !== (v?.immat ?? '')
  return (
    <Sheet onClose={onClose} ask={{ dirty, save, saveLabel: v ? 'Enregistrer' : 'Ajouter la voiture' }}>
      {(close) => (
        <>
          <SheetHead title={v ? 'Modifier la voiture' : 'Ajouter une voiture'} />
          <form
            className="f"
            noValidate
            onKeyDown={fermerClavier}
            onSubmit={(e) => {
              e.preventDefault()
              if (save()) close()
            }}
          >
            <label className="q" htmlFor="nom">
              Comment vous l'appelez ?
            </label>
            <input
              enterKeyHint="done"
              className="inp"
              id="nom"
              autoComplete="off"
              autoCapitalize="sentences"
              placeholder="Clio grise"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              aria-describedby="verr"
            />
            <div className="err" id="verr" role="alert">
              {err}
            </div>
            <label className="sub" htmlFor="immat">
              Plaque (facultatif)
            </label>
            <PlateInput value={immat} onChange={(p) => (setImmat(p), setErrPlaque(''))} />
            <div className="err" role="alert">
              {errPlaque}
            </div>
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

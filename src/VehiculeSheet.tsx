import { useState } from 'react'
import type { Vehicule } from '../shared/types'
import { Check } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { PlateInput } from './PlateInput'

type Props = {
  v?: Vehicule
  onClose: () => void
  onSave: (nom: string, immat: string) => void
  onRetirer?: () => void
}

// Indice de la première case pas remplie d'une plaque AB-123-CD commencée, -1 si elle est vide, complète ou en saisie libre
function plaqueIncomplete(immat: string) {
  const m = immat.match(/^([A-Z]{0,2})-?(\d{0,3})-?([A-Z]{0,2})$/)
  if (!immat || !m) return -1
  return [m[1].length < 2, m[2].length < 3, m[3].length < 2].indexOf(true)
}

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
    const incomplete = plaqueIncomplete(immat)
    if (incomplete >= 0) {
      setErrPlaque('Plaque incomplète : finis-la (AB-123-CD) ou vide-la.')
      const box = document.querySelectorAll<HTMLInputElement>('.plate-box')[incomplete]
      box?.focus()
      box?.setSelectionRange(box.value.length, box.value.length)
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
            onSubmit={(e) => {
              e.preventDefault()
              if (save()) close()
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

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import type { JeuPhotos, PhotoCle, PhotosPret } from '../shared/types'
import { ApiError, errorText, photoUrl } from './api'
import { envoyer } from './envois'
import { Cam, X } from './icons'
import { shrinkPhoto } from './util'

export const PERMIS: [PhotoCle, string][] = [
  ['permis_recto', 'Recto'],
  ['permis_verso', 'Verso'],
]
// Mêmes emplacements au départ et au retour : chaque photo du retour se compare à celle du départ prise au même endroit
export const ETAT: [PhotoCle, string][] = [
  ['jauge', 'Jauge'],
  ['avant', 'Avant'],
  ['arriere', 'Arrière'],
  ['gauche', 'Côté gauche'],
  ['droite', 'Côté droit'],
  ['detail', 'Détail, dégât'],
]

export const nbPhotos = (jeu: JeuPhotos | undefined, cles: [PhotoCle, string][]) => cles.filter(([k]) => jeu?.[k]).length
export const aDesPhotos = (p: PhotosPret | null | undefined) => !!p && nbPhotos(p.depart, [...PERMIS, ...ETAT]) + nbPhotos(p.retour, ETAT) > 0

// Photos prises sur ce téléphone : affichées tout de suite, sans attendre leur envoi
const locales = new Map<string, string>()
// Photos déjà chargées depuis le serveur, gardées tant que l'appli est ouverte
const chargees = new Map<string, Promise<string>>()

function usePhoto(id: string | undefined) {
  const [url, setUrl] = useState(() => (id ? locales.get(id) ?? null : null))
  useEffect(() => {
    if (!id) return setUrl(null)
    const l = locales.get(id)
    if (l) return setUrl(l)
    let stale = false
    if (!chargees.has(id)) {
      const pr = photoUrl(id)
      // Pas encore arrivée sur le serveur (envoi en attente) : on réessaiera au prochain affichage
      pr.catch(() => chargees.delete(id))
      chargees.set(id, pr)
    }
    chargees
      .get(id)!
      .then((u) => !stale && setUrl(u))
      .catch(() => !stale && setUrl(null))
    return () => {
      stale = true
    }
  }, [id])
  return url
}

/** Réduit la photo, l'affiche tout de suite et l'envoie ; sans réseau, l'envoi attend sur le téléphone comme un prêt. */
export async function prendrePhoto(file: File, onErreur: (msg: string) => void): Promise<string> {
  const data = await shrinkPhoto(file)
  const id = crypto.randomUUID()
  locales.set(id, data)
  envoyer('/photos', 'POST', { id, data }).catch((e) =>
    onErreur(e instanceof ApiError ? errorText(e) : 'Pas de réseau et plus de place sur le téléphone pour garder la photo.'),
  )
  return id
}

type Vue = { label: string; id: string }[]

// Une photo en grand, ou deux l'une sous l'autre (départ et retour) pour voir les différences. Toucher ferme.
function Visionneuse({ vue, onClose }: { vue: Vue; onClose: () => void }) {
  const fermer = useRef(onClose)
  fermer.current = onClose
  useEffect(() => {
    // Une étape dans l'historique du téléphone : le geste retour ferme la photo, pas la fenêtre derrière
    history.pushState({ ...history.state, vue: true }, '')
    const onPop = () => fermer.current()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      history.back()
    }
    window.addEventListener('popstate', onPop)
    document.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [])
  // Au-dessus de tout, hors de la fenêtre : glisser sur la photo ne doit pas faire descendre la fenêtre derrière
  const stop = (e: SyntheticEvent) => e.stopPropagation()
  return createPortal(
    <div
      className="vue"
      role="dialog"
      aria-modal="true"
      aria-label="Photo en grand"
      onClick={(e) => (e.stopPropagation(), history.back())}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      onTouchCancel={stop}
    >
      {vue.map((x) => (
        <figure key={x.id}>
          <ImgPhoto id={x.id} alt={x.label} />
          <figcaption>{x.label}</figcaption>
        </figure>
      ))}
      <button className="x" aria-label="Fermer">
        <X />
      </button>
    </div>,
    document.body,
  )
}

function ImgPhoto({ id, alt }: { id: string; alt: string }) {
  const url = usePhoto(id)
  return url ? <img src={url} alt={alt} /> : <span className="ph-vide">Chargement…</span>
}

type CaseProps = {
  label: string
  id?: string
  /** Absent : photo seulement à regarder */
  onPrendre?: (file: File) => void
  onRetirer?: () => void
  onVoir: () => void
}

// Un emplacement : vide, on touche pour prendre la photo ; rempli, on touche pour la voir en grand
function Case({ label, id, onPrendre, onRetirer, onVoir }: CaseProps) {
  const url = usePhoto(id)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!id) {
    if (!onPrendre) return <span className="case vide" aria-label={label + ' : pas de photo'} />
    return (
      <>
        <button type="button" className="case prendre" aria-label={'Photo : ' + label} onClick={() => fileRef.current?.click()}>
          <Cam />
          <span>{label}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onPrendre(f)
          }}
        />
      </>
    )
  }
  return (
    <span className="case pleine">
      <button type="button" className="case-img" onClick={onVoir} aria-label={'Voir ' + label}>
        {url && <img src={url} alt="" />}
        {onPrendre && <span className="case-l">{label}</span>}
      </button>
      {onRetirer && (
        <button type="button" className="case-x" onClick={onRetirer} aria-label={'Retirer la photo ' + label}>
          <X sm />
        </button>
      )}
    </span>
  )
}

type GrilleProps = {
  cles: [PhotoCle, string][]
  jeu: JeuPhotos
  onChange: (jeu: JeuPhotos) => void
  onErreur: (msg: string) => void
}

// Emplacements à remplir au départ (permis, ou jauge et état de la voiture) ; tout est facultatif
export function GrillePhotos({ cles, jeu, onChange, onErreur }: GrilleProps) {
  const [vue, setVue] = useState<Vue | null>(null)
  const dernier = useRef(jeu)
  dernier.current = jeu
  return (
    <div className={'cases' + (cles.length === 2 ? ' deux' : '')}>
      {cles.map(([k, label]) => (
        <Case
          key={k}
          label={label}
          id={jeu[k]}
          onPrendre={(f) =>
            prendrePhoto(f, onErreur)
              .then((id) => onChange({ ...dernier.current, [k]: id }))
              .catch(() => onErreur("La photo n'a pas pu être lue. Réessaie."))
          }
          onRetirer={() => {
            const { [k]: _, ...reste } = dernier.current
            onChange(reste)
          }}
          onVoir={() => setVue([{ label, id: jeu[k]! }])}
        />
      ))}
      {vue && <Visionneuse vue={vue} onClose={() => setVue(null)} />}
    </div>
  )
}

type ComparerProps = {
  photos: PhotosPret | null | undefined
  /** Seulement le permis, ou seulement la jauge et l'état ; les deux par défaut */
  partie?: 'permis' | 'etat'
  /** Fiche d'une voiture dehors : on remplit les photos du retour */
  retour?: JeuPhotos
  onRetour?: (jeu: JeuPhotos) => void
  onErreur?: (msg: string) => void
}

// Permis du client, puis jauge et état de la voiture : départ à gauche, retour à droite. Toucher une ligne montre les deux en grand.
export function ComparerPhotos({ photos, partie, retour, onRetour, onErreur = () => {} }: ComparerProps) {
  const [vue, setVue] = useState<Vue | null>(null)
  const dep = photos?.depart ?? {}
  const ret = retour ?? photos?.retour ?? {}
  const dernier = useRef(ret)
  dernier.current = ret
  const permis = partie === 'etat' ? [] : PERMIS.filter(([k]) => dep[k])
  // En lecture, seulement les lignes où il y a une photo
  const lignes = partie === 'permis' ? [] : ETAT.filter(([k]) => onRetour || dep[k] || ret[k])
  const voirLigne = (k: PhotoCle, label: string) =>
    setVue([
      ...(dep[k] ? [{ label: label + ' au départ', id: dep[k]! }] : []),
      ...(ret[k] ? [{ label: label + ' au retour', id: ret[k]! }] : []),
    ])
  return (
    <div className="cmp-bloc">
      {permis.length > 0 && (
        <>
          <div className="sub">Permis</div>
          <div className="cases deux">
            {permis.map(([k, label]) => (
              <Case key={k} label={'Permis ' + label.toLowerCase()} id={dep[k]} onVoir={() => setVue([{ label: 'Permis, ' + label.toLowerCase(), id: dep[k]! }])} />
            ))}
          </div>
        </>
      )}
      {lignes.length > 0 && (
        <div className="cmp" role="table" aria-label="État de la voiture au départ et au retour">
          <div role="row" className="cmp-h">
            <span role="columnheader" />
            <span role="columnheader" className="sub">
              Départ
            </span>
            <span role="columnheader" className="sub">
              Retour
            </span>
          </div>
          {lignes.map(([k, label]) => (
            <div role="row" key={k}>
              <span role="rowheader" className="cmp-l">
                {label}
              </span>
              <span role="cell">
                <Case label={label} id={dep[k]} onVoir={() => voirLigne(k, label)} />
              </span>
              <span role="cell">
                <Case
                  label={label}
                  id={ret[k]}
                  onVoir={() => voirLigne(k, label)}
                  onPrendre={
                    onRetour &&
                    ((f) =>
                      prendrePhoto(f, onErreur)
                        .then((id) => onRetour({ ...dernier.current, [k]: id }))
                        .catch(() => onErreur("La photo n'a pas pu être lue. Réessaie.")))
                  }
                  onRetirer={
                    onRetour &&
                    (() => {
                      const { [k]: _, ...reste } = dernier.current
                      onRetour(reste)
                    })
                  }
                />
              </span>
            </div>
          ))}
        </div>
      )}
      {vue && <Visionneuse vue={vue} onClose={() => setVue(null)} />}
    </div>
  )
}

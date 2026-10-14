import { useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react'
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
export const ETAT: [PhotoCle, string][] = [
  ['jauge', 'Jauge carburant'],
  ['avant', 'Avant'],
  ['arriere', 'Arrière'],
  ['gauche', 'Côté gauche'],
  ['droite', 'Côté droit'],
  ['detail', 'Détail, dégât'],
]

export const nbPhotos = (jeu: JeuPhotos | undefined, cles: [PhotoCle, string][]) => cles.filter(([k]) => jeu?.[k]).length
export const aDesPhotos = (p: PhotosPret | null | undefined) => !!p && nbPhotos(p.depart, [...PERMIS, ...ETAT]) > 0

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

// Toutes les photos de la fiche, et celle touchée pour ouvrir
type Vue = { photos: { label: string; id: string }[]; i: number }

// Les photos en grand, une à la fois : glisser à gauche ou à droite passe à la suivante. Toucher ferme.
function Visionneuse({ vue, onClose }: { vue: Vue; onClose: () => void }) {
  const fermer = useRef(onClose)
  fermer.current = onClose
  const defile = useRef<HTMLDivElement>(null)
  // Ouvre sur la photo touchée
  useLayoutEffect(() => {
    const el = defile.current
    if (el) el.scrollLeft = vue.i * el.clientWidth
  }, [])
  useEffect(() => {
    // Une étape dans l'historique du téléphone : le geste retour ferme la photo, pas la fenêtre derrière
    history.pushState({ ...history.state, vue: true }, '')
    const onPop = () => fermer.current()
    const onKey = (e: KeyboardEvent) => {
      const el = defile.current
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && el) {
        e.stopImmediatePropagation()
        el.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * el.clientWidth, behavior: 'smooth' })
      }
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
      <div className="vue-defile" ref={defile}>
        {vue.photos.map((x, n) => (
          <figure key={x.id}>
            <ImgPhoto id={x.id} alt={x.label} />
            <figcaption>
              {x.label}
              {vue.photos.length > 1 && ` · ${n + 1} / ${vue.photos.length}`}
            </figcaption>
          </figure>
        ))}
      </div>
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
        <span className="case-l">{label}</span>
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
          onVoir={() => {
            const prises = cles.filter(([c]) => jeu[c])
            setVue({ photos: prises.map(([c, l]) => ({ label: l, id: jeu[c]! })), i: prises.findIndex(([c]) => c === k) })
          }}
        />
      ))}
      {vue && <Visionneuse vue={vue} onClose={() => setVue(null)} />}
    </div>
  )
}

type VoirProps = {
  photos: PhotosPret | null | undefined
  /** Seulement le permis, ou seulement la jauge et l'état ; les deux par défaut */
  partie?: 'permis' | 'etat'
}

// Photos d'un prêt, à regarder : le permis du client, puis la jauge et l'état de la voiture au départ. Toucher une photo l'affiche en grand.
export function VoirPhotos({ photos, partie }: VoirProps) {
  const [vue, setVue] = useState<Vue | null>(null)
  const dep = photos?.depart ?? {}
  const permis: [PhotoCle, string][] = partie === 'etat' ? [] : PERMIS.filter(([k]) => dep[k]).map(([k, l]) => [k, 'Permis ' + l.toLowerCase()])
  const etat = partie === 'permis' ? [] : ETAT.filter(([k]) => dep[k])
  // En grand, on passe d'une photo à l'autre parmi toutes celles affichées ici : permis puis voiture
  const toutes = [...permis, ...etat.map(([k, l]): [PhotoCle, string] => [k, l + ' au départ'])]
  const ouvrir = (k: PhotoCle) => setVue({ photos: toutes.map(([c, l]) => ({ label: l, id: dep[c]! })), i: toutes.findIndex(([c]) => c === k) })
  const grille = (titre: string, cles: [PhotoCle, string][]) =>
    cles.length > 0 && (
      <>
        <div className="sub">{titre}</div>
        <div className={'cases' + (cles.length === 2 ? ' deux' : '')}>
          {cles.map(([k, label]) => (
            <Case key={k} label={label} id={dep[k]} onVoir={() => ouvrir(k)} />
          ))}
        </div>
      </>
    )
  return (
    <div className="cmp-bloc">
      {grille('Permis', permis)}
      {grille('Jauge et état au départ', etat)}
      {vue && <Visionneuse vue={vue} onClose={() => setVue(null)} />}
    </div>
  )
}

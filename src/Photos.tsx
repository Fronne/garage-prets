import { useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Degat, JeuPhotos, PhotoCle, PhotosPret } from '../shared/types'
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
]
export const MAX_DEGATS = 10

export const nbPhotos = (jeu: JeuPhotos | undefined, cles: [PhotoCle, string][]) => cles.filter(([k]) => jeu?.[k]).length
/** Les dégâts d'un prêt ; l'ancienne case unique « Détail, dégât » compte comme le premier */
export const degatsDe = (jeu: JeuPhotos | undefined): Degat[] => [...(jeu?.detail ? [{ id: jeu.detail }] : []), ...(jeu?.degats ?? [])]
/** Photos de la voiture : les vues prises et les dégâts */
export const nbEtat = (jeu: JeuPhotos | undefined) => nbPhotos(jeu, ETAT) + degatsDe(jeu).length
/** « 3/5 · 2 dégâts » : les vues prises sur les 5, pour voir ce qui manque ; vide s'il n'y a rien */
export function resumeEtat(jeu: JeuPhotos | undefined) {
  if (!nbEtat(jeu)) return ''
  const d = degatsDe(jeu).length
  return `${nbPhotos(jeu, ETAT)}/${ETAT.length}` + (d ? ` · ${d} dégât${d > 1 ? 's' : ''}` : '')
}
/** Pour modifier un prêt : l'ancienne case « detail » rejoint la liste des dégâts */
export function versDegats(jeu: JeuPhotos): JeuPhotos {
  if (!jeu.detail) return jeu
  const { detail: _, ...reste } = jeu
  return { ...reste, degats: degatsDe(jeu) }
}
export const aDesPhotos = (p: PhotosPret | null | undefined) => !!p && nbPhotos(p.depart, PERMIS) + nbEtat(p.depart) > 0

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

const labelDegat = (d: Degat, n: number) => `Dégât ${n + 1}` + (d.note ? ' · ' + d.note : '')

type DegatsProps = {
  jeu: JeuPhotos
  onChange: (jeu: JeuPhotos) => void
  onErreur: (msg: string) => void
}

// Les dégâts au départ : autant de photos qu'il en faut, chacune avec où elle est si on veut le noter
export function GrilleDegats({ jeu, onChange, onErreur }: DegatsProps) {
  const [vue, setVue] = useState<Vue | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dernier = useRef(jeu)
  dernier.current = jeu
  const degats = jeu.degats ?? []
  const changer = (liste: Degat[]) => {
    const { degats: _, ...reste } = dernier.current
    onChange(liste.length ? { ...reste, degats: liste } : reste)
  }
  return (
    <div className="degats">
      {degats.map((d, n) => (
        <div className="degat" key={d.id}>
          <Case
            label={`Dégât ${n + 1}`}
            id={d.id}
            onRetirer={() => changer((dernier.current.degats ?? []).filter((x) => x.id !== d.id))}
            onVoir={() => setVue({ photos: degats.map((x, i) => ({ label: labelDegat(x, i), id: x.id })), i: n })}
          />
          <input
            enterKeyHint="done"
            className="inp sm"
            maxLength={80}
            aria-label={`Où est le dégât ${n + 1}`}
            placeholder="Où ? ex. portière AR"
            value={d.note ?? ''}
            onChange={(e) => changer((dernier.current.degats ?? []).map((x) => (x.id === d.id ? { ...x, note: e.target.value } : x)))}
          />
        </div>
      ))}
      {degats.length < MAX_DEGATS && (
        <>
          <button type="button" className="case prendre ajout" onClick={() => fileRef.current?.click()}>
            <Cam />
            <span>{degats.length ? 'Ajouter un autre dégât' : 'Ajouter un dégât'}</span>
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
              if (f)
                prendrePhoto(f, onErreur)
                  .then((id) => changer([...(dernier.current.degats ?? []), { id }]))
                  .catch(() => onErreur("La photo n'a pas pu être lue. Réessaie."))
            }}
          />
        </>
      )}
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
  type Ph = { label: string; id: string; grand: string }
  const permis: Ph[] = partie === 'etat' ? [] : PERMIS.filter(([k]) => dep[k]).map(([k, l]) => ({ label: l, id: dep[k]!, grand: 'Permis ' + l.toLowerCase() }))
  const etat: Ph[] = partie === 'permis' ? [] : ETAT.filter(([k]) => dep[k]).map(([k, l]) => ({ label: l, id: dep[k]!, grand: l + ' au départ' }))
  const degats: Ph[] = partie === 'permis' ? [] : degatsDe(dep).map((d, n) => ({ label: labelDegat(d, n), id: d.id, grand: labelDegat(d, n) }))
  // En grand, on passe d'une photo à l'autre parmi toutes celles affichées ici : permis, voiture, puis dégâts
  const toutes = [...permis, ...etat, ...degats]
  const ouvrir = (id: string) => setVue({ photos: toutes.map((x) => ({ label: x.grand, id: x.id })), i: toutes.findIndex((x) => x.id === id) })
  const grille = (titre: string, liste: Ph[]) =>
    liste.length > 0 && (
      <>
        <div className="sub">{titre}</div>
        <div className={'cases' + (liste.length === 2 ? ' deux' : '')}>
          {liste.map((x) => (
            <Case key={x.id} label={x.label} id={x.id} onVoir={() => ouvrir(x.id)} />
          ))}
        </div>
      </>
    )
  return (
    <div className="cmp-bloc">
      {grille('Permis', permis)}
      {grille(`Jauge et état au départ · ${etat.length}/${ETAT.length}`, etat)}
      {grille('Dégâts au départ', degats)}
      {vue && <Visionneuse vue={vue} onClose={() => setVue(null)} />}
    </div>
  )
}

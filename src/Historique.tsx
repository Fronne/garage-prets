import { useEffect, useRef, useState } from 'react'
import type { LigneHisto } from '../shared/types'
import { api, errorText } from './api'
import { Avatar } from './Board'
import { DatePicker } from './DatePicker'
import { Cam, Phone, Plate, X } from './icons'
import { Logo } from './Logo'
import { ETAT, VoirPhotos, aDesPhotos, nbPhotos } from './Photos'
import { dayStr, telHref } from './util'

// Date et heure, avec l'année seulement si ce n'est pas l'année en cours
function quand(iso: string) {
  const d = new Date(iso)
  const an = d.getFullYear() !== new Date().getFullYear()
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', ...(an ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' })
}
const mois = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

// La recherche reste tant que l'appli est ouverte (aller voir une voiture puis revenir), et repart à zéro au prochain lancement
const memo = { jour: '', q: '' }

// Depuis la fiche d'une voiture : l'Historique s'ouvre déjà filtré sur elle, tous les jours
export function chercherDansHistorique(q: string) {
  memo.jour = ''
  memo.q = q
}

// Dernière réponse pour chaque recherche : la page s'affiche tout de suite avec, puis se met à jour en arrière-plan
const cache = new Map<string, LigneHisto[]>()
// Fiches dessinées d'un coup ; les suivantes arrivent quand on approche du bas (300 fiches d'un coup font ramer le téléphone)
const PAGE = 30

function params(jour: string, q: string) {
  const p = new URLSearchParams()
  if (jour) {
    p.set('de', new Date(jour + 'T00:00').toISOString())
    p.set('a', new Date(jour + 'T23:59:59.999').toISOString())
  }
  if (q.trim()) p.set('q', q.trim())
  return p.toString()
}

async function charger(jour: string, q: string) {
  const k = params(jour, q)
  const r = await api<LigneHisto[]>('/historique?' + k)
  cache.set(k, r)
  return r
}

// Appelé peu après l'ouverture de l'appli : le premier passage sur l'Historique est déjà prêt
export const prechargerHistorique = () => charger('', '').catch(() => {})

// Tous les prêts passés : on choisit un jour (celui du PV) et/ou on tape une plaque pour savoir qui avait la voiture
export function Historique({ moi, onMoi }: { moi: string; onMoi: () => void }) {
  const [jour, setJourRaw] = useState(memo.jour)
  const [q, setQRaw] = useState(memo.q)
  const setJour = (v: string) => setJourRaw((memo.jour = v))
  const setQ = (v: string) => setQRaw((memo.q = v))
  const [rows, setRows] = useState<LigneHisto[] | null>(() => cache.get(params(memo.jour, memo.q)) ?? null)
  const [err, setErr] = useState('')
  const [n, setN] = useState(PAGE)
  // Prêt dont on regarde le permis et les photos
  const [ouvert, setOuvert] = useState<string | null>(null)
  const finRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    let stale = false
    const deja = cache.get(params(jour, q))
    if (deja) setRows(deja)
    setN(PAGE)
    // Pendant la frappe, on attend un peu ; sans texte tapé (ouverture, choix d'un jour), on charge tout de suite
    const t = setTimeout(
      async () => {
        try {
          const r = await charger(jour, q)
          if (!stale) (setRows(r), setErr(''))
        } catch (e) {
          if (!stale) setErr(errorText(e))
        }
      },
      q.trim() ? 250 : 0,
    )
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [jour, q])

  // Près du bas de la liste : on dessine les fiches suivantes
  const reste = rows ? rows.length > n : false
  useEffect(() => {
    const el = finRef.current
    if (!el || !reste || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setN((x) => x + PAGE), { rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [reste, n])

  const titreJour = jour && new Date(jour + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  let dernierMois = ''

  return (
    <main className="wrap">
      <header>
        <div className="hd">
          <div className="hd-t">
            <span className="eyebrow">Pour un PV ou une amende</span>
            <h1>Historique</h1>
          </div>
          <Avatar moi={moi} onClick={onMoi} />
        </div>
      </header>
      <div className="finder">
        <label className="sub" htmlFor="h-jour">
          Quel jour ?
        </label>
        <div className="finder-row">
          <DatePicker id="h-jour" value={jour} max={dayStr(0)} placeholder="Tous les jours" onChange={setJour} />
        </div>
        <label className="sub" htmlFor="h-q">
          Plaque, voiture ou client
        </label>
        <input
          id="h-q"
          className="inp sm"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="AB-123-CD, Clio, M. Martin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // La recherche se fait pendant la frappe : la touche du clavier le referme pour voir les résultats
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        {(jour || q) && (
          <button type="button" className="link efface" onClick={() => (setJour(''), setQ(''))}>
            <X sm />
            Effacer la recherche
          </button>
        )}
      </div>
      <div className="err" role="alert">
        {err}
      </div>
      {rows && (
        <p className="histo-res" aria-live="polite">
          {jour ? 'Le ' + titreJour + ' : ' : ''}
          {rows.length === 0
            ? jour
              ? 'aucune voiture prêtée.'
              : 'aucun prêt trouvé.'
            : `${rows.length}${rows.length === 300 ? '+' : ''} prêt${rows.length > 1 ? 's' : ''}${jour ? '' : ', du plus récent au plus ancien'}`}
        </p>
      )}
      {rows && rows.length > 0 && (
        <ul className="histo">
          {rows.slice(0, n).map((r) => {
            const m = mois(r.depart)
            const titre = !jour && m !== dernierMois ? (dernierMois = m) : null
            return (
              <li key={r.id}>
                {titre && <h2 className="mois">{titre}</h2>}
                <div className="h-card">
                  <div className="h-top">
                    <span className="ico">
                      <Logo nom={r.nom} />
                    </span>
                    <span className="pc-main">
                      <span className="pc-nm">{r.nom}</span>
                      <Plate immat={r.immat} />
                    </span>
                  </div>
                  <div className="h-who">
                    <span className="h-client">{r.client}</span>
                    {r.tel && (
                      <a className="btn call sm" href={telHref(r.tel)} aria-label={'Appeler ' + r.client}>
                        <Phone />
                      </a>
                    )}
                  </div>
                  <div className="kv">
                    <div>
                      <span>Partie le</span>
                      <span>{quand(r.depart)}</span>
                    </div>
                    <div>
                      <span>Rendue le</span>
                      <span>{r.retour ? quand(r.retour) : 'Toujours dehors'}</span>
                    </div>
                    {/* « Prêtée par » à gauche et le bouton des photos à droite, sur la même ligne, pour ne pas en ajouter une */}
                    {(r.par || aDesPhotos(r.photos)) && (
                      <div className="full h-bas">
                        {r.par ? (
                          <div>
                            <span>Prêtée par</span>
                            <span>{r.par}</span>
                          </div>
                        ) : (
                          <i />
                        )}
                        {aDesPhotos(r.photos) && (
                          <button type="button" className="link h-photos" aria-expanded={ouvert === r.id} onClick={() => setOuvert(ouvert === r.id ? null : r.id)}>
                            <Cam />
                            {/* Voiture rendue depuis plus d'un jour : il ne reste que le permis */}
                            {nbPhotos(r.photos?.depart, ETAT) ? (ouvert === r.id ? 'Cacher les photos' : 'Permis et photos') : ouvert === r.id ? 'Cacher le permis' : 'Permis'}
                          </button>
                        )}
                      </div>
                    )}
                    {r.note && (
                      <div className="full">
                        <span>Note</span>
                        <span>{r.note}</span>
                      </div>
                    )}
                  </div>
                  {ouvert === r.id && <VoirPhotos photos={r.photos} />}
                </div>
              </li>
            )
          })}
          {reste && (
            <li ref={finRef}>
              <button type="button" className="link plus" onClick={() => setN((x) => x + PAGE)}>
                Voir les prêts suivants
              </button>
            </li>
          )}
        </ul>
      )}
    </main>
  )
}

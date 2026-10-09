import { useEffect, useState } from 'react'
import type { LigneHisto } from '../shared/types'
import { api, errorText } from './api'
import { Avatar } from './Board'
import { DatePicker } from './DatePicker'
import { Phone, Plate, X } from './icons'
import { Logo } from './Logo'
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

// Tous les prêts passés : on choisit un jour (celui du PV) et/ou on tape une plaque pour savoir qui avait la voiture
export function Historique({ moi, onMoi }: { moi: string; onMoi: () => void }) {
  const [jour, setJourRaw] = useState(memo.jour)
  const [q, setQRaw] = useState(memo.q)
  const setJour = (v: string) => setJourRaw((memo.jour = v))
  const setQ = (v: string) => setQRaw((memo.q = v))
  const [rows, setRows] = useState<LigneHisto[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let stale = false
    const t = setTimeout(async () => {
      const params = new URLSearchParams()
      if (jour) {
        params.set('de', new Date(jour + 'T00:00').toISOString())
        params.set('a', new Date(jour + 'T23:59:59.999').toISOString())
      }
      if (q.trim()) params.set('q', q.trim())
      try {
        const r = await api<LigneHisto[]>('/historique?' + params)
        if (!stale) (setRows(r), setErr(''))
      } catch (e) {
        if (!stale) setErr(errorText(e))
      }
    }, 250)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [jour, q])

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
          {rows.map((r) => {
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
                    {r.par && (
                      <div>
                        <span>Prêtée par</span>
                        <span>{r.par}</span>
                      </div>
                    )}
                    {r.note && (
                      <div className="full">
                        <span>Note</span>
                        <span>{r.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

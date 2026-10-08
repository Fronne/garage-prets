import type { Pret, SyncData, Vehicule } from '../shared/types'
import { Clock, Home, Plate, Plus, User, Warn } from './icons'
import { Logo } from './Logo'
import { days, fmtS, isLate } from './util'

type Props = {
  data: SyncData
  offline: boolean
  attente: number
  first: boolean
  onPreter: (v: Vehicule) => void
  onVoir: (p: Pret) => void
  onAjouter: () => void
  onMoi: () => void
}

export function Board({ data, offline, attente, first, onPreter, onVoir, onAjouter, onMoi }: Props) {
  const actifs = new Map(data.prets.filter((p) => !p.retour).map((p) => [p.vehicule_id, p]))
  // En retard, puis prêtées (la plus ancienne d'abord), puis dispo
  const rank = (v: Vehicule) => {
    const p = actifs.get(v.id)
    return p ? (isLate(p) ? 0 : 1) : 2
  }
  const vs = data.vehicules
    .slice()
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (actifs.get(a.id)?.depart ?? '').localeCompare(actifs.get(b.id)?.depart ?? '') ||
        a.nom.localeCompare(b.nom, 'fr'),
    )
  const nOut = actifs.size
  const nLate = vs.filter((v) => rank(v) === 0).length
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="wrap">
      <header>
        <div className="hd">
          <div className="hd-t">
            <span className="eyebrow">{today}</span>
            <h1>Voitures de prêt</h1>
          </div>
          <Avatar moi={data.moi} onClick={onMoi} />
        </div>
        <div className="counts">
          <span className="count c-ok">{vs.length - nOut} dispo</span>
          <span className="count c-out">
            {nOut} prêtée{nOut > 1 ? 's' : ''}
          </span>
          {nLate > 0 && <span className="count c-late">{nLate} en retard</span>}
        </div>
        {attente > 0 ? (
          <div className="offline">
            Pas de réseau : {attente} enregistrement{attente > 1 ? 's' : ''} en attente, envoi dès que le réseau revient.
          </div>
        ) : (
          offline && <div className="offline">Pas de connexion : la liste n'est peut-être pas à jour.</div>
        )}
      </header>
      <div className={'grid' + (first ? ' first' : '')}>
        {vs.map((v) => {
          const p = actifs.get(v.id)
          return p ? <Out key={v.id} v={v} p={p} onClick={() => onVoir(p)} /> : <Dispo key={v.id} v={v} onClick={() => onPreter(v)} />
        })}
        {/* Ajouter une voiture se fait dans « Le parc » ; ici seulement tant que le parc est vide */}
        {vs.length === 0 && (
          <button className="tile add" onClick={onAjouter}>
            <Plus />
            Ajouter la première voiture
          </button>
        )}
      </div>
    </main>
  )
}

// Rond avec l'initiale de la personne connectée, en haut à droite
export function Avatar({ moi, onClick }: { moi: string; onClick: () => void }) {
  return (
    <button className="avatar" onClick={onClick} aria-label={'Connecté : ' + moi + '. Changer de personne'}>
      {moi.trim().charAt(0).toUpperCase()}
    </button>
  )
}

function Dispo({ v, onClick }: { v: Vehicule; onClick: () => void }) {
  return (
    <button className="tile t-ok" onClick={onClick} aria-label={`${v.nom}, dispo. Toucher pour prêter`}>
      <span className="top">
        <span className="ico">
          <Logo nom={v.nom} />
        </span>
        <span className="st">Dispo</span>
      </span>
      <span className="nm">{v.nom}</span>
      <Plate immat={v.immat} />
      <span className="foot">
        <span className="who">
          <Home />
          Au garage
        </span>
        <span className="since">Touche pour prêter</span>
      </span>
    </button>
  )
}

function Out({ v, p, onClick }: { v: Vehicule; p: Pret; onClick: () => void }) {
  const late = isLate(p)
  const n = days(p.depart, Date.now())
  const since = late ? 'Prévue le ' + fmtS(p.retour_prevu!) : n <= 0 ? "Depuis aujourd'hui" : n === 1 ? 'Depuis hier' : `Depuis ${n} jours`
  return (
    <button className={'tile ' + (late ? 't-late' : 't-out')} onClick={onClick} aria-label={`${v.nom}, ${late ? 'en retard' : 'prêtée'} à ${p.client}`}>
      <span className="top">
        <span className="ico">
          <Logo nom={v.nom} />
        </span>
        <span className="st">
          {late && <Warn />}
          {late ? 'Retard' : 'Prêtée'}
        </span>
      </span>
      <span className="nm">{v.nom}</span>
      <Plate immat={v.immat} />
      <span className="foot">
        <span className="who">
          <User />
          {p.client}
        </span>
        <span className="since">
          <Clock />
          {since}
        </span>
      </span>
    </button>
  )
}

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Pret, SyncData, Vehicule } from '../shared/types'
import { Check, Clock, Home, Plate, Plus, User, Warn, Wrench } from './icons'
import { estIndispo } from './IndispoSheet'
import { Logo } from './Logo'
import { days, fmtS, isLate } from './util'

type Props = {
  data: SyncData
  offline: boolean
  attente: number
  first: boolean
  onPreter: (v: Vehicule) => void
  onIndispo: (v: Vehicule) => void
  onVoir: (p: Pret) => void
  onAjouter: () => void
  onMoi: () => void
}

let dejaPulse = false

export function Board({ data, offline, attente, first, onPreter, onIndispo, onVoir, onAjouter, onMoi }: Props) {
  const actifs = new Map(data.prets.filter((p) => !p.retour).map((p) => [p.vehicule_id, p]))
  // En retard, puis prêtées (la plus ancienne d'abord), puis dispo, puis indisponibles
  const rank = (v: Vehicule) => {
    const p = actifs.get(v.id)
    return p ? (isLate(p) ? 0 : 1) : estIndispo(v) ? 3 : 2
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
  const nOff = vs.filter((v) => rank(v) === 3).length
  const etat = (v: Vehicule) => ['late', 'out', 'ok', 'off'][rank(v)]

  // Toucher une pastille du haut n'affiche que ces voitures ; la retoucher les remontre toutes
  const [filtre, setFiltre] = useState<'ok' | 'out' | 'late' | 'off' | null>(null)
  const f = (filtre === 'late' && nLate === 0) || (filtre === 'off' && nOff === 0) ? null : filtre
  const garde = (v: Vehicule) => !f || (f === 'ok' ? rank(v) === 2 : f === 'out' ? rank(v) < 2 : f === 'off' ? rank(v) === 3 : rank(v) === 0)
  const vus = vs.filter(garde)
  const pastille = (k: 'ok' | 'out' | 'late' | 'off', texte: ReactNode) => (
    <button type="button" className={'count c-' + k} aria-pressed={f === k} onClick={() => setFiltre(f === k ? null : k)}>
      <span>{texte}</span>
    </button>
  )

  // Voiture prêtée ou rendue : sa carte glisse vers sa nouvelle place et affiche une coche un instant
  const gridRef = useRef<HTMLDivElement>(null)
  const avant = useRef<Map<string, { etat: string; x: number; y: number }> | null>(null)
  const [flash, setFlash] = useState<string[]>([])
  const flashTimer = useRef(0)
  const cle = vus.map((v) => v.id + etat(v)).join()
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const apres = new Map<string, { etat: string; x: number; y: number }>()
    const changees: string[] = []
    grid.querySelectorAll<HTMLElement>('[data-id]').forEach((el) => {
      const id = el.dataset.id!
      const e = { etat: el.dataset.etat!, x: el.offsetLeft, y: el.offsetTop }
      const a = avant.current?.get(id)
      if (a && (a.x !== e.x || a.y !== e.y)) {
        el.animate([{ transform: `translate(${a.x - e.x}px, ${a.y - e.y}px)` }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      }
      if (a && a.etat !== e.etat) changees.push(id)
      apres.set(id, e)
    })
    avant.current = apres
    if (changees.length) {
      setFlash(changees)
      clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash([]), 1600)
    }
  }, [cle])

  // « Retard » pulse une seule fois, à l'ouverture de l'appli
  const [pulse] = useState(() => !dejaPulse && (dejaPulse = true))

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
        <div className="counts" role="group" aria-label="Filtrer les voitures">
          {pastille('ok', <><Num n={vs.length - nOut - nOff} /> dispo</>)}
          {pastille('out', <><Num n={nOut} /> prêtée{nOut > 1 ? 's' : ''}</>)}
          {nLate > 0 && pastille('late', <><Num n={nLate} /> en retard</>)}
          {nOff > 0 && pastille('off', <><Num n={nOff} /> indispo</>)}
        </div>
        {attente > 0 ? (
          <div className="offline">
            Pas de réseau : {attente} enregistrement{attente > 1 ? 's' : ''} en attente, envoi dès que le réseau revient.
          </div>
        ) : (
          offline && <div className="offline">Pas de connexion : la liste n'est peut-être pas à jour.</div>
        )}
      </header>
      <div ref={gridRef} className={'grid' + (first ? ' first' : '') + (pulse ? ' pulse' : '')}>
        {vus.map((v) => {
          const p = actifs.get(v.id)
          const fl = flash.includes(v.id)
          if (p) return <Out key={v.id} v={v} p={p} flash={fl} onClick={() => onVoir(p)} />
          if (estIndispo(v)) return <Indispo key={v.id} v={v} flash={fl} onClick={() => onIndispo(v)} />
          return <Dispo key={v.id} v={v} flash={fl} onClick={() => onPreter(v)} />
        })}
        {/* Ajouter une voiture se fait dans « Le parc » ; ici seulement tant que le parc est vide */}
        {vs.length > 0 && vus.length === 0 && (
          <button type="button" className="vide" onClick={() => setFiltre(null)}>
            Aucune voiture {f === 'ok' ? 'dispo' : f === 'out' ? 'prêtée' : f === 'off' ? 'indisponible' : 'en retard'}. Toucher pour tout voir.
          </button>
        )}
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

function Dispo({ v, flash, onClick }: { v: Vehicule; flash: boolean; onClick: () => void }) {
  return (
    <button className={'tile t-ok' + (flash ? ' flash' : '')} data-id={v.id} data-etat="ok" onClick={onClick} aria-label={`${v.nom}, dispo. Toucher pour prêter`}>
      <span className="top">
        <span className="ico">
          <Logo nom={v.nom} />
          {flash && <Done />}
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

// Version courte pour tenir sur une ligne de la carte
function depuisCourt(iso: string | null | undefined) {
  if (!iso) return ''
  const n = days(iso, Date.now())
  return n <= 0 ? "Aujourd'hui" : n === 1 ? 'Depuis hier' : `Depuis ${n} j`
}

function Indispo({ v, flash, onClick }: { v: Vehicule; flash: boolean; onClick: () => void }) {
  return (
    <button className={'tile t-off' + (flash ? ' flash' : '')} data-id={v.id} data-etat="off" onClick={onClick} aria-label={`${v.nom}, indisponible. Toucher pour la remettre disponible`}>
      <span className="top">
        <span className="ico">
          <Logo nom={v.nom} />
          {flash && <Done />}
        </span>
        <span className="st">Indispo</span>
      </span>
      <span className="nm">{v.nom}</span>
      <Plate immat={v.immat} />
      <span className="foot">
        <span className="who">
          <Wrench />
          <span className="une-ligne">{v.indispo || 'Indisponible'}</span>
        </span>
        <span className="since">
          <Clock />
          {depuisCourt(v.indispo_le)}
        </span>
      </span>
    </button>
  )
}

function Out({ v, p, flash, onClick }: { v: Vehicule; p: Pret; flash: boolean; onClick: () => void }) {
  const late = isLate(p)
  const n = days(p.depart, Date.now())
  const since = late ? 'Prévue le ' + fmtS(p.retour_prevu!) : n <= 0 ? "Depuis aujourd'hui" : n === 1 ? 'Depuis hier' : `Depuis ${n} jours`
  return (
    <button
      className={'tile ' + (late ? 't-late' : 't-out') + (flash ? ' flash' : '')}
      data-id={v.id}
      data-etat={late ? 'late' : 'out'}
      onClick={onClick}
      aria-label={`${v.nom}, ${late ? 'en retard' : 'prêtée'} à ${p.client}`}
    >
      <span className="top">
        <span className="ico">
          <Logo nom={v.nom} />
          {flash && <Done />}
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

// Coche posée un instant sur le logo quand la voiture change d'état
const Done = () => (
  <span className="coche">
    <Check />
  </span>
)

// Chiffre d'un compteur : il bascule quand il change
const Num = ({ n }: { n: number }) => (
  <span key={n} className="num">
    {n}
  </span>
)

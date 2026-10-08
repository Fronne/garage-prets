import { useLayoutEffect, useRef, useState } from 'react'
import type { Pret, SyncData, Vehicule } from '../shared/types'
import { Check, Clock, Home, Plate, Plus, User, Warn } from './icons'
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

let dejaPulse = false

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
  const etat = (v: Vehicule) => ['late', 'out', 'ok'][rank(v)]

  // Voiture prêtée ou rendue : sa carte glisse vers sa nouvelle place et affiche une coche un instant
  const gridRef = useRef<HTMLDivElement>(null)
  const avant = useRef<Map<string, { etat: string; x: number; y: number }> | null>(null)
  const [flash, setFlash] = useState<string[]>([])
  const flashTimer = useRef(0)
  const cle = vs.map((v) => v.id + etat(v)).join()
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
        <div className="counts">
          <span className="count c-ok">
            <span>
              <Num n={vs.length - nOut} /> dispo
            </span>
          </span>
          <span className="count c-out">
            <span>
              <Num n={nOut} /> prêtée{nOut > 1 ? 's' : ''}
            </span>
          </span>
          {nLate > 0 && (
            <span className="count c-late">
              <span>
                <Num n={nLate} /> en retard
              </span>
            </span>
          )}
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
        {vs.map((v) => {
          const p = actifs.get(v.id)
          const fl = flash.includes(v.id)
          return p ? <Out key={v.id} v={v} p={p} flash={fl} onClick={() => onVoir(p)} /> : <Dispo key={v.id} v={v} flash={fl} onClick={() => onPreter(v)} />
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

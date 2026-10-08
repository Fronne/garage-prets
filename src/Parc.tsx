import type { Pret, SyncData, Vehicule } from '../shared/types'
import { Avatar } from './Board'
import { Chevron, Plate, Plus } from './icons'
import { Logo } from './Logo'
import { isLate } from './util'

type Props = { data: SyncData; onMoi: () => void; onAjouter: () => void; onModifier: (v: Vehicule) => void }

// Toutes les voitures du garage : on y ajoute, renomme ou retire une voiture (rare, donc hors de l'accueil)
export function Parc({ data, onMoi, onAjouter, onModifier }: Props) {
  const actifs = new Map<string, Pret>(data.prets.filter((p) => !p.retour).map((p) => [p.vehicule_id, p]))
  const vs = data.vehicules.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

  return (
    <main className="wrap">
      <header>
        <div className="hd">
          <div className="hd-t">
            <span className="eyebrow">
              {vs.length} voiture{vs.length > 1 ? 's' : ''} de prêt
            </span>
            <h1>Le parc</h1>
          </div>
          <Avatar moi={data.moi} onClick={onMoi} />
        </div>
      </header>
      <button className="cta" onClick={onAjouter}>
        <Plus />
        Ajouter une voiture
      </button>
      {vs.length > 0 && (
        <ul className="parc">
          {vs.map((v) => {
            const p = actifs.get(v.id)
            const late = p && isLate(p)
            return (
              <li key={v.id}>
                <button onClick={() => onModifier(v)} aria-label={`Modifier ${v.nom}`}>
                  <span className={'ico ' + (p ? (late ? 't-late' : 't-out') : 't-ok')}>
                    <Logo nom={v.nom} />
                  </span>
                  <span className="pc-main">
                    <span className="pc-nm">{v.nom}</span>
                    <span className="pc-sub">
                      <Plate immat={v.immat} />
                      <span>{p ? (late ? 'En retard · ' : 'Chez ') + p.client : 'Au garage'}</span>
                    </span>
                  </span>
                  <Chevron />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

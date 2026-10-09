import { List, User, Users } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { useState } from 'react'
import { appliquerStyle, lireStyle, type Style } from './style'

// Qui est connecté sur ce téléphone, l'accès au parc (rarement utile, donc pas dans la barre du bas) et le bouton pour laisser la place à quelqu'un d'autre
export function MoiSheet({ moi, onClose, onChanger, onParc, onEquipe }: { moi: string; onClose: () => void; onChanger: () => void; onParc?: () => void; onEquipe: () => void }) {
  const [style, setStyle] = useState(lireStyle)
  const choisir = (s: Style) => {
    appliquerStyle(s)
    setStyle(s)
  }
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <SheetHead title="Sur ce téléphone" />
          <div className="moi">
            <span className="moi-av" aria-hidden="true">
              {moi.trim().charAt(0).toUpperCase()}
            </span>
            <span className="moi-n">{moi}</span>
            <span className="auto">Tes prêts sont enregistrés à ton nom.</span>
          </div>
          <div className="styles" role="group" aria-label="Style de l'appli">
            <span>Style de l'appli</span>
            <div className="chips">
              {(
                [
                  ['classique', 'Classique'],
                  ['atelier', 'Atelier'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className="chip" aria-pressed={style === id} onClick={() => choisir(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {onParc && (
            <button
              className="cta alt"
              onClick={() => {
                onParc()
                close()
              }}
            >
              <List />
              Gérer le parc
            </button>
          )}
          <button className="cta alt" onClick={onEquipe}>
            <Users />
            L'équipe
          </button>
          <button className="cta alt" onClick={onChanger}>
            <User />
            Changer de personne
          </button>
        </>
      )}
    </Sheet>
  )
}

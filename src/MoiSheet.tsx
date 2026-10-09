import { List, User, Users } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { useState } from 'react'
import { appliquerTheme, lireTheme, type Theme } from './theme'

// Qui est connecté sur ce téléphone, l'accès au parc (rarement utile, donc pas dans la barre du bas) et le bouton pour laisser la place à quelqu'un d'autre
export function MoiSheet({ moi, onClose, onChanger, onParc, onEquipe }: { moi: string; onClose: () => void; onChanger: () => void; onParc?: () => void; onEquipe: () => void }) {
  const [theme, setTheme] = useState(lireTheme)
  const choisir = (t: Theme) => {
    appliquerTheme(t)
    setTheme(t)
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
          <div className="themes" role="group" aria-label="Affichage">
            <span>Affichage</span>
            <div className="chips">
              {(
                [
                  ['auto', 'Auto'],
                  ['clair', 'Clair'],
                  ['sombre', 'Sombre'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className="chip" aria-pressed={theme === id} onClick={() => choisir(id)}>
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

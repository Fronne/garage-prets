import { User } from './icons'
import { Sheet, SheetHead } from './Sheet'

// Qui est connecté sur ce téléphone, et le bouton pour laisser la place à quelqu'un d'autre
export function MoiSheet({ moi, onClose, onChanger }: { moi: string; onClose: () => void; onChanger: () => void }) {
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
          <button className="cta alt" onClick={onChanger}>
            <User />
            Changer de personne
          </button>
        </>
      )}
    </Sheet>
  )
}

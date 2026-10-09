import { useEffect, useState } from 'react'
import { api, errorText } from './api'
import { Sheet, SheetHead } from './Sheet'

const meme = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Les prénoms proposés sur « Qui es-tu ? » : on retire celui créé par erreur (touche deux fois pour confirmer)
export function EquipeSheet({ moi, onClose }: { moi: string; onClose: () => void }) {
  const [equipe, setEquipe] = useState<string[] | null>(null)
  const [sure, setSure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api<{ equipe: string[] }>('/equipe')
      .then((r) => setEquipe(r.equipe))
      .catch((e) => setErr(errorText(e)))
  }, [])

  async function retirer(n: string) {
    if (sure !== n) return setSure(n)
    setBusy(true)
    setErr('')
    try {
      setEquipe((await api<{ equipe: string[] }>('/equipe/' + encodeURIComponent(n), 'DELETE')).equipe)
      setSure(null)
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      {() => (
        <>
          <SheetHead title="L'équipe" />
          <p className="auto">Les prénoms proposés sur « Qui es-tu ? ». Retirer un prénom ne touche pas aux prêts déjà faits.</p>
          {equipe === null && !err && <p className="auto">Chargement…</p>}
          {equipe && equipe.length === 0 && <p className="auto">Personne pour l'instant.</p>}
          {equipe && equipe.length > 0 && (
            <ul className="equipe">
              {equipe.map((n) => (
                <li key={n}>
                  <span className="equipe-n">
                    {n}
                    {meme(n, moi) && <span className="auto"> · toi</span>}
                  </span>
                  {!meme(n, moi) && (
                    <button className="link danger" disabled={busy} onClick={() => retirer(n)}>
                      {sure === n ? 'Touche encore pour retirer' : 'Retirer'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="err" role="alert">
            {err}
          </p>
        </>
      )}
    </Sheet>
  )
}

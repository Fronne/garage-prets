import { useState } from 'react'
import { api, errorText, setToken } from './api'
import { Car } from './icons'

const NAME_KEY = 'garage.prenom'

// Une seule fois par téléphone : le code du garage et le prénom (affiché dans « Prêtée par »)
export function Login({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('')
  const [prenom, setPrenom] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="login">
      <div className="logo" aria-hidden="true">
        <Car />
      </div>
      <div>
        <h1>Voitures de prêt</h1>
        <p>Pour savoir qui a quelle voiture. À faire une seule fois sur ce téléphone.</p>
      </div>
      <form
        className="f"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault()
          if (!code.trim() || !prenom.trim()) return setErr('Il faut le code du garage et ton prénom.')
          setBusy(true)
          setErr('')
          try {
            const r = await api<{ token: string; prenom: string }>('/login', 'POST', { code, prenom })
            setToken(r.token)
            localStorage.setItem(NAME_KEY, r.prenom)
            onDone()
          } catch (e) {
            setErr(errorText(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="sub" htmlFor="prenom">
          Ton prénom
        </label>
        <input className="inp" id="prenom" autoComplete="given-name" autoCapitalize="words" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <label className="sub" htmlFor="code">
          Code du garage
        </label>
        <input className="inp" id="code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} aria-describedby="lerr" />
        <div className="err" id="lerr" role="alert">
          {err}
        </div>
        <button className="cta" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Entrer'}
        </button>
      </form>
    </main>
  )
}

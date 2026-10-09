import { useEffect, useState } from 'react'
import { api, ApiError, errorText, setToken } from './api'
import { Car } from './icons'

const NAME_KEY = 'garage.prenom'

// L'APK du garage ajoute sa clé à l'identité du navigateur (capacitor.config.ts, appendUserAgent)
const appKey = navigator.userAgent.match(/GaragePrets\/([\w-]+)/)?.[1]

export function Login({ onDone }: { onDone: () => void }) {
  const [codeMode, setCodeMode] = useState(!appKey)
  return codeMode ? <CodeLogin onDone={onDone} /> : <AppLogin cle={appKey!} onDone={onDone} onFail={() => setCodeMode(true)} />
}

function connected(r: { token: string; prenom: string }, onDone: () => void) {
  setToken(r.token)
  localStorage.setItem(NAME_KEY, r.prenom)
  onDone()
}

// Dans l'appli du garage : rien à taper, on touche son prénom
function AppLogin({ cle, onDone, onFail }: { cle: string; onDone: () => void; onFail: () => void }) {
  const [equipe, setEquipe] = useState<string[] | null>(null)
  const [autre, setAutre] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ equipe: string[] }>('/login-appli', 'POST', { cle })
      .then((r) => {
        setEquipe(r.equipe)
        setAutre(r.equipe.length === 0)
      })
      .catch((e) => (e instanceof ApiError && e.status === 401 ? onFail() : setErr(errorText(e))))
  }, [cle, onFail])

  async function choisir(nom: string) {
    if (!nom.trim()) return setErr('Il faut ton prénom.')
    setBusy(true)
    setErr('')
    try {
      connected(await api('/login-appli', 'POST', { cle, prenom: nom }), onDone)
    } catch (e) {
      setErr(errorText(e))
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="logo" aria-hidden="true">
        <Car />
      </div>
      <div>
        <h1>Qui es-tu ?</h1>
        <p>Ton prénom s'affichera sur les prêts que tu fais. Une seule fois sur ce téléphone.</p>
      </div>
      {equipe === null && !err && <p className="auto">Chargement…</p>}
      {equipe && equipe.length > 0 && (
        <div className="chips">
          {equipe.map((n) => (
            <button key={n} className="chip big" disabled={busy} onClick={() => choisir(n)}>
              {n}
            </button>
          ))}
        </div>
      )}
      {equipe && !autre && (
        <button className="link" onClick={() => setAutre(true)}>
          Je ne suis pas dans la liste
        </button>
      )}
      {autre && (
        <form
          className="f"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            choisir(prenom)
          }}
        >
          <label className="sub" htmlFor="prenom">
            Ton prénom
          </label>
          <input className="inp" id="prenom" autoComplete="off" autoCapitalize="words" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          <button className="cta" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Entrer'}
          </button>
        </form>
      )}
      <div className="err" role="alert">
        {err}
      </div>
    </main>
  )
}

// Dans un navigateur : le code du garage et le prénom, une seule fois par téléphone
function CodeLogin({ onDone }: { onDone: () => void }) {
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
        <h1>Canal Mhirsi Service</h1>
        <p>Voitures de prêt : pour savoir qui a quelle voiture. À faire une seule fois sur ce téléphone.</p>
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
            connected(await api('/login', 'POST', { code, prenom }), onDone)
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

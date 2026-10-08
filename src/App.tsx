import { useCallback, useEffect, useRef, useState } from 'react'
import type { Pret, SyncData, Vehicule } from '../shared/types'
import { api, ApiError, errorText, getToken, setToken } from './api'
import { Board } from './Board'
import { Login } from './Login'
import { emptyDraft, PretSheet, type Draft } from './PretSheet'
import { buzz } from './util'
import { VehiculeSheet } from './VehiculeSheet'
import { VoirSheet } from './VoirSheet'

const CACHE_KEY = 'garage.cache'
const POLL_MS = 15_000

type SheetState =
  | { kind: 'preter'; vid: string; pid?: string }
  | { kind: 'voir'; pid: string }
  | { kind: 'vehicule'; vid?: string }
  | null

type Toast = { msg: string; undo?: () => void; error?: boolean } | null

function readCache(): SyncData | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
  } catch {
    return null
  }
}

export default function App() {
  const [logged, setLogged] = useState(!!getToken())
  if (!logged) return <Login onDone={() => setLogged(true)} />
  return (
    <Garage
      onLogout={() => {
        setToken(null)
        localStorage.removeItem(CACHE_KEY)
        setLogged(false)
      }}
    />
  )
}

function Garage({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<SyncData | null>(readCache)
  const [offline, setOffline] = useState(false)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [first, setFirst] = useState(true)
  const drafts = useRef<Record<string, Draft>>({})
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  // Pendant un enregistrement, une synchronisation en cours ne doit pas écraser ce qu'on vient de faire
  const pending = useRef(0)

  const sync = useCallback(async () => {
    if (pending.current) return
    try {
      const d = await api<SyncData>('/sync')
      if (pending.current) return
      setData(d)
      setOffline(false)
      localStorage.setItem(CACHE_KEY, JSON.stringify(d))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return onLogout()
      setOffline(true)
    }
  }, [onLogout])

  useEffect(() => {
    sync()
    const t = setInterval(() => document.visibilityState === 'visible' && sync(), POLL_MS)
    const onVis = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', sync)
    const f = setTimeout(() => setFirst(false), 600)
    return () => {
      clearInterval(t)
      clearTimeout(f)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', sync)
    }
  }, [sync])

  const showToast = (t: Toast) => {
    clearTimeout(toastTimer.current)
    setToast(t)
    if (t) toastTimer.current = setTimeout(() => setToast(null), t.undo ? 5000 : 3500)
  }

  // Change l'écran tout de suite, puis enregistre ; en cas d'échec on recharge l'état du serveur
  async function change(local: (d: SyncData) => SyncData, remote: () => Promise<unknown>, done?: Toast) {
    setData((d) => (d ? local(d) : d))
    if (done) showToast(done)
    pending.current++
    try {
      await remote()
    } catch (e) {
      showToast({ msg: errorText(e), error: true })
    } finally {
      pending.current--
      sync()
    }
  }

  if (!data) {
    return (
      <main className="wrap">
        <h1>Qui a quoi ?</h1>
        <p className="auto">{offline ? 'Pas de connexion internet.' : 'Chargement…'}</p>
      </main>
    )
  }

  const veh = (id: string) => data.vehicules.find((v) => v.id === id)
  const pret = (id: string) => data.prets.find((p) => p.id === id)
  const recents = [...new Map(data.prets.map((p) => [p.client.toLowerCase(), p.client])).values()].slice(0, 5)
  const setPrets = (fn: (ps: Pret[]) => Pret[]) => (d: SyncData) => ({ ...d, prets: fn(d.prets) })

  function preter(v: Vehicule, d: Draft) {
    const p: Pret = {
      id: crypto.randomUUID(),
      vehicule_id: v.id,
      client: d.client.trim(),
      tel: d.tel.trim() || null,
      note: d.note.trim() || null,
      depart: new Date().toISOString(),
      retour_prevu: d.retour || null,
      retour: null,
      photo_depart: d.photo,
      photo_retour: null,
      par: data!.moi,
    }
    delete drafts.current[v.id]
    buzz()
    change(setPrets((ps) => [p, ...ps]), () => api('/prets', 'POST', p), {
      msg: `${v.nom} prêtée à ${p.client}`,
      undo: () => change(setPrets((ps) => ps.filter((x) => x.id !== p.id)), () => api('/prets/' + p.id, 'DELETE')),
    })
  }

  function modifier(p: Pret, d: Draft) {
    const patch = { client: d.client.trim(), tel: d.tel.trim() || null, note: d.note.trim() || null, retour_prevu: d.retour || null }
    change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...patch } : x))), () => api('/prets/' + p.id, 'PUT', patch), { msg: 'Prêt modifié' })
  }

  function rendue(p: Pret, v: Vehicule) {
    const at = new Date().toISOString()
    buzz()
    change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, retour: at } : x))), () => api(`/prets/${p.id}/retour`, 'POST', {}), {
      msg: `${v.nom} rendue`,
      undo: () =>
        change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, retour: null } : x))), () => api(`/prets/${p.id}/annuler-retour`, 'POST')),
    })
  }

  function saveVehicule(v: Vehicule | undefined, nom: string, immat: string) {
    const im = immat ? immat.toUpperCase() : null
    if (v) {
      change((d) => ({ ...d, vehicules: d.vehicules.map((x) => (x.id === v.id ? { ...x, nom, immat: im } : x)) }), () =>
        api('/vehicules/' + v.id, 'PUT', { nom, immat: im }),
      )
    } else {
      const nv = { id: crypto.randomUUID(), nom, immat: im }
      change((d) => ({ ...d, vehicules: [...d.vehicules, nv] }), () => api('/vehicules', 'POST', nv), { msg: nom + ' ajoutée' })
    }
  }

  function retirer(v: Vehicule) {
    change((d) => ({ ...d, vehicules: d.vehicules.filter((x) => x.id !== v.id) }), () => api('/vehicules/' + v.id, 'DELETE'), {
      msg: v.nom + ' retirée du parc',
    })
  }

  const close = () => setSheet(null)
  let sheetEl = null
  if (sheet?.kind === 'preter') {
    const v = veh(sheet.vid)
    const p = sheet.pid ? pret(sheet.pid) : undefined
    if (v) {
      const draft = p ? emptyDraft(p) : (drafts.current[v.id] ??= emptyDraft())
      sheetEl = (
        <PretSheet
          key={sheet.vid + (sheet.pid ?? '')}
          v={v}
          pret={p}
          draft={draft}
          recents={recents}
          onClose={close}
          onSubmit={(d) => (p ? modifier(p, d) : preter(v, d))}
          onEditVehicule={() => setSheet({ kind: 'vehicule', vid: v.id })}
        />
      )
    }
  } else if (sheet?.kind === 'voir') {
    const p = pret(sheet.pid)
    const v = p && veh(p.vehicule_id)
    if (p && v) {
      const hist = data.prets.filter((x) => x.vehicule_id === v.id && x.retour).sort((a, b) => b.depart.localeCompare(a.depart))
      sheetEl = (
        <VoirSheet
          key={p.id}
          v={v}
          p={p}
          hist={hist}
          onClose={close}
          onRendue={() => rendue(p, v)}
          onModifier={() => setSheet({ kind: 'preter', vid: v.id, pid: p.id })}
        />
      )
    }
  } else if (sheet?.kind === 'vehicule') {
    const v = sheet.vid ? veh(sheet.vid) : undefined
    sheetEl = (
      <VehiculeSheet
        key={sheet.vid ?? 'new'}
        v={v}
        onClose={close}
        onSave={(nom, immat) => saveVehicule(v, nom, immat)}
        onRetirer={v && (() => retirer(v))}
      />
    )
  }

  return (
    <>
      <Board
        data={data}
        offline={offline}
        first={first}
        onPreter={(v) => setSheet({ kind: 'preter', vid: v.id })}
        onVoir={(p) => setSheet({ kind: 'voir', pid: p.id })}
        onAjouter={() => setSheet({ kind: 'vehicule' })}
        onMoi={() => {
          if (confirm(`Connecté en tant que ${data.moi}. Se déconnecter de ce téléphone ?`)) onLogout()
        }}
      />
      {sheetEl}
      <div role="status" aria-live="polite">
        {toast && (
          <div className={'toast' + (toast.error ? ' err-t' : '')}>
            <span>{toast.msg}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo!()
                  showToast(null)
                }}
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

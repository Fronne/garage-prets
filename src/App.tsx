import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Pret, SyncData, Vehicule } from '../shared/types'
import { api, ApiError, errorText, getToken, setToken } from './api'
import { Board } from './Board'
import { Login } from './Login'
import { Parc } from './Parc'
import { emptyDraft, PretSheet, type Draft } from './PretSheet'
import { buzz } from './util'
import { VehiculeSheet } from './VehiculeSheet'
import { VoirSheet } from './VoirSheet'
import { MoiSheet } from './MoiSheet'
import { enAttente, envoyer, vider } from './envois'
import { Car, Clock, List } from './icons'
import { Historique } from './Historique'

const CACHE_KEY = 'garage.cache'
const POLL_MS = 15_000

type SheetState =
  | { kind: 'preter'; vid: string; pid?: string }
  | { kind: 'voir'; pid: string }
  | { kind: 'vehicule'; vid?: string }
  | { kind: 'moi' }
  | null

type Page = 'prets' | 'parc' | 'histo'
const PAGES: Page[] = ['prets', 'parc', 'histo']

type Toast = { msg: string; undo?: () => void; error?: boolean; id?: number } | null

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
  // « Le parc » et « Historique » sont des pages à part : le bouton retour du téléphone ramène à l'accueil
  const [page, setPageRaw] = useState<Page>('prets')
  // Sens de l'animation : la nouvelle page arrive par la droite si elle est après dans la barre du bas
  const [sens, setSens] = useState<'g' | 'd' | ''>('')
  const pageRef = useRef(page)
  // Page qui s'en va pendant la transition, figée à l'endroit où on l'a quittée
  const [sortante, setSortante] = useState<{ page: Page; y: number } | null>(null)
  const sortieTimer = useRef(0)
  const setPage = (p: Page) => {
    if (p === pageRef.current) return
    setSens(PAGES.indexOf(p) > PAGES.indexOf(pageRef.current) ? 'd' : 'g')
    setSortante({ page: pageRef.current, y: window.scrollY })
    clearTimeout(sortieTimer.current)
    sortieTimer.current = window.setTimeout(() => setSortante(null), 300)
    pageRef.current = p
    setPageRaw(p)
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    // Chaque onglet s'ouvre en haut, même avec le geste retour
    history.scrollRestoration = 'manual'
    const onPop = () => {
      // Retour du téléphone avec une fenêtre ouverte : on remet l'étape et la fenêtre décide (fermer, ou demander s'il faut enregistrer)
      if (sheetOpen.current && !history.state?.sheet) {
        history.pushState({ ...history.state, sheet: true }, '')
        return window.dispatchEvent(new Event('sheet-back'))
      }
      setPage(history.state?.page ?? 'prets')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Une fenêtre ouverte ajoute une étape à l'historique du téléphone : le geste retour la ferme au lieu de quitter l'appli
  const sheetOpen = useRef(false)
  sheetOpen.current = sheet !== null
  useEffect(() => {
    if (sheet === null) return
    history.pushState({ ...history.state, sheet: true }, '')
    return () => {
      if (history.state?.sheet) history.back()
    }
  }, [sheet === null])
  const drafts = useRef<Record<string, Draft>>({})
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  // Pendant un enregistrement, une synchronisation en cours ne doit pas écraser ce qu'on vient de faire
  const pending = useRef(0)

  const [attente, setAttente] = useState(enAttente)

  const sync = useCallback(async () => {
    if (pending.current) return
    try {
      // D'abord ce qui attend sur le téléphone ; tant qu'il en reste, on garde l'écran tel quel
      const refus = await vider()
      if (refus.length) showToastRef.current({ msg: refus[0], error: true })
      setAttente(enAttente())
      if (enAttente()) return setOffline(true)
      const d = await api<SyncData>('/sync')
      if (pending.current) return
      setData(d)
      setOffline(false)
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
    // Nouvel id : chaque message rejoue son entrée
    setToast(t && { ...t, id: Date.now() })
    if (t) toastTimer.current = setTimeout(() => setToast(null), t.undo ? 5000 : 3500)
  }
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  // L'écran est gardé sur le téléphone à chaque changement : rouvert sans réseau, il montre ce qu'on vient de faire
  useEffect(() => {
    if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  }, [data])

  // Change l'écran tout de suite, puis enregistre ; en cas d'échec on recharge l'état du serveur
  // Sans réseau, l'enregistrement attend sur le téléphone et part tout seul dès que le réseau revient
  async function change(local: (d: SyncData) => SyncData, remote: () => Promise<boolean>, done?: Toast) {
    setData((d) => (d ? local(d) : d))
    if (done) showToast(done)
    pending.current++
    try {
      if (!(await remote())) {
        setAttente(enAttente())
        showToast({ ...done, msg: (done ? done.msg + '. ' : '') + 'Pas de réseau : envoi dès son retour.' })
      }
    } catch (e) {
      showToast({ msg: errorText(e), error: true })
    } finally {
      pending.current--
      sync()
    }
  }

  // Glisser le doigt à gauche ou à droite change d'onglet (pas depuis le bord de l'écran : c'est le geste retour d'Android)
  const allerRef = useRef<(id: Page) => void>(() => {})
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null
    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      const bord = t.clientX < 30 || t.clientX > window.innerWidth - 30
      // Pas dans une fenêtre ou le calendrier
      const dansFenetre = e.target instanceof Element && !!e.target.closest('.scrim, .cal-scrim')
      start = e.touches.length === 1 && !bord && !dansFenetre && !sheetOpen.current ? { x: t.clientX, y: t.clientY, t: Date.now() } : null
    }
    const up = (e: TouchEvent) => {
      const s0 = start
      start = null
      if (!s0 || sheetOpen.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s0.x
      const dy = t.clientY - s0.y
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s0.t > 700) return
      const i = PAGES.indexOf(pageRef.current) + (dx < 0 ? 1 : -1)
      if (i >= 0 && i < PAGES.length) allerRef.current(PAGES[i])
    }
    document.addEventListener('touchstart', down, { passive: true })
    document.addEventListener('touchend', up, { passive: true })
    return () => {
      document.removeEventListener('touchstart', down)
      document.removeEventListener('touchend', up)
    }
  }, [])

  // Pastille de la barre du bas : elle glisse sous l'onglet choisi
  const navRef = useRef<HTMLElement>(null)
  const [pastille, setPastille] = useState<{ x: number; y: number; anim: boolean } | null>(null)
  useLayoutEffect(() => {
    const placer = (anim: boolean) => {
      const nav = navRef.current
      const ico = nav?.querySelector('button[aria-current] svg')
      if (!nav || !ico) return
      const n = nav.getBoundingClientRect()
      const r = ico.getBoundingClientRect()
      setPastille({ x: r.left - n.left, y: r.top - n.top, anim })
    }
    placer(pastille !== null)
    const onResize = () => placer(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [page, !!data])

  if (!data) {
    return (
      <main className="wrap">
        <h1>Voitures de prêt</h1>
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
    change(setPrets((ps) => [p, ...ps]), () => envoyer('/prets', 'POST', p), {
      msg: `${v.nom} prêtée à ${p.client}`,
      undo: () => change(setPrets((ps) => ps.filter((x) => x.id !== p.id)), () => envoyer('/prets/' + p.id, 'DELETE')),
    })
  }

  function modifier(p: Pret, d: Draft) {
    const patch = { client: d.client.trim(), tel: d.tel.trim() || null, note: d.note.trim() || null, retour_prevu: d.retour || null }
    change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...patch } : x))), () => envoyer('/prets/' + p.id, 'PUT', patch), { msg: 'Prêt modifié' })
  }

  function rendue(p: Pret, v: Vehicule) {
    const at = new Date().toISOString()
    buzz()
    change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, retour: at } : x))), () => envoyer(`/prets/${p.id}/retour`, 'POST', { at }), {
      msg: `${v.nom} rendue`,
      undo: () =>
        change(setPrets((ps) => ps.map((x) => (x.id === p.id ? { ...x, retour: null } : x))), () => envoyer(`/prets/${p.id}/annuler-retour`, 'POST')),
    })
  }

  function saveVehicule(v: Vehicule | undefined, nom: string, immat: string) {
    const im = immat ? immat.toUpperCase() : null
    if (v) {
      change((d) => ({ ...d, vehicules: d.vehicules.map((x) => (x.id === v.id ? { ...x, nom, immat: im } : x)) }), () =>
        envoyer('/vehicules/' + v.id, 'PUT', { nom, immat: im }),
      )
    } else {
      const nv = { id: crypto.randomUUID(), nom, immat: im }
      change((d) => ({ ...d, vehicules: [...d.vehicules, nv] }), () => envoyer('/vehicules', 'POST', nv), { msg: nom + ' ajoutée' })
    }
  }

  function retirer(v: Vehicule) {
    change((d) => ({ ...d, vehicules: d.vehicules.filter((x) => x.id !== v.id) }), () => envoyer('/vehicules/' + v.id, 'DELETE'), {
      msg: v.nom + ' retirée du parc',
    })
  }

  allerRef.current = aller

  function aller(id: Page) {
    if (id === pageRef.current) return
    if (id === 'prets') return history.back()
    if (pageRef.current === 'prets') history.pushState({ page: id }, '')
    else history.replaceState({ page: id }, '')
    setPage(id)
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
        onRetirer={v && !data.prets.some((p) => p.vehicule_id === v.id && !p.retour) ? () => retirer(v) : undefined}
      />
    )
  } else if (sheet?.kind === 'moi') {
    sheetEl = <MoiSheet moi={data.moi} onClose={close} onChanger={onLogout} />
  }

  // Contenu d'un onglet
  const vue = (p: Page) =>
    p === 'parc' ? (
      <Parc
        data={data}
        onMoi={() => setSheet({ kind: 'moi' })}
        onAjouter={() => setSheet({ kind: 'vehicule' })}
        onModifier={(v) => setSheet({ kind: 'vehicule', vid: v.id })}
      />
    ) : p === 'histo' ? (
      <Historique moi={data.moi} onMoi={() => setSheet({ kind: 'moi' })} />
    ) : (
      <Board
        data={data}
        offline={offline}
        attente={attente}
        first={first}
        onPreter={(v) => setSheet({ kind: 'preter', vid: v.id })}
        onVoir={(pr) => setSheet({ kind: 'voir', pid: pr.id })}
        onAjouter={() => setSheet({ kind: 'vehicule' })}
        onMoi={() => setSheet({ kind: 'moi' })}
      />
    )

  return (
    <>
      <div className="pages">
        {sortante && (
          <div key={'out-' + sortante.page} className={'page out-' + sens} style={{ top: -sortante.y }} aria-hidden="true">
            {vue(sortante.page)}
          </div>
        )}
        <div key={page} className={'page' + (sens ? ' from-' + sens : '')}>
          {vue(page)}
        </div>
      </div>
      {/* Barre du bas. L'accueil reste au fond de l'historique du téléphone : retour depuis une autre page y ramène */}
      <nav className="tabs" aria-label="Pages" ref={navRef}>
        {pastille && <span className={'tab-pill' + (pastille.anim ? ' anim' : '')} style={{ transform: `translate(${pastille.x}px, ${pastille.y}px)` }} />}
        {(
          [
            ['prets', <Car key="i" />, 'Prêts'],
            ['parc', <List key="i" />, 'Parc'],
            ['histo', <Clock key="i" />, 'Historique'],
          ] as const
        ).map(([id, icon, label]) => (
          <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => aller(id)}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
      {sheetEl}
      <div role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={'toast' + (toast.error ? ' err-t' : '')}>
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

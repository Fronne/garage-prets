import { useRef, useState } from 'react'
import type { Pret, Vehicule } from '../shared/types'
import { api, errorText } from './api'
import { Cal, Cam, Check, Pen, Plate } from './icons'
import { Sheet, SheetHead } from './Sheet'
import { dayStr, fmtS, shrinkPhoto } from './util'

export type Draft = { client: string; retour: string; tel: string; note: string; photo: string | null; open: 'retour' | 'plus' | null }

export const emptyDraft = (p?: Pret): Draft => ({
  client: p?.client ?? '',
  retour: p?.retour_prevu ?? '',
  tel: p?.tel ?? '',
  note: p?.note ?? '',
  photo: p?.photo_depart ?? null,
  open: null,
})

const RETOURS: [string, number][] = [
  ['Ce soir', 0],
  ['Demain', 1],
  ['Dans 3 j', 3],
  ['1 semaine', 7],
]

type Props = {
  v: Vehicule
  /** Prêt existant à modifier ; absent pour un nouveau prêt */
  pret?: Pret
  draft: Draft
  recents: string[]
  onClose: () => void
  onSubmit: (d: Draft) => void
  onEditVehicule: () => void
}

// Prêter une voiture : seul le nom du client est obligatoire, le reste se déplie si besoin
export function PretSheet({ v, pret, draft, recents, onClose, onSubmit, onEditVehicule }: Props) {
  const [d, setD] = useState(draft)
  const [err, setErr] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const clientRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Le brouillon survit à la fermeture de la fenêtre : le nom tapé revient à la réouverture
  const set = (patch: Partial<Draft>) =>
    setD((old) => {
      const next = { ...old, ...patch }
      Object.assign(draft, next)
      return next
    })
  const toggle = (open: Draft['open']) => set({ open: d.open === open ? null : open })

  async function addPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setErr('')
    try {
      const data = await shrinkPhoto(file)
      const { id } = await api<{ id: string }>('/photos', 'POST', { id: crypto.randomUUID(), data })
      set({ photo: id })
    } catch (e) {
      setErr(errorText(e))
    } finally {
      setPhotoBusy(false)
    }
  }

  function save() {
    if (!d.client.trim()) {
      setErr('Il faut juste le nom du client.')
      clientRef.current?.focus()
      return false
    }
    onSubmit(d)
    return true
  }

  // Modifié par rapport au prêt d'origine (ou, pour un nouveau prêt, quelque chose de rempli)
  const base = emptyDraft(pret)
  const dirty = (['client', 'retour', 'tel', 'note', 'photo'] as const).some((k) => (d[k] ?? '') !== (base[k] ?? ''))

  const title = pret ? 'Modifier le prêt' : 'Prêter la ' + v.nom
  return (
    <Sheet
      onClose={onClose}
      ask={{ dirty, save, saveLabel: pret ? 'Enregistrer' : 'Prêter la ' + v.nom, discard: pret ? undefined : () => Object.assign(draft, emptyDraft()) }}
    >
      {(close) => (
        <>
          <SheetHead title={title}>
            {pret && <span className="sub">{v.nom}</span>}
          </SheetHead>
          <Plate immat={v.immat} />
          <form
            className="f"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (save()) close()
            }}
          >
            <label className="q" htmlFor="client">
              À qui tu la prêtes ?
            </label>
            <input
              ref={clientRef}
              className="inp"
              id="client"
              autoComplete="off"
              autoCapitalize="words"
              placeholder="Nom du client"
              value={d.client}
              onChange={(e) => set({ client: e.target.value })}
              aria-describedby="err"
            />
            <div className="err" id="err" role="alert">
              {err}
            </div>
            {!pret && recents.length > 0 && (
              <>
                <div className="sub">Clients récents</div>
                <div className="chips">
                  {recents.map((c) => (
                    <button type="button" key={c} className="chip" aria-pressed={d.client === c} onClick={() => set({ client: c })}>
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {!pret && <div className="auto">Départ noté automatiquement : maintenant.</div>}
            <div className="opts" role="group" aria-label="Facultatif">
              <button type="button" className={'opt' + (d.retour ? ' done' : '')} aria-expanded={d.open === 'retour'} onClick={() => toggle('retour')}>
                <Cal />
                {d.retour ? fmtS(d.retour) : 'Retour'}
              </button>
              {!pret && (
                <button type="button" className={'opt' + (d.photo ? ' done' : '')} disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                  <Cam />
                  {photoBusy ? 'Envoi…' : d.photo ? 'Photo prise' : 'Compteur'}
                </button>
              )}
              <button type="button" className={'opt' + (d.tel || d.note ? ' done' : '')} aria-expanded={d.open === 'plus'} onClick={() => toggle('plus')}>
                <Pen />
                Note
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhoto(e.target.files?.[0])} />
            {d.open === 'retour' && (
              <div className="chips">
                {RETOURS.map(([label, n]) => {
                  const day = dayStr(n)
                  return (
                    <button type="button" key={label} className="chip" aria-pressed={d.retour === day} onClick={() => set({ retour: d.retour === day ? '' : day })}>
                      {label}
                    </button>
                  )
                })}
                <input
                  className="inp sm"
                  type="date"
                  aria-label="Autre date de retour"
                  min={dayStr(0)}
                  value={d.retour}
                  onChange={(e) => set({ retour: e.target.value })}
                />
              </div>
            )}
            {d.open === 'plus' && (
              <>
                <label className="sub" htmlFor="tel">
                  Téléphone
                </label>
                <input className="inp sm" id="tel" type="tel" inputMode="tel" value={d.tel} onChange={(e) => set({ tel: e.target.value })} />
                <label className="sub" htmlFor="note">
                  Note
                </label>
                <input
                  className="inp sm"
                  id="note"
                  placeholder="Sa voiture en atelier, rayure déjà là…"
                  value={d.note}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </>
            )}
            <button className="cta" type="submit" disabled={photoBusy}>
              <Check />
              {pret ? 'Enregistrer' : 'Prêter la ' + v.nom}
            </button>
            {!pret && (
              <button type="button" className="link" onClick={onEditVehicule}>
                Modifier ou retirer cette voiture
              </button>
            )}
          </form>
        </>
      )}
    </Sheet>
  )
}

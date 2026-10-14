import { useEffect, useRef, useState } from 'react'
import type { JeuPhotos, Pret, Vehicule } from '../shared/types'
import { AppIcon, Cal, Cam, Check, IdCard, Pen, Phone, Plate } from './icons'
import { DatePicker } from './DatePicker'
import { ETAT, GrillePhotos, PERMIS, nbPhotos } from './Photos'
import { Sheet, SheetHead, fermerClavier } from './Sheet'
import { dayStr, fmtS } from './util'

export type Draft = {
  client: string
  retour: string
  tel: string
  note: string
  photo: string | null
  /** Permis, jauge et état de la voiture au départ */
  photos: JeuPhotos
  open: 'retour' | 'tel' | 'note' | 'permis' | 'photos' | null
}

export const emptyDraft = (p?: Pret): Draft => ({
  client: p?.client ?? '',
  retour: p?.retour_prevu ?? '',
  tel: p?.tel ?? '',
  note: p?.note ?? '',
  photo: p?.photo_depart ?? null,
  photos: { ...p?.photos?.depart },
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
  const [errPhoto, setErrPhoto] = useState('')
  const clientRef = useRef<HTMLInputElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)

  // Quand une option se déplie, la fenêtre descend pour la montrer en entier (ce qui est juste au-dessus du bouton du bas)
  useEffect(() => {
    if (d.open) requestAnimationFrame(() => ctaRef.current?.previousElementSibling?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [d.open])

  // Le brouillon survit à la fermeture de la fenêtre : le nom tapé revient à la réouverture
  const set = (patch: Partial<Draft>) =>
    setD((old) => {
      const next = { ...old, ...patch }
      Object.assign(draft, next)
      return next
    })
  const toggle = (open: Draft['open']) => set({ open: d.open === open ? null : open })

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
  const dirty =
    (['client', 'retour', 'tel', 'note', 'photo'] as const).some((k) => (d[k] ?? '') !== (base[k] ?? '')) ||
    JSON.stringify(d.photos) !== JSON.stringify(base.photos)
  const nPermis = nbPhotos(d.photos, PERMIS)
  const nEtat = nbPhotos(d.photos, ETAT)

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
          {/* Gérer la voiture, c'est un réglage : en haut près de la plaque ; en bas, seulement « Prêter » */}
          <div className="plaque-ligne">
            <Plate immat={v.immat} />
            {!pret && (
              <button type="button" className="pill" onClick={onEditVehicule}>
                <AppIcon className="i app" />
                Gérer la voiture
              </button>
            )}
          </div>
          <form
            className="f"
            noValidate
            onKeyDown={fermerClavier}
            onSubmit={(e) => {
              e.preventDefault()
              if (save()) close()
            }}
          >
            <label className="q" htmlFor="client">
              À qui tu la prêtes ?
            </label>
            <input
              enterKeyHint="done"
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
              <button type="button" className={'opt' + (d.tel ? ' done' : '')} aria-expanded={d.open === 'tel'} onClick={() => toggle('tel')}>
                <Phone sm />
                Téléphone
              </button>
              <button type="button" className={'opt' + (d.note ? ' done' : '')} aria-expanded={d.open === 'note'} onClick={() => toggle('note')}>
                <Pen />
                Note
              </button>
            </div>
            {/* Photos : le permis du client (recto, verso ou un seul des deux), la jauge et l'état de la voiture pour comparer au retour */}
            <div className="opts suite" role="group" aria-label="Photos, facultatif">
              <button type="button" className={'opt' + (nPermis ? ' done' : '')} aria-expanded={d.open === 'permis'} onClick={() => toggle('permis')}>
                <IdCard />
                {nPermis ? `Permis · ${nPermis}` : 'Permis'}
              </button>
              <button type="button" className={'opt' + (nEtat ? ' done' : '')} aria-expanded={d.open === 'photos'} onClick={() => toggle('photos')}>
                <Cam />
                {nEtat ? `Jauge et état · ${nEtat}` : 'Jauge et état'}
              </button>
            </div>
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
                <DatePicker value={d.retour} min={dayStr(0)} placeholder="Autre date de retour" onChange={(v) => set({ retour: v })} />
              </div>
            )}
            {d.open === 'tel' && (
              <>
                <label className="sub" htmlFor="tel">
                  Téléphone du client
                </label>
                <input enterKeyHint="done" className="inp sm" id="tel" type="tel" inputMode="tel" autoComplete="off" placeholder="06 12 34 56 78" value={d.tel} onChange={(e) => set({ tel: e.target.value })} />
              </>
            )}
            {d.open === 'note' && (
              <>
                <label className="sub" htmlFor="note">
                  Note
                </label>
                <input
                  enterKeyHint="done"
                  className="inp sm"
                  id="note"
                  placeholder="Exemple : sa voiture en atelier, rayure déjà là"
                  value={d.note}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </>
            )}
            {d.open === 'permis' && (
              <>
                <div className="sub">Permis du client : recto, verso, ou un seul</div>
                <GrillePhotos cles={PERMIS} jeu={d.photos} onChange={(photos) => set({ photos })} onErreur={setErrPhoto} />
              </>
            )}
            {d.open === 'photos' && (
              <>
                <div className="sub">Jauge et état de la voiture au départ</div>
                <GrillePhotos cles={ETAT} jeu={d.photos} onChange={(photos) => set({ photos })} onErreur={setErrPhoto} />
              </>
            )}
            {errPhoto && (d.open === 'permis' || d.open === 'photos') && (
              <div className="err" role="alert">
                {errPhoto}
              </div>
            )}
            <button ref={ctaRef} className="cta" type="submit">
              <Check />
              {pret ? 'Enregistrer' : 'Prêter la ' + v.nom}
            </button>
          </form>
        </>
      )}
    </Sheet>
  )
}

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { formatPlate } from './util'

const SIV = /^([A-Z]{0,2})-?(\d{0,3})-?([A-Z]{0,2})$/

// Plaque en trois cases (AB - 123 - CD) : le clavier passe en chiffres pour la case du milieu,
// et la case suivante prend la main dès que la précédente est pleine. « Ancienne plaque » : saisie libre.
export function PlateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const m = value.match(SIV)
  const [libre, setLibre] = useState(!m)
  const parts = m ? [m[1], m[2], m[3]] : ['', '', '']
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const emit = (p: string[]) => onChange(p.join('-').replace(/-+$/, ''))

  function edit(i: number, raw: string) {
    const clean = (i === 1 ? raw.replace(/\D/g, '') : raw.toUpperCase().replace(/[^A-Z]/g, '')).slice(0, i === 1 ? 3 : 2)
    const next = [...parts]
    next[i] = clean
    emit(next)
    // Case pleine : on passe à la suivante (le clavier change avec elle)
    if (clean.length === (i === 1 ? 3 : 2) && i < 2) refs[i + 1].current?.focus()
  }

  function back(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !parts[i] && i > 0) {
      e.preventDefault()
      const prev = refs[i - 1].current!
      prev.focus()
      const next = [...parts]
      next[i - 1] = next[i - 1].slice(0, -1)
      emit(next)
    }
  }

  // Coller une plaque entière la répartit dans les trois cases
  function paste(e: ClipboardEvent<HTMLInputElement>) {
    const f = formatPlate(e.clipboardData.getData('text')).match(SIV)
    if (!f) return
    e.preventDefault()
    emit([f[1], f[2], f[3]])
    refs[2].current?.focus()
  }

  if (libre) {
    return (
      <>
        <input
          className="inp sm"
          id="immat"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="123 ABC 75"
          maxLength={12}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <button type="button" className="link" onClick={() => (setLibre(false), onChange(''))}>
          Plaque au format AB-123-CD
        </button>
      </>
    )
  }

  const box = (i: number, ph: string) => (
    <input
      ref={refs[i]}
      id={i === 0 ? 'immat' : undefined}
      className={'inp sm plate-box' + (i === 1 ? ' num' : '')}
      aria-label={['Deux premières lettres', 'Trois chiffres', 'Deux dernières lettres'][i]}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      autoCapitalize="characters"
      inputMode={i === 1 ? 'numeric' : 'text'}
      enterKeyHint={i === 2 ? 'done' : 'next'}
      placeholder={ph}
      value={parts[i]}
      onChange={(e) => edit(i, e.target.value)}
      onKeyDown={(e) => back(i, e)}
      onPaste={paste}
    />
  )

  return (
    <>
      <div className="plate-in">
        <span className="eu" aria-hidden="true">
          F
        </span>
        {box(0, 'AB')}
        <span className="dash" aria-hidden="true">
          –
        </span>
        {box(1, '123')}
        <span className="dash" aria-hidden="true">
          –
        </span>
        {box(2, 'CD')}
      </div>
      <button type="button" className="link" onClick={() => (setLibre(true), onChange(''))}>
        Ancienne plaque (autre format)
      </button>
    </>
  )
}

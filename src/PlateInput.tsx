// Plaque en un seul champ dessiné comme une plaque : on tape « ab123cd » d'un trait, il s'écrit AB-123-CD.
// Une ancienne plaque (elle commence par des chiffres, ex. 123 ABC 75) se tape telle quelle dans le même champ.
export function formatPlaque(raw: string) {
  let c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Une lettre de trop à la fin d'une plaque complète est ignorée
  if (/^[A-Z]{2}\d{3}[A-Z]{3,}$/.test(c)) c = c.slice(0, 7)
  const m = c.match(/^([A-Z]{1,2})(\d{0,3})([A-Z]{0,2})$/)
  // Pas le format AB-123-CD (ou pas encore) : saisie libre, en majuscules
  if (!m || (m[2] === '' && m[3] !== '') || (m[1].length < 2 && m[2] !== '')) return raw.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 12)
  return [m[1], m[2], m[3]].filter(Boolean).join('-')
}

export function PlateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="plate-in">
      <span className="eu" aria-hidden="true">
        F
      </span>
      <input
        id="immat"
        className="inp sm plate-box"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="characters"
        enterKeyHint="done"
        placeholder="AB-123-CD"
        maxLength={12}
        value={value}
        onChange={(e) => onChange(formatPlaque(e.target.value))}
      />
    </div>
  )
}

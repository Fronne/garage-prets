// Icônes au trait (style Lucide)
type P = { sm?: boolean }
const S = ({ sm, children }: P & { children: React.ReactNode }) => (
  <svg className={sm ? 'i sm' : 'i'} viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

// Dessin de l'icône de l'application, en trait fin (le même que scripts/gen-icons.mjs)
// `className="i app"` pour la taille et l'épaisseur des autres icônes (onglet Prêts, voiture de marque inconnue)
export const AppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 1.3 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.95 16H3.3C2.6 16 2.3 15.4 2.4 14.7L2.6 12.9C2.7 11.9 3.1 11 3.7 10.3L4.5 9.5C5 9 5.7 8.8 6.6 8.8L11.6 8.7C12.8 8.7 13.7 9 14.5 9.6L17.4 11.6C17.9 11.95 18.5 12.1 19.1 12.2L20.6 12.5C21.6 12.7 22.3 13.4 22.3 14.4V15.1C22.3 15.6 21.9 16 21.4 16H19.65M8.65 16H15.95" />
    <circle cx="6.8" cy="16" r="1.85" />
    <circle cx="17.8" cy="16" r="1.85" />
  </svg>
)
export const Check = (p: P) => (
  <S {...p}>
    <path d="M5 12l5 5 9-10" />
  </S>
)
export const Phone = (p: P) => (
  <S {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </S>
)
export const X = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
)
export const Cal = () => (
  <S sm>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </S>
)
export const Cam = () => (
  <S sm>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </S>
)
export const Pen = () => (
  <S sm>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </S>
)
export const User = () => (
  <S>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </S>
)
export const Users = () => (
  <S>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3A6.5 6.5 0 0 1 21.5 20" />
  </S>
)
export const Clock = () => (
  <S>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
)
export const Home = () => (
  <S>
    <path d="M3 11l9-7 9 7v9H3z" />
    <path d="M9 20v-6h6v6" />
  </S>
)
export const Wrench = () => (
  <S>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
  </S>
)
export const Warn = () => (
  <S>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17v.01" />
  </S>
)
export const Plus = () => (
  <S>
    <path d="M12 5v14M5 12h14" />
  </S>
)

export const Plate = ({ immat }: { immat: string | null }) =>
  immat ? (
    <span className="plate" aria-label={'Plaque ' + immat}>
      <i aria-hidden="true">F</i>
      <span>{immat}</span>
    </span>
  ) : null
export const List = () => (
  <S sm>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </S>
)
export const Back = () => (
  <S>
    <path d="M15 18l-6-6 6-6" />
  </S>
)
export const Chevron = () => (
  <S sm>
    <path d="M9 18l6-6-6-6" />
  </S>
)

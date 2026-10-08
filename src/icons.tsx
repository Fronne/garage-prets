// Icônes au trait (style Lucide)
type P = { sm?: boolean }
const S = ({ sm, children }: P & { children: React.ReactNode }) => (
  <svg className={sm ? 'i sm' : 'i'} viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

export const Car = (p: P) => (
  <S {...p}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </S>
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

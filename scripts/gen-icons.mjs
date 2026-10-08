// Dessine l'icône de l'application (la voiture des cartes, en blanc sur fond encre) et l'écrit en PNG.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const INK = '#111827'
const CAR =
  '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' +
  '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'

// `scale` : part de la largeur occupée par la voiture ; `bg` : couleur de fond ou null (transparent)
function svg({ scale, bg, radius = 0 }) {
  const s = 24 / scale
  const o = (s - 24) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-o} ${-o + 0.6} ${s} ${s}">
    ${bg ? `<rect x="${-o}" y="${-o + 0.6}" width="${s}" height="${s}" rx="${radius * s}" fill="${bg}"/>` : ''}
    <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${CAR}</g>
  </svg>`
}

const png = (size, opts) => new Resvg(svg(opts), { fitTo: { mode: 'width', value: size } }).render().asPng()

// Android : avant-plan transparent (le fond vient de @color/brand), la voiture dans la zone visible des icônes rondes
const ANDROID = 'android/app/src/main/res/drawable-nodpi'
const files = [
  ['public/icon-192.png', 192, { scale: 0.62, bg: INK, radius: 0.22 }],
  ['public/icon-512.png', 512, { scale: 0.62, bg: INK, radius: 0.22 }],
  ['public/icon-maskable.png', 512, { scale: 0.5, bg: INK }],
  ['public/apple-touch-icon.png', 180, { scale: 0.6, bg: INK }],
  [`${ANDROID}/ic_launcher_foreground.png`, 432, { scale: 0.42, bg: null }],
  [`${ANDROID}/splash.png`, 512, { scale: 0.5, bg: null }],
]
for (const [path, size, opts] of files) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, png(size, opts))
  console.log(path)
}

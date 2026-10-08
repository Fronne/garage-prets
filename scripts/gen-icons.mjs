// Dessine l'icône de l'application (la voiture des cartes, en blanc sur fond encre) et l'écrit en PNG.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const INK = '#111827'
const CAR =
  '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' +
  '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'

// Image w × h ; la voiture occupe `scale` du plus petit côté. `shape` : 'square', 'rounded', 'circle' ou null (fond transparent)
function svg(w, h, scale, shape) {
  const unit = (Math.min(w, h) * scale) / 24 // pixels par unité du dessin 24 × 24
  const x = (w - 24 * unit) / 2
  const y = (h - 24 * unit) / 2 + 0.6 * unit // la voiture est un peu haute dans son carré
  const bg =
    shape === 'circle'
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="${INK}"/>`
      : shape
        ? `<rect width="${w}" height="${h}" rx="${shape === 'rounded' ? w * 0.22 : 0}" fill="${INK}"/>`
        : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}
    <g transform="translate(${x} ${y}) scale(${unit})" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${CAR}</g>
  </svg>`
}

const files = [
  ['public/icon-192.png', 192, 192, 0.62, 'rounded'],
  ['public/icon-512.png', 512, 512, 0.62, 'rounded'],
  ['public/icon-maskable.png', 512, 512, 0.5, 'square'],
  ['public/apple-touch-icon.png', 180, 180, 0.6, 'square'],
]

// Android : icône classique, ronde, et avant-plan transparent des icônes adaptatives (fond : ic_launcher_background)
const RES = 'android/app/src/main/res'
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(DENSITIES)) {
  files.push([`${RES}/mipmap-${d}/ic_launcher.png`, 48 * k, 48 * k, 0.62, 'rounded'])
  files.push([`${RES}/mipmap-${d}/ic_launcher_round.png`, 48 * k, 48 * k, 0.58, 'circle'])
  files.push([`${RES}/mipmap-${d}/ic_launcher_foreground.png`, 108 * k, 108 * k, 0.42, null])
}
// Écran de démarrage
const SPLASH = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
files.push([`${RES}/drawable/splash.png`, 480, 320, 0.3, 'square'])
for (const [d, [w, h]] of Object.entries(SPLASH)) {
  files.push([`${RES}/drawable-port-${d}/splash.png`, w, h, 0.3, 'square'])
  files.push([`${RES}/drawable-land-${d}/splash.png`, h, w, 0.3, 'square'])
}

for (const [path, w, h, scale, shape] of files) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, new Resvg(svg(w, h, scale, shape)).render().asPng())
}
console.log(files.length + ' icônes écrites')

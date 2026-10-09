// Dessine l'icône de l'application (la voiture des cartes, en blanc sur fond encre) et l'écrit en PNG.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const INK = '#111827'
// Silhouette de Golf en trait fin (choix de Cyril, 2026-10-09)
const CAR =
  '<path d="M4.95 16H3.3C2.6 16 2.3 15.4 2.4 14.7L2.6 12.9C2.7 11.9 3.1 11 3.7 10.3L4.5 9.5C5 9 5.7 8.8 6.6 8.8L11.6 8.7C12.8 8.7 13.7 9 14.5 9.6L17.4 11.6C17.9 11.95 18.5 12.1 19.1 12.2L20.6 12.5C21.6 12.7 22.3 13.4 22.3 14.4V15.1C22.3 15.6 21.9 16 21.4 16H19.65M8.65 16H15.95"/>' +
  '<circle cx="6.8" cy="16" r="1.85"/><circle cx="17.8" cy="16" r="1.85"/>'

// Image w × h ; la voiture occupe `scale` du plus petit côté. `shape` : 'square', 'rounded', 'circle' ou null (fond transparent)
function svg(w, h, scale, shape) {
  const unit = (Math.min(w, h) * scale) / 24 // pixels par unité du dessin 24 × 24
  const x = (w - 24 * unit) / 2
  const y = (h - 24 * unit) / 2 - 1.3 * unit // la voiture est un peu basse dans son carré
  const bg =
    shape === 'circle'
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="${INK}"/>`
      : shape
        ? `<rect width="${w}" height="${h}" rx="${shape === 'rounded' ? w * 0.22 : 0}" fill="${INK}"/>`
        : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bg}
    <g transform="translate(${x} ${y}) scale(${unit})" fill="none" stroke="#fff" stroke-width="0.65" stroke-linecap="round" stroke-linejoin="round">${CAR}</g>
  </svg>`
}

const files = [
  ['public/icon-192.png', 192, 192, 0.74, 'rounded'],
  ['public/icon-512.png', 512, 512, 0.74, 'rounded'],
  ['public/icon-maskable.png', 512, 512, 0.6, 'square'],
  ['public/apple-touch-icon.png', 180, 180, 0.71, 'square'],
]

// Android : icône classique, ronde, et avant-plan transparent des icônes adaptatives (fond : ic_launcher_background)
const RES = 'android/app/src/main/res'
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(DENSITIES)) {
  files.push([`${RES}/mipmap-${d}/ic_launcher.png`, 48 * k, 48 * k, 0.74, 'rounded'])
  files.push([`${RES}/mipmap-${d}/ic_launcher_round.png`, 48 * k, 48 * k, 0.69, 'circle'])
  files.push([`${RES}/mipmap-${d}/ic_launcher_foreground.png`, 108 * k, 108 * k, 0.5, null])
}
// Écran de démarrage
const SPLASH = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
files.push([`${RES}/drawable/splash.png`, 480, 320, 0.36, 'square'])
for (const [d, [w, h]] of Object.entries(SPLASH)) {
  files.push([`${RES}/drawable-port-${d}/splash.png`, w, h, 0.36, 'square'])
  files.push([`${RES}/drawable-land-${d}/splash.png`, h, w, 0.36, 'square'])
}

for (const [path, w, h, scale, shape] of files) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, new Resvg(svg(w, h, scale, shape)).render().asPng())
}
console.log(files.length + ' icônes écrites')

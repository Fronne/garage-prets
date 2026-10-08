// Usage : node scripts/gen-brands.mjs <dossier icons/ du paquet simple-icons@15> src/brands.ts
import { readFileSync, writeFileSync } from 'node:fs'
const dir = process.argv[2], out = process.argv[3]
// marque -> mots du nom (sans accents, sans espaces ni tirets)
const M = {
  renault: 'renault clio megane twingo kangoo captur scenic laguna trafic master zoe espace kadjar arkana austral koleos talisman fluence modus symbol',
  dacia: 'dacia sandero duster logan spring jogger lodgy dokker bigster',
  peugeot: 'peugeot 106 107 108 205 206 207 208 2008 306 307 308 3008 406 407 408 4008 5008 508 607 807 partner expert boxer rifter bipper traveller',
  citroen: 'citroen c1 c2 c3 c4 c5 c6 c8 c3aircross c5aircross berlingo jumpy jumper picasso saxo xsara nemo spacetourer xantia',
  dsautomobiles: 'ds ds3 ds4 ds5 ds7 ds9',
  volkswagen: 'vw volkswagen golf polo passat tiguan touran up troc tcross caddy transporter sharan id3 id4 id5 idbuzz arteon scirocco touareg crafter lupo fox multivan taigo amarok beetle coccinelle',
  audi: 'audi a1 a2 a3 a4 a5 a6 a7 a8 q2 q3 q4 q5 q7 q8 tt etron',
  bmw: 'bmw x1 x2 x3 x4 x5 x6 x7 i3 i4 ix serie1 serie2 serie3 serie4 serie5 116 118 120 316 318 320 520 525 530',
  mercedes: 'mercedes benz mercedesbenz vito sprinter citan viano gla glb glc gle cla cls classea classeb classec classee',
  toyota: 'toyota yaris aygo corolla auris rav4 chr prius hilux proace avensis',
  ford: 'ford fiesta focus kuga puma transit mondeo ka cmax smax ranger ecosport tourneo galaxy',
  fiat: 'fiat 500 500x 500l panda punto tipo doblo ducato scudo fiorino qubo bravo',
  opel: 'opel corsa astra zafira meriva mokka crossland grandland insignia vivaro movano combo adam agila',
  nissan: 'nissan micra qashqai juke note leaf xtrail navara primastar nv200 pulsar',
  kia: 'kia picanto rio ceed sportage niro stonic sorento ev6 soul xceed carens',
  hyundai: 'hyundai i10 i20 i30 i40 tucson kona ioniq santafe ix20 ix35 bayon',
  skoda: 'skoda fabia octavia superb kodiaq karoq kamiq scala citigo yeti enyaq roomster',
  seat: 'seat ibiza leon arona ateca tarraco alhambra mii altea toledo',
  tesla: 'tesla model3 models modelx modely',
  volvo: 'volvo xc40 xc60 xc90 v40 v60 v90 s60 s90 ex30',
  mini: 'mini cooper countryman clubman',
  suzuki: 'suzuki swift vitara ignis jimny celerio baleno sx4',
  mazda: 'mazda mx5 cx3 cx30 cx5 mazda2 mazda3 mazda6',
  honda: 'honda jazz civic crv hrv',
  jeep: 'jeep renegade compass wrangler cherokee avenger',
  smart: 'smart fortwo forfour',
  mitsubishi: 'mitsubishi outlander asx spacestar l200 colt pajero',
  mg: 'mg mg3 mg4 mg5 zs ehs',
  polestar: 'polestar',
  iveco: 'iveco daily',
}
const paths = {}
for (const b of Object.keys(M)) {
  if (b === 'mercedes') continue
  paths[b] = readFileSync(`${dir}/${b}.svg`, 'utf8').match(/ d="([^"]+)"/)[1]
}
// Pas de Mercedes dans simple-icons : étoile à trois branches dessinée à la main
paths.mercedes = 'M12 0a12 12 0 1 0 0 24 12 12 0 1 0 0-24zm0 1.2a10.8 10.8 0 1 1 0 21.6 10.8 10.8 0 1 1 0-21.6zm0 0l1.39 10l7.96 6.2L12 13.6l-9.35 3.8 7.96-6.2z'
const words = Object.entries(M).flatMap(([b, w]) => w.split(' ').map((k) => [k, b]))
let s = `// Logos des marques (simple-icons 15, licence CC0 ; Mercedes dessiné à la main) et mots du nom qui les reconnaissent.
// Fichier généré : la liste des modèles est dans scripts/gen-brands.mjs.
export const LOGOS: Record<string, string> = ${JSON.stringify(paths, null, 2)}

export const MOTS: Record<string, string> = ${JSON.stringify(Object.fromEntries(words))}
`
writeFileSync(out, s)
console.log(Object.keys(paths).length, 'logos,', words.length, 'mots,', s.length, 'octets')

import { Hono } from 'hono'
import type { Degat, JeuPhotos, PhotoCle, PhotosPret, Pret, SyncData, Vehicule } from '../shared/types'
import { appKeyMatches, codeMatches, makeToken, verifyToken } from './auth'
import type { Env } from './env'

const MAX_LOGIN_FAILS = 10
const LOGIN_WINDOW_MS = 15 * 60_000
// Les prêts rendus restent visibles dans l'historique des voitures pendant cette durée
const HISTORY_DAYS = 120
// Un prêt enregistré par erreur peut être annulé pendant ce délai
const UNDO_MS = 15 * 60_000
const MAX_PHOTO = 1_500_000

const DATE = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type App = { Bindings: Env; Variables: { prenom: string } }

const bad = (message: string) => new HttpError(400, message)
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const optText = (v: unknown, max: number) => text(v, max) || null
// Le téléphone choisit l'identifiant : renvoyer deux fois la même création (réseau instable) ne crée pas de doublon
const idFrom = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : crypto.randomUUID())
const now = () => new Date().toISOString()

// Photos d'un prêt : seulement les emplacements connus, chacun avec l'identifiant d'une photo envoyée
const CLES_DEPART: PhotoCle[] = ['permis_recto', 'permis_verso', 'jauge', 'avant', 'arriere', 'gauche', 'droite', 'detail']
const CLES_PERMIS: PhotoCle[] = ['permis_recto', 'permis_verso']
function jeuPhotos(v: unknown, cles: PhotoCle[]): JeuPhotos | undefined {
  if (!v || typeof v !== 'object') return undefined
  const jeu: JeuPhotos = {}
  for (const k of cles) {
    const id = (v as Record<string, unknown>)[k]
    if (typeof id === 'string' && UUID.test(id)) jeu[k] = id
  }
  return Object.keys(jeu).length ? jeu : undefined
}
// Photos du départ : les emplacements, plus les dégâts (10 au plus, chacun avec une note courte facultative)
const MAX_DEGATS = 10
function jeuDepart(v: unknown): JeuPhotos | undefined {
  const jeu = jeuPhotos(v, CLES_DEPART) ?? {}
  const liste = v && typeof v === 'object' ? (v as { degats?: unknown }).degats : undefined
  const degats: Degat[] = []
  if (Array.isArray(liste))
    for (const d of liste.slice(0, MAX_DEGATS)) {
      if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !UUID.test(d.id)) continue
      const note = text(d.note, 80)
      degats.push(note ? { id: d.id, note } : { id: d.id })
    }
  if (degats.length) jeu.degats = degats
  return Object.keys(jeu).length ? jeu : undefined
}
// Tous les identifiants de photo d'un jeu, emplacements et dégâts
const idsJeu = (jeu: JeuPhotos | undefined) => [
  ...Object.entries(jeu ?? {}).flatMap(([k, id]) => (k !== 'degats' && typeof id === 'string' ? [id] : [])),
  ...(jeu?.degats ?? []).map((d) => d.id),
]
const lirePhotos = (s: unknown): PhotosPret | null => {
  try {
    return typeof s === 'string' ? JSON.parse(s) : null
  } catch {
    return null
  }
}
const ecrirePhotos = (p: PhotosPret) => (p.depart || p.retour ? JSON.stringify(p) : null)
// Heure donnée par le téléphone : un prêt ou un retour noté sans réseau garde son heure réelle. Plus de 14 jours ou dans le futur : on prend l'heure du serveur.
function heureTel(v: unknown, auPlusTot?: string): string {
  const t = Date.parse(String(v ?? ''))
  const n = Date.now()
  if (!Number.isFinite(t) || t > n + 60_000 || t < n - 14 * 86_400_000) return now()
  const min = auPlusTot ? Date.parse(auPlusTot) : 0
  return new Date(Math.max(Math.min(t, n), min)).toISOString()
}

const app = new Hono<App>()

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as any)
  console.error(err)
  return c.json({ error: 'Erreur du serveur.' }, 500)
})

// Prénoms déjà utilisés sur les téléphones, proposés dans « Qui es-tu ? »
async function getEquipe(env: Env): Promise<string[]> {
  return JSON.parse((await env.DB.prepare("SELECT value FROM meta WHERE key = 'equipe'").first<string>('value')) ?? '[]')
}

async function addEquipe(env: Env, equipe: string[], prenom: string) {
  if (equipe.some((n) => n.toLowerCase() === prenom.toLowerCase())) return
  const next = [...equipe, prenom].sort((a, b) => a.localeCompare(b, 'fr')).slice(0, 30)
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('equipe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(next))
    .run()
}

app.post('/api/login', async (c) => {
  const env = c.env
  if (!env.GARAGE_CODE) throw new HttpError(500, "Le code du garage n'est pas configuré sur le serveur.")
  const b = await c.req.json().catch(() => ({}))

  // Frein contre les essais de code en série
  const bucket = 'login_fails:' + Math.floor(Date.now() / LOGIN_WINDOW_MS)
  const fails = await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(bucket).first<string>('value')
  if (Number(fails ?? 0) >= MAX_LOGIN_FAILS) throw new HttpError(429, 'Trop de tentatives. Réessaie dans quelques minutes.')
  if (!(await codeMatches(env, String(b.code ?? '')))) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM meta WHERE key LIKE 'login_fails:%' AND key != ?").bind(bucket),
      env.DB.prepare(
        "INSERT INTO meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1",
      ).bind(bucket),
    ])
    throw new HttpError(401, 'Code incorrect.')
  }

  const prenom = text(b.prenom, 30)
  if (!prenom) throw bad('Il faut ton prénom.')
  await addEquipe(env, await getEquipe(env), prenom)
  return c.json({ token: await makeToken(env, prenom), prenom })
})

// Appli Android du garage : elle porte sa propre clé, il suffit de choisir son prénom dans la liste de l'équipe
app.post('/api/login-appli', async (c) => {
  const env = c.env
  const b = await c.req.json().catch(() => ({}))
  if (!(await appKeyMatches(env, String(b.cle ?? '')))) throw new HttpError(401, 'Appli non reconnue.')
  const equipe = await getEquipe(env)
  const prenom = text(b.prenom, 30)
  // Sans prénom : on renvoie seulement la liste de l'équipe
  if (!prenom) return c.json({ equipe })
  await addEquipe(env, equipe, prenom)
  return c.json({ token: await makeToken(env, prenom), prenom })
})

app.use('/api/*', async (c, next) => {
  const token = (c.req.header('Authorization') ?? '').replace(/^Bearer /, '')
  const prenom = await verifyToken(c.env, token)
  if (!prenom) throw new HttpError(401, 'Reconnecte-toi.')
  c.set('prenom', prenom)
  await next()
})

app.get('/api/sync', async (c) => {
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString()
  const [vehicules, prets] = await Promise.all([
    c.env.DB.prepare('SELECT id, nom, immat, indispo, indispo_le FROM vehicules WHERE archive = 0 ORDER BY nom').all<Vehicule>(),
    c.env.DB.prepare(
      `SELECT id, vehicule_id, client, tel, note, depart, retour_prevu, retour, photo_depart, photo_retour, par, photos
       FROM prets WHERE retour IS NULL OR retour >= ? ORDER BY depart DESC LIMIT 1000`,
    )
      .bind(since)
      .all<Pret>(),
  ])
  const ps = prets.results.map((p) => ({ ...p, photos: lirePhotos(p.photos) }))
  return c.json({ moi: c.get('prenom'), vehicules: vehicules.results, prets: ps } satisfies SyncData)
})

// Historique complet, voitures retirées comprises : pour retrouver qui avait une voiture (PV, amende).
// « de » et « a » (ISO) : prêts qui chevauchent cette période ; « q » : plaque, voiture ou client.
app.get('/api/historique', async (c) => {
  const de = c.req.query('de')
  const a = c.req.query('a')
  const q = (c.req.query('q') ?? '').trim().slice(0, 40)
  const where: string[] = []
  const args: string[] = []
  if (de && a) {
    where.push('p.depart <= ? AND (p.retour IS NULL OR p.retour >= ?)')
    args.push(a, de)
  }
  if (q) {
    const plaque = q.toUpperCase().replace(/[^A-Z0-9]/g, '')
    where.push(
      "(p.client LIKE ? OR v.nom LIKE ?" + (plaque ? " OR REPLACE(REPLACE(UPPER(IFNULL(v.immat, '')), '-', ''), ' ', '') LIKE ?" : '') + ')',
    )
    args.push('%' + q + '%', '%' + q + '%', ...(plaque ? ['%' + plaque + '%'] : []))
  }
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.vehicule_id, p.client, p.tel, p.note, p.depart, p.retour_prevu, p.retour, p.par, p.photos, v.nom, v.immat
     FROM prets p JOIN vehicules v ON v.id = p.vehicule_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.depart DESC LIMIT 300`,
  )
    .bind(...args)
    .all<{ photos: unknown }>()
  return c.json(rows.results.map((r) => ({ ...r, photos: lirePhotos(r.photos) })))
})

// ---------- Voitures ----------

app.post('/api/vehicules', async (c) => {
  const b = await c.req.json()
  const nom = text(b.nom, 40)
  if (!nom) throw bad('Il faut le nom de la voiture.')
  const id = idFrom(b.id)
  await c.env.DB.prepare('INSERT INTO vehicules (id, nom, immat) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING')
    .bind(id, nom, optText(b.immat, 12)?.toUpperCase() ?? null)
    .run()
  return c.json({ id })
})

app.put('/api/vehicules/:id', async (c) => {
  const b = await c.req.json()
  const nom = text(b.nom, 40)
  if (!nom) throw bad('Il faut le nom de la voiture.')
  await c.env.DB.prepare('UPDATE vehicules SET nom = ?, immat = ? WHERE id = ?')
    .bind(nom, optText(b.immat, 12)?.toUpperCase() ?? null, c.req.param('id'))
    .run()
  return c.json({ ok: true })
})

// Met la voiture de côté (contrôle technique, réparation…) ou la remet disponible ({ motif: null })
app.put('/api/vehicules/:id/indispo', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const id = c.req.param('id')
  if (b.motif === null) {
    await c.env.DB.prepare('UPDATE vehicules SET indispo = NULL, indispo_le = NULL WHERE id = ?').bind(id).run()
    return c.json({ ok: true })
  }
  const dehors = await c.env.DB.prepare('SELECT 1 FROM prets WHERE vehicule_id = ? AND retour IS NULL').bind(id).first()
  if (dehors) throw new HttpError(409, "Cette voiture est prêtée : note d'abord son retour.")
  await c.env.DB.prepare('UPDATE vehicules SET indispo = ?, indispo_le = COALESCE(indispo_le, ?) WHERE id = ?')
    .bind(text(b.motif, 60), heureTel(b.at), id)
    .run()
  return c.json({ ok: true })
})

// Retire la voiture de la grille ; ses anciens prêts restent en base
app.delete('/api/vehicules/:id', async (c) => {
  const id = c.req.param('id')
  const dehors = await c.env.DB.prepare('SELECT 1 FROM prets WHERE vehicule_id = ? AND retour IS NULL').bind(id).first()
  if (dehors) throw new HttpError(409, "Cette voiture est prêtée : note d'abord son retour.")
  await c.env.DB.prepare('UPDATE vehicules SET archive = 1 WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ---------- Équipe ----------

const memePrenom = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

app.get('/api/equipe', async (c) => c.json({ equipe: await getEquipe(c.env) }))

// Retire un prénom de « Qui es-tu ? » (créé par erreur, faute de frappe) ; ses prêts restent dans l'historique
app.delete('/api/equipe/:prenom', async (c) => {
  const prenom = c.req.param('prenom')
  if (memePrenom(prenom, c.get('prenom'))) throw bad('Pour retirer ton propre prénom, fais-le depuis un autre téléphone.')
  const next = (await getEquipe(c.env)).filter((n) => !memePrenom(n, prenom))
  await c.env.DB.prepare("INSERT INTO meta (key, value) VALUES ('equipe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(next))
    .run()
  return c.json({ equipe: next })
})

// ---------- Prêts ----------

function pretFields(b: any) {
  const client = text(b.client, 60)
  if (!client) throw bad('Il faut juste le nom du client.')
  const retourPrevu = b.retour_prevu ? String(b.retour_prevu) : null
  if (retourPrevu && !DATE.test(retourPrevu)) throw bad('Date de retour invalide.')
  return { client, tel: optText(b.tel, 30), note: optText(b.note, 500), retourPrevu }
}

app.post('/api/prets', async (c) => {
  const b = await c.req.json()
  const f = pretFields(b)
  const id = idFrom(b.id)
  const vehiculeId = text(b.vehicule_id, 40)
  const v = await c.env.DB.prepare('SELECT indispo FROM vehicules WHERE id = ? AND archive = 0').bind(vehiculeId).first<{ indispo: string | null }>()
  if (!v) throw new HttpError(404, "Cette voiture n'existe plus.")
  const deja = await c.env.DB.prepare('SELECT id FROM prets WHERE vehicule_id = ? AND retour IS NULL').bind(vehiculeId).first<string>('id')
  if (deja === id) return c.json({ id })
  if (deja) throw new HttpError(409, 'Cette voiture vient d’être prêtée par quelqu’un d’autre.')
  if (v.indispo !== null) throw new HttpError(409, 'Cette voiture est indisponible : remets-la disponible avant de la prêter.')
  // ON CONFLICT : un prêt renvoyé deux fois (réseau coupé pendant la réponse) n'est enregistré qu'une fois
  await c.env.DB.prepare(
    `INSERT INTO prets (id, vehicule_id, client, tel, note, depart, retour_prevu, photo_depart, par, photos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
  )
    .bind(
      id,
      vehiculeId,
      f.client,
      f.tel,
      f.note,
      heureTel(b.depart),
      f.retourPrevu,
      optText(b.photo_depart, 40),
      c.get('prenom'),
      ecrirePhotos({ depart: jeuDepart(b.photos?.depart) }),
    )
    .run()
  return c.json({ id })
})

app.put('/api/prets/:id', async (c) => {
  const b = await c.req.json()
  const f = pretFields(b)
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE prets SET client = ?, tel = ?, note = ?, retour_prevu = ?, maj_le = ? WHERE id = ?')
    .bind(f.client, f.tel, f.note, f.retourPrevu, now(), id)
    .run()
  // Photos du départ changées depuis « Modifier le prêt » ; celles du retour restent
  if (b.photos && typeof b.photos === 'object') {
    const avant = lirePhotos(await c.env.DB.prepare('SELECT photos FROM prets WHERE id = ?').bind(id).first('photos')) ?? {}
    await c.env.DB.prepare('UPDATE prets SET photos = ? WHERE id = ?')
      .bind(ecrirePhotos({ ...avant, depart: jeuDepart(b.photos.depart) }), id)
      .run()
  }
  return c.json({ ok: true })
})

app.post('/api/prets/:id/retour', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const depart = await c.env.DB.prepare('SELECT depart FROM prets WHERE id = ?').bind(c.req.param('id')).first<string>('depart')
  await c.env.DB.prepare('UPDATE prets SET retour = ?, maj_le = ? WHERE id = ? AND retour IS NULL')
    .bind(heureTel(b.at, depart ?? undefined), now(), c.req.param('id'))
    .run()
  c.executionCtx.waitUntil(alleger(c.env).catch((e) => console.error(e)))
  return c.json({ ok: true })
})

// Une fois la voiture rendue, l'Historique ne garde que le permis : les photos de la voiture (jauge, état, compteur) sont effacées
// pour ne pas remplir la base. On attend un jour après le retour, le temps d'un « Annuler » ou d'un retour noté par erreur.
async function alleger(env: Env) {
  const avant = new Date(Date.now() - 86_400_000).toISOString()
  const voiture = [...CLES_DEPART.filter((k) => !CLES_PERMIS.includes(k)), 'degats']
  const { results } = await env.DB.prepare(
    `SELECT id, photos, photo_depart, photo_retour FROM prets
     WHERE retour IS NOT NULL AND retour < ?
       AND (photo_depart IS NOT NULL OR photo_retour IS NOT NULL OR photos LIKE '%"retour"%' OR ${voiture.map(() => 'photos LIKE ?').join(' OR ')})
     LIMIT 50`,
  )
    .bind(avant, ...voiture.map((k) => `%"${k}"%`))
    .all<{ id: string; photos: string | null; photo_depart: string | null; photo_retour: string | null }>()
  if (!results.length) return
  const effacer: string[] = []
  const maj = results.map((r) => {
    const p = lirePhotos(r.photos) ?? {}
    const permis = jeuPhotos(p.depart, CLES_PERMIS)
    const garder = idsJeu(permis)
    for (const jeu of [p.depart, p.retour]) for (const id of idsJeu(jeu)) if (!garder.includes(id)) effacer.push(id)
    for (const id of [r.photo_depart, r.photo_retour]) if (id) effacer.push(id)
    return env.DB.prepare('UPDATE prets SET photos = ?, photo_depart = NULL, photo_retour = NULL WHERE id = ?').bind(
      permis ? JSON.stringify({ depart: permis }) : null,
      r.id,
    )
  })
  await env.DB.batch([...maj, ...effacer.map((id) => env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id))])
}

// « Annuler » juste après « Voiture rendue »
app.post('/api/prets/:id/annuler-retour', async (c) => {
  try {
    await c.env.DB.prepare('UPDATE prets SET retour = NULL, maj_le = ? WHERE id = ?').bind(now(), c.req.param('id')).run()
  } catch {
    throw new HttpError(409, 'La voiture a déjà été reprêtée entre-temps.')
  }
  return c.json({ ok: true })
})

// « Annuler » juste après un prêt enregistré par erreur
app.delete('/api/prets/:id', async (c) => {
  const p = await c.env.DB.prepare('SELECT depart FROM prets WHERE id = ? AND retour IS NULL').bind(c.req.param('id')).first<string>('depart')
  if (!p) return c.json({ ok: true })
  if (Date.now() - Date.parse(p) > UNDO_MS) throw new HttpError(409, 'Trop tard pour annuler : note plutôt le retour.')
  await c.env.DB.prepare('DELETE FROM prets WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ---------- Photos (permis, jauge, état de la voiture) ----------

app.post('/api/photos', async (c) => {
  const b = await c.req.json()
  const data = String(b.data ?? '')
  if (!data.startsWith('data:image/jpeg;base64,') || data.length > MAX_PHOTO) throw bad('Photo invalide ou trop lourde.')
  const id = idFrom(b.id)
  await c.env.DB.prepare('INSERT INTO photos (id, data) VALUES (?, ?) ON CONFLICT(id) DO NOTHING').bind(id, data).run()
  return c.json({ id })
})

app.get('/api/photos/:id', async (c) => {
  const data = await c.env.DB.prepare('SELECT data FROM photos WHERE id = ?').bind(c.req.param('id')).first<string>('data')
  if (!data) throw new HttpError(404, 'Photo introuvable.')
  const bin = atob(data.slice(data.indexOf(',') + 1))
  return new Response(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' },
  })
})

app.all('/api/*', () => {
  throw new HttpError(404, 'Introuvable.')
})

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app

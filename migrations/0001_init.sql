-- Les voitures de prêt du garage. « archive » retire une voiture de la grille sans perdre son historique.
CREATE TABLE IF NOT EXISTS vehicules (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  immat TEXT,
  archive INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Un prêt : seul le nom du client est obligatoire. « retour » vide = la voiture est dehors.
CREATE TABLE IF NOT EXISTS prets (
  id TEXT PRIMARY KEY,
  vehicule_id TEXT NOT NULL REFERENCES vehicules(id),
  client TEXT NOT NULL,
  tel TEXT,
  note TEXT,
  depart TEXT NOT NULL,
  retour_prevu TEXT,
  retour TEXT,
  photo_depart TEXT,
  photo_retour TEXT,
  par TEXT,
  maj_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS prets_vehicule ON prets(vehicule_id, retour);
-- Une voiture ne peut pas être prêtée deux fois en même temps
CREATE UNIQUE INDEX IF NOT EXISTS un_pret_actif_par_vehicule ON prets(vehicule_id) WHERE retour IS NULL;

-- Photos du compteur, à part pour ne pas alourdir la synchronisation
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cree_le TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Petits compteurs du serveur (frein aux essais de code)
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

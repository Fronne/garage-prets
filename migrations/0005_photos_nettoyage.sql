-- Fin de l'ancienne « photo du compteur » et des anciennes formes des photos d'un prêt.
-- Les images qui ne servent plus à aucun prêt sont effacées par le ménage de la nuit (worker : menagePhotos).

-- Ancienne photo du compteur au départ : elle devient la photo de la jauge, si le prêt n'en a pas
UPDATE prets
SET photos = json_set(COALESCE(photos, '{"depart":{}}'), '$.depart', json_set(COALESCE(json_extract(photos, '$.depart'), '{}'), '$.jauge', photo_depart))
WHERE photo_depart IS NOT NULL AND json_extract(COALESCE(photos, '{}'), '$.depart.jauge') IS NULL;

-- Ancienne case unique « Détail, dégât » : elle rejoint la liste des dégâts
UPDATE prets
SET photos = json_set(
  json_remove(photos, '$.depart.detail'),
  '$.depart.degats',
  json_insert(COALESCE(json_extract(photos, '$.depart.degats'), '[]'), '$[#]', json_object('id', json_extract(photos, '$.depart.detail')))
)
WHERE json_extract(photos, '$.depart.detail') IS NOT NULL;

-- Plus aucune photo au retour
UPDATE prets SET photos = json_remove(photos, '$.retour') WHERE json_extract(photos, '$.retour') IS NOT NULL;
UPDATE prets SET photos = NULL WHERE photos IS NOT NULL AND (json_extract(photos, '$.depart') IS NULL OR json_extract(photos, '$.depart') = '{}');

ALTER TABLE prets DROP COLUMN photo_depart;
ALTER TABLE prets DROP COLUMN photo_retour;

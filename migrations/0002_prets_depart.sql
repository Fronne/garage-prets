-- L'Historique trie les prêts du plus récent au plus ancien : sans cet index, la base relit tous les prêts à chaque ouverture
CREATE INDEX IF NOT EXISTS prets_depart ON prets(depart DESC);

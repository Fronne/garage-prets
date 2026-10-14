-- Photos d'un prêt (permis, jauge, état de la voiture au départ et au retour) : JSON { depart: { cle: id }, retour: { cle: id } }.
-- Les images elles-mêmes restent dans la table « photos ».
ALTER TABLE prets ADD COLUMN photos TEXT;

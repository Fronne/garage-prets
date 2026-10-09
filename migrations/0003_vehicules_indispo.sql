-- Voiture mise de côté (contrôle technique, réparation…) : « indispo » porte la raison (vide si aucune), NULL = disponible
ALTER TABLE vehicules ADD COLUMN indispo TEXT;
ALTER TABLE vehicules ADD COLUMN indispo_le TEXT;

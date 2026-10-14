export interface Vehicule {
  id: string
  nom: string
  immat: string | null
  /** Raison de l'indisponibilité (vide si aucune) ; null = la voiture peut être prêtée */
  indispo?: string | null
  /** Date et heure ISO de la mise de côté */
  indispo_le?: string | null
}

export interface Pret {
  id: string
  vehicule_id: string
  client: string
  tel: string | null
  note: string | null
  /** Date et heure ISO du départ */
  depart: string
  /** Jour prévu du retour, AAAA-MM-JJ */
  retour_prevu: string | null
  /** Date et heure ISO du retour ; null tant que la voiture est dehors */
  retour: string | null
  photo_depart: string | null
  photo_retour: string | null
  /** Prénom de la personne du garage qui a fait le prêt */
  par: string | null
  /** Permis du client, jauge et état de la voiture au départ et au retour */
  photos?: PhotosPret | null
}

/** Emplacements de photo d'un prêt. Le permis ne se prend qu'au départ. « detail » : ancienne case unique de dégât, remplacée par la liste « degats » */
export type PhotoCle = 'permis_recto' | 'permis_verso' | 'jauge' | 'avant' | 'arriere' | 'gauche' | 'droite' | 'detail'
/** Un dégât photographié, avec où il est si on l'a noté */
export interface Degat {
  id: string
  note?: string
}
/** Identifiant de la photo (table « photos ») pour chaque emplacement rempli, et les dégâts, autant qu'il en faut */
export type JeuPhotos = Partial<Record<PhotoCle, string>> & { degats?: Degat[] }
export interface PhotosPret {
  depart?: JeuPhotos
  retour?: JeuPhotos
}

export interface SyncData {
  moi: string
  vehicules: Vehicule[]
  prets: Pret[]
}

/** Ligne de l'historique : le prêt avec le nom et la plaque de sa voiture */
export type LigneHisto = Omit<Pret, 'photo_depart' | 'photo_retour'> & { nom: string; immat: string | null }

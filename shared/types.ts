export interface Vehicule {
  id: string
  nom: string
  immat: string | null
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
}

export interface SyncData {
  moi: string
  vehicules: Vehicule[]
  prets: Pret[]
}

/** Ligne de l'historique : le prêt avec le nom et la plaque de sa voiture */
export type LigneHisto = Omit<Pret, 'photo_depart' | 'photo_retour'> & { nom: string; immat: string | null }

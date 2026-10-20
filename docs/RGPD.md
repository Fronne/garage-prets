# RGPD — Canal Mhirsi Service

Document de travail, à faire relire par un professionnel (avocat, DPO, ou modèles de la CNIL : cnil.fr). Le garage est **responsable de traitement** ; la personne qui fait tourner l'appli est **sous-traitant** ; Cloudflare est **sous-traitant ultérieur**.

## 1. Registre des traitements (art. 30)

| | |
|---|---|
| Traitement | Prêt de voitures à des clients |
| Finalités | Savoir qui a quelle voiture ; vérifier le droit de conduire ; prouver l'état de la voiture ; désigner le conducteur en cas d'amende ou de PV |
| Base légale | Exécution du prêt (contrat) et intérêt légitime du garage |
| Personnes | Clients à qui le garage prête une voiture |
| Données | Nom, téléphone, note libre, photos du permis (recto/verso), photos de la voiture, date et heure de départ et de retour, prénom du salarié |
| Destinataires | Les deux personnes du garage qui utilisent l'appli ; le sous-traitant (maintenance) ; Cloudflare (hébergement) ; autorités sur réquisition (police, amendes) |
| Hébergement | Cloudflare Workers + base D1 (jeton d'accès, accès privé uniquement) |
| Durées | Photos de la voiture : 30 jours après le retour. Photos du permis : 1 an après le retour. Nom, téléphone, note : 1 an après le retour. Photo envoyée mais inutilisée : 2 jours. Suppression automatique chaque nuit. |
| Sauvegardes | Cloudflare D1 garde 30 jours d'historique de restauration : une donnée effacée peut y rester jusqu'à 30 jours |
| Sécurité | Voir §4 |

## 2. Mention d'information à remettre au client (art. 13)

À imprimer sur le contrat ou la fiche de prêt (ou à afficher au comptoir) :

> **Vos données personnelles.** Le garage Canal Mhirsi Service (adresse, téléphone, courriel du garage) enregistre votre nom, votre téléphone et des photos de votre permis de conduire et du véhicule prêté. Ces données servent à vérifier votre droit de conduire, à prouver l'état du véhicule et à désigner le conducteur en cas d'infraction. Base légale : le prêt du véhicule et l'intérêt légitime du garage. Elles sont lues par le personnel du garage et hébergées chez Cloudflare. Les photos du véhicule sont gardées 30 jours après le retour ; vos coordonnées et la photo du permis, 1 an, puis effacées. Vous pouvez demander l'accès, la rectification ou l'effacement de vos données en vous adressant au garage (contact), et saisir la CNIL (cnil.fr) en cas de difficulté.

## 3. Droits des personnes

Une demande d'accès ou d'effacement reçoit une réponse sous **un mois**. Aucun écran de l'appli ne supprime un client : le garage prévient le sous-traitant, qui efface la ligne dans la base (D1) et ses photos. Noter chaque demande (date, personne, réponse).

## 4. Mesures de sécurité en place

- Accès à l'appli par code du garage, ou clé propre à l'APK ; frein à 10 essais ratés par 15 minutes (code et clé).
- Photos stockées dans la base, jamais en adresse publique ; lisibles seulement avec un jeton valide.
- Aucune réponse de l'API n'est mise en cache (`no-store`) ; HTTPS imposé (HSTS).
- Suppression automatique chaque nuit (voir §1).
- Sauvegarde Android désactivée (`allowBackup=false`).
- Secrets et clé de signature de l'APK hors du dépôt.

À faire par les personnes : verrouillage d'écran sur chaque téléphone, authentification à deux facteurs sur les comptes Cloudflare et GitHub, code du garage long et secret, aucune photo de permis envoyée par message.

## 5. Violation de données (art. 33-34)

En cas de perte ou de vol d'un téléphone connecté, d'un accès non voulu, d'une fuite :

1. Changer le code du garage (secret `GARAGE_CODE`) : tous les téléphones sont déconnectés.
2. Si la clé de l'APK a pu fuiter, la changer aussi (`npm run cle`) et reconstruire l'APK.
3. Noter dans un registre des incidents : date, ce qui s'est passé, données touchées, mesures prises.
4. Si des données de clients ont pu être vues par un tiers : **prévenir la CNIL sous 72 h** (notification en ligne sur cnil.fr). Prévenir aussi les clients concernés si le risque pour eux est élevé.
5. Le sous-traitant prévient le garage **sans délai** dès qu'il apprend un incident.

## 6. Contrat sous-traitant (art. 28)

À signer entre le garage et la personne qui maintient l'appli. À faire rédiger ou relire. Il doit au moins prévoir :

- objet : maintenance et hébergement de l'appli de prêts ; durée ; nature des données (§1) ;
- le sous-traitant n'agit que sur instruction écrite du garage ;
- confidentialité de toute personne ayant accès aux données ;
- mesures de sécurité du §4 ;
- sous-traitant ultérieur autorisé : Cloudflare, Inc. (DPA, clauses contractuelles types et Data Privacy Framework) ;
- aide au garage pour les demandes de droits et les violations (§3 et §5) ;
- à la fin du contrat : restitution puis suppression de toutes les données ;
- droit d'audit du garage ;
- **limite de responsabilité** du sous-traitant et sa non-garantie de disponibilité (offre gratuite Cloudflare, sans SLA) ;
- qui est titulaire du compte Cloudflare et qui paie l'hébergement.

## 7. Revue

Relire ce document chaque année, et à chaque changement de l'appli qui touche aux données.

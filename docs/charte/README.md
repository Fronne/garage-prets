# Canal Mhirsi Service — charte graphique

Version en ligne, avec les couleurs et les polices affichées : https://claude.ai/artifact/H574cToTCgA6Jff6R4mByQ (page privée). Les valeurs exactes de chaque couleur, taille de texte, espace et arrondi sont dans [`tokens.json`](tokens.json) ; dans l'appli, elles sont en haut de `src/styles.css`.

Canal Mhirsi Service (CMS) est un garage. Son appli, **CMS Prêts**, sert à l'équipe à prêter les voitures de courtoisie aux clients et à savoir à tout moment où elles sont. La charte a l'esprit d'un **atelier sérieux** : un bleu nuit profond et rassurant, une touche d'orange atelier comme un gyrophare, des gris acier, des titres gras et carrés.

## Ton et écriture

On écrit comme on parle au comptoir : simple, direct, sans jargon.

- Phrases courtes. Un message dit ce qui s'est passé ou ce qu'il faut faire : « Clio grise rendue », « Il faut ton prénom. »
- On tutoie dans l'appli de l'équipe (« Qui es-tu ? »). On vouvoie les clients, sur un SMS ou une affiche.
- Les voitures sont nommées comme au garage : le modèle et la couleur (« Golf noire »), puis la plaque.
- Pas de points d'exclamation à la chaîne, pas d'émojis, pas de capitales pour crier. Les capitales sont réservées aux étiquettes courtes (`etiquette`).
- Les heures s'écrivent à la française : « 18 h », « 9 h 40 », « mardi 14 oct. ».

## Couleurs

Trois couleurs font l'identité :

| Couleur | Jeton | Rôle |
| --- | --- | --- |
| Bleu nuit `#0F2A44` | `nuit` | La couleur du garage : fond de l'icône, bouton principal, en-têtes foncés. En thème clair, c'est aussi la couleur du texte (`ink`). |
| Orange atelier `#F28C28` | `atelier` | La touche qu'on remarque. Toujours en aplat, en petite quantité. |
| Gris acier `#8A9AAB` | `acier` | Le métal de l'atelier, pour le décor. |

Règles :

- **Le bleu nuit domine, l'orange reste rare.** Sur un écran, l'orange ne couvre jamais plus qu'une pastille ou un badge.
- **L'orange ne s'écrit pas sur fond clair** : il n'est pas assez lisible. Pour un mot orange, prendre `atelier-texte`. Sur un aplat `atelier`, le texte est bleu nuit (`on-atelier`), jamais blanc.
- Sur un fond `nuit`, tout est blanc (`on-nuit`) : texte, voiture, icônes.
- Le texte courant est `ink` ; les détails (heures, prénoms) sont `ink-muted`.
- Chaque couleur a sa version pour le thème sombre ; on utilise toujours le jeton, jamais la valeur.

### États des voitures

L'appli montre l'état d'une voiture d'un coup d'œil, toujours avec un mot en plus de la couleur :

| État | Couleur | Fond teinté |
| --- | --- | --- |
| Disponible | `vert` | `vert-soft` |
| Prêtée | `atelier` (pastille) / `atelier-texte` (mot) | `atelier-soft` |
| En retard | `rouge` | `rouge-soft` |

L'orange de l'état « prêtée » est bien celui du garage : une voiture prêtée, c'est une voiture qui roule.

### Boutons

- **Action principale** (prêter, enregistrer, entrer) : grand bouton `nuit`, texte `on-nuit`.
- **Appeler le client** : bouton rond `nuit`, téléphone blanc (`on-nuit`). Appeler est une action, pas un état, donc jamais vert.
- **« Voiture rendue »** : vert, car la voiture redevient disponible.
- **Actions secondaires** (modifier, voir l'historique) : fond `surface`, texte `ink`, filet `line`.
- **Case déjà remplie ou choisie** (date de retour, téléphone, note, client récent) : cadre `nuit`, fond bleu très léger, texte et icône `nuit`. Jamais vert : être rempli ne veut pas dire « disponible ».
- L'orange n'est jamais la couleur d'un bouton.

## Typographie

- **Archivo** (gras 700 et 800) pour le nom du garage, les titres et les gros chiffres. Grasse et carrée, elle se lit de loin, comme une enseigne.
- **Plus Jakarta Sans** pour tout le reste : c'est déjà la police de l'appli, lisible en petit sur un téléphone.
- Les tailles sont dans les styles `affiche`, `titre`, `sous-titre` (Archivo) et `corps`, `corps-fort`, `petit`, `etiquette`, `plaque` (Plus Jakarta Sans). On n'invente pas de taille entre deux.
- Les plaques s'écrivent `AB-123-CD`, en `plaque`, sur fond blanc bordé de `line`, coins `radius-sm`, avec la bande `plaque-ue` à gauche et un F blanc dedans.

## Logo et icône

Le logo est la **silhouette de Golf en trait fin** : basse et allongée, hayon incliné, sans arches au-dessus des roues. C'est le même dessin partout : icône de l'appli, écran de démarrage, écran « Qui es-tu ? », onglet « Prêts ».

- **L'icône de l'appli** : voiture blanche sur un carré `nuit`, coins `radius-icone` (22 % du côté). La voiture occupe environ les trois quarts de la largeur, légèrement remontée.
- **La voiture seule** : en bleu nuit sur fond clair, en blanc sur fond nuit. Jamais en orange, jamais en dégradé, jamais avec une ombre.
- **Avec le nom** : l'icône à gauche, « Canal Mhirsi Service » à droite en Archivo 800, de la hauteur de l'icône à peu près. Sous l'icône Android, l'appli s'appelle « CMS Prêts ».
- **Zone de protection** : au moins `space-8` (32 px) vide autour du logo.
- **Taille minimale** : 24 px de large pour la voiture seule ; en dessous le trait disparaît. En petit (onglets, listes), le trait s'épaissit un peu pour garder le même poids à l'œil.
- On ne déforme pas la voiture, on ne la redessine pas, on ne la met pas dans un cercle.

Les fichiers sont dans [`logos/`](logos/). Le dessin d'origine est dans `scripts/gen-icons.mjs` : c'est lui qui fabrique les icônes de l'appli.

## Formes et espaces

- Les cartes et fenêtres ont des coins `radius-lg` (20 px), les champs et petits blocs `radius-md`, les boutons et pastilles sont ronds (`radius-pill`).
- Les espaces suivent l'échelle `space-1` à `space-8` ; la marge sur les côtés de l'écran est `space-4`.
- Les cartes se détachent par un fond `surface-raised` sur `surface` et un filet `line`, avec une ombre très légère. Pas de bordure colorée sur le côté.
- Le focus clavier est un anneau de 2 px en `focus`.

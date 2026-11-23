# Dune : Genesis

Un jeu de fan jouable dans le navigateur, inspiré des trois films de Denis Villeneuve (*Dune — Première partie*, *Deuxième partie* et la troisième partie, adaptée de *Dune Messie*).
Aucune dépendance, aucun fichier image ou son : tout (terrain d'Arrakis, vers des sables, ornithoptères, musique, bruitages) est généré par le code.

> Projet de fan non officiel et sans but lucratif. *Dune* est l'œuvre de Frank Herbert ; les films appartiennent à leurs ayants droit.

## Lancer le jeu

Ouvrir `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari) — aucun serveur nécessaire.
Ou ouvrir la version autonome `dist/dune-genesis.html` (un seul fichier, régénérable avec `node tools/bundle.mjs`).

Cliquer / appuyer sur une touche au lancement pour activer le son. **F** : plein écran. **Échap** : pause.

## Commandes

| Action | Touches |
|---|---|
| Se déplacer / piloter | `ZQSD` · `WASD` · flèches (ou joystick tactile) |
| Action · valider · sprint · esquive du vol · plongée du ver | `Espace` |
| Marche lente · esquive (duel) | `Maj` |
| Planter le marteleur | `E` |
| Coup rapide (duel) | `J` ou clic |
| Lame lente (duel) | `Espace` (maintenir) |
| Garde (duel) | `S` ou flèche bas |
| Pause · plein écran | `Échap` · `F` |

Une interface tactile (joystick + 4 boutons) apparaît automatiquement sur mobile et tablette.

## L'histoire et le gameplay, chapitre par chapitre

Chaque chapitre est précédé d'une cinématique narrée, et se joue différemment.

| # | Chapitre | Film | Gameplay |
|---|---|---|---|
| Prologue | Caladan | Partie 1 | Cinématique : le décret, les rêves de Paul, la trahison. |
| I | **La Chute** | Partie 1 | Fuite en ornithoptère dans une tempête de sable : esquivez les pointes rocheuses et les tirs télégraphiés des appareils Harkonnen. |
| II | **Le Grand Erg** | Partie 2 | *Marcher sans rythme.* Traversez le désert de roche en roche : des pas réguliers attirent Shai-Hulud. Alternez marche lente, normale et pauses, gérez votre eau, évitez les projecteurs des patrouilles. |
| III | **Shai-Hulud** | Partie 2 | Plantez le marteleur, accrochez-vous au flanc du ver puis chevauchez-le pour détruire des moissonneuses avant que leurs transporteurs ne les évacuent. |
| IV | **L'Eau de Vie** | Partie 2 | Vision : suivez le fil doré du temps à travers les futurs, évitez les gouffres. |
| V | **La Bataille d'Arrakeen** | Partie 2 | Le Mur-Bouclier s'effondre : lancez les Fedaykin (vers alliés) contre les transports impériaux, tourelles et escadrilles. |
| VI | **Le Duel** | Partie 2 | Duel de boucliers contre Feyd-Rautha : le fer rapide rebondit (il fatigue), seule la **lame lente** traverse. Parades parfaites, esquives, interruptions. |
| VII | **Le Messie** | Partie 3 | Douze ans plus tard : le Conseil, un cadeau tleilaxu, une vérité à dire à Chani. Deux choix de dialogue. |
| VIII | **La Marche aveugle** | Partie 3 | Paul, aveugle, marche dans la nuit. Le monde n'existe que par les échos de ses pas et de ses sondes (`Espace`), sous la menace des vers. |

Note : la troisième partie s'appuie sur le roman *Dune Messie* ; les événements montrés sont une libre adaptation.

## Direction artistique

- Palette monochrome orangée d'Arrakis, étalonnage chaud, brume, grain argentique, vignettage et bandes cinéma.
- Caladan gris-vert sous la pluie, Giedi Prime en noir et blanc sous un soleil noir, architecture monolithique.
- Dunes procédurales : profil asymétrique (pente douce au vent, face d'avalanche), rides de sable, ombres portées, outcrops rocheux.
- Ornithoptères à ailes battantes, vers des sables massifs à gueule de cristaux, moissonneuses et transporteurs.
- Musique et sons synthétisés en direct (WebAudio) : drones, chœur synthétique en mode oriental, percussions, vent, grondement des vers.

## Structure du code

```
index.html            page, styles, commandes tactiles
js/core.js            boucle, scènes, entrées, bruit, post-traitement, sous-titres
js/audio.js           musique et bruitages procéduraux
js/world.js           terrain d'Arrakis (dunes, roches) rendu par blocs
js/art.js             décors et sprites vectoriels
js/story.js           chapitres, cinématiques, dialogues (texte du jeu)
js/scene-*.js         menu, vol, traversée (et marche aveugle), chevauchée, vision, duel
tools/bundle.mjs      génère dist/dune-genesis.html (fichier unique)
```

Astuces de développement : `index.html?step=N` lance directement l'étape `N` (0 à 17, voir `G.STEPS` dans `js/story.js`).

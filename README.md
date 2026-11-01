# Livret du citoyen · Parcours

Site d'apprentissage du **Livret du citoyen** (Ministère de l'Intérieur, édition mai 2026) pour préparer l'examen civique et l'entretien d'assimilation de la naturalisation française.

👉 **https://mhchlagou.github.io/fr-livret-citoyen/**

Site d'entraînement non officiel. Le livret officiel reste la référence.

## Fonctionnalités

- Un parcours en 5 parties et des annexes, découpé en 16 sections et en courtes leçons à lire une par une.
- Un résumé « À retenir absolument » à la fin de chaque section.
- Un quiz après chaque section, avec la correction et une explication après chaque réponse. Quand une section compte plus de 20 questions, chaque passage en tire 20 au sort. La section est validée à partir de 80 % de bonnes réponses.
- Des mises en situation : des cas concrets où il faut choisir le bon comportement, comme à l'examen.
- Un examen blanc de 40 questions tirées au hasard dans tout le livret, en 45 minutes, avec 80 % requis pour réussir. Le résultat est détaillé par thème, avec la liste des erreurs à revoir.
- Une page « À retenir » qui regroupe les 146 points clés, avec une recherche et une case « je sais » pour chaque point.
- Une page « Mes erreurs » qui rejoue les questions ratées en quiz ou à l'examen blanc, jusqu'à ce qu'elles soient réussies.
- Une partie bonus « Préparer l'entretien en préfecture » : déroulement, attitude attendue, 24 questions fréquentes avec ce que l'agent cherche, les points à donner et un exemple de réponse, et une simulation où l'on répond à voix haute avant de se noter. Ce guide est rédigé pour le site, il ne vient pas du livret.
- Une application installable sur téléphone, qui fonctionne aussi hors connexion.
- Un thème clair et un thème sombre, et un affichage adapté au mobile.

## Vos données restent sur votre appareil

Le site n'a ni serveur, ni compte, ni base de données. Votre prénom, votre progression, vos scores et l'historique de vos examens blancs sont enregistrés **uniquement dans le navigateur de votre téléphone ou de votre ordinateur** (`localStorage`). Rien n'est envoyé sur internet.

Conséquences :

- Votre progression ne passe pas d'un appareil à l'autre. Le téléphone et l'ordinateur ont chacun leur propre progression.
- Si vous videz les données de votre navigateur ou désinstallez l'application, votre progression est effacée.
- Le bouton « Effacer mes données », en bas de chaque page, supprime tout immédiatement.

Seules les polices de caractères sont chargées depuis Google Fonts. Ce chargement ne transmet aucune de vos données personnelles.

## Installer l'application sur votre téléphone

Sur Android (Chrome), ouvrez le site et touchez le bouton « Installer » sur la page d'accueil. Vous pouvez aussi passer par le menu ⋮, puis « Installer l'application ».

Sur iPhone (Safari), ouvrez le site, touchez le bouton Partager, puis « Sur l'écran d'accueil ».

Une fois installée, l'application s'ouvre en plein écran comme une application classique et fonctionne sans connexion.

## Lancer le site en local

Aucune installation ni étape de compilation n'est nécessaire : c'est du HTML, du CSS et du JavaScript sans dépendance.

```bash
python3 -m http.server 8000
```

Ouvrez ensuite http://localhost:8000. Ouvrir `index.html` directement depuis le disque ne fonctionne pas, car le contenu est chargé par le réseau.

## Organisation du projet

```
index.html               page unique de l'application
manifest.webmanifest     description de l'application installable
sw.js                    service worker (fonctionnement hors ligne)
assets/css/style.css     styles, thèmes clair et sombre
assets/js/app.js         routeur et démarrage
assets/js/quiz.js        moteur de quiz (entraînement et examen)
assets/js/exam.js        règles de l'examen blanc et répartition par thème
assets/js/store.js       sauvegarde locale de la progression
assets/js/welcome.js     fenêtre de bienvenue (prénom) et effacement des données
assets/js/install.js     bouton d'installation de l'application
assets/js/views/         une vue par écran
data/*.json              contenu du livret : leçons, points à retenir, questions
data/entretien.json      guide de l'entretien et fiches de la simulation (`drills`)
```

## Modifier le contenu

Tout le contenu se trouve dans `data/` : un fichier par partie (`p1.json` à `p5.json`) et un pour les annexes (`annexes.json`). Chaque section contient :

- `lessons` : les leçons, composées de blocs (`p`, `h` pour un sous-titre, `details` pour un passage repliable, `list`, `callout`, `quote`, `table`, `timeline`) ;
- `keyFacts` : les points à retenir ;
- `quiz` : les questions, chacune avec 4 choix, l'indice de la bonne réponse (`answer`), une explication (`explain`) et un type (`knowledge` ou `situation`).

Dans les textes, `**gras**` met un mot en valeur. L'examen blanc pioche automatiquement dans toutes les questions : une question ajoutée à une section peut donc aussi tomber à l'examen.

## Déploiement

Le site est publié par GitHub Pages depuis la branche `main`, à la racine. Chaque `git push` sur `main` met le site en ligne en une à deux minutes.

## Sources et corrections

Le contenu a été transcrit à partir du PDF officiel du Livret du citoyen (édition mai 2026). Trois informations du livret, dépassées ou inexactes, ont été corrigées :

- La devise de l'Union européenne, « Unie dans la diversité », a été adoptée en 2000, et non en 2020.
- L'URSS ne faisait pas partie des Alliés qui ont débarqué en Normandie le 6 juin 1944.
- Depuis le 1er janvier 2025, l'espace Schengen compte 29 pays : 25 États membres de l'UE et 4 États associés.

L'orthographe du nom de la peintre Suzanne Valadon (imprimé « Valandon ») a aussi été rectifiée.

Pour chacun de ces trois points, la leçon indique aussi ce que le livret imprime, car un examinateur peut s'appuyer sur le texte officiel. Aucune question de quiz ne porte sur ces chiffres contestés.

Le contenu et chaque réponse de quiz ont été relus contre le PDF, puis contre-vérifiés par une seconde relecture indépendante. Si vous trouvez une erreur, ouvrez une issue sur ce dépôt.

Le format de l'examen blanc (40 questions, 45 minutes, 80 %) suit celui de l'examen civique en vigueur depuis 2026. En cas de doute, vérifiez auprès de votre préfecture.

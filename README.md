# Veille Web — BTS SIO SLAM

Tableau de bord en français consacré à la **veille technologique en développement web** : HTML, CSS, JavaScript, frameworks, accessibilité et sécurité web. Conçu dans la continuité d'une veille de stage basée sur MDN, Grafikart, CSS-Tricks et la pratique de JavaScript.

## Fonctionnalités

- Collecte d'articles via les flux RSS/Atom de CSS-Tricks, web.dev, Smashing Magazine et JavaScript Weekly.
- Mise à jour automatique **chaque lundi** via GitHub Actions (07:00 UTC, 08:00 en hiver et 09:00 en été en France).
- Affichage des articles avec **titre, date, source, résumé extrait du flux d'origine et lien**.
- Recherche, filtres par thème, statistiques, historique par jour de publication, avec calendrier et navigation entre les jours.
- Export **PDF** grâce au bouton « Exporter en PDF », puis sélection « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur.
- Gratuit, sans clé API, pas de base de données ni d'installation de dépendances.

**Note pédagogique :** les titres et résumés des extraits publics sont traduits automatiquement en français via Google Traduction, puis mis en cache dans le JSON. Les noms de produits et termes de code restent inchangés. Les liens ouvrent les sources originales. Ils ne sont pas des synthèses rédigées par IA. Pour le BTS, tu peux enrichir ta veille avec tes propres conclusions et expliquer comment chaque article t'aide à progresser.

## Démarrer en local

Prérequis : Python 3.10+.

```bash
cd veille-web-bts-sio
python scripts/update.py
python -m http.server 8000
```

Ouvrir ensuite http://localhost:8000 dans le navigateur. L'ordinateur doit être connecté pour collecter les flux.

## Activer la mise à jour automatique tous les lundis

1. Créer un nouveau dépôt **GitHub public** et y envoyer **tout le contenu** du dossier, y compris `.github/workflows/veille.yml`.
2. Dans GitHub : **Settings > Pages > Build and deployment**, choisir **GitHub Actions**. Le workflow collecte les articles, enregistre le JSON et publie le site après chaque collecte réussie.
3. Dans GitHub : **Actions > Mise à jour hebdomadaire de la veille > Run workflow** pour effectuer la première collecte sans attendre lundi.
4. Dans **Settings > Actions > General > Workflow permissions**, vérifier que le workflow a le droit d'écrire dans le dépôt (`Read and write permissions`), si nécessaire. Sur certains dépôts ou organisations, les permissions peuvent être limitées : il faut alors les adapter.
5. Attendre la fin du workflow, puis ouvrir l'URL GitHub Pages affichée dans Settings > Pages : `https://<identifiant>.github.io/<nom-du-depot>/`.

La tâche se relance ensuite le lundi grâce à `cron: '0 7 * * 1'`. GitHub Actions peut démarrer avec un certain retard et peut désactiver les workflows planifiés sur un dépôt public inactif pendant une longue période ; vérifier l'onglet Actions de temps en temps.

## Important

- L'automatisation fonctionne **après publication sur GitHub** ; télécharger ou ouvrir le site seul ne met pas automatiquement le fichier à jour.
- Le site **n'invente pas** d'articles si un flux est indisponible. Il conserve l'historique existant et affiche les erreurs de sources.
- Les dates indiquent la publication des articles, et non la date de leur lecture.
- La traduction nécessite l’accès au service Google Traduction sans clé (disponibilité non garantie). En cas d’échec, le workflow échoue et conserve le site précédemment publié. Les flux sont généralement en anglais. MDN et Grafikart restent des ressources recommandées pour approfondir les sujets, mais ne sont pas inclus dans la collecte automatique faute de flux vérifié dans cette version.
- Les données sont publiques dans un dépôt public. N'ajoute pas de données personnelles ou confidentielles dans le JSON.

## Organisation

- `index.html`, `style.css`, `app.js` : interface web
- `scripts/update.py` : collecte et dédoublonnage
- `data/articles.json` : historique des articles
- `.github/workflows/veille.yml` : exécution automatique du lundi

## Historique quotidien

Dans « Historique », sélectionner une date ou un jour disponible. Les boutons précédent/suivant parcourent tous les jours, y compris sans publication. « Tout l’historique » affiche tous les articles archivés. Les dates sont celles de publication, pas celles de collecte. La collecte reste chaque lundi. L’historique collecté est conservé sans suppression automatique ; les jours antérieurs absents des flux ne peuvent pas être reconstitués.

# Lab Reactor — Trello Power-Up interne SEF

Lab Reactor est un Trello Power-Up interne pour simplifier l'organisation des propositions parascolaires de Sciences en Folie.

## Structure importante

- `trello-connector.html` : URL à mettre dans Trello Power-Up admin.
- `powerup.js` : déclare le bouton de carte `Lab Reactor`.
- `app.html` : interface React ouverte par le bouton.
- `src/` : code source React / TypeScript.
- `.github/workflows/deploy-pages.yml` : déploiement automatique vers GitHub Pages.

## Hébergement GitHub Pages

1. Créer un nouveau dépôt GitHub, par exemple `lab-reactor-powerup`.
2. Ajouter tous les fichiers de ce dossier dans le dépôt.
3. Dans GitHub : `Settings` → `Pages` → `Build and deployment`.
4. Choisir `GitHub Actions` comme source.
5. Pousser sur la branche `main`.
6. Attendre que l'action `Deploy Lab Reactor to GitHub Pages` soit verte.
7. L'URL publique sera généralement :

```txt
https://VOTRE_USER.github.io/lab-reactor-powerup/trello-connector.html?v=20260708-github-pages
```

## Configuration Trello

Dans Trello Power-Up admin, mettre comme **URL du connecteur Iframe** :

```txt
https://VOTRE_USER.github.io/lab-reactor-powerup/trello-connector.html?v=20260708-github-pages
```

Puis activer la capacité :

```txt
Boutons de la carte / card-buttons
```

Dans le tableau Trello, désactiver puis réactiver le Power-Up si Trello garde l'ancienne version en cache.

## Tests locaux

```bash
npm ci
npm test
npm run build
npm run preview
```

## Pourquoi cette version corrige le problème

La version GitHub Pages utilise :

- des chemins relatifs (`./powerup.js`) au lieu de chemins à la racine (`/powerup.js`), essentiels pour GitHub Pages;
- une URL d'application calculée dynamiquement depuis le connecteur (`new URL('./app.html', window.location.href)`), donc aucun domaine Netlify codé en dur;
- `base: './'` dans Vite, pour que les fichiers compilés fonctionnent dans un sous-dossier GitHub Pages.

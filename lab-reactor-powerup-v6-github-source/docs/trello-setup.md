# Installation Trello — Lab Reactor

## URL à inscrire dans Trello

Dans l'administration du Power-Up, le champ **URL du connecteur Iframe** doit être :

```text
https://glistening-dusk-286438.netlify.app/trello-connector.html?v=20260708-connector-fix
```

Important : le connecteur Trello n'est pas l'application React. Le connecteur sert seulement à enregistrer les capacités Trello, comme `card-buttons`.

## Structure corrigée

```text
/trello-connector.html  -> charge Trello SDK + /powerup.js
/powerup.js             -> déclare le bouton de carte Lab Reactor
/app.html               -> interface React Lab Reactor ouverte par le bouton
```

## Déploiement Netlify recommandé

Paramètres Netlify :

```text
Build command: npm ci && npm run build
Publish directory: dist
```

Le fichier `netlify.toml` est inclus pour configurer automatiquement ces paramètres et réduire le cache sur les fichiers critiques.

## Test rapide

1. Déployer cette version sur Netlify.
2. Ouvrir `https://glistening-dusk-286438.netlify.app/powerup.js`.
3. Vérifier que la ligne `APP_URL` pointe vers `/app.html`.
4. Dans Trello, enregistrer l'URL du connecteur iframe.
5. Vérifier que la capacité `card-buttons` est activée.
6. Fermer Trello, rouvrir le tableau, ouvrir une carte.
7. Le bouton **Lab Reactor** doit apparaître dans la carte.

## Symptôme corrigé

Avant, Trello pouvait charger `trello-connector.html` comme si c'était l'application React. Ce fichier ne déclarait pas correctement les capacités du Power-Up. Résultat : aucun bouton n'apparaissait sur les cartes.

Cette version sépare clairement le connecteur Trello et l'application React.

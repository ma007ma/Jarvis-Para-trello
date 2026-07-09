# Configuration Trello

## Créer le Power-Up

1. Créez un Power-Up interne Trello nommé `Lab Reactor`.
2. Configurez l'API key dans `.env`.
3. Configurez l'URL iframe vers l'URL HTTPS de l'app Vite déployée.
4. En local, exposez `http://localhost:5173` avec un tunnel HTTPS si Trello doit y accéder.

## Capabilities

Le MVP utilise:

- `card-buttons`: bouton `Lab Reactor` sur une carte.
- `modal`: ouverture du panneau dans une iframe Trello.

Le connecteur signe l'URL du panneau avec `t.signUrl(...)` quand Trello le fournit.

## Initialiser les champs

1. Ouvrez une carte Trello sur le board cible.
2. Cliquez `Lab Reactor`.
3. Cliquez `Initialiser / vérifier les champs SEF`.
4. Le Power-Up crée les champs manquants et les options de listes manquantes sans dupliquer les champs existants.

## Tester la synchro

1. Remplissez la fiche rapide.
2. Attendez `Synchronisé` ou cliquez `Sauvegarder maintenant`.
3. Fermez et rouvrez le Power-Up: les valeurs doivent revenir depuis Trello.
4. Modifiez un Custom Field directement dans Trello.
5. Rouvrez le Power-Up ou cliquez `Synchroniser depuis Trello`.

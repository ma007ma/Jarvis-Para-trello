# Phase 2 : Webhooks Trello et synchronisation temps réel

Le MVP du Lab Reactor repose sur un chargement à l’ouverture et un
bouton manuel de synchronisation. Pour améliorer l’expérience
utilisateur, il est prévu d’implémenter en **phase 2** une
synchronisation quasi instantanée via les **webhooks Trello**.

## Pourquoi des webhooks ?

Les webhooks permettent de recevoir des notifications du serveur
Trello lorsqu’un évènement survient (modification de champ,
déplacement de carte, etc.). Cela évite de poller l’API toutes les
quelques secondes et permet d’actualiser l’interface immédiatement.

## Étapes proposées

1. Mettre en place un serveur backend léger (Node.js ou autres) qui
   expose un endpoint HTTP public (via ngrok ou un domaine). Ce
   serveur recevra les webhooks de Trello.
2. Lors de l’initialisation du Power‑Up ou via une page d’admin,
   enregistrer un webhook pour le board en appelant l’API
   `POST /webhooks` avec l’ID du board et l’URL du serveur.
3. À chaque évènement pertinent (mise à jour de Custom Field), le
   serveur notifie le client (Power‑Up) via WebSocket, SSE ou en
   poussant une mise à jour dans une base de données temps réel.
4. Le client écoute ces notifications et déclenche une relecture des
   champs via `getCardCustomFieldItems`.

## Contraintes

- Les webhooks doivent être associés à une clé et un token Trello
  valides. Ils ne fonctionnent pas pour les boards publics.
- Trello envoie régulièrement des requêtes pour vérifier que
  l’endpoint répond bien (challenge). Il faut renvoyer le paramètre
  `challenge` fourni par Trello.
- L’URL du webhook doit être accessible publiquement.

## Alternatives

Si la mise en place d’un backend est trop lourde pour l’équipe, il est
possible d’augmenter la fréquence de polling dans l’iframe (par
exemple toutes les 5 secondes) mais cela est moins élégant et consomme
plus d’appels API.
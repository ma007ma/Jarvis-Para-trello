# Phase 2: synchronisation temps réel

Le MVP synchronise à l'ouverture, au focus, par bouton manuel et par autosave debounce.

## Objectif phase 2

Ajouter une synchronisation quasi instantanée quand un Custom Field est modifié directement dans Trello.

## Architecture proposée

1. Backend léger Node/TypeScript.
2. Webhooks Trello sur les boards concernés.
3. Endpoint webhook idempotent.
4. Canal temps réel vers l'iframe ouverte: SSE ou WebSocket.
5. Relecture ciblée des Custom Fields de la carte.

## Garde-fous

- Les Custom Fields Trello restent la source de vérité.
- Pas de base métier parallèle.
- Tokens Trello côté serveur seulement.
- `sef_sync_hash` continue d'éviter les boucles.

# Registre des champs

Le registre central est `src/config/fieldRegistry.ts`.

Chaque champ contient:

- clé interne;
- nom affiché Trello;
- type;
- options si liste;
- section UI;
- description.

## Sections

- Identité
- Session / programme
- Duplication
- Jalons session 1
- Jalons session 2
- Jalons session 3
- Validation / technique

## Important

Aucun champ financier n'est inclus dans le MVP. Les Custom Fields couvrent seulement l'organisation parascolaire: école, contact, session, programme, horaire, jalons, validation et URL du futur widget calculatrice.

## Mapping Trello

- Les listes utilisent `idValue`.
- Les nombres utilisent `value.number` sous forme de chaîne.
- Les dates sont envoyées en ISO.
- Les champs vides sont supprimés de la carte.
- `sef_sync_hash` évite les boucles de sauvegarde.

# Lab Reactor Power-Up

MVP interne de Power-Up Trello pour Sciences en Folie. Lab Reactor aide les vendeurs à organiser les parascolaires sous forme de fiche école, calendrier scolaire, sessions et jalons.

## Principe

Les Custom Fields Trello sont la source de vérité. Le Power-Up ne crée pas de base métier parallèle.

- Ouverture du panneau: lecture des Custom Fields de la carte.
- Modification dans Lab Reactor: sauvegarde automatique dans Trello avec debounce.
- Modification directe dans Trello: visible à la prochaine ouverture ou au clic `Synchroniser depuis Trello`.
- Statuts de synchro: `Synchronisé`, `Sauvegarde...`, `Erreur`.

## Hors périmètre MVP

La calculatrice est complètement exclue du MVP. Aucun champ financier n'est créé: pas de prix, taxes, revenus, rabais, marge, profit, coût labo ou extras de transport.

Le bouton `Ouvrir widget calculatrice` ouvre seulement l'URL stockée dans `sef_pricing_widget_url` si elle existe. Le widget sera livré séparément plus tard.

## Lancer localement

```bash
pnpm install
pnpm dev
```

Build et tests:

```bash
pnpm test
pnpm run build
```

Copiez `.env.example` vers `.env` et configurez:

```bash
VITE_TRELLO_API_KEY=your_trello_power_up_api_key
VITE_TRELLO_API_BASE=https://api.trello.com/1
```

Ne stockez jamais de token Trello en dur.

## Déploiement GitHub Pages

Le dépôt cible est `ma007ma/Jarvis-Para-trello`.

URL publique après déploiement:

```text
https://ma007ma.github.io/Jarvis-Para-trello/
```

Dans l'admin Trello du Power-Up, utilisez cette URL comme connecteur iframe:

```text
https://ma007ma.github.io/Jarvis-Para-trello/
```

Le bouton de carte ouvre automatiquement le panneau Lab Reactor avec `?panel=lab`.

Avant le premier déploiement GitHub Actions, ajoutez le secret du dépôt:

```text
VITE_TRELLO_API_KEY
```

La valeur attendue est la clé API du Power-Up Trello. Ne mettez pas de token Trello dans GitHub: l'autorisation utilisateur passe par le SDK Trello Power-Up.

## Fonctionnalités MVP

- Bouton de carte Trello `Lab Reactor`.
- Fiche rapide éditable: contact, programme, horaire, école, session, niveaux, journée.
- Calendrier scolaire juillet à août selon `sef_school_year`.
- Sessions 1, 2 et 3 avec jalons colorés.
- Cours 1 à 8 dérivés du début des cours.
- Validation opérationnelle.
- Nettoyage après duplication avec choix de vider ou conserver les dates.
- Résumé et CSV.
- Initialisation automatique des Custom Fields SEF.

## Documents

- [Configuration Trello](docs/trello-setup.md)
- [Registre des champs](docs/field-registry.md)
- [UIX Lab Reactor](docs/uiux-lab-reactor.md)
- [Phase 2 widget calculatrice](docs/phase-2-calculator-widget.md)
- [Phase 2 webhooks](docs/phase-2-webhooks.md)

# Registre des champs personnalisés SEF

Le fichier `src/config/fieldRegistry.ts` centralise la définition de tous
les **champs personnalisés** utilisés par Sciences En Folie dans le
Power‑Up Lab Reactor. Chaque entrée du registre décrit :

| Propriété    | Description                                                                    |
|--------------|--------------------------------------------------------------------------------|
| `key`        | Identifiant interne utilisé dans le code. Ne doit jamais changer une fois publié. |
| `name`       | Nom affiché dans Trello et dans l’interface du Power‑Up.                        |
| `type`       | Type de champ (`text`, `number`, `date`, `checkbox`, `list`).                  |
| `options`    | Liste des valeurs possibles pour les listes déroulantes. Contient également l’`id` généré par Trello après création. |
| `description`| Texte facultatif pour documenter le champ.                                       |
| `section`    | Section logique de l’interface (Identité, Session, Options, etc.).             |

Ce registre sert à :

1. **Créer les champs manquants** lors de l’initialisation du board. La fonction `ensureCustomFields` parcourt le registre, compare avec les champs existants sur le board et en crée de nouveaux si besoin.
2. **Mapper les données Trello** vers un objet JavaScript (`LabState`) en utilisant `mapTrelloToLabState`.
3. **Générer des formulaires dynamiques** dans l’interface React. Le composant `App.tsx` itère sur le registre pour afficher un champ adapté.
4. **Encoder les mises à jour** avant envoi vers Trello avec `mapLabStateToTrelloPayload`.

Pour ajouter un nouveau champ :

1. Ajouter un objet dans `fieldRegistry` avec les propriétés nécessaires.
2. Mettre à jour la liste des champs requis dans `validationEngine.ts` si le champ est obligatoire.
3. Exécuter la commande d’initialisation des champs sur un board afin de créer le champ dans Trello.

### Exemple de définition

```ts
{
  key: 'sef_distance_km',
  name: 'Distance aller‑retour km',
  type: 'number',
  section: 'OPTIONS',
}
```

Les options pour les listes sont définies comme ceci :

```ts
{
  key: 'sef_status',
  name: 'Statut',
  type: 'list',
  options: [
    { value: 'Brouillon' },
    { value: 'Prêt à présenter' },
  ],
  section: 'SESSION',
}
```

Lors de l’initialisation, chaque valeur reçoit un `id` retourné par Trello et stocké dans l’objet `options`. Ce `id` est utilisé lors de l’envoi des valeurs vers Trello (`idValue`).
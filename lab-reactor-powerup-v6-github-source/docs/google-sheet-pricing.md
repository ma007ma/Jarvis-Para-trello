# Intégration Google Sheet pour la tarification

La tarification des programmes parascolaires est actuellement gérée
dans un Google Sheet accessible à l’équipe SEF. Ce module décrit
comment récupérer les valeurs de prix et calculer les champs de
tarification dans le Power‑Up.

## Objectif

- Centraliser la logique de tarification dans un module séparé.
- Permettre au Power‑Up d’afficher des prix indicatifs pour chaque
  programme, en fonction du nombre de semaines, du nombre d’enfants
  inscrits et des options sélectionnées.
- Faire en sorte que l’intégration ne bloque pas le MVP : si
  l’adaptateur ne renvoie rien, l’interface reste utilisable et les
  champs de prix peuvent être remplis manuellement.

## Approche proposée (Phase 2)

1. Publier le Google Sheet en lecture seule via un lien ou une API.
2. Dans `src/adapters/googleSheetPricingAdapter.ts`, utiliser `fetch`
   pour télécharger le CSV ou la JSON du Sheet.
3. Parser le tableau et construire un objet de tarifs par programme et
   par option.
4. Dans `src/domain/pricingEngine.ts`, combiner les données du Sheet
   avec le `LabState` pour calculer :
   - Prix par enfant avant taxes et taxes incluses.
   - Prix par labo.
   - Total des revenus et des rabais.
   - Marges estimées.
5. Mettre à jour les champs correspondants via `updateCardCustomFields`.

## À court terme (MVP)

Le fichier `src/adapters/googleSheetPricingAdapter.ts` renvoie
actuellement un objet vide. Les valeurs de prix peuvent donc être
entrées à la main ou calculées avec des valeurs de base définies dans
`src/config/pricingFallback.config.ts`.

## Points d’attention

- Veiller à ne pas exposer de clés d’API Google dans le code client.
- Implémenter un système de cache ou de mise à jour ponctuelle pour
  éviter des appels trop fréquents au Sheet.
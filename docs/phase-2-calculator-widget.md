# Phase 2: widget calculatrice

La calculatrice est exclue du MVP Lab Reactor.

## Pourquoi

Le MVP doit rester un outil d'organisation parascolaire fiable: fiche école, calendrier scolaire, sessions et jalons. La tarification sera développée comme widget séparé pour éviter de mélanger organisation et calcul financier.

## Champ prévu

`sef_pricing_widget_url` peut contenir l'URL du futur widget. Le bouton `Ouvrir widget calculatrice` ouvre cette URL dans un nouvel onglet si elle est configurée.

## Recommandation

Le futur widget devrait être une app séparée, avec ses propres tests, sa propre sécurité et son propre cycle de validation. Lab Reactor pourra lui transmettre le contexte de carte via URL signée ou backend léger en phase 2.

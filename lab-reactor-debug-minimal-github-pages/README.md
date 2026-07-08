# Lab Reactor - Diagnostic Minimal

Ce dépôt sert à isoler le problème Trello Power-Up.

## Étapes

1. Dépose tous ces fichiers à la racine du dépôt `Jarvis-Para-trello`.
2. Active GitHub Pages : Settings → Pages → Deploy from branch → main → /root.
3. Teste cette URL dans ton navigateur :
   https://ma007ma.github.io/Jarvis-Para-trello/index.html
4. Dans Trello Power-Up admin, mets :
   https://ma007ma.github.io/Jarvis-Para-trello/trello-connector.html?v=debug-minimal-20260708
5. Vérifie que `card-buttons` est activé.
6. Désactive/réactive le Power-Up dans ton tableau Trello, puis Ctrl+Shift+R.
7. Ouvre une carte. Le bouton doit s'appeler : Lab Reactor TEST.

Si ce bouton apparaît, Trello + GitHub Pages fonctionnent. On remet ensuite la vraie application.
Si le bouton n'apparaît pas, le problème est dans l'activation Trello / URL connecteur / cache / mauvais Power-Up.

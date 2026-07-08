/* Trello Power‑Up client script.
 *
 * This module registers the capabilities required by the Lab Reactor.
 * It exposes a card button that opens the main Lab Reactor interface
 * in a modal. Trello will execute this script in the context of the
 * Power‑Up iframe to populate the card menu and other capabilities.
 */

declare const window: any;

// Ensure the global TrelloPowerUp SDK is available. When running in
// Trello, the script at https://p.trellocdn.com/power-up.min.js
// injects window.TrelloPowerUp.
const TrelloPowerUp = window.TrelloPowerUp;

TrelloPowerUp.initialize({
  /**
   * card-buttons capability.
   * Adds a button to the top of every card that launches the Lab Reactor modal.
   */
  'card-buttons': function (t: any, opts: any) {
    return [
      {
        text: 'Lab Reactor',
          condition: 'always',
        callback: function () {
          return t.modal({
            url: './trello-connector.html',
            title: 'Lab Reactor',
            fullscreen: true,
          });
        },
      },
    ];
  },
});
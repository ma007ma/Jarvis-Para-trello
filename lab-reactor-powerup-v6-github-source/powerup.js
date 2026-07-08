// Lab Reactor Trello Power-Up connector script.
// This file is loaded by /trello-connector.html and registers Trello capabilities.

/* global TrelloPowerUp */

(function () {
  var APP_URL = 'https://glistening-dusk-286438.netlify.app/app.html?v=20260708-connector-fix';

  if (typeof TrelloPowerUp === 'undefined') {
    console.error('Lab Reactor: TrelloPowerUp SDK is not available.');
    return;
  }

  TrelloPowerUp.initialize({
    'card-buttons': function (t) {
      return [
        {
          text: 'Lab Reactor',
          callback: function () {
            return t.modal({
              url: APP_URL,
              title: 'Lab Reactor',
              fullscreen: true,
            });
          },
        },
      ];
    },
  });
})();

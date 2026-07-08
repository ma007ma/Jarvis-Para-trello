// Lab Reactor Trello Power-Up connector script.
// This file is loaded by /trello-connector.html and registers Trello capabilities.
// It is host-agnostic: it works on GitHub Pages, Netlify, Vercel, or any HTTPS static host.

/* global TrelloPowerUp */

(function () {
  var VERSION = '20260708-github-pages';
  var APP_URL = new URL('./app.html?v=' + VERSION, window.location.href).href;

  if (typeof TrelloPowerUp === 'undefined') {
    console.error('Lab Reactor: TrelloPowerUp SDK is not available.');
    return;
  }

  TrelloPowerUp.initialize({
    'card-buttons': function (t) {
      return [
        {
          text: 'Lab Reactor',
          condition: 'always',
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

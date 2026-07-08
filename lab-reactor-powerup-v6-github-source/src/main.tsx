import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// When running inside a Trello Power‑Up iframe, `window.TrelloPowerUp`
// is available. It can be used to fetch parameters like board and
// card IDs. During local development these may be supplied via
// query parameters or environment variables.
declare const window: any;

function bootstrap() {
  let boardId = '';
  let cardId = '';
  try {
    if (window.TrelloPowerUp) {
      const t = window.TrelloPowerUp.iframe();
      boardId = t.arg('boardId');
      cardId = t.arg('cardId');
    } else {
      // Fallback for local development: read from query string
      const params = new URLSearchParams(window.location.search);
      boardId = params.get('board') || '';
      cardId = params.get('card') || '';
    }
  } catch (err) {
    console.warn('Unable to obtain Trello context', err);
  }
  const container = document.getElementById('root');
  if (!container) return;
  const root = createRoot(container);
  root.render(<App boardId={boardId} cardId={cardId} />);
}

bootstrap();
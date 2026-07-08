import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This file is the entrypoint for the Trello iframe. It uses the
// Trello Power‑Up SDK to obtain the board and card context, then
// mounts the Lab Reactor app with the appropriate identifiers.
declare const window: any;

async function init() {
  // The Trello Power‑Up SDK exposes itself on window. Using iframe()
  // yields a t object scoped to this iframe. See:
  // https://developer.atlassian.com/cloud/trello/power-ups/iframe/
  const t = window.TrelloPowerUp?.iframe?.();

  // When running inside Trello, getContext returns an object with
  // identifiers like board, card, and member. Use these to load
  // custom field data.
  let boardId = '';
  let cardId = '';
  if (t && t.getContext) {
    try {
      const ctx = await t.getContext();
      boardId = ctx.board || '';
      cardId = ctx.card || '';
    } catch (err) {
      console.warn('Unable to obtain Trello context', err);
    }
  } else {
    // Fallback for local development: read from query string
    const params = new URLSearchParams(window.location.search);
    boardId = params.get('board') || '';
    cardId = params.get('card') || '';
  }

  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App boardId={boardId} cardId={cardId} />);
  }
}

init().catch(err => {
  console.error('Failed to initialise Lab Reactor iframe:', err);
});
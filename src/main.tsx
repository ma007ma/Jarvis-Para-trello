import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const POWER_UP_URL = './index.html?panel=lab';
const isPanel = new URLSearchParams(window.location.search).get('panel') === 'lab';
type TrelloModalContext = { modal: (options: Record<string, unknown>) => Promise<void>; signUrl?: (url: string) => string };

function openLabReactor(t: TrelloModalContext) {
  return t.modal({
    title: 'Lab Reactor',
    url: t.signUrl ? t.signUrl(POWER_UP_URL) : POWER_UP_URL,
    height: 920,
    fullscreen: true,
  });
}

if (window.TrelloPowerUp && !isPanel) {
  window.TrelloPowerUp.initialize({
    'card-buttons': () => [
      {
        text: 'Lab Reactor',
        callback: openLabReactor,
      },
    ],
    'board-buttons': () => [
      {
        text: 'Lab Reactor',
        callback: openLabReactor,
      },
    ],
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

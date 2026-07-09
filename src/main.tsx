import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const POWER_UP_URL = './lab.html?panel=lab&v=lab-reactor-card-view';
const isPanel = new URLSearchParams(window.location.search).get('panel') === 'lab';
type TrelloModalContext = { modal: (options: Record<string, unknown>) => Promise<void>; signUrl?: (url: string) => string };

function getSignedPanelUrl(t: { signUrl?: (url: string) => string }) {
  return t.signUrl ? t.signUrl(POWER_UP_URL) : POWER_UP_URL;
}

function openLabReactor(t: TrelloModalContext) {
  return t.modal({
    title: 'Lab Reactor',
    url: getSignedPanelUrl(t),
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
    'card-back-section': (t: { signUrl?: (url: string) => string }) => ({
      title: 'Lab Reactor',
      icon: 'https://ma007ma.github.io/Jarvis-Para-trello/favicon.svg',
      content: {
        type: 'iframe',
        url: getSignedPanelUrl(t),
        height: 760,
      },
    }),
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

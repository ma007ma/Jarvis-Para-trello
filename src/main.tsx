import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const POWER_UP_URL = './index.html?panel=lab';
const isPanel = new URLSearchParams(window.location.search).get('panel') === 'lab';

if (window.TrelloPowerUp && !isPanel) {
  window.TrelloPowerUp.initialize({
    'card-buttons': () => [
      {
        text: 'Lab Reactor',
        callback: (t: { modal: (options: Record<string, unknown>) => Promise<void>; signUrl?: (url: string) => string }) =>
          t.modal({
            title: 'Lab Reactor',
            url: t.signUrl ? t.signUrl(POWER_UP_URL) : POWER_UP_URL,
            height: 720,
            fullscreen: false,
          }),
      },
    ],
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

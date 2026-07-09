import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const API_KEY = 'a9936eee9f445b63329fe1ab29b41e1f';
const API_BASE = 'https://api.trello.com/1';
const ICON_URL = 'https://ma007ma.github.io/Jarvis-Para-trello/icon-gray.svg';
const isPanel = new URLSearchParams(window.location.search).get('panel') === 'lab';
type TrelloModalContext = {
  alert?: (options: Record<string, unknown>) => Promise<void>;
  board: (fields: string) => Promise<{ id?: string }>;
  card?: (...fields: string[]) => Promise<{ id?: string; name?: string }>;
  getRestApi?: () => {
    getToken: () => Promise<string | null>;
    authorize: (options: Record<string, unknown>) => Promise<string | null>;
  } | Promise<{
    getToken: () => Promise<string | null>;
    authorize: (options: Record<string, unknown>) => Promise<string | null>;
  }>;
  modal: (options: Record<string, unknown>) => Promise<void>;
  signUrl?: (url: string) => string;
};

function getSignedUrl(t: { signUrl?: (url: string) => string }, url: string) {
  return t.signUrl ? t.signUrl(url) : url;
}

async function getPanelUrlWithContext(t: TrelloModalContext) {
  const [board, card] = await Promise.all([
    t.board('id').catch(() => null),
    t.card ? t.card('id', 'name').catch(() => null) : Promise.resolve(null),
  ]);
  const params = new URLSearchParams({ panel: 'lab', v: 'lab-reactor-20260709-plugin-data1' });
  if (board?.id) params.set('boardId', board.id);
  if (card?.id) params.set('cardId', card.id);
  if (card?.name) params.set('cardName', card.name);
  return `./lab.html?${params.toString()}`;
}

async function openLabReactor(t: TrelloModalContext) {
  const url = await getPanelUrlWithContext(t);
  return t.modal({
    title: 'Lab Reactor',
    url: getSignedUrl(t, url),
    height: 920,
    fullscreen: true,
  });
}

async function getToken(t: TrelloModalContext) {
  const restApi = await Promise.resolve(t.getRestApi?.());
  if (!restApi) return null;
  const existingToken = await restApi.getToken();
  if (existingToken) return existingToken;
  return restApi.authorize({
    scope: 'read,write',
    expiration: 'never',
    name: 'Lab Reactor',
  });
}

async function trelloFetch<T>(path: string, token: string, options: RequestInit & { query?: Record<string, string> } = {}) {
  const url = new URL(API_BASE + path);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('token', token);
  Object.entries(options.query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), options);
  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }
  return response.json() as Promise<T>;
}

async function alertUser(t: TrelloModalContext, message: string) {
  if (t.alert) {
    await t.alert({ message, duration: 8, display: 'error' });
  }
}

async function createLabCard(t: TrelloModalContext) {
  try {
    const [board, token] = await Promise.all([t.board('id'), getToken(t)]);
    const boardId = board.id;
    if (!boardId || !token) throw new Error('Autorisation Trello manquante.');

    const lists = await trelloFetch<Array<{ id: string }>>(`/boards/${boardId}/lists?filter=open`, token);
    if (!lists.length) throw new Error('Aucune liste ouverte trouvee sur ce tableau.');

    const card = await trelloFetch<{ id: string; name: string }>('/cards', token, {
      method: 'POST',
      query: {
        idList: lists[0].id,
        name: 'Nouvelle fiche Lab Reactor',
        desc: 'Fiche creee depuis le Power-Up Lab Reactor.',
      },
    });

    const url = `./lab.html?panel=lab&mode=create&boardId=${encodeURIComponent(boardId)}&cardId=${encodeURIComponent(card.id)}&cardName=${encodeURIComponent(card.name)}&v=lab-reactor-20260709-plugin-data1`;
    await t.modal({
      title: 'Lab Reactor',
      url: getSignedUrl(t, url),
      height: 920,
      fullscreen: true,
    });
  } catch (error) {
    await alertUser(t, `Lab Reactor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function openBoardCreatePanel(t: TrelloModalContext) {
  try {
    const board = await t.board('id');
    const boardId = board.id ?? '';
    const url = `./lab.html?panel=lab&mode=board-create&boardId=${encodeURIComponent(boardId)}&v=lab-reactor-20260709-plugin-data1`;
    await t.modal({
      title: 'Créer fiche Lab Reactor',
      url: getSignedUrl(t, url),
      height: 920,
      fullscreen: true,
    });
  } catch (error) {
    await alertUser(t, `Lab Reactor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (window.TrelloPowerUp && !isPanel) {
  window.TrelloPowerUp.initialize({
    'card-buttons': () => [
      {
        text: 'Lab Reactor',
        icon: ICON_URL,
        callback: openLabReactor,
      },
    ],
    'board-buttons': () => [
      {
        text: 'Créer fiche Lab Reactor',
        icon: ICON_URL,
        callback: openBoardCreatePanel,
      },
    ],
    'card-back-section': async (t: TrelloModalContext) => {
      const url = await getPanelUrlWithContext(t);
      return {
        title: 'Lab Reactor',
        icon: ICON_URL,
        content: {
          type: 'iframe',
          url: getSignedUrl(t, url),
          height: 760,
        },
        action: {
          text: 'Ouvrir en grand',
          callback: openLabReactor,
        },
      };
    },
  }, {
    appKey: API_KEY,
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

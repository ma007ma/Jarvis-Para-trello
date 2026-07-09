import {
  COURSE_DATE_FIELD_KEYS,
  FIELD_BY_TRELLO_NAME,
  FIELD_REGISTRY,
  TECHNICAL_FIELD_KEYS,
  VISIBLE_TRELLO_FIELD_REGISTRY,
  type FieldDefinition,
  type FieldKey,
} from '../config/fieldRegistry';
import { createEmptyLabState, isEmptyLabValue, type LabState, type LabValue } from '../domain/labState';

export interface TrelloCustomFieldOption {
  id: string;
  value: { text?: string };
}

export interface TrelloCustomField {
  id: string;
  name: string;
  type: FieldDefinition['type'];
  options?: TrelloCustomFieldOption[];
}

export interface TrelloCustomFieldItem {
  idCustomField: string;
  idValue?: string;
  value?: {
    text?: string;
    number?: string;
    date?: string;
    checked?: string;
  };
}

export interface FieldMappingEntry {
  key: FieldKey;
  trelloName: string;
  id: string;
  type: FieldDefinition['type'];
  options: Record<string, string>;
}

export type FieldMapping = Record<FieldKey, FieldMappingEntry>;

export interface EnsureCustomFieldsResult {
  created: string[];
  present: string[];
  optionsCreated: string[];
  errors: string[];
  mapping: Partial<FieldMapping>;
}

export interface TrelloFieldPayload {
  fieldKey: FieldKey;
  idCustomField: string;
  idValue?: string;
  value?: {
    text?: string;
    number?: string;
    date?: string;
    checked?: string;
  };
  empty?: boolean;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  url?: string;
  shortUrl?: string;
}

export const LAB_REACTOR_PAYLOAD_FIELD_NAME = 'Lab Reactor payload';
const DESCRIPTION_PAYLOAD_START = '<!-- LAB_REACTOR_PAYLOAD_START';
const DESCRIPTION_PAYLOAD_END = 'LAB_REACTOR_PAYLOAD_END -->';

interface ClientOptions {
  apiKey?: string;
  apiBase?: string;
  fetcher?: typeof fetch;
  tokenProvider?: () => Promise<string | null>;
}

const DEFAULT_API_BASE = import.meta.env.VITE_TRELLO_API_BASE || 'https://api.trello.com/1';
const TRELLO_IFRAME_OPTIONS = {
  appKey: import.meta.env.VITE_TRELLO_API_KEY ?? 'a9936eee9f445b63329fe1ab29b41e1f',
  appName: 'Lab Reactor',
};
const REQUEST_SPACING_MS = 350;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class TrelloCustomFieldsClient {
  private static requestQueue: Promise<unknown> = Promise.resolve();
  private static lastRequestAt = 0;
  private readonly apiKey?: string;
  private readonly apiBase: string;
  private readonly fetcher: typeof fetch;
  private readonly tokenProvider: () => Promise<string | null>;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? import.meta.env.VITE_TRELLO_API_KEY;
    this.apiBase = options.apiBase ?? DEFAULT_API_BASE;
    this.fetcher = options.fetcher ?? fetch.bind(globalThis);
    this.tokenProvider = options.tokenProvider ?? getPowerUpToken;
  }

  async getBoardCustomFields(boardId: string): Promise<TrelloCustomField[]> {
    return this.request<TrelloCustomField[]>(`/boards/${boardId}/customFields`);
  }

  async getCardCustomFieldItems(cardId: string): Promise<TrelloCustomFieldItem[]> {
    return this.request<TrelloCustomFieldItem[]>(`/cards/${cardId}/customFieldItems`);
  }

  async ensureTextCustomField(boardId: string, name: string): Promise<TrelloCustomField> {
    const existing = await this.getBoardCustomFields(boardId);
    const found = existing.find((field) => field.name === name);
    if (found) return found;

    return this.request<TrelloCustomField>('/customFields', {
      method: 'POST',
      body: {
        idModel: boardId,
        modelType: 'board',
        name,
        type: 'text',
        pos: 'bottom',
        display: { cardFront: false },
      },
    });
  }

  async readCardTextCustomField(boardId: string, cardId: string, name: string): Promise<string | null> {
    const [fields, items] = await Promise.all([this.getBoardCustomFields(boardId), this.getCardCustomFieldItems(cardId)]);
    const field = fields.find((candidate) => candidate.name === name);
    if (!field) return null;
    const item = items.find((candidate) => candidate.idCustomField === field.id);
    return item?.value?.text ?? null;
  }

  async writeCardTextCustomField(boardId: string, cardId: string, name: string, value: string): Promise<void> {
    const field = await this.ensureTextCustomField(boardId, name);
    await this.request<void>(`/cards/${cardId}/customField/${field.id}/item`, {
      method: 'PUT',
      body: { value: { text: value } },
    });
  }

  async ensureCustomFields(boardId: string, definitions: readonly FieldDefinition[] = VISIBLE_TRELLO_FIELD_REGISTRY): Promise<EnsureCustomFieldsResult> {
    const result: EnsureCustomFieldsResult = {
      created: [],
      present: [],
      optionsCreated: [],
      errors: [],
      mapping: {},
    };

    let existing = await this.getBoardCustomFields(boardId);

    for (const definition of definitions) {
      try {
        let field = existing.find((candidate) => candidate.name === definition.trelloName);

        if (!field) {
          field = await this.request<TrelloCustomField>('/customFields', {
            method: 'POST',
            body: {
              idModel: boardId,
              modelType: 'board',
              name: definition.trelloName,
              type: definition.type,
              pos: 'bottom',
              display: { cardFront: true },
            },
          });
          result.created.push(definition.trelloName);
          existing = [...existing, field];
        } else {
          result.present.push(definition.trelloName);
        }

        if (definition.type === 'list') {
          const existingOptions = new Set((field.options ?? []).map((option) => option.value.text ?? ''));
          for (const optionText of definition.options ?? []) {
            if (!existingOptions.has(optionText)) {
              const createdOption = await this.request<TrelloCustomFieldOption>(`/customFields/${field.id}/options`, {
                method: 'POST',
                body: { value: { text: optionText } },
              });
              result.optionsCreated.push(`${definition.trelloName}: ${optionText}`);
              field.options = [...(field.options ?? []), createdOption];
            }
          }
        }

        result.mapping[definition.key as FieldKey] = toMappingEntry(definition, field);
      } catch (error) {
        result.errors.push(`${definition.trelloName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  async updateCardCustomFields(cardId: string, items: TrelloFieldPayload[]): Promise<void> {
    const writableItems = items.filter((item) => !item.empty);
    if (!writableItems.length) return;

    await this.request<void>(`/cards/${cardId}/customFields`, {
      method: 'PUT',
      body: {
        customFieldItems: writableItems.map((item) => (
          item.idValue
            ? { idCustomField: item.idCustomField, idValue: item.idValue }
            : { idCustomField: item.idCustomField, value: item.value ?? {} }
        )),
      },
    });
  }

  async getOpenLists(boardId: string): Promise<TrelloList[]> {
    return this.request<TrelloList[]>(`/boards/${boardId}/lists`, {
      query: { filter: 'open' },
    });
  }

  async createCard(idList: string, name: string, desc: string): Promise<TrelloCard> {
    return this.request<TrelloCard>('/cards', {
      method: 'POST',
      query: { idList, name, desc },
    });
  }

  async getCard(cardId: string): Promise<TrelloCard> {
    return this.request<TrelloCard>(`/cards/${cardId}`, {
      query: { fields: 'id,name,desc,url,shortUrl' },
    });
  }

  async updateCardDescription(cardId: string, desc: string): Promise<void> {
    await this.request<void>(`/cards/${cardId}`, {
      method: 'PUT',
      body: new URLSearchParams({ desc }),
    });
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
    const url = new URL(`${this.apiBase}${path}`);
    const token = await this.tokenProvider();

    if (!this.apiKey) {
      throw new Error('Cle API Trello manquante. Configurez VITE_TRELLO_API_KEY.');
    }

    url.searchParams.set('key', this.apiKey);
    if (token) {
      url.searchParams.set('token', token);
    }
    Object.entries(options.query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

    return TrelloCustomFieldsClient.enqueueRequest(() => this.fetchWithRetry<T>(url.toString(), options));
  }

  private async fetchWithRetry<T>(url: string, options: { method?: string; body?: unknown; query?: Record<string, string> }): Promise<T> {
    const isFormBody = options.body instanceof URLSearchParams;
    const requestInit: RequestInit = {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': isFormBody ? 'application/x-www-form-urlencoded;charset=UTF-8' : 'application/json' } : undefined,
      body: options.body ? (isFormBody ? options.body.toString() : JSON.stringify(options.body)) : undefined,
    };

    let lastMessage = '';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(url, requestInit);
      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }

        return response.json() as Promise<T>;
      }

      lastMessage = await response.text().catch(() => response.statusText);
      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === 3) {
        throw new Error(`Trello ${response.status}: ${lastMessage || response.statusText}`);
      }

      await sleep(getRetryDelay(response, attempt));
    }

    throw new Error(lastMessage || 'Erreur Trello inconnue.');
  }

  private static enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const waitFor = REQUEST_SPACING_MS - (Date.now() - TrelloCustomFieldsClient.lastRequestAt);
      if (waitFor > 0) await sleep(waitFor);
      TrelloCustomFieldsClient.lastRequestAt = Date.now();
      return task();
    };

    const next = TrelloCustomFieldsClient.requestQueue.then(run, run);
    TrelloCustomFieldsClient.requestQueue = next.catch(() => undefined);
    return next;
  }
}

export async function getPowerUpToken(): Promise<string | null> {
  const iframe = window.TrelloPowerUp?.iframe?.(TRELLO_IFRAME_OPTIONS);
  const restApi = await Promise.resolve(iframe?.getRestApi?.());
  if (!restApi) {
    return null;
  }

  const existing = await restApi.getToken();
  if (existing) {
    return existing;
  }

  return restApi.authorize({
    scope: 'read,write',
    expiration: 'never',
    name: 'Lab Reactor',
  });
}

export function buildFieldMapping(fields: TrelloCustomField[]): Partial<FieldMapping> {
  return Object.fromEntries(
    fields.flatMap((field) => {
      const definition = FIELD_BY_TRELLO_NAME[field.name];
      return definition ? [[definition.key, toMappingEntry(definition, field)]] : [];
    }),
  ) as Partial<FieldMapping>;
}

export function mapTrelloToLabState(fields: TrelloCustomField[], items: TrelloCustomFieldItem[]): LabState {
  const state = createEmptyLabState();
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const itemByFieldId = new Map(items.map((item) => [item.idCustomField, item]));

  for (const field of fields) {
      const definition = FIELD_BY_TRELLO_NAME[field.name];
      if (!definition) continue;

      const item = itemByFieldId.get(field.id);
    state[definition.key as FieldKey] = readItemValue(definition, field, item);
  }

  return state;
}

export function mapLabStateToTrelloPayload(state: LabState, mapping: Partial<FieldMapping>): TrelloFieldPayload[] {
  const nextHash = calculateSyncHash(state);
  if (state.sef_sync_hash === nextHash) {
    return [];
  }

  const stateWithTechnicalValues: LabState = {
    ...state,
    sef_validation_score: normalizeNumber(state.sef_validation_score),
    sef_last_synced_at: new Date().toISOString(),
    sef_sync_hash: nextHash,
  };

  return FIELD_REGISTRY.flatMap<TrelloFieldPayload>((definition) => {
    if (COURSE_DATE_FIELD_KEYS.includes(definition.key as FieldKey)) return [];
    const mappingEntry = mapping[definition.key];
    if (!mappingEntry) return [];

    const value = stateWithTechnicalValues[definition.key];
    if (isEmptyLabValue(value)) {
      return [{ fieldKey: definition.key, idCustomField: mappingEntry.id, empty: true }];
    }

    if (definition.type === 'list') {
      const idValue = mappingEntry.options[String(value)];
      if (!idValue) {
        return [];
      }

      return [{ fieldKey: definition.key, idCustomField: mappingEntry.id, idValue }];
    }

    return [{ fieldKey: definition.key, idCustomField: mappingEntry.id, value: toTrelloValue(definition.type, value) }];
  });
}

export function calculateSyncHash(state: LabState): string {
  const technicalKeys = new Set<FieldKey>(TECHNICAL_FIELD_KEYS);
  const stableJson = JSON.stringify(
    FIELD_REGISTRY
      .filter((field) => !technicalKeys.has(field.key))
      .map((field) => [field.key, normalizeHashValue(state[field.key])]),
  );

  let hash = 2166136261;
  for (let index = 0; index < stableJson.length; index += 1) {
    hash ^= stableJson.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function getBoardCustomFields(boardId: string): Promise<TrelloCustomField[]> {
  return new TrelloCustomFieldsClient().getBoardCustomFields(boardId);
}

export async function getCardCustomFieldItems(cardId: string): Promise<TrelloCustomFieldItem[]> {
  return new TrelloCustomFieldsClient().getCardCustomFieldItems(cardId);
}

export async function ensureCustomFields(boardId: string): Promise<EnsureCustomFieldsResult> {
  return new TrelloCustomFieldsClient().ensureCustomFields(boardId);
}

export async function updateCardCustomFields(cardId: string, items: TrelloFieldPayload[]): Promise<void> {
  return new TrelloCustomFieldsClient().updateCardCustomFields(cardId, items);
}

export async function readLabPayloadField(boardId: string, cardId: string): Promise<string | null> {
  return new TrelloCustomFieldsClient().readCardTextCustomField(boardId, cardId, LAB_REACTOR_PAYLOAD_FIELD_NAME);
}

export async function writeLabPayloadField(boardId: string, cardId: string, value: string): Promise<void> {
  return new TrelloCustomFieldsClient().writeCardTextCustomField(boardId, cardId, LAB_REACTOR_PAYLOAD_FIELD_NAME, value);
}

export async function createLabCardOnBoard(boardId: string, name: string, desc: string): Promise<TrelloCard> {
  const client = new TrelloCustomFieldsClient();
  const lists = await client.getOpenLists(boardId);
  if (!lists.length) throw new Error('Aucune liste ouverte trouvée sur ce tableau.');
  return client.createCard(lists[0].id, name, desc);
}

export async function readLabPayloadFromDescription(cardId: string): Promise<string | null> {
  const card = await new TrelloCustomFieldsClient().getCard(cardId);
  return extractLabPayloadFromDescription(card.desc ?? '');
}

export async function writeLabPayloadToDescription(cardId: string, value: string): Promise<void> {
  const client = new TrelloCustomFieldsClient();
  const card = await client.getCard(cardId);
  await client.updateCardDescription(cardId, upsertDescriptionPayload(card.desc ?? '', value));
}

export async function removeLabPayloadFromDescription(cardId: string): Promise<void> {
  const client = new TrelloCustomFieldsClient();
  const card = await client.getCard(cardId);
  const nextDescription = removeDescriptionPayload(card.desc ?? '');
  if (nextDescription !== (card.desc ?? '')) {
    await client.updateCardDescription(cardId, nextDescription);
  }
}

export function extractLabPayloadFromDescription(desc: string): string | null {
  const start = desc.indexOf(DESCRIPTION_PAYLOAD_START);
  if (start === -1) return null;
  const payloadStart = desc.indexOf('\n', start);
  const end = desc.indexOf(DESCRIPTION_PAYLOAD_END, payloadStart);
  if (payloadStart === -1 || end === -1) return null;
  const encoded = desc.slice(payloadStart + 1, end).trim();
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

function upsertDescriptionPayload(desc: string, value: string): string {
  const encoded = btoa(unescape(encodeURIComponent(value)));
  const block = `${DESCRIPTION_PAYLOAD_START}\n${encoded}\n${DESCRIPTION_PAYLOAD_END}`;
  const start = desc.indexOf(DESCRIPTION_PAYLOAD_START);
  if (start === -1) {
    return `${desc.trimEnd()}\n\n${block}`.trim();
  }

  const end = desc.indexOf(DESCRIPTION_PAYLOAD_END, start);
  if (end === -1) {
    return `${desc.trimEnd()}\n\n${block}`.trim();
  }

  const afterEnd = end + DESCRIPTION_PAYLOAD_END.length;
  return `${desc.slice(0, start).trimEnd()}\n\n${block}\n\n${desc.slice(afterEnd).trimStart()}`.trim();
}

function removeDescriptionPayload(desc: string): string {
  const start = desc.indexOf(DESCRIPTION_PAYLOAD_START);
  if (start === -1) return desc;

  const end = desc.indexOf(DESCRIPTION_PAYLOAD_END, start);
  if (end === -1) return desc;

  const afterEnd = end + DESCRIPTION_PAYLOAD_END.length;
  return `${desc.slice(0, start).trimEnd()}\n\n${desc.slice(afterEnd).trimStart()}`.trim();
}

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 0;
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(30000, retryAfterMs);
  }

  return Math.min(30000, 1200 * 2 ** attempt + Math.floor(Math.random() * 500));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readItemValue(definition: FieldDefinition, field: TrelloCustomField, item?: TrelloCustomFieldItem): LabValue {
  if (!item) {
    return definition.type === 'checkbox' ? false : null;
  }

  if (definition.type === 'list') {
    const option = (field.options ?? []).find((candidate) => candidate.id === item.idValue);
    return option?.value.text ?? null;
  }

  if (definition.type === 'number') {
    return item.value?.number === undefined ? null : Number(item.value.number);
  }

  if (definition.type === 'checkbox') {
    return item.value?.checked === 'true';
  }

  if (definition.type === 'date') {
    return item.value?.date ? item.value.date.slice(0, 10) : null;
  }

  return item.value?.text ?? null;
}

function toTrelloValue(type: FieldDefinition['type'], value: LabValue): TrelloFieldPayload['value'] {
  if (type === 'number') {
    return { number: String(value) };
  }

  if (type === 'checkbox') {
    return { checked: value ? 'true' : 'false' };
  }

  if (type === 'date') {
    return { date: typeof value === 'string' && value.length === 10 ? `${value}T12:00:00.000Z` : String(value) };
  }

  return { text: String(value) };
}

function toMappingEntry(definition: FieldDefinition, field: TrelloCustomField): FieldMappingEntry {
  return {
    key: definition.key as FieldKey,
    trelloName: definition.trelloName,
    id: field.id,
    type: definition.type,
    options: Object.fromEntries((field.options ?? []).map((option) => [option.value.text ?? '', option.id])),
  };
}

function normalizeHashValue(value: LabValue): LabValue {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

function normalizeNumber(value: LabValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

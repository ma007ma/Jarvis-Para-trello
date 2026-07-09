import { FIELD_BY_TRELLO_NAME, FIELD_REGISTRY, TECHNICAL_FIELD_KEYS, type FieldDefinition, type FieldKey } from '../config/fieldRegistry';
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

export const LAB_REACTOR_PAYLOAD_FIELD_NAME = 'Lab Reactor payload';

interface ClientOptions {
  apiKey?: string;
  apiBase?: string;
  fetcher?: typeof fetch;
  tokenProvider?: () => Promise<string | null>;
}

const DEFAULT_API_BASE = import.meta.env.VITE_TRELLO_API_BASE || 'https://api.trello.com/1';

export class TrelloCustomFieldsClient {
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

  async ensureCustomFields(boardId: string): Promise<EnsureCustomFieldsResult> {
    const result: EnsureCustomFieldsResult = {
      created: [],
      present: [],
      optionsCreated: [],
      errors: [],
      mapping: {},
    };

    let existing = await this.getBoardCustomFields(boardId);

    for (const definition of FIELD_REGISTRY) {
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

        result.mapping[definition.key] = toMappingEntry(definition, field);
      } catch (error) {
        result.errors.push(`${definition.trelloName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  async updateCardCustomFields(cardId: string, items: TrelloFieldPayload[]): Promise<void> {
    const writes = items.map((item) => {
      if (item.empty) {
        return this.request<void>(`/cards/${cardId}/customField/${item.idCustomField}/item`, { method: 'DELETE' });
      }

      return this.request<void>(`/cards/${cardId}/customField/${item.idCustomField}/item`, {
        method: 'PUT',
        body: item.idValue ? { idValue: item.idValue } : { value: item.value ?? {} },
      });
    });

    await Promise.all(writes);
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const url = new URL(`${this.apiBase}${path}`);
    const token = await this.tokenProvider();

    if (!this.apiKey) {
      throw new Error('Cle API Trello manquante. Configurez VITE_TRELLO_API_KEY.');
    }

    url.searchParams.set('key', this.apiKey);
    if (token) {
      url.searchParams.set('token', token);
    }

    const response = await this.fetcher(url.toString(), {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Trello ${response.status}: ${message || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export async function getPowerUpToken(): Promise<string | null> {
  const restApi = window.TrelloPowerUp?.iframe?.().getRestApi?.();
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

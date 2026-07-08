/*
 * Client for interacting with Trello custom fields.
 *
 * This module wraps the Trello REST API endpoints used by the Lab Reactor
 * Power‑Up. It knows how to list existing custom fields on a board,
 * inspect field items on a card, create missing fields and drop‑down
 * options, update values on a card, and convert between Trello
 * responses and our local lab state. All functions return Promises and
 * assume that the caller will handle errors and display them to the
 * user.
 */

import { fieldRegistry, fieldRegistryMap, FieldDefinition, FieldOption } from '../config/fieldRegistry';

/** Utility type for the local representation of all field values on a card. */
export type LabState = Record<string, string | number | boolean | null | undefined | Date>;

/**
 * Trello API host. For Cloud boards this is typically `https://api.trello.com/1`.
 * Override via environment variables if necessary.
 */
const TRELLO_API_BASE = import.meta.env.VITE_TRELLO_API_BASE || 'https://api.trello.com/1';

/**
 * Retrieve the Trello key from environment. Throw if missing to avoid
 * accidentally sending unauthenticated requests. Users must provide
 * these values via their own `.env.local` or at runtime.
 */
function getTrelloAuth() {
  const key = import.meta.env.VITE_TRELLO_KEY;
  const token = import.meta.env.VITE_TRELLO_TOKEN;
  if (!key || !token) {
    throw new Error('Trello API key and token must be set in environment variables');
  }
  return { key, token };
}

/** Simple wrapper around `fetch` that adds Trello credentials. */
async function trelloFetch(path: string, init?: RequestInit): Promise<any> {
  const { key, token } = getTrelloAuth();
  const url = new URL(`${TRELLO_API_BASE}${path}`);
  url.searchParams.set('key', key);
  url.searchParams.set('token', token);
  const res = await fetch(url.toString(), init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Fetch custom field definitions for a board.
 * @param boardId The Trello board identifier
 */
export async function getBoardCustomFields(boardId: string) {
  return trelloFetch(`/boards/${boardId}/customFields`);
}

/**
 * Fetch all custom field values for a card. The returned items map
 * Trello custom field IDs to their stored values and, for list
 * values, the selected option ID. See Trello API docs for details.
 * @param cardId The Trello card identifier
 */
export async function getCardCustomFieldItems(cardId: string) {
  return trelloFetch(`/cards/${cardId}/customFieldItems`);
}

/**
 * Ensure that all custom fields and their options exist on the given
 * board. This function reads the current definitions and compares
 * them against our registry. Missing fields and drop‑down options
 * will be created. Existing fields will not be duplicated. The
 * returned object summarises what was created.
 * @param boardId The board to initialise
 */
export async function ensureCustomFields(boardId: string) {
  const existing = await getBoardCustomFields(boardId);
  const created: Array<{ field: FieldDefinition; id: string }> = [];
  const existingMap: Record<string, any> = {};
  // Build map of existing fields by name
  for (const field of existing) {
    existingMap[field.name] = field;
  }
  // Loop through our registry and create missing fields
  for (const def of fieldRegistry) {
    if (!existingMap[def.name]) {
      // Create field
      const body: any = {
        name: def.name,
        type: def.type,
        // For list fields we need to pass no options initially; options are created separately
      };
      const fieldRes = await trelloFetch(`/customFields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      existingMap[def.name] = fieldRes;
      created.push({ field: def, id: fieldRes.id });
    }
    // For list fields ensure options exist
    const fieldInfo = existingMap[def.name];
    if (def.type === 'list' && def.options) {
      // Fetch existing options
      const optionsRes = fieldInfo.options || [];
      const existingOptionsByValue: Record<string, any> = {};
      for (const opt of optionsRes) {
        existingOptionsByValue[opt.value] = opt;
      }
      for (const option of def.options) {
        if (!existingOptionsByValue[option.value]) {
          const optionRes = await trelloFetch(`/customFields/${fieldInfo.id}/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: option.value }),
          });
          // Save the id on our registry for later mapping
          option.id = optionRes.id;
        } else {
          // Populate id from existing field
          option.id = existingOptionsByValue[option.value].id;
        }
      }
    }
  }
  return { created, existing: existingMap };
}

/**
 * Update multiple custom field values on a card. Accepts an array of
 * Trello API payloads as returned by `mapLabStateToTrelloPayload`.
 * Use this in conjunction with a debounce to avoid sending too many
 * requests when the user is typing. Each item will be sent via a
 * separate PUT to the appropriate Trello endpoint.
 * @param cardId The card to update
 * @param items Array of Trello field item payloads
 */
export async function updateCardCustomFields(cardId: string, items: any[]) {
  const promises = items.map(item => {
    return trelloFetch(
      `/cards/${cardId}/customField/${item.idCustomField}/item`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      }
    );
  });
  await Promise.all(promises);
}

/**
 * Convert Trello card customFieldItems and board customFields into a
 * flat LabState object. The keys in the returned state correspond to
 * our internal keys defined in the registry. This mapping uses
 * `fieldRegistryMap` to translate Trello names back to keys. It
 * handles text, number, date, checkbox and list values and returns
 * native JavaScript types.
 */
export function mapTrelloToLabState(
  boardCustomFields: any[],
  cardCustomFieldItems: any[]
): LabState {
  const state: LabState = {};
  // Map board custom fields by id to name and internal key
  const boardFieldsById: Record<string, string> = {};
  for (const cf of boardCustomFields) {
    const def = Object.values(fieldRegistryMap).find(d => d.name === cf.name);
    if (def) {
      boardFieldsById[cf.id] = def.key;
    }
  }
  for (const item of cardCustomFieldItems) {
    const key = boardFieldsById[item.idCustomField];
    if (!key) continue;
    const def = fieldRegistryMap[key];
    // Determine value type
    if (def.type === 'text') {
      state[key] = item.value?.text || '';
    } else if (def.type === 'number') {
      const n = Number(item.value?.number);
      state[key] = isNaN(n) ? null : n;
    } else if (def.type === 'date') {
      const dateStr = item.value?.date;
      state[key] = dateStr ? new Date(dateStr) : null;
    } else if (def.type === 'checkbox') {
      state[key] = item.value?.checked === 'true';
    } else if (def.type === 'list') {
      // For lists, map option id back to value
      const idValue = item.idValue;
      const option = def.options?.find(opt => opt.id === idValue);
      state[key] = option ? option.value : null;
    }
  }
  return state;
}

/**
 * Convert our LabState into an array of payload objects ready to be
 * sent to Trello via `updateCardCustomFields`. The board custom
 * fields must be provided so we can look up Trello IDs. This method
 * uses the registry to determine how to encode each value. Empty or
 * undefined values will clear the field on Trello.
 */
export function mapLabStateToTrelloPayload(
  state: LabState,
  boardCustomFields: any[]
): any[] {
  const items: any[] = [];
  // Build map of board field names to their Trello IDs
  const boardFieldByName: Record<string, any> = {};
  for (const cf of boardCustomFields) {
    boardFieldByName[cf.name] = cf;
  }
  for (const key of Object.keys(state)) {
    const def = fieldRegistryMap[key];
    const boardField = boardFieldByName[def.name];
    if (!boardField) continue;
    const value = state[key];
    const payload: any = { idCustomField: boardField.id, body: {} };
    if (value === null || value === undefined || value === '') {
      // Clear the field
      payload.body = {};
    } else if (def.type === 'text') {
      payload.body.value = { text: String(value) };
    } else if (def.type === 'number') {
      // Trello expects number as string
      payload.body.value = { number: String(value) };
    } else if (def.type === 'date') {
      // ISO string without time zone
      const d = value instanceof Date ? value : new Date(value as any);
      payload.body.value = { date: d.toISOString().slice(0, 10) };
    } else if (def.type === 'checkbox') {
      payload.body.value = { checked: (value ? 'true' : 'false') };
    } else if (def.type === 'list') {
      // Find option id by value
      const option = def.options?.find(opt => opt.value === value);
      if (option?.id) {
        payload.idValue = option.id;
      }
    }
    items.push(payload);
  }
  return items;
}

/**
 * Generate a simple sync hash for a LabState. The hash helps detect
 * whether the local state has changed compared to Trello. For
 * simplicity we use JSON.stringify with sorted keys. In a real
 * implementation you might use a proper hashing function.
 */
export function calculateSyncHash(state: LabState): string {
  const sortedKeys = Object.keys(state).sort();
  const obj: any = {};
  for (const k of sortedKeys) {
    const v = state[k];
    if (v instanceof Date) {
      obj[k] = v.toISOString();
    } else {
      obj[k] = v;
    }
  }
  return JSON.stringify(obj);
}
import { describe, it, expect } from 'vitest';
import {
  mapTrelloToLabState,
  mapLabStateToTrelloPayload,
  calculateSyncHash,
  LabState,
} from '../src/trello/customFieldsClient';
import { fieldRegistry } from '../src/config/fieldRegistry';

describe('mapping functions', () => {
  const boardFields = fieldRegistry.map(def => ({ id: `id_${def.key}`, name: def.name, type: def.type, options: def.options })) as any[];

  it('maps Trello values to lab state and back', () => {
    const customFieldItems = [
      {
        idCustomField: 'id_sef_school_name',
        value: { text: 'École A' },
      },
      {
        idCustomField: 'id_sef_weeks',
        value: { number: '8' },
      },
      {
        idCustomField: 'id_sef_double_session',
        value: { checked: 'true' },
      },
    ];
    const state = mapTrelloToLabState(boardFields, customFieldItems);
    expect(state.sef_school_name).toBe('École A');
    expect(state.sef_weeks).toBe(8);
    expect(state.sef_double_session).toBe(true);
    // now map back to Trello payload
    const items = mapLabStateToTrelloPayload(state, boardFields);
    // Ensure we have at least the three fields
    expect(items.some(item => item.idCustomField === 'id_sef_school_name')).toBe(true);
    expect(items.some(item => item.idCustomField === 'id_sef_weeks')).toBe(true);
    expect(items.some(item => item.idCustomField === 'id_sef_double_session')).toBe(true);
  });

  it('computes sync hash deterministically', () => {
    const a: LabState = { sef_school_name: 'A', sef_weeks: 8 };
    const b: LabState = { sef_weeks: 8, sef_school_name: 'A' };
    expect(calculateSyncHash(a)).toBe(calculateSyncHash(b));
  });
});
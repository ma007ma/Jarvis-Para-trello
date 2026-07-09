import { describe, expect, it } from 'vitest';
import { createEmptyLabState } from '../domain/labState';
import {
  buildFieldMapping,
  calculateSyncHash,
  mapLabStateToTrelloPayload,
  mapTrelloToLabState,
  type TrelloCustomField,
  type TrelloCustomFieldItem,
} from './customFieldsClient';

const fields: TrelloCustomField[] = [
  { id: 'f-text', name: 'École', type: 'text' },
  {
    id: 'f-list',
    name: 'Programme',
    type: 'list',
    options: [
      { id: 'opt-nasa', value: { text: 'NASA' } },
      { id: 'opt-brixo', value: { text: 'Brixo' } },
    ],
  },
  { id: 'f-number', name: 'Nombre de semaines', type: 'number' },
  { id: 'f-date', name: 'S1 - Début des cours', type: 'date' },
  { id: 'f-course-dates', name: 'S1 - Dates des cours', type: 'text' },
  { id: 'f-empty', name: 'Local', type: 'text' },
  { id: 'f-hash', name: 'Hash technique', type: 'text' },
];

describe('customFieldsClient mappings', () => {
  it('maps Trello values to LabState for text, list, number, and date fields', () => {
    const items: TrelloCustomFieldItem[] = [
      { idCustomField: 'f-text', value: { text: 'Renaissance' } },
      { idCustomField: 'f-list', idValue: 'opt-nasa' },
      { idCustomField: 'f-number', value: { number: '8' } },
      { idCustomField: 'f-date', value: { date: '2026-09-15T12:00:00.000Z' } },
    ];

    const state = mapTrelloToLabState(fields, items);

    expect(state.sef_school_name).toBe('Renaissance');
    expect(state.sef_program).toBe('NASA');
    expect(state.sef_weeks).toBe(8);
    expect(state.sef_s1_course_start_date).toBe('2026-09-15');
  });

  it('maps LabState to Trello payload with list idValue, number, and date values', () => {
    const state = createEmptyLabState({
      sef_school_name: 'Renaissance',
      sef_program: 'NASA',
      sef_weeks: 8,
      sef_s1_course_start_date: '2026-09-15',
    });
    const mapping = buildFieldMapping(fields);

    const payload = mapLabStateToTrelloPayload(state, mapping);

    expect(payload).toContainEqual(expect.objectContaining({ fieldKey: 'sef_program', idValue: 'opt-nasa' }));
    expect(payload).toContainEqual(expect.objectContaining({ fieldKey: 'sef_weeks', value: { number: '8' } }));
    expect(payload).toContainEqual(expect.objectContaining({ fieldKey: 'sef_s1_course_start_date', value: { date: '2026-09-15T12:00:00.000Z' } }));
  });

  it('emits delete payloads for empty fields', () => {
    const mapping = buildFieldMapping(fields);
    const payload = mapLabStateToTrelloPayload(createEmptyLabState({ sef_school_name: 'Renaissance' }), mapping);

    expect(payload).toContainEqual(expect.objectContaining({ fieldKey: 'sef_program', empty: true }));
    expect(payload).toContainEqual(expect.objectContaining({ fieldKey: 'sef_s1_course_start_date', empty: true }));
  });

  it('does not write manual course dates to Trello custom fields', () => {
    const state = createEmptyLabState({
      sef_s1_course_dates: JSON.stringify(['2026-09-15', '2026-09-22']),
    });
    const mapping = buildFieldMapping(fields);

    const payload = mapLabStateToTrelloPayload(state, mapping);

    expect(payload.some((item) => item.fieldKey === 'sef_s1_course_dates')).toBe(false);
  });

  it('skips save payload when the sync hash already matches the business fields', () => {
    const state = createEmptyLabState({ sef_school_name: 'Renaissance' });
    const hashedState = { ...state, sef_sync_hash: calculateSyncHash(state) };
    const mapping = buildFieldMapping(fields);

    expect(mapLabStateToTrelloPayload(hashedState, mapping)).toEqual([]);
  });
});

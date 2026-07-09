import { describe, expect, it } from 'vitest';
import { FIELD_BY_KEY, FIELD_REGISTRY } from './fieldRegistry';

describe('FIELD_REGISTRY', () => {
  it('contains unique Trello names and internal keys', () => {
    const keys = new Set(FIELD_REGISTRY.map((field) => field.key));
    const names = new Set(FIELD_REGISTRY.map((field) => field.trelloName));

    expect(keys.size).toBe(FIELD_REGISTRY.length);
    expect(names.size).toBe(FIELD_REGISTRY.length);
    expect(FIELD_BY_KEY.sef_school_name.trelloName).toBe('École');
  });

  it('defines options for every list field', () => {
    const listFields = FIELD_REGISTRY.filter((field) => field.type === 'list');

    expect(listFields.length).toBeGreaterThan(0);
    expect(listFields.every((field) => (field.options?.length ?? 0) > 0)).toBe(true);
  });

  it('does not include financial calculator fields in the MVP registry', () => {
    const keys = FIELD_REGISTRY.map((field) => field.key);
    expect(keys.some((key) => key.includes('revenue') || key.includes('profit') || key.includes('discount') || key.includes('tax'))).toBe(false);
  });
});

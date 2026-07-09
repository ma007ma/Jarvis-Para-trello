import { FIELD_REGISTRY, type FieldKey, type FieldType } from '../config/fieldRegistry';

export type LabValue = string | number | boolean | null;
export type LabState = Record<FieldKey, LabValue>;

export const EMPTY_LAB_STATE = Object.fromEntries(FIELD_REGISTRY.map((field) => [field.key, (field.type as FieldType) === 'checkbox' ? false : null])) as LabState;

export function createEmptyLabState(overrides: Partial<LabState> = {}): LabState {
  return { ...EMPTY_LAB_STATE, ...overrides };
}

export function isEmptyLabValue(value: LabValue): boolean {
  return value === null || value === '';
}

export function stringifyLabValue(value: LabValue): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

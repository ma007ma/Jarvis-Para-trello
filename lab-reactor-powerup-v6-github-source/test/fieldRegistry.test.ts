import { describe, it, expect } from 'vitest';
import { fieldRegistry, fieldRegistryMap } from '../src/config/fieldRegistry';

describe('fieldRegistry', () => {
  it('should have unique keys', () => {
    const keys = fieldRegistry.map(f => f.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
  it('should map keys to definitions', () => {
    for (const def of fieldRegistry) {
      expect(fieldRegistryMap[def.key]).toBe(def);
    }
  });
  it('should include required fields', () => {
    const required = [
      'sef_school_name',
      'sef_css',
      'sef_school_year',
      'sef_season',
      'sef_program',
      'sef_group_target',
      'sef_grade_range',
      'sef_day_of_week',
      'sef_start_time',
      'sef_end_time',
      'sef_weeks',
      'sef_min_students',
      'sef_max_students',
      'sef_students_registered',
      'sef_course_start_date',
      'sef_registration_end_date',
    ];
    for (const key of required) {
      expect(fieldRegistryMap[key]).toBeDefined();
    }
  });
});
import { describe, it, expect } from 'vitest';
import { validateLabState } from '../src/domain/validationEngine';

describe('validationEngine', () => {
  it('returns full score when all required fields are present and dates are consistent', () => {
    const state: any = {
      sef_school_name: 'École du Test',
      sef_css: 'CSSMI',
      sef_school_year: '2026-2027',
      sef_season: 'Automne',
      sef_program: 'NASA',
      sef_group_target: 'Plus jeunes',
      sef_grade_range: '1e-3e',
      sef_day_of_week: 'Mardi',
      sef_start_time: '15:00',
      sef_end_time: '16:00',
      sef_weeks: 8,
      sef_min_students: 16,
      sef_max_students: 24,
      sef_students_registered: 19,
      sef_course_start_date: new Date('2026-09-10'),
      sef_registration_end_date: new Date('2026-09-01'),
    };
    const result = validateLabState(state);
    expect(result.status).toBe('Prêt à présenter');
    expect(result.missing.length).toBe(0);
    expect(result.alerts.length).toBe(0);
    expect(result.score).toBe(100);
  });

  it('detects missing fields and inconsistent dates', () => {
    const state: any = {
      sef_school_name: 'École du Test',
      // missing sef_css
      sef_school_year: '2026-2027',
      sef_season: 'Automne',
      sef_program: 'NASA',
      sef_group_target: 'Plus jeunes',
      sef_grade_range: '1e-3e',
      sef_day_of_week: 'Mardi',
      sef_start_time: '15:00',
      sef_end_time: '16:00',
      sef_weeks: 8,
      sef_min_students: 16,
      sef_max_students: 24,
      sef_students_registered: 19,
      sef_course_start_date: new Date('2026-09-10'),
      sef_registration_end_date: new Date('2026-09-15'), // registration ends after start
    };
    const result = validateLabState(state);
    expect(result.status).toBe('Incomplet');
    expect(result.missing).toContain('sef_css');
    expect(result.alerts).toContain('Fin inscriptions après le début des cours');
    expect(result.score).toBeLessThan(100);
  });
});
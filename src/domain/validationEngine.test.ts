import { describe, expect, it } from 'vitest';
import { createEmptyLabState } from './labState';
import { validateLabState } from './validationEngine';

describe('validateLabState', () => {
  it('returns ready status for a complete operational card', () => {
    const result = validateLabState(
      createEmptyLabState({
        sef_school_name: 'Renaissance',
        sef_contact_name: 'Marie Curie',
        sef_contact_email: 'marie@example.com',
        sef_session_name: 'Session 1',
        sef_program: 'NASA',
        sef_grade_range: 'Maternelle à 2e année',
        sef_day_of_week: 'Mardi',
        sef_start_time: '15h00',
        sef_end_time: '16h00',
        sef_s1_registration_start_date: '2026-08-24',
        sef_s1_registration_end_date: '2026-09-10',
        sef_s1_course_start_date: '2026-09-17',
        sef_s1_course_end_date: '2026-11-05',
      }),
    );

    expect(result.score).toBe(100);
    expect(result.status).toBe('Prêt à présenter');
    expect(result.alerts).toEqual([]);
  });

  it('returns incomplete status and missing fields for an incomplete card', () => {
    const result = validateLabState(createEmptyLabState({ sef_school_name: 'Renaissance' }));

    expect(result.status).toBe('Incomplet');
    expect(result.score).toBeLessThan(50);
    expect(result.missing).toContain('Contact');
  });

  it('flags registration end after course start', () => {
    const result = validateLabState(
      createEmptyLabState({
        sef_school_name: 'Renaissance',
        sef_contact_name: 'Marie Curie',
        sef_contact_phone: '514-555-1234',
        sef_session_name: 'Session 1',
        sef_program: 'NASA',
        sef_grade_range: '1 à 4',
        sef_day_of_week: 'Mardi',
        sef_start_time: '15h00',
        sef_end_time: '16h00',
        sef_s1_registration_start_date: '2026-08-24',
        sef_s1_registration_end_date: '2026-09-20',
        sef_s1_course_start_date: '2026-09-15',
        sef_s1_course_end_date: '2026-11-05',
      }),
    );

    expect(result.status).toBe('Incomplet');
    expect(result.alerts.some((alert) => alert.message.includes('fin des inscriptions'))).toBe(true);
  });
});

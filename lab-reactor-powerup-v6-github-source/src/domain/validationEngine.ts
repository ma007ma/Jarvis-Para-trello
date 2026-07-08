/*
 * Validation logic for Lab Reactor.
 *
 * The validation engine inspects a LabState and returns a score
 * between 0 and 100 along with a status and list of alerts. It
 * embodies the business rules that determine whether a card is ready
 * to be presented to a client. If required fields are missing or
 * inconsistent, the status falls back to `Incomplet` or `Attention`.
 */

import { LabState } from '../trello/customFieldsClient';

export interface ValidationResult {
  score: number;
  status: 'Incomplet' | 'Attention' | 'Prêt à présenter';
  alerts: string[];
  missing: string[];
}

/**
 * Validate a LabState. Each required field contributes equally to the
 * final score. If any required fields are missing, the result will be
 * `Incomplet`. Additional logical rules can reduce the status to
 * `Attention`. This function does not throw; callers should
 * gracefully display the returned messages.
 */
export function validateLabState(state: LabState): ValidationResult {
  // Define required fields for validation
  const requiredKeys = [
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
  const missing: string[] = [];
  let presentCount = 0;
  for (const key of requiredKeys) {
    const val = state[key];
    const hasValue = val !== null && val !== undefined && val !== '';
    if (hasValue) {
      presentCount++;
    } else {
      missing.push(key);
    }
  }
  const score = Math.round((presentCount / requiredKeys.length) * 100);
  const alerts: string[] = [];
  // Additional rules: end registration must be before course start
  const regEnd = state['sef_registration_end_date'];
  const courseStart = state['sef_course_start_date'];
  if (regEnd && courseStart) {
    const regDate = regEnd instanceof Date ? regEnd : new Date(regEnd as any);
    const startDate = courseStart instanceof Date ? courseStart : new Date(courseStart as any);
    if (regDate > startDate) {
      alerts.push('Fin inscriptions après le début des cours');
    }
  }
  // Determine status
  let status: 'Incomplet' | 'Attention' | 'Prêt à présenter' = 'Prêt à présenter';
  if (missing.length > 0) {
    status = 'Incomplet';
  } else if (alerts.length > 0) {
    status = 'Attention';
  }
  return { score, status, alerts, missing };
}
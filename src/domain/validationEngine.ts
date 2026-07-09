import type { FieldKey } from '../config/fieldRegistry';
import { getActiveSessionNumber } from './sessionPlanning';
import type { LabState } from './labState';
import { isEmptyLabValue } from './labState';

export type ValidationStatus = 'Incomplet' | 'Attention' | 'Prêt à présenter';

export interface ValidationAlert {
  level: 'critical' | 'warning';
  message: string;
  fieldKey?: keyof LabState;
}

export interface ValidationResult {
  score: number;
  status: ValidationStatus;
  alerts: ValidationAlert[];
  missing: string[];
}

const REQUIRED_BASE_FIELDS: Array<{ key: keyof LabState; label: string }> = [
  { key: 'sef_school_name', label: 'École' },
  { key: 'sef_contact_name', label: 'Contact' },
  { key: 'sef_program', label: 'Programme' },
  { key: 'sef_session_name', label: 'Session' },
  { key: 'sef_grade_range', label: 'Niveaux scolaires' },
  { key: 'sef_day_of_week', label: 'Journée' },
  { key: 'sef_start_time', label: 'Heure début' },
  { key: 'sef_end_time', label: 'Heure fin' },
];

export function validateLabState(state: LabState): ValidationResult {
  const activeSession = getActiveSessionNumber(state);
  const sessionRequiredFields: Array<{ key: keyof LabState; label: string }> = [
    { key: `sef_s${activeSession}_registration_start_date` as FieldKey, label: 'Début inscriptions' },
    { key: `sef_s${activeSession}_registration_end_date` as FieldKey, label: 'Fin inscriptions' },
    { key: `sef_s${activeSession}_course_start_date` as FieldKey, label: 'Début des cours' },
    { key: `sef_s${activeSession}_course_end_date` as FieldKey, label: 'Fin des cours' },
  ];

  const missing = [...REQUIRED_BASE_FIELDS, ...sessionRequiredFields]
    .filter(({ key }) => isEmptyLabValue(state[key]))
    .map(({ label }) => label);

  const alerts: ValidationAlert[] = missing.map((label) => ({ level: 'critical', message: `${label} manquant` }));

  if (isEmptyLabValue(state.sef_contact_email) && isEmptyLabValue(state.sef_contact_phone)) {
    alerts.push({ level: 'critical', message: 'Courriel ou numéro de téléphone requis.', fieldKey: 'sef_contact_email' });
    missing.push('Courriel ou numéro');
  }

  const registrationEndKey = `sef_s${activeSession}_registration_end_date` as FieldKey;
  const courseStartKey = `sef_s${activeSession}_course_start_date` as FieldKey;
  const courseEndKey = `sef_s${activeSession}_course_end_date` as FieldKey;
  const registrationEnd = state[registrationEndKey];
  const courseStart = state[courseStartKey];
  const courseEnd = state[courseEndKey];

  if (typeof registrationEnd === 'string' && typeof courseStart === 'string' && registrationEnd >= courseStart) {
    alerts.push({
      level: 'critical',
      message: 'La fin des inscriptions doit précéder le début des cours.',
      fieldKey: registrationEndKey,
    });
  }

  if (typeof courseStart === 'string' && typeof courseEnd === 'string' && courseEnd < courseStart) {
    alerts.push({ level: 'critical', message: 'La fin des cours doit suivre le début des cours.', fieldKey: courseEndKey });
  }

  if (isEmptyLabValue(courseStart)) {
    alerts.push({ level: 'critical', message: 'Au moins un cours doit être planifié.', fieldKey: courseStartKey });
  }

  const totalChecks = REQUIRED_BASE_FIELDS.length + sessionRequiredFields.length + 2;
  const failedChecks = new Set(alerts.filter((alert) => alert.level === 'critical').map((alert) => alert.message)).size;
  const warningPenalty = alerts.filter((alert) => alert.level === 'warning').length * 4;
  const score = Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100) - warningPenalty);
  const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
  const status: ValidationStatus = criticalCount > 0 ? 'Incomplet' : score >= 95 ? 'Prêt à présenter' : 'Attention';

  return { score, status, alerts, missing: Array.from(new Set(missing)) };
}

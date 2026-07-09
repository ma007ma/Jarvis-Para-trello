import { getActiveSessionNumber } from '../domain/sessionPlanning';
import type { LabState } from '../domain/labState';

export function buildSummary(state: LabState): string {
  const session = getActiveSessionNumber(state);
  const alerts = state.sef_warnings ? String(state.sef_warnings) : 'aucune';

  return [
    `École : ${value(state.sef_school_name)} / ${value(state.sef_css)}`,
    `Année : ${value(state.sef_school_year)}`,
    `Session : ${value(state.sef_session_name)}`,
    `Programme : ${value(state.sef_program)}`,
    `Groupe cible : ${value(state.sef_group_target)}`,
    `Niveaux : ${value(state.sef_grade_range)}`,
    `Journée : ${value(state.sef_day_of_week)}`,
    `Horaire : ${value(state.sef_start_time)} à ${value(state.sef_end_time)}`,
    `Local : ${value(state.sef_room)}`,
    `Contact : ${value(state.sef_contact_name)} — ${value(state.sef_contact_email)} — ${value(state.sef_contact_phone)}`,
    `Début inscriptions : ${value(state[`sef_s${session}_registration_start_date` as keyof LabState])}`,
    `Fin inscriptions : ${value(state[`sef_s${session}_registration_end_date` as keyof LabState])}`,
    `Début cours : ${value(state[`sef_s${session}_course_start_date` as keyof LabState])}`,
    `Fin cours : ${value(state[`sef_s${session}_course_end_date` as keyof LabState])}`,
    `Statut : ${value(state.sef_status)}`,
    `Validation : ${value(state.sef_validation_score)} %`,
    `Alertes : ${alerts}`,
  ].join('\n');
}

export function buildCsv(state: LabState): string {
  const session = getActiveSessionNumber(state);
  const headers = [
    'ecole',
    'css',
    'annee',
    'session',
    'programme',
    'groupe_cible',
    'niveaux',
    'journee',
    'heure_debut',
    'heure_fin',
    'local',
    'contact',
    'courriel',
    'numero',
    'debut_inscriptions',
    'fin_inscriptions',
    'debut_cours',
    'fin_cours',
    'statut',
    'validation',
    'alertes',
  ];
  const row = [
    state.sef_school_name,
    state.sef_css,
    state.sef_school_year,
    state.sef_session_name,
    state.sef_program,
    state.sef_group_target,
    state.sef_grade_range,
    state.sef_day_of_week,
    state.sef_start_time,
    state.sef_end_time,
    state.sef_room,
    state.sef_contact_name,
    state.sef_contact_email,
    state.sef_contact_phone,
    state[`sef_s${session}_registration_start_date` as keyof LabState],
    state[`sef_s${session}_registration_end_date` as keyof LabState],
    state[`sef_s${session}_course_start_date` as keyof LabState],
    state[`sef_s${session}_course_end_date` as keyof LabState],
    state.sef_status,
    state.sef_validation_score,
    state.sef_warnings,
  ].map(csvCell);

  return `${headers.join(',')}\n${row.join(',')}`;
}

export function downloadCsv(csv: string, filename = 'lab-reactor.csv'): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function value(input: unknown): string {
  if (input === null || input === undefined || input === '') return '-';
  return String(input);
}

function csvCell(input: unknown): string {
  const text = value(input).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

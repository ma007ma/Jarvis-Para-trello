import type { FieldKey } from '../config/fieldRegistry';
import type { LabState } from './labState';

export type SessionNumber = 1 | 2 | 3;
export type MilestoneStatus = 'manquant' | 'à venir' | "aujourd'hui" | 'passé' | 'problème';
export type MilestoneTone = 'purple' | 'red' | 'blue' | 'yellow' | 'gray' | 'green' | 'orange';

export interface SessionMilestoneDefinition {
  id: string;
  label: string;
  tone: MilestoneTone;
  fieldKey?: FieldKey;
  courseIndex?: number;
}

export interface SessionMilestone extends SessionMilestoneDefinition {
  date: string | null;
  status: MilestoneStatus;
}

export interface SchoolCalendarMonth {
  year: number;
  month: number;
  label: string;
  weeks: Array<Array<number | null>>;
}

export const SESSION_NUMBERS: readonly SessionNumber[] = [1, 2, 3];

const BASE_MILESTONE_DEFINITIONS: Array<Omit<SessionMilestoneDefinition, 'fieldKey'>> = [
  { id: 'coupon_delivery', label: 'Livraison des coupons', tone: 'purple' },
  { id: 'coupon_distribution', label: 'Distribution des coupons', tone: 'red' },
  { id: 'registration_start', label: 'Début des inscriptions', tone: 'blue' },
  { id: 'spectacle', label: 'Spectacle / tournée de classe', tone: 'blue' },
  { id: 'parent_email_1', label: '1er courriel aux parents', tone: 'yellow' },
  { id: 'parent_email_2', label: '2e courriel aux parents', tone: 'yellow' },
  { id: 'registration_end', label: 'Fin des inscriptions', tone: 'red' },
  { id: 'class_list_prep', label: 'Préparation listes de classe et envoi', tone: 'gray' },
  { id: 'course_start', label: 'Début des cours', tone: 'green' },
  { id: 'course_end', label: 'Fin des cours', tone: 'orange' },
];

const FIELD_BY_MILESTONE_ID: Record<string, string> = {
  coupon_delivery: 'coupon_delivery_date',
  coupon_distribution: 'coupon_distribution_date',
  registration_start: 'registration_start_date',
  spectacle: 'spectacle_date',
  parent_email_1: 'parent_email_1_date',
  parent_email_2: 'parent_email_2_date',
  registration_end: 'registration_end_date',
  class_list_prep: 'class_list_prep_date',
  course_start: 'course_start_date',
  course_end: 'course_end_date',
};

export function getActiveSessionNumber(state: LabState): SessionNumber {
  if (state.sef_session_name === 'Session 2') return 2;
  if (state.sef_session_name === 'Session 3') return 3;
  return 1;
}

export function getSessionMilestoneDefinitions(session: SessionNumber): SessionMilestoneDefinition[] {
  const savedMilestones = BASE_MILESTONE_DEFINITIONS.map((definition) => ({
    ...definition,
    fieldKey: `sef_s${session}_${FIELD_BY_MILESTONE_ID[definition.id]}` as FieldKey,
  }));

  const courseMilestones: SessionMilestoneDefinition[] = Array.from({ length: 8 }, (_, index) => ({
    id: `course_${index + 1}`,
    label: `Cours ${index + 1}`,
    tone: 'green',
    courseIndex: index + 1,
  }));

  const insertAt = savedMilestones.findIndex((definition) => definition.id === 'course_end');
  return [...savedMilestones.slice(0, insertAt), ...courseMilestones, ...savedMilestones.slice(insertAt)];
}

export function getSessionMilestones(state: LabState, session: SessionNumber, now = new Date()): SessionMilestone[] {
  const today = toDateOnly(now);
  const startKey = `sef_s${session}_course_start_date` as FieldKey;
  const courseStart = typeof state[startKey] === 'string' ? state[startKey] : null;

  return getSessionMilestoneDefinitions(session).map((definition) => {
    const date = definition.fieldKey ? readDate(state, definition.fieldKey) : getDerivedCourseDate(courseStart, definition.courseIndex);
    return {
      ...definition,
      date,
      status: getMilestoneStatus(date, today),
    };
  });
}

export function getAllSavedMilestoneDates(state: LabState): Array<{ date: string; tone: MilestoneTone; label: string }> {
  return SESSION_NUMBERS.flatMap((session) =>
    getSessionMilestones(state, session)
      .filter((milestone) => milestone.fieldKey && milestone.date)
      .map((milestone) => ({ date: milestone.date as string, tone: milestone.tone, label: `S${session} - ${milestone.label}` })),
  );
}

export function generateSchoolCalendarMonths(schoolYear: string | null | number | boolean): SchoolCalendarMonth[] {
  const startYear = parseSchoolYearStart(schoolYear) ?? new Date().getFullYear();
  return Array.from({ length: 14 }, (_, index) => {
    const monthIndex = (6 + index) % 12;
    const year = startYear + Math.floor((6 + index) / 12);
    return buildMonth(year, monthIndex);
  });
}

export function parseSchoolYearStart(schoolYear: string | null | number | boolean): number | null {
  if (typeof schoolYear !== 'string') return null;
  const match = schoolYear.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function readDate(state: LabState, key: FieldKey): string | null {
  const value = state[key];
  return typeof value === 'string' && value ? value : null;
}

function getDerivedCourseDate(courseStart: string | null, courseIndex?: number): string | null {
  if (!courseStart || !courseIndex) return null;
  const date = new Date(`${courseStart}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + (courseIndex - 1) * 7);
  return date.toISOString().slice(0, 10);
}

function getMilestoneStatus(date: string | null, today: string): MilestoneStatus {
  if (!date) return 'manquant';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'problème';
  if (date === today) return "aujourd'hui";
  return date > today ? 'à venir' : 'passé';
}

function buildMonth(year: number, month: number): SchoolCalendarMonth {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = firstDay.getUTCDay();
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return {
    year,
    month,
    label: new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(firstDay),
    weeks,
  };
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

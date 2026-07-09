import { describe, expect, it } from 'vitest';
import { createEmptyLabState } from './labState';
import { generateSchoolCalendarMonths, getSessionMilestones } from './sessionPlanning';

describe('sessionPlanning', () => {
  it('generates 14 school-year months from July to August', () => {
    const months = generateSchoolCalendarMonths('2026-2027');

    expect(months).toHaveLength(14);
    expect(months[0].year).toBe(2026);
    expect(months[0].month).toBe(6);
    expect(months[13].year).toBe(2027);
    expect(months[13].month).toBe(7);
  });

  it('generates editable session milestones and derived course dates', () => {
    const milestones = getSessionMilestones(
      createEmptyLabState({
        sef_s1_registration_start_date: '2026-08-24',
        sef_s1_course_start_date: '2026-09-15',
      }),
      1,
      new Date('2026-08-01T12:00:00.000Z'),
    );

    expect(milestones.some((milestone) => milestone.label === 'Début des inscriptions' && milestone.date === '2026-08-24')).toBe(true);
    expect(milestones.some((milestone) => milestone.label === 'Cours 2' && milestone.date === '2026-09-22')).toBe(true);
  });
});

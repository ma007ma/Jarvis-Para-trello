import { describe, expect, it } from 'vitest';
import { createEmptyLabState } from './labState';
import { generateSchoolCalendarMonths, getSessionMilestones, writeCourseDates } from './sessionPlanning';

describe('sessionPlanning', () => {
  it('generates 12 civil-year months from January to December', () => {
    const months = generateSchoolCalendarMonths('2026');

    expect(months).toHaveLength(12);
    expect(months[0].year).toBe(2026);
    expect(months[0].month).toBe(0);
    expect(months[11].year).toBe(2026);
    expect(months[11].month).toBe(11);
  });

  it('generates editable session milestones and manual course dates', () => {
    const milestones = getSessionMilestones(
      createEmptyLabState({
        sef_s1_registration_start_date: '2026-08-24',
        sef_s1_course_dates: writeCourseDates(['2026-09-15', '2026-09-29']),
      }),
      1,
      new Date('2026-08-01T12:00:00.000Z'),
    );

    expect(milestones.some((milestone) => milestone.label === 'Début des inscriptions' && milestone.date === '2026-08-24')).toBe(true);
    expect(milestones.some((milestone) => milestone.label === 'Cours 2' && milestone.date === '2026-09-29')).toBe(true);
  });
});

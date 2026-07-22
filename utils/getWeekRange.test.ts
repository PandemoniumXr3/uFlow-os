import { describe, expect, it } from 'vitest';

import { getUpcomingDateOptions, getWeekRange, isDateWithinRange } from './getWeekRange';

describe('getWeekRange', () => {
  it('returns the Monday-Sunday range containing a mid-week date', () => {
    // Wednesday 2026-07-15
    const range = getWeekRange(new Date(2026, 6, 15));
    expect(range).toEqual({ start: '2026-07-13', end: '2026-07-19' });
  });

  it('returns the same range for the Monday and the Sunday boundary', () => {
    expect(getWeekRange(new Date(2026, 6, 13))).toEqual({ start: '2026-07-13', end: '2026-07-19' });
    expect(getWeekRange(new Date(2026, 6, 19))).toEqual({ start: '2026-07-13', end: '2026-07-19' });
  });

  it('handles a Sunday reference date correctly (day 0)', () => {
    // Sunday 2026-07-19 belongs to the week starting Monday 2026-07-13
    const range = getWeekRange(new Date(2026, 6, 19));
    expect(range.start).toBe('2026-07-13');
  });
});

describe('isDateWithinRange', () => {
  const range = { start: '2026-07-13', end: '2026-07-19' };

  it('accepts dates on and within the boundaries', () => {
    expect(isDateWithinRange('2026-07-13', range)).toBe(true);
    expect(isDateWithinRange('2026-07-16', range)).toBe(true);
    expect(isDateWithinRange('2026-07-19', range)).toBe(true);
  });

  it('rejects dates outside the range', () => {
    expect(isDateWithinRange('2026-07-12', range)).toBe(false);
    expect(isDateWithinRange('2026-07-20', range)).toBe(false);
  });
});

describe('getUpcomingDateOptions', () => {
  it('returns count concrete dates starting tomorrow, each with a weekday label', () => {
    // Wednesday 2026-07-15
    const options = getUpcomingDateOptions(new Date(2026, 6, 15), 6);
    expect(options).toHaveLength(6);
    expect(options[0]).toEqual({ date: '2026-07-16', label: 'Thu 16' });
    expect(options[5]).toEqual({ date: '2026-07-21', label: 'Tue 21' });
  });

  it('never includes the reference date itself', () => {
    const options = getUpcomingDateOptions(new Date(2026, 6, 15), 6);
    expect(options.map((o) => o.date)).not.toContain('2026-07-15');
  });

  it('produces strictly increasing, real calendar dates', () => {
    const options = getUpcomingDateOptions(new Date(2026, 6, 15), 6);
    const dates = options.map((o) => o.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
  });
});

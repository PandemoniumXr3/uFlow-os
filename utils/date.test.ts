import { describe, expect, it } from 'vitest';

import { addDaysToKey, formatFriendlyDate, formatShortDate, getTodayKey, isToday } from '@/utils/date';

describe('date utils', () => {
  it('formatFriendlyDate renders a full weekday + month + day', () => {
    expect(formatFriendlyDate('2026-07-17')).toBe('Friday, July 17');
  });

  it('formatShortDate renders a 3-letter weekday + day number', () => {
    expect(formatShortDate('2026-07-17')).toEqual({ weekday: 'Fri', day: 17 });
  });

  it('addDaysToKey moves forward across a month boundary', () => {
    expect(addDaysToKey('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('addDaysToKey moves backward across a year boundary', () => {
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('isToday matches only the current local date', () => {
    expect(isToday(getTodayKey())).toBe(true);
    expect(isToday('2000-01-01')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { getPermanentlyHiddenIds, isDismissedForDate } from '@/services/dismissal/isDismissedForDate';
import type { DismissalEntry } from '@/types/dismissal';

function entry(overrides: Partial<DismissalEntry> = {}): DismissalEntry {
  return { id: 'd-1', recipeId: 'r-1', scope: 'day', date: '2026-07-20', dismissedAt: 0, ...overrides };
}

describe('isDismissedForDate', () => {
  it('is false when there is no dismissal at all', () => {
    expect(isDismissedForDate([], 'r-1', '2026-07-20')).toBe(false);
  });

  it('is true for a day dismissal on the exact date it was recorded for', () => {
    expect(isDismissedForDate([entry({ date: '2026-07-20' })], 'r-1', '2026-07-20')).toBe(true);
  });

  it('is false for a day dismissal on a different date — a day dismissal never becomes permanent', () => {
    expect(isDismissedForDate([entry({ date: '2026-07-20' })], 'r-1', '2026-07-21')).toBe(false);
  });

  it('is true on every date for a permanent dismissal', () => {
    const entries = [entry({ scope: 'permanent', date: undefined })];
    expect(isDismissedForDate(entries, 'r-1', '2026-07-20')).toBe(true);
    expect(isDismissedForDate(entries, 'r-1', '2030-01-01')).toBe(true);
  });

  it('does not affect a different recipe', () => {
    expect(isDismissedForDate([entry({ recipeId: 'r-1', scope: 'permanent' })], 'r-2', '2026-07-20')).toBe(false);
  });
});

describe('getPermanentlyHiddenIds', () => {
  it('includes only permanent-scope recipe ids', () => {
    const ids = getPermanentlyHiddenIds([entry({ recipeId: 'r-1', scope: 'permanent' }), entry({ recipeId: 'r-2', scope: 'day' })]);
    expect(ids.has('r-1')).toBe(true);
    expect(ids.has('r-2')).toBe(false);
  });
});

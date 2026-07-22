import { describe, expect, it } from 'vitest';

import { createEmptyTotals } from '@/utils/nutrientTotals';
import { getVisibleTotalsRows } from '@/utils/nutrientTotalsRows';

describe('getVisibleTotalsRows', () => {
  const totals = { ...createEmptyTotals(), kcal: 500, proteinGrams: 20, sodiumMilligrams: 300 };

  it('restricts to the given allow-list (the calm 5-nutrient default view)', () => {
    const rows = getVisibleTotalsRows(totals, new Set(), ['kcal', 'protein', 'carbohydrate', 'fat', 'fiber']);
    expect(rows.map((r) => r.key)).toEqual(['kcal', 'protein', 'carbohydrate', 'fat', 'fiber']);
  });

  it('excludes a nutrient the user has hidden even if it is in the allow-list', () => {
    const rows = getVisibleTotalsRows(totals, new Set(['protein']), ['kcal', 'protein']);
    expect(rows.map((r) => r.key)).toEqual(['kcal']);
  });

  it('returns every nutrient when no allow-list is given', () => {
    const rows = getVisibleTotalsRows(totals, new Set());
    expect(rows).toHaveLength(8);
  });

  it('carries the correct numeric value through for each key', () => {
    const rows = getVisibleTotalsRows(totals, new Set(), ['kcal', 'sodium']);
    expect(rows.find((r) => r.key === 'kcal')?.value).toBe(500);
    expect(rows.find((r) => r.key === 'sodium')?.value).toBe(300);
  });
});

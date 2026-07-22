import { describe, expect, it } from 'vitest';

import type { MealLogEntry } from '@/types/mealLog';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';

function entry(overrides: Partial<MealLogEntry> = {}): MealLogEntry {
  return {
    recipeId: 'r-oatmeal',
    date: '2026-07-15',
    loggedAt: 0,
    servings: 1,
    nutritionSnapshot: { kcal: 260, proteinGrams: 7, source: 'estimated', completeness: 'partial' },
    ...overrides,
  };
}

describe('calculateConsumedNutritionForDate', () => {
  it('sums only entries logged on the given date', () => {
    const entries = [entry({ date: '2026-07-15' }), entry({ date: '2026-07-16' })];
    const totals = calculateConsumedNutritionForDate(entries, '2026-07-15');
    expect(totals.kcal).toBe(260);
  });

  it('scales by servings eaten', () => {
    const entries = [entry({ servings: 2 })];
    const totals = calculateConsumedNutritionForDate(entries, '2026-07-15');
    expect(totals.kcal).toBe(520);
    expect(totals.proteinGrams).toBe(14);
  });

  it('sums multiple meals logged the same day', () => {
    const entries = [
      entry({ nutritionSnapshot: { kcal: 260, source: 'estimated', completeness: 'partial' } }),
      entry({ nutritionSnapshot: { kcal: 400, source: 'estimated', completeness: 'partial' } }),
    ];
    const totals = calculateConsumedNutritionForDate(entries, '2026-07-15');
    expect(totals.kcal).toBe(660);
  });

  it('skips entries with no nutrition snapshot without breaking', () => {
    const entries = [entry({ nutritionSnapshot: undefined }), entry({ nutritionSnapshot: { kcal: 100, source: 'estimated', completeness: 'partial' } })];
    const totals = calculateConsumedNutritionForDate(entries, '2026-07-15');
    expect(totals.kcal).toBe(100);
  });

  it('never counts a planned (not logged) meal — only entries in the log contribute at all', () => {
    const totals = calculateConsumedNutritionForDate([], '2026-07-15');
    expect(totals.kcal).toBe(0);
  });

  it('defaults to 1 serving for a legacy entry saved before servings existed, instead of producing NaN', () => {
    const legacyEntry = entry({ servings: undefined as unknown as number });
    const totals = calculateConsumedNutritionForDate([legacyEntry], '2026-07-15');
    expect(totals.kcal).toBe(260);
    expect(Number.isNaN(totals.kcal)).toBe(false);
  });
});

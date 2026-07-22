import { describe, expect, it } from 'vitest';

import type { NutritionInfo } from '@/types/nutrition';
import { getVisibleNutritionRows } from '@/utils/getVisibleNutritionRows';

function nutrition(overrides: Partial<NutritionInfo> = {}): NutritionInfo {
  return {
    kcal: 260,
    proteinGrams: 7,
    carbohydrateGrams: 47,
    fatGrams: 5,
    saturatedFatGrams: 1,
    fiberGrams: 6,
    sugarGrams: 14,
    sodiumMilligrams: 90,
    source: 'estimated',
    completeness: 'complete',
    ...overrides,
  };
}

describe('getVisibleNutritionRows', () => {
  it('returns all 8 rows when nothing is hidden', () => {
    const rows = getVisibleNutritionRows(nutrition(), new Set());
    expect(rows).toHaveLength(8);
  });

  it('excludes a nutrient the user has hidden', () => {
    const rows = getVisibleNutritionRows(nutrition(), new Set(['sodium']));
    expect(rows.map((r) => r.key)).not.toContain('sodium');
    expect(rows).toHaveLength(7);
  });

  it('only shows values that are actually present (partial data)', () => {
    const partial = nutrition({ fiberGrams: undefined, sugarGrams: undefined, sodiumMilligrams: undefined, completeness: 'partial' });
    const rows = getVisibleNutritionRows(partial, new Set());
    expect(rows.map((r) => r.key)).toEqual(['kcal', 'protein', 'carbohydrate', 'fat', 'saturatedFat']);
  });

  it('returns nothing when completeness is unavailable, even if stray fields are set', () => {
    const rows = getVisibleNutritionRows(nutrition({ completeness: 'unavailable' }), new Set());
    expect(rows).toEqual([]);
  });
});

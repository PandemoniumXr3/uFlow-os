import { describe, expect, it } from 'vitest';

import type { NutritionInfo } from '@/types/nutrition';
import { createEmptyTotals } from '@/utils/nutrientTotals';
import { resolveRecipeNutritionDisplay, resolveTotalsNutritionDisplay } from '@/utils/resolveNutritionDisplay';

const NO_HIDDEN = new Set<never>();

describe('resolveRecipeNutritionDisplay', () => {
  it('is unavailable when the recipe has no nutrition at all', () => {
    const result = resolveRecipeNutritionDisplay(undefined, NO_HIDDEN);
    expect(result.isUnavailable).toBe(true);
    expect(result.kcalLabel).toBeNull();
  });

  it('shows kcal when present', () => {
    const nutrition: NutritionInfo = { kcal: 420, source: 'estimated', completeness: 'partial' };
    const result = resolveRecipeNutritionDisplay(nutrition, NO_HIDDEN);
    expect(result.kcalLabel).toBe('420 kcal');
    expect(result.sourceLabel).toBe('Estimated');
  });

  it('hides kcal specifically when partial data has no kcal field, without going unavailable', () => {
    const nutrition: NutritionInfo = { proteinGrams: 12, source: 'user-entered', completeness: 'partial' };
    const result = resolveRecipeNutritionDisplay(nutrition, NO_HIDDEN);
    expect(result.kcalLabel).toBeNull();
    expect(result.isUnavailable).toBe(false);
    expect(result.macroRows.some((row) => row.key === 'protein')).toBe(true);
    expect(result.sourceLabel).toBe('Entered by you');
  });

  it('is unavailable when completeness is explicitly unavailable', () => {
    const nutrition: NutritionInfo = { kcal: 0, source: 'estimated', completeness: 'unavailable' };
    const result = resolveRecipeNutritionDisplay(nutrition, NO_HIDDEN);
    expect(result.isUnavailable).toBe(true);
  });

  it('retains a genuine zero kcal value rather than treating it as absent', () => {
    const nutrition: NutritionInfo = { kcal: 0, proteinGrams: 0, source: 'verified', completeness: 'complete' };
    const result = resolveRecipeNutritionDisplay(nutrition, NO_HIDDEN);
    expect(result.kcalLabel).toBe('0 kcal');
  });

  it('respects hidden-nutrient settings', () => {
    const nutrition: NutritionInfo = { kcal: 420, proteinGrams: 10, source: 'verified', completeness: 'partial' };
    const result = resolveRecipeNutritionDisplay(nutrition, new Set(['kcal']));
    expect(result.kcalLabel).toBeNull();
    expect(result.macroRows.some((row) => row.key === 'protein')).toBe(true);
  });
});

describe('resolveTotalsNutritionDisplay', () => {
  it('is unavailable when hasNutritionData is false, even if totals object has numeric zeros', () => {
    const totals = createEmptyTotals();
    const result = resolveTotalsNutritionDisplay(totals, false, NO_HIDDEN);
    expect(result.isUnavailable).toBe(true);
    expect(result.kcalLabel).toBeNull();
  });

  it('shows kcal once hasNutritionData is true', () => {
    const totals = { ...createEmptyTotals(), kcal: 350 };
    const result = resolveTotalsNutritionDisplay(totals, true, NO_HIDDEN);
    expect(result.kcalLabel).toBe('350 kcal');
    expect(result.isUnavailable).toBe(false);
  });
});

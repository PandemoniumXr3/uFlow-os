import { describe, expect, it } from 'vitest';

import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-oatmeal',
    name: 'Oatmeal',
    mealType: ['breakfast'],
    categories: [],
    ingredients: [],
    effort: 'low',
    time: 5,
    isFavorite: false,
    createdAt: 0,
    nutrition: { kcal: 260, proteinGrams: 7, source: 'estimated', completeness: 'partial' },
    ...overrides,
  };
}

function planned(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0, ...overrides };
}

describe('calculateProjectedNutritionForDate', () => {
  it('sums projected nutrition for meals planned on the given date', () => {
    const totals = calculateProjectedNutritionForDate([planned()], [recipe()], '2026-07-15');
    expect(totals.kcal).toBe(260);
  });

  it('defaults to 1 serving when servings is not set', () => {
    const totals = calculateProjectedNutritionForDate([planned({ servings: undefined })], [recipe()], '2026-07-15');
    expect(totals.kcal).toBe(260);
  });

  it('scales by planned servings when set', () => {
    const totals = calculateProjectedNutritionForDate([planned({ servings: 3 })], [recipe()], '2026-07-15');
    expect(totals.kcal).toBe(780);
  });

  it('ignores meals planned on a different date', () => {
    const totals = calculateProjectedNutritionForDate([planned({ date: '2026-07-16' })], [recipe()], '2026-07-15');
    expect(totals.kcal).toBe(0);
  });

  it('skips recipes with no nutrition data without breaking', () => {
    const totals = calculateProjectedNutritionForDate([planned()], [recipe({ nutrition: undefined })], '2026-07-15');
    expect(totals.kcal).toBe(0);
  });

  it('a planned-but-not-eaten meal contributes to projected totals but never to consumed totals', () => {
    const projected = calculateProjectedNutritionForDate([planned()], [recipe()], '2026-07-15');
    const consumed = calculateConsumedNutritionForDate([], '2026-07-15');
    expect(projected.kcal).toBe(260);
    expect(consumed.kcal).toBe(0);
  });

  it('drops a planned meal from projected totals once it is excluded by id (eaten), so it never appears in both at once', () => {
    const totals = calculateProjectedNutritionForDate([planned()], [recipe()], '2026-07-15', new Set(['pm-1']));
    expect(totals.kcal).toBe(0);
  });

  it('still counts a different planned meal that has not been excluded', () => {
    const meals = [planned({ id: 'pm-1', recipeId: 'r-oatmeal' }), planned({ id: 'pm-2', recipeId: 'r-other' })];
    const recipes = [recipe(), recipe({ id: 'r-other', nutrition: { kcal: 100, source: 'estimated', completeness: 'partial' } })];
    const totals = calculateProjectedNutritionForDate(meals, recipes, '2026-07-15', new Set(['pm-1']));
    expect(totals.kcal).toBe(100);
  });

  it('does not exclude a different planned meal that happens to share the same recipe (slot-level exclusion, not recipe-level)', () => {
    const meals = [planned({ id: 'pm-1' }), planned({ id: 'pm-2' })];
    const totals = calculateProjectedNutritionForDate(meals, [recipe()], '2026-07-15', new Set(['pm-1']));
    expect(totals.kcal).toBe(260);
  });

  it('never contributes a skipped meal, even without exclusion', () => {
    const totals = calculateProjectedNutritionForDate([planned({ isSkipped: true })], [recipe()], '2026-07-15');
    expect(totals.kcal).toBe(0);
  });

  it('uses customNutrition for a custom meal with no recipeId', () => {
    const custom = planned({
      recipeId: undefined,
      isCustom: true,
      customName: 'Leftovers',
      customNutrition: { kcal: 400, source: 'user-entered', completeness: 'partial' },
    });
    const totals = calculateProjectedNutritionForDate([custom], [], '2026-07-15');
    expect(totals.kcal).toBe(400);
  });
});

import { describe, expect, it } from 'vitest';

import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import { hasConsumedNutritionData, hasProjectedNutritionData } from '@/utils/nutritionDataPresence';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Test recipe',
    mealType: ['breakfast'],
    categories: [],
    ingredients: [],
    effort: 'low',
    time: 5,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

describe('hasConsumedNutritionData', () => {
  it('is false when meals were logged today but none carry a nutrition snapshot', () => {
    const entries: MealLogEntry[] = [{ recipeId: 'r-1', date: '2026-07-17', loggedAt: 0, servings: 1 }];
    expect(hasConsumedNutritionData(entries, '2026-07-17')).toBe(false);
  });

  it('is true once at least one logged meal has a nutrition snapshot', () => {
    const entries: MealLogEntry[] = [
      { recipeId: 'r-1', date: '2026-07-17', loggedAt: 0, servings: 1 },
      { recipeId: 'r-2', date: '2026-07-17', loggedAt: 0, servings: 1, nutritionSnapshot: { kcal: 300, source: 'estimated', completeness: 'partial' } },
    ];
    expect(hasConsumedNutritionData(entries, '2026-07-17')).toBe(true);
  });

  it('ignores entries logged on a different date', () => {
    const entries: MealLogEntry[] = [
      { recipeId: 'r-1', date: '2026-07-16', loggedAt: 0, servings: 1, nutritionSnapshot: { kcal: 300, source: 'estimated', completeness: 'partial' } },
    ];
    expect(hasConsumedNutritionData(entries, '2026-07-17')).toBe(false);
  });
});

describe('hasProjectedNutritionData', () => {
  it('is false when the planned recipe has no nutrition', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-1', date: '2026-07-17', createdAt: 0 }];
    expect(hasProjectedNutritionData(meals, [recipe()], '2026-07-17')).toBe(false);
  });

  it('is true when the planned recipe has nutrition', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-1', date: '2026-07-17', createdAt: 0 }];
    const recipes = [recipe({ nutrition: { kcal: 260, source: 'estimated', completeness: 'partial' } })];
    expect(hasProjectedNutritionData(meals, recipes, '2026-07-17')).toBe(true);
  });

  it('ignores a skipped meal', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-1', date: '2026-07-17', isSkipped: true, createdAt: 0 }];
    const recipes = [recipe({ nutrition: { kcal: 260, source: 'estimated', completeness: 'partial' } })];
    expect(hasProjectedNutritionData(meals, recipes, '2026-07-17')).toBe(false);
  });

  it('ignores an excluded (eaten) planned meal', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-1', date: '2026-07-17', createdAt: 0 }];
    const recipes = [recipe({ nutrition: { kcal: 260, source: 'estimated', completeness: 'partial' } })];
    expect(hasProjectedNutritionData(meals, recipes, '2026-07-17', new Set(['pm-1']))).toBe(false);
  });

  it('is true for a custom meal with its own nutrition', () => {
    const meals: PlannedMeal[] = [
      { id: 'pm-1', date: '2026-07-17', isCustom: true, customName: 'Leftovers', customNutrition: { kcal: 400, source: 'user-entered', completeness: 'partial' }, createdAt: 0 },
    ];
    expect(hasProjectedNutritionData(meals, [], '2026-07-17')).toBe(true);
  });
});

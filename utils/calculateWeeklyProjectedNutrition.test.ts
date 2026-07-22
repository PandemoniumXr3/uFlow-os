import { describe, expect, it } from 'vitest';

import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import { calculateWeeklyProjectedNutrition } from '@/utils/calculateWeeklyProjectedNutrition';

const RANGE = { start: '2026-07-13', end: '2026-07-19' };

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
    nutrition: { kcal: 260, source: 'estimated', completeness: 'partial' },
    ...overrides,
  };
}

function planned(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-14', createdAt: 0, ...overrides };
}

describe('calculateWeeklyProjectedNutrition', () => {
  it('sums planned nutrition across the week for not-yet-eaten meals', () => {
    const result = calculateWeeklyProjectedNutrition([planned()], [recipe()], [], RANGE);
    expect(result.weeklyTotal.kcal).toBe(260);
  });

  it('excludes a meal once it has been eaten, so planned and consumed never overlap', () => {
    const meals = [planned()];
    const logEntries: MealLogEntry[] = [{ date: '2026-07-14', loggedAt: 0, servings: 1, plannedMealId: 'pm-1' }];
    const result = calculateWeeklyProjectedNutrition(meals, [recipe()], logEntries, RANGE);
    expect(result.weeklyTotal.kcal).toBe(0);
  });

  it('excludes a skipped meal', () => {
    const result = calculateWeeklyProjectedNutrition([planned({ isSkipped: true })], [recipe()], [], RANGE);
    expect(result.weeklyTotal.kcal).toBe(0);
  });

  it('ignores meals planned outside the week range', () => {
    const result = calculateWeeklyProjectedNutrition([planned({ date: '2026-07-25' })], [recipe()], [], RANGE);
    expect(result.weeklyTotal.kcal).toBe(0);
  });

  it('places each meal on its own date in byDate', () => {
    const result = calculateWeeklyProjectedNutrition([planned({ date: '2026-07-16' })], [recipe()], [], RANGE);
    const byDate = Object.fromEntries(result.byDate.map((d) => [d.date, d.totals.kcal]));
    expect(byDate['2026-07-16']).toBe(260);
    expect(byDate['2026-07-14']).toBe(0);
  });
});

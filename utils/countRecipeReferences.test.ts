import { describe, expect, it } from 'vitest';

import { countRecipeReferences } from '@/utils/countRecipeReferences';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';

function plannedMeal(recipeId: string): PlannedMeal {
  return { id: `pm-${recipeId}-${Math.random()}`, recipeId, date: '2026-01-01', createdAt: 0 };
}

function logEntry(recipeId: string): MealLogEntry {
  return { recipeId, date: '2026-01-01', loggedAt: 0, servings: 1 };
}

describe('countRecipeReferences', () => {
  it('counts planned meals and history entries for the recipe in current meal plan', () => {
    const counts = countRecipeReferences('r1', [plannedMeal('r1'), plannedMeal('r2')], [logEntry('r1'), logEntry('r1'), logEntry('r2')]);
    expect(counts.plannedMealCount).toBe(1);
    expect(counts.historyCount).toBe(2);
  });

  it('returns zero for a recipe with history only (no current plan)', () => {
    const counts = countRecipeReferences('r1', [], [logEntry('r1')]);
    expect(counts.plannedMealCount).toBe(0);
    expect(counts.historyCount).toBe(1);
  });

  it('returns zero counts for a recipe referenced nowhere', () => {
    const counts = countRecipeReferences('r1', [plannedMeal('r2')], [logEntry('r2')]);
    expect(counts).toEqual({ plannedMealCount: 0, historyCount: 0 });
  });
});

import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';

export interface RecipeReferenceCounts {
  plannedMealCount: number;
  historyCount: number;
}

/**
 * How many planned meals and history (log) entries point at a recipe —
 * shown in the delete confirmation so the user knows what stays behind.
 * Deleting a recipe never touches these records: they keep their recipeId
 * and every screen that reads them already falls back to a plain label
 * (e.g. "Recipe removed") when the lookup misses, so nothing crashes.
 */
export function countRecipeReferences(recipeId: string, plannedMeals: PlannedMeal[], mealLogEntries: MealLogEntry[]): RecipeReferenceCounts {
  return {
    plannedMealCount: plannedMeals.filter((meal) => meal.recipeId === recipeId).length,
    historyCount: mealLogEntries.filter((entry) => entry.recipeId === recipeId).length,
  };
}

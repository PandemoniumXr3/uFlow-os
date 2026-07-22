import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';

export type MealStatus = 'eaten' | 'skipped' | 'planned';

/**
 * A planned meal is "eaten" once a log entry links back to it (plannedMealId
 * match), or — for entries logged before that link existed — falls back to
 * matching same date + recipeId. "Skipped" only applies while not eaten, so
 * marking eaten always wins over a stale skip. Otherwise it's still planned.
 */
export function getMealStatus(meal: PlannedMeal, mealLogEntries: MealLogEntry[]): MealStatus {
  const isEaten = mealLogEntries.some(
    (entry) =>
      entry.plannedMealId === meal.id ||
      (!entry.plannedMealId && entry.date === meal.date && entry.recipeId && entry.recipeId === meal.recipeId)
  );
  if (isEaten) return 'eaten';
  if (meal.isSkipped) return 'skipped';
  return 'planned';
}

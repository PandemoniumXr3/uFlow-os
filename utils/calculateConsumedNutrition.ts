import type { MealLogEntry } from '@/types/mealLog';
import { addNutrition, createEmptyTotals, type NutrientTotals } from '@/utils/nutrientTotals';
import { scaleNutrition } from '@/utils/scaleNutrition';

/**
 * Sums consumed nutrition for meals logged on exactly `dateKey`, using each
 * entry's frozen nutritionSnapshot × servings eaten — never the recipe's
 * current nutrition, so editing a recipe later can't rewrite history.
 * Entries with no snapshot (recipe had no nutrition data at logging time)
 * simply contribute nothing.
 */
export function calculateConsumedNutritionForDate(entries: MealLogEntry[], dateKey: string): NutrientTotals {
  let totals = createEmptyTotals();
  for (const entry of entries) {
    if (entry.date !== dateKey || !entry.nutritionSnapshot) continue;
    totals = addNutrition(totals, scaleNutrition(entry.nutritionSnapshot, entry.servings ?? 1));
  }
  return totals;
}

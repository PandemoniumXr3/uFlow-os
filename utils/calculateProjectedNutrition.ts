import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import { addNutrition, createEmptyTotals, type NutrientTotals } from '@/utils/nutrientTotals';
import { scaleNutrition } from '@/utils/scaleNutrition';

/**
 * Sums *projected* nutrition for meals planned on `dateKey` that haven't
 * been eaten yet — the recipe's (or custom meal's) per-serving nutrition ×
 * planned servings (defaulting to 1). Skipped meals never contribute.
 * Once a planned meal is marked eaten its intent is fulfilled, so the caller
 * passes its id in `excludedPlannedMealIds` and it drops out of "planned"
 * entirely — otherwise the same meal would confusingly appear under both
 * totals at once. Exclusion is by plannedMeal id (not recipeId) so two
 * separate slots planning the same recipe on the same day don't collide.
 */
export function calculateProjectedNutritionForDate(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  dateKey: string,
  excludedPlannedMealIds: ReadonlySet<string> = new Set()
): NutrientTotals {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  let totals = createEmptyTotals();

  for (const planned of plannedMeals) {
    if (planned.date !== dateKey || planned.isSkipped || excludedPlannedMealIds.has(planned.id)) continue;
    const nutrition = planned.isCustom ? planned.customNutrition : recipeById.get(planned.recipeId ?? '')?.nutrition;
    if (!nutrition) continue;
    totals = addNutrition(totals, scaleNutrition(nutrition, planned.servings ?? 1));
  }

  return totals;
}

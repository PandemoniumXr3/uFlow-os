import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';

/**
 * Whether any meal logged on `dateKey` actually carries a nutrition
 * snapshot — separate from "were any meals logged at all." NutrientTotals
 * defaults every field to 0, so summing zero snapshots looks identical to
 * summing one real "0 kcal" value; this is the signal that tells them apart.
 */
export function hasConsumedNutritionData(entries: MealLogEntry[], dateKey: string): boolean {
  return entries.some((entry) => entry.date === dateKey && entry.nutritionSnapshot != null);
}

/**
 * Same idea for planned-but-not-yet-eaten meals: true only if at least one
 * active (not skipped, not excluded) planned meal on `dateKey` resolves to a
 * recipe or custom nutrition object.
 */
export function hasProjectedNutritionData(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  dateKey: string,
  excludedPlannedMealIds: ReadonlySet<string> = new Set()
): boolean {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return plannedMeals.some((meal) => {
    if (meal.date !== dateKey || meal.isSkipped || excludedPlannedMealIds.has(meal.id)) return false;
    const nutrition = meal.isCustom ? meal.customNutrition : recipeById.get(meal.recipeId ?? '')?.nutrition;
    return nutrition != null;
  });
}

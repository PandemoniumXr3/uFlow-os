import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

/**
 * Distinct missing-ingredient display names across every non-skipped,
 * non-custom meal planned on one day — a lightweight, day-scoped version of
 * what Grocery already computes for today/this-week, used purely for the
 * "needed for this day" hint on Day Detail. Deduped by normalized name so
 * two meals both needing Banana show it once.
 */
export function getDayMissingIngredientNames(plannedMeals: PlannedMeal[], recipes: Recipe[], products: Product[], inventoryItems: InventoryItem[]): string[] {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const seen = new Map<string, string>();

  for (const meal of plannedMeals) {
    if (meal.isSkipped || meal.isCustom || !meal.recipeId) continue;
    const recipe = recipeById.get(meal.recipeId);
    if (!recipe) continue;
    const availability = calculateRecipeAvailability(recipe.ingredients, products, inventoryItems);
    for (const name of availability.missing) {
      seen.set(normalizeIngredient(name), name);
    }
  }

  return [...seen.values()];
}

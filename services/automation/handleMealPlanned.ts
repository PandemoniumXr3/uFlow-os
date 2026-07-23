import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { InventoryItem } from '@/types/inventory';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';

export interface HandleMealPlannedInput {
  /** Undefined for a custom meal — there's nothing to check availability for. */
  recipe?: Recipe;
  products: Product[];
  inventoryItems: InventoryItem[];
}

export interface HandleMealPlannedResult {
  /** Ingredients not currently in stock for this specific meal — for instant feedback right after planning. */
  missingIngredientCount: number;
}

/**
 * The actual persistence (mealPlan.addPlannedMeal) stays a one-line hook
 * call in the screen — Grocery demand, Nutrition, Budget, and Today's
 * recommendations are all already derived live from `plannedMeals` via
 * `useMemo`, so nothing here needs to "push" a refresh into them. This
 * handler's only job is the one thing that isn't already computed anywhere
 * at the moment of planning: how many ingredients this specific meal is
 * still missing, for immediate confirmation feedback.
 */
export function handleMealPlanned(input: HandleMealPlannedInput): HandleMealPlannedResult {
  if (!input.recipe) return { missingIngredientCount: 0 };

  const availability = calculateRecipeAvailability(input.recipe.ingredients, input.products, input.inventoryItems);
  return { missingIngredientCount: availability.missing.length };
}

import { combineCostEstimates } from '@/services/budget/combineCostEstimates';
import { estimateExtraPurchaseCost } from '@/services/budget/estimateExtraPurchaseCost';
import { estimateRecipeCost } from '@/services/budget/estimateRecipeCost';
import type { CostEstimate } from '@/types/budget';
import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function estimateForMeal(
  meal: PlannedMeal,
  recipeById: Map<string, Recipe>,
  products: Product[],
  inventoryItems: InventoryItem[],
  mode: 'extra' | 'full'
): CostEstimate {
  if (meal.isCustom) {
    return meal.customEstimatedCostCents != null
      ? { knownCostCents: meal.customEstimatedCostCents, coverageRatio: 1, missingPriceProductIds: [], incompatibleUnitProductIds: [], status: 'complete' }
      : { knownCostCents: 0, coverageRatio: 0, missingPriceProductIds: [], incompatibleUnitProductIds: [], status: 'unavailable' };
  }

  const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
  if (!recipe) return { knownCostCents: 0, coverageRatio: 0, missingPriceProductIds: [], incompatibleUnitProductIds: [], status: 'unavailable' };

  return mode === 'extra'
    ? estimateExtraPurchaseCost(recipe, products, inventoryItems, meal.servings)
    : estimateRecipeCost(recipe, products, inventoryItems, meal.servings);
}

/**
 * Combined cost estimate for a set of planned meals (a day, a week — any
 * subset the caller has already filtered, e.g. by date range) — 'extra' for
 * additional-purchase cost (the default, used for suggestions/Grocery),
 * 'full' for total ingredient value. Always recomputed from the current
 * plannedMeals/recipes/products/inventory, never stored — moving, copying,
 * or deleting a planned meal changes what the caller passes in next render,
 * which is the only thing that needs to happen for the total to update.
 * Skipped meals never contribute, matching how they're excluded from
 * nutrition totals elsewhere in the app.
 */
export function estimateMealPlanCost(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  products: Product[],
  inventoryItems: InventoryItem[],
  mode: 'extra' | 'full' = 'extra'
): CostEstimate {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const estimates = plannedMeals
    .filter((meal) => !meal.isSkipped)
    .map((meal) => estimateForMeal(meal, recipeById, products, inventoryItems, mode));
  return combineCostEstimates(estimates);
}

import { estimateRecipeCost } from '@/services/budget/estimateRecipeCost';
import type { CostEstimate } from '@/types/budget';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface ExtraPurchaseCostEstimate extends CostEstimate {
  extraCostCents: number;
  missingIngredientCount: number;
}

/**
 * Splits a recipe's cost into what's already owned vs. what would need
 * buying, using the same stock-availability classification as the Today
 * suggestion engine (`calculateRecipeAvailability`). Only ingredient lines
 * matching a currently-missing ingredient (by normalized name) contribute
 * to `extraCostCents` — owned/low-stock ingredients contribute nothing
 * extra. This is deliberately the number shown by default in suggestions
 * and Grocery, per the milestone spec: a meal you already have everything
 * for should read as "no extra shopping needed," not its full recipe cost.
 */
export function estimateExtraPurchaseCost(
  recipe: Recipe,
  products: Product[],
  inventoryItems: InventoryItem[],
  servings?: number
): ExtraPurchaseCostEstimate {
  const availability = calculateRecipeAvailability(recipe.ingredients, products, inventoryItems);

  if (availability.missing.length === 0) {
    return {
      knownCostCents: 0,
      coverageRatio: 1,
      missingPriceProductIds: [],
      incompatibleUnitProductIds: [],
      status: 'complete',
      extraCostCents: 0,
      missingIngredientCount: 0,
    };
  }

  const missingNames = new Set(availability.missing.map(normalizeIngredient));
  const missingLines = (recipe.ingredientLines ?? []).filter((line) => missingNames.has(normalizeIngredient(line.name)));
  const missingOnly = estimateRecipeCost({ ...recipe, ingredientLines: missingLines }, products, inventoryItems, servings);

  return {
    knownCostCents: missingOnly.knownCostCents,
    coverageRatio: missingOnly.coverageRatio,
    missingPriceProductIds: missingOnly.missingPriceProductIds,
    incompatibleUnitProductIds: missingOnly.incompatibleUnitProductIds,
    status: missingOnly.status,
    extraCostCents: missingOnly.knownCostCents,
    missingIngredientCount: availability.missing.length,
  };
}

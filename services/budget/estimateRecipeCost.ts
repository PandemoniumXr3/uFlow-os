import { getLastKnownPrice, getPricePerBaseUnitCents } from '@/services/budget/lastKnownPrice';
import type { CostEstimate, CostEstimateStatus } from '@/types/budget';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { normalizeIngredient } from '@/utils/normalizeIngredient';
import { areUnitsCompatible, convertToBaseUnit } from '@/utils/unitConversion';

export interface RecipeCostEstimate extends CostEstimate {
  /** Same value as knownCostCents, named for readability at call sites. */
  totalCostCents: number;
  /** Null when the target serving count is unknown or zero. */
  costPerServingCents: number | null;
}

/**
 * Total + per-serving cost of a recipe, scaled to `servings` (defaults to
 * the recipe's own `servings`, then 1). Only ingredient lines that have a
 * quantity+unit, a matched product, a known price, and a compatible unit
 * contribute to `knownCostCents` — a recipe with no `ingredientLines` at
 * all (true for every un-edited seed recipe today) is always `unavailable`,
 * never a fabricated €0.00.
 */
export function estimateRecipeCost(
  recipe: Recipe,
  products: Product[],
  inventoryItems: InventoryItem[],
  servings?: number
): RecipeCostEstimate {
  const baseServings = recipe.servings ?? 1;
  const targetServings = servings ?? baseServings;
  const scale = baseServings > 0 ? targetServings / baseServings : 1;

  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const quantifiedLines = (recipe.ingredientLines ?? []).filter((line) => line.quantity != null && !!line.unit);

  let knownCostCents = 0;
  let pricedLineCount = 0;
  const missingPriceProductIds: string[] = [];
  const incompatibleUnitProductIds: string[] = [];

  for (const line of quantifiedLines) {
    const product = line.productId
      ? products.find((candidate) => candidate.id === line.productId)
      : productByNormalizedName.get(normalizeIngredient(line.name));

    if (!product) continue; // unmatched ingredient — nothing to attribute a price or a gap to

    const price = getLastKnownPrice(product.id, inventoryItems);
    if (!price) {
      missingPriceProductIds.push(product.id);
      continue;
    }

    const pricePerBaseUnit = getPricePerBaseUnitCents(price);
    const lineBase = convertToBaseUnit(line.quantity as number, line.unit as string);
    const compatible = pricePerBaseUnit != null && lineBase != null && areUnitsCompatible(line.unit as string, price.packageUnit ?? '');
    if (!compatible) {
      incompatibleUnitProductIds.push(product.id);
      continue;
    }

    knownCostCents += (pricePerBaseUnit as number) * (lineBase as NonNullable<typeof lineBase>).baseQuantity;
    pricedLineCount += 1;
  }

  const coverageRatio = quantifiedLines.length > 0 ? pricedLineCount / quantifiedLines.length : 0;
  const status: CostEstimateStatus =
    quantifiedLines.length === 0 ? 'unavailable' : coverageRatio >= 1 ? 'complete' : coverageRatio > 0 ? 'partial' : 'unavailable';

  const scaledKnownCostCents = Math.round(knownCostCents * scale);

  return {
    knownCostCents: scaledKnownCostCents,
    coverageRatio,
    missingPriceProductIds,
    incompatibleUnitProductIds,
    status,
    totalCostCents: scaledKnownCostCents,
    costPerServingCents: targetServings > 0 ? Math.round(scaledKnownCostCents / targetServings) : null,
  };
}

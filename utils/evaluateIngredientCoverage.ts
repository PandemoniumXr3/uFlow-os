import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { RecipeIngredientLine } from '@/types/recipe';
import { normalizeIngredient } from '@/utils/normalizeIngredient';
import { convertFromBaseUnit, convertToBaseUnit } from '@/utils/unitConversion';

export type IngredientStockStatus = 'inStock' | 'partial' | 'missing' | 'alwaysAvailable' | 'unknown';

export interface IngredientCoverage {
  status: IngredientStockStatus;
  /** In the ingredient line's own unit — only set when an exact comparison was possible, never guessed. */
  availableQuantity?: number;
  missingQuantity?: number;
  unit?: string;
}

/**
 * Per-ingredient Stock coverage for Recipe Detail's ingredient rows — a
 * finer-grained sibling of calculateRecipeAvailability (which only
 * classifies whole ingredient names into available/low/missing lists).
 * 'unknown' means no catalog product could be matched at all — never
 * reported as "missing" since that would claim certainty this doesn't have.
 * 'alwaysAvailable' mirrors the rest of the app's "Always keep in Stock"
 * handling (estimateStockDeduction, Grocery restock rules): never treated
 * as missing regardless of the literal recorded quantity.
 */
export function evaluateIngredientCoverage(
  line: RecipeIngredientLine,
  products: Product[],
  inventoryItems: InventoryItem[],
  alwaysInStockProductIds: ReadonlySet<string> = new Set()
): IngredientCoverage {
  const product = line.productId
    ? products.find((candidate) => candidate.id === line.productId)
    : products.find((candidate) => normalizeIngredient(candidate.name) === normalizeIngredient(line.name));

  if (!product) return { status: 'unknown', unit: line.unit };

  if (alwaysInStockProductIds.has(product.id)) {
    return { status: 'alwaysAvailable', unit: line.unit };
  }

  const inventoryItem = inventoryItems.find((item) => item.productId === product.id);
  if (!inventoryItem || inventoryItem.stockStatus === 'empty') {
    return { status: 'missing', missingQuantity: line.quantity, unit: line.unit };
  }

  if (line.quantity != null && line.unit && inventoryItem.quantity != null && inventoryItem.unit) {
    const neededBase = convertToBaseUnit(line.quantity, line.unit);
    const haveBase = convertToBaseUnit(inventoryItem.quantity, inventoryItem.unit);

    if (neededBase && haveBase && neededBase.baseUnit === haveBase.baseUnit) {
      if (haveBase.baseQuantity >= neededBase.baseQuantity) {
        return { status: 'inStock', availableQuantity: line.quantity, unit: line.unit };
      }
      const missingQuantity = convertFromBaseUnit(neededBase.baseQuantity - haveBase.baseQuantity, line.unit) ?? undefined;
      const availableQuantity = convertFromBaseUnit(haveBase.baseQuantity, line.unit) ?? undefined;
      return { status: 'partial', availableQuantity, missingQuantity, unit: line.unit };
    }
  }

  // No exact quantities to compare — fall back to the coarser Stock status signal.
  if (inventoryItem.stockStatus === 'low') return { status: 'partial', unit: line.unit };
  return { status: 'inStock', unit: line.unit };
}

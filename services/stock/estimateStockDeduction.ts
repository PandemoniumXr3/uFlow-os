import type { InventoryItem, StockStatus } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { normalizeIngredient } from '@/utils/normalizeIngredient';
import { areUnitsCompatible, convertFromBaseUnit, convertToBaseUnit, type BaseUnit } from '@/utils/unitConversion';

const STATUS_DOWNGRADE: Record<StockStatus, StockStatus | null> = {
  inStock: 'low',
  low: 'empty',
  empty: null,
};

export interface StockDeductionLine {
  productId: string;
  productName: string;
  inventoryItemId: string;
  isAlwaysInStock: boolean;
  /** 'exact' when the InventoryItem's own quantity+unit lets us subtract precisely; 'statusDowngrade' when only a status step (inStock -> low -> empty) can be offered; 'none' when nothing can be proposed (e.g. already empty). */
  kind: 'exact' | 'statusDowngrade' | 'none';
  quantityToDeductInStockUnit?: number;
  stockBaseUnit?: BaseUnit;
  nextStatus?: StockStatus;
}

/**
 * A preview only — nothing here writes to Stock. Only proposes a line for
 * an ingredient with a structured quantity+unit (Recipe.ingredientLines)
 * that also matches a real InventoryItem; a recipe/custom meal with no
 * structured ingredients yields an empty list, which callers must treat as
 * "nothing to preview", never as "deduct everything" or "deduct nothing"
 * silently guessed. Scales quantities by `servings` relative to the
 * recipe's own serving count, same convention as Budget Mode's cost scaling.
 */
export function estimateStockDeduction(
  recipe: Recipe,
  servings: number,
  products: Product[],
  inventoryItems: InventoryItem[],
  alwaysInStockProductIds: ReadonlySet<string>
): StockDeductionLine[] {
  const lines = recipe.ingredientLines ?? [];
  if (lines.length === 0) return [];

  const baseServings = recipe.servings ?? 1;
  const scale = baseServings > 0 ? servings / baseServings : 1;

  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const inventoryByProductId = new Map(inventoryItems.map((item) => [item.productId, item]));

  const results: StockDeductionLine[] = [];

  for (const line of lines) {
    if (line.quantity == null || !line.unit) continue;

    const product = line.productId
      ? products.find((candidate) => candidate.id === line.productId)
      : productByNormalizedName.get(normalizeIngredient(line.name));
    if (!product) continue;

    const inventoryItem = inventoryByProductId.get(product.id);
    if (!inventoryItem) continue; // nothing in Stock to deduct from

    const isAlwaysInStock = alwaysInStockProductIds.has(product.id);
    const scaledQuantity = line.quantity * scale;

    const canDeductExactly =
      inventoryItem.quantity != null && !!inventoryItem.unit && areUnitsCompatible(line.unit, inventoryItem.unit);

    if (canDeductExactly) {
      const lineBase = convertToBaseUnit(scaledQuantity, line.unit);
      const stockBase = convertToBaseUnit(inventoryItem.quantity as number, inventoryItem.unit as string);
      if (lineBase && stockBase) {
        results.push({
          productId: product.id,
          productName: product.name,
          inventoryItemId: inventoryItem.id,
          isAlwaysInStock,
          kind: 'exact',
          quantityToDeductInStockUnit: lineBase.baseQuantity,
          stockBaseUnit: lineBase.baseUnit,
        });
        continue;
      }
    }

    const nextStatus = STATUS_DOWNGRADE[inventoryItem.stockStatus];
    if (nextStatus) {
      results.push({
        productId: product.id,
        productName: product.name,
        inventoryItemId: inventoryItem.id,
        isAlwaysInStock,
        kind: 'statusDowngrade',
        nextStatus,
      });
    } else {
      results.push({ productId: product.id, productName: product.name, inventoryItemId: inventoryItem.id, isAlwaysInStock, kind: 'none' });
    }
  }

  return results;
}

/**
 * Turns one accepted preview line into the InventoryItem patch to actually
 * write. Never removes the item or clears its always-in-stock preference —
 * only ever adjusts quantity/status, so "Always Keep in Stock" semantics
 * (a separate ProductPreferences flag) are left completely untouched.
 * Quantity never goes below zero; hitting zero also flips status to empty
 * rather than leaving a stale "in stock" label on a 0-quantity item.
 */
export function applyStockDeduction(item: InventoryItem, line: StockDeductionLine): Partial<InventoryItem> {
  if (line.kind === 'exact' && item.quantity != null && item.unit && line.quantityToDeductInStockUnit != null) {
    const currentBase = convertToBaseUnit(item.quantity, item.unit);
    if (currentBase) {
      const nextBaseQuantity = Math.max(0, currentBase.baseQuantity - line.quantityToDeductInStockUnit);
      const nextQuantity = convertFromBaseUnit(nextBaseQuantity, item.unit);
      if (nextQuantity != null) {
        const rounded = Math.round(nextQuantity * 100) / 100;
        return { quantity: rounded, stockStatus: rounded <= 0 ? 'empty' : item.stockStatus };
      }
    }
  }

  if (line.kind === 'statusDowngrade' && line.nextStatus) {
    return { stockStatus: line.nextStatus };
  }

  return {};
}

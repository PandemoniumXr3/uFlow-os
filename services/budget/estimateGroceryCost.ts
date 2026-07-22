import { getLastKnownPrice, getPricePerBaseUnitCents } from '@/services/budget/lastKnownPrice';
import type { CostEstimate, CostEstimateStatus } from '@/types/budget';
import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';
import { areUnitsCompatible, convertToBaseUnit } from '@/utils/unitConversion';

export interface GroceryCostEstimate extends CostEstimate {
  itemCount: number;
  pricedItemCount: number;
}

/**
 * Cost of a single shopping item's quantity, or null when it can't be
 * estimated (no product match, no recorded price, no quantity/unit, or an
 * incompatible unit) — never 0. Shared by `estimateGroceryCost` and by
 * per-item display (e.g. ShoppingItemCard) so both agree on the same number.
 */
export function estimateShoppingItemCostCents(item: ShoppingItem, inventoryItems: InventoryItem[]): number | null {
  if (!item.productId || item.quantity == null || !item.unit) return null;

  const price = getLastKnownPrice(item.productId, inventoryItems);
  if (!price) return null;

  const pricePerBaseUnit = getPricePerBaseUnitCents(price);
  const itemBase = convertToBaseUnit(item.quantity, item.unit);
  if (pricePerBaseUnit == null || !itemBase || !areUnitsCompatible(item.unit, price.packageUnit ?? '')) return null;

  return Math.round(pricePerBaseUnit * itemBase.baseQuantity);
}

/**
 * Subtotal for a set of shopping items (e.g. all active items, just "needed
 * today", or "needed this week" — callers pass whichever subset they want
 * totaled). Only items with a product match, a known price, and a
 * quantity+unit compatible with that price's package unit contribute —
 * most meal-derived items don't carry a quantity yet (recipes don't have
 * one), so they simply don't contribute rather than counting as zero.
 * Always recalculated from current data, never a stored total.
 */
export function estimateGroceryCost(items: ShoppingItem[], inventoryItems: InventoryItem[]): GroceryCostEstimate {
  let knownCostCents = 0;
  let pricedItemCount = 0;
  const missingPriceProductIds: string[] = [];
  const incompatibleUnitProductIds: string[] = [];

  const priceableItems = items.filter((item) => !!item.productId && item.quantity != null && !!item.unit);

  for (const item of priceableItems) {
    const cost = estimateShoppingItemCostCents(item, inventoryItems);
    if (cost == null) {
      const price = getLastKnownPrice(item.productId as string, inventoryItems);
      if (!price) {
        missingPriceProductIds.push(item.productId as string);
      } else {
        incompatibleUnitProductIds.push(item.productId as string);
      }
      continue;
    }

    knownCostCents += cost;
    pricedItemCount += 1;
  }

  const coverageRatio = priceableItems.length > 0 ? pricedItemCount / priceableItems.length : 0;
  const status: CostEstimateStatus =
    priceableItems.length === 0 ? 'unavailable' : coverageRatio >= 1 ? 'complete' : coverageRatio > 0 ? 'partial' : 'unavailable';

  return {
    knownCostCents: Math.round(knownCostCents),
    coverageRatio,
    missingPriceProductIds,
    incompatibleUnitProductIds,
    status,
    itemCount: items.length,
    pricedItemCount,
  };
}

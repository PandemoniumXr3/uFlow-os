import type { InventoryItem } from '@/types/inventory';
import { convertToBaseUnit } from '@/utils/unitConversion';

export interface LastKnownPrice {
  priceCents: number;
  packageQuantity?: number;
  packageUnit?: string;
  store?: string;
  purchaseDate?: string;
}

/**
 * A product's price is derived from its (at most one) InventoryItem, never
 * stored redundantly on Product itself — InventoryItem is enforced 1:1 per
 * product, so "last known price" is simply whatever that record currently
 * holds. Restocking at a new price overwrites the old one; there is
 * deliberately no history beyond this, per the milestone's scope.
 */
export function getLastKnownPrice(productId: string, inventoryItems: InventoryItem[]): LastKnownPrice | null {
  const item = inventoryItems.find((candidate) => candidate.productId === productId);
  if (!item || item.lastPurchasePriceCents == null) return null;

  return {
    priceCents: item.lastPurchasePriceCents,
    packageQuantity: item.packageQuantity,
    packageUnit: item.packageUnit,
    store: item.store,
    purchaseDate: item.purchaseDate,
  };
}

/**
 * Price per canonical base unit (g / ml / piece), when the package quantity
 * and unit are both known and convertible. Returns null rather than
 * guessing — e.g. a price with no recorded package size, or a package unit
 * that isn't in the supported conversion table, yields no per-base-unit rate.
 */
export function getPricePerBaseUnitCents(price: LastKnownPrice): number | null {
  if (price.packageQuantity == null || !price.packageUnit) return null;

  const base = convertToBaseUnit(price.packageQuantity, price.packageUnit);
  if (!base || base.baseQuantity <= 0) return null;

  return price.priceCents / base.baseQuantity;
}

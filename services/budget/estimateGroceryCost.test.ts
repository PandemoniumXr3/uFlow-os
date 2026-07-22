import { describe, expect, it } from 'vitest';

import { estimateGroceryCost } from '@/services/budget/estimateGroceryCost';
import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'si-1',
    displayName: 'Banana',
    normalizedName: 'banana',
    source: 'manual',
    reasons: [],
    linkedRecipeIds: [],
    linkedMealPlanIds: [],
    checked: false,
    purchased: false,
    priority: 'normal',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-1',
    stockStatus: 'inStock',
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('estimateGroceryCost', () => {
  it('is unavailable, never €0.00, for an empty list', () => {
    const result = estimateGroceryCost([], []);
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
  });

  it('is unavailable when items exist but none carry a quantity (the common meal-derived case today)', () => {
    const items = [shoppingItem({ productId: 'p-1', quantity: undefined, unit: undefined })];
    const result = estimateGroceryCost(items, [inventoryItem({ lastPurchasePriceCents: 200, packageQuantity: 1, packageUnit: 'kg' })]);
    expect(result.status).toBe('unavailable');
    expect(result.itemCount).toBe(1);
    expect(result.pricedItemCount).toBe(0);
  });

  it('sums a known subtotal across multiple priced items', () => {
    const items = [
      shoppingItem({ id: 'si-1', productId: 'p-almond-milk', quantity: 1, unit: 'l' }),
      shoppingItem({ id: 'si-2', productId: 'p-banana', quantity: 500, unit: 'g' }),
    ];
    const inventory = [
      inventoryItem({ productId: 'p-almond-milk', lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l' }),
      inventoryItem({ id: 'inv-2', productId: 'p-banana', lastPurchasePriceCents: 199, packageQuantity: 1, packageUnit: 'kg' }),
    ];

    const result = estimateGroceryCost(items, inventory);

    // 1l @ 249c/l = 249c, 500g @ 0.199c/g = 99.5c -> 348.5 rounds to 349
    expect(result.status).toBe('complete');
    expect(result.knownCostCents).toBe(349);
    expect(result.pricedItemCount).toBe(2);
  });

  it('recalculates a lower subtotal once an item is removed from the list — never a stored total', () => {
    const items = [
      shoppingItem({ id: 'si-1', productId: 'p-almond-milk', quantity: 1, unit: 'l' }),
      shoppingItem({ id: 'si-2', productId: 'p-banana', quantity: 500, unit: 'g' }),
    ];
    const inventory = [
      inventoryItem({ productId: 'p-almond-milk', lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l' }),
      inventoryItem({ id: 'inv-2', productId: 'p-banana', lastPurchasePriceCents: 199, packageQuantity: 1, packageUnit: 'kg' }),
    ];

    const before = estimateGroceryCost(items, inventory);
    const after = estimateGroceryCost(items.slice(0, 1), inventory); // banana item deleted

    expect(after.knownCostCents).toBeLessThan(before.knownCostCents);
    expect(after.itemCount).toBe(1);
  });

  it('is partial and lists the missing product when one of two items has no price', () => {
    const items = [
      shoppingItem({ id: 'si-1', productId: 'p-almond-milk', quantity: 1, unit: 'l' }),
      shoppingItem({ id: 'si-2', productId: 'p-banana', quantity: 500, unit: 'g' }),
    ];
    const inventory = [inventoryItem({ productId: 'p-almond-milk', lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l' })];

    const result = estimateGroceryCost(items, inventory);

    expect(result.status).toBe('partial');
    expect(result.missingPriceProductIds).toEqual(['p-banana']);
    expect(result.knownCostCents).toBe(249);
  });
});

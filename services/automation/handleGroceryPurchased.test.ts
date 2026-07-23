import { describe, expect, it } from 'vitest';

import { handleGroceryPurchased } from '@/services/automation/handleGroceryPurchased';
import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item1',
    productId: 'p-banana',
    displayName: 'Banana',
    normalizedName: 'banana',
    quantity: 1,
    unit: 'kg',
    source: 'automatic',
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

describe('handleGroceryPurchased', () => {
  it('creates a new Stock item when none exists yet and records the price patch', () => {
    const result = handleGroceryPurchased({
      item: shoppingItem(),
      inventoryItems: [],
      priceCents: 249,
      defaultStore: 'Albert Heijn',
      purchaseDate: '2026-01-01',
    });

    expect(result.alreadyPurchased).toBe(false);
    expect(result.stockAction.type).toBe('create');
    expect(result.priceInfoPatch).toEqual({
      lastPurchasePriceCents: 249,
      packageQuantity: 1,
      packageUnit: 'kg',
      store: 'Albert Heijn',
      purchaseDate: '2026-01-01',
    });
  });

  it('updates the existing Stock item when the product is already tracked', () => {
    const existing: InventoryItem = {
      id: 'inv1',
      productId: 'p-banana',
      stockStatus: 'empty',
      location: 'pantry',
      source: 'manual',
      createdAt: 0,
      updatedAt: 0,
    };

    const result = handleGroceryPurchased({ item: shoppingItem(), inventoryItems: [existing] });

    expect(result.stockAction).toEqual({
      type: 'update',
      inventoryItemId: 'inv1',
      patch: { stockStatus: 'inStock', quantity: 1, unit: 'kg' },
    });
    expect(result.priceInfoPatch).toBeNull();
  });

  it('skips the price patch entirely when no price is provided — never guesses', () => {
    const result = handleGroceryPurchased({ item: shoppingItem(), inventoryItems: [] });
    expect(result.priceInfoPatch).toBeNull();
  });

  it('refuses to act again on an item already marked purchased (idempotency)', () => {
    const result = handleGroceryPurchased({ item: shoppingItem({ purchased: true }), inventoryItems: [], priceCents: 249 });
    expect(result.alreadyPurchased).toBe(true);
    expect(result.stockAction).toEqual({ type: 'none', reason: 'Already purchased' });
    expect(result.priceInfoPatch).toBeNull();
  });

  it('does not attach a price patch for an item with no linked catalog product', () => {
    const result = handleGroceryPurchased({ item: shoppingItem({ productId: undefined }), inventoryItems: [], priceCents: 249 });
    expect(result.stockAction.type).toBe('none');
    expect(result.priceInfoPatch).toBeNull();
  });
});

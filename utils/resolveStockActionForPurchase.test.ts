import { describe, expect, it } from 'vitest';

import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';
import { resolveStockActionForPurchase } from '@/utils/resolveStockActionForPurchase';

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'si-1',
    productId: 'p-almond-milk',
    displayName: 'Almond Milk',
    normalizedName: 'almond milk',
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

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-almond-milk',
    stockStatus: 'empty',
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('resolveStockActionForPurchase', () => {
  it('returns none when the shopping item has no linked catalog product', () => {
    const action = resolveStockActionForPurchase(shoppingItem({ productId: undefined }), undefined);
    expect(action.type).toBe('none');
  });

  it('creates a new inStock InventoryItem when none exists yet', () => {
    const action = resolveStockActionForPurchase(shoppingItem({ quantity: 1, unit: 'L' }), undefined);
    expect(action).toEqual({
      type: 'create',
      newItem: { productId: 'p-almond-milk', stockStatus: 'inStock', location: 'pantry', quantity: 1, unit: 'L' },
    });
  });

  it('updates an existing empty item to inStock rather than creating a duplicate', () => {
    const existing = inventoryItem({ stockStatus: 'empty' });
    const action = resolveStockActionForPurchase(shoppingItem(), existing);
    expect(action).toEqual({
      type: 'update',
      inventoryItemId: 'inv-1',
      patch: { stockStatus: 'inStock', quantity: undefined, unit: undefined },
    });
  });

  it('updates an existing low item to inStock', () => {
    const existing = inventoryItem({ stockStatus: 'low' });
    const action = resolveStockActionForPurchase(shoppingItem(), existing);
    expect(action.type).toBe('update');
    if (action.type === 'update') {
      expect(action.patch.stockStatus).toBe('inStock');
    }
  });

  it('preserves existing quantity/unit when the shopping item does not specify its own', () => {
    const existing = inventoryItem({ quantity: 3, unit: 'pcs' });
    const action = resolveStockActionForPurchase(shoppingItem(), existing);
    expect(action.type).toBe('update');
    if (action.type === 'update') {
      expect(action.patch.quantity).toBe(3);
      expect(action.patch.unit).toBe('pcs');
    }
  });
});

import { describe, expect, it } from 'vitest';

import { findExpiringIngredients } from '@/services/decision/findExpiringIngredients';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-spinach', name: 'Spinach', category: 'Vegetables', isFavorite: false, createdAt: 0, ...overrides };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-spinach',
    stockStatus: 'inStock',
    location: 'fridge',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('findExpiringIngredients', () => {
  it('names an ingredient whose matched product expires soon', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const result = findExpiringIngredients(['Spinach'], [product()], [inventoryItem({ expirationDate: dateStr })]);
    expect(result.names).toEqual(['Spinach']);
    expect(result.productIds).toEqual(['p-spinach']);
  });

  it('ignores an ingredient with no expiration date set', () => {
    const result = findExpiringIngredients(['Spinach'], [product()], [inventoryItem({ expirationDate: undefined })]);
    expect(result.names).toEqual([]);
  });

  it('ignores an ingredient that cannot be matched to any product', () => {
    const result = findExpiringIngredients(['Mystery Sauce'], [], []);
    expect(result.names).toEqual([]);
  });

  it('ignores a product expiring far in the future', () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 30);
    const result = findExpiringIngredients(['Spinach'], [product()], [inventoryItem({ expirationDate: farFuture.toISOString().slice(0, 10) })]);
    expect(result.names).toEqual([]);
  });
});

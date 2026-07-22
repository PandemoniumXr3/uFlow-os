import { describe, expect, it } from 'vitest';

import { getLastKnownPrice, getPricePerBaseUnitCents } from '@/services/budget/lastKnownPrice';
import type { InventoryItem } from '@/types/inventory';

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-almond-milk',
    stockStatus: 'inStock',
    location: 'fridge',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('getLastKnownPrice', () => {
  it('returns null when there is no InventoryItem for the product', () => {
    expect(getLastKnownPrice('p-unknown', [inventoryItem()])).toBeNull();
  });

  it('returns null when the item exists but has never had a price recorded', () => {
    expect(getLastKnownPrice('p-almond-milk', [inventoryItem({ lastPurchasePriceCents: undefined })])).toBeNull();
  });

  it('returns the recorded price fields when present', () => {
    const item = inventoryItem({ lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l', store: 'Albert Heijn' });
    expect(getLastKnownPrice('p-almond-milk', [item])).toEqual({
      priceCents: 249,
      packageQuantity: 1,
      packageUnit: 'l',
      store: 'Albert Heijn',
      purchaseDate: undefined,
    });
  });
});

describe('getPricePerBaseUnitCents', () => {
  it('computes price per base unit for a litre package', () => {
    const price = getPricePerBaseUnitCents({ priceCents: 249, packageQuantity: 1, packageUnit: 'l' });
    expect(price).toBeCloseTo(0.249, 5); // 249 cents / 1000 ml
  });

  it('computes price per base unit for a kilogram package', () => {
    const price = getPricePerBaseUnitCents({ priceCents: 199, packageQuantity: 1, packageUnit: 'kg' });
    expect(price).toBeCloseTo(0.199, 5); // 199 cents / 1000 g
  });

  it('returns null when no package quantity/unit was recorded', () => {
    expect(getPricePerBaseUnitCents({ priceCents: 249 })).toBeNull();
  });

  it('returns null when the package unit is not a supported conversion', () => {
    expect(getPricePerBaseUnitCents({ priceCents: 249, packageQuantity: 2, packageUnit: 'tbsp' })).toBeNull();
  });
});

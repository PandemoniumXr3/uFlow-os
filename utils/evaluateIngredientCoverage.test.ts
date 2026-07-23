import { describe, expect, it } from 'vitest';

import { evaluateIngredientCoverage } from '@/utils/evaluateIngredientCoverage';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';

function product(): Product {
  return { id: 'p-banana', name: 'Banana', category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return { id: 'inv1', productId: 'p-banana', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0, ...overrides };
}

describe('evaluateIngredientCoverage', () => {
  it('reports unknown when no catalog product matches', () => {
    const result = evaluateIngredientCoverage({ name: 'Dragonfruit', quantity: 1, unit: 'piece' }, [], []);
    expect(result.status).toBe('unknown');
  });

  it('reports alwaysAvailable for an always-in-stock product regardless of quantity', () => {
    const result = evaluateIngredientCoverage(
      { name: 'Banana', quantity: 5, unit: 'piece' },
      [product()],
      [inventoryItem({ quantity: 0, unit: 'piece' })],
      new Set(['p-banana'])
    );
    expect(result.status).toBe('alwaysAvailable');
  });

  it('reports missing when there is no Stock record at all', () => {
    const result = evaluateIngredientCoverage({ name: 'Banana', quantity: 2, unit: 'piece' }, [product()], []);
    expect(result.status).toBe('missing');
    expect(result.missingQuantity).toBe(2);
  });

  it('reports missing when Stock is explicitly empty', () => {
    const result = evaluateIngredientCoverage(
      { name: 'Banana', quantity: 2, unit: 'piece' },
      [product()],
      [inventoryItem({ stockStatus: 'empty' })]
    );
    expect(result.status).toBe('missing');
  });

  it('reports inStock with an exact comparison when enough is on hand', () => {
    const result = evaluateIngredientCoverage(
      { name: 'Banana', quantity: 2, unit: 'piece' },
      [product()],
      [inventoryItem({ quantity: 5, unit: 'piece' })]
    );
    expect(result.status).toBe('inStock');
    expect(result.availableQuantity).toBe(2);
  });

  it('reports partial with exact available/missing amounts when not enough is on hand', () => {
    const result = evaluateIngredientCoverage(
      { name: 'Banana', quantity: 500, unit: 'g' },
      [product()],
      [inventoryItem({ quantity: 200, unit: 'g' })]
    );
    expect(result.status).toBe('partial');
    expect(result.availableQuantity).toBe(200);
    expect(result.missingQuantity).toBe(300);
  });

  it('falls back to the coarse stockStatus when units are not comparable', () => {
    const result = evaluateIngredientCoverage(
      { name: 'Banana', quantity: 1, unit: 'piece' },
      [product()],
      [inventoryItem({ stockStatus: 'low', quantity: 200, unit: 'ml' })]
    );
    expect(result.status).toBe('partial');
    expect(result.availableQuantity).toBeUndefined();
  });

  it('reports inStock when the ingredient line has no quantity/unit but Stock is fine', () => {
    const result = evaluateIngredientCoverage({ name: 'Banana' }, [product()], [inventoryItem()]);
    expect(result.status).toBe('inStock');
  });
});

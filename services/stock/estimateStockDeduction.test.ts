import { describe, expect, it } from 'vitest';

import { applyStockDeduction, estimateStockDeduction, type StockDeductionLine } from '@/services/stock/estimateStockDeduction';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Oatmeal',
    mealType: ['breakfast'],
    categories: [],
    ingredients: ['Oats'],
    effort: 'low',
    time: 5,
    servings: 1,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-oats', name: 'Oats', category: 'Breakfast', isFavorite: false, createdAt: 0, ...overrides };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-oats',
    stockStatus: 'inStock',
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('estimateStockDeduction', () => {
  it('returns nothing for a recipe with no structured ingredient lines (e.g. a custom meal)', () => {
    const result = estimateStockDeduction(recipe({ ingredientLines: undefined }), 1, [product()], [inventoryItem()], new Set());
    expect(result).toEqual([]);
  });

  it('proposes an exact deduction when the InventoryItem has a compatible quantity/unit', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const item = inventoryItem({ quantity: 500, unit: 'g' });
    const result = estimateStockDeduction(testRecipe, 1, [product()], [item], new Set());
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('exact');
    expect(result[0].quantityToDeductInStockUnit).toBe(50);
  });

  it('scales the deduction by servings relative to the recipe default', () => {
    const testRecipe = recipe({ servings: 1, ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const item = inventoryItem({ quantity: 500, unit: 'g' });
    const result = estimateStockDeduction(testRecipe, 3, [product()], [item], new Set());
    expect(result[0].quantityToDeductInStockUnit).toBe(150);
  });

  it('falls back to a status downgrade when the InventoryItem has no quantity/unit recorded', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const item = inventoryItem({ quantity: undefined, unit: undefined, stockStatus: 'inStock' });
    const result = estimateStockDeduction(testRecipe, 1, [product()], [item], new Set());
    expect(result[0].kind).toBe('statusDowngrade');
    expect(result[0].nextStatus).toBe('low');
  });

  it('proposes empty -> nothing further ("none") rather than an invalid downgrade', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const item = inventoryItem({ quantity: undefined, unit: undefined, stockStatus: 'empty' });
    const result = estimateStockDeduction(testRecipe, 1, [product()], [item], new Set());
    expect(result[0].kind).toBe('none');
  });

  it('skips an ingredient with no matching InventoryItem at all — nothing to deduct from', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const result = estimateStockDeduction(testRecipe, 1, [product()], [], new Set());
    expect(result).toEqual([]);
  });

  it('still proposes a deduction for an always-in-stock product, flagged so the caller can label it, never silently skipped', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] });
    const item = inventoryItem({ quantity: 500, unit: 'g' });
    const result = estimateStockDeduction(testRecipe, 1, [product()], [item], new Set(['p-oats']));
    expect(result[0].isAlwaysInStock).toBe(true);
    expect(result[0].kind).toBe('exact');
  });
});

describe('applyStockDeduction', () => {
  it("subtracts an exact quantity in the InventoryItem's own unit, converting through kg/g correctly", () => {
    const item = inventoryItem({ quantity: 0.5, unit: 'kg' });
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: false, kind: 'exact', quantityToDeductInStockUnit: 50, stockBaseUnit: 'g' };
    const patch = applyStockDeduction(item, line);
    expect(patch.quantity).toBeCloseTo(0.45, 5);
    expect(patch.stockStatus).toBe('inStock');
  });

  it('flips status to empty once the quantity reaches zero, never leaving a stale inStock label', () => {
    const item = inventoryItem({ quantity: 50, unit: 'g', stockStatus: 'inStock' });
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: false, kind: 'exact', quantityToDeductInStockUnit: 50, stockBaseUnit: 'g' };
    const patch = applyStockDeduction(item, line);
    expect(patch.quantity).toBe(0);
    expect(patch.stockStatus).toBe('empty');
  });

  it('never lets quantity go negative when deducting more than is on hand', () => {
    const item = inventoryItem({ quantity: 20, unit: 'g' });
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: false, kind: 'exact', quantityToDeductInStockUnit: 50, stockBaseUnit: 'g' };
    const patch = applyStockDeduction(item, line);
    expect(patch.quantity).toBe(0);
  });

  it('applies a status-only downgrade when the line kind is statusDowngrade', () => {
    const item = inventoryItem({ stockStatus: 'inStock' });
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: false, kind: 'statusDowngrade', nextStatus: 'low' };
    expect(applyStockDeduction(item, line)).toEqual({ stockStatus: 'low' });
  });

  it('returns an empty patch for kind "none", never inventing a change', () => {
    const item = inventoryItem();
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: false, kind: 'none' };
    expect(applyStockDeduction(item, line)).toEqual({});
  });

  it('never clears the always-in-stock flag — that lives on a separate preference, untouched here', () => {
    const item = inventoryItem({ quantity: 100, unit: 'g' });
    const line: StockDeductionLine = { productId: 'p-oats', productName: 'Oats', inventoryItemId: 'inv-1', isAlwaysInStock: true, kind: 'exact', quantityToDeductInStockUnit: 20, stockBaseUnit: 'g' };
    const patch = applyStockDeduction(item, line);
    expect(Object.keys(patch)).not.toContain('alwaysInStock');
  });
});

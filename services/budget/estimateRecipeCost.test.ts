import { describe, expect, it } from 'vitest';

import { estimateRecipeCost } from '@/services/budget/estimateRecipeCost';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Oatmeal',
    mealType: ['breakfast'],
    categories: [],
    ingredients: ['Oats', 'Almond Milk', 'Banana'],
    effort: 'low',
    time: 5,
    servings: 1,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-1', name: 'Almond Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 0, ...overrides };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-1',
    stockStatus: 'inStock',
    location: 'fridge',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('estimateRecipeCost', () => {
  it('is unavailable, never €0.00, when the recipe has no ingredientLines at all', () => {
    const result = estimateRecipeCost(recipe(), [], []);
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
    expect(result.coverageRatio).toBe(0);
  });

  it('computes a complete cost when every ingredient line resolves', () => {
    const almondMilk = product({ id: 'p-almond-milk', name: 'Almond Milk' });
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const products = [almondMilk, banana];
    const inventory = [
      inventoryItem({ productId: 'p-almond-milk', lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l' }),
      inventoryItem({ id: 'inv-2', productId: 'p-banana', lastPurchasePriceCents: 199, packageQuantity: 1, packageUnit: 'kg' }),
    ];
    const testRecipe = recipe({
      ingredientLines: [
        { name: 'Almond Milk', quantity: 200, unit: 'ml' },
        { name: 'Banana', quantity: 120, unit: 'g' },
      ],
    });

    const result = estimateRecipeCost(testRecipe, products, inventory);

    // 200ml * (249/1000) + 120g * (199/1000) = 49.8 + 23.88 = 73.68 -> rounds to 74
    expect(result.status).toBe('complete');
    expect(result.coverageRatio).toBe(1);
    expect(result.knownCostCents).toBe(74);
    expect(result.totalCostCents).toBe(74);
  });

  it('scales total and per-serving cost with the target servings, independent of the recipe default', () => {
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const inventory = [inventoryItem({ productId: 'p-banana', lastPurchasePriceCents: 200, packageQuantity: 1, packageUnit: 'kg' })];
    const testRecipe = recipe({ servings: 1, ingredientLines: [{ name: 'Banana', quantity: 100, unit: 'g' }] });

    const oneServing = estimateRecipeCost(testRecipe, [banana], inventory, 1);
    const fourServings = estimateRecipeCost(testRecipe, [banana], inventory, 4);

    expect(oneServing.knownCostCents).toBe(20); // 100g * 0.2 cents/g
    expect(fourServings.knownCostCents).toBe(80);
    expect(fourServings.costPerServingCents).toBe(20);
  });

  it('is partial and lists the product with a missing price, without inventing a cost for it', () => {
    const almondMilk = product({ id: 'p-almond-milk', name: 'Almond Milk' });
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const inventory = [
      inventoryItem({ productId: 'p-almond-milk', lastPurchasePriceCents: 249, packageQuantity: 1, packageUnit: 'l' }),
      // banana has an InventoryItem but no recorded price
      inventoryItem({ id: 'inv-2', productId: 'p-banana' }),
    ];
    const testRecipe = recipe({
      ingredientLines: [
        { name: 'Almond Milk', quantity: 200, unit: 'ml' },
        { name: 'Banana', quantity: 100, unit: 'g' },
      ],
    });

    const result = estimateRecipeCost(testRecipe, [almondMilk, banana], inventory);

    expect(result.status).toBe('partial');
    expect(result.coverageRatio).toBe(0.5);
    expect(result.missingPriceProductIds).toEqual(['p-banana']);
    expect(result.knownCostCents).toBe(50); // only the almond milk portion
  });

  it('flags an incompatible unit instead of guessing a conversion', () => {
    const flour = product({ id: 'p-flour', name: 'Flour' });
    const inventory = [inventoryItem({ productId: 'p-flour', lastPurchasePriceCents: 150, packageQuantity: 1, packageUnit: 'kg' })];
    const testRecipe = recipe({ ingredientLines: [{ name: 'Flour', quantity: 2, unit: 'tbsp' }] });

    const result = estimateRecipeCost(testRecipe, [flour], inventory);

    expect(result.status).toBe('unavailable');
    expect(result.incompatibleUnitProductIds).toEqual(['p-flour']);
    expect(result.knownCostCents).toBe(0);
  });

  it('skips ingredient lines with no quantity/unit rather than treating them as zero-cost matches', () => {
    const testRecipe = recipe({ ingredientLines: [{ name: 'Salt' }] });
    const result = estimateRecipeCost(testRecipe, [], []);
    expect(result.status).toBe('unavailable');
    expect(result.coverageRatio).toBe(0);
  });

  it('loads a fully legacy Recipe/Product/InventoryItem set (none of the new optional fields present) without throwing', () => {
    // Simulates data saved before Budget Mode existed: no ingredientLines, no price/package fields at all.
    const legacyRecipe = recipe({ ingredientLines: undefined });
    const legacyProduct = product();
    const legacyInventoryItem = {
      id: 'inv-1',
      productId: 'p-1',
      stockStatus: 'inStock' as const,
      location: 'pantry' as const,
      source: 'manual' as const,
      createdAt: 0,
      updatedAt: 0,
    };

    expect(() => estimateRecipeCost(legacyRecipe, [legacyProduct], [legacyInventoryItem])).not.toThrow();
    const result = estimateRecipeCost(legacyRecipe, [legacyProduct], [legacyInventoryItem]);
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';

import { estimateExtraPurchaseCost } from '@/services/budget/estimateExtraPurchaseCost';
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
  return { id: 'p-1', name: 'Product', category: 'Pantry', isFavorite: false, createdAt: 0, ...overrides };
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

describe('estimateExtraPurchaseCost', () => {
  it('reports zero extra cost and complete status when nothing is missing', () => {
    const oats = product({ id: 'p-oats', name: 'Oats' });
    const almondMilk = product({ id: 'p-almond-milk', name: 'Almond Milk' });
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const inventory = [
      inventoryItem({ productId: 'p-oats' }),
      inventoryItem({ id: 'inv-2', productId: 'p-almond-milk' }),
      inventoryItem({ id: 'inv-3', productId: 'p-banana' }),
    ];

    const result = estimateExtraPurchaseCost(recipe(), [oats, almondMilk, banana], inventory);

    expect(result.status).toBe('complete');
    expect(result.extraCostCents).toBe(0);
    expect(result.missingIngredientCount).toBe(0);
  });

  it('only counts the missing ingredient toward extra cost, not the ones already in Stock', () => {
    const oats = product({ id: 'p-oats', name: 'Oats' });
    const almondMilk = product({ id: 'p-almond-milk', name: 'Almond Milk' });
    // Banana has no InventoryItem at all -> missing
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const inventory = [
      inventoryItem({ productId: 'p-oats' }),
      inventoryItem({ id: 'inv-2', productId: 'p-almond-milk' }),
      inventoryItem({ id: 'inv-3', productId: 'p-banana', lastPurchasePriceCents: 199, packageQuantity: 1, packageUnit: 'kg' }),
    ];
    const testRecipe = recipe({
      ingredientLines: [
        { name: 'Oats', quantity: 50, unit: 'g' },
        { name: 'Almond Milk', quantity: 200, unit: 'ml' },
        { name: 'Banana', quantity: 120, unit: 'g' },
      ],
    });

    // Make banana stock-status empty so it counts as missing despite having a priced InventoryItem.
    inventory[2] = { ...inventory[2], stockStatus: 'empty' };

    const result = estimateExtraPurchaseCost(testRecipe, [oats, almondMilk, banana], inventory);

    expect(result.missingIngredientCount).toBe(1);
    expect(result.extraCostCents).toBe(24); // 120g * 0.199 cents/g rounded
  });

  it('is unavailable, not €0.00, when the only missing ingredient has no price data', () => {
    const banana = product({ id: 'p-banana', name: 'Banana' });
    const testRecipe = recipe({ ingredients: ['Banana'], ingredientLines: [{ name: 'Banana', quantity: 120, unit: 'g' }] });

    const result = estimateExtraPurchaseCost(testRecipe, [banana], []);

    expect(result.missingIngredientCount).toBe(1);
    expect(result.status).toBe('unavailable');
    expect(result.extraCostCents).toBe(0);
    expect(result.missingPriceProductIds).toEqual(['p-banana']);
  });
});

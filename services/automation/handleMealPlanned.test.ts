import { describe, expect, it } from 'vitest';

import { handleMealPlanned } from '@/services/automation/handleMealPlanned';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    name: 'Test recipe',
    mealType: ['dinner'],
    categories: [],
    ingredients: ['Banana', 'Oats'],
    effort: 'low',
    time: 10,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(id: string, name: string): Product {
  return { id, name, category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function stockItem(productId: string, stockStatus: InventoryItem['stockStatus']): InventoryItem {
  return { id: `inv-${productId}`, productId, stockStatus, location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0 };
}

describe('handleMealPlanned', () => {
  it('returns zero missing ingredients for a custom meal', () => {
    expect(handleMealPlanned({ recipe: undefined, products: [], inventoryItems: [] })).toEqual({ missingIngredientCount: 0 });
  });

  it('counts ingredients missing from stock', () => {
    const products = [product('p1', 'Banana'), product('p2', 'Oats')];
    const inventoryItems = [stockItem('p1', 'inStock')]; // Oats missing entirely
    const result = handleMealPlanned({ recipe: recipe(), products, inventoryItems });
    expect(result.missingIngredientCount).toBe(1);
  });

  it('is pure — calling it twice with the same input gives the same result', () => {
    const products = [product('p1', 'Banana'), product('p2', 'Oats')];
    const inventoryItems = [stockItem('p1', 'inStock')];
    const input = { recipe: recipe(), products, inventoryItems };
    expect(handleMealPlanned(input)).toEqual(handleMealPlanned(input));
  });
});

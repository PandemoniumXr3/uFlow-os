import { describe, expect, it } from 'vitest';

import { handleStockChanged } from '@/services/automation/handleStockChanged';
import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { getTodayKey } from '@/utils/date';

function recipe(): Recipe {
  return { id: 'r1', name: 'r1', mealType: ['dinner'], categories: [], ingredients: ['Banana'], effort: 'low', time: 10, isFavorite: false, createdAt: 0 };
}

function product(): Product {
  return { id: 'p-banana', name: 'Banana', category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function plannedMeal(): PlannedMeal {
  return { id: 'meal1', recipeId: 'r1', date: getTodayKey(), mealSlot: 'dinner', createdAt: 0 };
}

describe('handleStockChanged', () => {
  it('reports a Grocery item as resolved once Stock covers it', () => {
    const missing: InventoryItem[] = [];
    const stocked: InventoryItem[] = [
      { id: 'inv1', productId: 'p-banana', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0 },
    ];

    const result = handleStockChanged({
      recipes: [recipe()],
      products: [product()],
      plannedMeals: [plannedMeal()],
      alwaysInStockProductIds: new Set(),
      previousInventoryItems: missing,
      nextInventoryItems: stocked,
    });

    expect(result.groceryItemsResolved.map((item) => item.displayName)).toContain('Banana');
  });

  it('reports nothing resolved when the change does not cover any missing ingredient', () => {
    const before: InventoryItem[] = [];
    const after: InventoryItem[] = [
      { id: 'inv1', productId: 'p-other', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0 },
    ];

    const result = handleStockChanged({
      recipes: [recipe()],
      products: [product()],
      plannedMeals: [plannedMeal()],
      alwaysInStockProductIds: new Set(),
      previousInventoryItems: before,
      nextInventoryItems: after,
    });

    expect(result.groceryItemsResolved).toEqual([]);
  });
});

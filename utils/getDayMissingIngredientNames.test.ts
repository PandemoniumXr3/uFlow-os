import { describe, expect, it } from 'vitest';

import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { getDayMissingIngredientNames } from '@/utils/getDayMissingIngredientNames';

function makeProduct(id: string, name: string): Product {
  return { id, name, category: 'Other', isFavorite: false, createdAt: 0 };
}

function makeRecipe(id: string, name: string, ingredients: string[]): Recipe {
  return { id, name, mealType: ['breakfast'], categories: [], ingredients, effort: 'low', time: 5, isFavorite: false, createdAt: 0 };
}

function makeInventoryItem(productId: string, stockStatus: InventoryItem['stockStatus']): InventoryItem {
  return { id: `inv-${productId}`, productId, stockStatus, location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0 };
}

describe('getDayMissingIngredientNames', () => {
  const banana = makeProduct('p-banana', 'Banana');
  const oatmeal = makeRecipe('r-oatmeal', 'Oatmeal', ['Oats', 'Banana']);
  const smoothie = makeRecipe('r-smoothie', 'Smoothie', ['Banana', 'Yogurt']);

  it('dedupes the same missing ingredient across two meals in one day', () => {
    const meals: PlannedMeal[] = [
      { id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0 },
      { id: 'pm-2', recipeId: 'r-smoothie', date: '2026-07-15', createdAt: 0 },
    ];
    const inventory = [makeInventoryItem('p-banana', 'inStock')];
    const names = getDayMissingIngredientNames(meals, [oatmeal, smoothie], [banana], inventory);
    expect(names.sort()).toEqual(['Oats', 'Yogurt']);
  });

  it('excludes a skipped meal', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', isSkipped: true, createdAt: 0 }];
    expect(getDayMissingIngredientNames(meals, [oatmeal], [], [])).toEqual([]);
  });

  it('excludes a custom meal (no ingredient list)', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', date: '2026-07-15', isCustom: true, customName: 'Leftovers', createdAt: 0 }];
    expect(getDayMissingIngredientNames(meals, [], [], [])).toEqual([]);
  });

  it('returns nothing when all ingredients are in stock', () => {
    const meals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0 }];
    const inventory = [makeInventoryItem('p-banana', 'inStock')];
    const oatsInStock = makeRecipe('r-oatmeal', 'Oatmeal', ['Banana']);
    expect(getDayMissingIngredientNames(meals, [oatsInStock], [banana], inventory)).toEqual([]);
  });
});

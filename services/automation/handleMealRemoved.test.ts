import { describe, expect, it } from 'vitest';

import { handleMealRemoved } from '@/services/automation/handleMealRemoved';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { getTodayKey } from '@/utils/date';

function recipe(id: string, ingredients: string[]): Recipe {
  return { id, name: id, mealType: ['dinner'], categories: [], ingredients, effort: 'low', time: 10, isFavorite: false, createdAt: 0 };
}

function product(name: string): Product {
  return { id: `p-${name}`, name, category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function plannedMeal(id: string, recipeId: string): PlannedMeal {
  return { id, recipeId, date: getTodayKey(), mealSlot: 'dinner', createdAt: 0 };
}

describe('handleMealRemoved', () => {
  const recipeA = recipe('recipeA', ['Banana', 'Oats']);
  const recipeB = recipe('recipeB', ['Banana', 'Milk']);
  const products = [product('Banana'), product('Oats'), product('Milk')];
  const mealA = plannedMeal('mealA', 'recipeA');
  const mealB = plannedMeal('mealB', 'recipeB');

  it('removes Grocery demand exclusive to the removed meal', () => {
    const result = handleMealRemoved({
      mealToRemove: mealA,
      plannedMeals: [mealA, mealB],
      recipes: [recipeA, recipeB],
      products,
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
    });

    const removedNames = result.groceryItemsToRemove.map((item) => item.displayName);
    expect(removedNames).toContain('Oats');
    expect(removedNames).not.toContain('Milk');
  });

  it('retains demand for an ingredient still needed by another planned meal', () => {
    const result = handleMealRemoved({
      mealToRemove: mealA,
      plannedMeals: [mealA, mealB],
      recipes: [recipeA, recipeB],
      products,
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
    });

    const retainedNames = result.groceryItemsRetained.map((item) => item.displayName);
    expect(retainedNames).toContain('Banana');
    expect(result.groceryItemsToRemove.map((item) => item.displayName)).not.toContain('Banana');
  });

  it('never returns a manually added item — the automatic list has no manual entries to begin with', () => {
    const result = handleMealRemoved({
      mealToRemove: mealA,
      plannedMeals: [mealA, mealB],
      recipes: [recipeA, recipeB],
      products,
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
    });

    expect(result.groceryItemsToRemove.every((item) => item.source === 'automatic')).toBe(true);
    expect(result.groceryItemsRetained.every((item) => item.source === 'automatic')).toBe(true);
  });

  it('is idempotent — computing the same removal twice yields the same diff', () => {
    const input = {
      mealToRemove: mealA,
      plannedMeals: [mealA, mealB],
      recipes: [recipeA, recipeB],
      products,
      inventoryItems: [],
      alwaysInStockProductIds: new Set<string>(),
    };
    const first = handleMealRemoved(input);
    const second = handleMealRemoved(input);
    expect(first.groceryItemsToRemove.map((i) => i.displayName)).toEqual(second.groceryItemsToRemove.map((i) => i.displayName));
  });
});

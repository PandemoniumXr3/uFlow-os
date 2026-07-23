import { describe, expect, it } from 'vitest';

import { handleMealEaten } from '@/services/automation/handleMealEaten';
import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    name: 'Oatmeal',
    mealType: ['breakfast'],
    categories: [],
    ingredients: ['Banana'],
    ingredientLines: [{ name: 'Banana', quantity: 1, unit: 'piece' }],
    effort: 'low',
    time: 5,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(): Product {
  return { id: 'p-banana', name: 'Banana', category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function inventoryItem(): InventoryItem {
  return { id: 'inv1', productId: 'p-banana', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0, quantity: 3, unit: 'piece' };
}

function plannedMeal(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'meal1', recipeId: 'r1', date: '2026-01-01', mealSlot: 'breakfast', servings: 1, createdAt: 0, ...overrides };
}

describe('handleMealEaten', () => {
  it('logs a recipe meal and proposes a Stock deduction', () => {
    const result = handleMealEaten({
      meal: plannedMeal(),
      recipe: recipe(),
      products: [product()],
      inventoryItems: [inventoryItem()],
      alwaysInStockProductIds: new Set(),
      mealLogEntries: [],
    });

    expect(result.alreadyLogged).toBe(false);
    expect(result.logInput).toMatchObject({ plannedMealId: 'meal1', date: '2026-01-01', servings: 1 });
    expect(result.deductionLines.length).toBeGreaterThan(0);
  });

  it('refuses to log again when this plannedMeal already has a log entry (idempotency)', () => {
    const existingEntry: MealLogEntry = { id: 'log1', recipeId: 'r1', date: '2026-01-01', loggedAt: 0, servings: 1, plannedMealId: 'meal1' };

    const result = handleMealEaten({
      meal: plannedMeal(),
      recipe: recipe(),
      products: [product()],
      inventoryItems: [inventoryItem()],
      alwaysInStockProductIds: new Set(),
      mealLogEntries: [existingEntry],
    });

    expect(result.alreadyLogged).toBe(true);
    expect(result.logInput).toBeNull();
    expect(result.deductionLines).toEqual([]);
  });

  it('produces no deduction lines for a custom meal', () => {
    const result = handleMealEaten({
      meal: plannedMeal({ recipeId: undefined, isCustom: true, customName: 'Leftovers' }),
      recipe: undefined,
      products: [],
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
      mealLogEntries: [],
    });

    expect(result.logInput).toMatchObject({ customName: 'Leftovers' });
    expect(result.deductionLines).toEqual([]);
  });

  it('is idempotent when called twice against the same unlogged snapshot', () => {
    const input = {
      meal: plannedMeal(),
      recipe: recipe(),
      products: [product()],
      inventoryItems: [inventoryItem()],
      alwaysInStockProductIds: new Set<string>(),
      mealLogEntries: [] as MealLogEntry[],
    };
    expect(handleMealEaten(input)).toEqual(handleMealEaten(input));
  });
});

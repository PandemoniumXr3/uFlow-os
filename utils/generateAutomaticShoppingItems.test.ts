import { describe, expect, it } from 'vitest';

import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';

const REFERENCE_DATE = new Date(2026, 6, 15); // Wednesday 2026-07-15, week = 07-13..07-19

function makeProduct(id: string, name: string): Product {
  return { id, name, category: 'Other', isFavorite: false, createdAt: 0 };
}

function makeRecipe(id: string, name: string, ingredients: string[]): Recipe {
  return { id, name, mealType: ['breakfast'], categories: [], ingredients, effort: 'low', time: 5, isFavorite: false, createdAt: 0 };
}

function makeInventoryItem(productId: string, stockStatus: InventoryItem['stockStatus']): InventoryItem {
  return { id: `inv-${productId}`, productId, stockStatus, location: 'pantry', source: 'manual', createdAt: 0, updatedAt: 0 };
}

describe('generateAutomaticShoppingItems', () => {
  const banana = makeProduct('p-banana', 'Banana');
  const acaiBowl = makeRecipe('r-acai', 'Acai Bowl', ['Banana', 'Granola']);
  const mangoSmoothie = makeRecipe('r-mango', 'Mango Smoothie', ['Banana', 'Oat Milk']);

  it('merges Banana needed by two different planned meals into one item with both meals linked', () => {
    const plannedMeals: PlannedMeal[] = [
      { id: 'pm-1', recipeId: 'r-acai', date: '2026-07-15', createdAt: 0 },
      { id: 'pm-2', recipeId: 'r-mango', date: '2026-07-17', createdAt: 0 },
    ];

    const items = generateAutomaticShoppingItems({
      plannedMeals,
      recipes: [acaiBowl, mangoSmoothie],
      products: [banana],
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
      referenceDate: REFERENCE_DATE,
    });

    const bananaItem = items.find((item) => item.normalizedName === 'banana');
    expect(bananaItem).toBeDefined();
    expect(bananaItem!.linkedRecipeIds.sort()).toEqual(['r-acai', 'r-mango']);
    expect(bananaItem!.linkedMealPlanIds.sort()).toEqual(['pm-1', 'pm-2']);
  });

  it('gives an item needed today, empty in stock, and always-in-stock all four reasons at once', () => {
    // stockStatus 'empty' (not 'low') so the ingredient is classified as
    // "missing" for the recipe too — 'low' stock is never "missing" for a
    // recipe (it's still usable), so lowStock can't co-occur with a meal need.
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-acai', date: '2026-07-15', createdAt: 0 }];
    const inventoryItems = [makeInventoryItem('p-banana', 'empty')];

    const items = generateAutomaticShoppingItems({
      plannedMeals,
      recipes: [acaiBowl],
      products: [banana],
      inventoryItems,
      alwaysInStockProductIds: new Set(['p-banana']),
      referenceDate: REFERENCE_DATE,
    });

    const bananaItem = items.find((item) => item.normalizedName === 'banana');
    const reasonTypes = bananaItem!.reasons.map((r) => r.type).sort();
    expect(reasonTypes).toEqual(['alwaysInStock', 'empty', 'missingForRecipe', 'todayMeal']);
    expect(bananaItem!.priority).toBe('high');
  });

  it('marks an item needed only later this week (not today, not low/empty) as normal priority', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-acai', date: '2026-07-17', createdAt: 0 }];

    const items = generateAutomaticShoppingItems({
      plannedMeals,
      recipes: [acaiBowl],
      products: [banana],
      inventoryItems: [],
      alwaysInStockProductIds: new Set(),
      referenceDate: REFERENCE_DATE,
    });

    const bananaItem = items.find((item) => item.normalizedName === 'banana');
    expect(bananaItem!.priority).toBe('normal');
    expect(bananaItem!.reasons.map((r) => r.type)).toEqual(expect.arrayContaining(['weekMeal', 'missingForRecipe']));
  });

  it('produces every item as source automatic, unchecked, unpurchased', () => {
    const items = generateAutomaticShoppingItems({
      plannedMeals: [],
      recipes: [],
      products: [banana],
      inventoryItems: [makeInventoryItem('p-banana', 'empty')],
      alwaysInStockProductIds: new Set(),
      referenceDate: REFERENCE_DATE,
    });

    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('automatic');
    expect(items[0].checked).toBe(false);
    expect(items[0].purchased).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { estimateMealPlanCost } from '@/services/budget/estimateMealPlanCost';
import { getWeekRange, isDateWithinRange } from '@/utils/getWeekRange';
import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-banana-smoothie',
    name: 'Banana Smoothie',
    mealType: ['breakfast'],
    categories: [],
    ingredients: ['Banana'],
    effort: 'low',
    time: 5,
    servings: 1,
    isFavorite: false,
    createdAt: 0,
    ingredientLines: [{ name: 'Banana', quantity: 200, unit: 'g' }],
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-banana', name: 'Banana', category: 'Fruit', isFavorite: false, createdAt: 0, ...overrides };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-banana',
    stockStatus: 'inStock',
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    lastPurchasePriceCents: 199,
    packageQuantity: 1,
    packageUnit: 'kg',
    ...overrides,
  };
}

function plannedMeal(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'pm-1', date: '2026-07-20', recipeId: 'r-banana-smoothie', createdAt: 0, ...overrides };
}

describe('estimateMealPlanCost', () => {
  it('is unavailable, never €0.00, for an empty meal list', () => {
    const result = estimateMealPlanCost([], [], [], []);
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
  });

  it('is unavailable (extra mode) when the ingredient is missing from Stock and has no recorded price', () => {
    const result = estimateMealPlanCost([plannedMeal()], [recipe()], [product()], []);
    expect(result.status).toBe('unavailable');
  });

  it('reports no extra cost once the ingredient is already in Stock (extra mode)', () => {
    const result = estimateMealPlanCost([plannedMeal()], [recipe()], [product()], [inventoryItem()]);
    expect(result.status).toBe('complete');
    expect(result.knownCostCents).toBe(0);
  });

  it("includes a custom meal's manual estimated cost", () => {
    const result = estimateMealPlanCost(
      [plannedMeal({ isCustom: true, recipeId: undefined, customName: 'Leftovers', customEstimatedCostCents: 350 })],
      [],
      [],
      []
    );
    expect(result.status).toBe('complete');
    expect(result.knownCostCents).toBe(350);
  });

  it('ignores a skipped meal entirely', () => {
    const result = estimateMealPlanCost(
      [plannedMeal({ isCustom: true, recipeId: undefined, customEstimatedCostCents: 500, isSkipped: true })],
      [],
      [],
      []
    );
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
  });

  it('excludes a meal once its date is filtered out of the week range — the "moving a meal updates Week costs" property', () => {
    const products = [product()];
    const inventory = [inventoryItem()];
    const recipes = [recipe()];
    const range = getWeekRange(new Date('2026-07-20'));

    const beforeMove = [plannedMeal({ date: '2026-07-20' })].filter((meal) => isDateWithinRange(meal.date, range));
    const afterMove = [plannedMeal({ date: '2026-08-15' })].filter((meal) => isDateWithinRange(meal.date, range));

    // Same underlying meal, only its date (and therefore whether the week-filter includes it) changed.
    expect(beforeMove).toHaveLength(1);
    expect(afterMove).toHaveLength(0);

    const beforeEstimate = estimateMealPlanCost(beforeMove, recipes, products, inventory, 'full');
    const afterEstimate = estimateMealPlanCost(afterMove, recipes, products, inventory, 'full');

    expect(beforeEstimate.status).toBe('complete');
    expect(beforeEstimate.knownCostCents).toBeGreaterThan(0);
    expect(afterEstimate.status).toBe('unavailable');
    expect(afterEstimate.knownCostCents).toBe(0);
  });

  it('combines multiple meals, one fully priced and one unpriced, into a partial estimate', () => {
    const products = [product(), product({ id: 'p-oats', name: 'Oats' })];
    const inventory = [inventoryItem()]; // only banana has a price
    const recipes = [
      recipe(),
      recipe({ id: 'r-oats', name: 'Oats', ingredients: ['Oats'], ingredientLines: [{ name: 'Oats', quantity: 50, unit: 'g' }] }),
    ];
    const meals = [plannedMeal(), plannedMeal({ id: 'pm-2', recipeId: 'r-oats' })];

    const result = estimateMealPlanCost(meals, recipes, products, inventory, 'full');
    expect(result.status).toBe('partial');
  });
});

import { describe, expect, it } from 'vitest';

import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { collectMissingIngredientsFromPlan } from '@/utils/collectMissingIngredientsFromPlan';

const REFERENCE_DATE = new Date(2026, 6, 15); // Wednesday 2026-07-15, week = 07-13..07-19

function makeProduct(id: string, name: string): Product {
  return { id, name, category: 'Other', isFavorite: false, createdAt: 0 };
}

function makeRecipe(id: string, name: string, ingredients: string[]): Recipe {
  return { id, name, mealType: ['breakfast'], categories: [], ingredients, effort: 'low', time: 5, isFavorite: false, createdAt: 0 };
}

function makeInventoryItem(productId: string, stockStatus: InventoryItem['stockStatus']): InventoryItem {
  return {
    id: `inv-${productId}`,
    productId,
    stockStatus,
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('collectMissingIngredientsFromPlan', () => {
  const banana = makeProduct('p-banana', 'Banana');
  const almondMilk = makeProduct('p-almond-milk', 'Almond Milk');
  const oatmeal = makeRecipe('r-oatmeal', 'Oatmeal', ['Oats', 'Almond Milk', 'Banana']);
  const products = [banana, almondMilk];

  it('flags a meal planned today with a missing ingredient as isToday', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0 }];
    const inventoryItems = [makeInventoryItem('p-almond-milk', 'inStock')];

    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, inventoryItems, REFERENCE_DATE);

    const names = needs.map((n) => n.ingredientName);
    expect(names).toContain('Oats');
    expect(names).toContain('Banana');
    expect(names).not.toContain('Almond Milk');
    expect(needs.every((n) => n.isToday && !n.isThisWeek)).toBe(true);
  });

  it('flags a meal planned later this week as isThisWeek, not isToday', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-2', recipeId: 'r-oatmeal', date: '2026-07-17', createdAt: 0 }];
    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, [], REFERENCE_DATE);

    expect(needs.length).toBeGreaterThan(0);
    expect(needs.every((n) => n.isThisWeek && !n.isToday)).toBe(true);
  });

  it('excludes meals planned outside the current week', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-3', recipeId: 'r-oatmeal', date: '2026-07-27', createdAt: 0 }];
    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, [], REFERENCE_DATE);
    expect(needs).toEqual([]);
  });

  it('includes an ingredient with no matching catalog product, with productId undefined', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-4', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0 }];
    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, [], REFERENCE_DATE);
    const oats = needs.find((n) => n.ingredientName === 'Oats');
    expect(oats?.productId).toBeUndefined();
  });

  it('excludes a skipped meal planned today', () => {
    const plannedMeals: PlannedMeal[] = [{ id: 'pm-5', recipeId: 'r-oatmeal', date: '2026-07-15', isSkipped: true, createdAt: 0 }];
    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, [], REFERENCE_DATE);
    expect(needs).toEqual([]);
  });

  it('excludes a custom meal (no recipe, so no ingredients to check)', () => {
    const plannedMeals: PlannedMeal[] = [
      { id: 'pm-6', date: '2026-07-15', isCustom: true, customName: 'Leftovers', createdAt: 0 },
    ];
    const needs = collectMissingIngredientsFromPlan(plannedMeals, [oatmeal], products, [], REFERENCE_DATE);
    expect(needs).toEqual([]);
  });
});

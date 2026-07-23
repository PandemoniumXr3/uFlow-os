import { describe, expect, it } from 'vitest';

import { refreshDerivedState } from '@/services/automation/refreshDerivedState';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(): Recipe {
  return {
    id: 'r1',
    name: 'Oatmeal',
    mealType: ['breakfast'],
    categories: [],
    ingredients: ['Banana'],
    nutrition: {
      kcal: 100,
      proteinGrams: 2,
      carbohydrateGrams: 20,
      fatGrams: 1,
      saturatedFatGrams: 0,
      fiberGrams: 2,
      sugarGrams: 10,
      sodiumMilligrams: 5,
      source: 'estimated',
      completeness: 'complete',
    },
    effort: 'low',
    time: 5,
    isFavorite: false,
    createdAt: 0,
  };
}

function product(): Product {
  return { id: 'p-banana', name: 'Banana', category: 'Fruit', isFavorite: false, createdAt: 0 };
}

function plannedMeal(): PlannedMeal {
  return { id: 'meal1', recipeId: 'r1', date: '2026-01-01', mealSlot: 'breakfast', servings: 1, createdAt: 0 };
}

describe('refreshDerivedState', () => {
  it('reports missing ingredients and projected nutrition for the given day', () => {
    const result = refreshDerivedState({
      recipes: [recipe()],
      products: [product()],
      inventoryItems: [],
      plannedMeals: [plannedMeal()],
      alwaysInStockProductIds: new Set(),
      dateKey: '2026-01-01',
    });

    expect(result.missingIngredientNames).toContain('Banana');
    expect(result.projectedNutrition.kcal).toBe(100);
  });

  it('is pure — recomputes identically for the same snapshot', () => {
    const input = {
      recipes: [recipe()],
      products: [product()],
      inventoryItems: [],
      plannedMeals: [plannedMeal()],
      alwaysInStockProductIds: new Set<string>(),
      dateKey: '2026-01-01',
    };
    expect(refreshDerivedState(input)).toEqual(refreshDerivedState(input));
  });
});

import { describe, expect, it } from 'vitest';

import { findAvoidedIngredients } from '@/services/decision/matchIngredientTiers';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Test Recipe',
    mealType: ['lunch'],
    categories: [],
    ingredients: ['Mushroom', 'Rice'],
    effort: 'low',
    time: 10,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-mushroom', name: 'Mushroom', category: 'Vegetables', isFavorite: false, createdAt: 0, ...overrides };
}

describe('findAvoidedIngredients', () => {
  it('flags an ingredient whose matched product is in the avoided set', () => {
    const result = findAvoidedIngredients(recipe(), [product(), product({ id: 'p-rice', name: 'Rice' })], new Set(['p-mushroom']));
    expect(result.avoidedIngredientNames).toEqual(['Mushroom']);
    expect(result.matchedAllIngredients).toBe(true);
  });

  it('never flags an ingredient it could not match to any product', () => {
    const result = findAvoidedIngredients(recipe({ ingredients: ['Mystery Sauce'] }), [], new Set(['p-mushroom']));
    expect(result.avoidedIngredientNames).toEqual([]);
    expect(result.matchedAllIngredients).toBe(false);
  });

  it('prefers an explicit ingredientLines productId over name matching', () => {
    // Product catalog has no "Mushroom" entry by name, but the recipe links it explicitly by id.
    const linkedRecipe = recipe({ ingredientLines: [{ name: 'Mushroom', productId: 'p-mushroom', quantity: 100, unit: 'g' }] });
    const result = findAvoidedIngredients(linkedRecipe, [product({ name: 'Forest Mushroom' })], new Set(['p-mushroom']));
    expect(result.avoidedIngredientNames).toEqual(['Mushroom']);
  });

  it('reports no avoided ingredients when the avoided set is empty', () => {
    const result = findAvoidedIngredients(recipe(), [product()], new Set());
    expect(result.avoidedIngredientNames).toEqual([]);
  });
});

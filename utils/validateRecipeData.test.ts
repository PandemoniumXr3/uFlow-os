import { describe, expect, it } from 'vitest';

import { MEAL_SEED } from '@/constants/mealSeed';
import { validateRecipes } from '@/utils/validateRecipeData';

describe('validateRecipes', () => {
  it('finds no issues in the current seed data', () => {
    expect(validateRecipes(MEAL_SEED)).toEqual([]);
  });

  it('flags a duplicate id', () => {
    const recipes = [
      { id: 'a', ingredients: ['Banana'] },
      { id: 'a', ingredients: ['Apple'] },
    ];
    const issues = validateRecipes(recipes);
    expect(issues.some((issue) => issue.type === 'duplicateId')).toBe(true);
  });

  it('flags an ingredient line whose name is not in ingredients', () => {
    const recipes = [{ id: 'a', ingredients: ['Banana'], ingredientLines: [{ name: 'Almond Milk', quantity: 1, unit: 'piece' }] }];
    const issues = validateRecipes(recipes);
    expect(issues).toEqual([
      { recipeId: 'a', type: 'ingredientLineNameMismatch', message: expect.stringContaining('Almond Milk') },
    ]);
  });

  it('is case-insensitive when matching ingredient line names', () => {
    const recipes = [{ id: 'a', ingredients: ['Banana'], ingredientLines: [{ name: 'banana', quantity: 1, unit: 'piece' }] }];
    expect(validateRecipes(recipes)).toEqual([]);
  });

  it('flags a non-positive quantity', () => {
    const recipes = [{ id: 'a', ingredients: ['Banana'], ingredientLines: [{ name: 'Banana', quantity: 0, unit: 'piece' }] }];
    const issues = validateRecipes(recipes);
    expect(issues.some((issue) => issue.type === 'nonPositiveQuantity')).toBe(true);
  });

  it('flags an unrecognized unit', () => {
    const recipes = [{ id: 'a', ingredients: ['Banana'], ingredientLines: [{ name: 'Banana', quantity: 1, unit: 'cup' }] }];
    const issues = validateRecipes(recipes);
    expect(issues.some((issue) => issue.type === 'unknownUnit')).toBe(true);
  });

  it('flags nutrition marked complete with missing kcal', () => {
    const recipes = [
      {
        id: 'a',
        ingredients: ['Banana'],
        nutrition: { completeness: 'complete' as const, source: 'estimated' as const },
      },
    ];
    const issues = validateRecipes(recipes);
    expect(issues.some((issue) => issue.type === 'nutritionCompletenessMismatch')).toBe(true);
  });
});

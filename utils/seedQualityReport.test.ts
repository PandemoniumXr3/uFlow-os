import { describe, expect, it } from 'vitest';

import { MEAL_SEED } from '@/constants/mealSeed';
import { getSeedQualityReport } from '@/utils/seedQualityReport';

describe('getSeedQualityReport', () => {
  it('reports the current seed database with no structural defects', () => {
    const report = getSeedQualityReport(MEAL_SEED);

    expect(report.duplicateIdCount).toBe(0);
    expect(report.invalidProductLinkCount).toBe(0);
    expect(report.invalidUnitCount).toBe(0);
  });

  it('meets the minimum structured-recipe coverage target (30+)', () => {
    const report = getSeedQualityReport(MEAL_SEED);
    expect(report.recipesWithStructuredIngredients).toBeGreaterThanOrEqual(30);
    expect(report.recipesWithCompleteNutrition).toBeGreaterThanOrEqual(30);
  });

  it('accounts for every recipe across the nutrition-completeness buckets', () => {
    const report = getSeedQualityReport(MEAL_SEED);
    expect(report.recipesWithCompleteNutrition + report.recipesWithPartialNutrition + report.recipesWithoutNutrition).toBe(
      report.totalRecipes
    );
  });

  it('computes independent counts for a small fixture', () => {
    const recipes = [
      { id: 'a', ingredients: ['Banana'], ingredientLines: [{ name: 'Banana', quantity: 1, unit: 'piece' }], servings: 1, nutrition: { completeness: 'complete' as const, source: 'estimated' as const, kcal: 100 } },
      { id: 'b', ingredients: ['Oats'], nutrition: { completeness: 'partial' as const, source: 'estimated' as const } },
      { id: 'c', ingredients: ['Milk'] },
    ];
    const report = getSeedQualityReport(recipes as any);

    expect(report.totalRecipes).toBe(3);
    expect(report.recipesWithStructuredIngredients).toBe(1);
    expect(report.recipesWithCompleteNutrition).toBe(1);
    expect(report.recipesWithPartialNutrition).toBe(1);
    expect(report.recipesWithoutNutrition).toBe(1);
    expect(report.recipesMissingServings).toBe(2);
  });
});

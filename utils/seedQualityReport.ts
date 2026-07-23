import type { MealSeed } from '@/types/recipe';
import { validateRecipes } from '@/utils/validateRecipeData';

export interface SeedQualityReport {
  totalRecipes: number;
  recipesWithStructuredIngredients: number;
  recipesWithCompleteNutrition: number;
  recipesWithPartialNutrition: number;
  recipesWithoutNutrition: number;
  recipesMissingServings: number;
  duplicateIdCount: number;
  invalidProductLinkCount: number;
  invalidUnitCount: number;
}

/**
 * A plain count-based snapshot of the seed database's data quality — not a
 * pass/fail gate, just the numbers the milestone report asks for. Reuses
 * validateRecipes for the structural checks (duplicate ids, mismatched
 * ingredient-line names, bad units) rather than re-deriving them.
 */
export function getSeedQualityReport(recipes: MealSeed[]): SeedQualityReport {
  const issues = validateRecipes(recipes);

  const recipesWithStructuredIngredients = recipes.filter((recipe) => (recipe.ingredientLines?.length ?? 0) > 0).length;
  const recipesWithCompleteNutrition = recipes.filter((recipe) => recipe.nutrition?.completeness === 'complete').length;
  const recipesWithPartialNutrition = recipes.filter((recipe) => recipe.nutrition?.completeness === 'partial').length;
  const recipesWithoutNutrition = recipes.filter((recipe) => recipe.nutrition == null).length;
  const recipesMissingServings = recipes.filter((recipe) => recipe.servings == null).length;

  return {
    totalRecipes: recipes.length,
    recipesWithStructuredIngredients,
    recipesWithCompleteNutrition,
    recipesWithPartialNutrition,
    recipesWithoutNutrition,
    recipesMissingServings,
    duplicateIdCount: issues.filter((issue) => issue.type === 'duplicateId').length,
    invalidProductLinkCount: issues.filter((issue) => issue.type === 'ingredientLineNameMismatch').length,
    invalidUnitCount: issues.filter((issue) => issue.type === 'unknownUnit').length,
  };
}

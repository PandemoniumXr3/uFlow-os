import type { MealSeed } from '@/types/recipe';
import { convertToBaseUnit } from '@/utils/unitConversion';

export type RecipeValidationIssueType =
  | 'duplicateId'
  | 'unknownUnit'
  | 'nonPositiveQuantity'
  | 'ingredientLineNameMismatch'
  | 'nutritionCompletenessMismatch';

export interface RecipeValidationIssue {
  recipeId: string;
  type: RecipeValidationIssueType;
  message: string;
}

type ValidatableRecipe = Pick<MealSeed, 'id' | 'ingredients' | 'ingredientLines' | 'nutrition'>;

/**
 * Pure, non-throwing sanity check for seed/user recipe data — surfaces
 * problems that would otherwise silently degrade Budget Mode or Nutrition
 * (e.g. a duplicated id shadowing a recipe, or an ingredient line whose name
 * no longer matches the plain `ingredients` list after an edit). Never
 * mutates or fixes anything; callers decide what to do with the issues.
 */
export function validateRecipes(recipes: ValidatableRecipe[]): RecipeValidationIssue[] {
  const issues: RecipeValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const recipe of recipes) {
    if (seenIds.has(recipe.id)) {
      issues.push({ recipeId: recipe.id, type: 'duplicateId', message: `Duplicate recipe id "${recipe.id}".` });
    }
    seenIds.add(recipe.id);

    const ingredientNames = new Set(recipe.ingredients.map((name) => name.trim().toLowerCase()));

    for (const line of recipe.ingredientLines ?? []) {
      if (!ingredientNames.has(line.name.trim().toLowerCase())) {
        issues.push({
          recipeId: recipe.id,
          type: 'ingredientLineNameMismatch',
          message: `Ingredient line "${line.name}" has no matching entry in ingredients.`,
        });
      }

      if (line.quantity != null && !(line.quantity > 0)) {
        issues.push({
          recipeId: recipe.id,
          type: 'nonPositiveQuantity',
          message: `Ingredient line "${line.name}" has a non-positive quantity (${line.quantity}).`,
        });
      }

      if (line.unit != null && convertToBaseUnit(1, line.unit) == null) {
        issues.push({
          recipeId: recipe.id,
          type: 'unknownUnit',
          message: `Ingredient line "${line.name}" uses unrecognized unit "${line.unit}".`,
        });
      }
    }

    const nutrition = recipe.nutrition;
    if (nutrition?.completeness === 'complete' && nutrition.kcal == null) {
      issues.push({
        recipeId: recipe.id,
        type: 'nutritionCompletenessMismatch',
        message: 'Nutrition marked "complete" but kcal is missing.',
      });
    }
  }

  return issues;
}

import type { Effort, MealType, RecipeIngredientLine } from '@/types/recipe';

export interface RecipeDraftValidationInput {
  name: string;
  mealType: MealType[];
  time: string;
  ingredientLines: RecipeIngredientLine[];
  effort?: Effort;
}

export interface RecipeDraftValidation {
  canSubmit: boolean;
  hasInvalidQuantity: boolean;
  hasValidIngredient: boolean;
}

/**
 * The Add/Edit Recipe form's save-gate — pulled out of RecipeForm so the
 * minimal-valid-recipe / missing-name / invalid-quantity rules are testable
 * without rendering the form. A recipe is saveable with just a name, at
 * least one meal type, a time, and one non-blank ingredient — everything
 * else (nutrition, equipment, tags, notes) is optional by design.
 */
export function validateRecipeDraft(input: RecipeDraftValidationInput): RecipeDraftValidation {
  const validLines = input.ingredientLines.filter((line) => line.name.trim().length > 0);
  const hasInvalidQuantity = input.ingredientLines.some((line) => line.quantity != null && line.quantity <= 0);
  const hasValidIngredient = validLines.length > 0;

  const canSubmit = input.name.trim().length > 0 && input.mealType.length > 0 && input.time.trim().length > 0 && hasValidIngredient && !hasInvalidQuantity;

  return { canSubmit, hasInvalidQuantity, hasValidIngredient };
}

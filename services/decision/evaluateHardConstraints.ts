import { findAvoidedIngredients } from '@/services/decision/matchIngredientTiers';
import type { HardConstraintResult, HardExclusionReason } from '@/services/decision/types';
import { ALLERGEN_OPTIONS } from '@/constants/toleranceOptions';
import type { DietProfile } from '@/types/diet';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ToleranceProfile } from '@/types/tolerance';
import { findUnmetDiets } from '@/utils/matchDiet';
import { findFlaggedTolerances } from '@/utils/matchTolerance';

export interface HardConstraintInput {
  toleranceProfile: ToleranceProfile;
  dietProfile: DietProfile;
  avoidedProductIds: ReadonlySet<string>;
  permanentlyHiddenRecipeIds: ReadonlySet<string>;
  products: Product[];
}

/**
 * Level 1 of the decision hierarchy — never overridable by budget, Stock,
 * convenience, popularity, or learned behavior. Always returns every
 * matching reason (not just the first) so diagnostic/editing views can
 * explain exactly why a recipe was excluded.
 */
export function evaluateHardConstraints(recipe: Recipe, input: HardConstraintInput): HardConstraintResult {
  const reasons: HardExclusionReason[] = [];

  if (input.permanentlyHiddenRecipeIds.has(recipe.id)) {
    reasons.push({ type: 'permanentlyHidden', label: 'Hidden by you' });
  }

  const flaggedLabels = findFlaggedTolerances(recipe.ingredients, input.toleranceProfile);
  const allergenLabels = new Set(
    ALLERGEN_OPTIONS.filter((option) => input.toleranceProfile.allergies.includes(option.value)).map((option) => option.label)
  );
  for (const label of flaggedLabels) {
    const type = allergenLabels.has(label) ? 'allergy' : 'intolerance';
    reasons.push({ type, label: `${type === 'allergy' ? 'Allergy' : 'Intolerance'}: ${label}` });
  }

  const unmetDiets = findUnmetDiets(recipe.categories, input.dietProfile);
  for (const label of unmetDiets) {
    reasons.push({ type: 'diet', label: `Doesn't fit ${label}` });
  }

  if (input.avoidedProductIds.size > 0) {
    const { avoidedIngredientNames } = findAvoidedIngredients(recipe, input.products, input.avoidedProductIds);
    for (const ingredientName of avoidedIngredientNames) {
      reasons.push({ type: 'avoidedIngredient', label: `Contains ${ingredientName}, which you avoid` });
    }
  }

  return { passed: reasons.length === 0, reasons };
}

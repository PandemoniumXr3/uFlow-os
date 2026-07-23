import type { RecipeIngredientLine } from '@/types/recipe';

/**
 * Scales each ingredient line's quantity for a target serving count — for
 * live "what does this look like at N servings" display only. Never
 * mutates the stored recipe; callers always pass the recipe's own
 * ingredientLines through unchanged and use the scaled copy for display.
 * Lines with no quantity stay quantity-less (nothing to scale); a
 * non-positive base falls back to a 1:1 ratio rather than dividing by zero.
 */
export function scaleIngredientLines(
  lines: RecipeIngredientLine[],
  baseServings: number,
  targetServings: number
): RecipeIngredientLine[] {
  const ratio = baseServings > 0 ? targetServings / baseServings : 1;
  return lines.map((line) => (line.quantity == null ? line : { ...line, quantity: line.quantity * ratio }));
}

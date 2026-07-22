import { ALLERGEN_OPTIONS, INTOLERANCE_OPTIONS } from '@/constants/toleranceOptions';
import type { ToleranceProfile } from '@/types/tolerance';

/**
 * Returns the labels (e.g. "Dairy", "Gluten") of any allergies/intolerances
 * in `profile` whose keywords appear in `ingredients`. Simple substring
 * heuristic — a starting point, not exhaustive.
 */
export function findFlaggedTolerances(ingredients: string[], profile: ToleranceProfile): string[] {
  const lowerIngredients = ingredients.map((ingredient) => ingredient.toLowerCase());
  const flagged: string[] = [];

  for (const option of ALLERGEN_OPTIONS) {
    if (!profile.allergies.includes(option.value)) continue;
    if (option.keywords.some((keyword) => lowerIngredients.some((ingredient) => ingredient.includes(keyword)))) {
      flagged.push(option.label);
    }
  }

  for (const option of INTOLERANCE_OPTIONS) {
    if (!profile.intolerances.includes(option.value)) continue;
    if (option.keywords.some((keyword) => lowerIngredients.some((ingredient) => ingredient.includes(keyword)))) {
      if (!flagged.includes(option.label)) flagged.push(option.label);
    }
  }

  return flagged;
}

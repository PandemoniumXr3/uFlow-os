import { DIET_OPTIONS } from '@/constants/dietOptions';
import type { DietProfile, DietType } from '@/types/diet';
import type { MealCategory } from '@/types/recipe';

const DIET_SATISFIERS: Record<DietType, (categories: MealCategory[]) => boolean> = {
  vegan: (categories) => categories.includes('vegan'),
  vegetarian: (categories) => categories.includes('vegan') || categories.includes('vegetarian'),
  pescatarian: (categories) =>
    categories.includes('vegan') || categories.includes('vegetarian') || categories.includes('pescatarian'),
  highProtein: (categories) => categories.includes('high-protein'),
};

/** Returns the labels (e.g. "Vegan") of active diets a meal's categories don't satisfy. */
export function findUnmetDiets(categories: MealCategory[], profile: DietProfile): string[] {
  return DIET_OPTIONS.filter(
    (option) => profile.active.includes(option.value) && !DIET_SATISFIERS[option.value](categories)
  ).map((option) => option.label);
}

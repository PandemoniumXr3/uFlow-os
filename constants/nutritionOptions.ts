import type { NutrientKey } from '@/types/nutrition';

export interface NutrientOption {
  value: NutrientKey;
  label: string;
  unit: string;
}

/** The single source of truth for nutrient labels/units/order across Settings, Recipes, Today, and Week. */
export const NUTRIENT_OPTIONS: NutrientOption[] = [
  { value: 'kcal', label: 'Calories', unit: 'kcal' },
  { value: 'protein', label: 'Protein', unit: 'g' },
  { value: 'carbohydrate', label: 'Carbohydrates', unit: 'g' },
  { value: 'fat', label: 'Fat', unit: 'g' },
  { value: 'saturatedFat', label: 'Saturated fat', unit: 'g' },
  { value: 'fiber', label: 'Fiber', unit: 'g' },
  { value: 'sugar', label: 'Sugar', unit: 'g' },
  { value: 'sodium', label: 'Sodium', unit: 'mg' },
];

/** The five shown in the calm default summary — the rest live behind "Show more". */
export const CORE_NUTRIENT_KEYS: NutrientKey[] = ['kcal', 'protein', 'carbohydrate', 'fat', 'fiber'];

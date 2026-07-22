import { NUTRIENT_OPTIONS } from '@/constants/nutritionOptions';
import type { NutrientKey, NutritionInfo } from '@/types/nutrition';

const FIELD_BY_KEY: Record<NutrientKey, keyof NutritionInfo> = {
  kcal: 'kcal',
  protein: 'proteinGrams',
  carbohydrate: 'carbohydrateGrams',
  fat: 'fatGrams',
  saturatedFat: 'saturatedFatGrams',
  fiber: 'fiberGrams',
  sugar: 'sugarGrams',
  sodium: 'sodiumMilligrams',
};

export function getNutrientValue(nutrition: NutritionInfo, key: NutrientKey): number | undefined {
  const value = nutrition[FIELD_BY_KEY[key]];
  return typeof value === 'number' ? value : undefined;
}

export interface NutritionRow {
  key: NutrientKey;
  label: string;
  value: number;
  unit: string;
}

/**
 * The one place that decides which nutrition rows are shown: present in the
 * data, and not hidden by the user's per-nutrient visibility setting. Used
 * by Recipes, Today, and Week alike so "hide sodium" behaves identically
 * everywhere rather than being reimplemented per screen.
 */
export function getVisibleNutritionRows(nutrition: NutritionInfo, hiddenNutrients: ReadonlySet<NutrientKey>): NutritionRow[] {
  if (nutrition.completeness === 'unavailable') return [];

  const rows: NutritionRow[] = [];
  for (const option of NUTRIENT_OPTIONS) {
    if (hiddenNutrients.has(option.value)) continue;
    const value = getNutrientValue(nutrition, option.value);
    if (value == null) continue;
    rows.push({ key: option.value, label: option.label, value, unit: option.unit });
  }
  return rows;
}

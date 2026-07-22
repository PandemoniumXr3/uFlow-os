import type { NutritionInfo } from '@/types/nutrition';

const NUMERIC_FIELDS = [
  'kcal',
  'proteinGrams',
  'carbohydrateGrams',
  'fatGrams',
  'saturatedFatGrams',
  'fiberGrams',
  'sugarGrams',
  'sodiumMilligrams',
] as const;

/**
 * Multiplies every present numeric field by `factor` — used both for
 * "total recipe" (per-serving × servings) and for consumed/projected totals
 * (per-serving × servings eaten/planned). Fields that are absent stay
 * absent; source/completeness/servingSize pass through unchanged.
 */
export function scaleNutrition(nutrition: NutritionInfo, factor: number): NutritionInfo {
  const scaled: NutritionInfo = { source: nutrition.source, completeness: nutrition.completeness, servingSize: nutrition.servingSize };
  for (const field of NUMERIC_FIELDS) {
    const value = nutrition[field];
    if (value != null) {
      scaled[field] = value * factor;
    }
  }
  return scaled;
}

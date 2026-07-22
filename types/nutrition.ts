/**
 * How confident we are in a nutrition value — shown to the user so a
 * seeded estimate is never mistaken for a verified fact.
 */
export type NutritionSource = 'verified' | 'imported' | 'user-entered' | 'estimated';

/** Whether every core value is present, only some, or effectively none. */
export type NutritionCompleteness = 'complete' | 'partial' | 'unavailable';

export type NutrientKey =
  | 'kcal'
  | 'protein'
  | 'carbohydrate'
  | 'fat'
  | 'saturatedFat'
  | 'fiber'
  | 'sugar'
  | 'sodium';

/**
 * Fully optional per-serving nutrition. A recipe with no `nutrition` simply
 * shows nothing — this never forces tracking. Values are never invented for
 * real precision; seeded estimates are always marked `source: 'estimated'`.
 */
export interface NutritionInfo {
  kcal?: number;
  proteinGrams?: number;
  carbohydrateGrams?: number;
  fatGrams?: number;
  saturatedFatGrams?: number;
  fiberGrams?: number;
  sugarGrams?: number;
  sodiumMilligrams?: number;
  /** Free text, e.g. "1 bowl", "250g". Optional — never invented. */
  servingSize?: string;
  source: NutritionSource;
  completeness: NutritionCompleteness;
}

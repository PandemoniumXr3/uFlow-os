import { NUTRIENT_OPTIONS } from '@/constants/nutritionOptions';
import type { NutrientKey } from '@/types/nutrition';
import type { NutrientTotals } from '@/utils/nutrientTotals';

const FIELD_BY_KEY: Record<NutrientKey, keyof NutrientTotals> = {
  kcal: 'kcal',
  protein: 'proteinGrams',
  carbohydrate: 'carbohydrateGrams',
  fat: 'fatGrams',
  saturatedFat: 'saturatedFatGrams',
  fiber: 'fiberGrams',
  sugar: 'sugarGrams',
  sodium: 'sodiumMilligrams',
};

export interface NutrientTotalsRow {
  key: NutrientKey;
  label: string;
  value: number;
  unit: string;
}

/**
 * Same filtering rules as getVisibleNutritionRows, but for aggregated totals
 * (Today/Week summaries) rather than a single recipe's NutritionInfo —
 * respects the user's per-nutrient visibility choice and an optional
 * allow-list (e.g. the calm 5-nutrient default view vs the expanded one).
 */
export function getVisibleTotalsRows(
  totals: NutrientTotals,
  hiddenNutrients: ReadonlySet<NutrientKey>,
  onlyKeys?: NutrientKey[]
): NutrientTotalsRow[] {
  const allow = onlyKeys ? new Set(onlyKeys) : null;
  const rows: NutrientTotalsRow[] = [];
  for (const option of NUTRIENT_OPTIONS) {
    if (hiddenNutrients.has(option.value)) continue;
    if (allow && !allow.has(option.value)) continue;
    rows.push({ key: option.value, label: option.label, value: totals[FIELD_BY_KEY[option.value]], unit: option.unit });
  }
  return rows;
}

import type { NutritionInfo } from '@/types/nutrition';

export interface NutrientTotals {
  kcal: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  saturatedFatGrams: number;
  fiberGrams: number;
  sugarGrams: number;
  sodiumMilligrams: number;
}

export function createEmptyTotals(): NutrientTotals {
  return {
    kcal: 0,
    proteinGrams: 0,
    carbohydrateGrams: 0,
    fatGrams: 0,
    saturatedFatGrams: 0,
    fiberGrams: 0,
    sugarGrams: 0,
    sodiumMilligrams: 0,
  };
}

/** Adds whatever fields `nutrition` has onto `totals` — absent fields simply contribute nothing. */
export function addNutrition(totals: NutrientTotals, nutrition: NutritionInfo): NutrientTotals {
  return {
    kcal: totals.kcal + (nutrition.kcal ?? 0),
    proteinGrams: totals.proteinGrams + (nutrition.proteinGrams ?? 0),
    carbohydrateGrams: totals.carbohydrateGrams + (nutrition.carbohydrateGrams ?? 0),
    fatGrams: totals.fatGrams + (nutrition.fatGrams ?? 0),
    saturatedFatGrams: totals.saturatedFatGrams + (nutrition.saturatedFatGrams ?? 0),
    fiberGrams: totals.fiberGrams + (nutrition.fiberGrams ?? 0),
    sugarGrams: totals.sugarGrams + (nutrition.sugarGrams ?? 0),
    sodiumMilligrams: totals.sodiumMilligrams + (nutrition.sodiumMilligrams ?? 0),
  };
}

/** Adds two already-aggregated totals together (e.g. summing each day of a week into a weekly total). */
export function addTotals(a: NutrientTotals, b: NutrientTotals): NutrientTotals {
  return {
    kcal: a.kcal + b.kcal,
    proteinGrams: a.proteinGrams + b.proteinGrams,
    carbohydrateGrams: a.carbohydrateGrams + b.carbohydrateGrams,
    fatGrams: a.fatGrams + b.fatGrams,
    saturatedFatGrams: a.saturatedFatGrams + b.saturatedFatGrams,
    fiberGrams: a.fiberGrams + b.fiberGrams,
    sugarGrams: a.sugarGrams + b.sugarGrams,
    sodiumMilligrams: a.sodiumMilligrams + b.sodiumMilligrams,
  };
}

export function divideTotals(totals: NutrientTotals, divisor: number): NutrientTotals {
  if (divisor === 0) return createEmptyTotals();
  return {
    kcal: totals.kcal / divisor,
    proteinGrams: totals.proteinGrams / divisor,
    carbohydrateGrams: totals.carbohydrateGrams / divisor,
    fatGrams: totals.fatGrams / divisor,
    saturatedFatGrams: totals.saturatedFatGrams / divisor,
    fiberGrams: totals.fiberGrams / divisor,
    sugarGrams: totals.sugarGrams / divisor,
    sodiumMilligrams: totals.sodiumMilligrams / divisor,
  };
}

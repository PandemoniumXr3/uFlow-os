import type { MealType } from '@/types/recipe';
import type { NutritionInfo } from '@/types/nutrition';

/**
 * A meal the user intends to eat on a given date — distinct from
 * MealLogEntry, which records a meal already eaten. The date is always a
 * concrete calendar date (YYYY-MM-DD), never a vague "this week" marker.
 * Either recipeId is set (a saved recipe) or isCustom is true with a
 * customName (an ad-hoc meal with no saved recipe) — never both, never
 * neither. mealSlot is optional so legacy entries (planned before slots
 * existed) still load; UI falls back to a derived/'unscheduled' slot.
 */
export interface PlannedMeal {
  id: string;
  recipeId?: string;
  date: string; // YYYY-MM-DD, local time
  mealSlot?: MealType;
  /** Optional clock time, e.g. "18:30". Purely informational — slot is what drives grouping. */
  time?: string;
  /** For projected-nutrition math and serving-scaled display. Defaults to 1. */
  servings?: number;
  /** Marks the day's intent fulfilled without eating — excluded from both projected and consumed totals. */
  isSkipped?: boolean;
  /** True for an ad-hoc meal with no saved recipe (e.g. "leftovers"). */
  isCustom?: boolean;
  customName?: string;
  customNutrition?: NutritionInfo;
  /** Manual, user-entered cost for a custom meal — never computed from ingredients (custom meals have none). */
  customEstimatedCostCents?: number;
  /** Free-text note, e.g. "double batch for the week" — informational only, never parsed. */
  notes?: string;
  createdAt: number;
}

export type NewPlannedMeal = Pick<PlannedMeal, 'date'> &
  Partial<
    Pick<
      PlannedMeal,
      'recipeId' | 'mealSlot' | 'time' | 'servings' | 'isCustom' | 'customName' | 'customNutrition' | 'customEstimatedCostCents' | 'notes'
    >
  >;

export type PlannedMealUpdate = Partial<
  Pick<
    PlannedMeal,
    'date' | 'mealSlot' | 'time' | 'servings' | 'isSkipped' | 'customName' | 'customNutrition' | 'customEstimatedCostCents' | 'notes'
  >
>;

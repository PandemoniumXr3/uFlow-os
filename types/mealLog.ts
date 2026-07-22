import type { MealType } from '@/types/recipe';
import type { NutritionInfo } from '@/types/nutrition';

export interface MealLogEntry {
  /** Optional so legacy entries (logged before ids existed) still load. Always set on new entries. */
  id?: string;
  /** Absent for a logged custom meal (isCustom true) — otherwise the recipe eaten. */
  recipeId?: string;
  date: string; // YYYY-MM-DD, local time
  loggedAt: number;
  /** Defaults to 1 when not specified. */
  servings: number;
  mealSlot?: MealType;
  isCustom?: boolean;
  customName?: string;
  /** Links back to the PlannedMeal this fulfills, if any — disambiguates same-recipe multiple-slots-per-day. */
  plannedMealId?: string;
  /**
   * The recipe's (or custom meal's) per-serving nutrition at the moment this
   * meal was logged. Frozen on purpose — editing a recipe's nutrition later
   * must never silently rewrite historical totals. Absent if there was no
   * nutrition data at logging time.
   */
  nutritionSnapshot?: NutritionInfo;
}

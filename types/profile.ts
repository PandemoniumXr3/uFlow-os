import type { BudgetPreferences } from '@/types/budget';
import type { NutrientKey } from '@/types/nutrition';

/**
 * Minimal on purpose. Richer fields land here only when their owning
 * feature ships — a boolean flag nothing reads is a placeholder, not a
 * foundation. `nutritionTrackingEnabled` was added once the Nutrition
 * module (optional per-recipe macros) actually existed to gate.
 */
export interface UserProfile {
  id: string;
  name?: string;
  /** OFF by default — nutrition is opt-in and never forced. */
  nutritionTrackingEnabled?: boolean;
  /** Nutrients the user has chosen to hide even while tracking is on. Absent = everything visible. */
  hiddenNutrients?: NutrientKey[];
  /** OFF by default — Budget Mode is opt-in; absent on profiles created before this feature shipped. */
  budget?: BudgetPreferences;
  createdAt: number;
  updatedAt: number;
}

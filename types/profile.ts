import type { BudgetPreferences } from '@/types/budget';
import type { NutrientKey } from '@/types/nutrition';
import type { OnboardingPriority, OnboardingState } from '@/types/onboarding';

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
  /** ON by default — matches pre-onboarding behavior (QuickContextBar always showed) so existing users see no change. */
  contextIntelligenceEnabled?: boolean;
  /** First-run setup progress. Absent means the profile predates onboarding (see resolveOnboardingState). */
  onboarding?: OnboardingState;
  /** "Where should uFlow help first?" answers from onboarding Step 2 — a soft signal for personalization, never a rigid permanent setting nothing else reads it as gospel. */
  onboardingPriorities?: OnboardingPriority[];
  createdAt: number;
  updatedAt: number;
}

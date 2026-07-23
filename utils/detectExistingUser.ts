/**
 * Signals used ONLY when no profile row exists at all (the rare case — see
 * resolveOnboardingState) to decide whether a user with real data should
 * still be protected from onboarding despite never having a profile saved.
 *
 * Recipes and Products are deliberately represented as "beyond the starter
 * set" counts, not raw totals: both auto-seed a starter catalog (MEAL_SEED /
 * DEFAULT_PRODUCTS) for every install, existing and brand-new alike, so a
 * raw `recipes.length > 0` would be true for literally everyone and could
 * never distinguish a real user from a fresh install. Diet and Safe Meals
 * are excluded entirely for the same reason (useDiet/useSafeMeals also
 * auto-seed unconditionally) — they are not reliable signals at all.
 */
export interface ExistingUserSignals {
  inventoryCount: number;
  mealPlanCount: number;
  groceryManualItemCount: number;
  recipeCountBeyondStarterSet: number;
  productCountBeyondStarterSet: number;
  toleranceCustomized: boolean;
  ingredientPreferencesCustomized: boolean;
}

export const EMPTY_EXISTING_USER_SIGNALS: ExistingUserSignals = {
  inventoryCount: 0,
  mealPlanCount: 0,
  groceryManualItemCount: 0,
  recipeCountBeyondStarterSet: 0,
  productCountBeyondStarterSet: 0,
  toleranceCustomized: false,
  ingredientPreferencesCustomized: false,
};

export function detectExistingUser(signals: ExistingUserSignals): boolean {
  return (
    signals.inventoryCount > 0 ||
    signals.mealPlanCount > 0 ||
    signals.groceryManualItemCount > 0 ||
    signals.recipeCountBeyondStarterSet > 0 ||
    signals.productCountBeyondStarterSet > 0 ||
    signals.toleranceCustomized ||
    signals.ingredientPreferencesCustomized
  );
}

/**
 * Personal safe-meal list — distinct from `Recipe.isFavorite` (a meal you
 * like) and from `ToleranceProfile.safeMealsOnly` (hides allergens). This is
 * the user's own list of trusted, low-friction meals. Never hardcoded onto
 * the shared meal seed — every profile builds its own list.
 */
export interface SafeMealsProfile {
  recipeIds: string[];
  showSafeOnly: boolean;
}

export const DEFAULT_SAFE_MEALS_PROFILE: SafeMealsProfile = {
  recipeIds: [],
  showSafeOnly: false,
};

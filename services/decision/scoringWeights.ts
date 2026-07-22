/**
 * Every scoring weight the decision engine uses, in one place, grouped by
 * decision-hierarchy level. This is the only file that should ever define a
 * numeric weight — scoreRecipe.ts only reads these constants.
 *
 * The level-2 band is deliberately far above level 3 and level 4 so that no
 * amount of stacked "personal relevance" (favorite + safe + frequently
 * chosen + usual slot, level 4) can ever outweigh a single matched explicit
 * context preference (level 2) — this is what the "explicit context beats
 * learned preference" tests rely on. Level 1 (hard exclusions) is not a
 * score at all — it's a separate pass/fail gate that runs before scoring.
 */
export const LEVEL_2_EXPLICIT_CONTEXT_WEIGHTS = {
  /** context.mealSlot matches recipe.mealType. */
  mealSlotMatch: 300,
  /** context.temperaturePreference ('warm'/'cold') matches a recipe category. */
  temperatureMatch: 150,
  /** context.familiarityPreference === 'safe' and the recipe is marked safe. */
  familiaritySafeMatch: 200,
  /** context.familiarityPreference === 'familiar' and the recipe has been chosen/eaten before. */
  familiarityFamiliarMatch: 150,
  /** context.familiarityPreference === 'new' and the recipe has never been chosen/eaten. */
  familiarityNewMatch: 150,
  /** context.energy is 'very_low'/'low' and the recipe's effort is 'low'. */
  lowEnergyEffortMatch: 250,
  /** context.useStockFirst — per percentage point of Stock coverage, up to 500 at 100%. */
  useStockFirstPerPercent: 5,
} as const;

export const LEVEL_3_PRACTICAL_SUITABILITY_WEIGHTS = {
  /** Stock coverage percentage, independent of useStockFirst. */
  availabilityPerPercent: 1,
  lowStockIngredientPenalty: -5,
  missingIngredientPenalty: -10,
  /** Per €1 (100 cents) of additional purchase cost, only when Budget Mode is on and the cost is known. */
  extraCostPenaltyPerEuro: -8,
  expiringIngredientBonusPerItem: 40,
  lowEffortBonus: 20,
  quickPrepBonus: 15,
  /** A different meal already planned for the same slot on the same day — avoids two near-identical suggestions in one day. */
  duplicatePlannedTodayPenalty: -60,
  /** Already logged as eaten today. */
  recentlyEatenTodayPenalty: -80,
} as const;

export const LEVEL_4_PERSONAL_RELEVANCE_WEIGHTS = {
  favoriteBonus: 15,
  safeMealBonus: 10,
  /** Per past chosen/eaten occurrence, capped. */
  frequentlyChosenBonusPerCount: 2,
  frequentlyChosenBonusCap: 10,
  usualMealSlotBonus: 8,
  /** Per past dismissal, capped — a repeatedly-rejected meal drifts down, but never far enough to fight a level-2 match. */
  rejectedPenaltyPerCount: -5,
  rejectedPenaltyCap: -20,
  /** Dismissed within the last few days — mild and temporary, not a lasting penalty. */
  recentlyDismissedPenalty: -30,
} as const;

import type { BehavioralSignals } from '@/services/decision/behavioralSignals';
import {
  LEVEL_2_EXPLICIT_CONTEXT_WEIGHTS as L2,
  LEVEL_3_PRACTICAL_SUITABILITY_WEIGHTS as L3,
  LEVEL_4_PERSONAL_RELEVANCE_WEIGHTS as L4,
} from '@/services/decision/scoringWeights';
import type { DecisionContext } from '@/services/decision/types';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';

export type Familiarity = 'safe' | 'familiar' | 'new';

/** Safe always wins the classification (a safe meal you've never technically "chosen" is still safe), then familiar, then new. */
export function classifyFamiliarity(isSafeMeal: boolean, behavioral: BehavioralSignals): Familiarity {
  if (isSafeMeal) return 'safe';
  if (behavioral.chosenCount > 0 || behavioral.eatenCount > 0) return 'familiar';
  return 'new';
}

export interface ScoreRecipeInput {
  recipe: Recipe;
  context: DecisionContext;
  availability: RecipeAvailability;
  /** Only set when the cost is actually known (Budget Mode on and estimate not 'unavailable'). */
  extraCostCents?: number;
  usesExpiringProductIds: string[];
  isSafeMeal: boolean;
  isFavorite: boolean;
  behavioral: BehavioralSignals;
  eatenTodayAlready: boolean;
  /** A different planned meal already occupies the same slot today with this same recipe. */
  duplicatePlannedToday: boolean;
}

/**
 * Implements decision-hierarchy levels 2–4 as one additive score. Level 1
 * (hard exclusions) is a separate pass/fail gate that must already have run
 * before this is ever called — nothing here can resurrect an excluded
 * recipe. The level-2 weights are large enough that no realistic stack of
 * level-4 "personal relevance" bonuses can outweigh a single matched
 * explicit-context preference; see scoringWeights.ts for why.
 */
export function scoreRecipe(input: ScoreRecipeInput): number {
  const { recipe, context, availability, behavioral } = input;
  let score = 0;

  // Level 2 — explicit current context
  if (context.mealSlot && recipe.mealType.includes(context.mealSlot)) score += L2.mealSlotMatch;

  if (context.temperaturePreference === 'warm' && recipe.categories.includes('hot')) score += L2.temperatureMatch;
  if (context.temperaturePreference === 'cold' && recipe.categories.includes('cold')) score += L2.temperatureMatch;

  const familiarity = classifyFamiliarity(input.isSafeMeal, behavioral);
  if (context.familiarityPreference === 'safe' && familiarity === 'safe') score += L2.familiaritySafeMatch;
  if (context.familiarityPreference === 'familiar' && familiarity !== 'new') score += L2.familiarityFamiliarMatch;
  if (context.familiarityPreference === 'new' && familiarity === 'new') score += L2.familiarityNewMatch;

  if ((context.energy === 'very_low' || context.energy === 'low') && recipe.effort === 'low') {
    score += L2.lowEnergyEffortMatch;
  }

  if (context.useStockFirst) score += availability.percentAvailable * L2.useStockFirstPerPercent;

  // Level 3 — practical suitability
  score += availability.percentAvailable * L3.availabilityPerPercent;
  score += availability.low.length * L3.lowStockIngredientPenalty;
  score += availability.missing.length * L3.missingIngredientPenalty;
  if (input.extraCostCents != null) {
    score += (input.extraCostCents / 100) * L3.extraCostPenaltyPerEuro;
  }
  score += input.usesExpiringProductIds.length * L3.expiringIngredientBonusPerItem;
  if (recipe.effort === 'low') score += L3.lowEffortBonus;
  if (recipe.time <= 15) score += L3.quickPrepBonus;
  if (input.duplicatePlannedToday) score += L3.duplicatePlannedTodayPenalty;
  if (input.eatenTodayAlready) score += L3.recentlyEatenTodayPenalty;

  // Level 4 — personal relevance
  if (input.isFavorite) score += L4.favoriteBonus;
  if (input.isSafeMeal) score += L4.safeMealBonus;
  score += Math.min(
    (behavioral.chosenCount + behavioral.eatenCount) * L4.frequentlyChosenBonusPerCount,
    L4.frequentlyChosenBonusCap
  );
  if (context.mealSlot && behavioral.commonMealSlot === context.mealSlot) score += L4.usualMealSlotBonus;
  score += Math.max(behavioral.rejectedCount * L4.rejectedPenaltyPerCount, L4.rejectedPenaltyCap);
  if (behavioral.recentlyDismissed) score += L4.recentlyDismissedPenalty;

  return score;
}

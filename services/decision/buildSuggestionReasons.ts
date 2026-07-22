import type { ExtraPurchaseCostEstimate } from '@/services/budget/estimateExtraPurchaseCost';
import type { BehavioralSignals } from '@/services/decision/behavioralSignals';
import type { Familiarity } from '@/services/decision/scoreRecipe';
import type { DecisionContext, SuggestionReason, SuggestionWarning } from '@/services/decision/types';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { formatCents } from '@/utils/money';

const MAX_REASONS = 3;
const USUAL_SLOT_MIN_OCCURRENCES = 2;

export interface SuggestionExplanationInput {
  recipe: Recipe;
  context: DecisionContext;
  availability: RecipeAvailability;
  extraCost?: ExtraPurchaseCostEstimate;
  usesExpiringProductNames: string[];
  familiarity: Familiarity;
  behavioral: BehavioralSignals;
  /** Only meaningful when Nutrition Tracking is on — omit entirely when it's off. */
  nutritionUnavailable?: boolean;
}

/**
 * At most three concise, reassuring reasons — never the raw numeric score.
 * Ordered most-decisive-first, same convention as Budget Mode's
 * getSuggestionReasons.ts, so a screen never has to guess which to drop.
 */
export function buildSuggestionReasons(input: SuggestionExplanationInput): SuggestionReason[] {
  const { recipe, context, availability, extraCost, usesExpiringProductNames, familiarity, behavioral } = input;
  const reasons: SuggestionReason[] = [];

  if (availability.total > 0 && availability.missing.length === 0 && availability.low.length === 0) {
    reasons.push({ type: 'fullyInStock', label: 'You already have everything' });
  } else if (extraCost && extraCost.status !== 'unavailable' && extraCost.extraCostCents === 0) {
    reasons.push({ type: 'noExtraShopping', label: 'No extra shopping needed' });
  } else if (extraCost && extraCost.status !== 'unavailable' && extraCost.extraCostCents > 0) {
    reasons.push({ type: 'lowExtraCost', label: `Only about ${formatCents(extraCost.extraCostCents)} extra` });
  }

  if (usesExpiringProductNames.length > 0) {
    const [first] = usesExpiringProductNames;
    const label =
      usesExpiringProductNames.length === 1
        ? `Uses ${first} expiring soon`
        : `Uses ${usesExpiringProductNames.length} products expiring soon`;
    reasons.push({ type: 'expiringIngredient', label });
  }

  if (familiarity === 'safe') {
    reasons.push({ type: 'safeMeal', label: 'A familiar, safe meal' });
  } else if (context.familiarityPreference === 'new' && familiarity === 'new') {
    reasons.push({ type: 'different', label: 'Different from what you ate recently' });
  }

  if (context.maxPrepMinutes != null ? recipe.time <= context.maxPrepMinutes : recipe.time <= 15) {
    reasons.push({ type: 'quickPrep', label: `Ready in ${recipe.time} minutes` });
  }

  if ((context.energy === 'very_low' || context.energy === 'low') && recipe.effort === 'low') {
    reasons.push({ type: 'fitsEnergy', label: 'Fits your low-energy setting' });
  }

  if (
    context.mealSlot &&
    behavioral.commonMealSlot === context.mealSlot &&
    behavioral.chosenCount + behavioral.eatenCount >= USUAL_SLOT_MIN_OCCURRENCES
  ) {
    reasons.push({ type: 'usualMealSlot', label: `You often choose this for ${context.mealSlot}` });
  }

  if (availability.missing.length === 1) {
    reasons.push({ type: 'oneMissingIngredient', label: 'Only 1 ingredient missing' });
  }

  return reasons.slice(0, MAX_REASONS);
}

/** Warnings are separate from reasons — surfaced, but never counted toward the reason cap. */
export function buildSuggestionWarnings(input: SuggestionExplanationInput): SuggestionWarning[] {
  const { availability, extraCost, recipe, context } = input;
  const warnings: SuggestionWarning[] = [];

  if (availability.low.length > 0) {
    warnings.push({
      type: 'lowStockIngredient',
      label: availability.low.length === 1 ? 'One ingredient is low' : `${availability.low.length} ingredients are low`,
    });
  }

  if (context.budgetEnabled && extraCost) {
    if (extraCost.status === 'unavailable') {
      warnings.push({ type: 'costUnavailable', label: 'Cost unavailable' });
    } else if (extraCost.status === 'partial') {
      const missingCount = extraCost.missingPriceProductIds.length + extraCost.incompatibleUnitProductIds.length;
      warnings.push({ type: 'missingPrices', label: missingCount === 1 ? '1 price missing' : `${missingCount} prices missing` });
    }
  }

  if (input.nutritionUnavailable) {
    warnings.push({ type: 'nutritionUnavailable', label: 'Nutrition unavailable' });
  }

  if (context.equipment && context.equipment.length > 0 && recipe.equipment && recipe.equipment.length > 0) {
    const missingEquipment = recipe.equipment.filter((item) => !context.equipment?.includes(item));
    if (missingEquipment.length > 0) {
      warnings.push({ type: 'requiresEquipment', label: `Requires ${missingEquipment.join(', ')}` });
    }
  }

  return warnings;
}

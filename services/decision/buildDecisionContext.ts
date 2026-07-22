import type { DecisionContext, EnergyLevel } from '@/services/decision/types';
import type { BudgetPreferences } from '@/types/budget';
import type { FoodContext } from '@/types/foodContext';
import type { MealType } from '@/types/recipe';

export interface BuildDecisionContextInput {
  date: string;
  mealSlot?: MealType;
  foodContext: FoodContext | null;
  budgetPreferences: BudgetPreferences;
  /** Session-only "not this" ids from the calling screen — merged in as excludeRecipeIds, never persisted here. */
  sessionExcludeRecipeIds?: string[];
}

function mapEnergy(energy: FoodContext['energy']): EnergyLevel | undefined {
  if (energy === 'low') return 'low';
  if (energy === 'medium') return 'normal';
  if (energy === 'high') return 'high';
  return undefined;
}

/**
 * The only place FoodContext (and BudgetPreferences) get translated into
 * the engine's DecisionContext shape. FoodContext itself is not replaced or
 * duplicated — this is a pure read-time adapter, so there is exactly one
 * stored context model and one runtime shape the engine consumes.
 */
export function buildDecisionContext(input: BuildDecisionContextInput): DecisionContext {
  const fc = input.foodContext;

  // FoodContext's coarse 'quick' chip becomes a real filter only when no more precise maxPrepMinutes is already set.
  const maxPrepMinutes = fc?.maxPrepMinutes ?? (fc?.time === 'quick' ? 15 : undefined);

  return {
    date: input.date,
    mealSlot: input.mealSlot ?? fc?.mealType,

    energy: mapEnergy(fc?.energy),
    maxPrepMinutes,

    temperaturePreference: fc?.temperature,
    familiarityPreference: fc?.adventure,

    useStockFirst: fc?.prioritizeAvailable,
    noExtraShopping: fc?.noExtraShopping,
    prioritizeExpiring: undefined,

    budgetEnabled: input.budgetPreferences.enabled,
    maxExtraCostCents: fc?.maxExtraCostCents ?? input.budgetPreferences.preferredMaxMealCostCents,

    location: fc?.location,
    equipment: fc?.equipment,

    excludeRecipeIds: input.sessionExcludeRecipeIds,
  };
}

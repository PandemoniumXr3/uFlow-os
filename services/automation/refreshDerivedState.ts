import { estimateMealPlanCost } from '@/services/budget/estimateMealPlanCost';
import type { AutomationSnapshot } from '@/services/automation/types';
import type { NutrientTotals } from '@/utils/nutrientTotals';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';
import { getDayMissingIngredientNames } from '@/utils/getDayMissingIngredientNames';

export interface RefreshDerivedStateInput extends AutomationSnapshot {
  dateKey: string;
  /** Planned meals already marked eaten on this date — excluded from projected totals, same rule Day Detail uses. */
  excludedPlannedMealIds?: ReadonlySet<string>;
}

export interface DerivedStateSnapshot {
  missingIngredientNames: string[];
  groceryItemCount: number;
  projectedNutrition: NutrientTotals;
  extraShoppingCostCents: number | null;
}

/**
 * Not a cache — every field here is recomputed from the snapshot on every
 * call via the same pure calculators screens already use directly. Its only
 * purpose is to give automation handlers and tests one place to assert
 * "after this event, here's what the app would now show," without needing
 * to mount a screen or duplicate the individual calculations.
 */
export function refreshDerivedState(input: RefreshDerivedStateInput): DerivedStateSnapshot {
  const { recipes, products, inventoryItems, plannedMeals, alwaysInStockProductIds, dateKey, excludedPlannedMealIds } = input;

  const dayMeals = plannedMeals.filter((meal) => meal.date === dateKey);

  const missingIngredientNames = getDayMissingIngredientNames(dayMeals, recipes, products, inventoryItems);
  const groceryItemCount = generateAutomaticShoppingItems({
    plannedMeals,
    recipes,
    products,
    inventoryItems,
    alwaysInStockProductIds,
  }).length;
  const projectedNutrition = calculateProjectedNutritionForDate(dayMeals, recipes, dateKey, excludedPlannedMealIds);
  const costEstimate = estimateMealPlanCost(dayMeals, recipes, products, inventoryItems, 'extra');
  const extraShoppingCostCents = costEstimate.status === 'unavailable' ? null : costEstimate.knownCostCents;

  return { missingIngredientNames, groceryItemCount, projectedNutrition, extraShoppingCostCents };
}

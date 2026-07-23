import type { PlannedMeal } from '@/types/mealPlan';
import type { ShoppingItem } from '@/types/shoppingItem';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';
import type { AutomationSnapshot } from '@/services/automation/types';

export interface HandleMealRemovedInput extends AutomationSnapshot {
  mealToRemove: PlannedMeal;
}

export interface HandleMealRemovedResult {
  /** Automatic Grocery items that existed only because of this meal — they disappear once it's removed. */
  groceryItemsToRemove: ShoppingItem[];
  /** Automatic Grocery items still needed by other planned meals or Stock restock rules — untouched. */
  groceryItemsRetained: ShoppingItem[];
}

/**
 * Grocery's automatic list is never stored per meal — it's fully recomputed
 * from `plannedMeals` on every render (see generateAutomaticShoppingItems),
 * so removing a meal from the plan already can't drop a shared ingredient's
 * demand or touch a manually added item (manual items live in a completely
 * separate store). This handler exists to make that guarantee explicit and
 * testable, and to give the caller a diff for a "removing this meal will
 * also remove N Grocery items" confirmation — not to recompute anything the
 * app doesn't already recompute for free.
 */
export function handleMealRemoved(input: HandleMealRemovedInput): HandleMealRemovedResult {
  const { mealToRemove, plannedMeals, recipes, products, inventoryItems, alwaysInStockProductIds } = input;

  const before = generateAutomaticShoppingItems({ plannedMeals, recipes, products, inventoryItems, alwaysInStockProductIds });
  const remainingMeals = plannedMeals.filter((meal) => meal.id !== mealToRemove.id);
  const after = generateAutomaticShoppingItems({
    plannedMeals: remainingMeals,
    recipes,
    products,
    inventoryItems,
    alwaysInStockProductIds,
  });

  const afterKeys = new Set(after.map((item) => item.normalizedName));
  const groceryItemsToRemove = before.filter((item) => !afterKeys.has(item.normalizedName));
  const groceryItemsRetained = before.filter((item) => afterKeys.has(item.normalizedName));

  return { groceryItemsToRemove, groceryItemsRetained };
}

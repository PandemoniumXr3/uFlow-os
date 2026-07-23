import type { InventoryItem } from '@/types/inventory';
import type { ShoppingItem } from '@/types/shoppingItem';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';
import type { AutomationSnapshot } from '@/services/automation/types';

export interface HandleStockChangedInput extends Omit<AutomationSnapshot, 'inventoryItems'> {
  /** Inventory before the change (e.g. quantity/status prior to this update). */
  previousInventoryItems: InventoryItem[];
  /** Inventory after the change has been applied. */
  nextInventoryItems: InventoryItem[];
}

export interface HandleStockChangedResult {
  /** Automatic Grocery items that no longer appear now that Stock reflects the change — safe to surface as "resolved". */
  groceryItemsResolved: ShoppingItem[];
}

/**
 * Stock's own status/quantity is already updated directly by the caller
 * (useInventory.update) — this only answers "did that change resolve any
 * Grocery demand," by diffing the automatic list before/after, for optional
 * confirmation feedback (e.g. "Adding Banana to Stock resolved 1 item").
 * Recipe availability and the Grocery list itself already recompute live
 * from `inventoryItems` via useMemo with no help needed here.
 */
export function handleStockChanged(input: HandleStockChangedInput): HandleStockChangedResult {
  const { recipes, products, plannedMeals, alwaysInStockProductIds, previousInventoryItems, nextInventoryItems } = input;

  const before = generateAutomaticShoppingItems({
    plannedMeals,
    recipes,
    products,
    inventoryItems: previousInventoryItems,
    alwaysInStockProductIds,
  });
  const after = generateAutomaticShoppingItems({
    plannedMeals,
    recipes,
    products,
    inventoryItems: nextInventoryItems,
    alwaysInStockProductIds,
  });

  const afterKeys = new Set(after.map((item) => item.normalizedName));
  const groceryItemsResolved = before.filter((item) => !afterKeys.has(item.normalizedName));

  return { groceryItemsResolved };
}

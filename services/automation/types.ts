import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ShoppingItem } from '@/types/shoppingItem';

/**
 * Read-only snapshot of the domains an automation handler needs. Handlers
 * never write to storage themselves and never import React — they take a
 * snapshot in, compute what changed using the same pure calculators screens
 * already call, and return a plain result the caller applies through the
 * existing hook mutators (mealPlan.*, useInventory.*, useShoppingList.*).
 * This is deliberately not a second state store: nothing here is cached or
 * persisted, so calling a handler twice with the same snapshot always
 * produces the same result.
 */
export interface AutomationSnapshot {
  recipes: Recipe[];
  products: Product[];
  inventoryItems: InventoryItem[];
  plannedMeals: PlannedMeal[];
  alwaysInStockProductIds: Set<string>;
}

import { MEAL_SEED } from '@/constants/mealSeed';
import { DEFAULT_PRODUCTS } from '@/constants/productSeed';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import { productPreferencesStorageService } from '@/services/productPreferences/productPreferencesStorageService';
import { productStorageService } from '@/services/products/productStorageService';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import { shoppingStorageService } from '@/services/shopping/shoppingStorageService';
import { toleranceStorageService } from '@/services/tolerance/toleranceStorageService';
import type { ExistingUserSignals } from '@/utils/detectExistingUser';

/**
 * Only called when no profile row exists yet (see resolveOnboardingForProfile)
 * — reads the domains that never auto-seed, plus recipe/product counts
 * compared against their starter-set size (both of those DO auto-seed for
 * everyone, so only the surplus above the starter set counts as a real
 * signal).
 */
export async function gatherExistingUserSignals(): Promise<ExistingUserSignals> {
  const [inventoryItems, mealPlanEntries, manualGroceryItems, recipes, products, tolerance, productPreferences] = await Promise.all([
    inventoryStorageService.getAll(),
    mealPlanStorageService.getAll(),
    shoppingStorageService.getManualItems(),
    recipeStorageService.getAll(),
    productStorageService.getAll(),
    toleranceStorageService.get(),
    productPreferencesStorageService.get(),
  ]);

  return {
    inventoryCount: inventoryItems.length,
    mealPlanCount: mealPlanEntries.length,
    groceryManualItemCount: manualGroceryItems.length,
    recipeCountBeyondStarterSet: Math.max(0, recipes.length - MEAL_SEED.length),
    productCountBeyondStarterSet: Math.max(0, products.length - DEFAULT_PRODUCTS.length),
    toleranceCustomized: tolerance.allergies.length > 0 || tolerance.intolerances.length > 0 || tolerance.safeMealsOnly,
    ingredientPreferencesCustomized: Object.keys(productPreferences?.ingredientTierByProductId ?? {}).length > 0,
  };
}

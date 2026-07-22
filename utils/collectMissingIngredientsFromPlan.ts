import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { getTodayKey } from '@/utils/date';
import { getWeekRange, isDateWithinRange } from '@/utils/getWeekRange';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface MissingIngredientNeed {
  ingredientName: string;
  productId?: string;
  recipeId: string;
  recipeName: string;
  mealPlanId: string;
  isToday: boolean;
  /** Within the current week but not today — kept disjoint from isToday so reasons don't repeat the same day twice. */
  isThisWeek: boolean;
}

/**
 * For every meal planned today or during the current week, finds ingredients
 * that have no sufficient stock (via the existing recipe-availability check)
 * and returns one need per missing ingredient per planned meal. Deliberately
 * unmerged — mergeShoppingItems collapses duplicates (e.g. two meals both
 * needing Banana) into a single shopping item with both meals linked.
 */
export function collectMissingIngredientsFromPlan(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  products: Product[],
  inventoryItems: InventoryItem[],
  referenceDate: Date = new Date()
): MissingIngredientNeed[] {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const productByNormalizedName = new Map(products.map((product) => [normalizeIngredient(product.name), product]));
  const todayKey = getTodayKey(referenceDate);
  const weekRange = getWeekRange(referenceDate);

  const needs: MissingIngredientNeed[] = [];

  for (const plannedMeal of plannedMeals) {
    if (plannedMeal.isSkipped || plannedMeal.isCustom) continue;

    const isToday = plannedMeal.date === todayKey;
    const isThisWeek = !isToday && isDateWithinRange(plannedMeal.date, weekRange);
    if (!isToday && !isThisWeek) continue;

    const recipe = plannedMeal.recipeId ? recipeById.get(plannedMeal.recipeId) : undefined;
    if (!recipe) continue;

    const availability = calculateRecipeAvailability(recipe.ingredients, products, inventoryItems);

    for (const ingredientName of availability.missing) {
      const product = productByNormalizedName.get(normalizeIngredient(ingredientName));
      needs.push({
        ingredientName,
        productId: product?.id,
        recipeId: recipe.id,
        recipeName: recipe.name,
        mealPlanId: plannedMeal.id,
        isToday,
        isThisWeek,
      });
    }
  }

  return needs;
}

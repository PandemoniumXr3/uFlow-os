import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ShoppingItem, ShoppingReasonDetail } from '@/types/shoppingItem';
import { collectMissingIngredientsFromPlan } from '@/utils/collectMissingIngredientsFromPlan';
import { generateId } from '@/utils/id';
import { getInventoryRestockItems, type RestockReasonType } from '@/utils/getInventoryRestockItems';
import { mergeShoppingItems, type ShoppingItemCandidate } from '@/utils/mergeShoppingItems';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

const RESTOCK_REASON_LABEL: Record<RestockReasonType, string> = {
  lowStock: 'Low stock',
  empty: 'Empty',
  alwaysInStock: 'Always keep in stock',
};

export interface GenerateAutomaticShoppingItemsInput {
  plannedMeals: PlannedMeal[];
  recipes: Recipe[];
  products: Product[];
  inventoryItems: InventoryItem[];
  alwaysInStockProductIds: Set<string>;
  referenceDate?: Date;
}

function hasHighPriorityReason(reasons: ShoppingReasonDetail[]): boolean {
  return reasons.some((reason) => reason.type === 'empty' || reason.type === 'todayMeal');
}

/**
 * Pure orchestrator: combines missing meal ingredients (today + this week)
 * with inventory restock needs (low/empty/always-in-stock), merges
 * duplicates by normalized name, and produces full automatic ShoppingItems.
 * Never touches storage or manual items — the caller (useShoppingList)
 * layers the persisted checked/purchased/hidden overlay on top of this.
 */
export function generateAutomaticShoppingItems(input: GenerateAutomaticShoppingItemsInput): ShoppingItem[] {
  const { plannedMeals, recipes, products, inventoryItems, alwaysInStockProductIds, referenceDate } = input;

  const mealNeeds = collectMissingIngredientsFromPlan(plannedMeals, recipes, products, inventoryItems, referenceDate);
  const restockNeeds = getInventoryRestockItems(products, inventoryItems, alwaysInStockProductIds);

  const candidates: ShoppingItemCandidate[] = [];

  for (const need of mealNeeds) {
    const reasons: ShoppingReasonDetail[] = [];
    if (need.isToday) reasons.push({ type: 'todayMeal', label: 'Needed for today' });
    if (need.isThisWeek) reasons.push({ type: 'weekMeal', label: 'Needed this week' });
    reasons.push({ type: 'missingForRecipe', label: `Missing for ${need.recipeName}`, recipeId: need.recipeId });

    candidates.push({
      displayName: need.ingredientName,
      normalizedName: normalizeIngredient(need.ingredientName),
      productId: need.productId,
      reasons,
      linkedRecipeIds: [need.recipeId],
      linkedMealPlanIds: [need.mealPlanId],
    });
  }

  for (const need of restockNeeds) {
    candidates.push({
      displayName: need.ingredientName,
      normalizedName: normalizeIngredient(need.ingredientName),
      productId: need.productId,
      quantity: need.quantity,
      unit: need.unit,
      reasons: need.reasonTypes.map((type) => ({ type, label: RESTOCK_REASON_LABEL[type] })),
      linkedRecipeIds: [],
      linkedMealPlanIds: [],
    });
  }

  const merged = mergeShoppingItems(candidates);
  const now = Date.now();

  return merged.map((candidate) => ({
    id: generateId(),
    productId: candidate.productId,
    displayName: candidate.displayName,
    normalizedName: candidate.normalizedName,
    quantity: candidate.quantity,
    unit: candidate.unit,
    source: 'automatic',
    reasons: candidate.reasons,
    linkedRecipeIds: candidate.linkedRecipeIds,
    linkedMealPlanIds: candidate.linkedMealPlanIds,
    checked: false,
    purchased: false,
    priority: hasHighPriorityReason(candidate.reasons) ? 'high' : 'normal',
    createdAt: now,
    updatedAt: now,
  }));
}

import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { NutritionInfo } from '@/types/nutrition';
import type { MealType } from '@/types/recipe';
import { estimateStockDeduction, type StockDeductionLine } from '@/services/stock/estimateStockDeduction';

export interface HandleMealEatenInput {
  meal: PlannedMeal;
  /** Undefined for a custom meal, or a recipe that no longer exists. */
  recipe?: Recipe;
  products: Product[];
  inventoryItems: InventoryItem[];
  alwaysInStockProductIds: Set<string>;
  /** Current log, checked for an existing entry tied to this plannedMeal so a double-tap can't log it twice. */
  mealLogEntries: MealLogEntry[];
}

export interface MealEatenLogInput {
  date: string;
  plannedMealId: string;
  mealSlot?: MealType;
  servings: number;
  nutritionSnapshot?: NutritionInfo;
  customName?: string;
}

export interface HandleMealEatenResult {
  /** True when this plannedMeal already has a log entry — caller must skip logging and deduction entirely. */
  alreadyLogged: boolean;
  /** Bundled input for mealLog.logMeal / logCustomMeal — undefined when alreadyLogged. */
  logInput: MealEatenLogInput | null;
  /** Proposed Stock deductions for confirmation — always empty for custom meals or recipes with no ingredientLines. */
  deductionLines: StockDeductionLine[];
}

/**
 * Centralizes what "mark eaten" means: log the meal once, and propose (never
 * apply) a Stock deduction. The caller still owns actually calling
 * mealLog.logMeal/logCustomMeal and, on confirmation, applyStockDeduction +
 * updateInventoryItem per accepted line — this only decides *what* those
 * calls should be, so a double-tap (the same meal marked eaten twice before
 * the UI updates) can't create a second log entry or a second deduction
 * proposal: `alreadyLogged` catches it by checking the current log for a
 * matching plannedMealId first.
 */
export function handleMealEaten(input: HandleMealEatenInput): HandleMealEatenResult {
  const { meal, recipe, products, inventoryItems, alwaysInStockProductIds, mealLogEntries } = input;

  const alreadyLogged = mealLogEntries.some((entry) => entry.plannedMealId === meal.id);
  if (alreadyLogged) {
    return { alreadyLogged: true, logInput: null, deductionLines: [] };
  }

  const servings = meal.servings ?? 1;

  if (meal.isCustom) {
    return {
      alreadyLogged: false,
      logInput: {
        date: meal.date,
        plannedMealId: meal.id,
        mealSlot: meal.mealSlot,
        servings,
        nutritionSnapshot: meal.customNutrition,
        customName: meal.customName ?? 'Custom meal',
      },
      deductionLines: [],
    };
  }

  const logInput: MealEatenLogInput = {
    date: meal.date,
    plannedMealId: meal.id,
    mealSlot: meal.mealSlot,
    servings,
    nutritionSnapshot: recipe?.nutrition,
  };

  const deductionLines = recipe ? estimateStockDeduction(recipe, servings, products, inventoryItems, alwaysInStockProductIds) : [];

  return { alreadyLogged: false, logInput, deductionLines };
}

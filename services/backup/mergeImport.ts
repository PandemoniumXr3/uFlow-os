import type { DismissalEntry } from '@/types/dismissal';
import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe, RecipeIngredientLine } from '@/types/recipe';
import type { ImportIssue, ImportModeOptions, UFlowExportData } from '@/types/backup';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface MergeResult {
  data: UFlowExportData;
  issues: ImportIssue[];
}

/**
 * Pure — computes the final domain data for a "merge" import: current data
 * plus whatever from the import is genuinely new, never silently
 * overwriting an existing record. `generateId` is injected so id
 * assignment is deterministic in tests. See per-domain comments below for
 * the exact rule each one follows — these are deliberate choices, not
 * "last write wins" applied uniformly.
 */
export function mergeImportData(
  imported: UFlowExportData,
  current: UFlowExportData,
  options: Pick<ImportModeOptions, 'profileChoice' | 'excludeDemoData'>,
  generateId: () => string
): MergeResult {
  const issues: ImportIssue[] = [];

  // --- Products: merge by id, then by normalized name (spec's exact fallback order). ---
  const currentProductIds = new Set(current.products.map((p) => p.id));
  const currentProductByName = new Map(current.products.map((p) => [normalizeName(p.name), p.id]));
  const productIdRemap = new Map<string, string>();
  const newProducts: Product[] = [];
  const consolidatedProductIds = new Set<string>();

  for (const product of imported.products) {
    if (currentProductIds.has(product.id)) {
      productIdRemap.set(product.id, product.id);
      consolidatedProductIds.add(product.id);
      continue;
    }
    const existingByName = currentProductByName.get(normalizeName(product.name));
    if (existingByName) {
      productIdRemap.set(product.id, existingByName);
      consolidatedProductIds.add(product.id);
      continue;
    }
    productIdRemap.set(product.id, product.id);
    newProducts.push(product);
  }
  const finalProducts = [...current.products, ...newProducts];

  // --- Recipes: preserve imported ids unless they collide — a collision never overwrites, it gets a fresh id instead. ---
  const currentRecipeIds = new Set(current.recipes.map((r) => r.id));
  const recipeIdRemap = new Map<string, string>();
  const remappedRecipeIds = new Set<string>();
  const newRecipes: Recipe[] = [];

  for (const recipe of imported.recipes) {
    let finalId = recipe.id;
    if (currentRecipeIds.has(recipe.id)) {
      finalId = generateId();
      remappedRecipeIds.add(recipe.id);
      issues.push({ severity: 'info', domain: 'recipes', code: 'recipe_id_remapped', message: `"${recipe.name}" already exists by id — imported as a separate recipe.`, entityId: recipe.id });
    }
    recipeIdRemap.set(recipe.id, finalId);
    const remappedLines: RecipeIngredientLine[] | undefined = recipe.ingredientLines?.map((line) =>
      line.productId ? { ...line, productId: productIdRemap.get(line.productId) ?? line.productId } : line
    );
    newRecipes.push({ ...recipe, id: finalId, ingredientLines: remappedLines });
  }
  const finalRecipes = [...current.recipes, ...newRecipes];

  // --- Inventory: merge by Product/location/unit identity — quantities are summed (combining two known stocks), never replaced. ---
  const inventoryKey = (item: Pick<InventoryItem, 'productId' | 'location' | 'unit'>) => `${item.productId}:${item.location}:${item.unit ?? ''}`;
  const currentInventoryByKey = new Map(current.inventory.map((item) => [inventoryKey(item), item]));
  const finalInventory: InventoryItem[] = [...current.inventory];
  const consolidatedInventoryIds = new Set<string>();

  for (const item of imported.inventory) {
    const remappedProductId = productIdRemap.get(item.productId) ?? item.productId;
    const key = inventoryKey({ ...item, productId: remappedProductId });
    const existing = currentInventoryByKey.get(key);
    if (existing) {
      const index = finalInventory.findIndex((candidate) => candidate.id === existing.id);
      const summedQuantity = existing.quantity != null || item.quantity != null ? (existing.quantity ?? 0) + (item.quantity ?? 0) : undefined;
      finalInventory[index] = {
        ...existing,
        quantity: summedQuantity,
        // Fill gaps only — an existing known value is never overwritten by the import.
        lastPurchasePriceCents: existing.lastPurchasePriceCents ?? item.lastPurchasePriceCents,
        expirationDate: existing.expirationDate ?? item.expirationDate,
      };
      consolidatedInventoryIds.add(item.id);
    } else {
      const idTaken = finalInventory.some((candidate) => candidate.id === item.id);
      finalInventory.push({ ...item, id: idTaken ? generateId() : item.id, productId: remappedProductId });
    }
  }

  // --- Grocery manual items: dedupe by normalized display name + unit — never duplicate the same physical item. ---
  const groceryKey = (item: Pick<UFlowExportData['manualGroceryItems'][number], 'displayName' | 'unit'>) => `${normalizeName(item.displayName)}:${item.unit ?? ''}`;
  const currentGroceryKeys = new Set(current.manualGroceryItems.map(groceryKey));
  const newManualGroceryItems = imported.manualGroceryItems.filter((item) => !currentGroceryKeys.has(groceryKey(item)));
  const finalManualGroceryItems = [...current.manualGroceryItems, ...newManualGroceryItems];

  // --- Meal plan: same date+slot already occupied by a *different* entry is a conflict — resolved by clearing the imported entry's slot rather than bumping the existing one. ---
  const currentMealPlanIds = new Set(current.mealPlan.map((m) => m.id));
  const currentSlotOwner = new Map(current.mealPlan.map((m) => [`${m.date}:${m.mealSlot ?? ''}`, m.id]));
  const newPlannedMeals: PlannedMeal[] = [];

  for (const meal of imported.mealPlan) {
    if (currentMealPlanIds.has(meal.id)) continue; // identical planned meal already present
    const remappedRecipeId = meal.recipeId ? recipeIdRemap.get(meal.recipeId) ?? meal.recipeId : meal.recipeId;
    const slotKey = `${meal.date}:${meal.mealSlot ?? ''}`;
    const slotOwner = currentSlotOwner.get(slotKey);
    let next: PlannedMeal = { ...meal, recipeId: remappedRecipeId };
    if (slotOwner && slotOwner !== meal.id) {
      next = { ...next, mealSlot: undefined };
      issues.push({ severity: 'info', domain: 'mealPlan', code: 'meal_plan_slot_cleared', message: `A planned meal on ${meal.date} collided with an existing one — imported without a fixed slot; re-schedule it from Day Detail.`, entityId: meal.id });
    }
    const idTaken = currentMealPlanIds.has(next.id) || newPlannedMeals.some((m) => m.id === next.id);
    newPlannedMeals.push(idTaken ? { ...next, id: generateId() } : next);
  }
  const finalMealPlan = [...current.mealPlan, ...newPlannedMeals];

  // --- Meal history: dedupe by stable id only — entries without one (legacy) are always kept, since there's nothing stable to dedupe against. ---
  const currentHistoryIds = new Set(current.mealHistory.filter((h) => h.id).map((h) => h.id));
  const newMealHistory: MealLogEntry[] = imported.mealHistory.filter((h) => !h.id || !currentHistoryIds.has(h.id));
  const finalMealHistory = [...current.mealHistory, ...newMealHistory];

  // --- Dismissals: dedupe by id, remap recipeId. ---
  const currentDismissalIds = new Set(current.dismissals.map((d) => d.id));
  const newDismissals: DismissalEntry[] = imported.dismissals
    .filter((d) => !currentDismissalIds.has(d.id))
    .map((d) => ({ ...d, recipeId: recipeIdRemap.get(d.recipeId) ?? d.recipeId }));
  const finalDismissals = [...current.dismissals, ...newDismissals];

  // --- Profile & settings-like domains: one explicit user choice governs all of them — never applied silently. ---
  const useImported = options.profileChoice === 'useImported';
  const finalProfile = useImported && imported.profile ? imported.profile : current.profile;
  const finalDiet = useImported && imported.diet ? imported.diet : current.diet;
  const finalTolerances = useImported && imported.tolerances ? imported.tolerances : current.tolerances;
  const finalSafeMeals =
    useImported && imported.safeMeals
      ? { ...imported.safeMeals, recipeIds: imported.safeMeals.recipeIds.map((id) => recipeIdRemap.get(id) ?? id) }
      : current.safeMeals;
  const finalProductPreferences =
    useImported && imported.productPreferences
      ? {
          ...imported.productPreferences,
          alwaysInStockProductIds: imported.productPreferences.alwaysInStockProductIds.map((id) => productIdRemap.get(id) ?? id),
          ingredientTierByProductId: imported.productPreferences.ingredientTierByProductId
            ? Object.fromEntries(Object.entries(imported.productPreferences.ingredientTierByProductId).map(([id, tier]) => [productIdRemap.get(id) ?? id, tier]))
            : undefined,
        }
      : current.productPreferences;

  // --- Demo metadata: never adopted if demo data is already installed, or if any tracked entity needed remapping/consolidation (its ids would no longer point at distinct, untouched rows). ---
  let finalDemoMetadata = current.demoMetadata;
  if (!options.excludeDemoData && !current.demoMetadata && imported.demoMetadata) {
    const { productIds, recipeIds, inventoryItemIds } = imported.demoMetadata.entityIds;
    const anyChanged =
      productIds.some((id) => consolidatedProductIds.has(id)) ||
      recipeIds.some((id) => remappedRecipeIds.has(id)) ||
      inventoryItemIds.some((id) => consolidatedInventoryIds.has(id));
    if (anyChanged) {
      issues.push({ severity: 'warning', domain: 'demoMetadata', code: 'demo_metadata_dropped', message: 'Demo data metadata was dropped — some demo items were merged with existing data. Reinstall demo data from Settings if you want it back.' });
    } else {
      finalDemoMetadata = imported.demoMetadata;
    }
  } else if (current.demoMetadata && imported.demoMetadata) {
    issues.push({ severity: 'info', domain: 'demoMetadata', code: 'demo_metadata_kept_current', message: 'Demo data was already installed — the imported demo dataset was not installed again.' });
  }

  return {
    data: {
      profile: finalProfile,
      products: finalProducts,
      recipes: finalRecipes,
      inventory: finalInventory,
      manualGroceryItems: finalManualGroceryItems,
      groceryOverlay: { ...current.groceryOverlay, ...imported.groceryOverlay },
      mealPlan: finalMealPlan,
      mealHistory: finalMealHistory,
      dismissals: finalDismissals,
      safeMeals: finalSafeMeals,
      diet: finalDiet,
      tolerances: finalTolerances,
      productPreferences: finalProductPreferences,
      demoMetadata: finalDemoMetadata,
    },
    issues,
  };
}

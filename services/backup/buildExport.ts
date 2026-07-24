import { demoDataStorageService } from '@/services/onboarding/demoDataStorageService';
import { dietStorageService } from '@/services/diet/dietStorageService';
import { dismissalStorageService } from '@/services/dismissal/dismissalStorageService';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { mealLogStorageService } from '@/services/mealLog/mealLogStorageService';
import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import { productPreferencesStorageService } from '@/services/productPreferences/productPreferencesStorageService';
import { productStorageService } from '@/services/products/productStorageService';
import { profileStorageService } from '@/services/profile/profileStorageService';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import { safeMealsStorageService } from '@/services/safeMeals/safeMealsStorageService';
import { shoppingStorageService } from '@/services/shopping/shoppingStorageService';
import { toleranceStorageService } from '@/services/tolerance/toleranceStorageService';
import { EXPORT_SCHEMA_VERSION, type UFlowExport, type UFlowExportData } from '@/types/backup';

/** Reads every domain directly from storage — the only I/O in the export path; everything downstream of this is pure. */
export async function gatherExportData(): Promise<UFlowExportData> {
  const [
    profile,
    products,
    recipes,
    inventory,
    manualGroceryItems,
    groceryOverlay,
    mealPlan,
    mealHistory,
    dismissals,
    safeMeals,
    diet,
    tolerances,
    productPreferences,
    demoMetadata,
  ] = await Promise.all([
    profileStorageService.get(),
    productStorageService.getAll(),
    recipeStorageService.getAll(),
    inventoryStorageService.getAll(),
    shoppingStorageService.getManualItems(),
    shoppingStorageService.getOverlay(),
    mealPlanStorageService.getAll(),
    mealLogStorageService.getAll(),
    dismissalStorageService.getAll(),
    safeMealsStorageService.get(),
    dietStorageService.get(),
    toleranceStorageService.get(),
    productPreferencesStorageService.get(),
    demoDataStorageService.get(),
  ]);

  return {
    profile,
    products,
    recipes,
    inventory,
    manualGroceryItems,
    groceryOverlay,
    mealPlan,
    mealHistory,
    dismissals,
    safeMeals,
    diet,
    tolerances,
    productPreferences,
    demoMetadata,
  };
}

/**
 * Pure — wraps already-gathered domain data in the versioned export
 * envelope. `appVersion`/`platform` are injected rather than read here via
 * `expo-constants`/`Platform.OS` directly, so this module never imports
 * `react-native` — vitest's plain node environment (no RN/Flow transform
 * configured) can't parse react-native's source if anything here pulled it
 * in transitively, and it also keeps this function fully deterministic for
 * tests.
 */
export function buildExport(data: UFlowExportData, nowMs: number, appVersion?: string, platform?: string): UFlowExport {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    appVersion,
    platform,
    data,
  };
}

/**
 * Pure — removes every entity `demoMetadata` tracks, and drops `demoMetadata`
 * itself, so an "exclude demo data" export contains zero trace of the demo
 * install. Never touches real (untracked) entities, even ones that happen
 * to share a name with a demo entity.
 */
export function excludeDemoDataFromExport(data: UFlowExportData): UFlowExportData {
  if (!data.demoMetadata) return data;
  const { productIds, recipeIds, inventoryItemIds, mealPlanEntryIds, safeMealRecipeIds } = data.demoMetadata.entityIds;
  const productIdSet = new Set(productIds);
  const recipeIdSet = new Set(recipeIds);
  const inventoryIdSet = new Set(inventoryItemIds);
  const mealPlanIdSet = new Set(mealPlanEntryIds);
  const safeMealIdSet = new Set(safeMealRecipeIds);

  return {
    ...data,
    products: data.products.filter((p) => !productIdSet.has(p.id)),
    recipes: data.recipes.filter((r) => !recipeIdSet.has(r.id)),
    inventory: data.inventory.filter((i) => !inventoryIdSet.has(i.id)),
    mealPlan: data.mealPlan.filter((m) => !mealPlanIdSet.has(m.id)),
    safeMeals: data.safeMeals ? { ...data.safeMeals, recipeIds: data.safeMeals.recipeIds.filter((id) => !safeMealIdSet.has(id)) } : null,
    demoMetadata: null,
  };
}

export function buildExportFilename(nowMs: number): string {
  const date = new Date(nowMs).toISOString().slice(0, 10);
  return `uflow-backup-${date}.json`;
}

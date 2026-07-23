import { buildDemoDataset } from '@/services/onboarding/buildDemoDataset';
import { demoDataStorageService } from '@/services/onboarding/demoDataStorageService';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import { productStorageService } from '@/services/products/productStorageService';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import { safeMealsStorageService } from '@/services/safeMeals/safeMealsStorageService';
import { DEMO_DATASET_VERSION, type DemoDataMetadata } from '@/types/demoData';
import { generateId } from '@/utils/id';

/**
 * Installs the curated demo dataset exactly once — a no-op if metadata
 * already exists (rerunning onboarding, or tapping "Install demo data"
 * twice, never creates duplicate records). Every write here is a plain
 * additive `add()` — nothing else stored is read or touched, so a user's
 * own real data (added before or after) is never at risk.
 *
 * Writes within each entity type are deliberately sequential, not
 * Promise.all — every *StorageService.add()/remove() is a read-current-
 * array-then-write-the-whole-array-back operation with no locking, so
 * firing several concurrently causes a last-write-wins race where each
 * call's write is based on a snapshot taken before its siblings finished,
 * silently dropping all but the last one.
 */
export async function installDemoData(nowMs: number = Date.now()): Promise<DemoDataMetadata> {
  const existing = await demoDataStorageService.get();
  if (existing) return existing;

  const dataset = buildDemoDataset(nowMs, generateId);

  for (const product of dataset.products) await productStorageService.add(product);
  for (const recipe of dataset.recipes) await recipeStorageService.add(recipe);
  for (const item of dataset.inventoryItems) await inventoryStorageService.add(item);
  for (const meal of dataset.plannedMeals) await mealPlanStorageService.add(meal);

  if (dataset.safeMealRecipeIds.length > 0) {
    const safeMeals = await safeMealsStorageService.get();
    await safeMealsStorageService.save({
      ...safeMeals,
      recipeIds: [...new Set([...safeMeals.recipeIds, ...dataset.safeMealRecipeIds])],
    });
  }

  const metadata: DemoDataMetadata = {
    demoDatasetVersion: DEMO_DATASET_VERSION,
    installedAt: new Date(nowMs).toISOString(),
    entityIds: {
      productIds: dataset.products.map((p) => p.id),
      recipeIds: dataset.recipes.map((r) => r.id),
      inventoryItemIds: dataset.inventoryItems.map((i) => i.id),
      mealPlanEntryIds: dataset.plannedMeals.map((m) => m.id),
      safeMealRecipeIds: dataset.safeMealRecipeIds,
    },
  };
  await demoDataStorageService.save(metadata);
  return metadata;
}

/**
 * Removes exactly the entities recorded at install time — nothing else.
 * Real data added later (even a product with the same name, since it would
 * have a different id) is never touched, because removal is purely
 * id-based, never name- or content-based.
 */
export async function removeDemoData(): Promise<void> {
  const metadata = await demoDataStorageService.get();
  if (!metadata) return;

  const { productIds, recipeIds, inventoryItemIds, mealPlanEntryIds, safeMealRecipeIds } = metadata.entityIds;

  // Sequential for the same read-modify-write race reason as installDemoData above.
  for (const id of inventoryItemIds) await inventoryStorageService.remove(id);
  for (const id of mealPlanEntryIds) await mealPlanStorageService.remove(id);
  for (const id of recipeIds) await recipeStorageService.remove(id);
  for (const id of productIds) await productStorageService.remove(id);

  if (safeMealRecipeIds.length > 0) {
    const safeMeals = await safeMealsStorageService.get();
    await safeMealsStorageService.save({
      ...safeMeals,
      recipeIds: safeMeals.recipeIds.filter((id) => !safeMealRecipeIds.includes(id)),
    });
  }

  await demoDataStorageService.clear();
}

export async function isDemoDataInstalled(): Promise<boolean> {
  const metadata = await demoDataStorageService.get();
  return metadata != null;
}

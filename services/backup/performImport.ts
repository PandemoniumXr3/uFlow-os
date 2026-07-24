import { countDomains } from '@/services/backup/previewImport';
import { createStorageSnapshot, restoreStorageSnapshot } from '@/services/backup/rollbackImport';
import { dietStorageService } from '@/services/diet/dietStorageService';
import { dismissalStorageService } from '@/services/dismissal/dismissalStorageService';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { mealLogStorageService } from '@/services/mealLog/mealLogStorageService';
import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import { demoDataStorageService } from '@/services/onboarding/demoDataStorageService';
import { productPreferencesStorageService } from '@/services/productPreferences/productPreferencesStorageService';
import { productStorageService } from '@/services/products/productStorageService';
import { profileStorageService } from '@/services/profile/profileStorageService';
import { recipeStorageService } from '@/services/recipes/recipeStorageService';
import { safeMealsStorageService } from '@/services/safeMeals/safeMealsStorageService';
import { shoppingStorageService } from '@/services/shopping/shoppingStorageService';
import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { toleranceStorageService } from '@/services/tolerance/toleranceStorageService';
import type { ImportDomainCounts, UFlowExportData } from '@/types/backup';

export interface PerformImportResult {
  success: boolean;
  countsWritten: ImportDomainCounts;
  error?: { code: string; message: string };
}

/**
 * The only place that actually writes an import to storage. Order: snapshot
 * everything first, write every domain, re-read and verify counts match
 * what was intended, and only then report success. Any thrown error or a
 * verification mismatch triggers an immediate rollback to the snapshot — the
 * app is never left half-imported. A single-object domain (profile, diet,
 * tolerances, safeMeals, productPreferences, demoMetadata) that resolved to
 * `null` has its storage key removed, not written as literal JSON `null` —
 * every domain's own `get()` already treats "key absent" as "never set", so
 * this keeps behavior identical to a profile/preferences that were simply
 * never created.
 */
export async function performImport(finalData: UFlowExportData): Promise<PerformImportResult> {
  const snapshot = await createStorageSnapshot();
  const expectedCounts = countDomains(finalData);

  try {
    await productStorageService.save(finalData.products);
    await recipeStorageService.save(finalData.recipes);
    await inventoryStorageService.save(finalData.inventory);
    await shoppingStorageService.saveManualItems(finalData.manualGroceryItems);
    await shoppingStorageService.saveOverlay(finalData.groceryOverlay);
    await mealPlanStorageService.save(finalData.mealPlan);
    await mealLogStorageService.save(finalData.mealHistory);
    await dismissalStorageService.save(finalData.dismissals);

    if (finalData.profile) await profileStorageService.save(finalData.profile);
    else await asyncStorageClient.remove('uflow.profile');

    if (finalData.diet) await dietStorageService.save(finalData.diet);
    else await asyncStorageClient.remove('uflow.diet');

    if (finalData.tolerances) await toleranceStorageService.save(finalData.tolerances);
    else await asyncStorageClient.remove('uflow.tolerance');

    if (finalData.safeMeals) await safeMealsStorageService.save(finalData.safeMeals);
    else await asyncStorageClient.remove('uflow.safeMeals');

    if (finalData.productPreferences) await productPreferencesStorageService.save(finalData.productPreferences);
    else await asyncStorageClient.remove('uflow.productPreferences');

    if (finalData.demoMetadata) await demoDataStorageService.save(finalData.demoMetadata);
    else await demoDataStorageService.clear();

    const [products, recipes, inventory, manualGroceryItems, mealPlan, mealHistory, dismissals] = await Promise.all([
      productStorageService.getAll(),
      recipeStorageService.getAll(),
      inventoryStorageService.getAll(),
      shoppingStorageService.getManualItems(),
      mealPlanStorageService.getAll(),
      mealLogStorageService.getAll(),
      dismissalStorageService.getAll(),
    ]);
    const countsWritten: ImportDomainCounts = {
      products: products.length,
      recipes: recipes.length,
      inventory: inventory.length,
      manualGroceryItems: manualGroceryItems.length,
      mealPlan: mealPlan.length,
      mealHistory: mealHistory.length,
      dismissals: dismissals.length,
    };

    const verified = (Object.keys(countsWritten) as (keyof ImportDomainCounts)[]).every((key) => countsWritten[key] === expectedCounts[key]);
    if (!verified) {
      await restoreStorageSnapshot(snapshot);
      return { success: false, countsWritten, error: { code: 'verification_failed', message: 'The import did not verify correctly, so your previous data was restored.' } };
    }

    return { success: true, countsWritten };
  } catch (writeError) {
    try {
      await restoreStorageSnapshot(snapshot);
    } catch {
      return {
        success: false,
        countsWritten: expectedCounts,
        error: { code: 'rollback_failed', message: 'The import failed and could not be fully restored. Please check Settings before continuing.' },
      };
    }
    const detail = writeError instanceof Error ? writeError.message : String(writeError);
    if (__DEV__) console.error('[performImport] write failed, rolled back:', detail);
    return { success: false, countsWritten: expectedCounts, error: { code: 'write_failed', message: 'The import failed and your previous data was restored.' } };
  }
}

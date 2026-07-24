import type { ImportConflict, ImportDomainCounts, ImportIssue, ImportPreview, UFlowExport, UFlowExportData } from '@/types/backup';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function countDomains(data: UFlowExportData): ImportDomainCounts {
  return {
    products: data.products.length,
    recipes: data.recipes.length,
    inventory: data.inventory.length,
    manualGroceryItems: data.manualGroceryItems.length,
    mealPlan: data.mealPlan.length,
    mealHistory: data.mealHistory.length,
    dismissals: data.dismissals.length,
  };
}

/**
 * Pure — compares the (already validated + migrated) imported data against
 * whatever is currently in storage, and reports what a user should know
 * before choosing replace/merge. Never mutates either input.
 */
export function buildImportPreview(imported: UFlowExport, current: UFlowExportData, validationIssues: ImportIssue[], originalSchemaVersion: number): ImportPreview {
  const conflicts: ImportConflict[] = [];
  const importedData = imported.data;

  const currentProductIds = new Set(current.products.map((p) => p.id));
  const currentRecipeIds = new Set(current.recipes.map((r) => r.id));
  const currentProductNames = new Map(current.products.map((p) => [normalizeName(p.name), p.id]));

  const productIdCollisions = importedData.products.filter((p) => currentProductIds.has(p.id));
  if (productIdCollisions.length > 0) {
    conflicts.push({
      domain: 'products',
      code: 'product_id_collision',
      description: `${productIdCollisions.length} imported Product${productIdCollisions.length === 1 ? '' : 's'} already exist by id.`,
      count: productIdCollisions.length,
    });
  }

  const productNameCollisions = importedData.products.filter((p) => !currentProductIds.has(p.id) && currentProductNames.has(normalizeName(p.name)));
  if (productNameCollisions.length > 0) {
    conflicts.push({
      domain: 'products',
      code: 'product_name_collision',
      description: `${productNameCollisions.length} imported Product${productNameCollisions.length === 1 ? '' : 's'} match an existing Product by name.`,
      count: productNameCollisions.length,
    });
  }

  const recipeIdCollisions = importedData.recipes.filter((r) => currentRecipeIds.has(r.id));
  if (recipeIdCollisions.length > 0) {
    conflicts.push({
      domain: 'recipes',
      code: 'recipe_id_collision',
      description: `${recipeIdCollisions.length} imported Recipe${recipeIdCollisions.length === 1 ? '' : 's'} already exist by id — imports will be kept as separate recipes.`,
      count: recipeIdCollisions.length,
    });
  }

  const currentSlotKey = new Map(current.mealPlan.map((m) => [`${m.date}:${m.mealSlot ?? ''}`, m.id]));
  const mealPlanSlotConflicts = importedData.mealPlan.filter((m) => {
    const existingId = currentSlotKey.get(`${m.date}:${m.mealSlot ?? ''}`);
    return existingId !== undefined && existingId !== m.id;
  });
  if (mealPlanSlotConflicts.length > 0) {
    conflicts.push({
      domain: 'mealPlan',
      code: 'meal_plan_slot_collision',
      description: `${mealPlanSlotConflicts.length} planned meal${mealPlanSlotConflicts.length === 1 ? '' : 's'} collide with an existing date/slot already planned.`,
      count: mealPlanSlotConflicts.length,
    });
  }

  if (current.profile && importedData.profile && current.profile.id !== importedData.profile.id) {
    const settingsDiffer =
      current.profile.nutritionTrackingEnabled !== importedData.profile.nutritionTrackingEnabled ||
      current.profile.contextIntelligenceEnabled !== importedData.profile.contextIntelligenceEnabled ||
      JSON.stringify(current.profile.budget) !== JSON.stringify(importedData.profile.budget);
    if (settingsDiffer) {
      conflicts.push({
        domain: 'profile',
        code: 'profile_settings_differ',
        description: 'The imported profile has different module settings than your current one.',
        count: 1,
      });
    }
  }

  if (current.demoMetadata && importedData.demoMetadata) {
    conflicts.push({
      domain: 'demoMetadata',
      code: 'demo_data_already_installed',
      description: 'Demo data is already installed — the imported demo dataset will not be installed a second time.',
      count: 1,
    });
  }

  return {
    exportedAt: imported.exportedAt,
    schemaVersion: imported.schemaVersion,
    appVersion: imported.appVersion,
    counts: countDomains(importedData),
    profileIncluded: importedData.profile != null,
    demoDataIncluded: importedData.demoMetadata != null,
    issues: validationIssues,
    conflicts,
    migrationRequired: originalSchemaVersion !== imported.schemaVersion,
  };
}

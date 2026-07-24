import { describe, expect, it } from 'vitest';

import { buildImportPreview } from '@/services/backup/previewImport';
import { EXPORT_SCHEMA_VERSION } from '@/types/backup';
import type { UFlowExport, UFlowExportData } from '@/types/backup';

function emptyData(overrides: Partial<UFlowExportData> = {}): UFlowExportData {
  return {
    profile: null,
    products: [],
    recipes: [],
    inventory: [],
    manualGroceryItems: [],
    groceryOverlay: {},
    mealPlan: [],
    mealHistory: [],
    dismissals: [],
    safeMeals: null,
    diet: null,
    tolerances: null,
    productPreferences: null,
    demoMetadata: null,
    ...overrides,
  };
}

function exportOf(data: UFlowExportData): UFlowExport {
  return { schemaVersion: EXPORT_SCHEMA_VERSION, exportedAt: '2026-07-24T12:00:00.000Z', data };
}

describe('buildImportPreview', () => {
  it('reports zero conflicts and correct counts for a clean, non-overlapping import', () => {
    const imported = exportOf(
      emptyData({ products: [{ id: 'p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] })
    );
    const preview = buildImportPreview(imported, emptyData(), [], EXPORT_SCHEMA_VERSION);
    expect(preview.counts.products).toBe(1);
    expect(preview.conflicts).toHaveLength(0);
    expect(preview.migrationRequired).toBe(false);
  });

  it('flags a product id collision', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const imported = exportOf(emptyData({ products: [product] }));
    const current = emptyData({ products: [{ ...product, name: 'Whole Milk' }] });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'product_id_collision')).toBe(true);
  });

  it('flags a normalized-name collision even with a different id', () => {
    const imported = exportOf(emptyData({ products: [{ id: 'imported-1', name: 'MILK', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] }));
    const current = emptyData({ products: [{ id: 'current-1', name: 'milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'product_name_collision')).toBe(true);
  });

  it('flags a recipe id collision', () => {
    const recipe = { id: 'r1', name: 'Oatmeal', mealType: ['breakfast' as const], categories: [], ingredients: [], effort: 'low' as const, time: 5, isFavorite: false, createdAt: 1 };
    const imported = exportOf(emptyData({ recipes: [recipe] }));
    const current = emptyData({ recipes: [recipe] });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'recipe_id_collision')).toBe(true);
  });

  it('flags a meal-plan date/slot collision between different entries', () => {
    const imported = exportOf(emptyData({ mealPlan: [{ id: 'm-imported', recipeId: 'r1', date: '2026-07-24', mealSlot: 'dinner', createdAt: 1 }] }));
    const current = emptyData({ mealPlan: [{ id: 'm-current', recipeId: 'r2', date: '2026-07-24', mealSlot: 'dinner', createdAt: 1 }] });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'meal_plan_slot_collision')).toBe(true);
  });

  it('does not flag a meal-plan slot as conflicting with itself', () => {
    const meal = { id: 'm1', recipeId: 'r1', date: '2026-07-24', mealSlot: 'dinner' as const, createdAt: 1 };
    const imported = exportOf(emptyData({ mealPlan: [meal] }));
    const current = emptyData({ mealPlan: [meal] });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'meal_plan_slot_collision')).toBe(false);
  });

  it('flags differing profile module settings between a different current and imported profile', () => {
    const imported = exportOf(emptyData({ profile: { id: 'imported-profile', createdAt: 1, updatedAt: 1, nutritionTrackingEnabled: true } }));
    const current = emptyData({ profile: { id: 'current-profile', createdAt: 1, updatedAt: 1, nutritionTrackingEnabled: false } });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'profile_settings_differ')).toBe(true);
  });

  it('flags when demo data is already installed and the import also has demo metadata', () => {
    const demoMeta = {
      demoDatasetVersion: 1,
      installedAt: '2026-07-24T12:00:00.000Z',
      entityIds: { productIds: [], recipeIds: [], inventoryItemIds: [], mealPlanEntryIds: [], safeMealRecipeIds: [] },
    };
    const imported = exportOf(emptyData({ demoMetadata: demoMeta }));
    const current = emptyData({ demoMetadata: demoMeta });
    const preview = buildImportPreview(imported, current, [], EXPORT_SCHEMA_VERSION);
    expect(preview.conflicts.some((c) => c.code === 'demo_data_already_installed')).toBe(true);
    expect(preview.demoDataIncluded).toBe(true);
  });

  it('reports migrationRequired when the file arrived at a different schema version than it was migrated to', () => {
    const imported = exportOf(emptyData());
    const preview = buildImportPreview(imported, emptyData(), [], EXPORT_SCHEMA_VERSION - 1);
    expect(preview.migrationRequired).toBe(true);
  });

  it('reports migrationRequired as false when the file was already at the current schema version', () => {
    const imported = exportOf(emptyData());
    const preview = buildImportPreview(imported, emptyData(), [], EXPORT_SCHEMA_VERSION);
    expect(preview.migrationRequired).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { buildExport, buildExportFilename, excludeDemoDataFromExport } from '@/services/backup/buildExport';
import { EXPORT_SCHEMA_VERSION } from '@/types/backup';
import type { UFlowExportData } from '@/types/backup';

const NOW = new Date('2026-07-24T12:00:00.000Z').getTime();

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

describe('buildExport', () => {
  it('stamps the current schema version and an ISO timestamp', () => {
    const result = buildExport(emptyData(), NOW, '1.0.0', 'ios');
    expect(result.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(result.exportedAt).toBe(new Date(NOW).toISOString());
    expect(result.appVersion).toBe('1.0.0');
    expect(result.platform).toBe('ios');
  });

  it('carries the given data through unchanged', () => {
    const data = emptyData({ products: [{ id: 'p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    const result = buildExport(data, NOW);
    expect(result.data).toBe(data);
  });

  it('omits appVersion when not provided', () => {
    const result = buildExport(emptyData(), NOW);
    expect(result.appVersion).toBeUndefined();
  });
});

describe('buildExportFilename', () => {
  it('produces a readable, date-stamped filename', () => {
    expect(buildExportFilename(NOW)).toBe('uflow-backup-2026-07-24.json');
  });
});

describe('excludeDemoDataFromExport', () => {
  it('is a no-op when there is no demo metadata', () => {
    const data = emptyData({ products: [{ id: 'p1', name: 'Real Product', category: 'Other', isFavorite: false, createdAt: 1 }] });
    expect(excludeDemoDataFromExport(data)).toBe(data);
  });

  it('removes exactly the tracked demo entities and clears demoMetadata', () => {
    const data = emptyData({
      products: [
        { id: 'demo-1', name: 'Chicken (Demo)', category: 'Protein', isFavorite: false, createdAt: 1 },
        { id: 'real-1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 },
      ],
      recipes: [
        { id: 'demo-recipe-1', name: 'Demo Bowl', mealType: ['lunch'], categories: [], ingredients: [], effort: 'low', time: 5, isFavorite: false, createdAt: 1 },
        { id: 'real-recipe-1', name: 'Real Bowl', mealType: ['lunch'], categories: [], ingredients: [], effort: 'low', time: 5, isFavorite: false, createdAt: 1 },
      ],
      inventory: [
        { id: 'demo-inv-1', productId: 'demo-1', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1 },
        { id: 'real-inv-1', productId: 'real-1', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1 },
      ],
      mealPlan: [
        { id: 'demo-meal-1', recipeId: 'demo-recipe-1', date: '2026-07-24', createdAt: 1 },
        { id: 'real-meal-1', recipeId: 'real-recipe-1', date: '2026-07-24', createdAt: 1 },
      ],
      safeMeals: { recipeIds: ['demo-recipe-1', 'real-recipe-1'], showSafeOnly: false },
      demoMetadata: {
        demoDatasetVersion: 1,
        installedAt: new Date(NOW).toISOString(),
        entityIds: {
          productIds: ['demo-1'],
          recipeIds: ['demo-recipe-1'],
          inventoryItemIds: ['demo-inv-1'],
          mealPlanEntryIds: ['demo-meal-1'],
          safeMealRecipeIds: ['demo-recipe-1'],
        },
      },
    });

    const result = excludeDemoDataFromExport(data);

    expect(result.products.map((p) => p.id)).toEqual(['real-1']);
    expect(result.recipes.map((r) => r.id)).toEqual(['real-recipe-1']);
    expect(result.inventory.map((i) => i.id)).toEqual(['real-inv-1']);
    expect(result.mealPlan.map((m) => m.id)).toEqual(['real-meal-1']);
    expect(result.safeMeals?.recipeIds).toEqual(['real-recipe-1']);
    expect(result.demoMetadata).toBeNull();
  });

  it('never touches a real entity that merely shares a name with a demo one', () => {
    const data = emptyData({
      products: [
        { id: 'demo-1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 },
        { id: 'real-1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 2 },
      ],
      demoMetadata: {
        demoDatasetVersion: 1,
        installedAt: new Date(NOW).toISOString(),
        entityIds: { productIds: ['demo-1'], recipeIds: [], inventoryItemIds: [], mealPlanEntryIds: [], safeMealRecipeIds: [] },
      },
    });

    const result = excludeDemoDataFromExport(data);
    expect(result.products.map((p) => p.id)).toEqual(['real-1']);
  });
});

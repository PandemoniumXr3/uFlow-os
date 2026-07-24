import { describe, expect, it } from 'vitest';

import { buildReplacementData } from '@/services/backup/replaceImport';
import type { UFlowExportData } from '@/types/backup';

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

describe('buildReplacementData', () => {
  it('passes imported data through unchanged when not excluding demo data', () => {
    const data = emptyData({ products: [{ id: 'p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    expect(buildReplacementData(data, false)).toBe(data);
  });

  it('strips demo-tracked entities when excludeDemoData is true', () => {
    const data = emptyData({
      products: [{ id: 'demo-1', name: 'Demo Chicken', category: 'Protein', isFavorite: false, createdAt: 1 }],
      demoMetadata: {
        demoDatasetVersion: 1,
        installedAt: '2026-07-24T12:00:00.000Z',
        entityIds: { productIds: ['demo-1'], recipeIds: [], inventoryItemIds: [], mealPlanEntryIds: [], safeMealRecipeIds: [] },
      },
    });
    const result = buildReplacementData(data, true);
    expect(result.products).toHaveLength(0);
    expect(result.demoMetadata).toBeNull();
  });
});

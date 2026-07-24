import { describe, expect, it } from 'vitest';

import { migrateExport } from '@/services/backup/migrateImport';
import { EXPORT_SCHEMA_VERSION } from '@/types/backup';
import type { UFlowExportData } from '@/types/backup';

function emptyData(): UFlowExportData {
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
  };
}

describe('migrateExport', () => {
  it('passes an already-current schema version through unchanged', () => {
    const input = { schemaVersion: EXPORT_SCHEMA_VERSION, exportedAt: '2026-07-24T12:00:00.000Z', data: emptyData() };
    const result = migrateExport(input);
    expect(result.issues).toHaveLength(0);
    expect(result.data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(result.data.data).toBe(input.data);
  });
});

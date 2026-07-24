import { describe, expect, it } from 'vitest';

import { validateImportFile } from '@/services/backup/validateImport';
import { EXPORT_SCHEMA_VERSION } from '@/types/backup';

// Loosely typed on purpose — these tests deliberately construct malformed data
// (bad enums, negative quantities, etc.) that the real domain types would reject.
function emptyData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

function validBackup(dataOverrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: '2026-07-24T12:00:00.000Z',
    appVersion: '1.0.0',
    platform: 'ios',
    data: emptyData(dataOverrides),
  };
}

describe('validateImportFile', () => {
  it('accepts a well-formed, empty backup', () => {
    const result = validateImportFile(JSON.stringify(validBackup()));
    expect(result.canProceed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'blocking')).toHaveLength(0);
  });

  it('rejects an empty file', () => {
    const result = validateImportFile('');
    expect(result.canProceed).toBe(false);
    expect(result.issues[0].code).toBe('empty_file');
  });

  it('rejects invalid JSON', () => {
    const result = validateImportFile('{not json');
    expect(result.canProceed).toBe(false);
    expect(result.issues[0].code).toBe('invalid_json');
  });

  it('rejects a JSON array at the top level', () => {
    const result = validateImportFile(JSON.stringify([1, 2, 3]));
    expect(result.canProceed).toBe(false);
    expect(result.issues[0].code).toBe('invalid_top_level_shape');
  });

  it('rejects a future, unsupported schema version', () => {
    const result = validateImportFile(JSON.stringify({ ...validBackup(), schemaVersion: EXPORT_SCHEMA_VERSION + 1 }));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'unsupported_schema_future')).toBe(true);
  });

  it('rejects a schema version below the minimum supported', () => {
    const result = validateImportFile(JSON.stringify({ ...validBackup(), schemaVersion: 0 }));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'unsupported_schema_old')).toBe(true);
  });

  it('rejects a missing data section', () => {
    const result = validateImportFile(JSON.stringify({ schemaVersion: EXPORT_SCHEMA_VERSION, exportedAt: '2026-07-24T12:00:00.000Z' }));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'missing_data')).toBe(true);
  });

  it('warns (does not block) on an invalid exportedAt', () => {
    const result = validateImportFile(JSON.stringify({ ...validBackup(), exportedAt: 'not-a-date' }));
    expect(result.canProceed).toBe(true);
    expect(result.issues.some((i) => i.code === 'invalid_exported_at' && i.severity === 'warning')).toBe(true);
  });

  it('blocks on duplicate ids within the same domain', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 };
    const result = validateImportFile(JSON.stringify(validBackup({ products: [product, { ...product }] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'duplicate_id_in_file' && i.domain === 'products')).toBe(true);
  });

  it('blocks on a negative inventory quantity', () => {
    const item = { id: 'i1', productId: 'p1', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1, quantity: -5 };
    const result = validateImportFile(JSON.stringify(validBackup({ inventory: [item] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'invalid_quantity' && i.domain === 'inventory')).toBe(true);
  });

  it('blocks on an invalid inventory enum value', () => {
    const item = { id: 'i1', productId: 'p1', stockStatus: 'rotten', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1 };
    const result = validateImportFile(JSON.stringify(validBackup({ inventory: [item] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'invalid_enum' && i.domain === 'inventory')).toBe(true);
  });

  it('blocks on an invalid expiration date', () => {
    const item = { id: 'i1', productId: 'p1', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1, expirationDate: '13/45/2026' };
    const result = validateImportFile(JSON.stringify(validBackup({ inventory: [item] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'invalid_date')).toBe(true);
  });

  it('blocks on a negative inventory price (invalid money)', () => {
    const item = { id: 'i1', productId: 'p1', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1, lastPurchasePriceCents: -100 };
    const result = validateImportFile(JSON.stringify(validBackup({ inventory: [item] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'invalid_money')).toBe(true);
  });

  it('blocks on malformed onboarding state', () => {
    const profile = { id: 'u1', createdAt: 1, updatedAt: 1, onboarding: { status: 'bogus', currentStep: 0, version: 1 } };
    const result = validateImportFile(JSON.stringify(validBackup({ profile })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'malformed_onboarding')).toBe(true);
  });

  it('blocks on malformed demo metadata', () => {
    const result = validateImportFile(JSON.stringify(validBackup({ demoMetadata: { demoDatasetVersion: 1 } })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.code === 'malformed_demo_metadata')).toBe(true);
  });

  it('blocks on a mealPlan entry with neither recipeId nor a custom name', () => {
    const meal = { id: 'm1', date: '2026-07-24', createdAt: 1 };
    const result = validateImportFile(JSON.stringify(validBackup({ mealPlan: [meal] })));
    expect(result.canProceed).toBe(false);
    expect(result.issues.some((i) => i.domain === 'mealPlan' && i.code === 'malformed_entity')).toBe(true);
  });

  it('warns (does not block) on duplicate normalized product names', () => {
    const products = [
      { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 },
      { id: 'p2', name: 'milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 },
    ];
    const result = validateImportFile(JSON.stringify(validBackup({ products })));
    expect(result.canProceed).toBe(true);
    expect(result.issues.some((i) => i.code === 'duplicate_normalized_name' && i.severity === 'warning')).toBe(true);
  });

  it('warns (does not block) on a Stock item referencing an unknown Product', () => {
    const item = { id: 'i1', productId: 'missing-product', stockStatus: 'inStock', location: 'pantry', source: 'manual', createdAt: 1, updatedAt: 1 };
    const result = validateImportFile(JSON.stringify(validBackup({ inventory: [item] })));
    expect(result.canProceed).toBe(true);
    expect(result.issues.some((i) => i.code === 'unresolved_product_reference' && i.severity === 'warning')).toBe(true);
  });

  it('leaves an absent domain untouched rather than flagging it as missing', () => {
    const backup = validBackup();
    // simulate an older/partial export that never had manualGroceryItems at all
    delete backup.data.manualGroceryItems;
    const result = validateImportFile(JSON.stringify(backup));
    expect(result.canProceed).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { mergeImportData } from '@/services/backup/mergeImport';
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

function idGenerator(prefix = 'gen') {
  let counter = 0;
  return () => `${prefix}-${counter++}`;
}

const DEFAULT_OPTIONS = { profileChoice: 'keepCurrent' as const, excludeDemoData: false };

describe('mergeImportData — products', () => {
  it('merges by id: an imported product with the same id as an existing one is not duplicated', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const result = mergeImportData(emptyData({ products: [product] }), emptyData({ products: [product] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.products).toHaveLength(1);
  });

  it('merges by normalized name when ids differ: no duplicate product is created', () => {
    const imported = emptyData({ products: [{ id: 'imported-1', name: 'MILK', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    const current = emptyData({ products: [{ id: 'current-1', name: 'milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.products).toHaveLength(1);
    expect(result.data.products[0].id).toBe('current-1');
  });

  it('adds a genuinely new product untouched', () => {
    const imported = emptyData({ products: [{ id: 'new-1', name: 'Tofu', category: 'Protein', isFavorite: false, createdAt: 1 }] });
    const result = mergeImportData(imported, emptyData(), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.products).toHaveLength(1);
    expect(result.data.products[0].id).toBe('new-1');
  });
});

describe('mergeImportData — recipes', () => {
  const baseRecipe = { name: 'Oatmeal', mealType: ['breakfast' as const], categories: [], ingredients: [], effort: 'low' as const, time: 5, isFavorite: false, createdAt: 1 };

  it('an id conflict never overwrites the existing recipe — the import gets a fresh id instead', () => {
    const imported = emptyData({ recipes: [{ ...baseRecipe, id: 'r1', name: 'Imported Oatmeal' }] });
    const current = emptyData({ recipes: [{ ...baseRecipe, id: 'r1', name: 'My Oatmeal' }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.recipes).toHaveLength(2);
    expect(result.data.recipes.find((r) => r.id === 'r1')?.name).toBe('My Oatmeal');
    expect(result.data.recipes.some((r) => r.name === 'Imported Oatmeal' && r.id !== 'r1')).toBe(true);
    expect(result.issues.some((i) => i.code === 'recipe_id_remapped')).toBe(true);
  });

  it('remaps ingredientLines productId references through the product merge', () => {
    const importedProduct = { id: 'imported-milk', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const currentProduct = { id: 'current-milk', name: 'milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const recipe = { ...baseRecipe, id: 'r-new', ingredientLines: [{ name: 'Milk', productId: 'imported-milk', quantity: 200, unit: 'g' }] };
    const result = mergeImportData(emptyData({ products: [importedProduct], recipes: [recipe] }), emptyData({ products: [currentProduct] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.recipes[0].ingredientLines?.[0].productId).toBe('current-milk');
  });
});

describe('mergeImportData — inventory', () => {
  it('merges by product/location/unit identity, summing quantities rather than replacing', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const currentItem = { id: 'inv-current', productId: 'p1', quantity: 500, unit: 'g', stockStatus: 'inStock' as const, location: 'fridge' as const, source: 'manual' as const, createdAt: 1, updatedAt: 1 };
    const importedItem = { id: 'inv-imported', productId: 'p1', quantity: 300, unit: 'g', stockStatus: 'inStock' as const, location: 'fridge' as const, source: 'manual' as const, createdAt: 1, updatedAt: 1 };
    const result = mergeImportData(emptyData({ products: [product], inventory: [importedItem] }), emptyData({ products: [product], inventory: [currentItem] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.inventory).toHaveLength(1);
    expect(result.data.inventory[0].quantity).toBe(800);
    expect(result.data.inventory[0].id).toBe('inv-current');
  });

  it('never overwrites an existing known price/expiry with the import — only fills gaps', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const currentItem = { id: 'inv-current', productId: 'p1', unit: 'g', stockStatus: 'inStock' as const, location: 'fridge' as const, source: 'manual' as const, lastPurchasePriceCents: 150, createdAt: 1, updatedAt: 1 };
    const importedItem = { id: 'inv-imported', productId: 'p1', unit: 'g', stockStatus: 'inStock' as const, location: 'fridge' as const, source: 'manual' as const, lastPurchasePriceCents: 999, createdAt: 1, updatedAt: 1 };
    const result = mergeImportData(emptyData({ products: [product], inventory: [importedItem] }), emptyData({ products: [product], inventory: [currentItem] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.inventory[0].lastPurchasePriceCents).toBe(150);
  });

  it('adds a non-matching Stock item as a new entry', () => {
    const product = { id: 'p1', name: 'Milk', category: 'Dairy & Alternatives' as const, isFavorite: false, createdAt: 1 };
    const importedItem = { id: 'inv-imported', productId: 'p1', unit: 'g', stockStatus: 'inStock' as const, location: 'freezer' as const, source: 'manual' as const, createdAt: 1, updatedAt: 1 };
    const result = mergeImportData(emptyData({ products: [product], inventory: [importedItem] }), emptyData({ products: [product] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.inventory).toHaveLength(1);
  });
});

describe('mergeImportData — grocery manual items', () => {
  it('deduplicates by normalized display name + unit', () => {
    const current = emptyData({ manualGroceryItems: [{ id: 'g1', displayName: 'Bananas', normalizedName: 'bananas', unit: 'piece', source: 'manual', reasons: [], linkedRecipeIds: [], linkedMealPlanIds: [], checked: false, purchased: false, priority: 'normal', createdAt: 1, updatedAt: 1 }] });
    const imported = emptyData({ manualGroceryItems: [{ id: 'g2', displayName: 'bananas', normalizedName: 'bananas', unit: 'piece', source: 'manual', reasons: [], linkedRecipeIds: [], linkedMealPlanIds: [], checked: false, purchased: false, priority: 'normal', createdAt: 1, updatedAt: 1 }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.manualGroceryItems).toHaveLength(1);
  });

  it('keeps a genuinely different manual item (different unit)', () => {
    const current = emptyData({ manualGroceryItems: [{ id: 'g1', displayName: 'Bananas', normalizedName: 'bananas', unit: 'piece', source: 'manual', reasons: [], linkedRecipeIds: [], linkedMealPlanIds: [], checked: false, purchased: false, priority: 'normal', createdAt: 1, updatedAt: 1 }] });
    const imported = emptyData({ manualGroceryItems: [{ id: 'g2', displayName: 'Bananas', normalizedName: 'bananas', unit: 'kg', source: 'manual', reasons: [], linkedRecipeIds: [], linkedMealPlanIds: [], checked: false, purchased: false, priority: 'normal', createdAt: 1, updatedAt: 1 }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.manualGroceryItems).toHaveLength(2);
  });
});

describe('mergeImportData — meal plan', () => {
  it('a date/slot conflict with a different entry clears the imported entry\'s slot rather than displacing the existing one', () => {
    const current = emptyData({ mealPlan: [{ id: 'm-current', recipeId: 'r1', date: '2026-07-24', mealSlot: 'dinner', createdAt: 1 }] });
    const imported = emptyData({ mealPlan: [{ id: 'm-imported', recipeId: 'r2', date: '2026-07-24', mealSlot: 'dinner', createdAt: 1 }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.mealPlan).toHaveLength(2);
    const existing = result.data.mealPlan.find((m) => m.id === 'm-current');
    const added = result.data.mealPlan.find((m) => m.id !== 'm-current');
    expect(existing?.mealSlot).toBe('dinner');
    expect(added?.mealSlot).toBeUndefined();
    expect(result.issues.some((i) => i.code === 'meal_plan_slot_cleared')).toBe(true);
  });

  it('skips an imported meal that is already present by id', () => {
    const meal = { id: 'm1', recipeId: 'r1', date: '2026-07-24', mealSlot: 'dinner' as const, createdAt: 1 };
    const result = mergeImportData(emptyData({ mealPlan: [meal] }), emptyData({ mealPlan: [meal] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.mealPlan).toHaveLength(1);
  });
});

describe('mergeImportData — meal history', () => {
  it('deduplicates by stable id', () => {
    const entry = { id: 'h1', recipeId: 'r1', date: '2026-07-24', loggedAt: 1, servings: 1 };
    const result = mergeImportData(emptyData({ mealHistory: [entry] }), emptyData({ mealHistory: [entry] }), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.mealHistory).toHaveLength(1);
  });

  it('keeps legacy entries with no id at all rather than dropping them', () => {
    const legacyEntry = { recipeId: 'r1', date: '2026-07-24', loggedAt: 1, servings: 1 };
    const result = mergeImportData(emptyData({ mealHistory: [legacyEntry] }), emptyData(), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.mealHistory).toHaveLength(1);
  });
});

describe('mergeImportData — profile choice', () => {
  const currentProfile = { id: 'current', createdAt: 1, updatedAt: 1, nutritionTrackingEnabled: false };
  const importedProfile = { id: 'imported', createdAt: 1, updatedAt: 1, nutritionTrackingEnabled: true };

  it('keeps the current profile by default', () => {
    const result = mergeImportData(emptyData({ profile: importedProfile }), emptyData({ profile: currentProfile }), { profileChoice: 'keepCurrent', excludeDemoData: false }, idGenerator());
    expect(result.data.profile).toBe(currentProfile);
  });

  it('uses the imported profile only when explicitly chosen', () => {
    const result = mergeImportData(emptyData({ profile: importedProfile }), emptyData({ profile: currentProfile }), { profileChoice: 'useImported', excludeDemoData: false }, idGenerator());
    expect(result.data.profile).toBe(importedProfile);
  });
});

describe('mergeImportData — demo metadata safety', () => {
  const demoMeta = {
    demoDatasetVersion: 1,
    installedAt: '2026-07-24T12:00:00.000Z',
    entityIds: { productIds: ['demo-p1'], recipeIds: ['demo-r1'], inventoryItemIds: ['demo-i1'], mealPlanEntryIds: [], safeMealRecipeIds: [] },
  };

  it('adopts imported demo metadata when nothing it tracks was remapped or consolidated', () => {
    const imported = emptyData({
      products: [{ id: 'demo-p1', name: 'Demo Chicken', category: 'Protein', isFavorite: false, createdAt: 1 }],
      demoMetadata: demoMeta,
    });
    const result = mergeImportData(imported, emptyData(), DEFAULT_OPTIONS, idGenerator());
    expect(result.data.demoMetadata).toEqual(demoMeta);
  });

  it('drops imported demo metadata when a tracked product got consolidated into an existing one', () => {
    const imported = emptyData({
      products: [{ id: 'demo-p1', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }],
      demoMetadata: demoMeta,
    });
    const current = emptyData({ products: [{ id: 'real-milk', name: 'milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 1 }] });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.demoMetadata).toBeNull();
    expect(result.issues.some((i) => i.code === 'demo_metadata_dropped')).toBe(true);
  });

  it('never installs a second demo dataset when one is already installed', () => {
    const imported = emptyData({ demoMetadata: demoMeta });
    const current = emptyData({ demoMetadata: { ...demoMeta, entityIds: { ...demoMeta.entityIds, productIds: ['already-installed-demo-p1'] } } });
    const result = mergeImportData(imported, current, DEFAULT_OPTIONS, idGenerator());
    expect(result.data.demoMetadata).toBe(current.demoMetadata);
    expect(result.issues.some((i) => i.code === 'demo_metadata_kept_current')).toBe(true);
  });

  it('excludeDemoData prevents adopting imported demo metadata even when nothing conflicts', () => {
    const imported = emptyData({
      products: [{ id: 'demo-p1', name: 'Demo Chicken', category: 'Protein', isFavorite: false, createdAt: 1 }],
      demoMetadata: demoMeta,
    });
    const result = mergeImportData(imported, emptyData(), { profileChoice: 'keepCurrent', excludeDemoData: true }, idGenerator());
    expect(result.data.demoMetadata).toBeNull();
  });
});

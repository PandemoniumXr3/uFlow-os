import { describe, expect, it } from 'vitest';

import { buildDemoDataset } from '@/services/onboarding/buildDemoDataset';

const NOW = new Date('2026-07-23T10:00:00.000Z').getTime();

function idGenerator() {
  let counter = 0;
  return () => `id-${counter++}`;
}

describe('buildDemoDataset', () => {
  it('every product and recipe name is clearly labeled as demo data', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    for (const product of dataset.products) expect(product.name).toMatch(/\(Demo\)$/);
    for (const recipe of dataset.recipes) expect(recipe.name).toMatch(/\(Demo\)$/);
  });

  it('produces a complete nutrition estimate for every recipe', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    for (const recipe of dataset.recipes) {
      expect(recipe.nutrition?.completeness).toBe('complete');
      expect(recipe.nutrition?.source).toBe('estimated');
    }
  });

  it('every inventory item has a known purchase price, so Budget reads as complete', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    for (const item of dataset.inventoryItems) {
      expect(item.lastPurchasePriceCents).toBeGreaterThan(0);
    }
  });

  it('every recipe ingredient line resolves to a real demo product id', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    const productIds = new Set(dataset.products.map((p) => p.id));
    for (const recipe of dataset.recipes) {
      for (const line of recipe.ingredientLines ?? []) {
        expect(line.productId).toBeDefined();
        expect(productIds.has(line.productId!)).toBe(true);
      }
    }
  });

  it('includes at least one intentionally under-stocked ingredient relative to the planned meal', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    const plannedMeal = dataset.plannedMeals[0];
    const recipe = dataset.recipes.find((r) => r.id === plannedMeal.recipeId)!;
    const servingsMultiplier = plannedMeal.servings! / (recipe.servings ?? 1);

    const shortfalls = (recipe.ingredientLines ?? []).filter((line) => {
      const item = dataset.inventoryItems.find((i) => i.productId === line.productId);
      if (!item || line.quantity == null || item.quantity == null) return false;
      return item.quantity < line.quantity * servingsMultiplier;
    });
    expect(shortfalls.length).toBeGreaterThan(0);
  });

  it('includes at least one item with an expiration date set', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    expect(dataset.inventoryItems.some((item) => item.expirationDate != null)).toBe(true);
  });

  it('marks at least one recipe as safe/familiar', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    expect(dataset.safeMealRecipeIds.length).toBeGreaterThan(0);
    for (const id of dataset.safeMealRecipeIds) {
      expect(dataset.recipes.some((r) => r.id === id)).toBe(true);
    }
  });

  it('includes a planned meal for today referencing a real demo recipe', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    expect(dataset.plannedMeals.length).toBeGreaterThan(0);
    const recipeIds = new Set(dataset.recipes.map((r) => r.id));
    for (const meal of dataset.plannedMeals) {
      expect(meal.recipeId).toBeDefined();
      expect(recipeIds.has(meal.recipeId!)).toBe(true);
      expect(meal.date).toBe('2026-07-23');
    }
  });

  it('generates fresh, unique ids for every entity', () => {
    const dataset = buildDemoDataset(NOW, idGenerator());
    const allIds = [
      ...dataset.products.map((p) => p.id),
      ...dataset.recipes.map((r) => r.id),
      ...dataset.inventoryItems.map((i) => i.id),
      ...dataset.plannedMeals.map((m) => m.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

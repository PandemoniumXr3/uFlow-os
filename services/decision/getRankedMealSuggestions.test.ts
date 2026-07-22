import { describe, expect, it } from 'vitest';

import { getRankedMealSuggestions, type GetRankedMealSuggestionsInput } from '@/services/decision/getRankedMealSuggestions';
import type { DecisionContext } from '@/services/decision/types';
import type { DietProfile } from '@/types/diet';
import type { DismissalEntry } from '@/types/dismissal';
import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ToleranceProfile } from '@/types/tolerance';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Test Recipe',
    mealType: ['dinner'],
    categories: [],
    ingredients: [],
    effort: 'medium',
    time: 30,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p-1', name: 'Product', category: 'Pantry', isFavorite: false, createdAt: 0, ...overrides };
}

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    productId: 'p-1',
    stockStatus: 'inStock',
    location: 'pantry',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const NO_TOLERANCE: ToleranceProfile = { allergies: [], intolerances: [], safeMealsOnly: false };
const NO_DIET: DietProfile = { active: [], matchDietOnly: false };

function decisionContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return { date: '2026-07-20', budgetEnabled: false, ...overrides };
}

function baseInput(overrides: Partial<GetRankedMealSuggestionsInput> = {}): GetRankedMealSuggestionsInput {
  return {
    recipes: [],
    context: decisionContext(),
    products: [],
    inventoryItems: [],
    toleranceProfile: NO_TOLERANCE,
    dietProfile: NO_DIET,
    avoidedProductIds: new Set(),
    safeMealIds: new Set(),
    dismissals: [],
    plannedMeals: [],
    mealLogEntries: [],
    ...overrides,
  };
}

describe('getRankedMealSuggestions — hard exclusions never appear', () => {
  it('never returns a recipe containing an allergen, no matter how well it otherwise fits', () => {
    const safe = recipe({ id: 'r-safe', ingredients: ['Rice'], isFavorite: false });
    const unsafe = recipe({ id: 'r-unsafe', ingredients: ['Milk'], isFavorite: true }); // favorite, should still be excluded

    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [safe, unsafe],
        toleranceProfile: { allergies: ['dairy'], intolerances: [], safeMealsOnly: false },
      })
    );

    expect(result.suggestions.some((s) => s.recipeId === 'r-unsafe')).toBe(false);
  });

  it('never returns a recipe blocked by an unmet diet', () => {
    const vegan = recipe({ id: 'r-vegan', categories: ['vegan'] });
    const meat = recipe({ id: 'r-meat', categories: [] });
    const result = getRankedMealSuggestions(
      baseInput({ recipes: [vegan, meat], dietProfile: { active: ['vegan'], matchDietOnly: false } })
    );
    expect(result.suggestions.some((s) => s.recipeId === 'r-meat')).toBe(false);
  });

  it('never returns a permanently hidden recipe', () => {
    const hidden = recipe({ id: 'r-hidden' });
    const dismissals: DismissalEntry[] = [{ id: 'd-1', recipeId: 'r-hidden', scope: 'permanent', dismissedAt: 0 }];
    const result = getRankedMealSuggestions(baseInput({ recipes: [hidden], dismissals }));
    expect(result.suggestions).toHaveLength(0);
  });

  it('excludes a recipe dismissed for this exact date but allows it again the next day', () => {
    const meal = recipe({ id: 'r-1' });
    const dismissals: DismissalEntry[] = [{ id: 'd-1', recipeId: 'r-1', scope: 'day', date: '2026-07-20', dismissedAt: 0 }];
    const todayResult = getRankedMealSuggestions(baseInput({ recipes: [meal], dismissals, context: decisionContext({ date: '2026-07-20' }) }));
    const tomorrowResult = getRankedMealSuggestions(baseInput({ recipes: [meal], dismissals, context: decisionContext({ date: '2026-07-21' }) }));
    expect(todayResult.suggestions).toHaveLength(0);
    expect(tomorrowResult.suggestions.some((s) => s.recipeId === 'r-1')).toBe(true);
  });

  it('excludes a session-dismissed recipe via context.excludeRecipeIds', () => {
    const meal = recipe({ id: 'r-1' });
    const result = getRankedMealSuggestions(
      baseInput({ recipes: [meal], context: decisionContext({ excludeRecipeIds: ['r-1'] }) })
    );
    expect(result.suggestions).toHaveLength(0);
  });
});

describe('getRankedMealSuggestions — explicit context filters', () => {
  it('filters out recipes over the max prep time', () => {
    const quick = recipe({ id: 'r-quick', time: 8 });
    const slow = recipe({ id: 'r-slow', time: 40 });
    const result = getRankedMealSuggestions(baseInput({ recipes: [quick, slow], context: decisionContext({ maxPrepMinutes: 15 }) }));
    expect(result.suggestions.map((s) => s.recipeId)).toEqual(['r-quick']);
  });

  it('applies safe-meals-only as a filter', () => {
    const safe = recipe({ id: 'r-safe' });
    const other = recipe({ id: 'r-other' });
    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [safe, other],
        safeMealsOnly: true,
        safeMealIds: new Set(['r-safe']),
      })
    );
    expect(result.suggestions.map((s) => s.recipeId)).toEqual(['r-safe']);
  });

  it('no-extra-shopping keeps a zero-cost recipe and excludes a known-costly one, but never excludes unknown cost', () => {
    const freeProduct = product({ id: 'p-free', name: 'Free Thing' });
    const costlyProduct = product({ id: 'p-costly', name: 'Costly Thing' });
    const free = recipe({ id: 'r-free', ingredients: ['Free Thing'] });
    const costly = recipe({
      id: 'r-costly',
      ingredients: ['Costly Thing'],
      ingredientLines: [{ name: 'Costly Thing', quantity: 500, unit: 'g' }],
    });
    const unknownCost = recipe({ id: 'r-unknown', ingredients: ['Mystery'] });

    const inventory = [
      inventoryItem({ id: 'inv-free', productId: 'p-free', stockStatus: 'inStock' }),
      inventoryItem({
        id: 'inv-costly',
        productId: 'p-costly',
        stockStatus: 'empty',
        lastPurchasePriceCents: 2000,
        packageQuantity: 1,
        packageUnit: 'kg',
      }),
    ];

    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [free, costly, unknownCost],
        products: [freeProduct, costlyProduct],
        inventoryItems: inventory,
        context: decisionContext({ budgetEnabled: true, noExtraShopping: true }),
      })
    );

    const ids = result.suggestions.map((s) => s.recipeId);
    expect(ids).toContain('r-free');
    expect(ids).toContain('r-unknown');
    expect(ids).not.toContain('r-costly');
  });

  it('respects a max extra cost cap', () => {
    const cheapProduct = product({ id: 'p-cheap', name: 'Cheap Thing' });
    const expensiveProduct = product({ id: 'p-expensive', name: 'Expensive Thing' });
    const cheap = recipe({ id: 'r-cheap', ingredients: ['Cheap Thing'], ingredientLines: [{ name: 'Cheap Thing', quantity: 100, unit: 'g' }] });
    const expensive = recipe({
      id: 'r-expensive',
      ingredients: ['Expensive Thing'],
      ingredientLines: [{ name: 'Expensive Thing', quantity: 500, unit: 'g' }],
    });
    const inventory = [
      inventoryItem({ id: 'inv-cheap', productId: 'p-cheap', stockStatus: 'empty', lastPurchasePriceCents: 100, packageQuantity: 1, packageUnit: 'kg' }),
      inventoryItem({
        id: 'inv-expensive',
        productId: 'p-expensive',
        stockStatus: 'empty',
        lastPurchasePriceCents: 5000,
        packageQuantity: 1,
        packageUnit: 'kg',
      }),
    ];

    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [cheap, expensive],
        products: [cheapProduct, expensiveProduct],
        inventoryItems: inventory,
        context: decisionContext({ budgetEnabled: true, maxExtraCostCents: 500 }),
      })
    );

    expect(result.suggestions.map((s) => s.recipeId)).toEqual(['r-cheap']);
  });
});

describe('getRankedMealSuggestions — ranking', () => {
  it('ranks fuller Stock coverage higher when "use what I have" is active', () => {
    const stockedProduct = product({ id: 'p-stocked', name: 'Stocked Thing' });
    const inStock = recipe({ id: 'r-in-stock', ingredients: ['Stocked Thing'] });
    const missing = recipe({ id: 'r-missing', ingredients: ['Nowhere Thing'] });
    const inventory = [inventoryItem({ productId: 'p-stocked', stockStatus: 'inStock' })];

    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [missing, inStock],
        products: [stockedProduct],
        inventoryItems: inventory,
        context: decisionContext({ useStockFirst: true }),
      })
    );

    expect(result.suggestions[0].recipeId).toBe('r-in-stock');
  });

  it('ranks low-effort recipes higher under low energy', () => {
    const low = recipe({ id: 'r-low', effort: 'low' });
    const high = recipe({ id: 'r-high', effort: 'high' });
    const result = getRankedMealSuggestions(baseInput({ recipes: [low, high], context: decisionContext({ energy: 'low' }) }));
    expect(result.suggestions[0].recipeId).toBe('r-low');
  });

  it('gives an expiring-ingredient bonus and reports it in the reasons', () => {
    const p = product({ id: 'p-spinach', name: 'Spinach' });
    const withExpiring = recipe({ id: 'r-expiring', ingredients: ['Spinach'] });
    const without = recipe({ id: 'r-plain', ingredients: [] });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inventory = [inventoryItem({ productId: 'p-spinach', expirationDate: tomorrow.toISOString().slice(0, 10) })];

    const result = getRankedMealSuggestions(baseInput({ recipes: [withExpiring, without], products: [p], inventoryItems: inventory }));
    const suggestion = result.suggestions.find((s) => s.recipeId === 'r-expiring');
    expect(suggestion?.usesExpiringProductIds).toContain('p-spinach');
    expect(suggestion?.reasons.some((r) => r.type === 'expiringIngredient')).toBe(true);
    expect(result.suggestions[0].recipeId).toBe('r-expiring');
  });

  it('penalizes a recipe already eaten today', () => {
    const eaten = recipe({ id: 'r-eaten' });
    const notEaten = recipe({ id: 'r-fresh' });
    const mealLogEntries: MealLogEntry[] = [{ id: 'ml-1', recipeId: 'r-eaten', date: '2026-07-20', loggedAt: 0, servings: 1 }];
    const result = getRankedMealSuggestions(baseInput({ recipes: [eaten, notEaten], mealLogEntries }));
    expect(result.suggestions[0].recipeId).toBe('r-fresh');
  });

  it('gives a favorite bonus that never overrides a low-effort/energy explicit-context match', () => {
    const favoriteButEffortful = recipe({ id: 'r-fav', effort: 'high', isFavorite: true });
    const plainButLowEffort = recipe({ id: 'r-plain', effort: 'low', isFavorite: false });
    const result = getRankedMealSuggestions(baseInput({ recipes: [favoriteButEffortful, plainButLowEffort], context: decisionContext({ energy: 'very_low' }) }));
    expect(result.suggestions[0].recipeId).toBe('r-plain');
  });

  it('never shows cost fields or unavailable-cost confidence downgrades when Budget Mode is off', () => {
    const meal = recipe({ id: 'r-1' });
    const result = getRankedMealSuggestions(baseInput({ recipes: [meal], context: decisionContext({ budgetEnabled: false }) }));
    expect(result.suggestions[0].additionalPurchaseCost).toBeUndefined();
    expect(result.suggestions[0].totalRecipeCost).toBeUndefined();
    expect(result.suggestions[0].confidence).toBe('high');
  });
});

describe('getRankedMealSuggestions — diversity and no-result', () => {
  it('returns at most `limit` diverse suggestions, defaulting to three', () => {
    const recipes = Array.from({ length: 5 }, (_, i) => recipe({ id: `r-${i}`, categories: ['comfort'] }));
    const result = getRankedMealSuggestions(baseInput({ recipes }));
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('returns a structured no-result analysis instead of an empty array with no explanation, and offers a relaxation', () => {
    const slow = recipe({ id: 'r-slow', time: 40 });
    const result = getRankedMealSuggestions(baseInput({ recipes: [slow], context: decisionContext({ maxPrepMinutes: 10 }) }));
    expect(result.suggestions).toHaveLength(0);
    expect(result.noResult?.message).toContain('No meals match');
    expect(result.noResult?.relaxationOptions.some((o) => o.type === 'increaseTime')).toBe(true);
  });

  it('never offers relaxing a hard exclusion in the no-result analysis', () => {
    const onlyUnsafe = recipe({ id: 'r-unsafe', ingredients: ['Milk'] });
    const result = getRankedMealSuggestions(
      baseInput({
        recipes: [onlyUnsafe],
        toleranceProfile: { allergies: ['dairy'], intolerances: [], safeMealsOnly: false },
        context: decisionContext({ maxPrepMinutes: 5 }),
      })
    );
    // The allergy exclusion happens before Level 2 filtering even runs, so hardSafeCandidates is empty —
    // analyzeNoResults must report no relaxation options at all rather than inventing one.
    expect(result.noResult?.relaxationOptions).toEqual([]);
  });
});

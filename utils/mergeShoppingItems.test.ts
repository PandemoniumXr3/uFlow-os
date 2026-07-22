import { describe, expect, it } from 'vitest';

import { mergeShoppingItems, type ShoppingItemCandidate } from '@/utils/mergeShoppingItems';

function candidate(overrides: Partial<ShoppingItemCandidate>): ShoppingItemCandidate {
  return {
    displayName: 'Banana',
    normalizedName: 'banana',
    reasons: [],
    linkedRecipeIds: [],
    linkedMealPlanIds: [],
    ...overrides,
  };
}

describe('mergeShoppingItems', () => {
  it('merges two recipes both needing Banana into one item with both meals linked', () => {
    const merged = mergeShoppingItems([
      candidate({
        reasons: [{ type: 'missingForRecipe', label: 'Missing for Açaí Bowl', recipeId: 'r-acai' }],
        linkedRecipeIds: ['r-acai'],
        linkedMealPlanIds: ['pm-1'],
      }),
      candidate({
        reasons: [{ type: 'missingForRecipe', label: 'Missing for Mango Smoothie', recipeId: 'r-mango' }],
        linkedRecipeIds: ['r-mango'],
        linkedMealPlanIds: ['pm-2'],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].linkedRecipeIds.sort()).toEqual(['r-acai', 'r-mango']);
    expect(merged[0].reasons.map((r) => r.recipeId).sort()).toEqual(['r-acai', 'r-mango']);
  });

  it('keeps items with different normalized names separate', () => {
    const merged = mergeShoppingItems([
      candidate({ displayName: 'Banana', normalizedName: 'banana' }),
      candidate({ displayName: 'Almond Milk', normalizedName: 'almond milk' }),
    ]);
    expect(merged).toHaveLength(2);
  });

  it('produces multiple distinct reasons on one merged item', () => {
    const merged = mergeShoppingItems([
      candidate({ reasons: [{ type: 'todayMeal', label: 'Needed for today' }] }),
      candidate({ reasons: [{ type: 'lowStock', label: 'Low stock' }] }),
      candidate({ reasons: [{ type: 'alwaysInStock', label: 'Always keep in stock' }] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].reasons.map((r) => r.type).sort()).toEqual(['alwaysInStock', 'lowStock', 'todayMeal']);
  });

  it('does not duplicate an identical reason seen twice', () => {
    const merged = mergeShoppingItems([
      candidate({ reasons: [{ type: 'todayMeal', label: 'Needed for today' }] }),
      candidate({ reasons: [{ type: 'todayMeal', label: 'Needed for today' }] }),
    ]);
    expect(merged[0].reasons).toHaveLength(1);
  });

  it('fills in productId/quantity/unit from whichever candidate has them', () => {
    const merged = mergeShoppingItems([
      candidate({ productId: undefined, quantity: undefined }),
      candidate({ productId: 'p-banana', quantity: 2, unit: 'pcs' }),
    ]);
    expect(merged[0].productId).toBe('p-banana');
    expect(merged[0].quantity).toBe(2);
    expect(merged[0].unit).toBe('pcs');
  });
});

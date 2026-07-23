import { describe, expect, it } from 'vitest';

import { detectExistingUser, EMPTY_EXISTING_USER_SIGNALS, type ExistingUserSignals } from '@/utils/detectExistingUser';

function signals(overrides: Partial<ExistingUserSignals>): ExistingUserSignals {
  return { ...EMPTY_EXISTING_USER_SIGNALS, ...overrides };
}

describe('detectExistingUser', () => {
  it('a truly empty user (all signals zero/false) is not detected as existing', () => {
    expect(detectExistingUser(EMPTY_EXISTING_USER_SIGNALS)).toBe(false);
  });

  it('a Stock-only user is detected as existing', () => {
    expect(detectExistingUser(signals({ inventoryCount: 2 }))).toBe(true);
  });

  it('a Recipe-only user (recipes beyond the starter set) is detected as existing', () => {
    expect(detectExistingUser(signals({ recipeCountBeyondStarterSet: 1 }))).toBe(true);
  });

  it('a Meal Plan-only user is detected as existing', () => {
    expect(detectExistingUser(signals({ mealPlanCount: 1 }))).toBe(true);
  });

  it('a Grocery-only user (manual items) is detected as existing', () => {
    expect(detectExistingUser(signals({ groceryManualItemCount: 1 }))).toBe(true);
  });

  it('a Product-only user (products beyond the starter set) is detected as existing', () => {
    expect(detectExistingUser(signals({ productCountBeyondStarterSet: 1 }))).toBe(true);
  });

  it('a tolerance-only user (customized allergies/intolerances) is detected as existing', () => {
    expect(detectExistingUser(signals({ toleranceCustomized: true }))).toBe(true);
  });

  it('an ingredient-preferences-only user (dislike/avoid tiers set) is detected as existing', () => {
    expect(detectExistingUser(signals({ ingredientPreferencesCustomized: true }))).toBe(true);
  });
});

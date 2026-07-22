import { describe, expect, it } from 'vitest';

import { buildSuggestionReasons, buildSuggestionWarnings, type SuggestionExplanationInput } from '@/services/decision/buildSuggestionReasons';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Test Recipe',
    mealType: ['dinner'],
    categories: [],
    ingredients: ['a', 'b'],
    effort: 'medium',
    time: 30,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

function availability(overrides: Partial<RecipeAvailability> = {}): RecipeAvailability {
  return { available: ['a', 'b'], low: [], missing: [], total: 2, percentAvailable: 100, ...overrides };
}

function baseInput(overrides: Partial<SuggestionExplanationInput> = {}): SuggestionExplanationInput {
  return {
    recipe: recipe(),
    context: { date: '2026-07-20', budgetEnabled: false },
    availability: availability(),
    usesExpiringProductNames: [],
    familiarity: 'new',
    behavioral: { chosenCount: 0, eatenCount: 0, rejectedCount: 0, recentlyDismissed: false },
    ...overrides,
  };
}

describe('buildSuggestionReasons', () => {
  it('never returns more than three reasons', () => {
    const reasons = buildSuggestionReasons(
      baseInput({
        recipe: recipe({ time: 5, effort: 'low' }),
        context: { date: '2026-07-20', budgetEnabled: false, energy: 'low', mealSlot: 'dinner' },
        usesExpiringProductNames: ['spinach'],
        familiarity: 'safe',
        behavioral: { chosenCount: 5, eatenCount: 5, commonMealSlot: 'dinner', rejectedCount: 0, recentlyDismissed: false },
      })
    );
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it('leads with "you already have everything" when fully in Stock', () => {
    const reasons = buildSuggestionReasons(baseInput());
    expect(reasons[0]).toMatchObject({ type: 'fullyInStock' });
  });

  it('mentions the expiring ingredient by name', () => {
    const reasons = buildSuggestionReasons(baseInput({ usesExpiringProductNames: ['mushrooms'] }));
    expect(reasons.some((reason) => reason.label.includes('mushrooms'))).toBe(true);
  });

  it('shows a formatted low-cost reason, never a raw number', () => {
    const reasons = buildSuggestionReasons(
      baseInput({
        availability: availability({ missing: ['b'], percentAvailable: 50 }),
        extraCost: {
          knownCostCents: 140,
          coverageRatio: 1,
          missingPriceProductIds: [],
          incompatibleUnitProductIds: [],
          status: 'complete',
          extraCostCents: 140,
          missingIngredientCount: 1,
        },
      })
    );
    expect(reasons.some((reason) => reason.type === 'lowExtraCost' && /\d/.test(reason.label))).toBe(true);
  });

  it('never shows a cost reason when no cost estimate was supplied at all', () => {
    const reasons = buildSuggestionReasons(baseInput({ extraCost: undefined }));
    expect(reasons.some((reason) => reason.type === 'lowExtraCost' || reason.type === 'noExtraShopping')).toBe(false);
  });
});

describe('buildSuggestionWarnings', () => {
  it('flags a low-stock ingredient', () => {
    const warnings = buildSuggestionWarnings(baseInput({ availability: availability({ low: ['a'] }) }));
    expect(warnings.some((w) => w.type === 'lowStockIngredient')).toBe(true);
  });

  it('never shows cost warnings when Budget Mode is off', () => {
    const warnings = buildSuggestionWarnings(
      baseInput({
        context: { date: '2026-07-20', budgetEnabled: false },
        extraCost: {
          knownCostCents: 0,
          coverageRatio: 0,
          missingPriceProductIds: [],
          incompatibleUnitProductIds: [],
          status: 'unavailable',
          extraCostCents: 0,
          missingIngredientCount: 1,
        },
      })
    );
    expect(warnings.some((w) => w.type === 'costUnavailable')).toBe(false);
  });

  it('flags missing prices as a warning, not a reason, when Budget Mode is on', () => {
    const warnings = buildSuggestionWarnings(
      baseInput({
        context: { date: '2026-07-20', budgetEnabled: true },
        extraCost: {
          knownCostCents: 100,
          coverageRatio: 0.5,
          missingPriceProductIds: ['p-1'],
          incompatibleUnitProductIds: [],
          status: 'partial',
          extraCostCents: 100,
          missingIngredientCount: 2,
        },
      })
    );
    expect(warnings.some((w) => w.type === 'missingPrices')).toBe(true);
  });
});

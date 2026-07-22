import { describe, expect, it } from 'vitest';

import type { BehavioralSignals } from '@/services/decision/behavioralSignals';
import { classifyFamiliarity, scoreRecipe, type ScoreRecipeInput } from '@/services/decision/scoreRecipe';
import type { DecisionContext } from '@/services/decision/types';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';

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

function availability(overrides: Partial<RecipeAvailability> = {}): RecipeAvailability {
  return { available: [], low: [], missing: [], total: 0, percentAvailable: 0, ...overrides };
}

function behavioral(overrides: Partial<BehavioralSignals> = {}): BehavioralSignals {
  return { chosenCount: 0, eatenCount: 0, rejectedCount: 0, recentlyDismissed: false, ...overrides };
}

function context(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return { date: '2026-07-20', budgetEnabled: false, ...overrides };
}

function input(overrides: Partial<ScoreRecipeInput> = {}): ScoreRecipeInput {
  return {
    recipe: recipe(),
    context: context(),
    availability: availability(),
    usesExpiringProductIds: [],
    isSafeMeal: false,
    isFavorite: false,
    behavioral: behavioral(),
    eatenTodayAlready: false,
    duplicatePlannedToday: false,
    ...overrides,
  };
}

describe('classifyFamiliarity', () => {
  it('is safe when the recipe is marked safe, regardless of history', () => {
    expect(classifyFamiliarity(true, behavioral())).toBe('safe');
  });
  it('is familiar when chosen or eaten before', () => {
    expect(classifyFamiliarity(false, behavioral({ chosenCount: 1 }))).toBe('familiar');
    expect(classifyFamiliarity(false, behavioral({ eatenCount: 1 }))).toBe('familiar');
  });
  it('is new with no history and not safe', () => {
    expect(classifyFamiliarity(false, behavioral())).toBe('new');
  });
});

describe('scoreRecipe — hierarchy', () => {
  it('explicit current context outweighs any stack of personal-relevance bonuses', () => {
    // Recipe A: no explicit-context match (mealType deliberately excludes the active slot), but every
    // level-4 bonus stacked as high as realistically possible.
    const recipeA = scoreRecipe(
      input({
        recipe: recipe({ mealType: ['lunch'] }),
        isFavorite: true,
        isSafeMeal: true,
        behavioral: behavioral({ chosenCount: 20, eatenCount: 20, commonMealSlot: 'dinner' }),
        context: context({ mealSlot: 'dinner' }), // still lets usualMealSlotBonus (level 4) apply to A
      })
    );
    // Recipe B: one explicit-context match (meal slot), zero personal-relevance bonuses.
    const recipeB = scoreRecipe(
      input({
        recipe: recipe({ id: 'r-2', mealType: ['breakfast'] }),
        context: context({ mealSlot: 'breakfast' }),
      })
    );
    expect(recipeB).toBeGreaterThan(recipeA);
  });

  it('ranks fuller Stock coverage higher when nothing else differs', () => {
    const full = scoreRecipe(input({ availability: availability({ percentAvailable: 100, total: 2, available: ['a', 'b'] }) }));
    const partial = scoreRecipe(input({ availability: availability({ percentAvailable: 50, total: 2, missing: ['b'] }) }));
    expect(full).toBeGreaterThan(partial);
  });

  it('rewards low energy + low effort match', () => {
    const matched = scoreRecipe(input({ recipe: recipe({ effort: 'low' }), context: context({ energy: 'low' }) }));
    const unmatched = scoreRecipe(input({ recipe: recipe({ effort: 'low' }), context: context({ energy: 'high' }) }));
    expect(matched).toBeGreaterThan(unmatched);
  });

  it('gives an expiring-ingredient bonus', () => {
    const withExpiring = scoreRecipe(input({ usesExpiringProductIds: ['p-1'] }));
    const without = scoreRecipe(input());
    expect(withExpiring).toBeGreaterThan(without);
  });

  it('penalizes a known additional purchase cost', () => {
    const free = scoreRecipe(input({ extraCostCents: 0 }));
    const costly = scoreRecipe(input({ extraCostCents: 1000 }));
    expect(free).toBeGreaterThan(costly);
  });

  it('penalizes a meal already eaten today more than one merely planned earlier', () => {
    const eaten = scoreRecipe(input({ eatenTodayAlready: true }));
    const notEaten = scoreRecipe(input());
    expect(notEaten).toBeGreaterThan(eaten);
  });

  it('gives a small favorite bonus that never approaches a level-2 magnitude on its own', () => {
    const favorite = scoreRecipe(input({ isFavorite: true }));
    const notFavorite = scoreRecipe(input());
    const delta = favorite - notFavorite;
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(50);
  });
});

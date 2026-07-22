import { describe, expect, it } from 'vitest';

import { evaluateHardConstraints, type HardConstraintInput } from '@/services/decision/evaluateHardConstraints';
import type { DietProfile } from '@/types/diet';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ToleranceProfile } from '@/types/tolerance';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Test Recipe',
    mealType: ['lunch'],
    categories: [],
    ingredients: [],
    effort: 'low',
    time: 10,
    isFavorite: false,
    createdAt: 0,
    ...overrides,
  };
}

const NO_TOLERANCE: ToleranceProfile = { allergies: [], intolerances: [], safeMealsOnly: false };
const NO_DIET: DietProfile = { active: [], matchDietOnly: false };

function baseInput(overrides: Partial<HardConstraintInput> = {}): HardConstraintInput {
  return {
    toleranceProfile: NO_TOLERANCE,
    dietProfile: NO_DIET,
    avoidedProductIds: new Set(),
    permanentlyHiddenRecipeIds: new Set(),
    products: [],
    ...overrides,
  };
}

describe('evaluateHardConstraints', () => {
  it('passes a recipe with nothing flagged', () => {
    const result = evaluateHardConstraints(recipe(), baseInput());
    expect(result.passed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('excludes for an allergy with a clear labeled reason', () => {
    const result = evaluateHardConstraints(
      recipe({ ingredients: ['Milk'] }),
      baseInput({ toleranceProfile: { allergies: ['dairy'], intolerances: [], safeMealsOnly: false } })
    );
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatchObject({ type: 'allergy' });
  });

  it('excludes for a blocked intolerance, distinct from an allergy', () => {
    const result = evaluateHardConstraints(
      recipe({ ingredients: ['Honey'] }),
      baseInput({ toleranceProfile: { allergies: [], intolerances: ['fructose'], safeMealsOnly: false } })
    );
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatchObject({ type: 'intolerance' });
  });

  it('excludes for an unmet diet', () => {
    const result = evaluateHardConstraints(
      recipe({ categories: [] }),
      baseInput({ dietProfile: { active: ['vegan'], matchDietOnly: false } })
    );
    // matchDietOnly is not read by evaluateHardConstraints — diet exclusion is always active at this level,
    // consistent with the existing suggestMeals.ts hard filter behavior.
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatchObject({ type: 'diet' });
  });

  it('excludes an ingredient tagged avoid, using a reliable product match', () => {
    const product: Product = { id: 'p-mushroom', name: 'Mushroom', category: 'Vegetables', isFavorite: false, createdAt: 0 };
    const result = evaluateHardConstraints(
      recipe({ ingredients: ['Mushroom'] }),
      baseInput({ products: [product], avoidedProductIds: new Set(['p-mushroom']) })
    );
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatchObject({ type: 'avoidedIngredient' });
  });

  it('excludes a permanently hidden recipe regardless of any other data', () => {
    const result = evaluateHardConstraints(recipe({ id: 'r-hidden' }), baseInput({ permanentlyHiddenRecipeIds: new Set(['r-hidden']) }));
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatchObject({ type: 'permanentlyHidden' });
  });

  it('reports every applicable reason, not just the first', () => {
    const product: Product = { id: 'p-milk', name: 'Milk', category: 'Dairy & Alternatives', isFavorite: false, createdAt: 0 };
    const result = evaluateHardConstraints(
      recipe({ ingredients: ['Milk'], categories: [] }),
      baseInput({
        toleranceProfile: { allergies: ['dairy'], intolerances: [], safeMealsOnly: false },
        dietProfile: { active: ['vegan'], matchDietOnly: false },
        products: [product],
        avoidedProductIds: new Set(['p-milk']),
      })
    );
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

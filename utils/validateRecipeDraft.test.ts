import { describe, expect, it } from 'vitest';

import { validateRecipeDraft } from '@/utils/validateRecipeDraft';

describe('validateRecipeDraft', () => {
  it('accepts a minimal valid recipe', () => {
    const result = validateRecipeDraft({ name: 'Toast', mealType: ['breakfast'], time: '5', ingredientLines: [{ name: 'Bread' }] });
    expect(result.canSubmit).toBe(true);
  });

  it('rejects a recipe with no name', () => {
    const result = validateRecipeDraft({ name: '  ', mealType: ['breakfast'], time: '5', ingredientLines: [{ name: 'Bread' }] });
    expect(result.canSubmit).toBe(false);
  });

  it('rejects a recipe with no meal type', () => {
    const result = validateRecipeDraft({ name: 'Toast', mealType: [], time: '5', ingredientLines: [{ name: 'Bread' }] });
    expect(result.canSubmit).toBe(false);
  });

  it('rejects a recipe with no time', () => {
    const result = validateRecipeDraft({ name: 'Toast', mealType: ['breakfast'], time: '', ingredientLines: [{ name: 'Bread' }] });
    expect(result.canSubmit).toBe(false);
  });

  it('rejects a recipe with no valid ingredient (only blank names)', () => {
    const result = validateRecipeDraft({ name: 'Toast', mealType: ['breakfast'], time: '5', ingredientLines: [{ name: '  ' }] });
    expect(result.canSubmit).toBe(false);
    expect(result.hasValidIngredient).toBe(false);
  });

  it('rejects a non-positive ingredient quantity', () => {
    const result = validateRecipeDraft({
      name: 'Toast',
      mealType: ['breakfast'],
      time: '5',
      ingredientLines: [{ name: 'Bread', quantity: 0 }],
    });
    expect(result.canSubmit).toBe(false);
    expect(result.hasInvalidQuantity).toBe(true);
  });

  it('accepts a structured ingredient with a product link', () => {
    const result = validateRecipeDraft({
      name: 'Toast',
      mealType: ['breakfast'],
      time: '5',
      ingredientLines: [{ name: 'Bread', quantity: 2, unit: 'piece', productId: 'p1' }],
    });
    expect(result.canSubmit).toBe(true);
  });

  it('ignores blank ingredient rows alongside a valid one', () => {
    const result = validateRecipeDraft({
      name: 'Toast',
      mealType: ['breakfast'],
      time: '5',
      ingredientLines: [{ name: '' }, { name: 'Bread' }],
    });
    expect(result.canSubmit).toBe(true);
  });
});

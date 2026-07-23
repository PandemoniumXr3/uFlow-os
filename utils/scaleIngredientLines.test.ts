import { describe, expect, it } from 'vitest';

import { scaleIngredientLines } from '@/utils/scaleIngredientLines';

describe('scaleIngredientLines', () => {
  it('scales quantities proportionally to the target servings', () => {
    const lines = [{ name: 'Banana', quantity: 2, unit: 'piece' }];
    const result = scaleIngredientLines(lines, 2, 4);
    expect(result[0].quantity).toBe(4);
  });

  it('leaves quantity-less lines untouched', () => {
    const lines = [{ name: 'Salt' }];
    const result = scaleIngredientLines(lines, 2, 4);
    expect(result[0].quantity).toBeUndefined();
  });

  it('falls back to a 1:1 ratio when the base servings is zero or negative', () => {
    const lines = [{ name: 'Banana', quantity: 2, unit: 'piece' }];
    expect(scaleIngredientLines(lines, 0, 4)[0].quantity).toBe(2);
    expect(scaleIngredientLines(lines, -1, 4)[0].quantity).toBe(2);
  });

  it('preserves every other field on the line', () => {
    const lines = [{ id: 'l1', name: 'Banana', quantity: 2, unit: 'piece', productId: 'p1', optional: true, notes: 'ripe' }];
    const result = scaleIngredientLines(lines, 1, 2);
    expect(result[0]).toMatchObject({ id: 'l1', name: 'Banana', unit: 'piece', productId: 'p1', optional: true, notes: 'ripe' });
  });

  it('does not mutate the input array', () => {
    const lines = [{ name: 'Banana', quantity: 2, unit: 'piece' }];
    scaleIngredientLines(lines, 1, 2);
    expect(lines[0].quantity).toBe(2);
  });
});

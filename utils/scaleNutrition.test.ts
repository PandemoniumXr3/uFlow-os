import { describe, expect, it } from 'vitest';

import { scaleNutrition } from '@/utils/scaleNutrition';

describe('scaleNutrition', () => {
  it('multiplies every present field by the factor', () => {
    const scaled = scaleNutrition(
      { kcal: 260, proteinGrams: 7, carbohydrateGrams: 47, source: 'estimated', completeness: 'partial' },
      2
    );
    expect(scaled.kcal).toBe(520);
    expect(scaled.proteinGrams).toBe(14);
    expect(scaled.carbohydrateGrams).toBe(94);
  });

  it('leaves absent fields absent rather than producing 0', () => {
    const scaled = scaleNutrition({ kcal: 260, source: 'estimated', completeness: 'partial' }, 3);
    expect(scaled.fiberGrams).toBeUndefined();
    expect(scaled.sodiumMilligrams).toBeUndefined();
  });

  it('passes source, completeness, and servingSize through unchanged', () => {
    const scaled = scaleNutrition(
      { kcal: 100, source: 'verified', completeness: 'complete', servingSize: '1 bowl' },
      1.5
    );
    expect(scaled.source).toBe('verified');
    expect(scaled.completeness).toBe('complete');
    expect(scaled.servingSize).toBe('1 bowl');
  });

  it('scales correctly for fractional servings', () => {
    const scaled = scaleNutrition({ kcal: 200, source: 'estimated', completeness: 'partial' }, 0.5);
    expect(scaled.kcal).toBe(100);
  });
});

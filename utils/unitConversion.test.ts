import { describe, expect, it } from 'vitest';

import { areUnitsCompatible, convertFromBaseUnit, convertToBaseUnit } from '@/utils/unitConversion';

describe('convertToBaseUnit', () => {
  it('converts kilograms to the grams base unit', () => {
    expect(convertToBaseUnit(1.5, 'kg')).toEqual({ baseUnit: 'g', baseQuantity: 1500 });
  });

  it('keeps grams as-is', () => {
    expect(convertToBaseUnit(250, 'g')).toEqual({ baseUnit: 'g', baseQuantity: 250 });
  });

  it('converts litres to the millilitres base unit', () => {
    expect(convertToBaseUnit(1, 'l')).toEqual({ baseUnit: 'ml', baseQuantity: 1000 });
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(convertToBaseUnit(2, ' KG ')).toEqual({ baseUnit: 'g', baseQuantity: 2000 });
  });

  it('treats piece/pcs/stuk as the same count base unit', () => {
    expect(convertToBaseUnit(3, 'pcs')).toEqual({ baseUnit: 'piece', baseQuantity: 3 });
    expect(convertToBaseUnit(3, 'stuk')).toEqual({ baseUnit: 'piece', baseQuantity: 3 });
  });

  it('returns null for an unknown/incompatible unit like tablespoon, never a guess', () => {
    expect(convertToBaseUnit(2, 'tbsp')).toBeNull();
  });

  it('returns null for a negative quantity', () => {
    expect(convertToBaseUnit(-1, 'g')).toBeNull();
  });
});

describe('convertFromBaseUnit', () => {
  it('converts grams back to kilograms', () => {
    expect(convertFromBaseUnit(1500, 'kg')).toBe(1.5);
  });

  it('round-trips through convertToBaseUnit and back to the original amount', () => {
    const base = convertToBaseUnit(2.5, 'kg');
    expect(convertFromBaseUnit(base!.baseQuantity, 'kg')).toBeCloseTo(2.5, 10);
  });

  it('returns null for an unknown unit', () => {
    expect(convertFromBaseUnit(100, 'tbsp')).toBeNull();
  });
});

describe('areUnitsCompatible', () => {
  it('is true for two mass units', () => {
    expect(areUnitsCompatible('g', 'kg')).toBe(true);
  });

  it('is true for two volume units', () => {
    expect(areUnitsCompatible('ml', 'l')).toBe(true);
  });

  it('is false across dimensions', () => {
    expect(areUnitsCompatible('g', 'ml')).toBe(false);
  });

  it('is false when either unit is unknown', () => {
    expect(areUnitsCompatible('g', 'tbsp')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { findDuplicateIngredientNames } from '@/utils/findDuplicateIngredientLines';

describe('findDuplicateIngredientNames', () => {
  it('flags a name that appears twice', () => {
    const duplicates = findDuplicateIngredientNames([{ name: 'Banana' }, { name: 'banana' }, { name: 'Oats' }]);
    expect(duplicates.has('banana')).toBe(true);
    expect(duplicates.has('oats')).toBe(false);
  });

  it('returns an empty set when nothing repeats', () => {
    const duplicates = findDuplicateIngredientNames([{ name: 'Banana' }, { name: 'Oats' }]);
    expect(duplicates.size).toBe(0);
  });

  it('ignores blank names', () => {
    const duplicates = findDuplicateIngredientNames([{ name: '' }, { name: '' }]);
    expect(duplicates.size).toBe(0);
  });
});

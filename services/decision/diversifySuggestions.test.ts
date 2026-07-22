import { describe, expect, it } from 'vitest';

import { diversifySuggestions, type DiversityCandidate } from '@/services/decision/diversifySuggestions';

describe('diversifySuggestions', () => {
  it('avoids returning three recipes with the same primary category when a diverse alternative exists', () => {
    const ranked: DiversityCandidate[] = [
      { recipeId: 'smoothie-1', score: 100, primaryCategory: 'drink' },
      { recipeId: 'smoothie-2', score: 90, primaryCategory: 'drink' },
      { recipeId: 'oatmeal', score: 80, primaryCategory: 'breakfast' },
      { recipeId: 'smoothie-3', score: 70, primaryCategory: 'drink' },
    ];
    const result = diversifySuggestions(ranked, 3);
    expect(result).toEqual(['smoothie-1', 'oatmeal', 'smoothie-2']);
  });

  it('never drops below the requested count just for variety, even with zero diverse options', () => {
    const ranked: DiversityCandidate[] = [
      { recipeId: 'a', score: 100, primaryCategory: 'drink' },
      { recipeId: 'b', score: 90, primaryCategory: 'drink' },
      { recipeId: 'c', score: 80, primaryCategory: 'drink' },
    ];
    const result = diversifySuggestions(ranked, 3);
    expect(result).toHaveLength(3);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('treats recipes with no primary category as never colliding with each other', () => {
    const ranked: DiversityCandidate[] = [
      { recipeId: 'a', score: 100 },
      { recipeId: 'b', score: 90 },
    ];
    expect(diversifySuggestions(ranked, 2)).toEqual(['a', 'b']);
  });

  it('returns fewer than the limit when fewer candidates exist, without erroring', () => {
    const ranked: DiversityCandidate[] = [{ recipeId: 'a', score: 100, primaryCategory: 'drink' }];
    expect(diversifySuggestions(ranked, 3)).toEqual(['a']);
  });
});

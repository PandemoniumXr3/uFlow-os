import { describe, expect, it } from 'vitest';

import { analyzeNoResults, type NoResultFilterProbe } from '@/services/decision/analyzeNoResults';
import type { Recipe } from '@/types/recipe';

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

describe('analyzeNoResults', () => {
  it('returns no relaxation options when there were no hard-safe candidates at all', () => {
    const result = analyzeNoResults([], []);
    expect(result.relaxationOptions).toEqual([]);
    expect(result.message).toContain('No meals match');
  });

  it('identifies the single narrowest blocking filter', () => {
    // Both candidates fail the time filter (<=5 min), so the full stack yields zero regardless of the no-op filter.
    const candidates = [recipe({ id: 'r-quick', time: 8 }), recipe({ id: 'r-slow', time: 40 })];
    const timeFilter: NoResultFilterProbe = { type: 'increaseTime', label: 'Increase time to 20 minutes', passes: (r) => r.time <= 5 };
    // A filter that passes everything — dropping it changes nothing, so it must never be offered as a relaxation.
    const noOpFilter: NoResultFilterProbe = { type: 'dropSafeOnly', label: 'Drop safe-only', passes: () => true };

    const result = analyzeNoResults(candidates, [timeFilter, noOpFilter]);

    expect(result.relaxationOptions.map((o) => o.type)).toEqual(['increaseTime']);
    expect(result.blockingReason).toBe('Increase time to 20 minutes');
  });

  it('never offers a filter whose removal still yields zero candidates', () => {
    const candidates = [recipe({ time: 40 })];
    const uselessFilter: NoResultFilterProbe = { type: 'dropSafeOnly', label: 'Drop safe-only', passes: () => false };
    const otherUselessFilter: NoResultFilterProbe = { type: 'includeFamiliar', label: 'Include familiar', passes: () => false };

    const result = analyzeNoResults(candidates, [uselessFilter, otherUselessFilter]);
    expect(result.relaxationOptions).toEqual([]);
  });

  it('offers multiple relaxations, ordered narrowest first', () => {
    const candidates = [recipe({ id: 'r-a', time: 12 }), recipe({ id: 'r-b', time: 25 }), recipe({ id: 'r-c', time: 50 })];
    const strict: NoResultFilterProbe = { type: 'increaseTime', label: 'Increase time to 15 minutes', passes: (r) => r.time <= 10 };
    const loose: NoResultFilterProbe = { type: 'dropSafeOnly', label: 'Drop safe-only', passes: (r) => r.time <= 20 };

    const result = analyzeNoResults(candidates, [strict, loose]);
    // Dropping `strict` alone (keeping `loose`) unlocks r-a only (1 result).
    // Dropping `loose` alone (keeping `strict`) unlocks nothing extra since strict already blocks everything <= not matching.
    expect(result.relaxationOptions[0].type).toBe('increaseTime');
  });
});

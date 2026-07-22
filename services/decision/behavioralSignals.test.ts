import { describe, expect, it } from 'vitest';

import { computeBehavioralSignals } from '@/services/decision/behavioralSignals';
import type { DismissalEntry } from '@/types/dismissal';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';

function plannedMeal(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'pm-1', date: '2026-07-18', recipeId: 'r-1', createdAt: 0, ...overrides };
}

function logEntry(overrides: Partial<MealLogEntry> = {}): MealLogEntry {
  return { id: 'ml-1', recipeId: 'r-1', date: '2026-07-18', loggedAt: 0, servings: 1, ...overrides };
}

function dismissal(overrides: Partial<DismissalEntry> = {}): DismissalEntry {
  return { id: 'd-1', recipeId: 'r-1', scope: 'day', date: '2026-07-18', dismissedAt: 0, ...overrides };
}

describe('computeBehavioralSignals', () => {
  it('returns all-zero/undefined signals for a recipe with no history at all', () => {
    const signals = computeBehavioralSignals('r-1', [], [], []);
    expect(signals).toMatchObject({ chosenCount: 0, eatenCount: 0, rejectedCount: 0, recentlyDismissed: false });
    expect(signals.lastChosenDate).toBeUndefined();
    expect(signals.lastEatenDate).toBeUndefined();
  });

  it('counts only entries for the given recipe id', () => {
    const signals = computeBehavioralSignals(
      'r-1',
      [plannedMeal({ recipeId: 'r-1' }), plannedMeal({ recipeId: 'r-2' })],
      [logEntry({ recipeId: 'r-1' }), logEntry({ recipeId: 'r-2' })],
      []
    );
    expect(signals.chosenCount).toBe(1);
    expect(signals.eatenCount).toBe(1);
  });

  it('reports the most recent chosen/eaten date, not just any date', () => {
    const signals = computeBehavioralSignals(
      'r-1',
      [plannedMeal({ date: '2026-07-10' }), plannedMeal({ date: '2026-07-18' })],
      [logEntry({ date: '2026-07-05' })],
      []
    );
    expect(signals.lastChosenDate).toBe('2026-07-18');
    expect(signals.lastEatenDate).toBe('2026-07-05');
  });

  it('picks the most common meal slot across logged and planned entries', () => {
    const signals = computeBehavioralSignals(
      'r-1',
      [plannedMeal({ mealSlot: 'lunch' })],
      [logEntry({ mealSlot: 'dinner' }), logEntry({ mealSlot: 'dinner', id: 'ml-2' })],
      []
    );
    expect(signals.commonMealSlot).toBe('dinner');
  });

  it('counts every dismissal for the recipe as rejectedCount', () => {
    const signals = computeBehavioralSignals('r-1', [], [], [dismissal(), dismissal({ id: 'd-2', scope: 'permanent', date: undefined })]);
    expect(signals.rejectedCount).toBe(2);
  });

  it('flags recentlyDismissed only within the recency window', () => {
    const now = 10 * 24 * 60 * 60 * 1000; // arbitrary reference "now"
    const recent = computeBehavioralSignals('r-1', [], [], [dismissal({ dismissedAt: now - 1 * 24 * 60 * 60 * 1000 })], now);
    const stale = computeBehavioralSignals('r-1', [], [], [dismissal({ dismissedAt: now - 10 * 24 * 60 * 60 * 1000 })], now);
    expect(recent.recentlyDismissed).toBe(true);
    expect(stale.recentlyDismissed).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import { getMealStatus } from '@/utils/getMealStatus';

function planned(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return { id: 'pm-1', recipeId: 'r-oatmeal', date: '2026-07-15', createdAt: 0, ...overrides };
}

function logged(overrides: Partial<MealLogEntry> = {}): MealLogEntry {
  return { date: '2026-07-15', loggedAt: 0, servings: 1, ...overrides };
}

describe('getMealStatus', () => {
  it('is planned when no log entry exists and not skipped', () => {
    expect(getMealStatus(planned(), [])).toBe('planned');
  });

  it('is eaten when a log entry links back via plannedMealId', () => {
    const entries = [logged({ plannedMealId: 'pm-1' })];
    expect(getMealStatus(planned(), entries)).toBe('eaten');
  });

  it('falls back to date+recipeId match for legacy entries with no plannedMealId', () => {
    const entries = [logged({ recipeId: 'r-oatmeal' })];
    expect(getMealStatus(planned(), entries)).toBe('eaten');
  });

  it('is skipped when isSkipped is true and nothing was logged', () => {
    expect(getMealStatus(planned({ isSkipped: true }), [])).toBe('skipped');
  });

  it('eaten wins over a stale isSkipped flag', () => {
    const entries = [logged({ plannedMealId: 'pm-1' })];
    expect(getMealStatus(planned({ isSkipped: true }), entries)).toBe('eaten');
  });

  it('does not match a log entry for a different planned meal on the same day', () => {
    const entries = [logged({ plannedMealId: 'pm-2', recipeId: 'r-other' })];
    expect(getMealStatus(planned(), entries)).toBe('planned');
  });
});

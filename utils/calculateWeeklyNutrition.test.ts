import { describe, expect, it } from 'vitest';

import type { MealLogEntry } from '@/types/mealLog';
import { calculateWeeklyNutrition } from '@/utils/calculateWeeklyNutrition';

function entry(date: string, kcal: number): MealLogEntry {
  return { recipeId: 'r-1', date, loggedAt: 0, servings: 1, nutritionSnapshot: { kcal, source: 'estimated', completeness: 'partial' } };
}

const RANGE = { start: '2026-07-13', end: '2026-07-19' };

describe('calculateWeeklyNutrition', () => {
  it('groups by every actual date in the week, Monday through Sunday', () => {
    const result = calculateWeeklyNutrition([], RANGE);
    expect(result.byDate.map((d) => d.date)).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
  });

  it('places each logged meal on its actual logged date, not a bucketed guess', () => {
    const entries = [entry('2026-07-14', 300), entry('2026-07-17', 500)];
    const result = calculateWeeklyNutrition(entries, RANGE);
    const byDate = Object.fromEntries(result.byDate.map((d) => [d.date, d.totals.kcal]));
    expect(byDate['2026-07-14']).toBe(300);
    expect(byDate['2026-07-17']).toBe(500);
    expect(byDate['2026-07-13']).toBe(0);
  });

  it('computes the weekly total as the sum across all days', () => {
    const entries = [entry('2026-07-13', 200), entry('2026-07-14', 300)];
    const result = calculateWeeklyNutrition(entries, RANGE);
    expect(result.weeklyTotal.kcal).toBe(500);
  });

  it('computes the daily average as weekly total divided by days actually logged, not by 7', () => {
    const entries = [entry('2026-07-13', 700)];
    const result = calculateWeeklyNutrition(entries, RANGE);
    expect(result.loggedDayCount).toBe(1);
    expect(result.dailyAverage.kcal).toBe(700);
  });

  it('divides across every distinct logged day when more than one day has entries', () => {
    const entries = [entry('2026-07-13', 300), entry('2026-07-14', 500)];
    const result = calculateWeeklyNutrition(entries, RANGE);
    expect(result.loggedDayCount).toBe(2);
    expect(result.dailyAverage.kcal).toBe(400);
  });

  it('returns a zero average when nothing was logged all week, instead of dividing by zero', () => {
    const result = calculateWeeklyNutrition([], RANGE);
    expect(result.loggedDayCount).toBe(0);
    expect(result.dailyAverage.kcal).toBe(0);
  });

  it('ignores meals logged outside the week range', () => {
    const entries = [entry('2026-07-20', 999)];
    const result = calculateWeeklyNutrition(entries, RANGE);
    expect(result.weeklyTotal.kcal).toBe(0);
  });
});

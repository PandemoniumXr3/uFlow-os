import { describe, expect, it } from 'vitest';

import { buildDecisionContext } from '@/services/decision/buildDecisionContext';
import type { BudgetPreferences } from '@/types/budget';
import type { FoodContext } from '@/types/foodContext';

const BUDGET_OFF: BudgetPreferences = { enabled: false, currency: 'EUR', weekStartsOn: 1 };
const BUDGET_ON: BudgetPreferences = { enabled: true, currency: 'EUR', weekStartsOn: 1, preferredMaxMealCostCents: 300 };

describe('buildDecisionContext', () => {
  it('loads safely with a null FoodContext (e.g. a brand-new profile)', () => {
    expect(() => buildDecisionContext({ date: '2026-07-20', foodContext: null, budgetPreferences: BUDGET_OFF })).not.toThrow();
    const context = buildDecisionContext({ date: '2026-07-20', foodContext: null, budgetPreferences: BUDGET_OFF });
    expect(context.date).toBe('2026-07-20');
    expect(context.budgetEnabled).toBe(false);
  });

  it('loads safely with an old FoodContext missing every new optional field', () => {
    const legacyContext: FoodContext = { date: '2026-07-20', completedAt: 0 };
    expect(() => buildDecisionContext({ date: '2026-07-20', foodContext: legacyContext, budgetPreferences: BUDGET_OFF })).not.toThrow();
  });

  it('maps the coarse "quick" time chip to a 15-minute cap only when no explicit maxPrepMinutes is set', () => {
    const context = buildDecisionContext({
      date: '2026-07-20',
      foodContext: { date: '2026-07-20', completedAt: 0, time: 'quick' },
      budgetPreferences: BUDGET_OFF,
    });
    expect(context.maxPrepMinutes).toBe(15);

    const withExplicit = buildDecisionContext({
      date: '2026-07-20',
      foodContext: { date: '2026-07-20', completedAt: 0, time: 'quick', maxPrepMinutes: 8 },
      budgetPreferences: BUDGET_OFF,
    });
    expect(withExplicit.maxPrepMinutes).toBe(8);
  });

  it('reflects Budget Mode enabled/disabled from BudgetPreferences, not FoodContext', () => {
    const off = buildDecisionContext({ date: '2026-07-20', foodContext: null, budgetPreferences: BUDGET_OFF });
    const on = buildDecisionContext({ date: '2026-07-20', foodContext: null, budgetPreferences: BUDGET_ON });
    expect(off.budgetEnabled).toBe(false);
    expect(on.budgetEnabled).toBe(true);
    expect(on.maxExtraCostCents).toBe(300);
  });

  it('merges session-dismissed ids into excludeRecipeIds', () => {
    const context = buildDecisionContext({
      date: '2026-07-20',
      foodContext: null,
      budgetPreferences: BUDGET_OFF,
      sessionExcludeRecipeIds: ['r-1', 'r-2'],
    });
    expect(context.excludeRecipeIds).toEqual(['r-1', 'r-2']);
  });
});

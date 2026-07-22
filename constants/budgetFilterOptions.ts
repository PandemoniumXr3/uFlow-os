/**
 * Which Today "Budget" quick-filter chip is active, if any. Lives here
 * (rather than the decision engine) because it's purely a UI selection —
 * `app/(tabs)/index.tsx` maps it onto the engine's DecisionContext fields
 * (noExtraShopping / maxExtraCostCents) before calling getRankedMealSuggestions.
 */
export type BudgetSuggestionFilter = 'noExtraShopping' | 'lowestExtraCost' | 'under5' | 'under10' | 'fitsWeeklyBudget';

export interface BudgetFilterOption {
  value: BudgetSuggestionFilter;
  label: string;
  /** Only shown once a weekly budget amount is actually set — nothing to "fit" otherwise. */
  requiresWeeklyBudget?: boolean;
}

/** Distinct from FoodContext's qualitative `budget` mood chip (BUDGET_OPTIONS in contextOptions.ts) — this is the real, numeric Budget Mode filter. */
export const BUDGET_FILTER_OPTIONS: BudgetFilterOption[] = [
  { value: 'noExtraShopping', label: 'No extra shopping' },
  { value: 'lowestExtraCost', label: 'Lowest extra cost' },
  { value: 'under5', label: 'Under €5' },
  { value: 'under10', label: 'Under €10' },
  { value: 'fitsWeeklyBudget', label: 'Fits my weekly budget', requiresWeeklyBudget: true },
];

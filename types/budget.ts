export type Currency = 'EUR';

/**
 * Minimal on purpose, same house rule as UserProfile: fields land here only
 * once the feature reading them exists. OFF by default — the app must stay
 * fully usable with this disabled or with incomplete price data.
 */
export interface BudgetPreferences {
  enabled: boolean;
  weeklyBudgetCents?: number;
  preferredMaxMealCostCents?: number;
  currency: Currency;
  weekStartsOn: 1 | 0;
  defaultStore?: string;
}

export type CostEstimateStatus = 'complete' | 'partial' | 'unavailable';

/**
 * Result of any cost calculation (recipe, extra-purchase, grocery list).
 * `knownCostCents` only ever sums what could actually be priced;
 * `coverageRatio`/`status` say how much of the total that represents, so a
 * caller can never mistake "partially priced" for "the real total" and
 * never renders a missing price as a fake €0.00.
 */
export interface CostEstimate {
  knownCostCents: number;
  coverageRatio: number; // 0..1
  missingPriceProductIds: string[];
  incompatibleUnitProductIds: string[];
  status: CostEstimateStatus;
}

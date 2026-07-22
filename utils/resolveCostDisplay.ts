import type { CostEstimate } from '@/types/budget';
import { formatCents } from '@/utils/money';

export interface CostDisplay {
  /** "€3.80", or null when no genuine figure can be shown — never "€0.00" for missing data. */
  amountLabel: string | null;
  /** "Estimate complete" / "2 prices missing" / "Cost unavailable" — always shown alongside the amount. */
  completenessLabel: string;
  isUnavailable: boolean;
}

/**
 * Turns a CostEstimate into exactly what a screen renders — the one place
 * that decides "known partial total" vs. "genuinely nothing to show", so no
 * screen computes this ad hoc. Mirrors resolveNutritionDisplay's split
 * between raw calculation and display decision (see resolveNutritionDisplay.ts).
 */
export function resolveCostDisplay(estimate: CostEstimate): CostDisplay {
  if (estimate.status === 'unavailable') {
    return { amountLabel: null, completenessLabel: 'Cost unavailable', isUnavailable: true };
  }

  if (estimate.status === 'complete') {
    return { amountLabel: formatCents(estimate.knownCostCents), completenessLabel: 'Estimate complete', isUnavailable: false };
  }

  const missingCount = estimate.missingPriceProductIds.length + estimate.incompatibleUnitProductIds.length;
  return {
    amountLabel: formatCents(estimate.knownCostCents),
    completenessLabel: missingCount === 1 ? '1 price missing' : `${missingCount} prices missing`,
    isUnavailable: false,
  };
}

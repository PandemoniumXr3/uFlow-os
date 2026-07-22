import type { CostEstimate, CostEstimateStatus } from '@/types/budget';

/**
 * Combines several already-computed CostEstimates (e.g. one per planned
 * meal this week) into a single total — for screens that need a weekly/
 * daily rollup without recomputing cost logic themselves. Sums the known
 * cost, unions the missing/incompatible ids, and averages coverage across
 * the contributing estimates so one fully-priced meal among several
 * unpriced ones still reads as partial, not complete.
 */
export function combineCostEstimates(estimates: CostEstimate[]): CostEstimate {
  if (estimates.length === 0) {
    return { knownCostCents: 0, coverageRatio: 0, missingPriceProductIds: [], incompatibleUnitProductIds: [], status: 'unavailable' };
  }

  let knownCostCents = 0;
  let coverageSum = 0;
  const missingPriceProductIds = new Set<string>();
  const incompatibleUnitProductIds = new Set<string>();

  for (const estimate of estimates) {
    knownCostCents += estimate.knownCostCents;
    coverageSum += estimate.coverageRatio;
    estimate.missingPriceProductIds.forEach((id) => missingPriceProductIds.add(id));
    estimate.incompatibleUnitProductIds.forEach((id) => incompatibleUnitProductIds.add(id));
  }

  const coverageRatio = coverageSum / estimates.length;
  const status: CostEstimateStatus = coverageRatio >= 1 ? 'complete' : coverageRatio > 0 ? 'partial' : 'unavailable';

  return {
    knownCostCents: Math.round(knownCostCents),
    coverageRatio,
    missingPriceProductIds: [...missingPriceProductIds],
    incompatibleUnitProductIds: [...incompatibleUnitProductIds],
    status,
  };
}

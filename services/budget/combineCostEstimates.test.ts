import { describe, expect, it } from 'vitest';

import { combineCostEstimates } from '@/services/budget/combineCostEstimates';
import type { CostEstimate } from '@/types/budget';

function estimate(overrides: Partial<CostEstimate> = {}): CostEstimate {
  return {
    knownCostCents: 0,
    coverageRatio: 0,
    missingPriceProductIds: [],
    incompatibleUnitProductIds: [],
    status: 'unavailable',
    ...overrides,
  };
}

describe('combineCostEstimates', () => {
  it('is unavailable for an empty list, never €0.00', () => {
    const result = combineCostEstimates([]);
    expect(result.status).toBe('unavailable');
    expect(result.knownCostCents).toBe(0);
  });

  it('sums the known cost across estimates', () => {
    const result = combineCostEstimates([
      estimate({ knownCostCents: 200, coverageRatio: 1, status: 'complete' }),
      estimate({ knownCostCents: 150, coverageRatio: 1, status: 'complete' }),
    ]);
    expect(result.knownCostCents).toBe(350);
    expect(result.status).toBe('complete');
  });

  it('is partial when one estimate is complete and another is unavailable, not complete', () => {
    const result = combineCostEstimates([
      estimate({ knownCostCents: 200, coverageRatio: 1, status: 'complete' }),
      estimate({ knownCostCents: 0, coverageRatio: 0, status: 'unavailable' }),
    ]);
    expect(result.status).toBe('partial');
    expect(result.knownCostCents).toBe(200);
  });

  it('unions missing/incompatible product ids without duplicates', () => {
    const result = combineCostEstimates([
      estimate({ missingPriceProductIds: ['p-1', 'p-2'] }),
      estimate({ missingPriceProductIds: ['p-2', 'p-3'], incompatibleUnitProductIds: ['p-4'] }),
    ]);
    expect(result.missingPriceProductIds.sort()).toEqual(['p-1', 'p-2', 'p-3']);
    expect(result.incompatibleUnitProductIds).toEqual(['p-4']);
  });
});

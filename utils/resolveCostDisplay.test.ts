import { describe, expect, it } from 'vitest';

import { resolveCostDisplay } from '@/utils/resolveCostDisplay';
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

describe('resolveCostDisplay', () => {
  it('never renders an amount for an unavailable estimate, even if knownCostCents happens to be 0', () => {
    const display = resolveCostDisplay(estimate({ status: 'unavailable', knownCostCents: 0 }));
    expect(display.amountLabel).toBeNull();
    expect(display.completenessLabel).toBe('Cost unavailable');
    expect(display.isUnavailable).toBe(true);
  });

  it('renders a genuine €0.00 only when the estimate is actually complete and truly zero', () => {
    const display = resolveCostDisplay(estimate({ status: 'complete', knownCostCents: 0, coverageRatio: 1 }));
    expect(display.amountLabel).not.toBeNull();
    expect(display.completenessLabel).toBe('Estimate complete');
  });

  it('renders a partial amount alongside a missing-prices count', () => {
    const display = resolveCostDisplay(
      estimate({ status: 'partial', knownCostCents: 380, coverageRatio: 0.5, missingPriceProductIds: ['p-1', 'p-2'] })
    );
    expect(display.amountLabel).toContain('3,80');
    expect(display.completenessLabel).toBe('2 prices missing');
    expect(display.isUnavailable).toBe(false);
  });

  it('uses singular phrasing for exactly one missing price', () => {
    const display = resolveCostDisplay(estimate({ status: 'partial', knownCostCents: 100, missingPriceProductIds: ['p-1'] }));
    expect(display.completenessLabel).toBe('1 price missing');
  });
});

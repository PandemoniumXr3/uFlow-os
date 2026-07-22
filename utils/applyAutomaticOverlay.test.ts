import { describe, expect, it } from 'vitest';

import type { AutomaticItemOverlay, ShoppingItem } from '@/types/shoppingItem';
import { applyAutomaticOverlay } from '@/utils/applyAutomaticOverlay';

function freshItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'freshly-generated-id',
    displayName: 'Banana',
    normalizedName: 'banana',
    source: 'automatic',
    reasons: [],
    linkedRecipeIds: [],
    linkedMealPlanIds: [],
    checked: false,
    purchased: false,
    priority: 'normal',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('applyAutomaticOverlay', () => {
  it('restores checked state and stable id from a persisted overlay entry (survives restart)', () => {
    const overlay: AutomaticItemOverlay = {
      banana: { id: 'stable-id-1', checked: true, purchased: false, hidden: false, updatedAt: 0 },
    };

    const result = applyAutomaticOverlay([freshItem()], overlay);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('stable-id-1');
    expect(result[0].checked).toBe(true);
  });

  it('drops an item whose overlay marks it hidden', () => {
    const overlay: AutomaticItemOverlay = {
      banana: { id: 'stable-id-1', checked: false, purchased: false, hidden: true, updatedAt: 0 },
    };

    const result = applyAutomaticOverlay([freshItem()], overlay);
    expect(result).toEqual([]);
  });

  it('passes an item through unchanged when it has no overlay entry yet', () => {
    const result = applyAutomaticOverlay([freshItem()], {});
    expect(result[0].id).toBe('freshly-generated-id');
    expect(result[0].checked).toBe(false);
  });

  it('restores purchased state independently of checked', () => {
    const overlay: AutomaticItemOverlay = {
      banana: { id: 'stable-id-1', checked: true, purchased: true, hidden: false, updatedAt: 0 },
    };
    const result = applyAutomaticOverlay([freshItem()], overlay);
    expect(result[0].purchased).toBe(true);
  });
});

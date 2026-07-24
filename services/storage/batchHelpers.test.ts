import { describe, expect, it } from 'vitest';

import { removeManyById } from '@/services/storage/batchHelpers';

interface Item {
  id: string;
  label: string;
}

function items(...ids: string[]): Item[] {
  return ids.map((id) => ({ id, label: `item-${id}` }));
}

describe('removeManyById', () => {
  it('removes every id in the batch, not just one', () => {
    const result = removeManyById(items('a', 'b', 'c', 'd'), ['a', 'c']);
    expect(result.map((i) => i.id)).toEqual(['b', 'd']);
  });

  it('preserves every sibling untouched — this is the exact regression a Promise.all-based bulk remove would fail', () => {
    // Simulates "Clear this day" removing 3 planned meals at once: all 3 must be gone,
    // and the 2 unrelated entries from other days must survive completely unmodified.
    const all = [...items('day-meal-1', 'day-meal-2', 'day-meal-3'), { id: 'other-day-1', label: 'unrelated' }, { id: 'other-day-2', label: 'unrelated' }];
    const result = removeManyById(all, ['day-meal-1', 'day-meal-2', 'day-meal-3']);
    expect(result.map((i) => i.id)).toEqual(['other-day-1', 'other-day-2']);
  });

  it('is a no-op when given an empty id list', () => {
    const source = items('a', 'b');
    expect(removeManyById(source, [])).toBe(source);
  });

  it('ignores ids that are not present, without error', () => {
    const result = removeManyById(items('a', 'b'), ['does-not-exist']);
    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('removing every id leaves an empty array, not a partially-cleared one', () => {
    const result = removeManyById(items('a', 'b', 'c'), ['a', 'b', 'c']);
    expect(result).toEqual([]);
  });

  it('preserves original order of the remaining items', () => {
    const result = removeManyById(items('a', 'b', 'c', 'd', 'e'), ['b', 'd']);
    expect(result.map((i) => i.id)).toEqual(['a', 'c', 'e']);
  });
});

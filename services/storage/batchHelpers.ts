/**
 * The exact transform every `removeMany` batch method applies: one filter
 * pass over the current array, done once, in the caller's single
 * read-then-write. This is the piece that actually fixes the concurrent-
 * write race (see mealPlanStorageService.removeMany / dismissalStorageService.removeMany)
 * — a bulk `Promise.all(ids.map(remove))` instead calls a single-item
 * remove N times concurrently, and each of those reads the same
 * pre-removal snapshot, so only the last write survives and the other
 * N-1 removals are silently dropped from storage. Doing the filtering once,
 * in memory, against one snapshot, removes the possibility of that race
 * entirely — there's no second read to race against.
 */
export function removeManyById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  if (ids.length === 0) return items;
  const idSet = new Set(ids);
  return items.filter((item) => !idSet.has(item.id));
}

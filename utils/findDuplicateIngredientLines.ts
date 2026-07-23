import { normalizeIngredient } from '@/utils/normalizeIngredient';

/**
 * Normalized names that appear more than once among the given ingredient
 * lines — for the ingredient builder's duplicate warning. Informational
 * only: the editor warns but never blocks save on a duplicate, since a
 * recipe can legitimately need the same ingredient twice with different
 * notes (e.g. "divided").
 */
export function findDuplicateIngredientNames(lines: { name: string }[]): Set<string> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = normalizeIngredient(line.name);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) duplicates.add(key);
  }
  return duplicates;
}

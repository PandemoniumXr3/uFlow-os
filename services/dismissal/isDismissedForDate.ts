import type { DismissalEntry } from '@/types/dismissal';

/**
 * Pure predicate so this is testable without React/AsyncStorage. A
 * permanent dismissal suppresses a recipe on every date; a 'day' dismissal
 * only suppresses it on the exact date it was recorded for.
 */
export function isDismissedForDate(entries: DismissalEntry[], recipeId: string, date: string): boolean {
  return entries.some(
    (entry) => entry.recipeId === recipeId && (entry.scope === 'permanent' || (entry.scope === 'day' && entry.date === date))
  );
}

export function getPermanentlyHiddenIds(entries: DismissalEntry[]): Set<string> {
  return new Set(entries.filter((entry) => entry.scope === 'permanent').map((entry) => entry.recipeId));
}

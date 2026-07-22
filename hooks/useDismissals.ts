import { useCallback, useEffect, useMemo, useState } from 'react';

import { dismissalStorageService } from '@/services/dismissal/dismissalStorageService';
import { getPermanentlyHiddenIds, isDismissedForDate as isDismissedForDatePure } from '@/services/dismissal/isDismissedForDate';
import type { DismissalEntry, DismissalReason } from '@/types/dismissal';
import { generateId } from '@/utils/id';

/**
 * Manages the two persisted dismissal tiers ("dismiss for this day" and
 * "hide forever") — the lightest tier, session-only dismissal, stays as
 * plain local component state (e.g. in MealSuggestions) and never touches
 * this hook. A reason is always optional on both persisted tiers.
 */
export function useDismissals() {
  const [entries, setEntries] = useState<DismissalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dismissalStorageService.getAll().then((stored) => {
      setEntries(stored);
      setIsLoading(false);
    });
  }, []);

  const dismissForDay = useCallback(async (recipeId: string, date: string, reason?: DismissalReason) => {
    const entry: DismissalEntry = { id: generateId(), recipeId, scope: 'day', date, reason, dismissedAt: Date.now() };
    setEntries((current) => [...current, entry]);
    await dismissalStorageService.add(entry);
  }, []);

  const hideForever = useCallback(async (recipeId: string, reason?: DismissalReason) => {
    const entry: DismissalEntry = { id: generateId(), recipeId, scope: 'permanent', reason, dismissedAt: Date.now() };
    setEntries((current) => [...current, entry]);
    await dismissalStorageService.add(entry);
  }, []);

  const unhide = useCallback(
    async (recipeId: string) => {
      const toRemove = entries.filter((entry) => entry.scope === 'permanent' && entry.recipeId === recipeId);
      setEntries((current) => current.filter((entry) => !toRemove.includes(entry)));
      await Promise.all(toRemove.map((entry) => dismissalStorageService.remove(entry.id)));
    },
    [entries]
  );

  const clearHistory = useCallback(async () => {
    setEntries([]);
    await dismissalStorageService.clearAll();
  }, []);

  const permanentlyHiddenIds = useMemo(() => getPermanentlyHiddenIds(entries), [entries]);

  const isDismissedForDate = useCallback((recipeId: string, date: string) => isDismissedForDatePure(entries, recipeId, date), [entries]);

  return {
    entries,
    isLoading,
    dismissForDay,
    hideForever,
    unhide,
    clearHistory,
    permanentlyHiddenIds,
    isDismissedForDate,
  };
}

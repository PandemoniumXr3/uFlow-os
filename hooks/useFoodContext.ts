import { useCallback, useEffect, useState } from 'react';

import { contextStorageService } from '@/services/context/contextStorageService';
import type { FoodContext, FoodContextAnswers } from '@/types/foodContext';
import { getTodayKey } from '@/utils/date';

function createDefaultContext(): FoodContext {
  return { date: getTodayKey(), completedAt: Date.now() };
}

/**
 * Today's Food Context always exists — there is no blocking wizard gate.
 * A fresh day starts as an all-undefined context (every field means "let
 * uFlow decide") and is patched one field at a time as the user taps quick
 * chips, persisting immediately per change rather than once at the end of a
 * multi-step flow.
 */
export function useFoodContext() {
  const [context, setContext] = useState<FoodContext>(createDefaultContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    contextStorageService.getForDate(getTodayKey()).then(async (stored) => {
      if (stored) {
        setContext(stored);
        setIsLoading(false);
        return;
      }
      const created = createDefaultContext();
      await contextStorageService.save(created);
      setContext(created);
      setIsLoading(false);
    });
  }, []);

  const updateAnswer = useCallback(<K extends keyof FoodContextAnswers>(key: K, value: FoodContextAnswers[K]) => {
    setContext((current) => {
      const next = { ...current, [key]: value, completedAt: Date.now() };
      contextStorageService.save(next);
      return next;
    });
  }, []);

  /** Toggles a chip value off (back to "let uFlow decide") if it's already selected, else sets it. */
  const toggleAnswer = useCallback(<K extends keyof FoodContextAnswers>(key: K, value: NonNullable<FoodContextAnswers[K]>) => {
    setContext((current) => {
      const next = { ...current, [key]: current[key] === value ? undefined : value, completedAt: Date.now() };
      contextStorageService.save(next);
      return next;
    });
  }, []);

  const resetContext = useCallback(async () => {
    const reset = createDefaultContext();
    setContext(reset);
    await contextStorageService.save(reset);
  }, []);

  return { context, isLoading, updateAnswer, toggleAnswer, resetContext };
}

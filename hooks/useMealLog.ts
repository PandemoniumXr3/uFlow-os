import { useCallback, useEffect, useMemo, useState } from 'react';

import { mealLogStorageService } from '@/services/mealLog/mealLogStorageService';
import type { MealLogEntry } from '@/types/mealLog';
import type { MealType } from '@/types/recipe';
import type { NutritionInfo } from '@/types/nutrition';
import { getTodayKey } from '@/utils/date';
import { generateId } from '@/utils/id';

export interface LogMealOptions {
  date?: string;
  servings?: number;
  nutritionSnapshot?: NutritionInfo;
  mealSlot?: MealType;
  plannedMealId?: string;
}

export interface LogCustomMealOptions extends LogMealOptions {
  customName: string;
}

export function useMealLog() {
  const [entries, setEntries] = useState<MealLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mealLogStorageService.getAll().then((stored) => {
      setEntries(stored);
      setIsLoading(false);
    });
  }, []);

  const logMeal = useCallback(async (recipeId: string, servingsOrOptions: number | LogMealOptions = 1, legacySnapshot?: NutritionInfo) => {
    const options: LogMealOptions =
      typeof servingsOrOptions === 'number' ? { servings: servingsOrOptions, nutritionSnapshot: legacySnapshot } : servingsOrOptions;

    const entry: MealLogEntry = {
      id: generateId(),
      recipeId,
      date: options.date ?? getTodayKey(),
      loggedAt: Date.now(),
      servings: options.servings ?? 1,
      nutritionSnapshot: options.nutritionSnapshot,
      mealSlot: options.mealSlot,
      plannedMealId: options.plannedMealId,
    };
    setEntries((current) => [...current, entry]);
    await mealLogStorageService.add(entry);
    return entry;
  }, []);

  const logCustomMeal = useCallback(async (options: LogCustomMealOptions) => {
    const entry: MealLogEntry = {
      id: generateId(),
      date: options.date ?? getTodayKey(),
      loggedAt: Date.now(),
      servings: options.servings ?? 1,
      isCustom: true,
      customName: options.customName,
      nutritionSnapshot: options.nutritionSnapshot,
      mealSlot: options.mealSlot,
      plannedMealId: options.plannedMealId,
    };
    setEntries((current) => [...current, entry]);
    await mealLogStorageService.add(entry);
    return entry;
  }, []);

  const repeatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry.recipeId) continue;
      counts[entry.recipeId] = (counts[entry.recipeId] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const loggedTodayIds = useMemo(() => {
    const today = getTodayKey();
    return new Set(entries.filter((entry) => entry.date === today && entry.recipeId).map((entry) => entry.recipeId as string));
  }, [entries]);

  const isLoggedToday = useCallback((recipeId: string) => loggedTodayIds.has(recipeId), [loggedTodayIds]);

  const getEntriesForDate = useCallback((date: string) => entries.filter((entry) => entry.date === date), [entries]);

  return {
    entries,
    isLoading,
    logMeal,
    logCustomMeal,
    repeatCounts,
    loggedTodayIds,
    isLoggedToday,
    getEntriesForDate,
  };
}

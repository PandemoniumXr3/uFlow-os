import { useCallback, useEffect, useMemo, useState } from 'react';

import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import type { NewPlannedMeal, PlannedMeal, PlannedMealUpdate } from '@/types/mealPlan';
import type { MealType } from '@/types/recipe';
import { getTodayKey } from '@/utils/date';
import { getWeekRange, isDateWithinRange } from '@/utils/getWeekRange';
import { generateId } from '@/utils/id';

/**
 * Meal-planning layer: a meal (recipe or ad-hoc custom meal) tagged with a
 * real calendar date (YYYY-MM-DD) — the date is always concrete, never a
 * vague "this week" marker. Week grouping is a read-time query over these
 * dates, not a separate stored concept. mealSlot/time/isSkipped/isCustom are
 * all additive on top of the original add/remove/toggle-today shape, so
 * older stored entries still load fine with those fields undefined.
 */
export function useMealPlan() {
  const [entries, setEntries] = useState<PlannedMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mealPlanStorageService.getAll().then((stored) => {
      setEntries(stored);
      setIsLoading(false);
    });
  }, []);

  const weekRange = useMemo(() => getWeekRange(), []);
  const todayKey = getTodayKey();

  const addPlannedMeal = useCallback(async (input: NewPlannedMeal) => {
    const entry: PlannedMeal = { id: generateId(), createdAt: Date.now(), ...input };
    setEntries((current) => [...current, entry]);
    await mealPlanStorageService.add(entry);
    return entry;
  }, []);

  const removePlannedMeal = useCallback(async (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    await mealPlanStorageService.remove(id);
  }, []);

  const updatePlannedMeal = useCallback(async (id: string, patch: PlannedMealUpdate) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    await mealPlanStorageService.update(id, patch);
  }, []);

  /** Reschedule in place — grocery needs recompute automatically since they're derived fresh from `entries` on every render. */
  const movePlannedMeal = useCallback((id: string, newDate: string) => updatePlannedMeal(id, { date: newDate }), [updatePlannedMeal]);

  const toggleSkipped = useCallback(
    (id: string, isSkipped: boolean) => updatePlannedMeal(id, { isSkipped }),
    [updatePlannedMeal]
  );

  const copyPlannedMeal = useCallback(
    async (id: string, newDate: string) => {
      const source = entries.find((entry) => entry.id === id);
      if (!source) return undefined;
      return addPlannedMeal({
        date: newDate,
        recipeId: source.recipeId,
        mealSlot: source.mealSlot,
        time: source.time,
        servings: source.servings,
        isCustom: source.isCustom,
        customName: source.customName,
        customNutrition: source.customNutrition,
        customEstimatedCostCents: source.customEstimatedCostCents,
      });
    },
    [entries, addPlannedMeal]
  );

  /** Copies every non-skipped meal from one day to another, skipping any recipe/slot already planned on the target day. */
  const copyDay = useCallback(
    async (fromDate: string, toDate: string) => {
      const sourceMeals = entries.filter((entry) => entry.date === fromDate && !entry.isSkipped);
      const targetMeals = entries.filter((entry) => entry.date === toDate);
      const alreadyPlanned = new Set(
        targetMeals.map((entry) => `${entry.recipeId ?? entry.customName}:${entry.mealSlot ?? ''}`)
      );

      const created: PlannedMeal[] = [];
      for (const meal of sourceMeals) {
        const key = `${meal.recipeId ?? meal.customName}:${meal.mealSlot ?? ''}`;
        if (alreadyPlanned.has(key)) continue;
        const copy = await addPlannedMeal({
          date: toDate,
          recipeId: meal.recipeId,
          mealSlot: meal.mealSlot,
          time: meal.time,
          servings: meal.servings,
          isCustom: meal.isCustom,
          customName: meal.customName,
          customNutrition: meal.customNutrition,
          customEstimatedCostCents: meal.customEstimatedCostCents,
        });
        created.push(copy);
      }
      return created;
    },
    [entries, addPlannedMeal]
  );

  const addCustomMeal = useCallback(
    (
      date: string,
      details: {
        name: string;
        mealSlot?: MealType;
        servings?: number;
        time?: string;
        nutrition?: PlannedMeal['customNutrition'];
        estimatedCostCents?: number;
        notes?: string;
      }
    ) =>
      addPlannedMeal({
        date,
        isCustom: true,
        customName: details.name,
        mealSlot: details.mealSlot,
        servings: details.servings,
        time: details.time,
        customNutrition: details.nutrition,
        customEstimatedCostCents: details.estimatedCostCents,
        notes: details.notes,
      }),
    [addPlannedMeal]
  );

  /** Removes every not-yet-eaten planned meal from tomorrow onward — used by "Clear future planned meals", always behind an explicit confirmation in the UI. */
  const clearFuturePlannedMeals = useCallback(async () => {
    const toRemove = entries.filter((entry) => entry.date > todayKey);
    await Promise.all(toRemove.map((entry) => removePlannedMeal(entry.id)));
  }, [entries, todayKey, removePlannedMeal]);

  const findEntry = useCallback(
    (recipeId: string, date: string) => entries.find((entry) => entry.recipeId === recipeId && entry.date === date),
    [entries]
  );

  const isPlannedToday = useCallback((recipeId: string) => Boolean(findEntry(recipeId, todayKey)), [findEntry, todayKey]);

  const isPlannedOnDate = useCallback((recipeId: string, date: string) => Boolean(findEntry(recipeId, date)), [findEntry]);

  const isPlannedThisWeek = useCallback(
    (recipeId: string) =>
      entries.some((entry) => entry.recipeId === recipeId && entry.date !== todayKey && isDateWithinRange(entry.date, weekRange)),
    [entries, todayKey, weekRange]
  );

  const togglePlannedToday = useCallback(
    async (recipeId: string) => {
      const existing = findEntry(recipeId, todayKey);
      if (existing) {
        await removePlannedMeal(existing.id);
      } else {
        await addPlannedMeal({ date: todayKey, recipeId });
      }
    },
    [findEntry, todayKey, removePlannedMeal, addPlannedMeal]
  );

  const togglePlannedOnDate = useCallback(
    async (recipeId: string, date: string) => {
      const existing = findEntry(recipeId, date);
      if (existing) {
        await removePlannedMeal(existing.id);
      } else {
        await addPlannedMeal({ date, recipeId });
      }
    },
    [findEntry, removePlannedMeal, addPlannedMeal]
  );

  const plannedMealsForDate = useCallback((date: string) => entries.filter((entry) => entry.date === date), [entries]);

  const todayPlannedMeals = useMemo(() => entries.filter((entry) => entry.date === todayKey), [entries, todayKey]);

  const weekPlannedMeals = useMemo(
    () => entries.filter((entry) => isDateWithinRange(entry.date, weekRange)),
    [entries, weekRange]
  );

  return {
    entries,
    isLoading,
    todayPlannedMeals,
    weekPlannedMeals,
    plannedMealsForDate,
    isPlannedToday,
    isPlannedOnDate,
    isPlannedThisWeek,
    togglePlannedToday,
    togglePlannedOnDate,
    addPlannedMeal,
    removePlannedMeal,
    updatePlannedMeal,
    movePlannedMeal,
    copyPlannedMeal,
    copyDay,
    addCustomMeal,
    toggleSkipped,
    clearFuturePlannedMeals,
  };
}

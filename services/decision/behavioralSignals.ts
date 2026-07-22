import type { DismissalEntry } from '@/types/dismissal';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { MealType } from '@/types/recipe';

export interface BehavioralSignals {
  chosenCount: number;
  eatenCount: number;
  lastChosenDate?: string;
  lastEatenDate?: string;
  commonMealSlot?: MealType;
  rejectedCount: number;
  /** A dismissal recorded within the last 3 days — used as a mild, temporary ranking penalty, never a permanent one. */
  recentlyDismissed: boolean;
}

const RECENT_DISMISSAL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function latestDate(dates: string[]): string | undefined {
  return dates.length > 0 ? dates.reduce((latest, date) => (date > latest ? date : latest)) : undefined;
}

function mostCommonMealSlot(slots: MealType[]): MealType | undefined {
  if (slots.length === 0) return undefined;
  const counts = new Map<MealType, number>();
  for (const slot of slots) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  let best: MealType | undefined;
  let bestCount = 0;
  for (const [slot, count] of counts) {
    if (count > bestCount) {
      best = slot;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Deterministic, transparent behavioral signals derived from the app's
 * existing history (mealPlan entries, mealLog entries, dismissals) —
 * nothing here is a separate stored counter, so there's no second source of
 * truth to keep in sync. Not an opaque model: every field traces back to a
 * concrete, explainable set of past events.
 */
export function computeBehavioralSignals(
  recipeId: string,
  plannedMeals: PlannedMeal[],
  mealLogEntries: MealLogEntry[],
  dismissals: DismissalEntry[],
  nowMs: number = Date.now()
): BehavioralSignals {
  const chosen = plannedMeals.filter((meal) => meal.recipeId === recipeId);
  const eaten = mealLogEntries.filter((entry) => entry.recipeId === recipeId);
  const recipeDismissals = dismissals.filter((entry) => entry.recipeId === recipeId);

  const mealSlots = [
    ...eaten.map((entry) => entry.mealSlot).filter((slot): slot is MealType => slot != null),
    ...chosen.map((meal) => meal.mealSlot).filter((slot): slot is MealType => slot != null),
  ];

  return {
    chosenCount: chosen.length,
    eatenCount: eaten.length,
    lastChosenDate: latestDate(chosen.map((meal) => meal.date)),
    lastEatenDate: latestDate(eaten.map((entry) => entry.date)),
    commonMealSlot: mostCommonMealSlot(mealSlots),
    rejectedCount: recipeDismissals.length,
    recentlyDismissed: recipeDismissals.some((entry) => nowMs - entry.dismissedAt <= RECENT_DISMISSAL_WINDOW_MS),
  };
}

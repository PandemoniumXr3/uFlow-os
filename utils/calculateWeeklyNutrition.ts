import type { MealLogEntry } from '@/types/mealLog';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';
import { formatDateKey } from '@/utils/date';
import { addTotals, createEmptyTotals, divideTotals, type NutrientTotals } from '@/utils/nutrientTotals';
import type { WeekRange } from '@/utils/getWeekRange';

export interface WeeklyNutrition {
  /** Every date in the week, Monday first, each with that day's consumed totals. */
  byDate: { date: string; totals: NutrientTotals }[];
  weeklyTotal: NutrientTotals;
  /** Days within the week that have at least one logged meal. */
  loggedDayCount: number;
  /** Total ÷ number of days actually logged — not ÷ 7, so one big logged day doesn't get diluted by six empty ones. Zero totals if nothing was logged all week. */
  dailyAverage: NutrientTotals;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Local-time date arithmetic throughout — never Date.toISOString(), which shifts by timezone offset. */
function eachDateInRange(range: WeekRange): string[] {
  const dates: string[] = [];
  const cursor = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  while (cursor <= end) {
    dates.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Groups consumed nutrition by actual logged date across the week — never a
 * separate stored "week" concept, purely a read-time aggregation over
 * MealLogEntry.date, using the historical snapshot so edits to a recipe
 * never change what the week already shows.
 */
export function calculateWeeklyNutrition(entries: MealLogEntry[], range: WeekRange): WeeklyNutrition {
  const byDate = eachDateInRange(range).map((date) => ({ date, totals: calculateConsumedNutritionForDate(entries, date) }));

  let weeklyTotal = createEmptyTotals();
  for (const day of byDate) {
    weeklyTotal = addTotals(weeklyTotal, day.totals);
  }

  const loggedDayCount = byDate.filter((day) => entries.some((entry) => entry.date === day.date)).length;

  return {
    byDate,
    weeklyTotal,
    loggedDayCount,
    dailyAverage: loggedDayCount > 0 ? divideTotals(weeklyTotal, loggedDayCount) : createEmptyTotals(),
  };
}

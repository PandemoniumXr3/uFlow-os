import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';
import { formatDateKey } from '@/utils/date';
import { getMealStatus } from '@/utils/getMealStatus';
import { addTotals, createEmptyTotals, type NutrientTotals } from '@/utils/nutrientTotals';
import type { WeekRange } from '@/utils/getWeekRange';

export interface WeeklyProjectedNutrition {
  byDate: { date: string; totals: NutrientTotals }[];
  weeklyTotal: NutrientTotals;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

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
 * The planned (not-yet-eaten, not skipped) counterpart to
 * calculateWeeklyNutrition — never summed together with consumed totals, so
 * Week can show "planned this week" and "eaten this week" as clearly
 * separate numbers rather than one misleading blend.
 */
export function calculateWeeklyProjectedNutrition(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  mealLogEntries: MealLogEntry[],
  range: WeekRange
): WeeklyProjectedNutrition {
  const excludedPlannedMealIds = new Set(
    plannedMeals.filter((meal) => getMealStatus(meal, mealLogEntries) === 'eaten').map((meal) => meal.id)
  );

  const byDate = eachDateInRange(range).map((date) => ({
    date,
    totals: calculateProjectedNutritionForDate(plannedMeals, recipes, date, excludedPlannedMealIds),
  }));

  let weeklyTotal = createEmptyTotals();
  for (const day of byDate) {
    weeklyTotal = addTotals(weeklyTotal, day.totals);
  }

  return { byDate, weeklyTotal };
}

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NutritionOverview } from '@/components/nutrition/NutritionOverview';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, typography } from '@/constants/theme';
import type { useMealLog } from '@/hooks/useMealLog';
import type { useMealPlan } from '@/hooks/useMealPlan';
import type { UserProfile } from '@/types/profile';
import type { NutrientKey } from '@/types/nutrition';
import type { Recipe } from '@/types/recipe';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';
import { getTodayKey } from '@/utils/date';
import { getMealStatus } from '@/utils/getMealStatus';
import { hasConsumedNutritionData, hasProjectedNutritionData } from '@/utils/nutritionDataPresence';

type NutritionSummaryProps = {
  profile: UserProfile | null;
  hiddenNutrients: ReadonlySet<NutrientKey>;
  recipes: Recipe[];
  mealLog: ReturnType<typeof useMealLog>;
  mealPlan: ReturnType<typeof useMealPlan>;
};

/**
 * Takes mealLog/mealPlan/recipes/profile as props (from the Today screen)
 * rather than calling those hooks itself — it renders alongside
 * MealSuggestions on the same screen and must observe the exact same meal
 * log/plan state, since two independent hook instances don't see each
 * other's writes (each only loads its own copy once on mount).
 */
export function NutritionSummary({ profile, hiddenNutrients, recipes, mealLog, mealPlan }: NutritionSummaryProps) {
  const { entries: mealLogEntries } = mealLog;
  const { entries: plannedMeals } = mealPlan;
  const router = useRouter();

  const todayKey = getTodayKey();

  const consumed = useMemo(() => calculateConsumedNutritionForDate(mealLogEntries, todayKey), [mealLogEntries, todayKey]);

  const excludedPlannedMealIds = useMemo(
    () => new Set(plannedMeals.filter((meal) => getMealStatus(meal, mealLogEntries) === 'eaten').map((meal) => meal.id)),
    [plannedMeals, mealLogEntries]
  );

  const projected = useMemo(
    () => calculateProjectedNutritionForDate(plannedMeals, recipes, todayKey, excludedPlannedMealIds),
    [plannedMeals, recipes, todayKey, excludedPlannedMealIds]
  );

  if (!profile?.nutritionTrackingEnabled) return null;

  const hasConsumedEntries = mealLogEntries.some((entry) => entry.date === todayKey);
  const hasProjectedEntries = plannedMeals.some(
    (meal) => meal.date === todayKey && !meal.isSkipped && !excludedPlannedMealIds.has(meal.id)
  );

  return (
    <Card variant="standard">
      <SectionHeader title="Nutrition today" />
      <View style={styles.spacer} />
      <NutritionOverview
        consumed={consumed}
        hasConsumedEntries={hasConsumedEntries}
        consumedHasNutritionData={hasConsumedNutritionData(mealLogEntries, todayKey)}
        projected={projected}
        hasProjectedEntries={hasProjectedEntries}
        projectedHasNutritionData={hasProjectedNutritionData(plannedMeals, recipes, todayKey, excludedPlannedMealIds)}
        hiddenNutrients={hiddenNutrients}
        emptyText="Nothing logged yet today."
      />
      <Pressable onPress={() => router.push('/week')} hitSlop={8} style={styles.weekLink}>
        <Text style={styles.weekLinkText}>This week →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  spacer: {
    height: spacing.sm,
  },
  weekLink: {
    marginTop: spacing.md,
  },
  weekLinkText: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
});

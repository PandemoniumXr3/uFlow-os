import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MealTimelineItem } from '@/components/today/MealTimelineItem';
import { IconButton } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { spacing } from '@/constants/theme';
import type { useMealLog } from '@/hooks/useMealLog';
import type { useMealPlan } from '@/hooks/useMealPlan';
import type { MealType, Recipe } from '@/types/recipe';
import { getTodayKey } from '@/utils/date';
import { getMealStatus } from '@/utils/getMealStatus';
import { labelFor } from '@/utils/optionLabels';
import { MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';

type TodayTimelineProps = {
  recipes: Recipe[];
  mealPlan: ReturnType<typeof useMealPlan>;
  mealLog: ReturnType<typeof useMealLog>;
};

const SLOT_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'dessert'];

/** Today's own meal list, grouped by slot — richer actions (move/copy/skip) live on the full Day Detail screen, reached via "Plan day". */
export function TodayTimeline({ recipes, mealPlan, mealLog }: TodayTimelineProps) {
  const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const { todayPlannedMeals, removePlannedMeal } = mealPlan;
  const { entries: mealLogEntries, logMeal } = mealLog;
  const router = useRouter();
  const todayKey = getTodayKey();

  const rows = useMemo(() => {
    return [...todayPlannedMeals]
      .sort((a, b) => SLOT_ORDER.indexOf(a.mealSlot ?? 'snack') - SLOT_ORDER.indexOf(b.mealSlot ?? 'snack'))
      .map((meal) => {
        const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
        const title = meal.isCustom ? meal.customName ?? 'Custom meal' : recipe?.name;
        if (!title) return null;
        return {
          meal,
          title,
          meta: meal.mealSlot ? labelFor(MEAL_TYPE_OPTIONS, meal.mealSlot) : undefined,
          status: getMealStatus(meal, mealLogEntries),
          recipe,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }, [todayPlannedMeals, mealLogEntries, recipeById]);

  function markEaten(mealId: string, recipeId: string | undefined, mealSlot: MealType | undefined, isCustom: boolean | undefined, customName: string | undefined) {
    if (isCustom) {
      mealLog.logCustomMeal({ customName: customName ?? 'Custom meal', plannedMealId: mealId, mealSlot });
      return;
    }
    if (!recipeId) return;
    logMeal(recipeId, { plannedMealId: mealId, mealSlot, nutritionSnapshot: recipeById.get(recipeId)?.nutrition });
  }

  return (
    <View style={styles.container}>
      <SectionHeader title="Today" actionLabel="Plan day →" onActionPress={() => router.push(`/day/${todayKey}`)} />
      {rows.length === 0 ? (
        <MealTimelineItem title="Nothing planned yet" meta="Pick something above" status="planned" />
      ) : (
        <View style={styles.list}>
          {rows.map(({ meal, title, meta, status }) => (
            <MealTimelineItem
              key={meal.id}
              title={title}
              meta={meta}
              status={status}
              rightSlot={
                status === 'planned' ? (
                  <View style={styles.actions}>
                    <IconButton
                      icon="checkmark-circle-outline"
                      variant="safe"
                      accessibilityLabel={`Mark ${title} eaten`}
                      onPress={() => markEaten(meal.id, meal.recipeId, meal.mealSlot, meal.isCustom, meal.customName)}
                    />
                    <IconButton icon="close-circle-outline" variant="danger" accessibilityLabel={`Remove ${title} from today`} onPress={() => removePlannedMeal(meal.id)} />
                  </View>
                ) : undefined
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chip } from '@/components/ui/Chip';
import {
  ADVENTURE_OPTIONS,
  BUDGET_OPTIONS,
  CRAVING_OPTIONS,
  LOCATION_OPTIONS,
  MOOD_OPTIONS,
  TEMPERATURE_OPTIONS,
} from '@/constants/contextOptions';
import { BUDGET_FILTER_OPTIONS, type BudgetSuggestionFilter } from '@/constants/budgetFilterOptions';
import { MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { FoodContext, FoodContextAnswers } from '@/types/foodContext';

const QUICK_MEAL_TYPES = MEAL_TYPE_OPTIONS.filter((option) =>
  (['breakfast', 'lunch', 'dinner', 'snack'] as string[]).includes(option.value)
);

type QuickContextBarProps = {
  context: FoodContext;
  onToggle: <K extends keyof FoodContextAnswers>(key: K, value: NonNullable<FoodContextAnswers[K]>) => void;
  safeMealsOnly: boolean;
  onToggleSafeMealsOnly: () => void;
  onReset: () => void;
  /** All budget props are omitted entirely when Budget Mode is off — no empty row, no dead chip. */
  budgetModeEnabled?: boolean;
  budgetFilter?: BudgetSuggestionFilter | null;
  onSelectBudgetFilter?: (filter: BudgetSuggestionFilter | null) => void;
  weeklyBudgetSet?: boolean;
};

/**
 * Compact default row + an "Adjust" expand — replaces the old blocking
 * multi-step wizard. Only meal type + the two most-used toggles show by
 * default (≈6 chips); everything else lives behind "Adjust" so the bar never
 * dominates the screen. Nothing here is required; every chip reverts to
 * "let uFlow decide" on a second tap.
 */
export function QuickContextBar({
  context,
  onToggle,
  safeMealsOnly,
  onToggleSafeMealsOnly,
  onReset,
  budgetModeEnabled,
  budgetFilter,
  onSelectBudgetFilter,
  weeklyBudgetSet,
}: QuickContextBarProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const reducedMotion = useReducedMotionPreference();

  return (
    <Animated.View style={styles.container} layout={layoutTransition(reducedMotion)}>
      <View style={styles.row}>
        {QUICK_MEAL_TYPES.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={context.mealType === option.value}
            onPress={() => onToggle('mealType', option.value)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Chip
          label="Use what I have"
          selected={context.prioritizeAvailable === true}
          onPress={() => onToggle('prioritizeAvailable', true)}
        />
        <Chip label="Safe meals only" selected={safeMealsOnly} onPress={onToggleSafeMealsOnly} />
        <Pressable onPress={() => setAdjustOpen(!adjustOpen)} hitSlop={8} style={styles.adjustLink}>
          <Text style={styles.adjustLinkText}>{adjustOpen ? 'Less' : 'Adjust'}</Text>
        </Pressable>
      </View>

      {adjustOpen && (
        <Animated.View
          style={styles.adjustPanel}
          entering={enterFade(reducedMotion)}
          exiting={exitFade(reducedMotion)}
          layout={layoutTransition(reducedMotion)}>
          <Text style={styles.adjustLabel}>Time and energy</Text>
          <View style={styles.row}>
            <Chip label="Low energy" selected={context.energy === 'low'} onPress={() => onToggle('energy', 'low')} />
            <Chip label="Under 10 minutes" selected={context.time === 'quick'} onPress={() => onToggle('time', 'quick')} />
          </View>

          <Text style={styles.adjustLabel}>Warm or cold?</Text>
          <View style={styles.row}>
            {TEMPERATURE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.temperature === option.value}
                onPress={() => onToggle('temperature', option.value)}
              />
            ))}
          </View>

          <Text style={styles.adjustLabel}>Familiar or different?</Text>
          <View style={styles.row}>
            {ADVENTURE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.adventure === option.value}
                onPress={() => onToggle('adventure', option.value)}
              />
            ))}
          </View>

          <Text style={styles.adjustLabel}>Craving anything — or avoiding something?</Text>
          <View style={styles.row}>
            {CRAVING_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.cravings === option.value}
                onPress={() => onToggle('cravings', option.value)}
              />
            ))}
          </View>

          <Text style={styles.adjustLabel}>How are you feeling?</Text>
          <View style={styles.row}>
            {MOOD_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.mood === option.value}
                onPress={() => onToggle('mood', option.value)}
              />
            ))}
          </View>

          <Text style={styles.adjustLabel}>Budget right now</Text>
          <View style={styles.row}>
            {BUDGET_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.budget === option.value}
                onPress={() => onToggle('budget', option.value)}
              />
            ))}
          </View>

          <Text style={styles.adjustLabel}>Where are you?</Text>
          <View style={styles.row}>
            {LOCATION_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={context.location === option.value}
                onPress={() => onToggle('location', option.value)}
              />
            ))}
          </View>

          {budgetModeEnabled && onSelectBudgetFilter && (
            <>
              <Text style={styles.adjustLabel}>Budget</Text>
              <View style={styles.row}>
                {BUDGET_FILTER_OPTIONS.filter((option) => !option.requiresWeeklyBudget || weeklyBudgetSet).map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={budgetFilter === option.value}
                    onPress={() => onSelectBudgetFilter(budgetFilter === option.value ? null : option.value)}
                  />
                ))}
              </View>
            </>
          )}

          <Pressable onPress={onReset} hitSlop={8}>
            <Text style={styles.resetLink}>Reset today's context</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adjustLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  adjustLinkText: {
    color: colors.accentBlue,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  adjustPanel: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  adjustLabel: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginTop: spacing.xs,
  },
  resetLink: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
  },
});

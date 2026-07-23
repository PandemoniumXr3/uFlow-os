import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { colors, spacing, typography } from '@/constants/theme';
import type { OnboardingPriority } from '@/types/onboarding';

const PRIORITY_OPTIONS: { value: OnboardingPriority; label: string }[] = [
  { value: 'decideWhatToEat', label: 'Decide what to eat' },
  { value: 'planMeals', label: 'Plan meals' },
  { value: 'reduceWaste', label: 'Reduce food waste' },
  { value: 'manageSafeFoods', label: 'Manage safe and familiar foods' },
  { value: 'stayWithinBudget', label: 'Stay within a food budget' },
  { value: 'understandNutrition', label: 'Understand nutrition' },
  { value: 'connectGroceryStock', label: 'Keep Grocery and Stock connected' },
];

type PrioritiesStepProps = {
  selected: OnboardingPriority[];
  onToggle: (priority: OnboardingPriority) => void;
};

/** Onboarding Step 2 — multi-select, no minimum. Continue works with nothing chosen. */
export function PrioritiesStep({ selected, onToggle }: PrioritiesStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where should uFlow help first?</Text>
      <Text style={styles.subtitle}>Pick as many as you like — or none, and decide later.</Text>
      <View style={styles.chipRow}>
        {PRIORITY_OPTIONS.map((option) => (
          <Chip key={option.value} label={option.label} selected={selected.includes(option.value)} onPress={() => onToggle(option.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

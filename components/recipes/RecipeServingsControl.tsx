import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type RecipeServingsControlProps = {
  servings: number;
  onChange: (next: number) => void;
  min?: number;
};

/**
 * Live view-only servings selector — never mutates the stored recipe.
 * Callers scale ingredients/nutrition/cost from this value; the recipe's
 * own `servings` field is untouched until the user explicitly edits it via
 * Edit Recipe.
 */
export function RecipeServingsControl({ servings, onChange, min = 1 }: RecipeServingsControlProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Servings</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, servings - 1))}
          disabled={servings <= min}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Decrease servings"
          style={styles.stepButton}>
          <Ionicons name="remove-circle-outline" size={iconSize.lg} color={servings <= min ? colors.textTertiary : colors.textSecondary} />
        </Pressable>
        <Text style={styles.value} accessibilityLabel={`${servings} serving${servings === 1 ? '' : 's'}`}>
          {servings}
        </Text>
        <Pressable
          onPress={() => onChange(servings + 1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Increase servings"
          style={styles.stepButton}>
          <Ionicons name="add-circle-outline" size={iconSize.lg} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepButton: {
    padding: 2,
  },
  value: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
});

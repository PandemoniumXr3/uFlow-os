import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type { NutrientKey, NutritionInfo } from '@/types/nutrition';
import { resolveRecipeNutritionDisplay } from '@/utils/resolveNutritionDisplay';
import { scaleNutrition } from '@/utils/scaleNutrition';

type NutritionSectionProps = {
  nutrition: NutritionInfo | undefined;
  servings?: number;
  hiddenNutrients: ReadonlySet<NutrientKey>;
};

export function NutritionSection({ nutrition, servings, hiddenNutrients }: NutritionSectionProps) {
  const [viewMode, setViewMode] = useState<'perServing' | 'total'>('perServing');

  const canShowTotal = servings != null && servings > 1;
  const displayedNutrition = viewMode === 'total' && canShowTotal && nutrition ? scaleNutrition(nutrition, servings) : nutrition;
  const display = resolveRecipeNutritionDisplay(displayedNutrition, hiddenNutrients);

  if (display.isUnavailable) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nutrition unavailable</Text>
      </View>
    );
  }

  // Every row hidden by the user's own nutrient-visibility settings — respect that silently, no message needed.
  if (!display.kcalLabel && display.macroRows.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition · {viewMode === 'total' ? 'total recipe' : 'per serving'}</Text>
        {display.sourceLabel && <Text style={styles.source}>{display.sourceLabel}</Text>}
      </View>

      {canShowTotal && (
        <View style={styles.toggleRow}>
          <Chip label="Per serving" selected={viewMode === 'perServing'} onPress={() => setViewMode('perServing')} />
          <Chip label="Total recipe" selected={viewMode === 'total'} onPress={() => setViewMode('total')} />
        </View>
      )}

      <View style={styles.grid}>
        {display.kcalLabel && (
          <View style={styles.cell}>
            <Text style={styles.value}>{display.kcalLabel}</Text>
            <Text style={styles.label}>Calories</Text>
          </View>
        )}
        {display.macroRows.map((row) => (
          <View key={row.key} style={styles.cell}>
            <Text style={styles.value}>
              {Math.round(row.value * 10) / 10}
              <Text style={styles.unit}> {row.unit}</Text>
            </Text>
            <Text style={styles.label}>{row.label}</Text>
          </View>
        ))}
      </View>

      {nutrition?.servingSize && <Text style={styles.servingsNote}>Serving size: {nutrition.servingSize}</Text>}
      {servings && servings > 1 && viewMode === 'perServing' && (
        <Text style={styles.servingsNote}>Recipe makes {servings} servings — values above are per serving.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.sm,
  },
  emptyText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  source: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: {
    minWidth: 72,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.regular,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  servingsNote: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
  },
});

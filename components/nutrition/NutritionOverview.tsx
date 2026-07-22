import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import type { NutrientKey } from '@/types/nutrition';
import type { NutrientTotals } from '@/utils/nutrientTotals';
import { getVisibleTotalsRows } from '@/utils/nutrientTotalsRows';
import { resolveTotalsNutritionDisplay } from '@/utils/resolveNutritionDisplay';

const CORE_KEYS = ['protein', 'carbohydrate', 'fat', 'fiber'] as const;
const EXPANDED_KEYS = ['sugar', 'saturatedFat', 'sodium'] as const;

function formatMacroLine(rows: { value: number; unit: string; label: string }[]): string {
  return rows.map((row) => `${Math.round(row.value * 10) / 10}${row.unit} ${row.label.toLowerCase()}`).join(' · ');
}

type NutritionOverviewProps = {
  consumed: NutrientTotals;
  hasConsumedEntries: boolean;
  /** Whether any consumed entry actually carried nutrition data — distinct from "were any meals logged." Prevents a bogus "0 kcal". */
  consumedHasNutritionData: boolean;
  projected?: NutrientTotals;
  hasProjectedEntries?: boolean;
  projectedHasNutritionData?: boolean;
  hiddenNutrients: ReadonlySet<NutrientKey>;
  consumedLabel?: string;
  projectedLabel?: string;
  emptyText?: string;
};

/**
 * Calm, compact nutrition summary — one large kcal number plus a quiet macro
 * row, never a chart or medical-looking grid. Consumed and planned render as
 * visually distinct sections and are never summed together, so a planned
 * meal never inflates "what you've eaten." Uses resolveTotalsNutritionDisplay
 * as the one shared rule for what to show — never renders "0 kcal" for a
 * meal that simply had no nutrition data.
 */
export function NutritionOverview({
  consumed,
  hasConsumedEntries,
  consumedHasNutritionData,
  projected,
  hasProjectedEntries,
  projectedHasNutritionData,
  hiddenNutrients,
  consumedLabel = 'Consumed',
  projectedLabel = 'Planned',
  emptyText = 'Nothing logged yet.',
}: NutritionOverviewProps) {
  const [expanded, setExpanded] = useState(false);

  const consumedDisplay = resolveTotalsNutritionDisplay(consumed, consumedHasNutritionData, hiddenNutrients, [...CORE_KEYS]);
  const consumedExpandedRows = consumedHasNutritionData ? getVisibleTotalsRows(consumed, hiddenNutrients, [...EXPANDED_KEYS]) : [];
  const projectedDisplay = projected
    ? resolveTotalsNutritionDisplay(projected, projectedHasNutritionData ?? false, hiddenNutrients, [...CORE_KEYS])
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <Text style={styles.label}>{consumedLabel}</Text>
        {!hasConsumedEntries ? (
          <Text style={styles.emptyText}>{emptyText}</Text>
        ) : consumedDisplay.isUnavailable ? (
          <Text style={styles.emptyText}>Nutrition unavailable</Text>
        ) : (
          <>
            {consumedDisplay.kcalLabel && (
              <View style={styles.kcalRow}>
                <Text style={styles.kcalValue}>{consumedDisplay.kcalLabel}</Text>
              </View>
            )}
            {consumedDisplay.macroRows.length > 0 && <Text style={styles.macroLine}>{formatMacroLine(consumedDisplay.macroRows)}</Text>}
            {consumedExpandedRows.length > 0 && (
              <>
                <Pressable onPress={() => setExpanded(!expanded)} hitSlop={8}>
                  <Text style={styles.expandLink}>{expanded ? 'Show less' : 'Show more'}</Text>
                </Pressable>
                {expanded && <Text style={styles.macroLine}>{formatMacroLine(consumedExpandedRows)}</Text>}
              </>
            )}
          </>
        )}
      </View>

      {hasProjectedEntries && projectedDisplay && (
        <View style={styles.plannedBlock}>
          <Text style={styles.labelQuiet}>{projectedLabel}</Text>
          {projectedDisplay.isUnavailable ? (
            <Text style={styles.emptyText}>Nutrition unavailable</Text>
          ) : (
            <>
              {projectedDisplay.kcalLabel && (
                <View style={styles.kcalRow}>
                  <Text style={styles.kcalValuePlanned}>{projectedDisplay.kcalLabel}</Text>
                </View>
              )}
              {projectedDisplay.macroRows.length > 0 && <Text style={styles.macroLine}>{formatMacroLine(projectedDisplay.macroRows)}</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  block: {
    gap: 2,
  },
  plannedBlock: {
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  label: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  labelQuiet: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  emptyText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  kcalValue: {
    ...typography.role.numericHighlight,
    color: colors.textPrimary,
  },
  kcalValuePlanned: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  macroLine: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  expandLink: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
});

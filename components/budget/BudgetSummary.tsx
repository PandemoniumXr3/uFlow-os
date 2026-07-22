import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import type { CostEstimate } from '@/types/budget';
import { formatCents } from '@/utils/money';
import { resolveCostDisplay } from '@/utils/resolveCostDisplay';

type BudgetSummaryProps = {
  estimate: CostEstimate;
  /** e.g. "needed this week", "extra for this meal" — what the amount is the cost of. */
  label: string;
  remainingBudgetCents?: number;
  /** Optional compact bar, e.g. weekly spend vs. weekly budget. Never colored red — over-budget still reads calmly. */
  progress?: { spentCents: number; budgetCents: number };
};

/**
 * The one reusable cost/budget summary block — used from Today, Day Detail,
 * Week, Grocery, and Settings. Content only, no Card wrapper, so callers
 * compose it into whichever existing Card/section it belongs in rather than
 * stacking another bordered box. One hero amount + a quiet completeness
 * line, never a row of separate mini-stat tiles.
 */
export function BudgetSummary({ estimate, label, remainingBudgetCents, progress }: BudgetSummaryProps) {
  const display = resolveCostDisplay(estimate);
  const progressRatio = progress && progress.budgetCents > 0 ? Math.min(1, progress.spentCents / progress.budgetCents) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>{display.amountLabel ?? 'Cost unavailable'}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.completeness}>
        {display.completenessLabel}
        {remainingBudgetCents != null ? ` · ${formatCents(remainingBudgetCents)} remaining` : ''}
      </Text>

      {progressRatio != null && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  amount: {
    ...typography.role.numericHighlight,
    color: colors.textAccentSand,
  },
  label: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  completeness: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentOchreMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentOchre,
    borderRadius: 2,
  },
});

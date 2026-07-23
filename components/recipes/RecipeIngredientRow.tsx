import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, spacing, typography } from '@/constants/theme';
import type { RecipeIngredientLine } from '@/types/recipe';
import type { IngredientCoverage, IngredientStockStatus } from '@/utils/evaluateIngredientCoverage';

type RecipeIngredientRowProps = {
  line: RecipeIngredientLine;
  coverage: IngredientCoverage;
};

const STATUS_META: Record<IngredientStockStatus, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  inStock: { icon: 'checkmark-circle', label: 'In Stock', color: colors.accentGreen },
  partial: { icon: 'alert-circle', label: 'Partial', color: colors.accentOchre },
  missing: { icon: 'close-circle', label: 'Missing', color: colors.danger },
  alwaysAvailable: { icon: 'infinite', label: 'Always available', color: colors.accentCyan },
  unknown: { icon: 'help-circle-outline', label: 'Not linked', color: colors.textTertiary },
};

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 100) / 100);
}

/** One ingredient line — name/amount, optional flag, and a compact icon+text Stock status (never color alone). */
export function RecipeIngredientRow({ line, coverage }: RecipeIngredientRowProps) {
  const meta = STATUS_META[coverage.status];
  const amountLabel = line.quantity != null ? `${formatQuantity(line.quantity)}${line.unit ? ` ${line.unit}` : ''}` : undefined;

  const detailParts: string[] = [];
  if (coverage.status === 'partial' && coverage.availableQuantity != null && coverage.missingQuantity != null) {
    detailParts.push(`Have ${formatQuantity(coverage.availableQuantity)}${coverage.unit ?? ''}, need ${formatQuantity(coverage.missingQuantity)}${coverage.unit ?? ''} more`);
  } else if (coverage.status === 'missing' && coverage.missingQuantity != null) {
    detailParts.push(`Need ${formatQuantity(coverage.missingQuantity)}${coverage.unit ?? ''}`);
  }

  return (
    <View style={styles.row}>
      <View style={styles.nameColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {line.name}
          {line.optional && <Text style={styles.optionalTag}> · optional</Text>}
        </Text>
        {amountLabel && <Text style={styles.amount}>{amountLabel}</Text>}
        {line.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {line.notes}
          </Text>
        )}
        {detailParts.length > 0 && <Text style={styles.detail}>{detailParts.join(' · ')}</Text>}
      </View>
      <View style={styles.statusBadge} accessible accessibilityLabel={`${line.name}: ${meta.label}`}>
        <Ionicons name={meta.icon} size={iconSize.sm} color={meta.color} />
        <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  nameColumn: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.role.body,
    color: colors.textPrimary,
  },
  optionalTag: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  amount: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  notes: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  detail: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 2,
  },
  statusLabel: {
    ...typography.role.metadata,
    fontWeight: typography.weight.medium,
  },
});

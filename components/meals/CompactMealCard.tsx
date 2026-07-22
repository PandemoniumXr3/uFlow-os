import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { ExtraPurchaseCostEstimate } from '@/services/budget/estimateExtraPurchaseCost';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';
import { formatCents } from '@/utils/money';

type CompactMealCardProps = {
  recipe: Recipe;
  missingIngredientCount: number;
  /** Only the first is shown — a compact row stays a single line. */
  reasons: string[];
  isSafeMeal: boolean;
  plannedToday: boolean;
  costEstimate?: ExtraPurchaseCostEstimate;
  onTogglePlannedToday: () => void;
  onDismiss: () => void;
};

/** A quieter alternative suggestion — a single line of context and one obvious action, never competing with the hero card above it. */
export function CompactMealCard({ recipe, missingIngredientCount, reasons, isSafeMeal, plannedToday, costEstimate, onTogglePlannedToday, onDismiss }: CompactMealCardProps) {
  const reason = reasons[0];
  const costLabel =
    costEstimate && costEstimate.status !== 'unavailable'
      ? costEstimate.extraCostCents === 0
        ? 'No extra shopping'
        : `${formatCents(costEstimate.extraCostCents)} extra`
      : null;

  return (
    <Card variant="compact" style={styles.card}>
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {recipe.time} min
          {isSafeMeal ? ' · Safe meal' : ''}
          {` · ${missingIngredientCount === 0 ? 'In stock' : `Missing ${missingIngredientCount}`}`}
          {costLabel ? ` · ${costLabel}` : ''}
          {reason ? ` · ${reason}` : ''}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel={`Not ${recipe.name}`} style={styles.iconButton}>
          <Ionicons name="close" size={iconSize.sm} color={colors.textTertiary} />
        </Pressable>
        <Pressable
          onPress={onTogglePlannedToday}
          hitSlop={8}
          accessibilityLabel={plannedToday ? `${recipe.name} chosen for today` : `Choose ${recipe.name} for today`}
          style={styles.iconButton}>
          <Ionicons name={plannedToday ? 'checkmark-circle' : 'checkmark-circle-outline'} size={iconSize.lg} color={plannedToday ? colors.accentGreen : colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
});

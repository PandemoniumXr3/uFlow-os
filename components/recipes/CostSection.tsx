import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { estimateExtraPurchaseCost } from '@/services/budget/estimateExtraPurchaseCost';
import { estimateRecipeCost } from '@/services/budget/estimateRecipeCost';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { formatCents } from '@/utils/money';
import { resolveCostDisplay } from '@/utils/resolveCostDisplay';

type CostSectionProps = {
  recipe: Recipe;
  products: Product[];
  inventoryItems: InventoryItem[];
  /** Live servings override (e.g. Recipe Detail's servings control) — defaults to the recipe's own base servings when absent. */
  targetServings?: number;
  /** Also shows the Stock-aware "extra to buy" figure below the recipe total — off by default since the plain recipe list doesn't need it. */
  showExtraPurchaseCost?: boolean;
};

/** Mirrors NutritionSection's per-serving/total toggle and quiet-unavailable state, so cost and nutrition read as one family of detail sections. */
export function CostSection({ recipe, products, inventoryItems, targetServings, showExtraPurchaseCost }: CostSectionProps) {
  const [viewMode, setViewMode] = useState<'perServing' | 'total'>('perServing');
  const effectiveServings = targetServings ?? recipe.servings ?? 1;
  const canShowTotal = effectiveServings > 1;

  const estimate = estimateRecipeCost(recipe, products, inventoryItems, targetServings);
  const display = resolveCostDisplay(estimate);

  const extraEstimate = showExtraPurchaseCost ? estimateExtraPurchaseCost(recipe, products, inventoryItems, targetServings) : null;
  const extraDisplay = extraEstimate && extraEstimate.status !== 'unavailable' ? resolveCostDisplay(extraEstimate) : null;

  if (display.isUnavailable) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Cost unavailable — add ingredient amounts under Instructions & tags, then record prices in Stock.</Text>
      </View>
    );
  }

  const perServingLabel = estimate.costPerServingCents != null ? formatCents(estimate.costPerServingCents) : display.amountLabel;
  const amountLabel = viewMode === 'total' ? display.amountLabel : perServingLabel;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cost · {viewMode === 'total' ? 'total recipe' : 'per serving'}</Text>
        <Text style={styles.source}>{display.completenessLabel}</Text>
      </View>

      {canShowTotal && (
        <View style={styles.toggleRow}>
          <Chip label="Per serving" selected={viewMode === 'perServing'} onPress={() => setViewMode('perServing')} />
          <Chip label="Total recipe" selected={viewMode === 'total'} onPress={() => setViewMode('total')} />
        </View>
      )}

      <Text style={styles.value}>{amountLabel}</Text>

      {extraDisplay && (
        <Text style={styles.extraNote}>
          {extraEstimate!.knownCostCents === 0 ? 'No extra shopping needed' : `${extraDisplay.amountLabel} extra to buy what's missing`}
        </Text>
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
  value: {
    color: colors.textAccentSand,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
  },
  extraNote: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

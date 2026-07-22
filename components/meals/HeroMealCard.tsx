import { StyleSheet, Text, View } from 'react-native';

import { PlanForDayChips } from '@/components/meals/PlanForDayChips';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ExtraPurchaseCostEstimate } from '@/services/budget/estimateExtraPurchaseCost';
import { colors, spacing, typography } from '@/constants/theme';
import type { NutrientKey } from '@/types/nutrition';
import type { Recipe } from '@/types/recipe';
import { formatCents } from '@/utils/money';
import { resolveRecipeNutritionDisplay } from '@/utils/resolveNutritionDisplay';

const CORE_NUTRIENT_KEYS: NutrientKey[] = ['kcal', 'protein', 'carbohydrate', 'fat'];

/** The single most useful cost signal for this card — omitted entirely when unavailable, never a cluttered breakdown. */
function costMetaLabel(costEstimate: ExtraPurchaseCostEstimate | undefined): string | null {
  if (!costEstimate || costEstimate.status === 'unavailable') return null;
  return costEstimate.extraCostCents === 0 ? 'No extra shopping' : `${formatCents(costEstimate.extraCostCents)} extra`;
}

type HeroMealCardProps = {
  recipe: Recipe;
  missingIngredientCount: number;
  /** Up to three short "why this" lines from the decision engine — never recomputed here. */
  reasons: string[];
  /** Separate from reasons — surfaced quietly, never counted toward the three-reason cap. */
  warnings?: string[];
  isSafeMeal: boolean;
  plannedToday: boolean;
  isPlannedOnDate: (date: string) => boolean;
  nutritionTrackingEnabled: boolean;
  hiddenNutrients: ReadonlySet<NutrientKey>;
  costEstimate?: ExtraPurchaseCostEstimate;
  onTogglePlannedToday: () => void;
  onTogglePlannedOnDate: (date: string) => void;
  onDismiss: () => void;
};

/** The one featured suggestion on Today — intentionally larger and calmer than everything below it, never just "card #1 of 3". */
export function HeroMealCard({
  recipe,
  missingIngredientCount,
  reasons,
  warnings,
  isSafeMeal,
  plannedToday,
  isPlannedOnDate,
  nutritionTrackingEnabled,
  hiddenNutrients,
  costEstimate,
  onTogglePlannedToday,
  onTogglePlannedOnDate,
  onDismiss,
}: HeroMealCardProps) {
  const nutritionDisplay = nutritionTrackingEnabled
    ? resolveRecipeNutritionDisplay(recipe.nutrition, hiddenNutrients, CORE_NUTRIENT_KEYS)
    : { kcalLabel: null, macroRows: [], sourceLabel: null, isUnavailable: true };
  const costLabel = costMetaLabel(costEstimate);

  return (
    <Card variant="hero" style={styles.card}>
      {reasons.length > 0 && <Text style={styles.reason}>{reasons.join(' · ')}</Text>}
      <Text style={styles.name} numberOfLines={2}>
        {recipe.name}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{recipe.time} min</Text>
        {isSafeMeal && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaSafe}>Safe meal</Text>
          </>
        )}
        <Text style={styles.metaDot}>·</Text>
        <Text style={missingIngredientCount === 0 ? styles.metaOk : styles.metaWarn}>
          {missingIngredientCount === 0 ? 'Everything in stock' : `Missing ${missingIngredientCount}`}
        </Text>
        {costLabel && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaCost}>{costLabel}</Text>
          </>
        )}
      </View>

      {nutritionDisplay.kcalLabel && (
        <View style={styles.nutritionRow}>
          <Text style={styles.kcalValue}>{nutritionDisplay.kcalLabel}</Text>
          {nutritionDisplay.macroRows.length > 0 && (
            <Text style={styles.macroLine}>
              {nutritionDisplay.macroRows.map((row) => `${Math.round(row.value)}${row.unit} ${row.label.toLowerCase()}`).join(' · ')}
            </Text>
          )}
        </View>
      )}

      {warnings && warnings.length > 0 && <Text style={styles.warning}>{warnings.join(' · ')}</Text>}

      <View style={styles.actions}>
        <Button label={plannedToday ? 'Chosen for today' : 'Choose this'} onPress={onTogglePlannedToday} />
        <View style={styles.secondaryRow}>
          <PlanForDayChips isPlannedOnDate={isPlannedOnDate} onTogglePlannedOnDate={onTogglePlannedOnDate} />
          <Button label="Not this" variant="quiet" compact onPress={onDismiss} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  reason: {
    ...typography.role.label,
    color: colors.textAccentSand,
  },
  name: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  meta: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
  metaDot: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  metaSafe: {
    ...typography.role.bodySecondary,
    color: colors.accentGreen,
  },
  metaOk: {
    ...typography.role.bodySecondary,
    color: colors.accentGreen,
  },
  metaWarn: {
    ...typography.role.bodySecondary,
    color: colors.accentOchre,
  },
  metaCost: {
    ...typography.role.bodySecondary,
    color: colors.textAccentSand,
  },
  nutritionRow: {
    marginTop: spacing.xs,
    gap: 2,
  },
  kcalValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  kcalUnit: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  macroLine: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  warning: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

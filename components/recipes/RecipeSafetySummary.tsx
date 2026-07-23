import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { evaluateHardConstraints } from '@/services/decision/evaluateHardConstraints';
import type { HardExclusionReasonType } from '@/services/decision/types';
import type { DietProfile } from '@/types/diet';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { ToleranceProfile } from '@/types/tolerance';

type RecipeSafetySummaryProps = {
  recipe: Recipe;
  toleranceProfile: ToleranceProfile;
  dietProfile: DietProfile;
  avoidedProductIds: ReadonlySet<string>;
  permanentlyHiddenRecipeIds: ReadonlySet<string>;
  products: Product[];
  isSafeMeal: boolean;
};

const HARD_REASON_ICON: Record<HardExclusionReasonType, keyof typeof Ionicons.glyphMap> = {
  allergy: 'warning',
  intolerance: 'warning',
  diet: 'leaf-outline',
  avoidedIngredient: 'close-circle',
  permanentlyHidden: 'eye-off-outline',
};

/**
 * Hard safety/diet conflicts (allergy, intolerance, unmet diet, avoided
 * ingredient) via the same evaluateHardConstraints the Decision Engine uses
 * for ranking — never a separately derived check. Rendered visually
 * distinct (danger-colored panel, icon per reason) from ordinary
 * preferences; a clean recipe shows one quiet confirming line instead.
 */
export function RecipeSafetySummary({
  recipe,
  toleranceProfile,
  dietProfile,
  avoidedProductIds,
  permanentlyHiddenRecipeIds,
  products,
  isSafeMeal,
}: RecipeSafetySummaryProps) {
  const result = evaluateHardConstraints(recipe, { toleranceProfile, dietProfile, avoidedProductIds, permanentlyHiddenRecipeIds, products });

  return (
    <View style={styles.container}>
      {result.passed ? (
        <View style={styles.cleanRow}>
          <Ionicons name="checkmark-circle-outline" size={iconSize.sm} color={colors.accentGreen} />
          <Text style={styles.cleanText}>No diet, allergy, or intolerance conflicts found</Text>
        </View>
      ) : (
        <View style={styles.conflictPanel}>
          {result.reasons.map((reason, index) => (
            <View key={`${reason.type}-${index}`} style={styles.conflictRow}>
              <Ionicons name={HARD_REASON_ICON[reason.type]} size={iconSize.sm} color={colors.danger} />
              <Text style={styles.conflictText}>{reason.label}</Text>
            </View>
          ))}
        </View>
      )}

      {isSafeMeal && (
        <View style={styles.cleanRow}>
          <Ionicons name="shield-checkmark" size={iconSize.sm} color={colors.accentGreen} />
          <Text style={styles.cleanText}>Marked as a safe, familiar meal</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cleanText: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
    flex: 1,
  },
  conflictPanel: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: spacing.xs,
  },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conflictText: {
    ...typography.role.bodySecondary,
    color: colors.danger,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
});

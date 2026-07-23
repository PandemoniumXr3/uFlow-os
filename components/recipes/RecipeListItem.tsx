import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CostSection } from '@/components/recipes/CostSection';
import { NutritionSection } from '@/components/recipes/NutritionSection';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EFFORT_OPTIONS, MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { InventoryItem } from '@/types/inventory';
import type { NutrientKey } from '@/types/nutrition';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { labelFor } from '@/utils/optionLabels';

type RecipeListItemProps = {
  recipe: Recipe;
  availability: RecipeAvailability;
  flaggedTolerances: string[];
  unmetDiets: string[];
  isSafeMeal: boolean;
  showNutrition: boolean;
  hiddenNutrients: ReadonlySet<NutrientKey>;
  budgetModeEnabled: boolean;
  products: Product[];
  inventoryItems: InventoryItem[];
  onToggleFavorite: (id: string) => void;
  onToggleSafeMeal: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Collapsed by default — name, meta, and availability at a glance; everything else (instructions, warnings, nutrition) sits behind a tap so the list doesn't read like a wall of text. */
export function RecipeListItem({
  recipe,
  availability,
  flaggedTolerances,
  unmetDiets,
  isSafeMeal,
  showNutrition,
  hiddenNutrients,
  budgetModeEnabled,
  products,
  inventoryItems,
  onToggleFavorite,
  onToggleSafeMeal,
  onRemove,
}: RecipeListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const reducedMotion = useReducedMotionPreference();
  const mealTypeLabel = recipe.mealType.map((type) => labelFor(MEAL_TYPE_OPTIONS, type)).join(', ');
  const effortLabel = labelFor(EFFORT_OPTIONS, recipe.effort);
  const fullyAvailable = availability.missing.length === 0 && availability.low.length === 0;
  const hasWarnings = unmetDiets.length > 0 || flaggedTolerances.length > 0;

  return (
    <Animated.View layout={layoutTransition(reducedMotion)}>
      <Card variant="standard" style={styles.card}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.meta}>
            {mealTypeLabel} · {effortLabel} · {recipe.time} min
          </Text>
        </View>
        {availability.total > 0 && (
          <View style={styles.availabilityBadge}>
            <Ionicons
              name={fullyAvailable ? 'checkmark-circle' : hasWarnings || availability.missing.length > 0 ? 'alert-circle' : 'ellipse'}
              size={iconSize.sm}
              color={fullyAvailable ? colors.accentGreen : colors.accentOchre}
            />
          </View>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
      </Pressable>

      {expanded && (
        <Animated.View style={styles.detail} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
          <View style={styles.actions}>
            <IconButton
              icon={isSafeMeal ? 'shield-checkmark' : 'shield-checkmark-outline'}
              variant="safe"
              accessibilityLabel={isSafeMeal ? `Unmark ${recipe.name} as a safe meal` : `Mark ${recipe.name} as a safe meal`}
              onPress={() => onToggleSafeMeal(recipe.id)}
            />
            <IconButton
              icon={recipe.isFavorite ? 'heart' : 'heart-outline'}
              variant="favorite"
              accessibilityLabel={recipe.isFavorite ? `Unfavorite ${recipe.name}` : `Favorite ${recipe.name}`}
              onPress={() => onToggleFavorite(recipe.id)}
            />
            <IconButton icon="trash-outline" variant="danger" accessibilityLabel={`Remove ${recipe.name}`} onPress={() => setConfirmRemove(true)} />
          </View>

          {recipe.categories.length > 0 && <Text style={styles.categories}>{recipe.categories.join(', ')}</Text>}

          <View style={styles.metaRow}>
            {availability.total > 0 && (
              <Text style={fullyAvailable ? styles.metaOk : styles.metaWarn}>
                {availability.total - availability.missing.length} / {availability.total} ingredients available
              </Text>
            )}
            {availability.low.length > 0 && <Text style={styles.metaWarn}>Low stock: {availability.low.join(', ')}</Text>}
            {availability.missing.length > 0 && <Text style={styles.metaDanger}>Missing: {availability.missing.join(', ')}</Text>}
            {unmetDiets.length > 0 && <Text style={styles.metaWarn}>Not: {unmetDiets.join(', ')}</Text>}
            {flaggedTolerances.length > 0 && <Text style={styles.metaDanger}>Contains: {flaggedTolerances.join(', ')}</Text>}
          </View>

          {recipe.instructions ? <Text style={styles.instructions}>{recipe.instructions}</Text> : null}

          {showNutrition && <NutritionSection nutrition={recipe.nutrition} servings={recipe.servings} hiddenNutrients={hiddenNutrients} />}

          {budgetModeEnabled && <CostSection recipe={recipe} products={products} inventoryItems={inventoryItems} />}
        </Animated.View>
      )}
      </Card>

      <ConfirmDialog
        visible={confirmRemove}
        title="Remove this recipe?"
        message={`"${recipe.name}" will be permanently removed. Meals already logged or planned from it are unaffected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove(recipe.id);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  availabilityBadge: {
    paddingHorizontal: 2,
  },
  detail: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categories: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaOk: {
    ...typography.role.bodySecondary,
    color: colors.accentGreen,
  },
  metaWarn: {
    ...typography.role.bodySecondary,
    color: colors.accentOchre,
  },
  metaDanger: {
    ...typography.role.bodySecondary,
    color: colors.danger,
    fontWeight: typography.weight.medium,
  },
  instructions: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { EFFORT_OPTIONS, MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';
import type { RecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { labelFor } from '@/utils/optionLabels';

type RecipeListItemProps = {
  recipe: Recipe;
  availability: RecipeAvailability;
  hasSafetyConflict: boolean;
  isSafeMeal: boolean;
  onPress: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleSafeMeal: (id: string) => void;
};

/**
 * A compact, scannable row — name, quick meta, favorite/safe state, and an
 * availability badge. Tapping opens the real Recipe Detail screen; this no
 * longer expands inline (Nutrition, Budget, Safety, and instructions all
 * moved to Detail, which has room to show them properly).
 */
export function RecipeListItem({ recipe, availability, hasSafetyConflict, isSafeMeal, onPress, onToggleFavorite, onToggleSafeMeal }: RecipeListItemProps) {
  const mealTypeLabel = recipe.mealType.map((type) => labelFor(MEAL_TYPE_OPTIONS, type)).join(', ');
  const effortLabel = labelFor(EFFORT_OPTIONS, recipe.effort);
  const fullyAvailable = availability.missing.length === 0 && availability.low.length === 0;

  return (
    <Card variant="standard" style={styles.card}>
      <View style={styles.row}>
        {/* A Pressable's own accessibilityRole="button" would render as a nested <button> around the
            IconButtons below on web, which is invalid HTML — so only this inner tappable area (which
            contains no other interactive elements) carries the button role; the icon actions are siblings. */}
        <Pressable onPress={onPress} style={styles.openArea} accessibilityRole="button" accessibilityLabel={`Open ${recipe.name}`}>
          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {recipe.name}
            </Text>
            <Text style={styles.meta}>
              {mealTypeLabel} · {effortLabel} · {recipe.time} min
            </Text>
          </View>

          {availability.total > 0 && (
            <Ionicons
              name={fullyAvailable ? 'checkmark-circle' : hasSafetyConflict || availability.missing.length > 0 ? 'alert-circle' : 'ellipse'}
              size={iconSize.sm}
              color={fullyAvailable ? colors.accentGreen : hasSafetyConflict ? colors.danger : colors.accentOchre}
            />
          )}
        </Pressable>

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
        </View>
        <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Open ${recipe.name}`}>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  openArea: {
    flex: 1,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

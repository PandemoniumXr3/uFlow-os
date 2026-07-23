import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { EFFORT_OPTIONS, MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { colors, spacing, typography } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';
import { labelFor } from '@/utils/optionLabels';

type RecipeHeaderProps = {
  recipe: Recipe;
  isSafeMeal: boolean;
  onToggleFavorite: () => void;
  onToggleSafeMeal: () => void;
};

/** Name, at-a-glance meta, and the two toggleable identity states — favorite and safe/familiar — for Recipe Detail's top of screen. */
export function RecipeHeader({ recipe, isSafeMeal, onToggleFavorite, onToggleSafeMeal }: RecipeHeaderProps) {
  const mealTypeLabel = recipe.mealType.map((type) => labelFor(MEAL_TYPE_OPTIONS, type)).join(', ');
  const effortLabel = labelFor(EFFORT_OPTIONS, recipe.effort);
  const metaParts = [mealTypeLabel, `${effortLabel} effort`, `${recipe.time} min`, recipe.servings ? `${recipe.servings} servings` : undefined].filter(
    (part): part is string => !!part
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{recipe.name}</Text>
        <View style={styles.actions}>
          <IconButton
            icon={isSafeMeal ? 'shield-checkmark' : 'shield-checkmark-outline'}
            variant="safe"
            accessibilityLabel={isSafeMeal ? `Unmark ${recipe.name} as a safe meal` : `Mark ${recipe.name} as a safe meal`}
            onPress={onToggleSafeMeal}
          />
          <IconButton
            icon={recipe.isFavorite ? 'heart' : 'heart-outline'}
            variant="favorite"
            accessibilityLabel={recipe.isFavorite ? `Unfavorite ${recipe.name}` : `Favorite ${recipe.name}`}
            onPress={onToggleFavorite}
          />
        </View>
      </View>
      <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.role.sectionHeading,
    fontSize: 24,
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  meta: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
});

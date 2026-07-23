import { StyleSheet, Text, View } from 'react-native';

import { RecipeIngredientRow } from '@/components/recipes/RecipeIngredientRow';
import { colors, spacing, typography } from '@/constants/theme';
import type { InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import type { RecipeIngredientLine } from '@/types/recipe';
import { evaluateIngredientCoverage } from '@/utils/evaluateIngredientCoverage';

type RecipeIngredientListProps = {
  /** Plain ingredient names — always present, always the tolerance/diet/availability source of truth. */
  ingredients: string[];
  /** Structured lines already scaled to the selected servings — absent for legacy/un-edited recipes. */
  ingredientLines?: RecipeIngredientLine[];
  products: Product[];
  inventoryItems: InventoryItem[];
  alwaysInStockProductIds: ReadonlySet<string>;
};

/**
 * Renders structured rows (name/amount/Stock coverage) when the recipe has
 * ingredientLines; otherwise falls back to the plain name list with an
 * honest "add amounts to see Stock coverage" note — never fabricates
 * quantities or coverage for a legacy recipe.
 */
export function RecipeIngredientList({ ingredients, ingredientLines, products, inventoryItems, alwaysInStockProductIds }: RecipeIngredientListProps) {
  if (!ingredientLines || ingredientLines.length === 0) {
    return (
      <View style={styles.container}>
        {ingredients.map((name) => (
          <Text key={name} style={styles.plainIngredient}>
            {name}
          </Text>
        ))}
        <Text style={styles.incompleteNote}>
          Add quantities to this recipe (via Edit) to see Stock coverage, Nutrition, and cost per ingredient.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ingredientLines.map((line, index) => (
        <View key={line.id ?? `${line.name}-${index}`}>
          {index > 0 && <View style={styles.divider} />}
          <RecipeIngredientRow line={line} coverage={evaluateIngredientCoverage(line, products, inventoryItems, alwaysInStockProductIds)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  plainIngredient: {
    ...typography.role.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  incompleteNote: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});

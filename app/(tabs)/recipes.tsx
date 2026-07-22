import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

import { AddRecipeForm } from '@/components/recipes/AddRecipeForm';
import { RecipeListItem } from '@/components/recipes/RecipeListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { useDiet } from '@/hooks/useDiet';
import { useInventory } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useSafeMeals } from '@/hooks/useSafeMeals';
import { useTolerance } from '@/hooks/useTolerance';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { findUnmetDiets } from '@/utils/matchDiet';
import { findFlaggedTolerances } from '@/utils/matchTolerance';

export default function RecipesScreen() {
  const { recipes, isLoading, addRecipe, removeRecipe, toggleFavorite } = useRecipes();
  const { products } = useProducts();
  const { items: inventoryItems } = useInventory();
  const { profile: toleranceProfile } = useTolerance();
  const { profile: dietProfile } = useDiet();
  const { profile: safeMealsProfile, isSafeMeal, toggleSafeMeal, setShowSafeOnly } = useSafeMeals();
  const { profile: userProfile, hiddenNutrients, budgetPreferences } = useProfile();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

  const visibleRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      if (toleranceProfile.safeMealsOnly && findFlaggedTolerances(recipe.ingredients, toleranceProfile).length > 0) {
        return false;
      }
      if (dietProfile.matchDietOnly && findUnmetDiets(recipe.categories, dietProfile).length > 0) {
        return false;
      }
      if (safeMealsProfile.showSafeOnly && !isSafeMeal(recipe.id)) {
        return false;
      }
      return true;
    });
  }, [recipes, toleranceProfile, dietProfile, safeMealsProfile, isSafeMeal]);

  return (
    <Screen>
      <PageHeader title="Recipes" subtitle="Save what you cook" onSettingsPress={() => router.push('/settings')} />
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Only show safe meals</Text>
        <Switch
          value={safeMealsProfile.showSafeOnly}
          onValueChange={setShowSafeOnly}
          trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
          thumbColor={safeMealsProfile.showSafeOnly ? colors.accentBlue : colors.textTertiary}
        />
      </View>
      <View style={styles.addAction}>
        <Button label={showAddForm ? 'Close' : 'Add recipe'} variant={showAddForm ? 'secondary' : 'primary'} onPress={() => setShowAddForm(!showAddForm)} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <AddRecipeForm
            onSubmit={(recipe) => {
              addRecipe(recipe);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
            nutritionTrackingEnabled={userProfile?.nutritionTrackingEnabled ?? false}
            budgetModeEnabled={budgetPreferences.enabled}
          />
        )}

        {!isLoading && recipes.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No recipes yet"
            description="Add your first recipe using the form above."
          />
        ) : !isLoading && visibleRecipes.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Nothing matches right now"
            description="Your current filters are hiding every recipe. Adjust them in Settings or turn off 'Only show safe meals' above."
          />
        ) : (
          <View style={styles.list}>
            {visibleRecipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                recipe={recipe}
                availability={calculateRecipeAvailability(recipe.ingredients, products, inventoryItems)}
                flaggedTolerances={findFlaggedTolerances(recipe.ingredients, toleranceProfile)}
                unmetDiets={findUnmetDiets(recipe.categories, dietProfile)}
                isSafeMeal={isSafeMeal(recipe.id)}
                showNutrition={userProfile?.nutritionTrackingEnabled ?? false}
                hiddenNutrients={hiddenNutrients}
                budgetModeEnabled={budgetPreferences.enabled}
                products={products}
                inventoryItems={inventoryItems}
                onToggleFavorite={toggleFavorite}
                onToggleSafeMeal={toggleSafeMeal}
                onRemove={removeRecipe}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  filterLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  addAction: {
    paddingBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});

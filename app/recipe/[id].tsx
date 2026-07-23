import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CostSection } from '@/components/recipes/CostSection';
import { NutritionSection } from '@/components/recipes/NutritionSection';
import { RecipeDeleteDialog } from '@/components/recipes/RecipeDeleteDialog';
import { RecipeHeader } from '@/components/recipes/RecipeHeader';
import { RecipeIngredientList } from '@/components/recipes/RecipeIngredientList';
import { RecipeInstructionList } from '@/components/recipes/RecipeInstructionList';
import { RecipeSafetySummary } from '@/components/recipes/RecipeSafetySummary';
import { RecipeServingsControl } from '@/components/recipes/RecipeServingsControl';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Screen } from '@/components/ui/Screen';
import { MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useDiet } from '@/hooks/useDiet';
import { useDismissals } from '@/hooks/useDismissals';
import { useInventory } from '@/hooks/useInventory';
import { useMealLog } from '@/hooks/useMealLog';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useSafeMeals } from '@/hooks/useSafeMeals';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useTolerance } from '@/hooks/useTolerance';
import type { MealType, Recipe } from '@/types/recipe';
import { calculateRecipeAvailability } from '@/utils/calculateRecipeAvailability';
import { evaluateIngredientCoverage } from '@/utils/evaluateIngredientCoverage';
import { countRecipeReferences } from '@/utils/countRecipeReferences';
import { addDaysToKey, formatFriendlyDate, getTodayKey, isToday } from '@/utils/date';
import { labelFor } from '@/utils/optionLabels';
import { scaleIngredientLines } from '@/utils/scaleIngredientLines';

const PLAN_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { recipes, isLoading: recipesLoading, toggleFavorite, removeRecipe, restoreRecipe } = useRecipes();
  const { products, isLoading: productsLoading } = useProducts();
  const { items: inventoryItems } = useInventory();
  const { alwaysInStockIds, avoidedProductIds } = useProductPreferences(products, productsLoading);
  const { profile: toleranceProfile } = useTolerance();
  const { profile: dietProfile } = useDiet();
  const { safeMealIds, isSafeMeal, toggleSafeMeal } = useSafeMeals();
  const { profile, hiddenNutrients, budgetPreferences } = useProfile();
  const { permanentlyHiddenIds } = useDismissals();
  const mealPlan = useMealPlan();
  const mealLog = useMealLog();
  const shoppingList = useShoppingList({
    recipes,
    products,
    inventoryItems,
    alwaysInStockProductIds: alwaysInStockIds,
    plannedMeals: mealPlan.entries,
    inputsLoading: productsLoading || mealPlan.isLoading,
  });

  const recipe = recipes.find((candidate) => candidate.id === id);

  // recipesLoading gates the main render below, but hooks still run on that
  // first (loading) pass, when `recipe` is always undefined — so these can't
  // be initialized directly from `recipe` in useState. This effect performs
  // the one-time sync once real data is available, without ever overwriting
  // a serving count or meal slot the user has since changed.
  const [initialized, setInitialized] = useState(false);
  const [selectedServings, setSelectedServings] = useState(1);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [planSlot, setPlanSlot] = useState<MealType | undefined>(undefined);
  const [planDayOffset, setPlanDayOffset] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedSnapshot, setDeletedSnapshot] = useState<Recipe | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (recipe && !initialized) {
      setSelectedServings(recipe.servings ?? 1);
      setPlanSlot(recipe.mealType[0]);
      setInitialized(true);
    }
  }, [recipe, initialized]);

  const scaledIngredientLines = useMemo(() => {
    if (!recipe?.ingredientLines) return undefined;
    return scaleIngredientLines(recipe.ingredientLines, recipe.servings ?? 1, selectedServings);
  }, [recipe, selectedServings]);

  const availability = useMemo(
    () => (recipe ? calculateRecipeAvailability(recipe.ingredients, products, inventoryItems) : null),
    [recipe, products, inventoryItems]
  );

  // Same coverage check the ingredient list and addMissingToGrocery use — so the button only shows when it would actually add something.
  const hasAddableMissingIngredients = useMemo(() => {
    if (scaledIngredientLines && scaledIngredientLines.length > 0) {
      return scaledIngredientLines.some((line) => {
        const status = evaluateIngredientCoverage(line, products, inventoryItems, alwaysInStockIds).status;
        return status === 'missing' || status === 'partial';
      });
    }
    return (availability?.missing.length ?? 0) > 0;
  }, [scaledIngredientLines, products, inventoryItems, alwaysInStockIds, availability]);

  const { plannedMealCount, historyCount } = useMemo(
    () => (recipe ? countRecipeReferences(recipe.id, mealPlan.entries, mealLog.entries) : { plannedMealCount: 0, historyCount: 0 }),
    [recipe, mealPlan.entries, mealLog.entries]
  );

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function confirmPlanMeal() {
    if (!recipe || !planSlot) return;
    const date = addDaysToKey(getTodayKey(), planDayOffset);
    mealPlan.addPlannedMeal({ date, recipeId: recipe.id, mealSlot: planSlot, servings: selectedServings });
    setPlanPanelOpen(false);
    showToast(`Planned for ${isToday(date) ? 'today' : formatFriendlyDate(date)}`);
  }

  function addMissingToGrocery() {
    if (!recipe) return;
    let added = 0;

    if (scaledIngredientLines && scaledIngredientLines.length > 0) {
      // Consistent with what the ingredient list itself shows as Missing/Partial/Always available —
      // never re-derives a separate classification that could disagree with the badge on screen.
      for (const line of scaledIngredientLines) {
        const coverage = evaluateIngredientCoverage(line, products, inventoryItems, alwaysInStockIds);
        if (coverage.status !== 'missing' && coverage.status !== 'partial') continue;
        const quantity = coverage.status === 'partial' ? coverage.missingQuantity : line.quantity;
        shoppingList.addManualItem({ displayName: line.name, productId: line.productId, quantity, unit: line.unit });
        added += 1;
      }
    } else if (availability) {
      // Legacy recipe with no structured ingredient lines — nothing more precise to go on than the plain name list.
      for (const missingName of availability.missing) {
        shoppingList.addManualItem({ displayName: missingName });
        added += 1;
      }
    }

    if (added > 0) showToast(`Added ${added} item${added === 1 ? '' : 's'} to Grocery`);
  }

  function handleDeleteConfirm() {
    if (!recipe) return;
    setDeletedSnapshot(recipe);
    removeRecipe(recipe.id);
    setConfirmDelete(false);
  }

  function handleUndoDelete() {
    if (!deletedSnapshot) return;
    restoreRecipe(deletedSnapshot);
    setDeletedSnapshot(undefined);
  }

  if (recipesLoading) return <Screen />;

  if (deletedSnapshot) {
    return (
      <Screen>
        <View style={styles.deletedContainer}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.accentGreen} />
          <Text style={styles.deletedTitle}>"{deletedSnapshot.name}" deleted</Text>
          <View style={styles.deletedActions}>
            <Button label="Undo" onPress={handleUndoDelete} />
            <Button label="Back to Recipes" variant="quiet" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen>
        <View style={styles.header}>
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        <Text style={styles.notFoundText}>This recipe is no longer available.</Text>
      </Screen>
    );
  }

  const canPlan = recipe.mealType.length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron-back" accessibilityLabel="Back to Recipes" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          <IconButton
            icon="create-outline"
            accessibilityLabel={`Edit ${recipe.name}`}
            onPress={() => router.push({ pathname: '/recipe/[id]/edit', params: { id: recipe.id } })}
          />
          <IconButton icon="trash-outline" variant="danger" accessibilityLabel={`Delete ${recipe.name}`} onPress={() => setConfirmDelete(true)} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <RecipeHeader
          recipe={recipe}
          isSafeMeal={isSafeMeal(recipe.id)}
          onToggleFavorite={() => toggleFavorite(recipe.id)}
          onToggleSafeMeal={() => toggleSafeMeal(recipe.id)}
        />

        <Card variant="standard" style={styles.servingsCard}>
          <RecipeServingsControl servings={selectedServings} onChange={setSelectedServings} />
        </Card>

        <View style={styles.actionsRow}>
          {canPlan && <Button label="Plan meal" compact onPress={() => setPlanPanelOpen(!planPanelOpen)} />}
          {hasAddableMissingIngredients && (
            <Button label="Add missing to Grocery" variant="secondary" compact onPress={addMissingToGrocery} />
          )}
        </View>

        {planPanelOpen && (
          <Card variant="insight" style={styles.planPanel}>
            <Text style={styles.planLabel}>Meal</Text>
            <View style={styles.chipRow}>
              {recipe.mealType.map((slot) => (
                <Chip key={slot} label={labelFor(MEAL_TYPE_OPTIONS, slot)} selected={planSlot === slot} onPress={() => setPlanSlot(slot)} />
              ))}
            </View>
            <Text style={styles.planLabel}>Day</Text>
            <View style={styles.chipRow}>
              {PLAN_DAY_OFFSETS.map((offset) => {
                const date = addDaysToKey(getTodayKey(), offset);
                return (
                  <Chip
                    key={offset}
                    label={isToday(date) ? 'Today' : formatFriendlyDate(date)}
                    selected={planDayOffset === offset}
                    onPress={() => setPlanDayOffset(offset)}
                  />
                );
              })}
            </View>
            <Button label="Confirm" compact onPress={confirmPlanMeal} disabled={!planSlot} />
          </Card>
        )}

        <View>
          <Text style={styles.sectionLabel}>Ingredients</Text>
          <RecipeIngredientList
            ingredients={recipe.ingredients}
            ingredientLines={scaledIngredientLines}
            products={products}
            inventoryItems={inventoryItems}
            alwaysInStockProductIds={alwaysInStockIds}
          />
        </View>

        {profile?.nutritionTrackingEnabled && (
          <CollapsibleSection title="Nutrition" defaultOpen>
            <NutritionSection nutrition={recipe.nutrition} servings={selectedServings} hiddenNutrients={hiddenNutrients} />
          </CollapsibleSection>
        )}

        {budgetPreferences.enabled && (
          <CollapsibleSection title="Budget" defaultOpen>
            <CostSection recipe={recipe} products={products} inventoryItems={inventoryItems} targetServings={selectedServings} showExtraPurchaseCost />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Safety & compatibility">
          <RecipeSafetySummary
            recipe={recipe}
            toleranceProfile={toleranceProfile}
            dietProfile={dietProfile}
            avoidedProductIds={avoidedProductIds}
            permanentlyHiddenRecipeIds={permanentlyHiddenIds}
            products={products}
            isSafeMeal={isSafeMeal(recipe.id)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Preparation" defaultOpen>
          <RecipeInstructionList instructions={recipe.instructions} equipment={recipe.equipment} notes={recipe.notes} time={recipe.time} />
        </CollapsibleSection>
      </ScrollView>

      <RecipeDeleteDialog
        visible={confirmDelete}
        recipeName={recipe.name}
        plannedMealCount={plannedMealCount}
        historyCount={historyCount}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />

      {toast && (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  servingsCard: {
    paddingVertical: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  planPanel: {
    gap: spacing.sm,
  },
  planLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notFoundText: {
    ...typography.role.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  deletedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  deletedTitle: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  deletedActions: {
    gap: spacing.sm,
    width: '100%',
  },
  toast: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  toastText: {
    ...typography.role.body,
    color: colors.textPrimary,
  },
});

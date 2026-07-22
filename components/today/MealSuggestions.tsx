import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CompactMealCard } from '@/components/meals/CompactMealCard';
import { HeroMealCard } from '@/components/meals/HeroMealCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomSheet, type SheetAction } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, spacing, typography } from '@/constants/theme';
import { useDiet } from '@/hooks/useDiet';
import { useDismissals } from '@/hooks/useDismissals';
import { useInventory } from '@/hooks/useInventory';
import type { useMealPlan } from '@/hooks/useMealPlan';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { useTolerance } from '@/hooks/useTolerance';
import { getRankedMealSuggestions } from '@/services/decision/getRankedMealSuggestions';
import type { DecisionContext, RelaxationType } from '@/services/decision/types';
import type { MealLogEntry } from '@/types/mealLog';
import type { NutrientKey } from '@/types/nutrition';
import type { Recipe } from '@/types/recipe';

const MAX_VISIBLE = 3;

type MealSuggestionsProps = {
  context: DecisionContext;
  recipes: Recipe[];
  mealPlan: ReturnType<typeof useMealPlan>;
  mealLogEntries: MealLogEntry[];
  safeMealIds: Set<string>;
  isSafeMeal: (id: string) => boolean;
  safeMealsOnly: boolean;
  nutritionTrackingEnabled: boolean;
  hiddenNutrients: ReadonlySet<NutrientKey>;
};

function applyRelaxations(context: DecisionContext, relaxations: ReadonlySet<RelaxationType>): DecisionContext {
  if (relaxations.size === 0) return context;
  return {
    ...context,
    maxPrepMinutes: relaxations.has('increaseTime') ? undefined : context.maxPrepMinutes,
    noExtraShopping: relaxations.has('allowOneMissingIngredient') ? undefined : context.noExtraShopping,
    maxExtraCostCents: relaxations.has('increaseMaxCost') ? undefined : context.maxExtraCostCents,
    equipment: relaxations.has('other') ? undefined : context.equipment,
  };
}

/**
 * Never shows more than 3 options — one featured (HeroMealCard) plus two
 * quiet alternatives (CompactMealCard). Every ranking, reason, and warning
 * comes from the shared decision engine (getRankedMealSuggestions) — this
 * component only assembles its inputs and renders the structured result,
 * it never scores or explains a recipe itself. Takes mealPlan as a prop so
 * it shares state with NutritionSummary/the timeline rather than owning a
 * second hook instance.
 */
export function MealSuggestions({
  context,
  recipes,
  mealPlan,
  mealLogEntries,
  safeMealIds,
  isSafeMeal,
  safeMealsOnly,
  nutritionTrackingEnabled,
  hiddenNutrients,
}: MealSuggestionsProps) {
  const { products } = useProducts();
  const { items: inventoryItems } = useInventory();
  const { profile: toleranceProfile } = useTolerance();
  const { profile: dietProfile } = useDiet();
  const { avoidedProductIds } = useProductPreferences(products, false);
  const { entries: dismissals, dismissForDay, hideForever } = useDismissals();
  const { isPlannedToday, isPlannedOnDate, togglePlannedToday, togglePlannedOnDate } = mealPlan;

  const [sessionDismissedIds, setSessionDismissedIds] = useState<Set<string>>(new Set());
  const [relaxations, setRelaxations] = useState<Set<RelaxationType>>(new Set());
  const [dismissOptionsRecipeId, setDismissOptionsRecipeId] = useState<string | null>(null);
  const [pickForMeActive, setPickForMeActive] = useState(false);
  const [pickForMeRerolledIds, setPickForMeRerolledIds] = useState<string[]>([]);
  const reducedMotion = useReducedMotionPreference();

  const effectiveSafeMealsOnly = safeMealsOnly && !relaxations.has('dropSafeOnly');

  const engineBaseInput = useMemo(
    () => ({
      recipes,
      products,
      inventoryItems,
      toleranceProfile,
      dietProfile,
      avoidedProductIds,
      safeMealIds,
      safeMealsOnly: effectiveSafeMealsOnly,
      dismissals,
      plannedMeals: mealPlan.entries,
      mealLogEntries,
    }),
    [recipes, products, inventoryItems, toleranceProfile, dietProfile, avoidedProductIds, safeMealIds, effectiveSafeMealsOnly, dismissals, mealPlan.entries, mealLogEntries]
  );

  const effectiveContext = useMemo(() => applyRelaxations(context, relaxations), [context, relaxations]);

  const ranked = useMemo(
    () =>
      getRankedMealSuggestions({
        ...engineBaseInput,
        context: { ...effectiveContext, excludeRecipeIds: [...(effectiveContext.excludeRecipeIds ?? []), ...sessionDismissedIds] },
        limit: MAX_VISIBLE,
      }),
    [engineBaseInput, effectiveContext, sessionDismissedIds]
  );

  const pickForMeResult = useMemo(() => {
    if (!pickForMeActive) return null;
    return getRankedMealSuggestions({
      ...engineBaseInput,
      context: {
        ...effectiveContext,
        excludeRecipeIds: [...(effectiveContext.excludeRecipeIds ?? []), ...sessionDismissedIds, ...pickForMeRerolledIds],
      },
      limit: 1,
    });
  }, [pickForMeActive, engineBaseInput, effectiveContext, sessionDismissedIds, pickForMeRerolledIds]);

  const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);

  function dismiss(recipeId: string) {
    setSessionDismissedIds((current) => new Set(current).add(recipeId));
  }

  function showSomethingDifferent() {
    setSessionDismissedIds((current) => {
      const next = new Set(current);
      ranked.suggestions.forEach((suggestion) => next.add(suggestion.recipeId));
      return next;
    });
  }

  function pickForMe() {
    setPickForMeRerolledIds([]);
    setPickForMeActive(true);
  }

  function chooseAgain() {
    const current = pickForMeResult?.suggestions[0]?.recipeId;
    if (current) setPickForMeRerolledIds((ids) => [...ids, current]);
  }

  const dismissOptionsActions: SheetAction[] = dismissOptionsRecipeId
    ? [
        { key: 'day', label: 'Not today', icon: 'calendar-outline', onPress: () => dismissForDay(dismissOptionsRecipeId, context.date) },
        { key: 'forever', label: "Don't suggest again", icon: 'eye-off-outline', destructive: true, onPress: () => hideForever(dismissOptionsRecipeId) },
      ]
    : [];

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="restaurant-outline"
        title="Nothing to suggest yet"
        description="Add a few products or recipes so uFlow has something to work with."
      />
    );
  }

  const [featured, ...rest] = ranked.suggestions;
  const pickForMeSuggestion = pickForMeResult?.suggestions[0];
  const pickForMeRecipe = pickForMeSuggestion ? recipeById.get(pickForMeSuggestion.recipeId) : undefined;

  return (
    <View style={styles.container}>
      <SectionHeader title="Three calm choices" actionLabel="Pick for me" onActionPress={pickForMe} />

      {pickForMeActive && (
        <Card variant="insight" style={styles.pickForMeCard}>
          {pickForMeRecipe && pickForMeSuggestion ? (
            <>
              <Text style={styles.pickForMeLabel}>Best match right now</Text>
              <Text style={styles.pickForMeName}>{pickForMeRecipe.name}</Text>
              {pickForMeSuggestion.reasons.length > 0 && (
                <Text style={styles.pickForMeReasons}>{pickForMeSuggestion.reasons.map((r) => r.label).join(' · ')}</Text>
              )}
              <View style={styles.pickForMeActions}>
                <Button
                  label="Plan this"
                  compact
                  onPress={() => {
                    togglePlannedToday(pickForMeRecipe.id);
                    setPickForMeActive(false);
                  }}
                />
                <Button label="Choose again" variant="quiet" compact onPress={chooseAgain} />
                <Button label="Close" variant="quiet" compact onPress={() => setPickForMeActive(false)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.pickForMeReasons}>{pickForMeResult?.noResult?.message ?? 'No confident match available.'}</Text>
              <Button label="Close" variant="quiet" compact onPress={() => setPickForMeActive(false)} />
            </>
          )}
        </Card>
      )}

      {ranked.suggestions.length === 0 && ranked.noResult ? (
        <Card variant="insight" style={styles.noResultCard}>
          <Text style={styles.noResultMessage}>{ranked.noResult.message}</Text>
          {ranked.noResult.relaxationOptions.length > 0 && (
            <View style={styles.chipRow}>
              {ranked.noResult.relaxationOptions.map((option) => (
                <Button
                  key={option.type}
                  label={option.label}
                  variant="secondary"
                  compact
                  onPress={() => setRelaxations((current) => new Set(current).add(option.type))}
                />
              ))}
            </View>
          )}
        </Card>
      ) : (
        <>
          {featured &&
            (() => {
              const recipe = recipeById.get(featured.recipeId);
              if (!recipe) return null;
              return (
                <Animated.View key={recipe.id} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} layout={layoutTransition(reducedMotion)}>
                  <HeroMealCard
                    recipe={recipe}
                    missingIngredientCount={featured.missingIngredientCount}
                    reasons={featured.reasons.map((r) => r.label)}
                    warnings={featured.warnings.map((w) => w.label)}
                    isSafeMeal={isSafeMeal(recipe.id)}
                    plannedToday={isPlannedToday(recipe.id)}
                    isPlannedOnDate={(date) => isPlannedOnDate(recipe.id, date)}
                    nutritionTrackingEnabled={nutritionTrackingEnabled}
                    hiddenNutrients={hiddenNutrients}
                    costEstimate={featured.additionalPurchaseCost}
                    onTogglePlannedToday={() => togglePlannedToday(recipe.id)}
                    onTogglePlannedOnDate={(date) => togglePlannedOnDate(recipe.id, date)}
                    onDismiss={() => dismiss(recipe.id)}
                  />
                  <Button label="More options" variant="quiet" compact onPress={() => setDismissOptionsRecipeId(recipe.id)} />
                </Animated.View>
              );
            })()}

          {rest.length > 0 && (
            <View style={styles.compactList}>
              {rest.map((suggestion) => {
                const recipe = recipeById.get(suggestion.recipeId);
                if (!recipe) return null;
                return (
                  <Animated.View key={recipe.id} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} layout={layoutTransition(reducedMotion)}>
                    <CompactMealCard
                      recipe={recipe}
                      missingIngredientCount={suggestion.missingIngredientCount}
                      reasons={suggestion.reasons.map((r) => r.label)}
                      isSafeMeal={isSafeMeal(recipe.id)}
                      plannedToday={isPlannedToday(recipe.id)}
                      costEstimate={suggestion.additionalPurchaseCost}
                      onTogglePlannedToday={() => togglePlannedToday(recipe.id)}
                      onDismiss={() => dismiss(recipe.id)}
                    />
                  </Animated.View>
                );
              })}
            </View>
          )}

          <Button label="Show something different" variant="quiet" onPress={showSomethingDifferent} />
        </>
      )}

      <BottomSheet
        visible={dismissOptionsRecipeId != null}
        title="More options"
        actions={dismissOptionsActions}
        onClose={() => setDismissOptionsRecipeId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  compactList: {
    gap: spacing.sm,
  },
  noResultCard: {
    gap: spacing.sm,
  },
  noResultMessage: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickForMeCard: {
    gap: spacing.xs,
  },
  pickForMeLabel: {
    ...typography.role.label,
    color: colors.textAccentSand,
  },
  pickForMeName: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  pickForMeReasons: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
  pickForMeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

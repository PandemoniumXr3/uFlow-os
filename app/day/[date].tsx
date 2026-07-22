import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddMealModal } from '@/components/day/AddMealModal';
import { BudgetSummary } from '@/components/budget/BudgetSummary';
import { ClosedLoopStatus } from '@/components/decision/ClosedLoopStatus';
import { NutritionOverview } from '@/components/nutrition/NutritionOverview';
import { MealTimelineItem } from '@/components/today/MealTimelineItem';
import { BottomSheet, type SheetAction } from '@/components/ui/BottomSheet';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InsightRow } from '@/components/ui/InsightRow';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { colors, iconSize, shadow, spacing, typography } from '@/constants/theme';
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
import { useTolerance } from '@/hooks/useTolerance';
import { estimateExtraPurchaseCost } from '@/services/budget/estimateExtraPurchaseCost';
import { estimateMealPlanCost } from '@/services/budget/estimateMealPlanCost';
import { buildDecisionContext } from '@/services/decision/buildDecisionContext';
import { getRankedMealSuggestions } from '@/services/decision/getRankedMealSuggestions';
import { applyStockDeduction, estimateStockDeduction, type StockDeductionLine } from '@/services/stock/estimateStockDeduction';
import type { CostEstimate } from '@/types/budget';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Recipe } from '@/types/recipe';
import type { MealType } from '@/types/recipe';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';
import { addDaysToKey, formatFriendlyDate, formatShortDate, getTodayKey, isToday } from '@/utils/date';
import { getDayMissingIngredientNames } from '@/utils/getDayMissingIngredientNames';
import { getMealStatus } from '@/utils/getMealStatus';
import { formatCents } from '@/utils/money';
import { hasConsumedNutritionData, hasProjectedNutritionData } from '@/utils/nutritionDataPresence';
import { labelFor } from '@/utils/optionLabels';
import { resolveCostDisplay } from '@/utils/resolveCostDisplay';

const SLOT_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'dessert'];

function dayLabel(dateKey: string): string {
  if (isToday(dateKey)) return 'Today';
  if (dateKey === addDaysToKey(getTodayKey(), 1)) return 'Tomorrow';
  if (dateKey === addDaysToKey(getTodayKey(), -1)) return 'Yesterday';
  return formatFriendlyDate(dateKey);
}

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const dateKey = date ?? getTodayKey();
  const router = useRouter();

  const { recipes } = useRecipes();
  const { products, isLoading: productsLoading } = useProducts();
  const { items: inventoryItems, update: updateInventoryItem } = useInventory();
  const mealPlan = useMealPlan();
  const mealLog = useMealLog();
  const { profile, hiddenNutrients, budgetPreferences } = useProfile();
  const { profile: toleranceProfile } = useTolerance();
  const { profile: dietProfile } = useDiet();
  const { safeMealIds } = useSafeMeals();
  const { avoidedProductIds, alwaysInStockIds } = useProductPreferences(products, productsLoading);
  const { entries: dismissals } = useDismissals();

  const [addModalSlot, setAddModalSlot] = useState<MealType | null>(null);
  const [actionsMeal, setActionsMeal] = useState<PlannedMeal | null>(null);
  const [dateTarget, setDateTarget] = useState<{ meal: PlannedMeal; mode: 'move' | 'copy' } | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [ideaSlot, setIdeaSlot] = useState<MealType | null>(null);
  const [prioritizeAvailable, setPrioritizeAvailable] = useState(false);
  const [pendingDeduction, setPendingDeduction] = useState<{ recipeName: string; lines: StockDeductionLine[]; excludedIds: Set<string> } | null>(
    null
  );

  const isLoading = mealPlan.isLoading || mealLog.isLoading;
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const dayMeals = mealPlan.plannedMealsForDate(dateKey);

  const mealsBySlot = useMemo(() => {
    const map = new Map<MealType, PlannedMeal[]>();
    for (const slot of SLOT_ORDER) map.set(slot, []);
    for (const meal of dayMeals) map.get(meal.mealSlot ?? 'snack')?.push(meal);
    return map;
  }, [dayMeals]);

  const filledSlots = SLOT_ORDER.filter((slot) => (mealsBySlot.get(slot)?.length ?? 0) > 0);
  const emptySlots = SLOT_ORDER.filter((slot) => (mealsBySlot.get(slot)?.length ?? 0) === 0);

  const excludedPlannedMealIds = useMemo(
    () => new Set(dayMeals.filter((meal) => getMealStatus(meal, mealLog.entries) === 'eaten').map((meal) => meal.id)),
    [dayMeals, mealLog.entries]
  );

  const consumed = useMemo(() => calculateConsumedNutritionForDate(mealLog.entries, dateKey), [mealLog.entries, dateKey]);
  const projected = useMemo(
    () => calculateProjectedNutritionForDate(dayMeals, recipes, dateKey, excludedPlannedMealIds),
    [dayMeals, recipes, dateKey, excludedPlannedMealIds]
  );
  const hasConsumedEntries = mealLog.entries.some((entry) => entry.date === dateKey);
  const hasProjectedEntries = dayMeals.some((meal) => !meal.isSkipped && !excludedPlannedMealIds.has(meal.id));

  const missingIngredients = useMemo(
    () => getDayMissingIngredientNames(dayMeals, recipes, products, inventoryItems),
    [dayMeals, recipes, products, inventoryItems]
  );

  const dayExtraCostEstimate = useMemo<CostEstimate | null>(
    () => (budgetPreferences.enabled ? estimateMealPlanCost(dayMeals, recipes, products, inventoryItems, 'extra') : null),
    [budgetPreferences.enabled, dayMeals, recipes, products, inventoryItems]
  );

  function mealCostMeta(meal: PlannedMeal, recipe: Recipe | undefined, servings: number): string | undefined {
    if (!budgetPreferences.enabled) return undefined;
    if (meal.isCustom) {
      return meal.customEstimatedCostCents != null ? `${formatCents(meal.customEstimatedCostCents)} est.` : undefined;
    }
    if (!recipe) return undefined;
    const extra = estimateExtraPurchaseCost(recipe, products, inventoryItems, servings);
    if (extra.status === 'unavailable') return undefined;
    return extra.knownCostCents === 0 ? 'No extra shopping' : `${resolveCostDisplay(extra).amountLabel} extra`;
  }

  const hasDeductibleMeal = useMemo(
    () =>
      dayMeals.some(
        (meal) =>
          !meal.isCustom &&
          getMealStatus(meal, mealLog.entries) === 'planned' &&
          meal.recipeId &&
          (recipeById.get(meal.recipeId)?.ingredientLines?.length ?? 0) > 0
      ),
    [dayMeals, mealLog.entries, recipeById]
  );

  const firstEmptySlot = emptySlots[0];

  // "Get 3 ideas" calls the exact same decision engine Today uses — never a separately calculated ranking.
  const ideasResult = useMemo(() => {
    if (!ideaSlot) return null;
    const context = buildDecisionContext({ date: dateKey, mealSlot: ideaSlot, foodContext: null, budgetPreferences });
    return getRankedMealSuggestions({
      recipes,
      context: { ...context, useStockFirst: prioritizeAvailable || undefined },
      products,
      inventoryItems,
      toleranceProfile,
      dietProfile,
      avoidedProductIds,
      safeMealIds,
      dismissals,
      plannedMeals: mealPlan.entries,
      mealLogEntries: mealLog.entries,
      limit: 3,
    });
  }, [
    ideaSlot,
    prioritizeAvailable,
    recipes,
    dateKey,
    budgetPreferences,
    toleranceProfile,
    dietProfile,
    products,
    inventoryItems,
    avoidedProductIds,
    safeMealIds,
    dismissals,
    mealPlan.entries,
    mealLog.entries,
  ]);

  const ideas = ideasResult?.suggestions ?? [];

  function markEaten(meal: PlannedMeal) {
    if (meal.isCustom) {
      // Custom meals never have structured ingredients, so there is nothing to deduct — never guessed.
      mealLog.logCustomMeal({
        customName: meal.customName ?? 'Custom meal',
        date: dateKey,
        plannedMealId: meal.id,
        mealSlot: meal.mealSlot,
        servings: meal.servings,
        nutritionSnapshot: meal.customNutrition,
      });
      return;
    }
    if (!meal.recipeId) return;
    const recipe = recipeById.get(meal.recipeId);
    mealLog.logMeal(meal.recipeId, {
      date: dateKey,
      plannedMealId: meal.id,
      mealSlot: meal.mealSlot,
      servings: meal.servings,
      nutritionSnapshot: recipe?.nutrition,
    });

    if (recipe) {
      const lines = estimateStockDeduction(recipe, meal.servings ?? 1, products, inventoryItems, alwaysInStockIds);
      if (lines.length > 0) {
        setPendingDeduction({ recipeName: recipe.name, lines, excludedIds: new Set() });
      }
    }
  }

  function toggleDeductionLine(productId: string) {
    setPendingDeduction((current) => {
      if (!current) return current;
      const excludedIds = new Set(current.excludedIds);
      if (excludedIds.has(productId)) excludedIds.delete(productId);
      else excludedIds.add(productId);
      return { ...current, excludedIds };
    });
  }

  function confirmStockDeduction() {
    if (!pendingDeduction) return;
    for (const line of pendingDeduction.lines) {
      if (pendingDeduction.excludedIds.has(line.productId)) continue;
      const item = inventoryItems.find((candidate) => candidate.id === line.inventoryItemId);
      if (!item) continue;
      const patch = applyStockDeduction(item, line);
      if (Object.keys(patch).length > 0) updateInventoryItem(item.id, patch);
    }
    setPendingDeduction(null);
  }

  function actionsForMeal(meal: PlannedMeal): SheetAction[] {
    const status = getMealStatus(meal, mealLog.entries);
    const actions: SheetAction[] = [];
    if (status === 'planned') {
      actions.push({ key: 'eaten', label: 'Mark eaten', icon: 'checkmark-circle-outline', onPress: () => markEaten(meal) });
      actions.push({ key: 'skip', label: 'Skip', icon: 'play-skip-forward-outline', onPress: () => mealPlan.toggleSkipped(meal.id, true) });
    } else if (status === 'skipped') {
      actions.push({ key: 'unskip', label: 'Unskip', icon: 'arrow-undo-outline', onPress: () => mealPlan.toggleSkipped(meal.id, false) });
    }
    if (status !== 'eaten') {
      actions.push({ key: 'move', label: 'Move to another day', icon: 'calendar-outline', onPress: () => setDateTarget({ meal, mode: 'move' }) });
    }
    actions.push({ key: 'copy', label: 'Copy to another day', icon: 'copy-outline', onPress: () => setDateTarget({ meal, mode: 'copy' }) });
    actions.push({ key: 'remove', label: 'Remove', icon: 'trash-outline', destructive: true, onPress: () => mealPlan.removePlannedMeal(meal.id) });
    return actions;
  }

  const dateTargetOptions = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToKey(dateKey, i - 3)).filter((d) => d !== dateKey), [dateKey]);

  const dateTargetActions: SheetAction[] = dateTargetOptions.map((target) => ({
    key: target,
    label: dayLabel(target),
    onPress: () => {
      if (!dateTarget) return;
      if (dateTarget.mode === 'move') mealPlan.movePlannedMeal(dateTarget.meal.id, target);
      else mealPlan.copyPlannedMeal(dateTarget.meal.id, target);
    },
  }));

  const dayMenuActions: SheetAction[] = [
    { key: 'copy-yesterday', label: 'Copy yesterday', icon: 'copy-outline', onPress: () => mealPlan.copyDay(addDaysToKey(dateKey, -1), dateKey) },
    { key: 'clear', label: 'Clear this day', icon: 'trash-outline', destructive: true, onPress: () => setConfirmClear(true) },
  ];

  function clearDay() {
    Promise.all(dayMeals.map((meal) => mealPlan.removePlannedMeal(meal.id)));
    setConfirmClear(false);
  }

  if (isLoading) return <Screen />;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevron-back" accessibilityLabel="Previous day" onPress={() => router.replace(`/day/${addDaysToKey(dateKey, -1)}`)} />
        <View style={styles.headerTextColumn}>
          <Text style={styles.headerTitle}>{dayLabel(dateKey)}</Text>
          {dayLabel(dateKey) !== formatFriendlyDate(dateKey) && <Text style={styles.headerSubtitle}>{formatFriendlyDate(dateKey)}</Text>}
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="chevron-forward" accessibilityLabel="Next day" onPress={() => router.replace(`/day/${addDaysToKey(dateKey, 1)}`)} />
          <IconButton icon="ellipsis-horizontal" accessibilityLabel="Day options" onPress={() => setDayMenuOpen(true)} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.timeline}>
          {filledSlots.map((slot) => {
            const meals = mealsBySlot.get(slot) ?? [];
            return (
              <View key={slot} style={styles.slotBlock}>
                <Text style={styles.slotLabel}>{labelFor(MEAL_TYPE_OPTIONS, slot)}</Text>
                <View style={styles.slotMeals}>
                    {meals.map((meal) => {
                      const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
                      const title = meal.isCustom ? meal.customName ?? 'Custom meal' : recipe?.name ?? 'Recipe';
                      const status = getMealStatus(meal, mealLog.entries);
                      const servings = meal.servings ?? 1;
                      const metaParts = [servings > 1 ? `${servings} servings` : undefined, mealCostMeta(meal, recipe, servings)].filter(
                        (part): part is string => !!part
                      );
                      return (
                        <MealTimelineItem
                          key={meal.id}
                          title={title}
                          meta={metaParts.length > 0 ? metaParts.join(' · ') : undefined}
                          status={status}
                          rightSlot={
                            <View style={styles.mealActions}>
                              {status !== 'eaten' && (
                                <View style={styles.servingsStepper}>
                                  <Pressable
                                    hitSlop={8}
                                    onPress={() => mealPlan.updatePlannedMeal(meal.id, { servings: Math.max(1, servings - 1) })}
                                    disabled={servings <= 1}>
                                    <Ionicons name="remove-circle-outline" size={iconSize.md} color={servings <= 1 ? colors.textTertiary : colors.textSecondary} />
                                  </Pressable>
                                  <Text style={styles.servingsValue}>{servings}</Text>
                                  <Pressable hitSlop={8} onPress={() => mealPlan.updatePlannedMeal(meal.id, { servings: servings + 1 })}>
                                    <Ionicons name="add-circle-outline" size={iconSize.md} color={colors.textSecondary} />
                                  </Pressable>
                                </View>
                              )}
                              <IconButton icon="ellipsis-horizontal" accessibilityLabel={`${title} options`} onPress={() => setActionsMeal(meal)} />
                            </View>
                          }
                        />
                      );
                    })}
                    <Pressable onPress={() => setAddModalSlot(slot)} hitSlop={8}>
                      <Text style={styles.addAnotherLink}>+ Add another</Text>
                    </Pressable>
                </View>
              </View>
            );
          })}

          {emptySlots.length > 0 && (
            <View style={styles.slotBlock}>
              <Text style={styles.slotLabel}>{filledSlots.length > 0 ? 'Add a meal' : "Nothing planned yet"}</Text>
              <View style={styles.emptySlotRow}>
                {emptySlots.map((slot) => (
                  <Chip key={slot} label={labelFor(MEAL_TYPE_OPTIONS, slot)} icon="add" onPress={() => setAddModalSlot(slot)} />
                ))}
              </View>
            </View>
          )}
        </View>

        {hasDeductibleMeal && <ClosedLoopStatus state={{ type: 'markEatenUpdatesStock' }} />}

        <View style={styles.ideasSection}>
          {ideaSlot ? (
            <Card variant="insight" style={styles.ideasCard}>
              <View style={styles.ideasHeaderRow}>
                <Text style={styles.ideasTitle}>Ideas for {ideaSlot}</Text>
                <Chip label="Use what I have" selected={prioritizeAvailable} onPress={() => setPrioritizeAvailable(!prioritizeAvailable)} />
              </View>
              <View style={styles.ideasRow}>
                {ideas.map((idea) => {
                  const recipe = recipeById.get(idea.recipeId);
                  if (!recipe) return null;
                  return (
                    <Chip
                      key={recipe.id}
                      label={recipe.name}
                      onPress={() => {
                        mealPlan.addPlannedMeal({ date: dateKey, recipeId: recipe.id, mealSlot: ideaSlot });
                        setIdeaSlot(null);
                      }}
                    />
                  );
                })}
                {ideas.length === 0 && (
                  <Text style={styles.noIdeasText}>{ideasResult?.noResult?.message ?? 'No matches — try adding a few more recipes.'}</Text>
                )}
              </View>
              <Pressable onPress={() => setIdeaSlot(null)} hitSlop={8}>
                <Text style={styles.addLink}>Close</Text>
              </Pressable>
            </Card>
          ) : (
            firstEmptySlot && <Button label={`Get ideas for ${firstEmptySlot}`} variant="secondary" onPress={() => setIdeaSlot(firstEmptySlot)} />
          )}
        </View>

        {budgetPreferences.enabled && dayExtraCostEstimate && dayExtraCostEstimate.status !== 'unavailable' && (
          <Card variant="standard">
            <SectionHeader title="Budget" />
            <View style={styles.spacer} />
            <BudgetSummary estimate={dayExtraCostEstimate} label="extra shopping for this day" />
          </Card>
        )}

        {profile?.nutritionTrackingEnabled && (
          <Card variant="standard">
            <SectionHeader title="Nutrition" />
            <View style={styles.spacer} />
            <NutritionOverview
              consumed={consumed}
              hasConsumedEntries={hasConsumedEntries}
              consumedHasNutritionData={hasConsumedNutritionData(mealLog.entries, dateKey)}
              projected={projected}
              hasProjectedEntries={hasProjectedEntries}
              projectedHasNutritionData={hasProjectedNutritionData(dayMeals, recipes, dateKey, excludedPlannedMealIds)}
              hiddenNutrients={hiddenNutrients}
              emptyText="Nothing logged for this day."
            />
          </Card>
        )}

        <Pressable onPress={() => router.push('/grocery')}>
          <Card variant="insight">
            <InsightRow
              icon="cart-outline"
              tone={missingIngredients.length > 0 ? 'warm' : 'good'}
              text={missingIngredients.length > 0 ? `${missingIngredients.length} ingredient${missingIngredients.length === 1 ? '' : 's'} needed for this day` : 'Everything needed is in stock'}
            />
          </Card>
        </Pressable>
      </ScrollView>

      <AddMealModal
        visible={addModalSlot != null}
        mealSlot={addModalSlot ?? 'snack'}
        recipes={recipes}
        onClose={() => setAddModalSlot(null)}
        onSelectRecipe={(recipeId) => mealPlan.addPlannedMeal({ date: dateKey, recipeId, mealSlot: addModalSlot ?? 'snack' })}
        onAddCustom={(details) => mealPlan.addCustomMeal(dateKey, { ...details, mealSlot: addModalSlot ?? 'snack' })}
        budgetModeEnabled={budgetPreferences.enabled}
      />

      <BottomSheet visible={actionsMeal != null} title="Meal options" actions={actionsMeal ? actionsForMeal(actionsMeal) : []} onClose={() => setActionsMeal(null)} />
      <BottomSheet visible={dateTarget != null} title="Choose a day" actions={dateTargetActions} onClose={() => setDateTarget(null)} />
      <BottomSheet visible={dayMenuOpen} actions={dayMenuActions} onClose={() => setDayMenuOpen(false)} />

      <ConfirmDialog
        visible={confirmClear}
        title="Clear this day?"
        message="This removes every planned meal for this day. Meals already eaten stay in your history."
        confirmLabel="Clear day"
        destructive
        onConfirm={clearDay}
        onCancel={() => setConfirmClear(false)}
      />

      {pendingDeduction && (
        <View style={styles.overlay}>
          <Card variant="standard" style={styles.deductionCard}>
            <Text style={styles.deductionTitle}>Update Stock?</Text>
            <Text style={styles.deductionSubtitle}>You marked {pendingDeduction.recipeName} as eaten.</Text>

            <View style={styles.deductionList}>
              {pendingDeduction.lines.map((line) => {
                const excluded = pendingDeduction.excludedIds.has(line.productId);
                const detail =
                  line.kind === 'exact'
                    ? `-${Math.round(line.quantityToDeductInStockUnit ?? 0)}${line.stockBaseUnit}`
                    : line.kind === 'statusDowngrade'
                      ? `Mark as ${line.nextStatus}`
                      : 'Already empty';
                return (
                  <Pressable key={line.productId} onPress={() => toggleDeductionLine(line.productId)} style={styles.deductionRow}>
                    <Ionicons
                      name={excluded ? 'square-outline' : 'checkbox'}
                      size={iconSize.md}
                      color={excluded ? colors.textTertiary : colors.accentBlue}
                    />
                    <View style={styles.deductionRowText}>
                      <Text style={[styles.deductionProductName, excluded && styles.deductionProductNameExcluded]}>{line.productName}</Text>
                      <Text style={styles.deductionDetail}>
                        {detail}
                        {line.isAlwaysInStock ? ' · Always keep in Stock' : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.deductionActions}>
              <Button label="Update Stock" onPress={confirmStockDeduction} />
              <Button label="Skip" variant="quiet" onPress={() => setPendingDeduction(null)} />
            </View>
          </Card>
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
    paddingBottom: spacing.md,
  },
  headerTextColumn: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  timeline: {
    gap: spacing.lg,
  },
  slotBlock: {
    gap: spacing.sm,
  },
  slotLabel: {
    ...typography.role.label,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  slotMeals: {
    gap: spacing.sm,
  },
  emptySlotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addLink: {
    ...typography.role.body,
    color: colors.accentBlue,
    textTransform: 'capitalize',
  },
  addAnotherLink: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servingsStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  servingsValue: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
    minWidth: 16,
    textAlign: 'center',
  },
  ideasSection: {
    gap: spacing.sm,
  },
  ideasCard: {
    gap: spacing.sm,
  },
  ideasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideasTitle: {
    ...typography.role.label,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  ideasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noIdeasText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  spacer: {
    height: spacing.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  deductionCard: {
    width: '100%',
    maxWidth: 380,
    gap: spacing.md,
    ...shadow.card,
  },
  deductionTitle: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  deductionSubtitle: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  deductionList: {
    gap: spacing.sm,
  },
  deductionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deductionRowText: {
    flex: 1,
    gap: 2,
  },
  deductionProductName: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  deductionProductNameExcluded: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  deductionDetail: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  deductionActions: {
    gap: spacing.sm,
  },
});

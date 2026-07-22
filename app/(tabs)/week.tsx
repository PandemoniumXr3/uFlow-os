import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BudgetSummary } from '@/components/budget/BudgetSummary';
import { NutritionOverview } from '@/components/nutrition/NutritionOverview';
import { MealTimelineItem } from '@/components/today/MealTimelineItem';
import { Button, IconButton } from '@/components/ui/Button';
import { BottomSheet, type SheetAction } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InsightRow } from '@/components/ui/InsightRow';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { DaySelector, type DaySelectorEntry } from '@/components/week/DaySelector';
import { MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { colors, spacing, typography } from '@/constants/theme';
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
import { combineCostEstimates } from '@/services/budget/combineCostEstimates';
import { estimateMealPlanCost } from '@/services/budget/estimateMealPlanCost';
import { buildDecisionContext } from '@/services/decision/buildDecisionContext';
import { getRankedMealSuggestions } from '@/services/decision/getRankedMealSuggestions';
import type { RankedMealSuggestion } from '@/services/decision/types';
import type { CostEstimate } from '@/types/budget';
import type { MealType } from '@/types/recipe';
import { calculateConsumedNutritionForDate } from '@/utils/calculateConsumedNutrition';
import { calculateProjectedNutritionForDate } from '@/utils/calculateProjectedNutrition';
import { calculateWeeklyNutrition } from '@/utils/calculateWeeklyNutrition';
import { calculateWeeklyProjectedNutrition } from '@/utils/calculateWeeklyProjectedNutrition';
import { addDaysToKey, formatFriendlyDate, getTodayKey, isToday } from '@/utils/date';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';
import { getDayMissingIngredientNames } from '@/utils/getDayMissingIngredientNames';
import { getMealStatus } from '@/utils/getMealStatus';
import { getWeekRange, isDateWithinRange, type WeekRange } from '@/utils/getWeekRange';
import { getVisibleTotalsRows } from '@/utils/nutrientTotalsRows';
import { hasConsumedNutritionData, hasProjectedNutritionData } from '@/utils/nutritionDataPresence';
import { labelFor } from '@/utils/optionLabels';
import { resolveCostDisplay } from '@/utils/resolveCostDisplay';

/** The three slots "fill this day" offers to plan — deliberately a small, common subset rather than every MealType, keeping the one-day assisted preview simple and predictable. */
const FILL_SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];

interface FillProposal {
  slot: MealType;
  suggestion: RankedMealSuggestion | null;
  excludedIds: string[];
  accepted: boolean;
}

const CORE_KEYS = ['protein', 'carbohydrate', 'fat'] as const;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${MONTH_SHORT[month - 1]} ${day}`;
}

function formatWeekRangeLabel(range: WeekRange): string {
  return `${shortLabel(range.start)} – ${shortLabel(range.end)}`;
}

function formatValue(value: number): string {
  return String(Math.round(value));
}

export default function WeekScreen() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const { products, isLoading: productsLoading } = useProducts();
  const { items: inventoryItems } = useInventory();
  const { alwaysInStockIds, avoidedProductIds } = useProductPreferences(products, productsLoading);
  const mealPlan = useMealPlan();
  const mealLog = useMealLog();
  const { profile, hiddenNutrients, budgetPreferences } = useProfile();
  const { profile: toleranceProfile } = useTolerance();
  const { profile: dietProfile } = useDiet();
  const { safeMealIds } = useSafeMeals();
  const { entries: dismissals } = useDismissals();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [rollupExpanded, setRollupExpanded] = useState(false);
  const [fillProposals, setFillProposals] = useState<FillProposal[] | null>(null);

  const isLoading = mealPlan.isLoading || mealLog.isLoading;

  const range = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekRange(base);
  }, [weekOffset]);

  const isCurrentWeek = weekOffset === 0;
  const datesInRange = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToKey(range.start, i)), [range]);

  useEffect(() => {
    if (!isDateWithinRange(selectedDate, range)) setSelectedDate(isCurrentWeek ? getTodayKey() : range.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const plannedMealsInRange = useMemo(() => mealPlan.entries.filter((meal) => isDateWithinRange(meal.date, range)), [mealPlan.entries, range]);
  const activePlannedInRange = plannedMealsInRange.filter((meal) => !meal.isSkipped);
  const daysWithPlanCount = new Set(activePlannedInRange.map((meal) => meal.date)).size;

  const weeklyConsumed = useMemo(() => calculateWeeklyNutrition(mealLog.entries, range), [mealLog.entries, range]);
  const weeklyProjected = useMemo(
    () => calculateWeeklyProjectedNutrition(mealPlan.entries, recipes, mealLog.entries, range),
    [mealPlan.entries, recipes, mealLog.entries, range]
  );

  const weeklyExtraCostEstimate = useMemo<CostEstimate | null>(
    () => (budgetPreferences.enabled ? estimateMealPlanCost(activePlannedInRange, recipes, products, inventoryItems, 'extra') : null),
    [budgetPreferences.enabled, activePlannedInRange, recipes, products, inventoryItems]
  );

  const weeklyPlanValueEstimate = useMemo<CostEstimate | null>(
    () => (budgetPreferences.enabled ? estimateMealPlanCost(activePlannedInRange, recipes, products, inventoryItems, 'full') : null),
    [budgetPreferences.enabled, activePlannedInRange, recipes, products, inventoryItems]
  );

  const remainingWeeklyBudgetCents =
    budgetPreferences.weeklyBudgetCents != null && weeklyExtraCostEstimate
      ? budgetPreferences.weeklyBudgetCents - weeklyExtraCostEstimate.knownCostCents
      : undefined;

  const groceryNeededCount = useMemo(() => {
    if (!isCurrentWeek) return null;
    const items = generateAutomaticShoppingItems({
      plannedMeals: mealPlan.entries,
      recipes,
      products,
      inventoryItems,
      alwaysInStockProductIds: alwaysInStockIds,
    });
    return items.length;
  }, [isCurrentWeek, mealPlan.entries, recipes, products, inventoryItems, alwaysInStockIds]);

  const daySelectorEntries: DaySelectorEntry[] = datesInRange.map((date) => {
    const dayMeals = activePlannedInRange.filter((meal) => meal.date === date);
    return { date, plannedCount: dayMeals.length, hasEaten: dayMeals.some((meal) => getMealStatus(meal, mealLog.entries) === 'eaten') };
  });

  const selectedDayMeals = mealPlan.plannedMealsForDate(selectedDate);
  const selectedDayRows = selectedDayMeals.map((meal) => ({
    meal,
    title: meal.isCustom ? meal.customName ?? 'Custom meal' : recipeById.get(meal.recipeId ?? '')?.name ?? 'Recipe',
    status: getMealStatus(meal, mealLog.entries),
    slotLabel: meal.mealSlot ? labelFor(MEAL_TYPE_OPTIONS, meal.mealSlot) : undefined,
  }));

  const selectedDayExcluded = useMemo(
    () => new Set(selectedDayMeals.filter((meal) => getMealStatus(meal, mealLog.entries) === 'eaten').map((meal) => meal.id)),
    [selectedDayMeals, mealLog.entries]
  );
  const selectedDayConsumed = useMemo(() => calculateConsumedNutritionForDate(mealLog.entries, selectedDate), [mealLog.entries, selectedDate]);
  const selectedDayProjected = useMemo(
    () => calculateProjectedNutritionForDate(selectedDayMeals, recipes, selectedDate, selectedDayExcluded),
    [selectedDayMeals, recipes, selectedDate, selectedDayExcluded]
  );
  const selectedDayHasConsumed = mealLog.entries.some((entry) => entry.date === selectedDate);
  const selectedDayHasProjected = selectedDayMeals.some((meal) => !meal.isSkipped && !selectedDayExcluded.has(meal.id));
  const selectedDayMissing = useMemo(
    () => getDayMissingIngredientNames(selectedDayMeals, recipes, products, inventoryItems),
    [selectedDayMeals, recipes, products, inventoryItems]
  );

  const emptySlotsForSelectedDay = useMemo(
    () => FILL_SLOTS.filter((slot) => !selectedDayMeals.some((meal) => meal.mealSlot === slot && !meal.isSkipped)),
    [selectedDayMeals]
  );

  function suggestForSlot(slot: MealType, excludeIds: string[]): RankedMealSuggestion | null {
    const context = buildDecisionContext({ date: selectedDate, mealSlot: slot, foodContext: null, budgetPreferences });
    const result = getRankedMealSuggestions({
      recipes,
      context: { ...context, excludeRecipeIds: excludeIds },
      products,
      inventoryItems,
      toleranceProfile,
      dietProfile,
      avoidedProductIds,
      safeMealIds,
      dismissals,
      plannedMeals: mealPlan.entries,
      mealLogEntries: mealLog.entries,
      limit: 1,
    });
    return result.suggestions[0] ?? null;
  }

  /** Preview only — nothing is planned until the user explicitly confirms. Uses the exact same decision engine as Today and "Get 3 ideas", never a separate ranking. */
  function openFillPreview() {
    const proposals: FillProposal[] = emptySlotsForSelectedDay.map((slot) => {
      const suggestion = suggestForSlot(slot, []);
      return { slot, suggestion, excludedIds: [], accepted: suggestion != null };
    });
    setFillProposals(proposals);
  }

  function replaceProposal(slot: MealType) {
    setFillProposals(
      (current) =>
        current?.map((proposal) => {
          if (proposal.slot !== slot) return proposal;
          const excludedIds = proposal.suggestion ? [...proposal.excludedIds, proposal.suggestion.recipeId] : proposal.excludedIds;
          const suggestion = suggestForSlot(slot, excludedIds);
          return { ...proposal, suggestion, excludedIds, accepted: suggestion != null };
        }) ?? null
    );
  }

  function toggleProposalAccepted(slot: MealType) {
    setFillProposals((current) => current?.map((proposal) => (proposal.slot === slot ? { ...proposal, accepted: !proposal.accepted } : proposal)) ?? null);
  }

  function confirmFillPreview() {
    if (!fillProposals) return;
    fillProposals
      .filter((proposal) => proposal.accepted && proposal.suggestion)
      .forEach((proposal) => {
        mealPlan.addPlannedMeal({ date: selectedDate, recipeId: proposal.suggestion!.recipeId, mealSlot: proposal.slot });
      });
    setFillProposals(null);
  }

  const fillPreviewCostEstimate = useMemo(() => {
    if (!fillProposals || !budgetPreferences.enabled) return null;
    const estimates = fillProposals
      .filter((proposal) => proposal.accepted && proposal.suggestion?.additionalPurchaseCost)
      .map((proposal) => proposal.suggestion!.additionalPurchaseCost!);
    return estimates.length > 0 ? combineCostEstimates(estimates) : null;
  }, [fillProposals, budgetPreferences.enabled]);

  const menuActions: SheetAction[] = [
    {
      key: 'clear-future',
      label: 'Clear future planned meals',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => setConfirmClear(true),
    },
  ];

  const weekHasConsumedNutritionData = mealLog.entries.some((entry) => isDateWithinRange(entry.date, range) && entry.nutritionSnapshot != null);
  const weekHasProjectedNutritionData = activePlannedInRange.some((meal) => {
    if (getMealStatus(meal, mealLog.entries) === 'eaten') return false;
    const nutrition = meal.isCustom ? meal.customNutrition : recipeById.get(meal.recipeId ?? '')?.nutrition;
    return nutrition != null;
  });
  const weeklyConsumedRows = weekHasConsumedNutritionData ? getVisibleTotalsRows(weeklyConsumed.weeklyTotal, hiddenNutrients, [...CORE_KEYS]) : [];
  const weeklyAverageRows = weekHasConsumedNutritionData ? getVisibleTotalsRows(weeklyConsumed.dailyAverage, hiddenNutrients, [...CORE_KEYS]) : [];
  const showKcal = !hiddenNutrients.has('kcal');
  const showRollupCard = profile?.nutritionTrackingEnabled && (weekHasConsumedNutritionData || weekHasProjectedNutritionData);

  if (isLoading) return <Screen />;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <PageHeader title="Week" subtitle={formatWeekRangeLabel(range)} />
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="Week options" onPress={() => setMenuOpen(true)} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card variant="hero">
          <Text style={styles.heroValue}>{activePlannedInRange.length}</Text>
          <Text style={styles.heroLabel}>meal{activePlannedInRange.length === 1 ? '' : 's'} planned this week</Text>
          <Text style={styles.heroSecondary}>
            {daysWithPlanCount}/7 days planned{groceryNeededCount != null ? ` · ${groceryNeededCount} to buy` : ''}
            {profile?.nutritionTrackingEnabled && showKcal && weekHasProjectedNutritionData ? ` · ${formatValue(weeklyProjected.weeklyTotal.kcal)} kcal planned` : ''}
          </Text>
        </Card>

        <View style={styles.weekNav}>
          <IconButton icon="chevron-back" accessibilityLabel="Previous week" onPress={() => setWeekOffset((o) => o - 1)} />
          {!isCurrentWeek && (
            <Pressable onPress={() => setWeekOffset(0)} hitSlop={8}>
              <Text style={styles.todayLink}>Today</Text>
            </Pressable>
          )}
          <IconButton icon="chevron-forward" accessibilityLabel="Next week" onPress={() => setWeekOffset((o) => o + 1)} />
        </View>

        <DaySelector days={daySelectorEntries} selectedDate={selectedDate} onSelect={setSelectedDate} />

        <Card variant="standard" style={styles.dayCard}>
          <View style={styles.dayCardHeader}>
            <Text style={styles.dayCardTitle}>{isToday(selectedDate) ? 'Today' : formatFriendlyDate(selectedDate)}</Text>
            <Button label="Open day" variant="secondary" compact onPress={() => router.push({ pathname: '/day/[date]', params: { date: selectedDate } })} />
          </View>

          {selectedDayRows.length === 0 ? (
            <View style={styles.emptyDayBlock}>
              <Text style={styles.emptyDayText}>Nothing planned for this day yet.</Text>
              <View style={styles.dayCardActionsRow}>
                <Button
                  label="Plan this day"
                  variant="secondary"
                  compact
                  onPress={() => router.push({ pathname: '/day/[date]', params: { date: selectedDate } })}
                />
                {emptySlotsForSelectedDay.length > 0 && <Button label="Fill this day" compact onPress={openFillPreview} />}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.dayRowsList}>
                {selectedDayRows.map(({ meal, title, status, slotLabel }) => (
                  <MealTimelineItem key={meal.id} title={title} meta={slotLabel} status={status} />
                ))}
              </View>
              {emptySlotsForSelectedDay.length > 0 && (
                <Button label={`Fill ${emptySlotsForSelectedDay.length} empty slot${emptySlotsForSelectedDay.length === 1 ? '' : 's'}`} variant="secondary" compact onPress={openFillPreview} />
              )}
            </>
          )}

          {profile?.nutritionTrackingEnabled && (selectedDayHasConsumed || selectedDayHasProjected) && (
            <NutritionOverview
              consumed={selectedDayConsumed}
              hasConsumedEntries={selectedDayHasConsumed}
              consumedHasNutritionData={hasConsumedNutritionData(mealLog.entries, selectedDate)}
              projected={selectedDayProjected}
              hasProjectedEntries={selectedDayHasProjected}
              projectedHasNutritionData={hasProjectedNutritionData(selectedDayMeals, recipes, selectedDate, selectedDayExcluded)}
              hiddenNutrients={hiddenNutrients}
            />
          )}

          {selectedDayMissing.length > 0 && (
            <InsightRow icon="cart-outline" tone="warm" text={`${selectedDayMissing.length} ingredient${selectedDayMissing.length === 1 ? '' : 's'} needed`} />
          )}
        </Card>

        {showRollupCard && (
          <Card variant="standard">
            <Text style={styles.rollupTitle}>Nutrition this week</Text>
            <View style={styles.rollupRow}>
              {showKcal && weekHasConsumedNutritionData && (
                <View style={styles.rollupCell}>
                  <Text style={styles.rollupValue}>{formatValue(weeklyConsumed.weeklyTotal.kcal)}</Text>
                  <Text style={styles.rollupLabel}>kcal eaten</Text>
                </View>
              )}
              {showKcal && weekHasProjectedNutritionData && (
                <View style={styles.rollupCell}>
                  <Text style={styles.rollupValue}>{formatValue(weeklyProjected.weeklyTotal.kcal)}</Text>
                  <Text style={styles.rollupLabel}>kcal planned</Text>
                </View>
              )}
              {showKcal && weekHasConsumedNutritionData && (
                <View style={styles.rollupCell}>
                  <Text style={styles.rollupValueMuted}>{formatValue(weeklyConsumed.dailyAverage.kcal)}</Text>
                  <Text style={styles.rollupLabel}>avg / logged day</Text>
                </View>
              )}
            </View>
            {weeklyConsumedRows.length > 0 && (
              <>
                <Pressable onPress={() => setRollupExpanded(!rollupExpanded)} hitSlop={8}>
                  <Text style={styles.expandLink}>{rollupExpanded ? 'Show less' : 'Show macros'}</Text>
                </Pressable>
                {rollupExpanded && (
                  <Text style={styles.macroLine}>
                    {weeklyConsumedRows.map((row) => `${formatValue(row.value)}${row.unit} ${row.label.toLowerCase()} total`).join(' · ')}
                    {'\n'}
                    {weeklyAverageRows.map((row) => `${formatValue(row.value)}${row.unit} ${row.label.toLowerCase()} avg`).join(' · ')}
                  </Text>
                )}
              </>
            )}
          </Card>
        )}

        {budgetPreferences.enabled && weeklyExtraCostEstimate && (
          <Card variant="standard">
            <Text style={styles.rollupTitle}>Budget this week</Text>
            <BudgetSummary
              estimate={weeklyExtraCostEstimate}
              label="extra shopping needed"
              remainingBudgetCents={remainingWeeklyBudgetCents}
              progress={
                budgetPreferences.weeklyBudgetCents != null
                  ? { spentCents: weeklyExtraCostEstimate.knownCostCents, budgetCents: budgetPreferences.weeklyBudgetCents }
                  : undefined
              }
            />
            {weeklyPlanValueEstimate && weeklyPlanValueEstimate.status !== 'unavailable' && (
              <Text style={styles.macroLine}>
                Full ingredient value of this week's plan: {resolveCostDisplay(weeklyPlanValueEstimate).amountLabel}
              </Text>
            )}
          </Card>
        )}
      </ScrollView>

      {fillProposals && (
        <View style={styles.overlay}>
          <Card variant="standard" style={styles.fillPreviewCard}>
            <Text style={styles.fillPreviewTitle}>Fill {isToday(selectedDate) ? 'today' : formatFriendlyDate(selectedDate)}</Text>
            <Text style={styles.fillPreviewSubtitle}>Review each meal before saving — nothing is planned yet.</Text>

            <View style={styles.fillProposalList}>
              {fillProposals.map((proposal) => {
                const recipe = proposal.suggestion ? recipeById.get(proposal.suggestion.recipeId) : undefined;
                return (
                  <View key={proposal.slot} style={styles.fillProposalRow}>
                    <View style={styles.fillProposalText}>
                      <Text style={styles.fillProposalSlot}>{labelFor(MEAL_TYPE_OPTIONS, proposal.slot)}</Text>
                      {recipe ? (
                        <>
                          <Text style={[styles.fillProposalName, !proposal.accepted && styles.fillProposalNameSkipped]}>{recipe.name}</Text>
                          {proposal.suggestion!.reasons.length > 0 && (
                            <Text style={styles.fillProposalReasons}>{proposal.suggestion!.reasons.map((r) => r.label).join(' · ')}</Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.fillProposalReasons}>No match found for this slot.</Text>
                      )}
                    </View>
                    <View style={styles.fillProposalActions}>
                      {recipe && (
                        <Button label={proposal.accepted ? 'Skip' : 'Include'} variant="quiet" compact onPress={() => toggleProposalAccepted(proposal.slot)} />
                      )}
                      {recipe && <Button label="Replace" variant="quiet" compact onPress={() => replaceProposal(proposal.slot)} />}
                    </View>
                  </View>
                );
              })}
            </View>

            {fillPreviewCostEstimate && (
              <View style={styles.fillPreviewCostRow}>
                <BudgetSummary estimate={fillPreviewCostEstimate} label="additional Grocery cost for this plan" />
              </View>
            )}

            <View style={styles.fillPreviewActions}>
              <Button
                label="Confirm and plan"
                onPress={confirmFillPreview}
                disabled={!fillProposals.some((p) => p.accepted && p.suggestion)}
              />
              <Button label="Cancel" variant="quiet" onPress={() => setFillProposals(null)} />
            </View>
          </Card>
        </View>
      )}

      <BottomSheet visible={menuOpen} actions={menuActions} onClose={() => setMenuOpen(false)} />

      <ConfirmDialog
        visible={confirmClear}
        title="Clear future planned meals?"
        message="Removes every planned meal from tomorrow onward. Anything already eaten stays in your history."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          mealPlan.clearFuturePlannedMeals();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroValue: {
    ...typography.role.numericHighlight,
    fontSize: 40,
    lineHeight: 44,
    color: colors.textPrimary,
  },
  heroLabel: {
    ...typography.role.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroSecondary: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  todayLink: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
  dayCard: {
    gap: spacing.md,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCardTitle: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
  },
  emptyDayBlock: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  dayCardActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyDayText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  dayRowsList: {
    gap: spacing.sm,
  },
  rollupTitle: {
    ...typography.role.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  rollupRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  rollupCell: {
    gap: 2,
  },
  rollupValue: {
    ...typography.role.cardTitle,
    fontSize: 20,
    color: colors.textPrimary,
  },
  rollupValueMuted: {
    ...typography.role.cardTitle,
    fontSize: 20,
    color: colors.textSecondary,
  },
  rollupLabel: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  expandLink: {
    ...typography.role.label,
    color: colors.accentBlue,
    marginTop: spacing.sm,
  },
  macroLine: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    lineHeight: 18,
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
  fillPreviewCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    gap: spacing.md,
  },
  fillPreviewTitle: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
  },
  fillPreviewSubtitle: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  fillProposalList: {
    gap: spacing.md,
  },
  fillProposalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  fillProposalText: {
    flex: 1,
    gap: 2,
  },
  fillProposalSlot: {
    ...typography.role.label,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  fillProposalName: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  fillProposalNameSkipped: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  fillProposalReasons: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  fillProposalActions: {
    gap: spacing.xs,
  },
  fillPreviewCostRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  fillPreviewActions: {
    gap: spacing.sm,
  },
});

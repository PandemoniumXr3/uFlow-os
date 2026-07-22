import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MealSuggestions } from '@/components/today/MealSuggestions';
import { NutritionSummary } from '@/components/today/NutritionSummary';
import { QuickContextBar } from '@/components/today/QuickContextBar';
import { SmartAlerts } from '@/components/today/SmartAlerts';
import { TodayTimeline } from '@/components/today/TodayTimeline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/constants/theme';
import { useFoodContext } from '@/hooks/useFoodContext';
import { useInventory } from '@/hooks/useInventory';
import { useMealLog } from '@/hooks/useMealLog';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useSafeMeals } from '@/hooks/useSafeMeals';
import type { BudgetSuggestionFilter } from '@/constants/budgetFilterOptions';
import { buildDecisionContext } from '@/services/decision/buildDecisionContext';
import { getTodayKey } from '@/utils/date';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Winding down';
}

export default function TodayScreen() {
  const { context, isLoading: contextLoading, toggleAnswer, resetContext } = useFoodContext();
  const router = useRouter();

  // Lifted here so every section of Today (suggestions, timeline, nutrition,
  // alerts) observes the exact same live state instead of each owning a
  // separate hook instance that misses the others' writes.
  const { recipes } = useRecipes();
  const { products, isLoading: productsLoading } = useProducts();
  const { items: inventoryItems } = useInventory();
  const { alwaysInStockIds } = useProductPreferences(products, productsLoading);
  const mealLog = useMealLog();
  const mealPlan = useMealPlan();
  const { profile, hiddenNutrients, budgetPreferences } = useProfile();
  const { profile: safeMealsProfile, safeMealIds, isSafeMeal, setShowSafeOnly } = useSafeMeals();
  const [budgetFilter, setBudgetFilter] = useState<BudgetSuggestionFilter | null>(null);

  const isLoading = contextLoading || mealLog.isLoading || mealPlan.isLoading;

  // Maps the Today "Budget" quick-filter chips onto the decision engine's DecisionContext fields —
  // 'lowestExtraCost' needs no field of its own since the engine already penalizes cost continuously
  // whenever Budget Mode is on.
  const decisionContext = useMemo(() => {
    const base = buildDecisionContext({ date: getTodayKey(), foodContext: context, budgetPreferences });
    if (budgetFilter === 'noExtraShopping') return { ...base, noExtraShopping: true };
    if (budgetFilter === 'under5') return { ...base, maxExtraCostCents: 500 };
    if (budgetFilter === 'under10') return { ...base, maxExtraCostCents: 1000 };
    if (budgetFilter === 'fitsWeeklyBudget' && budgetPreferences.weeklyBudgetCents != null) {
      return { ...base, maxExtraCostCents: budgetPreferences.weeklyBudgetCents };
    }
    return base;
  }, [context, budgetPreferences, budgetFilter]);

  return (
    <Screen>
      {isLoading ? null : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <PageHeader scale="display" title={getGreeting()} subtitle="Let's make food easier today." onSettingsPress={() => router.push('/settings')} />

          <QuickContextBar
            context={context}
            onToggle={toggleAnswer}
            safeMealsOnly={safeMealsProfile.showSafeOnly}
            onToggleSafeMealsOnly={() => setShowSafeOnly(!safeMealsProfile.showSafeOnly)}
            onReset={resetContext}
            budgetModeEnabled={budgetPreferences.enabled}
            budgetFilter={budgetFilter}
            onSelectBudgetFilter={setBudgetFilter}
            weeklyBudgetSet={budgetPreferences.weeklyBudgetCents != null}
          />

          <SmartAlerts
            products={products}
            inventoryItems={inventoryItems}
            recipes={recipes}
            plannedMeals={mealPlan.entries}
            alwaysInStockProductIds={alwaysInStockIds}
          />

          <MealSuggestions
            context={decisionContext}
            recipes={recipes}
            mealPlan={mealPlan}
            mealLogEntries={mealLog.entries}
            safeMealIds={safeMealIds}
            isSafeMeal={isSafeMeal}
            safeMealsOnly={safeMealsProfile.showSafeOnly}
            nutritionTrackingEnabled={profile?.nutritionTrackingEnabled ?? false}
            hiddenNutrients={hiddenNutrients}
          />

          <TodayTimeline recipes={recipes} mealPlan={mealPlan} mealLog={mealLog} />

          <NutritionSummary profile={profile} hiddenNutrients={hiddenNutrients} recipes={recipes} mealLog={mealLog} mealPlan={mealPlan} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});

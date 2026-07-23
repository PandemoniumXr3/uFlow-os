import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompletionStep } from '@/components/onboarding/CompletionStep';
import { FoodProfileStep } from '@/components/onboarding/FoodProfileStep';
import { ModulesStep } from '@/components/onboarding/ModulesStep';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { PrioritiesStep } from '@/components/onboarding/PrioritiesStep';
import { QuickStockSetup, type QuickStockPendingItem } from '@/components/onboarding/QuickStockSetup';
import { StartingSetupStep } from '@/components/onboarding/StartingSetupStep';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { Button } from '@/components/ui/Button';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { useDemoData } from '@/hooks/useDemoData';
import { useInventory } from '@/hooks/useInventory';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { ONBOARDING_TOTAL_STEPS, type OnboardingPriority, type OnboardingStartPath } from '@/types/onboarding';

const STEP_WELCOME = 0;
const STEP_PRIORITIES = 1;
const STEP_FOOD_PROFILE = 2;
const STEP_MODULES = 3;
const STEP_STARTING_SETUP = 4;
const STEP_COMPLETION = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    profile,
    isLoading: profileLoading,
    budgetPreferences,
    setBudgetPreferences,
    setNutritionTrackingEnabled,
    contextIntelligenceEnabled,
    setContextIntelligenceEnabled,
    setOnboardingStep,
    completeOnboarding,
    skipOnboarding,
    setOnboardingPriorities,
  } = useProfile();
  const { items: inventoryItems, addItem } = useInventory();
  const { products, addProduct } = useProducts();
  const { alwaysInStockIds } = useProductPreferences(products, false);
  const demoData = useDemoData();

  const [step, setStep] = useState(0);
  const [stepInitialized, setStepInitialized] = useState(false);
  const [startPath, setStartPath] = useState<OnboardingStartPath | null>(null);
  const [stockItemsAddedCount, setStockItemsAddedCount] = useState(0);
  const [installingDemo, setInstallingDemo] = useState(false);

  // Resume at whatever step was persisted, once — never re-seed after the user has since navigated.
  useEffect(() => {
    if (profile && !stepInitialized) {
      setStep(profile.onboarding?.currentStep ?? 0);
      setStepInitialized(true);
    }
  }, [profile, stepInitialized]);

  if (profileLoading || !profile || !stepInitialized) return null;

  // Function declarations below aren't narrowed by the guard above (TS treats hoisted
  // declarations independently of preceding control flow) — this alias is a real UserProfile.
  const currentProfile = profile;

  const existingProductIds = new Set(inventoryItems.map((item) => item.productId));

  function goToStep(next: number) {
    setStep(next);
    setOnboardingStep(next);
  }

  function goBack() {
    if (step > STEP_WELCOME) goToStep(step - 1);
  }

  function handleSkipSetup() {
    skipOnboarding();
    router.replace('/');
  }

  function handleTogglePriority(priority: OnboardingPriority) {
    const current = currentProfile.onboardingPriorities ?? [];
    const next = current.includes(priority) ? current.filter((p) => p !== priority) : [...current, priority];
    setOnboardingPriorities(next);
  }

  async function handleSelectStartPath(path: OnboardingStartPath) {
    setStartPath(path);
    if (path === 'empty') {
      goToStep(STEP_COMPLETION);
      return;
    }
    if (path === 'demo') {
      setInstallingDemo(true);
      await demoData.install();
      setInstallingDemo(false);
      goToStep(STEP_COMPLETION);
      return;
    }
    // 'quickStock' renders its own inline panel below and advances itself on confirm/skip.
  }

  async function handleConfirmQuickStock(items: QuickStockPendingItem[]) {
    // Sequential, not Promise.all: addItem's storage write is read-current-then-write-whole-array,
    // so concurrent calls race and silently drop all but the last one (see demoDataService.ts).
    for (const item of items) {
      await addItem(item.productId, {
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        expirationDate: item.expirationDate,
        lastPurchasePriceCents: item.lastPurchasePriceCents,
        packageQuantity: item.packageQuantity,
        packageUnit: item.packageUnit,
      });
    }
    setStockItemsAddedCount(items.length);
    goToStep(STEP_COMPLETION);
  }

  function handleGoToToday() {
    completeOnboarding();
    router.replace('/');
  }

  function handleSeeWhatICanMake() {
    completeOnboarding();
    router.replace('/recipes');
  }

  const modulesEnabled: string[] = [
    contextIntelligenceEnabled && 'Context Intelligence',
    budgetPreferences.enabled && 'Budget Mode',
    profile.nutritionTrackingEnabled && 'Nutrition',
  ].filter((x): x is string => !!x);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {step > STEP_WELCOME && step < STEP_COMPLETION ? (
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={iconSize.md} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {step < STEP_COMPLETION && <OnboardingProgress step={step} totalSteps={ONBOARDING_TOTAL_STEPS} />}
        {step === STEP_WELCOME ? (
          <Pressable onPress={handleSkipSetup} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip setup">
            <Text style={styles.skipText}>Skip setup</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === STEP_WELCOME && <WelcomeStep />}
        {step === STEP_PRIORITIES && <PrioritiesStep selected={profile.onboardingPriorities ?? []} onToggle={handleTogglePriority} />}
        {step === STEP_FOOD_PROFILE && <FoodProfileStep />}
        {step === STEP_MODULES && (
          <ModulesStep
            contextIntelligenceEnabled={contextIntelligenceEnabled}
            onToggleContextIntelligence={setContextIntelligenceEnabled}
            budgetEnabled={budgetPreferences.enabled}
            onToggleBudget={(value) => setBudgetPreferences({ enabled: value })}
            nutritionEnabled={profile.nutritionTrackingEnabled ?? false}
            onToggleNutrition={setNutritionTrackingEnabled}
          />
        )}
        {step === STEP_STARTING_SETUP && installingDemo && <Text style={styles.installingText}>Setting up demo data…</Text>}
        {step === STEP_STARTING_SETUP && !installingDemo && startPath !== 'quickStock' && <StartingSetupStep onSelectPath={handleSelectStartPath} />}
        {step === STEP_STARTING_SETUP && startPath === 'quickStock' && (
          <QuickStockSetup
            products={products}
            existingProductIds={new Set([...existingProductIds, ...alwaysInStockIds])}
            onAddProduct={addProduct}
            budgetModeEnabled={budgetPreferences.enabled}
            onConfirm={handleConfirmQuickStock}
            onSkip={() => goToStep(STEP_COMPLETION)}
          />
        )}
        {step === STEP_COMPLETION && (
          <CompletionStep
            stockItemsAdded={stockItemsAddedCount}
            modulesEnabled={modulesEnabled}
            profilePreferencesSaved={(profile.onboardingPriorities?.length ?? 0) > 0}
            demoDataInstalled={startPath === 'demo'}
            onGoToToday={handleGoToToday}
            onSeeWhatICanMake={inventoryItems.length > 0 || stockItemsAddedCount > 0 ? handleSeeWhatICanMake : undefined}
          />
        )}
      </ScrollView>

      {step < STEP_COMPLETION && step !== STEP_STARTING_SETUP && (
        <View style={styles.footer}>
          <Button label="Continue" onPress={() => goToStep(step + 1)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSpacer: {
    width: 24,
  },
  skipText: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
  },
  installingText: {
    ...typography.role.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingTop: spacing.xxl,
  },
});

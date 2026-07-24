import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { NUTRIENT_OPTIONS } from '@/constants/nutritionOptions';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { useUndo } from '@/contexts/UndoContext';
import { useBackup, type ExportPreviewCounts } from '@/hooks/useBackup';
import { useDemoData } from '@/hooks/useDemoData';
import { useDismissals } from '@/hooks/useDismissals';
import { useProfile } from '@/hooks/useProfile';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { mealLogStorageService } from '@/services/mealLog/mealLogStorageService';
import { mealPlanStorageService } from '@/services/mealPlan/mealPlanStorageService';
import { shoppingStorageService } from '@/services/shopping/shoppingStorageService';
import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { formatCents, parseToCents } from '@/utils/money';

type SettingsRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: '/tolerance' | '/diet';
};

const ROWS: SettingsRow[] = [
  { icon: 'shield-checkmark-outline', label: 'Tolerance & Allergy', description: 'Allergies, intolerances, and Safe Meals Only', href: '/tolerance' },
  { icon: 'leaf-outline', label: 'Diet', description: 'Vegan, vegetarian, pescatarian, high-protein', href: '/diet' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    profile,
    setNutritionTrackingEnabled,
    hiddenNutrients,
    toggleNutrientVisibility,
    budgetPreferences,
    setBudgetPreferences,
    contextIntelligenceEnabled,
    setContextIntelligenceEnabled,
    rerunOnboarding,
    reloadProfile,
  } = useProfile();
  const demoData = useDemoData();
  const backup = useBackup();
  const { scheduleUndo } = useUndo();
  const reducedMotion = useReducedMotionPreference();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { clearHistory } = useDismissals();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearSuggestions, setConfirmClearSuggestions] = useState(false);
  const [suggestionsCleared, setSuggestionsCleared] = useState(false);
  const nutritionEnabled = profile?.nutritionTrackingEnabled ?? false;

  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState('');
  const [maxMealCostInput, setMaxMealCostInput] = useState('');
  const [defaultStoreInput, setDefaultStoreInput] = useState('');

  const [exportOpen, setExportOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState<ExportPreviewCounts | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearGrocery, setConfirmClearGrocery] = useState(false);
  const [confirmClearStock, setConfirmClearStock] = useState(false);
  const [confirmClearMealPlan, setConfirmClearMealPlan] = useState(false);

  useEffect(() => {
    setWeeklyBudgetInput(budgetPreferences.weeklyBudgetCents != null ? String(budgetPreferences.weeklyBudgetCents / 100) : '');
    setMaxMealCostInput(budgetPreferences.preferredMaxMealCostCents != null ? String(budgetPreferences.preferredMaxMealCostCents / 100) : '');
    setDefaultStoreInput(budgetPreferences.defaultStore ?? '');
  }, [budgetPreferences.weeklyBudgetCents, budgetPreferences.preferredMaxMealCostCents, budgetPreferences.defaultStore]);

  async function handleClearAllData() {
    await asyncStorageClient.clearAll();
    setConfirmClear(false);
    // Re-creates a fresh profile (onboarding: not_started) so the root layout's own routing redirects
    // to onboarding automatically — the app behaves like a genuine fresh install, no manual restart needed.
    await reloadProfile();
    router.replace('/');
  }

  async function handleClearSuggestionHistory() {
    await clearHistory();
    setConfirmClearSuggestions(false);
    setSuggestionsCleared(true);
  }

  function handleRerunOnboarding() {
    rerunOnboarding();
    router.push('/onboarding');
  }

  async function handleToggleExport() {
    const next = !exportOpen;
    setExportOpen(next);
    setExportNote(null);
    if (next && !exportPreview) {
      setExportPreview(await backup.getExportPreview());
    }
  }

  async function handleExport(excludeDemoData: boolean) {
    setExporting(true);
    setExportNote(null);
    const result = await backup.exportData(excludeDemoData);
    setExporting(false);
    if (!result.success) {
      setExportNote(`Export failed: ${result.error ?? 'unknown error'}.`);
      return;
    }
    const methodLabel = result.method === 'download' ? 'Downloaded.' : result.method === 'share' ? 'Ready to share.' : 'Copied to clipboard (share sheet was unavailable).';
    setExportNote(methodLabel);
  }

  async function handleClearMealHistory() {
    const snapshot = await mealLogStorageService.getAll();
    await mealLogStorageService.save([]);
    setConfirmClearHistory(false);
    scheduleUndo({ id: 'clear-meal-history', message: 'Meal history cleared', restore: () => mealLogStorageService.save(snapshot) });
  }

  async function handleClearGrocery() {
    const [manualSnapshot, overlaySnapshot] = await Promise.all([shoppingStorageService.getManualItems(), shoppingStorageService.getOverlay()]);
    await Promise.all([shoppingStorageService.saveManualItems([]), shoppingStorageService.saveOverlay({})]);
    setConfirmClearGrocery(false);
    scheduleUndo({
      id: 'clear-grocery',
      message: 'Grocery list cleared',
      restore: () => Promise.all([shoppingStorageService.saveManualItems(manualSnapshot), shoppingStorageService.saveOverlay(overlaySnapshot)]).then(() => undefined),
    });
  }

  async function handleClearStock() {
    const snapshot = await inventoryStorageService.getAll();
    await inventoryStorageService.save([]);
    setConfirmClearStock(false);
    scheduleUndo({ id: 'clear-stock', message: 'Stock cleared', restore: () => inventoryStorageService.save(snapshot) });
  }

  async function handleClearMealPlan() {
    const snapshot = await mealPlanStorageService.getAll();
    await mealPlanStorageService.save([]);
    setConfirmClearMealPlan(false);
    scheduleUndo({ id: 'clear-meal-plan', message: 'Meal plan cleared', restore: () => mealPlanStorageService.save(snapshot) });
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <SectionHeader title="Getting started" />
          <Card variant="standard" style={styles.groupCard}>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={handleRerunOnboarding}>
              <Ionicons name="rocket-outline" size={iconSize.md} color={colors.accentBlue} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Rerun setup</Text>
                <Text style={styles.rowDescription}>Rerunning setup will not delete your current data.</Text>
              </View>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
            </Pressable>

            <Pressable style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]} onPress={() => router.push('/tolerance')}>
              <Ionicons name="restaurant-outline" size={iconSize.md} color={colors.accentBlue} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Review food profile</Text>
                <Text style={styles.rowDescription}>Allergies, intolerances, and safe/familiar preferences.</Text>
              </View>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
            </Pressable>

            <View style={[styles.row, styles.rowDivider]}>
              <Ionicons name="pulse-outline" size={iconSize.md} color={colors.accentBlue} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Context Intelligence</Text>
                <Text style={styles.rowDescription}>Suggestions adapt to hunger, energy, time, and location.</Text>
              </View>
              <Switch
                value={contextIntelligenceEnabled}
                onValueChange={setContextIntelligenceEnabled}
                accessibilityLabel={`Context Intelligence, ${contextIntelligenceEnabled ? 'enabled' : 'disabled'}`}
                trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
                thumbColor={contextIntelligenceEnabled ? colors.accentBlue : colors.textTertiary}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Food preferences" />
          <Card variant="standard" style={styles.groupCard}>
            {ROWS.map((row, index) => (
              <Pressable
                key={row.href}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
                onPress={() => router.push(row.href)}>
                <Ionicons name={row.icon} size={iconSize.md} color={colors.accentBlue} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowDescription}>{row.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Card>
        </View>

        {profile && (
          <View style={styles.section}>
            <SectionHeader title="Nutrition" />
            <Card variant="standard" style={styles.groupCard}>
              <View style={styles.row}>
                <Ionicons name="nutrition-outline" size={iconSize.md} color={colors.accentBlue} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Nutrition tracking</Text>
                  <Text style={styles.rowDescription}>Optional — shows kcal and macros where available.</Text>
                </View>
                <Switch
                  value={nutritionEnabled}
                  onValueChange={setNutritionTrackingEnabled}
                  trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
                  thumbColor={nutritionEnabled ? colors.accentBlue : colors.textTertiary}
                />
              </View>

              {nutritionEnabled && (
                <Animated.View style={styles.rowDivider} layout={layoutTransition(reducedMotion)}>
                  <Pressable style={styles.row} onPress={() => setCustomizeOpen(!customizeOpen)}>
                    <Ionicons name="options-outline" size={iconSize.md} color={colors.accentBlue} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>Customize visible nutrients</Text>
                      <Text style={styles.rowDescription}>Choose which values show up in nutrition summaries.</Text>
                    </View>
                    <Ionicons name={customizeOpen ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
                  </Pressable>

                  {customizeOpen && (
                    <Animated.View
                      style={[styles.nutrientSection, styles.rowDivider]}
                      entering={enterFade(reducedMotion)}
                      exiting={exitFade(reducedMotion)}>
                      {NUTRIENT_OPTIONS.map((option) => {
                        const visible = !hiddenNutrients.has(option.value);
                        return (
                          <View key={option.value} style={styles.nutrientRow}>
                            <Text style={styles.nutrientLabel}>{option.label}</Text>
                            <Switch
                              value={visible}
                              onValueChange={() => toggleNutrientVisibility(option.value)}
                              trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
                              thumbColor={visible ? colors.accentBlue : colors.textTertiary}
                            />
                          </View>
                        );
                      })}
                    </Animated.View>
                  )}
                </Animated.View>
              )}
            </Card>
          </View>
        )}

        {profile && (
          <View style={styles.section}>
            <SectionHeader title="Budget" />
            <Card variant="standard" style={styles.groupCard}>
              <View style={styles.row}>
                <Ionicons name="wallet-outline" size={iconSize.md} color={colors.accentOchre} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Budget Mode</Text>
                  <Text style={styles.rowDescription}>Optional — see grocery costs and what fits your weekly budget.</Text>
                </View>
                <Switch
                  value={budgetPreferences.enabled}
                  onValueChange={(value) => setBudgetPreferences({ enabled: value })}
                  trackColor={{ false: colors.border, true: colors.accentOchreMuted }}
                  thumbColor={budgetPreferences.enabled ? colors.accentOchre : colors.textTertiary}
                />
              </View>

              {budgetPreferences.enabled && (
                <Animated.View style={[styles.budgetSection, styles.rowDivider]} layout={layoutTransition(reducedMotion)}>
                  <Text style={styles.sectionLabel}>Weekly grocery budget</Text>
                  <View style={styles.budgetInputRow}>
                    <TextField
                      value={weeklyBudgetInput}
                      onChangeText={setWeeklyBudgetInput}
                      onBlur={() => setBudgetPreferences({ weeklyBudgetCents: parseToCents(weeklyBudgetInput) ?? undefined })}
                      placeholder="e.g. 50"
                      keyboardType="numeric"
                      style={styles.budgetInput}
                    />
                    <Text style={styles.currencyLabel}>EUR</Text>
                  </View>

                  <Text style={styles.sectionLabel}>Budget week starts on</Text>
                  <View style={styles.chipRow}>
                    <Chip
                      label="Monday"
                      selected={budgetPreferences.weekStartsOn === 1}
                      onPress={() => setBudgetPreferences({ weekStartsOn: 1 })}
                    />
                    <Chip
                      label="Sunday"
                      selected={budgetPreferences.weekStartsOn === 0}
                      onPress={() => setBudgetPreferences({ weekStartsOn: 0 })}
                    />
                  </View>

                  <Text style={styles.sectionLabel}>Preferred maximum meal cost (optional)</Text>
                  <TextField
                    value={maxMealCostInput}
                    onChangeText={setMaxMealCostInput}
                    onBlur={() =>
                      setBudgetPreferences({ preferredMaxMealCostCents: parseToCents(maxMealCostInput) ?? undefined })
                    }
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                  />

                  <Text style={styles.sectionLabel}>Default store (optional)</Text>
                  <TextField
                    value={defaultStoreInput}
                    onChangeText={setDefaultStoreInput}
                    onBlur={() => setBudgetPreferences({ defaultStore: defaultStoreInput.trim() || undefined })}
                    placeholder="e.g. Albert Heijn"
                  />

                  {budgetPreferences.weeklyBudgetCents != null && (
                    <Text style={styles.rowDescription}>
                      Budgeting {formatCents(budgetPreferences.weeklyBudgetCents)} per week. Add prices gradually in Stock — estimates
                      improve as you go.
                    </Text>
                  )}
                </Animated.View>
              )}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Backup" />
          <Card variant="standard" style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={handleToggleExport}
              accessibilityRole="button"
              accessibilityLabel="Export data"
              accessibilityState={{ expanded: exportOpen }}>
              <Ionicons name="download-outline" size={iconSize.md} color={colors.accentBlue} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Export data</Text>
                <Text style={styles.rowDescription}>{backup.status.lastExportAt ? `Last export ${new Date(backup.status.lastExportAt).toLocaleDateString()}` : 'Save a local backup of your data.'}</Text>
              </View>
              <Ionicons name={exportOpen ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
            </Pressable>

            {exportOpen && (
              <Animated.View style={[styles.exportSection, styles.rowDivider]} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
                {exportPreview ? (
                  <>
                    <View style={styles.countGrid}>
                      <Text style={styles.countText}>{exportPreview.recipes} recipes</Text>
                      <Text style={styles.countText}>{exportPreview.products} products</Text>
                      <Text style={styles.countText}>{exportPreview.inventory} Stock items</Text>
                      <Text style={styles.countText}>{exportPreview.manualGroceryItems} Grocery items</Text>
                      <Text style={styles.countText}>{exportPreview.mealPlan} planned meals</Text>
                      <Text style={styles.countText}>{exportPreview.mealHistory} history entries</Text>
                    </View>
                    <Text style={styles.rowDescription}>{exportPreview.profileIncluded ? 'Includes your profile.' : 'No profile to include.'}</Text>
                    {exportPreview.demoDataIncluded && <Text style={styles.rowDescription}>Includes demo data.</Text>}
                    <Text style={styles.privacyNote}>
                      This is a plain JSON file, not encrypted. It may contain personal food preferences and meal history — store it somewhere private.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.exportButton, pressed && styles.rowPressed]}
                      onPress={() => handleExport(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Export full backup"
                      accessibilityState={{ disabled: exporting }}
                      disabled={exporting}>
                      <Text style={styles.exportButtonLabel}>Export full backup</Text>
                    </Pressable>
                    {exportPreview.demoDataIncluded && (
                      <Pressable
                        style={({ pressed }) => [styles.exportButtonSecondary, pressed && styles.rowPressed]}
                        onPress={() => handleExport(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Export excluding demo data"
                        accessibilityState={{ disabled: exporting }}
                        disabled={exporting}>
                        <Text style={styles.exportButtonSecondaryLabel}>Export excluding demo data</Text>
                      </Pressable>
                    )}
                    {exportNote && (
                      <Text style={styles.clearedNote} accessibilityLiveRegion="polite">
                        {exportNote}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.rowDescription}>Loading…</Text>
                )}
              </Animated.View>
            )}

            <Pressable
              style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => router.push('/import')}
              accessibilityRole="button"
              accessibilityLabel="Import data"
              accessibilityHint={
                backup.status.lastImportAt
                  ? `Last import ${new Date(backup.status.lastImportAt).toLocaleDateString()}${backup.status.lastImportWarningsCount ? `, ${backup.status.lastImportWarningsCount} warning${backup.status.lastImportWarningsCount === 1 ? '' : 's'}` : ''}`
                  : 'Restore or merge a uFlow backup file, with a preview before anything changes.'
              }>
              <Ionicons name="cloud-upload-outline" size={iconSize.md} color={colors.accentBlue} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Import data</Text>
                <Text style={styles.rowDescription}>
                  {backup.status.lastImportAt
                    ? `Last import ${new Date(backup.status.lastImportAt).toLocaleDateString()}${backup.status.lastImportWarningsCount ? ` · ${backup.status.lastImportWarningsCount} warning${backup.status.lastImportWarningsCount === 1 ? '' : 's'}` : ''}`
                    : 'Restore or merge a uFlow backup file, with a preview before anything changes.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Demo data" />
          <Card variant="standard" style={styles.groupCard}>
            {demoData.isLoading ? null : demoData.isInstalled ? (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => demoData.remove()}
                accessibilityRole="button"
                accessibilityLabel="Remove demo data"
                accessibilityHint="Removes only the demo Stock, recipes, and plan. Your own data is unaffected.">
                <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, styles.destructiveLabel]}>Remove demo data</Text>
                  <Text style={styles.rowDescription}>Removes only the demo Stock, recipes, and plan. Your own data is unaffected.</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => demoData.install()}
                accessibilityRole="button"
                accessibilityLabel="Install demo data"
                accessibilityHint="See a working example — Stock, a planned meal, and Grocery.">
                <Ionicons name="sparkles-outline" size={iconSize.md} color={colors.accentBlue} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Install demo data</Text>
                  <Text style={styles.rowDescription}>See a working example — Stock, a planned meal, and Grocery.</Text>
                </View>
              </Pressable>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Suggestions" />
          <Card variant="standard" style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setConfirmClearSuggestions(true)}
              accessibilityRole="button"
              accessibilityLabel="Reset suggestion history"
              accessibilityHint='Clears every "not this" and "hide forever" dismissal. Recipes, stock, and plans are unaffected.'>
              <Ionicons name="refresh-outline" size={iconSize.md} color={colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Reset suggestion history</Text>
                <Text style={styles.rowDescription}>Clears every "not this" and "hide forever" dismissal. Recipes, stock, and plans are unaffected.</Text>
              </View>
            </Pressable>
          </Card>
          {suggestionsCleared && (
            <Text style={styles.clearedNote} accessibilityLiveRegion="polite">
              Suggestion history reset.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Destructive actions" />
          <Card variant="standard" style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setConfirmClearHistory(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear meal history"
              accessibilityHint="Removes every logged meal entry. Recipes, Stock, and your plan are unaffected. Undo available briefly after.">
              <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear meal history</Text>
                <Text style={styles.rowDescription}>Removes every logged meal entry. Recipes, Stock, and your plan are unaffected. Undo available briefly after.</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => setConfirmClearGrocery(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear Grocery"
              accessibilityHint="Removes every manually added Grocery item and resets checked/hidden state on automatic items. Undo available briefly after.">
              <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear Grocery</Text>
                <Text style={styles.rowDescription}>Removes every manually added Grocery item and resets checked/hidden state on automatic items. Undo available briefly after.</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => setConfirmClearStock(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear Stock"
              accessibilityHint="Removes every Stock item. Products, recipes, and your plan are unaffected. Undo available briefly after.">
              <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear Stock</Text>
                <Text style={styles.rowDescription}>Removes every Stock item. Products, recipes, and your plan are unaffected. Undo available briefly after.</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => setConfirmClearMealPlan(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear meal plan"
              accessibilityHint="Removes every planned meal on every date. History already logged is unaffected. Undo available briefly after.">
              <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear meal plan</Text>
                <Text style={styles.rowDescription}>Removes every planned meal on every date. History already logged is unaffected. Undo available briefly after.</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => setConfirmClear(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear all data"
              accessibilityHint="Removes your profile, recipes, Products, Stock, Grocery, Meal Plan, history, preferences, onboarding state, and demo metadata. No undo — export a backup first if unsure.">
              <Ionicons name="warning-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear all data</Text>
                <Text style={styles.rowDescription}>
                  Removes your profile, recipes, Products, Stock, Grocery, Meal Plan, history, preferences, onboarding state, and demo metadata. No undo — export a backup first if unsure.
                </Text>
              </View>
            </Pressable>
          </Card>
        </View>

        {profile && (
          <View style={styles.section}>
            <SectionHeader title="About" />
            <Card variant="standard" style={styles.groupCard}>
              <View style={styles.row}>
                <Ionicons name="information-circle-outline" size={iconSize.md} color={colors.textSecondary} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>uFlow</Text>
                  <Text style={styles.rowDescription}>Using uFlow since {new Date(profile.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmClearSuggestions}
        title="Reset suggestion history?"
        message="Clears which meals you've dismissed or hidden, so suggestions start fresh. This doesn't affect recipes, stock, or plans."
        confirmLabel="Reset"
        onConfirm={handleClearSuggestionHistory}
        onCancel={() => setConfirmClearSuggestions(false)}
      />

      <ConfirmDialog
        visible={confirmClearHistory}
        title="Clear meal history?"
        message="Removes every logged meal entry from your history. Recipes, Stock, and your plan are unaffected. You can undo this right after."
        confirmLabel="Clear history"
        destructive
        onConfirm={handleClearMealHistory}
        onCancel={() => setConfirmClearHistory(false)}
      />

      <ConfirmDialog
        visible={confirmClearGrocery}
        title="Clear Grocery?"
        message="Removes every manually added Grocery item and resets checked/hidden state on automatic items. You can undo this right after."
        confirmLabel="Clear Grocery"
        destructive
        onConfirm={handleClearGrocery}
        onCancel={() => setConfirmClearGrocery(false)}
      />

      <ConfirmDialog
        visible={confirmClearStock}
        title="Clear Stock?"
        message="Removes every Stock item. Products, recipes, and your plan are unaffected. You can undo this right after."
        confirmLabel="Clear Stock"
        destructive
        onConfirm={handleClearStock}
        onCancel={() => setConfirmClearStock(false)}
      />

      <ConfirmDialog
        visible={confirmClearMealPlan}
        title="Clear meal plan?"
        message="Removes every planned meal on every date. History already logged is unaffected. You can undo this right after."
        confirmLabel="Clear meal plan"
        destructive
        onConfirm={handleClearMealPlan}
        onCancel={() => setConfirmClearMealPlan(false)}
      />

      <ConfirmDialog
        visible={confirmClear}
        title="Clear all data?"
        message="This permanently removes your profile, recipes, Products, Stock, Grocery, Meal Plan, history, preferences, onboarding state, and demo metadata. This can't be undone — export a backup first if you're unsure."
        confirmLabel="Clear everything"
        destructive
        onConfirm={handleClearAllData}
        onCancel={() => setConfirmClear(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  groupCard: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  destructiveLabel: {
    color: colors.danger,
  },
  rowDescription: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
  nutrientSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  budgetSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetInput: {
    flex: 1,
  },
  currencyLabel: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutrientLabel: {
    ...typography.role.body,
    color: colors.textPrimary,
  },
  clearedNote: {
    ...typography.role.metadata,
    color: colors.accentGreen,
    paddingHorizontal: spacing.xs,
  },
  exportSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  countGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  countText: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  privacyNote: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  exportButton: {
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  exportButtonLabel: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.background,
  },
  exportButtonSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportButtonSecondaryLabel: {
    ...typography.role.body,
    color: colors.textPrimary,
  },
});

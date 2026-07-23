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
import { useDemoData } from '@/hooks/useDemoData';
import { useDismissals } from '@/hooks/useDismissals';
import { useProfile } from '@/hooks/useProfile';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
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
  } = useProfile();
  const demoData = useDemoData();
  const reducedMotion = useReducedMotionPreference();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { clearHistory } = useDismissals();
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [confirmClearSuggestions, setConfirmClearSuggestions] = useState(false);
  const [suggestionsCleared, setSuggestionsCleared] = useState(false);
  const nutritionEnabled = profile?.nutritionTrackingEnabled ?? false;

  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState('');
  const [maxMealCostInput, setMaxMealCostInput] = useState('');
  const [defaultStoreInput, setDefaultStoreInput] = useState('');

  useEffect(() => {
    setWeeklyBudgetInput(budgetPreferences.weeklyBudgetCents != null ? String(budgetPreferences.weeklyBudgetCents / 100) : '');
    setMaxMealCostInput(budgetPreferences.preferredMaxMealCostCents != null ? String(budgetPreferences.preferredMaxMealCostCents / 100) : '');
    setDefaultStoreInput(budgetPreferences.defaultStore ?? '');
  }, [budgetPreferences.weeklyBudgetCents, budgetPreferences.preferredMaxMealCostCents, budgetPreferences.defaultStore]);

  async function handleClearAllData() {
    await asyncStorageClient.clearAll();
    setConfirmClear(false);
    setCleared(true);
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

            {demoData.isLoading ? null : demoData.isInstalled ? (
              <Pressable style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]} onPress={() => demoData.remove()}>
                <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, styles.destructiveLabel]}>Remove demo data</Text>
                  <Text style={styles.rowDescription}>Removes only the demo Stock, recipes, and plan. Your own data is unaffected.</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]} onPress={() => demoData.install()}>
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
          <SectionHeader title="Data and privacy" />
          <Card variant="standard" style={styles.groupCard}>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => setConfirmClearSuggestions(true)}>
              <Ionicons name="refresh-outline" size={iconSize.md} color={colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Reset suggestion history</Text>
                <Text style={styles.rowDescription}>Clears dismissed and hidden meals. Recipes, stock, and plans are unaffected.</Text>
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]} onPress={() => setConfirmClear(true)}>
              <Ionicons name="trash-outline" size={iconSize.md} color={colors.danger} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, styles.destructiveLabel]}>Clear all data</Text>
                <Text style={styles.rowDescription}>Removes everything stored on this device — recipes, stock, plans, and preferences.</Text>
              </View>
            </Pressable>
          </Card>
          {suggestionsCleared && <Text style={styles.clearedNote}>Suggestion history reset.</Text>}
          {cleared && <Text style={styles.clearedNote}>Data cleared. Restart uFlow to start fresh.</Text>}
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
        visible={confirmClear}
        title="Clear all data?"
        message="This permanently removes every recipe, stock item, plan, and preference on this device. This can't be undone."
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
});

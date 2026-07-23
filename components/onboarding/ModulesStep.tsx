import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type ModuleRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ModuleRow({ icon, title, description, value, onValueChange }: ModuleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconCircle}>
        <Ionicons name={icon} size={iconSize.md} color={colors.accentBlue} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={`${title}, ${value ? 'enabled' : 'disabled'}`}
        trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
        thumbColor={value ? colors.accentBlue : colors.textTertiary}
      />
    </View>
  );
}

type ModulesStepProps = {
  contextIntelligenceEnabled: boolean;
  onToggleContextIntelligence: (value: boolean) => void;
  budgetEnabled: boolean;
  onToggleBudget: (value: boolean) => void;
  nutritionEnabled: boolean;
  onToggleNutrition: (value: boolean) => void;
};

/** Onboarding Step 4 — every toggle here is the exact same profile field Settings reads/writes, so nothing is onboarding-only or duplicated. */
export function ModulesStep({
  contextIntelligenceEnabled,
  onToggleContextIntelligence,
  budgetEnabled,
  onToggleBudget,
  nutritionEnabled,
  onToggleNutrition,
}: ModulesStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Turn on what's useful</Text>
      <Text style={styles.subtitle}>Every one of these can be changed later in Settings.</Text>

      <View style={styles.rowGroup}>
        <ModuleRow
          icon="pulse-outline"
          title="Context Intelligence"
          description="Suggestions adapt to hunger, energy, time, location, and warm/cold or safe/new preference."
          value={contextIntelligenceEnabled}
          onValueChange={onToggleContextIntelligence}
        />
        <ModuleRow
          icon="wallet-outline"
          title="Budget Mode"
          description="See recipe and Grocery cost estimates when Product prices are available."
          value={budgetEnabled}
          onValueChange={onToggleBudget}
        />
        <ModuleRow
          icon="nutrition-outline"
          title="Nutrition"
          description="See kcal and macros when recipes contain nutrition information."
          value={nutritionEnabled}
          onValueChange={onToggleNutrition}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
  },
  rowGroup: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  rowDescription: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

import { Stack } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ALLERGEN_OPTIONS, INTOLERANCE_OPTIONS } from '@/constants/toleranceOptions';
import { colors, spacing, typography } from '@/constants/theme';
import { useTolerance } from '@/hooks/useTolerance';

export default function ToleranceScreen() {
  const { profile, toggleAllergen, toggleIntolerance, setSafeMealsOnly } = useTolerance();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Tolerance & Allergy' }} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergies</Text>
        <Text style={styles.sectionHint}>Recipes with these will be flagged automatically.</Text>
        <View style={styles.chipRow}>
          {ALLERGEN_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.allergies.includes(option.value)}
              onPress={() => toggleAllergen(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Intolerances</Text>
        <View style={styles.chipRow}>
          {INTOLERANCE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.intolerances.includes(option.value)}
              onPress={() => toggleIntolerance(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Text style={styles.sectionTitle}>Hide My Allergens</Text>
          <Text style={styles.sectionHint}>Hide recipes containing anything selected above.</Text>
        </View>
        <Switch
          value={profile.safeMealsOnly}
          onValueChange={setSafeMealsOnly}
          trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
          thumbColor={profile.safeMealsOnly ? colors.accentBlue : colors.textTertiary}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    gap: spacing.xs,
  },
});

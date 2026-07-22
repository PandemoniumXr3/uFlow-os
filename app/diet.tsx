import { Stack } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { DIET_OPTIONS } from '@/constants/dietOptions';
import { colors, spacing, typography } from '@/constants/theme';
import { useDiet } from '@/hooks/useDiet';

export default function DietScreen() {
  const { profile, toggleDiet, setMatchDietOnly } = useDiet();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Diet' }} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diet preferences</Text>
        <Text style={styles.sectionHint}>Pick as many as apply. Recipes are checked against all of them.</Text>
        <View style={styles.chipRow}>
          {DIET_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={profile.active.includes(option.value)}
              onPress={() => toggleDiet(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Text style={styles.sectionTitle}>Match My Diet Only</Text>
          <Text style={styles.sectionHint}>Hide recipes that don't fit every diet selected above.</Text>
        </View>
        <Switch
          value={profile.matchDietOnly}
          onValueChange={setMatchDietOnly}
          trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
          thumbColor={profile.matchDietOnly ? colors.accentBlue : colors.textTertiary}
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

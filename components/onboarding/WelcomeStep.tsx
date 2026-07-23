import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

const LOOP_STEPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'cube-outline', label: 'Stock' },
  { icon: 'restaurant-outline', label: 'Meals' },
  { icon: 'calendar-outline', label: 'Plan' },
  { icon: 'cart-outline', label: 'Grocery' },
];

const VALUE_POINTS = [
  'uFlow knows what you have.',
  'It suggests meals that fit your situation.',
  'It helps you plan.',
  'It creates Grocery needs.',
  'It learns from what you confirm.',
];

/** Onboarding Step 1 — the one screen that has to earn the other five minutes. No permissions, no accounts, just the loop. */
export function WelcomeStep() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make food decisions easier.</Text>

      <View style={styles.loopRow} accessible accessibilityLabel="Stock leads to Meals, leads to Plan, leads to Grocery, and back to Stock">
        {LOOP_STEPS.map((item, index) => (
          <View key={item.label} style={styles.loopItemWrap}>
            <View style={styles.loopItem}>
              <View style={styles.loopIconCircle}>
                <Ionicons name={item.icon} size={iconSize.md} color={colors.accentBlue} />
              </View>
              <Text style={styles.loopLabel}>{item.label}</Text>
            </View>
            {index < LOOP_STEPS.length - 1 && <Ionicons name="arrow-forward" size={iconSize.sm} color={colors.textTertiary} style={styles.loopArrow} />}
          </View>
        ))}
      </View>

      <View style={styles.valueList}>
        {VALUE_POINTS.map((point) => (
          <View key={point} style={styles.valueRow}>
            <View style={styles.valueDot} />
            <Text style={styles.valueText}>{point}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  title: {
    ...typography.role.display,
    color: colors.textPrimary,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  loopItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loopItem: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  loopIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopLabel: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  loopArrow: {
    marginHorizontal: -spacing.xs,
  },
  valueList: {
    gap: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  valueDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentBlue,
    marginTop: 8,
  },
  valueText: {
    ...typography.role.body,
    color: colors.textSecondary,
    flex: 1,
  },
});

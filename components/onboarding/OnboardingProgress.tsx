import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type OnboardingProgressProps = {
  step: number;
  totalSteps: number;
};

/**
 * Restrained progress indicator — a row of small dots, not a percentage bar
 * or a step wizard's numbered circles. `accessibilityLiveRegion="polite"`
 * on the label means a screen reader announces "Step 2 of 6" once per step
 * change without needing to be re-focused.
 */
export function OnboardingProgress({ step, totalSteps }: OnboardingProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dots} accessible={false}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View key={index} style={[styles.dot, index === step && styles.dotActive, index < step && styles.dotComplete]} />
        ))}
      </View>
      <Text style={styles.label} accessibilityLiveRegion="polite">{`Step ${step + 1} of ${totalSteps}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accentBlue,
    width: 20,
  },
  dotComplete: {
    backgroundColor: colors.accentBlueMuted,
  },
  label: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

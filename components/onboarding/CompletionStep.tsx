import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type CompletionStepProps = {
  stockItemsAdded: number;
  modulesEnabled: string[];
  profilePreferencesSaved: boolean;
  demoDataInstalled: boolean;
  onGoToToday: () => void;
  /** Omitted entirely (not just disabled) when there's no Stock to base a recommendation on yet. */
  onSeeWhatICanMake?: () => void;
};

/** Onboarding Step 6 — a plain confirmation, not a celebration screen. Only lists what actually happened. */
export function CompletionStep({ stockItemsAdded, modulesEnabled, profilePreferencesSaved, demoDataInstalled, onGoToToday, onSeeWhatICanMake }: CompletionStepProps) {
  const summaryLines: string[] = [];
  if (demoDataInstalled) summaryLines.push('Demo data is set up — Stock, a planned meal, and Grocery.');
  if (stockItemsAdded > 0 && !demoDataInstalled) summaryLines.push(`${stockItemsAdded} item${stockItemsAdded === 1 ? '' : 's'} added to Stock.`);
  if (modulesEnabled.length > 0) summaryLines.push(`${modulesEnabled.join(', ')} ${modulesEnabled.length === 1 ? 'is' : 'are'} on.`);
  if (profilePreferencesSaved) summaryLines.push('Your food profile is saved.');

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark" size={iconSize.xl} color={colors.accentGreen} />
      </View>
      <Text style={styles.title}>uFlow is ready.</Text>

      {summaryLines.length > 0 && (
        <View style={styles.summaryList}>
          {summaryLines.map((line) => (
            <Text key={line} style={styles.summaryLine}>
              {line}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button label="Go to Today" onPress={onGoToToday} />
        {onSeeWhatICanMake && <Button label="See what I can make" variant="quiet" onPress={onSeeWhatICanMake} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  summaryList: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  summaryLine: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});

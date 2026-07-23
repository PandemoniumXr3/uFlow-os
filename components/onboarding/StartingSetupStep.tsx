import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, radius, shadow, spacing, typography } from '@/constants/theme';
import type { OnboardingStartPath } from '@/types/onboarding';

type StartPathOption = {
  path: OnboardingStartPath;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const START_PATH_OPTIONS: StartPathOption[] = [
  {
    path: 'demo',
    icon: 'sparkles-outline',
    title: 'Start with demo data',
    description: 'See a working example — Stock, a planned meal, and Grocery, all filled in. Clearly labeled, removable anytime.',
  },
  {
    path: 'quickStock',
    icon: 'cube-outline',
    title: 'Quick Stock setup',
    description: 'Add 3–8 things you usually have, right now, in under a minute.',
  },
  {
    path: 'empty',
    icon: 'leaf-outline',
    title: 'Start empty',
    description: "You can add Stock or Recipes whenever you're ready.",
  },
];

type StartingSetupStepProps = {
  onSelectPath: (path: OnboardingStartPath) => void;
};

/** Onboarding Step 5 — three equally-valid paths, no path implied as "the right one." */
export function StartingSetupStep({ onSelectPath }: StartingSetupStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How would you like to start?</Text>
      <View style={styles.cardList}>
        {START_PATH_OPTIONS.map((option) => (
          <Pressable
            key={option.path}
            onPress={() => onSelectPath(option.path)}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            accessibilityHint={option.description}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardIconCircle}>
              <Ionicons name={option.icon} size={iconSize.md} color={colors.accentBlue} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
          </Pressable>
        ))}
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
  cardList: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.soft,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  cardDescription: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

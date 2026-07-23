import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type GetStartedCardProps = {
  onUseDemoSetup: () => void;
};

/** Shown on Today whenever Stock is empty — regardless of how onboarding was finished, so it disappears the moment any Stock exists. */
export function GetStartedCard({ onUseDemoSetup }: GetStartedCardProps) {
  const router = useRouter();

  const actions: ActionItem[] = [
    { icon: 'cube-outline', label: 'Add Stock', onPress: () => router.push('/(tabs)/stock') },
    { icon: 'book-outline', label: 'Add a Recipe', onPress: () => router.push('/recipe/new') },
    { icon: 'sparkles-outline', label: 'Use demo setup', onPress: onUseDemoSetup },
    { icon: 'compass-outline', label: 'Explore uFlow', onPress: () => router.push('/(tabs)/recipes') },
  ];

  return (
    <Card variant="standard" style={styles.card}>
      <Text style={styles.title}>Start with one small step.</Text>
      <View style={styles.actionList}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}>
            <View style={styles.actionIconCircle}>
              <Ionicons name={action.icon} size={iconSize.sm} color={colors.accentBlue} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  actionList: {
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.7,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.role.body,
    color: colors.textPrimary,
    flex: 1,
  },
});

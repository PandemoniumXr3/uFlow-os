import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Renders inline (no flex:1 centering) for use inside a scrollable section rather than as a whole-screen state. */
  compact?: boolean;
};

/** One concise title, one sentence, one optional primary action — never a long explanation. */
export function EmptyState({ icon, title, description, actionLabel, onAction, compact }: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.glow}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={iconSize.xl} color={colors.accentBlue} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  containerCompact: {
    flex: undefined,
    paddingVertical: spacing.xl,
  },
  glow: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.glowBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
  },
  description: {
    ...typography.role.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.sm,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onSettingsPress?: () => void;
};

export function ScreenHeader({ title, subtitle, onSettingsPress }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {onSettingsPress ? (
          <IconButton icon="settings-outline" accessibilityLabel="Settings" onPress={onSettingsPress} />
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.base,
  },
});

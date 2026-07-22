import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';

type PageHeaderProps = {
  /** Small label above the title — a date, a breadcrumb, "Settings". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** 'display' is reserved for Today's greeting — every other screen uses 'title'. */
  scale?: 'title' | 'display';
  onSettingsPress?: () => void;
  rightAction?: ReactNode;
};

/**
 * The one header pattern for every screen — replaces the old three-way split
 * (tab ScreenHeader / Today's bespoke header / native Stack header) so the
 * app reads as one product. `scale="display"` is for Today only.
 */
export function PageHeader({ eyebrow, title, subtitle, scale = 'title', onSettingsPress, rightAction }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.textColumn}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={scale === 'display' ? styles.displayTitle : styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction ?? (onSettingsPress ? <IconButton icon="settings-outline" accessibilityLabel="Settings" onPress={onSettingsPress} /> : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  displayTitle: {
    ...typography.role.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.role.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

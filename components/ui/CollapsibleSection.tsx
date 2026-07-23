import { Ionicons } from '@expo/vector-icons';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

type CollapsibleSectionProps = PropsWithChildren<{
  title: string;
  /** Short trailing hint shown even while collapsed, e.g. a completeness label — keeps the section scannable closed. */
  subtitle?: string;
  defaultOpen?: boolean;
}>;

/**
 * The one collapsible-section pattern for dense detail screens (Recipe
 * Detail's Nutrition/Budget/Safety/Equipment/Notes) — previously hand-copied
 * per screen as a Pressable + chevron + Animated.View triad; formalized here
 * so a screen with several of these doesn't read as one giant card.
 */
export function CollapsibleSection({ title, subtitle, defaultOpen, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const reducedMotion = useReducedMotionPreference();

  return (
    <Animated.View style={styles.container} layout={layoutTransition(reducedMotion)}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${open ? 'expanded' : 'collapsed'}`}
        accessibilityHint={open ? 'Collapses this section' : 'Expands this section'}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {subtitle && !open && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
        </View>
      </Pressable>

      {open && (
        <Animated.View entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} style={styles.content}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  subtitle: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  content: {
    paddingBottom: spacing.xs,
  },
});

import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';

type CardVariant = 'hero' | 'standard' | 'compact' | 'insight' | 'neutral';

type CardProps = PropsWithChildren<{
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * The app's small, intentional card set — pick one, don't invent a new
 * rounded-rectangle-with-border combination per screen:
 *  - hero: the one featured element per screen (top suggestion, day header)
 *  - standard: a normal content surface (most sections)
 *  - compact: a dense list row (timeline items, shopping items)
 *  - insight: a quiet status/alert panel, never stacked more than one at a time
 *  - neutral: a warm, non-blue surface for food/warmth-flavored content
 * None of these have a visible border by default — separation comes from
 * background contrast and spacing, not outlines everywhere.
 */
export function Card({ variant = 'standard', style, children }: CardProps) {
  return <View style={[styles.base, VARIANT_STYLE[variant], style]}>{children}</View>;
}

const VARIANT_STYLE: Record<CardVariant, ViewStyle> = {
  hero: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.ambient,
  },
  standard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  compact: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  insight: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  neutral: {
    backgroundColor: colors.surfaceNeutral,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

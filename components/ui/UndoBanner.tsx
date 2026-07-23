import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUndo } from '@/contexts/UndoContext';
import { motionDuration } from '@/constants/motion';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

/** The five real tab routes — every other screen (Recipe Detail, Edit, Day Detail, Settings…) has no tab bar to clear. */
const TAB_ROUTES = new Set(['/', '/week', '/recipes', '/stock', '/grocery']);

/** PremiumTabBar's own content height (paddingTop + button minHeight) — its safe-area bottom padding is handled separately by this banner's own SafeAreaView, so this is added on top, not instead of it. */
const TAB_BAR_CONTENT_HEIGHT = 56;

/**
 * Mounted once at the app root (see app/_layout.tsx) — renders above
 * whatever screen is currently active, so it stays visible and tappable
 * after navigating away from the screen that triggered the undo. Sits
 * inside its own SafeAreaView so it never lands under a home indicator.
 * On the five tab routes, an extra bottom offset keeps it from overlapping
 * (and stealing taps from) the tab bar itself — confirmed by hand: without
 * this, a tap on "Today" while the banner was showing hit the banner's Undo
 * button instead, silently undoing the delete.
 */
export function UndoBanner() {
  const { pending, undo } = useUndo();
  const reducedMotion = useReducedMotionPreference();
  const pathname = usePathname();
  const hasTabBar = TAB_ROUTES.has(pathname);

  if (!pending) return null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea} pointerEvents="box-none">
      <Animated.View
        entering={reducedMotion ? undefined : SlideInDown.duration(motionDuration.standard)}
        exiting={reducedMotion ? undefined : SlideOutDown.duration(motionDuration.fast)}
        style={[styles.banner, hasTabBar && styles.bannerAboveTabBar]}>
        <Text style={styles.message} numberOfLines={2}>
          {pending.action.message}
        </Text>
        <Pressable
          onPress={undo}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Undo: ${pending.action.message}`}
          style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}>
          <Text style={styles.undoLabel}>Undo</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  bannerAboveTabBar: {
    marginBottom: spacing.md + TAB_BAR_CONTENT_HEIGHT,
  },
  message: {
    ...typography.role.body,
    color: colors.textPrimary,
    flex: 1,
  },
  undoButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  undoButtonPressed: {
    opacity: 0.6,
  },
  undoLabel: {
    ...typography.role.body,
    color: colors.accentBlue,
    fontWeight: typography.weight.semibold,
  },
});

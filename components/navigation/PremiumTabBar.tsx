import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motionDuration } from '@/constants/motion';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

type TabBarIcon = (props: { focused: boolean; color: string; size: number }) => ReactNode;

/**
 * Structurally typed against what Expo Router's Tabs actually passes to a
 * custom `tabBar` render prop — kept local instead of importing
 * `BottomTabBarProps`, which isn't part of expo-router's public type
 * exports (only reachable through internal build paths).
 */
export interface PremiumTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string; tabBarItemStyle?: unknown; tabBarIcon?: TabBarIcon; tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  insets: { top: number; bottom: number; left: number; right: number };
}

/**
 * A restrained custom tab bar — compact, correct safe-area padding, a quiet
 * top indicator + elevated text/icon contrast for the active tab instead of
 * a filled pill or glow. Routing, focus, and href:null filtering all keep
 * working exactly as the native tab bar did; only the presentation changes.
 */
export function PremiumTabBar({ state, descriptors, navigation, insets }: PremiumTabBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        // Expo Router's `href: null` shortcut is rewritten into `tabBarItemStyle: { display: 'none' }` by the time it reaches a custom tabBar — this mirrors that filtering.
        const itemStyle = descriptor?.options.tabBarItemStyle as { display?: string } | undefined;
        if (!descriptor || itemStyle?.display === 'none') return null;

        const { options } = descriptor;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const isFocused = state.index === index;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <TabBarButton
            key={route.key}
            label={label}
            focused={isFocused}
            icon={options.tabBarIcon}
            onPress={onPress}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          />
        );
      })}
    </View>
  );
}

type TabBarButtonProps = {
  label: string;
  focused: boolean;
  icon?: TabBarIcon;
  onPress: () => void;
  accessibilityLabel: string;
};

function TabBarButton({ label, focused, icon, onPress, accessibilityLabel }: TabBarButtonProps) {
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.value = reducedMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: motionDuration.fast });
  }, [focused, reducedMotion, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  const color = focused ? colors.textPrimary : colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = reducedMotion ? 1 : withTiming(0.92, { duration: motionDuration.fast });
      }}
      onPressOut={() => {
        pressScale.value = reducedMotion ? 1 : withTiming(1, { duration: motionDuration.fast });
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={styles.button}>
      <Animated.View style={[styles.buttonInner, pressStyle]}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        <View style={styles.iconWrap}>{icon?.({ focused, color, size: iconSize.lg })}</View>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonInner: {
    alignItems: 'center',
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: -spacing.xs,
    width: 16,
    height: 2,
    borderRadius: radius.full,
    backgroundColor: colors.accentBlue,
  },
  iconWrap: {
    height: iconSize.lg,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
  },
});

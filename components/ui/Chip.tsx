import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motionDuration } from '@/constants/motion';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Quiet by default — the unselected state should barely announce itself; selected is clear but never glowing. The background eases between states instead of snapping. */
export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = reducedMotion ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: motionDuration.fast });
  }, [selected, reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceRaised, colors.accentBlueMuted]),
  }));

  return (
    <Animated.View style={[styles.base, animatedStyle]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.pressableContent, pressed && styles.pressed]}>
        {icon ? <Ionicons name={icon} size={iconSize.sm} color={selected ? colors.accentBlue : colors.textTertiary} /> : null}
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  pressableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
});

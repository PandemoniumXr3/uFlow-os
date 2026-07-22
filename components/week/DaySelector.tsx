import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motionDuration } from '@/constants/motion';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import { formatShortDate, isToday } from '@/utils/date';

export interface DaySelectorEntry {
  date: string;
  plannedCount: number;
  hasEaten: boolean;
}

type DaySelectorProps = {
  days: DaySelectorEntry[];
  selectedDate: string;
  onSelect: (date: string) => void;
};

/** A week at a glance — one row, tap a day to focus it below. Today gets a quiet marker; the selected day is the only one that's visually loud. */
export function DaySelector({ days, selectedDate, onSelect }: DaySelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((day) => (
        <DayCell key={day.date} day={day} selected={day.date === selectedDate} onSelect={() => onSelect(day.date)} />
      ))}
    </ScrollView>
  );
}

function DayCell({ day, selected, onSelect }: { day: DaySelectorEntry; selected: boolean; onSelect: () => void }) {
  const reducedMotion = useReducedMotionPreference();
  const progress = useSharedValue(selected ? 1 : 0);
  const { weekday, day: dayNumber } = formatShortDate(day.date);

  useEffect(() => {
    progress.value = reducedMotion ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: motionDuration.fast });
  }, [selected, reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', colors.accentBlueMuted]),
  }));

  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <Pressable onPress={onSelect} style={styles.cellContent} accessibilityRole="button" accessibilityState={{ selected }}>
        <Text style={[styles.weekday, selected && styles.weekdaySelected]}>{weekday}</Text>
        <Text style={[styles.day, selected && styles.daySelected]}>{dayNumber}</Text>
        <View style={styles.indicatorRow}>
          {isToday(day.date) && <View style={styles.todayDot} />}
          {day.plannedCount > 0 && <View style={[styles.planDot, day.hasEaten && styles.planDotEaten]} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cell: {
    width: 48,
    borderRadius: radius.md,
  },
  cellContent: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  weekday: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  weekdaySelected: {
    color: colors.textSecondary,
  },
  day: {
    ...typography.role.cardTitle,
    color: colors.textSecondary,
  },
  daySelected: {
    color: colors.textPrimary,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accentOchre,
  },
  planDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accentBlue,
  },
  planDotEaten: {
    backgroundColor: colors.accentGreen,
  },
});

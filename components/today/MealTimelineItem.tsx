import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { enterFade, layoutTransition } from '@/constants/motion';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { MealStatus } from '@/utils/getMealStatus';

type MealTimelineItemProps = {
  title: string;
  meta?: string;
  status: MealStatus;
  rightSlot?: ReactNode;
};

const STATUS_LABEL: Record<MealStatus, string> = {
  eaten: 'Eaten',
  skipped: 'Skipped',
  planned: 'Planned',
};

const STATUS_COLOR: Record<MealStatus, string> = {
  eaten: colors.accentGreen,
  skipped: colors.textTertiary,
  planned: colors.textSecondary,
};

/** One row in a day's meal timeline — shared by Today and Day Detail so a planned meal reads identically everywhere. Animates in when added/reordered, and the status label fades to its new value so marking a meal eaten or skipped reads as a clear event, not a silent text swap. */
export function MealTimelineItem({ title, meta, status, rightSlot }: MealTimelineItemProps) {
  const reducedMotion = useReducedMotionPreference();

  return (
    <Animated.View entering={enterFade(reducedMotion)} layout={layoutTransition(reducedMotion)}>
      <Card variant="compact" style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={[styles.title, status === 'eaten' && styles.titleQuiet]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta ? `${meta} · ` : ''}
            <Text style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</Text>
          </Text>
        </View>
        {rightSlot}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.role.body,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
  },
  titleQuiet: {
    color: colors.textSecondary,
  },
  meta: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

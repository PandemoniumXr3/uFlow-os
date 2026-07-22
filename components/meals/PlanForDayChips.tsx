import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { colors, spacing, typography } from '@/constants/theme';
import { getUpcomingDateOptions } from '@/utils/getWeekRange';

const UPCOMING_DATE_OPTIONS = getUpcomingDateOptions();

type PlanForDayChipsProps = {
  isPlannedOnDate: (date: string) => boolean;
  onTogglePlannedOnDate: (date: string) => void;
};

/** A quiet "Plan later" link that reveals a row of concrete upcoming dates — shared by every meal card so planning ahead looks the same everywhere. */
export function PlanForDayChips({ isPlannedOnDate, onTogglePlannedOnDate }: PlanForDayChipsProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <Text style={styles.link}>{open ? 'Hide dates' : 'Plan later'}</Text>
      </Pressable>
      {open && (
        <View style={styles.row}>
          {UPCOMING_DATE_OPTIONS.map((option) => (
            <Chip key={option.date} label={option.label} selected={isPlannedOnDate(option.date)} onPress={() => onTogglePlannedOnDate(option.date)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    ...typography.role.label,
    color: colors.accentBlue,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
});

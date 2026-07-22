import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { StockStatus } from '@/types/inventory';

const STATUS_LABEL: Record<StockStatus, string> = {
  inStock: 'In stock',
  low: 'Low',
  empty: 'Empty',
};

const STATUS_COLOR: Record<StockStatus, string> = {
  inStock: colors.accentGreen,
  low: colors.accentOchre,
  empty: colors.danger,
};

const NEXT_STATUS: Record<StockStatus, StockStatus> = {
  inStock: 'low',
  low: 'empty',
  empty: 'inStock',
};

type StockStatusChipProps = {
  status: StockStatus;
  onChange: (next: StockStatus) => void;
};

/** One tap cycles In Stock → Low → Empty → In Stock. */
export function StockStatusChip({ status, onChange }: StockStatusChipProps) {
  const color = STATUS_COLOR[status];

  return (
    <Pressable
      onPress={() => onChange(NEXT_STATUS[status])}
      accessibilityLabel={`Stock status: ${STATUS_LABEL[status]}. Tap to change.`}
      style={({ pressed }) => [styles.chip, { borderColor: color }, pressed && styles.pressed]}>
      <Text style={[styles.label, { color }]}>{STATUS_LABEL[status]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
});

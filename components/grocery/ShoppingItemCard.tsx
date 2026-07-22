import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import type { ShoppingItem } from '@/types/shoppingItem';

type ShoppingItemCardProps = {
  item: ShoppingItem;
  onToggleChecked: () => void;
  onHide?: () => void;
  onRemove?: () => void;
  /** Formatted price ("€2.49"), only passed when Budget Mode is on AND this specific item could actually be estimated — never "unavailable" noise on every row. */
  costLabel?: string;
};

export function ShoppingItemCard({ item, onToggleChecked, onHide, onRemove, costLabel }: ShoppingItemCardProps) {
  const quantityLabel = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : item.unit;

  return (
    <Card variant="compact" style={[styles.card, item.checked && styles.cardChecked]}>
      <Pressable onPress={onToggleChecked} accessibilityLabel={item.checked ? `Uncheck ${item.displayName}` : `Check ${item.displayName}`} hitSlop={8}>
        <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={iconSize.lg} color={item.checked ? colors.accentGreen : colors.textTertiary} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={1}>
            {item.displayName}
          </Text>
          {quantityLabel && <Text style={styles.quantity}>{quantityLabel}</Text>}
        </View>

        {item.reasons.length > 0 && <Text style={styles.reasonText}>{item.reasons.map((reason) => reason.label).join(' · ')}</Text>}
        {costLabel && <Text style={styles.costText}>{costLabel}</Text>}
      </View>

      <View style={styles.actions}>
        {onHide && <IconButton icon="eye-off-outline" accessibilityLabel={`Hide ${item.displayName}`} onPress={onHide} />}
        {onRemove && <IconButton icon="trash-outline" variant="danger" accessibilityLabel={`Remove ${item.displayName}`} onPress={onRemove} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardChecked: {
    opacity: 0.55,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    ...typography.role.body,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  quantity: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  reasonText: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  costText: {
    ...typography.role.metadata,
    color: colors.textAccentSand,
  },
  actions: {
    flexDirection: 'row',
  },
});

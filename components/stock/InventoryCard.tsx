import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StockStatusChip } from '@/components/stock/StockStatusChip';
import { IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EXPIRATION_PRESETS, type ExpirationPresetValue } from '@/constants/expirationPresets';
import { colors, iconSize, radius, shadow, spacing, typography } from '@/constants/theme';
import type { InventoryItem, StockStatus, StorageLocation } from '@/types/inventory';
import type { Product } from '@/types/product';
import { isExpired, isExpiringSoon } from '@/utils/expiry';
import { formatCents, parseToCents } from '@/utils/money';

const LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'other', label: 'Other' },
];

type InventoryCardProps = {
  product: Product;
  item: InventoryItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onChangeStatus: (status: StockStatus) => void;
  onChangeLocation: (location: StorageLocation) => void;
  onSetExpirationPreset: (preset: ExpirationPresetValue) => void;
  onChangeQuantity: (quantity: string, unit: string) => void;
  onRemove: () => void;
  /** Hides price/package/store fields entirely when Budget Mode is off. */
  budgetModeEnabled?: boolean;
  onChangePriceInfo?: (patch: {
    lastPurchasePriceCents?: number;
    packageQuantity?: number;
    packageUnit?: string;
    store?: string;
    purchaseDate?: string;
  }) => void;
};

export function InventoryCard({
  product,
  item,
  expanded,
  onToggleExpand,
  onChangeStatus,
  onChangeLocation,
  onSetExpirationPreset,
  onChangeQuantity,
  onRemove,
  budgetModeEnabled,
  onChangePriceInfo,
}: InventoryCardProps) {
  const expiringSoon = isExpiringSoon(item.expirationDate);
  const expired = isExpired(item.expirationDate);

  const [priceInput, setPriceInput] = useState(item.lastPurchasePriceCents != null ? String(item.lastPurchasePriceCents / 100) : '');
  const [packageQuantityInput, setPackageQuantityInput] = useState(item.packageQuantity != null ? String(item.packageQuantity) : '');
  const [packageUnitInput, setPackageUnitInput] = useState(item.packageUnit ?? '');
  const [storeInput, setStoreInput] = useState(item.store ?? '');

  function commitPriceInfo() {
    if (!onChangePriceInfo) return;
    const parsedPackageQuantity = packageQuantityInput.trim() ? Number(packageQuantityInput) : undefined;
    onChangePriceInfo({
      lastPurchasePriceCents: parseToCents(priceInput) ?? undefined,
      packageQuantity: Number.isNaN(parsedPackageQuantity as number) ? undefined : parsedPackageQuantity,
      packageUnit: packageUnitInput.trim() || undefined,
      store: storeInput.trim() || undefined,
      purchaseDate: priceInput.trim() ? new Date().toISOString().slice(0, 10) : item.purchaseDate,
    });
  }

  return (
    <View style={[styles.card, (expiringSoon || expired) && styles.cardWarning]}>
      <Pressable onPress={onToggleExpand} style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          {item.quantity != null && (
            <Text style={styles.quantity}>
              {item.quantity} {item.unit ?? ''}
            </Text>
          )}
        </View>
        <StockStatusChip status={item.stockStatus} onChange={onChangeStatus} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
      </Pressable>

      {(expiringSoon || expired) && (
        <Text style={styles.expiryBadge}>{expired ? 'Expired' : 'Expiring soon'}</Text>
      )}

      {expanded && (
        <View style={styles.details}>
          <View style={styles.row}>
            <TextField
              value={item.quantity != null ? String(item.quantity) : ''}
              onChangeText={(text) => onChangeQuantity(text, item.unit ?? '')}
              placeholder="Qty"
              keyboardType="numeric"
              style={styles.quantityInput}
            />
            <TextField
              value={item.unit ?? ''}
              onChangeText={(text) => onChangeQuantity(item.quantity != null ? String(item.quantity) : '', text)}
              placeholder="Unit"
              style={styles.unitInput}
            />
          </View>

          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.chipRow}>
            {LOCATIONS.map((location) => (
              <Chip
                key={location.value}
                label={location.label}
                selected={item.location === location.value}
                onPress={() => onChangeLocation(location.value)}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Expires</Text>
          <View style={styles.chipRow}>
            {EXPIRATION_PRESETS.map((preset) => (
              <Chip key={preset.value} label={preset.label} onPress={() => onSetExpirationPreset(preset.value)} />
            ))}
          </View>
          {item.expirationDate && <Text style={styles.expiryDate}>Set for {item.expirationDate}</Text>}

          {budgetModeEnabled && (
            <>
              <Text style={styles.sectionLabel}>Price</Text>
              {item.lastPurchasePriceCents != null && (
                <Text style={styles.priceNote}>
                  Last paid {formatCents(item.lastPurchasePriceCents)}
                  {item.packageQuantity != null && item.packageUnit ? ` for ${item.packageQuantity}${item.packageUnit}` : ''}
                  {item.store ? ` at ${item.store}` : ''}
                </Text>
              )}
              <View style={styles.row}>
                <TextField
                  value={priceInput}
                  onChangeText={setPriceInput}
                  onBlur={commitPriceInfo}
                  placeholder="Price paid"
                  keyboardType="numeric"
                  style={styles.quantityInput}
                />
                <TextField value={storeInput} onChangeText={setStoreInput} onBlur={commitPriceInfo} placeholder="Store" style={styles.unitInput} />
              </View>
              <View style={styles.row}>
                <TextField
                  value={packageQuantityInput}
                  onChangeText={setPackageQuantityInput}
                  onBlur={commitPriceInfo}
                  placeholder="Package qty"
                  keyboardType="numeric"
                  style={styles.quantityInput}
                />
                <TextField
                  value={packageUnitInput}
                  onChangeText={setPackageUnitInput}
                  onBlur={commitPriceInfo}
                  placeholder="Package unit"
                  style={styles.unitInput}
                />
              </View>
            </>
          )}

          <View style={styles.removeRow}>
            <IconButton icon="trash-outline" variant="danger" accessibilityLabel={`Remove ${product.name} from stock`} onPress={onRemove} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.soft,
  },
  cardWarning: {
    backgroundColor: colors.accentOchreMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.role.body,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  quantity: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  expiryBadge: {
    ...typography.role.label,
    color: colors.accentOchre,
  },
  details: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  expiryDate: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  priceNote: {
    ...typography.role.metadata,
    color: colors.textAccentSand,
  },
  removeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

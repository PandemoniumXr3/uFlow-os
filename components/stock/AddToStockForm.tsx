import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { StockStatusChip } from '@/components/stock/StockStatusChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EXPIRATION_PRESETS, resolveExpirationDate, type ExpirationPresetValue } from '@/constants/expirationPresets';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { NewInventoryItem } from '@/hooks/useInventory';
import type { StockStatus, StorageLocation } from '@/types/inventory';
import type { Product } from '@/types/product';
import { parseToCents } from '@/utils/money';

const LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'other', label: 'Other' },
];

type AddToStockFormProps = {
  products: Product[];
  existingProductIds: Set<string>;
  isAlwaysInStock: (productId: string) => boolean;
  onAdd: (productId: string, initial: NewInventoryItem) => void;
  onToggleAlwaysInStock: (productId: string) => void;
  onCancel: () => void;
  /** Hides price/package/store capture entirely when Budget Mode is off — no empty gap left behind. */
  budgetModeEnabled?: boolean;
};

export function AddToStockForm({
  products,
  existingProductIds,
  isAlwaysInStock,
  onAdd,
  onToggleAlwaysInStock,
  onCancel,
  budgetModeEnabled,
}: AddToStockFormProps) {
  const reducedMotion = useReducedMotionPreference();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [status, setStatus] = useState<StockStatus>('inStock');
  const [location, setLocation] = useState<StorageLocation>('pantry');
  const [showMore, setShowMore] = useState(false);
  const [preset, setPreset] = useState<ExpirationPresetValue | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [packageQuantity, setPackageQuantity] = useState('');
  const [packageUnit, setPackageUnit] = useState('');
  const [store, setStore] = useState('');

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return products
      .filter((product) => !existingProductIds.has(product.id))
      .filter((product) => product.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [products, existingProductIds, query]);

  function reset() {
    setQuery('');
    setSelected(null);
    setStatus('inStock');
    setLocation('pantry');
    setShowMore(false);
    setPreset(null);
    setQuantity('');
    setUnit('');
    setPrice('');
    setPackageQuantity('');
    setPackageUnit('');
    setStore('');
  }

  function handleSubmit() {
    if (!selected) return;
    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;
    const parsedPackageQuantity = packageQuantity.trim() ? Number(packageQuantity) : undefined;
    onAdd(selected.id, {
      stockStatus: status,
      location,
      quantity: Number.isNaN(parsedQuantity as number) ? undefined : parsedQuantity,
      unit: unit.trim() || undefined,
      expirationDate: preset ? resolveExpirationDate(preset) : undefined,
      lastPurchasePriceCents: parseToCents(price) ?? undefined,
      packageQuantity: Number.isNaN(parsedPackageQuantity as number) ? undefined : parsedPackageQuantity,
      packageUnit: packageUnit.trim() || undefined,
      store: store.trim() || undefined,
      purchaseDate: price.trim() ? new Date().toISOString().slice(0, 10) : undefined,
    });
    reset();
    onCancel();
  }

  return (
    <Card variant="standard" style={styles.container}>
      <Text style={styles.title}>Add to Stock</Text>

      {!selected ? (
        <>
          <TextField value={query} onChangeText={setQuery} placeholder="Search products…" autoFocus />
          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((product) => (
                <Chip key={product.id} label={product.name} onPress={() => setSelected(product)} />
              ))}
            </View>
          )}
          {query.trim().length > 0 && results.length === 0 && (
            <Text style={styles.hint}>No matching products — or you already have it in stock.</Text>
          )}
        </>
      ) : (
        <Animated.View layout={layoutTransition(reducedMotion)} style={styles.selectedForm}>
          <View style={styles.selectedRow}>
            <Text style={styles.selectedName}>{selected.name}</Text>
            <Text style={styles.changeLink} onPress={() => setSelected(null)}>
              Change
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Status</Text>
          <StockStatusChip status={status} onChange={setStatus} />

          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.chipRow}>
            {LOCATIONS.map((loc) => (
              <Chip key={loc.value} label={loc.label} selected={location === loc.value} onPress={() => setLocation(loc.value)} />
            ))}
          </View>

          <Pressable onPress={() => setShowMore(!showMore)} hitSlop={8}>
            <Text style={styles.expandLink}>{showMore ? 'Hide more options' : 'More options (quantity, expiry…)'}</Text>
          </Pressable>

          {showMore && (
            <Animated.View style={styles.moreOptions} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
              <View style={styles.row}>
                <TextField value={quantity} onChangeText={setQuantity} placeholder="Qty" keyboardType="numeric" style={styles.half} />
                <TextField value={unit} onChangeText={setUnit} placeholder="Unit" style={styles.half} />
              </View>

              <Text style={styles.sectionLabel}>Expires</Text>
              <View style={styles.chipRow}>
                {EXPIRATION_PRESETS.map((option) => (
                  <Chip key={option.value} label={option.label} selected={preset === option.value} onPress={() => setPreset(option.value)} />
                ))}
              </View>

              <Chip
                icon="repeat-outline"
                label="Always keep in Stock"
                selected={isAlwaysInStock(selected.id)}
                onPress={() => onToggleAlwaysInStock(selected.id)}
              />

              {budgetModeEnabled && (
                <>
                  <Text style={styles.sectionLabel}>Price paid (optional)</Text>
                  <View style={styles.row}>
                    <TextField value={price} onChangeText={setPrice} placeholder="e.g. 2.49" keyboardType="numeric" style={styles.half} />
                    <TextField value={store} onChangeText={setStore} placeholder="Store" style={styles.half} />
                  </View>
                  <View style={styles.row}>
                    <TextField
                      value={packageQuantity}
                      onChangeText={setPackageQuantity}
                      placeholder="Package qty"
                      keyboardType="numeric"
                      style={styles.half}
                    />
                    <TextField value={packageUnit} onChangeText={setPackageUnit} placeholder="Package unit" style={styles.half} />
                  </View>
                </>
              )}
            </Animated.View>
          )}

          <Button label="Add to Stock" onPress={handleSubmit} />
        </Animated.View>
      )}

      <Button
        label="Cancel"
        variant="quiet"
        compact
        onPress={() => {
          reset();
          onCancel();
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  results: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    color: colors.textTertiary,
    fontSize: typography.size.sm,
  },
  selectedForm: {
    gap: spacing.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedName: {
    color: colors.textPrimary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  changeLink: {
    color: colors.accentBlue,
    fontSize: typography.size.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  expandLink: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
  moreOptions: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

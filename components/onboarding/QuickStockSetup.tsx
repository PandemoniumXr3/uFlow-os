import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EXPIRATION_PRESETS, resolveExpirationDate, type ExpirationPresetValue } from '@/constants/expirationPresets';
import { enterFade, exitFade } from '@/constants/motion';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { StorageLocation } from '@/types/inventory';
import type { NewProduct, Product } from '@/types/product';
import { generateId } from '@/utils/id';
import { parseToCents } from '@/utils/money';

const LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'other', label: 'Other' },
];

export interface QuickStockPendingItem {
  tempId: string;
  productId: string;
  productName: string;
  quantity?: number;
  unit?: string;
  location: StorageLocation;
  expirationDate?: string;
  lastPurchasePriceCents?: number;
  packageQuantity?: number;
  packageUnit?: string;
}

type QuickStockSetupProps = {
  products: Product[];
  /** Excluded from search results entirely — the one safeguard against accidental duplicates (see spec: "prevent accidental duplicate Products"). */
  existingProductIds: Set<string>;
  onAddProduct: (input: NewProduct) => Promise<Product | undefined>;
  budgetModeEnabled: boolean;
  onConfirm: (items: QuickStockPendingItem[]) => void;
  onSkip: () => void;
};

/**
 * Compact, reusable "add a handful of things you have" flow — deliberately
 * not the full Add to Stock form. Items are staged locally only; nothing
 * touches Stock storage until onConfirm fires (the atomic-add requirement),
 * so Cancel/Skip at any point leaves Stock completely unchanged.
 */
export function QuickStockSetup({ products, existingProductIds, onAddProduct, budgetModeEnabled, onConfirm, onSkip }: QuickStockSetupProps) {
  const reducedMotion = useReducedMotionPreference();
  const [query, setQuery] = useState('');
  const [pendingItems, setPendingItems] = useState<QuickStockPendingItem[]>([]);
  const [expandedTempId, setExpandedTempId] = useState<string | null>(null);

  const pendingProductIds = useMemo(() => new Set(pendingItems.map((item) => item.productId)), [pendingItems]);
  const unavailableIds = useMemo(() => new Set([...existingProductIds, ...pendingProductIds]), [existingProductIds, pendingProductIds]);

  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const pool = products.filter((product) => !unavailableIds.has(product.id));
    if (!normalizedQuery) return pool.slice(0, 8);
    return pool.filter((product) => product.name.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  }, [products, unavailableIds, normalizedQuery]);

  const hasExactMatch = suggestions.some((product) => product.name.toLowerCase() === normalizedQuery);
  const canAddCustom = normalizedQuery.length >= 2 && !hasExactMatch;

  function addPending(product: Product) {
    const item: QuickStockPendingItem = {
      tempId: generateId(),
      productId: product.id,
      productName: product.name,
      location: 'pantry',
    };
    setPendingItems((current) => [...current, item]);
    setQuery('');
  }

  async function handleAddCustom() {
    const created = await onAddProduct({ name: query.trim() });
    if (created) addPending(created);
  }

  function updatePending(tempId: string, patch: Partial<QuickStockPendingItem>) {
    setPendingItems((current) => current.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  }

  function removePending(tempId: string) {
    setPendingItems((current) => current.filter((item) => item.tempId !== tempId));
    if (expandedTempId === tempId) setExpandedTempId(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add 3–8 things you usually have.</Text>
      <Text style={styles.subtitle}>Nothing is saved until you confirm.</Text>

      <TextField value={query} onChangeText={setQuery} placeholder="Search products…" accessibilityLabel="Search products to add to Stock" />

      {suggestions.length > 0 && (
        <View style={styles.chipRow}>
          {suggestions.map((product) => (
            <Chip key={product.id} label={product.name} onPress={() => addPending(product)} />
          ))}
        </View>
      )}

      {canAddCustom && (
        <Pressable onPress={handleAddCustom} style={styles.addCustomRow} accessibilityRole="button" accessibilityLabel={`Add "${query.trim()}" as a new product`}>
          <Ionicons name="add-circle-outline" size={iconSize.sm} color={colors.accentBlue} />
          <Text style={styles.addCustomText}>Add "{query.trim()}" as a new product</Text>
        </Pressable>
      )}

      <View style={styles.pendingHeader}>
        <Text style={styles.pendingCount}>{pendingItems.length === 0 ? 'No items yet' : `${pendingItems.length} item${pendingItems.length === 1 ? '' : 's'}`}</Text>
      </View>

      {pendingItems.length > 0 && (
        <View style={styles.pendingList}>
          {pendingItems.map((item) => {
            const expanded = expandedTempId === item.tempId;
            return (
              <View key={item.tempId} style={styles.pendingRow}>
                <View style={styles.pendingRowHeader}>
                  <Text style={styles.pendingName}>{item.productName}</Text>
                  <Pressable
                    onPress={() => setExpandedTempId(expanded ? null : item.tempId)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${expanded ? 'Hide' : 'Show'} details for ${item.productName}`}>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
                  </Pressable>
                  <Pressable
                    onPress={() => removePending(item.tempId)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.productName}`}>
                    <Ionicons name="close-circle-outline" size={iconSize.sm} color={colors.danger} />
                  </Pressable>
                </View>

                {expanded && (
                  <Animated.View entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} style={styles.pendingDetails}>
                    <View style={styles.fieldRow}>
                      <TextField
                        value={item.quantity != null ? String(item.quantity) : ''}
                        onChangeText={(text) => updatePending(item.tempId, { quantity: text.trim() ? Number(text) : undefined })}
                        onEndEditing={(e) => updatePending(item.tempId, { quantity: e.nativeEvent.text.trim() ? Number(e.nativeEvent.text) : undefined })}
                        placeholder="Qty (approx.)"
                        keyboardType="numeric"
                        style={styles.half}
                        accessibilityLabel={`${item.productName} quantity`}
                      />
                      <TextField
                        value={item.unit ?? ''}
                        onChangeText={(text) => updatePending(item.tempId, { unit: text || undefined })}
                        placeholder="Unit"
                        style={styles.half}
                        accessibilityLabel={`${item.productName} unit`}
                      />
                    </View>

                    <View style={styles.chipRow}>
                      {LOCATIONS.map((loc) => (
                        <Chip key={loc.value} label={loc.label} selected={item.location === loc.value} onPress={() => updatePending(item.tempId, { location: loc.value })} />
                      ))}
                    </View>

                    <View style={styles.chipRow}>
                      {EXPIRATION_PRESETS.map((preset) => (
                        <Chip
                          key={preset.value}
                          label={preset.label}
                          selected={item.expirationDate === resolveExpirationDate(preset.value)}
                          onPress={() => updatePending(item.tempId, { expirationDate: resolveExpirationDate(preset.value) })}
                        />
                      ))}
                    </View>

                    {budgetModeEnabled && (
                      <View style={styles.fieldRow}>
                        <TextField
                          value={item.lastPurchasePriceCents != null ? String(item.lastPurchasePriceCents / 100) : ''}
                          onChangeText={(text) => updatePending(item.tempId, { lastPurchasePriceCents: parseToCents(text) ?? undefined })}
                          onEndEditing={(e) => updatePending(item.tempId, { lastPurchasePriceCents: parseToCents(e.nativeEvent.text) ?? undefined })}
                          placeholder="Price paid (optional)"
                          keyboardType="numeric"
                          style={styles.half}
                          accessibilityLabel={`${item.productName} price paid, optional`}
                        />
                        <TextField
                          value={item.packageQuantity != null ? String(item.packageQuantity) : ''}
                          onChangeText={(text) =>
                            updatePending(item.tempId, {
                              packageQuantity: text.trim() ? Number(text) : undefined,
                              // Package unit always mirrors the item's own unit so the price-per-unit math stays comparable — no separate unit field to keep this compact.
                              packageUnit: item.unit,
                            })
                          }
                          placeholder={`Package qty (${item.unit || 'same unit'})`}
                          keyboardType="numeric"
                          style={styles.half}
                          accessibilityLabel={`${item.productName} package quantity, optional, same unit as above`}
                        />
                      </View>
                    )}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.actions}>
        <Button label={pendingItems.length > 0 ? `Add ${pendingItems.length} to Stock` : 'Continue'} onPress={() => onConfirm(pendingItems)} disabled={pendingItems.length === 0} />
        <Button label="Skip" variant="quiet" compact onPress={onSkip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addCustomText: {
    ...typography.role.bodySecondary,
    color: colors.accentBlue,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingCount: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  pendingList: {
    gap: spacing.sm,
  },
  pendingRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  pendingRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingName: {
    ...typography.role.body,
    color: colors.textPrimary,
    flex: 1,
  },
  pendingDetails: {
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});

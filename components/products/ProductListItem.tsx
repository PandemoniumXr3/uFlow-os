import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { LastKnownPrice } from '@/services/budget/lastKnownPrice';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { Product } from '@/types/product';
import { formatCents, parseToCents } from '@/utils/money';

type ProductListItemProps = {
  product: Product;
  alwaysInStock: boolean;
  isInStock: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleAlwaysInStock: (id: string) => void;
  onAddToStock: (id: string) => void;
  onRemove: (id: string) => void;
  /** Hides the price row entirely when Budget Mode is off. */
  budgetModeEnabled?: boolean;
  lastKnownPrice?: LastKnownPrice | null;
  /** Only offered when the product is already in Stock — price lives on the InventoryItem, so there's nothing to edit otherwise. */
  onChangePriceInfo?: (patch: { lastPurchasePriceCents?: number; store?: string }) => void;
};

/** Collapsed to name, category, and a quiet stock dot — actions (favorite, always-keep, add to Stock, remove) sit behind a tap, same pattern as Recipes. */
export function ProductListItem({
  product,
  alwaysInStock,
  isInStock,
  onToggleFavorite,
  onToggleAlwaysInStock,
  onAddToStock,
  onRemove,
  budgetModeEnabled,
  lastKnownPrice,
  onChangePriceInfo,
}: ProductListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotionPreference();
  const [priceInput, setPriceInput] = useState(lastKnownPrice?.priceCents != null ? String(lastKnownPrice.priceCents / 100) : '');
  const [storeInput, setStoreInput] = useState(lastKnownPrice?.store ?? '');

  return (
    <Animated.View layout={layoutTransition(reducedMotion)}>
      <Card variant="standard" style={styles.card}>
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.headerRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {product.category}
            </Text>
          </View>
          {product.isFavorite && <Ionicons name="heart" size={iconSize.sm} color={colors.accentCyan} />}
          {isInStock && <View style={styles.stockDot} />}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textTertiary} />
        </Pressable>

        {expanded && (
          <Animated.View style={styles.detail} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
            <View style={styles.actions}>
              <IconButton
                icon={product.isFavorite ? 'heart' : 'heart-outline'}
                variant="favorite"
                accessibilityLabel={product.isFavorite ? `Unfavorite ${product.name}` : `Favorite ${product.name}`}
                onPress={() => onToggleFavorite(product.id)}
              />
              <IconButton
                icon={alwaysInStock ? 'repeat' : 'repeat-outline'}
                variant="safe"
                accessibilityLabel={alwaysInStock ? `Stop always keeping ${product.name} in stock` : `Always keep ${product.name} in stock`}
                onPress={() => onToggleAlwaysInStock(product.id)}
              />
              <View style={styles.spacer} />
              <IconButton icon="trash-outline" variant="danger" accessibilityLabel={`Remove ${product.name}`} onPress={() => onRemove(product.id)} />
            </View>

            {isInStock ? (
              <Text style={styles.inStockNote}>Already in your Stock</Text>
            ) : (
              <Button label="Add to Stock" variant="secondary" compact onPress={() => onAddToStock(product.id)} />
            )}

            {budgetModeEnabled && (
              <>
                {isInStock ? (
                  <>
                    <Text style={styles.priceSectionLabel}>Price</Text>
                    {lastKnownPrice?.priceCents != null && (
                      <Text style={styles.priceNote}>
                        Last known: {formatCents(lastKnownPrice.priceCents)}
                        {lastKnownPrice.store ? ` at ${lastKnownPrice.store}` : ''}
                      </Text>
                    )}
                    <View style={styles.priceRow}>
                      <TextField
                        value={priceInput}
                        onChangeText={setPriceInput}
                        onBlur={() =>
                          onChangePriceInfo?.({ lastPurchasePriceCents: parseToCents(priceInput) ?? undefined, store: storeInput.trim() || undefined })
                        }
                        placeholder="Price paid"
                        keyboardType="numeric"
                        style={styles.priceInput}
                      />
                      <TextField
                        value={storeInput}
                        onChangeText={setStoreInput}
                        onBlur={() =>
                          onChangePriceInfo?.({ lastPurchasePriceCents: parseToCents(priceInput) ?? undefined, store: storeInput.trim() || undefined })
                        }
                        placeholder="Store"
                        style={styles.priceInput}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.priceHint}>Add to Stock to record a price.</Text>
                )}
              </>
            )}
          </Animated.View>
        )}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.role.body,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentGreen,
  },
  detail: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  inStockNote: {
    ...typography.role.metadata,
    color: colors.accentGreen,
  },
  priceSectionLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  priceNote: {
    ...typography.role.metadata,
    color: colors.textAccentSand,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  priceHint: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
});

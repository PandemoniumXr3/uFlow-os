import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddToStockForm } from '@/components/stock/AddToStockForm';
import { InventoryCard } from '@/components/stock/InventoryCard';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { resolveExpirationDate } from '@/constants/expirationPresets';
import { colors, spacing, typography } from '@/constants/theme';
import { useInventory } from '@/hooks/useInventory';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import type { InventoryItem, StorageLocation } from '@/types/inventory';
import { isExpiringSoon } from '@/utils/expiry';

const LOCATION_SECTIONS: { value: StorageLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'other', label: 'Other' },
];

export default function StockScreen() {
  const router = useRouter();
  const { products, isLoading: productsLoading } = useProducts();
  const { isAlwaysInStock, toggleAlwaysInStock } = useProductPreferences(products, productsLoading);
  const { budgetPreferences } = useProfile();
  const {
    items,
    isLoading: inventoryLoading,
    addItem,
    removeItem,
    setStockStatus,
    setLocation,
    setExpirationDate,
    setQuantity,
    setPriceInfo,
  } = useInventory();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const existingProductIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);

  const summary = useMemo(() => {
    const inStock = items.filter((item) => item.stockStatus === 'inStock').length;
    const low = items.filter((item) => item.stockStatus === 'low').length;
    const expiringSoon = items.filter((item) => isExpiringSoon(item.expirationDate)).length;
    const shoppingNeeded = items.filter(
      (item) => item.stockStatus === 'empty' || (isAlwaysInStock(item.productId) && item.stockStatus === 'low')
    ).length;
    return { inStock, low, expiringSoon, shoppingNeeded };
  }, [items, isAlwaysInStock]);

  const expiringItems = useMemo(
    () =>
      items
        .filter((item) => isExpiringSoon(item.expirationDate))
        .sort((a, b) => (a.expirationDate ?? '').localeCompare(b.expirationDate ?? '')),
    [items]
  );

  const isLoading = productsLoading || inventoryLoading;

  function renderCard(item: InventoryItem) {
    const product = productById.get(item.productId);
    if (!product) return null;

    return (
      <InventoryCard
        key={item.id}
        product={product}
        item={item}
        expanded={expandedId === item.id}
        onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
        onChangeStatus={(status) => setStockStatus(item.id, status)}
        onChangeLocation={(location) => setLocation(item.id, location)}
        onSetExpirationPreset={(preset) => setExpirationDate(item.id, resolveExpirationDate(preset))}
        onChangeQuantity={(quantityText, unit) => {
          const quantity = quantityText.trim() ? Number(quantityText) : undefined;
          setQuantity(item.id, Number.isNaN(quantity as number) ? undefined : quantity, unit.trim() || undefined);
        }}
        onRemove={() => removeItem(item.id)}
        budgetModeEnabled={budgetPreferences.enabled}
        onChangePriceInfo={(patch) => setPriceInfo(item.id, patch)}
      />
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Stock"
        subtitle="What's in your kitchen"
        rightAction={<IconButton icon="basket-outline" accessibilityLabel="Products" onPress={() => router.push('/products')} />}
      />

      {!isLoading && (
        <View style={styles.addAction}>
          <Button
            label={showAddForm ? 'Close' : 'Add to Stock'}
            variant={showAddForm ? 'secondary' : 'primary'}
            onPress={() => setShowAddForm(!showAddForm)}
          />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {showAddForm && (
          <AddToStockForm
            products={products}
            existingProductIds={existingProductIds}
            isAlwaysInStock={isAlwaysInStock}
            onToggleAlwaysInStock={toggleAlwaysInStock}
            onAdd={(productId, initial) => {
              addItem(productId, initial);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
            budgetModeEnabled={budgetPreferences.enabled}
          />
        )}

        {!isLoading && items.length === 0 && !showAddForm ? (
          <EmptyState
            icon="cube-outline"
            title="Your stock is empty"
            description="Add what you currently have at home."
          />
        ) : (
          <>
            {items.length > 0 && (
              <>
                <Card variant="hero" style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{summary.inStock}</Text>
                  <Text style={styles.summaryLabel}>items in stock</Text>
                  <Text style={styles.summarySecondary}>
                    {summary.low} low · {summary.expiringSoon} expiring soon · {summary.shoppingNeeded} to buy
                  </Text>
                </Card>

                {summary.shoppingNeeded === 0 && (
                  <Text style={styles.allGood}>Nothing urgent to buy right now.</Text>
                )}

                {expiringItems.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Expiring soon" />
                    <View style={styles.list}>{expiringItems.map(renderCard)}</View>
                  </View>
                )}

                {LOCATION_SECTIONS.map((location) => {
                  const locationItems = items.filter((item) => item.location === location.value);
                  if (locationItems.length === 0) return null;

                  return (
                    <View key={location.value} style={styles.section}>
                      <SectionHeader title={`${location.label} · ${locationItems.length}`} />
                      <View style={styles.list}>{locationItems.map(renderCard)}</View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addAction: {
    paddingBottom: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryValue: {
    ...typography.role.numericHighlight,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.role.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summarySecondary: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  allGood: {
    color: colors.accentGreen,
    fontSize: typography.size.sm,
    paddingBottom: spacing.md,
  },
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
});

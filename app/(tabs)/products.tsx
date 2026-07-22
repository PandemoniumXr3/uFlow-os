import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { AddProductRow } from '@/components/products/AddProductRow';
import { ProductListItem } from '@/components/products/ProductListItem';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import { colors, spacing, typography } from '@/constants/theme';
import { useInventory } from '@/hooks/useInventory';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { getLastKnownPrice } from '@/services/budget/lastKnownPrice';
import type { Product } from '@/types/product';

type FilterValue = 'all' | 'favorites' | 'alwaysInStock' | 'inStock';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'alwaysInStock', label: 'Always keep' },
  { value: 'inStock', label: 'In Stock' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const { products, isLoading, addProduct, removeProduct, toggleFavorite } = useProducts();
  const { isAlwaysInStock, toggleAlwaysInStock } = useProductPreferences(products, isLoading);
  const { items: inventoryItems, addItem, setPriceInfo } = useInventory();
  const { budgetPreferences } = useProfile();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const stockedProductIds = useMemo(() => new Set(inventoryItems.map((item) => item.productId)), [inventoryItems]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) => !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery))
      .filter((product) => {
        if (filter === 'favorites') return product.isFavorite;
        if (filter === 'alwaysInStock') return isAlwaysInStock(product.id);
        if (filter === 'inStock') return stockedProductIds.has(product.id);
        return true;
      });
  }, [products, query, filter, isAlwaysInStock, stockedProductIds]);

  const sections = useMemo(
    () =>
      PRODUCT_CATEGORIES.map((category) => ({
        title: category,
        data: filtered.filter((product) => product.category === category),
      })).filter((section) => section.data.length > 0),
    [filtered]
  );

  const noResultsReason = query.trim()
    ? `No products match "${query}".`
    : filter === 'favorites'
      ? 'No favorites yet.'
      : filter === 'alwaysInStock'
        ? "You haven't marked anything to always keep in stock."
        : filter === 'inStock'
          ? 'Nothing from your catalog is in Stock yet.'
          : 'No products match these filters.';

  return (
    <Screen>
      <PageHeader
        title="Products"
        subtitle="Your food catalog"
        rightAction={<IconButton icon="close" accessibilityLabel="Back to Stock" onPress={() => router.replace('/stock')} />}
      />

      {!isLoading && products.length > 0 && (
        <>
          <TextField value={query} onChangeText={setQuery} placeholder="Search products…" style={styles.search} />
          <View style={styles.filterRow}>
            {FILTERS.map((option) => (
              <Chip key={option.value} label={option.label} selected={filter === option.value} onPress={() => setFilter(option.value)} />
            ))}
          </View>
        </>
      )}

      <View style={styles.addAction}>
        <Button label={showAddForm ? 'Close' : 'Add product'} variant={showAddForm ? 'secondary' : 'primary'} compact onPress={() => setShowAddForm(!showAddForm)} />
      </View>

      {showAddForm && (
        <AddProductRow
          onSubmit={(name) => {
            addProduct({ name });
            setShowAddForm(false);
          }}
        />
      )}

      {!isLoading && products.length === 0 ? (
        <EmptyState icon="basket-outline" title="No products yet" description="Add the first thing in your kitchen." actionLabel="Add product" onAction={() => setShowAddForm(true)} />
      ) : !isLoading && sections.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Nothing here yet"
          description={noResultsReason}
          actionLabel={filter !== 'all' ? 'Show all products' : undefined}
          onAction={filter !== 'all' ? () => setFilter('all') : undefined}
          compact
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(product: Product) => product.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const inventoryItem = inventoryItems.find((inv) => inv.productId === item.id);
            return (
              <ProductListItem
                product={item}
                alwaysInStock={isAlwaysInStock(item.id)}
                isInStock={stockedProductIds.has(item.id)}
                onToggleFavorite={toggleFavorite}
                onToggleAlwaysInStock={() => toggleAlwaysInStock(item.id)}
                onAddToStock={(id) => addItem(id)}
                onRemove={removeProduct}
                budgetModeEnabled={budgetPreferences.enabled}
                lastKnownPrice={getLastKnownPrice(item.id, inventoryItems)}
                onChangePriceInfo={(patch) => inventoryItem && setPriceInfo(inventoryItem.id, patch)}
              />
            );
          }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addAction: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  sectionCount: {
    color: colors.textTertiary,
    fontSize: typography.size.sm,
  },
});

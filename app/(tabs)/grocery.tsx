import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BudgetSummary } from '@/components/budget/BudgetSummary';
import { ClosedLoopStatus } from '@/components/decision/ClosedLoopStatus';
import { AddManualItemForm } from '@/components/grocery/AddManualItemForm';
import { ShoppingItemCard } from '@/components/grocery/ShoppingItemCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { estimateGroceryCost, estimateShoppingItemCostCents } from '@/services/budget/estimateGroceryCost';
import { colors, shadow, spacing, typography } from '@/constants/theme';
import { useInventory } from '@/hooks/useInventory';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useShoppingList } from '@/hooks/useShoppingList';
import type { ShoppingItem } from '@/types/shoppingItem';
import { formatCents, parseToCents } from '@/utils/money';
import { handleGroceryPurchased } from '@/services/automation/handleGroceryPurchased';

export default function GroceryScreen() {
  const { products, isLoading: productsLoading } = useProducts();
  const { recipes, isLoading: recipesLoading } = useRecipes();
  const { items: inventoryItems, isLoading: inventoryLoading, addItem, update, setPriceInfo } = useInventory();
  const { alwaysInStockIds, isLoading: preferencesLoading } = useProductPreferences(products, productsLoading);
  const { entries: plannedMeals, isLoading: mealPlanLoading } = useMealPlan();
  const { budgetPreferences } = useProfile();

  const inputsLoading = productsLoading || recipesLoading || inventoryLoading || preferencesLoading || mealPlanLoading;

  const { isLoading, manualItems, automaticItems, addManualItem, removeManualItem, setChecked, hideAutomaticItem, regenerate } =
    useShoppingList({
      recipes,
      products,
      inventoryItems,
      alwaysInStockProductIds: alwaysInStockIds,
      plannedMeals,
      inputsLoading,
    });

  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<ShoppingItem | null>(null);
  const [pendingPriceEntry, setPendingPriceEntry] = useState<{ item: ShoppingItem; inventoryItemId: string } | null>(null);
  const [priceEntryInput, setPriceEntryInput] = useState('');

  const allItems = useMemo(() => [...manualItems, ...automaticItems], [manualItems, automaticItems]);
  const activeItems = useMemo(
    () => allItems.filter((item) => !item.checked).sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1)),
    [allItems]
  );
  const completedItems = useMemo(() => allItems.filter((item) => item.checked), [allItems]);

  // Today first, then this week, then everything else — so the most urgent items never get buried among low-stock/manual entries.
  const neededTodayItems = useMemo(() => activeItems.filter((item) => item.reasons.some((r) => r.type === 'todayMeal')), [activeItems]);
  const neededThisWeekItems = useMemo(() => {
    const todayIds = new Set(neededTodayItems.map((item) => item.id));
    return activeItems.filter((item) => !todayIds.has(item.id) && item.reasons.some((r) => r.type === 'weekMeal'));
  }, [activeItems, neededTodayItems]);
  const otherActiveItems = useMemo(() => {
    const handledIds = new Set([...neededTodayItems, ...neededThisWeekItems].map((item) => item.id));
    return activeItems.filter((item) => !handledIds.has(item.id));
  }, [activeItems, neededTodayItems, neededThisWeekItems]);

  const summary = useMemo(() => {
    const neededToday = activeItems.filter((item) => item.reasons.some((r) => r.type === 'todayMeal')).length;
    const lowOrEmpty = activeItems.filter((item) => item.reasons.some((r) => r.type === 'lowStock' || r.type === 'empty')).length;
    const manual = activeItems.filter((item) => item.source === 'manual').length;
    return { neededToday, lowOrEmpty, manual };
  }, [activeItems]);

  const groceryCostEstimate = useMemo(() => estimateGroceryCost(activeItems, inventoryItems), [activeItems, inventoryItems]);
  const remainingBudgetCents =
    budgetPreferences.weeklyBudgetCents != null ? budgetPreferences.weeklyBudgetCents - groceryCostEstimate.knownCostCents : undefined;

  function itemCostLabel(item: ShoppingItem): string | undefined {
    if (!budgetPreferences.enabled) return undefined;
    const cost = estimateShoppingItemCostCents(item, inventoryItems);
    return cost != null ? formatCents(cost) : undefined;
  }

  function handleToggleChecked(item: ShoppingItem) {
    if (item.checked) {
      setChecked(item, false);
      return;
    }

    const { stockAction } = handleGroceryPurchased({ item, inventoryItems });
    if (stockAction.type === 'none') {
      setChecked(item, true);
      return;
    }

    setPendingPurchase(item);
  }

  async function confirmStockUpdate() {
    if (!pendingPurchase) return;
    const purchasedItem = pendingPurchase;
    // No price yet — that's offered as a separate, skippable step below, so priceCents is omitted here.
    const { alreadyPurchased, stockAction } = handleGroceryPurchased({ item: purchasedItem, inventoryItems });

    // Guards a double-tap (confirming the same purchase twice before the sheet closes) from writing to Stock twice.
    if (alreadyPurchased) {
      setPendingPurchase(null);
      return;
    }

    let inventoryItemId: string | undefined;
    if (stockAction.type === 'create') {
      const created = await addItem(stockAction.newItem.productId, {
        stockStatus: stockAction.newItem.stockStatus,
        location: stockAction.newItem.location,
        quantity: stockAction.newItem.quantity,
        unit: stockAction.newItem.unit,
      });
      inventoryItemId = created.id;
    } else if (stockAction.type === 'update') {
      await update(stockAction.inventoryItemId, stockAction.patch);
      inventoryItemId = stockAction.inventoryItemId;
    }

    setChecked(purchasedItem, true);
    setPendingPurchase(null);

    // Offer to record the price paid, without blocking the purchase flow if skipped.
    if (budgetPreferences.enabled && inventoryItemId) {
      setPriceEntryInput('');
      setPendingPriceEntry({ item: purchasedItem, inventoryItemId });
    }
  }

  function skipStockUpdate() {
    if (!pendingPurchase) return;
    setChecked(pendingPurchase, true);
    setPendingPurchase(null);
  }

  function savePriceEntry() {
    if (!pendingPriceEntry) return;
    const priceCents = parseToCents(priceEntryInput);
    if (priceCents != null) {
      // Prefills everything already known: quantity/unit from the Grocery item, purchase date as today,
      // and the store from Budget settings' default store when the user hasn't set one for this purchase.
      setPriceInfo(pendingPriceEntry.inventoryItemId, {
        lastPurchasePriceCents: priceCents,
        packageQuantity: pendingPriceEntry.item.quantity,
        packageUnit: pendingPriceEntry.item.unit,
        purchaseDate: new Date().toISOString().slice(0, 10),
        store: budgetPreferences.defaultStore,
      });
    }
    setPendingPriceEntry(null);
  }

  return (
    <Screen>
      <PageHeader title="Grocery" subtitle="What to buy, and why" />

      {!isLoading && (
        <>
          <Card variant="hero" style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeItems.length}</Text>
            <Text style={styles.summaryLabel}>item{activeItems.length === 1 ? '' : 's'} to buy</Text>
            <Text style={styles.summarySecondary}>
              {summary.neededToday} needed today · {summary.lowOrEmpty} low stock · {summary.manual} manual
            </Text>

            {budgetPreferences.enabled && (
              <View style={styles.budgetDivider}>
                <BudgetSummary
                  estimate={groceryCostEstimate}
                  label="estimated to buy"
                  remainingBudgetCents={remainingBudgetCents}
                  progress={
                    budgetPreferences.weeklyBudgetCents != null
                      ? { spentCents: groceryCostEstimate.knownCostCents, budgetCents: budgetPreferences.weeklyBudgetCents }
                      : undefined
                  }
                />
              </View>
            )}
          </Card>
          <Text style={styles.liveNote}>Updates automatically as meals and stock change</Text>
          {activeItems.length > 0 && <ClosedLoopStatus state={{ type: 'afterPurchaseAddToStock' }} />}

          <View style={styles.actionRow}>
            <View style={styles.actionButton}>
              <Button label={showAddForm ? 'Close' : 'Add item'} variant={showAddForm ? 'secondary' : 'primary'} onPress={() => setShowAddForm(!showAddForm)} />
            </View>
            <View style={styles.actionButton}>
              <Button label="Regenerate" variant="secondary" onPress={regenerate} />
            </View>
          </View>
        </>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {showAddForm && <AddManualItemForm products={products} onAdd={addManualItem} onCancel={() => setShowAddForm(false)} />}

        {!isLoading && activeItems.length === 0 && completedItems.length === 0 && !showAddForm ? (
          <EmptyState icon="cart-outline" title="Nothing urgent to buy." description="Your list will fill in automatically as meals and stock change." />
        ) : (
          <>
            {neededTodayItems.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Needed today" />
                {neededTodayItems.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    onToggleChecked={() => handleToggleChecked(item)}
                    onHide={item.source === 'automatic' ? () => hideAutomaticItem(item) : undefined}
                    onRemove={item.source === 'manual' ? () => removeManualItem(item.id) : undefined}
                    costLabel={itemCostLabel(item)}
                  />
                ))}
              </View>
            )}

            {neededThisWeekItems.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Needed this week" />
                {neededThisWeekItems.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    onToggleChecked={() => handleToggleChecked(item)}
                    onHide={item.source === 'automatic' ? () => hideAutomaticItem(item) : undefined}
                    onRemove={item.source === 'manual' ? () => removeManualItem(item.id) : undefined}
                    costLabel={itemCostLabel(item)}
                  />
                ))}
              </View>
            )}

            {otherActiveItems.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Low stock & other" />
                {otherActiveItems.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    onToggleChecked={() => handleToggleChecked(item)}
                    onHide={item.source === 'automatic' ? () => hideAutomaticItem(item) : undefined}
                    onRemove={item.source === 'manual' ? () => removeManualItem(item.id) : undefined}
                    costLabel={itemCostLabel(item)}
                  />
                ))}
              </View>
            )}

            {completedItems.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Purchased" />
                {completedItems.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    onToggleChecked={() => handleToggleChecked(item)}
                    onRemove={item.source === 'manual' ? () => removeManualItem(item.id) : undefined}
                    costLabel={itemCostLabel(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={pendingPurchase != null}
        title="Add to Stock?"
        message={`Update Stock to reflect that you now have ${pendingPurchase?.displayName ?? 'this item'}?`}
        onConfirm={confirmStockUpdate}
        onCancel={skipStockUpdate}
      />

      {pendingPriceEntry && (
        <View style={styles.overlay}>
          <Card variant="standard" style={styles.priceEntryCard}>
            <Text style={styles.priceEntryTitle}>Record the price paid?</Text>
            <Text style={styles.priceEntryMessage}>
              How much did {pendingPriceEntry.item.displayName} cost? This helps estimate future costs — skip anytime.
            </Text>
            <TextField
              value={priceEntryInput}
              onChangeText={setPriceEntryInput}
              placeholder="e.g. 2.49"
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.priceEntryActions}>
              <Button label="Save" onPress={savePriceEntry} />
              <Button label="Skip" variant="quiet" onPress={() => setPendingPriceEntry(null)} />
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: spacing.md,
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
  budgetDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  liveNote: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
    paddingBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  priceEntryCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    ...shadow.card,
  },
  priceEntryTitle: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  priceEntryMessage: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  priceEntryActions: {
    gap: spacing.sm,
  },
});

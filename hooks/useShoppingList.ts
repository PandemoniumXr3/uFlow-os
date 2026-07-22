import { useCallback, useEffect, useMemo, useState } from 'react';

import { shoppingStorageService } from '@/services/shopping/shoppingStorageService';
import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import type { AutomaticItemOverlay, NewManualShoppingItem, ShoppingItem } from '@/types/shoppingItem';
import { applyAutomaticOverlay } from '@/utils/applyAutomaticOverlay';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';
import { generateId } from '@/utils/id';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

export interface UseShoppingListInput {
  recipes: Recipe[];
  products: Product[];
  inventoryItems: InventoryItem[];
  alwaysInStockProductIds: Set<string>;
  plannedMeals: PlannedMeal[];
  /** True while any of the composed domains (recipes/products/inventory/preferences/plan) is still loading. */
  inputsLoading: boolean;
}

/**
 * Orchestrates the Grocery list. Takes every upstream domain as a parameter
 * (recipes/products/inventory/preferences/plan) rather than calling those
 * hooks itself, matching the DI pattern used elsewhere in this app to avoid
 * duplicate-hook race conditions on first load.
 *
 * Manual items are stored directly and only ever touched by manual actions.
 * Automatic items are recomputed from scratch on every relevant change, then
 * overlaid with the persisted checked/purchased/hidden state — never stored
 * as full records, so regenerating can never delete a manual item (they live
 * in a different store entirely).
 */
export function useShoppingList(input: UseShoppingListInput) {
  const { recipes, products, inventoryItems, alwaysInStockProductIds, plannedMeals, inputsLoading } = input;

  const [manualItems, setManualItems] = useState<ShoppingItem[]>([]);
  const [overlay, setOverlay] = useState<AutomaticItemOverlay>({});
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    Promise.all([shoppingStorageService.getManualItems(), shoppingStorageService.getOverlay()]).then(
      ([storedManualItems, storedOverlay]) => {
        setManualItems(storedManualItems);
        setOverlay(storedOverlay);
        setStorageLoaded(true);
      }
    );
  }, []);

  const isLoading = inputsLoading || !storageLoaded;

  const automaticItems = useMemo(() => {
    if (isLoading) return [];
    const fresh = generateAutomaticShoppingItems({ plannedMeals, recipes, products, inventoryItems, alwaysInStockProductIds });
    return applyAutomaticOverlay(fresh, overlay);
  }, [isLoading, plannedMeals, recipes, products, inventoryItems, alwaysInStockProductIds, overlay]);

  const addManualItem = useCallback(async (input: NewManualShoppingItem) => {
    const displayName = input.displayName.trim();
    if (!displayName) return;

    const now = Date.now();
    const item: ShoppingItem = {
      id: generateId(),
      productId: input.productId,
      displayName,
      normalizedName: normalizeIngredient(displayName),
      quantity: input.quantity,
      unit: input.unit,
      source: 'manual',
      reasons: [{ type: 'manual', label: 'Added manually' }],
      linkedRecipeIds: [],
      linkedMealPlanIds: [],
      checked: false,
      purchased: false,
      priority: 'normal',
      createdAt: now,
      updatedAt: now,
    };

    setManualItems((current) => {
      const next = [...current, item];
      shoppingStorageService.saveManualItems(next);
      return next;
    });
  }, []);

  const editManualItem = useCallback((id: string, patch: { quantity?: number; unit?: string }) => {
    setManualItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item));
      shoppingStorageService.saveManualItems(next);
      return next;
    });
  }, []);

  const removeManualItem = useCallback((id: string) => {
    setManualItems((current) => {
      const next = current.filter((item) => item.id !== id);
      shoppingStorageService.saveManualItems(next);
      return next;
    });
  }, []);

  /** Sets checked (and mirrors it onto purchased) for either a manual or automatic item. */
  const setChecked = useCallback(
    (item: ShoppingItem, checked: boolean) => {
      if (item.source === 'manual') {
        setManualItems((current) => {
          const next = current.map((existing) =>
            existing.id === item.id ? { ...existing, checked, purchased: checked, updatedAt: Date.now() } : existing
          );
          shoppingStorageService.saveManualItems(next);
          return next;
        });
        return;
      }

      setOverlay((current) => {
        const next = {
          ...current,
          [item.normalizedName]: { id: item.id, checked, purchased: checked, hidden: false, updatedAt: Date.now() },
        };
        shoppingStorageService.saveOverlay(next);
        return next;
      });
    },
    []
  );

  const hideAutomaticItem = useCallback((item: ShoppingItem) => {
    if (item.source !== 'automatic') return;
    setOverlay((current) => {
      const existing = current[item.normalizedName];
      const next = {
        ...current,
        [item.normalizedName]: {
          id: item.id,
          checked: existing?.checked ?? false,
          purchased: existing?.purchased ?? false,
          hidden: true,
          updatedAt: Date.now(),
        },
      };
      shoppingStorageService.saveOverlay(next);
      return next;
    });
  }, []);

  /** Recomputes the automatic list now and clears every "hidden" dismissal — ordinary changes already recompute live via useMemo. */
  const regenerate = useCallback(() => {
    setOverlay((current) => {
      const next: AutomaticItemOverlay = {};
      for (const [key, entry] of Object.entries(current)) {
        next[key] = { ...entry, hidden: false };
      }
      shoppingStorageService.saveOverlay(next);
      return next;
    });
  }, []);

  return {
    isLoading,
    manualItems,
    automaticItems,
    addManualItem,
    editManualItem,
    removeManualItem,
    setChecked,
    hideAutomaticItem,
    regenerate,
  };
}

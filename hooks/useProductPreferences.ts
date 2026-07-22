import { useCallback, useEffect, useMemo, useState } from 'react';

import { ALWAYS_IN_STOCK_SEED_NAMES } from '@/constants/alwaysInStockSeed';
import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import { productPreferencesStorageService } from '@/services/productPreferences/productPreferencesStorageService';
import { DEFAULT_PRODUCT_PREFERENCES, type IngredientTier, type ProductPreferences } from '@/types/productPreferences';
import type { Product } from '@/types/product';
import { normalizeIngredient } from '@/utils/normalizeIngredient';

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function useProductPreferences(products: Product[], productsLoading: boolean) {
  const [preferences, setPreferences] = useState<ProductPreferences>(DEFAULT_PRODUCT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productsLoading) return;

    productPreferencesStorageService.get().then(async (stored) => {
      if (stored) {
        setPreferences(stored);
        setIsLoading(false);
        return;
      }

      // Never saved. Before falling back to the suggested seed list, check
      // for a pre-existing "always in stock" signal on legacy InventoryItem
      // records (from before always-in-stock was split out as its own
      // preference) — a one-time, read-only peek so upgrading doesn't lose
      // a setting a user already made.
      const legacyItems = await inventoryStorageService.getAll();
      const legacyAlwaysInStockIds = legacyItems
        .filter((item) => (item as unknown as { alwaysInStock?: boolean }).alwaysInStock === true)
        .map((item) => item.productId);

      let seededIds = legacyAlwaysInStockIds;
      if (seededIds.length === 0) {
        const alwaysInStockNames = new Set(ALWAYS_IN_STOCK_SEED_NAMES.map(normalizeIngredient));
        seededIds = products.filter((product) => alwaysInStockNames.has(normalizeIngredient(product.name))).map((p) => p.id);
      }

      const seeded: ProductPreferences = { alwaysInStockProductIds: seededIds };
      await productPreferencesStorageService.save(seeded);
      setPreferences(seeded);
      setIsLoading(false);
    });
  }, [products, productsLoading]);

  const alwaysInStockIds = useMemo(
    () => new Set(preferences.alwaysInStockProductIds),
    [preferences.alwaysInStockProductIds]
  );

  const isAlwaysInStock = useCallback((productId: string) => alwaysInStockIds.has(productId), [alwaysInStockIds]);

  const toggleAlwaysInStock = useCallback((productId: string) => {
    setPreferences((current) => {
      const next = { ...current, alwaysInStockProductIds: toggleValue(current.alwaysInStockProductIds, productId) };
      productPreferencesStorageService.save(next);
      return next;
    });
  }, []);

  const ingredientTierByProductId = useMemo(
    () => preferences.ingredientTierByProductId ?? {},
    [preferences.ingredientTierByProductId]
  );

  const getIngredientTier = useCallback(
    (productId: string): IngredientTier => ingredientTierByProductId[productId] ?? 'neutral',
    [ingredientTierByProductId]
  );

  /** Setting 'neutral' removes the entry entirely rather than storing a redundant explicit default. */
  const setIngredientTier = useCallback((productId: string, tier: IngredientTier) => {
    setPreferences((current) => {
      const nextTiers = { ...current.ingredientTierByProductId };
      if (tier === 'neutral') {
        delete nextTiers[productId];
      } else {
        nextTiers[productId] = tier;
      }
      const next = { ...current, ingredientTierByProductId: nextTiers };
      productPreferencesStorageService.save(next);
      return next;
    });
  }, []);

  const avoidedProductIds = useMemo(
    () => new Set(Object.entries(ingredientTierByProductId).filter(([, tier]) => tier === 'avoid').map(([id]) => id)),
    [ingredientTierByProductId]
  );

  return {
    preferences,
    isLoading,
    alwaysInStockIds,
    isAlwaysInStock,
    toggleAlwaysInStock,
    getIngredientTier,
    setIngredientTier,
    avoidedProductIds,
  };
}

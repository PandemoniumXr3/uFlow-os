import { useCallback, useEffect, useState } from 'react';

import { inventoryStorageService } from '@/services/inventory/inventoryStorageService';
import type { InventoryItem, StockStatus, StorageLocation } from '@/types/inventory';
import { generateId } from '@/utils/id';

export type NewInventoryItem = Partial<
  Pick<
    InventoryItem,
    | 'quantity'
    | 'unit'
    | 'stockStatus'
    | 'location'
    | 'expirationDate'
    | 'notes'
    | 'lastPurchasePriceCents'
    | 'packageQuantity'
    | 'packageUnit'
    | 'store'
    | 'purchaseDate'
  >
>;

/**
 * Loads only inventory items the user has actually added — never auto-
 * creates one for every catalog product. A fresh profile starts empty.
 * Self-contained; doesn't depend on Products loading since it no longer
 * cross-references the catalog at load time.
 */
export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    inventoryStorageService.getAll().then((stored) => {
      setItems(stored);
      setIsLoading(false);
    });
  }, []);

  const addItem = useCallback(
    async (productId: string, initial: NewInventoryItem = {}) => {
      const existing = items.find((item) => item.productId === productId);
      if (existing) return existing;

      const now = Date.now();
      const item: InventoryItem = {
        id: generateId(),
        productId,
        stockStatus: initial.stockStatus ?? 'inStock',
        location: initial.location ?? 'pantry',
        quantity: initial.quantity,
        unit: initial.unit,
        expirationDate: initial.expirationDate,
        notes: initial.notes,
        lastPurchasePriceCents: initial.lastPurchasePriceCents,
        packageQuantity: initial.packageQuantity,
        packageUnit: initial.packageUnit,
        store: initial.store,
        purchaseDate: initial.purchaseDate,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };

      setItems((current) => [...current, item]);
      await inventoryStorageService.add(item);
      return item;
    },
    [items]
  );

  const update = useCallback(async (id: string, patch: Partial<InventoryItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item)));
    await inventoryStorageService.update(id, patch);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    await inventoryStorageService.remove(id);
  }, []);

  const setStockStatus = useCallback((id: string, stockStatus: StockStatus) => update(id, { stockStatus }), [update]);
  const setLocation = useCallback((id: string, location: StorageLocation) => update(id, { location }), [update]);
  const setExpirationDate = useCallback(
    (id: string, expirationDate: string | undefined) => update(id, { expirationDate }),
    [update]
  );
  const setQuantity = useCallback(
    (id: string, quantity: number | undefined, unit: string | undefined) => update(id, { quantity, unit }),
    [update]
  );
  const setPriceInfo = useCallback(
    (
      id: string,
      patch: Partial<Pick<InventoryItem, 'lastPurchasePriceCents' | 'packageQuantity' | 'packageUnit' | 'store' | 'purchaseDate'>>
    ) => update(id, patch),
    [update]
  );

  const getForProduct = useCallback(
    (productId: string) => items.find((item) => item.productId === productId),
    [items]
  );

  return {
    items,
    isLoading,
    addItem,
    update,
    removeItem,
    setStockStatus,
    setLocation,
    setExpirationDate,
    setQuantity,
    setPriceInfo,
    getForProduct,
  };
}

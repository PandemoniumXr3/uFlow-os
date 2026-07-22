import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { InventoryItem } from '@/types/inventory';

const INVENTORY_KEY = 'uflow.inventory';

/**
 * Domain-level contract for persisting inventory items. Same swappable
 * AsyncStorage-backed pattern as the other storage services.
 */
export interface InventoryStorageService {
  getAll(): Promise<InventoryItem[]>;
  save(items: InventoryItem[]): Promise<void>;
  add(item: InventoryItem): Promise<void>;
  update(id: string, patch: Partial<InventoryItem>): Promise<void>;
  remove(id: string): Promise<void>;
}

export const inventoryStorageService: InventoryStorageService = {
  async getAll() {
    const items = await asyncStorageClient.getJSON<InventoryItem[]>(INVENTORY_KEY);
    return items ?? [];
  },

  async save(items) {
    await asyncStorageClient.setJSON(INVENTORY_KEY, items);
  },

  async add(item) {
    const items = await inventoryStorageService.getAll();
    await asyncStorageClient.setJSON(INVENTORY_KEY, [...items, item]);
  },

  async update(id, patch) {
    const items = await inventoryStorageService.getAll();
    await asyncStorageClient.setJSON(
      INVENTORY_KEY,
      items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item))
    );
  },

  async remove(id) {
    const items = await inventoryStorageService.getAll();
    await asyncStorageClient.setJSON(
      INVENTORY_KEY,
      items.filter((item) => item.id !== id)
    );
  },
};

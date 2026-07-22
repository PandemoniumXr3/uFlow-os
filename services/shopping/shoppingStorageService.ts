import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { AutomaticItemOverlay, ShoppingItem } from '@/types/shoppingItem';

const MANUAL_ITEMS_KEY = 'uflow.shopping.manualItems';
const AUTOMATIC_OVERLAY_KEY = 'uflow.shopping.automaticOverlay';

/**
 * Two separate keys, matching the manual/automatic split: manual items are
 * stored in full and never touched by regeneration; the automatic overlay
 * only ever stores the small checked/purchased/hidden state for automatic
 * items, keyed by normalized name — the items themselves are always
 * recomputed, never persisted directly.
 */
export interface ShoppingStorageService {
  getManualItems(): Promise<ShoppingItem[]>;
  saveManualItems(items: ShoppingItem[]): Promise<void>;

  getOverlay(): Promise<AutomaticItemOverlay>;
  saveOverlay(overlay: AutomaticItemOverlay): Promise<void>;
}

export const shoppingStorageService: ShoppingStorageService = {
  async getManualItems() {
    const items = await asyncStorageClient.getJSON<ShoppingItem[]>(MANUAL_ITEMS_KEY);
    return items ?? [];
  },

  async saveManualItems(items) {
    await asyncStorageClient.setJSON(MANUAL_ITEMS_KEY, items);
  },

  async getOverlay() {
    const overlay = await asyncStorageClient.getJSON<AutomaticItemOverlay>(AUTOMATIC_OVERLAY_KEY);
    return overlay ?? {};
  },

  async saveOverlay(overlay) {
    await asyncStorageClient.setJSON(AUTOMATIC_OVERLAY_KEY, overlay);
  },
};

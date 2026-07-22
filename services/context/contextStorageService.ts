import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { FoodContext } from '@/types/foodContext';

function keyFor(date: string): string {
  return `uflow.foodContext.${date}`;
}

/**
 * Domain-level contract for persisting a day's Food Context. Same pattern as
 * ProductStorageService: swap the AsyncStorage-backed implementation for
 * SQLite later without touching hooks/useFoodContext.ts.
 */
export interface ContextStorageService {
  getForDate(date: string): Promise<FoodContext | null>;
  save(context: FoodContext): Promise<void>;
  clear(date: string): Promise<void>;
}

export const contextStorageService: ContextStorageService = {
  async getForDate(date) {
    return asyncStorageClient.getJSON<FoodContext>(keyFor(date));
  },

  async save(context) {
    await asyncStorageClient.setJSON(keyFor(context.date), context);
  },

  async clear(date) {
    await asyncStorageClient.remove(keyFor(date));
  },
};

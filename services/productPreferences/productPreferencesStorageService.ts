import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { ProductPreferences } from '@/types/productPreferences';

const PREFERENCES_KEY = 'uflow.productPreferences';

/**
 * Domain-level contract for persisting product preferences. Same swappable
 * AsyncStorage-backed pattern as the other storage services. `get()`
 * returns null (not a default) when never saved, so callers can distinguish
 * "never set up" from "explicitly cleared to empty".
 */
export interface ProductPreferencesStorageService {
  get(): Promise<ProductPreferences | null>;
  save(preferences: ProductPreferences): Promise<void>;
}

export const productPreferencesStorageService: ProductPreferencesStorageService = {
  async get() {
    return asyncStorageClient.getJSON<ProductPreferences>(PREFERENCES_KEY);
  },

  async save(preferences) {
    await asyncStorageClient.setJSON(PREFERENCES_KEY, preferences);
  },
};

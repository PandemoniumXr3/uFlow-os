import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { DEFAULT_SAFE_MEALS_PROFILE, type SafeMealsProfile } from '@/types/safeMeals';

const SAFE_MEALS_KEY = 'uflow.safeMeals';

/**
 * Domain-level contract for persisting the safe-meals profile. Same
 * swappable AsyncStorage-backed pattern as the other storage services.
 */
export interface SafeMealsStorageService {
  get(): Promise<SafeMealsProfile>;
  save(profile: SafeMealsProfile): Promise<void>;
  /** Writes `profile` only if storage is currently empty. Returns the resulting profile. */
  seedIfEmpty(profile: SafeMealsProfile): Promise<SafeMealsProfile>;
}

export const safeMealsStorageService: SafeMealsStorageService = {
  async get() {
    const stored = await asyncStorageClient.getJSON<SafeMealsProfile>(SAFE_MEALS_KEY);
    return stored ?? DEFAULT_SAFE_MEALS_PROFILE;
  },

  async save(profile) {
    await asyncStorageClient.setJSON(SAFE_MEALS_KEY, profile);
  },

  async seedIfEmpty(profile) {
    const existing = await safeMealsStorageService.get();
    if (existing.recipeIds.length > 0) return existing;
    await asyncStorageClient.setJSON(SAFE_MEALS_KEY, profile);
    return profile;
  },
};

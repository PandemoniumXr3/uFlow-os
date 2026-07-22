import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { DEFAULT_DIET_PROFILE, type DietProfile } from '@/types/diet';

const DIET_KEY = 'uflow.diet';

/**
 * Domain-level contract for persisting the diet profile. Same swappable
 * AsyncStorage-backed pattern as the tolerance and product services.
 */
export interface DietStorageService {
  get(): Promise<DietProfile>;
  save(profile: DietProfile): Promise<void>;
  /** Writes `profile` only if storage has never been saved to. Returns the resulting profile. */
  seedIfEmpty(profile: DietProfile): Promise<DietProfile>;
}

export const dietStorageService: DietStorageService = {
  async get() {
    const stored = await asyncStorageClient.getJSON<DietProfile>(DIET_KEY);
    return stored ?? DEFAULT_DIET_PROFILE;
  },

  async save(profile) {
    await asyncStorageClient.setJSON(DIET_KEY, profile);
  },

  async seedIfEmpty(profile) {
    const stored = await asyncStorageClient.getJSON<DietProfile>(DIET_KEY);
    if (stored) return stored;
    await asyncStorageClient.setJSON(DIET_KEY, profile);
    return profile;
  },
};

import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import { DEFAULT_TOLERANCE_PROFILE, type ToleranceProfile } from '@/types/tolerance';

const TOLERANCE_KEY = 'uflow.tolerance';

/**
 * Domain-level contract for persisting the tolerance profile. Same swappable
 * AsyncStorage-backed pattern as the other storage services.
 */
export interface ToleranceStorageService {
  get(): Promise<ToleranceProfile>;
  save(profile: ToleranceProfile): Promise<void>;
}

export const toleranceStorageService: ToleranceStorageService = {
  async get() {
    const stored = await asyncStorageClient.getJSON<ToleranceProfile>(TOLERANCE_KEY);
    return stored ?? DEFAULT_TOLERANCE_PROFILE;
  },

  async save(profile) {
    await asyncStorageClient.setJSON(TOLERANCE_KEY, profile);
  },
};

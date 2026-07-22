import { getVersioned, setVersioned } from '@/services/storage/versionedStorage';
import type { UserProfile } from '@/types/profile';

const PROFILE_KEY = 'uflow.profile';
const SCHEMA_VERSION = 1;

export interface ProfileStorageService {
  get(): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<void>;
}

export const profileStorageService: ProfileStorageService = {
  async get() {
    return getVersioned<UserProfile | null>(PROFILE_KEY, SCHEMA_VERSION, null);
  },

  async save(profile) {
    await setVersioned(PROFILE_KEY, SCHEMA_VERSION, profile);
  },
};

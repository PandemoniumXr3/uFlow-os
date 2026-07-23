import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { DemoDataMetadata } from '@/types/demoData';

const DEMO_DATA_KEY = 'uflow.demoData';

export interface DemoDataStorageService {
  get(): Promise<DemoDataMetadata | null>;
  save(metadata: DemoDataMetadata): Promise<void>;
  clear(): Promise<void>;
}

export const demoDataStorageService: DemoDataStorageService = {
  async get() {
    return asyncStorageClient.getJSON<DemoDataMetadata>(DEMO_DATA_KEY);
  },
  async save(metadata) {
    await asyncStorageClient.setJSON(DEMO_DATA_KEY, metadata);
  },
  async clear() {
    await asyncStorageClient.remove(DEMO_DATA_KEY);
  },
};

import { asyncStorageClient } from '@/services/storage/asyncStorageClient';
import type { BackupStatus } from '@/types/backupStatus';

const BACKUP_STATUS_KEY = 'uflow.backupStatus';

export interface BackupStatusStorageService {
  get(): Promise<BackupStatus>;
  save(status: BackupStatus): Promise<void>;
}

export const backupStatusStorageService: BackupStatusStorageService = {
  async get() {
    return (await asyncStorageClient.getJSON<BackupStatus>(BACKUP_STATUS_KEY)) ?? {};
  },
  async save(status) {
    await asyncStorageClient.setJSON(BACKUP_STATUS_KEY, status);
  },
};

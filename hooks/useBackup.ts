import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { backupStatusStorageService } from '@/services/backup/backupStatusStorageService';
import { buildExport, buildExportFilename, excludeDemoDataFromExport, gatherExportData } from '@/services/backup/buildExport';
import { deliverExportFile, type ExportDeliveryResult } from '@/services/backup/exportFile';
import type { ImportDomainCounts } from '@/types/backup';
import type { BackupStatus } from '@/types/backupStatus';

export interface ExportPreviewCounts extends ImportDomainCounts {
  profileIncluded: boolean;
  demoDataIncluded: boolean;
}

export function useBackup() {
  const [status, setStatus] = useState<BackupStatus>({});
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(() => {
    return backupStatusStorageService.get().then((stored) => {
      setStatus(stored);
      setIsLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  /** Gathers current data for the "before you export" preview — counts + whether demo data is present — without writing anything. */
  const getExportPreview = useCallback(async (): Promise<ExportPreviewCounts> => {
    const data = await gatherExportData();
    return {
      products: data.products.length,
      recipes: data.recipes.length,
      inventory: data.inventory.length,
      manualGroceryItems: data.manualGroceryItems.length,
      mealPlan: data.mealPlan.length,
      mealHistory: data.mealHistory.length,
      dismissals: data.dismissals.length,
      profileIncluded: data.profile != null,
      demoDataIncluded: data.demoMetadata != null,
    };
  }, []);

  const exportData = useCallback(async (excludeDemoData: boolean): Promise<ExportDeliveryResult> => {
    const now = Date.now();
    const gathered = await gatherExportData();
    const data = excludeDemoData ? excludeDemoDataFromExport(gathered) : gathered;
    const exportPayload = buildExport(data, now, Constants.expoConfig?.version, Platform.OS);
    const json = JSON.stringify(exportPayload, null, 2);
    const filename = buildExportFilename(now);
    const result = await deliverExportFile(json, filename);
    if (result.success) {
      const nextStatus: BackupStatus = { ...status, lastExportAt: new Date(now).toISOString() };
      await backupStatusStorageService.save(nextStatus);
      setStatus(nextStatus);
    }
    return result;
  }, [status]);

  const recordImport = useCallback(
    async (schemaVersion: number, warningsCount: number) => {
      const nextStatus: BackupStatus = { ...status, lastImportAt: new Date().toISOString(), lastImportSchemaVersion: schemaVersion, lastImportWarningsCount: warningsCount };
      await backupStatusStorageService.save(nextStatus);
      setStatus(nextStatus);
    },
    [status]
  );

  return { status, isLoading, getExportPreview, exportData, recordImport, refetch };
}

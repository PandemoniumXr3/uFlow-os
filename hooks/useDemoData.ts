import { useCallback, useEffect, useState } from 'react';

import { demoDataStorageService } from '@/services/onboarding/demoDataStorageService';
import { installDemoData, removeDemoData } from '@/services/onboarding/demoDataService';
import type { DemoDataMetadata } from '@/types/demoData';

export function useDemoData() {
  const [metadata, setMetadata] = useState<DemoDataMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    return demoDataStorageService.get().then((stored) => {
      setMetadata(stored);
      setIsLoading(false);
      return stored;
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const install = useCallback(async () => {
    const result = await installDemoData();
    setMetadata(result);
    return result;
  }, []);

  const remove = useCallback(async () => {
    await removeDemoData();
    setMetadata(null);
  }, []);

  return {
    metadata,
    isInstalled: metadata != null,
    isLoading,
    install,
    remove,
    refresh,
  };
}

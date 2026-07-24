import { asyncStorageClient } from '@/services/storage/asyncStorageClient';

/** Every AsyncStorage key an import can touch — snapshotting exactly this set (no more, no less) is what makes rollback safe. */
export const BACKUP_MANAGED_KEYS = [
  'uflow.profile',
  'uflow.products',
  'uflow.recipes',
  'uflow.inventory',
  'uflow.shopping.manualItems',
  'uflow.shopping.automaticOverlay',
  'uflow.mealPlan',
  'uflow.mealLog',
  'uflow.dismissals',
  'uflow.safeMeals',
  'uflow.diet',
  'uflow.tolerance',
  'uflow.productPreferences',
  'uflow.demoData',
] as const;

export type StorageSnapshot = Record<string, string | null>;

interface RawStorageClient {
  getRaw(key: string): Promise<string | null>;
  setRaw(key: string, value: string | null): Promise<void>;
}

/**
 * Reads the exact current raw value of every backup-managed key —
 * including `null` for a key never written — before any import write
 * happens. `client` defaults to the real `asyncStorageClient`; tests inject
 * an in-memory fake instead, since `@react-native-async-storage`'s real
 * implementation needs a `window` that doesn't exist in vitest's plain
 * node test environment (no RN/DOM shim configured here).
 */
export async function createStorageSnapshot(client: RawStorageClient = asyncStorageClient): Promise<StorageSnapshot> {
  const entries = await Promise.all(BACKUP_MANAGED_KEYS.map(async (key) => [key, await client.getRaw(key)] as const));
  return Object.fromEntries(entries);
}

/** Writes every snapshotted key back to its exact prior value — a key that was `null` (never written) is removed, not written as the string "null". */
export async function restoreStorageSnapshot(snapshot: StorageSnapshot, client: RawStorageClient = asyncStorageClient): Promise<void> {
  await Promise.all(BACKUP_MANAGED_KEYS.map((key) => client.setRaw(key, snapshot[key] ?? null)));
}

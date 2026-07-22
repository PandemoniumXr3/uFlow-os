import { asyncStorageClient } from '@/services/storage/asyncStorageClient';

interface Envelope<T> {
  schemaVersion: number;
  data: T;
}

/**
 * Wraps a stored value with a schema version so future shape changes can
 * migrate instead of silently resetting. Only `profileStorageService` uses
 * this so far — other stores adopt it opportunistically when they next need
 * a real schema change, not as a single big-bang migration.
 */
export async function getVersioned<T>(key: string, currentVersion: number, fallback: T): Promise<T> {
  const envelope = await asyncStorageClient.getJSON<Envelope<T>>(key);
  if (!envelope) return fallback;
  if (envelope.schemaVersion !== currentVersion) {
    // No migrations registered yet — this is still schema v1 everywhere.
    return fallback;
  }
  return envelope.data;
}

export async function setVersioned<T>(key: string, currentVersion: number, data: T): Promise<void> {
  await asyncStorageClient.setJSON<Envelope<T>>(key, { schemaVersion: currentVersion, data });
}

export async function hasVersioned(key: string): Promise<boolean> {
  const envelope = await asyncStorageClient.getJSON<Envelope<unknown>>(key);
  return envelope != null;
}

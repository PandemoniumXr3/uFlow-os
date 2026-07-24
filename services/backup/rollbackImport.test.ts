import { describe, expect, it } from 'vitest';

import { BACKUP_MANAGED_KEYS, createStorageSnapshot, restoreStorageSnapshot } from '@/services/backup/rollbackImport';

/** In-memory fake — the real asyncStorageClient can't run under vitest's plain node environment (no `window`, see asyncStorageClient's real AsyncStorage dependency). */
function fakeClient(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async getRaw(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setRaw(key: string, value: string | null) {
      if (value === null) store.delete(key);
      else store.set(key, value);
    },
    store,
  };
}

describe('rollback snapshot/restore', () => {
  it('restores every managed key to its exact prior value, including keys that were never written', async () => {
    const client = fakeClient({ 'uflow.products': JSON.stringify([{ id: 'p1', name: 'Milk' }]), 'uflow.recipes': JSON.stringify([{ id: 'r1', name: 'Oatmeal' }]) });
    // uflow.inventory intentionally left unset (never written) to prove null round-trips correctly.

    const snapshot = await createStorageSnapshot(client);

    await client.setRaw('uflow.products', JSON.stringify([{ id: 'p2', name: 'Overwritten' }]));
    await client.setRaw('uflow.recipes', null);
    await client.setRaw('uflow.inventory', JSON.stringify([{ id: 'i1' }]));

    await restoreStorageSnapshot(snapshot, client);

    expect(JSON.parse((await client.getRaw('uflow.products'))!)).toEqual([{ id: 'p1', name: 'Milk' }]);
    expect(JSON.parse((await client.getRaw('uflow.recipes'))!)).toEqual([{ id: 'r1', name: 'Oatmeal' }]);
    expect(await client.getRaw('uflow.inventory')).toBeNull();
  });

  it('snapshots every backup-managed key, not a subset', async () => {
    const client = fakeClient();
    const snapshot = await createStorageSnapshot(client);
    expect(Object.keys(snapshot).sort()).toEqual([...BACKUP_MANAGED_KEYS].sort());
  });

  it('restore never touches a key outside the managed set', async () => {
    const client = fakeClient({ 'some.other.key': 'untouched' });
    const snapshot = await createStorageSnapshot(client);
    await restoreStorageSnapshot(snapshot, client);
    expect(await client.getRaw('some.other.key')).toBe('untouched');
  });
});

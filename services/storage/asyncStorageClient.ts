import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin JSON wrapper around AsyncStorage. Nothing above this layer should
 * import AsyncStorage directly, so the backing store can be swapped later
 * (e.g. for SQLite) without touching domain storage services.
 */
export const asyncStorageClient = {
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // A key can end up holding an unparseable value from an earlier bug (e.g. the literal string
      // "undefined" — see setJSON below). Treat anything that fails to parse the same as "nothing
      // stored" rather than throwing and crashing whatever screen reads it; this also self-heals any
      // storage a past version of the app already corrupted this way.
      return null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    if (value === undefined) {
      // JSON.stringify(undefined) returns the actual value `undefined`, not a string. Passing that to
      // AsyncStorage.setItem is a type violation that, on web (backed by localStorage, whose setItem
      // coerces its argument via ToString()), silently persists the literal string "undefined" —
      // which then fails to JSON.parse on every future read. Treat "nothing to store" as "no key".
      await AsyncStorage.removeItem(key);
      return;
    }
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  /** Wipes every key uFlow has ever written — used only by the explicit, confirmed "Clear all data" action in Settings. */
  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  },

  /** Byte-exact read/write, bypassing JSON parse/stringify — used only by import rollback snapshotting, which must restore a key to its exact prior state (including "never written", i.e. null) without any re-serialization risk. */
  async getRaw(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async setRaw(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
};

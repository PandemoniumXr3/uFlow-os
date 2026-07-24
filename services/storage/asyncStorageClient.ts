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
    return JSON.parse(raw) as T;
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
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

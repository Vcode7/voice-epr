import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory fallback store for environments where AsyncStorage might fail or for quick sync
const memoryStore = new Map<string, string>();

export const storageWrapper = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
      return memoryStore.get(key) ?? null;
    } catch (e) {
      console.warn(`[StorageWrapper] Error reading key ${key}:`, e);
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore.set(key, value);
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[StorageWrapper] Error writing key ${key}:`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      memoryStore.delete(key);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[StorageWrapper] Error removing key ${key}:`, e);
    }
  },

  async clear(): Promise<void> {
    try {
      memoryStore.clear();
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[StorageWrapper] Error clearing storage:', e);
    }
  },
};

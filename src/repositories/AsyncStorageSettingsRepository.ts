import { ISettingsRepository } from './ISettingsRepository';
import { UserSettings } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<UserSettings> {
    try {
      const remote = await ApiClient.getSettings();
      if (remote) {
        await storageWrapper.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remote));
        return { ...DEFAULT_SETTINGS, ...remote };
      }
    } catch (e) {
      console.warn('⚠️ API getSettings failed, using local cache:', e);
    }
    const json = await storageWrapper.getItem(STORAGE_KEYS.SETTINGS);
    if (!json) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const remote = await ApiClient.updateSettings(updates);
      await storageWrapper.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remote));
      return remote;
    } catch (e) {
      console.warn('⚠️ API updateSettings failed, saving locally:', e);
      const current = await this.getSettings();
      const updated = { ...current, ...updates };
      await storageWrapper.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    }
  }

  async resetSettings(): Promise<UserSettings> {
    await storageWrapper.removeItem(STORAGE_KEYS.SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

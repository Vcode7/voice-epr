import { UserSettings } from '../types';

export interface ISettingsRepository {
  getSettings(): Promise<UserSettings>;
  updateSettings(updates: Partial<UserSettings>): Promise<UserSettings>;
  resetSettings(): Promise<UserSettings>;
}

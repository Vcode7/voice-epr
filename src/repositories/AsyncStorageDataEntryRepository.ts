import { IDataEntryRepository } from './IDataEntryRepository';
import { DataEntryRecord } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageDataEntryRepository implements IDataEntryRepository {
  private async loadLocal(): Promise<DataEntryRecord[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.DATA_ENTRIES);
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  private async saveLocal(entries: DataEntryRecord[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.DATA_ENTRIES, JSON.stringify(entries));
  }

  async createDataEntry(data: Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataEntryRecord> {
    try {
      const created = await ApiClient.createDataEntry(data);
      const list = await this.loadLocal();
      list.unshift(created);
      await this.saveLocal(list);
      return created;
    } catch (e) {
      console.warn('⚠️ API createDataEntry failed, saving locally:', e);
      const entries = await this.loadLocal();
      const now = new Date().toISOString();
      const newEntry: DataEntryRecord = {
        ...data,
        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      entries.unshift(newEntry);
      await this.saveLocal(entries);
      return newEntry;
    }
  }

  async getDataEntries(): Promise<DataEntryRecord[]> {
    try {
      const remote = await ApiClient.getDataEntries();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        return remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('⚠️ API getDataEntries failed, using local cache:', e);
    }
    const list = await this.loadLocal();
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDataEntryById(id: string): Promise<DataEntryRecord | null> {
    const list = await this.getDataEntries();
    return list.find((e) => e.id === id) || null;
  }

  async updateDataEntry(id: string, updates: Partial<DataEntryRecord>): Promise<DataEntryRecord | null> {
    try {
      const updated = await ApiClient.updateDataEntry(id, updates);
      const list = await this.loadLocal();
      const index = list.findIndex((e) => e.id === id);
      if (index !== -1) {
        list[index] = updated;
        await this.saveLocal(list);
      }
      return updated;
    } catch (e) {
      console.warn('⚠️ API updateDataEntry failed, updating locally:', e);
      const list = await this.loadLocal();
      const index = list.findIndex((e) => e.id === id);
      if (index === -1) return null;

      const updated: DataEntryRecord = {
        ...list[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      list[index] = updated;
      await this.saveLocal(list);
      return updated;
    }
  }

  async deleteDataEntry(id: string): Promise<boolean> {
    try {
      await ApiClient.deleteDataEntry(id);
    } catch (e) {
      console.warn('⚠️ API deleteDataEntry failed:', e);
    }
    const list = await this.loadLocal();
    const filtered = list.filter((e) => e.id !== id);
    await this.saveLocal(filtered);
    return true;
  }

  async getDataEntriesByTemplate(templateId: string): Promise<DataEntryRecord[]> {
    const list = await this.getDataEntries();
    return list.filter((e) => e.templateId === templateId);
  }

  async clearAllDataEntries(): Promise<void> {
    await storageWrapper.removeItem(STORAGE_KEYS.DATA_ENTRIES);
  }

  async saveMultipleDataEntries(entries: DataEntryRecord[]): Promise<void> {
    try {
      await ApiClient.saveMultipleDataEntries(entries);
    } catch (e) {
      console.warn('⚠️ API saveMultipleDataEntries failed:', e);
    }
    const list = await this.loadLocal();
    const combined = [...entries, ...list];
    const uniqueMap = new Map<string, DataEntryRecord>();
    combined.forEach((e) => uniqueMap.set(e.id, e));
    await this.saveLocal(Array.from(uniqueMap.values()));
  }
}

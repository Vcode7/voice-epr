import { IReceiptRepository } from './IReceiptRepository';
import { Receipt } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageReceiptRepository implements IReceiptRepository {
  private async loadLocal(): Promise<Receipt[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.RECEIPTS);
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  private async saveLocal(receipts: Receipt[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  }

  async getNextReceiptNumber(): Promise<string> {
    try {
      return await ApiClient.getNextReceiptNumber();
    } catch {
      const countStr = await storageWrapper.getItem(STORAGE_KEYS.RECEIPT_COUNTER);
      const count = countStr ? parseInt(countStr, 10) + 1 : 1;
      await storageWrapper.setItem(STORAGE_KEYS.RECEIPT_COUNTER, count.toString());
      return `INV-${count.toString().padStart(6, '0')}`;
    }
  }

  async createReceipt(data: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    try {
      const created = await ApiClient.createReceipt(data);
      const list = await this.loadLocal();
      list.unshift(created);
      await this.saveLocal(list);
      return created;
    } catch (e) {
      console.warn('⚠️ API createReceipt failed, saving locally:', e);
      const receipts = await this.loadLocal();
      const newReceipt: Receipt = {
        ...data,
        id: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      receipts.unshift(newReceipt);
      await this.saveLocal(receipts);
      return newReceipt;
    }
  }

  async getReceipts(): Promise<Receipt[]> {
    try {
      const remote = await ApiClient.getReceipts();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        return remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('⚠️ API getReceipts failed, using local cache:', e);
    }
    const list = await this.loadLocal();
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getReceipt(id: string): Promise<Receipt | null> {
    const list = await this.getReceipts();
    return list.find((r) => r.id === id) || null;
  }

  async updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt | null> {
    try {
      const updated = await ApiClient.updateReceipt(id, updates);
      const list = await this.loadLocal();
      const index = list.findIndex((r) => r.id === id);
      if (index !== -1) {
        list[index] = updated;
        await this.saveLocal(list);
      }
      return updated;
    } catch (e) {
      console.warn('⚠️ API updateReceipt failed, updating locally:', e);
      const list = await this.loadLocal();
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return null;
      const updated = { ...list[index], ...updates };
      list[index] = updated;
      await this.saveLocal(list);
      return updated;
    }
  }

  async deleteReceipt(id: string): Promise<boolean> {
    try {
      await ApiClient.deleteReceipt(id);
    } catch (e) {
      console.warn('⚠️ API deleteReceipt failed:', e);
    }
    const list = await this.loadLocal();
    const filtered = list.filter((r) => r.id !== id);
    await this.saveLocal(filtered);
    return true;
  }

  async clearAllReceipts(): Promise<void> {
    try {
      await ApiClient.clearAllData();
    } catch {}
    await storageWrapper.removeItem(STORAGE_KEYS.RECEIPTS);
    await storageWrapper.removeItem(STORAGE_KEYS.RECEIPT_COUNTER);
  }

  async saveMultipleReceipts(receipts: Receipt[]): Promise<void> {
    try {
      await ApiClient.saveMultipleReceipts(receipts);
    } catch (e) {
      console.warn('⚠️ API saveMultipleReceipts failed:', e);
    }
    const list = await this.loadLocal();
    const combined = [...receipts, ...list];
    const uniqueMap = new Map<string, Receipt>();
    combined.forEach((r) => uniqueMap.set(r.id, r));
    await this.saveLocal(Array.from(uniqueMap.values()));
  }
}

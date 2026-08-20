import { ITransactionRepository } from './ITransactionRepository';
import { Transaction, TransactionType } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageTransactionRepository implements ITransactionRepository {
  private async loadLocal(): Promise<Transaction[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  private async saveLocal(transactions: Transaction[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    try {
      const created = await ApiClient.createTransaction(data);
      const list = await this.loadLocal();
      list.unshift(created);
      await this.saveLocal(list);
      return created;
    } catch (e) {
      console.warn('⚠️ API createTransaction failed, saving locally:', e);
      const transactions = await this.loadLocal();
      const newTx: Transaction = {
        ...data,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      transactions.unshift(newTx);
      await this.saveLocal(transactions);
      return newTx;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    try {
      const remote = await ApiClient.getTransactions();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        return remote.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    } catch (e) {
      console.warn('⚠️ API getTransactions failed, using local cache:', e);
    }
    const list = await this.loadLocal();
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const list = await this.getTransactions();
    return list.find((t) => t.id === id) || null;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const updated = await ApiClient.updateTransaction(id, updates);
      const list = await this.loadLocal();
      const index = list.findIndex((t) => t.id === id);
      if (index !== -1) {
        list[index] = updated;
        await this.saveLocal(list);
      }
      return updated;
    } catch (e) {
      console.warn('⚠️ API updateTransaction failed, updating locally:', e);
      const list = await this.loadLocal();
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return null;
      const updated = { ...list[index], ...updates };
      list[index] = updated;
      await this.saveLocal(list);
      return updated;
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await ApiClient.deleteTransaction(id);
    } catch (e) {
      console.warn('⚠️ API deleteTransaction failed:', e);
    }
    const list = await this.loadLocal();
    const filtered = list.filter((t) => t.id !== id);
    await this.saveLocal(filtered);
    return true;
  }

  async getTransactionsByDate(startDate: string, endDate: string): Promise<Transaction[]> {
    const list = await this.getTransactions();
    return list.filter((t) => t.date >= startDate && t.date <= endDate);
  }

  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    const list = await this.getTransactions();
    return list.filter((t) => t.category?.toLowerCase() === category.toLowerCase());
  }

  async getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
    const list = await this.getTransactions();
    return list.filter((t) => t.transactionType === type);
  }

  async clearAllTransactions(): Promise<void> {
    try {
      await ApiClient.clearAllData();
    } catch {}
    await storageWrapper.removeItem(STORAGE_KEYS.TRANSACTIONS);
  }

  async saveMultipleTransactions(transactions: Transaction[]): Promise<void> {
    try {
      await ApiClient.saveMultipleTransactions(transactions);
    } catch (e) {
      console.warn('⚠️ API saveMultipleTransactions failed:', e);
    }
    const list = await this.loadLocal();
    const combined = [...transactions, ...list];
    const uniqueMap = new Map<string, Transaction>();
    combined.forEach((t) => uniqueMap.set(t.id, t));
    await this.saveLocal(Array.from(uniqueMap.values()));
  }
}

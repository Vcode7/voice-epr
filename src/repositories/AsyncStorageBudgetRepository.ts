import { IBudgetRepository } from './IBudgetRepository';
import { Budget } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageBudgetRepository implements IBudgetRepository {
  private async loadLocal(): Promise<Budget[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.BUDGETS);
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  private async saveLocal(budgets: Budget[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }

  async getBudgets(): Promise<Budget[]> {
    try {
      const remote = await ApiClient.getBudgets();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        return remote;
      }
    } catch (e) {
      console.warn('⚠️ API getBudgets failed, using local cache:', e);
    }
    return this.loadLocal();
  }

  async setBudget(category: string, amount: number, period: 'monthly' | 'weekly' | 'yearly' = 'monthly'): Promise<Budget> {
    try {
      const remote = await ApiClient.setBudget(category, amount, period);
      const budgets = await this.loadLocal();
      const idx = budgets.findIndex((b) => b.category.toLowerCase() === category.toLowerCase());
      if (idx !== -1) budgets[idx] = remote;
      else budgets.push(remote);
      await this.saveLocal(budgets);
      return remote;
    } catch (e) {
      console.warn('⚠️ API setBudget failed, saving locally:', e);
      const budgets = await this.loadLocal();
      const existingIndex = budgets.findIndex(
        (b) => b.category.toLowerCase() === category.toLowerCase()
      );

      if (existingIndex !== -1) {
        budgets[existingIndex].amount = amount;
        budgets[existingIndex].period = period;
        await this.saveLocal(budgets);
        return budgets[existingIndex];
      }

      const newBudget: Budget = {
        id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        category,
        amount,
        period,
        createdAt: new Date().toISOString(),
      };
      budgets.push(newBudget);
      await this.saveLocal(budgets);
      return newBudget;
    }
  }

  async deleteBudget(id: string): Promise<boolean> {
    try {
      await ApiClient.deleteBudget(id);
    } catch (e) {
      console.warn('⚠️ API deleteBudget failed:', e);
    }
    const budgets = await this.loadLocal();
    const filtered = budgets.filter((b) => b.id !== id);
    await this.saveLocal(filtered);
    return true;
  }

  async clearAllBudgets(): Promise<void> {
    await storageWrapper.removeItem(STORAGE_KEYS.BUDGETS);
  }

  async saveMultipleBudgets(budgets: Budget[]): Promise<void> {
    const list = await this.loadLocal();
    const combined = [...budgets, ...list];
    const map = new Map<string, Budget>();
    combined.forEach((b) => map.set(b.id, b));
    await this.saveLocal(Array.from(map.values()));
  }
}

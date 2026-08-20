import { IDebtRepository } from './IDebtRepository';
import { Debt } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageDebtRepository implements IDebtRepository {
  private async loadLocal(): Promise<Debt[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.DEBTS);
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  private async saveLocal(debts: Debt[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }

  async getDebts(): Promise<Debt[]> {
    try {
      const remote = await ApiClient.getDebts();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        return remote.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    } catch (e) {
      console.warn('⚠️ API getDebts failed, using local cache:', e);
    }
    const list = await this.loadLocal();
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async recordDebt(personName: string, amount: number, type: 'given' | 'borrowed', notes?: string): Promise<Debt> {
    try {
      const remote = await ApiClient.recordDebt(personName, amount, type, notes);
      const debts = await this.loadLocal();
      debts.unshift(remote);
      await this.saveLocal(debts);
      return remote;
    } catch (e) {
      console.warn('⚠️ API recordDebt failed, saving locally:', e);
      const debts = await this.loadLocal();
      const today = new Date().toISOString().split('T')[0];

      const existing = debts.find(
        (d) => d.personName.toLowerCase() === personName.toLowerCase() && d.type === type && !d.settled
      );

      if (existing) {
        existing.amount += amount;
        existing.updatedAt = new Date().toISOString();
        if (notes) existing.notes = (existing.notes ? existing.notes + '; ' : '') + notes;
        await this.saveLocal(debts);
        return existing;
      }

      const newDebt: Debt = {
        id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        personName,
        amount,
        type,
        settled: false,
        notes,
        date: today,
        updatedAt: new Date().toISOString(),
      };
      debts.unshift(newDebt);
      await this.saveLocal(debts);
      return newDebt;
    }
  }

  async recordRepayment(personName: string, amount: number): Promise<Debt | null> {
    try {
      const remote = await ApiClient.recordRepayment(personName, amount);
      if (remote) {
        const debts = await this.loadLocal();
        const idx = debts.findIndex((d) => d.id === remote.id);
        if (idx !== -1) debts[idx] = remote;
        await this.saveLocal(debts);
      }
      return remote;
    } catch (e) {
      console.warn('⚠️ API recordRepayment failed, processing locally:', e);
      const debts = await this.loadLocal();
      const active = debts.find(
        (d) => d.personName.toLowerCase() === personName.toLowerCase() && !d.settled
      );

      if (!active) return null;

      active.amount -= amount;
      active.updatedAt = new Date().toISOString();
      if (active.amount <= 0) {
        active.amount = 0;
        active.settled = true;
      }
      await this.saveLocal(debts);
      return active;
    }
  }

  async toggleSettled(id: string): Promise<Debt | null> {
    try {
      const remote = await ApiClient.toggleDebtSettled(id);
      const debts = await this.loadLocal();
      const idx = debts.findIndex((d) => d.id === id);
      if (idx !== -1) {
        debts[idx] = remote;
        await this.saveLocal(debts);
      }
      return remote;
    } catch (e) {
      console.warn('⚠️ API toggleSettled failed, updating locally:', e);
      const debts = await this.loadLocal();
      const d = debts.find((item) => item.id === id);
      if (!d) return null;
      d.settled = !d.settled;
      d.updatedAt = new Date().toISOString();
      await this.saveLocal(debts);
      return d;
    }
  }

  async deleteDebt(id: string): Promise<boolean> {
    try {
      await ApiClient.deleteDebt(id);
    } catch (e) {
      console.warn('⚠️ API deleteDebt failed:', e);
    }
    const debts = await this.loadLocal();
    const filtered = debts.filter((d) => d.id !== id);
    await this.saveLocal(filtered);
    return true;
  }

  async clearAllDebts(): Promise<void> {
    await storageWrapper.removeItem(STORAGE_KEYS.DEBTS);
  }

  async saveMultipleDebts(debts: Debt[]): Promise<void> {
    const list = await this.loadLocal();
    const combined = [...debts, ...list];
    const map = new Map<string, Debt>();
    combined.forEach((d) => map.set(d.id, d));
    await this.saveLocal(Array.from(map.values()));
  }
}

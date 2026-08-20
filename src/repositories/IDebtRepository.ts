import { Debt } from '../types';

export interface IDebtRepository {
  getDebts(): Promise<Debt[]>;
  recordDebt(personName: string, amount: number, type: 'given' | 'borrowed', notes?: string): Promise<Debt>;
  recordRepayment(personName: string, amount: number): Promise<Debt | null>;
  toggleSettled(id: string): Promise<Debt | null>;
  deleteDebt(id: string): Promise<boolean>;
  clearAllDebts(): Promise<void>;
  saveMultipleDebts(debts: Debt[]): Promise<void>;
}

import { Budget } from '../types';

export interface IBudgetRepository {
  getBudgets(): Promise<Budget[]>;
  setBudget(category: string, amount: number, period?: 'monthly' | 'weekly' | 'yearly'): Promise<Budget>;
  deleteBudget(id: string): Promise<boolean>;
  clearAllBudgets(): Promise<void>;
  saveMultipleBudgets(budgets: Budget[]): Promise<void>;
}

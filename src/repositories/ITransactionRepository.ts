import { Transaction, TransactionType } from '../types';

export interface ITransactionRepository {
  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | null>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<boolean>;
  getTransactionsByDate(startDate: string, endDate: string): Promise<Transaction[]>;
  getTransactionsByCategory(category: string): Promise<Transaction[]>;
  getTransactionsByType(type: TransactionType): Promise<Transaction[]>;
  clearAllTransactions(): Promise<void>;
  saveMultipleTransactions(transactions: Transaction[]): Promise<void>;
}
